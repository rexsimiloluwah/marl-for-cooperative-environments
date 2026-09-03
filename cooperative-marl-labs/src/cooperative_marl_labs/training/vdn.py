"""
VALUE DECOMPOSITION

The team value is the sum of the individual values, so there is one error on
that sum, applied to every agent. Independent learning instead hands each agent
the whole team reward as its own target.

That single difference is the whole of VDN at this scale, which is why it lives
in a short function rather than a class.
"""

from __future__ import annotations

from collections.abc import Sequence


def combine_values(q_values: Sequence[float]) -> float:
    """Q_tot as the sum of the per-agent values. This is the VDN assumption."""
    return float(sum(q_values))
