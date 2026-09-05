import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {fontFamily, palette, chapterColors} from './constants';

/**
 * THE OPENING FRAME
 *
 * A title card that states the problem before anything is taught. It exists
 * for two reasons: the video previously began mid-explanation, with the
 * narration already running over the kitchen scene, and a viewer who lands
 * here deserves to be told what the resource is about first.
 *
 * The question types itself out rather than fading in, because watching a
 * question being written is what makes a viewer read it.
 *
 * It is NOT part of the `scenes` array. It is a leading Series.Sequence, so
 * every existing scene keeps its index and no downstream timing moves.
 */

export const TITLE_FRAMES = 450; // 15s

const QUESTION =
  'How can we teach agents that learn toward a shared goal to coordinate, ' +
  'communicate, and adapt when their teammates and conditions change?';

/** Characters per frame, tuned so the line finishes as the narration reaches it. */
const TYPE_START = 96;
const TYPE_PER_FRAME = 0.62;

export const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();

  const rise = interpolate(frame, [6, 40], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rule = interpolate(frame, [44, 82], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const typed = Math.max(0, Math.min(QUESTION.length,
    Math.floor((frame - TYPE_START) * TYPE_PER_FRAME)));
  const done = typed >= QUESTION.length;
  // the caret blinks while typing and keeps blinking after, then leaves
  const caretOn = Math.floor(frame / 15) % 2 === 0;
  const caret = frame > TYPE_START - 10 && frame < 408 && (!done || caretOn);

  return (
    <AbsoluteFill style={{background: palette.white, fontFamily, color: palette.ink}}>
      {/* the same faint wash the rest of the video opens on */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(1200px 620px at 78% -8%, ${chapterColors.Background}12, transparent 70%)`,
        }}
      />

      <div style={{position: 'absolute', left: 150, right: 150, top: 250}}>
        <div
          style={{
            fontSize: 78,
            lineHeight: 1.07,
            fontWeight: 880,
            letterSpacing: '-0.04em',
            opacity: rise,
            translate: `0px ${(1 - rise) * -12}px`,
          }}
        >
          Multi-Agent Reinforcement Learning
          <br />
          in Cooperative Environments
        </div>

        <div
          style={{
            width: `${rule * 100}%`,
            maxWidth: 1620,
            height: 6,
            borderRadius: 6,
            marginTop: 34,
            background: `linear-gradient(90deg, ${chapterColors.Coordinate}, ${chapterColors.Communicate}, ${chapterColors.Adapt})`,
          }}
        />

        <div
          style={{
            fontSize: 40,
            lineHeight: 1.34,
            fontWeight: 720,
            color: palette.muted,
            marginTop: 40,
            minHeight: 170,
          }}
        >
          {QUESTION.slice(0, typed)}
          {caret ? (
            <span style={{color: chapterColors.Background, fontWeight: 500}}>|</span>
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};
