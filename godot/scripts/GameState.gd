class_name GameState
extends RefCounted
## The single owner of run economy: collected resources, fractional chain
## progress (carry-over), coins, and a turn counter. Ported from the Phaser
## reducer's resourceProgress accumulator (src/state.ts CHAIN_COLLECTED site +
## src/utils.ts upgradeCountForChain).
##
## ACCUMULATOR SEMANTICS (authoritative React source). Per resolved chain of
## tile-type `t`, length `n`:
##   resource     = Constants.produced_resource(t)
##   threshold    = Constants.threshold_for(t)          (NO_THRESHOLD-safe)
##   new_progress = progress[resource] + n
##   units        = new_progress / threshold            (int division → floor)
##   progress[resource] = new_progress % threshold      (remainder CARRIES OVER)
## The carry-over across chains is the whole point: a chain of 4 grass
## (threshold 6) yields 0 units but leaves progress 4; a later chain of 4 grass
## makes progress 8 → 1 unit, progress 2.

var inventory: Dictionary = {}   ## resource_key:String -> int count
var progress: Dictionary = {}    ## resource_key:String -> int leftover chain progress (carry)
var coins: int = 0
## Total resolved chains this run (simple monotonic counter). The React
## season-of-year calendar is intentionally NOT ported — it was removed from
## gameplay in the React app (seasons are visual-only there).
var turn: int = 0
## Town progression on the Camp→City ladder (storage cap, building plots, and
## the tier-up cost gate). See Settlement / TownConfig.
var settlement := Settlement.new()
## Placed spawner-building ids, in build order, at most one of each. Each one
## consumes a plot and adds its tile CATEGORY to the active board refill pool. See
## BuildingConfig for the catalog; demolish() frees a plot and removes a category.
var buildings: Array = []
## Active NPC orders, each a Dictionary { "resource": String, "qty": int,
## "reward": int }. Orders are the Direction's coin sink (OrderConfig): deliver a
## requested quantity from inventory for a reward that beats the Market. Kept
## topped up to OrderConfig.MAX_ORDERS via refill_orders().
var orders: Array = []
## Reproducible generator for order resource/quantity rolls. Tests seed it with
## seed_orders(); the live scene seeds it with a fixed int for stable screenshots.
var rng := RandomNumberGenerator.new()

# ── NPC roster + bonding (ADDITIVE — ported from src/features/npcs) ────────────
## The 5-NPC roster and per-NPC bond (a float in [0, 10]) now live in a composed
## NpcState (the same pattern as `settlement` / `story`). Every order is REQUESTED by
## an NPC (generate_order picks one via the seeded `rng`); filling it pays a
## bond-ADJUSTED reward (NpcConfig.reward_with_bond) and raises that NPC's bond by
## BOND_GAIN_PER_FILL. The default bond is 5.0 (Warm, ×1.00), so a fresh order's payout
## is IDENTICAL to the pre-bonding flat reward until a bond crosses into Liked (≥7) or
## Sour (<5) — keeping this layer additive. Persisted as the flat top-level "npcs" key
## (see to_dict / from_dict), byte-identical to before the extraction.
var npcs_state := NpcState.new()
## Bond gained each time an order from that NPC is filled (+0.3). Forwarded from
## NpcConfig (the canonical bond-economy home) so `GameState.BOND_GAIN_PER_FILL` keeps
## resolving for callers.
const BOND_GAIN_PER_FILL: float = NpcConfig.BOND_GAIN_PER_FILL
## Fallback NPC for an old save's order missing its `npc` field (defensive). Forwarded
## from NpcConfig so `GameState.DEFAULT_ORDER_NPC` keeps resolving for callers.
const DEFAULT_ORDER_NPC: String = NpcConfig.DEFAULT_ORDER_NPC

## The legacy flat {"roster": …, "bonds": …} view onto the composed NpcState — a LIVE
## reference (NOT a copy), so the many readers that index `game.npcs["roster"]` /
## mutate `game.npcs["bonds"] = …` keep working unchanged. Read-only property (no
## setter): from_dict rebuilds the NpcState directly, and no caller reassigns `game.npcs`
## wholesale (verified across the codebase) — they only read or mutate the returned dict.
var npcs: Dictionary:
	get:
		return npcs_state.as_dict()

## Current bond for `id` (0..10 float). Thin forwarder to NpcState.bond — a missing /
## unknown id reads as the Warm default 5.0 so reward math never divides by a phantom
## band. Call site (`game.npc_bond(id)`) is UNCHANGED.
func npc_bond(id: String) -> float:
	return npcs_state.bond(id)

## Adjust `id`'s bond by `amount` (may be negative), clamped to [0, 10]. Thin forwarder
## to NpcState.gain — seeds a known id at the default first; stores a float. Call site
## (`game.gain_bond(id, amt)`) is UNCHANGED.
func gain_bond(id: String, amount: float) -> void:
	npcs_state.gain(id, amount)

## True when NPC `npc_id` may receive a gift right now: it's a real NPC, the player holds
## at least 1 of `resource`, and this NPC hasn't already been gifted THIS season (the
## once-per-season cooldown). The season is the current farm season index (0..3).
func can_gift(npc_id: String, resource: String) -> bool:
	if not NpcConfig.has(npc_id):
		return false
	if int(inventory.get(resource, 0)) <= 0:
		return false
	return npcs_state.can_gift(npc_id, current_season_index())

## GIVE_GIFT (T18, ported from React state.ts GIVE_GIFT + applyGift, src/features/npcs/bond.ts).
## Give NPC `npc_id` one unit of inventory `resource`: consume 1 of the resource, bump that
## NPC's bond by the preference-tier delta (loved +0.5, liked +0.3, neutral +0.15), clamp the
## bond to [0, 10], and set the per-season cooldown so the NPC can't be gifted again until a
## new season. Guards (the FIRST that trips is reported): unknown NPC → "unknown"; no stock of
## the resource → "no_stock"; already gifted this season → "cooldown". On success returns
## {ok:true, npc, resource, tier, delta, bond} (bond = the new bond after the gift); on failure
## {ok:false, reason} WITHOUT mutating. Mirrors React: the gift is silently rejected on cooldown
## / empty inventory; the bond rises by the tier delta and is clamped.
func give_gift(npc_id: String, resource: String) -> Dictionary:
	if not NpcConfig.has(npc_id):
		return {"ok": false, "reason": "unknown"}
	if int(inventory.get(resource, 0)) <= 0:
		return {"ok": false, "reason": "no_stock"}
	var season: int = current_season_index()
	if not npcs_state.can_gift(npc_id, season):
		return {"ok": false, "reason": "cooldown"}
	var tier: String = NpcConfig.gift_tier(npc_id, resource)
	var delta: float = NpcConfig.gift_delta(tier)
	# T31 (ADDITIVE): owned BOONS that grant bond_gain_mult scale the bond rise from this gift
	# (React boon bond_gain_mult applied to bond gains from gifts/orders). 1.0 for a fresh game
	# (no boons owned) → delta unchanged → byte-identical gift behaviour.
	delta *= boon_effect_mult(BoonConfig.BOND_GAIN_MULT)
	# Consume one unit of the resource (erase the key when it hits 0).
	var remaining: int = maxi(0, int(inventory.get(resource, 0)) - 1)
	if remaining == 0:
		inventory.erase(resource)
	else:
		inventory[resource] = remaining
	gain_bond(npc_id, delta)
	npcs_state.mark_gifted(npc_id, season)
	var new_bond: float = npc_bond(npc_id)
	# T29 (story engine, ADDITIVE — after the gift is committed): post a "gift_given" event so
	# side_first_gift (event.type == gift_given) and side_bond_liked (event.bond >= 7) can fire.
	# event.bond is the NEW bond after this gift (the Liked-band gate reads it). Beats NEVER
	# auto-grant, so this cannot change the economy. The success result below is UNCHANGED.
	post_story_event({"type": "gift_given", "npc": npc_id, "resource": resource, "bond": new_bond})
	return {
		"ok": true,
		"npc": npc_id,
		"resource": resource,
		"tier": tier,
		"delta": delta,
		"bond": new_bond,
	}

# ── Expedition / biome (M3f, the Town-2 mine) ─────────────────────────────────
## SIMPLIFICATION (M3f): a SINGLE SHARED inventory. The locked Direction makes
## resources per-settlement, but for this milestone mine goods (block/iron_bar/
## coke/dirt/cut_gem) land in the SAME `inventory` as farm goods, and there is no
## separate Town-2 tier ladder. The per-settlement resource split + a full Town-2
## settlement are deferred to a later milestone. (Mine HAZARDS — cave-ins/gas/
## moles — are also out of scope here; they arrive with the boss milestone.)
##
## The expedition is "the combination" from the Direction: the farm makes food,
## the Kitchen packs food into `supplies`, and supplies are spent as MINE TURNS on
## an expedition into the mine biome. Mine runs are SOFT-FAIL — when the turns run
## out the run ends and everything gathered is kept (it's already in `inventory`).
var active_biome: String = "farm"   ## "farm" | "mine" | "harbor" — which biome the board shows
var mine_turns_left: int = 0        ## remaining mine turns this expedition (0 on the farm)

# ── T26: Cartography travel state (ported from src/features/cartography/slice.ts) ──
## The 11-node world-map travel state machine. `map_current` is the node the player is "at"
## (default "home"); `map_node_state` maps every visited/discovered node id → its state string
## ("visited" | "discovered"); a node absent from the dict is HIDDEN. Mirrors React's
## mapCurrent + mapVisited/mapDiscovered (slice.ts:13-20), collapsed into one {id → state} dict
## (hidden = not present, so the dict only holds discovered ∪ visited).
##
## Discovery rules (slice.ts:43-110): home starts VISITED, its neighbours DISCOVERED. You may
## FIRST-travel only to a node adjacent to a VISITED node, meeting its level + paying its coin
## entry cost; arriving marks it visited and discovers its neighbours. You may FAST-travel to
## any already-VISITED node from anywhere (no adjacency / level / cost). travel_to() is the
## single mutation entry; it routes BOARD nodes (farm/mine/fish) into the matching expedition
## board so the world map is the real way to start a run. NON-board nodes (event/festival/boss/
## capital) are handled by Main on the {ok:true, kind} result — travel_to only moves the marker.
##
## ADDITIVE GUARANTEE: a save written before the travel state existed loads with the default seed
## (home visited, neighbours discovered) via the from_dict defensive default; SAVE_VERSION is NOT
## bumped. The default seed is applied in _ready of GameState (init below) so a bare new() is also
## seeded — see _seed_map_state.
var map_current: String = "home"
## node id (String) → "visited" | "discovered". A node not present is hidden. Seeded by
## _seed_map_state() in _init so a bare GameState is always navigable.
var map_node_state: Dictionary = {}

# ── T22: Multi-settlement founding + per-zone state (ACTIVE-ZONE-VIEW + ARCHIVE model) ──
## The locked Direction keys inventory / progress / buildings / settlement PER founded zone, with
## a founder flow, and three Hearth-Tokens (one per completed settlement TYPE) that unlock the Old
## Capital finale. Porting React's nested-map shape (inventory[zoneId], built[zoneId], …) would
## break the hundreds of FLAT `inventory[res]` / `qty()` / `buildings` accesses across this whole
## codebase. Instead this is an ACTIVE-ZONE-VIEW + ARCHIVE model:
##   • The flat `inventory` / `progress` / `buildings` / `settlement` / `farm_turns_used` fields
##     are the LIVE view of the CURRENTLY-ACTIVE zone (`map_current`, default "home").
##   • `zone_archives` holds the SNAPSHOTTED state of every NON-active founded zone.
##   • `_activate_zone(id)` snapshots the live fields into zone_archives[old], then loads
##     zone_archives[id] (or fresh defaults) into the live fields + sets map_current.
## A fresh game never leaves home, so the live fields behave EXACTLY as before — every existing
## suite stays byte-identical. Founding / archives / tokens are purely ADDITIVE.
##
## coins / tools / workers / runes / npcs / achievements / story / quests / almanac / boons /
## embers / core_ingots / market / heirlooms stay GLOBAL (NOT per-zone) — mirroring React's
## src/state/zoneInventory.ts ("coins, tools, workers, level, knowledge stay global").

## Per-founded-zone founding record: { zone_id:String -> { founded:bool, biome:String,
## keeper_path:String } }. Home is IMPLICITLY founded (is_settlement_founded special-cases it),
## so a fresh game's map is EMPTY — exactly like React's state.settlements (home never recorded).
var settlements: Dictionary = {}

## Snapshotted state of every NON-active founded zone: { zone_id:String -> { inventory, progress,
## buildings, settlement (tier dict), farm_turns_used } }. The ACTIVE zone's state lives in the
## live flat fields, NOT here. Empty for a home-only game (home is the active zone, never archived).
var zone_archives: Dictionary = {}

## The Hearth-Tokens held (GLOBAL): { token_id:String -> 1 } where token_id is one of
## CartographyConfig.HEARTH_TOKEN_FOR_TYPE values (heirloomSeed / pactIron / tidesingerPearl).
## A completed settlement of a type grants its token ONCE; holding all three opens the Old Capital.
## React state.heirlooms (data.ts:541-554 grantEarnedHearthTokens). Empty for a fresh game.
var heirlooms: Dictionary = {}

# ── Farm season cycle (A1, ported from src/features/zones + src/constants SEASONS) ──
## The home farm is a PERSISTENT board that cycles four seasons (Spring→Summer→Autumn→
## Winter) over a turn budget, then HARVESTS and wraps back to Spring. `farm_turns_used` is
## the spent-turn counter WITHIN the current season cycle (0..budget); the budget itself is
## ZoneConfig.base_turns(_active_farm_zone()) — the live farm board follows the ACTIVE farm node,
## defaulting to home for a home-only game. The SEASON is derived
## from these via Constants.season_index — see current_season_index / current_season_name
## below. This is a SEPARATE counter from `turn` (the monotonic story/quest counter above) —
## do NOT conflate them. note_farm_turn() ticks this after each FARM chain (parallel to
## note_mine_turn / note_harbor_turn for the expeditions), advancing the season and harvesting
## at the budget boundary (reset to Spring).
##
## ADDITIVE GUARANTEE: a save written before seasons existed loads farm_turns_used = 0 (the
## from_dict defensive default) — a fresh Spring cycle. SAVE_VERSION is NOT bumped.
var farm_turns_used: int = 0        ## spent farm turns within the current season cycle (0..budget)

# ── Bounded farm RUN (Task A, ported from React FARM/ENTER + CLOSE_SEASON) ─────
## React's "Start Farming" lifecycle: you pay an entry cost from town, play a BOUNDED
## number of turns (the per-run, fertilizer-aware budget), then the run ENDS and you
## return to town with a season-end bonus (close_season). This is the bounded analogue
## of the always-on, infinitely-wrapping season cycle above.
##
## ADDITIVE GUARANTEE: a bare GameState.new() has farm_run_active = false, so
## farm_turn_budget() falls back to the ACTIVE farm node's base_turns via _active_farm_zone()
## (home → 10 for a home-only game) and note_farm_turn() keeps its legacy infinite-wrap
## behaviour. Every existing suite that
## never starts a run is byte-identical. The six fields restore defensively in from_dict;
## SAVE_VERSION is bumped by a SEPARATE later task (this is the logic foundation only).
var farm_run_active: bool = false       ## a bounded run is in progress
var farm_run_budget: int = 0            ## this run's total turn budget (fertilizer-aware)
var farm_run_turns_left: int = 0        ## turns remaining in this run (0 when the run ends)
var farm_run_zone: String = "home"      ## the active farm node the run is playing (defaults to home)
var farm_run_used_fertilizer: bool = false  ## whether this run consumed fertilizer (×2 budget)
var farm_run_selected: Array = []       ## chosen tile categories (spawn-bias boost; max 8)

# ── T30: Run TELEMETRY (the rich run-summary recap, ported from src/features/runSummary) ────────
## The per-run accumulator the rich HarvestModal dashboard reads. RESET at start_farm_run (a fresh
## run), ACCUMULATED during the run (credit_chain ticks chains/longest/best-moment/resources/coins/
## upgrades; enter_mine/enter_harbor record supplies consumed; post_story_event records fired beats;
## a bond snapshot at run-start backs the bond-delta), and SNAPSHOTTED at close_season (build_run_summary
## packs the live fields + the bond deltas into the dashboard dict). Mirrors the React RunSummary
## fields (slice.ts): chainsPlayed, biggestChain {count,key,coinGain,upgrades,gained}, totalUpgrades,
## totalCoinGain, resourcesGained, bondsAtStart/bondDeltas, beatsTriggered, suppliesConsumed,
## fertilizerUsed.
##
## TRANSIENT — like pending_tool / fill_bias, this is NOT persisted (to_dict/from_dict skip it): a
## run summary only matters between start_farm_run and the run-end modal, and a reload mid-run simply
## starts the recap fresh. SAVE_VERSION is NOT bumped. A bare GameState.new() has farm_run_active ==
## false so nothing accumulates; every existing suite is byte-identical.
var run_chains_played: int = 0          ## resolved chains this run (every credit_chain on the farm)
var run_longest_chain: int = 0          ## the longest single chain length this run (best-moment count)
var run_best_chain: Dictionary = {}     ## the best moment: {count, key, coin_gain, upgrades, gained} (the LONGEST chain)
var run_total_upgrades: int = 0         ## upgrade tiles spawned this run (units produced by chains)
var run_total_coins: int = 0            ## coins gained from chains this run (sum of credit_chain coins_gain)
var run_resources_gained: Dictionary = {}   ## resource_key:String -> units gained this run (chain produce)
var run_bonds_at_start: Dictionary = {}      ## npc_id:String -> bond at run start (backs the bond delta)
var run_beats_fired: Array = []         ## ordered ids of story beats that fired DURING this run (dedup)
var run_supplies_consumed: Dictionary = {}   ## resource_key:String -> units spent to start expeditions this run

# ── Fish / Harbor expedition (M3j, ported from src/features/fish) ──────────────
## The harbor is the THIRD biome, MIRRORING the mine expedition (M3f) and SHARING the
## same single inventory (the catch — fish_fillet/sea_shells/pearls/fish_oil — lands in
## `inventory` alongside farm + mine goods). Like the mine it is SOFT-FAIL: when the
## harbor turns run out the run ends and everything caught is kept. Two harbor-only
## mechanics ported from React (src/features/fish):
##   1. TIDE CYCLE — the tide is "high" or "low" and flips every Constants.TIDE_PERIOD
##      spent harbor turns. The tide drives which fish surface on the board's bottom row
##      (HIGH_TIDE_POOL / LOW_TIDE_POOL); the live bottom-row mutation is the next (board)
##      slice's job — this layer just owns the tide state + flip bookkeeping.
##   2. GIANT PEARL — one rune-capture pearl per harbor session (the analogue of the
##      mine's Mysterious Ore). It carries a Constants.PEARL_TURNS countdown; chaining it
##      with >= Constants.REQUIRED_FISH_IN_CHAIN other fish tiles before it expires grants
##      +1 Rune (try_capture_pearl). The board slice places it on a live cell; for the
##      LOGIC slice we just record its turns_left (and a deterministic seed cell).
##
## ADDITIVE GUARANTEE: none of this runs unless active_biome == "harbor". On the farm /
## in the mine every harbor field sits at its default and every harbor method is a no-op
## or guarded out, so farm + mine behaviour is byte-identical (existing suites stay green).
var harbor_turns_left: int = 0      ## remaining harbor turns this expedition (0 off the harbor)
var fish_tide: String = "high"      ## "high" | "low" — the current tide on the harbor board
var fish_tide_turn: int = 0         ## spent harbor turns under the current tide (flips at TIDE_PERIOD)
## The live giant pearl, or {} when none is active. Shape: { row:int, col:int,
## turns_left:int }. row/col are the seed cell (the board slice owns live placement);
## turns_left is the capture countdown ticked by note_harbor_turn.
var fish_pearl: Dictionary = {}
## Runes — the harbor's premium reward, granted ONLY by capturing the giant pearl
## (try_capture_pearl). Uncapped (like coins); persisted defensively.
var runes: int = 0

# ── Seasonal bosses (T24, the Town-2 close) — TIMED RESOURCE-TARGET model ──────
## REWRITTEN from the single HP-attrition Frostmaw fight to React's 6 seasonal bosses as
## TIMED RESOURCE-TARGET challenges (src/features/bosses/data.ts + modifiers.ts + boss/slice.ts).
## A boss asks for a target quantity of a resource/tile within BOSS_WINDOW_TURNS turns under a
## board MODIFIER; meet the target before the window expires to win (coins scaled by year +
## overshoot margin, +1 Rune). The CAPSTONE boss (storm) still gates Town 2: beating it sets
## town2_complete, which a later milestone consumes to unlock Town 3. See BossConfig +
## BossModifierLogic for the catalog + the pure modifier rules.
##
## All 6 bosses are REACHABLE: a challenge spawns the CURRENT farm-season's boss (start_boss),
## and `town2_complete` only blocks RE-challenging the capstone — the other five can be fought
## any number of times (each season's boss is encounterable). The reward `year` is tracked per
## instance (defaults to 1 — the port has no calendar; see boss_year below).
##
## boss_active replaces the old boss_active/boss_hp pair. The richer per-fight state lives in the
## BossInstance fields below; boss_active just names the live boss ("" when idle). town2_complete
## is unchanged (the Town-2 gate). The board MODIFIER overlay lives in boss_modifier_state, the
## GDScript analogue of React's boss.modifierState (rendered/gated by Board, ticked by Main).
var boss_active: String = ""              ## "" when no challenge in progress, else a boss id
var boss_season: String = ""              ## the boss's season (cached from BossConfig at spawn)
var boss_year: int = 1                    ## the run year used for the reward formula (>=1; default 1)
var boss_turns_remaining: int = 0         ## window turns left (BOSS_WINDOW_TURNS at spawn → 0)
var boss_progress: int = 0                ## units of the target gathered so far in the window
var boss_target_resource: String = ""     ## the target resource/tile KEY (cached from BossConfig)
var boss_target_amount: int = 0           ## the target quantity (cached from BossConfig)
var boss_modifier_state: Dictionary = {}  ## the live board-modifier overlay (BossModifierLogic bag)
var town2_complete: bool = false          ## set true when the CAPSTONE boss is defeated

# ── Town 3 rats hazard (M3h) ──────────────────────────────────────────────────
## SIMPLIFICATION (M3h, consistent with the M3f single-shared-inventory note): per
## the Direction, Town 3 is its own settlement with the rats lesson. For this
## milestone "Town 3" is just the EXISTING farm board gaining the rats hazard once
## town2_complete — a separate Town-3 settlement + the per-settlement resource split
## remain deferred to a later milestone. Rats become active the moment the capstone
## boss is defeated (rats_enabled), seeding Constants.RAT_POOL_SLOTS rat tiles into
## the farm pool. RAT produces nothing, so chaining rats wastes a move — that's the
## hazard. The Ratcatcher (free "shoo" moves) and Master Ratcatcher (grass chains
## also clear adjacent rats) are the Town-3 answer (BuildingConfig hazard buildings).
## The "5 free moves/year" from the Direction maps to BuildingConfig.RATCATCHER_CHARGES (there
## is no year/season calendar in the port — see the turn-counter note above — so the charges
## are a flat per-run budget the player spends down). The CONST now lives on BuildingConfig
## (with the building it belongs to); only the spent-count below is run STATE.
var ratcatcher_charges_used: int = 0   ## shoo-moves spent (0..BuildingConfig.RATCATCHER_CHARGES)

# ── Farm HAZARDS live state (T7/T8/T9, ported from src/features/farm) ───────────
## The live farm-hazard state — the GDScript analogue of React's `state.hazards`. Owns the
## POSITIONAL rats (each a {row,col,age}), the fire cells, and the wolves (each {row,col,scared}
## plus a scared countdown). The single source of truth for all three farm hazards; HazardLogic
## (pure) operates on this + the board grid, and note_farm_turn ticks/spawns into it. Shape:
##   { "rats": Array[{row,col,age}], "fire": {cells:[...]} or {}, "wolves": {list:[...],
##     scared_turns:int} or {} }
## Seeded to HazardLogic.default_state() (all inactive). Persisted defensively (to_dict/from_dict
## round-trip via HazardLogic.normalise). SAVE_VERSION is NOT bumped — a pre-hazards save loads
## with all hazards inactive. SINGLE-ACTIVE CAP mirrored in roll: only one of rats/fire/wolves at
## a time.
var hazards: Dictionary = HazardLogic.default_state()

## Per-session FORCE-ON override for the fire hazard (tests + a future tuning toggle). When false
## the gate falls back to the build-time Constants.FIRE_HAZARD_ENABLED (false → fire never spawns
## in normal play, matching the live React game). NOT persisted (a reload re-reads the default).
var fire_hazard_force: bool = false

# ── Mine HAZARDS live state (T11, ported from src/features/mine/hazards.ts) ──────
## The live MINE-hazard state — the mine-side analogue of `hazards` above. Owns the cave_in (a
## buried ROW), the gas_vent (cell + 3-turn countdown), the lava (spreading cells), and the mole
## (overlay entity + 3-turn cycle). The single source of truth for all four mine hazards;
## MineHazardLogic (pure) operates on this + the board grid, and note_mine_turn ticks/spawns into
## it. Shape (see MineHazardLogic header):
##   { "cave_in": {row} or {}, "gas_vent": {row,col,turns_remaining} or {}, "lava": {cells:[...]}
##     or {}, "mole": {row,col,turns_remaining} or {} }
## Seeded to MineHazardLogic.default_state() (all inactive). Persisted defensively (to_dict/from_dict
## round-trip via MineHazardLogic.normalise). SAVE_VERSION is NOT bumped — a pre-mine-hazards save
## loads with all mine hazards inactive. SINGLE-ACTIVE CAP mirrored in roll: only one at a time.
## ONLY relevant while in the mine (active_biome == "mine"); on the farm/harbor it stays inactive.
var mine_hazards: Dictionary = MineHazardLogic.default_state()

# ── Mysterious Ore → Rune live state (T23, src/features/mine/mysterious_ore.ts) ──
## The live Mysterious Ore, or {} when none active. Shape: { row:int, col:int, turns_left:int }.
## One per mine session (the mine's analogue of the harbor's `fish_pearl`). Spawned on a mine
## board fill (spawn_mysterious_ore), ticked by note_mine_turn (degrades to DIRT at 0), and captured
## by chaining it with >= Constants.REQUIRED_DIRT_IN_CHAIN dirt (try_capture_mysterious_ore → +1
## Rune). Persisted defensively (to_dict/from_dict). SAVE_VERSION is NOT bumped.
var mysterious_ore: Dictionary = {}

# ── Tile Collection: active variants + discovery + abilities ────────────────────────
## Ported from React's `state.tileCollection` slice (src/state/helpers.ts
## TileCollectionSlice + src/state.ts SET_ACTIVE_TILE / BUY_TILE / chain-discovery).
## The data layer is TileVariantConfig (the catalog). This is the live PLAYER STATE:
##   tile_active_by_category — { category:String -> active variant id:String }. The chosen
##     board variant for each category; default = the category's base tile (the React
##     activeByCategory map, seeded from TileVariantConfig.default_active_by_category).
##     active_tile_pool / upgrade_spawn substitute this variant's Tile enum for the
##     category's base tile.
##   tile_discovered — { variant id:String -> true }. The set of unlocked variants. Seeded
##     with every `default`-method tile + the port base tiles (default_discovered). Grows
##     via chain / research / buy / building / daily discovery.
##   tile_research_progress — { variant id:String -> int }. Accrued research toward a
##     `research`-method variant's researchAmount; at the cap the variant is discovered.
##   tile_free_moves — int. Banked free moves granted by the active tiles' free_moves /
##     free_turn_if_chain abilities (accrued per chain in credit_chain); consumed by
##     note_farm_turn BEFORE a turn is spent (React boardTurnPatch, src/state.ts:147-160).
##
## SEEDED LAZILY: a bare GameState.new() starts these empty and seeds them on first read
## (see _ensure_tile_collection). This keeps the field defaults trivially round-trip-safe
## and lets from_dict overlay a saved slice over the fresh seed (mirrors React mergeLoadedState).
var tile_active_by_category: Dictionary = {}
var tile_discovered: Dictionary = {}
var tile_research_progress: Dictionary = {}
var tile_free_moves: int = 0
var _tile_collection_seeded: bool = false

# ── Settings (M4f) ────────────────────────────────────────────────────────────
## Player audio preference, surfaced by the settings/menu modal (MenuScreen). Main
## applies it to the owned Audio service on launch (Audio.set_muted) and toggles it
## from the menu; persisted so the choice survives a reload. Defaults to "on".
var audio_muted: bool = false

## Player "Reduce Motion" accessibility preference, surfaced by the settings/menu
## modal. Main applies it to the UiFx motion kit on launch (UiFx.reduced) and toggles
## it from the menu; persisted so the choice survives a reload. Defaults to motion ON.
var reduce_motion: bool = false

# ── Tutorial onboarding ────────────────────────────────────────────────────────
## Whether the player has completed (or skipped) the 6-step tutorial onboarding
## modal. Persisted so the modal is shown only once. Main calls mark_tutorial_seen()
## on the modal's `finished` signal; apply_deeplink("tutorial") opens it for replay
## regardless of this flag. Defaults to false (show on first load). ADDITIVE —
## SAVE_VERSION is NOT bumped: a save written before tutorial existed loads with
## false (the default), triggering the tutorial once on upgrade.
var tutorial_seen: bool = false

## Mark the tutorial as seen (called by Main when the modal finishes or is skipped).
func mark_tutorial_seen() -> void:
	tutorial_seen = true

# ── Daily login-streak rewards (ADDITIVE — ported from src/state.ts LOGIN_TICK) ──
## The login-streak state: the calendar date (YYYY-MM-DD) of the LAST claim and the
## current streak day (1..MAX_DAY). login_tick(today) advances/resets the streak and
## grants the day's reward (DailyRewardConfig). Ported from the React LOGIN_TICK case
## EXACTLY: idempotent same-day, +1 on a consecutive calendar day (capped at 30), and a
## reset to day 1 on any other gap (incl. the very first claim). Defaults
## (daily_last_claimed="" / daily_streak_day=0) mean a bare GameState.new() has claimed
## nothing — so with no daily state nothing changes (login_tick is only fired by Main's
## launch wiring, never by GameState.new()). ADDITIVE GUARANTEE: every existing suite that
## builds a GameState.new() is unaffected; SAVE_VERSION is NOT bumped — a save written
## before daily rewards existed loads with the defaults (from_dict defensive defaults).
var daily_last_claimed: String = ""   ## YYYY-MM-DD of the last claim ("" = never claimed)
var daily_streak_day: int = 0         ## current streak day (0 = no streak yet, else 1..MAX_DAY)

## Run one login tick for the calendar date `today` (a "YYYY-MM-DD" STRING — pass the
## date in, never read the system clock here, so tests are deterministic). Mirrors the
## React LOGIN_TICK reducer EXACTLY:
##   - IDEMPOTENT: if daily_last_claimed == today, return {claimed:false} WITHOUT mutating
##     (re-launching the same day grants nothing — no double reward).
##   - nextDay: no prior claim (daily_last_claimed == "") → 1; exactly 1 calendar day
##     after the last claim → min(daily_streak_day + 1, MAX_DAY); any other gap → reset to 1.
##   - GRANT the day's reward (DailyRewardConfig.reward_for_day): coins + runes directly
##     (both uncapped, like order rewards), a `tool` grant of `amount` (default 1) through the
##     M8b grant_tool path, and an `unlock_tile` grant (the React `unlockTile` / `daily`
##     discovery method — day 30 discovers Triceratops, a real TileVariantConfig variant).
##   - Then set daily_last_claimed = today, daily_streak_day = nextDay.
## Returns { claimed:bool, day:int, reward:Dictionary }. On the idempotent no-op,
## `day` reports the unchanged current streak day and `reward` is {} (nothing granted).
func login_tick(today: String) -> Dictionary:
	# Idempotent: the same calendar day grants nothing (React `if (last === today) return state`).
	if daily_last_claimed == today:
		return {"claimed": false, "day": daily_streak_day, "reward": {}}
	var next_day: int
	if daily_last_claimed == "":
		# No prior claim → start the streak at day 1.
		next_day = 1
	else:
		# Diff in whole calendar days between the last claim and today. Both parsed as
		# midnight UTC (the "T00:00:00" suffix) so the delta is a clean multiple of 86400.
		var last_unix: int = int(Time.get_unix_time_from_datetime_string(daily_last_claimed + "T00:00:00"))
		var today_unix: int = int(Time.get_unix_time_from_datetime_string(today + "T00:00:00"))
		var diff_days: int = int(roundi(float(today_unix - last_unix) / 86400.0))
		if diff_days == 1:
			# Exactly one day later → extend the streak, capped at MAX_DAY.
			next_day = mini(daily_streak_day + 1, DailyRewardConfig.MAX_DAY)
		else:
			# Any other gap (skipped a day, went backwards, far future) → reset to day 1.
			next_day = 1
	var reward: Dictionary = DailyRewardConfig.reward_for_day(next_day)
	# Grant coins + runes (uncapped currencies).
	var reward_coins: int = int(reward.get("coins", 0))
	if reward_coins > 0:
		coins += reward_coins
	var reward_runes: int = int(reward.get("runes", 0))
	if reward_runes > 0:
		runes += reward_runes
	# Grant the tool reward (if any) through the M8b grant_tool path — every mapped tool
	# id is a real ToolConfig member, so grant_tool accepts it and stacks onto any existing
	# charges. amount defaults to 1 (React `reward.amount ?? 1`).
	var tool_id: String = String(reward.get("tool", ""))
	if tool_id != "":
		grant_tool(tool_id, int(reward.get("amount", 1)))
	# Grant the `unlock_tile` reward (the React `unlockTile` path, src/state.ts daily) — this is
	# the `daily` tile-discovery method (day 30 → Triceratops, a real TileVariantConfig variant).
	var unlock_tile: String = String(reward.get("unlock_tile", ""))
	if unlock_tile != "":
		discover_tile(unlock_tile)
	# Commit the new streak state.
	daily_last_claimed = today
	daily_streak_day = next_day
	return {"claimed": true, "day": next_day, "reward": reward.duplicate(true)}

# ── T16: Dynamic market state (ported from src/market.ts) ───────────────────────
## The live drifted price table and current seasonal event. Re-rolled on new_game
## and at every close_season() (the season boundary — parallel to React's
## CLOSE_SEASON reroll). Seeded deterministically from `market_seed` so the same
## seed always produces the same prices for a given season index.
##
## ADDITIVE GUARANTEE: a save written before T16 existed loads with market_seed = 0
## and market_season = 0 (from_dict defensive defaults), which seeds the prices
## exactly as if new_game() had been called with those values — a reasonable fresh
## season. sell() / buy() fall back to base prices when market_prices is empty, so
## old saves are byte-identical until prices are recomputed. SAVE_VERSION is NOT
## bumped.
##
## Shape:
##   market_seed   — int, randomised once at new_game and persisted. Deterministic:
##                   same seed + same season always yields the same drift.
##   market_season — int, monotonically incremented by each close_season() call.
##                   Mirrors React's `season` argument to driftPrices.
##   market_prices — { resource:String → { "buy":int, "sell":int } }. The drifted
##                   price for every market-tradeable resource this season. Derived:
##                   NOT persisted — recomputed from market_seed + market_season on
##                   new_game, load, and close_season.
##   market_event  — the active event dict ({ id, label, desc, mults }) or {} when
##                   no event this season. Derived alongside market_prices.
var market_seed: int = 0          ## stable per-save seed; randomised at new_game
var market_season: int = 0        ## monotonic season index; bumped by close_season
## Derived live price table — not persisted, recomputed from seed+season.
var market_prices: Dictionary = {}
## Derived current event — not persisted, recomputed from seed+season.
var market_event: Dictionary = {}

## Recompute market_prices and market_event from market_seed and market_season.
## Call on new_game, from_dict, and close_season. Pure (no side effects beyond
## the two derived fields).
func _recompute_market() -> void:
	market_event = MarketConfig.pick_market_event(market_seed, market_season)
	market_prices = MarketConfig.drift_prices(market_seed, market_season, market_event)

## Live drifted SELL price for `res` (coins earned when selling 1 unit). Falls
## back to the flat base when no drifted price is available.
func live_sell_price(res: String) -> int:
	var p: Variant = market_prices.get(res, null)
	if p is Dictionary:
		return int((p as Dictionary).get("sell", MarketConfig.sell_price(res)))
	return MarketConfig.sell_price(res)

## Live drifted BUY price for `res` (coins paid when buying 1 unit). Falls back
## to the flat base when no drifted price is available.
func live_buy_price(res: String) -> int:
	var p: Variant = market_prices.get(res, null)
	if p is Dictionary:
		return int((p as Dictionary).get("buy", MarketConfig.buy_price(res)))
	return MarketConfig.buy_price(res)

# ── Castle contributions (ADDITIVE — ported from src/features/castle) ───────────
## The Castle is a ONE-WAY SINK: the player donates resources from the shared
## `inventory` toward each CastleConfig need, and the donated total per need is tracked
## here (need_id:String -> int contributed). There is no reset and no reward beyond the
## contribution itself (REFERENCE §11). Initialised to every need at 0 via
## _default_castle(); persisted defensively in to_dict / from_dict (a save written
## before the castle existed loads all 0). Wired ADDITIVELY: nothing reads this map
## except contribute_to_castle + the Castle screen, so the rest of the economy is
## byte-identical. SAVE_VERSION is NOT bumped (defensive default for old saves).
var castle_contributed: Dictionary = _default_castle()

## Build the starting castle map: every CastleConfig need at 0 contributed.
static func _default_castle() -> Dictionary:
	var out: Dictionary = {}
	for id in CastleConfig.NEED_IDS:
		out[String(id)] = 0
	return out

## Total contributed toward Castle need `id` so far (0 when none / unknown id).
func castle_contributed_for(id: String) -> int:
	return int(castle_contributed.get(id, 0))

## Units of `id` the player CAN still contribute right now: the smaller of what's
## left toward the target (target - contributed) and what's on hand in inventory of
## the need's resource. 0 for an unknown need, a met need, or an empty stockpile.
func castle_contributable(id: String) -> int:
	if not CastleConfig.has_need(id):
		return 0
	var remaining: int = maxi(0, CastleConfig.need_target(id) - castle_contributed_for(id))
	var have: int = int(inventory.get(CastleConfig.need_resource(id), 0))
	return mini(remaining, have)

## Contribute `n` units toward Castle need `id`. CLAMPS to what's actually available
## (castle_contributable) so a caller can never over-contribute past the target or
## past what's in inventory — passing a huge `n` simply donates everything affordable.
## On a positive effective amount: deduct that many of the need's resource from the
## SHARED inventory (floored at 0, key erased at 0 — the same write pattern as
## fill_order / craft) and bump the contributed counter. Returns
## {ok:true, id, amount, contributed} with the AMOUNT actually donated and the new
## running total. On a no-op (unknown need, 0 affordable, or n<=0) returns
## {ok:false, reason} WITHOUT mutating; reason is the FIRST guard that trips:
## "unknown" → "bad_amount" (n<=0) → "nothing" (0 affordable).
func contribute_to_castle(id: String, n: int) -> Dictionary:
	if not CastleConfig.has_need(id):
		return {"ok": false, "reason": "unknown"}
	if n <= 0:
		return {"ok": false, "reason": "bad_amount"}
	var amount: int = mini(n, castle_contributable(id))
	if amount <= 0:
		return {"ok": false, "reason": "nothing"}
	var resource: String = CastleConfig.need_resource(id)
	var remaining: int = maxi(0, int(inventory.get(resource, 0)) - amount)
	if remaining == 0:
		inventory.erase(resource)
	else:
		inventory[resource] = remaining
	castle_contributed[id] = castle_contributed_for(id) + amount
	return {"ok": true, "id": id, "amount": amount, "contributed": castle_contributed[id]}

# ── Decorations + Influence (ADDITIVE — ported from src/features/decorations) ────
## Influence — a NEW currency granted by building decorations. Decorations GRANT it; the
## Portal feature (ported next) will SPEND it. Uncapped (like coins / runes); starts at 0.
## Persisted defensively in to_dict / from_dict (a save written before decorations existed
## loads with 0). SAVE_VERSION is NOT bumped — like every prior additive field.
var influence: int = 0
## Built decoration counts, keyed by DecorationConfig id (String) → count built (int).
## Decorations are REPEATABLE, so this just tracks how many of each you've built (for the
## UI's ×N badge). SIMPLIFICATION: the React model is per-LOCATION
## (built[location].decorations); the port has no multi-location built model, so this is a
## FLAT GLOBAL dict (faithful enough — the costs/grants are identical, only the per-location
## split is dropped). Initialised empty; persisted + defensively restored (int-coerced,
## real ids only). SAVE_VERSION is NOT bumped.
var decorations: Dictionary = {}

## How many of decoration `id` have been built (0 when none / unknown id).
func decoration_count(id: String) -> int:
	return int(decorations.get(id, 0))

## True when decoration `id` can be built RIGHT NOW: it's a real decoration AND the
## inventory covers its coins cost plus every resource item in its cost. Mirrors the React
## canAfford gate (index.tsx).
func can_afford_decoration(id: String) -> bool:
	if not DecorationConfig.has_decoration(id):
		return false
	var cost: Dictionary = DecorationConfig.cost(id)
	if coins < int(cost.get("coins", 0)):
		return false
	for k in cost.keys():
		if String(k) == "coins":
			continue
		if int(inventory.get(k, 0)) < int(cost[k]):
			return false
	return true

## Build decoration `id`: deduct the coins + each cost item from inventory (floored at 0,
## key erased at 0 — the same write pattern as contribute_to_castle / craft / fill_order),
## bump decorations[id], and add the decoration's influence grant to `influence`. Mirrors
## the React BUILD_DECORATION reducer (slice.ts). Returns {ok:true, id, influence} with the
## NEW running influence total on success. On failure returns {ok:false, reason} WITHOUT
## mutating; reason is the FIRST guard that trips: "unknown" → "cant_afford".
func build_decoration(id: String) -> Dictionary:
	if not DecorationConfig.has_decoration(id):
		return {"ok": false, "reason": "unknown"}
	var cost: Dictionary = DecorationConfig.cost(id)
	var coin_cost: int = int(cost.get("coins", 0))
	if coins < coin_cost:
		return {"ok": false, "reason": "cant_afford"}
	for k in cost.keys():
		if String(k) == "coins":
			continue
		if int(inventory.get(k, 0)) < int(cost[k]):
			return {"ok": false, "reason": "cant_afford"}
	# All guards passed — commit: deduct coins, then each cost item.
	coins -= coin_cost
	for k in cost.keys():
		if String(k) == "coins":
			continue
		var remaining: int = maxi(0, int(inventory.get(k, 0)) - int(cost[k]))
		if remaining == 0:
			inventory.erase(k)
		else:
			inventory[k] = remaining
	decorations[id] = decoration_count(id) + 1
	influence += DecorationConfig.influence(id)
	return {"ok": true, "id": id, "influence": influence}

# ── Keepers + Boons (T31 — ADDITIVE, ported from src/keepers.ts + src/features/boons) ──
## The keeper economy: a settlement's biome KEEPER appears once the settlement is built up,
## and the player chooses a path — Coexist (→ Embers) or Drive Out (→ Core Ingots) — which
## unlocks per-path BOONS (permanent perks) bought with those currencies.
##
## CURRENCIES (both uncapped, like coins/runes/influence; persisted defensively):
##   embers       — granted by the Coexist path; spends on coexist boons.
##   core_ingots  — granted by the Drive Out path; spends on driveout boons.
## boons          — the { boon_id -> true } owned-boon map (the GDScript analogue of
##                  React's state.boons). Owned boons' multipliers COMPOSE.
##
## KEEPER RESOLUTION reuses the existing story-flags map (story.flags): resolving settlement
## `type` on `path` sets the `keeper_<type>_<path>` flag (KeeperConfig.flag_for). A keeper is
## "resolved" once ANY keeper_<type>_* flag is set for that type — the choice is FINAL per
## settlement, granted once (give_keeper_reward guards on it).
##
## ADDITIVE GUARANTEE: a fresh game has embers/core_ingots = 0 and an empty boons map, so
## boon_effect_mult returns 1.0 for every channel — the credit_chain coins + the NPC bond-gain
## sites are byte-identical to the pre-T31 economy. No keeper is resolved until a settlement is
## built up. SAVE_VERSION is NOT bumped — old saves load with 0/0/{}.
var embers: int = 0          ## Coexist currency (uncapped); granted by give_keeper_reward(coexist)
var core_ingots: int = 0     ## Drive Out currency (uncapped); granted by give_keeper_reward(driveout)
var boons: Dictionary = {}   ## owned boons: { boon_id:String -> true }

## True when settlement `type`'s keeper has already been resolved (any keeper_<type>_* flag set).
## The choice is final per settlement, so this guards give_keeper_reward from double-granting and
## the encounter trigger from re-firing. (React: the per-zone settlement.keeperPath / flag check.)
func keeper_resolved(type: String) -> bool:
	if not KeeperConfig.has_keeper(type):
		return false
	for k in story.flags.keys():
		var ks: String = String(k)
		if ks.begins_with("keeper_%s_" % type) and bool(story.flags[k]):
			return true
	return false

## The resolved path ("coexist" | "driveout") for settlement `type`, or "" when unresolved.
func keeper_path_for(type: String) -> String:
	for path in ["coexist", "driveout"]:
		if bool(story.flags.get(KeeperConfig.flag_for(type, path), false)):
			return path
	return ""

## True when settlement `type`'s keeper ENCOUNTER should fire RIGHT NOW: it's a real keeper type,
## it isn't already resolved, AND the (home) settlement has built at least the keeper's
## `appears_after_buildings` count. Mirrors React's keeperReadyFor gate (built-building threshold).
## SCOPE: the port has one active settlement (the home FARM = the Deer-Spirit), so the built count
## comes from `buildings.size()` (the home settlement's built spawners). The mine/harbor keepers are
## ported + forward-compatible — this gate answers true for them once those become settlements with
## their own built counts (a later task, T22); today only "farm" is reachable.
func keeper_encounter_ready(type: String) -> bool:
	# Feature flag: keepers fully disabled → the encounter is never ready (no auto-trigger fires).
	if not KeeperConfig.is_enabled():
		return false
	if not KeeperConfig.has_keeper(type):
		return false
	if keeper_resolved(type):
		return false
	return buildings.size() >= KeeperConfig.appears_after_buildings(type)

## GIVE_KEEPER_REWARD (T31 — the port's faithful collapse of React's KEEPER/CONFRONT →
## startKeeperTrial / KEEPER/APPEASE → finalizeKeeperPath into a DIRECT choice; see KeeperConfig's
## scope note). Resolve settlement `type` on `path` ∈ {coexist, driveout}: set the
## `keeper_<type>_<path>` story flag and grant the path's currency (5 Embers for coexist, 5 Core
## Ingots for driveout — from KeeperConfig). FINAL + once-per-type: a second call for an already-
## resolved type is a no-op (no double grant). Guards (FIRST that trips reported): unknown type →
## "unknown"; bad path → "bad_path"; not yet encounter-ready → "not_ready"; already resolved →
## "resolved". On success returns {ok:true, type, path, flag, embers?|core_ingots?} with the amount
## granted; on failure {ok:false, reason} WITHOUT mutating.
func give_keeper_reward(type: String, path: String) -> Dictionary:
	# Feature flag: keepers fully disabled → refuse the grant (defence-in-depth; the UI path is
	# already gated at Main._open_keeper, so this only trips a programmatic/deeplink caller).
	if not KeeperConfig.is_enabled():
		return {"ok": false, "reason": "disabled"}
	if not KeeperConfig.has_keeper(type):
		return {"ok": false, "reason": "unknown"}
	if not KeeperConfig.is_path(path):
		return {"ok": false, "reason": "bad_path"}
	# Already resolved (final) → no-op, no double grant.
	if keeper_resolved(type):
		return {"ok": false, "reason": "resolved"}
	# Must be encounter-ready (built-building threshold met).
	if buildings.size() < KeeperConfig.appears_after_buildings(type):
		return {"ok": false, "reason": "not_ready"}
	# Commit: set the path flag (kingdom-wide, path-gated for boon visibility) + grant the currency.
	var flag: String = KeeperConfig.flag_for(type, path)
	story.flags[flag] = true
	var result: Dictionary = {"ok": true, "type": type, "path": path, "flag": flag}
	if path == "coexist":
		var e: int = KeeperConfig.coexist_embers(type)
		embers += e
		result["embers"] = e
	else:
		var ci: int = KeeperConfig.driveout_core_ingots(type)
		core_ingots += ci
		result["core_ingots"] = ci
	# T22 (ADDITIVE): record the resolved path on the ACTIVE founded zone's record (React's per-zone
	# settlement.keeperPath). home is implicit, so only a recorded (non-home) founded zone carries it;
	# the kingdom-wide type flag (set above) is the authoritative gate either way.
	if settlements.has(map_current) and settlement_type_for_zone(map_current) == type:
		(settlements[map_current] as Dictionary)["keeper_path"] = path
	# T22 (ADDITIVE): resolving the keeper is the OTHER gating step for settlement completion — fold
	# the Hearth-Token grant now (mirrors React's grantEarnedHearthTokens fold after KEEPER/CONFRONT,
	# state.ts). Grants a token only when the active settlement is also built-up enough.
	grant_earned_hearth_tokens()
	# T29 (story engine, ADDITIVE — after the keeper flag is set + the currency granted): post a
	# "keeper_resolved" event so act1_keeper_trial can fire. The beat gates on the keeper_<type>_<path>
	# flag (already set above), so it would fire on the very next event regardless; posting here makes
	# it fire IMMEDIATELY at the resolution. Beats NEVER auto-grant, so this cannot change the economy.
	post_story_event({"type": "keeper_resolved", "keeper_type": type, "path": path})
	return result

# ── Boon purchase + effects (T31 — ported from src/features/boons/slice.ts BOON/PURCHASE) ──

## True when boon `id` is UNLOCKED right now: its catalog PATH flag is set by ANY resolved keeper
## (kingdom-wide, path-gated). Thin forwarder to BoonConfig.boon_id_is_unlocked over story.flags.
func boon_unlocked(id: String) -> bool:
	return BoonConfig.boon_id_is_unlocked(story.flags, id)

## True when boon `id` is owned (purchased).
func has_boon(id: String) -> bool:
	return bool(boons.get(id, false))

## True when boon `id` can be PURCHASED right now (mirrors the BOON/PURCHASE guards, in order):
## it's a real boon, not already owned, its path is unlocked, AND its cost is affordable from the
## current embers / core_ingots.
func can_purchase_boon(id: String) -> bool:
	var boon: Dictionary = BoonConfig.boon_by_id(id)
	if boon.is_empty():
		return false
	if has_boon(id):
		return false
	if not BoonConfig.boon_is_unlocked(story.flags, boon):
		return false
	return BoonConfig.can_afford(embers, core_ingots, boon)

## PURCHASE_BOON (BOON/PURCHASE parity, src/features/boons/slice.ts). Buy boon `id`: gated on
## unlocked + affordable + not-owned → deduct the cost (embers and/or core_ingots, floored at 0)
## and mark it owned. Returns {ok:true, id, embers, core_ingots} (the new balances) on success; on
## failure {ok:false, reason} WITHOUT mutating; reason is the FIRST guard that trips:
## "unknown" → "owned" → "locked" → "cant_afford".
func purchase_boon(id: String) -> Dictionary:
	var boon: Dictionary = BoonConfig.boon_by_id(id)
	if boon.is_empty():
		return {"ok": false, "reason": "unknown"}
	if has_boon(id):
		return {"ok": false, "reason": "owned"}
	if not BoonConfig.boon_is_unlocked(story.flags, boon):
		return {"ok": false, "reason": "locked"}
	if not BoonConfig.can_afford(embers, core_ingots, boon):
		return {"ok": false, "reason": "cant_afford"}
	var cost: Dictionary = boon.get("cost", {})
	embers = maxi(0, embers - int(cost.get("embers", 0)))
	core_ingots = maxi(0, core_ingots - int(cost.get("core_ingots", 0)))
	boons[id] = true
	return {"ok": true, "id": id, "embers": embers, "core_ingots": core_ingots}

## The composed multiplier from OWNED boons whose effect.type matches `effect_type`. Defaults to
## 1.0 (no owned boon of that channel) — so a fresh game leaves every wired site byte-identical.
## Thin forwarder to BoonConfig.boon_effect_mult over the owned `boons` map. The two channels are
## "coin_gain_mult" (credit_chain coins) and "bond_gain_mult" (NPC bond gains).
func boon_effect_mult(effect_type: String) -> float:
	return BoonConfig.boon_effect_mult(boons, effect_type)

# ── Magic Portal (ADDITIVE — ported from src/features/portal) ───────────────────
## Whether the Magic Portal town building has been built. The Portal is the gate that
## unlocks SUMMONING magic tools (summon_magic_tool): it must be built before any summon
## succeeds, mirroring React's `built.portal === true` check in the portal slice (the
## React flag is set by building the Magic Portal town building at src/constants.ts:805,
## cost 2000 coins + 5 runes — see build_portal below). Starts false.
##
## ARCHITECTURE NOTE: the Godot BuildingConfig is a narrow spawner/refiner/hazard catalog
## with INVENTORY-paid costs; the Portal costs coins + RUNES (non-inventory currencies) and
## does not fit that model, so it is NOT a BuildingConfig entry. Instead this flag + the
## build_portal coins/runes gate live directly on GameState, faithfully mirroring React's
## special-cased portal gate (src/state.ts:808 "Special gate: portal requires runes").
##
## Persisted defensively in to_dict / from_dict (a save written before the portal existed
## loads with portal_built = false). SAVE_VERSION is NOT bumped — like every prior additive
## field.
var portal_built: bool = false

## The Magic Portal's one-time build cost (coins + runes) now lives on PortalConfig
## (BUILD_COST_COINS / BUILD_COST_RUNES) — feature tuning belongs with the feature's config.
## Both are NON-inventory currencies on GameState.

## True when the Magic Portal can be built RIGHT NOW: it isn't already built AND the player
## has at least PortalConfig.BUILD_COST_COINS coins and BUILD_COST_RUNES runes. Mirrors the
## React affordability gate for the portal building.
func can_build_portal() -> bool:
	if portal_built:
		return false
	return coins >= PortalConfig.BUILD_COST_COINS and runes >= PortalConfig.BUILD_COST_RUNES

## Build the Magic Portal: deduct PortalConfig.BUILD_COST_COINS coins + BUILD_COST_RUNES runes
## (both floored at 0) and set portal_built = true. Mirrors building the React portal town
## building (coins + runes special gate). Returns {ok:true} on success. On failure returns
## {ok:false, reason} WITHOUT mutating; reason is the FIRST guard that trips:
## "already_built" → "cant_afford".
func build_portal() -> Dictionary:
	if portal_built:
		return {"ok": false, "reason": "already_built"}
	if coins < PortalConfig.BUILD_COST_COINS or runes < PortalConfig.BUILD_COST_RUNES:
		return {"ok": false, "reason": "cant_afford"}
	coins = maxi(0, coins - PortalConfig.BUILD_COST_COINS)
	runes = maxi(0, runes - PortalConfig.BUILD_COST_RUNES)
	portal_built = true
	return {"ok": true}

## True when magic tool `id` can be summoned RIGHT NOW: the Portal is built, `id` is a real
## magic tool, AND the player has at least its Influence cost. Mirrors the React
## SUMMON_MAGIC_TOOL guards (portal built + influence >= cost).
func can_summon_magic_tool(id: String) -> bool:
	if not portal_built:
		return false
	if not PortalConfig.has_tool(id):
		return false
	return influence >= PortalConfig.influence_cost(id)

## Summon magic tool `id`: deduct its Influence cost (floored at 0) and add +1 to the tools
## dict via ToolState.set_count. Mirrors the React SUMMON_MAGIC_TOOL reducer: the count is
## written DIRECTLY into `tools` (set_count, NOT grant_tool) so summoning works for BOTH the
## implementable magic tools (now real ToolConfig members — see below) AND the two deferred
## ones (hourglass/miners_hat, still non-ToolConfig). tool_count(id) reads tools.get(id, 0)
## without a ToolConfig gate, so a summoned magic tool's ×count surfaces correctly in the view.
## Returns {ok:true, id, count, influence} (the new tool count + remaining influence) on
## success. On failure returns {ok:false, reason} WITHOUT mutating; reason is the FIRST guard
## that trips: "no_portal" → "unknown" → "cant_afford".
##
## SCOPE: this ports the summon ECONOMY (pay Influence → own a magic tool). NINE magic tools
## (golden_apple/carrot/idol/sheep, philosophers_stone, magic_wand, magic_seed, magic_fertilizer,
## and — as of T24 — miners_hat) are now REAL ToolConfig members with Godot-native powers
## (transform_tiles / tap_clear_type / restore_turns / fill_bias / reveal_tiles), so once summoned
## they show in the rack and are USABLE through the normal use_tool_on_grid path with no
## special-casing. miners_hat's reveal_tiles reveals hidden boss cells (the hide_resources layer it
## awaited now exists). Only hourglass (undo_move) stays summonable-but-effect-less — it awaits the
## board/inventory-SNAPSHOT milestone and is NOT a ToolConfig member (see PortalConfig's scope note).
func summon_magic_tool(id: String) -> Dictionary:
	if not portal_built:
		return {"ok": false, "reason": "no_portal"}
	if not PortalConfig.has_tool(id):
		return {"ok": false, "reason": "unknown"}
	var cost: int = PortalConfig.influence_cost(id)
	if influence < cost:
		return {"ok": false, "reason": "cant_afford"}
	influence = maxi(0, influence - cost)
	# Write DIRECTLY into the tools dict via ToolState.set_count (mirrors the React slice).
	# set_count (NOT grant_tool) is used because it works uniformly for every PortalConfig id:
	# the 9 implementable magic tools ARE ToolConfig members now (grant_tool would also accept
	# them), but hourglass is still non-ToolConfig (grant_tool would reject it), so set_count keeps
	# a single bypass-the-gate path for the whole catalog.
	tool_state.set_count(id, tool_count(id) + 1)
	return {"ok": true, "id": id, "count": tool_count(id), "influence": influence}

# ── Tools (M8b, the GameState-level tool API) ─────────────────────────────────
## Owned tool charges + the armed tap-target state now live in a composed ToolState (the
## same pattern as `settlement` / `npcs_state`). Tools are GRANTED (grant_tool), CONSUMED
## one charge per use (use_tool_on_grid), and the key is ERASED when its count hits 0 so
## the dict stays a clean "owned, usable" set. The pure board effects live in ToolEffects /
## ToolConfig (M8a); ToolState just owns the inventory + arm/disarm; the credit/quests
## orchestration stays on GameState.use_tool_on_grid. Persisted as the flat top-level
## "tools" key (see to_dict / from_dict), byte-identical to before the extraction.
var tool_state := ToolState.new()

## The legacy `tools` Dictionary view onto the composed ToolState — a LIVE reference (NOT
## a copy), so the many readers that index / iterate / mutate `game.tools` (Main, the
## Inventory screen, tests doing game.tools.clear() / .has() / .size()) keep working
## unchanged. Read-only property (no setter): from_dict rebuilds the ToolState directly and
## no caller reassigns `game.tools` wholesale (verified across the codebase).
var tools: Dictionary:
	get:
		return tool_state.tools

## The armed TAP-target tool awaiting a board cell, or "" when nothing is armed. TRANSIENT —
## never persisted (a reload always starts disarmed). A read/write property forwarding to
## ToolState.pending so external reads (`game.pending_tool`) AND any future write flow
## through to the one source of truth; today only GameState's own arm/use/clear paths set it.
var pending_tool: String:
	get:
		return tool_state.pending
	set(value):
		tool_state.pending = value

## fill_bias transient state (NOT persisted — a save/reload simply clears the bias). The
## fill_bias tools (fertilizer/bird_feed/sapling) ARM a transient spawn bias that
## active_tile_pool() reads: while armed it DOUBLES the target tile's already-eligible
## slots so the NEXT farm fills favour it (faithful to the web's pool-doubling). Deliberately
## absent from to_dict/from_dict — a per-session transient, exactly like pending_tool above.
var fill_bias_target: int = Constants.EMPTY   ## armed bias target Tile, EMPTY when off
var fill_bias_turns: int = 0                  ## remaining biased farm turns
## Id of the tool that armed the live bias ("" when off). The board never shows a fill_bias
## tool as a pending tap-tool, so the HUD reads this to highlight EXACTLY the slot the player
## armed — fertilizer/bird_feed/sapling/magic_fertilizer all funnel into the SAME transient
## bias and fertilizer + magic_fertilizer share WHEAT, so a target → tool reverse map is
## ambiguous. Refund on disarm hands the charge back to this tool. Transient like the bias
## itself (to_dict/from_dict skip it; a save/reload simply clears it).
var fill_bias_tool: String = ""

# ── Achievements (M10, counters + trophies) ───────────────────────────────────
## The trophy system, ported from the React achievements slice
## (src/features/achievements/data.ts), now lives in a composed AchievementState (the same
## pattern as `settlement` / `npcs_state` / `tool_state`). It owns the counters / unlocked
## set / distinct-seen maps + the pure counter/threshold COUNTING and UNLOCK detection;
## the side-effecting REWARD grant (coins +=, grant_tool) stays on GameState.bump_counter,
## wired ADDITIVELY into the existing event sites (credit_chain / fill_order / build /
## damage_boss). Persisted as the three flat top-level keys (achievement_counters /
## achievements_unlocked / _distinct_seen), byte-identical to before the extraction.
var achievement_state := AchievementState.new()

## Live property views onto the composed AchievementState's three maps — read-only getters
## returning the live Dictionaries, so every reader (AchievementsScreen,
## g.achievement_counters.get(...), g._distinct_seen.get(...), tests) is unchanged.
## from_dict rebuilds the AchievementState directly; no caller reassigns these wholesale.

## counter_name:String -> int running total. A missing key reads as 0.
var achievement_counters: Dictionary:
	get:
		return achievement_state.counters
## achievement_id:String -> true for every UNLOCKED trophy. An id present here is already
## earned: bump_counter never re-grants its reward (idempotent unlock).
var achievements_unlocked: Dictionary:
	get:
		return achievement_state.unlocked

## Newly-unlocked achievement dicts awaiting a UI toast (filled by bump_counter, drained
## by Main). Runtime-only — deliberately NOT in to_dict/from_dict.
var achievement_toast_queue: Array = []
## counter_name:String -> {distinct_key:String -> true}. Backs the distinct counters
## (distinct_resources_chained, distinct_buildings_built): a key bumps its counter the FIRST
## time it is seen for that counter and never again.
var _distinct_seen: Dictionary:
	get:
		return achievement_state.distinct

# ── Quests + Almanac (ADDITIVE — ported from src/features/quests + almanac) ──────
## The DETERMINISTIC 6-slot quest system + the almanac XP/tier track, ported from the
## React quests/almanac slices as a roll/tick/claim layer wired ADDITIVELY into the
## existing event sites (credit_chain → collect + chain ticks, fill_order → order tick,
## craft → craft tick, use_tool_on_grid → tool tick). See QuestConfig / AlmanacConfig
## for the ported, port-reachable catalog + pure logic. ADDITIVE GUARANTEE: with no
## quests rolled (an empty `quests`) every tick site is a no-op loop over [], so the
## economy is byte-identical to the pre-quests build and every existing suite stays
## green. Quests are only rolled when ensure_quests() / reroll_quests() is called (the
## UI / Main does this) — a bare GameState.new() carries an empty quest list.
##
## The seed string mirrors React's `${saveSeed}|${year}|${season}` — the port has no
## calendar, so `quest_day` folds year+season into one monotonic int and `quest_seed`
## is the stable per-save seed (default a fixed string so rolls are deterministic +
## headless-testable; a real save could randomise it once at creation, but a fixed
## default keeps determinism contracts simple). reroll_quests() bumps quest_day and
## re-rolls (the port's faithful analogue of React's CLOSE_SEASON reroll, minus seasons).
var quests: Array = []                  ## the rolled quest dicts (QuestConfig shape); [] until rolled
var quest_day: int = 0                  ## monotonic roll index (folds React year+season); bumped by reroll
var quest_seed: String = "hearthwood"   ## the stable per-save seed string (React saveSeed analogue)
## Almanac XP/tier track. xp accumulates (uncapped); level is derived from xp via
## AlmanacConfig.level_for_xp (kept cached so the UI/curve reads cheaply and matches
## React's stored almanac.level). almanac_claimed is the Array of claimed tier ints.
## almanac_structural latches the React `structural` reward flags (startingExtraScythe /
## extraBlueprintSlot / goldSeal / extraTurn) as plain recorded honours (flag -> true) —
## faithful to React (which also just latches them); NO fake UI pretends they DO anything.
var almanac_xp: int = 0
var almanac_level: int = 1
var almanac_claimed: Array = []
var almanac_structural: Dictionary = {}

# ── Story engine (beats / flags / triggers / choices) ─────────────────────────
## Persisted story progress, ported from the React story slice (src/story.ts +
## src/state/storyEffects.ts) as a beat/flag/trigger/choice engine scoped to the
## port's reachable arc (StoryConfig). Wired ADDITIVELY: post_story_event is called at
## the END of each gameplay hook site (credit_chain / try_tier_up / damage_boss /
## build / fill_order) AFTER the existing result is computed, so beats only ENQUEUE
## for a later UI slice — they never alter the economy. Only an EXPLICIT player choice
## (resolve_story_choice) ever grants resources/coins; firing a beat does not.
var story := StoryState.new()

# ── Workers (hire-by-type; threshold / recipe reductions) ──────────────────────
## Hired worker counts, keyed by WorkerConfig id (String) → count (int). Ported
## from the React workers slice (src/features/workers). Wired ADDITIVELY: with EVERY
## count at 0 the reductions below all sum to 0, so credit_chain / craft are
## byte-identical to the pre-workers economy (every existing suite stays green).
## Initialised to all-ids-at-0 via _default_workers(); persisted defensively in
## to_dict / from_dict (a save written before workers existed loads all 0).
var workers: Dictionary = _default_workers()

## The minimum-threshold floor (so stacking workers can't collapse a threshold to 0/1 and
## "explode" the unit math) now lives on WorkerConfig.WORKER_MIN_THRESHOLD — worker tuning
## belongs with the worker config.

## Build the starting workers map: every WorkerConfig id at 0 hires.
static func _default_workers() -> Dictionary:
	var out: Dictionary = {}
	for id in WorkerConfig.all_ids():
		out[id] = 0
	return out

# ── Unified ability channels (T17/T21 — AbilityAggregate) ──────────────────────
## Cached aggregated ability channels. The GDScript analogue of React's
## computeAggregatedAbilities (src/features/workers/aggregate.ts): folds every BUILT building's
## abilities (weight 1) and every ACTIVE+DISCOVERED tile's PASSIVE/on_board_fill abilities
## (weight 1) into the unified channel object (AbilityAggregate.empty_channels()). NULL until
## first read; invalidated (set to {}) on any source change — build / demolish / hire / fire /
## set_active_tile — and lazily recomputed by compute_ability_channels().
##
## WORKERS ARE NOT FED HERE (deliberate, to avoid DOUBLE-COUNTING): the two worker ability kinds
## (threshold_reduce_category, recipe_input_reduce) are already wired through the dedicated
## worker_threshold_reduction → credit_chain and worker_recipe_input_reduction → craft paths.
## Feeding workers into this aggregate AND reading threshold_reduce / recipe_input_reduce from it
## at those sites would apply the worker reduction twice. Workers carry no OTHER channel today
## (WorkerConfig), so excluding them costs nothing — the unified aggregate covers buildings + tiles
## for every channel, and the additive credit_chain/craft sites layer worker + aggregate together.
## hire/fire still invalidate the cache (harmless + future-proof if a worker gains a non-overlapping
## ability that SHOULD aggregate).
##
## NO-OP DEFAULT: a fresh game has no ability buildings built and default-active tiles whose passive
## abilities are empty, so this returns AbilityAggregate.empty_channels() — every channel zero/empty,
## leaving every wired economy site byte-identical. TRANSIENT cache: never persisted.
var _ability_channels_cache: Variant = null

## Drop the cached channels so the next compute_ability_channels() rebuilds. Called from every
## source-mutating path (build / demolish / hire / fire / set_active_tile).
func _invalidate_ability_channels() -> void:
	_ability_channels_cache = null

## The aggregated ability channels for the CURRENT sources (built buildings + active discovered
## tiles), cached until a source changes. Mirrors computeAggregatedAbilities
## (src/features/workers/aggregate.ts): build the source list, fold via AbilityAggregate. Every
## consumer (credit_chain, close_season, craft, the cap / turn-budget / hazard sites) reads the
## channel it needs off the returned Dictionary.
func compute_ability_channels() -> Dictionary:
	if _ability_channels_cache != null:
		return _ability_channels_cache
	var sources: Array = []
	# Buildings: every BUILT building with abilities, weight 1 (builtBuildingSources, aggregate.ts:90).
	for id in buildings:
		var bab: Array = BuildingConfig.abilities(id)
		if bab.is_empty():
			continue
		sources.append({"kind": "building", "source_id": id, "abilities": bab, "weight": 1.0})
	# Active+discovered tiles: PASSIVE / on_board_fill abilities only (discoveredTileSources,
	# aggregate.ts:115-132). Chain-time tile abilities (free_moves / coin) are read per-chain off the
	# chained tile (accrue_chain_abilities / chain_coin_bonus) — feeding them here would DOUBLE-COUNT.
	for src in _active_tile_ability_sources():
		sources.append(src)
	# species_by_category context for threshold_reduce_category expansion: every category → the tiles
	# in it with their produced resource as base_resource (the React speciesByCategory analogue).
	var ctx: Dictionary = {"species_by_category": _species_by_category()}
	_ability_channels_cache = AbilityAggregate.aggregate_abilities(sources, ctx)
	return _ability_channels_cache

## Source descriptors for every tile variant that is currently ACTIVE in its category AND
## discovered, restricted to PASSIVE / on_board_fill abilities (the tile aggregator triggers).
## Mirrors discoveredTileSources (src/features/workers/aggregate.ts:115-132). weight 1 per tile.
func _active_tile_ability_sources() -> Array:
	_ensure_tile_collection()
	var out: Array = []
	for cat in tile_active_by_category.keys():
		var tile_id: String = String(tile_active_by_category.get(cat, ""))
		if tile_id == "":
			continue
		if not bool(tile_discovered.get(tile_id, false)):
			continue
		var all_ab: Array = TileVariantConfig.abilities_of(tile_id)
		if all_ab.is_empty():
			continue
		var passive: Array = []
		for inst in all_ab:
			var aid: String = String((inst as Dictionary).get("id", ""))
			if aid == "":
				continue
			var inst_trigger: String = String((inst as Dictionary).get("trigger", ""))
			if AbilityConfig.is_tile_aggregator_trigger(aid, inst_trigger):
				passive.append(inst)
		if passive.is_empty():
			continue
		out.append({"kind": "tile", "source_id": tile_id, "abilities": passive, "weight": 1.0})
	return out

## category -> Array[{ "base_resource": String }] for threshold_reduce_category expansion. The
## GDScript analogue of TILE_TYPES_BY_CATEGORY (src/features/tileCollection/data.ts) reduced to the
## one field the aggregator needs: each tile's produced resource keyed under its category. Built from
## Constants.category_of + Constants.produced_resource over every catalog Tile (deduped per resource
## so a category contributes each producible resource once).
func _species_by_category() -> Dictionary:
	var out: Dictionary = {}
	for tile in Constants.PRODUCES.keys():
		var cat: String = Constants.category_of(int(tile))
		if cat == "":
			continue
		var res: String = Constants.produced_resource(int(tile))
		if res == "":
			continue
		if not out.has(cat):
			out[cat] = []
		# De-dup by base_resource within the category.
		var seen: bool = false
		for sp in out[cat]:
			if String((sp as Dictionary).get("base_resource", "")) == res:
				seen = true
				break
		if not seen:
			out[cat].append({"base_resource": res})
	return out

## Hired count of worker `id` (0 when none hired / unknown id).
func worker_count(id: String) -> int:
	return int(workers.get(id, 0))

## Total coins a hire of `id` would cost RIGHT NOW (the ramped coins for the next
## hire). Convenience for the UI / affordability checks.
func worker_hire_coins(id: String) -> int:
	return int(WorkerConfig.hire_cost_at(id, worker_count(id)).get("coins", 0))

## True when worker `id` can be hired right now: it's a real type, under its
## max_count, AND the ramped coins + every ramped resource cost is covered.
func can_hire_worker(id: String) -> bool:
	if not WorkerConfig.has_worker(id):
		return false
	if worker_count(id) >= WorkerConfig.max_count(id):
		return false
	var cost: Dictionary = WorkerConfig.hire_cost_at(id, worker_count(id))
	if coins < int(cost.get("coins", 0)):
		return false
	var res: Dictionary = cost.get("resources", {})
	for k in res.keys():
		if int(inventory.get(k, 0)) < int(res[k]):
			return false
	return true

## Hire one worker of `id`: deduct the ramped coins + resources (floored at 0, key
## erased at 0) and increment the count. Returns {ok:true, id, count, cost} on
## success. On failure returns {ok:false, reason} WITHOUT mutating; reason is the
## FIRST guard that trips, in order: "unknown" → "maxed" → "cant_afford".
func hire_worker(id: String) -> Dictionary:
	if not WorkerConfig.has_worker(id):
		return {"ok": false, "reason": "unknown"}
	if worker_count(id) >= WorkerConfig.max_count(id):
		return {"ok": false, "reason": "maxed"}
	var cost: Dictionary = WorkerConfig.hire_cost_at(id, worker_count(id))
	var coin_cost: int = int(cost.get("coins", 0))
	var res: Dictionary = cost.get("resources", {})
	if coins < coin_cost:
		return {"ok": false, "reason": "cant_afford"}
	for k in res.keys():
		if int(inventory.get(k, 0)) < int(res[k]):
			return {"ok": false, "reason": "cant_afford"}
	# All guards passed — commit: deduct coins + each resource, then increment.
	coins -= coin_cost
	for k in res.keys():
		var remaining: int = maxi(0, int(inventory.get(k, 0)) - int(res[k]))
		if remaining == 0:
			inventory.erase(k)
		else:
			inventory[k] = remaining
	workers[id] = worker_count(id) + 1
	# T17/T21: invalidate the unified-ability cache (harmless today — workers are excluded from
	# the aggregate to avoid double-counting their threshold/recipe channels — but keeps the cache
	# correct if a worker ever gains a non-overlapping aggregator ability).
	_invalidate_ability_channels()
	return {"ok": true, "id": id, "count": worker_count(id), "cost": cost}

## Fire one worker of `id`: decrement the count by 1 (floored at 0). NO refund —
## consistent with demolish() (which lists refunds as an open design question), so
## firing is free but un-refunded for this first pass. Returns {ok:true, id, count}
## on success, else {ok:false, reason} ("unknown" | "none" when count is already 0).
func fire_worker(id: String) -> Dictionary:
	if not WorkerConfig.has_worker(id):
		return {"ok": false, "reason": "unknown"}
	if worker_count(id) <= 0:
		return {"ok": false, "reason": "none"}
	workers[id] = worker_count(id) - 1
	# T17/T21: invalidate the unified-ability cache (see hire_worker note).
	_invalidate_ability_channels()
	return {"ok": true, "id": id, "count": worker_count(id)}

## Total threshold reduction applied to a chain of `tile_type`: the SUM over every
## threshold_reduce_category worker whose target category == this tile's category of
## (amount × hired count). 0 when no matching worker is hired — which is what makes
## the workers layer additive (credit_chain at 0 hires is unchanged).
func worker_threshold_reduction(tile_type: int) -> int:
	var cat: String = Constants.category_of(tile_type)
	if cat == "":
		return 0
	var total: int = 0
	for id in WorkerConfig.all_ids():
		if WorkerConfig.ability_kind(id) != WorkerConfig.KIND_THRESHOLD_REDUCE_CATEGORY:
			continue
		if WorkerConfig.ability_category(id) != cat:
			continue
		total += WorkerConfig.ability_amount(id) * worker_count(id)
	return total

## Total input reduction applied to `input` of `recipe_id`: the SUM over every
## recipe_input_reduce worker targeting that recipe+input of (amount × hired count).
## 0 when no matching worker is hired (craft at 0 hires is unchanged).
func worker_recipe_input_reduction(recipe_id: String, input: String) -> int:
	var total: int = 0
	for id in WorkerConfig.all_ids():
		if WorkerConfig.ability_kind(id) != WorkerConfig.KIND_RECIPE_INPUT_REDUCE:
			continue
		if WorkerConfig.ability_recipe(id) != recipe_id:
			continue
		if WorkerConfig.ability_input(id) != input:
			continue
		total += WorkerConfig.ability_amount(id) * worker_count(id)
	return total

## Seed the order generator so generate_order / refill_orders are reproducible.
func seed_orders(s: int) -> void:
	rng.seed = s

## Apply one resolved chain to the run economy and return a summary dict.
## The EFFECTIVE upgrade threshold for chaining `tile_type`: the raw Constants threshold
## minus the worker threshold_reduce_category reduction and the unified aggregate's
## threshold_reduce channel, floored at WORKER_MIN_THRESHOLD. This is the SAME math
## credit_chain banks units with, exposed so the HUD's live chain readout (React:
## GameScene's effectiveThresholds → ChainView) always shows the numbers the resolve
## will actually credit. Both reductions are 0 for a fresh game → returns the raw
## threshold, byte-identical to the pre-workers economy.
##
## Workers (ADDITIVE): threshold_reduce_category workers shave tiles off the matching
## chain; the WORKER_MIN_THRESHOLD floor keeps a fully-staffed category from collapsing
## the threshold to 0/1 and exploding the units. T17/T21 (ADDITIVE): the aggregate's
## threshold_reduce channel (BUILDINGS + TILES — e.g. Observatory threshold_reduce_category
## gem -1) is keyed by RESOURCE (the React effectiveThresholds key) and stacks ON TOP of
## the worker reduction; workers are NOT in the aggregate, so there is no double-count.
## A hazard's NO_THRESHOLD sentinel still has the reductions applied (matching the old
## inline credit_chain math exactly) — at ~2^30 the result is still "never yields units".
func effective_threshold(tile_type: int) -> int:
	var threshold: int = Constants.threshold_for(tile_type)
	if threshold <= 0:
		return threshold
	var resource: String = Constants.produced_resource(tile_type)
	var agg_thresh_reduce: int = int(floor(float(compute_ability_channels()["threshold_reduce"].get(resource, 0.0))))
	return maxi(WorkerConfig.WORKER_MIN_THRESHOLD, threshold - worker_threshold_reduction(tile_type) - agg_thresh_reduce)

## Mutates inventory/progress, increments coins and turn.
func credit_chain(tile_type: int, chain_len: int) -> Dictionary:
	var resource: String = Constants.produced_resource(tile_type)
	# The worker/aggregate-reduced threshold (see effective_threshold above — the
	# extraction keeps this math and the HUD's live readout in lockstep). The
	# threshold <= 0 branch below (defensive) is untouched.
	var threshold: int = effective_threshold(tile_type)
	var new_progress: int = int(progress.get(resource, 0)) + chain_len
	var units: int = 0
	if threshold > 0:
		units = new_progress / threshold        # int division floors for positives
		progress[resource] = new_progress % threshold
	else:
		# Defensive: a non-positive threshold never yields units; progress carries.
		progress[resource] = new_progress
	# T17/T21 (ADDITIVE): bonus_yield channel — extra copies of the produced resource when a chain
	# producing it is collected (React GameScene bonusYields[res.key], src/GameScene.ts:1777-1788).
	# React keys bonus_yield by the chained TILE key (tile_tree_oak, …), so look it up by this tile's
	# string key. EMPTY for a fresh game → 0 extra. The bonus is added alongside the threshold units
	# and clamped together to the settlement cap (matching React's wouldGain = gained + bonus, capped).
	var bonus_units: int = int(round(float(compute_ability_channels()["bonus_yield"].get(Constants.string_key(tile_type), 0.0))))
	var total_units: int = units + bonus_units
	if total_units > 0:
		# Enforce the EFFECTIVE storage cap: tier cap + the Granary's inventory_cap_bonus
		# (effective_cap == settlement.cap() for a fresh game). A resource can never exceed it.
		var capped: int = mini(int(inventory.get(resource, 0)) + total_units, effective_cap())
		inventory[resource] = capped
	# Coins simplified for M2 — the React per-tile `value` economy is deferred to
	# M3. Each resolved chain earns at least 1 coin, scaling with chain length.
	# T5: PLUS the chained variant's coin abilities (coin_bonus_flat / coin_bonus_per_tile),
	# matching the React coin-hook bonus (src/state.ts:393-398: coinHookBonus added to the
	# base chain coins). chain_coin_bonus is 0 for a tile with no coin ability.
	# chain_coin_bonus is the chained TILE's own coin abilities (the per-chain tile path, T5).
	# T17/T21 (ADDITIVE): PLUS the aggregate's coin_bonus channels from BUILDINGS (coinHookBonus =
	# coinBonusFlat + coinBonusPerTile * chain, src/state.ts:393-398). Buildings feed every ability
	# regardless of trigger (only TILES are trigger-filtered into the aggregate), so building coin
	# abilities surface here; the chained tile's coin abilities are NOT in this aggregate (they're the
	# per-chain path), so there is NO double-count. Both are 0 for a fresh game → byte-identical.
	var agg_ch: Dictionary = compute_ability_channels()
	var agg_coin_bonus: int = int(agg_ch["coin_bonus_flat"]) + int(agg_ch["coin_bonus_per_tile"]) * chain_len
	# M2 placeholder coin formula (Constants.CHAIN_COIN_MIN / CHAIN_COIN_DIVISOR) — the React
	# per-tile `value` economy is deferred to M3. Integer division is deliberate; do NOT change.
	var coins_gain: int = maxi(Constants.CHAIN_COIN_MIN, chain_len / Constants.CHAIN_COIN_DIVISOR) + chain_coin_bonus(tile_type, chain_len) + agg_coin_bonus
	# T31 (ADDITIVE): owned Coexist/DriveOut BOONS that grant coin_gain_mult multiply the chain's
	# coin reward (React boon coin_gain_mult applied to the chain-collected coins). boon_effect_mult
	# returns 1.0 for a fresh game (no boons owned) → coins_gain unchanged → byte-identical. Floored
	# back to int so coins stay whole; the result is the final credited gain (reported below).
	var coin_mult: float = boon_effect_mult(BoonConfig.COIN_GAIN_MULT)
	if coin_mult != 1.0:
		coins_gain = int(floor(float(coins_gain) * coin_mult))
	coins += coins_gain
	turn += 1
	# ── T3 + T5: Tile Collection chain folding (ADDITIVE, after the economy is credited) ──
	# Ported from applyTileCollectionChainEffects (src/state.ts:168-223). The chained tile's
	# KEY (the React CHAIN_COLLECTED `key`) is the variant's own string id — for a board tile
	# baseResource == id, so the chain/research discovery keys off the chained tile's id.
	# A hazard tile (RAT/RUBBLE/COPPER_ORE) has no catalog id → "" → both folds are no-ops.
	var chained_id: String = TileVariantConfig.id_for_tile(tile_type)
	if chained_id != "":
		_discover_from_chain(chained_id, chain_len)
	# Per-tile FREE-MOVES ability accrual (free_moves + free_turn_if_chain). Accrued PER
	# CHAIN from the chained variant's abilities, exactly like the React reducer reads
	# TILE_TYPES_MAP[key].effects at the CHAIN_COLLECTED site (src/state.ts:208-216).
	accrue_chain_abilities(tile_type, chain_len)
	# T17/T21: BUILDING free_moves channel (on_chain_collect — a building granting N free moves per
	# chain). The chained TILE's free_moves are the per-chain path above (accrue_chain_abilities); the
	# building free_moves come from the unified aggregate (buildings feed every ability, tiles only
	# their passive ones — so the chained tile is NOT in this aggregate's free_moves → no double-count).
	# 0 for a fresh game (no free_moves building). free_moves_if_chain (also a building channel) grants
	# 1 extra when chain_len >= min_chain.
	var agg_fm: Dictionary = compute_ability_channels()
	if int(agg_fm["free_moves"]) > 0:
		tile_free_moves += int(agg_fm["free_moves"])
	var fmic: Dictionary = agg_fm["free_moves_if_chain"]
	if not fmic.is_empty() and chain_len >= int(fmic.get("min_chain", 0)):
		tile_free_moves += int(fmic.get("count", 1))
	# ── M10 achievements (ADDITIVE, after the economy is fully credited) ─────────
	# Every resolved chain is one chain (bump by 1). The produced resource feeds the
	# distinct counter (only first sighting counts; "" for a hazard tile is ignored by
	# bump_counter's empty-key guard). The tile's category feeds a per-category /
	# mine quantity counter that counts TILES — bump by chain_len (React "Harvest 50
	# <things>" counts tiles). Hazard tiles (rat/rubble) map to no counter → skipped.
	bump_counter("chains_committed")
	bump_counter("distinct_resources_chained", 1, resource)
	var cat_counter: String = AchievementConfig.counter_for_category(Constants.category_of(tile_type))
	if cat_counter != "":
		bump_counter(cat_counter, chain_len)
	# ── Story engine (ADDITIVE, after the economy is fully credited) ─────────────
	# Post a "chain" event so resource-THRESHOLD beats (act1_light_hearth on
	# inventory.hay_bundle, act2_quarry_foothold on inventory.block, …) can fire off
	# the now-updated inventory snapshot. The summary below is UNCHANGED — only enqueue.
	post_story_event({"type": "chain", "resource": resource, "units": units})
	# ── Quests (ADDITIVE, after the economy is fully credited) ───────────────────
	# A resolved chain ticks two quest events: COLLECT (keyed by the chained tile's
	# STRING key, amount = chain length — matching React's collect tick on the tile key
	# with amount=gained) and CHAIN (length = chain_len, for the chain-length quests).
	# With an empty quest board both are no-op loops over []. The summary above is
	# UNCHANGED. NOTE: a hazard tile (RAT/RUBBLE) has STRING key "rat"/"rubble" — no
	# collect template targets those keys, so the collect tick simply matches nothing.
	_tick_quests({"type": "collect", "key": Constants.string_key(tile_type), "amount": chain_len})
	_tick_quests({"type": "chain", "length": chain_len})
	# ── T30 run telemetry (ADDITIVE, after the economy is fully credited) ────────
	# Accumulate ONLY while a bounded run is live (React runSummary only ticks between FARM/ENTER and
	# CLOSE_SEASON). Mirrors the React CHAIN_COLLECTED accumulation (runSummary slice.ts:130-172):
	# +1 chain, +produced units to resourcesGained[resource] + totalUpgrades, +coins to totalCoinGain,
	# and a longest-chain "best moment" snapshot (the LONGEST chain by length, with its key + reward).
	if farm_run_active:
		var produced: int = total_units   # units + bonus_units actually banked
		run_chains_played += 1
		run_total_upgrades += produced
		run_total_coins += coins_gain
		if produced > 0 and resource != "":
			run_resources_gained[resource] = int(run_resources_gained.get(resource, 0)) + produced
		# Best moment = the LONGEST single chain (React: length > biggest.count). Ties keep the first.
		if chain_len > run_longest_chain:
			run_longest_chain = chain_len
			run_best_chain = {
				"count": chain_len,
				"key": Constants.string_key(tile_type),
				"coin_gain": coins_gain,
				"upgrades": produced,
				"gained": produced,
			}
	return {
		"resource": resource,
		"units": units,
		"bonus_units": bonus_units,   # T17/T21 bonus_yield extra copies (0 without a yield building)
		"coins_gain": coins_gain,
		"length": chain_len,
		"tile_type": tile_type,
	}

## Collected whole-unit count of a resource (0 when never collected).
func qty(resource: String) -> int:
	return int(inventory.get(resource, 0))

## The EFFECTIVE per-resource inventory cap: the settlement tier cap PLUS the unified aggregate's
## inventory_cap_bonus channel (the Granary's +300). Mirrors React currentCap (src/utils.ts:166-173):
## base cap + inventoryCapBonus when the channel is positive. inventory_cap_bonus is 0 for a fresh
## game (no Granary), so this == settlement.cap() and every cap-clamped write is byte-identical.
## Every resource-STORE site (credit_chain / craft / buy) clamps to this rather than the raw tier cap.
func effective_cap() -> int:
	return settlement.cap() + int(compute_ability_channels()["inventory_cap_bonus"])

# ── Tile Collection: active variants + discovery + abilities ────────────────────────
## The GDScript analogue of the React `tileCollection` reducer actions (SET_ACTIVE_TILE /
## BUY_TILE / chain+research+building discovery) and the per-tile-ability accrual the
## CHAIN_COLLECTED site does (src/state.ts applyTileCollectionChainEffects). TileVariantConfig
## is the pure data layer; this is the live mutation + query surface the board/HUD/UI use.

## Seed the tile-collection slice on first use (idempotent). Mirrors React's
## defaultTileCollectionSlice (src/state/helpers.ts:104-119): every `default`-method tile
## (plus the port base tiles) starts DISCOVERED, and each category's active variant is its
## base tile. Lazy so a bare GameState.new() round-trips trivially and from_dict can overlay.
func _ensure_tile_collection() -> void:
	if _tile_collection_seeded:
		return
	_tile_collection_seeded = true
	# Default active variant per category = the base tile (React activeByCategory seed).
	if tile_active_by_category.is_empty():
		tile_active_by_category = TileVariantConfig.default_active_by_category().duplicate()
	# Discovered set = every default-method tile + the port base tiles.
	if tile_discovered.is_empty():
		for id in TileVariantConfig.default_discovered():
			tile_discovered[id] = true

## True when tile variant `id` is discovered (unlocked). Seeds the slice on first read.
func is_tile_discovered(id: String) -> bool:
	_ensure_tile_collection()
	return bool(tile_discovered.get(id, false))

## The active variant TILE (Constants.Tile enum) for category `cat`. Defaults to the
## category's base tile; falls back to Constants.EMPTY for an unknown category. Mirrors
## the React activeByCategory lookup + getActivePool substitution (effects.ts:118-148).
func active_tile_for_category(cat: String) -> int:
	_ensure_tile_collection()
	var id: String = String(tile_active_by_category.get(cat, ""))
	if id == "" or not TileVariantConfig.is_tile(id):
		return Constants.EMPTY
	return TileVariantConfig.tile_for(id)

## The active variant string id for category `cat` ("" when none/unknown).
func active_tile_id_for_category(cat: String) -> String:
	_ensure_tile_collection()
	return String(tile_active_by_category.get(cat, ""))

## SET_ACTIVE_TILE (src/state.ts:1349-1369). Set the active variant for `cat` to variant
## `tile_id`. Guards (mirroring React, in order): unknown variant → false; the variant's
## category must equal `cat` → false; the variant must be DISCOVERED → false; already
## active → true (no-op). On success the variant becomes the category's board tile. Returns
## true when the active variant is `tile_id` after the call.
func set_active_tile(cat: String, tile_id: String) -> bool:
	_ensure_tile_collection()
	if not TileVariantConfig.is_tile(tile_id):
		return false
	var def: Dictionary = TileVariantConfig.by_id(tile_id)
	if String(def.get("category", "")) != cat:
		return false                                    # cross-category
	if not bool(tile_discovered.get(tile_id, false)):
		return false                                    # undiscovered
	tile_active_by_category[cat] = tile_id
	# T17/T21: the active variant for a category changed — its passive abilities may differ, so
	# drop the unified-ability cache (a tile's passive/on_board_fill abilities feed the aggregate).
	_invalidate_ability_channels()
	return true

## BUY_TILE (src/state.ts:1396-1413). If `tile_id` is a `buy`-method variant, not already
## discovered, and coins cover its coinCost: spend the coins, mark it discovered, return
## true. Otherwise no mutation, return false. (React folds the buy into discovered ONLY —
## it does NOT auto-activate; the player activates separately via SET_ACTIVE_TILE.)
func buy_tile(tile_id: String) -> bool:
	_ensure_tile_collection()
	if not TileVariantConfig.is_tile(tile_id):
		return false
	var d: Dictionary = TileVariantConfig.discovery_of(tile_id)
	if String(d.get("method", "")) != "buy":
		return false
	if bool(tile_discovered.get(tile_id, false)):
		return false                                    # already discovered
	var cost: int = int(d.get("coinCost", 0))
	if coins < cost:
		return false
	coins -= cost
	tile_discovered[tile_id] = true
	return true

## Mark variant `id` discovered directly (the TILE_DISCOVERED reducer + daily-reward
## unlockTile path, src/state.ts:1307-1318/1371-1382). No cost, no method check — used by
## reward grants. Returns true when this call newly discovered it (false if unknown/already).
func discover_tile(id: String) -> bool:
	_ensure_tile_collection()
	if not TileVariantConfig.is_tile(id):
		return false
	if bool(tile_discovered.get(id, false)):
		return false
	tile_discovered[id] = true
	return true

## Accrue `amount` research toward `research`-method variant `id`; at >= researchAmount the
## variant is discovered. Mirrors the research branch of applyTileCollectionChainEffects
## (src/state.ts:191-206): progress is CAPPED at researchAmount; crossing the cap discovers
## the variant. Returns true when this call newly discovered it.
func research_tile(id: String, amount: int) -> bool:
	_ensure_tile_collection()
	if not TileVariantConfig.is_tile(id):
		return false
	var d: Dictionary = TileVariantConfig.discovery_of(id)
	if String(d.get("method", "")) != "research":
		return false
	if bool(tile_discovered.get(id, false)):
		return false
	var goal: int = int(d.get("researchAmount", 0))
	var cur: int = int(tile_research_progress.get(id, 0))
	var next: int = cur + maxi(0, amount)
	tile_research_progress[id] = mini(next, goal)
	if next >= goal:
		tile_discovered[id] = true
		return true
	return false

## The abilities of the chained tile (the active variant in play). Mirrors React reading
## TILE_TYPES_MAP[key].effects/abilities for the chained tile key (src/state.ts:208-216,
## 393-396). Returns the variant's abilities Array ([] for a tile with no catalog entry,
## e.g. RAT/RUBBLE/COPPER_ORE).
func tile_abilities(tile_type: int) -> Array:
	var id: String = TileVariantConfig.id_for_tile(tile_type)
	if id == "":
		return []
	return TileVariantConfig.abilities_of(id)

## The abilities of the currently active variant for category `cat` ([] for none).
func active_tile_abilities(cat: String) -> Array:
	var tile: int = active_tile_for_category(cat)
	if tile == Constants.EMPTY:
		return []
	return tile_abilities(tile)

## Banked free moves available to spend (the HUD reads this; note_farm_turn consumes it).
func free_moves() -> int:
	_ensure_tile_collection()
	return tile_free_moves

## Per-tile ability accrual for a resolved chain of `tile_type` (the chained variant) of
## length `chain_len`. Ported from applyTileCollectionChainEffects (src/state.ts:208-216):
## the chained tile's free_moves ability adds its count; its free_turn_if_chain ability
## adds 1 when `chain_len >= minChain`. Both accrue PER CHAIN (NOT seeded per season — the
## React reducer reads the chained tile's effects at the CHAIN_COLLECTED site, every chain).
## Returns the number of free moves this chain granted (also added to tile_free_moves).
##
## NOTE on WHEN (the data.ts descriptions SAY "per season", but the reducer GRANTS per
## chain — implementation wins, per the brief). coin abilities are credited inside
## credit_chain's coin math, not here.
func accrue_chain_abilities(tile_type: int, chain_len: int) -> int:
	_ensure_tile_collection()
	var granted: int = 0
	for ab in tile_abilities(tile_type):
		var aid: String = String((ab as Dictionary).get("id", ""))
		var params: Dictionary = (ab as Dictionary).get("params", {})
		match aid:
			"free_moves":
				granted += maxi(0, int(params.get("count", 0)))
			"free_turn_if_chain":
				var min_chain: int = int(params.get("minChain", 0))
				if min_chain > 1 and chain_len >= min_chain:
					granted += 1
			_:
				pass   # pool_weight is inert in production (see TileVariantConfig header);
				# coin_bonus_* are applied in credit_chain's coin math, not here.
	tile_free_moves += granted
	return granted

## The flat + per-tile coin bonus a chain of `tile_type`/`chain_len` earns from the chained
## variant's coin abilities. Ported from src/state.ts:393-396:
##   coinHookBonus = coinBonusFlat + coinBonusPerTile * effectiveChain
## Returns the extra coins (0 when the chained tile has no coin ability).
func chain_coin_bonus(tile_type: int, chain_len: int) -> int:
	var flat: int = 0
	var per_tile: int = 0
	for ab in tile_abilities(tile_type):
		var aid: String = String((ab as Dictionary).get("id", ""))
		var params: Dictionary = (ab as Dictionary).get("params", {})
		match aid:
			"coin_bonus_flat":
				flat += maxi(0, int(params.get("amount", 0)))
			"coin_bonus_per_tile":
				per_tile += maxi(0, int(params.get("amount", 0)))
			_:
				pass
	return flat + per_tile * chain_len

## Fold chain-method + research-method discovery for a resolved chain of `resource_key`
## (the chained tile's key) of length `chain_len`. Ported from applyTileCollectionChainEffects
## (src/state.ts:176-206): chain-method variants keyed off this resource discover when the
## chain is long enough; research-method variants keyed off it accrue progress (capped),
## discovering at the goal. A newly-discovered variant whose category has NO active variant
## yet becomes that category's active variant (React: activeByCategory[cat] ??= id). Returns
## an Array[String] of the variant ids newly discovered by this chain (in discovery order).
func _discover_from_chain(resource_key: String, chain_len: int) -> Array:
	_ensure_tile_collection()
	var newly: Array = []
	# Chain-method discovery (TileVariantConfig.discover_from_chain is the pure helper).
	for id in TileVariantConfig.discover_from_chain(tile_discovered, resource_key, chain_len):
		tile_discovered[id] = true
		newly.append(id)
		var cat: String = String(TileVariantConfig.by_id(id).get("category", ""))
		if cat != "" and String(tile_active_by_category.get(cat, "")) == "":
			tile_active_by_category[cat] = id
	# Research-method discovery: accrue toward any research variant keyed off this resource.
	for id in TileVariantConfig.all():
		var d: Dictionary = TileVariantConfig.discovery_of(id)
		if String(d.get("method", "")) != "research":
			continue
		if String(d.get("researchOf", "")) != resource_key:
			continue
		if bool(tile_discovered.get(id, false)):
			continue
		var goal: int = int(d.get("researchAmount", 0))
		var cur: int = int(tile_research_progress.get(id, 0))
		var nxt: int = cur + chain_len
		tile_research_progress[id] = mini(nxt, goal)
		if nxt >= goal:
			tile_discovered[id] = true
			newly.append(id)
			var rcat: String = String(d.get("category", TileVariantConfig.by_id(id).get("category", "")))
			rcat = String(TileVariantConfig.by_id(id).get("category", ""))
			if rcat != "" and String(tile_active_by_category.get(rcat, "")) == "":
				tile_active_by_category[rcat] = id
	return newly

## Fold building-method discovery for the building `building_id` the player just built.
## Ported from discoverTileTypesFromBuilding + its fold in the BUILD reducer
## (src/state.ts:859-873). A newly-discovered variant whose category has no active variant
## becomes that category's active variant. Returns the Array[String] of newly-discovered ids.
func _discover_from_building(building_id: String) -> Array:
	_ensure_tile_collection()
	var newly: Array = []
	for id in TileVariantConfig.discover_from_building(tile_discovered, building_id):
		tile_discovered[id] = true
		newly.append(id)
		var cat: String = String(TileVariantConfig.by_id(id).get("category", ""))
		if cat != "" and String(tile_active_by_category.get(cat, "")) == "":
			tile_active_by_category[cat] = id
	return newly

## Save helpers: ensure the slice is seeded, then return an independent copy for to_dict.
func _tile_collection_dict_active() -> Dictionary:
	_ensure_tile_collection()
	return tile_active_by_category.duplicate()

func _tile_collection_dict_discovered() -> Dictionary:
	_ensure_tile_collection()
	return tile_discovered.duplicate()

func _tile_collection_dict_research() -> Dictionary:
	_ensure_tile_collection()
	return tile_research_progress.duplicate()

# ── Town tier ladder ────────────────────────────────────────────────────────

## True when the settlement is below max tier AND inventory holds at least every
## resource in the next tier-up cost at the required quantity.
func can_tier_up() -> bool:
	if settlement.is_max_tier():
		return false
	var cost: Dictionary = settlement.next_tier_cost()
	for k in cost.keys():
		if int(inventory.get(k, 0)) < int(cost[k]):
			return false
	return true

## Attempt to advance the settlement one tier. On success, deduct each cost
## resource (floored at 0), bump the tier, and return ok=true with the new tier.
## On failure, leave inventory and tier untouched and return ok=false with a
## reason ("maxed" | "insufficient").
func try_tier_up() -> Dictionary:
	if settlement.is_max_tier():
		return {"ok": false, "reason": "maxed"}
	if not can_tier_up():
		return {"ok": false, "reason": "insufficient"}
	var cost: Dictionary = settlement.next_tier_cost()
	for k in cost.keys():
		var remaining: int = maxi(0, int(inventory.get(k, 0)) - int(cost[k]))
		if remaining == 0:
			inventory.erase(k)
		else:
			inventory[k] = remaining
	settlement.tier += 1
	# Story engine (ADDITIVE, after the tier is committed): post a "tier_up" event so
	# tier-driven beats (act1_hamlet on event.tier>=2, act2_city_expedition on >=5) can
	# fire. The success result below is UNCHANGED — only enqueue.
	post_story_event({"type": "tier_up", "tier": settlement.tier})
	return {"ok": true, "tier": settlement.tier, "name": settlement.tier_name()}

# ── Spawner buildings (board-pool gating) ─────────────────────────────────────

## True when spawner `id` is currently placed.
func has_building(id: String) -> bool:
	return buildings.has(id)

## Plots occupied by placed buildings.
func plots_used() -> int:
	return buildings.size()

## Free building plots remaining at the current tier (never negative).
func plots_free() -> int:
	return maxi(0, settlement.plots() - plots_used())

## True when `id` is a real, unbuilt spawner whose unlock tier is reached, there
## is a free plot for it, and the inventory covers its full cost.
func can_build(id: String) -> bool:
	if not BuildingConfig.is_building(id):
		return false
	# T22 founding GATE (React BUILD, state.ts:797): can't build at a zone that isn't founded.
	# home is always founded → no-op for the home-only game.
	if not is_settlement_founded(map_current):
		return false
	if has_building(id):
		return false
	if settlement.tier < BuildingConfig.unlock_tier(id):
		return false
	# M3h: the rats-HAZARD buildings (Ratcatcher / Master Ratcatcher) are buildable
	# only once rats are a live threat — you can't pre-build a Ratcatcher before
	# Town 2 is done. Gated ALONGSIDE the unlock-tier check (same "locked" class).
	if BuildingConfig.is_hazard_building(id) and not rats_enabled():
		return false
	if plots_free() <= 0:
		return false
	var cost: Dictionary = BuildingConfig.building_cost(id)
	for k in cost.keys():
		if int(inventory.get(k, 0)) < int(cost[k]):
			return false
	return true

## Place spawner `id`: deduct its cost (floored at 0), occupy a plot, and add its
## category to the board pool. Returns {ok:true, id, name} on success. On failure
## returns {ok:false, reason} WITHOUT mutating; reason is the FIRST guard that
## trips, in order: "unknown" → "exists" → "locked" → "no_plot" → "insufficient".
func build(id: String) -> Dictionary:
	if not BuildingConfig.is_building(id):
		return {"ok": false, "reason": "unknown"}
	# T22 founding GATE (React BUILD, state.ts:797): can't build at an unfounded zone (home exempt).
	# Reported with "unfounded" so Main can prompt the founder flow.
	if not is_settlement_founded(map_current):
		return {"ok": false, "reason": "unfounded"}
	if has_building(id):
		return {"ok": false, "reason": "exists"}
	if settlement.tier < BuildingConfig.unlock_tier(id):
		return {"ok": false, "reason": "locked"}
	# M3h: rats-HAZARD buildings are locked until rats are enabled (Town 2 done).
	# Reported with the same "locked" reason as the tier gate — both mean "not yet".
	if BuildingConfig.is_hazard_building(id) and not rats_enabled():
		return {"ok": false, "reason": "locked"}
	if plots_free() <= 0:
		return {"ok": false, "reason": "no_plot"}
	var cost: Dictionary = BuildingConfig.building_cost(id)
	for k in cost.keys():
		if int(inventory.get(k, 0)) < int(cost[k]):
			return {"ok": false, "reason": "insufficient"}
	# All guards passed — commit: deduct cost, then occupy the plot.
	for k in cost.keys():
		var remaining: int = maxi(0, int(inventory.get(k, 0)) - int(cost[k]))
		if remaining == 0:
			inventory.erase(k)
		else:
			inventory[k] = remaining
	buildings.append(id)
	# T17/T21: a built building changes the unified ability sources — drop the cache so the
	# next compute_ability_channels rebuilds with this building's abilities folded in.
	_invalidate_ability_channels()
	# T3: building-method tile discovery (ADDITIVE, after the build is committed). Mirrors the
	# React BUILD reducer's discoverTileTypesFromBuilding fold (src/state.ts:859-873): owning
	# the building discovers its `building`-method variants (e.g. the Kitchen → Broccoli).
	_discover_from_building(id)
	# M10 achievements (ADDITIVE): a DISTINCT building id → +1 on the first build of
	# each id (build() already rejects a re-build of an existing id, but the distinct
	# guard makes the counter robust even if a future caller demolishes + rebuilds).
	bump_counter("distinct_buildings_built", 1, id)
	# Story engine (ADDITIVE, after the build is committed): post a "building_built"
	# event so build-gated beats (act1_lumber_raised on event.id=="lumber_camp",
	# act2_kitchen on "kitchen") can fire. The success result below is UNCHANGED.
	post_story_event({"type": "building_built", "id": id})
	# T22 (ADDITIVE, after the build): a build may have pushed the ACTIVE settlement past its keeper
	# threshold — but a settlement only COMPLETES once its keeper is RESOLVED, so this grants a token
	# only when both hold. Mirrors React's grantEarnedHearthTokens fold after BUILD (state.ts:889).
	# A fresh / unresolved game grants nothing → economy unchanged.
	grant_earned_hearth_tokens()
	return {"ok": true, "id": id, "name": BuildingConfig.building_name(id)}

## Remove spawner `id`, freeing its plot and dropping its category from the pool.
## NO resource refund — the Direction lists demolish refunds as an open design
## question, so for this first pass demolition is free but un-refunded. Returns
## {ok:true, id} on success or {ok:false, reason:"not_built"} when `id` isn't placed.
func demolish(id: String) -> Dictionary:
	if not has_building(id):
		return {"ok": false, "reason": "not_built"}
	buildings.erase(id)
	# T17/T21: removing a building changes the ability sources — drop the cache.
	_invalidate_ability_channels()
	return {"ok": true, "id": id}

# ── Refining (recipe crafting at refiner buildings) ───────────────────────────

## True when `recipe_id` exists, its station building is built, the settlement tier
## clears the recipe's tier gate, AND inventory covers every input at the required
## quantity.
func can_craft(recipe_id: String) -> bool:
	if not RecipeConfig.is_recipe(recipe_id):
		return false
	if not has_building(RecipeConfig.recipe_station(recipe_id)):
		return false
	# T15: recipe-level tier gate. React tiers (1/2/3) map to a minimum settlement tier
	# (RecipeConfig.RECIPE_TIER_MIN_SETTLEMENT). Tier-1 recipes map to Camp, so this is a
	# no-op for BREAD/SUPPLIES (both React tier 1) at the default Camp tier — they stay
	# craftable exactly as before. Higher-tier recipes need a more advanced town.
	if settlement.tier < RecipeConfig.recipe_min_settlement_tier(recipe_id):
		return false
	# Workers (ADDITIVE): mirror craft()'s effective inputs so the gate matches what
	# craft will actually deduct. At 0 bakers this equals RecipeConfig.recipe_inputs.
	var inputs: Dictionary = _effective_recipe_inputs(recipe_id)
	for k in inputs.keys():
		if int(inventory.get(k, 0)) < int(inputs[k]):
			return false
	return true

## The recipe inputs for `recipe_id` AFTER worker recipe_input_reduce (the Baker).
## A COPY of RecipeConfig.recipe_inputs with each input reduced by the matching
## worker reduction, FLOORED AT 1 (a recipe always costs at least 1 of each input).
## At 0 matching workers the reduction is 0, so this returns the base inputs verbatim.
func _effective_recipe_inputs(recipe_id: String) -> Dictionary:
	var inputs: Dictionary = RecipeConfig.recipe_inputs(recipe_id)
	# T17/T21: BUILDING recipe_input_reduce (the Mill on bread/flour) stacks ON TOP of the worker
	# reduction (the Baker), both on the same React recipe_input_reduce channel (src/state.ts). The
	# aggregate's contribution is keyed { recipe -> { input -> amount } }; EMPTY for a fresh game →
	# only the worker reduction applies (and that's 0 too) → inputs byte-identical to the base recipe.
	# Workers are NOT in this aggregate (dedicated path) so there is no double-count. Floored at 1.
	var agg_recipe: Dictionary = compute_ability_channels()["recipe_input_reduce"].get(recipe_id, {})
	for k in inputs.keys():
		var reduction: int = worker_recipe_input_reduction(recipe_id, String(k))
		reduction += int(floor(float(agg_recipe.get(String(k), 0.0))))
		if reduction > 0:
			inputs[k] = maxi(1, int(inputs[k]) - reduction)
	return inputs

## Craft `recipe_id`: deduct every input (floored at 0), then ROUTE the output by its
## kind — a GOOD is added to inventory (clamped to the settlement cap); a TOOL is granted
## as a tool charge (grant_tool). Returns {ok:true, output, qty, recipe, kind} on success.
## On failure returns {ok:false, reason} WITHOUT mutating; reason is the FIRST guard that
## trips, in order: "unknown" → "no_station" → "locked" → "insufficient".
func craft(recipe_id: String) -> Dictionary:
	if not RecipeConfig.is_recipe(recipe_id):
		return {"ok": false, "reason": "unknown"}
	if not has_building(RecipeConfig.recipe_station(recipe_id)):
		return {"ok": false, "reason": "no_station"}
	# T15: recipe-level tier gate (same gate as can_craft). Reported "locked" — the recipe
	# exists and its station is built, but the town isn't advanced enough yet. Tier-1
	# recipes (BREAD/SUPPLIES) map to Camp so this never trips for them.
	if settlement.tier < RecipeConfig.recipe_min_settlement_tier(recipe_id):
		return {"ok": false, "reason": "locked"}
	# Workers (ADDITIVE): recipe_input_reduce workers (the Baker) shave inputs off the
	# matching recipe. _effective_recipe_inputs floors each reduced input at 1, and the
	# reduction is 0 when no Baker is hired — so at 0 bakers the inputs are byte-identical
	# to RecipeConfig.recipe_inputs and craft is unchanged. Used for BOTH the
	# affordability check and the deduction below so they can never diverge.
	var inputs: Dictionary = _effective_recipe_inputs(recipe_id)
	for k in inputs.keys():
		if int(inventory.get(k, 0)) < int(inputs[k]):
			return {"ok": false, "reason": "insufficient"}
	# All guards passed — commit: deduct inputs, then route the output.
	for k in inputs.keys():
		var remaining: int = maxi(0, int(inventory.get(k, 0)) - int(inputs[k]))
		if remaining == 0:
			inventory.erase(k)
		else:
			inventory[k] = remaining
	var output: String = RecipeConfig.recipe_output(recipe_id)
	var qty_out: int = RecipeConfig.recipe_qty(recipe_id)
	var kind: String = RecipeConfig.recipe_output_kind(recipe_id)
	# Route by output kind. TOOL recipes (the Workshop) grant a tool charge — the in-game
	# source of tools that previously only came from grants/the Portal. GOOD recipes bank
	# the good (cap-clamped). BREAD/SUPPLIES are KIND_GOOD, so their path is unchanged.
	if kind == RecipeConfig.KIND_TOOL:
		grant_tool(output, qty_out)
	else:
		inventory[output] = mini(int(inventory.get(output, 0)) + qty_out, effective_cap())
	# Quests (ADDITIVE): one craft ticks the CRAFT quest event, keyed by the recipe's
	# OUTPUT key (matching React's craft tick on the crafted item), count = qty produced.
	# No-op loop over [] with an empty quest board.
	_tick_quests({"type": "craft", "item": output, "count": qty_out})
	# T24 boss (ADDITIVE): an iron_bar-target boss (Ember Drake) advances +1 per recipe that
	# CONSUMES iron_bar (note_boss_craft — the React CRAFTING/CRAFT_RECIPE boss branch). A no-op
	# off that boss / with no boss. note_boss_craft auto-resolves the fight on the unit that meets
	# the target; the caller's state_changed → _on_town_changed refresh re-syncs the board/HUD.
	var boss_craft: Dictionary = note_boss_craft(recipe_id)
	return {"ok": true, "output": output, "qty": qty_out, "recipe": recipe_id, "kind": kind, "boss": boss_craft}

# ── Market (sell / buy for coins) ─────────────────────────────────────────────

## Sell `qty` units of `resource` for coins. Deducts the units (floored at 0) and
## credits coins at the Market sell price. Returns {ok:true, coins_gain, resource,
## qty} on success, else {ok:false, reason} WITHOUT mutating; reason is the FIRST
## guard that trips: "bad_qty" → "not_sellable" → "insufficient".
func sell(resource: String, qty: int) -> Dictionary:
	if qty <= 0:
		return {"ok": false, "reason": "bad_qty"}
	if not MarketConfig.can_sell(resource):
		return {"ok": false, "reason": "not_sellable"}
	if int(inventory.get(resource, 0)) < qty:
		return {"ok": false, "reason": "insufficient"}
	var remaining: int = maxi(0, int(inventory.get(resource, 0)) - qty)
	if remaining == 0:
		inventory.erase(resource)
	else:
		inventory[resource] = remaining
	# T16: use the LIVE drifted sell price (falls back to base when market_prices is empty).
	var coins_gain: int = live_sell_price(resource) * qty
	coins += coins_gain
	return {"ok": true, "coins_gain": coins_gain, "resource": resource, "qty": qty}

## Buy `resource` for coins, adding it to inventory (cap-clamped). The settlement
## storage cap is respected: if the cap would clip the purchase we only buy (and
## only CHARGE for) what fits — never charging for units that wouldn't be stored.
##   room   = max(0, cap - current)
##   actual = min(qty, room)
## When actual == 0 the inventory is already at cap → {ok:false, reason:"cap_full"}.
## Otherwise charges buy_price * actual and stores `actual` units. Returns
## {ok:true, coins_spent, resource, qty, added} (added == actual, may be < qty when
## the cap clipped it). On the up-front guards returns {ok:false, reason} WITHOUT
## mutating; reason order: "bad_qty" → "not_buyable" → "cant_afford" → "cap_full".
func buy(resource: String, qty: int) -> Dictionary:
	if qty <= 0:
		return {"ok": false, "reason": "bad_qty"}
	if not MarketConfig.can_buy(resource):
		return {"ok": false, "reason": "not_buyable"}
	# T16: use the LIVE drifted buy price (falls back to base when market_prices is empty).
	var price: int = live_buy_price(resource)
	# Affordability is checked against the FULL requested qty first: if the player
	# can't pay for what they asked for, the order is rejected outright.
	if coins < price * qty:
		return {"ok": false, "reason": "cant_afford"}
	# Cap discipline: only buy (and only charge for) what actually fits in storage (effective cap).
	var current: int = int(inventory.get(resource, 0))
	var room: int = maxi(0, effective_cap() - current)
	var actual: int = mini(qty, room)
	if actual == 0:
		return {"ok": false, "reason": "cap_full"}
	var coins_spent: int = price * actual
	coins -= coins_spent
	inventory[resource] = current + actual
	return {
		"ok": true,
		"coins_spent": coins_spent,
		"resource": resource,
		"qty": qty,
		"added": actual,
	}

# ── Orders (the Direction's coin sink) ───────────────────────────────────────

## Resources an order may request — derived from CURRENT production so every order
## is fillable in principle. Starts with the two staples (always producible), then
## appends each placed building's produced resource (plank/eggs/soup/bread),
## deduplicated, in a stable order. A built Bakery adds "bread".
func orderable_resources() -> Array:
	# Seed with the home-zone staples (ZoneConfig.HOME_STAPLE_RESOURCES); duplicate so the appends
	# below never mutate the shared const.
	var out: Array = ZoneConfig.HOME_STAPLE_RESOURCES.duplicate()
	for id in buildings:
		var res: String = BuildingConfig.building_resource(id)
		if res != "" and not out.has(res):
			out.append(res)
	return out

## Roll a single fresh order (T19 value-scaled + crafted-good pool). Optional
## `exclude_npcs` / `exclude_keys` arrays let the caller forbid an NPC or a resource/good
## already requested by another slot, so the 3-order board never duplicates an NPC or a
## requested key (React makeOrder's excludeNpcs / excludeOrderKeys, src/state/helpers.ts).
##
## CRAFTED-GOOD POOL (React level >= 3, 30%). At almanac level CRAFTED_ORDER_LEVEL+ a roll
## has a CRAFTED_ORDER_CHANCE chance of being a crafted-GOOD order (round(value×qty×1.5),
## qty 1-3); otherwise it's a value-scaled RESOURCE order (max(20, value×qty×6), level-
## scaled qty). The requesting NPC is picked from the roster (minus exclusions). Carries
## `base_reward` (== the rolled reward) alongside `reward`; fill_order pays the bond-adjusted
## PAYOUT from `base_reward`. Also carries `kind` ("resource" | "crafted") for the UI.
## Pure: does NOT mutate `orders`. All randomness flows through the seeded `rng` so a
## given seed reproduces the same board (incl. crafted/resource choice + npc).
func generate_order(exclude_npcs: Array = [], exclude_keys: Array = []) -> Dictionary:
	var level: int = almanac_level
	# Crafted-good order? Only at level CRAFTED_ORDER_LEVEL+, CRAFTED_ORDER_CHANCE of the time,
	# and only when a crafted-good is actually available + not excluded.
	var use_crafted: bool = false
	if level >= OrderConfig.CRAFTED_ORDER_LEVEL and rng.randf() < OrderConfig.CRAFTED_ORDER_CHANCE:
		use_crafted = true

	var key: String
	var qty: int
	var reward: int
	var kind: String
	if use_crafted:
		var crafted_pool: Array = OrderConfig.crafted_order_pool()
		var crafted_pick: Array = _filter_pool(crafted_pool, exclude_keys)
		if crafted_pick.is_empty():
			# No distinct crafted good available — fall back to a resource order.
			use_crafted = false
		else:
			key = String(crafted_pick[rng.randi_range(0, crafted_pick.size() - 1)])
			qty = OrderConfig.crafted_qty(rng.randf())
			reward = OrderConfig.crafted_reward_for(key, qty)
			kind = "crafted"
	if not use_crafted:
		var pool: Array = orderable_resources()
		var resource_pick: Array = _filter_pool(pool, exclude_keys)
		# If every orderable resource is already requested, allow a repeat (never deadlock).
		if resource_pick.is_empty():
			resource_pick = pool
		key = String(resource_pick[rng.randi_range(0, resource_pick.size() - 1)])
		var value: int = MarketConfig.sell_price(key)
		qty = OrderConfig.qty_for(value, level, rng.randf())
		reward = OrderConfig.reward_for(key, qty)
		kind = "resource"

	# Pick the requesting NPC (excluding any already used), via the SAME seeded `rng`.
	var roster: Array = npcs_state.roster
	if roster.is_empty():
		roster = NpcConfig.all_ids()
	var npc_pick: Array = _filter_pool(roster, exclude_npcs)
	if npc_pick.is_empty():
		npc_pick = roster   # more orders than NPCs — allow a repeat rather than deadlock
	var npc: String = String(npc_pick[rng.randi_range(0, npc_pick.size() - 1)])
	return {
		"resource": key,
		"qty": qty,
		"reward": reward,
		"npc": npc,
		"base_reward": reward,
		"kind": kind,
	}

## Return `pool` with every entry present in `exclude` removed (preserving order).
func _filter_pool(pool: Array, exclude: Array) -> Array:
	if exclude.is_empty():
		return pool.duplicate()
	var out: Array = []
	for e in pool:
		if not exclude.has(e):
			out.append(e)
	return out

## Top the order board back up to OrderConfig.MAX_ORDERS by appending fresh rolls,
## forbidding any NPC or requested resource/good already on the board so the 3 slots
## never duplicate (React's excludeNpcs / excludeOrderKeys accumulation). Idempotent
## once full. Call after load and after each fill.
func refill_orders() -> void:
	while orders.size() < OrderConfig.MAX_ORDERS:
		var used_npcs: Array = []
		var used_keys: Array = []
		for o in orders:
			used_npcs.append(String((o as Dictionary).get("npc", "")))
			used_keys.append(String((o as Dictionary).get("resource", "")))
		orders.append(generate_order(used_npcs, used_keys))

## True when `index` is a real order AND inventory holds enough to fill it.
func can_fill_order(index: int) -> bool:
	if index < 0 or index >= orders.size():
		return false
	var order: Dictionary = orders[index]
	return int(inventory.get(order["resource"], 0)) >= int(order["qty"])

## Fill order `index`: deduct the requested qty (floored/erased), credit the
## reward, remove the filled order, then refill the board back up. Returns
## {ok:true, reward, resource, qty} on success. On failure returns {ok:false,
## reason} WITHOUT mutating; reason is the FIRST guard that trips:
## "bad_index" → "insufficient".
func fill_order(index: int) -> Dictionary:
	if index < 0 or index >= orders.size():
		return {"ok": false, "reason": "bad_index"}
	if not can_fill_order(index):
		return {"ok": false, "reason": "insufficient"}
	var order: Dictionary = orders[index]
	var resource: String = String(order["resource"])
	var qty: int = int(order["qty"])
	# ADDITIVE (NPC bonding): resolve the requesting NPC and the bond-ADJUSTED
	# payout. Defensive for old saves / hand-built orders missing the new fields:
	# `base_reward` falls back to the legacy `reward`, and a missing `npc` falls
	# back to DEFAULT_ORDER_NPC ("wren"). At the default bond 5.0 (Warm, ×1.00) the
	# payout == base == the old flat reward, so nothing observable changes for fresh
	# orders — the orders economy stays green.
	var base_reward: int = int(order.get("base_reward", order.get("reward", 0)))
	var npc: String = String(order.get("npc", DEFAULT_ORDER_NPC))
	var bond: float = npc_bond(npc)
	var payout: int = NpcConfig.reward_with_bond(base_reward, bond)
	# Deduct the delivered goods (floor at 0, erase the key when it hits 0).
	var remaining: int = maxi(0, int(inventory.get(resource, 0)) - qty)
	if remaining == 0:
		inventory.erase(resource)
	else:
		inventory[resource] = remaining
	# Coins are UNCAPPED — only inventory resources are bounded by the settlement
	# cap, so a big-reward order can push coins arbitrarily high.
	coins += payout
	# Filling an order warms the relationship: +BOND_GAIN_PER_FILL, clamped to 10.
	# T31 (ADDITIVE): owned BOONS that grant bond_gain_mult scale this order-fill bond gain
	# (React boon bond_gain_mult applied to bond gains from gifts/orders). 1.0 for a fresh game
	# (no boons owned) → +BOND_GAIN_PER_FILL unchanged → byte-identical order behaviour.
	gain_bond(npc, BOND_GAIN_PER_FILL * boon_effect_mult(BoonConfig.BOND_GAIN_MULT))
	orders.remove_at(index)
	refill_orders()
	# M10 achievements (ADDITIVE): one fulfilled order → +1 on orders_fulfilled.
	bump_counter("orders_fulfilled")
	# Story engine (ADDITIVE, after the order is committed): post an "order_fulfilled"
	# event so act1_first_order can fire. T29: also carry the requesting NPC's NEW bond
	# (after the +BOND_GAIN_PER_FILL warm) on event.bond so side_bond_liked can fire when an
	# order fill pushes a villager into Liked (>= 7) — the same fact give_gift posts. The
	# success result below is UNCHANGED.
	post_story_event({"type": "order_fulfilled", "npc": npc, "bond": npc_bond(npc)})
	# Quests (ADDITIVE): one fulfilled order ticks the ORDER quest event (+1 to any
	# order-category quest). No-op loop over [] with an empty quest board.
	_tick_quests({"type": "order"})
	# The result's `reward` reports the ACTUAL coins paid (payout) so callers/UI show
	# what was credited; `npc` is carried for the same reason.
	return {"ok": true, "reward": payout, "resource": resource, "qty": qty, "npc": npc}

# ── Expedition / mine biome (M3f) ─────────────────────────────────────────────

## True while the player is on a mine expedition (the board shows mine tiles).
func is_in_mine() -> bool:
	return active_biome == "mine"

## True when an expedition can be LAUNCHED right now: on the farm (not already
## mining), the settlement has reached City (the expedition unlocks at City per the
## Direction), and there is at least 1 supplies to spend as turns. Guards are
## checked in this order so enter_mine can report the FIRST failing reason.
func can_enter_mine() -> bool:
	if active_biome != "farm":
		return false
	if settlement.tier < TownConfig.TIER_CITY:
		return false
	if qty("supplies") <= 0:
		return false
	return true

## Launch a mine expedition. On failure returns {ok:false, reason} (the FIRST
## guard that trips, in order: "already_mining" → "locked" → "no_supplies")
## WITHOUT mutating. On success: convert ALL supplies into mine turns (1 supplies =
## 1 turn), remove "supplies" from inventory, enter the mine, and return
## {ok:true, turns}. Collected mine goods accrue in the shared inventory.
func enter_mine() -> Dictionary:
	if active_biome != "farm":
		return {"ok": false, "reason": "already_mining"}
	if settlement.tier < TownConfig.TIER_CITY:
		return {"ok": false, "reason": "locked"}
	if qty("supplies") <= 0:
		return {"ok": false, "reason": "no_supplies"}
	var s: int = qty("supplies")
	inventory.erase("supplies")
	# T30: record the supplies spent on this expedition for the run-summary dashboard (React
	# EXPEDITION/DEPART supply). Accumulates across expeditions launched since the last run start.
	run_supplies_consumed["supplies"] = int(run_supplies_consumed.get("supplies", 0)) + s
	mine_turns_left = s
	active_biome = "mine"
	# T11/T23: a fresh expedition starts with NO mine hazards and NO mysterious ore active. They
	# spawn during the run (roll_mine_hazard_on_fill / spawn_mysterious_ore_on_fill on a board fill).
	mine_hazards = MineHazardLogic.default_state()
	mysterious_ore = {}
	return {"ok": true, "turns": s}

## Spend one mine turn. Call AFTER a mine chain resolves (the chain's resources are
## already credited via credit_chain). Decrements mine_turns_left; if it hits 0 the
## expedition ends (back to the farm). SOFT-FAIL: everything gathered is kept (it's
## in `inventory` already). Returns {exited, turns_left}.
func note_mine_turn() -> Dictionary:
	mine_turns_left = maxi(0, mine_turns_left - 1)
	if mine_turns_left == 0:
		active_biome = "farm"
		# T11/T23: the expedition is over — clear the mine hazards + any live ore so a stale hazard
		# can never bleed onto the farm (mirrors leave_mine / the harbor pearl-clear on exit).
		mine_hazards = MineHazardLogic.default_state()
		mysterious_ore = {}
		return {"exited": true, "turns_left": 0}
	return {"exited": false, "turns_left": mine_turns_left}

## Manually abandon the expedition early (the Town screen "Leave the mine" button).
## Snap back to the farm and drop any remaining turns — everything gathered is kept.
func leave_mine() -> void:
	active_biome = "farm"
	mine_turns_left = 0
	# T11/T23: drop the mine hazards + live ore on early exit too (mirrors note_mine_turn's exit).
	mine_hazards = MineHazardLogic.default_state()
	mysterious_ore = {}

# ── T26: Cartography travel state machine (ported from src/features/cartography/slice.ts) ──

## The player-level used for map node level gates. The port has no React `state.level`; its
## closest analogue is the Almanac track level (almanac_level), so the world-map level gate
## reads it (React slice.ts:72 `state.level || 1`). Floored at 1.
func player_level() -> int:
	return maxi(1, almanac_level)

## Seed the default map travel state: home VISITED, its neighbours DISCOVERED, every other node
## HIDDEN. map_current = "home". Idempotent — only seeds when the dict is empty, so a loaded
## save (which restores its own state) is never clobbered. Called from from_dict (and lazily
## from any travel reader) so a bare GameState is always navigable. Mirrors React's initial
## (slice.ts:13-20): mapCurrent 'home', visited ['home'], discovered ['home', meadow, orchard].
func _seed_map_state() -> void:
	if not map_node_state.is_empty():
		return
	# T22: preserve an already-set active zone (a bare GameState has map_current "home", so the
	# fresh-game path is byte-identical; but a zone activated BEFORE any map reader ran — e.g. via
	# _activate_zone in a headless flow — must not be clobbered back to home). The current node is
	# marked visited; home stays at least visited (the React invariant); neighbours of both are
	# discovered.
	if map_current == "" or not CartographyConfig.has_node(map_current):
		map_current = "home"
	map_node_state = {"home": "visited"}
	map_node_state[map_current] = "visited"
	_recompute_discovered()

## The travel-state string for `node_id`: "visited" | "discovered" | "hidden". A node absent
## from map_node_state reads as hidden. Seeds the default state on first read so a bare
## GameState answers correctly.
func map_status(node_id: String) -> String:
	if map_node_state.is_empty():
		_seed_map_state()
	return String(map_node_state.get(node_id, "hidden"))

## True when the player has visited `node_id` at least once (fast-travel eligible).
func map_visited(node_id: String) -> bool:
	return map_status(node_id) == "visited"

## Recompute the DISCOVERED ring around the visited set: every neighbour of a visited node that
## isn't already visited becomes discovered. Visited entries are preserved. Mirrors React's
## recomputeDiscovered (slice.ts:43-49).
func _recompute_discovered() -> void:
	for nid in map_node_state.keys():
		if String(map_node_state[nid]) == "visited":
			for nb in CartographyConfig.neighbors_of(nid):
				if not map_node_state.has(nb):
					map_node_state[nb] = "discovered"

## Why-can't-I-travel reason for `node_id`, or "" when travel IS allowed. Mirrors React's
## adjacency-from-visited + level + entry-cost gate (slice.ts:62-79) plus the Hearth-Token gate
## (the Old Capital, which has no token currency in the port → always "needs_tokens").
##   - "unknown"      — no such node.
##   - "here"         — already the current node.
##   - "needs_tokens" — the Old Capital (gated on the 3 Hearth-Tokens, which don't exist yet).
##   - ""             — already visited → fast-travel always allowed (skips the gates below).
##   - "unreachable"  — first-visit, not adjacent to the current node.
##   - "level"        — first-visit, player level below the node's level requirement.
##   - "cost"         — first-visit, not enough coins for the entry cost.
func travel_block_reason(node_id: String) -> String:
	if not CartographyConfig.has_node(node_id):
		return "unknown"
	if node_id == map_current:
		return "here"
	# The Old Capital is gated on the three Hearth-Tokens (T22). Until all three are held the node
	# can't be entered ("needs_tokens"); once the player holds all three it UNLOCKS and falls
	# through to the normal adjacency/level/cost gate below (reaching it is the finale). React
	# isOldCapitalUnlocked (data.ts:524-528).
	if CartographyConfig.requires_hearth_tokens(node_id) and not is_old_capital_unlocked():
		return "needs_tokens"
	# Fast-travel: any already-visited node, from anywhere (no adjacency/level/cost).
	if map_visited(node_id):
		return ""
	# First visit: must be adjacent to the CURRENT node, meet the level req, and afford the cost.
	if not CartographyConfig.is_adjacent(map_current, node_id):
		return "unreachable"
	if CartographyConfig.level_req(node_id) > player_level():
		return "level"
	if coins < CartographyConfig.entry_cost(node_id):
		return "cost"
	# A foundable settlement node (farm/mine/harbor) must be FOUNDED before you can travel to it —
	# you UNLOCK a new zone by founding it (the discovery action), and only then can you set out.
	# Home is always founded, so it's never blocked. Checked AFTER reachability/level/cost so a
	# distant or unaffordable node still reports those first (matching the screen's lock hints), and
	# this is the gate that keeps the marker from ever stranding on an un-settled board node.
	if CartographyConfig.settlement_type_for_zone(node_id) != "" and not is_settlement_founded(node_id):
		return "unfounded"
	return ""

## True when `node_id` can be travelled to RIGHT NOW (travel_block_reason == "").
func can_travel_to(node_id: String) -> bool:
	return travel_block_reason(node_id) == ""

## Travel to `node_id`. On a blocked travel returns {ok:false, reason} (the travel_block_reason)
## WITHOUT mutating. On success:
##   1. Pay the coin entry cost on a FIRST visit (fast-travel to a visited node is free).
##   2. Mark the node VISITED + discover its neighbours, set map_current.
##   3. For a BOARD node (farm/mine/fish) ENTER the matching board: a farm node sets
##      active_biome "farm" (the persistent home board — no turn budget consumed); a mine node
##      launches the mine expedition (supplies → mine turns) via enter_mine; a fish node launches
##      the harbor expedition via enter_harbor. A board launch that fails its OWN guards (no
##      supplies, etc.) still completes the travel (the marker moves) but reports the launch
##      result so Main can surface it.
##   4. NON-board nodes (event/festival/boss/capital) only move the marker — Main acts on `kind`.
## Returns {ok:true, node, kind, board_kind, entered:bool, first_visit:bool, launch:Dictionary}.
## `entered` is true when the board biome actually changed; `launch` is the enter_mine/enter_harbor
## result for an expedition node (empty for farm/non-board).
func travel_to(node_id: String) -> Dictionary:
	if map_node_state.is_empty():
		_seed_map_state()
	var reason: String = travel_block_reason(node_id)
	if reason != "":
		return {"ok": false, "reason": reason}

	var node: Dictionary = CartographyConfig.by_id(node_id)
	var first_visit: bool = not map_visited(node_id)

	# 1. Entry cost (first visit only — fast-travel is free).
	if first_visit:
		var cost: int = CartographyConfig.entry_cost(node_id)
		if cost > 0:
			coins -= cost   # guarded by travel_block_reason's "cost" check above

	# 2. Mark visited + discover neighbours + move the marker.
	map_node_state[node_id] = "visited"
	_recompute_discovered()
	map_current = node_id

	# 3/4. Enter the node's board (board nodes) or just report the kind (non-board nodes).
	var kind: String = String(node.get("kind", ""))
	var board_kind: String = String(node.get("board_kind", ""))
	var result := {
		"ok": true, "node": node_id, "kind": kind, "board_kind": board_kind,
		"entered": false, "first_visit": first_visit, "launch": {},
	}
	# Founding GATE (defensive): a BOARD node must be founded before its board can be entered. This is
	# now blocked UPSTREAM by travel_block_reason ("unfounded"), so a normal travel_to never reaches
	# here for an unfounded node — the marker doesn't move and no entry cost is charged. Kept as a
	# belt-and-suspenders guard in case travel_to is ever called past the gate (home is always founded).
	if board_kind != "" and not is_settlement_founded(node_id):
		result["launch"] = {"ok": false, "reason": "unfounded"}
		return result
	match board_kind:
		"farm":
			# T22: a FARM settlement (home / meadow / orchard) is a persistent board with its OWN
			# per-zone inventory / buildings / settlement tier. Activate it (snapshot the outgoing
			# zone, load this one's archive) so the live fields ARE this zone's. A no-op when it's
			# already the active zone — so the home-only game's live fields stay byte-identical.
			_activate_zone(node_id)
			active_biome = "farm"
			result["entered"] = true
		"mine":
			# A mine expedition launches FROM the active (home) settlement, spending ITS supplies.
			# (The port models mine/harbor as expeditions, not lived-in settlements — the per-zone
			# split that matters is the persistent FARM boards above.) enter_mine guards on being
			# on the farm + City tier + supplies; on failure the marker still moved but no board
			# change happened.
			var mres: Dictionary = enter_mine()
			result["launch"] = mres
			result["entered"] = bool(mres.get("ok", false))
		"fish":
			var hres: Dictionary = enter_harbor()
			result["launch"] = hres
			result["entered"] = bool(hres.get("ok", false))
		_:
			# event / festival / boss / capital — no board; Main handles the activity on `kind`.
			pass
	return result

# ── T22: Multi-settlement founding + Hearth-Tokens + active-zone-view ──────────────

## The settlement TYPE for `zone_id` ("farm" | "mine" | "harbor"), or "" when it isn't a
## settlement. Thin forwarder to CartographyConfig (React settlementTypeForZone).
func settlement_type_for_zone(zone_id: String) -> String:
	return CartographyConfig.settlement_type_for_zone(zone_id)

## True when `zone_id` has been founded. Home is ALWAYS founded (implicit, never recorded), so
## a fresh game answers true only for "home". FAITHFUL to React isSettlementFounded (data.ts:395).
func is_settlement_founded(zone_id: String) -> bool:
	if zone_id == "home":
		return true
	var rec: Variant = settlements.get(zone_id, null)
	return rec is Dictionary and bool((rec as Dictionary).get("founded", false))

## Number of zones the player has founded (home is implicit, NOT counted here — it matches React
## foundedSettlementCount, which counts only state.settlements entries; home is never recorded).
## Used by the founding-cost growth formula, where k = the count BEFORE home is added (so the
## first PAID founding sees k=1 once home is folded in — see settlement_founding_cost).
func founded_settlement_count() -> int:
	var n: int = 0
	for zid in settlements.keys():
		var rec: Variant = settlements[zid]
		if rec is Dictionary and bool((rec as Dictionary).get("founded", false)):
			n += 1
	# Home is implicitly founded but never recorded in `settlements`; fold it in so the cost
	# growth (base × growth^(k-1)) matches React, where home IS counted (home is in its map).
	return n + 1

## Coin cost to found the NEXT settlement. The k-th founding (k = current founded count) costs
## round(base × growth^(k-1)). With home counted, the 2nd settlement is k=1 → base (300); the
## 3rd is k=2 → base×1.7; etc. FAITHFUL to React settlementFoundingCost (data.ts:405-408).
func settlement_founding_cost() -> int:
	var k: int = maxi(1, founded_settlement_count())
	return int(round(float(CartographyConfig.FOUNDING_BASE_COINS) * pow(CartographyConfig.FOUNDING_GROWTH, k - 1)))

## A settlement is COMPLETE once (1) it's built up enough to draw its keeper AND (2) its keeper has
## been resolved. FAITHFUL to React settlementCompleted (data.ts:419-437). The port keys keeper
## resolution by TYPE (story flags, KeeperConfig), so a settlement of a given type completes once
## its built count meets the keeper's appears_after_buildings threshold AND that type's keeper is
## resolved. Reads the zone's built count from the ACTIVE live fields when `zone_id` is the active
## zone, else from its archive. A zone with no keeper type (non-settlement node) can't complete.
func settlement_completed(zone_id: String) -> bool:
	if not is_settlement_founded(zone_id):
		return false
	var type: String = settlement_type_for_zone(zone_id)
	if type == "" or not KeeperConfig.has_keeper(type):
		return false
	var built_count: int = _zone_building_count(zone_id)
	if built_count < KeeperConfig.appears_after_buildings(type):
		return false
	# Keeper gate: the type's keeper must be resolved (React's per-zone keeperPath; the port keys
	# by type — see keeper_resolved). Without this a built-up-but-unresolved settlement never
	# completes, so its Hearth-Token isn't granted (matching React's keeper gate).
	return keeper_resolved(type)

## The number of placed buildings at `zone_id`: the live `buildings` array when it's the active
## zone, else the archived snapshot's buildings. (React builtCountAt — the port's `buildings` is a
## flat spawner array, so its size IS the built count; no _plots/decorations bookkeeping to skip.)
func _zone_building_count(zone_id: String) -> int:
	if zone_id == map_current:
		return buildings.size()
	var arc: Variant = zone_archives.get(zone_id, null)
	if arc is Dictionary:
		var blds: Variant = (arc as Dictionary).get("buildings", [])
		if blds is Array:
			return (blds as Array).size()
	return 0

## Count of zones that are both founded AND completed (React completedSettlementCount, data.ts:440).
func completed_settlement_count() -> int:
	var n: int = 0
	# Founded non-home zones recorded in `settlements`.
	for zid in settlements.keys():
		var rec: Variant = settlements[zid]
		if rec is Dictionary and bool((rec as Dictionary).get("founded", false)) and settlement_completed(zid):
			n += 1
	# Home is implicitly founded; count it when complete (React counts home — it's in its map).
	if settlement_completed("home"):
		n += 1
	return n

## FOUND_SETTLEMENT (React state.ts:709-735). Found `zone_id` with biome `biome_id`. Guards (the
## FIRST that trips is reported), in React's order:
##   "unknown"      — no such map node.
##   "founded"      — already founded.
##   "needs_prior"  — a prior settlement must be COMPLETE before founding the next (home exempt —
##                    but home is always founded, so this only ever gates settlement #2+).
##   "not_settlement" — the node has no settlement type (event/festival/boss/capital).
##   "cant_afford"  — not enough GLOBAL coins for settlement_founding_cost().
## On success: deduct the coins, record settlements[zone_id] = {founded, biome, keeper_path:""},
## SEED a fresh empty zone archive for it, fold any earned Hearth-Tokens, and return
## {ok:true, zone, biome, cost}. Does NOT activate the zone (travel does that).
func found_settlement(zone_id: String, biome_id: String = "") -> Dictionary:
	if not CartographyConfig.has_node(zone_id):
		return {"ok": false, "reason": "unknown"}
	if is_settlement_founded(zone_id):
		return {"ok": false, "reason": "founded"}
	# Progression gate (React data: completedSettlementCount(state) < 1): finish your first
	# settlement before founding the next. home is auto-founded, so the first time this gate is
	# faced is founding settlement #2 — the player needs home (or another zone) complete first.
	if completed_settlement_count() < 1:
		return {"ok": false, "reason": "needs_prior"}
	var type: String = settlement_type_for_zone(zone_id)
	if type == "":
		return {"ok": false, "reason": "not_settlement"}
	var cost: int = settlement_founding_cost()
	if coins < cost:
		return {"ok": false, "reason": "cant_afford"}
	# React resolveBiomeChoice: the picker passes the chosen id; a missing/unknown choice falls
	# back to the type's first biome.
	var biome: Dictionary = CartographyConfig.resolve_biome_choice(type, biome_id)
	if biome.is_empty():
		return {"ok": false, "reason": "not_settlement"}
	# Commit: pay coins, record the founding, seed a fresh empty archive for the new zone.
	coins -= cost
	var chosen: String = String(biome.get("id", ""))
	settlements[zone_id] = {"founded": true, "biome": chosen, "keeper_path": ""}
	zone_archives[zone_id] = _fresh_zone_archive()
	# A completed settlement may already grant a token (e.g. home completed before founding #2) —
	# fold earned tokens after the founding so the Old-Capital unlock stays current.
	grant_earned_hearth_tokens()
	return {"ok": true, "zone": zone_id, "biome": chosen, "cost": cost}

## A fresh, empty per-zone archive (a zone that has never been played): empty inventory / progress /
## buildings, a Camp-tier settlement, 0 spent farm turns. The shape mirrors what _snapshot_live_zone
## writes, so _load_zone_into_live can read either interchangeably.
func _fresh_zone_archive() -> Dictionary:
	return {
		"inventory": {},
		"progress": {},
		"buildings": [],
		"settlement": Settlement.new().to_dict(),
		"farm_turns_used": 0,
	}

## Snapshot the LIVE per-zone fields (the currently-active zone's inventory / progress / buildings /
## settlement / farm_turns_used) into a plain archive dict. Deep-copies so the archive is
## independent of subsequent live mutation.
func _snapshot_live_zone() -> Dictionary:
	return {
		"inventory": inventory.duplicate(true),
		"progress": progress.duplicate(true),
		"buildings": buildings.duplicate(),
		"settlement": settlement.to_dict(),
		"farm_turns_used": farm_turns_used,
	}

## Load an archive dict (from zone_archives or _fresh_zone_archive) INTO the live per-zone fields.
## Defensive: missing keys fall back to fresh defaults; buildings keep only real, de-duplicated
## ids; the settlement tier is rebuilt via Settlement.from_dict (clamps a corrupt tier).
func _load_zone_into_live(arc: Dictionary) -> void:
	var inv: Variant = arc.get("inventory", {})
	inventory = (inv as Dictionary).duplicate(true) if inv is Dictionary else {}
	var prog: Variant = arc.get("progress", {})
	progress = (prog as Dictionary).duplicate(true) if prog is Dictionary else {}
	var blds: Variant = arc.get("buildings", [])
	buildings = []
	if blds is Array:
		for id in blds:
			var sid: String = String(id)
			if BuildingConfig.is_building(sid) and not buildings.has(sid):
				buildings.append(sid)
	var st: Variant = arc.get("settlement", {})
	settlement = Settlement.from_dict(st) if st is Dictionary else Settlement.new()
	farm_turns_used = maxi(0, int(arc.get("farm_turns_used", 0)))
	# The board pool / ability cache are derived from buildings + the active tile set — invalidate
	# so the next read rebuilds for the newly-active zone's spawners.
	_invalidate_ability_channels()

## Activate `zone_id` as the live zone: snapshot the current live fields into the OLD zone's
## archive, then load `zone_id`'s archive (or a fresh one) into the live fields and set map_current.
## A no-op when `zone_id` is ALREADY the active zone (so a fresh home-only game that never travels
## off home never touches the archives — the live fields stay byte-identical). Coins / tools /
## workers / runes / etc. are GLOBAL and untouched. Returns true when the active zone changed.
func _activate_zone(zone_id: String) -> bool:
	if zone_id == map_current:
		return false
	# Snapshot the OUTGOING zone's live state into its archive.
	zone_archives[map_current] = _snapshot_live_zone()
	# Load the INCOMING zone (its archive, or a fresh one if it's never been played).
	var arc: Variant = zone_archives.get(zone_id, null)
	if arc is Dictionary:
		_load_zone_into_live(arc as Dictionary)
		# It's now the live zone — drop its archive copy so the live fields are the single source
		# of truth (re-snapshotted on the next activation away).
		zone_archives.erase(zone_id)
	else:
		_load_zone_into_live(_fresh_zone_archive())
	map_current = zone_id
	# Keep the travel state consistent: the active zone is always at least VISITED (you're standing
	# on it). Only touch an already-seeded map (a bare unseeded map stays lazily seeded by the first
	# map reader, preserving the fresh-game path).
	if not map_node_state.is_empty():
		map_node_state[zone_id] = "visited"
		_recompute_discovered()
	return true

## The chosen biome id for `zone_id` (or DEFAULT_HOME_BIOME for home), else "". React
## settlementBiomeId (data.ts:581-587).
func settlement_biome_id(zone_id: String) -> String:
	var rec: Variant = settlements.get(zone_id, null)
	if rec is Dictionary:
		var b: String = String((rec as Dictionary).get("biome", ""))
		if b != "":
			return b
	return CartographyConfig.DEFAULT_HOME_BIOME if zone_id == "home" else ""

## The Hearth-Token id for settlement TYPE `type` (heirloomSeed / pactIron / tidesingerPearl), or
## "" for an unknown type. React HEARTH_TOKEN_FOR_TYPE.
func hearth_token_for_type(type: String) -> String:
	return String(CartographyConfig.HEARTH_TOKEN_FOR_TYPE.get(type, ""))

## How many of the three Hearth-Tokens the player holds (0–3). React hearthTokenCount (data.ts:531).
func hearth_token_count() -> int:
	var n: int = 0
	for tok in CartographyConfig.HEARTH_TOKEN_FOR_TYPE.values():
		if int(heirlooms.get(tok, 0)) >= 1:
			n += 1
	return n

## All three Hearth-Tokens collected → the Old Capital is reachable. React isOldCapitalUnlocked
## (data.ts:524-528).
func is_old_capital_unlocked() -> bool:
	return hearth_token_count() >= 3

## Grant the Hearth-Token for every founded + completed settlement TYPE, ONCE each (idempotent —
## never removes one). FAITHFUL to React grantEarnedHearthTokens (data.ts:541-554). Returns the
## list of token ids NEWLY granted by this call (empty when nothing changed), so a caller can
## surface a "you earned a token / the Capital opens" message.
func grant_earned_hearth_tokens() -> Array:
	var newly: Array = []
	# Every founded zone (the recorded non-home ones + the implicit home).
	var zone_ids: Array = settlements.keys().duplicate()
	if not zone_ids.has("home"):
		zone_ids.append("home")
	for zone_id in zone_ids:
		if not is_settlement_founded(zone_id) or not settlement_completed(zone_id):
			continue
		var type: String = settlement_type_for_zone(zone_id)
		var tok: String = hearth_token_for_type(type)
		if tok == "" or int(heirlooms.get(tok, 0)) >= 1:
			continue
		heirlooms[tok] = 1
		newly.append(tok)
	return newly

## Deep-copy the founding records for persistence (each {founded, biome, keeper_path}).
func _settlements_to_dict() -> Dictionary:
	var out: Dictionary = {}
	for zid in settlements.keys():
		var rec: Variant = settlements[zid]
		if rec is Dictionary:
			out[String(zid)] = (rec as Dictionary).duplicate(true)
	return out

## Deep-copy the per-zone archives for persistence (each {inventory, progress, buildings,
## settlement, farm_turns_used}). The ACTIVE zone is NOT here (it's in the live fields).
func _zone_archives_to_dict() -> Dictionary:
	var out: Dictionary = {}
	for zid in zone_archives.keys():
		var arc: Variant = zone_archives[zid]
		if arc is Dictionary:
			out[String(zid)] = (arc as Dictionary).duplicate(true)
	return out

## Well-form a saved per-zone archive defensively (used by from_dict): inventory/progress values
## int-coerced (JSON yields floats); buildings keep only real, de-duplicated ids; the settlement
## tier rebuilt via Settlement.from_dict (clamps a corrupt tier); farm_turns_used floored at 0.
func _sanitize_zone_archive(arc: Dictionary) -> Dictionary:
	var inv: Dictionary = {}
	var raw_inv: Variant = arc.get("inventory", {})
	if raw_inv is Dictionary:
		for k in (raw_inv as Dictionary).keys():
			inv[String(k)] = int((raw_inv as Dictionary)[k])
	var prog: Dictionary = {}
	var raw_prog: Variant = arc.get("progress", {})
	if raw_prog is Dictionary:
		for k in (raw_prog as Dictionary).keys():
			prog[String(k)] = int((raw_prog as Dictionary)[k])
	var blds: Array = []
	var raw_blds: Variant = arc.get("buildings", [])
	if raw_blds is Array:
		for id in (raw_blds as Array):
			var sid := String(id)
			if BuildingConfig.is_building(sid) and not blds.has(sid):
				blds.append(sid)
	var settle_dict: Variant = arc.get("settlement", {})
	var settle_clean: Dictionary = Settlement.from_dict(settle_dict).to_dict() if settle_dict is Dictionary else Settlement.new().to_dict()
	return {
		"inventory": inv,
		"progress": prog,
		"buildings": blds,
		"settlement": settle_clean,
		"farm_turns_used": maxi(0, int(arc.get("farm_turns_used", 0))),
	}

# ── Farm season cycle (A1) ─────────────────────────────────────────────────────

## Resolve the world-map node whose FARM board is currently live: the bounded-run zone while a run
## is active, else map_current when standing on a farm node, else home. Defaults to ZoneConfig.HOME_ZONE
## so a home-only game (never travelled off home, no run) is BYTE-IDENTICAL to the old hardcoded
## HOME_ZONE — only when the active farm node is a DIFFERENT farm template (e.g. orchard) does the
## live board follow it.
func _active_farm_zone() -> String:
	if farm_run_active and CartographyConfig.board_biome(farm_run_zone) == "farm":
		return farm_run_zone
	if CartographyConfig.board_biome(map_current) == "farm":
		return map_current
	return ZoneConfig.HOME_ZONE

## The current farm season-cycle turn budget. While a bounded RUN is live (farm_run_active
## with a positive farm_run_budget), this returns the PER-RUN budget — which routes the
## fertilizer-aware budget through every season helper (current_season_index/name, SeasonBar,
## the season-weighted pool) for free. With no run it falls back to the ACTIVE farm node's
## base_turns (the live board follows _active_farm_zone, defaulting to home → 10), so the
## always-on home season cycle + every existing suite stay byte-identical.
func farm_turn_budget() -> int:
	if farm_run_active and farm_run_budget > 0:
		return farm_run_budget
	return ZoneConfig.base_turns(_active_farm_zone())

## Compute the turn budget for a NEW bounded run with `use_fertilizer`. Mirrors React's
## turnBudgetForZone: max(1, floor((baseTurns + additive) * multiplier)). With base 10 this
## is 10 (no fertilizer) or 20 (fertilizer ×2). PURE — does NOT mutate run state.
##
## Additive breakdown (mirrors turnBudgetAdditiveBonusForZone, data.ts:173-177):
##   1. turn_budget_bonus from the unified ability aggregate (Granary / Mining Camp +1 each).
##      Already wired (T17/T21). 0 for a fresh game → byte-identical.
##   2. +1 if the Almanac tier-8 "extraTurn" structural flag has been latched (T12).
##      Mirrors React `if (state.tools?.extraTurn) bonus += 1` — the flag lives in
##      GameState.almanac_structural (the GDScript analogue of React's tools dict booleans).
##      0 for a fresh game (flag not yet granted) → byte-identical.
func farm_run_turn_budget(use_fertilizer: bool) -> int:
	var base: int = ZoneConfig.base_turns(_active_farm_zone())
	# T17/T21: the unified aggregate's turn_budget_bonus channel (the Granary / Mining Camp +1).
	# Mirrors React turnBudgetForZone's additive (src/features/zones/data.ts:174-175): base + bonus,
	# then ×multiplier. 0 for a fresh game (no such building) → byte-identical to the old budget.
	var additive: int = int(compute_ability_channels()["turn_budget_bonus"])
	# T12: the Almanac "extraTurn" structural flag (+1 additive). Mirrors React
	# turnBudgetAdditiveBonusForZone (data.ts:176): `if (state.tools?.extraTurn) bonus += 1`.
	# In the port the flag lives in almanac_structural (line ~648), the GDScript analogue of
	# React's tools dict bool flags (see AlmanacConfig.gd header).
	if bool(almanac_structural.get("extraTurn", false)):
		additive += 1
	var mult: int = 2 if use_fertilizer else 1
	return maxi(1, int(floor(float(base + additive) * float(mult))))

## The current farm season index (0=Spring … 3=Winter), derived from farm_turns_used and the
## turn budget via Constants.season_index. A fresh farm (0 turns used) is Spring.
func current_season_index() -> int:
	return Constants.season_index(farm_turns_used, farm_turn_budget())

## The current farm season NAME ("Spring"…"Winter").
func current_season_name() -> String:
	return Constants.season_name(farm_turns_used, farm_turn_budget())

## Spend one FARM turn — the season-cycle analogue of note_mine_turn / note_harbor_turn.
## Call AFTER a FARM chain resolves (its resources are already credited via credit_chain).
## Increments farm_turns_used. Behaviour at the budget boundary depends on whether a bounded
## RUN is live:
##   - RUN ACTIVE: the boundary ENDS the run (ended=true, farm_run_turns_left=0). It does NOT
##     wrap farm_turns_used — close_season() resets it (and clears the run) when the player
##     returns to town. While below the boundary, farm_run_turns_left counts down toward 0.
##   - NO RUN (legacy always-on cycle): the boundary is a HARVEST that wraps farm_turns_used
##     back to 0 (a fresh Spring cycle), exactly as before. ended stays false.
## Unlike the expeditions this NEVER changes active_biome here (the farm is the persistent home
## board; a run end is acknowledged by the caller, who shows the summary + calls close_season).
## The summary fields (coins, runes, the season just ended, the turn budget) are exposed so a
## later harvest/run-end modal can populate without re-deriving them.
## Returns { harvest:bool, ended:bool, season:String (the season that was active for this turn),
##           turns_used:int (the new counter after the tick), turns_left:int,
##           budget:int, coins:int, runes:int }.
func note_farm_turn() -> Dictionary:
	var budget: int = farm_turn_budget()
	# The season this turn belonged to is read BEFORE the increment (the player spent the turn
	# under the pre-increment season).
	var season: String = current_season_name()
	# T5: a banked FREE MOVE is spent INSTEAD of a real farm turn (no season advance, no
	# budget tick). Ported from React boardTurnPatch (src/state.ts:147-160): when freeMoves
	# > 0 the move consumes a free move and returns without incrementing turnsUsed / ticking
	# the run budget. Mirrors the React semantics exactly — the chain's resources are already
	# credited (credit_chain ran first); this only governs whether a TURN is spent.
	_ensure_tile_collection()
	if tile_free_moves > 0:
		tile_free_moves -= 1
		# fill_bias is a per-TURN countdown; a free move does NOT spend a biased turn (React
		# boardTurnPatch leaves the rest of the turn economy untouched on the free-move path).
		return {
			"harvest": false,
			"ended": false,
			"free_move": true,
			"season": season,
			"turns_used": farm_turns_used,
			"turns_left": farm_run_turns_left,
			"budget": budget,
			"coins": coins,
			"runes": runes,
		}
	farm_turns_used += 1
	# fill_bias countdown: a biased farm turn was just spent; expire the bias when it runs out.
	if fill_bias_turns > 0:
		fill_bias_turns -= 1
		if fill_bias_turns <= 0:
			fill_bias_target = Constants.EMPTY
			fill_bias_tool = ""
	var harvest: bool = false
	var ended: bool = false
	# `budget > 0` guard: a non-positive budget (corrupt save / test edge) is treated as
	# "always Spring" (see Constants.season_index) and never harvests.
	if budget > 0 and farm_turns_used >= budget:
		harvest = true
		if farm_run_active:
			# Bounded run reached its budget → the run ENDS. Do NOT wrap farm_turns_used here
			# (close_season resets it when the player returns to town); just zero the remaining
			# turns and flag the end so the caller can route to the summary + town.
			ended = true
			farm_run_turns_left = 0
		else:
			# Legacy always-on cycle: harvest boundary wraps back to a fresh Spring cycle.
			farm_turns_used = 0
	elif farm_run_active:
		# Live run, below the boundary: count the remaining turns down. The invariant while a
		# run is live is farm_run_turns_left == max(0, farm_turn_budget() - farm_turns_used).
		farm_run_turns_left = maxi(0, farm_run_turns_left - 1)
	return {
		"harvest": harvest,
		"ended": ended,
		"free_move": false,
		"season": season,
		"turns_used": farm_turns_used,
		"turns_left": farm_run_turns_left,
		"budget": budget,
		"coins": coins,
		"runes": runes,
	}

# ── Bounded farm run lifecycle (Task A, React FARM/ENTER + CLOSE_SEASON) ────────

## Start a bounded farm run (the port's FARM/ENTER). Pays the zone's coin entry cost,
## optionally consumes a fertilizer for a ×2 turn budget, sets the run state, and resets the
## season counter to a fresh Spring. PURE-GUARD ordering mirrors React: no mutation happens
## until every guard passes.
##   - already running        → {ok:false, reason:"already_running"}  (no mutation)
##   - not enough coins        → {ok:false, reason:"no_coins"}         (no mutation)
##   - fertilizer asked for but none available → {ok:false, reason:"no_fertilizer"} (no mutation)
## On success: coins -= entry cost; (fertilizer consumed if used); the six run fields set;
## farm_turns_used = 0; active_biome = "farm". Returns {ok:true, reason:"", budget:int}.
func start_farm_run(selected_tiles: Array, use_fertilizer: bool) -> Dictionary:
	if farm_run_active:
		return {"ok": false, "reason": "already_running"}
	# T22 founding GATE (React FARM/ENTER): can't start a run at an unfounded zone. The run plays
	# the ACTIVE zone (map_current); home is always founded → no-op for the home-only game.
	if not is_settlement_founded(map_current):
		return {"ok": false, "reason": "unfounded"}
	var cost: int = ZoneConfig.entry_cost(map_current)
	if coins < cost:
		return {"ok": false, "reason": "no_coins"}
	# Fertilizer ×2 (T12): _has_fertilizer() now reflects the real tool count (wired).
	# Requesting fertilizer with 0 charges is REJECTED honestly (no_fertilizer). On success one
	# charge is consumed via _consume_fertilizer() and the ×2 budget is applied.
	var fert: bool = use_fertilizer and _has_fertilizer()
	if use_fertilizer and not fert:
		return {"ok": false, "reason": "no_fertilizer"}
	# Commit: every guard passed.
	coins -= cost
	if fert:
		_consume_fertilizer()
	var budget: int = farm_run_turn_budget(fert)
	farm_run_active = true
	farm_run_zone = map_current
	farm_run_budget = budget
	farm_run_turns_left = budget
	farm_run_used_fertilizer = fert
	farm_run_selected = _sanitize_selection(selected_tiles)
	farm_turns_used = 0
	active_biome = "farm"
	# T30: reset the run telemetry to a fresh accumulator + snapshot the start-of-run bonds (the
	# baseline the bond-delta is measured against). Mirrors React startFreshRun (runSummary slice.ts).
	_reset_run_telemetry(fert)
	return {"ok": true, "reason": "", "budget": budget}

## T30 — reset the run-telemetry accumulator for a NEW run and snapshot the start-of-run NPC bonds.
## Called from start_farm_run. The dashboard's "Fertilizer" chip reads farm_run_used_fertilizer
## (the existing run field), so no separate flag is tracked here. bonds_at_start is a per-NPC
## snapshot so close_season can compute the rounded bond DELTA (React diffBonds). Only touches the
## telemetry fields. The `_fert` arg is accepted for call-site symmetry but unused (the run field
## already carries it).
func _reset_run_telemetry(_fert: bool) -> void:
	run_chains_played = 0
	run_longest_chain = 0
	run_best_chain = {}
	run_total_upgrades = 0
	run_total_coins = 0
	run_resources_gained = {}
	run_beats_fired = []
	run_supplies_consumed = {}
	# Snapshot every roster NPC's bond at run start (the bond-delta baseline).
	run_bonds_at_start = {}
	for id in NpcConfig.all_ids():
		run_bonds_at_start[String(id)] = npcs_state.bond(id)

## T30 — the rounded NPC bond DELTAS over the run: { npc_id -> round1(end - start) } for every NPC
## whose bond moved by at least NpcConfig.BOND_DELTA_EPSILON since run start. Mirrors React diffBonds
## (runSummary slice.ts:64-75): round to one decimal, drop near-zero moves. Reads the LIVE bonds vs
## run_bonds_at_start.
func run_bond_deltas() -> Dictionary:
	var out: Dictionary = {}
	for id in NpcConfig.all_ids():
		var sid: String = String(id)
		var start_bond: float = float(run_bonds_at_start.get(sid, NpcConfig.DEFAULT_BOND))
		var end_bond: float = npcs_state.bond(sid)
		var d: float = end_bond - start_bond
		if absf(d) >= NpcConfig.BOND_DELTA_EPSILON:
			out[sid] = roundf(d * 10.0) / 10.0
	return out

## T30 — build the rich run-summary DASHBOARD dict the HarvestModal renders at run end. Packs the
## live telemetry fields + the computed bond deltas + the story-beat TITLES (resolved from
## StoryConfig) into one self-contained dict. Mirrors the React RunSummary state shape the dashboard
## reads (runSummary index.tsx). Pure: reads state, never mutates. Safe to call any time (returns a
## zeroed dict when no run accumulated).
##   {
##     biome, zone, turns_budget, fertilizer_used,
##     chains_played, longest_chain, best_chain:{count,key,coin_gain,upgrades,gained} (or {}),
##     total_upgrades, total_coins, resources_gained:{}, bond_deltas:{}, supplies_consumed:{},
##     beats:[{id,title}]
##   }
func build_run_summary() -> Dictionary:
	var beats: Array = []
	for bid in run_beats_fired:
		var beat: Dictionary = StoryConfig.beat_by_id(String(bid))
		var title: String = String(beat.get("title", "")) if not beat.is_empty() else ""
		beats.append({"id": String(bid), "title": title})
	return {
		"biome": farm_run_zone,
		"zone": farm_run_zone,
		"turns_budget": farm_run_budget,
		"fertilizer_used": farm_run_used_fertilizer,
		"chains_played": run_chains_played,
		"longest_chain": run_longest_chain,
		"best_chain": run_best_chain.duplicate(true),
		"total_upgrades": run_total_upgrades,
		"total_coins": run_total_coins,
		"resources_gained": run_resources_gained.duplicate(true),
		"bond_deltas": run_bond_deltas(),
		"supplies_consumed": run_supplies_consumed.duplicate(true),
		"beats": beats,
	}

## Keep only entries that are ELIGIBLE base-spawn categories for the ACTIVE farm zone, capped at 8
## (React selectedTiles.slice(0, 8)). De-dup is NOT applied (React keeps the raw slice); the
## active_tile_pool boost simply re-boosts a repeated category, which harmlessly stacks the weight bias.
## Called from start_farm_run AFTER map_current/farm_run_zone are set, so _active_farm_zone() resolves
## the active node (home → byte-identical to the old hardcoded HOME_ZONE; orchard → its 7 categories).
func _sanitize_selection(arr: Array) -> Array:
	var eligible: Array = ZoneConfig.eligible_categories(_active_farm_zone())
	var out: Array = []
	for entry in arr:
		var cat: String = String(entry)
		if eligible.has(cat):
			out.append(cat)
		if out.size() >= 8:
			break
	return out

## Whether the player has a fertilizer to spend on a ×2 run budget.
## Mirrors React `state.tools?.fertilizer > 0` (src/features/zones/data.ts:turnBudgetForZone).
## Fertilizer is a real ToolConfig member — it is earned via the Workshop recipe
## rec_fertilizer (hay_bundle + dirt). Until crafting is ported the count starts at 0; the
## toggle stays hidden and the budget is unchanged. A test helper (grant_test_fertilizer) can
## grant one to exercise the wiring without crafting.
func _has_fertilizer() -> bool:
	return tool_count(ToolConfig.FERTILIZER) > 0

## Consume one fertilizer (the ×2 turn-budget item). Mirrors React's consumption of
## state.tools.fertilizer inside the FARM/ENTER reducer.
func _consume_fertilizer() -> void:
	tool_state.consume(ToolConfig.FERTILIZER)

## TEST HELPER — grant `n` fertilizer charges. NOT used in production paths; only for
## headless test suites that need to exercise the fertilizer flow without a Workshop.
func grant_test_fertilizer(n: int = 1) -> void:
	grant_tool(ToolConfig.FERTILIZER, n)

## End the active farm run and return to town (the port's CLOSE_SEASON). Grants the
## season-end bonus coins, decays NPC bonds above Warm, re-rolls the quest board, then clears
## the run + resets the farm to a fresh Spring on the farm biome. Returns
## {coins_granted:int, season_ended:String} (the season name BEFORE the reset).
##
## WIRED (the React CLOSE_SEASON parity set the port now covers):
##   - bonus coins (flat SEASON_END_BONUS_COINS + the season_bonus channel) + bond decay + quest reroll
##   - market drift (T16): market_season++ + _recompute_market (pickMarketEvent / driftPrices)
##   - worker/building season-end tool grants (season_end_tools channel → grant_tool)
##   - (T30) the `session_ended` story-beat trigger (post_story_event cascade — fires any threshold/
##     flag beat that became ready during the run, e.g. act3_finish)
##   - (T30) board-preserve DECISION (Silo/Barn board_preserve_biomes): reported as `preserve_board`
##     so Main keeps the grid instead of regenerating when the active biome is preserved
##   - (T30) tileCollection freeMoves reset + fill-bias clear (tile_free_moves = 0; bias cleared)
## STILL A SEAM (no port primitive yet, deliberately NOT faked):
##   - the per-biome savedField GRID SNAPSHOT itself (preserve_board signals the intent; the actual
##     grid retention is the board slice's job in Main)
##   - season_end_pool_step (no growable townsfolk hiring pool to step — T20 seam)
##   - NPC gift-cooldown reset (the port's cooldown is keyed by season index, so it self-clears)
func close_season() -> Dictionary:
	# BUG I1 — IDEMPOTENT guard. close_season is reachable from BOTH run-end exit paths (the CTA's
	# return_to_town and a scrim/ESC dismiss that completes the return in _on_harvest_closed), and a
	# stray double-call must never double-grant. With no active run there is nothing to close: return
	# a zero result WITHOUT touching coins/bonds/quests/run fields. This makes "grant +25 exactly once
	# per run end" hold no matter the dismiss ordering.
	if not farm_run_active:
		return {"coins_granted": 0, "season_ended": ""}
	var season_ended: String = current_season_name()
	# T17/T21: the unified aggregate's SEASON-END channels (mirrors the React CLOSE_SEASON site,
	# src/state.ts:916-971). All three default to empty for a fresh game (no such building), so the
	# grant is byte-identical to the old "+25 only" close.
	var agg: Dictionary = compute_ability_channels()
	#   season_bonus coins (Chapel +50) — added ALONGSIDE the flat SEASON_END_BONUS_COINS (rounded,
	#   matching React bonusCoins = round(seasonBonus.coins)).
	var bonus_coins: int = int(round(float(agg["season_bonus"].get("coins", 0.0))))
	coins += Constants.SEASON_END_BONUS_COINS + bonus_coins  # PORT: SEASON_END_BONUS_COINS (src/state.ts).
	#   season_end_tools (grant_tool — Powder Store bomb ×2): grant each tool through the M8b
	#   grant_tool path (every mapped tool id is a real ToolConfig member). 0 tools for a fresh game.
	var tools_granted: Dictionary = {}
	for tool_id in agg["season_end_tools"].keys():
		var n: int = int(agg["season_end_tools"][tool_id])
		if n > 0:
			grant_tool(String(tool_id), n)
			tools_granted[String(tool_id)] = n
	#   season_end_pool_step (worker_pool_step — Housing Block): the port hires workers by TYPE up to a
	#   per-type max_count (WorkerConfig), with NO growable townsfolk "hiring pool" to step (React grows
	#   workers.poolSize). The channel is aggregated + reported below for the future Townsfolk hire pool
	#   (T20), but there is no pool primitive to bump yet — a documented seam, NOT a fake.
	var pool_step: int = int(agg["season_end_pool_step"])
	#   board_preserve_biomes (Silo/Barn): the port has no per-biome saved-field snapshot primitive
	#   yet (the React savedField restore is a board-slice concern), so the PRESERVED set is reported
	#   in the result for the caller/board to honour; close_season itself does not snapshot the grid.
	#   This is a documented seam, faithful to "the channel is wired" — the consumer (board) is later.
	var preserved: Array = agg["board_preserve_biomes"].keys()
	# T30: BOARD-PRESERVE decision. The Silo/Barn board_preserve_biomes channel names the biomes whose
	# field is kept across the season boundary instead of regenerating (React savedField restore). The
	# port has no per-biome saved-field snapshot primitive, but the DECISION is pure: if the run's
	# active biome is in the preserved set, the caller (Main) keeps the existing board grid rather than
	# calling setup_new_board(). Computed BEFORE the run fields are cleared (active_biome is still the
	# run's biome here) and surfaced in the result as `preserve_board` for Main to honour.
	var preserve_board: bool = preserved.has(active_biome) or preserved.has(farm_run_zone)
	# T30: the session_ended / close_season STORY beat. Posting BEFORE the run is cleared (so any beat
	# that fires is still captured by run_beats_fired) lets the engine fire any beat that became ready
	# during the run but whose triggering event never arrived (e.g. act3_finish, gated on flags +
	# inventory.block >= 50). No port beat gates on session_ended TODAY, so this is inert for the
	# current catalog — but it is the faithful close-season cascade seam (React CLOSE_SEASON posts
	# session_ended) and fires threshold/flag beats at the boundary. Beats NEVER auto-grant.
	post_story_event({"type": "session_ended", "season": season_ended})
	_decay_npc_bonds()
	reroll_quests()
	# T16: advance the market season and re-roll prices (parallel to React CLOSE_SEASON).
	market_season += 1
	_recompute_market()
	# T30: freeMoves reset at season end. React CLOSE_SEASON zeroes the banked tileCollection free
	# moves (and the fill-bias) so a fresh run doesn't inherit last run's banked moves. Clear both
	# the banked free moves and the transient fill-bias here (the bias is also per-session transient).
	tile_free_moves = 0
	fill_bias_target = Constants.EMPTY
	fill_bias_turns = 0
	fill_bias_tool = ""
	# Clear the run + reset the farm to a fresh Spring on the home board.
	farm_run_active = false
	farm_run_budget = 0
	farm_run_turns_left = 0
	farm_run_used_fertilizer = false
	farm_run_selected = []
	farm_turns_used = 0
	active_biome = "farm"
	# Result reports the FULL coins granted (flat + season_bonus), the tools granted, the preserved
	# biomes + the preserve-board decision — all empty/zero-bonus for a fresh game (coins_granted ==
	# SEASON_END_BONUS_COINS, preserve_board == false).
	return {
		"coins_granted": Constants.SEASON_END_BONUS_COINS + bonus_coins,
		"season_ended": season_ended,
		"tools_granted": tools_granted,
		"preserved_biomes": preserved,
		"preserve_board": preserve_board,   # T30: keep the board grid this season (Silo/Barn) vs regen
		"pool_step": pool_step,   # T20 seam: reported, no hiring-pool primitive to apply it to yet
		"market_event": market_event.duplicate(true),   # T16: event for the new season (or {})
	}

## Decay every NPC bond strictly above Warm (NpcConfig.DEFAULT_BOND) by BOND_DECAY_STEP,
## floored at the Warm default (mirrors React decayBond: `Math.max(5, bond - 0.1)`). Bonds
## at or below Warm are left untouched. The floor prevents a near-Warm bond (e.g. 5.05) from
## bleeding below the neutral baseline — gain() only clamps to [BOND_MIN, BOND_MAX], so the
## floor must be applied here.
func _decay_npc_bonds() -> void:
	for id in NpcConfig.all_ids():
		var b: float = npcs_state.bond(id)
		if b > NpcConfig.DEFAULT_BOND:
			npcs_state.gain(id, maxf(NpcConfig.DEFAULT_BOND, b - NpcConfig.BOND_DECAY_STEP) - b)

## Reset the farm season cycle back to a fresh Spring (0 turns used). Called when starting a
## fresh farm session — there is no per-session "enter the farm" path in the port (the farm is
## the persistent home board), so this is invoked only by an explicit new-game reset. Kept as a
## named helper so a future "Start Farming" session entry (a later PR) has a single seam.
func reset_farm_cycle() -> void:
	farm_turns_used = 0

## The refill pool for the CURRENTLY active biome: the flat MINE_POOL (plus the rubble
## hazard) while mining, otherwise the farm's building-gated pool (active_tile_pool).
## The mine board is not building-gated this milestone (no mine spawners yet).
func active_biome_pool() -> Array:
	if is_in_mine():
		# M3i: seed RUBBLE_POOL_SLOTS cave-in rubble tiles into the mine pool — the
		# expedition's clutter hazard. RUBBLE produces nothing, so chaining it wastes a
		# scarce mine turn; you clear it by mining through it (a STONE chain sweeps the
		# adjacent rubble — see Board.clear_rubble_on_stone). The FARM pool is untouched
		# (rubble is a mine-only hazard; rats are the farm-only one).
		var pool: Array = Constants.MINE_POOL.duplicate()
		for _i in Constants.RUBBLE_POOL_SLOTS:
			pool.append(Constants.Tile.RUBBLE)
		return pool
	if is_in_harbor():
		# M3j: the harbor board draws from the GENERAL fish pool (FISH_POOL). The giant
		# pearl is NOT weighted in — the board slice seeds it conditionally — and the
		# tide-driven bottom-row swap (HIGH/LOW_TIDE_POOL) is also the board slice's job,
		# so the refill pool here is just the flat FISH_POOL (mirrors the un-gated mine).
		return Constants.FISH_POOL.duplicate()
	return active_tile_pool()

## True while the mine hazard (rubble) is live — i.e. on a mine expedition. A readable
## alias of is_in_mine() for the hazard wiring (Main sets Board.clear_rubble_on_stone
## from it; symmetry with rats_enabled()). Rubble exists only on the transient mine
## board, so this is exactly "are we in the mine".
func mine_hazard_active() -> bool:
	return is_in_mine()

# ── Fish / Harbor expedition (M3j) ─────────────────────────────────────────────

## True while the player is on a harbor expedition (the board shows fish tiles).
func is_in_harbor() -> bool:
	return active_biome == "harbor"

## True when a harbor expedition can be LAUNCHED right now: on the farm (not already on
## an expedition), with at least 1 supplies to spend as turns. MIRRORS can_enter_mine
## but WITHOUT the City-tier gate — the harbor is the Town-3 expedition (it opens once
## the Town-2 capstone is past), and the simplified single-settlement port already gates
## "Town 3" behind town2_complete (rats_enabled). Guards are ordered so enter_harbor can
## report the FIRST failing reason.
func can_enter_harbor() -> bool:
	if active_biome != "farm":
		return false
	if qty("supplies") <= 0:
		return false
	return true

## Launch a harbor expedition. On failure returns {ok:false, reason} (the FIRST guard
## that trips, in order: "already_out" → "no_supplies") WITHOUT mutating. On success:
## convert ALL supplies into harbor turns (1 supplies = 1 turn), remove "supplies" from
## inventory, reset the tide to high (turn 0), seed the giant pearl, enter the harbor,
## and return {ok:true, turns}. MIRRORS enter_mine; the catch accrues in the shared
## inventory.
func enter_harbor() -> Dictionary:
	if active_biome != "farm":
		return {"ok": false, "reason": "already_out"}
	if qty("supplies") <= 0:
		return {"ok": false, "reason": "no_supplies"}
	var s: int = qty("supplies")
	inventory.erase("supplies")
	# T30: record the supplies spent on this voyage for the run-summary dashboard (mirrors enter_mine).
	run_supplies_consumed["supplies"] = int(run_supplies_consumed.get("supplies", 0)) + s
	harbor_turns_left = s
	active_biome = "harbor"
	# Reset the tide cycle for a fresh session: high tide, 0 spent turns.
	fish_tide = FishConfig.TIDE_HIGH
	fish_tide_turn = 0
	# Seed the session's single giant pearl (one per session).
	_init_pearl()
	return {"ok": true, "turns": s}

## Seed the harbor session's single giant pearl. Pure-ish helper (uses the seeded `rng`
## only for the deterministic seed CELL): records { row, col, turns_left = PEARL_TURNS }.
## The LIVE board placement is the next slice's job — for the LOGIC slice we just record
## the countdown (and a deterministic seed cell from the seeded rng so screenshots/tests
## are reproducible). Called by enter_harbor.
func _init_pearl() -> void:
	var row: int = rng.randi_range(0, Constants.ROWS - 1)
	var col: int = rng.randi_range(0, Constants.COLS - 1)
	fish_pearl = {"row": row, "col": col, "turns_left": Constants.PEARL_TURNS}

## True while the giant pearl is live (a pearl is seeded with turns remaining).
func has_active_pearl() -> bool:
	return not fish_pearl.is_empty() and int(fish_pearl.get("turns_left", 0)) > 0

## The refill pool for the tide currently up (Array[int]) — FishConfig.tide_pool. The
## board slice uses this to mutate the bottom row on a tide flip.
func current_tide_pool() -> Array:
	return FishConfig.tide_pool(fish_tide)

## Spend one harbor turn. Call AFTER a harbor chain resolves (its resources are already
## credited via credit_chain). Three things tick, in order:
##   1. Decrement harbor_turns_left; if it hits 0 the expedition ENDS (back to the farm),
##      and the pearl is cleared. SOFT-FAIL: everything caught is kept (it's already in
##      `inventory`).
##   2. The TIDE: increment fish_tide_turn; when it reaches Constants.TIDE_PERIOD the tide
##      FLIPS (high↔low) and fish_tide_turn resets to 0.
##   3. The PEARL countdown: decrement fish_pearl.turns_left; at 0 the pearl EXPIRES
##      (cleared — the board slice degrades the tile back to kelp).
## Returns { exited:bool, turns_left:int, tide_flipped:bool, pearl_expired:bool }.
## MIRRORS note_mine_turn, with the tide + pearl ticks layered on.
func note_harbor_turn() -> Dictionary:
	harbor_turns_left = maxi(0, harbor_turns_left - 1)
	# Tide tick (independent of the turn-budget exhaustion below).
	var tide_flipped: bool = false
	fish_tide_turn += 1
	if fish_tide_turn >= Constants.TIDE_PERIOD:
		fish_tide = FishConfig.flip_tide(fish_tide)
		fish_tide_turn = 0
		tide_flipped = true
	# Pearl countdown tick (independent of the tide). At 0 the pearl expires.
	var pearl_expired: bool = false
	if not fish_pearl.is_empty():
		var left: int = maxi(0, int(fish_pearl.get("turns_left", 0)) - 1)
		if left <= 0:
			fish_pearl = {}
			pearl_expired = true
		else:
			fish_pearl["turns_left"] = left
	# Expedition end: when the turn budget is spent, return to the farm and clear the
	# pearl (the session is over). Reported via `exited` like note_mine_turn.
	if harbor_turns_left == 0:
		active_biome = "farm"
		fish_pearl = {}
		return {"exited": true, "turns_left": 0, "tide_flipped": tide_flipped, "pearl_expired": pearl_expired}
	return {"exited": false, "turns_left": harbor_turns_left, "tide_flipped": tide_flipped, "pearl_expired": pearl_expired}

## Manually abandon the harbor expedition early (the Town screen "Leave the harbor"
## button). Snap back to the farm, drop the remaining turns, and clear the pearl —
## everything caught is kept. MIRRORS leave_mine.
func leave_harbor() -> void:
	active_biome = "farm"
	harbor_turns_left = 0
	fish_pearl = {}

## Attempt to capture the giant pearl with a resolved harbor chain. `chain_keys` is the
## resolved chain's tiles (either String tile keys or int Constants.Tile ordinals — see
## FishConfig.is_pearl_chain_valid). On a VALID capture while in the harbor with a live
## pearl: grant +1 Rune, clear the pearl (no double-grant), and return
## {captured:true, runes}. Otherwise (not in the harbor, no live pearl, or an invalid
## chain) returns {captured:false} WITHOUT mutating. The board slice calls this on each
## resolved harbor chain.
func try_capture_pearl(chain_keys: Array) -> Dictionary:
	if not is_in_harbor():
		return {"captured": false}
	if not has_active_pearl():
		return {"captured": false}
	if not FishConfig.is_pearl_chain_valid(chain_keys):
		return {"captured": false}
	runes += 1
	fish_pearl = {}
	return {"captured": true, "runes": runes}

## BOARD-side pearl capture (the LIVE harbor board's actual rule). `chain_cells` is the
## resolved chain's cells (Array[Vector2i], board coords col=x/row=y). On a VALID capture
## — in the harbor, with a live pearl, a chain of at least Constants.REQUIRED_FISH_IN_CHAIN
## cells, and at least one chained cell 8-ADJACENT (Chebyshev distance <= 1) to the live
## pearl cell — grant +1 Rune, clear the pearl (no double-grant), and return
## {captured:true, runes}. Otherwise returns {captured:false} WITHOUT mutating.
##
## WHY THIS EXISTS ALONGSIDE try_capture_pearl. The React rule is "the chain CONTAINS the
## pearl tile + >= REQUIRED_FISH_IN_CHAIN other fish" (try_capture_pearl / FishConfig). The
## port's is_valid_chain requires an ALL-SAME-KEY chain, so a chain can never simultaneously
## contain the pearl AND fish tiles — that rule can't fire on the live board. The board
## therefore adapts it to the engine's existing ADJACENCY pattern (exactly like
## Board.clear_rubble_on_stone sweeping rubble 8-adjacent to a STONE chain): a same-key
## fish chain run NEXT TO the pearl captures it. The Board only emits its `pearl_chain_resolved`
## signal for a FISH-category chain of length >= REQUIRED_FISH_IN_CHAIN (it owns the grid +
## tile types), so the fish-category + length gates are enforced there; this method enforces
## the harbor / live-pearl / adjacency gates against GameState. try_capture_pearl stays as
## the pure, React-parity rule (still unit-tested + reachable); the LIVE board uses THIS.
func capture_pearl_if_adjacent(chain_cells: Array) -> Dictionary:
	if not is_in_harbor():
		return {"captured": false}
	if not has_active_pearl():
		return {"captured": false}
	if chain_cells == null or chain_cells.size() < Constants.REQUIRED_FISH_IN_CHAIN:
		return {"captured": false}
	var pearl := Vector2i(int(fish_pearl.get("col", -1)), int(fish_pearl.get("row", -1)))
	var adjacent: bool = false
	for cell in chain_cells:
		var v: Vector2i = cell
		if maxi(absi(v.x - pearl.x), absi(v.y - pearl.y)) <= 1:
			adjacent = true
			break
	if not adjacent:
		return {"captured": false}
	runes += 1
	fish_pearl = {}
	return {"captured": true, "runes": runes}

## Active board CATEGORIES: the two staples plus the category of each placed
## SPAWNER, in build order, deduplicated. Drives "what can spawn / be chained".
## Refiners (Bakery) have no category and contribute nothing — the empty-string
## filter already guards them, but is_spawner makes the intent explicit.
func active_categories() -> Array:
	# Seed with the home-zone base categories (ZoneConfig.HOME_BASE_CATEGORIES); duplicate so the
	# appends below never mutate the shared const.
	var cats: Array = ZoneConfig.HOME_BASE_CATEGORIES.duplicate()
	for id in buildings:
		if not BuildingConfig.is_spawner(id):
			continue
		var cat: String = BuildingConfig.building_category(id)
		if cat != "" and not cats.has(cat):
			cats.append(cat)
	return cats

## The ordered FARM categories whose representative tile each map carries. SOURCE of the key
## ORDER for the two maps below (byte-identical to the former hand-written const order):
##   • FARM_FULL_CATEGORIES — the FULL set (10): the complete farm slice of Constants.CATEGORY.
##   • FARM_BASE_SPAWN_CATEGORIES — the eligible base-spawn SUBSET (6): grass/grain/trees/birds/
##     veg/fruit. The four upgrade-only targets (flower/herd/cattle/mount) are DELIBERATELY
##     excluded so PANSY/PIG/COW/HORSE never base-spawn on the home farm.
const FARM_FULL_CATEGORIES: Array = ["grass", "grain", "trees", "birds", "veg", "fruit", "flower", "herd", "cattle", "mount"]
const FARM_BASE_SPAWN_CATEGORIES: Array = ["grass", "grain", "trees", "birds", "veg", "fruit"]

## The single representative TILE for each ELIGIBLE home-farm category — the BASE-SPAWN subset.
## DERIVED from TileCategoryConfig.representative_tile (the single source of which tile each
## category maps to), keyed by the FARM_BASE_SPAWN_CATEGORIES order so the map is byte-identical
## to the former hand-written const: grass→GRASS, grain→WHEAT, trees→OAK, birds→PHEASANT,
## veg→CARROT, fruit→APPLE. flower/herd/cattle/mount are ABSENT (never base-spawn).
## A `static var` (not a `const`) because GDScript const-expressions can't call a function; built
## once at class load and never mutated, so it reads exactly like the old const for every consumer.
static var FARM_CATEGORY_TILE: Dictionary = _build_farm_category_tiles(FARM_BASE_SPAWN_CATEGORIES)

## The FULL home-farm category → representative TILE map — every farm-playable category, NOT just
## the eligible base-spawn six. DISTINCT from FARM_CATEGORY_TILE above (the base-spawn subset):
## this one ALSO covers the upgrade-only TARGET categories herd/cattle/mount (and flower) →
## PIG/COW/HORSE (and PANSY). Those tiles must never BASE-SPAWN (FARM_CATEGORY_TILE excludes them)
## yet they DO arrive as UPGRADE tiles — chaining birds→PIG (herd), the React upgradeMap's whole
## point. upgrade_spawn() resolves its target tile through THIS map so an upgrade target outside the
## eligible set still maps to a real tile, while base spawns stay restricted to FARM_CATEGORY_TILE.
## DERIVED from TileCategoryConfig.representative_tile (single source), keyed by FARM_FULL_CATEGORIES
## order — byte-identical to the former hand-written const.
static var FARM_CATEGORY_TO_TILE: Dictionary = _build_farm_category_tiles(FARM_FULL_CATEGORIES)

## Build a { category → representative Constants.Tile } map for `cats`, reading each tile from
## TileCategoryConfig.representative_tile (so the tile a category maps to lives in ONE place). The
## key ORDER follows `cats`. Asserts the config has a real tile for every requested farm category
## (a misfiled/absent farm category would silently break the board pool, so fail loud at load).
static func _build_farm_category_tiles(cats: Array) -> Dictionary:
	var out: Dictionary = {}
	for c in cats:
		var cat: String = String(c)
		var tile: int = TileCategoryConfig.representative_tile(cat)
		assert(tile != Constants.EMPTY, "TileCategoryConfig has no representative tile for farm category '%s'" % cat)
		out[cat] = tile
	return out

## The per-spawner board-pool boost (extra weight slots a placed spawner adds for its category)
## now lives on ZoneConfig.SPAWNER_BOOST_SLOTS — board/zone-pool tuning belongs with the zone config.

## How many UPGRADE TILES of the zone's next tier a resolved farm chain spawns, and WHICH tile —
## the React core loop (src/GameScene.ts nextUpgradeTile + utils.ts upgradeCountForChain /
## features/zones/data.ts nextResourceForZone). PURE + headless-testable (no node, no RNG): given
## the zone, the SOURCE tile that was chained, and the chain length, returns
##   { "count": int, "tile": int }
## where `count` = floor(chain_len / threshold(source_tile)) (BoardLogic.upgrade_count) and `tile`
## is the upgrade TARGET tile. Returns count 0 / tile EMPTY (so the chain just credits its normal
## resources/coins, no upgrade tile) when:
##   - the source tile has no real threshold (a hazard like RAT/RUBBLE → NO_THRESHOLD → count 0),
##   - the chain is below threshold (floor → 0),
##   - the zone's upgradeMap has NO redirect for the source category, OR
##   - the redirect is the GOLD sentinel (ZoneConfig.GOLD — "coins, no tile"; e.g. fruit→GOLD).
## The target tile is resolved through FARM_CATEGORY_TO_TILE (the FULL map) so upgrade-only targets
## (herd→PIG, cattle→COW, mount→HORSE) map to real tiles even though they never base-spawn.
## ONLY meaningful for the FARM (home zone) — the mine/harbor have no zone upgradeMap, so callers
## apply this on the farm biome only (mine/harbor pass through unchanged).
static func upgrade_spawn(zone_id: String, source_tile: int, chain_len: int) -> Dictionary:
	var none := {"count": 0, "tile": Constants.EMPTY}
	var threshold: int = Constants.threshold_for(source_tile)
	var count: int = BoardLogic.upgrade_count(chain_len, threshold)
	if count <= 0:
		return none   # below threshold, or a hazard tile (NO_THRESHOLD)
	var source_cat: String = Constants.category_of(source_tile)
	var target_cat: String = ZoneConfig.upgrade_target(zone_id, source_cat)
	# No redirect ("") or the GOLD sentinel → no upgrade tile (coins only, e.g. fruit→GOLD).
	if target_cat == "" or target_cat == ZoneConfig.GOLD:
		return none
	if not FARM_CATEGORY_TO_TILE.has(target_cat):
		return none   # defensive: a target category with no farm tile spawns nothing
	return {"count": count, "tile": int(FARM_CATEGORY_TO_TILE[target_cat])}

## INSTANCE upgrade spawn (T2). Identical to the static upgrade_spawn but resolves the
## upgrade TARGET tile through the player's ACTIVE VARIANT for the target category instead of
## the static base tile — mirroring React nextResourceForZone honouring the active variant
## (src/features/zones/data.ts:303-310). Default active == base tile, so for a fresh game
## this returns the SAME tile as the static helper. Use this from the live board (Main.gd)
## so an upgrade chain spawns the player's chosen variant of the target category.
func upgrade_spawn_active(zone_id: String, source_tile: int, chain_len: int) -> Dictionary:
	var res: Dictionary = GameState.upgrade_spawn(zone_id, source_tile, chain_len)
	if int(res.get("count", 0)) <= 0:
		return res   # below threshold / GOLD sentinel / hazard — no tile to substitute
	# T17/T21: chain_redirect_category channel (a worker ability — src/config/abilitiesAggregate.ts
	# chain_redirect). A chain in the SOURCE tile's category, long enough to meet the redirect's
	# effective threshold, spawns the upgrade from the TARGET category instead of the source's native
	# upgrade. EMPTY for a fresh game (no chain_redirect source) → the native upgrade target is used.
	var source_cat: String = Constants.category_of(source_tile)
	var redirects: Dictionary = compute_ability_channels()["chain_redirect"]
	var redirect: Dictionary = redirects.get(source_cat, {})
	if not redirect.is_empty() and float(chain_len) >= float(redirect.get("threshold", INF)):
		var to_cat: String = String(redirect.get("to_category", ""))
		if to_cat != "" and FARM_CATEGORY_TO_TILE.has(to_cat):
			res = res.duplicate()
			res["tile"] = int(FARM_CATEGORY_TO_TILE[to_cat])
	# Resolve the target category from the (possibly redirected) result tile, then swap in its
	# active variant (default == base tile, so a fresh game is byte-identical).
	var base_tile: int = int(res["tile"])
	var target_cat: String = Constants.category_of(base_tile)
	var active: int = active_tile_for_category(target_cat)
	if active != Constants.EMPTY:
		res = res.duplicate()
		res["tile"] = active
	return res

## Active weighted refill pool (Array[int] of Constants.Tile) for the home FARM board:
## a ZONE-RESTRICTED, SEASON-WEIGHTED base pool — NOT the old flat full-variety FARM_POOL.
##
## A1 (bug fix): zone-1 used to base-spawn EVERY farm tile (incl. pansy/pig/cow/horse) from
## turn 1. It must instead base-spawn ONLY the home zone's ELIGIBLE categories (grass/grain/
## trees/birds/veg/fruit — the upgradeMap keys), weighted by the CURRENT SEASON's drop rates.
## flower/herd/cattle/mount are NOT eligible, so PANSY/PIG/COW/HORSE never base-spawn here.
##
## Construction (DETERMINISTIC, no RNG — the RNG lives in BoardLogic.refill which samples this
## pool): for each eligible category with a POSITIVE season weight, add round(weight*100) slots
## of that category's tile (floored at 1 so any positive weight contributes at least one slot).
## Spring (grass .38 …) yields a grass-dominant pool; Winter (trees .73) a tree-dominant one.
##
## Then layer the EXISTING semantics on top:
##   - SPAWNER BOOST: each placed spawner whose category is eligible adds ZoneConfig.SPAWNER_BOOST_SLOTS
##     extra slots of its tile (build a Lumber Camp → more oak). Refiners (Bakery, no category)
##     and spawners for INELIGIBLE categories are skipped — a spawner can't smuggle an
##     ineligible category back onto the home board.
##   - RATS: once Town 2 is complete (rats_enabled) seed RAT_POOL_SLOTS rat tiles (unchanged).
## The mine/harbor pools (active_biome_pool) are NOT seasonal and are untouched by this.
## The TILE a category contributes to the live board pool: its ACTIVE VARIANT when one is
## set + discovered, else the category's base spawn tile (FARM_CATEGORY_TILE). T2 — mirrors
## React getActivePool's per-slot substitution (effects.ts:124-134): a category's pool slots
## resolve to its active variant id. The base-tile fallback guarantees a fresh game (default
## active == base) produces a pool byte-identical to the pre-variant one.
func _category_pool_tile(cat: String) -> int:
	var active: int = active_tile_for_category(cat)
	if active != Constants.EMPTY:
		return active
	return int(FARM_CATEGORY_TILE.get(cat, Constants.EMPTY))

func active_tile_pool() -> Array:
	var pool: Array = []
	var season: String = current_season_name()
	var fzone: String = _active_farm_zone()
	var drops: Dictionary = ZoneConfig.season_drops(fzone, season)
	# Base pool: season-weighted slots per eligible category. Iterate eligible_categories so
	# the order is stable (the upgradeMap key order) and ineligible categories are impossible.
	for cat in ZoneConfig.eligible_categories(fzone):
		if not FARM_CATEGORY_TILE.has(cat):
			continue
		var weight: float = float(drops.get(cat, 0.0))
		if weight <= 0.0:
			continue
		var slots: int = maxi(1, int(round(weight * 100.0)))
		# T2: substitute the ACTIVE VARIANT for this category (default = the base tile, so a
		# fresh game is byte-identical to the pre-variant pool). Mirrors React getActivePool
		# (effects.ts:118-148): each pool slot's category resolves to its active variant id.
		var tile: int = _category_pool_tile(cat)
		for _i in slots:
			pool.append(tile)
	# Spawner BOOST: extra slots for each placed spawner's ELIGIBLE category (a frequency
	# boost, not a category unlock). Ineligible-category spawners + refiners are skipped.
	for id in buildings:
		if not BuildingConfig.is_spawner(id):
			continue
		var bcat: String = BuildingConfig.building_category(id)
		if not FARM_CATEGORY_TILE.has(bcat):
			continue
		# T2: a spawner boosts its category's ACTIVE VARIANT (default = the spawner's base
		# tile, so an un-customised board is unchanged). The boost is a frequency bump on the
		# tile that actually spawns for that category.
		var btile: int = _category_pool_tile(bcat)
		for _i in ZoneConfig.SPAWNER_BOOST_SLOTS:
			pool.append(btile)
	# T6: the React home categories are LOCKED ON and the player picks a VARIANT per category;
	# there is no soft category-selection boost. The old farm_run_selected soft-boost block (the
	# documented divergence) is REMOVED — the run config is now the per-category variant choices
	# (tile_active_by_category), substituted above. farm_run_selected stays a vestigial field
	# (still emitted by StartFarmingModal + round-tripped) but no longer biases the pool.
	# T9: rats are NO LONGER seeded into the refill pool. The faithful React model (HazardLogic)
	# spawns rats POSITIONALLY via roll_rat_spawn on each board fill and they EAT adjacent plants
	# each turn (src/features/farm/rats.ts) — they are not a random pool draw. The legacy
	# RAT_POOL_SLOTS seeding is removed here; rats_enabled() now only gates whether the positional
	# spawn roll runs (see note_farm_turn / Main's fill-spawn wiring). The mine pool is untouched.
	# T17/T21: effective_pool_weights channel (the React getActivePool weight bonus — pool_weight
	# ability from a building/tile/worker). Each entry is { target -> int extra slots }; the target
	# is a TILE string key (tile_tree_oak, …). Add that many slots of the resolved tile, but ONLY
	# when the tile is ALREADY in the pool (eligible for the home zone) — exactly like the spawner
	# boost and fill-bias, never smuggling an off-zone tile onto the board. EMPTY for a fresh game
	# (no pool_weight source — tile pool_weight is inert in production per TileVariantConfig) → the
	# pool is unchanged. Resolved via Constants string-key reverse lookup.
	var pool_weights: Dictionary = compute_ability_channels()["effective_pool_weights"]
	if not pool_weights.is_empty():
		for target_key in pool_weights.keys():
			var extra_slots: int = int(pool_weights[target_key])
			if extra_slots <= 0:
				continue
			var pw_tile: int = Constants.tile_for_string_key(String(target_key))
			if pw_tile == Constants.EMPTY:
				continue
			# Only boost a tile already present in the pool (eligible) — preserves zone restriction.
			if not pool.has(pw_tile):
				continue
			for _i in extra_slots:
				pool.append(pw_tile)
	# T13 — SEASON_POOL_MODS (additive seasonal spawn deltas).
	# Mirrors React SEASON_POOL_MODS (src/constants.ts:1123-1128) + applySeasonPoolMods
	# (src/features/farm/poolMath.ts:16-31). Applied AFTER the base weighting + spawner boost
	# + pool_weights, BEFORE fill_bias — exactly the React layer order.
	#
	# For each delta in the season's mod table:
	#   delta > 0 → push that many copies of the target tile (adds slots, even if the tile
	#               is not currently in the pool — allows zero-base tiles to appear; the
	#               safety-net GRASS fallback below still prevents an all-empty pool).
	#               IMPLEMENTATION NOTE: React's applySeasonPoolMods pushes freely; the
	#               React pool always already contains the target (it's an eligible category
	#               tile + its weight is > 0 in that season except for Winter stone which is
	#               a mine tile — see the Winter +1 stone note below). We apply the same push-
	#               freely strategy here; unreachable tiles (mine tiles on the farm) will be
	#               pushed but the SAFETY NET is a GRASS fallback if the pool empties, not a
	#               tile-guard. In practice the Winter +1 tile_mine_stone resolves to STONE;
	#               STONE is a mine tile and would never appear under normal farm play, but it
	#               faithfully mirrors React. If a future milestone excludes mine tiles from the
	#               farm pool, revisit this delta.
	#   delta < 0 → remove up to |delta| copies, but ONLY while at least 2 copies remain
	#               (never drive a tile to 0 — mirrors React's `workerPool.filter(x=>x===k).length > 1`
	#               guard). Silently skips if the tile is absent or already at 1 copy.
	var spm: Dictionary = ZoneConfig.season_pool_mods(season)
	for key_v in spm.keys():
		var key: String = String(key_v)
		var delta: int = int(spm[key])
		if delta == 0:
			continue
		var tile_val: int = Constants.tile_for_string_key(key)
		if tile_val == Constants.EMPTY:
			continue  # unknown tile key — silently skip (future-proofed against catalog gaps)
		if delta > 0:
			for _i in delta:
				pool.append(tile_val)
		else:
			# delta < 0: remove up to |delta| slots, never the last copy.
			var to_remove: int = -delta
			while to_remove > 0:
				var current_count: int = 0
				for t in pool:
					if int(t) == tile_val:
						current_count += 1
				if current_count <= 1:
					break  # at 0 or 1 — stop, never drive below 1 (or from nothing)
				var last_idx: int = -1
				for i in range(pool.size() - 1, -1, -1):
					if int(pool[i]) == tile_val:
						last_idx = i
						break
				if last_idx >= 0:
					pool.remove_at(last_idx)
				to_remove -= 1
	# Fill bias: while armed, DOUBLE the target tile's slots already in the pool so the next
	# fills favour it (faithful to the web's pool-doubling). Only doubles a tile that is ALREADY
	# eligible — never injects an off-zone tile (preserves zone restriction). Pure read; the
	# countdown decrements in note_farm_turn.
	if fill_bias_turns > 0 and fill_bias_target != Constants.EMPTY:
		var extra: int = 0
		for t in pool:
			if int(t) == fill_bias_target:
				extra += 1
		for _i in extra:
			pool.append(fill_bias_target)
	# Safety net: every shipped season has a positive-weight eligible category, so the base
	# pool is never empty today. Guard anyway so a future zone/season with an all-zero row can
	# never hand BoardLogic.refill an empty pool (which would dead-lock the board).
	if pool.is_empty():
		pool.append(Constants.Tile.GRASS)
	return pool

# ── Seasonal bosses (T24, timed resource-target model) ─────────────────────────

## True while a boss challenge is in progress.
func is_boss_active() -> bool:
	return boss_active != ""

## The boss that a NEW challenge would spawn right now: the CURRENT farm season's boss. The port
## has no calendar, so the boss season is derived from the live farm season (current_season_name
## → lowercase). Spring has TWO bosses (quagmire/mossback) and summer two (ember_drake/storm);
## the season picker returns the FIRST in BOSS_IDS order, but pending_boss honours a still-undone
## CAPSTONE: while town2 isn't complete and the season is summer, the capstone (storm) is offered
## so the Town-2 gate is reachable; otherwise the season's first boss is offered. Returns "" only
## if the season maps to no boss (never today — all four seasons have one).
func pending_boss_id() -> String:
	var season: String = current_season_name().to_lower()
	# Capstone reachability: if Town 2 isn't done and we're in the capstone's season, offer it.
	if not town2_complete and BossConfig.boss_season(BossConfig.CAPSTONE) == season:
		return BossConfig.CAPSTONE
	# A season can hold TWO bosses (spring quagmire/mossback; summer ember_drake/storm). ROTATE
	# through the season's roster by how many bosses you've already defeated so BOTH become
	# reachable across successive challenges — without this, boss_for_season's first-in-order pick
	# meant mossback (and post-capstone ember_drake) could never spawn. Mirrors React reaching
	# every boss via YEAR_BOSS_ROTATION rather than a fixed season→boss map.
	var roster: Array = BossConfig.season_roster(season)
	if roster.is_empty():
		return ""
	var idx: int = int(achievement_counters.get("bosses_defeated", 0)) % roster.size()
	return String(roster[idx])

## True when a boss CAN be challenged right now: no challenge is already in progress, the
## settlement has reached City (the boss is the City-tier gate), you've "mastered the mine" — at
## least 12 combined refined mine goods (block + iron_bar) banked — and the current season maps to
## a boss. Unlike the old single-capstone gate, this does NOT block once town2_complete: the five
## non-capstone bosses stay re-challengeable; only RE-fighting the capstone is blocked (see
## start_boss's "capstone_done" guard). Guards are ordered so start_boss reports the FIRST failure.
func can_challenge_boss() -> bool:
	if is_boss_active():
		return false
	if settlement.tier < TownConfig.TIER_CITY:
		return false
	# Mine-mastery gate (≥ BossConfig.MINE_MASTERY_THRESHOLD combined refined goods). Threshold +
	# goods keys are owned by BossConfig.MINE_MASTERY_GOODS so this check isn't duplicated inline.
	if not BossConfig.mine_mastery_met(qty(BossConfig.MINE_MASTERY_GOODS[0]), qty(BossConfig.MINE_MASTERY_GOODS[1])):
		return false
	if pending_boss_id() == "":
		return false
	# The capstone, once defeated, can't be re-challenged (its only purpose is the Town-2 gate).
	if pending_boss_id() == BossConfig.CAPSTONE and town2_complete:
		return false
	return true

## Begin the CURRENT season's boss challenge (the boss pending_boss_id() names). On failure returns
## {ok:false, reason} (the FIRST guard that trips: "in_fight" → "locked" → "not_ready" →
## "no_boss" → "capstone_done") WITHOUT mutating. On success: arm the boss at full window, apply its
## board MODIFIER to a fresh modifier_state (against the live board dims), and return
## {ok:true, id, name, target_resource, target_amount, turns_remaining, min_chain, modifier_desc}.
## `rng` seeds the modifier's cell/column picks (a fresh RandomNumberGenerator by default; tests pass
## a seeded one for determinism).
func start_boss(rng_in: RandomNumberGenerator = null) -> Dictionary:
	if is_boss_active():
		return {"ok": false, "reason": "in_fight"}
	if settlement.tier < TownConfig.TIER_CITY:
		return {"ok": false, "reason": "locked"}
	# Mine-mastery gate — same BossConfig threshold + goods as can_challenge_boss (single source).
	if not BossConfig.mine_mastery_met(qty(BossConfig.MINE_MASTERY_GOODS[0]), qty(BossConfig.MINE_MASTERY_GOODS[1])):
		return {"ok": false, "reason": "not_ready"}
	var id: String = pending_boss_id()
	if id == "":
		return {"ok": false, "reason": "no_boss"}
	if id == BossConfig.CAPSTONE and town2_complete:
		return {"ok": false, "reason": "capstone_done"}
	var seeded_rng: RandomNumberGenerator = rng_in if rng_in != null else RandomNumberGenerator.new()
	if rng_in == null:
		seeded_rng.randomize()
	boss_active = id
	boss_season = BossConfig.boss_season(id)
	boss_turns_remaining = BossConfig.BOSS_WINDOW_TURNS
	boss_progress = 0
	boss_target_resource = BossConfig.target_resource(id)
	boss_target_amount = BossConfig.target_amount(id)
	# Apply the board MODIFIER to a fresh modifier_state (the overlay Board renders/gates).
	boss_modifier_state = BossModifierLogic.apply_to_fresh_grid(
		BossConfig.boss_modifier(id), Constants.ROWS, Constants.COLS, seeded_rng)
	return {
		"ok": true,
		"id": id,
		"name": BossConfig.boss_name(id),
		"target_resource": boss_target_resource,
		"target_amount": boss_target_amount,
		"turns_remaining": boss_turns_remaining,
		"min_chain": BossConfig.boss_min_chain(id),
		"modifier_desc": BossConfig.modifier_desc(id),
	}

## Minimum chain length the BOARD must demand right now: the active boss's raised bar (storm's
## min_chain modifier → 4) while a challenge is live, else the base Constants.MIN_CHAIN.
func boss_min_chain() -> int:
	if is_boss_active():
		return BossConfig.boss_min_chain(boss_active)
	return Constants.MIN_CHAIN

## Advance boss PROGRESS for one resolved chain. `tile_type` is the chained Tile enum, `chain_len`
## the tiles in the chain, `units` the resource units the chain produced (credit_chain's result).
## PROGRESS COUNTING (faithful to React's CHAIN_COLLECTED boss branch, boss/slice.ts:200-224):
##   - TILE-key target (tile_tree_oak / tile_grass_grass / tile_mine_stone / tile_fruit_blackberry):
##     count CHAINED TILES of that type — add `chain_len` when the chained tile's STRING key matches
##     the target. (For min_chain bosses a chain shorter than the bar never reaches here — it isn't a
##     valid chain — so the storm "short chains yield nothing" rule is enforced by the board gate.)
##   - RESOURCE target (iron_bar / fish_fillet): count UNITS PRODUCED — add `units` when the chain's
##     produced resource matches the target. (iron_bar is also produced by crafting; see
##     note_boss_craft for the craft path.)
## Progress is clamped to the target amount. With no boss active this is a no-op returning
## {active:false}. On the chain that MEETS the target the boss is RESOLVED (a win) via _resolve_boss
## and the result carries {defeated:true, ...}; otherwise {active:true, defeated:false, progress, ...}.
func note_boss_chain(tile_type: int, chain_len: int, units: int) -> Dictionary:
	if not is_boss_active():
		return {"active": false}
	var added: int = 0
	var target: String = boss_target_resource
	if Constants.string_key(tile_type) == target:
		# Tile-key target: count chained tiles of that type.
		added = chain_len
	elif Constants.produced_resource(tile_type) == target:
		# Resource target: count units produced of that resource.
		added = units
	if added > 0:
		boss_progress = mini(boss_target_amount, boss_progress + added)
		if boss_progress >= boss_target_amount:
			return _resolve_boss()
	return {"active": true, "defeated": false, "progress": boss_progress, "target": boss_target_amount}

## Advance boss PROGRESS for a crafted recipe (the iron_bar craft path). Mirrors React's
## CRAFTING/CRAFT_RECIPE boss branch (boss/slice.ts:226-239): only an iron_bar-target boss counts,
## and only a recipe that CONSUMES iron_bar as an INPUT ticks +1 toward the target (the Ember Drake
## demands forged iron be SPENT — `recipe.inputs?.[ResourceKey.IronBar]` in React). A non-iron_bar
## boss, no boss, or a recipe that doesn't take iron_bar is a no-op. Returns the same shape as
## note_boss_chain (resolves on the unit that meets the target). NOTE: iron_bar PRODUCED by chaining
## iron-ore tiles also counts via note_boss_chain's resource-target path — both feed the same fight.
func note_boss_craft(recipe_key: String) -> Dictionary:
	if not is_boss_active():
		return {"active": false}
	# Only the iron_bar-target boss (Ember Drake) counts a craft. The target resource id is owned by
	# BossConfig (the Ember Drake's target field), not hardcoded here. The same concept drives the
	# recipe-INPUT check below: React ticks only when the recipe CONSUMES the boss target resource
	# (`recipe.inputs?.[ResourceKey.IronBar]`, boss/slice.ts:226-239), so the input key is the boss
	# target — routed through ember_target so there is a single source for the resource id.
	var ember_target: String = BossConfig.target_resource(BossConfig.EMBER_DRAKE)
	if boss_target_resource != ember_target:
		return {"active": true, "defeated": false, "progress": boss_progress, "target": boss_target_amount}
	if not RecipeConfig.is_recipe(recipe_key):
		return {"active": true, "defeated": false, "progress": boss_progress, "target": boss_target_amount}
	if int(RecipeConfig.recipe_inputs(recipe_key).get(ember_target, 0)) <= 0:
		return {"active": true, "defeated": false, "progress": boss_progress, "target": boss_target_amount}
	boss_progress = mini(boss_target_amount, boss_progress + 1)
	if boss_progress >= boss_target_amount:
		return _resolve_boss()
	return {"active": true, "defeated": false, "progress": boss_progress, "target": boss_target_amount}

## TICK one boss-window turn — call AFTER a chain resolves while a boss is active. Mirrors React's
## CLOSE_SEASON boss branch (boss/slice.ts:241-263): tick the modifier (heat ages + burns), then
## decrement the window; if the window hits 0 with the target unmet the challenge RESOLVES as a LOSS.
## When the target is already met the chain-resolve path already resolved it (note_boss_chain), so
## this only ever closes out a LOSS or ticks the heat/window. `grid` (the live board) and `rng` drive
## the heat spawn/burn. Returns:
##   no boss              → {active:false}
##   target already met   → {active:false} (resolved by the chain that met it)
##   window survived      → {active:true, defeated:false, turns_remaining, burned, spawned_heat}
##   window expired (loss)→ the _resolve_boss loss result {active:true, defeated:false, ...resolved}
func tick_boss_turn(rng: RandomNumberGenerator) -> Dictionary:
	if not is_boss_active():
		return {"active": false}
	var burned: int = 0
	var spawned: Array = []
	var mtype: String = BossConfig.modifier_type(boss_active)
	if mtype == BossModifierLogic.HEAT_TILES:
		var params: Dictionary = BossConfig.boss_modifier(boss_active).get("params", {})
		var burn_after: int = int(params.get("burnAfter", 2))
		# Tick the existing heat (age + burn) FIRST, then spawn this turn's new heat tile.
		burned = BossModifierLogic.tick_heat(boss_modifier_state, burn_after, inventory, rng)
		spawned = BossModifierLogic.spawn_heat(
			boss_modifier_state, Constants.ROWS, Constants.COLS, int(params.get("spawnPerTurn", 1)), rng)
	boss_turns_remaining = maxi(0, boss_turns_remaining - 1)
	if boss_turns_remaining <= 0 and boss_progress < boss_target_amount:
		# Window expired before the target — resolve as a LOSS.
		var loss := _resolve_boss()
		loss["burned"] = burned
		loss["spawned_heat"] = spawned
		return loss
	return {
		"active": true, "defeated": false,
		"turns_remaining": boss_turns_remaining,
		"burned": burned, "spawned_heat": spawned,
	}

## Resolve the active boss (target met = win, else loss). Grants the reward on a win
## (BossConfig.boss_reward: year+margin-scaled coins + 1 rune), clears the challenge + modifier
## overlay, and — on a CAPSTONE win — sets town2_complete (preserving the M3g Town-2 gate). On any
## DEFEAT (win) bumps the bosses_defeated achievement counter + posts the boss_defeated story event
## (unchanged from the old model). Returns
##   {active:true, defeated:bool, id, name, reward_coins, reward_runes, progress, target}.
func _resolve_boss() -> Dictionary:
	var id: String = boss_active
	var nm: String = BossConfig.boss_name(id)
	var reward: Dictionary = BossConfig.boss_reward(id, boss_progress, boss_year)
	var defeated: bool = bool(reward.get("defeated", false))
	var rc: int = int(reward.get("coins", 0))
	var rr: int = int(reward.get("runes", 0))
	var prog: int = boss_progress
	var tgt: int = boss_target_amount
	# Clear the live challenge + modifier overlay (BossModifierLogic.clear strips everything).
	boss_modifier_state = BossModifierLogic.clear(boss_modifier_state)
	boss_active = ""
	boss_season = ""
	boss_turns_remaining = 0
	boss_progress = 0
	boss_target_resource = ""
	boss_target_amount = 0
	if defeated:
		coins += rc
		runes += rr
		# CAPSTONE win sets the Town-2 gate (preserving the M3g progression).
		if id == BossConfig.CAPSTONE:
			town2_complete = true
		# M10 achievements (ADDITIVE): only a DEFEAT bumps bosses_defeated (+1).
		bump_counter("bosses_defeated")
		# Story engine (ADDITIVE, only on a DEFEAT): post a "boss_defeated" event.
		post_story_event({"type": "boss_defeated"})
	return {
		"active": true, "defeated": defeated, "id": id, "name": nm,
		"reward_coins": rc, "reward_runes": rr, "progress": prog, "target": tgt,
	}

## True when the cell (row,col) may be CHAINED under the active boss modifier (frozen column /
## rubble / hidden block it). With no boss active everything is chainable. Thin GameState forwarder
## so the Board can gate drags without reaching into modifier_state directly.
func boss_cell_chainable(row: int, col: int) -> bool:
	if not is_boss_active():
		return true
	return BossModifierLogic.cell_chainable(boss_modifier_state, row, col)

## True when (row,col) is a HIDDEN (face-down) boss cell — Board draws the cover; reveal_tiles
## (Miner's Hat) and a chain that includes it both reveal it.
func boss_cell_hidden(row: int, col: int) -> bool:
	if not is_boss_active():
		return false
	return BossModifierLogic.cell_hidden(boss_modifier_state, row, col)

## True when (row,col) carries a boss HEAT marker — Board draws the heat glow.
func boss_cell_heat(row: int, col: int) -> bool:
	if not is_boss_active():
		return false
	return BossModifierLogic.cell_heat(boss_modifier_state, row, col)

## The respawn-boost spawn-bias map { tile_key -> factor } for the active boss (empty for a
## non-respawn_boost boss / no boss). Board's refill weighting reads this to over-spawn the boosted
## tiles (the GDScript analogue of React's boss.spawnBias).
func boss_spawn_bias() -> Dictionary:
	if not is_boss_active():
		return {}
	return BossModifierLogic.spawn_bias(boss_modifier_state)

## Reveal the active boss's hidden cells. `cells` (an Array of {row,col} or Vector2i) reveals just
## those that are hidden (a chain reveal); pass [] to reveal ALL (Miner's Hat). Returns the list of
## {row,col} cells that WERE hidden (so the caller can rebuild those board tiles). A no-op (returns
## []) with no boss or no hidden layer.
func reveal_boss_hidden(cells: Array = []) -> Array:
	if not is_boss_active():
		return []
	if cells.is_empty():
		return BossModifierLogic.reveal_all(boss_modifier_state)
	var revealed: Array = []
	for cell in cells:
		var row: int
		var col: int
		if cell is Vector2i:
			row = cell.y
			col = cell.x
		else:
			row = int((cell as Dictionary).get("row", -1))
			col = int((cell as Dictionary).get("col", -1))
		if BossModifierLogic.reveal_cell(boss_modifier_state, row, col):
			revealed.append({"row": row, "col": col})
	return revealed

# ── Town 3 rats hazard (M3h) ──────────────────────────────────────────────────

## True once rats are a live threat: they appear the moment the capstone boss is
## defeated (town2_complete) — the Town-3 lesson. SIMPLIFICATION: a single
## settlement, so this is just "is Town 2 done" rather than "am I in Town 3" (see
## the per-settlement deferral note on town2_complete / the rats fields above).
func rats_enabled() -> bool:
	return town2_complete

## True when a Ratcatcher is placed (free-shoo capability).
func has_ratcatcher() -> bool:
	return has_building(BuildingConfig.RATCATCHER)

## True when a Master Ratcatcher is placed (grass chains clear adjacent rats).
func has_master_ratcatcher() -> bool:
	return has_building(BuildingConfig.MASTER_RATCATCHER)

## Free shoo-moves left this run: the per-run budget minus what's been spent, never
## negative, and 0 without a Ratcatcher.
func ratcatcher_charges_left() -> int:
	if not has_ratcatcher():
		return 0
	return maxi(0, BuildingConfig.RATCATCHER_CHARGES - ratcatcher_charges_used)

## True when a Ratcatcher is placed AND at least one shoo-move remains.
func can_shoo_rats() -> bool:
	return has_ratcatcher() and ratcatcher_charges_left() > 0

## Spend one Ratcatcher shoo-move. Returns true (and increments the spent count)
## when a charge was available, false otherwise. The ACTUAL board clear happens in
## Board.clear_all_rats — this only books the charge so the cost is accounted once.
func use_ratcatcher_charge() -> bool:
	if not can_shoo_rats():
		return false
	ratcatcher_charges_used += 1
	return true

# ── Farm HAZARDS — turn ticks, spawn rolls, chain clears (T7/T8/T9) ─────────────
## The GameState surface over the pure HazardLogic. GameState owns the live `hazards` dict; the
## board GRID is owned by the Board, so these methods take the grid in + return the new grid out
## (Main threads it back through the board's collapse/refill). Mirrors the React reducer's
## CHAIN_COLLECTED hazard block (src/state.ts:485-517): after a farm chain, tick_fire →
## tick_wolves → roll_farm_hazard → tick_rats → roll_rat_spawn, then the eaten/burned cells
## collapse + refill on the board.

## True when fire CAN spawn right now: the per-session force-on override OR the build-time
## Constants.FIRE_HAZARD_ENABLED (default false → fire is COMPLETE + TESTED but never spawns in
## normal play, matching React's isFireHazardEnabled() default-off). Mirrors featureFlags.ts.
func fire_hazard_enabled() -> bool:
	return fire_hazard_force or Constants.FIRE_HAZARD_ENABLED

## True when ANY farm hazard (rats / fire / wolves) is currently active (single-active cap read).
func any_farm_hazard_active() -> bool:
	return HazardLogic.any_hazard_active(hazards)

## Live positional rats (Array of {row,col,age}); [] when none. The board renders RAT tiles at
## these cells (Main keeps the grid in sync); the HUD reads the count.
func active_rats() -> Array:
	return HazardLogic.rats_of(hazards)

## Live wolves (Array of {row,col,scared}); [] when none. Wolves are OVERLAY entities (NOT grid
## cells) — the Board draws a marker at each cell.
func active_wolves() -> Array:
	return HazardLogic.wolves_list_of(hazards)

## Live fire cells (Array of {row,col}); [] when none. The board renders FIRE tiles at these cells.
func active_fire_cells() -> Array:
	return HazardLogic.fire_cells_of(hazards)

## Tick + spawn every farm hazard for one resolved farm turn, against the live board `grid`.
## Returns { grid:Array, changed:bool } — the (possibly mutated) grid the caller lands on the
## board, and whether any cell was blanked (so Main knows to collapse+refill). Mutates `self.hazards`.
## ORDER mirrors React (src/state.ts:487-507): tick_fire → tick_wolves → roll_farm_hazard (fire/
## wolf spawn) → tick_rats → roll_rat_spawn. Rats spawn only when rats_enabled() (Town 2 done) and
## the inventory gate passes; fire only when fire_hazard_enabled(); wolves when birds-rich. The
## single-active cap lives inside roll_farm_hazard + the rat-spawn cap.
func tick_farm_hazards(grid: Array, rng: RandomNumberGenerator) -> Dictionary:
	var work: Array = grid
	var changed: bool = false
	# 1. Fire spreads (burns an adjacent cell). Only ticks when fire is active.
	var fr: Dictionary = HazardLogic.tick_fire(work, hazards, rng)
	if fr["grid"] != work:
		changed = true
	work = fr["grid"]
	hazards = fr["hazards"]
	# 2. Wolves tick (scared countdown + eat an adjacent bird).
	var wr: Dictionary = HazardLogic.tick_wolves(work, hazards)
	if wr["grid"] != work:
		changed = true
	work = wr["grid"]
	hazards = wr["hazards"]
	# 3. Roll a NEW fire/wolf spawn (single-active capped, fire gated by fire_hazard_enabled()).
	var eggs: int = qty("eggs")
	var turkey: int = qty("turkey")   # no dedicated turkey resource in the port → 0; eggs drives it
	# T17/T21: feed the unified hazard_spawn_reduce channel into the fire/wolf roll (replaces the
	# old no-reduce call). EMPTY for a fresh game → no veto → byte-identical.
	var farm_reduce: Dictionary = farm_hazard_spawn_reduce()
	var spawn: Dictionary = HazardLogic.roll_farm_hazard(work, hazards, fire_hazard_enabled(), eggs, turkey, rng, farm_reduce)
	if not spawn.is_empty():
		if String(spawn.get("kind", "")) == "fire":
			hazards["fire"] = {"cells": spawn.get("cells", [])}
			# Mark the new fire cell on the board so it renders + can be chained.
			for c in spawn.get("cells", []):
				var fr2: int = int(c.get("row", 0))
				var fc2: int = int(c.get("col", 0))
				if fr2 >= 0 and fr2 < Constants.ROWS and fc2 >= 0 and fc2 < Constants.COLS:
					work[fr2][fc2] = Constants.Tile.FIRE
					changed = true
		elif String(spawn.get("kind", "")) == "wolf":
			# Wolves are OVERLAY entities — they do NOT occupy a grid cell (the board draws a
			# marker). So no grid mutation here; just record the wolf.
			hazards["wolves"] = {
				"list": [{"row": int(spawn.get("row", 0)), "col": int(spawn.get("col", 0)), "scared": false}],
				"scared_turns": 0,
			}
	# 4. Rats tick (each eats an adjacent plant). Only when rats are present.
	var rr: Dictionary = HazardLogic.tick_rats(work, hazards)
	if rr["grid"] != work:
		changed = true
	work = rr["grid"]
	hazards = rr["hazards"]
	# 5. Roll a NEW rat spawn (Town 2 done + inventory gate + cap + attracts_rats bump). Rats ARE
	#    grid cells — mark the spawned cell as RAT so it renders + can be chained.
	if rats_enabled():
		# T17/T21: feed the unified hazard_spawn_reduce channel into the rat-spawn roll (a "rats"
		# entry can veto). EMPTY for a fresh game → no veto → byte-identical.
		var rat: Dictionary = HazardLogic.roll_rat_spawn(work, hazards, qty("hay_bundle"), qty("flour"), rng, farm_hazard_spawn_reduce())
		if not rat.is_empty():
			var rrow: int = int(rat.get("row", 0))
			var rcol: int = int(rat.get("col", 0))
			if rrow >= 0 and rrow < Constants.ROWS and rcol >= 0 and rcol < Constants.COLS:
				var list: Array = HazardLogic.rats_of(hazards).duplicate(true)
				list.append({"row": rrow, "col": rcol, "age": 0})
				hazards["rats"] = list
				work[rrow][rcol] = Constants.Tile.RAT
				changed = true
	return {"grid": work, "changed": changed}

## Resolve a chain that ran through RAT tiles. `chain` is an Array of {row,col,tile}. Returns
## { ok, coins_delta, cleared } and credits the coins. ok:false means the chain was NOT a valid
## 3+-rat clear (the caller must reject it — chaining 2 rats / a mixed chain wastes the move). On
## success the rats are removed from `hazards`; the caller blanks those cells on the board.
## Mirrors src/state.ts:286-293 (tryClearRatChain) — chaining rats yields coins, no resources.
func clear_rat_chain(chain: Array) -> Dictionary:
	var res: Dictionary = HazardLogic.try_clear_rat_chain(hazards, chain)
	if not bool(res.get("ok", false)):
		return {"ok": false, "coins_delta": 0, "cleared": 0}
	hazards = res["hazards"]
	var delta: int = int(res.get("coins_delta", 0))
	# T17/T21: hazard_coin_multiplier channel for "rats" (the Ratcatcher worker / any future
	# rats-coin-multiplier source, src/features/farm/rats.ts:141-146). multiplier is 1.0 for a
	# fresh game (no such source) → delta unchanged → byte-identical. Floored to an int (coins are int).
	var mult: float = float(compute_ability_channels()["hazard_coin_multiplier"].get("rats", 1.0))
	if mult != 1.0:
		delta = int(floor(float(delta) * mult))
	coins += delta
	return {"ok": true, "coins_delta": delta, "cleared": int(res.get("cleared", 0))}

## Apply a deadly_pests cull for a resolved chain (Cypress/Beet/Phoenix kill adjacent rats).
## `chain` is an Array of {row,col,tile}. Returns { killed:int, coins_delta, killed_cells } and
## credits the coins. No-op (killed 0) when the chain has no deadly tile or no adjacent rats.
## Mirrors src/state.ts:297 (tryDeadlyPestsKill) — captured + applied alongside the normal chain.
func deadly_pests_kill(chain: Array) -> Dictionary:
	var res: Dictionary = HazardLogic.try_deadly_pests_kill(hazards, chain)
	var killed: int = int(res.get("killed", 0))
	if killed <= 0:
		return {"killed": 0, "coins_delta": 0, "killed_cells": []}
	hazards = res["hazards"]
	var delta: int = int(res.get("coins_delta", 0))
	coins += delta
	return {"killed": killed, "coins_delta": delta, "killed_cells": res.get("killed_cells", [])}

## Extinguish fire tiles in a resolved chain. `chain` is an Array of {row,col}. Returns
## { ok, coins_delta, extinguished } and credits the coins. ok:false when the chain held no fire.
## Mirrors src/state.ts:299 (tryExtinguishFire) — +2 coins per fire tile cleared.
func extinguish_fire_chain(chain: Array) -> Dictionary:
	var res: Dictionary = HazardLogic.try_extinguish_fire(hazards, chain)
	if not bool(res.get("ok", false)):
		return {"ok": false, "coins_delta": 0, "extinguished": 0}
	hazards = res["hazards"]
	var delta: int = int(res.get("coins_delta", 0))
	coins += delta
	return {"ok": true, "coins_delta": delta, "extinguished": int(res.get("extinguished", 0))}

## Clear ALL wolves (the Rifle tool). Mutates `hazards`; returns the count removed.
func clear_all_wolves() -> int:
	var n: int = HazardLogic.wolves_list_of(hazards).size()
	hazards = HazardLogic.clear_wolves(hazards)
	return n

## Scatter all wolves for WOLF_SCARED_TURNS turns (the Hound tool). Mutates `hazards`; returns the
## count scattered.
func scatter_all_wolves() -> int:
	var n: int = HazardLogic.wolves_list_of(hazards).size()
	hazards = HazardLogic.scatter_wolves(hazards)
	return n

# ── Mine HAZARDS (T11) + Mysterious Ore (T23) ───────────────────────────────────
## The mine-side analogue of the farm-hazard wrappers above. MineHazardLogic (pure) does the
## roll/tick/clear math against `mine_hazards` + the board grid; GameState owns the live state and
## the rune side-effect. ONLY relevant while in the mine (is_in_mine()).

## Live cave_in dict ({} when none). The buried-row hazard; the Board stamps the row RUBBLE.
func active_cave_in() -> Dictionary:
	return MineHazardLogic.cave_in_of(mine_hazards)

## Live gas_vent dict ({} when none). { row, col, turns_remaining }. The Board stamps a GAS tile.
func active_gas_vent() -> Dictionary:
	return MineHazardLogic.gas_vent_of(mine_hazards)

## Live lava cells (Array of {row,col}); [] when none. The Board renders LAVA tiles at these cells.
func active_lava_cells() -> Array:
	return MineHazardLogic.lava_cells_of(mine_hazards)

## Live mole dict ({} when none). { row, col, turns_remaining }. The mole is an OVERLAY entity
## (NOT a grid cell) — the Board draws a marker at its cell (like a wolf).
func active_mole() -> Dictionary:
	return MineHazardLogic.mole_of(mine_hazards)

## The Canary/Sapper hazard-spawn-reduce hook (gas_vent/cave_in veto probabilities). Returns {} for
## now — the worker-ability aggregator that would populate Canary→gas_vent / Sapper→cave_in
## (src/features/workers/aggregate.ts hazardSpawnReduce) is a LATER task, so no reduction is applied
## yet (a faithful default: with those workers unmodelled, the React reduce map is empty too). When
## the aggregator ships it overrides this to return e.g. { "gas_vent": 0.x, "cave_in": 0.y }.
## The FARM-side hazard_spawn_reduce channel (the analogue of mine_hazard_spawn_reduce). Feeds the
## fire / wolf / rats veto in HazardLogic.roll_farm_hazard / roll_rat_spawn. EMPTY for a fresh game
## (no hazard_spawn_reduce building/worker) → no veto → the farm hazard rolls are byte-identical.
func farm_hazard_spawn_reduce() -> Dictionary:
	return compute_ability_channels()["hazard_spawn_reduce"].duplicate()

func mine_hazard_spawn_reduce() -> Dictionary:
	# T17/T21: the unified aggregate's hazard_spawn_reduce channel (hazard_id -> veto prob [0,1]).
	# MineHazardLogic.roll_mine_hazard already consumes a `reduce` dict (Canary→gas_vent /
	# Sapper→cave_in, src/features/mine/hazards.ts:143-148); this now feeds it the live channel
	# instead of {}. EMPTY for a fresh game (no hazard_spawn_reduce building/worker) → no veto →
	# the mine hazard roll is byte-identical. Returned as a plain {hazard:prob} Dictionary.
	return compute_ability_channels()["hazard_spawn_reduce"].duplicate()

## Roll for a NEW mine hazard on a mine board fill (single-active capped, no boss). On a hit, write
## the descriptor into `mine_hazards` and return it (so the caller can stamp the board); {} on a
## miss. Mirrors roll_farm_hazard's GameState wrapper. NO-op (returns {}) off the mine.
func roll_mine_hazard_on_fill(grid: Array, rng: RandomNumberGenerator) -> Dictionary:
	if not is_in_mine():
		return {}
	var spawn: Dictionary = MineHazardLogic.roll_mine_hazard(
		mine_hazards, is_in_mine(), is_boss_active(), rng, mine_hazard_spawn_reduce())
	if spawn.is_empty():
		return {}
	var id: String = String(spawn.get("id", ""))
	match id:
		"cave_in":
			mine_hazards["cave_in"] = {"row": int(spawn.get("row", 0))}
		"gas_vent":
			mine_hazards["gas_vent"] = {
				"row": int(spawn.get("row", 0)),
				"col": int(spawn.get("col", 0)),
				"turns_remaining": int(spawn.get("turns_remaining", Constants.GAS_VENT_TURNS)),
			}
		"lava":
			mine_hazards["lava"] = {"cells": [{"row": int(spawn.get("row", 0)), "col": int(spawn.get("col", 0))}]}
		"mole":
			mine_hazards["mole"] = {
				"row": int(spawn.get("row", 0)),
				"col": int(spawn.get("col", 0)),
				"turns_remaining": int(spawn.get("turns_remaining", Constants.MOLE_TURNS)),
			}
	return spawn

## Tick + spawn every mine hazard for one resolved mine turn, against the live board `grid`.
## Returns { grid:Array, changed:bool, gas_cost_turn:bool, floater:String, ore_expired:bool,
##           ore_cell:Vector2i (the degraded ore cell when it just expired, else (-1,-1)) }.
## Mutates `self.mine_hazards` + `self.mysterious_ore`. ORDER mirrors React tickHazards:
## tick_mine_hazards (gas/lava/mole) → tick_mysterious_ore countdown → roll a NEW hazard. The ore is
## spawned ONCE on mine ENTRY (NOT here), so the tick only ticks its countdown — never respawns it.
## A gas-vent EXPIRY costs a turn (gas_cost_turn=true) — the caller spends an extra mine turn for it.
## NO-op (returns the input grid, changed false) off the mine.
func tick_mine_hazards(grid: Array, rng: RandomNumberGenerator) -> Dictionary:
	if not is_in_mine():
		return {"grid": grid, "changed": false, "gas_cost_turn": false, "floater": "", "ore_expired": false, "ore_cell": Vector2i(-1, -1)}
	var work: Array = grid
	var changed: bool = false
	# 1. Tick gas/lava/mole.
	var tick: Dictionary = MineHazardLogic.tick_mine_hazards(work, mine_hazards, rng)
	if tick["grid"] != work:
		changed = true
	work = tick["grid"]
	mine_hazards = tick["mine_hazards"]
	var gas_cost_turn: bool = bool(tick.get("gas_cost_turn", false))
	var floater: String = String(tick.get("floater", ""))
	# 2. Tick the Mysterious Ore countdown (degrades to DIRT at 0).
	var ore_expired: bool = false
	var ore_cell := Vector2i(-1, -1)
	if not mysterious_ore.is_empty():
		ore_cell = Vector2i(int(mysterious_ore.get("col", -1)), int(mysterious_ore.get("row", -1)))
		var ot: Dictionary = MineHazardLogic.tick_mysterious_ore(work, mysterious_ore)
		if ot["grid"] != work:
			changed = true
		work = ot["grid"]
		mysterious_ore = ot["ore"]
		ore_expired = bool(ot.get("expired", false))
		if not ore_expired:
			ore_cell = Vector2i(-1, -1)
	# 3. Roll a NEW hazard (single-active capped — a no-op if one is live or the cap blocks it).
	var spawn: Dictionary = roll_mine_hazard_on_fill(work, rng)
	if not spawn.is_empty():
		work = _stamp_mine_hazard_on_grid(work, spawn)
		changed = true
	# NOTE: the Mysterious Ore is spawned ONCE per session — on MINE ENTRY (React SET_BIOME →
	# spawnMysteriousOre, src/state.ts:1252-1253), NOT on every tick. So the tick only TICKS the
	# countdown (above); it never respawns the ore. Once captured or expired, no new ore appears that
	# session — matching React (which sets mysteriousOre to null and never re-seeds until the next
	# mine entry). Main seeds it on entry via spawn_mysterious_ore_on_fill.
	return {
		"grid": work, "changed": changed, "gas_cost_turn": gas_cost_turn, "floater": floater,
		"ore_expired": ore_expired, "ore_cell": ore_cell,
	}

## Stamp a freshly-rolled hazard descriptor onto `grid` (a NEW grid). cave_in buries its whole row
## as RUBBLE; gas_vent stamps a GAS cell; lava stamps a LAVA cell. The mole is an OVERLAY (no grid
## cell), so it stamps nothing. Used by tick_mine_hazards after roll_mine_hazard_on_fill.
func _stamp_mine_hazard_on_grid(grid: Array, spawn: Dictionary) -> Array:
	var out: Array = []
	for row in grid:
		out.append((row as Array).duplicate())
	match String(spawn.get("id", "")):
		"cave_in":
			var r: int = int(spawn.get("row", -1))
			if r >= 0 and r < Constants.ROWS:
				for c in Constants.COLS:
					out[r][c] = Constants.Tile.RUBBLE
		"gas_vent":
			var gr: int = int(spawn.get("row", -1))
			var gc: int = int(spawn.get("col", -1))
			if gr >= 0 and gr < Constants.ROWS and gc >= 0 and gc < Constants.COLS:
				out[gr][gc] = Constants.Tile.GAS
		"lava":
			var lr: int = int(spawn.get("row", -1))
			var lc: int = int(spawn.get("col", -1))
			if lr >= 0 and lr < Constants.ROWS and lc >= 0 and lc < Constants.COLS:
				out[lr][lc] = Constants.Tile.LAVA
		# "mole": overlay only — no grid stamp.
	return out

## Spawn a Mysterious Ore on the current mine board (one per session). Returns { ok, grid } — on
## success `mysterious_ore` is set + the returned grid carries the stamped tile (the caller lands
## it). NO-op off the mine / when one is already live. Used by Main on mine entry / board fill.
func spawn_mysterious_ore_on_fill(grid: Array, rng: RandomNumberGenerator) -> Dictionary:
	if not is_in_mine():
		return {"ok": false, "grid": grid}
	var sp: Dictionary = MineHazardLogic.spawn_mysterious_ore(grid, mysterious_ore, is_in_mine(), rng)
	if bool(sp.get("ok", false)):
		mysterious_ore = sp["ore"]
		return {"ok": true, "grid": sp["grid"]}
	return {"ok": false, "grid": grid}

## True while a Mysterious Ore is live (seeded with turns remaining).
func has_active_mysterious_ore() -> bool:
	return not mysterious_ore.is_empty() and int(mysterious_ore.get("turns_left", 0)) > 0

## Attempt to clear the cave-in with a resolved STONE chain. `chain` is an Array of {row,col,tile}.
## Returns { ok:bool }. On success `mine_hazards` clears the cave_in (the caller blanks the rubble
## row on the board). Mirrors clear_rat_chain's wrapper shape. ok=false leaves state unchanged.
func clear_cave_in_chain(chain: Array) -> Dictionary:
	var res: Dictionary = MineHazardLogic.clear_cave_in(mine_hazards, chain)
	if not bool(res.get("ok", false)):
		return {"ok": false}
	mine_hazards = res["mine_hazards"]
	return {"ok": true}

## Attempt to disperse the gas vent with a resolved chain that ran through the GAS cell. `chain` is
## an Array of {row,col,tile}. Returns { ok:bool }. On success `mine_hazards` clears the gas_vent
## (NO turn cost — unlike expiry). ok=false leaves state unchanged.
func disperse_gas_chain(chain: Array) -> Dictionary:
	var res: Dictionary = MineHazardLogic.disperse_gas(mine_hazards, chain)
	if not bool(res.get("ok", false)):
		return {"ok": false}
	mine_hazards = res["mine_hazards"]
	return {"ok": true}

## Attempt to capture the Mysterious Ore with a resolved chain. `chain` is an Array of {row,col,tile}
## (or {tile}). On a VALID capture (in the mine, with a live ore, the chain contains the ore tile +
## >= Constants.REQUIRED_DIRT_IN_CHAIN dirt): grant +1 Rune, clear the ore (no double-grant), return
## { captured:true, runes }. Otherwise { captured:false } WITHOUT mutating. Mirrors try_capture_pearl.
func try_capture_mysterious_ore(chain: Array) -> Dictionary:
	if not is_in_mine():
		return {"captured": false}
	if not has_active_mysterious_ore():
		return {"captured": false}
	if not MineHazardLogic.is_mysterious_chain_valid(chain):
		return {"captured": false}
	runes += 1
	mysterious_ore = {}
	return {"captured": true, "runes": runes}

# ── Tools (M8b) ───────────────────────────────────────────────────────────────

## Grant `n` charges of tool `id`. Thin forwarder to ToolState.grant — no-op for an
## unknown id (ToolConfig doesn't know it) or a non-positive `n`; stacks onto any existing
## charges. Call site (`game.grant_tool(id, n)`) is UNCHANGED.
func grant_tool(id: String, n: int = 1) -> void:
	tool_state.grant(id, n)

## Remaining charges of tool `id` (0 when unowned). Thin forwarder to ToolState.count.
func tool_count(id: String) -> int:
	return tool_state.count(id)

## True when `id` has at least one charge owned (regardless of whether ToolConfig still
## knows it — a count > 0 means it was validly granted). Forwarder to ToolState.has_charges.
func has_tool_charges(id: String) -> bool:
	return tool_state.has_charges(id)

## True when `id` is a REAL tool (ToolConfig knows it) AND has at least one charge.
## The gate use_tool_on_grid checks first. Forwarder to ToolState.can_use.
func can_use_tool(id: String) -> bool:
	return tool_state.can_use(id)

## Arm a TAP-target tool so the next board cell fires it. Returns true on success (the tool
## is a known tap tool with charges → pending_tool is set). Returns false WITHOUT arming for
## an unknown tool, a NON-tap (instant) tool, or one with no charges. Forwarder to
## ToolState.arm. Call site (`game.arm_tool(id)`) is UNCHANGED.
func arm_tool(id: String) -> bool:
	return tool_state.arm(id)

## True while a tap-target tool is armed and waiting for a board cell. Forwarder to
## ToolState.is_armed.
func is_tool_armed() -> bool:
	return tool_state.is_armed()

## Disarm any pending tap-target tool (cancel the armed input mode). Forwarder to
## ToolState.disarm.
func clear_pending_tool() -> void:
	tool_state.disarm()

## True while a fill_bias spawn bias is armed (the React `isFillBiasArmed` predicate). A
## fill_bias tool (fertilizer/bird_feed/sapling/magic_fertilizer) never enters the board's
## pending-tap mode, so this is the SECOND armed-mode the HUD must surface alongside
## is_tool_armed() — without it an armed fertilizer shows no panel state or hotbar highlight.
func is_fill_bias_armed() -> bool:
	return fill_bias_turns > 0 and fill_bias_target != Constants.EMPTY

## The id of the tool that armed the live fill_bias ("" when none). Lets the HUD highlight the
## exact slot the player armed (see fill_bias_tool — target → tool would be ambiguous).
func armed_fill_bias_tool() -> String:
	return fill_bias_tool if is_fill_bias_armed() else ""

## Disarm a live fill_bias and REFUND the charge the arming spent (React `disarmFillBias`,
## the web's "re-dispatch USE_TOOL fertilizer = disarm + refund" toggle). Clears the transient
## bias and hands one charge back to the tool that armed it. Returns true when a bias was
## disarmed, false when none was armed.
func disarm_fill_bias() -> bool:
	if not is_fill_bias_armed():
		return false
	var refund_id: String = fill_bias_tool
	fill_bias_target = Constants.EMPTY
	fill_bias_turns = 0
	fill_bias_tool = ""
	if refund_id != "" and ToolConfig.has_tool(refund_id):
		grant_tool(refund_id, 1)
	return true

## Apply tool `id` to `grid`, crediting collected tiles and consuming one charge.
## Returns {ok, reason, grid, collected}:
##   - ok=false leaves the grid/inventory/charges UNCHANGED and names the FIRST guard
##     that trips: "unknown" (ToolConfig doesn't know it), "no_charges" (owned 0),
##     "needs_target" (a tap tool with an out-of-bounds / (-1,-1) cell).
##   - ok=true applies the dispatched ToolEffects result: tap tools go through
##     ToolConfig.apply_tap(grid, id, cell); instant tools through apply_instant.
##     Every {tile_value: count} in the effect's `collected` is credited via
##     credit_chain(tile_value, count) — so a tool-harvested tile yields resources/
##     coins EXACTLY like a chain of that length (same thresholds, cap, carry-over,
##     coins path). Transform tools return `transformed` (not `collected`) and credit
##     nothing — they only remap the grid. One charge of `id` is then consumed (the
##     key erased at 0) and, if `id` was the armed pending_tool, it's disarmed.
## Does NOT collapse/refill — that's the Board's job in M8c. The caller threads the
## returned grid into its own collapse/refill pipeline.
func use_tool_on_grid(id: String, grid: Array, cell: Vector2i = Vector2i(-1, -1)) -> Dictionary:
	if not ToolConfig.has_tool(id):
		return {"ok": false, "reason": "unknown", "grid": grid, "collected": {}}
	if not has_tool_charges(id):
		return {"ok": false, "reason": "no_charges", "grid": grid, "collected": {}}
	# T14a — wolf-hazard tools (Rifle / Hound) are STATE powers: they act on `hazards`, not the
	# grid (wolves are OVERLAY entities, not grid cells). Handle here, in the same early path as
	# fill_bias / restore_turns, BEFORE the grid dispatch. clear_wolves (Rifle) removes every wolf;
	# scatter_wolves (Hound) scares them for WOLF_SCARED_TURNS turns. Both consume a charge.
	# Mirrors React's USE_TOOL rifle/hound handlers (no turn cost; just mutate hazards.wolves).
	var wolf_power: String = ToolConfig.power_id(id)
	if wolf_power == "clear_wolves":
		clear_all_wolves()
		tool_state.consume(id)
		_tick_quests({"type": "tool", "tool": id})
		return {"ok": true, "reason": "", "grid": grid, "collected": {}}
	if wolf_power == "scatter_hazard":
		scatter_all_wolves()
		tool_state.consume(id)
		_tick_quests({"type": "tool", "tool": id})
		return {"ok": true, "reason": "", "grid": grid, "collected": {}}
	# T14b — mine-hazard tools (Water Pump / Explosives) are STATE powers that act on `mine_hazards`
	# + the grid (lava→rubble / clear cave-in rubble + mole). Handle here, in the same early path as
	# the wolf tools, BEFORE the grid-dispatch. They credit nothing (hazards yield nothing) and
	# return the mutated grid so the caller lands it (collapse/refill the freed cells). Both consume
	# a charge. Ported from React _applyWaterPump / _applyExplosives (toolPowerRuntime.ts:349-358).
	if wolf_power == "water_pump":
		var wp: Dictionary = MineHazardLogic.apply_water_pump(grid, mine_hazards)
		mine_hazards = wp["mine_hazards"]
		tool_state.consume(id)
		_tick_quests({"type": "tool", "tool": id})
		return {"ok": true, "reason": "", "grid": wp["grid"], "collected": {}}
	if wolf_power == "explosives":
		var ex: Dictionary = MineHazardLogic.apply_explosives(grid, mine_hazards)
		mine_hazards = ex["mine_hazards"]
		tool_state.consume(id)
		_tick_quests({"type": "tool", "tool": id})
		return {"ok": true, "reason": "", "grid": ex["grid"], "collected": {}}
	# fill_bias tools (fertilizer/bird_feed/sapling/magic_fertilizer) don't touch the grid —
	# they arm a spawn bias that active_tile_pool() reads. Handle here, before the
	# grid-dispatch path.
	if ToolConfig.power_id(id) == "fill_bias":
		var p: Dictionary = ToolConfig.get_tool(id).get("params", {})
		fill_bias_target = int(p.get("target", Constants.EMPTY))
		fill_bias_turns = maxi(1, int(p.get("turns", 1)))
		fill_bias_tool = id
		tool_state.consume(id)
		_tick_quests({"type": "tool", "tool": id})
		return {"ok": true, "reason": "", "grid": grid, "collected": {}}
	# restore_turns (magic_seed) is also a STATE power — it never touches the grid. It gives
	# back `amount` farm turns before the next harvest boundary by rewinding farm_turns_used
	# (clamped at 0). Handle here, in the same early path as fill_bias.
	if ToolConfig.power_id(id) == "restore_turns":
		var rp: Dictionary = ToolConfig.get_tool(id).get("params", {})
		var amount: int = int(rp.get("amount", 5))
		farm_turns_used = maxi(0, farm_turns_used - amount)
		tool_state.consume(id)
		_tick_quests({"type": "tool", "tool": id})
		return {"ok": true, "reason": "", "grid": grid, "collected": {}}
	# reveal_tiles (Miner's Hat, T24) — a STATE power: reveal every HIDDEN boss cell (hide_resources /
	# Mossback). Never touches the grid (the cells keep their tiles; only the modifier_state hidden
	# layer is cleared). The caller refreshes the board overlay after the use so the cover lifts. Off a
	# hide_resources boss it reveals nothing (a harmless no-op that still consumes a charge — matching
	# every other instant tool). Returns the revealed cells so the caller can rebuild just those tiles.
	if ToolConfig.power_id(id) == "reveal_tiles":
		var revealed: Array = reveal_boss_hidden([])
		tool_state.consume(id)
		_tick_quests({"type": "tool", "tool": id})
		return {"ok": true, "reason": "", "grid": grid, "collected": {}, "revealed": revealed}
	var is_tap: bool = ToolConfig.is_tap_target(id)
	if is_tap and not BoardLogic.in_bounds(cell):
		return {"ok": false, "reason": "needs_target", "grid": grid, "collected": {}}
	# Dispatch to the matching ToolEffects primitive via ToolConfig.
	var res: Dictionary
	if is_tap:
		res = ToolConfig.apply_tap(grid, id, cell)
	else:
		res = ToolConfig.apply_instant(grid, id)
	# Defensive: an unhandled power id returns {} from ToolConfig — treat as a no-op
	# failure WITHOUT consuming a charge so a misconfigured tool can't burn uses.
	if res.is_empty() or not res.has("grid"):
		return {"ok": false, "reason": "no_effect", "grid": grid, "collected": {}}
	var new_grid: Array = res["grid"]
	# Credit each collected tile EXACTLY like a chain of that length (credit_chain
	# routes thresholds/cap/coins). Transform effects carry `transformed`, not
	# `collected`, so this loop simply doesn't run for them (they credit nothing).
	var collected: Dictionary = res.get("collected", {})
	for tile_value in collected.keys():
		credit_chain(int(tile_value), int(collected[tile_value]))
	# Consume one charge (erase the key at 0 so `tools` stays an owned-and-usable set) and,
	# if `id` was the armed tap tool, disarm it now that it has fired. ToolState.consume
	# handles both.
	tool_state.consume(id)
	# Quests (ADDITIVE): a successful tool use ticks the TOOL quest event (+1 to any
	# tool-category quest matching this tool id). No-op loop over [] with an empty board.
	# Wired here (the single committed-use site) so every tool fired through GameState
	# counts, regardless of the (later M8c) caller's collapse/refill pipeline.
	_tick_quests({"type": "tool", "tool": id})
	return {"ok": true, "reason": "", "grid": new_grid, "collected": collected}

# ── Story engine (beats / flags / triggers / choices) ─────────────────────────

## Post a gameplay `event` to the story engine. Builds the fact snapshot from
## (event, inventory, settlement.tier, story.flags), then fires beats via StoryEngine
## in a LOOP until none match — so a single session_start can cascade several beats
## whose thresholds/flags are already satisfied. Each fired beat's on_complete flags +
## fired marker are applied to `story`, and its id is ENQUEUED into story.beat_queue
## for the (later) UI slice to display. Returns the Array of newly-fired beat ids.
##
## Beats NEVER auto-grant resources/coins — only an explicit resolve_story_choice does.
## So this is safe to call additively at every hook site: it cannot change the economy.
func post_story_event(event: Dictionary) -> Array:
	var fired: Array = []
	# Loop-with-guard: each fired beat sets a marker/flag, so the next next_beat() sees
	# a fresh story_state and may fire a follow-up (cascade). The guard bounds it to the
	# catalog size so a (data-bug) repeat beat can't spin forever.
	var guard: int = 0
	var limit: int = StoryConfig.all_beats().size() + 4
	while guard < limit:
		guard += 1
		var story_dict: Dictionary = story.to_engine_dict()
		var beat: Dictionary = StoryEngine.next_beat(story_dict, event, inventory, settlement.tier)
		if beat.is_empty():
			break
		var beat_id: String = String(beat.get("id", ""))
		# Apply the beat's effects (marker + on_complete flags + act advance).
		story.apply_engine_dict(StoryEngine.apply_beat(story_dict, beat))
		# Enqueue for display (dedup) and honour an on_complete.queue_beat follow-up.
		_enqueue_beat(beat_id)
		var qb: String = String(beat.get("on_complete", {}).get("queue_beat", ""))
		if qb != "" and StoryConfig.has_beat(qb):
			_enqueue_beat(qb)
		fired.append(beat_id)
		# T30: record beats that fire DURING a live run for the run-summary "Story beats" block
		# (React runSummary STORY/BEAT_FIRED, slice.ts:178-189). Dedup; only while a run is active.
		if farm_run_active and not run_beats_fired.has(beat_id):
			run_beats_fired.append(beat_id)
	return fired

## Resolve a player CHOICE on a queued beat. Applies the chosen outcome's flags to
## `story` via StoryEngine.apply_choice, then CREDITS the choice's grants — resources
## through the same cap-respecting inventory path as any gain, coins via coins += —
## and honours a follow-up queue_beat (enqueued for display). Returns the engine's
## { story_state, grants, queue_beat } dict (with story_state already adopted) plus an
## "ok" flag; ok=false (no mutation beyond the no-op clone) for an unknown beat/choice.
func resolve_story_choice(beat_id: String, choice_id: String) -> Dictionary:
	var beat: Dictionary = StoryConfig.beat_by_id(beat_id)
	if beat.is_empty():
		return {"ok": false, "reason": "unknown_beat"}
	# Validate the choice exists before mutating, so an unknown id is a clean no-op.
	var has_choice: bool = false
	for c in beat.get("choices", []):
		if String(c.get("id", "")) == choice_id:
			has_choice = true
			break
	if not has_choice:
		return {"ok": false, "reason": "unknown_choice"}
	var res: Dictionary = StoryEngine.apply_choice(story.to_engine_dict(), beat, choice_id)
	story.apply_engine_dict(res.get("story_state", {}))
	# Credit grants — the ONLY path where a story beat adds resources/coins.
	var grants: Dictionary = res.get("grants", {})
	var grant_coins: int = int(grants.get("coins", 0))
	if grant_coins != 0:
		# Coins are uncapped (same as order rewards); floor the total at 0 defensively.
		coins = maxi(0, coins + grant_coins)
	var grant_resources: Dictionary = grants.get("resources", {})
	for k in grant_resources.keys():
		_credit_resource(String(k), int(grant_resources[k]))
	# Honour a follow-up beat queued by the choice (enqueue for display).
	var qb: String = String(res.get("queue_beat", ""))
	if qb != "":
		_enqueue_beat(qb)
	return {
		"ok": true,
		"grants": grants,
		"queue_beat": qb,
	}

## Post the session-start event (Main calls this on load). A separate entry point so
## existing suites that build a GameState.new() are NOT affected — session beats only
## fire when this is explicitly called. Returns the newly-fired beat ids.
func start_story_session() -> Array:
	return post_story_event({"type": "session_start"})

## Add `beat_id` to the story display queue (dedup). The (later) UI slice drains it.
func _enqueue_beat(beat_id: String) -> void:
	if beat_id == "":
		return
	if not story.beat_queue.has(beat_id):
		story.beat_queue.append(beat_id)

## Credit `amount` units of `resource` into inventory, cap-clamped (and floored at 0
## for a negative grant). The shared cap path used by choice grants so a story reward
## obeys the same storage cap as a chain/recipe gain.
func _credit_resource(resource: String, amount: int) -> void:
	if resource == "" or amount == 0:
		return
	var current: int = int(inventory.get(resource, 0))
	var total: int = current + amount
	if total <= 0:
		inventory.erase(resource)
		return
	inventory[resource] = mini(total, settlement.cap())

# ── Quests + Almanac (ported from src/features/quests + almanac) ─────────────────

## Ensure the quest board is populated: if `quests` is empty, roll a fresh set from
## (quest_seed, quest_day). Idempotent — a non-empty board is left untouched (so this
## is safe to call on every load / screen open without clobbering progress). Returns
## the live `quests` array. Mirrors the React initial roll (a fresh save rolls once;
## a loaded save keeps its saved quests). NOT called by GameState.new() — the economy
## stays additive (an un-rolled GameState has [] quests and every tick is a no-op).
func ensure_quests() -> Array:
	if quests.is_empty():
		quests = QuestConfig.roll_quests(quest_seed, quest_day)
	return quests

## Re-roll the quest board: bump quest_day and roll a fresh set from the new
## (quest_seed, quest_day) seed. The port's faithful analogue of React's CLOSE_SEASON
## reroll (minus the calendar). Returns the new `quests` array. Always re-rolls (unlike
## ensure_quests, which only fills an empty board).
func reroll_quests() -> Array:
	quest_day += 1
	quests = QuestConfig.roll_quests(quest_seed, quest_day)
	return quests

## Tick every quest with one event Dictionary (QuestConfig event shape), replacing each
## quest with its progressed copy. A claimed quest / non-matching quest is unchanged
## (QuestConfig.tick_quest returns the same dict). With an empty board this is a no-op
## loop over [] — which is what keeps the quest layer additive at every wired event site.
func _tick_quests(event: Dictionary) -> void:
	if quests.is_empty():
		return
	for i in quests.size():
		quests[i] = QuestConfig.tick_quest(quests[i], event)

## Claim a completed quest by id: credit its coin reward + award its almanac XP (20),
## mark it claimed. Mirrors React claimQuest + the slice's awardXp wiring. Returns
## {ok:true, coins, xp, level} on success (coins/xp granted, the resulting almanac
## level). On failure returns {ok:false, reason} WITHOUT mutating; reason is the FIRST
## guard that trips: "unknown" (no such quest) → "claimed" (already claimed) →
## "incomplete" (progress < target).
func claim_quest(quest_id: String) -> Dictionary:
	var idx: int = -1
	for i in quests.size():
		if String(quests[i].get("id", "")) == quest_id:
			idx = i
			break
	if idx < 0:
		return {"ok": false, "reason": "unknown"}
	var q: Dictionary = quests[idx]
	if bool(q.get("claimed", false)):
		return {"ok": false, "reason": "claimed"}
	if int(q.get("progress", 0)) < int(q.get("target", 0)):
		return {"ok": false, "reason": "incomplete"}
	# Commit: credit coins (uncapped, like order rewards), mark claimed, then award XP.
	var reward: Dictionary = q.get("reward", {})
	var coin_gain: int = int(reward.get("coins", 0))
	coins += coin_gain
	var marked: Dictionary = q.duplicate(true)
	marked["claimed"] = true
	quests[idx] = marked
	var xp_gain: int = int(reward.get("xp", QuestConfig.QUEST_CLAIM_XP))
	award_xp(xp_gain)
	return {"ok": true, "coins": coin_gain, "xp": xp_gain, "level": almanac_level}

## Award `amount` almanac XP (clamped to >= 0 added), recomputing the cached level via
## AlmanacConfig.level_for_xp. Mirrors React awardXp (xp += amount; level = max(1,
## floor(xp/150)+1)). Returns the new level if this gain crossed into a higher level,
## else 0 (the port's "no level-up" sentinel — React returned null). A non-positive
## amount is a no-op that still returns 0.
func award_xp(amount: int) -> int:
	if amount <= 0:
		return 0
	var prev: int = almanac_level
	almanac_xp += amount
	almanac_level = AlmanacConfig.level_for_xp(almanac_xp)
	return almanac_level if almanac_level > prev else 0

## Claim almanac tier `tier`: gated by AlmanacConfig.can_claim_tier (tier exists, not
## already claimed, level high enough). On success grant the tier's reward — coins +
## runes directly, tools through the M8b grant_tool path (every mapped tool id is a real
## ToolConfig member), and latch any `structural` flag into almanac_structural — then
## record the tier as claimed. Returns {ok:true, tier, reward} on success. On failure
## returns {ok:false, reason} WITHOUT mutating; reason is the FIRST guard that trips:
## "unknown" (no such tier) → "claimed" (already claimed) → "locked" (level too low).
func claim_almanac_tier(tier: int) -> Dictionary:
	if not AlmanacConfig.has_tier(tier):
		return {"ok": false, "reason": "unknown"}
	if almanac_claimed.has(tier):
		return {"ok": false, "reason": "claimed"}
	var def: Dictionary = AlmanacConfig.tier_def(tier)
	if almanac_level < int(def.get("level", 1)):
		return {"ok": false, "reason": "locked"}
	# Commit the grant. Coins + runes are uncapped currencies.
	var reward: Dictionary = def.get("reward", {})
	var coin_gain: int = int(reward.get("coins", 0))
	if coin_gain > 0:
		coins += coin_gain
	var rune_gain: int = int(reward.get("runes", 0))
	if rune_gain > 0:
		runes += rune_gain
	var tools_reward: Dictionary = reward.get("tools", {})
	for id in tools_reward.keys():
		grant_tool(String(id), int(tools_reward[id]))
	var structural: String = String(reward.get("structural", ""))
	if structural != "":
		almanac_structural[structural] = true
	almanac_claimed.append(tier)
	return {"ok": true, "tier": tier, "reward": reward.duplicate(true)}

## True when structural honour `flag` has been latched by a claimed almanac tier.
func has_almanac_structural(flag: String) -> bool:
	return bool(almanac_structural.get(flag, false))

# ── Achievements (M10) ─────────────────────────────────────────────────────────

## Bump achievement counter `counter` and grant any trophies it just crossed.
##
##   amount       how much to add (default 1). Quantity counters pass chain_len;
##                chain/order/boss counters pass 1.
##   distinct_key when non-null, this is a DISTINCT counter: the counter only
##                increments the FIRST time `distinct_key` is seen for `counter`
##                (subsequent same-key calls are a no-op, like React's seen* maps).
##                A null key (the default) is a plain increment-by-`amount` counter.
##
## After incrementing, every AchievementConfig.for_counter(counter) NOT already
## unlocked whose threshold was just CROSSED (prev < threshold <= new) is marked
## unlocked and its reward GRANTED ONCE — coins add to `coins`, tools route through
## the M8b grant_tool path. Returns the list of newly-unlocked achievement dicts (so
## a UI can toast them); an empty Array when nothing crossed. Crossing-not-polling is
## what keeps load idempotent: from_dict restores achievements_unlocked, so a later
## bump skips already-unlocked rows and never double-grants.
func bump_counter(counter: String, amount: int = 1, distinct_key = null) -> Array:
	# AchievementState does the COUNTING + UNLOCK detection (incrementing, distinct-key
	# tracking, marking each newly-crossed id unlocked) and returns the newly-unlocked
	# achievement dicts. GameState owns the side-effecting REWARD grant below, so the
	# coins/tools mutations stay here (not in the pure state object). Idempotence is intact:
	# an already-unlocked id is never returned, so its reward is never re-granted.
	var newly: Array = achievement_state.bump(counter, amount, distinct_key)
	for a in newly:
		_grant_reward(a.get("reward", {}))
		# Queue for the UI toast (Main drains after each resolve/town action). RUNTIME-only
		# state — never serialized — so save/load and the headless economy suites are
		# untouched; an undrained queue on quit simply evaporates.
		achievement_toast_queue.append(a)
	return newly

## Grant an achievement reward dict ({"coins": N} and/or {"tools": {id: n}}). Coins
## add straight to the (uncapped) coins int; tools route through grant_tool so a
## reward tool obeys the same validity/stacking rules as any other grant.
func _grant_reward(reward: Dictionary) -> void:
	if reward.is_empty():
		return
	var c: int = int(reward.get("coins", 0))
	if c > 0:
		coins += c
	var tools_reward: Dictionary = reward.get("tools", {})
	for id in tools_reward.keys():
		grant_tool(String(id), int(tools_reward[id]))

## Current progress on `counter`, as a plain int the AchievementsScreen renders
## against the threshold. DISTINCT counters (distinct_resources_chained,
## distinct_buildings_built) report the number of distinct keys seen so far
## (`_distinct_seen[counter].size()`), since their `achievement_counters` value
## tracks that same count; every other counter reports its running total straight
## from `achievement_counters`. The two distinct counters are matched against
## `_distinct_seen` so a counter that has only ever been bumped via the distinct
## path still reads correctly even if `achievement_counters` were absent.
func achievement_progress(counter: String) -> int:
	return achievement_state.progress(counter)

## The set of distinct keys seen so far for a DISTINCT counter, as a {key:String -> true}
## Dictionary (a defensive copy; empty for a counter never bumped via the distinct path).
## Read-only accessor over `_distinct_seen` so the AchievementsScreen Collection tab can
## light the exact resources the player has actually chained — real discovery data, not a
## fabricated lifetime count the port doesn't track. `distinct_resources_chained` is the
## counter behind the resource codex.
func distinct_seen(counter: String) -> Dictionary:
	return achievement_state.distinct_seen(counter)

## Plain-Dictionary snapshot for persistence.
func to_dict() -> Dictionary:
	# T26: ensure the cartography travel state carries its canonical seed (home visited,
	# neighbours discovered) so a never-touched GameState round-trips byte-for-byte. Lazy +
	# idempotent — _seed_map_state only fills an EMPTY dict, mirroring the tile-collection slice's
	# _ensure_tile_collection lazy-seed in to_dict.
	_seed_map_state()
	return {
		"inventory": inventory.duplicate(),
		"progress": progress.duplicate(),
		"coins": coins,
		"turn": turn,
		"settlement": settlement.to_dict(),
		"buildings": buildings.duplicate(),
		"orders": orders.duplicate(true),
		# NPC bonding (ADDITIVE): the roster + per-NPC bonds (floats) from the composed
		# NpcState, flattened back into the SAME top-level "npcs" key — a {roster, bonds}
		# dict, deep-copied so the snapshot is independent. Byte-identical to the pre-split
		# emission. Orders themselves carry their `npc`/`base_reward` inside the `orders`
		# array above. SAVE_VERSION is NOT bumped — a save written before npcs existed loads
		# the default roster/bonds (from_dict defensive default).
		"npcs": npcs_state.to_dict(),
		"active_biome": active_biome,
		"mine_turns_left": mine_turns_left,
		# T26 Cartography travel state (ADDITIVE): the current world-map node + the per-node
		# travel state ({id → "visited"|"discovered"}). SAVE_VERSION is NOT bumped — a save written
		# before the travel state existed restores the default seed (home visited, neighbours
		# discovered) via from_dict's defensive default.
		"map_current": map_current,
		"map_node_state": map_node_state.duplicate(),
		# T22 Multi-settlement model (ADDITIVE): the founding records, the per-zone archives of the
		# NON-active zones, and the global Hearth-Tokens. SAVE_VERSION is NOT bumped — a save written
		# before T22 existed has none of these keys, so from_dict loads it as a home-only game with
		# everything in the live fields, archives empty, no tokens (unchanged). The ACTIVE zone's
		# inventory/buildings/settlement/progress live in the flat top-level keys above (they are the
		# live view); zone_archives holds only the OTHER founded zones. map_current (above) is the
		# active zone id.
		"settlements": _settlements_to_dict(),
		"zone_archives": _zone_archives_to_dict(),
		"heirlooms": heirlooms.duplicate(),
		# Farm season cycle (A1, ADDITIVE): spent turns within the current season cycle.
		# SAVE_VERSION is NOT bumped — a save written before seasons existed loads with 0
		# (a fresh Spring cycle) via from_dict's defensive default.
		"farm_turns_used": farm_turns_used,
		# Bounded farm RUN (Task A): the run-active flag + its budget / remaining turns /
		# zone / fertilizer flag / chosen categories. ADDITIVE — a save written before runs
		# existed restores defaults (no run) via from_dict's defensive guards. The SAVE_VERSION
		# bump for these is a SEPARATE later task; this is the logic + persistence wiring only.
		"farm_run_active": farm_run_active,
		"farm_run_budget": farm_run_budget,
		"farm_run_turns_left": farm_run_turns_left,
		"farm_run_zone": farm_run_zone,
		"farm_run_used_fertilizer": farm_run_used_fertilizer,
		"farm_run_selected": farm_run_selected.duplicate(),
		# Fish / Harbor expedition (M3j, ADDITIVE). The tide cycle (fish_tide /
		# fish_tide_turn), the live giant pearl (fish_pearl, deep-copied), the harbor
		# turn budget, and the rune count. SAVE_VERSION is NOT bumped — like every prior
		# additive field, a save written before the harbor existed loads with defaults
		# (farm, high tide, no pearl, 0 runes) via from_dict's defensive defaults.
		"harbor_turns_left": harbor_turns_left,
		"fish_tide": fish_tide,
		"fish_tide_turn": fish_tide_turn,
		"fish_pearl": fish_pearl.duplicate(true),
		"runes": runes,
		# Seasonal boss (T24): the live BossInstance — id + season + year + the timed-window
		# fields + the target + the modifier overlay (deep-copied). Replaces the old boss_hp.
		# SAVE_VERSION is NOT bumped — a save written under the old HP model loads with the boss
		# sanitised to idle (from_dict ignores the stale boss_hp key); town2_complete is preserved.
		"boss_active": boss_active,
		"boss_season": boss_season,
		"boss_year": boss_year,
		"boss_turns_remaining": boss_turns_remaining,
		"boss_progress": boss_progress,
		"boss_target_resource": boss_target_resource,
		"boss_target_amount": boss_target_amount,
		"boss_modifier_state": boss_modifier_state.duplicate(true),
		"town2_complete": town2_complete,
		"ratcatcher_charges_used": ratcatcher_charges_used,
		# Farm HAZARDS (T7/T8/T9, ADDITIVE): the live positional rats / fire cells / wolves +
		# scared countdown, deep-copied. SAVE_VERSION is NOT bumped — a save written before the
		# hazards model existed loads with all hazards inactive (from_dict → HazardLogic.normalise
		# of a missing key yields the default empty state). fire_hazard_force is TRANSIENT (a
		# per-session test/tuning override) and intentionally NOT persisted.
		"hazards": hazards.duplicate(true),
		# Mine HAZARDS (T11, ADDITIVE): the live cave_in / gas_vent / lava / mole, deep-copied.
		# SAVE_VERSION is NOT bumped — a pre-mine-hazards save loads with all mine hazards inactive
		# (from_dict → MineHazardLogic.normalise of a missing key yields the default empty state).
		"mine_hazards": mine_hazards.duplicate(true),
		# Mysterious Ore → Rune (T23, ADDITIVE): the live ore { row, col, turns_left } (or {}),
		# deep-copied. SAVE_VERSION is NOT bumped — a pre-ore save loads with no ore (from_dict
		# default). Off the mine it's always {} (cleared on every mine exit).
		"mysterious_ore": mysterious_ore.duplicate(true),
		# Tile Collection (T2/T3/T5, ADDITIVE): the active variant per category, the discovered
		# set, research progress, and banked free moves. Persisted only when the slice has been
		# seeded (a bare GameState.new() that never touched the tile collection emits the seeded
		# defaults the first time to_dict reads it — _ensure_tile_collection makes this lazy +
		# idempotent). SAVE_VERSION is NOT bumped — a save written before tile variants existed
		# loads with the fresh seed (from_dict overlays the saved slice over default seeds,
		# mirroring React mergeLoadedState, src/state/helpers.ts:126-142).
		"tile_active_by_category": _tile_collection_dict_active(),
		"tile_discovered": _tile_collection_dict_discovered(),
		"tile_research_progress": _tile_collection_dict_research(),
		"tile_free_moves": free_moves(),
		"audio_muted": audio_muted,
		"reduce_motion": reduce_motion,
		# M8b: owned tool charges from the composed ToolState, flattened back into the SAME
		# top-level "tools" key. pending_tool is TRANSIENT and intentionally NOT persisted (a
		# reload always starts disarmed) — ToolState.to_dict emits only the charges.
		# Byte-identical to the pre-split emission.
		"tools": tool_state.to_dict(),
		# M10: achievement counters, the unlocked set, and the distinct-seen maps — from the
		# composed AchievementState, flattened back into the SAME three top-level keys (NOT
		# nested under one sub-object), byte-identical to the pre-split emission. Persisting
		# `achievements_unlocked` is what makes load NON-double-granting — a restored unlocked
		# id is skipped by bump_counter, so its reward is never re-issued.
		"achievement_counters": achievement_state.counters.duplicate(),
		"achievements_unlocked": achievement_state.unlocked.duplicate(),
		"_distinct_seen": achievement_state.distinct.duplicate(true),
		# Story engine: act + flags (incl. _fired_* markers) + choice_log + beat_queue.
		# Persisting the fired markers is what makes one-time beats stay fired across a
		# reload (post_story_event sees them and skips). SAVE_VERSION is NOT bumped —
		# like every prior additive field, a save written before story existed loads with
		# the defensive default (a fresh act-1 StoryState).
		"story": story.to_dict(),
		# Workers (ADDITIVE): hired counts per type. SAVE_VERSION is NOT bumped — like
		# every prior additive field, a save written before workers existed loads with
		# all counts at 0 (from_dict defensive default), so the economy is unchanged.
		"workers": workers.duplicate(),
		# Tutorial onboarding (ADDITIVE): whether the 6-step tutorial modal has been
		# seen/skipped. SAVE_VERSION is NOT bumped — a save written before tutorial
		# existed loads with false (show once on upgrade). Defaults to false.
		"tutorial_seen": tutorial_seen,
		# Daily login-streak rewards (ADDITIVE): the last-claimed calendar date + the
		# current streak day. SAVE_VERSION is NOT bumped — a save written before daily
		# rewards existed loads with "" / 0 (never claimed) via from_dict's defensive
		# defaults, so the streak simply starts fresh on the next launch.
		"daily_last_claimed": daily_last_claimed,
		"daily_streak_day": daily_streak_day,
		# Castle contributions (ADDITIVE): per-need donated totals (the one-way sink).
		# SAVE_VERSION is NOT bumped — like every prior additive field, a save written
		# before the castle existed loads with all needs at 0 (from_dict defensive
		# default), so the economy is unchanged.
		"castle_contributed": castle_contributed.duplicate(),
		# Decorations + Influence (ADDITIVE): the new Influence currency + per-decoration
		# built counts. SAVE_VERSION is NOT bumped — a save written before decorations
		# existed loads with influence 0 + an empty decorations dict (from_dict defaults).
		"influence": influence,
		"decorations": decorations.duplicate(),
		# Magic Portal (ADDITIVE): the build gate flag. SAVE_VERSION is NOT bumped — a save
		# written before the portal existed loads with portal_built = false (from_dict default),
		# so the economy is unchanged.
		"portal_built": portal_built,
		# Keepers + Boons (T31, ADDITIVE): the two keeper currencies + the owned-boon map. The
		# keeper-resolution path flags live in `story.flags` (persisted via the "story" key above),
		# so they round-trip for free. SAVE_VERSION is NOT bumped — a save written before T31 existed
		# loads with embers/core_ingots 0 + an empty boons map (from_dict defaults), so every boon
		# multiplier is 1.0 and the economy is unchanged.
		"embers": embers,
		"core_ingots": core_ingots,
		"boons": boons.duplicate(),
		# Quests + Almanac (ADDITIVE): the rolled quest board (deep-copied — each quest is a
		# Dictionary), the roll bookkeeping (quest_day + quest_seed), and the almanac track
		# (xp / level / claimed tiers / latched structural honours). SAVE_VERSION is NOT bumped
		# — a save written before quests existed loads with an empty board (quests []), day 0,
		# the default seed, and a fresh almanac (0 xp / level 1 / nothing claimed) via from_dict's
		# defensive defaults, so the economy is unchanged.
		"quests": quests.duplicate(true),
		"quest_day": quest_day,
		"quest_seed": quest_seed,
		"almanac_xp": almanac_xp,
		"almanac_level": almanac_level,
		"almanac_claimed": almanac_claimed.duplicate(),
		"almanac_structural": almanac_structural.duplicate(),
		# T16 dynamic market (ADDITIVE): persist only the seed + season index; the
		# derived price table and event are recomputed by from_dict → _recompute_market.
		# A save written before T16 existed loads with 0/0 defaults → a deterministic
		# season-0 price set. SAVE_VERSION is NOT bumped.
		"market_seed": market_seed,
		"market_season": market_season,
	}

## Rebuild from a snapshot, defensively: missing keys fall back to defaults and
## numeric values are coerced to int (JSON parsing yields floats).
static func from_dict(d: Dictionary) -> GameState:
	var s := GameState.new()
	var inv: Dictionary = d.get("inventory", {})
	if inv is Dictionary:
		for k in inv:
			s.inventory[k] = int(inv[k])
	var prog: Dictionary = d.get("progress", {})
	if prog is Dictionary:
		for k in prog:
			s.progress[k] = int(prog[k])
	s.coins = int(d.get("coins", 0))
	s.turn = int(d.get("turn", 0))
	var settle: Variant = d.get("settlement", {})
	if settle is Dictionary:
		s.settlement = Settlement.from_dict(settle)
	# Rebuild placed spawners, keeping only real ids and dropping duplicates so a
	# corrupt or stale save can never desync the plot count or the board pool.
	var blds: Variant = d.get("buildings", [])
	if blds is Array:
		for id in blds:
			var sid := String(id)
			if BuildingConfig.is_building(sid) and not s.buildings.has(sid):
				s.buildings.append(sid)
	# Rebuild orders, keeping only WELL-FORMED entries: a Dictionary with a String
	# resource, an int qty > 0, and an int reward >= 0 (floats coerced to int).
	# Malformed rows are dropped silently. NOT auto-refilled here — Main tops the
	# board up via refill_orders() after load, so a fresh save (zero saved orders)
	# fills to MAX_ORDERS while a loaded save keeps exactly what it had until topped up.
	var ords: Variant = d.get("orders", [])
	if ords is Array:
		for o in ords:
			if not (o is Dictionary):
				continue
			if not (o.has("resource") and o.has("qty") and o.has("reward")):
				continue
			var resource: Variant = o["resource"]
			if not (resource is String):
				continue
			var qty: int = int(o["qty"])
			var reward: int = int(o["reward"])
			if qty <= 0 or reward < 0:
				continue
			# Preserve the additive NPC-bonding fields when present (a save written by
			# this build carries them). An old save lacking them keeps reward as the base
			# and fill_order falls back to wren/order.reward defensively. `base_reward`
			# defaults to the legacy reward; `npc` only survives if it's a real roster id.
			var rebuilt_order: Dictionary = {"resource": String(resource), "qty": qty, "reward": reward}
			rebuilt_order["base_reward"] = maxi(0, int(o.get("base_reward", reward)))
			var o_npc: Variant = o.get("npc", null)
			if o_npc is String and NpcConfig.has(String(o_npc)):
				rebuilt_order["npc"] = String(o_npc)
			s.orders.append(rebuilt_order)
	# Restore the NPC roster + bonds (ADDITIVE) into the composed NpcState from the SAME
	# flat top-level "npcs" key. Missing key (any save written before npcs existed) →
	# NpcState.from_dict({}) yields the default roster (NpcConfig.all_ids) at the Warm
	# default 5.0, so old saves load with neutral relationships. The roster keeps only REAL
	# ids, de-duplicated; bonds keep only roster ids, coerced to float and clamped to
	# [0, 10] (a corrupt out-of-range value can't break banding); any roster id missing a
	# saved bond defaults to 5.0 — all enforced inside NpcState.from_dict. SAVE_VERSION is
	# NOT bumped.
	var npcs_d: Variant = d.get("npcs", null)
	if npcs_d is Dictionary:
		s.npcs_state = NpcState.from_dict(npcs_d)
	# Restore the expedition state defensively (M3f / M3j). The biome must be one of the
	# three known values (anything else falls back to "farm"); turns can't go negative;
	# and a corrupt "mine"/"harbor"-with-no-turns save snaps back to the farm (turns 0)
	# so a stale save can never strand the player in a turn-less expedition.
	var biome := String(d.get("active_biome", "farm"))
	if biome != "farm" and biome != "mine" and biome != "harbor":
		biome = "farm"
	var turns: int = maxi(0, int(d.get("mine_turns_left", 0)))
	if biome == "mine" and turns <= 0:
		biome = "farm"
		turns = 0
	# Fish / Harbor expedition (M3j, ADDITIVE). Restore the harbor turn budget, tide
	# cycle, live pearl, and runes defensively (missing → defaults). A corrupt
	# "harbor"-with-no-turns save snaps back to the farm, mirroring the mine guard. The
	# tide must be a known value (anything else → "high"); the tide turn can't go
	# negative; the pearl is kept only when well-formed with turns_left > 0.
	var harbor_turns: int = maxi(0, int(d.get("harbor_turns_left", 0)))
	if biome == "harbor" and harbor_turns <= 0:
		biome = "farm"
		harbor_turns = 0
	if biome != "harbor":
		# Off the harbor: drop any stale harbor turns so a non-harbor save never carries
		# a phantom turn budget (matches how a non-mine biome implies mine_turns 0).
		harbor_turns = 0
	s.active_biome = biome
	s.mine_turns_left = turns
	s.harbor_turns_left = harbor_turns
	# T26 Cartography travel state (ADDITIVE). Restore the per-node travel state + the current
	# node defensively: keep only entries naming a REAL node with a known state ("visited" |
	# "discovered"); a stale/bogus id or state is dropped. After restoring, re-derive the
	# discovered ring (so a save that recorded only the visited set still shows the right
	# discoveries) and ENSURE home is at least visited (the invariant React's initial guarantees;
	# a save with no map state — any pre-T26 save — yields {} here, then _seed_map_state re-seeds
	# the home-visited / neighbours-discovered default). map_current must be a real node that is
	# at least discovered, else it falls back to "home".
	var mns_raw: Variant = d.get("map_node_state", {})
	var restored_state: Dictionary = {}
	if mns_raw is Dictionary:
		for k in (mns_raw as Dictionary).keys():
			var nid := String(k)
			var st := String((mns_raw as Dictionary)[k])
			if CartographyConfig.has_node(nid) and (st == "visited" or st == "discovered"):
				restored_state[nid] = st
	s.map_node_state = restored_state
	if s.map_node_state.is_empty():
		# Pre-T26 save (or a fully corrupt one) → re-seed the home-visited default.
		s._seed_map_state()
	else:
		# Guarantee the home invariant + re-derive the discovered ring from the visited set.
		if String(s.map_node_state.get("home", "")) != "visited":
			s.map_node_state["home"] = "visited"
		s._recompute_discovered()
	var mc := String(d.get("map_current", "home"))
	# The current node must be a real node that's at least discovered; else snap to home.
	if not CartographyConfig.has_node(mc) or String(s.map_node_state.get(mc, "hidden")) == "hidden":
		mc = "home"
	s.map_current = mc
	# T22 Multi-settlement model (ADDITIVE). Restore the founding records, the per-zone archives,
	# and the global Hearth-Tokens defensively. Missing keys (any pre-T22 save) → empty maps, so the
	# save loads as a home-only game: everything lives in the flat fields restored above (the ACTIVE
	# zone = map_current), archives empty, no tokens (unchanged). All defensive:
	#   • settlements: keep only entries naming a REAL map node, with founded coerced to bool, biome
	#     to String, keeper_path to a known path ("coexist"/"driveout") or "".
	#   • zone_archives: keep only entries naming a REAL node; well-form each archive's
	#     inventory/progress (int-coerced) + buildings (real, de-duplicated ids) + settlement tier +
	#     farm_turns_used. The ACTIVE zone is NEVER archived (its state is the live fields) — drop it
	#     if a corrupt save put it there.
	#   • heirlooms: keep only the three known token ids, each as 1 when truthy.
	var settle_raw: Variant = d.get("settlements", {})
	if settle_raw is Dictionary:
		for k in (settle_raw as Dictionary).keys():
			var zid := String(k)
			if not CartographyConfig.has_node(zid):
				continue
			var rec: Variant = (settle_raw as Dictionary)[k]
			if not (rec is Dictionary):
				continue
			var kp := String((rec as Dictionary).get("keeper_path", ""))
			if kp != "coexist" and kp != "driveout":
				kp = ""
			s.settlements[zid] = {
				"founded": bool((rec as Dictionary).get("founded", false)),
				"biome": String((rec as Dictionary).get("biome", "")),
				"keeper_path": kp,
			}
	# Un-strand a save left on an UNFOUNDED board node. A pre-fix build let the marker move onto a
	# farm/mine/harbor node you hadn't founded yet (without activating it — the live fields stayed
	# the home zone's), leaving the player unable to start a run there. Now that founding gates
	# travel, standing on an un-settled board node is unreachable, so snap the active node back to
	# home (always founded) once settlements are known. A legitimately-founded node is left as-is.
	if CartographyConfig.settlement_type_for_zone(s.map_current) != "" and not s.is_settlement_founded(s.map_current):
		s.map_current = "home"
	var arch_raw: Variant = d.get("zone_archives", {})
	if arch_raw is Dictionary:
		for k in (arch_raw as Dictionary).keys():
			var zid2 := String(k)
			if not CartographyConfig.has_node(zid2) or zid2 == s.map_current:
				continue   # unknown node, or the active zone (its state is the live fields)
			var arc: Variant = (arch_raw as Dictionary)[k]
			if not (arc is Dictionary):
				continue
			s.zone_archives[zid2] = s._sanitize_zone_archive(arc as Dictionary)
	var heir_raw: Variant = d.get("heirlooms", {})
	if heir_raw is Dictionary:
		for tok in CartographyConfig.HEARTH_TOKEN_FOR_TYPE.values():
			if int((heir_raw as Dictionary).get(tok, 0)) >= 1:
				s.heirlooms[String(tok)] = 1
	# Bounded farm RUN (Task A, ADDITIVE). Restore the six run fields defensively (missing →
	# defaults = no run, the back-compat state for any pre-run save). Restored BEFORE the
	# farm_turns_used clamp below so farm_turn_budget() reflects the per-run budget while a run
	# is live. The zone must be a real ported zone (else fall back to home); the selection keeps
	# only eligible categories (capped at 8 via _sanitize_selection); the budget can't go
	# negative. A run flagged active but with a non-positive budget is treated as no run (a
	# corrupt save can't strand a turn-less run).
	s.farm_run_active = bool(d.get("farm_run_active", false))
	s.farm_run_budget = maxi(0, int(d.get("farm_run_budget", 0)))
	var run_zone := String(d.get("farm_run_zone", "home"))
	s.farm_run_zone = run_zone if CartographyConfig.board_biome(run_zone) == "farm" else "home"
	s.farm_run_used_fertilizer = bool(d.get("farm_run_used_fertilizer", false))
	var sel_raw: Variant = d.get("farm_run_selected", [])
	s.farm_run_selected = s._sanitize_selection(sel_raw) if sel_raw is Array else []
	if s.farm_run_active and s.farm_run_budget <= 0:
		# A run with no budget is incoherent — drop it back to "no run".
		s.farm_run_active = false
		s.farm_run_used_fertilizer = false
		s.farm_run_selected = []
	# Farm season cycle (A1, ADDITIVE). Restore the spent-turn counter and turns_left defensively.
	# The two paths diverge based on whether a bounded run is active:
	#
	# RUN ACTIVE path: farm_turns_used is clamped to [0, budget] (NOT wrapped). The value AT
	# budget is valid — it marks the "run ended, awaiting close_season" state that note_farm_turn
	# intentionally leaves behind. Wrapping it to 0 would resurrect a fresh full-budget run the
	# player already finished (losing the pending close_season +25/decay/reroll). farm_run_turns_left
	# is restored from the SAVED field (clamped to [0, budget]) rather than re-derived, so an
	# ended run (saved turns_left == 0) stays ended. If the saved turns_left is missing, fall back
	# to max(0, budget - used) to handle saves written before the field existed.
	#
	# NO-RUN (legacy) path: byte-identical to the original — a value at or past the budget implies
	# an un-harvested boundary and is wrapped to 0 (a clean Spring cycle, mirroring
	# note_farm_turn's harvest reset). farm_run_turns_left is always 0 when no run is active.
	var f_used: int = maxi(0, int(d.get("farm_turns_used", 0)))
	var f_budget: int = s.farm_turn_budget()
	if s.farm_run_active:
		# Clamp to [0, budget] — budget itself is the valid "ended" sentinel.
		s.farm_turns_used = clampi(f_used, 0, s.farm_run_budget)
		# Restore turns_left from the saved field (trust the persisted value); fall back to
		# deriving it only if the key is absent (pre-field saves).
		var saved_turns_left: Variant = d.get("farm_run_turns_left", null)
		if saved_turns_left != null:
			s.farm_run_turns_left = clampi(int(saved_turns_left), 0, s.farm_run_budget)
		else:
			s.farm_run_turns_left = maxi(0, s.farm_run_budget - s.farm_turns_used)
	else:
		# Legacy no-run path: wrap at the boundary, turns_left stays 0.
		if f_budget > 0 and f_used >= f_budget:
			f_used = 0
		s.farm_turns_used = f_used
		s.farm_run_turns_left = 0
	var tide := String(d.get("fish_tide", "high"))
	if tide != FishConfig.TIDE_HIGH and tide != FishConfig.TIDE_LOW:
		tide = FishConfig.TIDE_HIGH
	s.fish_tide = tide
	s.fish_tide_turn = maxi(0, int(d.get("fish_tide_turn", 0)))
	var pearl_d: Variant = d.get("fish_pearl", {})
	if pearl_d is Dictionary and not (pearl_d as Dictionary).is_empty():
		var pturns: int = maxi(0, int((pearl_d as Dictionary).get("turns_left", 0)))
		# Keep the pearl only while on the harbor with a live countdown — a stale pearl
		# from a non-harbor save (or one whose countdown has elapsed) is dropped.
		if biome == "harbor" and pturns > 0:
			s.fish_pearl = {
				"row": int((pearl_d as Dictionary).get("row", 0)),
				"col": int((pearl_d as Dictionary).get("col", 0)),
				"turns_left": pturns,
			}
	s.runes = maxi(0, int(d.get("runes", 0)))
	# Restore the seasonal-boss state defensively (T24). Keep boss_active only if it names a REAL
	# boss (a bogus id — or a stale old-model HP save with no valid id — → "" = idle). When idle,
	# every per-fight field snaps to its rest value so a corrupt save can't strand a phantom
	# challenge. When live, the window / progress / target / modifier overlay restore (clamped >= 0,
	# the modifier_state shape coerced via apply-shape defaults). The old `boss_hp` key is simply
	# ignored (this model has no HP). town2_complete is coerced to a plain bool (the Town-2 gate is
	# preserved across the model change).
	var saved_boss := String(d.get("boss_active", ""))
	if not BossConfig.is_boss(saved_boss):
		saved_boss = ""
	s.boss_active = saved_boss
	s.town2_complete = bool(d.get("town2_complete", false))
	if saved_boss == "":
		# Idle: rest every per-fight field (defensive against a partial/corrupt save).
		s.boss_season = ""
		s.boss_year = 1
		s.boss_turns_remaining = 0
		s.boss_progress = 0
		s.boss_target_resource = ""
		s.boss_target_amount = 0
		s.boss_modifier_state = {}
	else:
		# Live: restore the window/progress/target + the modifier overlay. Cache the season/target
		# from the CATALOG when the save omits them (an old or partial save), so they're always
		# consistent with the boss id. boss_year defaults to 1 (the port has no calendar).
		s.boss_season = String(d.get("boss_season", BossConfig.boss_season(saved_boss)))
		s.boss_year = maxi(1, int(d.get("boss_year", 1)))
		s.boss_turns_remaining = maxi(0, int(d.get("boss_turns_remaining", BossConfig.BOSS_WINDOW_TURNS)))
		s.boss_progress = maxi(0, int(d.get("boss_progress", 0)))
		s.boss_target_resource = String(d.get("boss_target_resource", BossConfig.target_resource(saved_boss)))
		s.boss_target_amount = maxi(0, int(d.get("boss_target_amount", BossConfig.target_amount(saved_boss))))
		var saved_mod = d.get("boss_modifier_state", {})
		s.boss_modifier_state = (saved_mod as Dictionary).duplicate(true) if saved_mod is Dictionary else {}
	# Restore the Town-3 rats state (M3h). Charges-used is clamped to >= 0 (a
	# corrupt negative can't grant phantom shoo-moves). It is NOT clamped to
	# BuildingConfig.RATCATCHER_CHARGES here — ratcatcher_charges_left() already floors the remaining
	# count at 0, so an over-large saved value simply reads as "no charges left".
	s.ratcatcher_charges_used = maxi(0, int(d.get("ratcatcher_charges_used", 0)))
	# Restore the farm HAZARDS state (T7/T8/T9). HazardLogic.normalise coerces ints (JSON yields
	# floats), drops malformed entries, and clamps to the active caps, so a corrupt/stale save can
	# never strand a phantom hazard. A missing "hazards" key (any pre-hazards save) normalises to
	# the default all-inactive state. fire_hazard_force stays false (transient, never persisted).
	s.hazards = HazardLogic.normalise(d.get("hazards", {}))
	# Restore the MINE HAZARDS state (T11). MineHazardLogic.normalise coerces ints (JSON yields
	# floats), drops malformed entries, and bounds-checks every cell, so a corrupt/stale save can
	# never strand a phantom mine hazard. A missing "mine_hazards" key (any pre-mine-hazards save)
	# normalises to the default all-inactive state. Mine hazards exist only on a mine expedition, so
	# a non-mine biome forces them inactive (a stale mine hazard can never bleed onto the farm).
	if biome == "mine":
		s.mine_hazards = MineHazardLogic.normalise(d.get("mine_hazards", {}))
	else:
		s.mine_hazards = MineHazardLogic.default_state()
	# Restore the Mysterious Ore (T23). Kept only on a mine expedition with a live countdown — a
	# stale ore from a non-mine save (or one whose countdown elapsed) is dropped (mirrors the
	# harbor pearl restore guard).
	var ore_d: Variant = d.get("mysterious_ore", {})
	if biome == "mine" and ore_d is Dictionary and not (ore_d as Dictionary).is_empty():
		var ore_turns: int = maxi(0, int((ore_d as Dictionary).get("turns_left", 0)))
		if ore_turns > 0:
			s.mysterious_ore = {
				"row": int((ore_d as Dictionary).get("row", 0)),
				"col": int((ore_d as Dictionary).get("col", 0)),
				"turns_left": ore_turns,
			}
	# Restore the Tile Collection slice (T2/T3/T5). Mirrors React mergeLoadedState
	# (src/state/helpers.ts:126-142): start from the FRESH default seed, then OVERLAY the
	# saved sub-keys so any new catalog variant added since the save still gets its default
	# (a save can never lose a freshly-added default tile). Only known catalog ids are kept
	# (a stale/bogus id is dropped); research progress is clamped to its variant's goal.
	s._ensure_tile_collection()   # seed defaults first
	var ta: Variant = d.get("tile_active_by_category", {})
	if ta is Dictionary:
		for cat in (ta as Dictionary).keys():
			var vid := String((ta as Dictionary)[cat])
			# Keep the saved active variant only when it's a real catalog tile of THAT category.
			if TileVariantConfig.is_tile(vid) and String(TileVariantConfig.by_id(vid).get("category", "")) == String(cat):
				s.tile_active_by_category[String(cat)] = vid
	var td: Variant = d.get("tile_discovered", {})
	if td is Dictionary:
		for id in (td as Dictionary).keys():
			if TileVariantConfig.is_tile(String(id)) and bool((td as Dictionary)[id]):
				s.tile_discovered[String(id)] = true
	var tr: Variant = d.get("tile_research_progress", {})
	if tr is Dictionary:
		for id in (tr as Dictionary).keys():
			if not TileVariantConfig.is_tile(String(id)):
				continue
			var goal: int = int(TileVariantConfig.discovery_of(String(id)).get("researchAmount", 0))
			s.tile_research_progress[String(id)] = clampi(int((tr as Dictionary)[id]), 0, maxi(0, goal))
	s.tile_free_moves = maxi(0, int(d.get("tile_free_moves", 0)))
	# Restore the settings preference (M4f). Coerced to a plain bool; defaults to
	# "on" (false) for any save written before this field existed.
	s.audio_muted = bool(d.get("audio_muted", false))
	s.reduce_motion = bool(d.get("reduce_motion", false))
	# Restore owned tool charges (M8b) into the composed ToolState from the SAME flat
	# top-level "tools" key. Missing key (any save written before tools existed) →
	# ToolState.from_dict({}) yields {} (no tools). Each value is coerced to int (JSON
	# yields floats) and only positive counts are kept — a 0/negative or non-numeric entry
	# is dropped so the loaded `tools` is always a clean owned-and-usable set; pending_tool
	# is transient and never restored (a reload starts disarmed). All enforced inside
	# ToolState.from_dict. SAVE_VERSION is NOT bumped — a save with no tools == tools {}.
	s.tool_state = ToolState.from_dict(d.get("tools", {}))
	# Restore achievements (M10) into the composed AchievementState from the SAME three flat
	# top-level keys (achievement_counters / achievements_unlocked / _distinct_seen). Missing
	# keys (any pre-M10 save) → empty maps, so old saves load with zero progress. Counters
	# coerce values to int (JSON yields floats); the unlocked map keeps only truthy entries;
	# distinct rebuilds a {counter -> {key -> true}} shape, dropping malformed rows — all
	# enforced inside AchievementState.from_flat. SAVE_VERSION is NOT bumped. Because the
	# unlocked set is restored, a subsequent bump_counter sees the id as already-unlocked and
	# never re-grants its reward on load.
	s.achievement_state = AchievementState.from_flat(
		d.get("achievement_counters", {}),
		d.get("achievements_unlocked", {}),
		d.get("_distinct_seen", {}),
	)
	# Restore the story engine state (beats/flags/triggers/choices). Missing key (any
	# save written before story existed) → a fresh act-1 StoryState via from_dict({}).
	# StoryState.from_dict floors the act at 1, keeps only truthy flags (incl. fired
	# markers), and well-forms choice_log / beat_queue — so a corrupt save can't strand
	# a phantom act or re-fire a one-time beat. SAVE_VERSION is NOT bumped (additive).
	var story_d: Variant = d.get("story", {})
	if story_d is Dictionary:
		s.story = StoryState.from_dict(story_d)
	# Restore hired workers (ADDITIVE). Missing key (any save written before workers
	# existed) → all counts at 0 (the _default_workers() the new GameState already
	# carries). Each value is coerced to int (JSON yields floats), kept only for REAL
	# worker ids, and clamped to [0, max_count] so a corrupt/over-large saved count can
	# never over-apply a reduction. SAVE_VERSION is NOT bumped (additive default).
	var wk: Variant = d.get("workers", null)
	if wk is Dictionary:
		for k in wk:
			var wid := String(k)
			if WorkerConfig.has_worker(wid):
				s.workers[wid] = clampi(int(wk[k]), 0, WorkerConfig.max_count(wid))
	# Restore tutorial_seen (ADDITIVE). Missing key (any save written before tutorial
	# existed) → false (show the tutorial once on upgrade). Coerced to plain bool.
	s.tutorial_seen = bool(d.get("tutorial_seen", false))
	# Restore daily login-streak state (ADDITIVE). Missing keys (any save written before
	# daily rewards existed) → "" / 0 (never claimed), the defaults the new GameState already
	# carries, so old saves start a fresh streak on the next launch. The date is coerced to a
	# String; the streak day is int-coerced, floored at 0, and clamped to MAX_DAY so a corrupt
	# saved value can never push the streak past its cap. If the date is empty (or not a
	# String) the day is forced to 0 too, so a "" date never carries a phantom streak day
	# (mirrors the never-claimed invariant: daily_last_claimed=="" implies day 0).
	# SAVE_VERSION is NOT bumped (additive default).
	var dlc: Variant = d.get("daily_last_claimed", "")
	s.daily_last_claimed = String(dlc) if dlc is String else ""
	if s.daily_last_claimed == "":
		s.daily_streak_day = 0
	else:
		s.daily_streak_day = clampi(int(d.get("daily_streak_day", 0)), 0, DailyRewardConfig.MAX_DAY)
	# Restore Castle contributions (ADDITIVE). Missing key (any save written before the
	# castle existed) → all needs at 0 (the _default_castle() the new GameState already
	# carries). Each value is coerced to int (JSON yields floats), kept only for REAL
	# need ids, floored at 0, and clamped to the need's target so a corrupt/over-large
	# saved value can never push a need past its goal. SAVE_VERSION is NOT bumped.
	var castle_d: Variant = d.get("castle_contributed", null)
	if castle_d is Dictionary:
		for k in castle_d:
			var cid := String(k)
			if CastleConfig.has_need(cid):
				s.castle_contributed[cid] = clampi(int(castle_d[k]), 0, CastleConfig.need_target(cid))
	# Restore Influence + decorations (ADDITIVE). Missing keys (any save written before
	# decorations existed) → influence 0 + an empty decorations dict (the defaults the new
	# GameState already carries). Influence is coerced to int + floored at 0; decoration
	# counts are int-coerced, floored at 0, and kept ONLY for REAL decoration ids so a
	# corrupt/stale save can never seed a phantom decoration. SAVE_VERSION is NOT bumped.
	s.influence = maxi(0, int(d.get("influence", 0)))
	var dec_d: Variant = d.get("decorations", null)
	if dec_d is Dictionary:
		for k in dec_d:
			var did := String(k)
			if DecorationConfig.has_decoration(did):
				s.decorations[did] = maxi(0, int(dec_d[k]))
	# Restore the Magic Portal build flag (ADDITIVE). Missing key (any save written before the
	# portal existed) → false (the default the new GameState already carries), so the summon
	# gate stays closed until the player builds it. Coerced to a plain bool. SAVE_VERSION is
	# NOT bumped.
	s.portal_built = bool(d.get("portal_built", false))
	# Restore Keepers + Boons (T31, ADDITIVE). Missing keys (any save written before T31 existed)
	# → embers/core_ingots 0 + an empty boons map (the defaults the new GameState already carries),
	# so every boon multiplier is 1.0 and the economy is unchanged. Both currencies are int-coerced
	# (JSON yields floats) + floored at 0; the boons map keeps ONLY truthy entries for REAL boon ids
	# so a corrupt/stale save can never seed a phantom (and thus mult-affecting) boon. The keeper
	# path flags ride along in `story.flags` (restored above). SAVE_VERSION is NOT bumped.
	s.embers = maxi(0, int(d.get("embers", 0)))
	s.core_ingots = maxi(0, int(d.get("core_ingots", 0)))
	var boons_d: Variant = d.get("boons", null)
	if boons_d is Dictionary:
		for k in boons_d:
			var bid := String(k)
			if BoonConfig.has_boon(bid) and bool(boons_d[k]):
				s.boons[bid] = true
	# Restore Quests + Almanac (ADDITIVE). Missing keys (any save written before quests
	# existed) → an empty quest board, day 0, the default seed, and a fresh almanac (the
	# defaults the new GameState already carries), so old saves load with no quests rolled
	# and the economy unchanged. Each saved quest is kept only if WELL-FORMED (a Dictionary
	# with a String id and int target/progress, target > 0); malformed rows are dropped so
	# a corrupt save can never desync the board. Almanac xp is int-coerced + floored at 0;
	# the level is RECOMPUTED from the restored xp (never trusted from the save) so a corrupt
	# saved level can't desync the curve; claimed tiers keep only REAL int tier ids,
	# de-duplicated; structural honours keep only truthy flags. SAVE_VERSION is NOT bumped.
	var qd: Variant = d.get("quests", [])
	if qd is Array:
		for q in qd:
			if not (q is Dictionary):
				continue
			var qid: Variant = (q as Dictionary).get("id", null)
			if not (qid is String) or String(qid) == "":
				continue
			var target: int = int((q as Dictionary).get("target", 0))
			if target <= 0:
				continue
			var rebuilt: Dictionary = {
				"id": String(qid),
				"template": String((q as Dictionary).get("template", "")),
				"category": String((q as Dictionary).get("category", "")),
				"key": String((q as Dictionary).get("key", "")),
				"item": String((q as Dictionary).get("item", "")),
				"tool": String((q as Dictionary).get("tool", "")),
				"min_length": int((q as Dictionary).get("min_length", -1)),
				"target": target,
				"progress": clampi(int((q as Dictionary).get("progress", 0)), 0, target),
				"claimed": bool((q as Dictionary).get("claimed", false)),
			}
			var rwd: Variant = (q as Dictionary).get("reward", {})
			if rwd is Dictionary:
				rebuilt["reward"] = {
					"coins": maxi(0, int((rwd as Dictionary).get("coins", 0))),
					"xp": maxi(0, int((rwd as Dictionary).get("xp", QuestConfig.QUEST_CLAIM_XP))),
				}
			else:
				rebuilt["reward"] = {"coins": 0, "xp": QuestConfig.QUEST_CLAIM_XP}
			s.quests.append(rebuilt)
	s.quest_day = maxi(0, int(d.get("quest_day", 0)))
	var qseed: Variant = d.get("quest_seed", "hearthwood")
	if qseed is String and String(qseed) != "":
		s.quest_seed = String(qseed)
	s.almanac_xp = maxi(0, int(d.get("almanac_xp", 0)))
	# Level is DERIVED from the restored xp, not trusted from the save (defensive).
	s.almanac_level = AlmanacConfig.level_for_xp(s.almanac_xp)
	var claimed_d: Variant = d.get("almanac_claimed", [])
	if claimed_d is Array:
		for t in claimed_d:
			var ti: int = int(t)
			if AlmanacConfig.has_tier(ti) and not s.almanac_claimed.has(ti):
				s.almanac_claimed.append(ti)
	var struct_d: Variant = d.get("almanac_structural", {})
	if struct_d is Dictionary:
		for k in struct_d:
			if bool(struct_d[k]):
				s.almanac_structural[String(k)] = true
	# T16: Restore dynamic market state (ADDITIVE). Missing keys (any save written before
	# T16 existed) → 0/0 defaults (seed 0, season 0) — a deterministic but non-random
	# season-0 price set. Both values are int-coerced + floored at 0; market_seed is
	# kept unsigned (masked to 0x7FFFFFFF so it stays positive in GDScript's signed
	# int domain). market_prices and market_event are derived — recomputed from the
	# restored seed + season by _recompute_market(). SAVE_VERSION is NOT bumped.
	s.market_seed = maxi(0, int(d.get("market_seed", 0))) & 0x7FFFFFFF
	s.market_season = maxi(0, int(d.get("market_season", 0)))
	s._recompute_market()
	return s

# ── Fresh-game factory (React-parity starting economy) ──────────────────────
## Create a brand-new game with the React-parity starting economy.
## The bare `GameState.new()` starts at 0 coins (field default); this factory
## seeds the coins React grants a fresh player so the entry cost gate
## (start_farm_run costs 50 coins) is immediately affordable.
##
## React source: src/state/init.ts:71 — `coins: 150`
##
## DESIGN NOTE: Do NOT change the `var coins: int = 0` field default — the test
## suites all build `GameState.new()` and rely on the 0-coins baseline.
## Instead, every genuine "brand-new game" creation must go through this factory.
static func new_game() -> GameState:
	var g := GameState.new()
	# React parity: src/state/init.ts:71 — coins: 150
	g.coins = Constants.STARTING_COINS
	# T16: seed the market deterministically from the current time (a fresh game gets
	# a unique seed so each run has a distinct price history). market_season starts at 0.
	g.market_seed = int(Time.get_unix_time_from_system()) & 0x7FFFFFFF
	g.market_season = 0
	g._recompute_market()
	return g
