"""
Shared builders for the Colab lab notebooks.

The notebook standard these enforce is recorded in CHECKLIST.md. Two rules
are structural rather than stylistic, so they live in code here:

  keq()   Important equations are display LaTeX inside a titled box with an
          intuition line. Never plain text, never a code block.

  todo()  A learner cell carries no completed code, and is TAGGED so the
          verifier can swap in its solution and prove the pipeline runs.
          Nothing above the Solutions heading may expose an answer.

The Solutions section holds CODE ONLY, with at most one short sentence each.
Interpretation, discussion, deployment and reflection questions are never
answered there: the learner's own reasoning is the deliverable, and printing an
answer next to it removes the only reason to attempt it.
"""
import json


REPO = "rexsimiloluwah/marl-for-cooperative-environments"
BRANCH = "main"
REPO_HTTPS = f"https://github.com/{REPO}"


def md(*lines):
    return {"cell_type": "markdown", "metadata": {}, "source": "\n".join(lines)}


def code(*lines, tags=None):
    cell = {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": "\n".join(lines),
    }
    if tags:
        cell["metadata"]["tags"] = tags
    return cell


def keq(title, tex, symbols=None, intuition=None):
    """A Key Equation box: title, display maths, optional symbols, intuition."""
    out = [f"> ### Key Equation: {title}", ">", "> $$"]
    out += [f"> {line}" for line in tex.strip().split("\n")]
    out += ["> $$"]
    if symbols:
        out += [">"]
        out += [f"> - {s}" for s in symbols]
    if intuition:
        out += [">", f"> **Intuition:** {intuition}"]
    return md(*out)


def todo(n, *lines):
    """An incomplete learner cell. Tagged todo-N; its solution is solution-N."""
    return code(*lines, tags=[f"todo-{n}"])


def solution(n, title, *lines):
    """A completed cell in the Solutions section, tagged solution-N."""
    return code(*lines, tags=[f"solution-{n}"])


def install_cell(learning=False):
    """
    Section 0.1.

    One line for the learner: install the package. Everything the labs need
    lives in it, so nothing else has to be pinned here.

    ``learning=True`` adds the PyTorch extra, which only the speaker-listener
    protocol experiments need.

    THE FALLBACK
    The headline command is the published one. While the package is not yet on
    PyPI, the cell falls back to installing it straight from this repository's
    subdirectory, and says which route it took. Once it is published the
    fallback stops being reached.
    """
    spec = "cooperative-marl-labs[learning]" if learning else "cooperative-marl-labs"
    return code(
        "# Only needed on a fresh Colab runtime. Safe to re-run.",
        f"!pip install -q \"{spec}\"",
        "",
        "import importlib.util, subprocess, sys",
        "",
        "if importlib.util.find_spec('cooperative_marl_labs') is None:",
        "    # not on PyPI yet: install it from the course repository instead",
        f"    REPO = '{REPO_HTTPS}'",
        "    subprocess.run(",
        "        [sys.executable, '-m', 'pip', 'install', '-q',",
        f"         f'git+{{REPO}}@{BRANCH}#subdirectory=cooperative-marl-labs'],",
        "        check=False,",
        "    )",
        "    importlib.invalidate_caches()",
        "",
        "if importlib.util.find_spec('cooperative_marl_labs') is None:",
        "    raise SystemExit(",
        "        'cooperative-marl-labs could not be installed.\\n'",
        "        'It may not be published yet and the repository may have no '",
        "        'commits.\\n'",
        f"        'See {REPO_HTTPS}'",
        "    )",
        "",
        "import cooperative_marl_labs",
        "print('cooperative-marl-labs', cooperative_marl_labs.__version__)",
    )




def raw_url(path):
    """A raw URL for a file in this repository.

    Images have to be addressed absolutely: Colab loads a notebook from GitHub
    without the rest of the repository around it, so a relative path resolves
    to nothing. This renders once the repository has content pushed.
    """
    return f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/{path}"


def notebook(name, cells, repo=REPO, branch=BRANCH, path=None):
    """Wraps cells with the Colab badge and standard metadata."""
    url = f"https://colab.research.google.com/github/{repo}/blob/{branch}/{path}"
    badge = md(
        f'<a href="{url}" target="_parent">'
        f'<img src="https://colab.research.google.com/assets/colab-badge.svg" '
        f'alt="Open In Colab"/></a>'
    )
    return {
        "cells": [badge] + cells,
        "metadata": {
            "colab": {"name": name, "provenance": []},
            "kernelspec": {"display_name": "Python 3", "name": "python3"},
            "language_info": {"name": "python"},
        },
        "nbformat": 4,
        "nbformat_minor": 0,
    }


def write(nb, path):
    import pathlib
    pathlib.Path(path).write_text(json.dumps(nb, indent=1))
    n_todo = sum(1 for c in nb["cells"] if "todo-" in str(c["metadata"].get("tags", "")))
    n_sol = sum(1 for c in nb["cells"] if "solution-" in str(c["metadata"].get("tags", "")))
    print(f"  wrote {path}: {len(nb['cells'])} cells, {n_todo} TODO, {n_sol} solutions")
    return n_todo, n_sol
