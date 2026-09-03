/**
 * BASE-AWARE URLS
 *
 * GitHub Pages serves a project site from a subdirectory, so every internal
 * path needs the configured `base` in front of it. Astro handles that for its
 * own output and for Starlight's generated links, but NOT for a path we write
 * by hand, and not for a link in an MDX file.
 *
 * Every hand-written internal path goes through `withBase`. Prose links are
 * handled at build time by `rehype-base-links.mjs`, which calls the same
 * logic, so there is one rule for the whole site.
 */

/** The configured base, with no trailing slash. Empty string when base is "/". */
export const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

/**
 * Prefix an absolute site path with the base.
 *
 * Anything that is not a site-absolute path is returned untouched: an external
 * URL, a protocol-relative URL, a fragment, a mailto, or a relative path.
 * Already-prefixed paths are left alone, so calling this twice is safe.
 */
export function withBase(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  if (BASE && (path === BASE || path.startsWith(`${BASE}/`))) return path;
  return `${BASE}${path}`;
}

/** A page URL from a content collection slug: `coordinate/lab` -> `/base/coordinate/lab/`. */
export function pageUrl(slug: string): string {
  return withBase(`/${slug.replace(/^\/+|\/+$/g, '')}/`);
}
