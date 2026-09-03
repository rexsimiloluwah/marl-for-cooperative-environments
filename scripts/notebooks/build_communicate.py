"""01_communicate: Learning a Communication Protocol."""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common import md, code, keq, todo, solution, notebook, write, install_cell

C = []; A = C.append

A(md("# Learning a Communication Protocol",
     "",
     "- One agent knows the target. The other must name it and cannot see it.",
     "- You will show the task is unsolvable without a message, then build a",
     "  protocol by hand, then train agents to invent one.",
     "- Finally you will limit the channel, corrupt it, and mix agents from",
     "  different runs.",
     "",
     "**Time:** 30 to 40 minutes. **Compute:** Colab CPU.",
     "",
     "## Learning objectives",
     "",
     "- Show empirically that a task cannot be solved without communication.",
     "- Implement an encoder and the sampling pathway that makes a message",
     "  learnable.",
     "- Read a learned protocol off a $P(m \\mid g)$ heatmap.",
     "- Explain why two working protocols can fail when their agents are mixed.",
     "",
     "> Exercises are marked `# TODO`. Completed code is in **Solutions** at the",
     "> end. Interpretation questions are not answered there."))

# ---------------- 0 setup ----------------
A(md("## 0. Setup"))
A(md("### 0.1 Install dependencies"))
A(install_cell(learning=True))

A(md("### 0.2 Import required libraries"))
A(code("import random",
       "",
       "import numpy as np",
       "import pandas as pd",
       "import matplotlib.pyplot as plt",
       "",
       "import torch",
       "import torch.nn as nn",
       "import torch.optim as optim"))

A(md("### 0.3 Reproducibility and configuration"))
A(code("SEED = 42",
       "",
       "random.seed(SEED)",
       "np.random.seed(SEED)",
       "torch.manual_seed(SEED)",
       "",
       "N_TARGETS = 3",
       "N_MESSAGES = 3",
       "TARGET_NAMES = ['triangle', 'circle', 'square']",
       "EPISODES = 4000",
       "BATCH = 32",
       "LR = 0.01",
       "",
       "plt.rcParams.update({'figure.dpi': 110, 'axes.grid': True,",
       "                     'grid.alpha': 0.3, 'axes.spines.top': False,",
       "                     'axes.spines.right': False})"))

A(md("### 0.4 Helper functions",
     "",
     "Imported from `cooperative_marl_labs`, so this notebook is about",
     "communication rather than plumbing."))
A(code("from cooperative_marl_labs.envs.speaker_listener import (",
       "    SpeakerListenerEnv, SPEAKER, LISTENER)",
       "from cooperative_marl_labs.agents import Speaker, Listener, onehot",
       "from cooperative_marl_labs.training import (",
       "    train_communication_agents, protocol_matrix)",
       "from cooperative_marl_labs.visualization import plot_protocol_heatmap",
       "",
       "",
       "def rolling(x, w=200):",
       "    return np.convolve(x, np.ones(w) / w, mode='valid') if len(x) >= w else np.array(x)",
       "",
       "",
       "def bars(labels, values, title, ylabel, chance=None):",
       "    fig, ax = plt.subplots(figsize=(5.4, 3.1))",
       "    ax.bar(labels, values, color=['#2191fb', '#3f9b6d', '#fea82f', '#c8553d'][:len(labels)])",
       "    if chance is not None:",
       "        ax.axhline(chance, ls='--', lw=1, color='grey')",
       "        ax.text(-0.45, chance + 0.02, 'chance', color='grey', fontsize=8)",
       "    for i, v in enumerate(values):",
       "        ax.text(i, v + 0.02, f'{v:.2f}', ha='center', fontsize=9)",
       "    ax.set_ylabel(ylabel); ax.set_title(title); ax.set_ylim(0, 1.15)",
       "    plt.tight_layout(); plt.show()",
       "",
       "",
       "print('helpers ready')"))

A(md("### 0.5 Environment",
     "",
     "- A target is drawn from three landmarks.",
     "- The **speaker** sees it and cannot act.",
     "- The **listener** acts and cannot see it.",
     "- Both score `+1` if the listener names the target.",
     "",
     "An episode is two steps: the speaker sends, then the listener guesses."))
A(code("env = SpeakerListenerEnv(n_targets=N_TARGETS, message_vocab_size=N_MESSAGES)",
       "obs, _ = env.reset(seed=SEED)",
       "",
       "print('speaker observation :', obs[SPEAKER], f'  (the target, one-hot)')",
       "print('listener observation:', obs[LISTENER], '  (last slot = nothing yet)')",
       "print('speaker action space :', env.action_space(SPEAKER))",
       "print('listener action space:', env.action_space(LISTENER))",
       "env.render()"))

# ---------------- 1 no communication ----------------
A(md("## 1. No Communication",
     "",
     "Run the listener with a channel that can only say one thing, which is the",
     "same as no channel at all."))
A(code("def run_episode(env, message, guess_from_received):",
       '    """One two-step episode. Returns the reward."""',
       "    obs, _ = env.reset()",
       "    target = int(obs[SPEAKER].argmax())",
       "    _, _, _, _, info = env.step({SPEAKER: message(target), LISTENER: 0})",
       "    received = info[LISTENER]['received']",
       "    _, rewards, _, _, _ = env.step(",
       "        {SPEAKER: 0, LISTENER: guess_from_received(received)})",
       "    return rewards[LISTENER]",
       "",
       "",
       "silent = SpeakerListenerEnv(n_targets=N_TARGETS, message_vocab_size=1)",
       "silent.reset(seed=1)",
       "no_comm = np.mean([run_episode(silent, lambda t: 0, lambda r: 0)",
       "                   for _ in range(1500)])",
       "",
       "perfect = 1.0   # a listener that could see the target",
       "print(f'no communication : {no_comm:.3f}')",
       "print(f'perfect information: {perfect:.3f}')",
       "bars(['no communication', 'perfect information'], [no_comm, perfect],",
       "     'What the listener can do', 'success rate', chance=1 / N_TARGETS)"))

A(md("> **Question 1.** What information is missing from the listener's",
     "> observation, and which agent holds it?"))

# ---------------- 2 hand-designed ----------------
A(md("## 2. Build a Simple Protocol",
     "",
     "$$\\mathcal{M} = \\{0, 1, 2\\}$$",
     "",
     "Three symbols, three targets. You choose the meanings."))

A(keq("Message Policy",
      r"m_t \sim \pi_m\left(m \mid o_t\right)",
      [r"$m_t$ is the symbol sent at step $t$", r"$o_t$ is the speaker's observation"],
      "The sender chooses a message from what it observes. Here you write that rule by hand."))

A(md("**Exercise 1.** Complete the encoder. It must be injective, so no two",
     "targets share a symbol.",
     "",
     "*Expected shape:* an `int` in `range(N_MESSAGES)`."))
A(todo(1,
       "def encode_target(target):",
       '    """Speaker side: which symbol stands for this target."""',
       "    # TODO: return a message symbol for this target",
       "    raise NotImplementedError"))

A(code("def decode_message(message):",
       '    """Listener side: provided, and the inverse of an identity encoder."""',
       "    return message % N_TARGETS",
       "",
       "",
       "hand = np.mean([run_episode(env, encode_target, decode_message)",
       "                for _ in range(1500)])",
       "print(f'hand-designed protocol: {hand:.3f}')",
       "",
       "display(pd.DataFrame([",
       "    dict(target=TARGET_NAMES[t], message=encode_target(t))",
       "    for t in range(N_TARGETS)]))",
       "bars(['no communication', 'hand-designed'], [no_comm, hand],",
       "     'What one symbol is worth', 'success rate', chance=1 / N_TARGETS)"))

# ---------------- 3 learn ----------------
A(md("## 3. Learn a Protocol",
     "",
     "Now remove the meanings and keep the symbols. At initialisation `2` refers",
     "to nothing: it is an integer the speaker may emit and the listener may",
     "condition on.",
     "",
     "Sender and receiver learn against each other, so neither can be correct",
     "first."))

A(keq("Listener Policy",
      r"a_t^{\text{listener}} \sim \pi_l\left(a \mid o_t^{\text{listener}},\ m_t\right)",
      [r"$m_t$ is the symbol that arrived"],
      "A received message is just another input to a local policy."))

A(md("**Exercise 2.** The speaker outputs logits. Turn them into a distribution",
     "and sample, so the message is learnable by policy gradient.",
     "",
     "*Expected shapes* for a batch of `B`: `message_dist` a `Categorical` over",
     "`n_messages`, `message` of shape `(B,)`.",
     "",
     "*Hint:* `torch.distributions.Categorical(logits=...)` and `.sample()`."))
A(todo(2,
       "def speak(speaker, target_vec):",
       '    """Return (message_dist, message) for a batch of targets."""',
       "    message_logits = speaker(target_vec)",
       "    # TODO",
       "    message_dist = ...",
       "    message = ...",
       "    raise NotImplementedError"))

A(md("**Exercise 3.** Build the listener's input from the sampled symbols.",
     "",
     "*Expected shape:* `(B, n_messages)`, one-hot per row.",
     "",
     "*Hint:* the `onehot` helper, and `torch.stack`."))
A(todo(3,
       "def listen(listener, message, n_messages):",
       '    """Return (action_dist, action) for the received symbols."""',
       "    # TODO",
       "    listener_input = ...",
       "    action_dist = torch.distributions.Categorical(logits=listener(listener_input))",
       "    return action_dist, action_dist.sample()"))

A(md("The training loop is supplied. Both agents are updated from the same",
     "reward, which is why neither improves alone."))
A(code("def train_pair(n_messages=N_MESSAGES, episodes=EPISODES, seed=0, batch=BATCH):",
       "    torch.manual_seed(seed)",
       "    rng = np.random.default_rng(seed)",
       "    speaker = Speaker(N_TARGETS, n_messages)",
       "    listener = Listener(n_messages, N_TARGETS)",
       "    opt = optim.Adam(list(speaker.parameters()) + list(listener.parameters()), lr=LR)",
       "    history = []",
       "    for _ in range(episodes):",
       "        targets = rng.integers(N_TARGETS, size=batch)",
       "        target_vec = torch.stack([onehot(int(t), N_TARGETS) for t in targets])",
       "        message_dist, message = speak(speaker, target_vec)",
       "        action_dist, action = listen(listener, message, n_messages)",
       "        reward = (action == torch.as_tensor(targets)).float()",
       "        advantage = reward - reward.mean()",
       "        loss = -(advantage * (message_dist.log_prob(message)",
       "                              + action_dist.log_prob(action))).mean()",
       "        opt.zero_grad(); loss.backward(); opt.step()",
       "        history.append(float(reward.mean()))",
       "    return speaker, listener, history",
       "",
       "",
       "def score(speaker, listener, n_messages, p_error=0.0, trials=2000, seed=99):",
       "    rng = random.Random(seed); ok = 0",
       "    with torch.no_grad():",
       "        for _ in range(trials):",
       "            t = rng.randrange(N_TARGETS)",
       "            m = int(torch.argmax(speaker(onehot(t, N_TARGETS))))",
       "            r = rng.randrange(n_messages) if rng.random() < p_error else m",
       "            ok += int(torch.argmax(listener(onehot(r, n_messages)))) == t",
       "    return ok / trials",
       "",
       "",
       "speaker, listener, hist = train_pair(seed=0)",
       "learned = score(speaker, listener, N_MESSAGES)",
       "print(f'learned protocol: {learned:.3f}')",
       "",
       "fig, ax = plt.subplots(figsize=(6, 3))",
       "ax.plot(rolling(hist), lw=1.6)",
       "ax.axhline(1 / N_TARGETS, ls='--', lw=1, color='grey')",
       "ax.text(0, 1 / N_TARGETS + 0.02, 'chance', color='grey', fontsize=8)",
       "ax.set_xlabel('training batch'); ax.set_ylabel('team success')",
       "ax.set_title('A protocol learned from scratch'); ax.set_ylim(0, 1.05)",
       "plt.tight_layout(); plt.show()"))

# ---------------- 4 inspect and stress ----------------
A(md("## 4. Inspect and Stress-Test"))

A(keq("Protocol Matrix",
      r"P\left(m \mid g\right)",
      [r"$g$ is the target the speaker saw", r"$m$ is the symbol it sends"],
      "A converged protocol has one bright cell per row: each target maps to one symbol."))

A(code("P = protocol_matrix(speaker, N_TARGETS)",
       "plot_protocol_heatmap(P, TARGET_NAMES)",
       "plt.tight_layout(); plt.show()",
       "",
       "display(pd.DataFrame([",
       "    dict(target=TARGET_NAMES[t], symbol=int(P[t].argmax()),",
       "         confidence=round(float(P[t].max()), 3))",
       "    for t in range(N_TARGETS)]))"))

A(md("### Message capacity",
     "",
     "$$|\\mathcal{M}| \\in \\{1, 2, 3\\}$$",
     "",
     "Predict the ceiling for two symbols and three targets before running this."))
A(code("cap_rows = []",
       "for k in (1, 2, 3):",
       "    scores = [score(*train_communication_agents(N_TARGETS, k, episodes=2500, seed=s)[:2], k)",
       "              for s in range(3)]",
       "    cap_rows.append(dict(capacity=k, success=np.mean(scores),",
       "                         ceiling=min(k, N_TARGETS) / N_TARGETS))",
       "cap = pd.DataFrame(cap_rows)",
       "display(cap.round(3))",
       "",
       "fig, ax = plt.subplots(figsize=(5.4, 3))",
       "ax.plot(cap.capacity, cap.ceiling, ls='--', marker='s', color='grey', label='ceiling')",
       "ax.plot(cap.capacity, cap.success, marker='o', lw=2, label='measured')",
       "ax.set_xlabel('|M|'); ax.set_ylabel('success'); ax.set_xticks([1, 2, 3])",
       "ax.set_title('A narrow channel merges situations'); ax.set_ylim(0, 1.05); ax.legend()",
       "plt.tight_layout(); plt.show()"))

A(md("### Message noise",
     "",
     "$$p_{\\text{error}} \\in \\{0, 0.2, 0.4\\}$$"))
A(code("noise_rows = []",
       "for p in (0.0, 0.2, 0.4):",
       "    sp, li, _ = train_communication_agents(N_TARGETS, N_MESSAGES,",
       "                                       message_error=p, episodes=2500, seed=0)",
       "    noise_rows.append(dict(p_error=p, success=score(sp, li, N_MESSAGES, p_error=p),",
       "                           predicted=(1 - p) + p / N_TARGETS))",
       "noise = pd.DataFrame(noise_rows)",
       "display(noise.round(3))",
       "",
       "fig, ax = plt.subplots(figsize=(5.4, 3))",
       "ax.plot(noise.p_error, noise.predicted, ls='--', color='grey',",
       "        label=r'if the protocol ignores noise')",
       "ax.plot(noise.p_error, noise.success, marker='o', lw=2, label='measured')",
       "ax.set_xlabel(r'$p_{error}$'); ax.set_ylabel('success')",
       "ax.set_title('An unreliable channel'); ax.set_ylim(0, 1.05); ax.legend()",
       "plt.tight_layout(); plt.show()"))

A(md("### Protocol mismatch",
     "",
     "Two independent runs. Each pair works with itself."))
A(code("pairs = [train_pair(seed=s) for s in (0, 1)]",
       "labels = ['Speaker A + Listener A', 'Speaker A + Listener B']",
       "vals = [score(pairs[0][0], pairs[0][1], N_MESSAGES),",
       "        score(pairs[0][0], pairs[1][1], N_MESSAGES)]",
       "",
       "fig, axes = plt.subplots(1, 2, figsize=(8.4, 3))",
       "for ax, (idx, name) in zip(axes, [(0, 'run A'), (1, 'run B')]):",
       "    plot_protocol_heatmap(protocol_matrix(pairs[idx][0], N_TARGETS), TARGET_NAMES,",
       "                  title=f'{name} protocol', ax=ax)",
       "plt.tight_layout(); plt.show()",
       "",
       "bars(labels, vals, 'Same task, same channel, different partner',",
       "     'success rate', chance=1 / N_TARGETS)"))

A(md("> **Question 2.** Why can two successful protocols fail when their agents",
     "> are mixed?"))

# ---------------- takeaways ----------------
A(md("## Takeaways",
     "",
     "- A channel is worth nothing until its symbols mean something, and the",
     "  meanings are not in the environment.",
     "- Capacity **merges situations**: success tracks",
     "  $\\min(|\\mathcal{M}|, 3)/3$.",
     "- A protocol that ignores the channel degrades along",
     "  $1 - p + p/3$ under noise.",
     "- Symbol assignments are arbitrary, so independent runs disagree."))

# ---------------- solutions ----------------
A(md("---",
     "",
     "# Solutions",
     "",
     "Code for each exercise, in notebook order."))

A(md("### Solution 1: Target encoder"))
A(solution(1, "encoder",
           "def encode_target(target):",
           "    return target",
           "",
           "",
           "print('encode_target defined')"))
A(md("Any injective map works; a permutation is just as good as the identity."))

A(md("### Solution 2: Message distribution"))
A(solution(2, "message distribution",
           "def speak(speaker, target_vec):",
           "    message_logits = speaker(target_vec)",
           "    message_dist = torch.distributions.Categorical(logits=message_logits)",
           "    message = message_dist.sample()",
           "    return message_dist, message",
           "",
           "",
           "print('speak defined')"))
A(md("Sampling rather than taking the argmax is what lets the speaker discover a",
     "better symbol, and the distribution supplies the `log_prob` the gradient",
     "needs."))

A(md("### Solution 3: Listener input"))
A(solution(3, "listener input",
           "def listen(listener, message, n_messages):",
           "    listener_input = torch.stack([onehot(int(m), n_messages) for m in message])",
           "    action_dist = torch.distributions.Categorical(logits=listener(listener_input))",
           "    return action_dist, action_dist.sample()",
           "",
           "",
           "print('listen defined')"))
A(md("One-hot rather than the raw integer, so the network is not told that symbol",
     "2 lies between 1 and 3."))

nb = notebook("01 Communicate: Learning a Communication Protocol", C,
              path="notebooks/01_communicate.ipynb")
write(nb, "notebooks/01_communicate.ipynb")
