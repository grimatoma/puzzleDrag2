// systems.ts — the curated "Mechanics" concept for the Wiki's Systems hub.
//
// Unlike every other wiki concept (which pulls its entries live from a
// source-of-truth game-data map), the Systems hub documents cross-cutting
// MECHANICS that have no single catalog of their own — chaining, promotion,
// the spawn pool, crafting, trade and storage. This module is the one place
// that editorial list lives, so it stays in sync between:
//   - concepts.ts        (systemEntries → the gallery + article titles)
//   - conceptEntities.ts (getEntity("systems", …) → infobox visual + lede)
//   - commandPalette.ts  (Cmd-K search index)
//
// The authored prose for each system lives in
// src/balanceManager/content/systems/<key>.html. Keep `blurb` a single
// complete sentence — it is reused verbatim as the article lede.

export interface SystemDef {
  /** Stable slug — the entity key and the `[[systems:<key>]]` wikilink target. */
  key: string;
  /** Display name (article title + gallery label). */
  name: string;
  /** Emoji glyph shown in the gallery card and the article infobox. */
  icon: string;
  /** One-sentence summary, reused as the article lede. */
  blurb: string;
}

export const SYSTEMS: SystemDef[] = [
  {
    key: "chaining",
    name: "Chaining",
    icon: "🔗",
    blurb:
      "Chaining is the core board move: drag through a run of matching tiles to merge them, pay out resources, and feed every other system.",
  },
  {
    key: "promotion",
    name: "Tile promotion",
    icon: "⬆️",
    blurb:
      "Promotion upgrades a tile to the next rung of its family whenever a chain crosses a length threshold.",
  },
  {
    key: "spawn-pool",
    name: "Spawn pool",
    icon: "🎲",
    blurb:
      "The spawn pool decides which tile the board hands you next, weighted by biome, season, and the buildings you've raised.",
  },
  {
    key: "crafting",
    name: "Crafting",
    icon: "🔨",
    blurb:
      "Crafting refines raw goods into higher-value resources at station buildings, often across multi-step production lines.",
  },
  {
    key: "trade",
    name: "Market & orders",
    icon: "🤝",
    blurb:
      "Trade turns goods into coins — selling at the market and filling townsfolk orders that deepen their bonds.",
  },
  {
    key: "inventory",
    name: "Inventory & caps",
    icon: "📦",
    blurb:
      "Inventory is your per-zone storage, with soft caps and overflow that shape what's worth producing.",
  },
];
