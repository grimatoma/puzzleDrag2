class_name NpcConfig
extends Node
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

## The 5 NPCs, each {id, name, role, color}. Ported from src/constants.ts NPCS
## (name/role/look.color) cross-referenced with the React roster ids/roles:
## wren=Scout, mira=Baker, tomas=Beekeeper, bram=Smith, liss=Physician.
const NPCS: Array = [
	{ "id": "wren",  "name": "Wren",        "role": "Scout",     "color": "#4f6b3a" },
	{ "id": "mira",  "name": "Mira",        "role": "Baker",     "color": "#d6612a" },
	{ "id": "tomas", "name": "Old Tomas",   "role": "Beekeeper", "color": "#c8923a" },
	{ "id": "bram",  "name": "Bram",        "role": "Smith",     "color": "#5a6973" },
	{ "id": "liss",  "name": "Sister Liss", "role": "Physician", "color": "#8d3a5c" },
]

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

## The bond band {name, mult} for a bond value. Mirrors React bondBand: clamp the
## bond to [0, 10], floor it, clamp that to [1, 10], then find the covering band.
## Falls back to the first band (Sour) if somehow nothing matches.
static func bond_band(bond: float) -> Dictionary:
	var clamped: float = clampf(bond, 0.0, 10.0)
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
