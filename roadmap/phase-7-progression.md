# Phase 7 — Quests / Almanac / Achievements

[← back to ROADMAP](../ROADMAP.md) · [GAME_SPEC](../GAME_SPEC.md)

**Goal (player experience):** Every season opens with a fresh card of 6 daily quests
("Collect 30 hay", "Bake 3 bread", "Make a chain of 8+") that tick automatically as
the player chains, crafts, and delivers — and pay coins plus 20 XP each on claim.
That XP feeds an almanac that levels every 150 XP per §17, with tier rewards (coins,
tools) up to tier 4 and a *structural* tier 5 reward: **+1 starting Scythe each
session, forever.** Underneath, achievement counters quietly tick during normal play
and pop a short "Achievement unlocked: <name>" floater at milestones — the player
never *grinds* an achievement, they *notice* one.

**Why now:** Phases 3–6 added systems (market, workers, species, NPC bond) but the
only progression spine is the story arc, which is single-track and ends at the
festival. Quests give the player a short-horizon goal each season (claim 6 quests
this autumn). The almanac gives a medium-horizon goal each session (push to tier 5
for the permanent Scythe). Achievements give a long-horizon meta-goal across many
sessions. Without these, post-Phase-2 sandbox sessions have no shape.

**Entry check:** [Phase 6 Sign-off Gate](./phase-6-npc-social.md#phase-6-sign-off-gate) complete.

> Standard 6-section task structure. See [ROADMAP.md → How to use this document](../ROADMAP.md).

---

### 7.1 — 6 daily quest slots resetting per season

**What this delivers:** A fresh card of 6 quests every season. Each quest is rolled
from a `QUEST_TEMPLATES` array spanning five categories — collect-resource,
craft-item, fulfil-orders, use-tool, chain-length — with a target value picked from
that template's range (so spring's "Collect 30 hay" can roll as autumn's "Collect
45 hay"). Progress ticks live as the player plays: every chain commit fires
`quest_event({type:"collect", key, amount})` for each resource collected; bake/craft
fires `craft`; order delivery fires `order`; tool use fires `tool`; the chain commit
also fires `chain` with `length`. Quests with a matching template+key tick. Claiming
a completed quest pays `coins + 20 xp` (§17). Quest generation is seeded by
`(saveSeed, year, season)` so a save resumed mid-season shows the same 6 quests as
before reload.

**Completion Criteria:**
- [ ] `src/features/quests/templates.js` exports `QUEST_TEMPLATES` array with at
  least 12 templates covering all 5 categories
- [ ] `src/features/quests/data.js` exports pure helpers `rollQuests(seed, year, season)`,
  `tickQuest(quest, event)`, `claimQuest(state, questId)`
- [ ] `state.quests` is an array of exactly 6 entries on `OPEN_SEASON` (and on
  session start for a fresh save)
- [ ] Each quest has shape `{ id, template, key, target, progress, claimed, reward: { coins, xp } }`
- [ ] `xp` reward is locked at `20` per quest (§17 — locked, do not redesign)
- [ ] `coins` reward is `template.coinBase + Math.floor(target * template.coinPerUnit)`
- [ ] `tickQuest` is pure — returns a new quest with updated `progress`, no mutation
- [ ] Non-matching events (wrong key, wrong type) return the quest unchanged
- [ ] `claimQuest` is a no-op if `progress < target` OR `claimed === true`
- [ ] On successful claim: `claimed = true`, `state.coins += reward.coins`, almanac
  XP gain of `+20` is dispatched (handled in 7.2)
- [ ] Quest rolls are deterministic from `(saveSeed, year, season)` — same inputs
  always produce the same 6 quests
- [ ] `OPEN_SEASON` replaces all 6 quests; in-progress unclaimed quests from the
  previous season are *discarded* (this is intentional — fresh card per season)
- [ ] Save/load preserves `state.quests` exactly so mid-season reload resumes
  progress

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { QUEST_TEMPLATES } from "./features/quests/templates.js";
import { rollQuests, tickQuest, claimQuest } from "./features/quests/data.js";
import { createInitialState } from "./state.js";

// Templates cover all 5 categories
const cats = new Set(QUEST_TEMPLATES.map(t => t.category));
assert(cats.has("collect"),  "templates include collect-resource");
assert(cats.has("craft"),    "templates include craft-item");
assert(cats.has("order"),    "templates include fulfil-orders");
assert(cats.has("tool"),     "templates include use-tool");
assert(cats.has("chain"),    "templates include chain-length");
assert(QUEST_TEMPLATES.length >= 12, "at least 12 templates registered");
assert(QUEST_TEMPLATES.every(t => t.targetMin > 0 && t.targetMax >= t.targetMin),
       "every template has a sane target range");

// rollQuests produces exactly 6 quests
const q1 = rollQuests("seed-A", 1, "spring");
assert(Array.isArray(q1) && q1.length === 6, "rollQuests returns 6 quests");
assert(q1.every(q => q.id && q.template && q.target > 0 && q.progress === 0
                     && q.claimed === false && q.reward.xp === 20),
       "every quest has expected shape; xp locked at 20");

// Determinism — same seed/year/season → same quests
const q1b = rollQuests("seed-A", 1, "spring");
assert(JSON.stringify(q1) === JSON.stringify(q1b), "quest roll is deterministic");

// Different season → different quests (overwhelmingly likely; not strict equality)
const q2 = rollQuests("seed-A", 1, "summer");
assert(JSON.stringify(q1) !== JSON.stringify(q2), "different season rolls differently");

// Different seasons across multiple years produce varying targets
const targetsA = rollQuests("seed-A", 1, "spring").map(q => q.target);
const targetsB = rollQuests("seed-A", 2, "spring").map(q => q.target);
assert(JSON.stringify(targetsA) !== JSON.stringify(targetsB),
       "year offset changes targets");

// Collect template ticks on matching key only
const hayQuest = { id:"x", template:"collect_hay", category:"collect",
                   key:"hay", target:30, progress:0, claimed:false,
                   reward:{coins:60, xp:20} };
const after = tickQuest(hayQuest, { type:"collect", key:"hay", amount:7 });
assert(after.progress === 7, "hay event ticks hay quest by amount");
assert(hayQuest.progress === 0, "tickQuest is pure — original unchanged");

// Non-matching key does not tick
const stillZero = tickQuest(hayQuest, { type:"collect", key:"wheat", amount:5 });
assert(stillZero.progress === 0, "wrong key does not tick");

// Wrong event type does not tick
const stillZero2 = tickQuest(hayQuest, { type:"craft", item:"bread", count:1 });
assert(stillZero2.progress === 0, "wrong event type does not tick");

// claimQuest below target = no-op
let s = createInitialState();
s.coins = 0;
s.quests = [{ id:"q1", template:"collect_hay", category:"collect", key:"hay",
              target:30, progress:10, claimed:false,
              reward:{ coins:60, xp:20 } }];
let r = claimQuest(s, "q1");
assert(r.ok === false,           "claim below target rejected");
assert(r.newState.coins === 0,   "no coins paid on rejected claim");
assert(r.newState.quests[0].claimed === false, "still unclaimed");

// claimQuest at/above target pays out and flips claimed
s.quests[0].progress = 30;
r = claimQuest(s, "q1");
assert(r.ok === true,                          "claim accepted at target");
assert(r.newState.coins === 60,                "coins paid");
assert(r.newState.quests[0].claimed === true,  "flag flipped");
assert(r.xpGain === 20,                        "xp gain reported (handled in 7.2)");

// Re-claim is a no-op
const r2 = claimQuest(r.newState, "q1");
assert(r2.ok === false,                           "re-claim rejected");
assert(r2.newState.coins === 60,                  "coins unchanged on re-claim");
```
Run — confirm: `Cannot find module './features/quests/templates.js'`.

*Gameplay simulation (player at level 4, opening autumn of year 1):*
The player advances from summer to autumn. The season modal closes and the quest
panel chimes — a "New Quests" badge appears over the panel tab. Opening it shows
six fresh cards: "Collect 35 hay (75◉ + 20xp)", "Bake 3 bread (90◉ + 20xp)",
"Deliver 4 orders (120◉ + 20xp)", "Use the Scythe 3 times (60◉ + 20xp)", "Make a
chain of 8+ (75◉ + 20xp)", "Collect 12 logs (60◉ + 20xp)". They chain a 14-hay
chain — the hay bar on quest 1 jumps to 14/35, and the chain-length quest ticks
to 1/1 because the chain is 8+ tiles long. They claim the chain quest immediately
(75◉ floater + a quiet "+20 XP" line). Two more chains, two more bakes, hay quest
hits 35/35; they claim it. Across the 10-turn season they claim 4 of 6. Autumn
closes — the next morning shows a brand-new card of 6 quests, the 2 unclaimed
autumn quests gone forever.

Designer reflection: *Does the season-open quest refresh feel like "ooh, new
goals" or like "ugh, my unclaimed wheat quest just got nuked"? Is six the right
number — fewer than that and the card feels empty, more and the player tunes out?*

**Implementation:**
- New file `src/features/quests/templates.js`:
  ```js
  // 5 categories × multiple keys/items = ≥12 templates.
  // Each template: { id, category, key?, item?, tool?, label, targetMin, targetMax,
  //                  coinBase, coinPerUnit }
  export const QUEST_TEMPLATES = [
    // collect-resource
    { id:"collect_hay",   category:"collect", key:"hay",   label:"Collect {n} hay",
      targetMin:20, targetMax:50, coinBase:30, coinPerUnit:1 },
    { id:"collect_wheat", category:"collect", key:"wheat", label:"Collect {n} wheat",
      targetMin:8,  targetMax:20, coinBase:40, coinPerUnit:2 },
    { id:"collect_log",   category:"collect", key:"log",   label:"Collect {n} logs",
      targetMin:8,  targetMax:18, coinBase:30, coinPerUnit:2 },
    { id:"collect_berry", category:"collect", key:"berry", label:"Collect {n} berries",
      targetMin:6,  targetMax:14, coinBase:30, coinPerUnit:3 },
    { id:"collect_grain", category:"collect", key:"grain", label:"Collect {n} grain",
      targetMin:4,  targetMax:10, coinBase:50, coinPerUnit:4 },
    // craft-item
    { id:"craft_bread",   category:"craft",   item:"bread",   label:"Bake {n} bread",
      targetMin:2, targetMax:5,  coinBase:50, coinPerUnit:15 },
    { id:"craft_jam",     category:"craft",   item:"jam",     label:"Cook {n} jam",
      targetMin:2, targetMax:4,  coinBase:50, coinPerUnit:20 },
    { id:"craft_plank",   category:"craft",   item:"plank",   label:"Mill {n} planks",
      targetMin:3, targetMax:8,  coinBase:40, coinPerUnit:10 },
    // fulfil-orders
    { id:"orders_any",    category:"order",                   label:"Deliver {n} orders",
      targetMin:3, targetMax:6,  coinBase:60, coinPerUnit:15 },
    // use-tool
    { id:"tool_scythe",   category:"tool",    tool:"scythe",  label:"Use the Scythe {n} times",
      targetMin:2, targetMax:5,  coinBase:30, coinPerUnit:10 },
    { id:"tool_seedpack", category:"tool",    tool:"seedpack",label:"Use the Seedpack {n} times",
      targetMin:2, targetMax:4,  coinBase:30, coinPerUnit:15 },
    { id:"tool_lockbox",  category:"tool",    tool:"lockbox", label:"Use the Lockbox {n} times",
      targetMin:1, targetMax:3,  coinBase:30, coinPerUnit:20 },
    // chain-length
    { id:"chain_8",       category:"chain",   minLength:8,    label:"Make a chain of 8+",
      targetMin:1, targetMax:3,  coinBase:50, coinPerUnit:25 },
    { id:"chain_12",      category:"chain",   minLength:12,   label:"Make a chain of 12+",
      targetMin:1, targetMax:2,  coinBase:80, coinPerUnit:40 },
  ];
  ```
- New file `src/features/quests/data.js`:
  ```js
  import { QUEST_TEMPLATES } from "./templates.js";

  // Mulberry32 — deterministic seeded rng (mirrors src/utils.js helper).
  function rngFrom(seedStr) {
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619);
    }
    let a = h >>> 0;
    return () => {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  export function rollQuests(saveSeed, year, season) {
    const rng = rngFrom(`${saveSeed}|${year}|${season}`);
    const pool = [...QUEST_TEMPLATES];
    const out = [];
    while (out.length < 6 && pool.length) {
      const idx = Math.floor(rng() * pool.length);
      const tpl = pool.splice(idx, 1)[0];
      const target = tpl.targetMin
        + Math.floor(rng() * (tpl.targetMax - tpl.targetMin + 1));
      out.push({
        id: `${tpl.id}-${year}-${season}-${out.length}`,
        template: tpl.id,
        category: tpl.category,
        key: tpl.key, item: tpl.item, tool: tpl.tool, minLength: tpl.minLength,
        target, progress: 0, claimed: false,
        reward: {
          coins: tpl.coinBase + Math.floor(target * tpl.coinPerUnit),
          xp: 20,                     // §17 locked: 20 XP per quest claim
        },
      });
    }
    return out;
  }

  export function tickQuest(quest, event) {
    if (quest.claimed) return quest;
    let inc = 0;
    if (event.type === "collect" && quest.category === "collect"
        && quest.key === event.key) inc = event.amount;
    else if (event.type === "craft" && quest.category === "craft"
             && quest.item === event.item) inc = event.count ?? 1;
    else if (event.type === "order" && quest.category === "order") inc = 1;
    else if (event.type === "tool"  && quest.category === "tool"
             && quest.tool === event.tool) inc = 1;
    else if (event.type === "chain" && quest.category === "chain"
             && event.length >= quest.minLength) inc = 1;
    if (!inc) return quest;
    return { ...quest, progress: Math.min(quest.target, quest.progress + inc) };
  }

  export function claimQuest(state, questId) {
    const q = state.quests.find(qq => qq.id === questId);
    if (!q || q.claimed || q.progress < q.target) {
      return { ok: false, newState: state, xpGain: 0 };
    }
    return {
      ok: true,
      xpGain: q.reward.xp,                    // 7.2 wires this into almanac
      newState: {
        ...state,
        coins: state.coins + q.reward.coins,
        quests: state.quests.map(qq =>
          qq.id === questId ? { ...qq, claimed: true } : qq),
      },
    };
  }
  ```
- `src/state.js` — `createInitialState()` adds:
  ```js
  saveSeed: state.saveSeed ?? Math.random().toString(36).slice(2, 10),
  quests: rollQuests(state.saveSeed ?? "fresh", 1, "spring"),
  ```
- `src/GameScene.js`:
  - `openSeason()` — replaces `state.quests = rollQuests(state.saveSeed, state.year, currentSeasonName)`.
  - `commitChain()` — for every resource in the chain payload, fire
    `state.quests = state.quests.map(q => tickQuest(q, {type:"collect",key,amount}))`,
    plus one `chain` event with `length`.
  - `bake()` / `craft()` — fire `{type:"craft", item, count}` per craft.
  - `commitOrder()` — fire `{type:"order"}`.
  - `useTool(tool)` — fire `{type:"tool", tool}`.
  - `dispatch("CLAIM_QUEST", questId)` — calls `claimQuest`, applies new state, fires
    `awardXp(20)` (handled by 7.2), spawns a `+<coins>◉` floater.
- `src/ui.jsx` — new `<QuestPanel>` component lists 6 cards with progress bars and a
  Claim button enabled only when `progress >= target && !claimed`.

**Manual Verify Walk-through:**
1. Fresh save. Console: `gameState.quests.length === 6`. Each quest has unique `id`,
   `progress: 0`, `claimed: false`, `reward.xp === 20`.
2. Force `OPEN_SEASON` to summer. Confirm `gameState.quests` is a *new* array of 6
   (different `id`s, likely different templates).
3. Set `gameState.quests[0]` to a hay quest with target 10 progress 0. Chain 6 hay.
   Confirm progress = 6. Chain 5 more — confirm capped at 10 (target).
4. Click Claim on the now-complete quest. Confirm coins increased by quest reward,
   `claimed === true`, button disabled.
5. Click Claim again — nothing happens (no double-pay).
6. Force-set every quest progress to target. Force `OPEN_SEASON` — all 6 unclaimed
   quests are gone (replaced), claimed ones are gone too (full refresh).
7. Save → reload. Confirm `gameState.quests` matches pre-reload state including
   progress and `claimed`.
8. `runSelfTests()` passes all 7.1 assertions.

---

### 7.2 — 5-tier almanac with structural reward at tier 5

**What this delivers:** The almanac is an XP track that levels every 150 XP per
§17 (locked — linear curve, do not redesign). XP enters from five sources at
locked rates: chain commits (+1), order delivery (+5), building built (+10),
boss defeated (+25), quest claim (+20 — reward from 7.1). A 5-row tier strip in
the almanac panel lights each row green as `level` crosses its threshold; the
player taps Claim on each row to collect the reward. Tier 1 = +50◉ at level 1,
tier 2 = +1 Seedpack at level 2, tier 3 = +75◉ + 1 Lockbox at level 3, tier 4
= +1 Reshuffle Horn at level 4. **Tier 5 (level 5) is a structural reward: it
sets `state.tools.startingExtraScythe = true`, and on every subsequent session
load the game adds `+1` to `state.tools.scythe` at init.** The §16 spec defines
10 tiers; Phase 7 ships 5 with a `TODO` for the rest in 7.2's implementation
notes.

**Completion Criteria:**
- [ ] `src/features/almanac/data.js` exports `XP_PER_LEVEL = 150` (re-export for
  consumers; the constant lives in §17 — locked)
- [ ] `src/features/almanac/data.js` exports `ALMANAC_TIERS` array of 5 entries:
  `{ tier, level, reward: { coins?, tools?, structural? } }`
- [ ] Pure `awardXp(state, amount)` returns `{ newState, leveledTo }` where
  `leveledTo` is the new level if this gain crossed a threshold, else `null`
- [ ] Pure `claimAlmanacTier(state, tier)` returns `{ ok, newState }`
- [ ] `state.almanac = { xp: 0, level: 1, claimed: { 1:false, 2:false, 3:false, 4:false, 5:false } }`
  on fresh init
- [ ] XP sources locked per §17: `+1` on `commitChain`, `+5` on `commitOrder`,
  `+10` on `build`, `+25` on `defeatBoss`, `+20` on `claimQuest` (calls into 7.1)
- [ ] At 150 XP, level flips 1 → 2; at 300 XP, 2 → 3; etc. Linear, never resets.
- [ ] Claiming a tier sets `claimed[N] = true` and applies the reward to state
- [ ] Re-claiming the same tier: `{ ok: false }`, no double-pay
- [ ] Claiming a tier the player hasn't reached (`level < tier`): `{ ok: false }`
- [ ] Tier 5 claim sets `state.tools.startingExtraScythe = true` (boolean flag,
  not a counter)
- [ ] On session load, if `startingExtraScythe === true`, init adds `+1` to
  `state.tools.scythe` for that session
- [ ] Tier 6 does not exist — `claimAlmanacTier(state, 6)` returns `{ ok: false }`
- [ ] Implementation notes include `// TODO: phase 11+ extends to tier 10 per
  GAME_SPEC §16` (cosmetic & blueprint rewards, deferred)

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { XP_PER_LEVEL, ALMANAC_TIERS, awardXp, claimAlmanacTier }
  from "./features/almanac/data.js";
import { createInitialState } from "./state.js";

// §17 locked: 150 XP/level, linear
assert(XP_PER_LEVEL === 150, "XP_PER_LEVEL locked at 150 (§17)");

// 5 tiers, structural reward at tier 5
assert(ALMANAC_TIERS.length === 5, "Phase 7 ships exactly 5 tiers");
assert(ALMANAC_TIERS[0].tier === 1 && ALMANAC_TIERS[0].reward.coins === 50,
       "tier 1 = +50◉");
assert(ALMANAC_TIERS[1].reward.tools?.seedpack === 1, "tier 2 = +1 Seedpack");
assert(ALMANAC_TIERS[2].reward.coins === 75
       && ALMANAC_TIERS[2].reward.tools?.lockbox === 1,
       "tier 3 = +75◉ + 1 Lockbox");
assert(ALMANAC_TIERS[3].reward.tools?.reshuffle === 1, "tier 4 = +1 Reshuffle Horn");
assert(ALMANAC_TIERS[4].reward.structural === "startingExtraScythe",
       "tier 5 = structural startingExtraScythe");

// Fresh state: tier 1, 0 xp, nothing claimed
const fresh = createInitialState();
assert(fresh.almanac.xp === 0,        "fresh xp = 0");
assert(fresh.almanac.level === 1,     "fresh level = 1");
assert(fresh.almanac.claimed[1] === false, "tier 1 unclaimed");
assert(fresh.almanac.claimed[5] === false, "tier 5 unclaimed");

// XP gain — chain commit (+1)
let r = awardXp(fresh, 1);
assert(r.newState.almanac.xp === 1,   "chain commit awards 1 xp");
assert(r.newState.almanac.level === 1,"still level 1");
assert(r.leveledTo === null,          "no level-up at 1 xp");

// Crossing 150 xp flips level 1 → 2
r = awardXp(fresh, 150);
assert(r.newState.almanac.xp === 150, "150 xp banked");
assert(r.newState.almanac.level === 2,"level 1 → 2 at 150");
assert(r.leveledTo === 2,             "leveledTo reports 2");

// 300 xp → level 3 (linear, no reset)
r = awardXp(fresh, 300);
assert(r.newState.almanac.level === 3,"linear curve: 300 → level 3");

// Claim tier 1 — pays coins
let s = { ...fresh, almanac: { ...fresh.almanac, level: 2 }, coins: 0 };
let c = claimAlmanacTier(s, 1);
assert(c.ok === true,                            "tier 1 claim ok at level 2");
assert(c.newState.coins === 50,                  "tier 1 pays 50◉");
assert(c.newState.almanac.claimed[1] === true,   "tier 1 marked claimed");

// Re-claim is a no-op
const c2 = claimAlmanacTier(c.newState, 1);
assert(c2.ok === false,                          "re-claim rejected");
assert(c2.newState.coins === 50,                 "no double-pay");

// Claiming a tier above current level → no-op
s = { ...fresh, almanac: { ...fresh.almanac, level: 1 } };
const cBlocked = claimAlmanacTier(s, 3);
assert(cBlocked.ok === false,                    "tier 3 blocked at level 1");
assert(cBlocked.newState.almanac.claimed[3] === false, "no flip");

// Tier 5 claim flips structural flag
s = { ...fresh, almanac: { xp: 600, level: 5,
       claimed: { 1:true, 2:true, 3:true, 4:true, 5:false } },
       tools: { scythe: 1, seedpack: 0, lockbox: 0, reshuffle: 0,
                startingExtraScythe: false } };
const c5 = claimAlmanacTier(s, 5);
assert(c5.ok === true,                                       "tier 5 claim ok");
assert(c5.newState.tools.startingExtraScythe === true,       "structural flag set");
assert(c5.newState.almanac.claimed[5] === true,              "tier 5 marked claimed");

// Tier 6 does not exist
const c6 = claimAlmanacTier(c5.newState, 6);
assert(c6.ok === false, "tier 6 not yet implemented (deferred to phase 11+)");

// Fresh-session bonus: startingExtraScythe adds +1 scythe at init
const reborn = createInitialState({ tools: { startingExtraScythe: true,
                                             scythe: 0, seedpack: 0,
                                             lockbox: 0, reshuffle: 0 } });
assert(reborn.tools.scythe === 1, "fresh session with flag = +1 scythe");
const noBonus = createInitialState({ tools: { startingExtraScythe: false,
                                              scythe: 0, seedpack: 0,
                                              lockbox: 0, reshuffle: 0 } });
assert(noBonus.tools.scythe === 0, "no flag = no bonus scythe");
```
Run — confirm: `Cannot find module './features/almanac/data.js'`.

*Gameplay simulation (player at end of summer year 1, ~80 chains, 12 orders,
3 buildings, 2 quest claims):*
The player opens the almanac panel. XP bar shows 80×1 + 12×5 + 3×10 + 2×20 =
210 XP. Level reads `2 / 5`, bar at `60/150` toward level 3. Tier 1 row is green
("+50◉ — Claim"); tier 2 row is also green ("+1 Seedpack — Claim"); tiers 3–5
are grey with their level requirement printed. They tap Claim on tier 1 — 50◉
floater, row turns "Claimed" with a checkmark. Tap tier 2 — Seedpack badge
animates into the tools rail. Five sessions later they reach level 5 and tap
the tier 5 row. A different-looking modal opens: gold border, "Permanent —
Starting Extra Scythe. From now on, every new session begins with +1 Scythe."
They quit. Next session opens with `tools.scythe = 1` instead of `0` — visible
in the tools rail before they make a single move.

Designer reflection: *Does the structural tier-5 reward feel like a *real*
permanent gift (the player notices it on next session start), or does it slip
past unnoticed because the Scythe count change is silent? Should we fire a
"Welcome back — your extra Scythe is ready" floater on the first session after
the structural flag flips, the way Phase 3.5's daily login modal greets the
player?*

**Implementation:**
- New file `src/features/almanac/data.js`:
  ```js
  // §17 locked: linear curve, 150 XP per level. Do not redesign.
  export const XP_PER_LEVEL = 150;

  // Phase 7 ships tiers 1–5. §16 calls for 10 tiers total.
  // TODO: phase 11+ extends to tier 10 per GAME_SPEC §16
  //       (crafting blueprints + cosmetic unlocks at tiers 6–10).
  export const ALMANAC_TIERS = [
    { tier: 1, level: 1, reward: { coins: 50 } },
    { tier: 2, level: 2, reward: { tools: { seedpack: 1 } } },
    { tier: 3, level: 3, reward: { coins: 75, tools: { lockbox: 1 } } },
    { tier: 4, level: 4, reward: { tools: { reshuffle: 1 } } },
    { tier: 5, level: 5, reward: { structural: "startingExtraScythe" } },
  ];

  export function awardXp(state, amount) {
    const xp = (state.almanac?.xp ?? 0) + amount;
    const level = Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
    const prev = state.almanac?.level ?? 1;
    return {
      leveledTo: level > prev ? level : null,
      newState: {
        ...state,
        almanac: { ...state.almanac, xp, level },
      },
    };
  }

  export function claimAlmanacTier(state, tier) {
    const def = ALMANAC_TIERS.find(t => t.tier === tier);
    if (!def) return { ok: false, newState: state };
    if (state.almanac.claimed[tier]) return { ok: false, newState: state };
    if (state.almanac.level < def.level) return { ok: false, newState: state };
    let next = { ...state,
      almanac: { ...state.almanac,
        claimed: { ...state.almanac.claimed, [tier]: true } } };
    if (def.reward.coins) next.coins = (next.coins ?? 0) + def.reward.coins;
    if (def.reward.tools) {
      next.tools = { ...next.tools };
      for (const [k, v] of Object.entries(def.reward.tools)) {
        next.tools[k] = (next.tools[k] ?? 0) + v;
      }
    }
    if (def.reward.structural === "startingExtraScythe") {
      next.tools = { ...next.tools, startingExtraScythe: true };
    }
    return { ok: true, newState: next };
  }
  ```
- `src/state.js` — `createInitialState(overrides)` — add the almanac slice and
  apply the structural flag at session init:
  ```js
  almanac: { xp: 0, level: 1,
             claimed: { 1:false, 2:false, 3:false, 4:false, 5:false } },
  tools: {
    scythe: (overrides?.tools?.startingExtraScythe ? 1 : 0),
    seedpack: 0, lockbox: 0, reshuffle: 0,
    startingExtraScythe: !!overrides?.tools?.startingExtraScythe,
    ...overrides?.tools,
  },
  ```
  (preserving `startingExtraScythe` across saves; merge with save schema).
- `src/GameScene.js` — XP hook points (each calls `awardXp` and replaces state):
  - `commitChain()` after collection: `awardXp(state, 1)`
  - `commitOrder()` after pay: `awardXp(state, 5)`
  - `build()` after build: `awardXp(state, 10)`
  - `defeatBoss()` after reward: `awardXp(state, 25)`
  - `dispatch("CLAIM_QUEST")` (from 7.1) after `claimQuest`: `awardXp(state, 20)`
  - On `leveledTo !== null`: spawn `"Almanac Lvl <N>!"` floater + soft chime.
- `src/ui.jsx` — `<AlmanacPanel>` lists `ALMANAC_TIERS` with state-driven row
  classes (`.locked`, `.ready`, `.claimed`) and a Claim button per row.

**Manual Verify Walk-through:**
1. Fresh save. Console: `gameState.almanac` shows `{xp:0, level:1, claimed:{1:false,...,5:false}}`.
2. Force `awardXp(gameState, 150)`. Confirm `level === 2`, `xp === 150`, "Almanac
   Lvl 2!" floater fires.
3. Open almanac panel. Tier 1 + Tier 2 rows are green. Tap Claim on tier 1 —
   coins +50, row turns "Claimed". Tap again — nothing happens.
4. Tap Claim on tier 5 (still locked at level 2) — nothing happens, row stays grey.
5. Force `gameState.almanac.level = 5`, `claimed[1..4] = true`. Tap Claim tier 5.
   Confirm `gameState.tools.startingExtraScythe === true`. Confirm tools.scythe is
   *not* immediately +1 (the flag affects *next* session, not this one).
6. Refresh page. Confirm `gameState.tools.scythe` is `+1` higher than it would be
   without the flag (compare to a reset save with no flag).
7. `runSelfTests()` passes all 7.2 assertions.

---

### 7.3 — Achievement counters wired to live game events

**What this delivers:** A counters bag that ticks during normal play — chains
committed, orders fulfilled, bosses defeated, festival wins, distinct resources
chained, distinct buildings built, supplies converted (Phase 3) — and an
`ACHIEVEMENTS` list mapping each counter to one or more thresholds. When a
counter crosses a threshold, the matching achievement flips to `unlocked: true`
and a discreet `"Achievement unlocked: <name>"` floater rises near the HUD.
Counters and unlocks persist in the save so a player who hits 3 of 4 bosses
across two sessions still unlocks "Champion" on the 4th. At least 10 achievements
ship in Phase 7; Phase 11 polish can layer cosmetics on top.

**Completion Criteria:**
- [ ] `src/features/achievements/data.js` exports `ACHIEVEMENTS` array of ≥10
  entries: `{ id, name, counter, threshold }`
- [ ] `state.achievements = { counters: {...}, unlocked: {...} }` on fresh init,
  with all 7 counters at `0` and all `ACHIEVEMENTS` keys at `false`
- [ ] Counters initialised: `chains_committed`, `orders_fulfilled`,
  `bosses_defeated`, `festival_won`, `distinct_resources_chained`,
  `distinct_buildings_built`, `supplies_converted`
- [ ] Pure `tickAchievement(state, counter, value=1, key?)` returns
  `{ newState, unlocked: [...ids] }`
- [ ] `chains_committed` increments by 1 per chain commit
- [ ] `orders_fulfilled` increments by 1 per `commitOrder`
- [ ] `bosses_defeated` increments by 1 per `defeatBoss`
- [ ] `festival_won` increments by 1 when `flags.isWon` flips true (Phase 2 hook)
- [ ] `distinct_resources_chained` increments by 1 the *first* time each
  resource key is chained (tracked via `state.achievements.seenResources` set)
- [ ] `distinct_buildings_built` increments by 1 the *first* time each
  building id is built (tracked via `state.achievements.seenBuildings` set)
- [ ] `supplies_converted` increments by `count` per Phase 3 supply conversion
- [ ] When any counter crosses its threshold, the corresponding achievement
  unlocks; `unlocked: [...ids]` reports the freshly-unlocked ids that tick
- [ ] Unlock is *idempotent*: incrementing past the threshold a second time
  does NOT re-fire (no duplicate floaters)
- [ ] A fresh-state tick of any counter to value 0 fires *no* unlocks (since
  no achievement has threshold 0)
- [ ] Save/reload preserves `counters`, `unlocked`, `seenResources`,
  `seenBuildings` exactly

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { ACHIEVEMENTS, tickAchievement } from "./features/achievements/data.js";
import { createInitialState } from "./state.js";

// ≥10 achievements, every entry shaped correctly
assert(ACHIEVEMENTS.length >= 10, "≥10 achievements registered in Phase 7");
assert(ACHIEVEMENTS.every(a => a.id && a.name && a.counter && a.threshold > 0),
       "every achievement has id, name, counter, threshold > 0");
assert(ACHIEVEMENTS.find(a => a.id === "first_steps")?.threshold === 1,
       "first_steps unlocks at 1 chain");
assert(ACHIEVEMENTS.find(a => a.id === "champion")?.threshold === 4,
       "champion unlocks at 4 bosses");
assert(ACHIEVEMENTS.find(a => a.id === "true_keeper")?.counter === "festival_won",
       "true_keeper tracks festival wins");

// Fresh state — all counters 0, no unlocks
const fresh = createInitialState();
assert(fresh.achievements.counters.chains_committed === 0,        "chains 0");
assert(fresh.achievements.counters.orders_fulfilled === 0,        "orders 0");
assert(fresh.achievements.counters.bosses_defeated === 0,         "bosses 0");
assert(fresh.achievements.counters.festival_won === 0,            "festival 0");
assert(fresh.achievements.counters.distinct_resources_chained === 0, "distinct res 0");
assert(fresh.achievements.counters.distinct_buildings_built === 0,   "distinct bld 0");
assert(fresh.achievements.counters.supplies_converted === 0,       "supplies 0");
assert(Object.values(fresh.achievements.unlocked).every(v => v === false),
       "no achievements unlocked on fresh state");

// First chain commit unlocks first_steps
let r = tickAchievement(fresh, "chains_committed");
assert(r.newState.achievements.counters.chains_committed === 1, "counter ticked");
assert(r.newState.achievements.unlocked.first_steps === true,
       "first_steps unlocked at 1");
assert(r.unlocked.includes("first_steps"), "unlock reported in result");

// Second chain — counter ticks but no new unlock fires
let r2 = tickAchievement(r.newState, "chains_committed");
assert(r2.newState.achievements.counters.chains_committed === 2, "ticked to 2");
assert(r2.unlocked.length === 0, "no fresh unlock at 2 (idempotent)");
assert(r2.newState.achievements.unlocked.first_steps === true,
       "still unlocked, not re-flipped");

// Distinct-resource counter only ticks first time per key
let s = fresh;
s = tickAchievement(s, "distinct_resources_chained", 1, "hay").newState;
assert(s.achievements.counters.distinct_resources_chained === 1,
       "first hay chain ticks distinct counter");
s = tickAchievement(s, "distinct_resources_chained", 1, "hay").newState;
assert(s.achievements.counters.distinct_resources_chained === 1,
       "second hay does NOT tick distinct counter");
s = tickAchievement(s, "distinct_resources_chained", 1, "wheat").newState;
assert(s.achievements.counters.distinct_resources_chained === 2,
       "wheat ticks distinct (2 distinct now)");

// Champion threshold (4 bosses) — only fires on the 4th tick
s = fresh;
for (let i = 0; i < 3; i++) s = tickAchievement(s, "bosses_defeated").newState;
assert(s.achievements.unlocked.champion === false, "still locked at 3 bosses");
const r4 = tickAchievement(s, "bosses_defeated");
assert(r4.newState.achievements.unlocked.champion === true,
       "champion unlocks at 4 bosses");
assert(r4.unlocked.includes("champion"), "champion in unlocked report");

// 5th boss — no re-fire
const r5 = tickAchievement(r4.newState, "bosses_defeated");
assert(r5.unlocked.length === 0, "no re-unlock at 5 bosses");

// Festival win counter
const rWin = tickAchievement(fresh, "festival_won");
assert(rWin.newState.achievements.counters.festival_won === 1, "festival ticked");
assert(rWin.newState.achievements.unlocked.true_keeper === true,
       "true_keeper unlocks on first win");
```
Run — confirm: `Cannot find module './features/achievements/data.js'`.

*Gameplay simulation (player mid-Act-2, has played ~30 minutes):*
The player chains 5 hay (their 11th chain commit ever). The chain animates,
resources go to inventory, and a small floater rises *above* the HUD coin
display: `Achievement unlocked: Patient Hands (10 chains)`. They don't get a
modal — just a quiet line and a soft ping. Two minutes later, mid-bake, they
deliver their 5th order — `Achievement unlocked: Trusted Friend (5 orders)`.
Later that session they build the Mill (their 4th distinct building) — another
floater fires. Each unlock feels noticed but not interruptive. After defeating
Frostmaw (boss 1 of 4), their `bosses_defeated` counter is 1 — no champion
unlock yet. Three more bosses across two sessions fire the champion floater
on the 4th defeat. Save the game, refresh — counters all preserved, unlocks
all preserved, the 4 already-unlocked achievements show their gold checkmark
in the achievements panel.

Designer reflection: *Is a single-line floater the right unlock celebration,
or does crossing a milestone deserve a 1-second modal? Are 10 achievements
enough variety, or does the player feel they're chasing the same "do more X"
template each time?*

**Implementation:**
- New file `src/features/achievements/data.js`:
  ```js
  export const ACHIEVEMENTS = [
    { id: "first_steps",     name: "First Steps",       counter: "chains_committed",         threshold: 1 },
    { id: "patient_hands",   name: "Patient Hands",     counter: "chains_committed",         threshold: 10 },
    { id: "tireless",        name: "Tireless",          counter: "chains_committed",         threshold: 100 },
    { id: "trusted_friend",  name: "Trusted Friend",    counter: "orders_fulfilled",         threshold: 5 },
    { id: "village_voice",   name: "Village Voice",     counter: "orders_fulfilled",         threshold: 25 },
    { id: "first_blood",     name: "First Blood",       counter: "bosses_defeated",          threshold: 1 },
    { id: "champion",        name: "Champion",          counter: "bosses_defeated",          threshold: 4 },
    { id: "true_keeper",     name: "True Keeper of the Vale", counter: "festival_won",       threshold: 1 },
    { id: "naturalist",      name: "Naturalist",        counter: "distinct_resources_chained", threshold: 8 },
    { id: "polymath",        name: "Polymath",          counter: "distinct_resources_chained", threshold: 15 },
    { id: "town_planner",    name: "Town Planner",      counter: "distinct_buildings_built", threshold: 5 },
    { id: "supply_chain",    name: "Supply Chain",      counter: "supplies_converted",       threshold: 10 },
  ];

  export function tickAchievement(state, counter, value = 1, key) {
    const ach = state.achievements;
    let counters = ach.counters;
    let seenResources = ach.seenResources;
    let seenBuildings = ach.seenBuildings;

    if (counter === "distinct_resources_chained" && key) {
      if (seenResources?.[key]) return { newState: state, unlocked: [] };
      seenResources = { ...(seenResources ?? {}), [key]: true };
      counters = { ...counters, [counter]: (counters[counter] ?? 0) + 1 };
    } else if (counter === "distinct_buildings_built" && key) {
      if (seenBuildings?.[key]) return { newState: state, unlocked: [] };
      seenBuildings = { ...(seenBuildings ?? {}), [key]: true };
      counters = { ...counters, [counter]: (counters[counter] ?? 0) + 1 };
    } else {
      counters = { ...counters, [counter]: (counters[counter] ?? 0) + value };
    }

    const newCount = counters[counter];
    const prevCount = ach.counters[counter] ?? 0;
    const newlyUnlocked = [];
    const unlocked = { ...ach.unlocked };
    for (const a of ACHIEVEMENTS) {
      if (a.counter !== counter) continue;
      if (unlocked[a.id]) continue;
      if (prevCount < a.threshold && newCount >= a.threshold) {
        unlocked[a.id] = true;
        newlyUnlocked.push(a.id);
      }
    }
    return {
      newState: {
        ...state,
        achievements: { ...ach, counters, unlocked, seenResources, seenBuildings },
      },
      unlocked: newlyUnlocked,
    };
  }
  ```
- `src/state.js` — `createInitialState()` adds:
  ```js
  achievements: {
    counters: {
      chains_committed: 0, orders_fulfilled: 0, bosses_defeated: 0,
      festival_won: 0, distinct_resources_chained: 0,
      distinct_buildings_built: 0, supplies_converted: 0,
    },
    unlocked: Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, false])),
    seenResources: {}, seenBuildings: {},
  },
  ```
- `src/GameScene.js` — wire the counter ticks to live events:
  - `commitChain()` — once per chain: `tickAchievement(s, "chains_committed")`,
    then for each unique resource in the chain payload:
    `tickAchievement(s, "distinct_resources_chained", 1, key)`
  - `commitOrder()` — `tickAchievement(s, "orders_fulfilled")`
  - `build(id)` — `tickAchievement(s, "distinct_buildings_built", 1, id)`
  - `defeatBoss()` — `tickAchievement(s, "bosses_defeated")`
  - On `flags.isWon` flip in story evaluator (Phase 2 hook):
    `tickAchievement(s, "festival_won")`
  - Phase 3 supply conversion: `tickAchievement(s, "supplies_converted", count)`
  - On `unlocked.length > 0`: for each id, look up display name in
    `ACHIEVEMENTS`, spawn floater `"Achievement unlocked: <name>"` with a
    soft chime (reuse `playPing()`).
- `src/ui.jsx` — `<AchievementsPanel>` renders the 12 entries with checkmark
  for unlocked, progress text for locked (`"3 / 4 bosses defeated"`).

**Manual Verify Walk-through:**
1. Fresh save. Console: `gameState.achievements.counters` all 0, `unlocked`
   all false, `seenResources`/`seenBuildings` empty objects.
2. Chain 5 hay. Confirm `chains_committed === 1`, `distinct_resources_chained === 1`,
   `unlocked.first_steps === true`, "Achievement unlocked: First Steps" floater.
3. Chain 5 more hay. Confirm `chains_committed === 2`, distinct counter still 1
   (hay already seen), no new unlocks.
4. Chain wheat. Confirm `distinct_resources_chained === 2`.
5. Force `bosses_defeated` to 3 via 3 ticks. Confirm `unlocked.champion === false`.
   Tick once more — confirm `unlocked.champion === true`, floater fires.
6. Tick `bosses_defeated` again — counter ticks to 5, no new floater (idempotent).
7. Save → refresh. Confirm `gameState.achievements` matches pre-reload exactly,
   including `seenResources`.
8. `runSelfTests()` passes all 7.3 assertions.

---

## Phase 7 Sign-off Gate

Play 3 multi-season playthroughs from a fresh save covering: a *quest-focused*
run (claim every quest possible across 4 seasons; expect almanac level ≈ 4),
a *boss-focused* run (push to 4 boss kills for champion), and a *full-arc*
run that wins the Festival and lands `true_keeper`. Before moving to Phase 8,
confirm all:

- [ ] 7.1–7.3 Completion Criteria all checked
- [ ] **First season generates 6 quests; closing the season replaces all 6**
  with a new template+target roll, and unclaimed quests are gone (intentional)
- [ ] **Reaching almanac tier 5 grants a permanent extra starting Scythe** —
  verified by claiming tier 5, refreshing the page, and confirming
  `state.tools.scythe` is `+1` higher on session init than before the claim
- [ ] **10+ achievements unlock during a full Phase 2 win playthrough** —
  first_steps, patient_hands, trusted_friend, village_voice, first_blood,
  naturalist, town_planner, true_keeper at minimum
- [ ] **Quest XP rewards (20 per claim) advance the almanac level alongside
  chain XP** — claim 3 quests in a session, confirm 60 XP banked from quests
  appears on the almanac progress bar
- [ ] **Collect-resource quests track Phase 4 worker bonus_yield correctly** —
  hire Hilda for `+1 hay yield`, chain 5 hay, confirm the hay quest progress
  ticks by 6 (5 base + 1 bonus), not 5
- [ ] Save/reload at any point preserves quests, almanac level + XP + claimed
  flags, achievement counters and unlocks, `startingExtraScythe` flag
- [ ] `DEV/RESET_GAME` zeroes all 7 counters, sets `unlocked` all false,
  drops `quests` back to a fresh `OPEN_SEASON` roll, sets `almanac.xp = 0`
  and `level = 1`, clears `claimed[1..5]`, clears `startingExtraScythe`
- [ ] Tier 6 of the almanac is *not* clickable, *not* listed, and the panel
  shows a "More tiers coming soon" hint per the §16 deferred 6–10 plan
- [ ] No achievement double-fires; no quest pays twice; no almanac tier
  grants its reward more than once across a 30-minute play session
- [ ] `runSelfTests()` passes for all Phase 7 tests
- [ ] Designer gut-check: *Does the season transition feel like a fresh
  start (new quests, new market drift from Phase 3, new dialog from Phase 6)
  or a chore reset where the player shrugs at six new bars to fill?*
