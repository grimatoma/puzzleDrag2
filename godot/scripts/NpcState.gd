class_name NpcState
extends RefCounted
## The NPC roster + per-NPC bonding state — extracted from GameState as a composed
## domain object (the same pattern as Settlement / StoryState). GameState owns one of
## these (var npcs_state) and exposes the legacy flat `npcs` Dictionary through a
## property getter so every reader (TownsfolkScreen, tools, tests, …) keeps working
## unchanged. Ported from the React npcs feature (src/features/npcs/data.ts + bond.ts).
##
## DATA
##   roster: Array  — the NPC ids in play (NpcConfig.all_ids() by default).
##   bonds:  Dict   — id:String -> bond:float in [0, 10]. Default 5.0 (Warm, ×1.00).
##
## Every order is REQUESTED by an NPC; filling it pays a bond-ADJUSTED reward
## (NpcConfig.reward_with_bond) and raises that NPC's bond by BOND_GAIN_PER_FILL. The
## default bond 5.0 keeps payouts identical to the pre-bonding flat reward until a bond
## crosses into Liked (>=7) or Sour (<5) — so this layer is additive.
##
## SAVE SHAPE: the persisted form is the same flat {"roster": …, "bonds": …} Dictionary
## GameState emitted under the top-level "npcs" key before the extraction. to_dict()
## returns exactly that; from_dict() rebuilds it (defensively for old saves).

## Bond gained each time an order from that NPC is filled (+0.3 per React bond.ts).
const BOND_GAIN_PER_FILL: float = 0.3
## Fallback NPC for an old save's order missing its `npc` field (defensive).
const DEFAULT_ORDER_NPC: String = "wren"

## The legacy flat {"roster": Array, "bonds": Dictionary} form IS the single backing store,
## so GameState's `npcs` getter hands back THIS exact dict (a stable live reference). That
## makes EVERY mutation pattern the pre-extraction plain `npcs` Dictionary supported write
## straight through: in-place (`game.npcs["bonds"][id] = …`) AND wholesale-key reassignment
## (`game.npcs["bonds"] = …`). `roster`/`bonds` below are live views into this dict.
var data: Dictionary = {"roster": NpcConfig.all_ids(), "bonds": _default_bonds()}

## Live view of the roster Array (reads route into `data`).
var roster: Array:
	get:
		var r: Array = data["roster"]
		return r
## Live view of the bonds map (reads route into `data`).
var bonds: Dictionary:
	get:
		var b: Dictionary = data["bonds"]
		return b

## Build the starting bonds map: every roster NPC at the Warm default (5.0).
static func _default_bonds() -> Dictionary:
	var out: Dictionary = {}
	for id in NpcConfig.all_ids():
		out[id] = 5.0
	return out

## The legacy flat {"roster": …, "bonds": …} view — the SAME live dict GameState persists,
## so callers that mutate OR reassign keys on it (e.g. `game.npcs["bonds"] = bonds`) write
## straight through to this state. GameState's `npcs` property getter returns this.
func as_dict() -> Dictionary:
	return data

## Current bond for `id` (0..10 float). A missing/unknown id reads as the Warm default
## 5.0 so reward math never divides by a phantom band.
func bond(id: String) -> float:
	var b: Dictionary = data["bonds"]
	return float(b.get(id, 5.0))

## Adjust `id`'s bond by `amount` (may be negative), clamped to [0, 10]. Seeds a known
## id at the default first. Stores a float.
func gain(id: String, amount: float) -> void:
	var b: Dictionary = data["bonds"]
	b[id] = clampf(float(b.get(id, 5.0)) + amount, 0.0, 10.0)

## Plain-Dictionary snapshot for persistence — the SAME flat shape GameState emitted
## under the top-level "npcs" key before the extraction. Deep-copied so the snapshot is
## independent of this live state.
func to_dict() -> Dictionary:
	var r: Array = data["roster"]
	var b: Dictionary = data["bonds"]
	return {"roster": r.duplicate(true), "bonds": b.duplicate(true)}

## Rebuild from a snapshot, defensively. A missing/empty dict (any save written before
## npcs existed) yields the default roster (NpcConfig.all_ids) at the Warm default 5.0,
## so old saves load with neutral relationships. The roster keeps only REAL ids,
## de-duplicated; bonds keep only roster ids, coerced to float and clamped to [0, 10]
## (JSON yields floats; a corrupt out-of-range value can't break banding). Any roster id
## missing a saved bond defaults to 5.0.
static func from_dict(d: Dictionary) -> NpcState:
	var s := NpcState.new()
	if d == null or d.is_empty():
		return s
	var roster: Array = []
	var raw_roster: Variant = d.get("roster", [])
	if raw_roster is Array:
		for rid in raw_roster:
			var sid := String(rid)
			if NpcConfig.has(sid) and not roster.has(sid):
				roster.append(sid)
	if roster.is_empty():
		roster = NpcConfig.all_ids()
	var bonds: Dictionary = {}
	var raw_bonds: Variant = d.get("bonds", {})
	for id in roster:
		var v: float = 5.0
		if raw_bonds is Dictionary and raw_bonds.has(id):
			v = clampf(float(raw_bonds[id]), 0.0, 10.0)
		bonds[id] = v
	s.data = {"roster": roster, "bonds": bonds}
	return s
