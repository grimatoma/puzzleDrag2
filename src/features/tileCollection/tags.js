/**
 * Per-species behaviour tags from REFERENCE_CATALOG §7.
 *
 * Today only `avoids_rats` is read by gameplay code (rats hazard skips
 * tagged tiles when picking what to eat). The other tags are placeholder
 * data so future PRs can wire the remaining catalog rules without having
 * to re-source them from the doc.
 *
 * Shape: { [resourceKey]: string[] }
 */
export const SPECIES_TAGS = Object.freeze({
  // ── Avoided by rats — rats won't eat these tiles ─────────────────────
  grain_wheat:   ["avoids_rats"],
  fruit_coconut: ["avoids_rats"],
  fruit_pear:    ["avoids_rats"],
  veg_cucumber:  ["avoids_rats"],
  tree_cypress:  ["avoids_rats", "deadly_pests"],

  // ── Placeholder tags (data only; rules not wired yet) ────────────────
  // Resistant to swamp
  grain_rice:        ["resistant_swamp"],
  mount_moose:       ["resistant_swamp"],
  flower_water_lily: ["resistant_swamp"],
  veg_mushroom:      ["resistant_swamp"],
  fruit_rambutan:    ["resistant_swamp"],
  // Avoided by wolves
  bird_rooster:        ["avoids_wolves"],
  herd_sheep:          ["avoids_wolves"],
  herd_alpaca:         ["avoids_wolves"],
  herd_warthog:        ["avoids_wolves"],
  cattle_triceratops:  ["avoids_wolves"],
  // Attracts rats / wolves
  grain_manna:     ["attracts_rats"],
  fruit_jackfruit: ["attracts_rats"],
  bird_wild_goose: ["attracts_wolves"],
  bird_phoenix:    ["attracts_wolves", "deadly_pests"],
  // Deadly to pests
  veg_beet:       ["deadly_pests"],
});

/**
 * Returns true if `key` carries the named tag.
 * @param {string} key
 * @param {string} tag
 * @returns {boolean}
 */
export function hasTag(key, tag) {
  const tags = SPECIES_TAGS[key];
  return Array.isArray(tags) && tags.includes(tag);
}
