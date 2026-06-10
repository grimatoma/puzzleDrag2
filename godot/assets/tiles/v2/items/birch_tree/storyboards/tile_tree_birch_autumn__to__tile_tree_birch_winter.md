# Motion brief — tile_tree_birch_autumn → tile_tree_birch_winter transition (PixelLab v3 interpolation)

- **Kind:** transition (plays once, holds final frame) · **frames requested:** 16 (v3 max; stores
  the reference frame → 17 on disk) · **fps:** 10
- **Executor:** PixelLab v3 **interpolation** on the approved master object — start defaults to
  the object's own frame (== autumn keyframe), `--end` = the approved winter keyframe PNG.
  **Frame 0 is pixel-identical to the autumn keyframe and the last frame to the winter keyframe**
  (diff-verified), so autumn idle → transition → winter idle chains seamlessly.
- **animation_description:** "autumn to winter transition: the gold leaves detach in staggered
  clumps from the canopy edges inward and flutter down off the tree, gradually revealing the bare
  gray-brown branches underneath; snow starts to fall, settling along the tops of the limbs and
  building a white snow mound over the grass at the base; the white trunk never moves"

## Phases (what G4 checks)

| Phase | Frames | Physical change |
|-------|--------|-----------------|
| first release | 0–5 | edge clumps thin and detach; loose leaves flutter down with x-wobble; trunk holds |
| strip + reveal | 6–11 | canopy loses mass inward; bare branches emerge where clumps left; first snow falls |
| settle | 12–16 | last leaves clear; snow lines the limbs; base mound builds over the grass; lands exactly on the winter keyframe |

**Same tree throughout** — the trunk never moves and the branch skeleton that emerges is the one
the winter keyframe ends with (it was state-derived from this master, so the envelope matches).
The pre-object pipeline's version was a top-down reveal wipe of a structurally different tree.
