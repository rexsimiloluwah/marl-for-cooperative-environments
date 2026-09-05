import katex from 'katex';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {fontFamily, palette} from '../constants';
import {Agent} from '../components/Agent';
import {Equation} from '../components/Equation';

/**
 * THE COMMUNICATE SECTION
 *
 * Five scenes, ONE stage. Agent A stands on the left, Agent B on the right, a
 * channel runs between them, and a single message token travels along it. That
 * token is the thread the viewer holds for two and a half minutes: it starts as
 * an English phrase, is squeezed into bits, is charged for, is dropped, and
 * finally becomes a symbol whose meaning nobody assigned.
 *
 * Nothing is rebuilt at a scene boundary. Every scene opens on exactly the
 * picture the previous one ended on — same positions, same sizes, same colours
 * — and only then transforms it. The constants below are that contract, so a
 * boundary cannot drift by accident.
 *
 * No strongly bordered containers: every panel here is a borderless tinted
 * fill, which keeps the frame quiet enough to carry the same three objects
 * through five scenes.
 */

const W = 1728;
const H = 690;
const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const IN = {easing: EASE, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const HARD = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

/* ---- the stage, shared by all five scenes -------------------------- */

const AGENT_SIZE = 140;
const A_X = 140;
const B_X = 1448;
const AGENT_Y = 170;
/** the channel runs through both agents' eye level */
const RAIL_Y = 240;
const RAIL_X0 = 300;
const RAIL_X1 = 1428;
const RAIL_LEN = RAIL_X1 - RAIL_X0;

const PILL_H = 64;
const PILL_TOP = RAIL_Y - PILL_H / 2; // 208
const PILL_W = 260; // the message while it is still an English phrase
const PILL_AT_B = 1150;
const TOKEN_W = 120; // the message once the channel has squeezed it
const TOKEN_MID = 804; // centred in the frame
const TOKEN_AT_B = 1254;

const A_TILE = {x: 20, y: 14, w: 380, h: 118};
const B_TILE = {x: 1328, y: 14, w: 380, h: 118};
const B_CHIP = {x: 1210, y: 392, w: 380, h: 92};

/** rise, and optionally fall again */
const fade = (frame: number, inA: number, inB: number, outA?: number, outB?: number) => {
  const rise = interpolate(frame, [inA, inB], [0, 1], IN);
  if (outA === undefined || outB === undefined) return rise;
  return rise * interpolate(frame, [outA, outB], [1, 0], IN);
};

/** Inline KaTeX, so a formula can grow out of the picture rather than replace it. */
const Tex: React.FC<{tex: string; size: number; color?: string}> = ({tex, size, color = palette.ink}) => (
  <span
    style={{fontSize: size, color, lineHeight: 1}}
    dangerouslySetInnerHTML={{__html: katex.renderToString(tex, {throwOnError: false})}}
  />
);

/** A soft, filled panel. Deliberately borderless. */
const Tile: React.FC<{
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  children: React.ReactNode;
  opacity?: number;
  scale?: number;
}> = ({x, y, width, height, fill, children, opacity = 1, scale = 1}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width,
      height,
      borderRadius: 22,
      background: fill,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 20px',
      fontFamily,
      textAlign: 'center',
      opacity,
      scale,
    }}
  >
    {children}
  </div>
);

const Caps: React.FC<{color: string; children: React.ReactNode}> = ({color, children}) => (
  <div style={{fontSize: 20, fontWeight: 900, letterSpacing: '0.13em', color}}>{children}</div>
);

const Line: React.FC<{
  x: number;
  y: number;
  width: number;
  size: number;
  opacity?: number;
  color?: string;
  weight?: number;
  dy?: number;
  children: React.ReactNode;
}> = ({x, y, width, size, opacity = 1, color = palette.ink, weight = 880, dy = 0, children}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width,
      textAlign: 'center',
      fontFamily,
      fontSize: size,
      fontWeight: weight,
      letterSpacing: '-0.03em',
      lineHeight: 1.14,
      color,
      opacity,
      translate: `0px ${dy}px`,
    }}
  >
    {children}
  </div>
);

/**
 * The two agents and the channel between them. Present from frame 0 of every
 * scene in the section: the negative delay means they are already standing
 * there when the viewer cuts in, rather than animating on again.
 */
const Stage: React.FC<{rail?: number; railColor?: string}> = ({rail = 1, railColor = palette.line}) => (
  <>
    <div
      style={{
        position: 'absolute',
        left: RAIL_X0,
        top: RAIL_Y - 5,
        width: RAIL_LEN * Math.max(0, Math.min(1, rail)),
        height: 10,
        borderRadius: 5,
        background: railColor,
      }}
    />
    <Agent color={palette.blue} label="Agent A" x={A_X} y={AGENT_Y} size={AGENT_SIZE} delay={-20} />
    <Agent color={palette.orange} label="Agent B" x={B_X} y={AGENT_Y} size={AGENT_SIZE} delay={-20} direction="left" />
  </>
);

/** The message. One object, five scenes. */
const Token: React.FC<{
  x: number;
  top?: number;
  width?: number;
  text: string;
  opacity?: number;
  color?: string;
  scale?: number;
  rotate?: string;
  dy?: number;
  mono?: boolean;
  size?: number;
}> = ({
  x,
  top = PILL_TOP,
  width = PILL_W,
  text,
  opacity = 1,
  color = palette.purple,
  scale = 1,
  rotate = '0deg',
  dy = 0,
  mono = false,
  size = 30,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top,
      width,
      height: PILL_H,
      borderRadius: 18,
      background: color,
      color: palette.white,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: mono ? MONO : fontFamily,
      fontSize: size,
      fontWeight: 900,
      letterSpacing: mono ? '0.08em' : '-0.01em',
      boxShadow: '0 12px 28px rgba(122,90,248,0.30)',
      opacity,
      scale,
      rotate,
      translate: `0px ${dy}px`,
    }}
  >
    {text}
  </div>
);

/** The narrow channel the message has to fit through. Carried by scenes 16-18. */
const Gate: React.FC<{opacity: number}> = ({opacity}) => (
  <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} viewBox={`0 0 ${W} ${H}`}>
    <g opacity={opacity}>
      <line x1={690} y1={RAIL_Y - 46} x2={690} y2={RAIL_Y + 46} stroke={palette.purple} strokeWidth={9} strokeLinecap="round" />
      <line x1={1038} y1={RAIL_Y - 46} x2={1038} y2={RAIL_Y + 46} stroke={palette.purple} strokeWidth={9} strokeLinecap="round" />
      <line x1={690} y1={RAIL_Y} x2={1038} y2={RAIL_Y} stroke={palette.purple} strokeWidth={10} strokeLinecap="round" opacity={0.32} />
    </g>
  </svg>
);

/** The wall that separates what A can see from what B can see. Scenes 14-15. */
const Wall: React.FC<{opacity: number; gap: number}> = ({opacity, gap}) => {
  const topEnd = interpolate(gap, [0, 1], [470, RAIL_Y - 46], HARD);
  const bottomStart = interpolate(gap, [0, 1], [470, RAIL_Y + 46], HARD);
  return (
    <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} viewBox={`0 0 ${W} ${H}`}>
      <g opacity={opacity}>
        <line x1={864} y1={6} x2={864} y2={topEnd} stroke={palette.line} strokeWidth={13} strokeLinecap="round" strokeDasharray="2 26" />
        {gap > 0.02 ? (
          <line x1={864} y1={bottomStart} x2={864} y2={470} stroke={palette.line} strokeWidth={13} strokeLinecap="round" strokeDasharray="2 26" />
        ) : null}
      </g>
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* 14 — What is Agent B missing?                                       */
/* ------------------------------------------------------------------ */

const GUESSES = ['watch for movement', 'remember last time', 'or simply guess'];
const PHRASES = ['ready now', 'route blocked', 'I will carry'];

/**
 * Opens on the two agents mid-cooperation — the joint action the Coordinate
 * section just finished building — and then takes their shared view away. The
 * wall drops, each agent turns out to be looking at different evidence, B has
 * to guess, and only then does a channel open and one fact cross it.
 */
const MissingInformation = () => {
  const frame = useCurrentFrame();

  // what we cut in on: the work, already divided, already working
  const cooperating = fade(frame, -30, -10, 230, 300);
  const wallOpacity = interpolate(frame, [250, 330, 1150, 1240], [0, 1, 1, 0.45], IN);
  const gap = interpolate(frame, [1150, 1240], [0, 1], IN);
  const rail = interpolate(frame, [1160, 1260], [0, 1], IN);

  const knows = frame >= 1290;
  const guess = GUESSES[Math.min(2, Math.floor(Math.max(0, frame - 900) / 90))];

  // the message, and the fact it happens to be carrying
  const phraseIndex = frame < 1330 ? 0 : frame < 1385 ? 1 : frame < 1440 ? 2 : 0;
  const changed = [1330, 1385, 1440].filter((c) => frame >= c).at(-1) ?? -999;
  const pop = interpolate(frame - changed, [0, 12], [1.07, 1], {...HARD, easing: EASE, output: 'perceptual-scale'});

  return (
    <>
      <Stage rail={rail} />
      <Wall opacity={wallOpacity} gap={gap} />

      {/* the division of labour we arrive in the middle of */}
      <Line x={664} y={232} width={400} size={26} weight={800} color={palette.muted} opacity={cooperating}>
        their actions fit together
      </Line>
      <Tile x={330} y={296} width={300} height={76} fill={palette.paleBlue} opacity={cooperating}>
        <div style={{fontSize: 28, fontWeight: 860, color: palette.ink}}>A preps the soup</div>
      </Tile>
      <Tile x={1090} y={296} width={300} height={76} fill={palette.paleOrange} opacity={cooperating}>
        <div style={{fontSize: 28, fontWeight: 860, color: palette.ink}}>B plates and serves</div>
      </Tile>
      <Tile x={830} y={296} width={72} height={76} fill={palette.paleGreen} opacity={cooperating}>
        <div style={{fontSize: 36, fontWeight: 900, color: palette.green}}>✓</div>
      </Tile>

      <Line x={664} y={486} width={400} size={22} weight={900} color={palette.muted} opacity={fade(frame, 340, 410, 1150, 1220)}>
        <span style={{letterSpacing: '0.14em'}}>NO LINE OF SIGHT</span>
      </Line>

      {/* the evidence each one has, and cannot share */}
      <Tile x={A_TILE.x} y={A_TILE.y} width={A_TILE.w} height={A_TILE.h} fill={palette.paleBlue} opacity={fade(frame, 535, 600)}>
        <Caps color={palette.blue}>AGENT A CAN SEE</Caps>
        <div style={{fontSize: 38, fontWeight: 900, color: palette.ink, letterSpacing: '-0.03em', marginTop: 6}}>the stove is ready</div>
      </Tile>
      <Tile x={B_TILE.x} y={B_TILE.y} width={B_TILE.w} height={B_TILE.h} fill={palette.paleOrange} opacity={fade(frame, 700, 765)}>
        <Caps color={palette.orange}>AGENT B CAN SEE</Caps>
        <div style={{fontSize: 38, fontWeight: 900, color: palette.ink, letterSpacing: '-0.03em', marginTop: 6}}>the serving hatch</div>
      </Tile>

      <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} viewBox={`0 0 ${W} ${H}`}>
        <line
          x1={210}
          y1={166}
          x2={210}
          y2={136}
          stroke={palette.blue}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray="3 11"
          opacity={fade(frame, 560, 620)}
        />
        <line
          x1={1518}
          y1={166}
          x2={1518}
          y2={136}
          stroke={palette.orange}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray="3 11"
          opacity={fade(frame, 725, 785)}
        />
      </svg>

      {/* B, without the fact, and then with it */}
      <Tile
        x={B_CHIP.x}
        y={B_CHIP.y}
        width={B_CHIP.w}
        height={B_CHIP.h}
        fill={knows ? palette.paleGreen : '#F1F5F9'}
        opacity={fade(frame, 880, 940)}
      >
        <Caps color={knows ? palette.green : palette.muted}>{knows ? 'AGENT B NOW' : 'AGENT B MUST'}</Caps>
        <div style={{fontSize: 30, fontWeight: 880, color: palette.ink, marginTop: 6}}>{knows ? 'plate the soup' : guess}</div>
      </Tile>

      {/* one fact, crossing the only opening there is */}
      <Token
        x={interpolate(frame, [1180, 1290], [300, PILL_AT_B], IN)}
        text={PHRASES[phraseIndex]}
        scale={pop}
        opacity={fade(frame, 1160, 1188)}
      />

      <Line x={34} y={556} width={1660} size={42} opacity={fade(frame, 1360, 1420)} dy={interpolate(frame, [1360, 1420], [14, 0], IN)}>
        A message earns its place when it changes what the teammate does.
      </Line>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 15 — What exactly did the agent choose?                             */
/* ------------------------------------------------------------------ */

const FORMS = ['ready now', '◆', '011', '[0.2, −0.7]'];

/**
 * Opens on the frame scene 14 ended on — the message resting beside B, B's
 * action already chosen — and makes that message the object of study. It is
 * pulled back to A, where it turns out to have been half of a decision: one
 * action in the world, one message to the team. The product of the two spaces
 * grows underneath the picture, and the same token is then sent again.
 */
const TwoChoices = () => {
  const frame = useCurrentFrame();

  const carried = interpolate(frame, [0, 60], [1, 0], IN); // the sentence 14 closed on
  const wallOpacity = interpolate(frame, [0, 200, 280], [0.45, 0.45, 0], IN);
  const chipHeld = fade(frame, -30, -10, 220, 290);

  // the message goes back to where it was chosen, then into the lower branch
  const tokenX = interpolate(frame, [230, 350, 1060, 1160], [PILL_AT_B, 500, 500, PILL_AT_B], IN);
  const tokenTop = interpolate(frame, [300, 370, 1040, 1120], [PILL_TOP, 330, 330, PILL_TOP], IN);
  const form = frame < 800 ? 0 : frame < 860 ? 1 : frame < 920 ? 2 : frame < 980 ? 3 : 0;
  const formChanged = [800, 860, 920, 980].filter((c) => frame >= c).at(-1) ?? -999;
  const pop = interpolate(frame - formChanged, [0, 12], [1.07, 1], {...HARD, easing: EASE, output: 'perceptual-scale'});

  const branches = fade(frame, 350, 430);

  return (
    <>
      <Stage />
      <Wall opacity={wallOpacity} gap={1} />

      <Tile x={A_TILE.x} y={A_TILE.y} width={A_TILE.w} height={A_TILE.h} fill={palette.paleBlue} opacity={fade(frame, -30, -10)}>
        <Caps color={palette.blue}>AGENT A CAN SEE</Caps>
        <div style={{fontSize: 38, fontWeight: 900, color: palette.ink, letterSpacing: '-0.03em', marginTop: 6}}>the stove is ready</div>
      </Tile>
      <Tile x={B_TILE.x} y={B_TILE.y} width={B_TILE.w} height={B_TILE.h} fill={palette.paleOrange} opacity={fade(frame, -30, -10, 200, 280)}>
        <Caps color={palette.orange}>AGENT B CAN SEE</Caps>
        <div style={{fontSize: 38, fontWeight: 900, color: palette.ink, letterSpacing: '-0.03em', marginTop: 6}}>the serving hatch</div>
      </Tile>

      {/* what the message did, before we ask what it was */}
      <Tile x={B_CHIP.x} y={B_CHIP.y} width={B_CHIP.w} height={B_CHIP.h} fill={palette.paleGreen} opacity={chipHeld}>
        <Caps color={palette.green}>AGENT B NOW</Caps>
        <div style={{fontSize: 30, fontWeight: 880, color: palette.ink, marginTop: 6}}>plate the soup</div>
      </Tile>
      <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} viewBox={`0 0 ${W} ${H}`}>
        <path
          d="M 1280 280 C 1280 330, 1300 352, 1352 386"
          fill="none"
          stroke={palette.purple}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray="4 12"
          opacity={fade(frame, 70, 130, 200, 260)}
        />
        {/* A's decision, split in two */}
        <g opacity={branches}>
          <path d="M 292 226 C 400 226, 410 144, 500 144" fill="none" stroke={palette.blue} strokeWidth={7} strokeLinecap="round" />
          <path d="M 292 254 C 400 254, 410 362, 500 362" fill="none" stroke={palette.purple} strokeWidth={7} strokeLinecap="round" />
        </g>
      </svg>
      <Line x={880} y={330} width={380} size={24} weight={860} color={palette.purple} opacity={fade(frame, 70, 130, 200, 260)}>
        it changed what B does
      </Line>

      {/* branch one: an action in the world */}
      <Tile x={500} y={88} width={400} height={112} fill={palette.paleBlue} opacity={fade(frame, 380, 440)}>
        <Caps color={palette.blue}>ACTION IN THE WORLD</Caps>
        <div style={{fontSize: 34, fontWeight: 880, color: palette.ink, marginTop: 6}}>move to the pot</div>
      </Tile>

      {/* branch two: the message itself, the same object as before */}
      <Line x={500} y={288} width={260} size={20} weight={900} color={palette.purple} opacity={fade(frame, 420, 480, 1020, 1070)}>
        <span style={{letterSpacing: '0.13em'}}>MESSAGE TO THE TEAM</span>
      </Line>
      <Token x={tokenX} top={tokenTop} text={FORMS[form]} scale={pop} mono={form === 2} />

      <div style={{position: 'absolute', left: 60, top: 396, width: 380, textAlign: 'center', fontFamily, opacity: fade(frame, 940, 1000)}}>
        <Tex tex={'m_i = f_i(o_i)'} size={36} />
        <div style={{fontSize: 22, fontWeight: 760, color: palette.muted, marginTop: 12}}>made from what A alone can see</div>
      </div>

      {/* the pair, then the space of pairs, in the same place */}
      <div style={{position: 'absolute', left: 464, top: 456, width: 800}}>
        <div style={{opacity: fade(frame, 470, 520, 600, 650)}}>
          <Equation latex={'a_i=(x_i,\\;m_i)'} note="one decision, with two parts" delay={-30} size={54} />
        </div>
      </div>
      <div style={{position: 'absolute', left: 464, top: 450, width: 800, opacity: fade(frame, 660, 720)}}>
        <Equation
          latex={'\\mathcal{A}_i=\\textcolor{#1E90FF}{\\mathcal{X}_i}\\times\\textcolor{#7A5AF8}{\\mathcal{M}_i}'}
          note="every physical action, paired with every message it could send"
          delay={-30}
          size={64}
        />
      </div>

      {/* and whatever arrives, B's policy now depends on */}
      <Tile x={B_CHIP.x} y={B_CHIP.y} width={B_CHIP.w} height={B_CHIP.h} fill={palette.paleOrange} opacity={fade(frame, 1120, 1190)}>
        <Caps color={palette.orange}>AGENT B'S POLICY</Caps>
        <div style={{marginTop: 8}}>
          <Tex tex={'\\pi_B(\\cdot \\mid o_B,\\; \\textcolor{#7A5AF8}{m})'} size={30} />
        </div>
      </Tile>

      <Line x={34} y={556} width={1660} size={42} opacity={carried}>
        A message earns its place when it changes what the teammate does.
      </Line>
      <Line x={460} y={296} width={800} size={38} opacity={fade(frame, 1240, 1300)} dy={interpolate(frame, [1240, 1300], [12, 0], IN)}>
        Both behaviours are learned at once.
      </Line>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 16 — Message Capacity                                               */
/* ------------------------------------------------------------------ */

const BIT_STAGES = [
  {bits: 1, start: 280},
  {bits: 2, start: 470},
  {bits: 3, start: 640},
];
const CELL = 76;
const CELL_GAP = 16;

/**
 * The same message, on the same channel, now with the channel itself made
 * visible. A gate closes around the token, the English phrase will not fit
 * through it, and what comes out is one bit. The alphabet the channel can
 * distinguish grows underneath — two, four, eight — and the formula is only a
 * name for the row of symbols already on screen.
 */
const Capacity = () => {
  const frame = useCurrentFrame();

  const stage = BIT_STAGES.filter((s) => frame >= s.start).at(-1);
  const bits = stage?.bits ?? 0;
  const count = bits === 0 ? 0 : 2 ** bits;
  const gridW = count * CELL + (count - 1) * CELL_GAP;
  const gridLeft = 864 - gridW / 2;

  // the phrase is squeezed into a bit string
  const squeeze = interpolate(frame, [180, 300], [0, 1], IN);
  const tokenX = interpolate(squeeze, [0, 1], [PILL_AT_B, TOKEN_MID], HARD);
  const tokenW = interpolate(squeeze, [0, 1], [PILL_W, TOKEN_W], HARD);
  const squeezed = frame >= 262;
  const bitText = bits === 0 ? '' : (bits === 1 ? '1' : bits === 2 ? '10' : '011');

  const gate = fade(frame, 130, 200);

  return (
    <>
      <Stage />
      <Gate opacity={gate} />

      {/* carried in from scene 15, and let go once the channel has our attention */}
      <Tile x={B_CHIP.x} y={B_CHIP.y} width={B_CHIP.w} height={B_CHIP.h} fill={palette.paleOrange} opacity={fade(frame, -30, -10, 70, 140)}>
        <Caps color={palette.orange}>AGENT B'S POLICY</Caps>
        <div style={{marginTop: 8}}>
          <Tex tex={'\\pi_B(\\cdot \\mid o_B,\\; \\textcolor{#7A5AF8}{m})'} size={30} />
        </div>
      </Tile>
      <Line x={460} y={296} width={800} size={38} opacity={fade(frame, -30, -10, 40, 110)}>
        Both behaviours are learned at once.
      </Line>

      <Line x={694} y={168} width={340} size={22} weight={900} color={palette.purple} opacity={gate}>
        <span style={{letterSpacing: '0.14em'}}>THE CHANNEL</span>
      </Line>

      <Token
        x={tokenX}
        width={tokenW}
        text={squeezed ? bitText : 'ready now'}
        mono={squeezed}
        size={squeezed ? 32 : 30}
      />

      <div
        style={{
          position: 'absolute',
          left: 764,
          top: 296,
          width: 200,
          textAlign: 'center',
          fontFamily,
          opacity: fade(frame, 250, 310),
        }}
      >
        <Tex tex={`b = ${Math.max(1, bits)}`} size={42} color={palette.purple} />
      </div>

      {/* everything this channel can tell apart */}
      {Array.from({length: count}, (_, index) => (
        <div
          key={`${bits}-${index}`}
          style={{
            position: 'absolute',
            left: gridLeft + index * (CELL + CELL_GAP),
            top: 356,
            width: CELL,
            height: CELL,
            borderRadius: 18,
            background: palette.palePurple,
            color: palette.purple,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: MONO,
            fontSize: bits === 1 ? 32 : bits === 2 ? 28 : 24,
            fontWeight: 800,
            opacity: interpolate(frame, [(stage?.start ?? 0) + index * 3, (stage?.start ?? 0) + 26 + index * 3], [0, 1], IN),
            scale: interpolate(frame, [(stage?.start ?? 0) + index * 3, (stage?.start ?? 0) + 26 + index * 3], [0.7, 1], {
              ...IN,
              output: 'perceptual-scale',
            }),
          }}
        >
          {index.toString(2).padStart(bits, '0')}
        </div>
      ))}

      <Line
        x={264}
        y={452}
        width={1200}
        size={32}
        weight={820}
        color={palette.muted}
        opacity={fade(frame, (stage?.start ?? 0) + 40, (stage?.start ?? 0) + 90, 900, 950)}
      >
        {count} messages the team can tell apart
      </Line>
      <Line x={264} y={452} width={1200} size={32} weight={820} color={palette.muted} opacity={fade(frame, 960, 1010)}>
        so a protocol keeps the distinctions the task needs, and drops the rest
      </Line>

      <div style={{position: 'absolute', left: 464, top: 500, width: 800, opacity: fade(frame, 800, 860)}}>
        <Equation
          latex={'|\\mathcal{M}| = 2^{\\textcolor{#7A5AF8}{b}}'}
          note="b bits of channel, and never more symbols than that"
          delay={-30}
          size={56}
        />
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 17 — Was that message worth sending?                                */
/* ------------------------------------------------------------------ */

const STREAM = [0, 1, 2, 3, 4, 5, 6].map((k) => ({
  start: k === 0 ? 90 : 150 + (k - 1) * 46,
  from: k === 0 ? TOKEN_MID : RAIL_X0,
  travel: k === 0 ? 60 : 96,
}));

/**
 * The same channel, now with a price on it. The token starts talking and does
 * not stop; a meter fills underneath; and the reward the agent optimises is
 * rewritten one term at a time. Then the channel itself misbehaves — the same
 * message lost, corrupted and late — three variations of one object rather
 * than three cards.
 */
const WorthSending = () => {
  const frame = useCurrentFrame();

  const carriedCells = fade(frame, -30, -10, 60, 130);
  const launched = frame < 90 ? 0 : Math.min(7, 2 + Math.floor((frame - 150) / 46));
  const meter = fade(frame, 120, 180, 560, 620);

  const terms = [
    {tex: 'r_t', caption: 'what the task pays', at: 300, x: 140},
    {tex: '-\\;\\textcolor{#F59E42}{\\lambda\\, c(m_t)}', caption: 'what the talking costs', at: 380, x: 644},
    {tex: '=\\;r_t^{\\prime}', caption: 'what the agent actually optimises', at: 460, x: 1148},
  ];

  const lost = frame - 700;
  const noisy = frame - 840;
  const late = frame - 980;
  const failing = frame >= 700 && frame < 1130;
  const word = frame < 840 ? 'lost' : frame < 980 ? 'noisy' : 'delayed';
  const wordColor = frame < 840 ? palette.red : frame < 980 ? palette.orange : palette.purple;
  const wordLine =
    frame < 840
      ? 'the packet never arrives, and the receiver waits on nothing'
      : frame < 980
        ? 'a symbol arrives, but not the one that was sent'
        : 'it arrives after the moment it was useful';

  return (
    <>
      <Stage />
      <Gate opacity={1} />

      {/* what scene 16 left on screen, released one piece at a time */}
      {Array.from({length: 8}, (_, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: 504 + index * (CELL + CELL_GAP),
            top: 356,
            width: CELL,
            height: CELL,
            borderRadius: 18,
            background: palette.palePurple,
            color: palette.purple,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: MONO,
            fontSize: 24,
            fontWeight: 800,
            opacity: carriedCells,
          }}
        >
          {index.toString(2).padStart(3, '0')}
        </div>
      ))}
      <div
        style={{
          position: 'absolute',
          left: 764,
          top: 296,
          width: 200,
          textAlign: 'center',
          fontFamily,
          opacity: fade(frame, -30, -10, 60, 130),
        }}
      >
        <Tex tex={'b = 3'} size={42} color={palette.purple} />
      </div>
      <Line x={264} y={452} width={1200} size={32} weight={820} color={palette.muted} opacity={fade(frame, -30, -10, 40, 110)}>
        so a protocol keeps the distinctions the task needs, and drops the rest
      </Line>
      <div style={{position: 'absolute', left: 464, top: 500, width: 800, opacity: fade(frame, -30, -10, 30, 100)}}>
        <Equation latex={'|\\mathcal{M}| = 2^{\\textcolor{#7A5AF8}{b}}'} note="b bits of channel, and never more symbols than that" delay={-30} size={56} />
      </div>

      {/* it keeps talking */}
      {!failing && frame < 1240
        ? STREAM.map((s, k) => (
            <Token
              key={k}
              x={interpolate(frame, [s.start, s.start + s.travel], [s.from, 1400], {easing: Easing.linear, ...HARD})}
              width={TOKEN_W}
              text="011"
              mono
              size={32}
              opacity={
                interpolate(frame, [s.start - 6, s.start + 6], [k === 0 ? 1 : 0, 1], HARD) *
                interpolate(frame, [s.start + s.travel - 14, s.start + s.travel], [1, 0], HARD)
              }
            />
          ))
        : null}

      {/* and the meter keeps filling */}
      <Line x={472} y={318} width={400} size={22} weight={900} color={palette.muted} opacity={meter}>
        <span style={{letterSpacing: '0.14em'}}>COST OF TALKING</span>
      </Line>
      <div style={{position: 'absolute', left: 472, top: 352, width: 784, height: 22, borderRadius: 13, background: palette.line, overflow: 'hidden', opacity: meter}}>
        <div
          style={{
            height: '100%',
            borderRadius: 13,
            background: palette.orange,
            width: `${interpolate(frame, [120, 500], [5, 100], {easing: Easing.linear, ...HARD})}%`,
          }}
        />
      </div>
      <Line x={1276} y={342} width={170} size={34} weight={950} color={palette.orange} opacity={meter}>
        {launched} sent
      </Line>

      {/* so the reward the agent optimises is not the reward the task pays */}
      {terms.map((term) => (
        <div
          key={term.tex}
          style={{
            position: 'absolute',
            left: term.x,
            top: 440,
            width: 440,
            textAlign: 'center',
            fontFamily,
            opacity: fade(frame, term.at, term.at + 44, 640, 700),
            translate: `0px ${interpolate(frame, [term.at, term.at + 44], [14, 0], IN)}px`,
          }}
        >
          <Tex tex={term.tex} size={58} />
          <div style={{fontSize: 26, fontWeight: 780, color: palette.muted, marginTop: 26}}>{term.caption}</div>
        </div>
      ))}

      {/* the same message, three ways the channel can let it down */}
      {failing ? (
        <>
          {frame < 840 ? (
            <Token
              x={interpolate(lost, [10, 70], [RAIL_X0, 820], {easing: Easing.linear, ...HARD})}
              width={TOKEN_W}
              text="011"
              mono
              size={32}
              opacity={interpolate(lost, [6, 18], [0, 1], HARD) * interpolate(lost, [70, 108], [1, 0], HARD)}
              rotate={`${interpolate(lost, [70, 108], [0, 34], HARD)}deg`}
              dy={interpolate(lost, [70, 112], [0, 104], {easing: Easing.bezier(0.4, 0, 1, 1), ...HARD})}
            />
          ) : null}
          {frame >= 840 && frame < 980 ? (
            <Token
              x={interpolate(noisy, [10, 100], [RAIL_X0, 1400], {easing: Easing.linear, ...HARD})}
              width={TOKEN_W}
              text={noisy > 40 && Math.floor(noisy / 5) % 2 === 0 ? '001' : '011'}
              color={noisy > 40 ? palette.orange : palette.purple}
              mono
              size={32}
              opacity={interpolate(noisy, [6, 18], [0, 1], HARD) * interpolate(noisy, [104, 118], [1, 0], HARD)}
            />
          ) : null}
          {frame >= 980 ? (
            <Token
              x={interpolate(late, [10, 132], [RAIL_X0, 1400], {easing: Easing.linear, ...HARD})}
              width={TOKEN_W}
              text="011"
              mono
              size={32}
              opacity={interpolate(late, [6, 18], [0, 1], HARD) * interpolate(late, [134, 148], [1, 0], HARD)}
            />
          ) : null}
          <Line x={264} y={420} width={1200} size={84} weight={950} color={wordColor} opacity={fade(frame, 706, 750)}>
            {word}
          </Line>
          <Line x={264} y={532} width={1200} size={30} weight={780} color={palette.muted} opacity={fade(frame, 716, 760)}>
            {wordLine}
          </Line>
        </>
      ) : null}

      <Tile x={B_CHIP.x} y={B_CHIP.y} width={B_CHIP.w} height={B_CHIP.h} fill="#F1F5F9" opacity={fade(frame, 1030, 1080, 1120, 1170)}>
        <Caps color={palette.muted}>AGENT B</Caps>
        <div style={{fontSize: 30, fontWeight: 880, color: palette.ink, marginTop: 6}}>acted without it</div>
      </Tile>

      <Line x={264} y={440} width={1200} size={42} opacity={fade(frame, 1150, 1200, 1230, 1270)}>
        Train on a perfect channel, and the team collapses when the channel changes.
      </Line>

      {/* the message comes back, and the scene rests on what a good sender does */}
      <Token x={TOKEN_MID} width={TOKEN_W} text="011" mono size={32} opacity={fade(frame, 1250, 1300)} />
      <Line x={264} y={440} width={1200} size={42} opacity={fade(frame, 1280, 1330)} dy={interpolate(frame, [1280, 1330], [12, 0], IN)}>
        So speak when it is worth it, and act sensibly when nothing arrives.
      </Line>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 18 — Learned Communication Protocols                                */
/* ------------------------------------------------------------------ */

const PAIRS = [
  {situation: 'the pot is ready', symbol: '●', action: 'fetch the pot'},
  {situation: 'the plate is empty', symbol: '▲', action: 'bring a plate'},
  {situation: 'the door is blocked', symbol: '◆', action: 'take the long way'},
  {situation: 'the order changed', symbol: '■', action: 'wait'},
];
const GLYPHS = ['●', '▲', '◆', '■'];
const ROW_Y = [396, 452, 508, 564];
const SIT = {x: 364, w: 380};
const SYM = {x: 814, w: 100};
const ACT = {x: 984, w: 380};

/**
 * The last scene on the stage, and the one that has to hand over to Adapt.
 *
 * It opens on exactly what 17 closed on — the two agents, the channel, the
 * three-bit token — and turns those bits into a symbol nobody chose. The
 * pairings arrive wrong and jittering, then lock, because the meaning is
 * earned by reward rather than assigned by us.
 *
 * It ENDS deliberately: Agent A, Agent B, and the symbol between them, with B
 * having just read it correctly. The Adapt section opens on that picture and
 * slides B out for a partner who reads it differently, so this final frame is
 * a contract and its geometry must not move.
 */
const LearnedProtocols = () => {
  const frame = useCurrentFrame();

  // the sentence scene 17 rested on, carried in and released
  const carried = fade(frame, -30, -10, 40, 90);
  // the bits become a glyph: same object, different alphabet
  const toGlyph = interpolate(frame, [70, 130], [0, 1], IN);
  const rows = fade(frame, 210, 260, 980, 1040);
  const locked = frame >= 620;
  const lockedAt = (i: number) => 620 + i * 26;
  // before the lock the symbol column cannot keep still
  const jitter = (i: number) => GLYPHS[(i + Math.floor(frame / 7)) % 4];

  const spotlight = frame >= 800 && frame < 980 ? 2 : -1;
  const delivered = frame >= 1040;

  return (
    <>
      <Stage rail={1} railColor={palette.line} />
      <Gate opacity={interpolate(frame, [0, 90], [1, 0], IN)} />

      <Line x={264} y={440} width={1200} size={42} opacity={carried}>
        So speak when it is worth it, and act sensibly when nothing arrives.
      </Line>

      {/* the message, now a symbol whose meaning nobody assigned */}
      <Token
        x={delivered ? interpolate(frame, [1040, 1120], [TOKEN_MID, TOKEN_AT_B], IN) : TOKEN_MID}
        width={interpolate(toGlyph, [0, 1], [TOKEN_W, 96], HARD)}
        text={toGlyph < 0.5 ? '011' : PAIRS[2].symbol}
        mono={toGlyph < 0.5}
        size={interpolate(toGlyph, [0, 1], [32, 40], HARD)}
      />
      <Line x={504} y={132} width={720} size={28} weight={780} color={palette.muted} opacity={fade(frame, 120, 170, 1000, 1050)}>
        four symbols, and not one of them is a word
      </Line>

      {/* what the sender saw, what it sent, what the receiver did */}
      {rows > 0.01 ? (
        <>
          <Line x={SIT.x} y={356} width={SIT.w} size={19} weight={900} color={palette.muted} opacity={rows}>
            WHAT THE SENDER SEES
          </Line>
          <Line x={SYM.x - 40} y={356} width={SYM.w + 80} size={19} weight={900} color={palette.purple} opacity={rows}>
            SYMBOL
          </Line>
          <Line x={ACT.x} y={356} width={ACT.w} size={19} weight={900} color={palette.muted} opacity={rows}>
            WHAT THE RECEIVER DOES
          </Line>

          {PAIRS.map((pair, i) => {
            const arrive = fade(frame, 240 + i * 60, 300 + i * 60);
            const settled = frame >= lockedAt(i);
            const dim = spotlight >= 0 && spotlight !== i ? 0.28 : 1;
            const wobble = settled ? 0 : Math.sin((frame + i * 11) / 4) * 2.4;
            return (
              <div key={pair.symbol} style={{opacity: rows * arrive * dim}}>
                <Tile x={SIT.x} y={ROW_Y[i]} width={SIT.w} height={48} fill="#F1F5F9">
                  <div style={{fontSize: 25, fontWeight: 800, color: palette.ink}}>{pair.situation}</div>
                </Tile>
                <div
                  style={{
                    position: 'absolute',
                    left: SYM.x,
                    top: ROW_Y[i],
                    width: SYM.w,
                    height: 48,
                    borderRadius: 14,
                    background: settled ? palette.purple : '#E7E1FB',
                    color: settled ? palette.white : palette.purple,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    fontWeight: 900,
                    translate: `0px ${wobble}px`,
                  }}
                >
                  {settled ? pair.symbol : jitter(i)}
                </div>
                <Tile
                  x={ACT.x}
                  y={ROW_Y[i]}
                  width={ACT.w}
                  height={48}
                  fill={settled ? palette.paleGreen : '#F4F6F8'}
                >
                  <div style={{fontSize: 25, fontWeight: 800, color: settled ? palette.green : palette.muted}}>
                    {settled ? pair.action : 'anybody’s guess'}
                  </div>
                </Tile>
              </div>
            );
          })}
        </>
      ) : null}

      <Line x={264} y={632} width={1200} size={30} weight={800} color={palette.ink} opacity={fade(frame, 700, 750, 800, 840)}>
        Nobody assigned these meanings. Reward made the pairings worth keeping.
      </Line>

      <Line x={264} y={632} width={1200} size={30} weight={800} color={palette.ink} opacity={fade(frame, 850, 900, 970, 1010)}>
        The meaning lives in the pairing, not in the symbol.
      </Line>

      {/* B reads it correctly. This is the picture Adapt opens on. */}
      <Tile
        x={B_CHIP.x}
        y={B_CHIP.y}
        width={B_CHIP.w}
        height={B_CHIP.h}
        fill={palette.paleGreen}
        opacity={fade(frame, 1120, 1180)}
      >
        <Caps color={palette.green}>AGENT B</Caps>
        <div style={{fontSize: 29, fontWeight: 880, color: palette.ink, marginTop: 6}}>took the long way</div>
      </Tile>

      <Line x={264} y={556} width={1200} size={38} opacity={fade(frame, 1210, 1265)} dy={interpolate(frame, [1210, 1265], [12, 0], IN)}>
        So the question is not whether it helped in training.
      </Line>
      <Line x={264} y={612} width={1200} size={38} weight={920} opacity={fade(frame, 1265, 1315)} dy={interpolate(frame, [1265, 1315], [12, 0], IN)}>
        It is whether the meaning survives a change of listener.
      </Line>

    </>
  );
};

export const CommunicationVisuals: React.FC<{sceneIndex: number}> = ({sceneIndex}) => {
  switch (sceneIndex) {
    case 13:
      return <MissingInformation />;
    case 14:
      return <TwoChoices />;
    case 15:
      return <Capacity />;
    case 16:
      return <WorthSending />;
    default:
      return <LearnedProtocols />;
  }
};
