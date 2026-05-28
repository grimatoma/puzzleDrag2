# Wire New Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the ~80 newly-registered "Bucket 1+2" icons render in the live game by feeding their keys to existing UI, so they stop showing "Unused" in the Dev Panel.

**Architecture:** Every icon renders through `<Icon iconKey={key} size={N} />` (`src/ui/Icon.tsx`), which bakes any `ICON_REGISTRY` key to a cached canvas `<img>`. All work is presentational: supply the right key to a card/panel/data field. No reducer, state, or save-schema changes.

**Tech Stack:** React + TypeScript (strict), Vitest, Playwright visual regression. ESLint `no-unused-vars` is an error — only import what you use.

**Spec:** `docs/superpowers/specs/2026-05-28-wire-new-icons-design.md`

**Conventions for every task:**
- After code changes run `npm run typecheck` and `npm run lint`; both must pass before commit.
- Bucket-2 tasks each begin with a **locate** step. If the described render site does **not** exist, do NOT stub it — record the family in the PR description under "Deferred to Bucket 3" and skip the rest of that task.
- Commit messages: imperative, no model identifiers. End each commit body with `https://claude.ai/code/session_01W3BejTMUyHFeQYfkkRPtdW`.

---

## Task 1: Season icons (constants swap)

**Files:**
- Modify: `src/constants.ts:317-320` (`SEASONS`)
- Test: `src/__tests__/new-icons-wiring.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/new-icons-wiring.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { SEASONS } from "../constants.js";
import { ICON_REGISTRY } from "../textures/iconRegistry.js";

describe("season icons wired", () => {
  it("each season uses its season_<name> icon and the key is registered", () => {
    const expected = ["season_spring", "season_summer", "season_autumn", "season_winter"];
    SEASONS.forEach((s, i) => {
      expect(s.iconKey).toBe(expected[i]);
      expect(ICON_REGISTRY[expected[i]]).toBeDefined();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/new-icons-wiring.test.ts`
Expected: FAIL — seasons still use `ui_star`.

- [ ] **Step 3: Implement — swap the four iconKeys**

In `src/constants.ts`, replace the `SEASONS` array bodies:

```ts
export const SEASONS = [
  { name: "Spring", iconKey: "season_spring", bg: 0x7dbd48, fill: 0x8fd85a, accent: 0x5daa35 },
  { name: "Summer", iconKey: "season_summer", bg: 0x8fca45, fill: 0xf6c342, accent: 0xe3a92f },
  { name: "Autumn", iconKey: "season_autumn", bg: 0xb77b3a, fill: 0xd9792d, accent: 0xa65722 },
  { name: "Winter", iconKey: "season_winter", bg: 0x78aaca, fill: 0x91d9ff, accent: 0xd9f6ff },
];
```

- [ ] **Step 4: Run test + typecheck + lint**

Run: `npx vitest run src/__tests__/new-icons-wiring.test.ts && npm run typecheck && npm run lint`
Expected: PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add src/constants.ts src/__tests__/new-icons-wiring.test.ts
git commit -m "Wire season_* icons into SEASONS"
```

---

## Task 2: Achievement icons (data field + card render)

**Files:**
- Modify: `src/features/achievements/data.ts` (add `icon: "ach_<id>"` to all 27 entries)
- Modify: `src/features/achievements/index.tsx:81,95` (`TrophyCard`)
- Test: `src/__tests__/new-icons-wiring.test.ts`

The 27 `ACHIEVEMENTS[].id` values match the 27 `ach_*` keys 1:1 (`first_steps` ↔ `ach_first_steps`, …).

- [ ] **Step 1: Extend the test**

Append to `src/__tests__/new-icons-wiring.test.ts`:

```ts
import { ACHIEVEMENTS } from "../features/achievements/data.js";

describe("achievement icons wired", () => {
  it("every achievement has icon === ach_<id> and the key is registered", () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.icon, a.id).toBe(`ach_${a.id}`);
      expect(ICON_REGISTRY[`ach_${a.id}`], a.id).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/new-icons-wiring.test.ts`
Expected: FAIL — `icon` is undefined on the entries.

- [ ] **Step 3: Populate `icon` on every achievement**

In `src/features/achievements/data.ts`, add `icon: "ach_<id>"` to each of the 27 objects in `ACHIEVEMENTS` (use the entry's own `id`). Example for the first two:

```ts
{ id: "first_steps",   name: "First Steps",   desc: "Complete your first chain", counter: "chains_committed", threshold: 1,  target: 1,  reward: { coins: 25 }, icon: "ach_first_steps" },
{ id: "patient_hands", name: "Patient Hands", desc: "Complete 10 chains",        counter: "chains_committed", threshold: 10, target: 10, reward: { coins: 50 }, icon: "ach_patient_hands" },
```

Repeat for all 27 (`tireless, trusted_friend, village_voice, first_blood, champion, naturalist, polymath, town_planner, supply_chain, first_catch, tide_runner, master_angler, first_strike, deep_digger, mine_master, veg_patron, orchard_friend, pollinator, herder, dairyman, stable_hand, forester, fowler, powerful_keep, ability_artisan`).

- [ ] **Step 4: Render string icons via `<Icon>` in `TrophyCard`**

`TrophyCard` already imports `Icon` (`src/features/achievements/index.tsx:11`). At line 81 the `icon` is read as `ReactNode`. Update the render at line 95 so a **string** icon becomes an `<Icon>`:

```tsx
const icon = (achievement as AchievementDef & { icon?: ReactNode }).icon ?? null;
// ...
{unlocked
  ? (typeof icon === "string" ? <Icon iconKey={icon} size={22} /> : icon)
  : <LockGlyph size={18} />}
```

- [ ] **Step 5: Run test + typecheck + lint**

Run: `npx vitest run src/__tests__/new-icons-wiring.test.ts && npm run typecheck && npm run lint`
Expected: PASS, clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/achievements/ src/__tests__/new-icons-wiring.test.ts
git commit -m "Wire ach_* icons into achievement cards"
```

---

## Task 3: Quest icons (derive from category)

**Files:**
- Modify: `src/features/quests/index.tsx` (`QuestCard` ~line 104; panel header)
- Test: `src/__tests__/new-icons-wiring.test.ts`

The runtime `Quest` carries `category` (`collect|craft|order|tool|chain`), so derive `quest_${category}` in the card — no data field needed.

- [ ] **Step 1: Extend the test**

Append to `src/__tests__/new-icons-wiring.test.ts`:

```ts
describe("quest icons registered", () => {
  it("quest_<category> + quest_book keys all exist", () => {
    for (const k of ["quest_collect","quest_craft","quest_order","quest_tool","quest_chain","quest_book"]) {
      expect(ICON_REGISTRY[k], k).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run test**

Run: `npx vitest run src/__tests__/new-icons-wiring.test.ts`
Expected: PASS (keys already registered — this guards against accidental removal).

- [ ] **Step 3: Render the category icon in `QuestCard`**

Ensure `Icon` is imported at the top of `src/features/quests/index.tsx`:

```tsx
import Icon from "../../ui/Icon.jsx";
```

Inside `QuestCard`'s JSX (the card header row, near the quest label), add the icon. The `q` object has `category`:

```tsx
<Icon iconKey={`quest_${(q as { category?: string }).category ?? "collect"}`} size={20} />
```

Place it immediately before the quest title/label text so it reads as a leading badge.

- [ ] **Step 4: Render `quest_book` on the panel header**

In the quests screen header (the top-level exported component in the same file), add a leading `<Icon iconKey="quest_book" size={22} />` next to the panel title (mirror how the Boons screen header renders its `<Icon>` + title).

- [ ] **Step 5: Run typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/quests/index.tsx src/__tests__/new-icons-wiring.test.ts
git commit -m "Wire quest_* icons into quest cards and panel header"
```

---

## Task 4: Boon icons (effect → icon helper + branch headers)

**Files:**
- Modify: `src/features/boons/index.tsx` (`BoonCard` ~line 67; `BoonScreen` headers ~lines 175/181)
- Test: `src/__tests__/new-icons-wiring.test.ts`

Mapping: `effect.type === "coin_gain_mult" → boon_coin_mult`, `"bond_gain_mult" → boon_bond_mult`, chain effects → `boon_chain_mult`; branch headers use `boon_branch_coexist` / `boon_branch_drive_out`.

- [ ] **Step 1: Extend the test (helper + keys)**

Append to `src/__tests__/new-icons-wiring.test.ts`:

```ts
import { boonIconFor } from "../features/boons/index.jsx";

describe("boon icons wired", () => {
  it("boonIconFor maps effect types to registered keys", () => {
    expect(boonIconFor("coin_gain_mult")).toBe("boon_coin_mult");
    expect(boonIconFor("bond_gain_mult")).toBe("boon_bond_mult");
    expect(boonIconFor("chain_gain_mult")).toBe("boon_chain_mult");
    for (const k of ["boon_coin_mult","boon_bond_mult","boon_chain_mult","boon_branch_coexist","boon_branch_drive_out"]) {
      expect(ICON_REGISTRY[k], k).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/new-icons-wiring.test.ts`
Expected: FAIL — `boonIconFor` not exported.

- [ ] **Step 3: Add and export `boonIconFor` + render**

In `src/features/boons/index.tsx`, add near the top (after imports):

```tsx
export function boonIconFor(effectType: string): string {
  if (effectType === "coin_gain_mult") return "boon_coin_mult";
  if (effectType === "bond_gain_mult") return "boon_bond_mult";
  if (effectType.startsWith("chain")) return "boon_chain_mult";
  return "boon_coin_mult";
}
```

In `BoonCard`, render the effect icon next to the boon name:

```tsx
<Icon iconKey={boonIconFor(boon.effect.type)} size={18} />
```

In `BoonScreen`, add the branch icon to each section header — coexist header (~line 175) and driveout header (~line 181):

```tsx
<div className="hl-heading"><Icon iconKey="boon_branch_coexist" size={16} /> {PATH_LABELS.coexist}</div>
// ...
<div className="hl-heading"><Icon iconKey="boon_branch_drive_out" size={16} /> {PATH_LABELS.driveout}</div>
```

(`Icon` is already imported in this file.)

- [ ] **Step 4: Run test + typecheck + lint**

Run: `npx vitest run src/__tests__/new-icons-wiring.test.ts && npm run typecheck && npm run lint`
Expected: PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/boons/index.tsx src/__tests__/new-icons-wiring.test.ts
git commit -m "Wire boon_* icons into boon cards and branch headers"
```

---

## Task 5: Currency icons in the HUD treasury

**Files:**
- Modify: `src/ui/Hud.tsx` (`CurrencyContent` ~lines 67-92)
- Test: `src/__tests__/new-icons-wiring.test.ts`

- [ ] **Step 1: Extend the test (registry keys)**

Append to `src/__tests__/new-icons-wiring.test.ts`:

```ts
describe("currency icons registered", () => {
  it("cur_*/token_* keys exist", () => {
    for (const k of ["cur_embers","cur_core_ingot","cur_gems","cur_heirloom","token_hearth_forest","token_hearth_stone","token_hearth_tide"]) {
      expect(ICON_REGISTRY[k], k).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run test**

Run: `npx vitest run src/__tests__/new-icons-wiring.test.ts`
Expected: PASS (guard).

- [ ] **Step 3: Swap embers/ingots/gems to canvas keys**

In `CurrencyContent` (`src/ui/Hud.tsx`), change the `rows` iconKeys for embers, ingots, gems (leave `coins` on its SVG `design.currency.coin`):

```tsx
{ iconKey: "cur_embers",     label: "Embers",      value: embers, show: embers > 0 },
{ iconKey: "cur_core_ingot", label: "Core Ingots", value: ingots, show: ingots > 0 },
{ iconKey: "cur_gems",       label: "Gems",        value: gems,   show: gems > 0 },
```

- [ ] **Step 4: Surface the three hearth-token icons**

Replace the single combined `Hearth-Tokens` row with up to three per-token rows so each `token_hearth_*` icon renders when that token is held. First **locate** how individual tokens are stored: inspect `hearthTokenCount` (imported in `Hud.tsx`) and `state` for per-token fields (e.g. `state.hearthTokens?.forest`).

- If individual tokens are tracked, add one row per held token:

```tsx
{ iconKey: "token_hearth_forest", label: "Forest Token", value: 1, show: hasForestToken },
{ iconKey: "token_hearth_stone",  label: "Stone Token",  value: 1, show: hasStoneToken },
{ iconKey: "token_hearth_tide",   label: "Tide Token",   value: 1, show: hasTideToken },
```

- If only an aggregate count exists, keep the single combined row but switch its icon to `token_hearth_forest` and record `token_hearth_stone`/`token_hearth_tide` as **Deferred to Bucket 3** in the PR description.

- [ ] **Step 5: Heirloom**

Check `state` for an heirloom balance (e.g. `state.heirloom`). If present, add a row `{ iconKey: "cur_heirloom", label: "Heirloom", value: heirloom, show: heirloom > 0 }`. If no heirloom state exists, record `cur_heirloom` as **Deferred to Bucket 3** and do not add a row.

- [ ] **Step 6: Run typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/ui/Hud.tsx src/__tests__/new-icons-wiring.test.ts
git commit -m "Wire cur_*/token_* icons into HUD treasury"
```

---

## Task 6: Bond rank + gift icons (townsfolk)

**Files:**
- Modify: townsfolk/NPC card component (locate under `src/features/townsfolk/` or `src/features/npcs/`)

Keys: `bond_rank_1..8`, `gift_loves`, `gift_likes`, `bond_8_arc`.

- [ ] **Step 1: Locate the render site**

Run: `ls src/features/townsfolk src/features/npcs 2>/dev/null; grep -rn "bond\|Bond\|gift\|Gift" src/features/townsfolk src/features/npcs 2>/dev/null | grep -i "level\|rank\|prefer\|loves\|likes" | head`
Identify the NPC card and the field holding the NPC's bond level and gift preferences. If no townsfolk/NPC card renders bonds/gifts, record this family **Deferred to Bucket 3** and stop.

- [ ] **Step 2: Render bond rank**

On the NPC card, where the bond level is shown, add (clamp 1-8):

```tsx
<Icon iconKey={`bond_rank_${Math.min(8, Math.max(1, bondLevel))}`} size={16} />
```

Import `Icon from "../../ui/Icon.jsx"` if not already imported.

- [ ] **Step 3: Render gift preference + max-bond arc**

Where gift preferences render, use `gift_loves` for loved gifts and `gift_likes` for liked gifts:

```tsx
<Icon iconKey={isLoved ? "gift_loves" : "gift_likes"} size={14} />
```

Where an NPC is at max bond (level 8), show the arc-complete badge:

```tsx
{bondLevel >= 8 && <Icon iconKey="bond_8_arc" size={16} />}
```

- [ ] **Step 4: typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/townsfolk src/features/npcs 2>/dev/null
git commit -m "Wire bond_rank_*/gift_*/bond_8_arc icons into townsfolk cards"
```

---

## Task 7: Region icons (cartography zone cards)

**Files:**
- Modify: zone card component under `src/features/cartography/`

Keys: `region_forest`, `region_moor`, `region_mine`, `region_harbor`, `region_tundra`.

- [ ] **Step 1: Locate the zone card + region/kind field**

Run: `grep -rn "region\|kind" src/features/cartography/*.tsx src/features/cartography/data.ts | head -30`
Find where a zone card renders and which field (`region` or `kind`) it exposes. Map values to icons:

```tsx
const REGION_ICON: Record<string, string> = {
  farm: "region_forest", wilds: "region_moor", mine: "region_mine",
  coast: "region_harbor", boss: "region_tundra", capital: "region_tundra",
};
```

(Adjust the left-hand keys to the actual `region`/`kind` values found. If no zone card exists, record **Deferred to Bucket 3** and stop.)

- [ ] **Step 2: Render the region icon on each zone card**

```tsx
<Icon iconKey={REGION_ICON[zone.region] ?? "region_moor"} size={18} />
```

Import `Icon` if needed.

- [ ] **Step 3: typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/features/cartography
git commit -m "Wire region_* icons into cartography zone cards"
```

---

## Task 8: Boss difficulty + keeper icons

**Files:**
- Modify: boss card/UI under `src/features/bosses/`

Keys: `boss_diff_stars`, `keeper_deer_spirit`, `keeper_stone_knocker`, `keeper_tidesinger`.

- [ ] **Step 1: Locate boss UI + keeper ids**

Run: `ls src/features/bosses; grep -rn "difficulty\|keeper\|id:" src/features/bosses/data.* | head -30`
Find the boss card render and the three keeper boss ids. Build a map:

```tsx
const KEEPER_ICON: Record<string, string> = {
  // <keeperBossId>: "keeper_deer_spirit", ... (fill from data)
};
```

If no boss card renders difficulty/keepers, record **Deferred to Bucket 3** and stop.

- [ ] **Step 2: Render difficulty stars + keeper portrait**

```tsx
<Icon iconKey="boss_diff_stars" size={16} />
{KEEPER_ICON[boss.id] && <Icon iconKey={KEEPER_ICON[boss.id]} size={22} />}
```

Import `Icon` if needed.

- [ ] **Step 3: typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/features/bosses
git commit -m "Wire boss_diff_stars and keeper_* icons into boss UI"
```

---

## Task 9: Misc HUD / crafting / panel icons

**Files:**
- Modify: existing panels that already display each concept.

Keys to place, each into the panel that already shows the concept (locate first; defer any with no home): `craft_queue`, `craft_queue_skip` (crafting queue), `turns_remaining` (HUD turn counter), `xp_levelup` (HUD level/XP), `day_night_toggle` (HUD tide), `ability_trigger` (ability cards), `expedition_pack` (expedition entry UI), `dangers_header` (zone dangers list header), `daily_chest` (daily reward), `tutorial_hint` (tutorial bubble), `notif_success` / `notif_fail` (notifications).

- [ ] **Step 1: Locate each concept's render site**

Run: `grep -rn "turnsRemaining\|craft.*queue\|queue\|levelup\|level up\|tide\|danger\|daily\|tutorial\|notif" src/ui src/features --include=*.tsx -l`
For each key, find the existing panel. Group the keys you can place; list any with no existing panel as **Deferred to Bucket 3**.

- [ ] **Step 2: Place each found icon**

For each located concept add a leading `<Icon iconKey="<key>" size={16} />` next to the existing label/value. Examples:

```tsx
// HUD turn counter
<Icon iconKey="turns_remaining" size={14} /> {turnsRemaining}
// HUD level/XP chip
<Icon iconKey="xp_levelup" size={14} />
// crafting queue header / skip button
<Icon iconKey="craft_queue" size={16} />
<Icon iconKey="craft_queue_skip" size={14} />
// zone dangers header
<Icon iconKey="dangers_header" size={16} />
```

Import `Icon` in each file you edit.

- [ ] **Step 3: typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Wire misc HUD/crafting/panel icons (turns, xp, craft queue, dangers, ...)"
```

---

## Task 10: Usage assertion + visual goldens + PR

**Files:**
- Modify: `src/__tests__/new-icons-wiring.test.ts`

- [ ] **Step 1: Add a usage-regression assertion**

Append to `src/__tests__/new-icons-wiring.test.ts`:

```ts
import { getUsedIconKeys } from "../balanceManager/iconUsage.js";

describe("wired icons now report as used", () => {
  it("seasons + achievements keys are in the used set", () => {
    const used = getUsedIconKeys();
    for (const k of ["season_spring","season_summer","season_autumn","season_winter"]) {
      expect(used.has(k), k).toBe(true);
    }
    for (const id of ["first_steps","ability_artisan"]) {
      expect(used.has(`ach_${id}`), id).toBe(true);
    }
  });
});
```

(Achievement keys count as used once `icon` fields are populated — `iconUsage` scans `ITEMS`/catalogs; if achievement icons are not auto-detected, this assertion documents the gap. If it fails because `iconUsage` doesn't scan achievement `icon` fields, extend `getUsedIconKeys()` to add each `ACHIEVEMENTS[].icon`, then re-run.)

- [ ] **Step 2: Run full unit suite**

Run: `npm test`
Expected: all pass.

- [ ] **Step 3: Run visual goldens**

Run: `npm run test:visual`
Expected: HUD / achievements / quests / boons scenarios may diff. Inspect each diff image. For every diff that is the new icon appearing (intended), it is justified. (`balance-items-tab` is a known pre-existing platform failure — ignore.)

- [ ] **Step 4: Refresh intended goldens**

Run: `npm run test:visual:update`
Then re-run `npm run test:visual` to confirm green (except the known `balance-items-tab`).

- [ ] **Step 5: Commit goldens + push + PR**

```bash
git add -A
git commit -m "Add icon-wiring tests and refresh visual goldens"
git push -u origin claude/brave-lovelace-junuT
```

Open a non-draft PR (base `main`) summarizing wired families, listing any "Deferred to Bucket 3" families discovered during locate steps, and the test/visual results. Merge with a **merge commit** (not squash) once CI is green.

---

## Self-review notes

- **Spec coverage:** Bucket 1 (achievements T2, quests T3, seasons T1, boons T4, currencies T5) and Bucket 2 (bonds/gifts T6, regions T7, boss/keepers T8, misc HUD/crafting T9) all have tasks. Testing section → T1-T4 unit asserts + T10 usage/visual. Deferral handling → locate steps in T5-T9.
- **No new state/schema:** all tasks are presentational; no `SAVE_SCHEMA_VERSION` bump.
- **Type/name consistency:** `boonIconFor` name is used identically in T4 code and T4 test; `new-icons-wiring.test.ts` is the single test file extended across tasks.
- **Defer discipline:** every Bucket-2 task (T6-T9) and the uncertain currency rows (T5) start by locating the real render site and explicitly defer rather than stub when absent — matching the spec's "report, don't stub" rule.
