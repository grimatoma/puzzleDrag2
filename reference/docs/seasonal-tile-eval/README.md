# Seasonal vector tiles — animation & keyframe evaluation

`index.html` is a single-file, self-contained evaluation of all **80** all-vector
animated seasonal board tiles (`src/textures/seasonal/**`): their four per-season
**keyframes**, the two-tier **WC3-style idle** (calm common beat + rare bold
action), and the forward season→season **transitions**. Open it in any browser —
no server, no assets (the close-up evidence strips are inlined as base64).

It covers the **vector** pipeline only (the hand-drawn `paint(ctx, params, pose)`
modules), **not** the separate PixelLab pixel-art route.

## What's inside

- **Overview** — verdict, score distribution, per-biome averages, method.
- **Seasonal Keyframes** — the winter "frosted vs whited-out" defect, identity
  mis-reads, the too-flat mineral seasons, and what to change/enhance.
- **Idle & WC3** — the two-tier model, the reference rig, and the liveliness gap
  (fish + minerals have no rare tier).
- **Consistency** — cross-cutting issues (ambient-dressing loop seam, winter
  dressing, contrast on matching discs, phase scheduling, the one crossfade
  outlier).
- **Per-tile scores** — a filterable table of all 80 tiles (KF / idle / WC3 /
  transitions / consistency / overall + a one-line note each).
- **Fixes & Recs** — the 6 P0 correctness bugs with `file:line`, the P1 polish
  themes, and P2 enhancements.

## How it was produced

Each tile was rendered with the **actual** tile-drawing code (esbuild-bundled
straight from `showcaseTiles.ts`), composited onto the real board disc colour at
the true −24..+24 design box, into a per-tile contact sheet (4 seasons + both
idle tiers + all 3 transitions) and a high-res zoom pack. The two idle tiers were
isolated by scanning idle motion-energy (same technique as the live preview).
Thirteen reviewers cross-checked every render against source, several writing
numerical probes to *measure* seam error, transition endpoints and idle-energy
ratios.

> The render harness, the 160 contact-sheet / zoom PNGs, and the per-family raw
> findings live in a local scratch dir and are **not** committed (they're
> regenerable). To *watch* the tiles animate, use the live motion preview at
> [`reference/docs/seasonal-vector-tiles/`](../seasonal-vector-tiles/index.html).
