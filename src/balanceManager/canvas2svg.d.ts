// canvas2svg ships no .d.ts. The library re-implements the
// CanvasRenderingContext2D API on top of an in-memory SVG document; the only
// extra method we ever call is `getSerializedSvg`.
declare module "canvas2svg" {
  interface C2SContext extends CanvasRenderingContext2D {
    getSerializedSvg(removeNamespaces?: boolean): string;
  }
  interface C2SCtor {
    new (width: number, height: number): C2SContext;
    new (options: { width: number; height: number; ctx?: unknown }): C2SContext;
  }
  const C2S: C2SCtor;
  export default C2S;
}
