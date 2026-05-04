export const GLYPHS = [
  {
    id: 'blessed',
    name: 'Blessed',
    icon: '✨',
    color: '#c8923a',
    desc: 'Doubles harvest of one chain.',
    weight: 6,
  },
  {
    id: 'cursed',
    name: 'Cursed',
    icon: '💀',
    color: '#8b1a1a',
    desc: 'Halves harvest of one chain.',
    weight: 4,
  },
  {
    id: 'twin',
    name: 'Twin',
    icon: '♊',
    color: '#3a6fa8',
    desc: "Adds another chain's worth of base resource.",
    weight: 5,
  },
  {
    id: 'heavy',
    name: 'Heavy',
    icon: '🪨',
    color: '#7a7a7a',
    desc: 'Adds 1 stone to inventory regardless of biome.',
    weight: 5,
  },
  {
    id: 'fertile',
    name: 'Fertile',
    icon: '🌱',
    color: '#4a8a3a',
    desc: 'Adds +2 hay to inventory.',
    weight: 6,
  },
  {
    id: 'embered',
    name: 'Embered',
    icon: '🔥',
    color: '#c85a1a',
    desc: 'Adds +1 coal.',
    weight: 4,
  },
  {
    id: 'frozen',
    name: 'Frozen',
    icon: '❄',
    color: '#6ab4d8',
    desc: 'Skips upgrades this chain.',
    weight: 3,
  },
  {
    id: 'golden',
    name: 'Golden',
    icon: '✺',
    color: '#d4a017',
    desc: 'Adds +5 coins.',
    weight: 5,
  },
  {
    id: 'veiled',
    name: 'Veiled',
    icon: '🌫',
    color: '#7a4a9a',
    desc: 'Adds an unknown bonus +1 of random resource.',
    weight: 3,
  },
];

export const GLYPH_MAP = Object.fromEntries(GLYPHS.map(g => [g.id, g]));

const totalWeight = GLYPHS.reduce((s, g) => s + g.weight, 0);

export function pickWeightedGlyph(rand = Math.random) {
  let r = rand() * totalWeight;
  for (const g of GLYPHS) {
    r -= g.weight;
    if (r <= 0) return g;
  }
  return GLYPHS[GLYPHS.length - 1];
}
