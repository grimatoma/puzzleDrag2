// Navigation information architecture for the Wiki sidebar.
// Defines the grouping of concepts into sections, the list of narrative pages,
// and the list of developer utility pages.
//
// WIKI_SECTIONS must cover every concept id in concepts.ts exactly once.
// The test wikiNav.test.ts enforces this in both directions.

export interface WikiNavNode {
  /** Primary concept id (always a real concept). */
  conceptId: string;
  /** Secondary concept ids nested under this primary (collapsible in the sidebar). */
  children?: string[];
}

export interface WikiSection {
  id: string;
  label: string;
  nodes: WikiNavNode[];
}

export const WIKI_SECTIONS: WikiSection[] = [
  {
    // The "how the game works" hub: the curated Mechanics gallery up front,
    // then the mechanic-heavy subsystem catalogs whose _index pages double as
    // explainers. Leads the sidebar so readers meet the systems before the
    // raw catalogs.
    id: "systems",
    label: "Systems",
    nodes: [
      { conceptId: "systems" },
      { conceptId: "seasons" },
      { conceptId: "workers" },
      { conceptId: "tools", children: ["toolPowers"] },
      { conceptId: "buildings" },
      { conceptId: "zones", children: ["settlementBiomes", "keepers"] },
      { conceptId: "bosses" },
    ],
  },
  {
    // The puzzle board and what lives on it. Hazards are board threats tied to
    // a zone's board (zones reference them via [[hazards:…]]), so they sit here
    // alongside tiles and board kinds rather than in World.
    id: "board",
    label: "Board",
    nodes: [
      { conceptId: "tiles", children: ["categories", "tileDiscoveryMethods"] },
      { conceptId: "boardKinds" },
      { conceptId: "hazards" },
    ],
  },
  {
    id: "economy",
    label: "Economy",
    nodes: [
      { conceptId: "resources" },
      { conceptId: "recipes" },
    ],
  },
  {
    id: "world",
    label: "World",
    nodes: [
      { conceptId: "npcs" },
      { conceptId: "abilities" },
    ],
  },
  {
    id: "progression",
    label: "Progression",
    nodes: [
      { conceptId: "boons" },
      { conceptId: "dailyRewards" },
      { conceptId: "achievements" },
    ],
  },
  {
    id: "screens",
    label: "Screens",
    nodes: [{ conceptId: "views" }, { conceptId: "modals" }],
  },
];

/** Flatten every concept id referenced anywhere in the nav (primaries + children). */
export function allNavConceptIds(): string[] {
  const out: string[] = [];
  for (const sec of WIKI_SECTIONS) {
    for (const node of sec.nodes) {
      out.push(node.conceptId);
      for (const child of node.children ?? []) out.push(child);
    }
  }
  return out;
}

export interface NarrativePageDef {
  slug: string;
  label: string;
}

// Locked-direction pages — the single, cohesive account of where the game is
// going. `progression` renders the interactive ProgressionPage (live from
// PROGRESSION_TRIGGERS + zone/tile data): an unlock timeline with a cumulative
// state report and cost filters. It consolidates the retired Direction,
// Timeline and Balance-baseline pages (their hashes redirect to it in
// WikiShell; their authored HTML is kept on disk as reference).
export const NARRATIVE_PAGES: NarrativePageDef[] = [
  { slug: "overview",    label: "Overview" },
  { slug: "progression", label: "Progression" },
  { slug: "story",       label: "Story" },
];

// Parked / Future — fenced design content that is explicitly NOT the current
// direction. Rendered in a separate, clearly-labelled sidebar group so agents
// and players never mistake parked ideas for what is being built now.
export const PARKED_PAGES: NarrativePageDef[] = [
  { slug: "zones",  label: "Zones (parked)" },
  { slug: "future", label: "Future systems" },
];

export interface UtilityDef {
  id: string;
  label: string;
}

export const UTILITIES: UtilityDef[] = [
  { id: "costMatrix",     label: "Cost matrix" },
  { id: "unreachable",    label: "Unreachable" },
  { id: "icons",          label: "Icons" },
  { id: "animationsDemo", label: "Board animations" },
];

/**
 * Set of WIKI_SECTIONS ids that are hidden in player view (developer-only).
 * Both WikiShell (sidebar) and WikiHome (category browser) import this set so
 * the player-view filter can never drift between the two surfaces.
 */
export const DEV_ONLY_SECTION_IDS: ReadonlySet<string> = new Set(["screens"]);
