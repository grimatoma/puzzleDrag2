// src/config/progression/facts.ts
// The vocabulary of "things that happen", as fact-id patterns. Used by the
// config-validation test (every `when` leaf must reference a known fact) and,
// in Phase 2, by the GameState→FactSnapshot builder.

export interface FactFamily {
  /** Matches a concrete fact id, e.g. /^resource\.[a-z0-9_]+\.total$/. */
  pattern: RegExp;
  /** Human description for docs. */
  desc: string;
}

const KEY = "[a-z0-9_]+";

export const FACT_FAMILIES: FactFamily[] = [
  { pattern: new RegExp(`^resource\\.${KEY}\\.total$`), desc: "inventory total of a resource" },
  { pattern: new RegExp(`^craft\\.${KEY}\\.count$`), desc: "cumulative crafts of an item" },
  { pattern: new RegExp(`^building\\.${KEY}\\.built$`), desc: "a building has been built" },
  { pattern: new RegExp(`^zone\\.${KEY}\\.founded$`), desc: "a zone has been founded" },
  { pattern: new RegExp(`^tile\\.${KEY}\\.discovered$`), desc: "a tile type is discovered" },
  { pattern: new RegExp(`^chain\\.${KEY}\\.max$`), desc: "longest chain of a tile/resource" },
  { pattern: new RegExp(`^flag\\.${KEY}$`), desc: "a story flag is set" },
  { pattern: new RegExp(`^npc\\.${KEY}\\.bond$`), desc: "bond level with an NPC" },
  { pattern: new RegExp(`^boss\\.${KEY}\\.defeated$`), desc: "a boss has been defeated" },
  { pattern: /^order\.fulfilled$/, desc: "cumulative orders fulfilled" },
  { pattern: /^buildings\.allBuilt$/, desc: "all buildings at the location built" },
  { pattern: /^level$/, desc: "player level" },
  { pattern: /^act$/, desc: "current story act" },
  { pattern: /^season$/, desc: "current season index" },
  { pattern: /^turn$/, desc: "current turn" },
  { pattern: /^event\.[a-zA-Z]+$/, desc: "current-tick event context" },
];

export function isKnownFact(id: string): boolean {
  return FACT_FAMILIES.some((f) => f.pattern.test(id));
}
