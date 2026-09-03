"""Tests for :mod:`wireless_env.physics`."""

from __future__ import annotations

import inspect
import json
import math
from pathlib import Path

import numpy as np
import pytest

from wireless_env import physics

FIXTURE_PATH = Path(__file__).resolve().parents[1] / "fixtures" / "test_vectors.json"


@pytest.fixture(scope="module")
def fixture() -> dict:
    """The cross-validation fixture the TypeScript port is checked against."""
    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


# --------------------------------------------------------------------------- #
# Module contract: pure functions, no classes, no state
# --------------------------------------------------------------------------- #


def test_physics_module_defines_no_classes() -> None:
    """physics.py must contain pure functions only -- it is ported to TypeScript.

    The port is a line-for-line translation, so a class or any hidden state
    here would silently become a divergence between the notebooks and the
    browser lab.
    """
    own_classes = [
        name
        for name, obj in inspect.getmembers(physics, inspect.isclass)
        if getattr(obj, "__module__", None) == physics.__name__
    ]
    assert own_classes == [], f"physics.py should define no classes, found {own_classes}"


def test_physics_functions_are_deterministic_and_stateless() -> None:
    """Calling the same function twice with the same arguments must match exactly."""
    first = (
        physics.channel_gain(2.5),
        physics.total_interference([1.0, 0.5], [0.02, 0.01], [1, 0]),
        physics.sinr(1.0, 0.05, [1.0], [0.01], [1], 1e-3),
        physics.shannon_rate(12.0),
    )
    second = (
        physics.channel_gain(2.5),
        physics.total_interference([1.0, 0.5], [0.02, 0.01], [1, 0]),
        physics.sinr(1.0, 0.05, [1.0], [0.01], [1], 1e-3),
        physics.shannon_rate(12.0),
    )
    assert first == second


# --------------------------------------------------------------------------- #
# channel_gain
# --------------------------------------------------------------------------- #


def test_channel_gain_matches_the_equation() -> None:
    """g = 1 / (d + eps)^alpha, checked against hand-computed values."""
    assert physics.channel_gain(0.0) == pytest.approx(1.0)
    assert physics.channel_gain(1.0) == pytest.approx(0.125)
    assert physics.channel_gain(3.0) == pytest.approx(1.0 / 64.0)
    assert physics.channel_gain(1.0, epsilon=0.5, alpha=2.0) == pytest.approx(
        1.0 / 2.25
    )
    assert physics.channel_gain(2.0, alpha=4.0) == pytest.approx(1.0 / 81.0)


def test_channel_gain_decreases_monotonically_with_distance() -> None:
    """Strictly decreasing in distance -- the reason spatial layout matters."""
    distances = np.linspace(0.0, 12.0, 121)
    gains = np.asarray(physics.channel_gain(distances))
    differences = np.diff(gains)
    assert np.all(differences < 0.0), "channel gain must strictly decrease with distance"
    # And it decreases for every path-loss exponent, not just the default.
    for alpha in (1.5, 2.0, 3.0, 4.5):
        gains = np.asarray(physics.channel_gain(distances, alpha=alpha))
        assert np.all(np.diff(gains) < 0.0)


def test_channel_gain_doubling_offset_distance_divides_by_two_to_the_alpha() -> None:
    """The power-law property students are asked to verify by hand."""
    for alpha in (2.0, 3.0, 4.0):
        near = physics.channel_gain(1.0, epsilon=1.0, alpha=alpha)   # (d + eps) = 2
        far = physics.channel_gain(3.0, epsilon=1.0, alpha=alpha)    # (d + eps) = 4
        assert near / far == pytest.approx(2.0**alpha)


def test_channel_gain_is_maximal_at_zero_distance_and_capped_by_epsilon() -> None:
    """epsilon exists precisely to keep the d = 0 gain finite."""
    for epsilon in (0.25, 1.0, 2.0):
        gain_at_zero = physics.channel_gain(0.0, epsilon=epsilon)
        assert gain_at_zero == pytest.approx(epsilon**-3.0)
        assert math.isfinite(gain_at_zero)
        assert physics.channel_gain(0.1, epsilon=epsilon) < gain_at_zero


def test_channel_gain_accepts_plain_floats_and_arrays_alike() -> None:
    """Scalars return floats (the TypeScript path); sequences return arrays."""
    scalar = physics.channel_gain(2.0)
    assert isinstance(scalar, float)

    from_list = physics.channel_gain([0.0, 2.0, 5.0])
    assert isinstance(from_list, np.ndarray)
    from_array = physics.channel_gain(np.array([0.0, 2.0, 5.0]))
    assert isinstance(from_array, np.ndarray)

    # The vectorized path must agree with the scalar path exactly.
    for index, distance in enumerate([0.0, 2.0, 5.0]):
        assert from_list[index] == pytest.approx(physics.channel_gain(distance))
        assert from_array[index] == pytest.approx(physics.channel_gain(distance))


@pytest.mark.parametrize(
    "kwargs, needle",
    [
        ({"distance": -1.0}, "non-negative"),
        ({"distance": 1.0, "epsilon": 0.0}, "strictly positive"),
        ({"distance": 1.0, "epsilon": -1.0}, "strictly positive"),
        ({"distance": 1.0, "alpha": 0.0}, "strictly positive"),
        ({"distance": [1.0, -1.0]}, "non-negative"),
        ({"distance": float("nan")}, "finite"),
    ],
)
def test_channel_gain_guards_bad_input(kwargs: dict, needle: str) -> None:
    """Guards must fire, and the message must say something teachable."""
    with pytest.raises(ValueError) as excinfo:
        physics.channel_gain(**kwargs)
    message = str(excinfo.value)
    assert needle in message
    # A message that only says "invalid" teaches nothing; require some substance.
    assert len(message) > 60


# --------------------------------------------------------------------------- #
# distances
# --------------------------------------------------------------------------- #


def test_euclidean_distance_and_pairwise_agree() -> None:
    """pairwise_distances is only a vectorization; the numbers must match."""
    stations = [(5.0, 8.0), (2.4, 3.5), (7.6, 3.5)]
    users = [(4.2, 7.1), (6.3, 2.2), (8.4, 4.1)]
    matrix = physics.pairwise_distances(stations, users)
    assert matrix.shape == (3, 3)
    for i, station in enumerate(stations):
        for j, user in enumerate(users):
            assert matrix[i, j] == pytest.approx(
                physics.euclidean_distance(station, user)
            )


def test_euclidean_distance_known_values() -> None:
    assert physics.euclidean_distance((0.0, 0.0), (3.0, 4.0)) == pytest.approx(5.0)
    assert physics.euclidean_distance((1.0, 1.0), (1.0, 1.0)) == pytest.approx(0.0)


def test_euclidean_distance_rejects_mismatched_dimensions() -> None:
    with pytest.raises(ValueError, match="same space"):
        physics.euclidean_distance((0.0, 0.0), (1.0, 2.0, 3.0))


# --------------------------------------------------------------------------- #
# total_interference
# --------------------------------------------------------------------------- #


def test_interference_accumulates_only_on_matching_channels() -> None:
    """The indicator 1[c_j = c_i] is the whole idea: off-channel contributes zero."""
    powers = [1.0, 1.0, 1.0]
    gains = [0.10, 0.05, 0.02]

    assert physics.total_interference(powers, gains, [0, 0, 0]) == pytest.approx(0.0)
    assert physics.total_interference(powers, gains, [1, 0, 0]) == pytest.approx(0.10)
    assert physics.total_interference(powers, gains, [0, 1, 0]) == pytest.approx(0.05)
    assert physics.total_interference(powers, gains, [1, 1, 0]) == pytest.approx(0.15)
    assert physics.total_interference(powers, gains, [1, 1, 1]) == pytest.approx(0.17)


def test_a_very_loud_very_close_interferer_off_channel_contributes_nothing() -> None:
    """Interference is a property of geometry *and* the joint action."""
    # An interferer at distance 0 with maximum power, but on another channel.
    huge_gain = physics.channel_gain(0.0)
    assert physics.total_interference([1.0], [huge_gain], [0]) == pytest.approx(0.0)
    # The same interferer once it moves onto our channel.
    assert physics.total_interference([1.0], [huge_gain], [1]) == pytest.approx(huge_gain)


def test_interference_is_zero_with_no_interferers() -> None:
    assert physics.total_interference([], [], []) == 0.0


def test_interference_grows_with_interferer_power() -> None:
    previous = -1.0
    for power in (0.0, 0.2, 0.5, 1.0):
        value = physics.total_interference([power], [0.02], [1])
        assert value > previous
        previous = value


def test_interference_rejects_mismatched_list_lengths() -> None:
    with pytest.raises(ValueError) as excinfo:
        physics.total_interference([1.0, 1.0], [0.1], [1, 1])
    assert "line up element by element" in str(excinfo.value)
    assert "j != i" in str(excinfo.value)


def test_interference_rejects_a_channel_index_in_place_of_the_indicator() -> None:
    """A very common student error: passing the channel number, not the flag."""
    with pytest.raises(ValueError, match="not a channel index"):
        physics.total_interference([1.0], [0.1], [2])


def test_interference_rejects_negative_power_and_gain() -> None:
    with pytest.raises(ValueError, match="non-negative"):
        physics.total_interference([-1.0], [0.1], [1])
    with pytest.raises(ValueError, match="non-negative"):
        physics.total_interference([1.0], [-0.1], [1])


# --------------------------------------------------------------------------- #
# sinr
# --------------------------------------------------------------------------- #


def test_sinr_matches_the_equation() -> None:
    """Hand-computed: 1.0 * 0.0625 / (1e-3 + 1.0 * 0.01)."""
    value = physics.sinr(1.0, 0.0625, [1.0], [0.01], [1], 1e-3)
    assert value == pytest.approx(0.0625 / 0.011)


def test_sinr_drops_when_a_cochannel_interferer_activates() -> None:
    """The single most important causal claim in the lab."""
    clean = physics.sinr(1.0, 0.0625, [1.0], [0.01], [0], 1e-3)
    collided = physics.sinr(1.0, 0.0625, [1.0], [0.01], [1], 1e-3)
    assert collided < clean
    # And the drop is large enough to matter pedagogically, not a rounding wobble.
    assert collided < 0.2 * clean


def test_sinr_is_unchanged_when_the_interferer_uses_another_channel() -> None:
    alone = physics.sinr(1.0, 0.0625, [], [], [], 1e-3)
    with_offchannel_neighbour = physics.sinr(1.0, 0.0625, [1.0], [0.5], [0], 1e-3)
    assert with_offchannel_neighbour == pytest.approx(alone)


def test_sinr_decreases_monotonically_in_cochannel_interferer_power() -> None:
    previous = float("inf")
    for power in (0.0, 0.2, 0.5, 1.0):
        value = physics.sinr(1.0, 0.0625, [power], [0.01], [1], 1e-3)
        assert value < previous
        previous = value


def test_sinr_increases_monotonically_in_own_power() -> None:
    previous = -1.0
    for power in (0.2, 0.5, 1.0):
        value = physics.sinr(power, 0.0625, [1.0], [0.01], [1], 1e-3)
        assert value > previous
        previous = value


def test_sinr_decreases_with_serving_distance() -> None:
    previous = float("inf")
    for distance in (0.5, 1.0, 2.0, 4.0):
        value = physics.sinr(
            1.0, physics.channel_gain(distance), [1.0], [0.01], [1], 1e-3
        )
        assert value < previous
        previous = value


def test_sinr_is_zero_for_a_silent_station() -> None:
    """A failed station transmits nothing, so its users get an SINR of exactly 0."""
    assert physics.sinr(0.0, 0.0625, [1.0], [0.01], [1], 1e-3) == 0.0


def test_sinr_allows_zero_noise_only_when_interference_is_present() -> None:
    finite = physics.sinr(1.0, 0.0625, [1.0], [0.01], [1], 0.0)
    assert finite == pytest.approx(6.25)
    with pytest.raises(ValueError) as excinfo:
        physics.sinr(1.0, 0.0625, [1.0], [0.01], [0], 0.0)
    assert "denominator" in str(excinfo.value)
    assert "thermal noise" in str(excinfo.value)


def test_sinr_rejects_negative_inputs() -> None:
    with pytest.raises(ValueError, match="non-negative"):
        physics.sinr(-1.0, 0.0625, [], [], [], 1e-3)
    with pytest.raises(ValueError, match="non-negative"):
        physics.sinr(1.0, -0.0625, [], [], [], 1e-3)
    with pytest.raises(ValueError, match="non-negative"):
        physics.sinr(1.0, 0.0625, [], [], [], -1e-3)


# --------------------------------------------------------------------------- #
# shannon_rate
# --------------------------------------------------------------------------- #


def test_shannon_rate_known_values() -> None:
    assert physics.shannon_rate(0.0) == pytest.approx(0.0)
    assert physics.shannon_rate(1.0) == pytest.approx(1.0)
    assert physics.shannon_rate(3.0) == pytest.approx(2.0)
    assert physics.shannon_rate(7.0) == pytest.approx(3.0)
    assert physics.shannon_rate(15.0) == pytest.approx(4.0)


def test_shannon_rate_is_strictly_monotonic_in_sinr() -> None:
    sinr_values = np.unique(
        np.concatenate([np.linspace(0.0, 5.0, 51), np.linspace(5.0, 200.0, 40)])
    )
    rates = np.asarray(physics.shannon_rate(sinr_values))
    assert np.all(np.diff(rates) > 0.0)


def test_shannon_rate_has_diminishing_returns() -> None:
    """Concavity: the same SINR increment buys less and less rate.

    This is why moving to a clean channel beats shouting louder, and it is the
    numerical fact the COORDINATE chapter is built on.
    """
    increments = [
        physics.shannon_rate(s + 1.0) - physics.shannon_rate(s)
        for s in (0.0, 1.0, 5.0, 20.0, 100.0)
    ]
    assert all(
        later < earlier for earlier, later in zip(increments, increments[1:])
    ), f"rate increments should shrink, got {increments}"
    # Concretely: +2 SINR from 1 buys much more than +2 SINR from 100.
    cheap = physics.shannon_rate(3.0) - physics.shannon_rate(1.0)
    expensive = physics.shannon_rate(102.0) - physics.shannon_rate(100.0)
    assert cheap > 20.0 * expensive


def test_shannon_rate_scales_linearly_with_bandwidth() -> None:
    base = physics.shannon_rate(7.0, bandwidth=1.0)
    assert physics.shannon_rate(7.0, bandwidth=2.0) == pytest.approx(2.0 * base)
    assert physics.shannon_rate(7.0, bandwidth=0.5) == pytest.approx(0.5 * base)
    assert physics.shannon_rate(7.0, bandwidth=0.0) == pytest.approx(0.0)


def test_shannon_rate_vectorized_matches_scalar() -> None:
    values = [0.0, 0.5, 7.0, 63.0]
    vector = np.asarray(physics.shannon_rate(values))
    for index, value in enumerate(values):
        assert vector[index] == pytest.approx(physics.shannon_rate(value))


def test_shannon_rate_rejects_negative_sinr_and_bandwidth() -> None:
    with pytest.raises(ValueError) as excinfo:
        physics.shannon_rate(-0.1)
    assert "cannot be negative" in str(excinfo.value)
    with pytest.raises(ValueError, match="non-negative"):
        physics.shannon_rate(1.0, bandwidth=-1.0)


# --------------------------------------------------------------------------- #
# interference_to_noise_ratio
# --------------------------------------------------------------------------- #


def test_interference_to_noise_ratio() -> None:
    assert physics.interference_to_noise_ratio(0.0, 1e-3) == pytest.approx(0.0)
    assert physics.interference_to_noise_ratio(1e-3, 1e-3) == pytest.approx(1.0)
    assert physics.interference_to_noise_ratio(0.02, 1e-3) == pytest.approx(20.0)
    vector = np.asarray(physics.interference_to_noise_ratio([0.0, 0.002], 1e-3))
    assert vector.tolist() == pytest.approx([0.0, 2.0])


def test_interference_to_noise_ratio_guards() -> None:
    with pytest.raises(ValueError, match="strictly positive"):
        physics.interference_to_noise_ratio(0.001, 0.0)
    with pytest.raises(ValueError, match="non-negative"):
        physics.interference_to_noise_ratio(-0.001, 1e-3)


# --------------------------------------------------------------------------- #
# Cross-validation fixture
# --------------------------------------------------------------------------- #


def test_fixture_physics_cases_match_the_code(fixture: dict) -> None:
    """Replay every physics vector in the JSON fixture against the live code.

    The TypeScript port of the browser lab is validated against this file, so a
    stale fixture would let the lab and the notebooks drift apart silently.
    """
    tolerance = fixture["tolerance"]
    checked = 0
    for name, block in fixture["physics"].items():
        if not isinstance(block, dict) or "cases" not in block:
            continue
        function = getattr(physics, name)
        for entry in block["cases"]:
            result = function(**entry["args"])
            expected = entry["expect"]
            if isinstance(expected, list):
                assert np.allclose(
                    np.asarray(result, dtype=float).reshape(-1),
                    np.asarray(expected, dtype=float).reshape(-1),
                    atol=tolerance,
                ), f"{name}({entry['args']})"
            else:
                assert float(result) == pytest.approx(
                    expected, abs=max(tolerance, abs(expected) * 1e-9)
                ), f"{name}({entry['args']})"
            checked += 1
    assert checked >= 40, f"expected a substantial fixture, only checked {checked}"


def test_fixture_physics_error_cases_still_raise(fixture: dict) -> None:
    """Every argument set the fixture marks as invalid must still be rejected."""
    checked = 0
    for name, block in fixture["physics"].items():
        if not isinstance(block, dict) or "cases" not in block:
            continue
        function = getattr(physics, name)
        for entry in block.get("errors", []):
            with pytest.raises(ValueError):
                function(**entry["args"])
            checked += 1
    assert checked >= 10
