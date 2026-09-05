"""
Synthesise the narration with Microsoft's neural voices, via edge-tts.

    python3 scripts/generate-narration.py           # the core explainer
    python3 scripts/generate-narration.py llm       # the LLM explainer
    python3 scripts/generate-narration.py llm --voice en-US-AndrewMultilingualNeural

WHY NOT `say`
The macOS `say` command only has compact voices installed here, and Samantha is
the best of a thin set. These are the current-generation neural voices and the
difference is not subtle.

WHY THE RATE IS TUNED RATHER THAN THE AUDIO STRETCHED
Each clip has to fit a fixed slot: the scene's duration minus a three-second
lead-in. The previous pipeline synthesised at one rate and then pulled the
result to length with ffmpeg's `atempo`, which time-stretches and smears the
voice; a clip that came out short got slowed to 0.8x and sounded drawly.

Here the fit is done by asking the synthesiser to *speak* faster or slower,
which changes prosody the way a person does, and leaves no stretch artefacts.
A first pass measures the natural length, a second pass re-synthesises at the
rate that lands on the slot, and the result is padded with silence rather than
stretched. `atempo` is only used as a last resort, and only when the required
rate is beyond what sounds natural.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

FFMPEG = "/opt/homebrew/bin/ffmpeg"
FFPROBE = "/opt/homebrew/bin/ffprobe"

DEFAULT_VOICE = "en-US-AndrewMultilingualNeural"
#: Asymmetric on purpose. Speeding a neural voice up still sounds like someone
#: reading briskly; slowing it down quickly sounds sluggish and over-enunciated,
#: which is most of what made the first pass sound weak. So when a clip is
#: SHORT for its slot we barely slow the read at all and let the remainder be a
#: pause at the end of the scene, which is what a person would do anyway.
RATE_MIN = -6
RATE_MAX = 20
#: A pause longer than this at the end of a scene reads as dead air.
COMFORTABLE_TAIL = 7.0
#: How much of each scene is NOT narration. This is the silence a viewer hears
#: at every scene boundary, and at 3 seconds it read as a stall between ideas:
#: one second before the voice starts, two after it stops, on all 28 scenes.
#: At 1 second the boundary is a breath instead of a gap.
LEAD_IN = 1


def run(cmd: list[str]) -> str:
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise SystemExit(f"{cmd[0]} failed:\n{result.stderr or result.stdout}")
    return result.stdout.strip()


def duration(path: Path) -> float:
    return float(
        run([FFPROBE, "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(path)])
    )


def speak(text: str, voice: str, rate: int, out: Path) -> None:
    """Synthesise, and verify the stream actually arrived intact.

    edge-tts streams audio over a websocket from Microsoft's servers. On an
    unreliable connection a chunk can be lost mid-stream, and the result is a
    file that decodes fine and has a plausible duration but is missing
    syllables. That is audible and very hard to detect after the fact, so it is
    checked here: synthesise twice and require the two reads to agree on
    length. Two independent streams losing the same amount is unlikely; one
    lossy stream disagreeing with a clean one is not.
    """
    sign = "+" if rate >= 0 else "-"
    args = [sys.executable, "-m", "edge_tts", "--voice", voice,
            f"--rate={sign}{abs(rate)}%", "--text", text]

    for attempt in range(3):
        run(args + ["--write-media", str(out)])
        check = out.with_suffix(".check.mp3")
        run(args + ["--write-media", str(check)])
        a, b = duration(out), duration(check)
        check.unlink(missing_ok=True)
        if a and b and abs(a - b) / max(a, b) <= 0.01:
            return
        print(f"      stream lengths disagree ({a:.2f}s vs {b:.2f}s); "
              f"retrying{'' if attempt < 2 else ' (last attempt)'}")
    print("      WARNING: could not get two agreeing reads; the connection may "
          "be dropping audio. Check this clip by ear.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("which", nargs="?", default="core", choices=["core", "llm"])
    parser.add_argument("--voice", default=DEFAULT_VOICE)
    parser.add_argument("--only", help="regenerate just this scene id")
    args = parser.parse_args()

    folder = "llm-narration" if args.which == "llm" else "narration"
    out_dir = Path("public") / folder
    tmp_dir = out_dir / ".source"
    out_dir.mkdir(parents=True, exist_ok=True)
    tmp_dir.mkdir(parents=True, exist_ok=True)

    scenes = json.loads(
        run(["node", "--experimental-strip-types", "scripts/dump-scenes.ts", args.which])
    )
    if args.only:
        scenes = [s for s in scenes if s["id"] == args.only]
        if not scenes:
            raise SystemExit(f"no scene with id {args.only}")

    print(f"voice {args.voice}, {len(scenes)} scene(s) -> {out_dir}\n")
    stretched: list[str] = []
    long_tails: list[str] = []

    for index, scene in enumerate(scenes, start=1):
        target = scene["durationSeconds"] - LEAD_IN
        raw = tmp_dir / f"{scene['id']}.mp3"
        final = out_dir / f"{scene['id']}.m4a"

        # pass one: how long does this read naturally?
        speak(scene["narration"], args.voice, 0, raw)
        natural = duration(raw)

        # pass two, but only when it is actually needed.
        #
        # Re-synthesising at a changed rate is not a time-stretch: the voice
        # re-reads the line with different prosody, and it is the one step here
        # whose output cannot be checked against the plain read. So do not touch
        # a clip that already fits: if the natural read leaves a tail shorter
        # than COMFORTABLE_TAIL, ship the unmodified read. Only a clip that
        # would overrun its slot, or leave dead air, gets re-read.
        wanted = round((natural / target - 1) * 100)
        if natural <= target and (target - natural) <= COMFORTABLE_TAIL:
            rate = 0
        else:
            rate = max(RATE_MIN, min(RATE_MAX, wanted))
        if rate != 0:
            speak(scene["narration"], args.voice, rate, raw)
        fitted = duration(raw)

        # Only stretch if asking the voice to speak at a natural rate could not
        # close the gap, and then only enough to fit.
        tempo = fitted / target
        if tempo > 1.02:
            filters = f"atempo={tempo:.6f},"
            stretched.append(f"{scene['id']} ({tempo:.2f}x)")
        else:
            filters = ""
        filters += f"loudnorm=I=-18:TP=-2:LRA=7,apad,atrim=0:{target}"

        run([FFMPEG, "-y", "-loglevel", "error", "-i", str(raw),
             "-af", filters, "-c:a", "aac", "-b:a", "192k",
             # one format for every clip in both videos, so the mux is uniform
             "-ar", "48000", "-ac", "2", str(final)])

        tail = max(0.0, target - fitted)
        if tail > COMFORTABLE_TAIL:
            long_tails.append(f"{scene['id']} ({tail:.0f}s of silence)")
        note = "" if rate == 0 else f" at {rate:+d}%"
        print(f"[{index}/{len(scenes)}] {scene['title'][:42]:42s} "
              f"{natural:5.1f}s ->{note:>8s} in {target}s slot, {tail:4.1f}s tail")

    shutil.rmtree(tmp_dir, ignore_errors=True)
    print(f"\n{len(scenes)} clip(s) written to {out_dir}")
    if stretched:
        print("time-stretched because the rate limit was not enough:")
        for s in stretched:
            print(f"  {s}")
    else:
        print("no clip was time-stretched")
    if long_tails:
        print("scenes whose narration ends well before the visual does:")
        for s in long_tails:
            print(f"  {s}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
