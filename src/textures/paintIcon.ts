import { drawIcon } from "./iconRegistry.js";

// iconRegistry draw functions emit paths around origin (0,0) sized for a
// ~64x64 bounding box. Any renderer that paints an icon into a canvas must
// translate to the canvas centre and scale by `size / ICON_DESIGN_BOX`.
export const ICON_DESIGN_BOX = 64;

/**
 * Paint a registered icon centred into a 2D context already prepared by the
 * caller (DPR-scaled, cleared, optional backdrop filled). Wraps the icon
 * transform in save/restore so the caller's transform/style state is
 * untouched. Returns the drawIcon() result (true if the key was found).
 */
export function paintIcon(ctx: CanvasRenderingContext2D, iconKey: string, size: number) {
  ctx.save();
  ctx.translate(size / 2, size / 2);
  const scale = size / ICON_DESIGN_BOX;
  ctx.scale(scale, scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  let ok = false;
  try {
    ok = drawIcon(ctx, iconKey);
  } catch (e) {
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
      console.error("Icon draw failed: " + iconKey, e);
    }
  }
  ctx.restore();
  return ok;
}
