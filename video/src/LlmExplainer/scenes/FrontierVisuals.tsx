import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {fontFamily, palette, sectionColors} from '../constants';
import {LlmAgent} from '../components/LlmAgent';

/**
 * FRONTIER — scenes 17 to 20, the ending.
 *
 * This is the calmest stretch of the video and the register is deliberate:
 * nothing is boxed anywhere in this file, one idea is on screen at a time, and
 * the last two scenes are mostly white.
 *
 * CONTINUITY. The shell no longer fades between scenes, so every boundary here
 * is a handshake:
 *
 *   16 -> 17  the hundred-agent society is already on screen at frame 0 and
 *             contracts into the team and the ring the questions are asked of
 *   17 -> 18  that same network reorganises into the progression rail
 *   18 -> 19  the rail converges to a point and the questions take its place
 *   19 -> 20  the rule under the final question becomes the first LLM
 *
 * Nothing in this file is rebuilt from an empty canvas.
 */

const ease = Easing.bezier(0.16, 1, 0.3, 1);

/** Progress through a window, eased and clamped. */
const seg = (frame: number, a: number, b: number) =>
  interpolate(frame, [a, b], [0, 1], {
    easing: ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** Linear progress through a window, for anything that travels. */
const lin = (frame: number, a: number, b: number) =>
  interpolate(frame, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/* ================================================================== */
/* The hundred-agent society, carried in from scene 16                 */
/* ================================================================== */

/**
 * Scene 16 ends on a hundred-node society graph and scene 17 opens on it, so
 * this file has to be able to draw exactly the same graph. The generator is
 * deterministic — one seed, no randomness at render time — so it is
 * reproduced here rather than approximated. If ApplicationVisuals changes its
 * seed or its clusters, this must change with it or the boundary breaks.
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

const buildSociety = () => {
  const rnd = mulberry32(20260907);
  const nodes: {x: number; y: number; k: number}[] = [];
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

const CONV_COLOR = [palette.purple, palette.orange];
const CONV: (0 | 1 | -1)[] = SOCIETY.nodes.map(() => -1);
CONV_A.forEach((n) => {
  CONV[n] = 0;
});
CONV_B.forEach((n) => {
  CONV[n] = 1;
});

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

/** Scene 16's local frame at the cut, so the graph keeps breathing rather than restarting. */
const HANDOVER_FRAME = 1799;

/* ================================================================== */
/* 17 — What Still Has to Be Solved?                                   */
/* ================================================================== */

/**
 * The society contracts into a team inside a ring, and six questions attach to
 * it one at a time. Each one gets an answer in motion: work is split and two
 * sensible actions collide; messages multiply until the edges are the problem;
 * one outcome fans back to every policy; a member of the wider society joins
 * on dashed edges; the team shrinks and the population takes over; then
 * everything gets busier while the outcome at the centre stays exactly as grey
 * as it was.
 */

const CX = 864;
const CY = 250;
const AGENT = 92;
const CORE = [
  {x: 700, y: 152, color: palette.blue},
  {x: 1028, y: 152, color: palette.purple},
  {x: 1028, y: 348, color: palette.green},
  {x: 700, y: 348, color: palette.orange},
] as const;
const CORE_EDGES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [0, 2],
  [1, 3],
] as const;

/**
 * The ring the team sits inside. Four angles are left empty on purpose: the
 * poles, where two leader lines come in, and the upper corners, where the
 * other two do. Leaders enter through gaps rather than across nodes.
 */
const POP_ANGLES = [20, 40, 60, 80, 100, 120, 140, 160, 200, 240, 260, 280, 300, 340];
const POP_RX = 400;
const POP_RY = 200;
const POPULATION = POP_ANGLES.map((deg) => {
  const r = (deg * Math.PI) / 180;
  return {deg, x: CX + POP_RX * Math.cos(r), y: CY + POP_RY * Math.sin(r)};
});
/** The ring member that leaves the ring to join the team. */
const JOINER = POP_ANGLES.indexOf(340);
const NEWCOMER = {x: 1176, y: 250};

/** A tiny, permanent wobble, so a society is never a frozen picture. */
const popDrift = (frame: number, i: number) => ({
  dx: 3.4 * Math.sin(frame / (52 + i * 7) + i),
  dy: 3.0 * Math.cos(frame / (61 + i * 5) + i * 1.7),
});

type Beat = {
  tag: string;
  question: string;
  color: string;
  at: number;
  end: number;
  side: 'left' | 'right';
  ty: number;
  anchor: {x: number; y: number};
  /** Ring-relative anchors follow the population, not the shrinking team. */
  ring?: boolean;
};

const BEATS: Beat[] = [
  {
    tag: 'Coordination',
    question:
      'How should agents divide the work, and how do we prevent individually sensible actions from combining badly?',
    color: palette.orange,
    at: 158,
    end: 360,
    side: 'left',
    ty: 56,
    anchor: {x: 640, y: 112},
  },
  {
    tag: 'Communication',
    question: 'What should agents tell one another, and when does context become expensive noise?',
    color: palette.purple,
    at: 364,
    end: 578,
    side: 'right',
    ty: 56,
    anchor: {x: 1088, y: 112},
  },
  {
    tag: 'Credit assignment',
    question: 'How should one shared outcome update many policies, across many turns?',
    color: palette.green,
    at: 586,
    end: 734,
    side: 'left',
    ty: 246,
    anchor: {x: 832, y: 251},
  },
  {
    tag: 'Adaptation',
    question: 'Can an agent cooperate with models or conventions it never met in training?',
    color: palette.red,
    at: 742,
    end: 906,
    side: 'right',
    ty: 246,
    anchor: {x: 1236, y: 250},
  },
  {
    tag: 'Scalability',
    question: 'What changes when a small team becomes a large population?',
    color: palette.navy,
    at: 912,
    end: 1030,
    side: 'left',
    ty: 436,
    anchor: {x: 558, y: 379},
    ring: true,
  },
  {
    tag: 'Evaluation',
    question:
      'How do we distinguish genuine collaboration from simply making more model calls and spending more compute?',
    color: palette.blue,
    at: 1036,
    end: 1310,
    side: 'right',
    ty: 436,
    anchor: {x: 1166, y: 442},
    ring: true,
  },
];

/* Which society node becomes which part of the new arrangement. Greedy and
   deterministic: the nearest unclaimed node wins. */
const CLAIMED = new Set<number>();
const nearestNode = (tx: number, ty: number) => {
  let best = -1;
  let bestD = Infinity;
  SOCIETY.nodes.forEach((n, i) => {
    if (CLAIMED.has(i)) return;
    const d = (n.x - tx) ** 2 + (n.y - ty) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  CLAIMED.add(best);
  return best;
};
const CORE_FROM = CORE.map((c) => nearestNode(c.x, c.y));
const POP_FROM = POPULATION.map((p) => nearestNode(p.x, p.y));
const CARRIED = new Set<number>([...CORE_FROM, ...POP_FROM]);

/** Team scale, ring scale and where the ring sits, at any frame of scene 17. */
const teamK = (frame: number) => 1 - 0.4 * seg(frame, 914, 984) + 0.1 * seg(frame, 1450, 1649);
const ringK = (frame: number) => 1 - 0.06 * seg(frame, 1450, 1649);
const popBright = (frame: number) => 0.26 + 0.48 * seg(frame, 918, 1004);

/** Resting positions at the very end of scene 17, which scene 18 has to match. */
const END_K = teamK(1649);
const END_RING = ringK(1649);

const WhatRemains = () => {
  const frame = useCurrentFrame();
  const sf = HANDOVER_FRAME + frame;

  const k = teamK(frame);
  const rk = ringK(frame);
  const scaled = (p: {x: number; y: number}) => ({x: CX + (p.x - CX) * k, y: CY + (p.y - CY) * k});
  const ringed = (p: {x: number; y: number}) => ({x: CX + (p.x - CX) * rk, y: CY + (p.y - CY) * rk});

  /* --- the society contracting into the arrangement ------------------- */
  const arrive = seg(frame, 26, 140);
  const strangersOut = 1 - seg(frame, 14, 96);
  const socEdges = 1 - seg(frame, 6, 70);
  const regionsOut = 1 - seg(frame, 0, 40);
  const yearsOut = 1 - seg(frame, 0, 34);
  const handover = seg(frame, 116, 156);
  const coreEdgesIn = seg(frame, 130, 178);

  const popPos = POPULATION.map((p, i) => {
    const from = SOCIETY.nodes[POP_FROM[i]];
    const target = ringed(p);
    const d = popDrift(frame, i);
    return {
      x: mix(from.x, target.x + d.dx, arrive),
      y: mix(from.y, target.y + d.dy, arrive),
    };
  });
  const popAlpha = popBright(frame);

  /* --- coordination: work divides, two sensible actions collide ------- */
  const token = seg(frame, 168, 192) * (1 - seg(frame, 196, 214));
  const splitOut = lin(frame, 196, 250);
  const splitAlive = seg(frame, 190, 204) * (1 - seg(frame, 252, 272));
  const clashRun = lin(frame, 258, 292);
  const clashAlive = seg(frame, 252, 264) * (1 - seg(frame, 292, 300));
  const burst = seg(frame, 290, 344);
  const clashX = seg(frame, 290, 312) * (1 - seg(frame, 344, 386));
  const clashHeat = seg(frame, 288, 302) * (1 - seg(frame, 360, 412));
  const recoil = Math.sin(seg(frame, 292, 352) * Math.PI) * 19;
  const fallOff = lin(frame, 312, 366);

  /* --- communication: traffic grows until the edges are the problem --- */
  const lanes = interpolate(frame, [372, 520], [0.6, 5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const commAlive = seg(frame, 366, 406) * (1 - seg(frame, 536, 582));
  const congestion = seg(frame, 432, 536) * (1 - seg(frame, 552, 594));

  /* --- credit: one outcome, many policies, twice ---------------------- */
  const outcomeIn = seg(frame, 590, 618);
  const pulses = [626, 682];

  /* --- adaptation: a member of the society joins the team ------------- */
  const joinIn = seg(frame, 748, 806);
  const dashIn = seg(frame, 800, 850);
  const strangerTalk = lin(frame, 850, 900);
  const strangerAlive = seg(frame, 844, 856) * (1 - seg(frame, 896, 906));

  /* --- scalability / evaluation --------------------------------------- */
  const chords = seg(frame, 984, 1044);
  const busy = seg(frame, 1046, 1140) * (1 - seg(frame, 1226, 1306));
  const gauge = seg(frame, 1076, 1140) * (1 - seg(frame, 1398, 1470));

  const closing = seg(frame, 1476, 1520);

  /* the joiner leaves the ring and becomes an agent */
  const joinFrom = popPos[JOINER];
  const newcomerPos = {x: mix(joinFrom.x, NEWCOMER.x, joinIn), y: mix(joinFrom.y, NEWCOMER.y, joinIn)};
  const newcomerScaled = {x: mix(joinFrom.x, scaled(NEWCOMER).x, joinIn), y: mix(joinFrom.y, scaled(NEWCOMER).y, joinIn)};

  const anchorOf = (b: Beat) => (b.ring ? ringed(b.anchor) : scaled(b.anchor));

  return (
    <>
      {/* ---------- the society we cut in on ---------------------------- */}
      {strangersOut > 0.002 || socEdges > 0.002 || regionsOut > 0.002 ? (
        <svg width={1728} height={690} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          <ellipse cx={REGION_A.cx} cy={REGION_A.cy} rx={REGION_A.rx} ry={REGION_A.ry} fill={CONV_COLOR[0]} opacity={0.07 * regionsOut} />
          <ellipse cx={REGION_B.cx} cy={REGION_B.cy} rx={REGION_B.rx} ry={REGION_B.ry} fill={CONV_COLOR[1]} opacity={0.07 * regionsOut} />

          {SOCIETY.edges.map(([a, b], i) => {
            const born = i % 13 === 0 ? 900 + (i % 7) * 70 : 534 + (i % 40) * 2.5;
            const dies = i % 17 === 5 ? 1010 + (i % 5) * 90 : 1e9;
            const life = seg(sf, born, born + 46) * (1 - seg(sf, dies, dies + 70));
            if (life <= 0.01 || socEdges <= 0.002) return null;
            const tie = 0.5 + 0.5 * Math.sin(sf / (64 + (i % 9) * 13) + i);
            const pa = nodeNow(a, arrive, popPos, k, 1 - strangersOut);
            const pb = nodeNow(b, arrive, popPos, k, 1 - strangersOut);
            return (
              <line
                key={`se${i}`}
                x1={pa.x}
                y1={pa.y}
                x2={pb.x}
                y2={pb.y}
                stroke={palette.navy}
                strokeWidth={1.1 + 3.4 * tie}
                strokeLinecap="round"
                opacity={life * (0.09 + 0.4 * tie) * socEdges}
              />
            );
          })}

          {SOCIETY.nodes.map((n, i) => {
            if (CARRIED.has(i)) return null;
            if (strangersOut <= 0.002) return null;
            const pull = 1 - strangersOut;
            const c = CONV[i];
            return (
              <circle
                key={`sn${i}`}
                cx={mix(n.x, CX, pull * 0.16)}
                cy={mix(n.y, CY, pull * 0.16)}
                r={15}
                fill={c >= 0 ? `${CONV_COLOR[c]}30` : palette.paleBlue}
                stroke={c >= 0 ? CONV_COLOR[c] : palette.blue}
                strokeWidth={2.4}
                opacity={0.92 * strangersOut}
              />
            );
          })}

          {/* ten simulated years, handed over and put away */}
          {yearsOut > 0.004 ? (
            <g opacity={yearsOut}>
              <line x1={320} y1={620} x2={1240} y2={620} stroke={palette.line} strokeWidth={4} strokeLinecap="round" />
              {Array.from({length: 10}).map((_, i) => (
                <line
                  key={`tk${i}`}
                  x1={320 + (i * 920) / 9}
                  y1={613}
                  x2={320 + (i * 920) / 9}
                  y2={627}
                  stroke={palette.line}
                  strokeWidth={4}
                  strokeLinecap="round"
                />
              ))}
              <circle cx={1240} cy={620} r={9} fill={palette.green} />
            </g>
          ) : null}
        </svg>
      ) : null}

      {/* ---------- the ring, and everything that is not the team ------- */}
      <svg width={1728} height={690} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {POPULATION.map((_, i) => {
          const p = popPos[i];
          const q = popPos[(i + 1) % POPULATION.length];
          const on = seg(frame, 988 + i * 3, 1022 + i * 3) * chords;
          if (on <= 0.01) return null;
          const t = ((frame - 1050) / 46 + i * 0.17) % 1;
          return (
            <g key={`chord-${i}`}>
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={palette.navy} strokeWidth={1.4} opacity={on * 0.22} />
              {t > 0 && t < 1 ? (
                <circle cx={mix(p.x, q.x, t)} cy={mix(p.y, q.y, t)} r={3.4} fill={palette.blue} opacity={busy * on * 0.85} />
              ) : null}
            </g>
          );
        })}

        {POPULATION.map((_, i) => {
          const p = popPos[i];
          const gone = i === JOINER ? joinIn : 0;
          if (gone > 0.98) return null;
          const beatPulse = busy * (0.5 + 0.5 * Math.sin((frame - i * 9) / 5));
          const c = CONV[POP_FROM[i]];
          return (
            <g key={`pop-${i}`} opacity={1 - gone}>
              <circle
                cx={p.x}
                cy={p.y}
                r={mix(15, 8 + beatPulse * 2.6, arrive)}
                fill={arrive > 0.98 ? palette.navy : c >= 0 ? `${CONV_COLOR[c]}30` : palette.paleBlue}
                stroke={arrive > 0.98 ? 'none' : c >= 0 ? CONV_COLOR[c] : palette.blue}
                strokeWidth={2.4 * (1 - arrive)}
                opacity={mix(0.92, popAlpha + busy * 0.22, arrive)}
              />
            </g>
          );
        })}

        {/* the boundary we can draw around the system, which is not the
            same as knowing whether it collaborated */}
        <ellipse
          cx={CX}
          cy={CY}
          rx={470 * rk}
          ry={250 * rk}
          fill="none"
          stroke={palette.muted}
          strokeWidth={2}
          strokeDasharray="9 12"
          opacity={gauge * 0.5}
        />
      </svg>

      {/* ---------- the team, which shrinks into the population --------- */}
      <div style={{position: 'absolute', inset: 0, transformOrigin: `${CX}px ${CY}px`, scale: k}}>
        <svg width={1728} height={690} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          {CORE_EDGES.map(([a, b], e) => {
            const heat = e === 0 ? clashHeat : 0;
            return (
              <line
                key={`edge-${a}${b}`}
                x1={CORE[a].x}
                y1={CORE[a].y}
                x2={CORE[b].x}
                y2={CORE[b].y}
                stroke={heat > 0.02 ? palette.orange : palette.line}
                strokeWidth={2.6 + congestion * 3.4 + heat * 5}
                opacity={coreEdgesIn * (0.85 + congestion * 0.15)}
                strokeLinecap="round"
              />
            );
          })}

          {/* one task, divided */}
          <rect x={CX - 15} y={CY - 15} width={30} height={30} rx={9} fill={palette.orange} opacity={token} />
          {CORE.map((a, i) => (
            <circle
              key={`split-${i}`}
              cx={mix(CX, a.x, splitOut)}
              cy={mix(CY, a.y, splitOut)}
              r={9}
              fill={palette.orange}
              opacity={splitAlive * 0.9}
            />
          ))}

          {/* two sensible actions, arriving at the same place */}
          {[0, 1].map((i) => (
            <circle
              key={`clash-${i}`}
              cx={mix(CORE[i].x, CX, clashRun)}
              cy={mix(CORE[i].y, 152, clashRun)}
              r={11}
              fill={palette.orange}
              opacity={clashAlive}
            />
          ))}
          <circle
            cx={CX}
            cy={152}
            r={14 + burst * 62}
            fill="none"
            stroke={palette.orange}
            strokeWidth={5}
            opacity={(1 - burst) * clashHeat * 0.9}
          />
          <g opacity={clashX} strokeLinecap="round">
            <line x1={CX - 26} y1={126} x2={CX + 26} y2={178} stroke={palette.red} strokeWidth={9} />
            <line x1={CX + 26} y1={126} x2={CX - 26} y2={178} stroke={palette.red} strokeWidth={9} />
          </g>
          {/* what the two actions produced, dropping away */}
          {[-40, 40].map((dx) => (
            <circle
              key={`drop${dx}`}
              cx={CX + dx * (0.4 + fallOff)}
              cy={152 + fallOff * 120}
              r={9}
              fill={palette.orange}
              opacity={clashX * (1 - fallOff) * 0.8}
            />
          ))}

          {/* traffic on every edge, until the edges are the problem */}
          {CORE_EDGES.map(([a, b], e) =>
            [0, 1, 2, 3, 4].map((j) => {
              if (j > lanes) return null;
              const t = ((((frame - 370) / 44 + j * 0.21 + e * 0.13) % 1) + 1) % 1;
              const u = e % 2 === 0 ? t : 1 - t;
              return (
                <circle
                  key={`msg-${e}-${j}`}
                  cx={mix(CORE[a].x, CORE[b].x, u)}
                  cy={mix(CORE[a].y, CORE[b].y, u)}
                  r={4.6}
                  fill={palette.purple}
                  opacity={commAlive * (0.85 - congestion * 0.35)}
                />
              );
            }),
          )}

          {/* one shared outcome, updating many policies, more than once */}
          <circle
            cx={CX}
            cy={CY}
            r={15}
            fill={outcomeIn > 0 ? palette.green : palette.line}
            opacity={outcomeIn * (1 - seg(frame, 730, 790) * 0.55)}
          />
          {pulses.map((p0) =>
            CORE.map((a, i) => {
              const t = lin(frame, p0, p0 + 40);
              const alive = seg(frame, p0 - 6, p0 + 4) * (1 - seg(frame, p0 + 40, p0 + 52));
              return (
                <circle
                  key={`credit-${p0}-${i}`}
                  cx={mix(CX, a.x, t)}
                  cy={mix(CY, a.y, t)}
                  r={7}
                  fill={palette.green}
                  opacity={alive * 0.95}
                />
              );
            }),
          )}
        </svg>

        {CORE.map((a, i) => {
          const dx = i === 0 ? -recoil : i === 1 ? recoil : 0;
          return (
            <LlmAgent
              key={`agent-${i}`}
              color={a.color}
              size={AGENT}
              x={a.x - AGENT / 2 + dx}
              y={a.y - AGENT / 2}
              delay={120 + i * 6}
              busy={commAlive > 0.4 || busy > 0.4}
            />
          );
        })}
      </div>

      {/* the joiner travels in ring space, so it is not scaled twice */}
      <svg width={1728} height={690} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {joinIn > 0.02
          ? [1, 2].map((i) => {
              const c = scaled(CORE[i]);
              return (
                <line
                  key={`dash-${i}`}
                  x1={c.x}
                  y1={c.y}
                  x2={newcomerScaled.x}
                  y2={newcomerScaled.y}
                  stroke={palette.red}
                  strokeWidth={2.4}
                  strokeDasharray="8 10"
                  opacity={dashIn * 0.62}
                />
              );
            })
          : null}
        {strangerAlive > 0.02
          ? [1, 2].map((i) => {
              const c = scaled(CORE[i]);
              const t = i === 1 ? strangerTalk : 1 - strangerTalk;
              return (
                <circle
                  key={`sm-${i}`}
                  cx={mix(c.x, newcomerScaled.x, t)}
                  cy={mix(c.y, newcomerScaled.y, t)}
                  r={5}
                  fill={palette.red}
                  opacity={strangerAlive * 0.85}
                />
              );
            })
          : null}
      </svg>
      {joinIn > 0.02 ? (
        <div style={{opacity: joinIn}}>
          <LlmAgent
            color={palette.red}
            size={AGENT * k}
            x={newcomerScaled.x - (AGENT * k) / 2}
            y={newcomerScaled.y - (AGENT * k) / 2}
            delay={746}
          />
        </div>
      ) : null}

      {/* ---------- the questions, attached one at a time --------------- */}
      <svg width={1728} height={690} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {BEATS.map((b, bi) => {
          const live = seg(frame, b.at, b.at + 26);
          if (live <= 0.001) return null;
          const sweepAt = 1310 + bi * 22;
          const sweep = seg(frame, sweepAt, sweepAt + 18) * (1 - seg(frame, sweepAt + 30, sweepAt + 52));
          const active = Math.max(live * (1 - seg(frame, b.end - 24, b.end)), sweep);
          const sx = b.side === 'left' ? 344 : 1384;
          const sy = b.ty + 17;
          const a = anchorOf(b);
          const draw = seg(frame, b.at + 6, b.at + 40);
          const travel = lin(frame, sweepAt, sweepAt + 38);
          return (
            <g key={`lead-${b.tag}`}>
              <line
                x1={sx}
                y1={sy}
                x2={mix(sx, a.x, draw)}
                y2={mix(sy, a.y, draw)}
                stroke={active > 0.05 ? b.color : palette.line}
                strokeWidth={active > 0.05 ? 2.4 : 1.6}
                opacity={live * (active > 0.05 ? 0.75 : 0.9)}
                strokeLinecap="round"
              />
              {sweep > 0.02 ? (
                <circle cx={mix(sx, a.x, travel)} cy={mix(sy, a.y, travel)} r={5} fill={b.color} opacity={sweep * 0.85} />
              ) : null}
            </g>
          );
        })}
      </svg>

      {BEATS.map((b, bi) => {
        const live = seg(frame, b.at, b.at + 26);
        const sweepAt = 1310 + bi * 22;
        const sweep = seg(frame, sweepAt, sweepAt + 18) * (1 - seg(frame, sweepAt + 30, sweepAt + 52));
        const active = Math.max(live * (1 - seg(frame, b.end - 24, b.end)), sweep);
        return (
          <div
            key={`tag-${b.tag}`}
            style={{
              position: 'absolute',
              left: b.side === 'left' ? 0 : 1398,
              top: b.ty,
              width: 330,
              textAlign: b.side === 'left' ? 'right' : 'left',
              fontFamily,
              fontSize: 27,
              fontWeight: 880,
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
              color: active > 0.05 ? b.color : palette.muted,
              opacity: live * (0.62 + active * 0.38),
              translate: `${(1 - live) * (b.side === 'left' ? -14 : 14)}px 0px`,
            }}
          >
            {b.tag}
          </div>
        );
      })}

      {/* ---------- one question in the frame at a time ----------------- */}
      {BEATS.map((b) => {
        const o = seg(frame, b.at + 8, b.at + 30) * (1 - seg(frame, b.end - 26, b.end));
        if (o <= 0.001) return null;
        return (
          <div
            key={`q-${b.tag}`}
            style={{
              position: 'absolute',
              left: 164,
              width: 1400,
              top: 530,
              textAlign: 'center',
              fontFamily,
              fontSize: 31,
              lineHeight: 1.32,
              fontWeight: 760,
              letterSpacing: '-0.015em',
              color: palette.ink,
              opacity: o,
              translate: `0px ${(1 - o) * 12}px`,
            }}
          >
            {b.question}
          </div>
        );
      })}

      <div
        style={{
          position: 'absolute',
          left: 164,
          width: 1400,
          top: 544,
          textAlign: 'center',
          fontFamily,
          fontSize: 30,
          fontWeight: 720,
          letterSpacing: '-0.01em',
          color: palette.muted,
          opacity: closing,
        }}
      >
        A frontier, not a recipe.
      </div>
    </>
  );
};

/** Where any society node is right now, so the fading edges follow it. */
function nodeNow(
  i: number,
  arrive: number,
  popPos: {x: number; y: number}[],
  k: number,
  pull: number,
) {
  const n = SOCIETY.nodes[i];
  const ci = CORE_FROM.indexOf(i);
  if (ci >= 0) {
    return {
      x: mix(n.x, CX + (CORE[ci].x - CX) * k, arrive),
      y: mix(n.y, CY + (CORE[ci].y - CY) * k, arrive),
    };
  }
  const pi = POP_FROM.indexOf(i);
  if (pi >= 0) return popPos[pi];
  return {x: mix(n.x, CX, pull * 0.16), y: mix(n.y, CY, pull * 0.16)};
}

/* ================================================================== */
/* 18 — Key Takeaways                                                  */
/* ================================================================== */

/**
 * The network from scene 17 does not disappear; it reorganises. The team walks
 * onto the first two stations of the progression, the population becomes the
 * fourth, and the four takeaways hang off the rail as a marker travels along
 * it from one station to the next.
 */

const STAGES = [
  {label: 'ONE LLM', x: 216, color: palette.blue},
  {label: 'LLM TEAM', x: 648, color: palette.orange},
  {label: 'LEARNED COOPERATION', x: 1080, color: palette.purple},
  {label: 'AGENT POPULATION', x: 1512, color: palette.green},
] as const;

const TRIO = [-62, 0, 62];
const TRIO_COLORS = [palette.purple, palette.green, palette.orange];

const IDEAS = [
  [
    'An LLM can be modelled as an agent',
    'It receives information, produces actions, and affects an environment that evolves.',
    95,
  ],
  [
    'Capable models do not automatically make a capable team',
    'Collaboration introduces coordination, communication, credit assignment and adaptation problems.',
    330,
  ],
  [
    'Cooperative MARL learns from team outcomes',
    'A framework for improving a team, rather than reasoning only about isolated models.',
    680,
  ],
  [
    'The scale may keep growing',
    'From pairs of models, to teams, to persistent populations of interacting agents.',
    945,
  ],
] as const;

/** Twenty slots; fourteen are the population arriving, six are growth. */
const CROWD = Array.from({length: 20}, (_, i) => {
  const a = i * 2.39996;
  const r = 14 + 36 * Math.sqrt(i / 20);
  return {x: 1512 + Math.cos(a) * r, y: 64 + Math.sin(a) * r * 0.8, big: i < 3};
});

/** Scene 17's resting layout, which scene 18 starts from. */
const restCore = (i: number) => ({
  x: CX + (CORE[i].x - CX) * END_K,
  y: CY + (CORE[i].y - CY) * END_K,
});
const restNewcomer = {x: CX + (NEWCOMER.x - CX) * END_K, y: CY + (NEWCOMER.y - CY) * END_K};
const restPop = (i: number) => ({
  x: CX + (POPULATION[i].x - CX) * END_RING,
  y: CY + (POPULATION[i].y - CY) * END_RING,
});

const Takeaways = () => {
  const frame = useCurrentFrame();

  const carry = seg(frame, 10, 96);
  const leave = 1 - seg(frame, 0, 46);
  const rail = seg(frame, 58, 112);
  const reached = IDEAS.map((idea) => seg(frame, idea[2] as number, (idea[2] as number) + 24));

  /* one marker walks the rail, and its arrival is what lights the next stage */
  const markerX = interpolate(
    frame,
    [104, 150, 320, 380, 660, 720, 930, 1200],
    [216, 216, 648, 648, 1080, 1080, 1512, 1512],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  const agentSize = mix(AGENT * END_K, 52, carry);
  const oneSize = mix(AGENT * END_K, 72, carry);

  return (
    <>
      <svg width={1728} height={690} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {/* the ring's chords, released */}
        {POPULATION.map((_, i) => {
          const p = restPop(i);
          const q = restPop((i + 1) % POPULATION.length);
          const o = (1 - seg(frame, 0, 40)) * 0.22;
          if (o <= 0.004) return null;
          return <line key={`c18-${i}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={palette.navy} strokeWidth={1.4} opacity={o} />;
        })}
        {/* the team's edges, released */}
        {CORE_EDGES.map(([a, b]) => {
          const pa = restCore(a);
          const pb = restCore(b);
          const o = (1 - seg(frame, 0, 40)) * 0.85;
          if (o <= 0.004) return null;
          return <line key={`e18-${a}${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={palette.line} strokeWidth={2.6} opacity={o} />;
        })}
        <circle cx={CX} cy={CY} r={15 * END_K} fill={palette.line} opacity={(1 - seg(frame, 0, 40)) * 0.5} />

        {/* the population walks to the fourth station */}
        {POPULATION.map((_, i) => {
          if (i === JOINER) return null;
          const from = restPop(i);
          const to = CROWD[i];
          return (
            <circle
              key={`p18-${i}`}
              cx={mix(from.x, to.x, carry)}
              cy={mix(from.y, to.y, carry)}
              r={mix(8, CROWD[i].big ? 10 : 6.4, carry)}
              fill={palette.navy}
              opacity={mix(0.74, reached[3] > 0.5 ? 0.95 : 0.4, carry)}
            />
          );
        })}
        {/* and the population keeps growing */}
        {CROWD.slice(14).map((c, j) => {
          const o = seg(frame, 1000 + j * 30, 1040 + j * 30);
          if (o <= 0.01) return null;
          return <circle key={`grow-${j}`} cx={c.x} cy={c.y} r={6.4} fill={palette.navy} opacity={o * 0.95} />;
        })}

        <line x1={216} y1={118} x2={1512} y2={118} stroke={palette.line} strokeWidth={5} strokeLinecap="round" opacity={rail} />
        <line x1={216} y1={118} x2={markerX} y2={118} stroke={palette.navy} strokeWidth={5} strokeLinecap="round" opacity={rail * 0.85} />
        <circle cx={markerX} cy={118} r={9 + 1.6 * Math.sin(frame / 9)} fill={palette.navy} opacity={rail} />
        {[432, 864, 1296].map((x) => (
          <path
            key={`chev-${x}`}
            d={`M ${x - 7} 110 L ${x + 6} 118 L ${x - 7} 126`}
            fill="none"
            stroke={palette.muted}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={rail * 0.55}
          />
        ))}

        {[648, 1080].map((cx) => (
          <g key={`link-${cx}`} opacity={(cx === 648 ? carry : rail) * 0.9}>
            <line x1={cx - 62} y1={64} x2={cx} y2={64} stroke={palette.line} strokeWidth={3} />
            <line x1={cx} y1={64} x2={cx + 62} y2={64} stroke={palette.line} strokeWidth={3} />
          </g>
        ))}
        <g opacity={rail * (0.4 + reached[2] * 0.6)}>
          <circle cx={1080} cy={14} r={10} fill={reached[2] > 0.5 ? palette.purple : palette.muted} />
          {TRIO.map((dx) => (
            <path
              key={`ret-${dx}`}
              d={`M 1080 24 Q ${1080 + dx * 0.7} 30 ${1080 + dx} 38`}
              fill="none"
              stroke={reached[2] > 0.5 ? palette.purple : palette.muted}
              strokeWidth={2.4}
              opacity={0.75}
            />
          ))}
        </g>
      </svg>

      {/* the team walks onto the rail */}
      <div style={{position: 'absolute', inset: 0}}>
        <LlmAgent
          color={palette.blue}
          size={oneSize}
          x={mix(restCore(0).x, 216, carry) - oneSize / 2}
          y={mix(restCore(0).y, 64, carry) - oneSize / 2}
          delay={0}
        />
        {[1, 2, 3].map((i, j) => (
          <LlmAgent
            key={`t18-${i}`}
            color={CORE[i].color}
            size={agentSize}
            x={mix(restCore(i).x, 648 + TRIO[j], carry) - agentSize / 2}
            y={mix(restCore(i).y, 64, carry) - agentSize / 2}
            delay={0}
          />
        ))}
        {/* the third station is the same team again, once it can learn */}
        <div style={{opacity: rail}}>
          {TRIO.map((dx, j) => (
            <LlmAgent key={`l18-${dx}`} color={TRIO_COLORS[j]} size={52} x={1080 + dx - 26} y={64 - 26} delay={56 + j * 6} />
          ))}
        </div>
      </div>
      {/* the joiner leaves with the rest of scene 17 */}
      {leave > 0.02 ? (
        <div style={{opacity: leave}}>
          <LlmAgent
            color={palette.red}
            size={AGENT * END_K}
            x={restNewcomer.x - (AGENT * END_K) / 2}
            y={restNewcomer.y - (AGENT * END_K) / 2}
            delay={0}
          />
        </div>
      ) : null}

      {/* scene 17's labelling, put away */}
      {leave > 0.02
        ? BEATS.map((b) => (
            <div
              key={`ot-${b.tag}`}
              style={{
                position: 'absolute',
                left: b.side === 'left' ? 0 : 1398,
                top: b.ty,
                width: 330,
                textAlign: b.side === 'left' ? 'right' : 'left',
                fontFamily,
                fontSize: 27,
                fontWeight: 880,
                letterSpacing: '-0.02em',
                color: palette.muted,
                opacity: leave * 0.62,
              }}
            >
              {b.tag}
            </div>
          ))
        : null}
      {leave > 0.02 ? (
        <div
          style={{
            position: 'absolute',
            left: 164,
            width: 1400,
            top: 544,
            textAlign: 'center',
            fontFamily,
            fontSize: 30,
            fontWeight: 720,
            color: palette.muted,
            opacity: leave,
          }}
        >
          A frontier, not a recipe.
        </div>
      ) : null}

      {STAGES.map((s, i) => (
        <div
          key={s.label}
          style={{
            position: 'absolute',
            left: s.x - 216,
            top: 140,
            width: 432,
            textAlign: 'center',
            fontFamily,
            fontSize: 23,
            fontWeight: 900,
            letterSpacing: '0.09em',
            color: reached[i] > 0.5 ? s.color : palette.muted,
            opacity: rail * (reached[i] > 0.5 ? 1 : 0.42),
          }}
        >
          {s.label}
        </div>
      ))}

      {IDEAS.map((idea, i) => {
        const o = seg(frame, idea[2] as number, (idea[2] as number) + 26);
        if (o <= 0.001) return null;
        return (
          <div
            key={idea[0]}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 202 + i * 120,
              display: 'grid',
              gridTemplateColumns: '96px 1fr',
              alignItems: 'baseline',
              fontFamily,
              opacity: o,
              translate: `${(1 - o) * 20}px 0px`,
            }}
          >
            <div style={{fontSize: 50, fontWeight: 950, lineHeight: 1, color: STAGES[i].color, letterSpacing: '-0.04em'}}>
              {i + 1}
            </div>
            <div>
              <div style={{fontSize: 35, fontWeight: 930, color: palette.ink, letterSpacing: '-0.03em', lineHeight: 1.12}}>
                {idea[0]}
              </div>
              <div style={{fontSize: 27, fontWeight: 700, color: palette.muted, marginTop: 10, lineHeight: 1.3}}>
                {idea[1]}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

/* ================================================================== */
/* 19 — Questions to Carry Forward                                     */
/* ================================================================== */

/**
 * The rail is still on screen at frame 0. It draws itself together into a
 * single point and the questions take its place: one at a time, an empty beat
 * between each, and then the question that has no answer, larger and left
 * alone. The guide arrives late, beside that question, and leaves before the
 * end so the last frame is only the words.
 */

const CARRY = [
  {text: 'Should collaboration be designed, learned, or both?', in: 300, out: 402},
  {text: 'How should a shared outcome shape many LLM policies?', in: 432, out: 566},
  {text: 'Can an LLM cooperate with agents it has never encountered before?', in: 598, out: 790},
] as const;

const CarryForward = () => {
  const frame = useCurrentFrame();

  const pull = seg(frame, 30, 190);
  const railOut = 1 - seg(frame, 40, 180);
  const ideasOut = 1 - seg(frame, 24, 120);
  const lead = seg(frame, 170, 210) * (1 - seg(frame, 264, 296));
  const final = seg(frame, 822, 862);
  const ruleIn = seg(frame, 880, 940);
  const ruleWide = 200 + 120 * seg(frame, 1000, 1120);
  const guide = seg(frame, 960, 1010) * (1 - seg(frame, 1120, 1170));

  const sx = (x: number) => mix(x, 864, pull);

  return (
    <>
      {/* the progression, drawing itself together */}
      {railOut > 0.004 ? (
        <svg width={1728} height={690} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          <line x1={sx(216)} y1={118} x2={sx(1512)} y2={118} stroke={palette.line} strokeWidth={5} strokeLinecap="round" opacity={railOut} />
          <line x1={sx(216)} y1={118} x2={sx(1512)} y2={118} stroke={palette.navy} strokeWidth={5} strokeLinecap="round" opacity={railOut * 0.85} />
          <circle cx={sx(1512)} cy={118} r={9} fill={palette.navy} opacity={railOut} />
          {[432, 864, 1296].map((x) => (
            <path
              key={`c19-${x}`}
              d={`M ${sx(x) - 7} 110 L ${sx(x) + 6} 118 L ${sx(x) - 7} 126`}
              fill="none"
              stroke={palette.muted}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={railOut * 0.55}
            />
          ))}
          {[648, 1080].map((cx) => (
            <g key={`k19-${cx}`} opacity={railOut * 0.9}>
              <line x1={sx(cx - 62)} y1={64} x2={sx(cx)} y2={64} stroke={palette.line} strokeWidth={3} />
              <line x1={sx(cx)} y1={64} x2={sx(cx + 62)} y2={64} stroke={palette.line} strokeWidth={3} />
            </g>
          ))}
          <g opacity={railOut}>
            <circle cx={sx(1080)} cy={14} r={10} fill={palette.purple} />
            {TRIO.map((dx) => (
              <path
                key={`r19-${dx}`}
                d={`M ${sx(1080)} 24 Q ${sx(1080 + dx * 0.7)} 30 ${sx(1080 + dx)} 38`}
                fill="none"
                stroke={palette.purple}
                strokeWidth={2.4}
                opacity={0.75}
              />
            ))}
          </g>
          {CROWD.map((c, i) => (
            <circle key={`w19-${i}`} cx={sx(c.x)} cy={c.y} r={c.big ? 10 : 6.4} fill={palette.navy} opacity={railOut * 0.95} />
          ))}
        </svg>
      ) : null}

      {railOut > 0.004 ? (
        <div style={{position: 'absolute', inset: 0, opacity: railOut}}>
          <LlmAgent color={palette.blue} size={72} x={sx(216) - 36} y={64 - 36} delay={0} />
          {TRIO.map((dx, j) => (
            <LlmAgent key={`a19-${dx}`} color={CORE[j + 1].color} size={52} x={sx(648 + dx) - 26} y={64 - 26} delay={0} />
          ))}
          {TRIO.map((dx, j) => (
            <LlmAgent key={`b19-${dx}`} color={TRIO_COLORS[j]} size={52} x={sx(1080 + dx) - 26} y={64 - 26} delay={0} />
          ))}
        </div>
      ) : null}

      {railOut > 0.004
        ? STAGES.map((s) => (
            <div
              key={`s19-${s.label}`}
              style={{
                position: 'absolute',
                left: sx(s.x) - 216,
                top: 140,
                width: 432,
                textAlign: 'center',
                fontFamily,
                fontSize: 23,
                fontWeight: 900,
                letterSpacing: '0.09em',
                color: s.color,
                opacity: railOut,
              }}
            >
              {s.label}
            </div>
          ))
        : null}

      {ideasOut > 0.004
        ? IDEAS.map((idea, i) => (
            <div
              key={`i19-${idea[0]}`}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 202 + i * 120,
                display: 'grid',
                gridTemplateColumns: '96px 1fr',
                alignItems: 'baseline',
                fontFamily,
                opacity: ideasOut * (1 - seg(frame, 24 + i * 14, 96 + i * 14)),
              }}
            >
              <div style={{fontSize: 50, fontWeight: 950, lineHeight: 1, color: STAGES[i].color, letterSpacing: '-0.04em'}}>
                {i + 1}
              </div>
              <div>
                <div style={{fontSize: 35, fontWeight: 930, color: palette.ink, letterSpacing: '-0.03em', lineHeight: 1.12}}>
                  {idea[0]}
                </div>
                <div style={{fontSize: 27, fontWeight: 700, color: palette.muted, marginTop: 10, lineHeight: 1.3}}>
                  {idea[1]}
                </div>
              </div>
            </div>
          ))
        : null}

      <div
        style={{
          position: 'absolute',
          left: 414,
          width: 900,
          top: 268,
          textAlign: 'center',
          fontFamily,
          fontSize: 31,
          fontWeight: 720,
          letterSpacing: '-0.01em',
          color: palette.muted,
          opacity: lead,
        }}
      >
        Four questions. Give each one a moment.
      </div>

      {CARRY.map((q) => {
        const o = seg(frame, q.in, q.in + 20) * (1 - seg(frame, q.out, q.out + 20));
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
        What happens when a team of LLM agents becomes a society?
      </div>
      <div
        style={{
          position: 'absolute',
          left: 864 - ruleWide / 2,
          top: 452,
          width: ruleWide,
          height: 5,
          borderRadius: 5,
          background: sectionColors.Frontier,
          opacity: ruleIn * 0.5,
        }}
      />
      <div style={{opacity: guide}}>
      </div>
    </>
  );
};

/* ================================================================== */
/* 20 — LLMs as Cooperative Agents                                     */
/* ================================================================== */

/**
 * The rule under the unanswered question contracts into one model, that model
 * becomes a team, the team becomes a network, and the network settles back
 * into the same rule, now under the title. `SceneShell` draws the title, so
 * the subtitle sits directly beneath it and the row of agents finishes the
 * lockup. Then the frame fades to white.
 */

const FCX = 864;
const FCY = 356;
const TEAM = [
  {x: 864, y: 236, color: palette.blue},
  {x: 1060, y: 446, color: palette.purple},
  {x: 668, y: 446, color: palette.green},
] as const;
const OUTER = [-90, -45, 0, 45, 90, 135, 180, 225].map((deg) => {
  const r = (deg * Math.PI) / 180;
  return {x: FCX + 340 * Math.cos(r), y: FCY + 236 * Math.sin(r)};
});
/** The row the network resolves into, aligned to the content margin. */
const ROW_Y = 384;
const rowX = (i: number) => i * 170;

const FinalFrame = () => {
  const frame = useCurrentFrame();

  const question = 1 - seg(frame, 0, 34);
  const seed = seg(frame, 0, 44);
  const single = seg(frame, 34, 78);
  const team = seg(frame, 104, 160);
  const net = seg(frame, 156, 216);
  const collapse = seg(frame, 216, 272);
  const subtitle = seg(frame, 224, 268);
  const rule = seg(frame, 244, 294);
  const white = seg(frame, 400, 438);

  const nodePos = (i: number) => {
    const base =
      i === 0
        ? {x: mix(FCX, TEAM[0].x, team), y: mix(FCY, TEAM[0].y, team)}
        : i < 3
          ? TEAM[i]
          : OUTER[i - 3];
    return {x: mix(base.x, rowX(i), collapse), y: mix(base.y, ROW_Y, collapse)};
  };
  const nodeColor = (i: number) => (i < 3 ? TEAM[i].color : palette.navy);
  const agentSize = mix(128, 88, team) * (1 - collapse * 0.4);

  /* the rule the last question left behind, contracting into one model */
  const seedW = mix(320, 16, seed);
  const seedH = mix(5, 16, seed);
  const seedY = mix(452, FCY, seed);

  return (
    <>
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
          opacity: question,
        }}
      >
        What happens when a team of LLM agents becomes a society?
      </div>
      <div
        style={{
          position: 'absolute',
          left: FCX - seedW / 2,
          top: seedY - seedH / 2,
          width: seedW,
          height: seedH,
          borderRadius: seedH / 2,
          background: sectionColors.Frontier,
          opacity: (1 - seg(frame, 46, 76)) * 0.6,
        }}
      />

      <svg width={1728} height={690} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {[
          [0, 1],
          [1, 2],
          [2, 0],
        ].map(([a, b]) => {
          const pa = nodePos(a);
          const pb = nodePos(b);
          return (
            <line
              key={`te-${a}${b}`}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke={palette.line}
              strokeWidth={3}
              opacity={team * (1 - collapse)}
              strokeLinecap="round"
            />
          );
        })}
        {OUTER.map((_, j) => {
          const pa = nodePos(j + 3);
          const pb = nodePos(j % 3);
          const pc = nodePos(((j + 1) % 8) + 3);
          return (
            <g key={`ne-${j}`} opacity={net * (1 - collapse)}>
              <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={palette.line} strokeWidth={2} strokeLinecap="round" />
              <line x1={pa.x} y1={pa.y} x2={pc.x} y2={pc.y} stroke={palette.line} strokeWidth={2} strokeLinecap="round" />
            </g>
          );
        })}

        {/* the rule the network resolves into, drawn under the nodes */}
        <line
          x1={0}
          y1={ROW_Y}
          x2={mix(0, rowX(10), rule)}
          y2={ROW_Y}
          stroke={palette.line}
          strokeWidth={3}
          opacity={rule * 0.95}
          strokeLinecap="round"
        />

        {OUTER.map((_, j) => {
          const p = nodePos(j + 3);
          const shimmer = collapse * Math.max(0, Math.sin((frame - 300 - (j + 3) * 8) / 7)) * (1 - seg(frame, 392, 400));
          return (
            <circle
              key={`nn-${j}`}
              cx={p.x}
              cy={p.y}
              r={mix(17, 11 + shimmer * 2.6, collapse)}
              fill={palette.navy}
              opacity={net * (0.5 + collapse * 0.5)}
            />
          );
        })}
        {[0, 1, 2].map((i) => {
          const p = nodePos(i);
          const shimmer = collapse * Math.max(0, Math.sin((frame - 300 - i * 8) / 7)) * (1 - seg(frame, 392, 400));
          return (
            <circle
              key={`tn-${i}`}
              cx={p.x}
              cy={p.y}
              r={mix(20, 13 + shimmer * 2.6, collapse)}
              fill={nodeColor(i)}
              opacity={collapse}
            />
          );
        })}
      </svg>

      {[0, 1, 2].map((i) => {
        const p = nodePos(i);
        const alive = (i === 0 ? single : team) * (1 - collapse);
        if (alive <= 0.001) return null;
        return (
          <div key={`agent-${i}`} style={{opacity: alive}}>
            <LlmAgent
              color={TEAM[i].color}
              size={agentSize}
              x={p.x - agentSize / 2}
              y={p.y - agentSize / 2}
              delay={i === 0 ? 34 : 106 + i * 8}
            />
          </div>
        );
      })}

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 6,
          width: 1500,
          fontFamily,
          fontSize: 38,
          fontWeight: 720,
          letterSpacing: '-0.015em',
          lineHeight: 1.2,
          color: palette.muted,
          opacity: subtitle,
          translate: `0px ${(1 - subtitle) * 12}px`,
        }}
      >
        From individual assistants to learning teams and agent societies
      </div>

      {/* fade to white, across the whole frame */}
      <div
        style={{
          position: 'absolute',
          left: -96,
          top: -196,
          width: 1920,
          height: 1080,
          background: palette.white,
          opacity: white,
          zIndex: 40,
        }}
      />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 22 — And That's It                                                  */
/* ------------------------------------------------------------------ */

const SIGN_X = [354, 654, 954, 1254];
const SIGN_COLORS = [palette.blue, palette.orange, palette.purple, palette.green];

/**
 * The sign-off. The four models that carried the video line up, their token
 * bars run a wave along the row, and they say the one thing the viewer is
 * owed. Deliberately not another content frame.
 *
 * The wave is offset per agent so the acknowledgement travels along the line,
 * which is what makes it read as a team rather than four separate heads — the
 * same point the whole video has been making.
 */
const SignOff = () => {
  const frame = useCurrentFrame();
  const ease = Easing.bezier(0.16, 1, 0.3, 1);
  const rise = (a: number, b: number) =>
    interpolate(frame, [a, b], [0, 1], {easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const sentence = rise(10, 46);
  const bubble = rise(130, 168);
  const credit = rise(225, 265);
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
        One model was never the ceiling. The interesting part is what several can learn together.
      </div>

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

      {SIGN_X.map((x, i) => {
        const enter = rise(16 + i * 14, 58 + i * 14);
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
                background: SIGN_COLORS[i],
                opacity: lit * 0.22,
                filter: 'blur(10px)',
              }}
            />
            <LlmAgent color={SIGN_COLORS[i]} x={x} y={320} size={120} delay={16 + i * 14} busy={lit > 0.35} />
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
        LLMs as Cooperative Agents
      </div>
    </>
  );
};

export const FrontierVisuals: React.FC<{sceneIndex: number}> = ({sceneIndex}) => {
  switch (sceneIndex) {
    case 17:
      return <WhatRemains />;
    case 18:
      return <Takeaways />;
    case 19:
      return <CarryForward />;
    case 20:
      return <FinalFrame />;
    default:
      return <SignOff />;
  }
};
