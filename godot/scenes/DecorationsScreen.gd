extends CanvasLayer
## Decorations — the build-decorations screen, ported from the React decorations feature
## (src/features/decorations/index.tsx). A parchment modal over a warm scrim that renders
## the DecorationConfig catalog as a list of cards. Each card shows the decoration name, its
## cost chips (coins ◉ + each resource amount), the Influence grant ("+N ✨"), a built-count
## badge ("×N") when any have been built, and a Build button. The Build button is disabled
## when the player can't afford the decoration; building deducts the coins + cost items and
## grants Influence the REAL way via game.build_decoration(id), then re-renders.
##
## Modelled EXACTLY on scenes/CastleScreen.gd: `extends CanvasLayer`, a build-once static
## shell (`setup(g)` → `_build_shell()` once → `refresh()`), `open()` re-renders, a `closed`
## signal, and a close Button registered in `_action_buttons["close"]`. The same UiKit /
## Palette journal styling (parchment card, iron border, drop shadow, a Cinzel title via
## UiKit.heading_font(), an Influence header line, row chips, and per-card Build buttons).
##
## NO class_name on purpose — Main preloads this script
## (preload("res://scenes/DecorationsScreen.gd")) so the port never needs an --import pass
## to register a new global (mirrors CastleScreen / AchievementsScreen / RecipeWikiScreen).
##
## REAL DATA + REAL MUTATION. The catalog comes from DecorationConfig.all(); the built count,
## the current Influence, and the affordability gate come straight from GameState
## (decoration_count + influence + can_afford_decoration). The Build buttons call the real
## game.build_decoration(id) (which deducts coins + cost items from the shared inventory and
## adds the influence grant) then refresh(). Nothing is faked.
##
## Headless-test contract. The close Button lives in `_action_buttons` under the stable key
## "close" (emits `closed`); each decoration's Build button lives in `_build_buttons[id]`;
## the rendered card per decoration is tracked in `_cards`. The header Influence Label is
## `_header_label`.

var game: GameState

signal closed

## action id → Button, for headless tests. Currently just "close".
var _action_buttons: Dictionary = {}

## decoration_id:String → its Build Button, rebuilt each refresh(). Lets a test drive a
## build path (and assert the disabled state).
var _build_buttons: Dictionary = {}

## Static shell, built once in setup(); the body VBox is cleared + repopulated each
## refresh() so reopening always reflects the current coins / inventory / influence state.
var _body: VBoxContainer
## The decoration list scroll — a full-bleed VIEW page: it expands (SIZE_EXPAND_FILL) to
## fill the page height between the persistent top bar + bottom nav, so the list scrolls
## within the page rather than the card being content-sized + centred.
var _scroll: ScrollContainer
var _built: bool = false

## Header label (current Influence), rebuilt each refresh().
var _header_label: Label

## decoration_id:String → the rendered card PanelContainer, rebuilt each refresh(). Lets a
## test fetch a specific card.
var _cards: Dictionary = {}

# ── parchment palette (matches CastleScreen / AchievementsScreen tokens) ──────────
const COL_TITLE  := Palette.INK
const COL_HEADER := Palette.EMBER
const COL_BODY   := Palette.INK
const COL_MUTED  := Palette.INK_MID
const COL_VALUE  := Palette.GOLD
const COL_PANEL  := Palette.PARCHMENT
## Influence accent — a violet/plum that reads as the "✨ Influence" currency (matches the
## React text-[#7a3a8a] grant color).
const COL_INFLUENCE := Color8(0x7a, 0x3a, 0x8a)
const PANEL_MAX_WIDTH := 560.0

# ── lifecycle ─────────────────────────────────────────────────────────────────

## Store `game`, build the static shell ONCE, then render. Safe to call again
## (the shell is only built the first time).
func setup(g: GameState) -> void:
	game = g
	if not _built:
		_build_shell()
		_built = true
	refresh()

func open() -> void:
	visible = true
	refresh()

func close() -> void:
	visible = false
	emit_signal("closed")

# ── static shell ──────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 4                                   # modal, above the HUD (layer 1)
	visible = false

	# Opaque VIEW background (not a dim modal scrim). B2 promotes this menu sub-page to a
	# full-brightness VIEW: it paints the warm app-frame parchment over the board (no longer
	# dimmed behind), reserving UiKit.TOPBAR_RESERVE at the TOP so the persistent layer-1 HUD
	# top bar shows ABOVE the view, and stopping UiKit.NAV_RESERVE short of the bottom so the
	# persistent nav bar (a LOWER CanvasLayer) shows through + stays tappable; MOUSE_FILTER_STOP
	# eats clicks in the band it covers.
	var backdrop := ColorRect.new()
	backdrop.color = Palette.FRAME_BG
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.offset_top = UiKit.TOPBAR_RESERVE   # reveal the persistent HUD top bar above
	backdrop.offset_bottom = -UiKit.NAV_RESERVE  # leave the bottom nav strip unpainted
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	# Full-bleed view content: a full-rect Control holds a panel pinned edge-to-edge (no card
	# margins), reserving the top-bar band + bottom-nav strip; a width-cap MarginContainer keeps
	# line length tidy on wide viewports.
	var center := Control.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_FULL_RECT)
	# Full-bleed: no L/R card margins; the backdrop already reserves the top band so only a
	# small inner pad is needed at the top; the bottom clears the persistent nav strip.
	panel.offset_left = 0
	panel.offset_right = 0
	panel.offset_top = UiKit.TOPBAR_RESERVE + 8
	panel.offset_bottom = -UiKit.NAV_RESERVE
	# Flat page fill (NOT a floating card) — parchment, no corner radius, no border, no drop
	# shadow, so it reads as a full-brightness page under the persistent top bar. This menu
	# sub-page KEEPS its visible "✖ Close" (the legitimate back-to-board affordance).
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL                   # Palette.PARCHMENT
	style.set_content_margin_all(20)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	# Keep the panel from sprawling on wide viewports.
	var width_cap := MarginContainer.new()
	width_cap.custom_minimum_size = Vector2(PANEL_MAX_WIDTH, 0)
	panel.add_child(width_cap)

	# A non-scrolling column: title row + Influence header pinned at the top, then a
	# ScrollContainer that owns the decoration list. Fills the full-bleed page height so the
	# scroll below expands into it (no empty void beneath a short decoration list).
	var root_vbox := VBoxContainer.new()
	root_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_theme_constant_override("separation", 10)
	width_cap.add_child(root_vbox)

	# Title row: "🌷 Decorations" heading + right-aligned "✖ Close" button.
	var title_row := HBoxContainer.new()
	title_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(title_row)

	var title := Label.new()
	title.text = "🌷 Decorations"
	title.add_theme_font_size_override("font_size", 30)
	title.add_theme_color_override("font_color", COL_TITLE)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		title.add_theme_font_override("font", heading_font)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_row.add_child(title)

	var close_btn := Button.new()
	close_btn.text = "✖ Close"
	close_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_button(close_btn, Palette.EMBER, 6, 20)
	close_btn.connect("pressed", Callable(self, "close"))
	title_row.add_child(close_btn)
	_action_buttons["close"] = close_btn

	# Header line — "✨ N Influence" (the violet currency line), rebuilt each refresh().
	_header_label = Label.new()
	_header_label.text = ""
	_header_label.add_theme_font_size_override("font_size", 18)
	_header_label.add_theme_color_override("font_color", COL_INFLUENCE)
	_header_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root_vbox.add_child(_header_label)

	_scroll = UiKit.make_vscroll()
	_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	# Full-bleed view: the scroll takes the spare page height (no content-clamp / float-card
	# sizing) so the decoration list fills the page and scrolls when it overflows.
	_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(_scroll)

	# The dynamic body — every decoration card hangs off this and is cleared + rebuilt
	# each refresh().
	_body = VBoxContainer.new()
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation", 12)
	_scroll.add_child(_body)

# ── render ────────────────────────────────────────────────────────────────────

## Clear the body and repopulate it from DecorationConfig.all(): the Influence header
## line, then one card per decoration in stable order. Every decoration gets exactly one
## card (tracked in `_cards`); its Build button is tracked in `_build_buttons`.
func refresh() -> void:
	if not _built or game == null:
		return
	for child in _body.get_children():
		_body.remove_child(child)
		child.queue_free()
	_cards.clear()
	_build_buttons.clear()

	_header_label.text = "✨ %d Influence" % game.influence

	for entry in DecorationConfig.all():
		var card := _make_decoration_card(entry as Dictionary)
		_body.add_child(card)
		_cards[String((entry as Dictionary).get("id", ""))] = card

## A single decoration card: a soft-parchment chip holding a top line (name + ×count badge),
## a row of cost chips (coins ◉ + each resource amount), then a bottom line with the
## "+N ✨" influence grant and a Build button. Build is disabled when unaffordable.
func _make_decoration_card(entry: Dictionary) -> PanelContainer:
	var id: String = String(entry.get("id", ""))
	var name_str: String = String(entry.get("name", id))
	var cost: Dictionary = entry.get("cost", {})
	var grant: int = int(entry.get("influence", 0))
	var count: int = game.decoration_count(id)
	var affordable: bool = game.can_afford_decoration(id)

	var chip := PanelContainer.new()
	chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	chip.add_theme_stylebox_override("panel", UiKit.row_box())

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 5)
	chip.add_child(col)

	# ── top line: name (expands) + ×count badge ─────────────────────────────────
	var top := HBoxContainer.new()
	top.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_theme_constant_override("separation", 8)
	col.add_child(top)

	var name_lbl := Label.new()
	name_lbl.text = name_str
	name_lbl.add_theme_font_size_override("font_size", 20)
	name_lbl.add_theme_color_override("font_color", COL_HEADER)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		name_lbl.add_theme_font_override("font", heading_font)
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(name_lbl)

	# Built-count badge ("×N") — only when at least one has been built.
	if count > 0:
		var count_lbl := Label.new()
		count_lbl.text = "×%d" % count
		count_lbl.add_theme_font_size_override("font_size", 15)
		count_lbl.add_theme_color_override("font_color", COL_MUTED)
		count_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		count_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		top.add_child(count_lbl)

	# ── cost chips: coins ◉ + each resource amount ───────────────────────────────
	# Coins first (the special key), then each resource cost in the dict's key order.
	var chips := HBoxContainer.new()
	chips.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	chips.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chips.add_theme_constant_override("separation", 6)
	col.add_child(chips)

	if int(cost.get("coins", 0)) > 0:
		chips.add_child(UiKit.make_pill("%d ◉" % int(cost["coins"]), COL_VALUE))
	for k in cost.keys():
		if String(k) == "coins":
			continue
		chips.add_child(UiKit.make_pill("%d %s" % [int(cost[k]), String(k)], COL_BODY))

	# ── bottom line: "+N ✨" influence grant + Build button ──────────────────────
	var bottom := HBoxContainer.new()
	bottom.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bottom.add_theme_constant_override("separation", 8)
	col.add_child(bottom)

	var grant_lbl := Label.new()
	grant_lbl.text = "+%d ✨" % grant
	grant_lbl.add_theme_font_size_override("font_size", 15)
	grant_lbl.add_theme_color_override("font_color", COL_INFLUENCE)
	grant_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grant_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bottom.add_child(grant_lbl)

	# "Build" — disabled when the player can't afford the coins + cost items.
	var build_btn := Button.new()
	build_btn.text = "Build"
	build_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_action_button(build_btn, Palette.GO_GREEN, 6, 15)
	build_btn.disabled = not affordable
	build_btn.connect("pressed", Callable(self, "_on_build").bind(id))
	bottom.add_child(build_btn)

	_build_buttons[id] = build_btn
	return chip

## A Build button was pressed: build `id` the REAL way (deducts coins + cost items from
## inventory + grants Influence, all clamped/guarded in GameState), then re-render so the
## Influence header, ×count badge, and button states reflect the spend immediately.
func _on_build(id: String) -> void:
	if game == null:
		return
	game.build_decoration(id)
	refresh()

# ── pure helpers (usable + testable without rendering) ─────────────────────────

## Total decorations in the catalog.
func total_count() -> int:
	return DecorationConfig.all().size()
