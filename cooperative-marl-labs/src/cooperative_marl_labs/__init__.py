"""
Lightweight cooperative multi-agent environments and utilities for teaching.

Built for the Colab practicals in *Multi-Agent Reinforcement Learning for
Cooperative Environments*. Everything here is deliberately small: a learner
should be able to read an environment end to end, run it on a free CPU, and
attribute every effect they see to one cause.

These are TEACHING MODELS, not research benchmarks. The wireless environment in
particular is a simplified interference model with no fading, mobility or
protocol overhead. No number produced by this package should be quoted as a
benchmark result or as a wireless engineering result.

Quick start
-----------
>>> from cooperative_marl_labs.envs import SpeakerListenerEnv
>>> env = SpeakerListenerEnv(n_targets=3, message_vocab_size=3)
>>> observations, infos = env.reset(seed=42)
>>> sorted(observations)
['listener', 'speaker']
"""

__version__ = "0.1.0"

from cooperative_marl_labs.envs import (
    PartnerCoordinationEnv,
    SpeakerListenerEnv,
    WirelessResourceAllocationEnv,
)

__all__ = [
    "PartnerCoordinationEnv",
    "SpeakerListenerEnv",
    "WirelessResourceAllocationEnv",
    "__version__",
]
