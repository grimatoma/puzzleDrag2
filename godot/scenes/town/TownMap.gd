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
## The plan lives in the 1280×960 landscape "design space". render_plan() performs
## a CONTENT-AWARE fit (M6c): rather than fitting the full stage_w×stage_h rect, it
## measures the bounding box of the STRUCTURAL town content (lots, boards, plaza,
## trees) and fits THAT bbox — with a small padding margin — into the portrait
## viewport, centred. (Roads + the river deliberately run to the stage edges, so
## they're excluded from the bbox; they simply bleed past the viewport border,
## which reads as intentional — see _content_bbox.) This trims the empty grass
## borders so the map FILLS the viewport instead of floating in a sea of grass.
## All draw coordinates pass through the single _p() / _pxy() / _s() helpers so
## every layer honours the same fit transform.
##
## M6c: wired into Main's navigation (TownMapScreen → ViewRouter.Modal.TOWNMAP).
## render_plan() also accepts an optional `built_ids` array: the first N lots are
## marked "built" and drawn as honest placeholder houses (a wall + roof + the
## building id label) — see _draw_lot_pads. These stand in for real built buildings
## from GameState.buildings; full iso building art is a later milestone.

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

# Built-house label tone (the small caption under each building; the ART now
# disambiguates the building — see BuildingArt.gd — the label is a subtle aid).
const HOUSE_LABEL := Color("3a2c18")

# ── Townsfolk (ambient walking villagers) ──────────────────────────────────────
# A few little iso-character figures wander the lot/street band over time (React
# parity: "little villager figures walking the streets"). Each has a plan-space
# position + a target it strolls toward at WANDER_SPEED; on arrival it picks a new
# nearby target (a short pause first). Drawn in _draw as a body+head 2-tone figure;
# moved in _process (guarded so headless never errors — see _anim_enabled). The
# count scales gently with town size (more plots → a livelier street).
const WANDER_SPEED := 26.0       # plan-space px/sec
const TOWNSFOLK_MIN := 3
const TOWNSFOLK_MAX := 6
# Tunic colours so the villagers read as a small varied crowd (not clones).
const FOLK_TUNICS := [
	Color("c7522a"), Color("4a6a8a"), Color("6f8a3a"), Color("8a5a8a"),
	Color("c9a23a"), Color("5a8a7a"),
]
const FOLK_SKIN := Color("e8b88f")
const FOLK_HAIR := Color("4a3322")
const FOLK_LEG := Color("3a3024")

var _plan: Dictionary = {}
var _scale: float = 1.0
var _ox: float = 0.0
var _oy: float = 0.0
var _view_w: float = 720.0
var _view_h: float = 1280.0

# ── M-parity: interactive zoom + pan ───────────────────────────────────────────
# The base content-aware FIT is computed in render_plan and stored as _fit_*; the
# EFFECTIVE transform (_scale/_ox/_oy used by _p/_pxy/lot_at_screen + _draw) is
# derived from that base times a user zoom, then offset by a user pan — so the +/−
# zoom buttons and drag-to-pan in TownMapScreen move BOTH the drawing and the
# lot-click hit-test in lockstep (no separate math to drift). recenter() resets to
# the pure fit. MIN_ZOOM == 1.0: the fit already shows the whole town, so zooming
# OUT past it would just reveal empty grass — fit IS the most-zoomed-out view.
const MIN_ZOOM := 1.0
const MAX_ZOOM := 3.0
const ZOOM_STEP := 1.35       # per +/− button press (multiplicative)
const PAN_MARGIN := 48.0      # how far the content may pan past the viewport edge
var _fit_scale: float = 1.0   # base fit scale (zoom 1.0)
var _fit_ox: float = 0.0      # base fit x offset
var _fit_oy: float = 0.0      # base fit y offset
var _bb_w: float = 1.0        # content bbox size in PLAN space (for pan clamping)
var _bb_h: float = 1.0
var _user_zoom: float = 1.0   # 1.0 == fit; up to MAX_ZOOM
var _pan: Vector2 = Vector2.ZERO  # screen-space pan offset (clamped)
# M6c: built-building ids assigned to the first N lots (lot[i] is built iff
# i < _built_ids.size()); empty otherwise. Set by render_plan.
var _built_ids: Array = []
# M6d: the build-slot lot currently hovered (a subtle highlight outline is drawn
# on it); -1 = none. Set by set_hover_lot; only affects _draw, never state.
var _hover_lot: int = -1

# Animation clock (seconds) advanced in _process; drives the few animated building
# details (mill sails, chimney smoke, sawmill blade, portal pulse) + the townsfolk
# walk bob. Purely cosmetic; never affects state or hit-testing.
var _phase: float = 0.0
# Ambient walking villagers. Each entry: {pos:Vector2, target:Vector2, tunic:Color,
# pause:float (seconds remaining before next move)} in PLAN space. Spawned from the
# plan's lot/street band in render_plan; moved in _process; drawn in _draw.
var _folk: Array = []
# The plan-space rect the villagers roam within (the lot/board cluster bbox, padded
# inward a touch). Computed in render_plan from the content bbox.
var _folk_bounds: Rect2 = Rect2()

# M6d: highlight tones for the hover outline (warm gold so it reads over both the
# empty fenced pad and a built house without clashing with the parchment UI).
const HOVER_OUTLINE := Color("ffd248")
const HOVER_FILL := Color(1.0, 0.82, 0.28, 0.12)

## Store the plan + the built-building ids, compute a CONTENT-AWARE fit transform,
## then request a redraw.
##
## `built_ids` (M6c): building id Strings assigned IN ORDER to the first lots —
## plan.lots[i] is "built" (drawn as a placeholder house labelled built_ids[i])
## iff i < built_ids.size(). The remaining lots keep the empty fenced-pad look.
##
## Content-aware fit: instead of fitting the full stage_w×stage_h rect (which
## leaves empty grass borders), measure the bounding box of the actual structural
## content and fit THAT (uniform scale, with a small padding margin), centred in
## the viewport — so the map fills the portrait viewport.
func render_plan(plan: Dictionary, view_w: float, view_h: float, built_ids: Array = []) -> void:
	_plan = plan if plan != null else {}
	_built_ids = built_ids if built_ids is Array else []
	_view_w = view_w
	_view_h = view_h

	var stage_w: float = float(_plan.get("stage_w", 1280.0))
	var stage_h: float = float(_plan.get("stage_h", 960.0))
	if stage_w <= 0.0:
		stage_w = 1280.0
	if stage_h <= 0.0:
		stage_h = 960.0

	# Bounding box of the actual drawn content (falls back to the full stage when
	# the plan is empty / degenerate). PAD keeps content off the very viewport edge.
	var bb := _content_bbox(stage_w, stage_h)
	var bw: float = max(1.0, bb.x1 - bb.x0)
	var bh: float = max(1.0, bb.y1 - bb.y0)
	const PAD: float = 24.0  # screen-px breathing room around the fitted content

	# Uniform fit so the wider of the two dims binds (both must fit); centre the
	# scaled bbox in the viewport. This is the BASE (zoom 1.0) transform — stored as
	# _fit_* and combined with the user zoom/pan in _recompute_view().
	_fit_scale = min((view_w - 2.0 * PAD) / bw, (view_h - 2.0 * PAD) / bh)
	if _fit_scale <= 0.0:
		_fit_scale = min(view_w / stage_w, view_h / stage_h)
	_fit_ox = (view_w - bw * _fit_scale) / 2.0 - bb.x0 * _fit_scale
	_fit_oy = (view_h - bh * _fit_scale) / 2.0 - bb.y0 * _fit_scale
	_bb_w = bw
	_bb_h = bh
	# Spawn ambient walking villagers within the (slightly inset) content bbox, scaled
	# to town size. Done here (not _process) so the crowd is set the moment a plan loads
	# and a headless render that never ticks _process still has folk to draw safely.
	_spawn_townsfolk(bb)
	_recompute_view()

# ── Townsfolk spawning ──────────────────────────────────────────────────────────
## Populate `_folk` with TOWNSFOLK_MIN..MAX wandering villagers inside the content
## bbox (inset so they stroll the lot/street band, not the very edge). The count
## scales with the number of build-slot lots (a bigger town → a livelier street).
## Deterministic-ish positions via a local RNG seeded from the lot count so a given
## plan always spawns the same crowd (stable captures/tests).
func _spawn_townsfolk(bb: Dictionary) -> void:
	_folk.clear()
	# Roam bounds: the content bbox inset by ~12% so figures keep off the edge.
	var insx: float = (bb.x1 - bb.x0) * 0.12
	var insy: float = (bb.y1 - bb.y0) * 0.12
	_folk_bounds = Rect2(bb.x0 + insx, bb.y0 + insy, max(1.0, bb.x1 - bb.x0 - 2.0 * insx), max(1.0, bb.y1 - bb.y0 - 2.0 * insy))
	var lots: int = lot_count()
	var n: int = clampi(TOWNSFOLK_MIN + int(lots / 3), TOWNSFOLK_MIN, TOWNSFOLK_MAX)
	var rng := RandomNumberGenerator.new()
	rng.seed = 9173 + lots * 31
	for i in n:
		var p := Vector2(
			rng.randf_range(_folk_bounds.position.x, _folk_bounds.position.x + _folk_bounds.size.x),
			rng.randf_range(_folk_bounds.position.y, _folk_bounds.position.y + _folk_bounds.size.y))
		_folk.append({
			"pos": p,
			"target": _folk_pick_target(rng, p),
			"tunic": FOLK_TUNICS[i % FOLK_TUNICS.size()],
			"pause": rng.randf_range(0.0, 1.5),
		})

## Pick a new wander target a short hop from `from`, clamped to the roam bounds.
func _folk_pick_target(rng: RandomNumberGenerator, from: Vector2) -> Vector2:
	var span: float = min(_folk_bounds.size.x, _folk_bounds.size.y) * 0.5 + 60.0
	var t := from + Vector2(rng.randf_range(-span, span), rng.randf_range(-span, span))
	t.x = clampf(t.x, _folk_bounds.position.x, _folk_bounds.position.x + _folk_bounds.size.x)
	t.y = clampf(t.y, _folk_bounds.position.y, _folk_bounds.position.y + _folk_bounds.size.y)
	return t

# ── animation tick (cosmetic; headless-guarded) ─────────────────────────────────
## True when this node should run its cosmetic animation/draw work — i.e. it is in
## the tree AND a real renderer is present. A COMPLETE no-op under the headless test
## sweep (DisplayServer "headless"), so the logic suites never tick smoke/sails or
## move villagers and never error. Mirrors Board._fx_enabled().
func _anim_enabled() -> bool:
	return is_inside_tree() and DisplayServer.get_name() != "headless"

## Advance the animation clock + stroll the villagers toward their targets, then
## request a redraw. Guarded so headless runs do nothing (no renderer to draw to and
## the test sweep must stay deterministic). One RNG is reused for fresh targets.
func _process(delta: float) -> void:
	if not _anim_enabled():
		return
	_phase += delta
	_step_townsfolk(delta)
	queue_redraw()

## Move each villager toward its target at WANDER_SPEED (plan space). On arrival it
## pauses briefly, then picks a new nearby target. Pure cosmetic motion, bounded to
## _folk_bounds via _folk_pick_target's clamp.
func _step_townsfolk(delta: float) -> void:
	if _folk.is_empty():
		return
	var rng := RandomNumberGenerator.new()
	rng.seed = int(_phase * 1000.0) ^ 0x5bd1e995
	for f in _folk:
		if f.pause > 0.0:
			f.pause -= delta
			continue
		var to: Vector2 = f.target - f.pos
		var dist: float = to.length()
		var step: float = WANDER_SPEED * delta
		if dist <= step or dist < 1.0:
			f.pos = f.target
			f.pause = rng.randf_range(0.4, 1.8)
			f.target = _folk_pick_target(rng, f.pos)
		else:
			f.pos += to / dist * step

# ── zoom / pan / recenter (interactive view transform) ─────────────────────────

## Recompute the EFFECTIVE transform (_scale/_ox/_oy) from the stored fit base, the
## user zoom (about the viewport centre so zooming keeps the middle of town fixed),
## and the clamped pan. Everything that draws or hit-tests reads _scale/_ox/_oy, so
## this single function keeps the picture and the click math in agreement.
func _recompute_view() -> void:
	_user_zoom = clampf(_user_zoom, MIN_ZOOM, MAX_ZOOM)
	_scale = _fit_scale * _user_zoom
	# Zoom about the viewport centre: the point under the centre stays put as zoom
	# changes (cx - (cx - fit_ox)*zoom), then the user pan shifts the whole map.
	var cx: float = _view_w * 0.5
	var cy: float = _view_h * 0.5
	_clamp_pan()
	_ox = cx - (cx - _fit_ox) * _user_zoom + _pan.x
	_oy = cy - (cy - _fit_oy) * _user_zoom + _pan.y
	queue_redraw()

## Clamp the pan so the scaled content can't be dragged completely off-screen: the
## allowed range each axis is half the overflow of the scaled content past the
## viewport, plus a small margin. At zoom 1.0 the content fits, so the range is ~0
## and pan stays centred (recenter territory).
func _clamp_pan() -> void:
	var content_w: float = _bb_w * _scale
	var content_h: float = _bb_h * _scale
	var range_x: float = maxf(0.0, (content_w - _view_w) * 0.5 + PAN_MARGIN)
	var range_y: float = maxf(0.0, (content_h - _view_h) * 0.5 + PAN_MARGIN)
	_pan.x = clampf(_pan.x, -range_x, range_x)
	_pan.y = clampf(_pan.y, -range_y, range_y)

## Zoom in/out one multiplicative step about the viewport centre.
func zoom_in() -> void:
	_user_zoom *= ZOOM_STEP
	_recompute_view()

func zoom_out() -> void:
	_user_zoom /= ZOOM_STEP
	_recompute_view()

## Zoom by a multiplicative `factor` about a SCREEN-space anchor (typically the mouse
## cursor) — the desktop mouse-wheel path. Unlike zoom_in/zoom_out (which zoom about the
## viewport centre for the +/− buttons), this keeps the plan point currently under
## `anchor` fixed on screen: record that point, apply the clamped zoom, then nudge the pan
## so the same point lands back under the cursor. The pan is still clamped by
## _recompute_view, so near the fit (where there's no room to pan) the anchor may drift
## toward centre — by design, since panning into empty grass is disallowed.
func zoom_at(factor: float, anchor: Vector2) -> void:
	if _scale <= 0.0:
		return
	var new_zoom: float = clampf(_user_zoom * factor, MIN_ZOOM, MAX_ZOOM)
	if is_equal_approx(new_zoom, _user_zoom):
		return
	# Plan-space point under the cursor BEFORE the zoom (using the live transform).
	var plan_x: float = (anchor.x - _ox) / _scale
	var plan_y: float = (anchor.y - _oy) / _scale
	_user_zoom = new_zoom
	# Where that plan point WOULD land with the new zoom but the OLD pan (the centre-based
	# offset _recompute_view will use, before our nudge) — then add a pan so it returns to
	# `anchor`. After this _pan, _recompute_view yields _ox = anchor.x - plan_x*new_scale, so
	# screen(plan_x) == anchor.x (and likewise y), modulo the pan clamp.
	var new_scale: float = _fit_scale * _user_zoom
	var cx: float = _view_w * 0.5
	var cy: float = _view_h * 0.5
	var base_ox: float = cx - (cx - _fit_ox) * _user_zoom + _pan.x
	var base_oy: float = cy - (cy - _fit_oy) * _user_zoom + _pan.y
	_pan.x += anchor.x - (plan_x * new_scale + base_ox)
	_pan.y += anchor.y - (plan_y * new_scale + base_oy)
	_recompute_view()

## Reset to the pure content-aware fit (zoom 1.0, no pan).
func recenter() -> void:
	_user_zoom = 1.0
	_pan = Vector2.ZERO
	_recompute_view()

## Shift the map by a screen-space delta (drag-to-pan). No-op at fit (range ~0).
func pan_by(delta: Vector2) -> void:
	_pan += delta
	_recompute_view()

## True when the view is zoomed in past the fit (controls reflect this if needed).
func is_zoomed() -> bool:
	return _user_zoom > MIN_ZOOM + 0.001

# Compute the bounding box (in plan space) of the STRUCTURAL town content that
# should drive the fit: lots, boards, plaza, and trees. Roads and water are drawn
# too, but they're laid out to bleed all the way to the stage edges (the perimeter
# avenues run 0→stage_w / 0→stage_h, the river runs off-canvas), so INCLUDING them
# would always reproduce the full stage rect and defeat the whole point — there'd
# be nothing to trim. By fitting the building cluster instead, the empty grass
# margin around the town is removed and the map fills the viewport; the edge roads
# and river simply continue past the viewport border, which reads as intentional.
# Returns a Rect-like dict; on an empty plan it falls back to the full stage so the
# transform stays valid.
func _content_bbox(stage_w: float, stage_h: float) -> Dictionary:
	var acc := {"x0": INF, "y0": INF, "x1": -INF, "y1": -INF}
	var add_pt := func(x: float, y: float) -> void:
		acc.x0 = min(acc.x0, x)
		acc.y0 = min(acc.y0, y)
		acc.x1 = max(acc.x1, x)
		acc.y1 = max(acc.y1, y)
	var add_rect := func(cx: float, cy: float, w: float, h: float) -> void:
		add_pt.call(cx - w / 2.0, cy - h / 2.0)
		add_pt.call(cx + w / 2.0, cy + h / 2.0)

	# Lots + boards (centred rects).
	for l in _plan.get("lots", []):
		add_rect.call(float(l["cx"]), float(l["cy"]), float(l["w"]), float(l["h"]))
	for b in _plan.get("boards", []):
		add_rect.call(float(b["cx"]), float(b["cy"]), float(b["w"]), float(b["h"]))

	# Plaza (ellipse bounds) + trees (canopy circles).
	if _plan.has("plaza"):
		var pz: Dictionary = _plan["plaza"]
		add_rect.call(float(pz["cx"]), float(pz["cy"]), float(pz["rx"]) * 2.0, float(pz["ry"]) * 2.0)
	for t in _plan.get("trees", []):
		var tr: float = float(t["r"])
		add_pt.call(float(t["x"]) - tr, float(t["y"]) - tr)
		add_pt.call(float(t["x"]) + tr, float(t["y"]) + tr)

	# Degenerate / empty plan → fall back to the full stage so we always return a
	# valid, positive box.
	if not is_finite(acc.x0) or acc.x1 <= acc.x0 or acc.y1 <= acc.y0:
		return {"x0": 0.0, "y0": 0.0, "x1": stage_w, "y1": stage_h}
	# Clamp to the stage so any overshoot at the edges can't push the fit off into
	# empty design space.
	acc.x0 = max(0.0, acc.x0)
	acc.y0 = max(0.0, acc.y0)
	acc.x1 = min(stage_w, acc.x1)
	acc.y1 = min(stage_h, acc.y1)
	return acc

# ── M6d: hit-testing (screen → lot) ───────────────────────────────────────────
# The town map is now INTERACTIVE: TownMapScreen turns a click into a lot via
# lot_at_screen(). The index returned here is the SAME "build-slot" ordinal that
# _draw_lot_pads uses to decide built-vs-empty — it walks _plan["lots"] in array
# order, skips the defensive `row == "plaza"` entries, and counts the rest. So the
# screen can compare the returned index against built_count() to know whether the
# clicked plot holds a building (index < built_count) or is empty (index >=).
#
# Inverse-map a SCREEN-space point back to plan space, then return the build-slot
# index of the lot whose rect (cx±w/2, cy±h/2) contains it, or -1 when the click
# misses every lot (or the plan is empty). Mirrors _p()/_pxy(): screen = plan*s+o,
# so plan = (screen - o) / s.
func lot_at_screen(pos: Vector2) -> int:
	if _plan.is_empty() or _scale <= 0.0:
		return -1
	var px: float = (pos.x - _ox) / _scale
	var py: float = (pos.y - _oy) / _scale
	var slot: int = -1
	for l in _plan.get("lots", []):
		if String(l.get("row", "")) == "plaza":
			continue
		slot += 1
		var lcx: float = float(l["cx"])
		var lcy: float = float(l["cy"])
		var hw: float = float(l["w"]) / 2.0
		var hh: float = float(l["h"]) / 2.0
		if px >= lcx - hw and px <= lcx + hw and py >= lcy - hh and py <= lcy + hh:
			return slot
	return -1

# Inverse-map a SCREEN-space point back to plan space, then return the `kind` String
# ("farm"/"mine"/"fish") of the BOARD pad whose rect (cx±w/2, cy±h/2) contains it, or
# "" when the point misses every board (or the plan is empty / the transform is
# degenerate). Mirrors lot_at_screen() — screen = plan*s+o, so plan = (screen - o)/s —
# so it agrees with the same fit/zoom/pan transform the map drew with. Used by
# TownMapScreen to make the farm board pad a tappable "Start Farming" affordance.
func board_at_screen(pos: Vector2) -> String:
	if _plan.is_empty() or _scale <= 0.0:
		return ""
	var px: float = (pos.x - _ox) / _scale
	var py: float = (pos.y - _oy) / _scale
	for b in _plan.get("boards", []):
		var bcx: float = float(b["cx"])
		var bcy: float = float(b["cy"])
		var hw: float = float(b["w"]) / 2.0
		var hh: float = float(b["h"]) / 2.0
		if px >= bcx - hw and px <= bcx + hw and py >= bcy - hh and py <= bcy + hh:
			return String(b.get("kind", ""))
	return ""

# Screen-space centre of the board pad whose `kind` is `kind` ("farm"/"mine"/"fish"), or
# Vector2.INF when no such board exists in the current plan. Exposed so a headless test can
# compute a known board's centre and feed it back through board_at_screen without synthesising
# real input events (mirrors lot_screen_center for lots).
func board_screen_center(kind: String) -> Vector2:
	for b in _plan.get("boards", []):
		if String(b.get("kind", "")) == kind:
			return _pxy(float(b["cx"]), float(b["cy"]))
	return Vector2(INF, INF)

# Screen-space centre of the build-slot lot at `slot` (the same ordinal used by
# lot_at_screen / _draw_lot_pads). Returns Vector2.INF when the slot is out of
# range. Exposed so a headless test can compute a known lot's centre and feed it
# back through lot_at_screen without synthesising real input events.
func lot_screen_center(slot: int) -> Vector2:
	var i: int = -1
	for l in _plan.get("lots", []):
		if String(l.get("row", "")) == "plaza":
			continue
		i += 1
		if i == slot:
			return _pxy(float(l["cx"]), float(l["cy"]))
	return Vector2(INF, INF)

# Number of build-slot lots in the current plan (non-plaza lots) — the total
# clickable plots, regardless of how many are built.
func lot_count() -> int:
	var n: int = 0
	for l in _plan.get("lots", []):
		if String(l.get("row", "")) != "plaza":
			n += 1
	return n

# How many build-slot lots are currently BUILT (lots[0..built_count-1]); equals
# the number of building ids the last render_plan was given. The screen uses this
# to tell a clicked built lot from an empty one.
func built_count() -> int:
	return _built_ids.size()

# Set the hovered build-slot lot (or -1 to clear) and redraw if it changed, so a
# subtle highlight outline tracks the cursor. Purely cosmetic — never mutates the
# plan or built state.
func set_hover_lot(i: int) -> void:
	if i == _hover_lot:
		return
	_hover_lot = i
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
	# Ambient walking villagers stroll over the streets/lots (under the hover outline).
	_draw_townsfolk()
	# M6d: the hover highlight sits on TOP of everything so it's always visible.
	_draw_hover_lot()

# ── M6d: hover highlight ──────────────────────────────────────────────────────
# A subtle gold tint + outline over the hovered build-slot lot's full rect, so the
# player sees which plot a click will hit. Resolved from the same non-plaza ordinal
# as lot_at_screen; a no-op when nothing is hovered or the slot is out of range.
func _draw_hover_lot() -> void:
	if _hover_lot < 0:
		return
	var i: int = -1
	for l in _plan.get("lots", []):
		if String(l.get("row", "")) == "plaza":
			continue
		i += 1
		if i != _hover_lot:
			continue
		var x0: float = float(l["cx"]) - float(l["w"]) / 2.0
		var y0: float = float(l["cy"]) - float(l["h"]) / 2.0
		_draw_screen_rect(x0, y0, float(l["w"]), float(l["h"]), HOVER_FILL)
		_draw_screen_rect_outline(x0, y0, float(l["w"]), float(l["h"]), HOVER_OUTLINE, _s(2.5))
		return

# ── Townsfolk (ambient walking villagers) ──────────────────────────────────────
# Draw each villager in `_folk` as a small 2-tone iso figure (ground shadow + legs
# + tunic body + head with hair) at its plan-space `pos`, mapped through _pxy/_s so
# the figure scales with the map fit/zoom. A gentle vertical bob (driven by _phase +
# a per-figure offset) sells the walk. No-op when no folk were spawned. Sorted back
# → front by plan-y so nearer figures overlap farther ones.
func _draw_townsfolk() -> void:
	if _folk.is_empty():
		return
	var order := _folk.duplicate()
	order.sort_custom(func(a, b): return a.pos.y < b.pos.y)
	for f in order:
		_draw_one_folk(f.pos, f.tunic)

# A single villager figure (units are plan-space px, scaled by _s; the figure's feet
# sit at `pos`). Body parts mirror IsoCharacter.tsx (legs / tunic / arms / head /
# hair). Tiny, so it reads as a person on the street without stealing focus.
func _draw_one_folk(pos: Vector2, tunic: Color) -> void:
	var x: float = pos.x
	var y: float = pos.y
	# Per-figure phase offset from its position so the crowd doesn't bob in lockstep.
	var bob: float = sin(_phase * 6.0 + x * 0.21 + y * 0.17) * 0.7
	# Ground shadow (stays on the ground; doesn't bob).
	_draw_filled_ellipse(_pxy(x, y), _s(4.0), _s(1.6), Color(0, 0, 0, 0.28))
	var fy: float = y + bob       # body baseline lifts with the bob
	# Legs.
	_draw_screen_rect(x - 2.4, fy - 6.0, 1.8, 4.0, FOLK_LEG)
	_draw_screen_rect(x + 0.6, fy - 6.0, 1.8, 4.0, FOLK_LEG)
	# Tunic body (a little tapered block).
	_draw_screen_rect(x - 3.0, fy - 12.0, 6.0, 7.0, tunic)
	# Arms (slightly darker tunic shade).
	var arm := tunic.darkened(0.18)
	_draw_screen_rect(x - 4.0, fy - 12.0, 1.4, 5.5, arm)
	_draw_screen_rect(x + 2.6, fy - 12.0, 1.4, 5.5, arm)
	# Head + hair cap.
	_draw_filled_ellipse(_pxy(x, fy - 14.5), _s(2.6), _s(2.6), FOLK_SKIN)
	_draw_filled_ellipse(_pxy(x, fy - 15.8), _s(2.7), _s(1.5), FOLK_HAIR)

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
# M6c: the first N lots (N = _built_ids.size()) are BUILT and drawn as honest
# placeholder houses (wall rect + roof triangle + the building id label); the
# rest keep the M6b empty fenced-pad look. The placeholder houses stand in for
# real GameState.buildings — full iso building art is a later milestone.
func _draw_lot_pads() -> void:
	if not _plan.has("lots"):
		return
	var i: int = -1
	for l in _plan["lots"]:
		if String(l.get("row", "")) == "plaza":
			continue
		i += 1
		if i < _built_ids.size():
			_draw_built_house(l, String(_built_ids[i]))
		else:
			_draw_empty_lot(l)

# A built lot: a DISTINCT per-building silhouette (BuildingArt resolves the building
# id to its shape family — mill/barn/forge/chapel/silo/portal/… each draws its own
# massing, roof, accents + palette, so a built plot reads at a glance instead of the
# old identical tan box). The art draws through THIS node's _pxy/_s helpers so it
# honours the same fit/zoom/pan; a small building-id caption stays below as a subtle
# aid. An unknown id still resolves to the generic "house" drawer (fallback intact).
func _draw_built_house(l: Dictionary, id: String) -> void:
	var lcx: float = float(l["cx"])
	var lcy: float = float(l["cy"])
	var lw: float = float(l["w"])
	var lh: float = float(l["h"])
	BuildingArt.draw_building(self, id, lcx, lcy, lw, lh, _phase)
	# A small caption below the building (the ART disambiguates; this is a quiet aid).
	_draw_house_label(BuildingConfig.building_name(id), lcx, lcy + lh / 2.0 + 2.0)

# Draw a small building caption, centred horizontally on `cx` with its baseline near
# `y`, using the default font. Sized down with the fit so captions don't overlap on a
# dense map; skipped if no default font is available. The building ART (BuildingArt)
# now disambiguates the structure — this is a quiet supporting label.
func _draw_house_label(text: String, cx: float, y: float) -> void:
	var font := ThemeDB.fallback_font
	if font == null:
		return
	var fs: int = int(max(7.0, _s(11.0)))
	var width: float = font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
	var pos := _pxy(cx, y)
	pos.x -= width / 2.0
	draw_string(font, pos, text, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, HOUSE_LABEL)

# An empty lot: the M6b look — a small bottom-anchored foundation footprint (pad
# fill + a darker post-and-rail fence + a "build here" stake at the front).
func _draw_empty_lot(l: Dictionary) -> void:
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
