import {palette} from '../CoreExplainer/constants';
import type {Section} from './narration';

export {FPS, WIDTH, HEIGHT, palette, fontFamily} from '../CoreExplainer/constants';

/**
 * One accent per section, so the five movements of the video are
 * distinguishable without a badge announcing which one you are in.
 *
 * These are the same five hues the core explainer uses for its chapters, which
 * is deliberate: a viewer arriving here from that video should feel the same
 * palette, not a new brand.
 */
export const sectionColors: Record<Section, string> = {
  Opening: palette.blue,
  Formalism: palette.orange,
  MAGRPO: palette.purple,
  Applications: palette.green,
  Frontier: palette.navy,
};
