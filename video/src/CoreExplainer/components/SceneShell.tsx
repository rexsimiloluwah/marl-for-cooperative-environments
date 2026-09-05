import {AbsoluteFill, Easing, interpolate, interpolateColors, useCurrentFrame, useVideoConfig} from 'remotion';
import {HEIGHT, chapterColors, fontFamily, palette} from '../constants';
import {scenes} from '../narration';

/**
 * THE FRAME
 *
 * Deliberately thin. A scene is its visual, and the shell supplies only a
 * heading, a safe zone and a progress hairline.
 *
 * WHAT IS NOT HERE, AND WHY
 * There is no chapter badge and no "Section 12 of 28". Both told the viewer
 * where they were in a document rather than what they were looking at, and
 * repeating them on every frame is most of what made the video read as a slide
 * deck.
 *
 * THE SAFE ZONE
 * The top 82% of the frame is the explanation. The bottom 18% is left clear.
 * Burned-in captions used to live there and have been removed: the narration
 * carries the words, and a transcript strip along the bottom of every frame
 * was clutter competing with the diagram above it. The zone stays as breathing
 * room, and nothing may enter it.
 */

/** Everything below this is left clear. */
export const CONTENT_BOTTOM = Math.round(HEIGHT * 0.82); // 886 of 1080
const MARGIN = 96;

export const SceneShell: React.FC<{
  sceneIndex: number;
  children: React.ReactNode;
}> = ({sceneIndex, children}) => {
  const scene = scenes[sceneIndex];
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();

  // NO PER-SCENE FADE.
  //
  // Every scene used to fade up from white and back down to white, which put a
  // blink between each pair of ideas and is most of what made twenty-eight
  // scenes read as twenty-eight slides. Scenes now butt directly together, so
  // a visual that ends where the next one begins simply continues.
  //
  // The cost is that a scene may no longer open on an empty frame and get away
  // with it: whatever is on screen at frame 0 is what the viewer cuts to. That
  // is the scene's job, not the shell's.

  // Intuition first: a scene may withhold its heading until the visual has
  // made the point, so the concept name arrives as a label for something the
  // viewer has already seen.
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

  // The wash drifts from the previous scene's accent to this one's over the
  // first three quarters of a second, so a chapter change is a colour moving
  // rather than a colour switching.
  const accent = chapterColors[scene.chapter];
  const previous = sceneIndex > 0 ? chapterColors[scenes[sceneIndex - 1].chapter] : accent;
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
      {/* One faint wash, tinted by chapter. Enough to tell the sections apart
          without decorating the frame. */}
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
          top: 196,
          height: CONTENT_BOTTOM - 196,
        }}
      >
        {children}
      </div>

      {/* A hairline, not a bar. It says how far in you are and nothing more. */}
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
