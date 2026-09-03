/// <reference lib="webworker" />
/**
 * PYTHON WORKER
 *
 * Runs Pyodide off the main thread, so a learner's runaway loop freezes
 * nothing but this worker, and so the 9.6 MB WebAssembly download never
 * blocks page interaction.
 *
 * Pyodide is fetched from the jsDelivr CDN at a PINNED version. Pinning
 * matters more than usual here: the resource has to still work years after
 * submission, and a floating version would eventually break every exercise
 * at once. Self-hosting is a one-line change to PYODIDE_BASE for anyone who
 * needs the site to run without internet access; see README.
 *
 * There is no interrupt buffer. Interrupting Python mid-execution needs a
 * SharedArrayBuffer, which needs COOP/COEP response headers, which a plain
 * static host cannot set. The main thread therefore enforces timeouts by
 * terminating this worker outright and starting a new one, which is
 * header-free and always works.
 */
import { HARNESS, HARNESS_COLLECT } from './harness';
import type { CheckResult, Request, Response } from './types';

const PYODIDE_VERSION = '314.0.6';

/**
 * Where the runtime is fetched from. Defaults to the CDN, which keeps the
 * repository small. Set PUBLIC_PYODIDE_BASE=/pyodide/ after running
 * `npm run vendor:pyodide` to serve it from this origin instead, which makes
 * the site work with no internet access at all.
 */
const PYODIDE_BASE =
  import.meta.env.PUBLIC_PYODIDE_BASE ||
  `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const post = (msg: Response) => (self as unknown as Worker).postMessage(msg);

/** Where printed output goes for the run currently in progress. */
let sink: string[] = [];
/** Token of the in-flight request, so streamed output reaches the right one. */
let active = 0;
let pyodide: Awaited<ReturnType<typeof boot>> | null = null;
let booting: Promise<unknown> | null = null;

function emit(text: string) {
  sink.push(text);
  if (active) post({ kind: 'stdout', token: active, text });
}

async function boot() {
  post({ kind: 'phase', phase: 'downloading' });

  // A URL import: Vite must leave this alone rather than try to resolve it.
  const mod = await import(/* @vite-ignore */ `${PYODIDE_BASE}pyodide.mjs`);

  post({ kind: 'phase', phase: 'starting' });

  const instance = await mod.loadPyodide({
    indexURL: PYODIDE_BASE,
    // Routed into whichever run is active, and streamed as it happens so a
    // loop that prints as it goes is visible while it runs rather than only
    // once it finishes.
    stdout: (text: string) => emit(text),
    stderr: (text: string) => emit(text),
  });

  post({ kind: 'phase', phase: 'ready', note: `Python ${instance.version ?? ''}`.trim() });
  return instance;
}

function ensure() {
  if (!booting) {
    booting = boot()
      .then((p) => {
        pyodide = p;
        return p;
      })
      .catch((err) => {
        post({
          kind: 'phase',
          phase: 'failed',
          note: err instanceof Error ? err.message : String(err),
        });
        throw err;
      });
  }
  return booting;
}

/**
 * Strips our own machinery out of a traceback.
 *
 * Pyodide reports frames from the harness and from its own internals, which
 * are noise to a learner debugging their function: seeing `harness` or
 * `pyodide/_internal` in a traceback teaches them nothing and suggests the
 * error is somewhere they cannot look. Only frames from their own code and
 * the final exception line survive.
 */
function cleanTraceback(raw: string): string {
  const lines = raw.split('\n');
  const kept: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (/File "\/lib\/python|pyodide\/_|_pyodide|importlib|<exec>/.test(line)) {
      // Drop the frame header and its source line.
      if (/^\s*File /.test(line)) i += 1;
      continue;
    }
    if (/^\s*File "<string>"/.test(line)) {
      kept.push(line.replace('"<string>"', '"your code"'));
      continue;
    }
    kept.push(line);
  }
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function describe(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  return cleanTraceback(text) || 'The code raised an error.';
}

/**
 * A fresh namespace per execution. Without this, a definition from an
 * earlier attempt would still be present and could satisfy a later check
 * that the current code does not actually pass.
 */
function freshGlobals(py: NonNullable<typeof pyodide>) {
  return py.toPy({});
}

async function handleRun(token: number, code: string) {
  const py = (await ensure()) as NonNullable<typeof pyodide>;
  sink = [];
  active = token;
  let error: string | null = null;
  const globals = freshGlobals(py);
  try {
    await py.runPythonAsync(code, { globals });
  } catch (err) {
    error = describe(err);
  } finally {
    globals.destroy?.();
    active = 0;
  }
  post({ kind: 'ran', token, outcome: { stdout: sink.join(''), error } });
}

async function handleCheck(token: number, code: string, tests: string) {
  const py = (await ensure()) as NonNullable<typeof pyodide>;
  sink = [];
  active = token;
  let error: string | null = null;
  let checks: CheckResult[] = [];
  const globals = freshGlobals(py);

  try {
    // The learner's code first. If it raises, the tests are not attempted:
    // reporting twenty failed assertions when the real problem is one syntax
    // error buries the actual message.
    await py.runPythonAsync(code, { globals });
    await py.runPythonAsync(HARNESS, { globals });
    await py.runPythonAsync(tests, { globals });
    const json = py.runPython(HARNESS_COLLECT, { globals }) as string;
    checks = JSON.parse(json) as CheckResult[];
  } catch (err) {
    error = describe(err);
  } finally {
    globals.destroy?.();
    active = 0;
  }

  const passed =
    error === null && checks.length > 0 && checks.every((c) => c.passed);
  post({
    kind: 'checked',
    token,
    outcome: { stdout: sink.join(''), error, checks, passed },
  });
}

self.addEventListener('message', (event: MessageEvent<Request>) => {
  const msg = event.data;
  const guard = (p: Promise<unknown>) =>
    p.catch((err) => post({ kind: 'fatal', note: describe(err) }));

  switch (msg.kind) {
    case 'boot':
      guard(ensure());
      break;
    case 'run':
      guard(handleRun(msg.token, msg.code));
      break;
    case 'check':
      guard(handleCheck(msg.token, msg.code, msg.tests));
      break;
  }
});
