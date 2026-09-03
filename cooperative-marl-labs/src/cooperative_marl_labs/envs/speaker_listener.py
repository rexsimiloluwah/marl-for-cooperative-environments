"""
SPEAKER-LISTENER REFERENTIAL GAME

The smallest environment in which communication can matter at all.

- A target is drawn from `n_targets`.
- The speaker observes the target. It cannot act on the world.
- The listener must name the target. It cannot observe the target.
- Both receive +1 if the listener is right.

An episode is TWO steps, which is what makes it a legitimate ParallelEnv rather
than a circular definition: on step 0 the speaker emits a symbol, and on step 1
the listener sees that symbol and guesses. A single simultaneous step would
require the listener to condition on a message that had not been sent yet.
"""

from __future__ import annotations

import numpy as np
from gymnasium import spaces
from pettingzoo import ParallelEnv

SPEAKER = "speaker"
LISTENER = "listener"


class SpeakerListenerEnv(ParallelEnv):
    """Two agents, one hidden target, one symbol of bandwidth."""

    metadata = {"name": "speaker_listener_v0", "is_parallelizable": True}

    def __init__(
        self,
        n_targets: int = 3,
        message_vocab_size: int = 3,
        message_error: float = 0.0,
    ) -> None:
        super().__init__()
        self.n_targets = int(n_targets)
        self.message_vocab_size = int(message_vocab_size)
        self.message_error = float(message_error)

        self.possible_agents = [SPEAKER, LISTENER]
        self.agents: list[str] = []

        self._rng = np.random.default_rng()
        self.target: int | None = None
        self.message: int | None = None
        self.received: int | None = None
        self._t = 0
        self._build_spaces()

    # ---- configuration, so notebooks never mutate internals ----

    def set_message_vocab_size(self, k: int) -> None:
        """Changes channel capacity. Takes effect on the next reset."""
        if k < 1:
            raise ValueError("message_vocab_size must be at least 1")
        self.message_vocab_size = int(k)
        self._build_spaces()  # the listener's observation gets longer

    def set_message_error(self, p: float) -> None:
        """Probability that the received symbol is replaced by a random one."""
        if not 0.0 <= p <= 1.0:
            raise ValueError("message_error must be in [0, 1]")
        self.message_error = float(p)

    # ---- spaces ----

    def _build_spaces(self) -> None:
        """
        Build the spaces once. The PettingZoo API test requires identity, so
        they cannot be constructed per call.
        """
        self._observation_spaces = {
            # one-hot target
            SPEAKER: spaces.Box(0.0, 1.0, shape=(self.n_targets,), dtype=np.float32),
            # one-hot received message, plus one slot for "nothing yet"
            LISTENER: spaces.Box(
                0.0, 1.0, shape=(self.message_vocab_size + 1,), dtype=np.float32
            ),
        }
        self._action_spaces = {
            SPEAKER: spaces.Discrete(self.message_vocab_size),
            LISTENER: spaces.Discrete(self.n_targets),
        }

    def observation_space(self, agent: str) -> spaces.Space:
        return self._observation_spaces[agent]

    def action_space(self, agent: str) -> spaces.Space:
        return self._action_spaces[agent]

    # ---- helpers ----

    def _speaker_obs(self) -> np.ndarray:
        v = np.zeros(self.n_targets, dtype=np.float32)
        if self.target is not None:
            v[self.target] = 1.0
        return v

    def _listener_obs(self) -> np.ndarray:
        v = np.zeros(self.message_vocab_size + 1, dtype=np.float32)
        if self.received is None:
            v[-1] = 1.0  # nothing has arrived yet
        else:
            v[self.received] = 1.0
        return v

    def _observations(self) -> dict[str, np.ndarray]:
        return {SPEAKER: self._speaker_obs(), LISTENER: self._listener_obs()}

    # ---- ParallelEnv API ----

    def reset(self, seed: int | None = None, options: dict | None = None):
        if seed is not None:
            self._rng = np.random.default_rng(seed)
        self.agents = list(self.possible_agents)
        self.target = int(self._rng.integers(self.n_targets))
        self.message = None
        self.received = None
        self._t = 0
        infos = {a: {} for a in self.agents}
        return self._observations(), infos

    def step(self, actions: dict[str, int]):
        if not self.agents:
            raise RuntimeError("call reset() before step()")

        reward = 0.0
        if self._t == 0:
            # the speaker's symbol is sent, and may be corrupted in transit
            self.message = int(actions[SPEAKER]) % self.message_vocab_size
            if self._rng.random() < self.message_error:
                self.received = int(self._rng.integers(self.message_vocab_size))
            else:
                self.received = self.message
        else:
            guess = int(actions[LISTENER]) % self.n_targets
            reward = 1.0 if guess == self.target else 0.0

        self._t += 1
        done = self._t >= 2
        rewards = {a: reward for a in self.agents}
        terminations = {a: done for a in self.agents}
        truncations = {a: False for a in self.agents}
        record = {
            "target": self.target,
            "message": self.message,
            "received": self.received,
        }
        infos = {a: dict(record) for a in self.agents}
        obs = self._observations()
        if done:
            self.agents = []
        return obs, rewards, terminations, truncations, infos

    def render(self) -> str:
        line = (
            f"target={self.target}  "
            f"sent={self.message}  "
            f"received={self.received}"
        )
        print(line)
        return line
