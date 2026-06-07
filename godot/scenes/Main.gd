extends Node2D
## Root scene: owns the Board and a CanvasLayer HUD (title, live chain counter,
## a running tally of collected resources, and a coins/turn readout). M2
## deliverable — wires the core mechanic to a persistent run economy (GameState)
## that is loaded on start and saved after every resolved chain.

var board: Board
var game: GameState                    ## canonical run economy (inventory/coins/turn)
var _audio: Audio                      ## M4d SFX service (owned, not autoload)

# ── M4d audio change-detection state ──────────────────────────────────────────
# A handful of "what changed" trackers so we can pick the right SFX on signals
# that only tell us "something happened" (town actions, chain extend/begin).
var _prev_chain_len: int = 0           ## last chain length seen → fire chain_start once per drag
var _last_tier: int = 0                ## settlement tier → detect a tier-up
var _last_coins: int = 0               ## coin balance → tell sell/buy from build/craft
var _last_in_mine: bool = false        ## biome flag → detect entering the mine
var _last_in_harbor: bool = false      ## biome flag → detect entering the harbor (M3j)

# ── M4b HUD: the original game's clean structure ──────────────────────────────
# A parchment top-bar of pills (settlement title + coins/tier/biome, with boss/rats
# pills surfacing only when active), a chain-progress bar under it, and a stockpile
# chip panel below the board. The old 11-stacked-labels HUD is gone; the kept member
# + method names (the *_label fields and every _refresh_* method) re-point here so
# the scene-smoke assertion (main._chain_label != null) and the capture scripts that
# call the refreshers all keep working.
var _chain_label: Label                 ## chain prompt above the board (KEPT — smoke asserts it)
var _status_label: Label                ## action feedback near the bottom (KEPT)
var _orders_label: Label                ## compact one-line orders readout above the stockpile

# Top-bar pill inner Labels (the PanelContainer wrappers hold them; we mutate text/visibility here).
var _coin_pill: Label                   ## 🪙 N
var _tier_pill: Label                   ## tier name · plots used/total
var _biome_pill: Label                  ## Farm / ⛏ Mine · N
var _boss_pill_box: PanelContainer      ## boss pill wrapper (toggled visible)
var _boss_pill: Label                   ## ⚔ Frostmaw HP/max
var _rats_pill_box: PanelContainer      ## rats pill wrapper (toggled visible)
var _rats_pill: Label                   ## 🐀 N/5
var _runes_pill_box: PanelContainer     ## M3j — runes pill wrapper (toggled visible)
var _runes_pill: Label                  ## ᚱ N (harbor's premium reward)

# Chain-progress bar.
var _chain_prog_label: Label            ## "{res}: {progress}/{threshold}"
var _chain_prog_track: Panel            ## DIM track behind the fill
var _chain_prog_fill: Panel             ## MOSS→GOLD fill (width = ratio * track width)
var _chain_prog_track_w: float = 0.0    ## current track inner width (recomputed on layout)

# Stockpile chip panel.
var _stockpile_grid: GridContainer      ## 4-col grid of resource chips
var _stockpile_empty: Label             ## muted "Stockpile empty" placeholder

# Top-bar / stockpile container refs, repositioned in _layout().
var _topbar: PanelContainer
var _chain_prog_box: PanelContainer
var _stockpile_box: PanelContainer

# M4b chain-progress tracking: the last resolved resource + its threshold, so the
# bar shows fractional progress toward the next unit. Mirrors GameState.progress.
var _last_res: String = ""
var _last_threshold: int = 0

var _town_screen: TownScreen            ## the real on-screen Town panel (M3e), lazily created
var _menu_screen: MenuScreen            ## the settings/menu modal (M4f), lazily created
var _inventory_screen: InventoryScreen  ## the dedicated Inventory ledger modal (M4g), lazily created
var _townmap_screen: TownMapScreen      ## the spatial town-map modal (M6c), lazily created
## M10 — the achievements trophy modal, lazily created. Loaded via preload (the script
## has NO class_name) so the port never needs an --import to register it as a global.
const AchievementsScreenScript := preload("res://scenes/AchievementsScreen.gd")
var _achievements_screen                ## CanvasLayer (AchievementsScreenScript), lazily created
## M11 — the tile-collection browser modal, lazily created. Loaded via preload (NO
## class_name) so the port never needs an --import pass to register it as a global.
const TileCollectionScreenScript := preload("res://scenes/TileCollectionScreen.gd")
var _tile_collection_screen             ## CanvasLayer (TileCollectionScreenScript), lazily created
## Story UI — the beat presenter (drains game.story.beat_queue) + the chronicle timeline,
## both lazily created. Loaded via preload (NO class_name) so the port never needs an
## --import pass to register them as globals (mirrors AchievementsScreen / TileCollection).
const StoryModalScript := preload("res://scenes/StoryModal.gd")
const ChronicleScreenScript := preload("res://scenes/ChronicleScreen.gd")
var _story_modal                        ## CanvasLayer (StoryModalScript), lazily created
var _chronicle_screen                   ## CanvasLayer (ChronicleScreenScript), lazily created
## Townsfolk roster screen — NPC cards with bond bars, lazily created. Loaded via preload
## (NO class_name) so the port never needs an --import pass to register it as a global.
const TownsfolkScreenScript := preload("res://scenes/TownsfolkScreen.gd")
var _townsfolk_screen                   ## CanvasLayer (TownsfolkScreenScript), lazily created
## Cartography world-map screen — the 3-zone world view + alternate expedition entry, lazily
## created. Loaded via preload (NO class_name) so the port never needs an --import pass to
## register it as a global (mirrors AchievementsScreen / TileCollection / Chronicle / Townsfolk).
const CartographyScreenScript := preload("res://scenes/CartographyScreen.gd")
var _cartography_screen                  ## CanvasLayer (CartographyScreenScript), lazily created
## Recipe wiki — read-only reference of all craftable recipes, lazily created. Loaded via
## preload (NO class_name) so the port never needs an --import pass to register it as a global
## (mirrors AchievementsScreen / TileCollection / Chronicle / Townsfolk / Cartography).
const RecipeWikiScreenScript := preload("res://scenes/RecipeWikiScreen.gd")
var _recipe_wiki_screen                  ## CanvasLayer (RecipeWikiScreenScript), lazily created
## Tutorial onboarding modal — the 6-step welcome shown once to new players + replayable via
## apply_deeplink("tutorial"). Loaded via preload (NO class_name) so the port never needs an
## --import pass to register it as a global (mirrors all the other lazily-created modals).
const TutorialModalScript := preload("res://scenes/TutorialModal.gd")
var _tutorial_modal                      ## CanvasLayer (TutorialModalScript), lazily created
## Castle contributions screen — donate resources toward the 3 Castle needs (a one-way
## sink). Loaded via preload (NO class_name) so the port never needs an --import pass to
## register it as a global (mirrors AchievementsScreen / RecipeWiki / TileCollection).
const CastleScreenScript := preload("res://scenes/CastleScreen.gd")
var _castle_screen                       ## CanvasLayer (CastleScreenScript), lazily created
## Decorations screen — build repeatable ornaments that GRANT the Influence currency.
## Loaded via preload (NO class_name) so the port never needs an --import pass to register it
## as a global (mirrors CastleScreen / AchievementsScreen / RecipeWiki / TileCollection).
const DecorationsScreenScript := preload("res://scenes/DecorationsScreen.gd")
var _decorations_screen                  ## CanvasLayer (DecorationsScreenScript), lazily created
## Portal screen — summon magic tools with the Influence currency (build gate: coins + runes).
## Loaded via preload (NO class_name) so the port never needs an --import pass to register it
## as a global (mirrors DecorationsScreen / CastleScreen / RecipeWiki / TileCollection).
const PortalScreenScript := preload("res://scenes/PortalScreen.gd")
var _portal_screen                       ## CanvasLayer (PortalScreenScript), lazily created
## Charter screen — read-only reflection of the Hollow Pact's six terms against the story
## choice_log + flags. Loaded via preload (NO class_name) so the port never needs an --import
## pass to register it (mirrors PortalScreen / DecorationsScreen / CastleScreen).
const CharterScreenScript := preload("res://scenes/CharterScreen.gd")
var _charter_screen                      ## CanvasLayer (CharterScreenScript), lazily created
var _router := ViewRouter.new()         ## M5b: nav state machine (pure, tree-free)

# ── M8d ToolPalette ────────────────────────────────────────────────────────────
# A vertical parchment strip pinned to the RIGHT edge of the screen (below the ☰
# menu button) showing each owned tool with charges > 0 as a clickable button.
# Clicking fires use_tool(id) then _refresh_tools() so the count or disappearance
# reflects the spend immediately. Hidden completely when game.tools is empty.
var _tool_palette_box: PanelContainer   ## outer parchment card (hidden when no tools)
var _tool_buttons: Dictionary = {}      ## {tool_id: Button} — rebuilt on each _refresh_tools()

# ── M4e reward "juice" ────────────────────────────────────────────────────────
# A dedicated full-screen CanvasLayer (layer 2, ABOVE the HUD's layer 1) that hosts
# the short-lived reward chips that fly from the board to the coin pill on every
# resolved chain — the original game's "rewardTrajectory" feedback. Kept separate so
# the flying chips always render over the top-bar pills they land on.
var _fx_layer: CanvasLayer

func _ready() -> void:
	game = SaveManager.load_state()
	# Seed the order generator with a fixed int so the running game's orders (and
	# screenshots) are deterministic, then top the order board up to MAX_ORDERS.
	game.seed_orders(1337)
	game.refill_orders()
	# Story engine: post the session-start event so the arrival beat (and any beats whose
	# thresholds/flags a loaded save already satisfies) fire and enqueue. Posting here (vs
	# auto-calling in GameState.new()) keeps headless economy suites unaffected. The beat
	# modal that DRAINS story.beat_queue is presented at the END of _ready via
	# _drain_story_queue() (the HUD must exist first so the modal layers above it).
	game.start_story_session()
	# M8c — STARTER TOOL GRANT (the honest minimal source so tools are reachable now that
	# they're wired into the live board). Grant a tiny starter set ONLY on a FRESH game:
	# `game.tools.is_empty()` is true for a brand-new save (and for an old pre-M8b save
	# with no tools) but false once any tool has been granted, so a LOADED game with
	# existing tool charges is never double-granted (and spent-to-zero tools stay gone —
	# use_tool_on_grid erases a tool at 0 charges, so this only re-fires on a truly
	# tool-less save). Persisted automatically via the M8b save/load. This is a MINIMAL
	# PLACEHOLDER source — richer sources (crafting recipes, a portal/expedition reward)
	# arrive in later milestones; M8d adds the ToolPalette UI to actually pick + use them.
	if game.tools.is_empty():
		game.grant_tool("bomb", 1)     # tap-target (3x3 area blast) — proves targeting mode
		game.grant_tool("scythe", 1)   # instant (clears 6 random tiles) — proves instant path
	_build_hud()
	_refresh_tools()   # M8d: populate the palette after the starter grant
	board = Board.new()
	add_child(board)
	board.chain_changed.connect(_on_chain_changed)
	board.chain_resolved.connect(_on_chain_resolved)
	# M8c — a tapped cell while a tap-target tool is armed fires the armed tool on it.
	board.cell_tapped.connect(_on_tool_target)
	# M3j — a fish chain long enough to count toward a pearl capture reports its cells so we
	# can ask GameState.capture_pearl_if_adjacent whether they sit next to the live pearl.
	board.pearl_chain.connect(_on_pearl_chain)
	# Seed the board's refill pool from the restored save's ACTIVE BIOME (M3f): if
	# the save was mid-expedition, active_biome_pool() returns the mine pool and we
	# rebuild so mine tiles show immediately; otherwise it's the farm spawner pool.
	# Rebuild whenever we're in the mine OR any spawner was placed (the staples-only
	# board drawn in Board._ready would otherwise hide both).
	board.set_tile_pool(game.active_biome_pool())
	if game.is_in_mine() or game.is_in_harbor() or not game.buildings.is_empty():
		board.setup_new_board()
	# M3g: if the save was restored mid-fight, keep the boss's raised chain bar.
	board.set_min_chain(game.boss_min_chain())
	# M3h: a restored Master Ratcatcher makes grass chains clear adjacent rats.
	board.clear_rats_on_grass = game.has_master_ratcatcher()
	# M3i: mining through rubble is active exactly while on a mine expedition (a STONE
	# chain clears adjacent rubble — no building needed). A save restored mid-expedition
	# keeps it on.
	board.clear_rubble_on_stone = game.is_in_mine()
	# M3j: pearl capture is live exactly while on a harbor expedition (a fish chain next to
	# the pearl grabs the Rune). A save restored mid-harbor keeps it on; place the live pearl
	# back onto the board at its seeded cell so the rune target shows immediately.
	board.clear_pearl_on_fish_chain = game.is_in_harbor()
	if game.is_in_harbor() and game.has_active_pearl():
		board.place_pearl(Vector2i(int(game.fish_pearl.get("col", 0)), int(game.fish_pearl.get("row", 0))))
	# M4d: SFX service (owned by Main, not an autoload — see Audio.gd). Seed the
	# change-trackers from the restored save so the FIRST town/biome event compares
	# against the loaded state, not zero, and doesn't fire a spurious sound.
	_audio = Audio.new()
	add_child(_audio)
	# M4f: apply the restored mute preference so a saved "muted" choice takes effect on
	# launch (the settings/menu modal flips it; GameState persists it).
	_audio.set_muted(game.audio_muted)
	_last_tier = game.settlement.tier
	_last_coins = game.coins
	_last_in_mine = game.is_in_mine()
	_last_in_harbor = game.is_in_harbor()
	_layout()
	get_viewport().size_changed.connect(_layout)
	# Reflect any restored save immediately (inventory + coins + turn + tier + biome + boss + rats).
	_refresh_totals()
	_refresh_meta()
	_refresh_settlement()
	_refresh_buildings()
	_refresh_orders()
	_refresh_biome()
	_refresh_boss()
	_refresh_rats()
	_refresh_runes()
	_refresh_chain_progress()
	# Tutorial onboarding: show the 6-step welcome modal on FIRST LOAD (tutorial_seen=false).
	# ORDERING — the tutorial is shown FIRST (layer 6, above StoryModal's layer 5) so it
	# doesn't fight the arrival story beat. The story queue is drained AFTER the tutorial
	# finishes (via _on_tutorial_finished → _drain_story_queue). If the player has already
	# seen the tutorial the queue is drained immediately as before.
	if not game.tutorial_seen:
		_open_tutorial()
	else:
		# Story UI: present any beats already queued (the arrival beat fired by
		# start_story_session above, plus any threshold/flag beats a loaded save satisfied).
		# The HUD + board are built now, so the beat modal layers cleanly above them.
		_drain_story_queue()

func _layout() -> void:
	var vp: Vector2 = get_viewport_rect().size
	board.layout_for(vp)
	var bw: Vector2 = board.board_pixel_size()
	# Board sits below the top-bar + chain-progress bar (≈ 0–110px) and above the
	# orders + stockpile below it. A touch lower than the old 0.22 to clear the bar.
	board.position = Vector2((vp.x - bw.x) / 2.0, vp.y * 0.24)
	_layout_hud(vp)
	_refresh_status()
	# The chain-progress track width tracks the box width, so re-measure + redraw
	# the fill after the containers have settled at the new viewport size.
	_refresh_chain_progress.call_deferred()

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
	if _chain_prog_box != null:
		var cw: float = minf(520.0, vp.x - 32.0)
		_chain_prog_box.offset_left = -cw / 2.0
		_chain_prog_box.offset_right = cw / 2.0
		_chain_prog_box.offset_top = 76.0
	if _stockpile_box != null:
		var margin: float = maxf(16.0, vp.x * 0.04)
		_stockpile_box.offset_left = margin
		_stockpile_box.offset_right = -margin
		_stockpile_box.offset_top = vp.y * 0.74

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
	# Left margin clears the floating "🏠 Town" button (pinned top-left at offset 18,
	# ≈135px wide) so the settlement title isn't clipped under it.
	topbar_margin.add_theme_constant_override("margin_left", 168)
	topbar_margin.add_theme_constant_override("margin_right", 18)
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
	topbar_row.add_child(title)

	# Spacer pushes the pills to the right edge.
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	topbar_row.add_child(spacer)

	# RIGHT — the pill cluster. coins (gold), tier (ink), biome (moss/ember), then
	# the conditionally-visible boss + rats pills.
	var coin_box := UiKit.make_pill("🪙 0", Palette.EMBER)
	_coin_pill = coin_box.get_meta("label")
	topbar_row.add_child(coin_box)

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
	_runes_pill_box = UiKit.make_pill("ᚱ 0", Color(0.18, 0.46, 0.50))
	_runes_pill = _runes_pill_box.get_meta("label")
	_runes_pill_box.visible = false
	topbar_row.add_child(_runes_pill_box)

	# ── B. Chain-progress bar (just under the top-bar) ────────────────────────
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
	# Keep the fill height + track width in sync when the track is resized.
	_chain_prog_track.resized.connect(_on_chain_track_resized)

	# ── chain prompt (kept) — sits just above the board, centered ─────────────
	_chain_label = Label.new()
	_chain_label.text = "Drag 3+ matching tiles"
	_chain_label.add_theme_font_size_override("font_size", 22)
	_chain_label.add_theme_color_override("font_color", Palette.INK_MID)
	_chain_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_chain_label.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_chain_label.offset_top = 124
	_chain_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_chain_label)

	# ── status (kept) — action feedback near the bottom, centered ─────────────
	_status_label = Label.new()
	_status_label.text = ""
	_status_label.add_theme_font_size_override("font_size", 20)
	_status_label.add_theme_color_override("font_color", Palette.MOSS)
	_status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_status_label.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_status_label.offset_top = -56
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
	_orders_label.offset_top = -118
	_orders_label.offset_left = 24
	_orders_label.offset_right = -24
	_orders_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_orders_label)

	# ── C. Stockpile chip panel — parchment card below the board ──────────────
	_build_stockpile(root)

	# ── D. Tool palette — vertical parchment strip pinned to the right edge ───
	_build_tool_palette(root)

	# Always-visible "🏠 Town" button — the REAL path into the town menu (the
	# temporary T/1-6/B/G/F keys below stay only as a harmless dev fallback). It
	# IS clickable (unlike every other HUD Control), so it must NOT use
	# MOUSE_FILTER_IGNORE. Pinned top-left, away from the centred board drag area.
	var town_btn := Button.new()
	town_btn.text = "🏠 Town"
	town_btn.add_theme_font_size_override("font_size", 20)
	town_btn.add_theme_color_override("font_color", Palette.INK)
	town_btn.add_theme_color_override("font_hover_color", Palette.EMBER)
	town_btn.add_theme_color_override("font_pressed_color", Palette.INK_MID)
	# Parchment chip: warm fill, iron border, soft rounded corners — the cozy
	# journal look. Hover/pressed states lighten/darken the same parchment.
	var normal := UiKit.parchment_box(Palette.PARCHMENT)
	var hover := UiKit.parchment_box(Palette.PARCHMENT_SOFT)
	var pressed := UiKit.parchment_box(Palette.DIM)
	town_btn.add_theme_stylebox_override("normal", normal)
	town_btn.add_theme_stylebox_override("hover", hover)
	town_btn.add_theme_stylebox_override("pressed", pressed)
	town_btn.add_theme_stylebox_override("focus", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	town_btn.set_anchors_preset(Control.PRESET_TOP_LEFT)
	town_btn.offset_left = 18
	town_btn.offset_top = 18
	town_btn.connect("pressed", Callable(self, "_open_town"))
	root.add_child(town_btn)

	# M4f — always-visible "☰" menu button (settings/new-game), pinned top-RIGHT so it
	# clears the floating Town button + the board drag area. Same parchment-pill look as
	# the Town button. Opens the MenuScreen modal.
	var menu_btn := Button.new()
	menu_btn.text = "☰"
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
	menu_btn.connect("pressed", Callable(self, "_open_menu"))
	root.add_child(menu_btn)

	# M4g — always-visible "📦 Items" button, pinned top-LEFT just under the "🏠 Town"
	# button (which sits at offset_top 18, ≈38px tall) so the two stack without
	# overlapping and both clear the centred board drag area. Same parchment-pill look.
	# Opens the dedicated Inventory ledger modal (InventoryScreen).
	var items_btn := Button.new()
	items_btn.text = "📦 Items"
	items_btn.add_theme_font_size_override("font_size", 20)
	items_btn.add_theme_color_override("font_color", Palette.INK)
	items_btn.add_theme_color_override("font_hover_color", Palette.EMBER)
	items_btn.add_theme_color_override("font_pressed_color", Palette.INK_MID)
	items_btn.add_theme_stylebox_override("normal", UiKit.parchment_box(Palette.PARCHMENT))
	items_btn.add_theme_stylebox_override("hover", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	items_btn.add_theme_stylebox_override("pressed", UiKit.parchment_box(Palette.DIM))
	items_btn.add_theme_stylebox_override("focus", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	items_btn.set_anchors_preset(Control.PRESET_TOP_LEFT)
	items_btn.offset_left = 18
	items_btn.offset_top = 64
	items_btn.connect("pressed", Callable(self, "_open_inventory"))
	root.add_child(items_btn)

	# M6c — always-visible Map button, pinned top-LEFT just under the Items button
	# (offset_top 64, ~38px tall) so the three stack without overlapping and all
	# clear the centred board drag area. Same parchment-pill look. Opens the spatial
	# town-map modal (TownMapScreen).
	var map_btn := Button.new()
	map_btn.text = "🗺 Map"
	map_btn.add_theme_font_size_override("font_size", 20)
	map_btn.add_theme_color_override("font_color", Palette.INK)
	map_btn.add_theme_color_override("font_hover_color", Palette.EMBER)
	map_btn.add_theme_color_override("font_pressed_color", Palette.INK_MID)
	map_btn.add_theme_stylebox_override("normal", UiKit.parchment_box(Palette.PARCHMENT))
	map_btn.add_theme_stylebox_override("hover", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	map_btn.add_theme_stylebox_override("pressed", UiKit.parchment_box(Palette.DIM))
	map_btn.add_theme_stylebox_override("focus", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	map_btn.set_anchors_preset(Control.PRESET_TOP_LEFT)
	map_btn.offset_left = 18
	map_btn.offset_top = 110
	map_btn.connect("pressed", Callable(self, "_open_townmap"))
	root.add_child(map_btn)

	# M10 — always-visible "🏆" trophy button, pinned top-LEFT just under the Map button
	# (offset_top 110, ~38px tall) so the four buttons stack without overlapping and all
	# clear the centred board drag area. Same parchment-pill look. Opens the achievements
	# trophy modal (AchievementsScreen).
	var ach_btn := Button.new()
	ach_btn.text = "🏆"
	ach_btn.add_theme_font_size_override("font_size", 20)
	ach_btn.add_theme_color_override("font_color", Palette.INK)
	ach_btn.add_theme_color_override("font_hover_color", Palette.EMBER)
	ach_btn.add_theme_color_override("font_pressed_color", Palette.INK_MID)
	ach_btn.add_theme_stylebox_override("normal", UiKit.parchment_box(Palette.PARCHMENT))
	ach_btn.add_theme_stylebox_override("hover", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	ach_btn.add_theme_stylebox_override("pressed", UiKit.parchment_box(Palette.DIM))
	ach_btn.add_theme_stylebox_override("focus", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	ach_btn.set_anchors_preset(Control.PRESET_TOP_LEFT)
	ach_btn.offset_left = 18
	ach_btn.offset_top = 156
	ach_btn.connect("pressed", Callable(self, "_open_achievements"))
	root.add_child(ach_btn)

	# M11 — always-visible "📖" tile-collection button, pinned top-LEFT just under the
	# 🏆 achievements button (offset_top 156, ~38px tall) so the five buttons stack
	# without overlapping and all clear the centred board drag area. Same parchment-pill
	# look. Opens the tile-collection browser modal (TileCollectionScreen).
	var tiles_btn := Button.new()
	tiles_btn.text = "📖"
	tiles_btn.add_theme_font_size_override("font_size", 20)
	tiles_btn.add_theme_color_override("font_color", Palette.INK)
	tiles_btn.add_theme_color_override("font_hover_color", Palette.EMBER)
	tiles_btn.add_theme_color_override("font_pressed_color", Palette.INK_MID)
	tiles_btn.add_theme_stylebox_override("normal", UiKit.parchment_box(Palette.PARCHMENT))
	tiles_btn.add_theme_stylebox_override("hover", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	tiles_btn.add_theme_stylebox_override("pressed", UiKit.parchment_box(Palette.DIM))
	tiles_btn.add_theme_stylebox_override("focus", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	tiles_btn.set_anchors_preset(Control.PRESET_TOP_LEFT)
	tiles_btn.offset_left = 18
	tiles_btn.offset_top = 202
	tiles_btn.connect("pressed", Callable(self, "_open_tiles"))
	root.add_child(tiles_btn)

	# Story UI — always-visible "📜" chronicle button, pinned top-LEFT just under the
	# 📖 tile-collection button (offset_top 202, ~38px tall) so the six buttons stack
	# without overlapping and all clear the centred board drag area. Same parchment-pill
	# look. Opens the chronicle timeline modal (ChronicleScreen).
	var chronicle_btn := Button.new()
	chronicle_btn.text = "📜"
	chronicle_btn.add_theme_font_size_override("font_size", 20)
	chronicle_btn.add_theme_color_override("font_color", Palette.INK)
	chronicle_btn.add_theme_color_override("font_hover_color", Palette.EMBER)
	chronicle_btn.add_theme_color_override("font_pressed_color", Palette.INK_MID)
	chronicle_btn.add_theme_stylebox_override("normal", UiKit.parchment_box(Palette.PARCHMENT))
	chronicle_btn.add_theme_stylebox_override("hover", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	chronicle_btn.add_theme_stylebox_override("pressed", UiKit.parchment_box(Palette.DIM))
	chronicle_btn.add_theme_stylebox_override("focus", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	chronicle_btn.set_anchors_preset(Control.PRESET_TOP_LEFT)
	chronicle_btn.offset_left = 18
	chronicle_btn.offset_top = 248
	chronicle_btn.connect("pressed", Callable(self, "_open_chronicle"))
	root.add_child(chronicle_btn)

	# Townsfolk — always-visible "👥" roster button, pinned top-LEFT just under the
	# 📜 chronicle button (offset_top 248, ~38px tall) so the seven buttons stack
	# without overlapping and all clear the centred board drag area. Same parchment-pill
	# look. Opens the TownsfolkScreen roster modal.
	var folk_btn := Button.new()
	folk_btn.text = "👥"
	folk_btn.add_theme_font_size_override("font_size", 20)
	folk_btn.add_theme_color_override("font_color", Palette.INK)
	folk_btn.add_theme_color_override("font_hover_color", Palette.EMBER)
	folk_btn.add_theme_color_override("font_pressed_color", Palette.INK_MID)
	folk_btn.add_theme_stylebox_override("normal", UiKit.parchment_box(Palette.PARCHMENT))
	folk_btn.add_theme_stylebox_override("hover", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	folk_btn.add_theme_stylebox_override("pressed", UiKit.parchment_box(Palette.DIM))
	folk_btn.add_theme_stylebox_override("focus", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	folk_btn.set_anchors_preset(Control.PRESET_TOP_LEFT)
	folk_btn.offset_left = 18
	folk_btn.offset_top = 294
	folk_btn.connect("pressed", Callable(self, "_open_townsfolk"))
	root.add_child(folk_btn)

	# Cartography — always-visible "🧭" world-map button, pinned top-LEFT just under the
	# 👥 townsfolk button (offset_top 294, ~38px tall) so the eight buttons stack without
	# overlapping and all clear the centred board drag area. Same parchment-pill look.
	# Opens the CartographyScreen world map (a DISTINCT icon + modal from the 🗺 town
	# building map, which keeps the "map"→TOWNMAP routing).
	var carto_btn := Button.new()
	carto_btn.text = "🧭"
	carto_btn.add_theme_font_size_override("font_size", 20)
	carto_btn.add_theme_color_override("font_color", Palette.INK)
	carto_btn.add_theme_color_override("font_hover_color", Palette.EMBER)
	carto_btn.add_theme_color_override("font_pressed_color", Palette.INK_MID)
	carto_btn.add_theme_stylebox_override("normal", UiKit.parchment_box(Palette.PARCHMENT))
	carto_btn.add_theme_stylebox_override("hover", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	carto_btn.add_theme_stylebox_override("pressed", UiKit.parchment_box(Palette.DIM))
	carto_btn.add_theme_stylebox_override("focus", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	carto_btn.set_anchors_preset(Control.PRESET_TOP_LEFT)
	carto_btn.offset_left = 18
	carto_btn.offset_top = 340
	carto_btn.connect("pressed", Callable(self, "_open_cartography"))
	root.add_child(carto_btn)

	# Recipe Wiki — always-visible "🍳" recipe-wiki button, pinned top-LEFT just under the
	# 🧭 cartography button (offset_top 340, ~38px tall) so the nine buttons stack without
	# overlapping and all clear the centred board drag area. Same parchment-pill look.
	# Opens the RecipeWikiScreen read-only recipe reference.
	var recipes_btn := Button.new()
	recipes_btn.text = "🍳"
	recipes_btn.add_theme_font_size_override("font_size", 20)
	recipes_btn.add_theme_color_override("font_color", Palette.INK)
	recipes_btn.add_theme_color_override("font_hover_color", Palette.EMBER)
	recipes_btn.add_theme_color_override("font_pressed_color", Palette.INK_MID)
	recipes_btn.add_theme_stylebox_override("normal", UiKit.parchment_box(Palette.PARCHMENT))
	recipes_btn.add_theme_stylebox_override("hover", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	recipes_btn.add_theme_stylebox_override("pressed", UiKit.parchment_box(Palette.DIM))
	recipes_btn.add_theme_stylebox_override("focus", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	recipes_btn.set_anchors_preset(Control.PRESET_TOP_LEFT)
	recipes_btn.offset_left = 18
	recipes_btn.offset_top = 386
	recipes_btn.connect("pressed", Callable(self, "_open_recipes"))
	root.add_child(recipes_btn)

	# Castle — always-visible "🏰" castle button, pinned top-LEFT just under the
	# 🍳 recipe-wiki button (offset_top 386, ~38px tall) so the ten buttons stack
	# without overlapping and all clear the centred board drag area. Same parchment-pill
	# look. Opens the CastleScreen resource-contribution screen.
	var castle_btn := Button.new()
	castle_btn.text = "🏰"
	castle_btn.add_theme_font_size_override("font_size", 20)
	castle_btn.add_theme_color_override("font_color", Palette.INK)
	castle_btn.add_theme_color_override("font_hover_color", Palette.EMBER)
	castle_btn.add_theme_color_override("font_pressed_color", Palette.INK_MID)
	castle_btn.add_theme_stylebox_override("normal", UiKit.parchment_box(Palette.PARCHMENT))
	castle_btn.add_theme_stylebox_override("hover", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	castle_btn.add_theme_stylebox_override("pressed", UiKit.parchment_box(Palette.DIM))
	castle_btn.add_theme_stylebox_override("focus", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	castle_btn.set_anchors_preset(Control.PRESET_TOP_LEFT)
	castle_btn.offset_left = 18
	castle_btn.offset_top = 432
	castle_btn.connect("pressed", Callable(self, "_open_castle"))
	root.add_child(castle_btn)

	# Decorations — always-visible "🌷" button, pinned top-LEFT just under the 🏰 castle
	# button (offset_top 432, ~38px tall) so the eleven buttons stack without overlapping
	# and all clear the centred board drag area. Same parchment-pill look. Opens the
	# DecorationsScreen (build ornaments → grant Influence).
	var decorations_btn := Button.new()
	decorations_btn.text = "🌷"
	decorations_btn.add_theme_font_size_override("font_size", 20)
	decorations_btn.add_theme_color_override("font_color", Palette.INK)
	decorations_btn.add_theme_color_override("font_hover_color", Palette.EMBER)
	decorations_btn.add_theme_color_override("font_pressed_color", Palette.INK_MID)
	decorations_btn.add_theme_stylebox_override("normal", UiKit.parchment_box(Palette.PARCHMENT))
	decorations_btn.add_theme_stylebox_override("hover", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	decorations_btn.add_theme_stylebox_override("pressed", UiKit.parchment_box(Palette.DIM))
	decorations_btn.add_theme_stylebox_override("focus", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	decorations_btn.set_anchors_preset(Control.PRESET_TOP_LEFT)
	decorations_btn.offset_left = 18
	decorations_btn.offset_top = 478
	decorations_btn.connect("pressed", Callable(self, "_open_decorations"))
	root.add_child(decorations_btn)

	# Magic Portal — always-visible "🌀" button, pinned top-LEFT just under the 🌷 decorations
	# button (offset_top 478, ~38px tall) so the twelve buttons stack without overlapping and
	# all clear the centred board drag area. Same parchment-pill look. Opens the PortalScreen
	# (build the portal with coins + runes → summon magic tools with the Influence currency).
	var portal_btn := Button.new()
	portal_btn.text = "🌀"
	portal_btn.add_theme_font_size_override("font_size", 20)
	portal_btn.add_theme_color_override("font_color", Palette.INK)
	portal_btn.add_theme_color_override("font_hover_color", Palette.EMBER)
	portal_btn.add_theme_color_override("font_pressed_color", Palette.INK_MID)
	portal_btn.add_theme_stylebox_override("normal", UiKit.parchment_box(Palette.PARCHMENT))
	portal_btn.add_theme_stylebox_override("hover", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	portal_btn.add_theme_stylebox_override("pressed", UiKit.parchment_box(Palette.DIM))
	portal_btn.add_theme_stylebox_override("focus", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	portal_btn.set_anchors_preset(Control.PRESET_TOP_LEFT)
	portal_btn.offset_left = 18
	portal_btn.offset_top = 524
	portal_btn.tooltip_text = "Magic Portal"
	portal_btn.connect("pressed", Callable(self, "_open_portal"))
	root.add_child(portal_btn)

	# The Charter — always-visible "⚖️" button, pinned top-LEFT just under the 🌀 portal
	# button (offset_top 524, ~38px tall → 570 is the next free slot) so the buttons stack
	# without overlapping and all clear the centred board drag area. Same parchment-pill
	# look. Opens the CharterScreen (read-only Hollow-Pact reflection over the story state).
	var charter_btn := Button.new()
	charter_btn.text = "⚖️"
	charter_btn.add_theme_font_size_override("font_size", 20)
	charter_btn.add_theme_color_override("font_color", Palette.INK)
	charter_btn.add_theme_color_override("font_hover_color", Palette.EMBER)
	charter_btn.add_theme_color_override("font_pressed_color", Palette.INK_MID)
	charter_btn.add_theme_stylebox_override("normal", UiKit.parchment_box(Palette.PARCHMENT))
	charter_btn.add_theme_stylebox_override("hover", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	charter_btn.add_theme_stylebox_override("pressed", UiKit.parchment_box(Palette.DIM))
	charter_btn.add_theme_stylebox_override("focus", UiKit.parchment_box(Palette.PARCHMENT_SOFT))
	charter_btn.set_anchors_preset(Control.PRESET_TOP_LEFT)
	charter_btn.offset_left = 18
	charter_btn.offset_top = 570
	charter_btn.tooltip_text = "The Charter"
	charter_btn.connect("pressed", Callable(self, "_open_charter"))
	root.add_child(charter_btn)

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

## Build the stockpile card: a titled parchment card holding a 4-col grid of
## resource chips (filled in _refresh_totals) plus a muted "empty" placeholder.
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

	var heading_font: Font = UiKit.heading_font()
	var title := Label.new()
	title.text = "Stockpile"
	title.add_theme_font_size_override("font_size", 20)
	title.add_theme_color_override("font_color", Palette.INK)
	if heading_font != null:
		title.add_theme_font_override("font", heading_font)
	title.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(title)

	_stockpile_empty = Label.new()
	_stockpile_empty.text = "Stockpile empty"
	_stockpile_empty.add_theme_font_size_override("font_size", 15)
	_stockpile_empty.add_theme_color_override("font_color", Palette.INK_MID)
	_stockpile_empty.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(_stockpile_empty)

	_stockpile_grid = GridContainer.new()
	_stockpile_grid.columns = 4
	_stockpile_grid.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_stockpile_grid.add_theme_constant_override("h_separation", 8)
	_stockpile_grid.add_theme_constant_override("v_separation", 8)
	col.add_child(_stockpile_grid)

## M8d — build the ToolPalette container: a parchment card pinned to the RIGHT edge
## of the board area, just below the ☰ menu button. It starts hidden (_refresh_tools
## shows/hides it based on game.tools). The inner VBox gets rebuilt on each refresh.
func _build_tool_palette(root: Control) -> void:
	_tool_palette_box = PanelContainer.new()
	_tool_palette_box.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	_tool_palette_box.grow_horizontal = Control.GROW_DIRECTION_BEGIN   # grow LEFT from right edge
	_tool_palette_box.mouse_filter = Control.MOUSE_FILTER_IGNORE       # children override this
	_tool_palette_box.add_theme_stylebox_override("panel", UiKit.card_box(Palette.PARCHMENT))
	_tool_palette_box.offset_right = -18   # inset from the right edge (mirrors ☰ button)
	_tool_palette_box.offset_top = 64      # sit below the ☰ button (which is at offset_top 18)
	_tool_palette_box.visible = false      # hidden until _refresh_tools sees tools in the bag
	root.add_child(_tool_palette_box)

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

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 6)
	_tool_palette_box.add_child(col)

	# Heading — "Tools" in Cinzel when available.
	var heading_font: Font = UiKit.heading_font()
	var heading_lbl := Label.new()
	heading_lbl.text = "Tools"
	heading_lbl.add_theme_font_size_override("font_size", 18)
	heading_lbl.add_theme_color_override("font_color", Palette.INK)
	if heading_font != null:
		heading_lbl.add_theme_font_override("font", heading_font)
	heading_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(heading_lbl)

	for entry in owned:
		var id: String = String(entry["id"])
		var charges: int = int(entry["charges"])
		var cfg: Dictionary = ToolConfig.get_tool(id)
		var label: String = String(cfg.get("label", id))
		var is_tap: bool = ToolConfig.is_tap_target(id)
		var btn_text: String = "%s ×%d" % [label, charges]
		if is_tap:
			btn_text += " ↗"   # subtle tap affordance
		var btn := Button.new()
		btn.text = btn_text
		btn.tooltip_text = ("Tap a tile to use" if is_tap else "Fires instantly over the board")
		UiKit.style_button(btn, Palette.EMBER, 6, 17)
		# Wire: click → use the tool → rebuild the palette.
		btn.pressed.connect(func():
			use_tool(id)
			_refresh_tools()
		)
		col.add_child(btn)
		_tool_buttons[id] = btn

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
	var lbl := Label.new()
	lbl.text = "%s  %d" % [res, count]
	lbl.add_theme_font_size_override("font_size", 15)
	lbl.add_theme_color_override("font_color", Palette.INK)
	lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	box.add_child(lbl)
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
func _spawn_reward_chip(text: String, color: Color) -> void:
	if _fx_layer == null or board == null or _coin_pill == null:
		return
	# A tiny parchment pill (PanelContainer + Label) styled like the HUD chips, so the
	# flying reward reads as a piece of the stockpile leaping toward the coin purse.
	var chip := PanelContainer.new()
	chip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chip.add_theme_stylebox_override("panel", _make_chip_box())
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_size_override("font_size", 18)
	lbl.add_theme_color_override("font_color", color)
	lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chip.add_child(lbl)
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
	_pulse_coin_pill()

## A soft scale bounce (1 → 1.18 → 1 over ~0.3s) on the coin pill's wrapper so it
## reacts when a reward chip is dispatched. The pill Label lives inside a
## PanelContainer; pulsing the parent (with a centred pivot) bounces the whole pill.
func _pulse_coin_pill() -> void:
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

# ── Town screen ─────────────────────────────────────────────────────────────

## Open the town panel, lazily creating + wiring it on first use.
func _open_town() -> void:
	if _town_screen == null:
		_town_screen = TownScreen.new()
		add_child(_town_screen)
		_town_screen.setup(game)
		_town_screen.connect("closed", Callable(self, "_on_town_closed"))
		_town_screen.connect("state_changed", Callable(self, "_on_town_changed"))
		# M3h: the Town screen's "Shoo rats" button has no board ref, so it emits
		# `shoo_rats` and Main does the actual clear (spending the charge in ONE place).
		_town_screen.connect("shoo_rats", Callable(self, "_on_shoo_rats"))
	_town_screen.open()
	_router.open_modal(ViewRouter.Modal.TOWN)

func _on_town_closed() -> void:
	if _town_screen != null:
		_town_screen.visible = false
	_router.close_modal()

# ── Menu / settings (M4f) ─────────────────────────────────────────────────────

## Open the settings/menu modal, lazily creating + wiring it on first use. The screen
## emits intent signals; Main owns the mute flip + save + restart (single source of
## truth), mirroring how the Town screen routes "Shoo rats" back to Main.
func _open_menu() -> void:
	if _menu_screen == null:
		_menu_screen = MenuScreen.new()
		add_child(_menu_screen)
		_menu_screen.setup(game)
		_menu_screen.connect("closed", Callable(self, "_on_menu_closed"))
		_menu_screen.connect("toggle_sound", Callable(self, "_on_toggle_sound"))
		_menu_screen.connect("new_game", Callable(self, "_on_new_game"))
	_menu_screen.open()
	_router.open_modal(ViewRouter.Modal.MENU)

func _on_menu_closed() -> void:
	if _menu_screen != null:
		_menu_screen.visible = false
	_router.close_modal()

# ── Inventory ledger (M4g) ─────────────────────────────────────────────────────

## Open the dedicated Inventory ledger modal, lazily creating + wiring it on first
## use (mirrors _open_town / _open_menu). The screen is READ-ONLY — it only emits
## `closed`, which we route to a hide handler. open() re-reads game.inventory each
## time, so the ledger always reflects the latest stockpile.
func _open_inventory() -> void:
	if _inventory_screen == null:
		_inventory_screen = InventoryScreen.new()
		add_child(_inventory_screen)
		_inventory_screen.setup(game)
		_inventory_screen.connect("closed", Callable(self, "_on_inventory_closed"))
	_inventory_screen.open()
	_router.open_modal(ViewRouter.Modal.INVENTORY)

func _on_inventory_closed() -> void:
	if _inventory_screen != null:
		_inventory_screen.visible = false
	_router.close_modal()

# ── Town map (M6c) ──────────────────────────────────────────────────────────────

## Open the spatial town-map modal, lazily creating + wiring it on first use
## (mirrors _open_inventory). The screen reads REAL GameState (settlement plots +
## built buildings + active biome) and re-renders on open(), so the map always
## reflects the current state.
func _open_townmap() -> void:
	if _townmap_screen == null:
		_townmap_screen = TownMapScreen.new()
		add_child(_townmap_screen)
		_townmap_screen.setup(game)
		_townmap_screen.connect("closed", Callable(self, "_on_townmap_closed"))
		# M6d: building/demolishing from the map mutates the same GameState (and a
		# spawner changes the board pool), so route its state_changed through the
		# shared _on_town_changed re-pool/refresh path — same as the Town panel.
		_townmap_screen.connect("state_changed", Callable(self, "_on_town_changed"))
	_townmap_screen.open()
	_router.open_modal(ViewRouter.Modal.TOWNMAP)

func _on_townmap_closed() -> void:
	if _townmap_screen != null:
		_townmap_screen.visible = false
	_router.close_modal()

# ── Achievements trophy screen (M10) ──────────────────────────────────────────────

## Open the achievements trophy modal, lazily creating + wiring it on first use
## (mirrors _open_inventory). The screen is READ-ONLY — it only emits `closed`, routed
## to a hide handler. open() re-reads the live achievement counters + unlocked set each
## time, so the trophy list always reflects current progress.
func _open_achievements() -> void:
	if _achievements_screen == null:
		_achievements_screen = AchievementsScreenScript.new()
		add_child(_achievements_screen)
		_achievements_screen.setup(game)
		_achievements_screen.connect("closed", Callable(self, "_on_achievements_closed"))
	_achievements_screen.open()
	_router.open_modal(ViewRouter.Modal.ACHIEVEMENTS)

func _on_achievements_closed() -> void:
	if _achievements_screen != null:
		_achievements_screen.visible = false
	_router.close_modal()

# ── Tile Collection browser (M11) ─────────────────────────────────────────────

## Open the tile-collection browser modal, lazily creating + wiring it on first use
## (mirrors _open_achievements). The screen is READ-ONLY — it only emits `closed`,
## routed to a hide handler. open() re-renders from Constants.STRING_KEYS each time,
## so the gallery always reflects the current wired tile set.
func _open_tiles() -> void:
	if _tile_collection_screen == null:
		_tile_collection_screen = TileCollectionScreenScript.new()
		add_child(_tile_collection_screen)
		_tile_collection_screen.setup(game)
		_tile_collection_screen.connect("closed", Callable(self, "_on_tiles_closed"))
	_tile_collection_screen.open()
	_router.open_modal(ViewRouter.Modal.TILES)

func _on_tiles_closed() -> void:
	if _tile_collection_screen != null:
		_tile_collection_screen.visible = false
	_router.close_modal()

# ── Chronicle timeline (story UI) ──────────────────────────────────────────────

## Open the chronicle timeline modal, lazily creating + wiring it on first use (mirrors
## _open_achievements). The screen is READ-ONLY — it only emits `closed`, routed to a
## hide handler. open() re-reads game.story (fired markers) each time, so the timeline
## always reflects the beats fired so far.
func _open_chronicle() -> void:
	if _chronicle_screen == null:
		_chronicle_screen = ChronicleScreenScript.new()
		add_child(_chronicle_screen)
		_chronicle_screen.setup(game)
		_chronicle_screen.connect("closed", Callable(self, "_on_chronicle_closed"))
	_chronicle_screen.open()
	_router.open_modal(ViewRouter.Modal.CHRONICLE)

func _on_chronicle_closed() -> void:
	if _chronicle_screen != null:
		_chronicle_screen.visible = false
	_router.close_modal()

# ── Townsfolk roster screen ────────────────────────────────────────────────────

## Open the townsfolk roster modal, lazily creating + wiring it on first use (mirrors
## _open_chronicle). The screen is READ-ONLY — it only emits `closed`, routed to a
## hide handler. open() re-reads game.npcs bonds each time, so the roster always
## reflects the current bond state.
func _open_townsfolk() -> void:
	if _townsfolk_screen == null:
		_townsfolk_screen = TownsfolkScreenScript.new()
		add_child(_townsfolk_screen)
		_townsfolk_screen.setup(game)
		_townsfolk_screen.connect("closed", Callable(self, "_on_townsfolk_closed"))
	_townsfolk_screen.open()
	_router.open_modal(ViewRouter.Modal.TOWNSFOLK)

func _on_townsfolk_closed() -> void:
	if _townsfolk_screen != null:
		_townsfolk_screen.visible = false
	_router.close_modal()

# ── Cartography world map (3-zone view + alternate expedition entry) ────────────

## Open the cartography world-map modal, lazily creating + wiring it on first use (mirrors
## _open_townsfolk). The screen re-reads the live GameState (active_biome → current zone,
## town2_complete / can_enter_mine / can_enter_harbor → travel-button state) on open(), so
## the map always reflects where you are + what's reachable. Its `travel_requested` signal is
## routed to Main, the SINGLE mutation point, which performs the real enter_mine/enter_harbor.
func _open_cartography() -> void:
	if _cartography_screen == null:
		_cartography_screen = CartographyScreenScript.new()
		add_child(_cartography_screen)
		_cartography_screen.setup(game)
		_cartography_screen.connect("closed", Callable(self, "_on_cartography_closed"))
		_cartography_screen.connect("travel_requested", Callable(self, "_on_cartography_travel"))
	_cartography_screen.open()
	_router.open_modal(ViewRouter.Modal.CARTOGRAPHY)

func _on_cartography_closed() -> void:
	if _cartography_screen != null:
		_cartography_screen.visible = false
	_router.close_modal()

# ── Recipe Wiki (read-only recipe reference) ─────────────────────────────────

## Open the recipe wiki modal, lazily creating + wiring it on first use (mirrors
## _open_cartography). The screen is READ-ONLY — it only emits `closed`, routed to
## a hide handler. open() re-renders from RecipeConfig.RECIPE_IDS each time, so the
## wiki always reflects the current recipe catalog.
func _open_recipes() -> void:
	if _recipe_wiki_screen == null:
		_recipe_wiki_screen = RecipeWikiScreenScript.new()
		add_child(_recipe_wiki_screen)
		_recipe_wiki_screen.setup(game)
		_recipe_wiki_screen.connect("closed", Callable(self, "_on_recipes_closed"))
	_recipe_wiki_screen.open()
	_router.open_modal(ViewRouter.Modal.RECIPES)

func _on_recipes_closed() -> void:
	if _recipe_wiki_screen != null:
		_recipe_wiki_screen.visible = false
	_router.close_modal()

# ── Castle contributions screen ──────────────────────────────────────────────

## Open the castle contributions modal, lazily creating + wiring it on first use
## (mirrors _open_recipes). The screen mutates GameState in place (contribute_to_castle
## deducts inventory + bumps the contributed counter) and re-renders itself, so it only
## emits `closed`, routed to a hide handler. open() re-reads the live contributions +
## inventory each time, so the needs list always reflects current progress.
func _open_castle() -> void:
	if _castle_screen == null:
		_castle_screen = CastleScreenScript.new()
		add_child(_castle_screen)
		_castle_screen.setup(game)
		_castle_screen.connect("closed", Callable(self, "_on_castle_closed"))
	_castle_screen.open()
	_router.open_modal(ViewRouter.Modal.CASTLE)

## The castle screen was closed: hide it, reset the router, and persist (a contribution
## mutated inventory + the contributed totals) + refresh the stockpile HUD so the
## donated resources disappear from the on-board totals immediately.
func _on_castle_closed() -> void:
	if _castle_screen != null:
		_castle_screen.visible = false
	_router.close_modal()
	# A contribution deducted from inventory; persist + refresh the affected HUD surfaces.
	SaveManager.save(game)
	_refresh_totals()
	_refresh_chain_progress()

# ── Decorations screen ───────────────────────────────────────────────────────

## Open the decorations modal, lazily creating + wiring it on first use (mirrors
## _open_castle). The screen mutates GameState in place (build_decoration deducts coins +
## cost items and grants influence) and re-renders itself, so it only emits `closed`, routed
## to a hide handler. open() re-reads the live influence + inventory each time, so the cards
## always reflect current affordability + built counts.
func _open_decorations() -> void:
	if _decorations_screen == null:
		_decorations_screen = DecorationsScreenScript.new()
		add_child(_decorations_screen)
		_decorations_screen.setup(game)
		_decorations_screen.connect("closed", Callable(self, "_on_decorations_closed"))
	_decorations_screen.open()
	_router.open_modal(ViewRouter.Modal.DECORATIONS)

## The decorations screen was closed: hide it, reset the router, and persist (a build mutated
## coins + inventory + influence) + refresh the stockpile HUD so the spent coins/resources
## disappear from the on-board totals immediately. Mirrors _on_castle_closed.
func _on_decorations_closed() -> void:
	if _decorations_screen != null:
		_decorations_screen.visible = false
	_router.close_modal()
	# A build deducted coins + inventory (and granted influence); persist + refresh HUD.
	SaveManager.save(game)
	_refresh_totals()
	_refresh_chain_progress()

# ── Magic Portal screen ──────────────────────────────────────────────────────

## Open the portal modal, lazily creating + wiring it on first use (mirrors _open_decorations).
## The screen mutates GameState in place (build_portal deducts coins + runes; summon_magic_tool
## deducts influence + bumps the tools dict) and re-renders itself, so it only emits `closed`,
## routed to a hide handler. open() re-reads the live portal_built + influence + tool counts each
## time, so the screen always reflects current build state + affordability.
func _open_portal() -> void:
	if _portal_screen == null:
		_portal_screen = PortalScreenScript.new()
		add_child(_portal_screen)
		_portal_screen.setup(game)
		_portal_screen.connect("closed", Callable(self, "_on_portal_closed"))
	_portal_screen.open()
	_router.open_modal(ViewRouter.Modal.PORTAL)

## The portal screen was closed: hide it, reset the router, and persist (a build spent coins +
## runes + set the flag; a summon spent influence + granted a tool) + refresh the stockpile HUD
## so the spent coins disappear from the on-board totals immediately. Mirrors _on_decorations_closed.
func _on_portal_closed() -> void:
	if _portal_screen != null:
		_portal_screen.visible = false
	_router.close_modal()
	# A build/summon deducted coins/runes/influence (and granted a tool); persist + refresh HUD.
	SaveManager.save(game)
	_refresh_totals()
	_refresh_chain_progress()

# ── Charter (read-only) ──────────────────────────────────────────────────────────

## Open the Charter screen, lazily creating + wiring it on first use. The Charter is
## READ-ONLY (it never mutates GameState), so open() just re-reads the live story state.
func _open_charter() -> void:
	if _charter_screen == null:
		_charter_screen = CharterScreenScript.new()
		add_child(_charter_screen)
		_charter_screen.setup(game)
		_charter_screen.connect("closed", Callable(self, "_on_charter_closed"))
	_charter_screen.open()
	_router.open_modal(ViewRouter.Modal.CHARTER)

## The Charter screen was closed: hide it + reset the router. NO SaveManager.save — the
## Charter is read-only, so nothing changed. (Unlike _on_portal_closed, there is no spend
## to persist.)
func _on_charter_closed() -> void:
	if _charter_screen != null:
		_charter_screen.visible = false
	_router.close_modal()

# ── Tutorial onboarding ────────────────────────────────────────────────────────

## Open the tutorial onboarding modal, lazily creating + wiring it on first use.
## Called automatically from _ready when game.tutorial_seen is false, and from
## apply_deeplink("tutorial") for replay. On REPLAY (tutorial_seen=true) the modal
## still emits `finished` → _on_tutorial_finished marks seen (idempotent) + saves.
func _open_tutorial() -> void:
	if _tutorial_modal == null:
		_tutorial_modal = TutorialModalScript.new()
		add_child(_tutorial_modal)
		_tutorial_modal.setup(game)
		_tutorial_modal.connect("finished", Callable(self, "_on_tutorial_finished"))
		_tutorial_modal.connect("closed", Callable(self, "_on_tutorial_closed"))
	_tutorial_modal.open()
	_router.open_modal(ViewRouter.Modal.TUTORIAL)

## The tutorial modal was dismissed (closed without finishing — defensive; normally
## `finished` fires before `closed`). Mirror the story-modal closed path: hide + reset router.
func _on_tutorial_closed() -> void:
	if _tutorial_modal != null:
		_tutorial_modal.visible = false
	_router.close_modal()

## The tutorial finished (player stepped through all 6 steps OR pressed Skip): mark
## tutorial_seen, save, and drain the story queue — the story beats that were
## held back while the tutorial was on screen now surface. This is the single exit
## path that guarantees tutorial → story ordering (the queue is only drained here
## when the tutorial was showing; a seen-tutorial load drains in _ready directly).
func _on_tutorial_finished() -> void:
	if game != null:
		game.mark_tutorial_seen()
		SaveManager.save(game)
	# Surface any queued story beats now that the tutorial is out of the way.
	_drain_story_queue()

## The world map requested travel to a zone (only ENABLED expedition buttons emit this).
## Main owns GameState mutation: close the map, launch the matching expedition the REAL way
## (game.enter_mine() / game.enter_harbor()), then run the SAME biome-change refresh path the
## TownScreen expedition uses (state_changed → _on_town_changed) so we don't duplicate the
## board-pool swap / hazard-flag / pearl-placement logic. On a failed launch (guards trip),
## the map simply closed — nothing mutated.
func _on_cartography_travel(zone_id: String) -> void:
	# Close the map first so the biome swap + any queued story beat surface over the board.
	_on_cartography_closed()
	var res: Dictionary = {}
	match zone_id:
		"mine":
			res = game.enter_mine()
		"harbor":
			res = game.enter_harbor()
		_:
			return
	if bool(res.get("ok", false)):
		# Reuse Main's existing biome-change path (the one the TownScreen routes through):
		# re-pool + regenerate the board onto the new biome, set the hazard/pearl flags, refresh
		# every affected HUD surface, and save. No duplicated biome-swap logic here.
		_on_town_changed()

# ── Story beat queue (story UI) ────────────────────────────────────────────────

## Present the FRONT of game.story.beat_queue in the beat modal, lazily creating + wiring
## the modal on first use. No-op when the queue is empty or the modal is already showing a
## beat (so we don't reset the player mid-read). The modal's `advanced` signal routes to
## _on_story_advanced, which presents the next queued beat or hides the modal + refreshes
## the HUD (a choice may have granted coins/resources).
##
## SIMPLEST-CORRECT layering: this fires at the END of _ready and after each post-action
## refresh (chain/tool/town). Those refreshes only run while the player is ON THE BOARD
## (chains can't resolve under an open modal; town actions close back to the board via
## _on_town_changed). The beat modal lives at the top layer (5), above the others, so even
## if a beat surfaces while a lower modal is technically still visible it reads on top and
## the player dismisses it to return — no conflict, no suppression needed.
func _drain_story_queue() -> void:
	if game == null:
		return
	if game.story.beat_queue.is_empty():
		return
	# Don't interrupt a beat already on screen — it'll advance to the next on dismiss.
	if _story_modal != null and _story_modal.visible:
		return
	if _story_modal == null:
		_story_modal = StoryModalScript.new()
		add_child(_story_modal)
		_story_modal.setup(game)
		_story_modal.connect("advanced", Callable(self, "_on_story_advanced"))
		_story_modal.connect("closed", Callable(self, "_on_story_closed"))
	_story_modal.open_for(String(game.story.beat_queue[0]))

## A beat was dismissed/resolved (and popped off the front of the queue by the modal):
## present the next queued beat, or — when the queue is drained — hide the modal and
## refresh the HUD + save (a choice may have granted coins/resources). Persist so the
## drained queue (and any choice grants) survive a reload.
func _on_story_advanced() -> void:
	if game == null:
		return
	if not game.story.beat_queue.is_empty():
		_story_modal.open_for(String(game.story.beat_queue[0]))
		return
	if _story_modal != null:
		_story_modal.visible = false
	# A resolved choice can credit coins/resources, so refresh the affected HUD surfaces.
	_refresh_totals()
	_refresh_meta()
	_refresh_chain_progress()
	SaveManager.save(game)

## The beat modal was force-closed (defensive — the modal has no explicit close button in
## normal flow, advancing handles dismissal). Mirror the advanced drain-complete path.
func _on_story_closed() -> void:
	if _story_modal != null:
		_story_modal.visible = false

## M5b — resolve a deep-link id and navigate to the matching screen.
## Routes to the existing _open_* / close methods so all lazy-create and
## visibility logic remains in one place. Returns true if the id was known.
func apply_deeplink(id: String) -> bool:
	var intent: Dictionary = ViewRouter.resolve(id)
	if not bool(intent.get("ok", false)):
		return false
	match int(intent.get("modal", ViewRouter.Modal.NONE)):
		ViewRouter.Modal.TOWN:
			_open_town()
		ViewRouter.Modal.MENU:
			_open_menu()
		ViewRouter.Modal.INVENTORY:
			_open_inventory()
		ViewRouter.Modal.TOWNMAP:
			_open_townmap()
		ViewRouter.Modal.ACHIEVEMENTS:
			_open_achievements()
		ViewRouter.Modal.TILES:
			_open_tiles()
		ViewRouter.Modal.CHRONICLE:
			_open_chronicle()
		ViewRouter.Modal.TOWNSFOLK:
			_open_townsfolk()
		ViewRouter.Modal.CARTOGRAPHY:
			_open_cartography()
		ViewRouter.Modal.RECIPES:
			_open_recipes()
		ViewRouter.Modal.TUTORIAL:
			_open_tutorial()
		ViewRouter.Modal.CASTLE:
			_open_castle()
		ViewRouter.Modal.DECORATIONS:
			_open_decorations()
		ViewRouter.Modal.PORTAL:
			_open_portal()
		ViewRouter.Modal.CHARTER:
			_open_charter()
		_:
			# NONE / board — close whatever is open
			if _town_screen != null and _town_screen.visible:
				_town_screen.visible = false
				_router.close_modal()
			elif _menu_screen != null and _menu_screen.visible:
				_menu_screen.visible = false
				_router.close_modal()
			elif _inventory_screen != null and _inventory_screen.visible:
				_inventory_screen.visible = false
				_router.close_modal()
			elif _townmap_screen != null and _townmap_screen.visible:
				_townmap_screen.visible = false
				_router.close_modal()
			elif _achievements_screen != null and _achievements_screen.visible:
				_achievements_screen.visible = false
				_router.close_modal()
			elif _tile_collection_screen != null and _tile_collection_screen.visible:
				_tile_collection_screen.visible = false
				_router.close_modal()
			elif _chronicle_screen != null and _chronicle_screen.visible:
				_chronicle_screen.visible = false
				_router.close_modal()
			elif _townsfolk_screen != null and _townsfolk_screen.visible:
				_townsfolk_screen.visible = false
				_router.close_modal()
			elif _cartography_screen != null and _cartography_screen.visible:
				_cartography_screen.visible = false
				_router.close_modal()
			elif _recipe_wiki_screen != null and _recipe_wiki_screen.visible:
				_recipe_wiki_screen.visible = false
				_router.close_modal()
			elif _tutorial_modal != null and _tutorial_modal.visible:
				_tutorial_modal.visible = false
				_router.close_modal()
			elif _castle_screen != null and _castle_screen.visible:
				# Route through the close handler so a contribution is persisted + the
				# stockpile HUD refreshed (it also hides + resets the router).
				_on_castle_closed()
			elif _decorations_screen != null and _decorations_screen.visible:
				# Route through the close handler so a build is persisted + the stockpile
				# HUD refreshed (it also hides + resets the router).
				_on_decorations_closed()
			elif _portal_screen != null and _portal_screen.visible:
				# Route through the close handler so a build/summon is persisted + the
				# stockpile HUD refreshed (it also hides + resets the router).
				_on_portal_closed()
			elif _charter_screen != null and _charter_screen.visible:
				# Charter is read-only — the close handler just hides + resets the router
				# (no save needed, nothing changed).
				_on_charter_closed()
	return true

## M4f — the Sound button emits `toggle_sound`; Main owns the actual flip (the single
## accounting point): toggle the persisted preference, mute/unmute the Audio service,
## save, then re-sync the menu's Sound label. A soft "pop" gives un-mute feedback.
func _on_toggle_sound() -> void:
	game.audio_muted = not game.audio_muted
	if _audio != null:
		_audio.set_muted(game.audio_muted)
		# Audible confirmation only when we just turned sound BACK ON (a muted pop is
		# silent anyway).
		if not game.audio_muted:
			_audio.play("pop")
	SaveManager.save(game)
	if _menu_screen != null:
		_menu_screen.refresh_sound_label()

## M4f — the New Game button emits `new_game`; Main wipes the save and restarts from a
## fresh run. Closing the menu first, then reload_current_scene() re-runs _ready, which
## calls SaveManager.load_state() — now returning a fresh GameState since the save was
## cleared (the cleanest reset: every system re-initialises from scratch).
func _on_new_game() -> void:
	if _menu_screen != null:
		_menu_screen.close()
	SaveManager.clear()
	get_tree().reload_current_scene()

## A town action mutated `game`: re-pool the board from the ACTIVE biome, refresh
## every HUD label, save. The Town screen's Expedition section can flip the biome
## (enter/leave the mine), so detect a biome change and regenerate the board with
## the new pool (a plain set_tile_pool only takes effect on the next refill — a
## biome swap must replace what's on the board NOW).
func _on_town_changed() -> void:
	var was_mine: bool = _board_pool_is_mine()
	var was_harbor: bool = _board_pool_is_harbor()
	board.set_tile_pool(game.active_biome_pool())
	if game.is_in_mine() != was_mine:
		board.setup_new_board()
	# M3j: entering/leaving the harbor via the Town screen flips the biome — regenerate the
	# board so fish tiles show NOW (mirrors the mine flip above). On ENTRY, place the live
	# pearl onto the freshly-built board at its seeded cell so the rune target is visible.
	if game.is_in_harbor() != was_harbor:
		board.setup_new_board()
		if game.is_in_harbor() and game.has_active_pearl():
			board.place_pearl(Vector2i(int(game.fish_pearl.get("col", 0)), int(game.fish_pearl.get("row", 0))))
	# M3g: starting the boss fight from the Town menu must raise the board's chain bar
	# immediately (and dropping back to no-fight restores the base min).
	board.set_min_chain(game.boss_min_chain())
	# M3h: a Master Ratcatcher purchase (or demolish) flips whether grass chains sweep
	# adjacent rats, so refresh the board flag whenever a town action lands.
	board.clear_rats_on_grass = game.has_master_ratcatcher()
	# M3i: entering/leaving the mine via the Town screen flips whether STONE chains mine
	# through rubble, so refresh that flag on every town action too.
	board.clear_rubble_on_stone = game.is_in_mine()
	# M3j: entering/leaving the harbor flips whether a fish chain next to the pearl captures
	# it — refresh that flag on every town action too (off the harbor it is simply false).
	board.clear_pearl_on_fish_chain = game.is_in_harbor()
	_refresh_totals()
	_refresh_meta()
	_refresh_settlement()
	_refresh_buildings()
	_refresh_orders()
	_refresh_biome()
	_refresh_boss()
	_refresh_rats()
	_refresh_runes()
	# M4d: pick a confirm sound for whatever the town action did. Priority: a tier-up
	# rings the warm bell; entering the mine OR harbor whooshes; a coin-balance change (sell /
	# buy / order-fill) chimes "coin"; anything else (build / craft / demolish) pops.
	if _audio != null:
		if game.settlement.tier > _last_tier:
			_audio.play("tier_up")
		elif (game.is_in_mine() and not _last_in_mine) or (game.is_in_harbor() and not _last_in_harbor):
			_audio.play("whoosh")
		elif game.coins != _last_coins:
			_audio.play("coin")
		else:
			_audio.play("pop")
	_last_tier = game.settlement.tier
	_last_coins = game.coins
	_last_in_mine = game.is_in_mine()
	_last_in_harbor = game.is_in_harbor()
	SaveManager.save(game)
	# Story UI: a town action posts events (tier_up → act1_hamlet / act2_city_expedition,
	# building_built → act1_lumber_raised / act2_kitchen, order_fulfilled → act1_first_order).
	# The Town/Map modal closed back to the board before this fires, so surface any queued
	# beat now. No-op when nothing queued or a beat is already showing.
	_drain_story_queue()

## True when the board's CURRENT refill pool is the mine pool — used to detect a
## biome flip before we overwrite the pool. Compares against Constants.MINE_POOL.
func _board_pool_is_mine() -> bool:
	return board != null and board.tile_pool == Constants.MINE_POOL

## M3j — True when the board's CURRENT refill pool is the fish pool — used to detect a
## harbor biome flip before we overwrite the pool. active_biome_pool() returns a duplicate
## of Constants.FISH_POOL while on the harbor, and `==` compares Array CONTENTS in GDScript,
## so this is true exactly while the board is on the harbor.
func _board_pool_is_harbor() -> bool:
	return board != null and board.tile_pool == Constants.FISH_POOL

# ── signal handlers ────────────────────────────────────────────────────────

func _on_chain_changed(length: int) -> void:
	# M4d: a soft bleep on the FIRST tile of a drag (prev length was 0, now ≥1) —
	# not on every extend. Track the previous length to fire it once per drag.
	if length >= 1 and _prev_chain_len <= 0 and _audio != null:
		_audio.play("chain_start")
	_prev_chain_len = length
	if length <= 0:
		_chain_label.text = "Drag 3+ matching tiles"
	else:
		_chain_label.text = "Chain: %d" % length

func _on_chain_resolved(tile_type: int, length: int) -> void:
	var res: Dictionary = game.credit_chain(tile_type, length)
	# M4d: a chain always lands a collect bleep; a whole unit (units > 0) adds the
	# sparkle "upgrade" over it.
	if _audio != null:
		_audio.play("chain_collect")
		if int(res.get("units", 0)) > 0:
			_audio.play("upgrade")
	# M4e: fly ONE reward chip from the board to the coin pill (the original's
	# "rewardTrajectory"). Show the produced resource when a whole unit landed
	# (gold), else the coins this chain earned (ember) — coins are always gained.
	if int(res.get("units", 0)) > 0:
		_spawn_reward_chip("+%d %s" % [int(res["units"]), res["resource"]], Palette.GOLD)
	else:
		_spawn_reward_chip("+%d 🪙" % int(res.get("coins_gain", 0)), Palette.EMBER)
	# M4b: remember the resource + threshold this chain fed so the progress bar can
	# show fractional progress toward its next unit (RAT/empty-threshold chains
	# produce nothing, so leave the bar on the previous resource).
	var produced: String = Constants.produced_resource(tile_type)
	if produced != "":
		_last_res = produced
		_last_threshold = Constants.threshold_for(tile_type)
	if int(res.get("units", 0)) > 0:
		_status_label.text = "Chain of %d  →  +%d %s" % [length, res["units"], res["resource"]]
	else:
		_status_label.text = "Chain of %d  →  building progress…" % length
	# M3f: a chain resolved inside the mine spends one expedition turn (the goods are
	# already credited above). When the turns run out the run SOFT-FAILS: keep
	# everything gathered, swap the board back to the farm pool, and regenerate.
	if game.is_in_mine():
		var turn_res: Dictionary = game.note_mine_turn()
		if bool(turn_res.get("exited", false)):
			_status_label.text = "Expedition over — supplies spent. Back to the farm."
			board.set_tile_pool(game.active_biome_pool())
			board.setup_new_board()
			# M3i: the expedition ended — back on the farm, so mining-through-rubble is
			# off (there's no rubble on the farm board anyway; keep the flag honest).
			board.clear_rubble_on_stone = game.is_in_mine()
		else:
			_status_label.text = "%s  ·  ⛏ %d mine turn(s) left" % [
				_status_label.text, int(turn_res.get("turns_left", 0))]
	# M3j: a chain resolved on the harbor spends one harbor turn (the catch is already
	# credited above). note_harbor_turn ticks the turn budget, the tide cycle, and the pearl
	# countdown together. We react to each: a TIDE FLIP reseeds the bottom row from the new
	# tide pool; an uncaptured PEARL EXPIRY degrades the on-board pearl tile back to kelp; and
	# when the turns run out the run SOFT-FAILS — keep the catch, swap the board back to the
	# farm pool, regenerate, and clear the harbor board flag. Mirrors the mine-exit path.
	if game.is_in_harbor():
		# Capture the pearl's board cell BEFORE the tick (note_harbor_turn clears fish_pearl on
		# expiry) so degrade_pearl still knows which cell to revert.
		var pearl_cell := Vector2i(-1, -1)
		if game.has_active_pearl():
			pearl_cell = Vector2i(int(game.fish_pearl.get("col", -1)), int(game.fish_pearl.get("row", -1)))
		var h_res: Dictionary = game.note_harbor_turn()
		if bool(h_res.get("exited", false)):
			_status_label.text = "Harbor run over — supplies spent. Back to the farm."
			board.set_tile_pool(game.active_biome_pool())
			board.setup_new_board()
			# The harbor ended — back on the farm, so the pearl-capture flag is off.
			board.clear_pearl_on_fish_chain = game.is_in_harbor()
		else:
			# TIDE FLIP — the surface catch changed with the water; reseed the bottom row.
			if bool(h_res.get("tide_flipped", false)):
				board.mutate_bottom_row(game.current_tide_pool())
			# PEARL EXPIRED uncaptured — revert its on-board tile to plain kelp.
			if bool(h_res.get("pearl_expired", false)) and pearl_cell.x >= 0:
				board.degrade_pearl(pearl_cell)
			_status_label.text = "%s  ·  🌊 %d harbor turn(s) left · %s tide" % [
				_status_label.text, int(h_res.get("turns_left", 0)), game.fish_tide]
	# M3g: a chain landed while the capstone boss is active damages it by the chain
	# length. On the killing blow the boss is defeated → Town 2 complete: drop the
	# board's raised chain bar back to the base min and surface the win.
	if game.is_boss_active():
		var boss_res: Dictionary = game.damage_boss(length)
		if bool(boss_res.get("defeated", false)):
			_status_label.text = "%s defeated! Town 2 complete — +%d coins." % [
				boss_res.get("name", "Boss"), int(boss_res.get("reward", 0))]
			board.set_min_chain(Constants.MIN_CHAIN)
			# M4d: the boss is down — triumphant arpeggio.
			if _audio != null:
				_audio.play("fanfare")
		else:
			_status_label.text = "%s  ·  ⚔ boss HP %d" % [
				_status_label.text, int(boss_res.get("hp", 0))]
			# M4d: a non-killing hit — a soft thud.
			if _audio != null:
				_audio.play("pop")
	_refresh_totals()
	_refresh_meta()
	_refresh_settlement()
	_refresh_buildings()
	_refresh_orders()
	_refresh_biome()
	_refresh_boss()
	# M3h: a chain that DEFEATED the boss just turned rats on (rats_enabled flips with
	# town2_complete), so refresh the rats line so the hazard shows immediately.
	_refresh_rats()
	# M3j: a pearl capture (via _on_pearl_chain, fired before this handler) may have granted a
	# rune, and a harbor exit may have flipped the biome — refresh both surfaces.
	_refresh_runes()
	_refresh_chain_progress()
	SaveManager.save(game)
	# Story UI: a chain can post events (chain threshold beats, a boss_defeated that queues
	# the Frostmaw aftermath choice, a tier-up/order/build path) — surface any newly-queued
	# beat immediately. No-op when nothing queued or a beat is already showing.
	_drain_story_queue()

## M3j — the Board reports a fish chain long enough to count toward a pearl capture. Ask
## GameState whether those cells sit 8-adjacent to the live pearl; on a capture, grant the
## rune (GameState already did, returning {captured, runes}), remove the on-board pearl tile
## by degrading its cell to kelp, surface a status hint, and play the upgrade sparkle. Fires
## BEFORE _on_chain_resolved (see Board._resolve emit order), so it runs before the harbor
## turn ticks — a final-turn chain can still capture. The HUD refresh + save happen in
## _on_chain_resolved, which runs immediately after.
func _on_pearl_chain(cells: Array) -> void:
	if game == null or board == null:
		return
	# Snapshot the pearl cell before capture clears fish_pearl, so we can degrade its tile.
	var pearl_cell := Vector2i(-1, -1)
	if game.has_active_pearl():
		pearl_cell = Vector2i(int(game.fish_pearl.get("col", -1)), int(game.fish_pearl.get("row", -1)))
	var cap: Dictionary = game.capture_pearl_if_adjacent(cells)
	if not bool(cap.get("captured", false)):
		return
	# Remove the on-board pearl tile (it's been captured) by reverting its cell to kelp.
	if pearl_cell.x >= 0:
		board.degrade_pearl(pearl_cell)
	_status_label.text = "🦪 Pearl captured! +1 rune"
	if _audio != null:
		_audio.play("upgrade")

# ── tier-up + build affordances ──────────────────────────────────────────────

## Dev/demo keyboard affordances — now a HARMLESS FALLBACK. As of M3e the real
## path into the town economy is the "🏠 Town" HUD button + the TownScreen panel
## (build/demolish/tier-up/craft/sell/fill buttons); these keys are kept only so
## the ladder, spawner system, and refining/market economy stay exercisable from
## the keyboard. Key input is separate from the board's _unhandled_input mouse
## handling, so it never interferes with chain drags.
##   T     — advance the town one tier (when affordable)
##   1/2/3 — build Lumber Camp / Coop / Garden
##   4/5/6 — demolish Lumber Camp / Coop / Garden
##   B     — bake bread at the Bakery (refiner: 3 flour + 1 eggs → 1 bread)  [TEMP]
##   G     — sell 1 hay_bundle at the Market (+1 coin)                       [TEMP]
##   F     — fill the first fillable NPC order (coin sink)                   [TEMP]
##   M     — launch a mine expedition when eligible (City + supplies)        [TEMP]
##   K     — challenge the capstone boss when eligible (City + mine mastery)  [TEMP]
##   R     — shoo all rats off the board (free move, spends a Ratcatcher charge)[TEMP]
func _unhandled_key_input(event: InputEvent) -> void:
	if game == null:
		return
	if not (event is InputEventKey and event.pressed and not event.echo):
		return
	match event.keycode:
		KEY_T:
			if game.can_tier_up():
				var res: Dictionary = game.try_tier_up()
				if bool(res.get("ok", false)):
					_status_label.text = "Town advanced  →  %s" % res.get("name", "")
					# M4d: tier-up bell (keyboard path; the Town-panel path rings it
					# via _on_town_changed). Keep the tracker in sync so that handler
					# doesn't double-ring on its next refresh.
					if _audio != null:
						_audio.play("tier_up")
					_last_tier = game.settlement.tier
					_refresh_totals()
					_refresh_meta()
					_refresh_settlement()
					_refresh_buildings()   # plots change with tier
					SaveManager.save(game)
				get_viewport().set_input_as_handled()
		KEY_1:
			_try_build(BuildingConfig.LUMBER_CAMP)
		KEY_2:
			_try_build(BuildingConfig.COOP)
		KEY_3:
			_try_build(BuildingConfig.GARDEN)
		KEY_4:
			_try_demolish(BuildingConfig.LUMBER_CAMP)
		KEY_5:
			_try_demolish(BuildingConfig.COOP)
		KEY_6:
			_try_demolish(BuildingConfig.GARDEN)
		KEY_B:
			_try_bake()       # TEMP M3c demo: refine flour + eggs into bread
		KEY_G:
			_try_sell_hay()   # TEMP M3c demo: sell 1 hay_bundle for a coin
		KEY_F:
			_try_fill_order() # TEMP M3d demo: fill the first fillable NPC order
		KEY_M:
			_try_enter_mine() # TEMP M3f demo: launch a mine expedition (real path: Town screen)
		KEY_K:
			_try_challenge_boss() # TEMP M3g demo: challenge the capstone boss (real path: Town screen)
		KEY_R:
			_try_shoo_rats() # TEMP M3h demo: shoo rats off the board (real path: Town screen button)

## Dev affordance: attempt a build, then re-pool the board + refresh HUD + save.
func _try_build(id: String) -> void:
	var res: Dictionary = game.build(id)
	if bool(res.get("ok", false)):
		_apply_pool_change()
		_status_label.text = "Built %s — %s now spawn" % [
			BuildingConfig.building_name(id), BuildingConfig.building_category(id)]
		SaveManager.save(game)
	else:
		# Brief, non-blocking hint; no mutation happened.
		_status_label.text = "Can't build %s (%s)" % [
			BuildingConfig.building_name(id), _build_hint(res.get("reason", ""))]
	get_viewport().set_input_as_handled()

## Dev affordance: attempt a demolish, then re-pool the board + refresh HUD + save.
func _try_demolish(id: String) -> void:
	var res: Dictionary = game.demolish(id)
	if bool(res.get("ok", false)):
		_apply_pool_change()
		_status_label.text = "Demolished %s" % BuildingConfig.building_name(id)
		SaveManager.save(game)
	get_viewport().set_input_as_handled()

## TEMP M3c demo: bake one bread at the Bakery (refiner). Real Bakery UI is M3d.
func _try_bake() -> void:
	if game.can_craft(RecipeConfig.BREAD):
		game.craft(RecipeConfig.BREAD)
		_status_label.text = "Baked bread (3 flour + 1 eggs)"
		_refresh_totals()
		_refresh_meta()
		SaveManager.save(game)
	else:
		_status_label.text = "Can't bake (need a Bakery + 3 flour + 1 eggs)"
	get_viewport().set_input_as_handled()

## TEMP M3c demo: sell one hay_bundle at the Market. Real Market UI is M3d.
func _try_sell_hay() -> void:
	if game.qty("hay_bundle") > 0:
		game.sell("hay_bundle", 1)
		_status_label.text = "Sold 1 hay_bundle (+1 coin)"
		_refresh_totals()
		_refresh_meta()
		SaveManager.save(game)
	else:
		_status_label.text = "No hay_bundle to sell"
	get_viewport().set_input_as_handled()

## TEMP M3d demo: fill the FIRST fillable NPC order (lowest index whose resource
## is in stock). Real order buttons land in the next milestone (the Town UI).
func _try_fill_order() -> void:
	var idx: int = -1
	for i in game.orders.size():
		if game.can_fill_order(i):
			idx = i
			break
	if idx < 0:
		_status_label.text = "No order you can fill yet"
		get_viewport().set_input_as_handled()
		return
	var res: Dictionary = game.fill_order(idx)
	_status_label.text = "Filled order: %d×%s → +%d coins" % [
		int(res["qty"]), res["resource"], int(res["reward"])]
	_refresh_orders()
	_refresh_totals()
	_refresh_meta()
	SaveManager.save(game)
	get_viewport().set_input_as_handled()

## TEMP M3f demo: launch a mine expedition from the keyboard. The REAL entry is the
## Town screen's Expedition section ("Enter the Mine") — this key is a harmless dev
## fallback so the biome swap stays exercisable. Converts all supplies into turns,
## then re-pools + regenerates the board onto the mine and refreshes the HUD.
func _try_enter_mine() -> void:
	if not game.can_enter_mine():
		_status_label.text = "Can't enter the mine (need City + supplies)"
		get_viewport().set_input_as_handled()
		return
	var res: Dictionary = game.enter_mine()
	if bool(res.get("ok", false)):
		_enter_mine_visuals()
		_status_label.text = "⛏ Expedition underway — %d mine turns" % int(res.get("turns", 0))
		SaveManager.save(game)
	get_viewport().set_input_as_handled()

## TEMP M3g demo: challenge the capstone boss (Frostmaw) from the keyboard. The REAL
## entry is the Town screen's Boss section ("⚔ Challenge Frostmaw") — this key is a
## harmless dev fallback so the boss fight stays exercisable. Arms the boss, raises
## the board's chain bar, then refreshes the boss HUD + saves.
func _try_challenge_boss() -> void:
	if not game.can_challenge_boss():
		_status_label.text = "Can't challenge the boss (need City + 12 mine goods)"
		get_viewport().set_input_as_handled()
		return
	var res: Dictionary = game.start_boss()
	if bool(res.get("ok", false)):
		board.set_min_chain(game.boss_min_chain())
		_status_label.text = "Frostmaw appears! Chains of 4+."
		_refresh_boss()
		_refresh_meta()
		SaveManager.save(game)
	get_viewport().set_input_as_handled()

## TEMP M3h demo: shoo all rats off the board from the keyboard. The REAL entry is the
## Town screen's "Shoo rats" button (which routes through `_on_shoo_rats`). Spends one
## Ratcatcher charge (the ONE place the charge is booked for the keyboard path), clears
## every rat via the board, then refreshes the rats HUD + saves.
func _try_shoo_rats() -> void:
	if not game.can_shoo_rats():
		_status_label.text = "Can't shoo rats (need a Ratcatcher with charges left)"
		get_viewport().set_input_as_handled()
		return
	game.use_ratcatcher_charge()
	var n: int = board.clear_all_rats()
	_status_label.text = "Shooed %d rats (%d charge(s) left)" % [n, game.ratcatcher_charges_left()]
	_refresh_rats()
	SaveManager.save(game)
	get_viewport().set_input_as_handled()

## M3h — the Town screen's "Shoo rats" button emits `shoo_rats`; Main owns the board,
## so it spends the charge HERE (the single accounting point) and clears the board.
## Then refreshes the rats HUD, the Town screen (so its charge count + button state
## update), and saves.
func _on_shoo_rats() -> void:
	if not game.can_shoo_rats():
		return
	game.use_ratcatcher_charge()
	var n: int = board.clear_all_rats()
	# M4d: a soft pop as the rats scatter.
	if _audio != null:
		_audio.play("pop")
	_status_label.text = "Shooed %d rats (%d charge(s) left)" % [n, game.ratcatcher_charges_left()]
	_refresh_rats()
	if _town_screen != null:
		_town_screen.refresh()
	SaveManager.save(game)

# ── Tools on the live board (M8c) ─────────────────────────────────────────────
# The tested tool API (GameState.use_tool_on_grid + ToolConfig + ToolEffects) is wired
# into the LIVE board here. Main owns the GameState ref and the Board; the Board stays
# decoupled (it only adopts the resulting grid via apply_external_grid and reports a
# tapped cell via cell_tapped). NO ToolPalette UI yet (that's M8d) — these entry points
# are driven programmatically + by the Board's targeting-mode input branch.

## Use tool `id` on the live board. Returns true when the tool started/fired.
##   • Guard: with no usable charge (can_use_tool false) returns false, untouched.
##   • TAP-target tool (bomb/rake/sickle/auger/blast_charge/magnet): ARM it and put the
##     Board into targeting mode, so the next board tap fires it (see _on_tool_target).
##     Returns true (the tool is armed, not yet spent — the charge is consumed on the tap).
##   • INSTANT tool (axe/scythe/stone_hammer/drill): fire it NOW over the whole board.
##     use_tool_on_grid applies the effect, credits collected tiles, and consumes a
##     charge; on ok we land the resulting grid on the board (apply_external_grid does
##     the collapse/refill) and refresh the HUD + save exactly like a resolved chain.
func use_tool(id: String) -> bool:
	if game == null or board == null:
		return false
	if not game.can_use_tool(id):
		_status_label.text = "Can't use %s (no charges)" % ToolConfig.tool_label(id)
		return false
	if ToolConfig.is_tap_target(id):
		game.arm_tool(id)
		board.set_targeting(true)
		_status_label.text = "Tap a tile to use %s" % ToolConfig.tool_label(id)
		return true
	# Instant tool — fire immediately over the whole board.
	var r: Dictionary = game.use_tool_on_grid(id, board.grid)
	if bool(r.get("ok", false)):
		board.apply_external_grid(r["grid"])
		_status_label.text = "Used %s" % ToolConfig.tool_label(id)
		_after_tool_used()
	return bool(r.get("ok", false))

## M8c — the Board reports a tapped cell (a tap-target tool is armed). Apply the armed
## tool at that cell, land the resulting grid, then ALWAYS leave targeting + disarm +
## refresh. On a failed apply (e.g. a no-effect tap) we just disarm with a hint — the
## charge is only consumed by use_tool_on_grid on an ok result, so a miss costs nothing.
func _on_tool_target(cell: Vector2i) -> void:
	if game == null or board == null:
		return
	var id: String = game.pending_tool
	var r: Dictionary = game.use_tool_on_grid(id, board.grid, cell)
	if bool(r.get("ok", false)):
		board.apply_external_grid(r["grid"])
		_status_label.text = "Used %s" % ToolConfig.tool_label(id)
	else:
		_status_label.text = "%s did nothing here" % ToolConfig.tool_label(id)
	# Always exit targeting + disarm so the board returns to normal chaining, even on a miss.
	board.set_targeting(false)
	game.clear_pending_tool()
	_after_tool_used()

## Shared post-tool refresh: a tool can change inventory/coins/progress (credited via
## credit_chain inside use_tool_on_grid), so refresh the same HUD surfaces a resolved
## chain does and persist. Kept narrow (no chain-progress-resource tracking — a tool
## isn't a chain) but covers everything a tool can move.
func _after_tool_used() -> void:
	_refresh_totals()
	_refresh_meta()
	_refresh_settlement()
	_refresh_buildings()
	_refresh_orders()
	_refresh_chain_progress()
	_refresh_tools()   # M8d: update palette counts / hide spent tools
	SaveManager.save(game)
	# Story UI: a tool credits tiles through credit_chain, which posts chain events that may
	# fire a threshold beat — surface any newly-queued beat immediately.
	_drain_story_queue()

## Swap the board onto the CURRENT active biome and refresh the biome-affected HUD.
## Used after any biome flip (M demo key entry; the Town screen routes through
## _on_town_changed, which does the same set_tile_pool + setup_new_board). Naming it
## for the common direction (entering the mine) while staying biome-agnostic.
func _enter_mine_visuals() -> void:
	board.set_tile_pool(game.active_biome_pool())
	board.setup_new_board()
	# M3i: mining through rubble is live exactly while in the mine. Set it on the same
	# biome flip that re-pools the board (the M demo key path), mirroring _ready /
	# _on_town_changed.
	board.clear_rubble_on_stone = game.is_in_mine()
	# M4d: low, slow whoosh on the biome flip INTO the mine (keyboard M path). Keep
	# the tracker in sync so _on_town_changed doesn't re-whoosh on its next refresh.
	if _audio != null and game.is_in_mine() and not _last_in_mine:
		_audio.play("whoosh")
	_last_in_mine = game.is_in_mine()
	_refresh_biome()
	_refresh_totals()

## Push the new active pool onto the board and refresh the building-affected HUD.
func _apply_pool_change() -> void:
	board.set_tile_pool(game.active_tile_pool())
	_refresh_buildings()
	_refresh_settlement()
	_refresh_totals()

## Short player-facing hint for a build() failure reason.
func _build_hint(reason: String) -> String:
	match reason:
		"exists":       return "already built"
		"locked":       return "need a higher tier"
		"no_plot":      return "no free plot"
		"insufficient": return "not enough resources"
		_:              return "unavailable"

## M4b — rebuild the stockpile chip grid from inventory (skip zero counts, sort by
## key). KEEPS the name `_refresh_totals` so the capture scripts + _ready still call
## it; the body now repopulates the GridContainer of chips instead of one label.
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
## least one rune (captured a giant pearl); reads "ᚱ N". Hidden at 0 so it stays out of the
## bar before the harbor arc. Mirrors GameState.runes.
func _refresh_runes() -> void:
	if _runes_pill_box == null or _runes_pill == null or game == null:
		return
	if game.runes <= 0:
		_runes_pill_box.visible = false
		return
	_runes_pill.text = "ᚱ %d" % game.runes
	_runes_pill_box.visible = true

## M4b — refresh the chain-progress bar: label "{res}: {progress}/{threshold}" and a
## MOSS→GOLD fill at progress/threshold. With nothing chained yet it shows a neutral
## empty bar with "Chain tiles to gather". Mirrors GameState.progress.
func _refresh_chain_progress() -> void:
	if _chain_prog_label == null:
		return
	if game == null or _last_res == "" or _last_threshold <= 0:
		_chain_prog_label.text = "Chain tiles to gather"
		_apply_chain_progress_fill()
		return
	var prog: int = int(game.progress.get(_last_res, 0))
	_chain_prog_label.text = "%s: %d/%d" % [_last_res, prog, _last_threshold]
	_apply_chain_progress_fill()

## Position + size + tint the chain-progress fill from the current ratio. The fill
## goes MOSS at low progress and lerps toward GOLD as it approaches a full unit.
func _apply_chain_progress_fill() -> void:
	if _chain_prog_fill == null or _chain_prog_track == null:
		return
	var ratio: float = 0.0
	if game != null and _last_res != "" and _last_threshold > 0:
		ratio = clampf(float(int(game.progress.get(_last_res, 0))) / float(_last_threshold), 0.0, 1.0)
	# Track inner width (inset for the 1px border on each side).
	var inner_w: float = maxf(0.0, _chain_prog_track.size.x - 2.0)
	if inner_w <= 0.0:
		inner_w = _chain_prog_track_w
	_chain_prog_fill.position = Vector2(1, 1)
	_chain_prog_fill.size = Vector2(inner_w * ratio, maxf(0.0, _chain_prog_track.size.y - 2.0))
	var col: Color = Palette.MOSS.lerp(Palette.GOLD, ratio)
	_chain_prog_fill.add_theme_stylebox_override("panel", UiKit.bar_box(col, col))

func _refresh_status() -> void:
	if board != null and _status_label != null and _status_label.text == "":
		_status_label.text = ""
