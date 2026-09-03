"""Tests for the cooperative wireless environment.

Run them from the repository root::

    python3 -m pytest wireless_env/tests -q

These tests check **numerical behaviour**, not merely that functions return
without raising.  Where the package's documentation makes a claim about the
model -- that channel gain falls monotonically with distance, that interference
accumulates only on a matching channel, that Jain's index hits exactly ``1/n``
for a single served user, that the orthogonal allocation is a throughput
ceiling on the familiar topology -- there is a test here that verifies the
claim rather than restating it.

``test_physics.py`` and ``test_metrics.py`` additionally replay every case in
``wireless_env/fixtures/test_vectors.json`` against the live code, and
``test_environment.py`` replays the fixture's deterministic 10-step rollout.
That makes a stale fixture a test failure, which matters because the
TypeScript port of the browser lab is validated against that file.
"""
