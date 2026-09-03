"""
SCRIPTED PARTNERS

Each partner takes the FETCH role with its own probability, so no single
observation identifies one. Telling them apart needs a history, which is what
makes a partner model worth building.

Every policy takes ``(observation, history)`` where the observation is the
ego's last action and the history is everything the ego has done this episode.
A partner sees the ego's behaviour and nothing else.
"""

from __future__ import annotations

from typing import Any

import numpy as np

from cooperative_marl_labs.envs.partner_coordination import COOK, FETCH


class PartnerPolicy:
    """
    Base class for a scripted partner.

    Owns a seeded generator, so a partner's behaviour is reproducible and no
    partner touches global NumPy random state.
    """

    name = "partner"
    #: Probability of taking FETCH, where that is a fixed number.
    p_fetch: float | None = None

    def __init__(self, seed: int | None = None) -> None:
        self.rng = np.random.default_rng(seed)

    def act(self, observation: Any = None, history: Any = None) -> int:
        raise NotImplementedError

    def reset(self) -> None:
        """Called at every ``env.reset``. Stateless partners need nothing."""
        return None

    def __repr__(self) -> str:
        return f"{type(self).__name__}(name={self.name!r})"


class _FixedProbability(PartnerPolicy):
    """Takes FETCH with a fixed probability, ignoring the ego."""

    def act(self, observation: Any = None, history: Any = None) -> int:
        assert self.p_fetch is not None
        return FETCH if self.rng.random() < self.p_fetch else COOK


class FetchFirstPartner(_FixedProbability):
    """Almost always fetches. The ego should cook."""

    name = "fetch-first"
    p_fetch = 0.95


class CookFirstPartner(_FixedProbability):
    """Almost always cooks. The ego should fetch."""

    name = "cook-first"
    p_fetch = 0.05


class BalancedPartner(_FixedProbability):
    """Takes each role half the time, so nothing the ego does beats 0.5."""

    name = "balanced"
    p_fetch = 0.50


class HeldOutPartner(_FixedProbability):
    """Cook-leaning, and never used during training."""

    name = "held-out"
    p_fetch = 0.25


class ReactivePartner(PartnerPolicy):
    """
    Takes whichever role the ego did not take last step.

    Unlike the others this one is not stochastic, so an ego that settles into a
    fixed role is complemented perfectly. It is in the training population to
    stop a learner assuming every partner is a coin flip.
    """

    name = "reactive"

    def act(self, observation: Any = None, history: Any = None) -> int:
        if observation is None:
            return FETCH
        return COOK if int(observation) == FETCH else FETCH


#: Partners the ego is allowed to train against.
TRAINING_POPULATION = ("fetch-first", "cook-first", "balanced", "reactive")
#: Partners reserved for evaluation. Training against these invalidates the
#: generalization claim the Adapt lab makes.
HELD_OUT = ("held-out",)

_ALL = (
    FetchFirstPartner,
    CookFirstPartner,
    BalancedPartner,
    ReactivePartner,
    HeldOutPartner,
)


def all_partners(seed: int | None = 0) -> dict[str, PartnerPolicy]:
    """Every partner, keyed by name, each with its own offset seed."""
    return {
        cls.name: cls(None if seed is None else seed + i)
        for i, cls in enumerate(_ALL)
    }


def training_partners(seed: int | None = 0) -> dict[str, PartnerPolicy]:
    """Just the partners the ego may train against."""
    everyone = all_partners(seed)
    return {k: v for k, v in everyone.items() if k in TRAINING_POPULATION}


def held_out_partners(seed: int | None = 0) -> dict[str, PartnerPolicy]:
    """Just the evaluation-only partners."""
    everyone = all_partners(seed)
    return {k: v for k, v in everyone.items() if k in HELD_OUT}
