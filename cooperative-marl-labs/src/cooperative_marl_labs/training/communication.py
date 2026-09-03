"""
REINFORCE for the speaker-listener pair.

Both agents are updated from the same reward, which is why neither can improve
without the other. A mean baseline keeps the variance manageable; anything more
elaborate would obscure the point.
"""

from __future__ import annotations

import numpy as np
import torch
import torch.optim as optim

from cooperative_marl_labs.agents.communication import Listener, Speaker, onehot


def train_communication_agents(
    n_targets: int = 3,
    n_messages: int = 3,
    message_error: float = 0.0,
    episodes: int = 4000,
    batch: int = 32,
    lr: float = 0.01,
    seed: int = 0,
    hidden: int = 32,
) -> tuple[Speaker, Listener, list[float]]:
    """
    Train a speaker and a listener from the shared task reward alone.

    Neither agent is told what a symbol should mean. Whatever convention comes
    out is theirs, which is the point of the experiment.

    Returns the trained pair and the per-batch success history.
    """
    torch.manual_seed(seed)
    rng = np.random.default_rng(seed)
    speaker = Speaker(n_targets, n_messages, hidden)
    listener = Listener(n_messages, n_targets, hidden)
    opt = optim.Adam(list(speaker.parameters()) + list(listener.parameters()), lr=lr)
    history: list[float] = []

    for _ in range(episodes):
        targets = rng.integers(n_targets, size=batch)
        target_vec = torch.stack([onehot(int(t), n_targets) for t in targets])

        message_dist = torch.distributions.Categorical(logits=speaker(target_vec))
        message = message_dist.sample()

        received = message.clone()
        if message_error > 0:
            corrupt = torch.rand(batch) < message_error
            n_bad = int(corrupt.sum())
            if n_bad:
                received[corrupt] = torch.randint(0, n_messages, (n_bad,))

        listener_input = torch.stack([onehot(int(m), n_messages) for m in received])
        action_dist = torch.distributions.Categorical(logits=listener(listener_input))
        action = action_dist.sample()

        reward = (action == torch.as_tensor(targets)).float()
        advantage = reward - reward.mean()
        loss = -(
            advantage
            * (message_dist.log_prob(message) + action_dist.log_prob(action))
        ).mean()
        opt.zero_grad()
        loss.backward()
        opt.step()
        history.append(float(reward.mean()))

    return speaker, listener, history


def protocol_matrix(speaker: Speaker, n_targets: int) -> np.ndarray:
    """P(message | target), one row per target."""
    with torch.no_grad():
        logits = speaker(torch.stack([onehot(t, n_targets) for t in range(n_targets)]))
        return torch.softmax(logits, dim=-1).numpy()


#: Previous name for :func:`train_communication_agents`.
train_speaker_listener = train_communication_agents
