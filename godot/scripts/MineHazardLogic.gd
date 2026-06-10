class_name MineHazardLogic
extends RefCounted
## Pure, engine-agnostic MINE HAZARDS logic — cave_in, gas_vent, lava, mole + the Mysterious-Ore
## rune-capture loop. The mine-side sibling of HazardLogic.gd (farm rats/fire/wolves). No nodes, no
## rendering, no live-board wiring: every function operates on a plain int grid (Array of
## Constants.ROWS rows × Constants.COLS ints, Constants.Tile values / EMPTY) plus a mine-hazard
## state Dictionary, returning NEW grids / state. The same headless-testable static layer as
## BoardLogic.gd / HazardLogic.gd / ToolEffects.gd.
##
## PORTED (cite React file:line) from:
##   src/features/mine/hazards.ts        — HAZARDS pool + rollHazard / tileBlockedByHazard /
##                                          tickHazards (_tickGasVent / _tickLava / _tickMole) /
##                                          clearCaveIn
##   src/features/mine/mysterious_ore.ts — spawnMysteriousOre / tickMysteriousOre /
##                                          isMysteriousChainValid (MYSTERIOUS_ORE_TURNS /
##                                          REQUIRED_DIRT_IN_CHAIN)
##   src/features/workers/aggregate.ts   — hazardSpawnReduce (Canary→gas_vent, Sapper→cave_in);
##                                          the reduce HOOK is wired here (a reduce Dictionary
##                                          arg), defaulting to NO reduction until the worker
##                                          ability aggregator is ported (a later task).
##
## RNG. Every roll/spread/spawn takes a seedable RandomNumberGenerator so tests are deterministic.
## React uses `rng() < rate` for a hit and `Math.floor(rng() * n)` for an index; the Godot
## analogue is `rng.randf() < rate` (randf() ∈ [0,1)) and `rng.randi_range(0, n - 1)`. The
## weighted hazard pick mirrors React's `r = rng()*total; for h: r -= h.weight; if r<=0 pick`.
##
## MINE-HAZARD STATE SHAPE (the `mine_hazards` Dictionary GameState owns; mirrors React
## state.hazards' mine-side keys):
##   {
##     "cave_in":  { "row": int } or {},                                # a BURIED ROW of rubble
##     "gas_vent": { "row": int, "col": int, "turns_remaining": int } or {},
##     "lava":     { "cells": Array of { row:int, col:int } } or {},     # spreading molten cells
##     "mole":     { "row": int, "col": int, "turns_remaining": int } or {},
##   }
## An ABSENT / empty {} for any key means "that hazard inactive". Helpers below normalise reads so a
## missing key reads as inactive (no crashes on a fresh dict).
##
## BOARD REPRESENTATION (how each hazard lands on the grid — see Board.gd / Main.gd wiring):
##   cave_in  — a BURIED ROW: every cell in the row becomes Constants.Tile.RUBBLE (RUBBLE blocks +
##              already exists). Cleared by chaining 3+ STONE tiles with a cell in a row ADJACENT to
##              the buried row (clear_cave_in).
##   lava     — Constants.Tile.LAVA grid cells that BLOCK chaining + spread one cell/turn.
##   gas_vent — a single Constants.Tile.GAS cell at the vent (CHAINABLE; chaining it disperses).
##   mole     — an OVERLAY entity at (row,col) (NOT a grid cell, like a wolf): consumes the tile at
##              an adjacent cell (→ EMPTY) each turn, then hops.
##   mysterious_ore — a Constants.Tile.MYSTERIOUS_ORE grid cell (CHAINABLE; captured by chaining it
##              with >= REQUIRED_DIRT_IN_CHAIN dirt → +1 Rune; degrades to DIRT on expiry).

# Orthogonal neighbour offsets (dr, dc) — lava spreads + the mole consumes/hops ORTHOGONALLY
# (matches React's 4-dir arrays [[-1,0],[1,0],[0,-1],[0,1]] in hazards.ts).
const ORTHO: Array = [Vector2i(0, -1), Vector2i(0, 1), Vector2i(-1, 0), Vector2i(1, 0)]

# ── state helpers (read a possibly-missing key as inactive) ───────────────────────────────────

## The cave_in dict from a mine-hazard state dict ({} when absent / inactive).
static func cave_in_of(mh: Dictionary) -> Dictionary:
	var v: Variant = mh.get("cave_in", {})
	return v if (v is Dictionary) else {}

## The gas_vent dict ({} when absent / inactive).
static func gas_vent_of(mh: Dictionary) -> Dictionary:
	var v: Variant = mh.get("gas_vent", {})
	return v if (v is Dictionary) else {}

## The lava dict ({} when absent / inactive).
static func lava_of(mh: Dictionary) -> Dictionary:
	var v: Variant = mh.get("lava", {})
	return v if (v is Dictionary) else {}

## The lava cells Array ([] when no lava).
static func lava_cells_of(mh: Dictionary) -> Array:
	var l: Dictionary = lava_of(mh)
	var c: Variant = l.get("cells", [])
	return c if (c is Array) else []

## The mole dict ({} when absent / inactive).
static func mole_of(mh: Dictionary) -> Dictionary:
	var v: Variant = mh.get("mole", {})
	return v if (v is Dictionary) else {}

## How many mine hazards are currently active (the single-active cap reads this). Mirrors React
## hazardsActive (hazards.ts:107-112): cave_in + gas_vent + lava (>=1 cell) + mole.
static func active_count(mh: Dictionary) -> int:
	var n: int = 0
	if not cave_in_of(mh).is_empty():
		n += 1
	if not gas_vent_of(mh).is_empty():
		n += 1
	if not lava_cells_of(mh).is_empty():
		n += 1
	if not mole_of(mh).is_empty():
		n += 1
	return n

## True when ANY mine hazard is currently active (the single-active cap, hazards.ts:120).
static func any_active(mh: Dictionary) -> bool:
	return active_count(mh) > 0

## A fresh, all-inactive mine-hazard state. GameState seeds this.
static func default_state() -> Dictionary:
	return {"cave_in": {}, "gas_vent": {}, "lava": {}, "mole": {}}

static func _in_bounds(row: int, col: int) -> bool:
	return row >= 0 and row < Constants.ROWS and col >= 0 and col < Constants.COLS

## Deep copy of an int grid (rows duplicated), so a tick never mutates the caller's grid.
static func _clone_grid(grid: Array) -> Array:
	var out: Array = []
	for row in grid:
		out.append((row as Array).duplicate())
	return out

# ── HAZARD SPAWN ROLL (src/features/mine/hazards.ts rollHazard) ────────────────────────────────

## Roll for a mine-hazard spawn on a board fill. Returns the hazard DESCRIPTOR Dictionary on a hit
## (the spawn payload + an "id"), or {} on a miss. Ported VERBATIM from rollHazard (hazards.ts:117-151):
##   - in_mine + no boss + no hazard already active (single-active cap),
##   - MINE_HAZARD_BASE_RATE hit roll,
##   - WEIGHTED pick over the four hazards,
##   - Canary/Sapper hazardSpawnReduce on gas_vent/cave_in (a second roll that can VETO the spawn).
## `in_mine` / `boss_active` are passed in (so this stays pure — the caller reads GameState). The
## `reduce` Dictionary maps a hazard id → veto probability [0,1] (Canary→"gas_vent", Sapper→
## "cave_in"); pass {} (the default) for NO reduction until the worker aggregator ships (a later task).
##
## Returned descriptor shapes (id + the matching state sub-dict's contents, FLAT):
##   { "id": "cave_in",  "row": int }
##   { "id": "gas_vent", "row": int, "col": int, "turns_remaining": GAS_VENT_TURNS }
##   { "id": "lava",     "row": int, "col": int }                 # the seed cell
##   { "id": "mole",     "row": int, "col": int, "turns_remaining": MOLE_TURNS }
## The caller writes the descriptor into mine_hazards (see GameState.roll_mine_hazard_on_fill) and
## stamps the board.
static func roll_mine_hazard(mh: Dictionary, in_mine: bool, boss_active: bool, rng: RandomNumberGenerator, reduce: Dictionary = {}) -> Dictionary:
	if not in_mine:
		return {}
	if boss_active:
		return {}
	if any_active(mh):
		return {}
	# Base-rate hit roll (hazards.ts:123-124: `if (rng() >= rate) return null`).
	if rng.randf() >= Constants.MINE_HAZARD_BASE_RATE:
		return {}
	# Weighted pick (hazards.ts:130-139). total = sum of weights; r = rng()*total; subtract.
	var total: int = 0
	for id in Constants.MINE_HAZARD_IDS:
		total += int(Constants.MINE_HAZARD_WEIGHTS.get(id, 0))
	if total <= 0:
		return {}
	var r: float = rng.randf() * float(total)
	var picked: String = String(Constants.MINE_HAZARD_IDS[0])
	for id in Constants.MINE_HAZARD_IDS:
		r -= float(int(Constants.MINE_HAZARD_WEIGHTS.get(id, 0)))
		if r <= 0.0:
			picked = String(id)
			break
	# Canary / Sapper reduce (hazards.ts:143-148): a second roll can VETO a gas_vent / cave_in spawn.
	if picked == "gas_vent" or picked == "cave_in":
		var reduce_r: float = float(reduce.get(picked, 0.0))
		if reduce_r > 0.0 and rng.randf() < reduce_r:
			return {}
	# Build the spawn descriptor for the picked hazard.
	match picked:
		"cave_in":
			# A whole row buried (hazards.ts:59-62: `row = floor(rng()*grid.length)`).
			var row: int = int(floor(rng.randf() * float(Constants.ROWS)))
			return {"id": "cave_in", "row": row}
		"gas_vent":
			# hazards.ts:72-75: row/col in [0, dim-1) (the original uses dim-1 to keep the cloud
			# in-bounds even with its legacy spread; we keep the dim-1 cap for parity).
			var gr: int = int(floor(rng.randf() * float(Constants.ROWS - 1)))
			var gc: int = int(floor(rng.randf() * float(Constants.COLS - 1)))
			return {"id": "gas_vent", "row": gr, "col": gc, "turns_remaining": Constants.GAS_VENT_TURNS}
		"lava":
			# hazards.ts:85-88: a single seed cell anywhere on the board.
			var lr: int = int(floor(rng.randf() * float(Constants.ROWS)))
			var lc: int = int(floor(rng.randf() * float(Constants.COLS)))
			return {"id": "lava", "row": lr, "col": lc}
		"mole":
			# hazards.ts:98-102: a mole anywhere on the board, 3-turn cycle.
			var mr: int = int(floor(rng.randf() * float(Constants.ROWS)))
			var mc: int = int(floor(rng.randf() * float(Constants.COLS)))
			return {"id": "mole", "row": mr, "col": mc, "turns_remaining": Constants.MOLE_TURNS}
		_:
			return {}

# ── tile-blocked (src/features/mine/hazards.ts tileBlockedByHazard) ────────────────────────────

## True when a tile value is BLOCKED by a mine hazard (rubble or lava) — the drag/chain logic must
## skip these cells. Mirrors tileBlockedByHazard (hazards.ts:157-159): rubble/lava block; GAS tiles
## remain chainable (chaining is the counter). RUBBLE is the existing cave-in clutter tile.
static func tile_blocked_by_hazard(tile: int) -> bool:
	return tile == Constants.Tile.RUBBLE or tile == Constants.Tile.LAVA

# ── per-turn tick (src/features/mine/hazards.ts tickHazards) ───────────────────────────────────

## Advance every mine hazard by one turn against the live board `grid`. Returns
##   { "grid": Array, "mine_hazards": Dictionary, "gas_cost_turn": bool, "floater": String }
## with NEW copies. ORDER mirrors React tickHazards (hazards.ts:167-173): gas_vent → lava → mole.
##   - gas_vent: tick the countdown; at expiry it CLEARS, COSTS A TURN (gas_cost_turn=true), and
##               sets floater "You cough through it." (hazards.ts:175-195). The board GAS cell is
##               cleared to EMPTY (the caller collapses/refills).
##   - lava:     spread to ONE random orthogonally-adjacent free cell, stamping it LAVA (hazards.ts
##               197-252).
##   - mole:     turnsRemaining>0 → consume one adjacent non-consumed/non-rubble tile (→ EMPTY);
##               ==0 → hop to a random free adjacent cell + reset the timer (hazards.ts:254-323).
## cave_in does NOT tick (it just sits as a buried row until a stone chain clears it).
static func tick_mine_hazards(grid: Array, mh: Dictionary, rng: RandomNumberGenerator) -> Dictionary:
	var out_grid: Array = _clone_grid(grid)
	var out_mh: Dictionary = mh.duplicate(true)
	var gas_cost_turn: bool = false
	var floater: String = ""

	# 1. GAS VENT countdown.
	var gas: Dictionary = gas_vent_of(out_mh)
	if not gas.is_empty():
		var rem: int = int(gas.get("turns_remaining", 0))
		if rem > 1:
			gas["turns_remaining"] = rem - 1
			out_mh["gas_vent"] = gas
		else:
			# Expired: clear the vent, COST A TURN, set the cough floater. Clear the board GAS cell.
			var gr: int = int(gas.get("row", -1))
			var gc: int = int(gas.get("col", -1))
			if _in_bounds(gr, gc) and int(out_grid[gr][gc]) == Constants.Tile.GAS:
				out_grid[gr][gc] = Constants.EMPTY
			out_mh["gas_vent"] = {}
			gas_cost_turn = true
			floater = "You cough through it."

	# 2. LAVA spread (one random orthogonal free neighbour of any lava cell).
	var lava_cells: Array = lava_cells_of(out_mh)
	if not lava_cells.is_empty():
		var occupied: Dictionary = {}
		for c in lava_cells:
			occupied[Vector2i(int(c.get("col", 0)), int(c.get("row", 0)))] = true
		# Collect every free orthogonal neighbour of any lava cell (de-duped), mirroring
		# _tickLava's candidate gather (hazards.ts:213-226).
		var candidates: Array = []
		for c in lava_cells:
			var row: int = int(c.get("row", 0))
			var col: int = int(c.get("col", 0))
			for d in ORTHO:
				var nr: int = row + d.y
				var nc: int = col + d.x
				if not _in_bounds(nr, nc):
					continue
				var key := Vector2i(nc, nr)
				if not occupied.has(key):
					candidates.append(key)
					occupied[key] = true   # avoid duplicate candidates (matches React's set)
		if not candidates.is_empty():
			var pick: Vector2i = candidates[rng.randi_range(0, candidates.size() - 1)]
			var new_cells: Array = []
			for c in lava_cells:
				new_cells.append({"row": int(c.get("row", 0)), "col": int(c.get("col", 0))})
			new_cells.append({"row": pick.y, "col": pick.x})
			# Destroy whatever resource sat at the new lava cell — stamp LAVA (hazards.ts:237-242).
			out_grid[pick.y][pick.x] = Constants.Tile.LAVA
			var lava: Dictionary = lava_of(out_mh)
			lava["cells"] = new_cells
			out_mh["lava"] = lava
		# else: no room to spread — stay put (hazards.ts:228-231).

	# 3. MOLE consume / hop.
	var mole: Dictionary = mole_of(out_mh)
	if not mole.is_empty():
		var mrow: int = int(mole.get("row", 0))
		var mcol: int = int(mole.get("col", 0))
		var turns: int = int(mole.get("turns_remaining", 0))
		if turns > 0:
			# Decrement + consume one adjacent non-consumed/non-rubble tile (hazards.ts:265-296).
			# "non-consumed" in React = the cell is not already EMPTY; "non-rubble" = not RUBBLE.
			# (The port also skips LAVA — a mole can't eat molten rock; faithful to "won't eat a
			# blocked cell", and React's grid has no lava-as-a-mole-target either.)
			var adj: Array = []
			for d in ORTHO:
				var nr: int = mrow + d.y
				var nc: int = mcol + d.x
				if not _in_bounds(nr, nc):
					continue
				var t: int = int(out_grid[nr][nc])
				if t != Constants.EMPTY and t != Constants.Tile.RUBBLE and t != Constants.Tile.LAVA:
					adj.append(Vector2i(nc, nr))
			if not adj.is_empty():
				var target: Vector2i = adj[rng.randi_range(0, adj.size() - 1)]
				out_grid[target.y][target.x] = Constants.EMPTY
			out_mh["mole"] = {"row": mrow, "col": mcol, "turns_remaining": turns - 1}
		else:
			# turnsRemaining == 0: hop to a random free adjacent cell, reset the timer
			# (hazards.ts:298-322). "free" = not RUBBLE / LAVA / EMPTY (a real tile to sit on).
			var free_adj: Array = []
			for d in ORTHO:
				var nr: int = mrow + d.y
				var nc: int = mcol + d.x
				if not _in_bounds(nr, nc):
					continue
				var t: int = int(out_grid[nr][nc])
				if t != Constants.Tile.RUBBLE and t != Constants.Tile.LAVA and t != Constants.EMPTY:
					free_adj.append(Vector2i(nc, nr))
			var new_pos := Vector2i(mcol, mrow)
			if not free_adj.is_empty():
				new_pos = free_adj[rng.randi_range(0, free_adj.size() - 1)]
			out_mh["mole"] = {"row": new_pos.y, "col": new_pos.x, "turns_remaining": Constants.MOLE_TURNS}

	return {"grid": out_grid, "mine_hazards": out_mh, "gas_cost_turn": gas_cost_turn, "floater": floater}

# ── cave-in clear (src/features/mine/hazards.ts clearCaveIn) ───────────────────────────────────

## Attempt to clear a cave-in by chaining 3+ STONE tiles with a cell in a row ADJACENT to the
## buried row. `chain` is an Array of { row:int, col:int, tile:int } (the resolved chain cells +
## their tile value). Returns { "ok": bool, "mine_hazards": Dictionary }. Ported from clearCaveIn
## (hazards.ts:330-338): needs >= 3 STONE cells AND at least one chain cell in a row exactly 1 away
## from the buried row. ok=false (no cave-in / too few stone / not adjacent) leaves mh unchanged.
static func clear_cave_in(mh: Dictionary, chain: Array) -> Dictionary:
	var cave: Dictionary = cave_in_of(mh)
	if cave.is_empty():
		return {"ok": false, "mine_hazards": mh}
	var target_row: int = int(cave.get("row", -1))
	var stone_count: int = 0
	var near_row: bool = false
	for cell in chain:
		if int(cell.get("tile", Constants.EMPTY)) == Constants.Tile.STONE:
			stone_count += 1
		if absi(int(cell.get("row", -99)) - target_row) == 1:
			near_row = true
	if stone_count < 3 or not near_row:
		return {"ok": false, "mine_hazards": mh}
	var out_mh: Dictionary = mh.duplicate(true)
	out_mh["cave_in"] = {}
	return {"ok": true, "mine_hazards": out_mh}

# ── gas disperse-by-chain (src/features/mine/hazards.ts — chaining the gas cell counters it) ────

## Disperse the gas vent if the resolved `chain` ran THROUGH the gas cell. `chain` is an Array of
## { row:int, col:int, tile:int }. Returns { "ok": bool, "mine_hazards": Dictionary }. The React
## counter is "chain through any tiles in the gas cloud to disperse it before the timer expires"
## (hazards.ts gas_vent clearInstruction); the port models gas as a single GAS cell, so a chain
## that includes the GAS tile disperses the vent. ok=false (no gas / chain didn't touch it) leaves
## mh unchanged. NO turn cost on a successful disperse (unlike expiry, which costs a turn).
static func disperse_gas(mh: Dictionary, chain: Array) -> Dictionary:
	var gas: Dictionary = gas_vent_of(mh)
	if gas.is_empty():
		return {"ok": false, "mine_hazards": mh}
	var touched: bool = false
	for cell in chain:
		if int(cell.get("tile", Constants.EMPTY)) == Constants.Tile.GAS:
			touched = true
			break
	if not touched:
		return {"ok": false, "mine_hazards": mh}
	var out_mh: Dictionary = mh.duplicate(true)
	out_mh["gas_vent"] = {}
	return {"ok": true, "mine_hazards": out_mh}

# ── Mysterious Ore (src/features/mine/mysterious_ore.ts) ────────────────────────────────────────

## Spawn a Mysterious Ore on the mine board. Returns { "ok": bool, "grid": Array, "ore": Dictionary }.
## Ported from spawnMysteriousOre (mysterious_ore.ts:35-67): mine only, ONE at a time, on a random
## NON-BLOCKED cell (not rubble/lava/gas — the port's blocked set; React's is rubble/gas/frozen/
## hidden, mapped to the port's hazard tiles), up to 32 tries. On success stamps the cell with
## Constants.Tile.MYSTERIOUS_ORE and returns ore { row, col, turns_left = MYSTERIOUS_ORE_TURNS }.
## `existing_ore` is the current ore state ({} when none); a non-empty one short-circuits (one at a
## time). `in_mine` is passed in (so this stays pure).
static func spawn_mysterious_ore(grid: Array, existing_ore: Dictionary, in_mine: bool, rng: RandomNumberGenerator) -> Dictionary:
	if not in_mine:
		return {"ok": false, "grid": grid, "ore": {}}
	if not existing_ore.is_empty():
		return {"ok": false, "grid": grid, "ore": {}}   # already active — one at a time
	if grid.is_empty():
		return {"ok": false, "grid": grid, "ore": {}}
	var out_grid: Array = _clone_grid(grid)
	var row: int = 0
	var col: int = 0
	var tries: int = 0
	while tries < 32:
		row = int(floor(rng.randf() * float(Constants.ROWS)))
		col = int(floor(rng.randf() * float(Constants.COLS)))
		var t: int = int(out_grid[row][col])
		# A valid landing cell: not a blocked/hazard tile (rubble/lava/gas) and not EMPTY.
		if t != Constants.EMPTY and t != Constants.Tile.RUBBLE and t != Constants.Tile.LAVA and t != Constants.Tile.GAS:
			break
		tries += 1
	out_grid[row][col] = Constants.Tile.MYSTERIOUS_ORE
	return {
		"ok": true,
		"grid": out_grid,
		"ore": {"row": row, "col": col, "turns_left": Constants.MYSTERIOUS_ORE_TURNS},
	}

## Tick the Mysterious-Ore countdown by 1. Returns { "ore": Dictionary, "grid": Array,
## "expired": bool }. Ported from tickMysteriousOre (mysterious_ore.ts:72-93): at 0 the ore
## DEGRADES to plain DIRT (tile_special_dirt → Constants.Tile.DIRT) and clears (expired=true,
## ore {}). No ore → unchanged inputs (expired=false).
static func tick_mysterious_ore(grid: Array, ore: Dictionary) -> Dictionary:
	if ore.is_empty():
		return {"ore": ore, "grid": grid, "expired": false}
	var next: int = int(ore.get("turns_left", 0)) - 1
	if next > 0:
		var ticked: Dictionary = ore.duplicate(true)
		ticked["turns_left"] = next
		return {"ore": ticked, "grid": grid, "expired": false}
	# Expire — degrade the tile to plain DIRT.
	var out_grid: Array = _clone_grid(grid)
	var row: int = int(ore.get("row", -1))
	var col: int = int(ore.get("col", -1))
	if _in_bounds(row, col):
		out_grid[row][col] = Constants.Tile.DIRT
	return {"ore": {}, "grid": out_grid, "expired": true}

## True when the resolved `chain` is a VALID Mysterious-Ore capture: it CONTAINS the ore tile AND
## at least Constants.REQUIRED_DIRT_IN_CHAIN dirt tiles. `chain` is an Array of { tile:int } (or
## { row, col, tile }). Ported VERBATIM from isMysteriousChainValid (mysterious_ore.ts:99-103).
static func is_mysterious_chain_valid(chain: Array) -> bool:
	var has_ore: bool = false
	var dirt_count: int = 0
	for cell in chain:
		var t: int = int(cell.get("tile", Constants.EMPTY))
		if t == Constants.Tile.MYSTERIOUS_ORE:
			has_ore = true
		elif t == Constants.Tile.DIRT:
			dirt_count += 1
	return has_ore and dirt_count >= Constants.REQUIRED_DIRT_IN_CHAIN

# ── tool effects (T14b — Water Pump / Explosives) ──────────────────────────────────────────────

## Water Pump: flood every LAVA cell on the board, converting it to RUBBLE, and clear the lava
## hazard. Returns { "grid": Array, "mine_hazards": Dictionary, "cleared": int }. Ported from
## _applyWaterPump (src/state/toolPowerRuntime.ts:115-134): lava cells → { key: "tile_mine_stone",
## rubble: true } (the port's RUBBLE tile) and hazards.lava → null. `cleared` is the lava-cell count
## converted. A no-lava board is a no-op (cleared 0, mh unchanged) — the caller can treat that as a
## wasted/refused use.
static func apply_water_pump(grid: Array, mh: Dictionary) -> Dictionary:
	var out_grid: Array = _clone_grid(grid)
	var cleared: int = 0
	var cells: Array = lava_cells_of(mh)
	for c in cells:
		var r: int = int(c.get("row", -1))
		var col: int = int(c.get("col", -1))
		if _in_bounds(r, col):
			out_grid[r][col] = Constants.Tile.RUBBLE
			cleared += 1
	# Also sweep any stray LAVA grid cells not tracked in the hazard list (defensive parity with
	# React's grid.map over the lava set — keeps the board free of orphaned lava).
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if int(out_grid[r][c]) == Constants.Tile.LAVA:
				out_grid[r][c] = Constants.Tile.RUBBLE
				cleared += 1
	var out_mh: Dictionary = mh.duplicate(true)
	out_mh["lava"] = {}
	return {"grid": out_grid, "mine_hazards": out_mh, "cleared": cleared}

## Explosives: clear the cave_in AND mole hazards from the mine. Returns
##   { "grid": Array, "mine_hazards": Dictionary, "cleared": int }.
## Ported from _applyExplosives (toolPowerRuntime.ts:136-141): hazards.mole → null, hazards.caveIn
## → null. The cave_in is a buried ROW of RUBBLE — blank those rubble cells back to EMPTY (the
## caller collapses/refills) so the cleared row is actually mineable again. The mole is an OVERLAY
## (no grid cell), so only the state clears for it. `cleared` is the number of hazards removed (0, 1,
## or 2). A no-cave-in/no-mole board is a no-op (cleared 0).
static func apply_explosives(grid: Array, mh: Dictionary) -> Dictionary:
	var out_grid: Array = _clone_grid(grid)
	var cleared: int = 0
	var out_mh: Dictionary = mh.duplicate(true)
	var cave: Dictionary = cave_in_of(out_mh)
	if not cave.is_empty():
		var row: int = int(cave.get("row", -1))
		if row >= 0 and row < Constants.ROWS:
			for c in Constants.COLS:
				if int(out_grid[row][c]) == Constants.Tile.RUBBLE:
					out_grid[row][c] = Constants.EMPTY
		out_mh["cave_in"] = {}
		cleared += 1
	if not mole_of(out_mh).is_empty():
		out_mh["mole"] = {}
		cleared += 1
	return {"grid": out_grid, "mine_hazards": out_mh, "cleared": cleared}

# ── save/load normalisation ────────────────────────────────────────────────────────────────────

## Defensively normalise a (possibly loaded/JSON) mine-hazard dict into the canonical shape,
## coercing ints (JSON yields floats), dropping malformed entries. Used by GameState.from_dict so a
## corrupt/stale save can never strand a phantom mine hazard. A missing/garbage value → the default
## all-inactive state.
static func normalise(d: Variant) -> Dictionary:
	var out: Dictionary = default_state()
	if not (d is Dictionary):
		return out
	var src: Dictionary = d
	# cave_in: keep { row } when well-formed + in range.
	var cave_in: Variant = src.get("cave_in", {})
	if cave_in is Dictionary and (cave_in as Dictionary).has("row"):
		var cr: int = int((cave_in as Dictionary).get("row", -1))
		if cr >= 0 and cr < Constants.ROWS:
			out["cave_in"] = {"row": cr}
	# gas_vent: keep { row, col, turns_remaining } when well-formed + in range + a live countdown.
	var gas: Variant = src.get("gas_vent", {})
	if gas is Dictionary and (gas as Dictionary).has("row"):
		var gr: int = int((gas as Dictionary).get("row", -1))
		var gc: int = int((gas as Dictionary).get("col", -1))
		var gt: int = maxi(0, int((gas as Dictionary).get("turns_remaining", 0)))
		if gr >= 0 and gr < Constants.ROWS and gc >= 0 and gc < Constants.COLS and gt > 0:
			out["gas_vent"] = {"row": gr, "col": gc, "turns_remaining": gt}
	# lava: keep the cells list (well-formed { row, col } in range).
	var lava: Variant = src.get("lava", {})
	if lava is Dictionary:
		var cells_in: Variant = (lava as Dictionary).get("cells", [])
		if cells_in is Array and not (cells_in as Array).is_empty():
			var cells_out: Array = []
			for c in cells_in:
				if not (c is Dictionary):
					continue
				var r: int = int(c.get("row", -1))
				var col: int = int(c.get("col", -1))
				if r >= 0 and r < Constants.ROWS and col >= 0 and col < Constants.COLS:
					cells_out.append({"row": r, "col": col})
			if not cells_out.is_empty():
				out["lava"] = {"cells": cells_out}
	# mole: keep { row, col, turns_remaining } when well-formed + in range.
	var mole: Variant = src.get("mole", {})
	if mole is Dictionary and (mole as Dictionary).has("row"):
		var mr: int = int((mole as Dictionary).get("row", -1))
		var mc: int = int((mole as Dictionary).get("col", -1))
		var mt: int = maxi(0, int((mole as Dictionary).get("turns_remaining", 0)))
		if mr >= 0 and mr < Constants.ROWS and mc >= 0 and mc < Constants.COLS:
			out["mole"] = {"row": mr, "col": mc, "turns_remaining": mt}
	return out
