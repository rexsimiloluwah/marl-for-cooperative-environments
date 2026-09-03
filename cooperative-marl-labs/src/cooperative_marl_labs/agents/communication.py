"""
Speaker and listener networks for the Communicate practical.

Two tiny multilayer perceptrons. The speaker maps a target to logits over
symbols; the listener maps a received symbol to logits over targets. Neither
has any built-in notion of what a symbol means, because that is the thing the
practical is about.
"""

from __future__ import annotations

import torch
import torch.nn as nn


class Speaker(nn.Module):
    def __init__(self, n_targets: int, n_messages: int, hidden: int = 32) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(n_targets, hidden), nn.ReLU(), nn.Linear(hidden, n_messages)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class Listener(nn.Module):
    def __init__(self, n_messages: int, n_targets: int, hidden: int = 32) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(n_messages, hidden), nn.ReLU(), nn.Linear(hidden, n_targets)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


def onehot(index: int, n: int) -> torch.Tensor:
    """A one-hot vector of length ``n`` with position ``index`` set.

    Targets and symbols are categorical, and a one-hot input keeps the network
    from reading an ordering into them that the task does not have.
    """
    v = torch.zeros(n)
    v[index] = 1.0
    return v
