import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {fontFamily, palette} from '../constants';

export const Arrow: React.FC<{x: number; y: number; width: number; color?: string; delay?: number; label?: string}> = ({x, y, width, color = palette.blue, delay = 0, label}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [delay, delay + 25], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div style={{position: 'absolute', left: x, top: y, width, height: 62, opacity: progress, fontFamily}}>
      {label ? <div style={{position: 'absolute', top: -38, left: 0, right: 0, textAlign: 'center', color: palette.muted, fontSize: 22, fontWeight: 750}}>{label}</div> : null}
      <div style={{position: 'absolute', left: 0, top: 25, width: Math.max(0, (width - 24) * progress), height: 10, borderRadius: 10, background: color}} />
      <div style={{position: 'absolute', right: 0, top: 12, width: 0, height: 0, borderTop: '18px solid transparent', borderBottom: '18px solid transparent', borderLeft: `26px solid ${color}`, opacity: progress}} />
    </div>
  );
};

export const InfoCard: React.FC<{title: string; body: string; accent?: string; x?: number; y?: number; width?: number; delay?: number}> = ({title, body, accent = palette.blue, x = 0, y = 0, width = 430, delay = 0}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [delay, delay + 18], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div style={{position: 'absolute', left: x, top: y, width, minHeight: 145, padding: '25px 29px', boxSizing: 'border-box', background: palette.white, border: `3px solid ${accent}`, borderRadius: 25, boxShadow: '0 14px 35px rgba(16,35,63,0.09)', fontFamily, opacity: progress, translate: `0px ${(1 - progress) * 25}px`}}>
      <div style={{fontSize: 31, fontWeight: 900, color: accent, letterSpacing: '-0.025em'}}>{title}</div>
      <div style={{fontSize: 24, fontWeight: 650, color: palette.muted, lineHeight: 1.25, marginTop: 9}}>{body}</div>
    </div>
  );
};

export const QuestionCallout: React.FC<{question: string; accent?: string}> = ({question, accent = palette.blue}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 14, 115, 140], [0, 1, 1, 0], {
    easing: [Easing.bezier(0.16, 1, 0.3, 1), Easing.linear, Easing.bezier(0.7, 0, 0.84, 0)],
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div style={{position: 'absolute', zIndex: 25, left: 130, right: 130, top: 80, padding: '38px 55px', borderRadius: 32, background: palette.white, border: `4px solid ${accent}`, boxShadow: '0 24px 65px rgba(16,35,63,0.15)', textAlign: 'center', fontFamily, opacity, scale: 0.96 + opacity * 0.04}}>
      <div style={{fontSize: 24, color: accent, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em'}}>By the end, you can answer</div>
      <div style={{fontSize: 54, color: palette.ink, fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.035em', marginTop: 12}}>{question}</div>
    </div>
  );
};

export const MessageBubble: React.FC<{text: string; x: number; y: number; color?: string; delay?: number}> = ({text, x, y, color = palette.purple, delay = 0}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [delay, delay + 15], [0, 1], {
    easing: Easing.spring({damping: 18, stiffness: 150}),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    output: 'perceptual-scale',
  });
  return (
    <div style={{position: 'absolute', left: x, top: y, padding: '17px 23px', borderRadius: '24px 24px 24px 5px', background: color, color: palette.white, fontSize: 28, fontWeight: 850, fontFamily, boxShadow: '0 12px 30px rgba(16,35,63,0.14)', opacity: progress, scale: progress}}>{text}</div>
  );
};

export const ValueBar: React.FC<{label: string; value: number; color: string; x: number; y: number; delay?: number}> = ({label, value, color, x, y, delay = 0}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [delay, delay + 35], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)});
  return (
    <div style={{position: 'absolute', left: x, top: y, width: 470, fontFamily}}>
      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 25, fontWeight: 820, color: palette.ink, marginBottom: 9}}><span>{label}</span><span>{value.toFixed(1)}</span></div>
      <div style={{height: 24, borderRadius: 14, background: palette.line, overflow: 'hidden'}}><div style={{height: '100%', width: `${value * 10 * progress}%`, borderRadius: 14, background: color}} /></div>
    </div>
  );
};
