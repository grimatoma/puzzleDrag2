# docs/archive

Outdated documentation kept for historical reference. Nothing here describes the
current design or active work — it has either **shipped** (so the plan/spec is now
just history), been **dropped**, or been **superseded** by the live seasonal-tile
pipeline.

Grouped by kind and ordered by time (**newest first**). Files keep their original
relative `assets/…` image links, so they still render when opened from inside
their folder.

---

## Game-design, balance & zones prose — superseded by the Design Canon · 2026-06-26
Merged into the single canonical [`docs/design/`](../design/index.html) set (overview &
scope, progression, settlement atlas, economy & balance, systems, meta & money, build
status). The full mapping lives in the canon's
[build-status → "What this set replaced"](../design/status.html#superseded). Superseded prose:

- [`game-design/`](game-design/index.html) — the six-page Game Design set (overview, systems,
  towns, buildings, meta-money, status). Its generator `reference/tools/build-game-design-docs.mjs`
  is retired (guarded to no-op); the canon is hand-authored.
- `balance-index.html` — the balance ledger prose (numbers now in `design/economy.html`; the live
  `balance/profile.json`, `progression.baseline.json` & `progression-timeline.html` stay active).
- `starting-zones-scope.html` — the zones 1–2 balance baseline (folded into `design/economy.html`).
- `civic-economy.html` — Town Hall tithes/provisions (folded into `design/meta.html#civic`).
- `strategy-review-2026.html`, `runthrough.html` — review & playthrough (folded into the scope/atlas pages).
- `ux-redesign-2026.html` — UX atlas, kept as visual reference only (not design canon).

The Zone Atlas generator (`docs/zones/`) is **not** archived — it stays a live layout/art tool;
`design/towns.html` is now the design canon for the settlement roster.

## Project briefs — completed & dropped · 2026-06
[`projects/`](projects/README.md) — implementation briefs moved out of the active
board once their work shipped (01, 05, 06, 08, 11, 14) or was dropped (15, 16).
See that folder's index for the per-brief outcome, ordered by completion time.
The live board lives in [`docs/projects/`](../projects/README.md).

## Phaser UX & wiki specs — shipped · 2026-06-02 → 2026-06-10
`superpowers/specs/` and `superpowers/plans/` — point-in-time plans/specs for
features now implemented in `src/`, newest first:

- `2026-06-10-phaser-ux-batch-design.html` — Phaser UX batch
- `2026-06-02-wiki-interconnection-ia-design.html` — wiki interconnection IA
- `2026-06-02-board-kinds-wiki-design.html` — board-kinds wiki section
- Appearance/look restructure · progression feed (phase 1) + engine migration (phase 2 / 2b)
- `wiki-migration-plan.html` · `progression-trigger-redesign.html`

## Superseded art explorations — concept-only · ≈2026-05 → 2026-06
Early pixel-art studies, replaced by the shipped seasonal-tile system
(`docs/seasonal-tile-system/`, the in-game spritesheets, and the
`seasonal-tile-pipeline` tooling):

- `seasonal-tiles-review/` — the rounds 1–3 R&D review that locked the flat-round-base direction
- `seasonal-tile-animations.html`
- `pixel-pipeline-viewer/` — the early sprite-pipeline viewer
- `birch-32-test.html`, `birch-tree-64.html`, `birch-tree-seasons.html`
- `farm-tile-concepts.html`, `grass-tile-concepts.html`, `more-tile-concepts.html`
- `icon-review.html`, `icon-style-guide.html`, `board-topology-concepts.html`

## Assets
`assets/` holds the GIF/PNG previews referenced only by the archived art docs above.
