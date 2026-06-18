// docs/zones — headless layout geometry verifier (pure Node, no browser).
// Asserts the growing-settlement contract for every authored layout: no plot overlaps another plot /
// a road / the landmark / the plaza, all in bounds, and per-tier reveal counts equal the ladder.
// Run: node docs/zones/layoutVerify.mjs [zoneId]
import { readdirSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { ZONES } from "./data/zones.mjs";
import { verifyLayout } from "./lib/geometry.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const dir = join(__dir, "data", "layouts");
const argZone = process.argv[2];
let anyFail = false;
if (!existsSync(dir)) { console.log("no layouts yet"); process.exit(0); }
for (const f of readdirSync(dir).filter((f) => f.endsWith(".mjs"))) {
  const Z = (await import(pathToFileURL(join(dir, f)).href)).default;
  if (argZone && Z.id !== argZone) continue;
  const zoneSpec = ZONES.find((z) => z.id === Z.id);
  const { lots, problems } = verifyLayout(Z, zoneSpec);
  if (problems.length) { anyFail = true; console.log(`✗ ${Z.id} (${lots.length} lots):\n  ` + problems.join("\n  ")); }
  else console.log(`✓ ${Z.id} — ${lots.length} lots, collision-free, ${zoneSpec ? zoneSpec.tiers.length : "?"} tiers match ladder`);
}
if (anyFail) process.exit(1);
