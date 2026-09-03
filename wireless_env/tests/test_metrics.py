"""Tests for :mod:`wireless_env.metrics`."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest

from wireless_env import metrics

FIXTURE_PATH = Path(__file__).resolve().parents[1] / "fixtures" / "test_vectors.json"


@pytest.fixture(scope="module")
def fixture() -> dict:
    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


# --------------------------------------------------------------------------- #
# Jain fairness: the two boundary values students must be able to predict
# --------------------------------------------------------------------------- #


@pytest.mark.parametrize("n", [1, 2, 3, 4, 8, 25])
def test_jain_fairness_is_exactly_one_for_equal_rates(n: int) -> None:
    """J = 1 exactly when everyone gets the same rate, for any n and any level."""
    for level in (0.5, 1.0, 3.7, 42.0):
        assert metrics.jain_fairness([level] * n) == pytest.approx(1.0)


@pytest.mark.parametrize("n", [2, 3, 4, 5, 10])
def test_jain_fairness_is_exactly_one_over_n_for_a_single_served_user(n: int) -> None:
    """J = 1/n when one user has everything -- the maximally unequal allocation."""
    rates = [0.0] * n
    rates[0] = 3.0
    assert metrics.jain_fairness(rates) == pytest.approx(1.0 / n)
    # The position of the served user cannot matter.
    rates = [0.0] * n
    rates[-1] = 9.5
    assert metrics.jain_fairness(rates) == pytest.approx(1.0 / n)


def test_jain_fairness_known_intermediate_values() -> None:
    """Hand-computable cases: (sum)^2 / (n * sum of squares)."""
    # [4, 2]: 36 / (2 * 20) = 0.9
    assert metrics.jain_fairness([4.0, 2.0]) == pytest.approx(0.9)
    # [6, 3, 1]: 100 / (3 * 46) = 0.7246...
    assert metrics.jain_fairness([6.0, 3.0, 1.0]) == pytest.approx(100.0 / 138.0)
    # [1, 1, 0]: 4 / (3 * 2) = 2/3
    assert metrics.jain_fairness([1.0, 1.0, 0.0]) == pytest.approx(2.0 / 3.0)


def test_jain_fairness_stays_inside_its_bounds_for_random_allocations() -> None:
    """1/n <= J <= 1 for every non-negative vector."""
    rng = np.random.default_rng(0)
    for _ in range(500):
        n = int(rng.integers(1, 12))
        rates = rng.uniform(0.0, 10.0, size=n)
        if rng.random() < 0.3:  # sprinkle in zeros
            rates[rng.integers(0, n)] = 0.0
        value = metrics.jain_fairness(rates)
        assert 1.0 / n - 1e-12 <= value <= 1.0 + 1e-12


def test_jain_fairness_is_scale_invariant() -> None:
    """Doubling everyone's rate does not change fairness."""
    rates = np.array([1.0, 4.0, 2.5, 0.0])
    base = metrics.jain_fairness(rates)
    for factor in (0.1, 2.0, 100.0):
        assert metrics.jain_fairness(rates * factor) == pytest.approx(base)


def test_jain_fairness_falls_as_an_allocation_becomes_more_unequal() -> None:
    """Moving service from the poorest user to the richest must lower J."""
    previous = 2.0
    for transfer in (0.0, 0.5, 1.0, 1.5, 2.0):
        rates = [2.0 - transfer, 2.0, 2.0 + transfer]
        value = metrics.jain_fairness(rates)
        assert value < previous
        previous = value


def test_jain_fairness_all_zero_convention_is_one() -> None:
    """Documented convention: a total blackout counts as perfectly equal.

    The catastrophe is visible in total_throughput, which is exactly 0. The
    alternatives (nan, or 0.0) either poison downstream averages or violate the
    index's own 1/n lower bound.
    """
    assert metrics.jain_fairness([0.0, 0.0, 0.0]) == 1.0
    assert metrics.total_throughput([0.0, 0.0, 0.0]) == 0.0


def test_jain_fairness_rejects_negative_and_empty_input() -> None:
    with pytest.raises(ValueError) as excinfo:
        metrics.jain_fairness([1.0, -1.0])
    assert "non-negative" in str(excinfo.value)
    with pytest.raises(ValueError, match="empty"):
        metrics.jain_fairness([])


# --------------------------------------------------------------------------- #
# Throughput
# --------------------------------------------------------------------------- #


def test_throughput_metrics_known_values() -> None:
    rates = [1.5, 2.5, 0.0, 4.0]
    assert metrics.total_throughput(rates) == pytest.approx(8.0)
    assert metrics.mean_throughput(rates) == pytest.approx(2.0)
    assert metrics.worst_user_throughput(rates) == pytest.approx(0.0)


def test_total_and_mean_throughput_are_consistent() -> None:
    rng = np.random.default_rng(1)
    for _ in range(50):
        rates = rng.uniform(0.0, 8.0, size=int(rng.integers(1, 10)))
        assert metrics.total_throughput(rates) == pytest.approx(
            metrics.mean_throughput(rates) * len(rates)
        )
        assert metrics.worst_user_throughput(rates) <= metrics.mean_throughput(rates)


def test_worst_user_throughput_reacts_to_one_starved_user_when_the_total_barely_moves() -> None:
    """Why the package always reports the worst user next to the total."""
    healthy = [4.0, 4.0, 4.0, 4.0]
    starved = [5.3, 5.3, 5.3, 0.1]
    assert metrics.total_throughput(starved) == pytest.approx(
        metrics.total_throughput(healthy), rel=0.01
    )
    assert metrics.worst_user_throughput(starved) < 0.1 * metrics.worst_user_throughput(
        healthy
    )
    assert metrics.jain_fairness(starved) < metrics.jain_fairness(healthy)


def test_throughput_metrics_reject_negative_rates() -> None:
    for function in (
        metrics.total_throughput,
        metrics.mean_throughput,
        metrics.worst_user_throughput,
    ):
        with pytest.raises(ValueError, match="non-negative"):
            function([1.0, -0.5])


# --------------------------------------------------------------------------- #
# Communication overhead
# --------------------------------------------------------------------------- #


def test_communication_overhead_counts_bits() -> None:
    # Three stations each broadcasting a 2-bit message to two neighbours.
    assert metrics.communication_overhead(6, 2) == pytest.approx(12.0)
    assert metrics.communication_overhead(6, 4) == pytest.approx(24.0)
    assert metrics.communication_overhead(6, 0) == pytest.approx(0.0)
    assert metrics.communication_overhead(0, 4) == pytest.approx(0.0)


def test_communication_overhead_is_linear_in_both_arguments() -> None:
    base = metrics.communication_overhead(6, 2)
    assert metrics.communication_overhead(12, 2) == pytest.approx(2.0 * base)
    assert metrics.communication_overhead(6, 4) == pytest.approx(2.0 * base)


def test_communication_overhead_rejects_negative_input() -> None:
    with pytest.raises(ValueError, match="non-negative"):
        metrics.communication_overhead(-1, 2)
    with pytest.raises(ValueError, match="non-negative"):
        metrics.communication_overhead(1, -2)


# --------------------------------------------------------------------------- #
# Generalization
# --------------------------------------------------------------------------- #


def test_generalization_gap_sign_convention() -> None:
    """Positive means the policy got worse off-distribution."""
    assert metrics.generalization_gap(10.0, 7.5) == pytest.approx(2.5)
    assert metrics.generalization_gap(10.0, 10.0) == pytest.approx(0.0)
    # Negative is legitimate: the unseen scenario was easier.
    assert metrics.generalization_gap(7.5, 10.0) == pytest.approx(-2.5)


def test_generalization_gap_on_a_realistic_metric_pair() -> None:
    """A fairness gap computed from two evaluation scores."""
    familiar_fairness, unseen_fairness = 0.946, 0.677
    gap = metrics.generalization_gap(familiar_fairness, unseen_fairness)
    assert gap == pytest.approx(0.269)
    assert metrics.relative_generalization_gap(
        familiar_fairness, unseen_fairness
    ) == pytest.approx(0.269 / 0.946)


def test_relative_generalization_gap_normalizes() -> None:
    assert metrics.relative_generalization_gap(10.0, 7.5) == pytest.approx(0.25)
    # The same absolute drop is a much smaller relative drop off a bigger base.
    small_base = metrics.relative_generalization_gap(3.0, 1.0)
    large_base = metrics.relative_generalization_gap(40.0, 38.0)
    assert small_base > large_base


def test_relative_generalization_gap_rejects_a_zero_baseline() -> None:
    with pytest.raises(ValueError) as excinfo:
        metrics.relative_generalization_gap(0.0, 1.0)
    assert "undefined" in str(excinfo.value)
    assert "absolute gap" in str(excinfo.value)


def test_generalization_gap_rejects_non_finite_input() -> None:
    with pytest.raises(ValueError, match="finite"):
        metrics.generalization_gap(float("nan"), 1.0)


# --------------------------------------------------------------------------- #
# Robustness
# --------------------------------------------------------------------------- #


def test_robustness_is_the_worst_case_over_the_suite() -> None:
    results = {
        "familiar_topology": 10.0,
        "unseen_topology": 8.5,
        "traffic_surge": 6.0,
        "base_station_failure": 4.0,
    }
    assert metrics.robustness(results) == pytest.approx(4.0)
    assert metrics.robustness(list(results.values())) == pytest.approx(4.0)


def test_robustness_normalized_by_a_reference() -> None:
    results = {"familiar": 10.0, "surge": 6.0, "failure": 4.0}
    assert metrics.robustness(results, reference=10.0) == pytest.approx(0.4)


def test_robustness_is_not_the_mean_and_that_distinction_matters() -> None:
    """A high average can hide a catastrophic scenario; min cannot."""
    steady = {"a": 7.0, "b": 7.0, "c": 7.0}
    spiky = {"a": 11.0, "b": 11.0, "c": 1.0}
    assert np.mean(list(spiky.values())) > np.mean(list(steady.values()))
    assert metrics.robustness(spiky) < metrics.robustness(steady)


def test_robustness_rejects_empty_and_non_finite_and_zero_reference() -> None:
    with pytest.raises(ValueError, match="empty"):
        metrics.robustness([])
    with pytest.raises(ValueError) as excinfo:
        metrics.robustness({"broken": float("nan")})
    assert "finite" in str(excinfo.value)
    with pytest.raises(ValueError, match="undefined"):
        metrics.robustness([1.0], reference=0.0)


# --------------------------------------------------------------------------- #
# Cross-validation fixture
# --------------------------------------------------------------------------- #


def test_fixture_metrics_cases_match_the_code(fixture: dict) -> None:
    """Replay every metrics vector in the JSON fixture against the live code."""
    tolerance = fixture["tolerance"]
    checked = 0
    for name, block in fixture["metrics"].items():
        function = getattr(metrics, name)
        for entry in block["cases"]:
            result = float(function(**entry["args"]))
            expected = float(entry["expect"])
            assert result == pytest.approx(
                expected, abs=max(tolerance, abs(expected) * 1e-9)
            ), f"{name}({entry['args']})"
            checked += 1
    assert checked >= 30, f"expected a substantial fixture, only checked {checked}"


def test_fixture_metrics_error_cases_still_raise(fixture: dict) -> None:
    checked = 0
    for name, block in fixture["metrics"].items():
        function = getattr(metrics, name)
        for entry in block.get("errors", []):
            with pytest.raises(ValueError):
                function(**entry["args"])
            checked += 1
    assert checked >= 5
