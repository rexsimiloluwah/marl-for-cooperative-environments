"""Tests for :mod:`wireless_env.environment`."""

from __future__ import annotations

import dataclasses
import itertools
import json
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import numpy as np
import pytest

from wireless_env import scenarios
from wireless_env.environment import (
    MAX_MESSAGE_BITS,
    POWER_LABELS,
    Box,
    CooperativeWirelessEnv,
    Discrete,
    RewardWeights,
    WirelessConfig,
    compute_team_reward,
    decode_action,
    encode_action,
    observation_layout,
    unpack_observation,
)

FIXTURE_PATH = Path(__file__).resolve().parents[1] / "fixtures" / "test_vectors.json"


@pytest.fixture(scope="module")
def fixture() -> dict:
    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


def rollout(
    env: CooperativeWirelessEnv,
    actions_per_step: Sequence[Sequence[int]],
    seed: int | None = None,
) -> list[dict[str, Any]]:
    """Step an env through a fixed list of joint actions, returning the trace."""
    observations, _ = env.reset(seed=seed)
    trace = []
    for step_actions in actions_per_step:
        actions = {f"bs_{i}": int(a) for i, a in enumerate(step_actions)}
        observations, rewards, terminations, truncations, infos = env.step(actions)
        trace.append(
            {
                "observations": {k: v.copy() for k, v in observations.items()},
                "reward": float(next(iter(rewards.values()))),
                "metrics": env.metrics(),
                "truncated": all(truncations.values()),
            }
        )
    return trace


# --------------------------------------------------------------------------- #
# Action space: validity and the encode/decode round trip
# --------------------------------------------------------------------------- #


def test_default_action_space_is_discrete_nine() -> None:
    """Three channels x three power levels = the Discrete(9) of Chapter 1."""
    env = CooperativeWirelessEnv(scenarios.familiar_topology())
    space = env.action_space("bs_0")
    assert isinstance(space, Discrete)
    assert space.n == 9
    assert env.config.n_actions == 9
    # And three agents therefore face 9^3 = 729 joint actions.
    assert space.n ** env.num_agents == 729


def test_encode_decode_round_trip_over_the_whole_space() -> None:
    """encode and decode must be exact inverses for every valid pair."""
    for n_channels, n_power in itertools.product(range(1, 6), range(1, 5)):
        for channel in range(n_channels):
            for power in range(n_power):
                action = encode_action(
                    channel, power, n_channels=n_channels, n_power_levels=n_power
                )
                assert 0 <= action < n_channels * n_power
                assert decode_action(
                    action, n_channels=n_channels, n_power_levels=n_power
                ) == (channel, power)
        # ...and the mapping is onto: every index decodes to a valid pair.
        seen = {
            decode_action(a, n_channels=n_channels, n_power_levels=n_power)
            for a in range(n_channels * n_power)
        }
        assert len(seen) == n_channels * n_power


def test_default_action_table_matches_the_documented_layout() -> None:
    """action = channel * 3 + power_level, channel-major."""
    assert decode_action(0) == (0, 0)
    assert decode_action(2) == (0, 2)
    assert decode_action(5) == (1, 2)
    assert decode_action(8) == (2, 2)
    assert encode_action(0, 0) == 0
    assert encode_action(1, 2) == 5
    assert encode_action(2, 2) == 8
    assert POWER_LABELS == ("low", "medium", "high")


@pytest.mark.parametrize("bad", [9, -1, 100])
def test_decode_rejects_out_of_range_actions(bad: int) -> None:
    with pytest.raises(ValueError) as excinfo:
        decode_action(bad)
    assert "[0, 9)" in str(excinfo.value)


def test_decode_rejects_non_integer_actions() -> None:
    with pytest.raises(ValueError, match="whole number"):
        decode_action(1.5)
    with pytest.raises(ValueError, match="integer index"):
        decode_action("0")


def test_encode_rejects_out_of_range_components() -> None:
    with pytest.raises(ValueError, match=r"channel must be in \[0, 3\)"):
        encode_action(3, 0)
    with pytest.raises(ValueError, match=r"power_level must be in \[0, 3\)"):
        encode_action(0, 3)


def test_step_rejects_invalid_missing_and_unknown_actions() -> None:
    env = CooperativeWirelessEnv(scenarios.familiar_topology())
    env.reset(seed=0)
    with pytest.raises(ValueError) as excinfo:
        env.step({"bs_0": 0, "bs_1": 0, "bs_2": 9})
    assert "Discrete(9)" in str(excinfo.value)
    with pytest.raises(ValueError, match="missing an action"):
        env.step({"bs_0": 0, "bs_1": 0})
    with pytest.raises(ValueError, match="unknown agent"):
        env.step({"bs_0": 0, "bs_1": 0, "bs_2": 0, "bs_9": 0})
    with pytest.raises(ValueError, match="dict mapping agent name"):
        env.step([0, 0, 0])


def test_all_valid_actions_are_accepted() -> None:
    env = CooperativeWirelessEnv(scenarios.familiar_topology(max_steps=200))
    env.reset(seed=0)
    for action in range(9):
        env.step({agent: action for agent in env.agents})


# --------------------------------------------------------------------------- #
# Observations: shape, locality, layout
# --------------------------------------------------------------------------- #


def test_observation_space_matches_the_documented_layout() -> None:
    config = scenarios.familiar_topology()
    env = CooperativeWirelessEnv(config)
    layout = env.layout
    # 3 blocks of max_users, 3 blocks of n_channels, one power one-hot,
    # operational + time, and (n_stations - 1) message slots of 1 + 4.
    expected = 3 * 4 + 3 * 3 + 3 + 2 + 2 * (1 + MAX_MESSAGE_BITS)
    assert layout.size == expected == 36
    space = env.observation_space("bs_0")
    assert isinstance(space, Box)
    assert space.shape == (expected,)
    observations, _ = env.reset(seed=0)
    for observation in observations.values():
        assert observation.shape == (expected,)
        assert observation.dtype == np.float32
        assert space.contains(observation)
    # Blocks must tile the vector exactly, with no gaps and no overlaps.
    stops = [getattr(layout, name).start for name in layout.block_names()]
    ends = [getattr(layout, name).stop for name in layout.block_names()]
    assert stops[0] == 0
    assert ends[-1] == layout.size
    assert stops[1:] == ends[:-1]


def test_observation_blocks_hold_what_they_claim() -> None:
    config = scenarios.familiar_topology()
    env = CooperativeWirelessEnv(config)
    observations, _ = env.reset(seed=0)
    blocks = unpack_observation(observations["bs_0"], env.layout)

    n_own = len(env.global_state()["station_user_indices"][0])
    # The mask marks exactly the real users; padding slots are zero.
    assert blocks["user_mask"].sum() == pytest.approx(n_own)
    assert np.all(blocks["user_mask"][:n_own] == 1.0)
    assert np.all(blocks["user_mask"][n_own:] == 0.0)
    # Demands are normalized into [0, 1] and padding is zero.
    assert np.all(blocks["demand"][:n_own] > 0.0)
    assert np.all(blocks["demand"] <= 1.0)
    assert np.all(blocks["demand"][n_own:] == 0.0)
    # Gains are normalized by the maximum possible gain, so they live in (0, 1].
    assert np.all(blocks["serving_gain"][:n_own] > 0.0)
    assert np.all(blocks["serving_gain"][:n_own] <= 1.0)
    # Nothing has been measured or chosen yet at reset.
    assert np.all(blocks["interference"] == 0.0)
    assert np.all(blocks["channel_quality"] == 1.0)
    assert np.all(blocks["previous_channel"] == 0.0)
    assert np.all(blocks["previous_power"] == 0.0)
    assert blocks["operational"][0] == 1.0
    assert blocks["time"][0] == 0.0
    assert np.all(blocks["messages"] == 0.0)


def test_previous_action_block_records_the_last_action() -> None:
    env = CooperativeWirelessEnv(scenarios.familiar_topology())
    observations, _ = env.reset(seed=0)
    observations, *_ = env.step({"bs_0": encode_action(2, 1), "bs_1": 0, "bs_2": 4})
    blocks = unpack_observation(observations["bs_0"], env.layout)
    assert blocks["previous_channel"].tolist() == [0.0, 0.0, 1.0]
    assert blocks["previous_power"].tolist() == [0.0, 1.0, 0.0]


def test_observations_are_local_and_reveal_neighbours_only_through_interference() -> None:
    """A neighbour's action may only reach me as interference, never directly.

    Two runs identical except for what bs_1 does. bs_0's observation must
    differ *only* in the interference and channel-quality blocks (which are
    physical measurements it really can make) -- never in its own users, its own
    action, or, with communication off, the message block.
    """
    config = scenarios.familiar_topology()
    trace_a = rollout(CooperativeWirelessEnv(config), [(2, 2, 8)], seed=0)
    trace_b = rollout(CooperativeWirelessEnv(config), [(2, 5, 8)], seed=0)
    layout = observation_layout(config)
    blocks_a = unpack_observation(trace_a[0]["observations"]["bs_0"], layout)
    blocks_b = unpack_observation(trace_b[0]["observations"]["bs_0"], layout)

    changed = {
        name
        for name in layout.block_names()
        if not np.allclose(blocks_a[name], blocks_b[name])
    }
    assert changed == {"interference", "channel_quality"}, (
        "bs_0 learned something about bs_1 that it should not have: " f"{changed}"
    )


def test_unpack_observation_rejects_a_mismatched_layout() -> None:
    config = scenarios.familiar_topology()
    env = CooperativeWirelessEnv(config)
    observations, _ = env.reset(seed=0)
    other_layout = observation_layout(scenarios.new_base_station_joins())
    with pytest.raises(ValueError, match="differently"):
        unpack_observation(observations["bs_0"], other_layout)


# --------------------------------------------------------------------------- #
# Global state
# --------------------------------------------------------------------------- #


def test_global_state_is_json_serializable_and_complete() -> None:
    env = CooperativeWirelessEnv(scenarios.familiar_topology())
    env.reset(seed=0)
    env.step({agent: 4 for agent in env.agents})
    state = env.global_state()
    json.dumps(state)  # must not raise: the browser lab consumes this directly
    for key in (
        "station_positions",
        "station_operational",
        "station_channels",
        "user_positions",
        "user_station",
        "user_demands",
        "user_sinr",
        "user_served_rate",
        "user_interference",
        "metrics",
        "reward",
    ):
        assert key in state, f"global_state is missing {key}"
    assert len(state["user_positions"]) == env.n_users
    assert len(state["user_sinr"]) == env.n_users


def test_global_state_exposes_information_absent_from_observations() -> None:
    """The whole point of the split: the global view knows more."""
    env = CooperativeWirelessEnv(scenarios.familiar_topology())
    observations, _ = env.reset(seed=0)
    observations, *_ = env.step({"bs_0": 0, "bs_1": 5, "bs_2": 8})
    state = env.global_state()
    # Global state knows every station's channel...
    assert state["station_channels"] == [0, 1, 2]
    # ...while bs_0's observation contains no one-hot of anyone else's channel.
    blocks = unpack_observation(observations["bs_0"], env.layout)
    assert blocks["previous_channel"].tolist() == [1.0, 0.0, 0.0]  # only its own


def test_global_state_vector_has_a_stable_shape() -> None:
    config = scenarios.familiar_topology(regenerate_topology_on_reset=True)
    env = CooperativeWirelessEnv(config)
    shapes = set()
    for seed in range(6):
        env.reset(seed=seed)
        env.step({agent: 4 for agent in env.agents})
        shapes.add(env.global_state_vector().shape)
    assert len(shapes) == 1, f"centralized critic input changed shape: {shapes}"


# --------------------------------------------------------------------------- #
# Determinism
# --------------------------------------------------------------------------- #


def test_two_environments_with_the_same_seed_are_bit_identical() -> None:
    config = scenarios.varied_topology_training(max_steps=25)
    script = [(a % 9, (a + 3) % 9, (a + 6) % 9) for a in range(25)]
    trace_a = rollout(CooperativeWirelessEnv(config), script, seed=11)
    trace_b = rollout(CooperativeWirelessEnv(config), script, seed=11)
    for step_a, step_b in zip(trace_a, trace_b):
        assert step_a["reward"] == step_b["reward"]
        for agent in step_a["observations"]:
            assert np.array_equal(
                step_a["observations"][agent], step_b["observations"][agent]
            )
        assert step_a["metrics"] == step_b["metrics"]


def test_resetting_the_same_environment_with_the_same_seed_repeats_the_episode() -> None:
    config = scenarios.varied_topology_training(max_steps=15)
    env = CooperativeWirelessEnv(config)
    script = [(a % 9, (a + 4) % 9, (a + 8) % 9) for a in range(15)]
    first = rollout(env, script, seed=5)
    second = rollout(env, script, seed=5)
    assert [s["reward"] for s in first] == [s["reward"] for s in second]


def test_different_seeds_give_different_episodes() -> None:
    config = scenarios.varied_topology_training(max_steps=10)
    script = [(2, 5, 8)] * 10
    a = rollout(CooperativeWirelessEnv(config), script, seed=1)
    b = rollout(CooperativeWirelessEnv(config), script, seed=2)
    assert [s["reward"] for s in a] != [s["reward"] for s in b]


def test_fresh_environments_share_the_config_seed_without_an_explicit_reset_seed() -> None:
    """Two fresh envs with the same config.seed must agree even on reset()."""
    config = scenarios.familiar_topology(max_steps=8)
    script = [(2, 5, 8)] * 8
    a = rollout(CooperativeWirelessEnv(config), script, seed=None)
    b = rollout(CooperativeWirelessEnv(config), script, seed=None)
    assert [s["reward"] for s in a] == [s["reward"] for s in b]


# --------------------------------------------------------------------------- #
# Topology
# --------------------------------------------------------------------------- #


def test_topology_is_fixed_across_resets_by_default() -> None:
    """The familiar deployment must not move between episodes."""
    env = CooperativeWirelessEnv(scenarios.familiar_topology())
    env.reset(seed=0)
    first_users = np.array(env.global_state()["user_positions"])
    first_stations = np.array(env.global_state()["station_positions"])
    env.reset()
    env.reset()
    assert np.allclose(np.array(env.global_state()["user_positions"]), first_users)
    assert np.allclose(np.array(env.global_state()["station_positions"]), first_stations)


def test_topology_is_redrawn_when_the_config_asks_for_it() -> None:
    env = CooperativeWirelessEnv(scenarios.varied_topology_training())
    env.reset(seed=0)
    first = np.array(env.global_state()["station_positions"])
    env.reset()
    second = np.array(env.global_state()["station_positions"])
    assert not np.allclose(first, second)


def test_reset_with_a_seed_restores_the_same_topology() -> None:
    env = CooperativeWirelessEnv(scenarios.varied_topology_training())
    env.reset(seed=42)
    expected = np.array(env.global_state()["station_positions"])
    env.reset(seed=7)
    assert not np.allclose(np.array(env.global_state()["station_positions"]), expected)
    env.reset(seed=42)
    assert np.allclose(np.array(env.global_state()["station_positions"]), expected)


def test_regenerate_topology_changes_the_deployment_and_reseeds_reproducibly() -> None:
    env = CooperativeWirelessEnv(scenarios.familiar_topology(station_positions=None))
    env.reset(seed=0)
    before = np.array(env.global_state()["user_positions"])
    env.regenerate_topology(seed=99)
    after = np.array(env.global_state()["user_positions"])
    assert before.shape != after.shape or not np.allclose(before, after)
    # The same regeneration seed must reproduce it exactly.
    env2 = CooperativeWirelessEnv(scenarios.familiar_topology(station_positions=None))
    env2.reset(seed=0)
    env2.regenerate_topology(seed=99)
    assert np.allclose(np.array(env2.global_state()["user_positions"]), after)
    # And regenerating puts us back at the start of an episode.
    assert env.global_state()["step"] == 0


def test_user_counts_respect_the_configured_range() -> None:
    config = scenarios.familiar_topology(
        station_positions=None, regenerate_topology_on_reset=True
    )
    env = CooperativeWirelessEnv(config)
    low, high = config.users_per_station_range
    for seed in range(20):
        env.reset(seed=seed)
        counts = [len(indices) for indices in env.global_state()["station_user_indices"]]
        assert all(low <= count <= high for count in counts), counts


def test_users_are_placed_within_their_cell_radius() -> None:
    from wireless_env import physics

    config = scenarios.familiar_topology()
    env = CooperativeWirelessEnv(config)
    env.reset(seed=3)
    state = env.global_state()
    for user, station in enumerate(state["user_station"]):
        distance = physics.euclidean_distance(
            state["user_positions"][user], state["station_positions"][station]
        )
        assert distance <= config.user_radius + 1e-9


def test_mobility_moves_users_but_keeps_them_leashed_to_their_cell() -> None:
    from wireless_env import physics

    config = scenarios.familiar_topology(
        user_mobility=True, user_speed=0.5, max_steps=60
    )
    env = CooperativeWirelessEnv(config)
    env.reset(seed=0)
    start = np.array(env.global_state()["user_positions"])
    for _ in range(60):
        env.step({agent: 4 for agent in env.agents})
    state = env.global_state()
    end = np.array(state["user_positions"])
    assert not np.allclose(start, end), "mobility did not move anybody"
    leash = 1.5 * config.user_radius
    for user, station in enumerate(state["user_station"]):
        distance = physics.euclidean_distance(
            state["user_positions"][user], state["station_positions"][station]
        )
        assert distance <= leash + 1e-6
    assert np.all(end >= 0.0) and np.all(end <= config.area_size)


# --------------------------------------------------------------------------- #
# Physics wired into the environment
# --------------------------------------------------------------------------- #


def test_a_collision_lowers_throughput_and_raises_interference() -> None:
    """The COORDINATE chapter's core causal claim, measured in the environment."""
    config = scenarios.familiar_topology()
    orthogonal = rollout(CooperativeWirelessEnv(config), [(2, 5, 8)], seed=0)[0]
    collision = rollout(CooperativeWirelessEnv(config), [(2, 2, 2)], seed=0)[0]

    assert collision["metrics"]["total_capacity"] < orthogonal["metrics"]["total_capacity"]
    assert collision["metrics"]["total_throughput"] < orthogonal["metrics"]["total_throughput"]
    assert collision["metrics"]["total_interference"] > orthogonal["metrics"]["total_interference"]
    assert orthogonal["metrics"]["total_interference"] == pytest.approx(0.0)
    assert collision["metrics"]["channel_occupancy"] == [3, 0, 0]
    assert orthogonal["metrics"]["channel_occupancy"] == [1, 1, 1]
    assert collision["metrics"]["n_colliding_stations"] == 3
    assert orthogonal["metrics"]["n_colliding_stations"] == 0
    assert collision["reward"] < orthogonal["reward"]


def test_higher_power_helps_alone_and_a_partial_collision_sits_in_between() -> None:
    config = scenarios.familiar_topology()
    low = rollout(CooperativeWirelessEnv(config), [(0, 3, 6)], seed=0)[0]
    high = rollout(CooperativeWirelessEnv(config), [(2, 5, 8)], seed=0)[0]
    assert high["metrics"]["total_capacity"] > low["metrics"]["total_capacity"]

    partial = rollout(CooperativeWirelessEnv(config), [(2, 5, 5)], seed=0)[0]
    full = rollout(CooperativeWirelessEnv(config), [(2, 2, 2)], seed=0)[0]
    assert (
        full["metrics"]["total_capacity"]
        < partial["metrics"]["total_capacity"]
        < high["metrics"]["total_capacity"]
    )


def test_demand_caps_delivered_rate() -> None:
    """served = min(capacity, demand): capacity you cannot sell is not throughput."""
    config = scenarios.familiar_topology()
    env = CooperativeWirelessEnv(config)
    env.reset(seed=0)
    env.step({"bs_0": 2, "bs_1": 5, "bs_2": 8})
    state = env.global_state()
    served = np.array(state["user_served_rate"])
    capacity = np.array(state["user_capacity"])
    demand = np.array(state["user_demands"])
    assert np.allclose(served, np.minimum(capacity, demand))
    assert np.any(served < capacity - 1e-9), "no user was demand-limited in this state"

    uncapped = CooperativeWirelessEnv(config.replace(demand_limited=False))
    uncapped.reset(seed=0)
    uncapped.step({"bs_0": 2, "bs_1": 5, "bs_2": 8})
    assert np.allclose(
        np.array(uncapped.global_state()["user_served_rate"]),
        np.array(uncapped.global_state()["user_capacity"]),
    )


def test_a_noisy_channel_lowers_channel_quality_and_the_rate_it_delivers() -> None:
    config = scenarios.noisy_channel()
    env = CooperativeWirelessEnv(config)
    observations, _ = env.reset(seed=0)
    blocks = unpack_observation(observations["bs_0"], env.layout)
    quality = blocks["channel_quality"]
    # Channel 2 carries the extra noise, so its quality is visibly worse even
    # before anyone transmits -- the agents *can* detect it.
    assert quality[0] == pytest.approx(1.0)
    assert quality[1] == pytest.approx(1.0)
    assert quality[2] < 0.1

    # And using it really does deliver less: same station, clean vs noisy channel.
    clean = rollout(CooperativeWirelessEnv(config), [(2, 5, 8)], seed=0)[0]
    noisy = rollout(CooperativeWirelessEnv(config), [(8, 5, 2)], seed=0)[0]
    per_user_clean = np.array(clean["observations"]["bs_0"])
    assert clean["metrics"]["total_interference"] == pytest.approx(0.0)
    assert noisy["metrics"]["total_interference"] == pytest.approx(0.0)
    # Both allocations are collision-free, so any difference is the noise floor.
    assert noisy["metrics"]["total_capacity"] != pytest.approx(
        clean["metrics"]["total_capacity"]
    )
    assert per_user_clean.shape == (env.layout.size,)


def test_interference_only_accumulates_between_stations_sharing_a_channel() -> None:
    """Environment-level version of the physics indicator test."""
    config = scenarios.familiar_topology()
    env = CooperativeWirelessEnv(config)
    env.reset(seed=0)
    env.step({"bs_0": 2, "bs_1": 5, "bs_2": 8})  # all orthogonal
    assert np.allclose(env.global_state()["user_interference"], 0.0)

    env.reset(seed=0)
    env.step({"bs_0": 2, "bs_1": 2, "bs_2": 8})  # bs_0 and bs_1 share channel 0
    state = env.global_state()
    interference = np.array(state["user_interference"])
    station_of = np.array(state["user_station"])
    assert np.all(interference[station_of == 0] > 0.0)
    assert np.all(interference[station_of == 1] > 0.0)
    assert np.allclose(interference[station_of == 2], 0.0)


# --------------------------------------------------------------------------- #
# Reward composition
# --------------------------------------------------------------------------- #


def test_reward_terms_sum_to_the_reward() -> None:
    reward, terms = compute_team_reward(
        served_rates=[6.0, 2.0, 1.0],
        interference=[0.002, 0.0, 0.004],
        communication_bits=12.0,
        noise_power=1e-3,
        weights=RewardWeights(),
    )
    assert set(terms) == {"throughput", "fairness", "interference", "communication"}
    assert sum(terms.values()) == pytest.approx(reward)


def test_reward_is_the_documented_weighted_sum() -> None:
    """Recompute the reward by hand from the equation in the docstring."""
    from wireless_env import metrics

    served = [6.0, 2.0, 1.0]
    interference = [0.002, 0.0, 0.004]
    bits, noise = 12.0, 1e-3
    weights = RewardWeights(
        throughput=1.0, fairness=0.5, interference=0.1, communication=0.02
    )
    reward, _ = compute_team_reward(served, interference, bits, noise, weights)
    expected = (
        1.0 * metrics.mean_throughput(served)
        + 0.5 * metrics.jain_fairness(served)
        - 0.1 * (float(np.mean(interference)) / noise)
        - 0.02 * bits
    )
    assert reward == pytest.approx(expected)


def test_each_reward_weight_isolates_its_own_term() -> None:
    served = [6.0, 2.0, 1.0]
    interference = [0.002, 0.0, 0.004]
    only_throughput = RewardWeights(
        throughput=1.0, fairness=0.0, interference=0.0, communication=0.0
    )
    reward, terms = compute_team_reward(served, interference, 12.0, 1e-3, only_throughput)
    assert terms["fairness"] == 0.0
    assert terms["interference"] == 0.0
    assert terms["communication"] == 0.0
    assert reward == pytest.approx(np.mean(served))


def test_reward_prefers_equal_allocations_when_fairness_is_weighted() -> None:
    """The fairness weight has to actually change the ranking of allocations."""
    equal = [3.0, 3.0, 3.0]
    skewed = [9.0, 1.0, 1.0]  # higher total, much less fair
    interference = [0.0, 0.0, 0.0]

    throughput_only = RewardWeights(
        throughput=1.0, fairness=0.0, interference=0.0, communication=0.0
    )
    fairness_heavy = RewardWeights(
        throughput=1.0, fairness=8.0, interference=0.0, communication=0.0
    )
    assert (
        compute_team_reward(skewed, interference, 0.0, 1e-3, throughput_only)[0]
        > compute_team_reward(equal, interference, 0.0, 1e-3, throughput_only)[0]
    )
    assert (
        compute_team_reward(skewed, interference, 0.0, 1e-3, fairness_heavy)[0]
        < compute_team_reward(equal, interference, 0.0, 1e-3, fairness_heavy)[0]
    )


def test_communication_penalty_is_linear_in_bits_and_scaled_by_lambda() -> None:
    served, interference = [3.0, 3.0], [0.0, 0.0]
    weights = RewardWeights(communication=0.02)
    free = compute_team_reward(served, interference, 0.0, 1e-3, weights)[0]
    twelve = compute_team_reward(served, interference, 12.0, 1e-3, weights)[0]
    twentyfour = compute_team_reward(served, interference, 24.0, 1e-3, weights)[0]
    assert free - twelve == pytest.approx(0.24)
    assert free - twentyfour == pytest.approx(0.48)
    # lambda = 0 makes talking free.
    silent_weights = RewardWeights(communication=0.0)
    assert compute_team_reward(served, interference, 24.0, 1e-3, silent_weights)[0] == (
        pytest.approx(compute_team_reward(served, interference, 0.0, 1e-3, silent_weights)[0])
    )


def test_interference_penalty_is_measured_in_noise_floor_units() -> None:
    served = [3.0, 3.0]
    weights = RewardWeights(
        throughput=0.0, fairness=0.0, interference=1.0, communication=0.0
    )
    # Interference equal to the noise floor gives an INR of exactly 1.
    reward, terms = compute_team_reward(served, [1e-3, 1e-3], 0.0, 1e-3, weights)
    assert terms["interference"] == pytest.approx(-1.0)
    reward, terms = compute_team_reward(served, [1e-2, 1e-2], 0.0, 1e-3, weights)
    assert terms["interference"] == pytest.approx(-10.0)


def test_the_interference_penalty_can_dominate_the_reward_on_a_clustered_topology() -> None:
    """The documented reward-design weakness, verified rather than just claimed.

    The interference term is proportional to an interference-to-noise ratio and
    is unbounded above. On the clustered unseen topology a full collision drives
    it past the entire throughput term, so the reward there is effectively
    "avoid interference" and fairness stops mattering. The RewardWeights
    docstring says so; this test makes sure the statement stays true (and that
    a future reward redesign has to update the docstring with it).
    """
    config = scenarios.unseen_topology()
    env = CooperativeWirelessEnv(config)
    env.reset(seed=0)
    env.step({"bs_0": 2, "bs_1": 2, "bs_2": 2})  # everyone on channel 0, full power
    terms = env.metrics()["reward_terms"]
    assert abs(terms["interference"]) > terms["throughput"] + terms["fairness"]
    # On the familiar (spread out) deployment the same collision stays balanced.
    familiar = CooperativeWirelessEnv(scenarios.familiar_topology())
    familiar.reset(seed=0)
    familiar.step({"bs_0": 2, "bs_1": 2, "bs_2": 2})
    familiar_terms = familiar.metrics()["reward_terms"]
    assert abs(familiar_terms["interference"]) < familiar_terms["throughput"]


def test_reward_weights_reject_negative_penalties() -> None:
    with pytest.raises(ValueError, match="penalty weight"):
        RewardWeights(interference=-1.0)
    with pytest.raises(ValueError, match="penalty weight"):
        RewardWeights(communication=-1.0)


def test_compute_team_reward_guards_bad_input() -> None:
    with pytest.raises(ValueError, match="line up user by user"):
        compute_team_reward([1.0, 2.0], [0.0], 0.0, 1e-3, RewardWeights())
    with pytest.raises(ValueError, match="at least one user"):
        compute_team_reward([], [], 0.0, 1e-3, RewardWeights())
    with pytest.raises(ValueError, match="strictly positive"):
        compute_team_reward([1.0], [0.0], 0.0, 0.0, RewardWeights())


def test_the_environment_shares_one_reward_with_every_agent() -> None:
    env = CooperativeWirelessEnv(scenarios.familiar_topology())
    env.reset(seed=0)
    _, rewards, _, _, infos = env.step({"bs_0": 2, "bs_1": 2, "bs_2": 8})
    values = list(rewards.values())
    assert len(values) == 3
    assert all(value == values[0] for value in values), "the team reward must be shared"
    # And the breakdown reported to every agent sums to it.
    for info in infos.values():
        assert sum(info["reward_terms"].values()) == pytest.approx(values[0])


def test_custom_reward_weights_flow_through_the_environment() -> None:
    config = scenarios.familiar_topology(
        reward_weights=RewardWeights(
            throughput=1.0, fairness=0.0, interference=0.0, communication=0.0
        )
    )
    env = CooperativeWirelessEnv(config)
    env.reset(seed=0)
    _, rewards, _, _, _ = env.step({"bs_0": 2, "bs_1": 5, "bs_2": 8})
    metrics_block = env.metrics()
    assert next(iter(rewards.values())) == pytest.approx(
        metrics_block["mean_throughput"]
    )


# --------------------------------------------------------------------------- #
# Episode bookkeeping
# --------------------------------------------------------------------------- #


def test_episodes_end_by_truncation_never_by_termination() -> None:
    config = scenarios.familiar_topology(max_steps=5)
    env = CooperativeWirelessEnv(config)
    env.reset(seed=0)
    for step in range(1, 6):
        _, _, terminations, truncations, _ = env.step({a: 4 for a in env.agents})
        assert not any(terminations.values())
        assert all(truncations.values()) == (step == 5)


def test_metrics_are_empty_before_the_first_step() -> None:
    env = CooperativeWirelessEnv(scenarios.familiar_topology())
    env.reset(seed=0)
    assert env.metrics() == {}
    env.step({a: 4 for a in env.agents})
    assert env.metrics()["step"] == 1


def test_reset_returns_observations_and_infos() -> None:
    env = CooperativeWirelessEnv(scenarios.familiar_topology())
    observations, infos = env.reset(seed=0)
    assert set(observations) == set(env.agents)
    assert set(infos) == set(env.agents)


def test_render_reports_the_current_state() -> None:
    env = CooperativeWirelessEnv(scenarios.familiar_topology())
    env.reset(seed=0)
    env.step({"bs_0": 2, "bs_1": 5, "bs_2": 8})
    text = env.render()
    assert "familiar_topology" in text
    assert "bs_0" in text and "bs_2" in text
    assert "ch=0" in text and "high" in text
    assert "reward" in text
    with pytest.raises(ValueError, match="renders only"):
        env.render(mode="human")


# --------------------------------------------------------------------------- #
# Base-station failure
# --------------------------------------------------------------------------- #


def test_base_station_failure_silences_the_station_and_orphans_its_users() -> None:
    config = scenarios.base_station_failure()
    env = CooperativeWirelessEnv(config)
    env.reset(seed=0)
    orphans = env.global_state()["station_user_indices"][2]

    before = None
    for step in range(12):
        _, _, _, _, infos = env.step({a: encode_action(i % 3, 2)
                                      for i, a in enumerate(env.agents)})
        metrics_block = env.metrics()
        if metrics_block["step"] == 10:
            before = metrics_block
            assert metrics_block["n_operational_stations"] == 3
            assert infos["bs_2"]["operational"] is True
        if metrics_block["step"] == 11:
            after = metrics_block
            assert after["n_operational_stations"] == 2
            assert infos["bs_2"]["operational"] is False
            # Station 2 transmits nothing at all.
            assert infos["bs_2"]["power"] == 0.0
            assert all(rate == 0.0 for rate in infos["bs_2"]["own_served_rates"])
            # Its users are counted as unserved, and fairness pays for it.
            assert after["n_unserved_users"] == len(orphans)
            assert after["total_throughput"] < before["total_throughput"]
            assert after["jain_fairness"] < before["jain_fairness"]
            # The failed station stops interfering with everyone else.
            served = np.array(env.global_state()["user_served_rate"])
            assert np.all(served[orphans] == 0.0)


def test_a_failed_station_still_needs_an_action_and_it_is_ignored() -> None:
    config = scenarios.base_station_failure(failure_step=0)
    env = CooperativeWirelessEnv(config)
    env.reset(seed=0)
    assert env.global_state()["station_operational"] == [True, True, False]
    a = rollout(CooperativeWirelessEnv(config), [(2, 5, 0)], seed=0)[0]
    b = rollout(CooperativeWirelessEnv(config), [(2, 5, 8)], seed=0)[0]
    assert a["reward"] == pytest.approx(b["reward"])


def test_failure_frees_spectrum_for_the_survivors() -> None:
    """With one interferer gone, a shared channel becomes cheaper to use.

    Both effects of a failure have to be visible separately, because a student
    reading only the network total will misattribute the drop: the *survivors'*
    users get strictly better links, while the *network total* still falls
    because the orphaned users are served nothing.
    """
    healthy = scenarios.familiar_topology()
    failed = scenarios.familiar_topology(failed_stations=(2,), failure_step=0)

    env_with = CooperativeWirelessEnv(healthy)
    env_with.reset(seed=0)
    env_with.step({"bs_0": 2, "bs_1": 2, "bs_2": 2})
    env_without = CooperativeWirelessEnv(failed)
    env_without.reset(seed=0)
    env_without.step({"bs_0": 2, "bs_1": 2, "bs_2": 2})
    state_a, state_b = env_with.global_state(), env_without.global_state()

    survivor_users = [
        user for user, station in enumerate(state_a["user_station"]) if station in (0, 1)
    ]
    capacity_a = np.array(state_a["user_capacity"])[survivor_users]
    capacity_b = np.array(state_b["user_capacity"])[survivor_users]
    assert np.all(capacity_b > capacity_a), "losing an interferer must help survivors"
    assert (
        state_b["metrics"]["total_throughput"] < state_a["metrics"]["total_throughput"]
    ), "but the orphaned users still cost the network total"


def test_reassign_failure_mode_serves_the_orphaned_users() -> None:
    orphan = scenarios.base_station_failure(failure_step=0, failure_mode="orphan")
    reassign = scenarios.base_station_failure(failure_step=0, failure_mode="reassign")
    a = rollout(CooperativeWirelessEnv(orphan), [(2, 5, 8)], seed=0)[0]
    b = rollout(CooperativeWirelessEnv(reassign), [(2, 5, 8)], seed=0)[0]
    assert a["metrics"]["n_unserved_users"] > 0
    assert b["metrics"]["n_unserved_users"] == 0
    assert b["metrics"]["total_throughput"] > a["metrics"]["total_throughput"]
    assert b["metrics"]["jain_fairness"] > a["metrics"]["jain_fairness"]


# --------------------------------------------------------------------------- #
# Communication
# --------------------------------------------------------------------------- #


def test_communication_off_sends_nothing_and_leaves_the_message_block_empty() -> None:
    config = scenarios.communication_off()
    env = CooperativeWirelessEnv(config)
    observations, _ = env.reset(seed=0)
    observations, _, _, _, _ = env.step({"bs_0": 2, "bs_1": 5, "bs_2": 8})
    metrics_block = env.metrics()
    assert metrics_block["messages_sent"] == 0
    assert metrics_block["communication_overhead_bits"] == 0.0
    for observation in observations.values():
        blocks = unpack_observation(observation, env.layout)
        assert np.all(blocks["messages"] == 0.0)


def test_communication_on_charges_bits_and_delivers_messages() -> None:
    config = scenarios.communication_on()
    env = CooperativeWirelessEnv(config)
    observations, _ = env.reset(seed=0)
    observations, _, _, _, _ = env.step({"bs_0": 2, "bs_1": 5, "bs_2": 8})
    metrics_block = env.metrics()
    # Three live stations, each broadcasting to the other two.
    assert metrics_block["messages_sent"] == 6
    assert metrics_block["bits_per_message"] == 4
    assert metrics_block["communication_overhead_bits"] == pytest.approx(24.0)
    for observation in observations.values():
        blocks = unpack_observation(observation, env.layout)
        # Both neighbours' messages arrived.
        assert np.all(blocks["messages_by_sender"][:, 0] == 1.0)


def test_the_rule_based_message_really_encodes_the_senders_channel() -> None:
    """Bits 2 and 3 are the sender's channel index, most significant first."""
    config = scenarios.communication_on()
    env = CooperativeWirelessEnv(config)
    observations, _ = env.reset(seed=0)
    actions = {"bs_0": encode_action(0, 2), "bs_1": encode_action(1, 2),
               "bs_2": encode_action(2, 2)}
    observations, _, _, _, _ = env.step(actions)
    channels = {"bs_0": 0, "bs_1": 1, "bs_2": 2}
    for receiver in env.agents:
        blocks = unpack_observation(observations[receiver], env.layout)
        senders = [agent for agent in env.agents if agent != receiver]
        for slot, sender in enumerate(senders):
            row = blocks["messages_by_sender"][slot]
            assert row[0] == 1.0
            decoded = int(row[3]) * 2 + int(row[4])
            assert decoded == channels[sender], (
                f"{receiver} decoded channel {decoded} from {sender}, "
                f"expected {channels[sender]}"
            )


def test_reducing_the_bandwidth_truncates_the_message_but_keeps_the_layout() -> None:
    wide = CooperativeWirelessEnv(scenarios.communication_on())
    narrow = CooperativeWirelessEnv(scenarios.communication_on(bits_per_message=1))
    assert wide.layout.size == narrow.layout.size, "observation width must be stable"
    for env, expected_bits in ((wide, 4), (narrow, 1)):
        observations, _ = env.reset(seed=0)
        observations, _, _, _, _ = env.step({"bs_0": 2, "bs_1": 5, "bs_2": 8})
        blocks = unpack_observation(observations["bs_0"], env.layout)
        bits = blocks["messages_by_sender"][:, 1:]
        # Bits beyond the configured bandwidth are never transmitted.
        assert np.all(bits[:, expected_bits:] == 0.0)
        assert env.metrics()["communication_overhead_bits"] == pytest.approx(
            6 * expected_bits
        )


def test_dropped_messages_still_cost_their_bits() -> None:
    config = scenarios.reduced_communication(
        bits_per_message=4, comm_dropout_probability=1.0
    )
    env = CooperativeWirelessEnv(config)
    observations, _ = env.reset(seed=0)
    observations, _, _, _, _ = env.step({"bs_0": 2, "bs_1": 5, "bs_2": 8})
    metrics_block = env.metrics()
    assert metrics_block["messages_sent"] == 6
    assert metrics_block["communication_overhead_bits"] == pytest.approx(24.0)
    for observation in observations.values():
        blocks = unpack_observation(observation, env.layout)
        assert np.all(blocks["messages"] == 0.0), "every message should have been lost"


def test_communication_reduces_the_reward_when_lambda_is_positive() -> None:
    """Talking is not free: the same joint action scores lower with comms on."""
    silent = rollout(
        CooperativeWirelessEnv(scenarios.communication_off()), [(2, 5, 8)], seed=0
    )[0]
    talking = rollout(
        CooperativeWirelessEnv(scenarios.communication_on()), [(2, 5, 8)], seed=0
    )[0]
    assert talking["reward"] < silent["reward"]
    penalty = silent["reward"] - talking["reward"]
    assert penalty == pytest.approx(0.02 * 24.0)


def test_a_failed_station_neither_sends_nor_receives_messages() -> None:
    config = scenarios.communication_on(failed_stations=(2,), failure_step=0)
    env = CooperativeWirelessEnv(config)
    observations, _ = env.reset(seed=0)
    observations, _, _, _, _ = env.step({"bs_0": 2, "bs_1": 5, "bs_2": 8})
    # Only bs_0 <-> bs_1 remain, so two messages instead of six.
    assert env.metrics()["messages_sent"] == 2
    blocks = unpack_observation(observations["bs_2"], env.layout)
    assert np.all(blocks["messages"] == 0.0)


# --------------------------------------------------------------------------- #
# Config validation
# --------------------------------------------------------------------------- #


def test_config_is_frozen() -> None:
    config = scenarios.familiar_topology()
    with pytest.raises(dataclasses.FrozenInstanceError):
        config.n_channels = 5  # type: ignore[misc]


def test_config_replace_rejects_unknown_fields() -> None:
    with pytest.raises(ValueError, match="Unknown WirelessConfig field"):
        scenarios.familiar_topology().replace(nonexistent_field=1)


@pytest.mark.parametrize(
    "kwargs, needle",
    [
        ({"n_base_stations": 0}, "at least 1"),
        ({"n_channels": 0}, "at least 1"),
        ({"users_per_station_range": (0, 3)}, "at least one user"),
        ({"users_per_station_range": (4, 2)}, "low <= high"),
        ({"power_levels": (0.0, 0.5)}, "strictly positive"),
        ({"noise_power": 0.0}, "strictly positive"),
        ({"demand_persistence": 1.5}, "AR(1)"),
        ({"burst_probability": 2.0}, "probability"),
        ({"comm_dropout_probability": -0.1}, "probability"),
        ({"bits_per_message": 5}, "between 0 and 4"),
        ({"max_steps": 0}, "at least 1"),
        ({"channel_extra_noise": (0.0, 0.0)}, "one extra-noise value per"),
        ({"channel_extra_noise": (0.0, 0.0, -1.0)}, "non-negative"),
        ({"failed_stations": (7,)}, "numbered 0..2"),
        ({"failure_step": -2}, "non-negative or None"),
        ({"max_base_stations": 2}, "smaller than"),
        ({"station_positions": ((0.0, 0.0),)}, "n_base_stations"),
        ({"users_per_station": (2, 2)}, "n_base_stations"),
        ({"user_positions": ((1.0, 1.0),)}, "without users_per_station"),
    ],
)
def test_config_validation_messages_teach(kwargs: dict, needle: str) -> None:
    with pytest.raises(ValueError) as excinfo:
        WirelessConfig(**kwargs)
    assert needle in str(excinfo.value)


def test_unknown_agent_and_layout_errors() -> None:
    env = CooperativeWirelessEnv(scenarios.familiar_topology())
    with pytest.raises(ValueError, match="Unknown agent"):
        env.observation_space("bs_99")
    with pytest.raises(ValueError, match="sender_slot must be in"):
        env.layout.message_slice(5)


def test_unknown_station_layout_is_rejected_with_the_valid_options() -> None:
    with pytest.raises(ValueError) as excinfo:
        CooperativeWirelessEnv(
            scenarios.familiar_topology(
                station_layout="hexagonal", station_positions=None
            )
        )
    message = str(excinfo.value)
    assert "triangle" in message and "cluster" in message


def test_space_helpers_behave() -> None:
    space = Discrete(9)
    rng = np.random.default_rng(0)
    assert all(space.contains(space.sample(rng)) for _ in range(20))
    assert not space.contains(9)
    assert not space.contains(-1)
    assert not space.contains(1.5)
    assert not space.contains("x")
    assert space.shape == ()
    with pytest.raises(ValueError, match="n >= 1"):
        Discrete(0)

    box = Box(low=np.zeros(3, dtype=np.float32), high=np.ones(3, dtype=np.float32))
    assert box.contains(box.sample(rng))
    assert not box.contains(np.array([0.0, 0.0]))
    assert not box.contains(np.array([0.0, 0.0, 2.0]))
    with pytest.raises(ValueError, match="element for element"):
        Box(low=np.zeros(3), high=np.ones(2))


# --------------------------------------------------------------------------- #
# Fixture rollout replay
# --------------------------------------------------------------------------- #


def test_fixture_deterministic_rollout_replays_exactly(fixture: dict) -> None:
    """Replay the RNG-free fixture rollout: every number must still match.

    This is the fixture the TypeScript port reproduces, so a mismatch here means
    either the environment changed behaviour or the fixture is stale. Either way
    the browser lab would diverge from the notebooks.
    """
    block = fixture["rollout_deterministic"]
    assert block["python_only"] is False
    tolerance = fixture["tolerance"]

    stored = block["config"]
    config = WirelessConfig(
        name=stored["name"],
        description=stored["description"],
        n_base_stations=stored["n_base_stations"],
        n_channels=stored["n_channels"],
        station_positions=tuple(tuple(p) for p in stored["station_positions"]),
        users_per_station=tuple(stored["users_per_station"]),
        user_positions=tuple(tuple(p) for p in stored["user_positions"]),
        initial_demands=tuple(stored["initial_demands"]),
        demand_volatility=stored["demand_volatility"],
        user_mobility=stored["user_mobility"],
        communication=stored["communication"],
        bits_per_message=stored["bits_per_message"],
        comm_dropout_probability=stored["comm_dropout_probability"],
        max_steps=stored["max_steps"],
        seed=stored["seed"],
    )
    env = CooperativeWirelessEnv(config)
    observations, _ = env.reset(seed=None)
    for agent, expected in block["initial_observations"].items():
        assert np.allclose(observations[agent], expected, atol=1e-6)

    for entry in block["trace"]:
        actions = {agent: int(a) for agent, a in entry["actions"].items()}
        observations, rewards, _, _, _ = env.step(actions)
        assert float(next(iter(rewards.values()))) == pytest.approx(
            entry["reward"], abs=tolerance
        )
        team = env.metrics()
        for key, expected in entry["metrics"].items():
            actual = team[key]
            if isinstance(expected, list):
                assert list(actual) == expected, key
            elif isinstance(expected, bool):
                assert bool(actual) == expected, key
            else:
                assert float(actual) == pytest.approx(
                    expected, abs=max(tolerance, abs(expected) * 1e-9)
                ), key
        for name, expected in entry["reward_terms"].items():
            assert team["reward_terms"][name] == pytest.approx(expected, abs=tolerance)
        state = env.global_state()
        for key in ("user_sinr", "user_capacity", "user_served_rate", "user_interference"):
            assert np.allclose(state[key], entry[key], atol=tolerance)
        for agent, expected in entry["observations"].items():
            assert np.allclose(observations[agent], expected, atol=1e-6), agent


def test_fixture_deterministic_rollout_uses_no_random_numbers(fixture: dict) -> None:
    """The fixture rollout must not touch the RNG, or the port cannot match it.

    Enforced by replacing the environment's generator with one that raises on
    any use.
    """
    from wireless_env.fixtures.generate_test_vectors import (
        FIXTURE_ACTIONS,
        deterministic_config,
    )

    class ExplodingGenerator:
        def __getattr__(self, name: str) -> object:
            raise AssertionError(
                f"the deterministic fixture rollout called rng.{name}(); it must "
                "not use random numbers, or the TypeScript port cannot reproduce it"
            )

    env = CooperativeWirelessEnv(deterministic_config())
    env.reset(seed=None)
    env._rng = ExplodingGenerator()  # type: ignore[assignment]
    for step_actions in FIXTURE_ACTIONS:
        env.step({f"bs_{i}": int(a) for i, a in enumerate(step_actions)})
    assert env.metrics()["step"] == len(FIXTURE_ACTIONS)


def test_fixture_seeded_rollout_still_reproduces(fixture: dict) -> None:
    """The numpy-seeded rollout is a Python regression lock on env behaviour."""
    from wireless_env import baselines

    block = fixture["rollout_seeded_numpy"]
    assert block["python_only"] is True
    config = scenarios.familiar_topology(max_steps=10)
    env = CooperativeWirelessEnv(config)
    policy = baselines.RandomPolicy(config, seed=0)
    summary = baselines.run_episode(env, policy, seed=0, collect_trace=True)
    for entry, expected in zip(summary["trace"], block["trace"]):
        assert entry["actions"] == {k: int(v) for k, v in expected["actions"].items()}
        assert entry["reward"] == pytest.approx(expected["reward"], abs=1e-9)
    assert summary["episode_return"] == pytest.approx(
        block["summary"]["episode_return"], abs=1e-9
    )


def test_fixture_reward_cases_match_the_code(fixture: dict) -> None:
    for entry in fixture["reward"]["cases"]:
        args = dict(entry["args"])
        weights = RewardWeights(**args.pop("weights"))
        reward, terms = compute_team_reward(weights=weights, **args)
        assert reward == pytest.approx(entry["expect"]["reward"], abs=1e-9)
        for name, expected in entry["expect"]["terms"].items():
            assert terms[name] == pytest.approx(expected, abs=1e-9)


def test_fixture_action_table_matches_the_code(fixture: dict) -> None:
    for row in fixture["actions"]["table"]:
        assert decode_action(row["action"]) == (row["channel"], row["power_level"])
        assert encode_action(row["channel"], row["power_level"]) == row["action"]
        assert POWER_LABELS[row["power_level"]] == row["power_label"]


def test_fixture_observation_layout_matches_the_code(fixture: dict) -> None:
    from wireless_env.fixtures.generate_test_vectors import deterministic_config

    layout = observation_layout(deterministic_config())
    block = fixture["observation_layout"]
    assert block["size"] == layout.size
    for entry in block["blocks"]:
        actual = getattr(layout, entry["name"])
        assert (actual.start, actual.stop) == (entry["start"], entry["stop"])
