/**
 * PYTHON RUNTIME CLIENT
 *
 * Main-thread side of the worker. One runtime is shared by every exercise on
 * a page: Pyodide is a ~10 MB download and starting a second copy per
 * exercise would be indefensible on a phone or a slow connection.
 *
 * Nothing is downloaded until an exercise actually asks to run something, so
 * a reader who never touches an exercise never pays for the runtime.
 */
import type {
  CheckOutcome,
  LoadPhase,
  Request,
  Response,
  RunOutcome,
} from './types';

/** Hard ceiling per EXECUTION. Long enough for real work, short enough that
 *  an accidental `while True:` does not look like a hung page. */
const EXEC_TIMEOUT_MS = 15_000;

/** Separate, much longer ceiling for the one-time runtime download.
 *  Fetching and starting ~10 MB of WebAssembly on a slow connection can take
 *  far longer than any exercise should run, so the two cannot share a clock:
 *  doing so reports a slow network as "your loop never terminates", which is
 *  both wrong and actively misleading to someone learning to debug. */
const BOOT_TIMEOUT_MS = 180_000;

type PhaseListener = (phase: LoadPhase, note?: string) => void;
type StdoutListener = (text: string) => void;

interface Pending {
  resolve: (value: never) => void;
  reject: (reason: Error) => void;
  timer: number;
  onStdout?: StdoutListener;
}

class PythonRuntime {
  private worker: Worker | null = null;
  private token = 0;
  private pending = new Map<number, Pending>();
  private phaseListeners = new Set<PhaseListener>();
  private phaseState: LoadPhase = 'idle';
  private phaseNote?: string;

  get phase(): LoadPhase {
    return this.phaseState;
  }

  get note(): string | undefined {
    return this.phaseNote;
  }

  onPhase(fn: PhaseListener): () => void {
    this.phaseListeners.add(fn);
    // Replay current state, so a listener attaching late is not left blank.
    fn(this.phaseState, this.phaseNote);
    return () => this.phaseListeners.delete(fn);
  }

  private setPhase(phase: LoadPhase, note?: string) {
    this.phaseState = phase;
    this.phaseNote = note;
    this.phaseListeners.forEach((fn) => fn(phase, note));
  }

  private spawn(): Worker {
    if (this.worker) return this.worker;

    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.addEventListener('message', (event: MessageEvent<Response>) => {
      const msg = event.data;
      switch (msg.kind) {
        case 'phase':
          this.setPhase(msg.phase, msg.note);
          break;
        case 'stdout':
          this.pending.get(msg.token)?.onStdout?.(msg.text);
          break;
        case 'ran':
        case 'checked':
          this.settle(msg.token, msg.kind === 'ran' ? msg.outcome : msg.outcome);
          break;
        case 'fatal':
          this.failAll(new Error(msg.note));
          break;
      }
    });

    // A worker that dies takes every in-flight run with it, so surface that
    // rather than leaving promises hanging forever.
    worker.addEventListener('error', (event) => {
      this.failAll(new Error(event.message || 'The Python worker crashed.'));
      this.recycle();
    });

    this.worker = worker;
    return worker;
  }

  /** Discards the worker so the next request starts a clean one. */
  private recycle() {
    this.worker?.terminate();
    this.worker = null;
    this.setPhase('idle');
  }

  private settle(token: number, outcome: unknown) {
    const entry = this.pending.get(token);
    if (!entry) return;
    window.clearTimeout(entry.timer);
    this.pending.delete(token);
    (entry.resolve as (v: unknown) => void)(outcome);
  }

  private failAll(error: Error) {
    this.pending.forEach((entry) => {
      window.clearTimeout(entry.timer);
      entry.reject(error);
    });
    this.pending.clear();
  }

  /**
   * Resolves once Python is ready to accept work. Kept separate from the
   * execution timeout so downloading the runtime is never mistaken for code
   * that will not terminate.
   */
  private ready(): Promise<void> {
    if (this.phaseState === 'ready') return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      let detach: (() => void) | undefined;
      let timer = 0;

      const finish = (act: () => void) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        detach?.();
        act();
      };

      timer = window.setTimeout(
        () =>
          finish(() =>
            reject(
              new Error(
                'Python is taking unusually long to download. Check your connection and try again.'
              )
            )
          ),
        BOOT_TIMEOUT_MS
      );

      detach = this.onPhase((phase, note) => {
        if (phase === 'ready') finish(() => resolve());
        else if (phase === 'failed') {
          finish(() => reject(new Error(note ?? 'Python failed to load.')));
        }
      });

      // onPhase replays the current phase synchronously, so a terminal state
      // may have settled before `detach` was assigned. Detach now if so.
      if (settled) detach?.();
    });
  }

  /** Starts downloading Pyodide without running anything. */
  preload(): void {
    const worker = this.spawn();
    if (this.phaseState === 'idle') {
      worker.postMessage({ kind: 'boot' } satisfies Request);
    }
  }

  private async send<T>(
    build: (token: number) => Request,
    onStdout?: StdoutListener
  ): Promise<T> {
    // Boot first, on its own clock, so the execution timeout below measures
    // only how long the learner's code ran.
    this.preload();
    await this.ready();

    const worker = this.spawn();
    const token = (this.token += 1);

    return new Promise<T>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(token);
        // No interrupt buffer is available, so the only way to stop running
        // Python is to destroy the worker. The next request rebuilds it,
        // which costs another Pyodide start but always works.
        this.recycle();
        reject(
          new Error(
            `Your code was still running after ${EXEC_TIMEOUT_MS / 1000} seconds and was stopped. ` +
              `The usual cause is a loop whose condition never becomes false.`
          )
        );
      }, EXEC_TIMEOUT_MS);

      this.pending.set(token, {
        resolve: resolve as (v: never) => void,
        reject,
        timer,
        onStdout,
      });
      worker.postMessage(build(token));
    });
  }

  run(code: string, onStdout?: StdoutListener): Promise<RunOutcome> {
    return this.send<RunOutcome>(
      (token) => ({ kind: 'run', token, code }),
      onStdout
    );
  }

  check(code: string, tests: string): Promise<CheckOutcome> {
    return this.send<CheckOutcome>((token) => ({
      kind: 'check',
      token,
      code,
      tests,
    }));
  }
}

/** Shared across every exercise on the page. */
let singleton: PythonRuntime | null = null;

export function python(): PythonRuntime {
  singleton ??= new PythonRuntime();
  return singleton;
}

export type { CheckOutcome, LoadPhase, RunOutcome };
