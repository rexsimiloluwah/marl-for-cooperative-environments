# Teaching Materials: Links

Every teaching material in this submission, with a direct link. Everything is
open and needs no account, except Google Colab, which needs a free Google
sign-in to run a notebook (the notebooks can still be read without one).

**Resource website** ·
<https://rexsimiloluwah.github.io/marl-for-cooperative-environments/>

**Source repository** ·
<https://github.com/rexsimiloluwah/marl-for-cooperative-environments>

---

## 1. Interactive tutorial website

Structured, bite-sized lessons that develop each concept from intuition to
mathematics, with visualisations, worked examples, embedded knowledge checks
and connections to recent research.

| Part | Link |
| --- | --- |
| Start here | <https://rexsimiloluwah.github.io/marl-for-cooperative-environments/introduction/> |
| Background (nine sections) | <https://rexsimiloluwah.github.io/marl-for-cooperative-environments/background/dec-pomdp/> |
| Coordinate | <https://rexsimiloluwah.github.io/marl-for-cooperative-environments/coordinate/introduction/> |
| Communicate | <https://rexsimiloluwah.github.io/marl-for-cooperative-environments/communicate/introduction/> |
| Adapt | <https://rexsimiloluwah.github.io/marl-for-cooperative-environments/adapt/introduction/> |
| Frontier: LLMs as cooperative agents | <https://rexsimiloluwah.github.io/marl-for-cooperative-environments/frontier/llm-agents/> |
| Frontier: learning LLM collaboration | <https://rexsimiloluwah.github.io/marl-for-cooperative-environments/frontier/learning-llm-collaboration/> |
| Learning objectives | <https://rexsimiloluwah.github.io/marl-for-cooperative-environments/learning-objectives/> |

## 2. Explainer videos

Two narrated, fully animated explainers. Both are built with Remotion, so every
frame is code and both are reproducible from `code/video/`.

| Video | Length | In this archive |
| --- | --- | --- |
| Multi-Agent Reinforcement Learning in Cooperative Environments | 19:38 | `videos/marl-core-explainer.mp4` |
| LLMs as Cooperative Agents | 13:32 | `videos/llms-as-cooperative-agents.mp4` |

The copies here are compressed to fit the archive size limit. To rebuild either
at full quality from source:

```bash
cd code/video && npm install
npm run narration     && npm run render      # the core explainer
npm run narration:llm && npm run render:llm  # the frontier explainer
```

## 3. Interactive practice

| Material | Link |
| --- | --- |
| Flashcards (45 cards, five decks) | <https://rexsimiloluwah.github.io/marl-for-cooperative-environments/resources/flashcards/> |
| Knowledge checks | <https://rexsimiloluwah.github.io/marl-for-cooperative-environments/resources/knowledge-checks/> |
| Worksheets | <https://rexsimiloluwah.github.io/marl-for-cooperative-environments/resources/worksheets/> |

## 4. Labs

| Lab | Link |
| --- | --- |
| Virtual coordination lab (in-browser) | <https://rexsimiloluwah.github.io/marl-for-cooperative-environments/lab/overview/> |
| Notebook index | <https://rexsimiloluwah.github.io/marl-for-cooperative-environments/resources/notebooks/> |
| Learning to communicate (Colab) | `code/notebooks/01_communicate.ipynb` |
| Cooperating with unseen partners (Colab) | `code/notebooks/02_adapt.ipynb` |
| Wireless network resource allocation (Colab) | `code/notebooks/wireless_network_resource_allocation_marl_lab.ipynb` |

## 5. Final project

Design and justify a cooperative multi-agent disaster-response system, together
with the evaluation that could show it does not work.

<https://rexsimiloluwah.github.io/marl-for-cooperative-environments/project/brief/>

## 6. Python package: `cooperative-marl-labs`

Reusable environments, agents, partner policies, training utilities, evaluation
tools and visualisations used throughout the practical activities.

| | |
| --- | --- |
| PyPI | <https://pypi.org/project/cooperative-marl-labs/> |
| Install | `pip install cooperative-marl-labs` |
| API reference | <https://rexsimiloluwah.github.io/marl-for-cooperative-environments/package/overview/> |
| Source in this archive | `code/cooperative-marl-labs/` |

## 7. References

Primary papers and textbooks cited by the resource, grouped by the concept they
support.

<https://rexsimiloluwah.github.io/marl-for-cooperative-environments/resources/references/>

---

## What is in this archive

```
code/       all source: website, Python package, notebooks, video project
videos/     the two explainer videos, compressed
paper/      the two-page submission PDF and its LaTeX source
LINKS.md    this file
LICENSE
```

To run the website locally:

```bash
cd code && npm install && npm run dev
```

To run the package tests:

```bash
cd code/cooperative-marl-labs && pip install -e ".[dev,learning]" && pytest -q
```
