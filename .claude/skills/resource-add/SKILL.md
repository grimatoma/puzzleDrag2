---
name: resource-add
description: Add a new resource, recipe, tile, or texture with all schema fields populated. Use when adding anything that lives in the multi-file resource pipeline (textures.js + constants.js + recipes + station + UI). Prevents the "+undefined◉" class of bug where one schema slot is silently missed.
---

# resource-add

Adding a resource/tile/recipe in this repo touches 3–5 files. Forget any one and the feature ships visibly broken (8 tool recipes shipped with `+undefined◉` because `coins` was missing — Pass 4 fix).

## When to use

- New tile / resource type (hay-like, ore-like, hazard-like).
- New recipe (workshop, kitchen, powder store).
- New magic tool / portal item.
- New decoration / structural building.

## Schema map

For a **resource** (board tile that can be chained):
- `src/textures.js` — procedural Canvas drawing function + register in `makeTextures()`.
- `src/constants.js` — resource definition in the matching biome's `RESOURCES` map. Include: `key`, `name`, `value`, `threshold` (if upgradeable), `upgradesTo` (next tier), `terminal: true` (if no upgrade).
- Tile pool — add to the biome's `BASE_POOL` if it should spawn naturally.

For a **recipe**:
- `src/constants.js` `RECIPES` (top-level, NOT `WORKSHOP_RECIPES` — that was merged in Pass 2).
- Required fields: `key`, `name`, `station` (`workshop` | `kitchen` | `powder_store`), `inputs` ({key: qty}), one of `coins` (for goods) or `tool` (for tool grants), and `desc` (one-line tooltip).
- For tool recipes, set `tool: "<key>"` and DO NOT set `coins`. The RecipeCard renders `→ {tool name}` for that branch.

For a **magic tool**:
- `src/features/portal/data.js` `MAGIC_TOOLS` map — `key`, `name`, `cost` (Influence), `desc`.
- `src/features/portal/slice.js` `USE_TOOL` reducer — branch for the tool's effect.
- `src/GameScene.js` `changedata-toolPending` listener — Phaser-side handler if it touches the board.
- If the dispatch is pure-slice, **also add `USE_TOOL` to `ALWAYS_RUN_SLICES`** in `state.js` (CLAUDE.md footgun — see check-slice-action skill).

For an **achievement**:
- `src/features/achievements/data.js` — entry with `id`, `name`, `desc`, `requirement`, `reward` (DO NOT skip reward — Pass 3 added these).
- Counter tick: identify the action that should advance the counter and ensure the achievements slice handles it (see Pass 4: `bosses_defeated`, `supplies_converted`, `festival_won`).

## Validation checklist (refuse to commit if any fail)

```
[ ] Texture renders (no white-square fallback)
[ ] Definition has all required fields populated (no undefined)
[ ] Tile pool / station / station-tab includes the new key
[ ] Recipe has BOTH (coins OR tool) AND desc
[ ] If dispatch is pure-slice, registered in SLICE_PRIMARY_ACTIONS
[ ] Tests pass: npm test -- --run
```

## Procedure

1. Read the existing pattern (find one similar entry — e.g. for a new ore, read the `iron` entry).
2. Mirror every field.
3. Run validation checklist.
4. Run tests.
5. Commit with a message matching repo style: `feat: add <thing>` or `fix(qa-pass-N): ...`.

## Common pitfalls

- `WORKSHOP_RECIPES` was merged into `RECIPES` in Pass 2. Don't add new entries to `WORKSHOP_RECIPES` — add to `RECIPES` with `station: "workshop"`.
- For tools, the field is `tool: "<key>"` not `tools: ["<key>"]`.
- `desc` is rendered by RecipeCard as of Pass 3; do not omit it.
- Achievement `reward` is granted on unlock as of Pass 3; do not omit it.
