# Hardcoded config overrides — open items

**Purpose:** Track remaining places where runtime code overrides, duplicates, or ignores catalog/config data.

**Last reconciled:** 2026-06-01 after strict config boundaries, deferred-tool removal, and audit closure pass.

**Resolved in earlier PRs (not listed below):** `isTapTargetPower` replaces `TAP_TARGET_*` sets; `normalizeHazardId`; rats wired on `CHAIN_COLLECTED`; `fillBiasTarget` on fill; `triggerBoss` → `spawnBoss`; farm `SEASON_POOL_MODS` in `GameScene.fillBoard`; `TOOL_CATALOG` from `ITEMS`; `canEnterBiome`; legacy chain actions removed; HUD XP, dialogs default, granary abilities, quest template dedup, festivals modal, hazard/fire BM toggle, and related §12–§19 fixes. Full work log: `docs/superpowers/plans/2026-05-25-config-override-worklog.md`.

**Resolved since (verified against live `src/` on 2026-06-01):**
- `USE_TOOL` `ALIAS` map — gone (canonical tool keys only).
- Hardcoded `TAP_TARGET` set in `state/init.ts` — gone (uses `isTapTargetPower` only).
- Deprecated `applyToolDim(toolKey)` shim — gone (only `applyToolDimForPower` remains).
- `playBoardAnimation` accepts `ms` parameter — wired through `_dur()` per tool.
- `BOARD_ANIM_ALIASES` — wired in `config/boardAnimations.ts`.
- `fertilizerActive` parallel armed path — gone.
- `BOSS_META` duplicate display struct — deleted.
- `BiomeEntryModal.tsx` + `Town.tsx` both use `canEnterBiome`.
- **`DEFERRED_TOOL_POWERS`** — removed; unshipped tools stay out of `ITEMS` until fully wired (backlog in `docs/progression-plan-v2.html` only).
- **`tickModifier`** — wired on `CLOSE_SEASON` in `features/boss/slice.ts`.
- **Boss grid overlays** — `clearModifier` on `BOSS/RESOLVE` and `BOSS/REJECT`; `spawnBoss` + `triggerBoss` apply modifiers to `state.grid`.
- **Crafted order pools** — `craftedOrderPoolForBiome()` derives from `RECIPES` + `CRAFTED_STATIONS_BY_BIOME` (fish has its own station set).
- **`KNOWN_VIEWS`** — auto-collected from `import.meta.glob` on feature `viewKey` exports (+ `town` / `board` shell views); `router-known-views.test.ts` guards drift.
- **Quest almanac XP** — single `QUEST_CLAIM_XP` + `awardXp` for legacy dailies and deterministic quests; duplicate `QUEST_TEMPLATES` removed from `constants.ts`.
- **Fill pool math** — `applySpawnPoolModifiers` in `poolMath.ts` shared by `GameScene.fillBoard` and test fixture `getEffectivePool`; live authority is registry via `_syncWorkerEffects`.
- **Story flag drift** — checklist in `src/flagReads.ts` header comment.

---

## Summary

| Area | Open |
|------|------|
| All tracked rows | **0** |

Optional product backlog (not config-override debt): PR-06 items in `docs/superpowers/plans/2026-05-25-config-override-execution.md` (fish tide config, wolf prey tags, achievement fish pool, portal `MAGIC_TOOLS` dedup).

---

*Execution plan: `docs/superpowers/plans/2026-05-25-config-override-execution.md`.*
