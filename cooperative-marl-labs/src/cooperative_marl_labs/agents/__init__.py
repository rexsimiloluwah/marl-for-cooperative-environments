"""
Agents used across the practicals.

``Speaker`` and ``Listener`` need PyTorch, which is an optional extra, so they
are imported on first use rather than at import time. Everything else works
with the base install.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from cooperative_marl_labs.agents.base import Agent, WirelessAgent
from cooperative_marl_labs.agents.q_learning import (
    CommunicatingWirelessAgent,
    QLearningAgent,
    QLearningWirelessAgent,
)
from cooperative_marl_labs.agents.random import RandomAgent, RandomWirelessAgent
from cooperative_marl_labs.agents.wireless import (
    GreedyWirelessAgent,
    discretize_observation,
    interference_level,
)

if TYPE_CHECKING:  # pragma: no cover
    from cooperative_marl_labs.agents.communication import Listener, Speaker, onehot

_TORCH_ONLY = {"Speaker", "Listener", "onehot"}

__all__ = [
    "Agent",
    "WirelessAgent",
    "RandomAgent",
    "RandomWirelessAgent",
    "GreedyWirelessAgent",
    "QLearningAgent",
    "QLearningWirelessAgent",
    "CommunicatingWirelessAgent",
    "discretize_observation",
    "interference_level",
    "Speaker",
    "Listener",
    "onehot",
]


def __getattr__(name: str):
    """Import the PyTorch agents only when something asks for them."""
    if name in _TORCH_ONLY:
        try:
            from cooperative_marl_labs.agents import communication
        except ImportError as exc:
            import importlib.util

            if importlib.util.find_spec("torch") is None:
                raise ImportError(
                    f"{name} needs PyTorch. Install the learning extra:\n"
                    '    pip install "cooperative-marl-labs[learning]"'
                ) from exc
            raise  # torch is present, so this is a real error worth seeing
        return getattr(communication, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
