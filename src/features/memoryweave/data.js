// Memoryweave perk tree — 8 perks across 3 branches.
// branch: 'craft' | 'land' | 'fortune' | 'any'
// prereq: single id string OR array of ids (any one satisfied)

export const PERKS = [
  {
    id: 'quickfingers',
    name: 'Quickfingers',
    desc: 'Drag chains 10% faster.',
    cost: 2,
    branch: 'craft',
    prereq: null,
  },
  {
    id: 'keenedge',
    name: 'Keen Edge',
    desc: 'Tools cost 1 less to use.',
    cost: 3,
    branch: 'craft',
    prereq: 'quickfingers',
  },
  {
    id: 'fertileworld',
    name: 'Fertile World',
    desc: 'Farm pool spawns +1 wheat.',
    cost: 2,
    branch: 'land',
    prereq: null,
  },
  {
    id: 'richveins',
    name: 'Rich Veins',
    desc: 'Mine pool spawns +1 ore.',
    cost: 4,
    branch: 'land',
    prereq: 'fertileworld',
  },
  {
    id: 'coinkin',
    name: 'Coinkin',
    desc: 'Start each run with +50 coins.',
    cost: 2,
    branch: 'fortune',
    prereq: null,
  },
  {
    id: 'silvertongue',
    name: 'Silvertongue',
    desc: 'Order rewards +5%.',
    cost: 4,
    branch: 'fortune',
    prereq: 'coinkin',
  },
  {
    id: 'ancestor_call',
    name: 'Ancestor Call',
    desc: 'Begin runs at level 2.',
    cost: 8,
    branch: 'any',
    // prereq: any of keenedge OR richveins OR silvertongue
    prereq: ['keenedge', 'richveins', 'silvertongue'],
  },
  {
    id: 'eternalforge',
    name: 'Eternal Forge',
    desc: 'All buildings cost 10% less, permanently.',
    cost: 12,
    branch: 'any',
    prereq: 'ancestor_call',
  },
];

export const PERK_MAP = Object.fromEntries(PERKS.map(p => [p.id, p]));

export const BRANCH_ORDER = ['craft', 'land', 'fortune'];
export const BRANCH_LABELS = { craft: 'Craft', land: 'Land', fortune: 'Fortune' };
export const BRANCH_ICONS  = { craft: '⚒', land: '🌾', fortune: '🪙' };
// 'any' perks rendered at bottom spanning full width
