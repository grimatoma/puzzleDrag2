class_name ChainOverlay
extends Node2D
## The signature orange/gold chain-path overlay — a glowing line threaded through
## the dragged tiles plus a node at each cell, ported from the React+Phaser game's
## drag visual (src/GameScene.ts redrawPath + the star previews + the "grass hover"
## upgrade badge). It draws ON TOP of the board's tile nodes (the board gives it a high
## z_index) and is a SIBLING of the tiles inside the Board, so it shares Board-local
## space: the points fed in are already `Board._cell_center(c, r)` values.
##
## The Board owns the data; this node stores the latest path + the chain's STAGE/upgrade
## info and redraws. It survives the board's collapse/refill churn (Board._build_tiles only
## frees Tile children), so its reference stays stable across moves.
##
## Beyond the base path it renders the drag feedback the port lacked:
##   • a STAGE-ESCALATING path — the line tints from warm gold (stage 0) toward the chain
##     stage's accent (BONUS green → DOUBLE blue → TRIPLE purple → FRENZY red) and thickens
##     as the chain earns more upgrades, so a long chain reads visibly "hotter". (A deliberate
##     port enhancement for the "more extreme on longer chains" feel: React carries the stage
##     colour in the HUD ChainView bar; here we ALSO escalate the on-board line.)
##   • CHAIN STARS — a gold star pops at each upgrade-threshold boundary cell (one per
##     upgrade the chain will spawn), gently swaying, brighter/larger per tier;
##   • the UPGRADE HOVER MARKER — a small dark badge at the drag head showing the upgrade
##     tile's thumbnail + "×N" (N = upgrade tiles this chain yields), the React grass-hover badge.
## A soft alpha PULSE animates the whole path while a chain is held (driven by _process).

var _points: Array = []            ## Array[Vector2] of Board-local cell centres
var _valid: bool = false           ## chain length ≥ board.min_chain?
var _tile_size: float = 96.0       ## drives line/node thickness (set with the path)
var _stage: int = 0                ## chain STAGE 0..4 (Constants.chain_stage_index) → path tint/thickness
var _threshold: int = 0            ## tiles per upgrade — star placement (k*threshold-1); ≤0 → no stars
var _upg_count: int = 0            ## upgrade tiles this chain yields → star count + head-marker "×N"
var _upg_tex: Texture2D = null     ## the upgrade tile's thumbnail for the head marker (may be null)

## Animation phase, advanced each frame by _process while a chain is held; drives the soft
## path pulse + the star sway. Frozen to 0 for the deterministic visual-golden capture.
var _phase: float = 0.0
var _frozen: bool = false

## Cached font for the head-marker "×N" text (engine fallback — no asset needed).
var _font: Font = ThemeDB.fallback_font

func _ready() -> void:
	# Animate only while a chain is in flight; set_path toggles processing.
	set_process(false)

## Replace the drawn path + its escalation data. `points` are Board-local centres; `valid`
## toggles warm-gold vs muddy-rust; `tile_size` scales strokes/radii. `stage` (0..4) tints +
## thickens the path for longer chains; `threshold` + `upg_count` place the upgrade STARS and
## the head "×N" marker; `upg_tex` is the upgrade tile's thumbnail (null when none / off-farm).
## Extra args default so the base "just a path" call still works.
func set_path(points: Array, valid: bool, tile_size: float = 96.0,
		stage: int = 0, threshold: int = 0, upg_count: int = 0, upg_tex: Texture2D = null) -> void:
	_points = points
	_valid = valid
	_tile_size = maxf(8.0, tile_size)
	_stage = clampi(stage, 0, Constants.CHAIN_STAGES.size() - 1)
	_threshold = threshold
	_upg_count = maxi(0, upg_count)
	_upg_tex = upg_tex
	var active := not points.is_empty()
	set_process(active and not _frozen)
	if not active:
		_phase = 0.0
	queue_redraw()

## Pin the animation to a fixed phase + stop processing, so a captured frame (the
## board-farm-chain visual golden) is identical every run. The visual harness calls this
## in its freeze step exactly like it kills the Toast tween.
func freeze() -> void:
	_frozen = true
	set_process(false)
	_phase = 0.0
	queue_redraw()

func _process(delta: float) -> void:
	_phase += delta
	queue_redraw()

func _draw() -> void:
	if _points.is_empty():
		return

	# Base valid/invalid palette, then — for a valid escalating chain — tint toward the
	# chain stage's accent so a BONUS/DOUBLE/TRIPLE/FRENZY chain reads progressively hotter.
	var line_col: Color = Palette.CHAIN_VALID_LINE if _valid else Palette.CHAIN_BAD_LINE
	var node_col: Color = Palette.CHAIN_VALID_NODE if _valid else Palette.CHAIN_BAD_NODE
	if _valid and _stage >= 1:
		var accent := Color(String(Constants.CHAIN_STAGES[_stage].get("accent", "#e07a3a")))
		line_col = line_col.lerp(accent, 0.55)
		node_col = node_col.lerp(accent, 0.45)
	var halo_col := node_col
	halo_col.a = 0.5

	# A soft alpha pulse on the crisp core line keeps the chain feeling "alive" (React's
	# 680ms path pulse). Subtle so it never strobes.
	var pulse: float = 0.84 + 0.16 * (0.5 + 0.5 * sin(_phase * 4.2))
	var core_col := line_col
	core_col.a = pulse

	# Strokes thicken slightly with the chain stage so longer chains carry more weight.
	var stage_boost: float = 1.0 + 0.07 * float(_stage)
	var halo_w: float = _tile_size * 0.16 * stage_boost
	var core_w: float = _tile_size * 0.09 * stage_boost
	var outer_r: float = _tile_size * 0.16
	var inner_r: float = _tile_size * 0.09

	# Connecting line: a soft glowing halo, then a crisp core on top. draw_polyline needs at
	# least two points; a single-cell chain renders only its node.
	if _points.size() >= 2:
		var pts := PackedVector2Array(_points)
		draw_polyline(pts, halo_col, halo_w, true)
		draw_polyline(pts, core_col, core_w, true)

	# A two-ring node at every cell: bright outer disc + warm core.
	for p in _points:
		draw_circle(p, outer_r, node_col)
		draw_circle(p, inner_r, line_col)

	# CHAIN STARS — one per upgrade the chain yields, at the upgrade-threshold boundary cells.
	# k*threshold-1 is the (0-based) index of the cell that completes the k-th upgrade.
	if _threshold > 0 and _upg_count > 0:
		for k in range(1, _upg_count + 1):
			var idx: int = k * _threshold - 1
			if idx >= 0 and idx < _points.size():
				_draw_star(_points[idx], k)

	# UPGRADE HOVER MARKER at the drag head — the upgrade tile's thumbnail + "×N".
	if _upg_count >= 1 and _points.size() >= 1:
		_draw_head_marker(_points[-1])

## A 5-point gold star at `center`, sized + brightened per `tier` (1-based), gently swaying.
## Tier ≥ 2 gets a faint glow ring. Mirrors the React star preview that escalates per tier.
func _draw_star(center: Vector2, tier: int) -> void:
	var t: int = mini(tier, 4)
	var sway: float = deg_to_rad((9.0 + float(t) * 4.0) * sin(_phase * (2.2 + float(t) * 0.35) + float(tier)))
	var outer: float = _tile_size * (0.20 + 0.025 * float(t))
	var inner: float = outer * 0.46
	var lift: float = -_tile_size * 0.10                  # nudge the star up off the tile

	# Glow ring behind the higher-tier stars.
	if t >= 2:
		var glow := Color(1.0, 0.82, 0.28, 0.45)
		draw_arc(center + Vector2(0, lift), outer * 1.35, 0.0, TAU, 28, glow, maxf(2.0, _tile_size * 0.03), true)

	var star := PackedVector2Array()
	for i in range(10):
		var r: float = outer if (i % 2 == 0) else inner
		var ang: float = -PI / 2.0 + sway + float(i) * (PI / 5.0)
		star.append(center + Vector2(0, lift) + Vector2(cos(ang), sin(ang)) * r)

	# Brighter fill for higher tiers; dark outline so it reads on any tile.
	var fill := Color(1.0, 0.86, 0.30).lerp(Color(1.0, 1.0, 0.85), clampf(float(t - 1) * 0.3, 0.0, 0.9))
	draw_colored_polygon(star, fill)
	var outline := PackedVector2Array(star)
	outline.append(star[0])
	draw_polyline(outline, Color(0.45, 0.28, 0.05, 0.9), maxf(1.5, _tile_size * 0.018), true)

## The drag-head upgrade badge: a dark rounded pill carrying the upgrade tile's thumbnail and
## a "×N" count, floated up-and-right of the head cell (React's grass-hover badge).
func _draw_head_marker(head: Vector2) -> void:
	var count_text := "×%d" % _upg_count
	var fs: int = int(maxf(14.0, _tile_size * 0.26))
	var text_w: float = _font.get_string_size(count_text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
	var thumb: float = _tile_size * 0.40 if _upg_tex != null else 0.0
	var pad: float = _tile_size * 0.09
	var gap: float = _tile_size * 0.06 if _upg_tex != null else 0.0
	var box_w: float = pad * 2.0 + thumb + gap + text_w
	var box_h: float = maxf(thumb, float(fs)) + pad * 1.4

	# Anchor above-and-right of the head, then clamp fully inside the board so an edge/corner
	# head never pushes the badge off-screen (the overlay shares the board's local space, whose
	# rect is (0,0)..(COLS*tile, ROWS*tile)).
	var origin := head + Vector2(_tile_size * 0.42, -_tile_size * 0.62 - box_h * 0.5)
	var board_w: float = float(Constants.COLS) * _tile_size
	var board_h: float = float(Constants.ROWS) * _tile_size
	origin.x = clampf(origin.x, 0.0, maxf(0.0, board_w - box_w))
	origin.y = clampf(origin.y, 0.0, maxf(0.0, board_h - box_h))
	var rect := Rect2(origin, Vector2(box_w, box_h))

	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.17, 0.13, 0.09, 0.92)
	sb.border_color = Color(0.66, 0.78, 0.41)            # mossy edge, like the React badge
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(int(box_h * 0.5))
	draw_style_box(sb, rect)

	var cx: float = origin.x + pad
	if _upg_tex != null:
		var trect := Rect2(cx, origin.y + (box_h - thumb) * 0.5, thumb, thumb)
		draw_texture_rect(_upg_tex, trect, false)
		cx += thumb + gap
	var ty: float = origin.y + box_h * 0.5 + float(fs) * 0.34
	draw_string(_font, Vector2(cx, ty), count_text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(0.81, 0.91, 0.56))
