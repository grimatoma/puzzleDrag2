# Progression Phase 2a — Story-Trigger Engine Migration (parity-gated)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Route the game's story-trigger evaluation through the Phase-1 configurable-trigger engine — translate each `BeatTrigger` to a `Cond`, evaluate it over a flat fact snapshot — **replacing the `conditionMatches` switch**, proven behaviour-identical by a parity test. Flags become `flag.*` facts.

**Architecture:** A new bridge `src/config/progression/storyBridge.ts` exposes `buildFactSnapshot(event, totals, flags)` and `beatTriggerToCond(trigger)`. A parity test holds a verbatim copy of the *original* switch as an oracle and asserts the new path equals it across every real trigger × a realistic event/state matrix. Only then is `conditionMatches` in `src/story.ts` reimplemented to delegate. The existing story test suites + full gate must stay green.

**Tech stack:** TypeScript, Vitest. No new deps. Reuses Phase-1 `evaluate` from `src/config/progression/`.

**Explicitly out of scope (Phase 2b, later):** re-authoring beats to inline `when:`, deleting the `StoryTriggerType` enum / `BeatTrigger` shape, the Story Editor (`/story/`) trigger picker, and `sanitizeTrigger`/balance.json. The enum + `BeatTrigger` shape stay as the authoring vocabulary the bridge translates. No save-schema change is required (no persisted shape changes), so **`SAVE_SCHEMA_VERSION` is NOT bumped**.

---

## The exact current evaluator (the oracle — copy verbatim into the parity test)

```ts
// src/story.ts:441–477 — DO NOT paraphrase; the parity oracle must be byte-identical.
function conditionMatchesLegacy(t, event, totals = {}, flags = {}) {
  if (!t) return false;
  switch (t.type) {
    case "resource_total":       return (totals[t.key] ?? 0) >= t.amount;
    case "resource_total_multi": return Object.entries(t.req ?? {}).every(([k, v]) => (totals[k] ?? 0) >= v);
    case "flag_set":             return !!flags[t.flag];
    case "flag_cleared":         return !!t.flag && !flags[t.flag];
    default: break;
  }
  if (t.type !== event?.type) return false;
  switch (t.type) {
    case "session_start":
    case "session_ended":       return true;
    case "act_entered":         return event.act === t.act;
    case "craft_made":          return event.item === t.item && ((event.count ?? 1) >= (t.count ?? 1));
    case "building_built":      return event.id === t.id;
    case "order_fulfilled":     return (event.count ?? 1) >= (t.count ?? 1);
    case "keeper_confronted":   return (!t.zoneId || event.zoneId === t.zoneId) && (!t.path || event.path === t.path);
    case "boss_defeated":       return event.id === t.id;
    case "all_buildings_built": return event.allBuilt === true;
    default:                    return false;
  }
}
```

## Translator mapping (`beatTriggerToCond`) — must reproduce the oracle exactly

| `t.type` | `Cond` |
|---|---|
| `resource_total` | `{ fact: \`resource.${t.key}.total\`, op:"gte", value: t.amount }` |
| `resource_total_multi` | `{ all: Object.entries(t.req ?? {}).map(([k,v]) => ({ fact:\`resource.${k}.total\`, op:"gte", value:v })) }` |
| `flag_set` | `{ fact: \`flag.${t.flag}\` }` |
| `flag_cleared` | `{ not: { fact: \`flag.${t.flag}\` } }` |
| `session_start` / `session_ended` | `{ fact:"event.type", op:"eq", value:t.type }` |
| `act_entered` | `{ all:[ {fact:"event.type",op:"eq",value:"act_entered"}, {fact:"event.act",op:"eq",value:t.act} ] }` |
| `craft_made` | `{ all:[ {fact:"event.type",op:"eq",value:"craft_made"}, {fact:"event.item",op:"eq",value:t.item}, {fact:"event.count",op:"gte",value:(t.count ?? 1)} ] }` |
| `building_built` | `{ all:[ {fact:"event.type",op:"eq",value:"building_built"}, {fact:"event.id",op:"eq",value:t.id} ] }` |
| `order_fulfilled` | `{ all:[ {fact:"event.type",op:"eq",value:"order_fulfilled"}, {fact:"event.count",op:"gte",value:(t.count ?? 1)} ] }` |
| `keeper_confronted` | `{ all:[ {fact:"event.type",op:"eq",value:"keeper_confronted"}, …(t.zoneId ? [{fact:"event.zoneId",op:"eq",value:t.zoneId}] : []), …(t.path ? [{fact:"event.path",op:"eq",value:t.path}] : []) ] }` |
| `boss_defeated` | `{ all:[ {fact:"event.type",op:"eq",value:"boss_defeated"}, {fact:"event.id",op:"eq",value:t.id} ] }` |
| `all_buildings_built` | `{ all:[ {fact:"event.type",op:"eq",value:"all_buildings_built"}, {fact:"event.allBuilt",op:"eq",value:true} ] }` |
| anything else | `{ fact: "__never__" }` (always false — matches the `default: return false`) |

## Snapshot builder (`buildFactSnapshot`) — defaults chosen to match the oracle

```ts
export function buildFactSnapshot(event, totals = {}, flags = {}) {
  const snap = {};
  for (const [k, v] of Object.entries(totals)) snap[`resource.${k}.total`] = v;
  for (const [k, v] of Object.entries(flags)) snap[`flag.${k}`] = v;
  if (event && typeof event === "object") {
    for (const [k, v] of Object.entries(event)) snap[`event.${k}`] = v;
    // Oracle defaults `event.count ?? 1` on the event side (craft_made / order_fulfilled).
    snap["event.count"] = event.count ?? 1;
  }
  return snap;
}
```

**Known-safe edge notes** (verified by parity over real triggers): resource keys absent from `totals` evaluate `gte` against `undefined`→`NaN`→`false`; the oracle uses `(… ?? 0) >= amount`. These agree for every real `amount ≥ 1` (the only kind that exists). `flag_cleared` drops the oracle's `!!t.flag` guard, harmless because every real `flag_cleared` trigger names a flag. The parity test must surface any violation.

---

### Task 1: Bridge module (TDD)

**Files:**
- Create: `src/config/progression/storyBridge.ts`
- Modify: `src/config/progression/index.ts` (re-export)
- Test: `src/__tests__/progression-bridge.test.ts`

- [ ] **Step 1: failing unit test** — assert `beatTriggerToCond` output for one representative of each `t.type` matches the mapping table, and `buildFactSnapshot` places `resource.*.total`, `flag.*`, `event.*`, and defaults `event.count` to 1 when absent. (Write concrete `expect(beatTriggerToCond({type:"building_built",id:"granary"})).toEqual({all:[{fact:"event.type",op:"eq",value:"building_built"},{fact:"event.id",op:"eq",value:"granary"}]})` etc. for all 14 types incl. the unknown→`{fact:"__never__"}` case.)
- [ ] **Step 2: run, confirm fail** — `npx vitest run src/__tests__/progression-bridge.test.ts` → cannot resolve `storyBridge.js`.
- [ ] **Step 3: implement `storyBridge.ts`** — `beatTriggerToCond(trigger: BeatTrigger): Cond` per the mapping table and `buildFactSnapshot` per the spec above. Import `Cond`, `FactSnapshot` from `./types.js`. Import `BeatTrigger` type from `../../story.js`. Re-export both from `index.ts`.
- [ ] **Step 4: run, confirm pass.**
- [ ] **Step 5: commit** — `git add src/config/progression/storyBridge.ts src/config/progression/index.ts src/__tests__/progression-bridge.test.ts && git commit -m "feat(progression): BeatTrigger→Cond bridge + fact snapshot builder"`

---

### Task 2: Parity test (the spec — the safety net)

**Files:**
- Create: `src/__tests__/progression-parity.test.ts`

- [ ] **Step 1: write the parity test**
  - Paste `conditionMatchesLegacy` (the verbatim oracle above) into the test file.
  - Gather every real trigger: `STORY_BEATS` + `SIDE_BEATS` (`.trigger` where present) from `../story.js`, and `STORY_FLAGS[].triggers` from `../flags.js` (flatten; these also flow through `conditionMatches`).
  - Build a realistic matrix of `(event, totals, flags)` probes that exercises each trigger both true and false: e.g. for `building_built` triggers, an event `{type:"building_built", id:<the trigger's id>}` and a non-matching one; for `resource_total`, totals at/below/above threshold; for `flag_set/cleared`, flags with the flag on/off; for `session_start/ended`/`act_entered`/`craft_made`/`order_fulfilled`/`keeper_confronted`/`boss_defeated`/`all_buildings_built`, matching + non-matching events; plus a few cross-events (e.g. a `craft_made` event against a `building_built` trigger) to exercise the type-guard.
  - For every (trigger, probe): `expect(evaluate(beatTriggerToCond(trigger), buildFactSnapshot(event, totals, flags))).toBe(conditionMatchesLegacy(trigger, event, totals, flags));` with a message identifying the trigger + probe.
- [ ] **Step 2: run** — `npx vitest run src/__tests__/progression-parity.test.ts`.
- [ ] **Step 3: fix the bridge until green** — any mismatch means the translator/snapshot diverges from the oracle. Adjust `storyBridge.ts` (NOT the oracle, NOT the test expectations) until every (trigger × probe) pair matches. Re-run to green.
- [ ] **Step 4: commit** — `git add src/__tests__/progression-parity.test.ts src/config/progression/storyBridge.ts && git commit -m "test(progression): parity — bridge reproduces conditionMatches over all real triggers"`

---

### Task 3: Flip `conditionMatches` to delegate

**Files:**
- Modify: `src/story.ts:441-477`

- [ ] **Step 1: reimplement the body** — keep the exported signature `conditionMatches(t, event, totals = {}, flags = {})` and JSDoc, but replace the two switches with:
  ```ts
  import { evaluate } from "./config/progression/conditions.js";
  import { beatTriggerToCond, buildFactSnapshot } from "./config/progression/storyBridge.js";
  // …
  export function conditionMatches(t, event, totals = {}, flags = {}) {
    if (!t) return false;
    return evaluate(beatTriggerToCond(t), buildFactSnapshot(event, totals, flags));
  }
  ```
  (Watch for an import cycle: `storyBridge.ts` imports the `BeatTrigger` *type* from `story.ts` — type-only imports don't create a runtime cycle. If `tsc`/bundler complains, change `storyBridge.ts` to `import type { BeatTrigger }`.)
- [ ] **Step 2: run the story suites** — `npx vitest run tests/phase-2-story.test.ts src/__tests__/progression-parity.test.ts` and any other story/flag suites (`grep -rl "conditionMatches\|evaluateStoryTriggers\|FLAG_TRIGGERS" src/__tests__ tests`). All must pass.
- [ ] **Step 3: typecheck** — `npm run typecheck`. Resolve any import-cycle / type errors (prefer `import type`).
- [ ] **Step 4: commit** — `git add src/story.ts src/config/progression/storyBridge.ts && git commit -m "refactor(story): evaluate triggers through the configurable-trigger engine"`

---

### Task 4: Full verification gate

- [ ] `npm run lint` → PASS
- [ ] `npm run typecheck && npm run typecheck:test-files` → PASS
- [ ] `npm test` → PASS (story + flag + the new bridge/parity suites all green; no regressions)
- [ ] `npm run build` → PASS
- [ ] Visual: the change is reducer-only (no render change) → **skip** `test:visual` (no UI surface affected). State this in the PR.

---

## Self-review

1. **Spec coverage:** bridge (Task 1), parity proof (Task 2), the actual migration/flip (Task 3), gate (Task 4). Flags-as-facts is inherent in the bridge. Enum deletion / editor / sanitizer correctly deferred to 2b (stated in header).
2. **Placeholders:** none — translator table + snapshot + oracle are concrete; the parity test is the precise behavioural spec.
3. **Type consistency:** `beatTriggerToCond`/`buildFactSnapshot`/`evaluate`/`Cond`/`FactSnapshot` names are stable across tasks; `conditionMatches` keeps its existing signature so all callers (story/side/flag evaluators) are untouched.
