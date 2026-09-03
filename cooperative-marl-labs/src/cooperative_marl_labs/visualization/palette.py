"""
One palette, shared with the rest of the resource.

Colour carries meaning here rather than decoration, and the channel colours are
the same three used in the lab illustration, so a plot and the picture on the
website agree about which channel is which.
"""

OBSERVE = "#2191fb"
ACTION = "#fea82f"
POLICY = "#5448c8"
REWARD = "#5da271"
CONFLICT = "#fc5130"
INK = "#191919"
MUTED = "#666666"

#: Channel 0, 1, 2, ... in the colours the illustration uses.
CHANNEL_COLOURS = (POLICY, OBSERVE, REWARD, ACTION, CONFLICT)


def channel_colour(channel: int) -> str:
    """The colour for one channel, wrapping if there are more than five.

    The same three colours the lab illustration uses, so a plot and the picture
    on the website agree about which channel is which.
    """
    return CHANNEL_COLOURS[int(channel) % len(CHANNEL_COLOURS)]
