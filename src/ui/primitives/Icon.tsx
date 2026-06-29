import { getDevicePixelRatio } from "../../dpr.js";
import { useEffect, useRef } from "react";
import { iconColor, iconLabel } from "../../textures/iconRegistry.js";
import { paintIcon } from "../../textures/paintIcon.js";
import { useSeasonalArtReady } from "../useSeasonalArtReady.js";

type SvgRender = (props: { size: number; fill: string }) => React.ReactNode;
const SVG_REGISTRY: Record<string, SvgRender> = {};
const WARNED = new Set<string>();

export function registerSvgIcons(map: Record<string, unknown> | null | undefined) {
  if (!map || typeof map !== "object") return;
  for (const key of Object.keys(map)) {
    const value = (map as Record<string, unknown>)[key];
    if (typeof value === "function") SVG_REGISTRY[key] = value as SvgRender;
  }
}

export function hasIcon(key: string | null | undefined) {
  if (!key) return false;
  if (SVG_REGISTRY[key]) return true;
  return iconColor(key) !== null;
}

const TONE_FILTER: Record<string, string | undefined> = {
  inherit: undefined,
  muted:   "grayscale(0.6) opacity(0.7)",
  ember:   "sepia(1) saturate(4) hue-rotate(-25deg)",
  gold:    "sepia(1) saturate(3) hue-rotate(0deg) brightness(1.1)",
  moss:    "sepia(1) saturate(3) hue-rotate(40deg) brightness(0.95)",
};

const TONE_FILL: Record<string, string> = {
  inherit: "currentColor",
  muted:   "var(--ink-light)",
  ember:   "var(--ember)",
  gold:    "var(--gold)",
  moss:    "var(--moss)",
};

function placeholderLetter(key: string | null | undefined) {
  if (!key) return "?";
  const idx = key.indexOf("_");
  const seg = idx >= 0 ? key.slice(idx + 1) : key;
  return (seg.charAt(0) || "?").toUpperCase();
}

function labelForKey(key: string | null | undefined) {
  if (!key) return "";
  const fromRegistry = iconLabel(key);
  if (fromRegistry) return fromRegistry;
  const idx = key.lastIndexOf("_");
  const seg = idx >= 0 ? key.slice(idx + 1) : key;
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

function CanvasIcon({ iconKey, size, tone, title }: { iconKey: string; size: number; tone: string; title?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const seasonalReady = useSeasonalArtReady();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = getDevicePixelRatio();
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);
    paintIcon(ctx, iconKey, size);
  }, [iconKey, size, seasonalReady]);

  const filter = TONE_FILTER[tone];
  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      title={title}
      aria-label={title}
      role="img"
      style={{
        width: size,
        height: size,
        display: "inline-block",
        verticalAlign: "middle",
        userSelect: "none",
        pointerEvents: "none",
        filter,
      }}
    />
  );
}

function Placeholder({ iconKey, size, title }: { iconKey: string | null | undefined; size: number; title?: string }) {
  const letter = placeholderLetter(iconKey);
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
      {letter}
    </span>
  );
}

export default function Icon({ iconKey, size = 20, tone = "inherit", title }: { iconKey: string | null | undefined; size?: number; tone?: string; title?: string }) {
  const label = title != null ? title : labelForKey(iconKey);
  const key = iconKey ?? "";

  const svgRender = key ? SVG_REGISTRY[key] : undefined;
  if (svgRender) {
    const fill = TONE_FILL[tone] || TONE_FILL.inherit;
    return (
      <span
        role="img"
        aria-label={label}
        title={label}
        style={{
          width: size,
          height: size,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          verticalAlign: "middle",
          color: fill,
        }}
      >
        {svgRender({ size, fill })}
      </span>
    );
  }

  if (key && iconColor(key) !== null) {
    return <CanvasIcon iconKey={key} size={size} tone={tone} title={label} />;
  }

  if (iconKey && !WARNED.has(iconKey)) {
    WARNED.add(iconKey);
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
      console.warn("missing icon: " + iconKey);
    }
  }
  return <Placeholder iconKey={iconKey} size={size} title={label} />;
}
