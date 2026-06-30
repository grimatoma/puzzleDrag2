import { getDevicePixelRatio } from "../dpr.js";
import { useState, useEffect } from "react";
import { ICON_REGISTRY, iconLabel, type IconVariant } from "../textures/iconRegistry.js";
import { paintIcon } from "../textures/paintIcon.js";
import { onSeasonalArtLoaded } from "../textures/seasonal/seasonalArt.js";
import { svgRenderFor, registerSvgIcons, hasIcon } from "./iconSvgRegistry.js";

// Re-exported so callers (and the back-compat primitives/Icon façade) have a
// single import surface for the icon system.
export { registerSvgIcons, hasIcon };

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

// ─── Tone → fill colour for the vector (SVG) path ─────────────────────────────
const TONE_FILL: Record<string, string> = {
  inherit: "currentColor",
  muted: "var(--ink-light)",
  ember: "var(--ember)",
  gold: "var(--gold)",
  moss: "var(--moss)",
};

function labelForKey(key: string | null | undefined): string {
  if (!key) return "";
  const fromRegistry = iconLabel(key);
  if (fromRegistry) return fromRegistry;
  const idx = key.lastIndexOf("_");
  const seg = idx >= 0 ? key.slice(idx + 1) : key;
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

function placeholderLetter(key: string | null | undefined): string {
  if (!key) return "?";
  const idx = key.indexOf("_");
  const seg = idx >= 0 ? key.slice(idx + 1) : key;
  return (seg.charAt(0) || "?").toUpperCase();
}

/**
 * Shown when a key resolves to neither an SVG nor a baked canvas icon (missing
 * registry entry, or a design.* key in an entry that never registered the SVG
 * set). A lettered chip reads better than a bare "?" — ported from the former
 * primitives/Icon so dev-panel placeholders stay consistent.
 */
function Placeholder({ iconKey, size, title }: { iconKey: string | null | undefined; size: number; title?: string }) {
  return (
    <span
      role="img"
      aria-label={title}
      title={title}
      className="inline-flex items-center justify-center align-middle bg-parchment border border-iron text-ink font-semibold select-none"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(8, Math.floor(size * 0.6)),
        lineHeight: 1,
        borderRadius: 3,
      }}
    >
      {placeholderLetter(iconKey)}
    </span>
  );
}

interface IconProps {
  iconKey: string | null | undefined;
  size?: number;
  variant?: IconVariant;
  /** Vector (design.*) icons only: tints the SVG fill. */
  tone?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

/**
 * Vector path — renders a registered design.* icon as inline SVG. Mirrors the
 * former ui/primitives/Icon render so the design icon set looks identical.
 */
function SvgIconView({
  iconKey,
  render,
  size,
  tone = "inherit",
  className = "",
  style,
  title,
}: {
  iconKey: string | null | undefined;
  render: (props: { size: number; fill: string }) => React.ReactNode;
  size: number;
  tone?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  const label = title != null ? title : labelForKey(iconKey);
  const fill = TONE_FILL[tone] || TONE_FILL.inherit;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={className || undefined}
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        verticalAlign: "middle",
        color: fill,
        ...style,
      }}
    >
      {render({ size, fill })}
    </span>
  );
}

/**
 * Canvas path — bakes an iconRegistry icon to a PNG data-URI exactly once per
 * unique (key, size, dpr, variant) and renders it as an <img> for performance.
 */
function BakedImgIcon({ iconKey, size, variant, className = "", style = {}, title }: {
  iconKey: string | null | undefined;
  size: number;
  variant: IconVariant;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  const [dataUri, setDataUri] = useState<string | null>(null);

  useEffect(() => {
    function getOrBake() {
      if (!iconKey) return null;

      const entry = (ICON_REGISTRY as Record<string, unknown>)[iconKey];
      if (!entry) return null;

      const dpr = getDevicePixelRatio();
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
    // Missing or not-yet-baked icon → lettered placeholder chip.
    return <Placeholder iconKey={iconKey} size={size} title={title || (iconKey ? labelForKey(iconKey) : undefined)} />;
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

/**
 * Universal Icon component.
 *
 * One entry point for the two icon families that used to live in separate
 * components: the vector `design.*` set (registered SVG) and the canvas
 * iconRegistry set (baked to <img>). The key decides the path — registered
 * SVG keys render as inline SVG (honouring `tone`); everything else takes the
 * cached canvas path (honouring `variant`). `ui/primitives/Icon` is now a thin
 * re-export of this component for back-compat.
 */
export default function Icon({
  iconKey,
  size = 24,
  variant = "auto",
  tone = "inherit",
  className = "",
  style = {},
  title,
}: IconProps) {
  const render = svgRenderFor(iconKey);
  if (render) {
    return (
      <SvgIconView
        iconKey={iconKey}
        render={render}
        size={size}
        tone={tone}
        className={className}
        style={style}
        title={title}
      />
    );
  }
  return (
    <BakedImgIcon
      iconKey={iconKey}
      size={size}
      variant={variant}
      className={className}
      style={style}
      title={title}
    />
  );
}
