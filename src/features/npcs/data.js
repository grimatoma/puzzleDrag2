export const BOND_BANDS = Object.freeze([
  { lo: 1, hi: 4,  name: "Sour",    modifier: 0.70 },
  { lo: 5, hi: 6,  name: "Warm",    modifier: 1.00 },
  { lo: 7, hi: 8,  name: "Liked",   modifier: 1.15 },
  { lo: 9, hi: 10, name: "Beloved", modifier: 1.25 },
]);

export const NPC_DATA = Object.freeze({
  mira:  { id: "mira",  displayName: "Mira",        favoriteGift: "flour" },
  tomas: { id: "tomas", displayName: "Old Tomas",   favoriteGift: "jam"   },
  bram:  { id: "bram",  displayName: "Bram",        favoriteGift: "ingot" },
  liss:  { id: "liss",  displayName: "Sister Liss", favoriteGift: "jam"   },
  wren:  { id: "wren",  displayName: "Wren",        favoriteGift: "plank" },
});

export const NPC_IDS = Object.freeze(["wren", "mira", "tomas", "bram", "liss"]);
