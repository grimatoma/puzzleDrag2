extends SceneTree
## sprite-pipeline — assemble a Godot SpriteFrames (.tres) from a folder of frame PNGs.
##
## Generalises godot/tools/make_v2_grass.gd: that tool BOTH generated grass sway frames AND
## packed them; this one only PACKS. The frames are produced upstream by Aseprite (the
## pipeline's sole animation executor — see references/aseprite-execution.md), exported to
## frames/<id>/NN.png. This script loads those PNGs in sorted order and builds the v2
## SpriteFrames the game's Tile.gd loads (newest-wins tier), with one looping animation.
##
## The output matches scenes/Tile.gd's Stage-3 contract exactly:
##   - one animation named "idle" (override via the 4th arg / ANIM_NAME)
##   - loop = true
##   - speed (FPS) = the project FPS from the style spec (3rd arg / FPS)
## Tile.gd resolves it at res://assets/tiles/v2/<key>.tres and plays "idle"; if the animation
## name or loop flag is wrong the tile silently falls back to the v1 PNG, so keep them as-is.
##
## ── Run (frames must already be imported; see the caveat below) ───────────────────────────
##   godot --headless --path godot --script res://addons/sprite-pipeline/assemble_tres.gd -- \
##       res://assets/tiles/v2/sets/birch/frames/tile_tree_birch_autumn \
##       res://assets/tiles/v2/sets/birch/tile_tree_birch_autumn.tres \
##       10 idle
## Args (positional, after `--`): <frames_dir> <out_tres> [fps=10] [anim_name="idle"]
## With no args it falls back to the FRAMES_DIR / OUT_TRES / FPS / ANIM_NAME constants below.
##
## ── Import caveat (the two-phase gotcha, same as make_v2_grass.gd) ────────────────────────
## Godot can only load() a PNG after it has an import record. So the order is ALWAYS:
##   1. Aseprite writes frames/<id>/NN.png
##   2. godot --headless --path godot --import        # builds .godot/ import records
##   3. git checkout godot/project.godot              # --import rewrites project.godot and
##                                                    # strips touch/stretch settings — revert it
##   4. run THIS script to pack the .tres
## Commit the per-frame <NN>.png.import sidecars (NOT .godot/imported/). Verify in-engine with
## a headless screenshot + `godot --headless --path godot --script res://tests/run_assets_tests.gd`.
## Valid for Godot 4.6.

# Fallbacks used only when no `--` args are supplied (edit for an ad-hoc run).
const FRAMES_DIR := "res://assets/tiles/v2/sets/example/frames/example"
const OUT_TRES := "res://assets/tiles/v2/sets/example/example.tres"
const FPS := 10.0
const ANIM_NAME := "idle"

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var frames_dir: String = args[0] if args.size() > 0 else FRAMES_DIR
	var out_tres: String = args[1] if args.size() > 1 else OUT_TRES
	var fps: float = float(args[2]) if args.size() > 2 else FPS
	var anim_name: String = args[3] if args.size() > 3 else ANIM_NAME
	quit(_build(frames_dir, out_tres, fps, anim_name))

## Load every frame PNG in `frames_dir` (sorted by filename), pack them into a single looping
## SpriteFrames animation `anim_name` at `fps`, and save to `out_tres`. Returns an exit code
## (0 = OK) for quit().
func _build(frames_dir: String, out_tres: String, fps: float, anim_name: String) -> int:
	var frame_paths := _frame_paths(frames_dir)
	if frame_paths.is_empty():
		push_error("no frame PNGs found in %s (did you export from Aseprite + run --import?)" % frames_dir)
		return 1

	var sf := SpriteFrames.new()
	var anim := StringName(anim_name)
	# A fresh SpriteFrames ships a "default" animation; replace it with ours.
	if not sf.has_animation(anim):
		sf.add_animation(anim)
	sf.set_animation_loop(anim, true)
	sf.set_animation_speed(anim, fps)
	if anim != &"default" and sf.has_animation(&"default"):
		sf.remove_animation(&"default")

	for p in frame_paths:
		var tex: Texture2D = load(p) as Texture2D
		if tex == null:
			push_error("frame failed to load (unimported?): " + p)
			return 1
		sf.add_frame(anim, tex)

	var err := ResourceSaver.save(sf, out_tres)
	print("assemble_tres: %d frame(s) -> %s  (anim=%s fps=%s) err=%d"
		% [frame_paths.size(), out_tres, anim_name, fps, err])
	return 0 if err == OK else 1

## Frame PNGs in `dir`, sorted by filename so 00.png, 01.png, … pack in order. Skips Godot's
## .import sidecars and any non-PNG. Accepts a res:// or absolute path.
func _frame_paths(dir: String) -> PackedStringArray:
	var out := PackedStringArray()
	var d := DirAccess.open(dir)
	if d == null:
		push_error("frames dir not found: " + dir)
		return out
	var names := d.get_files()
	names.sort()
	for n in names:
		if n.to_lower().ends_with(".png"):
			out.append(dir.path_join(n))
	return out
