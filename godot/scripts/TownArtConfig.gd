class_name TownArtConfig
extends RefCounted
## Art registry for the top-down Stardew-style village (town-map rebuild Phase 0).
## The single lookup every village renderer goes through: art id -> texture +
## placement metadata (footprint in ground tiles, floor anchor in texture px).
##
## SOURCE OF TRUTH: res://assets/town/manifest.json, written by
## godot/tools/slice_town_assets.py alongside the curated PNGs under
## assets/town/stock/{ground,buildings,characters,decor}/. Each entry:
##   file:      String       — path relative to assets/town/ ("stock/buildings/mill.png")
##   w, h:      int          — texture size in px (gate-tested against the real PNG)
##   footprint: [tw, th]     — ground tiles the sprite occupies (16 px cells)
##   anchor:    [ax, ay]     — the sprite's floor-center-bottom point in texture px;
##                             a renderer places cell-floor-center at the anchor
##                             (e.g. Sprite2D.offset = -anchor) so taller art rises
##                             ABOVE its footprint and Y-sorts correctly
##   kind:      String       — "ground" | "building" | "character" | "decor" | "landmark"
##   source/license          — attribution metadata (see assets/town/CREDITS.md)
## Character entries additionally carry the walk-sheet frame grid
## (frame_w / frame_h / columns / rows) Phase 3 builds SpriteFrames from.
##
## RESOLUTION mirrors scenes/Tile.gd's tier philosophy: texture_for() returns
## null for an unknown/missing id and callers draw their procedural fallback —
## a shape with no committed art still renders (BuildingArt stays the fallback
## for plots; "portal" intentionally ships NO bitmap). Phase 5 swaps the art
## set by flipping SOURCE to "pixellab": resolution then tries
## assets/town/pixellab/<rest-of-path> first and falls back to the committed
## stock slice per id, so a partial PixelLab drop is always safe.
##
## The manifest is parsed ONCE (static cache) and the json file is whitelisted
## in export_presets.cfg include_filter so the Web export ships it.
## Registered as a `class_name` global (like Constants / TownConfig): pure data,
## no Node, instantiable in headless tests.

## Ground tile edge in px — the village grid cell size everything else is
## measured in (footprints in TILE cells, world positions at cell * TILE).
const TILE: int = 16

const MANIFEST_PATH: String = "res://assets/town/manifest.json"
const ART_ROOT: String = "res://assets/town/"

## Active art set: the first path component tried under assets/town/. Phase 5
## flips this to "pixellab" once generated art lands; any id missing from the
## new set falls back to its committed stock slice (see _candidate_paths).
static var SOURCE: String = "stock"

## Ground-kind paint table: VillageLayout ground kind -> manifest art id.
## build_tileset() creates ONE single-tile TileSetAtlasSource per kind, with
## source id = the kind's index in GROUND_KIND_ORDER and the tile always at
## atlas coords (0,0) — so painting is simply
##   set_cell(cell, TownArtConfig.ground_source_id(kind), Vector2i.ZERO)
const GROUND_KINDS: Dictionary = {
	"grass": "ground_grass",
	"grass_flowers": "ground_grass_flowers",
	"path": "ground_path",
	"plaza": "ground_plaza",
	"water": "ground_water",
	"pad": "ground_pad",
}
## Stable source-id order for build_tileset(). Index == TileSet source id.
const GROUND_KIND_ORDER: Array = ["grass", "grass_flowers", "path", "plaza", "water", "pad"]

static var _entries_cache: Dictionary = {}
static var _entries_loaded: bool = false
## art id -> Texture2D (misses cached as null so a failed load never retries).
static var _tex_cache: Dictionary = {}

# ── Manifest access ──────────────────────────────────────────────────────────

## Parsed manifest entries (id -> entry Dictionary), loaded once. Empty when the
## manifest is missing/corrupt — every accessor then degrades to its fallback.
static func _entries() -> Dictionary:
	if _entries_loaded:
		return _entries_cache
	_entries_loaded = true
	var f := FileAccess.open(MANIFEST_PATH, FileAccess.READ)
	if f == null:
		push_warning("TownArtConfig: cannot open %s" % MANIFEST_PATH)
		return _entries_cache
	var parsed: Variant = JSON.parse_string(f.get_as_text())
	if parsed is Dictionary and (parsed as Dictionary).get("entries") is Dictionary:
		_entries_cache = (parsed as Dictionary)["entries"]
	else:
		push_warning("TownArtConfig: malformed manifest at %s" % MANIFEST_PATH)
	return _entries_cache

## True when `art_id` names a manifest entry.
static func has_art(art_id: String) -> bool:
	return _entries().has(art_id)

## The full manifest entry for `art_id` (a COPY, so callers can't mutate the
## cache), or {} for an unknown id.
static func entry(art_id: String) -> Dictionary:
	if not has_art(art_id):
		return {}
	return (_entries()[art_id] as Dictionary).duplicate(true)

## All character art ids (kind == "character"), sorted — Phase 3 builds one
## villager NPC SpriteFrames per id from the entry's frame grid.
static func character_ids() -> Array[String]:
	var out: Array[String] = []
	for id: String in _entries().keys():
		if String((_entries()[id] as Dictionary).get("kind", "")) == "character":
			out.append(id)
	out.sort()
	return out

# ── Placement metadata ───────────────────────────────────────────────────────

## Ground tiles `art_id` occupies, in TILE cells. (1,1) for unknown ids — the
## safe minimum, matching the procedural-fallback draw size.
static func footprint_of(art_id: String) -> Vector2i:
	if not has_art(art_id):
		return Vector2i.ONE
	var fp: Array = (_entries()[art_id] as Dictionary).get("footprint", [1, 1])
	if fp.size() != 2:
		return Vector2i.ONE
	return Vector2i(maxi(1, int(fp[0])), maxi(1, int(fp[1])))

## The sprite's floor-center-bottom point in texture px. A renderer aligns this
## point with the footprint's floor center (Sprite2D.offset = -anchor with
## centered = false). Texture center-bottom for unknown ids.
static func anchor_of(art_id: String) -> Vector2:
	if not has_art(art_id):
		return Vector2.ZERO
	var e: Dictionary = _entries()[art_id]
	var a: Array = e.get("anchor", [])
	if a.size() != 2:
		return Vector2(float(int(e.get("w", TILE))) / 2.0, float(int(e.get("h", TILE))))
	return Vector2(float(a[0]), float(a[1]))

# ── Texture resolution ───────────────────────────────────────────────────────

## Candidate res:// paths for an entry's relative file, ACTIVE SOURCE first,
## committed stock slice as the fallback. The manifest stores stock-relative
## paths ("stock/<dir>/<id>.png"); a non-stock SOURCE swaps the leading
## directory component ("pixellab/<dir>/<id>.png").
static func _candidate_paths(rel_file: String) -> Array[String]:
	var out: Array[String] = []
	var parts: PackedStringArray = rel_file.split("/")
	if SOURCE != "stock" and parts.size() > 1:
		var swapped: PackedStringArray = parts.duplicate()
		swapped[0] = SOURCE
		out.append(ART_ROOT + "/".join(swapped))
	out.append(ART_ROOT + rel_file)
	return out

## The texture for `art_id`, or NULL when the id is unknown or no candidate
## file loads — callers treat null as "draw the procedural fallback" (the same
## graceful degradation as Tile.gd's Stage-1 placeholder). Hits AND misses are
## cached; flipping SOURCE at runtime calls clear_cache() first.
static func texture_for(art_id: String) -> Texture2D:
	if _tex_cache.has(art_id):
		return _tex_cache[art_id]
	var tex: Texture2D = null
	if has_art(art_id):
		var rel: String = String((_entries()[art_id] as Dictionary).get("file", ""))
		if rel != "":
			for path: String in _candidate_paths(rel):
				if ResourceLoader.exists(path):
					var res: Resource = load(path)
					if res is Texture2D:
						tex = res
						break
	_tex_cache[art_id] = tex
	return tex

## Drop the texture + manifest caches (tests / a runtime SOURCE flip).
static func clear_cache() -> void:
	_tex_cache.clear()
	_entries_cache = {}
	_entries_loaded = false

# ── Ground TileSet ───────────────────────────────────────────────────────────

## TileSet source id for a VillageLayout ground kind (-1 for unknown kinds).
static func ground_source_id(kind: String) -> int:
	return GROUND_KIND_ORDER.find(kind)

## Build the square 16×16 ground TileSet in code (no editor authoring): one
## single-tile TileSetAtlasSource per GROUND_KIND_ORDER entry, source id =
## index, tile at atlas coords (0,0). No terrain-set/autotile machinery —
## VillageLayout paints explicit cells per kind. A kind whose texture fails to
## load is skipped with a warning (the painter then leaves those cells on the
## default grass layer fill).
static func build_tileset() -> TileSet:
	var ts := TileSet.new()
	ts.tile_size = Vector2i(TILE, TILE)
	for kind: String in GROUND_KIND_ORDER:
		var tex: Texture2D = texture_for(String(GROUND_KINDS[kind]))
		if tex == null:
			push_warning("TownArtConfig.build_tileset: no texture for ground kind '%s'" % kind)
			continue
		var src := TileSetAtlasSource.new()
		src.texture = tex
		src.texture_region_size = Vector2i(TILE, TILE)
		src.create_tile(Vector2i.ZERO)
		ts.add_source(src, ground_source_id(kind))
	return ts
