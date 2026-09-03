"""WirelessResourceAllocationEnv: API, physics, interventions, reproducibility."""

import itertools

import numpy as np
import pytest

from cooperative_marl_labs.envs.wireless_resource_allocation import (
    NEGLIGIBLE_COUPLING,
    WirelessResourceAllocationEnv,
    achievable_rate,
    extract_channel_quality,
    extract_demand,
    extract_interference,
    extract_previous_channel,
    observation_layout,
)

# --------------------------------------------------------------- ParallelEnv


def test_reset_and_step_shapes():
    env = WirelessResourceAllocationEnv()
    obs, infos = env.reset(seed=0)
    assert set(obs) == set(env.possible_agents)
    assert set(infos) == set(env.possible_agents)
    result = env.step({a: 0 for a in env.possible_agents})
    assert len(result) == 5


def test_observations_match_declared_spaces():
    for communication in (False, True):
        env = WirelessResourceAllocationEnv(communication=communication)
        obs, _ = env.reset(seed=1)
        for agent in env.possible_agents:
            assert env.observation_space(agent).contains(obs[agent]), (
                f"observation outside its space for {agent}, "
                f"communication={communication}"
            )


def test_action_space_is_one_channel_choice():
    env = WirelessResourceAllocationEnv(n_channels=3)
    assert env.action_space("ap_0").n == 3


def test_episode_terminates_after_n_steps():
    env = WirelessResourceAllocationEnv(n_steps=3)
    env.reset(seed=0)
    for step in range(3):
        _, _, terminations, truncations, _ = env.step(
            {a: 0 for a in env.possible_agents}
        )
        assert all(terminations.values()) == (step == 2)
        assert not any(truncations.values())
    assert env.agents == []


def test_step_before_reset_raises():
    env = WirelessResourceAllocationEnv()
    with pytest.raises(RuntimeError):
        env.step({a: 0 for a in env.possible_agents})


def test_pettingzoo_parallel_api():
    from pettingzoo.test import parallel_api_test

    env = WirelessResourceAllocationEnv()
    parallel_api_test(env, num_cycles=20)


# ---------------------------------------------------------------- the physics


def test_rate_decreases_as_interference_grows():
    rates = [achievable_rate(1.0, i) for i in (0.0, 0.3, 0.7, 1.4)]
    assert rates == sorted(rates, reverse=True)
    assert rates[0] > rates[-1]


def test_channel_quality_raises_the_rate():
    assert achievable_rate(1.0, 0.2) > achievable_rate(0.5, 0.2)


def test_coupling_falls_off_with_distance():
    env = WirelessResourceAllocationEnv()
    g = env.coupling
    assert np.allclose(g, g.T), "coupling must be symmetric"
    assert np.allclose(np.diag(g), 0.0), "no access point interferes with itself"
    # ap_0 and ap_1 are the overlapping pair, ap_3 is the far one
    assert g[0, 1] > g[0, 2] > g[0, 3]


def test_throughput_falls_when_a_close_pair_shares_a_channel():
    """The headline physics: sharing hurts, and it hurts more when close."""
    env = WirelessResourceAllocationEnv()
    env.reset(seed=0)
    for agent in env.possible_agents:
        env.set_traffic(agent, 4.0)  # demand high enough not to cap anything
    env.reset(seed=0)

    spread = env.outcome([0, 1, 2, 0])       # the far pair shares
    close = env.outcome([0, 0, 1, 2])        # the overlapping pair shares
    assert close["total_throughput"] < spread["total_throughput"]
    assert close["interference"] > spread["interference"]


def test_all_on_one_channel_is_the_worst_case():
    env = WirelessResourceAllocationEnv()
    env.reset(seed=3)
    crowded = env.outcome([0, 0, 0, 0])["team_reward"]
    others = [
        env.outcome(list(a))["team_reward"]
        for a in itertools.product(range(3), repeat=4)
        if len(set(a)) > 1
    ]
    assert crowded <= min(others)


def test_demand_caps_useful_throughput():
    env = WirelessResourceAllocationEnv()
    env.reset(seed=0)
    for agent in env.possible_agents:
        env.set_traffic(agent, 0.5)
    env.reset(seed=0)
    out = env.outcome([0, 1, 2, 0])
    # every access point is served at its demand, never above it
    assert np.allclose(out["per_ap_throughput"], 0.5)
    assert out["total_throughput"] == pytest.approx(2.0)


def test_collision_rate_ignores_distant_pairs():
    """
    With four access points on three channels, one pair must share. Counting
    that as a collision would make every policy look equally bad.
    """
    env = WirelessResourceAllocationEnv()
    env.reset(seed=0)
    far_pair = env.outcome([0, 1, 2, 0])     # ap_0 with ap_3, coupling ~0.06
    close_pair = env.outcome([0, 0, 1, 2])   # ap_0 with ap_1, coupling ~0.67
    assert far_pair["collision_rate"] == 0.0
    assert close_pair["collision_rate"] > 0.0
    assert env.coupling[0, 3] <= NEGLIGIBLE_COUPLING < env.coupling[0, 1]


def test_best_possible_dominates_every_allocation():
    env = WirelessResourceAllocationEnv()
    env.reset(seed=7)
    ceiling = env.best_possible()
    for allocation in itertools.product(range(env.n_channels), repeat=env.n_agents):
        assert env.outcome(list(allocation))["team_reward"] <= ceiling + 1e-9


def test_min_interference_is_a_real_floor():
    env = WirelessResourceAllocationEnv()
    env.reset(seed=7)
    floor = env.min_interference()
    assert floor > 0.0, "four access points on three channels must share something"
    for allocation in itertools.product(range(env.n_channels), repeat=env.n_agents):
        assert env.outcome(list(allocation))["interference"] >= floor - 1e-9


def test_metrics_have_the_documented_keys():
    env = WirelessResourceAllocationEnv()
    env.reset(seed=0)
    out = env.outcome([0, 1, 2, 0])
    for key in (
        "team_reward",
        "total_throughput",
        "mean_throughput",
        "interference",
        "collision_rate",
        "messages_sent",
    ):
        assert key in out, f"missing metric: {key}"
    assert out["mean_throughput"] == pytest.approx(
        out["total_throughput"] / env.n_agents
    )


def test_interference_weight_changes_the_reward():
    lenient = WirelessResourceAllocationEnv(interference_weight=0.0)
    strict = WirelessResourceAllocationEnv(interference_weight=1.0)
    for env in (lenient, strict):
        env.reset(seed=0)
    colliding = [0, 0, 1, 2]
    assert (
        strict.outcome(colliding)["team_reward"]
        < lenient.outcome(colliding)["team_reward"]
    )


def test_communication_costs_reward():
    quiet = WirelessResourceAllocationEnv(communication=False)
    talking = WirelessResourceAllocationEnv(
        communication=True, communication_weight=0.05
    )
    for env in (quiet, talking):
        env.reset(seed=5)
    talking.demand = quiet.demand.copy()
    allocation = [0, 1, 2, 0]
    assert talking.outcome(allocation)["messages_sent"] == talking.n_agents
    assert quiet.outcome(allocation)["messages_sent"] == 0
    assert (
        talking.outcome(allocation)["team_reward"]
        < quiet.outcome(allocation)["team_reward"]
    )


# ------------------------------------------------------------ the observation


def test_observation_layout_shifts_only_when_communication_is_on():
    quiet = observation_layout(3, 4, communication=False)
    talking = observation_layout(3, 4, communication=True)
    for field in ("demand", "channel_quality", "interference", "previous_channel"):
        assert quiet[field] == talking[field]
    assert "messages" not in quiet
    assert talking["messages"] == slice(8, 11)


def test_extract_helpers_read_the_right_fields():
    env = WirelessResourceAllocationEnv()
    obs, _ = env.reset(seed=11)
    o = obs["ap_0"]
    assert extract_demand(o) == pytest.approx(float(env.demand[0]), abs=1e-5)
    assert np.allclose(extract_channel_quality(o), env.quality[0], atol=1e-5)
    assert np.allclose(extract_interference(o), 0.0)  # nothing has happened yet
    assert extract_previous_channel(o) == -1

    env.step({a: i % 3 for i, a in enumerate(env.possible_agents)})
    o = env._obs_for(0)
    assert extract_previous_channel(o) == 0


def test_extract_helpers_need_the_env_when_communication_is_on():
    env = WirelessResourceAllocationEnv(communication=True)
    obs, _ = env.reset(seed=11)
    o = obs["ap_0"]
    # with the env supplied the slices are right
    assert len(extract_channel_quality(o, env)) == env.n_channels
    assert len(extract_interference(o, env)) == env.n_channels
    # an int works too
    assert len(extract_interference(o, env.n_channels)) == env.n_channels


def test_extract_refuses_an_ambiguous_length():
    with pytest.raises(ValueError, match="cannot infer n_channels"):
        extract_interference(np.zeros(7))


def test_state_is_not_in_any_observation():
    """Centralized information must not leak into a decentralized input."""
    env = WirelessResourceAllocationEnv()
    obs, _ = env.reset(seed=2)
    state = env.state()
    for i, agent in enumerate(env.possible_agents):
        others = [d for j, d in enumerate(state["demand"]) if j != i]
        for value in others:
            if value not in state["demand"][i : i + 1]:
                assert not np.any(np.isclose(obs[agent], value, atol=1e-6)), (
                    "another access point's demand appeared in a local observation"
                )


# ------------------------------------------------------------- interventions


def test_set_traffic_pins_demand():
    env = WirelessResourceAllocationEnv()
    env.set_traffic("ap_2", demand=1.0)
    env.reset(seed=0)
    assert env.demand[2] == pytest.approx(1.0)
    env.clear_traffic()
    env.reset(seed=0)
    assert env.demand[2] != pytest.approx(1.0) or env.traffic == "uniform"


def test_set_traffic_rejects_an_unknown_agent():
    env = WirelessResourceAllocationEnv()
    with pytest.raises(KeyError):
        env.set_traffic("ap_99", demand=1.0)


def test_set_channel_quality_is_per_agent():
    env = WirelessResourceAllocationEnv()
    env.set_channel_quality(agent="ap_1", channel=1, quality=0.25)
    env.reset(seed=0)
    assert env.quality[1, 1] == pytest.approx(0.25)
    assert env.quality[0, 1] == pytest.approx(1.0)
    obs = env._obs_for(1)
    assert extract_channel_quality(obs)[1] == pytest.approx(0.25, abs=1e-6)


def test_degrading_a_channel_lowers_the_reward_for_using_it():
    env = WirelessResourceAllocationEnv()
    env.reset(seed=0)
    for agent in env.possible_agents:
        env.set_traffic(agent, 4.0)
    env.reset(seed=0)
    before = env.outcome([0, 1, 2, 0])["team_reward"]
    env.set_channel_quality(agent="ap_1", channel=1, quality=0.2)
    after = env.outcome([0, 1, 2, 0])["team_reward"]
    assert after < before


def test_set_channel_quality_validates_its_arguments():
    env = WirelessResourceAllocationEnv()
    with pytest.raises(IndexError):
        env.set_channel_quality(agent="ap_0", channel=9, quality=1.0)
    with pytest.raises(ValueError):
        env.set_channel_quality(agent="ap_0", channel=0, quality=-1.0)


def test_message_loss_blanks_some_message_fields():
    env = WirelessResourceAllocationEnv(communication=True)
    env.set_message_loss(1.0)
    obs, _ = env.reset(seed=0)
    layout = env.observation_layout()
    for agent in env.possible_agents:
        assert np.allclose(obs[agent][layout["messages"]], 0.0)


def test_message_loss_validates_its_argument():
    env = WirelessResourceAllocationEnv(communication=True)
    with pytest.raises(ValueError):
        env.set_message_loss(1.5)


def test_set_communication_changes_the_observation_length():
    env = WirelessResourceAllocationEnv(communication=False)
    obs, _ = env.reset(seed=0)
    short = len(obs["ap_0"])
    env.set_communication(True)
    obs, _ = env.reset(seed=0)
    assert len(obs["ap_0"]) == short + env.n_agents - 1


def test_unknown_traffic_regime_is_rejected():
    with pytest.raises(ValueError, match="unknown traffic regime"):
        WirelessResourceAllocationEnv(traffic="nonsense")


def test_positions_must_match_the_team_size():
    with pytest.raises(ValueError, match="positions must have shape"):
        WirelessResourceAllocationEnv(n_agents=4, positions=((0.0, 0.0),))


def test_a_bigger_team_gets_a_default_layout():
    env = WirelessResourceAllocationEnv(n_agents=6, n_channels=3)
    assert env.positions.shape == (6, 2)
    env.reset(seed=0)
    assert len(env.outcome([0, 1, 2, 0, 1, 2])["per_ap_throughput"]) == 6


# --------------------------------------------------------------- determinism


def test_seeding_is_reproducible():
    a = WirelessResourceAllocationEnv(communication=True)
    b = WirelessResourceAllocationEnv(communication=True)
    obs_a, _ = a.reset(seed=99)
    obs_b, _ = b.reset(seed=99)
    for agent in a.possible_agents:
        assert np.allclose(obs_a[agent], obs_b[agent])
    for _ in range(4):
        step_a = a.step({x: 1 for x in a.possible_agents})
        step_b = b.step({x: 1 for x in b.possible_agents})
        for agent in a.possible_agents:
            assert np.allclose(step_a[0][agent], step_b[0][agent])
            assert step_a[1][agent] == pytest.approx(step_b[1][agent])


def test_different_seeds_give_different_demand_eventually():
    env = WirelessResourceAllocationEnv()
    seen = set()
    for seed in range(12):
        env.reset(seed=seed)
        seen.add(tuple(np.round(env.demand, 2)))
    assert len(seen) > 1
