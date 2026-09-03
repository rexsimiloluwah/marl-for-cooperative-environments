import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

/**
 * The `docs` collection carries the textbook chapters. We extend Starlight's
 * frontmatter so every module page can declare its own pedagogical metadata:
 * how long it takes and what it assumes.
 * The Introduction and instructor guide read these fields back out, which
 * keeps the stated learning design and the actual pages from drifting apart.
 */
export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        /** Module number, 0 through 5. Omit for reference pages. */
        module: z.number().int().min(0).max(5).optional(),
        /** What a learner must have done before this page. */
        prerequisites: z.array(z.string()).optional(),
        /** Learning objectives, phrased as "students can ...". */
        objectives: z.array(z.string()).optional(),
        /**
         * Cross-links shown in the right-hand "Related" panel. Authored, not
         * generated: an automatic "related pages" list would be guessing, and
         * a wrong pointer costs a learner more than a missing one.
         *
         *   related: ['coordinate/independent-learning']
         *   related: [{ slug: 'background/joint-actions-policies', icon: 'lightbulb' }]
         */
        related: z
          .array(
            z.union([
              z.string(),
              z.object({ slug: z.string(), icon: z.string().optional() }),
            ])
          )
          .optional(),
      }),
    }),
  }),
};
