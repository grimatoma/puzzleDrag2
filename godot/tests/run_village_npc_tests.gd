extends SceneTree
## Headless tests for the Phase-3 walking villagers (VillageNpcs): the
## AStarGrid2D over VillageLayout.walkable_cells(), the deterministic seeded
## spawn scaled by stage, the shared per-character SpriteFrames, the wander
## FSM driven manually via step() (the _process path is GUARDED OFF headless),
## and the VillageScreen integration (own y-sorted layer + visibility forward
## + the toast-on-hide fix).
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_village_npc_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

var _checks: int = 0
var _failures: int = 0

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _initialize() -> void:
	print("\n── VillageNpcs (town-map rebuild Phase 3) tests ───")
	await _run()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

## A spawn fingerprint for determinism checks: per-villager "cell|char_id".
func _spawn_fingerprint(npcs: VillageNpcs) -> Array:
	var out: Array = []
	for v in npcs._villagers:
		out.append("%s|%s" % [str(v.cell), v.char_id])
	return out

func _run() -> void:
	var walk_set: Dictionary = {}
	for c in VillageLayout.walkable_cells():
		walk_set[c] = true

	# ── 1. A* grid wiring ──────────────────────────────────────────────────────
	var npcs := VillageNpcs.new()
	root.add_child(npcs)
	npcs.setup(5, 12345)
	_check(npcs._astar != null, "setup() builds the AStarGrid2D")
	_check(npcs._astar.diagonal_mode == AStarGrid2D.DIAGONAL_MODE_NEVER,
		"grid is 4-connected (DIAGONAL_MODE_NEVER)")
	_check(npcs._astar.region == Rect2i(Vector2i.ZERO, VillageLayout.grid_size()),
		"grid region covers the full village grid")

	# Plaza → far street (the farm spur's west end) routes, stays walkable, and
	# every step is 4-connected.
	var far: Array[Vector2i] = npcs.path_between(Vector2i(16, 13), Vector2i(5, 22))
	_check(far.size() >= 2, "plaza → farm-spur path exists (%d cells)" % far.size())
	var on_walkable := true
	var four_connected := true
	for i in range(far.size()):
		if not walk_set.has(far[i]):
			on_walkable = false
		if i > 0 and absi(far[i].x - far[i - 1].x) + absi(far[i].y - far[i - 1].y) != 1:
			four_connected = false
	_check(on_walkable, "every plaza→farm path cell is in the walkable set")
	_check(four_connected, "plaza→farm path steps are unit Manhattan moves")

	# Several seeded random pairs: a path always exists (the walkable region is
	# ONE gate-tested component) and never leaves the walkable set.
	var rng := RandomNumberGenerator.new()
	rng.seed = 99
	var walkable: Array[Vector2i] = VillageLayout.walkable_cells()
	var pairs_ok := true
	for _i in range(12):
		var a: Vector2i = walkable[rng.randi_range(0, walkable.size() - 1)]
		var b: Vector2i = walkable[rng.randi_range(0, walkable.size() - 1)]
		if a == b:
			continue
		var p: Array[Vector2i] = npcs.path_between(a, b)
		if p.size() < 2 or p[0] != a or p[p.size() - 1] != b:
			pairs_ok = false
		for c in p:
			if not walk_set.has(c):
				pairs_ok = false
	_check(pairs_ok, "12 seeded random walkable pairs all route on walkable cells only")

	# ── 2. Solids: plots / water / landmarks are unroutable ───────────────────
	var plot_cell: Vector2i = (VillageLayout.plots()[0] as Dictionary)["cell"]
	var water_cell := Vector2i(34, 10)
	var mine_cell: Vector2i = (VillageLayout.landmarks()["board_mine"] as Dictionary)["cell"]
	for solid in [plot_cell, water_cell, mine_cell]:
		_check(npcs._astar.is_point_solid(solid), "non-walkable cell %s is SOLID" % str(solid))
	_check(npcs.path_between(Vector2i(16, 13), plot_cell).is_empty(),
		"path targeting a plot pad cell yields []")
	_check(npcs.path_between(Vector2i(16, 13), water_cell).is_empty(),
		"path targeting a water cell yields []")
	_check(npcs.path_between(Vector2i(-3, 2), Vector2i(16, 13)).is_empty(),
		"out-of-bounds endpoints yield []")

	# Streets are preferred: grass cells carry the documented weight scale.
	_check(npcs._astar.get_point_weight_scale(Vector2i(1, 1))
			== VillageNpcs.GRASS_WEIGHT
		and npcs._astar.get_point_weight_scale(Vector2i(16, 13)) == 1.0,
		"grass weighted %.1f, street cells 1.0" % VillageNpcs.GRASS_WEIGHT)

	# ── 3. Spawn scaling + determinism ─────────────────────────────────────────
	_check(VillageNpcs.spawn_count(1) == 4 and VillageNpcs.spawn_count(2) == 6
		and VillageNpcs.spawn_count(4) == 10,
		"spawn formula 2 + 2·stage (stage 1 → 4, 2 → 6, 4 → 10)")
	_check(VillageNpcs.spawn_count(5) == VillageNpcs.MAX_VILLAGERS
		and VillageNpcs.spawn_count(99) == VillageNpcs.MAX_VILLAGERS,
		"cap respected: stage 5 and beyond → %d" % VillageNpcs.MAX_VILLAGERS)

	_check(npcs._villagers.size() == VillageNpcs.spawn_count(5)
		and npcs.get_child_count() == npcs._villagers.size(),
		"stage-5 instance spawned %d villagers (one node each)" % VillageNpcs.spawn_count(5))
	# Every spawn lands on a street cell (path/plaza ⊂ walkable).
	var street_set: Dictionary = {}
	var ground: Dictionary = VillageLayout.ground_cells()
	for kind in ["path", "plaza"]:
		for c in ground[kind]:
			street_set[c] = true
	var spawn_on_street := true
	var spawn_cells_distinct: Dictionary = {}
	for v in npcs._villagers:
		if not street_set.has(v.cell):
			spawn_on_street = false
		spawn_cells_distinct[v.cell] = true
	_check(spawn_on_street, "every villager spawns on a street (path/plaza) cell")
	_check(spawn_cells_distinct.size() == npcs._villagers.size(),
		"spawn cells are distinct")

	# Same (seed, stage) → identical crowd, even on a separate instance.
	var twin := VillageNpcs.new()
	root.add_child(twin)
	twin.setup(5, 12345)
	_check(_spawn_fingerprint(twin) == _spawn_fingerprint(npcs),
		"same seed+stage → identical spawn (cells + character ids)")
	twin.queue_free()

	# Same-stage set_stage is a NO-OP (no respawn — node identity preserved);
	# a different stage respawns at the new count.
	var first_node: Node = npcs.get_child(0)
	npcs.set_stage(5)
	_check(npcs.get_child_count() > 0 and npcs.get_child(0) == first_node,
		"set_stage(same) does NOT respawn (node identity kept)")
	npcs.set_stage(1)
	_check(npcs._villagers.size() == VillageNpcs.spawn_count(1),
		"set_stage(1) respawned at the stage-1 count (%d)" % VillageNpcs.spawn_count(1))
	npcs.set_stage(5)

	# ── 4. Shared SpriteFrames ─────────────────────────────────────────────────
	_check(VillageNpcs.frames_for("villager_a") == VillageNpcs.frames_for("villager_a"),
		"frames_for() returns the cached instance on repeat calls")
	# 12 villagers cycle 6 character ids → duplicates guaranteed; duplicates
	# must reference the IDENTICAL SpriteFrames resource.
	var by_char: Dictionary = {}
	var shared_ok := true
	var dup_found := false
	for v in npcs._villagers:
		if by_char.has(v.char_id):
			dup_found = true
			if not (v.sprite.sprite_frames == by_char[v.char_id]):
				shared_ok = false
		else:
			by_char[v.char_id] = v.sprite.sprite_frames
	_check(dup_found and shared_ok,
		"villagers with the same character share the IDENTICAL SpriteFrames")
	# The animation set: walk_ + idle_ per facing, walk anims carry the sheet's
	# 4 rows, idle just the first frame.
	var sf: SpriteFrames = VillageNpcs.frames_for("villager_a")
	var anims_ok := true
	for facing in ["down", "up", "left", "right"]:
		if not sf.has_animation("walk_" + facing) or not sf.has_animation("idle_" + facing):
			anims_ok = false
			continue
		if sf.get_frame_count("walk_" + facing) != 4 or sf.get_frame_count("idle_" + facing) != 1:
			anims_ok = false
	_check(anims_ok, "frames carry walk_×4-frame + idle_×1-frame per facing")
	# Sprite hygiene: NEAREST, centered=false, per-frame floor anchor as offset.
	var sprites_ok := true
	for v in npcs._villagers:
		if v.sprite.centered or v.sprite.texture_filter != CanvasItem.TEXTURE_FILTER_NEAREST \
				or v.sprite.offset != -TownArtConfig.anchor_of(v.char_id):
			sprites_ok = false
	_check(sprites_ok, "every sprite: centered=false, NEAREST, offset = -frame anchor")

	# ── 5. Wander FSM via manual step() ───────────────────────────────────────
	# Headless guard FIRST: _process must be a no-op (UiFx.is_active() is false
	# on the headless display server), positions + states untouched.
	var before: Array = []
	for v in npcs._villagers:
		before.append([v.node.position, v.state, v.pause_left])
	npcs._process(0.5)
	var untouched := true
	for i in range(npcs._villagers.size()):
		var v: VillageNpcs.Villager = npcs._villagers[i]
		if v.node.position != before[i][0] or v.state != before[i][1] \
				or v.pause_left != before[i][2]:
			untouched = false
	_check(untouched, "headless guard: _process(0.5) moves/changes NOTHING")

	# Drive the FSM manually: after the initial pause (≤ PAUSE_MAX) every
	# villager has begun walking at least once.
	var v0: VillageNpcs.Villager = npcs._villagers[0]
	_check(v0.state == VillageNpcs.STATE_IDLE and v0.pause_left > 0.0,
		"villagers spawn IDLE with a staggered pause")
	npcs.step(VillageNpcs.PAUSE_MAX + 0.01)
	_check(v0.state == VillageNpcs.STATE_WALK and v0.path.size() >= 2,
		"after the pause the villager picked a path and entered WALK")
	_check(String(v0.sprite.animation).begins_with("walk_"),
		"walking villager plays a walk_<facing> animation")
	# The chosen path is walkable end-to-end and starts at the spawn cell.
	var path_ok := true
	for c in v0.path:
		if not walk_set.has(c):
			path_ok = false
	_check(path_ok and v0.path[0] == v0.cell,
		"the wander path starts at the villager's cell and stays walkable")
	# Facing matches the FIRST segment's axis (4-connected → unambiguous).
	var seg: Vector2i = v0.path[1] - v0.path[0]
	var want_facing: String
	if seg.x != 0:
		want_facing = "right" if seg.x > 0 else "left"
	else:
		want_facing = "down" if seg.y > 0 else "up"
	_check(v0.facing == want_facing and String(v0.sprite.animation) == "walk_" + want_facing,
		"facing + walk anim match the segment axis (%s)" % want_facing)

	# One small step moves TOWARD the next cell's floor point by speed·dt.
	var start_pos: Vector2 = v0.node.position
	var target_pt: Vector2 = v0.points[v0.seg]
	var d_before: float = start_pos.distance_to(target_pt)
	npcs.step(0.1)
	var moved: float = start_pos.distance_to(v0.node.position)
	_check(moved > 0.0 and absf(moved - VillageNpcs.WANDER_SPEED * 0.1) < 0.5,
		"step(0.1) advanced ~%.1f px (got %.2f)" % [VillageNpcs.WANDER_SPEED * 0.1, moved])
	_check(v0.node.position.distance_to(target_pt) < d_before,
		"movement closes on the next cell-floor point")

	# Walk to arrival (bounded): lands EXACTLY on the target floor point, back
	# to IDLE with a pause in (0, PAUSE_MAX], idle anim faces the last heading.
	var arrived := false
	for _i in range(2000):
		npcs.step(1.0 / 30.0)
		if v0.state == VillageNpcs.STATE_IDLE:
			arrived = true
			break
	var dest: Vector2i = v0.path[v0.path.size() - 1]
	_check(arrived, "villager 0 arrives within the step budget")
	_check(v0.cell == dest
		and v0.node.position == VillageNpcs.cell_floor_pos(dest),
		"arrival lands exactly on the target cell's floor point")
	_check(v0.pause_left > 0.0 and v0.pause_left <= VillageNpcs.PAUSE_MAX,
		"arrival re-enters IDLE with a 0.4–1.8 s pause (%.2f)" % v0.pause_left)
	_check(String(v0.sprite.animation) == "idle_" + v0.facing,
		"paused villager plays idle_<last facing>")

	# Soak: 30 simulated seconds keep EVERY villager on/between walkable cells
	# (sampled via their logical cell + exact floor-point checks on idle).
	var soak_ok := true
	for _i in range(900):
		npcs.step(1.0 / 30.0)
		for v in npcs._villagers:
			if not walk_set.has(v.cell):
				soak_ok = false
			if v.state == VillageNpcs.STATE_IDLE \
					and v.node.position != VillageNpcs.cell_floor_pos(v.cell):
				soak_ok = false
	_check(soak_ok, "30 s soak: logical cells stay walkable; idlers rest on floor points")
	npcs.queue_free()

	# ── 6. VillageScreen integration ──────────────────────────────────────────
	var game := GameState.new()
	var screen := VillageScreen.new()
	root.add_child(screen)
	screen.setup(game)
	screen.open()
	await process_frame
	_check(screen._npcs != null and screen._npcs.get_parent() == screen._world,
		"screen builds the NPC layer under World")
	_check(screen._npcs.y_sort_enabled, "NPC layer is y-sorted (sorts against Buildings)")
	_check(screen._npcs._villagers.size() == VillageNpcs.spawn_count(screen._render_stage),
		"screen crowd size (%d) matches spawn_count(stage %d)"
		% [screen._npcs._villagers.size(), screen._render_stage])
	_check(screen._npcs.is_processing(), "open() screen → NPC processing running")
	# refresh() with an unchanged stage must not respawn the crowd.
	var crowd_node: Node = screen._npcs.get_child(0)
	screen.refresh()
	_check(screen._npcs.get_child(0) == crowd_node, "refresh() (same stage) keeps the crowd")

	# Toast-on-hide fix: a lingering layer-5 toast dies when Main hides the
	# screen via `.visible = false` (the _switch_primary_view path, NOT close()).
	screen._notice("locked!")
	_check(screen._toast != null and screen._toast.is_showing(),
		"notice toast showing before the hide")
	screen.visible = false
	_check(not screen._toast.is_showing(), "hiding the SCREEN dismisses the nested toast")
	_check(not screen._npcs.is_processing(), "hidden screen → NPC processing paused")
	screen.open()
	_check(screen._npcs.is_processing(), "re-open resumes NPC processing")

	screen.queue_free()
	await process_frame
