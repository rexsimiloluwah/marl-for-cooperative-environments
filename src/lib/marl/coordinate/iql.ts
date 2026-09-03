/**
 * INDEPENDENT Q-LEARNING
 *
 * Each agent keeps its own table and credits itself with the whole team
 * reward. It has no representation of the other agent at all: from its point
 * of view the partner is part of an environment that happens to be learning.
 */
import { maxOf } from './metrics';
import type { Action } from './types';

export interface Update {
  (
    Q: [number[][], number[][]],
    obs: [number, number],
    actions: [Action, Action],
    reward: number,
    nextObs: [number, number],
    done: boolean,
    alpha: number,
    gamma: number,
  ): void;
}

export const iqlUpdate: Update = (Q, obs, actions, reward, nextObs, done, alpha, gamma) => {
  for (let i = 0; i < 2; i += 1) {
    const q = Q[i][obs[i]];
    const bootstrap = done ? 0 : gamma * maxOf(Q[i][nextObs[i]]);
    q[actions[i]] += alpha * (reward + bootstrap - q[actions[i]]);
  }
};
