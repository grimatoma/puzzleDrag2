class_name Tile
extends Node2D
## A single board tile. Its visual is resolved through the three asset-pipeline
## stages (docs/godot-migration-plan.html §assets), newest first, so each stage
## is a clean drop-in over the previous one with NO change to the board:
##
##   Stage 3 (v2, M4+) res://assets/tiles/v2/<key>.tres  -> AnimatedSprite2D "idle"
##   Stage 2 (v1)      res://assets/tiles/<key>.png       -> flat texture (_draw)
##   Stage 1           Constants.color_for(tile)          -> procedural placeholder
##
## <key> is the canonical item key from Constants.STRING_KEYS. A tile with a v2
## SpriteFrames animates; one with only a v1 PNG is static; one with neither
## still renders (placeholder), so the board is never blank. The board only ever
## calls the small public interface — setup() / set_size_px() / set_selected() —
## and reads `tile_type`; it is unaware which stage produced the pixels.

var tile_type: int = Constants.EMPTY
var size_px: float = 96.0
var _selected: bool = false
var _tex: Texture2D = null               ## v1 PNG; null when v2 or placeholder
var _anim: AnimatedSprite2D = null       ## present only for v2 (animated) tiles

## Loaded visuals shared across all tiles, keyed by Constants.Tile. The board
## churns tile nodes hard on every collapse/refill, so caching keeps that path
## off ResourceLoader. Misses are cached too (a missing/unimported asset is
## recorded as null), so a failed load is never retried.
static var _tex_cache: Dictionary = {}
static var _frames_cache: Dictionary = {}

func setup(t: int, s: float) -> void:
	tile_type = t
	size_px = s
	_apply_visual()
	queue_redraw()

## Pick the highest available stage for this tile type and build its node(s).
func _apply_visual() -> void:
	if _anim != null:
		_anim.queue_free()
		_anim = null
	_tex = null
	if tile_type == Constants.EMPTY:
		return
	var frames: SpriteFrames = _frames_for(tile_type)
	if frames != null:
		_anim = AnimatedSprite2D.new()
		_anim.sprite_frames = frames
		_anim.centered = true
		_anim.z_index = -1                 # sit under the _draw() selection ring
		add_child(_anim)
		if frames.has_animation(&"idle"):
			_anim.play(&"idle")
		_scale_anim()
	else:
		_tex = _texture_for(tile_type)

## Stage 3: v2 animated SpriteFrames, or null if none authored for this tile.
static func _frames_for(t: int) -> SpriteFrames:
	if _frames_cache.has(t):
		return _frames_cache[t]
	var frames: SpriteFrames = null
	var key: String = Constants.string_key(t)
	if key != "":
		var path: String = "res://assets/tiles/v2/%s.tres" % key
		if ResourceLoader.exists(path):
			frames = load(path) as SpriteFrames
	_frames_cache[t] = frames
	return frames

## Stage 2: v1 flat PNG, or null to fall back to the Stage-1 placeholder.
static func _texture_for(t: int) -> Texture2D:
	if _tex_cache.has(t):
		return _tex_cache[t]
	var tex: Texture2D = null
	var key: String = Constants.string_key(t)
	if key != "":
		var path: String = "res://assets/tiles/%s.png" % key
		if ResourceLoader.exists(path):
			tex = load(path) as Texture2D
	_tex_cache[t] = tex
	return tex

## Scale a v2 AnimatedSprite2D so its native frame fills the current cell.
func _scale_anim() -> void:
	if _anim == null or _anim.sprite_frames == null:
		return
	var tex: Texture2D = _anim.sprite_frames.get_frame_texture(&"idle", 0)
	if tex != null:
		var native: float = float(maxi(tex.get_width(), tex.get_height()))
		if native > 0.0:
			_anim.scale = Vector2.ONE * (size_px / native)

func set_size_px(s: float) -> void:
	size_px = s
	_scale_anim()
	queue_redraw()

## Highlight / un-highlight while the tile is part of an in-progress chain.
func set_selected(on: bool) -> void:
	if _selected != on:
		_selected = on
		queue_redraw()

func _draw() -> void:
	if tile_type == Constants.EMPTY:
		return
	# The body comes from the AnimatedSprite2D child (v2); otherwise draw it here.
	if _anim == null:
		if _tex != null:
			_draw_textured()
		else:
			_draw_placeholder()
	if _selected:
		_draw_selection_ring()

## v1 PNG: draw the exported tile texture filling the cell. The PNG carries its
## own transparent margin + soft shadow, which forms the gap between tiles.
func _draw_textured() -> void:
	var rect := Rect2(-size_px / 2.0, -size_px / 2.0, size_px, size_px)
	draw_texture_rect(_tex, rect, false)

## Stage-1 fallback: the original procedural colored rounded square with a soft
## top-highlight band for a little depth.
func _draw_placeholder() -> void:
	var pad: float = size_px * 0.07
	var s: float = size_px - pad * 2.0
	var rect := Rect2(-s / 2.0, -s / 2.0, s, s)
	var col: Color = Constants.color_for(tile_type)
	draw_rect(rect, col, true)
	var hi := Rect2(rect.position, Vector2(rect.size.x, rect.size.y * 0.34))
	draw_rect(hi, col.lightened(0.16), true)
	draw_rect(rect, col.darkened(0.30), false, maxf(2.0, size_px * 0.03))

## White frame drawn on top of any visual while the tile is selected.
func _draw_selection_ring() -> void:
	var inset: float = size_px * 0.05
	var ring := Rect2(
		-size_px / 2.0 + inset, -size_px / 2.0 + inset,
		size_px - inset * 2.0, size_px - inset * 2.0)
	draw_rect(ring, Color(1, 1, 1, 0.95), false, maxf(3.0, size_px * 0.06))
