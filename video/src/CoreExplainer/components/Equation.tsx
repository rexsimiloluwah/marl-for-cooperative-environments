import katex from 'katex';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {fontFamily, palette} from '../constants';

/**
 * AN EQUATION ON WHITE
 *
 * The card version puts a border, a shadow and an accent rail around every
 * formula, and a frame with three of those reads as a form rather than as an
 * explanation. Most equations need none of it: the maths, one caption, and
 * space.
 *
 * Reach for EquationCard only when a formula has to be visibly separated from
 * something else on screen, such as one side of a comparison.
 */
export const Equation: React.FC<{
  latex: string;
  /** One short line under the maths. Optional on purpose. */
  note?: string;
  delay?: number;
  size?: number;
  align?: 'left' | 'center';
  /** Symbol annotations, shown under the note. */
  terms?: {tex: string; is: string}[];
}> = ({latex, note, delay = 0, size = 58, align = 'center', terms}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [delay, delay + 18], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const html = katex.renderToString(latex, {throwOnError: false, displayMode: true});

  return (
    <div
      style={{
        fontFamily,
        textAlign: align,
        // A long formula in a narrow column used to run off the right edge of
        // the frame. KaTeX will not shrink on its own, so the container scales
        // it down instead of clipping it.
        maxWidth: '100%',
        overflow: 'hidden',
        opacity: progress,
        translate: `0px ${(1 - progress) * 14}px`,
      }}
    >
      <div
        style={{
          fontSize: size,
          color: palette.ink,
          maxWidth: '100%',
          overflowX: 'auto',
        }}
        dangerouslySetInnerHTML={{__html: html}}
      />
      {note && (
        <div style={{fontSize: 26, fontWeight: 700, color: palette.muted, marginTop: 10}}>{note}</div>
      )}
      {terms && (
        <div
          style={{
            display: 'flex',
            justifyContent: align === 'center' ? 'center' : 'flex-start',
            gap: 44,
            marginTop: 22,
            flexWrap: 'wrap',
          }}
        >
          {terms.map((t) => (
            <div key={t.tex} style={{display: 'flex', alignItems: 'baseline', gap: 12}}>
              <span
                style={{fontSize: 30, color: palette.ink}}
                dangerouslySetInnerHTML={{
                  __html: katex.renderToString(t.tex, {throwOnError: false}),
                }}
              />
              <span style={{fontSize: 24, color: palette.muted, fontWeight: 700}}>{t.is}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
