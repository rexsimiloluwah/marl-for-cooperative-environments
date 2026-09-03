"""PartnerCoordinationEnv and the scripted partners."""

import numpy as np
import pytest

from cooperative_marl_labs.envs.partner_coordination import (
    COOK,
    EGO,
    FETCH,
    PartnerCoordinationEnv,
)
from cooperative_marl_labs.policies import (
    BalancedPartner,
    CookFirstPartner,
    FetchFirstPartner,
    HeldOutPartner,
    ReactivePartner,
    all_partners,
)


def test_reset_and_step_shapes():
    env = PartnerCoordinationEnv(n_steps=5)
    env.set_partner(FetchFirstPartner(0))
    obs, infos = env.reset(seed=0)
    assert set(obs) == {EGO}
    assert env.observation_space(EGO).contains(obs[EGO])
    result = env.step({EGO: COOK})
    assert len(result) == 5


def test_complementary_roles_are_rewarded():
    env = PartnerCoordinationEnv(n_steps=1)
    env.set_partner(FetchFirstPartner(0))
    env.reset(seed=0)
    _, rewards, _, _, info = env.step({EGO: COOK})
    assert rewards[EGO] == 1.0
    assert info[EGO]["partner_action"] == FETCH


def test_duplicated_roles_earn_nothing():
    env = PartnerCoordinationEnv(n_steps=1)
    env.set_partner(FetchFirstPartner(0))
    env.reset(seed=0)
    _, rewards, _, _, _ = env.step({EGO: FETCH})
    assert rewards[EGO] == 0.0


def test_episode_ends_after_n_steps():
    env = PartnerCoordinationEnv(n_steps=4)
    env.set_partner(BalancedPartner(0))
    env.reset(seed=0)
    for _ in range(4):
        _, _, terms, _, _ = env.step({EGO: COOK})
    assert terms[EGO] is True
    assert env.agents == []


def test_partner_switch_changes_behaviour():
    env = PartnerCoordinationEnv(n_steps=20)
    env.set_partner(FetchFirstPartner(0))
    env.set_partner_switch(10, CookFirstPartner(0))
    env.reset(seed=0)
    first, second = [], []
    for t in range(20):
        _, _, _, _, info = env.step({EGO: COOK})
        (first if t < 10 else second).append(info[EGO]["partner_action"])
    assert np.mean([a == FETCH for a in first]) > 0.7
    assert np.mean([a == FETCH for a in second]) < 0.3


@pytest.mark.parametrize(
    "cls,expected",
    [(FetchFirstPartner, 0.95), (CookFirstPartner, 0.05),
     (BalancedPartner, 0.50), (HeldOutPartner, 0.25)],
)
def test_partner_fetch_rates(cls, expected):
    p = cls(0)
    acts = [p.act(None, None) for _ in range(4000)]
    assert abs(np.mean([a == FETCH for a in acts]) - expected) < 0.04


def test_reactive_partner_complements_the_ego():
    p = ReactivePartner(0)
    assert p.act(FETCH, None) == COOK
    assert p.act(COOK, None) == FETCH


def test_partner_observes_the_ego_not_itself():
    """A reactive partner can only complement if it sees the ego's action."""
    env = PartnerCoordinationEnv(n_steps=6)
    env.set_partner(ReactivePartner(0))
    env.reset(seed=0)
    total = 0.0
    for _ in range(6):
        _, rewards, _, _, _ = env.step({EGO: COOK})
        total += rewards[EGO]
    # after the first step it should complement every time
    assert total >= 5.0


def test_all_partners_have_names():
    for name, p in all_partners(0).items():
        assert getattr(p, "name", None) == name


def test_step_before_reset_raises():
    env = PartnerCoordinationEnv()
    env.set_partner(FetchFirstPartner(0))
    with pytest.raises(RuntimeError):
        env.step({EGO: COOK})


def test_pettingzoo_parallel_api():
    from pettingzoo.test import parallel_api_test

    env = PartnerCoordinationEnv()
    env.set_partner(BalancedPartner(seed=0))
    parallel_api_test(env, num_cycles=20)
