---
name: growing-settlement-layout
description: >-
  Design or redo a town / village / settlement screen so it reads as a living place that VISIBLY GROWS
  across upgrade tiers — a tiny forest outpost expanding into a hamlet, village, then city — instead of a
  flat rectangular grid of plots. Use whenever the user wants to redo / redesign / lay out / "make it feel
  alive" a town or settlement, add or rebalance plots-per-tier, make the town "grow" or "expand" or "feel
  like an accomplishment" as the player levels it up, turn surrounding wilderness/forest into buildable
  plots, decide how many plots or how many tiers a zone should have, or author the per-tier maps for a
  zone. Covers the organic-growth design principles (radial growth from a fixed evolving landmark,
  receding wilderness as the progress bar, path-material progression, varied lots + jitter, rising prop
  density), the puzzleDrag2 authored-map contract (the 40×30 @ 32px AuthoredTownMap, stable-additive lot
  indices, the cartography tier ladder), the interactive layout mockup at reference/docs/town-layout/index.html, and
  the workflow from ladder → mockup → port to townMaps.ts → tile manifest → art → wire TownScene → verify.
  For terrain BOUNDARIES / autotiling / transition tiles use tileset-scene-design; for the per-tile PIXEL
  ART use pixellab / seasonal-tile-pipeline / pixel-art-craft; this skill is about the SETTLEMENT LAYOUT
  and how it grows.
---

# Growing Settlement Layout

Make a town read as a place that **grew**, not a grid that got bigger. A settlement the player upgrades
should feel like a cheerful little outpost putting down roots and becoming a city — every upgrade a
visible, earned milestone. This skill is the layout + staging craft for that. (The terrain *boundaries*
inside it are `tileset-scene-design`; the *tiles* themselves are `pixellab` / `seasonal-tile-pipeline`.
For the puzzleDrag2 town's reusable VECTOR props/decor/trees and road materials — the art that DRESSES the
layout, baked Canvas-2D into TownScene — use `vector-tileset`.)

## The one idea everything follows from

**Lay the ROADS first; place buildings FRONTING the roads; grow the road network each rung.** This is how
real towns and city-builders stay coherent — and it is the fix for the three things that wreck a town
layout:

- **Never route a road to a building's centre.** That makes roads cross other buildings. Instead lay a
  road segment, then place each building *beside* it at a fixed setback, facing it. Roads then always run
  *between* buildings. (Burgage-plot frontage; Parish & Müller; Manor Lords.)
- **Give every lot a minimum street frontage + spacing**, so buildings never crowd.
- **Grow the network with visible NEW ROUTES.** Each rung adds a distinct piece: extend the main street,
  open a back lane behind it, add cross-connectors into blocks. The road map itself tells the growth
  story. Roads are immutable once laid — growth only *extends* them. (Ribbon development; Watabou.)
- **A bounded plaza the buildings ring.** The market square / plaza is a *fixed* open hub that never grows
  over its buildings; streets radiate from it. Put a single focal landmark in it that levels up with the
  town — well → fountain → town-square monument — without moving or resizing the plaza.
- **The wilderness is the progress bar.** The town is a clearing in forest; clear it *along the new roads*
  each rung, so growth reads as the town pushing route-by-route into the woods. Forest never re-wilds.
- **The ground tells the story for free**: main-street surface upgrades dirt → cobble; prop/NPC density
  rises each rung.

The practical geometry that makes this collision-free: band the plots into rows (back-lane row · main-st
north row · main street · south row · back-lane row); a road's frontage row aligns building *edges* to
the street at `roadHalf + setback`; connectors only thread x-columns with no plot in either adjacent row
(or join through the plaza). Verify a candidate layout in a tiny Node harness (no plot overlaps another
plot / a road / the plaza) *before* baking coordinates in. The full rationale, named references, and
citations are in [`references/design-principles.md`](references/design-principles.md). Read it before
designing a layout.

## The puzzleDrag2 authoring contract (don't break these)

The town is hand-authored per `(zone, tier)` in **`src/ui/town/townMaps.ts`** as an `AuthoredTownMap`,
converted by `getTownMap(zoneId, tier)` into the `TownPlan` that **`src/ui/town/TownScene.ts`** (Phaser)
paints. Zones/tiers with no entry fall back to procedural `src/townLayout.ts`.

- **Design space is `40 × 30` tiles @ `32px` = `1280 × 960`.** Author in that coordinate system so the
  mockup ports 1:1.
- **`lots.length === ZONES[zone].tiers[tier].plots`** for every rung (test-enforced).
- **Lot `index` is STABLE across rungs.** Tier N keeps tier N−1's indices and only *appends* higher ones,
  so a placed building never moves when the town grows. Landmark and inherited paths/props are stable too.
  This is the literal "the town grows on top of the previous level" requirement — honour it.
- The tier ladder (rung names, plot counts, building unlocks, upgrade costs, gates) lives in
  **`src/features/cartography/data.ts`** (`MAP_NODES[].tiers[]`), driven by the `TIER_UP` action in
  `src/state.ts`. Reuse the grid helpers already in `townMaps.ts`: `blankGrid`, `rectTiles`, `roadH`,
  `roadV`, `disc`, `decorateGrass`, `lot()`.

## Deciding the ladder (plots per tier)

Start tiny so tier 0 doubles as a tutorial, then grow in meaningful jumps. The home zone's reference
curve is **Outpost 3 → Hamlet 6 → Village 12 → City 20** (≈ 2–3 → 4–6 → 8–12 → 14–20+ from the research).
When inserting a new bottom rung into an existing ladder:

- Redistribute building unlocks so the **union across all rungs still equals the zone's full building
  list** (test-enforced) — the tiny Outpost should unlock only the tutorial essentials (e.g. Hearth +
  Housing + Mill).
- Bump `SAVE_SCHEMA_VERSION` in `src/constants.ts` (old saves are discarded, which frees you to reposition
  every lot), and fix any `requiresZoneTier` gate that pointed at the old top rung.

## Workflow

1. **Set the ladder** — rung names + plot curve (above). Confirm count/curve with the user.
2. **Author roads → frontage in the mockup** — `reference/docs/town-layout/index.html` is a live, canvas-based tool
   on the real 40×30 grid: it holds a `ROADS` list (segments with a `tier`) and a `SPEC` list of frontage
   slots (which road + side + position-along), resolves slots to building rects at a setback, and renders
   the network + plots + a "Grow" play-through, with a **Copy layout JSON** export of `roads` + `lots` in
   `AuthoredTownMap` shape. Iterate here with **flat colors only** — lock the layout before any art.
3. **Verify the layout headlessly first** — run the placement math in a small Node harness and assert: no
   plot overlaps another plot, no plot overlaps any road segment, no plot overlaps the bounded plaza or
   the board, all in bounds, and the per-rung reveal counts equal the ladder. Fix flagged collisions by
   nudging an along-position before baking. (Then sample canvas pixels / capture per-rung PNGs to eyeball
   it — see the doc + project memory for the headless-canvas capture trick.)
4. **Port coordinates** into `townMaps.ts` authored maps (paste the exported `lots[]`; build `groundTiles`
   with the helpers + the new forest/cobble/clearing vocabulary).
5. **Fill the tile/prop manifest** (template below) — the art shopping list.
6. **Generate the tiles** via the PixelLab MCP — defer to `pixellab` / `seasonal-tile-pipeline`. Handle
   terrain boundaries with `tileset-scene-design` (transition tiles, autotiler) so nothing butts edge-to-
   edge.
7. **Wire `TownScene.ts`** — extend ground painting + tile palette for forest / cobble / cleared-pad.
8. **Verify in-game** — `npm run test:visual` + the zone-tier-ladder map test; re-baseline goldens on the
   canonical host (this dev box can't regen them — see project memory).

## Templates

**Tier-layout table** (fill one row per rung):

| Rung | Plots (idx added) | Forest extent | Landmark | Paths | Props / life |
|---|---|---|---|---|---|
| … | … (+N, idx a–b) | … | … | … | … |

**Tile / prop manifest:**

- *Terrain*: forest (+ forest→grass edge), grass, flower-grass, dirt-path, cobble-path (+ dirt→cobble
  edge), plaza/square, cleared-plot pad, optional water + bridge.
- *Landmark (staged)*: well → fountain → monument.
- *Props (cumulative by rung)*: signpost, lamppost, cart, market-stall, planter, banner.

## Pitfalls

- **Roads crossing buildings** — the #1 incoherence tell. It happens when you route a road *to* a building
  (e.g. a spur from each plot to the plaza centre). Fix: lay roads first, place buildings fronting them at
  a setback; a road never targets a building.
- **Buildings too dense** — no frontage rule. Give each lot a minimum street-frontage width and space
  columns by ≥ plot-width + gap.
- **A plaza/square that grows over its buildings** — caused by treating the central feature like a building
  that scales each rung. Lock the plaza to a *fixed* size; let the ring of buildings around it densify
  instead, and swap only the landmark sprite (well → fountain → monument).
- **Grid death** — uniform spacing on a straight lattice reads as placeholder. Vary lot sizes, stagger
  frontage, anchor on the plaza, and let the road network (not a grid) shape the town.
- **Moving inherited elements** — repositioning a lower-rung lot/landmark/road on upgrade breaks the
  stable-index contract *and* looks wrong (a placed building teleports). Only ever append.
- **Re-wilding** — cleared ground that grows forest back reads as "losing territory". Forest recedes one
  way.
- **Forgetting boundaries** — flat terrains butted edge-to-edge look unfinished; that's `tileset-scene-
  design`'s job, not an afterthought.
- **Breaking the unlock union / save schema** — see "Deciding the ladder"; both are test-enforced /
  save-breaking.
- **Polishing art before the layout is locked** — iterate the mockup in flat colors first; generate pixel
  art only once positions are final.
