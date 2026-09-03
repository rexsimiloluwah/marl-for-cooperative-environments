"""
Measure every wireless number the notebooks and the written material quote.

Run this after any change to the environment's physics. The reward model
determines every one of these figures, so a change there means updating the
notebook takeaways and the lab pages, not just the package version.

Everything is averaged over three training seeds, because a single seed moves
enough to invent an effect that is not there.

    python3 scripts/marl/measure_wireless.py
"""

from __future__ import annotations

import json
import pathlib
import statistics

from cooperative_marl_labs.agents import GreedyWirelessAgent, RandomWirelessAgent
from cooperative_marl_labs.envs import WirelessResourceAllocationEnv
from cooperative_marl_labs.evaluation import evaluate_agents
from cooperative_marl_labs.training import (
    make_fixed_agents,
    train_independent_q_learning,
    train_vdn,
)

EPISODES = 4000
EVAL = 150
SEEDS = (0, 1, 2)


def ceiling(env, episodes: int = EVAL, seed: int = 42) -> float:
    """Mean best-possible team reward over the evaluation episodes."""
    return statistics.fmean(
        (env.reset(seed=seed + i), env.best_possible())[1] for i in range(episodes)
    )


def summarize(values: list[float]) -> dict[str, float]:
    return {
        "mean": round(statistics.fmean(values), 2),
        "min": round(min(values), 2),
        "max": round(max(values), 2),
    }


def make(traffic: str, communication: bool = False, price: float = 0.05):
    return WirelessResourceAllocationEnv(
        traffic=traffic, communication=communication, communication_weight=price
    )


SYSTEMS = {
    "Independent": (train_independent_q_learning, False, 0.05),
    "Coordinated": (train_vdn, False, 0.05),
    "Coordinated + comm": (train_vdn, True, 0.05),
}


def train_all() -> dict[str, list[tuple]]:
    """Train every system on every seed, once, and reuse the results."""
    trained: dict[str, list[tuple]] = {}
    for name, (train, comm, price) in SYSTEMS.items():
        runs = []
        for seed in SEEDS:
            env = make("skewed", comm, price)
            agents, _ = train(env, episodes=EPISODES, seed=seed)
            runs.append((env, agents))
        trained[name] = runs
        print(f"  trained {name} on {len(SEEDS)} seeds")
    return trained


def main() -> None:
    out: dict[str, object] = {"protocol": {
        "training_episodes": EPISODES,
        "evaluation_episodes": EVAL,
        "seeds": list(SEEDS),
        "note": "Teaching model, not a benchmark. Means over the seeds above.",
    }}

    reference = make("skewed")
    print("=== geometry ===")
    print("coupling:")
    for row in reference.coupling:
        print("   ", "  ".join(f"{v:.3f}" for v in row))
    out["coupling"] = [[round(float(v), 3) for v in row] for row in reference.coupling]
    out["interference_floor"] = round(float(reference.min_interference()), 3)
    print(f"unavoidable interference floor: {out['interference_floor']}")

    skewed_ceiling = ceiling(make("skewed"))
    hotspot_ceiling = ceiling(make("hotspot"))
    uniform_ceiling = ceiling(make("uniform"))
    out["ceiling"] = {
        "skewed": round(skewed_ceiling, 2),
        "hotspot": round(hotspot_ceiling, 2),
        "uniform": round(uniform_ceiling, 2),
    }
    print(f"\nceilings: {out['ceiling']}")

    print("\n=== training ===")
    trained = train_all()

    print("\n=== main table ===")
    table: dict[str, dict] = {}
    for name, cls in (("Random", RandomWirelessAgent), ("Greedy local", GreedyWirelessAgent)):
        env = make("skewed")
        # a fixed rule does not train, so seeds only move the agents' own draws
        runs = [
            evaluate_agents(env, make_fixed_agents(env, cls, seed=s), episodes=EVAL)
            for s in SEEDS
        ]
        table[name] = {
            k: round(statistics.fmean(r[k] for r in runs), 2) for k in runs[0]
        }
    for name, runs in trained.items():
        evaluated = [evaluate_agents(env, agents, episodes=EVAL) for env, agents in runs]
        table[name] = {
            k: round(statistics.fmean(r[k] for r in evaluated), 2) for k in evaluated[0]
        }
        table[name]["team_reward_spread"] = summarize(
            [r["team_reward"] for r in evaluated]
        )
    header = f"{'system':22s} {'reward':>7s} {'thrput':>7s} {'avoid I':>8s} {'coll':>6s} {'msgs':>5s}"
    print(header)
    for name, m in table.items():
        print(
            f"{name:22s} {m['team_reward']:7.2f} {m['total_throughput']:7.2f} "
            f"{m['avoidable_interference']:8.2f} {m['collision_rate']:6.2f} "
            f"{m['messages_sent']:5.1f}"
        )
    print(f"{'Ceiling':22s} {skewed_ceiling:7.2f}")
    out["main"] = table

    print("\n=== communication price sweep ===")
    sweep = {}
    for price in (0.0, 0.02, 0.05, 0.10, 0.25):
        rewards, throughput = [], []
        for seed in SEEDS:
            env = make("skewed", True, price)
            agents, _ = train_vdn(env, episodes=EPISODES, seed=seed)
            m = evaluate_agents(env, agents, episodes=EVAL)
            rewards.append(m["team_reward"])
            throughput.append(m["total_throughput"])
        sweep[price] = {
            "team_reward": round(statistics.fmean(rewards), 2),
            "total_throughput": round(statistics.fmean(throughput), 2),
        }
        print(
            f"  price {price:5.2f} -> reward {sweep[price]['team_reward']:.2f}  "
            f"throughput {sweep[price]['total_throughput']:.2f}"
        )
    print(f"  silent Coordinated reference: {table['Coordinated']['team_reward']:.2f}")
    out["price_sweep"] = sweep

    print("\n=== traffic shift: trained skewed, evaluated hotspot ===")
    shift = {}
    for name, runs in trained.items():
        moved = []
        for env, agents in runs:
            hot = make("hotspot", env.communication, env.communication_weight)
            moved.append(evaluate_agents(hot, agents, episodes=EVAL)["team_reward"])
        mean = statistics.fmean(moved)
        shift[name] = {
            "trained_regime": table[name]["team_reward"],
            "hotspot": round(mean, 2),
            "drop": round(table[name]["team_reward"] - mean, 2),
            "gap_to_hotspot_ceiling": round(hotspot_ceiling - mean, 2),
        }
        print(
            f"  {name:22s} {table[name]['team_reward']:.2f} -> {mean:.2f}  "
            f"drop {shift[name]['drop']:.2f}  "
            f"gap to hotspot ceiling {shift[name]['gap_to_hotspot_ceiling']:.2f}"
        )
    out["traffic_shift"] = shift

    print("\n=== why the talking system moves worst ===")
    print("individual state coverage first, then the joint behaviour")
    coverage = {}
    for name in ("Coordinated", "Coordinated + comm"):
        env, agents = trained[name][0]
        seen = set()
        for agent in agents.values():
            seen |= set(agent.q)
        hot = make("hotspot", env.communication, env.communication_weight)
        unseen, total = 0, 0
        for episode in range(40):
            obs, _ = hot.reset(seed=42 + episode)
            done = False
            while not done:
                actions = {}
                for a in hot.possible_agents:
                    key = agents[a]._key(obs[a])
                    total += 1
                    if key not in seen:
                        unseen += 1
                    actions[a] = int(agents[a].act(obs[a], greedy=True))
                obs, _, term, trunc, _ = hot.step(actions)
                done = any(term.values()) or any(trunc.values())
        coverage[name] = {
            "states_learned": len(seen),
            "unseen_state_rate_on_hotspot": round(unseen / max(1, total), 3),
        }
        print(
            f"  {name:22s} learned {len(seen):4d} states, "
            f"{100 * unseen / max(1, total):5.1f}% of hotspot decisions "
            "land in a state it never saw"
        )
    out["state_coverage"] = coverage

    print("\n  what they actually choose (60 episodes, seed 0 model):")
    joint = {}
    for name in ("Coordinated", "Coordinated + comm"):
        env, agents = trained[name][0]
        for traffic in ("skewed", "hotspot"):
            probe = make(traffic, env.communication, env.communication_weight)
            counts: dict[tuple, int] = {}
            for episode in range(60):
                obs, _ = probe.reset(seed=42 + episode)
                done = False
                while not done:
                    chosen = tuple(
                        int(agents[a].act(obs[a], greedy=True))
                        for a in probe.possible_agents
                    )
                    counts[chosen] = counts.get(chosen, 0) + 1
                    obs, _, term, trunc, _ = probe.step(
                        dict(zip(probe.possible_agents, chosen, strict=True))
                    )
                    done = any(term.values()) or any(trunc.values())
            steps = sum(counts.values())
            distinct = sum(len(set(a)) * n for a, n in counts.items()) / steps
            top = max(counts, key=counts.get)
            joint[f"{name} on {traffic}"] = {
                "mean_distinct_channels": round(distinct, 2),
                "most_common_allocation": list(top),
                "share_of_steps": round(counts[top] / steps, 2),
            }
            print(
                f"    {name:20s} on {traffic:8s} "
                f"uses {distinct:.2f} distinct channels, "
                f"most common {top} on {100 * counts[top] / steps:3.0f}% of steps"
            )
    out["joint_behaviour"] = joint

    print("\n=== unfamiliar access point replaces ap_3 ===")
    stranger = {}
    for name, runs in trained.items():
        scores = []
        for env, agents in runs:
            fresh = make("skewed", env.communication, env.communication_weight)
            outsider = {
                "ap_3": GreedyWirelessAgent(
                    "ap_3", fresh.n_channels, fresh.n_agents, env.communication, seed=99
                )
            }
            scores.append(
                evaluate_agents(fresh, agents, episodes=EVAL, replace=outsider)[
                    "team_reward"
                ]
            )
        mean = statistics.fmean(scores)
        stranger[name] = {
            "familiar": table[name]["team_reward"],
            "stranger": round(mean, 2),
            "drop": round(table[name]["team_reward"] - mean, 2),
        }
        print(
            f"  {name:22s} {table[name]['team_reward']:.2f} -> {mean:.2f}  "
            f"drop {stranger[name]['drop']:.2f}"
        )
    out["stranger"] = stranger

    print("\n=== message loss, Coordinated + comm, no retraining ===")
    loss = {}
    for p in (0.0, 0.1, 0.3, 0.5):
        scores = []
        for env, agents in trained["Coordinated + comm"]:
            env.set_message_loss(p)
            scores.append(evaluate_agents(env, agents, episodes=EVAL)["team_reward"])
            env.set_message_loss(0.0)
        loss[p] = round(statistics.fmean(scores), 2)
        print(f"  p_loss {p:.1f} -> reward {loss[p]:.2f}")
    out["message_loss"] = loss

    path = pathlib.Path("scripts/marl/wireless_measurements.json")
    path.write_text(json.dumps(out, indent=2) + "\n")
    print(f"\nwritten to {path}")


if __name__ == "__main__":
    main()
