import katex from 'katex';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {fontFamily, palette} from '../constants';
import {Agent} from '../components/Agent';
import {Equation} from '../components/Equation';

/**
 * THE COORDINATE SECTION
 *
 * Eight scenes, and deliberately eight different shapes. The previous version
 * put every idea in the same furniture — heading, bordered box, bordered
 * equation card, bordered caption — and seven of these frames carried three or
 * more strong borders at once. Boxes were doing the work that layout, motion
 * and typography should be doing.
 *
 * What is here instead:
 *   05 Why did they collide?   animated scenario, no containers at all
 *   06 Joint Action Space      equation build, one emphasis number on white
 *   07 Independent Learning    data visualisation, labels sit on the plot
 *   08 Centralized Training    two-sided comparison, the only two containers
 *   09 CTDE                    one block diagram split by a deployment line
 *   10 Credit Assignment       prediction pause, almost empty
 *   11 VDN                     bars concatenating into a sum, then the maths
 *   12 QMIX                    one monotone curve against a straight line
 *
 * The content box handed down by SceneShell is 1728 x 690. Every coordinate in
 * this file is relative to that box, and nothing is placed below y = 660.
 */

const CONTENT_W = 1728;
const CONTENT_H = 690;

/* ------------------------------------------------------------------ */
/* Local primitives. Kept in this file so no sibling scene depends on  */
/* them, and so none of them draws a border.                           */
/* ------------------------------------------------------------------ */

type Pt = [number, number];

/** A point at normalised arc length t along a polyline. */
const polyPoint = (pts: Pt[], t: number): Pt => {
  const clamped = Math.max(0, Math.min(1, t));
  const lens: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    lens.push(d);
    total += d;
  }
  let target = clamped * total;
  for (let i = 0; i < lens.length; i++) {
    if (target <= lens[i]) {
      const f = lens[i] === 0 ? 0 : target / lens[i];
      return [
        pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f,
        pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f,
      ];
    }
    target -= lens[i];
  }
  return pts[pts.length - 1];
};

const polyPath = (pts: Pt[]) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ');

/** Inline maths on white. No card, no rail, no border. */
const Tex: React.FC<{tex: string; size?: number; color?: string}> = ({
  tex,
  size = 28,
  color = palette.ink,
}) => (
  <span
    style={{fontSize: size, color, lineHeight: 1}}
    dangerouslySetInnerHTML={{__html: katex.renderToString(tex, {throwOnError: false})}}
  />
);

/** A line of type placed straight onto the white, never in a box. */
const Note: React.FC<{
  children: React.ReactNode;
  x?: number;
  y: number;
  right?: number;
  width?: number;
  size?: number;
  weight?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  opacity?: number;
}> = ({children, x, y, right, width, size = 26, weight = 700, color = palette.muted, align = 'left', opacity = 1}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      right: right,
      top: y,
      width,
      fontFamily,
      fontSize: size,
      fontWeight: weight,
      color,
      textAlign: align,
      lineHeight: 1.28,
      letterSpacing: '-0.01em',
      opacity,
    }}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------ */
/* 05 — Why did they collide?                                          */
/* An animated scenario. Two agents swap sides of a counter. First     */
/* both pick the same gap and hit each other; then a convention sends  */
/* one over and one under. Nothing in this scene is a container.       */
/* ------------------------------------------------------------------ */

const SVG_X = 64;
const SVG_Y = 26;

const ROUTE_UP_A: Pt[] = [[110, 226], [520, 226], [660, 86], [960, 86], [1100, 226], [1500, 226]];
const ROUTE_UP_B: Pt[] = [[110, 240], [520, 240], [660, 100], [960, 100], [1100, 240], [1500, 240]];
const ROUTE_LOW_B: Pt[] = [[110, 240], [520, 240], [660, 380], [960, 380], [1100, 240], [1500, 240]];

const Coordination = () => {
  const frame = useCurrentFrame();

  // One travel parameter drives both agents. A runs it forwards, B runs it
  // backwards, so p = 0.5 is the moment they meet.
  const approach = interpolate(frame, [240, 415], [0, 0.472], {
    easing: Easing.bezier(0.35, 0, 0.4, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const recoil = interpolate(frame, [418, 448], [0, 0.014], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const reset = interpolate(frame, [570, 636], [0.458, 0], {
    easing: Easing.bezier(0.6, 0, 0.4, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cross = interpolate(frame, [770, 1000], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cycle = (frame - 1260) % 620;
  const loop =
    cycle < 310
      ? interpolate(cycle, [0, 250], [1, 0], {
          easing: Easing.bezier(0.45, 0, 0.55, 1),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : interpolate(cycle - 310, [0, 250], [0, 1], {
          easing: Easing.bezier(0.45, 0, 0.55, 1),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

  const collided = frame < 636;
  const p = frame < 570 ? approach - recoil : frame < 636 ? reset : frame < 1260 ? cross : loop;

  const routeB = collided ? ROUTE_UP_B : ROUTE_LOW_B;
  const a = polyPoint(ROUTE_UP_A, p);
  const b = polyPoint(routeB, 1 - p);

  const drawNaive = interpolate(frame, [90, 215], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const drawFixed = interpolate(frame, [630, 760], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <>
      <svg
        style={{position: 'absolute', left: SVG_X, top: SVG_Y, width: 1600, height: 470, overflow: 'visible'}}
        viewBox="0 0 1600 470"
      >
        {/* the counter they must get around: a solid object, not a frame */}
        <g
          style={{
            opacity: interpolate(frame, [0, 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          }}
        >
          <rect x={640} y={190} width={340} height={110} rx={22} fill="#E4ECF4" />
          <rect x={640} y={278} width={340} height={22} rx={11} fill="#D3E0EC" />
          <text
            x={810}
            y={250}
            textAnchor="middle"
            fontFamily={fontFamily}
            fontSize={26}
            fontWeight={800}
            fill={palette.muted}
          >
            counter
          </text>
        </g>

        {/* attempt one: both of them reach for the same gap */}
        <g
          style={{
            opacity: interpolate(frame, [90, 120, 566, 616], [0, 1, 1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          <path
            d={polyPath(ROUTE_UP_A)}
            fill="none"
            stroke={palette.blue}
            strokeWidth={14}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={`${drawNaive} 1`}
            opacity={0.85}
          />
          <path
            d={polyPath(ROUTE_UP_B)}
            fill="none"
            stroke={palette.orange}
            strokeWidth={14}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={`${drawNaive} 1`}
            opacity={0.85}
          />
        </g>

        {/* the impact */}
        <g
          style={{
            opacity: interpolate(frame, [416, 436, 548, 588], [0, 1, 1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            scale: interpolate(frame, [416, 448], [0.5, 1], {
              easing: Easing.spring({damping: 12, stiffness: 140}),
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              output: 'perceptual-scale',
            }),
            transformOrigin: '805px 93px',
          }}
        >
          <circle cx={805} cy={93} r={54} fill={palette.white} opacity={0.92} />
          <path
            d="M 776 64 L 834 122 M 834 64 L 776 122"
            stroke={palette.red}
            strokeWidth={15}
            strokeLinecap="round"
          />
        </g>

        {/* attempt two: a convention. one over, one under. */}
        <g
          style={{
            opacity: interpolate(frame, [630, 680], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          }}
        >
          <path
            d={polyPath(ROUTE_UP_A)}
            fill="none"
            stroke={palette.blue}
            strokeWidth={14}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={`${drawFixed} 1`}
            opacity={0.85}
          />
          <path
            d={polyPath(ROUTE_LOW_B)}
            fill="none"
            stroke={palette.orange}
            strokeWidth={14}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={`${drawFixed} 1`}
            opacity={0.85}
          />
        </g>
      </svg>

      <Agent color={palette.blue} label="Agent A" x={SVG_X + a[0] - 48} y={SVG_Y + a[1] - 48} size={96} delay={22} />
      <Agent
        color={palette.orange}
        label="Agent B"
        x={SVG_X + b[0] - 48}
        y={SVG_Y + b[1] - 48}
        size={96}
        delay={36}
        direction="left"
      />

      <Note
        x={SVG_X + 500}
        y={SVG_Y + 420}
        width={620}
        align="center"
        size={32}
        weight={900}
        color={palette.red}
        opacity={interpolate(frame, [438, 470, 548, 588], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })}
      >
        Both chose the same gap.
      </Note>

      <Note
        x={140}
        y={556}
        width={1448}
        align="center"
        size={34}
        weight={800}
        color={palette.ink}
        opacity={interpolate(frame, [1008, 1046], [0, 1], {
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })}
      >
        A convention — one over, one under — makes the joint action compatible.
      </Note>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 06 — Joint Action Space                                             */
/* Agents arrive, the equation lands on white, and one number carries  */
/* the surprise. No panel, no card, no navy slab.                      */
/* ------------------------------------------------------------------ */

const AGENT_TINT = [palette.blue, palette.orange, palette.green, palette.purple, palette.red, palette.navy];

const Scaling = () => {
  const frame = useCurrentFrame();
  const n = Math.max(1, Math.min(6, 1 + Math.floor((frame - 18) / 28)));
  const joint = 5 ** n;

  return (
    <>
      {AGENT_TINT.map((color, index) => (
        <div key={color}>
          <Agent color={color} label={String(index + 1)} x={193 + index * 250} y={6} size={92} delay={18 + index * 28} />
          <div
            style={{
              position: 'absolute',
              left: 193 + index * 250,
              top: 152,
              width: 92,
              display: 'flex',
              justifyContent: 'center',
              gap: 9,
              opacity: interpolate(frame, [30 + index * 28, 52 + index * 28], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            {[0, 1, 2, 3, 4].map((dot) => (
              <div key={dot} style={{width: 11, height: 11, borderRadius: 6, background: color, opacity: 0.6}} />
            ))}
          </div>
        </div>
      ))}

      <Note x={264} y={182} width={1200} align="center" size={25}>
        five actions available to each agent
      </Note>

      <div style={{position: 'absolute', left: 264, top: 200, width: 1200}}>
        <Equation
          latex={'\\left|\\mathcal{A}_{\\mathrm{joint}}\\right| = k^{\\,n}'}
          size={56}
          delay={190}
          terms={[
            {tex: 'k', is: 'actions per agent'},
            {tex: 'n', is: 'agents'},
          ]}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 164,
          top: 520,
          width: 1400,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'baseline',
          gap: 24,
          fontFamily,
          opacity: interpolate(frame, [70, 108], [0, 1], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <Tex tex={`5^{${n}} =`} size={54} color={palette.muted} />
        <span
          style={{
            fontSize: 118,
            lineHeight: 1,
            fontWeight: 950,
            letterSpacing: '-0.055em',
            color: palette.orange,
          }}
        >
          {joint.toLocaleString()}
        </span>
        <span style={{fontSize: 32, fontWeight: 800, color: palette.ink}}>joint actions</span>
      </div>

    </>
  );
};

/* ------------------------------------------------------------------ */
/* 07 — Independent Learning                                           */
/* A data visualisation. The moving target is the whole scene, so the  */
/* chart frame and the callout card are gone and every label sits      */
/* directly on the plot.                                               */
/* ------------------------------------------------------------------ */

const PLOT_X = 250;
const PLOT_Y = 60;

const TRUE_VALUE: Pt[] = [
  [60, 320],
  [330, 320],
  [330, 190],
  [700, 190],
  [700, 355],
  [1060, 355],
  [1060, 245],
  [1380, 245],
];

const IndependentLearning = () => {
  const frame = useCurrentFrame();
  const marker = polyPoint(TRUE_VALUE, ((frame - 340 + 900) % 900) / 900);

  return (
    <>
      <Agent color={palette.blue} label="Learner A" x={40} y={240} size={120} delay={10} />

      <svg
        style={{position: 'absolute', left: PLOT_X, top: PLOT_Y, width: 1420, height: 470, overflow: 'visible'}}
        viewBox="0 0 1420 470"
      >
        {/* two hairlines, not a chart frame */}
        <path
          d="M60 20 V390 H1380"
          fill="none"
          stroke={palette.navy}
          strokeWidth={4}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${interpolate(frame, [0, 28], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} 1`}
        />

        {/* what agent A believes: one estimate, always a step behind */}
        <path
          d="M60 330 C300 325, 520 300, 780 285 S1160 262, 1380 258"
          fill="none"
          stroke={palette.blue}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray="20 18"
          opacity={interpolate(frame, [120, 200], [0, 0.9], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
        />

        {/* the true value of the same action, revalued at every teammate update */}
        <path
          d={polyPath(TRUE_VALUE)}
          fill="none"
          stroke={palette.red}
          strokeWidth={13}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={`${interpolate(frame, [30, 300], [0, 1], {
            easing: Easing.bezier(0.4, 0, 0.3, 1),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })} 1`}
        />

        {/* where a teammate changed policy */}
        {[330, 700, 1060].map((tick, index) => (
          <path
            key={tick}
            d={`M${tick - 13} 398 L${tick + 13} 398 L${tick} 420 Z`}
            fill={palette.navy}
            opacity={interpolate(frame, [190 + index * 40, 220 + index * 40], [0, 0.8], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })}
          />
        ))}

        <circle
          cx={marker[0]}
          cy={marker[1]}
          r={15}
          fill={palette.red}
          opacity={interpolate(frame, [300, 340], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
        />
        <circle
          cx={marker[0]}
          cy={marker[1]}
          r={26}
          fill="none"
          stroke={palette.red}
          strokeWidth={4}
          opacity={interpolate(frame, [300, 340], [0, 0.3], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
        />
      </svg>

      <div
        style={{
          position: 'absolute',
          left: 900,
          top: 80,
          width: 720,
          fontFamily,
          opacity: interpolate(frame, [370, 410], [0, 1], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <div style={{fontSize: 46, fontWeight: 900, letterSpacing: '-0.035em', color: palette.red}}>
          Non-stationarity
        </div>
        <div style={{fontSize: 27, fontWeight: 700, color: palette.muted, lineHeight: 1.26, marginTop: 8}}>
          the same action, a different consequence, once a teammate updates
        </div>
      </div>

      <Note
        right={40}
        y={250}
        align="right"
        size={26}
        weight={850}
        color={palette.red}
        opacity={interpolate(frame, [300, 340], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
      >
        the true value of A’s action
      </Note>
      <Note
        right={40}
        y={360}
        align="right"
        size={26}
        weight={850}
        color={palette.blue}
        opacity={interpolate(frame, [340, 380], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
      >
        what A currently believes
      </Note>

      <Note x={PLOT_X + 60} y={478} size={24} weight={750}>
        ▲ a teammate updated its policy
      </Note>
      <Note right={40} y={478} size={24} weight={750} align="right">
        training →
      </Note>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 08 — Centralized Training                                           */
/* The one place in this section where two containers are the point:   */
/* the same three quantities, visible on the left and gone on the      */
/* right. Exactly two borders, and nothing else.                       */
/* ------------------------------------------------------------------ */

const InfoRow: React.FC<{
  y: number;
  tex: string;
  text: string;
  color: string;
  delay: number;
  struck?: boolean;
}> = ({y, tex, text, color, delay, struck = false}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: 'absolute',
        left: 56,
        top: y,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        opacity: interpolate(frame, [delay, delay + 20], [0, struck ? 0.55 : 1], {
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
        translate: `${interpolate(frame, [delay, delay + 20], [-16, 0], {
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })}px 0px`,
      }}
    >
      <div style={{width: 15, height: 15, borderRadius: 8, background: color, flexShrink: 0}} />
      <Tex tex={tex} size={31} color={struck ? palette.muted : palette.ink} />
      <span
        style={{
          fontFamily,
          fontSize: 27,
          fontWeight: 700,
          color: palette.muted,
          textDecoration: struck ? 'line-through' : 'none',
        }}
      >
        {text}
      </span>
    </div>
  );
};

const CentralizedDecentralized = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 10,
          width: 832,
          height: 556,
          borderRadius: 32,
          background: palette.paleBlue,
          border: `3px solid ${palette.blue}`,
          boxSizing: 'border-box',
          fontFamily,
          opacity: interpolate(frame, [8, 34], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}
      >
        <div style={{position: 'absolute', left: 40, top: 30, fontSize: 42, fontWeight: 900, color: palette.blue}}>
          During training
        </div>
        <div style={{position: 'absolute', left: 40, top: 86, fontSize: 25, fontWeight: 700, color: palette.muted}}>
          the learner is allowed to look at
        </div>
        <Agent color={palette.blue} label="Agent 1" x={200} y={140} size={108} delay={30} />
        <Agent color={palette.orange} label="Agent 2" x={470} y={140} size={108} delay={44} direction="left" />
        <InfoRow y={330} tex="s" text="the global state" color={palette.navy} delay={80} />
        <InfoRow y={396} tex="\mathbf{a}=(a^1,a^2)" text="every action" color={palette.blue} delay={104} />
        <InfoRow y={462} tex="r" text="the team reward" color={palette.green} delay={128} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 896,
          top: 10,
          width: 832,
          height: 556,
          borderRadius: 32,
          background: palette.paleGreen,
          border: `3px solid ${palette.green}`,
          boxSizing: 'border-box',
          fontFamily,
          opacity: interpolate(frame, [46, 72], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}
      >
        <div style={{position: 'absolute', left: 40, top: 30, fontSize: 42, fontWeight: 900, color: palette.green}}>
          During execution
        </div>
        <div style={{position: 'absolute', left: 40, top: 86, fontSize: 25, fontWeight: 700, color: palette.muted}}>
          each policy decides from
        </div>
        {[254, 524].map((cx, index) => (
          <div
            key={cx}
            style={{
              position: 'absolute',
              left: cx - 92,
              top: 194 - 92,
              width: 184,
              height: 184,
              borderRadius: '50%',
              background: 'rgba(36,166,106,0.15)',
              scale: interpolate(frame, [110 + index * 16, 150 + index * 16], [0.6, 1], {
                easing: Easing.bezier(0.16, 1, 0.3, 1),
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                output: 'perceptual-scale',
              }),
              opacity: interpolate(frame, [110 + index * 16, 150 + index * 16], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          />
        ))}
        <Agent color={palette.blue} label="Agent 1" x={200} y={140} size={108} delay={62} />
        <Agent color={palette.orange} label="Agent 2" x={470} y={140} size={108} delay={76} direction="left" />
        <InfoRow y={330} tex="o^i" text="its own observation" color={palette.green} delay={150} />
        <InfoRow y={396} tex="\pi_i(a^i \mid o^i)" text="its own policy" color={palette.green} delay={174} />
        <InfoRow y={462} tex="s,\ \mathbf{a},\ r" text="not available here" color={palette.muted} delay={198} struck />
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 09 — Centralized Training with Decentralized Execution              */
/* One diagram, cut by a deployment line. Above it lives only during   */
/* training; below it is what actually ships. The critic is a solid    */
/* block, not a bordered card, and it dissolves late in the scene.     */
/* ------------------------------------------------------------------ */

const Ctde = () => {
  const frame = useCurrentFrame();
  const trainingOpacity = interpolate(frame, [60, 100, 950, 1010], [0, 1, 1, 0.16], {
    easing: [Easing.bezier(0.16, 1, 0.3, 1), Easing.linear, Easing.bezier(0.4, 0, 0.3, 1)],
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <>
      <svg
        style={{position: 'absolute', left: 0, top: 0, width: CONTENT_W, height: CONTENT_H}}
        viewBox={`0 0 ${CONTENT_W} ${CONTENT_H}`}
      >
        <defs>
          <marker id="ctdeNavy" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
            <path d="M0 0 L9 4.5 L0 9 z" fill={palette.navy} />
          </marker>
          <marker id="ctdeGreen" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
            <path d="M0 0 L9 4.5 L0 9 z" fill={palette.green} />
          </marker>
        </defs>

        {/* the deployment line */}
        <path
          d="M0 262 H1728"
          stroke="#B9CEE2"
          strokeWidth={3}
          strokeDasharray="16 14"
          opacity={interpolate(frame, [20, 60], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
        />

        <g style={{opacity: trainingOpacity}}>
          <path
            d="M272 372 L648 196"
            fill="none"
            stroke={palette.navy}
            strokeWidth={6}
            strokeLinecap="round"
            markerEnd="url(#ctdeNavy)"
            opacity={0.85}
          />
          <path
            d="M1456 372 L1080 196"
            fill="none"
            stroke={palette.navy}
            strokeWidth={6}
            strokeLinecap="round"
            markerEnd="url(#ctdeNavy)"
            opacity={0.85}
          />
          <path
            d="M864 190 L864 336"
            fill="none"
            stroke={palette.green}
            strokeWidth={6}
            strokeLinecap="round"
            markerEnd="url(#ctdeGreen)"
          />
        </g>
      </svg>

      {/* the critic: a filled block in a block diagram, deliberately not a card */}
      <div
        style={{
          position: 'absolute',
          left: 604,
          top: 0,
          width: 520,
          height: 176,
          borderRadius: 30,
          background: palette.navy,
          color: palette.white,
          fontFamily,
          textAlign: 'center',
          opacity: trainingOpacity,
          scale: interpolate(frame, [60, 100], [0.9, 1], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            output: 'perceptual-scale',
          }),
        }}
      >
        <div style={{fontSize: 21, fontWeight: 850, letterSpacing: '0.16em', opacity: 0.66, marginTop: 22}}>
          TRAINING ONLY
        </div>
        <div style={{fontSize: 44, fontWeight: 950, letterSpacing: '-0.03em', marginTop: 4}}>Central critic</div>
        <div style={{marginTop: 10}}>
          <Tex tex={'Q\\!\\left(s, a^1, a^2\\right)'} size={28} color={palette.white} />
        </div>
      </div>

      <Note x={16} y={218} size={23} weight={800} color={palette.muted}>
        exists only while training
      </Note>
      <Note x={16} y={276} size={23} weight={800} color={palette.green}>
        this is what runs at deployment
      </Note>

      <Note
        x={350}
        y={210}
        width={260}
        align="center"
        size={24}
        weight={800}
        color={palette.navy}
        opacity={trainingOpacity}
      >
        <Tex tex={'\\tau^1,\\ a^1'} size={26} color={palette.navy} />
      </Note>
      <Note
        x={1120}
        y={210}
        width={260}
        align="center"
        size={24}
        weight={800}
        color={palette.navy}
        opacity={trainingOpacity}
      >
        <Tex tex={'\\tau^2,\\ a^2'} size={26} color={palette.navy} />
      </Note>
      <Note x={888} y={212} size={24} weight={800} color={palette.green} opacity={trainingOpacity}>
        learning signal
      </Note>

      <Agent color={palette.blue} label="Actor 1" x={120} y={350} size={140} delay={12} />
      <Agent color={palette.orange} label="Actor 2" x={1468} y={350} size={140} delay={26} direction="left" />

      <div style={{position: 'absolute', left: 484, top: 386, width: 760}}>
        <Equation
          latex={'\\pi_i\\!\\left(a^i \\mid o^i\\right)'}
          size={48}
          delay={200}
          note="each actor keeps its own policy, and only its own observation"
        />
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 10 — Credit Assignment                                              */
/* A prediction pause. One reward, three contributions, three          */
/* identical lines, and the open question. Nothing else on the frame.  */
/* ------------------------------------------------------------------ */

const CONTRIBUTORS = [
  {color: palette.blue, label: 'delivered the plate', x: 250},
  {color: palette.orange, label: 'cleared the path', x: 794},
  {color: palette.green, label: 'prepared the station', x: 1338},
];

const Credit = () => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 15) * 0.028;

  return (
    <>
      <Note x={464} y={6} width={800} align="center" size={22} weight={850} color={palette.muted}>
        <span style={{letterSpacing: '0.2em'}}>TEAM REWARD</span>
      </Note>
      <div
        style={{
          position: 'absolute',
          left: 464,
          top: 36,
          width: 800,
          textAlign: 'center',
          fontFamily,
          fontSize: 118,
          lineHeight: 1,
          fontWeight: 950,
          letterSpacing: '-0.05em',
          color: palette.green,
          opacity: interpolate(frame, [10, 42], [0, 1], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          scale: pulse,
        }}
      >
        +1
      </div>

      <svg
        style={{position: 'absolute', left: 0, top: 0, width: CONTENT_W, height: CONTENT_H}}
        viewBox={`0 0 ${CONTENT_W} ${CONTENT_H}`}
      >
        {CONTRIBUTORS.map((c, index) => {
          const from: Pt = [c.x + 66, 292];
          const to: Pt = [830 + index * 34, 178];
          return (
            <g key={c.label}>
              <path
                d={`M${from[0]} ${from[1]} L${to[0]} ${to[1]}`}
                stroke={c.color}
                strokeWidth={5}
                strokeLinecap="round"
                opacity={0.45}
                pathLength={1}
                strokeDasharray={`${interpolate(frame, [120 + index * 22, 190 + index * 22], [0, 1], {
                  easing: Easing.bezier(0.4, 0, 0.3, 1),
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                })} 1`}
              />
              <text
                x={(from[0] + to[0]) / 2 + (index === 1 ? 30 : 0)}
                y={218}
                textAnchor="middle"
                fontFamily={fontFamily}
                fontSize={38}
                fontWeight={900}
                fill={palette.muted}
                opacity={interpolate(frame, [250 + index * 26, 290 + index * 26], [0, 0.75], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                })}
              >
                ?
              </text>
            </g>
          );
        })}
      </svg>

      {CONTRIBUTORS.map((c, index) => (
        <Agent key={c.label} color={c.color} label={c.label} x={c.x} y={300} size={132} delay={30 + index * 16} />
      ))}

      <Note
        x={264}
        y={530}
        width={1200}
        align="center"
        size={54}
        weight={900}
        color={palette.ink}
        opacity={interpolate(frame, [340, 386], [0, 1], {
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })}
      >
        Which action earned it?
      </Note>

    </>
  );
};

/* ------------------------------------------------------------------ */
/* 11 — Value Decomposition Networks                                   */
/* Three utilities laid end to end become the team value. The sum is   */
/* shown, not described, and the maths sits on white underneath.       */
/* ------------------------------------------------------------------ */

const UNIT = 55;
const BAR_X = 580;
const UTILITIES = [
  {tex: 'Q_1', value: 5.2, color: palette.blue},
  {tex: 'Q_2', value: 3.4, color: palette.orange},
  {tex: 'Q_3', value: 4.1, color: palette.green},
];

const Vdn = () => {
  const frame = useCurrentFrame();
  let offset = 0;

  return (
    <>
      {UTILITIES.map((u, index) => {
        const top = 20 + index * 76;
        return (
          <div key={u.tex}>
            <div
              style={{
                position: 'absolute',
                left: 380,
                top: top - 4,
                width: 170,
                textAlign: 'right',
                opacity: interpolate(frame, [16 + index * 30, 40 + index * 30], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
              }}
            >
              <Tex tex={u.tex} size={34} />
            </div>
            <div
              style={{
                position: 'absolute',
                left: BAR_X,
                top,
                height: 32,
                borderRadius: 16,
                background: u.color,
                width: interpolate(frame, [20 + index * 30, 66 + index * 30], [0, u.value * UNIT], {
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
              }}
            />
            <Note
              x={BAR_X + u.value * UNIT + 22}
              y={top - 2}
              size={29}
              weight={850}
              color={palette.ink}
              opacity={interpolate(frame, [56 + index * 30, 80 + index * 30], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}
            >
              {u.value.toFixed(1)}
            </Note>
          </div>
        );
      })}

      <div
        style={{
          position: 'absolute',
          left: 380,
          top: 282,
          width: 170,
          textAlign: 'right',
          opacity: interpolate(frame, [190, 220], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}
      >
        <Tex tex="Q_{\mathrm{tot}}" size={34} />
      </div>

      {UTILITIES.map((u, index) => {
        const left = BAR_X + offset;
        offset += u.value * UNIT;
        return (
          <div
            key={`sum-${u.tex}`}
            style={{
              position: 'absolute',
              left,
              top: 280,
              height: 40,
              borderRadius: index === 0 ? '20px 4px 4px 20px' : index === 2 ? '4px 20px 20px 4px' : 4,
              background: u.color,
              width: interpolate(frame, [200 + index * 40, 250 + index * 40], [0, u.value * UNIT - 4], {
                easing: Easing.bezier(0.16, 1, 0.3, 1),
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          />
        );
      })}

      {[866, 1053].map((x, index) => (
        <Note
          key={x}
          x={x - 20}
          y={240}
          width={40}
          align="center"
          size={30}
          weight={900}
          color={palette.navy}
          opacity={interpolate(frame, [250 + index * 40, 280 + index * 40], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })}
        >
          +
        </Note>
      ))}

      <Note
        x={1301}
        y={286}
        size={31}
        weight={900}
        color={palette.ink}
        opacity={interpolate(frame, [320, 352], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
      >
        12.7
      </Note>

      <div style={{position: 'absolute', left: 214, top: 344, width: 1300}}>
        <Equation
          latex={
            'Q_{\\mathrm{tot}}(\\boldsymbol{\\tau},\\mathbf{a})=\\textstyle\\sum_{i=1}^{n} Q_i\\!\\left(\\tau_i, a_i\\right)'
          }
          size={48}
          delay={340}
          note="the team value is exactly the sum of the per-agent utilities"
          terms={[
            {tex: 'Q_i', is: 'one agent’s utility'},
            {tex: '\\tau_i', is: 'its own history'},
          ]}
        />
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 12 — QMIX                                                           */
/* Summing versus mixing, shown as two shapes on one pair of axes      */
/* rather than as two boxes of prose. The maths sits on white beside   */
/* it, built in three steps.                                           */
/* ------------------------------------------------------------------ */

const Qmix = () => {
  const frame = useCurrentFrame();

  return (
    <>
      <svg
        style={{position: 'absolute', left: 60, top: 60, width: 820, height: 470, overflow: 'visible'}}
        viewBox="0 0 820 470"
      >
        <path
          d="M90 20 V390 H780"
          fill="none"
          stroke={palette.navy}
          strokeWidth={4}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${interpolate(frame, [0, 28], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} 1`}
        />
        <text x={78} y={18} textAnchor="end" fontFamily={fontFamily} fontSize={27} fontStyle="italic" fill={palette.muted}>
          Q
          <tspan fontSize={18} dy={7}>
            tot
          </tspan>
        </text>
        <text x={794} y={398} fontFamily={fontFamily} fontSize={27} fontStyle="italic" fill={palette.muted}>
          Q
          <tspan fontSize={18} dy={7}>
            i
          </tspan>
        </text>

        <path
          d="M90 370 L780 90"
          fill="none"
          stroke="#9FB4C8"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray="14 13"
          opacity={interpolate(frame, [40, 120], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
        />
        <path
          d="M90 370 C230 300, 310 175, 420 155 C540 133, 640 120, 780 90"
          fill="none"
          stroke={palette.purple}
          strokeWidth={13}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${interpolate(frame, [170, 330], [0, 1], {
            easing: Easing.bezier(0.4, 0, 0.3, 1),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })} 1`}
        />
      </svg>

      <div
        style={{
          position: 'absolute',
          left: 150,
          top: 532,
          width: 730,
          display: 'flex',
          gap: 54,
          alignItems: 'center',
          fontFamily,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            opacity: interpolate(frame, [140, 180], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          }}
        >
          <div style={{width: 46, height: 5, borderRadius: 3, background: 'repeating-linear-gradient(90deg, #9FB4C8 0 13px, transparent 13px 26px)'}} />
          <span style={{fontSize: 26, fontWeight: 800, color: palette.muted}}>VDN: a straight sum</span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            opacity: interpolate(frame, [300, 340], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          }}
        >
          <div style={{width: 46, height: 11, borderRadius: 6, background: palette.purple}} />
          <span style={{fontSize: 26, fontWeight: 800, color: palette.purple}}>QMIX: any rising shape</span>
        </div>
      </div>

      <div style={{position: 'absolute', left: 940, top: 30, width: 760}}>
        <Equation
          latex={'Q_{\\mathrm{tot}} = f_{s}\\!\\left(Q_1,\\dots,Q_n\\right)'}
          size={46}
          delay={350}
          note="a learned mixer, conditioned on the global state"
        />
      </div>
      <div style={{position: 'absolute', left: 940, top: 280, width: 760}}>
        <Equation
          latex={'\\frac{\\partial Q_{\\mathrm{tot}}}{\\partial Q_i} \\;\\ge\\; 0'}
          size={46}
          delay={470}
          note="raising one agent’s utility can never lower the team value"
        />
      </div>
      <Note
        x={940}
        y={578}
        width={760}
        align="center"
        size={27}
        weight={800}
        color={palette.ink}
        opacity={interpolate(frame, [600, 640], [0, 1], {
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })}
      >
        so each agent can still choose greedily on its own
      </Note>
    </>
  );
};

export const CoordinationVisuals: React.FC<{sceneIndex: number}> = ({sceneIndex}) => {
  switch (sceneIndex) {
    case 5:
      return <Coordination />;
    case 6:
      return <Scaling />;
    case 7:
      return <IndependentLearning />;
    case 8:
      return <CentralizedDecentralized />;
    case 9:
      return <Ctde />;
    case 10:
      return <Credit />;
    case 11:
      return <Vdn />;
    default:
      return <Qmix />;
  }
};
