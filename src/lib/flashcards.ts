/**
 * FLASHCARD DECKS
 *
 * Retrieval practice, and nothing more. The knowledge checks handle reasoning,
 * the worksheets handle calculation and the labs handle experimentation, so
 * these cards do the one thing none of those do: ask you to produce a
 * definition or an equation from memory before you see it.
 *
 * Answers are structured blocks rather than markdown, because a card is data
 * passed to a component and component props never reach the markdown pipeline.
 * Maths is written as `$...$` or as an `eq` block and rendered at build time.
 */

/** Small scanning label. Not a mode, and not a difficulty. */
export type CardType =
  | 'Concept'
  | 'Equation'
  | 'Intuition'
  | 'Distinction'
  | 'Scenario'
  | 'Frontier';

export type Block =
  /** A paragraph. May contain `$maths$`, `**bold**` and `` `code` ``. */
  | { p: string }
  /** A bullet list. Each item may contain the same inline markup. */
  | { ul: string[] }
  /** A display equation, centred. */
  | { eq: string }
  /** Symbol annotations under an equation. */
  | { terms: { tex: string; is: string }[] }
  /** A short aside, set apart. Used for scope and integrity notes. */
  | { note: string };

export interface Card {
  /** Stable within its deck. Used for the DOM id and the filter. */
  id: string;
  type: CardType;
  /** The prompt. May contain `$maths$`. */
  question: string;
  /** A display equation shown on the front, when the question is about one. */
  front?: string;
  /** One of the named diagrams in FlashcardDeck. */
  diagram?: 'vdn-sum' | 'ctde';
  answer: Block[];
}

export interface Deck {
  slug: string;
  /** Deck name, as it appears on the card and in the sidebar. */
  title: string;
  /** Uppercase label on the index card. */
  label: string;
  /** One line under the deck title. */
  blurb: string;
  /** Five topics, for the index. */
  topics: string[];
  /** The chapter this deck reviews, for the back link. */
  chapter?: string;
  cards: Card[];
}

/* ------------------------------------------------------------- Background */

const background: Card[] = [
  {
    id: 'policy',
    type: 'Concept',
    question: 'What does a policy represent in reinforcement learning?',
    answer: [
      { p: 'A policy defines how an agent chooses actions from the information available to it.' },
      { eq: String.raw`a_t \sim \pi(a_t \mid o_t)` },
      { p: 'The policy $\\pi$ maps observation $o_t$ to a distribution over possible actions.' },
    ],
  },
  {
    id: 'policy-notation',
    type: 'Equation',
    question: 'What does this mean?',
    front: String.raw`a_t \sim \pi(a_t \mid o_t)`,
    answer: [
      { p: 'At time $t$, the agent chooses action $a_t$ according to policy $\\pi$, conditioned on its current observation $o_t$.' },
      { terms: [
        { tex: String.raw`\pi`, is: 'the decision rule the agent follows' },
        { tex: String.raw`o_t`, is: 'everything the agent can see at this step' },
        { tex: String.raw`\sim`, is: 'sampled from, so the policy may be stochastic' },
      ] },
    ],
  },
  {
    id: 'one-to-many',
    type: 'Concept',
    question: 'What changes when reinforcement learning moves from one agent to multiple agents?',
    answer: [
      { p: "An agent's outcome can now depend on what other agents do. Other agents may also be learning, changing the environment each agent experiences." },
    ],
  },
  {
    id: 'joint-action',
    type: 'Concept',
    question: 'What is a joint action, and why is it important in MARL?',
    answer: [
      { p: "A joint action is the combination of all agents' actions at a particular time." },
      { eq: String.raw`\mathbf{a}_t = (a_t^1, \ldots, a_t^n)` },
      { p: "The environment responds to this combination, so the outcome may depend on how the agents' actions fit together." },
    ],
  },
  {
    id: 'joint-notation',
    type: 'Equation',
    question: 'What does this represent?',
    front: String.raw`\mathbf{a}_t = (a_t^1, \ldots, a_t^n)`,
    answer: [
      { p: 'The **joint action** at time $t$, containing the actions selected by all $n$ agents.' },
      { terms: [
        { tex: String.raw`a_t^i`, is: "agent $i$'s own action, chosen from its own observation" },
        { tex: String.raw`\mathbf{a}_t`, is: 'the tuple the environment actually responds to' },
      ] },
    ],
  },
  {
    id: 'state-observation',
    type: 'Distinction',
    question: "What is the difference between the environment state and an agent's observation?",
    answer: [
      { p: 'The **state** represents the underlying condition of the environment. An **observation** contains only the information available to a particular agent.' },
    ],
  },
  {
    id: 'observation-function',
    type: 'Equation',
    question: "What does this tell us about agent $i$'s information?",
    front: String.raw`o_t^i = O_i(s_t)`,
    answer: [
      { p: "Agent $i$'s observation $o_t^i$ is generated from the underlying state $s_t$ through its observation function $O_i$." },
      { p: 'The agent may therefore see only part of the complete state.' },
    ],
  },
  {
    id: 'partial-observability',
    type: 'Concept',
    question: 'What does partial observability mean in a multi-agent environment?',
    answer: [
      { p: 'An agent does not directly observe all information about the environment that may be relevant to its decision.' },
    ],
  },
  {
    id: 'different-information',
    type: 'Intuition',
    question: 'Why can agents in the same environment make decisions from different information?',
    answer: [
      { p: 'Each agent may have its own observation function, location, sensors, or access to information. They share the environment without necessarily sharing the same view of it.' },
    ],
  },
  {
    id: 'shared-reward',
    type: 'Distinction',
    question: 'What does giving all agents the same reward accomplish, and what does it not guarantee?',
    answer: [
      { p: 'A shared reward aligns the agents toward the same objective.' },
      { p: 'It does **not** guarantee that their individual actions will be coordinated, or reveal how each agent contributed to the outcome.' },
    ],
  },
];

/* ------------------------------------------------------------- Coordinate */

const coordinate: Card[] = [
  {
    id: 'shared-goal-not-enough',
    type: 'Intuition',
    question: 'Why does sharing the same objective not automatically produce coordinated behaviour?',
    answer: [
      { p: 'Agents can choose individually reasonable actions that combine poorly.' },
      { p: 'A shared goal tells agents **what the team wants**, but not necessarily **how their actions should fit together**.' },
    ],
  },
  {
    id: 'action-interdependence',
    type: 'Scenario',
    question: "Why can the quality of one agent's action depend on the actions chosen by other agents?",
    answer: [
      { p: 'Because actions can be complementary or conflicting.' },
      { p: 'FETCH may be useful if another agent chooses COOK, and wasteful if both agents choose FETCH.' },
    ],
  },
  {
    id: 'joint-space-size',
    type: 'Equation',
    question: 'What does this tell us?',
    front: String.raw`|\mathcal{A}_{\text{joint}}| = k^n`,
    answer: [
      { p: 'If $n$ agents each have $k$ possible actions, there are $k^n$ possible joint actions.' },
      { p: 'The number of combinations grows exponentially with the number of agents.' },
      { terms: [
        { tex: String.raw`k`, is: 'actions available to one agent' },
        { tex: String.raw`n`, is: 'number of agents' },
      ] },
    ],
  },
  {
    id: 'scaling',
    type: 'Concept',
    question: 'Why does coordination become harder as the number of agents increases?',
    answer: [
      { p: 'The number of possible joint actions grows rapidly, and each agent must reason about how its decisions interact with those of more agents.' },
    ],
  },
  {
    id: 'independent-learning',
    type: 'Concept',
    question: 'What is independent learning in MARL?',
    answer: [
      { p: 'Each agent learns its own policy while treating the other agents as part of the environment.' },
    ],
  },
  {
    id: 'non-stationarity',
    type: 'Intuition',
    question: 'Why can independent learning create non-stationarity?',
    answer: [
      { p: 'Other agents are also updating their policies.' },
      { p: 'When another agent changes its behaviour, the environment experienced by the learner effectively changes too.' },
    ],
  },
  {
    id: 'ctde',
    type: 'Concept',
    question: 'What is Centralized Training with Decentralized Execution?',
    diagram: 'ctde',
    answer: [
      { p: 'CTDE allows agents to use richer, team-level or global information during training, while requiring each agent to act using only locally available information at execution.' },
      { note: 'Learn together. Act locally.' },
    ],
  },
  {
    id: 'credit-assignment',
    type: 'Concept',
    question: 'What is the credit assignment problem in cooperative MARL?',
    answer: [
      { p: 'It is the problem of determining how individual agents or actions contributed to a shared team outcome.' },
      { p: 'A team reward may say the team succeeded without explaining who contributed what.' },
    ],
  },
  {
    id: 'vdn',
    type: 'Equation',
    question: 'What does the VDN equation mean?',
    front: String.raw`Q_{\text{tot}} = \sum_i Q_i`,
    diagram: 'vdn-sum',
    answer: [
      { p: "VDN represents the team's value as the sum of the individual agent values." },
      { terms: [
        { tex: String.raw`Q_i`, is: 'local agent value' },
        { tex: String.raw`Q_{\text{tot}}`, is: 'team value' },
      ] },
      { p: 'Each agent estimates a local value, and these values combine into the total team value.' },
    ],
  },
  {
    id: 'qmix',
    type: 'Distinction',
    question: 'How does QMIX differ from VDN, and what does its monotonicity constraint mean?',
    answer: [
      { p: 'VDN combines individual values using a simple sum. QMIX uses a learned mixing network to combine them more flexibly.' },
      { eq: String.raw`\frac{\partial Q_{\text{tot}}}{\partial Q_i} \geq 0` },
      { p: "The constraint means that increasing an agent's local value cannot decrease the estimated team value." },
    ],
  },
];

/* ------------------------------------------------------------ Communicate */

const communicate: Card[] = [
  {
    id: 'why-communicate',
    type: 'Intuition',
    question: 'Why does partial observability create a need for communication between agents?',
    answer: [
      { p: 'One agent may know information that another agent cannot observe directly.' },
      { p: 'Sharing that information can help the other agent make a better decision.' },
    ],
  },
  {
    id: 'useful-information',
    type: 'Concept',
    question: 'When is information from one agent useful to another agent?',
    answer: [
      { p: "When receiving that information can change the other agent's decision in a way that improves the team's outcome." },
    ],
  },
  {
    id: 'message-as-action',
    type: 'Equation',
    question: 'What does this mean?',
    front: String.raw`\mathcal{A}_i = \mathcal{X}_i \times \mathcal{M}_i`,
    answer: [
      { p: "Agent $i$'s action can be represented as both:" },
      { ul: [
        'a task or environment action from $\\mathcal{X}_i$;',
        'a communication action from $\\mathcal{M}_i$.',
      ] },
      { p: "Communication can therefore be treated as part of the agent's decision." },
    ],
  },
  {
    id: 'message-function',
    type: 'Equation',
    question: 'What does this represent?',
    front: String.raw`m_t^i = f_i(o_t^i)`,
    answer: [
      { p: 'Agent $i$ generates message $m_t^i$ from its current observation $o_t^i$.' },
      { p: 'The function $f_i$ determines what information the agent communicates.' },
    ],
  },
  {
    id: 'capacity',
    type: 'Equation',
    question: 'What does this tell us about a $b$-bit communication channel?',
    front: String.raw`|\mathcal{M}| = 2^b`,
    answer: [
      { p: 'A $b$-bit message can represent $2^b$ distinct messages.' },
      { p: 'For example, 3 bits provide 8 possible messages.' },
    ],
  },
  {
    id: 'more-is-not-better',
    type: 'Intuition',
    question: 'Why is sending more information not always better?',
    answer: [
      { p: 'Communication may have limited bandwidth, cost, noise, delay, or loss.' },
      { p: 'The goal is not maximum communication. It is **useful** communication.' },
    ],
  },
  {
    id: 'communication-cost',
    type: 'Equation',
    question: 'What does this represent?',
    front: String.raw`r'_t = r_t - \lambda c_t`,
    answer: [
      { p: 'A reward that charges the team for the communication it used.' },
      { terms: [
        { tex: String.raw`r_t`, is: 'the task reward' },
        { tex: String.raw`c_t`, is: 'communication usage' },
        { tex: String.raw`\lambda`, is: 'how costly communication is' },
      ] },
    ],
  },
  {
    id: 'constraints',
    type: 'Concept',
    question: "How can capacity, noise, loss, range, or cost change an agent's communication strategy?",
    answer: [
      { p: 'Agents may need to communicate more selectively, compress information, avoid unnecessary messages, or learn strategies that remain useful when messages are unreliable.' },
    ],
  },
  {
    id: 'learned-protocol',
    type: 'Concept',
    question: 'What is a learned communication protocol?',
    answer: [
      { p: 'A communication protocol is learned when agents develop useful relationships between information, messages, and behaviour through training, rather than having every message meaning specified in advance.' },
    ],
  },
  {
    id: 'protocol-mismatch',
    type: 'Scenario',
    question: 'Why can two successful communication protocols fail when agents trained with different conventions are paired?',
    answer: [
      { p: 'The agents may assign different meanings to the same messages.' },
      { p: 'A message only works if the sender and receiver share compatible conventions.' },
    ],
  },
];

/* ------------------------------------------------------------------ Adapt */

const adapt: Card[] = [
  {
    id: 'partner-dependence',
    type: 'Concept',
    question: 'What is partner dependence?',
    answer: [
      { p: 'Partner dependence occurs when an agent performs well because it has specialized to the behaviour or conventions of particular training partners.' },
    ],
  },
  {
    id: 'familiar-misleading',
    type: 'Scenario',
    question: 'Agent A achieves high reward with B but fails when paired with C. What might this reveal?',
    answer: [
      { p: '**Partner dependence.**' },
      { p: 'High reward may reflect specialization rather than general cooperation, so the agent fails when paired with a different partner.' },
    ],
  },
  {
    id: 'teamwork-vs-habits',
    type: 'Distinction',
    question: "What is the difference between learning general teamwork and learning one partner's habits?",
    answer: [
      { p: 'General teamwork transfers across different partners and behaviours.' },
      { p: "Learning one partner's habits can produce strong familiar-partner performance but poor generalization." },
    ],
  },
  {
    id: 'diversity',
    type: 'Concept',
    question: 'Why can training with diverse partners improve partner generalization?',
    answer: [
      { p: 'Different partners expose the agent to varied behaviours and conventions.' },
      { p: 'This reduces the opportunity to rely on one fixed partner strategy.' },
    ],
  },
  {
    id: 'agent-modelling',
    type: 'Concept',
    question: 'What is agent modelling, and why can it help adaptation?',
    answer: [
      { p: 'Agent modelling means inferring useful properties of another agent from its behaviour or interaction history.' },
      { p: 'The inferred information can help the agent adjust its own actions.' },
    ],
  },
  {
    id: 'partner-estimate',
    type: 'Equation',
    question: 'What does this represent?',
    front: String.raw`\hat{p}_t = P(\text{FETCH} \mid h_t)`,
    answer: [
      { p: 'The estimated probability that the partner will choose FETCH, given the interaction history $h_t$.' },
      { terms: [
        { tex: String.raw`h_t`, is: 'everything observed about the partner so far' },
        { tex: String.raw`\hat{p}_t`, is: 'the current belief, updated as evidence arrives' },
      ] },
    ],
  },
  {
    id: 'adaptation-loop',
    type: 'Intuition',
    question: 'How does the Observe, Infer, Adjust, Cooperate loop describe adaptation?',
    answer: [
      { p: 'The agent:' },
      { ul: [
        "observes the partner's behaviour;",
        'infers something about the partner;',
        'adjusts its own strategy;',
        'uses that adjustment to cooperate more effectively.',
      ] },
    ],
  },
  {
    id: 'ad-hoc',
    type: 'Concept',
    question: 'What is ad hoc teamwork?',
    answer: [
      { p: 'Ad hoc teamwork studies how an agent can cooperate with partners without relying on prior coordination with those specific agents.' },
    ],
  },
  {
    id: 'zero-shot',
    type: 'Concept',
    question: 'What is zero-shot coordination?',
    answer: [
      { p: 'Zero-shot coordination evaluates whether agents that were not trained together can cooperate successfully when paired for the first time.' },
    ],
  },
  {
    id: 'crossplay',
    type: 'Equation',
    question: 'What do cross-play and the generalization gap help us understand?',
    front: String.raw`\Delta_{\text{gen}} = J_{\text{familiar}} - J_{\text{unseen}}`,
    answer: [
      { p: 'Cross-play evaluates how policies perform with different partners, especially unfamiliar pairings.' },
      { p: 'The gap compares familiar-partner and unseen-partner performance. A larger gap suggests stronger dependence on familiar partners or conventions.' },
      { note: '$\\Delta_{\\text{gen}}$ is a teaching diagnostic used in this resource, not a canonical MARL metric.' },
    ],
  },
];

/* --------------------------------------------------------------- Frontier */

const frontier: Card[] = [
  {
    id: 'llm-as-agent',
    type: 'Frontier',
    question: 'How can an LLM be viewed as an agent in an interactive system?',
    answer: [
      { p: 'An LLM can be viewed as a policy that receives information, such as a prompt or interaction history, and produces an action, such as a natural-language response or tool action.' },
    ],
  },
  {
    id: 'llm-mapping',
    type: 'Frontier',
    question: 'What might correspond to the observation, policy, action, and reward for an LLM agent?',
    answer: [
      { ul: [
        '**Observation:** prompt, local context, messages, or interaction history',
        '**Policy:** the LLM',
        '**Action:** generated response or tool action',
        '**Reward:** a task or collaboration score',
      ] },
      { p: 'The exact mapping depends on the system being studied.' },
    ],
  },
  {
    id: 'orchestrated-vs-learned',
    type: 'Distinction',
    question: 'What is the difference between orchestrated LLM collaboration and learned collaboration?',
    answer: [
      { p: 'In orchestrated collaboration, designers specify roles, communication patterns, or interaction workflows.' },
      { p: 'In learned collaboration, agent behaviour is optimized toward a collaborative objective through learning.' },
    ],
  },
  {
    id: 'why-marl-applies',
    type: 'Frontier',
    question: 'Why do coordination, communication, and credit assignment remain relevant when several LLM agents share one objective?',
    answer: [
      { p: 'Their outputs may need to fit together, agents may possess different information, and a shared outcome may not reveal which agent or interaction contributed most to success.' },
    ],
  },
  {
    id: 'open-questions',
    type: 'Frontier',
    question: 'What new research questions arise when LLM agents must cooperate with unfamiliar agents or larger agent societies?',
    answer: [
      { p: 'Important questions include:' },
      { ul: [
        'how cooperation transfers to new models or partners;',
        'how agents develop and share conventions;',
        'how communication should scale;',
        'how shared resources or objectives should be managed;',
        'how collective behaviour should be evaluated as agent populations grow.',
      ] },
    ],
  },
];

/* ------------------------------------------------------------------ decks */

export const DECKS: Deck[] = [
  {
    slug: 'background',
    title: 'Background',
    label: 'Background',
    blurb: 'The model everything else is built on.',
    topics: ['Policies', 'Joint actions', 'States and observations', 'Partial observability', 'Shared rewards'],
    chapter: '/background/reinforcement-learning/',
    cards: background,
  },
  {
    slug: 'coordinate',
    title: 'Coordinate',
    label: 'Coordinate',
    blurb: 'Making separate decisions combine well.',
    topics: ['Joint actions', 'Non-stationarity', 'CTDE', 'Credit assignment', 'VDN and QMIX'],
    chapter: '/coordinate/introduction/',
    cards: coordinate,
  },
  {
    slug: 'communicate',
    title: 'Communicate',
    label: 'Communicate',
    blurb: 'Moving information to the agent whose decision it changes.',
    topics: ['Messages as actions', 'Message content', 'Capacity and noise', 'Communication cost', 'Learned protocols'],
    chapter: '/communicate/introduction/',
    cards: communicate,
  },
  {
    slug: 'adapt',
    title: 'Adapt',
    label: 'Adapt',
    blurb: 'Cooperating with partners you did not train with.',
    topics: ['Partner dependence', 'Training diversity', 'Agent modelling', 'Ad hoc teamwork', 'Cross-play'],
    chapter: '/adapt/introduction/',
    cards: adapt,
  },
  {
    slug: 'frontier',
    title: 'LLMs as Cooperative Agents',
    label: 'Frontier',
    blurb: 'Where the same ideas are heading next.',
    topics: ['LLMs as agents', 'Orchestrated and learned collaboration', 'Dec-POMDP mapping', 'Shared rewards and CTDE', 'Open questions'],
    chapter: '/frontier/llm-agents/',
    cards: frontier,
  },
];

export function findDeck(slug: string): Deck | undefined {
  return DECKS.find((d) => d.slug === slug);
}

/**
 * A deck by slug, or a build failure.
 *
 * MDX expressions are parsed as plain JavaScript, so a page cannot write
 * `findDeck('x')!` to satisfy the type. This returns a non-optional Deck and
 * throws on an unknown slug, which fails the build rather than rendering an
 * empty grid nobody notices.
 */
export function deckOf(slug: string): Deck {
  const deck = findDeck(slug);
  if (!deck) {
    throw new Error(
      `No flashcard deck "${slug}". Known decks: ${DECKS.map((d) => d.slug).join(', ')}`,
    );
  }
  return deck;
}

/** Total across every deck. Used on the index so the count cannot drift. */
export const TOTAL_CARDS = DECKS.reduce((n, d) => n + d.cards.length, 0);
