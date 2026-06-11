class_name VillageAmbience
extends Node2D
## Town-map rebuild Phase 4 — ambient cozy-village dressing: chimney smoke
## above built houses and a soft pulsing glow on the street lamps.
##
## A self-contained y-sorted layer VillageScreen adds under its World node (a
## sibling of Props/Buildings/Npcs — the SAME shape as VillageNpcs.gd, the
## proven pattern for ambient layers). VillageScreen passes DATA only (each
## built building's floor point + art id); this layer never reaches into the
## screen's sprite nodes. Lamp positions come straight from
## VillageLayout.decor_for_stage(stage) (art_id "lamp").
##
## Y-SORT TRICK: every effect lives under a tiny holder Node2D pinned at the
## owning sprite's FLOOR line ± a hair of bias, so the merged World y-sort
## draws smoke just IN FRONT of its house (the puffs overlap the roof) and a
## halo just BEHIND its lamp post. The sprites inside a holder move by offset
## only — holder positions never change per-frame, so sort order is stable.
##
## HEADLESS / MOTION GUARD (house gate, same as VillageNpcs): _process ticks
## only when UiFx.is_active() — false headless, under the visual harness's
## UiFx.enabled = false pin, and under Reduce Motion — so tests and goldens
## always see the settled spawn state. Tests drive the deterministic public
## step(delta) directly instead.
##
## PERFORMANCE (Web/GL-compat): a handful of RECYCLED puff sprites per
## building (capped at MAX_PUFFS total), 3 cached procedural puff textures +
## 1 cached halo texture shared by every sprite, and a step() loop that only
## mutates floats/Vector2s — zero per-frame allocations.

const TILE := TownArtConfig.TILE

## ── Smoke tuning (KEEP IT SUBTLE — wisps, not a soot storm) ─────────────────
const PUFFS_PER_BUILDING := 3
## Global puff cap: a 25-house City still spawns at most this many sprites
## (round-robin over the buildings, so every chimney keeps at least one wisp).
const MAX_PUFFS := 30
const PUFF_LIFE_MIN := 2.6          ## seconds a puff lives (rise + fade)
const PUFF_LIFE_MAX := 3.8
const PUFF_RISE_SPEED := 7.0        ## px/s upward drift
const PUFF_DRIFT_MAX := 1.6         ## px/s sideways breeze (per-puff roll)
const PUFF_SWAY_AMP := 1.2          ## px of sinusoidal wobble
const PUFF_ALPHA := 0.48            ## peak opacity — translucent wisps
## Where the "chimney" sits on the house art: the Serene roofs are flat
## ridges (no modeled chimney), and a stack ~2/3 across the roof top reads
## like one without naming any specific sprite.
const CHIMNEY_X_FRAC := 0.68
const CHIMNEY_TOP_INSET := 3.0      ## px below the art's top edge

## ── Lamp-glow tuning (gentle nighttime-hearth pulse) ────────────────────────
const HALO_SIZE := 30               ## px halo texture edge
const HALO_ALPHA_MIN := 0.22
const HALO_ALPHA_MAX := 0.46
const HALO_PULSE_PERIOD := 2.6      ## seconds per full pulse
## The lantern head sits in the upper part of the lamp art — the halo centers
## at this fraction of the art height above the floor point.
const HALO_HEIGHT_FRAC := 0.62

## Sub-pixel y-sort bias: smoke holders sit this far IN FRONT of their house's
## floor line, halos this far BEHIND their lamp's.
const SORT_BIAS := 0.5

## Default instance seed (tests pass explicit seeds for twin-determinism).
const DEFAULT_SEED := 224

## One recycled smoke puff. Pure data — all behavior lives in step() so the
## cycle is steppable headless.
class Puff:
	extends RefCounted
	var sprite: Sprite2D
	var origin: Vector2 = Vector2.ZERO  ## chimney point, local to the holder
	var age: float = 0.0
	var life: float = 3.0
	var drift: float = 0.0              ## sideways px/s
	var sway_phase: float = 0.0

## Cached procedural textures, shared by every instance (immutable pixels).
static var _puff_textures: Array[Texture2D] = []
static var _halo_texture: Texture2D = null
static var _flash_texture: Texture2D = null

var _rng := RandomNumberGenerator.new()
var _seed_base: int = DEFAULT_SEED
var _puffs: Array[Puff] = []
var _halos: Array[Sprite2D] = []
var _halo_phases: Array[float] = []
var _time: float = 0.0
## Rebuild no-op signature: stage + building data. A plain refresh() with
## unchanged state never resets the smoke/halo cycle (mirrors VillageNpcs'
## same-stage no-op).
var _signature: String = ""

func _init(rng_seed: int = DEFAULT_SEED) -> void:
	_seed_base = rng_seed
	y_sort_enabled = true
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST

# ── lifecycle ─────────────────────────────────────────────────────────────────

## (Re-)build the effect sprites for the rendered stage + built buildings.
## `buildings` is an Array of {"pos": Vector2 (floor-anchor world px — the
## point VillageScreen._floor_pos computed), "art_id": String (the building's
## TownArtConfig art id)}. No-op when nothing changed since the last call.
func set_stage_and_buildings(stage: int, buildings: Array) -> void:
	var sig: String = str(stage)
	for b: Dictionary in buildings:
		sig += "|%s@%s" % [String(b.get("art_id", "")), str(b.get("pos", Vector2.ZERO))]
	if sig == _signature:
		return
	_signature = sig
	_rebuild(stage, buildings)

## VillageScreen forwards its own visibility here (Main hides primary views
## via `.visible = false`), so a hidden screen spends zero _process time.
func set_running(on: bool) -> void:
	set_process(on)

# ── build ─────────────────────────────────────────────────────────────────────

func _rebuild(stage: int, buildings: Array) -> void:
	for child in get_children():
		remove_child(child)
		child.queue_free()
	_puffs = []
	_halos = []
	_halo_phases = []
	_time = 0.0
	# Deterministic: the same (seed, stage, buildings) always yields the same
	# puff jitter sequence — twin instances stepped identically stay identical.
	_rng.seed = hash("village_ambience:%d:%s" % [_seed_base, _signature])

	# Chimney smoke — round-robin puffs over the buildings under the cap.
	if not buildings.is_empty():
		var total: int = mini(buildings.size() * PUFFS_PER_BUILDING, MAX_PUFFS)
		var holders: Array[Node2D] = []
		for i in range(buildings.size()):
			holders.append(_make_holder(buildings[i], i))
		for i in range(total):
			_spawn_puff(holders[i % buildings.size()],
				_chimney_point(buildings[i % buildings.size()]),
				float(i) / float(maxi(1, total)))

	# Lamp halos — one per "lamp" decor entry visible at this stage.
	var lamp_idx: int = 0
	for d: Dictionary in VillageLayout.decor_for_stage(stage):
		if String(d["art_id"]) != "lamp":
			continue
		_spawn_halo(d["cell"], lamp_idx)
		lamp_idx += 1

## A smoke holder pinned a hair IN FRONT of the building's floor line, so the
## merged World y-sort draws its puffs over the roof.
func _make_holder(b: Dictionary, index: int) -> Node2D:
	var holder := Node2D.new()
	holder.name = "smoke_%d_%s" % [index, String(b.get("art_id", ""))]
	holder.position = (b.get("pos", Vector2.ZERO) as Vector2) + Vector2(0.0, SORT_BIAS)
	add_child(holder)
	return holder

## The chimney point LOCAL to the building's floor-anchor holder, from the
## art's manifest geometry (procedural-fallback buildings use their footprint
## box — the same degraded size VillageScreen._make_sprite draws).
func _chimney_point(b: Dictionary) -> Vector2:
	var art_id: String = String(b.get("art_id", ""))
	var e: Dictionary = TownArtConfig.entry(art_id)
	var w: float
	var h: float
	var anchor: Vector2
	if e.is_empty():
		var fp: Vector2i = TownArtConfig.footprint_of(art_id)
		w = float(fp.x * TILE)
		h = float(fp.y * TILE)
		anchor = Vector2(w * 0.5, h)
	else:
		w = float(int(e.get("w", TILE)))
		h = float(int(e.get("h", TILE)))
		anchor = TownArtConfig.anchor_of(art_id)
	return Vector2(w * CHIMNEY_X_FRAC - anchor.x, CHIMNEY_TOP_INSET - anchor.y)

## One recycled puff sprite under `holder`, its cycle staggered by `stagger`
## (fraction of a life) so a chimney's wisps never move in lockstep.
func _spawn_puff(holder: Node2D, origin: Vector2, stagger: float) -> void:
	var p := Puff.new()
	p.origin = origin
	p.life = _rng.randf_range(PUFF_LIFE_MIN, PUFF_LIFE_MAX)
	p.drift = _rng.randf_range(-PUFF_DRIFT_MAX, PUFF_DRIFT_MAX)
	p.sway_phase = _rng.randf_range(0.0, TAU)
	p.age = stagger * p.life

	p.sprite = Sprite2D.new()
	p.sprite.texture = _puff_texture(_rng.randi_range(0, 2))
	p.sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	holder.add_child(p.sprite)
	_puffs.append(p)
	_place_puff(p)

## A glow halo pinned a hair BEHIND the lamp's floor line, centered on the
## lantern head, additive-blended so it brightens whatever it overlaps.
func _spawn_halo(cell: Vector2i, index: int) -> void:
	var floor_pos := Vector2((float(cell.x) + 0.5) * float(TILE), float(cell.y + 1) * float(TILE))
	var holder := Node2D.new()
	holder.name = "halo_%d_%d_%d" % [index, cell.x, cell.y]
	holder.position = floor_pos - Vector2(0.0, SORT_BIAS)
	add_child(holder)

	var lamp_h: float = float(int(TownArtConfig.entry("lamp").get("h", 2 * TILE)))
	var halo := Sprite2D.new()
	halo.texture = _halo_tex()
	halo.position = Vector2(0.0, -lamp_h * HALO_HEIGHT_FRAC)
	halo.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	var mat := CanvasItemMaterial.new()
	mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	halo.material = mat
	halo.modulate.a = HALO_ALPHA_MIN
	holder.add_child(halo)
	_halos.append(halo)
	# Deterministic per-lamp phase so the street doesn't pulse in unison.
	_halo_phases.append(float(index) * 0.37)

# ── tick ──────────────────────────────────────────────────────────────────────

## Frame tick — gated by the house motion probe (headless / visual harness /
## Reduce Motion ⇒ no self-driven motion). Tests call step() directly.
func _process(delta: float) -> void:
	if not UiFx.is_active():
		return
	step(delta)

## Advance the smoke cycle + lamp pulse by `delta` seconds. Public and
## deterministic (pure math over the seeded spawn state) so headless tests and
## capture tools can pose the ambience without _process.
func step(delta: float) -> void:
	_time += delta
	for p in _puffs:
		p.age += delta
		while p.age >= p.life:
			p.age -= p.life
		_place_puff(p)
	for i in range(_halos.size()):
		var s: float = 0.5 + 0.5 * sin(TAU * (_time / HALO_PULSE_PERIOD + _halo_phases[i]))
		_halos[i].modulate.a = lerpf(HALO_ALPHA_MIN, HALO_ALPHA_MAX, s)

## Pose one puff from its age: rise + breeze drift + sinusoidal sway, fading
## in fast and out over the tail, growing as it disperses.
func _place_puff(p: Puff) -> void:
	var t: float = p.age
	p.sprite.position = p.origin + Vector2(
		p.drift * t + sin(t * 1.7 + p.sway_phase) * PUFF_SWAY_AMP,
		-PUFF_RISE_SPEED * t)
	var fade_in: float = clampf(t / 0.35, 0.0, 1.0)
	var fade_out: float = clampf((p.life - t) / (p.life * 0.45), 0.0, 1.0)
	p.sprite.modulate.a = PUFF_ALPHA * fade_in * fade_out
	var grow: float = 0.8 + (t / p.life) * 0.8
	p.sprite.scale = Vector2(grow, grow)

# ── stage-reveal accent ───────────────────────────────────────────────────────

## One-shot accent on the pads a stage increase just revealed: a soft white
## flash that swells and fades over each newly granted plot. Catalog indices
## [capacity(prev_stage), min(lot_grant, capacity(new_stage))) are exactly the
## plots the tier-up added. Motion-gated like everything else here — headless,
## the harness, and Reduce Motion skip it entirely.
func flash_new_pads(prev_stage: int, new_stage: int, lot_grant: int) -> void:
	if not UiFx.is_active():
		return
	var lo_stage: int = clampi(prev_stage, 1, VillageLayout.MAX_STAGE)
	var lo: int = int(VillageLayout.STAGE_PLOT_CAPACITY[lo_stage - 1])
	var plots: Array = VillageLayout.plots()
	var hi: int = mini(lot_grant, plots.size())
	for i in range(lo, hi):
		if int(plots[i]["stage"]) > new_stage:
			continue
		var p: Dictionary = plots[i]
		var fp: Vector2i = p["footprint"]
		var center := (Vector2(p["cell"]) + Vector2(fp) * 0.5) * float(TILE)
		var flash := Sprite2D.new()
		flash.texture = _flash_tex()
		flash.position = center
		flash.modulate = Color(1.0, 0.98, 0.88, 0.55)
		flash.scale = Vector2(0.7, 0.7)
		flash.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		add_child(flash)
		var tw := flash.create_tween()
		tw.set_parallel(true)
		tw.tween_property(flash, "modulate:a", 0.0, 0.7).set_ease(Tween.EASE_OUT)
		tw.tween_property(flash, "scale", Vector2(1.15, 1.15), 0.7) \
			.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		tw.chain().tween_callback(flash.queue_free)

# ── cached procedural textures ────────────────────────────────────────────────

## Three soft smoke-puff circles (5/7/9 px), built once. Cool light gray with
## a translucent rim so a wisp reads round, not square.
static func _puff_texture(which: int) -> Texture2D:
	if _puff_textures.is_empty():
		for d: int in [5, 7, 9]:
			_puff_textures.append(_soft_circle(d, Color(0.93, 0.93, 0.96)))
	return _puff_textures[clampi(which, 0, _puff_textures.size() - 1)]

static func _halo_tex() -> Texture2D:
	if _halo_texture == null:
		_halo_texture = _radial_glow(HALO_SIZE, Color(1.0, 0.85, 0.45))
	return _halo_texture

## Soft white pad-sized square for the stage-reveal flash (3×3 plot ⇒ 48px).
static func _flash_tex() -> Texture2D:
	if _flash_texture == null:
		var px: int = VillageLayout.PLOT_FOOTPRINT.x * TILE
		var img := Image.create(px, px, false, Image.FORMAT_RGBA8)
		img.fill(Color(1, 1, 1, 1))
		_flash_texture = ImageTexture.create_from_image(img)
	return _flash_texture

## A filled circle with a half-alpha 1px rim (the cheap "soft" edge at 16px scale).
static func _soft_circle(d: int, col: Color) -> Texture2D:
	var img := Image.create(d, d, false, Image.FORMAT_RGBA8)
	var c := (float(d) - 1.0) * 0.5
	var r := float(d) * 0.5
	for y in range(d):
		for x in range(d):
			var dist: float = Vector2(float(x) - c, float(y) - c).length()
			if dist <= r - 1.0:
				img.set_pixel(x, y, col)
			elif dist <= r:
				img.set_pixel(x, y, Color(col.r, col.g, col.b, 0.5))
	return ImageTexture.create_from_image(img)

## A radial falloff glow disc (alpha = (1 - r/R)^2), additive-friendly.
static func _radial_glow(d: int, col: Color) -> Texture2D:
	var img := Image.create(d, d, false, Image.FORMAT_RGBA8)
	var c := (float(d) - 1.0) * 0.5
	var max_r := float(d) * 0.5
	for y in range(d):
		for x in range(d):
			var t: float = Vector2(float(x) - c, float(y) - c).length() / max_r
			if t < 1.0:
				var a: float = (1.0 - t) * (1.0 - t)
				img.set_pixel(x, y, Color(col.r, col.g, col.b, a))
	return ImageTexture.create_from_image(img)
