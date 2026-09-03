"""Evaluation metrics for the cooperative wireless resource-allocation task.

Like :mod:`wireless_env.physics`, everything in this module is a **pure
function** of its arguments, and everything is ported line-for-line to
TypeScript for the browser lab.  Input/output vectors for every function live
in ``wireless_env/fixtures/test_vectors.json``.

The metric set is the one the teaching package evaluates every policy on:

======================  =====================================================
metric                  question it answers
======================  =====================================================
total throughput        How much did the network deliver in total?
mean throughput         What did the average user get?
worst-user throughput   What did the *unluckiest* user get?
Jain fairness index     Was the service spread evenly?
interference            How much did the agents get in each other's way?
                        (computed in :mod:`wireless_env.physics`)
communication overhead  What did coordination cost in bits?
generalization gap      How much performance was lost off the training
                        distribution?
robustness              How bad was the worst deployment we tried?
======================  =====================================================

Two of these -- total throughput and Jain fairness -- are in deliberate
tension, and the whole ADAPT/COORDINATE storyline leans on that tension.  A
policy can raise total throughput by pouring capacity into users who are
already close to their station and abandoning the far ones; that shows up
immediately as a fall in fairness and in worst-user throughput.  Reporting all
of them together is what stops a student from declaring victory on a single
number.

A NOTE ON WHAT THESE NUMBERS ARE
--------------------------------
Every value produced by this module is an output of this teaching model.  None
of it is a measured result from a real network, and none of it is a published
benchmark.  When you write up numbers from these functions, say what they are:
outputs of a simplified educational simulator.
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from typing import Union

import numpy as np

__all__ = [
    "jain_fairness",
    "total_throughput",
    "mean_throughput",
    "worst_user_throughput",
    "communication_overhead",
    "generalization_gap",
    "relative_generalization_gap",
    "robustness",
]

Number = Union[int, float, np.floating, np.integer]
RateSequence = Union[Sequence[Number], np.ndarray]


def _as_rates(name: str, rates: RateSequence, *, allow_empty: bool = False) -> np.ndarray:
    """Coerce and validate a vector of per-user rates."""
    try:
        array = np.asarray(rates, dtype=float).reshape(-1)
    except (TypeError, ValueError) as exc:
        raise ValueError(
            f"{name} must be a sequence of numbers (one per user), got {rates!r}."
        ) from exc
    if array.size == 0 and not allow_empty:
        raise ValueError(
            f"{name} is empty. These metrics are defined over at least one user; "
            "an empty network has no throughput and no fairness to report. If "
            "you reached this from the environment, check that your topology "
            "actually generated users."
        )
    if not np.all(np.isfinite(array)):
        raise ValueError(
            f"{name} contains a non-finite value ({array.tolist()}). Rates come "
            "from physics.shannon_rate, which is finite for every finite "
            "non-negative SINR -- an inf or NaN here usually means a zero SINR "
            "denominator upstream."
        )
    if np.any(array < 0.0):
        raise ValueError(
            f"{name} must be non-negative, got {array.tolist()}. A rate is an "
            "amount of data delivered per unit time; a user that is served "
            "nothing has rate 0.0, never a negative rate."
        )
    return array


# --------------------------------------------------------------------------- #
# Fairness
# --------------------------------------------------------------------------- #


def jain_fairness(rates: RateSequence) -> float:
    """Jain's fairness index of an allocation.

    Implements

    .. math::

        J(x_1, \\dots, x_n) =
        \\frac{\\left(\\sum_{i} x_i\\right)^2}{n \\sum_{i} x_i^2}

    Properties worth making a student verify by hand, because they are what
    make the index readable:

    * **Bounded.**  For non-negative inputs, ``1/n <= J <= 1``.
    * **J = 1 exactly when every user gets the same rate** -- perfectly equal
      service.  Note that it says nothing about *how much* they get: an
      all-equal allocation of a terrible rate also scores 1.0, which is why
      fairness must always be read next to throughput.
    * **J = 1/n when one user gets everything** and the rest get nothing --
      the most unequal allocation possible.  With three users that is 1/3.
    * **Scale invariant.**  ``J(2x) == J(x)``.  Doubling everyone's rate does
      not change fairness.

    Parameters
    ----------
    rates:
        Non-negative per-user rates, one entry per user.

    Returns
    -------
    float
        The index, in ``[1/n, 1]``.

    Notes
    -----
    **The all-zero convention (an explicit choice).**  When every rate is zero
    the formula is ``0 / 0`` and undefined.  This implementation returns
    ``1.0``, on the reading that "nobody is served" is a perfectly *equal*
    outcome even though it is a catastrophic one.  The alternatives are to
    return ``nan`` (mathematically honest, but it poisons every downstream
    average and reward) or ``0.0`` (intuitive as a failure flag, but wrong:
    ``0`` is below the ``1/n`` lower bound the index is supposed to respect,
    so it silently breaks the "fairness lives in [1/n, 1]" story students are
    taught).  Returning ``1.0`` keeps the bound intact and keeps rewards
    finite; the catastrophe is still perfectly visible in
    :func:`total_throughput`, which is exactly ``0``.  This matters in practice
    in the base-station-failure scenario, where a total blackout is reachable.

    Raises
    ------
    ValueError
        If ``rates`` is empty or contains a negative or non-finite value.

    Examples
    --------
    >>> jain_fairness([1.0, 1.0, 1.0])
    1.0
    >>> round(jain_fairness([3.0, 0.0, 0.0]), 10)
    0.3333333333
    >>> round(jain_fairness([4.0, 2.0]), 4)
    0.9
    >>> jain_fairness([0.0, 0.0])   # documented all-zero convention
    1.0
    """
    values = _as_rates("rates", rates)
    n = values.size
    sum_of_squares = float(np.sum(values**2))
    if sum_of_squares == 0.0:
        # Every rate is zero: see the "all-zero convention" note above.
        return 1.0
    total = float(np.sum(values))
    return float(total**2 / (n * sum_of_squares))


# --------------------------------------------------------------------------- #
# Throughput
# --------------------------------------------------------------------------- #


def total_throughput(rates: RateSequence) -> float:
    """Aggregate delivered rate, ``sum_i x_i``.

    The network-operator metric: how much the whole system delivered.  On its
    own it is easy to game -- serving three nearby users very well and ignoring
    a far one can beat serving all four decently.  Always read it beside
    :func:`worst_user_throughput` and :func:`jain_fairness`.

    Examples
    --------
    >>> total_throughput([1.5, 2.5, 0.0])
    4.0
    """
    return float(np.sum(_as_rates("rates", rates)))


def mean_throughput(rates: RateSequence) -> float:
    """Average per-user rate, ``(1/n) sum_i x_i``.

    Useful when comparing deployments with different numbers of users, where
    :func:`total_throughput` would reward the bigger network for being bigger.

    Examples
    --------
    >>> mean_throughput([1.0, 2.0, 3.0])
    2.0
    """
    return float(np.mean(_as_rates("rates", rates)))


def worst_user_throughput(rates: RateSequence) -> float:
    """Rate of the worst-served user, ``min_i x_i``.

    The max-min / cell-edge metric.  This is the number a regulator or an
    unhappy customer cares about, and the one that collapses first when agents
    coordinate badly: a user whose station collides with a loud neighbour can
    go to nearly zero while the network total barely moves.

    Examples
    --------
    >>> worst_user_throughput([1.0, 2.0, 3.0])
    1.0
    """
    return float(np.min(_as_rates("rates", rates)))


# --------------------------------------------------------------------------- #
# Communication cost
# --------------------------------------------------------------------------- #


def communication_overhead(messages_sent: Number, bits_per_message: Number) -> float:
    """Total coordination traffic in bits, ``messages_sent * bits_per_message``.

    Communication is not free, and pretending it is makes cooperative MARL look
    better than it is.  Every bit an agent spends telling a neighbour what it
    is doing is a bit not spent carrying user data, plus latency, plus a
    dependency that can fail.  This function is the currency in which that cost
    is charged: the environment multiplies the returned bit count by the
    communication penalty ``lambda`` and subtracts it from the team reward.

    Counting convention: ``messages_sent`` is the number of messages actually
    **transmitted** in the period being measured (a broadcast to two
    neighbours counts as two messages), and ``bits_per_message`` is the
    per-message payload width in bits.  A dropped message still costs the bits
    it consumed, because the transmitter spent them.

    Parameters
    ----------
    messages_sent:
        Non-negative count of transmitted messages.
    bits_per_message:
        Non-negative payload width in bits (the lab exposes 0, 1, 2 and 4).

    Returns
    -------
    float
        Total bits.  ``0.0`` when communication is switched off, since either
        factor is then zero.

    Raises
    ------
    ValueError
        If either argument is negative or non-finite.

    Examples
    --------
    Three stations, each broadcasting a 2-bit message to its two neighbours,
    for one timestep:

    >>> communication_overhead(6, 2)
    12.0
    >>> communication_overhead(6, 0)   # communication switched off
    0.0
    """
    messages = float(messages_sent)
    bits = float(bits_per_message)
    if not math.isfinite(messages) or messages < 0.0:
        raise ValueError(
            f"messages_sent must be a finite non-negative count, got {messages}. "
            "It counts messages actually transmitted; with communication "
            "switched off it is 0."
        )
    if not math.isfinite(bits) or bits < 0.0:
        raise ValueError(
            f"bits_per_message must be a finite non-negative width, got {bits}. "
            "It is the payload size in bits (the lab offers 0, 1, 2 and 4); a "
            "0-bit message carries no information and costs nothing."
        )
    return float(messages * bits)


# --------------------------------------------------------------------------- #
# Generalization and robustness
# --------------------------------------------------------------------------- #


def generalization_gap(
    familiar_performance: Number,
    unseen_performance: Number,
) -> float:
    """Absolute performance drop from a familiar to an unseen deployment.

    Implements ``gap = familiar_performance - unseen_performance``.

    **Sign convention (an explicit choice):** the gap is *positive when
    performance degrades* off-distribution, because that is the case students
    are hunting for and a positive "gap" reads naturally as "we lost this
    much".  A negative gap is not an error -- it means the policy did *better*
    on the unseen deployment, which happens and is worth discussing (usually
    the unseen scenario was simply easier, e.g. fewer users competing).

    Both arguments must be the *same* metric measured two ways -- total
    throughput against total throughput, fairness against fairness.  Comparing
    a throughput to a fairness produces a number with no meaning, and this
    function cannot detect that for you.

    Parameters
    ----------
    familiar_performance:
        The metric on the training/familiar distribution.
    unseen_performance:
        The same metric on the held-out deployment.

    Returns
    -------
    float
        ``familiar - unseen``.  ``0.0`` means the policy transferred perfectly.

    Examples
    --------
    >>> generalization_gap(10.0, 7.5)
    2.5
    >>> generalization_gap(10.0, 10.0)
    0.0
    >>> generalization_gap(7.5, 10.0)   # unseen scenario was easier
    -2.5
    """
    familiar = float(familiar_performance)
    unseen = float(unseen_performance)
    for name, value in (("familiar_performance", familiar), ("unseen_performance", unseen)):
        if not math.isfinite(value):
            raise ValueError(
                f"{name} must be a finite number, got {value}. Evaluate the "
                "policy first and pass the resulting scalar metric."
            )
    return familiar - unseen


def relative_generalization_gap(
    familiar_performance: Number,
    unseen_performance: Number,
) -> float:
    """Generalization gap as a fraction of familiar performance.

    Implements ``(familiar - unseen) / familiar``.

    Reported alongside :func:`generalization_gap` because an absolute drop of
    2.0 means something very different when the familiar score was 3.0 than
    when it was 40.0.  ``0.25`` reads as "we lost a quarter of our
    performance".

    Raises
    ------
    ValueError
        If ``familiar_performance`` is zero (the relative drop is undefined --
        report the absolute gap instead) or either input is non-finite.

    Examples
    --------
    >>> relative_generalization_gap(10.0, 7.5)
    0.25
    """
    familiar = float(familiar_performance)
    gap = generalization_gap(familiar_performance, unseen_performance)
    if familiar == 0.0:
        raise ValueError(
            "familiar_performance is 0, so a *relative* generalization gap is "
            "undefined (division by zero). Report the absolute gap from "
            "generalization_gap() instead, and say in your write-up that the "
            "familiar baseline was zero."
        )
    return gap / familiar


def robustness(
    scenario_results: Union[Mapping[str, Number], Sequence[Number]],
    reference: Union[Number, None] = None,
) -> float:
    """Worst-case performance across a set of scenario results.

    **Definition (an explicit choice -- there is no single standard).**  This
    package defines

    .. math::

        \\mathrm{robustness} = \\min_{s \\in S} \\; m(s)

    the *minimum* of one metric ``m`` over an evaluation suite ``S`` of
    deployment scenarios.  When a ``reference`` is supplied it is instead the
    normalized worst case

    .. math::

        \\mathrm{robustness} = \\frac{\\min_{s \\in S} m(s)}{m_{\\text{ref}}}

    typically with ``m_ref`` the familiar-topology score, so that ``1.0`` means
    "no scenario in the suite hurt us at all" and ``0.4`` means "in our worst
    deployment we kept 40% of familiar performance".

    Why min, and why say so loudly: "robustness" is used in the literature for
    a whole family of different things -- worst-case (min-max) performance,
    average performance under perturbation, the variance or spread of
    performance, tail measures such as CVaR, and the size of the perturbation a
    system tolerates before failing.  Those disagree, sometimes badly: a policy
    with a great *average* across scenarios can still be the one that falls
    over completely in the one deployment you care about.  This package picks
    the worst case because the teaching question is a deployment question --
    *"which system would you deploy?"* -- and a deployed network is judged by
    its bad days.  If you report a robustness number from this package, report
    the definition with it, and report the per-scenario values too: a single
    min hides which scenario broke you.

    Parameters
    ----------
    scenario_results:
        Either a mapping ``{scenario_name: metric_value}`` (preferred -- it
        keeps the scenario labels attached) or a plain sequence of metric
        values.  All entries must be the *same* metric.
    reference:
        Optional reference value to normalize by, usually the familiar-topology
        score.  Must be non-zero.

    Returns
    -------
    float
        The worst-case value, or the worst-case ratio when ``reference`` is
        given.

    Raises
    ------
    ValueError
        If ``scenario_results`` is empty, contains a non-finite value, or
        ``reference`` is zero.

    Examples
    --------
    >>> robustness({"familiar": 10.0, "surge": 6.0, "failure": 4.0})
    4.0
    >>> robustness({"familiar": 10.0, "surge": 6.0, "failure": 4.0}, reference=10.0)
    0.4
    """
    if isinstance(scenario_results, Mapping):
        values = list(scenario_results.values())
        labels = list(scenario_results.keys())
    else:
        values = list(scenario_results)
        labels = [str(index) for index in range(len(values))]

    if not values:
        raise ValueError(
            "scenario_results is empty, so there is no worst case to report. "
            "Evaluate the policy on at least one scenario -- the package's "
            "seven-scenario evaluation suite is scenarios.EVALUATION_SUITE."
        )

    numeric: list[float] = []
    for label, value in zip(labels, values):
        as_float = float(value)
        if not math.isfinite(as_float):
            raise ValueError(
                f"scenario_results[{label!r}] is {as_float}, which is not a "
                "finite number. Every scenario must contribute a real measured "
                "metric value; a crashed or skipped evaluation must be fixed, "
                "not passed through as NaN."
            )
        numeric.append(as_float)

    worst = min(numeric)
    if reference is None:
        return worst

    ref = float(reference)
    if not math.isfinite(ref):
        raise ValueError(f"reference must be a finite number, got {ref}.")
    if ref == 0.0:
        raise ValueError(
            "reference is 0, so the normalized robustness ratio is undefined "
            "(division by zero). Either pass a non-zero reference (usually the "
            "familiar-topology score) or omit it to get the raw worst case."
        )
    return worst / ref
