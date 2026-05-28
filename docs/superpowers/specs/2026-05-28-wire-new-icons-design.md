# Wire newly-added icons into the game UI (Buckets 1 + 2)

**Date:** 2026-05-28
**Status:** Approved (design) — pending spec review
**Scope:** Wire the ~80 newly-registered procedural icons that have an existing
home in the game so they render in-game and stop showing as "Unused" in the Dev
Panel Icons tab. Defer the ~29 icons whose underlying feature does not yet exist
(Bucket 3) to a separate spec.

## Background

PR #691 registered 109 new procedural icons across four category modules
(`achievements.js`, `quests.js`, `currencies.js`, `fixed-icons.js`). They are
present in `ICON_REGISTRY` and browsable in the Dev Panel (`/b/` → Icons), but
most carry the gray **"Unused"** badge because nothing in game data or UI code
references their keys. `getUsedIconKeys()` (`src/balanceManager/iconUsage.ts`)
only flags a key "used" when a catalog (ITEMS, RECIPES, SEASONS, ABILITIES,
workers, tools, bosses, decorations) or a hardcoded list references it.

This spec wires every icon that maps to a system **that already exists**.

## Rendering mechanism (single path)

All UI icons render through one component:

```tsx
// src/ui/Icon.tsx
<Icon iconKey={key} size={N} title={label} />
```

`Icon` looks `key` up in `ICON_REGISTRY`, bakes it to a DPR-aware canvas, caches
the data URI, and returns an `<img>`. Missing keys render a `?` placeholder.
Every change in this spec reduces to "supply the correct key to an `<Icon>` (or
to an `iconKey`/`icon` data field that a card already renders)."

No change to `Icon.tsx`, `iconRegistry.ts`, or the icon source modules is
required — the icons already exist.

## Bucket 1 — data / constants wiring (feature + UI panel both exist)

### Achievements (27 keys: `ach_<id>`)
- **Keys ↔ ids:** the 27 `ach_*` keys match the 27 `ACHIEVEMENTS[].id` values
  1:1 (`first_steps` ↔ `ach_first_steps`, …). Verified.
- **Data:** `AchievementDef.icon?: string` already exists
  (`src/features/achievements/data.ts:23`). Populate `icon: "ach_<id>"` for each
  entry. (Equivalently, derive `ach_${id}` in the card — but populating the
  field is explicit and matches the existing schema.)
- **UI:** `TrophyCard` (`src/features/achievements/index.tsx:81,95`) reads
  `achievement.icon` and renders it directly. Update so a **string** `icon` is
  rendered via `<Icon iconKey={icon} size={22} />` (locked state keeps
  `LockGlyph`). ReactNode icons, if any remain, still render as-is.

### Quests (6 keys: `quest_collect|craft|order|tool|chain`, `quest_book`)
- **Data:** add `iconKey?: string` to `QuestTemplate`
  (`src/features/quests/templates.ts` / `data.ts`); set `quest_<category>` per
  template category (`collect|craft|order|tool|chain`).
- **UI:** render `<Icon iconKey={tpl.iconKey} size={20} />` in `QuestCard`
  (`src/features/quests/index.tsx`). Use `quest_book` on the quests panel
  header/empty-state.

### Seasons (4 keys: `season_spring|summer|autumn|winter`)
- **Data:** in `SEASONS` (`src/constants.ts:317-320`) replace
  `iconKey: "ui_star"` with the matching `season_*` key per season.
- **UI:** no change — HUD already renders `SEASONS[idx].iconKey`.
  `iconUsage.ts:127` then auto-marks them "used."

### Boons (5 keys: `boon_coin_mult`, `boon_bond_mult`, `boon_chain_mult`,
`boon_branch_coexist`, `boon_branch_drive_out`)
- `BoonDef` has no icon field. Derive the per-boon icon from `effect.type`:
  `coin_gain_mult → boon_coin_mult`, `bond_gain_mult → boon_bond_mult`,
  chain effects → `boon_chain_mult`. Use `boon_branch_coexist` /
  `boon_branch_drive_out` on the coexist vs. drive-out section headers in
  `src/features/boons/index.tsx`. A tiny `boonIconFor(effectType)` helper keeps
  the mapping in one place. No `boon_chain_mult` boon exists today; the key is
  still used on any chain-mult boon added later and on the branch headers.

### Currencies (7 keys: `cur_embers|core_ingot|gems|heirloom`,
`token_hearth_forest|stone|tide`)
- **UI:** the HUD currency chips currently use SVG `design.currency.*` keys
  (`src/ui/Hud.tsx`). Point the embers / core-ingot / gems / heirloom chips and
  the three hearth-token chips at the canvas `cur_*` / `token_*` keys via
  `<Icon iconKey=… />`.
- **Confirm at implementation:** which of `heirloom` and the three tokens are
  live in `state` today; render the icon only where the currency is already
  surfaced (do **not** add new wallet rows in this pass).

## Bucket 2 — existing feature, add an icon field/render

For each, the feature exists; we add an `<Icon>` to its card/panel. Exact prop
names confirmed during implementation.

- **Bond ranks + gifts (11):** townsfolk/NPC card — `bond_rank_1..8` keyed off
  the NPC's bond level, `gift_loves` / `gift_likes` on gift-preference rows,
  `bond_8_arc` at max bond. Files: `src/features/townsfolk/` (or `npcs/`).
- **Regions (5):** `region_forest|moor|mine|harbor|tundra` on zone cards,
  mapped from zone `kind`/`region`. Files: `src/features/cartography/`.
- **Boss (4):** `boss_diff_stars` on boss difficulty display; `keeper_deer_spirit`
  / `keeper_stone_knocker` / `keeper_tidesinger` on the three keeper bosses.
  Files: `src/features/bosses/`.
- **Misc panels (existing UI):** wire each into the panel that already shows the
  concept — `craft_queue` / `craft_queue_skip` (crafting queue),
  `turns_remaining`, `xp_levelup`, `day_night_toggle`, `ability_trigger`,
  `expedition_pack`, `dangers_header`, `daily_chest`, `tutorial_hint`,
  `notif_success` / `notif_fail`. Any whose panel turns out not to exist drops
  to Bucket 3 and is reported, not forced.

## Out of scope (Bucket 3 — separate spec)

These icons reference systems that do not exist yet and require building real
features: `phase_*` (5), `pact_scroll`/`pact_violation`, `choice_log`,
`choice_coexist_drive`, `side_beat`, `cutscene_start`, `banner_*` (5),
`settlement_founded|unfounded|complete`, `old_capital_seal`, `crossroads`,
`festival_recurrence`, `villager_walking`, `audit_bell`, and the four new
decorations `decor_cairn_shrine|topiary|sundial|wind_chime` (no matching
`DecorationId`). Listed here so the follow-up spec has a precise starting set.

## Testing

- **Unit:** a test asserting (a) every key this spec wires resolves in
  `ICON_REGISTRY`; (b) all four `SEASONS[].iconKey` are the `season_*` keys;
  (c) every `ACHIEVEMENTS[].icon` is a registered `ach_*` key; (d) `boonIconFor`
  returns registered keys for each `effect.type`. Extend
  `src/__tests__/` rather than adding a new harness.
- **Icon usage:** optionally assert via `getUsedIconKeys()` that the wired keys
  now report as used (guards against future regressions un-wiring them).
- **Visual:** run `npm run test:visual`; the HUD, achievements, quests, and
  boons panels may shift. Justify each diff; refresh goldens with
  `npm run test:visual:update` for intentional changes and commit them in the
  same PR. (Note: `balance-items-tab` already fails pre-existing on this host —
  platform/timing drift, unrelated.)

## Risks / notes

- Several Bucket 2 panels are described from a survey, not line-verified. The
  implementation plan must confirm each card's render site before editing; any
  family without a real render site is reported and deferred, not stubbed.
- No save-schema change (icons are presentational), so no
  `SAVE_SCHEMA_VERSION` bump.
- Keep wiring presentational: no reducer/state changes, no new currencies,
  no new wallet rows.
