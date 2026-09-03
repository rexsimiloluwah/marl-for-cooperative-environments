/**
 * INLINE MATHS IN COMPONENT PROPS
 *
 * Renders `$...$` spans inside a plain string to KaTeX HTML at build time.
 *
 * This exists because of a mistake worth recording. Component props are plain
 * strings, so they never pass through remark-math: a label written as
 * `$\mathcal{N}$` reaches the browser as five literal characters and a
 * backslash. Slots are the usual fix, and they do not work everywhere. A
 * draggable chip needs its label as data, not as rendered children, because
 * the script moves the chip between containers.
 *
 * So for those cases the maths is rendered here instead, with the same macros
 * the rest of the resource uses, and the result is inserted with `set:html`.
 * Output is KaTeX's own HTML, generated from LaTeX authored in this
 * repository rather than supplied by a reader.
 */
import katex from 'katex';
import { PROSE_MACROS } from './notation.mjs';

/**
 * Replaces every `$...$` span in `text` with rendered KaTeX.
 * Text outside the spans is HTML-escaped.
 */
export function renderInlineMath(text: string): string {
  const parts: string[] = [];
  let last = 0;
  // Non-greedy, single-line: a `$` pair on one line, which is all a label has.
  const re = /\$([^$\n]+)\$/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    parts.push(escapeHtml(text.slice(last, m.index)));
    try {
      parts.push(
        katex.renderToString(m[1], {
          throwOnError: false,
          displayMode: false,
          macros: PROSE_MACROS,
          output: 'html',
        }),
      );
    } catch {
      // A malformed expression should show as its source, not vanish.
      parts.push(escapeHtml(m[0]));
    }
    last = m.index + m[0].length;
  }
  parts.push(escapeHtml(text.slice(last)));
  return parts.join('');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** True when the string contains anything that needs rendering. */
export function hasMath(text: string): boolean {
  return /\$[^$\n]+\$/.test(text);
}
