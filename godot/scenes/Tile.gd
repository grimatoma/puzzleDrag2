class_name Tile
extends Node2D
## A single board tile — Stage-1 placeholder visual (a colored rounded square
## drawn procedurally). In asset-pipeline Stage 2 the _draw() body is replaced
## by a Sprite2D texture and the rest of this class is unchanged; the board
## only ever calls the small public interface below.

var tile_type: int = Constants.EMPTY
var size_px: float = 96.0
var _selected: bool = false

func setup(t: int, s: float) -> void:
	tile_type = t
	size_px = s
	queue_redraw()

func set_size_px(s: float) -> void:
	size_px = s
	queue_redraw()

## Highlight / un-highlight while the tile is part of an in-progress chain.
func set_selected(on: bool) -> void:
	if _selected != on:
		_selected = on
		queue_redraw()

func _draw() -> void:
	if tile_type == Constants.EMPTY:
		return
	var pad: float = size_px * 0.07
	var s: float = size_px - pad * 2.0
	var rect := Rect2(-s / 2.0, -s / 2.0, s, s)
	var col: Color = Constants.color_for(tile_type)

	# Body + a soft top highlight band for a little depth.
	draw_rect(rect, col, true)
	var hi := Rect2(rect.position, Vector2(rect.size.x, rect.size.y * 0.34))
	draw_rect(hi, col.lightened(0.16), true)
	draw_rect(rect, col.darkened(0.30), false, maxf(2.0, size_px * 0.03))

	if _selected:
		var ring := rect.grow(maxf(2.0, size_px * 0.02))
		draw_rect(ring, Color(1, 1, 1, 0.95), false, maxf(3.0, size_px * 0.06))
