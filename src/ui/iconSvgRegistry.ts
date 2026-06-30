/**
 * iconSvgRegistry.ts — registry for the vector `design.*` icon set.
 *
 * Part of the unified Icon (src/ui/Icon.tsx). The game entry (main.tsx) calls
 * registerDesignIcons() → registerSvgIcons(DESIGN_ICONS_MAP) to populate this,
 * so design.* keys render as crisp SVG; everything else falls back to the
 * canvas/baked-img path. Kept in its own module (no React component) so both
 * the unified Icon and the back-compat primitives/Icon façade can share it
 * without a circular import.
 */

import type { ReactNode } from "react";
import { iconColor } from "../textures/iconRegistry.js";

export type SvgRender = (props: { size: number; fill: string }) => ReactNode;

const SVG_REGISTRY: Record<string, SvgRender> = {};

export function registerSvgIcons(map: Record<string, unknown> | null | undefined): void {
  if (!map || typeof map !== "object") return;
  for (const key of Object.keys(map)) {
    const value = (map as Record<string, unknown>)[key];
    if (typeof value === "function") SVG_REGISTRY[key] = value as SvgRender;
  }
}

/** The SVG renderer for a design.* key, or undefined if not registered. */
export function svgRenderFor(key: string | null | undefined): SvgRender | undefined {
  if (!key) return undefined;
  return SVG_REGISTRY[key];
}

/** True if the key resolves to either a registered SVG icon or a canvas icon. */
export function hasIcon(key: string | null | undefined): boolean {
  if (!key) return false;
  if (SVG_REGISTRY[key]) return true;
  return iconColor(key) !== null;
}
