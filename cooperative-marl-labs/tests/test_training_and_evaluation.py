"""
The helpers that keep the notebooks short.

These are the functions a learner calls without reading, so their contracts
need holding down: the metric keys they return, that learning beats chance, and
that a fixed seed gives the same answer twice.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from cooperative_marl_labs.agents import (
    GreedyWirelessAgent,
    RandomWirelessAgent,
)
from cooperative_marl_labs.envs import (
    PartnerCoordinationEnv,
    WirelessResourceAllocationEnv,
)
from cooperative_marl_labs.envs.partner_coordination import COOK, FETCH
from cooperative_marl_labs.evaluation import (
    WIRELESS_METRICS,
    crossplay_matrix,
    evaluate_agents,
    evaluate_partner_policy,
)
from cooperative_marl_labs.policies import (
    CookFirstPartner,
    FetchFirstPartner,
    all_partners,
)
from cooperative_marl_labs.training import (
    combine_values,
    make_fixed_agents,
    train_independent_q_learning,
    train_vdn,
)

# ------------------------------------------------------------- evaluate_agents


def test_evaluate_agents_returns_the_documented_metrics():
    env = WirelessResourceAllocationEnv()
    agents = make_fixed_agents(env, RandomWirelessAgent, seed=0)
    result = evaluate_agents(env, agents, episodes=6, seed=1)
    for key in (*WIRELESS_METRICS, "avoidable_interference"):
        assert key in result
        assert isinstance(result[key], float)


def test_evaluate_agents_converts_to_pandas():
    env = WirelessResourceAllocationEnv()
    agents = make_fixed_agents(env, RandomWirelessAgent, seed=0)
    result = evaluate_agents(env, agents, episodes=4, seed=1)
    row = pd.DataFrame([result])
    assert row.shape[0] == 1
    assert "team_reward" in row.columns


def test_evaluate_agents_is_deterministic():
    env = WirelessResourceAllocationEnv()
    a = evaluate_agents(
        env, make_fixed_agents(env, RandomWirelessAgent, seed=0), episodes=5, seed=3
    )
    b = evaluate_agents(
        env, make_fixed_agents(env, RandomWirelessAgent, seed=0), episodes=5, seed=3
    )
    assert a == b


def test_identically_seeded_agents_would_collide():
    """
    Why make_fixed_agents offsets the seed per agent.

    Sharing one seed makes every access point draw the same channel every step,
    which scores like the worst policy rather than like chance.
    """
    env = WirelessResourceAllocationEnv()
    offset = make_fixed_agents(env, RandomWirelessAgent, seed=0)
    shared = {
        a: RandomWirelessAgent(a, env.n_channels, env.n_agents, seed=0)
        for a in env.possible_agents
    }
    good = evaluate_agents(env, offset, episodes=8, seed=2)
    bad = evaluate_agents(env, shared, episodes=8, seed=2)
    assert bad["team_reward"] < good["team_reward"]


def test_replace_swaps_in_an_unfamiliar_access_point():
    env = WirelessResourceAllocationEnv()
    agents = make_fixed_agents(env, GreedyWirelessAgent, seed=0)
    baseline = evaluate_agents(env, agents, episodes=5, seed=1)
    swapped = evaluate_agents(
        env,
        agents,
        episodes=5,
        seed=1,
        replace={
            "ap_0": RandomWirelessAgent("ap_0", env.n_channels, env.n_agents, seed=9)
        },
    )
    assert baseline != swapped


# ------------------------------------------------------------------- training


def test_combine_values_is_a_sum():
    assert combine_values([1.0, 2.0, 3.5]) == pytest.approx(6.5)


@pytest.mark.parametrize("train", [train_independent_q_learning, train_vdn])
def test_learning_beats_random(train):
    env = WirelessResourceAllocationEnv()
    agents, history = train(env, episodes=400, seed=0)
    assert len(history) == 400
    learned = evaluate_agents(env, agents, episodes=25, seed=7)
    chance = evaluate_agents(
        env, make_fixed_agents(env, RandomWirelessAgent, seed=0), episodes=25, seed=7
    )
    assert learned["team_reward"] > chance["team_reward"]


@pytest.mark.parametrize("train", [train_independent_q_learning, train_vdn])
def test_training_is_reproducible(train):
    env_a = WirelessResourceAllocationEnv()
    env_b = WirelessResourceAllocationEnv()
    _, history_a = train(env_a, episodes=120, seed=4)
    _, history_b = train(env_b, episodes=120, seed=4)
    assert np.allclose(history_a, history_b)


def test_learning_stays_under_the_ceiling():
    env = WirelessResourceAllocationEnv()
    agents, _ = train_vdn(env, episodes=400, seed=0)
    result = evaluate_agents(env, agents, episodes=25, seed=7)
    ceilings = []
    for episode in range(25):
        env.reset(seed=7 + episode)
        ceilings.append(env.best_possible())
    assert result["team_reward"] <= max(ceilings) + 1e-9


# ---------------------------------------------------------------- partner side


def test_evaluate_partner_policy_scores_a_complementary_ego():
    env = PartnerCoordinationEnv(n_steps=20)
    always_cook = evaluate_partner_policy(
        env, lambda obs, hist: COOK, FetchFirstPartner(seed=0), episodes=40, seed=0
    )
    always_fetch = evaluate_partner_policy(
        env, lambda obs, hist: FETCH, FetchFirstPartner(seed=0), episodes=40, seed=0
    )
    assert always_cook > 0.9
    assert always_fetch < 0.1


def test_evaluate_partner_policy_honours_a_mid_episode_switch():
    env = PartnerCoordinationEnv(n_steps=20)
    steady = evaluate_partner_policy(
        env, lambda obs, hist: COOK, FetchFirstPartner(seed=0), episodes=40, seed=0
    )
    switched = evaluate_partner_policy(
        env,
        lambda obs, hist: COOK,
        FetchFirstPartner(seed=0),
        episodes=40,
        seed=0,
        switch=(10, CookFirstPartner(seed=1)),
    )
    assert switched < steady


def test_crossplay_matrix_is_a_labelled_dataframe():
    env = PartnerCoordinationEnv(n_steps=10)
    egos = {"always cook": COOK, "always fetch": FETCH}
    partners = all_partners(seed=0)

    def score(ego_action, partner):
        return evaluate_partner_policy(
            env, lambda obs, hist: ego_action, partner, episodes=10, seed=0
        )

    df = crossplay_matrix(egos, partners, score)
    assert isinstance(df, pd.DataFrame)
    assert df.shape == (len(egos), len(partners))
    assert df.index.name == "ego trained with"
    assert df.columns.name == "evaluated against"
    assert df.to_numpy().min() >= 0.0
    assert df.to_numpy().max() <= 1.0
