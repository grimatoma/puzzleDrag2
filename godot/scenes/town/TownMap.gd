extends Node2D
## Renders a spatial top-down town map from a TownLayout plan (the data tree
## produced by TownLayout.build_plan). PLAIN script (no class_name) so it carries
## no project.godot --import churn; instance it directly or via preload.
##
## This is the Godot counterpart of src/ui/TownGround.tsx — it reproduces the
## same farm-biome palette and the same painter's order (back → front):
##   grass base → water → roads (+ bridges) → front paths → fields → plaza →
##   lot pads → board pads → fences → trees → street trees → lot decor → props.
##
## The plan lives in the 1280×960 landscape "design space"; render_plan() fits it
## by WIDTH into the portrait viewport (720×1280) and centres it vertically. All
## draw coordinates pass through _p() so the whole map honours that fit transform.
##
## ISOLATED for M6b: this is a renderer + companion capture tool + smoke test. It
## is intentionally NOT wired into Main's navigation yet.

# ── Farm-biome palette (the React `farm` variant of groundPalette) ─────────────
const GRASS := Color("6f9a44")
const GRASS_DARK := Color("5a7f36")
const GRASS_LIGHT := Color("83ad52")
const DIRT := Color("b08a52")
const DIRT_EDGE := Color("8a6a3a")
const WATER := Color("4f8fb0")
const WATER_EDGE := Color("3a6f8a")
const ROCK := Color("8a8478")
const SAND := Color("d8c89a")
const PAD := Color("c8a972")
const PAD_EDGE := Color("94703c")
const PATH := Color("b08a52")
const SHADOW := Color(0.118, 0.094, 0.047, 0.30)  # rgba(30,24,12,0.30)

# Field soil colours (mirror the React field fill + crop rows).
const FIELD_SOIL := Color("8a6a3a")
const FIELD_ROW_LIGHT := Color("7fae4a")
const FIELD_ROW_DARK := Color("7a5a30")
const FIELD_EDGE := Color("6f4f28")

# Tree canopy ramp (back-layer + street trees use the same layered greens).
const CANOPY_BASE := Color("3f6a2c")
const CANOPY_MID := Color("5a8a3a")
const CANOPY_HI := Color("7fae52")

# Wood / fence / prop tones.
const WOOD := Color("7a5630")
const WOOD_LIGHT := Color("9a784a")
const WOOD_DARK := Color("5a3e1e")
const BRIDGE_DECK := Color("9a6f3e")
const BRIDGE_EDGE := Color("6f4f28")
const LAMP_GLOW := Color("ffe79a")

# Per-board-kind pad tint (farm green-ish, mine grey, fish blue) layered over PAD.
const BOARD_TINT := {
	"farm": Color("9ab35a"),
	"mine": Color("9a948a"),
	"fish": Color("6fa0b8"),
}

var _plan: Dictionary = {}
var _scale: float = 1.0
var _ox: float = 0.0
var _oy: float = 0.0
var _view_w: float = 720.0
var _view_h: float = 1280.0

## Store the plan, compute a fit-by-width transform that centres the landscape
## stage vertically in the portrait viewport, then request a redraw.
func render_plan(plan: Dictionary, view_w: float, view_h: float) -> void:
	_plan = plan if plan != null else {}
	_view_w = view_w
	_view_h = view_h
	var stage_w: float = float(_plan.get("stage_w", 1280.0))
	var stage_h: float = float(_plan.get("stage_h", 960.0))
	if stage_w <= 0.0:
		stage_w = 1280.0
	if stage_h <= 0.0:
		stage_h = 960.0
	# Fit by width; centre vertically. (Width is the binding dimension because the
	# stage is landscape and the viewport is portrait.)
	_scale = view_w / stage_w
	_ox = 0.0
	_oy = (view_h - stage_h * _scale) / 2.0
	queue_redraw()

# Map a plan {x,y} dict (or any object with x/y) into screen space.
func _p(pt: Dictionary) -> Vector2:
	return Vector2(float(pt["x"]) * _scale + _ox, float(pt["y"]) * _scale + _oy)

# Map a raw plan-space (x, y) pair into screen space.
func _pxy(x: float, y: float) -> Vector2:
	return Vector2(x * _scale + _ox, y * _scale + _oy)

func _s(v: float) -> float:
	return v * _scale

func _draw() -> void:
	# Grass-coloured backdrop so the map always sits on grass.
	draw_rect(Rect2(0, 0, _view_w, _view_h), GRASS, true)
	if _plan.is_empty():
		return

	# Soft organic grass blobs for depth (loose echo of the SVG texture paths).
	_draw_grass_texture()
	_draw_water()
	_draw_roads()
	_draw_bridges()
	_draw_front_paths()
	_draw_fields()
	_draw_plaza()
	_draw_lot_pads()
	_draw_board_pads()
	_draw_fences()
	_draw_trees_back()
	_draw_street_trees()
	_draw_lot_decor()
	_draw_props()
	# Front-layer trees draw LAST so their canopies sit over the lots they front.
	_draw_trees_front()

# ── 1. grass texture ──────────────────────────────────────────────────────────
func _draw_grass_texture() -> void:
	var sw: float = float(_plan.get("stage_w", 1280.0))
	var sh: float = float(_plan.get("stage_h", 960.0))
	_draw_blob_ellipse(0.34 * sw, 0.84 * sh, 0.30 * sw, 0.18 * sh, GRASS_DARK, 0.26)
	_draw_blob_ellipse(0.82 * sw, 0.78 * sh, 0.26 * sw, 0.16 * sh, GRASS_LIGHT, 0.26)
	_draw_blob_ellipse(0.22 * sw, 0.24 * sh, 0.24 * sw, 0.16 * sh, GRASS_DARK, 0.22)
	_draw_blob_ellipse(0.78 * sw, 0.18 * sh, 0.22 * sw, 0.14 * sh, GRASS_LIGHT, 0.24)

func _draw_blob_ellipse(cx: float, cy: float, rx: float, ry: float, col: Color, a: float) -> void:
	var c := col
	c.a = a
	_draw_filled_ellipse(_pxy(cx, cy), _s(rx), _s(ry), c)

# ── 2. water ────────────────────────────────────────────────────────────────
func _draw_water() -> void:
	if not _plan.has("water"):
		return
	var water: Array = _plan["water"]
	for wb in water:
		var kind: String = String(wb.get("kind", ""))
		if kind == "river" and wb.has("path"):
			var path: Array = wb["path"]
			if path.size() < 2:
				continue
			var bw: float = float(wb.get("width", 18.0))
			var pts := _to_screen_points(path)
			# Wider sand/edge underlay, then the river body, then a thin core line.
			var sand := SAND
			sand.a = 0.65
			draw_polyline(pts, sand, _s(bw + 14.0), true)
			draw_polyline(pts, WATER, _s(bw), true)
			var edge := WATER_EDGE
			edge.a = 0.45
			draw_polyline(pts, edge, _s(max(2.0, bw * 0.35)), true)
		elif wb.has("polygon"):
			var poly: Array = wb["polygon"]
			if poly.size() < 3:
				continue
			var pts := _to_screen_points(poly)
			draw_colored_polygon(pts, WATER)
			# Outline.
			var closed := pts.duplicate()
			closed.append(pts[0])
			draw_polyline(closed, WATER_EDGE, _s(3.0), true)
			# Subtle highlight ellipse near the centre.
			var bb := _bbox(poly)
			var cx: float = (bb.x0 + bb.x1) / 2.0
			var cy: float = (bb.y0 + bb.y1) / 2.0
			var hl := Color(1, 1, 1, 0.14)
			_draw_filled_ellipse(_pxy(cx, cy - (bb.y1 - bb.y0) * 0.12), _s((bb.x1 - bb.x0) * 0.28), _s((bb.y1 - bb.y0) * 0.18), hl)

# ── 3. roads ────────────────────────────────────────────────────────────────
func _draw_roads() -> void:
	var roads := _roads_or_streets()
	for r in roads:
		var pts_data: Array = r["points"]
		if pts_data.size() < 2:
			continue
		var pts := _to_screen_points(pts_data)
		var width: float = float(r.get("width", 30.0))
		var kind: String = String(r.get("kind", "branch"))
		# Wider dark dirtEdge underlay, then the dirt road body on top.
		var edge := DIRT_EDGE
		edge.a = 0.5
		draw_polyline(pts, edge, _s(width + 8.0), true)
		draw_polyline(pts, DIRT, _s(width), true)
		if kind == "main":
			# A faint centre stripe for the main avenues.
			var stripe := DIRT_EDGE
			stripe.a = 0.30
			draw_polyline(pts, stripe, _s(max(1.0, width * 0.05)), true)

# Roads layer source: prefer polyline roads, fall back to 2-pt streets.
func _roads_or_streets() -> Array:
	if _plan.has("roads") and (_plan["roads"] as Array).size() > 0:
		return _plan["roads"]
	var out: Array = []
	if _plan.has("streets"):
		for s in _plan["streets"]:
			out.append({
				"points": [{"x": s["x1"], "y": s["y1"]}, {"x": s["x2"], "y": s["y2"]}],
				"width": s.get("width", 30.0),
				"kind": "branch",
			})
	return out

# ── 3c. bridges ─────────────────────────────────────────────────────────────
func _draw_bridges() -> void:
	if not _plan.has("bridges"):
		return
	for b in _plan["bridges"]:
		var center := _pxy(float(b["x"]), float(b["y"]))
		var angle: float = float(b.get("angle", 0.0))
		var width: float = float(b.get("width", 30.0))
		var deck_len: float = _s(42.0 + 24.0)  # river width + overhang
		var half: float = _s(width / 2.0)
		var basis := Transform2D(angle, center)
		# Deck shadow.
		var sh := SHADOW
		sh.a = 0.35
		_draw_filled_ellipse(basis * Vector2(0, _s(3.0)), deck_len / 2.0, half + _s(2.0), sh)
		# Deck base (rotated rect) drawn as a colored quad.
		var corners := [
			Vector2(-deck_len / 2.0, -half),
			Vector2(deck_len / 2.0, -half),
			Vector2(deck_len / 2.0, half),
			Vector2(-deck_len / 2.0, half),
		]
		var quad := PackedVector2Array()
		for c in corners:
			quad.append(basis * c)
		draw_colored_polygon(quad, BRIDGE_DECK)
		# Outline + side rails.
		var ring := quad.duplicate()
		ring.append(quad[0])
		draw_polyline(ring, BRIDGE_EDGE, _s(1.5), true)
		# Cross-plank lines (perpendicular to road direction).
		var plank_count: int = int(floor((42.0 + 24.0) / 8.0)) - 1
		for k in plank_count:
			var lx: float = -deck_len / 2.0 + _s(8.0) * float(k + 1)
			draw_line(basis * Vector2(lx, -half + _s(1.0)), basis * Vector2(lx, half - _s(1.0)), BRIDGE_EDGE, _s(1.0), true)

# ── 3b. front paths ─────────────────────────────────────────────────────────
func _draw_front_paths() -> void:
	if not _plan.has("paths"):
		return
	for p in _plan["paths"]:
		var a := _pxy(float(p["x1"]), float(p["y1"]))
		var b := _pxy(float(p["x2"]), float(p["y2"]))
		var w: float = float(p.get("width", 14.0))
		var edge := PAD_EDGE
		edge.a = 0.4
		draw_line(a, b, edge, _s(w + 4.0), true)
		draw_line(a, b, PATH, _s(w), true)

# ── 4. fields ───────────────────────────────────────────────────────────────
func _draw_fields() -> void:
	if not _plan.has("fields"):
		return
	for f in _plan["fields"]:
		var cx: float = float(f["cx"])
		var cy: float = float(f["cy"])
		var fw: float = float(f["w"])
		var fh: float = float(f["h"])
		var angle: float = float(f.get("angle", 0.0))
		var rows: int = max(1, int(floor(float(f.get("rows", 4)))))
		var center := _pxy(cx, cy)
		var basis := Transform2D(angle, center)
		var hw: float = _s(fw / 2.0)
		var hh: float = _s(fh / 2.0)
		# Soil rect (rotated about its centre).
		var quad := PackedVector2Array([
			basis * Vector2(-hw, -hh),
			basis * Vector2(hw, -hh),
			basis * Vector2(hw, hh),
			basis * Vector2(-hw, hh),
		])
		draw_colored_polygon(quad, FIELD_SOIL)
		var ring := quad.duplicate()
		ring.append(quad[0])
		draw_polyline(ring, FIELD_EDGE, _s(2.0), true)
		# Alternating crop-row lines across the field.
		var gap: float = _s(fh) / float(rows)
		var x0: float = -_s(fw) / 2.0 + _s(4.0)
		var x1: float = _s(fw) / 2.0 - _s(4.0)
		for k in rows:
			var ry: float = -_s(fh) / 2.0 + gap * (float(k) + 0.5)
			var col := FIELD_ROW_LIGHT if k % 2 == 0 else FIELD_ROW_DARK
			draw_line(basis * Vector2(x0, ry), basis * Vector2(x1, ry), col, max(_s(2.0), gap * 0.38), true)

# ── 5. plaza ────────────────────────────────────────────────────────────────
func _draw_plaza() -> void:
	if not _plan.has("plaza"):
		return
	var pz: Dictionary = _plan["plaza"]
	var c := _pxy(float(pz["cx"]), float(pz["cy"]))
	var rx: float = _s(float(pz["rx"]))
	var ry: float = _s(float(pz["ry"]))
	# Sandy fill with a dirt ring.
	var halo := DIRT_EDGE
	halo.a = 0.7
	_draw_filled_ellipse(c, rx + _s(6.0), ry + _s(5.0), halo)
	_draw_filled_ellipse(c, rx, ry, SAND)
	_draw_ellipse_outline(c, rx, ry, PATH, _s(2.0))
	_draw_ellipse_outline(c, rx * 0.62, ry * 0.62, Color(PATH.r, PATH.g, PATH.b, 0.4), _s(1.0))
	# Stippled cobble ring — 16 dots on the rim.
	for i in 16:
		var a: float = (float(i) / 16.0) * TAU
		var dot := c + Vector2(cos(a) * rx, sin(a) * ry)
		draw_circle(dot, _s(2.0), PAD_EDGE)

# ── 6. lot pads ─────────────────────────────────────────────────────────────
# We don't know built/empty state here, so treat every lot as an empty pad: a
# small bottom-anchored foundation footprint (pad fill + darker fenced edge).
func _draw_lot_pads() -> void:
	if not _plan.has("lots"):
		return
	for l in _plan["lots"]:
		if String(l.get("row", "")) == "plaza":
			continue
		var lcx: float = float(l["cx"])
		var lcy: float = float(l["cy"])
		var lw: float = float(l["w"])
		var lh: float = float(l["h"])
		var fw: float = lw * 0.6
		var fh: float = lh * 0.6
		var fx0: float = lcx - fw / 2.0
		var fy1: float = lcy + lh / 2.0 - 4.0
		var fy0: float = fy1 - fh
		# Foundation pad (semi-transparent dirt).
		var pad := DIRT
		pad.a = 0.5
		_draw_screen_rect(fx0 + 4.0, fy0 + 4.0, fw - 8.0, fh - 8.0, pad)
		# Post-and-rail fence outline around the foundation.
		_draw_screen_rect_outline(fx0, fy0, fw, fh, WOOD, _s(2.5))
		var lwood := WOOD_LIGHT
		lwood.a = 0.7
		_draw_screen_rect_outline(fx0, fy0, fw, fh, lwood, _s(1.0))
		# Corner + midpoint posts.
		var mx: float = (fx0 + fx0 + fw) / 2.0
		var my: float = (fy0 + fy1) / 2.0
		var posts := [
			Vector2(fx0, fy0), Vector2(fx0 + fw, fy0), Vector2(fx0, fy1), Vector2(fx0 + fw, fy1),
			Vector2(mx, fy0), Vector2(mx, fy1), Vector2(fx0, my), Vector2(fx0 + fw, my),
		]
		for pp in posts:
			draw_circle(_pxy(pp.x, pp.y), _s(2.4), WOOD_DARK)
		# "Build here" stake at the front.
		_draw_screen_rect(lcx - 1.25, fy1 - 14.0, 2.5, 12.0, WOOD)
		_draw_screen_rect(lcx - 2.0, fy1 - 18.0, 12.0, 6.0, DIRT_EDGE)

# ── 6b. board pads ──────────────────────────────────────────────────────────
func _draw_board_pads() -> void:
	if not _plan.has("boards"):
		return
	for b in _plan["boards"]:
		var bcx: float = float(b["cx"])
		var bcy: float = float(b["cy"])
		var bw: float = float(b["w"])
		var bh: float = float(b["h"])
		var kind: String = String(b.get("kind", ""))
		# Ground shadow ellipse under the board (matches the React board pad shadow).
		_draw_filled_ellipse(_pxy(bcx, bcy + bh / 2.0 - 4.0), _s(bw * 0.5), _s(max(8.0, bh * 0.12)), SHADOW)
		# A tinted pad rect so the board spot reads as a worked plot.
		var tint: Color = BOARD_TINT.get(kind, PAD)
		var pad := PAD.lerp(tint, 0.5)
		_draw_screen_rect(bcx - bw / 2.0, bcy - bh / 2.0, bw, bh, pad)
		_draw_screen_rect_outline(bcx - bw / 2.0, bcy - bh / 2.0, bw, bh, PAD_EDGE, _s(2.0))

# ── 7. fences ───────────────────────────────────────────────────────────────
func _draw_fences() -> void:
	if not _plan.has("fences"):
		return
	for fc in _plan["fences"]:
		if not fc.has("points"):
			continue
		var pts_data: Array = fc["points"]
		if pts_data.size() < 2:
			continue
		var pts := _to_screen_points(pts_data)
		draw_polyline(pts, WOOD, _s(2.5), true)
		var lwood := WOOD_LIGHT
		lwood.a = 0.7
		draw_polyline(pts, lwood, _s(1.0), true)
		for pt in pts:
			draw_circle(pt, _s(2.6), WOOD_DARK)

# ── 8. trees (back layer + shadows for every tree) ──────────────────────────
func _draw_trees_back() -> void:
	if not _plan.has("trees"):
		return
	var trees: Array = _plan["trees"]
	# Soft ground shadow for EVERY tree first.
	for t in trees:
		var tx: float = float(t["x"])
		var ty: float = float(t["y"])
		var tr: float = float(t["r"])
		var sh := SHADOW
		sh.a = 0.5
		_draw_filled_ellipse(_pxy(tx + tr * 0.18, ty + tr * 0.55), _s(tr * 0.85), _s(tr * 0.4), sh)
	# Canopy only for back-layer (not front) trees.
	for t in trees:
		if bool(t.get("front", false)):
			continue
		_draw_canopy(float(t["x"]), float(t["y"]), float(t["r"]))

func _draw_trees_front() -> void:
	if not _plan.has("trees"):
		return
	for t in _plan["trees"]:
		if not bool(t.get("front", false)):
			continue
		_draw_canopy(float(t["x"]), float(t["y"]), float(t["r"]))

func _draw_canopy(tx: float, ty: float, tr: float) -> void:
	var c := _pxy(tx, ty)
	draw_circle(c, _s(tr), CANOPY_BASE)
	draw_circle(_pxy(tx - tr * 0.22, ty - tr * 0.24), _s(tr * 0.62), CANOPY_MID)
	var hi := CANOPY_HI
	hi.a = 0.85
	draw_circle(_pxy(tx - tr * 0.3, ty - tr * 0.32), _s(tr * 0.32), hi)

# ── 8 (cont). street-verge trees ────────────────────────────────────────────
func _draw_street_trees() -> void:
	if not _plan.has("street_trees"):
		return
	for t in _plan["street_trees"]:
		var tx: float = float(t["x"])
		var ty: float = float(t["y"])
		var tr: float = float(t["r"])
		var sh := SHADOW
		sh.a = 0.45
		_draw_filled_ellipse(_pxy(tx + tr * 0.18, ty + tr * 0.5), _s(tr * 0.8), _s(tr * 0.38), sh)
		_draw_canopy(tx, ty, tr)

# ── 8b. lot decor ───────────────────────────────────────────────────────────
func _draw_lot_decor() -> void:
	if not _plan.has("lot_decor"):
		return
	for d in _plan["lot_decor"]:
		var dx: float = float(d["x"])
		var dy: float = float(d["y"])
		var kind: String = String(d.get("kind", "shrub"))
		if kind == "bed":
			_draw_screen_rect(dx - 7.0, dy - 3.0, 14.0, 6.0, DIRT)
			draw_circle(_pxy(dx - 4.0, dy - 3.0), _s(1.3), Color("f0c84a"))
			draw_circle(_pxy(dx, dy - 3.0), _s(1.3), Color("e87878"))
			draw_circle(_pxy(dx + 4.0, dy - 3.0), _s(1.3), Color("ffffff"))
		elif kind == "pots":
			for off in [-4.0, 4.0]:
				_draw_screen_rect(dx + off - 2.5, dy - 1.0, 5.0, 5.0, Color("6a4a28"))
				draw_circle(_pxy(dx + off, dy - 2.0), _s(2.5), GRASS)
				draw_circle(_pxy(dx + off, dy - 2.0), _s(1.0), Color("f0c84a"))
		else:  # shrub
			draw_circle(_pxy(dx, dy), _s(5.0), Color("4a7a32"))
			draw_circle(_pxy(dx - 1.5, dy - 1.5), _s(3.0), Color("6a9a48"))

# ── 9. props (street furniture) ─────────────────────────────────────────────
func _draw_props() -> void:
	if not _plan.has("props"):
		return
	for p in _plan["props"]:
		var kind: String = String(p.get("kind", ""))
		var x: float = float(p["x"])
		var y: float = float(p["y"])
		match kind:
			"well":
				_draw_well(x, y)
			"lamppost":
				_draw_lamppost(x, y)
			"signpost":
				_draw_signpost(x, y)
			"cart":
				_draw_cart(x, y)
			"planter":
				_draw_planter(x, y)

func _draw_well(x: float, y: float) -> void:
	_draw_filled_ellipse(_pxy(x, y + 10.0), _s(22.0), _s(9.0), SHADOW)
	_draw_filled_ellipse(_pxy(x, y), _s(18.0), _s(9.0), Color("7a6a4a"))
	_draw_ellipse_outline(_pxy(x, y), _s(18.0), _s(9.0), Color("5a4a30"), _s(2.5))
	_draw_filled_ellipse(_pxy(x, y), _s(12.0), _s(6.0), Color("23323a"))
	_draw_screen_rect(x - 16.0, y - 2.0, 3.5, 22.0, Color("5a4a30"))
	_draw_screen_rect(x + 12.5, y - 2.0, 3.5, 22.0, Color("5a4a30"))
	_draw_screen_rect(x - 19.0, y - 18.0, 38.0, 6.0, Color("6a4a26"))
	# Roof triangle.
	var roof := PackedVector2Array([
		_pxy(x - 22.0, y - 16.0), _pxy(x, y - 30.0), _pxy(x + 22.0, y - 16.0),
	])
	draw_colored_polygon(roof, Color("7a3a1c"))
	var ring := roof.duplicate()
	ring.append(roof[0])
	draw_polyline(ring, Color("5a2810"), _s(1.5), true)

func _draw_lamppost(x: float, y: float) -> void:
	_draw_filled_ellipse(_pxy(x, y + 2.0), _s(7.0), _s(3.0), SHADOW)
	_draw_screen_rect(x - 1.5, y - 38.0, 3.0, 40.0, Color("3a3630"))
	_draw_screen_rect(x - 5.0, y - 44.0, 10.0, 9.0, Color("46423a"))
	var glow_in := LAMP_GLOW
	glow_in.a = 0.92
	_draw_filled_ellipse(_pxy(x, y - 39.5), _s(4.5), _s(3.5), glow_in)
	var glow_out := LAMP_GLOW
	glow_out.a = 0.2
	_draw_filled_ellipse(_pxy(x, y - 39.5), _s(9.0), _s(7.0), glow_out)

func _draw_signpost(x: float, y: float) -> void:
	_draw_filled_ellipse(_pxy(x, y + 2.0), _s(9.0), _s(3.0), SHADOW)
	_draw_screen_rect(x - 2.0, y - 30.0, 4.0, 32.0, Color("6a4a26"))
	_draw_screen_rect(x - 16.0, y - 30.0, 22.0, 9.0, Color("8a6a3a"))
	_draw_screen_rect(x - 2.0, y - 18.0, 20.0, 8.0, Color("8a6a3a"))

func _draw_cart(x: float, y: float) -> void:
	_draw_filled_ellipse(_pxy(x, y + 8.0), _s(26.0), _s(6.0), SHADOW)
	_draw_screen_rect(x - 22.0, y - 16.0, 44.0, 16.0, Color("7a5a32"))
	var top := Color("9a7a44")
	top.a = 0.85
	_draw_screen_rect(x - 22.0, y - 24.0, 44.0, 9.0, top)
	draw_circle(_pxy(x - 13.0, y + 2.0), _s(7.0), Color("3a2c18"))
	draw_circle(_pxy(x + 13.0, y + 2.0), _s(7.0), Color("3a2c18"))
	_draw_screen_rect(x + 20.0, y - 12.0, 14.0, 3.0, Color("6a4a26"))

func _draw_planter(x: float, y: float) -> void:
	_draw_filled_ellipse(_pxy(x, y + 5.0), _s(11.0), _s(3.0), SHADOW)
	_draw_screen_rect(x - 10.0, y - 4.0, 20.0, 10.0, Color("6a4a28"))
	_draw_filled_ellipse(_pxy(x - 4.0, y - 6.0), _s(6.0), _s(5.0), GRASS)
	_draw_filled_ellipse(_pxy(x + 5.0, y - 5.0), _s(5.0), _s(4.0), GRASS)
	draw_circle(_pxy(x - 5.0, y - 8.0), _s(2.0), Color("f0c84a"))
	draw_circle(_pxy(x + 4.0, y - 8.0), _s(2.0), Color("e87878"))

# ── geometry / draw helpers ─────────────────────────────────────────────────
func _to_screen_points(pts: Array) -> PackedVector2Array:
	var out := PackedVector2Array()
	for pt in pts:
		out.append(_p(pt))
	return out

func _bbox(poly: Array) -> Dictionary:
	var x0: float = INF
	var y0: float = INF
	var x1: float = -INF
	var y1: float = -INF
	for p in poly:
		x0 = min(x0, float(p["x"]))
		y0 = min(y0, float(p["y"]))
		x1 = max(x1, float(p["x"]))
		y1 = max(y1, float(p["y"]))
	return {"x0": x0, "y0": y0, "x1": x1, "y1": y1}

# Draw a rect given in PLAN space (top-left x/y + w/h), mapped to screen.
func _draw_screen_rect(x: float, y: float, w: float, h: float, col: Color) -> void:
	draw_rect(Rect2(_pxy(x, y), Vector2(_s(w), _s(h))), col, true)

func _draw_screen_rect_outline(x: float, y: float, w: float, h: float, col: Color, width: float) -> void:
	draw_rect(Rect2(_pxy(x, y), Vector2(_s(w), _s(h))), col, false, max(1.0, width))

# Filled ellipse via a polygon fan (Godot has no built-in filled-ellipse call).
func _draw_filled_ellipse(center: Vector2, rx: float, ry: float, col: Color) -> void:
	if rx <= 0.0 or ry <= 0.0:
		return
	var seg: int = 28
	var pts := PackedVector2Array()
	for i in seg:
		var a: float = (float(i) / float(seg)) * TAU
		pts.append(center + Vector2(cos(a) * rx, sin(a) * ry))
	draw_colored_polygon(pts, col)

func _draw_ellipse_outline(center: Vector2, rx: float, ry: float, col: Color, width: float) -> void:
	if rx <= 0.0 or ry <= 0.0:
		return
	var seg: int = 28
	var pts := PackedVector2Array()
	for i in seg + 1:
		var a: float = (float(i) / float(seg)) * TAU
		pts.append(center + Vector2(cos(a) * rx, sin(a) * ry))
	draw_polyline(pts, col, max(1.0, width), true)
