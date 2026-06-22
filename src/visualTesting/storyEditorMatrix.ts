const domDiff = { maxDiffPixelRatio: 0.025, threshold: 0.22 };

const click = (name: string) => ({ type: 'clickRole', role: 'button', name });
// Select the first beat on the canvas. The Tools-menu utilities (Walk paths,
// Compare playthroughs) are disabled until a beat is selected, so scenarios that
// open them must select one first. Beats are clickable canvas nodes tagged
// `data-story-node`, not buttons, hence a dedicated action type.
const selectBeat = () => ({ type: 'selectBeat' });

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
  // Walk-paths and Compare-playthroughs live in the Tools menu and are disabled
  // until a beat is selected — select one, open Tools, then click the item.
  { id: 'story-paths-panel', actions: [selectBeat(), click('Tools'), click('Walk paths')], diff: domDiff, skipProjects: DESKTOP_ONLY },
  { id: 'story-playthrough-panel', actions: [selectBeat(), click('Tools'), click('Compare playthroughs')], diff: domDiff, skipProjects: DESKTOP_ONLY },
  // The Find button's accessible name is its aria-label ("Open find and replace").
  { id: 'story-find-replace-panel', actions: [click('Find')], diff: domDiff, skipProjects: DESKTOP_ONLY },
];

export const STORY_EDITOR_VISUAL_SMOKE_SCENARIO_IDS = [
  'story-default',
  'story-validation-panel',
  // Compare playthroughs requires selecting a beat first; keep it out of the smoke set.
];
