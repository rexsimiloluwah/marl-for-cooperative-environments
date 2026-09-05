import {AbsoluteFill, Easing, interpolate, interpolateColors, useCurrentFrame, useVideoConfig} from 'remotion';
import {HEIGHT, fontFamily, palette, sectionColors} from '../constants';
import {scenes} from '../narration';

/**
 * THE FRAME, for the LLM explainer.
 *
 * Same contract as the core explainer's shell: a heading, a safe zone, a
 * progress hairline, nothing else. It is a separate file rather than a shared
 * one because the two videos read different scene lists, and coupling them
 * would mean one video's timing change could silently move the other's.
 *
 * THE SAFE ZONE
 * The top 82% of the frame is the explanation. The bottom 18% belongs to the
 * source note and the progress hairline. Nothing else may enter it.
 *
 * NOTE FOR SCENE AUTHORS: the content box sets a height but does NOT clip.
 * Content that runs past its bottom will spill into the safe zone and the
 * audit will fail the frame. Measure, do not assume.
 */

/** Everything below this belongs to the source note and progress. */
export const CONTENT_BOTTOM = Math.round(HEIGHT * 0.82); // 886 of 1080
export const CONTENT_TOP = 196;
export const MARGIN = 96;
/** The usable box, for scenes that need to do arithmetic. */
export const CONTENT_WIDTH = 1920 - MARGIN * 2; // 1728
export const CONTENT_HEIGHT = CONTENT_BOTTOM - CONTENT_TOP; // 690

export const SceneShell: React.FC<{
  sceneIndex: number;
  children: React.ReactNode;
}> = ({sceneIndex, children}) => {
  const scene = scenes[sceneIndex];
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();

  // NO PER-SCENE FADE. Scenes butt directly together so a visual that ends
  // where the next one begins simply continues, instead of blinking through
  // white between every pair of ideas. Whatever is on screen at frame 0 is
  // what the viewer cuts to, which is the scene's responsibility.

  // Intuition first: a scene may withhold its heading until the visual has
  // made the point, so the concept name arrives as a label for something the
  // viewer has already watched happen.
  const headingAt = (scene.headingDelaySeconds ?? 0) * fps;
  // A scene with no deliberate delay shows its heading from frame 0. Fading it
  // up from nothing meant a scene whose content builds slowly cut in on a
  // completely empty frame — which is what the removed shell fade had been
  // hiding. A held-back heading still animates, because there the absence is
  // the point.
  const heading = headingAt === 0
    ? 1
    : interpolate(frame, [headingAt, headingAt + 16], [0, 1], {
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });

  // A citation earns its place by being checkable, not by being loud.
  const note = interpolate(frame, [fps * 2, fps * 2 + 18], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const accent = sectionColors[scene.section];
  const previous = sceneIndex > 0 ? sectionColors[scenes[sceneIndex - 1].section] : accent;
  const wash = previous === accent
    ? accent
    : interpolateColors(Math.min(frame, 22), [0, 22], [previous, accent]);
  const long = scene.title.length > 34;

  return (
    <AbsoluteFill
      style={{
        background: palette.white,
        color: palette.ink,
        fontFamily,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(1200px 620px at 78% -8%, ${wash}0E, transparent 70%)`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: MARGIN,
          right: MARGIN,
          top: 62,
          zIndex: 20,
          opacity: heading,
          translate: `0px ${(1 - heading) * -10}px`,
        }}
      >
        <div
          style={{
            fontSize: long ? 62 : 76,
            lineHeight: 1.04,
            fontWeight: 860,
            letterSpacing: '-0.035em',
            maxWidth: 1420,
          }}
        >
          {scene.title}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: MARGIN,
          right: MARGIN,
          top: CONTENT_TOP,
          height: CONTENT_HEIGHT,
        }}
      >
        {children}
      </div>

      {scene.sourceNote ? (
        <div
          style={{
            position: 'absolute',
            left: MARGIN,
            bottom: 34,
            fontSize: 21,
            fontWeight: 700,
            letterSpacing: '0.01em',
            color: palette.muted,
            opacity: note * 0.9,
            zIndex: 30,
          }}
        >
          {scene.sourceNote}
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 5,
          background: palette.line,
          zIndex: 32,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${((sceneIndex + frame / durationInFrames) / scenes.length) * 100}%`,
            background: accent,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
