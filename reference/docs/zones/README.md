# docs/zones — the Zone Atlas (and zone build-out)

> **Design canon moved.** The canonical settlement roster, gate model and per-town design now
> live in [`docs/design/towns.html`](../design/towns.html) + [`progression.html`](../design/progression.html).
> This folder stays a **layout / art generator** — the environments, growth topologies, tier-ladder
> costs and per-zone Grow play-throughs the canon draws from. Edit zone data here; state design
> decisions in the canon.

Ten unique, AAA-bar settlement zones for puzzleDrag2. Each is a different **environment** and a
different **logic of growth**, built on the [town-layout](../town-layout/) foundation (roads-first,
the wilderness as the progress bar, a landmark that levels up in place) and taken somewhere new.

This is a **data-driven generator**, not a hand-written HTML wall — so an improvement to the shared
engine regenerates every zone at once. That is the cross-pollination mechanism: fix the engine once,
all ten benefit.

## Layout

```
data/
  world.mjs    # design principles, the 10 growth topologies, hazard/boss sourcing, regions
  zones.mjs    # the 10 zone specs — the single source of truth (environment, ladder, hazards, boss…)
lib/
  engine.js    # shared procedural canvas engine — one painter per growth-topology, palette-driven
  styles.css   # shared CSS (warm-earthy base, per-zone accent set inline from each palette)
  atlas.mjs    # builds the overview atlas (index.html) from the specs
build.mjs      # generator — validates the data, inlines styles+engine, writes index.html
verify.mjs     # headless Playwright check — console errors, non-blank canvases, review screenshots
index.html     # GENERATED — self-contained, ships to GitHub Pages via tools/build-docs.mjs
```

## Build & verify

```bash
node docs/zones/build.mjs     # regenerate index.html (runs data sanity checks first)
node docs/zones/verify.mjs    # headless render check + screenshots → docs/zones/_review/ (gitignored)
```

`build.mjs` fails if a topology is reused, a plot curve doesn't increase, a tier-0 isn't free, a
zone's landmark stages don't match its rung count, or a rung gates on a resource that is neither a
base/board resource nor a documented `newResource` (the no-softlock guardrail).

## Editing rules (the craft bar)

- Every zone claims exactly **one** of the ten growth topologies — no two grow the same way.
- A gating resource must be producible by the rung **before** it spends it. Document any flavour
  resource in the zone's `newResources` (the build enforces this).
- Iterate the mockup in **flat colours / vector** first; pixel art is generated only once a layout
  locks (Pass 2 per-zone docs + `townMaps.ts`).

## Roadmap

- **Pass 1:** the atlas — propose and pitch all ten zones (`index.html`). ✅
- **Pass 2:** each zone has a live top-down *Grow* play-through on the real `40×30 @ 32px` grid, a tile
  inventory, and an art bible (`<id>/index.html`) — all ten collision-verified, critically reviewed,
  merged. ✅
- **Next:** port the locked layouts into `src/ui/town/townMaps.ts`; generate the pixel art (PixelLab)
  once positions are final.

The method is captured in the **`zone-design`** skill (`.claude/skills/zone-design/`).
