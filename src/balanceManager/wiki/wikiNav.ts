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
    id: "board",
    label: "Board",
    nodes: [
      { conceptId: "tiles", children: ["categories", "tileDiscoveryMethods"] },
      { conceptId: "boardKinds" },
      { conceptId: "zones", children: ["settlementBiomes", "keepers"] },
      { conceptId: "seasons" },
    ],
  },
  {
    id: "economy",
    label: "Economy",
    nodes: [
      { conceptId: "resources" },
      { conceptId: "recipes" },
      { conceptId: "buildings" },
      { conceptId: "tools", children: ["toolPowers"] },
    ],
  },
  {
    id: "world",
    label: "World",
    nodes: [
      { conceptId: "npcs" },
      { conceptId: "workers" },
      { conceptId: "bosses" },
      { conceptId: "hazards" },
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
// going. `timeline` renders the generated ProgressionFeed (live from
// PROGRESSION_TRIGGERS), not an authored fragment.
export const NARRATIVE_PAGES: NarrativePageDef[] = [
  { slug: "overview",  label: "Overview" },
  { slug: "direction", label: "Direction" },
  { slug: "timeline",  label: "Timeline" },
  { slug: "balance",   label: "Balance baseline" },
  { slug: "story",     label: "Story" },
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
  { id: "icons",          label: "Icons" },
  { id: "animationsDemo", label: "Board animations" },
];

/**
 * Set of WIKI_SECTIONS ids that are hidden in player view (developer-only).
 * Both WikiShell (sidebar) and WikiHome (category browser) import this set so
 * the player-view filter can never drift between the two surfaces.
 */
export const DEV_ONLY_SECTION_IDS: ReadonlySet<string> = new Set(["screens"]);
