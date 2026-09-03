"""
WIRELESS RESOURCE ALLOCATION

Several access points share a small number of channels. Two access points that
pick the same channel interfere, and how much they interfere depends on how far
apart they are, so a channel choice is only good or bad in combination with the
others.

WHAT MAKES THE ALLOCATION INTERESTING
Throughput is capped by each access point's own traffic demand. Capacity beyond
what an access point actually wants is wasted, so WHICH pair shares a channel
matters more than how many share. Demand is local information, which puts the
fact the best allocation depends on inside individual access points rather than
anywhere a single agent can see it.

SIMPLIFYING ASSUMPTIONS, STATED PLAINLY
This is a teaching model of interference, not a calibrated simulation.

- Access points sit at fixed 2D positions and never move.
- Interference between two access points on the same channel is a function of
  distance alone: ``coupling = 1 / (1 + (d / d0) ** 2)``.
- Channels are otherwise independent. There is no adjacent-channel leakage.
- One signal-to-interference-plus-noise ratio per access point, converted to a
  rate by Shannon's formula.
- No fading, no mobility, no protocol overhead, no user scheduling, no
  handover, no power control.

Nothing produced by this environment is a wireless engineering result.
"""

from __future__ import annotations

import itertools
import math
from typing import Any

import numpy as np
from gymnasium import spaces
from pettingzoo import ParallelEnv

#: Transmit power, shared by every access point. Power control is out of scope.
SIGNAL_POWER = 1.0
#: Receiver noise floor. Sets the interference-free rate, log2(1 + 1/0.1) = 3.46.
NOISE = 0.1
#: Distance at which two access points couple at half strength.
COUPLING_DISTANCE = 1.0
#: Coupling below this is treated as negligible when counting collisions, so
#: two distant access points sharing a channel are not called a failure.
NEGLIGIBLE_COUPLING = 0.15
#: One demand-level bit per neighbour, so a step of communication costs this.
MESSAGES_PER_STEP_PER_AGENT = 1

#: Four access points arranged as in the lab illustration: two overlapping on
#: the left, two spread out on the right. The left pair is the one that must
#: not share a channel.
DEFAULT_POSITIONS: tuple[tuple[float, float], ...] = (
    (0.0, 0.0),
    (0.7, 0.0),
    (2.6, 0.5),
    (4.0, 0.2),
)


def achievable_rate(quality: float, interference: float) -> float:
    """
    Rate in bits per symbol for one access point.

    ``interference`` is the summed coupling from every other access point on
    the same channel, so it is a continuous quantity rather than a count.
    """
    sinr = float(quality) * SIGNAL_POWER / (NOISE + float(interference))
    return math.log2(1.0 + sinr)


def observation_layout(
    n_channels: int, n_agents: int, communication: bool = False
) -> dict[str, slice]:
    """
    Named slices into an observation vector.

    Read observations through this rather than hardcoding offsets, so turning
    communication on cannot silently change what "interference" means.
    """
    k = int(n_channels)
    out = {
        "demand": slice(0, 1),
        "channel_quality": slice(1, 1 + k),
        "interference": slice(1 + k, 1 + 2 * k),
        "previous_channel": slice(1 + 2 * k, 2 + 2 * k),
    }
    if communication:
        out["messages"] = slice(2 + 2 * k, 2 + 2 * k + int(n_agents) - 1)
    return out


def _n_channels_of(observation, source) -> int:
    """
    Work out how many channels an observation describes.

    ``source`` may be the environment, an integer channel count, or None. None
    assumes the no-communication layout, where the length fixes the answer.
    Pass the environment when communication is on: the message slots make the
    length ambiguous on its own, and guessing there would silently mis-slice.
    """
    if source is None:
        length = len(observation)
        if length % 2 != 0 or length < 4:
            raise ValueError(
                f"cannot infer n_channels from an observation of length {length}. "
                "Pass the environment or the channel count as the second "
                "argument, e.g. extract_interference(obs, env)."
            )
        return (length - 2) // 2
    if isinstance(source, (int, np.integer)):
        return int(source)
    return int(source.n_channels)


def extract_demand(observation, source=None) -> float:
    """This access point's own traffic demand."""
    return float(observation[0])


def extract_channel_quality(observation, source=None) -> np.ndarray:
    """Quality of each channel as this access point measures it."""
    k = _n_channels_of(observation, source)
    return np.asarray(observation[1 : 1 + k], dtype=np.float64)


def extract_interference(observation, source=None) -> np.ndarray:
    """
    Interference this access point measured on each channel.

    It reports the PREVIOUS step, because interference is something an access
    point observes rather than something it knows in advance.
    """
    k = _n_channels_of(observation, source)
    return np.asarray(observation[1 + k : 1 + 2 * k], dtype=np.float64)


def extract_previous_channel(observation, source=None) -> int:
    """The channel this access point chose last step, or -1 on the first step."""
    k = _n_channels_of(observation, source)
    return int(observation[1 + 2 * k])


class WirelessResourceAllocationEnv(ParallelEnv):
    """
    ``n_agents`` access points choosing among ``n_channels`` channels.

    Parameters
    ----------
    n_agents, n_channels:
        Team size and how many channels they share. With more access points
        than channels somebody must share, which is the point.
    communication:
        When true, each access point broadcasts one bit about its own demand
        and receives its neighbours' bits in its observation.
    interference_weight, communication_weight:
        The two shaping terms in the team reward.
    traffic:
        Demand regime, one of ``"skewed"``, ``"uniform"`` or ``"hotspot"``.
        Demand is drawn at reset and held for the episode.
    n_steps:
        Allocation decisions per episode. More than one, because the
        interference field reports the previous step and would otherwise stay
        empty for the whole episode.
    positions:
        Fixed 2D coordinates, one per access point. Defaults to the lab layout
        for four access points, and to an evenly spaced line otherwise.
    """

    metadata = {
        "name": "wireless_resource_allocation_v0",
        "is_parallelizable": True,
        "render_modes": ["human", "ansi"],
    }

    def __init__(
        self,
        n_agents: int = 4,
        n_channels: int = 3,
        communication: bool = False,
        interference_weight: float = 0.2,
        communication_weight: float = 0.05,
        traffic: str = "skewed",
        n_steps: int = 8,
        positions: tuple[tuple[float, float], ...] | None = None,
        render_mode: str | None = None,
    ) -> None:
        super().__init__()
        if n_agents < 2:
            raise ValueError("n_agents must be at least 2")
        if n_channels < 1:
            raise ValueError("n_channels must be at least 1")
        if traffic not in {"skewed", "uniform", "hotspot"}:
            raise ValueError(f"unknown traffic regime: {traffic!r}")

        self.n_agents = int(n_agents)
        self.n_channels = int(n_channels)
        self.communication = bool(communication)
        self.interference_weight = float(interference_weight)
        self.communication_weight = float(communication_weight)
        self.traffic = traffic
        self.n_steps = int(n_steps)
        self.render_mode = render_mode

        self.possible_agents = [f"ap_{i}" for i in range(self.n_agents)]
        self.agents: list[str] = []

        self.positions = np.asarray(
            positions if positions is not None else self._default_positions(),
            dtype=np.float64,
        )
        if self.positions.shape != (self.n_agents, 2):
            raise ValueError(f"positions must have shape ({self.n_agents}, 2)")
        self.coupling = self._coupling_matrix()

        # quality[i][c]: how good channel c is for access point i
        self.quality = np.ones((self.n_agents, self.n_channels), dtype=np.float64)
        self._forced_demand: dict[str, float] = {}
        self._message_loss = 0.0

        self._rng = np.random.default_rng()
        self.demand = np.zeros(self.n_agents, dtype=np.float64)
        self.last_actions: list[int] | None = None
        self._t = 0
        self._build_spaces()

    # ---------------------------------------------------------------- geometry

    def _default_positions(self) -> tuple[tuple[float, float], ...]:
        if self.n_agents == len(DEFAULT_POSITIONS):
            return DEFAULT_POSITIONS
        # an evenly spaced line, close enough that neighbours interfere
        return tuple((0.9 * i, 0.0) for i in range(self.n_agents))

    def _coupling_matrix(self) -> np.ndarray:
        """How strongly each pair interferes when they share a channel."""
        d = np.linalg.norm(
            self.positions[:, None, :] - self.positions[None, :, :], axis=-1
        )
        g = 1.0 / (1.0 + (d / COUPLING_DISTANCE) ** 2)
        np.fill_diagonal(g, 0.0)
        return g

    # ------------------------------------------------------- interventions
    # Every stress test in the lab goes through one of these, so a notebook
    # never has to reach into environment attributes.

    def set_traffic(self, agent: str, demand: float) -> None:
        """Pin one access point's demand. Applies from the next reset."""
        if agent not in self.possible_agents:
            raise KeyError(agent)
        if demand < 0:
            raise ValueError("demand must be non-negative")
        self._forced_demand[agent] = float(demand)

    def clear_traffic(self) -> None:
        """Undo every ``set_traffic`` call."""
        self._forced_demand = {}

    def set_message_loss(self, p: float) -> None:
        """Probability that a broadcast bit fails to reach a neighbour."""
        if not 0.0 <= p <= 1.0:
            raise ValueError("message loss must be in [0, 1]")
        self._message_loss = float(p)

    def set_channel_quality(self, agent: str, channel: int, quality: float) -> None:
        """Degrade or improve one channel for one access point."""
        if agent not in self.possible_agents:
            raise KeyError(agent)
        if not 0 <= channel < self.n_channels:
            raise IndexError(f"channel {channel} out of range")
        if quality < 0:
            raise ValueError("quality must be non-negative")
        self.quality[self.possible_agents.index(agent), int(channel)] = float(quality)

    def reset_channel_quality(self) -> None:
        """Return every channel to quality 1.0."""
        self.quality[:] = 1.0

    def set_communication(self, on: bool) -> None:
        """Turn the message channel on or off between episodes."""
        self.communication = bool(on)
        self._build_spaces()  # the observation gets longer or shorter

    # ------------------------------------------------------------------ spaces

    def _build_spaces(self) -> None:
        """
        Build the spaces once and hand back the same objects every time.

        The PettingZoo API test requires object identity, so these cannot be
        constructed per call. They are rebuilt by ``set_communication``, which
        is the only thing that changes an observation's length.
        """
        n = 2 + 2 * self.n_channels
        if self.communication:
            n += self.n_agents - 1
        box = spaces.Box(-1.0, 20.0, shape=(n,), dtype=np.float32)
        discrete = spaces.Discrete(self.n_channels)
        self._observation_spaces = dict.fromkeys(self.possible_agents, box)
        self._action_spaces = dict.fromkeys(self.possible_agents, discrete)

    def observation_space(self, agent: str) -> spaces.Space:
        return self._observation_spaces[agent]

    def action_space(self, agent: str) -> spaces.Space:
        return self._action_spaces[agent]

    def observation_layout(self) -> dict[str, slice]:
        """Named slices into this environment's observation vector."""
        return observation_layout(self.n_channels, self.n_agents, self.communication)

    # --------------------------------------------------------------- internals

    def _sample_demand(self) -> np.ndarray:
        if self.traffic == "skewed":
            heavy = self._rng.choice(self.n_agents, size=2, replace=False)
            d = np.where(np.isin(np.arange(self.n_agents), heavy), 3.2, 0.8)
        elif self.traffic == "hotspot":
            hot = self.n_agents // 2
            d = np.where(np.arange(self.n_agents) == hot, 3.4, 1.2)
        else:
            d = self._rng.choice([1.6, 2.4], size=self.n_agents)
        d = d.astype(np.float64)
        for agent, forced in self._forced_demand.items():
            d[self.possible_agents.index(agent)] = forced
        return d

    def _interference_per_channel(self, i: int) -> np.ndarray:
        """What access point i measured on each channel on the previous step."""
        seen = np.zeros(self.n_channels, dtype=np.float64)
        if self.last_actions is not None:
            for j, a in enumerate(self.last_actions):
                if j != i:
                    seen[a] += self.coupling[i, j]
        return seen

    def _obs_for(self, i: int) -> np.ndarray:
        prev = -1.0 if self.last_actions is None else float(self.last_actions[i])
        parts = [float(self.demand[i])]
        parts += [float(q) for q in self.quality[i]]
        parts += [float(v) for v in self._interference_per_channel(i)]
        parts.append(prev)
        if self.communication:
            for j in range(self.n_agents):
                if j == i:
                    continue
                bit = 1.0 if self.demand[j] >= 2.0 else 0.0
                if self._rng.random() < self._message_loss:
                    bit = 0.0  # a lost message reads as a quiet neighbour
                parts.append(bit)
        return np.asarray(parts, dtype=np.float32)

    def _observations(self) -> dict[str, np.ndarray]:
        return {a: self._obs_for(i) for i, a in enumerate(self.possible_agents)}

    def state(self) -> dict[str, Any]:
        """
        Centralized information, for centralized training and for evaluation.

        Never pass this to a decentralized agent at execution time.
        """
        return {
            "demand": self.demand.copy(),
            "quality": self.quality.copy(),
            "allocation": (
                None if self.last_actions is None else list(self.last_actions)
            ),
            "coupling": self.coupling.copy(),
            "positions": self.positions.copy(),
        }

    # ----------------------------------------------------------------- outcome

    def outcome(self, actions) -> dict[str, Any]:
        """
        Every metric for one joint action, without advancing the environment.

        Useful for reasoning about an allocation before committing to it, and
        it is what ``step`` reports in ``infos``.
        """
        chosen = [int(a) % self.n_channels for a in actions]
        interference = np.zeros(self.n_agents, dtype=np.float64)
        for i, ci in enumerate(chosen):
            for j, cj in enumerate(chosen):
                if i != j and ci == cj:
                    interference[i] += self.coupling[i, j]

        rates = np.array(
            [
                achievable_rate(self.quality[i, chosen[i]], interference[i])
                for i in range(self.n_agents)
            ]
        )
        # capacity beyond what an access point wants is wasted
        served = np.minimum(self.demand, rates)

        collisions = int(np.sum(interference > NEGLIGIBLE_COUPLING))
        messages = (
            MESSAGES_PER_STEP_PER_AGENT * self.n_agents if self.communication else 0
        )
        total_interference = float(interference.sum())
        reward = (
            float(served.sum())
            - self.interference_weight * total_interference
            - self.communication_weight * messages
        )
        return {
            "team_reward": reward,
            "total_throughput": float(served.sum()),
            "mean_throughput": float(served.mean()),
            "interference": total_interference,
            "collision_rate": collisions / self.n_agents,
            "messages_sent": messages,
            "per_ap_throughput": served.copy(),
            "per_ap_interference": interference.copy(),
            "allocation": chosen,
        }

    def _all_allocations(self):
        return itertools.product(range(self.n_channels), repeat=self.n_agents)

    def best_possible(self) -> float:
        """
        Best team reward available for the current demands.

        Exhaustive over ``n_channels ** n_agents`` allocations, which is 81 for
        the lab's four access points and three channels. It is the ceiling an
        experiment result should be read against.
        """
        return max(
            self.outcome(list(a))["team_reward"] for a in self._all_allocations()
        )

    def min_interference(self) -> float:
        """
        Interference that no allocation can avoid.

        With more access points than channels somebody must share, so raw
        interference makes every policy look equally bad. Only interference
        above this floor is a coordination failure.
        """
        return min(
            self.outcome(list(a))["interference"] for a in self._all_allocations()
        )

    # -------------------------------------------------------- ParallelEnv API

    def reset(self, seed: int | None = None, options: dict | None = None):
        if seed is not None:
            self._rng = np.random.default_rng(seed)
        self.agents = list(self.possible_agents)
        self.demand = self._sample_demand()
        self.last_actions = None
        self._t = 0
        return self._observations(), {a: {} for a in self.agents}

    def step(self, actions: dict[str, int]):
        if not self.agents:
            raise RuntimeError("call reset() before step()")

        chosen = [int(actions[a]) % self.n_channels for a in self.possible_agents]
        out = self.outcome(chosen)
        self.last_actions = chosen
        self._t += 1
        done = self._t >= self.n_steps

        rewards = {a: out["team_reward"] for a in self.agents}
        terminations = {a: done for a in self.agents}
        truncations = {a: False for a in self.agents}
        infos = {a: dict(out) for a in self.agents}
        obs = self._observations()
        if done:
            self.agents = []
        return obs, rewards, terminations, truncations, infos

    def render(self) -> str:
        """One line of text. For the picture, use ``render_wireless_network``."""
        alloc = "not set" if self.last_actions is None else str(self.last_actions)
        line = (
            f"demand={np.round(self.demand, 1).tolist()}  "
            f"allocation={alloc}  "
            f"channels={self.n_channels}  "
            f"communication={'on' if self.communication else 'off'}"
        )
        print(line)
        return line
