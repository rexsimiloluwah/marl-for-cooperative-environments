"""Uniform-random agents. The baseline every other number is read against."""

from __future__ import annotations

from cooperative_marl_labs.agents.base import Agent, WirelessAgent


class RandomAgent(Agent):
    """Picks uniformly among the actions, ignoring the observation."""

    def act(self, observation=None, **kwargs) -> int:
        return int(self.rng.integers(self.n_actions))


class RandomWirelessAgent(WirelessAgent):
    """
    Picks a channel uniformly at random.

    Worth measuring rather than assuming: random spreading is a surprisingly
    hard baseline to beat with local rules, because it never synchronizes.
    """

    def act(self, observation=None, **kwargs) -> int:
        return int(self.rng.integers(self.n_channels))
