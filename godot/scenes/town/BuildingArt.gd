class_name BuildingArt
extends RefCounted
## Distinct per-building town art for the spatial town map (scenes/town/TownMap.gd).
##
## The React+Phaser game draws a UNIQUE illustrated iso structure per building type
## (src/iso/buildings/*.tsx — mill/windmill, barn, forge, granary, silo, portal,
## workshop, chapel, observatory, sawmill, stable, coop, bakery, kitchen, larder,
## smokehouse, housing, hearth, apiary, powder_store, …). The Godot port previously
## drew EVERY built plot as the same tan box + red roof + a text label — the single
## biggest "looks unfinished" gap. This module replaces that identical box with a
## distinct silhouette per building "shape family" so each plot reads at a glance.
##
## The TownMap is a top-down plan with a slight front-elevation (a building is a wall
## rect with a roof drawn above it). We keep that convention — no PNG pipeline, no iso
## diamond footprints — but give each family its own massing, roof shape, accents, and
## palette. Drawing is delegated BACK to the TownMap (the `canvas` arg) so every shape
## flows through the SAME _pxy()/_s() fit transform the rest of the map uses; this
## script owns only the id→shape mapping, the per-family palette, and the per-shape
## geometry. It is a stateless `class_name` global (like Palette / Constants) so the
## mapping is testable headlessly without a live scene tree.
##
## SHAPE FAMILY MAP (building_id → silhouette):
##   lumber_camp ........ lumber  (log-pile lean-to + stacked logs)
##   coop ............... coop    (low animal pen + nesting bird)
##   garden ............. garden  (crop beds + plant rows)
##   bakery ............. cookhouse (chimney + hanging sign, warm oven glow)
##   kitchen ............ cookhouse (smoke-hood flue, warm glow)
##   larder ............. cellar  (earth-banked turf mound + arched door)
##   smokehouse ......... smokehut (tall tapering charred hut venting smoke)
##   workshop ........... workshop (sawtooth/clerestory roof + lumber rack)
##   forge .............. forge   (brick smithy + tall chimney + furnace glow)
##   mill ............... mill    (round tower + 4 turning sails) [windmill]
##   granary ............ rotunda (round stone tower + conical roof)
##   silo ............... silo    (tall round metal cylinder + domed cap)
##   barn ............... barn    (wide gambrel roof + big X-brace doors)
##   sawmill ............ sawmill (shed + spinning circular saw blade)
##   stable ............. stable  (long low pen + a horse head over a half-door)
##   apiary ............. skep    (domed coiled-straw beehive)
##   chapel ............. chapel  (nave + tall steeple + cross finial)
##   observatory ........ observatory (stone drum + metal dome + slit)
##   powder_store ....... bunker  (squat reinforced magazine + barrels)
##   mining_camp ........ mine    (stone head-frame hut + ore cart)
##   housing/2/3 ........ cottage (snug gabled cottage + chimney smoke)
##   ratcatcher ......... hut     (small hut + a pole sign)
##   master_ratcatcher .. hut
##   <unknown id> ....... house   (the generic fallback — always draws SOMETHING)
##
## ANIMATION. A `phase` (seconds) is threaded in so a few families animate without
## per-frame state: the mill's sails rotate and chimney smoke drifts. The TownMap
## advances `phase` in _process (guarded so headless never errors). Everything else
## is static — the silhouette alone disambiguates.

# ── Per-family palette (warm, distinct, sits over the grass/dirt map) ───────────
const ROOF_RED := Color("b25a36")          # warm terracotta (cottages, generic)
const ROOF_RED_EDGE := Color("7a3a1c")
const ROOF_SLATE := Color("5b5346")         # grey slate (forge, chapel, mill cap)
const ROOF_SLATE_EDGE := Color("3a352d")
const ROOF_GREEN := Color("4a6a32")         # turf / mossy (larder, garden)
const ROOF_GREEN_EDGE := Color("33491f")
const ROOF_BROWN := Color("6a4a26")         # timber roof (barn, stable, workshop)
const ROOF_BROWN_EDGE := Color("47301a")

const WALL_CLAY := Color("d8b27a")          # warm clay plaster (default)
const WALL_CLAY_EDGE := Color("9a734a")
const WALL_STONE := Color("b9ac8e")         # grey stone (chapel, granary, observatory)
const WALL_STONE_EDGE := Color("857a5f")
const WALL_TIMBER := Color("9a784a")        # board timber (barn, stable, sawmill)
const WALL_TIMBER_EDGE := Color("6a4a26")
const WALL_BRICK := Color("9a4a30")         # red brick (forge)
const WALL_BRICK_EDGE := Color("6a3320")
const WALL_METAL := Color("b7b3a4")         # corrugated metal (silo)
const WALL_METAL_EDGE := Color("8a8478")

const DOOR := Color("4a3520")
const WINDOW_LIT := Color("ffd887")         # warm lit pane
const GLOW_FIRE := Color("ff8a28")          # furnace / oven glow
const GLOW_FIRE_HOT := Color("ffd36a")
const SMOKE := Color(0.86, 0.84, 0.80, 0.55)
const STRAW := Color("cda85a")              # skep coils, thatch
const STRAW_EDGE := Color("9c7838")
const SHADOW := Color(0.118, 0.094, 0.047, 0.30)

# Portal — the glowing purple arch (a Main special-case building; included so a
# `magic_portal` id still draws distinctly if it ever lands on a lot).
const PORTAL_STONE := Color("4a3a5a")
const PORTAL_STONE_EDGE := Color("2e2438")
const PORTAL_GLOW := Color("b06ad6")
const PORTAL_GLOW_HOT := Color("e0a8ff")

const GOLD := Color("e2b24a")
const BELL := Color("c9a23a")
const SAIL := Color("f0e6cc")
const SAIL_EDGE := Color("6a4a26")
const BLADE := Color("d8d4c8")
const ANIMAL := Color("8a6a4a")             # horse / bird body
const FOLIAGE := Color("4a7a32")
const FOLIAGE_HI := Color("6a9a48")

## building_id → shape-family key. Unknown ids fall back to "house" so a built lot
## ALWAYS draws something (the placeholder-fallback guarantee). Kept as a plain
## Dictionary const so the mapping is trivially testable.
const SHAPE_BY_ID := {
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
	"magic_portal": "portal",
	"portal": "portal",
}

## Resolve a building id to its shape-family key. Unknown ids → "house" (the generic
## fallback drawer), so every id resolves to a real drawer and a built lot always
## draws SOMETHING. Static so a headless test can assert the mapping without a scene.
static func shape_for(id: String) -> String:
	return String(SHAPE_BY_ID.get(id, "house"))

## Every shape-family key that has a dedicated drawer in this module (plus the
## "house" fallback). Exposed so a test can assert shape_for() never returns a key
## outside this set.
const KNOWN_SHAPES := [
	"house", "lumber", "coop", "garden", "cookhouse", "cellar", "smokehut",
	"workshop", "forge", "mill", "rotunda", "silo", "barn", "sawmill", "stable",
	"skep", "chapel", "observatory", "bunker", "mine", "cottage", "hut", "portal",
]

# ── Draw entry point ────────────────────────────────────────────────────────────
## Draw the building `id` centred in the lot rect (plan-space centre cx,cy with size
## w,h). `canvas` is the TownMap node — every primitive routes through its _pxy()/_s()
## fit transform + its screen-rect/ellipse helpers, so the art honours the same zoom/
## pan/fit as the rest of the map. `phase` (seconds) drives the few animated families.
##
## A "footprint" is computed bottom-anchored inside the lot (a touch inset), and a
## ground shadow is drawn first; each family then draws its distinct massing within it.
static func draw_building(canvas: Object, id: String, cx: float, cy: float, w: float, h: float, phase: float = 0.0) -> void:
	var shape := shape_for(id)
	# Footprint: bottom-anchored in the lot, inset so neighbouring lots don't touch.
	var fw: float = w * 0.66
	var base_y: float = cy + h * 0.5 - h * 0.08       # ground contact line
	var ctx := {
		"canvas": canvas,
		"cx": cx,
		"base_y": base_y,
		"fw": fw,
		"lw": w,
		"lh": h,
		"phase": phase,
	}
	# Ground shadow under every building (matches the map's other shadows).
	canvas._draw_filled_ellipse(canvas._pxy(cx, base_y + 2.0), canvas._s(fw * 0.56), canvas._s(maxf(4.0, h * 0.07)), SHADOW)
	match shape:
		"lumber": _draw_lumber(ctx)
		"coop": _draw_coop(ctx)
		"garden": _draw_garden(ctx)
		"cookhouse": _draw_cookhouse(ctx)
		"cellar": _draw_cellar(ctx)
		"smokehut": _draw_smokehut(ctx)
		"workshop": _draw_workshop(ctx)
		"forge": _draw_forge(ctx)
		"mill": _draw_mill(ctx)
		"rotunda": _draw_rotunda(ctx)
		"silo": _draw_silo(ctx)
		"barn": _draw_barn(ctx)
		"sawmill": _draw_sawmill(ctx)
		"stable": _draw_stable(ctx)
		"skep": _draw_skep(ctx)
		"chapel": _draw_chapel(ctx)
		"observatory": _draw_observatory(ctx)
		"bunker": _draw_bunker(ctx)
		"mine": _draw_mine(ctx)
		"cottage": _draw_cottage(ctx)
		"hut": _draw_hut(ctx)
		"portal": _draw_portal(ctx)
		_: _draw_house(ctx)

# ── shared low-level helpers (route through canvas._pxy/_s) ──────────────────────

## A plan-space rect (top-left x,y + w,h) filled, with an optional outline.
static func _rect(c: Object, x: float, y: float, w: float, h: float, fill: Color, edge = null, ew: float = 2.0) -> void:
	c._draw_screen_rect(x, y, w, h, fill)
	if edge != null:
		c._draw_screen_rect_outline(x, y, w, h, edge, c._s(ew))

## A filled triangle from three plan-space points, with an optional outline.
static func _tri(c: Object, ax: float, ay: float, bx: float, by: float, cx: float, cy: float, fill: Color, edge = null, ew: float = 1.5) -> void:
	var poly := PackedVector2Array([c._pxy(ax, ay), c._pxy(bx, by), c._pxy(cx, cy)])
	c.draw_colored_polygon(poly, fill)
	if edge != null:
		var ring := poly.duplicate()
		ring.append(poly[0])
		c.draw_polyline(ring, edge, maxf(1.0, c._s(ew)), true)

## A filled convex polygon from plan-space (x,y) pairs, with an optional outline.
static func _poly(c: Object, pts: Array, fill: Color, edge = null, ew: float = 1.5) -> void:
	var sp := PackedVector2Array()
	for p in pts:
		sp.append(c._pxy(p.x, p.y))
	c.draw_colored_polygon(sp, fill)
	if edge != null:
		var ring := sp.duplicate()
		ring.append(sp[0])
		c.draw_polyline(ring, edge, maxf(1.0, c._s(ew)), true)

static func _circle(c: Object, x: float, y: float, r: float, fill: Color) -> void:
	c.draw_circle(c._pxy(x, y), c._s(r), fill)

static func _ellipse(c: Object, x: float, y: float, rx: float, ry: float, fill: Color) -> void:
	c._draw_filled_ellipse(c._pxy(x, y), c._s(rx), c._s(ry), fill)

static func _line(c: Object, ax: float, ay: float, bx: float, by: float, col: Color, w: float = 1.5) -> void:
	c.draw_line(c._pxy(ax, ay), c._pxy(bx, by), col, maxf(1.0, c._s(w)), true)

## A standard gable-roofed wall block: a wall rect from base_y up by wall_h, a
## triangular gable roof of roof_h overhanging by `over`, returns the wall-top y.
static func _wall_and_gable(c: Object, cx: float, base_y: float, bw: float, wall_h: float, roof_h: float, wall: Color, wall_edge: Color, roof: Color, roof_edge: Color, over: float = 0.10) -> float:
	var x0: float = cx - bw * 0.5
	var wy0: float = base_y - wall_h
	_rect(c, x0, wy0, bw, wall_h, wall, wall_edge, 2.0)
	var ov: float = bw * over
	_poly(c, [
		Vector2(x0 - ov, wy0), Vector2(cx, wy0 - roof_h), Vector2(x0 + bw + ov, wy0),
	], roof, roof_edge, 1.5)
	return wy0

## A small lit/dark window on a wall (plan-space centre).
static func _window(c: Object, x: float, y: float, w: float, h: float, lit: bool = true) -> void:
	_rect(c, x - w * 0.5 - 1.0, y - h * 0.5 - 1.0, w + 2.0, h + 2.0, DOOR)
	_rect(c, x - w * 0.5, y - h * 0.5, w, h, WINDOW_LIT if lit else Color("3a4a52"))

## A door at the wall base (plan-space centre x, bottom at base_y).
static func _door(c: Object, x: float, base_y: float, w: float, h: float, col: Color = DOOR) -> void:
	_rect(c, x - w * 0.5, base_y - h, w, h, col)

## Drifting chimney smoke: a few puffs rising from (x,y), gently swaying by `phase`.
static func _smoke(c: Object, x: float, y: float, phase: float, scale: float = 1.0) -> void:
	for i in 3:
		var t: float = fposmod(phase * 0.5 + float(i) * 0.33, 1.0)
		var puff_y: float = y - t * 22.0 * scale
		var sway: float = sin((phase + float(i)) * 1.6) * 3.0 * scale
		var col := SMOKE
		col.a = SMOKE.a * (1.0 - t)
		_ellipse(c, x + sway, puff_y, (3.0 + t * 4.0) * scale, (2.2 + t * 3.0) * scale, col)

# ── shape drawers ────────────────────────────────────────────────────────────────
# Each takes the ctx dict; reads c=canvas, cx, base_y, fw (footprint width), lh.

static func _draw_house(ctx: Dictionary) -> void:
	# Generic cottage: clay wall + terracotta gable roof + a door + a window. The
	# fallback so an unknown building id still reads as a building.
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw
	var wall_h: float = ctx.lh * 0.40
	var roof_h: float = ctx.lh * 0.26
	var wy0 := _wall_and_gable(c, cx, by, bw, wall_h, roof_h, WALL_CLAY, WALL_CLAY_EDGE, ROOF_RED, ROOF_RED_EDGE)
	_door(c, cx, by, bw * 0.26, wall_h * 0.55)
	_window(c, cx + bw * 0.26, wy0 + wall_h * 0.42, bw * 0.16, wall_h * 0.3)

static func _draw_cottage(ctx: Dictionary) -> void:
	# Housing: a snug cottage — slightly smaller wall, steeper roof, a smoking
	# chimney off to one side + a window. Reads as a HOME (vs the generic house).
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw * 0.92
	var wall_h: float = ctx.lh * 0.36
	var roof_h: float = ctx.lh * 0.30
	var wy0 := _wall_and_gable(c, cx, by, bw, wall_h, roof_h, WALL_CLAY, WALL_CLAY_EDGE, ROOF_RED, ROOF_RED_EDGE)
	_door(c, cx - bw * 0.18, by, bw * 0.22, wall_h * 0.6)
	_window(c, cx + bw * 0.22, wy0 + wall_h * 0.42, bw * 0.18, wall_h * 0.3)
	# Leaning chimney near the ridge, smoking.
	var chx: float = cx + bw * 0.30
	var chy: float = wy0 - roof_h * 0.55
	_rect(c, chx - bw * 0.05, chy, bw * 0.10, roof_h * 0.7 + wall_h * 0.2, WALL_BRICK, WALL_BRICK_EDGE, 1.0)
	_smoke(c, chx, chy, ctx.phase, 0.8)

static func _draw_lumber(ctx: Dictionary) -> void:
	# Lumber Camp: an open lean-to shed over a workbench, with stacked logs out
	# front (the unmistakable timber-yard read).
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw
	var wall_h: float = ctx.lh * 0.30
	var x0: float = cx - bw * 0.5
	# Lean-to: a back post wall + a mono-pitch roof sloping toward the viewer.
	_rect(c, x0, by - wall_h, bw * 0.5, wall_h, WALL_TIMBER, WALL_TIMBER_EDGE, 1.5)
	# Mono-pitch roof (higher at back-left, lower at front-right).
	_poly(c, [
		Vector2(x0 - bw * 0.06, by - wall_h),
		Vector2(x0 + bw + bw * 0.06, by - wall_h * 0.45),
		Vector2(x0 + bw + bw * 0.06, by - wall_h * 0.45 + ctx.lh * 0.06),
		Vector2(x0 - bw * 0.06, by - wall_h + ctx.lh * 0.06),
	], ROOF_BROWN, ROOF_BROWN_EDGE, 1.5)
	# Stacked logs (a small triangular pyramid of round log-ends).
	var lr: float = bw * 0.07
	var lx: float = cx + bw * 0.04
	_circle(c, lx - lr * 1.1, by - lr, lr, WALL_TIMBER)
	_circle(c, lx + lr * 1.1, by - lr, lr, WALL_TIMBER)
	_circle(c, lx, by - lr * 2.7, lr, WALL_TIMBER)
	for dx in [-lr * 1.1, lr * 1.1]:
		_circle(c, lx + dx, by - lr, lr * 0.5, ROOF_BROWN_EDGE)
	_circle(c, lx, by - lr * 2.7, lr * 0.5, ROOF_BROWN_EDGE)

static func _draw_coop(ctx: Dictionary) -> void:
	# Coop: a low pen with a small gabled hen-house + a nesting bird poking out.
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw
	var wall_h: float = ctx.lh * 0.24
	var roof_h: float = ctx.lh * 0.18
	# Pen rail (a low fence rect in dirt) behind the hut.
	_rect(c, cx - bw * 0.5, by - wall_h * 0.4, bw, wall_h * 0.4, Color("8a6a3a"), WALL_TIMBER_EDGE, 1.0)
	# Small hen-house, left of centre.
	var hw: float = bw * 0.5
	var hx: float = cx - bw * 0.18
	_wall_and_gable(c, hx, by, hw, wall_h, roof_h, WALL_CLAY, WALL_CLAY_EDGE, ROOF_RED, ROOF_RED_EDGE)
	# Round entry hole.
	_circle(c, hx, by - wall_h * 0.5, hw * 0.16, DOOR)
	# A hen on the right.
	var bx: float = cx + bw * 0.26
	_ellipse(c, bx, by - wall_h * 0.5, bw * 0.12, wall_h * 0.5, Color("e8e0d0"))
	_circle(c, bx + bw * 0.08, by - wall_h * 0.8, bw * 0.05, Color("e8e0d0"))
	_circle(c, bx + bw * 0.10, by - wall_h * 0.92, bw * 0.02, Color("c0392b"))  # comb

static func _draw_garden(ctx: Dictionary) -> void:
	# Garden: tilled crop beds with green plant rows + a small tool shed at the back.
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw
	# Tool shed (small, back).
	var sw: float = bw * 0.34
	_wall_and_gable(c, cx + bw * 0.28, by - ctx.lh * 0.10, sw, ctx.lh * 0.22, ctx.lh * 0.14, WALL_TIMBER, WALL_TIMBER_EDGE, ROOF_BROWN, ROOF_BROWN_EDGE)
	# Soil bed + plant rows in front.
	var bed_w: float = bw * 0.9
	var bed_h: float = ctx.lh * 0.18
	_rect(c, cx - bed_w * 0.5, by - bed_h, bed_w, bed_h, Color("6f4f28"), Color("4a3318"), 1.0)
	for i in 4:
		var px: float = cx - bed_w * 0.36 + (bed_w * 0.72) * (float(i) / 3.0)
		_circle(c, px, by - bed_h * 0.55, bw * 0.06, FOLIAGE)
		_circle(c, px - bw * 0.02, by - bed_h * 0.75, bw * 0.035, FOLIAGE_HI)

static func _draw_cookhouse(ctx: Dictionary) -> void:
	# Bakery / Kitchen: a clay shop with a warm glowing oven mouth, a tall smoking
	# chimney, and a hanging shop sign — the "cook-house" read.
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw
	var wall_h: float = ctx.lh * 0.42
	var roof_h: float = ctx.lh * 0.22
	var wy0 := _wall_and_gable(c, cx, by, bw, wall_h, roof_h, WALL_CLAY, WALL_CLAY_EDGE, ROOF_RED, ROOF_RED_EDGE)
	# Glowing arched oven mouth.
	var ow: float = bw * 0.26
	_ellipse(c, cx - bw * 0.16, by - wall_h * 0.30, ow * 0.6, wall_h * 0.34, GLOW_FIRE)
	_ellipse(c, cx - bw * 0.16, by - wall_h * 0.26, ow * 0.4, wall_h * 0.22, GLOW_FIRE_HOT)
	# Hanging shop sign on the right.
	_line(c, cx + bw * 0.30, wy0 + wall_h * 0.10, cx + bw * 0.30, wy0 + wall_h * 0.42, WALL_TIMBER_EDGE, 1.5)
	_rect(c, cx + bw * 0.22, wy0 + wall_h * 0.42, bw * 0.16, wall_h * 0.18, GOLD, ROOF_RED_EDGE, 1.0)
	# Tall smoking chimney.
	var chx: float = cx + bw * 0.34
	var chy: float = wy0 - roof_h * 0.9
	_rect(c, chx - bw * 0.045, chy, bw * 0.09, roof_h * 1.3 + wall_h * 0.2, WALL_BRICK, WALL_BRICK_EDGE, 1.0)
	_smoke(c, chx, chy, ctx.phase, 1.0)

static func _draw_cellar(ctx: Dictionary) -> void:
	# Larder: an earth-banked root cellar — a green turf MOUND with a deep recessed
	# arched stone doorway. No box, no peaked roof.
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw
	var mh: float = ctx.lh * 0.40
	# Turf mound (a flattened dome).
	_ellipse(c, cx, by - mh * 0.45, bw * 0.55, mh, ROOF_GREEN)
	_ellipse(c, cx - bw * 0.10, by - mh * 0.62, bw * 0.30, mh * 0.55, FOLIAGE_HI)
	# Cut off the bottom so it sits on the ground (overdraw a ground-coloured rect).
	# Recessed stone-arched doorway.
	var dw: float = bw * 0.26
	_ellipse(c, cx, by - mh * 0.18, dw * 0.62, mh * 0.4, WALL_STONE)
	_rect(c, cx - dw * 0.4, by - mh * 0.28, dw * 0.8, mh * 0.28, Color("23323a"))
	# A stubby stone vent on top.
	_rect(c, cx + bw * 0.22, by - mh * 0.75, bw * 0.08, mh * 0.30, WALL_STONE, WALL_STONE_EDGE, 1.0)

static func _draw_smokehut(ctx: Dictionary) -> void:
	# Smokehouse: a tall steeply-tapering charred hut (kiln cone) venting heavy
	# smoke from a capped top, with an ember-glow door.
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw * 0.7
	var ht: float = ctx.lh * 0.66
	# Tapering body (a tall narrow trapezoid).
	_poly(c, [
		Vector2(cx - bw * 0.5, by),
		Vector2(cx + bw * 0.5, by),
		Vector2(cx + bw * 0.16, by - ht),
		Vector2(cx - bw * 0.16, by - ht),
	], Color("4a3a2c"), Color("2e231a"), 1.5)
	# Plank seams.
	for i in 3:
		var sy: float = by - ht * (0.3 + 0.2 * float(i))
		_line(c, cx - bw * (0.42 - 0.08 * float(i)), sy, cx + bw * (0.42 - 0.08 * float(i)), sy, Color(0, 0, 0, 0.3), 0.8)
	# Capped vent + smoke.
	_rect(c, cx - bw * 0.20, by - ht - ctx.lh * 0.04, bw * 0.40, ctx.lh * 0.04, Color("2e231a"))
	_smoke(c, cx, by - ht - ctx.lh * 0.04, ctx.phase, 1.3)
	# Ember-glow door.
	_ellipse(c, cx, by - ht * 0.12, bw * 0.22, ht * 0.14, GLOW_FIRE)

static func _draw_workshop(ctx: Dictionary) -> void:
	# Workshop: a timber shed with a SAWTOOTH clerestory roof (the carpenter read)
	# + a lumber rack of stacked planks down the side.
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw
	var wall_h: float = ctx.lh * 0.34
	var x0: float = cx - bw * 0.5
	_rect(c, x0, by - wall_h, bw, wall_h, WALL_TIMBER, WALL_TIMBER_EDGE, 1.5)
	# Sawtooth roof: three rising teeth with vertical glazed risers.
	var teeth: int = 3
	var tw: float = bw / float(teeth)
	var th: float = ctx.lh * 0.16
	for i in teeth:
		var tx: float = x0 + tw * float(i)
		_poly(c, [
			Vector2(tx, by - wall_h),
			Vector2(tx + tw, by - wall_h - th),
			Vector2(tx + tw, by - wall_h),
		], ROOF_BROWN, ROOF_BROWN_EDGE, 1.0)
		# Glazed riser face (lit).
		_rect(c, tx + tw - bw * 0.02, by - wall_h - th, bw * 0.03, th, WINDOW_LIT)
	# Open barn doors (a dark bay).
	_rect(c, cx - bw * 0.16, by - wall_h * 0.8, bw * 0.32, wall_h * 0.8, DOOR)
	# Lean-to lumber rack of planks on the right.
	for i in 3:
		_rect(c, cx + bw * 0.30, by - wall_h * 0.2 - float(i) * ctx.lh * 0.05, bw * 0.22, ctx.lh * 0.035, Color("c8a972"), WALL_TIMBER_EDGE, 0.8)

static func _draw_forge(ctx: Dictionary) -> void:
	# Forge: a brick smithy with a slate hip-ish roof, a tall brick chimney
	# (smoking) and a glowing furnace mouth — the hero detail.
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw
	var wall_h: float = ctx.lh * 0.40
	var roof_h: float = ctx.lh * 0.20
	var x0: float = cx - bw * 0.5
	var wy0: float = by - wall_h
	_rect(c, x0, wy0, bw, wall_h, WALL_BRICK, WALL_BRICK_EDGE, 1.5)
	# Brick courses.
	for i in 3:
		_line(c, x0, wy0 + wall_h * (0.25 + 0.25 * float(i)), x0 + bw, wy0 + wall_h * (0.25 + 0.25 * float(i)), Color(0, 0, 0, 0.22), 0.8)
	# Low hip roof (a flat-topped trapezoid in slate).
	_poly(c, [
		Vector2(x0 - bw * 0.08, wy0),
		Vector2(x0 + bw * 0.20, wy0 - roof_h),
		Vector2(x0 + bw * 0.80, wy0 - roof_h),
		Vector2(x0 + bw + bw * 0.08, wy0),
	], ROOF_SLATE, ROOF_SLATE_EDGE, 1.5)
	# Glowing furnace mouth (hero).
	_ellipse(c, cx - bw * 0.04, by - wall_h * 0.32, bw * 0.20, wall_h * 0.30, GLOW_FIRE)
	_ellipse(c, cx - bw * 0.04, by - wall_h * 0.28, bw * 0.12, wall_h * 0.18, GLOW_FIRE_HOT)
	# Tall chimney + smoke.
	var chx: float = cx + bw * 0.32
	var chy: float = wy0 - roof_h - ctx.lh * 0.06
	_rect(c, chx - bw * 0.05, chy, bw * 0.10, roof_h + ctx.lh * 0.16, WALL_BRICK, WALL_BRICK_EDGE, 1.0)
	_smoke(c, chx, chy, ctx.phase, 1.0)

static func _draw_mill(ctx: Dictionary) -> void:
	# Mill (windmill): a tapered round stone tower with a conical cap + four turning
	# lattice sails on a front axle — the unmistakable hero.
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw * 0.62
	var ht: float = ctx.lh * 0.58
	# Tapered tower (wide base → narrow top).
	_poly(c, [
		Vector2(cx - bw * 0.5, by),
		Vector2(cx + bw * 0.5, by),
		Vector2(cx + bw * 0.32, by - ht),
		Vector2(cx - bw * 0.32, by - ht),
	], WALL_STONE, WALL_STONE_EDGE, 1.5)
	# Stone course arcs.
	for i in 3:
		_line(c, cx - bw * (0.46 - 0.06 * i), by - ht * (0.28 + 0.22 * i), cx + bw * (0.46 - 0.06 * i), by - ht * (0.28 + 0.22 * i), Color(0, 0, 0, 0.16), 0.8)
	# Arched door + a lit window.
	_door(c, cx, by, bw * 0.24, ht * 0.26)
	_window(c, cx, by - ht * 0.52, bw * 0.16, ht * 0.16)
	# Conical cap.
	_tri(c, cx - bw * 0.36, by - ht, cx, by - ht - ctx.lh * 0.18, cx + bw * 0.36, by - ht, ROOF_SLATE, ROOF_SLATE_EDGE, 1.5)
	# Sails: 4 arms on the front axle, rotating with phase.
	var ax: float = cx
	var ay: float = by - ht * 0.78
	var arm: float = bw * 0.95
	var rot: float = ctx.phase * 0.9
	for k in 4:
		var a: float = rot + float(k) * (PI * 0.5)
		var tipx: float = ax + cos(a) * arm
		var tipy: float = ay + sin(a) * arm * 0.7   # squash a touch for the top-down lean
		# Sail blade (a thin lattice rectangle along the arm), built in SCREEN space so
		# the rotation reads true regardless of the map fit.
		var pscale: float = float(c._s(bw * 0.10))
		var perp: Vector2 = Vector2(-sin(a), cos(a)) * pscale
		var p_ax: Vector2 = c._pxy(ax, ay)
		var p_tip: Vector2 = c._pxy(tipx, tipy)
		var quad := PackedVector2Array([
			p_ax + perp, p_tip + perp, p_tip - perp, p_ax - perp,
		])
		c.draw_colored_polygon(quad, SAIL)
		var ring := quad.duplicate()
		ring.append(quad[0])
		c.draw_polyline(ring, SAIL_EDGE, maxf(1.0, float(c._s(0.8))), true)
	_circle(c, ax, ay, bw * 0.07, Color("3a2715"))

static func _draw_rotunda(ctx: Dictionary) -> void:
	# Granary: a fat round stone tower capped by a conical terracotta roof + finial.
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw * 0.74
	var ht: float = ctx.lh * 0.42
	# Round body (ellipse stack: a tall rounded cylinder approximated by a rect with
	# rounded ellipse top + bottom).
	_ellipse(c, cx, by, bw * 0.5, ht * 0.16, WALL_STONE_EDGE)
	_rect(c, cx - bw * 0.5, by - ht, bw, ht, WALL_STONE)
	_ellipse(c, cx, by - ht, bw * 0.5, ht * 0.16, WALL_STONE)
	# Roundness shading: a darker left edge.
	_rect(c, cx - bw * 0.5, by - ht, bw * 0.16, ht, Color(0, 0, 0, 0.14))
	# Stone bands.
	for i in 3:
		_line(c, cx - bw * 0.46, by - ht * (0.3 + 0.22 * i), cx + bw * 0.46, by - ht * (0.3 + 0.22 * i), Color(0, 0, 0, 0.16), 0.8)
	_door(c, cx, by, bw * 0.22, ht * 0.34)
	# Conical terracotta cap + finial.
	_tri(c, cx - bw * 0.56, by - ht, cx, by - ht - ctx.lh * 0.20, cx + bw * 0.56, by - ht, ROOF_RED, ROOF_RED_EDGE, 1.5)
	_circle(c, cx, by - ht - ctx.lh * 0.20, bw * 0.04, GOLD)

static func _draw_silo(ctx: Dictionary) -> void:
	# Silo: a tall narrow corrugated-metal cylinder capped by a hemispherical dome.
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw * 0.46
	var ht: float = ctx.lh * 0.70
	_ellipse(c, cx, by, bw * 0.5, ht * 0.10, WALL_METAL_EDGE)
	_rect(c, cx - bw * 0.5, by - ht, bw, ht, WALL_METAL)
	# Corrugation lines (vertical).
	for i in 4:
		var lx: float = cx - bw * 0.4 + bw * 0.8 * (float(i) / 3.0)
		_line(c, lx, by, lx, by - ht, Color(0, 0, 0, 0.14), 0.8)
	# Roundness shade.
	_rect(c, cx - bw * 0.5, by - ht, bw * 0.16, ht, Color(0, 0, 0, 0.16))
	# A painted band (drawn on the body, below the dome).
	_rect(c, cx - bw * 0.5, by - ht * 0.6, bw, ht * 0.12, Color("c0392b"))
	# Hemispherical dome cap (a half-ellipse: draw a full squashed ellipse seated on
	# the cylinder top — the lower half overlaps the metal so it reads as a dome).
	_ellipse(c, cx, by - ht, bw * 0.5, bw * 0.42, ROOF_SLATE)
	_ellipse(c, cx - bw * 0.10, by - ht - bw * 0.06, bw * 0.22, bw * 0.16, Color("6a655a"))
	# A small vent on the dome top.
	_rect(c, cx - bw * 0.06, by - ht - bw * 0.40, bw * 0.12, bw * 0.10, WALL_METAL_EDGE)

static func _draw_barn(ctx: Dictionary) -> void:
	# Barn: a wide board-and-batten barn with a big GAMBREL (two-pitch) roof + an
	# X-brace double door. Visibly the widest, biggest farm structure.
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw * 1.06       # barns are wide
	var wall_h: float = ctx.lh * 0.34
	var x0: float = cx - bw * 0.5
	var wy0: float = by - wall_h
	_rect(c, x0, wy0, bw, wall_h, Color("a8452e"), Color("7a2f1c"), 1.5)  # red barn
	# Board-and-batten battens.
	for i in 6:
		var lx: float = x0 + bw * (float(i) + 0.5) / 6.0
		_line(c, lx, wy0, lx, by, Color(0, 0, 0, 0.2), 0.8)
	# Gambrel roof: steep lower pitch + shallow upper pitch.
	var lower_h: float = ctx.lh * 0.14
	var upper_h: float = ctx.lh * 0.12
	var knee: float = bw * 0.30
	_poly(c, [
		Vector2(x0 - bw * 0.05, wy0),
		Vector2(cx - knee, wy0 - lower_h),
		Vector2(cx, wy0 - lower_h - upper_h),
		Vector2(cx + knee, wy0 - lower_h),
		Vector2(x0 + bw + bw * 0.05, wy0),
	], ROOF_BROWN, ROOF_BROWN_EDGE, 1.5)
	# Big double doors with an X-brace.
	var dw: float = bw * 0.30
	var dh: float = wall_h * 0.78
	_rect(c, cx - dw * 0.5, by - dh, dw, dh, Color("c8a972"), WALL_TIMBER_EDGE, 1.0)
	_line(c, cx - dw * 0.5, by - dh, cx + dw * 0.5, by, WALL_TIMBER_EDGE, 1.0)
	_line(c, cx + dw * 0.5, by - dh, cx - dw * 0.5, by, WALL_TIMBER_EDGE, 1.0)
	_line(c, cx, by - dh, cx, by, WALL_TIMBER_EDGE, 1.0)
	# Loft window in the gable.
	_window(c, cx, wy0 - lower_h * 0.6, bw * 0.10, lower_h * 0.7, false)

static func _draw_sawmill(ctx: Dictionary) -> void:
	# Sawmill: an open timber shed with a big spinning circular SAW BLADE on a bench
	# (hero) and a stack of cut lumber.
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw
	var wall_h: float = ctx.lh * 0.30
	var x0: float = cx - bw * 0.5
	# Back wall + mono-pitch roof.
	_rect(c, x0, by - wall_h, bw * 0.62, wall_h, WALL_TIMBER, WALL_TIMBER_EDGE, 1.5)
	_poly(c, [
		Vector2(x0 - bw * 0.06, by - wall_h),
		Vector2(x0 + bw + bw * 0.06, by - wall_h * 0.5),
		Vector2(x0 + bw + bw * 0.06, by - wall_h * 0.5 + ctx.lh * 0.05),
		Vector2(x0 - bw * 0.06, by - wall_h + ctx.lh * 0.05),
	], ROOF_BROWN, ROOF_BROWN_EDGE, 1.5)
	# Saw bench + a spinning blade (rotating spokes).
	var sx: float = cx + bw * 0.06
	var sy: float = by - wall_h * 0.30
	var sr: float = bw * 0.16
	_circle(c, sx, sy, sr, BLADE)
	_circle(c, sx, sy, sr * 0.18, Color("3a3530"))
	var rot: float = ctx.phase * 3.0
	for k in 6:
		var a: float = rot + float(k) * (PI / 3.0)
		_line(c, sx, sy, sx + cos(a) * sr * 0.9, sy + sin(a) * sr * 0.9, Color(0, 0, 0, 0.4), 0.6)
	# Stacked lumber out front.
	for i in 3:
		_rect(c, cx - bw * 0.42, by - ctx.lh * 0.035 * float(i + 1), bw * 0.22, ctx.lh * 0.03, Color("c8a972"), WALL_TIMBER_EDGE, 0.6)

static func _draw_stable(ctx: Dictionary) -> void:
	# Stable: a long low pen under a shallow roof, with a horse head poking over a
	# half-door + a horseshoe sign.
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw * 1.02
	var wall_h: float = ctx.lh * 0.28
	var roof_h: float = ctx.lh * 0.14
	var x0: float = cx - bw * 0.5
	var wy0: float = by - wall_h
	_rect(c, x0, wy0, bw, wall_h, WALL_TIMBER, WALL_TIMBER_EDGE, 1.5)
	# Shallow shed roof.
	_poly(c, [
		Vector2(x0 - bw * 0.05, wy0), Vector2(cx, wy0 - roof_h), Vector2(x0 + bw + bw * 0.05, wy0),
	], ROOF_BROWN, ROOF_BROWN_EDGE, 1.5)
	# Two Dutch half-doors (dark lower).
	for dx in [-bw * 0.24, bw * 0.24]:
		_rect(c, cx + dx - bw * 0.10, by - wall_h * 0.5, bw * 0.20, wall_h * 0.5, DOOR)
	# Horse head over the left half-door.
	var hx: float = cx - bw * 0.24
	var hy: float = by - wall_h * 0.5
	_ellipse(c, hx, hy - wall_h * 0.05, bw * 0.05, wall_h * 0.30, ANIMAL)
	_ellipse(c, hx + bw * 0.03, hy - wall_h * 0.28, bw * 0.04, wall_h * 0.10, ANIMAL)  # muzzle
	# Horseshoe sign on the right.
	_circle(c, cx + bw * 0.40, wy0 + wall_h * 0.3, bw * 0.05, GOLD)
	_circle(c, cx + bw * 0.40, wy0 + wall_h * 0.3, bw * 0.025, WALL_TIMBER)

static func _draw_skep(ctx: Dictionary) -> void:
	# Apiary: the building IS a giant coiled-straw skep beehive — stacked tapering
	# ellipse coils to a knotted finial, with an arched flight-hole.
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw * 0.62
	var ht: float = ctx.lh * 0.50
	var coils: int = 5
	for i in coils:
		var t: float = float(i) / float(coils)
		var ry: float = (bw * 0.5) * (1.0 - t * 0.7)
		var yy: float = by - ht * t - ht * 0.5 / coils
		_ellipse(c, cx, yy, ry, maxf(2.0, ht * 0.5 / coils * 1.3), STRAW if i % 2 == 0 else STRAW_EDGE)
	# Knotted finial.
	_circle(c, cx, by - ht, bw * 0.06, STRAW_EDGE)
	# Arched flight-hole + landing board.
	_ellipse(c, cx, by - ht * 0.10, bw * 0.10, ht * 0.10, DOOR)
	_rect(c, cx - bw * 0.16, by - ht * 0.02, bw * 0.32, ht * 0.04, WALL_TIMBER)

static func _draw_chapel(ctx: Dictionary) -> void:
	# Chapel: a stone nave under a steep slate gable + a dominant front BELL TOWER
	# carrying a steep spire and a cross finial.
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw
	var nave_w: float = bw * 0.56
	var wall_h: float = ctx.lh * 0.34
	# Nave (behind/right), steep slate gable.
	_wall_and_gable(c, cx + bw * 0.20, by, nave_w, wall_h, ctx.lh * 0.20, WALL_STONE, WALL_STONE_EDGE, ROOF_SLATE, ROOF_SLATE_EDGE)
	# Bell tower (front/left): taller, narrower.
	var tw: float = bw * 0.30
	var tx: float = cx - bw * 0.26
	var tower_h: float = ctx.lh * 0.52
	_rect(c, tx - tw * 0.5, by - tower_h, tw, tower_h, WALL_STONE, WALL_STONE_EDGE, 1.5)
	# Arched bell opening.
	_ellipse(c, tx, by - tower_h * 0.62, tw * 0.26, tower_h * 0.16, DOOR)
	_circle(c, tx, by - tower_h * 0.60, tw * 0.12, BELL)   # the bell
	# Arched door.
	_door(c, tx, by, tw * 0.34, tower_h * 0.26)
	# Steep spire + cross.
	_tri(c, tx - tw * 0.5, by - tower_h, tx, by - tower_h - ctx.lh * 0.26, tx + tw * 0.5, by - tower_h, ROOF_SLATE, ROOF_SLATE_EDGE, 1.5)
	var sy: float = by - tower_h - ctx.lh * 0.26
	_line(c, tx, sy, tx, sy - ctx.lh * 0.06, GOLD, 1.4)
	_line(c, tx - bw * 0.03, sy - ctx.lh * 0.04, tx + bw * 0.03, sy - ctx.lh * 0.04, GOLD, 1.4)

static func _draw_observatory(ctx: Dictionary) -> void:
	# Observatory: a coursed stone DRUM (cylinder) carrying a metal hemispherical
	# DOME with a dark observation slit.
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw * 0.72
	var drum_h: float = ctx.lh * 0.34
	_ellipse(c, cx, by, bw * 0.5, drum_h * 0.18, WALL_STONE_EDGE)
	_rect(c, cx - bw * 0.5, by - drum_h, bw, drum_h, WALL_STONE)
	_rect(c, cx - bw * 0.5, by - drum_h, bw * 0.16, drum_h, Color(0, 0, 0, 0.14))
	# Bands.
	for i in 2:
		_line(c, cx - bw * 0.46, by - drum_h * (0.4 + 0.3 * i), cx + bw * 0.46, by - drum_h * (0.4 + 0.3 * i), Color(0, 0, 0, 0.16), 0.8)
	_door(c, cx, by, bw * 0.18, drum_h * 0.4)
	# Metal dome.
	_ellipse(c, cx, by - drum_h, bw * 0.5, bw * 0.4, Color("9aa3aa"))
	_ellipse(c, cx - bw * 0.10, by - drum_h - bw * 0.06, bw * 0.22, bw * 0.16, Color("b4bcc2"))
	# Observation slit (dark, tilted).
	_poly(c, [
		Vector2(cx - bw * 0.04, by - drum_h - bw * 0.02),
		Vector2(cx + bw * 0.04, by - drum_h - bw * 0.02),
		Vector2(cx + bw * 0.12, by - drum_h - bw * 0.34),
		Vector2(cx + bw * 0.04, by - drum_h - bw * 0.34),
	], Color("12100c"))

static func _draw_bunker(ctx: Dictionary) -> void:
	# Powder Store: a squat, heavily-reinforced block-stone magazine with a low
	# barrel-vault roof, an iron blast door + hazard chevrons, and barrels out front.
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw
	var wall_h: float = ctx.lh * 0.26
	var x0: float = cx - bw * 0.5
	var wy0: float = by - wall_h
	_rect(c, x0, wy0, bw, wall_h, Color("8a8478"), Color("5a564c"), 1.5)
	# Block joints.
	for i in 3:
		_line(c, x0, wy0 + wall_h * (0.33 * float(i + 1)), x0 + bw, wy0 + wall_h * (0.33 * float(i + 1)), Color(0, 0, 0, 0.2), 0.8)
	# Low barrel-vault roof (a flattened lead ellipse).
	_ellipse(c, cx, wy0, bw * 0.54, ctx.lh * 0.14, Color("6a6a72"))
	# Iron blast door + hazard chevron strip.
	_rect(c, cx - bw * 0.14, by - wall_h * 0.7, bw * 0.28, wall_h * 0.7, Color("3a3a40"))
	_rect(c, cx - bw * 0.16, wy0 + wall_h * 0.06, bw * 0.32, wall_h * 0.12, GOLD)
	# X-marked barrel.
	_rect(c, cx + bw * 0.34, by - ctx.lh * 0.10, bw * 0.12, ctx.lh * 0.10, Color("6a4a26"), WALL_TIMBER_EDGE, 0.8)
	_line(c, cx + bw * 0.34, by - ctx.lh * 0.10, cx + bw * 0.46, by, Color("2e231a"), 0.8)

static func _draw_mine(ctx: Dictionary) -> void:
	# Mining Camp: a stone hut with a timber HEAD-FRAME (pithead A-frame) over a
	# shaft + an ore cart — the mine read.
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw
	var wall_h: float = ctx.lh * 0.28
	# Stone hut on the left.
	_wall_and_gable(c, cx - bw * 0.22, by, bw * 0.5, wall_h, ctx.lh * 0.16, WALL_STONE, WALL_STONE_EDGE, ROOF_SLATE, ROOF_SLATE_EDGE)
	# Head-frame A-frame over the shaft (right).
	var fx: float = cx + bw * 0.28
	var fh: float = ctx.lh * 0.46
	_line(c, fx - bw * 0.12, by, fx, by - fh, WALL_TIMBER_EDGE, 1.6)
	_line(c, fx + bw * 0.12, by, fx, by - fh, WALL_TIMBER_EDGE, 1.6)
	_line(c, fx - bw * 0.08, by - fh * 0.5, fx + bw * 0.08, by - fh * 0.5, WALL_TIMBER_EDGE, 1.2)
	# Pulley wheel at the top.
	_circle(c, fx, by - fh, bw * 0.05, Color("3a3530"))
	# Ore cart at the base.
	_rect(c, fx - bw * 0.10, by - ctx.lh * 0.07, bw * 0.20, ctx.lh * 0.06, Color("4a4540"), Color("2a2620"), 0.8)
	_circle(c, fx - bw * 0.06, by - ctx.lh * 0.005, bw * 0.025, Color("2a2620"))
	_circle(c, fx + bw * 0.06, by - ctx.lh * 0.005, bw * 0.025, Color("2a2620"))

static func _draw_hut(ctx: Dictionary) -> void:
	# Ratcatcher hut: a small plain hut + a pole SIGN (a humble service shed). Reads
	# distinct from a home cottage by being tiny + signed.
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw * 0.66
	var wall_h: float = ctx.lh * 0.30
	var wy0 := _wall_and_gable(c, cx - bw * 0.10, by, bw, wall_h, ctx.lh * 0.18, WALL_TIMBER, WALL_TIMBER_EDGE, ROOF_BROWN, ROOF_BROWN_EDGE)
	_door(c, cx - bw * 0.10, by, bw * 0.28, wall_h * 0.55)
	# Pole sign on the right.
	_line(c, cx + bw * 0.42, by, cx + bw * 0.42, wy0 + wall_h * 0.1, WALL_TIMBER_EDGE, 1.4)
	_rect(c, cx + bw * 0.30, wy0 + wall_h * 0.1, bw * 0.28, wall_h * 0.34, Color("c8a972"), WALL_TIMBER_EDGE, 0.8)

static func _draw_portal(ctx: Dictionary) -> void:
	# Magic Portal: a glowing purple stone ARCH with a shimmering void inside.
	var c = ctx.canvas
	var cx: float = ctx.cx
	var by: float = ctx.base_y
	var bw: float = ctx.fw * 0.7
	var ht: float = ctx.lh * 0.54
	# Outer glow halo (pulses with phase).
	var pulse: float = 0.7 + 0.3 * sin(ctx.phase * 2.0)
	var halo := PORTAL_GLOW
	halo.a = 0.25 * pulse
	_ellipse(c, cx, by - ht * 0.5, bw * 0.6, ht * 0.6, halo)
	# Stone arch (two legs + a top — drawn as a thick ring approximated by an outer
	# rounded shape minus an inner void).
	_rect(c, cx - bw * 0.5, by - ht, bw * 0.18, ht, PORTAL_STONE, PORTAL_STONE_EDGE, 1.5)
	_rect(c, cx + bw * 0.32, by - ht, bw * 0.18, ht, PORTAL_STONE, PORTAL_STONE_EDGE, 1.5)
	_ellipse(c, cx, by - ht, bw * 0.5, ht * 0.30, PORTAL_STONE)
	# Shimmering void.
	_ellipse(c, cx, by - ht * 0.5, bw * 0.30, ht * 0.42, PORTAL_GLOW)
	var hot := PORTAL_GLOW_HOT
	hot.a = pulse
	_ellipse(c, cx, by - ht * 0.5, bw * 0.18, ht * 0.28, hot)
