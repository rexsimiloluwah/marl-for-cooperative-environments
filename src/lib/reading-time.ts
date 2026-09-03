/**
 * READING TIME
 *
 * Computed from the page's own source at build time rather than written by
 * hand in frontmatter. Hand-maintained minute ranges go stale the moment a
 * page is edited, and nobody remembers to update them.
 *
 * 200 words per minute is the usual figure for ordinary prose. Technical
 * reading is slower, but the number is a rough orientation for the reader,
 * not a promise, and a single honest estimate beats a stale range.
 *
 * The hard part is deciding what counts. A page here is mostly components,
 * and much of what a reader actually reads lives in their props: equation
 * term legends, callout titles, knowledge-check questions and their feedback.
 * Stripping every tag along with its props undercounts such a page badly, so
 * this walks the source and keeps the string values while dropping the
 * syntax around them.
 *
 * An earlier version used a regex for self-closing tags. It was wrong in a
 * way worth recording: `<Callout variant="predict">` has no `/>` of its own,
 * so a lazy `<[A-Z][\s\S]*?\/>` matched forward to the NEXT self-closing
 * component and deleted every paragraph in between. Pages reported a third
 * of their true length. Tag boundaries need a scanner, not a pattern.
 */

/** Words a reader gets through in a minute. */
const WPM = 200;

/**
 * Props whose values are machinery rather than reading: storage keys, tone
 * names, icon names. Their string values are skipped.
 */
const NON_PROSE_PROPS = new Set([
  'id',
  'slug',
  'icon',
  'tone',
  'variant',
  'name',
  'type',
  'class',
  'agent',
  'href',
]);

/**
 * Walks the source, returning only text a reader reads: prose between tags,
 * plus the string values of prose-carrying props.
 */
function readableText(source: string): string {
  const src = source
    // import lines at the top of an MDX file
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?$/gm, ' ')
    // fenced code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    // template-literal prop values: LaTeX, starter code, test bodies
    .replace(/\{\s*(?:String\.raw\s*)?`[\s\S]*?`\s*\}/g, ' ');

  let out = '';
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    // Not a tag: ordinary prose.
    if (ch !== '<' || !/[A-Za-z/]/.test(src[i + 1] ?? '')) {
      out += ch;
      i += 1;
      continue;
    }

    // Inside a tag. Collect prose-carrying string values, drop the rest.
    // Brace depth matters: props like terms={[{ is: '...' }]} nest, and the
    // '>' that closes the tag is the one at depth zero.
    i += 1;
    let depth = 0;
    let prop = '';

    while (i < src.length) {
      const c = src[i];

      if (c === '{') {
        depth += 1;
        i += 1;
        continue;
      }
      if (c === '}') {
        depth -= 1;
        i += 1;
        continue;
      }
      if (c === '>' && depth === 0) {
        i += 1;
        break;
      }
      if (c === '"' || c === "'") {
        const quote = c;
        i += 1;
        let literal = '';
        while (i < src.length && src[i] !== quote) {
          // \u escapes and the like are one character of reading, not a word
          if (src[i] === '\\') i += 1;
          literal += src[i];
          i += 1;
        }
        i += 1;
        if (!NON_PROSE_PROPS.has(prop)) out += ` ${literal} `;
        prop = '';
        continue;
      }
      // Track the identifier before '=' so a prop can be recognised by name.
      if (/[A-Za-z]/.test(c)) {
        let ident = '';
        while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) {
          ident += src[i];
          i += 1;
        }
        prop = ident;
        continue;
      }
      i += 1;
    }
  }

  return (
    out
      // display and inline maths
      .replace(/\$\$[\s\S]*?\$\$/g, ' ')
      .replace(/\$[^$\n]*\$/g, ' ')
      // inline code
      .replace(/`[^`\n]*`/g, ' ')
      // table separator rows carry no words; the cells themselves do, so keep
      // their text and drop only the pipes
      .replace(/^\|[\s|:-]+\|$/gm, ' ')
      .replace(/\|/g, ' ')
  );
}

/** Whole minutes, never zero. */
export function readingMinutes(source: string): number {
  const words = readableText(source).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WPM));
}
