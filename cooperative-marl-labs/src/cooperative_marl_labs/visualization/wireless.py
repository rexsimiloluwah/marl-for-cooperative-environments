"""
Figures for the wireless lab.

The renderer draws the network as it actually is: real access point positions,
coverage that overlaps where the coupling is strong, and an edge between any
two access points sharing a channel whose weight is that pair's coupling. A
learner should be able to see why two access points interfere without reading a
number.
"""

from __future__ import annotations

import matplotlib.pyplot as plt
import numpy as np

from cooperative_marl_labs.envs.wireless_resource_allocation import (
    NEGLIGIBLE_COUPLING,
)
from cooperative_marl_labs.visualization.palette import (
    CONFLICT,
    INK,
    MUTED,
    channel_colour,
)


def render_wireless_network(
    env,
    actions=None,
    title: str = "Channel allocation",
    ax=None,
    show_users: bool = True,
):
    """
    Draw the current allocation.

    Parameters
    ----------
    env:
        A ``WirelessResourceAllocationEnv``. Its positions, demands and
        coupling matrix are what get drawn.
    actions:
        Channel per access point. Defaults to the environment's last step.
    """
    allocation = list(actions) if actions is not None else env.last_actions
    if allocation is None:
        raise ValueError(
            "no allocation to draw: step the environment or pass actions="
        )

    positions = np.asarray(env.positions, dtype=float)
    demand = np.asarray(env.demand, dtype=float)
    coupling = np.asarray(env.coupling, dtype=float)
    n = len(allocation)

    if ax is None:
        _, ax = plt.subplots(figsize=(6.4, 3.6))

    # coverage first, so it sits behind everything
    for i in range(n):
        ax.add_patch(
            plt.Circle(
                positions[i],
                0.75,
                color=channel_colour(allocation[i]),
                alpha=0.10,
                zorder=0,
            )
        )

    # interference edges, thickness proportional to coupling
    for i in range(n):
        for j in range(i + 1, n):
            if allocation[i] != allocation[j]:
                continue
            weak = coupling[i, j] <= NEGLIGIBLE_COUPLING
            ax.plot(
                [positions[i, 0], positions[j, 0]],
                [positions[i, 1], positions[j, 1]],
                color=CONFLICT,
                lw=1.0 + 4.0 * coupling[i, j],
                alpha=0.35 if weak else 0.85,
                ls=":" if weak else "-",
                zorder=1,
            )
            mid = (positions[i] + positions[j]) / 2.0
            ax.text(
                mid[0],
                mid[1] + 0.10,
                f"{coupling[i, j]:.2f}",
                color=CONFLICT,
                fontsize=7,
                ha="center",
                zorder=4,
            )

    for i in range(n):
        x, y = positions[i]
        colour = channel_colour(allocation[i])
        ax.scatter([x], [y], s=520, color=colour, edgecolor=INK, zorder=3)
        ax.text(
            x, y, f"AP{i}", ha="center", va="center",
            color="white", fontweight="bold", fontsize=8, zorder=4,
        )
        ax.text(
            x, y - 0.42,
            f"ch {allocation[i]}   demand {demand[i]:.1f}",
            ha="center", fontsize=7.5, color=MUTED, zorder=4,
        )
        if show_users:
            # three users per access point, purely indicative
            for angle in (0.7, 1.9, 2.9):
                ax.scatter(
                    [x + 0.42 * np.cos(angle)],
                    [y + 0.30 * np.sin(angle)],
                    s=26, marker="^", color=MUTED, zorder=2,
                )

    pad = 1.05
    ax.set_xlim(positions[:, 0].min() - pad, positions[:, 0].max() + pad)
    ax.set_ylim(positions[:, 1].min() - pad, positions[:, 1].max() + pad)
    ax.set_aspect("equal")
    ax.set_title(
        f"{title}\nred edges join access points sharing a channel, "
        "labelled with their coupling",
        fontsize=9,
    )
    ax.axis("off")
    ax.grid(False)
    return ax


def plot_wireless_comparison(
    results: dict[str, dict[str, float]],
    metric: str = "team_reward",
    ceiling: float | None = None,
    title: str | None = None,
    ax=None,
):
    """
    One bar per system, in the order given.

    Parameters
    ----------
    results:
        ``{system name: metrics dict}``, as returned by ``evaluate_agents``.
    ceiling:
        Best achievable value, drawn as a rule. A bar chart without it invites
        the reader to treat the tallest bar as good rather than as best so far.
    """
    names = list(results)
    values = [float(results[n][metric]) for n in names]
    if ax is None:
        _, ax = plt.subplots(figsize=(6.0, 3.2))

    ax.bar(names, values, color=channel_colour(1), edgecolor=INK, linewidth=0.6)
    for i, v in enumerate(values):
        ax.text(i, v, f" {v:.2f}", ha="center", va="bottom", fontsize=8)

    if ceiling is not None:
        ax.axhline(ceiling, color=INK, ls="--", lw=1.2)
        ax.text(
            len(names) - 0.5, ceiling,
            f" best possible {ceiling:.2f}",
            fontsize=8, va="bottom", ha="right",
        )

    ax.set_ylabel(metric.replace("_", " "))
    ax.set_title(title or f"{metric.replace('_', ' ')} by system")
    ax.tick_params(axis="x", rotation=15)
    return ax


#: Previous name, kept so older notebooks keep working.
render_network = render_wireless_network
