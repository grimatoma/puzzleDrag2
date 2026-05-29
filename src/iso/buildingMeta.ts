// Shared types for auto-discovered iso building components.
// Each `src/iso/buildings/<key>.tsx` default-exports an IsoBuildingComponent and
// may `export const meta: IsoBuildingMeta`. The gallery + walkable world consume
// these. Keeping the types here (not in isoKit) avoids pulling the whole kit
// into modules that only need the contract.

import type { PlotTier } from "./isoKit.jsx";

/** Status of an iso building in the build→critique pipeline. */
export type IsoBuildingStatus = "todo" | "in_progress" | "review" | "approved";

export type IsoBuildingMeta = {
  status: IsoBuildingStatus;
  /** Standard plot footprint tier — drives relative on-grid size. */
  plot: PlotTier;
  /** Free-form notes: hero details, critique outcomes, anything worth tracking. */
  notes?: string;
};

/** The signature every iso building component (and the forge variants) share. */
export type IsoBuildingComponent = (props: {
  originX: number;
  originY: number;
  nearDoor?: boolean;
}) => JSX.Element;
