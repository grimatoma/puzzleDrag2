# Growing-settlement design — principles & references

Distilled research for designing a settlement that grows from forest outpost to city in a cozy,
cheerful game. Companion to `SKILL.md`.

## 0. Roads-first — the structural backbone (read this first)

Coherent towns are built **roads → blocks → buildings**, never buildings-then-connect-them.

- **Burgage plots.** Medieval towns laid the high street first, then subdivided the *frontage* into narrow
  street-facing lots with depth behind. Buildings face the street; roads run between them. Same idea in
  **Manor Lords** (draw a plot region, it subdivides the frontage into dwellings).
- **Procedural pipeline (Parish & Müller; Watabou).** Grow the road network with local constraints
  (no crossing segments, snap near-intersections, keep minimum frontage), *then* subdivide each
  road-bounded block into lots by its shorter axis, enforcing a minimum frontage edge and a sane
  aspect ratio (≈1:0.5 … 1:3). Watabou's village generator is "Parish & Müller with the L-systems
  scrapped" — road-centric, houses placed sparsely *along* roads.
- **Concrete ratios.** Road width hierarchy: main/high street ~6–8 m, secondary lanes ~4–6 m, back lanes
  ~3–4 m. Building setback from the road ~2–5 m. Lot frontage ~ minimum 5–8 m; depth ≈ 1.4× frontage. To
  place a building beside a road: take a point on the segment, offset perpendicular by
  `road_width/2 + setback + building_depth/2`; do both sides for a dual-fronted street.
- **Growth = new routes, not just more houses.** Stage it: **hamlet** = one high street (ribbon); **village**
  = add perpendicular back lanes / secondary lanes at T-junctions; **town/city** = add a ring/loop or
  cross-connectors knitting blocks, infill, cobble the centre. Roads are **immutable** once laid; each
  stage only extends the network, which is what makes the growth read.
- **The fix for the three classic failures:** roads crossing buildings → never route a road to a building
  centroid (front them instead); buildings too dense → enforce minimum frontage + spacing; central square
  overrunning its surroundings → lock the plaza size and densify the *ring* around it.

## 1. Organic layout (non-grid but readable)

Cozy/settlement games that feel alive reject the rigid grid while staying legible through intentional
asymmetry and a clear focal point.

- **Anchor on a central landmark / town square.** Dorfromantik, Stardew's Pelican Town, and Animal
  Crossing neighbourhoods all organise around a central gathering place (fountain, square, well). It gives
  the eye a "you are here" and a centre of gravity.
- **A main path spine guides the eye and NPC movement.** A primary route — gently *curved*, not a straight
  grid line — creates hierarchy without feeling artificial.
- **Cluster plots with breathing room.** Close enough to feel busy, with open pockets so it never reads as
  overcrowded or as a uniform field.
- **Grow in concentric rings from the centre.** Historical towns expand outward in rings (Burgess'
  concentric-zone model); each upgrade adds a visible outer ring of development.

**Grid death** — why a lattice reads as placeholder: it removes variation, makes navigation monotonous,
gives the eye no focal point, and feels geometric rather than grown. Fixes (all cheap): nudge buildings
5–15% off-grid, vary footprints and spacing, curve the main path, add a focal landmark, frame with edge
vegetation.

## 2. Visible progression — "the town grew"

Make each upgrade a milestone, not a counter tick.

- **Each stage introduces a distinct landmark** that becomes iconic for that era: well → market → fountain
  → town square → monument/hall. The skyline visibly changes.
- **Path material upgrades** (dirt → cobble → stone, à la Anno / Farthest Frontier) signal progress with
  zero UI.
- **Density and life rise**: more props, lamps, planters, banners, and (later) more NPCs with visible
  routines.
- **Wilderness visibly recedes** (see §4) — the single strongest "we grew" cue.
- **Reward the moment**: on upgrade, ground retiles, new props/NPCs appear, the landmark transforms — a
  clear before/after.

## 3. Outpost → city stages

A typical identity arc (Ashes of Creation uses Wilderness → Expedition → Camp → Village → Town →
Metropolis). A 4-rung cozy arc:

| Rung | Identity | Visual change |
|---|---|---|
| Outpost | A foothold in the woods (tutorial) | Well, dirt track, a few cleared lots, forest all around |
| Hamlet | Roots go down | Wider clearing, cottages cluster, first lamp/cart |
| Village | A real community | Fountain + cobbled plaza, market, cobble creeping out, woods pulled back |
| City | Legacy established | Town square + monument, cobbled streets/districts, forest just a frame |

## 4. Wilderness → developed plots (the clearing mechanic)

Players find deep satisfaction in turning raw wilderness into developed space (Ooblets: the farm "starts
out empty but is littered with logs, rocks, and weeds you can clear out" — each clear is a small victory).

- Empty (un-built) plots read as **freshly cleared, buildable ground**; the un-cleared remainder is
  forest.
- The clearing expands ring by ring; the **receding tree-line is the progress bar**.
- Optionally yield resources on clear, to make it mechanically (not just visually) rewarding.
- Keep cleared ground cleared — never re-wild (that reads as losing territory). Forest stays as an
  aesthetic *frame* at the edges.

## 5. Plot-count curve

Start tiny so tier 0 teaches mechanics in a manageable space, then grow in meaningful jumps (Game Balance
Concepts: gradual complexity, no sudden spikes, a reward every 15–45 min).

| Stage | Buildable plots |
|---|---|
| Outpost (tutorial) | 2–3 |
| Camp / Hamlet | 4–6 |
| Hamlet / Village | 8–12 |
| Village / City | 14–20+ |

puzzleDrag2 home reference curve: **3 → 6 → 12 → 20**.

## 6. Cheap tricks that add life (priority order)

1. Central focal landmark (essential).
2. A curved main path (essential).
3. NPC routines + props — sitting, sweeping, gathering — the #1 "aliveness" multiplier.
4. 5–15% jitter on placement (low cost, high impact).
5. Edge vegetation framing the settlement.
6. Height/variation and time-of-day lighting (polish).

## Sources

- Beyond the Grid: Organic Level Design — https://www.wayline.io/blog/beyond-the-grid-organic-level-design
- Townscaper — https://design-milk.com/townscaper-architecture-cityscape-pc-game/
- Dorfromantik — https://www.vice.com/en/article/dorfromantik-turns-city-building-into-a-beautiful-series-of-puzzles/
- Ashes of Creation, Settlement stages — https://ashesofcreation.wiki/Settlement_stages
- Animal Crossing neighbourhoods — https://www.thegamer.com/animal-crossing-make-neighborhood-villagers/
- Stardew Valley, Pelican Town — https://stardewvalleywiki.com/Pelican_Town
- Ooblets devlog (clearing) — https://ooblets.com/2018/04/march-2018-devlog/
- Game Balance Concepts, Pacing — https://gamebalanceconcepts.wordpress.com/2010/08/18/level-7-advancement-progression-and-pacing/
- Burgess concentric-zone model — https://www.simplypsychology.org/burgess-concentric-zone-model.html
- Manor Lords, burgage plots — https://www.gamerguides.com/manor-lords/guide/basics/buildings/burgage-plots-guide-levels-designs-extensions-and-more
- Burgage plots (medieval frontage) — https://www.burgageplots.info/ · https://ruralhistoria.com/2023/12/04/what-is-a-medieval-burgage-plot/
- Parish & Müller, Procedural Modeling of Cities — https://cgl.ethz.ch/Downloads/Publications/Papers/2001/p_Par01.pdf
- Procedural lot subdivision (frontage + aspect rules) — https://martindevans.me/game-development/2015/12/27/Procedural-Generation-For-Dummies-Lots/
- Watabou village generator — https://watabou.itch.io/village-generator
- Ribbon development (linear main-street growth) — https://en.wikipedia.org/wiki/Ribbon_development
- Medieval market squares (bounded plaza, perimeter buildings) — https://www.maloriesadventures.com/blog/the-medieval-market-square-why-every-great-european-city-has-one-and-what-they-were-actually-for/
