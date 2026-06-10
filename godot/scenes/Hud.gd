extends Node
## The HUD presentation layer, extracted from Main.gd (behaviour-preserving).
## A PLAIN NODE container (NOT a CanvasLayer — nesting CanvasLayers would shift compositing
## and break a visual golden); it holds the same child CanvasLayers the HUD always used (a
## background layer=-1, the main HUD layer=1, the fx layer=2, and the bottom-nav layer).
##
## The BOARD page is the React BoardLayout portrait stack (src/ui/puzzleBoard.tsx), top to
## bottom in FIXED bands: the parchment top-bar of pills → the season bar → the tool HOTBAR
## (a dark rail of owned-tool slots) → the ACTION PANEL → the chain hint → the board →
## the status/orders strip → the 5-tab bottom nav, plus the reward-chip FX.
##
## The ACTION PANEL is the React PuzzleActionPanel port: ONE fixed-height card that swaps
## between three exclusive states by what the player is doing on the board —
##   IDLE  (stockpile chip grid) · CHAIN (live chain readout) · TOOL (inspect/armed detail)
## — see _build_action_panel/_update_action_state. Tapping a hotbar slot INSPECTS the tool
## in the panel; tapping it again (or the panel's ARM/USE button) activates it.
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

# ── Action panel (React puzzleBoard.tsx PuzzleActionPanel port) ───────────────
## ONE fixed-height parchment card pinned between the tool hotbar and the board that
## swaps between three exclusive states by what the player is doing on the board
## (React's data-state="idle|chain|tool"):
##   IDLE  — the stockpile chip grid (React IdleView)
##   CHAIN — the live chain-progress readout (React ChainView)
##   TOOL  — the inspected/armed tool detail (React ToolView)
## The container NEVER moves or resizes between states, so swapping content can't
## shift the board below it (React: "Fixed height so swapping … never shifts layout").
var _action_panel: PanelContainer
var _action_idle: VBoxContainer
var _action_chain: VBoxContainer
var _action_tool: VBoxContainer
## The tool id currently INSPECTED in the panel ("" = none). Tapping a hotbar slot
## inspects it (the panel flips to TOOL); tapping the inspected slot again — or the
## panel's ARM/USE button — activates it (React's two-tap inspect→activate pattern).
## The armed tool auto-inspects via show_tool_armed_banner so an armed mode is always
## visible in the panel.
var _inspected_tool: String = ""

# Chain view (React ChainView) widgets. The *KEPT* names (_chain_prog_label/_track/_fill)
# preserve the m4b/m4e/m8d capture + forwarder contract: they are still "the chain progress
# readout", now living inside the action panel's CHAIN state.
var _chain_head_dot: Panel              ## header accent dot (stage accent / muddy when short)
var _chain_head_right: Label            ## header right: "{Res} chain" / "N more to collect"
var _chain_prog_label: Label            ## KEPT — now the big centred "N/M" bar counter
var _chain_prog_track: Panel            ## KEPT — the big (56px) bar track
var _chain_prog_fill: Panel             ## KEPT — the live STAGE-gradient fill
var _chain_fill_carried: Panel          ## carried-progress base fill (brown), behind the live fill
var _chain_prog_track_w: float = 0.0    ## current track inner width (recomputed on layout)
## A3 — the escalating chain-STAGE banner ("BONUS!"/"DOUBLE!"/…) overlaid top-right on the
## chain-progress track, shown only while a live chain has earned >= 1 upgrade.
var _chain_stage_label: Label
var _chain_res_box: PanelContainer      ## right-hand resource icon card (React's 64px box)
var _chain_res_icon: TextureRect        ## the chained resource's icon
var _chain_earn_badge: PanelContainer   ## "+N" earned-upgrades badge overhanging the icon card
var _chain_earn_label: Label
var _chain_upg_row: Control             ## "UPGRADE TO {tile}" footer strip (margin wrap)
var _chain_upg_icon: TextureRect        ## the upgrade TILE's thumbnail
var _chain_upg_name: Label
var _chain_upg_track: Panel             ## slim footer progress track
var _chain_upg_fill: Panel
var _chain_upg_count: Label             ## "into/threshold"
var _chain_upg_plus: PanelContainer     ## "+1" chip (stage-tinted once earned >= 1)
var _chain_upg_plus_lbl: Label
## A3 — live-drag chain tracking, used to drive the CHAIN state of the action panel
## (Constants.chain_stage_index) WHILE dragging. Pushed by Main (_on_chain_changed → set_live_chain).
var _live_chain_len: int = 0
var _live_chain_tile: int = Constants.EMPTY

# Stockpile chip panel.
var _stockpile_title: Label             ## "STOCKPILE" header label (React PanelHeader left)
var _stockpile_kinds: Label             ## "N/M KINDS" header count (React PanelHeader right)
var _stockpile_grid: GridContainer      ## 4-col grid of resource chips
## res key -> its chip PanelContainer, rebuilt each _refresh_totals(). Headless-test contract:
## a chip is present per ROSTER resource (dimmed when 0) PLUS any extra owned resource.
var _stockpile_chips: Dictionary = {}

## The farm stockpile ROSTER — the core farm goods the panel always shows as chips (React's
## "first 12 resources of the biome", `BIOMES[biome].resources.slice(0,12)` in puzzleBoard.tsx
## IdleView). Empty roster goods render DIMMED rather than absent so the grid reads as a stable
## panel, and the header's "owned/total KINDS" denominator is this roster's size (React's
## `${ownedCount}/${list.length} kinds`). These are the SAME farm + refined resource families the
## InventoryScreen ledger groups (real GameState.inventory keys — no invented goods). Any owned
## resource NOT in the roster (a mine/expedition good carried back) is appended after the roster so
## nothing owned is ever hidden.
##
## Kept as an explicit ORDERED list (NOT derived from ResourceConfig) so the chip order stays
## byte-identical to React's `BIOMES.farm.resources.slice(0,12)` — the first 12 `kind:"resource"`,
## `biome:"farm"` ITEMS entries in src/constants.ts DECLARATION order (flour:383 … hay_bundle:406;
## bread/supplies/cured_meat/… come later so they fall outside the 12 and render only as owned
## extras). Each chip's display name comes from ResourceConfig.label() via UiKit.pretty_name.
const STOCKPILE_ROSTER: Array = [
	"flour", "plank", "dirt", "jam", "soup", "pie",
	"honey", "meat", "milk", "horseshoe", "eggs", "hay_bundle",
]
## Mine/harbor rosters — React's IdleView swaps the chip list to the ACTIVE biome's
## resources (BIOMES[biomeKey].resources.slice(0,12)). Same ITEMS declaration order.
const STOCKPILE_ROSTER_MINE: Array = [
	"block", "cut_gem", "coke", "iron_bar", "copper_bar", "gold_bar", "iron_ration",
]
const STOCKPILE_ROSTER_FISH: Array = [
	"fish_fillet", "fish_oil", "sea_shells", "pearls",
]

# Top-bar container ref, repositioned in _layout_hud(). (The old floating _chain_prog_box /
# _stockpile_box cards are gone — both surfaces live INSIDE the fixed action panel now.)
var _topbar: PanelContainer
var _menu_btn: Button                   ## floating ⚙ button — vertically centred on the top bar in _layout_hud

# M4b chain-progress tracking: the last resolved resource + its threshold.
var _last_res: String = ""
var _last_threshold: int = 0

# ── M8d ToolPalette ────────────────────────────────────────────────────────────
var _tool_palette_box: PanelContainer   ## outer parchment card (hidden when no tools)
var _tool_buttons: Dictionary = {}      ## {tool_id: Button} — rebuilt on each _refresh_tools()

# ── Tool view (React ToolView) — the TOOL state of the action panel ───────────
# Replaces the old full-width "Tool armed" overlay banner: the same information now
# renders INSIDE the action panel (header dot + title, icon card, name/desc, footer
# prompt + action button), armed-tinted while a tap-target tool is armed.
var _tool_head_dot: Panel               ## header status dot (red while armed)
var _tool_armed_title: Label            ## KEPT name — "TOOL ARMED · ×N LEFT" header title
var _tool_armed_name: Label             ## KEPT name — tool label (e.g. "Sickle")
var _tool_armed_desc: Label             ## KEPT name — tool description (2-line clamp)
var _tool_view_icon_box: PanelContainer ## dark icon card (gold border; red while armed)
var _tool_view_icon: TextureRect
var _tool_view_footer: PanelContainer   ## footer strip (tinted hotter while armed)
var _tool_view_prompt: Label            ## "Tap a tile on the board" / "Affects entire board"
var _tool_action_btn: Button            ## ◎ ARM / ✕ DISARM / ✓ USE NOW

# ── Bottom navigation bar (matches the React 5-tab BottomNav) ──────────────────
const NAV_HEIGHT := UiKit.NAV_RESERVE     ## bottom-bar height (also the reserved layout gap)
const LEVEL_PILL_W := 54                 ## inner width of the "Lv N" XP pill
## Board-page fixed bands (the React BoardLayout portrait stack, in 720-base px):
## top bar (0..~60) → season bar (66..~124) → tool hotbar → action panel → chain hint →
## board (Main._layout reads board_top()). Constant bands: swapping the action panel's
## state can never shift the board, and nothing floats over it.
const HOTBAR_TOP := 130.0                ## tool hotbar rail top
const HOTBAR_H := 78.0                   ## tool hotbar rail height (single slot row)
const PANEL_TOP := 216.0                 ## action panel top
const PANEL_H := 208.0                   ## action panel FIXED height (all three states)
var _nav_layer: CanvasLayer              ## dedicated layer above the HUD so the bar is never covered
var _nav_tabs: Dictionary = {}           ## {nav_key: {button, underline, highlight, label, icon}} for restyle
var _nav_current: String = ""            ## active tab key ("town"/"inventory"/"craft"/"map"/"folk"), "" = board
var _nav_prev_active: String = ""        ## last ANIMATED active tab — _refresh_nav only plays the
                                         ## activation motion on a real change, not on every refresh

# ── M4e reward "juice" ────────────────────────────────────────────────────────
var _fx_layer: CanvasLayer

## Build the entire HUD. Main calls this once (after injecting game + board) at the SAME point
## the old _build_hud ran, so z-order/layer ordering is identical.
func build() -> void:
	_build_hud()

## One-shot launch flourish: the persistent chrome reveals in a quick stagger — the
## top bar drops in, the bottom nav rises, the stockpile card and tool palette follow.
## Main calls this once at the end of _ready (after the first _layout pass). A no-op
## headless / with UiFx disabled, so tests and the boot smoke see the settled HUD.
func play_intro() -> void:
	UiFx.intro_drop(_topbar, -26.0, 0.42, 0.0)
	if _nav_layer != null and _nav_layer.get_child_count() > 0:
		UiFx.intro_drop(_nav_layer.get_child(0) as Control, 30.0, 0.42, 0.07)
	UiFx.intro_drop(_action_panel, 24.0, 0.4, 0.14)
	UiFx.intro_drop(_tool_palette_box, -18.0, 0.4, 0.2)

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

	var tier_box := UiKit.make_pill("Camp · 0/25", Palette.INK)
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

	# ── chain prompt (kept) — a slim prompt between the action panel and the board ────
	# (The old floating chain-progress pill is gone: the chain readout is the action
	# panel's CHAIN state now. This hint line keeps the smoke-test contract + the
	# "what do I do" affordance; _layout_hud pins it just above the board.)
	_chain_label = Label.new()
	_chain_label.text = "Drag %d+ matching tiles" % Constants.MIN_CHAIN
	_chain_label.add_theme_font_size_override("font_size", 14)
	_chain_label.add_theme_color_override("font_color", Palette.INK_MID)
	_chain_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_chain_label.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_chain_label.offset_top = 424
	_chain_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_chain_label)

	# ── status (kept) — action feedback in the strip between the board and the nav ──
	_status_label = Label.new()
	_status_label.text = ""
	_status_label.add_theme_font_size_override("font_size", 17)
	_status_label.add_theme_color_override("font_color", Palette.MOSS)
	_status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_status_label.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	# The board now ends ~76px above the nav (Board.BOTTOM_RESERVE) — status sits in
	# the lower half of that strip, clear of both the board and the nav bar.
	_status_label.offset_top = -42 - NAV_HEIGHT
	_status_label.offset_left = -340
	_status_label.offset_right = 340
	_status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_status_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_status_label)

	# ── orders — compact one-line readout in the upper half of the bottom strip ──
	_orders_label = Label.new()
	_orders_label.text = "Orders:  —"
	_orders_label.add_theme_font_size_override("font_size", 14)
	_orders_label.add_theme_color_override("font_color", Palette.GOLD)
	_orders_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_orders_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	_orders_label.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	# One clipped line right under the board's bottom edge, above the status line.
	_orders_label.offset_top = -72 - NAV_HEIGHT
	_orders_label.offset_left = 24
	_orders_label.offset_right = -24
	_orders_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_orders_label)

	# ── C. Action panel — ONE fixed card swapping stockpile / chain / tool states ──
	# (React PuzzleActionPanel. Replaces the old floating stockpile card, the floating
	# chain-progress pill, AND the overlay tool-armed banner.)
	_build_action_panel(root)

	# ── D. Tool hotbar — dark full-width tool rail between the season bar and panel ──
	_build_tool_palette(root)

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
	# Shared press feedback + a quarter-turn gear spin on press (a small mechanical
	# flourish that sells the "settings cog" affordance).
	UiFx.attach_press_feedback(menu_btn)
	UiFx.attach_press_spin(menu_btn)
	root.add_child(menu_btn)
	_menu_btn = menu_btn

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

## Build the ACTION PANEL (React puzzleBoard.tsx PuzzleActionPanel): ONE fixed-height
## cream card holding three exclusive state views, visibility-swapped by
## _update_action_state() from what the player is doing on the board:
##   _action_idle  — the stockpile chip grid (React IdleView; _refresh_totals fills it)
##   _action_chain — the live chain readout (React ChainView; _refresh_chain_progress)
##   _action_tool  — the inspected/armed tool detail (React ToolView; _refresh_action_tool)
## TOP_WIDE-anchored with fixed offsets from _layout_hud, so swapping states never
## moves the board below it (React: fixed 148px height for exactly this reason).
func _build_action_panel(root: Control) -> void:
	_action_panel = PanelContainer.new()
	_action_panel.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_action_panel.add_theme_stylebox_override("panel", _action_panel_box())
	root.add_child(_action_panel)

	_action_idle = _build_idle_view()
	_action_panel.add_child(_action_idle)
	_action_chain = _build_chain_view()
	_action_chain.visible = false
	_action_panel.add_child(_action_chain)
	_action_tool = _build_tool_view()
	_action_tool.visible = false
	_action_panel.add_child(_action_tool)

## The action panel's card surface: soft cream paper, iron border, radius 13, the shared
## soft drop shadow (React's cream `--panel-top/--panel-bottom` card). Content margins
## match the border so each state view can run its header/footer edge-to-edge.
func _action_panel_box() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Palette.PARCHMENT_SOFT
	sb.border_color = Palette.IRON
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(13)
	sb.shadow_size = 8
	sb.shadow_color = Color(0, 0, 0, 0.18)
	sb.shadow_offset = Vector2(0, 3)
	sb.set_content_margin_all(2)
	return sb

## A React PanelHeader: a slim row holding a small accent dot, an uppercase LEFT title,
## and a muted RIGHT label, finished with a hairline divider. Returns the parts so each
## state view can re-tint/re-text them: {"box", "row", "dot", "left", "right"}.
func _panel_header(left_text: String) -> Dictionary:
	var wrap := VBoxContainer.new()
	wrap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	wrap.add_theme_constant_override("separation", 0)

	var pad := MarginContainer.new()
	pad.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pad.add_theme_constant_override("margin_left", 12)
	pad.add_theme_constant_override("margin_right", 12)
	pad.add_theme_constant_override("margin_top", 5)
	pad.add_theme_constant_override("margin_bottom", 5)
	wrap.add_child(pad)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 7)
	pad.add_child(row)

	var dot_wrap := CenterContainer.new()
	dot_wrap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var dot := Panel.new()
	dot.custom_minimum_size = Vector2(8, 8)
	dot.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var dot_sb := StyleBoxFlat.new()
	dot_sb.bg_color = Palette.MOSS
	dot_sb.set_corner_radius_all(999)
	dot.add_theme_stylebox_override("panel", dot_sb)
	dot_wrap.add_child(dot)
	row.add_child(dot_wrap)

	var left := Label.new()
	left.text = left_text
	left.add_theme_font_size_override("font_size", 13)
	left.add_theme_color_override("font_color", Palette.INK)
	left.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(left)

	var right := Label.new()
	right.text = ""
	right.add_theme_font_size_override("font_size", 12)
	right.add_theme_color_override("font_color", Palette.INK_MID)
	right.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	right.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	right.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(right)

	var rule := Panel.new()
	rule.custom_minimum_size = Vector2(0, 1)
	rule.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var rule_sb := StyleBoxFlat.new()
	rule_sb.bg_color = Color(Palette.IRON, 0.85)
	rule.add_theme_stylebox_override("panel", rule_sb)
	wrap.add_child(rule)

	return {"box": wrap, "row": row, "dot": dot, "left": left, "right": right}

## Re-tint a header accent dot (the dots are plain Panels with a rounded StyleBox).
func _set_dot_color(dot: Panel, color: Color) -> void:
	if dot == null:
		return
	var sb := StyleBoxFlat.new()
	sb.bg_color = color
	sb.set_corner_radius_all(999)
	dot.add_theme_stylebox_override("panel", sb)

## IDLE state (React IdleView): "STOCKPILE | n/m KINDS" header over a 4-column grid of
## resource chips. The grid scrolls vertically when the roster + extra owned goods
## outgrow the fixed panel height (React: overflow-y-auto on the chip grid).
func _build_idle_view() -> VBoxContainer:
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 0)

	var header := _panel_header("STOCKPILE")
	_stockpile_title = header["left"]
	_stockpile_kinds = header["right"]
	_stockpile_kinds.text = "0/%d KINDS" % STOCKPILE_ROSTER.size()
	_stockpile_kinds.add_theme_color_override("font_color", Palette.MOSS)
	col.add_child(header["box"])

	var scroll := UiKit.make_vscroll()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	col.add_child(scroll)

	var pad := MarginContainer.new()
	pad.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	pad.add_theme_constant_override("margin_left", 10)
	pad.add_theme_constant_override("margin_right", 10)
	pad.add_theme_constant_override("margin_top", 8)
	pad.add_theme_constant_override("margin_bottom", 8)
	scroll.add_child(pad)

	_stockpile_grid = GridContainer.new()
	_stockpile_grid.columns = 4
	_stockpile_grid.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_stockpile_grid.add_theme_constant_override("h_separation", 8)
	_stockpile_grid.add_theme_constant_override("v_separation", 8)
	pad.add_child(_stockpile_grid)
	return col

## CHAIN state (React ChainView): "CHAINING" header (right: "{res} chain" / "N more to
## collect"), the big stage-coloured progress bar with the carried-progress base fill +
## centred counter + stage banner, the chained resource's icon card with a "+N" earned
## badge, and the "UPGRADE TO {tile}" footer with its own slim progress track.
func _build_chain_view() -> VBoxContainer:
	var col := VBoxContainer.new()
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_theme_constant_override("separation", 0)

	var header := _panel_header("CHAINING")
	_chain_head_dot = header["dot"]
	_chain_head_right = header["right"]
	col.add_child(header["box"])

	# Middle row: the big bar (expands) + the chained resource's icon card.
	var mid_pad := MarginContainer.new()
	mid_pad.mouse_filter = Control.MOUSE_FILTER_IGNORE
	mid_pad.size_flags_vertical = Control.SIZE_EXPAND_FILL
	mid_pad.add_theme_constant_override("margin_left", 12)
	mid_pad.add_theme_constant_override("margin_right", 12)
	mid_pad.add_theme_constant_override("margin_top", 6)
	mid_pad.add_theme_constant_override("margin_bottom", 6)
	col.add_child(mid_pad)

	var mid := HBoxContainer.new()
	mid.mouse_filter = Control.MOUSE_FILTER_IGNORE
	mid.add_theme_constant_override("separation", 12)
	mid_pad.add_child(mid)

	# The big track (React: 50px, radius 13). clip_contents squares the fills off at the
	# rounded ends — the 2px inset keeps them inside the border, matching React's
	# overflow-hidden bar. Fills are MANUALLY sized children (not laid out).
	_chain_prog_track = Panel.new()
	_chain_prog_track.custom_minimum_size = Vector2(0, 58)
	_chain_prog_track.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_chain_prog_track.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	_chain_prog_track.clip_contents = true
	_chain_prog_track.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_chain_prog_track.add_theme_stylebox_override("panel", _chain_track_box())
	_chain_prog_track.resized.connect(_on_chain_track_resized)
	mid.add_child(_chain_prog_track)

	# Carried-progress base fill (brown) — prior chains' progress toward the next unit,
	# drawn BEHIND the live fill (React's #b89762→#8a6428 "old" fill).
	_chain_fill_carried = Panel.new()
	_chain_fill_carried.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_chain_fill_carried.add_theme_stylebox_override(
		"panel", _bar_fill_box(Color("#b89762"), Color("#8a6428")))
	_chain_fill_carried.position = Vector2(2, 2)
	_chain_fill_carried.size = Vector2(0, 54)
	_chain_prog_track.add_child(_chain_fill_carried)

	# Live stage-gradient fill — KEPT name (_chain_prog_fill).
	_chain_prog_fill = Panel.new()
	_chain_prog_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_chain_prog_fill.add_theme_stylebox_override(
		"panel", _bar_fill_box(Color("#f0c14b"), Color("#d97a2a")))
	_chain_prog_fill.position = Vector2(2, 2)
	_chain_prog_fill.size = Vector2(0, 54)
	_chain_prog_track.add_child(_chain_prog_fill)

	# Big centred counter ("3/6", "2+4/6", "1/6 +1", "×4") — KEPT name (_chain_prog_label).
	_chain_prog_label = Label.new()
	_chain_prog_label.text = ""
	_chain_prog_label.add_theme_font_size_override("font_size", 27)
	_chain_prog_label.add_theme_color_override("font_color", Color("#fff8e7"))
	_chain_prog_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.5))
	_chain_prog_label.add_theme_constant_override("outline_size", 5)
	_chain_prog_label.set_anchors_preset(Control.PRESET_FULL_RECT)
	_chain_prog_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_chain_prog_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_chain_prog_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_chain_prog_track.add_child(_chain_prog_label)

	# A3 — the chain-STAGE banner ("BONUS!"/"DOUBLE!"/…), top-right on the track, above
	# the fills. Hidden at stage 0; _refresh_chain_progress drives text/colour/pop.
	_chain_stage_label = Label.new()
	_chain_stage_label.text = ""
	_chain_stage_label.add_theme_font_size_override("font_size", 12)
	_chain_stage_label.add_theme_color_override("font_color", Palette.PARCHMENT)
	_chain_stage_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.55))
	_chain_stage_label.add_theme_constant_override("outline_size", 4)
	_chain_stage_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_chain_stage_label.vertical_alignment = VERTICAL_ALIGNMENT_TOP
	_chain_stage_label.set_anchors_preset(Control.PRESET_FULL_RECT)
	_chain_stage_label.offset_right = -8
	_chain_stage_label.offset_top = 3
	_chain_stage_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_chain_stage_label.visible = false
	_chain_prog_track.add_child(_chain_stage_label)

	# Right: the chained resource's icon card, with the "+N" earned badge overhanging its
	# bottom-right corner (React's 64px box + the stage-tinted "+N" pill).
	var res_holder := Control.new()
	res_holder.custom_minimum_size = Vector2(86, 86)
	res_holder.mouse_filter = Control.MOUSE_FILTER_IGNORE
	res_holder.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	mid.add_child(res_holder)

	_chain_res_box = PanelContainer.new()
	_chain_res_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_chain_res_box.add_theme_stylebox_override("panel", _chain_res_box_style(Palette.IRON))
	_chain_res_box.position = Vector2.ZERO
	_chain_res_box.size = Vector2(78, 78)
	res_holder.add_child(_chain_res_box)

	var res_center := CenterContainer.new()
	res_center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_chain_res_box.add_child(res_center)
	_chain_res_icon = TextureRect.new()
	_chain_res_icon.custom_minimum_size = Vector2(52, 52)
	_chain_res_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_chain_res_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_chain_res_icon.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	_chain_res_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	res_center.add_child(_chain_res_icon)

	_chain_earn_badge = PanelContainer.new()
	_chain_earn_badge.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_chain_earn_badge.position = Vector2(48, 58)
	_chain_earn_badge.visible = false
	res_holder.add_child(_chain_earn_badge)
	_chain_earn_label = Label.new()
	_chain_earn_label.text = "+1"
	_chain_earn_label.add_theme_font_size_override("font_size", 15)
	_chain_earn_label.add_theme_color_override("font_color", Color("#fff8e7"))
	_chain_earn_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.4))
	_chain_earn_label.add_theme_constant_override("outline_size", 2)
	_chain_earn_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_chain_earn_badge.add_child(_chain_earn_label)

	# Footer: "UPGRADE TO {tile}" + a slim progress track + "n/m → +1" (React's footer).
	var foot_rule := Panel.new()
	foot_rule.custom_minimum_size = Vector2(0, 1)
	foot_rule.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var foot_rule_sb := StyleBoxFlat.new()
	foot_rule_sb.bg_color = Color(Palette.IRON, 0.85)
	foot_rule.add_theme_stylebox_override("panel", foot_rule_sb)
	col.add_child(foot_rule)

	var foot_pad := MarginContainer.new()
	foot_pad.mouse_filter = Control.MOUSE_FILTER_IGNORE
	foot_pad.add_theme_constant_override("margin_left", 12)
	foot_pad.add_theme_constant_override("margin_right", 12)
	foot_pad.add_theme_constant_override("margin_top", 5)
	foot_pad.add_theme_constant_override("margin_bottom", 7)
	col.add_child(foot_pad)
	_chain_upg_row = foot_pad

	var foot := HBoxContainer.new()
	foot.mouse_filter = Control.MOUSE_FILTER_IGNORE
	foot.add_theme_constant_override("separation", 8)
	foot_pad.add_child(foot)

	var upg_caption := Label.new()
	upg_caption.text = "UPGRADE TO"
	upg_caption.add_theme_font_size_override("font_size", 11)
	upg_caption.add_theme_color_override("font_color", Palette.INK_MID)
	upg_caption.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	upg_caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
	foot.add_child(upg_caption)

	_chain_upg_icon = TextureRect.new()
	_chain_upg_icon.custom_minimum_size = Vector2(26, 26)
	_chain_upg_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_chain_upg_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_chain_upg_icon.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	_chain_upg_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	foot.add_child(_chain_upg_icon)

	_chain_upg_name = Label.new()
	_chain_upg_name.text = ""
	_chain_upg_name.add_theme_font_size_override("font_size", 13)
	_chain_upg_name.add_theme_color_override("font_color", Palette.INK)
	_chain_upg_name.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_chain_upg_name.mouse_filter = Control.MOUSE_FILTER_IGNORE
	foot.add_child(_chain_upg_name)

	_chain_upg_track = Panel.new()
	_chain_upg_track.custom_minimum_size = Vector2(40, 10)
	_chain_upg_track.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_chain_upg_track.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	_chain_upg_track.clip_contents = true
	_chain_upg_track.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var upg_track_sb := StyleBoxFlat.new()
	upg_track_sb.bg_color = Color(0, 0, 0, 0.22)
	upg_track_sb.set_corner_radius_all(5)
	_chain_upg_track.add_theme_stylebox_override("panel", upg_track_sb)
	foot.add_child(_chain_upg_track)

	_chain_upg_fill = Panel.new()
	_chain_upg_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_chain_upg_fill.add_theme_stylebox_override(
		"panel", _bar_fill_box(Color("#e07a3a"), Color("#f0c14b"), true))
	_chain_upg_fill.position = Vector2.ZERO
	_chain_upg_fill.size = Vector2(0, 10)
	_chain_upg_track.add_child(_chain_upg_fill)

	_chain_upg_count = Label.new()
	_chain_upg_count.text = ""
	_chain_upg_count.add_theme_font_size_override("font_size", 13)
	_chain_upg_count.add_theme_color_override("font_color", Color("#7a3c12"))
	_chain_upg_count.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_chain_upg_count.mouse_filter = Control.MOUSE_FILTER_IGNORE
	foot.add_child(_chain_upg_count)

	var arrow := Label.new()
	arrow.text = "→"
	arrow.add_theme_font_size_override("font_size", 13)
	arrow.add_theme_color_override("font_color", Palette.INK_MID)
	arrow.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	arrow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	foot.add_child(arrow)

	_chain_upg_plus = PanelContainer.new()
	_chain_upg_plus.mouse_filter = Control.MOUSE_FILTER_IGNORE
	foot.add_child(_chain_upg_plus)
	_chain_upg_plus_lbl = Label.new()
	_chain_upg_plus_lbl.text = "+1"
	_chain_upg_plus_lbl.add_theme_font_size_override("font_size", 13)
	_chain_upg_plus_lbl.add_theme_color_override("font_color", Color("#3d5d18"))
	_chain_upg_plus_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_chain_upg_plus.add_child(_chain_upg_plus_lbl)

	return col

## The big chain track surface: a warm recessed parchment well with an iron border
## (React's --board-panel-track + 2px border, radius 13).
func _chain_track_box() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color("#e3d3ae")
	sb.border_color = Color("#b89d6f")
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(13)
	return sb

## A gradient StyleBox for bar fills (React's linear-gradient fills): top→bottom by
## default, left→right when `horizontal`. Built on a tiny GradientTexture2D — StyleBoxFlat
## can't gradient. The track's clip_contents squares the ends off inside its radius.
func _bar_fill_box(from: Color, to: Color, horizontal: bool = false) -> StyleBoxTexture:
	var grad := Gradient.new()
	grad.colors = PackedColorArray([from, to])
	grad.offsets = PackedFloat32Array([0.0, 1.0])
	var tex := GradientTexture2D.new()
	tex.gradient = grad
	tex.fill_from = Vector2.ZERO
	tex.fill_to = Vector2(1, 0) if horizontal else Vector2(0, 1)
	tex.width = 8
	tex.height = 8
	var sb := StyleBoxTexture.new()
	sb.texture = tex
	return sb

## The chain view's resource icon card surface (border re-tints to the stage accent
## once the chain has earned an upgrade).
func _chain_res_box_style(border: Color) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Palette.PAPER
	sb.border_color = border
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(13)
	return sb

## TOOL state (React ToolView): header dot + "TOOL INSPECT/READY/ARMED · ×N LEFT" + ✕,
## the tool's icon card + name + description, and a footer strip with the targeting
## prompt and the ◎ ARM / ✕ DISARM / ✓ USE NOW action button.
func _build_tool_view() -> VBoxContainer:
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 0)

	var header := _panel_header("TOOL INSPECT")
	_tool_head_dot = header["dot"]
	_tool_armed_title = header["left"]
	col.add_child(header["box"])

	# ✕ close: drop the inspect, back to the stockpile. While ARMED it stays a no-op —
	# DISARM is the explicit way out of an armed mode (React keeps the armed panel too).
	var close := Button.new()
	close.text = "✕"
	close.custom_minimum_size = Vector2(30, 26)
	close.focus_mode = Control.FOCUS_NONE
	UiKit.style_button(close, Palette.EMBER, 0, 13)
	close.pressed.connect(_on_tool_view_closed)
	header["row"].add_child(close)

	# Body: icon card + name/desc column.
	var body_pad := MarginContainer.new()
	body_pad.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body_pad.add_theme_constant_override("margin_left", 12)
	body_pad.add_theme_constant_override("margin_right", 12)
	body_pad.add_theme_constant_override("margin_top", 6)
	body_pad.add_theme_constant_override("margin_bottom", 6)
	col.add_child(body_pad)

	var body := HBoxContainer.new()
	body.add_theme_constant_override("separation", 12)
	body_pad.add_child(body)

	_tool_view_icon_box = PanelContainer.new()
	_tool_view_icon_box.custom_minimum_size = Vector2(66, 66)
	_tool_view_icon_box.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	_tool_view_icon_box.add_theme_stylebox_override("panel", _tool_icon_box_style(false))
	body.add_child(_tool_view_icon_box)
	var icon_center := CenterContainer.new()
	_tool_view_icon_box.add_child(icon_center)
	_tool_view_icon = TextureRect.new()
	_tool_view_icon.custom_minimum_size = Vector2(44, 44)
	_tool_view_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_tool_view_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_tool_view_icon.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	icon_center.add_child(_tool_view_icon)

	var txt := VBoxContainer.new()
	txt.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	txt.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	txt.add_theme_constant_override("separation", 3)
	body.add_child(txt)

	var heading_font: Font = UiKit.heading_font()
	_tool_armed_name = Label.new()
	_tool_armed_name.text = ""
	_tool_armed_name.add_theme_font_size_override("font_size", 19)
	_tool_armed_name.add_theme_color_override("font_color", Palette.INK)
	if heading_font != null:
		_tool_armed_name.add_theme_font_override("font", heading_font)
	txt.add_child(_tool_armed_name)

	_tool_armed_desc = Label.new()
	_tool_armed_desc.text = ""
	_tool_armed_desc.add_theme_font_size_override("font_size", 13)
	_tool_armed_desc.add_theme_color_override("font_color", Palette.INK_MID)
	_tool_armed_desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_tool_armed_desc.max_lines_visible = 2
	_tool_armed_desc.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	txt.add_child(_tool_armed_desc)

	# Footer strip: targeting prompt + the action button. Tinted hotter while armed
	# (_refresh_action_tool swaps the stylebox).
	_tool_view_footer = PanelContainer.new()
	_tool_view_footer.add_theme_stylebox_override("panel", _tool_footer_style("ready"))
	col.add_child(_tool_view_footer)

	var foot := HBoxContainer.new()
	foot.add_theme_constant_override("separation", 10)
	_tool_view_footer.add_child(foot)

	_tool_view_prompt = Label.new()
	_tool_view_prompt.text = ""
	_tool_view_prompt.add_theme_font_size_override("font_size", 13)
	_tool_view_prompt.add_theme_color_override("font_color", Color("#7a3c12"))
	_tool_view_prompt.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_tool_view_prompt.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_tool_view_prompt.mouse_filter = Control.MOUSE_FILTER_IGNORE
	foot.add_child(_tool_view_prompt)

	_tool_action_btn = Button.new()
	_tool_action_btn.text = "◎ ARM"
	_tool_action_btn.focus_mode = Control.FOCUS_NONE
	_tool_action_btn.pressed.connect(_on_tool_action_pressed)
	foot.add_child(_tool_action_btn)

	return col

## The tool icon card: dark wood well, gold border — red border while armed (React's
## #3a2412 box with #f0c14b / #e02828 borders).
func _tool_icon_box_style(armed: bool) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color("#3a2412")
	sb.border_color = Color("#e02828") if armed else Color("#f0c14b")
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(13)
	return sb

## The tool footer strip surface by mode: "armed" = hot red wash, "ready" = warm orange
## wash (tap-target awaiting ARM), "instant" = neutral parchment. Bottom corners follow
## the panel radius so the strip reads as the card's base.
func _tool_footer_style(mode: String) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	match mode:
		"armed":
			sb.bg_color = Color(0.88, 0.16, 0.16, 0.20)
		"ready":
			sb.bg_color = Color(0.88, 0.48, 0.23, 0.16)
		_:
			sb.bg_color = Color(Palette.PARCHMENT, 0.6)
	sb.corner_radius_bottom_left = 11
	sb.corner_radius_bottom_right = 11
	sb.content_margin_left = 12
	sb.content_margin_right = 8
	sb.content_margin_top = 6
	sb.content_margin_bottom = 6
	return sb

## A coloured CTA face for the tool action button (React's gradient pill buttons).
func _style_cta(btn: Button, fill: Color, border: Color, ink: Color) -> void:
	var base := StyleBoxFlat.new()
	base.bg_color = fill
	base.border_color = border
	base.set_border_width_all(2)
	base.set_corner_radius_all(9)
	base.content_margin_left = 16
	base.content_margin_right = 16
	base.content_margin_top = 6
	base.content_margin_bottom = 6
	var hover := base.duplicate()
	hover.bg_color = fill.lightened(0.06)
	var pressed := base.duplicate()
	pressed.bg_color = fill.darkened(0.08)
	var disabled := base.duplicate()
	disabled.bg_color = Color(fill, 0.45)
	btn.add_theme_stylebox_override("normal", base)
	btn.add_theme_stylebox_override("hover", hover)
	btn.add_theme_stylebox_override("pressed", pressed)
	btn.add_theme_stylebox_override("disabled", disabled)
	btn.add_theme_stylebox_override("focus", base)
	btn.add_theme_color_override("font_color", ink)
	btn.add_theme_color_override("font_hover_color", ink)
	btn.add_theme_color_override("font_pressed_color", ink)
	btn.add_theme_color_override("font_disabled_color", Color(ink, 0.6))
	btn.add_theme_font_size_override("font_size", 13)
	UiFx.attach_press_feedback(btn)

## Build the tool HOTBAR container (React PuzzleHotbar): a dark wood rail pinned
## TOP_WIDE between the season bar and the action panel (_layout_hud sets the band).
## Starts hidden (_refresh_tools shows it once the player owns tools); the inner slot
## strip is rebuilt on each refresh. KEEPS the _tool_palette_box name (test contract).
func _build_tool_palette(root: Control) -> void:
	_tool_palette_box = PanelContainer.new()
	_tool_palette_box.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_tool_palette_box.add_theme_stylebox_override("panel", _hotbar_box())
	_tool_palette_box.offset_top = 130    # repositioned each layout in _layout_hud
	_tool_palette_box.visible = false      # hidden until _refresh_tools sees tools in the bag
	root.add_child(_tool_palette_box)

## The hotbar rail surface: dark wood with a near-black bottom border (React's
## linear-gradient(#6b4a26,#54391d) rail), rounded like a HUD card.
func _hotbar_box() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color("#5f4122")
	sb.border_color = Color("#2a1a08")
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(12)
	sb.shadow_size = 6
	sb.shadow_color = Color(0, 0, 0, 0.20)
	sb.shadow_offset = Vector2(0, 2)
	sb.content_margin_left = 8
	sb.content_margin_right = 8
	sb.content_margin_top = 6
	sb.content_margin_bottom = 6
	return sb

## Rebuild the tool HOTBAR from game.tools (React PuzzleHotbar): one square slot per
## owned tool — its icon + a dark count badge — the ARMED tool red-edged on a bright
## fill, the INSPECTED tool gold-edged. A tap INSPECTS the tool in the action panel;
## tapping the already-inspected slot ACTIVATES it (the port's timing-free version of
## React's two-tap inspect→activate). Hidden completely when no tools are owned.
## Registers every button in _tool_buttons keyed by id (test contract).
func _refresh_tools() -> void:
	if _tool_palette_box == null:
		return
	# Clear previous buttons + the registry.
	for child in _tool_palette_box.get_children():
		child.queue_free()
	_tool_buttons.clear()

	# Collect owned tools (charges > 0) in stable ToolConfig order, filtered to those
	# RELEVANT to the active board. React shows only the tools usable on the current biome
	# (src/ui/puzzleToolFilter.ts visiblePuzzleTools → isToolVisibleOnPuzzleBoard); the port
	# mirrors the board-kind half of that filter via ToolConfig.is_tool_visible_on_board, so
	# a mine-only tool (e.g. water_pump) never clutters the farm hotbar, and vice-versa.
	# "all"-kind tools (bomb / reshuffle horn / magic wand / magic seed) show on every board.
	var owned: Array = []
	if game != null:
		var biome: String = game.active_biome
		for id in ToolConfig.TOOL_IDS:
			var charges: int = game.tool_count(id)
			if charges > 0 and ToolConfig.is_tool_visible_on_board(id, biome):
				owned.append({"id": id, "charges": charges})

	# An inspected tool that is no longer owned (last charge spent) falls back to idle —
	# unless it is somehow still armed (defensive; the armed view must stay reachable). A
	# fill_bias tool spends its charge AT arm-time, so an armed fertilizer always reads 0
	# charges — keep its inspect alive while the bias is live (React keeps the armed panel).
	if _inspected_tool != "" and game != null and game.tool_count(_inspected_tool) <= 0 \
			and game.pending_tool != _inspected_tool and not _is_armed_fill_bias(_inspected_tool):
		_inspected_tool = ""

	if owned.is_empty():
		_tool_palette_box.visible = false
		_update_action_state()
		return

	_tool_palette_box.visible = true

	# A single-row rail (React's fixed-height hotbar). Horizontal scroll (no bar) keeps
	# every slot reachable when many tools are owned WITHOUT the rail growing taller —
	# the action panel below is FIXED, so a wrapping rail would overlap it.
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_tool_palette_box.add_child(scroll)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	scroll.add_child(row)

	var armed_id: String = game.pending_tool if game != null else ""

	for entry in owned:
		var id: String = String(entry["id"])
		var charges: int = int(entry["charges"])
		var cfg: Dictionary = ToolConfig.get_tool(id)
		var label: String = String(cfg.get("label", id))
		var desc: String = String(cfg.get("desc", ""))
		# Armed = the pending tap-tool OR the tool that armed a live fill_bias (fertilizer &c).
		# The fill_bias slot stays highlighted regardless of what's inspected — React's
		# `def.key === "fertilizer" && isFillBiasArmed(state)` lights the tile the same way.
		var is_armed: bool = (id == armed_id and armed_id != "") or _is_armed_fill_bias(id)
		var is_inspected: bool = (id == _inspected_tool and _inspected_tool != "")

		# Slot = a square Control holding a full-rect icon Button + a corner count badge.
		var slot := Control.new()
		slot.custom_minimum_size = Vector2(56, 58)

		var btn := Button.new()
		btn.set_anchors_preset(Control.PRESET_FULL_RECT)
		btn.focus_mode = Control.FOCUS_NONE
		var tex := UiKit.resource_icon(id)
		if tex != null:
			btn.icon = tex
			btn.expand_icon = true
		else:
			btn.text = label                       # fallback for a tool with no art
			btn.add_theme_font_size_override("font_size", 12)
		# Tooltip carries the label + "×N" + the tool's description — the tests read
		# tooltip_text (the button itself is icon-only; the action panel shows the text).
		btn.tooltip_text = "%s · ×%d%s" % [label, charges, ("\n" + desc if desc != "" else "")]
		# React ToolTile palette on the dark rail: armed = bright parchment + gold edge;
		# inspected = warm tint + soft gold edge; rest = faint parchment wash.
		var slot_fill: Color = Color("#f6e3bf", 0.18)
		var slot_border: Color = Color("#c8a05a", 0.40)
		if is_armed:
			slot_fill = Color("#fdf3e3")
			slot_border = Color("#f0c14b")
		elif is_inspected:
			slot_fill = Color("#f6e3bf", 0.55)
			slot_border = Color("#f0c14b", 0.60)
		btn.add_theme_stylebox_override("normal", _tool_slot_box(slot_fill, slot_border))
		btn.add_theme_stylebox_override("hover", _tool_slot_box(slot_fill.lightened(0.06), slot_border))
		btn.add_theme_stylebox_override("pressed", _tool_slot_box(slot_fill.darkened(0.06), slot_border))
		btn.pressed.connect(func():
			_on_tool_slot_tapped(id)
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
		badge.position = Vector2(38, -6)
		slot.add_child(badge)

		row.add_child(slot)
		_tool_buttons[id] = btn

	# The slot highlights are state-derived — keep the panel's TOOL view content current
	# (counts change with every use; the armed highlight follows game.pending_tool).
	_update_action_state()

## True when `id` is the tool that armed the live fill_bias — so its hotbar slot + the action
## panel render ARMED. The port's analogue of React's `def.key === "fertilizer" &&
## isFillBiasArmed(state)`, generalised to whichever fill_bias tool the player actually used.
func _is_armed_fill_bias(id: String) -> bool:
	return game != null and id != "" and game.armed_fill_bias_tool() == id

## A hotbar slot was tapped. First tap INSPECTS the tool (the action panel flips to its
## detail); a second tap on the already-inspected slot ACTIVATES it — arming a tap-target
## tool, firing an instant one, arming a fill_bias bias, or TOGGLING OFF an armed one (React
## dispatchUseTool's isPending → CANCEL_TOOL, plus the fill_bias disarm+refund). Tapping a
## different slot while ANOTHER tool is armed — a pending tap-tool OR a live fill_bias —
## TRANSFERS the arming (React maybeTransferArming): the player already committed to using a
## tool, so the new tap switches tools rather than dropping to nothing.
func _on_tool_slot_tapped(id: String) -> void:
	var armed_id: String = game.pending_tool if game != null else ""
	var fb_id: String = game.armed_fill_bias_tool() if game != null else ""
	# Some OTHER tool is already armed (pending tap-tool or a fill_bias bias) and we tapped a
	# different slot → transfer (covers tap→tap, tap→fill_bias, fill_bias→tap, fill_bias→fill_bias).
	var has_other_armed: bool = (armed_id != "" and armed_id != id) or (fb_id != "" and fb_id != id)
	if has_other_armed:
		# Disarm the old (tap clear OR fill_bias refund — Main._disarm_tool handles both), then
		# activate the new one immediately. Re-set _inspected_tool AFTER the disarm, which clears it.
		disarm_requested.emit()
		_inspected_tool = id
		tool_use_requested.emit(id)
		_refresh_tools()
		return
	if _inspected_tool == id:
		if armed_id == id or fb_id == id:
			disarm_requested.emit()        # tap-to-cancel an armed tap-tool / fill_bias
		else:
			tool_use_requested.emit(id)    # arm a tap tool / fire an instant one / arm fill_bias
		_refresh_tools()
		return
	_inspected_tool = id
	_update_action_state()
	_refresh_tools()

## The action panel's ARM / DISARM / USE NOW button (TOOL state footer).
func _on_tool_action_pressed() -> void:
	var id := _inspected_tool
	if id == "":
		return
	# DISARM when this tool is armed — either the pending tap-tool or the live fill_bias bias
	# (the latter refunds the charge via Main._disarm_tool). Otherwise the button ARMS / USES it.
	if (game != null and game.pending_tool == id) or _is_armed_fill_bias(id):
		disarm_requested.emit()
	else:
		tool_use_requested.emit(id)
	_refresh_tools()

## The TOOL state's ✕ close: drop the inspect, back to the stockpile. While the
## inspected tool is ARMED this is a no-op — DISARM is the explicit way out (React's
## auto-inspect re-shows an armed tool immediately, so closing it is equally moot).
func _on_tool_view_closed() -> void:
	if game != null and game.pending_tool == _inspected_tool and _inspected_tool != "":
		return
	# An armed fill_bias keeps the panel too (DISARM is its way out) — closing it is a no-op,
	# just like an armed tap-tool above.
	if _is_armed_fill_bias(_inspected_tool):
		return
	_inspected_tool = ""
	_update_action_state()
	_refresh_tools()

## A square parchment slot StyleBox for a tool icon button (10px radius, 2px border,
## 6px padding); the fill/border vary so the armed/inspected tool reads highlighted.
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
		# 🧭 (compass), not 🗺: the map emoji's colour glyph is a pale washed-out beige
		# that all but vanishes against the paper nav bar; the compass reads crisply at 22px.
		{"key": "map", "icon": "🧭", "label": "Map"},
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
	# Explicit ink tint — REQUIRED for contrast. The bundled NotoEmoji fallback is
	# MONOCHROME, so these glyphs render in the Label's font_color; without an override
	# that's the theme default (near-white), which vanishes on the paper nav bar.
	icon_lbl.add_theme_color_override("font_color", Palette.INK_MID)
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

	_nav_tabs[key] = {"button": btn, "underline": underline, "highlight": highlight,
		"label": text_lbl, "icon": icon_lbl}
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
		# The icon glyph follows the same ink scheme (ember when active) — the monochrome
		# NotoEmoji fallback takes the Label tint, so this IS the icon's colour.
		(parts["icon"] as Label).add_theme_color_override(
			"font_color", Palette.EMBER if active else Palette.INK_MID)
		# Activation motion (UiFx): play the underline-grow + highlight-fade + icon-pop
		# only on a REAL tab change (not on every refresh of an already-active tab);
		# rest every inactive tab so an interrupted activation never leaves it half-scaled.
		# The static visible/colour state above is already final, so headless runs are
		# byte-identical with motion disabled.
		if active and key != _nav_prev_active:
			UiFx.nav_tab_activate(parts["underline"], parts["highlight"], parts["icon"])
		elif not active:
			UiFx.nav_tab_rest(parts["underline"], parts["highlight"], parts["icon"])
	_nav_prev_active = _nav_current

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

## A single stockpile chip: a small rounded PanelContainer holding the resource icon +
## its count (React puzzleBoard.tsx IdleView chip). An OWNED chip is soft-parchment with an
## iron border + ink count; an EMPTY (count 0) roster chip renders DIMMED with a transparent
## border + muted count, so the panel always shows the full roster grid but the unfilled goods
## read as faint placeholders (React `empty ? opacity .55 / transparent border`). Behind the
## content a soft green wash spans count/effective_cap of the chip width — React's per-chip
## fill bar (`width: pct%`, rgba(124,179,66,0.12) against currentCap). The icon shows when we
## have art for the key; otherwise the title-cased name is the fallback so board-only keys
## (rat, mysterious_ore, …) still read.
func _make_stock_chip(res: String, count: int) -> PanelContainer:
	var empty: bool = count <= 0
	var box := PanelContainer.new()
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	box.modulate = Color(1, 1, 1, 0.55) if empty else Color.WHITE
	box.tooltip_text = "%s: %d" % [UiKit.pretty_name(res), count]
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(Palette.PARCHMENT_SOFT, 0.35) if empty else Palette.PARCHMENT_SOFT
	sb.border_color = Color(Palette.IRON, 0.0) if empty else Palette.IRON
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(8)
	sb.content_margin_left = 8
	sb.content_margin_right = 8
	sb.content_margin_top = 4
	sb.content_margin_bottom = 4
	box.add_theme_stylebox_override("panel", sb)
	# Cap-relative fill wash, BEHIND the icon/count row. Lives in a plain-Control host
	# (PanelContainer lays out its direct children full-rect, but a non-container child's
	# own children keep their anchors), with anchor_right = count/cap doing the width.
	if not empty and game != null:
		var cap: int = game.effective_cap()
		if cap > 0:
			var host := Control.new()
			host.mouse_filter = Control.MOUSE_FILTER_IGNORE
			box.add_child(host)
			var wash := ColorRect.new()
			wash.color = Color(0.486, 0.702, 0.259, 0.16)
			wash.mouse_filter = Control.MOUSE_FILTER_IGNORE
			wash.anchor_left = 0.0
			wash.anchor_top = 0.0
			wash.anchor_bottom = 1.0
			wash.anchor_right = clampf(float(count) / float(cap), 0.0, 1.0)
			host.add_child(wash)
	# React's stockpile chips are a compact icon + count. Show the same procedural icon
	# when we have art for the key; fall back to the title-cased name when we don't.
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
	lbl.add_theme_color_override("font_color", Palette.INK_MID if empty else Palette.INK)
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(lbl)
	return box

## Re-apply the live fills when the track changes size (a resize keeps the bar
## proportional). Width is remembered for callers that probe it before a layout pass.
func _on_chain_track_resized() -> void:
	if _chain_prog_track == null or _chain_prog_fill == null:
		return
	_chain_prog_track_w = maxf(0.0, _chain_prog_track.size.x - 4.0)  # inset for the 2px border
	if _live_chain_len > 0 and _live_chain_tile != Constants.EMPTY:
		_refresh_chain_progress()

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

# ── Tool-armed mode show/hide (called by Main's tool dispatch; KEPT names) ─────

## A tap-target tool OR a fill_bias tool (fertilizer &c) was just armed: auto-inspect it so
## the action panel flips to the ARMED tool view (React useAutoInspectArmed). N in the header
## counts the remaining charges (for a tap-tool the one being armed is included — its charge
## isn't spent until the tap; a fill_bias tool already spent its charge at arm-time, so it
## reads its post-arm count).
func show_tool_armed_banner(id: String) -> void:
	if _action_tool == null:
		return
	_inspected_tool = id
	_update_action_state()
	# An armed tool is a MODE the player can forget they're in — keep a gentle breathe
	# on its icon card until it's disarmed/spent (UiFx; rests on hide).
	UiFx.content_fade(_action_tool)
	UiFx.attach_attention_pulse(_tool_view_icon_box, 1.04, 1.4)

## The armed mode ended (the tap fired, or Disarm): drop the inspect so the panel
## returns to the stockpile (React clears inspectedTool when toolPending goes null).
func hide_tool_armed_banner() -> void:
	if _tool_view_icon_box != null:
		UiFx.clear_attention_pulse(_tool_view_icon_box)
	_inspected_tool = ""
	_update_action_state()

# ── live-chain tracking (pushed by Main from _on_chain_changed) ───────────────

## A3 — Main pushes the live drag state (length + the chained tile type); the action
## panel flips to its CHAIN state while a drag is in flight and back when it ends
## (length 0). The chain view colours its bar by the chain's STAGE.
func set_live_chain(length: int, tile: int) -> void:
	var ended: bool = length <= 0 and _live_chain_len > 0
	_live_chain_len = length
	_live_chain_tile = tile
	# React: when a chain drag ends and no tool is ARMED, drop the inspect so the panel
	# returns to the stockpile rather than a stale tool detail (prototype.tsx's
	# "chainInfo goes null and no toolPending → setInspectedTool(null)"). An armed fill_bias
	# (fertilizer &c) counts as armed too — its inspect survives a chain ending.
	if ended and _inspected_tool != "" and (game == null or game.pending_tool != _inspected_tool) \
			and not _is_armed_fill_bias(_inspected_tool):
		_inspected_tool = ""
	_update_action_state()

## Swap the action panel to the state the player's current activity demands —
## chain > tool > idle (React PuzzleActionPanel's `hasChain ? "chain" : inspectedTool
## ? "tool" : "idle"`) — and refresh the now-visible state's content.
func _update_action_state() -> void:
	if _action_panel == null:
		return
	var chain_live: bool = _live_chain_len > 0 and _live_chain_tile != Constants.EMPTY
	var tool_live: bool = _inspected_tool != "" and ToolConfig.has_tool(_inspected_tool)
	_action_chain.visible = chain_live
	_action_tool.visible = not chain_live and tool_live
	_action_idle.visible = not chain_live and not tool_live
	if _action_chain.visible:
		_refresh_chain_progress()
	elif _action_tool.visible:
		_refresh_action_tool()

## Refresh the TOOL state content (React ToolView) from _inspected_tool + game:
## header mode (INSPECT / READY / ARMED) + charge count, icon card (red-edged while
## armed), name + description, and the footer prompt + ARM / DISARM / USE NOW button.
func _refresh_action_tool() -> void:
	if _action_tool == null or _inspected_tool == "":
		return
	var id := _inspected_tool
	var charges: int = game.tool_count(id) if game != null else 0
	# A fill_bias tool (fertilizer &c) is "armed" via the transient bias, never pending_tool —
	# fold it into `armed` so the header/dot/icon-card read ARMED the same as a tap-tool.
	var fb_armed: bool = _is_armed_fill_bias(id)
	var armed: bool = (game != null and game.pending_tool == id) or fb_armed
	var is_tap: bool = ToolConfig.is_tap_target(id)

	var mode: String = "TOOL ARMED" if armed else ("TOOL READY" if is_tap else "TOOL INSPECT")
	_tool_armed_title.text = "%s · ×%d LEFT" % [mode, charges]
	_tool_armed_title.add_theme_color_override(
		"font_color", Color("#9a1a1a") if armed else Palette.INK)
	_set_dot_color(_tool_head_dot, Color("#e02828") if armed else Color("#8a6a47"))

	_tool_armed_name.text = ToolConfig.tool_label(id)
	_tool_armed_desc.text = ToolConfig.tool_desc(id)
	_tool_view_icon.texture = UiKit.resource_icon(id)
	_tool_view_icon_box.add_theme_stylebox_override("panel", _tool_icon_box_style(armed))

	if is_tap:
		_tool_view_footer.add_theme_stylebox_override(
			"panel", _tool_footer_style("armed" if armed else "ready"))
		_tool_view_prompt.text = "Tap a tile on the board" if armed else "Arm it — then pick a tile"
		_tool_view_prompt.add_theme_color_override(
			"font_color", Color("#9a1a1a") if armed else Color("#7a3c12"))
		if armed:
			_tool_action_btn.text = "✕ DISARM"
			_style_cta(_tool_action_btn, Color("#d05030"), Color("#5a1a08"), Color("#fff8e7"))
		else:
			_tool_action_btn.text = "◎ ARM"
			_style_cta(_tool_action_btn, Color("#eb9440"), Color("#7a3c12"), Color("#2c1408"))
		_tool_action_btn.disabled = charges <= 0 and not armed
	elif fb_armed:
		# Armed fill_bias (fertilizer/bird_feed/sapling): a transient spawn bias is live, biasing
		# the NEXT field toward its target tile. Mirror the tap-tool ARMED footer — hot-red wash +
		# a DISARM button that refunds the spent charge (React's disarmFillBias).
		_tool_view_footer.add_theme_stylebox_override("panel", _tool_footer_style("armed"))
		var target_name: String = UiKit.pretty_name(Constants.string_key(game.fill_bias_target))
		_tool_view_prompt.text = "Next field favours %s" % target_name
		_tool_view_prompt.add_theme_color_override("font_color", Color("#9a1a1a"))
		_tool_action_btn.text = "✕ DISARM"
		_style_cta(_tool_action_btn, Color("#d05030"), Color("#5a1a08"), Color("#fff8e7"))
		_tool_action_btn.disabled = false
	else:
		_tool_view_footer.add_theme_stylebox_override("panel", _tool_footer_style("instant"))
		_tool_view_prompt.text = "Affects the whole board"
		_tool_view_prompt.add_theme_color_override("font_color", Color("#7a5520"))
		_tool_action_btn.text = "✓ USE NOW"
		_style_cta(_tool_action_btn, Color("#6aa338"), Color("#3a5a12"), Color("#0c2e10"))
		_tool_action_btn.disabled = charges <= 0

# ── HUD layout (pinned by Main's _layout) ─────────────────────────────────────

## Y where the BOARD band starts — Main._layout places the board's top edge here,
## below the action panel and the chain hint line.
func board_top() -> float:
	return PANEL_TOP + PANEL_H + 30.0

## Pin the width-anchored HUD containers to the current viewport. The board page is a
## FIXED vertical stack (the React BoardLayout portrait template): top bar → season bar
## → tool hotbar → action panel → chain hint → board (Main._layout reads board_top()) —
## constant bands, so no card can ever float over the board again (the old stockpile
## card at vp.y*0.74 buried the bottom tile row).
func _layout_hud(vp: Vector2) -> void:
	# The top-bar is PRESET_TOP_WIDE (anchors left=0..right=1), so zero L/R offsets
	# already make it span the full viewport width — don't set size.x (that fights
	# the anchors and triggers a "non-equal opposite anchors" warning).
	if _topbar != null:
		_topbar.offset_left = 0
		_topbar.offset_right = 0
		_topbar.offset_top = 0
	# Vertically centre the floating ⚙ on the top bar's band. Deferred: the bar's
	# content-driven height (and the button's own size) settle a frame after a layout
	# pass, so measuring immediately would centre against stale sizes.
	_align_menu_btn.call_deferred()
	var band_margin: float = maxf(12.0, vp.x * 0.03)
	# A2 — the season bar spans the full width within the HUD margins, just below the top bar.
	if _season_bar_box != null:
		_season_bar_box.offset_left = band_margin
		_season_bar_box.offset_right = -band_margin
		_season_bar_box.offset_top = 66.0
	# Tool hotbar — a fixed-height rail under the season bar (React's hotbar area).
	if _tool_palette_box != null:
		_tool_palette_box.offset_left = band_margin
		_tool_palette_box.offset_right = -band_margin
		_tool_palette_box.offset_top = HOTBAR_TOP
		_tool_palette_box.offset_bottom = HOTBAR_TOP + HOTBAR_H
	# Action panel — the fixed state-swapping card between the hotbar and the board.
	if _action_panel != null:
		_action_panel.offset_left = band_margin
		_action_panel.offset_right = -band_margin
		_action_panel.offset_top = PANEL_TOP
		_action_panel.offset_bottom = PANEL_TOP + PANEL_H
	# Chain hint — the slim prompt in the gap between the panel and the board.
	if _chain_label != null:
		_chain_label.offset_top = PANEL_TOP + PANEL_H + 7.0

## Centre the floating ⚙ button vertically within the top bar's band. The old fixed
## offset_top 18 left the gear hanging below the pill row (the "misaligned gear" on the
## title bar); centring against the bar's real content-driven height tracks any future
## pill/title size change for free. Deferred from _layout_hud so both sizes are settled.
func _align_menu_btn() -> void:
	if _menu_btn == null or _topbar == null:
		return
	var bar_h: float = _topbar.size.y
	var btn_h: float = _menu_btn.size.y
	if bar_h <= 0.0 or btn_h <= 0.0:
		return
	_menu_btn.offset_top = maxf(6.0, (bar_h - btn_h) / 2.0)

# ── refreshers (re-pointed from Main; names kept for the capture-script contract) ──

## The ACTIVE biome's stockpile roster (React IdleView reads BIOMES[biomeKey].resources,
## so a mine/harbor expedition shows that biome's goods instead of the farm list).
func _active_roster() -> Array:
	if game != null and game.is_in_mine():
		return STOCKPILE_ROSTER_MINE
	if game != null and game.is_in_harbor():
		return STOCKPILE_ROSTER_FISH
	return STOCKPILE_ROSTER

## M4b — rebuild the stockpile chip grid (the action panel's IDLE state) from inventory.
## KEEPS the name `_refresh_totals` so the capture scripts + Main still call it.
func _refresh_totals() -> void:
	if _stockpile_grid == null:
		return
	# Clear the previous chips + the registry.
	for child in _stockpile_grid.get_children():
		child.queue_free()
	_stockpile_chips.clear()

	# Build the chip order: every ROSTER resource (always shown — dimmed at 0), then any OWNED
	# resource NOT in the roster (a mine/expedition good carried back), sorted, so nothing owned
	# is ever hidden. (Deliberate port adaptation: React trims to the fixed 12; the port appends
	# extras because the idle grid scrolls inside the fixed panel, so nothing can overflow.)
	var roster: Array = _active_roster()
	var roster_owned: int = 0
	var order: Array = []
	for res in roster:
		order.append(String(res))
	var extras: Array = []
	if game != null:
		for key in game.inventory:
			var k := String(key)
			if int(game.inventory[key]) > 0 and not roster.has(k):
				extras.append(k)
	extras.sort()
	order.append_array(extras)

	for res in order:
		var count: int = int(game.inventory.get(res, 0)) if game != null else 0
		if roster.has(res) and count > 0:
			roster_owned += 1
		var chip := _make_stock_chip(res, count)
		_stockpile_grid.add_child(chip)
		_stockpile_chips[res] = chip

	# React PanelHeader: left "STOCKPILE", right "{owned}/{total} KINDS" — owned roster goods
	# over the roster size (the denominator is the fixed roster, like React's `list.length`).
	if _stockpile_kinds != null:
		_stockpile_kinds.text = "%d/%d KINDS" % [roster_owned, roster.size()]
	_stockpile_grid.visible = true

## M4b — coins now live in the top-bar coin pill (the old _meta_label is gone). The
## per-run turn counter is no longer surfaced (it was debug noise); the pill shows
## just the live coin balance. KEEPS the name so callers don't break.
func _refresh_meta() -> void:
	if _coin_pill == null or game == null:
		return
	# Count-up/down tick (UiFx) from the last shown balance — sells/buys/rewards read as
	# the number rolling to its new value instead of teleporting. First refresh snaps.
	var shown: int = int(_coin_pill.get_meta("_shown_coins", game.coins))
	UiFx.count_to(_coin_pill, shown, game.coins, "🪙 %d")
	_coin_pill.set_meta("_shown_coins", game.coins)
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
		# Glide the XP fill to its new width (UiFx) so quest/almanac XP visibly flows in.
		UiFx.resize_to(_level_xp_fill, Vector2(LEVEL_PILL_W * clampf(into, 0.0, 1.0), 22))

## M4b — the settlement tier + plots now live in the top-bar tier pill (e.g.
## "City · 2/11"); a "▲" prefix hints when a tier-up is affordable. KEEPS the name.
func _refresh_settlement() -> void:
	if _tier_pill == null or game == null:
		return
	var s := game.settlement
	var text: String = "%s · %d/%d" % [s.tier_name(), game.plots_used(), s.plots()]
	if game.can_tier_up():
		text = "▲ " + text
		# An affordable advance is the run's headline action — breathe until taken.
		UiFx.attach_attention_pulse(_tier_pill.get_parent() as Control)
	else:
		UiFx.clear_attention_pulse(_tier_pill.get_parent() as Control)
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
		# T22 multi-settlement: on the farm, surface WHICH settlement you're at. At home it reads
		# "Farm" (byte-identical to before — the home-only game never changes). At a FOUNDED non-home
		# farm settlement (meadow / orchard) it names the place + its biome so the player knows where
		# they're standing.
		var here := String(game.map_current)
		if here != "" and here != "home" and CartographyConfig.has_node(here) and game.is_settlement_founded(here):
			var node_name := String(CartographyConfig.by_id(here).get("name", here))
			var biome_id := game.settlement_biome_id(here)
			var bdef := CartographyConfig.biome_def("farm", biome_id)
			var icon := String(bdef.get("icon", "🌾"))
			_biome_pill.text = "%s %s" % [icon, node_name]
		else:
			_biome_pill.text = "Farm"
		_biome_pill.add_theme_color_override("font_color", Palette.MOSS)

## T24/M4b: the seasonal boss now lives in the top-bar boss pill as a PROGRESS / TURNS readout,
## shown only while a challenge is active. The label reads "⚔ <Target> <progress>/<target> · Nt"
## (e.g. "⚔ Oak 12/30 · 6t"), where <Target> is a short label for the target resource. Hidden
## otherwise. The full modifier description shows in Main's boss banner; this pill is the at-a-glance
## status. Mirrors GameState's BossInstance fields.
func _refresh_boss() -> void:
	if _boss_pill_box == null or _boss_pill == null or game == null:
		return
	if game.is_boss_active():
		_boss_pill.text = "⚔ %s %d/%d · %dt" % [
			_boss_target_label(game.boss_target_resource),
			game.boss_progress, game.boss_target_amount, game.boss_turns_remaining]
		# The full modifier explanation is the pill's tooltip (hover) — the at-a-glance banner.
		var tip: String = "%s — %s" % [BossConfig.boss_name(game.boss_active), BossConfig.modifier_desc(game.boss_active)]
		_boss_pill_box.tooltip_text = tip
		_boss_pill.tooltip_text = tip
		_boss_pill_box.visible = true
		# An active fight wants the eye — gentle looping breathe while the boss is live.
		UiFx.attach_attention_pulse(_boss_pill_box)
	else:
		UiFx.clear_attention_pulse(_boss_pill_box)
		_boss_pill_box.visible = false

## A short human label for a boss target resource/tile key (e.g. "tile_tree_oak" → "Oak",
## "iron_bar" → "Iron", "fish_fillet" → "Fish"). The label now lives on each boss's
## target definition in BossConfig (target.label); this is a thin delegate so the call
## site stays terse and the mapping has a single owner.
func _boss_target_label(res: String) -> String:
	return BossConfig.target_label(res)

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
		_rats_pill.text = "🐀 %d/%d" % [game.ratcatcher_charges_left(), BuildingConfig.RATCATCHER_CHARGES]
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

## Refresh the CHAIN state of the action panel (the React ChainView port). KEEPS the
## name — Main + the m4b/m4e/m8d captures call it. Reads the live drag (length + tile
## pushed by set_live_chain), the carried progress (GameState.progress — the persisted
## remainder toward the next unit, React's carriedInCycle), and the zone's upgrade
## target, then drives:
##   • header — accent dot + right label ("{Res} chain" / "N more to collect" while
##     short of the minimum);
##   • the big bar — carried base fill (brown) + live STAGE-gradient fill on top; once
##     carried+length wraps the threshold the bar LOOPS (full brown + overflow fill);
##     the counter reads "len/thr", "carried+len/thr", or "rem/thr +cycles"; hazards
##     with no producer read "×N" with no fills (React's ×{length});
##   • the stage banner ("BONUS!"/…) + the resource icon card's accent ring + "+N"
##     earned badge;
##   • the "UPGRADE TO {tile}" footer with its mini progress track.
## Thresholds are the EFFECTIVE (worker/ability-reduced) values via
## GameState.effective_threshold — exactly what credit_chain will bank (and what
## React's GameScene feeds ChainView via effectiveThresholds).
func _refresh_chain_progress() -> void:
	if _chain_prog_label == null:
		return
	var length: int = _live_chain_len
	var tile: int = _live_chain_tile
	if length <= 0 or tile == Constants.EMPTY:
		return
	var threshold: int = game.effective_threshold(tile) if game != null \
		else Constants.threshold_for(tile)
	var has_threshold: bool = threshold > 0 and threshold < Constants.NO_THRESHOLD
	var res: String = Constants.produced_resource(tile)
	var min_chain: int = board.min_chain if board != null else Constants.MIN_CHAIN
	var too_short: bool = length < min_chain

	# Stage by upgrades EARNED this chain (floor(len/threshold), clamped into CHAIN_STAGES).
	var earned_units: int = int(length / threshold) if has_threshold else 0
	var stage: Dictionary = Constants.CHAIN_STAGES[
		clampi(earned_units, 0, Constants.CHAIN_STAGES.size() - 1)]
	var stage_top := Color(String(stage.get("top", "#f0c14b")))
	var stage_bot := Color(String(stage.get("bot", "#d97a2a")))
	var accent := Color(String(stage.get("accent", "#e07a3a")))

	# Header (React: right = tooShort ? "N more to collect" : "{res} chain").
	var res_label: String = UiKit.pretty_name(res) if res != "" \
		else UiKit.pretty_name(Constants.string_key(tile))
	if too_short:
		_chain_head_right.text = "%d MORE TO COLLECT" % (min_chain - length)
		_set_dot_color(_chain_head_dot, Color("#9a7b4f"))
	else:
		_chain_head_right.text = "%s CHAIN" % res_label.to_upper()
		_set_dot_color(_chain_head_dot, accent)

	# Bar geometry. progress[res] is already the post-chain remainder (mod threshold),
	# so it IS React's carriedInCycle.
	var inner_w: float = maxf(0.0, _chain_prog_track.size.x - 4.0)
	var inner_h: float = maxf(0.0, _chain_prog_track.size.y - 4.0)
	var carried: int = int(game.progress.get(res, 0)) if (game != null and res != "") else 0
	if has_threshold:
		var combined: int = carried + length
		var looped: bool = combined >= threshold
		var cycles: int = combined / threshold
		var remainder: int = combined % threshold
		_chain_prog_fill.add_theme_stylebox_override("panel", _bar_fill_box(stage_top, stage_bot))
		if looped:
			# Past the threshold the bar RESETS: a full "old" brown base (only while the
			# overflow is non-zero — an exact boundary shows an empty bar + the "+N") and
			# the overflow stage fill growing again from the left.
			_chain_fill_carried.visible = remainder > 0
			_chain_fill_carried.position = Vector2(2, 2)
			_chain_fill_carried.size = Vector2(inner_w, inner_h)
			_chain_prog_fill.position = Vector2(2, 2)
			_chain_prog_fill.size = Vector2(inner_w * float(remainder) / float(threshold), inner_h)
			_chain_prog_label.text = ("%d/%d +%d" % [remainder, threshold, cycles]) if cycles > 0 \
				else ("%d/%d" % [remainder, threshold])
		else:
			var carried_w: float = inner_w * float(carried) / float(threshold)
			_chain_fill_carried.visible = carried > 0
			_chain_fill_carried.position = Vector2(2, 2)
			_chain_fill_carried.size = Vector2(carried_w, inner_h)
			_chain_prog_fill.position = Vector2(2 + carried_w, 2)
			_chain_prog_fill.size = Vector2(inner_w * float(length) / float(threshold), inner_h)
			_chain_prog_label.text = ("%d+%d/%d" % [carried, length, threshold]) if carried > 0 \
				else ("%d/%d" % [length, threshold])
	else:
		# A hazard / no-producer chain (RAT, golden coin, …): plain "×N", no fills.
		_chain_fill_carried.visible = false
		_chain_prog_fill.size = Vector2.ZERO
		_chain_prog_label.text = "×%d" % length

	# Track ring: from earned >= 2 the bar itself glows the stage accent (React's
	# `0 0 0 2px accent + 0 0 12px accent66` box-shadow at earned >= 2).
	var track_sb := _chain_track_box()
	if earned_units >= 2:
		track_sb.border_color = accent
		track_sb.shadow_size = 7
		track_sb.shadow_color = Color(accent, 0.45)
		track_sb.shadow_offset = Vector2.ZERO
	_chain_prog_track.add_theme_stylebox_override("panel", track_sb)

	# Stage banner: shown once an upgrade is earned. POP it on every stage ADVANCE
	# ("BONUS!" → "DOUBLE!" → …) so crossing a threshold mid-drag lands as a beat;
	# same-stage refreshes (every tile added) stay still.
	if _chain_stage_label != null:
		var stage_text: String = String(stage.get("label", ""))
		var was: String = String(_chain_stage_label.get_meta("_stage_shown", ""))
		_chain_stage_label.visible = has_threshold and earned_units >= 1 and stage_text != ""
		_chain_stage_label.text = stage_text
		if _chain_stage_label.visible and stage_text != was:
			UiFx.pop(_chain_stage_label)
		_chain_stage_label.set_meta("_stage_shown", stage_text if _chain_stage_label.visible else "")
		_chain_stage_label.add_theme_color_override(
			"font_color", Color8(0xff, 0xe7, 0xa0) if earned_units >= 4 else Palette.PARCHMENT)

	# Resource icon card: the produced resource's icon (the tile's own art for a
	# non-producer), accent ring + "+N" badge once an upgrade is earned.
	if _chain_res_icon != null:
		var icon_tex: Texture2D = UiKit.resource_icon(res) if res != "" else Tile.texture_for(tile)
		_chain_res_icon.texture = icon_tex
		_chain_res_box.add_theme_stylebox_override("panel",
			_chain_res_box_style(accent if earned_units > 0 else Palette.IRON))
		_chain_earn_badge.visible = earned_units > 0
		if earned_units > 0:
			_chain_earn_label.text = "+%d" % earned_units
			var badge_sb := StyleBoxFlat.new()
			badge_sb.bg_color = accent
			badge_sb.border_color = Palette.INK
			badge_sb.set_border_width_all(2)
			badge_sb.set_corner_radius_all(10)
			badge_sb.content_margin_left = 7
			badge_sb.content_margin_right = 7
			badge_sb.content_margin_top = 1
			badge_sb.content_margin_bottom = 1
			_chain_earn_badge.add_theme_stylebox_override("panel", badge_sb)

	# "UPGRADE TO {tile}" footer. The provider (GameState.upgrade_spawn against the
	# active farm zone) answers count 0 below the RAW threshold, so probe with a
	# guaranteed-crediting length just to resolve the TARGET tile — React's
	# nextUpgradeTile returns the target regardless of the live count.
	var show_footer: bool = false
	if has_threshold and board != null and board.upgrade_provider.is_valid():
		var raw_threshold: int = Constants.threshold_for(tile)
		var probe: Dictionary = board.upgrade_provider.call(tile, maxi(length, raw_threshold))
		var up_tile: int = int(probe.get("tile", Constants.EMPTY))
		if up_tile != Constants.EMPTY:
			show_footer = true
			_chain_upg_icon.texture = Tile.texture_for(up_tile)
			_chain_upg_name.text = UiKit.pretty_name(Constants.string_key(up_tile))
			var upg_w: float = maxf(0.0, _chain_upg_track.size.x)
			var pct: float = clampf(float(length) / float(threshold), 0.0, 1.0)
			_chain_upg_fill.position = Vector2.ZERO
			_chain_upg_fill.size = Vector2(upg_w * pct, maxf(0.0, _chain_upg_track.size.y))
			_chain_upg_fill.add_theme_stylebox_override(
				"panel", _bar_fill_box(accent, stage_top, true))
			_chain_upg_count.text = "%d/%d" % [length, threshold]
			# The "+1" chip lights up stage-tinted once the chain has earned an upgrade.
			var plus_sb := StyleBoxFlat.new()
			plus_sb.set_corner_radius_all(7)
			plus_sb.content_margin_left = 7
			plus_sb.content_margin_right = 7
			if earned_units >= 1:
				plus_sb.bg_color = accent
				_chain_upg_plus_lbl.add_theme_color_override("font_color", Color("#fff8e7"))
			else:
				plus_sb.bg_color = Color(0, 0, 0, 0)
				_chain_upg_plus_lbl.add_theme_color_override("font_color", Color("#3d5d18"))
			_chain_upg_plus.add_theme_stylebox_override("panel", plus_sb)
	if _chain_upg_row != null:
		_chain_upg_row.visible = show_footer

func _refresh_status() -> void:
	if board != null and _status_label != null and _status_label.text == "":
		_status_label.text = ""
