export const BOND_BANDS = Object.freeze([
  { lo: 1, hi: 4,  name: "Sour",    modifier: 0.70 },
  { lo: 5, hi: 6,  name: "Warm",    modifier: 1.00 },
  { lo: 7, hi: 8,  name: "Liked",   modifier: 1.15 },
  { lo: 9, hi: 10, name: "Beloved", modifier: 1.25 },
]);

export interface NpcEntry {
  id: string;
  displayName: string;
  loves: string[];
  likes: string[];
  favoriteGift: string;
}

// Phase 2 — multi-tier gift preferences. Each NPC has `loves` (big bond gain)
// and `likes` (medium); everything else is "neutral" (small). `favoriteGift`
// is derived from `loves[0]` so legacy callers still work. See GIFT_DELTAS in
// features/npcs/bond.js for the per-tier bond gain.
const NPC_RAW: Record<string, Omit<NpcEntry, "favoriteGift">> = {
  mira:  { id: "mira",  displayName: "Mira",        loves: ["flour", "bread"],     likes: ["honey", "jam"] },
  tomas: { id: "tomas", displayName: "Old Tomas",   loves: ["jam", "honey"],       likes: ["tile_fruit_blackberry", "bread"] },
  bram:  { id: "bram",  displayName: "Bram",        loves: ["iron_bar", "tile_mine_coal"],  likes: ["tile_mine_stone", "tile_mine_iron_ore"] },
  liss:  { id: "liss",  displayName: "Sister Liss", loves: ["jam", "tile_fruit_blackberry"], likes: ["honey", "soup"]      },
  wren:  { id: "wren",  displayName: "Wren",        loves: ["plank", "iron_bar"], likes: ["tile_tree_oak", "bread"]  },
};

// Not frozen — `applyNpcOverrides` (Dev Panel) mutates this in place.
export const NPC_DATA: Record<string, NpcEntry> = Object.fromEntries(
  Object.entries(NPC_RAW).map(([id, d]) => [id, { ...d, loves: [...d.loves], likes: [...d.likes], favoriteGift: d.loves[0] }]),
);

export const NPC_IDS = Object.freeze(["wren", "mira", "tomas", "bram", "liss"]);
