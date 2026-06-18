# puzzleDrag2 — Project Briefs

Each file in this folder is a **self-contained implementation brief**: point a fresh session at one file and it has the goal, the verified current state of the code, the plan, success criteria, and how to validate + double-check. They were authored by agents that read and verified the real source — where a brief corrected a wrong assumption, the correction is flagged inline under **Background & current state (VERIFIED)**.

> How to use: open a new session and say something like *"Implement `docs/projects/03-live-boss-board-modifiers.md`."* The doc is the whole spec.

These docs describe **work to do** — they are not yet implemented. Effort is a rough size (S ≈ hours, M ≈ a day, L ≈ multi-day, XL ≈ a week+).

---

## The briefs

### Quick wins — dormant & dead systems
| # | Brief | Effort | Depends on |
|---|---|---|---|
| 01 | [Quick Wins — Dormant & Dead Systems](01-quick-wins-dormant-systems.md) | S | — |

Four verified one-PR fixes: wire `LOGIN_TICK` on mount **+ add the missing `daily_streak` modal** (dispatch alone shows nothing), un-nest Tomas's reactive line, repoint the dead Miner worker off the non-existent `wood` category, and resolve the two orphaned seasonal folders (`tile_veg_eggplant`, `tile_grass_meadow`). No `SAVE_SCHEMA` bump, no slice footgun.

### Core game-feel & a real second verb
| # | Brief | Effort | Depends on |
|---|---|---|---|
| 02 | [Drag-Build Feedback Ladder (audio + haptics)](02-drag-build-feedback-ladder.md) | S | — |
| 03 | [Live Boss Board Modifiers](03-live-boss-board-modifiers.md) | M | — |
| 04 | [Roguelite Board-Altering Boons](04-roguelite-board-altering-boons.md) | M | 05 (tuning only) |

Note (03): the modifiers **already run live** — the stale `status.ts:63` comment is wrong; the real bug is `fillBoard`/`regenerateBoard` rebuilding tiles with `frozen=false` and wiping the flags. Note (04): the scene can't see `state.boons` — board-visual boons must be bridged through the Phaser registry.

### Progression, world & content
| # | Brief | Effort | Depends on |
|---|---|---|---|
| 06 | [Story Tree Editor Write-Back Loop](06-story-editor-writeback-loop.md) | M | — |
| 07 | [Living Named Town (spatial NPCs)](07-living-named-town.md) | M | 01 (Tomas fix) |
| 12 | [Endgame: Old Capital Finale + Goals Hub](12-endgame-finale-and-goals-hub.md) | M–L | 01 (streak) |
| 14 | [Port the docs/zones Atlas → Playable Zones (one end-to-end)](14-port-zones-atlas.md) | L | 08 (if re-skinning) |

Note (12): the Hearth-token storage keys are camelCase (`heirloomSeed`/`pactIron`/`tidesingerPearl`) — a **real shipped bug** means the map token strip never lights; fix it here. Note (14): recommended first zone is **mirefen**; `resolveLots` already emits tier-correct lots, so the port is mechanical, but design-only resource costs must be remapped to real items to avoid a softlock.

### Economy
| # | Brief | Effort | Depends on |
|---|---|---|---|
| 05 | [AI Playtest & Auto-Balance Harness](05-ai-playtest-balance-harness.md) | L | — |
| 13 | [Economy: Unify the Price Model + Retire the Orphan Market](13-economy-unify-price-model.md) | M | 05 (numbers), 08 (if shape changes) |

Note (13): the real defect is a verified **~10× payout fork** — the same item sells for ~90 via `SELL_RESOURCE`/`applyTrade` but ~9 via `SELL_ITEM`/`sellPriceFor`, decided purely by UI resource-vs-item classification. Note (05): coins = `chainLength × tile value`, so the family-value spread is realized only on **sell/order** and must be measured as realized-value-per-tile.

### Engineering safety net & dev velocity
| # | Brief | Effort | Depends on |
|---|---|---|---|
| 08 | [Save Migration Ladder](08-save-migration-ladder.md) | M | — |
| 09 | [CI Gate for e2e + Visual Smoke](09-ci-e2e-visual-gate.md) | S–M | — |
| 10 | [Self-Describing Slices (kill the footgun)](10-self-describing-slices.md) | M | — |
| 11 | [GameScene.ts Decomposition](11-gamescene-decomposition.md) | L | 09 (net first) |

Note (08): there are **two** version gates (`persistence.ts` + `init.ts`) — make `loadSavedState` return a version-bumped object so both pass. Note (09): infra **landed** (PR #1229) — the `e2e`, `visual-smoke`, and `visual-rebaseline` CI jobs + the Phaser texture-key console-error allowlist. Both `e2e` and `visual-smoke` land **non-blocking**: the first CI run revealed the never-gated e2e suite has **bit-rotted** (32 pass / 31 fail on main — stale fixtures/selectors/balance, NOT a regression). De-rot the specs (and re-baseline the goldens on CI) before flipping either to gating — full inventory in [09 findings](09-ci-e2e-gate-findings.md). Note (10): `ALWAYS_RUN_SLICES` is wrapped by a *stateful* guard that must not be flattened; `CARTO/TRAVEL` is dual-owned. Note (11): the split is **already partly done** — `src/game/` exists; finish it and backfill tests.

### New game systems (proposals + implementation briefs)
| # | Brief | Effort | Depends on |
|---|---|---|---|
| 15 | [Incremental "Hearthkeeping" (idle layer)](15-new-game-incremental-hearth.md) | L | **08 (hard)** |
| 16 | ["Fiber Crush" (Wool-Crush-inspired match mode)](16-new-game-fiber-crush.md) | XL | **08 (hard)** |

Note (15): renamed off "Embergarden" because `state.embers` is an already-shipped keeper/boon currency — the new prestige currency is **Warmth / Hearthlight**; the idle layer is hard-bounded so it augments, never replaces, the board. Note (16): there is **no existing wool/yarn/dye economy** (only `tile_herd_sheep → meat`), so the fiber chain is defined from scratch; the mode is a **fork** (adjacent-swap match-3), not an edit to the drag-chain engine.

---

## Dependency map (build order that respects what blocks what)

```
08 save-migration ─┬─► 15 hearthkeeping (hard)
                   ├─► 16 fiber-crush (hard)
                   └─► (soft) 13, 14 if they change persisted shape
05 harness ────────┬─► 04 board-boons (tuning numbers)
                   └─► 13 economy rebalance (numbers)
01 quick-wins ─────┬─► 07 living-town (Tomas fix)
                   └─► 12 endgame goals-hub (streak)
09 CI gate ────────► 11 gamescene decomposition (have a net first)
```

## Recommended sequence

1. **Foundations (do first):** `01` quick wins · `08` save migration · `09` CI gate. Cheap, unblock the rest, and stop the next change from wiping saves.
2. **Depth & cleanup:** `02` feedback ladder · `03` live boss modifiers · `10` self-describing slices · `13` economy fork fix (structure now, numbers after 05) · `04` board boons (structure now).
3. **Bigger bets:** `05` balance harness · `06` story write-back · `07` living town · `12` endgame + goals hub · `11` GameScene decomposition · `14` port one zone.
4. **New systems:** `15` Hearthkeeping, then `16` Fiber Crush — both after `08` lands.

## House facts baked into every brief
- Files are **`.ts`/`.tsx`** (CLAUDE.md's `.js`/`.jsx` is stale doc-drift).
- **Slice footgun:** a new action only reaches a slice if it's in `SLICE_PRIMARY_ACTIONS`/`ALWAYS_RUN_SLICES` — else it silently no-ops. Use the `check-slice-action` skill.
- **Persistence:** any persisted-shape change needs a `SAVE_SCHEMA_VERSION` bump, which **wipes saves** until doc `08` lands the migration ladder.
- **Validation:** `npm run lint` · `npm run typecheck` · `npm test` · `npm run test:e2e` · `npm run test:visual` · `npm run build`. The Phaser/canvas layer has no unit coverage (only e2e/visual). Visual goldens are **not** re-baselineable on the Windows dev host — do it on the Linux CI runner.
