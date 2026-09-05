import {Easing, interpolate, interpolateColors, useCurrentFrame} from 'remotion';
import {chapterColors, fontFamily, palette} from '../constants';
import {Agent} from '../components/Agent';

/**
 * SYNTHESIS — one object, carried to the end
 *
 * These four frames are the calm close of the piece, and they are deliberately
 * a single continuous shot rather than four slides. Nothing here is boxed.
 *
 * THE THREAD
 * The Adaptation section ends on the cross-play matrix. Scene 24 opens on that
 * exact matrix, strips it to its four self-play cells, and merges those cells
 * into the Adapt pillar — so the last thing the viewer studied becomes the
 * third of the three pillars rather than being replaced by them. The other two
 * pillars then grow backwards along a thread towards it, in narration order.
 *
 * The same three tiles are then the only structural object for the rest of the
 * video:
 *
 *   24  three pillars in a row, joined by a thread
 *   25  the row folds down into a vertical spine; each takeaway ATTACHES to the
 *       pillar it belongs to, one at a time, and a fourth row above them holds
 *       the setting that all three stand on
 *   26  the same four rows, same tiles, same colours — the settled statements
 *       fade and an open question takes each one's place, so "what is settled"
 *       and "where that stops" are literally the same structure
 *   27  the spine unfolds back into a row (the bookend of scene 24) while the
 *       last open question rises and resolves into the closing statement
 *
 * Every scene's frame 0 therefore reproduces the previous scene's last frame
 * exactly: the shared geometry constants and the shared Tile/Thread components
 * below are what make that a guarantee rather than a hand-copied coincidence.
 */

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Eased 0→1 (or a→b) ramp. Every timing in this file goes through it. */
const ramp = (frame: number, from: number, to: number, a = 0, b = 1) =>
  interpolate(frame, [from, to], [a, b], {
    easing: ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/* ------------------------------------------------------------------ */
/* Shared geometry — the contract between the four scenes              */
/* ------------------------------------------------------------------ */

const PILLARS = [
  {name: 'Coordinate', color: chapterColors.Coordinate, mark: 0, subtitle: 'Which joint action works?'},
  {name: 'Communicate', color: chapterColors.Communicate, mark: 1, subtitle: 'What is worth sharing?'},
  {name: 'Adapt', color: chapterColors.Adapt, mark: 2, subtitle: 'Will it work with new partners?'},
] as const;

/** Scene 24: the three pillars stand in a row. */
const WIDE_CX = [288, 864, 1440];
const WIDE_TOP = 100;
const WIDE_SIZE = 94;
const WIDE_LABEL_TOP = WIDE_TOP + WIDE_SIZE + 28; // 222

/** Scenes 25 and 26: the row has folded into a spine down the left margin. */
const SPINE_LEFT = 8;
const SPINE_SIZE = 76;
const ROW_TOPS = [58, 204, 350, 496];
const TILE_DY = 24;
const spineTop = (pillar: number) => ROW_TOPS[pillar + 1] + TILE_DY; // 228, 374, 520
const SPINE_CX = SPINE_LEFT + SPINE_SIZE / 2; // 46

/** Scene 27: the spine unfolds back into a row, tighter and higher. */
const FINAL_CX = [504, 864, 1224];
const FINAL_TOP = 96;
const FINAL_SIZE = 84;

const TEXT_LEFT = 116;
const TEXT_MAX = 1340;

/**
 * The four rows. Rows 1–3 belong to a pillar and carry its colour; row 0 is
 * the setting the three pillars stand on, which is why it gets a bar rather
 * than a tile — there are three pillars, not four.
 */
const ROWS = [
  {
    color: chapterColors.Background,
    eyebrow: 'The setting',
    title: 'Think jointly',
    body: 'Team return depends on local decisions being compatible with each other.',
    question: 'When does a single shared reward stop describing a real team?',
  },
  {
    color: chapterColors.Coordinate,
    eyebrow: 'Coordinate',
    title: 'Train with structure',
    body: 'CTDE, VDN and QMIX connect a global value to an individual action.',
    question: 'Value decomposition assumes team value factors. What if it does not?',
  },
  {
    color: chapterColors.Communicate,
    eyebrow: 'Communicate',
    title: 'Treat messages as decisions',
    body: 'Capacity, cost, delay and failure all shape what is worth saying.',
    question: 'What should an agent say when the channel is far smaller than what it knows?',
  },
  {
    color: chapterColors.Adapt,
    eyebrow: 'Adapt',
    title: 'Test new partnerships',
    body: 'Cross-play exposes conventions that do not survive a change of partner.',
    question: 'What evidence, before deployment, predicts success with an unmet partner?',
  },
] as const;

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */


/**
 * WHAT EACH CHAPTER DOES, IN ONE MARK
 *
 * These used to be the letters a, m and z — the notation for an action, a
 * message and a latent partner variable. On screen, stripped of the equations
 * that gave them meaning, they were just three arbitrary letters. Each is now
 * a miniature of the chapter's actual idea, drawn in the same line language as
 * the diagrams the viewer has been reading for twenty minutes.
 */
const PillarMark: React.FC<{mark: number; size: number}> = ({mark, size}) => {
  const s = palette.white;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      {mark === 0 ? (
        /* Coordinate: two separate choices arriving at one joint action */
        <g fill="none" stroke={s} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round">
          <path d="M 20 22 L 50 54" />
          <path d="M 80 22 L 50 54" />
          <path d="M 50 54 L 50 72" />
          <path d="M 36 60 L 50 76 L 64 60" />
        </g>
      ) : mark === 1 ? (
        /* Communicate: something crosses from one agent to the other */
        <g fill="none" stroke={s} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round">
          <circle cx={16} cy={50} r={11} fill={s} stroke="none" />
          <circle cx={84} cy={50} r={11} fill={s} stroke="none" />
          <path d="M 34 50 L 62 50" />
          <path d="M 52 38 L 66 50 L 52 62" />
        </g>
      ) : (
        /* Adapt: the agent stays, the partner it is paired with changes. A
           dashed circle and a curved arrow both dissolve at this size, so the
           mark is one bold arc turning around the agent instead. */
        <g fill="none" stroke={s} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round">
          <circle cx={50} cy={52} r={12} fill={s} stroke="none" />
          <path d="M 50 20 A 32 32 0 1 1 22 68" />
          <path d="M 38 18 L 52 20 L 50 34" />
        </g>
      )}
    </svg>
  );
};

/** A pillar. Filled, not bordered — this section has no bordered containers. */
const Tile: React.FC<{
  left: number;
  top: number;
  size: number;
  color: string;
  mark?: number;
  opacity?: number;
  /** Ring left over from the cross-play diagonal, in px. */
  ring?: number;
  glow?: boolean;
}> = ({left, top, size, color, mark, opacity = 1, ring = 0, glow = true}) => (
  <div
    style={{
      position: 'absolute',
      left,
      top,
      width: size,
      height: size,
      borderRadius: size * 0.298,
      background: color,
      color: palette.white,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily,
      fontSize: size * 0.553,
      fontWeight: 950,
      boxShadow: `${ring > 0 ? `0 0 0 ${ring}px ${palette.green}` : '0 0 0 0 transparent'}${
        glow ? `, 0 14px 30px ${color}44` : ''
      }`,
      opacity,
    }}
  >
    {mark === undefined ? null : <PillarMark mark={mark} size={size * 0.74} />}
  </div>
);

/**
 * The thread between the first and last pillar. Because it is defined by its
 * two endpoints and drawn as a rotated bar, the same component is the
 * horizontal chain of scene 24, the vertical spine of scenes 25 and 26, and
 * every in-between state of the fold.
 */
const Thread: React.FC<{
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  reveal?: number;
  opacity?: number;
  flat?: string;
}> = ({x0, y0, x1, y1, reveal = 1, opacity = 1, flat}) => {
  const length = Math.hypot(x1 - x0, y1 - y0);
  const angle = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
  return (
    <div
      style={{
        position: 'absolute',
        left: x0,
        top: y0 - 2.5,
        width: Math.max(0, length * reveal),
        height: 5,
        borderRadius: 5,
        overflow: 'hidden',
        transformOrigin: '0 50%',
        rotate: `${angle}deg`,
        opacity,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: length,
          height: 5,
          borderRadius: 5,
          background:
            flat ??
            `linear-gradient(90deg, ${chapterColors.Coordinate}, ${chapterColors.Communicate}, ${chapterColors.Adapt})`,
        }}
      />
    </div>
  );
};

/** The pillar's name and question, as they sit in the scene-24 row. */
const WideLabel: React.FC<{index: number; opacity: number; dy?: number}> = ({index, opacity, dy = 0}) => (
  <div
    style={{
      position: 'absolute',
      left: WIDE_CX[index] - 175,
      top: WIDE_LABEL_TOP,
      width: 350,
      textAlign: 'center',
      fontFamily,
      opacity,
      translate: `0px ${dy}px`,
    }}
  >
    <div style={{fontSize: 38, fontWeight: 950, color: PILLARS[index].color, letterSpacing: '-0.03em'}}>
      {PILLARS[index].name}
    </div>
    <div style={{fontSize: 27, lineHeight: 1.32, fontWeight: 700, color: palette.muted, marginTop: 12}}>
      {PILLARS[index].subtitle}
    </div>
  </div>
);

const ClosingLine: React.FC<{opacity: number; dy?: number}> = ({opacity, dy = 0}) => (
  <div
    style={{
      position: 'absolute',
      left: 214,
      right: 214,
      top: 466,
      textAlign: 'center',
      fontFamily,
      fontSize: 33,
      lineHeight: 1.45,
      fontWeight: 720,
      color: palette.muted,
      opacity,
      translate: `0px ${dy}px`,
    }}
  >
    Better information changes coordination, coordination shapes learned protocols, and partner
    diversity decides whether any of it generalizes.
  </div>
);

/** The small coloured name that labels a row in the spine layout. */
const Eyebrow: React.FC<{row: number; opacity: number}> = ({row, opacity}) => (
  <div
    style={{
      position: 'absolute',
      left: TEXT_LEFT,
      top: ROW_TOPS[row],
      fontFamily,
      fontSize: 23,
      fontWeight: 900,
      letterSpacing: '0.02em',
      color: ROWS[row].color,
      opacity,
    }}
  >
    {ROWS[row].eyebrow}
  </div>
);

const LeadLine: React.FC<{text: string; opacity: number}> = ({text, opacity}) => (
  <div
    style={{
      position: 'absolute',
      left: TEXT_LEFT,
      top: 0,
      fontFamily,
      fontSize: 26,
      fontWeight: 700,
      letterSpacing: '-0.01em',
      color: palette.muted,
      opacity,
    }}
  >
    {text}
  </div>
);

/** A settled takeaway: what the row says in scene 25. */
const Settled: React.FC<{row: number; opacity: number; dx?: number}> = ({row, opacity, dx = 0}) => (
  <>
    <div
      style={{
        position: 'absolute',
        left: TEXT_LEFT,
        top: ROW_TOPS[row] + 32,
        fontFamily,
        fontSize: 38,
        fontWeight: 930,
        lineHeight: 1.1,
        letterSpacing: '-0.03em',
        color: palette.ink,
        opacity,
        translate: `${dx}px 0px`,
      }}
    >
      {ROWS[row].title}
    </div>
    <div
      style={{
        position: 'absolute',
        left: TEXT_LEFT,
        top: ROW_TOPS[row] + 86,
        width: TEXT_MAX,
        fontFamily,
        fontSize: 26,
        fontWeight: 700,
        lineHeight: 1.34,
        color: palette.muted,
        opacity,
        translate: `${dx}px 0px`,
      }}
    >
      {ROWS[row].body}
    </div>
  </>
);

/** Where that stops: the same row, in scene 26. */
const Unsettled: React.FC<{row: number; opacity: number; dy?: number}> = ({row, opacity, dy = 0}) => (
  <div
    style={{
      position: 'absolute',
      left: TEXT_LEFT,
      top: ROW_TOPS[row] + 32,
      width: TEXT_MAX,
      fontFamily,
      fontSize: 33,
      fontWeight: 880,
      lineHeight: 1.3,
      letterSpacing: '-0.025em',
      color: palette.ink,
      opacity,
      translate: `0px ${dy}px`,
    }}
  >
    {ROWS[row].question}
  </div>
);

/* ------------------------------------------------------------------ */
/* 24 — The Whole Story                                                */
/* ------------------------------------------------------------------ */

/**
 * Opens on the cross-play matrix, at the exact geometry scene 23 left it in,
 * and grows the three pillars out of it. Nothing new appears until something
 * already on screen has become it.
 */
const RETURNS = [
  [0.94, 0.42, 0.68, 0.31],
  [0.46, 0.91, 0.38, 0.62],
  [0.65, 0.41, 0.96, 0.55],
  [0.29, 0.64, 0.57, 0.92],
];
const GRID_X = 112;
const GRID_Y = 64;
const CELL = 116;
const PITCH = 130;

const ADAPT_LEFT = WIDE_CX[2] - WIDE_SIZE / 2; // 1393

const WholeStory = () => {
  const frame = useCurrentFrame();

  // Everything that is not a self-play cell leaves first.
  const matrix = ramp(frame, 4, 30, 1, 0);
  const numbers = ramp(frame, 12, 30, 1, 0);

  // The four self-play cells travel together and become one tile.
  const merge = ramp(frame, 26, 76);
  const green = interpolate(frame, [56, 84], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const cellColor = interpolateColors(green, [0, 1], [palette.navy, chapterColors.Adapt]);
  const ring = lerp(6, 0, green);
  const travelling = frame < 90;

  // The thread reaches forward from Coordinate, arriving at each pillar as the
  // narration names it.
  const track = ramp(frame, 106, 136);
  // Linear, so the thread arrives at Communicate and at Adapt on the beat the
  // narration names each of them rather than racing ahead of the words.
  const reveal = interpolate(frame, [116, 476], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tileIn = [ramp(frame, 86, 112), ramp(frame, 292, 318), ramp(frame, 70, 90)];
  const labelIn = [ramp(frame, 112, 140), ramp(frame, 318, 346), ramp(frame, 468, 498)];

  return (
    <>
      {/* --- what scene 23 left on screen -------------------------------- */}
      {['B1', 'B2', 'B3', 'B4'].map((label, column) => (
        <div
          key={label}
          style={{
            position: 'absolute',
            left: GRID_X + column * PITCH,
            top: 18,
            width: CELL,
            textAlign: 'center',
            fontFamily,
            fontSize: 26,
            fontWeight: 900,
            color: palette.muted,
            opacity: matrix,
          }}
        >
          {label}
        </div>
      ))}

      {RETURNS.map((_, rowIndex) => (
        <div
          key={`side-${rowIndex}`}
          style={{
            position: 'absolute',
            left: 0,
            top: GRID_Y + rowIndex * PITCH,
            width: 92,
            height: CELL,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            fontFamily,
            fontSize: 26,
            fontWeight: 900,
            color: palette.muted,
            opacity: matrix,
          }}
        >
          A{rowIndex + 1}
        </div>
      ))}

      {RETURNS.flatMap((row, rowIndex) =>
        row
          .map((value, column) => ({value, column}))
          .filter(({column}) => column !== rowIndex)
          .map(({value, column}) => (
            <div
              key={`${rowIndex}-${column}`}
              style={{
                position: 'absolute',
                left: GRID_X + column * PITCH,
                top: GRID_Y + rowIndex * PITCH,
                width: CELL,
                height: CELL,
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily,
                fontSize: 30,
                fontWeight: 900,
                background: `rgba(30,144,255,${0.08 + value * 0.34})`,
                color: palette.navy,
                opacity: matrix,
              }}
            >
              {value.toFixed(2)}
            </div>
          )),
      )}

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 584,
          width: 618,
          textAlign: 'center',
          fontFamily,
          fontSize: 21,
          fontWeight: 700,
          lineHeight: 1.25,
          color: palette.muted,
          opacity: matrix,
        }}
      >
        Illustrative returns. Rows and columns are independently trained policies.
      </div>

      <div style={{position: 'absolute', left: 740, top: 170, width: 960, opacity: matrix}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
          <span
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: palette.navy,
              boxShadow: `0 0 0 5px ${palette.green}`,
              flexShrink: 0,
            }}
          />
          <span style={{fontFamily, fontSize: 30, fontWeight: 850, color: palette.ink}}>
            a policy with itself · 0.93 average
          </span>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 24, marginTop: 34}}>
          <span style={{width: 56, height: 56, borderRadius: 14, background: 'rgba(30,144,255,0.24)', flexShrink: 0}} />
          <span style={{fontFamily, fontSize: 30, fontWeight: 850, color: palette.ink}}>
            two policies trained apart · 0.50 average
          </span>
        </div>
        <div
          style={{
            marginTop: 46,
            width: 900,
            fontFamily,
            fontSize: 27,
            fontWeight: 700,
            lineHeight: 1.34,
            color: palette.muted,
          }}
        >
          A bright diagonal beside a dim off-diagonal means every training run found a different
          convention. General teamwork has to lift the off-diagonal, not the familiar pairings.
        </div>
      </div>

      {/* --- the thread and the pillars it carries ----------------------- */}
      <Thread
        x0={WIDE_CX[0]}
        y0={WIDE_TOP + WIDE_SIZE / 2}
        x1={WIDE_CX[2]}
        y1={WIDE_TOP + WIDE_SIZE / 2}
        opacity={track}
        flat={palette.line}
      />
      <Thread
        x0={WIDE_CX[0]}
        y0={WIDE_TOP + WIDE_SIZE / 2}
        x1={WIDE_CX[2]}
        y1={WIDE_TOP + WIDE_SIZE / 2}
        reveal={reveal}
      />

      {PILLARS.map((pillar, index) => (
        <Tile
          key={pillar.name}
          left={WIDE_CX[index] - WIDE_SIZE / 2}
          top={WIDE_TOP}
          size={WIDE_SIZE}
          color={pillar.color}
          // The Adapt mark rides in on its own layer, on top of the cells
          // that are still merging into it.
          mark={index === 2 ? undefined : pillar.mark}
          opacity={tileIn[index]}
        />
      ))}

      {/* The four self-play cells, on their way to becoming Adapt. */}
      {travelling &&
        RETURNS.map((row, index) => {
          const left = lerp(GRID_X + index * PITCH, ADAPT_LEFT, merge);
          const top = lerp(GRID_Y + index * PITCH, WIDE_TOP, merge);
          const size = lerp(CELL, WIDE_SIZE, merge);
          return (
            <div
              key={`self-${index}`}
              style={{
                position: 'absolute',
                left,
                top,
                width: size,
                height: size,
                borderRadius: lerp(20, WIDE_SIZE * 0.298, merge),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily,
                fontSize: 36,
                fontWeight: 900,
                background: cellColor,
                color: palette.white,
                boxShadow: ring > 0.05 ? `0 0 0 ${ring}px ${palette.green}` : 'none',
              }}
            >
              <span style={{opacity: numbers}}>{row[index].toFixed(2)}</span>
            </div>
          );
        })}

      <div
        style={{
          position: 'absolute',
          left: ADAPT_LEFT,
          top: WIDE_TOP,
          width: WIDE_SIZE,
          height: WIDE_SIZE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily,
          fontSize: WIDE_SIZE * 0.553,
          fontWeight: 950,
          color: palette.white,
          opacity: ramp(frame, 74, 98),
        }}
      >
        <PillarMark mark={PILLARS[2].mark} size={FINAL_SIZE * 0.74} />
      </div>

      {PILLARS.map((pillar, index) => (
        <WideLabel key={`label-${pillar.name}`} index={index} opacity={labelIn[index]} dy={(1 - labelIn[index]) * 14} />
      ))}

      <ClosingLine opacity={ramp(frame, 655, 700)} dy={(1 - ramp(frame, 655, 700)) * 16} />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 25 — Key Takeaways                                                  */
/* ------------------------------------------------------------------ */

/**
 * Opens on the three pillars exactly as scene 24 left them, then folds the row
 * into a spine so each takeaway can attach to the pillar it came from. The
 * takeaways arrive one at a time, on the beat of the narration.
 */
const Takeaways = () => {
  const frame = useCurrentFrame();

  // 0 = the scene-24 row, 1 = the spine.
  const fold = ramp(frame, 24, 96);
  const leaving = ramp(frame, 8, 36, 1, 0);
  const eyebrows = ramp(frame, 78, 104);

  // One takeaway at a time. Row 0 is the setting the three pillars stand on.
  const arrivals = [ramp(frame, 100, 140), ramp(frame, 250, 290), ramp(frame, 620, 660), ramp(frame, 870, 910)];

  const x0 = lerp(WIDE_CX[0], SPINE_CX, fold);
  const y0 = lerp(WIDE_TOP + WIDE_SIZE / 2, spineTop(0) + SPINE_SIZE / 2, fold);
  const x1 = lerp(WIDE_CX[2], SPINE_CX, fold);
  const y1 = lerp(WIDE_TOP + WIDE_SIZE / 2, spineTop(2) + SPINE_SIZE / 2, fold);

  return (
    <>
      <Thread x0={x0} y0={y0} x1={x1} y1={y1} flat={palette.line} />
      <Thread x0={x0} y0={y0} x1={x1} y1={y1} />

      {PILLARS.map((pillar, index) => (
        <Tile
          key={pillar.name}
          left={lerp(WIDE_CX[index] - WIDE_SIZE / 2, SPINE_LEFT, fold)}
          top={lerp(WIDE_TOP, spineTop(index), fold)}
          size={lerp(WIDE_SIZE, SPINE_SIZE, fold)}
          color={pillar.color}
          mark={pillar.mark}
        />
      ))}

      {/* The scene-24 labels, still in place at frame 0, then handed over to
          the small coloured names beside the tiles. */}
      {PILLARS.map((pillar, index) => (
        <WideLabel key={`wide-${pillar.name}`} index={index} opacity={leaving} />
      ))}
      <ClosingLine opacity={leaving} />

      <LeadLine text="What is settled." opacity={ramp(frame, 70, 100)} />

      {/* The setting gets a bar, not a tile: there are three pillars. */}
      <div
        style={{
          position: 'absolute',
          left: SPINE_LEFT,
          top: ROW_TOPS[0] + 58,
          width: SPINE_SIZE,
          height: 8,
          borderRadius: 8,
          background: ROWS[0].color,
          opacity: arrivals[0],
        }}
      />

      <Eyebrow row={0} opacity={arrivals[0]} />
      <Eyebrow row={1} opacity={eyebrows} />
      <Eyebrow row={2} opacity={eyebrows} />
      <Eyebrow row={3} opacity={eyebrows} />

      {ROWS.map((row, index) => (
        <Settled key={row.title} row={index} opacity={arrivals[index]} dx={(1 - arrivals[index]) * 20} />
      ))}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 26 — Open Questions                                                 */
/* ------------------------------------------------------------------ */

/**
 * Not a quiz. The four rows of scene 25 stay exactly where they are — same
 * tiles, same colours, same names — and the settled statement in each one is
 * replaced by the question that is still open there. Deliberately still: the
 * questions arrive on opacity alone.
 */
const FinalQuestions = () => {
  const frame = useCurrentFrame();

  /* The four takeaway rows are still on screen from scene 25; they clear so
     the questions can have the frame to themselves. */
  const settled = ramp(frame, 16, 52, 1, 0);
  const lead = ramp(frame, 62, 96) * ramp(frame, 150, 178, 1, 0);

  /* One at a time, with a real gap between each, matching the frontier
     explainer's closing frame. The last one is larger and is never cleared. */
  const asks = [
    {text: ROWS[0].question, in: 178, out: 320},
    {text: ROWS[1].question, in: 330, out: 528},
    {text: ROWS[2].question, in: 538, out: 706},
  ];
  const final = ramp(frame, 716, 760);
  const ruleIn = ramp(frame, 790, 850);
  const ruleWide = 200 + 140 * ramp(frame, 900, 1030);

  return (
    <>
      {/* what is settled, on its way out */}
      {settled > 0.004
        ? ROWS.map((row, i) => (
            <div
              key={`fq-${row.title}`}
              style={{
                position: 'absolute',
                left: TEXT_LEFT,
                top: ROW_TOPS[i] + 8,
                width: TEXT_MAX,
                fontFamily,
                opacity: settled * ramp(frame, 10 + i * 8, 46 + i * 8, 1, 0),
              }}
            >
              <div style={{fontSize: 22, fontWeight: 900, letterSpacing: '0.09em', color: row.color}}>
                {row.eyebrow.toUpperCase()}
              </div>
              <div style={{fontSize: 34, fontWeight: 930, color: palette.ink, marginTop: 6, letterSpacing: '-0.03em'}}>
                {row.title}
              </div>
            </div>
          ))
        : null}

      <LeadLine text="Four questions to carry forward." opacity={lead} />

      {asks.map((q) => {
        const o = ramp(frame, q.in, q.in + 22) * ramp(frame, q.out, q.out + 22, 1, 0);
        if (o <= 0.001) return null;
        return (
          <div
            key={q.text}
            style={{
              position: 'absolute',
              left: 164,
              width: 1400,
              top: 258,
              textAlign: 'center',
              fontFamily,
              fontSize: 48,
              lineHeight: 1.26,
              fontWeight: 860,
              letterSpacing: '-0.03em',
              color: palette.ink,
              opacity: o,
              translate: `0px ${(1 - o) * 10}px`,
            }}
          >
            {q.text}
          </div>
        );
      })}

      {/* the one the section ends on, held and not answered */}
      <div
        style={{
          position: 'absolute',
          left: 114,
          width: 1500,
          top: 238,
          textAlign: 'center',
          fontFamily,
          fontSize: 67,
          lineHeight: 1.2,
          fontWeight: 900,
          letterSpacing: '-0.04em',
          color: palette.ink,
          opacity: final,
          translate: `0px ${(1 - final) * 14}px`,
        }}
      >
        {ROWS[3].question}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 864 - ruleWide / 2,
          top: 452,
          width: ruleWide,
          height: 5,
          borderRadius: 5,
          background: chapterColors.Adapt,
          opacity: ruleIn * 0.5,
        }}
      />
    </>
  );
};


/* ------------------------------------------------------------------ */
/* 27 — Learn together. Act together.                                  */
/* ------------------------------------------------------------------ */

/**
 * The ending, not another slide. The spine unfolds back into the row of scene
 * 24 — the bookend — while the last open question rises out of its row and the
 * closing statement takes its place. The heading is the shell's; it is not
 * drawn here.
 */
const FinalFrame = () => {
  const frame = useCurrentFrame();

  const leaving = ramp(frame, 0, 20, 1, 0);
  // 0 = the spine of scene 26, 1 = the closing row.
  const unfold = ramp(frame, 18, 74);
  const lastQuestion = ramp(frame, 22, 58, 1, 0);
  const statement = ramp(frame, 58, 96);
  const names = ramp(frame, 76, 104);

  const x0 = lerp(SPINE_CX, FINAL_CX[0], unfold);
  const y0 = lerp(spineTop(0) + SPINE_SIZE / 2, FINAL_TOP + FINAL_SIZE / 2, unfold);
  const x1 = lerp(SPINE_CX, FINAL_CX[2], unfold);
  const y1 = lerp(spineTop(2) + SPINE_SIZE / 2, FINAL_TOP + FINAL_SIZE / 2, unfold);

  return (
    <>
      <Thread x0={x0} y0={y0} x1={x1} y1={y1} flat={palette.line} />
      <Thread x0={x0} y0={y0} x1={x1} y1={y1} />

      {PILLARS.map((pillar, index) => (
        <Tile
          key={pillar.name}
          left={lerp(SPINE_LEFT, FINAL_CX[index] - FINAL_SIZE / 2, unfold)}
          top={lerp(spineTop(index), FINAL_TOP, unfold)}
          size={lerp(SPINE_SIZE, FINAL_SIZE, unfold)}
          color={pillar.color}
          mark={pillar.mark}
        />
      ))}

      {/* Everything scene 26 ended on, stepping aside. */}
      <LeadLine text="Four questions to carry forward." opacity={leaving} />
      <div
        style={{
          position: 'absolute',
          left: SPINE_LEFT,
          top: ROW_TOPS[0] + 58,
          width: SPINE_SIZE,
          height: 8,
          borderRadius: 8,
          background: ROWS[0].color,
          opacity: leaving,
        }}
      />
      {ROWS.map((row, index) => (
        <Eyebrow key={row.eyebrow} row={index} opacity={leaving} />
      ))}
      <Unsettled row={0} opacity={leaving} />
      <Unsettled row={1} opacity={leaving} />
      <Unsettled row={2} opacity={leaving} />
      {/* The last open question rises into the place the answer will take. */}
      <Unsettled row={3} opacity={lastQuestion} dy={(1 - lastQuestion) * -212} />

      {PILLARS.map((pillar, index) => (
        <div
          key={`name-${pillar.name}`}
          style={{
            position: 'absolute',
            left: FINAL_CX[index] - 175,
            top: FINAL_TOP + FINAL_SIZE + 26,
            width: 350,
            textAlign: 'center',
            fontFamily,
            fontSize: 40,
            fontWeight: 930,
            letterSpacing: '-0.03em',
            color: pillar.color,
            opacity: names,
          }}
        >
          {pillar.name}
        </div>
      ))}

      <div
        style={{
          position: 'absolute',
          left: 160,
          right: 160,
          top: 300,
          textAlign: 'center',
          fontFamily,
          fontSize: 40,
          lineHeight: 1.28,
          fontWeight: 930,
          letterSpacing: '-0.04em',
          color: palette.ink,
          opacity: statement,
          translate: `0px ${(1 - statement) * 18}px`,
        }}
      >
        Agents that can coordinate, communicate, and adapt to unfamiliar partners
        and changing conditions to achieve shared goals reliably.
      </div>

    </>
  );
};

export const SynthesisVisuals: React.FC<{sceneIndex: number}> = ({sceneIndex}) => {
  switch (sceneIndex) {
    case 24: return <WholeStory />;
    case 25: return <Takeaways />;
    case 26: return <FinalQuestions />;
    case 27: return <FinalFrame />;
    default: return <SignOff />;
  }
};

/* ------------------------------------------------------------------ */
/* 29 — And That's It                                                  */
/* ------------------------------------------------------------------ */

/** Evenly spaced across the content box, centred on 864. */
const LINEUP = [354, 654, 954, 1254];
const LINEUP_COLORS = [
  chapterColors.Background,
  chapterColors.Coordinate,
  chapterColors.Communicate,
  chapterColors.Adapt,
];

/**
 * The sign-off. Not another content frame: the four agents that carried the
 * whole explainer walk into a row, their visors light up one after another in
 * a wave, and they say the one thing a viewer is owed at the end.
 *
 * The wave is what makes it read as a group rather than four separate heads —
 * each agent's glow is offset from its neighbour's, so the acknowledgement
 * travels along the line the way a real one would.
 */
const SignOff = () => {
  const frame = useCurrentFrame();

  const sentence = interpolate(frame, [10, 46], [0, 1], {easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const bubble = interpolate(frame, [130, 168], [0, 1], {easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const credit = interpolate(frame, [225, 265], [0, 1], {easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  // the bubble breathes rather than sitting still
  const bob = Math.sin(Math.max(0, frame - 130) / 17) * 4;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 164,
          top: 24,
          width: 1400,
          textAlign: 'center',
          fontFamily,
          fontSize: 40,
          lineHeight: 1.3,
          fontWeight: 830,
          letterSpacing: '-0.03em',
          color: palette.ink,
          opacity: sentence,
          translate: `0px ${(1 - sentence) * 14}px`,
        }}
      >
        You have the vocabulary now, and the questions that make it worth using.
      </div>

      {/* one bubble for the whole team, because the whole point was the team */}
      <div
        style={{
          position: 'absolute',
          left: 664,
          top: 196,
          width: 400,
          display: 'flex',
          justifyContent: 'center',
          opacity: bubble,
          scale: interpolate(bubble, [0, 1], [0.86, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', output: 'perceptual-scale'}),
          translate: `0px ${bob}px`,
        }}
      >
        <div
          style={{
            position: 'relative',
            background: palette.navy,
            color: palette.white,
            borderRadius: 26,
            padding: '18px 42px',
            fontFamily,
            fontSize: 44,
            fontWeight: 900,
            letterSpacing: '-0.02em',
            boxShadow: '0 18px 40px rgba(18,58,99,0.24)',
          }}
        >
          Thank you
          {/* the tail, pointing down at the line that is saying it */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: -13,
              translate: '-50% 0px',
              width: 26,
              height: 26,
              rotate: '45deg',
              background: palette.navy,
              borderRadius: 5,
            }}
          />
        </div>
      </div>

      {LINEUP.map((x, i) => {
        // they arrive in order, from the middle outward
        const enter = interpolate(frame, [16 + i * 14, 58 + i * 14], [0, 1], {
          easing: ease,
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        // the wave: each visor brightens after its neighbour, and it repeats
        const phase = ((frame - 150 - i * 9) % 108) / 108;
        const lit = frame < 150 ? 0 : Math.max(0, Math.sin(phase * Math.PI * 2)) ** 3;
        return (
          <div key={x} style={{opacity: enter, translate: `0px ${(1 - enter) * 26}px`}}>
            <div
              style={{
                position: 'absolute',
                left: x - 16,
                top: 302,
                width: 152,
                height: 152,
                borderRadius: '50%',
                background: LINEUP_COLORS[i],
                opacity: lit * 0.22,
                filter: 'blur(10px)',
              }}
            />
            <Agent color={LINEUP_COLORS[i]} label="" x={x} y={320} size={120} delay={16 + i * 14} />
          </div>
        );
      })}

      <div
        style={{
          position: 'absolute',
          left: 164,
          top: 520,
          width: 1400,
          textAlign: 'center',
          fontFamily,
          fontSize: 26,
          fontWeight: 760,
          letterSpacing: '0.02em',
          color: palette.muted,
          opacity: credit,
        }}
      >
        Multi-Agent Reinforcement Learning for Cooperative Environments
      </div>
    </>
  );
};
