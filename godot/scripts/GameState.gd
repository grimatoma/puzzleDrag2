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
var active_biome: String = "farm"   ## "farm" | "mine" — which biome the board shows
var mine_turns_left: int = 0        ## remaining mine turns this expedition (0 on the farm)

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

## Seed the order generator so generate_order / refill_orders are reproducible.
func seed_orders(s: int) -> void:
	rng.seed = s

## Apply one resolved chain to the run economy and return a summary dict.
## Mutates inventory/progress, increments coins and turn.
func credit_chain(tile_type: int, chain_len: int) -> Dictionary:
	var resource: String = Constants.produced_resource(tile_type)
	var threshold: int = Constants.threshold_for(tile_type)
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
	var inputs: Dictionary = RecipeConfig.recipe_inputs(recipe_id)
	for k in inputs.keys():
		if int(inventory.get(k, 0)) < int(inputs[k]):
			return false
	return true

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
	var inputs: Dictionary = RecipeConfig.recipe_inputs(recipe_id)
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
	return {
		"resource": resource,
		"qty": qty,
		"reward": OrderConfig.reward_for(resource, qty),
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
	var reward: int = int(order["reward"])
	# Deduct the delivered goods (floor at 0, erase the key when it hits 0).
	var remaining: int = maxi(0, int(inventory.get(resource, 0)) - qty)
	if remaining == 0:
		inventory.erase(resource)
	else:
		inventory[resource] = remaining
	# Coins are UNCAPPED — only inventory resources are bounded by the settlement
	# cap, so a big-reward order can push coins arbitrarily high.
	coins += reward
	orders.remove_at(index)
	refill_orders()
	return {"ok": true, "reward": reward, "resource": resource, "qty": qty}

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

## The refill pool for the CURRENTLY active biome: the flat MINE_POOL while mining,
## otherwise the farm's building-gated pool (active_tile_pool). The mine board is
## not building-gated this milestone (no mine spawners yet).
func active_biome_pool() -> Array:
	if is_in_mine():
		return Constants.MINE_POOL.duplicate()
	return active_tile_pool()

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
		"active_biome": active_biome,
		"mine_turns_left": mine_turns_left,
		"boss_active": boss_active,
		"boss_hp": boss_hp,
		"town2_complete": town2_complete,
		"ratcatcher_charges_used": ratcatcher_charges_used,
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
			s.orders.append({"resource": String(resource), "qty": qty, "reward": reward})
	# Restore the expedition state defensively (M3f). The biome must be one of the
	# two known values (anything else falls back to "farm"); turns can't go negative;
	# and a corrupt "mine"-with-no-turns save snaps back to the farm (turns 0) so a
	# stale save can never strand the player in a turn-less mine.
	var biome := String(d.get("active_biome", "farm"))
	if biome != "farm" and biome != "mine":
		biome = "farm"
	var turns: int = maxi(0, int(d.get("mine_turns_left", 0)))
	if biome == "mine" and turns <= 0:
		biome = "farm"
		turns = 0
	s.active_biome = biome
	s.mine_turns_left = turns
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
	return s
