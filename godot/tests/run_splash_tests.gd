extends SceneTree
## Headless tests for the launch splash (scenes/SplashScreen.gd + the art
## authored by tools/gen_splash.py). Verifies:
##   • both splash PNGs are committed + imported and load as Texture2D
##   • setup() builds synchronously (visible, title/hint text, art wired,
##     NEAREST filtering, layer above the tutorial modal)
##   • the Main auto-wire contract: a direct-child MOUSE_FILTER_STOP ColorRect
##     plus a close() method (what _install_overlay_dismiss keys on)
##   • close() is idempotent; dismiss() hides + emits `finished` exactly once
##   • a headless Main boot NEVER creates a splash (the determinism gate)
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_splash_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

const SplashScreenScript := preload("res://scenes/SplashScreen.gd")

var _checks: int = 0
var _failures: int = 0
var _finished_count: int = 0

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _initialize() -> void:
	print("\n── Splash screen tests ───────────────────────────")
	_test_assets()
	_test_setup_contract()
	_test_dismiss_lifecycle()
	await _test_headless_main_skips_splash()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── art assets ───────────────────────────────────────────────────────────────

func _test_assets() -> void:
	for path in ["res://assets/splash/splash.png", "res://assets/splash/splash_glow.png"]:
		_check(ResourceLoader.exists(path), "splash asset present + imported: %s" % path)
		var tex = load(path)
		_check(tex is Texture2D, "splash asset loads as Texture2D: %s" % path)
		if tex is Texture2D:
			_check((tex as Texture2D).get_size() == Vector2(720, 1280),
				"splash asset is 720x1280 (x4-nearest of the 180x320 native canvas): %s" % path)
	# The ENGINE/web-loader boot splash must be the aspect-agnostic medallion,
	# drawn centred at natural size — a full-bleed portrait image here letterboxes
	# into a "portrait strip" on wide screens and then jumps to full width when
	# SplashScreen.gd takes over (the launch-width bug).
	var boot_path := "res://assets/splash/splash_boot.png"
	_check(ResourceLoader.exists(boot_path), "boot medallion present + imported: %s" % boot_path)
	var boot = load(boot_path)
	_check(boot is Texture2D, "boot medallion loads as Texture2D")
	if boot is Texture2D:
		_check((boot as Texture2D).get_size() == Vector2(400, 400),
			"boot medallion is 400x400 (x4-nearest of the 100x100 native canvas)")
	_check(String(ProjectSettings.get_setting("application/boot_splash/image")) == boot_path,
		"project boot_splash/image points at the medallion (NOT the portrait scene)")
	# 0 = Disabled: drawn centred at natural size. Any stretching mode would
	# contain-fit on the web loader and recreate the portrait-strip jump.
	_check(int(ProjectSettings.get_setting("application/boot_splash/stretch_mode")) == 0,
		"boot_splash/stretch_mode is Disabled (centred at natural size, any aspect)")

# ── setup() shell contract ───────────────────────────────────────────────────

func _test_setup_contract() -> void:
	var splash = SplashScreenScript.new()
	root.add_child(splash)
	splash.setup()
	_check(splash.visible, "setup() shows the splash synchronously")
	_check(splash.is_showing(), "is_showing() true after setup()")
	_check(splash.layer > 6, "splash layers above the tutorial modal (layer 6)")
	_check(splash._title_label != null and splash._title_label.text == "Hearthlands",
		"title label reads 'Hearthlands'")
	_check(splash._hint_label != null and splash._hint_label.text != "",
		"tap-to-begin hint label is present")
	_check(splash._art != null and splash._art.texture != null,
		"scene art TextureRect carries the splash texture")
	_check(splash._glow != null and splash._glow.texture != null,
		"glow overlay TextureRect carries the emission texture")
	_check(splash._art.texture_filter == CanvasItem.TEXTURE_FILTER_NEAREST,
		"scene art uses NEAREST filtering (crisp pixels)")
	# Main._install_overlay_dismiss keys on: direct-child STOP ColorRect + close().
	var scrim_ok := false
	for child in splash.get_children():
		if child is ColorRect and (child as ColorRect).mouse_filter == Control.MOUSE_FILTER_STOP:
			scrim_ok = true
	_check(scrim_ok, "a direct-child MOUSE_FILTER_STOP ColorRect exists (tap-to-skip auto-wire)")
	_check(splash.has_method("close"), "close() exists (tap-to-skip auto-wire)")
	splash.dismiss()
	splash.free()

# ── dismiss / finished lifecycle ─────────────────────────────────────────────

func _test_dismiss_lifecycle() -> void:
	var splash = SplashScreenScript.new()
	root.add_child(splash)
	splash.setup()
	splash.finished.connect(func() -> void: _finished_count += 1)
	# close() begins the fade-out; in headless no frames pump, so the splash is
	# still visible (the tween hasn't run) but latched closing. A second close()
	# must be a no-op.
	splash.close()
	_check(splash._closing, "close() latches the closing state")
	splash.close()
	# dismiss() is the synchronous terminal state: hidden + finished, exactly once.
	splash.dismiss()
	_check(not splash.visible, "dismiss() hides the splash synchronously")
	_check(not splash.is_showing(), "is_showing() false after dismiss()")
	_check(_finished_count == 1, "finished emitted exactly once")
	splash.dismiss()
	_check(_finished_count == 1, "second dismiss() does not re-emit finished")
	splash.free()

# ── headless Main boot gate ──────────────────────────────────────────────────

func _test_headless_main_skips_splash() -> void:
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame                        # let the deferred _ready + splash gate run
	_check(main._splash == null, "headless Main boot creates NO splash (test determinism)")
	# Direct call — timing-independent: the gate must hold for a headless,
	# harness-instantiated (non-current-scene) Main.
	main._maybe_show_splash()
	_check(main._splash == null, "_maybe_show_splash gate holds for a harness-instantiated Main")
	main.free()
