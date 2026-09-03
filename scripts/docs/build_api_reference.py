"""
Generate the API reference pages from the installed package.

WHY GENERATE RATHER THAN WRITE
A reference page written by hand drifts the moment a signature changes, and a
drifted reference is worse than none: a learner copies it and it does not run.
These pages are introspected from `cooperative_marl_labs` itself, so a rename
shows up here on the next build rather than in somebody's notebook.

The prose still comes from the source. Docstrings are the documentation; this
script only arranges them.

    python3 scripts/docs/build_api_reference.py
"""

from __future__ import annotations

import importlib
import inspect
import pathlib
import re
import sys
import textwrap

OUT = pathlib.Path("src/content/docs/package")

# One page per module, in the order a learner meets them.
PAGES = [
    {
        "slug": "environments",
        "module": "cooperative_marl_labs.envs",
        "title": "Environments",
        "description": "The three cooperative environments behind the labs, and the helpers for reading a wireless observation.",
        "lead": (
            "Every environment here is a PettingZoo `ParallelEnv`. `reset(seed)` "
            "returns `(observations, infos)` and `step(actions)` returns "
            "`(observations, rewards, terminations, truncations, infos)`, all "
            "keyed by agent name."
        ),
    },
    {
        "slug": "agents",
        "module": "cooperative_marl_labs.agents",
        "title": "Agents",
        "description": "Baseline and learning agents: random, greedy, tabular Q-learning, and the speaker-listener networks.",
        "lead": (
            "All of these are tabular or tiny on purpose. A deep agent would hide "
            "the thing the labs are about: exactly what each agent conditions on, "
            "and exactly what it is credited with."
        ),
    },
    {
        "slug": "policies",
        "module": "cooperative_marl_labs.policies",
        "title": "Partner Policies",
        "description": "The scripted partners the Adapt lab trains against and evaluates on.",
        "lead": (
            "Each partner takes the FETCH role with its own probability, so no "
            "single observation identifies one. Telling them apart needs a "
            "history, which is what makes a partner model worth building."
        ),
    },
    {
        "slug": "training",
        "module": "cooperative_marl_labs.training",
        "title": "Training",
        "description": "Independent Q-learning, value decomposition, and the speaker-listener trainer.",
        "lead": (
            "One loop covers independent learning and value decomposition, because "
            "the only difference between them is how the error is computed. "
            "Keeping them in one function is what makes the comparison honest."
        ),
    },
    {
        "slug": "evaluation",
        "module": "cooperative_marl_labs.evaluation",
        "title": "Evaluation",
        "description": "Greedy, seeded evaluation and the cross-play matrix.",
        "lead": (
            "Always greedy, because an evaluation that keeps exploring reports a "
            "policy nobody would deploy. Always from a fixed seed, so two systems "
            "are compared on the same episodes rather than on different luck."
        ),
    },
    {
        "slug": "visualization",
        "module": "cooperative_marl_labs.visualization",
        "title": "Visualization",
        "description": "Matplotlib helpers for protocols, cross-play, partner estimates and the wireless network.",
        "lead": (
            "Each plot answers a single question. They share the resource's six "
            "semantic colours, so a figure in a notebook and a diagram on the "
            "website agree about what a colour means."
        ),
    },
]


# --------------------------------------------------------------- docstrings

def to_markdown(doc: str) -> str:
    """
    Turn a docstring into markdown.

    Handles the two RST-isms these docstrings use: double-backtick literals,
    and `Parameters` / `Returns` sections underlined with dashes.
    """
    text = textwrap.dedent(doc).strip()
    text = re.sub(r"``([^`]+)``", r"`\1`", text)

    lines = text.split("\n")
    out: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        nxt = lines[i + 1] if i + 1 < len(lines) else ""
        if line.strip() and set(nxt.strip()) == {"-"} and len(nxt.strip()) >= 3:
            out.append(f"**{line.strip()}**")
            out.append("")
            i += 2
            continue
        out.append(line)
        i += 1
    return "\n".join(out).strip()


def assert_mdx_safe(text: str, where: str) -> None:
    """
    Refuse to emit anything MDX would misparse.

    `{` opens an expression and `<` opens a JSX tag. Failing here is much
    cheaper than a build error with no line number, and it tells the author to
    wrap the character in backticks in the docstring itself.
    """
    stripped = re.sub(r"(?s)```.*?```", "", text)
    stripped = re.sub(r"`[^`\n]*`", "", stripped)
    for ch in ("{", "<"):
        if ch in stripped:
            bad = next(l for l in text.split("\n") if ch in l)
            sys.exit(
                f"MDX-unsafe {ch!r} in {where}:\n    {bad.strip()}\n"
                f"Wrap it in backticks in the docstring."
            )


# ---------------------------------------------------------------- rendering

def signature_of(obj) -> str:
    try:
        if inspect.isclass(obj):
            sig = inspect.signature(obj.__init__)
            params = list(sig.parameters.values())[1:]  # drop self
            sig = sig.replace(parameters=params)
        else:
            sig = inspect.signature(obj)
    except (TypeError, ValueError):
        return obj.__name__
    rendered = str(sig)
    # `from __future__ import annotations` makes every annotation a string, so
    # the repr arrives quoted. Unquote it: `n: 'int' = 3` is noise.
    rendered = re.sub(r"<class '([^']+)'>", r"\1", rendered)
    rendered = re.sub(r"(?<=[:>]\s)'([^']+)'", r"\1", rendered)
    rendered = rendered.replace("cooperative_marl_labs.", "")
    return wrap_signature(f"{obj.__name__}{rendered}")


def wrap_signature(text: str, width: int = 72) -> str:
    """
    Break a long signature onto one line per parameter.

    A signature wider than the code block is silently clipped, which is the
    one thing a reference page must not do.
    """
    if len(text) <= width:
        return text
    head, _, rest = text.partition("(")
    args, _, tail = rest.rpartition(")")
    parts, depth, current = [], 0, ""
    for ch in args:
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append(current.strip())
            current = ""
        else:
            current += ch
    if current.strip():
        parts.append(current.strip())
    body = ",\n".join(f"    {p}" for p in parts)
    return f"{head}(\n{body},\n){tail}"


def own_doc(fn, cls) -> str:
    """
    A method's docstring, from this package only.

    `inspect.getdoc` walks up to the base class, which here means PettingZoo
    and torch. That is how `render()` came to be described as "displays a
    rendered frame", which is not what our text renderer does. A wrong
    description is worse than none, so inheritance stops at the package
    boundary: a base class of ours can supply the text, nothing else can.
    """
    if fn.__doc__:
        return fn.__doc__
    name = fn.__name__
    for base in inspect.getmro(cls)[1:]:
        if not getattr(base, "__module__", "").startswith("cooperative_marl_labs"):
            continue
        inherited = getattr(base, name, None)
        if inherited is not None and getattr(inherited, "__doc__", None):
            return inherited.__doc__
    return ""


def public_methods(cls) -> list[tuple[str, object]]:
    """Methods defined on the class or its package base, never inherited noise."""
    out = []
    for name, fn in inspect.getmembers(cls, inspect.isfunction):
        if name.startswith("_"):
            continue
        module = getattr(fn, "__module__", "")
        if not module.startswith("cooperative_marl_labs"):
            continue
        out.append((name, fn))
    return sorted(out)


def render_symbol(name: str, obj, module_name: str) -> list[str]:
    lines = [f"### {name}", ""]
    kind = "class" if inspect.isclass(obj) else "function"
    lines += ["```python", f"from {module_name} import {name}", "", signature_of(obj), "```", ""]

    doc = inspect.getdoc(obj)
    if doc:
        body = to_markdown(doc)
        assert_mdx_safe(body, f"{module_name}.{name}")
        lines += [body, ""]

    if kind == "class":
        methods = public_methods(obj)
        if methods:
            lines += ["**Methods**", ""]
            for mname, fn in methods:
                mdoc = own_doc(fn, obj)
                summary = to_markdown(mdoc).split("\n\n")[0].replace("\n", " ") if mdoc else ""
                assert_mdx_safe(summary, f"{module_name}.{name}.{mname}")
                sig = signature_of(fn).replace(f"{mname}(self, ", f"{mname}(").replace(
                    f"{mname}(self)", f"{mname}()")
                lines.append(f"- `{sig}`" + (f"  \n  {summary}" if summary else ""))
            lines.append("")
    return lines


def render_page(page: dict) -> str:
    module = importlib.import_module(page["module"])
    names = list(getattr(module, "__all__", []))

    classes, functions, constants = [], [], []
    for name in names:
        obj = getattr(module, name, None)
        if obj is None:
            continue
        if inspect.isclass(obj):
            classes.append((name, obj))
        elif inspect.isfunction(obj):
            functions.append((name, obj))
        else:
            constants.append((name, obj))

    rel = "../../../components"
    out = [
        "---",
        f'title: "{page["title"]}"',
        f'description: "{page["description"]}"',
        "related:",
        "  - slug: package/overview",
        "    icon: package",
        "---",
        "",
        f"import Callout from '{rel}/ui/Callout.astro';",
        f"import SectionMeta from '{rel}/ui/SectionMeta.astro';",
        "",
        "<SectionMeta />",
        "",
        "{/* GENERATED by scripts/docs/build_api_reference.py. Do not edit by",
        "    hand: edit the docstrings in the package and rebuild. */}",
        "",
        page["lead"],
        "",
        f"Import from `{page['module']}`.",
        "",
    ]

    module_doc = inspect.getdoc(module)
    if module_doc:
        body = to_markdown(module_doc)
        assert_mdx_safe(body, page["module"])
        out += ["<Callout tone='observe' title='About this module' icon='compass'>", "",
                body, "", "</Callout>", ""]

    if classes:
        out += ["## Classes", ""]
        for name, obj in classes:
            out += render_symbol(name, obj, page["module"])

    if functions:
        out += ["## Functions", ""]
        for name, obj in functions:
            out += render_symbol(name, obj, page["module"])

    if constants:
        out += ["## Constants", "", "<div class='table-scroll'>", "",
                "| Name | Value |", "| --- | --- |"]
        for name, obj in constants:
            value = repr(obj)
            if len(value) > 70:
                value = value[:67] + "..."
            out.append(f"| `{name}` | `{value}` |")
        out += ["</div>", ""]

    return "\n".join(out).rstrip() + "\n"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for page in PAGES:
        target = OUT / f"{page['slug']}.mdx"
        target.write_text(render_page(page))
        text = target.read_text()
        print(f"  wrote {target}  ({len(text.splitlines())} lines)")
    print(f"\n{len(PAGES)} reference pages generated")


if __name__ == "__main__":
    main()
