"""Hand-coded reference policies for the cooperative wireless task.

NONE OF THESE IS A LEARNED POLICY
---------------------------------
Everything in this module is a fixed rule written by a human.  There is no
reinforcement learning here, no trained network, no checkpoint being loaded and
no emergent behaviour.  The specification's policy progression is

    Random -> Greedy Local -> Independent RL -> Cooperative MARL
           -> MARL + Communication -> Robust / Diversity-Trained MARL

and this module implements **only the first two, plus two scheduling
references**.  The learned rungs come from real training runs elsewhere in the
project.  If you present a number from this module, present it as what it is:
the output of a hand-coded baseline on a simplified educational simulator.  Do
not label any of it "learned", "emergent" or "MARL".

Why baselines matter this much in a *teaching* package: the interesting fact
about this environment is that a locally sensible rule can be globally poor, and
you cannot show that with a trained policy, because a trained policy is a black
box that a student cannot audit.  :class:`GreedyLocalPolicy` is auditable in
four lines, and it fails in a way you can predict on paper and then watch
happen.  That is the pedagogical payload.

What each policy is for
-----------------------
=============================  ==============================================
policy                         role
=============================  ==============================================
:class:`RandomPolicy`          the floor.  Any claim of coordination has to
                               beat uniform random action selection.
:class:`GreedyLocalPolicy`     the interesting failure.  Every agent picks the
                               channel that *looked* quietest and shouts at
                               full power.  They synchronize, collide, and
                               oscillate.
:class:`RoundRobinPolicy`      a schedule, not a policy: rotate channels with
                               a per-agent offset.  Collision-free whenever
                               there are at least as many channels as
                               stations, and it spreads channel quality evenly
                               over time.
:class:`FixedOrthogonalPolicy` the reference ceiling for the default topology
                               (see its docstring for exactly when it is a
                               ceiling and when it is not).
=============================  ==============================================

Every policy exposes the same tiny interface: ``act(observations) ->
{agent: action}`` and ``reset(seed=None)``, and every one is seedable, so a
whole evaluation is reproducible from a pair of integers.
"""

from __future__ import annotations

import abc
from collections.abc import Mapping, Sequence
from typing import Any, Optional

import numpy as np

from .environment import (
    POWER_LABELS,
    CooperativeWirelessEnv,
    ObservationLayout,
    WirelessConfig,
    encode_action,
    observation_layout,
    unpack_observation,
)

__all__ = [
    "Policy",
    "RandomPolicy",
    "GreedyLocalPolicy",
    "RoundRobinPolicy",
    "FixedOrthogonalPolicy",
    "POLICIES",
    "run_episode",
    "evaluate_policy",
]


class Policy(abc.ABC):
    """Base class for a decentralized, hand-coded policy.

    The contract, which is the same contract a learned policy has to satisfy:

    * :meth:`act` receives **only** the per-agent observations the environment
      handed out.  It must not touch
      :meth:`~wireless_env.environment.CooperativeWirelessEnv.global_state`, the
      environment object, or any other agent's private state.  Every policy in
      this module honours that, and a student writing their own should too --
      the whole point of the partial-observability story collapses otherwise.
    * :meth:`act` returns one integer action per agent it was given
      observations for, and nothing else.
    * :meth:`reset` re-seeds and clears any internal counters, so two runs with
      the same seed match exactly.
    """

    #: Short human-readable name, used in results tables and plot legends.
    name: str = "policy"

    #: ``True`` only for policies produced by actual training.  Every policy in
    #: this module sets it to ``False``, and results tables should print it.
    is_learned: bool = False

    def __init__(self, config: WirelessConfig, seed: Optional[int] = None) -> None:
        self.config = config
        self._layout: ObservationLayout = observation_layout(config)
        self._n_channels = config.n_channels
        self._n_power_levels = len(config.power_levels)
        self._seed = seed
        self._rng = np.random.default_rng(seed)

    def reset(self, seed: Optional[int] = None) -> None:
        """Reset internal state and optionally re-seed.

        Call it at the start of every episode.  Passing a seed makes the whole
        episode reproducible; passing none continues the existing stream.
        """
        if seed is not None:
            self._seed = seed
            self._rng = np.random.default_rng(seed)

    @abc.abstractmethod
    def act(self, observations: Mapping[str, np.ndarray]) -> dict[str, int]:
        """Choose one action per agent from local observations alone."""

    # ------------------------------------------------------------------ helper
    def _encode(self, channel: int, power_level: int) -> int:
        """Pack a (channel, power) choice into the flat action index."""
        return encode_action(
            channel,
            power_level,
            n_channels=self._n_channels,
            n_power_levels=self._n_power_levels,
        )

    def __repr__(self) -> str:  # pragma: no cover - cosmetic
        return f"{type(self).__name__}(name={self.name!r}, seed={self._seed!r})"


class RandomPolicy(Policy):
    """Uniformly random channel and power, independently per agent per step.

    The floor of the comparison. It is worth being precise about *why* it is
    the floor rather than merely bad: with three stations and three channels,
    the chance that a uniform draw happens to be collision-free is
    ``3! / 3^3 = 6/27``, about 22%.  So random spends roughly four steps in
    five with at least one collision, and its throughput is dominated by that
    rather than by anything about power.  A policy that cannot beat this has
    learned nothing about the other agents.
    """

    name = "random"

    def act(self, observations: Mapping[str, np.ndarray]) -> dict[str, int]:
        """Draw a uniform action index for every agent.

        Ignores the observations entirely -- which is the point.
        """
        n_actions = self._n_channels * self._n_power_levels
        return {
            agent: int(self._rng.integers(n_actions)) for agent in observations
        }


class GreedyLocalPolicy(Policy):
    """Pick the locally best-looking channel and transmit at full power.

    The rule, in full:

    1. read the ``channel_quality`` block of *my own* observation -- one value
       per channel, computed from the noise floor and the interference **my own
       users reported on the previous step**;
    2. choose the channel with the highest value (ties broken by lowest index
       under the default ``tie_breaking="lowest"``);
    3. transmit at maximum power, because for a fixed choice by everyone else,
       higher power strictly increases my own users' SINR and therefore my own
       users' rate.

    Every step of that is individually correct.  Each agent is genuinely
    maximizing its own users' throughput given what it can see.  And the team
    result is bad, for three compounding reasons a student can predict before
    running it:

    * **Synchronization.**  Every agent runs the same deterministic rule on a
      similar view, so they tend to choose the *same* channel.  At reset the
      interference block is all zeros, every channel scores identically, and
      the tie-break sends all of them to channel 0 -- a maximal collision on
      step one, every single time.
    * **Staleness.**  The interference in the observation describes the joint
      action that has already happened.  Everyone flees the channel that *was*
      crowded, arriving together on the channel that *was* quiet, which makes
      it crowded.  The result is an oscillation, not a convergence.
    * **Full power.**  Maximizing my own SINR maximizes the interference I
      inflict on whoever shares my channel.  Under a collision, both agents
      shouting is worse for the *pair* than either backing off.

    Set ``tie_breaking="random"`` to break the synchronization (each agent
    randomizes among equally good channels).  That single change visibly
    improves the team outcome without changing the objective any agent is
    pursuing, which is a compact demonstration that the failure was
    *coordination*, not greed.

    Parameters
    ----------
    config:
        The environment config, so the policy knows the action layout.
    seed:
        Seeds the tie-breaking randomness.
    tie_breaking:
        ``"lowest"`` (default) or ``"random"``.
    power_level:
        Which power index to use.  ``None`` (default) means the highest
        available level -- the greedy choice.  Pin it to an integer to run the
        "what if everyone backed off?" experiment.
    """

    name = "greedy_local"

    def __init__(
        self,
        config: WirelessConfig,
        seed: Optional[int] = None,
        tie_breaking: str = "lowest",
        power_level: Optional[int] = None,
    ) -> None:
        super().__init__(config, seed)
        if tie_breaking not in ("lowest", "random"):
            raise ValueError(
                f"tie_breaking must be 'lowest' or 'random', got {tie_breaking!r}. "
                "'lowest' makes every agent break ties the same way, which is what "
                "synchronizes them into collisions; 'random' is the fix worth "
                "comparing against."
            )
        if power_level is not None and not 0 <= power_level < self._n_power_levels:
            raise ValueError(
                f"power_level must be None or in [0, {self._n_power_levels}), got "
                f"{power_level}. The levels are "
                f"{dict(enumerate(POWER_LABELS[: self._n_power_levels]))}."
            )
        self.tie_breaking = tie_breaking
        self.power_level = power_level

    def act(self, observations: Mapping[str, np.ndarray]) -> dict[str, int]:
        """Choose the highest-``channel_quality`` channel and full power."""
        power = (
            self._n_power_levels - 1 if self.power_level is None else self.power_level
        )
        actions: dict[str, int] = {}
        for agent, observation in observations.items():
            blocks = unpack_observation(observation, self._layout)
            quality = blocks["channel_quality"]
            best = float(np.max(quality))
            candidates = np.flatnonzero(quality >= best - 1e-9)
            if self.tie_breaking == "random" and candidates.size > 1:
                channel = int(self._rng.choice(candidates))
            else:
                channel = int(candidates[0])
            actions[agent] = self._encode(channel, power)
        return actions


class RoundRobinPolicy(Policy):
    """Rotate through the channels with a per-agent offset, at full power.

    Agent ``i`` uses channel ``(t + i) mod n_channels`` at step ``t``.  This is
    a *schedule*, not a policy: it ignores the observations completely and needs
    no coordination at run time, because the offsets were agreed in advance.

    Two properties make it a useful reference:

    * whenever ``n_stations <= n_channels`` it is **collision-free at every
      step**, since the offsets are distinct modulo the channel count;
    * it visits every channel equally often, so no station is permanently stuck
      on a bad one.  That matters in
      :func:`~wireless_env.scenarios.noisy_channel`, where a fixed assignment
      condemns exactly one station -- and therefore its users -- to the noisy
      channel for the whole episode, while round-robin shares the pain.

    **A measurement trap worth walking students straight into.**  That second
    property does *not* show up in the environment's ``jain_fairness`` metric,
    and it is instructive to work out why before looking.  ``jain_fairness`` is
    computed per step and then averaged over steps.  Within any single step,
    round-robin still has exactly one station sitting on the noisy channel, so
    its per-step fairness looks just like a fixed assignment's -- only the
    *identity* of the unlucky station rotates, and Jain's index cannot see
    identity.  The benefit is real but it is a **long-run** benefit, and to
    measure it you have to change the order of the operations: time-average
    each user's rate first, then take Jain of those averages.  Do that on the
    noisy-channel scenario and round-robin comes out ahead on both long-run
    fairness and long-run worst-user rate, at a small cost in total
    throughput.  ``mean(Jain(x_t))`` and ``Jain(mean(x_t))`` are different
    quantities, and this scenario is where they disagree loudly.  (Both
    statements are computed outputs of this simulator -- run
    ``tests/test_baselines.py::test_round_robin_improves_long_run_fairness``
    and see for yourself rather than taking the docstring's word for it.)

    It also depends on a synchronized global step counter, which is itself
    worth pointing out to students: that is a form of pre-agreed coordination
    that a genuinely decentralized policy does not get for free.
    """

    name = "round_robin"

    def __init__(
        self,
        config: WirelessConfig,
        seed: Optional[int] = None,
        power_level: Optional[int] = None,
    ) -> None:
        super().__init__(config, seed)
        if power_level is not None and not 0 <= power_level < self._n_power_levels:
            raise ValueError(
                f"power_level must be None or in [0, {self._n_power_levels}), got "
                f"{power_level}."
            )
        self.power_level = power_level
        self._t = 0

    def reset(self, seed: Optional[int] = None) -> None:
        """Reset the schedule counter (and optionally re-seed)."""
        super().reset(seed)
        self._t = 0

    def act(self, observations: Mapping[str, np.ndarray]) -> dict[str, int]:
        """Assign channel ``(t + agent_index) mod n_channels`` to each agent."""
        power = (
            self._n_power_levels - 1 if self.power_level is None else self.power_level
        )
        actions: dict[str, int] = {}
        for agent in observations:
            index = _station_index(agent)
            channel = (self._t + index) % self._n_channels
            actions[agent] = self._encode(channel, power)
        self._t += 1
        return actions


class FixedOrthogonalPolicy(Policy):
    """Station ``i`` always uses channel ``i mod n_channels``, at full power.

    **When this is a reference ceiling, and why.**  If
    ``n_base_stations <= n_channels`` then this assignment gives every station
    its own channel, so for every user the co-channel indicator
    ``1[c_j = c_i]`` is zero for every other station and the SINR reduces to

    .. math::

        \\mathrm{SINR}_u = \\frac{P_i g_{iu}}{\\sigma_c^2}

    which is increasing in ``P_i``.  Maximum power therefore maximizes it, and
    because :func:`~wireless_env.physics.shannon_rate` is increasing in SINR and
    ``min(capacity, demand)`` is non-decreasing in capacity, this maximizes
    **every user's delivered rate simultaneously**.  No other joint action can
    beat it on total throughput: any joint action either leaves some station on
    a shared channel (adding a positive term to somebody's denominator) or uses
    less than maximum power (shrinking somebody's numerator).  So on the
    familiar topology this is a *computed optimum for throughput*, derived from
    the model's own equations -- not a measured benchmark, and not a published
    result.

    **Three honest caveats.**

    1. It is a ceiling for *throughput*, not for the reward.  The reward also
       contains a fairness term, and a different allocation can score higher
       overall by evening service out.  Check ``reward``, not just
       ``total_throughput``, before calling anything optimal.
    2. It stops being a ceiling the moment ``n_base_stations > n_channels`` --
       see :func:`~wireless_env.scenarios.new_base_station_joins`, where four
       stations share three channels and this policy simply forces stations 0
       and 3 to collide with no attempt to choose *which* collision is
       cheapest.
    3. It is not a ceiling for *fairness over time* under
       :func:`~wireless_env.scenarios.noisy_channel`: pinning one station to
       the noisy channel for the whole episode means the same users suffer
       every step, and :class:`RoundRobinPolicy` beats it on long-run fairness
       and long-run worst-user rate there (see that class's docstring for the
       subtlety about *which* fairness you measure).  It still wins on total
       throughput on that scenario, which is exactly the trade-off students
       are asked to arbitrate.

    It needs no observations and no communication, because the assignment was
    decided offline by a central designer who knew the topology.  That is
    precisely the assumption the whole cooperative-MARL exercise is trying to
    remove, and saying so out loud is part of the lesson.
    """

    name = "fixed_orthogonal"

    def __init__(
        self,
        config: WirelessConfig,
        seed: Optional[int] = None,
        power_level: Optional[int] = None,
        channel_assignment: Optional[Sequence[int]] = None,
    ) -> None:
        super().__init__(config, seed)
        if power_level is not None and not 0 <= power_level < self._n_power_levels:
            raise ValueError(
                f"power_level must be None or in [0, {self._n_power_levels}), got "
                f"{power_level}."
            )
        if channel_assignment is not None:
            if len(channel_assignment) != config.n_base_stations:
                raise ValueError(
                    f"channel_assignment has {len(channel_assignment)} entries but "
                    f"there are {config.n_base_stations} stations; give one channel "
                    "per station."
                )
            if any(not 0 <= int(c) < config.n_channels for c in channel_assignment):
                raise ValueError(
                    f"channel_assignment entries must be in [0, {config.n_channels}), "
                    f"got {list(channel_assignment)}."
                )
        self.power_level = power_level
        self.channel_assignment = (
            tuple(int(c) for c in channel_assignment)
            if channel_assignment is not None
            else tuple(
                index % config.n_channels for index in range(config.n_base_stations)
            )
        )

    def act(self, observations: Mapping[str, np.ndarray]) -> dict[str, int]:
        """Return the pre-agreed channel for each agent, at full power."""
        power = (
            self._n_power_levels - 1 if self.power_level is None else self.power_level
        )
        actions: dict[str, int] = {}
        for agent in observations:
            index = _station_index(agent)
            channel = self.channel_assignment[index % len(self.channel_assignment)]
            actions[agent] = self._encode(channel, power)
        return actions


def _station_index(agent: str) -> int:
    """Recover the station index from an agent name such as ``'bs_2'``."""
    try:
        return int(str(agent).rsplit("_", 1)[-1])
    except ValueError as exc:
        raise ValueError(
            f"Cannot read a station index out of agent name {agent!r}. This "
            "environment names agents 'bs_<index>'; a policy that depends on the "
            "index (round-robin, fixed orthogonal) needs that convention."
        ) from exc


#: Every hand-coded baseline, by name.  All of them have ``is_learned = False``.
POLICIES: dict[str, type[Policy]] = {
    RandomPolicy.name: RandomPolicy,
    GreedyLocalPolicy.name: GreedyLocalPolicy,
    RoundRobinPolicy.name: RoundRobinPolicy,
    FixedOrthogonalPolicy.name: FixedOrthogonalPolicy,
}


# --------------------------------------------------------------------------- #
# Evaluation helpers
# --------------------------------------------------------------------------- #


def run_episode(
    env: CooperativeWirelessEnv,
    policy: Policy,
    seed: Optional[int] = None,
    collect_trace: bool = False,
) -> dict[str, Any]:
    """Run one full episode of ``policy`` in ``env`` and summarize it.

    Parameters
    ----------
    env:
        The environment.  It is reset here, so pass a fresh or reusable one.
    policy:
        Any :class:`Policy`.  It is reset with the same seed as the
        environment, so one integer determines the whole episode.
    seed:
        Episode seed, forwarded to both ``env.reset`` and ``policy.reset``.
    collect_trace:
        When ``True`` the returned dict includes ``"trace"``: a per-step list of
        ``{"step", "actions", "reward", "metrics"}``.  This is what the JSON
        fixtures and the lab's replay feature consume.

    Returns
    -------
    dict
        ``episode_return`` (undiscounted sum of the team reward), the mean over
        steps of each key metric, ``steps``, and optionally ``trace``.
    """
    observations, _ = env.reset(seed=seed)
    policy.reset(seed=seed)

    rewards_seen: list[float] = []
    per_step: list[dict[str, Any]] = []
    trace: list[dict[str, Any]] = []

    while True:
        actions = policy.act(observations)
        observations, rewards, terminations, truncations, infos = env.step(actions)
        reward = float(next(iter(rewards.values())))
        team = env.metrics()
        rewards_seen.append(reward)
        per_step.append(team)
        if collect_trace:
            trace.append(
                {
                    "step": int(team["step"]),
                    "actions": {agent: int(action) for agent, action in actions.items()},
                    "reward": reward,
                    "metrics": team,
                }
            )
        if all(terminations.values()) or all(truncations.values()):
            break

    def mean_of(key: str) -> float:
        return float(np.mean([step[key] for step in per_step]))

    summary: dict[str, Any] = {
        "policy": policy.name,
        "is_learned": policy.is_learned,
        "scenario": env.config.name,
        "seed": seed,
        "steps": len(per_step),
        "episode_return": float(np.sum(rewards_seen)),
        "mean_reward": float(np.mean(rewards_seen)),
        "total_throughput": mean_of("total_throughput"),
        "mean_throughput": mean_of("mean_throughput"),
        "worst_user_throughput": mean_of("worst_user_throughput"),
        "jain_fairness": mean_of("jain_fairness"),
        "total_interference": mean_of("total_interference"),
        "mean_interference_to_noise": mean_of("mean_interference_to_noise"),
        "communication_overhead_bits": float(
            np.sum([step["communication_overhead_bits"] for step in per_step])
        ),
        "collision_steps": int(
            np.sum([step["n_colliding_stations"] > 0 for step in per_step])
        ),
    }
    if collect_trace:
        summary["trace"] = trace
    return summary


def evaluate_policy(
    policy: Policy,
    config: WirelessConfig,
    episodes: int = 3,
    seed: int = 0,
) -> dict[str, Any]:
    """Average :func:`run_episode` over several seeded episodes.

    Episodes use seeds ``seed, seed + 1, ...``, so the whole evaluation is
    reproducible from ``(seed, episodes)``.  Note the honest caveat that
    belongs in any write-up: with a handful of episodes on a stochastic demand
    process these means carry real variance, and small differences between
    policies are not evidence of anything.  Report the number of episodes and
    the seed alongside the numbers.

    Returns
    -------
    dict
        The mean of each numeric field of :func:`run_episode`, plus
        ``"episodes"``, ``"seeds"`` and the per-episode returns under
        ``"episode_returns"``.
    """
    if episodes < 1:
        raise ValueError(f"episodes must be at least 1, got {episodes}.")
    env = CooperativeWirelessEnv(config)
    results = [
        run_episode(env, policy, seed=seed + offset) for offset in range(episodes)
    ]
    numeric_keys = [
        key
        for key, value in results[0].items()
        if isinstance(value, (int, float)) and not isinstance(value, bool)
    ]
    summary: dict[str, Any] = {
        "policy": policy.name,
        "is_learned": policy.is_learned,
        "scenario": config.name,
        "episodes": episodes,
        "seeds": [seed + offset for offset in range(episodes)],
        "episode_returns": [result["episode_return"] for result in results],
    }
    for key in numeric_keys:
        summary[key] = float(np.mean([result[key] for result in results]))
    return summary
