// Chicken — BIRD (constant-subject animal). THIN config; prompts composed from the
// `bird` playbook in tools/pixellab/prompts/. The big consistency lever for animals is
// baked into the composer: keep the bird pixel-for-pixel identical (incl. its colours)
// and season the GROUND only — which is what fixed the white chicken going orange and
// what keeps its size/angle from drifting between seasons.
//
// Now generated at 128px + decimated to 64 (the native-64 run drifted; see birch).
export default {
  subject: "chicken",
  category: "bird",
  size: 128,
  decimateTo: 64,

  identity:
    "a small plump white-and-cream chicken with a tiny red comb and a small orange beak, standing",

  overrides: {
    idleChar: "a small downward peck and a head-bob, very subtle — a glance of life, not a jitter",
  },

  paletteLock: "keep the chicken white and cream — never tint the bird orange, golden, grey or blue",
};
