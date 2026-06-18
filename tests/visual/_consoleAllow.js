// Shared console-error allowlist for the visual specs.
//
// A visual scenario fails if it logs an unexpected console.error. A few
// emissions are known-benign noise and must NOT fail the snapshot run:
//   - favicon / "Failed to load resource": asset 404s under the headless run.
//   - "Texture key already in use": Phaser `TextureManager.checkKey()` logs this
//     as a console.error (not a warn) when a texture key is re-added across a
//     scene re-mount. The game runs four `new Phaser.Game(...)` instances
//     (board / town / season strip / map), so scene churn in the town/board
//     scenarios re-adds keys; benign and unrelated to the rendered pixels.
// Keep this list narrow: anything not matched here still fails the guard, so a
// real new console.error is still caught.
export const IGNORED_VISUAL_CONSOLE = [/favicon|Failed to load resource/i, /Texture key already in use/i];

/** True if a console-error text is known-benign visual noise (see above). */
export function isIgnoredVisualConsole(text) {
  return IGNORED_VISUAL_CONSOLE.some((re) => re.test(text));
}
