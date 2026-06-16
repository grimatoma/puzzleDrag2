// Chicken — ANIMAL playbook, generated at 64px (a resolution test vs the 128px set).
//
// Animals are CONSTANT: the creature does not morph across seasons. The season
// lives in the ground pad + the light + small accents, and the transitions are a
// ground/light cross-fade with a tiny settle (no body morph). Idle is PERIODIC in
// feel -- a small peck/head-bob then back to rest -- kept subtle so it reads as a
// glance of life, not a jitter. No bare-mound, no two-segment transition.
export default {
  subject: 'chicken',
  size: 64,
  assets: 'docs/seasonal-tile-system/assets',

  summer: {
    generate: {
      style: [
        'docs/seasonal-tile-system/assets/willow-summer.png',
        'docs/seasonal-tile-system/assets/eggplant-summer.png',
      ],
      desc: 'a small plump white-and-cream chicken with a tiny red comb and a small orange beak, standing on a small round grassy pad, summer, cute farm board-game tile',
    },
  },

  // All three branch off summer. CRITICAL for animals: lock the bird's OWN palette
  // explicitly, or the seasonal light recolors the whole creature (autumn turned the
  // white chicken orange). Apply the season light to the GROUND/scene, not the bird.
  seasons: {
    spring: { from: 'summer', desc: "same chicken, exact same pose, size, position AND colours -- keep the chicken's own white-and-cream colours completely unchanged, do not recolour or tint the bird; change ONLY the ground: the round pad is fresh bright spring green with a few tiny white and yellow flowers and a couple of petals, gentle spring light on the ground" },
    autumn: { from: 'summer', desc: "same chicken, exact same pose, size, position AND colours -- keep the chicken white and cream, do NOT tint the bird orange or golden at all; change ONLY the ground: a few fallen orange and brown leaves scattered on the round grassy pad, warm low golden light on the ground only" },
    winter: { from: 'summer', desc: "same chicken, exact same pose, size, position AND colours -- keep the chicken white and cream, do NOT turn the bird grey or blue; change ONLY the ground: snow fully covers the round pad in clean white, the chicken just slightly fluffed against the cold, pale cool winter light on the ground" },
  },

  transitions: [
    { from: 'spring', to: 'summer', action: "the pad's little spring flowers fade and the grass deepens to lush summer green and the light warms; the chicken stays in place with a small settle" },
    { from: 'summer', to: 'autumn', action: 'a few leaves drift down and settle on the pad and the light warms to gold; the chicken stays in place with a small head-bob' },
    { from: 'autumn', to: 'winter', action: 'snow begins to fall and settles, covering the leaves and the pad in clean white, the light turns pale and cool; the chicken fluffs up against the cold' },
  ],

  idles: {
    spring: { action: 'the chicken gives a small downward peck and bobs its head, then settles back to rest with a little tail-feather flick' },
    summer: { action: 'the chicken gives a small downward peck and bobs its head, then settles back to rest with a little tail-feather flick' },
    autumn: { action: 'the chicken pecks down once and bobs its head, then settles back to rest, a leaf stirring at its feet' },
    winter: { action: 'the chicken gives a small shiver and a head-bob, then settles back to rest with a faint puff of breath' },
  },
};
