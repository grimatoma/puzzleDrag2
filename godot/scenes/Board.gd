class_name Board
extends Node2D
## The 6x6 drag-chain board: rendering, touch/mouse input, and the
## collect → collapse → refill pipeline. Pure rules live in BoardLogic; this
## class owns the on-screen tile nodes and animates them.
##
## `grid` (ints) is the logic mirror BoardLogic reads. `tiles` (Tile nodes) is
## the authoritative visual layer; after every resolve, `grid` is re-synced
## from `tiles` so drag validation always sees what the player sees.

signal chain_changed(length: int)                               ## live, while dragging
## Fired once a legal chain is collected. The Board reports only WHAT was
## chained (tile type + length); resource/economy accounting lives in GameState.
signal chain_resolved(tile_type: int, length: int)
## M8c — fired when a TAP-target tool is armed and the player taps a board cell while
## the Board is in targeting mode (set_targeting(true)). The Board itself does NOT use
## the tool — it only reports WHICH cell was tapped; Main owns the GameState ref and
## applies the tool (mirrors how chain_resolved keeps the Board decoupled from economy).
signal cell_tapped(cell: Vector2i)
## T25 (harbor in-chain pearl capture) — fired when clear_pearl_on_fish_chain is set and a
## resolved chain CONTAINS the FISH_PEARL tile. Carries the chained cells as Array[{row,col,tile}]
## (the same shape as chain_cells_resolved — tile value BEFORE the chain cleared them) so Main
## can pass the tile keys to GameState.try_capture_pearl (the React rule: chain contains pearl +
## ≥ REQUIRED_FISH_IN_CHAIN other fish tiles). Emitted BEFORE chain_resolved. The Board stays
## decoupled from GameState — it just reports WHAT was chained; Main owns the economy.
signal pearl_chain_resolved(cells: Array)
## T7/T9/T10 (farm hazards) — fired on EVERY resolved chain, carrying the chained CELLS as an
## Array of { row:int, col:int, tile:int } (the tile value BEFORE the chain cleared it). Main uses
## this to detect a RAT chain (clear → coins, no credit), a FIRE chain (extinguish → coins), and a
## deadly_pests chain (Cypress/Beet/Phoenix → cull adjacent rats). Emitted BEFORE chain_resolved so
## Main can decide whether the chain is a hazard-clear (RAT) and SUPPRESS the normal credit. The
## cells are the ORIGINAL drag path (not the rat/rubble-swept removal set), so adjacency is checked
## against exactly what the player chained — mirrors pearl_chain_resolved's contract.
signal chain_cells_resolved(cells: Array)
## A REAL drag attempt (2+ cells) released BELOW the minimum chain — nothing resolves.
## Emitted so the HUD can give "not enough" feedback (buzz + nudge); single taps
## (length 1, the tool-target path) never fire it.
signal chain_rejected(length: int)

# Chain-resolve animation timing. The pipeline CASCADES (pop → settle → refill) the
# way the React/Phaser original does, rather than firing every tween at t=0: the chained
# tiles pop out in a staggered wave, then after FALL_DELAY the survivors collapse and
# fresh tiles fall in. Without the stagger + delay the whole move resolved in one
# ~0.13s blur and read as "no animation" (the reported regression).
const POP_TIME := 0.18      ## per-tile pop-out (scale→0 + spin); ~React 180ms
const POP_STAGGER := 0.025  ## extra delay per successive chained tile → a visible wave
const FALL_DELAY := 0.16    ## collapse/refill hold-off so the pop reads before tiles fall
const FALL_TIME := 0.24     ## collapse slide + refill pop-in duration

var grid: Array = []
var tiles: Array = []                  ## tiles[row][col] -> Tile node or null
var rng := RandomNumberGenerator.new()

var tile_size: float = 96.0
var board_origin := Vector2.ZERO       ## top-left of cell (0,0) in local space

## Active refill pool (Array[int] of Constants.Tile). Defaults to staples only, so
## a fresh game starts staples-only; Main swaps in GameState.active_tile_pool()
## (staples + each placed spawner's tiles) whenever buildings change.
var tile_pool: Array = Constants.STAPLE_POOL.duplicate()

## Minimum chain length the board demands to RESOLVE a drag. Defaults to the base
## Constants.MIN_CHAIN; an active capstone boss raises it via set_min_chain (the
## boss makes you chain harder — see GameState.boss_min_chain / BossConfig). Only
## the resolve checks (_finish_drag / try_resolve) honour it; the dead-board
## reshuffle checks stay at the base min so a raised bar never reads a normal board
## as "dead".
var min_chain: int = Constants.MIN_CHAIN

## M3h (Town 3 rats): when true, a resolved GRASS chain ALSO clears every RAT tile
## 8-adjacent to the chain (Master Ratcatcher — "grass chains collect rats too").
## Main sets this from GameState.has_master_ratcatcher() after load and on every
## board re-pool. The cleared rats are a side effect: they are NOT counted in the
## chain length nor credited (RAT produces nothing).
var clear_rats_on_grass: bool = false

## M3i (Town 2 mine rubble): when true, a resolved STONE chain ALSO clears every
## RUBBLE tile 8-adjacent to the chain — you mine THROUGH the cave-in clutter. Main
## sets this from GameState.is_in_mine() (true exactly while on an expedition), so it
## needs no building (unlike the Master Ratcatcher's grass sweep — mining-through is
## just how mining works). The cleared rubble is a side effect: NOT counted in the
## chain length nor credited (RUBBLE produces nothing).
var clear_rubble_on_stone: bool = false

## T11 (Town 2 mine hazards): when true (exactly while on a mine expedition — Main sets it from
## GameState.is_in_mine()), the drag path SKIPS hazard-BLOCKED cells (RUBBLE / LAVA) so a chain can
## never be drawn through them — mirrors React's tileBlockedByHazard guard in the drag path
## (src/features/mine/hazards.ts:157). GAS / MYSTERIOUS_ORE are CHAINABLE (chaining is their
## counter), so they are NOT blocked. Off the mine this stays false and the drag path is unchanged.
var block_mine_hazards: bool = false

## A1b (upgradeMap-driven upgrade tiles): an optional provider Main installs so a resolved
## FARM chain spawns UPGRADE TILES of the zone's next tier during the SAME collapse/refill — the
## React core loop (src/GameScene.ts nextUpgradeTile + the pendingUpgrades queue). Called inside
## _resolve as `upgrade_provider.call(tile_type, length) -> {count:int, tile:int}` (the shape
## GameState.upgrade_spawn returns): the Board injects `count` upgrade tiles of `tile` among the
## freshly-spawned TOP refill cells (instead of pool draws). Keeping it a Callable — NOT a
## GameState ref — preserves the Board/economy decoupling (the Board never reads game state; it
## only asks an opaque function WHAT to spawn), exactly as it holds Main-set flags above. Unset
## (the default null Callable) or returning count 0 means a plain pool refill — so the mine/harbor
## (no zone upgradeMap) and any pre-A1b caller behave exactly as before.
var upgrade_provider: Callable = Callable()

## A1b — upgrade tiles queued for the CURRENT _resolve's refill: an Array of int tile types, one
## entry per upgrade tile to place among the new top cells. Filled at the top of _resolve from
## upgrade_provider and drained as the refill loop spawns top-row cells; always empty between
## moves. A transient (never saved, never read by drag validation).
var _pending_upgrades: Array = []

## T25 (fish pearl in-chain capture — replaces adjacency rule): when true (exactly while
## on a harbor expedition), FISH_PEARL is JOINABLE into a fish-category chain just like
## MYSTERIOUS_ORE is joinable into a DIRT chain (T23). `_cell_can_extend_chain` treats a
## FISH_PEARL cell as compatible with a fish-anchor chain and vice-versa, so the player can
## drag through the pearl + ≥ REQUIRED_FISH_IN_CHAIN fish tiles in ONE chain. On resolve,
## the chain key reported to Main via chain_resolved is the FISH anchor type (not FISH_PEARL),
## and _chain_cells carries all chained tiles including the FISH_PEARL cell, so
## Main._on_chain_resolved can detect the pearl and call GameState.try_capture_pearl.
## Set by Main from GameState.is_in_harbor() after load and on every board re-pool. Off the
## harbor this stays false and the drag path is byte-identical to any other biome.
var clear_pearl_on_fish_chain: bool = false

## T24 (seasonal boss board modifiers): the live boss modifier_state overlay (the
## BossModifierLogic bag — frozen_columns / rubble / hidden / heat / boost+factor), or {} when no
## boss is active. Main pushes it via set_boss_modifier_state() on boss start, every boss turn tick,
## and on resolve (cleared to {}). The Board reads it through the pure BossModifierLogic statics to:
##   • GATE drags — frozen-column / rubble / hidden cells are unchainable (cell_chainable),
##   • RENDER overlays — frozen columns dimmed, hidden cells face-down, heat cells glowing (drawn
##     by Tile via the per-cell flags pushed in _build_tiles / _refresh_boss_overlays),
##   • REVEAL a hidden cell when it's chained (Main calls reveal on the chained cells).
## Empty {} (no boss) leaves every cell chainable + un-overlaid, so the board is byte-identical
## off a boss — mirrors how block_mine_hazards / clear_rubble_on_stone gate only when set.
var boss_modifier_state: Dictionary = {}

var _dragging := false
var _path: Array[Vector2i] = []        ## dragged cells

## Task C — chain-input GATE. When false the board is INERT: a left-press never starts a drag
## (chains can't be drawn), mirroring React's "town is home" model where the board is only
## playable while a bounded farm RUN is active. Main flips this on (set_active(true)) when a run
## starts / a save restored mid-run is loaded, and off (set_active(false)) on launch with no run,
## on return to town, and on the deep-link board-gate redirect. Defaults to true so a board built
## before Main seeds it (and every existing direct-resolve test path) behaves exactly as before —
## the gate only affects the INPUT path (_unhandled_input), never try_resolve/_resolve.
var active: bool = true

## M8c — TAP-tool targeting mode. While true, a left-button PRESS reports the tapped
## cell via cell_tapped and does NOT start a drag (chains are suppressed); motion +
## release do nothing. Main flips this on (set_targeting(true)) when it arms a
## tap-target tool and off again once the tap fires (or is cancelled). When false the
## input path behaves exactly as before — drags + chains are completely unaffected.
var _targeting := false

## M4a — the orange/gold chain-path overlay. A sibling of the tile nodes (shares
## Board-local space) but drawn ON TOP via a high z_index. Created once in _ready
## and DELIBERATELY preserved across _build_tiles rebuilds (which free only Tiles),
## so its reference survives every collapse/refill.
var _chain_overlay: ChainOverlay

## T8 — live wolf-marker overlay nodes (one per wolf), keyed by cell Vector2i. Wolves are
## OVERLAY entities, NOT grid cells (they don't occupy/collapse a board cell — they roam ON TOP
## eating adjacent birds), so they are drawn as their own Node2D markers over the cell centre,
## freed + rebuilt wholesale whenever the wolf set changes (refresh_wolves). Like the chain
## overlay these are siblings of the Tile nodes and survive _build_tiles (which frees only Tiles).
var _wolf_markers: Array = []   ## Array of _WolfMarker Node2D

## T11 — live mole-marker overlay node (the Giant Mole), or null when no mole. Like the wolf the
## mole is an OVERLAY entity (NOT a grid cell — it roams ON TOP consuming adjacent tiles + hops), so
## it rides as its own Node2D over the cell centre, freed + rebuilt whenever the mole moves
## (refresh_mole). A sibling of the Tile nodes; survives _build_tiles (which frees only Tiles).
var _mole_marker: Node2D = null

## M4a — padding (px) of the field-tinted card drawn behind the tiles by _draw().
const FRAME_PAD := 10.0

## A2 — the current farm season index (0=Spring … 3=Winter), driving the per-season field
## tint of the board card's frame border in _draw(). Main pushes it via set_season() on load
## and whenever a resolved farm chain turns the season. Defaults to Spring so a board built
## before Main seeds it still reads as a calm green field (Spring's field colour).
var _season_idx: int = 0

## Resolve "juice" (the React feel the port lacked): a screen shake whose magnitude scales
## with the chain length, an expanding flash ring + a collect spark burst at the chain head,
## and an upgrade-burst flash when the chain spawns an upgrade tile. All are PURELY visual,
## added as Board children (so they shake with the board), self-freeing, and skipped under
## headless (no renderer) so the logic suites stay byte-identical.
var _last_chain_center: Vector2 = Vector2.ZERO   ## chain head (for Main's floating gain text)
var _shake_tween: Tween = null
var _shake_base: Vector2 = Vector2.ZERO
## A SEPARATE RNG for cosmetic FX (shake jitter) so the gameplay `rng` — which BoardLogic.refill
## consumes and the tests seed — is never advanced by visual effects. Keeps refills decoupled
## from whether/how long the board shook.
var _fx_rng := RandomNumberGenerator.new()

## M8c armed-tool feedback: while a tap-target tool is armed (set_targeting(true)) the board
## frame pulses a hot red border (React's hwv-armed-pulse). Driven by _process — enabled only
## while targeting so an idle board never processes.
var _armed_phase: float = 0.0

func _ready() -> void:
	rng.randomize()
	_fx_rng.randomize()
	set_process(false)                  # only processes while a tap-tool is armed (armed pulse)
	_chain_overlay = ChainOverlay.new()
	_chain_overlay.z_index = 100        # above every tile node
	add_child(_chain_overlay)
	setup_new_board()

## Pulse the armed-tool red frame while targeting (set_targeting toggles processing).
func _process(delta: float) -> void:
	if _targeting:
		_armed_phase += delta
		queue_redraw()

# ── parchment-game framing (M4a) ─────────────────────────────────────────────

## Draw a rounded, field-tinted card with a soft drop shadow BEHIND the tiles.
## A CanvasItem renders itself before its children, so this frame sits under every
## Tile node automatically. Re-run on layout/board changes via queue_redraw().
func _draw() -> void:
	var sb := StyleBoxFlat.new()
	# Light parchment field with a thin moss-green frame — matches the React board,
	# which floats the pastel tile cards on a cream board (the gaps between tiles read
	# CREAM, not green) inside a soft green edge. The old solid-green fill made the
	# whole board read dark/heavy and muddied the tiles' per-type pastel backgrounds.
	# A2 — gently tint the card per the CURRENT season (src/ui/puzzleBoard.tsx field gradient):
	# the FILL stays a season-blended parchment (only ~22% toward the season's field tone so the
	# tiles' own pastel backgrounds still read over it) and the BORDER takes the season's darker
	# field-bottom tone. Spring reads close to the old calm green; Winter cools to a slate edge.
	var field: Dictionary = _season_field()
	var field_top: Color = field["top"]
	var field_bot: Color = field["bot"]
	sb.bg_color = Palette.PARCHMENT.lerp(field_top, 0.22)
	sb.corner_radius_top_left = 16
	sb.corner_radius_top_right = 16
	sb.corner_radius_bottom_left = 16
	sb.corner_radius_bottom_right = 16
	sb.border_width_left = 3
	sb.border_width_top = 3
	sb.border_width_right = 3
	sb.border_width_bottom = 3
	sb.border_color = field_bot
	sb.shadow_size = 10
	sb.shadow_color = Color(0, 0, 0, 0.18)
	sb.shadow_offset = Vector2(0, 4)
	var rect := Rect2(
		board_origin - Vector2(FRAME_PAD, FRAME_PAD),
		board_pixel_size() + Vector2(2.0 * FRAME_PAD, 2.0 * FRAME_PAD))
	draw_style_box(sb, rect)

	# M8c — while a tap-target tool is armed, pulse a hot red border around the field so the
	# board reads as "hot / waiting for your tap" (the React armed-pulse on the board frame).
	if _targeting:
		var t: float = 0.5 + 0.5 * sin(_armed_phase * 5.2)
		var red := Color(1.0, 0.22, 0.22, lerpf(0.45, 0.95, t))
		var w: float = maxf(4.0, tile_size * 0.06)
		draw_rect(rect, red, false, w)

## A2 — set the current farm season (0=Spring … 3=Winter) and redraw so the board card's
## field tint follows the season. Main calls this on load and whenever a resolved farm chain
## turns the season. Clamped to a valid index; a no-op redraw when unchanged is fine (cheap).
func set_season(idx: int) -> void:
	_season_idx = clampi(idx, 0, Constants.SEASON_FIELD_COLORS.size() - 1)
	queue_redraw()

## The {top, bot} field gradient colours for the current season (Constants.SEASON_FIELD_COLORS,
## ported from src/ui/puzzleBoard.tsx). Used by _draw to tint the board card per season.
func _season_field() -> Dictionary:
	return Constants.SEASON_FIELD_COLORS[_season_idx]

# ── board lifecycle ────────────────────────────────────────────────────────

## Replace the active refill pool (a copy is stored). Empty/invalid pools fall
## back to the staple pool so the board can always refill.
func set_tile_pool(pool: Array) -> void:
	if pool == null or pool.is_empty():
		tile_pool = Constants.STAPLE_POOL.duplicate()
	else:
		tile_pool = pool.duplicate()

## Set the minimum chain length required to resolve a drag (clamped to a sane floor
## of 2 — a chain of 1 is just a tap). Main calls this with GameState.boss_min_chain()
## when the boss state changes, so the raised bar applies immediately and survives a
## save restored mid-fight.
func set_min_chain(n: int) -> void:
	min_chain = maxi(2, n)

## T24 — adopt the live boss modifier_state overlay (a copy is stored) and refresh the per-tile
## overlay visuals. Main calls this on boss start, every boss-turn tick (heat ages/spawns), on a
## hidden-cell reveal, and on resolve (passing {} to clear). An empty {} leaves every cell
## chainable + un-overlaid (the no-boss baseline). The chain GATE reads boss_modifier_state directly
## in _begin_drag/_extend_drag, so it follows along the moment this is set.
func set_boss_modifier_state(state: Dictionary) -> void:
	boss_modifier_state = state.duplicate(true) if state != null else {}
	_refresh_boss_overlays()

## T24 — push the frozen / hidden / heat overlay flags from boss_modifier_state onto every live Tile
## node. Called from set_boss_modifier_state + after every _build_tiles (so a board rebuild — biome
## flip, hidden-reveal rebuild, etc. — re-applies the overlay). Guarded so it's a no-op before tiles
## are built. With an empty modifier_state every tile is cleared (all flags false).
func _refresh_boss_overlays() -> void:
	if tiles.is_empty():
		return
	for r in Constants.ROWS:
		for c in Constants.COLS:
			var t: Tile = tiles[r][c]
			if t == null:
				continue
			t.set_boss_overlay(
				BossModifierLogic.cell_frozen(boss_modifier_state, c),
				BossModifierLogic.cell_hidden(boss_modifier_state, r, c),
				BossModifierLogic.cell_heat(boss_modifier_state, r, c),
				BossModifierLogic.cell_rubble(boss_modifier_state, r, c))

## A3 — the Constants.Tile type of the CURRENTLY-DRAGGED chain (its anchor cell), or
## Constants.EMPTY when no drag is in flight. The chain is single-type (every extend
## must match _path[0]'s value), so the anchor's value identifies the whole chain. Main
## reads this on `chain_changed` to colour the chain-progress bar by the live chain's
## STAGE (Constants.chain_stage_index against the chained tile's threshold). Pure read —
## never mutates the board.
func current_chain_tile() -> int:
	if _path.is_empty():
		return Constants.EMPTY
	var anchor: Vector2i = _path[0]
	if not BoardLogic.in_bounds(anchor):
		return Constants.EMPTY
	return int(grid[anchor.y][anchor.x])

func setup_new_board() -> void:
	grid = BoardLogic.make_empty_grid()
	BoardLogic.refill(grid, rng, tile_pool)
	_ensure_live_board()
	_build_tiles()

## Reshuffle until the board has at least one legal chain (dead boards are rare
## with the weighted pool, but this guarantees a playable start).
func _ensure_live_board() -> void:
	var guard := 0
	while not BoardLogic.has_valid_chain(grid) and guard < 64:
		grid = BoardLogic.make_empty_grid()
		BoardLogic.refill(grid, rng, tile_pool)
		guard += 1

func _build_tiles() -> void:
	# Free ONLY Tile nodes — the chain overlay (a sibling Node2D) must survive the
	# collapse/refill churn so its reference stays stable across moves.
	for child in get_children():
		if child is Tile:
			child.queue_free()
	tiles = []
	for r in Constants.ROWS:
		var row: Array = []
		for c in Constants.COLS:
			var t := _make_tile(grid[r][c])
			t.position = _cell_center(c, r)
			row.append(t)
		tiles.append(row)
	# T24 — re-apply any live boss-modifier overlay onto the freshly-built tiles (a board rebuild
	# — biome flip, hidden-reveal rebuild — would otherwise drop the frozen/hidden/heat/rubble
	# visuals). A no-op with an empty modifier_state (no boss).
	_refresh_boss_overlays()
	queue_redraw()   # field card depends on board_origin / size

func _make_tile(t: int) -> Tile:
	var node := Tile.new()
	node.setup(t, tile_size)
	add_child(node)
	return node

## M3h — the Ratcatcher "shoo": clear EVERY rat on the board as a FREE move (no
## chain, no resource credit). Scans `grid` for RAT cells, blanks them, then runs
## the pure BoardLogic collapse+refill and rebuilds the visual tile layer (and
## reshuffles to a live board, mirroring setup_new_board's guard, so a refill that
## happens to land dead can't strand the player). Returns the rat count cleared.
## GameState.use_ratcatcher_charge spends the charge; this just clears the board.
func clear_all_rats() -> int:
	var cleared := 0
	for r in Constants.ROWS:
		for c in Constants.COLS:
			if grid[r][c] == Constants.Tile.RAT:
				grid[r][c] = Constants.EMPTY
				cleared += 1
	if cleared > 0:
		BoardLogic.collapse(grid)
		BoardLogic.refill(grid, rng, tile_pool)
		_ensure_live_board()
		_build_tiles()
	return cleared

## M8c — adopt `new_grid` as the live board after a TOOL transformed it. This is how a
## tool's resulting grid (GameState.use_tool_on_grid returns it; the pure ToolEffects
## already cleared/transformed the cells) lands on-screen. Mirrors clear_all_rats's
## tail: take the grid, run the pure BoardLogic collapse (drop survivors down) +
## refill (spawn fresh tiles up top from the active pool), guard against a dead board,
## then rebuild the visual tile layer. The Board stays decoupled from GameState — Main
## already credited the collected tiles; this only updates what's on the board.
func apply_external_grid(new_grid: Array) -> void:
	if new_grid == null or new_grid.is_empty():
		return
	grid = new_grid
	BoardLogic.collapse(grid)
	BoardLogic.refill(grid, rng, tile_pool)
	_ensure_live_board()
	_build_tiles()

## T7/T9 — adopt a grid AFTER a farm-hazard tick mutated it, then RE-STAMP the positional hazard
## tiles so rats/fire stay PINNED at their recorded cells (matching React's fillBoard fire-overlay:
## the hazard positions are authoritative state, not subject to gravity). `new_grid` is the ticked
## grid (eaten/burned cells already EMPTY; spawned RAT/FIRE already written). `rat_cells` /
## `fire_cells` are Arrays of {row,col} (GameState.active_rats() / active_fire_cells()). Flow:
##   1. blank the recorded hazard cells (so collapse/refill treats them as holes to fill),
##   2. collapse + refill the holes from the pool (the eaten/burned + hazard cells all refill),
##   3. re-stamp RAT / FIRE at their recorded cells (overwrite whatever filled there),
##   4. guard a live board, rebuild the visual tile layer, then refresh the wolf overlays.
## Keeps `grid` (and the on-screen tiles) in lockstep with GameState.hazards every tick.
func apply_hazard_state(new_grid: Array, rat_cells: Array, fire_cells: Array, wolf_cells: Array) -> void:
	if new_grid == null or new_grid.is_empty():
		return
	grid = new_grid
	# 1. Blank every recorded hazard cell so collapse/refill fills around them, then we re-stamp.
	for rc in rat_cells:
		var rr: int = int(rc.get("row", -1)); var rcl: int = int(rc.get("col", -1))
		if BoardLogic.in_bounds(Vector2i(rcl, rr)):
			grid[rr][rcl] = Constants.EMPTY
	for fc in fire_cells:
		var fr: int = int(fc.get("row", -1)); var fcl: int = int(fc.get("col", -1))
		if BoardLogic.in_bounds(Vector2i(fcl, fr)):
			grid[fr][fcl] = Constants.EMPTY
	# 2. Collapse survivors down + refill the holes from the active pool.
	BoardLogic.collapse(grid)
	BoardLogic.refill(grid, rng, tile_pool)
	# 3. Re-stamp the positional hazard tiles at their recorded cells (authoritative).
	for rc in rat_cells:
		var rr2: int = int(rc.get("row", -1)); var rcl2: int = int(rc.get("col", -1))
		if BoardLogic.in_bounds(Vector2i(rcl2, rr2)):
			grid[rr2][rcl2] = Constants.Tile.RAT
	for fc in fire_cells:
		var fr2: int = int(fc.get("row", -1)); var fcl2: int = int(fc.get("col", -1))
		if BoardLogic.in_bounds(Vector2i(fcl2, fr2)):
			grid[fr2][fcl2] = Constants.Tile.FIRE
	# 4. Keep the board playable, rebuild tiles, refresh wolf overlays.
	_ensure_live_board_preserving_hazards(rat_cells, fire_cells)
	_build_tiles()
	refresh_wolves(wolf_cells)

## A live-board guard that PRESERVES recorded hazard cells across a reshuffle. _ensure_live_board
## rebuilds the WHOLE grid (losing the pinned RAT/FIRE), so when hazards are present we re-stamp
## them after any reshuffle. Rare (the pool almost always lands a live board), but keeps the
## hazard tiles from vanishing on the unlucky reshuffle.
func _ensure_live_board_preserving_hazards(rat_cells: Array, fire_cells: Array) -> void:
	var guard := 0
	while not BoardLogic.has_valid_chain(grid) and guard < 64:
		grid = BoardLogic.make_empty_grid()
		BoardLogic.refill(grid, rng, tile_pool)
		for rc in rat_cells:
			var rr: int = int(rc.get("row", -1)); var rcl: int = int(rc.get("col", -1))
			if BoardLogic.in_bounds(Vector2i(rcl, rr)):
				grid[rr][rcl] = Constants.Tile.RAT
		for fc in fire_cells:
			var fr: int = int(fc.get("row", -1)); var fcl: int = int(fc.get("col", -1))
			if BoardLogic.in_bounds(Vector2i(fcl, fr)):
				grid[fr][fcl] = Constants.Tile.FIRE
		guard += 1

## T8 — rebuild the wolf-marker overlay from `wolf_cells` (Array of {row,col,scared}). Frees the
## existing markers and creates one Node2D marker per wolf at the cell centre. A scared wolf reads
## dimmer (it won't eat this turn). Called on every hazard tick + on load/biome flip. An empty
## list clears all markers. Headless-safe: markers are pure Node2D _draw (no textures).
func refresh_wolves(wolf_cells: Array) -> void:
	for m in _wolf_markers:
		if is_instance_valid(m):
			m.queue_free()
	_wolf_markers = []
	for w in wolf_cells:
		var wr: int = int(w.get("row", -1)); var wc: int = int(w.get("col", -1))
		if not BoardLogic.in_bounds(Vector2i(wc, wr)):
			continue
		var marker := _WolfMarker.new()
		marker.scared = bool(w.get("scared", false))
		marker.radius = tile_size * 0.32
		marker.position = _cell_center(wc, wr)
		marker.z_index = 90   # above tiles, below the chain overlay (100)
		add_child(marker)
		_wolf_markers.append(marker)

## T11 — adopt a grid AFTER a mine-hazard tick mutated it, then RE-STAMP the positional mine-hazard
## tiles so the buried cave-in row (RUBBLE), the lava cells (LAVA), and the gas vent (GAS) stay
## PINNED at their recorded cells across the collapse/refill (matching apply_hazard_state's farm
## pattern — the hazard positions are authoritative state, not subject to gravity). `new_grid` is the
## ticked grid (eaten/consumed cells already EMPTY; spread LAVA already written). The cave-in /
## gas_vent / lava args come from GameState (active_cave_in / active_gas_vent / active_lava_cells);
## `mole` is GameState.active_mole() ({} when none) — an OVERLAY, refreshed via refresh_mole. Flow:
##   1. blank the recorded pinned cells (so collapse/refill treats them as holes),
##   2. collapse + refill the holes from the pool,
##   3. re-stamp RUBBLE (cave-in row) / LAVA / GAS at their recorded cells,
##   4. guard a live board (preserving the pins), rebuild tiles, refresh the mole overlay.
## Keeps `grid` (and the on-screen tiles) in lockstep with GameState.mine_hazards every tick.
func apply_mine_hazard_state(new_grid: Array, cave_in: Dictionary, gas_vent: Dictionary, lava_cells: Array, mole: Dictionary) -> void:
	if new_grid == null or new_grid.is_empty():
		return
	grid = new_grid
	# 1. Blank every recorded pinned hazard cell so collapse/refill fills around them.
	_blank_mine_hazard_cells(cave_in, gas_vent, lava_cells)
	# 2. Collapse survivors + refill the holes from the active pool.
	BoardLogic.collapse(grid)
	BoardLogic.refill(grid, rng, tile_pool)
	# 3. Re-stamp the positional hazard tiles (authoritative).
	_stamp_mine_hazard_cells(cave_in, gas_vent, lava_cells)
	# 4. Keep the board playable (preserving the pins), rebuild tiles, refresh the mole overlay.
	_ensure_live_board_preserving_mine(cave_in, gas_vent, lava_cells)
	_build_tiles()
	refresh_mole(mole)

## Blank every recorded mine-hazard cell to EMPTY (cave-in row of RUBBLE, gas-vent GAS cell, every
## LAVA cell). Used before collapse/refill so the holes get filled, then re-stamped. Shared by
## apply_mine_hazard_state + the live-board guard.
func _blank_mine_hazard_cells(cave_in: Dictionary, gas_vent: Dictionary, lava_cells: Array) -> void:
	if not cave_in.is_empty():
		var cr: int = int(cave_in.get("row", -1))
		if cr >= 0 and cr < Constants.ROWS:
			for c in Constants.COLS:
				grid[cr][c] = Constants.EMPTY
	if not gas_vent.is_empty():
		var gr: int = int(gas_vent.get("row", -1)); var gc: int = int(gas_vent.get("col", -1))
		if BoardLogic.in_bounds(Vector2i(gc, gr)):
			grid[gr][gc] = Constants.EMPTY
	for lc in lava_cells:
		var lr: int = int(lc.get("row", -1)); var lcl: int = int(lc.get("col", -1))
		if BoardLogic.in_bounds(Vector2i(lcl, lr)):
			grid[lr][lcl] = Constants.EMPTY

## Re-stamp the positional mine-hazard tiles onto `grid` at their recorded cells (cave-in row →
## RUBBLE, gas vent → GAS, each lava cell → LAVA). The mole is an OVERLAY (no grid stamp). Shared by
## apply_mine_hazard_state + the live-board guard.
func _stamp_mine_hazard_cells(cave_in: Dictionary, gas_vent: Dictionary, lava_cells: Array) -> void:
	if not cave_in.is_empty():
		var cr: int = int(cave_in.get("row", -1))
		if cr >= 0 and cr < Constants.ROWS:
			for c in Constants.COLS:
				grid[cr][c] = Constants.Tile.RUBBLE
	if not gas_vent.is_empty():
		var gr: int = int(gas_vent.get("row", -1)); var gc: int = int(gas_vent.get("col", -1))
		if BoardLogic.in_bounds(Vector2i(gc, gr)):
			grid[gr][gc] = Constants.Tile.GAS
	for lc in lava_cells:
		var lr: int = int(lc.get("row", -1)); var lcl: int = int(lc.get("col", -1))
		if BoardLogic.in_bounds(Vector2i(lcl, lr)):
			grid[lr][lcl] = Constants.Tile.LAVA

## A live-board guard that PRESERVES the recorded mine-hazard cells across a reshuffle (mirrors
## _ensure_live_board_preserving_hazards for the farm). _ensure_live_board rebuilds the WHOLE grid
## (losing the pinned cave-in/gas/lava), so when mine hazards are present we re-stamp them after any
## reshuffle. Rare (the pool almost always lands a live board), but keeps the hazard tiles pinned.
func _ensure_live_board_preserving_mine(cave_in: Dictionary, gas_vent: Dictionary, lava_cells: Array) -> void:
	var guard := 0
	while not BoardLogic.has_valid_chain(grid) and guard < 64:
		grid = BoardLogic.make_empty_grid()
		BoardLogic.refill(grid, rng, tile_pool)
		_stamp_mine_hazard_cells(cave_in, gas_vent, lava_cells)
		guard += 1

## T11 — rebuild the mole-marker overlay from `mole` ({} when none, else {row,col,turns_remaining}).
## Frees the existing marker and creates one Node2D marker at the cell centre. Called on every
## mine-hazard tick + on load/biome flip. An empty dict clears the marker. Headless-safe (pure _draw).
func refresh_mole(mole: Dictionary) -> void:
	if _mole_marker != null and is_instance_valid(_mole_marker):
		_mole_marker.queue_free()
	_mole_marker = null
	if mole.is_empty():
		return
	var mr: int = int(mole.get("row", -1)); var mc: int = int(mole.get("col", -1))
	if not BoardLogic.in_bounds(Vector2i(mc, mr)):
		return
	var marker := _MoleMarker.new()
	marker.radius = tile_size * 0.32
	marker.position = _cell_center(mc, mr)
	marker.z_index = 90   # above tiles, below the chain overlay (100) — same band as the wolf
	add_child(marker)
	_mole_marker = marker

## T9 — clear EVERY rat from the board + the count of cells to blank, used when a rat-chain or a
## deadly-pests cull or a Rifle removes specific rats. Given the cleared rat cells (Array of
## {row,col}), blank them, collapse + refill, re-stamp the REMAINING rats/fire, rebuild. Returns
## the number of cells cleared. Distinct from clear_all_rats (the Ratcatcher shoo, which clears
## the whole board's rats) — this clears a SPECIFIC set after a chain/cull.
func clear_hazard_cells(cleared_cells: Array, remaining_rats: Array, remaining_fire: Array, wolf_cells: Array) -> int:
	var n := 0
	for cell in cleared_cells:
		var cr: int = int(cell.get("row", -1)); var cc: int = int(cell.get("col", -1))
		if BoardLogic.in_bounds(Vector2i(cc, cr)):
			grid[cr][cc] = Constants.EMPTY
			n += 1
	if n > 0:
		BoardLogic.collapse(grid)
		BoardLogic.refill(grid, rng, tile_pool)
		# Re-stamp the survivors so they stay pinned.
		for rc in remaining_rats:
			var rr: int = int(rc.get("row", -1)); var rcl: int = int(rc.get("col", -1))
			if BoardLogic.in_bounds(Vector2i(rcl, rr)):
				grid[rr][rcl] = Constants.Tile.RAT
		for fc in remaining_fire:
			var fr: int = int(fc.get("row", -1)); var fcl: int = int(fc.get("col", -1))
			if BoardLogic.in_bounds(Vector2i(fcl, fr)):
				grid[fr][fcl] = Constants.Tile.FIRE
		_ensure_live_board_preserving_hazards(remaining_rats, remaining_fire)
		_build_tiles()
	refresh_wolves(wolf_cells)
	return n

# ── harbor (M3j): tide mutation + giant-pearl placement ──────────────────────
# These act only while Main has flipped the harbor on (it sets clear_pearl_on_fish_chain
# from GameState.is_in_harbor() and calls these on the tide/pearl ticks). Off the harbor
# they are never invoked, so farm/mine behaviour is unchanged.

## M3j — rewrite the board's BOTTOM ROW with fresh draws from `pool` (the live tide pool,
## GameState.current_tide_pool()), rebuilding those Tile nodes. Called by Main when a harbor
## turn FLIPS the tide (note_harbor_turn → tide_flipped): the surface catch changes with the
## water, so the row the player is about to chain is reseeded from the new tide's pool. An
## empty/null pool is a no-op (nothing to draw). Mirrors the per-cell rebuild that
## clear_all_rats / the refill loop do; only the bottom row's `grid` + Tile nodes change, so
## the rest of the board (and any in-flight collapse) is untouched.
func mutate_bottom_row(pool: Array) -> void:
	if pool == null or pool.is_empty():
		return
	var r: int = Constants.ROWS - 1
	for c in Constants.COLS:
		grid[r][c] = pool[rng.randi_range(0, pool.size() - 1)]
		_rebuild_cell(c, r)

## M3j — set grid cell `cell` (col=x, row=y) to the giant pearl tile and rebuild its Tile
## node so the rune-capture target shows on the board. Called by Main on harbor entry (and
## on load mid-session) using GameState.fish_pearl's seeded cell. Out-of-bounds is a no-op.
func place_pearl(cell: Vector2i) -> void:
	if not BoardLogic.in_bounds(cell):
		return
	grid[cell.y][cell.x] = Constants.Tile.FISH_PEARL
	_rebuild_cell(cell.x, cell.y)

## M3j — degrade the giant pearl back to kelp at `cell` and rebuild its Tile node. Called by
## Main when the pearl's countdown EXPIRES uncaptured (note_harbor_turn → pearl_expired) — the
## React behaviour is the pearl reverting to a plain kelp tile. Out-of-bounds is a no-op.
func degrade_pearl(cell: Vector2i) -> void:
	if not BoardLogic.in_bounds(cell):
		return
	grid[cell.y][cell.x] = Constants.Tile.FISH_KELP
	_rebuild_cell(cell.x, cell.y)

## Free + rebuild the single Tile node at (c, r) from its current grid value, positioned at
## the cell centre. Shared by the harbor mutators above. Keeps `tiles` in lockstep with
## `grid` for that cell without disturbing any other cell (mirrors _build_tiles' per-cell work
## for one cell). Guarded so it is safe before tiles[] is populated.
func _rebuild_cell(c: int, r: int) -> void:
	if tiles.is_empty():
		return
	var old: Tile = tiles[r][c]
	if old != null:
		old.queue_free()
	var t := _make_tile(grid[r][c])
	t.position = _cell_center(c, r)
	tiles[r][c] = t

# ── layout ─────────────────────────────────────────────────────────────────

## Size the board to the viewport and reposition all tiles. Called by Main on
## first layout and on every viewport resize.
func layout_for(viewport: Vector2) -> void:
	# A resize relays out the board; cancel any in-flight resolve shake so its tween can't later
	# snap the board back to the PRE-resize resting position (Main._layout sets the new resting
	# position right after this call). The shake is purely cosmetic — dropping it on resize is
	# correct and avoids the board being mis-parked until the next layout.
	if _shake_tween != null and _shake_tween.is_valid():
		_shake_tween.kill()
	_shake_tween = null
	var avail_w := viewport.x * 0.94
	# Height budget = the band between the board's top anchor (Main._layout puts it at
	# 0.24·h) and the stockpile card's top anchor (Hud._layout_hud puts it at 0.74·h),
	# plus a 36px allowance for the board card's bottom frame padding tucking under the
	# stockpile (exactly the overlap the canonical 720×1280 portrait has always had —
	# at that size this formula still yields tile_size 112, pixel-identical). review-4:
	# the old flat 0.62·h budget overshot the stockpile on wide/landscape viewports
	# (e.g. a 1280×800 desktop window), burying the bottom tile row under the card.
	var avail_h := viewport.y * 0.50 + 36.0
	tile_size = floorf(minf(avail_w / Constants.COLS, avail_h / Constants.ROWS))
	for r in Constants.ROWS:
		for c in Constants.COLS:
			var t: Tile = tiles[r][c]
			if t != null:
				t.set_size_px(tile_size)
				t.position = _cell_center(c, r)
	queue_redraw()   # tile_size changed → reframe the field card

func board_pixel_size() -> Vector2:
	return Vector2(Constants.COLS * tile_size, Constants.ROWS * tile_size)

func _cell_center(c: int, r: int) -> Vector2:
	return board_origin + Vector2((c + 0.5) * tile_size, (r + 0.5) * tile_size)

func _cell_from_local(p: Vector2) -> Vector2i:
	return Vector2i(int(floor((p.x - board_origin.x) / tile_size)),
					int(floor((p.y - board_origin.y) / tile_size)))

# ── input ──────────────────────────────────────────────────────────────────
# Touch is delivered as mouse events (emulate_mouse_from_touch in project.godot),
# so handling mouse covers both pointer kinds with one path.

## M8c — enter/leave TAP-tool targeting mode. While on, the next board press is routed
## to cell_tapped (and suppresses the drag) instead of starting a chain. Main calls
## set_targeting(true) when it arms a tap-target tool and set_targeting(false) once the
## tap has fired (or been cancelled). Leaving targeting never strands a half-built
## chain because a press in targeting mode returns before _begin_drag (so _dragging is
## never set), but we clear any stray drag state defensively for safety.
func set_targeting(on: bool) -> void:
	_targeting = on
	# Drive the armed-frame pulse only while targeting; clear it the moment we leave.
	set_process(on)
	if not on:
		_armed_phase = 0.0
	queue_redraw()
	if on and _dragging:
		# Defensive: if a drag were somehow in flight, cancel it cleanly so targeting
		# starts from a known-idle state (no highlighted/overlaid path lingering).
		for cell in _path:
			_set_highlight(cell, false)
		_path = []
		_dragging = false
		_update_chain_overlay()
		chain_changed.emit(0)

## Task C — set the chain-input gate. `on == false` makes the board INERT (no drag can start);
## `on == true` restores live chain input. When turning OFF, defensively cancel any in-flight
## drag (clear the highlighted path + overlay) so a half-drawn chain can never persist into the
## inert state — mirrors the drag-cancel branch in set_targeting().
func set_active(on: bool) -> void:
	active = on
	if not on and _dragging:
		for cell in _path:
			_set_highlight(cell, false)
		_path = []
		_dragging = false
		_update_chain_overlay()
		chain_changed.emit(0)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			# Task C — chain-input GATE: when the board is inert (no active farm run), a press
			# never starts a drag, so the board is unplayable in town. Returning here BEFORE
			# _begin_drag means _dragging is never set, so the motion + release branches below
			# stay inert too (a release with no active drag is already a no-op). When active this
			# guard is skipped and the press behaves exactly as before.
			if not active:
				return
			# M8c — when a tap-target tool is armed (targeting mode), a press reports the
			# tapped cell to Main and returns early WITHOUT starting a drag, so the armed
			# tool fires on that cell instead of beginning a chain. Motion/release below
			# stay inert while targeting (we never set _dragging). When NOT targeting this
			# guard is skipped entirely and the press starts a drag exactly as before.
			if _targeting:
				cell_tapped.emit(_cell_from_local(to_local(event.position)))
				return
			_begin_drag(_cell_from_local(to_local(event.position)))
		elif _dragging:
			_finish_drag()
	elif event is InputEventMouseMotion and _dragging:
		_extend_drag(_cell_from_local(to_local(event.position)))

func _begin_drag(cell: Vector2i) -> void:
	if not BoardLogic.in_bounds(cell):
		return
	if grid[cell.y][cell.x] == Constants.EMPTY:
		return
	# T11 — a chain can't START on a hazard-BLOCKED cell (RUBBLE / LAVA) in the mine.
	if block_mine_hazards and MineHazardLogic.tile_blocked_by_hazard(int(grid[cell.y][cell.x])):
		return
	# T24 — a chain can't START on a boss-blocked cell (frozen column / rubble / hidden).
	if not BossModifierLogic.cell_chainable(boss_modifier_state, cell.y, cell.x):
		return
	# T25 — the giant pearl is NOT a valid drag ANCHOR (you drag fish tiles into it, not
	# start a chain on the pearl). If the player presses directly on the pearl tile, reject
	# the start so the drag stays anchored on a fish tile. The pearl CAN still join via
	# _extend_drag when the chain drags over it (see _cell_can_extend_chain).
	if clear_pearl_on_fish_chain and grid[cell.y][cell.x] == Constants.Tile.FISH_PEARL:
		return
	_dragging = true
	_path = [cell]
	_set_highlight(cell, true)
	_update_chain_overlay()
	chain_changed.emit(1)

func _extend_drag(cell: Vector2i) -> void:
	if not BoardLogic.in_bounds(cell) or _path.is_empty():
		return
	var last: Vector2i = _path[-1]
	if cell == last:
		return
	# Backtrack: dragging back onto the previous cell pops the last one.
	if _path.size() >= 2 and cell == _path[-2]:
		_set_highlight(last, false)
		_path.pop_back()
		_update_chain_overlay()
		chain_changed.emit(_path.size())
		return
	if _path.has(cell):
		return
	# T11 — never extend onto a hazard-BLOCKED cell (RUBBLE / LAVA) in the mine. (The same-type
	# guard below already blocks most cases since a blocked tile can't be the anchor, but a buried
	# cave-in row is many RUBBLE cells — this keeps the chain off them defensively.)
	if block_mine_hazards and MineHazardLogic.tile_blocked_by_hazard(int(grid[cell.y][cell.x])):
		return
	# T24 — never extend onto a boss-blocked cell (frozen column / rubble / hidden).
	if not BossModifierLogic.cell_chainable(boss_modifier_state, cell.y, cell.x):
		return
	# Extend: must be compatible with the chain's anchor type and 8-way adjacent to the last cell.
	# T25 — _cell_can_extend_chain handles the normal same-type case PLUS the special case where
	# FISH_PEARL can join a fish-category chain (and a fish tile can follow the pearl in the chain).
	if not _cell_can_extend_chain(cell, int(grid[_path[0].y][_path[0].x])):
		return
	if maxi(absi(cell.x - last.x), absi(cell.y - last.y)) != 1:
		return
	_path.append(cell)
	_set_highlight(cell, true)
	_update_chain_overlay()
	chain_changed.emit(_path.size())

func _finish_drag() -> void:
	var path: Array[Vector2i] = _path.duplicate()
	for cell in _path:
		_set_highlight(cell, false)
	_path = []
	_dragging = false
	_update_chain_overlay()                # clears the path line + nodes
	chain_changed.emit(0)
	# T25 — for harbor mixed chains (fish + FISH_PEARL), use the pearl-aware validator;
	# for all other chains the standard same-type validator.
	var valid: bool
	if clear_pearl_on_fish_chain:
		valid = _is_valid_chain_pearl_aware(grid, path, min_chain)
	else:
		valid = BoardLogic.is_valid_chain(grid, path, min_chain)
	if valid:
		_resolve(path)
	elif path.size() >= 2:
		chain_rejected.emit(path.size())

## M4a — recompute the overlay's Board-local points from `_path` (each cell's
## centre) and push them to the chain overlay, flagged valid when the chain has
## reached the resolve threshold. Called on every path mutation; an empty path
## clears the overlay. Guarded so it's a no-op before the overlay exists.
func _update_chain_overlay() -> void:
	if _chain_overlay == null:
		return
	var points: Array[Vector2] = []
	for cell in _path:
		points.append(_cell_center(cell.x, cell.y))
	var n: int = _path.size()
	var valid: bool = n >= min_chain
	# Live escalation data for the overlay: the chain STAGE (path tint/thickness), the
	# threshold (where stars sit) and how many upgrade tiles this chain will spawn (stars +
	# head "×N" marker) plus that upgrade tile's thumbnail. We ASK the same upgrade_provider
	# the resolve uses (GameState.upgrade_spawn against the home zone), so the marker matches
	# exactly what the chain will produce — and shows nothing off the farm (provider returns 0).
	var chain_tile: int = current_chain_tile()
	var threshold: int = Constants.threshold_for(chain_tile)
	var stage: int = 0
	var upg_count: int = 0
	var upg_tex: Texture2D = null
	if threshold > 0 and threshold < Constants.NO_THRESHOLD:
		stage = Constants.chain_stage_index(n, threshold)
		if upgrade_provider.is_valid():
			var up: Dictionary = upgrade_provider.call(chain_tile, n)
			upg_count = int(up.get("count", 0))
			var up_tile: int = int(up.get("tile", Constants.EMPTY))
			if up_tile != Constants.EMPTY:
				upg_tex = Tile.texture_for(up_tile)
	_chain_overlay.set_path(points, valid, tile_size, stage, threshold, upg_count, upg_tex)

func _set_highlight(cell: Vector2i, on: bool) -> void:
	var t: Tile = tiles[cell.y][cell.x]
	if t != null:
		t.set_selected(on)

# ── resolution: collect → collapse → refill (with animation) ───────────────

## Validate-and-resolve a path. Returns true if it was a legal chain. Exposed
## so headless smoke tests can drive a move without synthesising input events.
## T25 — uses the pearl-aware validator when in the harbor (clear_pearl_on_fish_chain),
## so test paths that include FISH_PEARL mixed with fish tiles resolve correctly.
func try_resolve(path: Array) -> bool:
	var valid: bool
	if clear_pearl_on_fish_chain:
		valid = _is_valid_chain_pearl_aware(grid, path, min_chain)
	else:
		valid = BoardLogic.is_valid_chain(grid, path, min_chain)
	if not valid:
		return false
	_resolve(path)
	return true

func _resolve(path: Array) -> void:
	# T25 — for a harbor mixed chain (fish + FISH_PEARL), the anchor is always a fish tile
	# (FISH_PEARL can't anchor — _begin_drag rejects it). `key` is the anchor tile type; the
	# pearl cell in the path is reported via _chain_cells so Main can detect it. For counting
	# purposes (`length`) the full path size is used — the pearl takes a slot, matching React.
	var key: int = grid[path[0].y][path[0].x]
	var length: int = path.size()

	# T7/T9/T10 — snapshot the chained cells (row/col + their tile value, read BEFORE the chain
	# clears them) so Main can run the farm-hazard interactions: a RAT chain clears for coins, a
	# FIRE chain extinguishes, and a deadly_pests chain (Cypress/Beet/Phoenix) culls adjacent rats.
	# Emitted before chain_resolved so Main can suppress the normal credit for a pure-hazard chain.
	var chain_cells: Array = []
	for cell in path:
		chain_cells.append({"row": int(cell.y), "col": int(cell.x), "tile": int(grid[cell.y][cell.x])})
	chain_cells_resolved.emit(chain_cells)

	# A1b — UPGRADE TILES (the React core loop): ask the provider (if Main installed one)
	# how many next-tier tiles this chain spawns and which tile. We compute it HERE, before
	# the collapse/refill below, and stash them in _pending_upgrades so the refill loop seeds
	# them into the freshly-spawned TOP cells (instead of pool draws) — the Godot analogue of
	# the React pendingUpgrades queue filled before collapse. Off the farm (mine/harbor) Main
	# leaves upgrade_provider unset, so this is a no-op and the refill is a plain pool draw.
	_pending_upgrades = []
	if upgrade_provider.is_valid():
		var up: Dictionary = upgrade_provider.call(key, length)
		var up_count: int = int(up.get("count", 0))
		var up_tile: int = int(up.get("tile", Constants.EMPTY))
		if up_count > 0 and up_tile != Constants.EMPTY:
			for _i in up_count:
				_pending_upgrades.append(up_tile)

	# M3h (Master Ratcatcher): a resolved GRASS chain ALSO collects every rat that is
	# 8-adjacent to a chained cell. These rat cells are appended to the SAME removal
	# set the chain uses, so collapse+refill fills them just like the popped chain
	# tiles. They do NOT count toward `length` and are never credited (RAT produces
	# nothing) — the chain still reports the GRASS key + the GRASS chain length.
	var removal: Array = path.duplicate()
	if clear_rats_on_grass and key == Constants.Tile.GRASS:
		for rat_cell in _adjacent_rat_cells(path):
			if not removal.has(rat_cell):
				removal.append(rat_cell)

	# M3i (mine rubble): a resolved STONE chain ALSO clears every RUBBLE that is
	# 8-adjacent to a chained cell — you mine through the cave-in. Same removal-set
	# fold as the rats sweep: the rubble cells collapse + refill like the popped chain
	# tiles, do NOT count toward `length`, and are never credited (RUBBLE produces
	# nothing). The chain still reports the STONE key + the STONE chain length.
	if clear_rubble_on_stone and key == Constants.Tile.STONE:
		for rubble_cell in _adjacent_rubble_cells(path):
			if not removal.has(rubble_cell):
				removal.append(rubble_cell)

	# 1. Pop the collected tiles out in a STAGGERED wave (chain + any Master-Ratcatcher
	#    rats): each successive tile pops POP_STAGGER later with a random spin, so the
	#    chain visibly "unzips" instead of vanishing in one frame. Then free the node.
	var pop_i := 0
	for cell in removal:
		var t: Tile = tiles[cell.y][cell.x]
		tiles[cell.y][cell.x] = null
		if t != null:
			var d: float = pop_i * POP_STAGGER
			var spin: float = rng.randf_range(-0.5, 0.5)
			var tw := create_tween()
			tw.set_parallel(true)
			tw.tween_property(t, "scale", Vector2.ZERO, POP_TIME).set_ease(Tween.EASE_IN).set_delay(d)
			tw.tween_property(t, "rotation", spin, POP_TIME).set_delay(d)
			tw.chain().tween_callback(t.queue_free)
			pop_i += 1

	# 2. Collapse existing tile nodes downward, then 3. spawn new ones up top. Both phases
	#    are held off by FALL_DELAY so the pop wave reads first — then survivors drop and
	#    fresh tiles fall in (the React pop → settle → refill cascade).
	#
	# A1b — UPGRADE INJECTION: collapse first (per column, recording each column's first
	# refill row `write`), then choose, among ALL the freshly-vacated top slots across the
	# whole board, which ones become UPGRADE tiles (the queued _pending_upgrades) vs plain
	# pool draws. Choosing across the full set of refill slots (not biased to one column)
	# keeps the upgrade tiles scattered, and using the seeded `rng` keeps placement
	# deterministic for tests. The collapse phase is byte-for-byte the prior behaviour; only
	# the refill VALUE per top slot changes (upgrade vs pool), never the cascade animation.
	var refill_slots: Array = []          # Array[Vector2i(col,row)] of every cell to spawn fresh
	var col_write: Array = []             # per-column first refill row (rows 0..col_write[c])
	for c in Constants.COLS:
		var write := Constants.ROWS - 1
		for r in range(Constants.ROWS - 1, -1, -1):
			var t: Tile = tiles[r][c]
			if t != null:
				if write != r:
					tiles[write][c] = t
					tiles[r][c] = null
					_slide_to(t, c, write, FALL_DELAY, true)
				write -= 1
		col_write.append(write)
		for r in range(write, -1, -1):
			refill_slots.append(Vector2i(c, r))

	# Pick which refill slots get an upgrade tile. Draw distinct slots at random (seeded) so the
	# upgrade tiles scatter across the new top cells; cap at the number of available slots (a
	# count larger than the vacated cells is physically impossible to place — extras are dropped,
	# matching that the board only has so many cells to refill this move).
	var upgrade_at := {}                  # Vector2i -> upgrade tile type
	var to_place: int = mini(_pending_upgrades.size(), refill_slots.size())
	var slot_bag: Array = refill_slots.duplicate()
	for i in to_place:
		var pick: int = rng.randi_range(0, slot_bag.size() - 1)
		upgrade_at[slot_bag[pick]] = int(_pending_upgrades[i])
		slot_bag.remove_at(pick)
	_pending_upgrades = []                # consumed

	# Fill each column's vacated top rows: an UPGRADE tile where chosen, else a pool draw.
	for c in Constants.COLS:
		var write: int = int(col_write[c])
		for r in range(write, -1, -1):
			var cell := Vector2i(c, r)
			var ttype: int = int(upgrade_at[cell]) if upgrade_at.has(cell) \
				else int(tile_pool[rng.randi_range(0, tile_pool.size() - 1)])
			var node := _make_tile(ttype)
			node.position = _cell_center(c, r) - Vector2(0, (write + 2) * tile_size)
			tiles[r][c] = node
			# M4e — fresh refill tiles POP in: start at half-scale and overshoot up to
			# full scale (TRANS_BACK) alongside the (delayed) fall. Collapsing tiles
			# (handled above via _slide_to) keep scale 1 and get a small landing squash.
			node.scale = Vector2(0.5, 0.5)
			_slide_to(node, c, r, FALL_DELAY, false)
			_pop_in_scale(node, FALL_DELAY)

	# Re-derive the logic grid from the visual layer, keep the board playable.
	_sync_grid_from_tiles()
	if not BoardLogic.has_valid_chain(grid):
		setup_new_board()

	# T25 (harbor in-chain pearl capture): emit pearl_chain_resolved when the resolved
	# chain CONTAINS the pearl tile (any cell in chain_cells had tile FISH_PEARL) so that
	# Main can call try_capture_pearl with the chain's tile keys — the React rule.
	# This REPLACES the old adjacency-based path (a fish chain run 8-adjacent to the pearl)
	# with the faithful React rule: the chain must INCLUDE the pearl tile + enough fish.
	# Emitted BEFORE chain_resolved so the capture fires before the harbor turn ticks
	# (a final-turn chain can still capture). Only while on the harbor (clear_pearl_on_fish_chain).
	if clear_pearl_on_fish_chain:
		var has_pearl_in_chain: bool = false
		for cc in chain_cells:
			if int(cc.get("tile", Constants.EMPTY)) == Constants.Tile.FISH_PEARL:
				has_pearl_in_chain = true
				break
		if has_pearl_in_chain:
			pearl_chain_resolved.emit(chain_cells.duplicate())

	# Resolve "juice": a length-scaled screen shake, an expanding flash ring + collect spark
	# burst at the chain head, and (when this chain spawned an upgrade tile) an upgrade burst.
	# Purely visual — _play_resolve_fx no-ops under headless so the logic suites are unaffected.
	_play_resolve_fx(path, length, key, upgrade_at.size())

	chain_resolved.emit(key, length)

## Slide a tile to cell (c,r) over FALL_TIME after an optional `delay` (used to hold the
## collapse off until the pop wave reads). When `bounce` is set, a brief squash-and-settle
## lands the tile with weight (the React _landingBounce) — used for collapsing survivors;
## refill tiles get their bounce from the TRANS_BACK overshoot in _pop_in_scale instead.
func _slide_to(t: Tile, c: int, r: int, delay: float = 0.0, bounce: bool = false) -> void:
	var tw := create_tween()
	tw.tween_property(t, "position", _cell_center(c, r), FALL_TIME) \
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT).set_delay(delay)
	if bounce:
		tw.chain().tween_property(t, "scale", Vector2(1.07, 0.93), 0.05)
		tw.chain().tween_property(t, "scale", Vector2.ONE, 0.08).set_trans(Tween.TRANS_SINE)

## M4e — scale a freshly-spawned refill tile from its start scale (0.5) up to full
## with a slight overshoot (TRANS_BACK / EASE_OUT) over the fall, so new tiles "pop"
## in rather than just sliding. A separate tween from the position slide so neither
## interferes with the other; both run over FALL_TIME after the same `delay`.
func _pop_in_scale(t: Tile, delay: float = 0.0) -> void:
	var tw := create_tween()
	tw.tween_property(t, "scale", Vector2.ONE, FALL_TIME) \
		.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT).set_delay(delay)

func _sync_grid_from_tiles() -> void:
	for r in Constants.ROWS:
		for c in Constants.COLS:
			var t: Tile = tiles[r][c]
			grid[r][c] = t.tile_type if t != null else Constants.EMPTY

## T25 — Pearl-aware chain validator for harbor boards. Mirrors BoardLogic.is_valid_chain
## but accepts FISH_PEARL tiles mixed with fish-category tiles in the same chain (as React
## allows). The anchor is the FIRST cell; all subsequent cells must satisfy
## _cell_can_extend_chain (same type OR fish↔pearl when harbor). Adjacency + no-revisit
## rules are identical to the standard validator. Used by try_resolve + _finish_drag when
## clear_pearl_on_fish_chain is true; farm/mine chains still use the strict same-type validator.
func _is_valid_chain_pearl_aware(g: Array, path: Array, mc: int = Constants.MIN_CHAIN) -> bool:
	if path.size() < mc:
		return false
	var first: Vector2i = path[0]
	if not BoardLogic.in_bounds(first):
		return false
	var anchor_tile: int = int(g[first.y][first.x])
	if anchor_tile == Constants.EMPTY:
		return false
	# T25 — skip validation if anchor is FISH_PEARL (drag should never start on it, but
	# be defensive). A chain anchored on FISH_PEARL has no fish companion to count.
	if anchor_tile == Constants.Tile.FISH_PEARL:
		return false
	var seen := {}
	for i in path.size():
		var cell: Vector2i = path[i]
		if not BoardLogic.in_bounds(cell):
			return false
		# Each cell must be compatible with the anchor (same type or fish↔pearl).
		if not _cell_can_extend_chain(cell, anchor_tile):
			return false
		if seen.has(cell):
			return false
		seen[cell] = true
		if i > 0:
			var prev: Vector2i = path[i - 1]
			if maxi(absi(cell.x - prev.x), absi(cell.y - prev.y)) != 1:
				return false
	return true

## T25 — True when the tile at `cell` is compatible with a chain whose anchor tile type
## is `anchor_tile`. In the normal same-type case both tiles match. The special case: when
## `clear_pearl_on_fish_chain` is on (harbor only), FISH_PEARL is compatible with any
## fish-category anchor and any fish tile is compatible with a FISH_PEARL anchor — so the
## player can drag through the pearl together with fish tiles in one mixed chain, mirroring
## React's in-chain pearl rule (src/features/fish/pearl.ts:122-128). Off the harbor this is
## always false for cross-type combos (byte-identical to the prior same-type check).
func _cell_can_extend_chain(cell: Vector2i, anchor_tile: int) -> bool:
	var candidate: int = int(grid[cell.y][cell.x])
	if candidate == anchor_tile:
		return true
	# T25 — harbor pearl join: FISH_PEARL can extend a fish chain; a fish tile can extend a
	# FISH_PEARL-anchored chain (the anchor should never be FISH_PEARL since _begin_drag
	# rejects starting on it, but handle it symmetrically for robustness).
	if clear_pearl_on_fish_chain:
		if candidate == Constants.Tile.FISH_PEARL and FishConfig.is_fish_tile(anchor_tile):
			return true
		if FishConfig.is_fish_tile(candidate) and anchor_tile == Constants.Tile.FISH_PEARL:
			return true
	return false

## M3h — every distinct RAT cell that is 8-adjacent (king move) to any cell in
## `path`. Used by _resolve when the Master Ratcatcher is active so a grass chain
## sweeps up the rats around it. Cells in `path` themselves are never returned (a
## grass chain has no rats in it), only their neighbours.
func _adjacent_rat_cells(path: Array) -> Array:
	var out: Array = []
	for cell in path:
		for dy in [-1, 0, 1]:
			for dx in [-1, 0, 1]:
				if dx == 0 and dy == 0:
					continue
				var nb := Vector2i(cell.x + dx, cell.y + dy)
				if not BoardLogic.in_bounds(nb):
					continue
				if grid[nb.y][nb.x] != Constants.Tile.RAT:
					continue
				if not out.has(nb):
					out.append(nb)
	return out

## M3i — every distinct RUBBLE cell that is 8-adjacent (king move) to any cell in
## `path`. Used by _resolve when clear_rubble_on_stone is active (in the mine) so a
## STONE chain mines through the rubble around it. Parallels _adjacent_rat_cells:
## cells in `path` themselves are never returned, only their neighbours.
func _adjacent_rubble_cells(path: Array) -> Array:
	var out: Array = []
	for cell in path:
		for dy in [-1, 0, 1]:
			for dx in [-1, 0, 1]:
				if dx == 0 and dy == 0:
					continue
				var nb := Vector2i(cell.x + dx, cell.y + dy)
				if not BoardLogic.in_bounds(nb):
					continue
				if grid[nb.y][nb.x] != Constants.Tile.RUBBLE:
					continue
				if not out.has(nb):
					out.append(nb)
	return out

# ── resolve "juice" FX (the React feel) ──────────────────────────────────────
# Screen shake (scaled by chain length), an expanding flash ring + a collect spark burst at
# the chain head, an upgrade-burst flash, and a floating "+N" gain label. All are PURELY
# visual: added as Board children (so they shake with the board), self-freeing, and gated by
# _fx_enabled() so the headless logic suites never run them (no renderer, no tree-bound tweens).

## True only when the board is live in a rendered tree — so the FX run in the game + the
## non-headless visual harness but are skipped wholesale in the headless test runners.
func _fx_enabled() -> bool:
	return is_inside_tree() and DisplayServer.get_name() != "headless"

## Fire the full resolve burst at the chain head. `upgrades` is how many upgrade tiles this
## chain spawned (adds the upgrade flash). Stores the head centre for Main's floating gain text.
func _play_resolve_fx(path: Array, length: int, key: int, upgrades: int) -> void:
	if not _fx_enabled() or path.is_empty():
		return
	var head: Vector2i = path[-1]
	_last_chain_center = _cell_center(head.x, head.y)
	_shake_board(length)
	_radial_flash(_last_chain_center, length)
	_spark_burst(_last_chain_center, key, length)
	if upgrades > 0:
		_upgrade_burst(_last_chain_center)

## Shake the whole board (it carries the tiles + overlay as children) with a magnitude +
## duration that grow with the chain length, settling back to the layout position. React's
## cameras.main.shake — here we wobble the Board node since the port uses no Camera2D.
func _shake_board(length: int) -> void:
	var mag: float = clampf(2.0 + float(length - 3) * 1.7, 0.0, 15.0)
	if mag <= 0.5:
		return
	# If a shake is mid-flight, end it cleanly so `base` is the true resting (layout) position.
	if _shake_tween != null and _shake_tween.is_valid():
		_shake_tween.kill()
		position = _shake_base
	_shake_base = position
	var dur: float = clampf(0.16 + float(length - 3) * 0.045, 0.16, 0.5)
	var steps: int = 6
	var seg: float = dur / float(steps)
	_shake_tween = create_tween()
	for i in range(steps):
		var falloff: float = 1.0 - float(i) / float(steps)
		var off := Vector2(_fx_rng.randf_range(-mag, mag), _fx_rng.randf_range(-mag, mag)) * falloff
		_shake_tween.tween_property(self, "position", _shake_base + off, seg).set_trans(Tween.TRANS_SINE)
	_shake_tween.tween_property(self, "position", _shake_base, seg).set_trans(Tween.TRANS_SINE)

## An expanding gold ring at `center` whose peak radius grows with the chain length, fading out.
func _radial_flash(center: Vector2, length: int) -> void:
	var ring := _RingFx.new()
	ring.position = center
	ring.z_index = 92
	ring.color = Color(1.0, 0.89, 0.60)
	ring.width = maxf(3.0, tile_size * 0.06)
	add_child(ring)
	var peak: float = tile_size * (0.5 + clampf(float(length - 3) * 0.16, 0.0, 1.1))
	ring.play(tile_size * 0.12, peak, 0.46)

## A bright filled disk flash at `center` — fires only when the chain spawned an upgrade tile.
func _upgrade_burst(center: Vector2) -> void:
	var disk := _RingFx.new()
	disk.position = center
	disk.z_index = 93
	disk.filled = true
	disk.color = Color(1.0, 0.96, 0.76)
	disk.alpha = 0.55
	add_child(disk)
	disk.play(tile_size * 0.10, tile_size * 0.5, 0.36)

## A short-lived collect spark burst at `center`, tinted by the chained resource's colour, with
## a count that scales (gently) with the chain length. CPUParticles2D one-shot, self-freeing.
func _spark_burst(center: Vector2, key: int, length: int) -> void:
	var p := CPUParticles2D.new()
	p.position = center
	p.z_index = 95
	p.texture = _dot_texture()
	p.one_shot = true
	p.explosiveness = 0.92
	p.amount = clampi(8 + (length - 3) * 2, 8, 26)
	p.lifetime = 0.55
	p.direction = Vector2(0, -1)
	p.spread = 180.0
	p.gravity = Vector2(0, tile_size * 4.5)
	p.initial_velocity_min = tile_size * 1.3
	p.initial_velocity_max = tile_size * 2.8
	p.scale_amount_min = 0.5
	p.scale_amount_max = 1.4
	p.color = Constants.color_for(key).lightened(0.12)
	add_child(p)
	p.emitting = true
	p.finished.connect(p.queue_free)

## A floating "+N resource ★×k" gain label that rises off the chain head and fades. Called by
## Main from _on_chain_resolved (it knows the credited amount + star count), drawn from the head
## centre _play_resolve_fx stashed. The React floatText above the chain endpoint.
func play_gain_text(text: String, color: Color) -> void:
	if not _fx_enabled() or text == "":
		return
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_size_override("font_size", int(maxf(18.0, tile_size * 0.30)))
	lbl.add_theme_color_override("font_color", color)
	lbl.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.55))
	lbl.add_theme_constant_override("outline_size", 5)
	lbl.z_index = 110
	lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(lbl)
	lbl.reset_size()
	var start: Vector2 = _last_chain_center - lbl.size * 0.5 - Vector2(0, tile_size * 0.45)
	lbl.position = start
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(lbl, "position", start - Vector2(0, tile_size * 1.25), 0.9) \
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_property(lbl, "modulate:a", 0.0, 0.5).set_delay(0.4)
	tw.chain().tween_callback(lbl.queue_free)

## A small soft white dot texture for the spark particles, built once + cached (CPUParticles2D
## with no texture renders nothing). A radial alpha falloff so the sparks read as soft motes.
static var _dot_tex: Texture2D = null
static func _dot_texture() -> Texture2D:
	if _dot_tex != null:
		return _dot_tex
	var sz: int = 8
	var img := Image.create(sz, sz, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var cen := Vector2(float(sz - 1) * 0.5, float(sz - 1) * 0.5)
	for y in sz:
		for x in sz:
			var a: float = clampf(1.0 - Vector2(x, y).distance_to(cen) / (float(sz) * 0.5), 0.0, 1.0)
			if a > 0.0:
				img.set_pixel(x, y, Color(1, 1, 1, a))
	_dot_tex = ImageTexture.create_from_image(img)
	return _dot_tex

## A reusable expanding ring / disk FX node: tweens its radius + alpha then self-frees. `filled`
## switches between a stroked ring (radial flash) and a solid disk (upgrade burst).
class _RingFx extends Node2D:
	var radius: float = 8.0
	var alpha: float = 0.6
	var color: Color = Color(1, 0.9, 0.6)
	var width: float = 5.0
	var filled: bool = false

	func _draw() -> void:
		if alpha <= 0.0:
			return
		var c := color
		c.a = alpha
		if filled:
			draw_circle(Vector2.ZERO, radius, c)
		else:
			draw_arc(Vector2.ZERO, radius, 0.0, TAU, 48, c, width, true)
			draw_arc(Vector2.ZERO, radius * 0.95, 0.0, TAU, 48,
				Color(1, 1, 1, alpha * 0.85), maxf(1.0, width * 0.4), true)

	func _set_radius(r: float) -> void:
		radius = r
		queue_redraw()

	func _set_alpha(a: float) -> void:
		alpha = a
		queue_redraw()

	func play(start_r: float, end_r: float, dur: float) -> void:
		radius = start_r
		# Both the radius growth and the alpha fade drive their own queue_redraw via setters, so
		# neither depends on the other still running to repaint (robust if the durations diverge).
		var tw := create_tween()
		tw.set_parallel(true)
		tw.tween_method(_set_radius, start_r, end_r, dur).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw.tween_method(_set_alpha, alpha, 0.0, dur).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw.chain().tween_callback(queue_free)

## T8 — a wolf-marker overlay: a dark snout-ringed disk with two ears + a fang glint, drawn over
## the cell a wolf roams. Wolves are NOT grid tiles (they don't collapse), so they ride as their
## own Node2D over the board. A SCARED wolf reads dimmer (it won't eat this turn). Pure _draw (no
## textures) so it is headless-safe; the Board frees + rebuilds these whenever the wolf set changes.
class _WolfMarker extends Node2D:
	var radius: float = 24.0
	var scared: bool = false

	func _draw() -> void:
		var body := Color(0.30, 0.30, 0.34) if not scared else Color(0.55, 0.55, 0.60, 0.65)
		var snout := Color(0.18, 0.18, 0.22) if not scared else Color(0.40, 0.40, 0.46, 0.6)
		# Two ears (triangles) poking up from the head.
		var ear_l := PackedVector2Array([
			Vector2(-radius * 0.6, -radius * 0.5), Vector2(-radius * 0.2, -radius * 1.1), Vector2(-radius * 0.05, -radius * 0.45)])
		var ear_r := PackedVector2Array([
			Vector2(radius * 0.6, -radius * 0.5), Vector2(radius * 0.2, -radius * 1.1), Vector2(radius * 0.05, -radius * 0.45)])
		draw_colored_polygon(ear_l, body)
		draw_colored_polygon(ear_r, body)
		# Head + muzzle.
		draw_circle(Vector2.ZERO, radius * 0.8, body)
		draw_circle(Vector2(0, radius * 0.25), radius * 0.42, snout)
		# Two eye glints (skip when scared — eyes shut/averted).
		if not scared:
			draw_circle(Vector2(-radius * 0.3, -radius * 0.1), radius * 0.12, Color(0.95, 0.85, 0.30))
			draw_circle(Vector2(radius * 0.3, -radius * 0.1), radius * 0.12, Color(0.95, 0.85, 0.30))

## T11 — a mole-marker overlay: a round brown burrower with a pink snout, two paddle paws, and tiny
## eyes, drawn over the cell the Giant Mole roams. Like the wolf the mole is NOT a grid tile (it
## doesn't collapse), so it rides as its own Node2D over the board, consuming adjacent tiles + hopping.
## Pure _draw (no textures) so it is headless-safe; the Board frees + rebuilds it whenever the mole moves.
class _MoleMarker extends Node2D:
	var radius: float = 24.0

	func _draw() -> void:
		var body := Color(0.42, 0.30, 0.20)        # earthy mole-brown
		var snout := Color(0.86, 0.56, 0.58)       # pink nose
		var paw := Color(0.34, 0.24, 0.16)         # darker digging paws
		# Two big paddle paws flanking the body (digging claws).
		draw_circle(Vector2(-radius * 0.7, radius * 0.35), radius * 0.32, paw)
		draw_circle(Vector2(radius * 0.7, radius * 0.35), radius * 0.32, paw)
		# Round body.
		draw_circle(Vector2.ZERO, radius * 0.82, body)
		# Pink snout at the bottom-front.
		draw_circle(Vector2(0, radius * 0.42), radius * 0.30, snout)
		# Two beady eyes.
		draw_circle(Vector2(-radius * 0.26, -radius * 0.05), radius * 0.10, Color(0.10, 0.08, 0.08))
		draw_circle(Vector2(radius * 0.26, -radius * 0.05), radius * 0.10, Color(0.10, 0.08, 0.08))
