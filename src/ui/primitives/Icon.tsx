/**
 * Icon (primitives) — BACK-COMPAT FAÇADE.
 *
 * The two former icon components (this one and src/ui/Icon.tsx) are now a
 * single unified implementation in src/ui/Icon.tsx, which routes registered
 * `design.*` keys to the SVG path and everything else to the canvas/baked-img
 * path. This module just re-exports it so existing `primitives/Icon` importers
 * (and the registerSvgIcons consumer in ui/icons) keep working unchanged.
 *
 * Prefer importing from `../Icon.js` directly in new code.
 */

export { default, registerSvgIcons, hasIcon } from "../Icon.js";
