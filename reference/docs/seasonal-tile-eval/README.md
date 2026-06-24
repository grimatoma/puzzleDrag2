# Farm tile animations — re-evaluation (uniqueness-first)

`index.html` is a single-file, self-contained, **per-tile** evaluation of all **63
farm** all-vector animated seasonal board tiles (`src/textures/seasonal/**`):
their four per-season **keyframes**, the two-tier **WC3-style idle** (calm common
beat + rare bold action), and the season→season **transitions**. Open it in any
browser — no server, no external assets (every per-tile filmstrip and evidence
strip is inlined as base64; expect a ~3.4 MB file).

Scope: **farm only** — fish, minerals, coin and the giant pearl are out of scope.
Vector pipeline only (the hand-drawn `paint(ctx, params, pose)` modules), **not**
the PixelLab pixel-art route.

## The lens

This pass scores **uniqueness over consistency**: a tile that repeats a shared
idiom is marked *down*, not up, and the WC3 rare action is judged on whether it's
genuinely **bold & fun** — not merely a bigger idle. Two systemic repeats
dominate the result and drive most of the sub-4 tiles:

- **One bounce, 18 produce** — every fruit & vegetable shares the same
  wobble + squash-stretch hop.
- **One scarf, 26 animals** — every bird/herd/cattle/mount wears the same winter scarf.

## What's inside

- **Overview** — the uniqueness-first verdict, score distribution, direct answers
  to the brief, method (+ the motion-scan caveat).
- **Seasonal Keyframes** — keep them, with three fixes: the winter "white-out"
  (oak/birch/willow), the cross-filed identity tiles (heather/clover/melon), and
  the exemplars.
- **Idle & WC3 (bold & fun)** — the bar (turkey tail-fan), the produce
  "rare = bigger bounce" anti-pattern, and the weak/absent rares.
- **Uniqueness** — the four shared repeats ranked by cost, and which to keep
  (wind on grain/grass, chew on ruminants) vs. fix (bounce, scarf, robin bird, swine cluster).
- **Per-tile scores** — every one of the 63 tiles as a visual card: its actual
  render (4 season keyframes + idle crest + WC3 crest), four axis scores
  (**KF / Idle / WC3 / Uniq**), overall rank, a note, and the specific lift to ≥4.
  Filter by family or "below 4."
- **Plan → ≥4** — the full remediation plan: P0 correctness bugs, the produce-motion
  program (the #1 lever), winter/identity keyframe fixes, weak-rare bold-ups, and
  shared-prop diversification — each with current→target scores.

## How it was produced

Each tile was rendered with the **actual** tile-drawing code (esbuild-bundled
from `showcaseTiles.ts`), composited onto the real board disc gradient at the true
−24..+24 design box. Per-tile **filmstrips** (4 seasons + idle crest + WC3 crest)
and narrative comparison strips were shot with Playwright/Chromium; the two idle
tiers were auto-isolated by scanning idle motion-energy. Scores were re-derived
from a close-up zoom pass plus a source read of each tile's `poseFromClock` /
transition code and the shared-idiom subroutines (the produce bounce, the winter
scarf).

> The render harness, the filmstrip/zoom PNGs and the per-family raw findings live
> in a local scratch dir and are **not** committed (they're regenerable). To
> *watch* the tiles animate, use the live motion preview at
> [`reference/docs/seasonal-vector-tiles/`](../seasonal-vector-tiles/index.html).
