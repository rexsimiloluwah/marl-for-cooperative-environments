/** Shared types for the Coordinate virtual lab. */

export const ACTIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'STAY'] as const;
export type ActionName = (typeof ACTIONS)[number];
/** Index into ACTIONS. */
export type Action = 0 | 1 | 2 | 3 | 4;

export interface Cell {
  row: number;
  col: number;
}

export interface StepResult {
  /** Agent positions after the step. */
  positions: [Cell, Cell];
  /** Whether each agent is standing on its own switch. */
  onSwitch: [boolean, boolean];
  reward: number;
  done: boolean;
  /** True only on the step both switches were held together. */
  solved: boolean;
  t: number;
}

/** One frame of a recorded episode, for replay. */
export interface Frame extends StepResult {
  actions: [Action, Action];
}

export interface TrainConfig {
  episodes: number;
  alpha: number;
  gamma: number;
  /** Exploration decays linearly to epsilonMin over this fraction of training. */
  epsilonStart: number;
  epsilonMin: number;
  seed: number;
  /** Penalty for holding a switch alone. Zero is the chapter's reward. */
  alonePenalty?: number;
}

export const DEFAULT_TRAIN: TrainConfig = {
  episodes: 4000,
  alpha: 0.15,
  gamma: 0.95,
  epsilonStart: 1,
  epsilonMin: 0.05,
  seed: 7,
  alonePenalty: 0,
};

export interface Progress {
  episode: number;
  /** Rolling success rate over the recent window. */
  successRate: number;
  /** Rolling mean steps to solve, counting failures at the step limit. */
  meanSteps: number;
  meanReturn: number;
}

export interface TrainResult {
  /** One Progress sample per reporting interval, for the learning curve. */
  curve: Progress[];
  /** Final greedy-policy metrics, measured over evaluation episodes. */
  final: { successRate: number; meanSteps: number; meanReturn: number };
  /** A greedy episode, for replay. */
  replay: Frame[];
}

export type Method = 'iql' | 'vdn';
