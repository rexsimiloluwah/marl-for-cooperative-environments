"""
Mechanically check the rules in docs/FRAME-BAR.md that a machine can check.

Judgement still belongs to a person looking at the frames. This catches the
failures that are objective and easy to miss by eye across 28 frames: content
crossing into the caption safe zone, ink running off the edge, and frames
carrying more bordered containers than the bar allows.

    python3 scripts/audit-frames.py            # after `npm run storyboard`
    python3 scripts/audit-frames.py llm        # after `npm run storyboard:llm`
"""

from __future__ import annotations

import pathlib
import re
import sys

from PIL import Image

WHICH = "llm" if len(sys.argv) > 1 and sys.argv[1] == "llm" else "core"
FRAMES = pathlib.Path("out/storyboard-llm" if WHICH == "llm" else "out/storyboard")
SCENES = pathlib.Path(
    "src/LlmExplainer/scenes" if WHICH == "llm" else "src/CoreExplainer/scenes"
)

#: The bar: the top 82% is content, the bottom 18% is captions and progress.
CONTENT_FRACTION = 0.82
#: Anything darker than this counts as ink rather than background or wash.
INK = 205
#: The caption band is allowed to be dark; ignore the middle where it sits.
CAPTION_X = (0.20, 0.80)
#: A frame edge should be clear of ink.
EDGE_PX = 10
#: The LLM explainer puts its source note bottom-left, which the bar allows.
#: Excluding the last 60px keeps that legitimate ink out of the check while
#: still catching the failure it exists for: content spilling just past the
#: content box, in the 130px immediately below it.
FOOTER_PX = 60 if WHICH == "llm" else 8


def ink_columns(im: Image.Image, box: tuple[int, int, int, int]) -> int:
    """How many pixels in `box` are ink."""
    crop = im.convert("L").crop(box)
    return sum(1 for p in crop.getdata() if p < INK)


def audit_frame(path: pathlib.Path) -> list[str]:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    problems: list[str] = []

    # ink below the safe zone, outside the caption band
    cut = int(h * CONTENT_FRACTION)
    bottom = h - FOOTER_PX
    left = ink_columns(im, (0, cut, int(w * CAPTION_X[0]), bottom))
    right = ink_columns(im, (int(w * CAPTION_X[1]), cut, w, bottom))
    if left + right > 400:
        problems.append(f"content in the safe zone ({left + right} px below {int(CONTENT_FRACTION*100)}%)")

    # ink touching a frame edge means something is clipped
    for name, box in (
        ("left", (0, 0, EDGE_PX, h)),
        ("right", (w - EDGE_PX, 0, w, h)),
        ("top", (0, 0, w, EDGE_PX)),
    ):
        if ink_columns(im, box) > 60:
            problems.append(f"ink at the {name} edge, something is clipped")

    return problems


def audit_source() -> dict[str, int]:
    """Bordered containers per scene file. The bar allows at most two per frame."""
    out: dict[str, int] = {}
    for path in sorted(SCENES.glob("*Visuals.tsx")):
        text = path.read_text()
        # a strong border is a solid rule of 2px or more
        # matches `border: '2px ...'`, `border={`${n}px ...`}` and `borderWidth: 3`
        pattern = r"border(?:Width)?\s*[:=]\s*[{`'\"]*\s*(?:\$\{[^}]*\}|[2-9])"
        out[path.name] = len(re.findall(pattern, text))
    return out


def main() -> int:
    if not FRAMES.is_dir():
        sys.exit(f"no frames: run `npm run storyboard{':llm' if WHICH == 'llm' else ''}` first")

    frames = sorted(FRAMES.glob("*.png"))
    failures = 0
    print(f"{len(frames)} frames\n")
    for path in frames:
        problems = audit_frame(path)
        if problems:
            failures += 1
            print(f"  FAIL  {path.stem}")
            for p in problems:
                print(f"          {p}")
    if not failures:
        print("  every frame respects the safe zone and the frame edges")

    print("\nbordered containers per file, the bar allows at most two per frame:")
    for name, count in audit_source().items():
        print(f"  {name:32s} {count}")

    print(f"\n{failures} frame(s) with layout problems")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
