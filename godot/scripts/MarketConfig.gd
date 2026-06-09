class_name MarketConfig
extends RefCounted
## Market price tables — the sell/buy economy from the locked Direction spec
## ("the refined economy is spent to grow the town"). The Market lets the player
## sell collected resources for coins and buy resources back at a markup.
##
## Prices are PC2-derived FIRST-PASS values lifted from the game's Balance
## baseline page (the source-of-truth for tuning). SELL is the coins-per-unit a
## player earns; BUY is the coins-per-unit a player pays — buy prices carry a
## markup over sell so the Market is a sink, not an arbitrage loop. They are
## tunable: edit SELL / BUY.
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

# ── Static helpers (usable without an instance) ──────────────────────────────

## Coins earned per unit when selling `res` (0 when not sellable).
static func sell_price(res: String) -> int:
	return int(SELL.get(res, 0))

## Coins paid per unit when buying `res` (0 when not buyable).
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
