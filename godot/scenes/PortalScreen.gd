extends CanvasLayer
## Magic Portal — the summon screen, ported from the React portal feature
## (src/features/portal/index.tsx). A parchment modal over a warm scrim with TWO states:
##
##   NOT BUILT (game.portal_built == false): an empty-state line + a "Build Portal" button
##     showing the one-time cost (2000 ◉ · 5 runes), disabled unless game.can_build_portal().
##     Building calls the REAL game.build_portal() (deducts coins + runes, sets the flag),
##     then re-renders into the summon state.
##
##   BUILT (game.portal_built == true): a "✨ Influence: N" header + one card per magic tool
##     (PortalConfig.all()): the tool name, its effect text, a "×count" badge (game.tool_count),
##     and a "Summon (cost✨)" button disabled when game.influence < cost. Summoning calls the
##     REAL game.summon_magic_tool(id) (deducts influence, +1 to the tools dict), then re-renders.
##
## NO "Use/Activate" button — the magic-tool EFFECTS route through the global tool-power system
## (M8) and are not ported here, so a Use button would be a dead/fake control. OMITTED on
## purpose (see PortalConfig's scope note).
##
## Modelled EXACTLY on scenes/DecorationsScreen.gd (the closest analogue: a currency header +
## cards with cost chips + action buttons): `extends CanvasLayer`, a build-once static shell
## (`setup(g)` → `_build_shell()` once → `refresh()`), `open()` re-renders, a `closed` signal,
## and a close Button registered in `_action_buttons["close"]`. Same UiKit / Palette journal
## styling (parchment card, iron border, drop shadow, a Cinzel title via UiKit.heading_font(),
## an Influence header line, pills, and per-card buttons).
##
## NO class_name on purpose — Main preloads this script
## (preload("res://scenes/PortalScreen.gd")) so the port never needs an --import pass to
## register a new global (mirrors DecorationsScreen / CastleScreen / RecipeWikiScreen).
##
## REAL DATA + REAL MUTATION. The catalog comes from PortalConfig.all(); the build flag, the
## current Influence, the per-tool owned count, and the affordability gates come straight from
## GameState (portal_built + influence + tool_count + can_build_portal + can_summon_magic_tool).
## The buttons call the real game.build_portal() / game.summon_magic_tool(id) then refresh().
## Nothing is faked.
##
## Headless-test contract. The close Button lives in `_action_buttons` under the stable key
## "close" (emits `closed`). When NOT built, the Build button lives in `_action_buttons["build"]`.
## When BUILT, each tool's Summon button lives in `_summon_buttons[id]` and its rendered card in
## `_cards[id]`. The header Influence Label is `_header_label` (only present when built).

var game: GameState

signal closed

## action id → Button, for headless tests. Always has "close"; has "build" while NOT built.
var _action_buttons: Dictionary = {}

## magic_tool_id:String → its Summon Button, rebuilt each refresh() (only while built). Lets a
## test drive a summon path (and assert the disabled state).
var _summon_buttons: Dictionary = {}

## magic_tool_id:String → the rendered card PanelContainer, rebuilt each refresh() (only while
## built). Lets a test fetch a specific card.
var _cards: Dictionary = {}

## Static shell, built once in setup(); the body VBox is cleared + repopulated each refresh()
## so reopening always reflects the current portal_built / influence / tools state.
var _body: VBoxContainer
## The body scroll — expands to fill the full-bleed page height (SIZE_EXPAND_FILL, the B2
## view pattern) so the body fills the view between the top bar and the bottom nav and
## scrolls when it overflows.
var _scroll: ScrollContainer
var _built: bool = false

## Header label (current Influence), rebuilt each refresh(). Null while NOT built (no header).
var _header_label: Label

# ── parchment palette (matches DecorationsScreen / CastleScreen tokens) ───────────
const COL_TITLE  := Palette.INK
const COL_HEADER := Palette.EMBER
const COL_BODY   := Palette.INK
const COL_MUTED  := Palette.INK_MID
const COL_VALUE  := Palette.GOLD
const COL_PANEL  := Palette.PARCHMENT
## Influence accent — a violet/plum that reads as the "✨ Influence" currency (matches the
## React arcane/violet portal palette + the DecorationsScreen influence color).
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
	var backdrop := UiKit.make_view_backdrop()
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
	var width_cap := UiKit.make_width_cap()
	panel.add_child(width_cap)

	# A non-scrolling column: title row pinned at the top, then a ScrollContainer that owns
	# the dynamic body (the build affordance OR the influence header + summon list).
	var root_vbox := VBoxContainer.new()
	root_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_theme_constant_override("separation", 10)
	width_cap.add_child(root_vbox)

	# Title row: "🌀 Magic Portal" heading + right-aligned "✖ Close" button.
	var title_row := HBoxContainer.new()
	title_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(title_row)

	var title := Label.new()
	title.text = "🌀 Magic Portal"
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

	var scroll := UiKit.make_vscroll()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(scroll)

	# The dynamic body — rebuilt entirely each refresh() (the build affordance OR the
	# influence header + summon cards).
	_body = VBoxContainer.new()
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation", 12)
	scroll.add_child(_body)

# ── render ────────────────────────────────────────────────────────────────────

## Clear the body and repopulate it from the live GameState: the BUILD affordance while the
## portal isn't built, otherwise the "✨ Influence: N" header + one card per magic tool. The
## close button persists in the title row across refreshes; only the body is rebuilt.
func refresh() -> void:
	if not _built or game == null:
		return
	for child in _body.get_children():
		_body.remove_child(child)
		child.queue_free()
	_cards.clear()
	_summon_buttons.clear()
	_action_buttons.erase("build")   # the build button only exists in the NOT-built state
	_header_label = null

	if not game.portal_built:
		_render_build_state()
	else:
		_render_summon_state()

## NOT-built state: an empty-state line + a "Build Portal" button showing the one-time
## coins + runes cost, disabled unless game.can_build_portal(). Mirrors the React empty state
## ("Build the Magic Portal in town to unlock summoning"), extended with the real build action
## (the React build happens in the Town building list; the port surfaces it here).
func _render_build_state() -> void:
	var msg := Label.new()
	msg.text = "Build the Magic Portal to unlock summoning."
	msg.add_theme_font_size_override("font_size", 16)
	msg.add_theme_color_override("font_color", COL_MUTED)
	msg.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	msg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_body.add_child(msg)

	# A parchment chip holding the cost chips + the Build button.
	var chip := PanelContainer.new()
	chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	chip.add_theme_stylebox_override("panel", UiKit.row_box())
	_body.add_child(chip)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 6)
	chip.add_child(col)

	var cost_lbl := Label.new()
	cost_lbl.text = "Cost"
	cost_lbl.add_theme_font_size_override("font_size", 14)
	cost_lbl.add_theme_color_override("font_color", COL_BODY)
	cost_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(cost_lbl)

	# Cost chips: coins ◉ + runes 🪄.
	var chips := HBoxContainer.new()
	chips.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	chips.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chips.add_theme_constant_override("separation", 6)
	col.add_child(chips)
	chips.add_child(UiKit.make_pill("%d ◉" % PortalConfig.BUILD_COST_COINS, COL_VALUE))
	chips.add_child(UiKit.make_pill("%d runes" % PortalConfig.BUILD_COST_RUNES, COL_INFLUENCE))

	var bottom := HBoxContainer.new()
	bottom.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bottom.add_theme_constant_override("separation", 8)
	col.add_child(bottom)

	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bottom.add_child(spacer)

	var build_btn := Button.new()
	build_btn.text = "Build Portal"
	build_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_action_button(build_btn, Palette.GO_GREEN, 6, 15)
	build_btn.disabled = not game.can_build_portal()
	build_btn.connect("pressed", Callable(self, "_on_build_portal"))
	bottom.add_child(build_btn)
	_action_buttons["build"] = build_btn

## BUILT state: the "✨ Influence: N" header + one card per magic tool in catalog order.
func _render_summon_state() -> void:
	_header_label = Label.new()
	_header_label.text = "✨ Influence: %d" % game.influence
	_header_label.add_theme_font_size_override("font_size", 18)
	_header_label.add_theme_color_override("font_color", COL_INFLUENCE)
	_header_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_body.add_child(_header_label)

	for entry in PortalConfig.all():
		var card := _make_tool_card(entry as Dictionary)
		_body.add_child(card)
		_cards[String((entry as Dictionary).get("id", ""))] = card

## A single magic-tool card: a soft-parchment chip holding a top line (name + "×count" badge),
## the effect text, then a bottom line with a "Summon ({cost}✨)" button. Summon is disabled
## when the player can't afford the influence cost (or the portal isn't built — but in this
## state it always is).
func _make_tool_card(entry: Dictionary) -> PanelContainer:
	var id: String = String(entry.get("id", ""))
	var name_str: String = String(entry.get("name", id))
	var effect_str: String = String(entry.get("effect", ""))
	var cost: int = int(entry.get("influence_cost", 0))
	var count: int = game.tool_count(id)
	var affordable: bool = game.can_summon_magic_tool(id)

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

	# Owned-count badge ("×N") — only when at least one is owned.
	if count > 0:
		var count_lbl := Label.new()
		count_lbl.text = "×%d" % count
		count_lbl.add_theme_font_size_override("font_size", 15)
		count_lbl.add_theme_color_override("font_color", COL_MUTED)
		count_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		count_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		top.add_child(count_lbl)

	# ── effect text ───────────────────────────────────────────────────────────
	var effect_lbl := Label.new()
	effect_lbl.text = effect_str
	effect_lbl.add_theme_font_size_override("font_size", 13)
	effect_lbl.add_theme_color_override("font_color", COL_MUTED)
	effect_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	effect_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(effect_lbl)

	# ── bottom line: a "Summon ({cost}✨)" button (right-aligned) ────────────────
	var bottom := HBoxContainer.new()
	bottom.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bottom.add_theme_constant_override("separation", 8)
	col.add_child(bottom)

	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bottom.add_child(spacer)

	# "Summon (N✨)" — disabled when the player can't afford the influence cost.
	var summon_btn := Button.new()
	summon_btn.text = "Summon (%d✨)" % cost
	summon_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_button(summon_btn, COL_INFLUENCE, 6, 15, true)
	summon_btn.disabled = not affordable
	summon_btn.connect("pressed", Callable(self, "_on_summon").bind(id))
	bottom.add_child(summon_btn)

	_summon_buttons[id] = summon_btn
	return chip

## The Build button was pressed: build the portal the REAL way (deducts coins + runes,
## sets portal_built), then re-render so the screen flips into the summon state. The parent's
## close handler persists the save.
func _on_build_portal() -> void:
	if game == null:
		return
	game.build_portal()
	refresh()

## A Summon button was pressed: summon `id` the REAL way (deducts influence, +1 to the tools
## dict), then re-render so the Influence header + ×count badge + button states reflect the
## spend immediately. The parent's close handler persists the save.
func _on_summon(id: String) -> void:
	if game == null:
		return
	game.summon_magic_tool(id)
	refresh()

# ── pure helpers (usable + testable without rendering) ─────────────────────────

## Total magic tools in the catalog.
func total_count() -> int:
	return PortalConfig.count()
