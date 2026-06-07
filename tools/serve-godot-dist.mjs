// Tiny static file server for the Godot Web (HTML5/WASM) export.
//
// Serves `godot/dist/` (the output of
// `godot --headless --path godot --export-release "Web" dist/index.html`)
// on a configurable port (env PORT, default 4327) so the Playwright web-boot
// smoke (tests/godot-web/boot.spec.ts) can boot the build in headless Chromium.
//
// The "Web" preset is single-threaded WASM (thread_support=false), so it needs
// NO cross-origin-isolation (COOP/COEP) headers — plain static hosting is enough.
// The ONLY hard requirement is correct MIME types: a wrong Content-Type on
// .wasm (must be application/wasm for streaming compilation) or .js silently
// breaks the boot. This server pins those.
//
// Style mirrors the other .mjs tools in this folder. node: built-ins only.
// Run: `node tools/serve-godot-dist.mjs` (or via the Playwright webServer).

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const distDir = join(repoRoot, "godot", "dist");
const port = Number(process.env.PORT) || 4327;

// MIME map — the load-bearing entries are .wasm/.js/.pck/.data; the rest cover
// the shell + icon + any manifest the export emits.
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".wasm": "application/wasm",
  ".pck": "application/octet-stream",
  ".data": "application/octet-stream",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".css": "text/css; charset=utf-8",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
};

function contentType(filePath) {
  return MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
}

const server = createServer((req, res) => {
  // Strip query/hash, default "/" → index.html, decode percent-escapes.
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0].split("#")[0]);
  if (urlPath === "/" || urlPath === "") urlPath = "/index.html";

  // Resolve INSIDE distDir and reject path-traversal (a leading-".." escape).
  const resolved = normalize(join(distDir, urlPath));
  if (resolved !== distDir && !resolved.startsWith(distDir + sep)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("403 Forbidden");
    return;
  }

  if (!existsSync(resolved) || !statSync(resolved).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
    return;
  }

  res.writeHead(200, {
    "Content-Type": contentType(resolved),
    "Cache-Control": "no-store",
  });
  createReadStream(resolved).pipe(res);
});

server.on("error", (err) => {
  console.error(`serve-godot-dist: server error: ${err.message}`);
  process.exit(1);
});

server.listen(port, () => {
  if (!existsSync(distDir)) {
    console.warn(
      `serve-godot-dist: WARNING — ${distDir} does not exist yet.\n` +
        `  Export the Web build first:\n` +
        `  godot --headless --path godot --export-release "Web" dist/index.html`
    );
  }
  console.log(`serve-godot-dist: serving ${distDir}`);
  console.log(`serve-godot-dist: listening on http://localhost:${port}/`);
});
