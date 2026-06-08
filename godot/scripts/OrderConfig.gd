class_name OrderConfig
extends RefCounted
## Order generation tuning — the Direction spec's order / coin-sink loop. An NPC
## requests a quantity of a resource; delivering it from inventory pays a coin
## reward that BEATS selling the same goods at the Market (the REWARD_MULT
## incentive), so orders are the canonical reason to refine and stockpile rather
## than dump everything at the Market.
##
## Values are PC2-aligned FIRST-PASS — chosen so an order reliably out-earns a
## raw Market sale of identical goods. They are tunable: edit the consts here.
##
## Registered as a `class_name` global (like MarketConfig / BuildingConfig) so its
## consts and helpers are reachable WITHOUT a live autoload — headless tests run
## before the scene tree exists. Stateless: never instantiated.

## How many orders are kept available at once (the board the player picks from).
const MAX_ORDERS: int = 3
## Requested quantity range, inclusive. An order asks for [MIN_QTY, MAX_QTY] units.
const MIN_QTY: int = 3
const MAX_QTY: int = 8
## Reward multiplier over the raw Market sale: an order pays
## sell_price(resource) * qty * REWARD_MULT, so filling one always beats selling
## the same goods at the Market (the 3× incentive that makes orders the sink).
const REWARD_MULT: int = 3

# ── Static helpers (usable without an instance) ──────────────────────────────

## Coins paid for filling an order of `qty` units of `resource`. Floors at 1 so a
## zero-Market-price resource still pays something (no free / negative orders).
static func reward_for(resource: String, qty: int) -> int:
	return maxi(1, MarketConfig.sell_price(resource) * qty * REWARD_MULT)
