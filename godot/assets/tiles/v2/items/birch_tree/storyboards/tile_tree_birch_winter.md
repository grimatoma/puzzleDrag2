# Motion brief — tile_tree_birch_winter idle (PixelLab v3)

- **Kind:** idle (loop) · **frames requested:** 6 (v3 stores the reference frame → 7 on disk) · **fps:** 10
- **Executor:** PixelLab v3 text mode on the approved winter state object (`pixellab.mjs animate
  --name idle2`), frame 0 == the approved keyframe (pixel-identical, diff-verified).
- **animation_description:** "nearly static idle: the bare winter tree holds completely rigid and
  identical to the source frame - every branch, the trunk and the snow mound stay unchanged in
  every frame; the ONLY motion is a few tiny white snow flecks drifting slowly straight down in
  front of the tree; nothing else changes, nothing disappears"

## Phases (what G4 checks)

| Phase | Frames | Motion |
|-------|--------|--------|
| drift | 1–6 | a few snow flecks descend at constant pace, staggered; recycle across the loop seam |

**Rigid:** the ENTIRE tree (every branch pixel), trunk, snow mound. **Constant:** palette.

## History

- v1 (`idle`, rejected at G4): the thin 1px branch network **flickered and thinned out** frame to
  frame — v3 re-imagined the branches each frame instead of holding them. Lesson: for sprites
  whose structure is mostly 1px lines, demand "completely rigid / identical to the source frame"
  and put ALL motion in overlay elements (flecks); if v3 still can't hold it, the Aseprite
  static-base + fx-overlay fallback expresses this trivially.
- v2 (`idle2`, approved): tree held rigid; fleck-only motion.
