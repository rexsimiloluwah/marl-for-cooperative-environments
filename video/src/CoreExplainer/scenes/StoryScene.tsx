import {Sequence} from 'remotion';
import {SceneShell} from '../components/SceneShell';
import {AdaptationVisuals} from './AdaptationVisuals';
import {BackgroundVisuals} from './BackgroundVisuals';
import {CommunicationVisuals} from './CommunicationVisuals';
import {CoordinationVisuals} from './CoordinationVisuals';
import {SynthesisVisuals} from './SynthesisVisuals';

/**
 * PRE-ROLL
 *
 * Removing the shell's fade exposed something it had been hiding: a scene whose
 * elements animate in from frame 0 shows an EMPTY frame on the cut, so the
 * viewer sees white and then a pop. Measured across all 29 scenes, six did
 * this — the video's own opening among them.
 *
 * Wrapping the visual in a Sequence with a negative `from` starts its clock
 * early, so at the cut the entry animation is already part-way through and
 * there is something on screen. The proper fix is for each scene to open on
 * the picture the previous one ended on; this is the safety net for the scenes
 * that do not yet.
 */
const PRE_ROLL: Record<number, number> = {
  0: 16,  // the video's first frame
  5: 18,  // coordination intuition
  8: 18,  // centralized and decentralized
  10: 18, // credit assignment
  11: 18, // VDN
  12: 18, // QMIX
};

export const StoryScene: React.FC<{sceneIndex: number}> = ({sceneIndex}) => {
  const visual = sceneIndex < 5
    ? <BackgroundVisuals sceneIndex={sceneIndex} />
    : sceneIndex < 13
      ? <CoordinationVisuals sceneIndex={sceneIndex} />
      : sceneIndex < 18
        ? <CommunicationVisuals sceneIndex={sceneIndex} />
        : sceneIndex < 24
          ? <AdaptationVisuals sceneIndex={sceneIndex} />
          : <SynthesisVisuals sceneIndex={sceneIndex} />;

  const pre = PRE_ROLL[sceneIndex] ?? 0;

  return (
    <SceneShell sceneIndex={sceneIndex}>
      {pre > 0 ? <Sequence from={-pre}>{visual}</Sequence> : visual}
    </SceneShell>
  );
};
