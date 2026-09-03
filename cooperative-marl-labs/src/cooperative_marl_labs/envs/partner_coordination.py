"""
PARTNER COORDINATION

Two roles, one order. Complementary choices serve it; both taking the same role
wastes the step:

    reward = 1 if ego action != partner action else 0

Actions are FETCH = 0 and COOK = 1.

Only the EGO is a learning agent. The partner is a scripted policy supplied
through `set_partner`, which is what makes this an ad hoc teamwork setting: the
learner does not control, train, or inspect the other side.

The ego observes the partner's previous action. That is the one small context
variable the task needs to be non-trivial, and it is deliberately not enough on
its own: the partners differ in how OFTEN they take each role, so a single
observation cannot identify one. Telling them apart needs a history.
"""

from __future__ import annotations

from typing import Any, Protocol

import numpy as np
from gymnasium import spaces
from pettingzoo import ParallelEnv

FETCH = 0
COOK = 1
ROLE_NAMES = ("FETCH", "COOK")
EGO = "ego"


class PartnerPolicy(Protocol):
    """Anything that can take a role given what it has seen."""

    name: str

    def act(self, observation: Any = None, history: Any = None) -> int: ...

    def reset(self) -> None: ...


class PartnerCoordinationEnv(ParallelEnv):
    """One learning agent, one scripted partner, `n_steps` per episode."""

    metadata = {"name": "partner_coordination_v0", "is_parallelizable": True}

    def __init__(self, n_steps: int = 40, partner: PartnerPolicy | None = None) -> None:
        super().__init__()
        self.n_steps = int(n_steps)
        self.possible_agents = [EGO]
        self.agents: list[str] = []

        self._partner = partner
        self._switch_at: int | None = None
        self._switch_to: PartnerPolicy | None = None

        self._rng = np.random.default_rng()
        self._t = 0
        self.partner_last: int | None = None
        self.partner_history: list[int] = []
        # what the PARTNER gets to see: the ego's behaviour. A reactive partner
        # needs this, and passing it its own last action would be useless.
        self.ego_last: int | None = None
        self.ego_history: list[int] = []
        # built once: the PettingZoo API test requires object identity
        self._observation_spaces = {
            # one-hot of the partner's last role, plus a slot for "nothing yet"
            EGO: spaces.Box(0.0, 1.0, shape=(3,), dtype=np.float32)
        }
        self._action_spaces = {EGO: spaces.Discrete(2)}

    # ---- configuration ----

    def set_partner(self, partner: PartnerPolicy) -> None:
        """Sets the partner used from the next reset."""
        self._partner = partner
        self._switch_at = None
        self._switch_to = None

    def set_partner_switch(self, step: int, partner: PartnerPolicy) -> None:
        """Replaces the partner part-way through each episode, without warning."""
        self._switch_at = int(step)
        self._switch_to = partner

    @property
    def partner(self) -> PartnerPolicy | None:
        return self._partner

    # ---- spaces ----

    def observation_space(self, agent: str) -> spaces.Space:
        """A one-hot of the partner's last role, plus a slot for "nothing yet"."""
        return self._observation_spaces[agent]

    def action_space(self, agent: str) -> spaces.Space:
        """Two actions: FETCH and COOK."""
        return self._action_spaces[agent]

    # ---- helpers ----

    def _obs(self) -> dict[str, np.ndarray]:
        v = np.zeros(3, dtype=np.float32)
        v[2 if self.partner_last is None else self.partner_last] = 1.0
        return {EGO: v}

    def _active_partner(self) -> PartnerPolicy:
        if self._partner is None:
            raise RuntimeError("call set_partner() before reset()")
        if self._switch_at is not None and self._t >= self._switch_at:
            assert self._switch_to is not None
            return self._switch_to
        return self._partner

    # ---- ParallelEnv API ----

    def reset(self, seed: int | None = None, options: dict | None = None):
        """Start a new episode and reset the partner. Returns ``(observations,
        infos)``. Call ``set_partner`` first."""
        if seed is not None:
            self._rng = np.random.default_rng(seed)
        self.agents = list(self.possible_agents)
        self._t = 0
        self.partner_last = None
        self.partner_history = []
        self.ego_last = None
        self.ego_history = []
        for p in (self._partner, self._switch_to):
            if p is not None and hasattr(p, "reset"):
                p.reset()
        return self._obs(), {EGO: {}}

    def step(self, actions: dict[str, int]):
        """Take the ego's action, ask the partner for its own, and reward the
        pair 1 when the two roles differ. Returns the five dictionaries."""
        if not self.agents:
            raise RuntimeError("call reset() before step()")

        ego_action = int(actions[EGO]) % 2
        partner = self._active_partner()
        # the partner observes the ego, which is the only thing it could see
        partner_action = int(partner.act(self.ego_last, self.ego_history)) % 2

        reward = 1.0 if ego_action != partner_action else 0.0

        self.partner_last = partner_action
        self.partner_history.append(partner_action)
        self.ego_last = ego_action
        self.ego_history.append(ego_action)
        self._t += 1
        done = self._t >= self.n_steps

        info = {
            "partner_action": partner_action,
            "partner_name": getattr(partner, "name", "partner"),
            "t": self._t,
        }
        rewards = {EGO: reward}
        terminations = {EGO: done}
        truncations = {EGO: False}
        infos = {EGO: info}
        obs = self._obs()
        if done:
            self.agents = []
        return obs, rewards, terminations, truncations, infos

    def render(self) -> str:
        """Print and return one line naming the role the partner last took."""
        last = "none" if self.partner_last is None else ROLE_NAMES[self.partner_last]
        line = f"t={self._t}  partner last took {last}"
        print(line)
        return line
