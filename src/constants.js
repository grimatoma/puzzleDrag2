export const W = 960;
export const H = 640;
export const TILE = 74;
export const COLS = 7;
export const ROWS = 6;
export const BOARD_X = 382;
export const BOARD_Y = 96;
export const MAX_TURNS = 10;
export const UPGRADE_EVERY = 3;

export function renderResolutionForWidth(displayWidth = W) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
  const displayScale = Math.max(displayWidth / W, 1);
  return Math.min(pixelRatio * displayScale, 3);
}

export const SEASONS = [
  { name: "Spring", icon: "flower", bg: 0x7dbd48, fill: 0x8fd85a, accent: 0x5daa35 },
  { name: "Summer", icon: "sun", bg: 0x8fca45, fill: 0xf6c342, accent: 0xe3a92f },
  { name: "Autumn", icon: "leaf", bg: 0xb77b3a, fill: 0xd9792d, accent: 0xa65722 },
  { name: "Winter", icon: "snow", bg: 0x78aaca, fill: 0x91d9ff, accent: 0xd9f6ff },
];

export const BIOMES = {
  farm: {
    name: "Farm",
    dirt: 0x6d4a2f,
    dark: 0x3e2a1a,
    resources: [
      { key: "hay", label: "Hay", color: 0x7ec63d, value: 1 },
      { key: "wheat", label: "Wheat", color: 0xd8b33e, value: 2 },
      { key: "wood", label: "Wood", color: 0x9b6332, value: 2 },
      { key: "bird", label: "Fowl", color: 0xc9874c, value: 4 },
      { key: "egg", label: "Egg", color: 0xf2ead7, value: 3 },
    ],
  },
  mine: {
    name: "Mine",
    dirt: 0x242526,
    dark: 0x151515,
    resources: [
      { key: "stone", label: "Stone", color: 0x8a8f93, value: 1 },
      { key: "iron", label: "Iron", color: 0xb6bbc0, value: 3 },
      { key: "coal", label: "Coal", color: 0x333333, value: 2 },
      { key: "gem", label: "Gem", color: 0x51c4e8, value: 7 },
      { key: "gold", label: "Gold", color: 0xd8ad25, value: 5 },
    ],
  },
};
