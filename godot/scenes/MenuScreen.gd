class_name MenuScreen
extends CanvasLayer
## M4f — the settings / menu modal. A small parchment modal, built ENTIRELY in code
## (like Main's HUD + TownScreen — no .tscn editing), opened from the HUD "☰" button.
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
## mute flip or the save: the Sound button emits `toggle_sound` and Main does the actual
## `game.audio_muted` flip + `Audio.set_muted` + save (one accounting point), then calls
## back `refresh_sound_label()` so the button text re-syncs. New Game emits `new_game`;
## Main owns clearing the save + restarting.
##
## Headless-test contract. Every actionable button is registered in `_action_buttons`
## under a stable string key ("toggle_sound" / "new_game" / "close") so the UI-wiring
## test can find + `pressed.emit()` it and assert the right signal fired — no rendering
## required (CanvasLayer + Control + Button instantiate + emit fine headless).

var game: GameState
var _muted: bool = false

signal closed
## Emitted when the Sound button is pressed — Main flips game.audio_muted, mutes the
## Audio service, saves, and calls back refresh_sound_label() (this screen never flips
## the flag itself, so the toggle is booked in ONE place — mirrors TownScreen.shoo_rats).
signal toggle_sound
## Emitted when New Game is pressed — Main wipes the save + restarts the run.
signal new_game

## action id → Button, for headless tests. Keys: "toggle_sound", "new_game", "close".
var _action_buttons: Dictionary = {}

## Static shell, built once in setup().
var _sound_btn: Button
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

func open() -> void:
	visible = true
	refresh_sound_label()

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
	var backdrop := ColorRect.new()
	backdrop.color = Color(0.17, 0.13, 0.08, 0.66)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
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
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL                   # Palette.PARCHMENT
	style.set_corner_radius_all(16)
	style.set_content_margin_all(24)
	style.border_color = Palette.IRON
	style.set_border_width_all(2)
	style.shadow_size = 12
	style.shadow_color = Color(0, 0, 0, 0.28)
	style.shadow_offset = Vector2(0, 5)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 16)
	panel.add_child(col)

	# Title — "☰ Menu" in the Cinzel display serif (parity with Main's headings).
	var title := Label.new()
	title.text = "☰ Menu"
	title.add_theme_font_size_override("font_size", 30)
	title.add_theme_color_override("font_color", COL_TITLE)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		title.add_theme_font_override("font", heading_font)
	col.add_child(title)

	# Sound — toggles the SFX mute. Emits `toggle_sound`; Main flips the flag + saves.
	_sound_btn = Button.new()
	_sound_btn.text = "Sound: On"
	_sound_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_button(_sound_btn, Palette.MOSS, 8, 20)
	_sound_btn.connect("pressed", Callable(self, "_on_sound_pressed"))
	col.add_child(_sound_btn)
	_action_buttons["toggle_sound"] = _sound_btn

	# New Game — wipes the save + restarts. Danger accent (destructive).
	var new_btn := Button.new()
	new_btn.text = "New Game"
	new_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_button(new_btn, COL_DANGER, 8, 20)
	new_btn.connect("pressed", Callable(self, "_on_new_game_pressed"))
	col.add_child(new_btn)
	_action_buttons["new_game"] = new_btn

	# Close — dismiss the modal.
	var close_btn := Button.new()
	close_btn.text = "Close"
	close_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_button(close_btn, Palette.EMBER, 8, 20)
	close_btn.connect("pressed", Callable(self, "close"))
	col.add_child(close_btn)
	_action_buttons["close"] = close_btn

# ── action handlers ───────────────────────────────────────────────────────────

## The Sound button — emit `toggle_sound` and let Main own the actual mute flip + save
## + label re-sync (the single accounting point). This screen never touches the flag.
func _on_sound_pressed() -> void:
	emit_signal("toggle_sound")

## New Game — emit `new_game`; Main wipes the save + restarts the run.
func _on_new_game_pressed() -> void:
	emit_signal("new_game")

# ── helpers ───────────────────────────────────────────────────────────────────
# Note: heading_font(), btn_box(), style_button() have moved to UiKit (M5a).
# MenuScreen calls UiKit.style_button(..., 8, 20) to preserve its original
# padding_v=8 and font_size=20 (slightly different from TownScreen's variant).
