import type {Caption} from '@remotion/captions';

export type Chapter = 'Background' | 'Coordinate' | 'Communicate' | 'Adapt' | 'Synthesis';

export type SceneSpec = {
  id: string;
  title: string;
  chapter: Chapter;
  durationSeconds: number;
  question: string;
  narration: string;
  captioned?: boolean;
  /**
   * Hold the heading back for this many seconds, so the visual makes the point
   * before the concept is named. Used by the intuition-first scenes.
   */
  headingDelaySeconds?: number;
};

export const scenes: SceneSpec[] = [
  {
    id: '01-opening-question',
    title: 'How do multiple agents learn to work together?',
    chapter: 'Background',
    durationSeconds: 36,
    question: 'What changes when learning becomes a team sport?',
    narration:
      'A restaurant kitchen during dinner service. One cook reaches for a plate, while another carries a hot pan across the room. A third is watching the timer. Every person there can act on their own, but the meal only reaches the table if those actions fit together. Multi-agent reinforcement learning asks the same question. How can several decision makers learn behaviour that succeeds as a group? We will build the answer in four moves: understand the setting, coordinate actions, communicate what is useful, and adapt to new partners.',
  },
  {
    id: '02-policy',
    title: 'Policies',
    chapter: 'Background',
    durationSeconds: 35,
    question: 'What does one learning agent actually learn?',
    narration:
      'Start with one agent. At time t, the agent receives an observation, such as a nearby counter, an open doorway, or the position of a teammate. Its policy maps that observation to a distribution over actions. It might move, wait, pick something up, or place something down. Learning adjusts the policy so that actions leading to higher future reward become more likely. The compact notation is simple: action a t is sampled from policy pi, conditioned on observation o t.',
  },
  {
    id: '03-multi-agent',
    title: 'What changes with a second agent?',
    chapter: 'Background',
    durationSeconds: 40,
    question: 'Why is a team more than several solo learners?',
    narration:
      'So that is one agent, learning alone. Now put a second one beside it, and something breaks. Each policy still chooses its own action, privately. But the environment does not receive two actions. It receives one joint action: a single choice from every teammate at the same moment. What happens next depends on the combination. Moving toward a doorway is smart if your partner steps aside, and disastrous if you both go together. The other learners are now part of the dynamics.',
  },
  {
    id: '04-state-observation',
    title: 'States and Observations',
    chapter: 'Background',
    durationSeconds: 45,
    question: 'What can an agent know from a partial observation?',
    narration:
      'But that already assumes something generous: that each agent can see what it needs to see. It usually cannot. The full state holds everything relevant, every location, every object, the task\'s progress. An individual agent observes a slice of it. A wall blocks its view. A sensor has limited range. A teammate knows a station is ready while this agent does not. We write agent i\'s observation as a function of the state. So coordination has to happen without shared evidence. And this is not something better sensors would fix. In most real systems the information is genuinely distributed, so a partial view is the problem itself, not a flaw in the setup.',
  },
  {
    id: '05-shared-reward',
    title: 'Shared Reward',
    chapter: 'Background',
    durationSeconds: 40,
    question: 'How does a team objective change individual behavior?',
    narration:
      'So they see different things. What they share is the score. In a cooperative task every agent receives the same team reward. Completing an order earns a positive signal. Blocking a corridor delays it for everyone. The objective is the expected sum of future shared rewards. But notice what that aligns, and what it does not. It aligns the destination. It says nothing about the route. A shared score tells the team it succeeded, never how each member contributed.',
  },
  {
    id: '06-coordination-intuition',
    title: 'Why did they collide?',
    chapter: 'Coordinate',
    durationSeconds: 60,
    question: 'How can agents choose actions that fit together?',
    narration:
      'So the destination is shared and the route is not. That is where coordination starts: each agent choosing with the others in mind. Picture two narrow ways around a counter. Either works if the team agrees, and a mismatch is a collision. One agent has to predict what its partner will do, while knowing the partner is predicting right back. Repeated interaction can harden into a convention. Keep left. Divide the stations. Let the carrying agent pass first. So the thing worth finding is not an isolated best action. It is a compatible joint action, and good teamwork is local decisions that reliably assemble into a working global pattern. And notice what the agents are not doing. Nobody is negotiating. Nobody is issuing instructions. Each one is choosing alone, so the coordination has to be a property of what they separately learned.',
  },
  {
    id: '07-scaling',
    title: 'Joint Action Space',
    chapter: 'Coordinate',
    durationSeconds: 40,
    question: 'Why does adding agents make search difficult?',
    narration:
      'But how hard is it to find a compatible joint action? Count them. Give each agent k actions. One agent, k choices. Two agents, k squared. With n agents, the joint space is k to the n. Even a modest team is a large combinatorial search, most of it unhelpful, and the useful combinations can depend on precise timing. So coordination cannot be brute force. It needs structure: some way to learn which interactions matter without testing every joint move in every situation.',
  },
  {
    id: '08-independent-learning',
    title: 'Independent Learning',
    headingDelaySeconds: 5,
    chapter: 'Coordinate',
    durationSeconds: 45,
    question: 'What breaks when every agent learns alone?',
    narration:
      'So what is the simplest structure we could try? Give each agent its own value function, and treat the teammates as part of the environment. That is independent learning, and it is appealingly simple and fully decentralized. But there is a catch. While one agent is learning, the others are changing too. As a teammate updates its policy, the consequences of your action shift underneath you. An action that worked yesterday fails today, for reasons the learner cannot observe. The environment has stopped being stationary. Which breaks the assumption almost every single-agent algorithm rests on. Replay data goes stale, and the learner cannot even observe the cause.',
  },
  {
    id: '09-centralized-decentralized',
    title: 'Centralized Training',
    chapter: 'Coordinate',
    durationSeconds: 50,
    question: 'When should teammates share information?',
    narration:
      'So what if training could know more than execution does? Look at the two extremes first. Fully decentralized learning uses only local experience, both while training and while acting. Fully centralized control sees the global state and picks the entire joint action, but that controller may be unavailable, or too fragile, at deployment. Cooperative MARL usually separates the phases instead. While training, a learner may inspect the global state, every action, and the team reward. While executing, each policy acts from its own observation. Richer evidence for learning, and no central controller at test time.',
  },
  {
    id: '10-ctde',
    title: 'Centralized Training with Decentralized Execution',
    chapter: 'Coordinate',
    durationSeconds: 45,
    question: 'How does CTDE connect global learning to local action?',
    narration:
      'That separation has a name: centralized training with decentralized execution, or CTDE. A centralized critic evaluates the joint situation while individual actors learn policies on local observations. Then, at deployment, the critic simply disappears, and each agent runs its own decentralized policy. CTDE is not one algorithm. It is a design principle that many algorithms use. And the question it leaves open is how privileged training information should shape policies that still have to decide with far less.',
  },
  {
    id: '11-credit-assignment',
    title: 'Credit Assignment',
    headingDelaySeconds: 6,
    chapter: 'Coordinate',
    durationSeconds: 35,
    question: 'How can one team reward teach several agents?',
    narration:
      'CTDE gives training more information. But a shared reward still leaves one question unanswered: who contributed what? If the team succeeds, which choices made the difference? Perhaps one agent delivered the final item, but another cleared the path, and a third prepared the station. Reward only the visible final action and you miss the support work. Give identical credit to everything recent and the signal becomes noise. So we need to connect individual decisions to their contribution, without pretending the success was not joint.',
  },
  {
    id: '12-vdn',
    title: 'Value Decomposition Networks',
    chapter: 'Coordinate',
    durationSeconds: 45,
    question: 'Can a team value be decomposed into local pieces?',
    narration:
      'So if the team has one value, can we write that value in pieces, one for each agent? Value Decomposition Networks do exactly that. The team action value becomes the sum of one utility per agent, each depending only on that agent\'s own action and history. During training, a shared temporal difference error updates all the utilities together. During execution, every agent greedily takes its highest local utility, and the sum is what makes that consistent with the team value. But the sum is also the limit. Some interactions are simply not additive.',
  },
  {
    id: '13-qmix',
    title: 'QMIX',
    chapter: 'Coordinate',
    durationSeconds: 40,
    question: 'How can mixing be flexible and still support local decisions?',
    narration:
      'So VDN uses the simplest mixer there is: addition. But what if the relationship between individual values and team value is richer than a sum? QMIX replaces the fixed sum with a learned mixing network, combining the individual utilities using the global state during training. To keep decentralized greedy action valid, it enforces one constraint: raising any agent\'s utility can never lower the team value. That buys nonlinear combinations while keeping local choices aligned with the joint one. Useful, and still a restriction on what can be represented.',
  },
  {
    id: '14-why-communication',
    title: 'What is Agent B missing?',
    chapter: 'Communicate',
    durationSeconds: 50,
    question: 'When does a message change the best action?',
    narration:
      'So now the agents can choose actions that fit together. But that assumed they know enough to decide. What if they know different things? Back in the kitchen. One agent can see that an ingredient is ready. The other is waiting at the serving station, and cannot. Without a message, the second has to infer progress from movement, or memory, or guesswork. A message can hand over exactly the missing fact. Ready now. Route blocked. I will carry. Notice what the message does, and what it does not. It moves nothing. It completes nothing. It only changes what the other agent knows before choosing. So its whole value is whether that changes the decision.',
  },
  {
    id: '15-messages-actions',
    title: 'What exactly did the agent choose?',
    headingDelaySeconds: 6,
    chapter: 'Communicate',
    durationSeconds: 45,
    question: 'How can agents learn what to say and what to do?',
    narration:
      'So a message can change what a teammate knows. That makes it a decision, not a side channel. A communicating agent now selects two things: an environment action, and a message. Its effective action space is the product of the two. The message might be a discrete symbol, a short bit string, or a continuous vector, produced by a function of the agent\'s own observation. Teammates condition their policies on whatever arrives. Training has to discover both behaviors at once. And those two are coupled. A protocol only carries meaning if teammates respond to it, and responding is only worth learning if the protocol is stable. Neither half is any use alone.',
  },
  {
    id: '16-capacity',
    title: 'Message Capacity',
    headingDelaySeconds: 7,
    chapter: 'Communicate',
    durationSeconds: 35,
    question: 'How much can a short message express?',
    narration:
      'So the team has two behaviors to learn at once. But before either of them, how much can a message actually say? If a message carries b bits, the channel can distinguish two to the b symbols. One bit separates two situations. Three bits, eight. That limit forces the agents to compress, and a good protocol keeps the distinctions the task needs rather than every detail of an observation. More bandwidth is not automatically better. It also lets agents overfit to one partner, or say very little at length.',
  },
  {
    id: '17-cost-failure',
    title: 'Was that message worth sending?',
    chapter: 'Communicate',
    durationSeconds: 45,
    question: 'What happens when communication is not free?',
    narration:
      'And a bigger message space is not free. What if every message costs something? We can model that by subtracting lambda times the message cost from the task reward. But cost is not the only problem. What if the message never arrives? What if it is corrupted on the way? What if it comes too late to matter? Train assuming a perfect channel, and the team collapses when the channel changes. So a robust agent speaks when the information is worth it, and still acts sensibly when nothing arrives. Reliability is part of the learning problem, not something to bolt on afterwards.',
  },
  {
    id: '18-learned-protocols',
    title: 'Learned Communication Protocols',
    headingDelaySeconds: 9,
    chapter: 'Communicate',
    durationSeconds: 45,
    question: 'How can arbitrary symbols acquire shared meaning?',
    narration:
      'So messages have a cost, and a capacity. What they do not need is our vocabulary. Suppose an agent observes task status and emits one of four symbols. Through repeated reward, symbol two comes to trigger wait, and symbol three, deliver. Nobody assigned those meanings. The symbols earned them, because those pairings kept paying off. That is powerful, and it is relational. The meaning lives in the pairing, not in the symbol, so a protocol one partner understands may be noise to another. So the right question is not whether communication raised the training return. It is whether the meaning survives a change of listener.',
  },
  {
    id: '19-partner-dependence',
    title: 'Partner Dependence',
    headingDelaySeconds: 8,
    chapter: 'Adapt',
    durationSeconds: 50,
    question: 'Why can strong training performance hide fragile teamwork?',
    narration:
      'And that is exactly what happens. Through repeated self-play, the agents adapt to each other, developing a precise role split, a timing convention, a private code. Performance with familiar partners becomes excellent. But the policy may have learned those conventions rather than the task. Swap in a teammate who approaches from the other side, or uses a different signal, and it falls apart. The message is the same. The partner is not. A policy can overfit to its teammates exactly as a supervised model overfits to its examples. And it is easy to miss, because the number that would warn you looks excellent. Self-play return climbs while the thing you actually wanted, cooperation with someone new, quietly does not.',
  },
  {
    id: '20-partner-diversity',
    title: 'Training Partner Diversity',
    chapter: 'Adapt',
    durationSeconds: 35,
    question: 'How can training expose a policy to more ways of cooperating?',
    narration:
      'So if one partner is the problem, what happens if training exposes the agent to many? Train against a population: different routes, different roles, different communication styles, and randomize who turns up in each episode. A diverse population stops any single brittle convention from explaining every success. It pushes toward behavior that is legible and recoverable. It does not guarantee generalization, but it changes the problem from mastering one relationship to finding what survives across relationships.',
  },
  {
    id: '21-agent-modelling',
    title: 'Agent Modelling',
    chapter: 'Adapt',
    durationSeconds: 45,
    question: 'Can an agent infer how its current partner behaves?',
    narration:
      'Diversity helps. But the agent may still need to work out who it is dealing with right now. So let it carry a partner model. From the actions it observes, it estimates a latent description of the teammate: preferred route, likely role, how it answers a message. The policy then conditions on both the observation and that inferred description, and the belief updates as evidence arrives. Unfamiliar behavior becomes a state estimation problem, with the usual risk of reading noise as a trait. Infer too fast and one unusual move becomes a permanent belief. Infer too slowly and the episode is over before the model is any use.',
  },
  {
    id: '22-ad-hoc-zero-shot',
    title: 'Ad Hoc Teamwork',
    chapter: 'Adapt',
    durationSeconds: 40,
    question: 'Can agents cooperate without training together?',
    narration:
      'And if an agent can infer how a partner behaves, perhaps it can cooperate with one it never trained with. Ad hoc teamwork asks exactly that: join unfamiliar teammates, and coordinate online. Zero-shot coordination is stricter still, demanding it work immediately, with no extra learning and no briefing about how anyone was trained. Both favor conventions that are simple, observable and widely shared. Both test whether a policy learned the task, or memorized a relationship.',
  },
  {
    id: '23-generalization-diagnostic',
    title: 'The Generalization Gap',
    headingDelaySeconds: 5,
    chapter: 'Adapt',
    durationSeconds: 30,
    question: 'How can we compare familiar and unfamiliar teamwork?',
    narration:
      'So how would you tell those two apart, before deploying anything? Compare performance with training partners against performance with unseen ones, and divide the second by the first. A ratio near one means little was lost when the partner changed. A low ratio is partner dependence, measured. This is an intuitive classroom diagnostic rather than a canonical metric, so always report the underlying scores. One number cannot say why transfer succeeded or failed.',
  },
  {
    id: '24-cross-play',
    title: 'Cross-Play',
    chapter: 'Adapt',
    durationSeconds: 30,
    question: 'Which independently trained policies can cooperate?',
    narration:
      'And you can look at it pairwise. Cross-play takes policies that were trained separately, pairs them, and records the team return. The diagonal is the familiar pairings, self-play. The off-diagonal is whether the conventions transfer. In this illustrative matrix, the blue cells cooperate and the pale ones struggle. A model can have a bright diagonal and weak cross-play, which means every training run found a convention that worked, and none of them agreed.',
  },
  {
    id: '25-whole-story',
    title: 'The Whole Story',
    chapter: 'Synthesis',
    durationSeconds: 30,
    question: 'How do the four ideas form one learning story?',
    narration:
      'And the whole story connects. Coordination asks how local choices form a useful joint action. Communication lets agents exchange what observation alone cannot give them. Adaptation tests whether any of it survives a new partner. None of these is a separate module. Better information changes coordination, coordination shapes the protocols that get learned, and partner diversity decides whether the result generalizes.',
  },
  {
    id: '26-key-takeaways',
    title: 'Key Takeaways',
    chapter: 'Synthesis',
    durationSeconds: 60,
    question: 'What should you carry into the rest of the course?',
    narration:
      'Four things are worth carrying out of this. First, cooperative MARL optimizes joint behavior, even when execution stays decentralized. The thing being learned is the team\'s behavior, not a collection of individual ones. Second, CTDE uses global information during training to make local policies easier to learn, and value decomposition adds structure for assigning team value to individual choices. Third, communication is a learned decision under limits. Capacity, cost, delay and failure all shape what is worth saying, and a message earns its place only by changing what a teammate does. Fourth, evaluate beyond familiar partners. Self-play return can hide a brittle convention, which is why partner diversity, agent modelling and cross-play matter. The recurring question underneath all four is the same one. What information, and what structure, help local decisions become reliable teamwork?',
  },
  {
    id: '27-final-questions',
    title: 'Open Questions',
    chapter: 'Synthesis',
    durationSeconds: 40,
    question: 'Where does the settled knowledge stop?',
    captioned: false,
    narration:
      'Here is where the settled knowledge stops. These four questions do not have agreed answers. When does a single shared reward stop describing a real team? Value decomposition assumes team value factors into per-agent pieces, so what is lost when it does not? What should an agent say when the channel is far smaller than what it knows? And what evidence, gathered before deployment, would predict success with a partner never seen in training? Each one of these is an open research direction, and the ideas in this course are enough to begin working on them.',
  },
  {
    id: '28-final-frame',
    title: 'Learn together. Act together.',
    chapter: 'Synthesis',
    durationSeconds: 15,
    question: 'Ready to test the ideas?',
    captioned: false,
    narration: 'Now, let us put these ideas to work.',
  },
  {
    id: '29-sign-off',
    title: "And That's It",
    chapter: 'Synthesis',
    durationSeconds: 12,
    question: 'Anything left to say?',
    captioned: false,
    narration:
      'And that is it. You have the vocabulary now, and more importantly the questions that make it worth using. Thank you for watching, and good luck building your teams.',
  },
];

const splitIntoPhrases = (text: string, maxWords = 7) => {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const phrases: string[] = [];
  let current: string[] = [];

  for (const word of words) {
    current.push(word);
    const endsClause = /[,.?!:]$/.test(word);
    if (current.length >= maxWords || (endsClause && current.length >= 4)) {
      phrases.push(current.join(' '));
      current = [];
    }
  }

  if (current.length > 0) phrases.push(current.join(' '));
  return phrases;
};

export const captionsForScene = (scene: SceneSpec): Caption[] => {
  if (scene.captioned === false) return [];
  const phrases = splitIntoPhrases(scene.narration);
  const spokenWindowMs = Math.max(1000, (scene.durationSeconds - 3) * 1000);
  const totalWords = phrases.reduce((sum, phrase) => sum + phrase.split(' ').length, 0);
  let cursor = 1000;

  return phrases.map((phrase, index) => {
    const words = phrase.split(' ').length;
    const duration = (words / totalWords) * spokenWindowMs;
    const startMs = cursor;
    const endMs = index === phrases.length - 1 ? 1000 + spokenWindowMs : cursor + duration;
    cursor = endMs;
    return {
      text: phrase,
      startMs,
      endMs,
      timestampMs: startMs,
      confidence: null,
      pageBreakAfter: true,
    };
  });
};
