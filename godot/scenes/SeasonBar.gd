extends Control
## Full-width seasonal progress strip for the puzzle-board HUD — the port of the React
## src/ui/seasonStrip.tsx `SeasonStrip`. Four side-by-side segments (Spring/Summer/Autumn/
## Winter) sized PROPORTIONALLY to each season's turn count, each filled with a vertical
## (top→bottom) gradient from Constants.SEASON_STRIP_PALETTES, with the uppercase season
## NAME centred at the bottom in that season's label colour and thin tick dividers between
## segments. A small wagon glyph rolls left→right at progress `turns_used / budget`, and a
## fixed-width numeral panel on the right reads "N TURNS LEFT". Reference golden:
## tests/visual/__goldens__/visual.spec.ts/iphone-portrait/board-farm-idle.png ("8 TURNS LEFT").
##
## Pure-drawn (a single _draw over the laid-out rect) so it needs no per-segment child nodes —
## the segment math is the shared Constants.season_turn_ranges (same as the React strip).
## State is pushed by Main via set_state(); the bar redraws itself. The numeral panel reserves
## NUMERAL_W on the right; the segments fill the remaining width.
##
## NO class_name on purpose — Main preloads this script (preload(".../SeasonBar.gd")) so the
## port never needs an --import pass to register it as a global (mirrors the modal scripts).

const STRIP_HEIGHT := 52.0   ## strip height (React STRIP_HEIGHT)
const NUMERAL_W := 56.0      ## right-side numeral panel width (React NUMERAL_WIDTH)
const CORNER := 8.0          ## rounded outer corners
const BORDER := Color8(0x3a, 0x24, 0x12)            ## dark outer border + tick ink (React #3a2412)
const TICK_COL := Color(0.227, 0.141, 0.071, 0.45)  ## tick divider tint (rgba 58,36,18,.45)

## Live state, set by set_state(); drives the segment fill, the wagon, and the numeral.
var _turns_used: int = 0
var _budget: int = 10
var _season_idx: int = 0

func _ready() -> void:
	custom_minimum_size = Vector2(0, STRIP_HEIGHT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE   # never eat board drags

## Push the live farm season state and redraw. `turns_used` is clamped to [0, budget];
## `season_idx` is the current season (0=Spring … 3=Winter).
func set_state(turns_used: int, budget: int, season_idx: int) -> void:
	_budget = maxi(1, budget)
	_turns_used = clampi(turns_used, 0, _budget)
	_season_idx = clampi(season_idx, 0, 3)
	queue_redraw()

## Turns remaining in the whole cycle — the numeral the panel shows.
func turns_left() -> int:
	return maxi(0, _budget - _turns_used)

func _draw() -> void:
	var w: float = size.x
	var h: float = size.y
	if w <= 0.0 or h <= 0.0:
		return
	var seg_w: float = maxf(0.0, w - NUMERAL_W)     # width available to the four segments
	var ranges: Array = Constants.season_turn_ranges(_budget)
	var total: float = float(_budget)

	# ── 1. four proportional gradient segments ────────────────────────────────
	var x: float = 0.0
	for i in ranges.size():
		var count: int = int((ranges[i] as Dictionary).get("count", 0))
		var frac: float = float(count) / total if total > 0.0 else 0.25
		# The LAST segment soaks up any rounding remainder so the segments span seg_w exactly.
		var sw: float = (seg_w - x) if i == ranges.size() - 1 else seg_w * frac
		var pal: Dictionary = Constants.SEASON_STRIP_PALETTES[i]
		_draw_vgradient(Rect2(x, 0.0, sw, h), pal["bg_top"], pal["bg_bot"])
		# Thin tick dividers between segments (one per inner turn boundary).
		for t in range(1, count):
			var tx: float = x + sw * (float(t) / float(count))
			draw_line(Vector2(tx, 0.0), Vector2(tx, 5.0), TICK_COL, 1.0)
		# A 1.5px iron divider on the right edge of every segment except the last.
		if i < ranges.size() - 1:
			draw_line(Vector2(x + sw, 0.0), Vector2(x + sw, h), Color(BORDER, 0.55), 1.5)
		# Uppercase season NAME centred at the bottom, dimmed when not the active season.
		_draw_label(String(pal["name"]).to_upper(), Rect2(x, 0.0, sw, h), pal["label"], i == _season_idx)
		x += sw

	# ── 2. the progress wagon (a clean glyph marker) ──────────────────────────
	var progress: float = clampf(float(_turns_used) / total, 0.0, 1.0) if total > 0.0 else 0.0
	_draw_wagon(seg_w * progress, h)

	# ── 3. right numeral panel — "N TURNS LEFT" ───────────────────────────────
	_draw_numeral_panel(Rect2(seg_w, 0.0, NUMERAL_W, h))

	# ── 4. outer rounded border over everything ───────────────────────────────
	draw_rect(Rect2(0.0, 0.0, w, h), BORDER, false, 1.5)

## Fill `rect` with a vertical (top→bottom) gradient by stacking thin horizontal bands —
## Godot has no built-in gradient draw_rect, so we sample the lerp per row (cheap; the strip
## is only ~52px tall and redraws only on a turn change/resize).
func _draw_vgradient(rect: Rect2, top: Color, bot: Color) -> void:
	var rows: int = int(ceil(rect.size.y))
	for r in rows:
		var t: float = float(r) / maxf(1.0, rect.size.y - 1.0)
		var c: Color = top.lerp(bot, t)
		draw_rect(Rect2(rect.position.x, rect.position.y + float(r), rect.size.x, 1.0), c)

## Draw the uppercase season name centred horizontally near the bottom of `area`, in `col`.
## Dimmed (lower alpha) when this is not the active season (React `opacity: isActive ? 1 : .65`).
func _draw_label(text: String, area: Rect2, col: Color, active: bool) -> void:
	var font: Font = ThemeDB.fallback_font
	var fs: int = 10
	var draw_col: Color = col if active else Color(col, 0.65)
	var tw: float = font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1.0, fs).x
	# Skip labels that can't fit their segment (tiny segments stay clean, like the React clip).
	if tw > area.size.x - 4.0:
		return
	var pos := Vector2(
		area.position.x + (area.size.x - tw) / 2.0,
		area.position.y + area.size.y - 6.0)
	draw_string(font, pos, text, HORIZONTAL_ALIGNMENT_LEFT, -1.0, fs, draw_col)

## A compact wagon glyph centred at x=`cx` across the strip: two wheels + a bed + a back wall,
## in the React wagon's wood/iron tones. A clean, readable marker (not the full SVG cart) that
## reads as "the harvest wagon rolling across the year".
func _draw_wagon(cx: float, h: float) -> void:
	var base_y: float = h - 6.0
	var wood := Color8(0x7a, 0x4a, 0x1c)
	var wood_top := Color8(0xc0, 0x88, 0x40)
	var iron := Color8(0x2a, 0x18, 0x10)
	var hub := Color8(0xa8, 0x74, 0x2e)
	# Bed (a small trapezoid) sitting just above the wheels.
	var bed := PackedVector2Array([
		Vector2(cx - 9.0, base_y - 12.0),
		Vector2(cx + 9.0, base_y - 12.0),
		Vector2(cx + 10.0, base_y - 6.0),
		Vector2(cx - 10.0, base_y - 6.0),
	])
	draw_colored_polygon(bed, wood)
	draw_line(Vector2(cx - 9.0, base_y - 12.0), Vector2(cx + 9.0, base_y - 12.0), wood_top, 1.5)
	# Back wall (cargo retainer) on the left.
	draw_rect(Rect2(cx - 9.0, base_y - 16.0, 2.0, 5.0), Color8(0x5a, 0x30, 0x10))
	# Axle + two spoked wheels.
	draw_line(Vector2(cx - 7.0, base_y - 4.0), Vector2(cx + 7.0, base_y - 4.0), iron, 1.5)
	for dx in [-7.0, 7.0]:
		var wc := Vector2(cx + dx, base_y - 2.0)
		draw_circle(wc, 3.6, iron)
		draw_circle(wc, 2.6, hub)
		draw_circle(wc, 0.9, iron)

## The right numeral panel: a soft-parchment plate with an iron left border showing the big
## remaining count over a small "TURNS LEFT" caption — the React NumeralPanel. Reads in the
## active season's label colour so it harmonises with the strip.
func _draw_numeral_panel(rect: Rect2) -> void:
	var pal: Dictionary = Constants.SEASON_STRIP_PALETTES[_season_idx]
	var num_col: Color = pal["label"]
	# Plate fill (a near-white wash of the season's top colour) + iron left border.
	draw_rect(rect, (pal["bg_top"] as Color).lerp(Color.WHITE, 0.45))
	draw_line(rect.position, rect.position + Vector2(0.0, rect.size.y), Color(BORDER, 0.7), 1.5)

	var font: Font = ThemeDB.fallback_font
	var num_text: String = str(turns_left())
	var num_fs: int = 22
	var num_w: float = font.get_string_size(num_text, HORIZONTAL_ALIGNMENT_LEFT, -1.0, num_fs).x
	var num_pos := Vector2(
		rect.position.x + (rect.size.x - num_w) / 2.0,
		rect.position.y + rect.size.y / 2.0 + 3.0)
	draw_string(font, num_pos, num_text, HORIZONTAL_ALIGNMENT_LEFT, -1.0, num_fs, num_col)

	var cap := "TURNS LEFT"
	var cap_fs: int = 7
	var cap_w: float = font.get_string_size(cap, HORIZONTAL_ALIGNMENT_LEFT, -1.0, cap_fs).x
	var cap_pos := Vector2(
		rect.position.x + (rect.size.x - cap_w) / 2.0,
		rect.position.y + rect.size.y - 6.0)
	draw_string(font, cap_pos, cap, HORIZONTAL_ALIGNMENT_LEFT, -1.0, cap_fs, Color(num_col, 0.85))
