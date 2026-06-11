#!/usr/bin/env node
// Standalone "update the Godot tile assets" entrypoint — decoupled from the pixel pipeline.
//
// The pixel/sprite pipeline (the `sprite-pipeline` skill, stages 0–4) produces the per-frame PNGs
// and preview GIFs for each animated tile and STOPS there. Pushing those frames into the Godot
// project — packing v2 SpriteFrames `.tres`, importing, reverting project.godot, and verifying
// in-engine — is THIS separate step. It is run on demand:
//
//   npm run godot:update-tiles                 # work list from godot/assets/tiles/v2/pipeline.json
//   npm run godot:update-tiles -- --godot /path/to/godot
//   node tools/update-godot-tiles.mjs [--godot <path>] [<framesDir> <outTres> ...]
//
// It is deliberately NOT wired into `npm run build`, the dev server, or any CI build — updating
// Godot art is an explicit, manual action, never a side effect of the main pipeline.
//
// This is a thin wrapper: the integration engine still lives with the skill that produced the
// frames (`.claude/skills/sprite-pipeline/scripts/integrate.mjs`). All CLI args/flags pass
// straight through to it.

import { main } from "./integrate.mjs";

main();
