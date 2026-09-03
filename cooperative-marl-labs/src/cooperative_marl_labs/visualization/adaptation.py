"""Figures for the Adapt lab: cross-play, and what an estimator believes."""

from __future__ import annotations

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from cooperative_marl_labs.visualization.palette import CONFLICT, INK, POLICY


def plot_crossplay_matrix(
    df: pd.DataFrame,
    title: str = "Cross-play",
    ax=None,
    vmax: float | None = None,
):
    """
    Every ego against every partner, with the familiar pairings outlined.

    The diagonal is what a standard evaluation reports. The off-diagonal is the
    number that says whether anything generalized, so read the two together or
    the figure says nothing.
    """
    values = df.to_numpy(dtype=float)
    if ax is None:
        _, ax = plt.subplots(figsize=(5.4, 4.0))
    ax.imshow(values, cmap="RdYlGn", vmin=0, vmax=vmax or float(values.max()))
    for i in range(values.shape[0]):
        for j in range(values.shape[1]):
            ax.text(j, i, f"{values[i, j]:.2f}", ha="center", va="center", fontsize=8)
    ax.set_xticks(range(len(df.columns)), list(df.columns), rotation=25, ha="right")
    ax.set_yticks(range(len(df.index)), list(df.index))
    columns = list(df.columns)
    for i, name in enumerate(df.index):
        if name in columns:
            j = columns.index(name)
            ax.add_patch(
                plt.Rectangle(
                    (j - 0.5, i - 0.5),
                    1,
                    1,
                    fill=False,
                    edgecolor=INK,
                    linewidth=2,
                )
            )
    ax.set_title(title)
    ax.grid(False)
    return ax


def plot_partner_estimate(
    estimates,
    truth=None,
    switch_at: int | None = None,
    title: str = "What the ego believes about its partner",
    ax=None,
):
    """
    An estimator's belief over time, against the truth it is chasing.

    Parameters
    ----------
    estimates:
        Estimated P(FETCH) after each step.
    truth:
        The partner's actual P(FETCH), a scalar or one value per step.
    switch_at:
        Step at which the partner was replaced, marked with a vertical rule.
        A windowed estimator crosses to the new value; one that averages the
        whole history does not.
    """
    y = np.asarray(estimates, dtype=float)
    x = np.arange(len(y))
    if ax is None:
        _, ax = plt.subplots(figsize=(5.6, 3.2))

    if truth is not None:
        t = np.asarray(truth, dtype=float)
        if t.ndim == 0:
            t = np.full_like(y, float(t))
        ax.plot(x, t, color=INK, lw=1.4, ls="--", label="true P(FETCH)")
    ax.plot(x, y, color=POLICY, lw=2.0, label="estimate")

    if switch_at is not None:
        ax.axvline(switch_at, color=CONFLICT, lw=1.6, alpha=0.8)
        ax.text(
            switch_at,
            1.02,
            " partner changed",
            color=CONFLICT,
            fontsize=8,
            va="bottom",
        )

    ax.set_xlabel("step")
    ax.set_ylabel("P(FETCH)")
    ax.set_ylim(-0.05, 1.05)
    ax.set_title(title)
    ax.legend(fontsize=8, frameon=False)
    return ax


#: Previous name, kept so older notebooks keep working.
plot_crossplay = plot_crossplay_matrix
