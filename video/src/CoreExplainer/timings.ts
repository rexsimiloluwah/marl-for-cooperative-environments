import {FPS} from './constants';
import {scenes} from './narration';

let runningFrame = 0;

export const timedScenes = scenes.map((scene, index) => {
  const durationInFrames = scene.durationSeconds * FPS;
  const result = {
    ...scene,
    index,
    startFrame: runningFrame,
    durationInFrames,
    audioPath: `narration/${scene.id}.m4a`,
  };
  runningFrame += durationInFrames;
  return result;
});

export const TOTAL_FRAMES = runningFrame;
export const TOTAL_SECONDS = TOTAL_FRAMES / FPS;

export const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${minutes}:${remainder}`;
};
