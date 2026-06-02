const domDiff = { maxDiffPixelRatio: 0.02, threshold: 0.2 };

// Routes target the Phase-5 wiki shell. `data-game-visual` placeholders now
// render committed static screenshots (see wiki/GameScreenEmbed.tsx) rather than
// a live `?visual=` game iframe, so embed pages are deterministic again. This
// set still favours iframe-free pages to keep the goldens focused: a narrative
// page (Decisions), two category pages (field reference + entity grid), and an
// entity article whose concept has no game scenario (abilities → procedural icon).
export const BALANCE_VISUAL_SCENARIOS = [
  { id: 'balance-narrative-page', hash: '#/page/decisions', diff: domDiff },
  { id: 'balance-recipes-category', hash: '#/recipes', diff: domDiff },
  { id: 'balance-bosses-category', hash: '#/bosses', diff: domDiff },
  { id: 'balance-ability-article', hash: '#/abilities/abilities:threshold_reduce', diff: domDiff },
];

export const BALANCE_VISUAL_SMOKE_SCENARIO_IDS = [
  'balance-narrative-page',
  'balance-recipes-category',
  'balance-ability-article',
];
