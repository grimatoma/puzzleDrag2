extends SceneTree
## Dev utility: render the spatial top-down town map (M6b) from a TownLayout plan
## and save a PNG. Run NON-headless so the GPU actually draws the fills, polylines
## and ellipses:
##   godot --path godot --script res://tools/m6b_capture.gd -- <out_path>
##
## Builds a "home" plan with 7 plots and a farm board, fits it into the 720×1280
## portrait viewport via TownMap.render_plan, lets it settle, and writes the PNG.
## Migration evidence for the headline visible feature (town map render). The
## renderer is ISOLATED here — it is NOT wired into Main's navigation yet.

const TownMapScript := preload("res://scenes/town/TownMap.gd")

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_path: String = args[0] if args.size() > 0 else "res://m6b-townmap.png"

	var town_map: Node2D = TownMapScript.new()
	root.add_child(town_map)

	var plan := TownLayout.build_plan("home", 7, ["farm"])
	town_map.render_plan(plan, 720.0, 1280.0)

	for _i in range(5):
		await process_frame

	var img := root.get_texture().get_image()
	var err := img.save_png(out_path)
	print("m6b town map %s -> %s (err %d)" % [img.get_size(), out_path, err])
	print("  plan: stage=%sx%s lots=%d boards=%d roads=%d trees=%d props=%d"
		% [plan.get("stage_w"), plan.get("stage_h"),
		   (plan["lots"] as Array).size(), (plan["boards"] as Array).size(),
		   (plan["roads"] as Array).size(), (plan["trees"] as Array).size(),
		   (plan["props"] as Array).size()])
	quit(0 if err == OK else 1)
