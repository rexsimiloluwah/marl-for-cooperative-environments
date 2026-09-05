import {scenes as coreScenes} from '../src/CoreExplainer/narration.ts';
import {scenes as llmScenes} from '../src/LlmExplainer/narration.ts';

// The narration lives in TypeScript so the video and the audio can never
// disagree about the words. This dumps it for the Python synthesiser, which is
// where edge-tts lives.
const which = process.argv[2] === 'llm' ? 'llm' : 'core';
const scenes = which === 'llm' ? llmScenes : coreScenes;
process.stdout.write(
  JSON.stringify(
    scenes.map((s) => ({id: s.id, title: s.title, durationSeconds: s.durationSeconds, narration: s.narration})),
    null,
    2,
  ),
);
