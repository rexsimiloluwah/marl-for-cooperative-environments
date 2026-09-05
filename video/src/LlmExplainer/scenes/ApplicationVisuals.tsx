import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {LlmAgent} from '../components/LlmAgent';
import {fontFamily, palette} from '../constants';

/**
 * APPLICATIONS — why any of this matters.
 *
 * Five scenes that escalate: a teaser that only opens the door, then three
 * concrete domains, then the zoom-out to populations, which is the
 * destination of the whole video.
 *
 *   12  a team at the centre, four unnamed paths growing outward
 *   13  the development loop, five roles, one shared codebase
 *   14  a scientific loop that deliberately never closes
 *   15  contention on a shared resource, then an allocation
 *   16  two agents become a hundred, and the graph starts behaving
 *
 * SOURCING. No number in this file came from anywhere but the papers the
 * narration names. Scene 14 and scene 16 are speculative and the narration
 * says so, so neither visual is allowed to show a working system: 14 has no
 * result and no stopping condition, and 16 labels "agent civilisations" as an
 * informal phrase rather than a category.
 *
 * The content box is 1728 x 690 and does NOT clip. Every y below is inside it
 * and the band under y=650 is left empty for the source note.
 */

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

/** 0 -> 1 over [a, b], eased and clamped. */
const ramp = (frame: number, a: number, b: number) =>
  interpolate(frame, [a, b], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE,
  });

/** 0 -> 1 over [a, b], linear and clamped, for anything that travels. */
const lin = (frame: number, a: number, b: number) =>
  interpolate(frame, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/** 0 -> 1 -> 0, for a flash. */
const pulse = (frame: number, at: number, len: number) =>
  interpolate(frame, [at, at + len * 0.35, at + len], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const caps: React.CSSProperties = {
  fontFamily,
  fontSize: 21,
  fontWeight: 900,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: palette.muted,
};

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/**
 * A borderless tinted fill. It is painted over white rather than left
 * translucent, so a token travelling underneath disappears behind it instead
 * of showing through and reading as an overlap.
 */
const tint = (color: string, alpha: string): React.CSSProperties => ({
  backgroundColor: palette.white,
  backgroundImage: `linear-gradient(${color}${alpha}, ${color}${alpha})`,
});

/** Rotate a shape into polygon points, so nothing needs an SVG transform. */
const rot = (x: number, y: number, deg: number, pts: number[][]) => {
  const r = (deg * Math.PI) / 180;
  return pts
    .map(([px, py]) => `${x + px * Math.cos(r) - py * Math.sin(r)},${y + px * Math.sin(r) + py * Math.cos(r)}`)
    .join(' ');
};

/** An arrowhead. */
const tri = (x: number, y: number, deg: number, s: number) =>
  rot(x, y, deg, [
    [s, 0],
    [-s * 0.72, s * 0.64],
    [-s * 0.72, -s * 0.64],
  ]);

/* ------------------------------------------------------------------ */
/* 12 · Where Could Cooperative LLM Agents Matter? — the teaser        */
/* ------------------------------------------------------------------ */

/**
 * Fifteen seconds, so this scene is allowed to say almost nothing. One team,
 * four paths leaving it, four destinations that are deliberately still a
 * question mark. Naming the domains here would spend the next three scenes
 * before they start.
 */

const TEAM_CX = 864;
const TEAM_CY = 272;
const TEAM = [
  {cx: 784, cy: 228, color: palette.blue, delay: 6},
  {cx: 944, cy: 228, color: palette.purple, delay: 16},
  {cx: 864, cy: 352, color: palette.orange, delay: 26},
];

const TEASER_PATHS = [
  {sx: 669.9, sy: 223.9, qx: 470, qy: 126, ex: 250, ey: 120},
  {sx: 1058.1, sy: 223.9, qx: 1258, qy: 126, ex: 1478, ey: 120},
  {sx: 673.6, sy: 333.4, qx: 470, qy: 444, ex: 250, ey: 470},
  {sx: 1054.4, sy: 333.4, qx: 1258, qy: 444, ex: 1478, ey: 470},
];
/** Reveal them across the diagonal, so the frame does not fill one side first. */
const TEASER_ORDER = [0, 3, 1, 2];

const WhereItMatters: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <>
      <svg
        style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}}
        viewBox="0 0 1728 690"
      >
        <circle cx={TEAM_CX} cy={TEAM_CY} r={200} fill={palette.paleGreen} opacity={ramp(frame, 0, 26)} />

        <g
          stroke={palette.green}
          strokeWidth={4}
          strokeLinecap="round"
          opacity={ramp(frame, 40, 70) * 0.5}
        >
          <line x1={784} y1={228} x2={944} y2={228} />
          <line x1={784} y1={228} x2={864} y2={352} />
          <line x1={944} y1={228} x2={864} y2={352} />
        </g>

        {TEASER_PATHS.map((p, i) => {
          const at = 90 + TEASER_ORDER.indexOf(i) * 38;
          const drawn = ramp(frame, at, at + 108);
          return (
            <path
              key={`p${i}`}
              d={`M ${p.sx} ${p.sy} Q ${p.qx} ${p.qy} ${p.ex} ${p.ey}`}
              fill="none"
              stroke={palette.green}
              strokeWidth={6}
              strokeLinecap="round"
              opacity={0.5}
              pathLength={1}
              strokeDasharray={`${drawn} 1`}
            />
          );
        })}

        {TEASER_PATHS.map((p, i) => {
          const at = 90 + TEASER_ORDER.indexOf(i) * 38 + 96;
          const on = ramp(frame, at, at + 34);
          const breathe = 1 + 0.045 * Math.sin((frame - at) / 14);
          const r = 46 * (0.45 + 0.55 * on) * breathe;
          return (
            <g key={`n${i}`} opacity={on}>
              <circle cx={p.ex} cy={p.ey} r={r} fill={`${palette.green}1F`} />
              <text
                x={p.ex}
                y={p.ey + 16}
                textAnchor="middle"
                fontFamily={fontFamily}
                fontSize={44}
                fontWeight={900}
                fill={palette.green}
                opacity={0.75}
              >
                ?
              </text>
            </g>
          );
        })}
      </svg>

      {TEAM.map((t) => (
        <LlmAgent
          key={t.cx}
          color={t.color}
          x={t.cx - 46}
          y={t.cy - 46}
          size={92}
          delay={t.delay}
          busy={frame > 44 && frame < 150}
        />
      ))}

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 576,
          width: 1728,
          textAlign: 'center',
          fontFamily,
          fontSize: 31,
          fontWeight: 800,
          color: palette.muted,
          opacity: ramp(frame, 300, 344),
        }}
      >
        multiple roles · interdependent decisions · one shared outcome
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 13 · Software Engineering Becomes a Team Problem                    */
/* ------------------------------------------------------------------ */

/**
 * The pipeline is the easy part of this picture and it is not the point. The
 * point is the moment the plan line changes and three lines someone else
 * wrote stop being correct without anyone touching them.
 */

const STAGES = [
  {name: 'UNDERSTAND', color: palette.navy},
  {name: 'PLAN', color: palette.green},
  {name: 'IMPLEMENT', color: palette.blue},
  {name: 'TEST', color: palette.purple},
  {name: 'REVIEW', color: palette.orange},
];
const PW = 288;
const PGAP = 72;
const PILL_Y = 92;
const PILL_H = 76;
const stageX = (i: number) => i * (PW + PGAP);
const stageCx = (i: number) => stageX(i) + PW / 2;

const PANEL = {x: 300, y: 292, w: 1128, h: 252};
const codeY = (i: number) => PANEL.y + 58 + i * 32;
/** The gutter where the dependency between two agents' lines is drawn. */
const DEP_X = PANEL.x + 520;

const CODE: {owner: number; text: string; after?: string}[] = [
  {owner: 0, text: 'note: config is read from env'},
  {owner: 1, text: 'plan: retry on failure', after: 'plan: fail fast, no retry'},
  {owner: 2, text: 'impl: retry_loop(task)'},
  {owner: 2, text: 'impl: on_error -> retry'},
  {owner: 3, text: 'test: retries until success'},
  {owner: 4, text: 'review: implementation matches plan', after: 'review: follows the previous plan'},
];
const STALE = [2, 3, 4];
const writeAt = (i: number) => 400 + 28 * i;

/** The feedback arc, as a quadratic, so a pulse can be put on it. */
const ARC = {x0: 1584, y0: 168, cx: 864, cy: 306, x1: 144, y1: 168};
const arcPoint = (t: number) => {
  const u = 1 - t;
  return {
    x: u * u * ARC.x0 + 2 * u * t * ARC.cx + t * t * ARC.x1,
    y: u * u * ARC.y0 + 2 * u * t * ARC.cy + t * t * ARC.y1,
  };
};

const SoftwareTeam: React.FC = () => {
  const frame = useCurrentFrame();

  const planChanged = frame >= 640;
  const reviewFlipped = frame >= 880;
  const stale = ramp(frame, 690, 736);
  const arcLive = ramp(frame, 880, 940) * (1 - ramp(frame, 1080, 1140));
  const panelGlow = ramp(frame, 970, 1030) * (1 - ramp(frame, 1130, 1190));

  return (
    <>
      {/* ---- the loop ------------------------------------------------ */}
      <svg
        style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}}
        viewBox="0 0 1728 690"
      >
        {STAGES.slice(0, 4).map((s, i) => {
          const at = 60 + 34 * i;
          const on = ramp(frame, at, at + 30);
          const x0 = stageX(i) + PW + 12;
          const x1 = stageX(i + 1) - 14;
          return (
            <g key={`a${i}`} opacity={on}>
              <line x1={x0} y1={130} x2={x1} y2={130} stroke={palette.line} strokeWidth={5} strokeLinecap="round" />
              <polygon points={tri(x1 + 8, 130, 0, 13)} fill={palette.line} />
            </g>
          );
        })}

        {/* review feeds the next turn: the arc under the row */}
        <path
          d={`M ${ARC.x0} ${ARC.y0} Q ${ARC.cx} ${ARC.cy} ${ARC.x1} ${ARC.y1}`}
          fill="none"
          stroke={arcLive > 0.02 ? palette.orange : palette.muted}
          strokeWidth={arcLive > 0.02 ? 7 : 5}
          strokeLinecap="round"
          opacity={0.3 + 0.6 * arcLive}
          pathLength={1}
          strokeDasharray={`${ramp(frame, 300, 352)} 1`}
        />
        <polygon
          points={tri(216, 181, 190, 15)}
          fill={arcLive > 0.02 ? palette.orange : palette.muted}
          opacity={(arcLive > 0.02 ? 1 : 0.55) * ramp(frame, 340, 372)}
        />
        {arcLive > 0.02 ? (
          <circle
            cx={arcPoint(lin(frame, 884, 968)).x}
            cy={arcPoint(lin(frame, 884, 968)).y}
            r={11}
            fill={palette.orange}
            opacity={arcLive}
          />
        ) : null}

      </svg>

      {/* ---- the five roles ------------------------------------------ */}
      {STAGES.map((s, i) => {
        const at = 20 + 34 * i;
        const on = ramp(frame, at, at + 30);
        const staleStage = planChanged && (i === 2 || i === 3);
        const flash = i === 1 ? pulse(frame, 630, 70) : 0;
        return (
          <div
            key={s.name}
            style={{
              position: 'absolute',
              left: stageX(i),
              top: PILL_Y,
              width: PW,
              height: PILL_H,
              borderRadius: PILL_H / 2,
              ...(staleStage
                ? tint(palette.red, Math.round(12 + 26 * stale).toString(16).padStart(2, '0'))
                : tint(s.color, flash > 0.02 ? '3A' : '1F')),
              display: 'grid',
              placeItems: 'center',
              opacity: on,
              scale: 0.92 + 0.08 * on + 0.03 * flash,
            }}
          >
            <div
              style={{
                fontFamily,
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: '0.1em',
                color: palette.ink,
              }}
            >
              {s.name}
            </div>
          </div>
        );
      })}

      {STAGES.map((s, i) => {
        const owns = CODE.map((c, ci) => (c.owner === i ? ci : -1)).filter((ci) => ci >= 0);
        const busy = owns.some((ci) => frame > writeAt(ci) - 14 && frame < writeAt(ci) + 26);
        return (
          <LlmAgent key={`h${s.name}`} color={s.color} x={stageCx(i) - 36} y={4} size={72} delay={200 + 24 * i} busy={busy} />
        );
      })}

      <div
        style={{
          ...caps,
          position: 'absolute',
          left: 0,
          top: 256,
          width: 1728,
          textAlign: 'center',
          fontSize: 20,
          color: arcLive > 0.02 ? palette.orange : palette.muted,
          opacity: ramp(frame, 340, 380),
        }}
      >
        review feeds the next turn
      </div>

      {/* ---- one shared artefact ------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          left: PANEL.x,
          top: PANEL.y,
          width: PANEL.w,
          height: PANEL.h,
          borderRadius: 26,
          background: palette.paper,
          border: `3px solid ${palette.line}`,
          opacity: ramp(frame, 360, 404),
          boxShadow: panelGlow > 0.02 ? `0 0 0 ${8 * panelGlow}px ${palette.green}22` : 'none',
        }}
      />
      <div
        style={{
          ...caps,
          position: 'absolute',
          left: PANEL.x + 28,
          top: PANEL.y + 22,
          fontSize: 19,
          opacity: ramp(frame, 372, 416),
        }}
      >
        one shared codebase · every agent writes here
      </div>

      {/* Drawn after the panel, so what the agents write lands on top of it. */}
      <svg
        style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}}
        viewBox="0 0 1728 690"
      >
        {/* the packet each agent writes into the shared file */}
        {CODE.map((c, i) => {
          const t = lin(frame, writeAt(i), writeAt(i) + 22);
          if (t <= 0 || t >= 1) return null;
          const x = lerp(stageCx(c.owner), PANEL.x + 44, t);
          const y = lerp(PILL_Y + PILL_H + 8, codeY(i) + 11, t);
          return (
            <rect
              key={`k${i}`}
              x={x - 9}
              y={y - 9}
              width={18}
              height={18}
              rx={5}
              fill={STAGES[c.owner].color}
              opacity={0.9}
            />
          );
        })}

        {/* the dependency: one plan line, three lines that assume it */}
        <g opacity={ramp(frame, 580, 624)}>
          <line
            x1={DEP_X}
            y1={codeY(1) + 11}
            x2={DEP_X}
            y2={codeY(4) + 11}
            stroke={planChanged ? palette.red : palette.muted}
            strokeWidth={5}
            strokeLinecap="round"
            opacity={planChanged ? 0.35 + 0.65 * stale : 1}
          />
          {[1, 2, 3, 4].map((li) => (
            <line
              key={`t${li}`}
              x1={DEP_X - 26}
              y1={codeY(li) + 11}
              x2={DEP_X}
              y2={codeY(li) + 11}
              stroke={planChanged && li > 1 ? palette.red : palette.muted}
              strokeWidth={5}
              strokeLinecap="round"
              opacity={planChanged && li > 1 ? 0.35 + 0.65 * stale : 1}
            />
          ))}
          {frame > 640 && frame < 706 ? (
            <circle
              cx={DEP_X}
              cy={lerp(codeY(1) + 11, codeY(4) + 11, lin(frame, 644, 700))}
              r={10}
              fill={palette.red}
            />
          ) : null}
        </g>

        {/* the reviewer notices, and its note travels back to the plan */}
        {frame > 826 && frame < 890 ? (
          <rect
            x={lerp(stageCx(4), PANEL.x + 560, lin(frame, 830, 884)) - 11}
            y={lerp(PILL_Y + PILL_H + 8, codeY(5) + 11, lin(frame, 830, 884)) - 11}
            width={22}
            height={22}
            rx={6}
            fill={palette.orange}
          />
        ) : null}
      </svg>

      {CODE.map((c, i) => {
        const on = ramp(frame, writeAt(i) + 20, writeAt(i) + 48);
        const isStale = STALE.includes(i) && planChanged;
        const changed = (i === 1 && planChanged) || (i === 5 && reviewFlipped);
        const text = changed && c.after ? c.after : c.text;
        const tint = i === 5 && reviewFlipped ? palette.red : isStale ? palette.red : STAGES[c.owner].color;
        return (
          <div key={`c${i}`} style={{position: 'absolute', left: PANEL.x + 28, top: codeY(i), opacity: on}}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 9,
                height: 22,
                borderRadius: 5,
                background: tint,
                opacity: 0.85,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 24,
                top: -1,
                whiteSpace: 'nowrap',
                fontFamily: MONO,
                fontSize: 20,
                fontWeight: 600,
                color: isStale || (i === 5 && reviewFlipped) ? palette.red : palette.ink,
                opacity: isStale ? 1 - 0.4 * stale : 1,
                textDecoration: isStale ? 'line-through' : 'none',
              }}
            >
              {text}
            </div>
          </div>
        );
      })}

      <div
        style={{
          ...caps,
          position: 'absolute',
          left: DEP_X + 22,
          top: codeY(1) + 1,
          fontSize: 18,
          opacity: ramp(frame, 588, 630) * (1 - ramp(frame, 660, 692)),
        }}
      >
        three lines assume this one
      </div>

      <div
        style={{
          position: 'absolute',
          left: DEP_X + 22,
          top: codeY(2) + 2,
          width: 470,
          fontFamily,
          fontSize: 23,
          fontWeight: 800,
          lineHeight: 1.3,
          color: palette.red,
          opacity: ramp(frame, 706, 750),
        }}
      >
        untouched by anyone, and now solving the previous plan
      </div>

      {/* ---- the line the scene exists for --------------------------- */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 566,
          width: 1728,
          textAlign: 'center',
          fontFamily,
          fontSize: 42,
          fontWeight: 860,
          letterSpacing: '-0.025em',
          color: palette.ink,
          opacity: ramp(frame, 730, 790),
          translate: `0px ${(1 - ramp(frame, 730, 790)) * 12}px`,
        }}
      >
        A brilliant implementation is not useful if it solves the wrong plan.
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 14 · Can LLM Agents Reason Like a Scientific Team?                  */
/* ------------------------------------------------------------------ */

/**
 * SPECULATIVE, and the frame has to say so. The narration is explicit that
 * today's LLM teams have not solved scientific discovery, so there is no
 * result here, no verdict, no tick. The loop runs and keeps running, the
 * revision log ends on an empty slot, and the open-endedness is the content.
 */

const SCI = {cx: 560, cy: 300, a: 330, b: 165};
const sciPoint = (deg: number) => {
  const r = (deg * Math.PI) / 180;
  return {x: SCI.cx + SCI.a * Math.cos(r), y: SCI.cy + SCI.b * Math.sin(r)};
};
/** Tangent direction of the ellipse, for the arrowheads that give it a sense. */
const sciTangent = (deg: number) => {
  const r = (deg * Math.PI) / 180;
  return (Math.atan2(SCI.b * Math.cos(r), -SCI.a * Math.sin(r)) * 180) / Math.PI;
};

type SciNode = {
  deg: number;
  name: string;
  role: string;
  color: string;
  at: number;
  agent?: {cx: number; cy: number};
};

const SCI_NODES: SciNode[] = [
  {deg: -90, name: 'HYPOTHESIS', role: 'one agent proposes', color: palette.blue, at: 60, agent: {cx: 560, cy: 45}},
  {deg: -18, name: 'EVIDENCE', role: 'seeks contradictions', color: palette.purple, at: 150, agent: {cx: 1042, cy: 150}},
  {deg: 54, name: 'CRITIQUE', role: 'challenges assumptions', color: palette.orange, at: 260, agent: {cx: 826, cy: 590}},
  {deg: 126, name: 'REVISION', role: 'the claim is rewritten', color: palette.green, at: 350},
  {deg: 198, name: 'EXPERIMENT', role: 'operates a tool', color: palette.navy, at: 430, agent: {cx: 80, cy: 150}},
];

const SCI_PILL_W = 224;
const SCI_PILL_H = 74;
const TOKEN_START = 460;
const TOKEN_PERIOD = 200;

const REVISIONS = [
  {at: 560, text: 'H1 · an initial claim'},
  {at: 760, text: 'H2 · narrowed after a contradiction'},
  {at: 960, text: 'H3 · an assumption made explicit'},
];

const ScientificTeam: React.FC = () => {
  const frame = useCurrentFrame();
  const running = frame > TOKEN_START;
  const tokenDeg = -90 + ((frame - TOKEN_START) / TOKEN_PERIOD) * 360;
  const token = sciPoint(tokenDeg);

  return (
    <>
      <svg
        style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}}
        viewBox="0 0 1728 690"
      >
        <ellipse
          cx={SCI.cx}
          cy={SCI.cy}
          rx={SCI.a}
          ry={SCI.b}
          fill="none"
          stroke={palette.line}
          strokeWidth={5}
          pathLength={1}
          strokeDasharray={`${ramp(frame, 10, 78)} 1`}
        />

        {[-54, 18, 90, 162, 234].map((d, i) => {
          const p = sciPoint(d);
          return (
            <polygon
              key={`ar${i}`}
              points={tri(p.x, p.y, sciTangent(d), 13)}
              fill={palette.line}
              opacity={ramp(frame, 80 + i * 14, 130 + i * 14)}
            />
          );
        })}

        {SCI_NODES.map((n) => {
          if (!n.agent) return null;
          const p = sciPoint(n.deg);
          return (
            <line
              key={`l${n.name}`}
              x1={n.agent.cx}
              y1={n.agent.cy}
              x2={p.x}
              y2={p.y}
              stroke={n.color}
              strokeWidth={3}
              opacity={ramp(frame, n.at + 18, n.at + 56) * 0.4}
            />
          );
        })}

        {running ? (
          <g>
            <circle cx={token.x} cy={token.y} r={22} fill={`${palette.green}26`} />
            <circle cx={token.x} cy={token.y} r={11} fill={palette.green} />
          </g>
        ) : null}
      </svg>

      {SCI_NODES.map((n) => {
        const p = sciPoint(n.deg);
        const on = ramp(frame, n.at, n.at + 36);
        // the node lights while the claim is passing through it
        const near = running
          ? Math.max(0, 1 - Math.abs(((((tokenDeg - n.deg) % 360) + 540) % 360) - 180) / 180)
          : 0;
        const lit = Math.max(0, (near - 0.9) / 0.1);
        return (
          <div
            key={n.name}
            style={{
              position: 'absolute',
              left: p.x - SCI_PILL_W / 2,
              top: p.y - SCI_PILL_H / 2,
              width: SCI_PILL_W,
              height: SCI_PILL_H,
              borderRadius: 20,
              ...tint(n.color, lit > 0.05 ? '33' : '18'),
              display: 'grid',
              placeItems: 'center',
              opacity: on,
              scale: 0.9 + 0.1 * on + 0.03 * lit,
            }}
          >
            <div style={{textAlign: 'center'}}>
              <div
                style={{
                  fontFamily,
                  fontSize: 23,
                  fontWeight: 900,
                  letterSpacing: '0.1em',
                  color: palette.ink,
                }}
              >
                {n.name}
              </div>
              <div style={{fontFamily, fontSize: 19, fontWeight: 700, color: palette.muted, marginTop: 3}}>
                {n.role}
              </div>
            </div>
          </div>
        );
      })}

      <svg
        style={{position: 'absolute', left: 52, top: 60, opacity: ramp(frame, 452, 500)}}
        width={56}
        height={56}
        viewBox="0 0 56 56"
      >
        <path d="M22 8 H34 M24 8 V24 L14 44 A4 4 0 0 0 18 50 H38 A4 4 0 0 0 42 44 L32 24 V8"
          fill="none" stroke={palette.navy} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18.5 34 H37.5 L42 44 A4 4 0 0 1 38 50 H18 A4 4 0 0 1 14 44 Z" fill={palette.navy} opacity={0.28} />
      </svg>

      {SCI_NODES.map((n) =>
        n.agent ? (
          <LlmAgent
            key={`ag${n.name}`}
            color={n.color}
            x={n.agent.cx - 33}
            y={n.agent.cy - 33}
            size={66}
            delay={n.at + 14}
            busy={frame > n.at + 20 && frame < n.at + 90}
          />
        ) : null,
      )}

      {/* ---- the revision log: never a conclusion -------------------- */}
      <div style={{...caps, position: 'absolute', left: 1130, top: 100, opacity: ramp(frame, 520, 566)}}>
        the claim, revised
      </div>

      {REVISIONS.map((r, i) => {
        const on = ramp(frame, r.at, r.at + 40);
        return (
          <div
            key={r.text}
            style={{
              position: 'absolute',
              left: 1130,
              top: 152 + i * 76,
              width: 520,
              height: 62,
              borderRadius: 18,
              ...tint(palette.green, '16'),
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 22,
              boxSizing: 'border-box',
              opacity: on * (i === REVISIONS.length - 1 ? 1 : 0.62),
              translate: `${(1 - on) * 18}px 0px`,
              fontFamily,
              fontSize: 24,
              fontWeight: 800,
              color: palette.ink,
            }}
          >
            {r.text}
          </div>
        );
      })}

      <div
        style={{
          position: 'absolute',
          left: 1130,
          top: 152 + 3 * 76,
          width: 520,
          height: 62,
          borderRadius: 18,
          border: `3px dashed ${palette.muted}8C`,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 22,
          opacity: ramp(frame, 1040, 1084) * (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(frame / 15))),
          fontFamily,
          fontSize: 24,
          fontWeight: 800,
          color: palette.muted,
        }}
      >
        H4 · still open
      </div>

      <div
        style={{
          position: 'absolute',
          left: 1130,
          top: 476,
          width: 390,
          fontFamily,
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1.34,
          color: palette.muted,
          opacity: ramp(frame, 1060, 1110),
        }}
      >
        The loop has no stopping condition. Nothing here is concluded.
      </div>

      {/* ---- the restraint the narration asks for -------------------- */}
      <div
        style={{
          position: 'absolute',
          left: 30,
          top: 556,
          width: 730,
          fontFamily,
          fontSize: 26,
          fontWeight: 700,
          lineHeight: 1.3,
          color: palette.muted,
          opacity: ramp(frame, 640, 700),
        }}
      >
        Not a demonstration. Today&rsquo;s LLM teams have not solved scientific discovery.
      </div>

    </>
  );
};

/* ------------------------------------------------------------------ */
/* 15 · Shared Resources Force Coordination                            */
/* ------------------------------------------------------------------ */

/**
 * Two beats. Everyone reaches for the same thing and the cost is visible —
 * a queue, four idle resources, four frozen progress bars. Then needs are
 * declared, an allocation appears, and the queue drains. No throughput
 * number is claimed anywhere: the cost is shown, not scored.
 */

const RES_X = 1340;
const RES_W = 350;
const RES_H = 84;
const rowY = (i: number) => 70 + i * 120;

const REQUESTERS = [palette.blue, palette.purple, palette.orange, palette.navy, palette.green];
const RESOURCES = [
  {name: 'GPU', color: palette.orange, need: 'needs the GPU'},
  {name: 'TOOL', color: palette.purple, need: 'needs a tool'},
  {name: 'API', color: palette.blue, need: 'needs the API'},
  {name: 'DATABASE', color: palette.navy, need: 'needs the database'},
  {name: 'NETWORK', color: palette.green, need: 'needs bandwidth'},
];

const ResourceGlyph: React.FC<{kind: string; color: string}> = ({kind, color}) => (
  <svg viewBox="0 0 40 40" width={40} height={40}>
    {kind === 'GPU' ? (
      <>
        <rect x={8} y={8} width={24} height={24} rx={5} fill={color} opacity={0.9} />
        <rect x={14} y={14} width={12} height={12} rx={3} fill={palette.white} opacity={0.85} />
        {[12, 20, 28].map((v) => (
          <g key={v}>
            <rect x={v - 1.5} y={2} width={3} height={6} rx={1.5} fill={color} />
            <rect x={v - 1.5} y={32} width={3} height={6} rx={1.5} fill={color} />
          </g>
        ))}
      </>
    ) : null}
    {kind === 'TOOL' ? (
      <>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => (
          <polygon
            key={d}
            points={rot(20, 20, d, [
              [10, -3.6],
              [19, -3.6],
              [19, 3.6],
              [10, 3.6],
            ])}
            fill={color}
          />
        ))}
        <circle cx={20} cy={20} r={12} fill={color} />
        <circle cx={20} cy={20} r={5} fill={palette.white} />
      </>
    ) : null}
    {kind === 'API' ? (
      <>
        <path d="M15 10 L6 20 L15 30" fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M25 10 L34 20 L25 30" fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : null}
    {kind === 'DATABASE' ? (
      <>
        <ellipse cx={20} cy={11} rx={13} ry={5} fill={color} />
        <rect x={7} y={11} width={26} height={18} fill={color} opacity={0.55} />
        <ellipse cx={20} cy={29} rx={13} ry={5} fill={color} />
      </>
    ) : null}
    {kind === 'NETWORK' ? (
      <>
        <line x1={10} y1={12} x2={30} y2={12} stroke={color} strokeWidth={4} />
        <line x1={10} y1={12} x2={20} y2={30} stroke={color} strokeWidth={4} />
        <line x1={30} y1={12} x2={20} y2={30} stroke={color} strokeWidth={4} />
        <circle cx={10} cy={12} r={5} fill={color} />
        <circle cx={30} cy={12} r={5} fill={color} />
        <circle cx={20} cy={30} r={5} fill={color} />
      </>
    ) : null}
  </svg>
);

const SharedResources: React.FC = () => {
  const frame = useCurrentFrame();
  const allocate = ramp(frame, 610, 700);
  const contended = ramp(frame, 400, 452) * (1 - allocate);
  const idle = ramp(frame, 420, 470) * (1 - ramp(frame, 620, 664));

  return (
    <>
      <svg
        style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}}
        viewBox="0 0 1728 690"
      >
        {REQUESTERS.map((c, i) => {
          const on = ramp(frame, 230 + i * 20, 300 + i * 20);
          const y0 = rowY(i);
          const y1 = lerp(rowY(0), rowY(i), allocate);
          const thick = 4 + 5 * contended * (1 - allocate);
          return (
            <path
              key={`req${i}`}
              d={`M 134 ${y0} C 520 ${y0}, 980 ${y1}, ${RES_X - 6} ${y1}`}
              fill="none"
              stroke={allocate > 0.5 ? c : contended > 0.4 ? palette.red : c}
              strokeWidth={thick}
              strokeLinecap="round"
              opacity={on * (0.3 + 0.45 * (1 - contended) + 0.35 * allocate)}
              pathLength={1}
              strokeDasharray={`${on} 1`}
            />
          );
        })}

        {/* the queue that forms in front of the one resource everyone wants */}
        {REQUESTERS.map((c, i) => {
          const born = ramp(frame, 330 + i * 26, 372 + i * 26);
          const gone = ramp(frame, 620 + i * 22, 672 + i * 22);
          const x = lerp(1310 - i * 38, RES_X + 40, gone);
          return (
            <rect
              key={`q${i}`}
              x={x - 15}
              y={rowY(0) - 15}
              width={30}
              height={30}
              rx={8}
              fill={c}
              opacity={born * (1 - gone) * 0.95}
            />
          );
        })}
      </svg>

      {REQUESTERS.map((c, i) => (
        <LlmAgent key={`ag${i}`} color={c} x={51} y={rowY(i) - 39} size={78} delay={10 + i * 14} busy={frame > 680 && frame < 1010} />
      ))}

      {/* what each agent actually gets done: frozen for four of them */}
      {REQUESTERS.map((c, i) => {
        const beat1 = i === 0 ? lin(frame, 360, 600) * 0.3 : lin(frame, 360, 600) * 0.04;
        const beat2 = lin(frame, 680 + i * 10, 1000) * (1 - (i === 0 ? 0.3 : 0.04));
        const v = Math.min(1, beat1 + beat2);
        return (
          <div key={`bar${i}`} style={{position: 'absolute', left: 30, top: rowY(i) + 52, width: 140, height: 9, borderRadius: 5, background: palette.line, opacity: ramp(frame, 340, 384)}}>
            <div style={{width: `${v * 100}%`, height: '100%', borderRadius: 5, background: c}} />
          </div>
        );
      })}

      {/* declared needs, which is what makes an allocation possible */}
      {RESOURCES.map((r, i) => {
        const on = ramp(frame, 520 + i * 12, 570 + i * 12) * (1 - ramp(frame, 720, 764));
        return (
          <div
            key={`need${i}`}
            style={{
              position: 'absolute',
              left: 150,
              top: rowY(i) - 21,
              width: 232,
              height: 42,
              borderRadius: 21,
              ...tint(REQUESTERS[i], '22'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: on,
              scale: 0.88 + 0.12 * on,
              fontFamily,
              fontSize: 21,
              fontWeight: 800,
              color: palette.ink,
            }}
          >
            {r.need}
          </div>
        );
      })}

      {RESOURCES.map((r, i) => {
        const on = ramp(frame, 100 + i * 26, 156 + i * 26);
        const hot = i === 0 ? contended : 0;
        const dimmed = i === 0 ? 0 : idle;
        return (
          <div
            key={r.name}
            style={{
              position: 'absolute',
              left: RES_X,
              top: rowY(i) - RES_H / 2,
              width: RES_W,
              height: RES_H,
              borderRadius: 22,
              ...(hot > 0.05 ? tint(palette.red, '2E') : tint(r.color, '1C')),
              display: 'flex',
              alignItems: 'center',
              opacity: on * (1 - 0.55 * dimmed),
              scale: 0.94 + 0.06 * on + 0.03 * hot,
            }}
          >
            <div style={{marginLeft: 22, display: 'flex', alignItems: 'center'}}>
              <ResourceGlyph kind={r.name} color={hot > 0.05 ? palette.red : r.color} />
            </div>
            <div style={{marginLeft: 22, fontFamily, fontSize: 28, fontWeight: 850, color: palette.ink}}>{r.name}</div>
            {i > 0 ? (
              <div style={{...caps, marginLeft: 'auto', marginRight: 22, fontSize: 18, opacity: dimmed}}>idle</div>
            ) : null}
          </div>
        );
      })}

      <div
        style={{
          ...caps,
          position: 'absolute',
          left: RES_X,
          top: 4,
          fontSize: 19,
          color: contended > 0.5 ? palette.red : palette.green,
          opacity: Math.max(contended, allocate),
        }}
      >
        {allocate > 0.5 ? 'allocated' : 'contention'}
      </div>

      {[
        {at: 300, until: 560, text: 'one resource requested by all · four sit idle · everyone waits', color: palette.red, size: 30},
        {at: 620, until: 800, text: 'needs are declared, then an allocation is agreed', color: palette.muted, size: 30},
        {at: 850, until: 1e6, text: 'Collective intelligence still has collective constraints.', color: palette.ink, size: 34},
      ].map((l) => (
        <div
          key={l.text}
          style={{
            position: 'absolute',
            left: 200,
            top: 600,
            width: 1330,
            textAlign: 'center',
            fontFamily,
            fontSize: l.size,
            fontWeight: l.size > 31 ? 860 : 800,
            letterSpacing: '-0.015em',
            color: l.color,
            opacity: ramp(frame, l.at, l.at + 42) * (1 - ramp(frame, l.until, l.until + 42)),
          }}
        >
          {l.text}
        </div>
      ))}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 16 · When LLM Teams Become Agent Societies — the destination        */
/* ------------------------------------------------------------------ */

/**
 * Sixty seconds, and it has to earn every one of them, so the scene is built
 * as an escalation followed by four behaviours.
 *
 *   0-150      two agents and one relationship
 *   150-320    four
 *   320-520    ten, and the characters give way to nodes
 *   520-1800   one hundred, the number Agentopia simulates
 *
 * Then, in the graph: a convention spreading node by node, a second one
 * spreading elsewhere, ties strengthening and weakening, a newcomer joining
 * an established cluster, and finally the regions those local rules produced.
 *
 * WHAT MAY BE SHOWN. Agentopia (Wang et al., arXiv:2606.07513): 100
 * LLM-powered agents, 10 simulated years, agents pursue goals, form social
 * relationships and accumulate long-term social experience. Nothing else. The
 * layout, the conventions and the newcomer are schematic, not the paper's
 * data, and "agent civilisations" is labelled as the informal phrase the
 * narration says it is.
 */

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const FIELD = {x0: 66, x1: 1236, y0: 86, y1: 556};
const CLUSTERS = [
  {cx: 215, cy: 190, n: 16},
  {cx: 232, cy: 462, n: 15},
  {cx: 566, cy: 312, n: 20},
  {cx: 836, cy: 156, n: 14},
  {cx: 902, cy: 470, n: 18},
  {cx: 1124, cy: 268, n: 17},
];

type SocNode = {x: number; y: number; k: number};

const buildSociety = () => {
  const rnd = mulberry32(20260907);
  const nodes: SocNode[] = [];
  CLUSTERS.forEach((c, k) => {
    for (let i = 0; i < c.n; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 24 + Math.sqrt(rnd()) * 86;
      nodes.push({
        x: Math.min(FIELD.x1, Math.max(FIELD.x0, c.cx + Math.cos(a) * r)),
        y: Math.min(FIELD.y1, Math.max(FIELD.y0, c.cy + Math.sin(a) * r * 0.92)),
        k,
      });
    }
  });

  const seen = new Set<string>();
  const edges: [number, number][] = [];
  const add = (a: number, b: number) => {
    if (a === b) return;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push([a, b]);
  };

  const d2 = (a: number, b: number) =>
    (nodes[a].x - nodes[b].x) ** 2 + (nodes[a].y - nodes[b].y) ** 2;

  for (let i = 0; i < nodes.length; i++) {
    const near = nodes
      .map((_, j) => j)
      .filter((j) => j !== i && nodes[j].k === nodes[i].k)
      .sort((p, q) => d2(i, p) - d2(i, q));
    if (near.length > 0) add(i, near[0]);
    if (near.length > 1) add(i, near[1]);
    if (near.length > 2) add(i, near[2]);
  }

  const pairs: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 2],
    [2, 3],
    [2, 4],
    [3, 5],
    [4, 5],
    [3, 4],
  ];
  pairs.forEach(([ka, kb]) => {
    const cross: {a: number; b: number; d: number}[] = [];
    nodes.forEach((na, a) => {
      if (na.k !== ka) return;
      nodes.forEach((nb, b) => {
        if (nb.k !== kb) return;
        cross.push({a, b, d: d2(a, b)});
      });
    });
    cross.sort((p, q) => p.d - q.d);
    cross.slice(0, 2).forEach((e) => add(e.a, e.b));
  });

  return {nodes, edges};
};

const SOCIETY = buildSociety();

const ADJ: number[][] = SOCIETY.nodes.map(() => []);
SOCIETY.edges.forEach(([a, b]) => {
  ADJ[a].push(b);
  ADJ[b].push(a);
});

/** A convention travels along relationships, so adoption order is a walk. */
const spreadFrom = (seed: number, limit: number, blocked: Set<number>) => {
  const order: number[] = [];
  const visited = new Set<number>(blocked);
  if (visited.has(seed)) return order;
  visited.add(seed);
  const queue: number[] = [seed];
  while (queue.length > 0 && order.length < limit) {
    const v = queue.shift() as number;
    order.push(v);
    ADJ[v].forEach((w) => {
      if (!visited.has(w)) {
        visited.add(w);
        queue.push(w);
      }
    });
  }
  return order;
};

const CONV_A = spreadFrom(40, 44, new Set<number>());
const CONV_B = (() => {
  const inA = new Set(CONV_A);
  let seed = 99;
  for (let i = 99; i >= 83; i--) {
    if (!inA.has(i)) {
      seed = i;
      break;
    }
  }
  return spreadFrom(seed, 34, inA);
})();

type Adoption = {conv: 0 | 1; at: number} | null;
const ADOPTION: Adoption[] = SOCIETY.nodes.map(() => null);
CONV_A.forEach((n, rank) => {
  ADOPTION[n] = {conv: 0, at: 760 + rank * 5};
});
CONV_B.forEach((n, rank) => {
  ADOPTION[n] = {conv: 1, at: 990 + rank * 6};
});

const CONV_COLOR = [palette.purple, palette.orange];

/** The soft regions those purely local rules end up producing. */
const regionOf = (list: number[]) => {
  const xs = list.map((i) => SOCIETY.nodes[i].x);
  const ys = list.map((i) => SOCIETY.nodes[i].y);
  const cx = xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const cy = ys.reduce((a, b) => a + b, 0) / Math.max(1, ys.length);
  const rx = Math.min(560, cx - 30, 1258 - cx, Math.max(...xs.map((x) => Math.abs(x - cx))) + 74);
  const ry = Math.min(300, cy - 34, 584 - cy, Math.max(...ys.map((y) => Math.abs(y - cy))) + 62);
  return {cx, cy, rx, ry};
};
const REGION_A = regionOf(CONV_A);
const REGION_B = regionOf(CONV_B);

/** The newcomer, and the established cluster it has to fit into. */
const NEW_POS = {x: 1264, y: 498};
const NEW_LINKS = SOCIETY.nodes
  .map((n, i) => ({i, d: (n.x - NEW_POS.x) ** 2 + (n.y - NEW_POS.y) ** 2}))
  .sort((a, b) => a.d - b.d)
  .slice(0, 4)
  .map((e) => e.i);
const NEW_CONV: 0 | 1 = (() => {
  let a = 0;
  let b = 0;
  NEW_LINKS.forEach((i) => {
    const ad = ADOPTION[i];
    if (ad && ad.conv === 0) a += 1;
    if (ad && ad.conv === 1) b += 1;
  });
  return b > a ? 1 : 0;
})();

/** Two agents, then four: the same two stay where they were. */
const SEED_AGENTS = [
  {x: 694, y: 300, color: palette.blue, delay: 8},
  {x: 1034, y: 300, color: palette.purple, delay: 26},
  {x: 864, y: 140, color: palette.orange, delay: 152},
  {x: 864, y: 460, color: palette.green, delay: 174},
];
const SEED_EDGES: {a: number; b: number; at: number}[] = [
  {a: 0, b: 1, at: 46},
  {a: 0, b: 2, at: 186},
  {a: 1, b: 2, at: 200},
  {a: 0, b: 3, at: 214},
  {a: 1, b: 3, at: 228},
  {a: 2, b: 3, at: 242},
];

/** Ten. Four of them inherit the positions the characters were standing in. */
const PHASE_C = [
  {x: 694, y: 300},
  {x: 1034, y: 300},
  {x: 864, y: 140},
  {x: 864, y: 460},
  {x: 546, y: 178},
  {x: 546, y: 432},
  {x: 1182, y: 172},
  {x: 1190, y: 438},
  {x: 924, y: 212},
  {x: 796, y: 396},
];
const PHASE_C_TARGET = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
const MORPH: number[] = SOCIETY.nodes.map(() => -1);
PHASE_C_TARGET.forEach((n, k) => {
  MORPH[n] = k;
});
const PHASE_C_EDGES: [number, number][] = [
  [0, 2],
  [2, 1],
  [1, 3],
  [3, 0],
  [0, 4],
  [4, 2],
  [2, 8],
  [8, 1],
  [1, 6],
  [6, 2],
  [0, 5],
  [5, 3],
  [3, 9],
  [9, 0],
  [1, 7],
  [7, 3],
  [8, 6],
  [9, 5],
];

const SCALE_NOTES = [
  {at: 40, until: 158, text: 'two agents'},
  {at: 168, until: 328, text: 'four agents'},
  {at: 386, until: 520, text: 'ten agents'},
];

const SOCIETY_NOTES = [
  {at: 640, until: 800, text: 'agents pursue goals, form social relationships, and accumulate long-term social experience'},
  {at: 812, until: 962, text: 'a convention spreads from neighbour to neighbour'},
  {at: 972, until: 1082, text: 'ties strengthen, weaken, and some disappear'},
  {at: 1092, until: 1292, text: 'a newcomer arrives at a cluster that already has its own habits'},
  {at: 1302, until: 1560, text: 'can local interactions produce a pattern no single agent chose?'},
];

const AgentSocieties: React.FC = () => {
  const frame = useCurrentFrame();

  const seedFade = 1 - ramp(frame, 320, 374);
  const morphT = ramp(frame, 510, 584);
  const churn = ramp(frame, 840, 960);
  const regions = ramp(frame, 1320, 1470);

  // where every one of the hundred is right now, and how big
  const pos = SOCIETY.nodes.map((n, i) => {
    const m = MORPH[i];
    if (m >= 0) {
      const born = ramp(frame, 314 + m * 9, 366 + m * 9);
      return {
        x: lerp(PHASE_C[m].x, n.x, morphT),
        y: lerp(PHASE_C[m].y, n.y, morphT),
        r: lerp(26, 15, morphT),
        o: born,
      };
    }
    return {x: n.x, y: n.y, r: 15, o: ramp(frame, 516 + i * 0.9, 560 + i * 0.9)};
  });

  const newcomerIn = ramp(frame, 1168, 1216);

  return (
    <>
      <svg
        style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}}
        viewBox="0 0 1728 690"
      >
        {/* the global pattern the local rules ended up making */}
        <ellipse cx={REGION_A.cx} cy={REGION_A.cy} rx={REGION_A.rx} ry={REGION_A.ry} fill={CONV_COLOR[0]} opacity={0.07 * regions} />
        <ellipse cx={REGION_B.cx} cy={REGION_B.cy} rx={REGION_B.rx} ry={REGION_B.ry} fill={CONV_COLOR[1]} opacity={0.07 * regions} />

        {/* two, then four */}
        {SEED_EDGES.map((e) => {
          const on = ramp(frame, e.at, e.at + 40) * seedFade;
          if (on <= 0.01) return null;
          const a = SEED_AGENTS[e.a];
          const b = SEED_AGENTS[e.b];
          return (
            <line
              key={`se${e.a}${e.b}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={palette.navy}
              strokeWidth={5}
              strokeLinecap="round"
              opacity={on * 0.4}
            />
          );
        })}
        {frame > 80 && frame < 300 ? (
          <circle
            cx={lerp(694, 1034, 0.5 + 0.5 * Math.sin((frame - 80) / 26))}
            cy={300}
            r={12}
            fill={palette.green}
            opacity={seedFade * 0.9}
          />
        ) : null}

        {/* ten */}
        {PHASE_C_EDGES.map(([a, b], i) => {
          const on = ramp(frame, 348 + i * 4, 404 + i * 4) * (1 - ramp(frame, 506, 556));
          if (on <= 0.01) return null;
          const pa = pos[PHASE_C_TARGET[a]];
          const pb = pos[PHASE_C_TARGET[b]];
          return (
            <line
              key={`ce${i}`}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke={palette.navy}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={on * 0.32}
            />
          );
        })}

        {/* a hundred: relationships that strengthen, weaken, form and end */}
        {SOCIETY.edges.map(([a, b], i) => {
          const born = i % 13 === 0 ? 900 + (i % 7) * 70 : 534 + (i % 40) * 2.5;
          const dies = i % 17 === 5 ? 1010 + (i % 5) * 90 : 1e9;
          const life = ramp(frame, born, born + 46) * (1 - ramp(frame, dies, dies + 70));
          if (life <= 0.01) return null;
          const wave = 0.5 + 0.5 * Math.sin(frame / (64 + (i % 9) * 13) + i);
          const tie = 0.5 + churn * (wave - 0.5) * 2;
          return (
            <line
              key={`e${i}`}
              x1={pos[a].x}
              y1={pos[a].y}
              x2={pos[b].x}
              y2={pos[b].y}
              stroke={palette.navy}
              strokeWidth={1.1 + 3.4 * tie}
              strokeLinecap="round"
              opacity={life * (0.09 + 0.4 * tie) * Math.min(pos[a].o, pos[b].o)}
            />
          );
        })}

        {/* the newcomer's first relationships */}
        {NEW_LINKS.map((n, i) => {
          const on = ramp(frame, 1232 + i * 34, 1282 + i * 34);
          if (on <= 0.01) return null;
          return (
            <line
              key={`nl${n}`}
              x1={NEW_POS.x}
              y1={NEW_POS.y}
              x2={pos[n].x}
              y2={pos[n].y}
              stroke={palette.green}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={on * 0.7}
              pathLength={1}
              strokeDasharray={`${on} 1`}
            />
          );
        })}

        {SOCIETY.nodes.map((_, i) => {
          const p = pos[i];
          if (p.o <= 0.01) return null;
          const ad = ADOPTION[i];
          const adopted = ad ? ramp(frame, ad.at, ad.at + 26) : 0;
          const conv = ad ? ad.conv : 0;
          const arrive = ad ? pulse(frame, ad.at, 40) : 0;
          const r = p.r + 4 * arrive;
          const fill = adopted > 0.02 ? `${CONV_COLOR[conv]}30` : palette.paleBlue;
          return (
            <g key={`n${i}`} opacity={p.o}>
              <circle cx={p.x} cy={p.y} r={r} fill={fill} stroke={adopted > 0.02 ? CONV_COLOR[conv] : palette.blue} strokeWidth={2.4} opacity={0.92} />
              {adopted > 0.02 ? (
                conv === 0 ? (
                  <polygon points={tri(p.x, p.y, -90, 8 * adopted)} fill={CONV_COLOR[0]} />
                ) : (
                  <rect x={p.x - 5.5 * adopted} y={p.y - 5.5 * adopted} width={11 * adopted} height={11 * adopted} rx={2} fill={CONV_COLOR[1]} />
                )
              ) : null}
            </g>
          );
        })}

        {/* the newcomer, once it stops being a stranger */}
        {newcomerIn > 0.01 ? (
          <g opacity={newcomerIn}>
            <circle cx={NEW_POS.x} cy={NEW_POS.y} r={15 + 12 * (0.5 + 0.5 * Math.sin(frame / 12)) * (1 - ramp(frame, 1430, 1500))} fill={`${palette.green}22`} />
            <circle
              cx={NEW_POS.x}
              cy={NEW_POS.y}
              r={16}
              fill={ramp(frame, 1330, 1360) > 0.02 ? `${CONV_COLOR[NEW_CONV]}30` : palette.paleGreen}
              stroke={ramp(frame, 1330, 1360) > 0.02 ? CONV_COLOR[NEW_CONV] : palette.green}
              strokeWidth={3}
            />
            {ramp(frame, 1330, 1360) > 0.02 ? (
              NEW_CONV === 0 ? (
                <polygon points={tri(NEW_POS.x, NEW_POS.y, -90, 8 * ramp(frame, 1330, 1360))} fill={CONV_COLOR[0]} />
              ) : (
                <rect
                  x={NEW_POS.x - 5.5 * ramp(frame, 1330, 1360)}
                  y={NEW_POS.y - 5.5 * ramp(frame, 1330, 1360)}
                  width={11 * ramp(frame, 1330, 1360)}
                  height={11 * ramp(frame, 1330, 1360)}
                  rx={2}
                  fill={CONV_COLOR[1]}
                />
              )
            ) : null}
          </g>
        ) : null}

        {/* ten simulated years, running underneath all of it */}
        <g opacity={ramp(frame, 596, 646)}>
          <line x1={320} y1={620} x2={1240} y2={620} stroke={palette.line} strokeWidth={4} strokeLinecap="round" />
          {Array.from({length: 10}).map((_, i) => (
            <line
              key={`tick${i}`}
              x1={320 + (i * (1240 - 320)) / 9}
              y1={613}
              x2={320 + (i * (1240 - 320)) / 9}
              y2={627}
              stroke={palette.line}
              strokeWidth={4}
              strokeLinecap="round"
            />
          ))}
          <circle cx={lerp(320, 1240, lin(frame, 604, 1748))} cy={620} r={9} fill={palette.green} />
        </g>
      </svg>

      {/* the characters, while there are still few enough to be characters */}
      <div style={{position: 'absolute', inset: 0, opacity: seedFade}}>
        {SEED_AGENTS.map((a) => (
          <LlmAgent
            key={a.delay}
            color={a.color}
            x={a.x - 59}
            y={a.y - 59}
            size={118}
            delay={a.delay}
            busy={frame > a.delay + 30 && frame < a.delay + 120}
          />
        ))}
      </div>

      {/* the newcomer walks in before it is just another node */}
      {frame > 1050 && frame < 1230 ? (
        <div style={{position: 'absolute', inset: 0, opacity: 1 - ramp(frame, 1168, 1214)}}>
          <LlmAgent
            color={palette.green}
            x={lerp(1880, NEW_POS.x - 44, ramp(frame, 1060, 1176))}
            y={NEW_POS.y - 44}
            size={88}
            delay={1052}
            busy
          />
        </div>
      ) : null}

      {SCALE_NOTES.map((n) => (
        <div
          key={n.text}
          style={{
            ...caps,
            position: 'absolute',
            left: 0,
            top: 556,
            width: 1728,
            textAlign: 'center',
            fontSize: 26,
            color: palette.ink,
            opacity: ramp(frame, n.at, n.at + 34) * (1 - ramp(frame, n.until, n.until + 34)),
          }}
        >
          {n.text}
        </div>
      ))}

      <div style={{...caps, position: 'absolute', left: 60, top: 604, fontSize: 18, opacity: ramp(frame, 610, 660)}}>
        ten simulated years
      </div>

      <div
        style={{
          ...caps,
          position: 'absolute',
          left: 1330,
          top: 92,
          fontSize: 24,
          color: palette.ink,
          opacity: ramp(frame, 620, 672),
        }}
      >
        one hundred agents
      </div>

      {SOCIETY_NOTES.map((n) => (
        <div
          key={n.text}
          style={{
            position: 'absolute',
            left: 1330,
            top: 164,
            width: 370,
            fontFamily,
            fontSize: 25,
            fontWeight: 750,
            lineHeight: 1.34,
            color: palette.muted,
            opacity: ramp(frame, n.at, n.at + 36) * (1 - ramp(frame, n.until, n.until + 36)),
          }}
        >
          {n.text}
        </div>
      ))}

      {/* the phrase the narration is careful about, kept careful here */}
      <div style={{position: 'absolute', left: 1330, top: 372, width: 370, opacity: ramp(frame, 1580, 1642)}}>
        <div
          style={{
            display: 'inline-block',
            fontFamily,
            fontSize: 30,
            fontWeight: 860,
            letterSpacing: '-0.02em',
            color: palette.ink,
            borderBottom: `3px dashed ${palette.muted}77`,
            paddingBottom: 10,
          }}
        >
          &ldquo;agent civilisations&rdquo;
        </div>
        <div style={{fontFamily, fontSize: 22, fontWeight: 700, lineHeight: 1.34, color: palette.muted, marginTop: 16}}>
          an informal way to describe the scale of the question, not a settled technical category
        </div>
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */

export const ApplicationVisuals: React.FC<{sceneIndex: number}> = ({sceneIndex}) => {
  switch (sceneIndex) {
    case 12:
      return <WhereItMatters />;
    case 13:
      return <SoftwareTeam />;
    case 14:
      return <ScientificTeam />;
    case 15:
      return <SharedResources />;
    case 16:
      return <AgentSocieties />;
    default:
      return null;
  }
};
