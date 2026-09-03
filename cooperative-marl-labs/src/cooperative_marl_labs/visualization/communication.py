"""P(message | target) as a heatmap. The main figure of the Communicate lab."""

from __future__ import annotations

import matplotlib.pyplot as plt
import numpy as np


def plot_protocol_heatmap(
    matrix: np.ndarray,
    target_names: list[str] | None = None,
    title: str = "Learned protocol  P(m | target)",
    ax=None,
):
    """
    One row per target, one column per symbol.

    A converged protocol has exactly one bright cell per row. A row spread
    evenly across several columns means the speaker never committed to a
    convention for that target.
    """
    m = np.asarray(matrix, dtype=float)
    n_targets, n_messages = m.shape
    names = target_names or [f"target {i}" for i in range(n_targets)]
    if ax is None:
        _, ax = plt.subplots(figsize=(4.6, 3.2))
    ax.imshow(m, cmap="Blues", vmin=0, vmax=1, aspect="auto")
    ax.set_xticks(range(n_messages), [f"m={j}" for j in range(n_messages)])
    ax.set_yticks(range(n_targets), names)
    for i in range(n_targets):
        for j in range(n_messages):
            ax.text(
                j,
                i,
                f"{m[i, j]:.2f}",
                ha="center",
                va="center",
                color="white" if m[i, j] > 0.5 else "#333333",
                fontsize=8,
            )
    ax.set_title(title)
    ax.grid(False)
    return ax


#: Previous name, kept so older notebooks keep working.
plot_protocol = plot_protocol_heatmap
