import {mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {scenes as coreScenes} from '../src/CoreExplainer/narration.ts';
import {scenes as llmScenes} from '../src/LlmExplainer/narration.ts';

// Two videos, two storyboards, two output directories. They must never share a
// directory: parallel builders contending for one is what stalled the first
// build for twenty minutes with nothing to show for it.
const which = process.argv[2] === 'llm' ? 'llm' : 'core';
const scenes = which === 'llm' ? llmScenes : coreScenes;
const composition = which === 'llm' ? 'LlmExplainer' : 'CoreExplainer';

const root = process.cwd();
const outputDir = join(root, 'out', which === 'llm' ? 'storyboard-llm' : 'storyboard');
mkdirSync(outputDir, {recursive: true});

let startFrame = 0;
for (const [index, scene] of scenes.entries()) {
  const durationInFrames = scene.durationSeconds * 30;
  const frame = startFrame + Math.floor(durationInFrames * 0.58);
  const output = join(outputDir, `${String(index + 1).padStart(2, '0')}-${scene.id}.png`);
  console.log(`[${index + 1}/${scenes.length}] frame ${frame}: ${scene.title}`);
  const result = spawnSync(
    join(root, 'node_modules', '.bin', 'remotion'),
    ['still', 'src/index.ts', composition, output, `--frame=${frame}`, '--scale=0.5', '--log=error'],
    {cwd: root, encoding: 'utf8'},
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }
  startFrame += durationInFrames;
}

console.log(`Rendered ${scenes.length} storyboard frames to ${outputDir}`);

// Build the contact sheet in the same run. It was previously made separately,
// so it went stale the moment a frame changed and showed an old version of the
// video to anyone reviewing it.
const sheet = join(root, 'out', which === 'llm' ? 'storyboard-llm-sheet.png' : 'storyboard-sheet.png');
const sheetResult = spawnSync(
  'python3',
  [join(root, 'scripts', 'contact-sheet.py'), outputDir, sheet],
  {cwd: root, encoding: 'utf8'},
);
if (sheetResult.status !== 0) {
  console.warn(`Could not build the contact sheet:\n${sheetResult.stderr || sheetResult.stdout}`);
} else {
  console.log(sheetResult.stdout.trim());
}
