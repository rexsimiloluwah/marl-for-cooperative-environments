"""
Assemble the rendered storyboard frames into one contact sheet.

Run by `npm run storyboard` so the sheet cannot fall out of date with the
frames. Reviewing an old sheet against new frames wastes everyone's time.

    python3 scripts/contact-sheet.py out/storyboard out/storyboard-sheet.png
"""

from __future__ import annotations

import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

COLS = 5
THUMB_W = 520
GAP = 14
PAD = 26
LABEL_H = 30
BG = (233, 237, 242)
INK = (16, 35, 63)


def font(size: int):
    for path in (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main() -> None:
    src = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "out/storyboard")
    dst = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "out/storyboard-sheet.png")

    frames = sorted(src.glob("*.png"))
    if not frames:
        sys.exit(f"no frames in {src}")

    first = Image.open(frames[0])
    thumb_h = round(first.height * THUMB_W / first.width)
    rows = (len(frames) + COLS - 1) // COLS
    cell_h = thumb_h + LABEL_H

    width = PAD * 2 + COLS * THUMB_W + (COLS - 1) * GAP
    height = PAD * 2 + rows * cell_h + (rows - 1) * GAP + 64

    sheet = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(sheet)
    draw.text((PAD, PAD - 4), "MARL Core Explainer  ·  storyboard", font=font(30), fill=INK)

    for index, path in enumerate(frames):
        row, col = divmod(index, COLS)
        x = PAD + col * (THUMB_W + GAP)
        y = PAD + 52 + row * (cell_h + GAP)
        sheet.paste(Image.open(path).convert("RGB").resize((THUMB_W, thumb_h)), (x, y))
        # the scene number belongs on the review sheet, never in the video
        name = path.stem.split("-", 2)[-1].replace("-", " ")
        draw.text((x + 2, y + thumb_h + 7), f"{index + 1:02d}  {name}", font=font(19), fill=INK)

    sheet.save(dst)
    print(f"contact sheet: {dst} ({sheet.width} x {sheet.height}, {len(frames)} frames)")


if __name__ == "__main__":
    main()
