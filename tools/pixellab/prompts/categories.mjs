// L3 + L4 — Category playbooks: how each family fills the tile, moves through the year,
// idles, and transitions. This is the shared behaviour that the composer layers under
// every subject so only the one-line subject base is written per tile.
//
// Living vegetation MORPHS across the year; animals, minerals and objects are CONSTANT
// and the season lives entirely in the pad + light (for those, the big consistency lever
// is "change ONLY the ground/light, keep the subject pixel-identical including colours").
//
// Source of truth: docs/seasonal-tile-system/index.html -> #roadmap-categories (the
// category table) and #tree-lifecycle / #anim-meta (the refined tree + animation metas).
//
// `{tokens}` in the text are filled by the composer from the subject's `overrides`
// (with the wording here as the default when a subject sets no override). Common tokens:
//   {foliage}     the leafy mass noun ("canopy", "fronds")     default "canopy"
//   {autumnColor} the autumn turn colour                        default "gold and amber"
//   {springAccent} spring bloom note                            default "pale blossom flecks"
//   {coat}        animal coat note for winter                   default "a slightly fluffier coat"

export const CATEGORIES = {
  // ───────────────────────── TREES ─────────────────────────
  "tree-deciduous": {
    label: "Tree — deciduous",
    members: ["oak", "birch", "willow"],
    fills: "a trunk rising into a {foliage} mass that fills the centered envelope",
    constant: false,
    anchor: "{trunkNote} trunk", // subject sets {trunkNote}, e.g. "slim white black-flecked"
    morphScope: "the {foliage}, the ground pad and the light",
    season: {
      spring:
        "the {foliage} is fresh bright spring-green and full, with {springAccent} scattered through it",
      summer: "the {foliage} is lush, dense and deep green (peak)",
      autumn:
        "the {foliage} has turned {autumnColor} and thinned slightly, with a few leaves caught mid-fall around the tree and a small mound of fallen {autumnColor} leaves just beginning at the base",
      winter:
        "the branches are bare and snow fully covers the ground, the fallen-leaf mound still visible as a snow-covered bump, with snow dusting the bare twigs",
    },
    // Deciduous winter is reached through a bare-mound HINGE so leaves and snow never
    // co-occur, and the bare crown is locked to the summer envelope (learned on willow).
    hinge: {
      name: "baremound",
      from: "autumn",
      season:
        "all the {autumnColor} leaves have now fallen, revealing the bare {branchNote} twigs, with a FULL mound of fallen {autumnColor} leaves piled around the base and NO snow",
      envelopeLock:
        "bare-state lock: keep the bare crown the EXACT same silhouette, height and width as the leafy summer canopy — branch tips end where the leaves did; do not lengthen, heighten, widen or spread the branches, only remove the foliage",
    },
    graph: { spring: "summer", autumn: "summer", baremound: "autumn", winter: "baremound" },
    idle: {
      spring:
        "the {foliage} flutters and shimmers gently in a soft breeze and settles back to rest, a single pale petal drifting down; the trunk stays anchored",
      summer:
        "the {foliage} sways and trembles gently in a soft breeze and settles back to rest; the trunk stays anchored",
      autumn:
        "the thinning {autumnColor} {foliage} sways gently and settles back to rest as a couple of loose leaves detach and drift down to the mound",
      winter:
        "the bare twigs sway just slightly in a cold breeze and settle back to rest as a little loose snow drifts down; the trunk stays anchored",
    },
    trans: {
      "spring-summer":
        "the {foliage} fills in and the spring green deepens to lush full summer green; the trunk stays anchored",
      "summer-autumn":
        "the {foliage} turns from green to {autumnColor} from the top down, a few leaves loosen and begin to fall around the tree, and a small mound starts to gather at the base",
      // autumn->winter is TWO segments via the bare-mound hinge:
      "autumn-baremound":
        "the remaining {autumnColor} leaves detach and fall and gather into a mound at the base until the slender branches are bare, no snow",
      "baremound-winter":
        "snow begins to fall and settles, fully covering the ground in white and blanketing the leaf mound, with snow dusting the bare twigs",
    },
    twoSegmentAutumnWinter: true,
  },

  "tree-evergreen": {
    label: "Tree — evergreen",
    members: ["fir", "cypress", "palm"],
    fills: "a conical / columnar needled mass on a straight trunk, filling the envelope",
    constant: false,
    anchor: "trunk and overall needled shape",
    morphScope: "the ground pad, the light, and the snow load on the boughs",
    season: {
      spring: "the needled boughs are a fresh bright green",
      summer: "the needled boughs are a deep saturated green (peak)",
      autumn: "the needled boughs hold their green; the season is only in the pad and light",
      winter:
        "the foliage is KEPT — snow simply settles as caps on the boughs (snow-laden boughs, NO leaf-fall and NO mound)",
    },
    hinge: null,
    graph: { spring: "summer", autumn: "summer", winter: "autumn" },
    idle: {
      spring: "the boughs dip slowly and settle back to rest in a soft breeze",
      summer: "the boughs dip slowly and settle back to rest in a soft breeze",
      autumn: "the boughs dip slowly and settle back to rest, a single needle drifting down",
      winter: "the snow-laden boughs dip and settle, shedding a little loose snow",
    },
    trans: {
      "spring-summer": "the green deepens; the shape stays anchored",
      "summer-autumn": "a few needles loosen; the boughs stay green",
      "autumn-winter": "snow begins to fall and settles as caps along the boughs and covers the pad",
    },
    twoSegmentAutumnWinter: false,
  },

  // ───────────────────────── GROUNDCOVER / GRAIN ─────────────────────────
  "grass": {
    label: "Grass / groundcover",
    members: ["grass", "meadow", "spiky", "heather"],
    fills: "an upright tussock of blades mounding up from the pad",
    constant: false,
    anchor: "tussock shape and round pad",
    morphScope: "the blades, the ground pad and the light",
    season: {
      spring:
        "the blades are fresh bright spring-green with soft new growth and a few tiny white and yellow wildflowers tucked among them",
      summer: "the blades are tall, lush full green with a few seed heads (peak)",
      autumn:
        "the blades have dried to golden tan and straw with browned drying tips and fluffy faded seed heads, a few loose dry blades",
      winter:
        "the dry blades are flattened and pale with frost on the tips, snow fallen and fully covering the pad and partly burying the base of the tussock",
    },
    hinge: null,
    graph: { spring: "summer", autumn: "summer", winter: "autumn" },
    idle: {
      spring: "a soft wind ripples across the fresh blades and they settle back to rest",
      summer: "a soft wind ripples across the lush blades and they settle back to rest",
      autumn: "a soft wind ripples across the dry blades and a loose blade or two stirs",
      winter: "the flattened frosted blades stir just slightly in a cold breeze and settle",
    },
    trans: {
      "spring-summer":
        "the blades deepen from fresh spring green to lush full summer green and grow fuller as the little wildflowers fade back into the tussock",
      "summer-autumn":
        "the grass dries from green to dry tan from the blade tips downward, the tussock goes strawy and a few blades droop loose",
      "autumn-winter":
        "first the dry blades flatten and pale, then snow begins to fall and settle, covering the pad and partly burying the base of the tussock with frost on the tips",
    },
    twoSegmentAutumnWinter: false,
  },

  "grain": {
    label: "Grain",
    members: ["wheat", "corn", "buckwheat", "manna", "rice"],
    fills: "a stand of tall headed stalks rising from a soil pad",
    constant: false,
    anchor: "stalk arrangement and pad",
    morphScope: "the stalks and heads, the soil pad and the light",
    season: {
      spring: "young green shoots, slender and upright, fresh green heads just forming",
      summer: "tall ripe golden headed stalks (peak)",
      autumn: "the stalks dry, heavy and bowed, heads drooping with ripe grain",
      winter: "cut down to short stubble with snow fully covering the soil pad",
    },
    hinge: null,
    graph: { spring: "summer", autumn: "summer", winter: "autumn" },
    idle: {
      spring: "the young stalks sway and the heads nod gently, settling back to rest",
      summer: "the ripe stalks sway and the heavy heads nod gently, settling back to rest",
      autumn: "the bowed stalks sway and a loose grain or two falls, settling back to rest",
      winter: "the short stubble stirs slightly under the snow and settles",
    },
    trans: {
      "spring-summer": "the green shoots grow tall and the heads ripen from green to gold",
      "summer-autumn": "the stalks dry and bow under the weight of the ripe heads",
      "autumn-winter": "the stalks are cut down to stubble and snow falls and covers the soil pad",
    },
    twoSegmentAutumnWinter: false,
  },

  // ───────────────────────── PRODUCE ─────────────────────────
  "produce-veg": {
    label: "Produce — vegetable",
    members: ["carrot", "eggplant", "turnip", "beet", "cucumber", "squash", "mushroom", "pepper", "broccoli"],
    fills: "the single harvested item, scaled up to fill the tile (footprint constant all year)",
    constant: false,
    anchor: "{item} at the same tile-filling size and the round pad",
    morphScope: "the item's colour and surface, the pad props, and the light",
    season: {
      // Ripeness lives in SURFACE/SHEEN, not hue — the item keeps its own colour. Keeping
      // the subject near-constant (season carried by the pad/props/light) also stops the
      // edit from rescaling or re-orienting it. A carrot that "ripens" by going pale reads
      // wrong AND drifts; surface-only ripeness holds both colour and footprint.
      spring:
        "just-harvested and fresh — the surface a touch more matte and less glossy, its own colour unchanged, with a {springAccent} resting on the pad beside it",
      summer: "at glossy peak — a healthy sheen on its own full colour",
      autumn:
        "the surface a little duller and less glossy with a couple of faint freckles, its own colour unchanged, and a couple of fallen orange and brown leaves resting on the pad",
      winter:
        "the surface frost-touched with a dusting of pale frost, its own colour unchanged underneath, and snow fully covering the pad around it",
    },
    hinge: null,
    graph: { spring: "summer", autumn: "summer", winter: "autumn" },
    // Idle = a gentle breathing BOB only. Do NOT ask for a "specular glint" — the model
    // renders it as a full white-out flash engulfing the item (caught on the carrot
    // winter). Every frame explicitly forbids the flash.
    idle: {
      spring: "a slow gentle breathing bob — the item rises a little and settles back to rest; keep its colours and brightness perfectly constant, NO bright flash, glow, sparkle or white highlight",
      summer: "a slow gentle breathing bob — the item rises a little and settles back to rest; keep its colours and brightness perfectly constant, NO bright flash, glow, sparkle or white highlight",
      autumn: "a small gentle breathing bob as a fallen leaf stirs on the pad; keep the item's colours and brightness perfectly constant, NO bright flash, glow, sparkle or white highlight",
      winter: "the item sits almost still with a tiny settle; keep its colours and brightness perfectly constant, NO bright flash, glow, sparkle or white highlight",
    },
    trans: {
      "spring-summer":
        "the item ripens and deepens to its full glossy colour, the skin tightens and gains a wet shine, and the little spring blossom falls away",
      "summer-autumn":
        "the item loses its glossy shine and dulls toward an overripe tone, the skin wrinkles slightly, and a couple of fallen leaves gather on the pad",
      "autumn-winter":
        "snow begins to fall and gently settles, building up to fully cover the pad in clean white with just a light dusting of frost on the item; the item keeps its OWN colour and stays clearly visible the whole time — NO white burst, splash, flash, bloom or full ice-coating",
    },
    twoSegmentAutumnWinter: false,
  },

  "produce-fruit": {
    label: "Produce — fruit",
    members: ["apple", "pear", "goldenapple", "blackberry", "rambutan", "starfruit", "coconut", "lemon", "jackfruit"],
    fills: "the single fruit (with its stem/leaf), scaled up to fill the tile (footprint constant)",
    constant: false,
    anchor: "{item} with its stem and leaf at the same size and the round pad",
    morphScope: "the fruit's colour and surface, the pad props, and the light",
    season: {
      spring: "under-ripe — a paler, firmer tone with a {springAccent} on the pad",
      summer: "ripe — full rich colour with a healthy sheen (peak)",
      autumn: "very ripe — deeper colour with a soft spot or two and a couple of fallen leaves on the pad",
      winter: "frosted — skin dull with a dusting of frost, snow fully covering the pad",
    },
    hinge: null,
    graph: { spring: "summer", autumn: "summer", winter: "autumn" },
    // See produce-veg: no "glint" (it flashes white). Bob + a slight stem bounce only.
    idle: {
      spring: "a gentle breathing bob with a slight stem bounce, settling back to rest; keep the fruit's colours and brightness perfectly constant, NO bright flash, glow, sparkle or white highlight",
      summer: "a gentle breathing bob with a slight stem bounce, settling back to rest; keep the fruit's colours and brightness perfectly constant, NO bright flash, glow, sparkle or white highlight",
      autumn: "a gentle breathing bob as a leaf stirs on the pad; keep the fruit's colours and brightness perfectly constant, NO bright flash, glow, sparkle or white highlight",
      winter: "the fruit sits almost still with a tiny settle; keep its colours and brightness perfectly constant, NO bright flash, glow, sparkle or white highlight",
    },
    trans: {
      "spring-summer": "the fruit ripens to its full rich colour and gains a sheen, the blossom falls away",
      "summer-autumn": "the fruit deepens and develops a soft spot, a couple of leaves gather on the pad",
      "autumn-winter": "frost forms on the fruit and snow falls and settles over the pad",
    },
    twoSegmentAutumnWinter: false,
  },

  "flower": {
    label: "Flower",
    members: ["pansy", "waterlily"],
    fills: "the bloom (with foliage) on its pad",
    constant: false,
    anchor: "plant base and pad",
    morphScope: "the bloom, the pad and the light",
    season: {
      spring: "the bloom is a fresh bud just opening, bright and new",
      summer: "the bloom is fully open at peak, richly coloured",
      autumn: "the bloom is fading, petals dulling, a seed head forming",
      winter: "the plant is dormant and dried, snow fully covering the pad",
    },
    hinge: null,
    graph: { spring: "summer", autumn: "summer", winter: "autumn" },
    idle: {
      spring: "the opening bud sways gently with a soft petal flutter and settles",
      summer: "the open bloom sways gently with a soft petal flutter and settles",
      autumn: "the fading bloom sways and a dulled petal loosens and drifts down",
      winter: "the dried stalk stirs slightly in a cold breeze and settles",
    },
    trans: {
      "spring-summer": "the bud opens fully into a richly coloured bloom",
      "summer-autumn": "the bloom fades and dulls and a seed head begins to form",
      "autumn-winter": "the bloom dries to a dormant stalk and snow falls and covers the pad",
    },
    twoSegmentAutumnWinter: false,
  },

  // ───────────────────────── ANIMALS (constant subject) ─────────────────────────
  "bird": {
    label: "Bird",
    members: ["pheasant", "chicken", "hen", "rooster", "goose", "parrot", "phoenix", "dodo", "turkey"],
    fills: "the bird standing on the pad, filling the centered envelope",
    constant: true,
    anchor: "bird (its exact pose AND its own colours)",
    morphScope: "the ground pad and the light (the bird itself never changes)",
    season: {
      spring: "a few tiny spring petals rest on the fresh-green pad",
      summer: "the pad is lush green at peak (the generated anchor)",
      autumn: "a few fallen orange and brown leaves rest on the amber pad",
      winter: "snow fully covers the pad and the bird is just slightly fluffed against the cold, an optional faint breath-puff",
    },
    hinge: null,
    graph: { spring: "summer", autumn: "summer", winter: "autumn" },
    idle: {
      spring: "the bird gives a small downward peck and a head-bob, then settles back to rest with a little tail-feather flick",
      summer: "the bird gives a small downward peck and a head-bob, then settles back to rest with a little tail-feather flick",
      autumn: "the bird pecks down once and bobs its head, then settles back to rest as a leaf stirs at its feet",
      winter: "the bird gives a small shiver and a head-bob, then settles back to rest with a faint puff of breath",
    },
    trans: {
      "spring-summer": "the pad's little spring flowers fade and the grass deepens to lush summer green; the bird stays in place with a small settle",
      "summer-autumn": "a few leaves drift down and settle on the pad; the bird stays in place with a small head-bob",
      "autumn-winter": "snow begins to fall and settles, covering the leaves and the pad in clean white and the light turns pale and cool; the bird fluffs up against the cold",
    },
    twoSegmentAutumnWinter: false,
  },

  "herd": {
    label: "Herd / cattle / mount",
    members: ["pig", "hog", "boar", "warthog", "sheep", "alpaca", "goat", "ram", "cow", "longhorn", "triceratops", "horse", "donkey", "moose", "mammoth"],
    fills: "the animal standing on the pad, filling the centered envelope",
    constant: true,
    anchor: "animal (its exact pose AND its own colours)",
    morphScope: "the ground pad, the light, and a subtle seasonal coat note",
    season: {
      spring: "a few spring petals on the fresh-green pad; the coat looks freshly sleek",
      summer: "the pad is lush green at peak; the coat is sleek (the generated anchor)",
      autumn: "a few fallen leaves on the amber pad",
      winter: "snow fully covers the pad and the coat reads {coat} against the cold",
    },
    hinge: null,
    graph: { spring: "summer", autumn: "summer", winter: "autumn" },
    idle: {
      spring: "the animal shifts its weight, swishes its tail and flicks an ear, then settles",
      summer: "the animal shifts its weight, swishes its tail and flicks an ear, then settles",
      autumn: "the animal shifts its weight and swishes its tail as a leaf stirs, then settles",
      winter: "the animal shifts its weight with a small shiver and a breath-puff, then settles",
    },
    trans: {
      "spring-summer": "the spring petals fade and the pad deepens to lush summer green; the animal stays in place with a small weight-shift",
      "summer-autumn": "a few leaves drift onto the pad; the animal stays in place with a tail-swish",
      "autumn-winter": "snow falls and covers the pad and the coat thickens; the animal stays in place with a small shiver",
    },
    twoSegmentAutumnWinter: false,
  },

  // ───────────────────────── MINERAL / AQUATIC / SPECIAL (constant) ─────────────────────────
  "mineral": {
    label: "Mine / ore",
    members: ["stone", "ironore", "copperore", "coal", "gem", "gold"],
    fills: "the rock / ore chunk resting on a rocky pad",
    constant: true,
    anchor: "rock/ore chunk (its exact shape AND colours)",
    morphScope: "the rocky pad and the light (the rock never grows or changes)",
    season: {
      spring: "the rocky pad is damp with a little moss and a few spring sprigs",
      summer: "the rocky pad is dry and warm-lit (the generated anchor)",
      autumn: "a leaf or two rests on the rocky pad in golden light",
      winter: "the rock is snow-dusted and the rocky pad is icy with a cool light",
    },
    hinge: null,
    graph: { spring: "summer", autumn: "summer", winter: "autumn" },
    idle: {
      spring: "a faint glint crosses the ore and fades (plain rock stays still)",
      summer: "a faint glint crosses the ore and fades (plain rock stays still)",
      autumn: "a faint glint crosses the ore and fades; a leaf stirs on the pad",
      winter: "a faint cold glint crosses the ore over the snow dusting",
    },
    trans: {
      "spring-summer": "the moss dries off the pad; the rock is unchanged",
      "summer-autumn": "a leaf settles on the pad; the rock is unchanged",
      "autumn-winter": "frost and a dusting of snow form over the rock and the pad turns icy; the ore is unchanged",
    },
    twoSegmentAutumnWinter: false,
  },

  "aquatic": {
    label: "Fish / aquatic",
    members: ["sardine", "mackerel", "clam", "oyster", "kelp", "giantpearl"],
    fills: "the fish / shell resting on a small round water pad",
    constant: true,
    anchor: "fish/shell (its exact shape AND colours)",
    morphScope: "the water pad and the light (the subject itself is unchanged)",
    season: {
      spring: "the water pad is fresh and clear with a little new green at the rim",
      summer: "the water pad is bright and clear (the generated anchor)",
      autumn: "a few fallen leaves float on the water pad in golden light",
      winter: "the water pad is partly frozen with an icy skin and a snow rim",
    },
    hinge: null,
    graph: { spring: "summer", autumn: "summer", winter: "autumn" },
    idle: {
      spring: "the subject bobs gently and the water shimmers, settling back to rest",
      summer: "the subject bobs gently and the water shimmers, settling back to rest",
      autumn: "the subject bobs gently and a floating leaf drifts as the water shimmers",
      winter: "the subject bobs just slightly and the icy water glints",
    },
    trans: {
      "spring-summer": "the water brightens and clears; the subject is unchanged",
      "summer-autumn": "a few leaves drift onto the water; the subject is unchanged",
      "autumn-winter": "an icy skin forms over the water pad with a snow rim; the subject is unchanged",
    },
    twoSegmentAutumnWinter: false,
  },

  "special": {
    label: "Special",
    members: ["dirt", "goldencoin"],
    fills: "the object / soil mound on its pad",
    constant: true, // coin/pearl constant; dirt is a mild exception (see overrides)
    anchor: "object (its exact shape AND colours)",
    morphScope: "the pad and the light",
    season: {
      spring: "fresh light on the pad with a hint of new green at the rim",
      summer: "warm light on the pad (the generated anchor)",
      autumn: "a leaf or two on the pad in golden light",
      winter: "snow dusting the pad in cool light",
    },
    hinge: null,
    graph: { spring: "summer", autumn: "summer", winter: "autumn" },
    idle: {
      spring: "a slow shine glints across the object and fades",
      summer: "a slow shine glints across the object and fades",
      autumn: "a slow shine glints across the object as a leaf stirs",
      winter: "a slow cold shine glints across the object over the snow dusting",
    },
    trans: {
      "spring-summer": "the object is unchanged",
      "summer-autumn": "a leaf settles on the pad; the object is unchanged",
      "autumn-winter": "snow dusts the pad and the light cools; the object is unchanged",
    },
    twoSegmentAutumnWinter: false,
  },
};

/** Default token values, so a subject only overrides what it needs. */
export const TOKEN_DEFAULTS = {
  foliage: "canopy",
  autumnColor: "gold and amber",
  springAccent: "pale blossom flecks",
  trunkNote: "sturdy brown",
  branchNote: "slender brown",
  coat: "a slightly fluffier coat",
  item: "item",
};
