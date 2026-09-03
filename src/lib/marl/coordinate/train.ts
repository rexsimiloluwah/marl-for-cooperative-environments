/**
 * Shared training loop for both methods. Only the update rule differs, which
 * is the point the lab is making, so the loop lives in one place.
 */
import { MAX_STEPS, SwitchGrid, recordEpisode } from './environment';
import { iqlUpdate } from './iql';
import { vdnUpdate } from './vdn';
import { Rolling, argmax, mulberry32 } from './metrics';
import type { Action, Method, Progress, TrainConfig, TrainResult } from './types';

const N_ACTIONS = 5;

const emptyTable = (): number[][] =>
  Array.from({ length: SwitchGrid.OBS_COUNT }, () => new Array(N_ACTIONS).fill(0));

/** Greedy joint policy from a trained pair of tables. */
export function greedyPolicy(Q: [number[][], number[][]]) {
  return (obs: [number, number]): [Action, Action] => [
    argmax(Q[0][obs[0]]) as Action,
    argmax(Q[1][obs[1]]) as Action,
  ];
}

/** Measures the greedy policy, so the reported numbers carry no exploration. */
export function evaluate(
  Q: [number[][], number[][]],
  episodes = 200,
  alonePenalty = 0,
): { successRate: number; meanSteps: number; meanReturn: number } {
  const policy = greedyPolicy(Q);
  let solved = 0;
  let steps = 0;
  let ret = 0;
  for (let e = 0; e < episodes; e += 1) {
    const env = new SwitchGrid(alonePenalty);
    env.reset();
    let epReturn = 0;
    let t = 0;
    for (; t < MAX_STEPS; t += 1) {
      const obs: [number, number] = [env.observation(0), env.observation(1)];
      const res = env.step(policy(obs));
      epReturn += res.reward;
      if (res.done) {
        if (res.solved) solved += 1;
        break;
      }
    }
    steps += Math.min(t + 1, MAX_STEPS);
    ret += epReturn;
  }
  return {
    successRate: solved / episodes,
    meanSteps: steps / episodes,
    meanReturn: ret / episodes,
  };
}

/**
 * Incremental trainer.
 *
 * The UI needs to yield between batches so the page stays responsive and the
 * curve fills in. An earlier version re-ran training from scratch for each
 * batch, which was quadratic in the episode count and threw away the tables it
 * had just built. This keeps the tables and simply runs more episodes.
 */
export class Trainer {
  readonly Q: [number[][], number[][]] = [emptyTable(), emptyTable()];
  readonly curve: Progress[] = [];
  private readonly rand: () => number;
  private readonly success = new Rolling(200);
  private readonly stepsWin = new Rolling(200);
  private readonly returnWin = new Rolling(200);
  private readonly update: typeof iqlUpdate;
  private readonly decayOver: number;
  episode = 0;

  constructor(
    readonly method: Method,
    readonly cfg: TrainConfig,
    readonly reportEvery = 100,
  ) {
    this.update = method === 'iql' ? iqlUpdate : vdnUpdate;
    this.rand = mulberry32(cfg.seed);
    this.decayOver = Math.max(1, Math.floor(cfg.episodes * 0.6));
  }

  get done(): boolean {
    return this.episode >= this.cfg.episodes;
  }

  /** Runs up to `batch` more episodes. Returns true while work remains. */
  run(batch: number): boolean {
    const alonePenalty = this.cfg.alonePenalty ?? 0;
    const limit = Math.min(this.episode + batch, this.cfg.episodes);

    for (; this.episode < limit; this.episode += 1) {
      const eps = Math.max(
        this.cfg.epsilonMin,
        this.cfg.epsilonStart -
          (this.cfg.epsilonStart - this.cfg.epsilonMin) * (this.episode / this.decayOver),
      );
      const env = new SwitchGrid(alonePenalty);
      env.reset();
      let epReturn = 0;
      let t = 0;
      let solved = false;

      for (; t < MAX_STEPS; t += 1) {
        const obs: [number, number] = [env.observation(0), env.observation(1)];
        const actions: [Action, Action] = [0, 0];
        for (let i = 0; i < 2; i += 1) {
          actions[i] = (
            this.rand() < eps
              ? Math.floor(this.rand() * N_ACTIONS)
              : argmax(this.Q[i][obs[i]])
          ) as Action;
        }
        const res = env.step(actions);
        const nextObs: [number, number] = [env.observation(0), env.observation(1)];
        this.update(
          this.Q, obs, actions, res.reward, nextObs, res.done,
          this.cfg.alpha, this.cfg.gamma,
        );
        epReturn += res.reward;
        if (res.done) {
          solved = res.solved;
          break;
        }
      }

      this.success.push(solved ? 1 : 0);
      this.stepsWin.push(Math.min(t + 1, MAX_STEPS));
      this.returnWin.push(epReturn);

      if ((this.episode + 1) % this.reportEvery === 0) {
        this.curve.push({
          episode: this.episode + 1,
          successRate: this.success.mean,
          meanSteps: this.stepsWin.mean,
          meanReturn: this.returnWin.mean,
        });
      }
    }
    return !this.done;
  }

  result(): TrainResult {
    const alonePenalty = this.cfg.alonePenalty ?? 0;
    return {
      curve: this.curve,
      final: evaluate(this.Q, 200, alonePenalty),
      replay: recordEpisode(greedyPolicy(this.Q), alonePenalty),
    };
  }
}

/** One-shot training, for scripts and tests. */
export function train(
  method: Method,
  cfg: TrainConfig,
  onProgress?: (p: Progress) => void,
  reportEvery = 100,
): TrainResult {
  const t = new Trainer(method, cfg, reportEvery);
  let seen = 0;
  while (t.run(500)) {
    for (; seen < t.curve.length; seen += 1) onProgress?.(t.curve[seen]);
  }
  for (; seen < t.curve.length; seen += 1) onProgress?.(t.curve[seen]);
  return t.result();
}
