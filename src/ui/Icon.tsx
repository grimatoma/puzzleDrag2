import { useState, useEffect } from "react";
import { ICON_REGISTRY, type IconVariant } from "../textures/iconRegistry.js";
import { paintIcon } from "../textures/paintIcon.js";
import { onSeasonalArtLoaded } from "../textures/seasonal/seasonalArt.js";

// Global cache mapping size -> { key -> dataUri }
// We use a combined string key for easy lookups: `${iconKey}_${size}_${dpr}`
const ICON_CACHE = new Map<string, string>();

export function clearIconCache() {
  ICON_CACHE.clear();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("icon-cache-cleared"));
  }
}

// Debounce resize to trigger global cache clearing so we can bake new resolutions
if (typeof window !== "undefined") {
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(clearIconCache, 200);
  });
}

// In dev, invalidate the cache when any icon registry / texture module is
// hot-reloaded so saved edits show up immediately without a full reload.
if (import.meta.hot) {
  import.meta.hot.accept(["../textures/iconRegistry.js"], () => clearIconCache());
}

// Re-bake cached icons once baked seasonal art (e.g. the willow Spring
// reference) finishes loading, so any icon that cached the procedural fallback
// updates to the reference still.
onSeasonalArtLoaded(() => clearIconCache());

/**
 * Universal Icon Component
 * Mounts an off-screen canvas exactly once per unique (key, size, dpr) combination,
 * caches the resulting data URI, and renders as an <img> for maximum React performance.
 */
export default function Icon({ iconKey, size = 24, variant = "auto", className = "", style = {}, title }: { iconKey: string | null | undefined; size?: number; variant?: IconVariant; className?: string; style?: React.CSSProperties; title?: string }) {
  const [dataUri, setDataUri] = useState<string | null>(null);

  useEffect(() => {
    function getOrBake() {
      if (!iconKey) return null;

      const entry = (ICON_REGISTRY as Record<string, unknown>)[iconKey];
      if (!entry) return null;

      const dpr = (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1;
      const cacheKey = `${iconKey}_${size}_${dpr}_${variant}`;

      if (ICON_CACHE.has(cacheKey)) {
        return ICON_CACHE.get(cacheKey) ?? null;
      }

      // Bake new icon
      const canvas = document.createElement("canvas");
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      paintIcon(ctx, iconKey, size, variant);

      const uri = canvas.toDataURL("image/png");
      ICON_CACHE.set(cacheKey, uri);
      return uri;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs local state with the ICON_CACHE external store + the `icon-cache-cleared` event
    setDataUri(getOrBake());

    const handleCacheCleared = () => {
      setDataUri(getOrBake());
    };

    window.addEventListener("icon-cache-cleared", handleCacheCleared);
    return () => window.removeEventListener("icon-cache-cleared", handleCacheCleared);
  }, [iconKey, size, variant]);

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
      alt={iconKey ?? ""}
      title={title || (iconKey ? (ICON_REGISTRY as Record<string, { label?: string }>)[iconKey]?.label : "") || iconKey || ""}
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
