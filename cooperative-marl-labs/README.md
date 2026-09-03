# Cooperative MARL Labs

Small cooperative multi-agent environments and utilities for the Colab
practicals in *Multi-Agent Reinforcement Learning for Cooperative
Environments*. It exists to keep the notebooks short: the environments,
baselines, training loops and plots live here, so a notebook holds the
experiment and nothing else.

These are **teaching models, not research benchmarks**. The wireless
environment is a simplified interference model with no fading, mobility or
protocol overhead. No number it produces is a benchmark result or a wireless
engineering result.

## Installation

```bash
pip install cooperative-marl-labs
```

The speaker-listener protocol experiments train a small neural network, so they
need one extra:

```bash
pip install "cooperative-marl-labs[learning]"
```

Everything runs on a free Colab CPU. No GPU, no Ray, no RLlib.

## Quick start

### Communication

```python
from cooperative_marl_labs.envs import SpeakerListenerEnv

env = SpeakerListenerEnv(n_targets=3, message_vocab_size=3)
observations, infos = env.reset(seed=42)

# the speaker sends a symbol, then the listener guesses
observations, rewards, terminations, truncations, infos = env.step(
    {"speaker": 1, "listener": 0}
)
observations, rewards, terminations, truncations, infos = env.step(
    {"speaker": 1, "listener": 2}
)
```

### Adaptation

```python
from cooperative_marl_labs.envs import PartnerCoordinationEnv
from cooperative_marl_labs.policies import FetchFirstPartner

env = PartnerCoordinationEnv()
env.set_partner(FetchFirstPartner(seed=42))

observations, infos = env.reset(seed=42)
observations, rewards, *_ = env.step({"ego": 1})   # COOK, complementary
```

### Wireless resource allocation

```python
from cooperative_marl_labs.envs import WirelessResourceAllocationEnv

env = WirelessResourceAllocationEnv(n_agents=4, n_channels=3)
observations, infos = env.reset(seed=42)
env.render()

env.step({"ap_0": 0, "ap_1": 1, "ap_2": 2, "ap_3": 0})
env.render()
```

## What is in here

### Environments

| Class | Practical | The question it asks |
| --- | --- | --- |
| `SpeakerListenerEnv` | Communicate | What can one symbol per episode buy? |
| `PartnerCoordinationEnv` | Adapt | Did the ego learn to cooperate, or learn one partner? |
| `WirelessResourceAllocationEnv` | Challenge Lab | Which pair of access points should share a channel? |

All three are PettingZoo `ParallelEnv`s and pass `pettingzoo.test.parallel_api_test`.

### Agents

`RandomWirelessAgent`, `GreedyWirelessAgent`, `QLearningWirelessAgent`,
`CommunicatingWirelessAgent`, plus the generic `RandomAgent` and
`QLearningAgent`. All tabular, all CPU.

`Speaker` and `Listener` are two small PyTorch multilayer perceptrons, imported
only when asked for, so the base install needs no torch.

### Partner policies

`FetchFirstPartner` (P(FETCH) = 0.95), `CookFirstPartner` (0.05),
`BalancedPartner` (0.50), `HeldOutPartner` (0.25) and `ReactivePartner`, which
takes whichever role the ego did not.

`TRAINING_POPULATION` and `HELD_OUT` name which partners may be trained
against. Training on a held-out partner invalidates the generalization claim
the Adapt lab makes, which is why the split is in the package rather than in a
notebook.

### Utilities

```python
from cooperative_marl_labs.training import train_independent_q_learning, train_vdn
from cooperative_marl_labs.evaluation import evaluate_agents, crossplay_matrix
from cooperative_marl_labs.visualization import (
    plot_protocol_heatmap,
    plot_crossplay_matrix,
    plot_partner_estimate,
    render_wireless_network,
    plot_wireless_comparison,
)
```

`evaluate_agents` is always greedy and always seeded, and returns
`team_reward`, `total_throughput`, `mean_throughput`, `interference`,
`collision_rate`, `messages_sent` and `avoidable_interference`, averaged per
step. It converts straight to a pandas row.

## Reading a wireless observation

Each access point sees only its own situation:

```
[demand, quality per channel, interference per channel, previous channel, messages]
```

Read it through the helpers rather than by index, so nothing breaks when
communication is turned on and the vector gets longer:

```python
from cooperative_marl_labs.envs import (
    WirelessResourceAllocationEnv,
    extract_channel_quality,
    extract_demand,
    extract_interference,
    extract_previous_channel,
)

env = WirelessResourceAllocationEnv(n_agents=4, n_channels=3)
observations, infos = env.reset(seed=42)
observation = observations["ap_0"]

demand = extract_demand(observation)
quality = extract_channel_quality(observation, env)
interference = extract_interference(observation, env)   # pass env when comm is on
previous = extract_previous_channel(observation, env)   # -1 on the first step
```

`env.state()` returns the centralized picture for centralized training and for
evaluation. Do not pass it to an agent at execution time.

## The wireless model, stated plainly

- Access points sit at fixed 2D positions and never move.
- Two on the same channel interfere by `1 / (1 + (distance / d0) ** 2)`.
- Rate is `log2(1 + quality * P / (noise + interference))`.
- Useful throughput is `min(demand, rate)`: capacity beyond what an access
  point wants is wasted, so *which* pair shares matters more than how many.
- Team reward is `throughput - 0.2 * interference - 0.05 * messages`, and every
  access point receives the same value.
- No fading, mobility, protocol overhead, user scheduling or power control.

`env.best_possible()` searches all `n_channels ** n_agents` allocations and
returns the ceiling, which is what an experiment result should be read against.

## Interventions

Every stress test goes through a method, so a notebook never reaches into
environment attributes:

```python
from cooperative_marl_labs.envs import WirelessResourceAllocationEnv

env = WirelessResourceAllocationEnv(n_agents=4, n_channels=3)

env.set_traffic("ap_2", demand=1.0)
env.set_channel_quality(agent="ap_1", channel=1, quality=0.5)
env.set_message_loss(0.3)
env.set_communication(True)

env.clear_traffic()
env.reset_channel_quality()

observations, infos = env.reset(seed=42)   # interventions apply from here
```

## Development

```bash
python -m venv .venv && source .venv/bin/activate
python -m pip install -e ".[dev,learning]"
pytest
ruff check .
```

## Publishing

See [PUBLISHING.md](PUBLISHING.md).

## Licence

MIT.
