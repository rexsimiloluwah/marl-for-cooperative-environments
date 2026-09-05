import {Composition} from 'remotion';
import {CoreExplainer} from './CoreExplainer/CoreExplainer';
import {TOTAL_FRAMES as CORE_FRAMES} from './CoreExplainer/timings';
import {TITLE_FRAMES} from './CoreExplainer/TitleCard';
import {LlmExplainer} from './LlmExplainer/LlmExplainer';
import {TOTAL_FRAMES as LLM_FRAMES} from './LlmExplainer/timings';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CoreExplainer"
        component={CoreExplainer}
        durationInFrames={TITLE_FRAMES + CORE_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="LlmExplainer"
        component={LlmExplainer}
        durationInFrames={LLM_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
