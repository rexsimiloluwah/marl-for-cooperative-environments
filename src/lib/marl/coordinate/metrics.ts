/** Rolling metrics for the learning curves. */

/** Deterministic RNG, so a learner re-running a seed sees the same result. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fixed-width window that reports its own mean without re-summing. */
export class Rolling {
  private buf: number[] = [];
  private sum = 0;

  constructor(private readonly width: number) {}

  push(v: number): void {
    this.buf.push(v);
    this.sum += v;
    if (this.buf.length > this.width) {
      this.sum -= this.buf.shift() as number;
    }
  }

  get mean(): number {
    return this.buf.length ? this.sum / this.buf.length : 0;
  }
}

export const argmax = (row: readonly number[]): number => {
  let best = 0;
  for (let i = 1; i < row.length; i += 1) {
    if (row[i] > row[best]) best = i;
  }
  return best;
};

export const maxOf = (row: readonly number[]): number => {
  let m = row[0];
  for (let i = 1; i < row.length; i += 1) if (row[i] > m) m = row[i];
  return m;
};
