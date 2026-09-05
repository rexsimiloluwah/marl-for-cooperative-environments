# How Do Multiple Agents Learn to Work Together?

A complete 19:10 Remotion explainer for the cooperative MARL course. The video follows one continuous story through Background, Coordinate, Communicate, and Adapt.

## Commands

```bash
npm install
npm run narration
npm run studio
npm run typecheck
npm run storyboard
npm run render:preview
npm run render
```

The main composition is `CoreExplainer`: 1920×1080, 30 fps, 34,500 frames. The final render is written to `out/marl-core-explainer.mp4`.

## Editing

- `src/CoreExplainer/narration.ts` contains the full voice-over script, scene lengths, section questions, and phrase-caption generation.
- `src/CoreExplainer/timings.ts` is the centralized timeline.
- `src/CoreExplainer/components/` contains the reusable visual system.
- `src/CoreExplainer/scenes/` contains one entry file per scene and the chapter-level visual compositions.
- `public/narration/` contains per-scene voice-over clips. Regenerate them locally with `npm run narration`.
- `public/memoji/` contains the seven sparse Memoji appearances used in the video.

The narration generator uses the local Samantha voice at a warm instructional pace, then normalizes and fits each clip to its scene window with FFmpeg. Captions begin with the voice-over and stay out of the diagram area. The final question scene intentionally omits captions so readers can pause on the displayed questions.
