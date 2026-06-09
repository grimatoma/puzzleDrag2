class_name BoonConfig
extends RefCounted
## Boon trees — ported VERBATIM from src/features/boons/data.ts (T31). After facing a
## settlement's keeper the player earns either Embers (Coexist) or Core Ingots (Drive Out).
## BOONS let them SPEND those currencies on permanent per-path perks that shape the run.
##
## One catalog per (settlement-type × path) combo, keyed `<type>_<path>` (farm_coexist, …):
## SIX catalogs, TWO boons each (12 total). Each boon:
##   id:     String     — stable boon id (DeerBlessing → "deer_blessing", …)
##   name:   String     — display name ("Deer-Blessing")
##   desc:   String     — player-facing flavour/effect text
##   cost:   Dictionary — { "embers": int } OR { "core_ingots": int }
##   effect: Dictionary — { "type": String, "mult": float }
##
## EFFECTS (exactly two channels, mirroring BOON_EFFECTS in data.ts):
##   "coin_gain_mult" — chain-collected coin reward × mult
##   "bond_gain_mult" — NPC bond gains (gifts + order-fill) × mult
##
## VISIBILITY (boon_is_unlocked): a boon is purchaseable when its PATH flag is set by ANY
## keeper, kingdom-wide (path-gated, not per-settlement) — i.e. ANY keeper_*_<path> flag is set.
## OWNERSHIP composes multiplicatively (boon_effect_mult). See GameState.purchase_boon for the
## BOON/PURCHASE parity (gated on unlocked + affordable + not-owned → deduct + own).
##
## Registered as a `class_name` global (like KeeperConfig / BossConfig / PortalConfig) so its
## const + static helpers are reachable WITHOUT a live autoload — headless tests run before the
## scene tree exists. Stateless: never instantiated.

## The two boon effect channels (mirrors BOON_EFFECTS in data.ts).
const COIN_GAIN_MULT: String = "coin_gain_mult"
const BOND_GAIN_MULT: String = "bond_gain_mult"

## The six boon catalogs, keyed `<type>_<path>`. Carried VERBATIM from data.ts.
const BOONS: Dictionary = {
	"farm_coexist": [
		{"id": "deer_blessing", "name": "Deer-Blessing", "desc": "The herd remembers your name. Villager bonds rise 20% faster.", "cost": {"embers": 3}, "effect": {"type": "bond_gain_mult", "mult": 1.2}},
		{"id": "hearth_thrift", "name": "Hearth-Thrift", "desc": "Bountiful seasons. Coin gains +15%.", "cost": {"embers": 8}, "effect": {"type": "coin_gain_mult", "mult": 1.15}},
	],
	"farm_driveout": [
		{"id": "iron_market", "name": "Iron Market", "desc": "Predictable trade. Coin gains +20%.", "cost": {"core_ingots": 5}, "effect": {"type": "coin_gain_mult", "mult": 1.2}},
		{"id": "drilled_corps", "name": "Drilled Corps", "desc": "Loyal villagers. Bond gains +10%.", "cost": {"core_ingots": 8}, "effect": {"type": "bond_gain_mult", "mult": 1.1}},
	],
	"mine_coexist": [
		{"id": "deep_friendship", "name": "Deep Friendship", "desc": "Underground company. Bond gains +15%.", "cost": {"embers": 5}, "effect": {"type": "bond_gain_mult", "mult": 1.15}},
		{"id": "vein_richness", "name": "Vein-Richness", "desc": "Generous earth. Coin gains +20%.", "cost": {"embers": 8}, "effect": {"type": "coin_gain_mult", "mult": 1.2}},
	],
	"mine_driveout": [
		{"id": "ingot_thrift", "name": "Ingot Thrift", "desc": "Efficient smelters. Coin gains +20%.", "cost": {"core_ingots": 5}, "effect": {"type": "coin_gain_mult", "mult": 1.2}},
		{"id": "foreman_drills", "name": "Foreman's Drills", "desc": "Bond gains +10%.", "cost": {"core_ingots": 8}, "effect": {"type": "bond_gain_mult", "mult": 1.1}},
	],
	"harbor_coexist": [
		{"id": "sailor_amity", "name": "Sailor's Amity", "desc": "Friends in every port. Bond gains +20%.", "cost": {"embers": 5}, "effect": {"type": "bond_gain_mult", "mult": 1.2}},
		{"id": "pearl_trove", "name": "Pearl Trove", "desc": "Lucky catches. Coin gains +15%.", "cost": {"embers": 8}, "effect": {"type": "coin_gain_mult", "mult": 1.15}},
	],
	"harbor_driveout": [
		{"id": "harbor_tariff", "name": "Harbor Tariff", "desc": "Tax on all comings. Coin gains +25%.", "cost": {"core_ingots": 5}, "effect": {"type": "coin_gain_mult", "mult": 1.25}},
		{"id": "press_gang", "name": "Press-Gang", "desc": "Conscripted crews. Bond gains +5%.", "cost": {"core_ingots": 8}, "effect": {"type": "bond_gain_mult", "mult": 1.05}},
	],
}

## Stable iteration order of the catalog keys (matches data.ts BOONS key order).
const CATALOG_KEYS: Array = [
	"farm_coexist", "farm_driveout",
	"mine_coexist", "mine_driveout",
	"harbor_coexist", "harbor_driveout",
]

# ── Static helpers (port of data.ts allBoons / boonById / boonIsUnlocked / …) ─────

## Every boon as a flat list (deep COPIES) with its `catalog_key` attached, in catalog order.
## (React allBoons.)
static func all_boons() -> Array:
	var out: Array = []
	for ck in CATALOG_KEYS:
		for b in (BOONS[ck] as Array):
			var copy: Dictionary = (b as Dictionary).duplicate(true)
			copy["catalog_key"] = ck
			out.append(copy)
	return out

## Total number of boons across all catalogs (12).
static func count() -> int:
	var n: int = 0
	for ck in CATALOG_KEYS:
		n += (BOONS[ck] as Array).size()
	return n

## The boons in one catalog `catalog_key` (deep COPIES with `catalog_key` attached; [] for an
## unknown key).
static func catalog(catalog_key: String) -> Array:
	if not BOONS.has(catalog_key):
		return []
	var out: Array = []
	for b in (BOONS[catalog_key] as Array):
		var copy: Dictionary = (b as Dictionary).duplicate(true)
		copy["catalog_key"] = catalog_key
		out.append(copy)
	return out

## True when `catalog_key` names a real catalog.
static func has_catalog(catalog_key: String) -> bool:
	return BOONS.has(catalog_key)

## Look up a boon by its id across all catalogs (a deep COPY with `catalog_key` attached), or
## {} for an unknown id. (React boonById.)
static func boon_by_id(id: String) -> Dictionary:
	for ck in CATALOG_KEYS:
		for b in (BOONS[ck] as Array):
			if String((b as Dictionary).get("id", "")) == id:
				var copy: Dictionary = (b as Dictionary).duplicate(true)
				copy["catalog_key"] = ck
				return copy
	return {}

## True when `id` names a real boon.
static func has_boon(id: String) -> bool:
	return not boon_by_id(id).is_empty()

## Display name for boon `id` ("" for an unknown id).
static func boon_name(id: String) -> String:
	return String(boon_by_id(id).get("name", ""))

## The path component ("coexist" | "driveout") of catalog key `catalog_key` ("" if malformed).
## Catalog keys are `<type>_<path>`, and <type> never contains "_" (farm/mine/harbor), so the
## path is the substring after the LAST underscore.
static func path_of_catalog(catalog_key: String) -> String:
	var idx: int = catalog_key.rfind("_")
	if idx < 0:
		return ""
	return catalog_key.substr(idx + 1)

## The settlement-type component ("farm" | "mine" | "harbor") of `catalog_key` ("" if malformed).
static func type_of_catalog(catalog_key: String) -> String:
	var idx: int = catalog_key.rfind("_")
	if idx < 0:
		return ""
	return catalog_key.substr(0, idx)

## True when boon `boon` is UNLOCKED given the story `flags` map: its catalog PATH flag is set by
## ANY keeper, kingdom-wide. Mirrors React boonIsUnlocked: path is satisfied by ANY settlement of
## ANY type that chose this path (catalogs are split by type for narrative clarity; ownership is
## shared across the run). `boon` must be a boon dict carrying `catalog_key` (as from all_boons /
## boon_by_id). (React boonIsUnlocked.)
static func boon_is_unlocked(flags: Dictionary, boon: Dictionary) -> bool:
	var ck: String = String(boon.get("catalog_key", ""))
	var path: String = path_of_catalog(ck)
	if path == "":
		return false
	# Any keeper_*_<path> flag set anywhere → the path is unlocked kingdom-wide.
	for k in flags.keys():
		var ks: String = String(k)
		if ks.begins_with("keeper_") and ks.ends_with("_" + path) and bool(flags[k]):
			return true
	return false

## True when boon id `id` is unlocked given the story `flags` map (looks the boon up first).
static func boon_id_is_unlocked(flags: Dictionary, id: String) -> bool:
	var b: Dictionary = boon_by_id(id)
	if b.is_empty():
		return false
	return boon_is_unlocked(flags, b)

## True when `boon`'s cost can be paid from `embers` / `core_ingots`. (React canAffordBoon.)
static func can_afford(embers: int, core_ingots: int, boon: Dictionary) -> bool:
	var cost: Dictionary = boon.get("cost", {})
	if int(cost.get("embers", 0)) > embers:
		return false
	if int(cost.get("core_ingots", 0)) > core_ingots:
		return false
	return true

## True when boon id `id` is owned (present + truthy in the `owned` map). (React boonOwned.)
static func boon_owned(owned: Dictionary, id: String) -> bool:
	return bool(owned.get(id, false))

## The composed multiplier from OWNED boons whose `effect.type` matches `effect_type`. Defaults
## to 1.0 (no effect); when several owned boons share a type their multipliers COMPOSE (multiply).
## (React boonEffectMult.) `owned` is the { boon_id -> true } map.
static func boon_effect_mult(owned: Dictionary, effect_type: String) -> float:
	var mult: float = 1.0
	for id in owned.keys():
		if not bool(owned[id]):
			continue
		var b: Dictionary = boon_by_id(String(id))
		if b.is_empty():
			continue
		var eff: Dictionary = b.get("effect", {})
		if String(eff.get("type", "")) != effect_type:
			continue
		var m: float = float(eff.get("mult", 1.0))
		if m > 0.0:
			mult *= m
	return mult
