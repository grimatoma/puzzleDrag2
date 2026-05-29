---
name: iso-building
description: Use when making, converting, or reimagining a town building as an isometric (2:1 dimetric, "Pokémon-style") SVG asset for the /iso/ gallery, or when running the per-building build→critique loop that produces the full iso building set. Covers the projection technique, the shared isoKit primitives, the scale + plot-tier system, the quality bar, and the builder/critique sub-agent prompts.
---

# Iso Building

Produce high-quality isometric SVG replacements for the town's flat building
illustrations (`src/ui/buildings/*`). Each iso building is a standalone,
viewable asset in the `/iso/` gallery (before vs after). They do **not** go on a
game map. One sub-agent builds one building; one critique sub-agent reviews it;
loop until approved.

The approved **reference** is the Premium forge — `src/iso/buildings/forge.tsx`
(re-exports `src/iso/variants/IsoForgePremium.tsx`). Open `/iso/?building=forge`
and match its finish. Anything you ship must look like it belongs in the same
set as that forge.

## Where things live

| Thing | Path |
|---|---|
| Shared primitives + scale + plot tiers | `src/iso/isoKit.tsx` |
| Iso projection math (`toScreen`, `TILE_W/H`) | `src/iso/isoMath.ts` |
| Palette + Smoke/Steam emitters | `src/ui/buildings/v2kit.tsx` |
| Building component contract / `meta` types | `src/iso/buildingMeta.ts` |
| Auto-discovered iso buildings (one file each) | `src/iso/buildings/<key>.tsx` |
| Before/after gallery (default `/iso/` tab) | `src/iso/BuildingGallery.tsx` |
| Original flat illustrations (the "before") | `src/ui/buildings/<key>.tsx` |
| Progress tracker | `docs/iso-buildings/PROGRESS.md` |
| Animation keyframes (flicker, windmill, …) | `src/index.css` |
| Screenshot helper | `tools/iso-shot.mjs` |

`src/iso/buildings/*.tsx` is **auto-discovered** via `import.meta.glob`. A new
building is a brand-new file — you never edit a shared registry, so building work
is parallel-safe. The filename **is** the building key (must match a key in
`CANONICAL_BUILDING_KEYS` from `src/ui/buildings/index.tsx`).

## The component contract

```tsx
// src/iso/buildings/<key>.tsx
import { useId } from "react";
import { type P, makeGp, IsoDefs, SCALE, PLOT, /* … */ } from "../isoKit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "review",          // todo → in_progress → review → approved
  plot: "normal",            // "small" | "normal" | "large"
  notes: "hero details + animations preserved; …",
};

export default function IsoFoo({ originX, originY, nearDoor = false }:
  { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);          // gp(dx, dy, h) → screen point at tile offset, raised h px
  return (
    <g>
      <IsoDefs id={id} />
      {/* ground shadow → walls (SW shade, SE lit) → eave → roof → chimney/smoke → props */}
    </g>
  );
}
```

The gallery renders every "after" in the same viewBox (`-160 -250 320 330`)
centered on the origin, so **relative plot size is honest** — a Large building
must read visibly bigger than a Small one. Draw around `o = {x:0,y:0}`.

## Construction technique (consistent across every building)

- **2:1 dimetric projection.** `T = 32` (half tile-width), `TH = 16` (half
  tile-height). `gp(dx,dy,h)` is your coordinate system: tile offsets along
  `+gx` (toward screen-right/SE) and `+gy` (toward screen-left/SW), raised `h` px.
- **Panel projection for walls.** Draw a wall as a flat `PANEL.LW × PANEL.LH`
  (120×92) rectangle in local coords — brick courses, windows, doors all in that
  flat space — then wrap it in `<g transform={panelMatrix(originScreenPt, U, V)}>`
  where `U` is the screen vector across the panel width and `V` down its height.
  Courses then follow the iso edges automatically. Use
  `vector-effect="non-scaling-stroke"` on every stroke so weights stay crisp
  under the shear.
- **Lighting is fixed.** The **SE (+gx) face is lit** (`brickLit`/`slateLit`,
  lighter gradient); the **SW (+gy) face is shaded** (`brickShade`/`slateShade`,
  darker). Gradient-shade *every* surface. Radial gradients for fire / lit
  windows (`furnace`, `pane`).
- **Roof.** Prefer the `HipRoof` helper (center apex, individually shingled lit
  + shade slopes, overhung eave with dark fascia, hip ridges = shadow line +
  `PAL.ridge` highlight, apex finial). Use `quadShingles` for mono-pitch
  lean-tos/wings/awnings. **Vary the roof per building** — gable, gambrel,
  conical tower cap, domed, thatched — don't ship 28 identical hip roofs.
- **Grounding.** `GroundShadow` (add `warm` for fire buildings), a stone
  foundation course at the wall base, optional `CobbleApron` forecourt. Add
  ambient occlusion: darken wall bases (`rgba(0,0,0,.18-.22)`) and just under the
  eave.
- **Palette.** Reuse `PAL` (v2kit) for cohesion. Warm glow `#ffcf6a`/`#ff8a28`,
  slate `#5b5346` family, brick `#8a4a30`. **Namespace all gradient ids with
  `useId`** (the gallery renders many buildings at once → id collisions bleed
  gradients between buildings).

## Scale, plot tiers & town cohesion (FIRST-CLASS — do not skip)

- **One reference scale for the whole set.** A door / window / brick-course /
  person is the **same size on every building**. Use the `SCALE` constants
  (`storey 74`, `door 34`, `window 24`, `brickCourse 8`, `roofRise 58`,
  `character 46`). A two-storey building stacks two `SCALE.storey` walls — it
  does **not** inflate the storey height.
- **Snap to a plot tier.** `PLOT.small` (≈2×2 tiles, half 0.8), `PLOT.normal`
  (≈3×3, half 1.1 — the forge), `PLOT.large` (≈4×4, half 1.6). Build the
  footprint to `PLOT[tier].half` tiles from the origin. Claim `large` only when
  the building genuinely needs the room (barn, harbor dock, observatory). Record
  the tier in `meta.plot` **and** in `PROGRESS.md`.
- **Same plot ≠ same shape.** Within a tier, **vary the massing** — L-shapes,
  lean-tos, towers, lofts, porches, attached volumes, gambrel/gable/hip/conical
  roofs — so every building has a distinct, glanceable silhouette while sharing
  the projection, light, palette and scale. **Never ship a row of identical
  cubes.**
- The goal: when the whole set is placed together the town reads as one
  deliberate, cohesive, genuinely-cool family — common scale on aligned plots,
  each building instantly recognizable.

## Quality bar (the hard-won lessons)

- **Readability first — never occlude the hero details.** The Deluxe forge
  regressed because its porch/awning covered the furnace + anvil; Premium wins
  because its signature details are unobstructed. Keep each building's identity
  features fully visible. **Props are edge accents, not foreground occluders.**
- **Multi-volume is the right direction** (main mass + a secondary volume —
  wing/porch/annex — + yard props + fence/cobble) **only when it frames, not
  hides, the identity.**
- **Reimagine for iso; do not trace the elevation.** Exaggerate the silhouette
  and relocate/rotate features so they read in 3/4 view (a front-only feature can
  move onto the SE face; tall/iconic elements can be emphasized). Some features
  *should* be shown differently on purpose.
- **Details + animations are what sell quality (top priority).** Every building
  carries its signature **animated** details, reimagined in iso, and they must be
  **verified up close** — zoom in (`tools/iso-shot.mjs <key> zoom`), watch across
  the loop, check that moving parts are seated/anchored, not floating. "It moves"
  is not enough. Map each building's source keyframes (see below) and preserve
  the intent.
- **Shared props vocabulary** (anvil, bellows, barrels, crates, logs, sign,
  lantern, grindstone, fence, cobble, weather-vane) so assets feel like one set.

## Pitfalls — check every time

- **Detail occlusion** (the Deluxe lesson).
- **Floating parts** — chimneys/dormers/finials must seat on the actual roof
  surface, not at apex height over a lower point. Verify by zoom. Seat chimneys
  apex-relative (e.g. `apex.x ± 24, apex.y + 30`).
- **Stroke scaling under the matrix** → `vector-effect="non-scaling-stroke"`.
- **Gradient-id collisions** → `useId` for every instance.
- **Scale drift** — door/window/character must match `SCALE`. Eyeball against
  the forge at the same gallery viewBox.
- **CSS custom props in `style`** need `as React.CSSProperties` (e.g. `--sx`).

## Calibration learnings (v2 — confirmed on forge/lighthouse/barn/bakery)

The first batch proved the system. Bake these in:

- **Confirmed reference footprint.** A **Normal** building uses `HALF_W = 64`,
  `HALF_H = 32` (a 1-tile-radius diamond), `WALL_H ≈ 72–74`, `ROOF_RISE ≈ 50–58`,
  `EAVE 9`, local panel `120×92`. The forge and bakery share this exactly and
  read as the same size — **copy the forge's wall/roof scaffold for any Normal
  building** and change only material + hero detail. **Small** ≈ scale that down
  / tighter footprint; **Large** ≈ footprint half ~1.35 tiles (the barn) and it
  visibly out-sizes Normal in the gallery. Towers (lighthouse) keep a Small/Normal
  footprint but rise well above one storey.
- **Differentiate by MATERIAL + HERO, not size.** The bakery is the forge's twin
  in scale yet unmistakable: plaster+terracotta vs brick+slate, oven vs furnace,
  bread/pretzel vs anvil. Pick a distinct wall material (brick / plaster+timber /
  board-and-batten / stone), a distinct roof (slate hip / terracotta hip / gambrel
  / cone / dome / thatch), and a single unobstructed glowing hero.
- **Round towers = curved stacked bands + a roundness gradient.** A cylinder
  reads the same from any angle, so don't panel-project it. Draw it as a vertical
  taper and lay horizontal **bands whose top & bottom rims are quadratic arcs
  bulging toward the viewer** (`Q cx,(y+r*0.5*1.25) …`), then overlay one
  horizontal `linearGradient` (dark left → light center-right → dark right) for
  volume. Stripes/seams reuse the same arc. (lighthouse.tsx)
- **Gambrel / multi-pitch roofs:** make the lower slope **steep (near-vertical,
  small Δgy, large Δh)** and the upper **shallow (large Δgy, small Δh)** — if the
  two pitches are similar it reads as one plane. Orient the ridge along **+gx** so
  the gambrel **gable end faces the lit SE** as the hero (doors + loft below it).
  Build slopes with `quadShingles`, draw a bold knee break-line + barge boards on
  the gable rake. (barn.tsx)
- **Mechanical pitfalls that bit us:** the import path from `src/iso/buildings/`
  to the palette is `../../ui/buildings/v2kit.jsx` (two dots-two). Remove unused
  kit imports (lint is strict, `no-unused-vars`). Don't hand-type hex inside
  `stopColor` from memory mid-flow — typos slip in; copy known palette values.
  Seat steam/smoke emitters at the *source* (oven mouth / chimney top), not up in
  the air. CSS custom props (`--sx`) need `as React.CSSProperties`.
- **CI gate:** an obsolete vitest snapshot fails CI under `CI=true` even though it
  passes locally — run `CI=true npx vitest run <file>` if a `test` job goes red.

## Animation map (reimagine each in iso; preserve the intent)

| Building | Signature animations (source keyframes) |
|---|---|
| forge | furnace `flicker`, `ember` rise, lantern flicker, smoke (✅ reference) |
| mill | `windmill` sails rotating, `pollen`/grain drift, smoke |
| bakery | oven glow `flicker`, `steam`/`smoke` from chimney |
| brewery | `steam`, `drip2`, fire flicker, bubbling |
| lighthouse | rotating beam (`bell`/rotate), `wave`/`splash`, lamp glow, gentle `bob` |
| clock_tower | clock hands sweep, `bell` swing, `sway` |
| watchtower | torch/brazier `flicker`, guard `walk`, banner `sway` |
| silo | `grainfall`, vent steam |
| chapel | bell `sway`, candle `flicker`, stained-glass glow |
| apiary | bees / `pollen` drift, `sway` |
| harbor_dock | `wave`/`splash`, moored boat `bob`, hanging net `sway` |
| observatory | rotating dome / telescope, star twinkle, `pollen` |
| (others) | inspect the original `src/ui/buildings/<key>.tsx` for its `animation:` rules and reproduce the intent |

Always open the original and grep for `animation:` to find its real keyframes —
the table is a guide, the source is truth.

## Verification recipe

1. `npm run dev` (background) → `http://localhost:5173/puzzleDrag2/iso/`.
2. `node tools/iso-shot.mjs <key> zoom` → writes
   `/tmp/iso/<key>-before.png`, `-after.png`, `-after-zoom.png`. Read all three.
3. `node tools/iso-shot.mjs gallery` → confirm the new building reads at a
   **consistent scale** beside the forge and its neighbours.
4. `npm run typecheck` · `npm run lint` · `npm run build` all pass.
5. Score against the quality bar (silhouette, hero-detail fidelity, **no
   occlusion**, **scale match**, lighting/AO, shingles/gradients, **animation
   presence + quality**, palette cohesion, correct plot tier).
6. Update `meta.status` and the `PROGRESS.md` row. Open a **non-draft** PR;
   merge with a **merge commit**. `/iso/` is not in the visual-golden matrix, so
   no goldens to refresh.

## The per-building loop

- **Builder** (`./builder-prompt.md`): one sub-agent, one building → writes
  `src/iso/buildings/<key>.tsx`, `meta.status="review"`, updates `PROGRESS.md`,
  self-reviews against the quality bar.
- **Critique** (`./critique-prompt.md`): one sub-agent → screenshots before vs
  after + zoom, scores against the checklist, writes the verdict to
  `PROGRESS.md`, and either approves (`status="approved"`) or returns specific
  fixes to the builder. Loop until approved.

Note: in sandboxes that block `npm`/`git`, the orchestrator (main session) runs
typecheck/lint/build, the screenshots, and the commit/PR/merge; the builder
sub-agent focuses on writing the component, the critique sub-agent on reading the
screenshots and scoring.
