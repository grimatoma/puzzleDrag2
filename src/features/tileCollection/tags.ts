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
  tile_grain_wheat:   ["avoids_rats"],
  tile_fruit_coconut: ["avoids_rats"],
  tile_fruit_pear:    ["avoids_rats"],
  tile_veg_cucumber:  ["avoids_rats"],
  tile_tree_cypress:  ["avoids_rats", "deadly_pests"],

  // ── Placeholder tags (data only; rules not wired yet) ────────────────
  // Resistant to swamp
  tile_grain_rice:        ["resistant_swamp"],
  tile_mount_moose:       ["resistant_swamp"],
  tile_flower_water_lily: ["resistant_swamp"],
  tile_veg_mushroom:      ["resistant_swamp"],
  tile_fruit_rambutan:    ["resistant_swamp"],
  // Avoided by wolves
  tile_bird_rooster:        ["avoids_wolves"],
  tile_herd_sheep:          ["avoids_wolves"],
  tile_herd_alpaca:         ["avoids_wolves"],
  tile_herd_warthog:        ["avoids_wolves"],
  tile_cattle_triceratops:  ["avoids_wolves"],
  // Attracts rats / wolves
  tile_grain_manna:     ["attracts_rats"],
  tile_fruit_jackfruit: ["attracts_rats"],
  tile_bird_wild_goose: ["attracts_wolves"],
  tile_bird_phoenix:    ["attracts_wolves", "deadly_pests"],
  // Deadly to pests
  tile_veg_beet:       ["deadly_pests"],
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
