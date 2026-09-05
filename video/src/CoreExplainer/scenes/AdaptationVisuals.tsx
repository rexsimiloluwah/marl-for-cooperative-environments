import {Easing, interpolate, interpolateColors, useCurrentFrame} from 'remotion';
import {Agent} from '../components/Agent';
import {Equation} from '../components/Equation';
import {fontFamily, palette} from '../constants';

/**
 * ADAPT — six scenes that never reset the canvas.
 *
 * THE STAGE
 * The section inherits its stage from the last frame of the Communication
 * section: Agent A on the left, a partner on the right, and the learned symbol
 * between them. Every position below is that stage, or a continuous move away
 * from it. Nothing in these six scenes opens on an empty frame.
 *
 * THE THREAD
 * One object is followed the whole way through. The learned symbol becomes the
 * message that Agent C misreads, then splits into the population's differing
 * signals, then docks inside the partner model, and finally the familiar and
 * unseen pairings the viewer has been watching become the two numbers in the
 * generalization ratio and then two cells of the cross-play matrix.
 *
 * COLOUR IS IDENTITY, and it does not change across a boundary:
 *   blue   — Agent A, the policy under test
 *   orange — Agent B, the partner it trained with
 *   purple — Agent C, the replacement, later one of the population
 *   grey   — a partner this policy has never met
 *
 * THE NUMBERS
 * 9.2, 5.8, 0.63 and the cross-play matrix are illustrative teaching values and
 * are labelled as such on screen. They are the same two numbers from the moment
 * they first appear, which is why the ratio can be built out of them rather
 * than announced.
 *
 * The content box is 1728 x 690. Every number below is inside it, and the
 * bottom band is left empty so nothing crowds the caption.
 */

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const PALE_RED = '#FDECEC';
const GHOST = '#B9C9DA';

const fade = (frame: number, from: number, to: number, a = 0, b = 1) =>
  interpolate(frame, [from, to], [a, b], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

const move = (frame: number, keys: number[], values: number[]) =>
  interpolate(frame, keys, values, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE});

const caps: React.CSSProperties = {
  fontFamily,
  fontSize: 22,
  fontWeight: 900,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: palette.muted,
};

/* ------------------------------------------------------------------ */
/* THE INHERITED STAGE                                                  */
/* ------------------------------------------------------------------ */

/** Agent tops, inherited from the end of the Communication section. */
const HERO_Y = 250;
const AGENT = 120;
/** Head centre line. Every channel, arrow and lane sits on it. */
const HERO_MID = HERO_Y + AGENT / 2; // 310

const A_X = 120; // Agent A
const PARTNER_X = 1490; // the partner slot
const NEAR_X = 1010; // the second partner slot, used from scene 22 onwards

/** The learned symbol, dead centre of the 1728-wide box. */
const SYMBOL_X = 794;
const SYMBOL_Y = 240;
const SYMBOL_SIZE = 140;

/** The symbol tile, at any size. Proportions match the Communication section. */
const Symbol: React.FC<{
  left: number;
  top: number;
  size: number;
  glyph?: string;
  opacity?: number;
}> = ({left, top, size, glyph = '◆', opacity = 1}) => (
  <div
    style={{
      position: 'absolute',
      left,
      top,
      width: size,
      height: size,
      borderRadius: size * 0.23,
      background: palette.purple,
      color: palette.white,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily,
      fontSize: size * 0.53,
      lineHeight: 1,
      opacity,
    }}
  >
    {glyph}
  </div>
);

/** The channel the message travels along. Faint on purpose. */
const Channel: React.FC<{x1: number; x2: number; opacity: number}> = ({x1, x2, opacity}) => (
  <svg style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}} viewBox="0 0 1728 690">
    <g opacity={opacity}>
      <line x1={x1} y1={HERO_MID} x2={x2 - 10} y2={HERO_MID} stroke={palette.line} strokeWidth={5} strokeLinecap="round" />
      <polygon
        points={`${x2 - 10},${HERO_MID - 11} ${x2 + 8},${HERO_MID} ${x2 - 10},${HERO_MID + 11}`}
        fill={palette.line}
      />
    </g>
  </svg>
);

/** An agent whose position and presence are driven from the outside. */
const Actor: React.FC<{
  left: number;
  top: number;
  opacity: number;
  color: string;
  label: string;
  size?: number;
  direction?: 'left' | 'right';
}> = ({left, top, opacity, color, label, size = AGENT, direction = 'right'}) => (
  <div style={{position: 'absolute', left, top, opacity}}>
    <Agent color={color} label={label} size={size} direction={direction} delay={-40} />
  </div>
);

/** What the receiving partner did with the message. */
const Readout: React.FC<{
  left: number;
  top: number;
  width: number;
  text: string;
  tone: 'good' | 'bad';
  opacity: number;
}> = ({left, top, width, text, tone, opacity}) => {
  const color = tone === 'good' ? palette.green : palette.red;
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height: 76,
        borderRadius: 38,
        background: tone === 'good' ? palette.paleGreen : PALE_RED,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        opacity,
        fontFamily,
      }}
    >
      <svg width={30} height={30} viewBox="0 0 24 24">
        {tone === 'good' ? (
          <path d="M5 13 L10 18 L19 6" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" />
        )}
      </svg>
      <span style={{fontSize: 29, fontWeight: 850, color: palette.ink}}>{text}</span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* 18 · Partner Dependence                                              */
/*                                                                      */
/* Opens on the exact picture the Communication section ends on, then    */
/* swaps one agent out of it. Nothing else in the frame changes, which   */
/* is the entire argument.                                              */
/* ------------------------------------------------------------------ */

const CONVENTIONS = ['a precise role split', 'a timing convention', 'a private code'];

/** Illustrative team return, carried unchanged into scenes 22 and 23. */
const FAMILIAR_RETURN = 9.2;
const UNSEEN_RETURN = 5.8;

const PartnerDependence: React.FC = () => {
  const frame = useCurrentFrame();

  // The scaffolding steps back at the end so the next scene can open on the
  // three objects that matter: A, the symbol, and the new partner.
  const handoff = fade(frame, 1330, 1430, 1, 0);

  // The symbol: settled in the middle, pulled back to A during the swap, then
  // sent again and coming to rest in exactly the place it started.
  const symbolX = move(frame, [440, 520, 760, 900], [SYMBOL_X, 300, 300, SYMBOL_X]);

  const rightChannel = interpolate(frame, [500, 560, 700, 760], [1, 0, 0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const conventionsDim = fade(frame, 640, 700, 1, 0.24);
  const ret = move(frame, [200, 300, 960, 1060], [0, FAMILIAR_RETURN, FAMILIAR_RETURN, UNSEEN_RETURN]);
  const retColor = interpolateColors(frame, [960, 1060], [palette.green, palette.red]);

  return (
    <>
      <Channel x1={250} x2={780} opacity={1} />
      <Channel x1={944} x2={1480} opacity={rightChannel} />

      {/* Agent A never moves, never changes, and never learns anything new. */}
      <Actor left={A_X} top={HERO_Y} opacity={1} color={palette.blue} label="Agent A" />

      {/* The partner it trained with, and the one that replaces it, share one
          slot. The swap is a slide out and a slide in, not a cut. */}
      <Actor
        left={move(frame, [500, 600], [PARTNER_X, 1880])}
        top={HERO_Y}
        opacity={fade(frame, 520, 600, 1, 0)}
        color={palette.orange}
        label="Agent B"
        direction="left"
      />
      <Actor
        left={move(frame, [620, 730], [1880, PARTNER_X])}
        top={HERO_Y}
        opacity={fade(frame, 615, 660)}
        color={palette.purple}
        label="Agent C"
        direction="left"
      />

      <Symbol left={symbolX} top={SYMBOL_Y} size={SYMBOL_SIZE} />

      {/* The one thing that flips. Same slot, same words' worth of space. */}
      <svg style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}} viewBox="0 0 1728 690">
        <line
          x1={1510}
          y1={414}
          x2={1510}
          y2={444}
          stroke={palette.line}
          strokeWidth={4}
          strokeLinecap="round"
          opacity={Math.max(fade(frame, 470, 520, 1, 0), fade(frame, 900, 960)) * handoff}
        />
      </svg>
      <Readout
        left={1300}
        top={446}
        width={420}
        text="takes the long way"
        tone="good"
        opacity={fade(frame, 470, 520, 1, 0) * handoff}
      />
      <Readout
        left={1300}
        top={446}
        width={420}
        text="stands still"
        tone="bad"
        opacity={fade(frame, 900, 960) * handoff}
      />

      {/* Where we are, in three words. */}
      {[
        {text: 'self-play · the partner it trained with', color: palette.green, o: fade(frame, 60, 100) * fade(frame, 400, 440, 1, 0)},
        {text: 'the partner is swapped', color: palette.navy, o: fade(frame, 470, 510) * fade(frame, 700, 740, 1, 0)},
        {text: 'the same message · a different partner', color: palette.purple, o: fade(frame, 770, 810)},
      ].map((phase) => (
        <div
          key={phase.text}
          style={{
            position: 'absolute',
            left: 0,
            top: 20,
            fontFamily,
            fontSize: 30,
            fontWeight: 900,
            letterSpacing: '-0.02em',
            color: phase.color,
            opacity: phase.o * handoff,
          }}
        >
          {phase.text}
        </div>
      ))}

      {/* What self-play built between these two, and nobody else. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 100,
          display: 'flex',
          justifyContent: 'center',
          gap: 40,
          opacity: conventionsDim * handoff,
        }}
      >
        {CONVENTIONS.map((text, index) => (
          <div
            key={text}
            style={{
              padding: '14px 26px',
              borderRadius: 999,
              background: palette.paleGreen,
              color: palette.green,
              fontFamily,
              fontSize: 26,
              fontWeight: 850,
              whiteSpace: 'nowrap',
              opacity: fade(frame, 80 + index * 40, 120 + index * 40),
              translate: `0px ${move(frame, [80 + index * 40, 120 + index * 40], [14, 0])}px`,
            }}
          >
            {text}
          </div>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 178,
          textAlign: 'center',
          fontFamily,
          fontSize: 26,
          fontWeight: 800,
          color: palette.red,
          opacity: fade(frame, 680, 740) * handoff,
        }}
      >
        none of it is shared with Agent C
      </div>

      {/* The question, then the name for the answer. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 452,
          width: 1180,
          fontFamily,
          fontSize: 34,
          fontWeight: 850,
          letterSpacing: '-0.02em',
          color: palette.ink,
          opacity: fade(frame, 360, 410) * fade(frame, 1100, 1140, 1, 0) * handoff,
        }}
      >
        Did it learn the task, or did it learn this partner?
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 452,
          width: 1180,
          fontFamily,
          fontSize: 34,
          fontWeight: 850,
          letterSpacing: '-0.02em',
          color: palette.ink,
          opacity: fade(frame, 1150, 1200) * handoff,
        }}
      >
        Overfitting — to its teammates rather than to its examples.
      </div>

      {/* One bar, one number. It drops rather than being replaced, and the
          number it drops to is the number scene 22 divides by. */}
      <div style={{position: 'absolute', left: 0, top: 548, opacity: fade(frame, 200, 250) * handoff}}>
        <div style={caps}>Team return · illustrative</div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 584,
          width: ret * 92,
          height: 32,
          borderRadius: 16,
          background: retColor,
          opacity: fade(frame, 200, 250) * handoff,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: ret * 92 + 24,
          top: 574,
          fontFamily,
          fontSize: 40,
          fontWeight: 900,
          color: retColor,
          opacity: fade(frame, 240, 290) * handoff,
        }}
      >
        {ret.toFixed(1)}
      </div>

      <div style={{opacity: handoff}}>
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 19 · Training Partner Diversity                                      */
/*                                                                      */
/* The replacement partner already on screen is the seed. It stays       */
/* exactly where it is and four variants come out of it, so the          */
/* population is built from the thing the viewer was already watching.   */
/* ------------------------------------------------------------------ */

type Variant = {label: string; color: string; glyph: string; x: number; y: number};

/** Order and naming preserved from the original population. */
const POPULATION: Variant[] = [
  {label: 'fast mover', color: palette.orange, glyph: '●', x: 1040, y: 6},
  {label: 'role switcher', color: palette.green, glyph: '▲', x: 1320, y: 120},
  {label: 'silent partner', color: palette.purple, glyph: '◆', x: PARTNER_X, y: HERO_Y},
  {label: 'new route', color: palette.red, glyph: '■', x: 1320, y: 380},
  {label: 'cautious', color: palette.navy, glyph: '★', x: 1040, y: 486},
];

/** Agent C from scene 18. It does not move when the population forms. */
const SEED = 2;

const chipLeft = (v: Variant) => v.x + 132;
const chipTop = (v: Variant) => v.y + 34;
const headX = (v: Variant) => v.x + AGENT / 2;
const headY = (v: Variant) => v.y + AGENT / 2;

/** The draw sequence. It ends on the seed, so scene 20 can pick it up. */
const DRAW_ORDER = [1, 3, 0, 4, 2, 0, 3, 4, 2];
const DRAW_START = 360;
const DRAW_PERIOD = 78;

/** Where the population arrives from, and when. */
const arriveAt = (index: number) => 180 + (index < SEED ? index : index - 1) * 24;
const chipAt = (index: number) => (index === SEED ? 120 : 170 + (index < SEED ? index : index - 1) * 26);

/** The episode readout, shared with scene 20 so the boundary can hold it. */
const EpisodeReadout: React.FC<{episode: number; active: number; history: number[]; opacity: number}> = ({
  episode,
  active,
  history,
  opacity,
}) => (
  <div style={{position: 'absolute', left: 0, top: 452, width: 620, opacity}}>
    <div style={caps}>Episode {String(episode).padStart(2, '0')}</div>
    <div
      style={{
        fontFamily,
        fontSize: 44,
        fontWeight: 900,
        letterSpacing: '-0.03em',
        marginTop: 8,
        color: POPULATION[active].color,
      }}
    >
      {POPULATION[active].label}
    </div>
    <div style={{...caps, fontSize: 20, marginTop: 30}}>Recent draws</div>
    <div style={{display: 'flex', gap: 12, marginTop: 14}}>
      {history.map((index, position) => (
        <span
          key={`${index}-${position}`}
          style={{width: 18, height: 18, borderRadius: 9, background: POPULATION[index].color}}
        />
      ))}
    </div>
  </div>
);

const PartnerDiversity: React.FC = () => {
  const frame = useCurrentFrame();

  const draw = Math.max(0, Math.floor((frame - DRAW_START) / DRAW_PERIOD));
  const drawing = frame >= DRAW_START;
  const active = drawing ? DRAW_ORDER[Math.min(draw, DRAW_ORDER.length - 1)] : SEED;
  const history = DRAW_ORDER.slice(0, Math.min(draw, DRAW_ORDER.length - 1) + 1);

  // The channel the scene inherits, replaced by the fan it becomes.
  const inherited = fade(frame, 240, 320, 1, 0);
  const fanIn = fade(frame, 280, 360);

  return (
    <>
      <Channel x1={250} x2={780} opacity={inherited} />
      <Channel x1={944} x2={1480} opacity={inherited} />

      <svg style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}} viewBox="0 0 1728 690">
        {POPULATION.map((v, index) => {
          const live = drawing && index === active;
          return (
            <line
              key={v.label}
              x1={250}
              y1={HERO_MID}
              x2={headX(v)}
              y2={headY(v)}
              stroke={live ? palette.green : palette.line}
              strokeWidth={live ? 9 : 4}
              strokeLinecap="round"
              opacity={index === SEED ? fanIn : fade(frame, 300 + index * 18, 360 + index * 18) * 0.9}
            />
          );
        })}
      </svg>

      <Actor left={A_X} top={HERO_Y} opacity={1} color={palette.blue} label="Agent A" />

      {POPULATION.map((v, index) => {
        if (index === SEED) return null;
        const start = arriveAt(index);
        return (
          <Actor
            key={v.label}
            left={move(frame, [start, start + 110], [PARTNER_X, v.x])}
            top={move(frame, [start, start + 110], [HERO_Y, v.y])}
            opacity={fade(frame, start, start + 30) * (drawing && index !== active ? 0.5 : 1)}
            color={v.color}
            label={v.label}
            direction="left"
          />
        );
      })}

      {/* The seed keeps its slot, its colour and its size. Only its name
          changes, and only once the four copies have its attention. */}
      <Actor
        left={PARTNER_X}
        top={HERO_Y}
        opacity={drawing && active !== SEED ? 0.5 : 1}
        color={palette.purple}
        label={frame < 235 ? 'Agent C' : 'silent partner'}
        direction="left"
      />

      {/* The one learned symbol becomes five differing signals. */}
      {POPULATION.map((v, index) => {
        const start = chipAt(index);
        return (
          <Symbol
            key={v.label}
            left={move(frame, [start, start + 100], [SYMBOL_X, chipLeft(v)])}
            top={move(frame, [start, start + 100], [SYMBOL_Y, chipTop(v)])}
            size={move(frame, [start, start + 100], [SYMBOL_SIZE, 52])}
            glyph={index === SEED || frame > start + 40 ? v.glyph : '◆'}
            opacity={index === SEED ? 1 : fade(frame, start, start + 24)}
          />
        );
      })}

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 30,
          width: 800,
          fontFamily,
          fontSize: 32,
          fontWeight: 820,
          lineHeight: 1.24,
          letterSpacing: '-0.02em',
          color: palette.ink,
          opacity: fade(frame, 620, 680),
        }}
      >
        No single convention can explain every success.
      </div>

      <EpisodeReadout episode={draw + 1} active={active} history={history} opacity={fade(frame, 340, 400)} />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 20 · Agent Modelling                                                 */
/*                                                                      */
/* The population stays, one member is kept and the rest recede, and     */
/* the belief is built out of that member's action history. The equation */
/* arrives last, as a label for something already on screen.             */
/* ------------------------------------------------------------------ */

const OBSERVATIONS = [
  {text: 'takes the left route', at: 320},
  {text: 'waits when blocked', at: 480},
  {text: 'carries, never plates', at: 640},
  {text: 'ignores signal 2', at: 800},
];

const BELIEF_KEYS = [300, 480, 640, 800, 1000];
const HYPOTHESES = [
  {name: 'mirrors your route', values: [0.34, 0.3, 0.55, 0.66, 0.78], lead: true},
  {name: 'waits for a signal', values: [0.33, 0.44, 0.28, 0.21, 0.14], lead: false},
  {name: 'acts independently', values: [0.33, 0.26, 0.17, 0.13, 0.08], lead: false},
];

const BELIEF_X = 300;
const BELIEF_W = 880;
const beliefTop = (row: number) => 150 + row * 92;

const BeliefBlock: React.FC<{values: number[]; headerOpacity: number; rowOpacity: number; tagOpacity: number}> = ({
  values,
  headerOpacity,
  rowOpacity,
  tagOpacity,
}) => (
  <>
    <div style={{position: 'absolute', left: BELIEF_X, top: 108, ...caps, opacity: headerOpacity}}>
      Belief over partner type
    </div>
    {HYPOTHESES.map((hypothesis, row) => {
      const top = beliefTop(row);
      const value = values[row];
      return (
        <div key={hypothesis.name} style={{opacity: rowOpacity}}>
          <div
            style={{
              position: 'absolute',
              left: BELIEF_X,
              top,
              fontFamily,
              fontSize: 26,
              fontWeight: 850,
              color: hypothesis.lead ? palette.ink : palette.muted,
            }}
          >
            {hypothesis.name}
          </div>
          <div
            style={{
              position: 'absolute',
              left: BELIEF_X,
              top: top + 34,
              width: BELIEF_W,
              height: 30,
              borderRadius: 15,
              background: palette.line,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 15,
                background: hypothesis.lead ? palette.purple : GHOST,
                width: `${value * 100}%`,
              }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              left: BELIEF_X + BELIEF_W + 20,
              top: top + 30,
              fontFamily,
              fontSize: 28,
              fontWeight: 900,
              color: hypothesis.lead ? palette.purple : palette.muted,
            }}
          >
            {Math.round(value * 100)}%
          </div>
          {hypothesis.lead ? (
            <div
              style={{
                position: 'absolute',
                left: BELIEF_X + BELIEF_W + 120,
                top: top + 38,
                ...caps,
                fontSize: 20,
                color: palette.purple,
                opacity: tagOpacity,
              }}
            >
              most likely
            </div>
          ) : null}
        </div>
      );
    })}
  </>
);

const ObservationColumn: React.FC<{opacities: number[]; headerOpacity: number}> = ({opacities, headerOpacity}) => (
  <>
    <div style={{position: 'absolute', left: 1180, top: 404, ...caps, fontSize: 20, opacity: headerOpacity}}>
      Action history
    </div>
    {OBSERVATIONS.map((observation, index) => (
      <div
        key={observation.text}
        style={{
          position: 'absolute',
          left: 1180,
          top: 440 + index * 52,
          padding: '11px 24px',
          borderRadius: 999,
          background: palette.palePurple,
          color: palette.purple,
          fontFamily,
          fontSize: 24,
          fontWeight: 800,
          whiteSpace: 'nowrap',
          opacity: opacities[index],
        }}
      >
        {observation.text}
      </div>
    ))}
  </>
);

const MODEL_EQUATION = 'a_t^i\\sim\\pi_i\\!\\left(a^i\\mid o_t^i,\\,z_t^j\\right)';

const AgentModelling: React.FC = () => {
  const frame = useCurrentFrame();

  const recede = fade(frame, 90, 260, 1, 0);
  const values = HYPOTHESES.map((hypothesis) =>
    interpolate(frame, BELIEF_KEYS, hypothesis.values, {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE,
    }),
  );

  return (
    <>
      <svg style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}} viewBox="0 0 1728 690">
        {POPULATION.map((v, index) => (
          <line
            key={v.label}
            x1={250}
            y1={HERO_MID}
            x2={headX(v)}
            y2={headY(v)}
            stroke={index === SEED ? palette.green : palette.line}
            strokeWidth={index === SEED ? 9 : 4}
            strokeLinecap="round"
            opacity={index === SEED ? fade(frame, 260, 340, 0.95, 0.3) : recede * 0.9}
          />
        ))}
      </svg>

      <Actor left={A_X} top={HERO_Y} opacity={1} color={palette.blue} label="Agent A" />

      {POPULATION.map((v, index) =>
        index === SEED ? null : (
          <Actor
            key={v.label}
            left={v.x}
            top={v.y}
            opacity={recede * 0.5}
            color={v.color}
            label={v.label}
            direction="left"
          />
        ),
      )}
      {POPULATION.map((v, index) =>
        index === SEED ? null : (
          <Symbol key={v.label} left={chipLeft(v)} top={chipTop(v)} size={52} glyph={v.glyph} opacity={recede} />
        ),
      )}

      {/* The partner that was drawn. Its type is what the belief is about, so
          the name comes off once the population is out of the way. */}
      <Actor
        left={PARTNER_X}
        top={HERO_Y}
        opacity={1}
        color={palette.purple}
        label={frame < 230 ? 'silent partner' : 'unknown partner'}
        direction="left"
      />
      <Symbol left={chipLeft(POPULATION[SEED])} top={chipTop(POPULATION[SEED])} size={52} glyph="◆" />

      <EpisodeReadout episode={9} active={SEED} history={DRAW_ORDER} opacity={fade(frame, 100, 200, 1, 0)} />

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 30,
          width: 800,
          fontFamily,
          fontSize: 32,
          fontWeight: 820,
          lineHeight: 1.24,
          letterSpacing: '-0.02em',
          color: palette.ink,
          opacity: fade(frame, 100, 180, 1, 0),
        }}
      >
        No single convention can explain every success.
      </div>

      <ObservationColumn
        headerOpacity={fade(frame, 290, 340)}
        opacities={OBSERVATIONS.map((observation) => fade(frame, observation.at, observation.at + 26))}
      />

      <BeliefBlock
        values={values}
        headerOpacity={fade(frame, 260, 320)}
        rowOpacity={fade(frame, 280, 340)}
        tagOpacity={fade(frame, 860, 910)}
      />

      <div style={{position: 'absolute', left: 0, top: 452, width: 1150}}>
        <Equation
          latex={MODEL_EQUATION}
          note="The policy conditions on the observation and on the inferred partner"
          size={48}
          delay={1000}
        />
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 21 · Ad Hoc Teamwork                                                 */
/*                                                                      */
/* The belief folds into a model the policy carries, the partner it can  */
/* model walks off, and strangers walk on. Same frame, changed partner.  */
/* ------------------------------------------------------------------ */

const MODEL_X = 100;
const MODEL_Y = 150;

const ModelChip: React.FC<{opacity: number}> = ({opacity}) => (
  <div
    style={{
      position: 'absolute',
      left: MODEL_X,
      top: MODEL_Y,
      width: 260,
      height: 64,
      borderRadius: 32,
      background: palette.palePurple,
      display: 'flex',
      alignItems: 'center',
      paddingLeft: 68,
      boxSizing: 'border-box',
      fontFamily,
      fontSize: 25,
      fontWeight: 850,
      color: palette.purple,
      opacity,
    }}
  >
    partner model
  </div>
);

const UNSEEN_TEAM = [
  {label: 'partner 1', x: NEAR_X},
  {label: 'partner 2', x: 1250},
  {label: 'partner 3', x: PARTNER_X},
];

const AdHoc: React.FC = () => {
  const frame = useCurrentFrame();

  // The belief the previous scene built, folding into something the policy
  // carries rather than something the frame is about.
  const foldOut = fade(frame, 120, 230, 1, 0);
  const foldScale = move(frame, [100, 240], [1, 0.2]);
  const foldX = move(frame, [100, 240], [0, -170]);
  const foldY = move(frame, [100, 240], [0, -6]);

  const modelIn = fade(frame, 200, 260);
  const chipLanded = move(frame, [140, 280], [chipLeft(POPULATION[SEED]), MODEL_X + 10]);
  const chipLandedTop = move(frame, [140, 280], [chipTop(POPULATION[SEED]), MODEL_Y + 10]);
  const chipSize = move(frame, [140, 280], [52, 44]);

  // The two situations the next scene compares are both on screen by the end.
  const restage = fade(frame, 960, 1030, 1, 0);
  const familiarBack = fade(frame, 1000, 1070);

  return (
    <>
      <svg style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}} viewBox="0 0 1728 690">
        <line
          x1={250}
          y1={HERO_MID}
          x2={headX(POPULATION[SEED])}
          y2={headY(POPULATION[SEED])}
          stroke={palette.green}
          strokeWidth={9}
          strokeLinecap="round"
          opacity={fade(frame, 200, 300, 0.3, 0)}
        />

        {/* a history the strangers share, and the policy does not */}
        <path
          d="M1070 246 Q1190 178 1310 246"
          fill="none"
          stroke={palette.green}
          strokeWidth={5}
          strokeLinecap="round"
          opacity={fade(frame, 640, 710, 0, 0.85) * restage}
        />
        <path
          d="M1310 246 Q1430 178 1550 246"
          fill="none"
          stroke={palette.green}
          strokeWidth={5}
          strokeLinecap="round"
          opacity={fade(frame, 670, 740, 0, 0.85) * restage}
        />

        {/* the link that does not exist yet */}
        <g opacity={fade(frame, 700, 770) * restage}>
          <line
            x1={260}
            y1={HERO_MID}
            x2={990}
            y2={HERO_MID}
            stroke={palette.muted}
            strokeWidth={5}
            strokeDasharray="12 14"
            strokeLinecap="round"
            opacity={0.75}
          />
          <circle cx={625} cy={HERO_MID} r={30} fill={palette.white} stroke={palette.muted} strokeWidth={5} />
          <text
            x={625}
            y={HERO_MID + 12}
            textAnchor="middle"
            fontFamily={fontFamily}
            fontSize={32}
            fontWeight={900}
            fill={palette.muted}
          >
            ?
          </text>
        </g>
      </svg>

      {/* the belief, on its way to becoming a tool */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          transformOrigin: '300px 160px',
          opacity: foldOut,
          scale: foldScale,
          translate: `${foldX}px ${foldY}px`,
        }}
      >
        <BeliefBlock values={[0.78, 0.14, 0.08]} headerOpacity={1} rowOpacity={1} tagOpacity={1} />
      </div>
      <ObservationColumn headerOpacity={foldOut} opacities={OBSERVATIONS.map(() => foldOut)} />
      <div style={{position: 'absolute', left: 0, top: 452, width: 1150, opacity: foldOut}}>
        <Equation
          latex={MODEL_EQUATION}
          note="The policy conditions on the observation and on the inferred partner"
          size={48}
          delay={-40}
        />
      </div>

      <ModelChip opacity={modelIn} />
      <Symbol left={chipLanded} top={chipLandedTop} size={chipSize} glyph="◆" />

      <Actor left={A_X} top={HERO_Y} opacity={1} color={palette.blue} label="Agent A" />

      {/* the partner it could model, leaving */}
      <Actor
        left={move(frame, [280, 400], [PARTNER_X, 1900])}
        top={HERO_Y}
        opacity={fade(frame, 300, 380, 1, 0)}
        color={palette.purple}
        label="unknown partner"
        direction="left"
      />

      {/* a team that trained together, and never with this policy */}
      {UNSEEN_TEAM.map((member, index) => {
        const start = 400 - index * 20 + (2 - index) * 0;
        const enter = 400 + (2 - index) * 60;
        const leaves = index === 2 ? 1 : restage;
        return (
          <Actor
            key={member.label}
            left={move(frame, [enter, enter + 110], [1900, member.x])}
            top={HERO_Y}
            opacity={fade(frame, enter, enter + 40) * leaves}
            color={palette.muted}
            label={index === 2 && frame >= 1035 ? 'unseen partner' : member.label}
            direction="left"
            size={AGENT}
          />
        );
      })}

      <div
        style={{
          position: 'absolute',
          left: 1180,
          top: 150,
          width: 420,
          fontFamily,
          fontSize: 26,
          fontWeight: 850,
          color: palette.green,
          opacity: fade(frame, 660, 720) * restage,
        }}
      >
        trained together, and never with you
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 470,
          width: 1560,
          fontFamily,
          fontSize: 34,
          fontWeight: 820,
          lineHeight: 1.22,
          letterSpacing: '-0.02em',
          color: palette.ink,
          opacity: fade(frame, 800, 860) * fade(frame, 1050, 1120, 1, 0),
        }}
      >
        Coordinate from the first step, with no time to learn the team's conventions.
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 540,
          width: 1560,
          fontFamily,
          fontSize: 27,
          fontWeight: 700,
          lineHeight: 1.25,
          color: palette.muted,
          opacity: fade(frame, 880, 940) * fade(frame, 1050, 1120, 1, 0),
        }}
      >
        Zero-shot coordination is the strict case: no learning together at all.
      </div>

      {/* the familiar case comes back, so both situations are on screen */}
      <Actor
        left={NEAR_X}
        top={HERO_Y}
        opacity={familiarBack}
        color={palette.purple}
        label="familiar partner"
        direction="left"
      />
      <div
        style={{
          position: 'absolute',
          left: 930,
          top: 434,
          width: 280,
          textAlign: 'center',
          ...caps,
          color: palette.purple,
          opacity: fade(frame, 1060, 1120),
        }}
      >
        familiar
      </div>
      <div
        style={{
          position: 'absolute',
          left: 1410,
          top: 434,
          width: 280,
          textAlign: 'center',
          ...caps,
          opacity: fade(frame, 1060, 1120),
        }}
      >
        unseen
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 22 · The Generalization Gap                                          */
/*                                                                      */
/* The two partners already on screen rise to the top of the frame and   */
/* each one grows the bar it is worth. The ratio is then built from the  */
/* two numbers, not announced ahead of them.                            */
/* ------------------------------------------------------------------ */

const BAR_X = 400;
const BAR_H = 52;
const BAR_UNIT = 60;
const FAM_BAR_Y = 260;
const UNS_BAR_Y = 410;
const FAM_BAR_W = FAMILIAR_RETURN * BAR_UNIT; // 552
const UNS_BAR_W = UNSEEN_RETURN * BAR_UNIT; // 348
const RATIO_EQUATION =
  '\\dfrac{R_{\\text{unseen}}}{R_{\\text{familiar}}}=\\dfrac{5.8}{9.2}=0.63';

/** Everything in the comparison except the two bars themselves. */
const DiagnosticFurniture: React.FC<{
  capsO: number;
  famO: number;
  unsO: number;
  gapO: number;
  eqO: number;
  noteO: number;
}> = ({capsO, famO, unsO, gapO, eqO, noteO}) => (
  <>
    <div style={{position: 'absolute', left: 0, top: 214, ...caps, opacity: capsO}}>Team return · illustrative</div>

    <div
      style={{
        position: 'absolute',
        left: 0,
        top: FAM_BAR_Y + 12,
        width: 380,
        fontFamily,
        fontSize: 28,
        fontWeight: 800,
        color: palette.muted,
        opacity: famO,
      }}
    >
      with familiar partners
    </div>
    <div
      style={{
        position: 'absolute',
        left: BAR_X + FAM_BAR_W + 24,
        top: FAM_BAR_Y + 2,
        fontFamily,
        fontSize: 46,
        fontWeight: 900,
        color: palette.purple,
        opacity: famO,
      }}
    >
      9.2
    </div>

    <div
      style={{
        position: 'absolute',
        left: 0,
        top: UNS_BAR_Y + 12,
        width: 380,
        fontFamily,
        fontSize: 28,
        fontWeight: 800,
        color: palette.muted,
        opacity: unsO,
      }}
    >
      with unseen partners
    </div>
    <div
      style={{
        position: 'absolute',
        left: BAR_X + UNS_BAR_W + 24,
        top: UNS_BAR_Y + 2,
        fontFamily,
        fontSize: 46,
        fontWeight: 900,
        color: palette.muted,
        opacity: unsO,
      }}
    >
      5.8
    </div>

    <svg style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}} viewBox="0 0 1728 690">
      <g opacity={gapO}>
        <line
          x1={BAR_X + UNS_BAR_W}
          y1={361}
          x2={BAR_X + FAM_BAR_W}
          y2={361}
          stroke={palette.red}
          strokeWidth={6}
          strokeLinecap="round"
        />
        <polygon
          points={`${BAR_X + UNS_BAR_W + 18},351 ${BAR_X + UNS_BAR_W + 18},371 ${BAR_X + UNS_BAR_W},361`}
          fill={palette.red}
        />
        <polygon
          points={`${BAR_X + FAM_BAR_W - 18},351 ${BAR_X + FAM_BAR_W - 18},371 ${BAR_X + FAM_BAR_W},361`}
          fill={palette.red}
        />
      </g>
    </svg>
    <div
      style={{
        position: 'absolute',
        left: BAR_X + FAM_BAR_W + 24,
        top: 344,
        width: 300,
        fontFamily,
        fontSize: 26,
        fontWeight: 850,
        color: palette.red,
        opacity: gapO,
      }}
    >
      the gap · 3.4 return
    </div>

    <div style={{position: 'absolute', left: 940, top: 462, width: 788, opacity: eqO}}>
      <Equation
        latex={RATIO_EQUATION}
        note="A ratio near 1 means little is lost when the partner changes"
        size={40}
        delay={-40}
      />
    </div>

    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 500,
        width: 860,
        boxSizing: 'border-box',
        padding: '20px 24px',
        borderLeft: `8px solid ${palette.orange}`,
        borderRadius: '6px 18px 18px 6px',
        background: palette.paleOrange,
        fontFamily,
        opacity: noteO,
      }}
    >
      <div style={{fontSize: 26, fontWeight: 900, color: palette.ink, lineHeight: 1.24}}>
        A teaching diagnostic used in this resource, not a standard MARL metric.
      </div>
      <div style={{fontSize: 22, fontWeight: 700, color: palette.muted, lineHeight: 1.28, marginTop: 8}}>
        Report the underlying scores and the task conditions. One number cannot say why transfer succeeded or failed.
      </div>
    </div>
  </>
);

const Diagnostic: React.FC = () => {
  const frame = useCurrentFrame();

  const lift = move(frame, [80, 240], [HERO_Y, 26]);
  const capsLift = move(frame, [80, 240], [434, 196]);

  return (
    <>
      <ModelChip opacity={fade(frame, 80, 160, 1, 0)} />
      <Symbol
        left={MODEL_X + 10}
        top={MODEL_Y + 10}
        size={44}
        glyph="◆"
        opacity={fade(frame, 80, 160, 1, 0)}
      />

      <Actor left={A_X} top={lift} opacity={1} color={palette.blue} label="Agent A" />
      <Actor left={NEAR_X} top={lift} opacity={1} color={palette.purple} label="familiar partner" direction="left" />
      <Actor left={PARTNER_X} top={lift} opacity={1} color={palette.muted} label="unseen partner" direction="left" />

      <div
        style={{
          position: 'absolute',
          left: 930,
          top: capsLift,
          width: 280,
          textAlign: 'center',
          ...caps,
          color: palette.purple,
        }}
      >
        familiar
      </div>
      <div style={{position: 'absolute', left: 1410, top: capsLift, width: 280, textAlign: 'center', ...caps}}>
        unseen
      </div>

      <div
        style={{
          position: 'absolute',
          left: BAR_X,
          top: FAM_BAR_Y,
          width: move(frame, [220, 330], [0, FAM_BAR_W]),
          height: BAR_H,
          borderRadius: BAR_H / 2,
          background: palette.purple,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: BAR_X,
          top: UNS_BAR_Y,
          width: move(frame, [300, 410], [0, UNS_BAR_W]),
          height: BAR_H,
          borderRadius: BAR_H / 2,
          background: palette.muted,
        }}
      />

      <DiagnosticFurniture
        capsO={fade(frame, 200, 250)}
        famO={fade(frame, 300, 350)}
        unsO={fade(frame, 380, 430)}
        gapO={fade(frame, 430, 490)}
        eqO={fade(frame, 530, 590)}
        noteO={fade(frame, 630, 690)}
      />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 23 · Cross-Play                                                      */
/*                                                                      */
/* The two bars the viewer just read become two cells, and the rest of   */
/* the matrix grows around them. The pairing they were looking at is     */
/* still findable in the top-left corner.                               */
/* ------------------------------------------------------------------ */

const RETURNS = [
  [0.94, 0.42, 0.68, 0.31],
  [0.46, 0.91, 0.38, 0.62],
  [0.65, 0.41, 0.96, 0.55],
  [0.29, 0.64, 0.57, 0.92],
];
const CELL = 96;
const PITCH = 110;
const GRID_X = 150;
const GRID_Y = 140;
const cellLeft = (column: number) => GRID_X + column * PITCH;
const cellTop = (row: number) => GRID_Y + row * PITCH;
const offDiagonal = (value: number) => `rgba(30,144,255,${0.08 + value * 0.34})`;

const CrossPlay: React.FC = () => {
  const frame = useCurrentFrame();

  const out = fade(frame, 100, 190, 1, 0);
  const morph = (from: number, to: number) => move(frame, [120, 270], [from, to]);
  const seedValues = fade(frame, 200, 260);
  const gridIn = fade(frame, 260, 340);

  // The two cells the comparison became keep their ring until the whole
  // diagonal earns one.
  const seedRing = fade(frame, 300, 360) * fade(frame, 620, 680, 1, 0.001);
  const diagonalRing = fade(frame, 620, 700);

  return (
    <>
      {/* the three agents, folding into the pairings they stand for */}
      <Actor
        left={morph(A_X, 60)}
        top={morph(26, 176)}
        opacity={fade(frame, 150, 260, 1, 0)}
        color={palette.blue}
        label="Agent A"
      />
      <Actor
        left={morph(NEAR_X, cellLeft(0))}
        top={morph(26, cellTop(0))}
        opacity={fade(frame, 150, 250, 1, 0)}
        color={palette.purple}
        label="familiar partner"
        direction="left"
      />
      <Actor
        left={morph(PARTNER_X, cellLeft(1))}
        top={morph(26, cellTop(0))}
        opacity={fade(frame, 150, 250, 1, 0)}
        color={palette.muted}
        label="unseen partner"
        direction="left"
      />

      <div
        style={{
          position: 'absolute',
          left: 930,
          top: 196,
          width: 280,
          textAlign: 'center',
          ...caps,
          color: palette.purple,
          opacity: out,
        }}
      >
        familiar
      </div>
      <div style={{position: 'absolute', left: 1410, top: 196, width: 280, textAlign: 'center', ...caps, opacity: out}}>
        unseen
      </div>

      <DiagnosticFurniture capsO={out} famO={out} unsO={out} gapO={out} eqO={out} noteO={out} />

      {/* the fourteen pairings nobody has looked at yet */}
      {RETURNS.flatMap((row, rowIndex) =>
        row.map((value, column) => {
          if (rowIndex === 0 && column < 2) return null;
          const diagonal = rowIndex === column;
          const appear = 290 + (rowIndex * 4 + column) * 13;
          return (
            <div
              key={`${rowIndex}-${column}`}
              style={{
                position: 'absolute',
                left: cellLeft(column),
                top: cellTop(rowIndex),
                width: CELL,
                height: CELL,
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily,
                fontSize: diagonal ? 30 : 26,
                fontWeight: 900,
                background: diagonal ? palette.navy : offDiagonal(value),
                color: diagonal ? palette.white : palette.navy,
                boxShadow: diagonal ? `0 0 0 ${6 * diagonalRing}px ${palette.green}` : 'none',
                opacity: fade(frame, appear, appear + 20),
                scale: interpolate(frame, [appear, appear + 20], [0.86, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                  easing: EASE,
                  output: 'perceptual-scale',
                }),
              }}
            >
              {value.toFixed(2)}
            </div>
          );
        }),
      )}

      {/* the familiar pairing: the bar the viewer just read, folded square */}
      <div
        style={{
          position: 'absolute',
          left: morph(BAR_X, cellLeft(0)),
          top: morph(FAM_BAR_Y, cellTop(0)),
          width: morph(FAM_BAR_W, CELL),
          height: morph(BAR_H, CELL),
          borderRadius: morph(BAR_H / 2, 20),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily,
          fontSize: 30,
          fontWeight: 900,
          color: palette.white,
          background: interpolateColors(frame, [120, 270], [palette.purple, palette.navy]),
          boxShadow: `0 0 0 ${6 * Math.max(seedRing, diagonalRing)}px ${palette.green}`,
        }}
      >
        <span style={{opacity: seedValues}}>0.94</span>
      </div>

      {/* the unseen pairing, one square to the right of it */}
      <div
        style={{
          position: 'absolute',
          left: morph(BAR_X, cellLeft(1)),
          top: morph(UNS_BAR_Y, cellTop(0)),
          width: morph(UNS_BAR_W, CELL),
          height: morph(BAR_H, CELL),
          borderRadius: morph(BAR_H / 2, 20),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily,
          fontSize: 26,
          fontWeight: 900,
          color: palette.navy,
          background: interpolateColors(frame, [120, 270], [palette.muted, offDiagonal(0.42)]),
          boxShadow: `0 0 0 ${5 * seedRing}px ${palette.green}`,
        }}
      >
        <span style={{opacity: seedValues}}>0.42</span>
      </div>

      {['B1', 'B2', 'B3', 'B4'].map((label, column) => (
        <div
          key={label}
          style={{
            position: 'absolute',
            left: cellLeft(column),
            top: 100,
            width: CELL,
            textAlign: 'center',
            fontFamily,
            fontSize: 24,
            fontWeight: 900,
            color: palette.muted,
            opacity: gridIn,
          }}
        >
          {label}
        </div>
      ))}
      {RETURNS.map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          style={{
            position: 'absolute',
            left: 20,
            top: cellTop(rowIndex),
            width: 112,
            height: CELL,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            fontFamily,
            fontSize: 24,
            fontWeight: 900,
            color: palette.muted,
            opacity: gridIn,
          }}
        >
          A{rowIndex + 1}
        </div>
      ))}

      {/* so the viewer can find themselves on the grid */}
      <svg style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}} viewBox="0 0 1728 690">
        <line
          x1={cellLeft(1) + CELL}
          y1={cellTop(0) + 40}
          x2={598}
          y2={cellTop(0) + 30}
          stroke={palette.green}
          strokeWidth={4}
          strokeLinecap="round"
          opacity={fade(frame, 320, 380) * fade(frame, 600, 660, 1, 0)}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 610,
          top: 152,
          width: 300,
          fontFamily,
          fontSize: 24,
          fontWeight: 850,
          lineHeight: 1.24,
          color: palette.green,
          opacity: fade(frame, 320, 380) * fade(frame, 600, 660, 1, 0),
        }}
      >
        the two pairings you just compared
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 590,
          width: 620,
          fontFamily,
          fontSize: 21,
          fontWeight: 700,
          lineHeight: 1.25,
          color: palette.muted,
          opacity: fade(frame, 100, 170),
        }}
      >
        Illustrative returns. Rows and columns are independently trained policies.
      </div>

      <div style={{position: 'absolute', left: 680, top: 236, width: 1000}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 22, opacity: fade(frame, 420, 480)}}>
          <span
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: palette.navy,
              boxShadow: `0 0 0 5px ${palette.green}`,
              flexShrink: 0,
            }}
          />
          <span style={{fontFamily, fontSize: 29, fontWeight: 850, color: palette.ink}}>
            a policy with itself · 0.93 average
          </span>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 22, marginTop: 32, opacity: fade(frame, 470, 530)}}>
          <span style={{width: 52, height: 52, borderRadius: 14, background: offDiagonal(0.47), flexShrink: 0}} />
          <span style={{fontFamily, fontSize: 29, fontWeight: 850, color: palette.ink}}>
            two policies trained apart · 0.50 average
          </span>
        </div>
        <div
          style={{
            marginTop: 44,
            width: 960,
            fontFamily,
            fontSize: 26,
            fontWeight: 700,
            lineHeight: 1.34,
            color: palette.muted,
            opacity: fade(frame, 560, 630),
          }}
        >
          A bright diagonal beside a dim off-diagonal means every training run found a different convention. General
          teamwork has to lift the off-diagonal, not the familiar pairings.
        </div>
      </div>

    </>
  );
};

export const AdaptationVisuals: React.FC<{sceneIndex: number}> = ({sceneIndex}) => {
  switch (sceneIndex) {
    case 18:
      return <PartnerDependence />;
    case 19:
      return <PartnerDiversity />;
    case 20:
      return <AgentModelling />;
    case 21:
      return <AdHoc />;
    case 22:
      return <Diagnostic />;
    default:
      return <CrossPlay />;
  }
};
