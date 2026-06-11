extends SceneTree
## Headless tests for the Phase-4 village ambience layer (VillageAmbience):
## chimney smoke recycled over built buildings, pulsing lamp halos anchored on
## the stage's "lamp" decor, the deterministic public step(), the headless
## _process guard, and the VillageScreen integration (data-fed from
## _rebuild_buildings, visibility forwarded).
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_village_ambience_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

var _checks: int = 0
var _failures: int = 0

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _initialize() -> void:
	print("\n── VillageAmbience (town-map rebuild Phase 4) tests ─")
	await _run()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

## Lamp count in the decor catalog visible at `stage`.
func _lamp_count(stage: int) -> int:
	var n: int = 0
	for d: Dictionary in VillageLayout.decor_for_stage(stage):
		if String(d["art_id"]) == "lamp":
			n += 1
	return n

## Pose fingerprint for determinism checks: every puff sprite's position +
## alpha and every halo's alpha.
func _pose_fingerprint(amb: VillageAmbience) -> Array:
	var out: Array = []
	for p in amb._puffs:
		out.append("%s|%.4f" % [str(p.sprite.position), p.sprite.modulate.a])
	for h in amb._halos:
		out.append("%.4f" % h.modulate.a)
	return out

func _run() -> void:
	# The lamp decor the halos anchor on: the catalog ships lamps from stage 1
	# and adds more as the village grows (Phase-4 layout addition).
	_check(_lamp_count(1) == 2, "stage-1 decor ships 2 plaza lamps")
	_check(_lamp_count(3) == 4, "stage-3 decor grows to 4 lamps")
	_check(_lamp_count(5) == 6, "stage-5 decor tops out at 6 lamps")

	# ── 1. Build: puffs for buildings only, halos for the stage's lamps ───────
	var amb := VillageAmbience.new(7)
	root.add_child(amb)
	var buildings: Array = [
		{"pos": Vector2(200.0, 192.0), "art_id": "house"},
		{"pos": Vector2(360.0, 192.0), "art_id": "mill"},
	]
	amb.set_stage_and_buildings(1, buildings)
	_check(amb._puffs.size() == 2 * VillageAmbience.PUFFS_PER_BUILDING,
		"2 buildings spawn %d recycled puffs" % (2 * VillageAmbience.PUFFS_PER_BUILDING))
	_check(amb._halos.size() == _lamp_count(1),
		"halo count (%d) == the stage-1 lamp decor count" % amb._halos.size())
	var sprites_ok := true
	for p in amb._puffs:
		if p.sprite.texture == null \
				or p.sprite.texture_filter != CanvasItem.TEXTURE_FILTER_NEAREST:
			sprites_ok = false
	_check(sprites_ok, "every puff sprite has a texture + NEAREST filtering")
	# Y-sort bias: smoke holders sit IN FRONT of their building's floor line,
	# halo holders BEHIND their lamp's.
	var smoke_holder: Node2D = amb.get_node("smoke_0_house")
	_check(smoke_holder != null
		and smoke_holder.position.y > (buildings[0]["pos"] as Vector2).y,
		"smoke holder sorts in FRONT of its building's floor line")
	var bias_ok := true
	for d: Dictionary in VillageLayout.decor_for_stage(1):
		if String(d["art_id"]) != "lamp":
			continue
		var cell: Vector2i = d["cell"]
		var floor_y: float = float(cell.y + 1) * float(TownArtConfig.TILE)
		var found := false
		for child in amb.get_children():
			if String(child.name).begins_with("halo_") \
					and String(child.name).ends_with("_%d_%d" % [cell.x, cell.y]):
				found = true
				if (child as Node2D).position.y >= floor_y:
					bias_ok = false
		if not found:
			bias_ok = false
	_check(bias_ok, "every stage-1 lamp has a halo holder BEHIND its floor line")
	# Halos pulse additively from the minimum alpha.
	var halos_ok := true
	for h in amb._halos:
		if h.texture == null or not (h.material is CanvasItemMaterial) \
				or (h.material as CanvasItemMaterial).blend_mode != CanvasItemMaterial.BLEND_MODE_ADD \
				or absf(h.modulate.a - VillageAmbience.HALO_ALPHA_MIN) > 0.001:
			halos_ok = false
	_check(halos_ok, "halos start at min alpha with ADD blending")

	# Same input → NO rebuild (node identity preserved, cycle undisturbed).
	var first_child: Node = amb.get_child(0)
	amb.set_stage_and_buildings(1, buildings)
	_check(amb.get_child_count() > 0 and amb.get_child(0) == first_child,
		"set_stage_and_buildings(same data) is a no-op (node identity kept)")

	# Stage growth re-anchors the halos; the smoke set follows the buildings.
	amb.set_stage_and_buildings(5, buildings)
	_check(amb._halos.size() == _lamp_count(5),
		"stage 5 → %d halos (one per lamp)" % _lamp_count(5))
	amb.set_stage_and_buildings(5, [])
	_check(amb._puffs.is_empty(), "no built buildings → zero puffs")
	_check(amb._halos.size() == _lamp_count(5), "lamps glow even with nothing built")

	# The global puff cap: 12 buildings would want 36 puffs — capped, but
	# round-robin keeps at least one puff on EVERY chimney.
	var many: Array = []
	for i in range(12):
		many.append({"pos": Vector2(40.0 + 50.0 * i, 200.0), "art_id": "house"})
	amb.set_stage_and_buildings(5, many)
	_check(amb._puffs.size() == VillageAmbience.MAX_PUFFS,
		"12 buildings cap at MAX_PUFFS (%d) total puffs" % VillageAmbience.MAX_PUFFS)
	var holders_with_puffs: Dictionary = {}
	for p in amb._puffs:
		holders_with_puffs[p.sprite.get_parent()] = true
	_check(holders_with_puffs.size() == 12,
		"round-robin keeps every chimney smoking under the cap")

	# ── 2. step(): deterministic advance + recycle ─────────────────────────────
	amb.set_stage_and_buildings(1, buildings)
	var before: Array = _pose_fingerprint(amb)
	amb.step(0.25)
	_check(_pose_fingerprint(amb) != before, "step(0.25) advances puffs + halo pulse")
	# Puff ages stay inside [0, life) across a recycle boundary.
	amb.step(VillageAmbience.PUFF_LIFE_MAX + 1.0)
	var recycled_ok := true
	for p in amb._puffs:
		if p.age < 0.0 or p.age >= p.life:
			recycled_ok = false
	_check(recycled_ok, "a long step recycles puffs (age wraps within its life)")
	# Halo alpha stays inside the documented pulse band.
	var band_ok := true
	for _i in range(40):
		amb.step(0.1)
		for h in amb._halos:
			if h.modulate.a < VillageAmbience.HALO_ALPHA_MIN - 0.001 \
					or h.modulate.a > VillageAmbience.HALO_ALPHA_MAX + 0.001:
				band_ok = false
	_check(band_ok, "halo pulse stays inside [%.2f, %.2f]"
		% [VillageAmbience.HALO_ALPHA_MIN, VillageAmbience.HALO_ALPHA_MAX])

	# Twin determinism: same seed + same data + same steps ⇒ identical poses.
	var twin_a := VillageAmbience.new(99)
	var twin_b := VillageAmbience.new(99)
	root.add_child(twin_a)
	root.add_child(twin_b)
	twin_a.set_stage_and_buildings(2, buildings)
	twin_b.set_stage_and_buildings(2, buildings)
	for _i in range(12):
		twin_a.step(1.0 / 30.0)
		twin_b.step(1.0 / 30.0)
	_check(_pose_fingerprint(twin_a) == _pose_fingerprint(twin_b),
		"twin instances (same seed/data/steps) pose identically")
	twin_a.queue_free()
	twin_b.queue_free()

	# ── 3. Headless guard + running flag ──────────────────────────────────────
	var frozen: Array = _pose_fingerprint(amb)
	amb._process(0.5)
	_check(_pose_fingerprint(amb) == frozen,
		"headless guard: _process(0.5) changes NOTHING (UiFx inactive)")
	amb.set_running(false)
	_check(not amb.is_processing(), "set_running(false) stops _process")
	amb.set_running(true)
	_check(amb.is_processing(), "set_running(true) resumes _process")
	# The stage-reveal flash is motion-gated too: headless it adds no nodes.
	var child_count: int = amb.get_child_count()
	amb.flash_new_pads(1, 2, 10)
	_check(amb.get_child_count() == child_count,
		"flash_new_pads is a headless no-op (motion-gated)")
	amb.queue_free()
	await process_frame

	# ── 4. VillageScreen integration ──────────────────────────────────────────
	var game := GameState.new()
	var screen := VillageScreen.new()
	root.add_child(screen)
	screen.setup(game)
	screen.open()
	await process_frame
	_check(screen._ambience != null and screen._ambience.get_parent() == screen._world,
		"screen builds the ambience layer under World")
	_check(screen._ambience.y_sort_enabled, "ambience layer is y-sorted")
	_check(screen._ambience._puffs.is_empty(),
		"fresh Camp (nothing built) → no smoke")
	_check(screen._ambience._halos.size() == _lamp_count(screen._render_stage),
		"screen halos (%d) match the rendered stage's lamp count"
		% screen._ambience._halos.size())

	# Build through the REAL picker → the new building starts smoking.
	game.settlement.tier = TownConfig.TIER_VILLAGE
	game.inventory = {"plank": 60, "flour": 60, "hay_bundle": 60}
	screen.refresh()
	(screen._action_buttons["build_open"] as Button).emit_signal("pressed")
	(screen._action_buttons["build:" + BuildingConfig.LUMBER_CAMP] as Button).emit_signal("pressed")
	_check(game.buildings.size() == 1, "picker build landed (precondition)")
	_check(screen._ambience._puffs.size() == VillageAmbience.PUFFS_PER_BUILDING,
		"the built building smokes (%d puffs)" % screen._ambience._puffs.size())
	_check(screen._ambience._halos.size() == _lamp_count(screen._render_stage),
		"halos track the stage after the tier change (%d at stage %d)"
		% [screen._ambience._halos.size(), screen._render_stage])

	# Visibility forwarding (Main hides primary views via `.visible = false`).
	screen.visible = false
	_check(not screen._ambience.is_processing(), "hidden screen → ambience paused")
	screen.open()
	_check(screen._ambience.is_processing(), "re-open resumes the ambience")

	screen.queue_free()
	await process_frame
