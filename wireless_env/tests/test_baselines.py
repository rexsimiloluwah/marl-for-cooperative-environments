"""Tests for :mod:`wireless_env.baselines`.

These tests do two jobs.  The first is ordinary correctness: the policies emit
valid actions and are reproducible from a seed.  The second is to *verify the
teaching claims* the module's docstrings make -- that greedy local
synchronizes into collisions, that random tie-breaking fixes it, that a fixed
orthogonal allocation is genuinely the throughput ceiling on the familiar
topology, and that round-robin buys long-run fairness on the noisy channel.
Those claims are the pedagogical content of the chapter, so they are tested,
not asserted.
"""

from __future__ import annotations

import itertools

import numpy as np
import pytest

from wireless_env import baselines, metrics, scenarios
from wireless_env.baselines import (
    FixedOrthogonalPolicy,
    GreedyLocalPolicy,
    Policy,
    RandomPolicy,
    RoundRobinPolicy,
)
from wireless_env.environment import (
    CooperativeWirelessEnv,
    decode_action,
    encode_action,
)

ALL_POLICIES = (RandomPolicy, GreedyLocalPolicy, RoundRobinPolicy, FixedOrthogonalPolicy)


# --------------------------------------------------------------------------- #
# Shared contract
# --------------------------------------------------------------------------- #


@pytest.mark.parametrize("policy_class", ALL_POLICIES)
def test_every_policy_emits_one_valid_action_per_agent(
    policy_class: type[Policy],
) -> None:
    config = scenarios.familiar_topology(max_steps=20)
    env = CooperativeWirelessEnv(config)
    policy = policy_class(config, seed=0)
    observations, _ = env.reset(seed=0)
    space = env.action_space("bs_0")
    for _ in range(20):
        actions = policy.act(observations)
        assert set(actions) == set(env.agents)
        for action in actions.values():
            assert isinstance(action, int)
            assert space.contains(action)
        observations, _, _, _, _ = env.step(actions)


@pytest.mark.parametrize("policy_class", ALL_POLICIES)
def test_every_policy_is_reproducible_from_its_seed(
    policy_class: type[Policy],
) -> None:
    config = scenarios.familiar_topology(max_steps=25)
    first = baselines.run_episode(
        CooperativeWirelessEnv(config), policy_class(config, seed=4), seed=4,
        collect_trace=True,
    )
    second = baselines.run_episode(
        CooperativeWirelessEnv(config), policy_class(config, seed=4), seed=4,
        collect_trace=True,
    )
    assert [s["actions"] for s in first["trace"]] == [s["actions"] for s in second["trace"]]
    assert first["episode_return"] == pytest.approx(second["episode_return"])


@pytest.mark.parametrize("policy_class", ALL_POLICIES)
def test_no_baseline_claims_to_be_learned(policy_class: type[Policy]) -> None:
    """Not one of these came from training, and the flag must say so."""
    config = scenarios.familiar_topology()
    policy = policy_class(config, seed=0)
    assert isinstance(policy, Policy)
    assert policy.is_learned is False
    assert baselines.run_episode(
        CooperativeWirelessEnv(config.replace(max_steps=3)), policy, seed=0
    )["is_learned"] is False


@pytest.mark.parametrize("policy_class", ALL_POLICIES)
def test_no_baseline_touches_the_global_state(policy_class: type[Policy]) -> None:
    """A decentralized policy must not read privileged information.

    Enforced by making ``global_state`` explode for the duration of an episode.
    """
    config = scenarios.familiar_topology(max_steps=10)
    env = CooperativeWirelessEnv(config)

    def forbidden(*args: object, **kwargs: object) -> None:
        raise AssertionError(
            f"{policy_class.__name__} called global_state(); that is centralized "
            "information and using it makes the policy non-decentralized"
        )

    env.global_state = forbidden  # type: ignore[assignment]
    env.global_state_vector = forbidden  # type: ignore[assignment]
    policy = policy_class(config, seed=0)
    observations, _ = env.reset(seed=0)
    for _ in range(10):
        observations, _, _, _, _ = env.step(policy.act(observations))


@pytest.mark.parametrize("policy_class", ALL_POLICIES)
def test_every_policy_runs_on_every_scenario(policy_class: type[Policy]) -> None:
    for name in scenarios.SCENARIOS:
        config = scenarios.make_scenario(name, max_steps=5)
        summary = baselines.run_episode(
            CooperativeWirelessEnv(config), policy_class(config, seed=0), seed=0
        )
        assert summary["steps"] == 5, (name, policy_class.__name__)
        assert np.isfinite(summary["episode_return"]), (name, policy_class.__name__)


# --------------------------------------------------------------------------- #
# RandomPolicy
# --------------------------------------------------------------------------- #


def test_random_policy_eventually_uses_the_whole_action_space() -> None:
    config = scenarios.familiar_topology(max_steps=300)
    env = CooperativeWirelessEnv(config)
    policy = RandomPolicy(config, seed=0)
    observations, _ = env.reset(seed=0)
    seen: set[int] = set()
    for _ in range(300):
        actions = policy.act(observations)
        seen.update(actions.values())
        observations, _, _, _, _ = env.step(actions)
    assert seen == set(range(9))


def test_random_policy_ignores_its_observations() -> None:
    """It is the floor precisely because it uses no information."""
    config = scenarios.familiar_topology()
    a = RandomPolicy(config, seed=1)
    b = RandomPolicy(config, seed=1)
    zeros = {f"bs_{i}": np.zeros(36, dtype=np.float32) for i in range(3)}
    ones = {f"bs_{i}": np.ones(36, dtype=np.float32) for i in range(3)}
    assert a.act(zeros) == b.act(ones)


# --------------------------------------------------------------------------- #
# GreedyLocalPolicy: the interesting failure
# --------------------------------------------------------------------------- #


def test_greedy_local_sends_every_agent_to_the_same_channel_on_the_first_step() -> None:
    """At reset nothing has been measured, every channel ties, and all three flee
    to channel 0 together. A maximal collision, every single time."""
    config = scenarios.familiar_topology()
    env = CooperativeWirelessEnv(config)
    policy = GreedyLocalPolicy(config, seed=0)
    observations, _ = env.reset(seed=0)
    actions = policy.act(observations)
    channels = {agent: decode_action(action)[0] for agent, action in actions.items()}
    assert set(channels.values()) == {0}
    powers = {decode_action(action)[1] for action in actions.values()}
    assert powers == {2}, "greedy must also pick maximum power"
    env.step(actions)
    assert env.metrics()["channel_occupancy"] == [3, 0, 0]
    assert env.metrics()["n_colliding_stations"] == 3


def test_greedy_local_keeps_colliding_and_oscillates() -> None:
    """Stale measurements make the herd move together, step after step."""
    config = scenarios.familiar_topology(max_steps=20)
    env = CooperativeWirelessEnv(config)
    policy = GreedyLocalPolicy(config, seed=0)
    observations, _ = env.reset(seed=0)
    chosen_channels = []
    collided_steps = 0
    for _ in range(20):
        actions = policy.act(observations)
        channels = {decode_action(a)[0] for a in actions.values()}
        chosen_channels.append(sorted(channels))
        observations, _, _, _, _ = env.step(actions)
        if env.metrics()["n_colliding_stations"] > 0:
            collided_steps += 1
    # Every step is a three-way collision...
    assert collided_steps == 20
    assert all(len(step) == 1 for step in chosen_channels)
    # ...and the herd keeps moving rather than settling anywhere.
    assert len(set(tuple(step) for step in chosen_channels)) > 1


def test_greedy_local_is_beaten_by_the_orthogonal_reference_and_even_by_random() -> None:
    """'A locally good allocation can be globally poor' -- measured, not asserted."""
    config = scenarios.familiar_topology(max_steps=30)
    greedy = baselines.evaluate_policy(
        GreedyLocalPolicy(config, seed=0), config, episodes=3, seed=0
    )
    random_policy = baselines.evaluate_policy(
        RandomPolicy(config, seed=0), config, episodes=3, seed=0
    )
    orthogonal = baselines.evaluate_policy(
        FixedOrthogonalPolicy(config, seed=0), config, episodes=3, seed=0
    )
    assert greedy["total_throughput"] < orthogonal["total_throughput"]
    assert greedy["total_throughput"] < random_policy["total_throughput"], (
        "greedy local should be beaten even by uniform random on this topology, "
        "because its determinism synchronizes the collisions"
    )
    assert greedy["mean_interference_to_noise"] > random_policy["mean_interference_to_noise"]


def test_random_tie_breaking_fixes_greedy_without_changing_its_objective() -> None:
    """The failure was coordination, not greed: desynchronizing helps a lot."""
    config = scenarios.familiar_topology(max_steps=30)
    synchronized = baselines.evaluate_policy(
        GreedyLocalPolicy(config, seed=0, tie_breaking="lowest"),
        config,
        episodes=3,
        seed=0,
    )
    desynchronized = baselines.evaluate_policy(
        GreedyLocalPolicy(config, seed=0, tie_breaking="random"),
        config,
        episodes=3,
        seed=0,
    )
    assert desynchronized["total_throughput"] > synchronized["total_throughput"]
    assert desynchronized["episode_return"] > synchronized["episode_return"]


def test_greedy_local_backing_off_power_can_help_the_team() -> None:
    """When everyone shares one channel, everyone shouting is the worst outcome."""
    config = scenarios.familiar_topology(max_steps=20)
    loud = baselines.evaluate_policy(
        GreedyLocalPolicy(config, seed=0, power_level=2), config, episodes=2, seed=0
    )
    quiet = baselines.evaluate_policy(
        GreedyLocalPolicy(config, seed=0, power_level=0), config, episodes=2, seed=0
    )
    # Backing off cannot help *me* given the others, but it does cut the mutual
    # interference the whole team is paying for.
    assert quiet["mean_interference_to_noise"] < loud["mean_interference_to_noise"]


def test_greedy_local_selects_the_best_measured_channel() -> None:
    """Given a hand-built observation, it must pick the argmax of channel quality."""
    config = scenarios.familiar_topology()
    policy = GreedyLocalPolicy(config, seed=0)
    env = CooperativeWirelessEnv(config)
    layout = env.layout
    for best_channel in range(3):
        observation = np.zeros(layout.size, dtype=np.float32)
        quality = np.array([0.2, 0.2, 0.2])
        quality[best_channel] = 0.9
        observation[layout.channel_quality] = quality
        actions = policy.act({"bs_0": observation})
        assert decode_action(actions["bs_0"])[0] == best_channel


def test_greedy_local_rejects_bad_construction_arguments() -> None:
    config = scenarios.familiar_topology()
    with pytest.raises(ValueError, match="tie_breaking"):
        GreedyLocalPolicy(config, seed=0, tie_breaking="coin_flip")
    with pytest.raises(ValueError, match="power_level"):
        GreedyLocalPolicy(config, seed=0, power_level=9)


# --------------------------------------------------------------------------- #
# RoundRobinPolicy
# --------------------------------------------------------------------------- #


def test_round_robin_is_collision_free_and_visits_every_channel() -> None:
    config = scenarios.familiar_topology(max_steps=12)
    env = CooperativeWirelessEnv(config)
    policy = RoundRobinPolicy(config, seed=0)
    observations, _ = env.reset(seed=0)
    per_agent_channels: dict[str, list[int]] = {a: [] for a in env.agents}
    for _ in range(12):
        actions = policy.act(observations)
        channels = [decode_action(a)[0] for a in actions.values()]
        assert len(set(channels)) == 3, "round robin must stay orthogonal"
        for agent, action in actions.items():
            per_agent_channels[agent].append(decode_action(action)[0])
        observations, _, _, _, _ = env.step(actions)
        assert env.metrics()["n_colliding_stations"] == 0
    for channels in per_agent_channels.values():
        assert set(channels) == {0, 1, 2}, "every agent must visit every channel"


def test_round_robin_resets_its_schedule() -> None:
    config = scenarios.familiar_topology()
    policy = RoundRobinPolicy(config, seed=0)
    observations = {f"bs_{i}": np.zeros(36, dtype=np.float32) for i in range(3)}
    first = policy.act(observations)
    policy.act(observations)
    policy.reset(seed=0)
    assert policy.act(observations) == first


def test_round_robin_improves_long_run_fairness() -> None:
    """Round-robin shares a bad channel; a fixed assignment condemns one cell.

    This is the test the :class:`RoundRobinPolicy` docstring points at. It also
    demonstrates the measurement trap: the benefit appears in
    ``Jain(time-average of each user's rate)`` and is invisible in the
    environment's per-step ``jain_fairness`` averaged over steps, because within
    any single step both policies have exactly one station on the noisy channel.
    """
    config = scenarios.noisy_channel(max_steps=45)

    def long_run(policy: Policy) -> tuple[float, float, float, float]:
        env = CooperativeWirelessEnv(config)
        observations, _ = env.reset(seed=0)
        policy.reset(seed=0)
        rates, per_step_fairness = [], []
        while True:
            observations, _, _, truncations, _ = env.step(policy.act(observations))
            rates.append(env.global_state()["user_served_rate"])
            per_step_fairness.append(env.metrics()["jain_fairness"])
            if all(truncations.values()):
                break
        average_rates = np.mean(np.array(rates), axis=0)
        return (
            metrics.jain_fairness(average_rates),
            float(np.min(average_rates)),
            float(np.sum(average_rates)),
            float(np.mean(per_step_fairness)),
        )

    rr_fair, rr_worst, rr_total, rr_per_step = long_run(RoundRobinPolicy(config, seed=0))
    fx_fair, fx_worst, fx_total, fx_per_step = long_run(
        FixedOrthogonalPolicy(config, seed=0)
    )

    # The long-run claim: rotating the pain is fairer, and lifts the worst user.
    assert rr_fair > fx_fair
    assert rr_worst > fx_worst
    # And it costs a little total throughput -- the trade-off students arbitrate.
    assert rr_total < fx_total
    # The measurement trap: per-step fairness does *not* show the benefit.
    assert rr_per_step <= fx_per_step


# --------------------------------------------------------------------------- #
# FixedOrthogonalPolicy: the reference ceiling, verified by enumeration
# --------------------------------------------------------------------------- #


def test_fixed_orthogonal_is_collision_free_on_the_familiar_topology() -> None:
    config = scenarios.familiar_topology(max_steps=15)
    env = CooperativeWirelessEnv(config)
    policy = FixedOrthogonalPolicy(config, seed=0)
    observations, _ = env.reset(seed=0)
    for _ in range(15):
        observations, _, _, _, _ = env.step(policy.act(observations))
        assert env.metrics()["n_colliding_stations"] == 0
        assert env.metrics()["total_interference"] == pytest.approx(0.0)


def test_fixed_orthogonal_is_the_throughput_ceiling_over_all_729_joint_actions() -> None:
    """Enumerate the entire joint action space and check the claim exactly.

    The docstring of :class:`FixedOrthogonalPolicy` argues from the equations
    that orthogonal-at-maximum-power maximizes every user's rate simultaneously
    when there are at least as many channels as stations. With three agents
    there are only 9^3 = 729 joint actions, so the claim can simply be checked
    by brute force rather than trusted.
    """
    config = scenarios.familiar_topology()
    env = CooperativeWirelessEnv(config)

    orthogonal = tuple(encode_action(i, 2) for i in range(3))
    best_capacity = -1.0
    best_actions: tuple[int, ...] = ()
    orthogonal_capacity = None
    orthogonal_served = None
    served_values = []

    for joint in itertools.product(range(9), repeat=3):
        env.reset(seed=0)
        env.step({f"bs_{i}": action for i, action in enumerate(joint)})
        block = env.metrics()
        capacity, served = block["total_capacity"], block["total_throughput"]
        served_values.append(served)
        if capacity > best_capacity:
            best_capacity, best_actions = capacity, joint
        if joint == orthogonal:
            orthogonal_capacity, orthogonal_served = capacity, served

    # Orthogonal at maximum power is the unique capacity maximizer.
    assert best_actions == orthogonal, f"expected {orthogonal}, found {best_actions}"
    assert orthogonal_capacity == pytest.approx(best_capacity)
    # And no joint action delivers more demand-limited throughput.
    assert orthogonal_served >= max(served_values) - 1e-9


def test_fixed_orthogonal_is_not_a_ceiling_once_stations_outnumber_channels() -> None:
    """The documented caveat, verified: with four stations somebody must collide."""
    config = scenarios.new_base_station_joins()
    env = CooperativeWirelessEnv(config)
    policy = FixedOrthogonalPolicy(config, seed=0)
    observations, _ = env.reset(seed=0)
    env.step(policy.act(observations))
    assert env.metrics()["n_colliding_stations"] >= 2
    assert env.metrics()["total_interference"] > 0.0


def test_fixed_orthogonal_accepts_a_custom_assignment() -> None:
    config = scenarios.familiar_topology()
    policy = FixedOrthogonalPolicy(config, seed=0, channel_assignment=(2, 0, 1))
    observations = {f"bs_{i}": np.zeros(36, dtype=np.float32) for i in range(3)}
    actions = policy.act(observations)
    assert [decode_action(actions[f"bs_{i}"])[0] for i in range(3)] == [2, 0, 1]
    with pytest.raises(ValueError, match="one channel per station"):
        FixedOrthogonalPolicy(config, seed=0, channel_assignment=(0, 1))
    with pytest.raises(ValueError, match=r"in \[0, 3\)"):
        FixedOrthogonalPolicy(config, seed=0, channel_assignment=(0, 1, 5))


# --------------------------------------------------------------------------- #
# Evaluation helpers
# --------------------------------------------------------------------------- #


def test_run_episode_reports_the_metrics_the_project_requires() -> None:
    config = scenarios.familiar_topology(max_steps=10)
    summary = baselines.run_episode(
        CooperativeWirelessEnv(config),
        FixedOrthogonalPolicy(config, seed=0),
        seed=0,
        collect_trace=True,
    )
    for key in (
        "episode_return",
        "total_throughput",
        "mean_throughput",
        "worst_user_throughput",
        "jain_fairness",
        "total_interference",
        "communication_overhead_bits",
        "collision_steps",
    ):
        assert key in summary, key
    assert summary["steps"] == 10
    assert len(summary["trace"]) == 10
    assert summary["trace"][0]["step"] == 1
    assert summary["episode_return"] == pytest.approx(
        sum(step["reward"] for step in summary["trace"])
    )


def test_evaluate_policy_averages_over_seeded_episodes() -> None:
    config = scenarios.familiar_topology(max_steps=8)
    summary = baselines.evaluate_policy(
        FixedOrthogonalPolicy(config, seed=0), config, episodes=4, seed=100
    )
    assert summary["episodes"] == 4
    assert summary["seeds"] == [100, 101, 102, 103]
    assert len(summary["episode_returns"]) == 4
    assert summary["episode_return"] == pytest.approx(
        float(np.mean(summary["episode_returns"]))
    )
    with pytest.raises(ValueError, match="at least 1"):
        baselines.evaluate_policy(
            FixedOrthogonalPolicy(config, seed=0), config, episodes=0
        )


def test_the_policy_registry_lists_every_baseline() -> None:
    assert set(baselines.POLICIES) == {
        "random",
        "greedy_local",
        "round_robin",
        "fixed_orthogonal",
    }
    for name, policy_class in baselines.POLICIES.items():
        assert policy_class.name == name
        assert policy_class.is_learned is False


def test_a_generalization_gap_can_be_computed_across_the_evaluation_suite() -> None:
    """End-to-end: evaluate one baseline on the whole suite and summarize it.

    This is the shape of the table the final project asks for. The numbers are
    outputs of a hand-coded baseline on a simplified simulator -- not a measured
    research result -- and the point of the test is that the *pipeline* works.
    """
    results: dict[str, float] = {}
    for name in scenarios.EVALUATION_SUITE:
        config = scenarios.make_scenario(name, max_steps=10)
        summary = baselines.run_episode(
            CooperativeWirelessEnv(config), FixedOrthogonalPolicy(config, seed=0), seed=0
        )
        results[name] = summary["total_throughput"]

    assert set(results) == set(scenarios.EVALUATION_SUITE)
    familiar = results["familiar_topology"]

    gap = metrics.generalization_gap(familiar, results["unseen_topology"])
    assert gap == pytest.approx(familiar - results["unseen_topology"])
    relative = metrics.relative_generalization_gap(familiar, results["unseen_topology"])
    assert relative == pytest.approx(gap / familiar)

    worst_case = metrics.robustness(results)
    assert worst_case == pytest.approx(min(results.values()))
    assert worst_case <= familiar
    normalized = metrics.robustness(results, reference=familiar)
    assert normalized == pytest.approx(worst_case / familiar)
