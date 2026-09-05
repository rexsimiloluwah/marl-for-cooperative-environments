/**
 * INFORMATION ARCHITECTURE
 *
 * Single source of truth for the course structure. The sidebar, the
 * breadcrumbs, the numbered page titles, the previous/next links and the
 * progress tracker all read from here, so the navigation cannot disagree with
 * itself.
 *
 * Section numbers are DERIVED, not authored. A page's label is "1.1" because
 * it is the first entry of the first numbered chapter, so inserting or
 * reordering a page renumbers everything automatically.
 */

export type IconName =
  | 'antenna' | 'award' | 'beaker' | 'book' | 'box' | 'chart' | 'check' | 'check-square'
  | 'chevron-down' | 'chevron-right' | 'clipboard' | 'clock' | 'code' | 'compass'
  | 'copy' | 'cycle' | 'download' | 'external' | 'file-text' | 'flag' | 'graduation'
  | 'help-circle' | 'home' | 'lightbulb' | 'map' | 'menu' | 'message' | 'monitor'
  | 'moon' | 'name' | 'package' | 'pencil' | 'play-circle' | 'presentation'
  | 'search' | 'sun' | 'target' | 'users-round' | 'video';

export interface NavPage {
  /** Content collection slug, without leading or trailing slash. */
  slug: string;
  /** Full title. Used as the page heading and in the Related panel. */
  title: string;
  /**
   * Shorter label for the sidebar only. Set it when the full title would wrap
   * to three lines in the nav; the surrounding section usually already
   * supplies the context the abbreviation drops.
   */
  navTitle?: string;
  /** Sidebar icon. Only used for unnumbered pages; numbered ones show numbers. */
  icon?: IconName;
}

export interface NavSection {
  /** Section heading, e.g. "Chapter 1 · Background". Used in metadata. */
  label: string;
  /** Short label for breadcrumbs and the progress tracker. */
  short: string;
  /**
   * Uppercase group heading rendered ABOVE this section in the sidebar.
   * Only the first section of a group carries it, so consecutive chapters
   * sit under one "CHAPTERS" heading.
   */
  group?: string;
  /** Row label for a collapsible section, e.g. "1. Background". */
  navLabel?: string;
  /** Draw a separating rule above this section. */
  topRule?: boolean;
  /**
   * A numbered section gets "N.M" labels on its pages and renders collapsed
   * by default. An unnumbered one renders as a flat icon list.
   */
  chapter?: number;
  /**
   * Number the pages within this section WITHOUT a chapter prefix, giving
   * "1", "2", "3". Background uses this: it is a bridge rather than a
   * numbered chapter, but its sections are still an ordered series.
   * Ignored when `chapter` is set.
   */
  numbered?: boolean;
  /** Collapsed in the sidebar until the reader is inside it. */
  collapsible?: boolean;
  pages: NavPage[];
}

export const NAV: NavSection[] = [
  {
    label: 'Start here',
    short: 'Start',
    group: 'Start here',
    pages: [
      { slug: 'introduction', title: 'Introduction', icon: 'home' },
      { slug: 'prerequisites', title: 'Prerequisites', icon: 'check-square' },
      { slug: 'learning-objectives', title: 'Learning Objectives', icon: 'target' },
      { slug: 'how-to-use', title: 'How to Use This Tutorial', icon: 'compass' },
      { slug: 'tutorial-structure', title: 'Tutorial Structure', icon: 'map' },
    ],
  },
  {
    label: 'Background',
    short: 'Background',
    group: 'Chapters',
    navLabel: 'Background',
    numbered: true,
    collapsible: true,
    pages: [
      { slug: 'background/reinforcement-learning', title: 'Reinforcement Learning' },
      { slug: 'background/one-agent-to-many', title: 'From One Agent to Many' },
      { slug: 'background/multi-agent-environment', title: 'The Multi-Agent Environment' },
      { slug: 'background/states-observations-actions', title: 'States, Observations, and Actions' },
      { slug: 'background/joint-actions-policies', title: 'Joint Actions and Policies' },
      { slug: 'background/cooperative-rewards', title: 'Cooperative Rewards' },
      { slug: 'background/partial-observability', title: 'Partial Observability' },
      { slug: 'background/dec-pomdp', title: 'The Dec-POMDP Framework' },
      { slug: 'background/coordinate-communicate-adapt', title: 'Coordinate, Communicate, Adapt' },
    ],
  },
  {
    label: 'Chapter 1 · Coordinate',
    short: 'Coordinate',
    navLabel: '1. Coordinate',
    chapter: 1,
    collapsible: true,
    pages: [
      { slug: 'coordinate/introduction', title: 'Introduction' },
      { slug: 'coordinate/coordination', title: 'Coordination' },
      { slug: 'coordinate/independent-learning', title: 'Independent Learning' },
      {
        slug: 'coordinate/centralized-vs-decentralized',
        title: 'Centralized and Decentralized Learning',
        navTitle: 'Centralized and Decentralized',
      },
      {
        slug: 'coordinate/ctde',
        title: 'Centralized Training with Decentralized Execution',
        navTitle: 'Centralized Training, Decentralized Execution',
      },
      { slug: 'coordinate/centralized-critics', title: 'Centralized Critics' },
      { slug: 'coordinate/credit-assignment', title: 'Credit Assignment' },
      { slug: 'coordinate/value-decomposition', title: 'Value Decomposition' },
      { slug: 'coordinate/vdn-qmix', title: 'VDN and QMIX' },
      { slug: 'coordinate/scaling-coordination', title: 'Scaling Coordination' },
      { slug: 'coordinate/research-smacv2', title: 'Research Connection: SMACv2' },
      {
        slug: 'coordinate/lab',
        title: 'Learning Coordinated Behaviour',
        navTitle: 'Virtual Lab',
      },
      { slug: 'coordinate/worksheet', title: 'Coordinate Worksheet' },
    ],
  },
  {
    label: 'Chapter 2 · Communicate',
    short: 'Communicate',
    navLabel: '2. Communicate',
    chapter: 2,
    collapsible: true,
    pages: [
      { slug: 'communicate/introduction', title: 'Introduction' },
      {
        slug: 'communicate/communication-in-marl',
        title: 'Communication in Cooperative MARL',
        navTitle: 'Communication in Cooperative MARL',
      },
      { slug: 'communicate/messages', title: 'Messages' },
      { slug: 'communicate/message-content', title: 'Message Content' },
      { slug: 'communicate/communication-constraints', title: 'Communication Constraints' },
      { slug: 'communicate/communication-policies', title: 'Communication Policies' },
      {
        slug: 'communicate/learning-protocols',
        title: 'Learning Communication Protocols',
        navTitle: 'Learning Protocols',
      },
      { slug: 'communicate/interpretable-communication', title: 'Interpretable Communication' },
      { slug: 'communicate/research-langground', title: 'Research Connection: LangGround' },
      { slug: 'communicate/communication-failures', title: 'Communication Failures' },
      { slug: 'communicate/lab', title: 'Communication Lab' },
      { slug: 'communicate/worksheet', title: 'Communicate Worksheet' },
    ],
  },
  {
    label: 'Chapter 3 · Adapt',
    short: 'Adapt',
    navLabel: '3. Adapt',
    chapter: 3,
    collapsible: true,
    pages: [
      { slug: 'adapt/introduction', title: 'Introduction' },
      { slug: 'adapt/partner-dependence', title: 'Partner Dependence' },
      { slug: 'adapt/partner-generalization', title: 'Partner Generalization' },
      { slug: 'adapt/partner-diversity', title: 'Training Partner Diversity' },
      { slug: 'adapt/agent-modelling', title: 'Agent Modelling' },
      { slug: 'adapt/partner-representations', title: 'Partner Representations' },
      { slug: 'adapt/ad-hoc-teamwork', title: 'Ad Hoc Teamwork' },
      { slug: 'adapt/zero-shot-coordination', title: 'Zero-Shot Coordination' },
      {
        slug: 'adapt/evaluating-generalization',
        title: 'Evaluating Partner Generalization',
        navTitle: 'Evaluating Generalization',
      },
      {
        slug: 'adapt/research-naht',
        title: 'Research Connection: N-Agent Ad Hoc Teamwork',
        navTitle: 'Research Connection: NAHT',
      },
      { slug: 'adapt/research-zsc-eval', title: 'Research Connection: ZSC-Eval' },
      { slug: 'adapt/lab', title: 'Adapt Lab' },
      { slug: 'adapt/worksheet', title: 'Adapt Worksheet' },
    ],
  },
  {
    label: 'Frontier: Cooperative MARL and LLMs',
    short: 'Frontier',
    navLabel: 'Frontier: Cooperative MARL and LLMs',
    topRule: true,
    collapsible: true,
    pages: [
      { slug: 'frontier/llm-agents', title: 'LLMs as Cooperative Agents', icon: 'message' },
      {
        slug: 'frontier/learning-llm-collaboration',
        title: 'Learning LLM Collaboration with MARL',
        navTitle: 'Learning LLM Collaboration',
        icon: 'graduation',
      },
    ],
  },
  {
    label: 'Challenge Lab: Cooperative Wireless Resource Allocation',
    short: 'Lab',
    navLabel: 'Challenge Lab: Cooperative Wireless Resource Allocation',
    topRule: true,
    collapsible: true,
    pages: [
      { slug: 'lab/overview', title: 'Challenge Lab Overview', icon: 'flag' },
      {
        slug: 'lab/marl-for-resource-allocation',
        title: 'Why Wireless Resource Allocation',
        navTitle: 'Why This Problem',
        icon: 'antenna',
      },
      { slug: 'lab/environment', title: 'Wireless Network Resource Allocation Environment', icon: 'box' },
      { slug: 'lab/challenge', title: 'Wireless Allocation Experiments', icon: 'beaker' },
    ],
  },
  {
    label: 'Final Project: Cooperative Multi-Agent Disaster Response',
    short: 'Project',
    navLabel: 'Final Project: Cooperative Multi-Agent Disaster Response',
    collapsible: true,
    pages: [
      { slug: 'project/brief', title: 'Final Project Overview', icon: 'file-text' },
      { slug: 'project/system', title: 'Part 1: Define the System', icon: 'box' },
      {
        slug: 'project/design',
        title: 'Parts 2 to 4: Coordinate, Communicate, Adapt',
        navTitle: 'Parts 2-4: Design',
        icon: 'cycle',
      },
      { slug: 'project/evaluation', title: 'Part 5: Evaluation', icon: 'chart' },
      { slug: 'project/deliverables', title: 'Deliverables', icon: 'package' },
      { slug: 'project/rubric', title: 'Rubric', icon: 'award' },
    ],
  },
  {
    label: 'Python Package',
    short: 'Package',
    navLabel: 'Python Package: cooperative-marl-labs',
    topRule: true,
    collapsible: true,
    pages: [
      { slug: 'package/overview', title: 'Package Overview', icon: 'package' },
      { slug: 'package/environments', title: 'Environments', icon: 'box' },
      { slug: 'package/agents', title: 'Agents', icon: 'users-round' },
      { slug: 'package/policies', title: 'Partner Policies', icon: 'cycle' },
      { slug: 'package/training', title: 'Training', icon: 'chart' },
      { slug: 'package/evaluation', title: 'Evaluation', icon: 'target' },
      { slug: 'package/visualization', title: 'Visualization', icon: 'monitor' },
    ],
  },
  {
    label: 'Resources',
    short: 'Resources',
    group: 'Resources',
    pages: [
      { slug: 'resources/videos', title: 'Explainer Videos', icon: 'video' },
      { slug: 'resources/knowledge-checks', title: 'Knowledge Checks', icon: 'help-circle' },
      { slug: 'resources/flashcards', title: 'Flashcards', icon: 'copy' },
      { slug: 'resources/worksheets', title: 'All Worksheets', icon: 'clipboard' },
      { slug: 'resources/notebooks', title: 'Notebooks', icon: 'code' },
      { slug: 'resources/references', title: 'References', icon: 'book' },
    ],
  },
];

/* -------------------------------------------------------------------------
   DERIVED LOOKUPS
   Computed once at module load. Every consumer reads these rather than
   walking NAV itself, so numbering logic exists in exactly one place.
   ------------------------------------------------------------------------- */

export interface ResolvedPage extends NavPage {
  section: NavSection;
  /** "1.1" for numbered chapters, undefined otherwise. */
  number?: string;
  /** Position in the flattened reading order. */
  index: number;
}

const flat: ResolvedPage[] = [];
for (const section of NAV) {
  section.pages.forEach((page, i) => {
    flat.push({
      ...page,
      section,
      number: section.chapter
        ? `${section.chapter}.${i + 1}`
        : section.numbered
          ? `${i + 1}`
          : undefined,
      index: flat.length,
    });
  });
}

export const PAGES: readonly ResolvedPage[] = flat;

const bySlug = new Map(flat.map((p) => [p.slug, p]));

/**
 * Normalises a URL pathname to a bare slug.
 *
 * The configured base has to come off first. Under a project-site base,
 * `Astro.url.pathname` is `/repo/coordinate/introduction/`, and leaving the
 * prefix on produces a slug that matches nothing: the sidebar loses its
 * current-page state, the breadcrumbs empty out, the previous/next pager
 * disappears and section numbers stop resolving. All of that fails silently,
 * which is why it is handled here rather than at each call site.
 */
export function slugFromPath(pathname: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  let path = pathname;
  if (base && (path === base || path.startsWith(`${base}/`))) {
    path = path.slice(base.length);
  }
  return path.replace(/^\/+|\/+$/g, '');
}

export function findPage(slugOrPath: string): ResolvedPage | undefined {
  return bySlug.get(slugFromPath(slugOrPath));
}

/** Previous and next in reading order, spanning section boundaries. */
export function neighbours(slug: string): {
  prev?: ResolvedPage;
  next?: ResolvedPage;
} {
  const page = findPage(slug);
  if (!page) return {};
  return { prev: flat[page.index - 1], next: flat[page.index + 1] };
}

/** Sidebar label for a page: "1.1" where numbered, else nothing. */
export function displayNumber(page: ResolvedPage): string | undefined {
  return page.number;
}

export const TOTAL_PAGES = flat.length;

/** Sections in sidebar order, for the progress tracker. */
export const SECTION_PROGRESS = NAV.map((s) => ({
  short: s.short,
  slugs: s.pages.map((p) => p.slug),
}));
