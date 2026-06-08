extends SceneTree

## Headless glyph-coverage probe. Reports, for the engine default font (Godot sans)
## and the Cinzel heading font, whether each symbol/emoji codepoint we use in the UI
## actually has a glyph — BEFORE and AFTER UiKit.install_emoji_fallback(). A `false`
## means a tofu box renders. Run:
##   <godot> --headless --path godot --script res://tools/glyph_check.gd

func _init() -> void:
	var codes := {
		"U+2715 X close": 0x2715,
		"U+2716 heavy X": 0x2716,
		"U+2630 hamburger": 0x2630,
		"U+2726 4pt star": 0x2726,
		"U+2713 check": 0x2713,
		"U+2714 heavy check": 0x2714,
		"U+2605 black star": 0x2605,
		"U+2B50 white star": 0x2B50,
		"U+2728 sparkles": 0x2728,
		"U+2699 gear menu": 0x2699,
		"U+1F52E crystalball": 0x1F52E,
		"U+16B1 runic R": 0x16B1,
		"U+1FA99 coin": 0x1FA99,
		"U+1F3E0 house": 0x1F3E0,
	}

	var sans := ThemeDB.fallback_font
	var cinzel := UiKit.heading_font()

	print("=== BEFORE install_emoji_fallback ===")
	_report(sans, cinzel, codes)

	UiKit.install_emoji_fallback()
	print("\n=== AFTER install_emoji_fallback ===")
	# heading_font() caches; rebuild a fresh probe of fallbacks too
	_report(ThemeDB.fallback_font, UiKit.heading_font(), codes)

	quit()

func _report(sans: Font, cinzel: Font, codes: Dictionary) -> void:
	print("  %-22s | sans | cinzel" % "glyph")
	for label in codes:
		var c: int = codes[label]
		var s := "  yes " if (sans != null and sans.has_char(c)) else "  TOFU"
		var h := "  yes " if (cinzel != null and cinzel.has_char(c)) else "  TOFU"
		print("  %-22s |%s |%s" % [label, s, h])
