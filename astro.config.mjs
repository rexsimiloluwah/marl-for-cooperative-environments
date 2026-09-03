// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { PROSE_MACROS } from './src/lib/equations/notation.mjs';
import { rehypeBaseLinks } from './src/lib/rehype-base-links.mjs';

/**
 * DEPLOY TARGET
 *
 * Both values come from the environment so the same source deploys to a
 * GitHub Pages project site, to a custom domain, or to a local preview,
 * without editing this file.
 *
 * The GitHub Pages workflow sets them from the repository itself, so a rename
 * or a transfer needs no change here. Locally both default to a plain root,
 * which keeps `npm run dev` free of a base path.
 *
 * A project site is served from a subdirectory, so `base` is not optional
 * there: every internal path needs the prefix. `withBase()` in src/lib/url.ts
 * handles the paths we write by hand, and `rehypeBaseLinks` handles the ones
 * written in MDX.
 */
const SITE = process.env.PUBLIC_SITE_URL || 'http://localhost:4321';
const BASE = process.env.PUBLIC_BASE_PATH || '/';

export default defineConfig({
  site: SITE,
  base: BASE,
  // Emit `/page/index.html`, which is what a static host without rewrite
  // rules needs in order to serve `/page/` and `/page` alike.
  trailingSlash: 'ignore',
  build: { format: 'directory' },

  // Astro 7 defaults to the Sätteri processor, whose plugin API is
  // visitor-based and does not accept unified plugins. We opt into the
  // unified processor so `remark-math` and `rehype-katex` work exactly as
  // documented. Starlight supports both engines and registers its own
  // transforms on whichever is configured. Build speed is irrelevant at this
  // page count; a pipeline an instructor can rebuild from the standard docs
  // is worth more.
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        // Prefix site-absolute prose links and images with the configured
        // base. Must run before nothing in particular, but keeping it first
        // means the maths pipeline never sees a half-rewritten tree.
        [rehypeBaseLinks, { base: BASE }],
        [
          rehypeKatex,
          {
            // Surface bad markup instead of silently shipping mangled maths.
            // `.katex-error` is styled loudly in src/styles/katex.css.
            throwOnError: false,
            strict: 'warn',
            trust: false,
            // Shared notation, from src/lib/equations/notation.mjs, so prose
            // and annotated equations cannot drift apart. `\mark` is
            // deliberately absent here: prose maths runs untrusted.
            macros: PROSE_MACROS,
          },
        ],
      ],
    }),
  },

  integrations: [
    starlight({
      title: 'MARL in Cooperative Environments',
      description:
        'Multi-Agent Reinforcement Learning for Cooperative Environments: learning to coordinate, communicate, and adapt. An interactive undergraduate resource.',

      components: {
        Header: './src/components/overrides/Header.astro',
        ThemeSelect: './src/components/overrides/ThemeSelect.astro',
        ThemeProvider: './src/components/overrides/ThemeProvider.astro',
        Sidebar: './src/components/overrides/Sidebar.astro',
        PageTitle: './src/components/overrides/PageTitle.astro',
        PageSidebar: './src/components/overrides/PageSidebar.astro',
        Footer: './src/components/overrides/Footer.astro',
      },

      customCss: [
        '@fontsource-variable/inter',
        '@fontsource/jetbrains-mono',
        'katex/dist/katex.min.css',
        './src/styles/tokens.css',
        './src/styles/theme.css',
        './src/styles/katex.css',
        './src/styles/components.css',
      ],

      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      pagination: true,
      credits: false,
      editLink: undefined,
      lastUpdated: false,

      // Flat groups with numbered leaves, rather than one group per module.
      // Nested single-page groups made the labels wrap in the sidebar and
      // added a level of nesting that carried no information. Modules gain
      // sub-pages later and can nest then.
      // Empty on purpose. The course structure lives in src/lib/nav.ts and is
      // rendered by the Sidebar override, so keeping a second copy here would
      // guarantee the two drift apart. Previous/next links come from the same
      // module via the Footer override.
      sidebar: [],

      expressiveCode: {
        // First entry is used for dark, second for light.
        themes: ['github-dark', 'github-light'],
        styleOverrides: {
          borderRadius: '4px',
          borderColor: 'var(--rule)',
          codeFontFamily: 'var(--font-mono)',
          codeFontSize: '0.8125rem',
          frames: { shadowColor: 'transparent' },
        },
      },
    }),
  ],
});
