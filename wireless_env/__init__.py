"""``wireless_env`` -- a cooperative wireless resource-allocation teaching package.

This package is the Python simulation backend of the *Multi-Agent
Reinforcement Learning for Cooperative Environments* educational resource.  It
implements **a simplified educational wireless model** in which each base
station is one agent, all agents share a single team reward, and every agent
sees only its own local, partial view of the network.

Layout
------
``physics``
    Pure functions: path loss, interference, SINR, Shannon rate.  No state, no
    classes, ported line-for-line to TypeScript for the browser lab.
``metrics``
    Pure functions: throughput, Jain fairness, communication overhead,
    generalization gap, robustness.
``environment``
    :class:`~wireless_env.environment.CooperativeWirelessEnv`, a
    PettingZoo-parallel-*shaped* multi-agent environment built on numpy only.
``scenarios``
    Declarative configs for the seven evaluation deployments (familiar, unseen
    topology, traffic surge, noisy channel, station failure, new station joins,
    reduced communication).
``baselines``
    Hand-coded reference policies: random, greedy-local, round-robin and fixed
    orthogonal.  **None of these is a learned policy.**
``fixtures/test_vectors.json``
    Machine-readable input/output vectors for every physics and metrics
    function plus a deterministic 10-step rollout, used to cross-validate the
    TypeScript port.  Regenerate with
    ``python3 -m wireless_env.fixtures.generate_test_vectors``.

Dependencies
------------
``numpy`` plus the standard library.  Deliberately no torch, no gymnasium and
no pettingzoo, so the package runs in a bare Colab kernel and inside Pyodide.

Honesty
-------
Every number this package produces is the output of a simplified teaching
simulator.  Nothing here is a measured result from a real network and nothing
here is a published benchmark.  There are no learned policies in this package;
the baselines are hand-coded and labelled as such.

Quick start
-----------
>>> from wireless_env import CooperativeWirelessEnv, scenarios, baselines
>>> env = CooperativeWirelessEnv(scenarios.familiar_topology())
>>> observations, _ = env.reset(seed=0)
>>> policy = baselines.FixedOrthogonalPolicy(env.config, seed=0)
>>> observations, rewards, terminations, truncations, infos = env.step(
...     policy.act(observations))
>>> sorted(rewards) == env.agents
True
"""

from __future__ import annotations

from . import baselines, metrics, physics, scenarios
from .baselines import (
    FixedOrthogonalPolicy,
    GreedyLocalPolicy,
    Policy,
    RandomPolicy,
    RoundRobinPolicy,
    evaluate_policy,
    run_episode,
)
from .environment import (
    MAX_MESSAGE_BITS,
    POWER_LABELS,
    Box,
    CooperativeWirelessEnv,
    Discrete,
    ObservationLayout,
    RewardWeights,
    WirelessConfig,
    compute_team_reward,
    decode_action,
    encode_action,
    observation_layout,
    unpack_observation,
)
from .metrics import (
    communication_overhead,
    generalization_gap,
    jain_fairness,
    mean_throughput,
    relative_generalization_gap,
    robustness,
    total_throughput,
    worst_user_throughput,
)
from .physics import channel_gain, shannon_rate, sinr, total_interference
from .scenarios import EVALUATION_SUITE, SCENARIOS, make_scenario

__version__ = "0.1.0"

__all__ = [
    "__version__",
    # submodules
    "physics",
    "metrics",
    "scenarios",
    "baselines",
    # physics
    "channel_gain",
    "sinr",
    "shannon_rate",
    "total_interference",
    # metrics
    "jain_fairness",
    "total_throughput",
    "mean_throughput",
    "worst_user_throughput",
    "communication_overhead",
    "generalization_gap",
    "relative_generalization_gap",
    "robustness",
    # environment
    "CooperativeWirelessEnv",
    "WirelessConfig",
    "RewardWeights",
    "ObservationLayout",
    "Discrete",
    "Box",
    "encode_action",
    "decode_action",
    "observation_layout",
    "unpack_observation",
    "compute_team_reward",
    "POWER_LABELS",
    "MAX_MESSAGE_BITS",
    # scenarios
    "SCENARIOS",
    "EVALUATION_SUITE",
    "make_scenario",
    # baselines
    "Policy",
    "RandomPolicy",
    "GreedyLocalPolicy",
    "RoundRobinPolicy",
    "FixedOrthogonalPolicy",
    "run_episode",
    "evaluate_policy",
]
