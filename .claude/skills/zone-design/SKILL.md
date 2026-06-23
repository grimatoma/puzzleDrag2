---
name: zone-design
description: >-
  Design, propose, and build out the puzzleDrag2 ZONE ATLAS — the set of unique, AAA-bar settlement
  zones, each a different ENVIRONMENT and a different LOGIC OF GROWTH (boardwalk-over-water, volcano
  terraces, sheltered hollow, oasis rings, sea-cliff, canopy platforms, crystal caverns, sky islands,
  reclaimed ruin-grid, grand boulevard). Use whenever the user wants to add / propose / redesign / build
  out a game ZONE or biome, invent a new themed settlement with its own expansion tiers + hazards +
  boss, work on the `reference/docs/zones/` generator (the atlas at reference/docs/zones/index.html or a per-zone
  build-out page), author a top-down Grow play-through layout on the 40×30 grid for a zone, pick a
  growth topology, or balance a zone's tier ladder / hazards / boss. Covers the data-driven generator
  architecture, the catalog of ten growth topologies and how to render each top-down, the
  collision-free layout authoring loop (layoutVerify), the radial/cluster authoring gotchas, the
  no-softlock resource rule, the contrast/legibility craft bar, the critical-review discipline, and
  cross-pollination. For the SINGLE home-town layout craft use growing-settlement-layout; for terrain
  BOUNDARIES use tileset-scene-design; for the per-tile PIXEL ART use pixellab / seasonal-tile-pipeline;
  this skill is the WHOLE zone SYSTEM and how each zone grows differently.
---

# Zone Design — the puzzleDrag2 Zone Atlas

Ten settlement zones, each **unique in environment AND in how it grows**, built on the
[`growing-settlement-layout`](../growing-settlement-layout/SKILL.md) foundation (roads-first, the
wilderness as the progress bar, a landmark that levels up in place, stable+additive growth) and then
taken somewhere new. Delivered as a **data-driven generator** under `reference/docs/zones/`, in two passes:

- **Pass 1 — the atlas** (`reference/docs/zones/index.html`): propose & pitch all zones — environment, growth
  topology, tier ladder, themed buildings, hazards (reused from the game + new), a boss, a signature
  mechanic, a palette. Each card has a live procedural **establishing-shot** (drag-to-grow).
- **Pass 2 — per-zone build-out** (`reference/docs/zones/<id>/index.html`): each zone gets a live **top-down Grow
  play-through** on the real `40×30 @ 32px` grid (ports 1:1 to `src/ui/town/townMaps.ts`), a tile
  inventory (art backlog), and an art bible — collision-verified, critically reviewed, merged.

## The one idea: a generator, not hand-written HTML

Improving the shared engine **regenerates every zone**. That is the cross-pollination mechanism — fix
the engine once, all zones benefit. Never hand-edit a generated `index.html`; edit the source and rebuild.

```
reference/docs/zones/
  data/
    world.mjs        # PRINCIPLES (the review bar) · TOPOLOGIES (the 10 growth logics) ·
                     #   MECHANIC_SOURCING (reused vs new hazards/bosses) · REGIONS
    zones.mjs        # the zone specs — SINGLE SOURCE OF TRUTH (env+palette, tiers, hazards, boss,
                     #   signature, tiles, newResources)
    layouts/<id>.mjs # per-zone TOP-DOWN geometry (roads + frontage spec OR free lots + spans)
  lib/
    engine.js        # establishing-shot engine (one painter per topology) — atlas cards
    layout.js        # TOP-DOWN 40×30 Grow engine — per-zone pages (the real game grid)
    geometry.mjs     # shared lot resolver + collision verifier (Node)
    layoutHelpers.mjs# ringLots / arcRoad / footFrom — for radial layouts
    atlas.mjs        # builds the atlas page
    page.mjs         # builds a per-zone page (3 tabs: Layout, Tile inventory, Art bible)
    styles.css       # shared CSS (per-zone accent set inline from each palette)
  build.mjs          # generator — validates data, runs the geometry gate, writes all html
  verify.mjs         # headless Playwright render check (console errors + non-blank canvases)
  layoutVerify.mjs   # pure-Node geometry gate (no plot overlaps a plot/road/landmark; ladder match)
```

**Build & verify:**
```bash
node reference/docs/zones/build.mjs            # regenerate atlas + every authored per-zone page (data gates run first)
node reference/docs/zones/layoutVerify.mjs [id]# collision gate — run after EVERY layout edit
node reference/docs/zones/verify.mjs [path]    # render check + screenshots → reference/docs/zones/_review/ (gitignored)
```
`preview_screenshot` hangs on this host (see project memory). Use Playwright over `file://` — it's 2D
canvas, no WebGL taint. `_review/` and `_*.mjs` are gitignored scratch.

## The ten growth topologies (variety is a HARD requirement — no two grow the same)

Each zone claims exactly one. How each renders **top-down**:

| Topology | Render model | Notes |
|---|---|---|
| boardwalk ribbon (water) | spine + back-lane + branch roads, `groundMode:"water"` | reeds = frontier |
| switchback terraces | horizontal `H` road bands stacked ↑, lots front N | terrace spacing ≥160 |
| sheltered hollow | **circular** arc rings around a centre | inner arc fills first |
| oasis rings | **circular** rings + short radial spokes | rings + spokes |
| stacked sea-cliff | `H` bands shifted left, sea = `band` feature right | cargo-lift line |
| canopy platforms | **free lots** + `span` bridges + trunk `disc`s | vertical climb read |
| linked chambers | **free lot** clusters + `span` cart-rails + chamber `disc`s | lit floors in dark |
| sky archipelago | **free lots** + `span` sky-bridges, `frontierFill` sky-blue | distinct islets |
| reclaimed grid | orthogonal `H`/`V` road grid + central cross | light cobble on dark fog |
| grand boulevard | central boulevard + back lanes + ring road | the capstone, 26 plots |

## Adding a zone

1. **Spec it in `zones.mjs`** — env+palette, a free topology, a tier ladder (4–5 rungs, increasing
   plots, tier-0 free), themed buildings, hazards (reuse a real game mechanic THEN extend — see
   MECHANIC_SOURCING; reused bosses must be REIMAGINED with a zone twist, not reskinned), a *playable*
   signature mechanic (not flavor), tile palette ramps + signature pieces, and `newResources` for any
   flavor resource (its producing building/board). `build.mjs` enforces: unique topology, increasing
   plots, free tier-0, landmark-stage count = rung count, and **no-softlock** (every gating resource is
   a base/board resource or a documented `newResource`).
2. **Author the top-down layout** in `data/layouts/<id>.mjs` (geometry only; palette+tiers merged in
   from `zones.mjs`). Roads laid first; buildings front them at a setback; the frontier recedes; the
   landmark is a fixed staged hub. Use the render model for its topology (table above).
3. **Verify collision-free** — `node reference/docs/zones/layoutVerify.mjs <id>` until ✓. Nudge `along`/coords.
4. **Build + screenshot** — `node reference/docs/zones/build.mjs` then `verify.mjs`/a tier-stepping capture.
   Confirm it READS as its topology and the growth reads (frontier receding, density rising).
5. **Critical review** (below), fix, **commit + merge** (merge commits, not squash). The atlas
   auto-links built zones ("Open build-out →").

## Layout authoring gotchas (hard-won — read before authoring)

- **Spacing**: two lots overlap if `|dx| < (wa+wb)/2 + 6` AND `|dy| < (ha+hb)/2 + 6`. Keep same-row
  lots ≥ ~130 apart (footprints ~110 wide).
- **Roads-first frontage**: a lot fronting an H road sits at `cy = line ∓ half ∓ setback ∓ h/2`. For 15+
  plots on one spine, add a **north back-lane + a connector + a branch** (the town-layout move); reserve
  the landmark and each branch a corridor with no opposing lots.
- **Terraces**: vertical spacing ≥160 (road-half + setback + lot-height + road-half); leave the terrace
  ENDS clear for the switchback connectors, or they clip the end lots.
- **RADIAL — use CIRCULAR rings (`rx=ry`).** Ellipses collapse the radial gap off-axis and everything
  overlaps. A lot fronting a CURVED road has its AABB corner poke *toward* the road, so
  `lotR ≈ roadR + 85` (the corner reaches `hypot(w/2,h/2) ≈ 68` past centre). Raise the centre (`cy`) so
  the southern lots stay in-bounds; a full-360 ring hits the top AND bottom bounds, so leave a north gap
  or cap the radius. Distribute multiple tiers across **2 generous rings** rather than cramming 4–5 rings.
- **CLUSTER (platforms/chambers/islets)** — use **free lots** (≥115 apart) connected by `span` features.
  Spans are FEATURES not roads, so they don't collide and may touch lot centres; they also *clear a path*
  (so clusters read as a connected village) and suppress frontier dressing. A cluster zone needs
  `roads: []` explicitly.
- **Verify gate** is independent of the render engine — trust it. It re-derives placement and checks
  bounds, plot-plot, plot-road (all segments of `pts` roads), plot-landmark, plot-plaza, ladder counts.

## The contrast / legibility craft bar (from review)

Flat-colour mockups still get reviewed at a AAA bar. The recurring fixes:
- **Cleared ground must out-contrast the frontier** — the engine lightens cleared cells and darkens the
  frontier; set a per-zone `frontierFill` when the frontier is its own colour (sky-blue for sky,
  dark for caverns/moor).
- **Make the growth mechanic visible** — thicken the roads/bridges/lift line that tells the growth story;
  give a key route its own `col`.
- **Dark zones need lit pads** — add `disc` features (lit chamber floors, glowing crystals, trunks) so
  clusters read as distinct nodes.
- **Hazard frontier should pop** — e.g. lava uses a glow + white-hot core.

## Critical-review discipline

Every pass gets a HARSH reviewer (an Explore agent) against the craft bar + topology legibility + the
data (plot curves, softlocks, reused-boss reskins). Triage MUST-FIX / SHOULD-FIX / NICE-TO-HAVE, fix the
MUST + high-value SHOULD, re-render, re-review. Don't rubber-stamp; earn the verdict by finding real
problems. The brief's bar: each zone must be **unique, compelling, and FUN** — a signature *mechanic*,
not just a vibe.

## Pitfalls

- Hand-editing a generated `index.html` (it's regenerated — edit the source).
- A gating resource produced by a building unlocked at the SAME tier (softlock — the build gate catches it).
- Two zones whose top-down layouts read the same (retopologize or sharpen the visual distinction).
- Reused bosses left as one-line reskins (reimagine the mechanic in the zone's logic).
- Polishing pixel art before the layout locks (iterate flat-colour first — pixel art is the final step).
- Elliptical radial rings (use circular); cramming too many concentric rings (use 2 generous rings).
