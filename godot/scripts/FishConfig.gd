class_name FishConfig
extends RefCounted
## Fish / Harbor biome — pure helpers for the tide cycle + the giant-pearl rune
## capture. Ported from src/features/fish/slice.ts (tide pools) and
## src/features/fish/pearl.ts (the pearl-chain rule).
##
## PURE + STATELESS: every function here is a static helper that reads only its
## arguments + Constants. The mutable harbor state (which tide is up, how many turns
## are left, the live pearl) lives on GameState; this module just answers the rule
## questions ("what spawns at this tide?", "is THIS chain a valid pearl capture?").
##
## Registered as a `class_name` global (like Constants / BossConfig) so its helpers
## are reachable WITHOUT a live autoload — headless tests run before the scene tree.

## Tide string ids. The harbor tide is one of these two; it flips between them every
## Constants.TIDE_PERIOD spent harbor turns (GameState.note_harbor_turn).
const TIDE_HIGH: String = "high"
const TIDE_LOW: String = "low"

## The bottom-row spawn pool for the given tide (Array[int] of Constants.Tile).
## HIGH → surface fish (Constants.HIGH_TIDE_POOL), anything else (i.e. "low") →
## shellfish + kelp (Constants.LOW_TIDE_POOL). Returns a fresh duplicate so a caller
## can mutate it without corrupting the shared const pool. The board slice draws the
## bottom row's replacement tiles from this on a tide flip.
static func tide_pool(tide: String) -> Array:
	if tide == TIDE_HIGH:
		return Constants.HIGH_TIDE_POOL.duplicate()
	return Constants.LOW_TIDE_POOL.duplicate()

## The other tide. "high" → "low" and anything else → "high" (so a corrupt/empty tide
## defaults to flipping toward high). Convenience for the tide tick.
static func flip_tide(tide: String) -> String:
	return TIDE_LOW if tide == TIDE_HIGH else TIDE_HIGH

## True when `tile` is a catchable FISH-category tile (category == "fish"). The five
## catch tiles (sardine/mackerel/clam/oyster/kelp) return true; the giant pearl is its
## OWN "fish_pearl" category and returns FALSE here (it is never one of the "other fish"
## a pearl capture requires), as does every farm/mine/hazard tile.
static func is_fish_tile(tile: int) -> bool:
	return Constants.category_of(tile) == "fish"

## Normalise one chain element to its string tile key. Accepts EITHER a String key
## (already canonical) or an int Constants.Tile ordinal (mapped via STRING_KEYS).
## Returns "" for anything else. Lets is_pearl_chain_valid take a mixed/either-typed
## Array without the caller pre-converting.
static func _chain_key(elem) -> String:
	if elem is String:
		return elem
	if elem is int or elem is float:
		return Constants.string_key(int(elem))
	return ""

## True IFF `chain_keys` is a valid giant-pearl CAPTURE: it contains the pearl tile
## (Constants.PEARL_KEY) AND at least Constants.REQUIRED_FISH_IN_CHAIN OTHER
## fish-category tiles (the pearl itself does not count toward that quota).
##
## INPUT CONTRACT: `chain_keys` is an Array whose elements are EITHER String tile keys
## (e.g. "tile_fish_sardine") OR int Constants.Tile ordinals (e.g. Tile.FISH_SARDINE),
## or any mix of the two — each element is normalised via _chain_key. This mirrors
## React's isPearlChainValid (src/features/fish/pearl.ts), which keys off the cell's
## string `key`; here we additionally accept ints so the board slice can pass raw
## grid tile values without converting. Returns false for a null/empty chain.
static func is_pearl_chain_valid(chain_keys: Array) -> bool:
	if chain_keys == null or chain_keys.is_empty():
		return false
	var has_pearl: bool = false
	var fish_count: int = 0
	for elem in chain_keys:
		var key: String = _chain_key(elem)
		if key == "":
			continue
		if key == Constants.PEARL_KEY:
			has_pearl = true
			continue
		# Count only OTHER fish-category tiles. _is_fish_key checks the string key's
		# category, so a chain built from either ints or strings counts the same.
		if _is_fish_key(key):
			fish_count += 1
	return has_pearl and fish_count >= Constants.REQUIRED_FISH_IN_CHAIN

## True when string tile key `key` belongs to the "fish" category. Resolves the key
## back to its Constants.Tile ordinal (the five fish keys) and checks category_of. The
## pearl key returns false (its own "fish_pearl" category), matching is_fish_tile.
static func _is_fish_key(key: String) -> bool:
	for tile in Constants.CATEGORY.keys():
		if Constants.string_key(int(tile)) == key:
			return Constants.category_of(int(tile)) == "fish"
	return false
