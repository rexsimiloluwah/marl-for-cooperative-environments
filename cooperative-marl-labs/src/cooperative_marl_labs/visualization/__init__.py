"""Plots. Each one answers a single learning question."""

from cooperative_marl_labs.visualization.adaptation import (
    plot_crossplay_matrix,
    plot_partner_estimate,
)
from cooperative_marl_labs.visualization.communication import plot_protocol_heatmap
from cooperative_marl_labs.visualization.palette import (
    CHANNEL_COLOURS,
    channel_colour,
)
from cooperative_marl_labs.visualization.wireless import (
    plot_wireless_comparison,
    render_wireless_network,
)

__all__ = [
    "plot_protocol_heatmap",
    "plot_crossplay_matrix",
    "plot_partner_estimate",
    "render_wireless_network",
    "plot_wireless_comparison",
    "channel_colour",
    "CHANNEL_COLOURS",
]
