import {Easing, interpolate, interpolateColors, useCurrentFrame} from 'remotion';
import {chapterColors, fontFamily, palette} from '../constants';
import {Agent} from '../components/Agent';
import {Equation} from '../components/Equation';

/**
 * BACKGROUND — scenes 0 to 4, played as ONE continuous shot.
 *
 * THE IDEA
 * There is a single kitchen, drawn once, and a camera that moves over it. The
 * five scenes are five positions of that camera plus whatever is drawn on top:
 *
 *   0 Opening        wide on the kitchen, three cooks, the four moves
 *                    ... the camera pushes in on Agent A ...
 *   1 Policies       close on Agent A, the observation/policy/action loop
 *                    forms around it
 *   2 Multi-agent    Agent A is DUPLICATED into Agent B beside it, the two
 *                    private actions converge into one joint action
 *   3 State/obs      the camera pulls back, the whole kitchen returns as the
 *                    state, and then a wall and a sensor range take Agent A's
 *                    sight away — same agents, same place
 *   4 Shared reward  the fog lifts, one number comes down onto both agents
 *
 * Nothing is ever cleared. Each scene's first frame reproduces the previous
 * scene's last frame exactly, because both are computed from the same camera
 * presets and the same world coordinates below.
 *
 * TWO COORDINATE SYSTEMS
 * "World" coordinates describe the kitchen (1000 x 430) and never change.
 * "Stage" coordinates are the 1728 x 690 content box handed down by
 * SceneShell. A camera maps one to the other: stage = s * world + (x, y).
 * Agents are positioned in stage coordinates so their name labels do not
 * scale with the zoom, but their size does, so a push-in reads as a push-in.
 *
 * The world is drawn inside a 1728 x 636 viewport with overflow hidden, which
 * is what lets the camera zoom past the frame edges without anything spilling
 * into the caption band. Equations sit outside that viewport, on white.
 */

const ease = Easing.bezier(0.16, 1, 0.3, 1);

const STAGE_W = 1728;
/** The world is clipped here, well above the reserved bottom band. */
const VIEW_H = 636;

/* ------------------------------------------------------------------ */
/* The world                                                           */
/* ------------------------------------------------------------------ */

const ROOM_W = 1000;
const ROOM_H = 430;
/** Agent footprint in world units. On stage it becomes AGENT_W * cam.s. */
const AGENT_W = 88;

const WA = [215, 262] as const; // Agent A, blue
const WB = [785, 262] as const; // Agent B, orange
const WC = [500, 132] as const; // Agent C, green — only in the opening

/** The wall that blocks Agent A's view in scene 3. */
const WALL = {x: 340, w: 26, y: 92, h: 338};
/** The station Agent B can see and Agent A cannot. */
const STATION = {x: 800, y: 140, w: 54, h: 54};

type Cam = {s: number; x: number; y: number};

/** Wide on the whole kitchen, sitting in the left half of the frame. */
const CAM_WIDE: Cam = {s: 0.9, x: 36, y: 52};
/** Close on Agent A. Agent B's spot lands at x = 1320, still in frame. */
const CAM_ONE: Cam = {s: 1.6, x: 64, y: -264};
/** Back far enough to hold the whole room, with room for a label each side. */
const CAM_STATE: Cam = {s: 0.84, x: 444, y: 6};
/** A small push back in, to leave head-room for the reward coming down. */
const CAM_TEAM: Cam = {s: 1, x: 364, y: 40};

const lerpCam = (a: Cam, b: Cam, t: number): Cam => ({
  s: a.s + (b.s - a.s) * t,
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

const at = (cam: Cam, p: readonly [number, number]): [number, number] => [
  cam.s * p[0] + cam.x,
  cam.s * p[1] + cam.y,
];

/**
 * Absolute start frame of each scene. Passed to <Agent> as a negative delay so
 * the idle bob runs off the absolute timeline and does not jump at a cut, and
 * so an agent that was already on screen is fully present at frame 0.
 */
const START = [0, 1050, 2100, 3300, 4650];

const ramp = (frame: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(frame, [a, b], [from, to], {
    easing: ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const band = (frame: number, a: number, b: number, c: number, d: number) =>
  interpolate(frame, [a, b, c, d], [0, 1, 1, 0], {
    easing: ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const cubic = (
  p0: readonly [number, number],
  p1: readonly [number, number],
  p2: readonly [number, number],
  p3: readonly [number, number],
  t: number,
): [number, number] => {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
};

/** The umbra cast by a vertical wall segment, seen from one point. */
const umbra = (from: readonly [number, number], wx: number, y0: number, y1: number) => {
  const far = 2600;
  const ray = (ty: number) => {
    const dx = wx - from[0];
    const dy = ty - from[1];
    const len = Math.hypot(dx, dy) || 1;
    return `${from[0] + (dx / len) * far},${from[1] + (dy / len) * far}`;
  };
  return `${wx},${y0} ${ray(y0)} ${ray(y1)} ${wx},${y1}`;
};

/* ------------------------------------------------------------------ */
/* The kitchen, drawn once                                             */
/* ------------------------------------------------------------------ */

const counter: React.CSSProperties = {
  position: 'absolute',
  height: 104,
  width: 200,
  borderRadius: 20,
  background: '#E8EEF4',
  border: `4px solid ${palette.navy}`,
  boxShadow: 'inset 0 -12px 0 rgba(18,58,99,0.08)',
};

const Room: React.FC<{
  cam: Cam;
  opacity: number;
  /** 0 to 1: the wall that blocks Agent A's line of sight. */
  wall?: number;
  /** 0 to 1: everything Agent A cannot see goes pale. */
  fog?: number;
  /** Sight radius, in world units, and its own opacity. */
  sight?: number;
  sightOpacity?: number;
  /** 0 to 1: the station Agent B can see is ready. */
  ready?: number;
  /** Absolute start frame, so the pulse does not restart at a cut. */
  sceneStart?: number;
}> = ({cam, opacity, wall = 0, fog = 0, sight = 92, sightOpacity = 0, ready = 0, sceneStart = 0}) => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin((frame + sceneStart) / 13) * 0.05;

  return (
    <div
      style={{
        position: 'absolute',
        left: cam.x,
        top: cam.y,
        width: ROOM_W,
        height: ROOM_H,
        transformOrigin: '0px 0px',
        scale: cam.s,
        opacity,
        borderRadius: 34,
        background: palette.white,
        border: `3px solid ${palette.line}`,
        boxShadow: '0 22px 60px rgba(16,35,63,0.10)',
        overflow: 'hidden',
        fontFamily,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(${palette.line} 2px, transparent 2px), linear-gradient(90deg, ${palette.line} 2px, transparent 2px)`,
          backgroundSize: '54px 54px',
          opacity: 0.45,
        }}
      />

      <div style={{...counter, left: 58, top: 118}} />
      <div style={{...counter, left: 742, top: 118}} />
      <div style={{...counter, left: 390, top: 318, width: 220, height: 88}} />

      {/* the pan on the left counter, the thing Agent A is close enough to see */}
      <div
        style={{
          position: 'absolute',
          left: 140,
          top: 158,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: `7px solid ${palette.orange}`,
          background: palette.white,
        }}
      />
      {/* the station on the right counter */}
      <div
        style={{
          position: 'absolute',
          left: STATION.x,
          top: STATION.y,
          width: STATION.w,
          height: STATION.h,
          borderRadius: 12,
          background: palette.green,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 454,
          top: 338,
          width: 92,
          height: 28,
          borderRadius: '50%',
          background: palette.paleBlue,
          border: `5px solid ${palette.blue}`,
        }}
      />

      {wall > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: WALL.x,
            top: WALL.y,
            width: WALL.w,
            height: WALL.h,
            borderRadius: 8,
            background: palette.navy,
            opacity: wall,
            transformOrigin: '50% 0px',
            scale: `1 ${wall}`,
          }}
        />
      ) : null}

      {/* what Agent A cannot see: outside its range, or behind the wall */}
      {fog > 0 ? (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: fog,
              background: `radial-gradient(circle at ${WA[0]}px ${WA[1]}px, rgba(255,255,255,0) 0px, rgba(255,255,255,0) ${sight}px, rgba(252,253,255,0.90) ${sight + 46}px)`,
            }}
          />
          <svg style={{position: 'absolute', inset: 0}} viewBox={`0 0 ${ROOM_W} ${ROOM_H}`}>
            <polygon
              points={umbra(WA, WALL.x, WALL.y, WALL.y + WALL.h)}
              fill="rgba(252,253,255,0.94)"
              opacity={fog * wall}
            />
          </svg>
        </>
      ) : null}

      {sightOpacity > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: WA[0] - sight,
            top: WA[1] - sight,
            width: sight * 2,
            height: sight * 2,
            borderRadius: '50%',
            border: `4px dashed ${palette.blue}`,
            opacity: sightOpacity * 0.8,
          }}
        />
      ) : null}

      {/* the station stays lit through the fog: Agent B can see it */}
      {ready > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: STATION.x - 18,
            top: STATION.y - 18,
            width: STATION.w + 36,
            height: STATION.h + 36,
            borderRadius: 22,
            border: `6px solid ${palette.green}`,
            opacity: ready,
            scale: pulse,
          }}
        />
      ) : null}
    </div>
  );
};

/**
 * A soft floor for the frame: the world dissolves into white before the
 * equations start, so maths always sits on white and never on a grid.
 */
const Scrim: React.FC<{start: number; end: number}> = ({start, end}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: `linear-gradient(to bottom, rgba(255,255,255,0) ${start}px, ${palette.white} ${end}px)`,
    }}
  />
);

const Viewport: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: STAGE_W, height: VIEW_H, overflow: 'hidden'}}>
    {children}
  </div>
);

/** An <Agent> placed by its head centre, in stage coordinates. */
const StageAgent: React.FC<{
  color: string;
  label: string;
  c: readonly [number, number];
  size: number;
  sceneStart: number;
  opacity?: number;
  direction?: 'left' | 'right';
  entryDelay?: number;
}> = ({color, label, c, size, sceneStart, opacity = 1, direction = 'right', entryDelay}) => (
  <div
    style={{
      position: 'absolute',
      left: c[0] - size / 2,
      top: c[1] - size / 2,
      width: size,
      height: size + 42,
      opacity,
    }}
  >
    <Agent
      color={color}
      label={label}
      x={0}
      y={0}
      size={size}
      direction={direction}
      delay={entryDelay ?? -sceneStart}
    />
  </div>
);

const Note: React.FC<{
  children: React.ReactNode;
  x?: number;
  y: number;
  width?: number;
  size?: number;
  weight?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  opacity?: number;
}> = ({children, x = 0, y, width, size = 26, weight = 750, color = palette.muted, align = 'left', opacity = 1}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width,
      fontFamily,
      fontSize: size,
      fontWeight: weight,
      color,
      textAlign: align,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
      opacity,
    }}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------ */
/* Shared geometry for the close-up scenes 1 and 2                     */
/* ------------------------------------------------------------------ */

const A1 = at(CAM_ONE, WA); // [408, 155.2]
const B1 = at(CAM_ONE, WB); // [1320, 155.2]
const CLOSE_SIZE = AGENT_W * CAM_ONE.s; // 140.8
const SIGHT_CLOSE = 92 * CAM_ONE.s; // 147.2

const ACTIONS = ['move', 'wait', 'pick up', 'place'] as const;
/** Two by two, to the right of the agent. */
const CELLS = [
  [818, 87],
  [1050, 87],
  [818, 165],
  [1050, 165],
] as const;
const CELL_W = 212;
const CELL_H = 58;

/** Where the chosen action ends up once it becomes a¹ₜ. */
const PILL_W = 190;
const PILL_A = 605;
const PILL_B = 933;
const PILL_Y = 126;
/** ... and where the two of them meet. */
const JOIN_A = 671;
const JOIN_B = 867;

const Chip: React.FC<{
  left: number;
  top: number;
  width: number;
  height: number;
  filled: boolean;
  color?: string;
  opacity?: number;
  children: React.ReactNode;
}> = ({left, top, width, height, filled, color = palette.blue, opacity = 1, children}) => (
  <div
    style={{
      position: 'absolute',
      left,
      top,
      width,
      height,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
      background: filled ? color : palette.paleBlue,
      color: filled ? palette.white : palette.muted,
      fontSize: 27,
      fontWeight: 850,
      fontFamily,
      opacity,
    }}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------ */
/* 0 — How do multiple agents learn to work together?                  */
/* ------------------------------------------------------------------ */

const moves = [
  {label: 'Understand the setting', color: chapterColors.Background},
  {label: 'Coordinate actions', color: chapterColors.Coordinate},
  {label: 'Communicate what matters', color: chapterColors.Communicate},
  {label: 'Adapt to new partners', color: chapterColors.Adapt},
] as const;

/**
 * The wide shot, and then the push-in. From frame 930 the four moves and the
 * guide leave, the two other cooks fade, and the camera closes on Agent A so
 * that the last frame of this scene is already the first frame of Policies.
 */
const Opening = () => {
  const f = useCurrentFrame();
  const push = ramp(f, 930, 1049);
  const cam = lerpCam(CAM_WIDE, CAM_ONE, push);
  const size = AGENT_W * cam.s;

  const roomIn = ramp(f, 0, 26);
  const roomOut = ramp(f, 930, 1049, 1, 0.3);
  const others = ramp(f, 900, 990, 1, 0);
  const side = ramp(f, 880, 950, 1, 0);

  return (
    <>
      <Viewport>
        <Room cam={cam} opacity={roomIn * roomOut} sceneStart={START[0]} />
        <Scrim start={ramp(f, 930, 1049, 480, 250)} end={ramp(f, 930, 1049, 560, 330)} />

        <StageAgent color={palette.blue} label="Agent A" c={at(cam, WA)} size={size} sceneStart={0} entryDelay={0} />
        <StageAgent
          color={palette.orange}
          label="Agent B"
          c={at(cam, WB)}
          size={size}
          sceneStart={0}
          entryDelay={14}
          direction="left"
          opacity={others}
        />
        <StageAgent
          color={palette.green}
          label="Agent C"
          c={at(cam, WC)}
          size={size}
          sceneStart={0}
          entryDelay={26}
          opacity={others}
        />
      </Viewport>

      <div style={{position: 'absolute', left: 1040, top: 30, width: 640, fontFamily, opacity: side}}>
        {moves.map((move, index) => {
          const p = ramp(f, 40 + index * 20, 62 + index * 20);
          return (
            <div
              key={move.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 22,
                height: 84,
                opacity: p,
                translate: `${(1 - p) * 26}px 0px`,
              }}
            >
              <div style={{width: 20, height: 20, borderRadius: '50%', background: move.color, flexShrink: 0}} />
              <div style={{fontSize: 34, fontWeight: 820, color: palette.ink, letterSpacing: '-0.02em'}}>
                {move.label}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{opacity: side}}>
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 1 — Policies                                                        */
/* ------------------------------------------------------------------ */

/**
 * Opens on exactly what the opening closed on: Agent A, close, in a kitchen
 * that has gone soft. The loop then forms around it — first what it senses,
 * then the policy, then the four things it could do.
 */
const Policy = () => {
  const f = useCurrentFrame();
  const cam = CAM_ONE;

  const sightIn = ramp(f, 30, 92);
  const arrowIn = ramp(f, 118, 168);
  // the sample settles on 'move' well before the cut, so scene 2 can pick the
  // same chip up and carry it
  const choice = f >= 960 ? 0 : Math.floor(Math.max(0, f - 250) / 45) % 4;

  return (
    <>
      <Viewport>
        <Room cam={cam} opacity={0.3} sight={92} sightOpacity={sightIn} sceneStart={START[1]} />
        <Scrim start={250} end={330} />
        <StageAgent color={palette.blue} label="Agent A" c={A1} size={CLOSE_SIZE} sceneStart={START[1]} />

        {/* the loop, drawn on top of the soft kitchen */}
        <svg style={{position: 'absolute', inset: 0}} viewBox={`0 0 ${STAGE_W} ${VIEW_H}`}>
          <path
            d={`M 574 ${A1[1]} L 776 ${A1[1]}`}
            stroke={palette.blue}
            strokeWidth={10}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={`${arrowIn} 1`}
          />
          <polygon points={`776,${A1[1] - 17} 810,${A1[1]} 776,${A1[1] + 17}`} fill={palette.blue} opacity={arrowIn} />
        </svg>
        <Note x={570} y={A1[1] - 58} width={210} align="center" size={26} opacity={arrowIn}>
          policy <span style={{color: palette.ink, fontWeight: 850}}>π</span>
        </Note>

        {ACTIONS.map((action, index) => (
          <Chip
            key={action}
            left={CELLS[index][0]}
            top={CELLS[index][1]}
            width={CELL_W}
            height={CELL_H}
            filled={choice === index}
            opacity={ramp(f, 170 + index * 16, 200 + index * 16)}
          >
            {action}
          </Chip>
        ))}
      </Viewport>

      <Note x={198} y={A1[1] + SIGHT_CLOSE + 4} width={420} align="center" size={27} opacity={sightIn}>
        <span style={{color: palette.blue, fontWeight: 900}}>oₜ</span> · what it can sense right now
      </Note>

      <div style={{position: 'absolute', left: 300, right: 300, top: 344}}>
        <Equation
          latex={'a_t \\sim \\pi(a_t \\mid o_t)'}
          note="The policy maps an observation to a distribution over actions"
          delay={344}
          size={52}
          terms={[
            {tex: 'o_t', is: 'what it sees'},
            {tex: '\\pi', is: 'the policy'},
            {tex: 'a_t', is: 'what it does'},
          ]}
        />
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 2 — What changes with a second agent?                               */
/* ------------------------------------------------------------------ */

/**
 * Nothing is cleared. Frame 0 is the last frame of Policies: the same agent,
 * the same sight circle, the same four chips with 'move' chosen, the same
 * equation. Then the chosen chip becomes a¹ₜ, the agent is duplicated into a
 * second one beside it, and the two private actions slide together into one
 * joint action the environment can receive.
 */
const MultiAgent = () => {
  const f = useCurrentFrame();
  const cam = CAM_ONE;

  const sight = ramp(f, 30, 100, 1, 0);
  const arrow = ramp(f, 45, 112, 1, 0);
  const others = ramp(f, 50, 105, 1, 0); // the three actions not taken
  const morph = ramp(f, 70, 155); // the chosen chip becomes a¹ₜ
  const twin = ramp(f, 150, 216); // Agent A is duplicated
  const twinIn = ramp(f, 150, 180);
  const pillB = ramp(f, 232, 282);
  const link = band(f, 240, 300, 452, 500);
  const join = ramp(f, 470, 574);
  const bracket = ramp(f, 574, 632);
  const jointLabel = ramp(f, 624, 668);

  // the chosen chip, on its way from the grid to being agent 1's action
  const chipLeft = interpolate(morph, [0, 1], [CELLS[0][0], PILL_A + (JOIN_A - PILL_A) * join]);
  const chipTop = interpolate(morph, [0, 1], [CELLS[0][1], PILL_Y]);
  const chipW = interpolate(morph, [0, 1], [CELL_W, PILL_W]);
  const pillBLeft = PILL_B + (JOIN_B - PILL_B) * join;

  const bColor = interpolateColors(twin, [0, 1], [palette.blue, palette.orange]);
  const bAt: [number, number] = [A1[0] + (B1[0] - A1[0]) * twin, A1[1]];

  const eq1 = ramp(f, 150, 206, 1, 0);
  const eq2 = band(f, 214, 262, 516, 562);
  const eq3 = band(f, 600, 652, 928, 972);
  const eq4 = band(f, 982, 1034, 1132, 1174);

  return (
    <>
      <Viewport>
        <Room cam={cam} opacity={0.3} sight={92} sightOpacity={sight} sceneStart={START[2]} />
        <Scrim start={250} end={330} />

        <StageAgent color={palette.blue} label="Agent A" c={A1} size={CLOSE_SIZE} sceneStart={START[2]} />
        <StageAgent
          color={bColor}
          label="Agent B"
          c={bAt}
          size={CLOSE_SIZE}
          sceneStart={START[2]}
          direction="left"
          opacity={twinIn}
        />

        <svg style={{position: 'absolute', inset: 0}} viewBox={`0 0 ${STAGE_W} ${VIEW_H}`}>
          {/* the policy arrow from Policies, retiring */}
          <g opacity={arrow}>
            <path d={`M 574 ${A1[1]} L 776 ${A1[1]}`} stroke={palette.blue} strokeWidth={10} strokeLinecap="round" />
            <polygon points={`776,${A1[1] - 17} 810,${A1[1]} 776,${A1[1] + 17}`} fill={palette.blue} />
          </g>

          {/* each agent still chooses privately */}
          <g opacity={link}>
            <path d={`M 492 ${A1[1]} L 596 ${A1[1]}`} stroke={palette.blue} strokeWidth={7} strokeLinecap="round" />
            <path d={`M 1246 ${A1[1]} L 1132 ${A1[1]}`} stroke={palette.orange} strokeWidth={7} strokeLinecap="round" />
          </g>

          {/* the joint action: one object, holding both choices */}
          <g opacity={bracket} stroke={palette.navy} strokeWidth={7} fill="none" strokeLinecap="round">
            <path d={`M 660 ${PILL_Y - 6} Q 634 ${A1[1]} 660 ${PILL_Y + CELL_H + 6}`} />
            <path d={`M 1068 ${PILL_Y - 6} Q 1094 ${A1[1]} 1068 ${PILL_Y + CELL_H + 6}`} />
          </g>
        </svg>

        <Note x={490} y={A1[1] - 54} width={108} align="center" size={24} opacity={link}>
          <span style={{color: palette.ink, fontWeight: 850}}>π¹</span>
        </Note>
        <Note x={1130} y={A1[1] - 54} width={108} align="center" size={24} opacity={link}>
          <span style={{color: palette.ink, fontWeight: 850}}>π²</span>
        </Note>

        {/* the three actions not taken, fading */}
        {ACTIONS.map((action, index) =>
          index === 0 ? null : (
            <Chip
              key={action}
              left={CELLS[index][0]}
              top={CELLS[index][1]}
              width={CELL_W}
              height={CELL_H}
              filled={false}
              opacity={others}
            >
              {action}
            </Chip>
          ),
        )}

        {/* the action that was taken, becoming agent 1's part of the pair */}
        <Chip left={chipLeft} top={chipTop} width={chipW} height={CELL_H} filled color={palette.blue}>
          <span style={{position: 'relative'}}>
            <span style={{opacity: 1 - morph}}>move</span>
            <span style={{position: 'absolute', left: 0, top: 0, width: '100%', textAlign: 'center', opacity: morph}}>
              a¹ₜ
            </span>
          </span>
        </Chip>

        <Chip left={pillBLeft} top={PILL_Y} width={PILL_W} height={CELL_H} filled color={palette.orange} opacity={pillB}>
          a²ₜ
        </Chip>

        <Note x={664} y={PILL_Y + CELL_H + 18} width={400} align="center" size={26} opacity={jointLabel}>
          one joint action
        </Note>
      </Viewport>

      <div style={{position: 'absolute', left: 300, right: 300, top: 344, opacity: eq1}}>
        <Equation
          latex={'a_t \\sim \\pi(a_t \\mid o_t)'}
          note="The policy maps an observation to a distribution over actions"
          delay={-60}
          size={52}
          terms={[
            {tex: 'o_t', is: 'what it sees'},
            {tex: '\\pi', is: 'the policy'},
            {tex: 'a_t', is: 'what it does'},
          ]}
        />
      </div>

      <div style={{position: 'absolute', left: 300, right: 300, top: 344, opacity: eq2}}>
        <Equation
          latex={'a_t^{\\,i} \\sim \\pi^{\\,i}(a_t^{\\,i} \\mid o_t^{\\,i})'}
          note="Each policy still chooses its own action, privately"
          delay={-60}
          size={54}
        />
      </div>

      <div style={{position: 'absolute', left: 240, right: 240, top: 344, opacity: eq3}}>
        <Equation
          latex={'\\mathbf{a}_t=(a_t^1,\\,a_t^2,\\,\\ldots,\\,a_t^n)'}
          note="The joint action: one choice from every agent, at the same moment"
          delay={-60}
          size={54}
        />
      </div>

      <div style={{position: 'absolute', left: 240, right: 240, top: 344, opacity: eq4}}>
        <Equation
          latex={'s_{t+1}\\sim P(\\,\\cdot \\mid s_t,\\ \\mathbf{a}_t)'}
          note="What happens next depends on the combination, not on any single action"
          delay={-60}
          size={48}
        />
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 3 — States and Observations                                         */
/* ------------------------------------------------------------------ */

/**
 * The generous assumption is that each agent can see what it needs to. The
 * camera pulls back off the same two agents until the whole kitchen is on
 * screen — that is the state — and then a wall goes up and the range closes
 * in, so the agents stay exactly where they were and lose their sight instead.
 */
const StateObservation = () => {
  const f = useCurrentFrame();

  const pull = ramp(f, 80, 290);
  const drift = ramp(f, 1236, 1330);
  const cam = drift > 0 ? lerpCam(CAM_STATE, CAM_TEAM, drift) : lerpCam(CAM_ONE, CAM_STATE, pull);
  const size = AGENT_W * cam.s;
  const a = at(cam, WA);
  const b = at(cam, WB);

  const carried = ramp(f, 30, 104, 1, 0); // the joint action from scene 2
  const roomUp = ramp(f, 80, 268, 0.3, 1);
  const wall = ramp(f, 430, 508);
  const sight = ramp(f, 452, 580, 60, 200);
  const sightO = ramp(f, 452, 560);
  const fog = ramp(f, 486, 610);
  const ready = ramp(f, 566, 616);
  const bDim = ramp(f, 506, 606, 1, 0.45);

  const scrim = 250 + 180 * pull + 46 * drift;

  const leftLabel = band(f, 300, 352, 1176, 1222);
  const rightLabel = band(f, 646, 700, 1176, 1222);
  const eq = band(f, 764, 822, 1176, 1222);

  return (
    <>
      <Viewport>
        <Room
          cam={cam}
          opacity={roomUp}
          wall={wall}
          fog={fog}
          sight={sight}
          sightOpacity={sightO}
          ready={ready}
          sceneStart={START[3]}
        />
        <Scrim start={scrim} end={scrim + 80} />

        <StageAgent color={palette.blue} label="Agent A" c={a} size={size} sceneStart={START[3]} />
        <StageAgent
          color={palette.orange}
          label="Agent B"
          c={b}
          size={size}
          sceneStart={START[3]}
          direction="left"
          opacity={bDim}
        />

        {/* the joint action carried in from scene 2, handed back */}
        <div style={{opacity: carried}}>
          <svg style={{position: 'absolute', inset: 0}} viewBox={`0 0 ${STAGE_W} ${VIEW_H}`}>
            <g stroke={palette.navy} strokeWidth={7} fill="none" strokeLinecap="round">
              <path d={`M 660 ${PILL_Y - 6} Q 634 ${A1[1]} 660 ${PILL_Y + CELL_H + 6}`} />
              <path d={`M 1068 ${PILL_Y - 6} Q 1094 ${A1[1]} 1068 ${PILL_Y + CELL_H + 6}`} />
            </g>
          </svg>
          <Chip left={JOIN_A} top={PILL_Y} width={PILL_W} height={CELL_H} filled color={palette.blue}>
            a¹ₜ
          </Chip>
          <Chip left={JOIN_B} top={PILL_Y} width={PILL_W} height={CELL_H} filled color={palette.orange}>
            a²ₜ
          </Chip>
          <Note x={664} y={PILL_Y + CELL_H + 18} width={400} align="center" size={26}>
            one joint action
          </Note>
        </div>
      </Viewport>

      <Note x={40} y={148} width={382} align="right" size={25} opacity={leftLabel}>
        <span style={{fontSize: 46, fontWeight: 900, color: palette.navy, letterSpacing: '-0.03em'}}>sₜ</span>
        <div style={{marginTop: 8}}>
          everything that is true: every location, every object, how far the task has got
        </div>
      </Note>

      <Note x={1322} y={148} width={370} align="left" size={25} opacity={rightLabel}>
        <span style={{fontSize: 46, fontWeight: 900, color: palette.blue, letterSpacing: '-0.03em'}}>oₜᴬ</span>
        <div style={{marginTop: 8}}>
          a slice of it: a limited range, and a wall in the way — so it never learns that Agent B's station is
          <span style={{color: palette.green, fontWeight: 900}}> ready</span>
        </div>
      </Note>

      <div style={{position: 'absolute', left: 320, right: 320, top: 428, opacity: eq}}>
        <Equation
          latex={'o_t^{\\,i}=O^{i}(s_t)'}
          note="Each agent receives a function of the state, never the state itself"
          delay={-60}
          size={48}
        />
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 4 — Shared Reward                                                   */
/* ------------------------------------------------------------------ */

const TEAM_A = at(CAM_TEAM, WA); // [579, 302]
const TEAM_B = at(CAM_TEAM, WB); // [1149, 302]
const TEAM_SIZE = AGENT_W * CAM_TEAM.s; // 88
const REWARD_FROM = [864, 112] as const;

/**
 * They see different things; what they share is the score. So the fog that
 * separated them lifts, and one number comes down onto both of them. The last
 * frame of the section is that picture: two agents, one shared reward.
 */
const SharedReward = () => {
  const f = useCurrentFrame();
  const cam = CAM_TEAM;

  const lift = ramp(f, 84, 178);
  const roomDown = ramp(f, 96, 200, 1, 0.14);
  const drop = ramp(f, 150, 218);
  const eq = band(f, 620, 686, 1092, 1136);
  const pulse = 1 + Math.sin(f / 14) * 0.025;

  const targets = [
    {c: TEAM_A, color: palette.blue},
    {c: TEAM_B, color: palette.orange},
  ] as const;

  // the same signal arriving again, and again
  const tick = ((f - 430) % 132) / 132;
  const travelling = f > 440 && tick < 0.62;

  return (
    <>
      <Viewport>
        <Room
          cam={cam}
          opacity={roomDown}
          wall={1 - lift}
          fog={1 - lift}
          sight={200}
          sightOpacity={1 - lift}
          ready={1 - lift}
          sceneStart={START[4]}
        />
        <Scrim start={476} end={556} />

        <StageAgent color={palette.blue} label="Agent A" c={TEAM_A} size={TEAM_SIZE} sceneStart={START[4]} />
        <StageAgent
          color={palette.orange}
          label="Agent B"
          c={TEAM_B}
          size={TEAM_SIZE}
          sceneStart={START[4]}
          direction="left"
          opacity={ramp(f, 84, 178, 0.45, 1)}
        />

        <svg style={{position: 'absolute', inset: 0}} viewBox={`0 0 ${STAGE_W} ${VIEW_H}`}>
          {targets.map((target, index) => {
            const p1 = [REWARD_FROM[0], 178] as const;
            const p2 = [target.c[0], 160] as const;
            const p3 = [target.c[0], 204] as const;
            const grow = ramp(f, 214 + index * 22, 300 + index * 22);
            const dot = cubic(REWARD_FROM, p1, p2, p3, Math.min(1, tick / 0.62));
            return (
              <g key={index}>
                <path
                  d={`M ${REWARD_FROM[0]} ${REWARD_FROM[1]} C ${p1[0]} ${p1[1]}, ${p2[0]} ${p2[1]}, ${p3[0]} ${p3[1]}`}
                  fill="none"
                  stroke={palette.green}
                  strokeWidth={9}
                  strokeLinecap="round"
                  opacity={0.5}
                  pathLength={1}
                  strokeDasharray={`${grow} 1`}
                />
                {travelling ? <circle cx={dot[0]} cy={dot[1]} r={11} fill={palette.green} /> : null}
              </g>
            );
          })}
        </svg>

        {targets.map((target, index) => (
          <Note
            key={index}
            x={target.c[0] - 70}
            y={210}
            width={140}
            align="center"
            size={34}
            weight={900}
            color={palette.green}
            opacity={ramp(f, 322 + index * 22, 384 + index * 22)}
          >
            +1
          </Note>
        ))}

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 44,
            translate: `-50% ${(1 - drop) * -110}px`,
            padding: '14px 40px',
            borderRadius: 999,
            background: palette.paleGreen,
            border: `3px solid ${palette.green}`,
            color: palette.green,
            fontSize: 38,
            fontWeight: 900,
            fontFamily,
            whiteSpace: 'nowrap',
            opacity: drop,
            scale: drop * pulse,
          }}
        >
          Team reward +1
        </div>
      </Viewport>

      <div style={{position: 'absolute', left: 280, right: 280, top: 410, opacity: eq}}>
        <Equation
          latex={'J(\\pi)=\\mathbb{E}\\!\\left[\\textstyle\\sum_{t=0}^{\\infty}\\gamma^{t}\\, r_t^{\\text{team}}\\right]'}
          note="Every agent maximizes the same expected discounted return"
          delay={-60}
          size={48}
        />
      </div>
    </>
  );
};

export const BackgroundVisuals: React.FC<{sceneIndex: number}> = ({sceneIndex}) => {
  switch (sceneIndex) {
    case 0: return <Opening />;
    case 1: return <Policy />;
    case 2: return <MultiAgent />;
    case 3: return <StateObservation />;
    default: return <SharedReward />;
  }
};
