"""
Every Python block in the README runs.

A README example that has drifted is worse than no example, because a learner
copies it into a first cell and the package looks broken.
"""

from __future__ import annotations

import pathlib
import re
import subprocess
import sys

import pytest

README = pathlib.Path(__file__).resolve().parents[1] / "README.md"


def _blocks() -> list[str]:
    text = README.read_text()
    return re.findall(r"```python\n(.*?)```", text, re.S)


def test_readme_has_examples():
    assert len(_blocks()) >= 4


@pytest.mark.parametrize("index", range(len(_blocks())))
def test_readme_block_runs(index: int, tmp_path: pathlib.Path):
    script = tmp_path / f"block_{index}.py"
    script.write_text(_blocks()[index])
    result = subprocess.run(
        [sys.executable, str(script)],
        capture_output=True,
        text=True,
        env={"MPLBACKEND": "Agg", "PATH": "/usr/bin:/bin"},
    )
    assert result.returncode == 0, (
        f"README block {index + 1} failed:\n{result.stderr}"
    )
