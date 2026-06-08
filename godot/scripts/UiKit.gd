class_name UiKit
extends Node
## Shared UI builder helpers — M5a extract.
##
## A stateless `class_name` global (NOT an autoload) that centralises the
## styling helpers previously copy-pasted across Main.gd, TownScreen.gd,
## MenuScreen.gd, and InventoryScreen.gd.  Every function is `static` so
## call sites use `UiKit.heading_font()`, `UiKit.btn_box(fill)`, etc. without
## ever instantiating this node.
##
## Palette tokens are read from the `Palette` class_name global (Palette.gd).

# ── heading font ─────────────────────────────────────────────────────────────

## Cached Cinzel-Regular.ttf as a BOLD FontVariation.  Returns null when the
## asset isn't present so callers fall back gracefully (the parchment look does
## NOT depend on the font landing).  The cache is shared across all callers
## because `static var` lives on the class, not an instance.
static var _heading_font_cache: Font = null
static var _heading_font_tried: bool = false

## Return a bold Cinzel FontVariation, or null if the font file isn't imported.
## The result is cached after the first call — every subsequent call returns
## the same instance. The emoji fallback is attached so heading labels that carry
## an emoji (modal titles like "🏆 Achievements") render the glyph instead of a
## tofu box — Cinzel has no emoji coverage.
static func heading_font() -> Font:
	if _heading_font_tried:
		return _heading_font_cache
	_heading_font_tried = true
	var path := "res://assets/fonts/Cinzel-Regular.ttf"
	if ResourceLoader.exists(path):
		var base := load(path)
		if base is FontFile:
			var fv := FontVariation.new()
			fv.base_font = base
			fv.variation_opentype = {"wght": 700}   # bold weight on the variable axis
			var emoji := emoji_font()
			if emoji != null:
				fv.fallbacks = [emoji]
			_heading_font_cache = fv
	return _heading_font_cache

# ── emoji fallback font ────────────────────────────────────────────────────────

## Cached Noto Emoji (monochrome, OFL) FontFile, or null if the asset isn't present.
## Monochrome glyphs inherit the label's font_color, so they tint to the parchment
## ink instead of clashing colour emoji — cohesive with the Cinzel/parchment look.
static var _emoji_font_cache: Font = null
static var _emoji_font_tried: bool = false

## Load the bundled emoji font (res://assets/fonts/NotoEmoji.ttf). Bundled (not a
## system font) so it renders identically on desktop AND the web export, where there
## is no OS emoji font and every emoji would otherwise be a tofu box.
static func emoji_font() -> Font:
	if _emoji_font_tried:
		return _emoji_font_cache
	_emoji_font_tried = true
	var path := "res://assets/fonts/NotoEmoji.ttf"
	if ResourceLoader.exists(path):
		var f = load(path)
		if f is FontFile:
			_emoji_font_cache = f
	return _emoji_font_cache

## Attach the bundled emoji font as a fallback on the ENGINE DEFAULT font so every
## Label/Button that uses the inherited default font (the HUD pills, bottom-nav icons,
## modal close buttons, status text — all of which carry emoji like 🪙🏠📦🔨🗺👥)
## renders the glyph instead of a tofu box. Idempotent + null-safe; call once from
## Main._ready. Base glyphs are unchanged (same default font), so body text is
## pixel-identical — only previously-broken emoji start rendering.
static func install_emoji_fallback() -> void:
	var emoji := emoji_font()
	if emoji == null:
		return
	var base: Font = ThemeDB.fallback_font
	if base == null:
		return
	var fb: Array = base.fallbacks
	if not fb.has(emoji):
		fb.append(emoji)
		base.fallbacks = fb

# ── resource icons + names ──────────────────────────────────────────────────────

# ── modal dismiss ────────────────────────────────────────────────────────────

## Wire a modal's full-rect scrim `backdrop` so a click/tap on it (i.e. OUTSIDE the
## centered card) dismisses the modal. This is the standard "tap outside to close"
## affordance AND a reliable escape hatch: SmoothScroll swallows the FIRST click after
## a wheel/drag scroll (its input handler calls set_input_as_handled on every event it
## sees), so a just-scrolled long modal could otherwise eat the Close button's first
## tap. The backdrop sits OUTSIDE the scroll, so its input is never affected. Idempotent.
static func wire_backdrop_dismiss(backdrop: Control, on_dismiss: Callable) -> void:
	if backdrop == null or not on_dismiss.is_valid():
		return
	if backdrop.has_meta("_dismiss_wired"):
		return
	backdrop.set_meta("_dismiss_wired", true)
	backdrop.gui_input.connect(func(event: InputEvent) -> void:
		var tap: bool = (event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed) \
			or (event is InputEventScreenTouch and event.pressed)
		if tap:
			on_dismiss.call()
	)

# ── resource icons + names ────────────────────────────────────────────────────────

## Cache of loaded resource/item icon textures, keyed by item key. `null` is cached
## too (a key with no art) so a missing icon costs one ResourceLoader.exists() call,
## not one per row per refresh.
static var _icon_cache: Dictionary = {}

## Load the procedural resource/item icon exported from the Phaser app
## (res://assets/resources/<key>.png — flour, bread, eggs, plank, supplies, …),
## returning the cached Texture2D or null when no art exists for that key. These are
## the SAME canvas drawings React shows beside every inventory row / stockpile chip /
## craft input / market line; board-TILE art ("tile_*") loads via Tile.gd instead.
static func resource_icon(key: String) -> Texture2D:
	if _icon_cache.has(key):
		return _icon_cache[key]
	var tex: Texture2D = null
	var path := "res://assets/resources/%s.png" % key
	if ResourceLoader.exists(path):
		var loaded = load(path)
		if loaded is Texture2D:
			tex = loaded
	_icon_cache[key] = tex
	return tex

## A square TextureRect for a resource icon at `px`, or null when no art exists — so
## callers do `var ic := UiKit.make_icon(key); if ic: row.add_child(ic)` and silently
## skip text-only keys rather than draw a broken rect. Smooth downscale (linear) from
## the 90px source, keeps aspect, ignores mouse so drag/scroll passes through.
static func make_icon(key: String, px: float = 30.0) -> TextureRect:
	var tex := resource_icon(key)
	if tex == null:
		return null
	var rect := TextureRect.new()
	rect.texture = tex
	rect.custom_minimum_size = Vector2(px, px)
	rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	rect.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return rect

## Title-case an item key for display: "hay_bundle" → "Hay Bundle", "iron_bar" →
## "Iron Bar". Godot's String.capitalize() handles the snake_case → Title Case split,
## matching how React labels the same items.
static func pretty_name(key: String) -> String:
	return String(key).capitalize()

# ── StyleBox builders ─────────────────────────────────────────────────────────

## Parchment StyleBoxFlat used by Main.gd HUD buttons: warm fill, 2 px iron
## border, radius 8, generous margins (14 h / 7 v).
static func parchment_box(fill: Color) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = fill
	sb.border_color = Palette.IRON
	sb.border_width_left = 2
	sb.border_width_top = 2
	sb.border_width_right = 2
	sb.border_width_bottom = 2
	sb.corner_radius_top_left = 8
	sb.corner_radius_top_right = 8
	sb.corner_radius_bottom_left = 8
	sb.corner_radius_bottom_right = 8
	sb.content_margin_left = 14
	sb.content_margin_right = 14
	sb.content_margin_top = 7
	sb.content_margin_bottom = 7
	return sb

## Action-button StyleBoxFlat used by TownScreen / MenuScreen / InventoryScreen:
## warm fill, 2 px iron border, radius 8, snug margins (12 h / `padding_v` v).
##
## `padding_v` defaults to 6 (TownScreen + InventoryScreen); pass 8 for
## MenuScreen which uses slightly taller button padding.
static func btn_box(fill: Color, padding_v: int = 6) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = fill
	sb.border_color = Palette.IRON
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(8)
	sb.content_margin_left = 12
	sb.content_margin_right = 12
	sb.content_margin_top = padding_v
	sb.content_margin_bottom = padding_v
	return sb

## Per-resource ledger row chip used by InventoryScreen: soft parchment fill,
## 1 px iron border, radius 8, snug margins (12 h / 6 v).
static func row_box() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Palette.PARCHMENT_SOFT
	sb.border_color = Palette.IRON
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(8)
	sb.content_margin_left = 12
	sb.content_margin_right = 12
	sb.content_margin_top = 6
	sb.content_margin_bottom = 6
	return sb

## Bar StyleBox (progress track / fill): flat fill, 1 px border, radius 6.
static func bar_box(fill: Color, border: Color) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = fill
	sb.border_color = border
	sb.border_width_left = 1
	sb.border_width_top = 1
	sb.border_width_right = 1
	sb.border_width_bottom = 1
	sb.corner_radius_top_left = 6
	sb.corner_radius_top_right = 6
	sb.corner_radius_bottom_left = 6
	sb.corner_radius_bottom_right = 6
	return sb

## Card StyleBox for the stockpile panel: parchment fill, 2 px iron border,
## radius 12, soft drop shadow, comfortable padding.
static func card_box(fill: Color) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = fill
	sb.border_color = Palette.IRON
	sb.border_width_left = 2
	sb.border_width_top = 2
	sb.border_width_right = 2
	sb.border_width_bottom = 2
	sb.corner_radius_top_left = 12
	sb.corner_radius_top_right = 12
	sb.corner_radius_bottom_left = 12
	sb.corner_radius_bottom_right = 12
	sb.shadow_size = 8
	sb.shadow_color = Color(0, 0, 0, 0.18)
	sb.shadow_offset = Vector2(0, 3)
	sb.content_margin_left = 14
	sb.content_margin_right = 14
	sb.content_margin_top = 10
	sb.content_margin_bottom = 12
	return sb

# ── Compound helpers ──────────────────────────────────────────────────────────

## Build a fully-rounded pill PanelContainer: iron 1 px border, `bg` fill,
## `text` Label in `fg`.  The inner Label is stored as meta "label" so callers
## can keep a reference and mutate its text later.
static func make_pill(text: String, fg: Color, bg := Palette.PARCHMENT) -> PanelContainer:
	var box := PanelContainer.new()
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = Palette.IRON
	sb.border_width_left = 1
	sb.border_width_top = 1
	sb.border_width_right = 1
	sb.border_width_bottom = 1
	sb.corner_radius_top_left = 999
	sb.corner_radius_top_right = 999
	sb.corner_radius_bottom_left = 999
	sb.corner_radius_bottom_right = 999
	sb.content_margin_left = 10
	sb.content_margin_right = 10
	sb.content_margin_top = 3
	sb.content_margin_bottom = 3
	box.add_theme_stylebox_override("panel", sb)
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_size_override("font_size", 16)
	lbl.add_theme_color_override("font_color", fg)
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	box.add_child(lbl)
	box.set_meta("label", lbl)
	return box

## Apply the parchment-pill look to an action Button.
##
## Parameters:
##   btn            — the Button to style.
##   accent         — hover text color (default Palette.EMBER).
##   padding_v      — vertical padding for btn_box() (default 6; pass 8 for
##                    MenuScreen's slightly taller buttons).
##   with_font_size — when > 0, sets a font_size override (MenuScreen/Inventory
##                    use 20; TownScreen leaves font size at default so pass 0).
##   with_disabled  — when true, also overrides the "disabled" stylebox
##                    (TownScreen needs this; MenuScreen/Inventory do not).
static func style_button(
	btn: Button,
	accent := Palette.EMBER,
	padding_v: int = 6,
	with_font_size: int = 0,
	with_disabled: bool = false
) -> void:
	btn.add_theme_stylebox_override("normal",  btn_box(Palette.PARCHMENT,      padding_v))
	btn.add_theme_stylebox_override("hover",   btn_box(Palette.PARCHMENT_SOFT, padding_v))
	btn.add_theme_stylebox_override("pressed", btn_box(Palette.DIM,            padding_v))
	btn.add_theme_stylebox_override("focus",   btn_box(Palette.PARCHMENT_SOFT, padding_v))
	if with_disabled:
		btn.add_theme_stylebox_override("disabled", btn_box(Palette.DIM, padding_v))
	btn.add_theme_color_override("font_color",         Palette.INK)
	btn.add_theme_color_override("font_hover_color",   accent)
	btn.add_theme_color_override("font_pressed_color", Palette.INK_MID)
	if with_disabled:
		btn.add_theme_color_override("font_disabled_color", Color(Palette.INK_MID, 0.5))
	if with_font_size > 0:
		btn.add_theme_font_size_override("font_size", with_font_size)

# ── Scroll container ──────────────────────────────────────────────────────────

## Build a vertical-only scroll container with momentum / touch-drag scrolling
## (SpyrexDE's SmoothScroll addon, res://addons/SmoothScroll/).
##
## Every list/modal screen (Inventory, Town, Achievements, Chronicle, Quests,
## Castle, Charter, Decorations, Portal, Townsfolk, Recipe-wiki, TileCollection,
## the Menu "More" list, StoryModal, DebugModal) used a bare `ScrollContainer`.
## SmoothScrollContainer EXTENDS ScrollContainer, so the return type stays
## `ScrollContainer` and existing call-site property access (size_flags,
## horizontal_scroll_mode, custom_minimum_size, …) is unchanged — the only new
## behaviour is inertia + flick-to-scroll, which the mobile-first port wants on
## every touch surface.
##
## Horizontal scrolling is disabled on BOTH axes-of-control: callers still set
## the native `horizontal_scroll_mode = SCROLL_MODE_DISABLED`, and here we turn
## off the addon's `allow_horizontal_scroll` so a vertical flick never imparts
## sideways velocity. The addon's `override_mouse_filters` default (true) keeps
## child buttons clickable while still allowing drag-to-scroll over them.
static func make_vscroll() -> ScrollContainer:
	var scroll := SmoothScrollContainer.new()
	scroll.allow_horizontal_scroll = false
	# The addon detects its scrollable content child in its own _ready() by grabbing the
	# FIRST non-ScrollBar Control child — which can latch onto a stray (a decorative
	# TextureRect, the addon's own stability Timer, a transient node) instead of the real
	# content VBox. When that happens `content_node` is a ~0-height node, so
	# `should_scroll_vertical()` returns false and the modal SILENTLY DOES NOT SCROLL even
	# though the real content overflows the viewport (the "scrolling doesn't work at all"
	# bug — it renders identically at rest, so it slips past a static screenshot review).
	#
	# Every call site here adds exactly ONE scrollable child and it is always a Container
	# (VBoxContainer / GridContainer). So re-point `content_node` at any entering Container,
	# OVERRIDING an earlier stray pick — strays (ScrollBar, Timer, TextureRect) are never
	# Containers. The null-fallback keeps the off-tree build order working and prevents the
	# `content_node.size` nil-deref the addon's _process would otherwise spam.
	scroll.child_entered_tree.connect(func(node: Node) -> void:
		if node is Container:
			scroll.content_node = node
		elif scroll.content_node == null and node is Control and not node is ScrollBar:
			scroll.content_node = node
	)
	return scroll

## Size a modal's vertical ScrollContainer to its CONTENT height, capped to the viewport.
## This is what makes a modal card adapt: a SHORT list yields a short card (centred in the
## scrim with no empty parchment "dead space" below it), while a LONG list caps to the
## screen and scrolls. Without it, a card pinned full-height shows its content hugging the
## top and a large void beneath — the dominant "looks unfinished" signal across the screens.
##
## `content` is the scroll's child whose combined-minimum height we measure; pass null to
## auto-detect it (the SmoothScrollContainer's `content_node`, else the first non-ScrollBar
## Control child) so call sites stay uniform. `reserved_px` is the chrome around the scroll
## (title/header + card padding + screen margins) so the WHOLE card still fits the viewport
## with breathing room. Call AFTER (re)building content and again on viewport `size_changed`.
## Safe with nulls / off-tree (no-op).
static func fit_scroll_height(scroll: ScrollContainer, content: Control = null, reserved_px: float = 240.0) -> void:
	if scroll == null or not scroll.is_inside_tree():
		return
	var c: Control = content
	if c == null:
		if "content_node" in scroll and scroll.content_node != null:
			c = scroll.content_node
		else:
			for ch in scroll.get_children():
				if ch is Control and not (ch is ScrollBar):
					c = ch
					break
	if c == null:
		return
	var vp_h: float = scroll.get_viewport_rect().size.y
	var avail: float = maxf(160.0, vp_h - reserved_px)
	scroll.custom_minimum_size.y = minf(c.get_combined_minimum_size().y, avail)
