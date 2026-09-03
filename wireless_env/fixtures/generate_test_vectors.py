"""Generate ``test_vectors.json``: the cross-validation fixture for the port.

WHY THIS FILE EXISTS
--------------------
:mod:`wireless_env.physics` and :mod:`wireless_env.metrics` are ported
line-for-line to TypeScript for the Three.js lab.  A port that silently
disagrees with the Python it was copied from is worse than no port at all: the
browser would teach one thing and the notebooks another.  So the Python side
emits a machine-readable table of inputs and expected outputs, and the
TypeScript test suite asserts against it.  The fixture is a **deliverable**,
not a convenience.

WHAT IS IN THE FIXTURE
----------------------
``physics``, ``metrics``
    For every public function: a list of ``{"args": {...}, "expect": ...}``
    cases covering ordinary values, boundary values and the documented
    conventions -- plus an ``errors`` list of argument sets that **must throw**,
    so the port's input validation is checked too, not only its arithmetic.
``actions``
    The full ``encode_action`` / ``decode_action`` table for the default
    ``Discrete(9)`` space, so the lab's channel/power controls cannot drift out
    of sync with the Python action encoding.
``observation_layout``
    Every block's name, offset and width for the rollout's configuration, so
    the lab can assert it is reading the right slice of an observation vector.
``rollout_deterministic``
    A 10-step rollout with the full per-step action, reward, reward-breakdown,
    metric and observation trace.  Its configuration pins station positions,
    user counts, user positions and demands, and switches mobility and demand
    volatility off, so **no random number generator is involved anywhere**.
    That is deliberate: numpy's PCG64 bit stream is not reasonably
    reproducible in TypeScript, so a fixture rollout that depended on it could
    never be cross-validated.  This one can be, exactly.
``rollout_seeded_numpy``
    A second 10-step rollout on the default familiar topology with a seeded
    random policy.  It **is** flagged ``"python_only": true`` because it does
    depend on numpy's bit stream.  It exists as a Python regression lock: if a
    refactor changes environment behaviour, this catches it.

HONESTY
-------
Every number in the fixture is a computed output of the code in this
repository, produced by running it.  None of it is measured from a real
network, and none of it is a published benchmark.

REPRODUCING IT
--------------
From the repository root::

    python3 -m wireless_env.fixtures.generate_test_vectors

or equivalently::

    python3 wireless_env/fixtures/generate_test_vectors.py

Both write ``wireless_env/fixtures/test_vectors.json`` in place and print a
short summary.  The output is deterministic: running it twice produces a
byte-identical file, so a diff in version control is a real change in
behaviour and should be reviewed as one.
"""

from __future__ import annotations

import dataclasses
import json
import sys
from pathlib import Path
from typing import Any, Callable

import numpy as np

# Allow `python3 wireless_env/fixtures/generate_test_vectors.py` as well as
# `python3 -m wireless_env.fixtures.generate_test_vectors`, since students will
# reasonably try both.
if __package__ in (None, ""):  # pragma: no cover - script-invocation path
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from wireless_env import baselines, metrics, physics, scenarios  # noqa: E402
from wireless_env.environment import (  # noqa: E402
    MESSAGE_BIT_NAMES,
    POWER_LABELS,
    CooperativeWirelessEnv,
    RewardWeights,
    WirelessConfig,
    compute_team_reward,
    decode_action,
    encode_action,
    observation_layout,
)

#: Absolute tolerance the TypeScript port is expected to match within.
TOLERANCE = 1e-9

#: Decimal places every float in the fixture is rounded to.  Twelve is far
#: inside double precision but outside the range where platform-specific
#: last-bit differences in ``log2``/``pow`` show up, so the file is stable
#: across machines.
ROUND_TO = 12

OUTPUT_PATH = Path(__file__).resolve().parent / "test_vectors.json"


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #


def clean(value: Any) -> Any:
    """Recursively convert numpy types to JSON primitives and round floats."""
    if isinstance(value, (bool, np.bool_)):
        return bool(value)
    if isinstance(value, (int, np.integer)):
        return int(value)
    if isinstance(value, (float, np.floating)):
        rounded = round(float(value), ROUND_TO)
        # Normalize -0.0 to 0.0 so the file is stable.
        return 0.0 if rounded == 0.0 else rounded
    if isinstance(value, np.ndarray):
        return clean(value.tolist())
    if isinstance(value, (list, tuple)):
        return [clean(item) for item in value]
    if isinstance(value, dict):
        return {str(key): clean(item) for key, item in value.items()}
    if value is None or isinstance(value, str):
        return value
    if dataclasses.is_dataclass(value):
        return clean(dataclasses.asdict(value))
    raise TypeError(f"Cannot serialize {type(value).__name__} into the fixture.")


def case(function: Callable[..., Any], **args: Any) -> dict[str, Any]:
    """Build one passing case: the args, and whatever the function returns."""
    return {"args": clean(args), "expect": clean(function(**args))}


def error_case(function: Callable[..., Any], why: str, **args: Any) -> dict[str, Any]:
    """Build one must-throw case, asserting here that it really does throw."""
    try:
        function(**args)
    except ValueError as exc:
        return {"args": clean(args), "raises": "ValueError", "why": why,
                "message_contains": str(exc).split(".")[0][:80]}
    raise AssertionError(
        f"{function.__name__}({args}) was expected to raise ValueError ({why}) "
        "but returned normally. The fixture would then teach the TypeScript port "
        "to accept invalid input."
    )


# --------------------------------------------------------------------------- #
# Physics vectors
# --------------------------------------------------------------------------- #


def physics_vectors() -> dict[str, Any]:
    """Input/output vectors for every public function in ``physics``."""
    return {
        "constants": {
            "DEFAULT_EPSILON": physics.DEFAULT_EPSILON,
            "DEFAULT_PATH_LOSS_EXPONENT": physics.DEFAULT_PATH_LOSS_EXPONENT,
            "DEFAULT_BANDWIDTH": physics.DEFAULT_BANDWIDTH,
        },
        "channel_gain": {
            "equation": "g_iu = 1 / (d_iu + epsilon)^alpha",
            "cases": [
                case(physics.channel_gain, distance=0.0),
                case(physics.channel_gain, distance=0.5),
                case(physics.channel_gain, distance=1.0),
                case(physics.channel_gain, distance=2.0),
                case(physics.channel_gain, distance=3.0),
                case(physics.channel_gain, distance=7.5),
                case(physics.channel_gain, distance=1.0, epsilon=0.5),
                case(physics.channel_gain, distance=1.0, epsilon=2.0),
                case(physics.channel_gain, distance=2.0, alpha=2.0),
                case(physics.channel_gain, distance=2.0, alpha=4.0),
                case(physics.channel_gain, distance=2.0, epsilon=0.1, alpha=3.5),
                case(physics.channel_gain, distance=[0.0, 1.0, 2.0, 4.0]),
            ],
            "errors": [
                error_case(
                    physics.channel_gain,
                    "distance must be non-negative",
                    distance=-1.0,
                ),
                error_case(
                    physics.channel_gain,
                    "epsilon must be strictly positive or the gain diverges at d=0",
                    distance=1.0,
                    epsilon=0.0,
                ),
                error_case(
                    physics.channel_gain,
                    "alpha must be strictly positive",
                    distance=1.0,
                    alpha=0.0,
                ),
                error_case(
                    physics.channel_gain,
                    "a negative entry anywhere in an array is rejected",
                    distance=[1.0, -2.0],
                ),
            ],
        },
        "euclidean_distance": {
            "equation": "d = sqrt((ax - bx)^2 + (ay - by)^2)",
            "cases": [
                case(physics.euclidean_distance, point_a=(0.0, 0.0), point_b=(3.0, 4.0)),
                case(physics.euclidean_distance, point_a=(5.0, 8.0), point_b=(5.0, 8.0)),
                case(
                    physics.euclidean_distance,
                    point_a=(5.0, 8.0),
                    point_b=(2.401923788647, 3.5),
                ),
                case(
                    physics.euclidean_distance,
                    point_a=(-1.5, 2.5),
                    point_b=(2.5, -0.5),
                ),
            ],
            "errors": [
                error_case(
                    physics.euclidean_distance,
                    "both points must have the same dimension",
                    point_a=(0.0, 0.0),
                    point_b=(1.0, 2.0, 3.0),
                ),
            ],
        },
        "pairwise_distances": {
            "equation": "out[i][j] = euclidean_distance(a_i, b_j)",
            "cases": [
                case(
                    physics.pairwise_distances,
                    points_a=[(0.0, 0.0), (3.0, 4.0)],
                    points_b=[(0.0, 0.0), (0.0, 3.0), (6.0, 8.0)],
                ),
                case(
                    physics.pairwise_distances,
                    points_a=list(scenarios.DEFAULT_STATION_POSITIONS),
                    points_b=[(5.0, 5.0), (4.0, 7.0), (8.0, 3.0)],
                ),
            ],
            "errors": [],
        },
        "total_interference": {
            "equation": "I_u = sum_j P_j * g_ju * 1[c_j == c_i]",
            "cases": [
                case(
                    physics.total_interference,
                    interferer_powers=[],
                    interferer_gains=[],
                    same_channel_mask=[],
                ),
                case(
                    physics.total_interference,
                    interferer_powers=[1.0, 1.0],
                    interferer_gains=[0.1, 0.5],
                    same_channel_mask=[0, 0],
                ),
                case(
                    physics.total_interference,
                    interferer_powers=[1.0, 1.0],
                    interferer_gains=[0.1, 0.5],
                    same_channel_mask=[1, 0],
                ),
                case(
                    physics.total_interference,
                    interferer_powers=[1.0, 1.0],
                    interferer_gains=[0.1, 0.5],
                    same_channel_mask=[1, 1],
                ),
                case(
                    physics.total_interference,
                    interferer_powers=[0.2, 0.5, 1.0],
                    interferer_gains=[0.015625, 0.001953125, 0.008],
                    same_channel_mask=[1, 0, 1],
                ),
                case(
                    physics.total_interference,
                    interferer_powers=[0.0, 1.0],
                    interferer_gains=[0.9, 0.25],
                    same_channel_mask=[1, 1],
                ),
            ],
            "errors": [
                error_case(
                    physics.total_interference,
                    "the three interferer lists must be the same length",
                    interferer_powers=[1.0, 1.0],
                    interferer_gains=[0.1],
                    same_channel_mask=[1, 1],
                ),
                error_case(
                    physics.total_interference,
                    "the mask is an indicator, not a channel index",
                    interferer_powers=[1.0],
                    interferer_gains=[0.1],
                    same_channel_mask=[2],
                ),
                error_case(
                    physics.total_interference,
                    "powers cannot be negative",
                    interferer_powers=[-1.0],
                    interferer_gains=[0.1],
                    same_channel_mask=[1],
                ),
            ],
        },
        "sinr": {
            "equation": (
                "SINR_u = P_i g_iu / (sigma^2 + sum_j P_j g_ju 1[c_j == c_i])"
            ),
            "cases": [
                case(
                    physics.sinr,
                    serving_power=1.0,
                    serving_gain=0.0625,
                    interferer_powers=[1.0],
                    interferer_gains=[0.01],
                    same_channel_mask=[0],
                    noise_power=1e-3,
                ),
                case(
                    physics.sinr,
                    serving_power=1.0,
                    serving_gain=0.0625,
                    interferer_powers=[1.0],
                    interferer_gains=[0.01],
                    same_channel_mask=[1],
                    noise_power=1e-3,
                ),
                case(
                    physics.sinr,
                    serving_power=1.0,
                    serving_gain=0.0625,
                    interferer_powers=[1.0, 1.0],
                    interferer_gains=[0.01, 0.004],
                    same_channel_mask=[1, 1],
                    noise_power=1e-3,
                ),
                case(
                    physics.sinr,
                    serving_power=0.2,
                    serving_gain=0.0625,
                    interferer_powers=[1.0],
                    interferer_gains=[0.01],
                    same_channel_mask=[1],
                    noise_power=1e-3,
                ),
                case(
                    physics.sinr,
                    serving_power=1.0,
                    serving_gain=0.0625,
                    interferer_powers=[],
                    interferer_gains=[],
                    same_channel_mask=[],
                    noise_power=0.031,
                ),
                case(
                    physics.sinr,
                    serving_power=0.0,
                    serving_gain=0.0625,
                    interferer_powers=[1.0],
                    interferer_gains=[0.01],
                    same_channel_mask=[1],
                    noise_power=1e-3,
                ),
                case(
                    physics.sinr,
                    serving_power=1.0,
                    serving_gain=0.0625,
                    interferer_powers=[1.0],
                    interferer_gains=[0.01],
                    same_channel_mask=[1],
                    noise_power=0.0,
                ),
            ],
            "errors": [
                error_case(
                    physics.sinr,
                    "zero noise with no co-channel interferer leaves a zero denominator",
                    serving_power=1.0,
                    serving_gain=0.0625,
                    interferer_powers=[1.0],
                    interferer_gains=[0.01],
                    same_channel_mask=[0],
                    noise_power=0.0,
                ),
                error_case(
                    physics.sinr,
                    "noise power cannot be negative",
                    serving_power=1.0,
                    serving_gain=0.0625,
                    interferer_powers=[],
                    interferer_gains=[],
                    same_channel_mask=[],
                    noise_power=-1e-3,
                ),
                error_case(
                    physics.sinr,
                    "serving gain cannot be negative",
                    serving_power=1.0,
                    serving_gain=-0.5,
                    interferer_powers=[],
                    interferer_gains=[],
                    same_channel_mask=[],
                    noise_power=1e-3,
                ),
            ],
        },
        "shannon_rate": {
            "equation": "R_u = B * log2(1 + SINR_u)",
            "cases": [
                case(physics.shannon_rate, sinr_value=0.0),
                case(physics.shannon_rate, sinr_value=1.0),
                case(physics.shannon_rate, sinr_value=3.0),
                case(physics.shannon_rate, sinr_value=7.0),
                case(physics.shannon_rate, sinr_value=62.5),
                case(physics.shannon_rate, sinr_value=5.681818181818),
                case(physics.shannon_rate, sinr_value=100.0, bandwidth=2.0),
                case(physics.shannon_rate, sinr_value=100.0, bandwidth=0.0),
                case(physics.shannon_rate, sinr_value=[0.0, 1.0, 15.0]),
            ],
            "errors": [
                error_case(
                    physics.shannon_rate,
                    "SINR is a ratio of non-negative powers",
                    sinr_value=-0.5,
                ),
                error_case(
                    physics.shannon_rate,
                    "bandwidth cannot be negative",
                    sinr_value=1.0,
                    bandwidth=-1.0,
                ),
            ],
        },
        "interference_to_noise_ratio": {
            "equation": "INR = I_u / sigma^2",
            "cases": [
                case(
                    physics.interference_to_noise_ratio,
                    interference=0.0,
                    noise_power=1e-3,
                ),
                case(
                    physics.interference_to_noise_ratio,
                    interference=1e-3,
                    noise_power=1e-3,
                ),
                case(
                    physics.interference_to_noise_ratio,
                    interference=0.0046,
                    noise_power=1e-3,
                ),
                case(
                    physics.interference_to_noise_ratio,
                    interference=[0.0, 0.002, 0.02],
                    noise_power=1e-3,
                ),
            ],
            "errors": [
                error_case(
                    physics.interference_to_noise_ratio,
                    "the noise floor is the reference and must be positive",
                    interference=0.001,
                    noise_power=0.0,
                ),
                error_case(
                    physics.interference_to_noise_ratio,
                    "interference is a power and cannot be negative",
                    interference=-0.001,
                    noise_power=1e-3,
                ),
            ],
        },
    }


# --------------------------------------------------------------------------- #
# Metrics vectors
# --------------------------------------------------------------------------- #


def metrics_vectors() -> dict[str, Any]:
    """Input/output vectors for every public function in ``metrics``."""
    return {
        "jain_fairness": {
            "equation": "J = (sum_i x_i)^2 / (n * sum_i x_i^2)",
            "notes": (
                "Bounded in [1/n, 1]. Equals 1 exactly for equal rates and 1/n "
                "when one user has everything. All-zero input returns 1.0 by "
                "this package's documented convention."
            ),
            "cases": [
                case(metrics.jain_fairness, rates=[1.0, 1.0, 1.0]),
                case(metrics.jain_fairness, rates=[2.5, 2.5, 2.5, 2.5]),
                case(metrics.jain_fairness, rates=[3.0, 0.0, 0.0]),
                case(metrics.jain_fairness, rates=[1.0, 0.0]),
                case(metrics.jain_fairness, rates=[5.0, 0.0, 0.0, 0.0, 0.0]),
                case(metrics.jain_fairness, rates=[4.0, 2.0]),
                case(metrics.jain_fairness, rates=[6.0, 3.0, 1.0]),
                case(metrics.jain_fairness, rates=[0.0, 0.0]),
                case(metrics.jain_fairness, rates=[7.5]),
                case(metrics.jain_fairness, rates=[2.0, 4.0, 6.0, 8.0]),
                case(metrics.jain_fairness, rates=[4.0, 8.0, 12.0, 16.0]),
            ],
            "errors": [
                error_case(metrics.jain_fairness, "rates cannot be negative",
                           rates=[1.0, -1.0]),
                error_case(metrics.jain_fairness, "at least one user is required",
                           rates=[]),
            ],
        },
        "total_throughput": {
            "equation": "sum_i x_i",
            "cases": [
                case(metrics.total_throughput, rates=[1.5, 2.5, 0.0]),
                case(metrics.total_throughput, rates=[0.0, 0.0]),
                case(metrics.total_throughput, rates=[3.0, 3.0, 3.0, 3.0]),
            ],
            "errors": [],
        },
        "mean_throughput": {
            "equation": "(1/n) sum_i x_i",
            "cases": [
                case(metrics.mean_throughput, rates=[1.0, 2.0, 3.0]),
                case(metrics.mean_throughput, rates=[4.0]),
                case(metrics.mean_throughput, rates=[0.0, 5.0]),
            ],
            "errors": [],
        },
        "worst_user_throughput": {
            "equation": "min_i x_i",
            "cases": [
                case(metrics.worst_user_throughput, rates=[1.0, 2.0, 3.0]),
                case(metrics.worst_user_throughput, rates=[2.0, 0.0, 3.0]),
                case(metrics.worst_user_throughput, rates=[5.0]),
            ],
            "errors": [],
        },
        "communication_overhead": {
            "equation": "bits = messages_sent * bits_per_message",
            "cases": [
                case(metrics.communication_overhead, messages_sent=6, bits_per_message=2),
                case(metrics.communication_overhead, messages_sent=6, bits_per_message=0),
                case(metrics.communication_overhead, messages_sent=0, bits_per_message=4),
                case(metrics.communication_overhead, messages_sent=12, bits_per_message=4),
            ],
            "errors": [
                error_case(
                    metrics.communication_overhead,
                    "a message count cannot be negative",
                    messages_sent=-1,
                    bits_per_message=2,
                ),
                error_case(
                    metrics.communication_overhead,
                    "a payload width cannot be negative",
                    messages_sent=1,
                    bits_per_message=-2,
                ),
            ],
        },
        "generalization_gap": {
            "equation": "gap = familiar - unseen (positive means degradation)",
            "cases": [
                case(
                    metrics.generalization_gap,
                    familiar_performance=10.0,
                    unseen_performance=7.5,
                ),
                case(
                    metrics.generalization_gap,
                    familiar_performance=10.0,
                    unseen_performance=10.0,
                ),
                case(
                    metrics.generalization_gap,
                    familiar_performance=7.5,
                    unseen_performance=10.0,
                ),
                case(
                    metrics.generalization_gap,
                    familiar_performance=0.946,
                    unseen_performance=0.677,
                ),
            ],
            "errors": [],
        },
        "relative_generalization_gap": {
            "equation": "(familiar - unseen) / familiar",
            "cases": [
                case(
                    metrics.relative_generalization_gap,
                    familiar_performance=10.0,
                    unseen_performance=7.5,
                ),
                case(
                    metrics.relative_generalization_gap,
                    familiar_performance=40.0,
                    unseen_performance=38.0,
                ),
            ],
            "errors": [
                error_case(
                    metrics.relative_generalization_gap,
                    "a relative gap against a zero baseline is undefined",
                    familiar_performance=0.0,
                    unseen_performance=1.0,
                ),
            ],
        },
        "robustness": {
            "equation": "min over scenarios (optionally divided by a reference)",
            "notes": (
                "This package defines robustness as worst-case performance "
                "across an evaluation suite. Other definitions exist; report "
                "this one explicitly whenever you quote the number."
            ),
            "cases": [
                case(
                    metrics.robustness,
                    scenario_results={"familiar": 10.0, "surge": 6.0, "failure": 4.0},
                ),
                case(
                    metrics.robustness,
                    scenario_results={"familiar": 10.0, "surge": 6.0, "failure": 4.0},
                    reference=10.0,
                ),
                case(metrics.robustness, scenario_results=[3.0, 3.0, 3.0]),
                case(metrics.robustness, scenario_results=[2.0]),
            ],
            "errors": [
                error_case(
                    metrics.robustness,
                    "an empty suite has no worst case",
                    scenario_results=[],
                ),
                error_case(
                    metrics.robustness,
                    "a zero reference makes the ratio undefined",
                    scenario_results=[1.0],
                    reference=0.0,
                ),
            ],
        },
    }


# --------------------------------------------------------------------------- #
# Action encoding table
# --------------------------------------------------------------------------- #


def action_vectors() -> dict[str, Any]:
    """The complete encode/decode table for the default Discrete(9) space."""
    table = []
    for action in range(9):
        channel, power_level = decode_action(action)
        table.append(
            {
                "action": action,
                "channel": channel,
                "power_level": power_level,
                "power_label": POWER_LABELS[power_level],
                "reencoded": encode_action(channel, power_level),
            }
        )
    return {
        "equation": "action = channel * n_power_levels + power_level",
        "n_channels": 3,
        "n_power_levels": 3,
        "power_labels": list(POWER_LABELS),
        "table": table,
        "errors": [
            error_case(decode_action, "action index out of range", action=9),
            error_case(decode_action, "action index out of range", action=-1),
            error_case(
                encode_action, "channel index out of range", channel=3, power_level=0
            ),
            error_case(
                encode_action, "power level index out of range", channel=0, power_level=3
            ),
        ],
    }


# --------------------------------------------------------------------------- #
# Reward vectors
# --------------------------------------------------------------------------- #


def reward_vectors() -> dict[str, Any]:
    """Vectors for the composable team reward."""
    weights = RewardWeights()
    cases = []
    for served, interference, bits, wts in [
        ([2.0, 2.0], [0.0, 0.0], 0.0, weights),
        ([4.0, 4.0, 4.0], [0.0, 0.0, 0.0], 0.0, weights),
        ([6.0, 2.0, 1.0], [0.002, 0.0, 0.004], 0.0, weights),
        ([6.0, 2.0, 1.0], [0.002, 0.0, 0.004], 12.0, weights),
        ([3.0, 3.0], [0.001, 0.001], 24.0, weights),
        ([5.0, 0.0], [0.0, 0.01], 0.0, weights),
        (
            [4.0, 4.0],
            [0.0, 0.0],
            0.0,
            RewardWeights(throughput=1.0, fairness=0.0, interference=0.0, communication=0.0),
        ),
        (
            [6.0, 2.0],
            [0.005, 0.005],
            6.0,
            RewardWeights(throughput=0.5, fairness=2.0, interference=0.05, communication=0.1),
        ),
    ]:
        reward, terms = compute_team_reward(
            served_rates=served,
            interference=interference,
            communication_bits=bits,
            noise_power=1e-3,
            weights=wts,
        )
        cases.append(
            {
                "args": clean(
                    {
                        "served_rates": served,
                        "interference": interference,
                        "communication_bits": bits,
                        "noise_power": 1e-3,
                        "weights": dataclasses.asdict(wts),
                    }
                ),
                "expect": {"reward": clean(reward), "terms": clean(terms)},
            }
        )
    return {
        "equation": (
            "r = w_thr * mean(served) + w_fair * jain(served) "
            "- w_int * mean(interference)/noise - lambda * communication_bits"
        ),
        "default_weights": clean(dataclasses.asdict(weights)),
        "cases": cases,
    }


# --------------------------------------------------------------------------- #
# Rollouts
# --------------------------------------------------------------------------- #

#: A fully pinned configuration: explicit stations, users, positions and
#: demands, zero demand volatility, no mobility, no dropout.  Nothing in a
#: rollout of this config touches a random number generator, which is what
#: makes it reproducible in TypeScript.
def deterministic_config() -> WirelessConfig:
    """The RNG-free configuration used by ``rollout_deterministic``."""
    return WirelessConfig(
        name="fixture_deterministic",
        description=(
            "Fully pinned fixture configuration: no RNG is consulted anywhere, "
            "so a TypeScript port can reproduce this rollout exactly."
        ),
        n_base_stations=3,
        n_channels=3,
        station_positions=scenarios.DEFAULT_STATION_POSITIONS,
        users_per_station=(2, 2, 2),
        user_positions=(
            (4.20, 7.10),   # bs_0, close in
            (6.05, 9.30),   # bs_0, cell edge toward bs_2
            (1.60, 2.40),   # bs_1, close in
            (3.90, 4.60),   # bs_1, toward the middle
            (8.40, 4.10),   # bs_2, close in
            (6.30, 2.20),   # bs_2, toward bs_1
        ),
        initial_demands=(5.0, 3.0, 6.0, 4.0, 5.0, 2.0),
        demand_volatility=0.0,
        user_mobility=False,
        communication=True,
        bits_per_message=2,
        comm_dropout_probability=0.0,
        max_steps=10,
        seed=0,
    )


#: Ten joint actions chosen to exercise the interesting cases: a clean
#: orthogonal step, a three-way collision, an all-low-power step, partial
#: collisions and several channel permutations.
FIXTURE_ACTIONS: tuple[tuple[int, int, int], ...] = (
    (2, 5, 8),  # orthogonal, all high power: the interference-free reference
    (2, 2, 2),  # every station on channel 0 at high power: maximal collision
    (0, 3, 6),  # orthogonal, all low power
    (2, 5, 5),  # bs_1 and bs_2 collide on channel 1
    (8, 8, 8),  # every station on channel 2
    (1, 4, 7),  # orthogonal, all medium power
    (2, 8, 5),  # orthogonal, permuted
    (0, 0, 8),  # bs_0 and bs_1 collide on channel 0 at low power
    (5, 5, 5),  # every station on channel 1
    (8, 5, 2),  # orthogonal, reversed
)


def rollout_deterministic() -> dict[str, Any]:
    """A 10-step RNG-free rollout with the full action/reward/metric trace."""
    config = deterministic_config()
    env = CooperativeWirelessEnv(config)
    layout = observation_layout(config)
    observations, _ = env.reset(seed=None)

    trace: list[dict[str, Any]] = []
    initial_observations = {
        agent: clean(observation) for agent, observation in observations.items()
    }
    for step_actions in FIXTURE_ACTIONS:
        actions = {
            f"bs_{index}": int(action) for index, action in enumerate(step_actions)
        }
        observations, rewards, terminations, truncations, infos = env.step(actions)
        team = env.metrics()
        state = env.global_state()
        trace.append(
            {
                "step": int(team["step"]),
                "actions": clean(actions),
                "decoded_actions": {
                    agent: {"channel": decode_action(action)[0],
                            "power_level": decode_action(action)[1]}
                    for agent, action in actions.items()
                },
                "reward": clean(next(iter(rewards.values()))),
                "reward_terms": clean(team["reward_terms"]),
                "terminations": clean(terminations),
                "truncations": clean(truncations),
                "metrics": clean(
                    {key: value for key, value in team.items() if key != "reward_terms"}
                ),
                "user_sinr": clean(state["user_sinr"]),
                "user_capacity": clean(state["user_capacity"]),
                "user_served_rate": clean(state["user_served_rate"]),
                "user_interference": clean(state["user_interference"]),
                "observations": {
                    agent: clean(observation)
                    for agent, observation in observations.items()
                },
            }
        )
    return {
        "python_only": False,
        "notes": (
            "No random number generator is consulted in this rollout: station "
            "positions, user counts, user positions and demands are pinned, "
            "demand volatility is 0, mobility is off and message dropout is 0. "
            "A TypeScript port must reproduce every number here to within the "
            "fixture tolerance."
        ),
        "config": clean(dataclasses.asdict(config)),
        "agents": list(env.possible_agents),
        "observation_dimension": layout.size,
        "initial_observations": initial_observations,
        "episode_return": clean(sum(step["reward"] for step in trace)),
        "trace": trace,
    }


def rollout_seeded_numpy() -> dict[str, Any]:
    """A 10-step seeded rollout on the familiar topology (Python regression only)."""
    config = scenarios.familiar_topology(max_steps=10)
    env = CooperativeWirelessEnv(config)
    policy = baselines.RandomPolicy(config, seed=0)
    summary = baselines.run_episode(env, policy, seed=0, collect_trace=True)
    return {
        "python_only": True,
        "notes": (
            "This rollout depends on numpy's PCG64 bit stream (topology draw, "
            "demand process, random policy), which is not reasonably "
            "reproducible in TypeScript. It exists as a Python regression lock "
            "on environment behaviour, not as a cross-language fixture."
        ),
        "config": clean(dataclasses.asdict(config)),
        "policy": "RandomPolicy(seed=0)",
        "env_seed": 0,
        "summary": clean(
            {key: value for key, value in summary.items() if key != "trace"}
        ),
        "trace": clean(summary["trace"]),
    }


# --------------------------------------------------------------------------- #
# Assembly
# --------------------------------------------------------------------------- #


def build_fixture() -> dict[str, Any]:
    """Assemble the whole fixture dictionary."""
    layout = observation_layout(deterministic_config())
    return {
        "$schema_version": 1,
        "generated_by": "python3 -m wireless_env.fixtures.generate_test_vectors",
        "purpose": (
            "Cross-validation vectors for the TypeScript port of "
            "wireless_env.physics and wireless_env.metrics, plus a "
            "reproducible environment rollout for the Three.js lab."
        ),
        "provenance": (
            "Every value in this file is a computed output of the Python code in "
            "this repository, produced by running it. Nothing here is measured "
            "from a real network and nothing here is a published benchmark. The "
            "propagation model is a simplified educational wireless model in "
            "normalized units."
        ),
        "tolerance": TOLERANCE,
        "rounded_to_decimals": ROUND_TO,
        "units": (
            "All quantities are dimensionless / normalized: distances in a "
            "10x10 box, powers in [0, 1], bandwidth 1 so rates are bits/s/Hz."
        ),
        "physics": physics_vectors(),
        "metrics": metrics_vectors(),
        "actions": action_vectors(),
        "reward": reward_vectors(),
        "observation_layout": {
            "notes": (
                "Block offsets for the fixture rollout's configuration. The "
                "interference block is one step stale by construction, and the "
                "message block is a fixed width regardless of bits_per_message."
            ),
            "max_users_per_station": layout.max_users_per_station,
            "n_channels": layout.n_channels,
            "n_power_levels": layout.n_power_levels,
            "n_message_slots": layout.n_message_slots,
            "max_message_bits": layout.max_message_bits,
            "message_bit_names": list(MESSAGE_BIT_NAMES),
            "size": layout.size,
            "blocks": [
                {
                    "name": name,
                    "start": getattr(layout, name).start,
                    "stop": getattr(layout, name).stop,
                    "width": getattr(layout, name).stop - getattr(layout, name).start,
                }
                for name in layout.block_names()
            ],
        },
        "rollout_deterministic": rollout_deterministic(),
        "rollout_seeded_numpy": rollout_seeded_numpy(),
    }


def main() -> int:
    """Write the fixture to disk and print a summary."""
    fixture = build_fixture()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(fixture, indent=2, sort_keys=False, allow_nan=False) + "\n",
        encoding="utf-8",
    )
    n_physics = sum(
        len(block["cases"]) + len(block.get("errors", []))
        for key, block in fixture["physics"].items()
        if isinstance(block, dict) and "cases" in block
    )
    n_metrics = sum(
        len(block["cases"]) + len(block.get("errors", []))
        for block in fixture["metrics"].values()
    )
    print(f"wrote {OUTPUT_PATH}")
    print(f"  physics cases : {n_physics}")
    print(f"  metrics cases : {n_metrics}")
    print(f"  action table  : {len(fixture['actions']['table'])} entries")
    print(f"  reward cases  : {len(fixture['reward']['cases'])}")
    print("  rollouts      : deterministic (10 steps), seeded-numpy (10 steps)")
    print(f"  size          : {OUTPUT_PATH.stat().st_size / 1024:.1f} KiB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
