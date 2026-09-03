"""SpeakerListenerEnv: API conformance, seeding, and the identity protocol."""

import pytest

from cooperative_marl_labs.envs.speaker_listener import (
    LISTENER,
    SPEAKER,
    SpeakerListenerEnv,
)


def test_reset_returns_obs_and_infos():
    env = SpeakerListenerEnv()
    obs, infos = env.reset(seed=0)
    assert set(obs) == {SPEAKER, LISTENER}
    assert set(infos) == {SPEAKER, LISTENER}
    assert env.agents == [SPEAKER, LISTENER]


def test_step_returns_five_dicts():
    env = SpeakerListenerEnv()
    obs, _ = env.reset(seed=0)
    result = env.step({SPEAKER: 0, LISTENER: 0})
    assert len(result) == 5
    for d in result:
        assert isinstance(d, dict)


def test_observations_match_declared_spaces():
    for vocab in (1, 2, 3, 5):
        env = SpeakerListenerEnv(n_targets=3, message_vocab_size=vocab)
        obs, _ = env.reset(seed=1)
        for agent in env.possible_agents:
            assert env.observation_space(agent).contains(obs[agent]), agent


def test_speaker_sees_target_and_listener_does_not():
    env = SpeakerListenerEnv()
    obs, _ = env.reset(seed=3)
    assert obs[SPEAKER].sum() == pytest.approx(1.0)
    assert int(obs[SPEAKER].argmax()) == env.target
    # before anything is sent the listener's slot says "nothing yet"
    assert obs[LISTENER][-1] == pytest.approx(1.0)


def test_identity_protocol_always_succeeds():
    env = SpeakerListenerEnv(n_targets=3, message_vocab_size=3)
    for ep in range(50):
        obs, _ = env.reset(seed=ep)
        target = int(obs[SPEAKER].argmax())
        _, _, _, _, info = env.step({SPEAKER: target, LISTENER: 0})
        received = info[LISTENER]["received"]
        _, rewards, terms, _, _ = env.step({SPEAKER: 0, LISTENER: received})
        assert rewards[LISTENER] == 1.0
        assert all(terms.values())


def test_one_symbol_channel_cannot_beat_chance():
    """With a single symbol the listener has no information to act on."""
    env = SpeakerListenerEnv(n_targets=3, message_vocab_size=1)
    wins = 0
    trials = 300
    for ep in range(trials):
        obs, _ = env.reset(seed=ep)
        _, _, _, _, info = env.step({SPEAKER: 0, LISTENER: 0})
        # a fixed guess is the best a listener can do here
        _, rewards, _, _, _ = env.step({SPEAKER: 0, LISTENER: 0})
        wins += rewards[LISTENER]
    assert 0.2 < wins / trials < 0.47


def test_message_error_corrupts_some_messages():
    env = SpeakerListenerEnv(message_vocab_size=3)
    env.set_message_error(1.0)
    changed = 0
    for ep in range(200):
        obs, _ = env.reset(seed=ep)
        _, _, _, _, info = env.step({SPEAKER: 0, LISTENER: 0})
        if info[LISTENER]["received"] != 0:
            changed += 1
    assert changed > 100  # with p=1 the symbol is redrawn every time


def test_seeding_is_reproducible():
    a = SpeakerListenerEnv()
    b = SpeakerListenerEnv()
    ta = [a.reset(seed=s)[0][SPEAKER].argmax() for s in range(20)]
    tb = [b.reset(seed=s)[0][SPEAKER].argmax() for s in range(20)]
    assert ta == tb


def test_step_before_reset_raises():
    env = SpeakerListenerEnv()
    with pytest.raises(RuntimeError):
        env.step({SPEAKER: 0, LISTENER: 0})


def test_pettingzoo_parallel_api():
    from pettingzoo.test import parallel_api_test

    parallel_api_test(SpeakerListenerEnv(), num_cycles=20)
