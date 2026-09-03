You are building a complete educational resource for a NeurIPS 2026 Education Track submission.

This must be a polished, technically accurate, self-contained educational package suitable for actual teaching.

It is NOT a prototype landing page.
It is NOT a MARL algorithm survey.
It is NOT a research dashboard.
It is NOT a collection of disconnected demos.

It should feel like a modern interactive undergraduate technical textbook with:
- clear explanations
- strong visual pedagogy
- executable code
- interactive experiments
- formal mathematics
- research connections
- hands-on implementation
- a realistic final design project

==================================================
PROJECT TITLE
==================================================

Multi-Agent Reinforcement Learning for Cooperative Environments

Subtitle:

Learning to Coordinate, Communicate, and Adapt

==================================================
CORE EDUCATIONAL STORY
==================================================

The entire resource should answer three progressively harder questions:

1. COORDINATE

How do multiple agents learn to work toward one goal?

2. COMMUNICATE

What should agents tell each other when they see different things?

3. ADAPT

Can agents cooperate when the environment or their teammates change?

The conceptual progression is:

Coordinate
→ Communicate
→ Adapt

Do NOT build a disconnected survey of:
- VDN
- QMIX
- MAPPO
- COMA
- MADDPG
- etc.

Algorithms should only be introduced when they solve a pedagogical problem that the learner has already encountered.

For example:

Independent agents struggle because other agents are learning too
→ motivate centralized training with decentralized execution.

Agents know different things
→ motivate communication.

Agents perform well only with familiar partners/configurations
→ motivate teammate diversity, ad hoc teamwork, and zero-shot coordination.

==================================================
AUDIENCE
==================================================

This resource is designed primarily for:

UNDERGRADUATE STUDENTS TAKING A COURSE IN
MULTI-AGENT REINFORCEMENT LEARNING.

The expected learner is approximately:

- advanced undergraduate computer science student
- artificial intelligence student
- data science student
- electrical/electronic engineering student
- robotics student
- or student in a related quantitative programme

Assume learners are technically capable but are encountering MARL formally for the first time.

The resource should NOT assume prior expertise in:

- multi-agent reinforcement learning
- game theory
- wireless communications
- telecommunications engineering
- distributed systems
- network optimization

The wireless network allocation system is an APPLICATION of MARL.

Do not require learners to already understand wireless networks.

Introduce only the minimum wireless concepts necessary to understand the allocation problem.

The tone should be:

- rigorous
- accessible
- mathematically clear
- undergraduate-friendly
- visually explanatory
- concise where possible
- never patronizing
- not overloaded with research jargon

==================================================
PREREQUISITES
==================================================

State prerequisites clearly on the Introduction page.

REQUIRED

Learners should be comfortable with:

1. Python fundamentals

- variables
- functions
- loops
- lists/dictionaries
- NumPy arrays
- reading short Python programs

2. Basic probability

- probability distributions
- expectation
- conditional probability at an intuitive level

3. Basic machine learning

- training vs inference
- objectives/losses
- basic neural network intuition

4. Introductory reinforcement learning

Learners should know or be able to quickly review:

- agent
- environment
- state
- observation
- action
- reward
- policy
- episode
- return

DO NOT REQUIRE

- advanced calculus
- advanced game theory
- equilibrium analysis
- measure-theoretic probability
- wireless communications expertise
- networking expertise
- prior MARL coursework

==================================================
OPTIONAL RL REFRESHER
==================================================

Include a concise optional section:

“Need an RL refresher?”

Target:
10–15 minutes.

Do NOT turn this into another complete RL course.

Review:

state / observation
        ↓
      policy
        ↓
      action
        ↓
   environment
        ↓
      reward
        ↺

Introduce:

π(a | s)

and expected return at an intuitive level.

Use a tiny interactive single-agent example.

Then ask:

“What changes when we add another learning agent?”

This should transition directly into MARL.

==================================================
LEARNING OBJECTIVES
==================================================

State these prominently.

By the end of the resource, students should be able to:

1. Explain how cooperative MARL differs from single-agent RL.

2. Represent a cooperative multi-agent problem using:
   - agents
   - observations
   - states
   - joint actions
   - rewards
   - policies

3. Explain why partial observability and non-stationarity make independent multi-agent learning difficult.

4. Explain the motivation behind centralized training with decentralized execution.

5. Analyse when communication can improve coordination.

6. Reason about communication bandwidth, communication cost, and message interpretability.

7. Explain why strong performance with familiar teammates does not imply general cooperative ability.

8. Evaluate agents under unseen teammates, environments, and deployment conditions.

9. Implement small MARL components in Python.

10. Run experiments and interpret their results.

11. Apply MARL concepts to a cooperative wireless resource-allocation problem.

12. Compare policies using throughput, fairness, interference, communication overhead, robustness, and generalization.

13. Design and justify a cooperative multi-agent resource-allocation system.

==================================================
BLOOM’S TAXONOMY
==================================================

The resource must deliberately evolve through:

Remember
→ Understand
→ Apply
→ Analyse
→ Evaluate
→ Create

Map activities explicitly.

REMEMBER

Learners identify and recall:

- agent
- state
- observation
- joint action
- shared reward
- partial observability
- decentralized policy
- CTDE
- communication channel
- bandwidth
- zero-shot coordination
- ad hoc teamwork

UNDERSTAND

Learners explain:

- why shared objectives do not automatically produce coordination
- why agents make one another’s learning environment non-stationary
- why partial observations create information problems
- why communication can help
- why more communication is not always better
- why agents can overfit to teammates or configurations

APPLY

Learners:

- complete small Python functions
- manipulate observations
- change reward structures
- change channels
- change transmit power
- enable/disable communication
- adjust bandwidth
- change communication cost
- run policies
- test deployment shifts

ANALYSE

Learners:

- compare trajectories
- inspect policy behavior
- inspect communication
- compare throughput/fairness/interference
- analyse generalization matrices
- identify failure modes
- interpret learning curves

EVALUATE

Learners:

- compare competing policies
- judge throughput vs fairness trade-offs
- judge communication cost vs benefit
- assess robustness
- select a policy for deployment using evidence

CREATE

Learners:

- design or modify a cooperative wireless allocation system
- choose observations
- choose actions
- design reward
- design communication
- choose training conditions
- define evaluation protocol
- justify deployment decisions

Show this progression on:

- Introduction
- About page
- instructor guide
- final project rubric

==================================================
LEARNING MODEL
==================================================

The website is NOT something students merely read.

Students should repeatedly move through:

READ
→ PREDICT
→ CODE
→ RUN
→ INSPECT
→ EXPLAIN

Then:

EXPERIMENT
→ ANALYSE
→ EVALUATE
→ DESIGN

Use active learning throughout.

A typical learning sequence should feel like:

QUESTION

↓

INTUITION

↓

VISUAL EXPLANATION

↓

ANNOTATED EQUATION

↓

PREDICT

↓

SMALL CODE EXERCISE

[ Run ]
[ Check Answer ]

↓

INTERACTIVE EXPERIMENT

↓

WHAT HAPPENED?

↓

RESEARCH CONNECTION

↓

KNOWLEDGE CHECK

Do not mechanically repeat this structure every time.

Vary naturally.

==================================================
FINAL DELIVERABLES
==================================================

The repository must contain:

1. Interactive technical textbook website

2. Three.js Cooperative Wireless Resource Allocation Lab

3. Three hands-on Python notebooks

4. Three short Manim explainer videos

5. Visual Quarto RevealJS lecture slides

6. Final wireless resource-allocation project

7. Instructor guide

8. README with complete setup/build/render instructions

9. Tests for the wireless environment

10. Reusable in-browser coding exercise infrastructure

The separate NeurIPS 2-page submission PDF will be created later.

The flagship interactive artifact is:

COOPERATIVE WIRELESS RESOURCE ALLOCATION LAB

==================================================
TECHNOLOGY STACK
==================================================

WEBSITE

- Astro
- Starlight or another clean documentation-first Astro architecture
- Markdown / MDX
- TypeScript
- KaTeX or MathJax
- custom SVG diagrams
- lightweight interactive islands
- Three.js for wireless lab
- localStorage for progress where useful
- no backend required

IN-BROWSER PYTHON

Prefer:
- Pyodide

Use it for small educational Python exercises.

Lazy-load Python only when needed.

Do NOT use Pyodide for heavy MARL training.

NOTEBOOKS

- Python
- NumPy
- Matplotlib
- Gymnasium/PettingZoo-style API where useful
- PyTorch only when necessary
- runnable on free/modest Colab hardware

SLIDES

- Quarto
- RevealJS

VIDEOS

- Manim Community Edition
- target stable/current ManimCE API
- Python source committed
- MathTex / Tex for equations
- reusable visual primitives

==================================================
REPOSITORY STRUCTURE
==================================================

Use approximately:

marl-cooperative-learning/
├── astro.config.mjs
├── package.json
├── README.md
├── src/
│   ├── content/
│   │   ├── docs/
│   │   │   ├── introduction.mdx
│   │   │   ├── rl-refresher.mdx
│   │   │   ├── chapters/
│   │   │   │   ├── coordinate.mdx
│   │   │   │   ├── communicate.mdx
│   │   │   │   └── adapt.mdx
│   │   │   ├── wireless-lab.mdx
│   │   │   ├── knowledge-checks.mdx
│   │   │   ├── project.mdx
│   │   │   ├── resources.mdx
│   │   │   └── about.mdx
│   │   └── exercises/
│   │       ├── coordinate/
│   │       ├── communicate/
│   │       ├── adapt/
│   │       └── wireless/
│   ├── components/
│   │   ├── equations/
│   │   │   ├── EquationAnnotation.*
│   │   │   ├── EquationArrow.*
│   │   │   ├── EquationBrace.*
│   │   │   ├── EquationLabel.*
│   │   │   └── EquationSequence.*
│   │   ├── diagrams/
│   │   ├── interactions/
│   │   ├── code/
│   │   │   ├── CodeExercise.*
│   │   │   ├── CodeEditor.*
│   │   │   ├── PythonRunner.*
│   │   │   ├── TestResults.*
│   │   │   ├── ExerciseHint.*
│   │   │   └── ExerciseSolution.*
│   │   ├── wireless/
│   │   ├── KnowledgeCheck.*
│   │   ├── ResearchConnection.*
│   │   └── BloomIndicator.*
│   ├── lib/
│   │   ├── exercises/
│   │   │   ├── runner.ts
│   │   │   ├── tests.ts
│   │   │   └── progress.ts
│   │   └── wireless/
│   ├── styles/
│   └── assets/
├── notebooks/
│   ├── 01_coordinate.ipynb
│   ├── 02_communicate.ipynb
│   └── 03_adapt.ipynb
├── wireless_env/
│   ├── environment.py
│   ├── baselines.py
│   ├── metrics.py
│   ├── scenarios.py
│   └── tests/
├── policies/
│   ├── random/
│   ├── greedy/
│   ├── independent/
│   └── cooperative/
├── manim/
│   ├── common/
│   │   ├── theme.py
│   │   ├── layout.py
│   │   ├── equations.py
│   │   ├── agents.py
│   │   └── wireless.py
│   ├── storyboards/
│   │   ├── 01_coordinate.md
│   │   ├── 02_communicate.md
│   │   └── 03_adapt.md
│   ├── 01_coordinate.py
│   ├── 02_communicate.py
│   └── 03_adapt.py
├── slides/
│   ├── presentation.qmd
│   └── assets/
├── instructor-guide/
│   └── instructor-guide.md
└── project/
    ├── brief.md
    ├── rubric.md
    └── starter/

==================================================
WEBSITE INFORMATION ARCHITECTURE
==================================================

Top navigation:

Introduction
Chapters
Wireless Lab
Knowledge Checks
Project
Resources
About

Desktop layout:

- top navigation
- persistent left sidebar
- central article
- right-side “On this page” TOC where useful

Mobile:

- collapsible navigation
- readable equations
- no page-level horizontal overflow
- touch-friendly controls

The website should feel like:

A MODERN INTERACTIVE TECHNICAL TEXTBOOK.

It must NOT look like:

- a SaaS product
- a startup landing page
- a dashboard
- a single-page demo
- a collection of decorative cards

==================================================
VISUAL DESIGN
==================================================

Visual direction:

- academic
- editorial
- spacious
- modern
- calm
- technically sophisticated
- classroom-ready

Primary colors:

--purple: #361a54;
--yellow: #fdd633;

Use:

- warm off-white background
- deep purple for major emphasis
- yellow sparingly
- muted blue/green supporting colors
- red only for warnings/errors
- high contrast typography

Avoid:

- decorative gradients
- excessive rounded corners
- excessive shadows
- glassmorphism
- generic AI illustrations
- decorative blobs
- visual clutter

Central article width:

approximately 700–850 px.

Typography:

- strong readable sans-serif
- good line height
- clear hierarchy
- monospace only where appropriate
- large readable mathematics
- generous spacing

==================================================
WRITING STYLE
==================================================

Use first-principles technical teaching.

Start from the problem.

Build intuition.

Then formalize.

Use questions to drive the narrative.

Prefer:

“Why does this become difficult?”

over:

“Definition: Non-stationarity.”

Do not introduce terminology before motivation.

Do not use jargon unnecessarily.

Do not dump bullets when prose would teach better.

Do not produce generic textbook filler.

The learner should feel that every section answers a concrete question.

==================================================
INTRODUCTION
==================================================

Begin with:

“What changes when there is more than one learning agent?”

Show the single-agent RL loop.

Then add a second agent.

Make visually clear:

Agent A changes the environment Agent B experiences.

Agent B changes the environment Agent A experiences.

Each learning agent becomes part of the other learner’s environment.

Introduce the three central questions:

Coordinate
Communicate
Adapt

State:

- audience
- prerequisites
- learning objectives
- estimated time
- course structure
- how to use website
- code exercises
- Manim videos
- notebooks
- lab
- final project

==================================================
MODULE STRUCTURE
==================================================

MODULE 0
RL Refresher

MODULE 1
Coordinate

MODULE 2
Communicate

MODULE 3
Adapt

MODULE 4
Wireless Resource Allocation Lab

MODULE 5
Final Project

For every module state:

- prerequisites
- learning objectives
- estimated completion time
- chapter reading
- video
- coding activities
- notebook/lab activities
- knowledge checks
- expected outcomes

==================================================
ESTIMATED WORKLOAD
==================================================

Design approximately for:

Introduction + RL refresher:
20–30 minutes

Coordinate:
60–90 minutes

Communicate:
60–90 minutes

Adapt:
60–90 minutes

Wireless Lab:
60–90 minutes

Each notebook:
30–45 minutes

Final project:
3–6 hours depending on instructor expectations

Each Manim video:
maximum 5 minutes

The complete package should work both as:

- selected classroom material
- substantial self-paced undergraduate MARL module

==================================================
CHAPTER 1: COORDINATE
==================================================

CORE QUESTION

How do multiple agents learn to work toward one goal?

Teach:

- multiple agents
- state
- observations
- joint actions
- cooperative/shared rewards
- partial observability
- decentralized policies
- non-stationarity
- credit assignment intuition
- CTDE

Use a simple intuitive cooperative scenario first.

Then formalize.

Joint action:

a_t = (a_t^1, ..., a_t^n)

Shared reward:

r_t = R(s_t, a_t)

Partial observation:

o_t^i = O_i(s_t)

Decentralized policy:

a_t^i ~ π_i(a_t^i | o_t^i)

Explain non-stationarity visually:

Agent A updates
→ Agent B experiences a changed environment
→ Agent B updates
→ Agent A now experiences a changed environment

Motivate CTDE.

TRAINING:

richer/global information may be available.

EXECUTION:

each agent acts from local information.

Do not overteach specific algorithms.

RESEARCH CONNECTION

Anchor to:

SMACv2
NeurIPS 2023

Explain:

- why SMAC became insufficiently challenging
- procedural generation
- meaningful partial observability
- need for closed-loop/generalizing policies

Do not invent results.

==================================================
CHAPTER 1 CODE EXERCISES
==================================================

Include several small code exercises.

EXERCISE 1
Joint Action

Given:

actions = [0, 2, 1]

construct:

(0, 2, 1)

Connect directly to:

a_t = (a_t^1, ..., a_t^n)

EXERCISE 2
Cooperative Reward

Simple channel allocation:

two agents each choose channel 0 or 1.

Reward:

+1 if channels differ
-1 if channels collide

Students implement:

def team_reward(action_a, action_b):
    # TODO
    ...

Then enumerate all joint actions.

Display reward table.

EXERCISE 3
Partial Observation

Given a global state, implement:

O_i(s_t)

for Agent A.

Then visually compare:

Global state
vs
Agent A view
vs
Agent B view

EXERCISE 4
Non-stationarity

Provide a tiny simulation.

Hold Agent A fixed.

Change Agent B’s policy over time.

Show that Agent A’s experienced reward/transition distribution changes.

Ask:

“Did Agent A change?”

No.

“So why did its environment change?”

Because another learner changed.

==================================================
CHAPTER 2: COMMUNICATE
==================================================

CORE QUESTION

What should agents tell each other when they know different things?

Set up information asymmetry.

Introduce:

m_t^i = f_i(o_t^i)

Receiving policy:

a_t^j ~ π_j(a_t^j | o_t^j, m_t^i)

Introduce bandwidth:

|M| = 2^b

Make interactive:

1 bit → 2 possible messages
2 bits → 4
4 bits → 16
8 bits → 256

Introduce communication cost:

r'_t = r_t - λ c_t

Add λ slider.

Show:

more communication
can improve coordination

but can also increase:
- overhead
- latency
- congestion
- cost

Introduce learned communication.

Explain that learned symbols can work well without being human-interpretable.

Do not fake message semantics.

RESEARCH CONNECTION

Anchor to:

Language Grounded Multi-agent Reinforcement Learning with Human-interpretable Communication
NeurIPS 2024

Explain:

- emergent communication
- interpretability problem
- language grounding
- generalization findings supported by paper

==================================================
CHAPTER 2 CODE EXERCISES
==================================================

EXERCISE 1
Message Capacity

Implement:

def number_of_messages(bits):
    # TODO
    return ...

Connect to:

|M| = 2^b

EXERCISE 2
Communication Cost

Implement:

r'_t = r_t - λ c_t

Allow changing λ.

EXERCISE 3
Rule-Based Message

Given local interference:

if interference > threshold:
    return HIGH_INTERFERENCE

Use the message to help another agent choose a channel.

EXERCISE 4
Communication Ablation

Run:

Communication OFF
vs
Communication ON

Compare team reward or network performance.

Ask learners to explain:

WHEN did communication help?

==================================================
CHAPTER 3: ADAPT
==================================================

CORE QUESTION

Did the agent learn teamwork, or did it learn its teammate?

Scenario:

A and B train together.

Performance is excellent.

Replace B with C.

Performance collapses.

Teach:

- self-play
- partner overfitting
- teammate diversity
- ad hoc teamwork
- zero-shot coordination
- teammate modelling
- social/generalization evaluation

Create interactive partner matrix:

              Partner
          B    C    D    E
Agent A   95   42   38   61
Agent F   82   79   84   76

Ask:

Which agent is the better teammate?

Force prediction before revealing interpretation.

RESEARCH CONNECTIONS

Use:

N-Agent Ad Hoc Teamwork
NeurIPS 2024

ZSC-Eval
NeurIPS 2024 Datasets & Benchmarks

Optionally mention:
Melting Pot

==================================================
CHAPTER 3 CODE EXERCISES
==================================================

EXERCISE 1
Generalization Gap

Implement:

generalization_gap =
familiar_performance - unseen_performance

EXERCISE 2
Partner Matrix

Given matrix data, calculate:

- mean performance
- worst-partner performance

Ask:

Which agent would you deploy with an unknown teammate?

EXERCISE 3
Training Diversity

Compare:

training with one fixed partner

vs

training/evaluation with a population of partners.

Use a small deterministic simulation if full MARL is too expensive.

Goal:
conceptual understanding.

==================================================
IN-BROWSER CODE EXERCISES
==================================================

This is a CRITICAL feature.

Students should encounter executable Python directly inside the chapters.

Build a reusable:

<CodeExercise />

Students must be able to:

1. read starter Python code
2. edit TODO sections
3. click Run
4. inspect output
5. click Check Answer
6. receive useful feedback
7. request Hint
8. optionally Show Solution
9. Reset exercise

Include:

- syntax highlighting
- editable code
- Run
- Check Answer
- Reset
- Hint
- Show Solution
- output panel
- test results
- explanation

Prefer Pyodide.

Run locally in browser.

No backend.

Lazy-load runtime.

Show loading progress/state.

==================================================
CHECK ANSWER SYSTEM
==================================================

Do NOT compare raw source-code strings.

Use tests.

Example:

def jain_fairness(rates):
    ...

Test:

[1,1,1] → approximately 1

[3,0,0] → approximately 1/3

Give useful feedback.

GOOD:

“Your value can exceed 1. Jain’s fairness index for non-negative rates should lie between 1/n and 1. Check your denominator.”

BAD:

“Incorrect.”

After success, explain why the answer matters conceptually.

==================================================
CODE EXERCISE TYPES
==================================================

Use several patterns.

1. COMPLETE THE FUNCTION

2. PREDICT THEN RUN

3. FIX THE BUG

4. MODIFY A PARAMETER

5. IMPLEMENT THE EQUATION

6. INTERPRET THE OUTPUT

Early exercises should be highly scaffolded.

Later exercises should become more open-ended.

==================================================
EQUATIONS AS TEACHING DIAGRAMS
==================================================

CRITICAL DESIGN REQUIREMENT.

Do not render important equations as isolated math followed by bullet definitions.

Important equations should behave as visual explanatory diagrams.

Build reusable components such as:

EquationAnnotation
EquationLabel
EquationArrow
EquationBrace
EquationSequence
EquationTerm

Example:

a_t^i ~ π_i(a_t^i | o_t^i)

Visually label:

- sampled action
- policy of agent i
- possible action
- local observation

Use:

- arrows
- braces
- underlines
- spatial labels
- selective color
- progressive reveal

Maintain consistent colors between equation terms and visual objects.

==================================================
PROGRESSIVE FORMALIZATION
==================================================

For difficult equations:

Step 1:

Action ← Policy(Observation)

Step 2:

a_t^i ← π_i(o_t^i)

Step 3:

a_t^i ~ π_i(a_t^i | o_t^i)

The formal equation should feel like a compact expression of an idea the learner already understands.

==================================================
WIRELESS APPLICATION BRIDGE
==================================================

Before the full wireless lab, include:

“From MARL to Wireless Resource Allocation”

Assume ZERO wireless expertise.

Teach only four core ideas.

1. BASE STATION

A transmitter serving nearby users.

2. CHANNEL

A portion of wireless spectrum used for communication.

3. INTERFERENCE

Nearby transmissions using the same channel can degrade one another.

4. TRANSMIT POWER

More power can strengthen a desired signal but also increase interference.

Then map:

MARL concept      Wireless system

Agent             Base station
Observation       Local demand/channel conditions/interference
Action            Channel + transmit power
Reward            Network objective

Make this mapping visual.

==================================================
WIRELESS CODING BRIDGE
==================================================

Before Three.js lab, include three short code exercises.

EXERCISE 1
Path Loss / Channel Gain

g_iu = 1 / (d_iu + ε)^α

Students implement:

def channel_gain(distance, epsilon, alpha):
    ...

EXERCISE 2
SINR

SINR_u =
P_i g_iu /
(σ² + interference)

Students implement.

EXERCISE 3
Rate

R_u = B log2(1 + SINR_u)

Students implement.

Then combine them.

Allow learner to change:

- distance
- transmit power
- interference
- bandwidth

Show resulting rate.

The purpose is to ensure the Three.js lab is not a black box.

==================================================
FLAGSHIP THREE.JS LAB
==================================================

TITLE

Cooperative Wireless Resource Allocation Lab

The lab should be impressive enough for a NeurIPS educational demo, but technically honest.

Do not build a full telecom simulator.

Use Three.js because spatial relationships matter.

==================================================
WIRELESS ENVIRONMENT
==================================================

Default:

- 3 base stations
- 3 channels
- 2–4 users per station
- low / medium / high transmit power
- dynamic user demand
- optional moving users
- distance-dependent path loss
- simplified noise

Each base station is one agent.

Action:

a_i = (channel_i, power_i)

where:

channel_i ∈ {1,2,3}

power_i ∈ {low, medium, high}

Each agent therefore has:

9 actions.

With 3 agents:

9^3 = 729 joint actions.

Keep initial environment deliberately small.

==================================================
SIMPLIFIED WIRELESS MODEL
==================================================

Channel gain:

g_iu = 1 / (d_iu + ε)^α

SINR:

SINR_u =
(P_i g_iu)
/
(
σ²
+
Σ_{j≠i}
P_j g_ju
1[c_j = c_i]
)

Rate:

R_u = B log2(1 + SINR_u)

Use normalized units where useful.

Clearly label this as:

A simplified educational wireless model.

Do NOT add unless optional extension:

- beamforming
- MIMO internals
- OFDMA scheduling internals
- ray tracing
- full fading stacks
- handover
- full 5G architecture

==================================================
THREE.JS VISUAL STYLE
==================================================

Prefer:

clean educational 2.5D / isometric visualization.

Not a video game.

Do not rely on realistic external 3D assets.

Use procedural geometry where possible.

Scene elements:

- base stations
- users
- coverage regions
- channel identity
- transmission links
- interference regions
- message animations
- demand indicators

Users should be able to:

- orbit slightly
- zoom
- select base station
- select user
- change channel
- change power
- run simulation
- pause
- step one timestep
- reset
- replay
- compare policies
- switch global/agent view

==================================================
GLOBAL VIEW
==================================================

Show:

- all stations
- all users
- current channels
- interference
- demand
- allocations
- network metrics

==================================================
AGENT VIEW
==================================================

Show only information available to selected agent.

This should visually teach partial observability.

For example:

GLOBAL VIEW

shows all user demand and all interference.

AGENT B VIEW

shows:
- own users
- measured local interference
- local demand
- received messages
- possibly neighbour summary depending on communication mode

Hide unavailable global information.

==================================================
COORDINATE MODE
==================================================

Allow manual resource allocation.

Example:

A chooses Channel 1.
B chooses Channel 1.

Coverage overlaps.

Co-channel interference increases.

SINR drops.

Throughput drops.

Make causal relationship obvious.

Then compare:

Random
vs
Greedy local
vs
Independent RL
vs
Cooperative MARL

Display:

- total throughput
- mean throughput
- per-user throughput
- interference
- fairness
- current joint action

Core discovery:

“A locally good allocation can be globally poor.”

==================================================
COMMUNICATE MODE
==================================================

Initially:

local observations only.

Then enable communication.

Possible messages:

- current channel
- high interference
- traffic demand
- available capacity
- planned channel change

Visualize messages travelling between stations.

For symbolic messages:

00
01
10
11

When clicking a message, show:

- sender observation
- message
- receiver state
- receiver action

Controls:

Communication:
OFF / ON

Bandwidth:
0 / 1 / 2 / 4 bits

Communication penalty λ:
slider

Display communication overhead.

Never fake learned semantics.

If message behavior is rule-based:
label it rule-based.

If it comes from trained policy:
label it learned.

==================================================
ADAPT MODE
==================================================

Support deployment shifts:

- new base station joins
- base station fails
- user distribution changes
- traffic becomes bursty
- one channel becomes noisy
- communication degrades
- topology changes

Make “new base station joins” particularly visually clear.

Ask:

“Did the agents learn a fixed allocation pattern, or a coordination strategy?”

Compare familiar and unseen scenarios.

==================================================
METRICS
==================================================

At minimum:

- total throughput
- mean user throughput
- worst-user throughput
- interference
- Jain fairness index
- communication overhead
- robustness
- generalization performance

==================================================
JAIN FAIRNESS INDEX
==================================================

Teach:

J(x_1,...,x_n)
=
(Σ_i x_i)^2
/
(n Σ_i x_i^2)

Annotate the equation visually.

Explain:

J close to 1
→ similar user service

lower J
→ more unequal allocation

Use this to create a real trade-off:

maximize total throughput
vs
serve users fairly

==================================================
POLICY BASELINES
==================================================

Provide a clear progression:

Random
→ Greedy Local
→ Independent RL
→ Cooperative MARL
→ MARL + Communication
→ Robust / Diversity-Trained MARL

Do not claim superiority without measured evidence.

Training can happen in Python.

Website can use:

- exported policies
- small checkpoints
- precomputed trajectories

Do NOT perform expensive training in Three.js.

==================================================
PYTHON WIRELESS ENVIRONMENT
==================================================

Create a simple reusable environment.

Use Gymnasium/PettingZoo-style interfaces where helpful.

Provide:

environment.py
baselines.py
metrics.py
scenarios.py

The environment should support:

- deterministic seeds
- topology generation
- base station actions
- user positions
- traffic demand
- communication mode
- node failure
- channel noise
- topology shifts

==================================================
NOTEBOOK 1: COORDINATE
==================================================

Target:
30–45 minutes.

Learner:

- inspects environment
- defines observations/actions
- runs random baseline
- runs greedy baseline
- examines interference
- compares local vs team objectives
- runs/loads cooperative policy
- plots results

Include:

- prediction prompts
- code
- plots
- interpretation questions
- takeaway

==================================================
NOTEBOOK 2: COMMUNICATE
==================================================

Target:
30–45 minutes.

Learner:

- introduces partial observations
- compares communication OFF/ON
- varies bandwidth
- varies communication cost
- inspects messages
- compares throughput/fairness/overhead

==================================================
NOTEBOOK 3: ADAPT
==================================================

Target:
30–45 minutes.

Learner:

- evaluates familiar topology
- tests unseen topology
- tests station failure
- tests traffic shift
- tests reduced communication
- tests new station configuration
- builds generalization matrix
- analyses failures

==================================================
MANIM VIDEOS
==================================================

Create THREE high-quality Manim videos.

MAXIMUM:

5 minutes EACH.

Target:

approximately 3–5 minutes each.

These are concise visual explainers.

Not recorded lectures.

==================================================
MANIM BACKGROUND
==================================================

Use a clear/light background.

Prefer:

- warm white
- very light neutral

Use:

- dark high-contrast typography
- restrained purple/yellow accents consistent with site

DO NOT use default black Manim aesthetic.

No gradients.

No particles.

No decorative background movement.

==================================================
MANIM VISUAL STANDARD
==================================================

The videos must be ready for actual university teaching.

Prioritize:

- clear typography
- generous spacing
- excellent alignment
- strong hierarchy
- readable equations
- uncluttered frames
- consistent visual language
- purposeful movement
- negative space
- smooth pacing

Never solve crowded layout by shrinking everything.

Sequence information instead.

Every animation should answer:

“What is this motion teaching?”

If answer is nothing:
remove it.

==================================================
MANIM COMPONENTS
==================================================

Use:

- MathTex
- Tex
- Text
- Paragraph where useful
- VGroup
- Transform
- ReplacementTransform
- TransformMatchingTex
- FadeIn
- FadeOut
- Create
- ValueTracker
- updaters where useful

Use sparingly:

- Write
- Circumscribe
- Indicate
- camera motion

Avoid:

- bouncing
- spinning
- constant zooming
- flashy transitions
- animation for spectacle
- excessive Write animations

==================================================
MANIM TYPOGRAPHY
==================================================

Use a clear sans-serif for ordinary text.

Use LaTeX for mathematics.

Create shared constants:

TITLE_SIZE
SUBTITLE_SIZE
BODY_SIZE
LABEL_SIZE
EQUATION_SIZE

in:

manim/common/theme.py

Ensure:

- large readable equations
- readable subscripts
- no tiny labels
- no text at frame edges
- no overlap
- generous line spacing

Use relative layout.

Avoid hard-coded arbitrary coordinates everywhere.

==================================================
MANIM EQUATION STYLE
==================================================

Equations should evolve progressively.

Example:

Action ← Policy(Observation)

transform to:

a_t^i ← π_i(o_t^i)

then:

a_t^i ~ π_i(a_t^i | o_t^i)

Use TransformMatchingTex where appropriate.

Highlight one term at a time.

Add:

- braces
- arrows
- labels

==================================================
MANIM WIRELESS SINR ANIMATION
==================================================

For SINR:

SINR_u =
signal
/
(noise + interference)

Animate:

1. serving station transmits
2. desired signal appears
3. noise term appears
4. second station activates same channel
5. interference appears
6. denominator grows
7. SINR decreases
8. user throughput decreases

This should visually teach the equation.

==================================================
MANIM VIDEO 1
==================================================

TITLE:

Why Smart Agents Can Still Interfere

Target:
3–5 minutes.

Story:

1. One base station chooses a channel.
2. User gets good service.
3. Add second base station.
4. Both independently choose same attractive channel.
5. Interference appears.
6. Introduce joint action.
7. Introduce shared/global objective.
8. Show partial observations.
9. Show why another learner creates non-stationarity.
10. Introduce CTDE.
11. Return to network with improved coordination.

Final takeaway:

“Your best action depends on what the other agents do.”

==================================================
MANIM VIDEO 2
==================================================

TITLE:

What Should Agents Tell Each Other?

Target:
3–5 minutes.

Story:

1. Two stations have different local information.
2. Neither sees full network.
3. One changes channel and harms other.
4. Introduce communication.
5. Animate message.
6. Begin with 1 bit.
7. Show:

|M| = 2^b

8. Increase bandwidth.
9. Introduce communication cost.
10. Show why unlimited communication is not automatically best.
11. Introduce learned communication.
12. Briefly discuss interpretability/language grounding.

Final takeaway:

“Communication is useful when it changes what a teammate can do.”

==================================================
MANIM VIDEO 3
==================================================

TITLE:

Did It Learn Cooperation or Memorize the Network?

Target:
3–5 minutes.

Story:

1. Three stations train in fixed topology.
2. Performance becomes strong.
3. Add a new station.
4. Allocation fails.
5. Change traffic distribution.
6. Show another failure.
7. Introduce training diversity.
8. Introduce zero-shot coordination.
9. Show familiar vs unfamiliar matrix.
10. Show diversity-trained policy retaining more performance.

Final takeaway:

“A cooperative policy should work beyond the exact partners and situations it trained with.”

==================================================
MANIM STORYBOARDS
==================================================

Before coding each video, create a storyboard markdown file.

Include:

- timestamp range
- narration/teaching point
- visual composition
- equation
- animation
- transition
- expected duration

Example:

00:00–00:20

Question:
“What happens when two base stations make individually sensible decisions?”

Visual:
one clean base station scene.

00:20–00:45

Second station appears.

etc.

Total runtime MUST naturally fit under five minutes.

Do not create 10 minutes of material and speed it up.

==================================================
MANIM TECHNICAL QUALITY
==================================================

Provide:

- preview render command
- final render command
- dependencies
- LaTeX setup
- troubleshooting notes

Test all scenes.

No:

- broken MathTex
- offscreen objects
- overlap
- unreadable text
- long empty pauses
- overly fast animations

==================================================
QUARTO / REVEALJS SLIDES
==================================================

Slides should NOT duplicate textbook prose.

Slides are for live teaching.

Use:

- questions
- progressive diagrams
- equations
- prediction prompts
- before/after experiments
- lab visuals
- QR/link to lab
- concise research connections

Very little prose.

Example:

Slide 1:

“What happens if every base station chooses its locally best channel?”

Students predict.

Next fragment:

show allocation.

Next:

show interference.

Next:

show throughput drop.

==================================================
KNOWLEDGE CHECKS
==================================================

Build checks throughout and a dedicated hub.

Question types:

- multiple choice
- prediction
- diagram interpretation
- misconception diagnosis
- choose best explanation
- experiment interpretation
- short reasoning

Give immediate explanatory feedback.

No gamification.

No confetti.

No fake points.

Track progress locally.

==================================================
KNOWLEDGE CHECK VS CODE VS EXPERIMENT
==================================================

Keep distinct.

KNOWLEDGE CHECK

Tests conceptual reasoning.

CODE EXERCISE

Tests implementation/application.

EXPERIMENT

Tests causal understanding.

PROJECT

Tests synthesis and creation.

Do not merge all of them into generic quizzes.

==================================================
FINAL PROJECT
==================================================

TITLE:

Design a Cooperative Wireless Resource Allocation System

==================================================
FINAL PROJECT SCENARIO
==================================================

A wireless network contains autonomous base stations serving users under changing demand.

The network has:

- limited spectrum
- interference
- partial information
- communication costs
- changing deployment conditions

Each base station must choose:

- channel
- transmit power

The learner must build or modify a cooperative resource-allocation strategy.

==================================================
FINAL PROJECT DESIGN TASKS
==================================================

Students must specify:

OBSERVATIONS

What does each station know?

Possible examples:

- own user demand
- channel quality
- measured interference
- previous action
- received messages

ACTIONS

At minimum:

- channel
- transmit power

REWARD

Students design an objective involving relevant quantities such as:

- throughput
- fairness
- interference
- communication cost

COMMUNICATION

Choose:

- communication ON/OFF
- what information is exchanged
- bandwidth
- communication penalty

TRAINING

Choose:

- fixed vs varied topology
- demand distribution
- communication perturbation
- station failures
- diverse deployment conditions

==================================================
FINAL PROJECT EVALUATION
==================================================

At minimum evaluate:

1. Familiar topology
2. Unseen topology
3. Traffic surge
4. Noisy channel
5. Base station failure
6. New base station joins
7. Reduced communication

Compare at least two designs.

Metrics:

- aggregate throughput
- mean throughput
- worst-user throughput
- Jain fairness
- interference
- communication overhead
- robustness
- generalization drop

Final evaluation question:

“Which system would you deploy, and why?”

Learners must justify with evidence.

CREATE stage:

Propose an improved system.

Deliver:

- system diagram
- observation design
- action design
- reward design
- communication strategy
- training strategy
- evaluation results
- deployment recommendation

==================================================
PROJECT SCOPE
==================================================

Keep project feasible.

This is not a telecom thesis.

Students should mainly modify:

- reward weights
- observations
- communication
- training distributions
- policy strategy

Provide starter infrastructure.

Do not require MARL implementation from scratch.

==================================================
INSTRUCTOR GUIDE
==================================================

Include:

- intended audience
- prerequisites
- learning objectives
- Bloom mapping
- recommended sequence
- module timing
- 90-minute version
- half-day version
- self-paced version
- common misconceptions
- expected lab outcomes
- discussion prompts
- notebook guidance
- code exercise guidance
- project rubric
- setup instructions
- fallback screenshots/results
- advanced extensions

==================================================
RESEARCH REFERENCES
==================================================

Use clean numbered references.

Core references:

SMACv2
NeurIPS 2023

Language Grounded Multi-agent Reinforcement Learning with Human-interpretable Communication
NeurIPS 2024

N-Agent Ad Hoc Teamwork
NeurIPS 2024

ZSC-Eval
NeurIPS 2024 Datasets & Benchmarks

Melting Pot where useful.

For wireless resource allocation:

Find and cite credible recent MARL/resource-allocation literature before making research claims.

Do not invent citations.

==================================================
RESEARCH ACCURACY
==================================================

Strictly distinguish:

A. published results

B. our measured experimental results

C. illustrative educational examples

Never present:

- hand-coded policy as learned policy
- synthetic number as benchmark result
- illustrative message semantics as emergent semantics
- unmeasured claim as empirical fact

If not measured:
do not invent a number.

==================================================
ACCESSIBILITY
==================================================

Website must include:

- semantic HTML
- keyboard support
- visible focus states
- sufficient contrast
- alt text
- reduced-motion support
- responsive mobile layout
- touch-friendly controls
- accessible text equivalents for important Three.js visuals

For reduced motion:

use step-based or simplified visual updates.

==================================================
PERFORMANCE
==================================================

Three.js scene must remain lightweight.

Prefer:

- procedural geometry
- modest object counts
- low polygon counts
- efficient animation loop
- proper resize handling
- Three.js resource disposal

Avoid large assets.

The site should work on:

- ordinary laptop
- modern phone
- classroom projector

==================================================
TESTING
==================================================

Add Python tests for:

- action validity
- deterministic seeds
- path gain
- interference
- SINR
- rate
- reward
- fairness
- topology reset
- failure scenario
- communication scenario
- generalization metrics

For browser behavior manually verify:

- Run code
- Check Answer
- Reset
- Hint
- Show Solution
- Pyodide lazy loading
- Three.js reset
- play/pause
- step
- policy switch
- global/agent view
- channel controls
- power controls
- communication controls
- mobile layout

==================================================
DEVELOPMENT ORDER
==================================================

Do NOT generate everything superficially in one pass.

Work sequentially.

PHASE 1

Foundation

- inspect repository
- architecture
- Astro/Starlight
- design tokens
- typography
- navigation
- MDX
- KaTeX
- references
- basic components

PHASE 2

In-browser code exercise infrastructure

- Pyodide
- CodeExercise
- Run
- Check Answer
- hints
- tests
- reset
- solution reveal
- progress

PHASE 3

Introduction + RL refresher

PHASE 4

Coordinate chapter

This is the QUALITY BENCHMARK.

Do not proceed until:

- prose is strong
- visuals are strong
- equations are annotated
- code exercises work
- knowledge checks work
- mobile works

PHASE 5

Communicate chapter

PHASE 6

Adapt chapter

PHASE 7

Wireless bridge + coding exercises

PHASE 8

Python wireless environment

- physics
- metrics
- scenarios
- baselines
- tests

PHASE 9

Three.js wireless lab

- scene
- interactions
- global/agent view
- coordinate mode
- communication mode
- adapt mode
- metrics

PHASE 10

Notebooks

PHASE 11

Manim storyboards

PHASE 12

Manim implementation

Render and inspect low-quality previews before final rendering.

PHASE 13

Quarto slides

PHASE 14

Final project + rubric

PHASE 15

Instructor guide

PHASE 16

Full polish

- accessibility
- citations
- mobile
- performance
- reproducibility
- consistency
- proofreading
- technical verification

==================================================
QUALITY BAR
==================================================

When uncertain between:

more features
vs
better teaching

choose better teaching.

When uncertain between:

visual spectacle
vs
clarity

choose clarity.

When uncertain between:

another MARL algorithm
vs
deeper intuition

choose deeper intuition.

When uncertain between:

more text
vs
a strong visual explanation

choose the visual explanation where appropriate.

When an equation can be spatially annotated:
annotate it.

When a learner can predict before seeing an answer:
ask them to predict.

When a concept can be reinforced with 5 lines of executable Python:
give them executable Python.

==================================================
DEFINITION OF DONE
==================================================

The resource is finished when an undergraduate learner can begin with:

“I know basic reinforcement learning, but I have not formally studied multi-agent reinforcement learning.”

and finish able to say:

“I understand why multiple learning agents create new coordination problems.”

“I can represent a cooperative MARL problem mathematically.”

“I understand joint actions, shared rewards, partial observations, non-stationarity and CTDE.”

“I understand when communication helps and what communication costs.”

“I understand why strong performance with familiar teammates does not guarantee general cooperation.”

“I can implement small MARL concepts in Python.”

“I can run experiments and interpret the results.”

“I understand a simplified wireless resource-allocation problem.”

“I can explain how channel allocation and power decisions create interference between agents.”

“I can evaluate policies using throughput, fairness, interference, communication cost, robustness and generalization.”

“I can design and justify a cooperative wireless resource-allocation system.”

The website should feel like several hours of serious interactive undergraduate learning.

The Manim videos should be ready to show in a university lecture.

The Three.js lab should be strong enough to demonstrate live at NeurIPS.

The notebooks should run reproducibly.

The code exercises should provide meaningful immediate feedback.

The final project should genuinely require:

Apply
→ Analyse
→ Evaluate
→ Create

Do not consider the project complete merely because the pages render.

The educational experience itself must work.