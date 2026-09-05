import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {fontFamily, palette} from '../constants';
import {Agent} from './Agent';

const counterStyle: React.CSSProperties = {
  position: 'absolute',
  width: 190,
  height: 110,
  borderRadius: 22,
  background: '#E8EEF4',
  border: `4px solid ${palette.navy}`,
  boxShadow: 'inset 0 -12px 0 rgba(18,58,99,0.08)',
};

export const Kitchen: React.FC<{
  agents?: number;
  showRoutes?: boolean;
  blocked?: boolean;
  showReward?: boolean;
  compact?: boolean;
}> = ({agents = 3, showRoutes = false, blocked = false, showReward = false, compact = false}) => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 13) * 0.035;
  const routeProgress = interpolate(frame, [30, 150], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: compact ? 40 : 70,
        top: compact ? 35 : 70,
        width: compact ? 930 : 1160,
        height: compact ? 500 : 560,
        borderRadius: 38,
        background: palette.white,
        border: `3px solid ${palette.line}`,
        boxShadow: '0 22px 60px rgba(16,35,63,0.10)',
        overflow: 'hidden',
        fontFamily,
      }}
    >
      <div style={{position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${palette.line} 2px, transparent 2px), linear-gradient(90deg, ${palette.line} 2px, transparent 2px)`, backgroundSize: '54px 54px', opacity: 0.45}} />
      <div style={{...counterStyle, left: 75, top: 62}} />
      <div style={{...counterStyle, right: 75, top: 62}} />
      <div style={{...counterStyle, left: '50%', bottom: 45, translate: '-50% 0px', width: 270}} />
      <div style={{position: 'absolute', left: 138, top: 88, width: 60, height: 60, borderRadius: '50%', border: `7px solid ${palette.orange}`, background: palette.white}} />
      <div style={{position: 'absolute', right: 138, top: 88, width: 58, height: 58, borderRadius: 12, background: palette.green, scale: pulse}} />
      <div style={{position: 'absolute', left: '50%', bottom: 70, translate: '-50% 0px', width: 94, height: 28, borderRadius: '50%', background: palette.paleBlue, border: `5px solid ${palette.blue}`}} />

      {showRoutes ? (
        <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} viewBox="0 0 1160 560">
          <path d="M260 390 C430 240, 650 250, 900 180" fill="none" stroke={palette.blue} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${routeProgress * 900} 1000`} opacity="0.75" />
          <path d="M900 390 C720 240, 520 250, 260 180" fill="none" stroke={blocked ? palette.red : palette.orange} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${routeProgress * 900} 1000`} opacity="0.75" />
          {blocked ? <g><circle cx="580" cy="285" r="58" fill={palette.white} stroke={palette.red} strokeWidth="10" /><path d="M545 250 L615 320 M615 250 L545 320" stroke={palette.red} strokeWidth="14" strokeLinecap="round" /></g> : null}
        </svg>
      ) : null}

      {agents >= 1 ? <Agent color={palette.blue} label="Agent A" x={compact ? 185 : 245} y={compact ? 270 : 320} delay={8} size={compact ? 84 : 96} /> : null}
      {agents >= 2 ? <Agent color={palette.orange} label="Agent B" x={compact ? 650 : 805} y={compact ? 270 : 320} delay={18} size={compact ? 84 : 96} direction="left" /> : null}
      {agents >= 3 ? <Agent color={palette.green} label="Agent C" x={compact ? 430 : 535} y={compact ? 115 : 140} delay={28} size={compact ? 84 : 96} /> : null}

      {showReward ? (
        <div style={{position: 'absolute', right: 28, bottom: 26, padding: '12px 20px', borderRadius: 18, background: palette.paleGreen, border: `3px solid ${palette.green}`, color: palette.green, fontSize: 30, fontWeight: 900, scale: pulse}}>
          Team reward +1
        </div>
      ) : null}
    </div>
  );
};
