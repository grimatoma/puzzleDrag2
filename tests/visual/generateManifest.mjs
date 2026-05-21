import { buildManifestFromGoldens, validateManifest, writeManifest } from "./manifestTools.mjs";

const manifest = buildManifestFromGoldens();
writeManifest(manifest);

const errors = validateManifest(manifest);
if (errors.length) {
  console.error("visual manifest validation failed:\n" + errors.map((e) => `- ${e}`).join("\n"));
  process.exit(1);
}

console.log(`Wrote visual manifest with ${Object.keys(manifest).length} entries.`);
