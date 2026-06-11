extends SceneTree
## Headless gate tests for the top-down village foundation (town-map rebuild
## Phase 0): the curated stock art under assets/town/, the TownArtConfig
## registry, the VillageLayout cell catalog, and the code-built ground TileSet.
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_town_assets_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## NOTE: assets must be imported first (godot --headless --path godot --import),
## otherwise texture lookups miss and the texture checks fail.

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Town asset + village layout tests ─────────────")
	_test_manifest_entries_load()
	_test_building_shape_coverage()
	_test_characters()
	_test_registry_fallbacks()
	_test_layout_plots_and_stages()
	_test_layout_no_overlaps()
	_test_layout_walkable_connected()
	_test_layout_decor_and_flowers()
	_test_stage_filtered_accessors()
	_test_stage_for_plot_count()
	_test_ground_tileset()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── assertion helper ────────────────────────────────────────────────────────

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

# ── manifest: every entry resolves to a real texture ────────────────────────

func _test_manifest_entries_load() -> void:
	_check(TownArtConfig.TILE == 16, "TILE is 16 px")
	var ids: Array = []
	for id in TownArtConfig._entries().keys():
		ids.append(String(id))
	_check(ids.size() >= 45, "manifest has >= 45 entries (got %d)" % ids.size())
	var kinds_seen: Dictionary = {}
	for id: String in ids:
		var e: Dictionary = TownArtConfig.entry(id)
		kinds_seen[String(e.get("kind", ""))] = true
		var tex: Texture2D = TownArtConfig.texture_for(id)
		_check(tex != null, "texture loads: %s" % id)
		if tex == null:
			continue
		_check(tex.get_width() == int(e.get("w", -1)) and tex.get_height() == int(e.get("h", -1)),
			"manifest w/h match the real texture: %s (%dx%d)" % [id, tex.get_width(), tex.get_height()])
		var a: Vector2 = TownArtConfig.anchor_of(id)
		_check(a.x >= 0.0 and a.x <= float(tex.get_width()) and a.y >= 0.0 and a.y <= float(tex.get_height()),
			"anchor within texture bounds: %s %s" % [id, a])
		var fp: Vector2i = TownArtConfig.footprint_of(id)
		_check(fp.x >= 1 and fp.y >= 1, "footprint >= (1,1): %s %s" % [id, fp])
		_check(String(e.get("license", "")) in ["CC0", "CC-BY 4.0"],
			"entry carries a known license: %s" % id)
	for kind in ["ground", "building", "character", "decor", "landmark"]:
		_check(kinds_seen.has(kind), "manifest covers kind '%s'" % kind)
	# The street lamp the Phase-0 spec promised (auto-covered above once
	# present; this pins its existence + kind so it can't silently drop out).
	_check(TownArtConfig.has_art("lamp")
		and String(TownArtConfig.entry("lamp").get("kind", "")) == "decor",
		"the 'lamp' decor slice ships in the manifest")

# ── every BuildingConfig shape has art or falls back cleanly ────────────────

func _test_building_shape_coverage() -> void:
	var shapes: Dictionary = {}
	for id in BuildingConfig.ALL_BUILD_IDS:
		shapes[BuildingConfig.shape_of(id)] = true
	shapes["house"] = true  # the generic fallback shape is art-bearing too
	for shape: String in shapes.keys():
		_check(TownArtConfig.has_art(shape),
			"BuildingConfig shape '%s' has stock art" % shape)
	# A KNOWN_SHAPES member without art (portal) must fall back cleanly:
	# has_art false -> texture_for null, no error, defaults from the accessors.
	for shape: String in BuildingArt.KNOWN_SHAPES:
		if TownArtConfig.has_art(shape):
			continue
		_check(TownArtConfig.texture_for(shape) == null,
			"art-less shape '%s' resolves to null (procedural fallback)" % shape)
	# The three board landmarks ship art.
	for lm in ["board_farm", "board_mine", "board_fish"]:
		_check(TownArtConfig.texture_for(lm) != null, "landmark art loads: %s" % lm)

# ── characters: walk-sheet frame grids Phase 3 builds SpriteFrames from ─────

func _test_characters() -> void:
	var ids: Array[String] = TownArtConfig.character_ids()
	_check(ids.size() >= 4, "at least 4 character sheets (got %d)" % ids.size())
	for id: String in ids:
		var e: Dictionary = TownArtConfig.entry(id)
		var fw: int = int(e.get("frame_w", 0))
		var fh: int = int(e.get("frame_h", 0))
		_check(fw > 0 and fh > 0, "%s declares a frame grid (%dx%d)" % [id, fw, fh])
		if fw <= 0 or fh <= 0:
			continue
		var w: int = int(e.get("w", 0))
		var h: int = int(e.get("h", 0))
		_check(w % fw == 0 and h % fh == 0,
			"%s sheet size %dx%d divides into %dx%d frames" % [id, w, h, fw, fh])
		var cols: PackedStringArray = String(e.get("columns", "")).split(",")
		_check(cols.size() == int(float(w) / float(fw)),
			"%s declares one facing per frame column" % id)
		for facing in ["down", "up", "left", "right"]:
			_check(cols.has(facing), "%s has facing column '%s'" % [id, facing])

# ── registry fallbacks for unknown ids ───────────────────────────────────────

func _test_registry_fallbacks() -> void:
	_check(not TownArtConfig.has_art("no_such_art"), "unknown id: has_art false")
	_check(TownArtConfig.texture_for("no_such_art") == null, "unknown id: texture null")
	_check(TownArtConfig.footprint_of("no_such_art") == Vector2i.ONE, "unknown id: footprint (1,1)")
	_check(TownArtConfig.anchor_of("no_such_art") == Vector2.ZERO, "unknown id: anchor ZERO")
	_check(TownArtConfig.entry("no_such_art").is_empty(), "unknown id: empty entry")
	_check(TownArtConfig.ground_source_id("no_such_kind") == -1, "unknown ground kind: -1")

# ── layout: plots + stage bands ──────────────────────────────────────────────

func _test_layout_plots_and_stages() -> void:
	var plots: Array = VillageLayout.plots()
	_check(plots.size() >= 33, "at least 33 plots (got %d)" % plots.size())
	var prev_stage: int = 1
	var non_decreasing := true
	for p: Dictionary in plots:
		var s: int = int(p["stage"])
		if s < prev_stage:
			non_decreasing = false
		prev_stage = maxi(prev_stage, s)
		if s < 1 or s > VillageLayout.MAX_STAGE:
			_check(false, "plot stage in range: %s" % str(p))
	_check(non_decreasing, "plot order: stages are non-decreasing")
	_check(int(VillageLayout.STAGE_PLOT_CAPACITY.back()) == plots.size(),
		"final stage capacity equals total plot count")
	for s in range(1, VillageLayout.MAX_STAGE + 1):
		var n := 0
		for p: Dictionary in plots:
			if int(p["stage"]) <= s:
				n += 1
		_check(n == int(VillageLayout.STAGE_PLOT_CAPACITY[s - 1]),
			"cumulative plots through stage %d == capacity %d (got %d)"
			% [s, int(VillageLayout.STAGE_PLOT_CAPACITY[s - 1]), n])

# ── layout: nothing overlaps ─────────────────────────────────────────────────

func _test_layout_no_overlaps() -> void:
	var ground: Dictionary = VillageLayout.ground_cells()
	var water: Dictionary = _to_set(ground["water"])
	var plaza: Dictionary = _to_set(ground["plaza"])
	var path: Dictionary = _to_set(ground["path"])
	# Ground kinds are pairwise disjoint.
	var disjoint := true
	for c in path.keys():
		if water.has(c) or plaza.has(c):
			disjoint = false
	for c in plaza.keys():
		if water.has(c):
			disjoint = false
	_check(disjoint, "ground kinds (water/plaza/path) are pairwise disjoint")
	# Plot cells: in bounds, unique, and never on path/plaza/water/landmarks.
	var plot_cells: Dictionary = {}
	var ok_bounds := true
	var ok_unique := true
	var ok_terrain := true
	for p: Dictionary in VillageLayout.plots():
		for c: Vector2i in VillageLayout.footprint_cells(p["cell"], p["footprint"]):
			if not VillageLayout.in_bounds(c):
				ok_bounds = false
			if plot_cells.has(c):
				ok_unique = false
			plot_cells[c] = true
			if water.has(c) or plaza.has(c) or path.has(c):
				ok_terrain = false
	_check(ok_bounds, "every plot cell is in bounds")
	_check(ok_unique, "no two plots overlap")
	_check(ok_terrain, "no plot sits on path/plaza/water")
	# Landmarks: in bounds, off plots/paths/plaza; only the dock touches water.
	var lms: Dictionary = VillageLayout.landmarks()
	_check(lms.size() == 3 and lms.has("board_farm") and lms.has("board_mine") and lms.has("board_fish"),
		"landmarks are exactly board_farm / board_mine / board_fish")
	for id: String in lms.keys():
		var lm: Dictionary = lms[id]
		var on_plot := false
		var on_path := false
		var on_water := false
		var lm_in_bounds := true
		for c: Vector2i in VillageLayout.footprint_cells(lm["cell"], lm["footprint"]):
			if not VillageLayout.in_bounds(c):
				lm_in_bounds = false
			if plot_cells.has(c):
				on_plot = true
			if path.has(c) or plaza.has(c):
				on_path = true
			if water.has(c):
				on_water = true
		_check(lm_in_bounds, "landmark in bounds: %s" % id)
		_check(not on_plot, "landmark off plots: %s" % id)
		_check(not on_path, "landmark off paths/plaza: %s" % id)
		if id == "board_fish":
			_check(on_water, "the dock boat touches the river")
		else:
			_check(not on_water, "landmark off water: %s" % id)

# ── layout: the walkable region is one connected component ──────────────────

func _test_layout_walkable_connected() -> void:
	var walkable: Array[Vector2i] = VillageLayout.walkable_cells()
	_check(walkable.size() > 0, "walkable region is non-empty (%d cells)" % walkable.size())
	if walkable.is_empty():
		return
	var walk_set: Dictionary = _to_set(walkable)
	# Flood-fill from the first walkable cell.
	var seen: Dictionary = {}
	var stack: Array[Vector2i] = [walkable[0]]
	seen[walkable[0]] = true
	while not stack.is_empty():
		var c: Vector2i = stack.pop_back()
		for d in [Vector2i.RIGHT, Vector2i.LEFT, Vector2i.DOWN, Vector2i.UP]:
			var n: Vector2i = c + d
			if walk_set.has(n) and not seen.has(n):
				seen[n] = true
				stack.append(n)
	_check(seen.size() == walkable.size(),
		"walkable region is ONE connected component (%d of %d reached)"
		% [seen.size(), walkable.size()])
	# is_walkable agrees with the cell list + blocks water/plots/OOB.
	_check(VillageLayout.is_walkable(walkable[0]), "is_walkable true for a walkable cell")
	_check(not VillageLayout.is_walkable(Vector2i(-1, 0)), "is_walkable false out of bounds")
	_check(not VillageLayout.is_walkable(VillageLayout.WATER_RECT.position), "water not walkable")
	var p0: Dictionary = VillageLayout.plots()[0]
	_check(not VillageLayout.is_walkable(p0["cell"]), "plot cells not walkable")
	_check(VillageLayout.is_walkable(VillageLayout.PLAZA_RECT.position), "plaza is walkable")
	# Every plot fronts the walk grid: >= 1 walkable neighbor cell.
	var all_adjacent := true
	for p: Dictionary in VillageLayout.plots():
		var found := false
		for c: Vector2i in VillageLayout.footprint_cells(p["cell"], p["footprint"]):
			for d in [Vector2i.RIGHT, Vector2i.LEFT, Vector2i.DOWN, Vector2i.UP]:
				if walk_set.has(c + d):
					found = true
		if not found:
			all_adjacent = false
			_check(false, "plot at %s touches a walkable cell" % str(p["cell"]))
	_check(all_adjacent, "every plot touches >= 1 walkable cell")

# ── layout: decor + flower paint sit on legal cells ──────────────────────────

func _test_layout_decor_and_flowers() -> void:
	var ground: Dictionary = VillageLayout.ground_cells()
	var water: Dictionary = _to_set(ground["water"])
	var plaza: Dictionary = _to_set(ground["plaza"])
	var path: Dictionary = _to_set(ground["path"])
	var blocked_non_water: Dictionary = {}
	for p: Dictionary in VillageLayout.plots():
		for c: Vector2i in VillageLayout.footprint_cells(p["cell"], p["footprint"]):
			blocked_non_water[c] = true
	var lms: Dictionary = VillageLayout.landmarks()
	for id: String in lms.keys():
		for c: Vector2i in VillageLayout.footprint_cells(lms[id]["cell"], lms[id]["footprint"]):
			blocked_non_water[c] = true
	var decor: Array = VillageLayout.decor()
	_check(decor.size() >= 20, "decor catalog has >= 20 entries (got %d)" % decor.size())
	var seen_cells: Dictionary = {}
	for d: Dictionary in decor:
		var id: String = String(d["art_id"])
		var c: Vector2i = d["cell"]
		var s: int = int(d["stage"])
		_check(TownArtConfig.has_art(id), "decor art exists: %s" % id)
		_check(VillageLayout.in_bounds(c), "decor in bounds: %s %s" % [id, c])
		_check(s >= 1 and s <= VillageLayout.MAX_STAGE, "decor stage in range: %s" % id)
		_check(not blocked_non_water.has(c) and not water.has(c),
			"decor off plots/landmarks/water: %s %s" % [id, c])
		_check(not seen_cells.has(c), "decor cells are unique: %s %s" % [id, c])
		seen_cells[c] = true
	# grass_flowers variant cells must be PLAIN grass (no double paint).
	for c: Vector2i in ground["grass_flowers"]:
		_check(VillageLayout.in_bounds(c) and not water.has(c) and not plaza.has(c)
			and not path.has(c) and not blocked_non_water.has(c) and not seen_cells.has(c),
			"grass_flowers cell is plain grass: %s" % c)

# ── stage-filtered accessors: thin wrappers over plots()/decor()/ground ─────

func _test_stage_filtered_accessors() -> void:
	# plots_for_stage matches the cumulative capacity ladder at both ends.
	_check(VillageLayout.plots_for_stage(1).size() == int(VillageLayout.STAGE_PLOT_CAPACITY[0]),
		"plots_for_stage(1) == stage-1 capacity")
	_check(VillageLayout.plots_for_stage(VillageLayout.MAX_STAGE).size() == VillageLayout.plots().size(),
		"plots_for_stage(MAX_STAGE) == every plot")
	for p: Dictionary in VillageLayout.plots_for_stage(2):
		if int(p["stage"]) > 2:
			_check(false, "plots_for_stage(2) leaked a stage-%d plot" % int(p["stage"]))
	# decor_for_stage is monotone non-decreasing and tops out at decor().
	var prev := 0
	var monotone := true
	for s in range(1, VillageLayout.MAX_STAGE + 1):
		var n: int = VillageLayout.decor_for_stage(s).size()
		if n < prev:
			monotone = false
		prev = n
	_check(monotone, "decor_for_stage counts are non-decreasing over stages")
	_check(VillageLayout.decor_for_stage(VillageLayout.MAX_STAGE).size() == VillageLayout.decor().size(),
		"decor_for_stage(MAX_STAGE) == full decor catalog")
	# ground_cell agrees with ground_cells() and defaults to grass.
	_check(VillageLayout.ground_cell(VillageLayout.PLAZA_RECT.position) == "plaza",
		"ground_cell: plaza corner reads 'plaza'")
	_check(VillageLayout.ground_cell(VillageLayout.WATER_RECT.position) == "water",
		"ground_cell: river cell reads 'water'")
	_check(VillageLayout.ground_cell(Vector2i(2, 13)) == "path",
		"ground_cell: Main Street cell reads 'path'")
	_check(VillageLayout.ground_cell(Vector2i(0, 0)) == "grass",
		"ground_cell: unlisted cell defaults to 'grass'")

# ── stage_for_plot_count: monotone band lookup ───────────────────────────────

func _test_stage_for_plot_count() -> void:
	_check(VillageLayout.stage_for_plot_count(0) == 1, "0 plots -> stage 1")
	_check(VillageLayout.stage_for_plot_count(5) == 1, "5 plots -> stage 1")
	_check(VillageLayout.stage_for_plot_count(6) == 2, "6 plots -> stage 2")
	_check(VillageLayout.stage_for_plot_count(10) == 2, "10 plots -> stage 2")
	_check(VillageLayout.stage_for_plot_count(25) == 5, "25 plots -> stage 5")
	_check(VillageLayout.stage_for_plot_count(33) == 5, "33 plots -> stage 5")
	_check(VillageLayout.stage_for_plot_count(99) == VillageLayout.MAX_STAGE,
		"overflow clamps to MAX_STAGE")
	var monotone := true
	var prev := 1
	for n in range(0, 41):
		var s: int = VillageLayout.stage_for_plot_count(n)
		if s < prev:
			monotone = false
		prev = s
	_check(monotone, "stage_for_plot_count is monotone over 0..40")

# ── ground TileSet builds with every kind resolvable ─────────────────────────

func _test_ground_tileset() -> void:
	var ts: TileSet = TownArtConfig.build_tileset()
	_check(ts != null, "build_tileset returns a TileSet")
	if ts == null:
		return
	_check(ts.tile_size == Vector2i(16, 16), "tile size is 16x16")
	_check(ts.get_source_count() >= 1, "TileSet has >= 1 source")
	for kind: String in TownArtConfig.GROUND_KIND_ORDER:
		var sid: int = TownArtConfig.ground_source_id(kind)
		_check(sid >= 0, "ground kind '%s' has a source id" % kind)
		_check(ts.has_source(sid), "TileSet has source for '%s'" % kind)
		if ts.has_source(sid):
			var src: TileSetAtlasSource = ts.get_source(sid)
			_check(src.has_tile(Vector2i.ZERO), "source '%s' has its (0,0) tile" % kind)
	# Every ground kind VillageLayout paints must be a TownArtConfig kind.
	for kind: String in VillageLayout.ground_cells().keys():
		_check(TownArtConfig.GROUND_KINDS.has(kind),
			"layout ground kind '%s' is paintable" % kind)
	_check(TownArtConfig.GROUND_KINDS.has("grass"), "the implicit default 'grass' is paintable")
	_check(TownArtConfig.GROUND_KINDS.has("pad"), "the empty-plot 'pad' kind is paintable")

# ── helpers ──────────────────────────────────────────────────────────────────

func _to_set(arr: Array) -> Dictionary:
	var out: Dictionary = {}
	for c in arr:
		out[c] = true
	return out
