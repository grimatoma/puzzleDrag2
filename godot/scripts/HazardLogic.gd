class_name HazardLogic
extends RefCounted
## Pure, engine-agnostic FARM HAZARDS logic — rats, fire, wolves + their interaction tags.
## No nodes, no rendering, no live-board wiring: every function operates on a plain int
## grid (Array of Constants.ROWS rows × Constants.COLS ints, Constants.Tile values / EMPTY)
## plus a hazard-state Dictionary, returning NEW grids / state and coin deltas. The same
## kind of headless-testable static layer as BoardLogic.gd / ToolEffects.gd.
##
## PORTED VERBATIM (cite React file:line) from:
##   src/features/farm/rats.ts        — rollRatSpawn / tickRats / tryClearRatChain
##   src/features/farm/hazards.ts     — rollFarmHazard (fire+wolf) / tickFire / tickWolves /
##                                      tryExtinguishFire + the single-active cap
##   src/features/farm/attractsRats.ts— effectiveRatSpawnRate (attracts_rats bump, cap 1.0)
##   src/features/farm/deadlyPests.ts — tryDeadlyPestsKill (deadly_pests adjacency cull)
##   src/features/tileCollection/tags.ts + data.ts — the per-species tags (avoids_rats /
##                                      attracts_rats / deadly_pests)
##
## RNG. Every roll/spread takes a seedable RandomNumberGenerator so tests are deterministic.
## React uses `rng() < rate` for a hit and `Math.floor(rng() * n)` for an index; the Godot
## analogue is `rng.randf() < rate` (randf() ∈ [0,1)) and `rng.randi_range(0, n - 1)`. For the
## SPAWN-CELL pick React loops up to 32 times with `Math.floor(rng() * dim)`; we mirror that.
##
## HAZARD-STATE SHAPE (the `hazards` Dictionary GameState owns; mirrors React state.hazards):
##   {
##     "rats":   Array of { row:int, col:int, age:int },          # positional rats (rats.ts Rat)
##     "fire":   { "cells": Array of { row:int, col:int } } or {}, # fire cells (hazards.ts FireHazard)
##     "wolves": { "list": Array of { row:int, col:int, scared:bool },
##                 "scared_turns": int } or {},                    # hazards.ts WolfHazard
##   }
## An ABSENT / empty rats array, empty fire {}, empty wolves {} all mean "that hazard inactive".
## Helpers below normalise reads so a missing key reads as inactive (no crashes on a fresh dict).

# ── Per-species interaction tags (src/features/tileCollection/data.ts `tags`) ──────────────
# Ported to Constants.Tile enum values. A tile not listed carries no tag. Only the tags that
# gameplay reads are ported (avoids_rats / attracts_rats / deadly_pests); the placeholder
# tags (resistant_swamp / avoids_wolves / attracts_wolves) are NOT wired in React either, so
# they are intentionally omitted here.

## Tiles rats WON'T eat (data.ts: wheat, coconut, pear, cucumber, cypress — "avoids_rats").
const AVOIDS_RATS: Array = [
	Constants.Tile.WHEAT,
	Constants.Tile.FRUIT_COCONUT,
	Constants.Tile.FRUIT_PEAR,
	Constants.Tile.VEG_CUCUMBER,
	Constants.Tile.TREE_CYPRESS,
]

## Tiles that RAISE the rat spawn rate (data.ts: manna, jackfruit — "attracts_rats").
const ATTRACTS_RATS: Array = [
	Constants.Tile.GRAIN_MANNA,
	Constants.Tile.FRUIT_JACKFRUIT,
]

## Tiles that EXTERMINATE adjacent rats when chained (data.ts: cypress, beet, phoenix —
## "deadly_pests"). Cypress carries BOTH avoids_rats AND deadly_pests, exactly like React.
const DEADLY_PESTS: Array = [
	Constants.Tile.TREE_CYPRESS,
	Constants.Tile.VEG_BEET,
	Constants.Tile.BIRD_PHOENIX,
]

## The PLANT tiles a rat eats (src/features/farm/rats.ts PLANT_KEYS: grass, wheat, blackberry).
## Wheat ALSO carries avoids_rats, so it is filtered back OUT at the eat step — matching React,
## where PLANT_KEYS.has(k) is true for wheat but the hasTag(k,"avoids_rats") guard skips it.
## We include the grass/grain catalog VARIANTS too (they share grass/wheat's category + produce),
## so a board running a meadow/corn variant still feeds rats — a faithful superset of the three
## named keys (manna is grain-category but is filtered: it carries attracts_rats not eaten… in
## React manna IS eaten as it has no avoids_rats; we keep it eligible via category, matching).
const PLANT_CATEGORIES: Array = ["grass", "grain", "fruit"]
## The three explicitly-named React plant keys (the minimal faithful set). A tile is a plant
## if it is one of these OR (a grass/grain/fruit-category tile that is blackberry's family).
## To stay faithful to React's narrow PLANT_KEYS (grass/wheat/blackberry only) we match by the
## NAMED set first; the category superset is a documented, conservative extension for variants.
const PLANT_KEYS: Array = [
	Constants.Tile.GRASS,
	Constants.Tile.WHEAT,
	Constants.Tile.FRUIT_BLACKBERRY,
]

## The BIRD tiles wolves eat (src/features/farm/hazards.ts WOLF_BIRD_KEYS: eggs, turkey). The
## React `eggs` key is its board's base bird tile; the Godot analogue is "any birds-category
## tile" — faithful to the player-facing rule "wolves devour your bird tiles" (documented
## adaptation, since the Godot inventory is resource-keyed and there is no `eggs` board tile).
const WOLF_BIRD_CATEGORY: String = "birds"

# Orthogonal neighbour offsets (dr, dc) — rats/wolves eat ORTHOGONALLY adjacent tiles, and
# fire spreads ORTHOGONALLY (matches React's 4-dir arrays in rats.ts / hazards.ts).
const ORTHO: Array = [Vector2i(0, -1), Vector2i(0, 1), Vector2i(-1, 0), Vector2i(1, 0)]

# ── tag helpers (data.ts hasTag) ──────────────────────────────────────────────────────────

## True when `tile` carries `tag` ("avoids_rats" | "attracts_rats" | "deadly_pests").
static func has_tag(tile: int, tag: String) -> bool:
	match tag:
		"avoids_rats":   return AVOIDS_RATS.has(tile)
		"attracts_rats": return ATTRACTS_RATS.has(tile)
		"deadly_pests":  return DEADLY_PESTS.has(tile)
		_:               return false

## The tag list for `tile` (for inspection / tests). Empty when the tile carries no tag.
static func tags_of(tile: int) -> Array:
	var out: Array = []
	if AVOIDS_RATS.has(tile):   out.append("avoids_rats")
	if ATTRACTS_RATS.has(tile): out.append("attracts_rats")
	if DEADLY_PESTS.has(tile):  out.append("deadly_pests")
	return out

## True when `tile` is a PLANT a rat will eat: one of the named plant keys OR a tile in a
## plant category (grass/grain/fruit) — minus anything tagged avoids_rats. Mirrors React's
## `PLANT_KEYS.has(k) && !hasTag(k,"avoids_rats")` (rats.ts:104-106), widened to variants.
static func is_plant(tile: int) -> bool:
	if tile == Constants.EMPTY:
		return false
	if has_tag(tile, "avoids_rats"):
		return false
	if PLANT_KEYS.has(tile):
		return true
	return PLANT_CATEGORIES.has(Constants.category_of(tile))

## True when `tile` is a bird tile a wolf will eat (birds category). Mirrors React's
## WOLF_BIRD_KEYS membership (hazards.ts:45), adapted to the Godot birds category.
static func is_bird(tile: int) -> bool:
	if tile == Constants.EMPTY:
		return false
	return Constants.category_of(tile) == WOLF_BIRD_CATEGORY

# ── grid / state helpers ──────────────────────────────────────────────────────────────────

## Deep copy of an int grid (rows duplicated), so a tick never mutates the caller's grid.
static func _clone_grid(grid: Array) -> Array:
	var out: Array = []
	for row in grid:
		out.append((row as Array).duplicate())
	return out

static func _in_bounds(row: int, col: int) -> bool:
	return row >= 0 and row < Constants.ROWS and col >= 0 and col < Constants.COLS

## The rats Array from a hazard-state dict (empty Array when absent). NOT a copy — read-only use.
static func rats_of(hazards: Dictionary) -> Array:
	var r: Variant = hazards.get("rats", [])
	return r if r is Array else []

## The fire dict from a hazard-state dict ({} when absent / inactive).
static func fire_of(hazards: Dictionary) -> Dictionary:
	var f: Variant = hazards.get("fire", {})
	return f if (f is Dictionary) else {}

## The fire cells Array ([] when no fire).
static func fire_cells_of(hazards: Dictionary) -> Array:
	var f: Dictionary = fire_of(hazards)
	var c: Variant = f.get("cells", [])
	return c if c is Array else []

## The wolves dict from a hazard-state dict ({} when absent / inactive).
static func wolves_of(hazards: Dictionary) -> Dictionary:
	var w: Variant = hazards.get("wolves", {})
	return w if (w is Dictionary) else {}

## The wolves list Array ([] when no wolves).
static func wolves_list_of(hazards: Dictionary) -> Array:
	var w: Dictionary = wolves_of(hazards)
	var l: Variant = w.get("list", [])
	return l if l is Array else []

## True when ANY farm hazard is currently active (single-active cap, hazards.ts:81-85).
static func any_hazard_active(hazards: Dictionary) -> bool:
	return not rats_of(hazards).is_empty() \
		or not fire_cells_of(hazards).is_empty() \
		or not wolves_list_of(hazards).is_empty()

# ── attracts_rats spawn-rate bump (src/features/farm/attractsRats.ts) ──────────────────────

## Count the attracts_rats tiles (Manna/Jackfruit) currently on `grid`. Pure.
## Ported from countAttractsRatTiles (attractsRats.ts:28-38).
static func count_attracts_rat_tiles(grid: Array) -> int:
	var n: int = 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if has_tag(int(grid[r][c]), "attracts_rats"):
				n += 1
	return n

## Effective rat-spawn rate = base + (attracts_rats tiles × ATTRACT_RATE_BONUS), capped at 1.0.
## Ported from effectiveRatSpawnRate (attractsRats.ts:44-47).
static func effective_rat_spawn_rate(base_rate: float, grid: Array) -> float:
	var n: int = count_attracts_rat_tiles(grid)
	return minf(1.0, base_rate + float(n) * Constants.ATTRACT_RATE_BONUS)

# ── RATS (src/features/farm/rats.ts) ───────────────────────────────────────────────────────

## Roll for a rat spawn on a board fill. Returns a rat Dictionary { row, col, age:0 } on a
## hit, or {} on a miss. Ported from rollRatSpawn (rats.ts:54-83).
##   - hay_bundle > 50 AND flour > 50 (the Godot resource-keyed analogue of React's
##     inv.tile_grass_grass>50 && inv.tile_grain_wheat>50 — see Constants header note),
##   - cap RAT_MAX_ACTIVE active rats,
##   - effective rate (base 10% + attracts_rats bump),
##   - then pick a random non-special, non-rat cell (up to 32 tries).
## `hay`/`flour` are the live inventory quantities (caller passes game.qty(...) so this stays pure).
## `reduce` (T17/T21) maps a hazard id → veto probability [0,1] from the unified ability aggregator's
## hazard_spawn_reduce channel; a "rats" entry runs a second roll that can VETO the spawn. Defaults to
## {} (NO reduction) so a fresh game's rat-spawn roll is byte-identical to before the channel existed.
static func roll_rat_spawn(grid: Array, hazards: Dictionary, hay: int, flour: int, rng: RandomNumberGenerator, reduce: Dictionary = {}) -> Dictionary:
	if hay <= Constants.RAT_SPAWN_HAY_THRESHOLD:
		return {}
	if flour <= Constants.RAT_SPAWN_FLOUR_THRESHOLD:
		return {}
	var rats: Array = rats_of(hazards)
	if rats.size() >= Constants.RAT_MAX_ACTIVE:
		return {}
	var rate: float = effective_rat_spawn_rate(Constants.RAT_SPAWN_RATE, grid)
	if rng.randf() >= rate:
		return {}
	# hazard_spawn_reduce veto (mirrors the mine Canary/Sapper second-roll, hazards.ts:143-148):
	# a "rats" reduce entry can cancel the spawn. 0 / absent → never vetoes → byte-identical.
	var rat_reduce: float = float(reduce.get("rats", 0.0))
	if rat_reduce > 0.0 and rng.randf() < rat_reduce:
		return {}
	if grid.is_empty():
		return {"row": 0, "col": 0, "age": 0}
	var row: int = 0
	var col: int = 0
	var tries: int = 0
	while tries < 32:
		row = int(floor(rng.randf() * float(Constants.ROWS)))
		col = int(floor(rng.randf() * float(Constants.COLS)))
		var t: int = int(grid[row][col])
		# A valid landing cell: non-empty, not already a hazard tile, not already a rat.
		if t != Constants.EMPTY and not _is_hazard_tile(t) and not _rat_at(rats, row, col):
			break
		tries += 1
	return {"row": row, "col": col, "age": 0}

## True when a rat already occupies (row, col) in `rats`.
static func _rat_at(rats: Array, row: int, col: int) -> bool:
	for r in rats:
		if int(r.get("row", -1)) == row and int(r.get("col", -1)) == col:
			return true
	return false

## True when a tile value is itself a board HAZARD tile (RAT / RUBBLE / FIRE) — used to keep a
## rat from spawning onto another hazard cell.
static func _is_hazard_tile(tile: int) -> bool:
	return tile == Constants.Tile.RAT or tile == Constants.Tile.RUBBLE or tile == Constants.Tile.FIRE

## Advance every rat by one turn: each eats ONE orthogonally-adjacent plant tile (blanking it to
## EMPTY) and ages +1. Returns { grid, hazards } with NEW copies. Ported from tickRats
## (rats.ts:88-115): the eaten cell is the FIRST eligible neighbour (deterministic order), and
## avoids_rats tiles are skipped. A starving rat (no adjacent plant) still ages.
static func tick_rats(grid: Array, hazards: Dictionary) -> Dictionary:
	var rats: Array = rats_of(hazards)
	if rats.is_empty():
		return {"grid": grid, "hazards": hazards}
	var out_grid: Array = _clone_grid(grid)
	var out_rats: Array = []
	for rat in rats:
		var row: int = int(rat.get("row", 0))
		var col: int = int(rat.get("col", 0))
		# Find the first orthogonally-adjacent PLANT tile (rats.ts iterates [up,down,left,right]).
		for d in ORTHO:
			var nr: int = row + d.y
			var nc: int = col + d.x
			if not _in_bounds(nr, nc):
				continue
			if is_plant(int(out_grid[nr][nc])):
				out_grid[nr][nc] = Constants.EMPTY
				break
		out_rats.append({"row": row, "col": col, "age": int(rat.get("age", 0)) + 1})
	var out_haz: Dictionary = hazards.duplicate(true)
	out_haz["rats"] = out_rats
	return {"grid": out_grid, "hazards": out_haz}

## Attempt to clear a rat chain from a resolved chain of cells. `chain` is an Array of
## { row, col } (the chained RAT cells). Returns { ok:bool, hazards, coins_delta, cleared:int }.
## Ported from tryClearRatChain (rats.ts:128-154): valid only for a chain of >= 3 cells that are
## ALL rats; clears those rats and pays RAT_CLEAR_REWARD_PER coins each. The caller credits the
## coins + removes the rat tiles from the board. `ok:false` (chain too short / not all rats) means
## a REJECTED rat chain — the caller must NOT resolve it as a normal chain.
static func try_clear_rat_chain(hazards: Dictionary, chain: Array) -> Dictionary:
	if chain.size() < 3:
		return {"ok": false, "hazards": hazards, "coins_delta": 0, "cleared": 0}
	var existing: Array = rats_of(hazards)
	# Every chained cell must correspond to a live rat (the board cell is RAT and a rat sits there).
	var cleared: int = 0
	var remaining: Array = []
	# Build a set of chained (row,col) for O(1) membership.
	var chain_set: Dictionary = {}
	for cell in chain:
		chain_set[Vector2i(int(cell.get("col", 0)), int(cell.get("row", 0)))] = true
	for rat in existing:
		var key := Vector2i(int(rat.get("col", 0)), int(rat.get("row", 0)))
		if chain_set.has(key):
			cleared += 1
		else:
			remaining.append(rat)
	# React rewards `(cleared.length || chain.length)` rats — fall back to the chain length when
	# the rat list and chain disagree (defensive), so a valid 3-rat chain always pays 3×.
	var pay_count: int = cleared if cleared > 0 else chain.size()
	var out_haz: Dictionary = hazards.duplicate(true)
	out_haz["rats"] = remaining
	return {
		"ok": true,
		"hazards": out_haz,
		"coins_delta": pay_count * Constants.RAT_CLEAR_REWARD_PER,
		"cleared": pay_count,
	}

## deadly_pests cull: if `chain` contains any deadly_pests tile (Cypress/Beet/Phoenix), remove
## every rat ORTHOGONALLY-or-diagonally adjacent to a chain cell (incl. the chain cell itself),
## paying RAT_CLEAR_REWARD_PER each. Returns { hazards, coins_delta, killed:int, killed_cells }.
## `chain` is an Array of { row, col, tile } (tile = the chained tile value). Ported from
## tryDeadlyPestsKill (deadlyPests.ts:41-71), which uses the 8-neighbour set + the cell itself.
static func try_deadly_pests_kill(hazards: Dictionary, chain: Array) -> Dictionary:
	var has_deadly: bool = false
	for cell in chain:
		if DEADLY_PESTS.has(int(cell.get("tile", Constants.EMPTY))):
			has_deadly = true
			break
	if not has_deadly:
		return {"hazards": hazards, "coins_delta": 0, "killed": 0, "killed_cells": []}
	var rats: Array = rats_of(hazards)
	if rats.is_empty():
		return {"hazards": hazards, "coins_delta": 0, "killed": 0, "killed_cells": []}
	# Build the adjacency set: every chain cell + its 8 neighbours (deadlyPests.ts uses
	# [-1,0,1]² incl. (0,0)).
	var adj: Dictionary = {}
	for cell in chain:
		var cr: int = int(cell.get("row", 0))
		var cc: int = int(cell.get("col", 0))
		for dr in [-1, 0, 1]:
			for dc in [-1, 0, 1]:
				adj[Vector2i(cc + dc, cr + dr)] = true
	var killed_cells: Array = []
	var remaining: Array = []
	for rat in rats:
		var key := Vector2i(int(rat.get("col", 0)), int(rat.get("row", 0)))
		if adj.has(key):
			killed_cells.append({"row": int(rat.get("row", 0)), "col": int(rat.get("col", 0))})
		else:
			remaining.append(rat)
	if killed_cells.is_empty():
		return {"hazards": hazards, "coins_delta": 0, "killed": 0, "killed_cells": []}
	var out_haz: Dictionary = hazards.duplicate(true)
	out_haz["rats"] = remaining
	return {
		"hazards": out_haz,
		"coins_delta": killed_cells.size() * Constants.RAT_CLEAR_REWARD_PER,
		"killed": killed_cells.size(),
		"killed_cells": killed_cells,
	}

# ── FARM HAZARD SPAWN ROLL (fire + wolves) — src/features/farm/hazards.ts ───────────────────

## Roll for a fire OR wolf spawn on a board fill. Returns one of:
##   { "kind": "fire", "cells": [ {row,col} ] }
##   { "kind": "wolf", "row": int, "col": int, "scared": false }
##   {}  (no spawn)
## Ported from rollFarmHazard (hazards.ts:73-119). SINGLE-ACTIVE CAP: a spawn happens only when
## NO farm hazard (rats/fire/wolves) is currently active. Fire is gated by `fire_enabled` (the
## isFireHazardEnabled() analogue, default off). Wolves need birds-rich inventory (eggs > 30 OR
## turkey > 5) — passed in as `eggs`/`turkey` counts so this stays pure.
## `reduce` (T17/T21) maps a hazard id → veto probability [0,1] from the unified ability aggregator's
## hazard_spawn_reduce channel; a "fire" / "wolf" entry runs a second roll that can VETO that spawn
## (the farm analogue of the mine Canary/Sapper veto). Defaults to {} (NO reduction) so a fresh game's
## fire/wolf roll is byte-identical to before the channel existed.
static func roll_farm_hazard(grid: Array, hazards: Dictionary, fire_enabled: bool, eggs: int, turkey: int, rng: RandomNumberGenerator, reduce: Dictionary = {}) -> Dictionary:
	# Single-active cap (hazards.ts:87/103): any active hazard blocks a new spawn.
	if any_hazard_active(hazards):
		return {}
	# Fire gate (hazards.ts:87-100) — only when enabled + under the cell cap.
	if fire_enabled and fire_cells_of(hazards).size() < Constants.FIRE_MAX_CELLS:
		if rng.randf() < Constants.FIRE_SPAWN_RATE:
			# hazard_spawn_reduce veto for "fire" (0 / absent → never vetoes → byte-identical).
			var fire_reduce: float = float(reduce.get("fire", 0.0))
			if fire_reduce > 0.0 and rng.randf() < fire_reduce:
				return {}
			if grid.is_empty():
				return {"kind": "fire", "cells": [{"row": 0, "col": 0}]}
			var fr: int = int(floor(rng.randf() * float(Constants.ROWS)))
			var fc: int = int(floor(rng.randf() * float(Constants.COLS)))
			return {"kind": "fire", "cells": [{"row": fr, "col": fc}]}
	# Wolf gate (hazards.ts:103-116) — independent roll, still single-active capped above.
	var bird_rich: bool = eggs > Constants.WOLF_SPAWN_EGGS_THRESHOLD or turkey > Constants.WOLF_SPAWN_TURKEY_THRESHOLD
	if bird_rich and wolves_list_of(hazards).size() < Constants.WOLF_MAX_ACTIVE:
		if rng.randf() < Constants.WOLF_SPAWN_RATE:
			# hazard_spawn_reduce veto for "wolf" (0 / absent → never vetoes → byte-identical).
			var wolf_reduce: float = float(reduce.get("wolf", 0.0))
			if wolf_reduce > 0.0 and rng.randf() < wolf_reduce:
				return {}
			var wr: int = 0
			var wc: int = 0
			if not grid.is_empty():
				wr = int(floor(rng.randf() * float(Constants.ROWS)))
				wc = int(floor(rng.randf() * float(Constants.COLS)))
			return {"kind": "wolf", "row": wr, "col": wc, "scared": false}
	return {}

# ── FIRE (src/features/farm/hazards.ts) ─────────────────────────────────────────────────────

## Advance fire by one turn: each existing fire cell rolls FIRE_SPREAD_RATE to spread to ONE
## random orthogonally-adjacent FREE (non-fire) cell, burning that cell's resource (→ EMPTY) and
## adding it to the fire. Returns { grid, hazards } with NEW copies. Ported from tickFire
## (hazards.ts:125-167). No fire → unchanged inputs returned.
static func tick_fire(grid: Array, hazards: Dictionary, rng: RandomNumberGenerator) -> Dictionary:
	var cells: Array = fire_cells_of(hazards)
	if cells.is_empty():
		return {"grid": grid, "hazards": hazards}
	var out_grid: Array = _clone_grid(grid)
	var occupied: Dictionary = {}
	for c in cells:
		occupied[Vector2i(int(c.get("col", 0)), int(c.get("row", 0)))] = true
	var new_cells: Array = []
	for c in cells:
		new_cells.append({"row": int(c.get("row", 0)), "col": int(c.get("col", 0))})
	# Iterate over the ORIGINAL cells only (matches React's `for (const cell of cells)` — newly
	# spread cells don't themselves spread this same tick).
	for cell in cells:
		if rng.randf() >= Constants.FIRE_SPREAD_RATE:
			continue
		var row: int = int(cell.get("row", 0))
		var col: int = int(cell.get("col", 0))
		var candidates: Array = []
		for d in ORTHO:
			var nr: int = row + d.y
			var nc: int = col + d.x
			if not _in_bounds(nr, nc):
				continue
			if occupied.has(Vector2i(nc, nr)):
				continue
			candidates.append(Vector2i(nc, nr))
		if candidates.is_empty():
			continue
		var pick: Vector2i = candidates[rng.randi_range(0, candidates.size() - 1)]
		occupied[pick] = true
		new_cells.append({"row": pick.y, "col": pick.x})
		# Burn the resource at the spread cell.
		out_grid[pick.y][pick.x] = Constants.EMPTY
	var out_haz: Dictionary = hazards.duplicate(true)
	out_haz["fire"] = {"cells": new_cells}
	return {"grid": out_grid, "hazards": out_haz}

## Attempt to extinguish fire tiles in a resolved chain. `chain` is an Array of { row, col }
## (the chained FIRE cells). Returns { ok:bool, hazards, coins_delta, extinguished:int }.
## Ported from tryExtinguishFire (hazards.ts:232-251): pays FIRE_EXTINGUISH_REWARD_PER per fire
## tile removed; clears `fire` entirely when no cells remain. `ok:false` means no fire in the chain.
static func try_extinguish_fire(hazards: Dictionary, chain: Array) -> Dictionary:
	var cells: Array = fire_cells_of(hazards)
	if cells.is_empty():
		return {"ok": false, "hazards": hazards, "coins_delta": 0, "extinguished": 0}
	var chain_set: Dictionary = {}
	for cell in chain:
		chain_set[Vector2i(int(cell.get("col", 0)), int(cell.get("row", 0)))] = true
	var remaining: Array = []
	var extinguished: int = 0
	for c in cells:
		var key := Vector2i(int(c.get("col", 0)), int(c.get("row", 0)))
		if chain_set.has(key):
			extinguished += 1
		else:
			remaining.append({"row": int(c.get("row", 0)), "col": int(c.get("col", 0))})
	if extinguished == 0:
		return {"ok": false, "hazards": hazards, "coins_delta": 0, "extinguished": 0}
	var out_haz: Dictionary = hazards.duplicate(true)
	if remaining.is_empty():
		out_haz["fire"] = {}
	else:
		out_haz["fire"] = {"cells": remaining}
	return {
		"ok": true,
		"hazards": out_haz,
		"coins_delta": extinguished * Constants.FIRE_EXTINGUISH_REWARD_PER,
		"extinguished": extinguished,
	}

# ── WOLVES (src/features/farm/hazards.ts) ───────────────────────────────────────────────────

## Advance wolves by one turn: decrement the scared countdown (clearing all scared flags when it
## hits 0), then each NON-scared wolf eats ONE orthogonally-adjacent bird tile (→ EMPTY). Returns
## { grid, hazards } with NEW copies. Ported from tickWolves (hazards.ts:174-224). No wolves →
## unchanged inputs.
static func tick_wolves(grid: Array, hazards: Dictionary) -> Dictionary:
	var w: Dictionary = wolves_of(hazards)
	var list: Array = wolves_list_of(hazards)
	if w.is_empty() and list.is_empty():
		return {"grid": grid, "hazards": hazards}
	var scared_turns: int = int(w.get("scared_turns", 0))
	# Copy the wolf list (with current scared flags).
	var new_list: Array = []
	for wolf in list:
		new_list.append({
			"row": int(wolf.get("row", 0)),
			"col": int(wolf.get("col", 0)),
			"scared": bool(wolf.get("scared", false)),
		})
	# Scared countdown: tick down; when it reaches 0, every wolf un-scares (hazards.ts:184-189).
	if scared_turns > 0:
		scared_turns -= 1
		if scared_turns == 0:
			for wolf in new_list:
				wolf["scared"] = false
	# Non-scared wolves eat an adjacent bird (hazards.ts:196-213).
	var out_grid: Array = _clone_grid(grid)
	for wolf in new_list:
		if bool(wolf.get("scared", false)):
			continue
		var row: int = int(wolf.get("row", 0))
		var col: int = int(wolf.get("col", 0))
		for d in ORTHO:
			var nr: int = row + d.y
			var nc: int = col + d.x
			if not _in_bounds(nr, nc):
				continue
			if is_bird(int(out_grid[nr][nc])):
				out_grid[nr][nc] = Constants.EMPTY
				break
	var out_haz: Dictionary = hazards.duplicate(true)
	out_haz["wolves"] = {"list": new_list, "scared_turns": scared_turns}
	return {"grid": out_grid, "hazards": out_haz}

## Clear ALL wolves (the Rifle tool). Returns the hazards dict with `wolves` removed ({}).
## Ported from the React USE_TOOL rifle path (clears hazards.wolves → null).
static func clear_wolves(hazards: Dictionary) -> Dictionary:
	var out_haz: Dictionary = hazards.duplicate(true)
	out_haz["wolves"] = {}
	return out_haz

## Scatter all wolves (the Hound tool): flip every wolf scared=true and arm WOLF_SCARED_TURNS.
## Returns the new hazards dict (unchanged when no wolves are active). Ported from the React
## USE_TOOL hound path (all wolves scared=true, scaredTurnsRemaining=5).
static func scatter_wolves(hazards: Dictionary) -> Dictionary:
	var list: Array = wolves_list_of(hazards)
	if list.is_empty():
		return hazards
	var new_list: Array = []
	for wolf in list:
		new_list.append({
			"row": int(wolf.get("row", 0)),
			"col": int(wolf.get("col", 0)),
			"scared": true,
		})
	var out_haz: Dictionary = hazards.duplicate(true)
	out_haz["wolves"] = {"list": new_list, "scared_turns": Constants.WOLF_SCARED_TURNS}
	return out_haz

# ── default state + save/load normalisation ─────────────────────────────────────────────────

## A fresh, all-inactive hazard state (rats empty, no fire, no wolves). GameState seeds this.
static func default_state() -> Dictionary:
	return {"rats": [], "fire": {}, "wolves": {}}

## Defensively normalise a (possibly loaded/JSON) hazard dict into the canonical shape, coercing
## ints (JSON yields floats), dropping malformed entries, and clamping to the active caps. Used by
## GameState.from_dict so a corrupt/stale save can never strand a phantom hazard.
static func normalise(d: Variant) -> Dictionary:
	var out: Dictionary = default_state()
	if not (d is Dictionary):
		return out
	var src: Dictionary = d
	# Rats: keep well-formed { row, col, age } entries up to the cap.
	var rats_in: Variant = src.get("rats", [])
	if rats_in is Array:
		var rats_out: Array = []
		for r in rats_in:
			if not (r is Dictionary):
				continue
			rats_out.append({
				"row": int(r.get("row", 0)),
				"col": int(r.get("col", 0)),
				"age": maxi(0, int(r.get("age", 0))),
			})
			if rats_out.size() >= Constants.RAT_MAX_ACTIVE:
				break
		out["rats"] = rats_out
	# Fire: keep the cells list (well-formed { row, col }) up to the cap.
	var fire_in: Variant = src.get("fire", {})
	if fire_in is Dictionary:
		var cells_in: Variant = (fire_in as Dictionary).get("cells", [])
		if cells_in is Array and not (cells_in as Array).is_empty():
			var cells_out: Array = []
			for c in cells_in:
				if not (c is Dictionary):
					continue
				cells_out.append({"row": int(c.get("row", 0)), "col": int(c.get("col", 0))})
				if cells_out.size() >= Constants.FIRE_MAX_CELLS:
					break
			if not cells_out.is_empty():
				out["fire"] = {"cells": cells_out}
	# Wolves: keep the list (well-formed { row, col, scared }) + the scared countdown.
	var wolves_in: Variant = src.get("wolves", {})
	if wolves_in is Dictionary:
		var list_in: Variant = (wolves_in as Dictionary).get("list", [])
		if list_in is Array and not (list_in as Array).is_empty():
			var list_out: Array = []
			for wd in list_in:
				if not (wd is Dictionary):
					continue
				list_out.append({
					"row": int(wd.get("row", 0)),
					"col": int(wd.get("col", 0)),
					"scared": bool(wd.get("scared", false)),
				})
				if list_out.size() >= Constants.WOLF_MAX_ACTIVE:
					break
			if not list_out.is_empty():
				out["wolves"] = {
					"list": list_out,
					"scared_turns": maxi(0, int((wolves_in as Dictionary).get("scared_turns", 0))),
				}
	return out
