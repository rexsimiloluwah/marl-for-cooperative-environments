// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { PROSE_MACROS } from './src/lib/equations/notation.mjs';

export default defineConfig({
  site: 'https://marl-cooperative.example.org',

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
