#!/usr/bin/env bash
#
# Compress the two explainers so they fit inside the 200MB submission archive.
#
#   bash scripts/compress-videos.sh
#
# CRF 30 rather than a resolution drop: the videos are flat vector animation on
# white with a lot of small text, which compresses very well but goes unreadable
# if scaled below 1080p. Resolution is kept, bitrate is not.

set -euo pipefail
cd "$(dirname "$0")/../video"
mkdir -p out/compressed

for f in marl-core-explainer llms-as-cooperative-agents; do
  [ -f "out/$f.mp4" ] || { echo "skipping $f: not rendered" >&2; continue; }
  ffmpeg -v error -y -i "out/$f.mp4" \
    -c:v libx264 -crf 30 -preset slow -pix_fmt yuv420p \
    -c:a aac -b:a 96k -movflags +faststart \
    "out/compressed/$f.mp4"
  printf "  %-34s %6s -> %6s\n" "$f.mp4" \
    "$(du -h "out/$f.mp4" | cut -f1)" "$(du -h "out/compressed/$f.mp4" | cut -f1)"
done
