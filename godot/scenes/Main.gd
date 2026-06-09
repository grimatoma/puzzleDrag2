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
## T7/T9/T10 — the cells of the chain currently resolving (Array of {row,col,tile}), stashed by
## _on_chain_cells (Board emits chain_cells_resolved BEFORE chain_resolved) so _on_chain_resolved
## can run the farm-hazard interactions. Cleared after each resolve.
var _chain_cells: Array = []

# ── M4b HUD: extracted into Hud.gd (this Track-D refactor) ────────────────────
# The whole HUD presentation surface — the parchment top-bar of pills, the season bar,
# the chain-progress bar, the stockpile chip panel, the tool palette + armed banner, the
# 5-tab bottom nav, and the reward-chip FX — now lives in a `Hud` node Main owns (`_hud`).
# Main stays the orchestrator (board, GameState, routing, screens, audio, input, web
# history). The kept member + method names that external callers (the scene-smoke
# assertion `main._chain_label != null`, `run_tool_board_tests` reading
# `main._tool_palette_box`, and the ~20 capture scripts that call the refreshers + read/
# write `_status_label.text` / `_last_res` / `_last_threshold`) depend on are preserved
# below as thin FORWARDERS into `_hud` (properties for fields, one-line methods for the
# refreshers) so that contract keeps working unchanged.
const HudScript := preload("res://scenes/Hud.gd")
var _hud: HudScript                     ## the extracted HUD node (built in _ready)

# ── Forwarders: keep the moved HUD fields reachable as `main._x` (external contract) ──
# Each property reads/writes the live widget on `_hud`. Fields the capture scripts ASSIGN
# (`_last_res`/`_last_threshold`) get a setter too; read-only-by-callers fields still expose
# a setter for symmetry. Getters guard `_hud == null` (before build) by returning null/0.
var _chain_label: Label:
	get: return _hud._chain_label if _hud else null
var _status_label: Label:
	get: return _hud._status_label if _hud else null
var _orders_label: Label:
	get: return _hud._orders_label if _hud else null
var _tool_palette_box: PanelContainer:
	get: return _hud._tool_palette_box if _hud else null
var _tool_buttons: Dictionary:
	get: return _hud._tool_buttons if _hud else {}
var _fx_layer: CanvasLayer:
	get: return _hud._fx_layer if _hud else null
var _last_res: String:
	get: return _hud._last_res if _hud else ""
	set(value):
		if _hud:
			_hud._last_res = value
var _last_threshold: int:
	get: return _hud._last_threshold if _hud else 0
	set(value):
		if _hud:
			_hud._last_threshold = value

var _town_screen: TownScreen            ## the real on-screen Town panel (M3e), lazily created
var _menu_screen: MenuScreen            ## the settings/menu modal (M4f), lazily created
var _inventory_screen: InventoryScreen  ## the dedicated Inventory ledger modal (M4g), lazily created
var _townmap_screen: TownMapScreen      ## the spatial town-map modal (M6c), lazily created
# Secondary screens & modals. Each is typed via its preloaded script const (NOT a global
# class_name) so the port never needs an --import pass to register it, and each is lazily
# created on first open (assignment is always <Const>.new()).
## M10 — the achievements trophy modal.
const AchievementsScreenScript := preload("res://scenes/AchievementsScreen.gd")
var _achievements_screen: AchievementsScreenScript   ## lazily created
## M11 — the tile-collection browser modal.
const TileCollectionScreenScript := preload("res://scenes/TileCollectionScreen.gd")
var _tile_collection_screen: TileCollectionScreenScript   ## lazily created
## Story UI — the beat presenter (drains game.story.beat_queue) + the chronicle timeline.
const StoryModalScript := preload("res://scenes/StoryModal.gd")
const ChronicleScreenScript := preload("res://scenes/ChronicleScreen.gd")
var _story_modal: StoryModalScript   ## lazily created
var _chronicle_screen: ChronicleScreenScript   ## lazily created
## Townsfolk roster screen — NPC cards with bond bars.
const TownsfolkScreenScript := preload("res://scenes/TownsfolkScreen.gd")
var _townsfolk_screen: TownsfolkScreenScript   ## lazily created
## Cartography world-map screen — the 3-zone world view + alternate expedition entry.
const CartographyScreenScript := preload("res://scenes/CartographyScreen.gd")
var _cartography_screen: CartographyScreenScript   ## lazily created
## Recipe wiki — read-only reference of all craftable recipes.
const RecipeWikiScreenScript := preload("res://scenes/RecipeWikiScreen.gd")
var _recipe_wiki_screen: RecipeWikiScreenScript   ## lazily created
## Tutorial onboarding modal — the 6-step welcome shown once to new players + replayable via
## apply_deeplink("tutorial").
const TutorialModalScript := preload("res://scenes/TutorialModal.gd")
var _tutorial_modal: TutorialModalScript   ## lazily created
## Daily login-streak reward modal — shown once per fresh daily claim on launch (after the
## tutorial + story queue) and reachable on demand via apply_deeplink("daily")/"streak").
const DailyStreakModalScript := preload("res://scenes/DailyStreakModal.gd")
var _daily_modal: DailyStreakModalScript   ## lazily created
## The pending daily-streak claim from this launch's login_tick, or {} when none. login_tick
## fires EARLY in _ready (so the grant lands before any HUD refresh shows the coins/runes), but
## the modal is held back until the tutorial + story queue are clear so the three don't fight —
## _maybe_show_daily() consumes this once the way is clear. Shape: {day:int, reward:Dictionary}.
var _pending_daily_claim: Dictionary = {}
## A2 — harvest season-summary modal. Shown on a HARVEST boundary (note_farm_turn → harvest):
## a parchment card recapping the season that just ended + the turn/economy snapshot, dismissed
## by a single "Continue" (the farm continues — a fresh Spring cycle has already begun in state).
## Informational only — it grants nothing. Loaded via preload (NO class_name) so the port never
## needs an --import pass to register it (mirrors DailyStreakModal / every other lazy modal).
const HarvestModalScript := preload("res://scenes/HarvestModal.gd")
var _harvest_modal                       ## CanvasLayer (HarvestModalScript), lazily created
## Task C — "Start Farming" picker/confirm modal (the port's FARM/ENTER dialog). Opened from the
## town-map farm-pad tap (and apply_deeplink "startfarming"/"farm"); on Start it calls
## GameState.start_farm_run() and drops the player onto a fresh bounded board. Loaded via preload
## (NO class_name) so the port never needs an --import pass to register it (mirrors every lazy modal).
const StartFarmingModalScript := preload("res://scenes/StartFarmingModal.gd")
var _startfarming_modal                  ## CanvasLayer (StartFarmingModalScript), lazily created
## Castle contributions screen — donate resources toward the 3 Castle needs (a one-way sink).
const CastleScreenScript := preload("res://scenes/CastleScreen.gd")
var _castle_screen: CastleScreenScript   ## lazily created
## Decorations screen — build repeatable ornaments that GRANT the Influence currency.
const DecorationsScreenScript := preload("res://scenes/DecorationsScreen.gd")
var _decorations_screen: DecorationsScreenScript   ## lazily created
## Portal screen — summon magic tools with the Influence currency (build gate: coins + runes).
const PortalScreenScript := preload("res://scenes/PortalScreen.gd")
var _portal_screen: PortalScreenScript   ## lazily created
## T31 — Boons screen: the keeper-perk catalogs (Coexist/Drive Out boons bought with
## Embers / Core Ingots). Reachable from the ☰ menu, the town-map "✨ Boons" button, and the
## `boons` deeplink.
const BoonsScreenScript := preload("res://scenes/BoonsScreen.gd")
var _boons_screen: BoonsScreenScript   ## lazily created
## T31 — Keeper encounter modal: appears when a settlement is built up; the FINAL Coexist /
## Drive Out choice. Auto-triggered off a town/build event (and replayable via the `keeper`
## deeplink for QA).
const KeeperModalScript := preload("res://scenes/KeeperModal.gd")
var _keeper_modal: KeeperModalScript   ## lazily created
## T22 — Founder picker modal: appears when founding a discovered, unfounded settlement node on
## the world map; the player picks the settlement's biome. Opened from CartographyScreen's
## `found_requested` signal.
const FounderModalScript := preload("res://scenes/FounderModal.gd")
var _founder_modal: FounderModalScript   ## lazily created
## Charter screen — read-only reflection of the Hollow Pact's six terms against the story
## choice_log + flags.
const CharterScreenScript := preload("res://scenes/CharterScreen.gd")
var _charter_screen: CharterScreenScript   ## lazily created
## Quests screen — the deterministic 6-slot quest board + the almanac XP/tier track (claim
## quests for coins + XP; claim almanac tiers for coins/runes/tools).
const QuestsScreenScript := preload("res://scenes/QuestsScreen.gd")
var _quests_screen: QuestsScreenScript   ## lazily created
## M5-polish — leave-expedition confirm modal. Gates the HUD "🏠 Town" button when on an
## expedition (active_biome != farm): tapping Town shows this confirm first; only Confirm
## leaves. On the farm it never arms (Town opens directly).
const LeaveBoardModalScript := preload("res://scenes/LeaveBoardModal.gd")
var _leaveboard_modal: LeaveBoardModalScript   ## lazily created
## M-infra — developer DEBUG overlay (the React `debug` modal's port). A dev-only QA tool:
## live state readout + a jump grid of every deep-link + quick-grant buttons. Reachable ONLY
## via apply_deeplink("debug") — NO permanent HUD button (it's hidden, matching React).
const DebugModalScript := preload("res://scenes/DebugModal.gd")
var _debug_modal: DebugModalScript   ## lazily created
## M5-polish — transient toast bubble (auto-dismissing parchment notification). Built once in
## _ready and reused for real one-off feedback (an order filled, a build done).
const ToastScript := preload("res://scenes/Toast.gd")
var _toast: ToastScript   ## built once in _ready
var _router := ViewRouter.new()         ## M5b: nav state machine (pure, tree-free)

# ── Browser Back/Forward (web export only) ──────────────────────────────────────
# On an HTML5/WASM build the browser's Back/Forward buttons (and swipe-back on
# mobile browsers) drive the SAME modal nav the in-game buttons use. Each opened
# screen pushes a `#/<id>` history entry; closing one calls history.back(); the
# browser's popstate is routed through apply_deeplink() so chrome + UI stay in sync.
# We don't hook every _open_*/_on_*_closed path individually — instead _process
# polls _router.current_modal() (every nav path already updates it) and mirrors the
# net change to the URL each frame. A COMPLETE no-op on desktop/headless (guarded by
# OS.has_feature("web") at setup, which leaves _history_ready false everywhere else).
var _history_ready: bool = false                       ## true once the web History bridge is wired
var _last_synced_modal: int = ViewRouter.Modal.NONE    ## last modal mirrored to the URL hash
var _popstate_cb                                        ## retained JS callback (must outlive the listener)

# The ToolPalette, tool-armed banner, 5-tab bottom nav, and reward-chip FX layer all moved
# into Hud.gd along with the rest of the HUD presentation. Main connects the HUD's intent
# signals (nav_selected / tool_use_requested / disarm_requested) and drives the FX via
# _hud.spawn_reward_chip / _hud.pulse_coin_pill at the same trigger points as before.

func _ready() -> void:
	# Emoji fallback: attach the bundled Noto Emoji font to the engine default so the
	# HUD pills (🪙), bottom-nav icons (🏠📦🔨🗺👥), modal titles (🏆📜🏰…) and status
	# text render their glyphs instead of tofu boxes — Cinzel + the engine sans have no
	# emoji coverage, and the web export has no OS emoji font to fall back on. Done first,
	# before any Control is built, so every label picks it up.
	UiKit.install_emoji_fallback()
	# Closability: every modal screen is a CanvasLayer with a close() method + a full-rect
	# scrim backdrop. Auto-wire "tap the scrim to close" on each as it's added (a reliable
	# dismiss even when a just-scrolled list eats the Close button's first tap), and handle
	# ESC / Android-back below in _unhandled_input. Connect BEFORE children are added so
	# every overlay (now and future) is covered with no per-screen edits.
	child_entered_tree.connect(_on_child_entered)
	# M11 desktop-framing: enforce a minimum window size so the portrait HUD never
	# collapses when the player shrinks a resizable desktop window. Godot 4.6 has no
	# project setting for a minimum size (resizable + the window-size override ARE
	# project.godot keys — see [display]), so the floor is applied here via the Window
	# API. A 360×640 9:16 floor keeps the top-bar pills + board readable. Guarded to a
	# real windowed display server so headless (the test sweep) and web are no-ops.
	if DisplayServer.get_name() != "headless" and not OS.has_feature("web"):
		var win := get_window()
		if win != null:
			win.min_size = Vector2i(360, 640)
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
	# Daily login-streak rewards: run one login tick for TODAY'S real calendar date
	# (Time.get_date_string_from_system() yields "YYYY-MM-DD"). login_tick is idempotent
	# per calendar day, so re-launching the same day grants nothing; a new day extends the
	# streak (capped at 30) or resets it on a gap, GRANTING that day's reward (coins/runes/
	# tool) immediately. We fire it HERE (before the HUD is built/refreshed) so the credited
	# coins/runes are already on `game` when the totals first render, and STASH the claim so
	# the reward MODAL is held back until the tutorial + story queue are clear (so the three
	# don't fight) — _maybe_show_daily() surfaces it once the way is clear. Persist the grant.
	var daily: Dictionary = game.login_tick(Time.get_date_string_from_system())
	if bool(daily.get("claimed", false)):
		_pending_daily_claim = {"day": int(daily.get("day", 0)), "reward": daily.get("reward", {})}
		SaveManager.save(game)
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
		# A3 — a small starter rack so the puzzle page reads as a populated TOOLS rack from
		# the first run (the React fresh game grants a few visible tools: Scythe×2 + Seedpack +
		# Lockbox). The port has no seedpack/lockbox, so grant the honest equivalent from REAL
		# ToolConfig ids: Scythe×2 (instant — clears 6 random tiles), Bomb×1 (tap-target 3×3
		# blast — proves targeting mode), Rake×1 (tap-target — sweeps a connected same-type
		# patch). All three are wired tools (ToolConfig.SCYTHE / BOMB / RAKE).
		game.grant_tool("scythe", 2)   # instant (clears 6 random tiles) — proves instant path
		game.grant_tool("bomb", 1)     # tap-target (3x3 area blast) — proves targeting mode
		game.grant_tool("rake", 1)     # tap-target (clears a connected same-type patch)
	# Build the extracted HUD at the SAME point _build_hud() used to run, so the child
	# CanvasLayer ordering (bg=-1, HUD=1, fx=2, nav) — and thus the on-screen compositing —
	# is byte-identical. `board` is injected just below (after it's created); the HUD only
	# reads it at runtime (the reward-chip fly-from start), never at build.
	_hud = HudScript.new()
	_hud.game = game
	add_child(_hud)
	_hud.build()
	# Up-calls: the HUD emits intents; Main does the routing / tool dispatch exactly as before.
	_hud.nav_selected.connect(_on_nav_selected)
	_hud.tool_use_requested.connect(_on_tool_use_requested)
	_hud.disarm_requested.connect(_disarm_tool)
	_hud.menu_requested.connect(_open_menu)
	_refresh_tools()   # M8d: populate the palette after the starter grant
	# M5-polish — the transient toast bubble (built once, reused for real one-off feedback).
	# Created here so its CanvasLayer (layer 3) sits above the HUD before any event fires.
	_toast = ToastScript.new()
	add_child(_toast)
	_toast.setup()
	board = Board.new()
	add_child(board)
	_hud.board = board   # the HUD reads board only for the reward-chip fly-from start point
	board.chain_changed.connect(_on_chain_changed)
	board.chain_resolved.connect(_on_chain_resolved)
	# M8c — a tapped cell while a tap-target tool is armed fires the armed tool on it.
	board.cell_tapped.connect(_on_tool_target)
	# M3j — a fish chain long enough to count toward a pearl capture reports its cells so we
	# can ask GameState.capture_pearl_if_adjacent whether they sit next to the live pearl.
	board.pearl_chain_resolved.connect(_on_pearl_chain)
	# T7/T9/T10 — every resolved chain reports its cells so we can run the farm-hazard
	# interactions (rat-chain clear, fire extinguish, deadly_pests cull). Connected BEFORE
	# chain_resolved fires (Board emits cells first), so _on_chain_resolved sees the stashed cells.
	board.chain_cells_resolved.connect(_on_chain_cells)
	# Seed the board's refill pool from the restored save's ACTIVE BIOME (M3f): if
	# the save was mid-expedition, active_biome_pool() returns the mine pool and we
	# rebuild so mine tiles show immediately; otherwise it's the farm spawner pool.
	board.set_tile_pool(game.active_biome_pool())
	# Always rebuild from the ACTIVE pool. Board._ready() builds a STAPLE-only board (its
	# default tile_pool) BEFORE the real pool is known here; without this rebuild a fresh
	# farm shows a monotone grass+wheat board instead of the full FARM_POOL variety (apples/
	# carrots/trees/pigs/cows/…). The visual goldens already rebuild here (run_visual_tests
	# calls board.setup_new_board() after _ready), so it was the LIVE game that was drifting.
	# Mine/harbor/spawner saves reflect their pools immediately too.
	board.setup_new_board()
	# T24: if the save was restored mid-fight, keep the boss's raised chain bar, re-apply the boss
	# modifier overlay (frozen/rubble/hidden/heat), and re-pool the board with the boss's (boosted)
	# refill pool so the fight resumes exactly where it left off.
	board.set_min_chain(game.boss_min_chain())
	if game.is_boss_active():
		board.set_boss_modifier_state(game.boss_modifier_state)
		board.set_tile_pool(_boss_refill_pool())
	# M3h: a restored Master Ratcatcher makes grass chains clear adjacent rats.
	board.clear_rats_on_grass = game.has_master_ratcatcher()
	# T7/T8/T9: a save restored mid-run may carry live farm hazards. Re-stamp the positional
	# RAT/FIRE tiles onto the freshly-built board at their recorded cells and rebuild the wolf
	# overlays, so the hazards show immediately on load (they are authoritative state, not pool
	# draws). On the farm only; a mine/harbor save has no farm hazards active.
	_restore_farm_hazards_onto_board()
	# M3i: mining through rubble is active exactly while on a mine expedition (a STONE
	# chain clears adjacent rubble — no building needed). A save restored mid-expedition
	# keeps it on.
	board.clear_rubble_on_stone = game.is_in_mine()
	# T11/T23: a save restored mid-expedition may carry live MINE hazards + a Mysterious Ore.
	# Block hazard-chaining (RUBBLE/LAVA) in the mine, then re-stamp the cave-in row / lava / gas
	# cells + the live ore onto the board and refresh the mole overlay so they show immediately.
	board.block_mine_hazards = game.is_in_mine()
	_restore_mine_hazards_onto_board()
	# M3j: pearl capture is live exactly while on a harbor expedition (a fish chain next to
	# the pearl grabs the Rune). A save restored mid-harbor keeps it on; place the live pearl
	# back onto the board at its seeded cell so the rune target shows immediately.
	board.clear_pearl_on_fish_chain = game.is_in_harbor()
	if game.is_in_harbor() and game.has_active_pearl():
		board.place_pearl(Vector2i(int(game.fish_pearl.get("col", 0)), int(game.fish_pearl.get("row", 0))))
	# A1b: install the upgrade-tile provider (the React core loop). The Board asks it on every
	# resolve WHAT next-tier tiles to spawn; we answer via GameState.upgrade_spawn against the
	# home zone — but ONLY on the farm biome (mine/harbor have no zone upgradeMap). Set once here;
	# the closure re-reads game.active_biome each call, so it self-disables during an expedition
	# and re-enables on return. Decoupled: the Board holds this Callable, never a GameState ref.
	board.upgrade_provider = _farm_upgrade_spawn
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
	# A2 — seed the season bar + the board's per-season field tint from the restored save so
	# both reflect the current farm season immediately (not just after the first chain).
	_refresh_season_bar()
	board.set_season(game.current_season_index())
	# Task C — TOWN-IS-HOME launch gate (React's initial view:"town"). The puzzle board is only
	# playable while a bounded farm RUN is live, OR while the player is on a non-farm expedition
	# (mine/harbor), OR while a boss fight is active; otherwise (idle on the farm with no run) the
	# board is the INERT town-home backdrop. BUG C1 — the old gate only checked farm_run_active, so
	# a save restored mid-mine (active_biome="mine", no run) or mid-boss came up INERT and unplayable;
	# _board_should_be_active() covers all three cases.
	#   • Board live (run / expedition / boss): make it the playable surface and stay on it.
	#   • Truly idle on the farm: gate the board inert. THEN auto-open the town home — but ONLY for
	#     the real game (windowed, dialogs enabled). Headless test runs (DisplayServer "headless")
	#     and the web boot smoke (_dialogs_disabled) leave the board rendered-but-inert and do NOT
	#     auto-open town, so the boot smoke + every Main-instantiating headless suite stay
	#     deterministic. Placed BEFORE the tutorial/story/daily block so those auto-modals still
	#     layer on top.
	var board_live := _board_should_be_active()
	board.set_active(board_live)
	if not board_live:
		if not _dialogs_disabled() and DisplayServer.get_name() != "headless":
			_open_townmap()
	# Tutorial onboarding: show the 6-step welcome modal on FIRST LOAD (tutorial_seen=false).
	# ORDERING — the tutorial is shown FIRST (layer 6, above StoryModal's layer 5) so it
	# doesn't fight the arrival story beat. The story queue is drained AFTER the tutorial
	# finishes (via _on_tutorial_finished → _drain_story_queue). If the player has already
	# seen the tutorial the queue is drained immediately as before.
	if _dialogs_disabled():
		# Web smoke / tests: suppress the first-launch auto-modals so the board comes up
		# quiescent and the browser-history nav smoke is deterministic (see _dialogs_disabled).
		pass
	elif not game.tutorial_seen:
		_open_tutorial()
	else:
		# Story UI: present any beats already queued (the arrival beat fired by
		# start_story_session above, plus any threshold/flag beats a loaded save satisfied).
		# The HUD + board are built now, so the beat modal layers cleanly above them.
		_drain_story_queue()
		# Daily reward: the tutorial was already seen, so the only thing that could still be
		# on screen is the story modal. _maybe_show_daily() no-ops while a story beat is showing
		# (it's surfaced instead when the story queue fully drains in _on_story_advanced).
		_maybe_show_daily()
	# Web-boot readiness beacon (M-infra: web-export smoke). On an HTML5/WASM build the
	# whole scene tree is now up (HUD + board built, save loaded, story/tutorial wired),
	# so flip a window flag the Playwright smoke (tests/godot-web/boot.spec.ts) waits on
	# to prove the engine actually booted past _ready. Guarded by OS.has_feature("web")
	# so it's a COMPLETE no-op on desktop/headless — JavaScriptBridge isn't even touched
	# there, leaving the headless GDScript sweep unaffected.
	if OS.has_feature("web"):
		# Wire the browser Back/Forward buttons to the modal nav (see _setup_browser_history).
		# Done before the readiness beacon so a deep-linked launch (#/inventory) is already
		# being applied by the time the Playwright smoke sees __hearthGodotReady.
		_setup_browser_history()
		JavaScriptBridge.eval("window.__hearthGodotReady = true;", true)

func _layout() -> void:
	var vp: Vector2 = get_viewport_rect().size
	board.layout_for(vp)
	var bw: Vector2 = board.board_pixel_size()
	# Board sits below the top-bar + chain-progress bar (≈ 0–110px) and above the
	# orders + stockpile below it. A touch lower than the old 0.22 to clear the bar.
	board.position = Vector2((vp.x - bw.x) / 2.0, vp.y * 0.24)
	_hud._layout_hud(vp)
	_hud._refresh_status()
	# The chain-progress track width tracks the box width, so re-measure + redraw
	# the fill after the containers have settled at the new viewport size.
	_hud._refresh_chain_progress.call_deferred()

# ── HUD forwarders (the moved presentation now lives in Hud.gd) ───────────────
# These thin methods keep the kept names reachable as `main._refresh_*()` for the ~20
# capture scripts + the scene-smoke/tool-board tests, and let Main's own internal call
# sites stay unchanged. Each delegates to `_hud` (guarded so a pre-build call is a no-op).

func _refresh_totals() -> void: if _hud: _hud._refresh_totals()
func _refresh_meta() -> void: if _hud: _hud._refresh_meta()
func _refresh_settlement() -> void: if _hud: _hud._refresh_settlement()
func _refresh_buildings() -> void: if _hud: _hud._refresh_buildings()
func _refresh_orders() -> void: if _hud: _hud._refresh_orders()
func _refresh_biome() -> void: if _hud: _hud._refresh_biome()
func _refresh_boss() -> void: if _hud: _hud._refresh_boss()
func _refresh_rats() -> void: if _hud: _hud._refresh_rats()
func _refresh_runes() -> void: if _hud: _hud._refresh_runes()
func _refresh_season_bar() -> void: if _hud: _hud._refresh_season_bar()
func _refresh_chain_progress() -> void: if _hud: _hud._refresh_chain_progress()
func _refresh_tools() -> void: if _hud: _hud._refresh_tools()

## Switch between the five persistent bottom-nav VIEWS without stacking them. Tapping a
## nav tab routes here (NOT straight to the opener): we first hide any OTHER primary view
## that's currently open by setting `.visible = false` DIRECTLY — deliberately NOT calling
## `.close()`, because close() emits `closed` → `_on_*_closed` → `_clear_nav()`, which would
## wipe the new tab's `_nav_current` after the opener just set it. Then we `call(opener)` to
## open the target, which sets `_nav_current` + `_refresh_nav()` itself. The `_open_*`
## methods stay usable directly (deep-links, tests) — only the nav-tab wiring goes through
## here. Reopening the same view is a no-op switch (it just re-opens + re-highlights).
func _switch_primary_view(opener: String) -> void:
	# T15/review-3 — the Craft tab now opens the crafting UI (RecipeWikiScreen), so it
	# joins the PRIMARY views that must be hidden when ANOTHER primary tab is opened. The
	# Town ledger (TownScreen) is no longer a nav-tab target (it moved to the ☰ menu + the
	# town-map "📋 Town Ledger" button), but it stays in this hide list so a stray open of
	# it (deep-link / menu) is dismissed when a primary nav tab is tapped.
	for screen in [_town_screen, _inventory_screen, _townmap_screen,
			_cartography_screen, _townsfolk_screen, _recipe_wiki_screen]:
		if screen != null and is_instance_valid(screen) and screen.visible:
			screen.visible = false
	# B2 — the SECONDARY screens (Achievements / Tile collection / Chronicle / Castle /
	# Charter / Decorations / Portal / Quests) are full-brightness VIEWS too, opened from the
	# ⚙ menu's "More" section. Tapping a bottom-nav PRIMARY tab while a secondary view is up
	# must dismiss it first, otherwise the secondary (a HIGHER layer-4 CanvasLayer) would
	# paint over the primary the nav just opened. Hide via `.visible = false` DIRECTLY — NOT
	# `.close()` — for the same reason the primaries do: close() emits `closed` → `_on_*_closed`
	# → `_router.close_modal()`, which would race the modal state the opener is about to set.
	# (RecipeWikiScreen moved OUT of this list — it's a primary now, hidden above.)
	for screen in [_achievements_screen, _tile_collection_screen,
			_chronicle_screen, _castle_screen, _charter_screen, _decorations_screen,
			_portal_screen, _quests_screen, _boons_screen]:
		if screen != null and is_instance_valid(screen) and screen.visible:
			screen.visible = false
	call(opener)

# ── HUD up-calls (the HUD emits intents; Main does the routing / tool dispatch) ──

## A bottom-nav tab was tapped (the HUD emitted nav_selected(key)). Map the key to its opener
## (the same routing the old in-HUD tab wiring used) and route through _switch_primary_view so
## opening one primary view first hides any other open one. The opener then sets the active tab
## (_hud.set_nav_current + _hud._refresh_nav) itself. Unknown keys are a no-op.
func _on_nav_selected(key: String) -> void:
	# review-3 — the 🔨 Craft tab opens the dedicated CRAFTING UI (RecipeWikiScreen) now,
	# not the town-management ledger (TownScreen). The ledger moved to the ☰ menu ("Market
	# & Town") + the town-map "📋 Town Ledger" button.
	var opener: String = {
		"town": "_open_townmap",
		"inventory": "_open_inventory",
		"craft": "_open_recipes",
		"map": "_open_cartography",
		"folk": "_open_townsfolk",
	}.get(key, "")
	if opener != "":
		_switch_primary_view(opener)

## A tool slot was tapped (the HUD emitted tool_use_requested(id)). Run the existing tool
## dispatch unchanged, then refresh the palette so the spent count / disappearance shows
## immediately (mirrors the old in-HUD `use_tool(id); _refresh_tools()` slot handler).
func _on_tool_use_requested(id: String) -> void:
	use_tool(id)
	_refresh_tools()

# ── Town screen ─────────────────────────────────────────────────────────────

## M5-polish — the HUD "🏠 Town" button gate. On the FARM (active_biome == "farm") this
## just opens Town as before. On an EXPEDITION it first shows the leave-confirm card; the
## expedition isn't abandoned unless the player taps Confirm (which then opens Town). The
## deep-link "town" + tests still call _open_town directly, so that path is unaffected — the
## confirm only fronts the on-screen button press, which is the only place a player would
## "head back to town" mid-expedition.
func _on_town_button() -> void:
	if game != null and game.active_biome != "farm":
		_open_leaveboard()
		return
	_open_town()

# ── modal closability (tap-scrim / ESC / back) ────────────────────────────────

## Every modal screen is a CanvasLayer with a close() method and a full-rect STOP scrim
## backdrop (the first ColorRect child). When one is added, find that backdrop and wire a
## tap on it to dismiss the modal. Deferred so the screen's _ready/_build_shell (which
## creates the backdrop) has run. CanvasLayers without close() (HUD, nav, fx, toast) are
## skipped, so this only ever touches real modals.
func _on_child_entered(node: Node) -> void:
	if node is CanvasLayer and node.has_method("close"):
		call_deferred("_install_overlay_dismiss", node)

func _install_overlay_dismiss(overlay) -> void:
	if overlay == null or not is_instance_valid(overlay):
		return
	for child in overlay.get_children():
		if child is ColorRect and (child as ColorRect).mouse_filter == Control.MOUSE_FILTER_STOP:
			UiKit.wire_backdrop_dismiss(child, Callable(overlay, "close"))
			return

## Every closable modal overlay, in ONE place. Both `_close_top_overlay` (ESC/back) and
## `_other_overlay_visible` (the launch-modal settle, FIX 1) iterate this so they can never
## drift apart. Includes nulls / not-yet-built screens — callers guard with is_instance_valid.
func _overlay_list() -> Array:
	return [
		_debug_modal, _story_modal, _tutorial_modal, _daily_modal, _harvest_modal, _leaveboard_modal,
		_startfarming_modal,
		_menu_screen, _town_screen, _inventory_screen, _townmap_screen, _achievements_screen,
		_tile_collection_screen, _chronicle_screen, _townsfolk_screen, _cartography_screen,
		_recipe_wiki_screen, _castle_screen, _decorations_screen, _portal_screen,
		_charter_screen, _quests_screen, _boons_screen, _keeper_modal, _founder_modal,
	]

## Close the top-most visible modal overlay (highest CanvasLayer.layer). Returns true if
## one was closed. Used by ESC / Android-back so the player is never stuck in a modal.
func _close_top_overlay() -> bool:
	var best = null
	var best_layer := -2147483648
	for o in _overlay_list():
		if o != null and is_instance_valid(o) and o.visible and o.has_method("close"):
			var lyr: int = int(o.layer) if "layer" in o else 0
			if lyr >= best_layer:
				best_layer = lyr
				best = o
	if best != null:
		best.close()
		return true
	return false

## True if ANY closable overlay other than `except_screen` is currently visible. Used by the
## launch-modal settle (FIX 1): when a launch/secondary modal closes, we only re-assert the town
## home if nothing else still owns the screen. Iterates the SAME list as `_close_top_overlay`.
func _other_overlay_visible(except_screen) -> bool:
	for o in _overlay_list():
		if o == except_screen:
			continue
		if o != null and is_instance_valid(o) and o.visible and o.has_method("close"):
			return true
	return false

## When a launch/secondary modal closes while the player is idle in the TOWN HOME (no active
## run, town map is the visible base, and no OTHER overlay is still on top), re-assert TOWNMAP so
## the router (and the web URL) match the visible screen. Otherwise fall back to close_modal()
## (board is the base during a run; or another overlay still owns the router).
func _settle_close_to_home_or_board() -> void:
	if game != null and not game.farm_run_active \
			and _townmap_screen != null and is_instance_valid(_townmap_screen) and _townmap_screen.visible \
			and not _other_overlay_visible(_townmap_screen):
		_router.open_modal(ViewRouter.Modal.TOWNMAP)
		if _hud != null:
			_hud.set_nav_current("town")
			_hud._refresh_nav()
	else:
		_router.close_modal()

## ESC (desktop) / Android-back map to ui_cancel — close the top modal if one is open so
## the player can always back out of any screen, regardless of the Close button.
func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		if _close_top_overlay():
			get_viewport().set_input_as_handled()

# ── Leave-expedition confirm (M5-polish) ──────────────────────────────────────

## Present the leave-expedition confirm card, lazily creating + wiring it on first use.
## arm() only shows the card while on an expedition (it's a no-op on the farm and returns
## false — in which case we fall straight through to opening Town, so a stray call can never
## strand the player). On Confirm the card leaves the expedition (in GameState) and emits
## `confirmed`; on Cancel it just closes.
func _open_leaveboard() -> void:
	if _leaveboard_modal == null:
		_leaveboard_modal = LeaveBoardModalScript.new()
		add_child(_leaveboard_modal)
		_leaveboard_modal.setup(game)
		_leaveboard_modal.connect("confirmed", Callable(self, "_on_leaveboard_confirmed"))
		_leaveboard_modal.connect("closed", Callable(self, "_on_leaveboard_closed"))
	if _leaveboard_modal.arm():
		_router.open_modal(ViewRouter.Modal.LEAVEBOARD)
	else:
		# On the farm there is nothing to leave — open Town directly (defensive: arm() only
		# returns false off an expedition, so this keeps the button always responsive).
		_open_town()

## The player confirmed leaving — the modal already ran game.leave_mine()/leave_harbor(),
## so run Main's existing biome-change refresh path (re-pool the board onto the farm, reset
## hazard flags, refresh the HUD, save), surface a toast, then drop the player into Town.
func _on_leaveboard_confirmed() -> void:
	# Reuse the shared biome-change path (the one the TownScreen leave routes through): it
	# re-pools + regenerates the board onto the farm and refreshes every affected surface.
	_on_town_changed()
	if _toast != null:
		_toast.show_toast("Returned to the farm — your stores are intact.")
	# The leave is done; the modal closed itself. Land the player in Town (their intent when
	# they tapped the Town button) now that they're back on the farm board.
	_open_town()

## The leave-confirm card was dismissed (Cancel, or after Confirm closed it). Hide + reset
## the router. NOTE: on Confirm, _on_leaveboard_confirmed already opened Town (which re-set
## the router to TOWN); this fires AFTER that via the confirmed→close ordering, so guard the
## router reset to only run when Town isn't the active modal (Cancel path).
func _on_leaveboard_closed() -> void:
	if _leaveboard_modal != null:
		_leaveboard_modal.visible = false
	if _router.current_modal() == ViewRouter.Modal.LEAVEBOARD:
		_router.close_modal()

# ── Toast (M5-polish) ─────────────────────────────────────────────────────────

## Public helper — show a transient toast bubble with `text`. Safe to call before the toast
## is built (it self-builds). The single entry point every real call site routes through.
func show_toast(text: String) -> void:
	if _toast == null:
		_toast = ToastScript.new()
		add_child(_toast)
		_toast.setup()
	_toast.show_toast(text)

# ── Town screen (cont.) ───────────────────────────────────────────────────────

## Open the town panel, lazily creating + wiring it on first use.
func _open_town() -> void:
	if _town_screen == null:
		_town_screen = TownScreen.new()
		add_child(_town_screen)
		_town_screen.setup(game)
		_town_screen.connect("closed", Callable(self, "_on_town_closed"))
		_town_screen.connect("state_changed", Callable(self, "_on_town_changed"))
		# M3h: the Town screen's "Shoo rats" button has no board ref, so it emits
		# `rats_shoo_requested` and Main does the actual clear (spending the charge in ONE place).
		_town_screen.connect("rats_shoo_requested", Callable(self, "_on_shoo_rats"))
		# T24: the Town screen's "Challenge <Boss>" button has no board ref, so it emits
		# `boss_challenge_requested` and Main runs the board-wiring boss start (the single point
		# that arms the modifier overlay + boosted pool + raised chain bar).
		_town_screen.connect("boss_challenge_requested", Callable(self, "_on_boss_challenge_requested"))
	_town_screen.open()
	_router.open_modal(ViewRouter.Modal.TOWN)
	# review-3 — the TownScreen (settlement / buildings / refine / market / orders) is the TOWN
	# LEDGER, reached from the ☰ menu ("Market & Town") + the town-map "📋 Town Ledger" button —
	# NOT a bottom-nav primary tab anymore. So it no longer marks the "craft" tab active; like the
	# other menu-routed views it leaves the nav marker as-is (it has its own back-to-board path).
	_hud._clear_nav()

func _on_town_closed() -> void:
	if _town_screen != null:
		_town_screen.visible = false
	_router.close_modal()
	_hud._clear_nav()

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
		_menu_screen.connect("sound_toggle_requested", Callable(self, "_on_toggle_sound"))
		_menu_screen.connect("new_game_requested", Callable(self, "_on_new_game"))
		# The "More" section's nav buttons route the secondary screens (achievements,
		# chronicle, castle, …) through the SAME deep-link path the old left-strip buttons
		# used — the menu emits navigation_requested(id), Main opens it via apply_deeplink.
		_menu_screen.connect("navigation_requested", Callable(self, "_on_menu_navigate"))
	_menu_screen.open()
	_router.open_modal(ViewRouter.Modal.MENU)

func _on_menu_closed() -> void:
	if _menu_screen != null:
		_menu_screen.visible = false
	_router.close_modal()

## A "More" nav button in the menu was pressed — the menu already closed itself, so just
## open the requested secondary screen via the shared deep-link path (the SAME route the
## old left-strip HUD buttons used). Unknown ids are a no-op (apply_deeplink returns false).
func _on_menu_navigate(deeplink_id: String) -> void:
	apply_deeplink(deeplink_id)

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
	_hud.set_nav_current("inventory")
	_hud._refresh_nav()

func _on_inventory_closed() -> void:
	if _inventory_screen != null:
		_inventory_screen.visible = false
	_router.close_modal()
	_hud._clear_nav()

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
		# B1: the Town view's "▶ Board" overlay button returns to the board (the card "✖ Close"
		# is gone now it's a primary nav VIEW). Route it through the same board-return path as
		# the deep-link: hide the view + clear the nav.
		_townmap_screen.connect("board_requested", Callable(self, "_on_townmap_board_requested"))
		# Task C: tapping the farm board pad opens the "Start Farming" picker (the FARM/ENTER
		# dialog) — the player's entry point into a bounded run from the town home.
		_townmap_screen.connect("start_farming_requested", Callable(self, "_open_startfarming"))
		# review-3: the "📋 Town Ledger" overlay button opens the TownScreen ledger. Route it
		# through apply_deeplink("town") → _switch_primary_view("_open_town"), so the town MAP
		# (a sibling primary) is hidden first and the ledger reads as a full-brightness view.
		_townmap_screen.connect("ledger_requested", Callable(self, "_on_townmap_ledger_requested"))
		# T31: the "✨ Boons" overlay button opens the BoonsScreen (keeper-perk catalogs). Route
		# through apply_deeplink("boons") so it opens as a full-brightness view over the board.
		_townmap_screen.connect("boons_requested", Callable(self, "_on_townmap_boons_requested"))
	_townmap_screen.open()
	_router.open_modal(ViewRouter.Modal.TOWNMAP)
	# The spatial town map (where buildings are placed) is the "Town" tab's target.
	_hud.set_nav_current("town")
	_hud._refresh_nav()

func _on_townmap_closed() -> void:
	if _townmap_screen != null:
		_townmap_screen.visible = false
	_router.close_modal()
	_hud._clear_nav()

## B1: the Town view's "▶ Board" overlay button was pressed — return to the board. Routes
## through the same path as apply_deeplink("board"): hide the view + reset the router + clear
## the active nav tab. (ESC/back returns to the board via _close_top_overlay → close() too.)
func _on_townmap_board_requested() -> void:
	apply_deeplink("board")

## review-3: the Town map's "📋 Town Ledger" overlay button was pressed — open the TownScreen
## ledger. Route through apply_deeplink("town") so _switch_primary_view hides the open town map
## first (sibling primary) and the ledger comes up as a full-brightness view, not over the map.
func _on_townmap_ledger_requested() -> void:
	apply_deeplink("town")

## T31: the Town map's "✨ Boons" overlay button was pressed — open the BoonsScreen via
## apply_deeplink("boons") (a full-brightness view over the board).
func _on_townmap_boons_requested() -> void:
	apply_deeplink("boons")

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
		_chronicle_screen.connect("charter_view_requested", Callable(self, "_on_chronicle_view_charter"))
	_chronicle_screen.open()
	_router.open_modal(ViewRouter.Modal.CHRONICLE)

func _on_chronicle_closed() -> void:
	if _chronicle_screen != null:
		_chronicle_screen.visible = false
	_router.close_modal()

## "View Charter" from the Chronicle: hide the chronicle, then open the Charter screen
## (React parity — the Chronicle header links straight to the Charter).
func _on_chronicle_view_charter() -> void:
	if _chronicle_screen != null:
		_chronicle_screen.visible = false
	_open_charter()

# ── Townsfolk roster screen ────────────────────────────────────────────────────

## Open the townsfolk modal, lazily creating + wiring it on first use (mirrors
## _open_chronicle). The screen emits `closed` (routed to a hide handler) and `state_changed`
## (a gift given / worker hired-or-fired — routed to the shared _on_town_changed funnel so the
## save + HUD totals update). open() re-reads game.npcs each time, so the roster always
## reflects the current bond + worker state.
func _open_townsfolk() -> void:
	if _townsfolk_screen == null:
		_townsfolk_screen = TownsfolkScreenScript.new()
		add_child(_townsfolk_screen)
		_townsfolk_screen.setup(game)
		_townsfolk_screen.connect("closed", Callable(self, "_on_townsfolk_closed"))
		_townsfolk_screen.connect("state_changed", Callable(self, "_on_town_changed"))
	_townsfolk_screen.open()
	_router.open_modal(ViewRouter.Modal.TOWNSFOLK)
	_hud.set_nav_current("folk")
	_hud._refresh_nav()

func _on_townsfolk_closed() -> void:
	if _townsfolk_screen != null:
		_townsfolk_screen.visible = false
	_router.close_modal()
	_hud._clear_nav()

# ── Cartography world map (T26: the 11-node illustrated travel map) ─────────────

## Open the cartography world-map view, lazily creating + wiring it on first use (mirrors
## _open_townsfolk). The screen re-reads the live GameState travel state (map_current → current
## node, map_node_state → per-node pin style, travel_block_reason / coins / player_level →
## the detail-panel Travel button) on open(), so the map always reflects where you are + what's
## reachable. Its `travel_requested` signal is routed to Main, the SINGLE mutation point, which
## runs game.travel_to + the biome/boss/toast follow-up.
func _open_cartography() -> void:
	if _cartography_screen == null:
		_cartography_screen = CartographyScreenScript.new()
		add_child(_cartography_screen)
		_cartography_screen.setup(game)
		_cartography_screen.connect("closed", Callable(self, "_on_cartography_closed"))
		_cartography_screen.connect("travel_requested", Callable(self, "_on_cartography_travel"))
		_cartography_screen.connect("found_requested", Callable(self, "_on_cartography_found"))
	_cartography_screen.open()
	_router.open_modal(ViewRouter.Modal.CARTOGRAPHY)
	# The cartography world map is the "Map" tab's target.
	_hud.set_nav_current("map")
	_hud._refresh_nav()

func _on_cartography_closed() -> void:
	if _cartography_screen != null:
		_cartography_screen.visible = false
	_router.close_modal()
	_hud._clear_nav()

# ── Crafting UI (the 🔨 Craft primary view) ──────────────────────────────────

## Open the crafting screen (RecipeWikiScreen — station tabs + recipe grid + have/need
## detail card + Craft button), lazily creating + wiring it on first use. review-3 promoted
## this from a ☰-menu SECONDARY to the 🔨 Craft PRIMARY nav VIEW: it sets the "craft" nav
## marker (like _open_inventory/_open_townmap mark their tabs) so the bottom-nav highlights
## Craft while it's up. Crafting mutates inventory → state_changed re-renders the HUD
## stockpile (same handler the Town/Townmap screens use after any state-changing action).
func _open_recipes() -> void:
	if _recipe_wiki_screen == null:
		_recipe_wiki_screen = RecipeWikiScreenScript.new()
		add_child(_recipe_wiki_screen)
		_recipe_wiki_screen.setup(game)
		_recipe_wiki_screen.connect("closed", Callable(self, "_on_recipes_closed"))
		_recipe_wiki_screen.connect("state_changed", Callable(self, "_on_town_changed"))
	_recipe_wiki_screen.open()
	_router.open_modal(ViewRouter.Modal.RECIPES)
	# The crafting screen is the "Craft" tab's target — mark it active on the bottom nav.
	_hud.set_nav_current("craft")
	_hud._refresh_nav()

func _on_recipes_closed() -> void:
	if _recipe_wiki_screen != null:
		_recipe_wiki_screen.visible = false
	_router.close_modal()
	_hud._clear_nav()

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

# ── T31: Boons + Keeper encounter ──────────────────────────────────────────────────

## Open the Boons catalog screen, lazily creating + wiring it on first use (mirrors
## _open_portal). The screen mutates GameState in place (purchase_boon deducts Embers /
## Core Ingots + marks owned); its `closed` is routed to a hide+persist handler. open()
## re-reads the live balances + owned set each time.
func _open_boons() -> void:
	if _boons_screen == null:
		_boons_screen = BoonsScreenScript.new()
		add_child(_boons_screen)
		_boons_screen.setup(game)
		_boons_screen.connect("closed", Callable(self, "_on_boons_closed"))
	_boons_screen.open()
	_router.open_modal(ViewRouter.Modal.BOONS)

## The boons screen was closed: hide it, reset the router, and persist (a claim spent Embers /
## Core Ingots + marked a boon owned) + refresh the stockpile HUD. Mirrors _on_portal_closed.
func _on_boons_closed() -> void:
	if _boons_screen != null:
		_boons_screen.visible = false
	_router.close_modal()
	SaveManager.save(game)
	_refresh_totals()
	_refresh_chain_progress()

## Present the keeper encounter for settlement `type` ("farm" today), lazily creating + wiring
## the modal on first use. The modal makes the FINAL Coexist / Drive Out choice via the real
## game.give_keeper_reward(); its `resolved` signal routes to _on_keeper_resolved (save + refresh
## + a toast). Used by the auto-trigger in _on_town_changed and the `keeper` deeplink.
func _open_keeper(type: String) -> void:
	if _keeper_modal == null:
		_keeper_modal = KeeperModalScript.new()
		add_child(_keeper_modal)
		_keeper_modal.setup(game)
		_keeper_modal.connect("resolved", Callable(self, "_on_keeper_resolved"))
		_keeper_modal.connect("closed", Callable(self, "_on_keeper_closed"))
	_keeper_modal.open_for(type)
	_router.open_modal(ViewRouter.Modal.KEEPER)

## The keeper encounter resolved (a path was chosen + the player Continued): hide the modal,
## reset the router, persist (give_keeper_reward set the path flag + granted the currency), and
## refresh the HUD. A toast confirms the outcome + nudges toward the now-unlocked Boons.
func _on_keeper_resolved(type: String, path: String) -> void:
	_router.close_modal()
	SaveManager.save(game)
	_refresh_totals()
	_refresh_chain_progress()
	var keeper_name: String = KeeperConfig.keeper_name(type)
	if path == "coexist":
		show_toast("%s stays. +%d ✨ Embers — spend them in ✨ Boons." % [keeper_name, KeeperConfig.coexist_embers(type)])
	else:
		show_toast("%s withdraws. +%d ⬡ Core Ingots — spend them in ✨ Boons." % [keeper_name, KeeperConfig.driveout_core_ingots(type)])

## The keeper modal was force-closed (defensive — the normal flow resolves via a choice +
## Continue). Just reset the router so nav stays consistent.
func _on_keeper_closed() -> void:
	if _router.current_modal() == ViewRouter.Modal.KEEPER:
		_router.close_modal()

## T31 — fire the keeper encounter when the (home) settlement is built up and its keeper
## isn't resolved yet. Called from _on_town_changed (the single town-action funnel) AFTER the
## board/HUD refresh + save. SCOPE: the port has one active settlement (the home FARM = the
## Deer-Spirit), so only "farm" is checked today; the mine/harbor keepers are ported +
## forward-compatible and will be wired off their settlements in a later task (T22). Guarded so
## it never interrupts an already-open keeper modal (or a story beat showing on top).
func _maybe_trigger_keeper() -> void:
	if game == null:
		return
	# Don't stack the encounter on top of an already-open keeper modal or a story beat.
	if _keeper_modal != null and _keeper_modal.visible:
		return
	if _story_modal != null and _story_modal.visible:
		return
	if not game.keeper_encounter_ready("farm"):
		return
	_open_keeper("farm")

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

# ── Quests + Almanac ───────────────────────────────────────────────────────────

## Open the Quests screen, lazily creating + wiring it on first use. setup()/open() roll
## the quest board (idempotent) and re-read the live quest + almanac state, so the screen
## always reflects current progress + claim availability.
func _open_quests() -> void:
	if _quests_screen == null:
		_quests_screen = QuestsScreenScript.new()
		add_child(_quests_screen)
		_quests_screen.setup(game)
		_quests_screen.connect("closed", Callable(self, "_on_quests_closed"))
	_quests_screen.open()
	_router.open_modal(ViewRouter.Modal.QUESTS)

## The Quests screen was closed: hide it, reset the router, and persist (a claim spent /
## granted coins + XP + tools + runes + advanced the almanac) + refresh the stockpile HUD
## so the credited coins surface on the on-board totals immediately. Mirrors _on_portal_closed.
func _on_quests_closed() -> void:
	if _quests_screen != null:
		_quests_screen.visible = false
	_router.close_modal()
	# A quest/tier claim credited coins/runes/tools + advanced the almanac; persist + refresh HUD.
	SaveManager.save(game)
	_refresh_totals()
	_refresh_chain_progress()

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
## `finished` fires before `closed`). Hide it, then settle the router: on a no-run launch the
## town map is still the visible home, so _settle_close_to_home_or_board re-asserts TOWNMAP
## (FIX 1) rather than leaving the router at NONE while the town shows. If the daily modal is
## still open on top (it's opened in _on_tutorial_finished), the settle falls back to
## close_modal() — the daily's own close handler settles to TOWNMAP later.
func _on_tutorial_closed() -> void:
	if _tutorial_modal != null:
		_tutorial_modal.visible = false
	_settle_close_to_home_or_board()

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
	# Daily reward: surface it now if no story beat opened (queue empty); otherwise it is
	# held back and surfaced when the story queue fully drains in _on_story_advanced.
	_maybe_show_daily()

# ── Daily login-streak reward modal ─────────────────────────────────────────────

## Surface this launch's daily-streak reward modal IF there's a pending claim AND nothing
## is in the way (no tutorial showing, no story beat showing). No-op otherwise — the call
## sites (_ready, _on_tutorial_finished, _on_story_advanced) retry it as each blocker clears,
## so the modal appears the moment the way is clear. Consumes _pending_daily_claim so it only
## shows once. The reward was already granted by login_tick in _ready; this is display-only.
func _maybe_show_daily() -> void:
	if _pending_daily_claim.is_empty():
		return
	# Don't fight the tutorial or a story beat — retry once they're dismissed.
	if _tutorial_modal != null and _tutorial_modal.visible:
		return
	if _story_modal != null and _story_modal.visible:
		return
	var claim: Dictionary = _pending_daily_claim
	_pending_daily_claim = {}   # consume — show exactly once this launch
	_open_daily(int(claim.get("day", 0)), claim.get("reward", {}))

## Open the daily-streak modal showing `day` + `reward`, lazily creating + wiring it on first
## use. The HUD coin/runes pills already reflect the granted reward (login_tick credited it
## before the HUD rendered); this just presents the celebratory card.
func _open_daily(day: int, reward: Dictionary) -> void:
	if _daily_modal == null:
		_daily_modal = DailyStreakModalScript.new()
		add_child(_daily_modal)
		_daily_modal.setup(game)
		_daily_modal.connect("collected", Callable(self, "_on_daily_collected"))
		_daily_modal.connect("closed", Callable(self, "_on_daily_closed"))
	_daily_modal.open_for(day, reward)
	_router.open_modal(ViewRouter.Modal.DAILY)

## The player tapped Collect — the modal will close itself (emits closed). Refresh the HUD so
## the credited coins/runes are visible immediately. NO grant here (login_tick already did it).
func _on_daily_collected() -> void:
	_refresh_meta()
	_refresh_runes()

## The daily-streak modal was closed: hide it, then settle the router. On a no-run launch the
## daily is the LAST auto-modal over the town home, so _settle_close_to_home_or_board re-asserts
## TOWNMAP (FIX 1) so the router (and web URL) match the visible town. NO SaveManager.save — the
## grant was already persisted in _ready right after login_tick; closing the card changes nothing.
func _on_daily_closed() -> void:
	if _daily_modal != null:
		_daily_modal.visible = false
	_settle_close_to_home_or_board()

# ── Harvest season-summary modal (A2) ─────────────────────────────────────────

## A2 — open the harvest season-summary modal with the note_farm_turn() summary dict (the
## season that just ended + the turn budget + the coins/runes snapshot), lazily creating +
## wiring it on first use (mirrors _open_daily). Informational ONLY — the modal grants nothing
## (the fresh Spring cycle already began in state); "Continue" just dismisses it.
func _open_harvest(summary: Dictionary) -> void:
	if _harvest_modal == null:
		_harvest_modal = HarvestModalScript.new()
		add_child(_harvest_modal)
		_harvest_modal.setup(game)
		_harvest_modal.connect("closed", Callable(self, "_on_harvest_closed"))
	_harvest_modal.open_for(summary)

## Task C — open the harvest modal in RUN-END mode (a bounded run reached its budget), lazily
## creating + wiring it on first use (mirrors _open_harvest). The "Return to Town" CTA emits
## return_to_town → _on_season_return; we connect that signal ONCE (guarded against the lazy-create
## re-wiring it, and against a second run-end re-connecting) so close_season fires exactly once.
func _open_harvest_run_end(summary: Dictionary) -> void:
	if _harvest_modal == null:
		_harvest_modal = HarvestModalScript.new()
		add_child(_harvest_modal)
		_harvest_modal.setup(game)
		_harvest_modal.connect("closed", Callable(self, "_on_harvest_closed"))
	if not _harvest_modal.is_connected("return_to_town", Callable(self, "_on_season_return")):
		_harvest_modal.connect("return_to_town", Callable(self, "_on_season_return"))
	_harvest_modal.open_for_run_end(summary)

## The harvest modal was dismissed. Two cases:
##   • RUN-END dismiss (BUG I1): a bounded run reached its budget and the run-end modal was
##     dismissed by ANY means — the "Return to Town" CTA (which already ran close_season via
##     return_to_town → _on_season_return, so the run is cleared by the time we get here) OR a
##     scrim-tap / ESC (which only fires `closed`, NOT return_to_town). If the run is STILL in its
##     ended-but-unclosed state (farm_run_active && farm_run_turns_left == 0), the dismiss was a
##     bypass: complete the return ourselves via _on_season_return so close_season runs exactly
##     once (the +25 grant + bond decay + quest reroll + run clear). close_season is idempotent, so
##     the CTA path — where it already ran — does NOT double-grant (this branch is skipped because
##     farm_run_active is already false). Either way the modal is hidden below.
##   • LEGACY informational harvest (no run) or an already-closed run: nothing to persist
##     (note_farm_turn already wrapped + saved the cycle), so this is purely a hide.
func _on_harvest_closed() -> void:
	if _harvest_modal != null:
		_harvest_modal.visible = false
	if game != null and game.farm_run_active and game.farm_run_turns_left == 0:
		# A run-end dismiss bypassed the return CTA → complete the return so close_season runs.
		_on_season_return()

# ── Start Farming (Task C): open the picker, start the run, end the run ───────────

## Open the "Start Farming" picker/confirm modal, lazily creating + wiring it on first use
## (mirrors _open_leaveboard). The modal emits start_requested(selected, use_fertilizer) on Start
## (→ _on_start_farming, which calls GameState.start_farm_run) and `closed` on Cancel/dismiss
## (→ _on_startfarming_closed). Opened from the town-map farm-pad tap + apply_deeplink.
func _open_startfarming() -> void:
	if _startfarming_modal == null:
		_startfarming_modal = StartFarmingModalScript.new()
		add_child(_startfarming_modal)
		_startfarming_modal.setup(game)
		_startfarming_modal.connect("start_requested", Callable(self, "_on_start_farming"))
		_startfarming_modal.connect("closed", Callable(self, "_on_startfarming_closed"))
	_startfarming_modal.open()
	_router.open_modal(ViewRouter.Modal.STARTFARMING)

## The picker was dismissed (Cancel / backdrop / ESC). Hide it + reset the router. No special-case:
## a Start press routes through _on_start_farming (which navigates), then the modal's own close()
## also fires `closed` → here; resetting the router to NONE is harmless because _on_start_farming
## already re-routed to the board via apply_deeplink("board").
func _on_startfarming_closed() -> void:
	if _startfarming_modal != null:
		_startfarming_modal.visible = false
	if _router.current_modal() == ViewRouter.Modal.STARTFARMING:
		_router.close_modal()

## The player confirmed Start on the picker. Start the bounded run (GameState.start_farm_run); on
## a guard failure surface a toast and bail (no mutation happened). On success the run is live, so
## drop the player onto a FRESH bounded board: close the town overlays + clear nav via the board
## deep-link (which now lands on the board — and flips it active — precisely BECAUSE farm_run_active
## is true), re-pool + regenerate the board from the run's selection-biased pool, re-seed the
## season + boss bar, refresh the run-aware HUD, and save.
func _on_start_farming(selected: Array, use_fertilizer: bool) -> void:
	var res: Dictionary = game.start_farm_run(selected, use_fertilizer)
	if not bool(res.get("ok", false)):
		show_toast(_start_farm_fail_text(String(res.get("reason", ""))))
		return
	# Run is now active → hide town overlays + clear nav (the board gate in apply_deeplink lets the
	# board through because farm_run_active is true now, AND flips the board active). This also
	# closes the picker overlay.
	apply_deeplink("board")
	board.set_tile_pool(game.active_tile_pool())
	board.setup_new_board()
	board.set_season(game.current_season_index())
	board.set_min_chain(game.boss_min_chain())
	_refresh_season_bar()
	_refresh_totals()
	_refresh_meta()
	_refresh_chain_progress()
	SaveManager.save(game)

## Map a start_farm_run failure reason to a player-facing toast string.
func _start_farm_fail_text(reason: String) -> String:
	match reason:
		"no_coins":
			return "Not enough coin to start."
		"no_fertilizer":
			return "No fertilizer on hand."
		"already_running":
			return "A farm run is already underway."
		_:
			return "Cannot start a run right now."

## Task C — the bounded run ENDED (the run-end HarvestModal's "Return to Town" CTA fired). Close
## the season in GameState (grants the +25 return bonus, decays bonds, rerolls quests, clears the
## run + resets a fresh Spring on the farm board), make the board INERT again (town is home), re-
## pool + regenerate the board, re-seed the season, refresh every run-aware surface, save, then
## reopen the town. A confirming toast reports the return bonus.
func _on_season_return() -> void:
	var summary: Dictionary = game.close_season()
	board.set_active(false)
	board.set_tile_pool(game.active_tile_pool())
	# T30 — board-preserve: when close_season reports preserve_board (a Silo/Barn
	# board_preserve_biomes channel covering the run's biome), KEEP the existing board grid across
	# the season boundary instead of regenerating it (React savedField restore). Only regenerate
	# when the run's biome is NOT preserved. preserve_board is false for a fresh game (no such
	# building), so the default path is unchanged (setup_new_board, byte-identical to before).
	if not bool(summary.get("preserve_board", false)):
		board.setup_new_board()
	board.set_season(game.current_season_index())
	# MINOR M1 — reset the board's min-chain bar to the current (no-boss) baseline so a raised boss
	# chain requirement can never persist onto the fresh town board after the run closes.
	board.set_min_chain(game.boss_min_chain())
	_refresh_totals()
	_refresh_meta()
	_refresh_orders()
	_refresh_season_bar()
	_refresh_chain_progress()
	SaveManager.save(game)
	_open_townmap()
	show_toast("Harvest complete — +%d 🪙 return bonus." % int(summary.get("coins_granted", 0)))

# ── Developer DEBUG overlay (M-infra) ────────────────────────────────────────────

## Open the developer DEBUG modal, lazily creating + wiring it on first use (mirrors
## _open_menu). The modal gets a back-reference to `self` so its jump grid can route through
## apply_deeplink and its quick-grants can refresh the HUD pills after a mutation. open()
## re-reads the live GameState into the readout each time. NO permanent HUD button wires this
## — it's deep-link-only (apply_deeplink("debug")), matching the hidden React debug modal.
func _open_debug() -> void:
	if _debug_modal == null:
		_debug_modal = DebugModalScript.new()
		add_child(_debug_modal)
		_debug_modal.setup(game, self)
		_debug_modal.connect("closed", Callable(self, "_on_debug_closed"))
	_debug_modal.open()
	_router.open_modal(ViewRouter.Modal.DEBUG)

## The DEBUG modal was closed: hide it, reset the router, and persist — a quick-grant may have
## mutated coins/runes/influence/tier (or rolled quests), so save so the change survives a reload.
func _on_debug_closed() -> void:
	if _debug_modal != null:
		_debug_modal.visible = false
	_router.close_modal()
	if game != null:
		SaveManager.save(game)

## The world map requested travel to a NODE (only ENABLED Travel/Enter buttons emit this).
## Main owns GameState mutation: run game.travel_to(node_id) — the single travel entry that pays
## the entry cost, marks the node visited, discovers neighbours, and (for a BOARD node) launches
## the matching board the REAL way (enter_mine / enter_harbor / farm-active). On a BOARD entry we
## then run the SAME biome-change refresh path the TownScreen expedition uses (_on_town_changed)
## so we never duplicate the board-pool swap / hazard-flag / pearl-placement logic. NON-board
## nodes (event / festival / boss / capital) move the marker, then Main acts on the node KIND:
##   • boss     → the boss challenge (the real _enter_boss_fight path) when eligible, else a hint.
##   • festival → a flavour toast (the festival mini-economy is deferred; honest, not faked).
##   • event    → a Crossroads flavour toast (the React event bubble's analogue).
##   • capital  → unreachable here (travel_to blocks it on the missing Hearth-Token currency).
## A blocked travel (guards trip) leaves everything unmutated; the map simply closed.
func _on_cartography_travel(node_id: String) -> void:
	var res: Dictionary = game.travel_to(node_id)
	if not bool(res.get("ok", false)):
		# Blocked — re-render the (still-open) map so the unchanged state shows, and surface why.
		if _cartography_screen != null and _cartography_screen.visible:
			_cartography_screen.refresh()
		var reason := String(res.get("reason", ""))
		if reason == "needs_tokens":
			show_toast("The Old Capital waits on the three Hearth-Tokens.")
		elif reason == "cost":
			show_toast("Not enough coins for that journey.")
		elif reason == "level":
			show_toast("That place is too dangerous yet — keep growing.")
		elif reason == "unreachable":
			show_toast("No road leads there from here.")
		SaveManager.save(game)
		return

	# Travel succeeded — the marker moved (+ entry cost paid + discoveries). Close the map so the
	# board / boss / toast surfaces over it.
	_on_cartography_closed()
	var kind := String(res.get("kind", ""))

	if String(res.get("board_kind", "")) != "":
		# A BOARD node (farm / mine / fish). Reuse Main's biome-change path to re-pool + regenerate
		# the board onto the new biome, set the hazard/pearl flags, refresh every HUD surface, save.
		_on_town_changed()
		var node_name := String(CartographyConfig.by_id(node_id).get("name", node_id))
		if bool(res.get("entered", false)):
			match String(res.get("board_kind", "")):
				"mine":
					show_toast("Set out to %s — %d turns of supplies." % [node_name, int(res.get("launch", {}).get("turns", 0))])
				"fish":
					show_toast("Sailed out to %s — %d turns of supplies." % [node_name, int(res.get("launch", {}).get("turns", 0))])
				_:
					show_toast("Travelled to %s." % node_name)
		else:
			# The marker moved but the expedition couldn't launch (its own guard tripped — usually
			# no supplies or not on the farm). Surface the launch reason honestly.
			var lreason := String(res.get("launch", {}).get("reason", ""))
			var hint := "Need supplies to set out." if lreason == "no_supplies" else (
				"Defeat the boss to unlock expeditions." if lreason == "locked" else
				"Return to the farm before setting out.")
			show_toast("Arrived at %s — %s" % [node_name, hint])
		SaveManager.save(game)
		return

	# A NON-board node — act on the kind.
	match kind:
		"boss":
			# The Pit → the real boss challenge when eligible; else a hint (nothing faked).
			if game.can_challenge_boss():
				var bres: Dictionary = _enter_boss_fight()
				if bool(bres.get("ok", false)):
					show_toast("⚔ %s rises in the Pit!" % String(bres.get("name", "A boss")))
				else:
					show_toast("The Pit is quiet for now.")
			else:
				show_toast("You aren't ready to face the Pit yet.")
		"festival":
			show_toast("🎪 The Drifter's Fair rolls through — come back when the wagons settle.")
		"event":
			show_toast("🎲 You meet a stranger at the Crossroads…")
		"capital":
			# T22 FINALE — reaching the Old Capital is "The Long Return"'s end. travel_block_reason
			# only let us here once all three Hearth-Tokens are held, so this fires exactly once the
			# kingdom is whole. The narrative finale is a celebratory toast (the React Old-Capital
			# finale is itself a TBD stub); the unlock + arrival is the real, earned milestone.
			show_toast("🏛 The Old Capital opens. Three Hearth-Tokens carried home — the Long Return is complete.")
		_:
			pass
	_refresh_meta()
	SaveManager.save(game)

# ── T22 founder flow ──────────────────────────────────────────────────────────

## The CartographyScreen's "Found Settlement" button was pressed for a discovered, unfounded
## settlement node. Open the founder biome picker over the map; the picker calls the real
## game.found_settlement on a choice and emits `founded` back to _on_founded.
func _on_cartography_found(node_id: String) -> void:
	_open_founder(node_id)

## Open the founder picker for `zone_id`, lazily creating + wiring it on first use.
func _open_founder(zone_id: String) -> void:
	if _founder_modal == null:
		_founder_modal = FounderModalScript.new()
		add_child(_founder_modal)
		_founder_modal.setup(game)
		_founder_modal.connect("founded", Callable(self, "_on_founded"))
		_founder_modal.connect("closed", Callable(self, "_on_founder_closed"))
	_founder_modal.open_for(zone_id)

## A settlement was founded (the picker called game.found_settlement → coins paid, the founding
## recorded, the zone archive seeded, any earned Hearth-Token folded). Persist, re-render the still-
## open world map so the node now reads "✓ Founded", and surface a toast.
func _on_founded(zone: String, biome: String) -> void:
	if _founder_modal != null:
		_founder_modal.visible = false
	var node_name: String = String(CartographyConfig.by_id(zone).get("name", zone))
	var biome_def: Dictionary = CartographyConfig.biome_def(CartographyConfig.settlement_type_for_zone(zone), biome)
	var biome_name: String = String(biome_def.get("name", biome))
	show_toast("Founded %s — a %s settlement. Travel there to build it up." % [node_name, biome_name])
	if _cartography_screen != null and _cartography_screen.visible:
		_cartography_screen.refresh()
	_refresh_meta()
	SaveManager.save(game)

func _on_founder_closed() -> void:
	if _founder_modal != null:
		_founder_modal.visible = false

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
	# The story queue is now drained — if a daily-streak claim was held back behind the story
	# beats this launch, surface its reward modal now (no-op when there was no claim).
	_maybe_show_daily()

## The beat modal was force-closed (defensive — the modal has no explicit close button in
## normal flow, advancing handles dismissal). Mirror the advanced drain-complete path.
func _on_story_closed() -> void:
	if _story_modal != null:
		_story_modal.visible = false

## M5b — resolve a deep-link id and navigate to the matching screen.
## Routes to the existing _open_* / close methods so all lazy-create and
## visibility logic remains in one place. Returns true if the id was known.
func apply_deeplink(id: String) -> bool:
	# M5-polish — "toast" is NOT a routed modal; it's a transient bubble. Handle it here
	# (before the ViewRouter resolve) so the deep-link can PREVIEW a sample toast for QA /
	# the sanity-capture without polluting the nav state machine.
	if id == "toast":
		show_toast("Order filled! +18 🪙")
		return true
	var intent: Dictionary = ViewRouter.resolve(id)
	if not bool(intent.get("ok", false)):
		return false
	# T28 — the 5 PRIMARY views must route through _switch_primary_view so opening one
	# via deep-link / browser back-forward hides any other open primary (esp. the town
	# map, a higher canvas layer that would otherwise paint over the opened view). The
	# in-game nav tabs already do this (_on_nav_selected); apply_deeplink must match.
	match int(intent.get("modal", ViewRouter.Modal.NONE)):
		ViewRouter.Modal.TOWN:
			# review-3 — the Town LEDGER is a menu-routed view now (not a bottom-nav primary), but
			# it shares a layer with the primaries, so still route it through _switch_primary_view
			# so opening it hides any open primary (and vice-versa) — no double-painting.
			_switch_primary_view("_open_town")
		ViewRouter.Modal.MENU:
			_open_menu()
		ViewRouter.Modal.INVENTORY:
			_switch_primary_view("_open_inventory")
		ViewRouter.Modal.TOWNMAP:
			_switch_primary_view("_open_townmap")
		ViewRouter.Modal.ACHIEVEMENTS:
			_open_achievements()
		ViewRouter.Modal.TILES:
			_open_tiles()
		ViewRouter.Modal.CHRONICLE:
			_open_chronicle()
		ViewRouter.Modal.TOWNSFOLK:
			_switch_primary_view("_open_townsfolk")
		ViewRouter.Modal.CARTOGRAPHY:
			_switch_primary_view("_open_cartography")
		ViewRouter.Modal.RECIPES:
			# review-3 — the crafting screen is the 🔨 Craft PRIMARY view now, so route it through
			# _switch_primary_view (hides any other open primary, sets the craft nav marker).
			_switch_primary_view("_open_recipes")
		ViewRouter.Modal.TUTORIAL:
			_open_tutorial()
		ViewRouter.Modal.CASTLE:
			_open_castle()
		ViewRouter.Modal.DECORATIONS:
			_open_decorations()
		ViewRouter.Modal.PORTAL:
			_open_portal()
		ViewRouter.Modal.BOONS:
			_open_boons()
		ViewRouter.Modal.KEEPER:
			# QA / preview path: open the FARM keeper encounter on demand (the normal path is the
			# auto-trigger in _on_town_changed). Opens for "farm" — the one reachable settlement.
			_open_keeper("farm")
		ViewRouter.Modal.CHARTER:
			_open_charter()
		ViewRouter.Modal.QUESTS:
			_open_quests()
		ViewRouter.Modal.DAILY:
			# On-demand (QA/testing): show the CURRENT streak day's reward WITHOUT re-granting
			# (the grant only happens in login_tick on launch). A never-claimed streak (day 0)
			# previews day 1's reward so the card is never blank.
			var preview_day: int = game.daily_streak_day if game.daily_streak_day > 0 else 1
			_open_daily(preview_day, DailyRewardConfig.reward_for_day(preview_day))
		ViewRouter.Modal.LEAVEBOARD:
			# Lazily create + wire the confirm card, then present it. When actually on an
			# expedition, arm() shows the real biome-specific prompt; on the farm we PREVIEW
			# (the mine prompt) so QA / the sanity-capture can see the card from any state.
			if _leaveboard_modal == null:
				_leaveboard_modal = LeaveBoardModalScript.new()
				add_child(_leaveboard_modal)
				_leaveboard_modal.setup(game)
				_leaveboard_modal.connect("confirmed", Callable(self, "_on_leaveboard_confirmed"))
				_leaveboard_modal.connect("closed", Callable(self, "_on_leaveboard_closed"))
			if not _leaveboard_modal.arm():
				_leaveboard_modal.preview("mine")
			_router.open_modal(ViewRouter.Modal.LEAVEBOARD)
		ViewRouter.Modal.DEBUG:
			_open_debug()
		ViewRouter.Modal.STARTFARMING:
			_open_startfarming()
		_:
			# NONE / board — close whatever is open. We're returning to the board, so
			# clear the bottom-nav active-tab marker (several screens below are hidden
			# inline here without routing through their _on_*_closed handler).
			# Task C / BUG C1 — board PLAYABILITY GATE: the board is reachable while a
			# bounded farm run is live, OR on a non-farm expedition (mine/harbor), OR
			# during a boss fight (town is home only when none of those are true).
			# _on_start_farming calls apply_deeplink("board") only AFTER start_farm_run
			# set farm_run_active = true, so that path correctly falls through below.
			if game != null and not _board_should_be_active():
				board.set_active(false)
				_open_townmap()
				return true
			# The board IS playable → keep the existing hide-all-overlays behaviour and
			# set the gate consistently via the helper (covers all three live cases).
			board.set_active(_board_should_be_active())
			_hud._clear_nav()
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
			elif _boons_screen != null and _boons_screen.visible:
				# Route through the close handler so a claim is persisted + the stockpile
				# HUD refreshed (it also hides + resets the router).
				_on_boons_closed()
			elif _keeper_modal != null and _keeper_modal.visible:
				# A keeper encounter open on top of the board: hide it (resets the router).
				_keeper_modal.visible = false
				_router.close_modal()
			elif _charter_screen != null and _charter_screen.visible:
				# Charter is read-only — the close handler just hides + resets the router
				# (no save needed, nothing changed).
				_on_charter_closed()
			elif _quests_screen != null and _quests_screen.visible:
				# Route through the close handler so a claim is persisted + the stockpile
				# HUD refreshed (it also hides + resets the router).
				_on_quests_closed()
			elif _daily_modal != null and _daily_modal.visible:
				# Daily modal is display-only — the close handler just hides + resets the
				# router (no save needed; the grant was already persisted in _ready).
				_on_daily_closed()
			elif _leaveboard_modal != null and _leaveboard_modal.visible:
				# Leave-confirm card: route through close (Cancel semantics — nothing leaves;
				# it hides + resets the router). Confirm has its own button on the card.
				_on_leaveboard_closed()
			elif _debug_modal != null and _debug_modal.visible:
				# Debug overlay: route through the close handler so any quick-grant mutation
				# is persisted (it also hides + resets the router).
				_on_debug_closed()
	return true

# ── Browser Back/Forward bridge (web export only) ───────────────────────────────

## Web smoke / test hook: returns true when the page was opened with
## `window.__hearthDisableDialogs` set (before boot, via Playwright's addInitScript).
## When set, _ready suppresses the first-launch auto-modals (tutorial / queued story
## beats / daily reward) so the board comes up quiescent and the browser-history nav
## smoke (tests/godot-web/back-forward.spec.ts) is deterministic — otherwise the
## fresh-launch tutorial pushes "#/tutorial" and the launch-normalises-to-board check
## never sees "#/board". Mirrors the Phaser suite's __HEARTH_DISABLE_DIALOGS__ flag.
## Web-only: on desktop/headless JavaScriptBridge is never touched, so this is always
## false and boot behaviour is completely unchanged.
func _dialogs_disabled() -> bool:
	if not OS.has_feature("web"):
		return false
	return bool(JavaScriptBridge.eval("!!window.__hearthDisableDialogs", true))

## Wire the browser History API to the modal nav. Called from _ready ONLY on a web
## build. Registers a popstate listener (Back/Forward → apply_deeplink), then collapses
## the launch entry to the board with replaceState so the FIRST opened screen sits one
## step above the board in history (Back from it lands on the board, not off the page).
## If the page was opened on a deep link (#/inventory), that modal is applied deferred
## so the HUD/board are laid out first. After this runs _process mirrors every nav
## change to the URL via _sync_history.
func _setup_browser_history() -> void:
	if not OS.has_feature("web"):
		return
	# Retain the callback for the listener's lifetime — a local would be GC'd and the
	# popstate handler would silently stop firing.
	_popstate_cb = JavaScriptBridge.create_callback(_on_browser_popstate)
	# NOTE: untyped on purpose — `JavaScriptObject` is only a registered class on web
	# export templates, so a type annotation here would break headless/desktop parsing.
	var window = JavaScriptBridge.get_interface("window")
	if window != null:
		window.addEventListener("popstate", _popstate_cb)
	# Whatever id the page was launched with (deep link or none).
	var initial_id: String = ViewRouter.id_from_hash(str(JavaScriptBridge.eval("window.location.hash", true)))
	# Normalise the launch entry to the board so Back from the first modal is well-defined.
	JavaScriptBridge.eval("history.replaceState({}, '', '#/board');", true)
	_last_synced_modal = ViewRouter.Modal.NONE
	_history_ready = true
	# A deep-linked launch: open that modal once the scene is laid out. _sync_history then
	# pushes it as a fresh entry above the board, so Back closes it cleanly.
	if initial_id != "board":
		_apply_initial_deeplink.call_deferred(initial_id)

## Open the modal a deep-linked web launch (#/<id>) requested, after the first frame so
## the HUD + board exist beneath it. Pure delegation to the shared nav path.
func _apply_initial_deeplink(id: String) -> void:
	apply_deeplink(id)

## The browser fired popstate (Back/Forward, or a manual hash edit). Read the current
## hash, map it to a deep-link id, and route it through the shared nav path. We stamp
## _last_synced_modal so _sync_history doesn't then re-push an entry for a change the
## browser itself just drove. Web-only; never reached on desktop/headless.
func _on_browser_popstate(_args: Array) -> void:
	if not _history_ready:
		return
	var id: String = ViewRouter.id_from_hash(str(JavaScriptBridge.eval("window.location.hash", true)))
	apply_deeplink(id)
	_last_synced_modal = _router.current_modal()

## Per-frame (web only): mirror the live modal nav onto the browser URL/history. Opening
## or switching screens pushes a `#/<id>` entry; closing a screen (→ board) calls
## history.back() so we pop the entry we pushed instead of growing an endless
## open/close chain — Back then behaves like the in-game ✖. When the URL already matches
## (a popstate just drove the change) we do nothing.
func _sync_history() -> void:
	var cur: int = _router.current_modal()
	if cur == _last_synced_modal:
		return
	var prev: int = _last_synced_modal
	_last_synced_modal = cur
	var id: String = ViewRouter.modal_id(cur)
	# Already reflected in the URL (popstate-driven change) — don't double-push.
	if ViewRouter.id_from_hash(str(JavaScriptBridge.eval("window.location.hash", true))) == id:
		return
	if cur == ViewRouter.Modal.NONE and prev != ViewRouter.Modal.NONE:
		# Closed a screen from inside the game → behave like Back so history doesn't grow
		# without bound. This fires popstate (→ board, already applied), a harmless no-op.
		JavaScriptBridge.eval("history.back();", true)
	else:
		JavaScriptBridge.eval("history.pushState({}, '', '#/%s');" % id, true)

func _process(_delta: float) -> void:
	if _history_ready:
		_sync_history()

## M4f — the Sound button emits `sound_toggle_requested`; Main owns the actual flip (the single
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

## M4f — the New Game button emits `new_game_requested`; Main wipes the save and restarts from a
## fresh run. Closing the menu first, then reload_current_scene() re-runs _ready, which
## calls SaveManager.load_state() — now returning a fresh GameState since the save was
## cleared (the cleanest reset: every system re-initialises from scratch).
func _on_new_game() -> void:
	if _menu_screen != null:
		_menu_screen.close()
	SaveManager.clear()
	get_tree().reload_current_scene()

## The board accepts chain input when a bounded farm run is live, OR the player is on a
## non-farm expedition biome (mine/harbor), OR a boss fight is active. Otherwise (idle on the
## farm with no run) the board is the inert TOWN-HOME backdrop.
func _board_should_be_active() -> bool:
	if game == null:
		return false
	return game.farm_run_active or game.active_biome != "farm" or game.is_boss_active()

## A town action mutated `game`: re-pool the board from the ACTIVE biome, refresh
## every HUD label, save. The Town screen's Expedition section can flip the biome
## (enter/leave the mine), so detect a biome change and regenerate the board with
## the new pool (a plain set_tile_pool only takes effect on the next refill — a
## biome swap must replace what's on the board NOW).
func _on_town_changed() -> void:
	var was_mine: bool = _board_pool_is_mine()
	var was_harbor: bool = _board_pool_is_harbor()
	# T24 — while a boss is active the board uses the boss refill pool (respawn_boost weighting); a
	# plain biome re-pool here would drop that bias. Pick the boss pool when fighting, else the biome pool.
	board.set_tile_pool(_boss_refill_pool() if game.is_boss_active() else game.active_biome_pool())
	if game.is_in_mine() != was_mine:
		board.setup_new_board()
		# T23: on ENTRY to the mine, seed the session's single Mysterious Ore onto the freshly-built
		# board so the rune target is visible (mirrors the harbor pearl seed on entry). enter_mine
		# cleared any prior ore; spawn_mysterious_ore_on_fill is a no-op if one is somehow already live.
		if game.is_in_mine():
			var sp := game.spawn_mysterious_ore_on_fill(board.grid, board.rng)
			if bool(sp.get("ok", false)):
				board.grid = sp["grid"]
				board._build_tiles()
	# M3j: entering/leaving the harbor via the Town screen flips the biome — regenerate the
	# board so fish tiles show NOW (mirrors the mine flip above). On ENTRY, place the live
	# pearl onto the freshly-built board at its seeded cell so the rune target is visible.
	if game.is_in_harbor() != was_harbor:
		board.setup_new_board()
		if game.is_in_harbor() and game.has_active_pearl():
			board.place_pearl(Vector2i(int(game.fish_pearl.get("col", 0)), int(game.fish_pearl.get("row", 0))))
	# T24: keep the board's chain bar + the boss modifier overlay in sync with the boss state on
	# every town action (the bar drops back to base + the overlay clears when no fight is live).
	board.set_min_chain(game.boss_min_chain())
	board.set_boss_modifier_state(game.boss_modifier_state if game.is_boss_active() else {})
	# M3h: a Master Ratcatcher purchase (or demolish) flips whether grass chains sweep
	# adjacent rats, so refresh the board flag whenever a town action lands.
	board.clear_rats_on_grass = game.has_master_ratcatcher()
	# T7/T8/T9: a town action that re-pooled/regenerated the board (mine/harbor flip) wiped the
	# positional hazard tiles + wolf overlays. Re-stamp the farm hazards onto the (farm) board, or
	# clear the wolf markers when off the farm. Keeps the hazards consistent across town visits.
	_restore_farm_hazards_onto_board()
	# M3i: entering/leaving the mine via the Town screen flips whether STONE chains mine
	# through rubble, so refresh that flag on every town action too.
	board.clear_rubble_on_stone = game.is_in_mine()
	# T11: entering/leaving the mine flips whether hazard-blocked cells (RUBBLE/LAVA) are unchainable
	# — refresh that flag on every town action too. Off the mine it's simply false. Then re-stamp any
	# live mine hazards + Mysterious Ore onto the (mine) board / clear the mole overlay off the mine.
	board.block_mine_hazards = game.is_in_mine()
	_restore_mine_hazards_onto_board()
	# M3j: entering/leaving the harbor flips whether a fish chain next to the pearl captures
	# it — refresh that flag on every town action too (off the harbor it is simply false).
	board.clear_pearl_on_fish_chain = game.is_in_harbor()
	# BUG C1 — the chain-input GATE follows the biome/run/boss state on EVERY town action. This is
	# the single funnel for all playable-board transitions (mine/harbor entry via TownScreen or
	# cartography, boss start, leave-expedition return): entering the mine/harbor or starting a boss
	# makes the board LIVE, and returning to the farm with no run makes it INERT again. Set AFTER
	# the board has been re-pooled/regenerated above so the live board is the correct biome.
	board.set_active(_board_should_be_active())
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
	# T31 — a town action may have built the settlement up past its keeper's threshold (a
	# `build`); fire the keeper encounter now if it's ready + unresolved. No-op when not ready,
	# already resolved, or a keeper/story modal is already showing.
	_maybe_trigger_keeper()

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
	# A3 — track the LIVE drag (length + the chained tile type) so the chain-progress bar can
	# colour its fill/accent by the chain's STAGE (Constants.chain_stage_index) and surface the
	# stage banner ("BONUS!"/"DOUBLE!"/…) while dragging. A length of 0 ends the drag → clear
	# back to no-chain so the bar reverts to its calm fractional-progress tint. Pushed into the
	# HUD (which owns the chain-progress widgets) via set_live_chain.
	if length <= 0:
		_hud.set_live_chain(0, Constants.EMPTY)
	else:
		_hud.set_live_chain(length, board.current_chain_tile() if board != null else Constants.EMPTY)
	_refresh_chain_progress()

## A1b — the upgrade-tile provider the Board calls inside _resolve (board.upgrade_provider). Given
## the chained tile type + chain length, answer {count, tile}: how many next-tier UPGRADE tiles to
## spawn and which tile, from GameState.upgrade_spawn against the home zone. Gated on the FARM biome
## — mine/harbor have no zone upgradeMap, so we return the empty {0, EMPTY} there and the Board
## refills from the pool unchanged. Mirrors the React core loop (nextUpgradeTile + upgradeCountForChain):
## chaining birds → PIG, grass/trees → PHEASANT, etc.; fruit → GOLD spawns no tile (coins only).
func _farm_upgrade_spawn(tile_type: int, length: int) -> Dictionary:
	if game.active_biome != "farm":
		return {"count": 0, "tile": Constants.EMPTY}
	# T2: spawn the player's ACTIVE VARIANT of the upgrade target category (default == base
	# tile, so an un-customised board is unchanged). Instance helper honours tile_active_by_category.
	return game.upgrade_spawn_active(ZoneConfig.HOME_ZONE, tile_type, length)

## T7/T9/T10 — stash the resolving chain's cells (Board emits this BEFORE chain_resolved). Used by
## _on_chain_resolved for the farm-hazard interactions (rat clear / fire extinguish / deadly cull).
func _on_chain_cells(cells: Array) -> void:
	_chain_cells = cells

## T7/T8/T9 — stamp the loaded farm hazards onto the live board: place RAT / FIRE tiles at their
## recorded cells (overwriting whatever the fresh board built there) and rebuild the wolf-marker
## overlays. Called on load (after the board is built) so a save restored mid-run shows its
## hazards immediately. No-op off the farm / when no hazards are active.
func _restore_farm_hazards_onto_board() -> void:
	if board == null or game == null:
		return
	if game.active_biome != "farm":
		board.refresh_wolves([])
		return
	var changed := false
	for rc in game.active_rats():
		var rr: int = int(rc.get("row", -1)); var rcl: int = int(rc.get("col", -1))
		if rr >= 0 and rr < Constants.ROWS and rcl >= 0 and rcl < Constants.COLS:
			board.grid[rr][rcl] = Constants.Tile.RAT
			changed = true
	for fc in game.active_fire_cells():
		var fr: int = int(fc.get("row", -1)); var fcl: int = int(fc.get("col", -1))
		if fr >= 0 and fr < Constants.ROWS and fcl >= 0 and fcl < Constants.COLS:
			board.grid[fr][fcl] = Constants.Tile.FIRE
			changed = true
	if changed:
		board._build_tiles()
	board.refresh_wolves(game.active_wolves())

## T11/T23 — stamp the loaded MINE hazards + live Mysterious Ore onto the live board: place the
## cave-in row (RUBBLE) / gas vent (GAS) / lava cells (LAVA) / mysterious ore (MYSTERIOUS_ORE) at
## their recorded cells (overwriting whatever the fresh board built there) and rebuild the mole
## overlay. Called on load (after the board is built) so a save restored mid-expedition shows its
## mine hazards immediately. No-op off the mine / when nothing is active. Mirrors
## _restore_farm_hazards_onto_board.
func _restore_mine_hazards_onto_board() -> void:
	if board == null or game == null:
		return
	if not game.is_in_mine():
		board.refresh_mole({})
		return
	var changed := false
	var cave: Dictionary = game.active_cave_in()
	if not cave.is_empty():
		var cr: int = int(cave.get("row", -1))
		if cr >= 0 and cr < Constants.ROWS:
			for c in Constants.COLS:
				board.grid[cr][c] = Constants.Tile.RUBBLE
			changed = true
	var gas: Dictionary = game.active_gas_vent()
	if not gas.is_empty():
		var gr: int = int(gas.get("row", -1)); var gc: int = int(gas.get("col", -1))
		if gr >= 0 and gr < Constants.ROWS and gc >= 0 and gc < Constants.COLS:
			board.grid[gr][gc] = Constants.Tile.GAS
			changed = true
	for lc in game.active_lava_cells():
		var lr: int = int(lc.get("row", -1)); var lcl: int = int(lc.get("col", -1))
		if lr >= 0 and lr < Constants.ROWS and lcl >= 0 and lcl < Constants.COLS:
			board.grid[lr][lcl] = Constants.Tile.LAVA
			changed = true
	if game.has_active_mysterious_ore():
		var orr: int = int(game.mysterious_ore.get("row", -1)); var orc: int = int(game.mysterious_ore.get("col", -1))
		if orr >= 0 and orr < Constants.ROWS and orc >= 0 and orc < Constants.COLS:
			board.grid[orr][orc] = Constants.Tile.MYSTERIOUS_ORE
			changed = true
	if changed:
		board._build_tiles()
	board.refresh_mole(game.active_mole())

func _on_chain_resolved(tile_type: int, length: int) -> void:
	# T9 — a RAT chain is a HAZARD CLEAR, not a normal harvest: chaining 3+ rats removes them for
	# +5 coins each and spends NO turn / credits NO resource (mirrors src/state.ts:286-293's early
	# return). The Board already cleared + refilled the chained cells; here we just book the coins +
	# remove the rats from hazards, then refresh + save and RETURN (skipping the normal credit /
	# farm-turn / season / boss path below). A chain < 3 rats can't reach here (min_chain rejects it).
	if tile_type == Constants.Tile.RAT:
		var rc := game.clear_rat_chain(_chain_cells)
		_chain_cells = []
		if bool(rc.get("ok", false)):
			_status_label.text = "Pest cleared! +%d 🪙" % int(rc.get("coins_delta", 0))
			if _audio != null:
				_audio.play("pop")
			# Wolves are overlays; rats/fire are grid tiles already gone — just refresh the wolf
			# markers from the (unchanged) wolf set so they survive the board rebuild.
			board.refresh_wolves(game.active_wolves())
		_refresh_totals()
		_refresh_meta()
		_refresh_rats()
		_refresh_chain_progress()
		SaveManager.save(game)
		return
	# T7 — a FIRE chain EXTINGUISHES the fire for +2 coins/tile. Fire produces nothing, so the
	# normal credit_chain below yields 0 resources; we add the extinguish coins on top and let the
	# chain otherwise resolve as a (resource-less) farm move (a turn IS spent — fire extinguishing
	# is a real move, matching React's normal-resolution-plus-patch model).
	if tile_type == Constants.Tile.FIRE:
		var ex := game.extinguish_fire_chain(_chain_cells)
		if bool(ex.get("ok", false)):
			_status_label.text = "Fire out! +%d 🪙" % int(ex.get("coins_delta", 0))
			if _audio != null:
				_audio.play("pop")
	# T10 — deadly_pests cull: a NORMAL chain that contains a Cypress/Beet/Phoenix tile
	# exterminates every rat adjacent to the chain (+5 coins/rat). Captured here, BEFORE the normal
	# credit, so the chain still resolves as its own harvest (mirrors src/state.ts:297). The Board
	# already blanked the chained cells; the culled rats are removed from hazards + their cells will
	# be re-synced when the hazard tick / refresh runs. We blank the culled rat cells on the board.
	var deadly := game.deadly_pests_kill(_chain_cells)
	if int(deadly.get("killed", 0)) > 0:
		board.clear_hazard_cells(deadly.get("killed_cells", []), game.active_rats(), game.active_fire_cells(), game.active_wolves())
		_status_label.text = "Pest culled! +%d 🪙" % int(deadly.get("coins_delta", 0))
	# T11/T23 — MINE-hazard chain interactions (captured BEFORE the normal credit + the mine-turn
	# tick below, mirroring the farm-hazard block). Three counters, all keyed off the snapshotted
	# chained cells (their tile value read before the chain cleared them):
	#   - STONE chain ADJACENT to the buried cave-in row → clear the cave-in (mine through it). The
	#     chain still resolves as a normal STONE harvest (credited below); clearing the rubble row is
	#     the side effect. The Board's clear_rubble_on_stone already swept the row's RUBBLE 8-adjacent
	#     to the chain; this clears the cave_in STATE so it stops re-stamping.
	#   - GAS chain (the chain ran through the gas cell) → disperse the vent (no turn cost). GAS
	#     produces nothing, so credit_chain below yields 0 — the chain is otherwise a normal move.
	#   - MYSTERIOUS_ORE chain with >= 2 DIRT → capture for +1 Rune. The ore produces nothing, so
	#     credit_chain yields 0; the rune is the reward. Checked here (before the ore-tick in the
	#     mine-turn block) so a final-turn capture still lands.
	if game.is_in_mine():
		if tile_type == Constants.Tile.STONE:
			var cv := game.clear_cave_in_chain(_chain_cells)
			if bool(cv.get("ok", false)):
				_status_label.text = "Cave-in cleared! Tunnel reopened."
				if _audio != null:
					_audio.play("pop")
		elif tile_type == Constants.Tile.GAS:
			var dg := game.disperse_gas_chain(_chain_cells)
			if bool(dg.get("ok", false)):
				_status_label.text = "Gas dispersed — safe to mine."
				if _audio != null:
					_audio.play("pop")
		elif tile_type == Constants.Tile.MYSTERIOUS_ORE:
			var cap := game.try_capture_mysterious_ore(_chain_cells)
			if bool(cap.get("captured", false)):
				_status_label.text = "Mysterious Ore captured! +1 rune"
				if _audio != null:
					_audio.play("upgrade")
	# T24 (boss hide_resources): a chain that INCLUDES a hidden boss cell REVEALS it (React: a
	# hidden tile reveals when chained). Reveal BEFORE clearing _chain_cells so the modifier_state's
	# hidden list is updated; the board overlay is refreshed in the boss block below. A no-op off a
	# hide_resources boss (no hidden cells to match).
	if game.is_boss_active():
		game.reveal_boss_hidden(_chain_cells)
	_chain_cells = []
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
		var res_key: String = String(res["resource"])
		_hud.spawn_reward_chip("+%d %s" % [int(res["units"]), UiKit.pretty_name(res_key)], Palette.GOLD, res_key)
	else:
		_hud.spawn_reward_chip("+%d 🪙" % int(res.get("coins_gain", 0)), Palette.EMBER)
	# A floating "+N <resource> ★×k" gain label rises off the chain head (React's floatText) —
	# only when a whole unit landed; coins-only chains rely on the flying coin chip above. The
	# ★×k suffix shows how many upgrade tiles this farm chain spawned, so a long chain reads as
	# a clear bonus right where it happened.
	if int(res.get("units", 0)) > 0 and board != null:
		var ftext: String = "+%d %s" % [int(res["units"]), UiKit.pretty_name(String(res["resource"]))]
		if game.active_biome == "farm":
			var up: Dictionary = _farm_upgrade_spawn(tile_type, length)
			if int(up.get("count", 0)) > 0:
				ftext += "  ★×%d" % int(up["count"])
		board.play_gain_text(ftext, Palette.GOLD)
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
		# T11/T23 — after spending the mine turn (and only if the expedition is still live), tick +
		# spawn the MINE HAZARDS for this turn (gas counts down / lava spreads / mole consumes+hops;
		# the ore countdown ticks; a NEW hazard or ore may spawn). Mirrors the farm-hazard after-chain
		# tick. A GAS-VENT EXPIRY costs an EXTRA mine turn (React _tickGasVent), spent via a second
		# note_mine_turn — which can itself end the run. The ticked grid (eaten/spread/degraded cells)
		# is landed via apply_mine_hazard_state, which collapses/refills + re-stamps the pinned cave-in
		# row / lava / gas cells + the mole overlay. Skipped on the turn that EXITED the expedition.
		if not bool(turn_res.get("exited", false)):
			var mtick := game.tick_mine_hazards(board.grid, board.rng)
			if bool(mtick.get("gas_cost_turn", false)):
				turn_res = game.note_mine_turn()   # gas expiry costs an extra turn (may end the run)
			if game.is_in_mine() and bool(mtick.get("changed", false)):
				board.apply_mine_hazard_state(
					mtick["grid"], game.active_cave_in(), game.active_gas_vent(),
					game.active_lava_cells(), game.active_mole())
			elif game.is_in_mine():
				board.refresh_mole(game.active_mole())
			if String(mtick.get("floater", "")) != "":
				_status_label.text = String(mtick.get("floater", ""))
		if bool(turn_res.get("exited", false)):
			_status_label.text = "Expedition over — supplies spent. Back to the farm."
			board.set_tile_pool(game.active_biome_pool())
			board.setup_new_board()
			# M3i: the expedition ended — back on the farm, so mining-through-rubble is
			# off (there's no rubble on the farm board anyway; keep the flag honest).
			board.clear_rubble_on_stone = game.is_in_mine()
			# T11: off the mine - drop the hazard-block flag + clear the mole overlay so a stale
			# mine hazard can never linger on the farm board (note_mine_turn's exit cleared the
			# STATE; this clears the VIEW).
			board.block_mine_hazards = game.is_in_mine()
			board.refresh_mole({})
			# BUG C1 Hole B — lower the board gate now that we're back on an idle farm.
			# _board_should_be_active() returns false (no run, farm biome, no boss)
			# → the board becomes the inert town-home backdrop as expected.
			board.set_active(_board_should_be_active())
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
			# BUG C1 Hole B — lower the board gate now that we're back on an idle farm.
			# _board_should_be_active() returns false (no run, farm biome, no boss)
			# → the board becomes the inert town-home backdrop as expected.
			board.set_active(_board_should_be_active())
		else:
			# TIDE FLIP — the surface catch changed with the water; reseed the bottom row.
			if bool(h_res.get("tide_flipped", false)):
				board.mutate_bottom_row(game.current_tide_pool())
			# PEARL EXPIRED uncaptured — revert its on-board tile to plain kelp.
			if bool(h_res.get("pearl_expired", false)) and pearl_cell.x >= 0:
				board.degrade_pearl(pearl_cell)
			_status_label.text = "%s  ·  🌊 %d harbor turn(s) left · %s tide" % [
				_status_label.text, int(h_res.get("turns_left", 0)), game.fish_tide]
	# A1: a chain resolved ON THE FARM spends one farm turn, advancing the SEASON cycle
	# (parallel to the mine/harbor ticks above; note_farm_turn no-ops the biome — the farm is
	# the persistent home board). The season-weighted refill pool changes as the season turns,
	# so re-push the (now possibly different) farm pool onto the board so the NEXT refill draws
	# the current season's weights. On a HARVEST boundary (cycle wrapped back to Spring) surface
	# a brief status note — the rich harvest-summary modal is a later PR.
	if game.active_biome == "farm" and not game.is_boss_active():
		var farm_res: Dictionary = game.note_farm_turn()
		board.set_tile_pool(game.active_tile_pool())
		# A2 — the season may have turned: re-tint the board field + slide the season-bar wagon.
		board.set_season(game.current_season_index())
		_refresh_season_bar()
		if bool(farm_res.get("ended", false)):
			# Task C — the bounded RUN reached its budget: surface the run-end HarvestModal in
			# "Return to Town" mode. Its CTA emits return_to_town → _on_season_return (close_season
			# + back to town). This REPLACES the legacy informational path for a bounded run (the
			# board is gated, so an always-on harvest wrap below is essentially unreachable now).
			_status_label.text = "Harvest! %s ends — the run is complete." % String(farm_res.get("season", ""))
			if _audio != null:
				_audio.play("fanfare")
			# BUG I1 — make the board INERT the instant the run ends, BEFORE opening the modal,
			# so the player can't keep chaining (and re-popping the modal) no matter HOW the modal
			# is dismissed. The run is still in its ended-but-unclosed state here (farm_run_active
			# is true, farm_run_turns_left == 0); close_season runs only on the return path.
			board.set_active(false)
			_open_harvest_run_end(farm_res)
		elif bool(farm_res.get("harvest", false)):
			# A2 — a full year wrapped on the LEGACY always-on cycle (no bounded run): surface the
			# informational harvest season-summary modal (the fresh Spring cycle has already begun
			# in state). Kept for the no-run wrap; essentially unreachable now the board is gated.
			_status_label.text = "Harvest! %s ends — a new year begins (Spring)." % String(farm_res.get("season", ""))
			if _audio != null:
				_audio.play("fanfare")
			_open_harvest(farm_res)
		# T7/T8/T9 — FARM HAZARDS tick + spawn for this farm turn (rats eat plants, fire spreads,
		# wolves eat birds; then a new fire/wolf/rat may spawn). Mirrors src/state.ts:485-507's
		# after-chain hazard block. We tick against the LIVE board grid; tick_farm_hazards mutates
		# game.hazards and returns the (possibly blanked) grid, which we land via apply_hazard_state
		# (collapse + refill the eaten/burned cells, re-stamp the pinned RAT/FIRE tiles, refresh the
		# wolf overlays). Only runs while the bounded run is live (a free move / ended run skips it
		# — note_farm_turn's free_move path doesn't tick the season either) and not on the
		# inert town board. A no-change tick still refreshes the wolf overlays cheaply.
		if not bool(farm_res.get("free_move", false)) and not bool(farm_res.get("ended", false)):
			var tick := game.tick_farm_hazards(board.grid, board.rng)
			if bool(tick.get("changed", false)):
				board.apply_hazard_state(tick["grid"], game.active_rats(), game.active_fire_cells(), game.active_wolves())
			else:
				board.refresh_wolves(game.active_wolves())
	# T24: a chain landed while a seasonal boss is active. First advance PROGRESS toward the
	# target (note_boss_chain counts chained TILES of a tile-key target, or UNITS PRODUCED of a
	# resource target). If the chain MET the target the boss resolves as a WIN inside note_boss_chain;
	# otherwise we TICK the window (tick_boss_turn — ages/spawns heat, decrements the turn budget, and
	# resolves as a LOSS if the window expired). Either resolution clears the challenge + the board
	# modifier overlay and drops the raised chain bar — all handled in _apply_boss_resolution.
	if game.is_boss_active():
		var boss_res: Dictionary = game.note_boss_chain(tile_type, length, int(res.get("units", 0)))
		# If the chain didn't already resolve the fight, tick one window turn (heat + countdown).
		if bool(boss_res.get("active", false)) and not bool(boss_res.get("defeated", false)) and game.is_boss_active():
			var tick_res: Dictionary = game.tick_boss_turn(board.rng)
			if int(tick_res.get("burned", 0)) > 0:
				_status_label.text = "Ember Drake burns %d resource(s)!" % int(tick_res["burned"])
			# A LOSS resolution leaves is_boss_active() false — fold it in as the result to surface.
			if not game.is_boss_active():
				boss_res = tick_res
		_apply_boss_resolution(boss_res)
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

## T25 — the Board reports a resolved harbor chain that CONTAINS the FISH_PEARL tile.
## `cells` is an Array[{row,col,tile}] (the same shape as chain_cells_resolved). Extract
## the tile keys from the cells and call GameState.try_capture_pearl — the React rule:
## chain contains pearl + >= REQUIRED_FISH_IN_CHAIN other fish tiles → +1 Rune, pearl
## cleared. The pearl cell is already known from its position in the cells array, so we
## degrade its board tile (revert to kelp) on a successful capture. Fires BEFORE
## _on_chain_resolved (Board emits pearl_chain_resolved before chain_resolved) so the
## capture runs before the harbor turn ticks — a final-turn chain can still capture.
## The HUD refresh + save happen in _on_chain_resolved, which runs immediately after.
##
## This REPLACES the old adjacency-based _capture_pearl_if_adjacent path (T25 fix):
## the live board now uses the React in-chain rule via try_capture_pearl, not adjacency.
func _on_pearl_chain(cells: Array) -> void:
	if game == null or board == null:
		return
	# Snapshot the pearl cell from the chain cells before capture clears fish_pearl,
	# so we can degrade its tile on the board.
	var pearl_cell := Vector2i(-1, -1)
	for cc in cells:
		if int(cc.get("tile", Constants.EMPTY)) == Constants.Tile.FISH_PEARL:
			pearl_cell = Vector2i(int(cc.get("col", -1)), int(cc.get("row", -1)))
			break
	# Build chain keys (int tile ordinals) from the cell array and call the React rule.
	var chain_keys: Array = []
	for cc in cells:
		chain_keys.append(int(cc.get("tile", Constants.EMPTY)))
	var cap: Dictionary = game.try_capture_pearl(chain_keys)
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

## TEMP T24 demo: challenge the CURRENT season's seasonal boss from the keyboard. The REAL entry is
## the Town screen's Boss section ("⚔ Challenge <Boss>") — this key is a harmless dev fallback so the
## fight stays exercisable. Routes through the shared _enter_boss_fight so the dev key + the real
## Town path arm the modifier overlay + the (boosted) refill pool + the chain bar identically.
func _try_challenge_boss() -> void:
	if not game.can_challenge_boss():
		_status_label.text = "Can't challenge the boss (need City + 12 mine goods)"
		get_viewport().set_input_as_handled()
		return
	var res: Dictionary = _enter_boss_fight()
	if bool(res.get("ok", false)):
		_status_label.text = "%s appears! %s" % [
			String(res.get("name", "Boss")), BossConfig.modifier_desc(game.boss_active)]
	get_viewport().set_input_as_handled()

## Shared boss-start path (T24) — called by the dev key + the Town screen's Challenge button. Starts
## the current-season boss (GameState.start_boss applies its modifier to a fresh modifier_state),
## then wires the BOARD for the fight: push the modifier overlay (frozen/rubble/hidden/heat), the
## (respawn_boost-weighted) refill pool, the raised chain bar (storm → 4), make the board LIVE (the
## fight is on the farm board), and refresh the HUD + save. Returns GameState.start_boss's result so
## the caller can surface the boss + reason. A no-op (returns that result) when start_boss fails.
func _enter_boss_fight() -> Dictionary:
	var res: Dictionary = game.start_boss()
	if not bool(res.get("ok", false)):
		return res
	# Push the live modifier overlay + the (boosted) refill pool onto the board.
	board.set_boss_modifier_state(game.boss_modifier_state)
	board.set_tile_pool(_boss_refill_pool())
	board.set_min_chain(game.boss_min_chain())
	# BUG C1 — the boss is fought on the farm board (active_biome stays "farm"), so the board must be
	# made LIVE for the fight (the gate follows boss state via _board_should_be_active()).
	board.set_active(_board_should_be_active())
	if _audio != null:
		_audio.play("tier_up")
	_refresh_boss()
	_refresh_meta()
	SaveManager.save(game)
	return res

## T24 — the farm refill pool while a boss is active, with respawn_boost weighting folded in. For a
## respawn_boost boss (quagmire) the boosted tile KEYS (tile_tree_oak / tile_grass_grass) get EXTRA
## pool slots scaled by the factor (1.5× → +1 copy per existing slot, rounded), over-spawning them —
## the GDScript analogue of React's boss.spawnBias feeding fillBoard. Every other boss returns the
## plain active farm pool (no bias). Mirrors the fill_bias pool-doubling pattern.
func _boss_refill_pool() -> Array:
	var pool: Array = game.active_tile_pool()
	var bias: Dictionary = game.boss_spawn_bias()
	if bias.is_empty():
		return pool
	var boosted: Array = pool.duplicate()
	for key in bias.keys():
		var tile: int = Constants.tile_for_string_key(String(key))
		if tile == Constants.EMPTY:
			continue
		var factor: float = float(bias[key])
		# Count this tile's existing slots, then add (factor-1)× more (rounded) so it over-spawns.
		var existing: int = pool.count(tile)
		var extra: int = int(round(float(existing) * maxf(0.0, factor - 1.0)))
		for _i in extra:
			boosted.append(tile)
	return boosted

## T24 — surface a boss resolution (win or loss) OR refresh the live overlay after an unresolved
## chain. `res` is the note_boss_chain / tick_boss_turn / _resolve_boss result.
##   • Resolved (boss no longer active): drop the raised chain bar, clear the board modifier overlay,
##     re-pool the board to the plain farm pool, lower the board gate if no run is live, and surface
##     the WIN (reward coins + rune; "Town 2 complete" on the capstone) or the LOSS via toast+status.
##   • Unresolved (still active): just re-push the (possibly changed — heat aged/spawned, a hidden
##     cell revealed) modifier overlay + the boss pill, so the board reflects the new state.
func _apply_boss_resolution(res: Dictionary) -> void:
	if game.is_boss_active():
		# Still fighting — refresh the overlay (heat/ hidden may have changed) + the pill.
		board.set_boss_modifier_state(game.boss_modifier_state)
		_refresh_boss()
		return
	# Resolved — restore the board to a no-boss state.
	board.set_min_chain(Constants.MIN_CHAIN)
	board.set_boss_modifier_state({})
	board.set_tile_pool(game.active_tile_pool())
	board.set_active(_board_should_be_active())
	if bool(res.get("defeated", false)):
		var coins_won: int = int(res.get("reward_coins", 0))
		var runes_won: int = int(res.get("reward_runes", 0))
		var nm: String = String(res.get("name", "Boss"))
		var msg: String = "%s defeated! +%d 🪙 +%d ✦" % [nm, coins_won, runes_won]
		if String(res.get("id", "")) == BossConfig.CAPSTONE:
			msg += " — Town 2 complete!"
		_status_label.text = msg
		show_toast(msg)
		if _audio != null:
			_audio.play("fanfare")
	else:
		var fmsg: String = "%s endures — the challenge fades (%d/%d). Better luck next season." % [
			String(res.get("name", "Boss")), int(res.get("progress", 0)), int(res.get("target", 0))]
		_status_label.text = fmsg
		show_toast(fmsg)
		if _audio != null:
			_audio.play("pop")
	_refresh_boss()

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

## M3h — the Town screen's "Shoo rats" button emits `rats_shoo_requested`; Main owns the board,
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

## T24 — the Town screen's "Challenge <Boss>" button emits `boss_challenge_requested`; Main owns
## the board, so it runs the board-wiring boss start HERE (the single point that arms the modifier
## overlay + boosted pool + raised chain bar), then refreshes the Town screen so its boss section
## re-renders into the "fighting" state.
func _on_boss_challenge_requested() -> void:
	if not game.can_challenge_boss():
		return
	var res: Dictionary = _enter_boss_fight()
	if bool(res.get("ok", false)):
		_status_label.text = "%s appears! %s" % [
			String(res.get("name", "Boss")), BossConfig.modifier_desc(game.boss_active)]
		# Close the Town menu so the player lands on the playable board for the fight.
		if _town_screen != null:
			_town_screen.refresh()
		_on_town_closed()

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
		_hud.show_tool_armed_banner(id)
		return true
	# T14a — wolf-hazard tools (Rifle / Hound) act on the wolf OVERLAYS, not the grid: skip the
	# board collapse/refill (apply_external_grid would needlessly re-roll an unchanged board) and
	# just refresh the wolf markers. use_tool_on_grid already cleared/scattered the wolves + spent
	# the charge in its early path.
	var pwr: String = ToolConfig.power_id(id)
	if pwr == "clear_wolves" or pwr == "scatter_hazard":
		var rw: Dictionary = game.use_tool_on_grid(id, board.grid)
		if bool(rw.get("ok", false)):
			board.refresh_wolves(game.active_wolves())
			_status_label.text = "Used %s" % ToolConfig.tool_label(id)
			if _audio != null:
				_audio.play("pop")
			_after_tool_used()
		return bool(rw.get("ok", false))
	# T14b — mine-hazard tools (Water Pump / Explosives) mutate `mine_hazards` + the grid (lava→
	# rubble / clear the cave-in rubble row + the mole). use_tool_on_grid returns the mutated grid;
	# we land it via apply_mine_hazard_state (collapse/refill the freed cells + re-stamp the still-live
	# cave-in/gas/lava pins + refresh the mole overlay), so a residual hazard stays pinned and the
	# cleared one is gone. Skip when not in the mine (these tools are mine-only — a no-lava / no-cave-in
	# board simply clears nothing, but we still land the unchanged grid harmlessly).
	if pwr == "water_pump" or pwr == "explosives":
		var rm: Dictionary = game.use_tool_on_grid(id, board.grid)
		if bool(rm.get("ok", false)):
			board.apply_mine_hazard_state(
				rm["grid"], game.active_cave_in(), game.active_gas_vent(),
				game.active_lava_cells(), game.active_mole())
			_status_label.text = "Used %s" % ToolConfig.tool_label(id)
			if _audio != null:
				_audio.play("pop")
			_after_tool_used()
		return bool(rm.get("ok", false))
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
	_hud.hide_tool_armed_banner()
	_after_tool_used()

## "✖ Disarm" handler (the HUD emits disarm_requested → here): leave targeting mode, clear
## the pending tool, hide the banner, and clear the status hint so the board returns to plain
## chaining. The banner widget lives on the HUD now, so hide it via _hud.hide_tool_armed_banner.
func _disarm_tool() -> void:
	if board != null:
		board.set_targeting(false)
	if game != null:
		game.clear_pending_tool()
	if _hud != null:
		_hud.hide_tool_armed_banner()
	if _status_label != null:
		_status_label.text = ""

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
	# T11/T23: the dev-key mine entry flips the hazard-block flag + seeds the Mysterious Ore too
	# (mirrors _on_town_changed's mine-flip path), so the keyboard fallback behaves like the real entry.
	board.block_mine_hazards = game.is_in_mine()
	if game.is_in_mine():
		var sp := game.spawn_mysterious_ore_on_fill(board.grid, board.rng)
		if bool(sp.get("ok", false)):
			board.grid = sp["grid"]
			board._build_tiles()
	board.refresh_mole(game.active_mole())
	# BUG C1 — the dev-key mine entry is a playable-board transition too, so follow the gate (the
	# real entry path routes through _on_town_changed, which sets it; this keeps the keyboard
	# fallback honest so the mine board it just built is actually chainable).
	board.set_active(_board_should_be_active())
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
