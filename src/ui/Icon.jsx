import React, { useState, useEffect } from "react";
import { ICON_REGISTRY, drawIcon } from "../textures/iconRegistry.js";

// Global cache mapping size -> { key -> dataUri }
// We use a combined string key for easy lookups: `${iconKey}_${size}_${dpr}`
const ICON_CACHE = new Map();

export function clearIconCache() {
  ICON_CACHE.clear();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("icon-cache-cleared"));
  }
}

// Debounce resize to trigger global cache clearing so we can bake new resolutions
if (typeof window !== "undefined") {
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(clearIconCache, 200);
  });
}

/**
 * Universal Icon Component
 * Mounts an off-screen canvas exactly once per unique (key, size, dpr) combination,
 * caches the resulting data URI, and renders as an <img> for maximum React performance.
 */
export default function Icon({ iconKey, size = 24, className = "", style = {}, title }) {
  const [dataUri, setDataUri] = useState(null);

  useEffect(() => {
    function getOrBake() {
      if (!iconKey) return null;
      
      const entry = ICON_REGISTRY[iconKey];
      if (!entry) return null;

      const dpr = (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1;
      const cacheKey = `${iconKey}_${size}_${dpr}`;
      
      if (ICON_CACHE.has(cacheKey)) {
        return ICON_CACHE.get(cacheKey);
      }

      // Bake new icon
      const canvas = document.createElement("canvas");
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      const ctx = canvas.getContext("2d");
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      
      // The icons in iconRegistry are designed to be drawn at origin (0,0),
      // typically built for a ~32x32 bounding box. 
      // We translate to the center of our target size canvas.
      ctx.translate(size / 2, size / 2);
      
      // We scale the context so the nominal 32px path fits perfectly into `size`.
      const scaleFactor = size / 32;
      ctx.scale(scaleFactor, scaleFactor);
      
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      try {
        drawIcon(ctx, iconKey);
      } catch (e) {
        console.error(`Failed to draw icon: ${iconKey}`, e);
      }

      const uri = canvas.toDataURL("image/png");
      ICON_CACHE.set(cacheKey, uri);
      return uri;
    }

    setDataUri(getOrBake());

    const handleCacheCleared = () => {
      setDataUri(getOrBake());
    };

    window.addEventListener("icon-cache-cleared", handleCacheCleared);
    return () => window.removeEventListener("icon-cache-cleared", handleCacheCleared);
  }, [iconKey, size]);

  if (!dataUri) {
    // Fallback block if icon is missing or not yet generated
    return (
      <div 
        className={`inline-flex items-center justify-center font-bold opacity-50 ${className}`} 
        style={{ width: size, height: size, fontSize: size * 0.5, ...style }}
        title={`Missing icon: ${iconKey}`}
      >
        ?
      </div>
    );
  }

  return (
    <img
      src={dataUri}
      alt={iconKey}
      title={title || ICON_REGISTRY[iconKey]?.label || iconKey}
      className={`inline-block align-middle ${className}`}
      style={{
        width: size,
        height: size,
        userSelect: "none",
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}
