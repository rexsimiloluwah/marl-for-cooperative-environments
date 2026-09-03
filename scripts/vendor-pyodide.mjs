/**
 * Vendors the Pyodide core runtime into public/pyodide/ for offline use.
 *
 * By default the site loads Pyodide from a CDN, which keeps the repository
 * small. That is the wrong default for a classroom without reliable
 * internet, which is a real setting for this resource, so this script makes
 * the site fully self-contained:
 *
 *     npm run vendor:pyodide
 *     PUBLIC_PYODIDE_BASE=/pyodide/ npm run build
 *
 * Only the core runtime is fetched, not the scientific package set. The
 * exercises are pure Python by design, and pulling numpy and friends would
 * multiply the download for no teaching benefit.
 */
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const VERSION = '314.0.6';
const BASE = `https://cdn.jsdelivr.net/pyodide/v${VERSION}/full/`;
const OUT = 'public/pyodide';

/** The minimum set needed to start CPython in the browser. */
const FILES = [
  'pyodide.mjs',
  // Note: `pyodide.asm.mjs`, not `.js`. Pyodide moved to an ES module for
  // the emscripten glue in the 314 line (the release that started tracking
  // CPython version numbers), and the old name now 404s.
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'pyodide-lock.json',
  'python_stdlib.zip',
];

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

await mkdir(OUT, { recursive: true });

let total = 0;
for (const name of FILES) {
  const dest = join(OUT, name);
  try {
    const existing = await stat(dest);
    if (existing.size > 0) {
      console.log(`  skip  ${name} (already present, ${mb(existing.size)})`);
      total += existing.size;
      continue;
    }
  } catch {
    /* not present yet */
  }

  process.stdout.write(`  get   ${name} ... `);
  const res = await fetch(BASE + name);
  if (!res.ok) {
    console.log(`FAILED ${res.status}`);
    process.exitCode = 1;
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  total += buf.length;
  console.log(mb(buf.length));
}

console.log(`\nPyodide ${VERSION} vendored into ${OUT}/  (${mb(total)} total)`);
console.log('Build offline with:  PUBLIC_PYODIDE_BASE=/pyodide/ npm run build');
