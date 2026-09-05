import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {fontFamily, palette} from '../constants';

/**
 * AN AGENT
 *
 * A robot, not a smiley. The round faces this replaces read as emoji, which
 * made the diagrams look like they were about people; the subject is an agent,
 * so it should look like one.
 *
 * Built from the same parts as the agents in the
 * web app: antenna, rounded head, visor, ear nubs, light from the upper left.
 * The head takes the agent's colour, so colour coding across the explainer is
 * unchanged, and the footprint is identical to the circle it replaces, so no
 * scene layout moves.
 */

const EYE = '#EAF5FF';

export const Agent: React.FC<{
  color: string;
  label: string;
  x?: number;
  y?: number;
  delay?: number;
  size?: number;
  direction?: 'left' | 'right';
}> = ({color, label, x = 0, y = 0, delay = 0, size = 108, direction = 'right'}) => {
  const frame = useCurrentFrame();
  const entered = interpolate(frame, [delay, delay + 18], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    output: 'perceptual-scale',
  });
  const bob = Math.sin((frame - delay) / 18) * 4;
  // rare and short, so a row of agents looks alive rather than animated
  const blink = Math.sin((frame - delay) / 37) > 0.988 ? 0.12 : 1;
  // agents look towards the middle of whatever they are part of
  const gaze = direction === 'right' ? 3 : -3;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size + 42,
        opacity: entered,
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
        aria-label={`Agent ${label}`}
      >
        {/* antenna */}
        <path d="M 60 17 V 6" stroke={palette.ink} strokeWidth={5} strokeLinecap="round" />
        <circle cx={60} cy={5} r={6.5} fill={color} stroke={palette.ink} strokeWidth={3} />

        {/* ear nubs, behind the head */}
        <rect x={2} y={50} width={11} height={26} rx={5.5} fill={palette.ink} />
        <rect x={107} y={50} width={11} height={26} rx={5.5} fill={palette.ink} />

        {/* head */}
        <rect
          x={10}
          y={17}
          width={100}
          height={95}
          rx={28}
          fill={color}
          stroke={palette.ink}
          strokeWidth={5}
        />
        {/* lit upper face, the same light direction as the web app agents */}
        <path
          d="M 38 17 h 44 a 28 28 0 0 1 28 28 v 6 H 10 V 45 a 28 28 0 0 1 28 -28 z"
          fill={palette.white}
          opacity={0.26}
        />

        {/* visor */}
        <rect x={23} y={33} width={74} height={50} rx={20} fill={palette.ink} />
        {/* a glass rim, so the visor still reads on a dark head */}
        <rect
          x={23}
          y={33}
          width={74}
          height={50}
          rx={20}
          fill="none"
          stroke={palette.white}
          strokeWidth={2.5}
          opacity={0.4}
        />
        <g opacity={blink} transform={`translate(${gaze}, 0)`}>
          <rect x={38} y={50} width={12} height={16} rx={6} fill={EYE} />
          <rect x={70} y={50} width={12} height={16} rx={6} fill={EYE} />
        </g>

        {/* speaker vent */}
        <rect x={48} y={92} width={24} height={7} rx={3.5} fill={palette.ink} opacity={0.5} />
      </svg>

      {/* An empty label used to render as a bare pill under the agent, which
          looked like a missing caption. No label, no pill. */}
      {label ? (
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          translate: '-50% 0px',
          borderRadius: 999,
          background: palette.white,
          border: `2px solid ${palette.line}`,
          color: palette.ink,
          fontSize: 22,
          fontWeight: 800,
          padding: '6px 14px',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
      ) : null}
    </div>
  );
};
