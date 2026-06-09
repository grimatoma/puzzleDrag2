class_name BossModifierLogic
extends RefCounted
## Pure, headless board-modifier logic for the seasonal-boss challenges — the GDScript
## port of src/features/bosses/modifiers.ts. No Node / signal references: it operates on
## the boss `modifier_state` bag + the int board grid (`Array[Array[int]]`).
##
## WHY A PARALLEL FLAG STRUCTURE. React's grid cells are objects, so modifiers.ts tags
## individual cells (`tile.frozen = true`, `tile.rubble = true`, …) and `tileIsChainable`
## reads those per-cell flags. The Godot board grid is `Array[Array[int]]` (a plain Tile
## enum per cell, no room for overlay flags), so this port records the modifier's overlay
## as a PARALLEL structure on the boss `modifier_state` instead:
##   frozen_columns : Array[int]                  — frozen column indices (freeze_columns)
##   rubble         : Array[{row:int, col:int}]   — blocked rubble cells (rubble_blocks)
##   hidden         : Array[{row:int, col:int}]   — face-down cells (hide_resources)
##   heat           : Array[{row:int, col:int, age:int}] — heat cells (heat_tiles, spawned per turn)
##   boost          : Array[String]               — boosted tile KEYS (respawn_boost)
##   factor         : float                        — respawn-boost multiplier (respawn_boost)
## `cell_chainable(state, row, col)` mirrors React's `tileIsChainable`: false on a frozen
## column, a rubble cell, or a hidden cell (heat cells stay chainable — chaining is fine,
## the cost is the per-turn burn). `apply_to_fresh_grid` mirrors `applyModifierToFreshGrid`
## (Fisher-Yates pick of K cells, freeze N columns, …); `tick_heat` mirrors the heat branch
## of `tickModifier`; `clear` mirrors `clearModifier`.
##
## Registered as a `class_name` global (like BossConfig / Constants) so its statics are
## reachable WITHOUT a live autoload — headless tests run before the scene tree exists.
## Stateless: never instantiated.

# ── Modifier type ids (mirrors the React modifier.type strings) ─────────────────
const FREEZE_COLUMNS: String = "freeze_columns"
const RESPAWN_BOOST: String = "respawn_boost"
const HEAT_TILES: String = "heat_tiles"
const RUBBLE_BLOCKS: String = "rubble_blocks"
const HIDE_RESOURCES: String = "hide_resources"
const MIN_CHAIN: String = "min_chain"

## Apply a modifier to a FRESH boss board, returning the modifier_state bag. Mirrors
## applyModifierToFreshGrid (modifiers.ts:48-92). `modifier` is the BossConfig modifier
## Dictionary { "type": String, "params": Dictionary }. `rows`/`cols` are the board dims
## (6×6 today via Constants). `rng` is a seeded RandomNumberGenerator so spawns are
## deterministic in tests (React passes an rng() closure; we use randi_range / shuffle).
##
## Returned shapes by type (every other key absent):
##   freeze_columns → { "frozen_columns": Array[int] }       (N distinct columns)
##   rubble_blocks  → { "rubble":  Array[{row,col}] }         (K Fisher-Yates cells)
##   hide_resources → { "hidden":  Array[{row,col}] }         (K Fisher-Yates cells)
##   heat_tiles     → { "heat":    [] }                       (empty; spawns per turn)
##   respawn_boost  → { "boost": Array[String], "factor": float }
##   min_chain      → {}                                       (no board overlay — read off the boss minChain)
##   (unknown)      → {}
static func apply_to_fresh_grid(modifier: Dictionary, rows: int, cols: int, rng: RandomNumberGenerator) -> Dictionary:
	var type: String = String(modifier.get("type", ""))
	var params: Dictionary = modifier.get("params", {})

	if type == FREEZE_COLUMNS:
		var n: int = int(params.get("n", 0))
		var picked: Array[int] = []
		# Pick N DISTINCT columns (React: while (picked.size < n) picked.add(floor(rng()*cols))).
		# Guard the loop count by cols so a too-large n can't spin forever.
		var guard: int = 0
		while picked.size() < n and picked.size() < cols and guard < cols * 8:
			var c: int = rng.randi_range(0, cols - 1)
			if not picked.has(c):
				picked.append(c)
			guard += 1
		picked.sort()
		return {"frozen_columns": picked}

	if type == RUBBLE_BLOCKS or type == HIDE_RESOURCES:
		var want: int = int(params.get("count", params.get("hidden", 0)))
		var cells: Array = _pick_cells(rows, cols, want, rng)
		if type == RUBBLE_BLOCKS:
			return {"rubble": cells}
		return {"hidden": cells}

	if type == HEAT_TILES:
		# Empty list — heat tiles spawn one per turn (tick_heat / spawn_heat).
		return {"heat": []}

	if type == RESPAWN_BOOST:
		var boost: Array = []
		for k in params.get("boost", []):
			boost.append(String(k))
		return {"boost": boost, "factor": float(params.get("factor", 1.5))}

	# min_chain (board overlay is just the raised bar — read off the boss) + unknown types.
	return {}

## Fisher-Yates pick of `want` distinct {row,col} cells from a `rows`×`cols` grid, shuffled
## with `rng`. Mirrors the rubble/hidden branch of applyModifierToFreshGrid (modifiers.ts:74-82):
## build every cell, shuffle, slice the first `want` (clamped to the cell count).
static func _pick_cells(rows: int, cols: int, want: int, rng: RandomNumberGenerator) -> Array:
	var all_cells: Array = []
	for r in rows:
		for c in cols:
			all_cells.append({"row": r, "col": c})
	# Fisher-Yates shuffle (descending), drawing j in [0, i] from the seeded rng.
	for i in range(all_cells.size() - 1, 0, -1):
		var j: int = rng.randi_range(0, i)
		var tmp = all_cells[i]
		all_cells[i] = all_cells[j]
		all_cells[j] = tmp
	var n: int = clampi(want, 0, all_cells.size())
	return all_cells.slice(0, n)

## True when the cell (row,col) may be CHAINED right now under the modifier state. Mirrors
## tileIsChainable (modifiers.ts:98-100): false on a frozen column, a rubble cell, or a
## hidden cell; true otherwise (incl. heat cells — chaining a heat tile is allowed, the cost
## is the per-turn burn, not unchainability). An empty / null state is fully chainable.
static func cell_chainable(state: Dictionary, row: int, col: int) -> bool:
	if state == null or state.is_empty():
		return true
	for fc in state.get("frozen_columns", []):
		if int(fc) == col:
			return false
	if _cell_in_list(state.get("rubble", []), row, col):
		return false
	if _cell_in_list(state.get("hidden", []), row, col):
		return false
	return true

## True when COLUMN `col` is FROZEN (freeze_columns). Used by the board to draw the icy veil over a
## frozen-column tile (distinct from cell_chainable, which also blocks rubble/hidden — the FROZEN
## visual is column-specific; rubble renders as the RUBBLE tile, hidden as the face-down cover).
static func cell_frozen(state: Dictionary, col: int) -> bool:
	if state == null or state.is_empty():
		return false
	for fc in state.get("frozen_columns", []):
		if int(fc) == col:
			return true
	return false

## True when the cell is in the HIDDEN list (face-down). Used by the board to draw the
## face-down cover + by reveal_tiles (Miner's Hat) to find the cells to reveal.
static func cell_hidden(state: Dictionary, row: int, col: int) -> bool:
	if state == null or state.is_empty():
		return false
	return _cell_in_list(state.get("hidden", []), row, col)

## True when the cell is a RUBBLE block (rubble_blocks). Used by the board to draw the rocky block
## cover (distinct from hidden's face-down cover) over an unchainable rubble cell.
static func cell_rubble(state: Dictionary, row: int, col: int) -> bool:
	if state == null or state.is_empty():
		return false
	return _cell_in_list(state.get("rubble", []), row, col)

## True when the cell carries a HEAT marker (heat_tiles). Used by the board to draw the
## heat overlay.
static func cell_heat(state: Dictionary, row: int, col: int) -> bool:
	if state == null or state.is_empty():
		return false
	for h in state.get("heat", []):
		if int((h as Dictionary).get("row", -1)) == row and int((h as Dictionary).get("col", -1)) == col:
			return true
	return false

## True when (row,col) appears in a list of {row,col} dicts.
static func _cell_in_list(cells, row: int, col: int) -> bool:
	if cells == null:
		return false
	for cell in cells:
		var d: Dictionary = cell
		if int(d.get("row", -1)) == row and int(d.get("col", -1)) == col:
			return true
	return false

## REVEAL every hidden cell — clears the hidden list on the modifier_state and returns the
## list of cells that WERE hidden (so the caller can rebuild those board tiles). Mirrors the
## intent of React's hidden-tile reveal (a chain including a hidden tile reveals it; Miner's
## Hat reveals them all). Pass a single cell to reveal_cell to reveal just one (chain reveal).
static func reveal_all(state: Dictionary) -> Array:
	if state == null or not state.has("hidden"):
		return []
	var was: Array = (state["hidden"] as Array).duplicate(true)
	state["hidden"] = []
	return was

## Reveal a SINGLE hidden cell (row,col) if it is hidden — removes it from the hidden list and
## returns true. Used when a chain includes a hidden cell (React: a hidden tile reveals when
## chained). A no-op (returns false) when the cell isn't hidden.
static func reveal_cell(state: Dictionary, row: int, col: int) -> bool:
	if state == null or not state.has("hidden"):
		return false
	var hidden: Array = state["hidden"]
	for i in hidden.size():
		var d: Dictionary = hidden[i]
		if int(d.get("row", -1)) == row and int(d.get("col", -1)) == col:
			hidden.remove_at(i)
			return true
	return false

## Spawn ONE fresh heat tile per turn for a heat_tiles boss — pick a random non-heat cell and
## append it at age 0. Mirrors the React heat_tiles "spawnPerTurn: 1" intent (modifiers.ts notes
## heat starts empty and spawns per turn). Returns the spawned {row,col} or {} when the board is
## fully heated. `spawn_per_turn` cells are spawned (default 1, from the modifier params).
static func spawn_heat(state: Dictionary, rows: int, cols: int, spawn_per_turn: int, rng: RandomNumberGenerator) -> Array:
	if state == null:
		return []
	if not state.has("heat"):
		state["heat"] = []
	var heat: Array = state["heat"]
	var spawned: Array = []
	for _i in maxi(0, spawn_per_turn):
		# Collect cells not already heated.
		var free_cells: Array = []
		for r in rows:
			for c in cols:
				if not cell_heat(state, r, c):
					free_cells.append({"row": r, "col": c})
		if free_cells.is_empty():
			break
		var pick: Dictionary = free_cells[rng.randi_range(0, free_cells.size() - 1)]
		var entry := {"row": int(pick["row"]), "col": int(pick["col"]), "age": 0}
		heat.append(entry)
		spawned.append({"row": entry["row"], "col": entry["col"]})
	return spawned

## TICK the heat layer one turn: age every heat cell, and BURN one random inventory item for
## each cell whose age exceeds `burn_after`. Mirrors the heat branch of tickModifier
## (modifiers.ts:109-145): map age++, keep survivors (age <= burnAfter), and for each that
## crosses the threshold remove one unit of a random non-empty inventory key.
##
## `inventory` is mutated in place (the live GameState.inventory Dict). `rng` chooses which key
## to burn (React uses Math.random; we use the seeded rng for determinism). Returns the number
## of items burned (for the caller's status surface). Note React COMPARES `h.age > burnAfter`
## AFTER the age increment, so a cell spawned this turn (age 0 → 1) with burnAfter 2 survives two
## ticks and burns on the third — faithfully ported below.
static func tick_heat(state: Dictionary, burn_after: int, inventory: Dictionary, rng: RandomNumberGenerator) -> int:
	if state == null or not state.has("heat"):
		return 0
	var heat: Array = state["heat"]
	var surviving: Array = []
	var burned: int = 0
	for h in heat:
		var aged := {"row": int((h as Dictionary).get("row", 0)), "col": int((h as Dictionary).get("col", 0)), "age": int((h as Dictionary).get("age", 0)) + 1}
		if aged["age"] > burn_after:
			# Burn one unit of a random non-empty inventory key.
			var keys: Array = []
			for k in inventory.keys():
				if int(inventory[k]) > 0:
					keys.append(k)
			if not keys.is_empty():
				var k = keys[rng.randi_range(0, keys.size() - 1)]
				var remaining: int = maxi(0, int(inventory[k]) - 1)
				if remaining == 0:
					inventory.erase(k)
				else:
					inventory[k] = remaining
				burned += 1
			# The burned heat cell is consumed (NOT carried) — matches React (it is not pushed to surviving).
		else:
			surviving.append(aged)
	state["heat"] = surviving
	return burned

## The respawn-boost spawn-bias map { tile_key:String -> factor:float } for a respawn_boost boss,
## or {} for any other modifier. Mirrors spawnBiasFromModifier (boss/slice.ts:48-57): each boosted
## key maps to the factor. The board's refill weighting reads this to over-spawn the boosted tiles.
static func spawn_bias(state: Dictionary) -> Dictionary:
	if state == null:
		return {}
	var boost: Array = state.get("boost", [])
	if boost.is_empty():
		return {}
	var factor: float = float(state.get("factor", 1.5))
	var out: Dictionary = {}
	for k in boost:
		out[String(k)] = factor
	return out

## Strip every overlay from the modifier_state, returning the cleared (empty) bag. Mirrors
## clearModifier (modifiers.ts:151-162) — called once on boss resolution so no frozen / rubble /
## hidden / heat overlay can linger on the board after the fight.
static func clear(_state: Dictionary) -> Dictionary:
	return {}
