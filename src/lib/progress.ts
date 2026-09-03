/**
 * LOCAL PROGRESS STORE
 *
 * One place for every "what has this reader done" flag: pages opened,
 * exercises passed, knowledge checks answered.
 *
 * Everything is per-browser and never leaves the device, which is why this
 * resource needs no backend and no accounts. That also means it is a reading
 * and practice tracker, not an assessment record: it says what someone
 * attempted, never what they know. Grading belongs to the worksheets and the
 * project rubric.
 *
 * Every access is wrapped, because localStorage does not merely return null
 * when unavailable, it THROWS: private windows, blocked site data, and
 * embedded preview contexts all raise on the property access itself. A
 * component that forgets this breaks the whole page.
 */

const NS = 'marl';

export type Store = 'visited' | 'exercises' | 'checks';

/** Bumped only if a stored shape changes incompatibly. */
const VERSION = 'v1';

const key = (store: Store) => `${NS}:${store}:${VERSION}`;

function read<T>(store: Store, fallback: T): T {
  try {
    const raw = localStorage.getItem(key(store));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(store: Store, value: unknown): void {
  try {
    localStorage.setItem(key(store), JSON.stringify(value));
  } catch {
    /* Nothing to do, and nothing that should break the page. */
  }
}

/* -------------------------------------------------------------------------
   PAGES
   ------------------------------------------------------------------------- */

export function visitedPages(): Set<string> {
  return new Set(read<string[]>('visited', []));
}

export function markVisited(slug: string): void {
  if (!slug) return;
  const seen = visitedPages();
  if (seen.has(slug)) return;
  seen.add(slug);
  write('visited', [...seen]);
}

/* -------------------------------------------------------------------------
   EXERCISES
   Recorded per exercise id. `passed` is sticky: once an exercise has been
   solved it stays solved, so a later experiment in the editor cannot take
   away credit the reader already earned.
   ------------------------------------------------------------------------- */

export interface ExerciseState {
  passed: boolean;
  /** Last code the reader had in the editor, so work survives a reload. */
  draft?: string;
  /** Whether the solution was revealed. Kept so the UI stays honest. */
  revealed?: boolean;
}

type ExerciseMap = Record<string, ExerciseState>;

export function exerciseState(id: string): ExerciseState {
  return read<ExerciseMap>('exercises', {})[id] ?? { passed: false };
}

export function saveExercise(id: string, patch: Partial<ExerciseState>): void {
  const all = read<ExerciseMap>('exercises', {});
  const prev = all[id] ?? { passed: false };
  all[id] = { ...prev, ...patch, passed: prev.passed || patch.passed === true };
  write('exercises', all);
}

export function resetExercise(id: string): void {
  const all = read<ExerciseMap>('exercises', {});
  delete all[id];
  write('exercises', all);
}

/* -------------------------------------------------------------------------
   KNOWLEDGE CHECKS
   ------------------------------------------------------------------------- */

export interface CheckState {
  /** Indices the reader selected, or the free-text answer they gave. */
  answer: number[] | string;
  correct: boolean;
  /** Number of attempts, so a check can stop revealing after the first try. */
  attempts: number;
}

type CheckMap = Record<string, CheckState>;

export function checkState(id: string): CheckState | undefined {
  return read<CheckMap>('checks', {})[id];
}

export function saveCheck(id: string, state: CheckState): void {
  const all = read<CheckMap>('checks', {});
  all[id] = state;
  write('checks', all);
}

export function resetCheck(id: string): void {
  const all = read<CheckMap>('checks', {});
  delete all[id];
  write('checks', all);
}

/* -------------------------------------------------------------------------
   SUMMARY
   ------------------------------------------------------------------------- */

export function counts(): {
  visited: number;
  exercisesPassed: number;
  checksCorrect: number;
} {
  const ex = read<ExerciseMap>('exercises', {});
  const ch = read<CheckMap>('checks', {});
  return {
    visited: visitedPages().size,
    exercisesPassed: Object.values(ex).filter((e) => e.passed).length,
    checksCorrect: Object.values(ch).filter((c) => c.correct).length,
  };
}
