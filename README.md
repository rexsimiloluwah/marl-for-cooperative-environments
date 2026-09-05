# Multi-Agent Reinforcement Learning in Cooperative Environments

**How agents coordinate, communicate, and adapt when partners, communication
conventions, or deployment conditions differ from training**

![Multi-Agent Reinforcement Learning in Cooperative Environments. Two robots draw back a stage curtain on scenes of cooperating drones, warehouse robots, connected vehicles, and wireless access points.](public/images/cover-image.png)

In multi-agent reinforcement learning (MARL), where multiple agents learn to
act toward a shared goal, **generalizable cooperation** asks whether effective
teamwork can persist when partners, communication conventions, or deployment
conditions differ from training.

## What Inspired This?

I built this because I wanted to study cooperative MARL seriously, but the
learning path felt scattered across papers, codebases, surveys, and benchmarks.
The field is exciting, yet it was hard to find one structured, comprehensive
resource that moved from foundations to research intuition. This is the guide I
wished I had while trying to become research-ready.

## Why This Resource?

Many AI systems are moving from single decision-makers toward teams. In those
teams, being individually capable is not enough. Agents may need to:

- **Coordinate** their actions.
- **Communicate** useful information.
- **Adapt** when other agents or conditions change.

The resource teaches the MARL foundations needed to understand that emerging
problem, then builds toward current research on learned communication,
zero-shot coordination, ad hoc teamwork, and multi-LLM collaboration.

## Who Is This Designed For?

- **Researchers** entering cooperative MARL, or wanting a grounded refresher on
  coordination, communication, and partner generalization.
- **Lecturers teaching a MARL course**, who need chapters, worksheets, labs, and
  knowledge checks that can be used directly or adapted.
- **Anyone curious about multi-agent reinforcement learning**, with a basic
  foundation in Python and single-agent RL.

Suitable for **undergraduate and graduate levels**. Every practical activity
runs on a laptop or a free Colab CPU session.

## Learning Journey

![The learning journey in five stages. One agent learns a goal; two agents must coordinate their actions; agents with different information must communicate; agents must adapt to unfamiliar partners; and finally, multiple LLM agents must learn to work together.](public/images/learning-journey.png)

**Background → Coordinate → Communicate → Adapt → LLM Frontier → Challenge Lab → Final Project**

- **Background:** What changes when reinforcement learning moves from one agent
  to many?
- **Chapter 1: Coordinate:** How can agents learn actions that work well
  together?
- **Chapter 2: Communicate:** What information should agents share when they
  know different things?
- **Chapter 3: Adapt:** Can agents still cooperate when the other agents change?
- **Frontier:** What changes when the cooperating agents are language models?

## Educational Resources

Ten parts, each expandable.

<details>
<summary><strong>Interactive Tutorial Website</strong></summary>
<br>

A structured, markdown-first tutorial that develops the foundations of
cooperative MARL as preparation for generalizable cooperation. Concepts are
introduced intuitively before moving to formal definitions, equations, and
research connections.

Nine background sections, then three chapters:
[Coordinate](https://rexsimiloluwah.github.io/marl-for-cooperative-environments/coordinate/introduction/),
[Communicate](https://rexsimiloluwah.github.io/marl-for-cooperative-environments/communicate/introduction/),
[Adapt](https://rexsimiloluwah.github.io/marl-for-cooperative-environments/adapt/introduction/), and a closing chapter on the frontier.

</details>

<details>
<summary><strong>Virtual Lab</strong></summary>
<br>

A browser-based lab where learners experiment with joint actions, independent
learning, and value decomposition, and observe how different training
approaches affect coordinated behaviour.

Nothing to install and nothing to open: it runs in the page.

[Open the virtual lab](https://rexsimiloluwah.github.io/marl-for-cooperative-environments/coordinate/lab/)

</details>

<details>
<summary><strong>Google Colab Labs</strong></summary>
<br>

Guided practical labs where learners complete small pieces of code, run
experiments, visualize learned behaviour, and interpret the results.

**Learning a Communication Protocol.** Train speaker-listener agents, inspect
the learned protocol, and test communication capacity, noise, and protocol
mismatch. &nbsp;[`01_communicate.ipynb`](notebooks/01_communicate.ipynb)

**Cooperating with Unseen Partners.** Compare familiar-partner and cross-play
performance, train with diverse partners, build a simple partner model, and
observe adaptation when partner behaviour changes.
&nbsp;[`02_adapt.ipynb`](notebooks/02_adapt.ipynb)

Every exercise is marked `# TODO`, and completed code sits in a Solutions
section at the end. Interpretation and design questions are deliberately left
unanswered.

</details>

<details>
<summary><strong>Interactive Flashcards</strong></summary>
<br>

Retrieval practice for the key concepts, equations, and intuitions. 45 cards
across five decks: Background, Coordinate, Communicate, Adapt, and the LLM
frontier.

Each deck shows every card at once. Reveal one at a time to test yourself, or
reveal the whole deck and use it as a revision sheet. Search and filter by card
type make it usable as a reference as well as a quiz.

No timers, streaks or scores. Read the question, retrieve the answer, reveal.

[All decks](https://rexsimiloluwah.github.io/marl-for-cooperative-environments/resources/flashcards/)

</details>

<details>
<summary><strong>Embedded Knowledge Checks</strong></summary>
<br>

Short questions throughout the tutorial that ask learners to predict outcomes,
test conceptual understanding, and receive immediate feedback.

Every option carries its own explanation, including the wrong ones, so a
mistaken answer teaches something rather than just scoring zero.

[All knowledge checks](https://rexsimiloluwah.github.io/marl-for-cooperative-environments/resources/knowledge-checks/)

</details>

<details>
<summary><strong>Digital Worksheets</strong></summary>
<br>

Concise chapter activities that combine concept matching, calculations,
interactive exploration, and short design trade-offs.

Each one follows the same shape, **Map, Calculate, Explore, Decide**, takes
about 15 to 20 minutes, and is mostly self-checking with a single free-text
question at the end.

[All worksheets](https://rexsimiloluwah.github.io/marl-for-cooperative-environments/resources/worksheets/)

</details>

<details>
<summary><strong>Challenge Lab: Wireless Network Resource Allocation using MARL</strong></summary>
<br>

A hands-on integration challenge where learners combine coordination,
communication, and adaptation to manage channel allocation, interference,
changing traffic conditions, and unfamiliar access-point behaviour.

The transfer task: the problem is stated in its own vocabulary and nobody maps
the concepts back to the chapters for you.

[Challenge Lab overview](https://rexsimiloluwah.github.io/marl-for-cooperative-environments/lab/overview/) &nbsp;·&nbsp;
[`wireless_network_resource_allocation_marl_lab.ipynb`](notebooks/wireless_network_resource_allocation_marl_lab.ipynb)

</details>

<details>
<summary><strong>Final Project: Design a MARL-Based Disaster-Response System</strong></summary>
<br>

A create-level project where learners design a complete cooperative MARL
system, including its agents, observations, actions, shared objective,
coordination strategy, communication design, adaptation mechanism, and
evaluation plan.

Nobody supplies the environment this time.

[Project brief](https://rexsimiloluwah.github.io/marl-for-cooperative-environments/project/brief/)

</details>

<details>
<summary><strong><code>cooperative-marl-labs</code> Python Package</strong></summary>
<br>

A lightweight package containing the environments, agents, partner policies,
training utilities, evaluation tools, and visualizations used in the Colab
labs.

```bash
pip install cooperative-marl-labs
```

Three PettingZoo `ParallelEnv` environments, tabular agents, scripted partners,
training loops, seeded evaluation, and plots. PyTorch is an optional extra.

[API reference](https://rexsimiloluwah.github.io/marl-for-cooperative-environments/package/overview/) &nbsp;·&nbsp;
[Source](cooperative-marl-labs/) &nbsp;·&nbsp;
[Package README](cooperative-marl-labs/README.md)

</details>

<details>
<summary><strong>Two Animated Explainer Videos</strong></summary>
<br>

- [An Intro to Multi-Agent Reinforcement Learning in Cooperative Environments](https://www.youtube.com/watch?v=TOJrFLJHXkM) (19:38)
- [When LLM Agents Work Together: Cooperative Multi-Agent Reinforcement Learning Meets Language Models](https://www.youtube.com/watch?v=P5OAe5XLmzc) (13:32)

</details>

## Learning Objectives

By the end of the resource, learners should be able to:

- formulate cooperative MARL problems;
- explain coordination, communication, and adaptation challenges;
- compare approaches for learning cooperative behaviour;
- analyse multi-agent behaviour through experiments;
- evaluate cooperation under unfamiliar partners and changing conditions;
- connect generalizable cooperation to recent work on learned communication,
  zero-shot coordination, ad hoc teamwork, and multi-LLM collaboration;
- design and justify a cooperative MARL system.

The learning activities progress through Bloom's Taxonomy:

**Remember → Understand → Apply → Analyse → Evaluate → Create**

## Quick Start

### Run the Tutorial

```bash
git clone https://github.com/rexsimiloluwah/marl-for-cooperative-environments
cd marl-for-cooperative-environments
npm install
npm run dev
```

Then open <http://localhost:4321>.

### Install the Lab Package

```bash
pip install cooperative-marl-labs
```

Example:

```python
from cooperative_marl_labs.envs import WirelessResourceAllocationEnv

env = WirelessResourceAllocationEnv(
    n_agents=4,
    n_channels=3,
)

observations, infos = env.reset(seed=42)
env.render()
```

The practical labs are designed to run without a GPU.

## AI Usage and Educational Integrity

- **AI-assisted development:** Generative AI tools were used to support parts of
  the writing, coding, visual design, and iteration of this resource. All
  educational content and technical claims were reviewed before inclusion.

- **Designed for learning:** Examples, environments, and simplified scenarios
  are created for learning and educational purposes. They are intended to build
  intuition and support experimentation, not to represent production systems or
  research benchmarks.

- **Reproducible teaching experiments:** Measured results in the Challenge Lab
  come from the provided experiment scripts and are averaged across multiple
  training seeds. The environments are designed for teaching, not as research
  benchmarks, and are described accordingly.

## Contributing

Reviews, corrections, feedback, and contributions that improve the technical
accuracy, accessibility, or educational quality of the resource are welcome.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines, the
repository layout, and how to build and verify each part.

## Citation

If you use this resource in teaching or research, please cite:

```bibtex
@misc{okunowo2026cooperativemarl,
  title  = {Multi-Agent Reinforcement Learning in Cooperative Environments},
  author = {Okunowo, Similoluwa},
  year   = {2026},
  url    = {https://github.com/rexsimiloluwah/marl-for-cooperative-environments}
}
```

## License

Code and educational content are licensed separately, which is the usual split
for a teaching resource.

- **Code** is under the **Apache License 2.0**: the `cooperative-marl-labs`
  package, the website source, the notebooks, and the video project. See
  [LICENSE](LICENSE).
- **Educational content** is under **CC BY 4.0**: the written lessons,
  worksheets, flashcards, knowledge checks, diagrams, narration scripts, and
  the two explainer videos. See [LICENSE-CONTENT](LICENSE-CONTENT).

Both permit reuse and adaptation, including commercially, with attribution.
