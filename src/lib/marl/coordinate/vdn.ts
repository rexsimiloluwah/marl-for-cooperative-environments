/**
 * VALUE DECOMPOSITION
 *
 * The team value is the sum of the individual values, so there is ONE error
 * computed on that sum and applied to both agents.
 *
 * The difference from independent learning is small in code and large in
 * meaning: an agent is no longer told it earned the whole team reward, only
 * its share of the surprise. Action selection is untouched, so execution stays
 * exactly as decentralized as before.
 */
import { maxOf } from './metrics';
import type { Update } from './iql';
import type { Action } from './types';

export const vdnUpdate: Update = (Q, obs, actions, reward, nextObs, done, alpha, gamma) => {
  const qTotal = Q[0][obs[0]][actions[0]] + Q[1][obs[1]][actions[1]];
  const nextTotal = done ? 0 : maxOf(Q[0][nextObs[0]]) + maxOf(Q[1][nextObs[1]]);
  const delta = reward + gamma * nextTotal - qTotal;
  for (let i = 0; i < 2; i += 1) {
    Q[i][obs[i]][actions[i]] += alpha * delta;
  }
};
