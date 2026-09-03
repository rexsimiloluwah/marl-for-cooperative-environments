"""02_adapt: Cooperating with Unseen Partners."""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common import md, code, keq, todo, solution, notebook, write, install_cell

C = []; A = C.append

A(md("# Cooperating with Unseen Partners",
     "",
     "- A policy trained with one partner can fail with a perfectly competent",
     "  stranger.",
     "- You will train a specialist, measure it through cross-play, then try",
     "  partner diversity.",
     "- Finally you will build a one-number partner model and watch it track a",
     "  partner that changes mid-episode.",
     "",
     "**Time:** 30 to 40 minutes. **Compute:** Colab CPU, no GPU.",
     "",
     "## Learning objectives",
     "",
     "- Read a cross-play matrix and say what its diagonal does not show.",
     "- Compute a generalization gap and explain why it is not a target.",
     "- Show that diversity alone does not help a partner-blind agent.",
     "- Implement an online partner estimate and act on it.",
     "",
     "> Exercises are marked `# TODO`. Completed code is in **Solutions** at the",
     "> end. Interpretation questions are not answered there."))

A(md("## 0. Setup"))
A(md("### 0.1 Install dependencies"))
A(install_cell())

A(md("### 0.2 Import required libraries"))
A(code("import random",
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
       "N_STEPS = 40          # steps per episode",
       "EPISODES = 3000       # training episodes",
       "ALPHA = 0.05",
       "EPSILON = 0.2",
       "WINDOW = 8            # how far back the partner model looks",
       "",
       "plt.rcParams.update({'figure.dpi': 110, 'axes.grid': True,",
       "                     'grid.alpha': 0.3, 'axes.spines.top': False,",
       "                     'axes.spines.right': False})"))

A(md("### 0.4 Helper functions"))
A(code("from cooperative_marl_labs.envs.partner_coordination import (",
       "    PartnerCoordinationEnv, FETCH, COOK, ROLE_NAMES, EGO)",
       "from cooperative_marl_labs.policies import (",
       "    all_partners, TRAINING_POPULATION, HELD_OUT)",
       "from cooperative_marl_labs.evaluation import (",
       "    crossplay_matrix, evaluate_partner_policy)",
       "from cooperative_marl_labs.visualization import (",
       "    plot_crossplay_matrix, plot_partner_estimate)",
       "",
       "",
       "def rolling(x, w=100):",
       "    return np.convolve(x, np.ones(w) / w, mode='valid') if len(x) >= w else np.array(x)",
       "",
       "",
       "def grouped(index, series, title, ylabel, ceiling=None):",
       "    n = len(series); w = 0.8 / n; x = np.arange(len(index))",
       "    fig, ax = plt.subplots(figsize=(7.2, 3.2))",
       "    for k, (lab, vals) in enumerate(series.items()):",
       "        ax.bar(x + (k - (n - 1) / 2) * w, vals, w, label=lab)",
       "    if ceiling is not None:",
       "        ax.plot(x, ceiling, 'k_', markersize=16, label='ceiling')",
       "    ax.set_xticks(x); ax.set_xticklabels(index, rotation=15, ha='right')",
       "    ax.set_ylabel(ylabel); ax.set_title(title); ax.set_ylim(0, 1.05)",
       "    ax.legend(fontsize=8)",
       "    plt.tight_layout(); plt.show()",
       "",
       "",
       "print('helpers ready')"))

A(md("### 0.5 Environment",
     "",
     "Two roles, one order.",
     "",
     "- Complementary choices serve it: reward `1`.",
     "- Both taking the same role wastes the step: reward `0`.",
     "- Nothing says which agent should take which role.",
     "",
     "Only the **ego** learns. The partner is a scripted policy you set, which is",
     "what makes this ad hoc teamwork: you did not train it and cannot change it."))
A(code("PARTNERS = all_partners(seed=SEED)",
       "env = PartnerCoordinationEnv(n_steps=N_STEPS)",
       "env.set_partner(PARTNERS['fetch-first'])",
       "obs, _ = env.reset(seed=SEED)",
       "print('ego observation:', obs[EGO], ' (partner last took: none yet)')",
       "print('ego action space:', env.action_space(EGO))",
       "",
       "info = pd.DataFrame([",
       "    dict(partner=name,",
       "         p_fetch=round(float(np.mean([p.act(FETCH, None) == FETCH",
       "                                      for _ in range(3000)])), 2),",
       "         held_out=name in HELD_OUT)",
       "    for name, p in PARTNERS.items()])",
       "info['ceiling'] = info.p_fetch.apply(lambda p: max(p, 1 - p))",
       "info['best_role'] = info.p_fetch.apply(lambda p: 'COOK' if p >= 0.5 else 'FETCH')",
       "display(info)"))

A(md("Each partner takes FETCH with its own probability, so **no single",
     "observation identifies one**. Telling them apart needs a history."))
A(code("fig, ax = plt.subplots(figsize=(7, 3))",
       "x = np.arange(len(info))",
       "ax.bar(x - 0.2, info.p_fetch, 0.4, label='P(FETCH)')",
       "ax.bar(x + 0.2, 1 - info.p_fetch, 0.4, label='P(COOK)')",
       "for i, held in enumerate(info.held_out):",
       "    if held:",
       "        ax.text(i, 1.02, 'held out', ha='center', fontsize=7, color='#c8553d')",
       "ax.set_xticks(x); ax.set_xticklabels(info.partner, rotation=20, ha='right')",
       "ax.set_ylabel('probability'); ax.set_ylim(0, 1.12)",
       "ax.set_title('How often each partner takes the FETCH role'); ax.legend()",
       "plt.tight_layout(); plt.show()"))

# ---- 1 specialist ----
A(md("## 1. Train a Specialist",
     "",
     "Fix one partner and maximise team return, which is standard practice."))

A(md("**Exercise 1.** The training loop draws a partner for each episode. With",
     "one name it always returns that one; with several it should draw uniformly.",
     "",
     "*Expected shape:* one element of `names`."))
A(todo(1,
       "def sample_training_partner(names, rng):",
       '    """Draw one partner name for this episode."""',
       "    # TODO",
       "    raise NotImplementedError"))

A(code("def train_ego(partner_names, episodes=EPISODES, seed=0):",
       '    """Tabular ego with no partner observation: it must commit to a role."""',
       "    rng = random.Random(seed)",
       "    q = np.zeros(2)",
       "    history = []",
       "    env = PartnerCoordinationEnv(n_steps=N_STEPS)",
       "    for ep in range(episodes):",
       "        name = sample_training_partner(partner_names, rng)",
       "        env.set_partner(PARTNERS[name])",
       "        obs, _ = env.reset(seed=seed * 7919 + ep)",
       "        total, done = 0.0, False",
       "        while not done:",
       "            a = rng.randrange(2) if rng.random() < EPSILON else int(np.argmax(q))",
       "            obs, rewards, terms, truncs, _ = env.step({EGO: a})",
       "            r = rewards[EGO]",
       "            q[a] += ALPHA * (r - q[a])",
       "            total += r",
       "            done = terms[EGO] or truncs[EGO]",
       "        history.append(total / N_STEPS)",
       "    return q, history",
       "",
       "",
       "def fixed_policy(q):",
       '    """Partner-blind: always the same role."""',
       "    return lambda observation, history: int(np.argmax(q))",
       "",
       "",
       "def evaluate(policy, partner_name, episodes=150, switch=None):",
       "    e = PartnerCoordinationEnv(n_steps=N_STEPS)",
       "    return evaluate_partner_policy(",
       "        e, policy, PARTNERS[partner_name], episodes=episodes,",
       "        seed=SEED, switch=switch)",
       "",
       "",
       "q_spec, hist = train_ego(['fetch-first'], seed=0)",
       "specialist = fixed_policy(q_spec)",
       "print('ego values:', q_spec.round(3), '-> always', ROLE_NAMES[int(np.argmax(q_spec))])",
       "",
       "fig, ax = plt.subplots(figsize=(6, 2.9))",
       "ax.plot(rolling(hist), lw=1.6, color='#3f9b6d')",
       "ax.set_xlabel('episode'); ax.set_ylabel('reward per step')",
       "ax.set_title('Training with fetch-first'); ax.set_ylim(0, 1.05)",
       "plt.tight_layout(); plt.show()"))

# ---- 2 cross-play ----
A(md("## 2. Cross-Play",
     "",
     "Evaluate the same policy against partners it never trained with."))
A(code("names = list(PARTNERS)",
       "spec_scores = [evaluate(specialist, n) for n in names]",
       "grouped(names, {'specialist': spec_scores}, 'One policy, every partner',",
       "        'reward per step', ceiling=list(info.ceiling))"))

A(md("Now the full matrix: one ego trained per partner, each evaluated against",
     "all of them."))
A(code("egos = {}",
       "for n in TRAINING_POPULATION:",
       "    qn, _ = train_ego([n], seed=1)",
       "    egos[n] = fixed_policy(qn)",
       "",
       "cp = crossplay_matrix(",
       "    egos,",
       "    {n: n for n in TRAINING_POPULATION},",
       "    lambda ego, partner_name: evaluate(ego, partner_name),",
       ")",
       "display(cp.round(2))",
       "plot_crossplay_matrix(cp, 'Cross-play: outlined cells are the familiar pairings', vmax=1.0)",
       "plt.tight_layout(); plt.show()",
       "",
       "diag = float(np.mean(np.diag(cp.to_numpy())))",
       "off = float((cp.to_numpy().sum() - np.trace(cp.to_numpy()))",
       "            / (cp.size - len(cp)))",
       "print(f'familiar mean {diag:.2f}   unfamiliar mean {off:.2f}')"))

A(md("> **Question 1.** What does strong familiar-partner performance but weak",
     "> cross-play suggest about what the policy learned?"))

# ---- 3 diversity ----
A(md("## 3. Train with Partner Diversity",
     "",
     "$$\\Pi_{\\text{train}} = \\{\\pi_A, \\pi_B, \\pi_C, \\pi_D\\}$$",
     "",
     "Your `sample_training_partner` already supports this. **Predict the result",
     "before running it.**"))
A(code("q_gen, _ = train_ego(list(TRAINING_POPULATION), seed=0)",
       "generalist = fixed_policy(q_gen)",
       "",
       "print('specialist:', q_spec.round(3), '-> always', ROLE_NAMES[int(np.argmax(q_spec))])",
       "print('generalist:', q_gen.round(3), '-> always', ROLE_NAMES[int(np.argmax(q_gen))])",
       "",
       "grouped(names,",
       "        {'specialist': spec_scores,",
       "         'generalist': [evaluate(generalist, n) for n in names]},",
       "        'Does diversity alone help?', 'reward per step',",
       "        ceiling=list(info.ceiling))"))

A(md("Both agents commit to the same single role. A partner-blind agent cannot",
     "exploit partner variation however much of it you supply: diversity removes",
     "a shortcut without supplying a capability."))

# ---- 4 online adaptation ----
A(md("## 4. Online Adaptation"))

A(keq("Generalization Gap",
      r"\Delta_{\text{gen}} = J_{\text{familiar}} - J_{\text{unseen}}",
      [r"$J_{\text{familiar}}$ is the mean with training partners",
       r"$J_{\text{unseen}}$ is the mean with held-out partners"],
      "A teaching diagnostic, not a target. It can be lowered by getting worse with familiar partners."))

A(md("**Exercise 2.** Complete the gap.",
     "",
     "*Expected shape:* a single float."))
A(todo(2,
       "def generalization_gap(familiar, unseen):",
       '    """familiar, unseen: lists of per-partner scores."""',
       "    # TODO",
       "    raise NotImplementedError"))

A(keq("Partner Model",
      r"\hat{p}_t = P\left(\text{FETCH} \mid h_t\right)",
      [r"$h_t$ is the partner's observed actions so far"],
      "One number is enough: how often this partner takes the FETCH role."))

A(md("**Exercise 3.** Estimate $\\hat{p}_t$ from the most recent `window`",
     "observations. No neural network.",
     "",
     "*Expected shape:* a float in $[0, 1]$ that also works on an empty history.",
     "",
     "*Hint:* add one imagined observation of each role before dividing, so an",
     "empty history gives 0.5."))
A(todo(3,
       "def estimate_fetch_probability(history, window=WINDOW):",
       '    """Running estimate of P(partner takes FETCH)."""',
       "    # TODO",
       "    raise NotImplementedError"))

A(md("**Exercise 4.** Act on the estimate.",
     "",
     "*Expected shape:* returns `FETCH` or `COOK`."))
A(todo(4,
       "def adaptive_action(p_fetch):",
       '    """Best response to a partner that fetches with this probability."""',
       "    # TODO",
       "    raise NotImplementedError"))

A(code("def adaptive_policy(window=WINDOW):",
       "    return lambda observation, history: adaptive_action(",
       "        estimate_fetch_probability(history, window))",
       "",
       "",
       "adaptive = adaptive_policy()",
       "",
       "rows = []",
       "for label, pol in [('specialist', specialist), ('generalist', generalist),",
       "                   ('adaptive', adaptive)]:",
       "    fam = [evaluate(pol, n) for n in TRAINING_POPULATION]",
       "    uns = [evaluate(pol, n) for n in HELD_OUT]",
       "    rows.append(dict(agent=label, familiar=np.mean(fam), unseen=np.mean(uns),",
       "                     gap=generalization_gap(fam, uns)))",
       "gap_df = pd.DataFrame(rows)",
       "display(gap_df.round(3))"))

A(md("### Watch the partner change mid-interaction",
     "",
     "At step 20 `fetch-first` is replaced by `cook-first`, so the correct role",
     "inverts. The ego is not told."))
A(code("def trace(partner_name, switch_to=None, switch_at=20, window=WINDOW, seed=3):",
       "    e = PartnerCoordinationEnv(n_steps=N_STEPS)",
       "    e.set_partner(PARTNERS[partner_name])",
       "    if switch_to:",
       "        e.set_partner_switch(switch_at, PARTNERS[switch_to])",
       "    obs, _ = e.reset(seed=seed)",
       "    out, done = [], False",
       "    while not done:",
       "        hist = list(e.partner_history)",
       "        p_hat = estimate_fetch_probability(hist, window)",
       "        a = adaptive_action(p_hat)",
       "        obs, rewards, terms, truncs, inf = e.step({EGO: a})",
       "        out.append(dict(t=inf[EGO]['t'], p_hat=p_hat, ego_cook=int(a == COOK),",
       "                        partner_fetch=int(inf[EGO]['partner_action'] == FETCH),",
       "                        reward=rewards[EGO]))",
       "        done = terms[EGO] or truncs[EGO]",
       "    return pd.DataFrame(out)",
       "",
       "",
       "tr = trace('fetch-first', switch_to='cook-first')",
       "",
       "fig, ax = plt.subplots(figsize=(7.4, 3.3))",
       "ax.plot(tr.t, tr.p_hat, lw=2, label=r'estimate $\\hat{p}_t$ = P(partner FETCH)')",
       "ax.plot(tr.t, tr.ego_cook, lw=1.4, drawstyle='steps-post', label='ego takes COOK')",
       "ax.plot(tr.t, tr.partner_fetch, lw=1, alpha=0.4, drawstyle='steps-post',",
       "        label='partner took FETCH')",
       "ax.axvline(20, color='#c8553d', lw=1.8)",
       "ax.text(20.4, 1.06, 'partner replaced', color='#c8553d', fontsize=9)",
       "ax.axhline(0.5, ls=':', color='grey')",
       "ax.set_xlabel('step within the episode'); ax.set_ylabel('value')",
       "ax.set_title('The partner changes, the estimate follows, the behaviour follows')",
       "ax.set_ylim(-0.05, 1.18); ax.legend(fontsize=8, loc='lower left')",
       "plt.tight_layout(); plt.show()"))

A(md("### The three systems, three conditions"))
A(code("final = []",
       "for label, pol in [('specialist', specialist), ('generalist', generalist),",
       "                   ('adaptive', adaptive)]:",
       "    final.append(dict(",
       "        agent=label,",
       "        familiar=np.mean([evaluate(pol, n) for n in TRAINING_POPULATION]),",
       "        unseen=np.mean([evaluate(pol, n) for n in HELD_OUT]),",
       "        changing=evaluate(pol, 'fetch-first', switch=(20, PARTNERS['cook-first'])),",
       "    ))",
       "final_df = pd.DataFrame(final)",
       "display(final_df.round(3))",
       "",
       "grouped(list(final_df.agent),",
       "        {'familiar': list(final_df.familiar),",
       "         'unseen': list(final_df.unseen),",
       "         'changing partner': list(final_df.changing)},",
       "        'Three conditions', 'reward per step')"))

A(md("> **Question 2.** Which system would you choose when the deployment partner",
     "> is unknown, and which column in the table above supports that?",
     ">",
     "> Look at the `gap` column from Exercise 2 as well. Is the smallest gap the",
     "> best agent?"))

A(md("## Takeaways",
     "",
     "- A policy trained with one partner encodes a **convention**, not a",
     "  solution.",
     "- Cross-play is the instrument. The diagonal is a training number.",
     "- **Diversity alone does not help a partner-blind agent.**",
     "- A one-number partner model reached near-ceiling performance against",
     "  partners it never trained with."))

A(md("---",
     "",
     "# Solutions",
     "",
     "Code for each exercise, in notebook order."))

A(md("### Solution 1: Partner sampling"))
A(solution(1, "sampling",
           "def sample_training_partner(names, rng):",
           "    return names[rng.randrange(len(names))]",
           "",
           "",
           "print('sample_training_partner defined')"))
A(md("Drawn once per episode, so the partner is fixed within an episode and there",
     "is a stable thing for a model to estimate."))

A(md("### Solution 2: Generalization gap"))
A(solution(2, "gap",
           "def generalization_gap(familiar, unseen):",
           "    return float(np.mean(familiar) - np.mean(unseen))",
           "",
           "",
           "print('generalization_gap defined')"))
A(md("A difference of two means, so it can be reduced by getting worse with",
     "familiar partners."))

A(md("### Solution 3: Partner model update"))
A(solution(3, "partner model",
           "def estimate_fetch_probability(history, window=WINDOW):",
           "    recent = history[-window:]",
           "    fetches = sum(1 for a in recent if a == FETCH)",
           "    return (fetches + 1) / (len(recent) + 2)",
           "",
           "",
           "print('estimate_fetch_probability defined')"))
A(md("The window forgets, and the `+1 / +2` returns 0.5 on an empty history",
     "instead of dividing by zero."))

A(md("### Solution 4: Adaptive action selection"))
A(solution(4, "adaptive action",
           "def adaptive_action(p_fetch):",
           "    return COOK if p_fetch >= 0.5 else FETCH",
           "",
           "",
           "print('adaptive_action defined')"))
A(md("Expected reward is $\\hat{p}$ for COOK and $1 - \\hat{p}$ for FETCH, so the",
     "threshold is 0.5 and the best response is a hard switch."))

nb = notebook("02 Adapt: Cooperating with Unseen Partners", C,
              path="notebooks/02_adapt.ipynb")
write(nb, "notebooks/02_adapt.ipynb")
