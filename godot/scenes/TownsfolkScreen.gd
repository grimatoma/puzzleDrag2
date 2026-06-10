extends CanvasLayer
## Townsfolk roster screen — a parchment modal over a warm scrim showing every NPC in
## the roster with their bond bar and tier label. Modelled EXACTLY on AchievementsScreen:
## `extends CanvasLayer`, `setup(g)`/`open()`/`refresh()`, `signal closed`, `_action_buttons["close"]`,
## parchment card + scrim, Cinzel title, scroll list of cards, UiKit/Palette.
##
## NO class_name on purpose — Main preloads this script so the port never needs an
## --import pass to register a new global.
##
## TABS (T20): Bonds (the NPC relationship roster — avatars + bond bars + a GIFT control),
## Workers (the HIRE-by-type system — Farmer/Lumberjack/Miner/Baker cards with Hire/Fire),
## and Quests (the active quest board). NPCs (bonds/gifts) and hired Workers are DISTINCT
## concepts on DISTINCT tabs — the React structure. The Bonds tab gifts and the Workers tab
## hires both mutate GameState and emit `state_changed` so Main persists + refreshes the HUD.
##
## REAL DATA: the roster comes from game.npcs.roster (in NpcConfig.all_ids() order);
## names/roles/colors + gift preferences from NpcConfig; bond floats from game.npc_bond(id);
## worker counts/costs from game/WorkerConfig; gifts/hires go through GameState. Nothing faked.
##
## Headless-test contract:
##   _action_buttons["close"] — the close Button (emits `closed` signal)
##   _cards: Dictionary        — id:String → the rendered PanelContainer card, rebuilt each refresh()
##   npc_count()               — how many cards were rendered in the last refresh()

var game: GameState

signal closed
## Emitted after a mutation on this screen (a gift given, a worker hired/fired) so Main can
## persist the save + refresh the HUD totals (wired to _on_town_changed, the shared town-action
## funnel). The screen itself re-renders in-place after the mutation.
signal state_changed

## action id → Button, for headless tests. Currently just "close".
var _action_buttons: Dictionary = {}

## Static shell, built once in setup(); the body VBox is cleared + repopulated each
## refresh() so reopening always reflects the latest bond state.
var _body: VBoxContainer
## The roster scroll — its height is clamped to its content (up to the viewport) via
## UiKit.fit_scroll_height so a short list yields a short centred card with no empty
## parchment "dead space" beneath it.
var _scroll: ScrollContainer
var _built: bool = false

## The header "N townsfolk" line, rebuilt each refresh().
var _header_label: Label

## id:String → rendered PanelContainer card, rebuilt each refresh(). Lets tests fetch a
## specific card (e.g. assert the name label or bond band text). On the BONDS tab this
## holds the NPC roster cards (the view-test contract); the Workers tab holds the hire
## cards keyed by worker id; the Quests tab uses its own nodes.
var _cards: Dictionary = {}

## Current tab (T20 restructure):
##   "bonds"   — the named NPC roster: avatars + bond bars + a GIFT control (the relationship
##               layer; React's NPC bonds/gifts). DEFAULT so setup()+open() renders the roster.
##   "workers" — the HIRE-by-type system (Farmer/Lumberjack/Miner/Baker cards: cost, effect,
##               Hire/Fire). The React distinction: NPCs (bonds/gifts) and hired Workers are
##               DISTINCT concepts on DISTINCT tabs. This tab is the canonical hire surface.
##   "quests"  — the active quest board.
var _tab: String = TAB_BONDS

## "bonds" / "workers" / "quests" → the segmented toggle Button. Built once in the shell.
var _tab_buttons: Dictionary = {}

const TAB_BONDS := "bonds"
const TAB_WORKERS := "workers"
const TAB_QUESTS := "quests"

## The resource the player has currently selected to gift, per NPC card. id:String →
## resource:String. Defaults (lazily) to the NPC's top giftable owned preference. The gift
## OptionButton on each Bonds card writes here; the Give button reads it.
var _gift_choice: Dictionary = {}

# ── palette tokens (matches other parchment screens) ──────────────────────────────────
const COL_TITLE  := Palette.INK
const COL_HEADER := Palette.EMBER
const COL_BODY   := Palette.INK
const COL_MUTED  := Palette.INK_MID
const COL_VALUE  := Palette.GOLD
const COL_PANEL  := Palette.PARCHMENT
const PANEL_MAX_WIDTH := 560.0
## Bottom strip (px) reserved for the persistent nav bar (a lower CanvasLayer): the view
## backdrop stops this far short of the bottom so the nav shows through + stays tappable, and
## the scroll-height clamp leaves room for it. Single source = UiKit.NAV_RESERVE.
const NAV_RESERVE := UiKit.NAV_RESERVE

# Bond-band → fill colour (tasteful Palette picks, matching the band mood).
# Sour   — muted rose (warm red-pink, subdued, a step down from ember)
# Warm   — neutral parchment-ink mid (the default, no strong tint)
# Liked  — moss green (positive, "things are going well")
# Beloved — gold (the top tier, prize colour)
const _BAND_FILL: Dictionary = {
	"Sour":    Color(0.68, 0.32, 0.28),   # muted rose/red
	"Warm":    Palette.INK_MID,            # neutral warm tan
	"Liked":   Palette.MOSS,               # positive moss green
	"Beloved": Palette.GOLD,               # prize gold
}

# ── lifecycle ──────────────────────────────────────────────────────────────────────────

## Store `game`, build the static shell ONCE, then render.
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

# ── static shell ───────────────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 4                                   # modal, above the HUD (layer 1)
	visible = false

	# Opaque VIEW background (not a dim modal scrim). The Townsfolk roster is one of the
	# five persistent bottom-nav VIEWS, so it paints the warm app-frame parchment over the
	# board. It reserves UiKit.TOPBAR_RESERVE at the TOP so the persistent layer-1 HUD top
	# bar shows ABOVE the view, and stops UiKit.NAV_RESERVE short of the bottom so the
	# persistent nav bar (a LOWER CanvasLayer) shows through + stays tappable;
	# MOUSE_FILTER_STOP eats clicks in the band it covers.
	var backdrop := UiKit.make_view_backdrop()
	backdrop.offset_top = UiKit.TOPBAR_RESERVE   # reveal the persistent HUD top bar above
	backdrop.offset_bottom = -NAV_RESERVE        # leave the bottom nav strip unpainted
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	# Full-bleed view content: a full-rect Control holds a panel pinned edge-to-edge (no card
	# margins), reserving the top-bar band + bottom-nav strip. A width-cap MarginContainer
	# (below) keeps line length tidy on wide viewports.
	var center := Control.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_FULL_RECT)
	panel.offset_left = 0
	panel.offset_right = 0
	panel.offset_top = UiKit.TOPBAR_RESERVE + 8
	panel.offset_bottom = -NAV_RESERVE
	# Flat page fill (NOT a floating card) — parchment, no corner radius, no border, no drop
	# shadow, so it reads as a full-brightness page under the persistent top bar.
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL
	style.set_content_margin_all(20)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	var width_cap := UiKit.make_width_cap()
	panel.add_child(width_cap)

	var root_vbox := VBoxContainer.new()
	root_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	# Fill the full-bleed page height so the scroll list expands into it (no void below a short
	# roster); the scroll below takes the spare height via SIZE_EXPAND_FILL.
	root_vbox.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_theme_constant_override("separation", 10)
	width_cap.add_child(root_vbox)

	# Title row: "👥 Townsfolk" heading spanning the row. The visible "✖ Close" is GONE — a
	# primary nav VIEW is left via the bottom nav / ESC-back, not a card close button. A
	# non-rendered close Button is still created + wired below so ESC/back, the "board"
	# deep-link, and the headless tests (which press _action_buttons["close"]) keep working.
	var title_row := HBoxContainer.new()
	title_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(title_row)

	var title := Label.new()
	title.text = "👥 Townsfolk"
	title.add_theme_font_size_override("font_size", 30)
	title.add_theme_color_override("font_color", COL_TITLE)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		title.add_theme_font_override("font", heading_font)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_row.add_child(title)

	# Hidden close affordance — created + wired but NOT added to the visible row, so it never
	# renders yet still backs ESC/back, apply_deeplink("board"), and the close-button tests.
	var close_btn := Button.new()
	close_btn.visible = false
	close_btn.connect("pressed", Callable(self, "close"))
	_action_buttons["close"] = close_btn

	# Tab row: a Bonds | Workers | Quests segmented toggle on the left, with the count
	# ("N townsfolk" / "N workers" / "N quests") pushed to the right (React's FeaturePanel.Tabs row).
	# Bonds = the NPC relationship roster (avatars + bond bars + gifts); Workers = the hire-by-type
	# system; Quests = the active quest board. (T20: NPCs and hired Workers are DISTINCT concepts.)
	var tab_row := HBoxContainer.new()
	tab_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tab_row.add_theme_constant_override("separation", 6)
	root_vbox.add_child(tab_row)

	var bonds_btn := Button.new()
	bonds_btn.text = "Bonds"
	bonds_btn.add_theme_font_size_override("font_size", 16)
	bonds_btn.connect("pressed", Callable(self, "_on_tab").bind(TAB_BONDS))
	tab_row.add_child(bonds_btn)
	_tab_buttons[TAB_BONDS] = bonds_btn

	var workers_btn := Button.new()
	workers_btn.text = "Workers"
	workers_btn.add_theme_font_size_override("font_size", 16)
	workers_btn.connect("pressed", Callable(self, "_on_tab").bind(TAB_WORKERS))
	tab_row.add_child(workers_btn)
	_tab_buttons[TAB_WORKERS] = workers_btn

	var quests_btn := Button.new()
	quests_btn.text = "Quests"
	quests_btn.add_theme_font_size_override("font_size", 16)
	quests_btn.connect("pressed", Callable(self, "_on_tab").bind(TAB_QUESTS))
	tab_row.add_child(quests_btn)
	_tab_buttons[TAB_QUESTS] = quests_btn

	# Count line — "N townsfolk" / "N quests" (gold), right-aligned, rebuilt each refresh().
	_header_label = Label.new()
	_header_label.text = ""
	_header_label.add_theme_font_size_override("font_size", 15)
	_header_label.add_theme_color_override("font_color", COL_VALUE)
	_header_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_header_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_header_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_header_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	tab_row.add_child(_header_label)

	_scroll = UiKit.make_vscroll()
	_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	# Full-bleed view: the scroll takes the spare page height (no content-clamp / float-card
	# sizing) so the roster fills the page and scrolls when it overflows.
	_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(_scroll)

	# The dynamic body — every NPC card hangs off this and is cleared + rebuilt each refresh().
	_body = VBoxContainer.new()
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation", 12)
	_scroll.add_child(_body)

# ── render ─────────────────────────────────────────────────────────────────────────────

## Clear the body and repopulate it for the active tab: the named townsfolk roster
## (Workers) or the active quest board (Quests).
func refresh() -> void:
	if not _built or game == null:
		return
	_sync_tabs()
	# Detach + free the previous body content.
	for child in _body.get_children():
		_body.remove_child(child)
		child.queue_free()
	_cards.clear()
	# Drop every action button except the static "close" so tests never read a stale node
	# (the Workers / Bonds tabs register hire:/fire:/gift: buttons that are rebuilt each refresh).
	var close_btn: Variant = _action_buttons.get("close")
	_action_buttons.clear()
	if close_btn != null:
		_action_buttons["close"] = close_btn

	match _tab:
		TAB_QUESTS:
			_render_quests()
		TAB_WORKERS:
			_render_workers_hire()
		_:
			_render_bonds()

## BONDS tab — the named NPC relationship roster (NpcConfig.all_ids() order). Each NPC gets a
## card tracked in `_cards` (the view-test contract): avatar + bond bar + a GIFT control.
func _render_bonds() -> void:
	var roster: Array = game.npcs.get("roster", NpcConfig.all_ids())
	var ordered: Array = []
	for id in NpcConfig.all_ids():
		if roster.has(id):
			ordered.append(String(id))
	_header_label.text = "%d townsfolk" % ordered.size()
	for id in ordered:
		var card := _make_npc_card(id)
		_body.add_child(card)
		_cards[id] = card

## WORKERS tab — the HIRE-by-type system (T20). One card per WorkerConfig type: name/role,
## "×count/max", an effect summary, the ramped next-hire cost, a Hire button (disabled unless
## affordable) and a Fire button (only when at least one is hired). Mirrors TownScreen's old
## Workers section — the hire UI now lives HERE (NPCs vs hired Workers are distinct concepts on
## distinct tabs). Cards tracked in `_cards` keyed by worker id; buttons in `_action_buttons`
## as "hire:<id>" / "fire:<id>".
func _render_workers_hire() -> void:
	var ids: Array = WorkerConfig.all_ids()
	_header_label.text = "%d trades" % ids.size()
	for wid in ids:
		var card := _make_worker_card(String(wid))
		_body.add_child(card)
		_cards[String(wid)] = card

## QUESTS tab — the active quest board (real game.quests; ensure_quests rolls them on first
## view, idempotent). A compact card per quest: its label, a progress bar, and the reward.
func _render_quests() -> void:
	game.ensure_quests()
	var quests: Array = game.quests
	_header_label.text = "%d quest%s" % [quests.size(), "" if quests.size() == 1 else "s"]
	if quests.is_empty():
		var empty := Label.new()
		empty.text = "No quests on the board yet."
		empty.add_theme_font_size_override("font_size", 16)
		empty.add_theme_color_override("font_color", COL_MUTED)
		empty.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		empty.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_body.add_child(empty)
		return
	for q in quests:
		_body.add_child(_make_quest_card(q as Dictionary))

# ── tab switching ────────────────────────────────────────────────────────────

func _on_tab(tab: String) -> void:
	if tab == _tab:
		return
	_tab = tab
	refresh()

func _sync_tabs() -> void:
	for key in _tab_buttons.keys():
		UiKit.style_segment(_tab_buttons[key], String(key) == _tab)

## A single NPC card: a soft-parchment chip holding a top row (avatar swatch + name +
## role) over a bond bar with a band label. Layout mirrors AchievementsScreen trophy rows.
func _make_npc_card(id: String) -> PanelContainer:
	var npc_name: String = NpcConfig.display_name(id)
	var npc_role: String = NpcConfig.role(id)
	var bond: float = game.npc_bond(id)
	var band: Dictionary = NpcConfig.bond_band(bond)
	var band_name: String = String(band.get("name", "Warm"))
	var mult: float = float(band.get("mult", 1.0))

	# Parse the NPC color from the hex string in NPCS.
	var npc_color: Color = _npc_color(id)

	var chip := PanelContainer.new()
	chip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chip.add_theme_stylebox_override("panel", UiKit.row_box())

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_theme_constant_override("separation", 6)
	chip.add_child(col)

	# ── top row: framed portrait thumbnail + name + role ───────────────────────
	var top := HBoxContainer.new()
	top.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_theme_constant_override("separation", 12)
	col.add_child(top)

	top.add_child(_make_portrait(npc_color, npc_name))

	# Name + role column (expands to fill the remaining width).
	var name_col := VBoxContainer.new()
	name_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	name_col.add_theme_constant_override("separation", 2)
	top.add_child(name_col)

	var name_lbl := Label.new()
	name_lbl.text = npc_name
	name_lbl.add_theme_font_size_override("font_size", 20)
	name_lbl.add_theme_color_override("font_color", COL_BODY)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		name_lbl.add_theme_font_override("font", heading_font)
	name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	name_col.add_child(name_lbl)

	var role_lbl := Label.new()
	role_lbl.text = npc_role
	role_lbl.add_theme_font_size_override("font_size", 14)
	role_lbl.add_theme_color_override("font_color", COL_MUTED)
	role_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	name_col.add_child(role_lbl)

	# ── bond bar row ──────────────────────────────────────────────────────────
	# A DIM track with a band-tinted fill (width = bond/10) + a descriptive label.
	var bar_col := VBoxContainer.new()
	bar_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar_col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar_col.add_theme_constant_override("separation", 4)
	col.add_child(bar_col)

	var fill_color: Color = _band_fill_color(band_name)
	var ratio: float = clampf(bond / 10.0, 0.0, 1.0)

	var bar_row := HBoxContainer.new()
	bar_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar_row.add_theme_constant_override("separation", 8)
	bar_col.add_child(bar_row)

	var track := Panel.new()
	track.custom_minimum_size = Vector2(0, 12)
	track.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	track.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	track.mouse_filter = Control.MOUSE_FILTER_IGNORE
	track.add_theme_stylebox_override("panel", UiKit.bar_box(Palette.DIM, Palette.IRON))
	bar_row.add_child(track)

	var fill := Panel.new()
	fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	fill.add_theme_stylebox_override("panel", UiKit.bar_box(fill_color, fill_color))
	fill.set_anchors_preset(Control.PRESET_TOP_LEFT)
	track.add_child(fill)
	# Size the fill once the track has a width (mirrors AchievementsScreen).
	track.resized.connect(func():
		var w: float = maxf(0.0, track.size.x - 2.0)
		fill.position = Vector2(1, 1)
		fill.size = Vector2(w * ratio, maxf(0.0, track.size.y - 2.0))
	)

	# Band label: "<band name> · bond X.X/10 · ×<mult> orders"
	var band_lbl := Label.new()
	band_lbl.text = "%s · bond %.1f/10 · ×%.2f orders" % [band_name, bond, mult]
	band_lbl.add_theme_font_size_override("font_size", 13)
	band_lbl.add_theme_color_override("font_color", fill_color)
	band_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar_col.add_child(band_lbl)

	# ── gift control row ──────────────────────────────────────────────────────
	# A resource picker (loved/liked owned resources, tier-tagged) + a "Give" button. The
	# button is disabled during this NPC's once-per-season cooldown or when nothing giftable
	# is owned; the label shows the bond delta the chosen gift would grant.
	col.add_child(_make_gift_row(id))

	return chip

# ── gift control ───────────────────────────────────────────────────────────────────────

## Build the gift-control row for NPC `id`: an OptionButton of giftable OWNED resources
## (the NPC's loved/liked preferences the player currently holds, each tagged with its tier
## + delta) and a Give button. On cooldown OR with no giftable stock the control is disabled
## and a status hint replaces it. The chosen resource is tracked in `_gift_choice[id]`.
func _make_gift_row(id: String) -> Control:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 8)

	# The giftable OWNED preferences: loved first, then liked, deduped, that the player holds.
	var options: Array = _giftable_options(id)
	var on_cooldown: bool = not game.npcs_state.can_gift(id, game.current_season_index())

	if options.is_empty() or on_cooldown:
		# Nothing actionable — show a muted status hint instead of a dead control.
		var hint := Label.new()
		if on_cooldown:
			hint.text = "🎁 Gifted this season"
		else:
			hint.text = "🎁 No favoured goods in stock"
		hint.add_theme_font_size_override("font_size", 13)
		hint.add_theme_color_override("font_color", COL_MUTED)
		hint.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(hint)
		return row

	# Resolve / clamp the remembered choice for this NPC to a still-valid option.
	var choice: String = String(_gift_choice.get(id, ""))
	var valid_keys: Array = []
	for o in options:
		valid_keys.append(String(o["key"]))
	if not valid_keys.has(choice):
		choice = String(options[0]["key"])
		_gift_choice[id] = choice

	var picker := OptionButton.new()
	picker.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	picker.add_theme_font_size_override("font_size", 13)
	for i in options.size():
		var o: Dictionary = options[i]
		# "flour ×2 — loves +0.5"
		picker.add_item("%s ×%d — %s +%.2f" % [String(o["key"]), int(o["owned"]), String(o["tier"]), float(o["delta"])])
		picker.set_item_metadata(i, String(o["key"]))
		if String(o["key"]) == choice:
			picker.select(i)
	picker.item_selected.connect(func(idx: int):
		_gift_choice[id] = String(picker.get_item_metadata(idx))
	)
	row.add_child(picker)
	_action_buttons["gift_pick:" + id] = picker

	var give_btn := Button.new()
	give_btn.text = "Give"
	give_btn.add_theme_font_size_override("font_size", 13)
	give_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_action_button(give_btn, Palette.GOLD, 6, 0)
	give_btn.connect("pressed", Callable(self, "_do_gift").bind(id))
	row.add_child(give_btn)
	_action_buttons["gift:" + id] = give_btn

	return row

## The giftable OWNED options for NPC `id`: every loved/liked preference the player currently
## holds (qty > 0), loved first then liked, deduped. Each entry: {key, tier, delta, owned}.
func _giftable_options(id: String) -> Array:
	var out: Array = []
	var seen: Dictionary = {}
	for tier_list in [["loves", NpcConfig.loves_of(id)], ["likes", NpcConfig.likes_of(id)]]:
		var tier_name: String = String(tier_list[0])
		for key in (tier_list[1] as Array):
			var k := String(key)
			if seen.has(k):
				continue
			var owned: int = int(game.inventory.get(k, 0))
			if owned <= 0:
				continue
			seen[k] = true
			out.append({"key": k, "tier": tier_name, "delta": NpcConfig.gift_delta(tier_name), "owned": owned})
	return out

## Give the currently-selected resource to NPC `id`. Routes through GameState.give_gift (consume
## 1, bump bond by tier delta, set the season cooldown); on success emits state_changed so Main
## persists + refreshes the HUD, then re-renders so the bond bar + cooldown state update.
func _do_gift(id: String) -> void:
	var resource: String = String(_gift_choice.get(id, ""))
	if resource == "":
		return
	var res: Dictionary = game.give_gift(id, resource)
	if bool(res.get("ok", false)):
		emit_signal("state_changed")
	refresh()

# ── worker hire card ──────────────────────────────────────────────────────────────────

## A single Worker HIRE card (Workers tab): name/role + "×count/max" + effect summary + the
## ramped next-hire cost, with a Hire button (disabled unless affordable) and a Fire button
## (only when at least one is hired). Mirrors TownScreen's old Workers rows; wired to
## game.hire_worker / fire_worker via _do_hire / _do_fire.
func _make_worker_card(id: String) -> PanelContainer:
	var count: int = game.worker_count(id)
	var maxc: int = WorkerConfig.max_count(id)

	var chip := PanelContainer.new()
	chip.add_theme_stylebox_override("panel", UiKit.row_box())

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 5)
	chip.add_child(col)

	var name_lbl := Label.new()
	name_lbl.text = "%s ×%d/%d" % [WorkerConfig.worker_name(id), count, maxc]
	name_lbl.add_theme_font_size_override("font_size", 18)
	name_lbl.add_theme_color_override("font_color", COL_BODY)
	var hf: Font = UiKit.heading_font()
	if hf != null:
		name_lbl.add_theme_font_override("font", hf)
	col.add_child(name_lbl)

	var effect_lbl := Label.new()
	effect_lbl.text = "%s  (%s)" % [_worker_effect_summary(id), _format_worker_cost(WorkerConfig.hire_cost_at(id, count))]
	effect_lbl.add_theme_font_size_override("font_size", 13)
	effect_lbl.add_theme_color_override("font_color", COL_MUTED)
	effect_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	col.add_child(effect_lbl)

	var btn_row := HBoxContainer.new()
	btn_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	btn_row.add_theme_constant_override("separation", 8)
	col.add_child(btn_row)

	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	btn_row.add_child(spacer)

	if count > 0:
		var fire_btn := Button.new()
		fire_btn.text = "Fire"
		fire_btn.add_theme_font_size_override("font_size", 13)
		UiKit.style_action_button(fire_btn, Palette.EMBER, 6, 0)
		fire_btn.connect("pressed", Callable(self, "_do_fire").bind(id))
		btn_row.add_child(fire_btn)
		_action_buttons["fire:" + id] = fire_btn

	var hire_btn := Button.new()
	hire_btn.text = "Hire"
	hire_btn.add_theme_font_size_override("font_size", 13)
	hire_btn.disabled = not game.can_hire_worker(id)
	UiKit.style_action_button(hire_btn, Palette.MOSS, 6, 0)
	hire_btn.connect("pressed", Callable(self, "_do_hire").bind(id))
	btn_row.add_child(hire_btn)
	_action_buttons["hire:" + id] = hire_btn

	return chip

## A short player-facing description of worker `id`'s passive effect (mirrors TownScreen).
func _worker_effect_summary(id: String) -> String:
	var kind: String = WorkerConfig.ability_kind(id)
	var amount: int = WorkerConfig.ability_amount(id)
	if kind == WorkerConfig.KIND_THRESHOLD_REDUCE_CATEGORY:
		return "-%d %s chain" % [amount, WorkerConfig.ability_category(id)]
	if kind == WorkerConfig.KIND_RECIPE_INPUT_REDUCE:
		return "-%d %s in %s" % [amount, WorkerConfig.ability_input(id), WorkerConfig.ability_recipe(id)]
	return ""

## Format a worker hire cost {coins, resources} like "50c, hay_bundle 2" (mirrors TownScreen).
func _format_worker_cost(cost: Dictionary) -> String:
	var parts: Array = ["%dc" % int(cost.get("coins", 0))]
	var res: Dictionary = cost.get("resources", {})
	for k in res.keys():
		parts.append("%s %d" % [k, int(res[k])])
	return ", ".join(parts)

## Hire one of worker `id`: route through game.hire_worker, emit state_changed on success
## (Main persists + refreshes the HUD), then re-render so counts/affordability re-evaluate.
func _do_hire(id: String) -> void:
	if bool(game.hire_worker(id).get("ok", false)):
		emit_signal("state_changed")
	refresh()

## Fire one of worker `id`: route through game.fire_worker, same emit + re-render pattern.
func _do_fire(id: String) -> void:
	if bool(game.fire_worker(id).get("ok", false)):
		emit_signal("state_changed")
	refresh()

# ── framed portrait thumbnail ─────────────────────────────────────────────────────────

## A framed portrait thumbnail for an NPC: a rounded-square iron-framed tile tinted with
## the NPC colour, a soft glossy top sheen, and the NPC's initial in the serif heading
## font — reading as a framed portrait rather than a flat initial-on-a-circle.
func _make_portrait(npc_color: Color, npc_name: String) -> Control:
	var wrap := Control.new()
	wrap.custom_minimum_size = Vector2(56, 56)
	wrap.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	wrap.mouse_filter = Control.MOUSE_FILTER_IGNORE

	# The frame — rounded-square, NPC-tinted fill, iron border, soft drop shadow.
	var frame := Panel.new()
	frame.set_anchors_preset(Control.PRESET_FULL_RECT)
	frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sb := StyleBoxFlat.new()
	sb.bg_color = npc_color
	sb.border_color = Palette.IRON
	sb.set_border_width_all(3)
	sb.set_corner_radius_all(14)
	sb.shadow_size = 5
	sb.shadow_color = Color(0, 0, 0, 0.25)
	sb.shadow_offset = Vector2(0, 2)
	frame.add_theme_stylebox_override("panel", sb)
	wrap.add_child(frame)

	# Glossy top sheen — a translucent light band across the upper portion for a portrait
	# "polish" so the tile reads as framed art, not a flat swatch.
	var sheen := Panel.new()
	sheen.set_anchors_preset(Control.PRESET_TOP_WIDE)
	sheen.offset_left = 5
	sheen.offset_right = -5
	sheen.offset_top = 5
	sheen.offset_bottom = 23
	sheen.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sheen_sb := StyleBoxFlat.new()
	sheen_sb.bg_color = Color(1, 1, 1, 0.16)
	sheen_sb.set_corner_radius_all(10)
	sheen.add_theme_stylebox_override("panel", sheen_sb)
	wrap.add_child(sheen)

	# The NPC's initial, centred, in the serif heading font.
	var initial := Label.new()
	initial.text = npc_name.left(1).to_upper() if npc_name.length() > 0 else "?"
	initial.add_theme_font_size_override("font_size", 26)
	var hf: Font = UiKit.heading_font()
	if hf != null:
		initial.add_theme_font_override("font", hf)
	var lum: float = npc_color.r * 0.299 + npc_color.g * 0.587 + npc_color.b * 0.114
	initial.add_theme_color_override("font_color", Color(1, 1, 1) if lum < 0.5 else Palette.INK)
	initial.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	initial.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	initial.set_anchors_preset(Control.PRESET_FULL_RECT)
	initial.mouse_filter = Control.MOUSE_FILTER_IGNORE
	wrap.add_child(initial)

	return wrap

# ── Quests tab card ───────────────────────────────────────────────────────────────────

## A compact quest card: the quest label, a progress bar (progress/target), and the reward.
## Read-only overview — claiming a finished quest stays in the dedicated Quests screen.
func _make_quest_card(q: Dictionary) -> PanelContainer:
	var target: int = int(q.get("target", 0))
	var progress: int = int(q.get("progress", 0))
	var claimed: bool = bool(q.get("claimed", false))
	var done: bool = progress >= target

	var chip := PanelContainer.new()
	chip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chip.add_theme_stylebox_override("panel", UiKit.row_box())

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_theme_constant_override("separation", 5)
	chip.add_child(col)

	# Title row: label (expands) + a state badge (Claimed / Ready) or the reward.
	var title_row := HBoxContainer.new()
	title_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	title_row.add_theme_constant_override("separation", 8)
	col.add_child(title_row)

	var name_lbl := Label.new()
	name_lbl.text = _quest_label(q)
	name_lbl.add_theme_font_size_override("font_size", 16)
	name_lbl.add_theme_color_override("font_color", COL_BODY)
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	title_row.add_child(name_lbl)

	var badge := Label.new()
	if claimed:
		badge.text = "✔ Claimed"
		badge.add_theme_color_override("font_color", Palette.MOSS)
	elif done:
		badge.text = "Ready"
		badge.add_theme_color_override("font_color", COL_VALUE)
	else:
		badge.text = _quest_reward_text(q.get("reward", {}))
		badge.add_theme_color_override("font_color", COL_VALUE)
	badge.add_theme_font_size_override("font_size", 13)
	badge.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	badge.mouse_filter = Control.MOUSE_FILTER_IGNORE
	title_row.add_child(badge)

	# Progress bar + count.
	var bar_row := HBoxContainer.new()
	bar_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar_row.add_theme_constant_override("separation", 8)
	col.add_child(bar_row)

	var track := Panel.new()
	track.custom_minimum_size = Vector2(0, 10)
	track.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	track.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	track.mouse_filter = Control.MOUSE_FILTER_IGNORE
	track.add_theme_stylebox_override("panel", UiKit.bar_box(Palette.DIM, Palette.IRON))
	bar_row.add_child(track)

	var ratio: float = 0.0
	if target > 0:
		ratio = clampf(float(progress) / float(target), 0.0, 1.0)
	var fill_col: Color = Palette.MOSS if (done or claimed) else COL_VALUE
	var fill := Panel.new()
	fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	fill.add_theme_stylebox_override("panel", UiKit.bar_box(fill_col, fill_col))
	fill.set_anchors_preset(Control.PRESET_TOP_LEFT)
	track.add_child(fill)
	track.resized.connect(func():
		var w: float = maxf(0.0, track.size.x - 2.0)
		fill.position = Vector2(1, 1)
		fill.size = Vector2(w * ratio, maxf(0.0, track.size.y - 2.0))
	)

	var prog_lbl := Label.new()
	prog_lbl.text = "%d/%d" % [mini(progress, target), target]
	prog_lbl.add_theme_font_size_override("font_size", 12)
	prog_lbl.add_theme_color_override("font_color", COL_MUTED)
	prog_lbl.custom_minimum_size = Vector2(44, 0)
	prog_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	prog_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar_row.add_child(prog_lbl)

	return chip

## Quest display label (template label with {n} → target), mirroring QuestsScreen.
func _quest_label(q: Dictionary) -> String:
	var tpl: Dictionary = QuestConfig.template_by_id(String(q.get("template", "")))
	var label: String = String(tpl.get("label", ""))
	if label == "":
		return "Quest: %s (%d)" % [String(q.get("category", "?")), int(q.get("target", 0))]
	return label.replace("{n}", str(int(q.get("target", 0))))

## Quest reward text: "+N 🪙  +M ⭐" (coins + almanac XP), mirroring QuestsScreen.
func _quest_reward_text(reward: Dictionary) -> String:
	var parts: Array = []
	var coins: int = int(reward.get("coins", 0))
	if coins > 0:
		parts.append("+%d 🪙" % coins)
	var xp: int = int(reward.get("xp", 0))
	if xp > 0:
		parts.append("+%d ⭐" % xp)
	return "  ".join(parts) if not parts.is_empty() else "—"

# ── colour helpers ──────────────────────────────────────────────────────────────────

## Parse the NPC's hex color string (e.g. "#4f6b3a") into a Color.
## Falls back to a neutral warm-grey when the id isn't in the catalog.
func _npc_color(id: String) -> Color:
	for n in NpcConfig.NPCS:
		if String(n["id"]) == id:
			var hex: String = String(n["color"])
			if hex.begins_with("#"):
				hex = hex.substr(1)
			return Color.from_string("#" + hex, Palette.INK_MID)
	return Palette.INK_MID

## Return the fill Color for a given band name.
func _band_fill_color(band_name: String) -> Color:
	if _BAND_FILL.has(band_name):
		return _BAND_FILL[band_name] as Color
	return Palette.INK_MID

# ── pure helpers (usable + testable without rendering) ─────────────────────────────

## How many NPC cards were rendered in the last refresh().
func npc_count() -> int:
	return _cards.size()
