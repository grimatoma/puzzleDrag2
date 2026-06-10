class_name NpcConfig
extends RefCounted
## NPC roster + bonding model — ported from the React npcs feature
## (src/features/npcs/data.ts + bond.ts and src/constants.ts NPCS). Pure data +
## stateless helpers: the 5-NPC roster and the 0–10 bond → reward-multiplier band
## table. Orders attach an NPC (GameState.generate_order); filling one pays a
## bond-ADJUSTED reward (reward_with_bond) and raises that NPC's bond.
##
## Registered as a `class_name` global (like OrderConfig / MarketConfig) so its
## consts and helpers are reachable WITHOUT a live autoload — headless tests run
## before the scene tree exists. Stateless: never instantiated.
##
## BOND MODEL (authoritative React source, bond.ts). Bond is a float in [0, 10].
## The default starting bond is 5.0 → "Warm" → ×1.00, so a fresh order's payout is
## IDENTICAL to the flat reward until a bond crosses into Liked (≥7) or Sour (<5).
## bond_modifier floors the bond (matching React's Math.floor) before banding.

## The 5 NPCs, each {id, name, role, color, loves, likes}. Ported from src/constants.ts NPCS
## (name/role/look.color) cross-referenced with the React roster ids/roles:
## wren=Scout, mira=Baker, tomas=Beekeeper, bram=Smith, liss=Physician.
##
## GIFT PREFERENCES (T18, ported from src/features/npcs/data.ts NPC_RAW `loves`/`likes`).
## Each NPC has `loves` (big bond gain, GIFT_LOVES) and `likes` (medium, GIFT_LIKES);
## everything else is "neutral" (small, GIFT_NEUTRAL). Gifts are CONSUMED from inventory,
## so every preference key here MUST be an inventory RESOURCE (the port's disjoint
## tile/resource invariant — see CLAUDE.md: tiles never enter inventory). React's prefs
## mix resources with a few `tile_*` keys (its inventory holds tile counts); the port
## REMAPS those tile keys to the equivalent inventory RESOURCE so the gift is actually
## giftable:
##   tile_fruit_blackberry → jam        (blackberries are cooked down into jam — the
##                                        produced resource the port stocks; the raw
##                                        berry tile never enters the port inventory)
##   tile_mine_coal        → coke       (coal → coke, the refined mine fuel resource)
##   tile_mine_stone       → block      (stone → block, the cut-stone resource)
##   tile_mine_iron_ore    → iron_bar   (ore → bar, the smelted resource)
##   tile_tree_oak         → plank      (oak → plank, the milled resource)
## Resource-valued prefs (flour, bread, honey, jam, iron_bar, soup, plank) carry over
## verbatim; a remap that collides with an existing pref in the same tier is dropped
## (wren's oak→plank is already in `loves`, so wren's `likes` keeps only bread; liss's
## blackberry→jam is already in `loves`, so liss `loves` is just jam). The bond DELTAS
## (loves/likes/neutral) are GIFT_* below.
const NPCS: Array = [
	{ "id": "wren",  "name": "Wren",        "role": "Scout",     "color": "#4f6b3a",
		"loves": ["plank", "iron_bar"], "likes": ["bread"] },
	{ "id": "mira",  "name": "Mira",        "role": "Baker",     "color": "#d6612a",
		"loves": ["flour", "bread"], "likes": ["honey", "jam"] },
	{ "id": "tomas", "name": "Old Tomas",   "role": "Beekeeper", "color": "#c8923a",
		"loves": ["jam", "honey"], "likes": ["bread"] },
	{ "id": "bram",  "name": "Bram",        "role": "Smith",     "color": "#5a6973",
		"loves": ["iron_bar", "coke"], "likes": ["block"] },
	{ "id": "liss",  "name": "Sister Liss", "role": "Physician", "color": "#8d3a5c",
		"loves": ["jam"], "likes": ["honey", "soup"] },
]

## Per-tier bond gain for a gift (React GIFT_DELTAS, src/features/npcs/bond.ts:10):
## loved +0.5, liked +0.3, neutral +0.15. Applied by GameState.give_gift, clamped to
## [0, 10]. A gift is once-per-season per NPC (NpcState gift cooldown).
const GIFT_LOVES: float = 0.5
const GIFT_LIKES: float = 0.3
const GIFT_NEUTRAL: float = 0.15

## Bond-economy tuning — the canonical home for the scattered bond magic numbers
## (React src/features/npcs/bond.ts + data.ts). NpcState / GameState reference these by
## name instead of repeating the literals.
##   DEFAULT_BOND        the "Warm" starting bond (×1.00) AND the decay floor. A fresh
##                       order pays IDENTICALLY to the flat reward at this bond.
##   BOND_MIN / BOND_MAX the clamp range every bond mutation respects (React bond is [0, 10]).
const DEFAULT_BOND: float = 5.0
const BOND_MIN: float = 0.0
const BOND_MAX: float = 10.0
## Bond gained each time an order from that NPC is filled (+0.3 per React bond.ts).
const BOND_GAIN_PER_FILL: float = 0.3
## Fallback NPC for an old save's order missing its `npc` field (defensive; React falls
## back to the scout). Used by GameState.generate_order / NpcState consumers.
const DEFAULT_ORDER_NPC: String = "wren"
## Per-season bond decay step for bonds above Warm (React decayBond: `Math.max(5, b - 0.1)`).
const BOND_DECAY_STEP: float = 0.1
## Run-summary "significant move" threshold — a per-NPC bond delta below this is dropped
## from the run recap (React diffBonds, runSummary slice.ts: |d| >= 0.05).
const BOND_DELTA_EPSILON: float = 0.05

## Bond → reward-multiplier bands (React BOND_BANDS, bond.ts). The floored bond is
## clamped to [1, 10] before banding (a 0 reads as Sour, like React). Each band is
## {lo, hi, name, mult}; the table covers 1..10 with no gaps.
const BOND_BANDS: Array = [
	{ "lo": 1, "hi": 4,  "name": "Sour",    "mult": 0.70 },
	{ "lo": 5, "hi": 6,  "name": "Warm",    "mult": 1.00 },
	{ "lo": 7, "hi": 8,  "name": "Liked",   "mult": 1.15 },
	{ "lo": 9, "hi": 10, "name": "Beloved", "mult": 1.25 },
]

# ── Static helpers (usable without an instance) ──────────────────────────────

## Clamp a bond value into the canonical [BOND_MIN, BOND_MAX] range. Every bond write
## (NpcState.gain / from_dict, bond_band) routes through this so the range lives in one place.
static func clamp_bond(b: float) -> float:
	return clampf(b, BOND_MIN, BOND_MAX)

## Every NPC id, in roster order.
static func all_ids() -> Array:
	var out: Array = []
	for n in NPCS:
		out.append(String(n["id"]))
	return out

## True when `id` names a real NPC.
static func has(id: String) -> bool:
	for n in NPCS:
		if String(n["id"]) == id:
			return true
	return false

## Display name for `id` (e.g. "Old Tomas"), or "" for an unknown id.
static func display_name(id: String) -> String:
	for n in NPCS:
		if String(n["id"]) == id:
			return String(n["name"])
	return ""

## Role for `id` (e.g. "Baker"), or "" for an unknown id.
static func role(id: String) -> String:
	for n in NPCS:
		if String(n["id"]) == id:
			return String(n["role"])
	return ""

## The roster avatar tint for `id` as a Color (the hex string in ROSTER parsed via
## Godot 4's Color(hex) ctor — e.g. mira → Color("#d6612a")). Returns a neutral
## muted ink for an unknown id so an order whose `npc` isn't a real roster member
## still renders a sensible avatar instead of black/transparent.
static func color(id: String) -> Color:
	for n in NPCS:
		if String(n["id"]) == id:
			return Color(String(n["color"]))
	return Color("#7a5e3f")   # Palette.INK_MID — neutral fallback

## The raw NPC entry for `id` (a reference into NPCS), or {} for an unknown id.
static func entry(id: String) -> Dictionary:
	for n in NPCS:
		if String(n["id"]) == id:
			return n
	return {}

## The list of resource keys `id` LOVES (big gift bond gain), or [] for an unknown id.
static func loves_of(id: String) -> Array:
	var e: Dictionary = entry(id)
	var l: Variant = e.get("loves", [])
	return (l as Array) if l is Array else []

## The list of resource keys `id` LIKES (medium gift bond gain), or [] for an unknown id.
static func likes_of(id: String) -> Array:
	var e: Dictionary = entry(id)
	var l: Variant = e.get("likes", [])
	return (l as Array) if l is Array else []

## Which preference tier `resource` falls in for `npc_id`: "loves" | "likes" | "neutral".
## Mirrors React giftTier (src/features/npcs/bond.ts:29): loves wins over likes wins over
## neutral; an unknown NPC (or a resource in neither list) is "neutral".
static func gift_tier(npc_id: String, resource: String) -> String:
	if loves_of(npc_id).has(resource):
		return "loves"
	if likes_of(npc_id).has(resource):
		return "likes"
	return "neutral"

## The bond delta for a gift of preference `tier` ("loves" | "likes" | else neutral).
## React GIFT_DELTAS (bond.ts:10): loved +0.5, liked +0.3, neutral +0.15.
static func gift_delta(tier: String) -> float:
	match tier:
		"loves":
			return GIFT_LOVES
		"likes":
			return GIFT_LIKES
		_:
			return GIFT_NEUTRAL

## The bond band {name, mult} for a bond value. Mirrors React bondBand: clamp the
## bond to [0, 10], floor it, clamp that to [1, 10], then find the covering band.
## Falls back to the first band (Sour) if somehow nothing matches.
static func bond_band(bond: float) -> Dictionary:
	var clamped: float = clamp_bond(bond)
	var b: int = clampi(int(floor(clamped)), 1, 10)
	for band in BOND_BANDS:
		if b >= int(band["lo"]) and b <= int(band["hi"]):
			return { "name": String(band["name"]), "mult": float(band["mult"]) }
	var first: Dictionary = BOND_BANDS[0]
	return { "name": String(first["name"]), "mult": float(first["mult"]) }

## The reward multiplier for a bond value (the band's `mult`).
static func bond_modifier(bond: float) -> float:
	return float(bond_band(bond)["mult"])

## A base reward scaled by the bond multiplier, rounded to an int. At the default
## bond 5.0 (Warm, ×1.00) this equals base_reward exactly — the additive guarantee
## that fresh orders pay identically to the pre-bonding economy.
static func reward_with_bond(base_reward: int, bond: float) -> int:
	return int(round(float(base_reward) * bond_modifier(bond)))
