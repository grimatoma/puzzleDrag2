class_name UiKit
extends RefCounted
## Shared UI builder helpers — M5a extract.
##
## A stateless `class_name` global (NOT an autoload) that centralises the
## styling helpers previously copy-pasted across Main.gd, TownScreen.gd,
## MenuScreen.gd, and InventoryScreen.gd.  Every function is `static` so
## call sites use `UiKit.heading_font()`, `UiKit.btn_box(fill)`, etc. without
## ever instantiating this node.
##
## Palette tokens are read from the `Palette` class_name global (Palette.gd).

# ── shared layout reserves (B1) ──────────────────────────────────────────────────
## The height (px) of the persistent HUD top-bar band (settlement title + coin/level/
## tier/biome pills + ⚙ menu) on CanvasLayer layer 1. Each of the five PRIMARY nav
## VIEWS reserves this strip at the TOP — its opaque view backdrop starts at this
## offset so the layer-1 top bar shows ABOVE the view (full-brightness, persistent
## chrome) instead of being painted over. Tuned so the view content sits flush UNDER
## the bar with no gap and no overlap (the bar is ~54–56px tall: title font 26 +
## 10/10 margins + a 2px bottom border).
const TOPBAR_RESERVE := 60
## The height (px) of the persistent bottom-nav bar (a LOWER CanvasLayer, `NAV_HEIGHT`
## in Main.gd). Each PRIMARY view's backdrop stops this far short of the bottom so the
## nav shows through + stays tappable; floating overlay controls lift above it too.
const NAV_RESERVE := 76

## Max content width for full-bleed VIEW screens. Content FILLS below this; on wider
## (desktop/foldable) windows it is capped + centred so rows/search bars don't stretch
## edge-to-edge. Set to the portrait base width (720) so it NEVER bites the phone layout —
## only wide windows get the centred column. The web caps line length the same way.
const VIEW_MAX_WIDTH := 960

## A full-width container that caps + centres its single child to `max_w` on wide viewports
## (and fills on narrow ones). Godot Control has no native max-width, so this recomputes its
## own left/right margins whenever it is resized. Add your content (the scroll/VBox) as its
## child. Use this for full-bleed VIEW screens (NOT modals, which already centre a sized panel).
static func make_width_cap(max_w: int = VIEW_MAX_WIDTH) -> MarginContainer:
	var mc := MarginContainer.new()
	mc.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	mc.size_flags_vertical = Control.SIZE_EXPAND_FILL
	mc.set_meta("_cap_w", max_w)
	mc.resized.connect(func() -> void:
		var avail: float = mc.size.x
		var side: int = int(maxf(0.0, (avail - float(mc.get_meta("_cap_w", VIEW_MAX_WIDTH))) / 2.0))
		mc.add_theme_constant_override("margin_left", side)
		mc.add_theme_constant_override("margin_right", side)
	)
	return mc

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
			var fb: Array = []
			var emoji := emoji_font()
			if emoji != null:
				fb.append(emoji)
			var symbols := symbols_font()
			if symbols != null:
				fb.append(symbols)
			fv.fallbacks = fb
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

# ── symbols fallback font ──────────────────────────────────────────────────────

## Cached DejaVu Sans symbol SUBSET (godot/assets/fonts/DejaVuSymbols-subset.ttf,
## Bitstream Vera license — see the .LICENSE file beside it), or null if absent.
## Covers the non-emoji symbol codepoints the UI strings use that NEITHER the engine
## default font NOR NotoEmoji carries — → (U+2192), ◉ (U+25C9), ✎ (U+270E), ★, ✓,
## ⬡, ⟳, ⊞, ∈, ∪, ≈, Δ … — which otherwise render as tofu boxes on the Web export
## (review-4: the chain toast's "→" and the daily-reward "◉" were tofu in QA).
static var _symbols_font_cache: Font = null
static var _symbols_font_tried: bool = false

## Load the bundled symbols-subset font. Same pattern as emoji_font(): bundled so it
## renders identically on desktop AND web, cached on the class, null-safe for callers.
static func symbols_font() -> Font:
	if _symbols_font_tried:
		return _symbols_font_cache
	_symbols_font_tried = true
	var path := "res://assets/fonts/DejaVuSymbols-subset.ttf"
	if ResourceLoader.exists(path):
		var f = load(path)
		if f is FontFile:
			_symbols_font_cache = f
	return _symbols_font_cache

## Cached synthetic-italic FontVariation (the default body font sheared right). Godot's
## bundled font has no italic face, so story/quote text gets a real slant via the font
## variation transform. Cached on the class. Used for the Chronicle ledes + any quoted
## flavour text that wants emphasis without a separate italic asset.
static var _italic_font_cache: Font = null
static var _italic_font_tried: bool = false

## Return a synthetic-italic Font (default body font with a rightward shear), or null if
## the engine default font is unavailable. Reuse across callers (the cache lives on the
## class). The shear (~12°) slants glyph tops to the right like a true oblique.
static func italic_font() -> Font:
	if _italic_font_tried:
		return _italic_font_cache
	_italic_font_tried = true
	var base: Font = ThemeDB.fallback_font
	if base == null:
		return null
	var fv := FontVariation.new()
	fv.base_font = base
	# Transform2D(x_axis, y_axis, origin): a y_axis of (-0.21, 1) shears the glyphs so
	# their TOP edge (negative y, above the baseline) shifts right — a standard oblique.
	fv.variation_transform = Transform2D(Vector2(1, 0), Vector2(-0.21, 1), Vector2.ZERO)
	_italic_font_cache = fv
	return _italic_font_cache

## Attach the bundled emoji font as a fallback on the ENGINE DEFAULT font so every
## Label/Button that uses the inherited default font (the HUD pills, bottom-nav icons,
## modal close buttons, status text — all of which carry emoji like 🪙🏠📦🔨🗺👥)
## renders the glyph instead of a tofu box. Idempotent + null-safe; call once from
## Main._ready. Base glyphs are unchanged (same default font), so body text is
## pixel-identical — only previously-broken emoji start rendering.
static func install_emoji_fallback() -> void:
	var base: Font = ThemeDB.fallback_font
	if base == null:
		return
	var fb: Array = base.fallbacks
	var changed := false
	# Emoji first (existing behaviour), then the symbols subset (→ ◉ ✎ ★ ✓ …) so any
	# codepoint both carry keeps resolving from NotoEmoji exactly as before.
	for f in [emoji_font(), symbols_font()]:
		if f != null and not fb.has(f):
			fb.append(f)
			changed = true
	if changed:
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
	# ResourceConfig.icon_basename(key) defaults to the key itself (the asset convention), so
	# behaviour is identical for every current row; a catalog row may override the PNG basename.
	var path := "res://assets/resources/%s.png" % ResourceConfig.icon_basename(key)
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
##
## TILE keys ("tile_grass_grass", "tile_mine_stone", "tile_fish_kelp") get the redundant
## "tile_" prefix AND the leading category segment stripped first, so a tile used as a
## crafting/cost input reads as a clean noun ("Grass", "Stone", "Kelp") instead of the raw
## key — which previously leaked verbatim into the Decorations cost chips. Mirrors
## TileCollectionScreen._derive_display_name; non-tile resource keys keep the plain path.
static func pretty_name(key: String) -> String:
	var s := String(key)
	# Catalog resources/currencies get their CANONICAL React label ("bread" → "Bread Loaf",
	# "fish_fillet" → "Fillet") — the single source of truth. Tools/unknowns fall through to the
	# capitalize() path below; TILE keys use the shared TileCategoryConfig derivation (the ONE
	# tile-key prefix-strip + title-case implementation, replacing the former inline DROP_PREFIXES).
	if ResourceConfig.has(s):
		return ResourceConfig.label(s)
	if s.begins_with("tile_"):
		return TileCategoryConfig.display_name_from_key(s)
	return s.capitalize()

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

## FILLED primary-action button (React parity): the NORMAL state is a SOLID accent fill
## (green Craft, gold Sell, ember Enter, …) with contrast-picked text, so an enabled
## action reads as a clear call-to-action instead of a passive parchment pill that looks
## disabled. The disabled state stays muted parchment so enabled-vs-disabled is obvious.
## Use this for positive primary actions; keep style_button() for Close/Cancel/secondary.
static func style_action_button(btn: Button, accent: Color, padding_v: int = 6, with_font_size: int = 0) -> void:
	var text := _contrast_text(accent)
	btn.add_theme_stylebox_override("normal",   _action_box(accent, padding_v))
	btn.add_theme_stylebox_override("hover",     _action_box(accent.lightened(0.10), padding_v))
	btn.add_theme_stylebox_override("pressed",   _action_box(accent.darkened(0.12), padding_v))
	btn.add_theme_stylebox_override("focus",     _action_box(accent.lightened(0.10), padding_v))
	btn.add_theme_stylebox_override("disabled",  btn_box(Palette.DIM, padding_v))
	btn.add_theme_color_override("font_color",          text)
	btn.add_theme_color_override("font_hover_color",     text)
	btn.add_theme_color_override("font_pressed_color",   text)
	btn.add_theme_color_override("font_focus_color",     text)
	btn.add_theme_color_override("font_disabled_color",  Color(Palette.INK_MID, 0.55))
	if with_font_size > 0:
		btn.add_theme_font_size_override("font_size", with_font_size)

## StyleBox for a filled action button: solid accent fill, a slightly darker accent
## border for definition, radius 8, snug margins.
static func _action_box(fill: Color, padding_v: int) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = fill
	sb.border_color = fill.darkened(0.22)
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(8)
	sb.content_margin_left = 12
	sb.content_margin_right = 12
	sb.content_margin_top = padding_v
	sb.content_margin_bottom = padding_v
	return sb

## Pick ink-dark or soft-parchment text for legibility on `bg` by perceived luminance —
## light accents (gold/tan) get dark ink, dark accents (ember/moss/rose) get light text.
static func _contrast_text(bg: Color) -> Color:
	var lum := 0.299 * bg.r + 0.587 * bg.g + 0.114 * bg.b
	return Palette.INK if lum > 0.62 else Palette.PARCHMENT_SOFT

# ── Segmented tab toggle ────────────────────────────────────────────────────────

## Apply the React segmented-control look to one tab Button (src/ui/primitives/TabBar.tsx
## parity): the ACTIVE segment is a SOLID accent fill (ember by default) with
## contrast-picked text — a clear "you are here" — while INACTIVE segments are a flat
## parchment-soft pill with muted ink text. Used for the small two/three-way toggles
## (Achievements Trophies|Collection, Townsfolk Workers|Quests). Pair the buttons in a
## tight HBox; call this on each whenever the active tab changes.
static func style_segment(btn: Button, active: bool, accent := Palette.EMBER, padding_v: int = 6) -> void:
	if active:
		var box := _action_box(accent, padding_v)
		var txt := _contrast_text(accent)
		btn.add_theme_stylebox_override("normal",  box)
		btn.add_theme_stylebox_override("hover",   _action_box(accent.lightened(0.08), padding_v))
		btn.add_theme_stylebox_override("pressed", box)
		btn.add_theme_stylebox_override("focus",   box)
		btn.add_theme_color_override("font_color",         txt)
		btn.add_theme_color_override("font_hover_color",   txt)
		btn.add_theme_color_override("font_pressed_color", txt)
		btn.add_theme_color_override("font_focus_color",   txt)
	else:
		btn.add_theme_stylebox_override("normal",  btn_box(Palette.PARCHMENT_SOFT, padding_v))
		btn.add_theme_stylebox_override("hover",   btn_box(Palette.PARCHMENT, padding_v))
		btn.add_theme_stylebox_override("pressed", btn_box(Palette.DIM, padding_v))
		btn.add_theme_stylebox_override("focus",   btn_box(Palette.PARCHMENT, padding_v))
		btn.add_theme_color_override("font_color",         Palette.INK_MID)
		btn.add_theme_color_override("font_hover_color",   Palette.INK)
		btn.add_theme_color_override("font_pressed_color", Palette.INK_MID)
		btn.add_theme_color_override("font_focus_color",   Palette.INK_MID)

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
	# WheelClampScrollContainer is a SmoothScrollContainer that hard-stops MOUSE-WHEEL
	# momentum at the top/bottom edge (no elastic overscroll) while leaving the springy
	# overdrag intact for finger/content drags. See WheelClampScrollContainer.gd for why
	# this lives in repo code rather than as an edit to the vendored addon.
	var scroll := WheelClampScrollContainer.new()
	scroll.allow_horizontal_scroll = false
	# Scroll at 1× finger speed, not 2×. project.godot sets BOTH
	# pointing/emulate_mouse_from_touch AND pointing/emulate_touch_from_mouse, so one
	# physical drag arrives as TWO events: the real InputEventScreenDrag plus a
	# synthesized InputEventMouseMotion (emulated from the touch). The addon's input
	# handler accumulates `event.relative` for BOTH (drag_with_touch and drag_with_mouse
	# both default true), double-counting every drag — the content travels twice as far
	# as the finger. The port treats touch as mouse (emulate_mouse_from_touch), so route
	# drags through the mouse path ONLY: touch still scrolls via its emulated mouse
	# motion, but each gesture is counted exactly once.
	scroll.drag_with_touch = false
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
	# Theme the engine scrollbar to the parchment palette. The default Godot scrollbar is
	# a pale-grey track + thumb that reads as raw engine chrome against the warm cards
	# (flagged on every scroll modal). Replace it with a slim, semi-transparent ink thumb
	# and an invisible track so it nearly disappears at rest like the React view. Done on
	# `ready` so the bars exist (ScrollContainer creates them in its own _ready).
	scroll.ready.connect(func() -> void:
		_slim_scrollbar(scroll.get_v_scroll_bar())
		_slim_scrollbar(scroll.get_h_scroll_bar())
	)
	return scroll

## Restyle a ScrollBar to a slim, parchment-friendly thumb with an invisible track so it
## reads as a subtle indicator rather than grey engine chrome.
static func _slim_scrollbar(bar: ScrollBar) -> void:
	if bar == null:
		return
	var grab := StyleBoxFlat.new()
	grab.bg_color = Color(Palette.INK_MID, 0.38)
	grab.set_corner_radius_all(4)
	grab.content_margin_left = 4
	grab.content_margin_right = 4
	var grab_hi := grab.duplicate() as StyleBoxFlat
	grab_hi.bg_color = Color(Palette.INK_MID, 0.6)
	var empty := StyleBoxEmpty.new()
	bar.add_theme_stylebox_override("scroll", empty)
	bar.add_theme_stylebox_override("scroll_focus", empty)
	bar.add_theme_stylebox_override("grabber", grab)
	bar.add_theme_stylebox_override("grabber_highlight", grab_hi)
	bar.add_theme_stylebox_override("grabber_pressed", grab_hi)

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
