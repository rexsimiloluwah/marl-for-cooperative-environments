#!/usr/bin/env bash
#
# Build the teaching-materials ZIP for the NeurIPS Education Track.
#
#   bash scripts/make-submission-zip.sh
#
# The track caps the archive at 200MB. The layout is deliberately flat:
#
#   code/       all source: website, Python package, notebooks, video project
#   videos/     the two explainer videos, compressed to fit the limit
#   paper/      the two-page PDF and its LaTeX source
#   LINKS.md    a link to every teaching material
#   LICENSE           Apache 2.0, for the code
#   LICENSE-CONTENT   CC BY 4.0, for the educational content
#
# Nothing that can be regenerated is included: no node_modules, no dist, no
# rendered stills, no caches, no build output.

set -euo pipefail
cd "$(dirname "$0")/.."

STAGE="submission/.stage"
OUT="submission/marl-cooperative-environments.zip"

rm -rf "$STAGE" "$OUT"
mkdir -p "$STAGE"/{code,videos,paper}

# ---------------------------------------------------------------- 1. code
# Copied with rsync so the excludes are applied as it goes, rather than
# copying a gigabyte and deleting most of it afterwards.
rsync -a \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude '.astro/' \
  --exclude 'submission/' \
  --exclude 'video/out/' \
  --exclude 'video/build/' \
  --exclude 'video/docs/' \
  --exclude '.venv/' --exclude 'venv/' --exclude 'wireless_env/' \
  --exclude '__pycache__/' \
  --exclude '*.egg-info/' \
  --exclude '*.pyc' \
  --exclude '.DS_Store' \
  --exclude '.pytest_cache/' \
  --exclude '.ruff_cache/' \
  --exclude '.ipynb_checkpoints/' \
  --exclude 'manim/' \
  ./ "$STAGE/code/"

# ---------------------------------------------------------------- 2. videos
# The compressed copies. The originals are 119MB and 77MB, which would not fit
# alongside the source, so `scripts/compress-videos.sh` produces these first.
for v in marl-core-explainer llms-as-cooperative-agents; do
  if [ -f "video/out/compressed/$v.mp4" ]; then
    cp "video/out/compressed/$v.mp4" "$STAGE/videos/"
  elif [ -f "video/out/$v.mp4" ]; then
    echo "warning: using the UNCOMPRESSED $v.mp4; run scripts/compress-videos.sh first" >&2
    cp "video/out/$v.mp4" "$STAGE/videos/"
  else
    echo "warning: $v.mp4 not found; the archive will ship without it" >&2
  fi
done

# ---------------------------------------------------------------- 3. paper
cp submission/paper/cooperative_marl_resource.pdf "$STAGE/paper/" 2>/dev/null || \
  echo "warning: paper PDF not found; build it first" >&2
cp submission/paper/cooperative_marl_resource.tex "$STAGE/paper/" 2>/dev/null || true
cp submission/paper/neurips_2026.sty "$STAGE/paper/" 2>/dev/null || true
mkdir -p "$STAGE/paper/figures"
cp submission/paper/figures/main.png "$STAGE/paper/figures/" 2>/dev/null || true

# ---------------------------------------------------------------- 4. the rest
cp submission/LINKS.md "$STAGE/"
cp LICENSE "$STAGE/" 2>/dev/null || echo "warning: no LICENSE at the repo root" >&2
cp LICENSE-CONTENT "$STAGE/" 2>/dev/null || echo "warning: no LICENSE-CONTENT at the repo root" >&2

# ---------------------------------------------------------------- zip it
( cd "$STAGE" && zip -r -q "../../$OUT" . -x '.DS_Store' )
rm -rf "$STAGE"

SIZE_MB=$(( $(stat -f %z "$OUT" 2>/dev/null || stat -c %s "$OUT") / 1048576 ))
echo "$OUT"
echo "  ${SIZE_MB} MB of the 200 MB limit"
echo
echo "Top level:"
unzip -l "$OUT" | awk 'NR>3 && $4 != "" {split($4,p,"/"); print p[1]}' | sort -u | sed 's/^/  /'
echo
echo "Largest entries:"
unzip -l "$OUT" | sort -k1 -n -r | head -6 | awk '$1+0>0 {printf "  %7.1f MB  %s\n", $1/1048576, $4}'

if [ "$SIZE_MB" -gt 200 ]; then
  echo >&2
  echo "OVER THE 200MB LIMIT. Compress the videos harder, or host them externally" >&2
  echo "and link them from LINKS.md instead." >&2
  exit 1
fi
