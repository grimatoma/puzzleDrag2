#!/usr/bin/env node
// pixels.mjs — pure-Node PNG opaque-pixel reader/differ (no image deps).
//
// Purpose: hand an animation builder a feature/canopy pixel map (coords + colors)
// instead of sampling a tile via dozens of get_pixels MCP calls.
//
// Supports 8-bit non-interlaced PNGs:
//   - colorType 6 (truecolor + alpha, RGBA)
//   - colorType 2 (truecolor, RGB -> alpha forced 255)
//   - colorType 0 (grayscale, gray replicated to RGB, alpha 255)
//   - colorType 3 (indexed/palette, via PLTE + optional tRNS)
// Anything else (other bit depths, interlaced) throws a clear, named error.
//
// Node built-ins only: node:fs, node:zlib, node:url.

import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { pathToFileURL } from "node:url";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Decode a PNG file into flat 8-bit RGBA.
 * @param {string} path
 * @returns {{ width: number, height: number, rgba: Uint8Array }}
 */
export function readPng(path) {
  const buf = readFileSync(path);
  return decodePng(buf, path);
}

/**
 * Decode a PNG from an in-memory Buffer/Uint8Array.
 * @param {Buffer|Uint8Array} input
 * @param {string} [label] file label used in error messages
 */
export function decodePng(input, label = "<buffer>") {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);

  // 1. Signature.
  if (buf.length < 8) {
    throw new Error(`Not a PNG (${label}): file too short (${buf.length} bytes).`);
  }
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== PNG_SIGNATURE[i]) {
      const got = [...buf.subarray(0, 8)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
      throw new Error(
        `Not a PNG (${label}): bad signature. Expected 89 50 4e 47 0d 0a 1a 0a, got ${got}.`,
      );
    }
  }

  // 2. Walk chunks.
  let ihdr = null;
  const idatParts = [];
  let plte = null;
  let trns = null;
  let sawIEND = false;

  let off = 8;
  while (off < buf.length) {
    if (off + 8 > buf.length) {
      throw new Error(`Corrupt PNG (${label}): truncated chunk header at offset ${off}.`);
    }
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const dataStart = off + 8;
    const dataEnd = dataStart + len;
    if (dataEnd + 4 > buf.length) {
      throw new Error(
        `Corrupt PNG (${label}): chunk "${type}" length ${len} runs past end of file.`,
      );
    }
    const data = buf.subarray(dataStart, dataEnd);

    switch (type) {
      case "IHDR":
        ihdr = parseIHDR(data, label);
        break;
      case "PLTE":
        plte = Buffer.from(data);
        break;
      case "tRNS":
        trns = Buffer.from(data);
        break;
      case "IDAT":
        idatParts.push(data);
        break;
      case "IEND":
        sawIEND = true;
        break;
      default:
        // Ancillary chunks we don't need (pHYs, tEXt, gAMA, etc.) — skip.
        break;
    }

    off = dataEnd + 4; // skip 4-byte CRC
    if (sawIEND) break;
  }

  if (!ihdr) {
    throw new Error(`Corrupt PNG (${label}): missing IHDR chunk.`);
  }
  if (idatParts.length === 0) {
    throw new Error(`Corrupt PNG (${label}): no IDAT image data.`);
  }

  const { width, height, bitDepth, colorType, interlace } = ihdr;

  if (interlace !== 0) {
    throw new Error(
      `Unsupported PNG (${label}): interlace method ${interlace} (Adam7) not supported; only non-interlaced (0).`,
    );
  }
  if (bitDepth !== 8) {
    throw new Error(
      `Unsupported PNG (${label}): bitDepth ${bitDepth} not supported; only 8-bit.`,
    );
  }

  // Decompress all IDAT data.
  const compressed = idatParts.length === 1 ? idatParts[0] : Buffer.concat(idatParts);
  let raw;
  try {
    raw = inflateSync(compressed);
  } catch (e) {
    throw new Error(`Corrupt PNG (${label}): zlib inflate failed: ${e.message}`);
  }

  // channels per pixel in the *raw* scanline data.
  let channels;
  switch (colorType) {
    case 0: // grayscale
      channels = 1;
      break;
    case 2: // truecolor RGB
      channels = 3;
      break;
    case 3: // indexed
      channels = 1;
      if (!plte) {
        throw new Error(`Corrupt PNG (${label}): colorType 3 (indexed) but no PLTE chunk.`);
      }
      break;
    case 4: // grayscale + alpha
      channels = 2;
      break;
    case 6: // truecolor + alpha
      channels = 4;
      break;
    default:
      throw new Error(
        `Unsupported PNG (${label}): colorType ${colorType} not recognized.`,
      );
  }

  const bytesPerPixel = channels; // bitDepth is 8, so 1 byte per channel.
  const stride = width * bytesPerPixel;
  const expected = (stride + 1) * height; // +1 filter byte per scanline
  if (raw.length < expected) {
    throw new Error(
      `Corrupt PNG (${label}): inflated data too short (${raw.length} < ${expected}).`,
    );
  }

  const unfiltered = unfilter(raw, width, height, bytesPerPixel, stride, label);

  // Expand to RGBA.
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const si = y * stride + x * bytesPerPixel;
      const di = (y * width + x) * 4;
      let r, g, b, a;
      switch (colorType) {
        case 0: { // grayscale
          const v = unfiltered[si];
          r = g = b = v;
          a = 255;
          break;
        }
        case 2: { // RGB
          r = unfiltered[si];
          g = unfiltered[si + 1];
          b = unfiltered[si + 2];
          a = 255;
          break;
        }
        case 3: { // indexed
          const idx = unfiltered[si];
          const pi = idx * 3;
          if (pi + 2 >= plte.length) {
            throw new Error(
              `Corrupt PNG (${label}): palette index ${idx} out of range at (${x},${y}).`,
            );
          }
          r = plte[pi];
          g = plte[pi + 1];
          b = plte[pi + 2];
          a = trns && idx < trns.length ? trns[idx] : 255;
          break;
        }
        case 4: { // grayscale + alpha
          const v = unfiltered[si];
          r = g = b = v;
          a = unfiltered[si + 1];
          break;
        }
        case 6: { // RGBA
          r = unfiltered[si];
          g = unfiltered[si + 1];
          b = unfiltered[si + 2];
          a = unfiltered[si + 3];
          break;
        }
        default:
          // unreachable (guarded above)
          r = g = b = 0;
          a = 0;
      }
      rgba[di] = r;
      rgba[di + 1] = g;
      rgba[di + 2] = b;
      rgba[di + 3] = a;
    }
  }

  return { width, height, rgba };
}

function parseIHDR(data, label) {
  if (data.length < 13) {
    throw new Error(`Corrupt PNG (${label}): IHDR too short (${data.length} bytes).`);
  }
  return {
    width: data.readUInt32BE(0),
    height: data.readUInt32BE(4),
    bitDepth: data[8],
    colorType: data[9],
    compression: data[10],
    filter: data[11],
    interlace: data[12],
  };
}

/**
 * Reverse PNG scanline filtering in place, returning a contiguous pixel buffer
 * (no filter bytes). `raw` holds [filterByte, ...stride bytes] per scanline.
 */
function unfilter(raw, width, height, bpp, stride, label) {
  const out = new Uint8Array(stride * height);
  let prevRowStart = -1; // index into `out` of the previous unfiltered row

  for (let y = 0; y < height; y++) {
    const rawRowStart = y * (stride + 1);
    const filterType = raw[rawRowStart];
    const inStart = rawRowStart + 1;
    const outStart = y * stride;

    for (let i = 0; i < stride; i++) {
      const rawByte = raw[inStart + i];
      const a = i >= bpp ? out[outStart + i - bpp] : 0; // left
      const b = prevRowStart >= 0 ? out[prevRowStart + i] : 0; // up
      const c = prevRowStart >= 0 && i >= bpp ? out[prevRowStart + i - bpp] : 0; // up-left

      let value;
      switch (filterType) {
        case 0: // None
          value = rawByte;
          break;
        case 1: // Sub
          value = rawByte + a;
          break;
        case 2: // Up
          value = rawByte + b;
          break;
        case 3: // Average
          value = rawByte + ((a + b) >> 1);
          break;
        case 4: // Paeth
          value = rawByte + paeth(a, b, c);
          break;
        default:
          throw new Error(
            `Corrupt PNG (${label}): unknown filter type ${filterType} on row ${y}.`,
          );
      }
      out[outStart + i] = value & 0xff;
    }
    prevRowStart = outStart;
  }
  return out;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function toHex(r, g, b) {
  return (
    "#" +
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0")
  );
}

/**
 * Every pixel whose alpha >= threshold.
 * @param {{ width:number, height:number, rgba:Uint8Array }} png
 * @param {{ alphaThreshold?: number }} [opts]
 * @returns {Array<{ x:number, y:number, r:number, g:number, b:number, a:number, hex:string }>}
 */
export function opaquePixels(png, { alphaThreshold = 1 } = {}) {
  const { width, height, rgba } = png;
  const out = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const di = (y * width + x) * 4;
      const a = rgba[di + 3];
      if (a >= alphaThreshold) {
        const r = rgba[di];
        const g = rgba[di + 1];
        const b = rgba[di + 2];
        out.push({ x, y, r, g, b, a, hex: toHex(r, g, b) });
      }
    }
  }
  return out;
}

/**
 * Per-pixel diff of two decoded PNGs of identical dimensions.
 * `from`/`to` carry the {r,g,b,a} for that side, or null when the pixel is
 * fully transparent there.
 * @param {{ width:number, height:number, rgba:Uint8Array }} a
 * @param {{ width:number, height:number, rgba:Uint8Array }} b
 * @param {{ alphaThreshold?: number }} [opts]
 * @returns {{ width:number, height:number, changed:Array<{x:number,y:number,from:object|null,to:object|null}> }}
 */
export function diff(a, b, { alphaThreshold = 1 } = {}) {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(
      `diff: dimension mismatch ${a.width}x${a.height} vs ${b.width}x${b.height}.`,
    );
  }
  const { width, height } = a;
  const changed = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const di = (y * width + x) * 4;
      const ar = a.rgba[di], ag = a.rgba[di + 1], ab = a.rgba[di + 2], aa = a.rgba[di + 3];
      const br = b.rgba[di], bg = b.rgba[di + 1], bb = b.rgba[di + 2], ba = b.rgba[di + 3];

      const aOpaque = aa >= alphaThreshold;
      const bOpaque = ba >= alphaThreshold;

      // Treat below-threshold pixels as "null" so a color under a transparent
      // veil doesn't register as a meaningful change.
      const aEff = aOpaque ? [ar, ag, ab, aa] : null;
      const bEff = bOpaque ? [br, bg, bb, ba] : null;

      let differs;
      if (aEff === null && bEff === null) {
        differs = false;
      } else if (aEff === null || bEff === null) {
        differs = true;
      } else {
        differs =
          aEff[0] !== bEff[0] ||
          aEff[1] !== bEff[1] ||
          aEff[2] !== bEff[2] ||
          aEff[3] !== bEff[3];
      }

      if (differs) {
        changed.push({
          x,
          y,
          from: aEff ? { r: ar, g: ag, b: ab, a: aa, hex: toHex(ar, ag, ab) } : null,
          to: bEff ? { r: br, g: bg, b: bb, a: ba, hex: toHex(br, bg, bb) } : null,
        });
      }
    }
  }
  return { width, height, changed };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseFlags(args) {
  const positional = [];
  const flags = { threshold: 1, json: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--json") {
      flags.json = true;
    } else if (arg === "--threshold") {
      const v = Number(args[++i]);
      if (!Number.isFinite(v)) throw new Error("--threshold requires a number.");
      flags.threshold = v;
    } else if (arg.startsWith("--threshold=")) {
      const v = Number(arg.slice("--threshold=".length));
      if (!Number.isFinite(v)) throw new Error("--threshold requires a number.");
      flags.threshold = v;
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function bbox(pixels) {
  if (pixels.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pixels) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function runCli(argv) {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === "--help" || cmd === "-h") {
    process.stderr.write(
      [
        "Usage:",
        "  pixels.mjs opaque <png> [--threshold N] [--json]",
        "  pixels.mjs diff <a.png> <b.png> [--threshold N] [--json]",
        "",
        "opaque: list every pixel with alpha >= threshold (default 1).",
        "diff:   list pixels that differ between two same-size PNGs.",
        "--json prints the full machine-readable array; otherwise a summary.",
      ].join("\n") + "\n",
    );
    return cmd ? 0 : 1;
  }

  const { positional, flags } = parseFlags(rest);

  if (cmd === "opaque") {
    const [pngPath] = positional;
    if (!pngPath) throw new Error("opaque: missing <png> argument.");
    const png = readPng(pngPath);
    const pixels = opaquePixels(png, { alphaThreshold: flags.threshold });
    if (flags.json) {
      process.stdout.write(
        JSON.stringify(
          {
            file: pngPath,
            width: png.width,
            height: png.height,
            threshold: flags.threshold,
            opaqueCount: pixels.length,
            total: png.width * png.height,
            bbox: bbox(pixels),
            pixels,
          },
          null,
          2,
        ) + "\n",
      );
    } else {
      const total = png.width * png.height;
      const box = bbox(pixels);
      const lines = [
        `file:    ${pngPath}`,
        `size:    ${png.width}x${png.height} (${total} px)`,
        `thresh:  alpha >= ${flags.threshold}`,
        `opaque:  ${pixels.length} / ${total}`,
        `bbox:    ${box ? `x[${box.minX}..${box.maxX}] y[${box.minY}..${box.maxY}] (${box.width}x${box.height})` : "(none)"}`,
        `sample:`,
      ];
      const sample = pixels.slice(0, 8);
      for (const p of sample) {
        lines.push(`  (${p.x},${p.y}) ${p.hex} a=${p.a}`);
      }
      if (pixels.length > sample.length) {
        lines.push(`  … ${pixels.length - sample.length} more`);
      }
      process.stdout.write(lines.join("\n") + "\n");
    }
    return 0;
  }

  if (cmd === "diff") {
    const [aPath, bPath] = positional;
    if (!aPath || !bPath) throw new Error("diff: needs <a.png> <b.png>.");
    const a = readPng(aPath);
    const b = readPng(bPath);
    const result = diff(a, b, { alphaThreshold: flags.threshold });
    if (flags.json) {
      process.stdout.write(
        JSON.stringify(
          {
            a: aPath,
            b: bPath,
            width: result.width,
            height: result.height,
            threshold: flags.threshold,
            changedCount: result.changed.length,
            changed: result.changed,
          },
          null,
          2,
        ) + "\n",
      );
    } else {
      const total = result.width * result.height;
      const box = bbox(result.changed);
      const lines = [
        `a:       ${aPath}`,
        `b:       ${bPath}`,
        `size:    ${result.width}x${result.height} (${total} px)`,
        `thresh:  alpha >= ${flags.threshold}`,
        `changed: ${result.changed.length} / ${total}`,
        `bbox:    ${box ? `x[${box.minX}..${box.maxX}] y[${box.minY}..${box.maxY}] (${box.width}x${box.height})` : "(none)"}`,
        `sample:`,
      ];
      const sample = result.changed.slice(0, 8);
      for (const c of sample) {
        const f = c.from ? c.from.hex : "transparent";
        const t = c.to ? c.to.hex : "transparent";
        lines.push(`  (${c.x},${c.y}) ${f} -> ${t}`);
      }
      if (result.changed.length > sample.length) {
        lines.push(`  … ${result.changed.length - sample.length} more`);
      }
      process.stdout.write(lines.join("\n") + "\n");
    }
    return 0;
  }

  throw new Error(`Unknown command "${cmd}". Use "opaque" or "diff".`);
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  try {
    const code = runCli(process.argv.slice(2));
    process.exit(code);
  } catch (err) {
    process.stderr.write(`error: ${err.message}\n`);
    process.exit(1);
  }
}
