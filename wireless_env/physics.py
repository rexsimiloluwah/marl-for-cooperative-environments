"""Pure functions for a simplified educational wireless model.

WHAT THIS MODULE IS
-------------------
This module implements **a simplified educational wireless model**.  It is a
teaching abstraction, not a telecommunications simulator, and it must never be
read as a calibrated model of a deployed cellular network.  It keeps exactly
three physical ideas, because those three are enough to make co-channel
interference and cooperative resource allocation *feel* real to a student:

1. signal strength falls off with distance (path loss),
2. two transmitters on the same channel interfere with each other,
3. a link's achievable rate grows only logarithmically with its SINR.

Everything a real system needs and this model deliberately omits: beamforming,
MIMO, OFDMA scheduling internals, ray tracing, fast/slow fading stacks,
handover, coding and modulation tables, control-plane signalling.

NORMALIZED UNITS (an explicit modelling choice)
-----------------------------------------------
Every quantity here is **dimensionless / normalized**.  We do not use metres,
watts, dBm or Hz, because carrying real units into a classroom exercise buys
nothing and invites the mistake of treating the outputs as measured engineering
results.  Concretely:

* ``distance``      -- normalized length.  The default deployment lives in a
                       10 x 10 box, so a distance of 1.0 is "quite close" and
                       8.0 is "across the map".
* ``power``         -- normalized transmit power in [0, 1].  The environment's
                       three power levels default to (0.2, 0.5, 1.0), read as
                       low / medium / high.
* ``gain``          -- normalized channel gain, output of :func:`channel_gain`.
* ``noise_power``   -- normalized noise power, written ``sigma^2`` in the
                       equations.  The environment default is 1e-3, which puts
                       useful links in the SINR ~ 10--100 range.
* ``bandwidth``     -- normalized bandwidth.  With ``bandwidth=1.0`` the rate
                       returned by :func:`shannon_rate` is spectral efficiency
                       in bits per second per hertz, so a rate of 6.0 means
                       "6 bits/s/Hz".

Because the units are normalized, SINR is a plain ratio and rates are plain
numbers.  A student can therefore reason about *relative* effects ("the
collision cost me 40% of my rate") which is the whole pedagogical point, without
ever being tempted to quote an absolute throughput figure.

WHY THIS FILE HAS NO CLASSES AND NO STATE
-----------------------------------------
This module is ported **line-for-line to TypeScript** for the Three.js lab, and
the browser lab and the Python notebooks must agree to the last decimal place.
So every function here is:

* pure -- output depends only on the arguments, never on module or global state,
* free of hidden defaults beyond the documented keyword defaults,
* dependency-light -- ``numpy`` is used only to vectorize; every function also
  accepts and returns plain Python floats, which is the code path the
  TypeScript port mirrors.

``wireless_env/fixtures/test_vectors.json`` holds input/output vectors for every
function below.  The TypeScript port is cross-validated against that file, so if
you change a formula here you must regenerate the fixtures and you will
knowingly change the browser lab too.

EQUATION REFERENCE
------------------
Channel gain (path loss)::

    g_iu = 1 / (d_iu + eps)^alpha

SINR of user ``u`` served by station ``i``::

                             P_i * g_iu
    SINR_u = ---------------------------------------------
             sigma^2 + sum_{j != i} P_j * g_ju * 1[c_j = c_i]

Achievable rate (Shannon)::

    R_u = B * log2(1 + SINR_u)
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from typing import Union

import numpy as np

__all__ = [
    "DEFAULT_EPSILON",
    "DEFAULT_PATH_LOSS_EXPONENT",
    "DEFAULT_BANDWIDTH",
    "channel_gain",
    "euclidean_distance",
    "pairwise_distances",
    "total_interference",
    "sinr",
    "shannon_rate",
    "interference_to_noise_ratio",
]

# --------------------------------------------------------------------------- #
# Documented defaults.  These are *constants*, not state: nothing in this
# module ever rebinds them, and every function takes them as a keyword default
# so a caller can always be explicit.
# --------------------------------------------------------------------------- #

#: Reference-distance offset ``eps`` in the path-loss law.  It exists so the
#: gain stays finite when a user stands exactly at the base station (d = 0).
DEFAULT_EPSILON: float = 1.0

#: Path-loss exponent ``alpha``.  2.0 is idealized free space; 3.0--4.0 is the
#: usual textbook range for cluttered urban propagation.  We default to 3.0.
DEFAULT_PATH_LOSS_EXPONENT: float = 3.0

#: Normalized bandwidth ``B``.  With B = 1 the Shannon rate is spectral
#: efficiency in bits/s/Hz.
DEFAULT_BANDWIDTH: float = 1.0

Number = Union[int, float, np.floating, np.integer]
ArrayLike = Union[Number, Sequence[Number], np.ndarray]


# --------------------------------------------------------------------------- #
# Internal validation helpers.
#
# Error messages are written to *teach*.  A student who sees one of these should
# learn what they got wrong about the model, not merely that a number was bad.
# --------------------------------------------------------------------------- #


def _is_sequence_like(value: object) -> bool:
    """Return ``True`` for numpy arrays, lists and tuples of numbers."""
    return isinstance(value, (np.ndarray, list, tuple))


def _as_float_array(name: str, value: ArrayLike) -> np.ndarray:
    """Coerce ``value`` to a 1-D float array, with a teaching error on failure."""
    try:
        array = np.asarray(value, dtype=float).reshape(-1)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
        raise ValueError(
            f"{name} must be a number or a sequence of numbers, got {value!r}. "
            "This model works in normalized scalar units; there are no complex "
            "channel coefficients or vector-valued gains here."
        ) from exc
    if not np.all(np.isfinite(array)):
        raise ValueError(
            f"{name} contains a non-finite value ({value!r}). Infinities and NaNs "
            "usually mean an earlier division by zero -- check that you passed a "
            "positive noise power and a positive (distance + epsilon)."
        )
    return array


def _check_non_negative(name: str, array: np.ndarray, hint: str) -> None:
    """Raise ``ValueError`` if any element of ``array`` is negative."""
    if np.any(array < 0.0):
        bad = float(array[array < 0.0][0])
        raise ValueError(f"{name} must be non-negative, got {bad}. {hint}")


def _check_positive_scalar(name: str, value: Number, hint: str) -> float:
    """Validate and return a strictly positive scalar."""
    numeric = float(value)
    if not math.isfinite(numeric):
        raise ValueError(f"{name} must be finite, got {numeric}. {hint}")
    if numeric <= 0.0:
        raise ValueError(f"{name} must be strictly positive, got {numeric}. {hint}")
    return numeric


# --------------------------------------------------------------------------- #
# 1. Path loss
# --------------------------------------------------------------------------- #


def channel_gain(
    distance: ArrayLike,
    epsilon: float = DEFAULT_EPSILON,
    alpha: float = DEFAULT_PATH_LOSS_EXPONENT,
) -> Union[float, np.ndarray]:
    """Distance-dependent channel gain between a station and a user.

    Implements

    .. math::

        g_{iu} = \\frac{1}{(d_{iu} + \\epsilon)^{\\alpha}}

    Read it as: *the further away you are, the weaker the signal, and it decays
    faster than linearly.*  Doubling the (offset) distance divides the gain by
    ``2 ** alpha`` -- with the default ``alpha = 3`` that is a factor of eight.
    This single equation is what makes spatial layout matter in the lab: a user
    at the edge of a cell is intrinsically much harder to serve than one at the
    centre, whatever channel it is assigned.

    Parameters
    ----------
    distance:
        Normalized distance ``d_iu``, a scalar or a sequence/array of scalars.
        Must be non-negative.
    epsilon:
        Reference-distance offset ``eps > 0``.  Without it, a user standing
        exactly at the base station (``d = 0``) would see infinite gain.  It
        also sets the maximum possible gain: ``g(0) = epsilon ** -alpha``.
    alpha:
        Path-loss exponent ``alpha > 0``.  Larger ``alpha`` means signals die
        off faster, which *reduces* interference between distant cells.

    Returns
    -------
    float or numpy.ndarray
        A plain ``float`` when ``distance`` is a scalar; a ``numpy.ndarray`` of
        the same length when ``distance`` is a sequence or array.  The scalar
        path is the canonical one and is what the TypeScript port mirrors.

    Raises
    ------
    ValueError
        If any distance is negative, if ``epsilon <= 0`` or if ``alpha <= 0``.

    Examples
    --------
    >>> round(channel_gain(0.0), 6)
    1.0
    >>> round(channel_gain(1.0), 6)
    0.125
    >>> round(channel_gain(3.0), 6)
    0.015625
    """
    epsilon = _check_positive_scalar(
        "epsilon",
        epsilon,
        "epsilon is the reference-distance offset that keeps the gain finite "
        "when a user stands exactly at the base station (d = 0). With "
        "epsilon = 0 the law 1/d^alpha diverges. Try epsilon = 1.0.",
    )
    alpha = _check_positive_scalar(
        "alpha",
        alpha,
        "alpha is the path-loss exponent: signal power must *decrease* with "
        "distance, so alpha > 0. Use 2.0 for idealized free space or 3.0-4.0 "
        "for cluttered urban propagation.",
    )

    distance_hint = (
        "Distance is a physical separation in normalized units. If you are "
        "subtracting two coordinates, take the norm of the difference "
        "(e.g. math.hypot(dx, dy) or physics.euclidean_distance) instead of "
        "the raw signed difference."
    )

    if _is_sequence_like(distance):
        distances = _as_float_array("distance", distance)
        _check_non_negative("distance", distances, distance_hint)
        return np.power(distances + epsilon, -alpha)

    scalar = float(distance)
    if not math.isfinite(scalar):
        raise ValueError(f"distance must be finite, got {scalar}. {distance_hint}")
    if scalar < 0.0:
        raise ValueError(f"distance must be non-negative, got {scalar}. {distance_hint}")
    return float((scalar + epsilon) ** (-alpha))


def euclidean_distance(
    point_a: Sequence[Number],
    point_b: Sequence[Number],
) -> float:
    """Straight-line distance between two 2-D points in normalized units.

    Implements ``d = sqrt((x_a - x_b)^2 + (y_a - y_b)^2)``.

    Provided here (rather than inlined in the environment) so the TypeScript
    port has exactly one distance function to mirror, and so students never
    accidentally feed a signed coordinate difference into
    :func:`channel_gain`.

    Examples
    --------
    >>> euclidean_distance((0.0, 0.0), (3.0, 4.0))
    5.0
    """
    a = _as_float_array("point_a", point_a)
    b = _as_float_array("point_b", point_b)
    if a.size != b.size:
        raise ValueError(
            f"point_a has {a.size} coordinate(s) but point_b has {b.size}. Both "
            "points must live in the same space -- this model uses 2-D (x, y) "
            "positions everywhere."
        )
    return float(math.sqrt(float(np.sum((a - b) ** 2))))


def pairwise_distances(
    points_a: Sequence[Sequence[Number]],
    points_b: Sequence[Sequence[Number]],
) -> np.ndarray:
    """Matrix of distances, ``out[i, j] = euclidean_distance(a_i, b_j)``.

    A vectorized convenience for the environment (stations x users).  The
    numbers are identical to calling :func:`euclidean_distance` in a double
    loop; only the speed differs.

    Returns
    -------
    numpy.ndarray
        Shape ``(len(points_a), len(points_b))``.
    """
    a = np.asarray(points_a, dtype=float).reshape(len(points_a), -1)
    b = np.asarray(points_b, dtype=float).reshape(len(points_b), -1)
    if a.shape[1] != b.shape[1]:
        raise ValueError(
            f"points_a has dimension {a.shape[1]} but points_b has dimension "
            f"{b.shape[1]}. Both sets of points must live in the same space."
        )
    diff = a[:, None, :] - b[None, :, :]
    return np.sqrt(np.sum(diff**2, axis=-1))


# --------------------------------------------------------------------------- #
# 2. Interference
# --------------------------------------------------------------------------- #


def _validate_interferers(
    interferer_powers: ArrayLike,
    interferer_gains: ArrayLike,
    same_channel_mask: ArrayLike,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Shared validation for the interference and SINR equations."""
    powers = _as_float_array("interferer_powers", interferer_powers)
    gains = _as_float_array("interferer_gains", interferer_gains)
    mask = _as_float_array("same_channel_mask", same_channel_mask)

    if not (powers.size == gains.size == mask.size):
        raise ValueError(
            f"interferer_powers has {powers.size} entries, interferer_gains has "
            f"{gains.size} and same_channel_mask has {mask.size}, but all three "
            "must line up element by element: every potential interferer needs "
            "one transmit power, one channel gain *to this user*, and one flag "
            "saying whether it shares this user's channel. A common cause is "
            "forgetting to exclude the serving station from the interferer "
            "lists -- the sum in the SINR equation runs over j != i."
        )

    _check_non_negative(
        "interferer_powers",
        powers,
        "Transmit powers are non-negative in normalized units; a switched-off "
        "or failed station has power 0.0, never a negative power.",
    )
    _check_non_negative(
        "interferer_gains",
        gains,
        "Channel gains are non-negative: they come from channel_gain(), which "
        "returns 1/(d + eps)^alpha > 0.",
    )
    if np.any((mask != 0.0) & (mask != 1.0)):
        raise ValueError(
            "same_channel_mask must contain only 0/1 (or False/True) values, "
            f"got {mask.tolist()}. It is the indicator 1[c_j = c_i] from the "
            "SINR equation: 1 when interferer j transmits on this user's "
            "channel, 0 otherwise. It is not a channel index."
        )
    return powers, gains, mask


def total_interference(
    interferer_powers: ArrayLike,
    interferer_gains: ArrayLike,
    same_channel_mask: ArrayLike,
) -> float:
    """Total co-channel interference power received by one user.

    Implements just the interference term of the SINR equation

    .. math::

        I_u = \\sum_{j \\neq i} P_j \\, g_{ju} \\, \\mathbf{1}[c_j = c_i]

    This is factored out as its own function for two reasons.  First, the
    master specification reports interference as a metric in its own right, so
    the lab needs the numerator-free quantity.  Second, it isolates the single
    most important idea in the whole module: **the indicator**.  A transmitter
    on a *different* channel contributes exactly zero, no matter how close or
    how loud it is.  Interference is not a property of geometry alone -- it is a
    property of geometry *and* the joint action of the agents.

    Parameters
    ----------
    interferer_powers:
        Transmit powers ``P_j`` of every *other* station (the serving station
        must not appear in this list).
    interferer_gains:
        Channel gains ``g_ju`` from each of those stations to **this** user.
    same_channel_mask:
        The indicator ``1[c_j = c_i]``, one 0/1 flag per interferer.

    Returns
    -------
    float
        The interference power, in the same normalized units as
        ``power * gain``.  Zero when the lists are empty or no interferer
        shares the channel.

    Examples
    --------
    Two nearby stations, only one of which shares our channel:

    >>> total_interference([1.0, 1.0], [0.1, 0.5], [1, 0])
    0.1
    """
    powers, gains, mask = _validate_interferers(
        interferer_powers, interferer_gains, same_channel_mask
    )
    if powers.size == 0:
        return 0.0
    return float(np.sum(powers * gains * mask))


def sinr(
    serving_power: Number,
    serving_gain: Number,
    interferer_powers: ArrayLike,
    interferer_gains: ArrayLike,
    same_channel_mask: ArrayLike,
    noise_power: Number,
) -> float:
    """Signal-to-interference-plus-noise ratio for one user.

    Implements

    .. math::

        \\mathrm{SINR}_u =
        \\frac{P_i \\, g_{iu}}
              {\\sigma^2 + \\sum_{j \\neq i} P_j \\, g_{ju}
               \\mathbf{1}[c_j = c_i]}

    The three levers a student can pull map directly onto the three parts of
    this fraction:

    * move a user closer, or raise ``P_i``  -> bigger numerator, better SINR;
    * put a neighbour on a *different* channel -> the indicator zeroes its term
      out of the denominator, better SINR;
    * raise a co-channel neighbour's power -> bigger denominator, worse SINR.

    That last one is the cooperative dilemma in one line: my power increase is
    your denominator increase.

    Parameters
    ----------
    serving_power:
        ``P_i``, the transmit power of the station serving this user.
    serving_gain:
        ``g_iu``, the channel gain from that station to this user.
    interferer_powers, interferer_gains, same_channel_mask:
        As documented on :func:`total_interference`.  The serving station must
        be excluded.
    noise_power:
        ``sigma^2``, the normalized noise power at the receiver.  May be 0.0,
        but only if at least one co-channel interferer is active -- otherwise
        the denominator is zero and the SINR is undefined.

    Returns
    -------
    float
        A dimensionless ratio, always finite and non-negative.

    Raises
    ------
    ValueError
        If any power or gain is negative, if the lists disagree in length, or
        if the denominator ``sigma^2 + I_u`` comes out as zero.

    Examples
    --------
    A clean link (no co-channel interferer):

    >>> round(sinr(1.0, 0.0625, [1.0], [0.01], [0], 1e-3), 4)
    62.5

    The same link once the interferer moves onto our channel:

    >>> round(sinr(1.0, 0.0625, [1.0], [0.01], [1], 1e-3), 4)
    5.6818
    """
    power = float(serving_power)
    gain = float(serving_gain)
    noise = float(noise_power)

    for name, value, hint in (
        (
            "serving_power",
            power,
            "Transmit power is non-negative in normalized units. A failed or "
            "silent base station has serving_power = 0.0.",
        ),
        (
            "serving_gain",
            gain,
            "Channel gain is non-negative -- it is the output of "
            "channel_gain(), which returns 1/(d + eps)^alpha.",
        ),
        (
            "noise_power",
            noise,
            "Noise power sigma^2 is a power, so it cannot be negative. Real "
            "receivers always have some thermal noise; this model's default is "
            "the small positive value 1e-3.",
        ),
    ):
        if not math.isfinite(value):
            raise ValueError(f"{name} must be finite, got {value}. {hint}")
        if value < 0.0:
            raise ValueError(f"{name} must be non-negative, got {value}. {hint}")

    interference = total_interference(
        interferer_powers, interferer_gains, same_channel_mask
    )
    denominator = noise + interference
    if denominator <= 0.0:
        raise ValueError(
            "The SINR denominator (sigma^2 + interference) is zero, so the SINR "
            "is undefined and the Shannon rate would diverge. You passed "
            f"noise_power = {noise} with total interference {interference}. "
            "Give the receiver a small positive noise power (the model default "
            "is 1e-3): every real receiver has thermal noise, and it is what "
            "keeps achievable rate finite."
        )
    return float(power * gain / denominator)


# --------------------------------------------------------------------------- #
# 3. Rate
# --------------------------------------------------------------------------- #


def shannon_rate(
    sinr_value: ArrayLike,
    bandwidth: float = DEFAULT_BANDWIDTH,
) -> Union[float, np.ndarray]:
    """Achievable rate of a link from its SINR.

    Implements

    .. math::

        R_u = B \\log_2 (1 + \\mathrm{SINR}_u)

    The ``log2`` is the reason cooperative channel allocation beats brute-force
    power escalation in this model.  Rate is *concave* in SINR: going from
    SINR 1 to SINR 3 buys a whole bit per symbol, while going from SINR 100 to
    SINR 102 buys almost nothing.  So spending power to shout over a collision
    is a bad trade, while moving to a clean channel -- which multiplies the
    SINR of a badly interfered user -- is a very good one.  Students should be
    able to see that in the numbers, not just be told it.

    Parameters
    ----------
    sinr_value:
        SINR as returned by :func:`sinr`.  Scalar or sequence/array.  Must be
        non-negative; ``0`` gives a rate of ``0``.
    bandwidth:
        Normalized bandwidth ``B``.  With the default ``B = 1`` the return
        value is spectral efficiency in bits/s/Hz.

    Returns
    -------
    float or numpy.ndarray
        ``float`` for scalar input, ``numpy.ndarray`` for sequence input.

    Raises
    ------
    ValueError
        If any SINR is negative or ``bandwidth`` is negative.

    Examples
    --------
    >>> shannon_rate(0.0)
    0.0
    >>> shannon_rate(1.0)
    1.0
    >>> round(shannon_rate(7.0), 6)
    3.0
    """
    band = float(bandwidth)
    if not math.isfinite(band) or band < 0.0:
        raise ValueError(
            f"bandwidth must be a finite non-negative number, got {band}. In "
            "normalized units bandwidth 1.0 means 'report the rate as spectral "
            "efficiency in bits/s/Hz'."
        )

    sinr_hint = (
        "SINR is a ratio of non-negative powers, so it cannot be negative. A "
        "negative value almost always means the interference term ended up in "
        "the numerator, or that a power/gain was passed with the wrong sign."
    )

    if _is_sequence_like(sinr_value):
        values = _as_float_array("sinr_value", sinr_value)
        _check_non_negative("sinr_value", values, sinr_hint)
        return band * np.log2(1.0 + values)

    scalar = float(sinr_value)
    if not math.isfinite(scalar):
        raise ValueError(f"sinr_value must be finite, got {scalar}. {sinr_hint}")
    if scalar < 0.0:
        raise ValueError(f"sinr_value must be non-negative, got {scalar}. {sinr_hint}")
    return float(band * math.log2(1.0 + scalar))


def interference_to_noise_ratio(
    interference: ArrayLike,
    noise_power: Number,
) -> Union[float, np.ndarray]:
    """Interference expressed in units of the noise floor, ``I / sigma^2``.

    Implements ``INR = I_u / sigma^2``.

    Raw interference powers in this model are small numbers such as ``0.004``,
    which are hard to read and hard to use as a reward penalty.  Dividing by
    the noise floor gives a dimensionless, human-legible quantity: ``INR = 0``
    means "noise-limited, nothing to complain about", ``INR = 1`` means "the
    interference I am suffering is exactly as strong as my own thermal noise",
    and ``INR = 20`` means "I am badly drowned out".  The environment reports
    interference to agents in these units for exactly that reason.

    Raises
    ------
    ValueError
        If ``interference`` is negative or ``noise_power`` is not positive.
    """
    noise = _check_positive_scalar(
        "noise_power",
        noise_power,
        "The noise floor is the reference this ratio is measured against, so it "
        "must be strictly positive. The model default is 1e-3.",
    )
    hint = "Interference is a received power and cannot be negative."
    if _is_sequence_like(interference):
        values = _as_float_array("interference", interference)
        _check_non_negative("interference", values, hint)
        return values / noise
    scalar = float(interference)
    if not math.isfinite(scalar):
        raise ValueError(f"interference must be finite, got {scalar}. {hint}")
    if scalar < 0.0:
        raise ValueError(f"interference must be non-negative, got {scalar}. {hint}")
    return float(scalar / noise)
