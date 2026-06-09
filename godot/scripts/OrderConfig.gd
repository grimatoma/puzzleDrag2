class_name OrderConfig
extends RefCounted
## Order generation tuning — the Direction spec's order / coin-sink loop. An NPC
## requests a quantity of a resource (or, at higher player progression, a crafted
## GOOD); delivering it from inventory pays a coin reward that BEATS selling the
## same goods at the Market, so orders are the canonical reason to refine and
## stockpile rather than dump everything at the Market.
##
## T19 — VALUE-SCALED rewards + crafted-good order pool, ported from React
## makeOrder (src/state/helpers.ts:233-290). The port's resource "value" signal is
## MarketConfig.sell_price (the port has no separate ITEMS.value field — sell_price
## IS the canonical worth, the disjoint tile/resource economy sells resources). So
## the React `value` factor maps to sell_price here:
##
##   • Resource order reward = max(20, qty × value × 6)   (React: max(20, need×value×6))
##   • Crafted-good reward    = round(qty × value × 1.5)   (React: round(need×value×1.5))
##
## The ×6 resource multiplier keeps orders well above a raw Market sale (×1), so
## filling an order still strictly beats selling — the coin-sink incentive. The
## crafted ×1.5 is lower because crafted goods already carry a far higher sell_price
## (the refining premium), so a smaller multiple still pays handsomely.
##
## CRAFTED-GOOD POOL GATING (React: level >= 3, 30% chance). The port's player-
## progression signal is the ALMANAC LEVEL (GameState.almanac_level, the XP ladder
## that already gates recipes/expeditions) — the closest analogue to React's
## `state.level`. So crafted-good orders appear only at almanac level 3+, with a
## 30% per-roll chance; below level 3 every order is a plain resource order.
##
## QUANTITY SCALING (React: baseNeed + rand + floor(level/3)*2 for resources; 1-3 for
## crafted). Ported below in qty_for / crafted_qty so a higher-level player gets
## larger (more valuable) resource orders.
##
## Registered as a `class_name` global (like MarketConfig / BuildingConfig) so its
## consts and helpers are reachable WITHOUT a live autoload — headless tests run
## before the scene tree exists. Stateless: never instantiated.

## How many orders are kept available at once (the board the player picks from).
const MAX_ORDERS: int = 3

## Reward multipliers over the resource's Market value (sell_price). A resource order
## pays value × qty × REWARD_MULT (the ×6 that makes orders the sink); a crafted-good
## order pays round(value × qty × CRAFTED_REWARD_MULT) (×1.5 over the already-premium
## crafted sell_price). Mirrors React's 6 and 1.5 factors.
const REWARD_MULT: int = 6
const CRAFTED_REWARD_MULT: float = 1.5
## Floor on a resource order's reward (React: max(20, …)), so a cheap-resource order
## still pays a worthwhile coin lump.
const MIN_RESOURCE_REWARD: int = 20

## Almanac level at which crafted-good orders begin to appear, and the per-roll chance
## (React: level >= 3, 30%). The port's progression signal is GameState.almanac_level.
const CRAFTED_ORDER_LEVEL: int = 3
const CRAFTED_ORDER_CHANCE: float = 0.30

## Resource-order quantity (React baseNeed): a cheap resource (value < 3) asks for a
## bigger base batch (8) than a valuable one (4); the rest is a small random spread plus
## a level ramp (+2 per 3 levels). `roll01` and `roll_small` are [0,1) draws from the
## caller's seeded RNG so generation stays reproducible; `level` is the almanac level.
##   need = baseNeed + floor(roll_small × 4) + floor(level / 3) × 2
static func qty_for(value: int, level: int, roll_small: float) -> int:
	var base_need: int = 8 if value < 3 else 4
	var spread: int = int(floor(clampf(roll_small, 0.0, 0.999999) * 4.0))   # 0..3
	var level_ramp: int = (maxi(1, level) / 3) * 2
	return base_need + spread + level_ramp

## Crafted-good quantity (React: 1 + floor(rand × 3) → 1..3). `roll01` is a [0,1) draw.
static func crafted_qty(roll01: float) -> int:
	return 1 + int(floor(clampf(roll01, 0.0, 0.999999) * 3.0))

# ── Static helpers (usable without an instance) ──────────────────────────────

## Coins paid for filling a RESOURCE order of `qty` units of `resource` (T19 value-scaled).
## = max(MIN_RESOURCE_REWARD, sell_price(resource) × qty × REWARD_MULT). A zero-Market-price
## resource still pays the MIN_RESOURCE_REWARD floor (no free / negative orders).
static func reward_for(resource: String, qty: int) -> int:
	var value: int = MarketConfig.sell_price(resource)
	return maxi(MIN_RESOURCE_REWARD, value * qty * REWARD_MULT)

## Coins paid for filling a CRAFTED-GOOD order of `qty` units of `good` (T19).
## = round(sell_price(good) × qty × CRAFTED_REWARD_MULT), floored at 1 so an unpriced
## good still pays something.
static func crafted_reward_for(good: String, qty: int) -> int:
	var value: int = MarketConfig.sell_price(good)
	return maxi(1, int(round(float(value) * float(qty) * CRAFTED_REWARD_MULT)))

## The crafted-GOOD order pool: every KIND_GOOD recipe output that is Market-sellable
## (so its value-scaled reward is meaningful). Mirrors React craftedOrderPoolForBiome,
## which draws crafted resources from RECIPES by station; the port draws every craftable
## GOOD (the port's recipe catalog is already biome-spanning), filtered to sellable
## outputs. Deduplicated, in a stable order. Tools (KIND_TOOL) are excluded — they are
## not inventory resources and not market-traded.
static func crafted_order_pool() -> Array:
	var out: Array = []
	for rid in RecipeConfig.RECIPES.keys():
		if RecipeConfig.recipe_output_kind(rid) != RecipeConfig.KIND_GOOD:
			continue
		var good: String = RecipeConfig.recipe_output(rid)
		if good == "" or out.has(good):
			continue
		if not MarketConfig.can_sell(good):
			continue   # an unsellable good has no value → skip (keeps rewards meaningful)
		out.append(good)
	return out
