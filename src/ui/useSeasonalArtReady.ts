import { useEffect, useState } from "react";
import { onSeasonalArtLoaded } from "../textures/seasonal/seasonalArt.js";

/**
 * Returns a counter that bumps when baked seasonal art (e.g. the willow Spring
 * reference) finishes loading. Canvas icon components include it in their bake
 * effect deps so an icon baked with the procedural fallback re-bakes with the
 * reference still once the sheets arrive. No-ops after the art is already loaded.
 */
export function useSeasonalArtReady(): number {
  const [n, setN] = useState(0);
  useEffect(() => onSeasonalArtLoaded(() => setN((v) => v + 1)), []);
  return n;
}
