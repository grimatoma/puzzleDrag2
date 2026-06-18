// docs/zones — World meta & design system (single source of truth).
// Companion to zones.mjs (the 10 zone specs). Consumed by build.mjs to emit the atlas
// and the per-zone interactive docs. Pure data + prose — no rendering here.

export const META = {
  title: "Zone Atlas",
  subtitle:
    "Ten unique, AAA-bar settlement zones for puzzleDrag2 — each a different world, " +
    "each growing from a foothold into a flourishing place by its own logic of growth.",
  project: "puzzleDrag2",
  date: "2026-06-17",
  status: "Proposal — flat-color / vector mockups; pixel art generated once layouts lock.",
};

// The non-negotiable craft bar every zone inherits from docs/town-layout (the foundation).
// These are the rules a build is REVIEWED against. If a zone breaks one, it fails review.
export const PRINCIPLES = [
  {
    k: "Roads first, buildings front the street",
    d: "Lay the route network, then place each building beside a route at a fixed setback, facing it. " +
      "A road is never drawn TO a building's centre — that is the #1 incoherence tell. Roads run between buildings.",
  },
  {
    k: "The wilderness is the progress bar",
    d: "Every zone is a clearing pushed into something — forest, ash, ice, dune, fog, void. The receding " +
      "frontier IS the visible growth. It only ever recedes; cleared ground never re-wilds.",
  },
  {
    k: "A bounded landmark that levels up in place",
    d: "One fixed focal hub the buildings ring. It never grows over its neighbours; only its landmark sprite " +
      "transforms with the town (well → fountain → monument; campfire → forge → magma crown).",
  },
  {
    k: "Stable, additive growth",
    d: "Tier N keeps every lot, road and prop of tier N−1 and only APPENDS. A placed building never moves when " +
      "the town grows. Each upgrade is an earned, legible before/after — a milestone, not a counter tick.",
  },
  {
    k: "Kill grid-death",
    d: "Vary lot footprints, jitter placement 5–15%, curve the spine, stagger frontage. A uniform lattice reads " +
      "as placeholder. Density and ambient life (NPC routines, props, particles) rise each rung.",
  },
  {
    k: "Distinct identity per rung",
    d: "Each tier introduces a new landmark, a path-material upgrade (dirt → cobble → stone), and a visible jump " +
      "in life. The skyline changes. The player should be able to name the era at a glance.",
  },
];

// The ten DISTINCT growth topologies. Variety of *layout style* is a hard requirement — no two zones
// grow the same way. This catalog is the menu; each zone claims exactly one.
export const TOPOLOGIES = [
  {
    id: "ribbon-stilt",
    name: "Boardwalk ribbon over water",
    gist: "No solid ground — platforms on stilts, linked by raised boardwalks that branch island to island.",
    grow: "Spreads HORIZONTALLY across one flat water plane — the boardwalk forks island to island and each rung planks over more open mire. (The flat-water counterpart to Thornwild's vertical climb.)",
  },
  {
    id: "switchback-terrace",
    name: "Switchback terraces up a slope",
    gist: "Hairpin roads climb a volcano's flank; buildings cut into terraces facing the bend.",
    grow: "Growth goes UP — each rung adds a higher terrace as cooling lava solidifies into buildable obsidian shelves.",
  },
  {
    id: "sheltered-hollow",
    name: "Sheltered hollow cluster",
    gist: "The town huddles in a windbreak hollow around a steaming hot-spring — the warm heart.",
    grow: "Rings radiate outward but cling to the warmth; outer rings need windbreak walls. Snow thaws to ground.",
  },
  {
    id: "oasis-rings",
    name: "Concentric oasis rings + caravan spokes",
    gist: "Circular oasis at centre; the town grows in rings around the water with caravan roads spoking to the dunes.",
    grow: "Grows as CLOSED CONCENTRIC RINGS — each rung wraps a new walled ring around the water, with caravan spokes punching out to the dunes. Radial and enclosed (vs Goldgrass's single open axis).",
  },
  {
    id: "vertical-cliff",
    name: "Stacked sea-cliff terraces",
    gist: "The town climbs a sheer sea-cliff in shelves linked by switchback stairs and a cargo lift; harbour at the base.",
    grow: "Higher shelves are carved up the cliff while the tide-pool harbour extends below. Bare rock → railed terrace.",
  },
  {
    id: "canopy-platforms",
    name: "Treetop platforms + rope bridges",
    gist: "Platforms ring giant trunks at varying heights; vine bridges connect them across the canopy.",
    grow: "Grows VERTICALLY — each rung climbs to a higher layer (understory → mid-canopy → emergent crown); undergrowth is cleared to reveal buildable boughs. (The vertical counterpart to Mirefen's flat spread.)",
  },
  {
    id: "linked-chambers",
    name: "Linked caverns + cart tunnels",
    gist: "A chain of lit caverns, each a district, joined by mine-cart tunnels through the dark rock.",
    grow: "Each rung opens a new chamber down a tunnel; unlit rubble is cleared to reveal the next glowing cavern.",
  },
  {
    id: "sky-archipelago",
    name: "Floating-island archipelago",
    gist: "Each building rides its own floating islet; sky-bridges and zip-lines knit them; airship docks spoke out.",
    grow: "New islets drift in and get tethered each rung; the empty sky is the frontier that fills with anchored rock.",
  },
  {
    id: "reclaimed-grid",
    name: "Reclaimed ancient ruin-grid",
    gist: "Inverted: you don't push into wild — you UNCOVER and rebuild atop a buried orthogonal grid of ruins.",
    grow: "Growth cleanses blight from old streets and re-raises buildings on ancient footings. Fog & bramble recede to hallowed cobble.",
  },
  {
    id: "axial-boulevard",
    name: "Grand axial boulevard + ring road",
    gist: "A monumental central avenue with a great plaza; a ring road encircles the city; districts fill the quadrants.",
    grow: "Grows along ONE monumental axis — the great avenue lengthens and perpendicular streets subdivide grid blocks beside it; the ring road closes last. Linear and axial (vs Sunspire's concentric rings) — and the widest, grandest layout, the capstone.",
  },
];

// How we honour 'look to the game' — every zone reuses real hazard/boss mechanics where they fit,
// then extends with new ones. This matrix is the audit that we didn't just invent in a vacuum.
export const MECHANIC_SOURCING = {
  reusedHazards: [
    "fire", "wolves", "rats", "cave_in", "gas_vent", "lava", "mole", "frost/freeze",
    "ice_spike", "flooding", "ash_cloud", "locusts", "fungus", "storm/min_chain",
  ],
  reusedBosses: [
    "Frostmaw (freeze_columns)", "Ember Drake (heat_tiles)", "Quagmire (respawn_boost)",
    "Old Stoneface (rubble_blocks)", "Mossback (hide_resources)", "The Storm (min_chain)",
  ],
  newMechanicsIntroduced: [
    "ember rain", "tremor / quake-shuffle", "blizzard whiteout", "avalanche sweep",
    "sandstorm", "drought", "scorpion swarm", "quicksand (sticky tiles)", "riptide",
    "rogue wave", "gull raid", "thornvine overgrowth", "giant insects", "sinkhole",
    "bats", "resonance quake", "gale (sideways push)", "lightning strike", "island-drift",
    "blight spread", "restless wisps (possess a tile)", "bramble", "stampede / trample-band",
  ],
};

// World placement — these slot into and extend the existing world (hearth/farm/wilds/mine/coast/boss/capital).
// Suggested unlock order weaves the new zones between the existing ones into one long journey.
export const REGIONS = [
  { id: "fen", name: "The Mirefen", tint: "#3f6b5a", note: "drowned wetlands east of the Coast" },
  { id: "emberwastes", name: "The Ember Wastes", tint: "#7a3320", note: "volcanic reach beyond the Stoneholds" },
  { id: "frostpeak", name: "The Frostpeaks", tint: "#5d7e9e", note: "high alpine north of the Wilds" },
  { id: "sands", name: "The Sunlands", tint: "#b88a3a", note: "the great desert south" },
  { id: "coast", name: "The Coast", tint: "#3a7a8a", note: "existing region — Gullcliff extends it" },
  { id: "deepwood", name: "The Deepwood", tint: "#2f5a35", note: "the colossal old forest" },
  { id: "underdeep", name: "The Underdeep", tint: "#5a3f7a", note: "crystal caverns below the Stoneholds" },
  { id: "skyrealm", name: "The Skyrealm", tint: "#5a7ab0", note: "floating isles above the clouds" },
  { id: "blightmoor", name: "The Blightmoor", tint: "#6a5a7a", note: "cursed ruins of the old kingdom" },
  { id: "goldlands", name: "The Goldlands", tint: "#c0922e", note: "the breadbasket plains — the new capital" },
];
