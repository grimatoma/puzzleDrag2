// Navigation information architecture for the Wiki sidebar.
// Defines the grouping of concepts into sections, the list of narrative pages,
// and the list of developer utility pages.
//
// WIKI_SECTIONS must cover every concept id in concepts.ts exactly once.
// The test wikiNav.test.ts enforces this in both directions.

export interface WikiSection {
  id: string;
  label: string;
  conceptIds: string[];
}

export const WIKI_SECTIONS: WikiSection[] = [
  { id: "board",   label: "Board",   conceptIds: ["tiles", "zones", "settlementBiomes", "categories"] },
  { id: "economy", label: "Economy", conceptIds: ["resources", "tools", "recipes", "buildings"] },
  { id: "world",   label: "World",   conceptIds: ["npcs", "workers", "bosses", "hazards"] },
  { id: "systems", label: "Systems", conceptIds: ["abilities", "toolPowers", "tileDiscoveryMethods", "seasons"] },
  { id: "progression", label: "Progression", conceptIds: ["keepers", "boons", "dailyRewards", "achievements"] },
  { id: "screens", label: "Screens", conceptIds: ["views", "modals"] },
];

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
