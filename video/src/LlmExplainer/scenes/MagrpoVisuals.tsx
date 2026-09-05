import katex from 'katex';
import {Easing, interpolate, interpolateColors, useCurrentFrame} from 'remotion';
import {fontFamily, palette} from '../constants';
import {LlmAgent} from '../components/LlmAgent';

/**
 * THE MAGRPO SECTION, scenes 8-11.
 *
 *   08  MAGRPO: Learning from Joint Behaviours   one attempt becomes a group, and the group becomes a chart
 *   09  Group-Relative Advantage                 the same chart, measured, with the maths built onto it
 *   10  Train Together, Act Independently        that advantage collapses into a training loop, which dissolves
 *   11  Beyond One Algorithm                     the surviving lanes become one branch of two
 *
 * CONTINUITY. The shell no longer fades between scenes, so every boundary is a
 * cut and every cut is a contract. Each scene here opens on the previous
 * scene's last frame and transforms it:
 *
 *   9149 -> 9150   the Formalism section's joint behaviour and its +1 reward
 *                  are reproduced exactly, then the credit question falls away
 *                  and that single attempt duplicates into a group of four.
 *   10499 -> 10500 bars, mean line, ticks, joint actions, the illustrative note
 *                  and both agents are pixel-identical; the maths then arrives
 *                  in the space the agents vacate.
 *   11849 -> 11850 the whole advantage tableau is reproduced and then collapses
 *                  into the CENTRALIZED ADVANTAGE block of the training loop.
 *   12749 -> 12750 the two execution lanes are reproduced and then contract
 *                  into the MAGRPO branch.
 *
 * The numeral hand-off across 10499/10500 is exact because scene 08's flying
 * returns and scene 09's resting returns are the SAME component at the SAME
 * coordinates (`ValueNumeral`, landing at `BAR_X[i]`, `VALUE_TOP`).
 *
 * SOURCING. Two papers, both checked at the publisher, and nothing else:
 *
 *   Liu, Liang, Lyu & Amato, AAAI-26. Proposes MAGRPO. Dec-POMDP formulation,
 *     evaluated on writing and coding. Obtains a centralized advantage from
 *     group-based Monte Carlo returns WITHOUT training a separate large
 *     centralized value model — which is why the group baseline exists, and
 *     why that sentence and its struck-through ghost are on scene 09.
 *   Park et al., ACL 2025. MAPoRL. Agents generate, then discuss, then a
 *     verifier scores the final result; those scores are the reward for
 *     multi-agent RL.
 *
 * THE FOUR RETURNS ARE ILLUSTRATIVE. The word "illustrative" is fully opaque
 * before the first numeral is lit and stays opaque, in one place or another,
 * for every frame on which a numeral appears. No other number is invented
 * anywhere in this file: no accuracy, no benchmark, no comparison between the
 * two methods.
 *
 * The content box is 1728 x 690 and does NOT clip. Nothing sits below y = 640.
 */

const CONTENT_W = 1728;
const CONTENT_H = 690;

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const MOVE = Easing.bezier(0.45, 0, 0.2, 1);

const fade = (frame: number, at: number, dur = 22) =>
  interpolate(frame, [at, at + dur], [0, 1], {
    easing: EASE,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const travel = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], {
    easing: MOVE,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ------------------------------------------------------------------ */
/* Local primitives. None of them draws a border.                      */
/* ------------------------------------------------------------------ */

/** Inline maths on white. No card, no rail, no border. */
const Tex: React.FC<{tex: string; size?: number; color?: string}> = ({
  tex,
  size = 30,
  color = palette.ink,
}) => (
  <span
    style={{fontSize: size, color, lineHeight: 1}}
    dangerouslySetInnerHTML={{__html: katex.renderToString(tex, {throwOnError: false})}}
  />
);

/** A line of type placed straight onto the white. */
const Note: React.FC<{
  children: React.ReactNode;
  x?: number;
  y: number;
  width?: number;
  size?: number;
  weight?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  track?: string;
  opacity?: number;
  lineHeight?: number;
}> = ({
  children,
  x = 0,
  y,
  width,
  size = 22,
  weight = 750,
  color = palette.muted,
  align = 'left',
  track = '-0.01em',
  opacity = 1,
  lineHeight = 1.3,
}) => (
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
      letterSpacing: track,
      lineHeight,
      opacity,
    }}
  >
    {children}
  </div>
);

/** A small tracked heading, the kind that labels a diagram column. */
const ColumnLabel: React.FC<{
  children: React.ReactNode;
  x: number;
  y: number;
  width: number;
  opacity: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
}> = ({children, x, y, width, opacity, color = palette.muted, align = 'center'}) => (
  <Note
    x={x}
    y={y}
    width={width}
    align={align}
    size={19}
    weight={880}
    color={color}
    track="0.18em"
    opacity={opacity}
  >
    {children}
  </Note>
);

/** A tinted, borderless block. Fills do the grouping; borders are not used. */
const Block: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  tint: string;
  color?: string;
  size?: number;
  opacity?: number;
  radius?: number;
  label: React.ReactNode;
}> = ({x, y, w, h, tint, color = palette.ink, size = 25, opacity = 1, radius = 22, label}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: radius,
      background: tint,
      display: 'grid',
      placeItems: 'center',
      fontFamily,
      opacity,
    }}
  >
    <div
      style={{
        fontSize: size,
        fontWeight: 880,
        color,
        letterSpacing: '-0.015em',
        textAlign: 'center',
        lineHeight: 1.18,
        padding: '0 18px',
      }}
    >
      {label}
    </div>
  </div>
);

/**
 * The Formalism section's block, reproduced so scene 08 can open on its exact
 * final frame. Same geometry, same radius, same weight.
 */
const CarriedChip: React.FC<{
  x: number;
  y: number;
  w: number;
  h?: number;
  text: string;
  fill: string;
  size?: number;
  opacity: number;
}> = ({x, y, w, h = 68, text, fill, size = 27, opacity}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 18,
      background: fill,
      display: 'grid',
      placeItems: 'center',
      fontFamily,
      fontSize: size,
      fontWeight: 900,
      letterSpacing: '0.06em',
      color: palette.ink,
      opacity,
    }}
  >
    {text}
  </div>
);

/* ------------------------------------------------------------------ */
/* The joint action, and the chart it turns into.                      */
/* One definition each, shared by every scene that shows them, so two  */
/* scenes cannot disagree about where anything sits.                   */
/* ------------------------------------------------------------------ */

const CHIP_W = 130;
const CHIP_H = 26;
const BACK_W = 292;
const BACK_H = 42;
const BACK_TINT = '#E6EFF8';

/** ILLUSTRATIVE sample returns. Not measurements, not from any paper. */
const RETURNS = [0.8, 0.3, 0.9, 0.5];
const MEAN = RETURNS.reduce((a, b) => a + b, 0) / RETURNS.length; // 0.625

const BAR_W = 140;
const BAR_X = [269, 619, 969, 1319];
const BASE_Y = 552;
const SCALE = 240;
const AXIS_X0 = 200;
const AXIS_X1 = 1600;

const topOf = (v: number) => BASE_Y - v * SCALE; // 360, 480, 336, 432
const MEAN_Y = topOf(MEAN); // 402
const centerOf = (i: number) => BAR_X[i] + BAR_W / 2; // 339, 689, 1039, 1389

/** Where a joint action parks once its return has been charted. */
const CAP_CHART_TOP = 248;
const capChartLeft = (i: number) => centerOf(i) - BACK_W / 2;

/**
 * The number sits at the foot of its bar, clear of the mean line. Scene 08
 * flies a numeral to exactly this box and scene 09 draws one in it, using the
 * same component, so nothing shifts across the cut.
 */
const VALUE_TOP = BASE_Y - 46;

const ValueNumeral: React.FC<{
  v: number;
  left: number;
  top: number;
  color: string;
  opacity: number;
}> = ({v, left, top, color, opacity}) => (
  <div
    style={{
      position: 'absolute',
      left,
      top,
      width: BAR_W,
      textAlign: 'center',
      fontFamily,
      fontSize: 32,
      fontWeight: 900,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
      color,
      opacity,
    }}
  >
    {v.toFixed(1)}
  </div>
);

const Capsule: React.FC<{left: number; top: number; opacity: number}> = ({left, top, opacity}) => (
  <div
    style={{
      position: 'absolute',
      left,
      top,
      width: BACK_W,
      height: BACK_H,
      borderRadius: BACK_H / 2,
      background: BACK_TINT,
      opacity,
    }}
  >
    <div
      style={{
        position: 'absolute',
        left: 12,
        top: 8,
        width: CHIP_W,
        height: CHIP_H,
        borderRadius: CHIP_H / 2,
        background: palette.blue,
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 150,
        top: 8,
        width: CHIP_W,
        height: CHIP_H,
        borderRadius: CHIP_H / 2,
        background: palette.orange,
      }}
    />
  </div>
);

type ChartSchedule = {
  axisAt: number;
  growFrom: number;
  growStep: number;
  growDur: number;
  labelsAt: number;
  meanAt: number;
  meanDur: number;
  noteAt: number;
  /** Scene 08 flies its own numerals in; every other scene draws them at rest. */
  values: boolean;
  aboveAt?: number;
  belowAt?: number;
};

const barWindow = (s: ChartSchedule, i: number): [number, number] => [
  s.growFrom + i * s.growStep,
  s.growFrom + i * s.growStep + s.growDur,
];

const ReturnChart: React.FC<{s: ChartSchedule; opacity?: number}> = ({s, opacity = 1}) => {
  const frame = useCurrentFrame();
  const axis = fade(frame, s.axisAt, 26);
  const mean = travel(frame, s.meanAt, s.meanAt + s.meanDur);
  const above = s.aboveAt === undefined ? 0 : fade(frame, s.aboveAt, 26);
  const below = s.belowAt === undefined ? 0 : fade(frame, s.belowAt, 26);

  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      <svg
        style={{position: 'absolute', left: 0, top: 0, width: CONTENT_W, height: CONTENT_H}}
        viewBox={`0 0 ${CONTENT_W} ${CONTENT_H}`}
      >
        <path
          d={`M${AXIS_X0} ${BASE_Y} H${AXIS_X1}`}
          stroke="#C3D7E8"
          strokeWidth={3}
          strokeLinecap="round"
          opacity={axis > 0 ? 1 : 0}
          pathLength={1}
          strokeDasharray={`${axis} 1`}
        />

        {RETURNS.map((v, i) => {
          const [a, b] = barWindow(s, i);
          const grow = interpolate(frame, [a, b], [0, 1], {
            easing: EASE,
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const h = (BASE_Y - topOf(v)) * grow;
          return (
            <rect
              key={`bar-${i}`}
              x={BAR_X[i]}
              y={BASE_Y - h}
              width={BAR_W}
              height={h}
              rx={10}
              fill={palette.purple}
            />
          );
        })}

        {/* attempt 3 stands above the group reference: the surplus, in green */}
        <g opacity={above}>
          <rect
            x={BAR_X[2]}
            y={topOf(RETURNS[2])}
            width={BAR_W}
            height={MEAN_Y - topOf(RETURNS[2])}
            rx={10}
            fill={palette.green}
          />
          <path
            d={`M${BAR_X[2] + BAR_W + 14} ${topOf(RETURNS[2])} H${BAR_X[2] + BAR_W + 32} M${
              BAR_X[2] + BAR_W + 23
            } ${topOf(RETURNS[2])} V${MEAN_Y} M${BAR_X[2] + BAR_W + 14} ${MEAN_Y} H${
              BAR_X[2] + BAR_W + 32
            }`}
            stroke={palette.green}
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* attempt 2 falls short of it: the shortfall, hollow and red */}
        <g opacity={below}>
          <rect
            x={BAR_X[1]}
            y={MEAN_Y}
            width={BAR_W}
            height={topOf(RETURNS[1]) - MEAN_Y}
            rx={10}
            fill={palette.red}
            opacity={0.15}
          />
          <rect
            x={BAR_X[1]}
            y={MEAN_Y}
            width={BAR_W}
            height={topOf(RETURNS[1]) - MEAN_Y}
            rx={10}
            fill="none"
            stroke={palette.red}
            strokeWidth={3}
            strokeDasharray="9 8"
          />
          <path
            d={`M${BAR_X[1] - 32} ${MEAN_Y} H${BAR_X[1] - 14} M${BAR_X[1] - 23} ${MEAN_Y} V${topOf(
              RETURNS[1],
            )} M${BAR_X[1] - 32} ${topOf(RETURNS[1])} H${BAR_X[1] - 14}`}
            stroke={palette.red}
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {mean > 0 ? (
          <g>
            <path
              d={`M${AXIS_X0} ${MEAN_Y} H${AXIS_X0 + (AXIS_X1 - AXIS_X0) * mean}`}
              stroke={palette.white}
              strokeWidth={11}
              strokeLinecap="round"
              opacity={0.92}
            />
            <path
              d={`M${AXIS_X0} ${MEAN_Y} H${AXIS_X0 + (AXIS_X1 - AXIS_X0) * mean}`}
              stroke={palette.ink}
              strokeWidth={3.5}
              strokeDasharray="15 12"
              strokeLinecap="round"
            />
          </g>
        ) : null}
      </svg>

      {s.values
        ? RETURNS.map((v, i) => (
            <ValueNumeral
              key={`val-${i}`}
              v={v}
              left={BAR_X[i]}
              top={VALUE_TOP}
              color={palette.white}
              opacity={fade(frame, barWindow(s, i)[1] - 18, 20)}
            />
          ))
        : null}

      {RETURNS.map((_, i) => (
        <ColumnLabel
          key={`tick-${i}`}
          x={BAR_X[i] - 40}
          y={BASE_Y + 18}
          width={BAR_W + 80}
          opacity={fade(frame, s.labelsAt + i * 18, 22)}
        >
          ATTEMPT {i + 1}
        </ColumnLabel>
      ))}

      <Note
        x={0}
        y={MEAN_Y - 13}
        width={AXIS_X0 - 24}
        align="right"
        size={23}
        weight={880}
        color={palette.ink}
        opacity={fade(frame, s.meanAt + s.meanDur - 30, 26)}
      >
        group mean
      </Note>

      <Note
        x={0}
        y={BASE_Y + 60}
        width={CONTENT_W}
        align="center"
        size={22}
        weight={720}
        color={palette.muted}
        opacity={fade(frame, s.noteAt, 26) * 0.95}
      >
        illustrative sample returns, one per joint behaviour in the group
      </Note>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* 08 — MAGRPO: Learning from Joint Behaviours                         */
/*                                                                     */
/* Opens on the Formalism section's closing frame: two agents, a plan, */
/* an implementation, a program, a passing test run and one +1. The    */
/* three competing explanations fall away, that single joint behaviour */
/* compacts into one capsule, and then the agents sample three more    */
/* of them. Four whole-team attempts get four returns, and the returns */
/* carry themselves down into the chart scene 09 opens on.             */
/* ------------------------------------------------------------------ */

const ROW_TOP = (i: number) => 96 + i * 64; // 96, 160, 224, 288
const ROW_CY = (i: number) => ROW_TOP(i) + BACK_H / 2;
const ROW_BACK_X = 232;
const SCORE_CX = 1480; // exactly where the Formalism section put its +1
const LEAD_X0 = 796;
const LEAD_X1 = 1420;

const flyWindow = (i: number): [number, number] => [960 + i * 55, 1050 + i * 55];

/** The three explanations the previous scene left open, reproduced to be let go. */
const OPTIONS = [
  {tint: palette.blue, title: 'Was the plan responsible?', sub: 'the implementation merely executed it'},
  {
    tint: palette.orange,
    title: 'Did the implementation correct a weak plan?',
    sub: 'the plan was the weaker contribution',
  },
  {tint: palette.navy, title: 'Was neither useful without the other?', sub: 'only the combination did anything'},
];

const CHART_08: ChartSchedule = {
  axisAt: 900,
  growFrom: 960,
  growStep: 55,
  growDur: 90,
  labelsAt: 1180,
  meanAt: 1210,
  meanDur: 100,
  noteAt: 860,
  values: false,
};

const Magrpo = () => {
  const frame = useCurrentFrame();

  /* the credit question is answered by a different idea, so it goes first */
  const question = 1 - fade(frame, 8, 40);
  /* the environment that produced the reward becomes implicit */
  const chain = 1 - fade(frame, 70, 60);
  const feed = 1 - fade(frame, 80, 40);
  /* plan + implementation compact into one joint action */
  const merge = travel(frame, 80, 200);
  const rewardMove = travel(frame, 200, 262);
  const rewardGone = 1 - fade(frame, 250, 30);
  /* the row furniture goes once the chart takes over */
  const rows = 1 - fade(frame, 880, 70);
  const agentMove = travel(frame, 880, 960);

  const agentX = lerp(40, 20, agentMove);
  const agentAY = lerp(60, 8, agentMove);
  const agentBY = lerp(280, 148, agentMove);
  const agentSize = lerp(92, 80, agentMove);

  /* where each row's capsule is right now */
  const backOf = (i: number) => {
    const fly = travel(frame, flyWindow(i)[0], flyWindow(i)[1]);
    return {
      left: lerp(ROW_BACK_X, capChartLeft(i), fly),
      top: lerp(ROW_TOP(i), CAP_CHART_TOP, fly),
      fly,
    };
  };

  const chipArrive = (i: number) => (i === 0 ? merge : travel(frame, 400 + (i - 1) * 50, 480 + (i - 1) * 50));

  return (
    <>
      {/* ---------- carried in from 9149, then released ---------- */}
      <svg
        style={{position: 'absolute', left: 0, top: 0, width: CONTENT_W, height: CONTENT_H}}
        viewBox={`0 0 ${CONTENT_W} ${CONTENT_H}`}
      >
        {[106, 326].map((y) => (
          <g key={y} opacity={feed}>
            <path d={`M140 ${y} H198`} fill="none" stroke="#8FA6BC" strokeWidth={6} strokeLinecap="round" />
            <path d={`M198 ${y - 14} L218 ${y} L198 ${y + 14} z`} fill="#8FA6BC" />
          </g>
        ))}
        <g opacity={chain}>
          <path
            d="M522 106 C 606 106, 606 194, 674 200"
            fill="none"
            stroke={palette.blue}
            strokeWidth={7}
            strokeLinecap="round"
            opacity={0.75}
          />
          <path d="M676 186 L698 201 L676 214 z" fill={palette.blue} opacity={0.8} />
          <path
            d="M522 326 C 606 326, 606 238, 674 232"
            fill="none"
            stroke={palette.orange}
            strokeWidth={7}
            strokeLinecap="round"
            opacity={0.75}
          />
          <path d="M676 218 L698 231 L676 246 z" fill={palette.orange} opacity={0.8} />
          <path d="M988 216 H1030" fill="none" stroke="#8FA6BC" strokeWidth={6} strokeLinecap="round" />
          <path d="M1030 202 L1050 216 L1030 230 z" fill="#8FA6BC" />
          <path d="M1338 216 H1386" fill="none" stroke={palette.green} strokeWidth={6} strokeLinecap="round" />
          <path d="M1386 202 L1406 216 L1386 230 z" fill={palette.green} />
        </g>

        {/* each attempt's lead line out to its return */}
        <defs>
          <clipPath id="mg8none">
            <rect x={0} y={0} width={CONTENT_W} height={CONTENT_H} />
          </clipPath>
        </defs>
        {RETURNS.map((_, i) => {
          const draw = travel(frame, 660 + i * 22, 704 + i * 22);
          return (
            <g key={`lead-${i}`} opacity={rows}>
              <path
                d={`M${LEAD_X0} ${ROW_CY(i)} H${LEAD_X1}`}
                fill="none"
                stroke="#B9CEE2"
                strokeWidth={2.5}
                strokeLinecap="round"
                opacity={draw > 0 ? 1 : 0}
                pathLength={1}
                strokeDasharray={`${draw} 1`}
              />
              <path
                d={`M${LEAD_X1} ${ROW_CY(i) - 8} L${LEAD_X1 + 16} ${ROW_CY(i)} L${LEAD_X1} ${
                  ROW_CY(i) + 8
                } z`}
                fill="#B9CEE2"
                opacity={fade(frame, 698 + i * 22, 12)}
              />
            </g>
          );
        })}
      </svg>

      <CarriedChip x={700} y={182} w={280} text="PROGRAM" fill="#E4ECF4" opacity={chain} />
      <CarriedChip
        x={1060}
        y={182}
        w={270}
        text="TESTS PASS"
        fill="rgba(36,166,106,0.18)"
        opacity={chain}
      />

      {/* the task reward shrinks into the return column and hands over */}
      <div
        style={{
          position: 'absolute',
          left: lerp(1380, SCORE_CX - 100, rewardMove),
          top: lerp(158, ROW_CY(0) - 28, rewardMove),
          width: lerp(200, 200, rewardMove),
          textAlign: 'center',
          fontFamily,
          fontSize: lerp(108, 36, rewardMove),
          lineHeight: 1,
          fontWeight: 950,
          letterSpacing: '-0.05em',
          color: palette.green,
          opacity: rewardGone,
        }}
      >
        +1
      </div>
      <ColumnLabel x={1380} y={274} width={200} opacity={1 - fade(frame, 190, 30)}>
        TASK REWARD
      </ColumnLabel>

      {[2, 222].map((y) => (
        <div
          key={y}
          style={{
            position: 'absolute',
            left: 40,
            top: y,
            width: 92,
            textAlign: 'center',
            fontFamily,
            fontSize: 44,
            lineHeight: 1,
            fontWeight: 950,
            color: palette.muted,
            opacity: question * 0.85,
          }}
        >
          ?
        </div>
      ))}

      <div
        style={{
          position: 'absolute',
          left: 24,
          top: 430,
          width: 1680,
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          fontFamily,
          opacity: question,
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 850,
            letterSpacing: '0.19em',
            color: palette.muted,
            whiteSpace: 'nowrap',
          }}
        >
          ONE REWARD, THREE EXPLANATIONS
        </div>
        <div style={{flex: 1, height: 2, background: palette.line}} />
      </div>

      {OPTIONS.map((o, i) => (
        <div
          key={o.title}
          style={{
            position: 'absolute',
            left: 24 + i * 580,
            top: 486,
            width: 520,
            fontFamily,
            opacity: question,
          }}
        >
          <div style={{width: 64, height: 5, borderRadius: 3, background: o.tint}} />
          <div
            style={{
              marginTop: 16,
              height: 72,
              fontSize: 27,
              lineHeight: 1.22,
              fontWeight: 880,
              letterSpacing: '-0.02em',
              color: palette.ink,
            }}
          >
            {o.title}
          </div>
          <div style={{fontSize: 23, fontWeight: 700, color: palette.muted}}>{o.sub}</div>
        </div>
      ))}

      <div style={{opacity: question}}>
      </div>

      {/* ---------- the group of joint actions ---------- */}
      <ColumnLabel x={ROW_BACK_X} y={26} width={BACK_W} opacity={fade(frame, 300, 26) * rows}>
        JOINT ACTION
      </ColumnLabel>
      <ColumnLabel x={SCORE_CX - 110} y={26} width={220} opacity={fade(frame, 700, 26) * rows}>
        RETURN
      </ColumnLabel>
      <Note
        x={SCORE_CX - 110}
        y={52}
        width={220}
        align="center"
        size={19}
        weight={720}
        color={palette.muted}
        opacity={fade(frame, 700, 26) * rows}
      >
        illustrative
      </Note>

      {RETURNS.map((_, i) => {
        const b = backOf(i);
        const born = i === 0 ? fade(frame, 180, 30) : fade(frame, 470 + (i - 1) * 50, 26);
        return (
          <div
            key={`back-${i}`}
            style={{
              position: 'absolute',
              left: b.left,
              top: b.top,
              width: BACK_W,
              height: BACK_H,
              borderRadius: BACK_H / 2,
              background: BACK_TINT,
              opacity: born,
            }}
          />
        );
      })}

      {RETURNS.map((_, i) => {
        const b = backOf(i);
        const t = chipArrive(i);
        const srcA = i === 0 ? {x: 232, y: 72, w: 290, h: 68} : {x: 140, y: 93, w: CHIP_W, h: CHIP_H};
        const srcB = i === 0 ? {x: 232, y: 292, w: 290, h: 68} : {x: 140, y: 313, w: CHIP_W, h: CHIP_H};
        const dstA = {x: b.left + 12, y: b.top + 8, w: CHIP_W, h: CHIP_H};
        const dstB = {x: b.left + 150, y: b.top + 8, w: CHIP_W, h: CHIP_H};
        const enter = i === 0 ? 1 : fade(frame, 400 + (i - 1) * 50, 18);
        const text = i === 0 ? 1 - travel(frame, 80, 140) : 0;
        const fillA =
          i === 0
            ? interpolateColors(t, [0, 1], ['rgba(30,144,255,0.16)', palette.blue])
            : palette.blue;
        const fillB =
          i === 0
            ? interpolateColors(t, [0, 1], ['rgba(245,158,66,0.20)', palette.orange])
            : palette.orange;
        return (
          <div key={`chips-${i}`}>
            <div
              style={{
                position: 'absolute',
                left: lerp(srcA.x, dstA.x, t),
                top: lerp(srcA.y, dstA.y, t),
                width: lerp(srcA.w, dstA.w, t),
                height: lerp(srcA.h, dstA.h, t),
                borderRadius: lerp(18, CHIP_H / 2, t),
                background: fillA,
                display: 'grid',
                placeItems: 'center',
                fontFamily,
                fontSize: 27,
                fontWeight: 900,
                letterSpacing: '0.06em',
                color: `rgba(16,35,63,${text})`,
                opacity: enter,
              }}
            >
              {i === 0 ? 'PLAN' : ''}
            </div>
            <div
              style={{
                position: 'absolute',
                left: lerp(srcB.x, dstB.x, t),
                top: lerp(srcB.y, dstB.y, t),
                width: lerp(srcB.w, dstB.w, t),
                height: lerp(srcB.h, dstB.h, t),
                borderRadius: lerp(18, CHIP_H / 2, t),
                background: fillB,
                display: 'grid',
                placeItems: 'center',
                fontFamily,
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: '0.06em',
                color: `rgba(16,35,63,${text})`,
                opacity: enter,
              }}
            >
              {i === 0 ? 'IMPLEMENTATION' : ''}
            </div>
          </div>
        );
      })}

      {RETURNS.map((_, i) => (
        <ColumnLabel
          key={`attempt-${i}`}
          x={556}
          y={ROW_CY(i) - 10}
          width={210}
          align="left"
          color={palette.ink}
          opacity={fade(frame, 600 + i * 20, 24) * rows}
        >
          ATTEMPT {i + 1}
        </ColumnLabel>
      ))}

      <ReturnChart s={CHART_08} />

      {/* the returns: scored beside each attempt, then carried into its bar */}
      {RETURNS.map((v, i) => {
        const [a, b] = flyWindow(i);
        const fly = travel(frame, a, b);
        return (
          <ValueNumeral
            key={`score-${i}`}
            v={v}
            left={lerp(SCORE_CX - BAR_W / 2, BAR_X[i], fly)}
            top={lerp(ROW_TOP(i), VALUE_TOP, fly)}
            color={interpolateColors(fly, [0.9, 1], [palette.ink, palette.white])}
            opacity={fade(frame, 740 + i * 35, 26)}
          />
        );
      })}

      <LlmAgent
        color={palette.blue}
        label="LLM A"
        x={agentX}
        y={agentAY}
        size={agentSize}
        delay={-100}
        busy={frame > 390 && frame < 600}
      />
      <LlmAgent
        color={palette.orange}
        label="LLM B"
        x={agentX}
        y={agentBY}
        size={agentSize}
        delay={-100}
        busy={frame > 390 && frame < 600}
      />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 09 — Group-Relative Advantage                                       */
/*                                                                     */
/* Opens on scene 08's exact last frame — chart, joint actions, agents  */
/* and all — and lets the carried objects go as the maths arrives in    */
/* the space they leave. Terms appear one at a time, each annotated     */
/* underneath and wired down to the thing it names, and one bar is      */
/* measured above the mean and one below so the subtraction is a        */
/* picture before it is a formula. It closes on the reason the group    */
/* is the baseline at all.                                             */
/* ------------------------------------------------------------------ */

const EQ_TOP = 18;
const EQ_H = 150;
const CAP_Y = 176;

const EQ_PIECES = [
  {key: 'adv', tex: '\\hat{A}_t^{(g)}', cx: 529, w: 240},
  {key: 'eq', tex: '=', cx: 664, w: 80},
  {key: 'ret', tex: 'R_t^{(g)}', cx: 794, w: 220},
  {key: 'minus', tex: '-', cx: 900, w: 80},
  {key: 'avg', tex: "\\dfrac{1}{G}\\textstyle\\sum_{g'=1}^{G} R_t^{(g')}", cx: 1180, w: 440},
];

/** Per-element reveal, so scene 09 and scene 10 share one piece of markup. */
type Reveal = {
  adv: number;
  eq: number;
  ret: number;
  minus: number;
  avg: number;
  capAdv: number;
  capRet: number;
  capAvg: number;
  wireRet: number;
  wireRetHead: number;
  wireAvg: number;
  wireAvgHead: number;
  greenCap: number;
  redCap: number;
  ruleAvg: number;
  ruleAdv: number;
  note1: number;
  note2: number;
  ghost: number;
  strike: number;
  ghostLabel: number;
};

const FULL: Reveal = {
  adv: 1,
  eq: 1,
  ret: 1,
  minus: 1,
  avg: 1,
  capAdv: 1,
  capRet: 1,
  capAvg: 1,
  wireRet: 1,
  wireRetHead: 1,
  wireAvg: 1,
  wireAvgHead: 1,
  greenCap: 1,
  redCap: 1,
  ruleAvg: 1,
  ruleAdv: 1,
  note1: 1,
  note2: 1,
  ghost: 1,
  strike: 1,
  ghostLabel: 1,
};

const AdvantageTableau: React.FC<{r: Reveal; opacity?: number}> = ({r, opacity = 1}) => {
  const on: Record<string, number> = {
    adv: r.adv,
    eq: r.eq,
    ret: r.ret,
    minus: r.minus,
    avg: r.avg,
  };
  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      {EQ_PIECES.map((p) => (
        <div
          key={p.key}
          style={{
            position: 'absolute',
            left: p.cx - p.w / 2,
            top: EQ_TOP,
            width: p.w,
            height: EQ_H,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: on[p.key],
            translate: `0px ${(1 - on[p.key]) * 12}px`,
            scale: p.key === 'adv' ? 1 + r.ruleAdv * 0.06 : 1,
          }}
        >
          <Tex tex={p.tex} size={54} />
        </div>
      ))}

      {/* the two emphasis rules, one per beat that needs the eye moved */}
      <div
        style={{
          position: 'absolute',
          left: 1030,
          top: 158,
          width: 300 * r.ruleAvg,
          height: 4,
          borderRadius: 2,
          background: palette.ink,
          opacity: 0.28,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 464,
          top: 158,
          width: 130 * r.ruleAdv,
          height: 4,
          borderRadius: 2,
          background: palette.purple,
        }}
      />

      <Note
        x={529 - 150}
        y={CAP_Y}
        width={300}
        align="center"
        size={20}
        weight={800}
        color={palette.purple}
        opacity={r.capAdv}
      >
        the relative advantage
      </Note>
      <Note
        x={794 - 170}
        y={CAP_Y}
        width={340}
        align="center"
        size={20}
        weight={800}
        color={palette.ink}
        opacity={r.capRet}
      >
        the return of joint sample g
      </Note>
      <Note
        x={1180 - 190}
        y={CAP_Y}
        width={380}
        align="center"
        size={20}
        weight={800}
        color={palette.ink}
        opacity={r.capAvg}
      >
        the reference across the group
      </Note>

      <svg
        style={{position: 'absolute', left: 0, top: 0, width: CONTENT_W, height: CONTENT_H}}
        viewBox={`0 0 ${CONTENT_W} ${CONTENT_H}`}
      >
        <path
          d="M794 208 V244 H1039 V316"
          fill="none"
          stroke={palette.ink}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={r.wireRet > 0 ? 0.45 : 0}
          pathLength={1}
          strokeDasharray={`${r.wireRet} 1`}
        />
        <path d="M1031 314 L1047 314 L1039 330 z" fill={palette.ink} opacity={0.45 * r.wireRetHead} />
        <path
          d="M1240 208 V300 H1560 V380"
          fill="none"
          stroke={palette.ink}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={r.wireAvg > 0 ? 0.45 : 0}
          pathLength={1}
          strokeDasharray={`${r.wireAvg} 1`}
        />
        <path d="M1552 378 L1568 378 L1560 394 z" fill={palette.ink} opacity={0.45 * r.wireAvgHead} />
      </svg>

      <Note
        x={BAR_X[2] + BAR_W + 46}
        y={topOf(RETURNS[2]) + 4}
        width={230}
        size={18}
        weight={850}
        color={palette.green}
        opacity={r.greenCap}
      >
        above the mean
        <br />
        advantage positive
      </Note>
      <Note
        x={BAR_X[1] - 216}
        y={MEAN_Y + 10}
        width={180}
        align="right"
        size={18}
        weight={850}
        color={palette.red}
        opacity={r.redCap}
      >
        below the mean
        <br />
        advantage negative
      </Note>

      <Note x={0} y={34} width={400} size={24} weight={900} color={palette.ink} opacity={r.note1}>
        No separate value model.
      </Note>
      <Note x={0} y={74} width={400} size={21} weight={730} color={palette.muted} opacity={r.note2}>
        the centralized advantage comes from the group’s own Monte Carlo returns
      </Note>

      {/* the thing that is NOT trained, drawn as the absence it is */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          top: 176,
          width: 340,
          height: 104,
          borderRadius: 20,
          border: `2px dashed #B9CEE2`,
          display: 'grid',
          placeItems: 'center',
          fontFamily,
          fontSize: 21,
          fontWeight: 850,
          letterSpacing: '0.06em',
          color: palette.muted,
          textAlign: 'center',
          lineHeight: 1.25,
          opacity: r.ghost * 0.85,
        }}
      >
        CENTRALIZED
        <br />
        VALUE MODEL
      </div>
      <svg
        style={{position: 'absolute', left: 0, top: 0, width: CONTENT_W, height: CONTENT_H}}
        viewBox={`0 0 ${CONTENT_W} ${CONTENT_H}`}
      >
        <path
          d="M40 264 L332 192"
          fill="none"
          stroke={palette.muted}
          strokeWidth={3}
          strokeLinecap="round"
          opacity={r.strike > 0 ? 0.7 : 0}
          pathLength={1}
          strokeDasharray={`${r.strike} 1`}
        />
      </svg>
      <Note x={16} y={294} width={340} align="center" size={20} weight={850} color={palette.ink} opacity={r.ghostLabel}>
        not trained
      </Note>
    </div>
  );
};

const CHART_09: ChartSchedule = {
  axisAt: -400,
  growFrom: -400,
  growStep: 0,
  growDur: 40,
  labelsAt: -400,
  meanAt: -400,
  meanDur: 40,
  noteAt: -400,
  values: true,
  aboveAt: 520,
  belowAt: 740,
};

const GroupRelativeAdvantage = () => {
  const frame = useCurrentFrame();

  const agentsGone = 1 - fade(frame, 60, 60);

  const r: Reveal = {
    ret: fade(frame, 210, 24),
    capRet: fade(frame, 240, 24),
    wireRet: travel(frame, 270, 348),
    wireRetHead: fade(frame, 342, 14),
    minus: fade(frame, 340, 24),
    avg: fade(frame, 352, 24),
    capAvg: fade(frame, 384, 24),
    wireAvg: travel(frame, 410, 500),
    wireAvgHead: fade(frame, 494, 14),
    greenCap: fade(frame, 550, 26),
    adv: fade(frame, 600, 24),
    eq: fade(frame, 616, 24),
    capAdv: fade(frame, 650, 24),
    redCap: fade(frame, 770, 26),
    ruleAvg: travel(frame, 850, 900),
    note1: fade(frame, 920, 26),
    note2: fade(frame, 950, 26),
    ghost: fade(frame, 1000, 30),
    strike: travel(frame, 1090, 1150),
    ghostLabel: fade(frame, 1160, 26),
    ruleAdv: travel(frame, 1240, 1310),
  };

  return (
    <>
      <ReturnChart s={CHART_09} />

      {/* what scene 08 left on the frame, released one at a time */}
      {RETURNS.map((_, i) => (
        <Capsule
          key={`cap-${i}`}
          left={capChartLeft(i)}
          top={CAP_CHART_TOP}
          opacity={1 - fade(frame, 40 + i * 26, 40)}
        />
      ))}

      <LlmAgent color={palette.blue} label="LLM A" x={20} y={8} size={80} delay={-100} dim={frame > 80} />
      <div style={{opacity: agentsGone}}>
        <LlmAgent color={palette.orange} label="LLM B" x={20} y={148} size={80} delay={-100} />
      </div>

      <AdvantageTableau r={r} />

      {/* the blue agent has to be inside a faded wrapper too */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: palette.white,
          opacity: 0,
        }}
      />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 10 — Train Together, Act Independently                              */
/*                                                                     */
/* Opens on scene 09's last frame and follows one object across the    */
/* boundary: the advantage. The whole tableau collapses into the       */
/* CENTRALIZED ADVANTAGE block of a training loop, the loop completes  */
/* and is held long enough to read, and then it dissolves — leaving    */
/* the two models to generate from their own local history. A ghost of */
/* the loop returns at the end, to say what training had and execution */
/* does not.                                                           */
/* ------------------------------------------------------------------ */

const CHART_10: ChartSchedule = {
  ...CHART_09,
  aboveAt: -400,
  belowAt: -400,
};

/* the training loop */
const JR = {x: 366, y: 275, w: 346, h: 90};
const SR = {x: 746, y: 275, w: 316, h: 90};
const CA = {x: 1096, y: 275, w: 406, h: 90};

/* the execution lanes, shared with scene 11 so the cut at 12749 holds */
const HIST_X = 200;
const HIST_W = 420;
const RESP_X = 1000;
const RESP_W = 528;
const LANE_AGENT_X = 748;
const LANE_A_Y = 140;
const LANE_B_Y = 380;
const LANE_CHIP_H = 84;
const laneChipTop = (y: number) => y + (120 - LANE_CHIP_H) / 2;

const GHOSTS = [
  {x: 200, w: 440, label: 'JOINT RESPONSES'},
  {x: 680, w: 380, label: 'SHARED RETURNS'},
  {x: 1100, w: 428, label: 'CENTRALIZED ADVANTAGE'},
];

const ExecutionLanes: React.FC<{
  o: number;
  oB: number;
  gap: number;
  ghost: number;
  agentX: number;
}> = ({o, oB, gap, ghost, agentX}) => (
  <>
    <svg
      style={{position: 'absolute', left: 0, top: 0, width: CONTENT_W, height: CONTENT_H}}
      viewBox={`0 0 ${CONTENT_W} ${CONTENT_H}`}
    >
      <defs>
        <marker id="mgLane" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto">
          <path d="M0 0 L9 4.5 L0 9 z" fill={palette.muted} />
        </marker>
      </defs>
      <g opacity={o}>
        <path
          d="M640 200 H724"
          fill="none"
          stroke={palette.muted}
          strokeWidth={3.5}
          strokeLinecap="round"
          markerEnd="url(#mgLane)"
        />
        <path
          d="M892 200 H976"
          fill="none"
          stroke={palette.muted}
          strokeWidth={3.5}
          strokeLinecap="round"
          markerEnd="url(#mgLane)"
        />
      </g>
      <g opacity={oB}>
        <path
          d="M640 440 H724"
          fill="none"
          stroke={palette.muted}
          strokeWidth={3.5}
          strokeLinecap="round"
          markerEnd="url(#mgLane)"
        />
        <path
          d="M892 440 H976"
          fill="none"
          stroke={palette.muted}
          strokeWidth={3.5}
          strokeLinecap="round"
          markerEnd="url(#mgLane)"
        />
      </g>
      <path
        d="M200 330 H1528"
        fill="none"
        stroke="#B9CEE2"
        strokeWidth={3}
        strokeDasharray="14 13"
        opacity={gap}
      />
    </svg>

    <Block x={HIST_X} y={laneChipTop(LANE_A_Y)} w={HIST_W} h={LANE_CHIP_H} tint={palette.paleBlue} opacity={o} size={24} label="LOCAL HISTORY" />
    <Block x={RESP_X} y={laneChipTop(LANE_A_Y)} w={RESP_W} h={LANE_CHIP_H} tint={palette.paleBlue} opacity={o} size={24} label="RESPONSE A" />
    <Block x={HIST_X} y={laneChipTop(LANE_B_Y)} w={HIST_W} h={LANE_CHIP_H} tint={palette.paleOrange} opacity={oB} size={24} label="LOCAL HISTORY" />
    <Block x={RESP_X} y={laneChipTop(LANE_B_Y)} w={RESP_W} h={LANE_CHIP_H} tint={palette.paleOrange} opacity={oB} size={24} label="RESPONSE B" />

    <div
      style={{
        position: 'absolute',
        left: 564,
        top: 314,
        width: 600,
        textAlign: 'center',
        fontFamily,
        opacity: gap,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          background: palette.white,
          padding: '2px 20px',
          fontSize: 22,
          fontWeight: 780,
          color: palette.muted,
        }}
      >
        no access to the other agent’s history
      </span>
    </div>

    {/* the loop that trained them, present only as a memory */}
    <div style={{position: 'absolute', inset: 0, opacity: ghost * 0.5}}>
      {GHOSTS.map((g) => (
        <Block
          key={g.label}
          x={g.x}
          y={30}
          w={g.w}
          h={60}
          tint="#EDF2F7"
          color={palette.muted}
          size={21}
          radius={18}
          label={g.label}
        />
      ))}
    </div>
    <ColumnLabel x={1128} y={0} width={400} align="right" opacity={ghost}>
      NOT PRESENT AT EXECUTION
    </ColumnLabel>

    <LlmAgent color={palette.blue} label="LLM A" x={agentX} y={LANE_A_Y} size={120} delay={-100} />
    <LlmAgent color={palette.orange} label="LLM B" x={agentX} y={LANE_B_Y} size={120} delay={-100} />
  </>
);

const TrainTogether = () => {
  const frame = useCurrentFrame();

  /* the advantage tableau collapses into one block */
  const collapse = travel(frame, 40, 130);
  const tableau = interpolate(collapse, [0.05, 0.6], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const morph = interpolate(collapse, [0.1, 0.55], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const hold = (a: number, b: number) =>
    interpolate(frame, [a, b, 440, 510], [0, 1, 1, 0], {
      easing: EASE,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  const advBlock = interpolate(frame, [440, 510], [1, 0], {
    easing: EASE,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const updates = hold(150, 210);
  const chain2 = hold(230, 285);
  const chain1 = hold(270, 325);
  const wires = travel(frame, 300, 366);
  const wiresO = hold(300, 320);

  const agentsIn = fade(frame, 150, 40);
  const slide = travel(frame, 490, 580);
  const agentX = lerp(140, LANE_AGENT_X, slide);

  const exec = fade(frame, 590, 32);
  const execB = fade(frame, 630, 32);
  const gap = fade(frame, 710, 30);
  const ghost = fade(frame, 780, 40);

  /* the morphing field: the chart's footprint becomes the advantage block */
  const mx = lerp(AXIS_X0, CA.x, morph);
  const my = lerp(330, CA.y, morph);
  const mw = lerp(AXIS_X1 - AXIS_X0, CA.w, morph);
  const mh = lerp(232, CA.h, morph);

  return (
    <>
      <ReturnChart s={CHART_10} opacity={tableau} />
      <AdvantageTableau r={FULL} opacity={tableau} />

      <div
        style={{
          position: 'absolute',
          left: mx,
          top: my,
          width: mw,
          height: mh,
          borderRadius: 22,
          background: palette.palePurple,
          display: 'grid',
          placeItems: 'center',
          fontFamily,
          opacity: morph * advBlock,
        }}
      >
        <div
          style={{
            fontSize: 25,
            fontWeight: 880,
            color: palette.ink,
            letterSpacing: '-0.015em',
            opacity: interpolate(morph, [0.6, 1], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          CENTRALIZED ADVANTAGE
        </div>
      </div>

      <Note
        x={0}
        y={0}
        size={22}
        weight={900}
        color={palette.muted}
        track="0.22em"
        opacity={interpolate(frame, [200, 240, 430, 480], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })}
      >
        TRAINING
      </Note>
      <Note
        x={0}
        y={0}
        size={22}
        weight={900}
        color={palette.purple}
        track="0.22em"
        opacity={fade(frame, 560, 34)}
      >
        EXECUTION
      </Note>

      <svg
        style={{position: 'absolute', left: 0, top: 0, width: CONTENT_W, height: CONTENT_H}}
        viewBox={`0 0 ${CONTENT_W} ${CONTENT_H}`}
      >
        <defs>
          <marker id="mg10m" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto">
            <path d="M0 0 L9 4.5 L0 9 z" fill={palette.muted} />
          </marker>
          <marker id="mg10b" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto">
            <path d="M0 0 L9 4.5 L0 9 z" fill={palette.blue} />
          </marker>
          <marker id="mg10o" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto">
            <path d="M0 0 L9 4.5 L0 9 z" fill={palette.orange} />
          </marker>
        </defs>

        <g opacity={wiresO}>
          <path
            d="M266 200 C330 200, 330 296, 360 300"
            fill="none"
            stroke={palette.blue}
            strokeWidth={3.5}
            strokeLinecap="round"
            markerEnd="url(#mg10b)"
            opacity={wires > 0 ? 1 : 0}
            pathLength={1}
            strokeDasharray={`${wires} 1`}
          />
          <path
            d="M266 440 C330 440, 330 344, 360 340"
            fill="none"
            stroke={palette.orange}
            strokeWidth={3.5}
            strokeLinecap="round"
            markerEnd="url(#mg10o)"
            opacity={wires > 0 ? 1 : 0}
            pathLength={1}
            strokeDasharray={`${wires} 1`}
          />
        </g>
        <path
          d="M718 320 H740"
          fill="none"
          stroke={palette.muted}
          strokeWidth={3.5}
          strokeLinecap="round"
          markerEnd="url(#mg10m)"
          opacity={chain1 * 0.85}
        />
        <path
          d="M1068 320 H1090"
          fill="none"
          stroke={palette.muted}
          strokeWidth={3.5}
          strokeLinecap="round"
          markerEnd="url(#mg10m)"
          opacity={chain2 * 0.85}
        />
        <g opacity={updates}>
          <path
            d="M1506 302 L1530 220"
            fill="none"
            stroke={palette.blue}
            strokeWidth={3.5}
            strokeLinecap="round"
            markerEnd="url(#mg10b)"
          />
          <path
            d="M1506 338 L1530 420"
            fill="none"
            stroke={palette.orange}
            strokeWidth={3.5}
            strokeLinecap="round"
            markerEnd="url(#mg10o)"
          />
        </g>
      </svg>

      <Block x={JR.x} y={JR.y} w={JR.w} h={JR.h} tint={palette.paleBlue} opacity={chain1} label="JOINT RESPONSES" />
      <Block x={SR.x} y={SR.y} w={SR.w} h={SR.h} tint={palette.paleGreen} opacity={chain2} label="SHARED RETURNS" />
      <Block
        x={1538}
        y={172}
        w={182}
        h={72}
        tint="#DCEBFB"
        color={palette.navy}
        size={23}
        opacity={updates}
        label="UPDATE A"
      />
      <Block
        x={1538}
        y={396}
        w={182}
        h={72}
        tint="#FBE6CE"
        color="#8A5A1C"
        size={23}
        opacity={updates}
        label="UPDATE B"
      />

      <div style={{opacity: agentsIn}}>
        <ExecutionLanes o={exec} oB={execB} gap={gap} ghost={ghost} agentX={agentX} />
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 11 — Beyond One Algorithm                                           */
/*                                                                     */
/* Opens on scene 10's two execution lanes and contracts them into one */
/* branch, so MAGRPO is literally the thing we have been watching.     */
/* MAPoRL grows beside it, and both lead to the same destination.      */
/* Nothing here compares the two: no bars, no scores, no "better".     */
/* The frame draws back a little at the end, for the section that      */
/* opens by pulling away from the abstract LLM team.                   */
/* ------------------------------------------------------------------ */

const MAGRPO_STEPS = ['groups of joint responses', 'group-relative advantage', 'decentralized execution'];
const MAPORL_STEPS = [
  'agents produce responses',
  'agents discuss them',
  'a verifier scores the result',
  'those scores are the reward',
];

const BeyondOneAlgorithm = () => {
  const frame = useCurrentFrame();

  /* the lanes we arrive on contract into the left branch */
  const contract = travel(frame, 20, 110);
  const converge = travel(frame, 700, 780);
  const dest = fade(frame, 660, 30);
  /* a small pull-back, so the next section can keep moving the camera */
  const pull = travel(frame, 830, 890);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        scale: 1 - pull * 0.06,
        translate: `0px ${pull * -8}px`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 1 - contract,
          scale: lerp(1, 0.52, contract),
          translate: `${lerp(0, -300, contract)}px ${lerp(0, -30, contract)}px`,
        }}
      >
        <ExecutionLanes o={1} oB={1} gap={1} ghost={1} agentX={LANE_AGENT_X} />
      </div>
      <Note
        x={0}
        y={0}
        size={22}
        weight={900}
        color={palette.purple}
        track="0.22em"
        opacity={1 - fade(frame, 20, 40)}
      >
        EXECUTION
      </Note>

      <Note
        x={130}
        y={4}
        width={630}
        align="center"
        size={48}
        weight={920}
        color={palette.purple}
        track="-0.03em"
        opacity={fade(frame, 50, 24)}
      >
        MAGRPO
      </Note>
      <Note
        x={130}
        y={64}
        width={630}
        align="center"
        size={21}
        weight={760}
        color={palette.muted}
        track="0.1em"
        opacity={fade(frame, 75, 24)}
      >
        AAAI-26
      </Note>
      <Note
        x={130}
        y={96}
        width={630}
        align="center"
        size={21}
        weight={720}
        color={palette.muted}
        opacity={fade(frame, 225, 26)}
      >
        learns from groups of joint behaviours
      </Note>

      <Note
        x={968}
        y={4}
        width={630}
        align="center"
        size={48}
        weight={920}
        color={palette.navy}
        track="-0.03em"
        opacity={fade(frame, 150, 24)}
      >
        MAPoRL
      </Note>
      <Note
        x={968}
        y={64}
        width={630}
        align="center"
        size={21}
        weight={760}
        color={palette.muted}
        track="0.1em"
        opacity={fade(frame, 180, 24)}
      >
        ACL 2025
      </Note>
      <Note
        x={968}
        y={96}
        width={630}
        align="center"
        size={21}
        weight={720}
        color={palette.muted}
        opacity={fade(frame, 290, 26)}
      >
        co-trains language models to collaborate
      </Note>

      {MAGRPO_STEPS.map((s, i) => (
        <Block
          key={s}
          x={130}
          y={160 + i * 108}
          w={630}
          h={80}
          tint={palette.palePurple}
          size={26}
          opacity={fade(frame, 100 + i * 40, 24)}
          label={s}
        />
      ))}

      {MAPORL_STEPS.map((s, i) => (
        <Block
          key={s}
          x={968}
          y={160 + i * 78}
          w={630}
          h={62}
          tint={palette.paleBlue}
          size={24}
          opacity={fade(frame, 390 + i * 60, 24)}
          label={s}
        />
      ))}

      <div
        style={{
          position: 'absolute',
          left: 564,
          top: 492,
          width: 600,
          height: 86,
          borderRadius: 26,
          background: palette.navy,
          display: 'grid',
          placeItems: 'center',
          fontFamily,
          opacity: dest,
          scale: interpolate(frame, [660, 700], [0.94, 1], {
            easing: EASE,
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            output: 'perceptual-scale',
          }),
        }}
      >
        <div style={{fontSize: 36, fontWeight: 920, color: palette.white, letterSpacing: '0.02em'}}>
          LEARNING COLLABORATION
        </div>
      </div>

      <svg
        style={{position: 'absolute', left: 0, top: 0, width: CONTENT_W, height: CONTENT_H}}
        viewBox={`0 0 ${CONTENT_W} ${CONTENT_H}`}
      >
        <path
          d="M445 470 V535 H540"
          fill="none"
          stroke={palette.navy}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={converge > 0 ? 0.65 : 0}
          pathLength={1}
          strokeDasharray={`${converge} 1`}
        />
        <path
          d="M1283 470 V535 H1188"
          fill="none"
          stroke={palette.navy}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={converge > 0 ? 0.65 : 0}
          pathLength={1}
          strokeDasharray={`${converge} 1`}
        />
        <path
          d="M542 527 L558 535 L542 543 z"
          fill={palette.navy}
          opacity={0.65 * fade(frame, 772, 14)}
        />
        <path
          d="M1186 527 L1170 535 L1186 543 z"
          fill={palette.navy}
          opacity={0.65 * fade(frame, 772, 14)}
        />
      </svg>

      <Note
        x={364}
        y={590}
        width={1000}
        align="center"
        size={24}
        weight={760}
        color={palette.muted}
        opacity={fade(frame, 790, 28)}
      >
        collaboration itself is becoming an object of learning
      </Note>
    </div>
  );
};

export const MagrpoVisuals: React.FC<{sceneIndex: number}> = ({sceneIndex}) => {
  switch (sceneIndex) {
    case 8:
      return <Magrpo />;
    case 9:
      return <GroupRelativeAdvantage />;
    case 10:
      return <TrainTogether />;
    case 11:
      return <BeyondOneAlgorithm />;
    default:
      return null;
  }
};
