const domDiff = { maxDiffPixelRatio: 0.02, threshold: 0.2 };

export const BALANCE_VISUAL_SCENARIOS = [
  { id: 'balance-default', hash: '#/wiki', diff: domDiff },
  { id: 'balance-zones-tab', hash: '#/zones', diff: domDiff },
  { id: 'balance-items-tab', hash: '#/items', diff: domDiff },
  { id: 'balance-recipes-tab', hash: '#/recipes', diff: domDiff },
  { id: 'balance-story-tab', hash: '#/story', diff: domDiff },
  { id: 'balance-export-tab', hash: '#/export', diff: domDiff },
];

export const BALANCE_VISUAL_SMOKE_SCENARIO_IDS = [
  'balance-default',
  'balance-items-tab',
  'balance-export-tab',
];
