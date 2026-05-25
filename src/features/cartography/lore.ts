// Per-node story flavor for the redesigned Map page.
//
// Each entry contributes to the redesigned side panel:
//   subtitle  — a short cartographic descriptor under the node name
//   epitaph   — italic flavor quote (from a character, an old charter, or the land)
//   speaker   — who said the epitaph (used for attribution)
//   hearth    — one-line "state of the hearth" descriptor used in the
//               Phaser scene's atmospheric label under each node
//
// The tone matches docs/the_long_return_master_doc_v3.md — banked hearths,
// the Long Silence, the Hollow Pact, sister-holds whose smoke rises
// when yours does. Keep it short, suggestive, never explanatory.

export const NODE_LORE = {
  home: {
    subtitle: "First hearth · the line's last keeper",
    epitaph:
      "The ember has burned a hundred years without you. Now it burns with you.",
    speaker: "Wren",
    hearth: "Your hearth — the smoke that called the others home.",
  },
  meadow: {
    subtitle: "Sister-hold · Greenfields",
    epitaph: "The grain remembers a steadier hand than mine. Walk it well.",
    speaker: "Wren",
    hearth: "A wide quiet, waiting for a plow.",
  },
  orchard: {
    subtitle: "Sister-hold · the old planted rows",
    epitaph:
      "Trees keep their own time. These have been counting since the founding.",
    speaker: "Tomas",
    hearth: "Crooked rows of fruit — older than any living name.",
  },
  crossroads: {
    subtitle: "Wayside · where rumor meets the road",
    epitaph:
      "A crossroads is a place where two strangers can become a hold of two.",
    speaker: "The old Charter, term IV",
    hearth: "A signpost with names half rubbed away.",
  },
  quarry: {
    subtitle: "Sister-hold · the cracked face",
    epitaph: "Stone keeps its grudges. Ask before you take, knock before you cut.",
    speaker: "The Stone-Knocker",
    hearth: "A pit of broken stone, waiting for the proper words.",
  },
  caves: {
    subtitle: "Sister-hold · deep ways under lantern",
    epitaph:
      "Each lantern down here is a name a miner left on the wall before going further.",
    speaker: "Bram",
    hearth: "Lanterns flicker where the old crews still listen.",
  },
  fairground: {
    subtitle: "Wayside · the drifters' fair",
    epitaph:
      "If you didn't bring the festival to them, they will bring it to you. Bring coin.",
    speaker: "Mira",
    hearth: "Pennants snap above a rolling caravan.",
  },
  forge: {
    subtitle: "Sister-hold · the black forge",
    epitaph: "My brother went looking for our stone here. The forge remembers him.",
    speaker: "Bram",
    hearth: "Sparks rising — the anvil has not yet gone cold.",
  },
  pit: {
    subtitle: "The Deep · a wound in the land",
    epitaph:
      "Something there refused to leave when the rest of us did. It will want a word.",
    speaker: "Wren",
    hearth: "A dark mouth. Faintly, it hums.",
  },
  harbor: {
    subtitle: "Sister-hold · Saltspray pier",
    epitaph: "The tide already knows your name. It will use it when it's ready.",
    speaker: "The Tidesinger",
    hearth: "Sails patched. Nets folded. The sea takes its turn.",
  },
  oldcapital: {
    subtitle: "Anchor of the Pact · the first hearth",
    epitaph:
      "What is named, remains. What is forgotten, the Hollow Folk reclaim.",
    speaker: "The Charter, term IV",
    hearth: "The first ember of the line — waiting on the three tokens.",
  },
};

// The three Hearth-Tokens that gate the Old Capital. Each is earned by
// completing a settlement of the matching type (see hearthTokenCount in
// zones/data.js). Names + visuals here drive the HUD strip at the top of
// the new map page.
export const HEARTH_TOKENS = [
  {
    id: "seed",
    name: "Heirloom Seed",
    short: "Seed",
    glyph: "🌱",
    accent: "#9bbf68",
    source: "any completed farm",
  },
  {
    id: "iron",
    name: "Pact-Iron",
    short: "Iron",
    glyph: "⚙",
    accent: "#b5bdc4",
    source: "any completed mine",
  },
  {
    id: "pearl",
    name: "Tidesinger's Pearl",
    short: "Pearl",
    glyph: "◯",
    accent: "#cfe1ea",
    source: "any completed harbor",
  },
];

export function loreFor(nodeId) {
  return NODE_LORE[nodeId] ?? null;
}
