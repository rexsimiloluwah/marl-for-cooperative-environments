import {Audio, Series, Sequence, staticFile} from 'remotion';
import {sceneComponents} from './sceneRegistry';
import {TitleCard, TITLE_FRAMES} from './TitleCard';
import {timedScenes} from './timings';

export const CoreExplainer: React.FC = () => {
  return (
    <Series>
      {/* The opening frame. Deliberately outside `scenes`, so every scene keeps
          the index its visuals were written against. */}
      <Series.Sequence name="00 - Title" durationInFrames={TITLE_FRAMES}>
        <TitleCard />
        <Sequence from={26}>
          <Audio src={staticFile('narration/00-title.m4a')} />
        </Sequence>
      </Series.Sequence>

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
            <Sequence from={index === 0 ? 26 : 9} >
              <Audio src={staticFile(scene.audioPath)} />
            </Sequence>
          </Series.Sequence>
        );
      })}
    </Series>
  );
};
