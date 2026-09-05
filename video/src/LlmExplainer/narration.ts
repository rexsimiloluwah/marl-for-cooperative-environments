/**
 * LLMs AS COOPERATIVE AGENTS
 *
 * The second explainer. Where the core video builds cooperative MARL from
 * scratch, this one carries those ideas to language models and then to
 * populations of them.
 *
 * SOURCING. Four papers are named on screen or in the narration, and all four
 * were checked at the publisher before a word was written:
 *
 *   Liu, S., Liang, Z., Lyu, X., Amato, C. "LLM Collaboration with Multi-Agent
 *     Reinforcement Learning." AAAI-26, Vol. 40 No. 38. Proposes MAGRPO,
 *     formulates the problem as a Dec-POMDP, evaluates on writing and coding.
 *   Park, C., Han, S., Guo, X., Ozdaglar, A., Zhang, K., Kim, J-K. "MAPoRL:
 *     Multi-Agent Post-Co-Training for Collaborative Large Language Models
 *     with Reinforcement Learning." ACL 2025, Long Papers.
 *   Wang, X. et al. "Agentopia: Long-Term Life Simulation and Learning in
 *     Agent Societies." arXiv:2606.07513. 100 agents, 10 simulated years.
 *
 * Nothing beyond what those papers state is presented as a result. Where the
 * video speculates, the narration says so in as many words.
 */

export type Section = 'Opening' | 'Formalism' | 'MAGRPO' | 'Applications' | 'Frontier';

export type LlmSceneSpec = {
  id: string;
  title: string;
  section: Section;
  durationSeconds: number;
  question: string;
  narration: string;
  captioned?: boolean;
  /**
   * Hold the heading back for this many seconds. The storyboard asks for three
   * scenes that build the picture before the concept is named.
   */
  headingDelaySeconds?: number;
  /** A publisher-checked attribution, shown small and low in the frame. */
  sourceNote?: string;
};

export const scenes: LlmSceneSpec[] = [
  /* ---------------------------------------------------------------- */
  /* Opening: one model becomes a team                                 */
  /* ---------------------------------------------------------------- */
  {
    id: '01-working-alone',
    title: 'What Happens When LLMs Stop Working Alone?',
    section: 'Opening',
    durationSeconds: 40,
    question: 'Why would you use more than one model at all?',
    narration:
      'Most of our experience with large language models starts with a single model. We give it a task. It reasons, writes, codes, or calls a tool. Then we evaluate what it produced, on its own, against the task we set. But increasingly there is another possibility. Instead of asking one model to solve the entire problem, several LLM agents work on it together. And once we do that, a new question appears, one that no single-model benchmark was built to answer. How do we make the team intelligent, and not just the individual models?',
  },
  {
    id: '02-one-to-team',
    title: 'From One LLM to a Team',
    section: 'Opening',
    durationSeconds: 35,
    question: 'What does splitting the work actually change?',
    narration:
      'Imagine a coding task. One model could try to solve all of it alone. Or several agents could each contribute a different piece. One investigates the problem and works out what is actually being asked. Another proposes an implementation. A third checks the result and reports what broke. Now the quality of the final answer depends on two things, not one: what each model can do, and how well their separate contributions fit together.',
  },
  {
    id: '03-who-designs',
    title: 'Who Designs the Collaboration?',
    section: 'Opening',
    durationSeconds: 40,
    question: 'Where does the structure of a multi-agent system come from?',
    headingDelaySeconds: 13,
    narration:
      'One common approach is to design the collaboration ourselves. We assign the roles. We decide who talks to whom, and in what order they take their turns. We might create a planner, a coder, a reviewer, a critic, or a verifier, and wire them together by hand. The models do collaborate, and the results can be good. But notice where the structure came from. Almost all of it came from us. This is usually called an orchestrated, or prompt-based, multi-agent system, and the underlying models are never changed.',
  },
  {
    id: '04-can-it-be-learned',
    title: 'Can Collaboration Be Learned?',
    section: 'Opening',
    durationSeconds: 35,
    question: 'What if the structure were the thing being learned?',
    narration:
      'But what if we do not want to specify every useful collaborative behaviour by hand? Could the agents learn, from experience, how to contribute toward a shared objective? The question changes. It stops being how do we make each model better, and becomes how do we make several models better at working together. That is a different target, and it is where cooperative multi-agent reinforcement learning becomes especially interesting.',
  },
  {
    id: '05-marl-connection',
    title: 'The Cooperative MARL Connection',
    section: 'Opening',
    durationSeconds: 35,
    question: 'Which problems from the course carry over?',
    narration:
      'If you have followed the rest of this course, these problems should look familiar. Coordination asks how individual actions combine into a useful joint outcome. Communication asks what information the agents should exchange, and what it costs to exchange it. Adaptation asks whether cooperation survives when partners or conventions change. The agents are language models now, rather than gridworld robots, but the underlying cooperative problems have not gone anywhere.',
  },

  /* ---------------------------------------------------------------- */
  /* Formalism: the model as a policy                                  */
  /* ---------------------------------------------------------------- */
  {
    id: '06-llms-as-agents',
    title: 'LLMs as Agents',
    section: 'Formalism',
    durationSeconds: 45,
    question: 'What is the policy, and what is the action?',
    sourceNote: 'Liu, Liang, Lyu & Amato, AAAI-26',
    narration:
      'Recent research makes this connection explicit. Liu, Liang, Lyu and Amato, at the AAAI conference in twenty twenty-six, formulate LLM collaboration as a cooperative multi-agent reinforcement learning problem, using a decentralised partially observable Markov decision process. Read it component by component. The model receives local information: its instructions, and its own interaction history. The model itself acts as the policy. Its action is the response it generates. Several responses together form a joint action, and the environment, which may be a user, a tool, or an external system, can change as a result.',
  },
  {
    id: '07-actions-are-language',
    title: 'When Actions Are Language',
    section: 'Formalism',
    durationSeconds: 35,
    question: 'What breaks when an action is a paragraph?',
    headingDelaySeconds: 11,
    sourceNote: 'Liu, Liang, Lyu & Amato, AAAI-26',
    narration:
      'But there is an important difference from the environments earlier in this course. In classic multi-agent settings an action is compact. Move left. Choose channel three. Pick up the object. You can enumerate the choices. For a language model an action can be an entire natural-language response, so the action space is effectively unbounded, and so is the observation space. The same joint action notation still applies. What changed is what each element contains.',
  },
  {
    id: '08-credit-returns',
    title: 'Who Gets Credit for a Team Outcome?',
    section: 'Formalism',
    durationSeconds: 40,
    question: 'What does one shared score tell each model?',
    headingDelaySeconds: 14,
    narration:
      'Suppose two LLM agents jointly solve a coding task. One proposes a plan. The other produces the implementation. The finished program passes its tests, so the team receives a positive reward. But what exactly should each model learn from that single number? Was the plan responsible for the success? Did the implementation quietly correct a weak plan? Was neither contribution useful without the other? Nothing in the reward distinguishes these. The credit assignment problem you met in the coordination chapter has returned, unchanged, with language models in place of the agents.',
  },

  /* ---------------------------------------------------------------- */
  /* MAGRPO: learning from joint behaviour                             */
  /* ---------------------------------------------------------------- */
  {
    id: '09-magrpo',
    title: 'MAGRPO: Learning from Joint Behaviours',
    section: 'MAGRPO',
    durationSeconds: 45,
    question: 'What does the algorithm actually sample?',
    sourceNote: 'Liu, Liang, Lyu & Amato, AAAI-26',
    narration:
      'So one recent idea is to stop judging a single response in isolation, and compare whole joint behaviours against each other instead. That is MAGRPO, from the same AAAI paper. At each turn the agents generate not one response but a group of them. Responses from different agents combine into joint actions, so a group of samples becomes a group of complete team attempts. The system evaluates those joint behaviours and produces joint rewards. The shift is subtle and it matters. Instead of asking only whether one response was good in isolation, the learning signal can ask how an entire joint behaviour performed relative to the alternatives the team also sampled.',
  },
  {
    id: '10-group-relative-advantage',
    title: 'Group-Relative Advantage',
    section: 'MAGRPO',
    durationSeconds: 45,
    question: 'What is the baseline, and where does it come from?',
    sourceNote: 'Liu, Liang, Lyu & Amato, AAAI-26',
    narration:
      'So how do you turn a group of attempts into a learning signal? By comparison. Take the return of one sampled joint behaviour, and subtract the average return across the whole group of samples. If that team behaviour performed above the group reference, its advantage is positive, and the update makes it more likely. If it performed below, the advantage is negative. Notice what this avoids. The reference comes from the group itself, so MAGRPO obtains a centralised advantage estimate from group-based Monte Carlo returns, without training a separate large centralised value model alongside the agents.',
  },
  {
    id: '11-train-together-act-alone',
    title: 'Train Together, Act Independently',
    section: 'MAGRPO',
    durationSeconds: 30,
    question: 'What is available at training but not at execution?',
    sourceNote: 'Liu, Liang, Lyu & Amato, AAAI-26',
    narration:
      'But notice what that signal is about. It is about the team, while each model still has to act alone. Which brings back centralised training with decentralised execution. Training uses information about how the team performed together. But at execution time each model still generates its own response from its own local history, with no access to what the others are doing. Train with the team; act as an individual agent. MAGRPO combines centralised group-relative advantages with decentralised execution.',
  },
  {
    id: '12-beyond-one-algorithm',
    title: 'Beyond One Algorithm',
    section: 'MAGRPO',
    durationSeconds: 30,
    question: 'Is this one method or a direction?',
    sourceNote: 'Park et al., ACL 2025',
    narration:
      'MAGRPO is one approach, not the whole frontier. MAPoRL, published at the Association for Computational Linguistics in twenty twenty-five, also asks how multiple language models can be co-trained for collaboration. Its agents first produce responses, then discuss them, and a verifier scores the final result. Those scores become the reward for multi-agent reinforcement learning. The broader shift is what matters here: collaboration itself is becoming an object of learning.',
  },

  /* ---------------------------------------------------------------- */
  /* Applications: why any of this matters                             */
  /* ---------------------------------------------------------------- */
  {
    id: '13-where-it-matters',
    title: 'Where Could Cooperative LLM Agents Matter?',
    section: 'Applications',
    durationSeconds: 15,
    question: 'Which real problems have this shape?',
    narration:
      'Why does this matter beyond an interesting algorithm? Because many genuinely difficult problems already contain multiple roles, interdependent decisions, and a single shared outcome.',
  },
  {
    id: '14-software-engineering',
    title: 'Software Engineering Becomes a Team Problem',
    section: 'Applications',
    durationSeconds: 40,
    question: 'Why is a good implementation not enough?',
    sourceNote: 'Coding is one of two domains evaluated in Liu et al., AAAI-26',
    narration:
      'Start with the one closest to home. Real development is more than producing one code completion. A system has to be understood, planned, implemented, tested, debugged, and reviewed. Different agents could take different parts of that process. But once the work is distributed, their decisions have to stay compatible. A brilliant implementation is not useful if it solves the wrong plan. A reviewer is not useful if its feedback cannot influence the next action. The final software is shared, so the work has to coordinate. Coding is one of the two domains the MAGRPO paper evaluates.',
  },
  {
    id: '15-scientific-team',
    title: 'Can LLM Agents Reason Like a Scientific Team?',
    section: 'Applications',
    durationSeconds: 40,
    question: 'What would specialisation buy a reasoning system?',
    narration:
      'But software is only one shape this takes. Scientific reasoning is already collaborative by nature. One agent might propose a hypothesis. Another could search for evidence that contradicts it. Another could challenge the assumptions being made. Another might operate an instrument, or suggest the next experiment to run. Be careful about the claim here. The interesting question is not whether today’s LLM teams have solved scientific discovery, because they have not. The question is whether useful scientific reasoning benefits from agents that can specialise, disagree productively, share evidence, and revise one another’s decisions.',
  },
  {
    id: '16-shared-resources',
    title: 'Shared Resources Force Coordination',
    section: 'Applications',
    durationSeconds: 40,
    question: 'What happens when every agent wants the same thing?',
    narration:
      'And whatever the work is, the agents share what they run on. They share graphics processors, interfaces, databases, tools, bandwidth, memory, and time. If every agent greedily requests the same resource, the whole system becomes slow, or expensive, or both. Someone has to wait. Work has to be scheduled. Agents may need to say what they need and when they need it. And the familiar cooperative question appears again, in a new setting: how should local decisions combine to produce a good system-wide outcome? Collective intelligence still has collective constraints.',
  },
  {
    id: '17-agent-societies',
    title: 'When LLM Teams Become Agent Societies',
    section: 'Applications',
    durationSeconds: 60,
    question: 'What changes at a hundred agents rather than three?',
    headingDelaySeconds: 18,
    sourceNote: 'Agentopia, Wang et al., arXiv:2606.07513',
    narration:
      'So far this has been a team: two agents, three, maybe five. But what if the system keeps growing? What if the system is no longer a team of two or three agents? What happens when there are dozens, or hundreds, interacting over long periods? Agentopia is one recent example. It simulates one hundred language-model agents over ten simulated years, with agents pursuing goals, forming social relationships, and accumulating long-term social experience. At that scale the questions start to look different. How do conventions spread through a population? Who trusts whom, and on what evidence? How does information move? Can a newcomer adapt to a society that already has its own habits? Can thousands of local interactions produce collective behaviour that no single agent intended? At the far end of this idea we might informally imagine agent civilisations. That is not a settled technical category. It is a way of describing the scale of the question.',
  },

  /* ---------------------------------------------------------------- */
  /* Frontier: what is unresolved                                      */
  /* ---------------------------------------------------------------- */
  {
    id: '18-what-remains',
    title: 'What Still Has to Be Solved?',
    section: 'Frontier',
    durationSeconds: 55,
    question: 'Which problems are genuinely open?',
    sourceNote: 'Open challenges noted in Liu et al., AAAI-26',
    narration:
      'At that scale the familiar problems come back larger, and far less settled. Coordination: how should agents divide the work, and how do we stop individually sensible actions from combining badly? Communication: what should agents tell one another, and how much context is useful before communication becomes expensive noise? Credit assignment: how should one shared outcome update many policies, across many turns? Adaptation: can an agent cooperate with models or conventions it never encountered during training? Scalability: what changes when a small team becomes a large population? And evaluation, which may be the hardest of all. How do we distinguish genuine collaboration from simply making more model calls and spending more compute? The MAGRPO paper itself flags representation and training-paradigm choices as open challenges. These are the questions that make this a frontier rather than a recipe.',
  },
  {
    id: '19-key-takeaways',
    title: 'Key Takeaways',
    section: 'Frontier',
    durationSeconds: 40,
    question: 'What should you carry out of this chapter?',
    narration:
      'Four ideas are worth carrying forward. First, a language model can be modelled as an agent, when it receives information, produces actions, and affects an environment that evolves. Second, several capable models do not automatically make a capable team. Collaboration introduces coordination, communication, credit assignment, and adaptation problems that individual capability does not solve. Third, cooperative multi-agent reinforcement learning gives us a framework for learning from team outcomes, rather than reasoning only about isolated models. And fourth, the scale may keep growing, from pairs of models, to teams, to persistent populations of interacting agents.',
  },
  {
    id: '20-questions-forward',
    title: 'Questions to Carry Forward',
    section: 'Frontier',
    durationSeconds: 40,
    question: 'Where does the settled knowledge stop?',
    captioned: false,
    narration:
      'So, as you think about where this research could go, consider four questions, and give each one a moment before moving to the next. Should collaboration be designed, learned, or both? How should a single shared outcome shape many separate policies, across many turns? Can a language model cooperate with agents, and with conventions, that it has never encountered before? And what happens when a team of LLM agents becomes a society? That last question does not have an answer yet. It is worth sitting with rather than closing.',
  },
  {
    id: '21-final-frame',
    title: 'LLMs as Cooperative Agents',
    section: 'Frontier',
    durationSeconds: 15,
    question: 'What is the frontier actually about?',
    captioned: false,
    narration:
      'The frontier may not only be about building one more capable model. It may also be about learning how many models can work together.',
  },
  {
    id: '22-sign-off',
    title: "And That's It",
    section: 'Frontier',
    durationSeconds: 12,
    question: 'Anything left to say?',
    captioned: false,
    narration:
      'And that is it. One model was never the ceiling. The interesting part is what several of them can learn to do together. Thank you for watching.',
  },
];
