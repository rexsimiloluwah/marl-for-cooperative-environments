/**
 * REHYPE: BASE-AWARE PROSE LINKS
 *
 * A link written in MDX as `[text](/coordinate/lab/)` is emitted verbatim.
 * Under a configured `base` that path resolves to the wrong place, so every
 * page on a GitHub Pages project site would link to a 404.
 *
 * Rewriting at build time rather than asking authors to remember is the only
 * version of this that stays correct: an author writes the path they mean, and
 * there is exactly one place that knows about the base.
 *
 * Skipped: external URLs, protocol-relative URLs, fragments, mailto and tel,
 * relative paths, and anything already carrying the prefix.
 */

const ATTRS = { a: 'href', img: 'src', source: 'srcset', video: 'src', audio: 'src' };

function needsBase(value, base) {
  if (typeof value !== 'string' || !value.startsWith('/')) return false;
  if (value.startsWith('//')) return false;
  return !(value === base || value.startsWith(`${base}/`));
}

export function rehypeBaseLinks({ base = '/' } = {}) {
  const prefix = base.replace(/\/+$/, '');

  return function transform(tree) {
    if (!prefix) return tree; // base is "/", nothing to do

    const visit = (node) => {
      const attr = ATTRS[node.tagName];
      if (attr && node.properties) {
        const value = node.properties[attr];
        if (needsBase(value, prefix)) {
          node.properties[attr] = `${prefix}${value}`;
        }
      }
      if (node.children) node.children.forEach(visit);
    };

    visit(tree);
    return tree;
  };
}

export default rehypeBaseLinks;
