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
## The 5-NPC roster and per-NPC bond (a float in [0, 10]). Every order is REQUESTED
## by an NPC (generate_order picks one via the seeded `rng`); filling it pays a
## bond-ADJUSTED reward (NpcConfig.reward_with_bond) and raises that NPC's bond by
## BOND_GAIN_PER_FILL. The default bond is 5.0 (Warm, ×1.00), so a fresh order's
## payout is IDENTICAL to the pre-bonding flat reward until a bond crosses into
## Liked (≥7) or Sour (<5) — keeping this layer additive (the orders economy stays
## green at the default bond). Roster = NpcConfig.all_ids(); bonds map id → float.
## Persisted in to_dict / from_dict (defensive defaults for old saves).
var npcs: Dictionary = {
	"roster": NpcConfig.all_ids(),
	"bonds": _default_bonds(),
}
## Bond gained each time an order from that NPC is filled (+0.3 per React bond.ts).
const BOND_GAIN_PER_FILL: float = 0.3
## Fallback NPC for an old save's order missing its `npc` field (defensive).
const DEFAULT_ORDER_NPC: String = "wren"

## Build the starting bonds map: every roster NPC at the Warm default (5.0).
static func _default_bonds() -> Dictionary:
	var out: Dictionary = {}
	for id in NpcConfig.all_ids():
		out[id] = 5.0
	return out

## Current bond for `id` (0..10 float). A missing/unknown id reads as the Warm
## default 5.0 so reward math never divides by a phantom band.
func npc_bond(id: String) -> float:
	var bonds: Dictionary = npcs.get("bonds", {})
	return float(bonds.get(id, 5.0))

## Adjust `id`'s bond by `amount` (may be negative), clamped to [0, 10]. No-op for
## an id not in the bonds map's keys EXCEPT it will seed a known roster id at the
## default first. Stores a float.
func gain_bond(id: String, amount: float) -> void:
	var bonds: Dictionary = npcs.get("bonds", {})
	var current: float = float(bonds.get(id, 5.0))
	bonds[id] = clampf(current + amount, 0.0, 10.0)
	npcs["bonds"] = bonds

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

# ── Capstone boss (M3g, the Town-2 close) ─────────────────────────────────────
## The Direction's "capstone boss" (Frostmaw): the gate that proves farm + mine
## mastery before Town 2 opens up. While a boss is active it RAISES the board's
## minimum chain length (boss_min_chain); you defeat it by landing chains against
## its HP. Defeating it sets town2_complete, which a later milestone consumes to
## unlock Town 3. See BossConfig for the catalog.
var boss_active: String = ""        ## "" when no fight in progress, else a boss id
var boss_hp: int = 0                ## remaining HP of the active boss
var town2_complete: bool = false    ## set true when the capstone boss is defeated

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
## The "5 free moves/year" from the Direction maps to RATCATCHER_CHARGES (there is no
## year/season calendar in the port — see the turn-counter note above — so the
## charges are a flat per-run budget the player spends down).
const RATCATCHER_CHARGES: int = 5
var ratcatcher_charges_used: int = 0   ## shoo-moves spent (0..RATCATCHER_CHARGES)

# ── Settings (M4f) ────────────────────────────────────────────────────────────
## Player audio preference, surfaced by the settings/menu modal (MenuScreen). Main
## applies it to the owned Audio service on launch (Audio.set_muted) and toggles it
## from the menu; persisted so the choice survives a reload. Defaults to "on".
var audio_muted: bool = false

# ── Tools (M8b, the GameState-level tool API) ─────────────────────────────────
## Owned tool charges, keyed by ToolConfig id (String) → remaining uses (int).
## A missing key reads as 0 (no charges). This is the persisted half of the tool
## system: tools are GRANTED (grant_tool), CONSUMED one charge per use
## (use_tool_on_grid), and the key is ERASED when its count hits 0 so the dict stays
## a clean "owned, usable" set. The pure board effects live in ToolEffects /
## ToolConfig (M8a); this layer just owns the inventory + the credit/consume flow.
var tools: Dictionary = {}
## The armed TAP-target tool awaiting a board cell, or "" when nothing is armed.
## TRANSIENT — deliberately NOT persisted (arm_tool / clear_pending_tool only):
## arming is a momentary input mode the live Board (M8c) drives, not save state. A
## reload always starts disarmed.
var pending_tool: String = ""

# ── Achievements (M10, counters + trophies) ───────────────────────────────────
## The trophy system, ported from the React achievements slice
## (src/features/achievements/data.ts) as a counter/threshold/reward layer wired
## ADDITIVELY into the existing event sites (credit_chain / fill_order / build /
## damage_boss). See AchievementConfig for the ported, port-reachable catalog.
##
## counter_name:String -> int running total. Bumped by bump_counter() at each event
## site; a missing key reads as 0. Plain quantity/chain counters increment freely;
## DISTINCT counters (see _distinct_seen) only increment on a newly-seen key.
var achievement_counters: Dictionary = {}
## achievement_id:String -> true for every UNLOCKED trophy. An id present here is
## already earned: bump_counter never re-grants its reward (idempotent unlock).
var achievements_unlocked: Dictionary = {}
## counter_name:String -> {distinct_key:String -> true}. Backs the distinct counters
## (distinct_resources_chained, distinct_buildings_built): a key bumps its counter the
## FIRST time it is seen for that counter and never again. Mirrors the React
## seenResources / seenBuildings maps, generalised to one map keyed by counter.
var _distinct_seen: Dictionary = {}

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

## A threshold can NEVER be reduced below this floor — so stacking enough workers
## of a category can't collapse the threshold to 0/1 and "explode" the unit math
## (a chain of 3 would otherwise mint absurd quantities). Mirrors a sane minimum
## chain length; at 0 workers the reduction is 0 so this floor is never even reached.
const WORKER_MIN_THRESHOLD: int = 2

## Build the starting workers map: every WorkerConfig id at 0 hires.
static func _default_workers() -> Dictionary:
	var out: Dictionary = {}
	for id in WorkerConfig.all_ids():
		out[id] = 0
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
## Mutates inventory/progress, increments coins and turn.
func credit_chain(tile_type: int, chain_len: int) -> Dictionary:
	var resource: String = Constants.produced_resource(tile_type)
	var threshold: int = Constants.threshold_for(tile_type)
	# Workers (ADDITIVE): threshold_reduce_category workers shave tiles off the
	# matching chain. worker_threshold_reduction is 0 when no worker of this tile's
	# category is hired, so eff_threshold == threshold and the unit/progress math is
	# IDENTICAL to the pre-workers economy. The WORKER_MIN_THRESHOLD floor keeps a
	# fully-staffed category from collapsing the threshold to 0/1 and exploding the
	# units. The floor only ever applies to a REAL (positive) threshold — the
	# NO_THRESHOLD sentinel branch below (threshold <= 0, hazards) is untouched.
	if threshold > 0:
		threshold = maxi(WORKER_MIN_THRESHOLD, threshold - worker_threshold_reduction(tile_type))
	var new_progress: int = int(progress.get(resource, 0)) + chain_len
	var units: int = 0
	if threshold > 0:
		units = new_progress / threshold        # int division floors for positives
		progress[resource] = new_progress % threshold
	else:
		# Defensive: a non-positive threshold never yields units; progress carries.
		progress[resource] = new_progress
	if units > 0:
		# Enforce the settlement storage cap: a resource can never exceed the
		# current tier's per-resource cap (Camp 200 … City 600).
		var capped: int = mini(int(inventory.get(resource, 0)) + units, settlement.cap())
		inventory[resource] = capped
	# Coins simplified for M2 — the React per-tile `value` economy is deferred to
	# M3. Each resolved chain earns at least 1 coin, scaling with chain length.
	var coins_gain: int = maxi(1, chain_len / 2)
	coins += coins_gain
	turn += 1
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
	return {
		"resource": resource,
		"units": units,
		"coins_gain": coins_gain,
		"length": chain_len,
		"tile_type": tile_type,
	}

## Collected whole-unit count of a resource (0 when never collected).
func qty(resource: String) -> int:
	return int(inventory.get(resource, 0))

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
	# M10 achievements (ADDITIVE): a DISTINCT building id → +1 on the first build of
	# each id (build() already rejects a re-build of an existing id, but the distinct
	# guard makes the counter robust even if a future caller demolishes + rebuilds).
	bump_counter("distinct_buildings_built", 1, id)
	# Story engine (ADDITIVE, after the build is committed): post a "building_built"
	# event so build-gated beats (act1_lumber_raised on event.id=="lumber_camp",
	# act2_kitchen on "kitchen") can fire. The success result below is UNCHANGED.
	post_story_event({"type": "building_built", "id": id})
	return {"ok": true, "id": id, "name": BuildingConfig.building_name(id)}

## Remove spawner `id`, freeing its plot and dropping its category from the pool.
## NO resource refund — the Direction lists demolish refunds as an open design
## question, so for this first pass demolition is free but un-refunded. Returns
## {ok:true, id} on success or {ok:false, reason:"not_built"} when `id` isn't placed.
func demolish(id: String) -> Dictionary:
	if not has_building(id):
		return {"ok": false, "reason": "not_built"}
	buildings.erase(id)
	return {"ok": true, "id": id}

# ── Refining (recipe crafting at refiner buildings) ───────────────────────────

## True when `recipe_id` exists, its station building is built, AND inventory
## covers every input at the required quantity.
func can_craft(recipe_id: String) -> bool:
	if not RecipeConfig.is_recipe(recipe_id):
		return false
	if not has_building(RecipeConfig.recipe_station(recipe_id)):
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
	for k in inputs.keys():
		var reduction: int = worker_recipe_input_reduction(recipe_id, String(k))
		if reduction > 0:
			inputs[k] = maxi(1, int(inputs[k]) - reduction)
	return inputs

## Craft `recipe_id`: deduct every input (floored at 0), add the recipe's output
## quantity to inventory (clamped to the settlement cap), and return
## {ok:true, output, qty, recipe} on success. On failure returns {ok:false, reason}
## WITHOUT mutating; reason is the FIRST guard that trips, in order:
## "unknown" → "no_station" → "insufficient".
func craft(recipe_id: String) -> Dictionary:
	if not RecipeConfig.is_recipe(recipe_id):
		return {"ok": false, "reason": "unknown"}
	if not has_building(RecipeConfig.recipe_station(recipe_id)):
		return {"ok": false, "reason": "no_station"}
	# Workers (ADDITIVE): recipe_input_reduce workers (the Baker) shave inputs off the
	# matching recipe. _effective_recipe_inputs floors each reduced input at 1, and the
	# reduction is 0 when no Baker is hired — so at 0 bakers the inputs are byte-identical
	# to RecipeConfig.recipe_inputs and craft is unchanged. Used for BOTH the
	# affordability check and the deduction below so they can never diverge.
	var inputs: Dictionary = _effective_recipe_inputs(recipe_id)
	for k in inputs.keys():
		if int(inventory.get(k, 0)) < int(inputs[k]):
			return {"ok": false, "reason": "insufficient"}
	# All guards passed — commit: deduct inputs, then add the output (cap-clamped).
	for k in inputs.keys():
		var remaining: int = maxi(0, int(inventory.get(k, 0)) - int(inputs[k]))
		if remaining == 0:
			inventory.erase(k)
		else:
			inventory[k] = remaining
	var output: String = RecipeConfig.recipe_output(recipe_id)
	var qty_out: int = RecipeConfig.recipe_qty(recipe_id)
	inventory[output] = mini(int(inventory.get(output, 0)) + qty_out, settlement.cap())
	return {"ok": true, "output": output, "qty": qty_out, "recipe": recipe_id}

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
	var coins_gain: int = MarketConfig.sell_price(resource) * qty
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
	var price: int = MarketConfig.buy_price(resource)
	# Affordability is checked against the FULL requested qty first: if the player
	# can't pay for what they asked for, the order is rejected outright.
	if coins < price * qty:
		return {"ok": false, "reason": "cant_afford"}
	# Cap discipline: only buy (and only charge for) what actually fits in storage.
	var current: int = int(inventory.get(resource, 0))
	var room: int = maxi(0, settlement.cap() - current)
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
	var out: Array = ["hay_bundle", "flour"]
	for id in buildings:
		var res: String = BuildingConfig.building_resource(id)
		if res != "" and not out.has(res):
			out.append(res)
	return out

## Roll a single fresh order from the current orderable resources — a uniform
## resource pick, a qty in [MIN_QTY, MAX_QTY], and the matching reward. Pure: does
## NOT mutate `orders`.
func generate_order() -> Dictionary:
	var pool: Array = orderable_resources()
	var resource: String = String(pool[rng.randi_range(0, pool.size() - 1)])
	var qty: int = rng.randi_range(OrderConfig.MIN_QTY, OrderConfig.MAX_QTY)
	var reward: int = OrderConfig.reward_for(resource, qty)
	# ADDITIVE (NPC bonding): pick the requesting NPC via the SAME seeded `rng` so
	# generation stays reproducible, and carry `base_reward` (== the rolled reward)
	# alongside the unchanged `reward` field. `reward` STAYS the base so any
	# order["reward"] reader is unaffected; fill_order computes the bond-adjusted
	# PAYOUT from `base_reward` at fill time.
	var roster: Array = npcs.get("roster", NpcConfig.all_ids())
	if roster.is_empty():
		roster = NpcConfig.all_ids()
	var npc: String = String(roster[rng.randi_range(0, roster.size() - 1)])
	return {
		"resource": resource,
		"qty": qty,
		"reward": reward,
		"npc": npc,
		"base_reward": reward,
	}

## Top the order board back up to OrderConfig.MAX_ORDERS by appending fresh rolls.
## Idempotent once full. Call after load and after each fill.
func refill_orders() -> void:
	while orders.size() < OrderConfig.MAX_ORDERS:
		orders.append(generate_order())

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
	gain_bond(npc, BOND_GAIN_PER_FILL)
	orders.remove_at(index)
	refill_orders()
	# M10 achievements (ADDITIVE): one fulfilled order → +1 on orders_fulfilled.
	bump_counter("orders_fulfilled")
	# Story engine (ADDITIVE, after the order is committed): post an "order_fulfilled"
	# event so act1_first_order can fire. The success result below is UNCHANGED.
	post_story_event({"type": "order_fulfilled"})
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
	mine_turns_left = s
	active_biome = "mine"
	return {"ok": true, "turns": s}

## Spend one mine turn. Call AFTER a mine chain resolves (the chain's resources are
## already credited via credit_chain). Decrements mine_turns_left; if it hits 0 the
## expedition ends (back to the farm). SOFT-FAIL: everything gathered is kept (it's
## in `inventory` already). Returns {exited, turns_left}.
func note_mine_turn() -> Dictionary:
	mine_turns_left = maxi(0, mine_turns_left - 1)
	if mine_turns_left == 0:
		active_biome = "farm"
		return {"exited": true, "turns_left": 0}
	return {"exited": false, "turns_left": mine_turns_left}

## Manually abandon the expedition early (the Town screen "Leave the mine" button).
## Snap back to the farm and drop any remaining turns — everything gathered is kept.
func leave_mine() -> void:
	active_biome = "farm"
	mine_turns_left = 0

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
## fish chain run NEXT TO the pearl captures it. The Board only emits its `pearl_chain`
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
	var cats: Array = ["grass", "grain"]
	for id in buildings:
		if not BuildingConfig.is_spawner(id):
			continue
		var cat: String = BuildingConfig.building_category(id)
		if cat != "" and not cats.has(cat):
			cats.append(cat)
	return cats

## Active weighted refill pool (Array[int] of Constants.Tile): the STAPLE_POOL
## plus each placed SPAWNER's representative tile TWICE (a moderate slice). A
## fresh, building-less game is staples-only. Refiners (Bakery) spawn no tile, so
## they are skipped — appending their EMPTY tile would corrupt the board pool.
func active_tile_pool() -> Array:
	var pool: Array = Constants.STAPLE_POOL.duplicate()
	for id in buildings:
		if not BuildingConfig.is_spawner(id):
			continue
		var tile: int = BuildingConfig.building_tile(id)
		pool.append(tile)
		pool.append(tile)
	# M3h: once Town 2 is complete the rats hazard is live — seed RAT_POOL_SLOTS rat
	# tiles into the FARM pool (a recurring nuisance, not a takeover). Only the farm
	# pool gets rats; the mine pool (active_biome_pool while mining) is untouched.
	if rats_enabled():
		for _i in Constants.RAT_POOL_SLOTS:
			pool.append(Constants.Tile.RAT)
	return pool

# ── Capstone boss (M3g) ───────────────────────────────────────────────────────

## True while a boss fight is in progress.
func is_boss_active() -> bool:
	return boss_active != ""

## True when the capstone boss CAN be challenged right now: Town 2 isn't already
## done, no fight is in progress, the settlement has reached City (the boss is the
## City-tier gate), and you've "mastered the mine" — at least 12 combined refined
## mine goods (block + iron_bar) banked. Guards are ordered so start_boss can report
## the FIRST failing reason.
func can_challenge_boss() -> bool:
	if town2_complete:
		return false
	if is_boss_active():
		return false
	if settlement.tier < TownConfig.TIER_CITY:
		return false
	if qty("block") + qty("iron_bar") < 12:
		return false
	return true

## Begin the capstone boss fight. On failure returns {ok:false, reason} (the FIRST
## guard that trips, in order: "already_done" → "in_fight" → "locked" → "not_ready")
## WITHOUT mutating. On success: arm Frostmaw at full HP and return
## {ok:true, name, hp, min_chain}.
func start_boss() -> Dictionary:
	if town2_complete:
		return {"ok": false, "reason": "already_done"}
	if is_boss_active():
		return {"ok": false, "reason": "in_fight"}
	if settlement.tier < TownConfig.TIER_CITY:
		return {"ok": false, "reason": "locked"}
	if qty("block") + qty("iron_bar") < 12:
		return {"ok": false, "reason": "not_ready"}
	boss_active = BossConfig.FROSTMAW
	boss_hp = BossConfig.boss_hp(BossConfig.FROSTMAW)
	return {
		"ok": true,
		"name": BossConfig.boss_name(BossConfig.FROSTMAW),
		"hp": boss_hp,
		"min_chain": BossConfig.boss_min_chain(BossConfig.FROSTMAW),
	}

## Minimum chain length the BOARD must demand right now: the active boss's raised
## bar while fighting, else the base Constants.MIN_CHAIN.
func boss_min_chain() -> int:
	if is_boss_active():
		return BossConfig.boss_min_chain(boss_active)
	return Constants.MIN_CHAIN

## Apply one resolved chain of length `chain_len` as boss damage. With no boss
## active returns {active:false} (and changes nothing). Otherwise subtracts the
## chain length from HP (clamped at 0). When HP hits 0 the boss is DEFEATED: mark
## Town 2 complete, credit the reward coins, clear the fight, and return
## {active:true, defeated:true, reward, name}. Otherwise returns
## {active:true, defeated:false, hp:<remaining>}.
func damage_boss(chain_len: int) -> Dictionary:
	if not is_boss_active():
		return {"active": false}
	boss_hp = maxi(0, boss_hp - chain_len)
	if boss_hp == 0:
		var r: int = BossConfig.boss_reward(boss_active)
		var nm: String = BossConfig.boss_name(boss_active)
		town2_complete = true
		coins += r
		boss_active = ""
		# M10 achievements (ADDITIVE): only a DEFEAT bumps bosses_defeated (+1). A
		# non-fatal hit falls through to the {defeated:false} return below and never
		# touches the counter.
		bump_counter("bosses_defeated")
		# Story engine (ADDITIVE, only on a DEFEAT): post a "boss_defeated" event so
		# act2_frostmaw_felled fires (and queues its choice aftermath). The defeat result
		# below is UNCHANGED. A non-fatal hit falls through and posts nothing.
		post_story_event({"type": "boss_defeated"})
		return {"active": true, "defeated": true, "reward": r, "name": nm}
	return {"active": true, "defeated": false, "hp": boss_hp}

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
	return maxi(0, RATCATCHER_CHARGES - ratcatcher_charges_used)

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

# ── Tools (M8b) ───────────────────────────────────────────────────────────────

## Grant `n` charges of tool `id`. No-op for an unknown id (ToolConfig doesn't know
## it) or a non-positive `n`. Adds to any existing charges so granting the same tool
## twice stacks. A fresh grant creates the key; the count is always kept > 0.
func grant_tool(id: String, n: int = 1) -> void:
	if n <= 0:
		return
	if not ToolConfig.has_tool(id):
		return
	tools[id] = int(tools.get(id, 0)) + n

## Remaining charges of tool `id` (0 when unowned / never granted).
func tool_count(id: String) -> int:
	return int(tools.get(id, 0))

## True when `id` has at least one charge owned (regardless of whether ToolConfig
## still knows it — a count > 0 means it was validly granted).
func has_tool_charges(id: String) -> bool:
	return tool_count(id) > 0

## True when `id` is a REAL tool (ToolConfig knows it) AND has at least one charge.
## The gate use_tool_on_grid checks first.
func can_use_tool(id: String) -> bool:
	return ToolConfig.has_tool(id) and has_tool_charges(id)

## Arm a TAP-target tool so the next board cell fires it. Returns true on success
## (the tool is a known tap tool with charges → pending_tool is set). Returns false
## WITHOUT arming for an unknown tool, a NON-tap (instant) tool, or one with no
## charges — instant tools fire immediately and never need arming.
func arm_tool(id: String) -> bool:
	if not can_use_tool(id):
		return false
	if not ToolConfig.is_tap_target(id):
		return false
	pending_tool = id
	return true

## True while a tap-target tool is armed and waiting for a board cell.
func is_tool_armed() -> bool:
	return pending_tool != ""

## Disarm any pending tap-target tool (cancel the armed input mode).
func clear_pending_tool() -> void:
	pending_tool = ""

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
	# Consume one charge; erase the key at 0 so `tools` stays an owned-and-usable set.
	var left: int = int(tools.get(id, 0)) - 1
	if left <= 0:
		tools.erase(id)
	else:
		tools[id] = left
	# If this was the armed tap tool, disarm it now that it has fired.
	if pending_tool == id:
		pending_tool = ""
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
	var prev: int = int(achievement_counters.get(counter, 0))
	if distinct_key != null:
		# Distinct counter: only the first sighting of this key bumps the count.
		var seen: Dictionary = _distinct_seen.get(counter, {})
		var key: String = String(distinct_key)
		if key == "" or seen.has(key):
			return []   # empty key or already counted → no change, nothing unlocks
		seen[key] = true
		_distinct_seen[counter] = seen
		achievement_counters[counter] = prev + 1
	else:
		if amount == 0:
			return []   # a zero bump can't cross a threshold
		achievement_counters[counter] = prev + amount
	var new_total: int = int(achievement_counters[counter])

	# Mark + reward every achievement on this counter that just crossed its threshold.
	var newly: Array = []
	for a in AchievementConfig.for_counter(counter):
		var id: String = String(a.get("id", ""))
		if bool(achievements_unlocked.get(id, false)):
			continue   # already earned — idempotent, never re-grant
		var threshold: int = int(a.get("threshold", 0))
		if prev < threshold and new_total >= threshold:
			achievements_unlocked[id] = true
			_grant_reward(a.get("reward", {}))
			newly.append(a)
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
	if _distinct_seen.has(counter):
		return int((_distinct_seen[counter] as Dictionary).size())
	return int(achievement_counters.get(counter, 0))

## Plain-Dictionary snapshot for persistence.
func to_dict() -> Dictionary:
	return {
		"inventory": inventory.duplicate(),
		"progress": progress.duplicate(),
		"coins": coins,
		"turn": turn,
		"settlement": settlement.to_dict(),
		"buildings": buildings.duplicate(),
		"orders": orders.duplicate(true),
		# NPC bonding (ADDITIVE): the roster + per-NPC bonds (floats). Deep-copied so
		# the snapshot is independent. Orders themselves carry their `npc`/`base_reward`
		# inside the `orders` array above. SAVE_VERSION is NOT bumped — a save written
		# before npcs existed loads the default roster/bonds (from_dict defensive default).
		"npcs": npcs.duplicate(true),
		"active_biome": active_biome,
		"mine_turns_left": mine_turns_left,
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
		"boss_active": boss_active,
		"boss_hp": boss_hp,
		"town2_complete": town2_complete,
		"ratcatcher_charges_used": ratcatcher_charges_used,
		"audio_muted": audio_muted,
		# M8b: owned tool charges. pending_tool is TRANSIENT and intentionally NOT
		# persisted (a reload always starts disarmed).
		"tools": tools.duplicate(),
		# M10: achievement counters, the unlocked set, and the distinct-seen maps.
		# Persisting `achievements_unlocked` is what makes load NON-double-granting —
		# a restored unlocked id is skipped by bump_counter, so its reward is never
		# re-issued (the reward was already banked the run it was first earned).
		"achievement_counters": achievement_counters.duplicate(),
		"achievements_unlocked": achievements_unlocked.duplicate(),
		"_distinct_seen": _distinct_seen.duplicate(true),
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
	# Restore the NPC roster + bonds (ADDITIVE). Missing key (any save written before
	# npcs existed) → the default roster (NpcConfig.all_ids) at the Warm default 5.0,
	# so old saves load with neutral relationships. The roster keeps only REAL ids,
	# de-duplicated; bonds keep only roster ids, coerced to float and clamped to
	# [0, 10] (JSON yields floats; a corrupt out-of-range value can't break banding).
	# Any roster id missing a saved bond defaults to 5.0. SAVE_VERSION is NOT bumped.
	var npcs_d: Variant = d.get("npcs", null)
	if npcs_d is Dictionary:
		var roster: Array = []
		var raw_roster: Variant = npcs_d.get("roster", [])
		if raw_roster is Array:
			for rid in raw_roster:
				var sid := String(rid)
				if NpcConfig.has(sid) and not roster.has(sid):
					roster.append(sid)
		if roster.is_empty():
			roster = NpcConfig.all_ids()
		var bonds: Dictionary = {}
		var raw_bonds: Variant = npcs_d.get("bonds", {})
		for id in roster:
			var v: float = 5.0
			if raw_bonds is Dictionary and raw_bonds.has(id):
				v = clampf(float(raw_bonds[id]), 0.0, 10.0)
			bonds[id] = v
		s.npcs = {"roster": roster, "bonds": bonds}
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
	# Restore the capstone-boss state defensively (M3g). Keep boss_active only if it
	# names a REAL boss (a bogus id → "" = no fight); HP can't go negative; and a
	# "no fight" state ("") snaps HP to 0 so a stale save can't strand a phantom
	# fight with leftover HP. town2_complete is coerced to a plain bool.
	var saved_boss := String(d.get("boss_active", ""))
	if not BossConfig.is_boss(saved_boss):
		saved_boss = ""
	var bhp: int = maxi(0, int(d.get("boss_hp", 0)))
	if saved_boss == "":
		bhp = 0
	s.boss_active = saved_boss
	s.boss_hp = bhp
	s.town2_complete = bool(d.get("town2_complete", false))
	# Restore the Town-3 rats state (M3h). Charges-used is clamped to >= 0 (a
	# corrupt negative can't grant phantom shoo-moves). It is NOT clamped to
	# RATCATCHER_CHARGES here — ratcatcher_charges_left() already floors the remaining
	# count at 0, so an over-large saved value simply reads as "no charges left".
	s.ratcatcher_charges_used = maxi(0, int(d.get("ratcatcher_charges_used", 0)))
	# Restore the settings preference (M4f). Coerced to a plain bool; defaults to
	# "on" (false) for any save written before this field existed.
	s.audio_muted = bool(d.get("audio_muted", false))
	# Restore owned tool charges (M8b). Missing key (any save written before tools
	# existed) → {} (no tools). Each value is coerced to int (JSON yields floats) and
	# only positive counts are kept — a 0/negative or non-numeric entry is dropped so
	# the loaded `tools` is always a clean owned-and-usable set. pending_tool is
	# transient and never restored (a reload starts disarmed). SAVE_VERSION is NOT
	# bumped: like every prior additive field (M3f/M3g/M3h/M4f), the defensive default
	# means old v1 saves still load (a save with no tools == tools {}).
	var tls: Variant = d.get("tools", {})
	if tls is Dictionary:
		for k in tls:
			var n: int = int(tls[k])
			if n > 0:
				s.tools[String(k)] = n
	# Restore achievements (M10). Missing keys (any pre-M10 save) → empty maps, so
	# old saves load with zero progress. Counters coerce values to int (JSON yields
	# floats); the unlocked map keeps only truthy entries; _distinct_seen rebuilds a
	# {counter -> {key -> true}} shape, dropping malformed rows. SAVE_VERSION is NOT
	# bumped — like every prior additive field, the defensive defaults keep old saves
	# loading. Because the unlocked set is restored here, a subsequent bump_counter
	# sees the id as already-unlocked and never re-grants its reward on load.
	var counters: Variant = d.get("achievement_counters", {})
	if counters is Dictionary:
		for k in counters:
			s.achievement_counters[String(k)] = int(counters[k])
	var unlocked: Variant = d.get("achievements_unlocked", {})
	if unlocked is Dictionary:
		for k in unlocked:
			if bool(unlocked[k]):
				s.achievements_unlocked[String(k)] = true
	var distinct: Variant = d.get("_distinct_seen", {})
	if distinct is Dictionary:
		for ckey in distinct:
			var inner: Variant = distinct[ckey]
			if not (inner is Dictionary):
				continue
			var seen: Dictionary = {}
			for sk in inner:
				if bool(inner[sk]):
					seen[String(sk)] = true
			if not seen.is_empty():
				s._distinct_seen[String(ckey)] = seen
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
	return s
