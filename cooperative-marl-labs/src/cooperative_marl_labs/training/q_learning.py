"""
Training loops for the wireless practical.

One loop covers both methods, because the only difference between them is how
the error is computed. Keeping them in one function is what makes the
comparison honest: nothing else about the run can drift.
"""

from __future__ import annotations

from typing import Any, Literal

from cooperative_marl_labs.agents.q_learning import (
    CommunicatingWirelessAgent,
    QLearningWirelessAgent,
)
from cooperative_marl_labs.envs.wireless_resource_allocation import (
    WirelessResourceAllocationEnv,
)
from cooperative_marl_labs.training.vdn import combine_values

Method = Literal["iql", "vdn"]


def make_wireless_agents(
    env: WirelessResourceAllocationEnv,
    epsilon: float = 0.2,
    alpha: float = 0.05,
    seed: int = 0,
) -> dict[str, QLearningWirelessAgent]:
    """One learner per access point, matching the environment's comm setting."""
    cls = CommunicatingWirelessAgent if env.communication else QLearningWirelessAgent
    return {
        agent: cls(
            agent,
            env.n_channels,
            env.n_agents,
            alpha=alpha,
            epsilon=epsilon,
            seed=seed + i,
        )
        for i, agent in enumerate(env.possible_agents)
    }


def make_fixed_agents(
    env: WirelessResourceAllocationEnv,
    cls,
    seed: int = 0,
    **kwargs,
) -> dict[str, Any]:
    """
    One non-learning agent per access point, each with a DIFFERENT seed.

    Sharing one seed across agents is a trap worth avoiding: identically seeded
    random agents draw the identical channel every step, so they collide on
    every step and score like the worst possible policy rather than like
    chance.
    """
    out: dict[str, Any] = {}
    for i, agent in enumerate(env.possible_agents):
        try:
            out[agent] = cls(
                agent, env.n_channels, env.n_agents, seed=seed + i, **kwargs
            )
        except TypeError:
            out[agent] = cls(agent, env.n_channels, **kwargs)
    return out


def _train(
    env: WirelessResourceAllocationEnv,
    method: Method,
    episodes: int,
    seed: int,
    epsilon: float,
    alpha: float,
) -> tuple[dict[str, QLearningWirelessAgent], list[float]]:
    agents = make_wireless_agents(env, epsilon=epsilon, alpha=alpha, seed=seed)
    history: list[float] = []

    for episode in range(episodes):
        obs, _ = env.reset(seed=seed * 100003 + episode)
        total = 0.0
        steps = 0
        done = False
        while not done:
            actions = {a: agents[a].act(obs[a]) for a in env.possible_agents}
            next_obs, rewards, terminations, truncations, _ = env.step(actions)
            reward = float(next(iter(rewards.values())))

            if method == "iql":
                # each access point credits itself with the whole team reward
                for a in env.possible_agents:
                    agents[a].update(obs[a], actions[a], reward)
            else:
                # one error on the SUM of the individual values
                q_total = combine_values(
                    [agents[a].values(obs[a])[actions[a]] for a in env.possible_agents]
                )
                delta = reward - q_total
                for a in env.possible_agents:
                    row = agents[a].values(obs[a])
                    row[actions[a]] += agents[a].alpha * delta

            total += reward
            steps += 1
            done = any(terminations.values()) or any(truncations.values())
            obs = next_obs
        history.append(total / max(1, steps))

    return agents, history


def train_independent_q_learning(
    env: WirelessResourceAllocationEnv,
    episodes: int = 4000,
    seed: int = 0,
    epsilon: float = 0.2,
    alpha: float = 0.05,
) -> tuple[dict[str, QLearningWirelessAgent], list[float]]:
    """
    Independent Q-learning: every access point learns alone.

    Each one receives the whole team reward as its own target, so it cannot
    tell its own contribution apart from its neighbours'.

    Returns the trained agents and the per-episode mean team reward.
    """
    return _train(env, "iql", episodes, seed, epsilon, alpha)


def train_vdn(
    env: WirelessResourceAllocationEnv,
    episodes: int = 4000,
    seed: int = 0,
    epsilon: float = 0.2,
    alpha: float = 0.05,
) -> tuple[dict[str, QLearningWirelessAgent], list[float]]:
    """
    Value decomposition: one error on the sum of the individual values.

    Execution stays decentralized. Only the target changes, which is the whole
    of VDN at this scale.

    Returns the trained agents and the per-episode mean team reward.
    """
    return _train(env, "vdn", episodes, seed, epsilon, alpha)
