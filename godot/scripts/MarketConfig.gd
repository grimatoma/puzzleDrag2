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
