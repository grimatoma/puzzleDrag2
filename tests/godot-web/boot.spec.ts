import { test, expect } from "@playwright/test";

// Web-export boot smoke for the Godot port.
//
// Closes the "Web export succeeds but is never booted/tested" gap: serves the
// post-export godot/dist/ (via tools/serve-godot-dist.mjs) and boots the
// HTML5/WASM build in headless Chromium. Passing proves the engine actually
// initializes end-to-end — WASM streaming-compiles, the .pck mounts, and the
// main scene's _ready runs to completion (which flips window.__hearthGodotReady
// from the OS.has_feature("web") branch at the end of godot/scenes/Main.gd).
//
// This is ONE focused smoke: boot + canvas + no-crash. It deliberately does NOT
// simulate gameplay — input/economy/board behaviour is covered by the headless
// GDScript suites under godot/tests/.

test("Godot Web build boots, renders a canvas, and does not crash", async ({ page }) => {
  // Capture every uncaught page error and console error during boot. A Godot wasm
  // trap or a JS exception in the engine glue surfaces as a pageerror; we fail on
  // those. Console warnings are allowed (the engine emits benign ones).
  const pageErrors: Error[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("http://localhost:4327/");

  // The deterministic boot signal: Main.gd's _ready sets this at the very end on
  // a web build. Reaching it means the engine booted, WASM + pck loaded, and the
  // scene tree is live. Generous timeout — WASM boot under headless is slow.
  await page.waitForFunction(() => (window as any).__hearthGodotReady === true, null, {
    timeout: 90_000,
  });

  // A real <canvas> must exist with a non-zero backing buffer and on-screen size.
  const canvas = page.locator("canvas").first();
  await expect(canvas).toHaveCount(1);

  const dims = await canvas.evaluate((el) => {
    const c = el as HTMLCanvasElement;
    const rect = c.getBoundingClientRect();
    const gl =
      (c.getContext("webgl2") as WebGLRenderingContext | null) ||
      (c.getContext("webgl") as WebGLRenderingContext | null);
    return {
      drawW: gl ? gl.drawingBufferWidth : 0,
      drawH: gl ? gl.drawingBufferHeight : 0,
      clientW: rect.width,
      clientH: rect.height,
    };
  });

  // Non-zero on-screen size proves the canvas is laid out and visible.
  expect(dims.clientW, "canvas client width should be > 0").toBeGreaterThan(0);
  expect(dims.clientH, "canvas client height should be > 0").toBeGreaterThan(0);
  // Non-zero drawing buffer proves a live GL context backs it (the engine renders).
  expect(dims.drawW, "canvas drawing-buffer width should be > 0").toBeGreaterThan(0);
  expect(dims.drawH, "canvas drawing-buffer height should be > 0").toBeGreaterThan(0);

  // No uncaught exceptions during boot — a wasm trap or engine JS error fails here.
  expect(pageErrors, `unexpected page errors during boot:\n${pageErrors.map((e) => e.message).join("\n")}`).toHaveLength(0);
});
