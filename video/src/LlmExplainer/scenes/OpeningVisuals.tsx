import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {fontFamily, palette} from '../constants';
import {chapterColors} from '../../CoreExplainer/constants';
import {LlmAgent} from '../components/LlmAgent';

/**
 * OPENING — scenes 0 to 4.
 *
 * The content box is 1728 x 690 and it does NOT clip, so every coordinate in
 * this file is measured against that box and nothing is allowed past y ≈ 630.
 *
 * The five scenes deliberately use five different grammars so the section does
 * not read as one diagram restated:
 *
 *   0  a horizontal flow that multiplies      TASK → LLM → RESPONSE
 *   1  a vertical tree that specialises       one task, three agents, one output
 *   2  an authoring session                   a cursor wires two workflows by hand
 *   3  a closed loop                          the flow reverses and comes back
 *   4  a centre with three satellites         the course problems, in course colours
 *
 * Nothing here is a strongly bordered container: every block is a borderless
 * tinted fill, which keeps the frames under the two-border rule with room to
 * spare.
 */

const ease = Easing.bezier(0.16, 1, 0.3, 1);

const appear = (frame: number, at: number, over = 18) =>
  interpolate(frame, [at, at + over], [0, 1], {
    easing: ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** In at [a,b], out at [c,d]. For anything that is only true for a while. */
const windowed = (frame: number, a: number, b: number, c: number, d: number) =>
  interpolate(frame, [a, b, c, d], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const growIn = (frame: number, at: number, over = 20) =>
  interpolate(frame, [at, at + over], [0.9, 1], {
    easing: ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    output: 'perceptual-scale',
  });

/* ------------------------------------------------------------------ */
/* Shared drawing primitives                                           */
/* ------------------------------------------------------------------ */

/** A growing stroke. `pathLength=1` makes the dash fraction the progress. */
const Wire: React.FC<{
  d: string;
  color: string;
  from: number;
  to: number;
  width?: number;
  opacity?: number;
}> = ({d, color, from, to, width = 9, opacity = 1}) => {
  const frame = useCurrentFrame();
  const grow = interpolate(frame, [from, to], [0, 1], {
    easing: ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // A round cap on a zero-length dash paints a dot, so an unstarted wire has
  // to be absent rather than merely empty.
  if (grow <= 0.002) return null;
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={`${grow} 1`}
      opacity={opacity}
    />
  );
};

/** A short dash that runs along a path, for traffic on a finished wire. */
const Pulse: React.FC<{
  d: string;
  color: string;
  frame: number;
  period?: number;
  opacity?: number;
  width?: number;
  length?: number;
  phase?: number;
}> = ({d, color, frame, period = 90, opacity = 1, width = 11, length = 0.09, phase = 0}) => (
  <path
    d={d}
    fill="none"
    stroke={color}
    strokeWidth={width}
    strokeLinecap="round"
    pathLength={1}
    strokeDasharray={`${length} ${1 - length}`}
    strokeDashoffset={-(((frame / period + phase) % 1) * (1 + length)) + length}
    opacity={opacity}
  />
);

const Head: React.FC<{x: number; y: number; deg: number; color: string; show: number; s?: number}> = ({
  x,
  y,
  deg,
  color,
  show,
  s = 15,
}) => (
  <polygon
    points={`0,${-s} ${s * 1.5},0 0,${s}`}
    fill={color}
    opacity={show}
    transform={`translate(${x} ${y}) rotate(${deg})`}
  />
);

/** A borderless tinted block. The workhorse of this section. */
const Block: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  delay?: number;
  opacity?: number;
  radius?: number;
  children?: React.ReactNode;
  bump?: number;
}> = ({x, y, w, h, fill, delay = 0, opacity = 1, radius = 26, children, bump = 0}) => {
  const frame = useCurrentFrame();
  const p = appear(frame, delay, 20);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: radius,
        background: fill,
        opacity: p * opacity,
        scale: growIn(frame, delay, 20) + bump,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        padding: '0 18px',
        fontFamily,
      }}
    >
      {children}
    </div>
  );
};

const Caps: React.FC<{text: string; size?: number; color?: string; opacity?: number}> = ({
  text,
  size = 34,
  color = palette.ink,
  opacity = 1,
}) => (
  <div
    style={{
      fontSize: size,
      fontWeight: 900,
      letterSpacing: '0.055em',
      color,
      opacity,
      lineHeight: 1.06,
      textAlign: 'center',
      whiteSpace: 'nowrap',
    }}
  >
    {text}
  </div>
);

/* ================================================================== */
/* 0 — What Happens When LLMs Stop Working Alone?             (40s)    */
/* ------------------------------------------------------------------ */
/* One horizontal flow. The model in the middle duplicates once, then   */
/* again, and the three outputs end up pointing at the same result.     */
/* No robot in this scene: the transformation is the whole event.       */
/* ================================================================== */

const VERBS = ['reasons', 'writes', 'codes', 'calls a tool'];

const WorkingAlone = () => {
  const frame = useCurrentFrame();

  // The copies arrive at their own row rather than sliding out of the
  // original: a travelling clone passes straight through the original's
  // "LLM" label, and labels are not allowed to be sat on.
  const cyA = 265;
  const cyB = 440;
  const cyC = 90;

  const bAlive = appear(frame, 640, 34);
  const cAlive = appear(frame, 724, 34);
  const arc = windowed(frame, 430, 496, 592, 646);
  const chip = windowed(frame, 226, 258, 524, 562);
  const team = appear(frame, 846, 28);
  const solo = 1 - team;
  const ask = appear(frame, 930, 30);
  const verb = VERBS[Math.floor(Math.max(0, frame - 236) / 46) % VERBS.length];

  const inD = (cy: number) => `M 338 265 C 486 265, 566 ${cy}, 714 ${cy}`;
  const outD = (cy: number) => `M 864 ${cy} C 1042 ${cy}, 1166 265, 1372 265`;
  const arcD = 'M 1552 342 C 1552 470, 1290 476, 864 476 C 438 476, 176 470, 176 356';

  return (
    <>
      <Block x={26} y={200} w={306} h={130} fill={palette.paleBlue} delay={6}>
        <Caps text="TASK" size={40} />
        <div style={{fontSize: 22, fontWeight: 700, color: palette.muted, marginTop: 7}}>
          what we want solved
        </div>
      </Block>

      <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} viewBox="0 0 1728 690">
        <Wire d={inD(cyA)} color={palette.blue} from={24} to={70} />
        <Head x={714} y={cyA} deg={0} color={palette.blue} show={appear(frame, 58, 16)} />
        <Wire d={outD(cyA)} color={palette.blue} from={84} to={128} />
        <Head x={1372} y={265} deg={0} color={palette.blue} show={appear(frame, 116, 16)} />

        {bAlive > 0.01 ? (
          <g opacity={bAlive}>
            <Wire d={inD(cyB)} color={palette.blue} from={664} to={716} />
            <Head x={714} y={cyB} deg={0} color={palette.blue} show={appear(frame, 706, 16)} />
            <Wire d={outD(cyB)} color={palette.blue} from={704} to={758} />
          </g>
        ) : null}
        {cAlive > 0.01 ? (
          <g opacity={cAlive}>
            <Wire d={inD(cyC)} color={palette.blue} from={748} to={800} />
            <Head x={714} y={cyC} deg={0} color={palette.blue} show={appear(frame, 790, 16)} />
            <Wire d={outD(cyC)} color={palette.blue} from={788} to={842} />
          </g>
        ) : null}

        {/* evaluated on its own, against the task we set */}
        {arc > 0.01 ? (
          <g opacity={arc * 0.85}>
            <Wire d={arcD} color={palette.muted} from={430} to={520} width={6} />
            <Head x={176} y={354} deg={-90} color={palette.muted} show={appear(frame, 508, 16)} s={13} />
          </g>
        ) : null}

        {team > 0.02 ? (
          <g opacity={team}>
            <Pulse d={outD(cyA)} color={palette.blue} frame={frame} period={70} opacity={0.55} />
            <Pulse d={outD(cyB)} color={palette.blue} frame={frame} period={70} phase={0.33} opacity={0.55} />
            <Pulse d={outD(cyC)} color={palette.blue} frame={frame} period={70} phase={0.66} opacity={0.55} />
          </g>
        ) : null}
      </svg>

      <div
        style={{
          position: 'absolute',
          left: 620,
          top: 486,
          width: 490,
          textAlign: 'center',
          fontFamily,
          fontSize: 24,
          fontWeight: 750,
          color: palette.muted,
          opacity: arc,
        }}
      >
        evaluated on its own, against the task
      </div>

      <LlmAgent color={palette.blue} label="LLM" x={744} y={cyA - 56} size={112} delay={40} busy={frame > 210 && frame < 560} />
      <LlmAgent color={palette.blue} label="LLM" x={744} y={cyB - 56} size={112} delay={640} busy={frame > 760} />
      <LlmAgent color={palette.blue} label="LLM" x={744} y={cyC - 56} size={112} delay={724} busy={frame > 800} />

      {/* what the single model is doing, while it is the only one doing it */}
      <div
        style={{
          position: 'absolute',
          left: 650,
          top: 372,
          width: 300,
          display: 'flex',
          justifyContent: 'center',
          opacity: chip,
          fontFamily,
        }}
      >
        <div
          style={{
            padding: '10px 26px',
            borderRadius: 999,
            background: palette.paleBlue,
            color: palette.blue,
            fontSize: 27,
            fontWeight: 850,
            whiteSpace: 'nowrap',
          }}
        >
          {verb}
        </div>
      </div>

      {/* the destination: one response becomes one shared outcome */}
      <Block x={1398} y={200} w={306} h={130} fill={palette.paleBlue} delay={118}>
        <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: solo}}>
          <Caps text="RESPONSE" size={33} />
        </div>
        <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: team}}>
          <div>
            <Caps text="ONE SHARED" size={31} color={palette.blue} />
            <Caps text="OUTCOME" size={31} color={palette.blue} />
          </div>
        </div>
      </Block>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 578,
          textAlign: 'center',
          fontFamily,
          fontSize: 36,
          fontWeight: 850,
          letterSpacing: '-0.02em',
          color: palette.ink,
          opacity: ask,
          translate: `0px ${(1 - ask) * 14}px`,
        }}
      >
        How do we make the team intelligent — not just each model?
      </div>
    </>
  );
};

/* ================================================================== */
/* 1 — From One LLM to a Team                                 (35s)    */
/* ------------------------------------------------------------------ */
/* A vertical tree. One shared task at the top, three agents under it,  */
/* and a joint output that is visibly assembled from three pieces.      */
/* The activity under each agent is transient on purpose: the fixed     */
/* role names are scene 2's reveal, not this one's.                     */
/* ================================================================== */

const TEAM = [
  {cx: 400, color: palette.blue, label: 'LLM A', doing: 'works out what is being asked', at: 270, seg: 668},
  {cx: 864, color: palette.orange, label: 'LLM B', doing: 'proposes an implementation', at: 420, seg: 864},
  {cx: 1328, color: palette.purple, label: 'LLM C', doing: 'checks the result', at: 510, seg: 1060},
] as const;

const OneToTeam = () => {
  const frame = useCurrentFrame();
  const split = appear(frame, 185, 26);
  const one = 1 - split;
  const chips = windowed(frame, 260, 300, 590, 630);
  const closing = appear(frame, 840, 30);

  return (
    <>
      <Block x={604} y={0} w={520} h={104} fill={palette.paleBlue} delay={8}>
        <div
          style={{
            fontSize: 21,
            fontWeight: 900,
            letterSpacing: '0.14em',
            color: palette.blue,
          }}
        >
          SHARED TASK
        </div>
        <div style={{fontSize: 33, fontWeight: 850, color: palette.ink, letterSpacing: '-0.02em', marginTop: 4}}>
          fix the failing test suite
        </div>
      </Block>

      <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} viewBox="0 0 1728 690">
        <Wire d="M 864 112 L 864 158" color={palette.blue} from={44} to={84} width={8} />
        {TEAM.filter((t) => t.cx !== 864).map((t, i) => (
          <g key={t.label} opacity={split}>
            <Wire
              d={`M 864 112 C 864 146, ${t.cx} 132, ${t.cx} 158`}
              color={t.color}
              from={200 + i * 22}
              to={258 + i * 22}
              width={8}
            />
            <Head x={t.cx} y={158} deg={90} color={t.color} show={appear(frame, 250 + i * 22, 16)} s={13} />
          </g>
        ))}
        <Head x={864} y={158} deg={90} color={palette.blue} show={appear(frame, 76, 16)} s={13} />

        {/* three contributions heading for one place */}
        {TEAM.map((t, i) => (
          <g key={`${t.label}-down`}>
            <Wire
              d={`M ${t.cx} 356 C ${t.cx} 398, ${t.seg} 394, ${t.seg} 428`}
              color={t.color}
              from={636 + i * 16}
              to={696 + i * 16}
              width={8}
            />
            <Head x={t.seg} y={430} deg={90} color={t.color} show={appear(frame, 688 + i * 16, 16)} s={13} />
          </g>
        ))}
      </svg>

      {/* the single model, relabelled once it is one of three */}
      <div style={{position: 'absolute', inset: 0, opacity: one}}>
        <LlmAgent color={palette.blue} label="LLM" x={810} y={198} size={108} delay={60} busy={frame > 90 && frame < 200} />
      </div>
      <div style={{position: 'absolute', inset: 0, opacity: split}}>
        <LlmAgent
          color={palette.orange}
          label="LLM B"
          x={810}
          y={198}
          size={108}
          delay={60}
          busy={frame > 420 && frame < 620}
        />
      </div>
      {TEAM.filter((t) => t.cx !== 864).map((t, i) => (
        <div key={t.label} style={{position: 'absolute', inset: 0, opacity: split}}>
          <LlmAgent
            color={t.color}
            label={t.label}
            x={t.cx - 54}
            y={198}
            size={108}
            delay={190 + i * 22}
            busy={frame > t.at && frame < t.at + 170}
          />
        </div>
      ))}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 366,
          textAlign: 'center',
          fontFamily,
          fontSize: 26,
          fontWeight: 750,
          color: palette.muted,
          opacity: windowed(frame, 128, 160, 182, 214),
        }}
      >
        one model solves all of it
      </div>

      {/* transient activity, not a role: it arrives, then it is gone */}
      {TEAM.map((t) => (
        <div
          key={`${t.label}-doing`}
          style={{
            position: 'absolute',
            left: t.cx - 230,
            top: 358,
            width: 460,
            display: 'flex',
            justifyContent: 'center',
            opacity: chips * appear(frame, t.at, 22),
            fontFamily,
          }}
        >
          <div
            style={{
              padding: '9px 22px',
              borderRadius: 999,
              background: palette.paper,
              color: t.color,
              fontSize: 23,
              fontWeight: 820,
              whiteSpace: 'nowrap',
            }}
          >
            {t.doing}
          </div>
        </div>
      ))}

      {/* the slot the team is aiming at, visible while it is still empty */}
      <div
        style={{
          position: 'absolute',
          left: 572,
          top: 462,
          width: 576,
          height: 58,
          borderRadius: 18,
          background: '#E9F1F8',
          opacity: appear(frame, 300, 30),
        }}
      />

      {/* the joint output, visibly made of three pieces */}
      {TEAM.map((t, i) => {
        const p = appear(frame, 700 + i * 22, 40);
        return (
          <div
            key={`${t.label}-seg`}
            style={{
              position: 'absolute',
              left: interpolate(p, [0, 1], [t.cx - 96, t.seg - 96]),
              top: 462,
              width: 192,
              height: 58,
              borderRadius: i === 0 ? '18px 4px 4px 18px' : i === 2 ? '4px 18px 18px 4px' : 4,
              background: t.color,
              opacity: p * 0.9,
            }}
          />
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 532,
          textAlign: 'center',
          fontFamily,
          fontSize: 31,
          fontWeight: 900,
          letterSpacing: '0.055em',
          color: palette.ink,
          opacity: appear(frame, 306, 30) * (0.34 + 0.66 * appear(frame, 764, 26)),
        }}
      >
        JOINT OUTPUT
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 588,
          textAlign: 'center',
          fontFamily,
          fontSize: 30,
          fontWeight: 780,
          color: palette.muted,
          opacity: closing,
          translate: `0px ${(1 - closing) * 12}px`,
        }}
      >
        Two things now decide the answer: each model&rsquo;s ability, and how the pieces fit.
      </div>
    </>
  );
};

/* ================================================================== */
/* 2 — Who Designs the Collaboration?         (40s, heading at 13s)    */
/* ------------------------------------------------------------------ */
/* The subject is the cursor. It drops every node and drags every wire  */
/* of two different workflows, and it is still there at the end. The    */
/* nodes are plain role blocks rather than agent characters precisely   */
/* so the eye follows the hand doing the wiring.                        */
/* ================================================================== */

type Move = {at: number; to: [number, number]; over?: number};

const cursorAt = (frame: number, path: Move[]): [number, number] => {
  let x = path[0].to[0];
  let y = path[0].to[1];
  for (let i = 1; i < path.length; i++) {
    const m = path[i];
    const p = interpolate(frame, [m.at, m.at + (m.over ?? 24)], [0, 1], {
      easing: ease,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    x += (m.to[0] - x) * p;
    y += (m.to[1] - y) * p;
  }
  return [x, y];
};

/**
 * Every target below is a point the pointer can stand on without covering
 * anything: just under a block it has dropped, or in the gap it is dragging a
 * wire across. The pointer's body extends 46 x 62 down and to the right of the
 * coordinate given, which is what sets the clearances.
 */
const CURSOR_PATH: Move[] = [
  {at: 0, to: [34, 566]},
  {at: 6, to: [178, 186], over: 26},
  {at: 42, to: [742, 186], over: 22},
  {at: 74, to: [1306, 186], over: 22},
  {at: 108, to: [468, 130], over: 16},
  {at: 126, to: [660, 130], over: 26},
  {at: 156, to: [1032, 130], over: 16},
  {at: 174, to: [1224, 130], over: 26},
  {at: 208, to: [278, 486], over: 26},
  {at: 244, to: [778, 486], over: 22},
  {at: 276, to: [1062, 430], over: 14},
  {at: 292, to: [1190, 430], over: 26},
  {at: 322, to: [566, 408], over: 22},
  {at: 346, to: [700, 402], over: 20},
  {at: 368, to: [704, 452], over: 6},
  {at: 376, to: [578, 456], over: 18},
  {at: 404, to: [1602, 262], over: 44},
  // the sweep that says, again, where all of this came from
  {at: 792, to: [178, 186], over: 34},
  {at: 830, to: [742, 186], over: 24},
  {at: 858, to: [1306, 186], over: 24},
  {at: 886, to: [1268, 486], over: 22},
  {at: 912, to: [778, 486], over: 22},
  {at: 938, to: [278, 486], over: 24},
  {at: 976, to: [120, 536], over: 34},
];

const NODES = [
  {name: 'PLANNER', x: 150, y: 82, w: 300, at: 36, touch: 826},
  {name: 'CODER', x: 714, y: 82, w: 300, at: 68, touch: 854},
  {name: 'REVIEWER', x: 1278, y: 82, w: 300, at: 100, touch: 882},
  {name: 'PROPOSER', x: 250, y: 382, w: 300, at: 238, touch: 962},
  {name: 'CRITIC', x: 750, y: 382, w: 300, at: 270, touch: 934},
  {name: 'FINAL ANSWER', x: 1240, y: 382, w: 340, at: 320, touch: 908},
] as const;

const W1 = 'M 462 130 L 686 130';
const W2 = 'M 1026 130 L 1248 130';
const W3 = 'M 1062 430 L 1210 430';
const ARC_T = 'M 566 412 C 622 384, 678 384, 728 408';
const ARC_B = 'M 736 450 C 684 474, 626 474, 574 452';

const Pointer: React.FC<{x: number; y: number; opacity: number; halo: number}> = ({x, y, opacity, halo}) => (
  <div style={{position: 'absolute', left: x, top: y, opacity, zIndex: 30}}>
    {halo > 0.01 ? (
      <div
        style={{
          position: 'absolute',
          left: -34,
          top: -18,
          width: 108,
          height: 108,
          borderRadius: '50%',
          background: palette.blue,
          opacity: halo * 0.16,
        }}
      />
    ) : null}
    <svg width={46} height={62} viewBox="0 0 34 46" style={{overflow: 'visible'}}>
      <path
        d="M 3 2 L 3 36 L 12 28 L 18 43 L 25 40 L 19 25 L 31 25 Z"
        fill={palette.ink}
        stroke={palette.white}
        strokeWidth={3.4}
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

const WhoDesigns = () => {
  const frame = useCurrentFrame();
  const [cx, cy] = cursorAt(frame, CURSOR_PATH);
  const cursorIn = windowed(frame, 0, 14, 4000, 4001);
  const tag = Math.max(windowed(frame, 12, 30, 120, 150), windowed(frame, 800, 830, 1010, 1050));
  const halo = windowed(frame, 800, 840, 1000, 1050);
  const traffic = windowed(frame, 430, 480, 760, 800);

  const captions: {text: string; a: number; b: number; c: number; d: number}[] = [
    {text: 'We assign the roles.', a: 54, b: 86, c: 148, d: 176},
    {text: 'We decide who talks to whom, and in what order they take their turns.', a: 188, b: 220, c: 396, d: 422},
    {text: 'The models do collaborate, and the results can be good.', a: 440, b: 476, c: 748, d: 780},
    {text: 'But every block and every arrow was placed by hand.', a: 800, b: 836, c: 936, d: 964},
    {text: 'Orchestrated, or prompt-based — the underlying models are never changed.', a: 984, b: 1020, c: 1180, d: 1198},
  ];

  return (
    <>
      <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} viewBox="0 0 1728 690">
        {/* the ripple left behind wherever the cursor dropped something */}
        {NODES.map((n) => {
          const p = interpolate(frame, [n.at - 6, n.at + 24], [0, 1], {
            easing: ease,
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          if (p <= 0.001 || p >= 0.999) return null;
          return (
            <circle
              key={`${n.name}-ripple`}
              cx={n.x + n.w / 2}
              cy={n.y + 48}
              r={40 + p * 120}
              fill="none"
              stroke={palette.blue}
              strokeWidth={4}
              opacity={(1 - p) * 0.45}
            />
          );
        })}

        <Wire d={W1} color={palette.navy} from={126} to={152} />
        <Head x={690} y={130} deg={0} color={palette.navy} show={appear(frame, 146, 12)} />
        <Wire d={W2} color={palette.navy} from={174} to={200} />
        <Head x={1252} y={130} deg={0} color={palette.navy} show={appear(frame, 194, 12)} />

        <Wire d={ARC_T} color={palette.navy} from={346} to={366} width={8} />
        <Head x={720} y={406} deg={26} color={palette.navy} show={appear(frame, 362, 12)} s={13} />
        <Wire d={ARC_B} color={palette.navy} from={376} to={394} width={8} />
        <Head x={582} y={454} deg={202} color={palette.navy} show={appear(frame, 390, 12)} s={13} />

        <Wire d={W3} color={palette.navy} from={292} to={318} />
        <Head x={1214} y={430} deg={0} color={palette.navy} show={appear(frame, 312, 12)} />

        {traffic > 0.02 ? (
          <g opacity={traffic}>
            <Pulse d={W1} color={palette.blue} frame={frame} period={64} width={12} />
            <Pulse d={W2} color={palette.blue} frame={frame} period={64} phase={0.5} width={12} />
            <Pulse d={ARC_T} color={palette.blue} frame={frame} period={54} width={11} />
            <Pulse d={ARC_B} color={palette.blue} frame={frame} period={54} phase={0.5} width={11} />
            <Pulse d={W3} color={palette.blue} frame={frame} period={64} phase={0.25} width={12} />
          </g>
        ) : null}
      </svg>

      {NODES.map((n) => {
        const bump = interpolate(frame, [n.touch, n.touch + 8, n.touch + 26], [0, 0.055, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <Block key={n.name} x={n.x} y={n.y} w={n.w} h={96} fill={palette.paleBlue} delay={n.at} bump={bump}>
            <Caps text={n.name} size={n.name.length > 9 ? 31 : 34} />
          </Block>
        );
      })}

      <Pointer x={cx} y={cy} opacity={cursorIn} halo={halo} />
      <div
        style={{
          position: 'absolute',
          left: cx + 50,
          top: cy + 38,
          padding: '8px 20px',
          borderRadius: 999,
          background: palette.ink,
          color: palette.white,
          fontFamily,
          fontSize: 24,
          fontWeight: 850,
          letterSpacing: '0.02em',
          opacity: tag,
          zIndex: 31,
          whiteSpace: 'nowrap',
        }}
      >
        you
      </div>

      {captions.map((c) => (
        <div
          key={c.text}
          style={{
            position: 'absolute',
            left: 140,
            right: 140,
            top: 592,
            textAlign: 'center',
            fontFamily,
            fontSize: 30,
            fontWeight: 800,
            color: palette.ink,
            opacity: windowed(frame, c.a, c.b, c.c, c.d),
          }}
        >
          {c.text}
        </div>
      ))}
    </>
  );
};

/* ================================================================== */
/* 3 — Can Collaboration Be Learned?                          (35s)    */
/* ------------------------------------------------------------------ */
/* A closed loop. Left to right is what the team produces; the wide     */
/* green channel underneath is the reward coming back. The reversal of  */
/* direction is the point, so it gets the thickest stroke in the scene. */
/* ================================================================== */

const LEARN_AGENTS = [
  {cy: 90, color: palette.blue, was: 'PLANNER', now: 'LLM A'},
  {cy: 270, color: palette.orange, was: 'CODER', now: 'LLM B'},
  {cy: 450, color: palette.purple, was: 'REVIEWER', now: 'LLM C'},
] as const;

const RETURN_D =
  'M 1305 333 C 1305 500, 1292 606, 1140 606 L 196 606 C 92 606, 70 570, 70 470 L 70 90';

const CanItBeLearned = () => {
  const frame = useCurrentFrame();
  const ghost = windowed(frame, 0, 12, 46, 96);
  const roles = windowed(frame, 0, 10, 62, 116);
  const named = appear(frame, 66, 46);
  const back = appear(frame, 420, 60);
  const notLine = appear(frame, 540, 26);
  const butLine = appear(frame, 662, 26);

  return (
    <>
      <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} viewBox="0 0 1728 690">
        {/* forward: three contributions into one outcome */}
        <Wire d="M 272 90 C 400 90, 470 270, 574 270" color={palette.blue} from={116} to={182} />
        <Wire d="M 272 270 L 574 270" color={palette.orange} from={128} to={194} />
        <Wire d="M 272 450 C 400 450, 470 270, 574 270" color={palette.purple} from={140} to={206} />
        <Head x={576} y={270} deg={0} color={palette.navy} show={appear(frame, 196, 16)} />

        <Wire d="M 912 270 L 1112 270" color={palette.navy} from={214} to={262} />
        <Head x={1114} y={270} deg={0} color={palette.navy} show={appear(frame, 254, 14)} />

        {/* return: the same outcome, coming back as a signal */}
        <Wire d={RETURN_D} color={palette.green} from={300} to={430} width={13} />
        {LEARN_AGENTS.map((a, i) => (
          <g key={a.now}>
            <Wire
              d={`M 70 ${a.cy} L 120 ${a.cy}`}
              color={palette.green}
              from={422 + i * 14}
              to={462 + i * 14}
              width={13}
            />
            <Head x={124} y={a.cy} deg={0} color={palette.green} show={appear(frame, 452 + i * 14, 16)} s={16} />
          </g>
        ))}
        <circle cx={70} cy={270} r={11} fill={palette.green} opacity={back} />
        <circle cx={70} cy={450} r={11} fill={palette.green} opacity={back} />

        {back > 0.02 ? (
          <g opacity={back}>
            <Pulse d={RETURN_D} color={palette.green} frame={frame} period={120} width={15} length={0.07} />
            <Pulse
              d={RETURN_D}
              color={palette.green}
              frame={frame}
              period={120}
              phase={0.45}
              width={15}
              length={0.07}
              opacity={0.7}
            />
          </g>
        ) : null}
      </svg>

      {/* the hand-assigned names come off; the agents stay */}
      {LEARN_AGENTS.map((a, i) => (
        <div key={a.now}>
          <div style={{position: 'absolute', inset: 0, opacity: roles}}>
            <LlmAgent color={a.color} label={a.was} x={158} y={a.cy - 52} size={104} delay={0} />
          </div>
          <div style={{position: 'absolute', inset: 0, opacity: named}}>
            <LlmAgent
              color={a.color}
              label={a.now}
              x={158}
              y={a.cy - 52}
              size={104}
              delay={0}
              busy={frame > 470 + i * 20 && frame < 620 + i * 20}
            />
          </div>
        </div>
      ))}

      <Pointer x={330} y={296} opacity={ghost * 0.7} halo={0} />

      <Block x={600} y={215} w={300} h={110} fill={palette.paleBlue} delay={176}>
        <Caps text="JOINT" size={30} />
        <Caps text="OUTCOME" size={30} />
      </Block>

      <Block x={1140} y={215} w={330} h={110} fill={palette.paleGreen} delay={252}>
        <Caps text="SHARED" size={30} color={palette.green} />
        <Caps text="REWARD" size={30} color={palette.green} />
      </Block>

      <div
        style={{
          position: 'absolute',
          left: 430,
          top: 420,
          width: 860,
          fontFamily,
          fontSize: 28,
          fontWeight: 760,
          color: palette.muted,
          opacity: notLine * (1 - butLine * 0.5),
        }}
      >
        Not: how do we make each model better?
      </div>
      <div
        style={{
          position: 'absolute',
          left: 430,
          top: 478,
          width: 860,
          fontFamily,
          fontSize: 33,
          fontWeight: 880,
          letterSpacing: '-0.02em',
          color: palette.ink,
          opacity: butLine,
          translate: `0px ${(1 - butLine) * 12}px`,
        }}
      >
        But: how do we make them better together?
      </div>

    </>
  );
};

/* ================================================================== */
/* 4 — The Cooperative MARL Connection                        (35s)    */
/* ------------------------------------------------------------------ */
/* The team sits at the top and three problems from the first video     */
/* come in underneath it, each keeping the chapter colour it had there: */
/* orange for coordination, purple for communication, green for         */
/* adaptation. These are the scene's content, not a section badge.      */
/* ================================================================== */

/**
 * A rounded rectangle whose left and right corner radii are set separately, so
 * three of them placed edge to edge read as one bar with seams rather than as
 * three bars with gaps.
 */
const slab = (x: number, y: number, w: number, h: number, rl: number, rr: number) =>
  `M ${x + rl} ${y} H ${x + w - rr} A ${rr} ${rr} 0 0 1 ${x + w} ${y + rr} V ${y + h - rr} ` +
  `A ${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h} H ${x + rl} A ${rl} ${rl} 0 0 1 ${x} ${y + h - rl} ` +
  `V ${y + rl} A ${rl} ${rl} 0 0 1 ${x + rl} ${y} Z`;

const ART_W = 456;
const ART_H = 172;

const ConceptPanel: React.FC<{
  x: number;
  title: string;
  question: string;
  color: string;
  fill: string;
  delay: number;
  children: React.ReactNode;
}> = ({x, title, question, color, fill, delay, children}) => {
  const frame = useCurrentFrame();
  const p = appear(frame, delay, 24);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: 224,
        width: 520,
        height: 372,
        borderRadius: 32,
        background: fill,
        opacity: p,
        translate: `0px ${(1 - p) * 24}px`,
        fontFamily,
      }}
    >
      <div style={{position: 'absolute', left: 34, top: 28, fontSize: 33, fontWeight: 900, letterSpacing: '0.06em', color}}>
        {title}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 34,
          right: 34,
          top: 82,
          fontSize: 26,
          fontWeight: 700,
          lineHeight: 1.3,
          color: palette.ink,
          opacity: 0.78,
        }}
      >
        {question}
      </div>
      <div style={{position: 'absolute', left: 32, top: 168, width: ART_W, height: ART_H}}>{children}</div>
    </div>
  );
};

const artCaption = (text: string) => (
  <text x={228} y={148} textAnchor="middle" fontFamily={fontFamily} fontSize={21} fontWeight={750} fill={palette.muted}>
    {text}
  </text>
);

/** Three separate outputs sliding into one continuous result. */
const CoordinateArt: React.FC<{delay: number}> = ({delay}) => {
  const frame = useCurrentFrame();
  const p = appear(frame, delay + 16, 46);
  const sweep = ((frame - delay) % 130) / 130;
  const tones = [1, 0.7, 0.44];
  return (
    <svg width={ART_W} height={ART_H} viewBox={`0 0 ${ART_W} ${ART_H}`}>
      {[0, 1, 2].map((i) => {
        const fx = 42 + i * 124;
        const sx = [0, 166, 332][i];
        const sy = [-44, 0, 44][i];
        const x = interpolate(p, [0, 1], [sx, fx]);
        const y = interpolate(p, [0, 1], [32 + sy, 32]);
        return (
          <path
            key={i}
            d={slab(x, y, 124, 62, i === 0 ? 18 : 3, i === 2 ? 18 : 3)}
            fill={chapterColors.Coordinate}
            opacity={tones[i]}
          />
        );
      })}
      {p > 0.98 ? (
        <path d={slab(42 + sweep * 316, 32, 56, 62, 6, 6)} fill={palette.white} opacity={0.3} />
      ) : null}
      {artCaption('three outputs, one result')}
    </svg>
  );
};

/** Something being sent, and the fact that sending is not free. */
const CommunicateArt: React.FC<{delay: number}> = ({delay}) => {
  const frame = useCurrentFrame();
  const t = (Math.sin((frame - delay) / 26) + 1) / 2;
  return (
    <svg width={ART_W} height={ART_H} viewBox={`0 0 ${ART_W} ${ART_H}`}>
      <line
        x1={122}
        y1={63}
        x2={334}
        y2={63}
        stroke={chapterColors.Communicate}
        strokeWidth={5}
        strokeDasharray="10 13"
        opacity={0.4}
      />
      <rect x={38} y={25} width={76} height={76} rx={24} fill={chapterColors.Communicate} />
      <rect x={342} y={25} width={76} height={76} rx={24} fill={chapterColors.Communicate} opacity={0.62} />
      <g transform={`translate(${124 + t * 188} 44)`}>
        <rect x={0} y={0} width={100} height={40} rx={18} fill={chapterColors.Communicate} />
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={26 + i * 24} cy={20} r={5} fill={palette.white} opacity={0.92} />
        ))}
      </g>
      {artCaption('every message costs tokens')}
    </svg>
  );
};

/** The partner on the other end is not the one you trained with. */
const AdaptArt: React.FC<{delay: number}> = ({delay}) => {
  const frame = useCurrentFrame();
  const swap = (Math.sin((frame - delay) / 30) + 1) / 2;
  return (
    <svg width={ART_W} height={ART_H} viewBox={`0 0 ${ART_W} ${ART_H}`}>
      <path
        d="M 126 63 C 190 26, 268 26, 330 63"
        fill="none"
        stroke={chapterColors.Adapt}
        strokeWidth={6}
        strokeLinecap="round"
        opacity={0.32 + swap * 0.42}
      />
      <rect x={44} y={25} width={76} height={76} rx={24} fill={chapterColors.Adapt} />
      <circle cx={374} cy={63} r={52} fill="none" stroke={chapterColors.Adapt} strokeWidth={4} strokeDasharray="9 11" opacity={0.5} />
      <rect x={336} y={25} width={76} height={76} rx={24} fill={chapterColors.Adapt} opacity={(1 - swap) * 0.75} />
      <circle cx={374} cy={63} r={38} fill={palette.navy} opacity={swap * 0.8} />
      {artCaption('the partner can change')}
    </svg>
  );
};

const MarlConnection = () => {
  const frame = useCurrentFrame();
  const first = windowed(frame, 24, 54, 786, 816);
  const last = appear(frame, 830, 30);
  const settle = interpolate(frame, [148, 214], [0, 1], {
    easing: ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const size = 148 - 56 * settle;
  const teamCy = 214 - 152 * settle;

  const panels = [
    {x: 48, delay: 210, cx: 308},
    {x: 604, delay: 396, cx: 864},
    {x: 1160, delay: 600, cx: 1420},
  ];

  return (
    <>
      {/* The team owns the frame while it is the only thing in it, then settles
          into a header as the three questions arrive underneath. */}
      {[0, 1, 2].map((i) => (
        <LlmAgent
          key={i}
          color={palette.blue}
          x={864 + (i - 1) * (204 - 40 * settle) - size / 2}
          y={teamCy - size / 2}
          size={size}
          delay={6 + i * 9}
          busy={Math.floor(frame / 44) % 3 === i}
        />
      ))}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: teamCy + size / 2 + 16,
          textAlign: 'center',
          fontFamily,
          fontSize: 25,
          fontWeight: 820,
          letterSpacing: '0.1em',
          color: palette.muted,
          opacity: first,
        }}
      >
        AN LLM TEAM
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 118,
          textAlign: 'center',
          fontFamily,
          fontSize: 30,
          fontWeight: 800,
          color: palette.ink,
          opacity: last,
          translate: `0px ${(1 - last) * 10}px`,
        }}
      >
        Language models now, not gridworld robots. The cooperative problems are the same.
      </div>

      <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} viewBox="0 0 1728 690">
        {panels.map((p, i) => (
          <Wire
            key={p.cx}
            d={p.cx === 864 ? 'M 864 178 L 864 218' : `M 864 178 V 194 H ${p.cx} V 218`}
            color={[chapterColors.Coordinate, chapterColors.Communicate, chapterColors.Adapt][i]}
            from={p.delay - 26}
            to={p.delay + 14}
            width={6}
            opacity={0.55}
          />
        ))}
      </svg>

      <ConceptPanel
        x={panels[0].x}
        delay={panels[0].delay}
        title="COORDINATE"
        question="How should their separate outputs fit together?"
        color={chapterColors.Coordinate}
        fill={palette.paleOrange}
      >
        <CoordinateArt delay={panels[0].delay} />
      </ConceptPanel>

      <ConceptPanel
        x={panels[1].x}
        delay={panels[1].delay}
        title="COMMUNICATE"
        question="What information should the agents exchange?"
        color={chapterColors.Communicate}
        fill={palette.palePurple}
      >
        <CommunicateArt delay={panels[1].delay} />
      </ConceptPanel>

      <ConceptPanel
        x={panels[2].x}
        delay={panels[2].delay}
        title="ADAPT"
        question="What happens when the other agents change?"
        color={chapterColors.Adapt}
        fill={palette.paleGreen}
      >
        <AdaptArt delay={panels[2].delay} />
      </ConceptPanel>
    </>
  );
};

/* ------------------------------------------------------------------ */

export const OpeningVisuals: React.FC<{sceneIndex: number}> = ({sceneIndex}) => {
  switch (sceneIndex) {
    case 0:
      return <WorkingAlone />;
    case 1:
      return <OneToTeam />;
    case 2:
      return <WhoDesigns />;
    case 3:
      return <CanItBeLearned />;
    case 4:
      return <MarlConnection />;
    default:
      return <MarlConnection />;
  }
};
