/**
 * SHARED MATHEMATICAL NOTATION
 *
 * One source of truth for every symbol in the resource. Imported by
 * astro.config.mjs for prose maths and by the Equation components for
 * annotated maths, so a chapter and a diagram can never drift into using
 * different notation for the same object.
 *
 * Plain .mjs with JSDoc rather than .ts so the Astro config can import it
 * directly without a build step.
 */

/**
 * Notation macros. Available in every `$...$` and `$$...$$` block.
 * @type {Record<string, string>}
 */
export const NOTATION_MACROS = {
  // --- agents and indices ---
  '\\ag': 'i', // canonical agent index
  '\\nag': 'n', // number of agents

  // --- the core cooperative-MARL objects ---
  '\\jointact': '\\mathbf{a}_t', // joint action across all agents
  '\\act': 'a_t^{#1}', // action of agent #1
  '\\obs': 'o_t^{#1}', // local observation of agent #1
  '\\pol': '\\pi_{#1}', // policy of agent #1
  '\\msg': 'm_t^{#1}', // message emitted by agent #1
  '\\st': 's_t', // global environment state
  '\\rew': 'r_t', // shared team reward

  // --- wireless quantities ---
  '\\gain': 'g_{#1#2}', // channel gain from station #1 to user #2
  '\\pow': 'P_{#1}', // transmit power of station #1
  '\\sinr': '\\mathrm{SINR}', // signal to interference plus noise ratio
  '\\rate': 'R_{#1}', // achievable rate for user #1
  '\\noise': '\\sigma^{2}', // noise power
  '\\chan': 'c_{#1}', // channel chosen by station #1

  // --- shorthand ---
  '\\R': '\\mathbb{R}',
  '\\E': '\\mathbb{E}',
  '\\given': '\\mid',
  '\\defeq': '\\triangleq',
};

/**
 * Tags a sub-expression so the annotation layer can find and measure it.
 * Expands to KaTeX's `\htmlData`, which emits `data-term="key"` on a span.
 *
 * This macro requires `trust: true`, which is why it is NOT exposed to prose
 * maths: content maths runs with `trust: false` so nothing in a Markdown file
 * can inject attributes. The Equation components opt in deliberately, and the
 * LaTeX they render is authored in this repository rather than supplied by a
 * reader.
 *
 * Usage:  \mark{policy}{\pi_i(a \mid o)}
 */
export const MARK_MACRO = { '\\mark': '\\htmlData{term=#1}{#2}' };

/**
 * Macros that colour or brace a term in place. These use `\htmlClass`, which
 * also requires `trust: true`, so like `\mark` they are available only to the
 * Equation components.
 *
 *   \tone{policy}{\pi_i}                    colour a term
 *   \ubrace{observe}{o_t^i}{what i sees}    underbrace with a coloured label
 *   \obrace{reward}{r_t}{shared}            overbrace with a coloured label
 *
 * KaTeX draws far better braces than we could position by hand, so bracing is
 * left to LaTeX. The annotation engine handles only what LaTeX cannot: labels
 * placed outside the formula with drawn connectors.
 */
export const DECORATION_MACROS = {
  /* Colour a term in place. */
  '\\tone': '\\htmlClass{term-#1}{#2}',

  /* Brace a term with a coloured label. These are the DEFAULT way to annotate
     an equation in this resource. A brace sits directly under (or over) the
     thing it describes, so there is no arrow to follow and nothing to
     mis-track; the label is attached by position rather than by a line. */
  '\\ubrace': '\\underbrace{#2}_{\\htmlClass{term-#1}{\\text{\\scriptsize #3}}}',
  '\\obrace': '\\overbrace{#2}^{\\htmlClass{term-#1}{\\text{\\scriptsize #3}}}',

  /* Box a whole region, for when the thing being named is several terms wide
     and a brace would be unwieldy. Solid for a definition, dashed for "these
     two forms are the same thing". */
  '\\cbox': '\\htmlClass{eqbox eqbox--#1}{#2}',
  '\\dbox': '\\htmlClass{eqbox eqbox--dash eqbox--#1}{#2}',
};

/**
 * Macro set for prose maths. Deliberately excludes `\mark` and the
 * decoration macros: content maths renders with `trust: false`, so nothing in
 * a Markdown file can inject attributes or classes.
 *
 * Prose maths is also intentionally monochrome. Colour in this resource means
 * something, and an inline symbol has no diagram to agree with. When an
 * equation needs colour it has earned a full annotated figure instead.
 */
export const PROSE_MACROS = { ...NOTATION_MACROS };

/** Macro set for the Equation components. Adds marking and decoration. */
export const ANNOTATED_MACROS = {
  ...NOTATION_MACROS,
  ...MARK_MACRO,
  ...DECORATION_MACROS,
};

/**
 * The six semantic tones. These names are the contract between the palette in
 * src/styles/tokens.css, the equation annotations, the SVG diagrams, the
 * Three.js lab, the Manim videos and the Quarto slides.
 * @typedef {'action'|'observe'|'policy'|'comm'|'reward'|'conflict'} Tone
 */

/** @type {Record<string, {label: string, means: string}>} */
export const TONES = {
  action: { label: 'Action', means: 'actions, decisions, choices, attention' },
  observe: { label: 'Observation', means: 'observations, state, given information' },
  policy: { label: 'Policy', means: 'agents, policies, learned components' },
  comm: { label: 'Message', means: 'communication and information flow' },
  reward: { label: 'Reward', means: 'rewards, throughput, successful cooperation' },
  conflict: { label: 'Interference', means: 'interference, collisions, errors, failure' },
};
