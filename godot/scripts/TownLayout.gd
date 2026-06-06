class_name TownLayout
extends RefCounted
## Pure, deterministic top-down town-map layout generator.
## Ported faithfully from src/townLayout.ts (the React/Phaser source).
##
## This is a PURE-LOGIC port: no rendering, no UI, no scene access. Like
## BoardLogic / Constants it is a stateless global usable in headless tests.
## The single entry point `build_plan(zone_id, plot_count, board_kinds)` is a
## PURE function — a seeded mulberry32 PRNG keyed by a string-hash of zone_id
## drives every jitter draw in a FIXED consumption order, so the same inputs
## ALWAYS yield an identical plan within Godot.
##
## POINT REPRESENTATION: points are plain {"x": float, "y": float} Dictionaries
## (NOT Vector2). This was chosen so the returned plan is a pure data tree of
## Dictionaries/Arrays/floats — trivially serialisable, equality-comparable with
## == for the determinism contract, and a 1:1 mirror of the TS `Pt` shape.
##
## DETERMINISM NOTE: we reproduce the ALGORITHM (same generation order, same RNG
## draw sequence) faithfully, not byte-exact float equality with the JS output
## (cross-language float ops differ). Within Godot the plan is bit-stable across
## calls; the structural invariants match the TS parity test
## (src/__tests__/townLayout.test.ts).

const W: float = 1280.0
const H: float = 960.0

## Design-space dimensions of the town stage (mirrors STAGE_W / STAGE_H exports).
const STAGE_W: float = W
const STAGE_H: float = H

# Board footprints per kind (mirrors BOARD_SPOTS in the TS). Stored as a method
# rather than a const because the values derive from W/H.
static func _board_spots() -> Dictionary:
	return {
		"fish": {"cx": W * 0.5, "cy": H * 0.82, "w": 150.0, "h": 140.0},
		"mine": {"cx": W * 0.8, "cy": H * 0.2, "w": 150.0, "h": 140.0},
		"farm": {"cx": W * 0.16, "cy": H * 0.5, "w": 150.0, "h": 140.0},
	}

# ── 32-bit integer helpers (reproduce JS Math.imul / |0 / >>> / << semantics) ──
const _U32: int = 0x100000000  # 2^32
const _MASK32: int = 0xFFFFFFFF

# Truncate to a signed 32-bit int (mirrors `x | 0` / the result of Math.imul).
static func _to_int32(x: int) -> int:
	var v: int = x & _MASK32
	if v >= 0x80000000:
		v -= _U32
	return v

# Truncate to an unsigned 32-bit int (mirrors `x >>> 0`).
static func _to_uint32(x: int) -> int:
	return x & _MASK32

# JS Math.imul(a, b): 32-bit integer multiply, result as signed 32-bit.
# A full 32×32 product reaches ~2^64 which OVERFLOWS GDScript's signed-64 int,
# so split each operand into 16-bit halves and assemble the low 32 bits by hand:
#   (a*b) mod 2^32 = ((aHi*bLo + aLo*bHi) << 16 + aLo*bLo) mod 2^32
# Each partial product fits comfortably in 64 bits.
static func _imul(a: int, b: int) -> int:
	var ua: int = a & _MASK32
	var ub: int = b & _MASK32
	var a_lo: int = ua & 0xFFFF
	var a_hi: int = ua >> 16
	var b_lo: int = ub & 0xFFFF
	var b_hi: int = ub >> 16
	var cross: int = ((a_hi * b_lo + a_lo * b_hi) & 0xFFFF) << 16
	var lo: int = (a_lo * b_lo + cross) & _MASK32
	return _to_int32(lo)

# JS unsigned right shift `x >>> n` (operates on the 32-bit value of x).
static func _ushr(x: int, n: int) -> int:
	return (x & _MASK32) >> n

# ── Seeded mulberry32 PRNG (ported from seededRng in the TS) ──────────────────
# Returns a state Dictionary {"a": int}; call _rng_next(state) for each draw.
static func _seeded_rng_state(s: String) -> Dictionary:
	var n: int = s.length()
	var h: int = _to_int32(1779033703 ^ n)
	for i in n:
		var ch: int = s.unicode_at(i)
		h = _imul(_to_int32(h ^ ch), 3432918353)
		# h = (h << 13) | (h >>> 19)
		var left: int = _to_int32((h & _MASK32) << 13)
		var right: int = _ushr(h, 19)
		h = _to_int32(left | right)
	return {"a": _to_uint32(h)}

# One mulberry32 draw → float in [0, 1). Mutates state["a"] in place.
static func _rng_next(state: Dictionary) -> float:
	var a: int = state["a"]
	# a = (a + 0x6d2b79f5) | 0
	a = _to_int32(a + 0x6d2b79f5)
	state["a"] = a
	# let t = Math.imul(a ^ (a >>> 15), 1 | a);
	var t: int = _imul(_to_int32(a ^ _ushr(a, 15)), _to_int32(1 | a))
	# t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	var t2: int = _imul(_to_int32(t ^ _ushr(t, 7)), _to_int32(61 | t))
	t = _to_int32(_to_int32(t + t2) ^ t)
	# return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	var out: int = _to_uint32(_to_int32(t ^ _ushr(t, 14)))
	return float(out) / 4294967296.0

# ── Geometry helpers (ported 1:1 from the TS) ─────────────────────────────────
static func _pt(x: float, y: float) -> Dictionary:
	return {"x": x, "y": y}

static func _seg_dist(p: Dictionary, a: Dictionary, b: Dictionary) -> float:
	var dx: float = b["x"] - a["x"]
	var dy: float = b["y"] - a["y"]
	var len2: float = dx * dx + dy * dy
	if len2 == 0.0:
		len2 = 1.0
	var t: float = ((p["x"] - a["x"]) * dx + (p["y"] - a["y"]) * dy) / len2
	t = max(0.0, min(1.0, t))
	var qx: float = a["x"] + t * dx
	var qy: float = a["y"] + t * dy
	return sqrt((p["x"] - qx) * (p["x"] - qx) + (p["y"] - qy) * (p["y"] - qy))

# Segment a→b ∩ segment c→d. Returns crossing point dict, or {} (empty) when
# parallel/collinear or outside both segments.
static func _seg_intersect(a: Dictionary, b: Dictionary, c: Dictionary, d: Dictionary) -> Dictionary:
	var rx: float = b["x"] - a["x"]
	var ry: float = b["y"] - a["y"]
	var sx: float = d["x"] - c["x"]
	var sy: float = d["y"] - c["y"]
	var denom: float = rx * sy - ry * sx
	if denom == 0.0:
		return {}
	var t: float = ((c["x"] - a["x"]) * sy - (c["y"] - a["y"]) * sx) / denom
	var u: float = ((c["x"] - a["x"]) * ry - (c["y"] - a["y"]) * rx) / denom
	if t < 0.0 or t > 1.0 or u < 0.0 or u > 1.0:
		return {}
	return _pt(a["x"] + t * rx, a["y"] + t * ry)

static func _point_in_poly(p: Dictionary, poly: Array) -> bool:
	var inside: bool = false
	var nn: int = poly.size()
	var k: int = nn - 1
	for i in nn:
		var a: Dictionary = poly[i]
		var b: Dictionary = poly[k]
		if (a["y"] > p["y"]) != (b["y"] > p["y"]) \
				and p["x"] < ((b["x"] - a["x"]) * (p["y"] - a["y"])) / (b["y"] - a["y"]) + a["x"]:
			inside = not inside
		k = i
	return inside

static func _poly_bbox(poly: Array) -> Dictionary:
	var x0: float = INF
	var y0: float = INF
	var x1: float = -INF
	var y1: float = -INF
	for p in poly:
		x0 = min(x0, p["x"])
		y0 = min(y0, p["y"])
		x1 = max(x1, p["x"])
		y1 = max(y1, p["y"])
	return {"x0": x0, "y0": y0, "x1": x1, "y1": y1}

# ── Entry point ───────────────────────────────────────────────────────────────
## Build a deterministic TownPlan for the given zone.
##   zone_id     — seed string (default "home")
##   plot_count  — desired building-lot count (clamped to >= 1)
##   board_kinds — Array of String kinds ∈ {"farm","mine","fish"}; non-Array → []
## Returns a plain Dictionary plan with snake_case keys mirroring the TS shape.
static func build_plan(zone_id: String = "home", plot_count: int = 12, board_kinds: Array = []) -> Dictionary:
	var rng_state := _seeded_rng_state(zone_id)
	var rng := func() -> float: return _rng_next(rng_state)
	var j := func(amt: float) -> float: return (rng.call() - 0.5) * 2.0 * amt  # ±amt jitter

	var n: int = max(1, int(floor(float(plot_count))))
	var kinds: Array = board_kinds if board_kinds is Array else []

	var spots := _board_spots()

	var border: float = 40.0
	var gx0: float = 40.0
	var gy0: float = 40.0
	var gw: float = 1200.0
	var gh: float = 880.0
	var AVENUE: float = 46.0
	var STREET: float = 30.0

	var n_boards: int = 0
	for k in kinds:
		if spots.has(k):
			n_boards += 1
	var reserved: int = 1 + n_boards
	var slack: int = int(ceil(float(n) * 0.25))

	var capacity_of := func(c: int, r: int) -> int: return max(0, c * r - reserved)

	var seed_count: int = n + reserved
	var cols: int = max(3, int(round(sqrt(float(seed_count) * (W / H)))))
	var rows: int = max(3, int(ceil(float(seed_count) / float(cols))))
	while capacity_of.call(cols, rows) < n + slack:
		if cols <= rows:
			cols += 1
		else:
			rows += 1

	var pc: int = int(floor(float(cols) / 2.0))
	var pr: int = int(floor(float(rows) / 2.0))

	var col_weights: Array = []
	for _i in cols:
		col_weights.append(1.0 + j.call(0.22))
	var row_weights: Array = []
	for _i in rows:
		row_weights.append(1.0 + j.call(0.22))

	var col_gutter := func(i: int) -> float: return AVENUE if i == pc else STREET
	var row_gutter := func(i: int) -> float: return AVENUE if i == pr else STREET

	var col_gutter_total: float = 0.0
	for c in range(1, cols):
		col_gutter_total += col_gutter.call(c)
	var row_gutter_total: float = 0.0
	for r in range(1, rows):
		row_gutter_total += row_gutter.call(r)

	var col_weight_sum: float = 0.0
	for w in col_weights:
		col_weight_sum += w
	if col_weight_sum == 0.0:
		col_weight_sum = 1.0
	var row_weight_sum: float = 0.0
	for w in row_weights:
		row_weight_sum += w
	if row_weight_sum == 0.0:
		row_weight_sum = 1.0

	var col_space: float = max(0.0, gw - col_gutter_total)
	var row_space: float = max(0.0, gh - row_gutter_total)
	var col_floor: float = min(90.0, col_space / float(cols))
	var row_floor: float = min(90.0, row_space / float(rows))

	var col_w: Array = []
	for w in col_weights:
		col_w.append(max(col_floor, (w / col_weight_sum) * col_space))
	var row_h: Array = []
	for w in row_weights:
		row_h.append(max(row_floor, (w / row_weight_sum) * row_space))

	# block[r][c] = {x, y, w, h}
	var block: Array = []
	for _r in rows:
		var row_arr: Array = []
		for _c in cols:
			row_arr.append({"x": 0.0, "y": 0.0, "w": 0.0, "h": 0.0})
		block.append(row_arr)

	var street_x: Array = []
	var street_y: Array = []

	street_x.append(border / 2.0)
	var x: float = gx0
	for c in cols:
		var bx: float = x
		for r in rows:
			block[r][c]["x"] = bx
			block[r][c]["w"] = col_w[c]
		x += col_w[c]
		if c < cols - 1:
			var g: float = col_gutter.call(c + 1)
			street_x.append(x + g / 2.0)
			x += g
	street_x.append(W - border / 2.0)

	street_y.append(border / 2.0)
	var y: float = gy0
	for r in rows:
		for c in cols:
			block[r][c]["y"] = y
			block[r][c]["h"] = row_h[r]
		y += row_h[r]
		if r < rows - 1:
			var g: float = row_gutter.call(r + 1)
			street_y.append(y + g / 2.0)
			y += g
	street_y.append(H - border / 2.0)

	# ── Roads (axis-aligned 3-point polylines) ────────────────────────────────
	var roads: Array = []
	var avenue_x_index: int = pc
	var avenue_y_index: int = pr
	var push_road := func(a: Dictionary, b: Dictionary, width: float, kind: String) -> void:
		roads.append({
			"points": [a, _pt((a["x"] + b["x"]) / 2.0, (a["y"] + b["y"]) / 2.0), b],
			"width": width,
			"kind": kind,
		})
	for i in street_x.size():
		var sx: float = street_x[i]
		push_road.call(_pt(sx, 0.0), _pt(sx, H),
			AVENUE if i == avenue_x_index else STREET,
			"main" if i == avenue_x_index else "branch")
	for i in street_y.size():
		var sy: float = street_y[i]
		push_road.call(_pt(0.0, sy), _pt(W, sy),
			AVENUE if i == avenue_y_index else STREET,
			"main" if i == avenue_y_index else "branch")

	# ── Plaza + well ──────────────────────────────────────────────────────────
	var plaza_blk: Dictionary = block[pr][pc]
	var plaza := {
		"cx": plaza_blk["x"] + plaza_blk["w"] / 2.0,
		"cy": plaza_blk["y"] + plaza_blk["h"] / 2.0,
		"rx": min(120.0, plaza_blk["w"] * 0.42),
		"ry": min(96.0, plaza_blk["h"] * 0.42),
	}
	var well := {"cx": plaza["cx"], "cy": plaza["cy"] - 8.0, "r": 16.0}

	# excluded[r][c]
	var excluded: Array = []
	for _r in rows:
		var row_arr: Array = []
		for _c in cols:
			row_arr.append(false)
		excluded.append(row_arr)
	excluded[pr][pc] = true

	var board_pref_for_kind := func(k: String) -> Array:
		if k == "farm":
			return [max(0, pr - 1), pc]
		if k == "mine":
			return [0, cols - 1]
		return [rows - 1, int(floor(float(cols) / 2.0))]

	var perim_scan: Array = []
	for c in cols:
		perim_scan.append([0, c])
	for r in range(1, rows):
		perim_scan.append([r, cols - 1])
	for c in range(cols - 2, -1, -1):
		perim_scan.append([rows - 1, c])
	for r in range(rows - 2, 0, -1):
		perim_scan.append([r, 0])

	var valid_kinds: Array = []
	for k in kinds:
		if spots.has(k):
			valid_kinds.append(k)

	var boards: Array = []
	for k in valid_kinds:
		var pref: Array = board_pref_for_kind.call(k)
		var br: int = pref[0]
		var bc: int = pref[1]
		if excluded[br][bc] or (br == pr and bc == pc):
			var free_cell: Array = []
			for cell in perim_scan:
				var rr: int = cell[0]
				var cc: int = cell[1]
				if not excluded[rr][cc] and not (rr == pr and cc == pc):
					free_cell = cell
					break
			if not free_cell.is_empty():
				br = free_cell[0]
				bc = free_cell[1]
		excluded[br][bc] = true
		var blk: Dictionary = block[br][bc]
		boards.append({
			"kind": k,
			"cx": blk["x"] + blk["w"] / 2.0,
			"cy": blk["y"] + blk["h"] / 2.0,
			"w": min(150.0, blk["w"] - 16.0),
			"h": min(140.0, blk["h"] - 16.0),
		})

	# ── Water (river always present; shore iff a fish board) ──────────────────
	var water: Array = []
	var river_path: Array = [
		_pt(-10.0 + j.call(10.0), H * 0.12 + j.call(12.0)),
		_pt(W * 0.10 + j.call(14.0), H * 0.28 + j.call(12.0)),
		_pt(W * 0.18 + j.call(14.0), H * 0.50 + j.call(12.0)),
		_pt(W * 0.30 + j.call(14.0), H * 0.72 + j.call(12.0)),
		_pt(W * 0.44 + j.call(12.0), H + 10.0),
	]
	var RIVER_W: float = 42.0
	water.append({"kind": "river", "path": river_path, "width": RIVER_W})
	if kinds.has("fish"):
		var top: float = H * 0.82
		var notch: float = j.call(40.0)
		water.append({
			"kind": "shore",
			"polygon": [
				_pt(0.0, top + j.call(20.0)),
				_pt(W * 0.35, top + 24.0 + notch),
				_pt(W * 0.5, top - 30.0 + j.call(20.0)),
				_pt(W * 0.7, top + 18.0 - notch),
				_pt(W, top + j.call(20.0)),
				_pt(W, H), _pt(0.0, H),
			],
		})

	var water_polys: Array = []
	var water_paths: Array = []
	for w in water:
		if w.has("polygon"):
			water_polys.append(w["polygon"])
		if w.has("path"):
			water_paths.append(w)

	var river_hits_block := func(blk: Dictionary) -> bool:
		var c := _pt(blk["x"] + blk["w"] / 2.0, blk["y"] + blk["h"] / 2.0)
		for i in river_path.size() - 1:
			if _seg_dist(c, river_path[i], river_path[i + 1]) < RIVER_W / 2.0 + 24.0:
				return true
		return false
	for r in rows:
		for c in cols:
			if excluded[r][c]:
				continue
			if river_hits_block.call(block[r][c]):
				excluded[r][c] = true

	# ── Obstacle helpers (reused by trees/fences/lamps/street-trees) ──────────
	var hits_road := func(p: Dictionary, pad: float) -> bool:
		for rd in roads:
			var pts: Array = rd["points"]
			for i in pts.size() - 1:
				if _seg_dist(p, pts[i], pts[i + 1]) < rd["width"] / 2.0 + pad:
					return true
		return false
	var hits_water := func(cx: float, cy: float, w: float, h: float) -> bool:
		var c := _pt(cx, cy)
		for poly in water_polys:
			if _point_in_poly(c, poly):
				return true
		for wp in water_paths:
			var path: Array = wp["path"]
			var wid: float = wp["width"] if wp.has("width") else 40.0
			for i in path.size() - 1:
				if _seg_dist(c, path[i], path[i + 1]) < wid / 2.0 + 14.0:
					return true
		for poly in water_polys:
			var bb := _poly_bbox(poly)
			if cx + w / 2.0 > bb["x0"] and cx - w / 2.0 < bb["x1"] \
					and cy + h / 2.0 > bb["y0"] and cy - h / 2.0 < bb["y1"] \
					and _point_in_poly(_pt(cx, cy + h / 2.0), poly):
				return true
		return false
	var hits_plaza := func(cx: float, cy: float) -> bool:
		return ((cx - plaza["cx"]) * (cx - plaza["cx"])) / ((plaza["rx"] + 20.0) * (plaza["rx"] + 20.0)) \
			+ ((cy - plaza["cy"]) * (cy - plaza["cy"])) / ((plaza["ry"] + 20.0) * (plaza["ry"] + 20.0)) < 1.0
	var hits_board := func(cx: float, cy: float, w: float, h: float) -> bool:
		for b in boards:
			if abs(cx - b["cx"]) < (w + b["w"]) / 2.0 + 12.0 and abs(cy - b["cy"]) < (h + b["h"]) / 2.0 + 12.0:
				return true
		return false
	# aabbOverlap(a, b, gap) where a/b have {cx, cy, w, h}.
	var aabb_overlap := func(a: Dictionary, b: Dictionary, gap: float) -> bool:
		return abs(a["cx"] - b["cx"]) < (a["w"] + b["w"]) / 2.0 + gap \
			and abs(a["cy"] - b["cy"]) < (a["h"] + b["h"]) / 2.0 + gap

	# ── Bridges (span wherever a road crosses the river) — pure arithmetic ─────
	var bridges: Array = []
	var seen_bridges := {}
	for rd in roads:
		var pts: Array = rd["points"]
		for i in pts.size() - 1:
			var seg_a: Dictionary = pts[i]
			var seg_b: Dictionary = pts[i + 1]
			var angle: float = atan2(seg_b["y"] - seg_a["y"], seg_b["x"] - seg_a["x"])
			for k in river_path.size() - 1:
				var p := _seg_intersect(seg_a, seg_b, river_path[k], river_path[k + 1])
				if p.is_empty():
					continue
				if hits_board.call(p["x"], p["y"], 1.0, 1.0) or hits_plaza.call(p["x"], p["y"]):
					continue
				var key: String = "%d:%d" % [int(round(p["x"])), int(round(p["y"]))]
				if seen_bridges.has(key):
					continue
				seen_bridges[key] = true
				bridges.append({"x": p["x"], "y": p["y"], "angle": angle, "width": rd["width"]})

	# ── Lots: one uniform building lot per buildable block ────────────────────
	var MARGIN: float = 10.0
	var MAX_LOT: float = 150.0
	var clamp_lot := func(v: float) -> float: return max(40.0, min(MAX_LOT, v))

	var min_cell_w: float = INF
	var min_cell_h: float = INF
	for r in rows:
		for c in cols:
			if excluded[r][c]:
				continue
			var blk: Dictionary = block[r][c]
			if blk["w"] < min_cell_w:
				min_cell_w = blk["w"]
			if blk["h"] < min_cell_h:
				min_cell_h = blk["h"]
	if not is_finite(min_cell_w):
		min_cell_w = MAX_LOT + 2.0 * MARGIN
	if not is_finite(min_cell_h):
		min_cell_h = MAX_LOT + 2.0 * MARGIN
	var LOT: float = clamp_lot.call(min(min_cell_w - 2.0 * MARGIN, min_cell_h - 2.0 * MARGIN))
	var LOT_W: float = LOT
	var LOT_H: float = LOT

	j.call(8.0)
	j.call(6.0)
	var lots: Array = []
	var lot_index: int = 0
	for r in rows:
		for c in cols:
			if excluded[r][c]:
				continue
			var blk: Dictionary = block[r][c]
			var tag: String = ("n" if r < pr else "s") + ("w" if c < pc else "e")
			lots.append({
				"index": lot_index,
				"cx": blk["x"] + blk["w"] / 2.0,
				"cy": blk["y"] + blk["h"] / 2.0,
				"w": LOT_W, "h": LOT_H, "row": tag,
			})
			lot_index += 1

	# ── Trees (biased toward leftover/dropped blocks, margins, corners) ───────
	var trees: Array = []
	var cluster_n: int = 3 + int(floor(rng.call() * 4.0))  # 3..6
	for cl in cluster_n:
		var center := _pt(W / 2.0, H / 2.0)
		for _attempt in 16:
			var cx: float = border + rng.call() * (W - 2.0 * border)
			var cy: float = border + rng.call() * (H - 2.0 * border)
			center = _pt(cx, cy)
			var ok: bool = not hits_road.call(center, 24.0) and not hits_water.call(cx, cy, 30.0, 30.0) \
				and not hits_plaza.call(cx, cy) and not hits_board.call(cx, cy, 30.0, 30.0)
			if ok:
				for l in lots:
					if aabb_overlap.call({"cx": cx, "cy": cy, "w": 30.0, "h": 30.0}, l, 8.0):
						ok = false
						break
			if ok:
				break
		var canopy: int = 3 + int(floor(rng.call() * 5.0))  # 3..7
		var broke: bool = false
		for _t in canopy:
			if trees.size() >= 40:
				broke = true
				break
			var tx: float = center["x"] + j.call(40.0)
			var ty: float = center["y"] + j.call(40.0)
			var tr: float = 14.0 + float(int(floor(rng.call() * 13.0)))
			var front: bool = false
			for l in lots:
				if abs(tx - l["cx"]) < l["w"] * 0.7 and l["cy"] <= ty and ty <= l["cy"] + l["h"] * 0.8:
					front = true
					break
			trees.append({"x": tx, "y": ty, "r": tr, "cluster": cl, "front": front})
		if trees.size() >= 40 or broke:
			break

	# ── Fields (bound to the farm board block) ────────────────────────────────
	# We walk the original 1..3 iteration loop and consume the SAME per-iteration
	# rng()/j() draws so the downstream PRNG stream is unchanged; only the first
	# iteration pushes, and its geometry comes from the board (angle 0).
	var fields: Array = []
	if kinds.has("farm"):
		var farm_board: Dictionary = {}
		for b in boards:
			if b["kind"] == "farm":
				farm_board = b
				break
		var fb: Dictionary = farm_board if not farm_board.is_empty() \
			else {"cx": W * 0.16, "cy": H * 0.5, "w": 150.0, "h": 140.0}
		var field_n: int = 1 + int(floor(rng.call() * 3.0))  # 1..3
		for f in field_n:
			j.call(60.0)
			j.call(20.0)
			var _a: int = int(floor(rng.call() * 80.0))
			var _b: int = int(floor(rng.call() * 60.0))
			var field_rows: int = 4 + int(floor(rng.call() * 4.0))  # 4..7
			j.call(0.15)
			if f == 0:
				fields.append({
					"cx": fb["cx"],
					"cy": fb["cy"],
					"w": fb["w"] * 0.9,
					"h": fb["h"] * 0.9,
					"rows": field_rows,
					"angle": 0.0,  # no rotation → bbox can't overflow the board cell
				})

	# ── Fences (border a field or cluster) ────────────────────────────────────
	var fences: Array = []
	var fence_n: int = 1 + int(floor(rng.call() * 2.0))  # 1..2
	var anchors: Array = []
	if fields.size() > 0:
		for f in fields:
			anchors.append(_pt(f["cx"], f["cy"]))
	elif trees.size() > 0:
		anchors.append(_pt(trees[0]["x"], trees[0]["y"]))
	else:
		anchors.append(_pt(plaza["cx"], plaza["cy"]))
	for f in fence_n:
		var a: Dictionary = anchors[f % anchors.size()]
		var pts: Array = []
		var segs: int = 3 + int(floor(rng.call() * 3.0))  # 3..5
		for s in segs:
			pts.append(_pt(a["x"] - 70.0 + (140.0 / float(segs - 1)) * float(s) + j.call(10.0), a["y"] + 70.0 + j.call(14.0)))
		fences.append({"points": pts})

	# ── streets (back-compat 2-pt segments from road polylines) ───────────────
	var streets: Array = []
	for rd in roads:
		var pts: Array = rd["points"]
		for i in pts.size() - 1:
			streets.append({
				"x1": pts[i]["x"], "y1": pts[i]["y"],
				"x2": pts[i + 1]["x"], "y2": pts[i + 1]["y"],
				"width": rd["width"],
			})

	# ── Waypoints / edges = street-intersection lattice ───────────────────────
	var waypoints: Array = []
	var edges: Array = []
	var wp := func(wx: float, wy: float) -> int:
		waypoints.append({"x": wx, "y": wy})
		return waypoints.size() - 1
	var nx: int = street_x.size()
	var ny: int = street_y.size()
	var node_at: Array = []
	for _yi in ny:
		var row_arr: Array = []
		for _xi in nx:
			row_arr.append(-1)
		node_at.append(row_arr)
	for yi in ny:
		for xi in nx:
			node_at[yi][xi] = wp.call(street_x[xi], street_y[yi])
	for yi in ny:
		for xi in nx:
			if xi + 1 < nx:
				edges.append([node_at[yi][xi], node_at[yi][xi + 1]])
			if yi + 1 < ny:
				edges.append([node_at[yi][xi], node_at[yi + 1][xi]])
	var plaza_wp: int = wp.call(plaza["cx"], plaza["cy"] + 6.0)
	var near: int = node_at[0][0]
	var best_d: float = INF
	for yi in ny:
		for xi in nx:
			var node: int = node_at[yi][xi]
			var d: float = sqrt((waypoints[node]["x"] - plaza["cx"]) * (waypoints[node]["x"] - plaza["cx"]) \
				+ (waypoints[node]["y"] - plaza["cy"]) * (waypoints[node]["y"] - plaza["cy"]))
			if d < best_d:
				best_d = d
				near = node
	edges.append([plaza_wp, near])

	# ── Props ─────────────────────────────────────────────────────────────────
	var props: Array = [
		{"kind": "well", "x": well["cx"], "y": well["cy"]},
		{"kind": "signpost", "x": plaza["cx"] + 70.0 + j.call(10.0), "y": plaza["cy"] - plaza["ry"] - 20.0},
		{"kind": "cart", "x": plaza["cx"] - 160.0 + j.call(20.0), "y": plaza["cy"] + 140.0},
		{"kind": "planter", "x": plaza["cx"] + 150.0 + j.call(20.0), "y": plaza["cy"] - 120.0},
	]
	# Nudge any plaza-decoration prop (not the well) that landed on a road back
	# toward the plaza centre. Pure geometry — no rng draws.
	var settle_prop := func(p: Dictionary) -> void:
		if not hits_road.call(_pt(p["x"], p["y"]), 2.0):
			return
		var px: float = p["x"]
		var py: float = p["y"]
		for _i in 3:
			px = (px + plaza["cx"]) / 2.0
			py = (py + plaza["cy"]) / 2.0
			if not hits_road.call(_pt(px, py), 2.0):
				p["x"] = px
				p["y"] = py
				return
		var theta: float = atan2(p["y"] - plaza["cy"], p["x"] - plaza["cx"])
		p["x"] = plaza["cx"] + cos(theta) * plaza["rx"] * 0.8
		p["y"] = plaza["cy"] + sin(theta) * plaza["ry"] * 0.8
	for p in props:
		if p["kind"] != "well":
			settle_prop.call(p)

	# Lampposts: nearest street intersections, offset to a clear corner.
	var lamp_n: int = 2 + int(floor(rng.call() * 3.0))
	var ordered: Array = []
	for yi in ny:
		for xi in nx:
			var lx: float = street_x[xi]
			var ly: float = street_y[yi]
			ordered.append({"x": lx, "y": ly, "d": sqrt((lx - plaza["cx"]) * (lx - plaza["cx"]) + (ly - plaza["cy"]) * (ly - plaza["cy"]))})
	ordered.sort_custom(func(a, b): return a["d"] < b["d"])
	var LAMP_OFF: float = AVENUE / 2.0 + 12.0
	var CORNERS: Array = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
	for i in min(lamp_n, ordered.size()):
		var ox: float = ordered[i]["x"]
		var oy: float = ordered[i]["y"]
		for corner in CORNERS:
			var dx: int = corner[0]
			var dy: int = corner[1]
			var cxp: float = ox + float(dx) * LAMP_OFF
			var cyp: float = oy + float(dy) * LAMP_OFF
			var free: bool = not hits_road.call(_pt(cxp, cyp), 2.0) and not hits_plaza.call(cxp, cyp) \
				and cxp > 0.0 and cxp < W and cyp > 0.0 and cyp < H
			if free:
				for l in lots:
					if aabb_overlap.call({"cx": cxp, "cy": cyp, "w": 10.0, "h": 10.0}, l, 4.0):
						free = false
						break
			if free:
				props.append({"kind": "lamppost", "x": cxp, "y": cyp})
				break

	# ── Kept lots + front paths ───────────────────────────────────────────────
	var kept_lots: Array = lots.slice(0, n)
	var paths: Array = []
	var PATH_W: float = 14.0
	for l in kept_lots:
		if l["row"] == "plaza":
			continue
		var cx: float = l["cx"]
		var cy: float = l["cy"]
		var w: float = l["w"]
		var h: float = l["h"]
		var gx_l: float = -INF
		var gx_r: float = INF
		var gy_b: float = INF
		for sx in street_x:
			if sx < cx and sx > gx_l:
				gx_l = sx
			if sx > cx and sx < gx_r:
				gx_r = sx
		for sy in street_y:
			if sy > cy and sy < gy_b:
				gy_b = sy
		var d_l: float = (cx - gx_l) if is_finite(gx_l) else INF
		var d_r: float = (gx_r - cx) if is_finite(gx_r) else INF
		var d_b: float = (gy_b - cy) if is_finite(gy_b) else INF
		var best: float = min(d_l, min(d_r, d_b))
		if not is_finite(best):
			continue
		if best == d_b:
			paths.append({"x1": cx, "y1": cy + h / 2.0, "x2": cx, "y2": gy_b, "width": PATH_W})
		elif best == d_r:
			paths.append({"x1": cx + w / 2.0, "y1": cy, "x2": gx_r, "y2": cy, "width": PATH_W})
		else:
			paths.append({"x1": cx - w / 2.0, "y1": cy, "x2": gx_l, "y2": cy, "width": PATH_W})

	# ── Lush decoration (separate decor RNG, independent of the main stream) ───
	var decor_state := _seeded_rng_state(zone_id + ":decor")
	var decor_rng := func() -> float: return _rng_next(decor_state)
	var dj := func(amt: float) -> float: return (decor_rng.call() - 0.5) * 2.0 * amt

	var lot_decor: Array = []
	for l in kept_lots:
		if l["row"] == "plaza":
			continue
		var cnt: int = int(floor(decor_rng.call() * 3.0))  # 0..2 accents
		var left := _pt(l["cx"] - l["w"] * 0.32, l["cy"] + l["h"] * 0.30)
		var right := _pt(l["cx"] + l["w"] * 0.32, l["cy"] + l["h"] * 0.30)
		for k in cnt:
			var anchor: Dictionary = left if k == 0 else right
			var kind: String = (["bed", "pots", "shrub"] as Array)[int(floor(decor_rng.call() * 3.0))]
			lot_decor.append({"lot": l["index"], "x": anchor["x"] + dj.call(3.0), "y": anchor["y"] + dj.call(2.0), "kind": kind})

	# Street-verge trees: ~40 deterministic attempts, capped at 22.
	var STREET_TREE_CAP: int = 22
	var street_trees: Array = []
	for _i in 40:
		if street_trees.size() >= STREET_TREE_CAP:
			break
		var sx2: float = 40.0 + decor_rng.call() * (W - 80.0)
		var sy2: float = 40.0 + decor_rng.call() * (H - 80.0)
		var sr: float = 8.0 + float(int(floor(decor_rng.call() * 6.0)))  # 8..13
		var ok: bool = not hits_road.call(_pt(sx2, sy2), sr + 4.0) \
			and not hits_water.call(sx2, sy2, sr * 2.0, sr * 2.0) \
			and not hits_plaza.call(sx2, sy2) \
			and not hits_board.call(sx2, sy2, sr * 2.0, sr * 2.0)
		if ok:
			for l in kept_lots:
				if aabb_overlap.call({"cx": sx2, "cy": sy2, "w": sr * 2.0, "h": sr * 2.0}, l, 6.0):
					ok = false
					break
		if ok:
			for t in street_trees:
				if sqrt((t["x"] - sx2) * (t["x"] - sx2) + (t["y"] - sy2) * (t["y"] - sy2)) < (t["r"] + sr + 10.0):
					ok = false
					break
		if ok:
			street_trees.append({"x": sx2, "y": sy2, "r": sr})

	# ── Return ────────────────────────────────────────────────────────────────
	return {
		"stage_w": W, "stage_h": H,
		"ground": {"top": 0.0},
		"plaza": plaza,
		"well": well,
		"streets": streets,
		"lots": kept_lots,
		"boards": boards,
		"props": props,
		"waypoints": waypoints, "edges": edges,
		"roads": roads, "water": water, "trees": trees, "fields": fields, "fences": fences,
		"bridges": bridges, "paths": paths,
		"lot_decor": lot_decor, "street_trees": street_trees,
	}
