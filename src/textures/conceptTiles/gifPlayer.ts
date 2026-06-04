import type { ConceptTileSpec } from "./manifest.js";

export type ConceptTileDraw = (ctx: CanvasRenderingContext2D, t: number) => void;

interface GifPlayer {
  draw: ConceptTileDraw;
}

function conceptTilesBaseUrl(): string {
  const base = import.meta.env.BASE_URL ?? "/";
  return `${base.replace(/\/?$/, "/")}concept-tiles/`;
}

function frameIndexAt(t: number, spec: ConceptTileSpec): number {
  const loopSec = (spec.frameCount * spec.msPerFrame) / 1000;
  const phase = loopSec > 0 ? (t % loopSec) / loopSec : 0;
  return Math.min(spec.frameCount - 1, Math.floor(phase * spec.frameCount));
}

function paintFrame(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  spec: ConceptTileSpec,
): void {
  const target = 48;
  const scale = target / Math.max(spec.nativeW, spec.nativeH);
  const w = spec.nativeW * scale;
  const h = spec.nativeH * scale;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, -w / 2, -h / 2, w, h);
}

/** Loads every frame of a concept GIF for synchronous board painting. */
export async function loadConceptGifPlayer(spec: ConceptTileSpec): Promise<GifPlayer | null> {
  if (typeof ImageDecoder === "undefined") return null;
  const url = conceptTilesBaseUrl() + spec.gif;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.arrayBuffer();
    const decoder = new ImageDecoder({ data, type: "image/gif" });
    const track = decoder.tracks.selectedTrack ?? decoder.tracks[0];
    const frameCount = track?.frameCount ?? spec.frameCount;
    const frames: CanvasImageSource[] = [];
    for (let i = 0; i < frameCount; i++) {
      const { image } = await decoder.decode({ frameIndex: i });
      frames.push(image);
    }
    const resolvedSpec = { ...spec, frameCount };

    const draw: ConceptTileDraw = (ctx, t) => {
      const idx = frameIndexAt(t, resolvedSpec);
      const frame = frames[idx];
      if (frame) paintFrame(ctx, frame, resolvedSpec);
    };

    return { draw };
  } catch {
    return null;
  }
}
