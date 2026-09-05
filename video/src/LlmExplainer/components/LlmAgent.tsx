import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {fontFamily, palette} from '../constants';

/**
 * AN LLM AGENT
 *
 * The same family as `Agent` in the core explainer — rounded head, visor, ear
 * nubs, light from the upper left — with one difference that carries the whole
 * point of this video: instead of an antenna it wears a short stack of token
 * bars, because what this agent emits is text.
 *
 * `busy` makes those bars stream, for the beats where an agent is generating.
 * `speaking` is what a scene sets when it wants the visor lit.
 */

const EYE = '#EAF5FF';

export const LlmAgent: React.FC<{
  color: string;
  label?: string;
  /** A second line under the label, for a role like "proposes an implementation". */
  role?: string;
  x?: number;
  y?: number;
  delay?: number;
  size?: number;
  /** Stream the token bars, for an agent that is generating right now. */
  busy?: boolean;
  /** Dim the whole agent, for one that is waiting its turn. */
  dim?: boolean;
}> = ({color, label, role, x = 0, y = 0, delay = 0, size = 104, busy = false, dim = false}) => {
  const frame = useCurrentFrame();
  const entered = interpolate(frame, [delay, delay + 18], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    output: 'perceptual-scale',
  });
  const bob = Math.sin((frame - delay) / 19) * 3;
  const blink = Math.sin((frame - delay) / 37) > 0.988 ? 0.12 : 1;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size + (label ? (role ? 74 : 44) : 0),
        opacity: entered * (dim ? 0.34 : 1),
        scale: entered,
        translate: `0px ${bob}px`,
        fontFamily,
      }}
    >
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}
        role="img"
        aria-label={label ? `LLM agent ${label}` : 'LLM agent'}
      >
        {/* token bars: what this agent emits is text, not a move */}
        {[0, 1, 2].map((i) => {
          const phase = busy ? (frame - delay) / 6 + i * 0.9 : 0;
          const w = busy ? 12 + Math.abs(Math.sin(phase)) * 20 : [26, 18, 22][i];
          return (
            <rect
              key={i}
              x={60 - w / 2}
              y={-6 + i * 8}
              width={w}
              height={5}
              rx={2.5}
              fill={color}
              opacity={busy ? 0.55 + 0.45 * Math.abs(Math.sin(phase)) : 0.75 - i * 0.2}
            />
          );
        })}

        {/* ear nubs, behind the head */}
        <rect x={2} y={50} width={11} height={26} rx={5.5} fill={palette.ink} />
        <rect x={107} y={50} width={11} height={26} rx={5.5} fill={palette.ink} />

        <rect x={10} y={22} width={100} height={90} rx={27} fill={color} stroke={palette.ink} strokeWidth={5} />
        <path
          d="M 37 22 h 46 a 27 27 0 0 1 27 27 v 6 H 10 V 49 a 27 27 0 0 1 27 -27 z"
          fill={palette.white}
          opacity={0.26}
        />

        <rect x={23} y={37} width={74} height={48} rx={19} fill={palette.ink} />
        <rect
          x={23}
          y={37}
          width={74}
          height={48}
          rx={19}
          fill="none"
          stroke={palette.white}
          strokeWidth={2.5}
          opacity={0.4}
        />
        <g opacity={blink}>
          <rect x={38} y={52} width={12} height={16} rx={6} fill={EYE} />
          <rect x={70} y={52} width={12} height={16} rx={6} fill={EYE} />
        </g>

        <rect x={48} y={94} width={24} height={7} rx={3.5} fill={palette.ink} opacity={0.5} />
      </svg>

      {label ? (
        <div
          style={{
            position: 'absolute',
            top: size + 8,
            left: '50%',
            translate: '-50% 0px',
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{fontSize: 24, fontWeight: 850, color: palette.ink, letterSpacing: '-0.02em'}}>{label}</div>
          {role ? (
            <div style={{fontSize: 20, fontWeight: 700, color: palette.muted, marginTop: 4}}>{role}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
