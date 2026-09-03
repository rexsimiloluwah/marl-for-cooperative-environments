# Multi-Agent Reinforcement Learning for Cooperative Environments

**Learning to Coordinate, Communicate, and Adapt**

An interactive educational resource on cooperative multi-agent reinforcement
learning, built for the NeurIPS 2026 Education Track. Prepared as a self-contained
teaching package: an interactive textbook, executable exercises, a wireless
resource-allocation lab, notebooks, explainer videos, lecture slides and a design
project.

Full specification: [MASTER_PROMPT.md](MASTER_PROMPT.md).
Build progress: [CHECKLIST.md](CHECKLIST.md).

---

## Requirements

| Tool | Version | Needed for |
| --- | --- | --- |
| Node.js | 20+ (developed on 25.9) | website |
| npm | 10+ | website |
| Python | 3.11+ (developed on 3.13) | wireless environment, notebooks |
| Quarto | 1.5+ (developed on 1.8) | lecture slides (later phase) |
| LaTeX | any TeX Live | Manim equations (later phase) |

---

## Website

```bash
npm install          # once
npm run dev          # http://localhost:4321
```

**Restart the dev server after adding a new content page.** Astro's content
layer caches the collection's entry list, so a `.mdx` file created while the
server is running returns 404 until it is restarted, even though the file is
correct and `npm run build` renders it fine:

```bash
npx astro dev stop && npx astro sync && npm run dev
```

`astro dev` runs as a background daemon, so the command returns immediately:

```bash
npx astro dev status   # is it running, and on which port
npx astro dev logs     # tail its output
npx astro dev stop     # shut it down
```

Production build and local preview of the built output:

```bash
npm run build        # writes ./dist
npm run preview      # serves ./dist
```

### Routes

| Path | Contents |
| --- | --- |
| `/` | landing page (`src/pages/index.astro`, outside Starlight for full-width bands) |
| `/introduction/` | audience, prerequisites, objectives |
| `/rl-refresher/` | Module 0, optional single-agent RL review |
| `/chapters/coordinate/` | Module 1 |
| `/chapters/communicate/` | Module 2 |
| `/chapters/adapt/` | Module 3 |
| `/wireless-bridge/` | Module 4, minimum wireless concepts |
| `/wireless-lab/` | Module 4, the Three.js lab |
| `/project/` | Module 5, final design project |
| `/resources/...` | knowledge checks, worksheets, notebooks, explainers, references |
| `/dev/equations/` | **component gallery.** Not part of the course |

Chapter pages are currently stubs, each closing with a worksheet. The resource
is aimed at learners: there is no instructor guide, and worksheets take its
place. See [CHECKLIST.md](CHECKLIST.md) for what is built and what is next.

`/dev/equations/` is the reference fixture for the annotated-equation
components. Look there first if a figure regresses. It is absent from the
sidebar and marked `noindex`.

---

## In-browser Python

Exercises run Python in the reader's browser through Pyodide 314.0.6. Nothing
is downloaded until someone presses Run or Check, so a reader who never opens
an exercise never pays for the runtime.

By default the runtime is fetched from a CDN, which keeps this repository
small. For a classroom with no reliable internet, vendor it instead:

```bash
npm run vendor:pyodide                      # ~13 MB into public/pyodide/
PUBLIC_PYODIDE_BASE=/pyodide/ npm run build # fully self-contained
```

`public/pyodide/` is gitignored, so vendoring is opt-in and the default build
stays light.

Two things worth knowing before changing this code:

- **Checking runs tests, never a string comparison.** Each assertion carries a
  `hint` explaining what it tests, which is shown when it fails. That hint is
  the point: "Incorrect" teaches nothing.
- **Embedded UI needs `class="not-content"`.** Starlight's markdown stylesheet
  inserts a margin between every pair of sibling block elements inside an
  article, which silently wrecks any component that renders many small
  children (it added 16px to every line of the code editor).

## The Python package

Every environment, agent, training loop and plot the Colab labs use lives in
`cooperative-marl-labs/`, published as one installable package. The notebooks
open with a single install cell, so a notebook holds the experiment rather than
the infrastructure.

```bash
cd cooperative-marl-labs
python -m pip install -e ".[dev,learning]"
pytest                                    # environments, physics, API, imports
ruff check .
```

- `envs/` — `SpeakerListenerEnv`, `PartnerCoordinationEnv`,
  `WirelessResourceAllocationEnv`, all PettingZoo `ParallelEnv`s that pass
  `pettingzoo.test.parallel_api_test`
- `agents/`, `policies/`, `training/`, `evaluation/`, `visualization/`
- PyTorch is an optional extra, needed only by the speaker-listener protocol
  experiments, and is not imported at package import time

See `cooperative-marl-labs/README.md` for the API and
`cooperative-marl-labs/PUBLISHING.md` for the release steps. It is **not
published to PyPI yet**; until it is, the notebooks' install cell falls back to
installing from this repository.

### Re-measuring the wireless numbers

Every wireless figure quoted on the website and in the notebook takeaways comes
from one script, over three training seeds:

```bash
python3 scripts/marl/measure_wireless.py     # writes wireless_measurements.json
```

The reward model determines all of them, so a change to the environment's
physics means re-running this and updating the lab pages, not just bumping the
package version.

### `wireless_env/` (legacy)

An earlier pure-NumPy wireless module, written to be ported to TypeScript for a
Three.js lab that was replaced by the in-browser Coordinate lab. Its 225 tests
still pass and nothing in `src/` or `scripts/` imports it. It is superseded by
`cooperative_marl_labs.envs.wireless_resource_allocation` and is a candidate for
removal.

```bash
python3 -m pytest wireless_env/tests -q          # 225 tests
```

---

## Architecture notes

Three decisions that are not obvious from the code, and would otherwise be
rediscovered the hard way.

**Markdown processor.** Astro 7 defaults to Sätteri, whose plugin API is
visitor-based and does not accept unified plugins such as `rehype-katex`.
`astro.config.mjs` therefore opts into `unified()` from
`@astrojs/markdown-remark`. Do not switch the processor without replacing the
maths pipeline.

**CSS layering.** All Starlight CSS ships inside `@layer starlight.*`. Unlayered
rules beat layered ones in the cascade regardless of specificity, and every rule
in `src/styles/` is unlayered. That is why no override needs `!important`. Keep
it that way.

**Light-only palette.** The theme toggle is removed on purpose. The same six
semantic accents have to hold across the website, the Manim videos, the Quarto
slides and the Three.js lab, and all four are specified on a light ground.
Reintroducing dark mode means adding one token block in `src/styles/tokens.css`
and restoring the `ThemeSelect` override.

### Semantic colour

Colour carries meaning rather than decoration, and the same six tones are used
everywhere. Each has a saturated value for strokes, arrows and fills, a
darkened `-ink` value for small text (every one measured at 4.5:1 or better
against the page ground), and a pale tint for callout backgrounds.

| Tone | Means |
| --- | --- |
| `action` | actions, decisions, choices, attention |
| `observe` | observations, state, information the learner is given |
| `policy` | agents, policies, learned components |
| `comm` | messages, channels, information flow |
| `reward` | rewards, throughput, successful cooperation |
| `conflict` | interference, collisions, errors, failure |

Defined once in [src/styles/tokens.css](src/styles/tokens.css).

### Annotated equations

Important equations are teaching diagrams, not maths followed by a bullet list.
Terms are tagged in the LaTeX and measured in the browser, so there are no
coordinates to maintain and editing a formula cannot desynchronise its labels.

```mdx
<Equation
  label="Figure 1.4"
  tex={String.raw`\mark{a}{\act{i}} \sim \mark{pi}{\pol{i}}\!\left(\act{i} \given \mark{o}{\obs{i}}\right)`}
  annotations={[
    { term: 'a',  side: 'above', tone: 'action',  label: 'action agent i takes' },
    { term: 'pi', side: 'above', tone: 'policy',  label: "agent i's own policy" },
    { term: 'o',  side: 'below', tone: 'observe', label: 'what agent i can see' },
  ]}
  caption="Each agent acts on its own observation alone."
/>
```

`\mark{key}{...}` tags a term; the key is what `annotations` references.
`\tone{tone}{term}` colours a term in place, and `\ubrace{tone}{term}{label}`
braces one. Bracing is left to LaTeX because KaTeX draws better braces than
positioned SVG; the engine handles only what LaTeX cannot, namely labels outside
the formula with drawn connectors.

Shared notation lives in
[src/lib/equations/notation.mjs](src/lib/equations/notation.mjs) and is imported
by both the Markdown pipeline and the components, so prose and figures cannot
drift into different symbols.

The build warns, rather than failing silently, when an annotation names a term
that no `\mark` produced, when a label runs long enough to crowd the figure, and
when an `underline` is requested above a term (where the rule reads as a
strikethrough). Treat those warnings as errors.

---

## Layout

```
src/
  components/
    diagrams/      inline-SVG figures, including the chapter heroes
    equations/     Equation, EquationSequence
    labs/          the in-browser Coordinate virtual lab
    overrides/     Starlight component overrides
    worksheet/     Map/Calculate/Explore/Decide worksheet primitives
  content/docs/    chapters and reference pages (MDX)
  lib/equations/   annotation engine, shared notation
  lib/marl/        the Coordinate lab's learners, in TypeScript
  styles/          tokens, editorial theme, maths, component primitives
cooperative-marl-labs/
  src/cooperative_marl_labs/   the installable lab package
  tests/                       its test suite
notebooks/         the three Colab labs, built by scripts/notebooks/
public/images/     raster figures, shared with the notebooks
scripts/
  marl/            measurement and browser self-tests
  notebooks/       notebook build, normalize and verify
  qa/              internal-link audit
wireless_env/      legacy simulation, superseded (see above)
```

---

## Educational integrity

The resource distinguishes three kinds of claim throughout, and never blurs them:

1. published results, cited
2. our own measured experimental results
3. illustrative educational examples

No synthetic number is presented as a benchmark result, no hand-coded policy is
described as learned, and no rule-based message protocol is described as
emergent. Where a quantity has not been measured, no number is given.
