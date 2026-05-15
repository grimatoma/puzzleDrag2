import { useEffect, useRef } from "react";
import { drawIcon, iconColor, iconLabel } from "../../textures/iconRegistry.js";

const SVG_REGISTRY = {};
const WARNED = new Set();

export function registerSvgIcons(map) {
  if (!map || typeof map !== "object") return;
  for (const key of Object.keys(map)) {
    if (typeof map[key] === "function") SVG_REGISTRY[key] = map[key];
  }
}

export function hasIcon(key) {
  if (!key) return false;
  if (SVG_REGISTRY[key]) return true;
  return iconColor(key) !== null;
}

const TONE_FILTER = {
  inherit: undefined,
  muted:   "grayscale(0.6) opacity(0.7)",
  ember:   "sepia(1) saturate(4) hue-rotate(-25deg)",
  gold:    "sepia(1) saturate(3) hue-rotate(0deg) brightness(1.1)",
  moss:    "sepia(1) saturate(3) hue-rotate(40deg) brightness(0.95)",
};

const TONE_FILL = {
  inherit: "currentColor",
  muted:   "var(--ink-light)",
  ember:   "var(--ember)",
  gold:    "var(--gold)",
  moss:    "var(--moss)",
};

function placeholderLetter(key) {
  if (!key) return "?";
  const idx = key.indexOf("_");
  const seg = idx >= 0 ? key.slice(idx + 1) : key;
  return (seg.charAt(0) || "?").toUpperCase();
}

function labelForKey(key) {
  const fromRegistry = iconLabel(key);
  if (fromRegistry) return fromRegistry;
  if (!key) return "";
  const idx = key.lastIndexOf("_");
  const seg = idx >= 0 ? key.slice(idx + 1) : key;
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

function CanvasIcon({ iconKey, size, tone, title }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);
    ctx.translate(size / 2, size / 2);
    const scale = size / 32;
    ctx.scale(scale, scale);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    try {
      drawIcon(ctx, iconKey);
    } catch (e) {
      if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
        console.error("Icon draw failed: " + iconKey, e);
      }
    }
  }, [iconKey, size]);

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

function Placeholder({ iconKey, size, title }) {
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

export default function Icon({ iconKey, size = 20, tone = "inherit", title }) {
  const label = title != null ? title : labelForKey(iconKey);

  const svgRender = SVG_REGISTRY[iconKey];
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

  if (iconColor(iconKey) !== null) {
    return <CanvasIcon iconKey={iconKey} size={size} tone={tone} title={label} />;
  }

  if (iconKey && !WARNED.has(iconKey)) {
    WARNED.add(iconKey);
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
      console.warn("missing icon: " + iconKey);
    }
  }
  return <Placeholder iconKey={iconKey} size={size} title={label} />;
}
