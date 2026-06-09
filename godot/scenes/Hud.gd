extends Node
## The HUD presentation layer, extracted verbatim from Main.gd (behaviour-preserving).
## A PLAIN NODE container (NOT a CanvasLayer — nesting CanvasLayers would shift compositing
## and break a visual golden); it holds the same child CanvasLayers the HUD always used (a
## background layer=-1, the main HUD layer=1, the fx layer=2, and the bottom-nav layer). It
## renders the parchment top-bar of pills, the season bar, the chain-progress bar, the
## stockpile chip panel, the tool palette + armed banner, and the 5-tab bottom nav, plus the
## reward-chip FX.
##
## Main owns GameState, the Board, routing, screens, audio, and input; it injects `game` +
## `board` before build() and re-points its HUD call sites at this node. Up-calls (a nav-tab
## tap, a tool slot tap, a disarm) are surfaced as SIGNALS — Main connects them and does the
## routing / tool dispatch exactly as before. Loaded via preload (NO class_name) so the port
## never needs an --import pass to register it (mirrors SeasonBar / every lazy modal).

## A nav tab was tapped. `key` is one of "town"/"inventory"/"craft"/"map"/"folk" (React order).
## Main routes it (close siblings via _switch_primary_view + the opener) then sets the active
## tab back via set_nav_current(key) + _refresh_nav().
signal nav_selected(key: String)
## A tool slot was tapped — Main runs the existing tool dispatch (use_tool) unchanged, then
## refreshes the palette.
signal tool_use_requested(id: String)
## The armed-banner "✖ Disarm" button was pressed — Main leaves targeting + clears the tool.
signal disarm_requested
## The floating ⚙ top-right button was pressed — Main opens the MenuScreen (_open_menu).
signal menu_requested

# ── injected by Main before build() ──────────────────────────────────────────
var game: GameState                    ## canonical run economy (inventory/coins/turn)
var board: Board                       ## read only for the reward-chip fly-from start point

# ── kept *_label fields (forwarded from Main) ────────────────────────────────
var _chain_label: Label                 ## chain prompt above the board (KEPT — smoke asserts it)
var _status_label: Label                ## action feedback near the bottom (KEPT)
var _orders_label: Label                ## compact one-line orders readout above the stockpile

# Top-bar pill inner Labels (the PanelContainer wrappers hold them; we mutate text/visibility here).
var _coin_pill: Label                   ## 🪙 N
var _level_pill_box: PanelContainer     ## orange "Lv N" pill with an XP fill (React parity)
var _level_label: Label                 ## "Lv N"
var _level_xp_fill: ColorRect           ## brighter-orange XP progress fill behind the label
var _tier_pill: Label                   ## tier name · plots used/total
var _biome_pill: Label                  ## Farm / ⛏ Mine · N
var _boss_pill_box: PanelContainer      ## boss pill wrapper (toggled visible)
var _boss_pill: Label                   ## ⚔ Frostmaw HP/max
var _rats_pill_box: PanelContainer      ## rats pill wrapper (toggled visible)
var _rats_pill: Label                   ## 🐀 N/5
var _runes_pill_box: PanelContainer     ## M3j — runes pill wrapper (toggled visible)
var _runes_pill: Label                  ## 🔮 N (harbor's premium reward)
var _free_moves_pill_box: PanelContainer ## tile-variant free-moves pill wrapper (toggled visible)
var _free_moves_pill: Label             ## 👟 N — banked free moves from tile abilities

# A2 — Season bar (the React src/ui/seasonStrip.tsx port). Loaded via preload (NO class_name).
const SeasonBarScript := preload("res://scenes/SeasonBar.gd")
var _season_bar_box: PanelContainer     ## parchment wrapper holding the drawn strip
var _season_bar                         ## Control (SeasonBarScript) — the drawn strip

# Chain-progress bar.
var _chain_prog_label: Label            ## "{res}: {progress}/{threshold}"
var _chain_prog_track: Panel            ## DIM track behind the fill
var _chain_prog_fill: Panel             ## MOSS→GOLD fill (width = ratio * track width)
var _chain_prog_track_w: float = 0.0    ## current track inner width (recomputed on layout)
## A3 — the escalating chain-STAGE banner ("BONUS!"/"DOUBLE!"/…) overlaid top-right on the
## chain-progress track, shown only while a live chain has earned >= 1 upgrade.
var _chain_stage_label: Label
## A3 — live-drag chain tracking, used to colour the chain-progress bar by the chain's STAGE
## (Constants.chain_stage_index) WHILE dragging. Pushed by Main (_on_chain_changed → set_live_chain).
var _live_chain_len: int = 0
var _live_chain_tile: int = Constants.EMPTY

# Stockpile chip panel.
var _stockpile_title: Label             ## "STOCKPILE · N kinds" header (React parity)
var _stockpile_grid: GridContainer      ## 4-col grid of resource chips
var _stockpile_empty: Label             ## muted "Stockpile empty" placeholder

# Top-bar / stockpile container refs, repositioned in _layout_hud().
var _topbar: PanelContainer
var _chain_prog_box: PanelContainer
var _stockpile_box: PanelContainer

# M4b chain-progress tracking: the last resolved resource + its threshold.
var _last_res: String = ""
var _last_threshold: int = 0

# ── M8d ToolPalette ────────────────────────────────────────────────────────────
var _tool_palette_box: PanelContainer   ## outer parchment card (hidden when no tools)
var _tool_buttons: Dictionary = {}      ## {tool_id: Button} — rebuilt on each _refresh_tools()

# ── Tool-armed banner (the React "TOOL ARMED" card) ─────────────────────────────
var _tool_armed_box: PanelContainer     ## outer ember card (hidden unless armed)
var _tool_armed_title: Label            ## "⚡ Tool armed · ×N left"
var _tool_armed_name: Label             ## tool label (e.g. "Sickle")
var _tool_armed_desc: Label             ## tool description
var _tool_disarm_btn: Button            ## "✖ Disarm" (NOT in _tool_buttons — that's tool slots only)

# ── Bottom navigation bar (matches the React 5-tab BottomNav) ──────────────────
const NAV_HEIGHT := UiKit.NAV_RESERVE     ## bottom-bar height (also the reserved layout gap)
const LEVEL_PILL_W := 54                 ## inner width of the "Lv N" XP pill
var _nav_layer: CanvasLayer              ## dedicated layer above the HUD so the bar is never covered
var _nav_tabs: Dictionary = {}           ## {nav_key: {button, underline, highlight, label}} for restyle
var _nav_current: String = ""            ## active tab key ("town"/"inventory"/"craft"/"map"/"folk"), "" = board

# ── M4e reward "juice" ────────────────────────────────────────────────────────
var _fx_layer: CanvasLayer

## Build the entire HUD. Main calls this once (after injecting game + board) at the SAME point
## the old _build_hud ran, so z-order/layer ordering is identical.
func build() -> void:
	_build_hud()

# ── HUD ────────────────────────────────────────────────────────────────────

func _build_hud() -> void:
	# Background sits on a CanvasLayer BEHIND the board (layer -1); labels sit on
	# a layer ABOVE it (layer 1). The board itself is plain Node2D canvas (layer
	# 0) in between, so it draws over the backdrop and under the text.
	var bg_layer := CanvasLayer.new()
	bg_layer.layer = -1
	add_child(bg_layer)
	var bg := ColorRect.new()
	bg.color = Palette.FRAME_BG                        # warm parchment app frame
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bg_layer.add_child(bg)

	var layer := CanvasLayer.new()
	layer.layer = 1
	add_child(layer)

	# M4e — reward-chip FX layer, ABOVE the HUD so the flying chips render over the
	# top-bar pills (especially the coin pill they fly toward). Full-screen, no input.
	_fx_layer = CanvasLayer.new()
	_fx_layer.layer = 2
	add_child(_fx_layer)

	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE   # never eat board drags
	layer.add_child(root)

	var heading_font: Font = UiKit.heading_font()   # Cinzel (bold) when present, else null

	# ── A. Parchment top-bar of pills ─────────────────────────────────────────
	# A full-width soft-parchment bar with an iron bottom border + a soft shadow,
	# holding the settlement title on the left and the live coins/tier/biome pills
	# (plus boss/rats pills) on the right.
	_topbar = PanelContainer.new()
	_topbar.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_topbar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_topbar.add_theme_stylebox_override("panel", _topbar_box())
	root.add_child(_topbar)

	var topbar_margin := MarginContainer.new()
	topbar_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	# The old left-strip "🏠 Town" floating button is gone (folded into the bottom nav),
	# so the settlement title reclaims the left edge. The right margin must clear the
	# floating ⚙ menu button (top-right): it sits at offset_right -18 and is ≈54px wide
	# (glyph 22 + parchment_box 14+14 h-pad + 2+2 border), so its LEFT edge is ≈72px from
	# the screen edge. A 60px margin let the right-most pill (biome) extend to 660px and
	# tuck its last ~12px UNDER the ⚙ box — visible on every screen as a clipped "Farm"
	# pill. 86px (= 72 footprint + ~14 gap) keeps the pill cluster clear of the ⚙.
	topbar_margin.add_theme_constant_override("margin_left", 18)
	topbar_margin.add_theme_constant_override("margin_right", 86)
	topbar_margin.add_theme_constant_override("margin_top", 10)
	topbar_margin.add_theme_constant_override("margin_bottom", 10)
	_topbar.add_child(topbar_margin)

	var topbar_row := HBoxContainer.new()
	topbar_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	topbar_row.add_theme_constant_override("separation", 8)
	topbar_margin.add_child(topbar_row)

	# LEFT — the in-fiction settlement name in Cinzel (parity with the original's
	# heading). Replaces the old "puzzleDrag2 · Godot M3" debug title.
	var title := Label.new()
	title.text = "Hearthwood Vale"
	title.add_theme_font_size_override("font_size", 26)
	title.add_theme_color_override("font_color", Palette.INK)
	if heading_font != null:
		title.add_theme_font_override("font", heading_font)
	title.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	title.mouse_filter = Control.MOUSE_FILTER_IGNORE
	# The title EXPANDs to fill the slack (left-aligned, so it reads the same as before) and
	# CLIPS rather than overflow: when many pills are visible (a boss fight adds the boss/rats
	# pills) the row could otherwise grow past the bar and shove the right-most pill under the
	# ⚙. With clip_text the title yields its width to the pills first, so the pill cluster is
	# never pushed off the edge — the title just truncates with an ellipsis in that rare case.
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.clip_text = true
	topbar_row.add_child(title)

	# RIGHT — the pill cluster. coins (gold), tier (ink), biome (moss/ember), then
	# the conditionally-visible boss + rats pills.
	var coin_box := UiKit.make_pill("🪙 0", Palette.EMBER)
	_coin_pill = coin_box.get_meta("label")
	topbar_row.add_child(coin_box)

	# Level pill — React's orange "Lv N" chip with an XP progress fill (almanac level).
	_level_pill_box = _build_level_pill()
	topbar_row.add_child(_level_pill_box)

	var tier_box := UiKit.make_pill("Camp · 0/3", Palette.INK)
	_tier_pill = tier_box.get_meta("label")
	topbar_row.add_child(tier_box)

	var biome_box := UiKit.make_pill("Farm", Palette.MOSS)
	_biome_pill = biome_box.get_meta("label")
	topbar_row.add_child(biome_box)

	# Boss pill — cool ice-blue; hidden unless a boss fight is active.
	_boss_pill_box = UiKit.make_pill("⚔ —", Color(0.20, 0.36, 0.52))
	_boss_pill = _boss_pill_box.get_meta("label")
	_boss_pill_box.visible = false
	topbar_row.add_child(_boss_pill_box)

	# Rats pill — warm rust; hidden until rats are a live threat (Town 2 done).
	_rats_pill_box = UiKit.make_pill("🐀 —", Palette.EMBER)
	_rats_pill = _rats_pill_box.get_meta("label")
	_rats_pill_box.visible = false
	topbar_row.add_child(_rats_pill_box)

	# M3j — runes pill (the harbor's premium reward). A cool sea-teal; shown whenever the
	# player owns at least one rune (captured a giant pearl). Hidden at 0 so it doesn't
	# clutter the bar before the harbor arc.
	_runes_pill_box = UiKit.make_pill("🔮 0", Color(0.18, 0.46, 0.50))
	_runes_pill = _runes_pill_box.get_meta("label")
	_runes_pill_box.visible = false
	topbar_row.add_child(_runes_pill_box)

	# Free-moves pill — banked free moves granted by tile-variant abilities (React's free-moves
	# count). A cool moss-green; shown only when game.free_moves() > 0 so it stays out of the bar
	# until a free-moves tile (Palm / Clover / Melon / Turkey) has banked one this run.
	_free_moves_pill_box = UiKit.make_pill("👟 0", Palette.GO_GREEN)
	_free_moves_pill = _free_moves_pill_box.get_meta("label")
	_free_moves_pill_box.visible = false
	topbar_row.add_child(_free_moves_pill_box)

	# ── A2. Season bar — the full-width seasonal progress strip (above the chain bar) ──
	# The React src/ui/seasonStrip.tsx port: four proportional gradient segments + a wagon
	# marker + a right "N TURNS LEFT" numeral panel. Built once here, refreshed on every
	# resolved farm chain (_refresh_season_bar) and repositioned in _layout_hud.
	_build_season_bar(root)

	# ── B. Chain-progress bar (just under the season bar) ─────────────────────
	# A thin parchment pill holding a small label and a 2-color progress fill: a DIM
	# track with a MOSS→GOLD foreground whose width tracks the fractional progress
	# toward the next unit of the last-chained resource.
	_chain_prog_box = PanelContainer.new()
	_chain_prog_box.set_anchors_preset(Control.PRESET_CENTER_TOP)
	_chain_prog_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_chain_prog_box.add_theme_stylebox_override("panel", UiKit.parchment_box(Palette.PARCHMENT))
	root.add_child(_chain_prog_box)

	var prog_margin := MarginContainer.new()
	prog_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	prog_margin.add_theme_constant_override("margin_left", 12)
	prog_margin.add_theme_constant_override("margin_right", 12)
	prog_margin.add_theme_constant_override("margin_top", 6)
	prog_margin.add_theme_constant_override("margin_bottom", 8)
	_chain_prog_box.add_child(prog_margin)

	var prog_col := VBoxContainer.new()
	prog_col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	prog_col.add_theme_constant_override("separation", 4)
	prog_margin.add_child(prog_col)

	_chain_prog_label = Label.new()
	_chain_prog_label.text = "Chain tiles to gather"
	_chain_prog_label.add_theme_font_size_override("font_size", 15)
	_chain_prog_label.add_theme_color_override("font_color", Palette.INK_MID)
	_chain_prog_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_chain_prog_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	prog_col.add_child(_chain_prog_label)

	# Track + fill: a fixed-height container so the fill Panel can be width-driven.
	_chain_prog_track = Panel.new()
	_chain_prog_track.custom_minimum_size = Vector2(0, 12)
	_chain_prog_track.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_chain_prog_track.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_chain_prog_track.add_theme_stylebox_override("panel", UiKit.bar_box(Palette.DIM, Palette.IRON))
	prog_col.add_child(_chain_prog_track)

	_chain_prog_fill = Panel.new()
	_chain_prog_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_chain_prog_fill.add_theme_stylebox_override("panel", UiKit.bar_box(Palette.MOSS, Palette.MOSS))
	# Manually positioned/sized inside the track (it's a child Control, not laid out).
	_chain_prog_fill.set_anchors_preset(Control.PRESET_TOP_LEFT)
	_chain_prog_fill.position = Vector2.ZERO
	_chain_prog_fill.size = Vector2(0, 12)
	_chain_prog_track.add_child(_chain_prog_fill)

	# A3 — the chain-STAGE banner ("BONUS!"/"DOUBLE!"/…), overlaid top-right on the track and
	# drawn ABOVE the fill (added after it). Hidden at stage 0 / when no chain is in flight;
	# _refresh_chain_progress sets its text + colour from the live chain's stage. Anchored to
	# the track's top-right with a small inset (React's `top-0.5 right-2` stage label).
	_chain_stage_label = Label.new()
	_chain_stage_label.text = ""
	_chain_stage_label.add_theme_font_size_override("font_size", 11)
	_chain_stage_label.add_theme_color_override("font_color", Palette.PARCHMENT)
	_chain_stage_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.55))
	_chain_stage_label.add_theme_constant_override("outline_size", 3)
	_chain_stage_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_chain_stage_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_chain_stage_label.set_anchors_preset(Control.PRESET_FULL_RECT)
	_chain_stage_label.offset_right = -6
	_chain_stage_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_chain_stage_label.visible = false
	_chain_prog_track.add_child(_chain_stage_label)

	# Keep the fill height + track width in sync when the track is resized.
	_chain_prog_track.resized.connect(_on_chain_track_resized)

	# ── chain prompt (kept) — a slim prompt just above the board, centered ────
	# Moved DOWN (offset_top 230) + smaller (font 16) so it clears the new tool bar,
	# which now sits in the band the old offset_top 124 occupied.
	_chain_label = Label.new()
	_chain_label.text = "Drag 3+ matching tiles"
	_chain_label.add_theme_font_size_override("font_size", 16)
	_chain_label.add_theme_color_override("font_color", Palette.INK_MID)
	_chain_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_chain_label.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_chain_label.offset_top = 230
	_chain_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_chain_label)

	# ── status (kept) — action feedback near the bottom, centered ─────────────
	_status_label = Label.new()
	_status_label.text = ""
	_status_label.add_theme_font_size_override("font_size", 20)
	_status_label.add_theme_color_override("font_color", Palette.MOSS)
	_status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_status_label.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	# Lifted by NAV_HEIGHT (76) so the feedback line sits ABOVE the bottom nav bar.
	_status_label.offset_top = -56 - NAV_HEIGHT
	_status_label.offset_left = -340
	_status_label.offset_right = 340
	_status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_status_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_status_label)

	# ── orders — compact one-line readout just above the stockpile ────────────
	_orders_label = Label.new()
	_orders_label.text = "Orders:  —"
	_orders_label.add_theme_font_size_override("font_size", 16)
	_orders_label.add_theme_color_override("font_color", Palette.GOLD)
	_orders_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_orders_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_orders_label.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	# Lifted by NAV_HEIGHT (76) so the orders readout sits ABOVE the bottom nav bar.
	_orders_label.offset_top = -118 - NAV_HEIGHT
	_orders_label.offset_left = 24
	_orders_label.offset_right = -24
	_orders_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_orders_label)

	# ── C. Stockpile chip panel — parchment card below the board ──────────────
	_build_stockpile(root)

	# ── D. Tool palette — horizontal parchment bar centred above the board ────
	_build_tool_palette(root)

	# ── D2. Tool-armed banner — ember card shown only while a tap-tool is armed ──
	_build_tool_armed_banner(root)

	# ── E. Bottom navigation bar — the 5-tab BOTTOM nav (matches the React original) ──
	# Replaces the old left-edge strip of ~14 emoji buttons. Built on its OWN CanvasLayer
	# (above the board) so it never gets covered. The five tabs (Town / Inventory / Craft /
	# Map / Townsfolk) route to the existing _open_* methods; the remaining secondary
	# screens (achievements, tiles, chronicle, castle, decorations, portal, charter,
	# quests, recipes, daily, debug) moved into the ⚙ menu's "More" section (MenuScreen).
	_build_bottom_nav()

	# ── F. Floating ⚙ menu button (top-right) ──────────────────────────────────
	# Always-visible menu button (settings / new game / the "More" secondary screens),
	# pinned top-RIGHT clear of the board drag area. The top-bar already reserves a 60px
	# right margin for it. Dropped in the Main→Hud extraction (its space was kept but its
	# creation was lost) — restored here. Emits menu_requested; Main opens the MenuScreen.
	var menu_btn := Button.new()
	menu_btn.name = "MenuButton"
	menu_btn.text = "⚙"
	menu_btn.add_theme_font_size_override("font_size", 22)
	menu_btn.add_theme_color_override("font_color", Palette.INK)
	menu_btn.add_theme_color_override("font_hover_color", Palette.EMBER)
	menu_btn.add_theme_color_override("font_pressed_color", Palette.INK_MID)
	menu_btn.add_theme_stylebox_override("normal", UiKit.parchment_box(Palette.PARCHMENT))
	menu_btn.add_theme_stylebox_override("hover", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	menu_btn.add_theme_stylebox_override("pressed", UiKit.parchment_box(Palette.DIM))
	menu_btn.add_theme_stylebox_override("focus", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	menu_btn.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	menu_btn.offset_right = -18
	menu_btn.offset_top = 18
	menu_btn.grow_horizontal = Control.GROW_DIRECTION_BEGIN   # grow LEFT from the right edge
	menu_btn.pressed.connect(func(): menu_requested.emit())
	root.add_child(menu_btn)

# ── M4b HUD helpers (pills / bars / chips) ───────────────────────────────────
# Note: heading_font(), parchment_box(), make_pill(), bar_box(), card_box()
# are now in UiKit (M5a). Call via UiKit.<fn>(...).

## The top-bar surface: soft parchment fill, an iron bottom border, and a soft
## drop shadow so it reads as a raised banner over the warm app frame.
func _topbar_box() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Palette.PARCHMENT_SOFT
	sb.border_color = Palette.IRON
	sb.border_width_bottom = 2
	sb.shadow_size = 8
	sb.shadow_color = Color(0, 0, 0, 0.18)
	sb.shadow_offset = Vector2(0, 3)
	return sb

## A2 — build the season bar: a slim parchment wrapper (TOP_WIDE, full width within HUD
## margins) holding the drawn SeasonBar strip. The strip itself paints the four gradient
## segments + wagon + numeral panel in its _draw; this just frames + positions it. Built
## once here, repositioned each layout in _layout_hud, refreshed by _refresh_season_bar.
func _build_season_bar(root: Control) -> void:
	_season_bar_box = PanelContainer.new()
	_season_bar_box.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_season_bar_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	# A 3px parchment frame around the strip so it reads as a HUD card (the strip draws its
	# own dark inner border + rounded look). content margins keep the strip off the frame edge.
	var box := UiKit.card_box(Palette.PARCHMENT)
	box.set_content_margin_all(3)
	_season_bar_box.add_theme_stylebox_override("panel", box)
	# Position is set in _layout_hud (just below the top bar); seed an offset so it never
	# renders at the very top edge before the first layout.
	_season_bar_box.offset_top = 70
	root.add_child(_season_bar_box)

	_season_bar = SeasonBarScript.new()
	_season_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_season_bar_box.add_child(_season_bar)

## Build the stockpile card: a titled parchment card whose header reads
## "STOCKPILE · {distinctKinds} kinds" (React's IdleView PanelHeader port — left an
## uppercase tracked title with a moss accent dot, right the live distinct-kind count)
## above a 4-col grid of resource chips (filled in _refresh_totals), plus a styled empty
## placeholder. There is NO real per-KINDS cap in the port (the settlement cap is a
## per-resource QUANTITY cap, not a kinds limit), so the header shows just "N kinds" —
## no invented "/12" denominator.
func _build_stockpile(root: Control) -> void:
	_stockpile_box = PanelContainer.new()
	_stockpile_box.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_stockpile_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_stockpile_box.add_theme_stylebox_override("panel", UiKit.card_box(Palette.PARCHMENT))
	root.add_child(_stockpile_box)

	var col := VBoxContainer.new()
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_theme_constant_override("separation", 8)
	_stockpile_box.add_child(col)

	# Header row — a small moss accent dot + uppercase tracked "STOCKPILE · N kinds" title
	# (React PanelHeader). _refresh_totals rewrites the text from the live distinct-kind count.
	var header := HBoxContainer.new()
	header.mouse_filter = Control.MOUSE_FILTER_IGNORE
	header.add_theme_constant_override("separation", 6)
	col.add_child(header)

	var dot := Panel.new()
	dot.custom_minimum_size = Vector2(8, 8)
	dot.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var dot_sb := StyleBoxFlat.new()
	dot_sb.bg_color = Palette.MOSS
	dot_sb.set_corner_radius_all(999)
	dot.add_theme_stylebox_override("panel", dot_sb)
	# Nudge the dot to vertical centre of the title baseline via a wrapping CenterContainer.
	var dot_wrap := CenterContainer.new()
	dot_wrap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	dot_wrap.add_child(dot)
	header.add_child(dot_wrap)

	_stockpile_title = Label.new()
	_stockpile_title.text = "STOCKPILE · 0 kinds"
	_stockpile_title.add_theme_font_size_override("font_size", 14)
	_stockpile_title.add_theme_color_override("font_color", Palette.INK)
	_stockpile_title.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_stockpile_title.mouse_filter = Control.MOUSE_FILTER_IGNORE
	header.add_child(_stockpile_title)

	# Empty state — a styled inset chip (parchment-soft pill) so a fresh, empty stockpile
	# still reads as an intentional panel, not a bare cramped line.
	_stockpile_empty = Label.new()
	_stockpile_empty.text = "Stockpile empty"
	_stockpile_empty.add_theme_font_size_override("font_size", 14)
	_stockpile_empty.add_theme_color_override("font_color", Palette.INK_MID)
	_stockpile_empty.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var empty_sb := StyleBoxFlat.new()
	empty_sb.bg_color = Palette.PARCHMENT_SOFT
	empty_sb.border_color = Palette.IRON
	empty_sb.set_border_width_all(1)
	empty_sb.set_corner_radius_all(8)
	empty_sb.content_margin_left = 12
	empty_sb.content_margin_right = 12
	empty_sb.content_margin_top = 8
	empty_sb.content_margin_bottom = 8
	_stockpile_empty.add_theme_stylebox_override("normal", empty_sb)
	_stockpile_empty.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(_stockpile_empty)

	_stockpile_grid = GridContainer.new()
	_stockpile_grid.columns = 4
	_stockpile_grid.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_stockpile_grid.add_theme_constant_override("h_separation", 8)
	_stockpile_grid.add_theme_constant_override("v_separation", 8)
	col.add_child(_stockpile_grid)

## M8d — build the ToolPalette container: a HORIZONTAL parchment bar anchored
## CENTER_TOP (like the chain-progress bar) so it centres horizontally and gets
## positioned each layout in _layout_hud. It starts hidden (_refresh_tools shows/
## hides it based on game.tools). The inner HBox gets rebuilt on each refresh.
func _build_tool_palette(root: Control) -> void:
	_tool_palette_box = PanelContainer.new()
	_tool_palette_box.set_anchors_preset(Control.PRESET_CENTER_TOP)
	_tool_palette_box.mouse_filter = Control.MOUSE_FILTER_IGNORE       # children override this
	_tool_palette_box.add_theme_stylebox_override("panel", UiKit.card_box(Palette.PARCHMENT))
	_tool_palette_box.offset_top = 135    # just below the chain-progress bar; set in _layout_hud
	_tool_palette_box.visible = false      # hidden until _refresh_tools sees tools in the bag
	root.add_child(_tool_palette_box)

## Build the "Tool armed" banner ONCE: a full-width ember card pinned TOP_WIDE just
## below the top bar. It's only visible while a tap-target tool is armed (use_tool
## populates + shows it; _on_tool_target / the Disarm button hide it), so it can
## overlap the chain band underneath — the player is focused on tapping a tile.
func _build_tool_armed_banner(root: Control) -> void:
	_tool_armed_box = PanelContainer.new()
	_tool_armed_box.set_anchors_preset(Control.PRESET_TOP_WIDE)
	# Sit just BELOW the top bar (≈60px tall) so the settlement title + pills stay
	# visible; a small left/right gutter so it reads as an inset card. It can overlap
	# the chain band beneath it — only shown while armed, when the player is tapping.
	_tool_armed_box.offset_top = 70
	_tool_armed_box.offset_left = 12
	_tool_armed_box.offset_right = -12
	_tool_armed_box.add_theme_stylebox_override("panel", _tool_armed_box_style())
	_tool_armed_box.visible = false
	root.add_child(_tool_armed_box)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_top", 10)
	margin.add_theme_constant_override("margin_bottom", 12)
	_tool_armed_box.add_child(margin)

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 4)
	margin.add_child(col)

	var heading_font: Font = UiKit.heading_font()

	# Bold ember title line: "⚡ Tool armed · ×N left".
	_tool_armed_title = Label.new()
	_tool_armed_title.text = "⚡ Tool armed"
	_tool_armed_title.add_theme_font_size_override("font_size", 20)
	_tool_armed_title.add_theme_color_override("font_color", Palette.EMBER)
	if heading_font != null:
		_tool_armed_title.add_theme_font_override("font", heading_font)
	col.add_child(_tool_armed_title)

	# Tool name (e.g. "Sickle") in ink.
	_tool_armed_name = Label.new()
	_tool_armed_name.text = ""
	_tool_armed_name.add_theme_font_size_override("font_size", 18)
	_tool_armed_name.add_theme_color_override("font_color", Palette.INK)
	if heading_font != null:
		_tool_armed_name.add_theme_font_override("font", heading_font)
	col.add_child(_tool_armed_name)

	# Tool description — wraps across the full card width.
	_tool_armed_desc = Label.new()
	_tool_armed_desc.text = ""
	_tool_armed_desc.add_theme_font_size_override("font_size", 14)
	_tool_armed_desc.add_theme_color_override("font_color", Palette.INK_MID)
	_tool_armed_desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	col.add_child(_tool_armed_desc)

	# Bottom row: a bold "TAP A TILE ON THE BOARD" prompt + a "✖ Disarm" button.
	var bottom := HBoxContainer.new()
	bottom.add_theme_constant_override("separation", 12)
	col.add_child(bottom)

	var prompt := Label.new()
	prompt.text = "Tap a tile on the board"
	prompt.add_theme_font_size_override("font_size", 15)
	prompt.add_theme_color_override("font_color", Palette.EMBER)
	prompt.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	prompt.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bottom.add_child(prompt)

	_tool_disarm_btn = Button.new()
	_tool_disarm_btn.text = "✖ Disarm"
	UiKit.style_button(_tool_disarm_btn, Palette.EMBER, 6, 15)
	_tool_disarm_btn.pressed.connect(func(): disarm_requested.emit())
	bottom.add_child(_tool_disarm_btn)

## Ember-accented card StyleBox for the armed banner: a soft ember-tinted fill with
## a 2 px ember border + drop shadow so it reads as a hot "danger" banner (parity
## with React's red TOOL ARMED card), distinct from the calm parchment HUD cards.
func _tool_armed_box_style() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	# An opaque warm ember wash (ember blended ~22% over parchment) so the banner reads
	# as a hot "danger" card even over the warm app frame, not a faint tint.
	sb.bg_color = Palette.PARCHMENT.lerp(Palette.EMBER, 0.22)
	sb.border_color = Palette.EMBER
	sb.border_width_left = 3
	sb.border_width_top = 3
	sb.border_width_right = 3
	sb.border_width_bottom = 3
	sb.set_corner_radius_all(12)
	sb.shadow_size = 10
	sb.shadow_color = Color(Palette.EMBER, 0.30)
	sb.shadow_offset = Vector2(0, 3)
	return sb

## Player-facing description for a tool id (ToolConfig has no desc field — these
## mirror the React ITEMS[*].desc strings in src/constants.ts; scythe / stone_hammer
## are Godot-only additions, so their copy is written to match the same voice).
func _tool_description(id: String) -> String:
	match id:
		ToolConfig.BOMB:         return "Tap a tile — destroys a 3×3 area around it."
		ToolConfig.RAKE:         return "Tap a tile — sweeps every connected tile of the same type and collects them."
		ToolConfig.SICKLE:       return "Sweeps a single row in one stroke. Tap any tile to harvest that entire row."
		ToolConfig.AUGER:        return "Tap a column — bores straight down, clearing every tile in it."
		ToolConfig.BLAST_CHARGE: return "Tap a tile — clears its entire row and column in a cross-shaped blast."
		ToolConfig.MAGNET:       return "Tap a tile — collapses every ore tile in a 3×3 area into stone for re-chaining."
		ToolConfig.AXE:          return "Fells all tree tiles on the board instantly."
		ToolConfig.SCYTHE:       return "Sweeps six random tiles off the board in one swing."
		ToolConfig.STONE_HAMMER: return "Smashes every stone tile on the board into your stockpile."
		ToolConfig.DRILL:        return "Bores every loose dirt tile in the mine into rough stone."
		# Portal magic tools (summoned with Influence; mirror the React effect copy).
		ToolConfig.GOLDEN_APPLE:       return "Transforms every tree tile on the board into apple-fruit tiles."
		ToolConfig.GOLDEN_CARROT:      return "Transforms every grass tile on the board into carrot tiles."
		ToolConfig.GOLDEN_IDOL:        return "Transforms every grass tile on the board into cattle (cow) tiles."
		ToolConfig.GOLDEN_SHEEP:       return "Transforms every grass tile on the board into sheep herd tiles."
		ToolConfig.PHILOSOPHERS_STONE: return "Transmutes every stone tile on the board into gold tiles."
		ToolConfig.MAGIC_WAND:         return "Tap a tile — collects every tile of that type on the board."
		ToolConfig.MAGIC_SEED:         return "Restores 5 farm turns before the next harvest. No board effect."
		ToolConfig.MAGIC_FERTILIZER:   return "Biases the next 3 farm turns toward spawning wheat."
		_:                       return ""

## M8d — rebuild the tool palette from game.tools. For each owned tool with charges
## > 0 a styled Button is added labelled "{name} ×{charges}" (plus a "↗" tap hint
## for tap-target tools). Hidden completely when game.tools is empty (no phantom box).
## Registers every button in _tool_buttons keyed by id for test access.
func _refresh_tools() -> void:
	if _tool_palette_box == null:
		return
	# Clear previous buttons + the registry.
	for child in _tool_palette_box.get_children():
		child.queue_free()
	_tool_buttons.clear()

	# Collect owned tools (charges > 0) in stable ToolConfig order.
	var owned: Array = []
	if game != null:
		for id in ToolConfig.TOOL_IDS:
			var charges: int = game.tool_count(id)
			if charges > 0:
				owned.append({"id": id, "charges": charges})

	if owned.is_empty():
		_tool_palette_box.visible = false
		return

	_tool_palette_box.visible = true

	# A3 — a small uppercase "TOOLS" caption above the slot strip so the rack reads clearly
	# as a distinct TOOLS RACK (not the chain preview directly above it). The React board's
	# tool strip sits in its own labelled panel region; the caption is the port's equivalent
	# grouping cue. The icon slots below still carry the per-tool meaning.
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 4)
	_tool_palette_box.add_child(col)

	var caption := Label.new()
	caption.text = "TOOLS"
	caption.add_theme_font_size_override("font_size", 11)
	caption.add_theme_color_override("font_color", Palette.INK_MID)
	caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	caption.add_theme_constant_override("outline_size", 0)
	caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(caption)

	# A centred horizontal strip of tool SLOTS — React's tool strip: each tool is an icon
	# tile with a dark count chip in its corner, the armed one ember-highlighted.
	# A WRAPPING strip so every owned tool stays reachable no matter how many are owned
	# or how narrow the window is. A flat HBox clipped tools past the card's right edge
	# once the catalog grew (24 board tools); HFlowContainer flows left→right and wraps to
	# a new line when the row is full, inheriting the card's bounded width from `col`.
	# Stays a single centred line for the usual handful of tools.
	var row := HFlowContainer.new()
	row.add_theme_constant_override("h_separation", 8)
	row.add_theme_constant_override("v_separation", 8)
	row.alignment = FlowContainer.ALIGNMENT_CENTER
	row.size_flags_horizontal = Control.SIZE_FILL
	col.add_child(row)

	var armed_id: String = game.pending_tool if game != null else ""

	for entry in owned:
		var id: String = String(entry["id"])
		var charges: int = int(entry["charges"])
		var cfg: Dictionary = ToolConfig.get_tool(id)
		var label: String = String(cfg.get("label", id))
		var desc: String = String(cfg.get("desc", ""))
		var is_tap: bool = ToolConfig.is_tap_target(id)
		var is_armed: bool = (id == armed_id and armed_id != "")

		# Slot = a square Control holding a full-rect icon Button + a corner count badge.
		var slot := Control.new()
		slot.custom_minimum_size = Vector2(54, 54)

		var btn := Button.new()
		btn.set_anchors_preset(Control.PRESET_FULL_RECT)
		var tex := UiKit.resource_icon(id)
		if tex != null:
			btn.icon = tex
			btn.expand_icon = true
		else:
			btn.text = label                       # fallback for a tool with no art
			btn.add_theme_font_size_override("font_size", 12)
		# Tooltip carries the label + "×N" + the tool's description — the tests read
		# tooltip_text (the button itself is now icon-only, no inline text).
		btn.tooltip_text = "%s · ×%d%s" % [label, charges, ("\n" + desc if desc != "" else "")]
		# Parchment slot, ember-tinted + ember-bordered while this tool is armed.
		var slot_fill: Color = Palette.PARCHMENT_SOFT
		var slot_border: Color = Palette.IRON
		if is_armed:
			slot_fill = Color(Palette.EMBER, 0.22)
			slot_border = Palette.EMBER
		btn.add_theme_stylebox_override("normal", _tool_slot_box(slot_fill, slot_border))
		btn.add_theme_stylebox_override("hover", _tool_slot_box(slot_fill.lightened(0.06), slot_border))
		btn.add_theme_stylebox_override("pressed", _tool_slot_box(slot_fill.darkened(0.06), slot_border))
		btn.pressed.connect(func():
			tool_use_requested.emit(id)
		)
		slot.add_child(btn)

		# Count chip — a small dark rounded badge overhanging the slot's top-right corner.
		var badge := Label.new()
		badge.text = str(charges)
		badge.add_theme_font_size_override("font_size", 13)
		badge.add_theme_color_override("font_color", Palette.PARCHMENT)
		badge.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		badge.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		badge.add_theme_stylebox_override("normal", _tool_badge_box())
		badge.mouse_filter = Control.MOUSE_FILTER_IGNORE
		badge.position = Vector2(36, -6)
		slot.add_child(badge)

		# A small "↗" tap affordance bottom-left for tap-target tools.
		if is_tap:
			var tap := Label.new()
			tap.text = "↗"
			tap.add_theme_font_size_override("font_size", 12)
			tap.add_theme_color_override("font_color", Palette.INK_MID)
			tap.mouse_filter = Control.MOUSE_FILTER_IGNORE
			tap.position = Vector2(3, 34)
			slot.add_child(tap)

		row.add_child(slot)
		_tool_buttons[id] = btn

## A square parchment slot StyleBox for a tool icon button (10px radius, 2px border,
## 6px padding); the fill/border vary so the armed tool reads ember-highlighted.
func _tool_slot_box(fill: Color, border: Color) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = fill
	sb.border_color = border
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(10)
	sb.set_content_margin_all(6)
	return sb

## A small dark rounded chip for the per-tool charge count, sitting on the slot corner.
func _tool_badge_box() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Palette.INK
	sb.set_corner_radius_all(9)
	sb.content_margin_left = 6
	sb.content_margin_right = 6
	sb.content_margin_top = 1
	sb.content_margin_bottom = 1
	return sb

# ── Bottom navigation bar ─────────────────────────────────────────────────────

## Build the 5-tab bottom nav (the React BottomNav port). A full-width paper bar
## pinned PRESET_BOTTOM_WIDE on its OWN CanvasLayer (layer 1, like the HUD root, but
## a dedicated layer so the board never covers it). The bar has a 2px iron top border
## + a soft upward shadow; inside, an HBox of five equal-width tab Buttons. Each tab is
## a flat Button (transparent normal box) over a centred VBox of an emoji icon Label +
## a small text Label, plus a 3px ember ColorRect underline across its TOP edge (hidden
## until active) and a faint ember highlight ColorRect behind it. Tabs emit nav_selected;
## _refresh_nav() restyles them from _nav_current.
func _build_bottom_nav() -> void:
	_nav_layer = CanvasLayer.new()
	_nav_layer.layer = 1
	add_child(_nav_layer)

	# Outer bar — a paper PanelContainer spanning the full width at the bottom.
	var bar := PanelContainer.new()
	bar.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	bar.offset_top = -NAV_HEIGHT
	bar.add_theme_stylebox_override("panel", _nav_box())
	_nav_layer.add_child(bar)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 0)
	bar.add_child(row)

	# The five tabs, in React order. Each: {key, icon, label}.
	var specs := [
		{"key": "town", "icon": "🏠", "label": "Town"},
		{"key": "inventory", "icon": "📦", "label": "Inventory"},
		{"key": "craft", "icon": "🔨", "label": "Craft"},
		{"key": "map", "icon": "🗺", "label": "Map"},
		{"key": "folk", "icon": "👥", "label": "Townsfolk"},
	]
	for spec in specs:
		row.add_child(_make_nav_tab(
			String(spec["key"]), String(spec["icon"]), String(spec["label"])))

	_refresh_nav()

## Build a single bottom-nav tab: an equal-width (SIZE_EXPAND_FILL) flat Button holding
## a faint highlight ColorRect (active tint), a top ember underline ColorRect (active
## marker), and a centred VBox of an icon Label + a text Label. Tapping it emits
## nav_selected(key) — Main routes it. Registers the parts in _nav_tabs[key] for _refresh_nav().
func _make_nav_tab(key: String, icon: String, label_text: String) -> Button:
	var btn := Button.new()
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	btn.custom_minimum_size = Vector2(0, NAV_HEIGHT)
	btn.clip_contents = true
	# Flat, transparent button — the bar paper shows through; active state is drawn by
	# the highlight + underline rects layered under/over the content.
	var flat := StyleBoxEmpty.new()
	btn.add_theme_stylebox_override("normal", flat)
	btn.add_theme_stylebox_override("hover", flat)
	btn.add_theme_stylebox_override("pressed", flat)
	btn.add_theme_stylebox_override("focus", flat)
	btn.focus_mode = Control.FOCUS_NONE
	# A tap emits nav_selected(key); Main routes it through _switch_primary_view (so opening
	# one primary view first hides any other open one — no stacking) then sets the active tab.
	btn.pressed.connect(func(): nav_selected.emit(key))

	# Faint ember highlight behind the content (shown only when active).
	var highlight := ColorRect.new()
	highlight.color = Color(Palette.EMBER.r, Palette.EMBER.g, Palette.EMBER.b, 0.10)
	highlight.set_anchors_preset(Control.PRESET_FULL_RECT)
	highlight.mouse_filter = Control.MOUSE_FILTER_IGNORE
	highlight.visible = false
	btn.add_child(highlight)

	# 3px ember underline across the TOP edge (the active marker).
	var underline := ColorRect.new()
	underline.color = Palette.EMBER
	underline.set_anchors_preset(Control.PRESET_TOP_WIDE)
	underline.offset_top = 0
	underline.offset_bottom = 3
	underline.mouse_filter = Control.MOUSE_FILTER_IGNORE
	underline.visible = false
	btn.add_child(underline)

	# Centred icon + label.
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	btn.add_child(center)

	var vbox := VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_theme_constant_override("separation", 2)
	vbox.mouse_filter = Control.MOUSE_FILTER_IGNORE
	center.add_child(vbox)

	var icon_lbl := Label.new()
	icon_lbl.text = icon
	icon_lbl.add_theme_font_size_override("font_size", 22)
	icon_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	icon_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vbox.add_child(icon_lbl)

	var text_lbl := Label.new()
	text_lbl.text = label_text
	text_lbl.add_theme_font_size_override("font_size", 12)
	text_lbl.add_theme_color_override("font_color", Palette.INK_MID)
	text_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	text_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vbox.add_child(text_lbl)

	_nav_tabs[key] = {"button": btn, "underline": underline, "highlight": highlight, "label": text_lbl}
	return btn

## Restyle the five tabs from _nav_current: the active tab shows its ember underline +
## faint highlight and inks its label; inactive tabs hide both and dim the label. Safe
## to call before the nav is built (no-op) and on every _open_* / _on_*_closed.
func _refresh_nav() -> void:
	for key in _nav_tabs.keys():
		var parts: Dictionary = _nav_tabs[key]
		var active: bool = (key == _nav_current)
		(parts["underline"] as ColorRect).visible = active
		(parts["highlight"] as ColorRect).visible = active
		(parts["label"] as Label).add_theme_color_override(
			"font_color", Palette.INK if active else Palette.INK_MID)

## Clear the active-tab marker (back on the board) and restyle the five tabs. Called
## from every _on_*_closed and the apply_deeplink("board") close path so the nav never
## shows a stale active tab once the player is back on the board.
func _clear_nav() -> void:
	_nav_current = ""
	_refresh_nav()

## Set the active-tab key (Main calls this after routing a nav tap or an _open_*). Does
## NOT restyle — the caller pairs it with _refresh_nav(), mirroring the original inline
## `_nav_current = "..."; _refresh_nav()` pattern.
func set_nav_current(key: String) -> void:
	_nav_current = key

## The bottom-nav bar surface: a paper fill, a 2px iron TOP border, and a soft UPWARD
## drop shadow so the bar reads as a raised tray over the board.
func _nav_box() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Palette.PAPER
	sb.border_color = Palette.IRON
	sb.border_width_top = 2
	sb.shadow_size = 8
	sb.shadow_color = Color(0, 0, 0, 0.18)
	sb.shadow_offset = Vector2(0, -3)
	return sb

## A single stockpile chip: a small soft-parchment rounded PanelContainer holding a
## "{res} {count}" Label (ink text). Used by _refresh_totals to populate the grid.
func _make_stock_chip(res: String, count: int) -> PanelContainer:
	var box := PanelContainer.new()
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sb := StyleBoxFlat.new()
	sb.bg_color = Palette.PARCHMENT_SOFT
	sb.border_color = Palette.IRON
	sb.border_width_left = 1
	sb.border_width_top = 1
	sb.border_width_right = 1
	sb.border_width_bottom = 1
	sb.corner_radius_top_left = 8
	sb.corner_radius_top_right = 8
	sb.corner_radius_bottom_left = 8
	sb.corner_radius_bottom_right = 8
	sb.content_margin_left = 8
	sb.content_margin_right = 8
	sb.content_margin_top = 4
	sb.content_margin_bottom = 4
	box.add_theme_stylebox_override("panel", sb)
	# React's stockpile chips are a compact icon + count. Show the same procedural icon
	# when we have art for the key; fall back to the title-cased name when we don't, so
	# board-only keys (rat, mysterious_ore, …) still read.
	var row := HBoxContainer.new()
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_theme_constant_override("separation", 4)
	box.add_child(row)
	var icon := UiKit.make_icon(res, 26.0)
	if icon != null:
		row.add_child(icon)
	var lbl := Label.new()
	lbl.text = "%d" % count if icon != null else "%s  %d" % [UiKit.pretty_name(res), count]
	lbl.add_theme_font_size_override("font_size", 16)
	lbl.add_theme_color_override("font_color", Palette.INK)
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(lbl)
	return box

## Keep the chain-progress fill height matched to the track, remember the inner
## width (border-inset), and re-apply the current ratio so a resize keeps the fill
## proportional.
func _on_chain_track_resized() -> void:
	if _chain_prog_track == null or _chain_prog_fill == null:
		return
	var h: float = _chain_prog_track.size.y
	_chain_prog_track_w = maxf(0.0, _chain_prog_track.size.x - 2.0)  # inset for the 1px border
	_chain_prog_fill.position = Vector2(1, 1)
	_chain_prog_fill.size.y = maxf(0.0, h - 2.0)
	_apply_chain_progress_fill()

# ── M4e reward "juice" (fly-to-coins + pill pulse) ───────────────────────────

## Spawn a small parchment reward chip at the board's centre and fly it to the coin
## pill — the original game's "rewardTrajectory" feedback. The chip rises slightly,
## swoops toward the coin pill (an eased arc), scales down + fades over the back end
## of the flight, then frees itself. No-op (and never crashes) if the board or coin
## pill aren't present yet. One chip per resolved chain — they're cheap + auto-freed.
func spawn_reward_chip(text: String, color: Color, icon_key: String = "") -> void:
	if _fx_layer == null or board == null or _coin_pill == null:
		return
	# A tiny parchment pill (PanelContainer + Label) styled like the HUD chips, so the
	# flying reward reads as a piece of the stockpile leaping toward the coin purse. When
	# an icon_key is given, the gathered good's icon rides along with the "+N" text.
	var chip := PanelContainer.new()
	chip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chip.add_theme_stylebox_override("panel", _make_chip_box())
	var inner := HBoxContainer.new()
	inner.add_theme_constant_override("separation", 4)
	inner.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chip.add_child(inner)
	var icon := UiKit.make_icon(icon_key, 24.0) if icon_key != "" else null
	if icon != null:
		inner.add_child(icon)
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_size_override("font_size", 18)
	lbl.add_theme_color_override("font_color", color)
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	inner.add_child(lbl)
	_fx_layer.add_child(chip)
	# Let the container compute its size so we can centre the pivot + start position.
	chip.reset_size()
	var half: Vector2 = chip.size * 0.5
	chip.pivot_offset = half

	# START — the board's centre in screen space (the board is a plain Node2D at
	# board.global_position with a board-local origin), nudged up so it reads as
	# rising off the board. END — the coin pill's on-screen centre.
	var board_center: Vector2 = board.global_position + board.board_origin + board.board_pixel_size() * 0.5
	var start: Vector2 = board_center - Vector2(0, board.tile_size * 0.6) - half
	var end: Vector2 = _coin_pill.get_global_rect().get_center() - half
	chip.position = start
	chip.scale = Vector2(1.2, 1.2)

	# Fly: an eased (accelerating) swoop start→end over ~0.7s; in parallel scale down
	# 1.2→0.7 and fade the alpha 1→0 over the last ~40% of the flight, then free.
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(chip, "position", end, 0.7).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tw.tween_property(chip, "scale", Vector2(0.7, 0.7), 0.7).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tw.tween_property(chip, "modulate:a", 0.0, 0.28).set_delay(0.42)
	tw.chain().tween_callback(chip.queue_free)
	# A little bounce on the coin pill so the purse "reacts" as the reward leaves.
	pulse_coin_pill()

## A soft scale bounce (1 → 1.18 → 1 over ~0.3s) on the coin pill's wrapper so it
## reacts when a reward chip is dispatched. The pill Label lives inside a
## PanelContainer; pulsing the parent (with a centred pivot) bounces the whole pill.
func pulse_coin_pill() -> void:
	if _coin_pill == null:
		return
	var box: Control = _coin_pill.get_parent() as Control
	if box == null:
		return
	box.pivot_offset = box.size * 0.5
	var tw := create_tween()
	tw.tween_property(box, "scale", Vector2(1.18, 1.18), 0.12).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_property(box, "scale", Vector2.ONE, 0.18).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)

## A small parchment StyleBox for a flying reward chip — soft fill, thin iron border,
## fully rounded, snug padding (matches the HUD pill look at a smaller scale).
func _make_chip_box() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Palette.PARCHMENT_SOFT
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
	sb.content_margin_top = 4
	sb.content_margin_bottom = 4
	sb.shadow_size = 4
	sb.shadow_color = Color(0, 0, 0, 0.20)
	sb.shadow_offset = Vector2(0, 2)
	return sb

# ── Tool-armed banner show/hide (called by Main's tool dispatch) ──────────────

## Populate + show the "Tool armed" banner for a just-armed tap-target tool: the
## "⚡ Tool armed · ×N left" title (N = remaining charges, the one being armed
## included since the charge isn't spent until the tap), the tool name, and its
## description.
func show_tool_armed_banner(id: String) -> void:
	if _tool_armed_box == null:
		return
	var charges: int = game.tool_count(id) if game != null else 0
	_tool_armed_title.text = "⚡ Tool armed · ×%d left" % charges
	_tool_armed_name.text = ToolConfig.tool_label(id)
	_tool_armed_desc.text = _tool_description(id)
	_tool_armed_box.visible = true

## Hide the "Tool armed" banner (after the tap fires, or on Disarm).
func hide_tool_armed_banner() -> void:
	if _tool_armed_box != null:
		_tool_armed_box.visible = false

# ── live-chain tracking (pushed by Main from _on_chain_changed) ───────────────

## A3 — Main pushes the live drag state (length + the chained tile type) so the
## chain-progress bar can colour its fill/accent by the chain's STAGE while dragging. A
## length of 0 ends the drag → the bar reverts to its calm fractional-progress tint.
func set_live_chain(length: int, tile: int) -> void:
	_live_chain_len = length
	_live_chain_tile = tile

# ── HUD layout (pinned by Main's _layout) ─────────────────────────────────────

## Pin the width-anchored HUD containers to the current viewport: the top-bar spans
## the full width at the top; the chain-progress bar centres just under it; the
## stockpile card spans most of the width below the board.
func _layout_hud(vp: Vector2) -> void:
	# The top-bar is PRESET_TOP_WIDE (anchors left=0..right=1), so zero L/R offsets
	# already make it span the full viewport width — don't set size.x (that fights
	# the anchors and triggers a "non-equal opposite anchors" warning).
	if _topbar != null:
		_topbar.offset_left = 0
		_topbar.offset_right = 0
		_topbar.offset_top = 0
	# A2 — the season bar spans the full width within the HUD margins, just below the top bar.
	# It's TOP_WIDE-anchored, so left/right OFFSETS (not size.x) inset it; clamp the inset like
	# the stockpile card so it stays full-width but never touches the screen edges.
	if _season_bar_box != null:
		var sb_margin: float = maxf(12.0, vp.x * 0.03)
		_season_bar_box.offset_left = sb_margin
		_season_bar_box.offset_right = -sb_margin
		_season_bar_box.offset_top = 66.0
	if _chain_prog_box != null:
		var cw: float = minf(520.0, vp.x - 32.0)
		_chain_prog_box.offset_left = -cw / 2.0
		_chain_prog_box.offset_right = cw / 2.0
		# Pushed below the season bar (top 66 + 52 strip + 6 frame ≈ 124).
		_chain_prog_box.offset_top = 128.0
	if _tool_palette_box != null:
		# Centre the horizontal tool bar just below the chain-progress bar and above the board
		# (top ≈ vp.y * 0.24). It's CENTER_TOP-anchored, so a symmetric max-width offset keeps
		# it centred while letting it shrink on narrow viewports.
		var tw: float = minf(560.0, vp.x - 32.0)
		_tool_palette_box.offset_left = -tw / 2.0
		_tool_palette_box.offset_right = tw / 2.0
		_tool_palette_box.offset_top = 188.0
	if _stockpile_box != null:
		var margin: float = maxf(16.0, vp.x * 0.04)
		_stockpile_box.offset_left = margin
		_stockpile_box.offset_right = -margin
		# Sit below the board but ABOVE the bottom nav. Clamp the top so the card's
		# (content-driven) height still has room to clear the nav on short viewports:
		# reserve NAV_HEIGHT for the bar + ~150px for the card + an 8px gap.
		var stock_top: float = vp.y * 0.74
		var stock_ceiling: float = vp.y - float(NAV_HEIGHT) - 150.0 - 8.0
		_stockpile_box.offset_top = minf(stock_top, maxf(0.0, stock_ceiling))

# ── refreshers (re-pointed from Main; names kept for the capture-script contract) ──

## M4b — rebuild the stockpile chip grid from inventory (skip zero counts, sort by
## key). KEEPS the name `_refresh_totals` so the capture scripts + Main still call
## it; the body repopulates the GridContainer of chips.
func _refresh_totals() -> void:
	if _stockpile_grid == null:
		return
	# Clear the previous chips.
	for child in _stockpile_grid.get_children():
		child.queue_free()
	var keys: Array = []
	if game != null:
		for key in game.inventory:
			if int(game.inventory[key]) > 0:
				keys.append(key)
	keys.sort()
	# A3 — header reflects the live distinct-kind count (the number of resource keys with a
	# positive count). React's IdleView shows "{owned}/{total} kinds"; the port has no real
	# kinds cap, so it shows just "STOCKPILE · N kinds" (singular-aware), no invented "/12".
	if _stockpile_title != null:
		var n_kinds: int = keys.size()
		_stockpile_title.text = "STOCKPILE · %d %s" % [n_kinds, "kind" if n_kinds == 1 else "kinds"]
	if keys.is_empty():
		if _stockpile_empty != null:
			_stockpile_empty.visible = true
		_stockpile_grid.visible = false
		return
	if _stockpile_empty != null:
		_stockpile_empty.visible = false
	_stockpile_grid.visible = true
	for key in keys:
		_stockpile_grid.add_child(_make_stock_chip(String(key), int(game.inventory[key])))

## M4b — coins now live in the top-bar coin pill (the old _meta_label is gone). The
## per-run turn counter is no longer surfaced (it was debug noise); the pill shows
## just the live coin balance. KEEPS the name so callers don't break.
func _refresh_meta() -> void:
	if _coin_pill == null or game == null:
		return
	_coin_pill.text = "🪙 %d" % game.coins
	_refresh_level()
	_refresh_free_moves()

## Tile-variant free-moves readout. Shows "👟 N" whenever the player has banked free moves from a
## tile ability (game.free_moves() > 0); HIDDEN at 0 so it never disturbs the bar / visual goldens
## on a fresh board. Mirrors React's free-moves count in the HUD. Refreshed via _refresh_meta on
## every live update (coins/turn/state change).
func _refresh_free_moves() -> void:
	if _free_moves_pill_box == null or _free_moves_pill == null or game == null:
		return
	var n: int = game.free_moves()
	if n <= 0:
		_free_moves_pill_box.visible = false
		return
	_free_moves_pill.text = "👟 %d" % n
	_free_moves_pill_box.visible = true

## Build the orange "Lv N" almanac pill: a rounded ember chip holding a fixed-width inner
## Control that stacks a brighter-orange XP fill (left-anchored, width = fraction into the
## current level) behind a centred "Lv N" label — React's level chip in the top bar.
func _build_level_pill() -> PanelContainer:
	var box := PanelContainer.new()
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sb := StyleBoxFlat.new()
	sb.bg_color = Palette.EMBER                 # orange XP track
	sb.border_color = Palette.IRON
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(999)
	sb.content_margin_left = 3
	sb.content_margin_right = 3
	sb.content_margin_top = 2
	sb.content_margin_bottom = 2
	box.add_theme_stylebox_override("panel", sb)

	var inner := Control.new()
	inner.custom_minimum_size = Vector2(LEVEL_PILL_W, 22)
	inner.clip_contents = true
	inner.mouse_filter = Control.MOUSE_FILTER_IGNORE
	box.add_child(inner)

	_level_xp_fill = ColorRect.new()
	_level_xp_fill.color = Palette.GOLD_BRIGHT  # brighter than the ember track
	_level_xp_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_level_xp_fill.position = Vector2.ZERO
	_level_xp_fill.size = Vector2(0, 22)
	inner.add_child(_level_xp_fill)

	_level_label = Label.new()
	_level_label.text = "Lv 1"
	_level_label.add_theme_font_size_override("font_size", 14)
	_level_label.add_theme_color_override("font_color", Palette.PARCHMENT)
	_level_label.set_anchors_preset(Control.PRESET_FULL_RECT)
	_level_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_level_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_level_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	inner.add_child(_level_label)
	return box

## Update the level pill text + XP fill width from the almanac level/xp. The fill spans
## the fraction of XP earned into the current level (xp % 150 of 150).
func _refresh_level() -> void:
	if _level_label == null or game == null:
		return
	_level_label.text = "Lv %d" % game.almanac_level
	if _level_xp_fill != null:
		var into: float = float(game.almanac_xp % AlmanacConfig.XP_PER_LEVEL) \
			/ float(AlmanacConfig.XP_PER_LEVEL)
		_level_xp_fill.size = Vector2(LEVEL_PILL_W * clampf(into, 0.0, 1.0), 22)

## M4b — the settlement tier + plots now live in the top-bar tier pill (e.g.
## "City · 2/11"); a "▲" prefix hints when a tier-up is affordable. KEEPS the name.
func _refresh_settlement() -> void:
	if _tier_pill == null or game == null:
		return
	var s := game.settlement
	var text: String = "%s · %d/%d" % [s.tier_name(), game.plots_used(), s.plots()]
	if game.can_tier_up():
		text = "▲ " + text
	_tier_pill.text = text

## M4b — plots are shown inside the tier pill (used/total), so this just re-points at
## _refresh_settlement to keep the tier pill's plot count current. KEEPS the name so
## the build/demolish paths that call it still update the HUD.
func _refresh_buildings() -> void:
	_refresh_settlement()

func _refresh_orders() -> void:
	if _orders_label == null or game == null:
		return
	if game.orders.is_empty():
		_orders_label.text = "Orders:  —"
		return
	# Compact one-line readout: each order as "qty×resource → rewardc".
	var parts: Array = []
	for order in game.orders:
		parts.append("%d×%s → %dc" % [int(order["qty"]), order["resource"], int(order["reward"])])
	_orders_label.text = "Orders:  " + "   ·   ".join(parts)

## M3f/M4b: show the current biome in the top-bar biome pill. On the farm it reads
## "Farm" (moss); on an expedition "⛏ Mine · N" (ember). Mirrors GameState.
func _refresh_biome() -> void:
	if _biome_pill == null or game == null:
		return
	if game.is_in_mine():
		# M3i: surface the rubble hazard hint in the biome pill so the player knows the
		# cave-in clutter clears by mining (a STONE chain) rather than by chaining it.
		_biome_pill.text = "⛏ Mine · %d · clear rubble by mining" % game.mine_turns_left
		_biome_pill.add_theme_color_override("font_color", Palette.EMBER)
	elif game.is_in_harbor():
		# M3j: the harbor pill surfaces the live tide + remaining turns ("🌊 Harbor · <tide> ·
		# N"), mirroring the mine pill. A cool sea-teal so it reads as water.
		_biome_pill.text = "🌊 Harbor · %s · %d" % [game.fish_tide, game.harbor_turns_left]
		_biome_pill.add_theme_color_override("font_color", Color(0.18, 0.46, 0.50))
	else:
		_biome_pill.text = "Farm"
		_biome_pill.add_theme_color_override("font_color", Palette.MOSS)

## M3g/M4b: the capstone boss now lives in the top-bar boss pill, shown only while a
## fight is active ("⚔ <name> cur/max"). Hidden otherwise. Mirrors GameState.
func _refresh_boss() -> void:
	if _boss_pill_box == null or _boss_pill == null or game == null:
		return
	if game.is_boss_active():
		var max_hp: int = BossConfig.boss_hp(game.boss_active)
		_boss_pill.text = "⚔ %s %d/%d" % [
			BossConfig.boss_name(game.boss_active), game.boss_hp, max_hp]
		_boss_pill_box.visible = true
	else:
		_boss_pill_box.visible = false

## M3h/M4b: the Town-3 rats hazard now lives in the top-bar rats pill, shown only
## once rats are a live threat (Town 2 done). With a Ratcatcher it reads "🐀 N/5"
## (charges left); without one it reads "🐀 active". Mirrors GameState.
func _refresh_rats() -> void:
	if _rats_pill_box == null or _rats_pill == null or game == null:
		return
	if not game.rats_enabled():
		_rats_pill_box.visible = false
		return
	if game.has_ratcatcher():
		_rats_pill.text = "🐀 %d/%d" % [game.ratcatcher_charges_left(), GameState.RATCATCHER_CHARGES]
	else:
		_rats_pill.text = "🐀 active"
	_rats_pill_box.visible = true

## M3j — the runes pill (the harbor's premium reward). Shown only once the player owns at
## least one rune (captured a giant pearl); reads "🔮 N". Hidden at 0 so it stays out of the
## bar before the harbor arc. Mirrors GameState.runes.
func _refresh_runes() -> void:
	if _runes_pill_box == null or _runes_pill == null or game == null:
		return
	if game.runes <= 0:
		_runes_pill_box.visible = false
		return
	_runes_pill.text = "🔮 %d" % game.runes
	_runes_pill_box.visible = true

## A2 — push the live farm season state onto the season bar so its segments highlight, its
## wagon marker slides, and its "N TURNS LEFT" numeral track the farm cycle. Reads the budget
## + turns-used + season index straight off GameState (current_season_index, farm_turns_used,
## farm_turn_budget). Called after a resolved farm chain advances the cycle and once on load.
func _refresh_season_bar() -> void:
	if _season_bar == null or game == null:
		return
	# Task C — the season bar tracks a bounded farm RUN; with NO run active the player is in the
	# town home and the run-turn strip is meaningless, so hide it. It re-shows automatically the
	# next refresh once a run starts (Main calls _refresh_season_bar() on start). Toggle the
	# parchment wrapper box (the bar node lives inside it) so the whole strip hides cleanly.
	var run_active: bool = game.farm_run_active
	if _season_bar_box != null:
		_season_bar_box.visible = run_active
	if not run_active:
		return
	_season_bar.set_state(game.farm_turns_used, game.farm_turn_budget(), game.current_season_index())

## M4b / A3 — refresh the chain-progress bar. While a LIVE chain is in flight (a drag long
## enough to produce a real resource), the label reads "{res}: {length}/{threshold}" and the
## fill is coloured by the chain's STAGE (Constants.chain_stage_index): the fill tracks the
## progress WITHIN the current stage cycle (length % threshold) and the stage banner ("BONUS!"
## /"DOUBLE!"/…) shows once earned >= 1. With NO chain in flight it falls back to the calm
## MOSS→GOLD fractional progress toward the next unit (GameState.progress, the M4b behaviour),
## and the stage banner is hidden. "Chain tiles to gather" when nothing has been chained yet.
func _refresh_chain_progress() -> void:
	if _chain_prog_label == null:
		return
	# LIVE chain — colour by stage against the chained tile's threshold.
	if _live_chain_len > 0 and _live_chain_tile != Constants.EMPTY:
		var live_threshold: int = Constants.threshold_for(_live_chain_tile)
		var live_res: String = Constants.produced_resource(_live_chain_tile)
		if live_threshold > 0 and live_threshold < Constants.NO_THRESHOLD and live_res != "":
			# React's "1/6 +1" form: progress WITHIN the current stage cycle (length % threshold)
			# plus the upgrades EARNED so far. The bar (and this counter) RESET each cycle, so the
			# "+N" banner is what conveys a banked upgrade at a boundary (matches the fill below).
			var earned: int = int(_live_chain_len / live_threshold)
			var into: int = _live_chain_len % live_threshold
			var txt: String = "%s  %d/%d" % [UiKit.pretty_name(live_res), into, live_threshold]
			if earned > 0:
				txt += "  +%d" % earned
			_chain_prog_label.text = txt
			_apply_chain_progress_fill()
			return
		# A hazard tile (RAT/RUBBLE — no producer/threshold): leave the bar on its prior
		# resting state but still drop the live tracking so the fill uses the fallback below.
	# No live chain (or a hazard chain): the resting fractional-progress view.
	if game == null or _last_res == "" or _last_threshold <= 0:
		_chain_prog_label.text = "Chain tiles to gather"
		_apply_chain_progress_fill()
		return
	var prog: int = int(game.progress.get(_last_res, 0))
	_chain_prog_label.text = "%s: %d/%d" % [_last_res, prog, _last_threshold]
	_apply_chain_progress_fill()

## Position + size + tint the chain-progress fill. Two modes:
##   LIVE chain → fill width = (length % threshold)/threshold (full at a stage boundary), tint
##     blended from the STAGE gradient (top↔bot mid) with the stage `accent` as the border; the
##     stage banner ("BONUS!"…) shows once earned >= 1 (Constants.chain_stage / CHAIN_STAGES).
##   RESTING → fill width = progress/threshold, MOSS→GOLD lerp (the M4b look); banner hidden.
func _apply_chain_progress_fill() -> void:
	if _chain_prog_fill == null or _chain_prog_track == null:
		return
	var inner_w: float = maxf(0.0, _chain_prog_track.size.x - 2.0)
	if inner_w <= 0.0:
		inner_w = _chain_prog_track_w
	var fill_h: float = maxf(0.0, _chain_prog_track.size.y - 2.0)
	_chain_prog_fill.position = Vector2(1, 1)

	# LIVE-chain stage colouring.
	if _live_chain_len > 0 and _live_chain_tile != Constants.EMPTY:
		var threshold: int = Constants.threshold_for(_live_chain_tile)
		if threshold > 0 and threshold < Constants.NO_THRESHOLD:
			var earned: int = Constants.chain_stage_index(_live_chain_len, threshold)
			var stage: Dictionary = Constants.CHAIN_STAGES[earned]
			# Progress within the CURRENT stage cycle — React resets the bar each cycle
			# (length % threshold), so at an exact boundary the bar EMPTIES and the "+N" banner
			# conveys the banked upgrade (rather than a full bar). Matches the label readout.
			var into: int = _live_chain_len % threshold
			var ratio: float = float(into) / float(threshold)
			_chain_prog_fill.size = Vector2(inner_w * clampf(ratio, 0.0, 1.0), fill_h)
			var top: Color = Color(String(stage.get("top", "#f0c14b")))
			var bot: Color = Color(String(stage.get("bot", "#d97a2a")))
			var accent: Color = Color(String(stage.get("accent", "#e07a3a")))
			_chain_prog_fill.add_theme_stylebox_override("panel", UiKit.bar_box(top.lerp(bot, 0.5), accent))
			# Stage banner: shown once an upgrade is earned (earned >= 1).
			if _chain_stage_label != null:
				var label: String = String(stage.get("label", ""))
				_chain_stage_label.visible = earned >= 1 and label != ""
				_chain_stage_label.text = label
				_chain_stage_label.add_theme_color_override(
					"font_color", Color8(0xff, 0xe7, 0xa0) if earned >= 4 else Palette.PARCHMENT)
			return

	# RESTING — the calm MOSS→GOLD fractional-progress fill (M4b), banner hidden.
	if _chain_stage_label != null:
		_chain_stage_label.visible = false
	var rest_ratio: float = 0.0
	if game != null and _last_res != "" and _last_threshold > 0:
		rest_ratio = clampf(float(int(game.progress.get(_last_res, 0))) / float(_last_threshold), 0.0, 1.0)
	_chain_prog_fill.size = Vector2(inner_w * rest_ratio, fill_h)
	var col: Color = Palette.MOSS.lerp(Palette.GOLD, rest_ratio)
	_chain_prog_fill.add_theme_stylebox_override("panel", UiKit.bar_box(col, col))

func _refresh_status() -> void:
	if board != null and _status_label != null and _status_label.text == "":
		_status_label.text = ""
