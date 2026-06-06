extends SceneTree
## Asset-pipeline Stage 3 — pipeline-validation fixture generator.
##
## Production v2 tiles are animated sprite sheets authored externally
## (PixelLab / Ludo.ai — see docs/godot-migration-plan.html §assets-stage3).
## This tool fabricates ONE real v2 asset from the v1 grass PNG so the Stage-3
## drop-in path (Tile.gd -> AnimatedSprite2D) is exercised end-to-end and covered
## by a headless test, without waiting on the external art feed.
##
## It bends the grass blades with a height-weighted horizontal shear whose phase
## sweeps a full sine cycle across the frames — a seamless sway loop, NOT a rigid
## region shift: the base stays planted and the tips travel furthest. Output is
## the format the plan recommends — individual frame PNGs plus a SpriteFrames
## that references them:
##   res://assets/tiles/v2/tile_grass_grass/frame_NN.png  (8 frames)
##   res://assets/tiles/v2/tile_grass_grass.tres          (SpriteFrames "idle")
##
## Two-phase, because freshly-written PNGs must be imported before they load.
## Run NON-headless (needs the rendering server to read back the source image):
##   godot --path godot --script res://tools/make_v2_grass.gd   # phase 1: frames
##   godot --headless --path godot --import                     # import them
##   godot --path godot --script res://tools/make_v2_grass.gd   # phase 2: .tres
## To regenerate from scratch, delete the frame dir first.

const SRC := "res://assets/tiles/tile_grass_grass.png"
const DIR := "res://assets/tiles/v2/tile_grass_grass"
const OUT := "res://assets/tiles/v2/tile_grass_grass.tres"
const FRAMES := 8
const AMP_PX := 2.5          ## max blade-tip travel, in source pixels
const FPS := 10.0

func _frame_res(i: int) -> String:
	return "%s/frame_%02d.png" % [DIR, i]

func _initialize() -> void:
	# Phase 2: frames already imported -> assemble and save the SpriteFrames.
	if ResourceLoader.exists(_frame_res(0)):
		_build_tres()
	else:
		_write_frames()

func _write_frames() -> void:
	var src_tex: Texture2D = load(SRC)
	if src_tex == null:
		push_error("source texture not found: " + SRC)
		quit(1)
		return
	var src: Image = src_tex.get_image()
	src.convert(Image.FORMAT_RGBA8)
	var w: int = src.get_width()
	var h: int = src.get_height()
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(DIR))
	# In a project context the res:// dir is created by the editor; make sure the
	# logical dir exists for save_png.
	if not DirAccess.dir_exists_absolute(DIR):
		DirAccess.make_dir_recursive_absolute(DIR)
	for f in FRAMES:
		var phase: float = TAU * float(f) / float(FRAMES)
		var err := _sway(src, w, h, phase).save_png(_frame_res(f))
		print("  wrote %s err=%d" % [_frame_res(f), err])
	print("phase 1 done — now run:  godot --headless --path godot --import  then re-run this script")
	quit(0)

func _build_tres() -> void:
	var frames := SpriteFrames.new()
	frames.add_animation(&"idle")
	frames.set_animation_loop(&"idle", true)
	frames.set_animation_speed(&"idle", FPS)
	if frames.has_animation(&"default"):
		frames.remove_animation(&"default")
	for f in FRAMES:
		var tex: Texture2D = load(_frame_res(f))
		if tex == null:
			push_error("missing imported frame: " + _frame_res(f))
			quit(1)
			return
		frames.add_frame(&"idle", tex)
	var err := ResourceSaver.save(frames, OUT)
	print("phase 2 done — wrote %s (%d frames) err=%d" % [OUT, FRAMES, err])
	quit(0 if err == OK else 1)

## One frame: shift each row horizontally by amp*sin(phase) weighted by height,
## so the tips (top) bend most and the base (bottom) holds. Exposed edges stay
## transparent.
func _sway(src: Image, w: int, h: int, phase: float) -> Image:
	var out := Image.create(w, h, false, Image.FORMAT_RGBA8)
	out.fill(Color(0, 0, 0, 0))
	var swing: float = AMP_PX * sin(phase)
	for y in h:
		var weight: float = float(h - 1 - y) / float(h - 1)   # 1 at top, 0 at base
		var shift: int = int(round(swing * weight))
		for x in w:
			var sx: int = x - shift
			if sx >= 0 and sx < w:
				out.set_pixel(x, y, src.get_pixel(sx, y))
	return out
