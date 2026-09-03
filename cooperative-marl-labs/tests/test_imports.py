"""
The public API is a promise. These tests are that promise, written down.

Every import here appears in the README or in a notebook, so a rename that
would break a learner's first cell fails here first.
"""

from __future__ import annotations

import importlib

import pytest


def test_version_is_exposed():
    import cooperative_marl_labs

    assert isinstance(cooperative_marl_labs.__version__, str)
    assert cooperative_marl_labs.__version__.count(".") == 2


def test_top_level_environments():
    from cooperative_marl_labs import (
        PartnerCoordinationEnv,
        SpeakerListenerEnv,
        WirelessResourceAllocationEnv,
    )

    assert SpeakerListenerEnv and PartnerCoordinationEnv
    assert WirelessResourceAllocationEnv


def test_envs_public_api():
    from cooperative_marl_labs.envs import (  # noqa: F401
        COOK,
        FETCH,
        PartnerCoordinationEnv,
        SpeakerListenerEnv,
        WirelessResourceAllocationEnv,
        extract_channel_quality,
        extract_demand,
        extract_interference,
        extract_previous_channel,
    )

    assert (FETCH, COOK) == (0, 1)


def test_policies_public_api():
    from cooperative_marl_labs.policies import (
        BalancedPartner,
        CookFirstPartner,
        FetchFirstPartner,
        HeldOutPartner,
        ReactivePartner,
    )

    for cls in (
        FetchFirstPartner,
        CookFirstPartner,
        BalancedPartner,
        ReactivePartner,
        HeldOutPartner,
    ):
        assert cls(seed=0).act(None, []) in (0, 1)


def test_agents_public_api():
    from cooperative_marl_labs.agents import (
        CommunicatingWirelessAgent,
        GreedyWirelessAgent,
        QLearningWirelessAgent,
        RandomWirelessAgent,
    )

    for cls in (
        RandomWirelessAgent,
        GreedyWirelessAgent,
        QLearningWirelessAgent,
        CommunicatingWirelessAgent,
    ):
        assert cls("ap_0", 3, 4) is not None


def test_evaluation_public_api():
    from cooperative_marl_labs.evaluation import (  # noqa: F401
        crossplay_matrix,
        evaluate_agents,
    )


def test_visualization_public_api():
    from cooperative_marl_labs.visualization import (  # noqa: F401
        plot_crossplay_matrix,
        plot_partner_estimate,
        plot_protocol_heatmap,
        plot_wireless_comparison,
        render_wireless_network,
    )


def test_training_public_api():
    from cooperative_marl_labs.training import (  # noqa: F401
        train_independent_q_learning,
        train_vdn,
    )


@pytest.mark.skipif(
    importlib.util.find_spec("torch") is None, reason="needs the learning extra"
)
def test_training_communication_needs_torch_only():
    from cooperative_marl_labs.training import (  # noqa: F401
        protocol_matrix,
        train_communication_agents,
    )


def test_unknown_attribute_raises_attribute_error():
    import cooperative_marl_labs.agents as agents

    with pytest.raises(AttributeError):
        agents.NoSuchAgent  # noqa: B018  the point is that this raises


def test_import_is_fast():
    """A learner's first cell should not stall. No torch at import time."""
    import subprocess
    import sys

    code = (
        "import sys, cooperative_marl_labs.envs, cooperative_marl_labs.agents;"
        "print('torch' in sys.modules)"
    )
    out = subprocess.run(
        [sys.executable, "-c", code], capture_output=True, text=True, check=True
    )
    assert out.stdout.strip() == "False"
