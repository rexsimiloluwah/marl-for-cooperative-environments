"""Audit every internal link in the built site.

Run after `npx astro build`. A broken link is any href that starts with "/"
and does not resolve to a file in dist/, which is the failure mode that a
slug rename introduces silently.
"""
import pathlib, re, sys

DIST = pathlib.Path('dist')
HREF = re.compile(r'href="(/[^"#?]*)')


def resolves(path: str) -> bool:
    p = DIST / path.lstrip('/')
    return p.is_file() or (p / 'index.html').is_file() or (DIST / (path.lstrip('/') + '.html')).is_file()


def main() -> int:
    if not DIST.is_dir():
        sys.exit('dist/ not found: run `npx astro build` first')
    broken: list[tuple[str, str]] = []
    pages = sorted(DIST.rglob('*.html'))
    for page in pages:
        for href in set(HREF.findall(page.read_text(errors='ignore'))):
            if not resolves(href):
                broken.append((page.relative_to(DIST).as_posix(), href))
    for src, href in broken:
        print(f'BROKEN  {href}  <- {src}')
    print(f'{len(pages)} pages scanned, {len(broken)} broken internal link(s)')
    return 1 if broken else 0


if __name__ == '__main__':
    raise SystemExit(main())
