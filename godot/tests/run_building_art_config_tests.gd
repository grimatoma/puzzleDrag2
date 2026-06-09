extends SceneTree
## Headless tests for Batch-7 config migration: the per-building art `shape` field now
## lives on the BuildingConfig catalog ROW (read via BuildingConfig.shape_of /
## BuildingArt.shape_for), and the boss-target short LABELS now live on each boss's
## target definition in BossConfig (read via BossConfig.target_label). Both moves are
## BEHAVIOR-PRESERVING — this suite locks the old mappings byte-for-byte so a regression
## that changes a drawn silhouette or a HUD pill label fails the gate.
##
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_building_art_config_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Coverage:
##   1. For EVERY key in the OLD BuildingArt.SHAPE_BY_ID (the 27 pairs hardcoded below),
##      BuildingArt.shape_for(key) returns the SAME shape it did before the move — incl.
##      the non-row aliases "magic_portal"/"portal" → "portal".
##   2. Every BuildingConfig build id resolves to a shape in BuildingArt.KNOWN_SHAPES
##      (so the existing "never an unknown shape" contract still holds via the new path),
##      and an unknown id falls back to "house".
##   3. BossConfig.target_label(res) returns the six expected short labels + the exact
##      `trim_prefix("tile_").capitalize()` fallback for an unknown key.

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
	print("\n── Building-art shape + boss-target-label config tests ──")
	_run()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

func _run() -> void:
	# ── 1. Every OLD SHAPE_BY_ID key → its old shape, via the new shape_for() path ──
	# The 27 key→shape pairs as they existed in BuildingArt.SHAPE_BY_ID BEFORE the move.
	# shape_for() must return the SAME value for every one of these (rows carry their
	# shape on the BuildingConfig row; the two non-row Portal aliases resolve via the
	# tiny BuildingArt.SHAPE_ALIASES map). DO NOT drop any mapping.
	var expected_shape := {
		"lumber_camp": "lumber",
		"coop": "coop",
		"garden": "garden",
		"bakery": "cookhouse",
		"kitchen": "cookhouse",
		"larder": "cellar",
		"smokehouse": "smokehut",
		"workshop": "workshop",
		"forge": "forge",
		"mill": "mill",
		"granary": "rotunda",
		"silo": "silo",
		"barn": "barn",
		"sawmill": "sawmill",
		"stable": "stable",
		"apiary": "skep",
		"chapel": "chapel",
		"observatory": "observatory",
		"powder_store": "bunker",
		"mining_camp": "mine",
		"housing": "cottage",
		"housing2": "cottage",
		"housing3": "cottage",
		"ratcatcher": "hut",
		"master_ratcatcher": "hut",
		"magic_portal": "portal",
		"portal": "portal",
	}
	_check(expected_shape.size() == 27, "old SHAPE_BY_ID had 27 keys (got %d)" % expected_shape.size())
	for key in expected_shape:
		var want: String = expected_shape[key]
		var got: String = BuildingArt.shape_for(key)
		_check(got == want, "shape_for('%s') == '%s' (got '%s')" % [key, want, got])

	# ── 2. Every BuildingConfig id resolves to a KNOWN shape; unknown → "house" ──
	var known := {}
	for s in BuildingArt.KNOWN_SHAPES:
		known[s] = true
	for id in BuildingConfig.ALL_BUILD_IDS:
		var sh: String = BuildingArt.shape_for(String(id))
		_check(sh != "", "shape_for('%s') is non-empty (got '%s')" % [id, sh])
		_check(known.has(sh), "shape_for('%s') == '%s' is a KNOWN shape" % [id, sh])
		# The shape on the row equals what shape_for resolves (no alias for real rows).
		_check(BuildingConfig.shape_of(String(id)) == sh,
			"BuildingConfig.shape_of('%s') matches shape_for ('%s')" % [id, sh])
	_check(BuildingArt.shape_for("totally_unknown_building") == "house",
		"shape_for(unknown id) falls back to 'house'")
	_check(BuildingArt.shape_for("") == "house", "shape_for('') falls back to 'house'")
	_check(BuildingConfig.shape_of("totally_unknown_building") == "house",
		"BuildingConfig.shape_of(unknown id) falls back to 'house'")

	# ── 3. BossConfig.target_label — six expected labels + the capitalize fallback ──
	var expected_label := {
		"tile_tree_oak": "Oak",
		"tile_grass_grass": "Hay",
		"tile_mine_stone": "Stone",
		"tile_fruit_blackberry": "Berry",
		"iron_bar": "Iron",
		"fish_fillet": "Fish",
	}
	for res in expected_label:
		var want: String = expected_label[res]
		var got: String = BossConfig.target_label(res)
		_check(got == want, "target_label('%s') == '%s' (got '%s')" % [res, want, got])
	# Every boss target resource is one of the six labelled keys (no boss target is missed).
	for bid in BossConfig.BOSS_IDS:
		var tr: String = BossConfig.target_resource(bid)
		_check(expected_label.has(tr), "boss '%s' target '%s' is a labelled key" % [bid, tr])
	# Unknown key → exact old fallback: res.trim_prefix("tile_").capitalize().
	var fb_in := "tile_veg_carrot"
	var fb_expect: String = fb_in.trim_prefix("tile_").capitalize()
	_check(BossConfig.target_label(fb_in) == fb_expect,
		"target_label('%s') falls back to '%s' (got '%s')" % [fb_in, fb_expect, BossConfig.target_label(fb_in)])
	# A bare (no tile_ prefix) unknown key capitalizes as-is.
	_check(BossConfig.target_label("widget") == "Widget",
		"target_label('widget') → 'Widget' (bare-key capitalize)")
