# Motion brief — tile_tree_birch_autumn idle (PixelLab v3)

- **Kind:** idle (loop) · **frames requested:** 8 (v3 stores the reference frame → 9 on disk) · **fps:** 10
- **Executor:** PixelLab v3 text mode on the approved master object (`pixellab.mjs animate
  --name idle2`), frame 0 == the approved keyframe (pixel-identical, diff-verified).
- **animation_description:** "very subtle idle: the three gold canopy clumps sway gently together
  in a light breeze; the white trunk, the grass tuft and the ground shadow at the base stay
  exactly as in the source frame in every frame; overall colors and brightness constant; no
  elements appear or disappear"

## Phases (what G4 checks)

| Phase | Frames | Motion |
|-------|--------|--------|
| lean | 1–4 | canopy clumps flex as one mass, re-forming (arcs, not slides) |
| return | 5–8 | clumps ease back through neutral; loop closes into f0 |

**Rigid:** trunk, grass tuft, ground shadow. **Constant:** palette + brightness; element count.

## History

- v1 (`idle`, rejected at G4): canopy sway was good but the **grass tuft + ground shadow
  disappeared after frame 0** — loop popped on every cycle. Lesson: v3 treats unmentioned
  small elements as optional; pin them by name ("stay exactly as in the source frame").
- v2 (`idle2`, approved): base elements held in all frames.
