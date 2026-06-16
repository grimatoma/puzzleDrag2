import { readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Zero-config seasonal-tile discovery (shared by vite.config.js + vitest.config.js so the
// `virtual:seasonal-subjects` module resolves under both the dev server/build AND tests).
//
// The game replaces a puzzle tile's procedural vector icon with baked PNG art by dropping a
// folder named after the tile key (e.g. public/seasonal-tiles/tile_tree_willow/) holding its
// spritesheets — NO code change. This plugin scans that folder at startup/build and exposes
// `virtual:seasonal-subjects` exporting SEASONAL_MANIFEST: a map of tile key -> the PNG
// filenames that subject actually ships, so the engine fetches only files that exist (no 404
// probing while art is added one season at a time). Restart the dev server after adding a new
// tile folder or a new season's PNG so the manifest is rescanned.
export function seasonalSubjects() {
  const VID = "virtual:seasonal-subjects";
  const RID = "\0" + VID;
  const scan = () => {
    const dir = resolve(process.cwd(), "public/seasonal-tiles");
    const out = {};
    if (!existsSync(dir)) return out;
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const pngs = readdirSync(resolve(dir, d.name)).filter((f) => f.endsWith(".png"));
      if (pngs.length) out[d.name] = pngs.sort();
    }
    return out;
  };
  return {
    name: "seasonal-subjects",
    resolveId(id) {
      return id === VID ? RID : null;
    },
    load(id) {
      return id === RID ? `export const SEASONAL_MANIFEST = ${JSON.stringify(scan())};\n` : null;
    },
  };
}
