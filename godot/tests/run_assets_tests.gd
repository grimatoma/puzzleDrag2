extends SceneTree
## Headless tests for the asset pipeline (docs/godot-migration-plan.html §assets).
## Verifies the three-stage tile-visual resolution in scenes/Tile.gd, newest
## stage winning:
##   Stage 2 — every Farm tile has a loadable v1 PNG (res://assets/tiles/<key>.png)
##   Stage 3 — a tile with a v2 SpriteFrames (.tres) renders via AnimatedSprite2D
##   Stage 1 — a tile with neither asset falls back to the procedural placeholder
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_assets_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## NOTE: assets must be imported first (godot --headless --path godot --import),
## otherwise the v1/v2 lookups miss and the board renders Stage-1 placeholders —
## which is the intended graceful fallback, but fails the Stage-2/3 assertions.

const T := Constants.Tile

## Mirror of REQUIRED_KEYS in tools/export-v1-tiles.mjs — the Farm board tiles
## that MUST ship a committed v1 PNG.
const REQUIRED_FARM: Array = [
	T.GRASS, T.WHEAT, T.PHEASANT, T.CARROT, T.APPLE,
	T.PANSY, T.OAK, T.PIG, T.COW, T.HORSE,
]

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Asset pipeline tests ──────────────────────────")
	_test_v1_pngs_present()
	_test_hazard_tiles_have_art()
	_test_grass_uses_v1_export()
	_test_v1_tile_is_static()
	_test_placeholder_fallback()
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

func _anim_child(tile: Tile) -> AnimatedSprite2D:
	for c in tile.get_children():
		if c is AnimatedSprite2D:
			return c
	return null

# ── Stage 2: v1 PNGs ─────────────────────────────────────────────────────────

func _test_v1_pngs_present() -> void:
	for t in REQUIRED_FARM:
		var key: String = Constants.string_key(t)
		var path: String = "res://assets/tiles/%s.png" % key
		_check(ResourceLoader.exists(path), "v1 PNG present + imported: %s" % key)
		_check(load(path) is Texture2D, "v1 PNG loads as Texture2D: %s" % key)

# ── Stage 2: hazard tiles (M7a) ──────────────────────────────────────────────

## M7a: the two board hazard tiles (RAT on the farm, RUBBLE in the mine) ship a
## committed v1 PNG, so they render real art instead of the flat-grey Stage-1
## placeholder square (the dominant "looks broken" signal). Each must resolve to
## a non-null v1 Texture2D and must NOT fall back to the placeholder path.
func _test_hazard_tiles_have_art() -> void:
	for t in [T.RAT, T.RUBBLE]:
		var key: String = Constants.string_key(t)
		var path: String = "res://assets/tiles/%s.png" % key
		_check(ResourceLoader.exists(path), "v1 PNG present + imported: %s" % key)
		_check(load(path) is Texture2D, "v1 PNG loads as Texture2D: %s" % key)
		var tile := Tile.new()
		tile.setup(t, 96.0)
		root.add_child(tile)
		_check(_anim_child(tile) == null, "%s renders static (no AnimatedSprite2D)" % key)
		_check(tile._tex != null,
			"%s resolves to a real v1 texture (NOT the placeholder)" % key)
		tile.free()

# ── Stage 3 loader / grass uses the v1 export ─────────────────────────────────
# Grass previously shipped a v2 SpriteFrames fixture (a cream-tile tuft) that did
# NOT match the React/Phaser grass. It was dropped so grass renders its v1 PNG
# export (flat green stalks) like every other farm tile — a full art match. The
# 3-tier loader in Tile.gd is intact for future REAL v2 art (a tile with a v2
# .tres still animates; none ship today).

func _test_grass_uses_v1_export() -> void:
	_check(not ResourceLoader.exists("res://assets/tiles/v2/tile_grass_grass.tres"),
		"no v2 grass fixture ships (grass uses the v1 export to match React)")
	var tile := Tile.new()
	tile.setup(T.GRASS, 96.0)
	root.add_child(tile)
	_check(_anim_child(tile) == null, "GRASS renders static from its v1 PNG (no AnimatedSprite2D)")
	_check(tile._tex != null, "GRASS resolves to its v1 export texture (NOT the placeholder)")
	tile.free()

# ── Stage 2 vs 3: a v1-only tile stays static ────────────────────────────────

func _test_v1_tile_is_static() -> void:
	var v2_path: String = "res://assets/tiles/v2/%s.tres" % Constants.string_key(T.WHEAT)
	_check(not ResourceLoader.exists(v2_path), "WHEAT has no v2 asset (v1-only)")
	var tile := Tile.new()
	tile.setup(T.WHEAT, 96.0)
	root.add_child(tile)
	_check(_anim_child(tile) == null, "WHEAT renders static (no AnimatedSprite2D)")
	_check(tile._tex != null, "WHEAT uses a v1 flat texture")
	tile.free()

# ── Stage 1: placeholder fallback ────────────────────────────────────────────

func _test_placeholder_fallback() -> void:
	# An unknown tile id has no canonical key, so neither a v1 PNG nor a v2 .tres
	# can resolve -> the procedural placeholder path.
	var unknown: int = 9999
	_check(Constants.string_key(unknown) == "", "unknown tile id has no string key")
	var tile := Tile.new()
	tile.setup(unknown, 96.0)
	root.add_child(tile)
	_check(_anim_child(tile) == null, "unknown tile has no AnimatedSprite2D")
	_check(tile._tex == null, "unknown tile has no v1 texture -> placeholder path")
	tile.free()
