import katex from 'katex';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {fontFamily, palette} from '../constants';

export const EquationCard: React.FC<{
  latex: string;
  label: string;
  accent?: string;
  delay?: number;
  compact?: boolean;
}> = ({latex, label, accent = palette.blue, delay = 0, compact = false}) => {
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
        position: 'relative',
        background: palette.white,
        border: `3px solid ${accent}`,
        borderRadius: 28,
        padding: compact ? '18px 26px' : '26px 36px',
        boxShadow: '0 18px 45px rgba(16,35,63,0.10)',
        opacity: progress,
        translate: `${(1 - progress) * 35}px 0px`,
        fontFamily,
      }}
    >
      <div style={{position: 'absolute', left: 0, top: 22, bottom: 22, width: 8, borderRadius: '0 8px 8px 0', background: accent}} />
      <div style={{fontSize: compact ? 34 : 43, color: palette.ink}} dangerouslySetInnerHTML={{__html: html}} />
      <div style={{fontSize: compact ? 21 : 24, fontWeight: 750, color: palette.muted, textAlign: 'center', marginTop: 4}}>{label}</div>
    </div>
  );
};
