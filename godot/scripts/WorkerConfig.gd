class_name WorkerConfig
extends RefCounted
## Workers — hired-by-type units whose passive abilities shave tiles off a chain
## (threshold_reduce_category) or stretch a recipe (recipe_input_reduce). Ported
## from the React workers slice (src/features/workers/data.ts + aggregate.ts) as a
## pure-data catalog + cost helpers, wired ADDITIVELY into GameState.
##
## PORT MAPPING (React → Godot port facts). React's worker categories/recipe are
## remapped to the categories/recipe that ACTUALLY EXIST in the port (Constants.CATEGORY
## / RecipeConfig). With ZERO workers hired the economy is byte-identical to today —
## every reduction sums to 0 when no worker of that kind is hired (GameState).
##
##   Farmer     threshold_reduce_category "grain"  amount 1  (WHEAT, Constants.CATEGORY)
##   Lumberjack threshold_reduce_category "trees"  amount 1  (OAK)
##   Miner      threshold_reduce_category "stone"  amount 1  (STONE — React said "wood"/
##              stone, which is NOT a port category; "stone" is the mine staple that IS)
##   Baker      recipe_input_reduce bread/flour    amount 1  (RecipeConfig.BREAD input flour)
##
## HIRE-COST RAMP (linear, per the port deliverable). The cost of hiring the N-th
## worker of a type (0-indexed; the very first hire is N=0) is:
##   coins     = coins + coins_step * N                      (linear ramp)
##   resources = each entry × (1 + floor(N / resources_step_every))
## React's Baker used a GEOMETRIC coins ramp (coinsMult); the port keeps a SINGLE
## linear curve (coins_step) for every type so hire_cost_at is one predictable shape.
##
## Registered as a `class_name` global (like Constants / RecipeConfig / BuildingConfig)
## so its consts + static helpers are reachable WITHOUT a live autoload — headless
## tests run before the scene tree exists. Stateless: never instantiated.

# ── Worker ids ──────────────────────────────────────────────────────────────────
const FARMER: String = "farmer"
const LUMBERJACK: String = "lumberjack"
const MINER: String = "miner"
const BAKER: String = "baker"

## Ability kinds.
const KIND_THRESHOLD_REDUCE_CATEGORY: String = "threshold_reduce_category"
const KIND_RECIPE_INPUT_REDUCE: String = "recipe_input_reduce"

## A threshold can NEVER be reduced below this floor — so stacking enough workers of a
## category can't collapse the threshold to 0/1 and "explode" the unit math (a chain of 3
## would otherwise mint absurd quantities). Mirrors a sane minimum chain length; at 0 workers
## the reduction is 0 so this floor is never even reached. (Relocated from GameState — worker
## tuning belongs with the worker config.)
const WORKER_MIN_THRESHOLD: int = 2

## Worker catalog keyed by id. Each entry:
##   id:         String      — stable worker id (matches the key)
##   name:       String      — display name
##   role:       String      — short role label
##   max_count:  int         — hard cap on hires of this type
##   hire_cost:  Dictionary  — { coins:int, coins_step:int,
##                               resources:{key:int}, resources_step_every:int }
##   ability:    Dictionary  — { kind:String, category?:String,
##                               recipe?:String, input?:String, amount:int }
const WORKERS: Dictionary = {
	FARMER: {
		"id": FARMER,
		"name": "Farmer",
		"role": "Farmer",
		"max_count": 10,
		"hire_cost": {
			"coins": 50, "coins_step": 25,
			"resources": {"hay_bundle": 2}, "resources_step_every": 3,
		},
		"ability": {"kind": KIND_THRESHOLD_REDUCE_CATEGORY, "category": "grain", "amount": 1},
	},
	LUMBERJACK: {
		"id": LUMBERJACK,
		"name": "Lumberjack",
		"role": "Lumberjack",
		"max_count": 10,
		"hire_cost": {
			"coins": 60, "coins_step": 30,
			"resources": {"plank": 2}, "resources_step_every": 3,
		},
		"ability": {"kind": KIND_THRESHOLD_REDUCE_CATEGORY, "category": "trees", "amount": 1},
	},
	MINER: {
		"id": MINER,
		"name": "Miner",
		"role": "Miner",
		"max_count": 10,
		"hire_cost": {
			"coins": 75, "coins_step": 35,
			"resources": {"block": 2}, "resources_step_every": 3,
		},
		"ability": {"kind": KIND_THRESHOLD_REDUCE_CATEGORY, "category": "stone", "amount": 1},
	},
	BAKER: {
		"id": BAKER,
		"name": "Baker",
		"role": "Baker",
		"max_count": 10,
		"hire_cost": {
			"coins": 75, "coins_step": 40,
			"resources": {"flour": 1, "eggs": 1}, "resources_step_every": 3,
		},
		"ability": {"kind": KIND_RECIPE_INPUT_REDUCE, "recipe": RecipeConfig.BREAD, "input": "flour", "amount": 1},
	},
}

## Stable display / iteration order for the workers.
const WORKER_IDS: Array = [FARMER, LUMBERJACK, MINER, BAKER]

# ── Static helpers (usable without an instance) ──────────────────────────────────

## Every worker id, in stable order.
static func all_ids() -> Array:
	return WORKER_IDS.duplicate()

## True when `id` names a real worker type.
static func has_worker(id: String) -> bool:
	return WORKERS.has(id)

## The full worker entry for `id` (a COPY, so callers can't mutate the const), or
## {} for an unknown id. Named get_def (NOT get) — get() collides with the native
## Object.get(StringName) and Godot rejects the override.
static func get_def(id: String) -> Dictionary:
	if not has_worker(id):
		return {}
	return (WORKERS[id] as Dictionary).duplicate(true)

static func worker_name(id: String) -> String:
	if not has_worker(id):
		return ""
	return String(WORKERS[id].get("name", ""))

static func role(id: String) -> String:
	if not has_worker(id):
		return ""
	return String(WORKERS[id].get("role", ""))

## Hard cap on hires of `id` (0 for an unknown id).
static func max_count(id: String) -> int:
	if not has_worker(id):
		return 0
	return int(WORKERS[id].get("max_count", 0))

## The ability dict for `id` (a COPY), or {} for an unknown id.
static func ability(id: String) -> Dictionary:
	if not has_worker(id):
		return {}
	return (WORKERS[id].get("ability", {}) as Dictionary).duplicate(true)

static func ability_kind(id: String) -> String:
	return String(ability(id).get("kind", ""))

## The category a threshold_reduce_category worker targets ("" otherwise).
static func ability_category(id: String) -> String:
	return String(ability(id).get("category", ""))

static func ability_recipe(id: String) -> String:
	return String(ability(id).get("recipe", ""))

static func ability_input(id: String) -> String:
	return String(ability(id).get("input", ""))

## The per-hire effect amount of `id` (0 for an unknown id).
static func ability_amount(id: String) -> int:
	return int(ability(id).get("amount", 0))

## The worker's ability as AbilityConfig INSTANCE(S) ({id, params}) — the source shape
## AbilityAggregate consumes. Reconciles the port's flat `ability` dict to the React worker
## `abilities` array (src/features/workers/data.ts). Returns [] for an unknown id or a worker
## with no ability.
##
## DOUBLE-COUNT NOTE: the two worker ability kinds (threshold_reduce_category,
## recipe_input_reduce) are ALREADY wired through GameState's dedicated worker paths
## (worker_threshold_reduction → credit_chain, worker_recipe_input_reduction → craft), so
## GameState.compute_ability_channels deliberately does NOT feed workers into the unified
## aggregate — doing so would double-count those channels. This helper exists for parity /
## tests / future worker abilities that have NO dedicated path; it is the faithful mapping
## of a worker's ability into the aggregator's instance shape.
static func abilities_of(id: String) -> Array:
	var ab: Dictionary = ability(id)
	var kind: String = String(ab.get("kind", ""))
	if kind == "":
		return []
	match kind:
		KIND_THRESHOLD_REDUCE_CATEGORY:
			return [{"id": "threshold_reduce_category", "params": {
				"category": String(ab.get("category", "")),
				"amount": int(ab.get("amount", 0)),
			}}]
		KIND_RECIPE_INPUT_REDUCE:
			return [{"id": "recipe_input_reduce", "params": {
				"recipe": String(ab.get("recipe", "")),
				"input": String(ab.get("input", "")),
				"amount": int(ab.get("amount", 0)),
			}}]
		_:
			return []

## Cost to hire the NEXT worker of `id`, given the current hired count.
## Returns { coins:int, resources:{key:int} } for the (current_count+1)-th hire:
##   coins     = coins + coins_step * current_count                 (linear ramp)
##   resources = each base entry × (1 + floor(current_count / resources_step_every))
## An unknown id returns { coins: 0, resources: {} }.
static func hire_cost_at(id: String, current_count: int) -> Dictionary:
	if not has_worker(id):
		return {"coins": 0, "resources": {}}
	var hc: Dictionary = WORKERS[id].get("hire_cost", {})
	var c: int = maxi(0, current_count)
	var base_coins: int = int(hc.get("coins", 0))
	var step: int = int(hc.get("coins_step", 0))
	var coins: int = base_coins + step * c
	var resources_out: Dictionary = {}
	var base_resources: Dictionary = hc.get("resources", {})
	var step_every: int = int(hc.get("resources_step_every", 3))
	if step_every <= 0:
		step_every = 3
	var mult: int = 1 + (c / step_every)   # int division floors for positives
	for k in base_resources.keys():
		var n: int = int(base_resources[k]) * mult
		if n > 0:
			resources_out[String(k)] = n
	return {"coins": coins, "resources": resources_out}
