"""
Wireless-specific decision rules and the state discretization.

Kept separate from the learners so the one hand-written rule in the lab, the
greedy access point, sits where a learner can read it in isolation.
"""

from __future__ import annotations

from collections.abc import Hashable
from typing import Any

import numpy as np

from cooperative_marl_labs.agents.base import WirelessAgent
from cooperative_marl_labs.envs.wireless_resource_allocation import (
    NEGLIGIBLE_COUPLING,
    extract_channel_quality,
    extract_interference,
    observation_layout,
)


class GreedyWirelessAgent(WirelessAgent):
    """
    Picks the channel with the best quality minus the interference it measured.

    Every decision it makes is individually sensible. Because every access
    point runs the identical deterministic rule on a similar observation, they
    tend to move to the same channel together, which is exactly why this agent
    is in the lab.
    """

    def act(self, observation=None, **kwargs) -> int:
        quality = extract_channel_quality(observation, self.n_channels)
        interference = extract_interference(observation, self.n_channels)
        return int(np.argmax(quality - interference))


def interference_level(value: float) -> int:
    """
    Bin a continuous interference measurement into three levels.

    Interference is a summed coupling rather than a count, so it has to be
    binned before it can index a table. Three levels: clear, a distant
    neighbour, a close one.
    """
    v = float(value)
    if v <= NEGLIGIBLE_COUPLING:
        return 0
    if v < 0.5:
        return 1
    return 2


def discretize_observation(
    observation,
    n_channels: int,
    n_agents: int = 4,
    communication: bool = False,
) -> Hashable:
    """
    A small hashable state key for tabular learning.

    Keeps the demand level, the previous channel, and a coarse interference
    level per channel. Channel quality is dropped because it is constant unless
    an experiment degrades a channel, and including it would multiply the table
    for nothing.
    """
    obs = np.asarray(observation, dtype=float)
    layout = observation_layout(n_channels, n_agents, communication)
    demand_level = 1 if obs[layout["demand"]][0] >= 2.0 else 0
    previous = int(obs[layout["previous_channel"]][0])
    interference = tuple(
        interference_level(x) for x in obs[layout["interference"]]
    )
    key: tuple[Any, ...] = (demand_level, previous, interference)
    if communication:
        key = key + (tuple(int(x) for x in obs[layout["messages"]]),)
    return key
