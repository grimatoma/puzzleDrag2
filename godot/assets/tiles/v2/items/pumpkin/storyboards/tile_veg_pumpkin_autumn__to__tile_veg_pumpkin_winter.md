# Motion brief — tile_veg_pumpkin_autumn → tile_veg_pumpkin_winter transition (PixelLab v3 interpolation)

- **Kind:** transition (plays once, holds final frame) · **frames requested:** 16 (v3 max; stores
  the reference frame → 17 on disk) · **fps:** 10
- **Executor:** PixelLab v3 **interpolation** on the approved master object — the start frame
  defaults to the object's own frame (== the autumn keyframe), `--end` = the approved winter
  keyframe PNG. **Frame 0 is pixel-identical to the autumn keyframe and frame 16 to the winter
  keyframe** (diff-verified), so autumn idle → transition → winter idle chains seamlessly.
- **animation_description:** "autumn to winter transition: green tendrils wither and droop to
  gray-brown, frost creeps across the rind paling it top-down, snow falls and settles as a white
  cap on the crown and a small mound at the base"

## Phases (what G4 checks)

| Phase | Frames | Physical change |
|-------|--------|-----------------|
| hold + first chill | 0–5 | body holds; tendrils darken/wither in place; rind starts losing saturation |
| frost creep | 6–11 | rind pales progressively top-down; first snow gathers around the stem; base patch appears |
| snow settle | 12–16 | cap forms and spreads down the crown; base mound completes; lands exactly on the winter keyframe |

**Same object throughout** — size, position, silhouette, and stem/tendril placement never jump.
That is the consistency contract interpolation mode guarantees; the pre-object pipeline's
hand-built tween between two unrelated text generations body-swapped around frame 15 (and its
winter keyframe was a different-sized pumpkin with the stem on the other side).
