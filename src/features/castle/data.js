/**
 * Castle Needs — resource contribution targets.
 * Players donate resources from inventory toward each Castle Need; the Castle
 * is a one-way sink (no reset) per REFERENCE_CATALOG.md §11.
 *
 * Soup is the only need wired in this slice. The other entries are placeholders
 * for future contribution chains.
 */
export const CASTLE_NEEDS = {
  soup:  { target: 53, label: "Soup",  resource: "soup"  },
  meat:  { target: 47, label: "Meat",  resource: "meat"  },
  // Need-key kept as `coal` for save-shape stability (state.castle.contributed.coal);
  // `resource` points to the now-prefixed mine inventory key.
  coal:  { target: 43, label: "Coal",  resource: "mine_coal" },
  // Need-keys `cocoa` and `ink` are kept for save-shape stability
  // (state.castle.contributed.cocoa / .ink); the underlying `resource` was
  // re-pointed to existing farm products because the original `cocoa` and
  // `ink` resource keys never existed in BIOMES.farm.resources, leaving
  // the castle progression unfillable. Berry jam and bird eggs are the
  // closest mid-/low-tier farm analogs already in the game.
  cocoa: { target: 33, label: "Berry Jam", resource: "berry_jam" },
  ink:   { target: 12, label: "Bird Egg",  resource: "bird_egg"  },
};
