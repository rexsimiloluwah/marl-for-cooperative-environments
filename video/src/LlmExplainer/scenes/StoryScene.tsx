import {Sequence} from 'remotion';
import {SceneShell} from '../components/SceneShell';
import {OpeningVisuals} from './OpeningVisuals';
import {FormalismVisuals} from './FormalismVisuals';
import {MagrpoVisuals} from './MagrpoVisuals';
import {ApplicationVisuals} from './ApplicationVisuals';
import {FrontierVisuals} from './FrontierVisuals';

/**
 * Scene index ranges, one per section. They match the section field in
 * narration.ts; if you move a scene between sections, change both.
 *
 *   0-4    Opening       one model becomes a team
 *   5-7    Formalism     the model as a policy
 *   8-11   MAGRPO        learning from joint behaviour
 *   12-16  Applications  why any of this matters
 *   17-20  Frontier      what is unresolved
 */
/**
 * PRE-ROLL. These four scenes hold their heading back on purpose, so the shell
 * has nothing to put on screen at the cut, and their own content builds slowly
 * — which left the frame genuinely empty for the first half second. Starting
 * their clock early means the cut lands mid-animation instead of on white.
 */
const PRE_ROLL: Record<number, number> = {
  2: 44,  // who designs the collaboration: the cursor arrives late, so reach further
  6: 22,  // when actions are language
  7: 22,  // who gets credit
  16: 22, // when teams become societies
};

export const StoryScene: React.FC<{sceneIndex: number}> = ({sceneIndex}) => {
  const visual =
    sceneIndex < 5 ? (
      <OpeningVisuals sceneIndex={sceneIndex} />
    ) : sceneIndex < 8 ? (
      <FormalismVisuals sceneIndex={sceneIndex} />
    ) : sceneIndex < 12 ? (
      <MagrpoVisuals sceneIndex={sceneIndex} />
    ) : sceneIndex < 17 ? (
      <ApplicationVisuals sceneIndex={sceneIndex} />
    ) : (
      <FrontierVisuals sceneIndex={sceneIndex} />
    );

  const pre = PRE_ROLL[sceneIndex] ?? 0;

  return (
    <SceneShell sceneIndex={sceneIndex}>
      {pre > 0 ? <Sequence from={-pre}>{visual}</Sequence> : visual}
    </SceneShell>
  );
};
