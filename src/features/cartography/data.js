// Map node positions are in a 0..100 SVG viewBox.
// `kind` drives the side-effect on travel and the visual style.
// `region` groups nodes for the tinted background zones.
// `description` is a short flavor blurb shown in the side panel.
// `activities` are bullet points describing what the player can do there.
//
// Each node IS a zone: it embeds the zone config (hasFarm/hasMine/hasWater,
// startingTurns, upgradeMap, seasonDrops, dangers, entryCost, buildings)
// that was previously spread across the separate ZONES table in zones/data.js.

const GOLD = "gold";

const empty4Seasons = () => ({
  Spring: {}, Summer: {}, Autumn: {}, Winter: {},
});

// Hearthwood Vale / Greenmeadow season drop rates (Spring-heavy grass, Winter-heavy trees).
const FARM_SEASON_DROPS_TEMPERATE = {
  Spring: { grass: 0.20, grain: 0.15, trees: 0.20, birds: 0.05, vegetables: 0.10, fruits: 0.30 },
  Summer: { grass: 0.10, grain: 0.30, trees: 0.10, birds: 0.15, vegetables: 0.20, fruits: 0.15 },
  Autumn: { grass: 0.10, grain: 0.15, trees: 0.40, birds: 0.15, vegetables: 0.15, fruits: 0.05 },
  Winter: { grass: 0.05, grain: 0.05, trees: 0.70, birds: 0.10, vegetables: 0.05, fruits: 0.05 },
};

// Wild Orchard — fruit and tree heavy all year.
const FARM_SEASON_DROPS_ORCHARD = {
  Spring: { grass: 0.10, grain: 0.10, trees: 0.25, birds: 0.10, vegetables: 0.05, fruits: 0.40 },
  Summer: { grass: 0.05, grain: 0.10, trees: 0.20, birds: 0.20, vegetables: 0.05, fruits: 0.40 },
  Autumn: { grass: 0.05, grain: 0.10, trees: 0.35, birds: 0.10, vegetables: 0.05, fruits: 0.35 },
  Winter: { grass: 0.05, grain: 0.05, trees: 0.60, birds: 0.15, vegetables: 0.05, fruits: 0.10 },
};

export const MAP_NODES = [
  {
    id: 'home', name: 'Hearthwood Vale', kind: 'home', icon: '🏡',
    x: 10, y: 50, level: 1, region: 'hearth',
    description: 'Your home village. Build, craft, and rest by the hearth.',
    activities: ['Manage town', 'Craft & build', 'Turn in orders'],
    // Zone config
    hasFarm: true, hasMine: false, hasWater: false,
    startingTurns: 16,
    entryCost: { coins: 50 },
    upgradeMap: {
      grass: 'birds', grain: 'vegetables', trees: 'birds',
      birds: 'herd_animals', vegetables: 'fruits', fruits: GOLD,
    },
    seasonDrops: FARM_SEASON_DROPS_TEMPERATE,
    dangers: [],
    buildings: [
      'hearth', 'mill', 'bakery', 'inn', 'granary', 'larder',
      'forge', 'caravan_post', 'kitchen', 'workshop', 'powder_store',
      'portal', 'housing', 'housing2', 'housing3', 'silo',
    ],
  },
  {
    id: 'meadow', name: 'Greenmeadow', kind: 'farm', icon: '🌾',
    x: 24, y: 28, level: 1, region: 'farm',
    description: 'Sun-drenched fields. Easy harvests for new farmers.',
    activities: ['Harvest farm tiles', 'Common resources'],
    // Zone config
    hasFarm: true, hasMine: false, hasWater: false,
    startingTurns: 16,
    entryCost: { coins: 50 },
    upgradeMap: {
      grass: 'birds', grain: 'vegetables', trees: 'birds',
      birds: 'herd_animals', vegetables: 'fruits', fruits: GOLD,
    },
    seasonDrops: FARM_SEASON_DROPS_TEMPERATE,
    dangers: [],
    buildings: [
      'hearth', 'mill', 'granary', 'silo', 'bakery', 'larder',
      'inn', 'housing', 'housing2', 'housing3',
    ],
  },
  {
    id: 'orchard', name: 'Wild Orchard', kind: 'farm', icon: '🍎',
    x: 24, y: 72, level: 2, region: 'farm',
    description: 'Tangled rows of fruit trees. Richer farm yields.',
    activities: ['Harvest farm tiles', 'Higher-tier crops'],
    // Zone config
    hasFarm: true, hasMine: false, hasWater: false,
    startingTurns: 16,
    entryCost: { coins: 50 },
    upgradeMap: {
      grass: 'grain', grain: 'vegetables', trees: 'fruits',
      birds: 'herd_animals', vegetables: 'fruits', fruits: GOLD,
      herd_animals: 'cattle', cattle: 'mounts', mounts: GOLD,
      flowers: GOLD,
    },
    seasonDrops: FARM_SEASON_DROPS_ORCHARD,
    dangers: [],
    buildings: [
      'hearth', 'mill', 'granary', 'silo', 'bakery', 'larder',
      'inn', 'caravan_post', 'housing', 'housing2', 'housing3',
    ],
  },
  {
    id: 'crossroads', name: 'The Crossroads', kind: 'event', icon: '🎲',
    x: 40, y: 50, level: 2, region: 'wilds',
    description: 'A windswept junction where strangers and rumors meet.',
    activities: ['Random encounters', 'Story bits'],
    // Zone config — no puzzle boards
    hasFarm: false, hasMine: false, hasWater: false,
    startingTurns: 0,
    entryCost: { coins: 0 },
    upgradeMap: {},
    seasonDrops: empty4Seasons(),
    dangers: [],
    buildings: ['hearth', 'inn', 'caravan_post'],
  },
  {
    id: 'quarry', name: 'Cracked Quarry', kind: 'mine', icon: '⛏️',
    x: 56, y: 26, level: 2, region: 'mine',
    description: 'A wide, shattered pit. Stone, ore, and a few coins lost in cracks.',
    activities: ['Harvest mine tiles', 'Ore & stone'],
    // Zone config
    hasFarm: false, hasMine: true, hasWater: false,
    startingTurns: 10,
    entryCost: { coins: 100 },
    upgradeMap: {},
    seasonDrops: empty4Seasons(),
    dangers: [],
    buildings: [
      'hearth', 'kitchen', 'workshop', 'forge', 'barn',
      'powder_store', 'inn', 'housing', 'housing2', 'housing3',
    ],
  },
  {
    id: 'caves', name: 'Lanternlit Caves', kind: 'mine', icon: '🪨',
    x: 56, y: 74, level: 4, region: 'mine',
    description: 'Twisting tunnels lit by old miners’ lanterns. Rare gems hide deep within.',
    activities: ['Harvest mine tiles', 'Rare gems'],
    // Zone config
    hasFarm: false, hasMine: true, hasWater: false,
    startingTurns: 16,
    entryCost: { coins: 100 },
    upgradeMap: {},
    seasonDrops: empty4Seasons(),
    dangers: [],
    buildings: [
      'hearth', 'kitchen', 'workshop', 'forge', 'barn',
      'powder_store', 'inn', 'caravan_post', 'housing', 'housing2', 'housing3',
    ],
  },
  {
    id: 'fairground', name: "Drifter's Fairground", kind: 'festival', icon: '🎪',
    x: 72, y: 50, level: 3, region: 'wilds',
    description: 'A rolling fair of music, trinkets, and seasonal contests.',
    activities: ['Festival rewards', 'Limited-time offers'],
    // Zone config — no puzzle boards
    hasFarm: false, hasMine: false, hasWater: false,
    startingTurns: 0,
    entryCost: { coins: 0 },
    upgradeMap: {},
    seasonDrops: empty4Seasons(),
    dangers: [],
    buildings: ['hearth', 'inn', 'caravan_post'],
  },
  {
    id: 'forge', name: 'Black Forge', kind: 'mine', icon: '🔥',
    x: 86, y: 28, level: 5, region: 'mine',
    description: 'A roaring smithy at the foot of the mountain. Where heroes’ tools are born.',
    activities: ['Advanced crafting', 'Boss-tier resources'],
    // Zone config
    hasFarm: false, hasMine: true, hasWater: false,
    startingTurns: 16,
    entryCost: { coins: 200 },
    upgradeMap: {},
    seasonDrops: empty4Seasons(),
    dangers: [],
    buildings: [
      'hearth', 'forge', 'workshop', 'barn', 'powder_store',
      'portal', 'caravan_post', 'housing', 'housing2', 'housing3',
    ],
  },
  {
    id: 'pit', name: 'The Pit', kind: 'boss', icon: '⚔️',
    x: 90, y: 72, level: 6, region: 'boss',
    description: 'Something stirs in the dark. Bring your best chains.',
    activities: ['Boss battles', 'Rare loot'],
    // Zone config — no puzzle boards
    hasFarm: false, hasMine: false, hasWater: false,
    startingTurns: 0,
    entryCost: { coins: 0 },
    upgradeMap: {},
    seasonDrops: empty4Seasons(),
    dangers: [],
    buildings: ['hearth', 'inn'],
  },
  {
    id: 'harbor', name: 'Saltspray Harbor', kind: 'fish', icon: '⚓',
    x: 16, y: 86, level: 3, region: 'coast',
    description: 'A weather-bleached pier with nets full of sardines and clams. Tide and luck do most of the work.',
    activities: ['Harvest fish tiles', 'Sardine, mackerel & clams'],
    // Zone config
    hasFarm: false, hasMine: false, hasWater: true,
    startingTurns: 16,
    entryCost: { coins: 50 },
    upgradeMap: {},
    seasonDrops: empty4Seasons(),
    dangers: [],
    buildings: [
      'hearth', 'harbor_dock', 'fishmonger', 'smokehouse',
      'inn', 'caravan_post', 'housing', 'housing2', 'housing3',
    ],
  },
];

export const MAP_EDGES = [
  ['home', 'meadow'],
  ['home', 'orchard'],
  ['home', 'harbor'],
  ['meadow', 'crossroads'],
  ['orchard', 'crossroads'],
  ['crossroads', 'quarry'],
  ['crossroads', 'caves'],
  ['quarry', 'fairground'],
  ['caves', 'fairground'],
  ['fairground', 'forge'],
  ['fairground', 'pit'],
  ['forge', 'pit'],
];

export const NODE_COLORS = {
  home:     '#bb3b2f',
  farm:     '#91bf24',
  mine:     '#7c8388',
  fish:     '#4a8aaa',
  festival: '#c8923a',
  boss:     '#3a1a1a',
  event:    '#5a7a9a',
};

// Background zone tints, drawn as soft circles behind the node graph.
// Each zone is positioned roughly over the cluster of nodes it represents.
export const REGIONS = [
  { id: 'hearth', label: 'Hearthlands', cx: 12, cy: 50, rx: 16, ry: 22, fill: '#d8b878' },
  { id: 'farm',   label: 'Greenfields', cx: 26, cy: 50, rx: 14, ry: 32, fill: '#b8c878' },
  { id: 'wilds',  label: 'The Wilds',   cx: 56, cy: 50, rx: 22, ry: 30, fill: '#c4b888' },
  { id: 'mine',   label: 'Stoneholds',  cx: 72, cy: 30, rx: 22, ry: 18, fill: '#a8a4a0' },
  { id: 'coast',  label: 'The Coast',   cx: 16, cy: 86, rx: 14, ry: 12, fill: '#9ab8c4' },
  { id: 'boss',   label: 'The Deep',    cx: 90, cy: 72, rx: 12, ry: 16, fill: '#8a5050' },
];

export const KIND_LABELS = {
  home:     'Home Village',
  farm:     'Farm Region',
  mine:     'Mine Region',
  fish:     'Fishing Harbor',
  festival: 'Festival',
  boss:     'Boss Arena',
  event:    'Wayside Event',
};
