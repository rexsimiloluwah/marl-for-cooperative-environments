/** Verifies the Coordinate lab learners actually learn, and how fast. */
import { train } from '../../src/lib/marl/coordinate/train';
import { DEFAULT_TRAIN } from '../../src/lib/marl/coordinate/types';
import type { Method, TrainResult } from '../../src/lib/marl/coordinate/types';

for (const method of ['iql', 'vdn'] as Method[]) {
  const runs: TrainResult['final'][] = [];
  const t0 = Date.now();
  for (let seed = 1; seed <= 5; seed += 1) {
    runs.push(train(method, { ...DEFAULT_TRAIN, seed }).final);
  }
  const ms = Date.now() - t0;
  const avg = (k: 'successRate' | 'meanSteps' | 'meanReturn') =>
    (runs.reduce((s, x) => s + x[k], 0) / runs.length).toFixed(2);
  console.log(
    method.toUpperCase().padEnd(4),
    'success', avg('successRate'),
    ' steps', avg('meanSteps'),
    ' return', avg('meanReturn'),
    ' | per-seed', runs.map((r) => r.successRate.toFixed(2)).join(' '),
    ` | ${(ms / 5).toFixed(0)}ms/run`,
  );
}
