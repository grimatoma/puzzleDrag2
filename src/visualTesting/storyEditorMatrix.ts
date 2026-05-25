const domDiff = { maxDiffPixelRatio: 0.025, threshold: 0.22 };

const click = (name) => ({ type: 'clickRole', role: 'button', name });

export const STORY_EDITOR_VISUAL_SCENARIOS = [
  { id: 'story-default', diff: domDiff },
  { id: 'story-zoom-controls', actions: [click('Zoom in')], diff: domDiff },
  { id: 'story-validation-panel', actions: [click('Validation')], diff: domDiff },
  { id: 'story-paths-panel', actions: [click('Paths')], diff: domDiff },
  { id: 'story-playthrough-panel', actions: [click('Playthrough')], diff: domDiff },
  { id: 'story-find-replace-panel', actions: [click('Find / Replace')], diff: domDiff },
];

export const STORY_EDITOR_VISUAL_SMOKE_SCENARIO_IDS = [
  'story-default',
  'story-validation-panel',
  'story-playthrough-panel',
];
