class_name ChainOverlay
extends Node2D
## The signature orange/gold chain-path overlay — a glowing line threaded through
## the dragged tiles plus a node at each cell, ported from the React+Phaser game's
## drag visual. It draws ON TOP of the board's tile nodes (the board gives it a high
## z_index) and is a SIBLING of the tiles inside the Board, so it shares Board-local
## space: the points fed in are already `Board._cell_center(c, r)` values.
##
## The Board owns the data; this node just stores the latest path + validity and
## redraws. It survives the board's collapse/refill churn (Board._build_tiles only
## frees Tile children), so its reference stays stable across moves.

var _points: Array = []            ## Array[Vector2] of Board-local cell centres
var _valid: bool = false           ## chain length ≥ board.min_chain?
var _tile_size: float = 96.0       ## drives line/node thickness (set with the path)

## Replace the drawn path. `points` are Board-local centres; `valid` toggles the
## warm-gold (valid) vs muddy-rust (too short) styling. `tile_size` scales the
## stroke widths and node radii so the path reads at any board size.
func set_path(points: Array, valid: bool, tile_size: float = 96.0) -> void:
	_points = points
	_valid = valid
	_tile_size = maxf(8.0, tile_size)
	queue_redraw()

func _draw() -> void:
	if _points.is_empty():
		return

	var line_col: Color = Palette.CHAIN_VALID_LINE if _valid else Palette.CHAIN_BAD_LINE
	var node_col: Color = Palette.CHAIN_VALID_NODE if _valid else Palette.CHAIN_BAD_NODE
	var halo_col := node_col
	halo_col.a = 0.5

	var halo_w: float = _tile_size * 0.16
	var core_w: float = _tile_size * 0.09
	var outer_r: float = _tile_size * 0.16
	var inner_r: float = _tile_size * 0.09

	# Connecting line: a soft glowing halo, then a crisp core on top. draw_polyline
	# needs at least two points; a single-cell chain renders only its node.
	if _points.size() >= 2:
		var pts := PackedVector2Array(_points)
		draw_polyline(pts, halo_col, halo_w, true)
		draw_polyline(pts, line_col, core_w, true)

	# A two-ring node at every cell: bright outer disc + warm core.
	for p in _points:
		draw_circle(p, outer_r, node_col)
		draw_circle(p, inner_r, line_col)
