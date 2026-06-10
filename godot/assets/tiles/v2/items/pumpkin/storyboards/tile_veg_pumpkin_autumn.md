# Motion brief — tile_veg_pumpkin_autumn idle (PixelLab v3)

- **Kind:** idle (loop) · **frames requested:** 8 (v3 stores the reference frame → 9 on disk) · **fps:** 10
- **Executor:** PixelLab v3 text mode on the approved master object (`pixellab.mjs animate
  --name idle2`), so frame 0 == the approved keyframe (pixel-identical, diff-verified).
- **animation_description:** "very subtle idle: only the green vine tendrils sway and flex gently
  in a light breeze; the pumpkin body, colors and overall brightness stay completely constant; no
  glow, no pulsing, no color change on the rind"

## Phases (what G4 checks)

| Phase | Frames | Motion |
|-------|--------|--------|
| sway out | 1–4 | both tendrils flex left/up, re-drawn each frame (arcs, not slides) |
| sway back | 5–8 | tendrils return through neutral with slight overshoot; loop closes into f0 |

**Rigid:** pumpkin body, stem base, shadow. **Constant:** rind palette + overall brightness.

## History

- v1 (`idle` on the object, rejected at G4): the brief said "a soft sheen glint passes slowly
  across the rind" — v3 staged it as a whole-rind brightness swell (frames 2–6 visibly brighter),
  reading as a glow pulse at 10fps. Lesson: name what must stay CONSTANT explicitly; the "no glow,
  no pulsing, no color change" wording fixed it.
- v2 (`idle2` on the object, approved): brightness constant, tendril-only motion, organic re-forms.
