"""
Training loops. Small and readable, so the update rule stays visible.

The speaker-listener trainer needs PyTorch, which is an optional extra, so it
is imported on first use rather than at import time.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from cooperative_marl_labs.training.q_learning import (
    make_fixed_agents,
    make_wireless_agents,
    train_independent_q_learning,
    train_vdn,
)
from cooperative_marl_labs.training.vdn import combine_values

if TYPE_CHECKING:  # pragma: no cover
    from cooperative_marl_labs.training.communication import (
        protocol_matrix,
        train_communication_agents,
    )

_TORCH_ONLY = {
    "train_communication_agents",
    "train_speaker_listener",
    "protocol_matrix",
}

__all__ = [
    "train_independent_q_learning",
    "train_vdn",
    "combine_values",
    "make_wireless_agents",
    "make_fixed_agents",
    "train_communication_agents",
    "protocol_matrix",
]


def __getattr__(name: str):
    """Import the PyTorch trainer only when something asks for it."""
    if name in _TORCH_ONLY:
        try:
            from cooperative_marl_labs.training import communication
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
