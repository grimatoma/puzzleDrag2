extends CanvasLayer
## ✨ Boons — the boon-catalog screen, ported from the React boons feature
## (src/features/boons). A full-bleed parchment VIEW with a currency header
## ("✨ Embers: N · ⬡ Core Ingots: N") and the six boon catalogs grouped by PATH:
##
##   COEXIST boons (bought with Embers)   — farm_coexist / mine_coexist / harbor_coexist
##   DRIVE OUT boons (bought with Core Ingots) — farm_driveout / mine_driveout / harbor_driveout
##
## Each boon card shows its name, description, a cost chip (Embers or Core Ingots), the effect,
## and a "Claim" button. Claim is GATED on game.can_purchase_boon(id) — unlocked (its path flag
## is set by ANY resolved keeper, kingdom-wide) AND affordable AND not already owned. An owned
## boon shows a "✓ Owned" badge; a locked boon (no keeper of that path resolved yet) shows a
## muted "🔒 Locked" hint instead of Claim. Claiming calls the REAL game.purchase_boon(id)
## (deducts the cost + marks owned) then re-renders.
##
## Modelled EXACTLY on scenes/PortalScreen.gd (the closest analogue: a currency header + cards
## with cost chips + action buttons): `extends CanvasLayer`, a build-once static shell
## (`setup(g)` → `_build_shell()` once → `refresh()`), `open()` re-renders, a `closed` signal,
## and a close Button registered in `_action_buttons["close"]`. Same UiKit / Palette journal
## styling (full-bleed parchment page under the persistent HUD top bar + nav strip).
##
## NO class_name on purpose — Main preloads this script
## (preload("res://scenes/BoonsScreen.gd")) so the port never needs an --import pass to
## register a new global (mirrors PortalScreen / DecorationsScreen / CastleScreen).
##
## REAL DATA + REAL MUTATION. The catalogs come from BoonConfig; the unlocked / affordable /
## owned gates + the balances come straight from GameState (embers + core_ingots + boons +
## boon_unlocked + can_purchase_boon). The Claim buttons call the real game.purchase_boon(id)
## then refresh(). Nothing is faked.
##
## Headless-test contract. The close Button lives in `_action_buttons` under the stable key
## "close" (emits `closed`). Each boon's Claim button lives in `_claim_buttons[id]` and its
## rendered card in `_cards[id]`. The header balance Label is `_header_label`.

var game: GameState

signal closed

## action id → Button, for headless tests. Always has "close".
var _action_buttons: Dictionary = {}

## boon_id:String → its Claim Button, rebuilt each refresh() (absent for owned / locked boons,
## which show a badge/hint instead). Lets a test drive a purchase path (+ assert the disabled state).
var _claim_buttons: Dictionary = {}

## boon_id:String → the rendered card PanelContainer, rebuilt each refresh(). Lets a test fetch a
## specific card.
var _cards: Dictionary = {}

## Static shell, built once in setup(); the body VBox is cleared + repopulated each refresh().
var _body: VBoxContainer
var _scroll: ScrollContainer
var _built: bool = false

## Header balance label (Embers · Core Ingots), rebuilt each refresh().
var _header_label: Label

# ── parchment palette (matches PortalScreen / DecorationsScreen tokens) ───────────
const COL_TITLE  := Palette.INK
const COL_BODY   := Palette.INK
const COL_MUTED  := Palette.INK_MID
const COL_PANEL  := Palette.PARCHMENT
## Embers — a warm ember/amber currency tone (matches the ✨/Coexist warmth).
const COL_EMBERS := Palette.EMBER
## Core Ingots — a cool iron/steel tone (the Drive Out / forged currency).
const COL_INGOTS := Color8(0x52, 0x6a, 0x88)
const PANEL_MAX_WIDTH := 560.0

# ── lifecycle ─────────────────────────────────────────────────────────────────

## Store `game`, build the static shell ONCE, then render. Safe to call again.
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

	# Opaque VIEW background (a full-brightness page, NOT a dim modal scrim) — mirrors
	# PortalScreen. Reserves the top-bar band + bottom-nav strip so the persistent chrome shows.
	var backdrop := ColorRect.new()
	backdrop.color = Palette.FRAME_BG
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.offset_top = UiKit.TOPBAR_RESERVE
	backdrop.offset_bottom = -UiKit.NAV_RESERVE
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	var center := Control.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_FULL_RECT)
	panel.offset_left = 0
	panel.offset_right = 0
	panel.offset_top = UiKit.TOPBAR_RESERVE + 8
	panel.offset_bottom = -UiKit.NAV_RESERVE
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL
	style.set_content_margin_all(20)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	var width_cap := UiKit.make_width_cap()
	panel.add_child(width_cap)

	var root_vbox := VBoxContainer.new()
	root_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_theme_constant_override("separation", 10)
	width_cap.add_child(root_vbox)

	# Title row: "✨ Boons" heading + right-aligned "✖ Close".
	var title_row := HBoxContainer.new()
	title_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(title_row)

	var title := Label.new()
	title.text = "✨ Boons"
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

	# Currency header — "✨ Embers: N · ⬡ Core Ingots: N", rebuilt each refresh().
	_header_label = Label.new()
	_header_label.text = ""
	_header_label.add_theme_font_size_override("font_size", 18)
	_header_label.add_theme_color_override("font_color", COL_EMBERS)
	_header_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root_vbox.add_child(_header_label)

	var scroll := UiKit.make_vscroll()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(scroll)
	_scroll = scroll

	_body = VBoxContainer.new()
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation", 12)
	scroll.add_child(_body)

# ── render ────────────────────────────────────────────────────────────────────

## Clear the body and repopulate from the live GameState: the currency header + the six
## catalogs grouped by path (Coexist first, then Drive Out). Each catalog renders a small
## sub-heading + one card per boon.
func refresh() -> void:
	if not _built or game == null:
		return
	for child in _body.get_children():
		_body.remove_child(child)
		child.queue_free()
	_cards.clear()
	_claim_buttons.clear()

	# Header: the two keeper currencies.
	_header_label.text = "✨ Embers: %d    ⬡ Core Ingots: %d" % [game.embers, game.core_ingots]

	# A short empty-state line when NO keeper path is unlocked yet — so the screen explains
	# itself before the player has met a keeper (boons are all locked until then).
	var any_unlocked := false
	for entry in BoonConfig.all_boons():
		if game.boon_unlocked(String((entry as Dictionary).get("id", ""))):
			any_unlocked = true
			break
	if not any_unlocked:
		var hint := Label.new()
		hint.text = "Build up a settlement to meet its keeper. Choose to Coexist or Drive Out — then spend the Embers or Core Ingots you earn on the boons below."
		hint.add_theme_font_size_override("font_size", 14)
		hint.add_theme_color_override("font_color", COL_MUTED)
		hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		hint.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_body.add_child(hint)

	# Group the six catalogs by PATH so Coexist (Embers) boons read together, then Drive Out
	# (Core Ingots) — matching how the currencies split (React groups by catalog key, which is
	# <type>_<path>; the port surfaces the same set, ordered by path then type).
	_render_path_group("coexist", "Coexist · ✨ Embers", COL_EMBERS)
	_render_path_group("driveout", "Drive Out · ⬡ Core Ingots", COL_INGOTS)

## Render every catalog whose path == `path` under a section heading, in catalog order.
func _render_path_group(path: String, heading_text: String, accent: Color) -> void:
	var heading := Label.new()
	heading.text = heading_text
	heading.add_theme_font_size_override("font_size", 20)
	heading.add_theme_color_override("font_color", accent)
	var hf: Font = UiKit.heading_font()
	if hf != null:
		heading.add_theme_font_override("font", hf)
	heading.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_body.add_child(heading)

	for ck in BoonConfig.CATALOG_KEYS:
		if BoonConfig.path_of_catalog(String(ck)) != path:
			continue
		for entry in BoonConfig.catalog(String(ck)):
			var card := _make_boon_card(entry as Dictionary)
			_body.add_child(card)
			_cards[String((entry as Dictionary).get("id", ""))] = card

## A single boon card: name + description + cost chip + effect + a Claim button (or an
## "✓ Owned" / "🔒 Locked" badge). Claim is disabled when the player can't purchase right now.
func _make_boon_card(entry: Dictionary) -> PanelContainer:
	var id: String = String(entry.get("id", ""))
	var name_str: String = String(entry.get("name", id))
	var desc_str: String = String(entry.get("desc", ""))
	var cost: Dictionary = entry.get("cost", {})
	var owned: bool = game.has_boon(id)
	var unlocked: bool = game.boon_unlocked(id)
	var purchasable: bool = game.can_purchase_boon(id)

	# Cost chip text + accent (Embers or Core Ingots).
	var cost_text: String = ""
	var cost_accent: Color = COL_EMBERS
	if int(cost.get("embers", 0)) > 0:
		cost_text = "✨ %d Embers" % int(cost.get("embers", 0))
		cost_accent = COL_EMBERS
	elif int(cost.get("core_ingots", 0)) > 0:
		cost_text = "⬡ %d Core Ingots" % int(cost.get("core_ingots", 0))
		cost_accent = COL_INGOTS

	var chip := PanelContainer.new()
	chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	chip.add_theme_stylebox_override("panel", UiKit.row_box())

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 5)
	chip.add_child(col)

	# ── top line: name (expands) + cost chip ─────────────────────────────────────
	var top := HBoxContainer.new()
	top.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_theme_constant_override("separation", 8)
	col.add_child(top)

	var name_lbl := Label.new()
	name_lbl.text = name_str
	name_lbl.add_theme_font_size_override("font_size", 19)
	name_lbl.add_theme_color_override("font_color", COL_BODY if (unlocked or owned) else COL_MUTED)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		name_lbl.add_theme_font_override("font", heading_font)
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(name_lbl)

	if cost_text != "":
		top.add_child(UiKit.make_pill(cost_text, cost_accent))

	# ── description / effect text ────────────────────────────────────────────────
	var desc_lbl := Label.new()
	desc_lbl.text = desc_str
	desc_lbl.add_theme_font_size_override("font_size", 13)
	desc_lbl.add_theme_color_override("font_color", COL_MUTED)
	desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	desc_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(desc_lbl)

	# ── bottom line: Claim button OR an Owned / Locked badge ──────────────────────
	var bottom := HBoxContainer.new()
	bottom.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bottom.add_theme_constant_override("separation", 8)
	col.add_child(bottom)

	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bottom.add_child(spacer)

	if owned:
		var owned_lbl := Label.new()
		owned_lbl.text = "✓ Owned"
		owned_lbl.add_theme_font_size_override("font_size", 15)
		owned_lbl.add_theme_color_override("font_color", Palette.MOSS)
		owned_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		bottom.add_child(owned_lbl)
	elif not unlocked:
		var lock_lbl := Label.new()
		lock_lbl.text = "🔒 Locked"
		lock_lbl.add_theme_font_size_override("font_size", 15)
		lock_lbl.add_theme_color_override("font_color", COL_MUTED)
		lock_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		bottom.add_child(lock_lbl)
	else:
		# Unlocked + not owned → a Claim button, disabled when unaffordable.
		var claim_btn := Button.new()
		claim_btn.text = "Claim"
		claim_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
		UiKit.style_action_button(claim_btn, Palette.GO_GREEN, 6, 15)
		claim_btn.disabled = not purchasable
		claim_btn.connect("pressed", Callable(self, "_on_claim").bind(id))
		bottom.add_child(claim_btn)
		_claim_buttons[id] = claim_btn

	return chip

## A Claim button was pressed: purchase `id` the REAL way (deducts the cost, marks owned), then
## re-render so the header balance + the card's Owned badge reflect the spend immediately. The
## parent's close handler persists the save.
func _on_claim(id: String) -> void:
	if game == null:
		return
	game.purchase_boon(id)
	refresh()

# ── pure helpers (usable + testable without rendering) ─────────────────────────

## Total boons in the catalog.
func total_count() -> int:
	return BoonConfig.count()
