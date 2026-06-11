extends SceneTree
## Headless tests for the building-art SHAPE config + boss-target LABELS.
##
## History: Batch 7 moved the per-building art `shape` onto the BuildingConfig
## catalog ROW; the town-map rebuild Phase 2 then deleted the old BuildingArt
## renderer, leaving BuildingConfig.shape_of(id) as the ONE shape accessor (the
## VillageScreen resolves it to TownArtConfig art). This suite locks the row
## mappings byte-for-byte so a regression that changes a drawn building family
## or a HUD pill label fails the gate.
##
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_building_art_config_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Coverage:
##   1. For EVERY build id, BuildingConfig.shape_of(id) returns the SAME shape
##      the old BuildingArt.SHAPE_BY_ID carried (the 25 row pairs pinned below);
##      an unknown id falls back to "house".
##   2. Every shape a row names resolves to REAL TownArtConfig stock art (the
##      VillageScreen render contract — no silent flat-square buildings).
##   3. BossConfig.target_label(res) returns the six expected short labels + the
##      exact `trim_prefix("tile_").capitalize()` fallback for an unknown key.

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
	# ── 1. Every build-id row → its locked shape, via BuildingConfig.shape_of ──
	# The 25 id→shape pairs as they existed in the old BuildingArt.SHAPE_BY_ID
	# (minus its two non-row "portal" aliases, which died with the old renderer —
	# the Magic Portal remains a GameState special-case, not a catalog row).
	# DO NOT drop any mapping.
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
	}
	_check(expected_shape.size() == 25, "locked shape table has 25 row keys (got %d)" % expected_shape.size())
	for key in expected_shape:
		var want: String = expected_shape[key]
		var got: String = BuildingConfig.shape_of(key)
		_check(got == want, "shape_of('%s') == '%s' (got '%s')" % [key, want, got])
	# Every catalog id is covered by the locked table (a NEW building must be
	# added here deliberately, with its shape choice reviewed).
	for id in BuildingConfig.ALL_BUILD_IDS:
		_check(expected_shape.has(String(id)),
			"build id '%s' is covered by the locked shape table" % id)

	# ── 2. Every row shape resolves to REAL TownArtConfig stock art ──
	for id in BuildingConfig.ALL_BUILD_IDS:
		var sh: String = BuildingConfig.shape_of(String(id))
		_check(sh != "", "shape_of('%s') is non-empty (got '%s')" % [id, sh])
		_check(TownArtConfig.has_art(sh),
			"shape_of('%s') == '%s' has stock art (VillageScreen render contract)" % [id, sh])
	_check(BuildingConfig.shape_of("totally_unknown_building") == "house",
		"shape_of(unknown id) falls back to 'house'")
	_check(BuildingConfig.shape_of("") == "house", "shape_of('') falls back to 'house'")
	_check(TownArtConfig.has_art("house"), "the 'house' fallback shape has stock art")

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
