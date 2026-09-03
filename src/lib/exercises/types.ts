/**
 * Shared message contract between the main thread and the Python worker.
 * Kept in its own module so both sides import the same definitions and a
 * change to one cannot silently diverge from the other.
 */

/** One assertion the exercise author wrote, and how it went. */
export interface CheckResult {
  name: string;
  passed: boolean;
  /** Repr of what the learner's code produced. */
  actual: string;
  /** Repr of what was expected. */
  expected: string;
  /**
   * Author-written explanation of what this assertion is really testing.
   * Shown when the check fails. This is the difference between useful
   * feedback and "Incorrect".
   */
  hint: string;
}

export interface RunOutcome {
  /** Everything the code printed. */
  stdout: string;
  /** Cleaned Python traceback, or null when the code ran without raising. */
  error: string | null;
}

export interface CheckOutcome extends RunOutcome {
  checks: CheckResult[];
  /** True only when every assertion passed and nothing raised. */
  passed: boolean;
}

export type LoadPhase =
  | 'idle'
  | 'downloading'
  | 'starting'
  | 'ready'
  | 'failed';

/* ---- main thread -> worker ---- */
export type Request =
  | { kind: 'boot' }
  | { kind: 'run'; token: number; code: string }
  | { kind: 'check'; token: number; code: string; tests: string };

/* ---- worker -> main thread ---- */
export type Response =
  | { kind: 'phase'; phase: LoadPhase; note?: string }
  | { kind: 'stdout'; token: number; text: string }
  | { kind: 'ran'; token: number; outcome: RunOutcome }
  | { kind: 'checked'; token: number; outcome: CheckOutcome }
  | { kind: 'fatal'; note: string };
