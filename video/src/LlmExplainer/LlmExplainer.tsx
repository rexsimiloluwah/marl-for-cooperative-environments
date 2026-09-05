import {Audio, Series, Sequence, staticFile} from 'remotion';
import {sceneComponents} from './sceneRegistry';
import {timedScenes} from './timings';

export const LlmExplainer: React.FC = () => {
  return (
    <Series>
      {timedScenes.map((scene, index) => {
        const Scene = sceneComponents[index];
        return (
          <Series.Sequence
            key={scene.id}
            name={`${String(index + 1).padStart(2, '0')} · ${scene.title}`}
            durationInFrames={scene.durationInFrames}
            premountFor={30}
          >
            <Scene />
            {/* a nine-frame beat, not a second: at 30 the voice arrived so late
                that each scene felt like it stalled before starting */}
            <Sequence from={9} >
              <Audio src={staticFile(scene.audioPath)} />
            </Sequence>
          </Series.Sequence>
        );
      })}
    </Series>
  );
};
