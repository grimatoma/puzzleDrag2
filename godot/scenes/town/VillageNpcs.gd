class_name VillageNpcs
extends Node2D
## Town-map rebuild Phase 3 — ambient walking villagers on the village streets.
##
## A self-contained y-sorted layer VillageScreen adds under its World node (a
## sibling of Props/Buildings, so villager sprites Y-sort against building
## sprites by their shared floor-line convention). Owns everything NPC:
##   · an AStarGrid2D over VillageLayout.walkable_cells() (4-connected, no
##     diagonals; plots / water / landmarks are solid)
##   · a deterministic seeded spawn — same (seed, stage) always produces the
##     same crowd (cells + character ids), so headless tests can assert it
##   · a per-villager wander FSM: IDLE(pause 0.4–1.8 s) → pick a random
##     walkable target → get_id_path → WALK the cell-floor polyline at
##     WANDER_SPEED → arrive → IDLE again
##   · ONE statically-cached SpriteFrames per character id (walk_/idle_ ×
##     down/up/left/right), built from TownArtConfig.character_sheet() — every
##     villager of the same character shares the resource instance
##
## COORDINATES: the grid works in CELL space (cell_size = Vector2.ONE) and
## movement converts to world px only at the polyline edge — a cell's world
## point is its floor-center-bottom ((x+0.5)·TILE, (y+1)·TILE), the SAME
## convention VillageScreen._floor_pos uses for buildings/decor, so villagers
## and buildings sort by the same floor line.
##
## STREET BIAS: villagers SPAWN on street cells (path + plaza) and the grid
## gives plain-grass cells a higher A* weight (GRASS_WEIGHT), so routes prefer
## the streets while still allowed to cut across open grass.
##
## HEADLESS / MOTION GUARD: _process ticks the FSM only when UiFx.is_active()
## (the house gate for continuous self-driven effects — false headless, under
## the visual harness's UiFx.enabled = false pin, and under the player's
## Reduce Motion preference), so tests never see frame-driven movement. Tests
## drive the FSM deterministically via step(delta) instead. VillageScreen also
## forwards its own visibility through set_running() so a hidden screen costs
## zero _process work.
##
## PERFORMANCE: a path's world polyline is precomputed ONCE when the path is
## chosen (PackedVector2Array); the per-frame walk loop only compares/moves
## vectors — zero allocations, O(villagers) per tick.

const TILE := TownArtConfig.TILE

## Wander speed in world px/s (≈1.4 cells/s). The old plan-space screen walked
## 26 px/s across a 1280px-wide town; on this 576px-wide 16px-tile world that
## gait reads right around ~22 — tuned visually against the cover-fit zoom.
const WANDER_SPEED := 22.0
## Arrival pause range (seconds) — the old ambient-folk feel numbers.
const PAUSE_MIN := 0.4
const PAUSE_MAX := 1.8
## Walk-cycle playback rate (frames/s) for the 4-frame stock sheets.
const WALK_FPS := 7.0
## Crowd cap, whatever the stage formula says.
const MAX_VILLAGERS := 12
## A* weight for plain-grass cells (streets stay 1.0) — villagers prefer the
## paths/plaza but may still shortcut across open grass.
const GRASS_WEIGHT := 2.0
## Default crowd seed (VillageScreen uses it; tests pass explicit seeds).
const DEFAULT_SEED := 113

## The villager wander FSM's states (named enum, matching the house style).
enum State { IDLE, WALK }

## One ambient villager: its scene nodes + wander-FSM state. Pure data holder —
## all behavior lives on VillageNpcs so the FSM is steppable headless.
class Villager:
	extends RefCounted
	var node: Node2D                    ## positioned at the CURRENT floor point
	var sprite: AnimatedSprite2D
	var char_id: String = ""
	var cell: Vector2i = Vector2i.ZERO  ## last cell reached (logical position)
	var state: State = State.IDLE
	var pause_left: float = 0.0         ## IDLE countdown
	var path: Array[Vector2i] = []      ## current path's cells (head == start)
	var points: PackedVector2Array = [] ## the path as world floor points
	var seg: int = 0                    ## index into points we're walking toward
	var facing: String = "down"

## ONE SpriteFrames per (art SOURCE, character id), shared by every villager of
## that character (and across screens — the sheets are immutable art). Keyed by
## TownArtConfig.SOURCE so a runtime art-set flip (set_source("pixellab"))
## naturally re-resolves frames against the new sheets instead of serving stale
## stock atlases — the cache key carries the dependency, so TownArtConfig never
## has to reach DOWN into this scene class to invalidate us.
static var _frames_cache: Dictionary = {}
## The flat placeholder frame used when a sheet texture is unavailable
## (headless-without-import) — the same graceful tier as Tile.gd / _make_sprite.
static var _fallback_frame_tex: Texture2D = null

var _astar: AStarGrid2D = null
var _walkable: Array[Vector2i] = []        ## every walkable cell (target pool)
var _street: Array[Vector2i] = []          ## path + plaza cells (spawn pool)
var _rng := RandomNumberGenerator.new()
var _seed_base: int = DEFAULT_SEED
var _stage: int = 0                        ## 0 = never spawned
var _villagers: Array[Villager] = []

func _init() -> void:
	y_sort_enabled = true
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST

# ── lifecycle ─────────────────────────────────────────────────────────────────

## Build the A* grid (once — the walkable catalog is static) and spawn the
## crowd for `stage`. Safe to call again; respawns only when the stage changed.
func setup(stage: int, rng_seed: int = DEFAULT_SEED) -> void:
	_seed_base = rng_seed
	if _astar == null:
		_build_grid()
	set_stage(stage)

## Respawn the crowd when the rendered stage changes (VillageScreen.refresh()
## calls this every pass — a same-stage call is a no-op so refreshes never
## scatter the walkers).
func set_stage(stage: int) -> void:
	if stage == _stage and not _villagers.is_empty():
		return
	_stage = stage
	_respawn()

## VillageScreen forwards its own visibility here so a hidden screen spends
## zero _process time on NPCs (Main hides primary views via `.visible = false`).
func set_running(on: bool) -> void:
	set_process(on)

## Crowd size for a growth stage: 2 + 2·stage, capped at MAX_VILLAGERS —
## stage 1 → 4, 2 → 6, 3 → 8, 4 → 10, 5 → 12 (the cap). Monotone, so the
## village visibly busies up as it grows.
static func spawn_count(stage: int) -> int:
	return mini(MAX_VILLAGERS, 2 + 2 * maxi(1, stage))

# ── A* grid ───────────────────────────────────────────────────────────────────

## AStarGrid2D over the village catalog: region = the full grid, CELL
## coordinates (cell_size = ONE — world conversion happens only at the
## movement edge), 4-connected with Manhattan heuristics, everything solid
## except walkable_cells(), grass weighted above streets.
func _build_grid() -> void:
	_walkable = VillageLayout.walkable_cells()
	var street_set: Dictionary = {}
	var ground: Dictionary = VillageLayout.ground_cells()
	for kind in ["path", "plaza"]:
		for c in ground[kind]:
			street_set[c] = true
	_street = []
	for c in _walkable:
		if street_set.has(c):
			_street.append(c)

	_astar = AStarGrid2D.new()
	_astar.region = Rect2i(Vector2i.ZERO, VillageLayout.grid_size())
	_astar.cell_size = Vector2.ONE
	_astar.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_NEVER
	_astar.default_compute_heuristic = AStarGrid2D.HEURISTIC_MANHATTAN
	_astar.default_estimate_heuristic = AStarGrid2D.HEURISTIC_MANHATTAN
	_astar.update()
	_astar.fill_solid_region(_astar.region, true)
	for c in _walkable:
		_astar.set_point_solid(c, false)
		if not street_set.has(c):
			_astar.set_point_weight_scale(c, GRASS_WEIGHT)

## Cell path from `from` to `to` (inclusive), or [] when either end is out of
## bounds / solid or no route exists. The headless test surface for the grid.
func path_between(from: Vector2i, to: Vector2i) -> Array[Vector2i]:
	if _astar == null or not _astar.is_in_boundsv(from) or not _astar.is_in_boundsv(to):
		return []
	if _astar.is_point_solid(from) or _astar.is_point_solid(to):
		return []
	return _astar.get_id_path(from, to)

## A cell's world floor point — floor-center-bottom, the SAME convention as
## VillageScreen._floor_pos(cell, ONE), so villagers y-sort on the building
## floor line.
static func cell_floor_pos(cell: Vector2i) -> Vector2:
	return Vector2((float(cell.x) + 0.5) * float(TILE), float(cell.y + 1) * float(TILE))

# ── spawning ──────────────────────────────────────────────────────────────────

## Tear down and respawn the crowd for the current stage. DETERMINISTIC: the
## RNG is re-seeded from (seed, stage) first, so the same pair always yields
## the same cells + character ids (test-asserted); the wander FSM keeps
## drawing from the same RNG afterwards, which doesn't disturb spawn identity.
func _respawn() -> void:
	for v in _villagers:
		v.node.queue_free()
	_villagers = []
	_rng.seed = hash("village_npcs:%d:%d" % [_seed_base, _stage])

	var ids: Array[String] = TownArtConfig.character_ids()
	var count: int = spawn_count(_stage)
	# Distinct spawn cells drawn from the street pool (true swap-remove
	# sampling: O(1) removal — overwrite the pick with the tail, pop the
	# tail); villagers start ON the streets, where the crowd reads best.
	var pool: Array[Vector2i] = _street.duplicate()
	var id_offset: int = _rng.randi_range(0, maxi(1, ids.size()) - 1)
	for i in range(count):
		if pool.is_empty():
			break
		var pick: int = _rng.randi_range(0, pool.size() - 1)
		var cell: Vector2i = pool[pick]
		pool[pick] = pool[pool.size() - 1]
		pool.pop_back()
		var char_id: String = ids[(id_offset + i) % ids.size()] if not ids.is_empty() else ""
		_spawn_villager(i, char_id, cell)

func _spawn_villager(index: int, char_id: String, cell: Vector2i) -> void:
	var v := Villager.new()
	v.char_id = char_id
	v.cell = cell
	v.state = State.IDLE
	# Staggered first pause so the crowd doesn't move in lockstep on open.
	v.pause_left = _rng.randf_range(PAUSE_MIN, PAUSE_MAX)
	v.facing = "down"

	v.node = Node2D.new()
	v.node.name = "villager_%d_%s" % [index, char_id]
	v.node.position = cell_floor_pos(cell)

	v.sprite = AnimatedSprite2D.new()
	v.sprite.sprite_frames = frames_for(char_id)
	v.sprite.centered = false
	v.sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	# PER-FRAME floor anchor (8,15 on the stock 16×16 frames): pin it to the
	# node's floor point, exactly like _make_sprite pins building anchors.
	# character_sheet() owns the per-frame default; the literal here only
	# covers the {} sheet of an unknown/empty char id.
	var sheet: Dictionary = TownArtConfig.character_sheet(char_id)
	var anchor: Vector2 = sheet.get("anchor", Vector2(TILE / 2.0, float(TILE) - 1.0))
	v.sprite.offset = -anchor
	v.sprite.play("idle_down")
	v.node.add_child(v.sprite)

	add_child(v.node)
	_villagers.append(v)

# ── shared SpriteFrames ───────────────────────────────────────────────────────

## The shared SpriteFrames for a character id — built ONCE per (SOURCE, id)
## and cached statically, so every villager of that character references the
## IDENTICAL resource (and an art-set flip rebuilds against the new sheets —
## see the _frames_cache note). Animations: walk_<facing> (all sheet rows,
## looped at WALK_FPS) and idle_<facing> (the first row only) for each facing
## column the sheet declares. When the sheet texture is unavailable — or a
## declared facing column / frame row would overrun the real texture — that
## frame degrades to the flat placeholder (the house procedural-fallback
## tier), keeping the animation NAMES intact so the FSM never special-cases
## missing art.
static func frames_for(char_id: String) -> SpriteFrames:
	var cache_key: String = "%s|%s" % [TownArtConfig.SOURCE, char_id]
	if _frames_cache.has(cache_key):
		return _frames_cache[cache_key]
	var sheet: Dictionary = TownArtConfig.character_sheet(char_id)
	var facings: Array[String] = []
	if sheet.get("facings") is Array:
		facings.assign(sheet["facings"])
	if facings.is_empty():
		facings.assign(["down", "up", "left", "right"])
	var rows: int = maxi(1, int(sheet.get("rows", 1)))
	var fw: int = maxi(1, int(sheet.get("frame_w", TILE)))
	var fh: int = maxi(1, int(sheet.get("frame_h", TILE)))
	var tex: Texture2D = sheet.get("texture", null)
	# Clamp the atlas grid to what the REAL texture holds, so a manifest that
	# declares more facings/rows than the sheet is wide/tall can never emit an
	# AtlasTexture region past the texture edge.
	var tex_cols: int = 0
	var tex_rows: int = 0
	if tex != null:
		@warning_ignore("integer_division")
		tex_cols = tex.get_width() / fw
		@warning_ignore("integer_division")
		tex_rows = tex.get_height() / fh

	var sf := SpriteFrames.new()
	sf.remove_animation("default")
	for col in range(facings.size()):
		var facing: String = facings[col]
		var walk: String = "walk_" + facing
		var idle: String = "idle_" + facing
		sf.add_animation(walk)
		sf.set_animation_speed(walk, WALK_FPS)
		sf.set_animation_loop(walk, true)
		sf.add_animation(idle)
		sf.set_animation_speed(idle, 1.0)
		sf.set_animation_loop(idle, true)
		for row in range(rows):
			var frame_tex: Texture2D
			if tex != null and col < tex_cols and row < tex_rows:
				var at := AtlasTexture.new()
				at.atlas = tex
				at.region = Rect2(float(col * fw), float(row * fh), float(fw), float(fh))
				frame_tex = at
			else:
				frame_tex = _fallback_frame()
			sf.add_frame(walk, frame_tex)
			if row == 0:
				sf.add_frame(idle, frame_tex)
	_frames_cache[cache_key] = sf
	return sf

## Drop every cached SpriteFrames (test hygiene; runtime art flips don't need
## it — the SOURCE-keyed cache already misses after set_source()).
static func clear_frames_cache() -> void:
	_frames_cache.clear()

## Flat 16×16 placeholder frame (missing-sheet fallback), built once.
static func _fallback_frame() -> Texture2D:
	if _fallback_frame_tex == null:
		var img := Image.create(TILE, TILE, false, Image.FORMAT_RGBA8)
		img.fill(Palette.INK_MID)
		_fallback_frame_tex = ImageTexture.create_from_image(img)
	return _fallback_frame_tex

# ── wander FSM ────────────────────────────────────────────────────────────────

## Frame tick — gated by the house motion probe so headless runs / the visual
## harness / Reduce Motion never tick movement. Tests call step() directly.
func _process(delta: float) -> void:
	if not UiFx.is_active():
		return
	step(delta)

## Advance every villager's FSM by `delta` seconds. Public + deterministic so
## headless tests (and capture tools) can drive walkers without _process.
func step(delta: float) -> void:
	for v in _villagers:
		match v.state:
			State.IDLE:
				v.pause_left -= delta
				if v.pause_left <= 0.0:
					_begin_wander(v)
			State.WALK:
				_step_walk(v, delta)

## Pick a random walkable target and start walking its path. A handful of
## retries shrugs off same-cell / unroutable picks (the walkable region is one
## gate-tested connected component, so retries are virtually never exhausted);
## on total failure the villager just pauses again. An EMPTY walkable catalog
## (defensive — the gate test forbids it) parks the villager in IDLE forever
## instead of indexing into nothing.
func _begin_wander(v: Villager) -> void:
	if _walkable.is_empty():
		v.pause_left = _rng.randf_range(PAUSE_MIN, PAUSE_MAX)
		return
	for _attempt in range(4):
		var target: Vector2i = _walkable[_rng.randi_range(0, _walkable.size() - 1)]
		if target == v.cell:
			continue
		var cells: Array[Vector2i] = path_between(v.cell, target)
		if cells.size() < 2:
			continue
		v.path = cells
		# Precompute the world polyline ONCE (zero per-frame allocations).
		var pts := PackedVector2Array()
		pts.resize(cells.size())
		for i in range(cells.size()):
			pts[i] = cell_floor_pos(cells[i])
		v.points = pts
		v.seg = 1
		v.state = State.WALK
		_face_toward(v, pts[1] - pts[0])
		return
	v.pause_left = _rng.randf_range(PAUSE_MIN, PAUSE_MAX)

## Move along the precomputed polyline at WANDER_SPEED, carrying overshoot
## across segment corners so speed is constant through turns. On arrival:
## land exactly on the target floor point, idle facing the last direction.
func _step_walk(v: Villager, delta: float) -> void:
	var budget: float = WANDER_SPEED * delta
	var pos: Vector2 = v.node.position
	while budget > 0.0 and v.seg < v.points.size():
		var target: Vector2 = v.points[v.seg]
		var dist: float = pos.distance_to(target)
		if dist <= budget:
			pos = target
			budget -= dist
			v.seg += 1
			if v.seg < v.points.size():
				_face_toward(v, v.points[v.seg] - pos)
		else:
			pos += (target - pos) * (budget / dist)
			budget = 0.0
	v.node.position = pos
	if v.seg >= v.points.size():
		v.cell = v.path[v.path.size() - 1]
		v.state = State.IDLE
		v.pause_left = _rng.randf_range(PAUSE_MIN, PAUSE_MAX)
		v.sprite.play("idle_" + v.facing)

## Face (and play the walk anim for) the segment direction. Segments are
## 4-connected so the dominant axis is unambiguous: x decides left/right,
## otherwise y decides up/down.
func _face_toward(v: Villager, dir: Vector2) -> void:
	if absf(dir.x) >= absf(dir.y):
		v.facing = "right" if dir.x >= 0.0 else "left"
	else:
		v.facing = "down" if dir.y >= 0.0 else "up"
	var anim: String = "walk_" + v.facing
	if v.sprite.animation != anim:
		v.sprite.play(anim)
