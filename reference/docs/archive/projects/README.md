# docs/archive/projects — completed & dropped project briefs

Implementation briefs from `docs/projects/` whose work has **shipped** (or been
**dropped**) and is therefore now history. They were moved here so the active
board in [`docs/projects/`](../../projects/README.md) shows only live work.

Ordered by **time of completion** (oldest first), grouped by outcome. For the
live status of everything still in flight, see
[`docs/projects/ROADMAP.html`](../../projects/ROADMAP.html).

## ✅ Completed (shipped to main)

| When | # | Brief | Landed as |
|---|---|---|---|
| TS-migration era (≈2026-05) | 11 | [GameScene decomposition](11-gamescene-decomposition.md) | Pure `src/game/*` modules (`chain`/`layout`/`spawnPool`/`juiceCurves`/…) extracted + tested. Substantially done; further extraction optional. |
| 2026-06-17 | 01 | [Quick wins — dormant & dead systems](01-quick-wins-dormant-systems.md) | `f8000034` — `LOGIN_TICK` + `daily_streak` modal, Tomas line, Miner category, seasonal orphans. |
| 2026-06-18 | 06 | [Story editor write-back loop](06-story-editor-writeback-loop.md) | PR #1231 — real `applyStoryOverrides`; `/story/` edits reach the in-game StoryModal. |
| 2026-06-18 | 05 | [AI playtest & balance harness](05-ai-playtest-balance-harness.md) | PR #1233 — headless auto-player `src/playtest/` + `tools/playtest/cli.mjs`. |
| 2026-06-18 | 14 | [Port the docs/zones atlas (one end-to-end)](14-port-zones-atlas.md) | PR #1235 — Mirefen Hollow ported into playable cartography. (~9 further atlas zones remain — tracked separately, not part of this brief.) |
| 2026-06-18 | 08 | [Save migration ladder](08-save-migration-ladder.md) | PR #1237 — `src/state/saveMigrations.ts`; schema bumps no longer wipe saves (live at v47). |

## 🗑️ Dropped (built, then removed at user request)

| When | # | Brief | Outcome |
|---|---|---|---|
| 2026-06-18 | 16 | ["Fiber Crush" match mode](16-new-game-fiber-crush.md) | Merged (PR #1234) then **removed** (PR #1238) — "really poorly implemented". |
| 2026-06-18 | 15 | [Incremental "Hearthkeeping" idle layer](15-new-game-incremental-hearth.md) | Merged (PR #1237) then **removed** (PR #1239). |

> The save-migration ladder the dropped features relied on **stays** on main: the schema is held at **47** and the removed-feature rungs (`MIGRATIONS[45]`/`[46]`) are no-op version bumps — never rolled back (rolling back would wipe live saves as a forward version).
