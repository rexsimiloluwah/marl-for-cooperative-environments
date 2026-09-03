# Contributing

Reviews, corrections and contributions are welcome, particularly ones that
improve technical accuracy, accessibility, or educational quality.

This file is also the developer documentation for the repository: what is
where, how to build each part, and the handful of decisions that would
otherwise be rediscovered the hard way.

## What is most useful

- **Technical corrections.** A wrong definition, a misstated result, a
  citation that does not say what it is claimed to say. These matter most.
- **Educational clarity.** A section that is confusing, an example that does
  not land, an exercise whose expected shape is unclear.
- **Accessibility.** Contrast, keyboard navigation, screen-reader labels,
  behaviour at 390px, `prefers-reduced-motion`.
- **Reproducibility.** Anything that fails to reproduce from a stated seed.

## Requirements

| Tool | Version | Needed for |
| --- | --- | --- |
| Node.js | 20+ (developed on 25.9) | website |
| npm | 10+ | website |
| Python | 3.10+ (developed on 3.13) | lab package, notebooks |

## The website

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

Production build and local preview:

```bash
npm run build        # writes ./dist
npm run preview      # serves ./dist
```

### Routes

| Path | Contents |
| --- | --- |
| `/` | landing page (`src/pages/index.astro`, outside Starlight for full-width bands) |
| `/introduction/`, `/prerequisites/`, `/learning-objectives/`, `/how-to-use/`, `/tutorial-structure/` | Start Here |
| `/background/*` | nine foundation sections |
| `/coordinate/*` | Chapter 1, including the in-browser virtual lab and worksheet |
| `/communicate/*` | Chapter 2 |
| `/adapt/*` | Chapter 3 |
| `/lab/*` | Challenge Lab: wireless resource allocation |
| `/project/*` | Final Project: disaster response |
| `/resources/*` | knowledge checks, worksheets, notebooks, Python package, references |
| `/dev/*` | **component galleries.** Not part of the course |

Course structure lives in exactly one place,
[src/lib/nav.ts](src/lib/nav.ts). The sidebar, breadcrumbs, numbered page
titles, previous/next links and progress tracker all read from it, and section
numbers are derived rather than authored. Adding a page means adding it there.

`/dev/equations/` is the reference fixture for the annotated-equation
components. Look there first if a figure regresses. It is absent from the
sidebar and marked `noindex`.

## The lab package

```bash
cd cooperative-marl-labs
python -m pip install -e ".[dev,learning]"
pytest
ruff check .
```

See [cooperative-marl-labs/README.md](cooperative-marl-labs/README.md) for the
API and [PUBLISHING.md](cooperative-marl-labs/PUBLISHING.md) for release steps.
PyTorch is an optional extra and is not imported at package import time; keep
it that way, because it is what makes the base install fast on Colab.

## The API reference

The pages under `src/content/docs/package/` are **generated** from the
package's own docstrings. Do not edit them by hand: edit the docstring and
regenerate.

```bash
python3 scripts/docs/build_api_reference.py
```

The docstrings are the documentation; the script only arranges them. It refuses
to emit anything MDX would misparse, and it never inherits a docstring from
outside the package. That second rule exists because `inspect.getdoc` walks up
into PettingZoo, which is how `render()` came to be documented as "displays a
rendered frame" when ours prints one line of text. A wrong description is worse
than none.

The package's CI regenerates and fails if the result differs from what is
committed, so a docstring change cannot silently leave the published reference
behind.

## The notebooks

Notebooks are **generated**, not edited by hand. Edit the builder and rebuild:

```bash
python3 scripts/notebooks/build_communicate.py
python3 scripts/notebooks/build_adapt.py
python3 scripts/notebooks/build_wireless.py

python3 scripts/notebooks/normalize.py      # clear outputs, line-list sources
python3 scripts/notebooks/verify.py notebooks/*.ipynb
```

`verify.py` enforces four things, and a notebook that fails any of them should
not be committed:

1. the required section headings appear, in order;
2. every `todo-N` cell has a matching `solution-N` cell;
3. **no leaks**: no solution before the Solutions heading, no completed TODO,
   and no answer to an interpretation, discussion, deployment or reflection
   question;
4. it **runs** end to end with the solutions swapped in.

## Deployment

The site deploys to GitHub Pages on every push to `main`, through
`.github/workflows/deploy-site.yml`. One-time setup:
**Settings → Pages → Build and deployment → Source: GitHub Actions**. No branch
to create, no token to add.

A project site is served from a subdirectory, so the build needs a base path.
Both values are derived from the repository in the workflow, not hardcoded:

```bash
PUBLIC_SITE_URL=https://rexsimiloluwah.github.io \
PUBLIC_BASE_PATH=/marl-for-cooperative-environments \
  npm run build
```

Locally both default to a root deployment, so `npm run dev` has no prefix.

**Every internal path must go through the base.** There are two mechanisms and
between them they cover everything:

- Paths written by hand in a component use `withBase()` or `pageUrl()` from
  [src/lib/url.ts](src/lib/url.ts).
- Paths written in MDX prose are rewritten at build time by
  [src/lib/rehype-base-links.mjs](src/lib/rehype-base-links.mjs), so an author
  writes `/coordinate/lab/` and the base is added for them.

Anything that reads a pathname must strip the base first. `slugFromPath()` in
[src/lib/nav.ts](src/lib/nav.ts) does it, which is what keeps the sidebar's
current-page state, the breadcrumbs, the previous/next pager and the section
numbers working. That failure mode is silent, so **test a base build before
changing anything that touches URLs**:

```bash
PUBLIC_BASE_PATH=/marl-for-cooperative-environments npm run build
PUBLIC_BASE_PATH=/marl-for-cooperative-environments python3 scripts/qa/links.py
```

For a custom domain: add it in Settings → Pages, put a `CNAME` file in
`public/`, and set `PUBLIC_BASE_PATH` to `/` in the workflow. The prefix
disappears on its own.

`public/.nojekyll` is there so the `_astro/` asset directory survives if anyone
ever switches to branch-based Pages, where Jekyll would otherwise drop it.

## Verifying a change

```bash
npm run build                                   # site
python3 scripts/qa/links.py                     # every internal link resolves
npx tsc --noEmit -p .                           # types
cd cooperative-marl-labs && pytest && ruff check .
python3 scripts/notebooks/verify.py notebooks/*.ipynb
python3 scripts/docs/build_api_reference.py && git diff --exit-code -- src/content/docs/package
```

### Re-measuring the wireless numbers

Every wireless figure quoted on the website and in the notebook takeaways comes
from one script, over three training seeds:

```bash
python3 scripts/marl/measure_wireless.py     # writes wireless_measurements.json
```

The reward model determines all of them. **A change to the environment's
physics means re-running this and updating the lab pages**, not just bumping
the package version. Numbers in the written material are measurements, so they
have to move together with the code that produced them.

## Architecture notes

Decisions that are not obvious from the code.

**Markdown processor.** Astro 7 defaults to Sätteri, whose plugin API is
visitor-based and does not accept unified plugins such as `rehype-katex`.
`astro.config.mjs` therefore opts into `unified()` from
`@astrojs/markdown-remark`. Do not switch the processor without replacing the
maths pipeline.

**CSS layering.** All Starlight CSS ships inside `@layer starlight.*`.
Unlayered rules beat layered ones in the cascade regardless of specificity, and
every rule in `src/styles/` is unlayered. That is why no override needs
`!important`. Keep it that way.

**Astro scopes component styles with `:where()`**, which holds them at
single-class specificity. A global rule like `.sl-markdown-content p` is class
plus type and will beat a component's scoped rule. The fix is to double the
class (`.foo.foo`), not to reach for `!important`.

**Embedded UI needs `class="not-content"`.** Starlight's markdown stylesheet
inserts a margin between every pair of sibling block elements inside an
article, which silently wrecks any component that renders many small children.
Its `<summary>` rules also add a negative inline margin and a second marker,
which is why every `<details>`-based component carries the class.

**Component props never reach remark-math.** A prop is a plain string, so
`$x$` in a prop renders as literal dollar signs. Either use a slot, or render
at build time with `renderInlineMath()` from
[src/lib/equations/inline-math.ts](src/lib/equations/inline-math.ts).

**No UI framework.** No React, Svelte or Vue. Interactivity is custom elements
plus inline SVG, which keeps the page weight down and the components readable.

**Dark mode ships.** Define the full light palette on bare `:root`, then
redefine only the changed tokens under both
`@media (prefers-color-scheme: dark)` guarded as `:root:not([data-theme="light"])`
and `:root[data-theme="dark"]`, so the toggle wins in both directions. Never
give a colour its only definition inside a media query.

### Semantic colour

Colour carries meaning rather than decoration, and the same six tones are used
everywhere. Each has a saturated value for strokes, arrows and fills, a
darkened `-ink` value for small text (every one measured at 4.5:1 or better
against its own ground), and a pale tint for callout backgrounds.

| Tone | Means |
| --- | --- |
| `action` | actions, decisions, choices, attention |
| `observe` | observations, state, information the learner is given |
| `policy` | agents, policies, learned components |
| `comm` | messages, channels, information flow |
| `reward` | rewards, throughput, successful cooperation |
| `conflict` | interference, collisions, errors, failure |

Defined once in [src/styles/tokens.css](src/styles/tokens.css). The lab plots
use the same six, from
`cooperative_marl_labs.visualization.palette`, so a figure on the website and a
plot in a notebook agree about what a colour means.

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
positioned SVG; the engine handles only what LaTeX cannot, namely labels
outside the formula with drawn connectors.

Shared notation lives in
[src/lib/equations/notation.mjs](src/lib/equations/notation.mjs) and is imported
by both the Markdown pipeline and the components, so prose and figures cannot
drift into different symbols.

The build warns, rather than failing silently, when an annotation names a term
that no `\mark` produced, when a label runs long enough to crowd the figure,
and when an `underline` is requested above a term (where the rule reads as a
strikethrough). Treat those warnings as errors.

## In-browser Python

Exercises run Python in the reader's browser through Pyodide. Nothing is
downloaded until someone presses Run or Check, so a reader who never opens an
exercise never pays for the runtime.

By default the runtime is fetched from a CDN, which keeps this repository
small. For a classroom with no reliable internet, vendor it instead:

```bash
npm run vendor:pyodide                      # ~13 MB into public/pyodide/
PUBLIC_PYODIDE_BASE=/pyodide/ npm run build # fully self-contained
```

`public/pyodide/` is gitignored, so vendoring is opt-in and the default build
stays light.

**Checking runs tests, never a string comparison.** Each assertion carries a
`hint` explaining what it tests, shown when it fails. That hint is the point:
"Incorrect" teaches nothing.

## Repository layout

```
src/
  components/
    diagrams/      inline-SVG figures, including the chapter heroes
    equations/     Equation, EquationSequence
    labs/          the in-browser Coordinate virtual lab
    overrides/     Starlight component overrides
    ui/            Callout, Accordion, KnowledgeCheck, Objectives and friends
    worksheet/     Map/Calculate/Explore/Decide worksheet primitives
  content/docs/    every page (MDX)
  lib/equations/   annotation engine, shared notation
  lib/marl/        the Coordinate lab's learners, in TypeScript
  lib/nav.ts       the single source of truth for course structure
  styles/          tokens, editorial theme, maths, component primitives
cooperative-marl-labs/
  src/cooperative_marl_labs/   the installable lab package
  tests/                       its test suite
notebooks/         the three Colab labs, generated by scripts/notebooks/
public/images/     raster figures, shared with the notebooks
scripts/
  marl/            measurement and browser self-tests
  notebooks/       notebook build, normalize and verify
  qa/              internal-link audit
wireless_env/      legacy simulation, superseded by the lab package
```

## Writing conventions

- Say "this section", not "this page".
- No em dashes. Commas or full stops instead.
- Prefer bullet points to long paragraphs on overview pages.
- Every section opens with a question the reader can answer at the end, then
  its learning objectives as bullets.
- Important equations go in a titled Key Equation box with symbol definitions
  and one sentence of intuition. Reserve the box for equations worth
  remembering.
- Illustrations use the same kitchen world and the same agents throughout. No
  generic AI imagery, neural networks, floating equations, or robots with
  glowing brains.
- **Never invent a citation, and never invent a number.** If it has not been
  measured, do not give a figure. See Educational Integrity in the
  [README](README.md).
