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

/** The parent primary concept id for a given concept id, or null if it is a primary (or absent). */
export function parentConceptId(conceptId: string): string | null {
  for (const sec of WIKI_SECTIONS) {
    for (const node of sec.nodes) {
      if ((node.children ?? []).includes(conceptId)) return node.conceptId;
    }
  }
  return null;
}

export interface NarrativePageDef {
  slug: string;
  label: string;
}

export const NARRATIVE_PAGES: NarrativePageDef[] = [
  { slug: "overview",    label: "Overview" },
  { slug: "progression", label: "Progression" },
  { slug: "decisions",   label: "Design decisions" },
  { slug: "story",       label: "Story" },
];

export interface UtilityDef {
  id: string;
  label: string;
}

export const UTILITIES: UtilityDef[] = [
  { id: "icons",          label: "Icons" },
  { id: "animationsDemo", label: "Board animations" },
];
