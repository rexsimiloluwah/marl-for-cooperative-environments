"""wireless_network_resource_allocation_marl_lab: the transfer lab."""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common import (md, code, keq, todo, solution, notebook, write,
                    install_cell, raw_url)

IMAGE = "public/images/wireless_network_resource_allocation_illustration.png"

C = []; A = C.append

A(md("# Cooperative Wireless Resource Allocation",
     "",
     "- Four access points share three channels. Their choices interfere.",
     "- Each one sees only local information, and demand is local information.",
     "- You will build up from a random baseline to a coordinated,",
     "  communicating system, then break it.",
     "- This is the transfer lab: it will not tell you which MARL concept you",
     "  are applying.",
     "",
     "**Time:** 45 to 60 minutes. **Compute:** free Colab CPU.",
     "",
     f'<img src="{raw_url(IMAGE)}" alt="Four access points share three '
     'channels. Access points 1 and 2 have both selected channel 1, so they '
     'interfere; access points 3 and 4 hold channels 2 and 3 alone. Each '
     'access point serves its own users." width="900" />',
     "",
     "*The problem, before any learning. Four access points, three channels,",
     "and two of them have made the same choice.*",
     "",
     "## Learning objectives",
     "",
     "- Formulate wireless resource allocation as a cooperative MARL problem.",
     "- Analyse how independent channel decisions create interference.",
     "- Evaluate whether coordination and communication improve the network.",
     "- Justify a deployment strategy using your own experimental evidence.",
     "",
     "> Exercises are marked `# TODO`. Completed code is in **Solutions** at the",
     "> end. The deployment decision is yours and is not answered there."))

A(md("## 0. Setup"))
A(md("### 0.1 Install dependencies"))
A(install_cell())

A(md("### 0.2 Import required libraries"))
A(code("import itertools",
       "import random",
       "",
       "import numpy as np",
       "import pandas as pd",
       "import matplotlib.pyplot as plt"))

A(md("### 0.3 Reproducibility and configuration"))
A(code("SEED = 42",
       "",
       "random.seed(SEED)",
       "np.random.seed(SEED)",
       "",
       "N_AGENTS = 4",
       "N_CHANNELS = 3",
       "EPISODES = 4000",
       "EVAL_EPISODES = 150",
       "",
       "plt.rcParams.update({'figure.dpi': 110, 'axes.grid': True,",
       "                     'grid.alpha': 0.3, 'axes.spines.top': False,",
       "                     'axes.spines.right': False})"))

A(md("### 0.4 Helper functions",
     "",
     "Imported from `cooperative_marl_labs`, so this notebook holds the",
     "experiment and not the infrastructure."))
A(code("from cooperative_marl_labs.envs import (",
       "    WirelessResourceAllocationEnv, achievable_rate, observation_layout,",
       "    extract_demand, extract_channel_quality, extract_interference,",
       "    extract_previous_channel)",
       "from cooperative_marl_labs.agents import (",
       "    RandomWirelessAgent, GreedyWirelessAgent)",
       "from cooperative_marl_labs.training import (",
       "    train_independent_q_learning, train_vdn, make_fixed_agents)",
       "from cooperative_marl_labs.evaluation import evaluate_agents",
       "from cooperative_marl_labs.visualization import (",
       "    render_wireless_network, plot_wireless_comparison)",
       "",
       "",
       "def grouped(index, series, title, ylabel, ceiling=None):",
       "    n = len(series); w = 0.8 / n; x = np.arange(len(index))",
       "    fig, ax = plt.subplots(figsize=(7.6, 3.2))",
       "    for k, (lab, vals) in enumerate(series.items()):",
       "        ax.bar(x + (k - (n - 1) / 2) * w, vals, w, label=lab)",
       "    if ceiling is not None:",
       "        ax.axhline(ceiling, ls='--', lw=1, color='grey')",
       "        ax.text(-0.45, ceiling + 0.05, 'ceiling', color='grey', fontsize=8)",
       "    ax.set_xticks(x); ax.set_xticklabels(index, rotation=15, ha='right')",
       "    ax.set_ylabel(ylabel); ax.set_title(title); ax.legend(fontsize=8)",
       "    plt.tight_layout(); plt.show()",
       "",
       "",
       "def show(env, actions, render=True):",
       "    o = env.outcome(actions)",
       "    for i, a in enumerate(actions):",
       "        share = '  <- sharing' if actions.count(a) > 1 else ''",
       "        print(f'  AP{i} -> ch {a}   demand {env.demand[i]:.1f}   '",
       "              f'got {o[\"per_ap_throughput\"][i]:.2f}{share}')",
       "    print(f'  throughput {o[\"total_throughput\"]:.2f}   '",
       "          f'interference {o[\"interference\"]:.2f}   '",
       "          f'reward {o[\"team_reward\"]:.2f}')",
       "    if render:",
       "        render_wireless_network(env, actions,",
       "                                title=f'reward {o[\"team_reward\"]:.2f}')",
       "        plt.tight_layout(); plt.show()",
       "    return o['team_reward']",
       "",
       "",
       "print('helpers ready')"))

A(md("### 0.5 Environment"))

A(keq("Achievable Rate",
      r"\text{rate}_i = \log_2\!\left(1 + \frac{q_i\,P}{\sigma^2 + I_i}\right)",
      [r"$q_i$ is the quality of the channel access point $i$ chose",
       r"$I_i$ is the interference it receives on that channel",
       r"$\sigma^2$ is the noise floor, $0.1$ here"],
      "Interference sits in the denominator, so the first close neighbour costs the most."),
  )

A(keq("Interference Coupling",
      r"I_i = \sum_{j \neq i} \mathbb{1}\!\left[a_j = a_i\right] \cdot "
      r"\frac{1}{1 + \left(d_{ij} / d_0\right)^2}",
      [r"$d_{ij}$ is the distance between access points $i$ and $j$",
       r"$d_0$ is the distance at which they couple at half strength"],
      "Only access points on the same channel interfere, and only nearby ones interfere much."),
  )

A(keq("Network Reward",
      r"r_t = T_t - \lambda_I I_t - \lambda_C C_t",
      [r"$T_t$ total useful throughput, $\sum_i \min(d_i, \text{rate}_i)$",
       r"$I_t$ total interference, $\sum_i I_i$",
       r"$C_t$ messages sent this step"],
      "Improve useful throughput while limiting interference and unnecessary communication. Every access point receives this same number."))

A(code("env = WirelessResourceAllocationEnv(n_agents=N_AGENTS,",
       "                                   n_channels=N_CHANNELS,",
       "                                   traffic='skewed')",
       "obs, _ = env.reset(seed=SEED)",
       "",
       "print('rate against interference:',",
       "      {round(i, 1): round(achievable_rate(1.0, i), 2)",
       "       for i in (0.0, 0.3, 0.7, 1.4)})",
       "print()",
       "print('who interferes with whom (coupling):')",
       "print(pd.DataFrame(env.coupling.round(3),",
       "                   index=env.possible_agents,",
       "                   columns=env.possible_agents))",
       "print()",
       "print('unavoidable interference:', round(env.min_interference(), 3),",
       "      '(4 access points, 3 channels: somebody must share)')",
       "print('demands this step       :', env.demand.round(1).tolist())",
       "print('AP0 observation         :', np.round(obs['ap_0'], 2))",
       "render_wireless_network(env, [0, 0, 1, 2], title='An example allocation')",
       "plt.tight_layout(); plt.show()"))

# ---------------------------------------------------------------- 1 explore
A(md("## 1. Explore Channel Allocation",
     "",
     "Two things decide whether a shared channel is expensive: how close the",
     "pair is, and how much traffic they actually want."))

A(code("print('the environment knows all four demands:')",
       "print('  ', env.state()['demand'].round(1).tolist())",
       "print()",
       "print('AP0 sees only its own, plus local measurements:')",
       "print('   own demand   :', extract_demand(obs['ap_0']))",
       "print('   interference :', extract_interference(obs['ap_0'], env))",
       "print('   prev channel :', extract_previous_channel(obs['ap_0'], env))"))

A(md("> **Question 1.** Which information is available to AP0 at execution time,",
     "> and which exists only at the environment level?"))

A(code("env.reset(seed=7)",
       "print('demands:', env.demand.round(1).tolist(), '\\n')",
       "print('everyone crowds channel 0:')",
       "show(env, [0, 0, 0, 0], render=False)",
       "print('\\nthe two closest access points share:')",
       "show(env, [0, 0, 1, 2], render=False)",
       "print('\\nthe two most distant access points share:')",
       "show(env, [0, 1, 2, 0])"))

A(md("**Exercise 1.** With four access points on three channels one pair must",
     "share. Choose the pair.",
     "",
     "*Expected shape:* a function returning a list of four channel indices.",
     "",
     "*Hint:* two things matter, and `env.coupling` and `env.demand` are both",
     "readable from the function."))
A(todo(1,
       "def better_allocation(env):",
       '    """Return a channel assignment with a high team reward."""',
       "    # TODO",
       "    raise NotImplementedError",
       "",
       "",
       "show(env, better_allocation(env))"))

A(code("best = max(itertools.product(range(N_CHANNELS), repeat=N_AGENTS),",
       "           key=lambda a: env.outcome(list(a))['team_reward'])",
       "print('best by exhaustive search over all 81 allocations:')",
       "show(env, list(best), render=False)",
       "print(f'\\nyour allocation reached '",
       "      f'{env.outcome(better_allocation(env))[\"team_reward\"]:.2f} '",
       "      f'of a possible {env.best_possible():.2f}')"))

# ------------------------------------------------------------- 2 strategies
A(md("## 2. Compare Decision Strategies",
     "",
     "Two rules that do not learn, then two that do. The greedy rule picks the",
     "channel with the best quality minus the interference it measured, which",
     "is individually sensible."))

A(md("**Exercise 2.** Value decomposition needs a team value. Complete the",
     "aggregation.",
     "",
     "*Expected shape:* takes a list of $N$ floats, returns one float."))

A(keq("Value Decomposition",
      r"Q_{\text{tot}} = \sum_{i=1}^{N} Q_i\left(o_t^i, a_t^i\right)",
      None,
      "Individual values are combined into a team value, so one shared error is applied to all of them."))

A(todo(2,
       "def combine_values(q_values):",
       '    """Q_tot from the per-agent values."""',
       "    # TODO",
       "    raise NotImplementedError"))

A(code("import cooperative_marl_labs.training.q_learning as qlmod",
       "qlmod.combine_values = combine_values   # the loop uses your version",
       "",
       "# Five models, trained once and reused by every table below.",
       "MODELS = {}",
       "",
       "e = WirelessResourceAllocationEnv(traffic='skewed')",
       "MODELS['IQL'] = (e, train_independent_q_learning(",
       "    e, episodes=EPISODES, seed=0)[0])",
       "",
       "e = WirelessResourceAllocationEnv(traffic='skewed')",
       "MODELS['VDN'] = (e, train_vdn(e, episodes=EPISODES, seed=0)[0])",
       "",
       "e = WirelessResourceAllocationEnv(traffic='skewed', communication=True,",
       "                                  communication_weight=0.05)",
       "MODELS['VDN + comm'] = (e, train_vdn(e, episodes=EPISODES, seed=0)[0])",
       "",
       "e = WirelessResourceAllocationEnv(traffic='skewed', communication=True,",
       "                                  communication_weight=0.0)",
       "MODELS['VDN + free comm'] = (e, train_vdn(e, episodes=EPISODES, seed=0)[0])",
       "",
       "e = WirelessResourceAllocationEnv(traffic='uniform')",
       "MODELS['VDN, uniform traffic'] = (e, train_vdn(",
       "    e, episodes=EPISODES, seed=0)[0])",
       "",
       "print('trained:', list(MODELS))"))

A(code("results = {}",
       "",
       "e = WirelessResourceAllocationEnv(traffic='skewed')",
       "results['random'] = evaluate_agents(",
       "    e, make_fixed_agents(e, RandomWirelessAgent, seed=0),",
       "    episodes=EVAL_EPISODES)",
       "",
       "e = WirelessResourceAllocationEnv(traffic='skewed')",
       "results['greedy local'] = evaluate_agents(",
       "    e, make_fixed_agents(e, GreedyWirelessAgent, seed=0),",
       "    episodes=EVAL_EPISODES)",
       "",
       "for label in ('IQL', 'VDN'):",
       "    e, agents = MODELS[label]",
       "    results[label] = evaluate_agents(e, agents, episodes=EVAL_EPISODES)",
       "",
       "e0 = WirelessResourceAllocationEnv(traffic='skewed')",
       "CEILING = np.mean([",
       "    (e0.reset(seed=42 + i), e0.best_possible())[1]",
       "    for i in range(EVAL_EPISODES)])",
       "",
       "df = pd.DataFrame(results).T[['team_reward', 'total_throughput',",
       "                              'interference', 'avoidable_interference',",
       "                              'collision_rate']]",
       "display(df.round(2))",
       "print(f'ceiling: {CEILING:.2f}')"))

A(code("grouped(list(df.index),",
       "        {'team reward': list(df.team_reward),",
       "         'throughput': list(df.total_throughput)},",
       "        'Decision strategies', 'value', ceiling=CEILING)",
       "",
       "grouped(list(df.index),",
       "        {'avoidable interference': list(df.avoidable_interference)},",
       "        'Interference above the unavoidable minimum', 'coupling per step')"))

A(md("> **Question 2.** Greedy local is made of individually sensible decisions",
     "> and scores worse than random. Why?",
     ">",
     "> And which mechanism closed most of the gap to the ceiling, coordination",
     "> or something else?"))

A(md("### One learned allocation"))
A(code("e, agents = MODELS['VDN']",
       "obs, _ = e.reset(seed=21)",
       "acts = [int(agents[a].act(obs[a], greedy=True)) for a in e.possible_agents]",
       "show(e, acts)"))

# ---------------------------------------------------------- 3 communication
A(md("## 3. Does Communication Pay For Itself",
     "",
     "Each access point broadcasts **one bit** carrying its demand level, so the",
     "team sends four messages per step. That mapping is a design decision we",
     "made, not a property of the problem.",
     "",
     "The interesting question is not whether the bits are useful. It is whether",
     "they are useful enough to be worth their price."))

A(keq("Communication-Adjusted Reward",
      r"r'_t = r_t - \lambda_C\, C_t",
      [r"$C_t$ is communication use, here four messages per step"],
      "Charging for messages makes efficiency something the agents optimise."))

A(md("**Exercise 3.** Complete the adjusted reward.",
     "",
     "*Expected shape:* returns a float."))
A(todo(3,
       "def communication_adjusted_reward(task_reward, messages_sent, lambda_comm):",
       '    """Charge the team for the messages it sent."""',
       "    # TODO",
       "    raise NotImplementedError"))

A(md("### Throughput and reward are not the same question",
     "",
     "Compare three systems: silent, talking at the default price, and talking",
     "for free. **Predict which has the highest throughput, and which has the",
     "highest reward, before running this.**"))

A(code("comm_rows = []",
       "for label in ('VDN', 'VDN + comm', 'VDN + free comm'):",
       "    e, agents = MODELS[label]",
       "    m = evaluate_agents(e, agents, episodes=EVAL_EPISODES)",
       "    comm_rows.append(dict(system=label,",
       "                          team_reward=m['team_reward'],",
       "                          throughput=m['total_throughput'],",
       "                          messages=m['messages_sent'],",
       "                          price=e.communication_weight))",
       "comm_df = pd.DataFrame(comm_rows).set_index('system')",
       "display(comm_df.round(3))",
       "",
       "gain = (comm_df.loc['VDN + comm', 'throughput']",
       "        - comm_df.loc['VDN', 'throughput'])",
       "bill = (comm_df.loc['VDN + comm', 'price']",
       "        * comm_df.loc['VDN + comm', 'messages'])",
       "print(f'talking bought {gain:+.2f} throughput per step')",
       "print(f'and cost       {bill:.2f} per step')",
       "print(f'break-even price per message: {gain / N_AGENTS:.3f}')",
       "",
       "grouped(list(comm_df.index),",
       "        {'team reward': list(comm_df.team_reward),",
       "         'throughput': list(comm_df.throughput)},",
       "        'What communication buys, and what it costs', 'value',",
       "        ceiling=CEILING)"))

A(md("> Check your prediction against the table before reading on. If",
     "> throughput went up while reward went down, the messages were useful and",
     "> still not worth the price."))

A(md("### The control experiment",
     "",
     "Under **uniform** demand every access point wants roughly the same amount,",
     "so a demand bit carries almost nothing. **Predict the result.**"))
A(code("regime_rows = []",
       "for label in ('VDN', 'VDN, uniform traffic'):",
       "    e, agents = MODELS[label]",
       "    m = evaluate_agents(e, agents, episodes=EVAL_EPISODES)",
       "    eb = WirelessResourceAllocationEnv(traffic=e.traffic)",
       "    ceiling = np.mean([(eb.reset(seed=42 + i), eb.best_possible())[1]",
       "                       for i in range(40)])",
       "    regime_rows.append(dict(system=label, traffic=e.traffic,",
       "                            team_reward=m['team_reward'],",
       "                            ceiling=ceiling,",
       "                            gap=ceiling - m['team_reward']))",
       "reg = pd.DataFrame(regime_rows).set_index('system')",
       "display(reg.round(2))",
       "print('read the gap column, not the reward column: the two traffic')",
       "print('regimes are not equally easy, so their ceilings differ.')"))

# ----------------------------------------------------------------- 4 stress
A(md("## 4. Stress-Test Deployment",
     "",
     "Three shifts, one at a time. Nothing is retrained."))

A(md("### A. Traffic shift",
     "",
     "The network becomes a hotspot: one access point saturates and the rest go",
     "quiet. Quote each regime's ceiling, because they are not equally easy."))
A(code("stress = []",
       "for label in ('IQL', 'VDN', 'VDN + comm'):",
       "    e, agents = MODELS[label]",
       "    comm = e.communication",
       "    normal = evaluate_agents(e, agents, episodes=EVAL_EPISODES)['team_reward']",
       "",
       "    shifted = WirelessResourceAllocationEnv(traffic='hotspot',",
       "                                            communication=comm)",
       "    traffic = evaluate_agents(shifted, agents,",
       "                              episodes=EVAL_EPISODES)['team_reward']",
       "",
       "    stranger_env = WirelessResourceAllocationEnv(traffic='skewed',",
       "                                                 communication=comm)",
       "    stranger = {'ap_3': GreedyWirelessAgent('ap_3', N_CHANNELS, N_AGENTS,",
       "                                            comm, seed=99)}",
       "    unseen = evaluate_agents(stranger_env, agents, episodes=EVAL_EPISODES,",
       "                             replace=stranger)['team_reward']",
       "    stress.append(dict(system=label, normal=normal,",
       "                       traffic_shift=traffic, unfamiliar_agent=unseen))",
       "",
       "stress_df = pd.DataFrame(stress).set_index('system')",
       "display(stress_df.round(2))",
       "",
       "eh = WirelessResourceAllocationEnv(traffic='hotspot')",
       "hot_ceiling = np.mean([(eh.reset(seed=42 + i), eh.best_possible())[1]",
       "                       for i in range(40)])",
       "print(f'ceilings: skewed {CEILING:.2f}   hotspot {hot_ceiling:.2f}')"))

A(md("### B. An unfamiliar access point",
     "",
     "One access point is replaced by equipment from another operator: it takes",
     "the best local channel regardless of anyone else. You did not train it."))
A(code("grouped(list(stress_df.index),",
       "        {'normal': list(stress_df.normal),",
       "         'traffic shift': list(stress_df.traffic_shift),",
       "         'unfamiliar agent': list(stress_df.unfamiliar_agent)},",
       "        'Three controlled shifts', 'team reward', ceiling=CEILING)",
       "",
       "e, agents = MODELS['VDN']",
       "obs, _ = e.reset(seed=13)",
       "fam = [int(agents[a].act(obs[a], greedy=True)) for a in e.possible_agents]",
       "outsider = GreedyWirelessAgent('ap_3', N_CHANNELS, N_AGENTS, False, seed=99)",
       "unf = list(fam); unf[3] = int(outsider.act(obs['ap_3']))",
       "print('familiar team:');  show(e, fam, render=False)",
       "print('\\nAP3 replaced:'); show(e, unf, render=False)",
       "",
       "fig, axes = plt.subplots(1, 2, figsize=(11, 3.6))",
       "render_wireless_network(e, fam, title='Familiar team', ax=axes[0])",
       "render_wireless_network(e, unf, title='With a stranger', ax=axes[1])",
       "plt.tight_layout(); plt.show()"))

A(md("### C. A lossy channel",
     "",
     "The talking system depends on bits arriving. Drop some of them, with no",
     "retraining, and see what a learned dependency costs."))
A(code("e, agents = MODELS['VDN + comm']",
       "loss_rows = []",
       "for p in (0.0, 0.1, 0.3, 0.5):",
       "    e.set_message_loss(p)",
       "    m = evaluate_agents(e, agents, episodes=EVAL_EPISODES)",
       "    loss_rows.append(dict(message_loss=p, team_reward=m['team_reward']))",
       "e.set_message_loss(0.0)",
       "",
       "loss_df = pd.DataFrame(loss_rows).set_index('message_loss')",
       "display(loss_df.round(2))",
       "",
       "silent = results['VDN']['team_reward']",
       "fig, ax = plt.subplots(figsize=(5.6, 3.0))",
       "ax.plot(loss_df.index, loss_df.team_reward, marker='o', lw=2)",
       "ax.axhline(silent, ls='--', color='grey', lw=1)",
       "ax.text(0.0, silent + 0.06, 'silent VDN', color='grey', fontsize=8)",
       "ax.set_xlabel('probability a message is lost')",
       "ax.set_ylabel('team reward')",
       "ax.set_title('A protocol the agents learned to rely on')",
       "plt.tight_layout(); plt.show()"))

A(md("> **Question 3.** Every system degrades. Which one falls furthest, and does",
     "> that make it the worst choice?",
     ">",
     "> **Deployment decision.** You must deploy where bandwidth for coordination",
     "> messages is limited, traffic changes over time, and neighbouring access",
     "> points may behave differently from those seen during training.",
     ">",
     "> Which system would you deploy? Use at least two results from your own",
     "> runs, and name one limitation of your choice. Four to five sentences."))

A(code("answer = \"\"\"",
       "",
       "\"\"\"",
       "print(answer)"))

A(md("## Takeaways",
     "",
     "- Locally optimal channel choices can create global interference, and a",
     "  deterministic local rule synchronises the herd: greedy scored below",
     "  random in your run.",
     "- Which pair shares a channel matters more than how many share. Demand",
     "  decides which pair should share, and distance decides what it costs when",
     "  a busy access point has to.",
     "- Value decomposition beat independent learning, and both beat every rule",
     "  that did not learn. Read both against the ceiling to see how much of the",
     "  difficulty was credit assignment in the first place.",
     "- Communication raised throughput and still lowered the team reward at the",
     "  default price. Useful is not the same as worth it, and you can compute",
     "  the break-even price before running the sweep.",
     "- A protocol the agents learned to rely on becomes a liability when the",
     "  channel drops messages, or when the traffic stops matching what the",
     "  messages describe.",
     "- Quote the new regime's ceiling before calling a drop brittleness. A",
     "  system can lose reward and still be near-optimal in the harder regime.",
     "- Conditioning on more information is a coordination decision too. If it",
     "  makes every agent read the same thing, a deterministic policy",
     "  synchronises, and you are back to the greedy failure from section 2.",
     "",
     "$$\\boxed{\\text{Coordinate}} \\rightarrow \\boxed{\\text{Communicate}}",
     "\\rightarrow \\boxed{\\text{Adapt}}$$",
     "",
     "### Notes on these numbers",
     "",
     "Everything here comes from this notebook, on this environment, with these",
     "parameters. Reproducible, and **not** benchmark results. The environment is",
     "a teaching model of interference with no fading, mobility or protocol",
     "overhead, and it is not calibrated against any real deployment."))

A(md("---",
     "",
     "# Solutions",
     "",
     "Code for each exercise, in notebook order."))

A(md("### Solution 1: Choosing which pair shares"))
A(solution(1, "allocation",
           "def better_allocation(env):",
           '    """Share the channel between the pair that loses least by sharing."""',
           "    n, k = env.n_agents, env.n_channels",
           "    best, best_reward = None, -float('inf')",
           "    # only the pair matters, so try each pair on a shared channel",
           "    for i in range(n):",
           "        for j in range(i + 1, n):",
           "            actions = [0] * n",
           "            spare = [c for c in range(k)]",
           "            actions[i] = actions[j] = spare.pop()",
           "            for m in (x for x in range(n) if x not in (i, j)):",
           "                actions[m] = spare.pop()",
           "            reward = env.outcome(actions)['team_reward']",
           "            if reward > best_reward:",
           "                best, best_reward = actions, reward",
           "    return best",
           "",
           "",
           "print('better_allocation defined')"))
A(md("Two quantities decide it. A distant pair couples weakly, and a light",
     "access point does not notice a slower channel because its throughput was",
     "capped by demand anyway."))

A(md("### Solution 2: VDN aggregation"))
A(solution(2, "combine_values",
           "def combine_values(q_values):",
           "    return float(sum(q_values))",
           "",
           "",
           "print('combine_values defined')"))
A(md("A plain sum, which is what keeps each access point's greedy choice",
     "consistent with the team value."))

A(md("### Solution 3: Communication-adjusted reward"))
A(solution(3, "adjusted reward",
           "def communication_adjusted_reward(task_reward, messages_sent, lambda_comm):",
           "    return float(task_reward - lambda_comm * messages_sent)",
           "",
           "",
           "print('communication_adjusted_reward defined')"))
A(md("One subtraction, and it is what turns bandwidth into something the agents",
     "trade against throughput."))

nb = notebook("Wireless Network Resource Allocation: a MARL Lab", C,
              path="notebooks/wireless_network_resource_allocation_marl_lab.ipynb")
write(nb, "notebooks/wireless_network_resource_allocation_marl_lab.ipynb")
