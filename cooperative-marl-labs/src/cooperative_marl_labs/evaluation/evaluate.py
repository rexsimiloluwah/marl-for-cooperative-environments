"""
Reusable evaluation.

Always greedy: an evaluation that keeps exploring reports a policy nobody would
deploy. And always from a fixed seed, so two systems are compared on the same
episodes rather than on different luck.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from typing import Any

#: Metrics averaged per step by :func:`evaluate_agents`.
WIRELESS_METRICS = (
    "team_reward",
    "total_throughput",
    "mean_throughput",
    "interference",
    "collision_rate",
    "messages_sent",
)


def _greedy(policy, observation) -> int:
    """Ask for a greedy action, tolerating agents that have no such option."""
    try:
        return int(policy.act(observation, greedy=True))
    except TypeError:
        return int(policy.act(observation))


def evaluate_agents(
    env,
    agents: Mapping[str, Any],
    episodes: int = 100,
    seed: int = 42,
    replace: Mapping[str, Any] | None = None,
) -> dict[str, float]:
    """
    Run ``episodes`` greedy episodes and return per-step averages.

    Parameters
    ----------
    replace:
        Swaps in a policy for one agent id, which is how an unfamiliar access
        point is introduced without retraining anything.

    Returns
    -------
    dict
        ``team_reward``, ``total_throughput``, ``mean_throughput``,
        ``interference``, ``collision_rate``, ``messages_sent``, plus
        ``avoidable_interference``: how much of the interference a better
        allocation could have removed. That last one matters because with more
        access points than channels some interference is unavoidable, so raw
        interference makes every policy look equally bad.
    """
    policies = dict(agents)
    if replace:
        policies.update(replace)

    floor = env.min_interference() if hasattr(env, "min_interference") else 0.0
    totals = dict.fromkeys(WIRELESS_METRICS, 0.0)
    totals["avoidable_interference"] = 0.0
    steps = 0

    for episode in range(episodes):
        obs, _ = env.reset(seed=seed + episode)
        done = False
        while not done:
            actions = {
                a: _greedy(policies[a], obs[a]) for a in env.possible_agents
            }
            obs, rewards, terminations, truncations, infos = env.step(actions)
            info = next(iter(infos.values()))
            for key in WIRELESS_METRICS:
                if key == "team_reward":
                    totals[key] += float(next(iter(rewards.values())))
                else:
                    totals[key] += float(info.get(key, 0.0))
            totals["avoidable_interference"] += max(
                0.0, float(info.get("interference", 0.0)) - floor
            )
            steps += 1
            done = any(terminations.values()) or any(truncations.values())

    return {k: v / max(1, steps) for k, v in totals.items()}


def evaluate_partner_policy(
    env,
    ego_act: Callable[[Any, list[int]], int],
    partner,
    episodes: int = 200,
    seed: int = 42,
    switch: tuple[int, Any] | None = None,
) -> float:
    """
    Mean reward per step for an ego policy against one partner.

    ``ego_act(observation, partner_history)`` keeps the signature wide enough
    for both a fixed policy and one that infers from the history.

    ``switch`` replaces the partner part-way through every episode, which is
    how the lab tests whether an estimator can notice a change.
    """
    env.set_partner(partner)
    if switch is not None:
        env.set_partner_switch(switch[0], switch[1])
    total = 0.0
    steps = 0
    for episode in range(episodes):
        obs, _ = env.reset(seed=seed + episode)
        done = False
        while not done:
            action = int(ego_act(obs["ego"], list(env.partner_history)))
            obs, rewards, terminations, truncations, _ = env.step({"ego": action})
            total += float(rewards["ego"])
            steps += 1
            done = terminations["ego"] or truncations["ego"]
    return total / max(1, steps)
