# docs/archive

Outdated documentation kept for historical reference. Nothing here describes the
current design or active work — it has either **shipped** (so the plan/spec is now
just history), been **dropped**, or been **superseded** by the live seasonal-tile
pipeline.

Grouped by kind and ordered by time (**newest first**). Files keep their original
relative `assets/…` image links, so they still render when opened from inside
their folder.

---

## Town/board feature specs — shipped or dropped · 2026-06-29
Point-in-time proposals and prototype boards for features now resolved in `src/`, newest first:

- `town1-2-economy-design.html` — superseded redirect stub ("this doc moved into the game"); design canon now in the in-app Wiki.
- `mobile-horizontal-layout/` — shipped: mobile landscape "maximize the board" layout (`src/game/layout.ts`, `GameScene`).
- `road-system-proposal.html` + `road-proposal-assets/` — shipped: cohesive road/cobble/plaza tiles live in `src/ui/town/townMaps.ts` + `TownScene`.
- `town-orientation/` — superseded perspective study ("three looks"); the ¾ top-down decision was settled by the still-active `town-camera/` study (kept live; it's the mandate for open project `18-town-2d-lighting`).
- `icon-tile-audit/` — completed one-time audit; fixes landed across the icon waves.
- `tile-resource-proposal.md` — shipped: the tile→tier-1 yield rule is implemented in `src/game/producedResource.ts` + the `tilePower` schema (`producesResource`).
- `hd2d-village/`, `hd2d-village-sim/` — dropped: R3F/three.js HD-2D 3D direction was not adopted (no `three`/`@react-three` dependency; the game stayed Phaser/Canvas).
- `building-art/` — dropped: proposed a pixel-art building pass; town buildings shipped as vector art (`tiles/townProps.ts`).

## Game-design, balance & zones prose — superseded by the in-app Design section · 2026-06-26
Merged into the consolidated **Design (proposed)** section of the in-app Wiki (Dev Panel → Design;
`src/balanceManager/content/pages/design_*.html`) — overview & scope, progression, settlement
atlas, economy & balance, systems, meta & money, and a status/decisions page. Superseded prose:

- [`game-design/`](game-design/index.html) — the six-page Game Design set (overview, systems,
  towns, buildings, meta-money, status). Its generator `reference/tools/build-game-design-docs.mjs`
  is retired (guarded to no-op); the in-app section is hand-authored.
- `balance-index.html` — the balance ledger prose (the design now lives in the in-app Economy page; the live
  `balance/profile.json`, `progression.baseline.json` & `progression-timeline.html` stay active).
- `civic-economy.html` — Town Hall tithes/provisions (folded into the in-app Meta & money page).
- `strategy-review-2026.html`, `runthrough.html` — review & playthrough (folded into the scope/atlas pages).
- `ux-redesign-2026.html` — UX atlas, kept as visual reference only (not design canon).

The Zone Atlas generator (`docs/zones/`) is **not** archived — it stays a live layout/art tool;
the in-app Settlement Atlas is now the design canon for the settlement roster. The zones&nbsp;1–2
balance baseline (`docs/starting-zones-scope.html`) likewise stays as the detailed early-game source.

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
