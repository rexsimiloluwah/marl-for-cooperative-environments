"""
Tabular Q-learning.

Deliberately tabular. A deep agent would hide the thing these practicals are
about: exactly what each agent conditions on, and exactly what it is credited
with.
"""

from __future__ import annotations

from collections.abc import Callable, Hashable
from typing import Any

import numpy as np

from cooperative_marl_labs.agents.base import Agent, WirelessAgent
from cooperative_marl_labs.agents.wireless import discretize_observation


class QLearningAgent(Agent):
    """
    Q-learning over whatever key ``key_fn`` produces from an observation.

    Parameters
    ----------
    key_fn:
        Maps an observation to a hashable state. Choosing this is the modelling
        decision, so it is an argument rather than something hidden inside.
    """

    def __init__(
        self,
        n_actions: int,
        key_fn: Callable[[Any], Hashable],
        alpha: float = 0.05,
        epsilon: float = 0.2,
        seed: int | None = None,
    ) -> None:
        super().__init__(n_actions, seed)
        self.key_fn = key_fn
        self.alpha = float(alpha)
        self.epsilon = float(epsilon)
        self.q: dict[Hashable, np.ndarray] = {}

    def values(self, observation) -> np.ndarray:
        """The action-value row for this observation, created on first sight."""
        key = self.key_fn(observation)
        if key not in self.q:
            self.q[key] = np.zeros(self.n_actions)
        return self.q[key]

    def act(self, observation=None, greedy: bool = False, **kwargs) -> int:
        if not greedy and self.rng.random() < self.epsilon:
            return int(self.rng.integers(self.n_actions))
        return int(np.argmax(self.values(observation)))

    def update(
        self, observation, action, reward, next_observation=None, done: bool = True
    ) -> None:
        """
        One-step update with no bootstrap.

        Each allocation step is scored on its own, so there is no return to
        propagate. Keeping it this simple is what makes the credit an agent
        receives readable in the notebook.
        """
        row = self.values(observation)
        row[action] += self.alpha * (reward - row[action])


class QLearningWirelessAgent(WirelessAgent):
    """Tabular Q-learning over the discretized local observation."""

    def __init__(
        self,
        agent_id: str,
        n_channels: int,
        n_agents: int = 4,
        communication: bool = False,
        alpha: float = 0.05,
        epsilon: float = 0.2,
        seed: int | None = None,
    ) -> None:
        super().__init__(agent_id, n_channels, n_agents, communication, seed)
        self.alpha = float(alpha)
        self.epsilon = float(epsilon)
        self.q: dict[Hashable, np.ndarray] = {}

    def _key(self, observation) -> Hashable:
        return discretize_observation(
            observation, self.n_channels, self.n_agents, self.communication
        )

    def values(self, observation) -> np.ndarray:
        key = self._key(observation)
        if key not in self.q:
            self.q[key] = np.zeros(self.n_channels)
        return self.q[key]

    def act(self, observation=None, greedy: bool = False, **kwargs) -> int:
        if not greedy and self.rng.random() < self.epsilon:
            return int(self.rng.integers(self.n_channels))
        return int(np.argmax(self.values(observation)))

    def update(
        self, observation, action, reward, next_observation=None, done: bool = True
    ) -> None:
        row = self.values(observation)
        row[action] += self.alpha * (reward - row[action])


class CommunicatingWirelessAgent(QLearningWirelessAgent):
    """
    The same learner, with the received message bits in its state key.

    Nothing else changes, which is the point: the only difference between this
    agent and the one above is what it is allowed to condition on.
    """

    def __init__(
        self, agent_id: str, n_channels: int, n_agents: int = 4, **kwargs
    ) -> None:
        kwargs.pop("communication", None)
        super().__init__(agent_id, n_channels, n_agents, communication=True, **kwargs)

    @property
    def messages_received(self) -> int:
        """How many message bits this agent's state key includes per step."""
        return self.n_agents - 1
