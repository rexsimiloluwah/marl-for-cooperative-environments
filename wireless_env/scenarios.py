"""Named deployment scenarios for the cooperative wireless task.

Every constructor here returns a
:class:`~wireless_env.environment.WirelessConfig` -- a *declarative* description
of a deployment, with no side effects and no simulation.  Hand one to
:class:`~wireless_env.environment.CooperativeWirelessEnv` and you get that
deployment.

The seven scenarios in :data:`EVALUATION_SUITE` are exactly the evaluation list
the teaching package's final project requires:

======  ============================  ==============================================
#       scenario                      what it tests pedagogically
======  ============================  ==============================================
1       ``familiar_topology``         the training distribution -- the reference
                                      score everything else is compared against
2       ``unseen_topology``           did the agents learn a *coordination
                                      strategy*, or memorize one fixed allocation
                                      pattern for one geometry?
3       ``traffic_surge``             does the policy still coordinate when demand
                                      stops being the binding constraint and
                                      capacity does?
4       ``noisy_channel``             can the team abandon a channel that has
                                      silently become bad, or does it keep using
                                      it because it always did?
5       ``base_station_failure``      can the survivors reorganize when a teammate
                                      disappears mid-episode?
6       ``new_base_station_joins``    can the team absorb an agent it has never
                                      seen, when there are now more stations than
                                      channels and orthogonality is impossible?
7       ``reduced_communication``     how much of the performance was really
                                      *coordination*, and how much was a
                                      communication channel that has now degraded?
======  ============================  ==============================================

Three auxiliary scenarios (``communication_off``, ``communication_on``,
``varied_topology_training``) are provided for the COMMUNICATE chapter's on/off
comparison and for the "fixed versus varied topology" training choice.  They
are not part of the evaluation suite.

Composing scenarios
-------------------
Every constructor accepts ``**overrides`` that are applied to the config it
builds, so scenarios compose without any new machinery::

    # traffic surge *and* a dead station, with a longer episode
    from wireless_env import scenarios
    config = scenarios.traffic_surge(
        failed_stations=(2,), failure_step=10, max_steps=100)

A note on honesty: these scenarios define *conditions*, not results.  Naming a
scenario "unseen" does not by itself demonstrate that any policy generalizes or
fails to; that requires actually running it and reporting the numbers.
"""

from __future__ import annotations

import math
from collections.abc import Callable, Mapping
from typing import Any

from .environment import WirelessConfig

__all__ = [
    "DEFAULT_STATION_POSITIONS",
    "familiar_topology",
    "unseen_topology",
    "traffic_surge",
    "noisy_channel",
    "base_station_failure",
    "new_base_station_joins",
    "reduced_communication",
    "communication_off",
    "communication_on",
    "varied_topology_training",
    "SCENARIOS",
    "EVALUATION_SUITE",
    "make_scenario",
    "describe_suite",
]


def _triangle_positions(
    n_stations: int = 3,
    area_size: float = 10.0,
    radius_fraction: float = 0.3,
) -> tuple[tuple[float, float], ...]:
    """Station coordinates on a circle, first station at the top.

    For ``n_stations = 3`` this is the equilateral triangle of the default
    deployment.  Spelled out here (rather than only inside the environment) so
    that scenarios which *extend* the default deployment -- notably
    :func:`new_base_station_joins` -- can keep the original three stations
    exactly where they were and add to them.
    """
    centre = area_size / 2.0
    radius = radius_fraction * area_size
    return tuple(
        (
            centre + radius * math.cos(math.pi / 2.0 + 2.0 * math.pi * k / n_stations),
            centre + radius * math.sin(math.pi / 2.0 + 2.0 * math.pi * k / n_stations),
        )
        for k in range(n_stations)
    )


#: The default three-station equilateral triangle, as explicit coordinates.
DEFAULT_STATION_POSITIONS: tuple[tuple[float, float], ...] = _triangle_positions()


# --------------------------------------------------------------------------- #
# 1. Familiar topology
# --------------------------------------------------------------------------- #


def familiar_topology(**overrides: Any) -> WirelessConfig:
    """The training / familiar deployment: three stations, three channels.

    Pedagogically this is the **control condition**.  Every other scenario is
    read as a difference from this one, so it must be boring and stable: fixed
    equilateral-triangle station positions, a topology that does not change
    between episodes (``regenerate_topology_on_reset=False``), no mobility, no
    failures, no extra noise, communication off.

    It is also the scenario in which ``n_base_stations <= n_channels``, so a
    perfectly orthogonal allocation exists.  That makes
    :class:`~wireless_env.baselines.FixedOrthogonalPolicy` a computable
    reference ceiling here, which is what lets a student see how far short
    random and greedy fall without needing any trained policy at all.
    """
    return WirelessConfig(
        name="familiar_topology",
        description=(
            "Familiar deployment: 3 base stations on an equilateral triangle, "
            "3 channels, 2-4 users each, static topology, no communication. The "
            "reference condition for every other scenario."
        ),
        n_base_stations=3,
        n_channels=3,
        station_positions=DEFAULT_STATION_POSITIONS,
        station_layout="triangle",
        regenerate_topology_on_reset=False,
        communication=False,
        seed=0,
    ).replace(**overrides)


# --------------------------------------------------------------------------- #
# 2. Unseen topology
# --------------------------------------------------------------------------- #


def unseen_topology(**overrides: Any) -> WirelessConfig:
    """A deployment geometry the agents were never trained on.

    The three stations are **clustered into one quadrant** instead of spread
    over the map, drawn from a different seed.  This is a genuine deployment
    shift, not merely a reseed of the same layout: mutual channel gains between
    stations are far higher, so a collision hurts much more, and the *relative*
    value of the three channels changes.

    This is the sharpest test of the chapter's central question -- "did the
    agents learn a fixed allocation pattern, or a coordination strategy?" -- for
    a specific reason.  On the familiar triangle, the pattern "station 0 takes
    channel 0, station 1 takes channel 1, station 2 takes channel 2" is optimal
    and can be memorized without any coordination at all.  That memorized
    pattern still happens to be orthogonal here, so a policy that memorized it
    will do *fine*; a policy that learned to key its channel choice off
    *positions* or off stale interference measurements may well do worse.  Read
    the result carefully: this scenario can reward memorization, and noticing
    that is part of the lesson.
    """
    return WirelessConfig(
        name="unseen_topology",
        description=(
            "Unseen deployment: 3 stations clustered into one quadrant (drawn "
            "from a different seed), so mutual interference is much stronger "
            "than on the familiar triangle."
        ),
        n_base_stations=3,
        n_channels=3,
        station_positions=None,
        station_layout="cluster",
        user_radius=2.0,
        regenerate_topology_on_reset=False,
        communication=False,
        seed=101,
    ).replace(**overrides)


# --------------------------------------------------------------------------- #
# 3. Traffic surge
# --------------------------------------------------------------------------- #


def traffic_surge(**overrides: Any) -> WirelessConfig:
    """Demand jumps and turns bursty on the familiar topology.

    Mean demand rises, the demand process gets more volatile, and each user has
    a 20% chance per step of a burst that doubles its demand.

    Why this changes the *coordination* problem and not just the numbers: with
    ``demand_limited=True`` a user's delivered rate is ``min(capacity,
    demand)``.  Under light traffic, demand is the binding constraint, so a
    sloppy allocation that still delivers more capacity than anyone asked for
    looks perfectly fine.  Under a surge, **capacity becomes the binding
    constraint everywhere at once**, and every wasted decibel of interference
    turns directly into lost throughput.  A policy tuned in the demand-limited
    regime can therefore look excellent and then fail exactly when the network
    is busiest -- which is when operators care.
    """
    return familiar_topology(
        name="traffic_surge",
        description=(
            "Traffic surge on the familiar topology: higher mean demand, higher "
            "volatility and a 20% per-step chance of a demand burst, so capacity "
            "rather than demand becomes the binding constraint."
        ),
        demand_mean=7.0,
        demand_min=3.0,
        demand_max=14.0,
        demand_volatility=1.5,
        burst_probability=0.2,
        burst_multiplier=2.0,
        seed=202,
    ).replace(**overrides)


# --------------------------------------------------------------------------- #
# 4. Noisy channel
# --------------------------------------------------------------------------- #


def noisy_channel(**overrides: Any) -> WirelessConfig:
    """Channel 2 becomes badly noisy while channels 0 and 1 stay clean.

    Implemented as extra additive noise on one channel
    (``channel_extra_noise=(0.0, 0.0, 30 * noise_power)``), which raises that
    channel's noise floor by roughly 15 dB.  No fading stack, no interference
    model change -- just a worse denominator in the SINR for anyone who uses
    it.

    The pedagogy: a station can *detect* this, because the observation's
    ``channel_quality`` block is computed from the per-channel noise floor and
    so drops on the bad channel.  But there are three stations and now only two
    good channels, so detection is not enough -- somebody has to accept the bad
    channel, or two stations have to share a good one.  That is a genuine
    cooperative bargaining problem with no symmetric solution, and it is the
    cleanest small example in the package of why a *shared* reward and a
    *fair* outcome can pull in different directions.
    """
    base = familiar_topology()
    return familiar_topology(
        name="noisy_channel",
        description=(
            "Channel 2 has 30x the base noise power; channels 0 and 1 are clean. "
            "Three stations must now share two good channels."
        ),
        channel_extra_noise=(0.0, 0.0, 30.0 * base.noise_power),
        seed=303,
    ).replace(**overrides)


# --------------------------------------------------------------------------- #
# 5. Base-station failure
# --------------------------------------------------------------------------- #


def base_station_failure(**overrides: Any) -> WirelessConfig:
    """Station 2 dies after ten healthy steps and stays dead.

    Precisely: ``failure_step=10``, so the ten steps the metrics label 1..10
    run with all three stations up, and from the step labelled 11 onwards
    station 2 is silent.

    Two things happen at once, and separating them is the exercise:

    1. **The interference environment gets easier.**  One transmitter is gone,
       so a channel that was crowded may now be free.  A policy that keeps
       avoiding it is leaving throughput on the table.
    2. **Station 2's users get nothing.**  With the default
       ``failure_mode="orphan"`` they stay associated with the dead station and
       are served at rate 0, and they remain in every metric.  Total throughput
       falls, and Jain fairness falls hard, because a few users at exactly zero
       is the most unequal thing that can happen to an allocation.

    That second effect is unavoidable in this model -- there is no handover, so
    the surviving agents genuinely cannot rescue those users.  The reward
    therefore takes a permanent level drop at step 10 that no policy can
    recover, and a student reading a reward curve needs to know that so they
    do not attribute the drop to bad coordination.  What *is* attributable to
    coordination is the residual: how well the two survivors exploit the freed
    spectrum.  Compare ``mean_throughput`` over the *surviving* stations' users,
    not the network total, when you want to isolate it.

    Set ``failure_mode="reassign"`` to re-associate the orphaned users with the
    nearest live station instead.  That is a crude stand-in for coverage
    recovery, not a handover protocol, and it is off by default.
    """
    return familiar_topology(
        name="base_station_failure",
        description=(
            "Base station 2 fails at step 10 and stays down. Its users are "
            "orphaned (no handover in this model); the survivors gain free "
            "spectrum but lose a teammate."
        ),
        failed_stations=(2,),
        failure_step=10,
        failure_mode="orphan",
        max_steps=30,
        seed=404,
    ).replace(**overrides)


# --------------------------------------------------------------------------- #
# 6. New base station joins
# --------------------------------------------------------------------------- #


def new_base_station_joins(**overrides: Any) -> WirelessConfig:
    """A fourth station appears in the middle of the familiar triangle.

    The original three stations stay exactly where they were -- this scenario
    reuses :data:`DEFAULT_STATION_POSITIONS` and appends one station at the
    centre of the map -- so the change a student sees is purely *additive*, and
    it is visually unmistakable in the lab: a new tower lights up right between
    the existing three, its coverage overlapping all of them.

    This is the hardest scenario in the suite, for a structural reason worth
    stating explicitly to students: there are now **four stations and three
    channels**, so no orthogonal allocation exists.  Somebody *must* share.
    The question stops being "can you find the collision-free assignment" and
    becomes "can you choose which collision to accept" -- a policy that only
    ever learned to avoid collisions has no answer at all.

    ``max_base_stations=4`` is set so the observation reserves message slots for
    four stations.  To evaluate one policy on both the familiar and the joined
    deployment without a shape mismatch, build the familiar config with the
    same padding::

        familiar = scenarios.familiar_topology(max_base_stations=4)
        joined = scenarios.new_base_station_joins()
        # both configs now imply the same observation dimension

    Without that padding the two observation vectors have different widths,
    because the message block grows with the number of neighbours.  That is not
    a bug to hide: variable numbers of teammates really do break fixed-width
    policies, and the honest fixes (pad to a maximum, or use a
    permutation-invariant encoder) are both good exercises.
    """
    area = 10.0
    positions = DEFAULT_STATION_POSITIONS + ((area / 2.0, area / 2.0),)
    return familiar_topology(
        name="new_base_station_joins",
        description=(
            "A fourth base station joins at the centre of the familiar triangle. "
            "Four stations, three channels: no orthogonal allocation exists."
        ),
        n_base_stations=4,
        n_channels=3,
        station_positions=positions,
        max_base_stations=4,
        seed=505,
    ).replace(**overrides)


# --------------------------------------------------------------------------- #
# 7. Reduced communication
# --------------------------------------------------------------------------- #


def reduced_communication(**overrides: Any) -> WirelessConfig:
    """Communication survives but degrades: 4 bits become 1, and a quarter are lost.

    This is the counterfactual for any claim of the form "communication helped".
    A team that reaches good throughput with a 4-bit channel might be genuinely
    coordinating through it, or might merely have grown dependent on it.  Cut
    the payload to a single bit and drop 25% of messages in transit and the two
    cases separate.

    Note the cost accounting: a dropped message still costs its bits, because
    the sender spent them.  So degraded communication is strictly worse than no
    communication *at that bandwidth* -- you pay and get nothing. Students
    should check the ``communication_overhead_bits`` metric and confirm they
    understand why it does not fall when messages start being lost.
    """
    return familiar_topology(
        name="reduced_communication",
        description=(
            "Communication degraded: 1-bit messages instead of 4, with a 25% "
            "in-transit drop rate. Dropped messages still cost their bits."
        ),
        communication=True,
        bits_per_message=1,
        comm_dropout_probability=0.25,
        seed=606,
    ).replace(**overrides)


# --------------------------------------------------------------------------- #
# Auxiliary scenarios (not part of the evaluation suite)
# --------------------------------------------------------------------------- #


def communication_off(**overrides: Any) -> WirelessConfig:
    """Familiar topology with communication switched off.

    The "before" half of the COMMUNICATE chapter's central comparison.  Agents
    see only their own users and their own stale interference measurements; the
    message block of the observation is all zeros, and
    ``communication_overhead_bits`` is exactly 0.
    """
    return familiar_topology(
        name="communication_off",
        description="Familiar topology, communication disabled (0 bits sent).",
        communication=False,
        bits_per_message=0,
    ).replace(**overrides)


def communication_on(**overrides: Any) -> WirelessConfig:
    """Familiar topology with the full 4-bit rule-based message enabled.

    The "after" half of the comparison.  Each live station broadcasts a 4-bit
    message to every other live station each step: a high-interference alert, a
    high-demand alert, and its current channel index in two bits (the ``00``,
    ``01``, ``10``, ``11`` symbols the lab visualizes).

    **These semantics are hand-designed and rule-based, not learned.**  The
    package contains no trained communication policy, and nothing built on this
    scenario may describe these bits as emergent or learned semantics.
    """
    return familiar_topology(
        name="communication_on",
        description=(
            "Familiar topology with the full 4-bit rule-based message protocol "
            "enabled (interference alert, demand alert, 2-bit channel id)."
        ),
        communication=True,
        bits_per_message=4,
    ).replace(**overrides)


def varied_topology_training(**overrides: Any) -> WirelessConfig:
    """Randomized deployments and mobile users -- the diversity-training regime.

    Every seedless ``reset()`` redraws station positions (random layout with a
    minimum separation), user counts and user positions, and users drift during
    the episode.  This is the "varied topology" side of the fixed-versus-varied
    training choice: it is a harder training signal, and it is the standard
    move when you want a policy that survives :func:`unseen_topology`.

    It is deliberately *not* in the evaluation suite.  Training on a
    distribution and then evaluating on the same distribution measures nothing
    about generalization.
    """
    return WirelessConfig(
        name="varied_topology_training",
        description=(
            "Randomized station layout redrawn every reset, plus user mobility. "
            "A training regime, not an evaluation scenario."
        ),
        n_base_stations=3,
        n_channels=3,
        station_layout="random",
        station_positions=None,
        regenerate_topology_on_reset=True,
        user_mobility=True,
        user_speed=0.3,
        communication=False,
        seed=707,
    ).replace(**overrides)


# --------------------------------------------------------------------------- #
# Registry
# --------------------------------------------------------------------------- #

#: Every named scenario, by name.
SCENARIOS: dict[str, Callable[..., WirelessConfig]] = {
    "familiar_topology": familiar_topology,
    "unseen_topology": unseen_topology,
    "traffic_surge": traffic_surge,
    "noisy_channel": noisy_channel,
    "base_station_failure": base_station_failure,
    "new_base_station_joins": new_base_station_joins,
    "reduced_communication": reduced_communication,
    "communication_off": communication_off,
    "communication_on": communication_on,
    "varied_topology_training": varied_topology_training,
}

#: The seven-scenario evaluation suite required by the final project, in order.
#: ``familiar_topology`` is first because it is the reference every
#: generalization gap is measured against.
EVALUATION_SUITE: tuple[str, ...] = (
    "familiar_topology",
    "unseen_topology",
    "traffic_surge",
    "noisy_channel",
    "base_station_failure",
    "new_base_station_joins",
    "reduced_communication",
)


def make_scenario(name: str, **overrides: Any) -> WirelessConfig:
    """Build a scenario config by name.

    Parameters
    ----------
    name:
        A key of :data:`SCENARIOS`.
    overrides:
        Config fields to override, forwarded to the constructor.

    Raises
    ------
    KeyError
        With the list of valid names, if ``name`` is not a known scenario.

    Examples
    --------
    >>> make_scenario("noisy_channel").name
    'noisy_channel'
    >>> make_scenario("familiar_topology", max_steps=5).max_steps
    5
    """
    if name not in SCENARIOS:
        raise KeyError(
            f"Unknown scenario {name!r}. Known scenarios are "
            f"{sorted(SCENARIOS)}. The seven-scenario evaluation suite is "
            f"{list(EVALUATION_SUITE)}."
        )
    return SCENARIOS[name](**overrides)


def describe_suite() -> Mapping[str, str]:
    """One-line description of each evaluation-suite scenario, in suite order."""
    return {name: SCENARIOS[name]().description for name in EVALUATION_SUITE}
