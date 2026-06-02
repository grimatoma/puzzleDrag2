const domDiff = { maxDiffPixelRatio: 0.02, threshold: 0.2 };

// Routes target the Phase-5 wiki shell. The set deliberately avoids pages whose
// infobox/hero mounts a live `?visual=` game embed (Overview/Progression/Story
// narrative pages and most entity articles) — the embedded game boots
// asynchronously and would make the screenshot nondeterministic. These four are
// iframe-free: a narrative page (Decisions), two category pages (field
// reference + entity grid), and an entity article whose concept has no game
// scenario (abilities → procedural icon, no embed).
export const BALANCE_VISUAL_SCENARIOS = [
  { id: 'balance-narrative-page', hash: '#/page/decisions', diff: domDiff },
  { id: 'balance-recipes-category', hash: '#/recipes', diff: domDiff },
  { id: 'balance-bosses-category', hash: '#/bosses', diff: domDiff },
  { id: 'balance-ability-article', hash: '#/abilities/abilities:threshold_reduce', diff: domDiff },
  { id: 'balance-board-kind-article', hash: '#/boardKinds/boardKinds:mine', diff: domDiff },
];

export const BALANCE_VISUAL_SMOKE_SCENARIO_IDS = [
  'balance-narrative-page',
  'balance-recipes-category',
  'balance-ability-article',
];
