const domDiff = { maxDiffPixelRatio: 0.025, threshold: 0.22 };

const click = (name: string) => ({ type: 'clickRole', role: 'button', name });

// The Story Editor is a desktop authoring tool: its zoom controls, side-panel
// tabs, and Tools menu are not rendered at the iPhone-portrait viewport, so the
// scenarios that click those controls cannot run there. Skip them on mobile
// (matches the `skipProjects` pattern in matrix.ts) — the integrity check and
// the Playwright run both honour this.
const DESKTOP_ONLY = ['iphone-portrait'];

export const STORY_EDITOR_VISUAL_SCENARIOS = [
  { id: 'story-default', diff: domDiff },
  { id: 'story-zoom-controls', actions: [click('Zoom in')], diff: domDiff, skipProjects: DESKTOP_ONLY },
  { id: 'story-validation-panel', actions: [click('Validation')], diff: domDiff },
  { id: 'story-paths-panel', actions: [click('Paths')], diff: domDiff, skipProjects: DESKTOP_ONLY },
  // The playthrough UI is nested under the Tools menu (and is disabled until a beat is selected),
  // so the visual scenario clicks through the menu label rather than a hidden panel tab.
  { id: 'story-playthrough-panel', actions: [click('Tools'), click('Compare playthroughs')], diff: domDiff, skipProjects: DESKTOP_ONLY },
  { id: 'story-find-replace-panel', actions: [click('Find / Replace')], diff: domDiff, skipProjects: DESKTOP_ONLY },
];

export const STORY_EDITOR_VISUAL_SMOKE_SCENARIO_IDS = [
  'story-default',
  'story-validation-panel',
  // Compare playthroughs requires selecting a beat first; keep it out of the smoke set.
];
