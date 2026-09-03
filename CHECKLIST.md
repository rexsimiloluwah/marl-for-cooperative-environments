# MARL Cooperative Environments: build checklist

NeurIPS 2026 Education Track submission. Spec lives in MASTER_PROMPT.md.

**Locked decisions**
- [x] Use Astro + Starlight as the site base with heavy CSS override
- [x] Use the styling brief palette, not the purple/yellow in MASTER_PROMPT.md
- [x] Apply that palette across site, Manim, Quarto slides, and Three.js lab
- [x] Keep wireless physics as pure functions so the Three.js port is 1:1
- [x] Follow the uploaded mockup for visuals and the typed tree for structure
- [x] Ship dark mode, reversing the earlier light-only decision (mockup shows a toggle)
- [x] Separate UI blue for chrome from the six semantic accents for meaning
- [x] Keep the course structure only in src/lib/nav.ts, Starlight sidebar left empty
- [x] Aim the resource at LEARNERS, not instructors
- [x] Drop the instructor guide and add worksheets in its place, a deliberate
      departure from deliverable 7 of MASTER_PROMPT.md
- [x] Close each chapter with a worksheet, numbered as part of that chapter

**UI rebuild (from the mockup)**
- [x] Restructure IA to 51 pages across 8 sections including a Background chapter
- [x] Derive section numbers from position, never authored by hand
- [x] Build the icon set, sidebar, header, theme toggle, breadcrumbs, page actions
- [x] Build the progress tracker, pinned so it survives a 51-page sidebar
- [x] Build the Related panel from authored frontmatter, not inferred
- [x] Build previous/next from the reading order in nav.ts
- [x] Build Callout, Term and ChannelChoice content components
- [x] Write 2.1 end to end as the reference content page
- [x] Verify light and dark, and that every semantic accent stays readable in both
- [x] Build the landing page: hero, learning journey, challenge lab, project, resources
- [x] Draw hero and wireless illustrations as inline SVG, no external assets
- [x] Make primary buttons blue, keeping orange for attention inside content
- [x] Redraw both illustrations as true isometric with three tonal steps per form
- [x] Add --iso-* shading tokens as fixed alphas, so shading does not invert in dark
- [x] Rewrite the landing Resources section as six learner-facing entries

**Phase 1 scaffold**
- [x] Init Astro + Starlight with TypeScript, commit lockfile
- [x] Configure top nav (7 items) and sidebar (Modules 0 to 5)
- [x] Wire KaTeX through remark-math and rehype-katex

**Phase 1 design system**
- [x] Define tokens: #F3F3F4 ground, #191919 ink, 6 semantic accents, 6 pale tints
- [x] Set type scale, 780px article measure, override Starlight chrome to editorial layout

**Phase 1 equation components**
- [x] Build EquationAnnotation primitives: arrow, brace, underline, spatial label
- [x] Reproduce the annotated SFT loss as the reference fixture for the API

**Phase 1 notes**
- [x] Use the unified processor, not Astro 7's default Satteri (visitor plugin API rejects rehype-katex)
- [x] Tag terms with the `\mark{key}{...}` KaTeX macro, measure in-browser, no hand coordinates
- [x] Leave braces to LaTeX `\underbrace`; engine handles only external labels
- [x] Spread labels horizontally before stacking into lanes
- [x] Verify at a true 390px viewport via iframe (headless Chrome clamps windows to 500px)

**Phase 2 exercise runtime**
- [ ] Lazy-load Pyodide in a web worker with visible load state
- [ ] Build CodeExercise with Run, Check, Hint, Solution, Reset and test-based grading

**Phase 2 notes**
- [x] Test-based grading, never string comparison of source
- [x] Every assertion carries an author-written hint, shown on failure
- [x] Fresh Python namespace per run, so an earlier attempt cannot satisfy a later check
- [x] Timeouts terminate and respawn the worker (no SharedArrayBuffer, so no interrupt buffer)
- [x] Add `not-content` to embedded UI, or Starlight's markdown rule spaces every child

**Phase 1 and 2 QA**
- [x] Verify mobile reflow, keyboard focus, reduced motion on a sample page

**Phase map**
- [x] Phase 0 landing page and UI shell (added after the mockup redirect)
- [x] Phase 1 website foundation
- [x] Phase 2 exercise runtime
- [x] Phase 3 introduction and RL refresher
- [x] Phase 4 Coordinate chapter (quality benchmark, gates phases 5 and 9)
- [x] Phase 5 Communicate and Adapt chapters
- [x] Phase 6 Python wireless environment (runs parallel to phases 1 to 5)
- [ ] Phase 7 wireless bridge and Three.js lab
- [x] Phase 8 notebooks (01 communicate, 02 adapt, wireless network resource allocation; structure and execution verified)
- [ ] Phase 9 Manim storyboards and videos
- [ ] Phase 10 slides, final project, worksheets
- [ ] Phase 11 polish: accessibility, citations, mobile, performance, proofread

**Phase 1 follow-ups**
- [ ] Tighten the stepper control row on narrow viewports, it wraps awkwardly
- [x] Add a 404 page, Starlight logs a missing custom one
- [ ] Decide whether `overflow-x: clip` on html/body stays, it masks real overflow
- [ ] Re-verify the annotated-equation gallery under the new shell and dark mode
- [x] Set REPO_EDIT_BASE in PageActions once the repository URL exists
- [ ] Decide whether to vendor Pyodide in CI so the deployed site works offline
- [ ] Audit remaining components for the `.sl-markdown-content p` specificity trap
- [ ] Re-check mobile at 390px now that the shell has changed
- [ ] Replace the 54 remaining stub pages with real content
- [ ] Write the worksheet hub page (the three chapter worksheets are done)
- [ ] Decide whether the Lab also closes with a worksheet
- [ ] Decide whether lecture slides stay a deliverable now that the audience is learners
- [x] Set the site URL in astro.config.mjs; it is still the example.org placeholder

**Phase 6 findings to teach**
- [ ] Use greedy-local being worse than random in Chapter 1, determinism synchronizes the herd
- [ ] Use mean(Jain(x_t)) not equal to Jain(mean(x_t)) as a measurement trap in Chapter 3
- [ ] Port physics.py to TypeScript against fixtures/test_vectors.json for the lab

**Confirm before submission**
- [ ] Verify every research claim traces to a real cited paper
- [ ] Verify no synthetic number is presented as a measured result

**House conventions (do not re-litigate)**
- [x] For every Google Colab lab, use the official Colab badge, never a custom
      site button. Image is https://colab.research.google.com/assets/colab-badge.svg,
      link target is the notebook's Colab URL. Keep it at its natural 117x20
      proportions and do not restyle it into site chrome: instant recognition is
      the whole point of using Google's artwork.
- [x] Badge goes near the top of a lab page, immediately after the overview, and
      again near the end where the learner is ready to run it. Rendered by
      NotebookLink.astro, with `compact` for the repeat placement.
- [x] Every notebook also carries the same badge as its first cell, so it works
      when opened from GitHub rather than from the site.
- [x] Build notebook and repository URLs from src/lib/site.ts. Nothing hardcodes
      the repo, and an unset REPO_BASE degrades to a local instruction rather
      than emitting a link that 404s.
- [x] Component props are plain strings and never reach remark-math, so `$...$`
      in a prop renders as literal dollars. Use a slot, or render it through
      src/lib/equations/inline-math.ts where a slot is not possible.
- [x] Worksheets follow Map, Calculate, Explore, Decide. Five blocks, about
      fifteen minutes, mostly auto-checkable, one free-text question at the end,
      and one answer key at the foot of the page rather than per question.
- [x] Every number quoted on a page must come from code in this repository, and
      the page must say so. Illustrative values are labelled illustrative.
- [x] Use em dashes sparingly.

**Gotchas that cost time (do not rediscover)**
- [x] Restart the dev server after adding a content page, or it 404s despite building
- [x] Never put \ubrace/\obrace inside \left...\right; it stretches the delimiter
- [x] Keep brace labels under ~28 chars, or they pad the equation with whitespace
- [x] Embedded UI needs class="not-content" or Starlight spaces every child
- [x] Astro scopes CSS with :where(), so `.sl-markdown-content p` outranks component rules

**Verified citations (section 1.1)**
- [x] Mnih et al., Nature 2015 — DOI 10.1038/nature14236, confirmed via Crossref
- [x] Silver et al., Nature 2016 — DOI 10.1038/nature16961, confirmed via Crossref
- [x] Vinyals et al., Nature 2019 — DOI 10.1038/s41586-019-1724-z, confirmed via Crossref
- [x] Kalashnikov et al. 2018 — arXiv 1806.10293, "over 580k" grasps confirmed at source
- [x] Morales, Grokking Deep RL — Manning, October 2020, confirmed on publisher page
- [x] Sutton and Barto 2nd ed, MIT Press 2018 — standard, free draft hosted by the authors
- [x] Lapan, Deep RL Hands-On — Packt, multiple editions, no edition asserted

## Chapter introductions and section framing

- [x] Chapter introduction pages for Coordinate, Communicate and Adapt, first page of each chapter
- [x] One hero illustration per chapter, same kitchen world, `ChapterHero.astro`
- [x] Conceptual progression strip per chapter, `Progression.astro`, plus the adaptation loop
- [x] Opening-question callout on all 38 lesson sections
- [x] Bulleted learning objectives on all 38 lesson sections, `Objectives.astro`
- [x] "this page" replaced with "this section" throughout the content
- [x] Background section 9 restored, it is the only transition section in the resource
- [x] `favicon.svg`, every page was 404ing on it
- [x] `scripts/qa/links.py`, audits every internal link in the built site
- [x] `scripts/notebooks/normalize.py`, cleared outputs and line-list sources
- [x] `IconName` in nav.ts synced with the icons Icon.astro actually defines
- [x] Chapter overview bullets use `**Term:** description` on one line
- [x] Challenge lab renamed `wireless_network_resource_allocation_marl_lab.ipynb`
- [x] Network illustration on the website too, one shared path under `public/images/`
- [x] Network illustration in the challenge lab, PNG requantized 1133 KB to 504 KB

## Still open before submission

- [ ] Set the real host in `astro.config.mjs` (`site`, plus `base` if GitHub Pages)
- [ ] Fill the three remaining Resources stubs: Knowledge Checks, All Worksheets, References
- [ ] First commit and push to `rexsimiloluwah/marl-for-cooperative-environments`
- [ ] Notebook `git clone` and the challenge lab illustration only resolve once the repository has content pushed
- [ ] Decide whether `01_communicate` and `02_adapt` drop their number prefixes too

## The cooperative-marl-labs package

- [x] src-layout package at `cooperative-marl-labs/`, name `cooperative-marl-labs`, import `cooperative_marl_labs`
- [x] `pyproject.toml` with PEP 639 licence metadata, `[learning]` and `[dev]` extras
- [x] Three environments, all passing `pettingzoo.test.parallel_api_test`
- [x] Wireless env rebuilt to spec: fixed 2D positions, distance-based coupling, `interference_weight`, `communication_weight`, per-agent channel quality
- [x] `extract_demand` / `extract_channel_quality` / `extract_interference` / `extract_previous_channel`
- [x] Partner policies as classes with seeded generators; fixed an unseeded `HeldOutPartner`
- [x] `train_independent_q_learning`, `train_vdn`, `train_communication_agents`
- [x] `evaluate_agents` returns the documented metric keys and converts to pandas
- [x] `plot_protocol_heatmap`, `plot_crossplay_matrix`, `plot_partner_estimate`, `render_wireless_network`, `plot_wireless_comparison`
- [x] PyTorch imported lazily, so the base install needs no torch and import stays at 1.4 ms
- [x] 92 tests: API, physics, interventions, seeds, evaluation, every public import, every README block
- [x] ruff clean, `python -m build` clean, `twine check` passes
- [x] Wheel installed into a fresh environment and every documented import checked
- [x] `README.md` and `PUBLISHING.md` written; GitHub Actions runs tests and builds, and does NOT publish
- [x] Old `marl_labs/` and root `tests/` removed, notebooks and verifier repointed
- [x] `resources/python-package` page on the website
- [ ] Confirm `cooperative-marl-labs` is still free on PyPI, then publish (see PUBLISHING.md)

## Wireless numbers re-measured after the physics change

- [x] `scripts/marl/measure_wireless.py`, three training seeds, writes `wireless_measurements.json`
- [x] Every wireless figure on the site replaced with the measured value
- [x] `lab/challenge` rewritten: its previous narrative was contradicted by measurement
- [x] `lab/environment` rewritten for distance-based coupling and the three traffic regimes
- [x] Corrected a table where I had attributed a difference to distance when the driver was demand
- [x] Corrected "the best system had the largest drop" in `project/rubric` and `project/evaluation`
- [ ] Decide whether `wireless_env/` goes: superseded, unreferenced, 225 tests still pass

## START HERE section

- [x] `introduction` rewritten: why cooperative MARL, the three chapters, the learning journey
- [x] `prerequisites` rewritten: maths, Python, RL, Colab, each with a review resource
- [x] `learning-objectives` rewritten with the Bloom progression made explicit per section
- [x] `how-to-use` rewritten as a route map with the per-chapter rhythm
- [x] `tutorial-structure` rewritten compact: one accordion per section, question plus main ideas
- [x] `Accordion` and `AccordionGroup` components, native `<details>`, no JavaScript
- [x] `CooperativeOverview` illustration on the Introduction, same kitchen as the chapter heroes
- [x] Every section and chapter link on these pages resolves

