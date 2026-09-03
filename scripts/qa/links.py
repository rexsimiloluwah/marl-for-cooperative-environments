"""Audit every internal link in the built site.

Run after `npx astro build`. A broken link is any site-absolute href that does
not resolve to a file in dist/, which is the failure mode a slug rename or a
base-path change introduces silently.

Base-aware: reads the deployed base from the environment, the same way the
Astro config does, and strips it before resolving. That is what makes this
catch the GitHub Pages case, where every hand-written path needs a prefix.

    python3 scripts/qa/links.py
    PUBLIC_BASE_PATH=/marl-for-cooperative-environments python3 scripts/qa/links.py
"""

import os
import pathlib
import re
import sys

DIST = pathlib.Path("dist")
HREF = re.compile(r'(?:href|src)="(/[^"#?]*)')
BASE = os.environ.get("PUBLIC_BASE_PATH", "/").rstrip("/")


def resolves(path: str) -> bool:
    """Does this site-absolute path correspond to something in dist?"""
    if BASE:
        if path == BASE:
            return (DIST / "index.html").is_file()
        if not path.startswith(f"{BASE}/"):
            # under a base, an unprefixed absolute path is exactly the bug
            return False
        path = path[len(BASE):]
    rel = path.lstrip("/")
    if not rel:
        return (DIST / "index.html").is_file()
    p = DIST / rel
    return p.is_file() or (p / "index.html").is_file() or (DIST / f"{rel}.html").is_file()


def main() -> int:
    if not DIST.is_dir():
        sys.exit("dist/ not found: run `npx astro build` first")

    broken: list[tuple[str, str]] = []
    pages = sorted(DIST.rglob("*.html"))
    for page in pages:
        for href in sorted(set(HREF.findall(page.read_text(errors="ignore")))):
            if not resolves(href):
                broken.append((page.relative_to(DIST).as_posix(), href))

    for src, href in broken:
        print(f"BROKEN  {href}  <- {src}")
    base_note = f" (base {BASE!r})" if BASE else ""
    print(f"{len(pages)} pages scanned{base_note}, {len(broken)} broken internal link(s)")
    return 1 if broken else 0


if __name__ == "__main__":
    raise SystemExit(main())
