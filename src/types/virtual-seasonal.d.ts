// Virtual module emitted by the `seasonalSubjects()` Vite plugin (vite.config.js).
declare module "virtual:seasonal-subjects" {
  /** Seasonal-tile manifest: tile key (== public/seasonal-tiles/<dir>/ folder name)
   *  -> the PNG filenames that subject actually ships. Computed at dev-server start /
   *  build by scanning the folder, so the engine fetches only files that exist. */
  export const SEASONAL_MANIFEST: Record<string, string[]>;
}
