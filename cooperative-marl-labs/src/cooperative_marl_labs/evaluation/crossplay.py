"""
Cross-play.

Every ego against every partner. The diagonal is the familiar pairing and the
number a standard evaluation reports; the off-diagonal is the one that says
whether anything transferred.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from typing import Any

import pandas as pd


def crossplay_matrix(
    ego_policies: Mapping[str, Any],
    partner_policies: Mapping[str, Any],
    evaluate_fn: Callable[[Any, Any], float],
) -> pd.DataFrame:
    """
    Returns a DataFrame indexed by ego name, columns by partner name.

    `evaluate_fn(ego, partner)` returns one score.
    """
    rows = {
        ego_name: {
            partner_name: float(evaluate_fn(ego, partner))
            for partner_name, partner in partner_policies.items()
        }
        for ego_name, ego in ego_policies.items()
    }
    df = pd.DataFrame(rows).T
    df.index.name = "ego trained with"
    df.columns.name = "evaluated against"
    return df
