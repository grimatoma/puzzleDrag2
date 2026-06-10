extends CanvasLayer
## The HARVEST modal — a parchment card with two modes:
##   • LEGACY season-summary (A2, open_for): shown when the always-on farm season cycle completes
##     (GameState.note_farm_turn returns {harvest:true}). It recaps the season that just ended +
##     the turn/economy snapshot and is dismissed by a single "Continue" (the farm continues — a
##     fresh Spring cycle has ALREADY begun in state).
##   • RUN-END "Return to Town" (Task C + T30, open_for_run_end): shown when a bounded farm RUN
##     reaches its turn budget. T30 grows this from a one-line recap into a rich DASHBOARD built from
##     GameState.build_run_summary(): a season-recap header, chains played / longest chain, a "best
##     moment" callout, the brought-home item tally, upgrades + coins gained, the NPCs who noticed
##     you (bond deltas), the story beats fired, and the supplies consumed — then a "Return to Town"
##     CTA that emits return_to_town (Main wires that to close_season() + reopening the town).
## Mirrors the React runSummary dashboard (src/features/runSummary/index.tsx) + parchment dialogs.
##
## SINGLE SOURCE OF TRUTH. The modal NEVER grants anything — it is purely informational (no
## economy change). note_farm_turn already wrapped the cycle; close_season (run-end) grants the
## return bonus + clears the run on the return path. "Continue" / "Return to Town" only dismiss.
##
## NO class_name — preloaded by Main (const HarvestModalScript := preload(...)) so the port
## never needs --import to register it as a global (mirrors DailyStreakModal / StoryModal).
##
## HEADLESS-TEST CONTRACT
##   Every actionable button is in `_action_buttons` — key "continue" (legacy season-summary) and
##   key "return_town" (run-end "Return to Town" CTA). `_title_label`, `_season_label`, and
##   `_recap_label` are the rendered Labels a test can assert. The pure helper recap_line(summary)
##   builds the recap string without a tree. T30 adds the pure dashboard helpers (best_moment_line /
##   bonds_summary_line / beats_summary_line) so the rich content is assertable without a render.

var game: GameState

signal closed
## Task C — emitted by the RUN-END "Return to Town" CTA (open_for_run_end mode). Main wires this
## to close_season() + reopening the town. The legacy informational open_for() "Continue" path
## does NOT emit it (it just dismisses — the always-on cycle already wrapped a fresh Spring).
signal return_to_town

## Stable button registry for headless tests. Keys: "continue", "return_town".
var _action_buttons: Dictionary = {}

## Task C — true while the modal is showing a bounded-RUN end (open_for_run_end): the recap gains
## a return-bonus line + the rich dashboard, and the CTA reads "Return to Town" + emits
## return_to_town. False for the legacy informational season recap (open_for, "Continue" dismiss).
var _run_end_mode: bool = false

## True once _build_shell() has run (safe to call setup() again).
var _built: bool = false

## The summary dict currently presented (set by open_for*, read by tests). Shape is the
## note_farm_turn() return: { harvest, season, turns_used, budget, coins, runes }.
var _summary: Dictionary = {}

## T30 — the rich run-summary dashboard dict (GameState.build_run_summary()), snapshotted at
## open_for_run_end. {} in legacy mode. Read by _render_dashboard + the pure dashboard helpers.
var _run: Dictionary = {}

# Static shell nodes (text set each open_for*).
var _title_label: Label            ## "Harvest — {Season} ends" (Cinzel serif, title-cased)
var _season_label: Label           ## the prominent season name that just ended (gold)
var _recap_label: Label            ## the recap line (turns + coins/runes snapshot)
var _bonus_label: Label            ## Task C — the "+N 🪙 return bonus" line (run-end mode only)
var _dashboard: VBoxContainer      ## T30 — the rich run-summary sections (run-end mode only)
var _continue_btn: Button          ## the single dismiss action (legacy "Continue" / run-end "Return to Town")

# Palette mirrors (DailyStreakModal / StoryModal tokens).
const COL_TITLE := Palette.INK
const COL_BODY  := Palette.INK_MID
const COL_PANEL := Palette.PARCHMENT
const COL_HEADER := Palette.EMBER
const COL_VALUE := Palette.GOLD
const PANEL_MAX_WIDTH := 460.0

# ── lifecycle ──────────────────────────────────────────────────────────────────

## Store `game`, build the static shell ONCE. Safe to call again (shell built once).
## Does NOT show the modal — call open_for(summary) to present it.
func setup(g: GameState) -> void:
	game = g
	if not _built:
		_build_shell()
		_built = true

## Render `summary` (the note_farm_turn() dict) and show the modal in the LEGACY informational
## season-recap mode (a single "Continue" dismiss; nothing is granted — the always-on cycle has
## already wrapped a fresh Spring). Unchanged for the no-run case.
func open_for(summary: Dictionary) -> void:
	if not _built:
		return
	_run_end_mode = false
	_summary = summary.duplicate(true)
	_run = {}
	_render()
	visible = true

## Task C + T30 — render the bounded-RUN end summary and show the modal in RUN-END mode: the season
## recap PLUS a "+N 🪙 return bonus" line AND the rich dashboard (chains / longest / best moment /
## brought-home tally / upgrades / coins / bonds noticed / beats / supplies). The primary CTA reads
## "Return to Town" (emitting return_to_town → Main runs close_season() + reopens the town). `summary`
## is the note_farm_turn() dict at the ended boundary; the rich dashboard is pulled from the LIVE
## telemetry via game.build_run_summary() (the run is still active here — close_season runs on return).
func open_for_run_end(summary: Dictionary) -> void:
	if not _built:
		return
	_run_end_mode = true
	_summary = summary.duplicate(true)
	# Snapshot the rich telemetry NOW (the run is still live; close_season clears it on the return).
	_run = game.build_run_summary() if game != null else {}
	_render()
	visible = true

func close() -> void:
	visible = false
	emit_signal("closed")

# ── static shell ───────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 6                                   # top tier (above the HUD + the routed modals)
	visible = false

	# Warm-brown scrim (matches DailyStreakModal / StoryModal). MOUSE_FILTER_STOP so clicks
	# behind it never reach the board; Main's _on_child_entered wires a tap to close().
	var backdrop := UiKit.make_scrim()
	add_child(backdrop)

	# Full-rect CenterContainer centres the parchment card at its own min size.
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(PANEL_MAX_WIDTH, 0)
	# Shared modal card surface (UiKit.modal_card_box) — one builder for every
	# centred-card modal so radius/border/shadow can never drift again.
	panel.add_theme_stylebox_override("panel", UiKit.modal_card_box(28))
	center.add_child(panel)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 16)
	panel.add_child(col)

	var heading_font: Font = UiKit.heading_font()

	# Title — Cinzel display serif, centred, title-cased ("Harvest — Winter ends").
	_title_label = Label.new()
	_title_label.text = "Harvest"
	UiKit.set_font_size(_title_label, Typography.Role.TITLE)
	_title_label.add_theme_color_override("font_color", COL_TITLE)
	_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_title_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if heading_font != null:
		_title_label.add_theme_font_override("font", heading_font)
	col.add_child(_title_label)

	# Iron hairline under the title.
	var rule := HSeparator.new()
	var line := StyleBoxLine.new()
	line.color = Color(Palette.IRON, 0.7)
	line.thickness = 1
	rule.add_theme_stylebox_override("separator", line)
	col.add_child(rule)

	# The prominent season name that just ended, in the gold accent.
	_season_label = Label.new()
	_season_label.text = ""
	UiKit.set_font_size(_season_label, Typography.Role.DISPLAY)
	_season_label.add_theme_color_override("font_color", Palette.GOLD)
	_season_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_season_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if heading_font != null:
		_season_label.add_theme_font_override("font", heading_font)
	col.add_child(_season_label)

	# Recap line — turns spent + the coins/runes snapshot, wrapping.
	_recap_label = Label.new()
	_recap_label.text = ""
	UiKit.set_font_size(_recap_label, Typography.Role.SUBHEAD)
	_recap_label.add_theme_color_override("font_color", COL_BODY)
	_recap_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_recap_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_recap_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(_recap_label)

	# Task C — the return-bonus line, shown ONLY in run-end mode (hidden for the legacy recap).
	# Gold to echo the coin reward; text + visibility are set in _render.
	_bonus_label = Label.new()
	_bonus_label.text = ""
	UiKit.set_font_size(_bonus_label, Typography.Role.SUBHEAD)
	_bonus_label.add_theme_color_override("font_color", Palette.GOLD)
	_bonus_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_bonus_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_bonus_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_bonus_label.visible = false
	col.add_child(_bonus_label)

	# T30 — the rich dashboard column, shown ONLY in run-end mode (hidden for the legacy recap). It
	# is wrapped in a height-capped ScrollContainer so a beat/bond-heavy run never overflows the card
	# on a short viewport. Cleared + rebuilt each open_for_run_end.
	var dash_scroll := UiKit.make_vscroll()
	dash_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	dash_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	# Cap the dashboard scroll height so the card stays on-screen on small portrait viewports; the
	# width is driven by the panel's min width so the chips/rows wrap inside the card.
	dash_scroll.custom_minimum_size = Vector2(PANEL_MAX_WIDTH - 56.0, 420.0)
	dash_scroll.visible = false
	col.add_child(dash_scroll)
	_dashboard = VBoxContainer.new()
	_dashboard.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_dashboard.add_theme_constant_override("separation", 12)
	dash_scroll.add_child(_dashboard)
	# Keep a handle to the scroll wrapper (its visibility tracks the dashboard's).
	_dashboard.set_meta("scroll", dash_scroll)

	# The single primary CTA. Legacy mode → "Continue" (dismiss). Run-end mode → "Return to Town"
	# (emit return_to_town then close). The label + which handler fires are set in _render per mode;
	# the button is registered under BOTH keys so the existing "continue" test contract holds AND
	# run-end tests can find it via "return_town".
	_continue_btn = Button.new()
	_continue_btn.text = "Continue"
	_continue_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_action_button(_continue_btn, Palette.GO_GREEN, 10, Typography.size(Typography.Role.SUBHEAD))
	_continue_btn.connect("pressed", Callable(self, "_on_primary_cta"))
	col.add_child(_continue_btn)
	_action_buttons["continue"] = _continue_btn
	_action_buttons["return_town"] = _continue_btn

# ── render ─────────────────────────────────────────────────────────────────────

## Render the current summary into the labels. In RUN-END mode the return-bonus line + the rich
## dashboard are shown and the CTA reads "Return to Town"; otherwise the legacy "Continue" recap is
## shown and the dashboard is hidden.
func _render() -> void:
	if not _built:
		return
	var season: String = String(_summary.get("season", "the season"))
	_title_label.text = "Harvest — %s ends" % season
	_season_label.text = "%s harvested" % season
	_recap_label.text = recap_line(_summary)
	var dash_scroll: Node = _dashboard.get_meta("scroll")
	if _run_end_mode:
		var bonus: int = int(_summary.get("coins_granted", Constants.SEASON_END_BONUS_COINS))
		_bonus_label.text = "+%d 🪙 return bonus" % bonus
		_bonus_label.visible = true
		_continue_btn.text = "Return to Town"
		_render_dashboard()
		if dash_scroll != null:
			(dash_scroll as Control).visible = true
	else:
		_bonus_label.visible = false
		_continue_btn.text = "Continue"
		if dash_scroll != null:
			(dash_scroll as Control).visible = false

## A player-facing recap of a harvest summary dict ({season, budget, coins, runes}). Reads
## "A full year of {budget} turns is in. Your stores: N coins · N runes." — informational only.
## Runes are omitted when zero (they appear only after the harbor arc). Pure + headless-testable.
static func recap_line(summary: Dictionary) -> String:
	var budget: int = int(summary.get("budget", 0))
	var coins: int = int(summary.get("coins", 0))
	var runes: int = int(summary.get("runes", 0))
	var stores: Array = ["%d coins" % coins]
	if runes > 0:
		var rune_word: String = "rune" if runes == 1 else "runes"
		stores.append("%d %s" % [runes, rune_word])
	var turns_phrase: String = "A full year of %d turns is in." % budget if budget > 0 else "A full year is in."
	return "%s  A fresh Spring begins. Your stores: %s." % [turns_phrase, "  ·  ".join(stores)]

# ── T30 rich dashboard ───────────────────────────────────────────────────────────

## Clear + rebuild the dashboard sections from `_run` (GameState.build_run_summary()). Sections
## mirror the React runSummary dashboard, each shown only when it has content:
##   • Chains played / Longest chain (a two-up metric row)
##   • Best moment callout (the longest chain + its reward)
##   • What you brought home (resource tally chips)
##   • Upgrades crafted + Coins gained (a two-up footer)
##   • What the Vale noticed (NPC bond deltas)
##   • Story beats (titles of beats fired this run)
##   • Supplies consumed (+ a Fertilizer chip)
func _render_dashboard() -> void:
	for child in _dashboard.get_children():
		child.queue_free()
	if _run.is_empty():
		return

	# ── Chains played / Longest chain (two-up metrics) ──
	var longest: int = int(_run.get("longest_chain", 0))
	_dashboard.add_child(_metric_row(
		"Chains played", str(int(_run.get("chains_played", 0))),
		"Longest", ("x%d" % longest) if longest > 0 else "—"))

	# ── Best moment callout ──
	var best: Dictionary = _run.get("best_chain", {})
	if not best.is_empty() and int(best.get("count", 0)) > 0:
		_dashboard.add_child(_best_moment_card(best))

	# ── What you brought home (resource tally) ──
	var resources: Dictionary = _run.get("resources_gained", {})
	if not resources.is_empty():
		_dashboard.add_child(_section_label("What you brought home"))
		_dashboard.add_child(_resource_tally(resources))

	# ── Upgrades crafted + Coins gained (two-up footer) ──
	_dashboard.add_child(_metric_row(
		"Upgrades crafted", str(int(_run.get("total_upgrades", 0))),
		"Coins gained", "+%d" % int(_run.get("total_coins", 0)), COL_VALUE))

	# ── What the Vale noticed (bond deltas) ──
	var bonds: Dictionary = _run.get("bond_deltas", {})
	if not bonds.is_empty():
		_dashboard.add_child(_section_label("What the Vale noticed"))
		for npc in _sorted_bond_keys(bonds):
			_dashboard.add_child(_bond_row(String(npc), float(bonds[npc])))

	# ── Story beats fired this run ──
	var beats: Array = _run.get("beats", [])
	var titled: Array = []
	for b in beats:
		var t: String = String((b as Dictionary).get("title", ""))
		if t != "":
			titled.append(t)
	if not titled.is_empty():
		_dashboard.add_child(_section_label("Story beats"))
		_dashboard.add_child(_chip_flow(titled, COL_VALUE))

	# ── Supplies consumed (+ Fertilizer) ──
	var supplies: Dictionary = _run.get("supplies_consumed", {})
	var fert: bool = bool(_run.get("fertilizer_used", false))
	if not supplies.is_empty() or fert:
		_dashboard.add_child(_section_label("Supplies consumed"))
		var chips: Array = []
		for k in supplies.keys():
			chips.append("%s x%d" % [UiKit.pretty_name(String(k)), int(supplies[k])])
		if fert:
			chips.append("Fertilizer")
		_dashboard.add_child(_chip_flow(chips, COL_BODY))

# ── dashboard widget builders ─────────────────────────────────────────────────────

## A small uppercase section eyebrow (ember, letter-spaced) — mirrors the React section labels.
func _section_label(text: String) -> Label:
	var l := Label.new()
	l.text = text.to_upper()
	UiKit.set_font_size(l, Typography.Role.META)
	l.add_theme_color_override("font_color", Color(Palette.INK_MID, 0.95))
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l

## A two-up metric row: two labelled values side by side (React MetricGrid). The right value can
## carry an accent color (e.g. gold for coins).
func _metric_row(label_a: String, value_a: String, label_b: String, value_b: String, value_b_col: Color = COL_TITLE) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 10)
	row.add_child(_metric_cell(label_a, value_a, COL_TITLE, false))
	row.add_child(_metric_cell(label_b, value_b, value_b_col, true))
	return row

## One metric cell: an uppercase caption over a bold value. `align_right` right-aligns it.
func _metric_cell(caption: String, value: String, value_col: Color, align_right: bool) -> VBoxContainer:
	var cell := VBoxContainer.new()
	cell.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cell.add_theme_constant_override("separation", 2)
	var cap := Label.new()
	cap.text = caption.to_upper()
	UiKit.set_font_size(cap, Typography.Role.CAPTION)
	cap.add_theme_color_override("font_color", Color(Palette.INK_MID, 0.9))
	cap.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT if align_right else HORIZONTAL_ALIGNMENT_LEFT
	cap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cell.add_child(cap)
	var val := Label.new()
	val.text = value
	UiKit.set_font_size(val, Typography.Role.HEADING)
	val.add_theme_color_override("font_color", value_col)
	val.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT if align_right else HORIZONTAL_ALIGNMENT_LEFT
	val.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cell.add_child(val)
	return cell

## The "best moment" callout — a soft card with the chain glyph + xN, the chain label, and reward
## chips (coins + upgrades). Mirrors React's BestMomentCard.
func _best_moment_card(best: Dictionary) -> PanelContainer:
	var card := PanelContainer.new()
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.add_theme_stylebox_override("panel", UiKit.row_box())
	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 4)
	card.add_child(col)
	col.add_child(_section_label("Best moment"))
	var headline := Label.new()
	headline.text = best_moment_line(best)
	UiKit.set_font_size(headline, Typography.Role.SUBHEAD)
	headline.add_theme_color_override("font_color", COL_TITLE)
	headline.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	headline.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(headline)
	var chips: Array = ["+%d coins" % int(best.get("coin_gain", 0))]
	var ups: int = int(best.get("upgrades", 0))
	if ups > 0:
		chips.append("+%d upgrade%s" % [ups, "" if ups == 1 else "s"])
	col.add_child(_chip_flow(chips, COL_VALUE))
	return card

## The resource tally — a wrapping flow of "Name xN" chips, biggest first. Mirrors React's
## ResourceTally (top 8 shown).
func _resource_tally(resources: Dictionary) -> Control:
	var entries: Array = []
	for k in resources.keys():
		entries.append([String(k), int(resources[k])])
	entries.sort_custom(func(a, b): return int(a[1]) > int(b[1]))
	var chips: Array = []
	# Batch 9 D9: the "top N shown" cap is Constants.HARVEST_TALLY_MAX (was an inline 8).
	for i in mini(Constants.HARVEST_TALLY_MAX, entries.size()):
		chips.append("%s x%d" % [UiKit.pretty_name(String(entries[i][0])), int(entries[i][1])])
	return _chip_flow(chips, COL_BODY)

## A single NPC bond-delta row: the villager's name + a "Bond +N" / "Bond -N" chip (moss when up,
## ember when down). Mirrors React's BondRow.
func _bond_row(npc: String, delta: float) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 8)
	var name_lbl := Label.new()
	name_lbl.text = NpcConfig.display_name(npc)
	UiKit.set_font_size(name_lbl, Typography.Role.LABEL)
	name_lbl.add_theme_color_override("font_color", COL_TITLE)
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(name_lbl)
	var chip := _chip("Bond %s" % _fmt_delta(delta), Palette.MOSS if delta > 0 else COL_HEADER)
	row.add_child(chip)
	return row

## A flow (HFlowContainer) of pill chips with a uniform accent. Empty list → an empty container.
func _chip_flow(labels: Array, accent: Color) -> Control:
	var flow := HFlowContainer.new()
	flow.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	flow.add_theme_constant_override("h_separation", 6)
	flow.add_theme_constant_override("v_separation", 6)
	for txt in labels:
		flow.add_child(_chip(String(txt), accent))
	return flow

## One pill chip: a small rounded parchment-tinted label outlined in `accent`.
func _chip(text: String, accent: Color) -> PanelContainer:
	var pc := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(Palette.PARCHMENT_SOFT, 0.9)
	sb.set_corner_radius_all(8)
	sb.set_content_margin_all(6)
	sb.border_color = Color(accent, 0.85)
	sb.set_border_width_all(1)
	pc.add_theme_stylebox_override("panel", sb)
	var l := Label.new()
	l.text = text
	UiKit.set_font_size(l, Typography.Role.BODY)
	l.add_theme_color_override("font_color", COL_TITLE)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pc.add_child(l)
	return pc

# ── pure helpers (testable without rendering internals) ────────────────────────

## The season name currently presented ("" when none).
func current_season() -> String:
	return String(_summary.get("season", ""))

## True when the rich dashboard is currently shown (run-end mode with a built shell).
func is_dashboard_visible() -> bool:
	return _run_end_mode and not _run.is_empty()

## The run-summary dict currently presented (a copy; {} in legacy mode). For tests.
func run_summary() -> Dictionary:
	return _run.duplicate(true)

## PURE — the "best moment" headline for a best_chain dict {count, key}. e.g. "Oak chain · 9 tiles".
## A missing/empty key reads as a generic "Chain". Headless-testable.
static func best_moment_line(best: Dictionary) -> String:
	var count: int = int(best.get("count", 0))
	var key: String = String(best.get("key", ""))
	var label: String = UiKit.pretty_name(key) if key != "" else "Chain"
	return "%s chain · %d tiles" % [label, count]

## PURE — a one-line summary of the bond deltas (e.g. "Mira +0.6 · Wren -0.1"), biggest move first.
## "" when nothing moved. Headless-testable.
static func bonds_summary_line(bond_deltas: Dictionary) -> String:
	var entries: Array = []
	for k in bond_deltas.keys():
		entries.append([String(k), float(bond_deltas[k])])
	if entries.is_empty():
		return ""
	entries.sort_custom(func(a, b): return absf(a[1]) > absf(b[1]))
	var parts: Array = []
	for e in entries:
		parts.append("%s %s" % [NpcConfig.display_name(String(e[0])), _fmt_delta(float(e[1]))])
	return "  ·  ".join(parts)

## PURE — a one-line summary of the story-beat titles fired this run (e.g. "First Light · The First
## Delivery"). "" when none. `beats` is the build_run_summary() beats array [{id,title}].
## Headless-testable.
static func beats_summary_line(beats: Array) -> String:
	var titles: Array = []
	for b in beats:
		var t: String = String((b as Dictionary).get("title", ""))
		if t != "":
			titles.append(t)
	return "  ·  ".join(titles)

## Format a signed bond delta: "+0.6" / "-0.1". Trims a trailing ".0" → integer-looking deltas read
## clean (e.g. "+1" not "+1.0").
static func _fmt_delta(n: float) -> String:
	var s: String = ("%+.1f" % n)
	if s.ends_with(".0"):
		s = s.substr(0, s.length() - 2)
	return s

## Bond keys sorted by absolute move (biggest first) for a stable render order.
func _sorted_bond_keys(bond_deltas: Dictionary) -> Array:
	var keys: Array = bond_deltas.keys()
	keys.sort_custom(func(a, b): return absf(float(bond_deltas[a])) > absf(float(bond_deltas[b])))
	return keys

# ── action handlers ────────────────────────────────────────────────────────────

## The primary CTA was pressed. RUN-END mode → emit return_to_town (Main runs close_season() +
## reopens the town) THEN close. LEGACY mode → just dismiss (the fresh Spring cycle already began;
## nothing to grant). Emitting before close() keeps the "closed" signal firing last in both modes.
func _on_primary_cta() -> void:
	if _run_end_mode:
		emit_signal("return_to_town")
	close()
