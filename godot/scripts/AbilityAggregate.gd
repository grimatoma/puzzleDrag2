class_name AbilityAggregate
extends RefCounted
## The unified ability-aggregation ENGINE — ported VERBATIM (semantics + channel math)
## from src/config/abilitiesAggregate.ts (emptyChannels / applyAbilityToChannels /
## aggregateAbilities). Walks a list of `sources` — each
##   { "abilities": Array[{id, params, trigger?}], "weight": float, "kind"?: String,
##     "source_id"?: String }
## — and folds every ability into the appropriate output CHANNEL. The returned channel
## object is the GDScript analogue of the React channels superset; GameState reads each
## field at its economy site (compute_ability_channels wires them in).
##
## PURE / headless: no Node, no signals, no GameState — every method is static so the
## engine is unit-testable before the scene tree exists. AbilityConfig is the id→trigger/
## channel catalog (the abilities.ts analogue) consulted via has_ability/get_ability.
##
## WEIGHT MODEL (src/features/workers/aggregate.ts):
##   workers   weight = hired_count / max_count  (PER_HIRE_DISCRETE abilities pre-multiply
##                                                amount by max_count so weight collapses
##                                                to amount*count)
##   buildings weight = 1
##   tiles     weight = 1 (active+discovered; passive/on_board_fill triggers only)
##
## NO-OP DEFAULT GUARANTEE: an EMPTY source list returns empty_channels() — every numeric
## channel 0, every map {}, board_preserve {} — so a fresh game (no ability buildings, no
## extra workers, default tiles) leaves every wired economy site BYTE-IDENTICAL.

## The full channel object — every consumer reads one of these keys. Mirrors
## emptyChannels (src/config/abilitiesAggregate.ts:20-64). board_preserve_biomes is a
## Dictionary-as-set (biome:String -> true) since GDScript has no first-class Set type.
static func empty_channels() -> Dictionary:
	return {
		"threshold_reduce": {},          # resource_key -> float
		"pool_weight": {},               # resource_key -> float (continuous; legacy Phase 4)
		"bonus_yield": {},               # tile_key -> float
		"season_bonus": {},              # resource_key (usually "coins") -> float
		"effective_pool_weights": {},    # resource_key -> int (floored per source)
		"hazard_spawn_reduce": {},       # hazard_id -> float (capped 1.0)
		"hazard_coin_multiplier": {},    # hazard_id -> float (>= 1)
		"chain_redirect": {},            # from_category -> {to_category, threshold, redirect_share}
		"recipe_input_reduce": {},       # recipe_id -> { input_key -> float }
		# Tile-derived channels (also read per-chain off the tile for the chain-time path).
		"free_moves": 0,                 # int
		"free_moves_if_chain": {},       # {} or { min_chain:int, count:int }
		"coin_bonus_flat": 0,            # int
		"coin_bonus_per_tile": 0,        # int
		# Building-only channels.
		"season_end_tools": {},          # tool_id -> int
		"season_end_pool_step": 0,       # int
		"board_preserve_biomes": {},     # biome:String -> true (Dictionary-as-set)
		"turn_budget_bonus": 0,          # int
		"inventory_cap_bonus": 0,        # int
	}

## Apply ONE ability instance into the channel object `out` (mutated in place). Ported
## case-for-case from applyAbilityToChannels (src/config/abilitiesAggregate.ts:110-280).
##   ability_id  the catalog id (validity is the caller's job; an unknown id is a no-op here)
##   params      the ability instance's params dict
##   weight      0..1 source weight (workers fractional; tiles/buildings 1)
##   ctx         optional context: { "species_by_category": { cat -> Array[{base_resource}] } }
## A weight <= 0 or an unknown id is a no-op (mirrors the early return at line 111).
static func apply_ability_to_channels(out: Dictionary, ability_id: String, params: Dictionary, weight: float, ctx: Dictionary = {}) -> void:
	if ability_id == "" or weight <= 0.0:
		return
	if not AbilityConfig.has_ability(ability_id):
		return
	var p: Dictionary = params if params != null else {}

	match ability_id:
		"threshold_reduce":
			var target: String = String(p.get("target", ""))
			var amount: float = float(p.get("amount", 0))
			if target == "" or amount <= 0.0:
				return
			out["threshold_reduce"][target] = float(out["threshold_reduce"].get(target, 0.0)) + amount * weight
		"threshold_reduce_category":
			var species: Array = ctx.get("species_by_category", {}).get(String(p.get("category", "")), [])
			var amt: float = float(p.get("amount", 0))
			if amt <= 0.0:
				return
			for sp in species:
				var k: String = String((sp as Dictionary).get("base_resource", ""))
				if k == "":
					continue
				out["threshold_reduce"][k] = float(out["threshold_reduce"].get(k, 0.0)) + amt * weight
		"pool_weight_legacy":
			var target2: String = String(p.get("target", ""))
			var amount2: float = float(p.get("amount", 0))
			if target2 == "" or amount2 <= 0.0:
				return
			out["pool_weight"][target2] = float(out["pool_weight"].get(target2, 0.0)) + amount2 * weight
		"pool_weight":
			var target3: String = String(p.get("target", ""))
			var amount3: float = float(p.get("amount", 0))
			if target3 == "" or amount3 <= 0.0:
				return
			# Per-source FLOOR (abilitiesAggregate.ts:147) — preserves the Phase 9 semantics where
			# a 1/2 hire of a +1 worker contributes 0, not 0.5. Tiles + buildings have weight 1 so
			# the floor is a no-op for them.
			var contribution: int = int(floor(amount3 * weight))
			if contribution > 0:
				out["effective_pool_weights"][target3] = int(out["effective_pool_weights"].get(target3, 0)) + contribution
		"bonus_yield":
			var bt: String = String(p.get("target", ""))
			var ba: float = float(p.get("amount", 0))
			if bt == "" or ba <= 0.0:
				return
			out["bonus_yield"][bt] = float(out["bonus_yield"].get(bt, 0.0)) + ba * weight
		"season_bonus":
			var resource: String = String(p.get("resource", "coins"))
			var sa: float = float(p.get("amount", 0))
			if sa <= 0.0:
				return
			out["season_bonus"][resource] = float(out["season_bonus"].get(resource, 0.0)) + sa * weight
		"recipe_input_reduce":
			var recipe: String = String(p.get("recipe", ""))
			var input: String = String(p.get("input", ""))
			var ra: float = float(p.get("amount", 0))
			if recipe == "" or input == "" or ra <= 0.0:
				return
			if not out["recipe_input_reduce"].has(recipe):
				out["recipe_input_reduce"][recipe] = {}
			out["recipe_input_reduce"][recipe][input] = float(out["recipe_input_reduce"][recipe].get(input, 0.0)) + ra * weight
		"chain_redirect_category":
			var from_cat: String = String(p.get("fromCategory", ""))
			var to_cat: String = String(p.get("toCategory", ""))
			var base_t: float = float(p.get("baseThreshold", 0))
			var min_t: float = float(p.get("minThreshold", 0))
			if from_cat == "" or to_cat == "" or base_t <= 0.0 or min_t <= 0.0:
				return
			# Effective threshold: linear from baseThreshold (weight=0) to minThreshold (weight=1).
			# Multiple workers redirecting the same category collapse to the lowest threshold.
			var eff: float = base_t - (base_t - min_t) * weight
			var prev: Dictionary = out["chain_redirect"].get(from_cat, {})
			if prev.is_empty() or eff < float(prev.get("threshold", INF)):
				out["chain_redirect"][from_cat] = {
					"to_category": to_cat,
					"threshold": eff,
					"redirect_share": weight,
				}
		"hazard_spawn_reduce":
			var hazard: String = String(p.get("hazard", ""))
			var ha: float = float(p.get("amount", 0))
			if hazard == "" or ha <= 0.0:
				return
			out["hazard_spawn_reduce"][hazard] = minf(1.0, float(out["hazard_spawn_reduce"].get(hazard, 0.0)) + ha * weight)
		"hazard_coin_multiplier":
			var hz: String = String(p.get("hazard", ""))
			var mult: float = float(p.get("multiplier", 0))
			if hz == "" or mult <= 1.0:
				return
			var bonus: float = (mult - 1.0) * weight   # additive past 1×
			out["hazard_coin_multiplier"][hz] = float(out["hazard_coin_multiplier"].get(hz, 1.0)) + bonus
		"free_moves":
			var count: float = float(p.get("count", 0))
			if count <= 0.0:
				return
			out["free_moves"] = int(out["free_moves"]) + int(floor(count * weight))
		"free_turn_if_chain":
			var min_chain: int = int(p.get("minChain", 0))
			if min_chain <= 1:
				return
			# Keep the easiest-to-trigger hook (lowest minChain).
			var cur: Dictionary = out["free_moves_if_chain"]
			if cur.is_empty() or min_chain < int(cur.get("min_chain", 0)):
				out["free_moves_if_chain"] = {"min_chain": min_chain, "count": 1}
		"coin_bonus_flat":
			var cf: float = float(p.get("amount", 0))
			if cf <= 0.0:
				return
			out["coin_bonus_flat"] = int(out["coin_bonus_flat"]) + int(floor(cf * weight))
		"coin_bonus_per_tile":
			var cpt: float = float(p.get("amount", 0))
			if cpt <= 0.0:
				return
			out["coin_bonus_per_tile"] = int(out["coin_bonus_per_tile"]) + int(floor(cpt * weight))
		"turn_budget_bonus":
			var tb: float = float(p.get("amount", 0))
			if tb <= 0.0:
				return
			out["turn_budget_bonus"] = int(out["turn_budget_bonus"]) + int(floor(tb * weight))
		"inventory_cap_bonus":
			var ic: float = float(p.get("amount", 0))
			if ic <= 0.0:
				return
			out["inventory_cap_bonus"] = int(out["inventory_cap_bonus"]) + int(floor(ic * weight))
		"grant_tool":
			var tool: String = String(p.get("tool", ""))
			var ta: float = float(p.get("amount", 0))
			if tool == "" or ta <= 0.0:
				return
			out["season_end_tools"][tool] = int(out["season_end_tools"].get(tool, 0)) + int(floor(ta * weight))
		"worker_pool_step":
			var wps: float = float(p.get("amount", 0))
			if wps <= 0.0:
				return
			out["season_end_pool_step"] = int(out["season_end_pool_step"]) + int(floor(wps * weight))
		"preserve_board":
			var biome: String = String(p.get("biome", ""))
			if biome != "":
				out["board_preserve_biomes"][biome] = true
		_:
			# Unknown-but-cataloged id with no channel handler. AbilityConfig.has_ability gated
			# entry, so this is unreachable for a valid catalog; left as a defensive no-op (the
			# React DEV-throw is a development assertion, not a runtime requirement here).
			pass

## Fold abilities across many sources into one channel object. Ported from aggregateAbilities
## (src/config/abilitiesAggregate.ts:289-308). Each source's weight is clamped to [0,1]; a source
## with weight <= 0 or no abilities is skipped. An empty/invalid `sources` yields empty_channels()
## (the NO-OP default that keeps a fresh game byte-identical).
static func aggregate_abilities(sources_in: Variant, ctx: Dictionary = {}) -> Dictionary:
	var out: Dictionary = empty_channels()
	if sources_in == null or not (sources_in is Array):
		return out
	var sources: Array = sources_in
	for src in sources:
		if src == null or not (src is Dictionary):
			continue
		var abilities: Array = (src as Dictionary).get("abilities", [])
		if abilities.is_empty():
			continue
		var weight: float = clampf(float((src as Dictionary).get("weight", 0.0)), 0.0, 1.0)
		if weight <= 0.0:
			continue
		for inst in abilities:
			if inst == null or not (inst is Dictionary):
				continue
			var id: String = String((inst as Dictionary).get("id", ""))
			if id == "" or not AbilityConfig.has_ability(id):
				continue
			apply_ability_to_channels(out, id, (inst as Dictionary).get("params", {}), weight, ctx)
	return out
