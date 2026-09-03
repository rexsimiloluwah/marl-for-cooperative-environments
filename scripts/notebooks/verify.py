"""
Verifies a lab notebook against the standard in CHECKLIST.md.

Four checks, and the third is the one that matters most:

  1. structure   required headings present, in order
  2. pairing     every todo-N has exactly one solution-N
  3. NO LEAKS    no solution cell, and no completed TODO, appears before the
                 "# Solutions" heading
  4. runnable    with each TODO replaced by its solution, the notebook
                 executes top to bottom

Check 4 exists because a notebook full of TODOs cannot run as shipped. Proving
it runs *with the answers* is the only way to know the exercises are solvable
and the surrounding infrastructure is correct.
"""
import json, os, re, subprocess, sys, tempfile, pathlib

REQUIRED = [
    "## Learning objectives",
    "## 0. Setup",
    "### 0.1 Install dependencies",
    "### 0.2 Import required libraries",
    "### 0.3 Reproducibility and configuration",
    "### 0.4 Helper functions",
    "### 0.5 Environment",
    "## Takeaways",
    "# Solutions",
]

# Phrases that mean a discussion answer has leaked into Solutions, which the
# standard forbids: only code belongs there.
BANNED_IN_SOLUTIONS = (
    "answers to the discussion",
    "discussion question",
    "final question.",
    "sample strong answer",
)


def tags(cell):
    return cell["metadata"].get("tags", []) or []


def strip_magics(text):
    """
    Drop Jupyter line magics before running a cell as plain Python.

    The install cell leads with `!pip install`, which is the command a learner
    should see. It is not Python, so the runnable copy skips it; the fallback
    below it does the same job through subprocess.
    """
    return "\n".join(
        line for line in text.splitlines() if not line.lstrip().startswith(("!", "%"))
    )


def source(cell):
    """A cell's source as one string.

    nbformat permits either a string or a list of lines, and a notebook that
    has been opened in Jupyter comes back as lines, so both have to be read.
    """
    src = cell["source"]
    return src if isinstance(src, str) else "".join(src)


def check(path, required=REQUIRED, run=True):
    nb = json.loads(pathlib.Path(path).read_text())
    cells = nb["cells"]
    fails = []

    # ---- 1. structure ----
    flat = "\n".join(source(c) for c in cells if c["cell_type"] == "markdown")
    pos = -1
    for h in required:
        i = flat.find(h)
        if i < 0:
            fails.append(f"missing heading: {h}")
        elif i < pos:
            fails.append(f"heading out of order: {h}")
        else:
            pos = i

    # ---- 2. pairing ----
    todos = {t for c in cells for t in tags(c) if t.startswith("todo-")}
    sols = {t for c in cells for t in tags(c) if t.startswith("solution-")}
    for t in sorted(todos):
        if t.replace("todo-", "solution-") not in sols:
            fails.append(f"{t} has no matching solution")
    for s in sorted(sols):
        if s.replace("solution-", "todo-") not in todos:
            fails.append(f"{s} has no matching todo")

    # ---- 3. no leaks before the Solutions heading ----
    sol_idx = next((i for i, c in enumerate(cells)
                    if c["cell_type"] == "markdown" and "# Solutions" in source(c)), None)
    if sol_idx is None:
        fails.append("no '# Solutions' heading")
    else:
        for i, c in enumerate(cells):
            if i < sol_idx and any(t.startswith("solution-") for t in tags(c)):
                fails.append(f"solution cell at index {i} appears BEFORE Solutions")
            if i > sol_idx and any(t.startswith("todo-") for t in tags(c)):
                fails.append(f"todo cell at index {i} appears AFTER Solutions")
        # a TODO must actually be incomplete
        for i, c in enumerate(cells):
            if any(t.startswith("todo-") for t in tags(c)):
                src = source(c)
                if "# TODO" not in src:
                    fails.append(f"todo cell {i} carries no '# TODO' marker")
                if "raise NotImplementedError" not in src and "..." not in src:
                    fails.append(f"todo cell {i} may contain a completed answer")

    # ---- 3b. Solutions must hold code, not answers to discussion prompts ----
    if sol_idx is not None:
        tail = "\n".join(
            source(c) for c in cells[sol_idx:] if c["cell_type"] == "markdown"
        ).lower()
        for phrase in BANNED_IN_SOLUTIONS:
            if phrase in tail:
                fails.append(f"Solutions contains a discussion answer: '{phrase}'")

    # ---- 4. runnable with solutions substituted ----
    if run and sol_idx is not None:
        sol_src = {}
        for c in cells:
            for t in tags(c):
                if t.startswith("solution-"):
                    sol_src[t.replace("solution-", "todo-")] = source(c)
        parts = []
        for i, c in enumerate(cells):
            if c["cell_type"] != "code":
                continue
            tg = [t for t in tags(c) if t.startswith(("todo-", "solution-"))]
            if tg and tg[0].startswith("todo-"):
                parts.append(strip_magics(sol_src.get(tg[0], source(c))))
            elif tg and tg[0].startswith("solution-"):
                continue                                        # already substituted
            else:
                parts.append(strip_magics(source(c)))
        script = "\n\n".join(parts)
        script = (script
                  .replace("import matplotlib.pyplot as plt",
                           "import matplotlib\nmatplotlib.use('Agg')\nimport matplotlib.pyplot as plt")
                  .replace("plt.show()", "plt.close('all')")
                  .replace("display(", "print("))
        with tempfile.TemporaryDirectory() as d:
            f = pathlib.Path(d) / "run.py"
            f.write_text(script)
            # Run in a temp dir so figures do not litter the repo, but put
            # The package on PYTHONPATH so `import cooperative_marl_labs`
            # resolves and the install cell short-circuits, exactly as it does
            # on a warm Colab.
            env = dict(os.environ)
            root = pathlib.Path(__file__).resolve().parents[2]
            env["PYTHONPATH"] = os.pathsep.join(
                [str(root / "cooperative-marl-labs" / "src"), str(root)]
                + ([env["PYTHONPATH"]] if env.get("PYTHONPATH") else [])
            )
            env["MPLBACKEND"] = "Agg"
            r = subprocess.run([sys.executable, str(f)], capture_output=True,
                               text=True, timeout=5400, cwd=d, env=env)
        if r.returncode != 0:
            tail = (r.stderr or "").strip().splitlines()[-6:]
            fails.append("execution failed:\n      " + "\n      ".join(tail))

    name = pathlib.Path(path).name
    if fails:
        print(f"  FAIL {name}")
        for f in fails:
            print(f"    - {f}")
        return False
    print(f"  PASS {name}  ({len(cells)} cells, {len(todos)} exercises)")
    return True


if __name__ == "__main__":
    ok = all(check(p, run="--no-run" not in sys.argv) for p in sys.argv[1:] if p.endswith(".ipynb"))
    sys.exit(0 if ok else 1)
