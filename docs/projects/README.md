# puzzleDrag2 — Project Briefs

Each file in this folder is a **self-contained implementation brief**: point a fresh session at one file and it has the goal, the verified current state of the code, the plan, success criteria, and how to validate + double-check. They were authored by agents that read and verified the real source — where a brief corrected a wrong assumption, the correction is flagged inline under **Background & current state (VERIFIED)**.

> How to use: open a new session and say something like *"Implement `docs/projects/03-live-boss-board-modifiers.md`."* The doc is the whole spec.

Effort is a rough size (S ≈ hours, M ≈ a day, L ≈ multi-day, XL ≈ a week+). For the **ranked roadmap** (what's left, by value) see **[ROADMAP.html](ROADMAP.html)**.

---

## Status at a glance (verified 2026-06-18)

Briefs were originally authored as "work to do"; several have since shipped. Verified against HEAD:

Completed & dropped briefs are **📦 archived** — moved to [../archive/projects/](../archive/projects/README.md) (time-ordered) so this board shows only live work.

| # | Brief | Status |
|---|---|---|
| 01 | Quick wins — dormant systems | ✅ Done · 📦 [archived](../archive/projects/01-quick-wins-dormant-systems.md) |
| 02 | Drag-build feedback ladder | ✅ Done — open [PR #1241](https://github.com/grimatoma/puzzleDrag2/pull/1241) |
| 03 | Live boss board modifiers | ⬜ Not started |
| 04 | Roguelite board-altering boons | ⬜ Not started |
| 05 | AI playtest & balance harness | ✅ Done · 📦 [archived](../archive/projects/05-ai-playtest-balance-harness.md) |
| 06 | Story editor write-back loop | ✅ Done · 📦 [archived](../archive/projects/06-story-editor-writeback-loop.md) |
| 07 | Living named town | 🟡 Partial (Tomas fix only; placement/talk remain) |
| 08 | Save migration ladder | ✅ Done · 📦 [archived](../archive/projects/08-save-migration-ladder.md) |
| 09 | CI gate for e2e + visual | 🟡 Infra landed but **non-gating** — e2e bit-rotted (~32/63); de-rot then flip |
| 10 | Self-describing slices | ⬜ Not started |
| 11 | GameScene decomposition | 🟢 ~Done · 📦 [archived](../archive/projects/11-gamescene-decomposition.md) |
| 12 | Endgame finale + goals hub | 🟡 Partial — **12A token-strip bug ✅ fixed** (PR #1243); finale + goals hub remain |
| 13 | Economy: unify price model | ✅ Fork fixed (PR #1243); orphan-slice retirement + harness rebalance remain |
| 14 | Port zones atlas | ✅ Done (Mirefen) · 📦 [archived](../archive/projects/14-port-zones-atlas.md) |
| 15 | Incremental "Hearthkeeping" | 🗑️ Dropped · 📦 [archived](../archive/projects/15-new-game-incremental-hearth.md) |
| 16 | "Fiber Crush" | 🗑️ Dropped · 📦 [archived](../archive/projects/16-new-game-fiber-crush.md) |
| 17–23 | Net-new polish concepts | 🆕 **Proposed** (see below) |

---

## Active briefs

Only live work is listed below. **Completed & dropped briefs (01, 05, 06, 08, 11, 14, 15, 16) have moved to [../archive/projects/](../archive/projects/README.md)** — a time-ordered index of what shipped and what was dropped.

### Core game-feel & a real second verb
| # | Brief | Effort | Depends on |
|---|---|---|---|
| 02 | [Drag-Build Feedback Ladder (audio + haptics)](02-drag-build-feedback-ladder.md) | S | ✅ done in open [PR #1241](https://github.com/grimatoma/puzzleDrag2/pull/1241) |
| 03 | [Live Boss Board Modifiers](03-live-boss-board-modifiers.md) | M | — |
| 04 | [Roguelite Board-Altering Boons](04-roguelite-board-altering-boons.md) | M | 05 (tuning only) |

Note (02): handled by open PR #1241 — kept off the main work branch to avoid duplicating `src/game/dragFeedback.ts`. Note (03): the modifiers **already run live**; the real bug is `fillBoard`/`regenerateBoard` rebuilding tiles with `frozen=false` and wiping the flags. Note (04): the scene can't see `state.boons` — board-visual boons must be bridged through the Phaser registry.

### Progression & world
| # | Brief | Effort | Depends on |
|---|---|---|---|
| 07 | [Living Named Town (spatial NPCs)](07-living-named-town.md) | M | — (Tomas fix done) |
| 12 | [Endgame: Old Capital Finale + Goals Hub](12-endgame-finale-and-goals-hub.md) | M–L | — |

Note (12): the Hearth-token strip bug (12A) is **fixed** (PR #1243); the finale beats + the goals hub (12B) remain.

### Economy
| # | Brief | Effort | Depends on |
|---|---|---|---|
| 13 | [Economy: Unify the Price Model + Retire the Orphan Market](13-economy-unify-price-model.md) | M | 05 (numbers) |

Note (13): the ~10× `SELL_ITEM` vs `SELL_RESOURCE` fork is **fixed** (`effectiveSellPrice`, PR #1243); retiring the dead `MARKET/SELL` slice + applying the 05-harness rebalance numbers remain.

### Engineering safety net & dev velocity
| # | Brief | Effort | Depends on |
|---|---|---|---|
| 09 | [CI Gate for e2e + Visual Smoke](09-ci-e2e-visual-gate.md) | S–M | — |
| 10 | [Self-Describing Slices (kill the footgun)](10-self-describing-slices.md) | M | — |

Note (09): infra **landed** (PR #1229) — the `e2e`/`visual-smoke`/`visual-rebaseline` jobs — but both land **non-blocking** because the never-gated e2e suite has **bit-rotted** (~32 pass / 31 fail — stale fixtures/selectors, NOT a regression). De-rot + re-baseline goldens on CI before flipping to gating — full inventory in [09 findings](09-ci-e2e-gate-findings.md). Note (10): `ALWAYS_RUN_SLICES` is wrapped by a *stateful* guard that must not be flattened; `CARTO/TRAVEL` is dual-owned.

### Net-new polish concepts (proposed 2026-06-18)
| # | Brief | Effort | Notes |
|---|---|---|---|
| 17 | [Season-flip cinematic beat](17-season-flip-cinematic.md) | M | Board-wide weather+light sweep on season turn; reuses the seasonal pipeline |
| 18 | [2D town lighting layer](18-town-2d-lighting.md) | M | Builds the *already-decided* lit ¾-top-down direction (`docs/town-camera`) |
| 19 | [Chain juice & game-feel (remaining)](19-chain-juice-and-game-feel.md) | S–M | Combo/streak meter + long-chain flourish; most juice already ships |
| 20 | [Milestone celebrations](20-milestone-celebrations.md) | M | First chain-of-10 / building / city / zone → toast + flourish |
| 21 | [Ambient seasonal soundscape](21-ambient-soundscape.md) | S–M | Synth ambient bed per zone×season, behind `musicOn` |
| 22 | [Complete the four-season tile sets](22-four-season-tile-sets.md) | L | 76/79 tiles are summer-only; finish spring/autumn/winter + transitions |
| 23 | [Accessibility: shape-coded tiles + reduced-motion](23-accessibility-shape-coded-tiles.md) | M | `reducedMotion` setting end-to-end + colour-independent tile silhouettes |

Note (19): the per-tile feedback ladder and counter tick-up are **already done** — this brief is the *remaining* vision (marked inline). Note (23): adding `reducedMotion` touches the persisted settings shape → needs a **47→48** migration rung (the doc-08 ladder is live, so add a rung, don't wipe).

---

## Dependency map (active work)

The foundations (`05` harness, `08` save ladder, `09` CI infra) have **landed** — see [../archive/projects/](../archive/projects/README.md). Remaining dependencies:

```
05 harness (done) ─┬─► 04 board-boons (tuning numbers)
                   └─► 13 economy rebalance (numbers)
23 reduced-motion ──► 17 season-flip · 19 chain juice (effects must honor it)
```

## Recommended sequence

Ranked by value in **[ROADMAP.html](ROADMAP.html)**. In short:

1. **Depth (highest player value):** finish `13` (retire orphan slice + harness rebalance) · `03` live boss modifiers · `04` board boons.
2. **Feel & direction:** `20` milestones · `17` season-flip · `18` town lighting · `12` goals hub · `19` chain combo meter.
3. **Content & world:** `22` four-season tiles · further zone ports (recipe proven by 14) · `07` living town · `12` finale · `21` soundscape · `23` accessibility.
4. **Engineering:** `09` de-rot e2e → gating · `10` self-describing slices.

## House facts baked into every brief
- Files are **`.ts`/`.tsx`** (CLAUDE.md's `.js`/`.jsx` is stale doc-drift).
- **Slice footgun:** a new action only reaches a slice if it's in `SLICE_PRIMARY_ACTIONS`/`ALWAYS_RUN_SLICES` — else it silently no-ops. Use the `check-slice-action` skill.
- **Persistence:** `SAVE_SCHEMA_VERSION` is **47** (`src/constants.ts:215` — briefs that still say "45" predate the fiber/embergarden removals). The doc-08 **migration ladder is LIVE** (`src/state/saveMigrations.ts`): a persisted-shape change now adds a `MIGRATIONS[n]` rung and bumps the version — it no longer wipes saves. Don't roll the version back when removing a feature; no-op the rung.
- **Validation:** `npm run lint` · `npm run typecheck` · `npm test` · `npm run test:e2e` · `npm run test:visual` · `npm run build`. The Phaser/canvas layer has no unit coverage (only e2e/visual). Visual goldens are **not** re-baselineable on the Windows dev host — do it on the Linux CI runner.
