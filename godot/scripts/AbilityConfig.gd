class_name AbilityConfig
extends RefCounted
## The unified ability CATALOG — the single source of truth for every modifier a
## building, worker, or tile can apply. Ported VERBATIM (ids + trigger + scope +
## channel) from the React catalog src/config/abilities.ts (ABILITIES /
## getAbility). The aggregation MATH lives in AbilityAggregate.gd (the analogue of
## src/config/abilitiesAggregate.ts); this file is just the id→metadata table plus
## validity / trigger lookups.
##
## Each entry:
##   trigger — the lifecycle moment the ability fires (passive | on_chain_collect |
##             on_chain_commit | season_end | session_end | on_board_fill).
##   scope   — which entity kinds may attach it ("building" | "worker" | "tile").
##   channel — the AbilityAggregate output bucket it folds into.
##
## TRIGGERS mirror src/config/abilities.ts TRIGGERS. TILE_AGGREGATOR_TRIGGERS
## (passive / on_board_fill) is the subset GameState.compute_ability_channels feeds
## from ACTIVE TILE sources — chain-time tile abilities (free_moves / coin) are read
## per-chain off the chained tile (accrue_chain_abilities / chain_coin_bonus), so
## including them from the tile aggregator would DOUBLE-COUNT (see
## src/features/workers/aggregate.ts TILE_AGGREGATOR_TRIGGERS).
##
## Registered as a `class_name` global so consts + helpers are reachable WITHOUT a
## live autoload — headless tests run before the scene tree exists. Stateless.

# ── Triggers (src/config/abilities.ts TRIGGERS) ───────────────────────────────
const TRIGGER_PASSIVE: String = "passive"
const TRIGGER_ON_CHAIN_COLLECT: String = "on_chain_collect"
const TRIGGER_ON_CHAIN_COMMIT: String = "on_chain_commit"
const TRIGGER_SEASON_END: String = "season_end"
const TRIGGER_SESSION_END: String = "session_end"
const TRIGGER_ON_BOARD_FILL: String = "on_board_fill"

## The triggers a TILE source contributes through the global aggregator. Mirrors
## src/features/workers/aggregate.ts:45 (TILE_AGGREGATOR_TRIGGERS). Chain-time tile
## abilities are read per-chain, NOT via the aggregator — so excluded here.
const TILE_AGGREGATOR_TRIGGERS: Array = [TRIGGER_PASSIVE, TRIGGER_ON_BOARD_FILL]

## The ability catalog keyed by id. trigger/scope/channel mirror src/config/abilities.ts.
## desc is the React `desc` (trimmed) for parity / the wiki; params schemas are NOT ported
## (the port reads params off the source instance directly), only the id→metadata map is.
const ABILITIES: Dictionary = {
	# ── Threshold / pool / yield ──────────────────────────────────────────────
	"threshold_reduce": {
		"trigger": TRIGGER_PASSIVE,
		"scope": ["worker", "tile", "building"],
		"channel": "threshold_reduce",
	},
	"threshold_reduce_category": {
		"trigger": TRIGGER_PASSIVE,
		"scope": ["worker", "building"],
		"channel": "threshold_reduce",
	},
	"pool_weight_legacy": {
		"trigger": TRIGGER_ON_BOARD_FILL,
		"scope": ["worker"],
		"channel": "pool_weight",
	},
	"pool_weight": {
		"trigger": TRIGGER_ON_BOARD_FILL,
		"scope": ["worker", "tile", "building"],
		"channel": "effective_pool_weights",
	},
	"bonus_yield": {
		"trigger": TRIGGER_ON_CHAIN_COLLECT,
		"scope": ["worker", "tile", "building"],
		"channel": "bonus_yield",
	},
	"season_bonus": {
		"trigger": TRIGGER_SEASON_END,
		"scope": ["worker", "building"],
		"channel": "season_bonus",
	},
	"recipe_input_reduce": {
		"trigger": TRIGGER_PASSIVE,
		"scope": ["worker", "building"],
		"channel": "recipe_input_reduce",
	},
	"chain_redirect_category": {
		"trigger": TRIGGER_ON_CHAIN_COMMIT,
		"scope": ["worker"],
		"channel": "chain_redirect",
	},
	# ── Hazards (mine biome) ──────────────────────────────────────────────────
	"hazard_spawn_reduce": {
		"trigger": TRIGGER_PASSIVE,
		"scope": ["worker", "building"],
		"channel": "hazard_spawn_reduce",
	},
	"hazard_coin_multiplier": {
		"trigger": TRIGGER_ON_CHAIN_COMMIT,
		"scope": ["worker"],
		"channel": "hazard_coin_multiplier",
	},
	# ── Tile-style chain abilities ────────────────────────────────────────────
	"free_moves": {
		"trigger": TRIGGER_ON_CHAIN_COLLECT,
		"scope": ["tile", "building"],
		"channel": "free_moves",
	},
	"free_turn_if_chain": {
		"trigger": TRIGGER_ON_CHAIN_COMMIT,
		"scope": ["tile"],
		"channel": "free_moves_if_chain",
	},
	"coin_bonus_flat": {
		"trigger": TRIGGER_ON_CHAIN_COMMIT,
		"scope": ["tile", "building"],
		"channel": "coin_bonus_flat",
	},
	"coin_bonus_per_tile": {
		"trigger": TRIGGER_ON_CHAIN_COMMIT,
		"scope": ["tile"],
		"channel": "coin_bonus_per_tile",
	},
	# ── Building-only abilities ───────────────────────────────────────────────
	"grant_tool": {
		"trigger": TRIGGER_SEASON_END,
		"scope": ["building"],
		"channel": "season_end_tools",
	},
	"worker_pool_step": {
		"trigger": TRIGGER_SEASON_END,
		"scope": ["building"],
		"channel": "season_end_pool_step",
	},
	"preserve_board": {
		"trigger": TRIGGER_SESSION_END,
		"scope": ["building"],
		"channel": "board_preserve_biomes",
	},
	"turn_budget_bonus": {
		"trigger": TRIGGER_PASSIVE,
		"scope": ["building"],
		"channel": "turn_budget_bonus",
	},
	"inventory_cap_bonus": {
		"trigger": TRIGGER_PASSIVE,
		"scope": ["building"],
		"channel": "inventory_cap_bonus",
	},
}

# ── Static helpers (usable without an instance) ───────────────────────────────

## True when `id` names a real ability (src/config/abilities.ts ABILITY_BY_ID).
static func has_ability(id: String) -> bool:
	return ABILITIES.has(id)

## The catalog entry for `id` (a COPY so callers can't mutate the const), or {} for an
## unknown id. Mirrors getAbility (src/config/abilities.ts:298) returning null.
static func get_ability(id: String) -> Dictionary:
	if not has_ability(id):
		return {}
	return (ABILITIES[id] as Dictionary).duplicate(true)

## The catalog default trigger for `id` ("" for an unknown id). An ability INSTANCE may
## OVERRIDE this with its own `trigger` field (mirrors aggregate.ts `inst.trigger || def.trigger`).
static func trigger_of(id: String) -> String:
	if not has_ability(id):
		return ""
	return String(ABILITIES[id].get("trigger", ""))

## The aggregator channel `id` folds into ("" for an unknown id).
static func channel_of(id: String) -> String:
	if not has_ability(id):
		return ""
	return String(ABILITIES[id].get("channel", ""))

## True when `id` may be attached to an entity of the given `scope`
## (abilityAllowedInScope, src/config/abilities.ts:322).
static func allowed_in_scope(id: String, scope: String) -> bool:
	if not has_ability(id):
		return false
	return (ABILITIES[id].get("scope", []) as Array).has(scope)

## True when `id`'s EFFECTIVE trigger (instance override `trigger`, else catalog default)
## is one a TILE source should feed through the global aggregator (passive / on_board_fill).
## Mirrors the discoveredTileSources passive-filter (aggregate.ts:123-128). `inst_trigger` is
## the instance's own trigger ("" when it doesn't override).
static func is_tile_aggregator_trigger(id: String, inst_trigger: String = "") -> bool:
	if not has_ability(id):
		return false
	var t: String = inst_trigger if inst_trigger != "" else trigger_of(id)
	return TILE_AGGREGATOR_TRIGGERS.has(t)
