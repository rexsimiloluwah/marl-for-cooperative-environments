"""Tests for :mod:`wireless_env.scenarios`."""

from __future__ import annotations

import numpy as np
import pytest

from wireless_env import scenarios
from wireless_env.environment import (
    CooperativeWirelessEnv,
    WirelessConfig,
    encode_action,
    observation_layout,
)


# --------------------------------------------------------------------------- #
# Registry
# --------------------------------------------------------------------------- #


def test_the_evaluation_suite_is_the_seven_required_scenarios_in_order() -> None:
    """The final project's evaluation list, exactly."""
    assert scenarios.EVALUATION_SUITE == (
        "familiar_topology",
        "unseen_topology",
        "traffic_surge",
        "noisy_channel",
        "base_station_failure",
        "new_base_station_joins",
        "reduced_communication",
    )
    assert all(name in scenarios.SCENARIOS for name in scenarios.EVALUATION_SUITE)
    # The familiar topology has to come first: it is the reference every
    # generalization gap is measured against.
    assert scenarios.EVALUATION_SUITE[0] == "familiar_topology"


def test_every_scenario_names_itself() -> None:
    """The config carries its own label, so results tables cannot mislabel a row."""
    for name, constructor in scenarios.SCENARIOS.items():
        config = constructor()
        assert isinstance(config, WirelessConfig)
        assert config.name == name
        assert config.description and len(config.description) > 30


def test_make_scenario_and_overrides() -> None:
    assert scenarios.make_scenario("noisy_channel").name == "noisy_channel"
    assert scenarios.make_scenario("familiar_topology", max_steps=5).max_steps == 5
    # Overrides compose: a surge *and* a failure, in one config.
    combined = scenarios.traffic_surge(failed_stations=(2,), failure_step=3)
    assert combined.burst_probability > 0.0
    assert combined.failed_stations == (2,)
    assert combined.failure_step == 3


def test_make_scenario_rejects_an_unknown_name_helpfully() -> None:
    with pytest.raises(KeyError) as excinfo:
        scenarios.make_scenario("no_such_scenario")
    message = str(excinfo.value)
    assert "familiar_topology" in message
    assert "evaluation suite" in message


def test_describe_suite_covers_the_suite() -> None:
    described = scenarios.describe_suite()
    assert tuple(described) == scenarios.EVALUATION_SUITE
    assert all(text for text in described.values())


def test_every_scenario_builds_and_runs_a_full_episode() -> None:
    """Nothing in the suite may crash, and every episode must produce metrics."""
    for name in scenarios.SCENARIOS:
        config = scenarios.make_scenario(name, max_steps=6)
        env = CooperativeWirelessEnv(config)
        observations, _ = env.reset(seed=0)
        for _ in range(6):
            actions = {
                agent: encode_action(index % config.n_channels, 2)
                for index, agent in enumerate(env.agents)
            }
            observations, rewards, terminations, truncations, infos = env.step(actions)
        metrics_block = env.metrics()
        assert metrics_block["step"] == 6, name
        assert metrics_block["n_users"] > 0, name
        assert np.isfinite(metrics_block["reward"]), name
        assert all(truncations.values()), name


# --------------------------------------------------------------------------- #
# Individual scenarios test what they claim to test
# --------------------------------------------------------------------------- #


def test_familiar_topology_is_the_stable_control_condition() -> None:
    config = scenarios.familiar_topology()
    assert config.station_positions == scenarios.DEFAULT_STATION_POSITIONS
    assert config.regenerate_topology_on_reset is False
    assert config.communication is False
    assert config.failed_stations == ()
    assert config.channel_extra_noise is None
    assert config.user_mobility is False
    # An orthogonal allocation exists, which is what makes a ceiling computable.
    assert config.n_base_stations <= config.n_channels
    # The three stations really do form an equilateral triangle.
    positions = np.array(config.station_positions)
    sides = [
        np.linalg.norm(positions[i] - positions[j]) for i, j in ((0, 1), (1, 2), (2, 0))
    ]
    assert np.allclose(sides, sides[0])


def test_unseen_topology_is_a_genuine_deployment_shift() -> None:
    familiar = CooperativeWirelessEnv(scenarios.familiar_topology())
    unseen = CooperativeWirelessEnv(scenarios.unseen_topology())
    familiar.reset(seed=0)
    unseen.reset(seed=0)
    familiar_positions = np.array(familiar.global_state()["station_positions"])
    unseen_positions = np.array(unseen.global_state()["station_positions"])
    assert not np.allclose(familiar_positions, unseen_positions)

    def mean_pairwise(positions: np.ndarray) -> float:
        return float(
            np.mean(
                [
                    np.linalg.norm(positions[i] - positions[j])
                    for i in range(len(positions))
                    for j in range(i + 1, len(positions))
                ]
            )
        )

    # Clustered stations sit much closer together, so they couple far harder.
    assert mean_pairwise(unseen_positions) < 0.5 * mean_pairwise(familiar_positions)
    # Same agent and action count, so a policy can at least be *run* on it.
    assert unseen.config.n_base_stations == familiar.config.n_base_stations
    assert unseen.layout.size == familiar.layout.size


def test_clustered_unseen_topology_makes_collisions_hurt_more() -> None:
    """The mechanism behind the shift, measured rather than asserted."""

    def collision_cost(config: WirelessConfig) -> float:
        env_clean = CooperativeWirelessEnv(config)
        env_clean.reset(seed=0)
        env_clean.step({f"bs_{i}": encode_action(i, 2) for i in range(3)})
        clean = env_clean.metrics()["total_capacity"]
        env_hit = CooperativeWirelessEnv(config)
        env_hit.reset(seed=0)
        env_hit.step({f"bs_{i}": encode_action(0, 2) for i in range(3)})
        collided = env_hit.metrics()["total_capacity"]
        return (clean - collided) / clean

    familiar_cost = collision_cost(scenarios.familiar_topology())
    unseen_cost = collision_cost(scenarios.unseen_topology())
    assert unseen_cost > familiar_cost


def test_traffic_surge_raises_demand_and_makes_capacity_the_binding_constraint() -> None:
    familiar = scenarios.familiar_topology()
    surge = scenarios.traffic_surge()
    assert surge.demand_mean > familiar.demand_mean
    assert surge.demand_max > familiar.demand_max
    assert surge.demand_volatility > familiar.demand_volatility
    assert surge.burst_probability > 0.0

    def unmet_fraction(config: WirelessConfig) -> float:
        env = CooperativeWirelessEnv(config)
        env.reset(seed=0)
        for _ in range(10):
            env.step({f"bs_{i}": encode_action(i, 2) for i in range(3)})
        metrics_block = env.metrics()
        return 1.0 - metrics_block["mean_satisfaction"]

    # Under the surge, far more demand goes unmet even with a perfect allocation.
    assert unmet_fraction(surge) > unmet_fraction(familiar)


def test_noisy_channel_adds_noise_to_exactly_one_channel() -> None:
    config = scenarios.noisy_channel()
    assert config.channel_extra_noise is not None
    extra = np.array(config.channel_extra_noise)
    assert extra.shape == (3,)
    assert extra[0] == 0.0 and extra[1] == 0.0
    assert extra[2] == pytest.approx(30.0 * config.noise_power)

    # Using the noisy channel really costs rate, all else equal.
    def capacity_on(channel: int) -> float:
        env = CooperativeWirelessEnv(config)
        env.reset(seed=0)
        others = [c for c in range(3) if c != channel]
        env.step(
            {
                "bs_0": encode_action(channel, 2),
                "bs_1": encode_action(others[0], 2),
                "bs_2": encode_action(others[1], 2),
            }
        )
        state = env.global_state()
        own = state["station_user_indices"][0]
        return float(np.sum(np.array(state["user_capacity"])[own]))

    assert capacity_on(2) < capacity_on(0)
    assert capacity_on(0) == pytest.approx(capacity_on(1))


def test_base_station_failure_config_and_timing() -> None:
    config = scenarios.base_station_failure()
    assert config.failed_stations == (2,)
    assert config.failure_step == 10
    assert config.failure_mode == "orphan"
    env = CooperativeWirelessEnv(config)
    env.reset(seed=0)
    # Healthy for exactly ten reported steps.
    for _ in range(10):
        env.step({f"bs_{i}": encode_action(i, 2) for i in range(3)})
    assert env.metrics()["n_operational_stations"] == 3
    env.step({f"bs_{i}": encode_action(i, 2) for i in range(3)})
    assert env.metrics()["n_operational_stations"] == 2


def test_new_base_station_joins_keeps_the_original_stations_and_breaks_orthogonality() -> None:
    config = scenarios.new_base_station_joins()
    assert config.n_base_stations == 4
    assert config.n_channels == 3
    # More stations than channels: no collision-free allocation exists.
    assert config.n_base_stations > config.n_channels
    # The original three towers have not moved.
    assert config.station_positions[:3] == scenarios.DEFAULT_STATION_POSITIONS
    # The new one is in the middle of the map, which is what makes it visible.
    assert config.station_positions[3] == (5.0, 5.0)
    env = CooperativeWirelessEnv(config)
    env.reset(seed=0)
    assert env.agents == ["bs_0", "bs_1", "bs_2", "bs_3"]
    # Whatever the four stations do, at least two of them must share a channel.
    for offset in range(3):
        env.reset(seed=0)
        env.step(
            {f"bs_{i}": encode_action((i + offset) % 3, 2) for i in range(4)}
        )
        assert env.metrics()["n_colliding_stations"] >= 2


def test_padding_makes_the_joined_topology_observation_compatible() -> None:
    """The documented recipe for evaluating one policy on both deployments."""
    plain_familiar = observation_layout(scenarios.familiar_topology())
    joined = observation_layout(scenarios.new_base_station_joins())
    assert plain_familiar.size != joined.size, "the mismatch is real, not hidden"

    padded_familiar = observation_layout(
        scenarios.familiar_topology(max_base_stations=4)
    )
    assert padded_familiar.size == joined.size
    # And the padded familiar env still only has three agents.
    env = CooperativeWirelessEnv(scenarios.familiar_topology(max_base_stations=4))
    observations, _ = env.reset(seed=0)
    assert len(env.agents) == 3
    assert observations["bs_0"].shape == (joined.size,)


def test_reduced_communication_degrades_but_still_charges() -> None:
    full = scenarios.communication_on()
    reduced = scenarios.reduced_communication()
    assert full.bits_per_message == 4
    assert reduced.bits_per_message == 1
    assert reduced.comm_dropout_probability == pytest.approx(0.25)
    assert reduced.communication is True

    env = CooperativeWirelessEnv(reduced)
    observations, _ = env.reset(seed=0)
    delivered = 0
    charged = 0.0
    for _ in range(40):
        observations, _, _, _, _ = env.step(
            {f"bs_{i}": encode_action(i, 2) for i in range(3)}
        )
        metrics_block = env.metrics()
        charged += metrics_block["communication_overhead_bits"]
        from wireless_env.environment import unpack_observation

        blocks = unpack_observation(observations["bs_0"], env.layout)
        delivered += int(blocks["messages_by_sender"][:, 0].sum())
    # Some messages were lost...
    assert delivered < 40 * 2
    # ...but every transmitted bit was still paid for.
    assert charged == pytest.approx(40 * 6 * 1)


def test_communication_off_and_on_are_a_matched_pair() -> None:
    off = scenarios.communication_off()
    on = scenarios.communication_on()
    for field in (
        "n_base_stations",
        "n_channels",
        "station_positions",
        "demand_mean",
        "noise_power",
        "seed",
    ):
        assert getattr(off, field) == getattr(on, field), field
    assert off.communication is False and off.bits_per_message == 0
    assert on.communication is True and on.bits_per_message == 4
    # Same observation width, so one policy can be run on both.
    assert observation_layout(off).size == observation_layout(on).size


def test_varied_topology_training_is_not_in_the_evaluation_suite() -> None:
    """Evaluating on the training distribution measures nothing about transfer."""
    assert "varied_topology_training" not in scenarios.EVALUATION_SUITE
    config = scenarios.varied_topology_training()
    assert config.regenerate_topology_on_reset is True
    assert config.user_mobility is True


def test_scenario_seeds_are_distinct_so_deployments_differ() -> None:
    seeds = [scenarios.make_scenario(name).seed for name in scenarios.EVALUATION_SUITE]
    assert len(set(seeds)) == len(seeds), f"scenarios share a seed: {seeds}"
