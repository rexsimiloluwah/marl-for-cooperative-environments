/**
 * SITE CONSTANTS
 *
 * Things that depend on where this resource is published rather than on what
 * it contains. Kept in one place so that going public is a single edit
 * instead of a search across every page that links outward.
 */

/**
 * The public repository.
 *
 * Everything that builds a URL from this degrades to an honest local
 * instruction when it is empty, rather than emitting a link that 404s.
 */
export const REPO_BASE =
  'https://github.com/rexsimiloluwah/marl-for-cooperative-environments';

/** Branch the published notebooks live on. */
export const REPO_BRANCH = 'main';

/**
 * A Colab URL for a notebook in this repository, or undefined while the
 * repository is private.
 *
 * @param path repository-relative, e.g. 'notebooks/lab2.ipynb'
 */
export function colabUrl(path: string): string | undefined {
  if (!REPO_BASE) return undefined;
  const slug = REPO_BASE.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
  return `https://colab.research.google.com/github/${slug}/blob/${REPO_BRANCH}/${path}`;
}

/** A direct link to a file in the repository, or undefined while private. */
export function repoFileUrl(path: string): string | undefined {
  if (!REPO_BASE) return undefined;
  return `${REPO_BASE}/blob/${REPO_BRANCH}/${path}`;
}
