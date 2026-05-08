import { useEffect, useRef } from "react";
import { drawIcon, iconColor } from "../textures/iconRegistry.js";

/**
 * Renders an iconRegistry icon to a small <canvas>. Icons are drawn at the
 * canvas center (origin 0,0) and assume the rendering area roughly fits a
 * 64×64 box; the wrapper scales the drawing context to match `size`.
 *
 * Props:
 *   - iconKey: string — registry key (e.g. "char_mira", "soup", "carrot")
 *   - size: number — pixel width/height (default 48)
 *   - background: string|null — optional CSS color for backdrop circle
 *   - rounded: bool — clip to circle (default true)
 *   - title: optional aria/title
 *   - className: optional class
 */
export default function IconCanvas({
  iconKey,
  size = 48,
  background = null,
  rounded = true,
  title,
  className = "",
  ...rest
}) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);
    if (background) {
      ctx.fillStyle = background;
      if (rounded) {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(0, 0, size, size);
      }
    }
    ctx.translate(size / 2, size / 2);
    // Icons are drawn assuming a ~64px tile; scale down/up to match `size`.
    const scale = size / 64;
    ctx.scale(scale, scale);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    drawIcon(ctx, iconKey);
    ctx.restore();
  }, [iconKey, size, background, rounded]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      style={{ width: size, height: size, display: "block" }}
      title={title || iconKey}
      className={className}
      {...rest}
    />
  );
}

/** Returns whether a given key is registered. */
export function hasIcon(key) {
  return iconColor(key) !== null;
}
