extends SceneTree
## Dev utility: open the VillageScreen IN-GAME on a realistic GameState and
## save a 720×1280 PNG. Run NON-headless (foreground — background non-headless
## renders are flaky on Windows) so the GPU draws the ground TileMapLayer (the
## frame-animated river included), the floor-anchored building/decor sprites,
## the Phase-4 ambience (chimney smoke + lamp halos), and the overlay:
##   godot --path godot --script res://tools/village_capture.gd -- <out_path> [tier] [builds]
##
## `tier` (1..5, default 5) sets the settlement tier for the shot — the
## staged-growth re-tune maps tiers to growth stages 1..5, so tier 1 is the
## tiny 5-lot Camp and tier 5 the full 25-lot City. `builds` (default 15)
## buildings are constructed through the REAL game.build() API at City tier
## (every unlock available), then the settlement is set to the target tier —
## ordinal plots keep every built sprite legal, and the capture shows the
## buildings-with-pads mix plus smoke above every built house.
##
## Defaults to res://tools/_caps/village.png (_caps/ is gitignored). Opens the
## real screen via Main._open_townmap(), settles, poses the villagers AND the
## smoke cycle deterministically, and writes the PNG — the phase's visual
## acceptance evidence. A second _wide shot zooms out to the CONTAIN fit.

## Build order for the `builds` count — a spread of spawners / refiners /
## landmarks (no hazard buildings; they need the rats gate).
const BUILD_ORDER: Array = [
	BuildingConfig.LUMBER_CAMP, BuildingConfig.COOP, BuildingConfig.GARDEN,
	BuildingConfig.BAKERY, BuildingConfig.MILL, BuildingConfig.GRANARY,
	BuildingConfig.SILO, BuildingConfig.CHAPEL, BuildingConfig.WORKSHOP,
	BuildingConfig.STABLE, BuildingConfig.KITCHEN, BuildingConfig.BARN,
	BuildingConfig.SAWMILL, BuildingConfig.APIARY, BuildingConfig.OBSERVATORY,
	BuildingConfig.FORGE, BuildingConfig.SMOKEHOUSE, BuildingConfig.LARDER,
]

func _save(path: String) -> void:
	var img := root.get_texture().get_image()
	var err := img.save_png(path)
	print("saved %s (%s, err %d)" % [path, img.get_size(), err])

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "res://tools/_caps/village.png"
	var tier: int = clampi(int(args[1]) if args.size() > 1 else TownConfig.TIER_CITY,
		TownConfig.TIER_CAMP, TownConfig.MAX_TIER)
	var builds: int = clampi(int(args[2]) if args.size() > 2 else 15, 0, BUILD_ORDER.size())
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(out_path).get_base_dir())

	SaveManager.clear()                          # ignore any leftover test save
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	# Keep the first-load tutorial out of the shot (standard capture-tool move).
	main.game.mark_tutorial_seen()
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false

	# Build through the REAL build API at City tier (all unlocks live), then
	# drop to the target tier for the shot — ordinal plots keep every built
	# sprite legal at any tier (the overflow guard renders them regardless).
	main.game.settlement.tier = TownConfig.TIER_CITY
	main.game.active_biome = "farm"
	var grant := {"hay_bundle": 400, "flour": 400, "plank": 400, "eggs": 200,
		"block": 300, "iron_bar": 120, "soup": 120, "honey": 60, "bread": 60}
	for k in grant:
		main.game.inventory[k] = grant[k]
	for i in range(builds):
		var id: String = String(BUILD_ORDER[i])
		var res: Dictionary = main.game.build(id)
		if not bool(res.get("ok", false)):
			print("  build FAILED: %s → %s" % [id, str(res)])
	main.game.settlement.tier = tier
	main._refresh_hud_all()                      # top-bar pills reflect the tier

	# Open the real village screen (lazily builds the shell + fits the camera),
	# then let it settle so the TileMapLayer + sprites + overlay draw cleanly.
	main._open_townmap()
	for _i in range(6):
		await process_frame

	# Walking villagers: deterministically advance the wander FSM a few
	# simulated seconds so the crowd is caught MID-STREET. Foreground _process
	# walks them too; the manual step() just guarantees the pose.
	var npcs = main._townmap_screen._npcs
	for _i in range(40):
		npcs.step(0.1)
	var walking: int = 0
	for v in npcs._villagers:
		if v.state == VillageNpcs.State.WALK:
			walking += 1
	# Ambience: pose the smoke mid-cycle (puffs risen + visible) the same way.
	var ambience = main._townmap_screen._ambience
	for _i in range(30):
		ambience.step(0.1)
	print("  villagers=%d walking=%d puffs=%d halos=%d"
		% [npcs._villagers.size(), walking, ambience._puffs.size(), ambience._halos.size()])
	for _i in range(2):
		await process_frame

	_save(out_path)

	# Second shot zoomed out to the CONTAIN fit — the whole village in frame
	# (letterboxed), for checking buildings/pads/landmarks/river at a glance.
	var screen = main._townmap_screen
	while screen._zoom > screen._min_zoom + 0.001:
		screen.zoom_at(1.0 / VillageScreen.ZOOM_STEP, screen._host_size() * 0.5)
	for _i in range(3):
		await process_frame
	var wide_path: String = out_path.get_basename() + "_wide." + out_path.get_extension()
	_save(wide_path)
	print("  tier=%s plots=%d buildings=%s lots=%d stage=%d zoom=%.2f"
		% [main.game.settlement.tier_name(), main.game.settlement.plots(),
		   main.game.buildings, main._townmap_screen.plan_lot_count(),
		   main._townmap_screen._render_stage, main._townmap_screen._zoom])
	quit(0)
