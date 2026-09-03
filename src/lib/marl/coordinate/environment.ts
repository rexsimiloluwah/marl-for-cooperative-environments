/**
 * TWO-AGENT SWITCH GRIDWORLD
 *
 * The smallest environment that makes the coordination point visible: two
 * agents, two switches, and a reward that arrives only when both switches are
 * held down on the SAME step.
 *
 * An agent standing on its switch alone earns nothing. That is the whole
 * design: neither agent can produce the reward by itself, and neither can tell
 * from its own position whether the team is about to succeed.
 *
 * Deliberately small so a learner understands the objective by looking at it,
 * and so tabular learning converges in the browser in under a second.
 */
import type { Action, Cell, Frame, StepResult } from './types';

export const GRID = 5;
export const MAX_STEPS = 30;
export const REWARD_BOTH = 10;
export const REWARD_STEP = -0.05;
/**
 * Optional penalty for holding a switch alone. Zero by default, which is the
 * reward the chapter specifies.
 *
 * It exists because with no penalty the task has a dominant strategy: walk to
 * your switch and stay. Both learning methods find it, so a comparison at the
 * default teaches little. Turning this up makes standing alone costly, so a
 * fixed plan stops working and the two training signals start to matter. It is
 * a control the learner changes, not a change to the specified reward.
 */
export const REWARD_ALONE_DEFAULT = 0;

/** Row, column deltas for UP, DOWN, LEFT, RIGHT, STAY. */
const DELTA: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [0, 0],
];

export const STARTS: readonly [Cell, Cell] = [
  { row: 0, col: 0 },
  { row: GRID - 1, col: GRID - 1 },
];

export const SWITCHES: readonly [Cell, Cell] = [
  { row: 0, col: GRID - 1 },
  { row: GRID - 1, col: 0 },
];

const same = (a: Cell, b: Cell) => a.row === b.row && a.col === b.col;
const clamp = (v: number) => Math.min(Math.max(v, 0), GRID - 1);

export class SwitchGrid {
  positions: [Cell, Cell];
  t = 0;

  constructor(readonly alonePenalty: number = REWARD_ALONE_DEFAULT) {
    this.positions = [{ ...STARTS[0] }, { ...STARTS[1] }];
  }

  reset(): StepResult {
    this.positions = [{ ...STARTS[0] }, { ...STARTS[1] }];
    this.t = 0;
    return this.snapshot(0, false, false);
  }

  private onSwitchFlags(): [boolean, boolean] {
    return [
      same(this.positions[0], SWITCHES[0]),
      same(this.positions[1], SWITCHES[1]),
    ];
  }

  private snapshot(reward: number, done: boolean, solved: boolean): StepResult {
    return {
      positions: [{ ...this.positions[0] }, { ...this.positions[1] }],
      onSwitch: this.onSwitchFlags(),
      reward,
      done,
      solved,
      t: this.t,
    };
  }

  /**
   * Local observation for one agent: its own cell, plus one bit saying whether
   * the OTHER agent is currently on its switch.
   *
   * That single bit is what makes waiting learnable. Without it an agent on its
   * switch cannot tell a partner in position from a partner still walking, so
   * it has no way to know that holding still is about to pay.
   */
  observation(agent: 0 | 1): number {
    const me = this.positions[agent];
    const other = agent === 0 ? 1 : 0;
    const otherReady = same(this.positions[other], SWITCHES[other]) ? 1 : 0;
    return (me.row * GRID + me.col) * 2 + otherReady;
  }

  static readonly OBS_COUNT = GRID * GRID * 2;

  step(actions: [Action, Action]): StepResult {
    for (let i = 0; i < 2; i += 1) {
      const [dr, dc] = DELTA[actions[i]];
      this.positions[i] = {
        row: clamp(this.positions[i].row + dr),
        col: clamp(this.positions[i].col + dc),
      };
    }
    this.t += 1;

    const [a, b] = this.onSwitchFlags();
    const solved = a && b;
    const alone = !solved && (a || b);
    const reward = solved
      ? REWARD_BOTH
      : REWARD_STEP + (alone ? this.alonePenalty : 0);
    const done = solved || this.t >= MAX_STEPS;
    return this.snapshot(reward, done, solved);
  }
}

/** Runs one episode under a greedy joint policy and records it for replay. */
export function recordEpisode(
  chooseJoint: (obs: [number, number]) => [Action, Action],
  alonePenalty = REWARD_ALONE_DEFAULT,
): Frame[] {
  const env = new SwitchGrid(alonePenalty);
  env.reset();
  const frames: Frame[] = [];
  for (let t = 0; t < MAX_STEPS; t += 1) {
    const obs: [number, number] = [env.observation(0), env.observation(1)];
    const actions = chooseJoint(obs);
    const res = env.step(actions);
    frames.push({ ...res, actions });
    if (res.done) break;
  }
  return frames;
}
