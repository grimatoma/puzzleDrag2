// Icon animation registry.
//
// Static icons live in `categories/*.ts` and are baked once into Phaser's
// texture cache. This sibling registry adds *animated* variants: each entry
// is a `(ctx, t) => void` that redraws the WHOLE icon for elapsed time `t`
// (in seconds). The Dev Panel Icons tab drives these with a
// requestAnimationFrame loop (see `tabs/IconsTab.tsx`) so designers can
// preview motion. They share the same drawing space as the static icons
// (origin-centered, ~-24..+24 design box), so the caller's translate/scale
// wrapper is identical for both.
//
// Adding a batch: author `animations/<name>.ts` exporting
// `ANIMATIONS: Record<string, IconAnimation>` whose keys match icon keys in
// the icon registry, then import + spread it below.

import { ANIMATIONS as A_ARCANE } from "./animations/arcane.js";
import { ANIMATIONS as A_REEF } from "./animations/reef.js";
import { ANIMATIONS as A_CRITTERS } from "./animations/critters.js";
import { ANIMATIONS as A_WEATHER } from "./animations/weather.js";
import { ANIMATIONS as A_GEMS_DISHES } from "./animations/gemsDishes.js";

/** Draws the full icon `key` for elapsed time `t` (seconds), origin-centered. */
export type IconAnimation = (ctx: CanvasRenderingContext2D, t: number) => void;

const REGISTRY: Record<string, IconAnimation> = {
  ...A_ARCANE,
  ...A_REEF,
  ...A_CRITTERS,
  ...A_WEATHER,
  ...A_GEMS_DISHES,
};

export const ICON_ANIMATIONS: Readonly<Record<string, IconAnimation>> = Object.freeze(REGISTRY);

/** Set of every icon key that has a registered animation. */
export const ANIMATED_ICON_KEYS: ReadonlySet<string> = new Set(Object.keys(ICON_ANIMATIONS));

/** The animation draw for `key`, or null if the icon has no animated variant. */
export function iconAnimation(key: string): IconAnimation | null {
  return ICON_ANIMATIONS[key] ?? null;
}

/** Whether `key` has a registered animation. */
export function hasIconAnimation(key: string): boolean {
  return ANIMATED_ICON_KEYS.has(key);
}
