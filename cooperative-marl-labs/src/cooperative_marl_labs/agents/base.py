"""
Agent interfaces.

Two things only: what an agent must be able to do, and a seeded generator so
nothing in this package touches global NumPy random state.
"""

from __future__ import annotations

import numpy as np


class Agent:
    """
    Minimal interface. ``update`` is a no-op for agents that do not learn.

    Every agent owns its own generator. Two agents constructed with the same
    seed behave identically, which is why the training helpers offset seeds per
    agent rather than sharing one.
    """

    def __init__(self, n_actions: int, seed: int | None = None) -> None:
        self.n_actions = int(n_actions)
        self.rng = np.random.default_rng(seed)

    def act(self, observation=None, **kwargs) -> int:
        raise NotImplementedError

    def update(
        self,
        observation,
        action,
        reward,
        next_observation=None,
        done: bool = False,
    ) -> None:
        return None


class WirelessAgent(Agent):
    """
    An access point choosing one channel per step.

    Subclasses read the observation through the ``extract_*`` helpers rather
    than hardcoding offsets, so turning communication on cannot silently change
    what a field means.
    """

    def __init__(
        self,
        agent_id: str,
        n_channels: int,
        n_agents: int = 4,
        communication: bool = False,
        seed: int | None = None,
    ) -> None:
        super().__init__(n_channels, seed)
        self.agent_id = agent_id
        self.n_channels = int(n_channels)
        self.n_agents = int(n_agents)
        self.communication = bool(communication)

    def __repr__(self) -> str:
        return f"{type(self).__name__}({self.agent_id!r}, n_channels={self.n_channels})"
