"""A cooperative multi-agent wireless resource-allocation environment.

WHAT THIS IS
------------
Each **base station is one agent**.  Every timestep, every station simultaneously
picks a channel and a transmit power.  Users are permanently associated with
one station (there is no handover in this model), and a user's achievable rate
depends on its own station's choice *and* on what every other station chose,
through co-channel interference.  All agents receive the **same team reward**,
so this is a fully cooperative Dec-POMDP-shaped task with a shared objective
and local, partial observations.

The physics is deliberately thin -- see :mod:`wireless_env.physics`, which
labels the propagation model as *a simplified educational wireless model* and
explains the normalized units.  Nothing here is a calibrated telecom simulator,
and no number this environment produces is a measured or published research
result.

API COMPATIBILITY (an explicit design choice)
---------------------------------------------
This class is **API-compatible in shape** with a PettingZoo
``ParallelEnv``, but it does *not* import or subclass PettingZoo, and
PettingZoo is not a dependency.  The reason is pedagogical portability: the
package must run in a bare Colab kernel, in a classroom with a slow network,
and inside Pyodide in the browser, so the hard dependency list is *numpy plus
the standard library*.  What "compatible in shape" means concretely:

* ``reset(seed=None, options=None) -> (observations, infos)``
* ``step(actions) -> (observations, rewards, terminations, truncations, infos)``
  where every returned value is a dict keyed by agent name
* ``agents`` / ``possible_agents`` lists of agent names
* ``observation_space(agent)`` / ``action_space(agent)`` accessors returning
  :class:`Box` and :class:`Discrete` stand-ins that mimic the small part of the
  Gymnasium space interface this package needs (``shape``, ``dtype``, ``low``,
  ``high``, ``n``, ``sample``, ``contains``)

If you later want the real thing, wrapping this class in a
``pettingzoo.utils.env.ParallelEnv`` subclass is a mechanical exercise -- and it
is a good student exercise.

PARTIAL OBSERVABILITY IS THE POINT
----------------------------------
:meth:`CooperativeWirelessEnv.observe` returns strictly **local** information:
a station's own users' demands, its own channel gains, the interference its own
users reported, its own previous action, and any messages its neighbours chose
to send.  A station cannot see other stations' channels, powers, users or
demands unless a message tells it.  The full picture is reachable **only**
through :meth:`CooperativeWirelessEnv.global_state`, which exists for two
legitimate purposes: centralized training (a centralized critic in CTDE) and
the lab's global view.  Calling ``global_state()`` inside a policy that is
supposed to be decentralized is cheating, and the docstring says so there too.

DETERMINISM CONTRACT
--------------------
* ``reset(seed=s)`` fully determines the episode: topology, user positions,
  demand trajectory, mobility and message dropout all derive from ``s``.  Two
  environments given the same config and the same reset seed produce
  bit-identical trajectories under the same actions.
* ``reset()`` with no seed follows Gymnasium/PettingZoo convention and does
  *not* reseed: it continues the existing random stream, giving a fresh
  episode.  Whether the topology is redrawn on such a reset is controlled by
  ``WirelessConfig.regenerate_topology_on_reset`` (default ``False``, i.e. a
  fixed "familiar deployment").
* Two freshly constructed environments with the same ``config.seed`` are
  identical from construction, so ``reset()`` on each also matches.
* Any explicitly supplied ``station_positions``, ``users_per_station``,
  ``user_positions`` or ``initial_demands`` overrides the random draw.  Supply
  all four, switch mobility off and set ``demand_volatility=0`` and the
  environment becomes entirely deterministic with no RNG involvement at all --
  which is exactly how the JSON fixture rollout is generated so the TypeScript
  port can reproduce it without reimplementing numpy's bit generator.
"""

from __future__ import annotations

import dataclasses
import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field, replace
from typing import Any, Literal, Optional

import numpy as np

from . import metrics as metrics_module
from . import physics

__all__ = [
    "POWER_LABELS",
    "N_POWER_LEVELS",
    "MAX_MESSAGE_BITS",
    "MESSAGE_BIT_NAMES",
    "Discrete",
    "Box",
    "RewardWeights",
    "WirelessConfig",
    "ObservationLayout",
    "encode_action",
    "decode_action",
    "observation_layout",
    "unpack_observation",
    "compute_team_reward",
    "CooperativeWirelessEnv",
]

# --------------------------------------------------------------------------- #
# Constants
# --------------------------------------------------------------------------- #

#: Human labels for the three transmit-power levels, in index order.
POWER_LABELS: tuple[str, str, str] = ("low", "medium", "high")

#: Number of power levels in the default action space.
N_POWER_LEVELS: int = 3

#: Width of the widest message this environment can send.  The observation
#: always reserves this many bit slots per neighbour, whatever
#: ``bits_per_message`` is set to, so that the observation dimension does not
#: change when you turn communication bandwidth up and down.  That keeps a
#: single trained policy comparable across the whole communication sweep.
MAX_MESSAGE_BITS: int = 4

#: Semantics of each message bit, in transmission order.  This is a
#: **hand-designed, rule-based protocol**, not a learned communication scheme.
#: Anything the lab or a notebook says about these bits must say "rule-based".
MESSAGE_BIT_NAMES: tuple[str, ...] = (
    "high_interference_alert",   # bit 0: my users report interference above threshold
    "high_demand_alert",         # bit 1: my users' mean demand is above the config mean
    "channel_bit_high",          # bit 2: most significant bit of my current channel index
    "channel_bit_low",           # bit 3: least significant bit of my current channel index
)


# --------------------------------------------------------------------------- #
# Minimal space objects (Gymnasium-shaped, zero dependencies)
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class Discrete:
    """A finite set of integer actions ``{0, 1, ..., n-1}``.

    A dependency-free stand-in for ``gymnasium.spaces.Discrete`` exposing only
    what this package uses.  ``n = 9`` for the default configuration: three
    channels times three power levels.
    """

    n: int

    def __post_init__(self) -> None:
        if self.n <= 0:
            raise ValueError(f"Discrete(n) needs n >= 1, got {self.n}.")

    @property
    def shape(self) -> tuple[int, ...]:
        """Discrete actions are scalars, so the shape is empty."""
        return ()

    def sample(self, rng: Optional[np.random.Generator] = None) -> int:
        """Draw a uniformly random valid action."""
        generator = rng if rng is not None else np.random.default_rng()
        return int(generator.integers(self.n))

    def contains(self, value: Any) -> bool:
        """Return ``True`` if ``value`` is a valid action index."""
        try:
            as_int = int(value)
        except (TypeError, ValueError):
            return False
        if as_int != value:
            return False
        return 0 <= as_int < self.n

    def __contains__(self, value: Any) -> bool:
        return self.contains(value)


@dataclass(frozen=True)
class Box:
    """A box-bounded real vector space.

    A dependency-free stand-in for ``gymnasium.spaces.Box``.  ``low`` and
    ``high`` are per-element arrays; some observation entries (interference
    measured in noise-floor units) are genuinely unbounded above, and their
    ``high`` is ``+inf``.
    """

    low: np.ndarray
    high: np.ndarray
    dtype: np.dtype = field(default_factory=lambda: np.dtype(np.float32))

    def __post_init__(self) -> None:
        if self.low.shape != self.high.shape:
            raise ValueError(
                f"Box low has shape {self.low.shape} but high has shape "
                f"{self.high.shape}; they must match element for element."
            )

    @property
    def shape(self) -> tuple[int, ...]:
        return tuple(self.low.shape)

    def sample(self, rng: Optional[np.random.Generator] = None) -> np.ndarray:
        """Draw a uniform sample, treating unbounded entries as bounded by 1."""
        generator = rng if rng is not None else np.random.default_rng()
        high = np.where(np.isfinite(self.high), self.high, self.low + 1.0)
        return generator.uniform(self.low, high).astype(self.dtype)

    def contains(self, value: Any) -> bool:
        """Return ``True`` if ``value`` has the right shape and is in bounds."""
        array = np.asarray(value, dtype=float)
        if array.shape != self.shape:
            return False
        return bool(np.all(array >= self.low - 1e-6) and np.all(array <= self.high + 1e-6))

    def __contains__(self, value: Any) -> bool:
        return self.contains(value)


# --------------------------------------------------------------------------- #
# Reward weights
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class RewardWeights:
    """Weights of the composable team reward.

    The final student project asks learners to *redesign the reward*, so the
    reward is a weighted sum of four named, separately-reported terms rather
    than a single hard-coded expression.  Change these weights and you change
    what "good coordination" means:

    ==================  =====  ==================================================
    weight              def.   what raising it asks the team to do
    ==================  =====  ==================================================
    ``throughput``      1.0    deliver more total data (per user, see below)
    ``fairness``        0.5    even the service out across users
    ``interference``    0.1    stay off each other's channels
    ``communication``   0.02   talk less
    ==================  =====  ==================================================

    ``interference`` and ``communication`` are **penalty** weights: they are
    subtracted.  Pass them as non-negative numbers.

    ``communication`` *is* the communication penalty ``lambda`` from the
    specification -- charged per bit of inter-agent traffic per timestep.  It
    lives here rather than in a separate config field so that there is exactly
    one place in the codebase that sets the price of talking; the lab's
    "communication penalty lambda" slider writes to this weight.

    **Scale calibration, and a known weakness.**  The weights were chosen so
    that on the *familiar* deployment the four terms land in a comparable
    range.  Sweeping all four hand-coded baselines over all ten scenarios in
    this package gives these actual term ranges (computed outputs of this
    simulator, not measured results):

    ==================  ==========================
    term                observed contribution
    ==================  ==========================
    ``throughput``      +0.9 to +6.3
    ``fairness``        +0.25 to +0.50
    ``interference``    -18.5 to 0
    ``communication``   -0.48 to 0
    ==================  ==========================

    The interference term is the odd one out, and deliberately not hidden: it
    is **unbounded above**, because it is proportional to a mean
    interference-to-noise ratio and two stations placed close together on the
    same channel can drive that ratio into the hundreds.  On the tightly
    clustered :func:`~wireless_env.scenarios.unseen_topology` a full collision
    produces an interference penalty several times larger than the entire
    throughput term, so on that deployment the reward is effectively
    "avoid interference" and the fairness term stops mattering at all.

    That is a genuine reward-design flaw, and it is left in on purpose,
    because "redesign the reward" is the final project.  A student who notices
    it has several honest fixes available, and they are worth arguing about:
    squash the penalty (penalize ``log2(1 + INR)`` rather than ``INR``), clip
    it, normalize it per scenario, or drop it to zero -- which is entirely
    defensible, since interference already lowers the reward through the SINR
    and hence through the throughput term.  The interference weight is
    therefore best understood as a *denser learning signal* for a term that is
    already implicitly present, and not as an independent objective.
    """

    throughput: float = 1.0
    fairness: float = 0.5
    interference: float = 0.1
    communication: float = 0.02

    def __post_init__(self) -> None:
        for name in ("throughput", "fairness", "interference", "communication"):
            value = float(getattr(self, name))
            if not math.isfinite(value):
                raise ValueError(f"RewardWeights.{name} must be finite, got {value}.")
        for name in ("interference", "communication"):
            if float(getattr(self, name)) < 0.0:
                raise ValueError(
                    f"RewardWeights.{name} is a penalty weight and is subtracted "
                    f"inside the reward, so pass it as a non-negative number; got "
                    f"{getattr(self, name)}. To reward interference (you almost "
                    "certainly do not want this) you would have to edit "
                    "compute_team_reward, which is the honest place to do it."
                )


# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #

StationLayout = Literal["triangle", "line", "cluster", "random"]
FailureMode = Literal["orphan", "reassign"]


@dataclass(frozen=True)
class WirelessConfig:
    """Everything that defines one deployment scenario.

    Frozen on purpose: a config is a *description of a scenario*, and scenarios
    should be quotable in a results table without any chance that some code
    path mutated one halfway through an evaluation.  Derive variants with
    :func:`dataclasses.replace` or with the ``**overrides`` argument every
    constructor in :mod:`wireless_env.scenarios` accepts.
    """

    # ---------------------------------------------------------------- identity
    name: str = "default"
    description: str = (
        "Default familiar deployment: three base stations on an equilateral "
        "triangle, three channels, 2-4 users each, static topology."
    )

    # ---------------------------------------------------------------- topology
    n_base_stations: int = 3
    n_channels: int = 3
    users_per_station_range: tuple[int, int] = (2, 4)
    area_size: float = 10.0
    station_layout: StationLayout = "triangle"
    #: Explicit station coordinates; overrides ``station_layout`` when given.
    station_positions: Optional[tuple[tuple[float, float], ...]] = None
    #: Explicit per-station user counts; overrides ``users_per_station_range``.
    users_per_station: Optional[tuple[int, ...]] = None
    #: Explicit user coordinates, in station-major order.
    user_positions: Optional[tuple[tuple[float, float], ...]] = None
    #: Radius of the disc around its station in which a user is placed.
    user_radius: float = 2.5
    #: Pad the message part of the observation as if this many stations existed.
    #: Set it when you want a policy trained on N stations to be *evaluable* on
    #: N+1 (the "new base station joins" scenario) without a shape mismatch.
    max_base_stations: Optional[int] = None
    #: Redraw the topology on every seedless ``reset()``.  ``False`` (default)
    #: means a fixed, familiar deployment; ``True`` is the varied-topology
    #: training regime.
    regenerate_topology_on_reset: bool = False

    # ----------------------------------------------------------------- physics
    power_levels: tuple[float, ...] = (0.2, 0.5, 1.0)
    path_loss_exponent: float = 3.0
    path_loss_epsilon: float = 1.0
    noise_power: float = 1e-3
    bandwidth: float = 1.0
    #: Extra additive noise power per channel, on top of ``noise_power``.  This
    #: is how a channel "becomes noisy" without adding a fading stack.
    channel_extra_noise: Optional[tuple[float, ...]] = None

    # ------------------------------------------------------------------ demand
    demand_mean: float = 4.0
    demand_min: float = 1.0
    demand_max: float = 8.0
    demand_volatility: float = 0.6
    demand_persistence: float = 0.8
    burst_probability: float = 0.0
    burst_multiplier: float = 2.0
    initial_demands: Optional[tuple[float, ...]] = None
    #: When ``True`` a user's delivered rate is capped by its demand,
    #: ``served = min(capacity, demand)``.  Capacity you cannot sell is not
    #: throughput.
    demand_limited: bool = True

    # ---------------------------------------------------------------- mobility
    user_mobility: bool = False
    user_speed: float = 0.3

    # ---------------------------------------------------------------- failures
    #: Which stations fail.  Empty means none.
    failed_stations: tuple[int, ...] = ()
    #: Step index at which ``failed_stations`` go down.  ``None`` (or ``0``)
    #: means they are already down at reset.  Otherwise the check is
    #: ``step_count >= failure_step`` evaluated *before* the physics, where
    #: ``step_count`` is the number of completed steps: with ``failure_step=10``
    #: the first ten steps run healthy (the metrics report them as steps 1..10)
    #: and the station is silent from the step reported as 11 onwards.
    failure_step: Optional[int] = None
    #: What happens to a failed station's users.  ``"orphan"`` (default) leaves
    #: them associated with the dead station, so they get rate 0 and stay in
    #: every metric -- the blackout is visible in throughput *and* fairness.
    #: ``"reassign"`` re-associates them once to the nearest live station.  That
    #: second option is a deliberately crude stand-in for coverage recovery and
    #: is **not** a handover protocol (no measurement reports, no signalling, no
    #: hysteresis); it is off by default for exactly that reason.
    failure_mode: FailureMode = "orphan"

    # ----------------------------------------------------------- communication
    communication: bool = False
    #: Payload width of one message, in bits.  The lab exposes 0, 1, 2 and 4.
    bits_per_message: int = 2
    #: Probability that a transmitted message fails to arrive.  The sender still
    #: pays for the bits, because it spent them.
    comm_dropout_probability: float = 0.0
    #: Interference-to-noise ratio above which a station raises the
    #: ``high_interference_alert`` bit.  Rule-based, not learned.
    interference_alert_threshold: float = 1.0

    # ------------------------------------------------------------------ reward
    reward_weights: RewardWeights = field(default_factory=RewardWeights)

    # ----------------------------------------------------------------- episode
    max_steps: int = 50
    seed: Optional[int] = 0

    # ------------------------------------------------------------------ checks
    def __post_init__(self) -> None:
        if self.n_base_stations < 1:
            raise ValueError(
                f"n_base_stations must be at least 1, got {self.n_base_stations}. "
                "With zero agents there is no coordination problem to pose."
            )
        if self.n_channels < 1:
            raise ValueError(
                f"n_channels must be at least 1, got {self.n_channels}. Note that "
                "n_channels == 1 forces every station onto the same channel, so "
                "collisions become unavoidable -- a legitimate but extreme scenario."
            )
        low, high = self.users_per_station_range
        if low < 1 or high < low:
            raise ValueError(
                f"users_per_station_range must be (low, high) with 1 <= low <= high, "
                f"got {self.users_per_station_range}. Every station needs at least "
                "one user, or it has nothing to allocate resources for."
            )
        if len(self.power_levels) < 1:
            raise ValueError("power_levels must contain at least one level.")
        if any(float(power) <= 0.0 for power in self.power_levels):
            raise ValueError(
                f"power_levels must all be strictly positive, got {self.power_levels}. "
                "A zero-power level would mean 'do not transmit', which this action "
                "space does not model; failure is modelled by failed_stations instead."
            )
        if self.noise_power <= 0.0:
            raise ValueError(
                f"noise_power must be strictly positive, got {self.noise_power}. It is "
                "the receiver noise floor sigma^2; with sigma^2 = 0 an interference-free "
                "link would have infinite SINR and unbounded rate."
            )
        if self.demand_min < 0.0 or self.demand_max < self.demand_min:
            raise ValueError(
                f"demand bounds must satisfy 0 <= demand_min <= demand_max, got "
                f"({self.demand_min}, {self.demand_max})."
            )
        if not 0.0 <= self.demand_persistence <= 1.0:
            raise ValueError(
                f"demand_persistence is the AR(1) coefficient of the demand process "
                f"and must lie in [0, 1], got {self.demand_persistence}. 0 means "
                "demand is redrawn independently each step; 1 means it never moves."
            )
        if not 0.0 <= self.burst_probability <= 1.0:
            raise ValueError(
                f"burst_probability must be a probability in [0, 1], got "
                f"{self.burst_probability}."
            )
        if not 0.0 <= self.comm_dropout_probability <= 1.0:
            raise ValueError(
                f"comm_dropout_probability must be a probability in [0, 1], got "
                f"{self.comm_dropout_probability}."
            )
        if not 0 <= self.bits_per_message <= MAX_MESSAGE_BITS:
            raise ValueError(
                f"bits_per_message must be between 0 and {MAX_MESSAGE_BITS}, got "
                f"{self.bits_per_message}. The rule-based protocol defines exactly "
                f"{MAX_MESSAGE_BITS} bits (see MESSAGE_BIT_NAMES); 0 bits is the same "
                "as switching communication off."
            )
        if self.max_steps < 1:
            raise ValueError(f"max_steps must be at least 1, got {self.max_steps}.")
        if self.channel_extra_noise is not None and len(
            self.channel_extra_noise
        ) != self.n_channels:
            raise ValueError(
                f"channel_extra_noise has {len(self.channel_extra_noise)} entries but "
                f"there are {self.n_channels} channels. Give one extra-noise value per "
                "channel (use 0.0 for the clean ones)."
            )
        if self.channel_extra_noise is not None and any(
            float(value) < 0.0 for value in self.channel_extra_noise
        ):
            raise ValueError(
                f"channel_extra_noise values are added to the noise floor and must be "
                f"non-negative, got {self.channel_extra_noise}."
            )
        for index in self.failed_stations:
            if not 0 <= index < self.n_base_stations:
                raise ValueError(
                    f"failed_stations contains station index {index}, but the stations "
                    f"are numbered 0..{self.n_base_stations - 1}."
                )
        if self.failure_step is not None and self.failure_step < 0:
            raise ValueError(
                f"failure_step must be non-negative or None, got {self.failure_step}. "
                "Use None (or 0) for a station that is already down at reset."
            )
        if self.max_base_stations is not None and self.max_base_stations < self.n_base_stations:
            raise ValueError(
                f"max_base_stations ({self.max_base_stations}) is smaller than "
                f"n_base_stations ({self.n_base_stations}). It exists to reserve *extra* "
                "observation slots for stations that might join later, so it must be at "
                "least n_base_stations."
            )
        if self.station_positions is not None and len(
            self.station_positions
        ) != self.n_base_stations:
            raise ValueError(
                f"station_positions has {len(self.station_positions)} entries but "
                f"n_base_stations is {self.n_base_stations}."
            )
        if self.users_per_station is not None:
            if len(self.users_per_station) != self.n_base_stations:
                raise ValueError(
                    f"users_per_station has {len(self.users_per_station)} entries but "
                    f"n_base_stations is {self.n_base_stations}."
                )
            if any(int(count) < 1 for count in self.users_per_station):
                raise ValueError(
                    f"every station needs at least one user, got {self.users_per_station}."
                )
        if self.user_positions is not None:
            expected = (
                sum(self.users_per_station)
                if self.users_per_station is not None
                else None
            )
            if expected is not None and len(self.user_positions) != expected:
                raise ValueError(
                    f"user_positions has {len(self.user_positions)} entries but "
                    f"users_per_station sums to {expected}. When you pin user positions "
                    "you must also pin users_per_station, in station-major order."
                )
            if self.users_per_station is None:
                raise ValueError(
                    "user_positions was given without users_per_station. Pinned user "
                    "coordinates are listed station by station, so the environment "
                    "cannot tell which user belongs to which station without the counts."
                )

    # ------------------------------------------------------------- convenience
    @property
    def n_actions(self) -> int:
        """Size of each agent's Discrete action space: channels x power levels."""
        return self.n_channels * len(self.power_levels)

    @property
    def max_users_per_station(self) -> int:
        """Observation padding width for own users (fixed for the whole run)."""
        explicit = max(self.users_per_station) if self.users_per_station else 0
        return max(self.users_per_station_range[1], explicit)

    @property
    def n_message_slots(self) -> int:
        """How many *other* stations the observation reserves message slots for."""
        total = self.max_base_stations or self.n_base_stations
        return max(total - 1, 0)

    def replace(self, **overrides: Any) -> "WirelessConfig":
        """Return a copy with fields overridden (a thin :func:`dataclasses.replace`)."""
        unknown = set(overrides) - {f.name for f in dataclasses.fields(self)}
        if unknown:
            raise ValueError(
                f"Unknown WirelessConfig field(s): {sorted(unknown)}. Valid fields are "
                f"{sorted(f.name for f in dataclasses.fields(self))}."
            )
        return replace(self, **overrides)


# --------------------------------------------------------------------------- #
# Action encoding  (Chapter 1 teaches exactly this)
# --------------------------------------------------------------------------- #


def encode_action(
    channel: int,
    power_level: int,
    n_channels: int = 3,
    n_power_levels: int = N_POWER_LEVELS,
) -> int:
    """Pack ``(channel, power_level)`` into one flat action index.

    Implements the row-major (channel-major) mapping

    .. math::

        a = c \\cdot P + p

    where ``P = n_power_levels``.  With three channels and three power levels
    that is the ``Discrete(9)`` action space of the default configuration::

        a : 0   1   2   3   4   5   6   7   8
        c : 0   0   0   1   1   1   2   2   2
        p : lo med hi  lo med hi  lo med hi

    The flattening is why three agents face ``9^3 = 729`` joint actions -- small
    enough to enumerate in a notebook, big enough that independent learners
    genuinely miscoordinate.

    Parameters
    ----------
    channel:
        Channel index in ``[0, n_channels)``.
    power_level:
        Power index in ``[0, n_power_levels)``; 0 = low, 1 = medium, 2 = high.

    Returns
    -------
    int
        The flat action index.

    Raises
    ------
    ValueError
        If either component is out of range.

    Examples
    --------
    >>> encode_action(0, 0)
    0
    >>> encode_action(1, 2)
    5
    >>> encode_action(2, 2)
    8
    """
    if n_channels < 1 or n_power_levels < 1:
        raise ValueError(
            f"n_channels and n_power_levels must both be >= 1, got {n_channels} and "
            f"{n_power_levels}."
        )
    channel_index = int(channel)
    power_index = int(power_level)
    if channel_index != channel or power_index != power_level:
        raise ValueError(
            f"channel and power_level must be integers, got {channel!r} and "
            f"{power_level!r}. They are *indices* into the channel list and the "
            "power-level list, not a frequency in hertz or a power in watts."
        )
    if not 0 <= channel_index < n_channels:
        raise ValueError(
            f"channel must be in [0, {n_channels}), got {channel_index}. Channels are "
            f"zero-indexed, so with {n_channels} channels the valid values are "
            f"0..{n_channels - 1}."
        )
    if not 0 <= power_index < n_power_levels:
        raise ValueError(
            f"power_level must be in [0, {n_power_levels}), got {power_index}. The "
            f"levels are indices: 0 = {POWER_LABELS[0]}, 1 = {POWER_LABELS[1]}, "
            f"2 = {POWER_LABELS[2]}."
        )
    return channel_index * n_power_levels + power_index


def decode_action(
    action: int,
    n_channels: int = 3,
    n_power_levels: int = N_POWER_LEVELS,
) -> tuple[int, int]:
    """Unpack a flat action index into ``(channel, power_level)``.

    Exact inverse of :func:`encode_action`::

        c = a // n_power_levels
        p = a %  n_power_levels

    Returns
    -------
    tuple[int, int]
        ``(channel, power_level)``.

    Raises
    ------
    ValueError
        If ``action`` is not an integer in ``[0, n_channels * n_power_levels)``.

    Examples
    --------
    >>> decode_action(0)
    (0, 0)
    >>> decode_action(5)
    (1, 2)
    >>> decode_action(8)
    (2, 2)
    """
    if n_channels < 1 or n_power_levels < 1:
        raise ValueError(
            f"n_channels and n_power_levels must both be >= 1, got {n_channels} and "
            f"{n_power_levels}."
        )
    n_actions = n_channels * n_power_levels
    if isinstance(action, bool) or not isinstance(
        action, (int, float, np.integer, np.floating)
    ):
        raise ValueError(
            f"action must be an integer index, got {action!r} of type "
            f"{type(action).__name__}. This is a Discrete({n_actions}) action space: "
            "one integer per agent, not a string, not a (channel, power) tuple and "
            "not a probability vector. Use encode_action(channel, power_level) to "
            "build the index."
        )
    index = int(action)
    if index != action:
        raise ValueError(
            f"action must be a whole number, got {action!r}. If your policy produced "
            "a float, take an argmax or round it before stepping the environment."
        )
    if not 0 <= index < n_actions:
        raise ValueError(
            f"action must be in [0, {n_actions}), got {index}. With {n_channels} "
            f"channels and {n_power_levels} power levels there are {n_actions} joint "
            "(channel, power) choices per agent."
        )
    return index // n_power_levels, index % n_power_levels


# --------------------------------------------------------------------------- #
# Observation layout
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class ObservationLayout:
    """Where each block of information sits inside an agent's observation vector.

    The observation is a flat ``float32`` vector so that it drops straight into
    any learner, but a flat vector is unreadable to a human, so this object
    names every slice.  Both the greedy baseline and the Three.js agent view
    read the observation through here rather than hard-coding offsets.

    Layout, in order, for ``U = max_users_per_station``, ``C = n_channels``,
    ``P = n_power_levels`` and ``S = n_message_slots``:

    ==============================  =====  ==========================================
    block                           width  contents and normalization
    ==============================  =====  ==========================================
    ``demand``                      U      own users' demand / ``demand_max``,
                                           zero-padded to U
    ``user_mask``                   U      1.0 for a real user, 0.0 for padding
    ``serving_gain``                U      own channel gain to each own user,
                                           divided by the maximum possible gain
                                           ``channel_gain(0)`` so it lands in (0, 1]
    ``interference``                C      interference-to-noise ratio per channel,
                                           averaged over own users, as reported to
                                           the station.  **One step stale.**
                                           Unbounded above; 0 at reset
    ``channel_quality``             C      ``sigma_base^2 / (sigma_c^2 + I_c)`` in
                                           (0, 1]: 1.0 is a pristine channel, small
                                           means noisy or crowded
    ``previous_channel``            C      one-hot of own previous channel; all-zero
                                           at reset
    ``previous_power``              P      one-hot of own previous power level;
                                           all-zero at reset
    ``operational``                 1      1.0 if this station is alive, 0.0 if failed
    ``time``                        1      ``step / max_steps`` in [0, 1]
    ``messages``                    S x 5  per other station: one "message received"
                                           flag, then ``MAX_MESSAGE_BITS`` bit slots
                                           (unused bits and unused senders are 0)
    ==============================  =====  ==========================================

    Two deliberate properties:

    * **The interference block is stale by one step.**  A station senses the
      interference produced by the *previous* joint action, then chooses.  This
      is realistic and it is also the direct cause of the greedy baseline's
      oscillation -- everybody flees to the channel that *was* quiet.
    * **The message block is a fixed width** regardless of
      ``bits_per_message``, so the observation dimension is stable across the
      whole 0/1/2/4-bit communication sweep.
    """

    max_users_per_station: int
    n_channels: int
    n_power_levels: int
    n_message_slots: int
    max_message_bits: int = MAX_MESSAGE_BITS

    @property
    def demand(self) -> slice:
        return slice(0, self.max_users_per_station)

    @property
    def user_mask(self) -> slice:
        start = self.max_users_per_station
        return slice(start, start + self.max_users_per_station)

    @property
    def serving_gain(self) -> slice:
        start = 2 * self.max_users_per_station
        return slice(start, start + self.max_users_per_station)

    @property
    def interference(self) -> slice:
        start = 3 * self.max_users_per_station
        return slice(start, start + self.n_channels)

    @property
    def channel_quality(self) -> slice:
        start = 3 * self.max_users_per_station + self.n_channels
        return slice(start, start + self.n_channels)

    @property
    def previous_channel(self) -> slice:
        start = 3 * self.max_users_per_station + 2 * self.n_channels
        return slice(start, start + self.n_channels)

    @property
    def previous_power(self) -> slice:
        start = 3 * self.max_users_per_station + 3 * self.n_channels
        return slice(start, start + self.n_power_levels)

    @property
    def operational(self) -> slice:
        start = 3 * self.max_users_per_station + 3 * self.n_channels + self.n_power_levels
        return slice(start, start + 1)

    @property
    def time(self) -> slice:
        start = (
            3 * self.max_users_per_station
            + 3 * self.n_channels
            + self.n_power_levels
            + 1
        )
        return slice(start, start + 1)

    @property
    def messages(self) -> slice:
        start = (
            3 * self.max_users_per_station
            + 3 * self.n_channels
            + self.n_power_levels
            + 2
        )
        return slice(start, start + self.n_message_slots * (1 + self.max_message_bits))

    @property
    def size(self) -> int:
        """Total observation dimension."""
        return (
            3 * self.max_users_per_station
            + 3 * self.n_channels
            + self.n_power_levels
            + 2
            + self.n_message_slots * (1 + self.max_message_bits)
        )

    def message_slice(self, sender_slot: int) -> slice:
        """Slice of the observation holding one sender's flag plus bits."""
        if not 0 <= sender_slot < self.n_message_slots:
            raise ValueError(
                f"sender_slot must be in [0, {self.n_message_slots}), got "
                f"{sender_slot}. Slots are indexed over the *other* stations in "
                "ascending station order, skipping the observing station itself."
            )
        width = 1 + self.max_message_bits
        start = self.messages.start + sender_slot * width
        return slice(start, start + width)

    def block_names(self) -> tuple[str, ...]:
        """Names of every block, in layout order."""
        return (
            "demand",
            "user_mask",
            "serving_gain",
            "interference",
            "channel_quality",
            "previous_channel",
            "previous_power",
            "operational",
            "time",
            "messages",
        )


def observation_layout(config: WirelessConfig) -> ObservationLayout:
    """Build the :class:`ObservationLayout` implied by a config."""
    return ObservationLayout(
        max_users_per_station=config.max_users_per_station,
        n_channels=config.n_channels,
        n_power_levels=len(config.power_levels),
        n_message_slots=config.n_message_slots,
    )


def unpack_observation(
    observation: np.ndarray,
    layout: ObservationLayout,
) -> dict[str, np.ndarray]:
    """Split a flat observation vector into its named blocks.

    Use this instead of hard-coded indices.  It is what the greedy baseline and
    the lab's agent view use, and it is the readable way for a student to
    inspect "what does agent 1 actually know right now?".

    Returns
    -------
    dict[str, numpy.ndarray]
        One entry per block name, plus ``"messages_by_sender"``: a
        ``(n_message_slots, 1 + MAX_MESSAGE_BITS)`` matrix whose first column is
        the received flag and whose remaining columns are the message bits.
    """
    array = np.asarray(observation, dtype=float).reshape(-1)
    if array.size != layout.size:
        raise ValueError(
            f"observation has {array.size} entries but this layout describes "
            f"{layout.size}. Either you passed an observation from a differently "
            "configured environment (a different number of channels, users or "
            "stations all change the width), or you passed a batch instead of a "
            "single observation."
        )
    unpacked = {name: array[getattr(layout, name)] for name in layout.block_names()}
    width = 1 + layout.max_message_bits
    unpacked["messages_by_sender"] = (
        unpacked["messages"].reshape(layout.n_message_slots, width)
        if layout.n_message_slots
        else np.zeros((0, width))
    )
    return unpacked


# --------------------------------------------------------------------------- #
# Reward
# --------------------------------------------------------------------------- #


def compute_team_reward(
    served_rates: Sequence[float],
    interference: Sequence[float],
    communication_bits: float,
    noise_power: float,
    weights: RewardWeights,
) -> tuple[float, dict[str, float]]:
    """The shared team reward, as a weighted sum of four named terms.

    Implements

    .. math::

        r_t = w_{\\text{thr}} \\bar{x}
            + w_{\\text{fair}} J(x)
            - w_{\\text{int}} \\overline{\\mathrm{INR}}
            - \\lambda \\, b_t

    where

    * :math:`\\bar{x}` is mean served rate per user
      (:func:`~wireless_env.metrics.mean_throughput`).  *Mean*, not total, so
      that the reward scale does not jump when a scenario has more users --
      which matters because the evaluation suite compares deployments with
      different user counts.
    * :math:`J(x)` is Jain's fairness index of the served rates
      (:func:`~wireless_env.metrics.jain_fairness`), in ``[1/n, 1]``.
    * :math:`\\overline{\\mathrm{INR}}` is mean per-user interference divided by
      the noise floor -- interference measured in units of "how loud is my own
      thermal noise", which makes the penalty dimensionless and legible.
    * :math:`b_t` is the total message bits sent this step
      (:func:`~wireless_env.metrics.communication_overhead`) and
      :math:`\\lambda` is ``weights.communication``.

    Note that the interference penalty is partly *redundant* with the throughput
    term -- interference already lowers rates through the SINR.  It is included
    anyway because it is a much denser learning signal than throughput alone
    (an agent feels it immediately, before the rate consequences average out)
    and because the specification reports interference as a first-class metric.
    Setting ``weights.interference = 0`` is a perfectly reasonable student
    experiment, and one worth running.

    This function is deliberately a **module-level pure function** rather than a
    method: the final project asks students to redesign the reward, and the
    cleanest way to do that is to copy this function, edit it, and pass the new
    one in -- no subclassing, no environment internals.

    Parameters
    ----------
    served_rates:
        Per-user delivered rates (already demand-capped if that is enabled).
    interference:
        Per-user interference power on the user's serving channel, in the same
        normalized units as ``power * gain``.
    communication_bits:
        Total inter-agent message bits transmitted this step.
    noise_power:
        The base noise floor ``sigma^2``, used to normalize the interference
        penalty.  Must be positive.
    weights:
        A :class:`RewardWeights`.

    Returns
    -------
    tuple[float, dict[str, float]]
        The scalar team reward, and a breakdown ``{term_name: contribution}``
        whose values sum to it.  The breakdown is returned in ``infos`` every
        step so a student can see *which* term moved.

    Examples
    --------
    >>> reward, terms = compute_team_reward(
    ...     [2.0, 2.0], [0.0, 0.0], 0.0, 1e-3, RewardWeights())
    >>> round(reward, 6)
    2.5
    >>> sorted(terms)
    ['communication', 'fairness', 'interference', 'throughput']
    """
    rates = np.asarray(served_rates, dtype=float).reshape(-1)
    interference_array = np.asarray(interference, dtype=float).reshape(-1)
    if rates.size != interference_array.size:
        raise ValueError(
            f"served_rates has {rates.size} entries but interference has "
            f"{interference_array.size}. Both are per-user quantities and must line "
            "up user by user."
        )
    if rates.size == 0:
        raise ValueError(
            "served_rates is empty: the reward is defined over at least one user. "
            "An environment with no users has nothing to allocate."
        )
    noise = float(noise_power)
    if not math.isfinite(noise) or noise <= 0.0:
        raise ValueError(
            f"noise_power must be strictly positive, got {noise}; it is the reference "
            "the interference penalty is normalized by."
        )
    bits = float(communication_bits)
    if not math.isfinite(bits) or bits < 0.0:
        raise ValueError(
            f"communication_bits must be a finite non-negative bit count, got {bits}."
        )

    mean_rate = metrics_module.mean_throughput(rates)
    fairness = metrics_module.jain_fairness(rates)
    mean_inr = float(np.mean(physics.interference_to_noise_ratio(interference_array, noise)))

    terms = {
        "throughput": float(weights.throughput * mean_rate),
        "fairness": float(weights.fairness * fairness),
        "interference": float(-weights.interference * mean_inr),
        "communication": float(-weights.communication * bits),
    }
    return float(sum(terms.values())), terms


# --------------------------------------------------------------------------- #
# The environment
# --------------------------------------------------------------------------- #


class CooperativeWirelessEnv:
    """Cooperative wireless resource allocation with one agent per base station.

    See the module docstring for the API-compatibility and determinism
    contracts.  Minimal usage::

        from wireless_env.environment import CooperativeWirelessEnv
        from wireless_env.scenarios import familiar_topology

        env = CooperativeWirelessEnv(familiar_topology())
        observations, infos = env.reset(seed=0)
        actions = {agent: 0 for agent in env.agents}
        observations, rewards, terminations, truncations, infos = env.step(actions)

    Every agent receives the **same** reward every step: the task is fully
    cooperative, and credit assignment across agents is left as the learning
    problem rather than being solved by reward shaping.

    Episodes end by **truncation** at ``config.max_steps``, never by
    termination: there is no goal state and no catastrophic absorbing state in
    resource allocation, you simply keep serving traffic.  ``terminations`` is
    therefore always all-``False``, which is the correct signal for a learner
    (bootstrap the value of the final state; do not treat it as terminal).
    """

    metadata: dict[str, Any] = {
        "name": "cooperative_wireless_v0",
        "is_parallelizable": True,
        "render_modes": ["text"],
        "api_shape": "pettingzoo.ParallelEnv (compatible in shape, not a subclass)",
    }

    # ------------------------------------------------------------------ set-up
    def __init__(self, config: Optional[WirelessConfig] = None) -> None:
        self.config: WirelessConfig = config if config is not None else WirelessConfig()

        self.possible_agents: list[str] = [
            f"bs_{index}" for index in range(self.config.n_base_stations)
        ]
        self.agents: list[str] = list(self.possible_agents)

        self._layout: ObservationLayout = observation_layout(self.config)
        self._action_space = Discrete(self.config.n_actions)
        self._observation_space = self._build_observation_space()

        self._max_gain: float = float(
            physics.channel_gain(
                0.0,
                epsilon=self.config.path_loss_epsilon,
                alpha=self.config.path_loss_exponent,
            )
        )
        self._channel_noise: np.ndarray = self._build_channel_noise()

        self._seed: Optional[int] = self.config.seed
        self._rng: np.random.Generator = np.random.default_rng(self.config.seed)

        # Topology state, filled by _build_topology.
        self._station_positions: np.ndarray = np.zeros((0, 2))
        self._user_positions: np.ndarray = np.zeros((0, 2))
        self._user_station: np.ndarray = np.zeros(0, dtype=int)
        self._station_user_indices: list[np.ndarray] = []
        self._demands: np.ndarray = np.zeros(0)
        self._home_station_positions: np.ndarray = np.zeros((0, 2))

        # Episode state.
        self._step_count: int = 0
        self._alive: np.ndarray = np.ones(self.config.n_base_stations, dtype=bool)
        self._channels: np.ndarray = np.zeros(self.config.n_base_stations, dtype=int)
        self._powers: np.ndarray = np.zeros(self.config.n_base_stations, dtype=int)
        self._has_acted: bool = False
        self._measured_inr: np.ndarray = np.zeros(
            (self.config.n_base_stations, self.config.n_channels)
        )
        self._received_messages: np.ndarray = np.zeros(
            (self.config.n_base_stations, self.config.n_base_stations, 1 + MAX_MESSAGE_BITS)
        )
        self._last_outcome: dict[str, Any] = {}
        self._topology_built: bool = False

        self._build_topology(self._rng)
        self._reset_episode_state()

    # ------------------------------------------------------------------ spaces
    def _build_observation_space(self) -> Box:
        """Per-element bounds for the observation vector (see ObservationLayout)."""
        layout = self._layout
        low = np.zeros(layout.size, dtype=np.float32)
        high = np.ones(layout.size, dtype=np.float32)
        # Interference is reported as an interference-to-noise ratio and has no
        # upper bound: a very close, very loud co-channel neighbour can produce
        # an arbitrarily large value.
        high[layout.interference] = np.inf
        return Box(low=low, high=high, dtype=np.dtype(np.float32))

    def observation_space(self, agent: Optional[str] = None) -> Box:
        """Observation space of ``agent`` (identical for every agent here).

        Accepts the agent name for PettingZoo-shaped call sites, and also works
        with no argument for convenience in notebooks.
        """
        self._check_agent_name(agent)
        return self._observation_space

    def action_space(self, agent: Optional[str] = None) -> Discrete:
        """Action space of ``agent``: ``Discrete(n_channels * n_power_levels)``.

        For the default configuration that is ``Discrete(9)``, decoded by
        :func:`decode_action` into ``(channel, power_level)``.
        """
        self._check_agent_name(agent)
        return self._action_space

    @property
    def layout(self) -> ObservationLayout:
        """The :class:`ObservationLayout` describing this env's observations."""
        return self._layout

    @property
    def num_agents(self) -> int:
        """Number of agents currently in the episode."""
        return len(self.agents)

    @property
    def max_num_agents(self) -> int:
        """Number of agents this environment can ever have."""
        return len(self.possible_agents)

    def _check_agent_name(self, agent: Optional[str]) -> None:
        if agent is None:
            return
        if agent not in self.possible_agents:
            raise ValueError(
                f"Unknown agent {agent!r}. This environment's agents are "
                f"{self.possible_agents}. Agent names are 'bs_<index>' where the "
                "index is the base-station number."
            )

    def agent_index(self, agent: str) -> int:
        """Station index behind an agent name, e.g. ``'bs_2' -> 2``."""
        self._check_agent_name(agent)
        if agent is None:  # pragma: no cover - defensive
            raise ValueError("agent must be a name, not None.")
        return self.possible_agents.index(agent)

    # ---------------------------------------------------------------- topology
    def _build_channel_noise(self) -> np.ndarray:
        """Per-channel noise floor: base noise plus any configured extra noise."""
        extra = (
            np.asarray(self.config.channel_extra_noise, dtype=float)
            if self.config.channel_extra_noise is not None
            else np.zeros(self.config.n_channels)
        )
        return float(self.config.noise_power) + extra

    def _default_station_positions(self, rng: np.random.Generator) -> np.ndarray:
        """Station coordinates implied by ``config.station_layout``."""
        n = self.config.n_base_stations
        area = float(self.config.area_size)
        centre = area / 2.0
        layout = self.config.station_layout

        if layout == "triangle":
            # n points equally spaced on a circle, first one at the top.  For
            # n = 3 this is the equilateral triangle of the default deployment.
            radius = 0.3 * area
            angles = np.pi / 2.0 + 2.0 * np.pi * np.arange(n) / n
            return np.stack(
                [centre + radius * np.cos(angles), centre + radius * np.sin(angles)],
                axis=1,
            )
        if layout == "line":
            xs = area * (np.arange(1, n + 1) / (n + 1))
            return np.stack([xs, np.full(n, centre)], axis=1)
        if layout == "cluster":
            # Stations bunched into one quadrant: heavy mutual coupling, so
            # channel choice matters far more than in the spread-out layout.
            box = 0.25 * area
            corner = 0.32 * area
            return corner + rng.uniform(0.0, box, size=(n, 2))
        if layout == "random":
            # Rejection sampling for a minimum separation, so a random layout
            # does not degenerate into two stations on the same spot.
            min_separation = 0.22 * area
            positions: list[np.ndarray] = []
            for _ in range(400):
                if len(positions) == n:
                    break
                candidate = rng.uniform(0.1 * area, 0.9 * area, size=2)
                if all(
                    physics.euclidean_distance(candidate, existing) >= min_separation
                    for existing in positions
                ):
                    positions.append(candidate)
            while len(positions) < n:  # give up on separation rather than hang
                positions.append(rng.uniform(0.1 * area, 0.9 * area, size=2))
            return np.stack(positions, axis=0)

        raise ValueError(
            f"Unknown station_layout {layout!r}. Valid layouts are 'triangle' "
            "(spread out, the familiar deployment), 'line' (collinear), 'cluster' "
            "(bunched, high mutual interference) and 'random'. You can also bypass "
            "layouts entirely by passing explicit station_positions."
        )

    def _build_topology(self, rng: np.random.Generator) -> None:
        """Draw (or read) station positions, user counts, positions and demands."""
        config = self.config
        area = float(config.area_size)

        if config.station_positions is not None:
            stations = np.asarray(config.station_positions, dtype=float)
        else:
            stations = self._default_station_positions(rng)
        self._station_positions = np.clip(stations, 0.0, area)

        if config.users_per_station is not None:
            counts = np.asarray(config.users_per_station, dtype=int)
        else:
            low, high = config.users_per_station_range
            counts = rng.integers(low, high + 1, size=config.n_base_stations)
        n_users = int(np.sum(counts))

        self._user_station = np.repeat(np.arange(config.n_base_stations), counts)
        self._station_user_indices = [
            np.flatnonzero(self._user_station == index)
            for index in range(config.n_base_stations)
        ]

        if config.user_positions is not None:
            users = np.asarray(config.user_positions, dtype=float)
            if users.shape != (n_users, 2):
                raise ValueError(
                    f"user_positions has shape {users.shape} but {n_users} users x 2 "
                    "coordinates were expected."
                )
        else:
            # Uniform in a disc of radius user_radius around the home station.
            # sqrt of the uniform radius keeps the density even across the disc.
            angles = rng.uniform(0.0, 2.0 * np.pi, size=n_users)
            radii = config.user_radius * np.sqrt(rng.uniform(0.0, 1.0, size=n_users))
            offsets = np.stack([radii * np.cos(angles), radii * np.sin(angles)], axis=1)
            users = self._station_positions[self._user_station] + offsets
        self._user_positions = np.clip(users, 0.0, area)
        self._home_station_positions = self._station_positions[self._user_station]

        if config.initial_demands is not None:
            demands = np.asarray(config.initial_demands, dtype=float)
            if demands.size != n_users:
                raise ValueError(
                    f"initial_demands has {demands.size} entries but the topology has "
                    f"{n_users} users."
                )
        else:
            demands = rng.uniform(config.demand_min, config.demand_max, size=n_users)
        self._demands = np.clip(demands, config.demand_min, config.demand_max)
        self._topology_built = True

    def regenerate_topology(self, seed: Optional[int] = None) -> None:
        """Redraw station positions, user counts, user positions and demands.

        Exposed as a public method because "the deployment changed" is a
        first-class experiment in the ADAPT chapter, and because the lab's
        "new topology" button needs it.  Call :meth:`reset` afterwards to start
        a clean episode on the new topology.

        Parameters
        ----------
        seed:
            If given, the new topology is drawn from a fresh generator seeded
            with it, so the same seed always yields the same deployment.
        """
        rng = np.random.default_rng(seed) if seed is not None else self._rng
        self._build_topology(rng)
        self._reset_episode_state()

    @property
    def n_users(self) -> int:
        """Total number of users in the current topology."""
        return int(self._user_positions.shape[0])

    # ------------------------------------------------------------------- reset
    def _reset_episode_state(self) -> None:
        """Clear per-episode state (not the topology)."""
        config = self.config
        self._step_count = 0
        self._alive = np.ones(config.n_base_stations, dtype=bool)
        if config.failed_stations and (
            config.failure_step is None or config.failure_step == 0
        ):
            self._alive[list(config.failed_stations)] = False
        self._channels = np.zeros(config.n_base_stations, dtype=int)
        self._powers = np.zeros(config.n_base_stations, dtype=int)
        self._has_acted = False
        self._measured_inr = np.zeros((config.n_base_stations, config.n_channels))
        self._received_messages = np.zeros(
            (config.n_base_stations, config.n_base_stations, 1 + MAX_MESSAGE_BITS)
        )
        self._apply_failure_mode()
        self._last_outcome = {}
        self.agents = list(self.possible_agents)

    def reset(
        self,
        seed: Optional[int] = None,
        options: Optional[Mapping[str, Any]] = None,
    ) -> tuple[dict[str, np.ndarray], dict[str, dict[str, Any]]]:
        """Start a new episode.

        Parameters
        ----------
        seed:
            When given, reseeds everything and redraws the topology, so
            ``reset(seed=s)`` fully determines the episode.  When omitted, the
            existing random stream continues (Gymnasium/PettingZoo convention)
            and the topology is redrawn only if
            ``config.regenerate_topology_on_reset`` is ``True``.
        options:
            Accepted for API shape.  The one recognized key is
            ``{"regenerate_topology": bool}``, which overrides the config flag
            for this reset only.

        Returns
        -------
        tuple[dict, dict]
            ``(observations, infos)``, both keyed by agent name.
        """
        if seed is not None:
            self._seed = int(seed)
            self._rng = np.random.default_rng(self._seed)
            self._build_topology(self._rng)
        else:
            regenerate = self.config.regenerate_topology_on_reset
            if options is not None and "regenerate_topology" in options:
                regenerate = bool(options["regenerate_topology"])
            if regenerate or not self._topology_built:
                self._build_topology(self._rng)

        self._reset_episode_state()
        observations = self._all_observations()
        infos = {agent: {"reset": True} for agent in self.agents}
        return observations, infos

    # -------------------------------------------------------------------- step
    def _validate_actions(self, actions: Mapping[str, int]) -> np.ndarray:
        """Check the action dict and return per-station flat action indices."""
        if not isinstance(actions, Mapping):
            raise ValueError(
                f"step() expects a dict mapping agent name -> action index, got "
                f"{type(actions).__name__}. All agents act simultaneously in this "
                "parallel environment, so you pass one dict per timestep, e.g. "
                "{'bs_0': 4, 'bs_1': 0, 'bs_2': 8}."
            )
        missing = [agent for agent in self.agents if agent not in actions]
        if missing:
            raise ValueError(
                f"step() is missing an action for {missing}. Every agent must act "
                "every timestep: they transmit simultaneously, and a station with no "
                "action has no defined channel. A failed station still needs an "
                "action in the dict -- it is simply ignored."
            )
        unexpected = [agent for agent in actions if agent not in self.possible_agents]
        if unexpected:
            raise ValueError(
                f"step() received actions for unknown agent(s) {unexpected}. This "
                f"environment's agents are {self.possible_agents}."
            )
        indices = np.zeros(self.config.n_base_stations, dtype=int)
        for agent in self.agents:
            action = actions[agent]
            if not self._action_space.contains(action):
                raise ValueError(
                    f"Action {action!r} for {agent} is not in "
                    f"Discrete({self.config.n_actions}). Valid actions are the integers "
                    f"0..{self.config.n_actions - 1}; use "
                    "environment.encode_action(channel, power_level) if you are "
                    "thinking in terms of channel and power."
                )
            indices[self.agent_index(agent)] = int(action)
        return indices

    def _apply_failure_mode(self) -> None:
        """Re-associate orphaned users if the config asks for it."""
        if self.config.failure_mode != "reassign":
            return
        if bool(np.all(self._alive)) or not self._topology_built:
            return
        live = np.flatnonzero(self._alive)
        if live.size == 0:
            return
        dead_users = np.flatnonzero(~self._alive[self._user_station])
        for user in dead_users:
            distances = [
                physics.euclidean_distance(
                    self._user_positions[user], self._station_positions[station]
                )
                for station in live
            ]
            self._user_station[user] = int(live[int(np.argmin(distances))])
        self._station_user_indices = [
            np.flatnonzero(self._user_station == index)
            for index in range(self.config.n_base_stations)
        ]

    def _advance_demands(self) -> None:
        """One step of the demand process (AR(1) plus optional bursts)."""
        config = self.config
        if config.initial_demands is not None and config.demand_volatility == 0.0:
            return  # pinned, fully deterministic demand
        noise = self._rng.normal(0.0, 1.0, size=self._demands.size)
        updated = (
            config.demand_persistence * self._demands
            + (1.0 - config.demand_persistence) * config.demand_mean
            + config.demand_volatility * noise
        )
        if config.burst_probability > 0.0:
            bursting = self._rng.random(self._demands.size) < config.burst_probability
            updated = np.where(bursting, updated * config.burst_multiplier, updated)
        self._demands = np.clip(updated, config.demand_min, config.demand_max)

    def _move_users(self) -> None:
        """Random-walk mobility that keeps users inside their own cell.

        Users drift, but a user that wanders more than ``1.5 * user_radius``
        from its home station is projected back onto that boundary.  Without
        that leash, users would eventually escape their cell entirely and the
        association model (no handover) would stop making sense.
        """
        if not self.config.user_mobility or self.n_users == 0:
            return
        angles = self._rng.uniform(0.0, 2.0 * np.pi, size=self.n_users)
        steps = self.config.user_speed * np.stack(
            [np.cos(angles), np.sin(angles)], axis=1
        )
        positions = self._user_positions + steps
        leash = 1.5 * self.config.user_radius
        offsets = positions - self._home_station_positions
        distances = np.linalg.norm(offsets, axis=1)
        too_far = distances > leash
        if np.any(too_far):
            scale = np.where(too_far, leash / np.maximum(distances, 1e-12), 1.0)
            positions = self._home_station_positions + offsets * scale[:, None]
        self._user_positions = np.clip(positions, 0.0, self.config.area_size)

    def _compute_link_outcome(self) -> dict[str, Any]:
        """Evaluate the physics for the current joint action.

        Returns a dict of per-user and per-station quantities.  The SINR of each
        user is computed by calling :func:`wireless_env.physics.sinr` once per
        user -- the scalar code path -- rather than by a clever vectorization,
        so that the numbers here are provably the same numbers the TypeScript
        port and the JSON fixtures produce.
        """
        config = self.config
        n_stations = config.n_base_stations
        n_users = self.n_users

        gains = physics.channel_gain(
            physics.pairwise_distances(self._station_positions, self._user_positions),
            epsilon=config.path_loss_epsilon,
            alpha=config.path_loss_exponent,
        )
        gains = np.asarray(gains, dtype=float).reshape(n_stations, n_users)

        powers = np.array(
            [
                config.power_levels[self._powers[station]] if self._alive[station] else 0.0
                for station in range(n_stations)
            ],
            dtype=float,
        )
        transmitting = self._alive & self._has_acted_mask()

        # Interference each user would see on each channel, from every station
        # other than its own.
        contribution = powers[:, None] * gains  # (station, user)
        interference_by_channel = np.zeros((config.n_channels, n_users))
        for channel in range(config.n_channels):
            on_channel = transmitting & (self._channels == channel)
            if np.any(on_channel):
                interference_by_channel[channel] = np.sum(
                    contribution[on_channel], axis=0
                )
        for user in range(n_users):
            serving = int(self._user_station[user])
            if transmitting[serving]:
                own_channel = int(self._channels[serving])
                interference_by_channel[own_channel, user] -= contribution[serving, user]
        interference_by_channel = np.maximum(interference_by_channel, 0.0)

        sinr_values = np.zeros(n_users)
        capacity = np.zeros(n_users)
        serving_interference = np.zeros(n_users)
        serving_gain = np.zeros(n_users)

        others = [
            np.array([j for j in range(n_stations) if j != station], dtype=int)
            for station in range(n_stations)
        ]

        for user in range(n_users):
            serving = int(self._user_station[user])
            serving_gain[user] = gains[serving, user]
            channel = int(self._channels[serving])
            if not transmitting[serving]:
                # Dead (or not-yet-acted) station: there is no serving link at
                # all, so this user's SINR, capacity and *reported serving
                # interference* are all exactly zero.  Reporting zero rather
                # than "whatever is happening on the channel my dead station
                # nominally picked" is deliberate: a failed station's action is
                # ignored, and it must therefore be unable to influence the
                # team reward through a phantom channel choice.  The full
                # per-channel interference field is still published in
                # global_state() for the lab to draw.
                continue
            interferers = others[serving]
            mask = (
                transmitting[interferers] & (self._channels[interferers] == channel)
            ).astype(float)
            user_sinr = physics.sinr(
                serving_power=float(powers[serving]),
                serving_gain=float(gains[serving, user]),
                interferer_powers=powers[interferers],
                interferer_gains=gains[interferers, user],
                same_channel_mask=mask,
                noise_power=float(self._channel_noise[channel]),
            )
            sinr_values[user] = user_sinr
            capacity[user] = physics.shannon_rate(user_sinr, bandwidth=config.bandwidth)
            serving_interference[user] = float(
                physics.total_interference(
                    powers[interferers], gains[interferers, user], mask
                )
            )

        served = (
            np.minimum(capacity, self._demands) if config.demand_limited else capacity
        )
        satisfaction = np.where(
            self._demands > 0.0, np.minimum(1.0, capacity / np.maximum(self._demands, 1e-12)), 1.0
        )

        # What each station measures on each channel: the interference its own
        # users report, averaged, expressed in noise-floor units.
        measured_inr = np.zeros((n_stations, config.n_channels))
        for station in range(n_stations):
            own = self._station_user_indices[station]
            if own.size == 0:
                continue
            measured_inr[station] = np.mean(
                interference_by_channel[:, own], axis=1
            ) / float(config.noise_power)

        return {
            "gains": gains,
            "powers": powers,
            "transmitting": transmitting,
            "interference_by_channel": interference_by_channel,
            "sinr": sinr_values,
            "capacity": capacity,
            "served": served,
            "satisfaction": satisfaction,
            "serving_interference": serving_interference,
            "serving_gain": serving_gain,
            "measured_inr": measured_inr,
        }

    def _has_acted_mask(self) -> np.ndarray:
        """Whether each station has a meaningful current action.

        Before the first :meth:`step` of an episode nobody has chosen anything,
        so nobody transmits and the observed interference is genuinely zero.
        This is what makes the greedy baseline's first move a blind guess.
        """
        return np.full(self.config.n_base_stations, self._has_acted, dtype=bool)

    def _build_messages(self, outcome: dict[str, Any]) -> tuple[np.ndarray, int]:
        """Build this step's rule-based messages and count what was transmitted.

        Returns
        -------
        tuple[numpy.ndarray, int]
            A ``(receiver, sender, 1 + MAX_MESSAGE_BITS)`` array of received
            messages, and the number of messages transmitted (which includes
            messages that were dropped in transit, because the sender spent the
            bits regardless).
        """
        config = self.config
        n_stations = config.n_base_stations
        received = np.zeros((n_stations, n_stations, 1 + MAX_MESSAGE_BITS))
        if not config.communication or config.bits_per_message == 0:
            return received, 0

        payloads = np.zeros((n_stations, MAX_MESSAGE_BITS))
        for station in range(n_stations):
            if not self._alive[station]:
                continue  # a failed station cannot talk
            own = self._station_user_indices[station]
            channel = int(self._channels[station])
            own_inr = (
                float(outcome["measured_inr"][station, channel]) if own.size else 0.0
            )
            own_demand = float(np.mean(self._demands[own])) if own.size else 0.0
            payloads[station, 0] = float(own_inr > config.interference_alert_threshold)
            payloads[station, 1] = float(own_demand > config.demand_mean)
            payloads[station, 2] = float((channel >> 1) & 1)
            payloads[station, 3] = float(channel & 1)
        # Truncate to the configured bandwidth: bits beyond it are never sent.
        payloads[:, config.bits_per_message :] = 0.0

        transmitted = 0
        for sender in range(n_stations):
            if not self._alive[sender]:
                continue
            for receiver in range(n_stations):
                if receiver == sender or not self._alive[receiver]:
                    continue
                transmitted += 1
                if config.comm_dropout_probability > 0.0 and (
                    self._rng.random() < config.comm_dropout_probability
                ):
                    continue  # lost in transit; bits already paid for
                received[receiver, sender, 0] = 1.0
                received[receiver, sender, 1:] = payloads[sender]
        return received, transmitted

    def step(
        self,
        actions: Mapping[str, int],
    ) -> tuple[
        dict[str, np.ndarray],
        dict[str, float],
        dict[str, bool],
        dict[str, bool],
        dict[str, dict[str, Any]],
    ]:
        """Advance the environment by one timestep.

        All agents act simultaneously.  Order of operations within a step:

        1. validate and decode every agent's action,
        2. apply any scheduled base-station failure,
        3. move users (if mobility is on) and advance the demand process,
        4. evaluate the physics for the resulting joint action,
        5. build this step's rule-based messages,
        6. compute the shared team reward,
        7. build the next observations, whose interference block reflects the
           step just taken -- i.e. it is one step stale by the time it is acted
           on.

        Parameters
        ----------
        actions:
            ``{agent_name: action_index}`` with one entry per agent.  Actions of
            failed stations are accepted and ignored.

        Returns
        -------
        tuple
            ``(observations, rewards, terminations, truncations, infos)``, all
            keyed by agent name.  ``rewards`` gives every agent the *same* team
            reward.  ``terminations`` is always ``False``; the episode ends by
            truncation at ``config.max_steps``.  Every agent's ``infos`` entry
            carries the full team metrics under ``"team_metrics"`` plus the
            reward breakdown under ``"reward_terms"``, and the agent's own
            channel/power under ``"channel"`` / ``"power_level"``.
        """
        indices = self._validate_actions(actions)
        for station in range(self.config.n_base_stations):
            channel, power_level = decode_action(
                int(indices[station]),
                n_channels=self.config.n_channels,
                n_power_levels=len(self.config.power_levels),
            )
            self._channels[station] = channel
            self._powers[station] = power_level
        self._has_acted = True

        # Scheduled mid-episode failure, applied before the physics so that the
        # step in which a station dies already reflects its silence.
        if (
            self.config.failed_stations
            and self.config.failure_step is not None
            and self._step_count >= self.config.failure_step
            and bool(np.any(self._alive[list(self.config.failed_stations)]))
        ):
            self._alive[list(self.config.failed_stations)] = False
            self._apply_failure_mode()

        self._move_users()
        self._advance_demands()

        outcome = self._compute_link_outcome()
        received, messages_sent = self._build_messages(outcome)
        self._received_messages = received
        self._measured_inr = outcome["measured_inr"]

        communication_bits = metrics_module.communication_overhead(
            messages_sent, self.config.bits_per_message
        )
        reward, reward_terms = compute_team_reward(
            served_rates=outcome["served"],
            interference=outcome["serving_interference"],
            communication_bits=communication_bits,
            noise_power=self.config.noise_power,
            weights=self.config.reward_weights,
        )

        self._step_count += 1
        truncated = self._step_count >= self.config.max_steps

        team_metrics = self._team_metrics(
            outcome, messages_sent, communication_bits, reward, reward_terms
        )
        self._last_outcome = {
            **outcome,
            "team_metrics": team_metrics,
            "messages_sent": messages_sent,
            "communication_bits": communication_bits,
            "reward": reward,
            "reward_terms": reward_terms,
        }

        observations = self._all_observations()
        rewards = {agent: float(reward) for agent in self.agents}
        terminations = {agent: False for agent in self.agents}
        truncations = {agent: bool(truncated) for agent in self.agents}
        infos: dict[str, dict[str, Any]] = {}
        for agent in self.agents:
            station = self.agent_index(agent)
            infos[agent] = {
                "channel": int(self._channels[station]),
                "power_level": int(self._powers[station]),
                "power": float(outcome["powers"][station]),
                "operational": bool(self._alive[station]),
                "own_user_indices": self._station_user_indices[station].tolist(),
                "own_served_rates": outcome["served"][
                    self._station_user_indices[station]
                ].tolist(),
                "reward_terms": dict(reward_terms),
                "team_metrics": team_metrics,
            }
        return observations, rewards, terminations, truncations, infos

    # ----------------------------------------------------------------- metrics
    def _team_metrics(
        self,
        outcome: dict[str, Any],
        messages_sent: int,
        communication_bits: float,
        reward: float,
        reward_terms: Mapping[str, float],
    ) -> dict[str, Any]:
        """Assemble the full metric block reported to every agent each step."""
        served = np.asarray(outcome["served"], dtype=float)
        capacity = np.asarray(outcome["capacity"], dtype=float)
        interference = np.asarray(outcome["serving_interference"], dtype=float)
        return {
            "step": int(self._step_count),
            "total_throughput": metrics_module.total_throughput(served),
            "mean_throughput": metrics_module.mean_throughput(served),
            "worst_user_throughput": metrics_module.worst_user_throughput(served),
            "jain_fairness": metrics_module.jain_fairness(served),
            "jain_fairness_satisfaction": metrics_module.jain_fairness(
                outcome["satisfaction"]
            ),
            "total_capacity": metrics_module.total_throughput(capacity),
            "total_demand": float(np.sum(self._demands)),
            "mean_satisfaction": float(np.mean(outcome["satisfaction"])),
            "total_interference": float(np.sum(interference)),
            "mean_interference_to_noise": float(
                np.mean(interference) / float(self.config.noise_power)
            ),
            "messages_sent": int(messages_sent),
            "bits_per_message": int(self.config.bits_per_message),
            "communication_overhead_bits": float(communication_bits),
            "n_users": int(self.n_users),
            "n_unserved_users": int(np.sum(served <= 0.0)),
            "n_operational_stations": int(np.sum(self._alive)),
            "channel_occupancy": [
                int(np.sum(outcome["transmitting"] & (self._channels == channel)))
                for channel in range(self.config.n_channels)
            ],
            "n_colliding_stations": int(
                sum(
                    count
                    for count in (
                        int(np.sum(outcome["transmitting"] & (self._channels == channel)))
                        for channel in range(self.config.n_channels)
                    )
                    if count > 1
                )
            ),
            "reward": float(reward),
            "reward_terms": dict(reward_terms),
        }

    def metrics(self) -> dict[str, Any]:
        """Team metrics from the most recent :meth:`step`.

        Returns an empty dict before the first step of an episode, since no
        joint action has been evaluated yet.
        """
        return dict(self._last_outcome.get("team_metrics", {}))

    # ------------------------------------------------------------ observations
    def observe(self, agent: str) -> np.ndarray:
        """The local, partial observation of one agent.

        See :class:`ObservationLayout` for the exact vector layout.  Everything
        in here is information the station could plausibly have: its own users'
        demands and channel gains, interference its own users reported, its own
        last action, whether it is up, the clock, and messages neighbours chose
        to send.  Nothing about another station's users, channel or power leaks
        in except through a message.
        """
        self._check_agent_name(agent)
        station = self.agent_index(agent)
        config = self.config
        layout = self._layout
        observation = np.zeros(layout.size, dtype=np.float32)

        own = self._station_user_indices[station]
        n_own = min(own.size, layout.max_users_per_station)
        if n_own:
            selected = own[:n_own]
            observation[layout.demand.start : layout.demand.start + n_own] = (
                self._demands[selected] / max(config.demand_max, 1e-12)
            )
            observation[layout.user_mask.start : layout.user_mask.start + n_own] = 1.0
            distances = np.array(
                [
                    physics.euclidean_distance(
                        self._station_positions[station], self._user_positions[user]
                    )
                    for user in selected
                ]
            )
            gains = np.asarray(
                physics.channel_gain(
                    distances,
                    epsilon=config.path_loss_epsilon,
                    alpha=config.path_loss_exponent,
                ),
                dtype=float,
            )
            observation[
                layout.serving_gain.start : layout.serving_gain.start + n_own
            ] = gains / self._max_gain

        observation[layout.interference] = self._measured_inr[station]
        quality = float(config.noise_power) / (
            self._channel_noise + self._measured_inr[station] * float(config.noise_power)
        )
        observation[layout.channel_quality] = quality

        if self._has_acted:
            observation[layout.previous_channel.start + int(self._channels[station])] = 1.0
            observation[layout.previous_power.start + int(self._powers[station])] = 1.0

        observation[layout.operational] = 1.0 if self._alive[station] else 0.0
        observation[layout.time] = self._step_count / float(config.max_steps)

        if layout.n_message_slots:
            slot = 0
            for sender in range(config.n_base_stations):
                if sender == station:
                    continue
                if slot >= layout.n_message_slots:
                    break
                observation[layout.message_slice(slot)] = self._received_messages[
                    station, sender
                ]
                slot += 1
        return observation

    def _all_observations(self) -> dict[str, np.ndarray]:
        return {agent: self.observe(agent) for agent in self.agents}

    # ------------------------------------------------------------ global state
    def global_state(self) -> dict[str, Any]:
        """The full environment state -- **not** available to a decentralized policy.

        This method exists for exactly two legitimate uses:

        1. **Centralized training.**  In centralized-training /
           decentralized-execution methods (a centralized critic, a mixing
           network) the *learner* may use global state while the *actors* may
           not.  Reading it here is fine; feeding it into
           :meth:`~wireless_env.baselines.Policy.act` is not.
        2. **The lab's global view**, which shows students exactly what the
           agents cannot see.

        If a baseline or a policy calls this to choose an action, it is not a
        decentralized policy any more, and any comparison against one is
        meaningless.  Say so in your write-up if you do it.

        Returns
        -------
        dict
            JSON-serializable primitives only (lists, floats, ints, bools), so
            it can be handed straight to the browser lab.
        """
        outcome = self._last_outcome
        state: dict[str, Any] = {
            "config_name": self.config.name,
            "step": int(self._step_count),
            "max_steps": int(self.config.max_steps),
            "n_channels": int(self.config.n_channels),
            "area_size": float(self.config.area_size),
            "noise_power": float(self.config.noise_power),
            "channel_noise": self._channel_noise.tolist(),
            "station_positions": self._station_positions.tolist(),
            "station_operational": self._alive.tolist(),
            "station_channels": self._channels.tolist() if self._has_acted else [],
            "station_power_levels": self._powers.tolist() if self._has_acted else [],
            "station_powers": [
                float(self.config.power_levels[self._powers[station]])
                if (self._has_acted and self._alive[station])
                else 0.0
                for station in range(self.config.n_base_stations)
            ],
            "user_positions": self._user_positions.tolist(),
            "user_station": self._user_station.tolist(),
            "user_demands": self._demands.tolist(),
            "station_user_indices": [
                indices.tolist() for indices in self._station_user_indices
            ],
            "has_acted": bool(self._has_acted),
        }
        if outcome:
            state.update(
                {
                    "user_sinr": np.asarray(outcome["sinr"]).tolist(),
                    "user_capacity": np.asarray(outcome["capacity"]).tolist(),
                    "user_served_rate": np.asarray(outcome["served"]).tolist(),
                    "user_satisfaction": np.asarray(outcome["satisfaction"]).tolist(),
                    "user_interference": np.asarray(
                        outcome["serving_interference"]
                    ).tolist(),
                    "interference_by_channel": np.asarray(
                        outcome["interference_by_channel"]
                    ).tolist(),
                    "messages": self._received_messages.tolist(),
                    "messages_sent": int(outcome["messages_sent"]),
                    "communication_bits": float(outcome["communication_bits"]),
                    "reward": float(outcome["reward"]),
                    "reward_terms": dict(outcome["reward_terms"]),
                    "metrics": dict(outcome["team_metrics"]),
                }
            )
        return state

    def global_state_vector(self) -> np.ndarray:
        """Flat global state for a centralized critic.

        Layout, concatenated in this order:

        1. station positions, scaled by ``area_size``            (2 per station)
        2. station operational flags                             (1 per station)
        3. station channel one-hots                              (C per station)
        4. station power level one-hots                          (P per station)
        5. user positions, scaled by ``area_size``               (2 per user)
        6. user demand / ``demand_max``                          (1 per user)
        7. user served rate from the last step                   (1 per user)
        8. normalized timestep                                   (1)

        The user block has a fixed width of
        ``n_base_stations * max_users_per_station`` slots, zero-padded, so the
        vector length is stable across topology draws.

        Same warning as :meth:`global_state`: for centralized *training* only.
        """
        config = self.config
        area = float(config.area_size)
        n_stations = config.n_base_stations
        max_users = n_stations * config.max_users_per_station

        parts: list[np.ndarray] = [
            (self._station_positions / area).reshape(-1),
            self._alive.astype(float),
        ]
        channel_onehot = np.zeros((n_stations, config.n_channels))
        power_onehot = np.zeros((n_stations, len(config.power_levels)))
        if self._has_acted:
            channel_onehot[np.arange(n_stations), self._channels] = 1.0
            power_onehot[np.arange(n_stations), self._powers] = 1.0
        parts.extend([channel_onehot.reshape(-1), power_onehot.reshape(-1)])

        user_positions = np.zeros((max_users, 2))
        user_demand = np.zeros(max_users)
        user_rate = np.zeros(max_users)
        n_users = min(self.n_users, max_users)
        user_positions[:n_users] = self._user_positions[:n_users] / area
        user_demand[:n_users] = self._demands[:n_users] / max(config.demand_max, 1e-12)
        if self._last_outcome:
            served = np.asarray(self._last_outcome["served"], dtype=float)
            user_rate[:n_users] = served[:n_users]
        parts.extend(
            [
                user_positions.reshape(-1),
                user_demand,
                user_rate,
                np.array([self._step_count / float(config.max_steps)]),
            ]
        )
        return np.concatenate(parts).astype(np.float32)

    # ------------------------------------------------------------------ render
    def render(self, mode: str = "text") -> str:
        """A compact text picture of the current state, for notebooks and tests.

        Returns the rendered string (and does not print it), so a caller can
        log it, assert on it, or drop it into a notebook cell.
        """
        if mode != "text":
            raise ValueError(
                f"Unsupported render mode {mode!r}; this environment renders only "
                "'text'. The rich visualization is the Three.js lab, which consumes "
                "global_state()."
            )
        lines = [
            f"{self.config.name}  step {self._step_count}/{self.config.max_steps}  "
            f"users={self.n_users}  stations up={int(np.sum(self._alive))}"
            f"/{self.config.n_base_stations}"
        ]
        for station in range(self.config.n_base_stations):
            status = "up  " if self._alive[station] else "DOWN"
            if self._has_acted:
                channel = int(self._channels[station])
                power = POWER_LABELS[int(self._powers[station])]
                action = f"ch={channel} pw={power:<6}"
            else:
                action = "ch=- pw=-     "
            own = self._station_user_indices[station]
            demands = " ".join(f"{self._demands[user]:4.1f}" for user in own)
            lines.append(
                f"  bs_{station} [{status}] {action} users={own.size} demand=[{demands}]"
            )
        team = self.metrics()
        if team:
            lines.append(
                "  team: throughput={total_throughput:6.2f}  fairness={jain_fairness:5.3f}"
                "  worst={worst_user_throughput:5.2f}  INR={mean_interference_to_noise:6.2f}"
                "  bits={communication_overhead_bits:5.1f}  reward={reward:6.3f}".format(
                    **team
                )
            )
        return "\n".join(lines)

    def close(self) -> None:
        """No-op, present for API shape (there is nothing to release)."""
        return None
