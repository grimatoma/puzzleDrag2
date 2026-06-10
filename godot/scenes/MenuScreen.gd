class_name MenuScreen
extends CanvasLayer
## M4f — the settings / menu modal. A small parchment modal, built ENTIRELY in code
## (like Main's HUD + TownScreen — no .tscn editing), opened from the HUD "⚙" button.
## It surfaces the three settings actions the player needs:
##
##   Sound      — toggle the SFX mute (M4d's Audio service exposed no UI until now)
##   New Game   — wipe the save + restart from a fresh run
##   Close      — dismiss the modal
##
## Modelled on TownScreen (same warm-scrim backdrop + centered parchment PanelContainer
## + pill-styled buttons), but much smaller: no scroll, no dynamic sections — a fixed
## title + three buttons.
##
## SINGLE SOURCE OF TRUTH. Like TownScreen's "Shoo rats", this screen does NOT own the
## mute flip or the save: the Sound button emits `sound_toggle_requested` and Main does the actual
## `game.audio_muted` flip + `Audio.set_muted` + save (one accounting point), then calls
## back `refresh_sound_label()` so the button text re-syncs. New Game emits `new_game_requested`;
## Main owns clearing the save + restarting.
##
## Headless-test contract. Every actionable button is registered in `_action_buttons`
## under a stable string key ("toggle_sound" / "new_game" / "close") so the UI-wiring
## test can find + `pressed.emit()` it and assert the right signal fired — no rendering
## required (CanvasLayer + Control + Button instantiate + emit fine headless).

var game: GameState
var _muted: bool = false
var _fullscreen: bool = false               ## tracks the windowed/fullscreen display state

signal closed
## Emitted when the Sound button is pressed — Main flips game.audio_muted, mutes the
## Audio service, saves, and calls back refresh_sound_label() (this screen never flips
## the flag itself, so the toggle is booked in ONE place — mirrors TownScreen.rats_shoo_requested).
signal sound_toggle_requested
## Emitted when the Reduce Motion button is pressed — Main flips game.reduce_motion,
## applies it to the UiFx motion kit, saves, and calls back refresh_motion_label()
## (same single-accounting-point pattern as the Sound toggle).
signal motion_toggle_requested
## Emitted when the Text Size button is pressed — Main cycles game.text_size_index,
## sets Typography.scale, saves, re-applies the scale to live UI, and calls back
## refresh_text_size_label() (same single-accounting-point pattern as the toggles).
signal text_size_cycle_requested
## Emitted when New Game is pressed — Main wipes the save + restarts the run.
signal new_game_requested
## Emitted when a "More" navigation button is pressed, carrying the deep-link id of the
## screen to open (e.g. "achievements", "chronicle", "debug"). Main closes the menu and
## routes it through apply_deeplink — the SAME path the secondary screens used as left-strip
## HUD buttons before they moved into this menu. The menu never opens screens itself.
signal navigation_requested(deeplink_id: String)

## The "More" navigation entries — every secondary screen that used to be a left-strip HUD
## button, now reachable from the menu. Each row: {icon, label, id (a ViewRouter deep-link)}.
## The bottom-nav primary tabs (Town map / Inventory / Craft / Map / Townsfolk) are NOT
## duplicated here — but the Town LEDGER ("town") IS, since review-3 freed the 🔨 Craft tab to
## open the crafting UI instead of the ledger (the ledger is no longer reachable from the nav).
## review-3 — "Market & Town" (the TownScreen ledger) heads the list: now that the 🔨 Craft
## bottom-nav tab opens the dedicated crafting UI (RecipeWikiScreen), the town-management
## ledger (settlement / buildings / refine / MARKET sell+buy / orders) lives here + on a
## town-map button. "Recipes" was dropped — it's the same screen the Craft tab now opens.
const MORE_ENTRIES := [
	{"icon": "🏛", "label": "Market & Town", "id": "town"},
	{"icon": "🏆", "label": "Achievements", "id": "achievements"},
	{"icon": "📖", "label": "Tiles", "id": "tiles"},
	{"icon": "📜", "label": "Chronicle", "id": "chronicle"},
	{"icon": "🏰", "label": "Castle", "id": "castle"},
	{"icon": "🌷", "label": "Decorations", "id": "decorations"},
	{"icon": "🌀", "label": "Portal", "id": "portal"},
	{"icon": "✨", "label": "Boons", "id": "boons"},
	{"icon": "⚖️", "label": "Charter", "id": "charter"},
	{"icon": "📋", "label": "Quests", "id": "quests"},
	{"icon": "🎁", "label": "Daily", "id": "daily"},
]
## Note: "debug" is NOT listed here — it gets a dedicated button at the top of the scroll.

## action id → Button, for headless tests. Keys: "toggle_sound", "toggle_fullscreen",
## "show_tutorial", "new_game", "close", and one "nav:<id>" per More entry.
var _action_buttons: Dictionary = {}

## Static shell, built once in setup().
var _sound_btn: Button
var _fullscreen_btn: Button
var _motion_btn: Button
var _text_size_btn: Button
var _built: bool = false

# ── parchment palette (matches Main's HUD / TownScreen journal tokens) ──────────
const COL_TITLE := Palette.INK
const COL_PANEL := Palette.PARCHMENT
## A soft danger tone for the destructive New Game action (parity with TownScreen).
const COL_DANGER := Color("#b06a52")
const PANEL_MAX_WIDTH := 420.0

# ── lifecycle ─────────────────────────────────────────────────────────────────

## Store `game`, build the static shell ONCE, then sync the Sound label from the
## restored preference. Safe to call again (the shell is only built the first time).
func setup(g: GameState) -> void:
	game = g
	if not _built:
		_build_shell()
		_built = true
	refresh_sound_label()
	refresh_fullscreen_label()
	refresh_motion_label()
	refresh_text_size_label()

func open() -> void:
	visible = true
	refresh_sound_label()
	refresh_fullscreen_label()
	refresh_motion_label()
	refresh_text_size_label()

func close() -> void:
	visible = false
	emit_signal("closed")

## Re-sync the Sound button text from the current preference: "Sound: Off" when muted,
## "Sound: On" otherwise. Called by Main after it flips the flag, and on open/setup so
## a restored mute pref shows correctly.
func refresh_sound_label() -> void:
	if game != null:
		_muted = game.audio_muted
	if _sound_btn != null:
		_sound_btn.text = "Sound: Off" if _muted else "Sound: On"

# ── static shell ──────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 4                                   # above the Town screen (layer 3)
	visible = false

	# Full-rect dim backdrop. MOUSE_FILTER_STOP so clicks behind it never reach the
	# board while the menu is open. A warm brown-tinted scrim (matches TownScreen).
	var backdrop := UiKit.make_scrim()
	add_child(backdrop)

	# Centered panel: a full-rect Control holds a centered PanelContainer so the
	# parchment card floats in the middle of the screen over the scrim.
	# A full-rect CenterContainer centers its single child at the child's own minimum
	# size — so the parchment card sits dead-centre on every viewport without manual
	# offset math (PRESET_CENTER only pins the top-left, leaving the card to grow off
	# the right/bottom edges).
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	var panel := PanelContainer.new()
	# A narrow fixed width so the small modal reads as a tidy card, not a banner.
	panel.custom_minimum_size = Vector2(PANEL_MAX_WIDTH, 0)
	# Parchment card — warm fill, iron border, rounded corners, generous content
	# padding, and a soft drop shadow so it floats over the warm scrim.
	# Shared modal card surface (UiKit.modal_card_box) — one builder for every
	# centred-card modal so radius/border/shadow can never drift again.
	panel.add_theme_stylebox_override("panel", UiKit.modal_card_box(24))
	center.add_child(panel)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 16)
	panel.add_child(col)

	# Title — "🔥 Hearthlands" in the Cinzel display serif (React parity — the menu
	# card is branded with the game title, not a generic "Menu" label).
	var title := Label.new()
	title.text = "🔥 Hearthlands"
	UiKit.set_font_size(title, Typography.Role.DISPLAY)
	title.add_theme_color_override("font_color", COL_TITLE)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		title.add_theme_font_override("font", heading_font)
	col.add_child(title)

	# Tagline — centered under the title.
	var tagline := Label.new()
	tagline.text = "A puzzle of seasons and stews."
	UiKit.set_font_size(tagline, Typography.Role.LABEL)
	tagline.add_theme_color_override("font_color", Palette.INK_MID)
	tagline.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(tagline)

	# ── Single scrollable section ─────────────────────────────────────────────
	# All menu content (debug, settings, more, about) lives inside one scroll so
	# the full list is reachable on small viewports without nested scrollers.
	# Height cap keeps the panel within the 720×1280 viewport with room for the HUD.
	var scroll := UiKit.make_vscroll()
	scroll.custom_minimum_size = Vector2(0, 580)
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	col.add_child(scroll)

	var sc := VBoxContainer.new()
	sc.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sc.add_theme_constant_override("separation", 8)
	scroll.add_child(sc)

	# ── Debug button — at the top so it's always the first thing visible ──────
	var debug_btn := Button.new()
	debug_btn.text = "🐞  Debug"
	debug_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	debug_btn.alignment = HORIZONTAL_ALIGNMENT_CENTER
	UiKit.style_button(debug_btn, Palette.MOSS, 8, Typography.size(Typography.Role.SUBHEAD))
	debug_btn.connect("pressed", Callable(self, "_on_nav_pressed").bind("debug"))
	sc.add_child(debug_btn)
	_action_buttons["nav:debug"] = debug_btn

	sc.add_child(HSeparator.new())

	# ── Settings ──────────────────────────────────────────────────────────────
	var settings_heading := Label.new()
	settings_heading.text = "Settings"
	UiKit.set_font_size(settings_heading, Typography.Role.SUBHEAD)
	settings_heading.add_theme_color_override("font_color", COL_TITLE)
	if heading_font != null:
		settings_heading.add_theme_font_override("font", heading_font)
	sc.add_child(settings_heading)

	# Sound — toggles the SFX mute. Emits `sound_toggle_requested`; Main flips the flag + saves.
	_sound_btn = Button.new()
	_sound_btn.text = "Sound: On"
	_sound_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_button(_sound_btn, Palette.MOSS, 8, Typography.size(Typography.Role.SUBHEAD))
	_sound_btn.connect("pressed", Callable(self, "_on_sound_pressed"))
	sc.add_child(_sound_btn)
	_action_buttons["toggle_sound"] = _sound_btn

	_fullscreen_btn = Button.new()
	_fullscreen_btn.text = "Go Fullscreen"
	_fullscreen_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_button(_fullscreen_btn, Palette.MOSS, 8, Typography.size(Typography.Role.SUBHEAD))
	_fullscreen_btn.connect("pressed", Callable(self, "_on_fullscreen_pressed"))
	sc.add_child(_fullscreen_btn)
	_action_buttons["toggle_fullscreen"] = _fullscreen_btn

	# Reduce Motion — accessibility toggle for the UiFx motion kit.
	_motion_btn = Button.new()
	_motion_btn.text = "Reduce Motion: Off"
	_motion_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_button(_motion_btn, Palette.MOSS, 8, Typography.size(Typography.Role.SUBHEAD))
	_motion_btn.connect("pressed", Callable(self, "_on_motion_pressed"))
	sc.add_child(_motion_btn)
	_action_buttons["toggle_motion"] = _motion_btn

	# Text Size — accessibility cycle (Normal → Large → Larger).
	_text_size_btn = Button.new()
	_text_size_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_button(_text_size_btn, Palette.MOSS, 8, Typography.size(Typography.Role.SUBHEAD))
	_text_size_btn.connect("pressed", Callable(self, "_on_text_size_pressed"))
	sc.add_child(_text_size_btn)
	_action_buttons["cycle_text_size"] = _text_size_btn
	refresh_text_size_label()

	# Show Tutorial — re-opens the 6-step onboarding (replay).
	var tutorial_btn := Button.new()
	tutorial_btn.text = "📖 Show Tutorial"
	tutorial_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_button(tutorial_btn, Palette.MOSS, 8, Typography.size(Typography.Role.SUBHEAD))
	tutorial_btn.connect("pressed", Callable(self, "_on_show_tutorial_pressed"))
	sc.add_child(tutorial_btn)
	_action_buttons["show_tutorial"] = tutorial_btn

	# New Game — wipes the save + restarts. Danger accent (destructive).
	var new_btn := Button.new()
	new_btn.text = "New Game"
	new_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_button(new_btn, COL_DANGER, 8, Typography.size(Typography.Role.SUBHEAD))
	new_btn.connect("pressed", Callable(self, "_on_new_game_pressed"))
	sc.add_child(new_btn)
	_action_buttons["new_game"] = new_btn

	# ── "More" navigation section and About card ──────────────────────────────
	_build_more_section(sc)
	_build_about_card(sc)

	# ── Close — outside the scroll, always visible at the bottom ──────────────
	var close_btn := Button.new()
	close_btn.text = "Close"
	close_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_button(close_btn, Palette.EMBER, 8, Typography.size(Typography.Role.SUBHEAD))
	close_btn.connect("pressed", Callable(self, "close"))
	col.add_child(close_btn)
	_action_buttons["close"] = close_btn

# ── "More" navigation section ───────────────────────────────────────────────────

## Build the "More" section: a separator, heading, and one nav Button per MORE_ENTRIES row.
## Adds directly to `parent` (the shared scroll content VBoxContainer) — no nested scroll.
## Each button closes the menu and emits navigation_requested(id). Registered as "nav:<id>".
func _build_more_section(parent: VBoxContainer) -> void:
	parent.add_child(HSeparator.new())

	var heading := Label.new()
	heading.text = "More"
	UiKit.set_font_size(heading, Typography.Role.SUBHEAD)
	heading.add_theme_color_override("font_color", COL_TITLE)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		heading.add_theme_font_override("font", heading_font)
	parent.add_child(heading)

	for entry in MORE_ENTRIES:
		var id: String = String(entry["id"])
		var btn := Button.new()
		btn.text = "%s  %s" % [String(entry["icon"]), String(entry["label"])]
		btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		btn.alignment = HORIZONTAL_ALIGNMENT_CENTER
		UiKit.style_button(btn, Palette.MOSS, 8, Typography.size(Typography.Role.SUBHEAD))
		btn.connect("pressed", Callable(self, "_on_nav_pressed").bind(id))
		parent.add_child(btn)
		_action_buttons["nav:" + id] = btn

## A "More" nav button was pressed: close the menu, then emit navigation_requested(id) so Main opens
## the target screen via apply_deeplink. Closing first means the opened screen layers cleanly
## over the board, not over the (now-dismissed) menu.
func _on_nav_pressed(id: String) -> void:
	close()
	emit_signal("navigation_requested", id)

# ── About card ────────────────────────────────────────────────────────────────

## Build the About card: a parchment-soft inset panel with the game title, tagline, and a
## one-line credits/version footer. Pure presentation — no actions.
func _build_about_card(parent: VBoxContainer) -> void:
	var about := PanelContainer.new()
	about.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var sb := StyleBoxFlat.new()
	sb.bg_color = Palette.PARCHMENT_SOFT
	sb.border_color = Palette.IRON
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(10)
	sb.set_content_margin_all(12)
	about.add_theme_stylebox_override("panel", sb)
	parent.add_child(about)

	var acol := VBoxContainer.new()
	acol.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	acol.add_theme_constant_override("separation", 4)
	about.add_child(acol)

	var heading_font: Font = UiKit.heading_font()

	var about_title := Label.new()
	about_title.text = "About"
	UiKit.set_font_size(about_title, Typography.Role.SUBHEAD)
	about_title.add_theme_color_override("font_color", COL_TITLE)
	if heading_font != null:
		about_title.add_theme_font_override("font", heading_font)
	acol.add_child(about_title)

	var name_lbl := Label.new()
	name_lbl.text = "Hearthlands — a puzzle of seasons and stews."
	UiKit.set_font_size(name_lbl, Typography.Role.LABEL)
	name_lbl.add_theme_color_override("font_color", Palette.INK)
	name_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	acol.add_child(name_lbl)

	var credits := Label.new()
	credits.text = "Godot 4.6 port · chain tiles, restore the vale, build the town."
	UiKit.set_font_size(credits, Typography.Role.META)
	credits.add_theme_color_override("font_color", Palette.INK_MID)
	credits.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	acol.add_child(credits)

# ── action handlers ───────────────────────────────────────────────────────────

## The Sound button — emit `sound_toggle_requested` and let Main own the actual mute flip + save
## + label re-sync (the single accounting point). This screen never touches the flag.
func _on_sound_pressed() -> void:
	emit_signal("sound_toggle_requested")

## The Reduce Motion button — emit `motion_toggle_requested`; Main owns the flag flip +
## UiFx apply + save + label re-sync. This screen never touches the flag.
func _on_motion_pressed() -> void:
	emit_signal("motion_toggle_requested")

## Re-sync the Reduce Motion button text from the persisted preference: "Reduce Motion: On"
## when motion is reduced (animations off), "Reduce Motion: Off" otherwise. Called by Main
## after it flips the flag, and on open/setup so a restored preference shows correctly.
func refresh_motion_label() -> void:
	if _motion_btn != null and game != null:
		_motion_btn.text = "Reduce Motion: %s" % ("On" if game.reduce_motion else "Off")

## The Text Size button — emit `text_size_cycle_requested`; Main owns the index cycle +
## Typography.scale set + save + live re-apply + label re-sync. This screen never touches
## the index itself (single accounting point — mirrors the Sound/Reduce Motion toggles).
func _on_text_size_pressed() -> void:
	emit_signal("text_size_cycle_requested")

## Re-sync the Text Size button text from the persisted index: "Text Size: Normal" /
## "Large" / "Larger" (the matching TEXT_SIZE_LABELS entry). Called by Main after it cycles
## the index, and on open/setup so a restored preference shows correctly.
func refresh_text_size_label() -> void:
	if _text_size_btn != null and game != null:
		_text_size_btn.text = "Text Size: %s" % Typography.TEXT_SIZE_LABELS[game.text_size_index]

## The Fullscreen button — flip the OS window between windowed + fullscreen via DisplayServer.
## A display-only preference (no game state, nothing persisted), so the screen owns it directly.
## DisplayServer is null-safe headless; the label still re-syncs from the (windowed) mode.
func _on_fullscreen_pressed() -> void:
	_fullscreen = not _fullscreen
	if _fullscreen:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
	else:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
	refresh_fullscreen_label()

## Re-sync the Fullscreen button text from the live window mode: "Exit Fullscreen" when the
## window is fullscreen/exclusive, "Go Fullscreen" otherwise.
func refresh_fullscreen_label() -> void:
	var mode := DisplayServer.window_get_mode()
	_fullscreen = (mode == DisplayServer.WINDOW_MODE_FULLSCREEN
		or mode == DisplayServer.WINDOW_MODE_EXCLUSIVE_FULLSCREEN)
	if _fullscreen_btn != null:
		_fullscreen_btn.text = "Exit Fullscreen" if _fullscreen else "Go Fullscreen"

## Show Tutorial — close the menu + emit navigation_requested("tutorial"); Main re-opens the
## tutorial via apply_deeplink("tutorial") (the replay path).
func _on_show_tutorial_pressed() -> void:
	close()
	emit_signal("navigation_requested", "tutorial")

## New Game — emit `new_game_requested`; Main wipes the save + restarts the run.
func _on_new_game_pressed() -> void:
	emit_signal("new_game_requested")

# ── helpers ───────────────────────────────────────────────────────────────────
# Note: heading_font(), btn_box(), style_button() have moved to UiKit (M5a).
# MenuScreen calls UiKit.style_button(..., 8, 20) to preserve its original
# padding_v=8 and font_size=20 (slightly different from TownScreen's variant).
