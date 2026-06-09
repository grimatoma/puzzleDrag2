class_name MarketConfig
extends RefCounted
## Market price tables + dynamic price drift — the sell/buy economy from the
## locked Direction spec ("the refined economy is spent to grow the town").
## The Market lets the player sell collected resources for coins and buy
## resources back at a markup.
##
## Prices are PC2-derived FIRST-PASS values lifted from the game's Balance
## baseline page (the source-of-truth for tuning). SELL is the coins-per-unit a
## player earns; BUY is the coins-per-unit a player pays — buy prices carry a
## markup over sell so the Market is a sink, not an arbitrage loop. They are
## tunable: edit SELL / BUY.
##
## T16: Dynamic pricing (ported from src/market.ts).
##   • MARKET_EVENTS — 4 seasonal economic events with per-resource multipliers.
##   • rand(seed, season, salt) — deterministic 32-bit hash → [0, 1). Exact
##     bit-math port of the React implementation.
##   • pick_market_event(seed, season) → event dict or {} (40% chance).
##   • drift_prices(seed, season, event) → {key:{buy,sell}} drifted table.
##
## RESOURCE REMAP (T16 adaptation): React's event mults target TILE keys
## (tile_tree_oak, tile_grass_grass, tile_grain_wheat, tile_mine_iron_ore,
## tile_mine_gem) because React's inventory holds tile counts. The Godot port
## sells RESOURCES (disjoint tile/resource invariant — see CLAUDE.md), so the
## mults are remapped to the produced resources:
##   tile_tree_oak      → plank        (oak → plank)
##   tile_grass_grass   → hay_bundle   (grass → hay_bundle)
##   tile_grain_wheat   → flour        (wheat → flour)
##   tile_mine_iron_ore → iron_bar     (ore → bar)
##   tile_mine_gem      → cut_gem      (raw gem → cut gem)
## Same labels, descriptions, and ×multipliers; only the keys change.
## "Sell raw board tiles" is NOT portable and is skipped — the port's inventory
## has no tile counts (the disjoint tile/resource invariant).
##
## Registered as a `class_name` global (like BuildingConfig / Constants) so its
## consts and helpers are reachable WITHOUT a live autoload — headless tests run
## before the scene tree exists. Stateless: never instantiated.

## Coins earned per unit SOLD. A resource absent from this table is not sellable.
const SELL: Dictionary = {
	"hay_bundle": 1,
	"flour": 2,
	"plank": 5,
	"eggs": 12,
	"soup": 20,
	"bread": 5,
	"pie": 25,
	"honey": 40,
	"meat": 21,
	"milk": 30,
	"horseshoe": 60,
	# Mine goods (M3f). supplies is NOT market-traded — it's a Kitchen-only
	# intermediate spent as mine turns, so it's intentionally absent from SELL/BUY.
	"block": 10,
	"iron_bar": 11,
	"coke": 40,
	"cut_gem": 60,
	"dirt": 1,
	# Full tile-catalog parity (new produced resources). Prices lifted from the web
	# MARKET table (src/constants.ts): jam sell 5, copper_bar sell 8, gold_bar sell 16.
	"jam": 5,
	"copper_bar": 8,
	"gold_bar": 16,
	# ── T15 crafted-good sell prices ───────────────────────────────────────────
	# Every NEW craftable GOOD from the full crafting catalog is sellable (a craftable
	# good you can't sell would be only half-real). Values are lifted VERBATIM from the
	# web MARKET table (src/constants.ts:1043-1056) where it lists a pair; the Bakery/
	# Larder/Forge goods that the web prices only via ITEMS[key].value (src/constants.ts:
	# 559-575) use that value as the sell price (buy is the value × ~4, the port's markup).
	# These scale with input cost, matching the React economy.
	# Bakery (value-priced; honeyroll/harvestpie 175, festival_loaf 60, wedding_pie 180).
	"honeyroll": 175,
	"harvestpie": 175,
	"festival_loaf": 60,
	"wedding_pie": 180,
	# Larder (preserve/tincture value-priced; chowder from the MARKET table sell 280).
	"preserve": 100,
	"tincture": 125,
	"chowder": 280,
	# Forge (all value-priced).
	"iron_hinge": 175,
	"cobblepath": 200,
	"lantern": 150,
	"goldring": 225,
	"gemcrown": 325,
	"ironframe": 275,
	"stonework": 300,
	# Kitchen (iron_ration from the MARKET table sell 120). SUPPLIES stays UNSELLABLE —
	# it is a Kitchen-only intermediate spent as mine turns (deliberately absent here).
	"iron_ration": 120,
	# Smokehouse (cured_meat from the MARKET table sell 45).
	"cured_meat": 45,
	# Workshop GOOD (fish_oil_bottled from the MARKET table sell 80; the rest of the
	# Workshop catalog outputs TOOLS, which are not market-traded).
	"fish_oil_bottled": 80,
}

## Coins paid per unit BOUGHT. A resource absent from this table is not buyable.
const BUY: Dictionary = {
	"hay_bundle": 40,
	"flour": 30,
	"plank": 40,
	"eggs": 80,
	"soup": 220,
	"bread": 60,
	"pie": 240,
	"honey": 400,
	"meat": 240,
	"milk": 300,
	"horseshoe": 400,
	# Mine goods (M3f). supplies is not buyable (Kitchen-only intermediate).
	"block": 80,
	"iron_bar": 100,
	"coke": 260,
	"cut_gem": 600,
	"dirt": 40,
	# Full tile-catalog parity (new produced resources). Buy prices lifted from the web
	# MARKET table (src/constants.ts): jam buy 90, copper_bar buy 120, gold_bar buy 240.
	"jam": 90,
	"copper_bar": 120,
	"gold_bar": 240,
	# ── T15 crafted-good buy prices ────────────────────────────────────────────
	# Pair every NEW sellable crafted good with a buy price so the Market stays a sink
	# (buy > sell). Web MARKET-table pairs (chowder 2400, iron_ration 1200, cured_meat 400,
	# festival_loaf 600, wedding_pie 1800, fish_oil_bottled 600) are lifted verbatim; the
	# value-priced goods use sell × 4 (the port's standard markup). SUPPLIES stays UNBUYABLE
	# (Kitchen-only intermediate, deliberately absent).
	"honeyroll": 700,
	"harvestpie": 700,
	"festival_loaf": 600,
	"wedding_pie": 1800,
	"preserve": 400,
	"tincture": 500,
	"chowder": 2400,
	"iron_hinge": 700,
	"cobblepath": 800,
	"lantern": 600,
	"goldring": 900,
	"gemcrown": 1300,
	"ironframe": 1100,
	"stonework": 1200,
	"iron_ration": 1200,
	"cured_meat": 400,
	"fish_oil_bottled": 600,
}

# ── T16: Market events (src/market.ts MARKET_EVENTS) ─────────────────────────
## The 4 seasonal economic events. Each entry is a Dictionary:
##   { "id", "label", "desc", "mults": {resource_key: float} }
##
## RESOURCE REMAP (see file header): React keys are TILE keys; port keys are the
## produced RESOURCE keys. E.g. tile_tree_oak → plank, tile_grass_grass →
## hay_bundle, tile_grain_wheat → flour, tile_mine_iron_ore → iron_bar,
## tile_mine_gem → cut_gem.
const MARKET_EVENTS: Array = [
	{
		"id": "wood_shortage",
		"label": "Wood Shortage",
		"desc": "Timber supplies are low. Planks are worth double!",
		# React: { tile_tree_oak: 2, plank: 2 } — oak (tile) remapped to plank (resource);
		# the plank×2 entry is retained (it was already a resource key in React).
		"mults": { "plank": 2.0 },
	},
	{
		"id": "bumper_crop",
		"label": "Bumper Crop",
		"desc": "The fields are overflowing. Hay and Flour prices have crashed.",
		# React: { tile_grass_grass: 0.5, tile_grain_wheat: 0.5 }
		# → hay_bundle and flour (the produced resources).
		"mults": { "hay_bundle": 0.5, "flour": 0.5 },
	},
	{
		"id": "iron_rush",
		"label": "Iron Rush",
		"desc": "The King's army is buying iron. Ingot prices are soaring!",
		# React: { tile_mine_iron_ore: 2.5 } → iron_bar (smelted bar).
		"mults": { "iron_bar": 2.5 },
	},
	{
		"id": "gem_fever",
		"label": "Gem Fever",
		"desc": "A rich merchant is in town. Gems are trading at a premium.",
		# React: { tile_mine_gem: 1.8 } → cut_gem.
		"mults": { "cut_gem": 1.8 },
	},
]

# ── T16: Deterministic 32-bit hash → [0, 1) ───────────────────────────────────
## Port of src/market.ts `rand(seed, season, salt)`.
## GDScript uses 64-bit integers by default; every intermediate result is masked
## with `& 0xFFFFFFFF` to emulate JavaScript's unsigned-right-shift (>>>) and
## keep the 32-bit unsigned domain, then divided by 2^32 to land in [0, 1).
static func rand(seed: int, season: int, salt: int) -> float:
	var x: int = (seed ^ (season * 73856093) ^ (salt * 19349663)) & 0xFFFFFFFF
	x = ((x ^ ((x >> 16) & 0xFFFF)) * 0x85ebca6b) & 0xFFFFFFFF
	x = ((x ^ ((x >> 13) & 0x0007FFFF)) * 0xc2b2ae35) & 0xFFFFFFFF
	x = (x ^ ((x >> 16) & 0xFFFF)) & 0xFFFFFFFF
	return float(x) / 4294967296.0

# ── T16: Pick a market event for (seed, season) ───────────────────────────────
## Port of src/market.ts `pickMarketEvent(seed, season)`.
## 40% chance of an event (roll ≤ 0.40); otherwise returns {}.
## Event index = floor(rand(..., 888) × 4), picking one of the 4 MARKET_EVENTS.
## Returns the full event dict (id/label/desc/mults) or {} when no event.
static func pick_market_event(seed: int, season: int) -> Dictionary:
	var roll: float = rand(seed, season, 999)
	if roll > 0.40:
		return {}
	var idx: int = int(floor(rand(seed, season, 888) * float(MARKET_EVENTS.size())))
	idx = clampi(idx, 0, MARKET_EVENTS.size() - 1)
	return (MARKET_EVENTS[idx] as Dictionary).duplicate(true)

# ── T16: Compute drifted prices for a season ─────────────────────────────────
## Port of src/market.ts `driftPrices(seed, season, event)`.
## Iterates SELL/BUY in stable key order (SELL drives the keys — every sellable
## resource has a base sell; BUY provides the base buy for buyable resources).
## Per key:
##   buyMul  = 0.85 + rand(seed, season, salt++) × 0.30   → [0.85, 1.15)
##   sellMul = 0.85 + rand(seed, season, salt++) × 0.30
##   if event and event.mults has this key → ×= event.mults[key]
##   buy  = max(1, round(base_buy  × buyMul))
##   sell = max(0, round(base_sell × sellMul))
## Returns { resource_key: { "buy": int, "sell": int } } for every key in SELL.
## Keys NOT in SELL have no entry (they're not market-traded). Keys in SELL but
## not in BUY get base_buy = 0 (no buy price — e.g. if a sell-only good is added
## later), but the sell drift still applies.
## `event` may be {} (no event) — safe to pass pick_market_event's output directly.
static func drift_prices(seed: int, season: int, event: Dictionary = {}) -> Dictionary:
	var out: Dictionary = {}
	var salt: int = 0
	# Use SELL.keys() as the canonical key order (all market-tradeable resources).
	for k in SELL.keys():
		var base_sell: int = int(SELL.get(k, 0))
		var base_buy: int = int(BUY.get(k, 0))
		var buy_mul: float = 0.85 + rand(seed, season, salt) * 0.30
		salt += 1
		var sell_mul: float = 0.85 + rand(seed, season, salt) * 0.30
		salt += 1
		# Apply event multiplier (only when the event targets this resource key).
		var mults: Dictionary = (event.get("mults", {}) as Dictionary)
		if mults.has(k):
			var m: float = float(mults[k])
			buy_mul *= m
			sell_mul *= m
		var drifted_buy: int = maxi(1, int(round(float(base_buy) * buy_mul)))
		var drifted_sell: int = maxi(0, int(round(float(base_sell) * sell_mul)))
		out[k] = { "buy": drifted_buy, "sell": drifted_sell }
	return out

# ── Static helpers (usable without an instance) ──────────────────────────────

## Coins earned per unit when selling `res` (0 when not sellable).
## Falls back to the FLAT BASE price — callers that have live `market_prices`
## should read `game.live_sell_price(res)` instead for the drifted price.
static func sell_price(res: String) -> int:
	return int(SELL.get(res, 0))

## Coins paid per unit when buying `res` (0 when not buyable).
## Falls back to the FLAT BASE price — callers that have live `market_prices`
## should read `game.live_buy_price(res)` instead for the drifted price.
static func buy_price(res: String) -> int:
	return int(BUY.get(res, 0))

## True when `res` can be sold at the Market.
static func can_sell(res: String) -> bool:
	return SELL.has(res)

## True when `res` can be bought at the Market.
static func can_buy(res: String) -> bool:
	return BUY.has(res)

## Every sellable resource key (SELL keys), as an Array.
static func sellable_resources() -> Array:
	return SELL.keys()

## Every buyable resource key (BUY keys), as an Array.
static func buyable_resources() -> Array:
	return BUY.keys()
