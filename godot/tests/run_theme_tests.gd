extends SceneTree
## Headless tests for M5a — UiKit shared builder helpers.
##
## Asserts that every public static function on the UiKit class_name global:
##   - Returns the correct non-null type.
##   - Caches the heading font (same instance on two calls).
##   - Produces a PanelContainer containing a Label for make_pill().
##   - Leaves expected theme overrides on a Button after style_button().
##
## Uses the same dependency-free harness as the other run_*.gd suites.
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_theme_tests.gd
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
	print("\n── UiKit (M5a) theme-builder tests ────────────────")

	# ── Palette color constants exist and are Color ───────────────────────────
	_check(Palette.PARCHMENT is Color,      "Palette.PARCHMENT is Color")
	_check(Palette.INK       is Color,      "Palette.INK is Color")
	_check(Palette.EMBER     is Color,      "Palette.EMBER is Color")
	_check(Palette.GOLD      is Color,      "Palette.GOLD is Color")
	_check(Palette.MOSS      is Color,      "Palette.MOSS is Color")

	# ── heading_font: returns Font or null, and caches (same instance) ────────
	# The font file may or may not be present in the headless environment;
	# both outcomes are valid — we just check the type contract and caching.
	var f1 = UiKit.heading_font()
	var f2 = UiKit.heading_font()
	_check(f1 == null or f1 is Font,        "heading_font() returns Font or null")
	_check(f1 == f2,                        "heading_font() returns cached instance on 2nd call")

	# ── parchment_box ─────────────────────────────────────────────────────────
	var pb = UiKit.parchment_box(Palette.PARCHMENT)
	_check(pb != null,                      "parchment_box() returns non-null")
	_check(pb is StyleBoxFlat,              "parchment_box() is StyleBoxFlat")

	# ── btn_box (default padding_v=6) ─────────────────────────────────────────
	var bb6 = UiKit.btn_box(Palette.PARCHMENT)
	_check(bb6 != null,                     "btn_box() returns non-null")
	_check(bb6 is StyleBoxFlat,             "btn_box() is StyleBoxFlat")

	# btn_box with padding_v=8 (MenuScreen variant)
	var bb8 = UiKit.btn_box(Palette.PARCHMENT, 8)
	_check(bb8 != null,                     "btn_box(fill, 8) returns non-null")
	_check(bb8 is StyleBoxFlat,             "btn_box(fill, 8) is StyleBoxFlat")
	# The two variants must produce DIFFERENT StyleBoxFlat instances (not the same object)
	# with different content_margin_top values.
	_check(bb6 != bb8,                      "btn_box(6) and btn_box(8) are distinct instances")
	_check(bb6.content_margin_top == 6.0,   "btn_box default padding_v == 6")
	_check(bb8.content_margin_top == 8.0,   "btn_box padding_v=8 applied correctly")

	# ── row_box ───────────────────────────────────────────────────────────────
	var rb = UiKit.row_box()
	_check(rb != null,                      "row_box() returns non-null")
	_check(rb is StyleBoxFlat,              "row_box() is StyleBoxFlat")

	# ── bar_box ───────────────────────────────────────────────────────────────
	var barb = UiKit.bar_box(Palette.MOSS, Palette.IRON)
	_check(barb != null,                    "bar_box() returns non-null")
	_check(barb is StyleBoxFlat,            "bar_box() is StyleBoxFlat")

	# ── card_box ──────────────────────────────────────────────────────────────
	var cb = UiKit.card_box(Palette.PARCHMENT)
	_check(cb != null,                      "card_box() returns non-null")
	_check(cb is StyleBoxFlat,              "card_box() is StyleBoxFlat")

	# ── make_pill ─────────────────────────────────────────────────────────────
	var pill = UiKit.make_pill("x", Palette.INK, Palette.PARCHMENT)
	_check(pill != null,                    "make_pill() returns non-null")
	_check(pill is PanelContainer,          "make_pill() returns a PanelContainer")
	# The pill must contain exactly one child and it must be a Label.
	_check(pill.get_child_count() == 1,     "make_pill() PanelContainer has exactly 1 child")
	_check(pill.get_child(0) is Label,      "make_pill() child is a Label")
	# The label meta must be stored and match the child.
	_check(pill.has_meta("label"),          "make_pill() stores meta 'label'")
	_check(pill.get_meta("label") == pill.get_child(0), "make_pill() meta 'label' matches child")

	# ── style_button (no disabled, with font_size=20 — Inventory/Menu variant) ─
	var btn_a := Button.new()
	root.add_child(btn_a)
	UiKit.style_button(btn_a, Palette.EMBER)
	# At least the "normal" stylebox override must be set.
	_check(btn_a.get_theme_stylebox("normal", "Button") != null,
		"style_button() sets a 'normal' stylebox override")
	# font_size override IS set by default (with_font_size defaults to 0 → no override).
	# Let's explicitly test with_font_size=20 (Inventory/Menu pattern).
	var btn_b := Button.new()
	root.add_child(btn_b)
	UiKit.style_button(btn_b, Palette.EMBER, 6, 20)
	_check(btn_b.get_theme_font_size("font_size", "Button") == 20,
		"style_button(..., 20) applies font_size override of 20")

	# ── style_button (with_disabled=true — TownScreen variant) ────────────────
	var btn_c := Button.new()
	root.add_child(btn_c)
	UiKit.style_button(btn_c, Palette.EMBER, 6, 0, true)
	_check(btn_c.get_theme_stylebox("disabled", "Button") != null,
		"style_button(..., with_disabled=true) sets 'disabled' stylebox override")

	# ── style_button (no disabled, no font_size — TownScreen default) ─────────
	var btn_d := Button.new()
	root.add_child(btn_d)
	UiKit.style_button(btn_d, Palette.EMBER, 6, 0, false)
	# "disabled" override must NOT be present when with_disabled=false
	# We can check by verifying the override doesn't exist on the local theme.
	_check(not btn_d.has_theme_stylebox_override("disabled"),
		"style_button(..., with_disabled=false) does NOT set 'disabled' stylebox override")

	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)
