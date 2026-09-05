import katex from 'katex';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {fontFamily, palette} from '../constants';
import {LlmAgent} from '../components/LlmAgent';
import {Equation} from '../../CoreExplainer/components/Equation';

/**
 * THE FORMALISM SECTION
 *
 * Three scenes, three different shapes, because the section's job is to move
 * the viewer from a diagram they already know to a notation they already know,
 * and neither move should feel like a new slide.
 *
 *   05 LLMs as Agents           a block diagram that transforms in place
 *   06 When Actions Are Language a comparison that builds itself, then maths
 *   07 Who Gets Credit?          a scenario that plays out, then three
 *                                alternatives it deliberately does not resolve
 *
 * SOURCING. Scene 05 and 06 carry `sourceNote` "Liu, Liang, Lyu & Amato,
 * AAAI-26", drawn by SceneShell. Nothing here asserts more than that paper
 * states: a Dec-POMDP formulation of LLM collaboration. No numbers are
 * invented. The "+1" in scene 07 is an illustrative task reward and is
 * labelled as a task reward, not as a reported result.
 *
 * GEOMETRY. The content box handed down by SceneShell is 1728 x 690 and it
 * does not clip. Every coordinate below is relative to that box and nothing is
 * placed past y = 620.
 */

const CONTENT_W = 1728;
const CONTENT_H = 690;

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

/* ------------------------------------------------------------------ */
/* Local primitives. None of them draws a border.                      */
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
  opacity?: number;
  spacing?: string;
}> = ({
  children,
  x = 0,
  y,
  width,
  size = 26,
  weight = 700,
  color = palette.muted,
  align = 'left',
  opacity = 1,
  spacing = '-0.01em',
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
      lineHeight: 1.24,
      letterSpacing: spacing,
      opacity,
    }}
  >
    {children}
  </div>
);

/** A solid label block in a block diagram. Filled, never outlined. */
const Chip: React.FC<{
  x: number;
  y: number;
  w: number;
  h?: number;
  text: string;
  fill: string;
  color?: string;
  delay: number;
  size?: number;
}> = ({x, y, w, h = 68, text, fill, color = palette.ink, delay, size = 27}) => {
  const frame = useCurrentFrame();
  return (
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
        color,
        opacity: interpolate(frame, [delay, delay + 20], [0, 1], {
          easing: EASE,
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
        scale: interpolate(frame, [delay, delay + 20], [0.9, 1], {
          easing: EASE,
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          output: 'perceptual-scale',
        }),
      }}
    >
      {text}
    </div>
  );
};

/** A stack of bars that stands in for text without pretending to be text. */
const Bars: React.FC<{widths: number[]; color: string; reveal?: number; h?: number; gap?: number}> = ({
  widths,
  color,
  reveal = 1,
  h = 8,
  gap = 9,
}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap}}>
    {widths.map((w, i) => {
      const shown = Math.max(0, Math.min(1, (reveal - i * 0.15) / 0.15));
      return (
        <div
          key={i}
          style={{
            width: `${w * shown}%`,
            height: h,
            borderRadius: h / 2,
            background: color,
            opacity: 0.28 + 0.5 * shown,
          }}
        />
      );
    })}
  </div>
);

/* ------------------------------------------------------------------ */
/* 05 — LLMs as Agents                                                 */
/*                                                                     */
/* A block-diagram transformation, and the transformation is the whole */
/* scene. The three slots of the RL abstraction never move, never fade */
/* out and are never cut away from; each one is rewritten in place, so */
/* the correspondence between observation/policy/action and            */
/* prompt+history/LLM/response is positional and unmistakable.         */
/*                                                                     */
/* No borders anywhere: three tinted fills and two arrows.             */
/* ------------------------------------------------------------------ */

/**
 * The pipeline is the only thing on screen for the first twenty seconds, so it
 * sits in the middle of the box while that is true, and lifts to make room
 * once the reward and environment rows arrive.
 */
const STAGE_TOP_CENTRED = 190;
const STAGE_TOP_LIFTED = 44;
const STAGE_H = 276;

const SLOTS = [
  {x: 24, w: 460},
  {x: 674, w: 380},
  {x: 1244, w: 460},
];

const MORPH_AT = [570, 750, 840];
const MORPH_LEN = 36;

const Slot: React.FC<{
  x: number;
  w: number;
  top: number;
  appear: number;
  morph: number;
  beforeKicker: string;
  afterKicker: string;
  before: React.ReactNode;
  after: React.ReactNode;
}> = ({x, w, top, appear, morph, beforeKicker, afterKicker, before, after}) => {
  const frame = useCurrentFrame();
  const m = interpolate(frame, [morph, morph + MORPH_LEN], [0, 1], {
    easing: EASE,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const kicker = (text: string, tint: string, o: number, dy: number) => (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 22,
        width: w,
        textAlign: 'center',
        fontFamily,
        fontSize: 22,
        fontWeight: 900,
        letterSpacing: '0.19em',
        color: tint,
        opacity: o,
        translate: `0px ${dy}px`,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top,
        width: w,
        height: STAGE_H,
        borderRadius: 30,
        overflow: 'hidden',
        fontFamily,
        opacity: interpolate(frame, [appear, appear + 26], [0, 1], {
          easing: EASE,
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
        scale: interpolate(frame, [appear, appear + 26], [0.93, 1], {
          easing: EASE,
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          output: 'perceptual-scale',
        }),
      }}
    >
      {/* the slot itself never leaves; only its tint is rewritten */}
      <div style={{position: 'absolute', inset: 0, background: palette.paleBlue, opacity: 1 - m}} />
      <div style={{position: 'absolute', inset: 0, background: palette.paleOrange, opacity: m}} />

      {/* the rewrite sweeps through, so the change reads as one motion */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: '38%',
          left: `${interpolate(frame, [morph - 6, morph + MORPH_LEN + 6], [-42, 142], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })}%`,
          background: `linear-gradient(90deg, transparent, ${palette.orange}44, transparent)`,
          opacity: interpolate(
            frame,
            [morph - 6, morph + 10, morph + 26, morph + MORPH_LEN + 6],
            [0, 1, 1, 0],
            {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
          ),
        }}
      />

      {kicker(beforeKicker, palette.navy, 1 - m, -m * 20)}
      {kicker(afterKicker, palette.orange, m, (1 - m) * 20)}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 62,
          bottom: 18,
          display: 'grid',
          placeItems: 'center',
          opacity: 1 - m,
          translate: `0px ${-m * 24}px`,
        }}
      >
        {before}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 62,
          bottom: 18,
          display: 'grid',
          placeItems: 'center',
          opacity: m,
          translate: `0px ${(1 - m) * 24}px`,
        }}
      >
        {after}
      </div>
    </div>
  );
};

const MappingRow: React.FC<{y: number; term: string; is: string; tint: string; delay: number}> = ({
  y,
  term,
  is,
  tint,
  delay,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + 24], [0, 1], {
    easing: EASE,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: 380,
        top: y,
        display: 'flex',
        alignItems: 'baseline',
        gap: 26,
        fontFamily,
        opacity: p,
        translate: `${(1 - p) * -18}px 0px`,
      }}
    >
      <div
        style={{
          width: 360,
          textAlign: 'right',
          fontSize: 42,
          fontWeight: 900,
          letterSpacing: '-0.03em',
          color: palette.ink,
        }}
      >
        {term}
      </div>
      <div style={{fontSize: 36, fontWeight: 800, color: tint, width: 46, textAlign: 'center'}}>→</div>
      <div style={{fontSize: 32, fontWeight: 700, color: palette.muted, whiteSpace: 'nowrap'}}>{is}</div>
    </div>
  );
};

const LlmsAsAgents = () => {
  const frame = useCurrentFrame();

  // one arrow tint crossfade, shared by both arrows, following the morph
  // navy -> orange as one colour, so the wire never washes out to grey
  const arrowTint = `rgb(${[
    [18, 245],
    [58, 158],
    [99, 66],
  ]
    .map(([a, b]) =>
      Math.round(
        interpolate(frame, [MORPH_AT[1], MORPH_AT[2] + MORPH_LEN], [a, b], {
          easing: Easing.bezier(0.4, 0, 0.3, 1),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
      ),
    )
    .join(',')})`;
  const draw = interpolate(frame, [40, 120], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // the response fills once, rather than looping, so nothing on a settled
  // frame resets while the viewer is reading the rest of it
  const stream = interpolate(frame, [MORPH_AT[2] + 8, MORPH_AT[2] + 116], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // the lift that makes room for the reward and environment rows
  const stageY = interpolate(frame, [870, 946], [STAGE_TOP_CENTRED, STAGE_TOP_LIFTED], {
    easing: EASE,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const stageMid = stageY + STAGE_H / 2;
  const capY = stageY + STAGE_H + 18;

  const arrows: [number, number][] = [
    [502, 656],
    [1072, 1226],
  ];

  return (
    <>
      <Note
        x={264}
        y={stageY - 42}
        width={1200}
        align="center"
        size={23}
        weight={850}
        spacing="0.14em"
        color={palette.muted}
        opacity={interpolate(frame, [300, 344], [0, 1], {
          easing: EASE,
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })}
      >
        formulated as a Dec-POMDP — decentralised, partially observable
      </Note>

      <svg
        style={{position: 'absolute', left: 0, top: 0, width: CONTENT_W, height: CONTENT_H}}
        viewBox={`0 0 ${CONTENT_W} ${CONTENT_H}`}
      >
        {/* the wires do not change; only what sits in the slots does, so each
            arrow is one path that is re-tinted rather than two crossfading */}
        {arrows.map(([x1, x2]) => (
          <g key={x1} opacity={0.92}>
            <path
              d={`M${x1} ${stageMid} H${x2 - 16}`}
              fill="none"
              stroke={arrowTint}
              strokeWidth={7}
              strokeLinecap="round"
              opacity={draw > 0.001 ? 1 : 0}
              pathLength={1}
              strokeDasharray={`${draw} 1`}
            />
            <path
              d={`M${x2 - 18} ${stageMid - 15} L${x2 + 4} ${stageMid} L${x2 - 18} ${stageMid + 15} z`}
              fill={arrowTint}
              opacity={draw > 0.98 ? 1 : 0}
            />
          </g>
        ))}

        {/* the rule that separates the pipeline from what surrounds it */}
        <path
          d="M180 410 H1548"
          stroke={palette.line}
          strokeWidth={3}
          pathLength={1}
          strokeDasharray={`${interpolate(frame, [900, 970], [0, 1], {
            easing: Easing.bezier(0.4, 0, 0.3, 1),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })} 1`}
        />
      </svg>

      <Slot
        x={SLOTS[0].x}
        w={SLOTS[0].w}
        top={stageY}
        appear={10}
        morph={MORPH_AT[0]}
        beforeKicker="OBSERVATION"
        afterKicker="PROMPT + HISTORY"
        before={<Tex tex="o^i_t" size={62} />}
        after={
          <div style={{display: 'flex', gap: 32}}>
            {[
              {label: 'prompt', widths: [92, 74, 84, 60]},
              {label: 'history', widths: [78, 92, 64, 86]},
            ].map((panel) => (
              <div key={panel.label}>
                <div
                  style={{
                    width: 188,
                    height: 92,
                    borderRadius: 16,
                    background: palette.white,
                    padding: 16,
                    boxSizing: 'border-box',
                  }}
                >
                  <Bars widths={panel.widths} color={palette.orange} h={8} gap={8} />
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: palette.muted,
                    textAlign: 'center',
                    marginTop: 8,
                  }}
                >
                  {panel.label}
                </div>
              </div>
            ))}
          </div>
        }
      />

      <Slot
        x={SLOTS[1].x}
        w={SLOTS[1].w}
        top={stageY}
        appear={28}
        morph={MORPH_AT[1]}
        beforeKicker="POLICY"
        afterKicker="LLM"
        before={<Tex tex="\pi_i\!\left(a^i \mid o^i\right)" size={38} />}
        after={
          <div style={{position: 'absolute', inset: 0}}>
            <LlmAgent
              color={palette.orange}
              x={(SLOTS[1].w - 96) / 2}
              y={50}
              size={96}
              busy
              delay={MORPH_AT[1]}
            />
          </div>
        }
      />

      <Slot
        x={SLOTS[2].x}
        w={SLOTS[2].w}
        top={stageY}
        appear={46}
        morph={MORPH_AT[2]}
        beforeKicker="ACTION"
        afterKicker="RESPONSE"
        before={<Tex tex="a^i_t" size={62} />}
        after={
          <div
            style={{
              width: 404,
              height: 128,
              borderRadius: 18,
              background: palette.white,
              padding: 20,
              boxSizing: 'border-box',
            }}
          >
            <Bars
              widths={[96, 82, 94, 70, 88]}
              color={palette.orange}
              reveal={stream}
              h={9}
              gap={11}
            />
          </div>
        }
      />

      <Note
        x={264}
        y={capY}
        width={1200}
        align="center"
        size={27}
        weight={750}
        opacity={interpolate(frame, [140, 190, 540, 574], [0, 1, 1, 0], {
          easing: EASE,
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })}
      >
        the abstraction from the rest of this course
      </Note>

      {[
        {i: 0, text: 'instructions and interaction history'},
        {i: 1, text: 'the model is the policy'},
        {i: 2, text: 'the text it generates'},
      ].map(({i, text}) => (
        <Note
          key={i}
          x={SLOTS[i].x}
          y={capY}
          width={SLOTS[i].w}
          align="center"
          size={24}
          weight={750}
          opacity={interpolate(frame, [MORPH_AT[i] + 44, MORPH_AT[i] + 80], [0, 1], {
            easing: EASE,
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })}
        >
          {text}
        </Note>
      ))}

      <MappingRow y={462} term="Reward" is="a shared task score" tint={palette.green} delay={930} />
      <MappingRow
        y={570}
        term="Environment"
        is="a user, a tool, or an external system"
        tint={palette.blue}
        delay={1020}
      />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 06 — When Actions Are Language                                      */
/*                                                                     */
/* A comparison, so the two sides are the two bordered containers the  */
/* bar allows, and they are the only borders in this file. The left    */
/* one is small and stays small; the right one grows past what it can  */
/* hold and is clipped, with the text fading out at the cut. The size  */
/* difference is the argument, which is why the heading is held back   */
/* to eleven seconds and the notation arrives only after it.           */
/* ------------------------------------------------------------------ */

const RESPONSE_TEXT =
  'First, I would restructure the data-loading module so the batching logic is separated from file I/O. Then the retry path only wraps the network call, and a failed shard can be re-fetched without discarding the batch that was already assembled. I would also add a bounded queue between the two stages, so a slow reader cannot exhaust memory while the writer keeps going. After that, the checkpoint format needs a version field, otherwise a resumed run silently reads the old layout. Finally, I would move the shuffle seed into the config, log it with every run, and add a test that replays a fixed seed end to end, so the ordering is reproducible across machines and in CI. One more thing: the error message on a truncated shard should name the file, not just the byte offset, because that is what anyone debugging this at three in the morning actually needs.';

const ALTERNATIVES = ['MOVE RIGHT', 'PICK UP', 'WAIT'];

const ActionsAreLanguage = () => {
  const frame = useCurrentFrame();

  // The comparison has to exist before the heading does, so the right slot
  // arrives early with the opening of the response already in it — bigger than
  // the left one from the start — and then keeps growing while the narration
  // explains why it can.
  const typed = Math.round(
    interpolate(frame, [200, 330, 430, 790], [0, 240, 240, RESPONSE_TEXT.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  const grown = interpolate(frame, [190, 330, 430, 700], [128, 300, 300, 596], {
    easing: Easing.bezier(0.35, 0, 0.35, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const shrink = interpolate(frame, [792, 854], [0, 1], {
    easing: EASE,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rightH = grown + (326 - grown) * shrink;

  return (
    <>
      {/* LEFT: the compact action. Container one of two. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 6,
          width: 600,
          height: 230,
          boxSizing: 'border-box',
          borderRadius: 28,
          border: `3px solid ${palette.blue}`,
          background: palette.paleBlue,
          fontFamily,
          opacity: interpolate(frame, [10, 44], [0, 1], {
            easing: EASE,
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 28,
            top: 22,
            fontSize: 21,
            fontWeight: 900,
            letterSpacing: '0.19em',
            color: palette.blue,
          }}
        >
          MARL ACTION
        </div>
        <div
          style={{
            position: 'absolute',
            left: 28,
            top: 58,
            height: 72,
            padding: '0 26px',
            borderRadius: 16,
            background: palette.white,
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 38,
            fontWeight: 800,
            letterSpacing: '0.01em',
            color: palette.ink,
            opacity: interpolate(frame, [46, 78], [0, 1], {
              easing: EASE,
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          MOVE LEFT
        </div>
        <div
          style={{
            position: 'absolute',
            left: 28,
            top: 148,
            display: 'flex',
            gap: 10,
            opacity: interpolate(frame, [280, 318], [0, 1], {
              easing: EASE,
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          {ALTERNATIVES.map((a) => (
            <div
              key={a}
              style={{
                height: 34,
                padding: '0 14px',
                borderRadius: 10,
                background: 'rgba(30,144,255,0.16)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: '0.05em',
                color: palette.navy,
              }}
            >
              {a}
            </div>
          ))}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 28,
            top: 196,
            fontSize: 21,
            fontWeight: 750,
            color: palette.muted,
            opacity: interpolate(frame, [400, 438], [0, 1], {
              easing: EASE,
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          the whole action space fits on one line
        </div>
      </div>

      {/* RIGHT: the action that does not fit. Container two of two. */}
      <div
        style={{
          position: 'absolute',
          left: 660,
          top: 6,
          width: 1068,
          height: rightH,
          boxSizing: 'border-box',
          borderRadius: 28,
          border: `3px solid ${palette.orange}`,
          background: palette.paleOrange,
          overflow: 'hidden',
          fontFamily,
          opacity: interpolate(frame, [186, 220], [0, 1], {
            easing: EASE,
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 30,
            top: 22,
            fontSize: 21,
            fontWeight: 900,
            letterSpacing: '0.19em',
            color: palette.orange,
          }}
        >
          LLM ACTION
        </div>
        <div
          style={{
            position: 'absolute',
            left: 30,
            right: 30,
            top: 62,
            fontSize: 31,
            lineHeight: 1.42,
            fontWeight: 600,
            letterSpacing: '-0.005em',
            color: palette.ink,
          }}
        >
          {RESPONSE_TEXT.slice(0, typed)}
        </div>
        {/* the text keeps going past the edge of what a slot can hold */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 132,
            background: `linear-gradient(180deg, rgba(255,243,230,0), ${palette.paleOrange} 78%)`,
            opacity: interpolate(frame, [660, 740], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        />
      </div>

      <Note
        x={0}
        y={368}
        width={CONTENT_W}
        align="center"
        size={24}
        weight={850}
        spacing="0.15em"
        opacity={interpolate(frame, [852, 890], [0, 1], {
          easing: EASE,
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })}
      >
        the notation is unchanged
      </Note>

      <div style={{position: 'absolute', left: 264, top: 400, width: 1200}}>
        <Equation
          latex={'\\mathbf{a}_t = \\left(a_t^{1}, \\ldots, a_t^{n}\\right)'}
          size={52}
          delay={866}
          note="each aₜⁱ can be a complete response"
        />
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 07 — Who Gets Credit for a Team Outcome?                            */
/*                                                                     */
/* A scenario that plays out before it is named: two agents, two       */
/* contributions, one program, one test run, one number. The number    */
/* then travels back down the same wires it came along, and a question */
/* mark lands over each agent. Only then does the heading arrive.      */
/*                                                                     */
/* The three alternatives are surfaced and left open on purpose. None  */
/* is highlighted, none is ruled out, and nothing on the frame picks   */
/* between them, because the point is that the reward cannot.          */
/*                                                                     */
/* The +1 is an illustrative task reward, not a reported result.       */
/* ------------------------------------------------------------------ */

const BRANCH_A: Pt[] = [
  [156, 106],
  [232, 106],
  [522, 106],
  [700, 202],
  [980, 216],
  [1060, 216],
  [1330, 216],
  [1420, 216],
];
const BRANCH_B: Pt[] = [
  [156, 326],
  [232, 326],
  [522, 326],
  [700, 230],
  [980, 216],
  [1060, 216],
  [1330, 216],
  [1420, 216],
];

const OPTIONS = [
  {
    tint: palette.blue,
    title: 'Was the plan responsible?',
    sub: 'the implementation merely executed it',
    delay: 600,
  },
  {
    tint: palette.orange,
    title: 'Did the implementation correct a weak plan?',
    sub: 'the plan was the weaker contribution',
    delay: 690,
  },
  {
    tint: palette.navy,
    title: 'Was neither useful without the other?',
    sub: 'only the combination did anything',
    delay: 810,
  },
];

const CreditForTeamOutcome = () => {
  const frame = useCurrentFrame();

  // the reward retraces the wires it arrived along
  const back = interpolate(frame, [440, 560], [1, 0], {
    easing: Easing.bezier(0.4, 0, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const backO = interpolate(frame, [436, 452, 552, 572], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tokenA = polyPoint(BRANCH_A, back);
  const tokenB = polyPoint(BRANCH_B, back);

  const merge = interpolate(frame, [252, 316], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const feed = interpolate(frame, [96, 150], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const toTests = interpolate(frame, [318, 352], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const toReward = interpolate(frame, [372, 404], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  /** An arrowhead only exists once its wire has finished drawing. */
  const head = (progress: number) =>
    interpolate(progress, [0.86, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <>
      {/* The scenario is alone on the frame for the first twenty seconds, so it
          sits lower while that is true and lifts once the alternatives arrive. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          translate: `0px ${interpolate(frame, [540, 622], [104, 0], {
            easing: EASE,
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })}px`,
        }}
      >
      <svg
        style={{position: 'absolute', left: 0, top: 0, width: CONTENT_W, height: CONTENT_H}}
        viewBox={`0 0 ${CONTENT_W} ${CONTENT_H}`}
      >
        {/* An SVG marker is drawn at the path end even while the stroke is
            dashed away, so a marker arrowhead floats out ahead of a line that
            is still drawing. Each head is an explicit triangle instead, faded
            in as its own wire finishes. */}
        {[106, 326].map((y) => (
          <g key={y}>
            <path
              d={`M140 ${y} H198`}
              fill="none"
              stroke="#8FA6BC"
              strokeWidth={6}
              strokeLinecap="round"
              opacity={feed > 0.001 ? 1 : 0}
              pathLength={1}
              strokeDasharray={`${feed} 1`}
            />
            <path d={`M198 ${y - 14} L218 ${y} L198 ${y + 14} z`} fill="#8FA6BC" opacity={head(feed)} />
          </g>
        ))}

        <path
          d="M522 106 C 606 106, 606 194, 674 200"
          fill="none"
          stroke={palette.blue}
          strokeWidth={7}
          strokeLinecap="round"
          opacity={merge > 0.001 ? 0.75 : 0}
          pathLength={1}
          strokeDasharray={`${merge} 1`}
        />
        <path d="M676 186 L698 201 L676 214 z" fill={palette.blue} opacity={head(merge) * 0.8} />
        <path
          d="M522 326 C 606 326, 606 238, 674 232"
          fill="none"
          stroke={palette.orange}
          strokeWidth={7}
          strokeLinecap="round"
          opacity={merge > 0.001 ? 0.75 : 0}
          pathLength={1}
          strokeDasharray={`${merge} 1`}
        />
        <path d="M676 218 L698 231 L676 246 z" fill={palette.orange} opacity={head(merge) * 0.8} />

        <path
          d="M988 216 H1030"
          fill="none"
          stroke="#8FA6BC"
          strokeWidth={6}
          strokeLinecap="round"
          opacity={toTests > 0.001 ? 1 : 0}
          pathLength={1}
          strokeDasharray={`${toTests} 1`}
        />
        <path d="M1030 202 L1050 216 L1030 230 z" fill="#8FA6BC" opacity={head(toTests)} />

        <path
          d="M1338 216 H1386"
          fill="none"
          stroke={palette.green}
          strokeWidth={6}
          strokeLinecap="round"
          opacity={toReward > 0.001 ? 1 : 0}
          pathLength={1}
          strokeDasharray={`${toReward} 1`}
        />
        <path d="M1386 202 L1406 216 L1386 230 z" fill={palette.green} opacity={head(toReward)} />

        {/* the same number, sent back to both of them */}
        {[tokenA, tokenB].map((p, i) => (
          <g key={i} opacity={backO}>
            <circle cx={p[0]} cy={p[1]} r={26} fill={palette.green} opacity={0.16} />
            <circle cx={p[0]} cy={p[1]} r={17} fill={palette.green} />
            <text
              x={p[0]}
              y={p[1] + 7}
              textAnchor="middle"
              fontFamily={fontFamily}
              fontSize={19}
              fontWeight={900}
              fill={palette.white}
            >
              +1
            </text>
          </g>
        ))}
      </svg>

      <LlmAgent color={palette.blue} label="LLM A" x={40} y={60} size={92} delay={10} />
      <LlmAgent color={palette.orange} label="LLM B" x={40} y={280} size={92} delay={28} />

      <Chip x={232} y={72} w={290} text="PLAN" fill="rgba(30,144,255,0.16)" delay={120} />
      <Chip
        x={232}
        y={292}
        w={290}
        text="IMPLEMENTATION"
        fill="rgba(245,158,66,0.20)"
        delay={200}
        size={24}
      />
      <Chip x={700} y={182} w={280} text="PROGRAM" fill="#E4ECF4" delay={290} />
      <Chip x={1060} y={182} w={270} text="TESTS PASS" fill="rgba(36,166,106,0.18)" delay={330} />

      <div
        style={{
          position: 'absolute',
          left: 1380,
          top: 158,
          width: 200,
          textAlign: 'center',
          fontFamily,
          fontSize: 108,
          lineHeight: 1,
          fontWeight: 950,
          letterSpacing: '-0.05em',
          color: palette.green,
          opacity: interpolate(frame, [390, 424], [0, 1], {
            easing: EASE,
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          scale: 1 + Math.sin(frame / 14) * 0.025,
        }}
      >
        +1
      </div>
      <Note
        x={1380}
        y={274}
        width={200}
        align="center"
        size={20}
        weight={850}
        spacing="0.16em"
        opacity={interpolate(frame, [402, 436], [0, 1], {
          easing: EASE,
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })}
      >
        TASK REWARD
      </Note>

      {[2, 222].map((y, i) => (
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
            opacity: interpolate(frame, [566 + i * 18, 600 + i * 18], [0, 0.85], {
              easing: EASE,
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            translate: `0px ${interpolate(frame, [566 + i * 18, 600 + i * 18], [12, 0], {
              easing: EASE,
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })}px`,
          }}
        >
          ?
        </div>
      ))}

      </div>

      {/* one label for all three columns, so it cannot be read as belonging
          to the middle one */}
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
          opacity: interpolate(frame, [576, 612], [0, 1], {
            easing: EASE,
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
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

      {OPTIONS.map((o, i) => {
        const p = interpolate(frame, [o.delay, o.delay + 28], [0, 1], {
          easing: EASE,
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={o.title}
            style={{
              position: 'absolute',
              left: 24 + i * 580,
              top: 486,
              width: 520,
              fontFamily,
              opacity: p,
              translate: `0px ${(1 - p) * 16}px`,
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
        );
      })}

    </>
  );
};

export const FormalismVisuals: React.FC<{sceneIndex: number}> = ({sceneIndex}) => {
  switch (sceneIndex) {
    case 5:
      return <LlmsAsAgents />;
    case 6:
      return <ActionsAreLanguage />;
    case 7:
    default:
      return <CreditForTeamOutcome />;
  }
};
