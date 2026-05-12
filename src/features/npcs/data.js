export const BOND_BANDS = Object.freeze([
  { lo: 1, hi: 4,  name: "Sour",    modifier: 0.70 },
  { lo: 5, hi: 6,  name: "Warm",    modifier: 1.00 },
  { lo: 7, hi: 8,  name: "Liked",   modifier: 1.15 },
  { lo: 9, hi: 10, name: "Beloved", modifier: 1.25 },
]);

// Phase 2 — multi-tier gift preferences. Each NPC has `loves` (big bond gain)
// and `likes` (medium); everything else is "neutral" (small). `favoriteGift`
// is derived from `loves[0]` so legacy callers still work. See GIFT_DELTAS in
// features/npcs/bond.js for the per-tier bond gain.
const NPC_RAW = {
  mira:  { id: "mira",  displayName: "Mira",        loves: ["grain_flour", "bread"],     likes: ["honey", "berry_jam"] },
  tomas: { id: "tomas", displayName: "Old Tomas",   loves: ["berry_jam", "honey"],       likes: ["berry", "bread"]     },
  bram:  { id: "bram",  displayName: "Bram",        loves: ["mine_ingot", "mine_coal"],  likes: ["mine_stone", "mine_ore"] },
  liss:  { id: "liss",  displayName: "Sister Liss", loves: ["berry_jam", "berry"],       likes: ["honey", "soup"]      },
  wren:  { id: "wren",  displayName: "Wren",        loves: ["wood_plank", "mine_ingot"], likes: ["wood_log", "bread"]  },
};

export const NPC_DATA = Object.freeze(
  Object.fromEntries(
    Object.entries(NPC_RAW).map(([id, d]) => [id, Object.freeze({ ...d, favoriteGift: d.loves[0] })]),
  ),
);

export const NPC_IDS = Object.freeze(["wren", "mira", "tomas", "bram", "liss"]);
