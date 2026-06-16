// L0 (style) + L1 (base / framing) meta.
//
// These are carried into EVERY generation and edit so the model receives the full
// framing + style contract on every call — the missing piece that let the subject
// drift in size, position and footprint between seasons.
//
// Source of truth: docs/seasonal-tile-system/index.html -> #layers (L0 style anchor,
// L1 base/framing — the willow diorama geometry).

// L0 — style, expressed in words. The style is ALSO carried by the two canonical
// style-image anchors (passed as `style_images`); this is the verbal half, used as
// `style_description` on generate and folded into every edit description.
export const STYLE_WORDS =
  "cozy farm board-game pixel art, flat cel-shaded with a soft dark outline, " +
  "a clean readable silhouette and a limited warm palette, crisp pixels";

// Short style reminder appended to edit prompts (the long form lives on the anchor).
export const STYLE_LOCK =
  "keep the same cozy flat cel-shaded board-game pixel-art style, soft dark outline, " +
  "limited palette, transparent background";

// L1 — base / framing, quantified from the willow diorama set. Generation is ALWAYS at
// 128px (then decimated to 64 for the small tiles), so the geometry is the 128 set:
// pad ~60% of width, base near the bottom edge; subject centered above, ~75% of height.
export const FRAMING =
  "a single game tile on a fully transparent background, the subject resting on one " +
  "small round \"diorama\" ground pad centered along the bottom of the frame (the pad " +
  "about 60% of the tile width, its base near the bottom edge), the subject centered " +
  "directly above the pad and filling roughly 75% of the frame height, with generous " +
  "transparent margin on every side";

// Re-asserted on every EDIT so a season re-dress never lets the subject move or resize.
// This is the lock that the thin one-liner prompts dropped.
export const FOOTPRINT_LOCK =
  "keep the subject at the EXACT same size, position, rotation, lean and footprint on the " +
  "same pad as the source image — do not move, rescale, rotate, straighten, reshape, recrop " +
  "or redraw it; preserve its exact orientation and silhouette";
