// Vector character portraits — the "Decorative Detail Vector" redesign (concept
// board style #20) ported from `reference/docs/worker-portrait-styles/index.html`
// into the in-game canvas icon registry.
//
// The board renders each portrait as an inline SVG produced by a small
// *parametric* system: a few generator functions (`workerJob`, `npcBust`,
// `bossArt`) + helpers (`FRAME`, `shade`, `wHat`, `jobIcon`) + palette constants
// (`SK`, `HR`) + data rows (`WORKERS2`, `NPCS`, `BOSSES`). Rather than transcribe
// 40 portraits into canvas-2D by hand, we keep the generators verbatim (they emit
// SVG strings) and render those strings through a small generic SVG→canvas
// renderer below.
//
// Coordinate mapping: the board works in a 0–100 SVG viewBox with a badge
// `circle(50,50,r48)` and an `r47` clip. `paintIcon` (src/textures/paintIcon.ts)
// centres the draw and scales by `size/64`, giving a centred ±32 design box. Each
// draw therefore does `ctx.scale(0.64); ctx.translate(-50,-50)` so the 0–100 space
// maps into ±32 (r48 → ~30.7, matching the existing avatar frame r30). All board
// coordinates, stroke widths, and gradient stops are then used verbatim.
//
// Safety: these draws build a `Path2D`/parse a DOM and so only run in a real
// browser (the `IconCanvas`/`Icon` `useEffect`, Playwright visual/e2e). Node unit
// tests never invoke them — `regenerateTextures` bakes only `tile_*`, and the
// textures test's mock context isn't fed character draws — and the renderer guards
// on `typeof DOMParser === "undefined"` regardless.

type Ctx = CanvasRenderingContext2D;

interface IconEntry {
  label?: string;
  color?: string;
  draw: (ctx: Ctx) => void;
}

// ── Generic SVG-fragment → canvas renderer ────────────────────────────────────
// Renders a complete `<svg>…</svg>` string (as emitted by `FRAME`) onto `ctx` at
// the current origin/scale. Supports: <g>/<svg> nesting, <path>/<circle>/<ellipse>/
// <rect>, linear & radial gradients (all treated as userSpaceOnUse), <clipPath>,
// transform (translate/scale/rotate/matrix), multiplicative opacity, style
// inheritance (fill/stroke/stroke-width/stroke-linecap), and a two-pass cream-halo
// approximation for the jobIcon `feMorphology` filter group.

interface SvgStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  lineCap: CanvasLineCap;
  opacity: number;
  fillOpacity: number;
  strokeOpacity: number;
  halo: boolean;
}

interface SvgDefs {
  grads: Record<string, Element>;
  clips: Record<string, Element>;
  filters: Record<string, Element>;
}

const HALO_COLOR = "#f7efdd";

const BASE_STYLE: SvgStyle = {
  fill: "#000",
  stroke: "none",
  strokeWidth: 1,
  lineCap: "butt",
  opacity: 1,
  fillOpacity: 1,
  strokeOpacity: 1,
  halo: false,
};

const NONRENDER = new Set([
  "defs", "clippath", "lineargradient", "radialgradient",
  "filter", "stop", "title", "desc", "metadata",
]);

const num = (el: Element, name: string, def: number): number => {
  const v = el.getAttribute(name);
  return v == null ? def : parseFloat(v);
};

const idFromUrl = (s: string): string => {
  const m = /#([^)\s]+)/.exec(s);
  return m ? m[1] : "";
};

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

// Hex (#rgb / #rrggbb) → rgba() when an alpha < 1 is in play; otherwise the hex
// is returned unchanged.
function paintColor(hex: string, alpha: number): string {
  if (alpha >= 1) return hex;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function addRoundRect(p: Path2D, x: number, y: number, w: number, h: number, r: number): void {
  r = Math.min(r, w / 2, h / 2);
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y);
  p.arcTo(x + w, y, x + w, y + r, r);
  p.lineTo(x + w, y + h - r);
  p.arcTo(x + w, y + h, x + w - r, y + h, r);
  p.lineTo(x + r, y + h);
  p.arcTo(x, y + h, x, y + h - r, r);
  p.lineTo(x, y + r);
  p.arcTo(x, y, x + r, y, r);
  p.closePath();
}

function shapePath(el: Element): Path2D | null {
  const tag = el.tagName.toLowerCase();
  if (tag === "path") {
    const d = el.getAttribute("d");
    return d ? new Path2D(d) : null;
  }
  const p = new Path2D();
  if (tag === "circle") {
    p.arc(num(el, "cx", 0), num(el, "cy", 0), num(el, "r", 0), 0, Math.PI * 2);
  } else if (tag === "ellipse") {
    p.ellipse(num(el, "cx", 0), num(el, "cy", 0), num(el, "rx", 0), num(el, "ry", 0), 0, 0, Math.PI * 2);
  } else if (tag === "rect") {
    const x = num(el, "x", 0), y = num(el, "y", 0), w = num(el, "width", 0), h = num(el, "height", 0);
    const rx = el.hasAttribute("rx") ? num(el, "rx", 0) : 0;
    if (rx > 0) addRoundRect(p, x, y, w, h, rx);
    else p.rect(x, y, w, h);
  } else {
    return null;
  }
  return p;
}

function applyTransform(ctx: Ctx, t: string | null): void {
  if (!t) return;
  const re = /(translate|scale|rotate|matrix)\s*\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const op = m[1];
    const a = m[2].trim().split(/[\s,]+/).map(Number);
    if (op === "translate") ctx.translate(a[0] || 0, a[1] || 0);
    else if (op === "scale") ctx.scale(a[0], a.length > 1 ? a[1] : a[0]);
    else if (op === "rotate") {
      const rad = ((a[0] || 0) * Math.PI) / 180;
      if (a.length >= 3) {
        ctx.translate(a[1], a[2]);
        ctx.rotate(rad);
        ctx.translate(-a[1], -a[2]);
      } else ctx.rotate(rad);
    } else if (op === "matrix") {
      ctx.transform(a[0], a[1], a[2], a[3], a[4], a[5]);
    }
  }
}

function collectDefs(root: Element): SvgDefs {
  const defs: SvgDefs = { grads: {}, clips: {}, filters: {} };
  const walk = (el: Element): void => {
    for (const c of Array.from(el.children)) {
      const tag = c.tagName.toLowerCase();
      const id = c.getAttribute("id");
      if (id) {
        if (tag === "lineargradient" || tag === "radialgradient") defs.grads[id] = c;
        else if (tag === "clippath") defs.clips[id] = c;
        else if (tag === "filter") defs.filters[id] = c;
      }
      walk(c);
    }
  };
  walk(root);
  return defs;
}

// Parse cache keyed by SVG string — the same portrait re-renders on every mount,
// so we avoid re-parsing identical markup.
const parseCache = new Map<string, Document>();

export function renderSvg(ctx: Ctx, svg: string): void {
  if (typeof DOMParser === "undefined") return;
  let doc = parseCache.get(svg);
  if (!doc) {
    doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    parseCache.set(svg, doc);
  }
  const rootEl = doc.documentElement;
  if (!rootEl) return;
  const defs = collectDefs(rootEl);

  const gradient = (el: Element): CanvasGradient => {
    const tag = el.tagName.toLowerCase();
    let grad: CanvasGradient;
    if (tag === "lineargradient") {
      grad = ctx.createLinearGradient(num(el, "x1", 0), num(el, "y1", 0), num(el, "x2", 0), num(el, "y2", 0));
    } else {
      const cx = num(el, "cx", 0), cy = num(el, "cy", 0), r = num(el, "r", 0);
      const fx = el.hasAttribute("fx") ? num(el, "fx", cx) : cx;
      const fy = el.hasAttribute("fy") ? num(el, "fy", cy) : cy;
      grad = ctx.createRadialGradient(fx, fy, 0, cx, cy, r);
    }
    for (const stop of Array.from(el.children)) {
      if (stop.tagName.toLowerCase() !== "stop") continue;
      const rawOff = stop.getAttribute("offset") || "0";
      const off = rawOff.endsWith("%") ? parseFloat(rawOff) / 100 : parseFloat(rawOff);
      const col = stop.getAttribute("stop-color") || "#000";
      const soAttr = stop.getAttribute("stop-opacity");
      grad.addColorStop(clamp01(off), paintColor(col, soAttr != null ? parseFloat(soAttr) : 1));
    }
    return grad;
  };

  const resolvePaint = (paint: string): string | CanvasGradient => {
    if (paint.startsWith("url(")) {
      const g = defs.grads[idFromUrl(paint)];
      return g ? gradient(g) : "#000";
    }
    return paint;
  };

  const applyClip = (ref: string): void => {
    const cp = defs.clips[idFromUrl(ref)];
    if (!cp) return;
    const child = cp.children[0];
    if (!child) return;
    const p = shapePath(child);
    if (p) ctx.clip(p);
  };

  const drawShape = (path: Path2D, style: SvgStyle): void => {
    if (style.halo) {
      ctx.globalAlpha = clamp01(style.opacity);
      ctx.fillStyle = HALO_COLOR;
      ctx.strokeStyle = HALO_COLOR;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      if (style.fill !== "none") ctx.fill(path);
      ctx.lineWidth = (style.stroke !== "none" ? style.strokeWidth : 0) + 2.3;
      ctx.stroke(path);
      return;
    }
    if (style.fill && style.fill !== "none") {
      ctx.globalAlpha = clamp01(style.opacity * style.fillOpacity);
      ctx.fillStyle = resolvePaint(style.fill);
      ctx.fill(path);
    }
    if (style.stroke && style.stroke !== "none") {
      ctx.globalAlpha = clamp01(style.opacity * style.strokeOpacity);
      ctx.strokeStyle = resolvePaint(style.stroke);
      ctx.lineWidth = style.strokeWidth;
      ctx.lineCap = style.lineCap;
      ctx.lineJoin = "round";
      ctx.stroke(path);
    }
  };

  const mergeStyle = (parent: SvgStyle, el: Element): SvgStyle => {
    const g = (n: string): string | null => el.getAttribute(n);
    const fill = g("fill"), stroke = g("stroke"), sw = g("stroke-width"),
      lc = g("stroke-linecap"), op = g("opacity"), fo = g("fill-opacity"), so = g("stroke-opacity");
    return {
      fill: fill != null ? fill : parent.fill,
      stroke: stroke != null ? stroke : parent.stroke,
      strokeWidth: sw != null ? parseFloat(sw) : parent.strokeWidth,
      lineCap: (lc != null ? lc : parent.lineCap) as CanvasLineCap,
      opacity: parent.opacity * (op != null ? parseFloat(op) : 1),
      fillOpacity: fo != null ? parseFloat(fo) : 1,
      strokeOpacity: so != null ? parseFloat(so) : 1,
      halo: parent.halo,
    };
  };

  const isHaloFilter = (ref: string): boolean => idFromUrl(ref).endsWith("halo");

  const renderNode = (el: Element, parent: SvgStyle): void => {
    const tag = el.tagName.toLowerCase();
    if (NONRENDER.has(tag)) return;
    const style = mergeStyle(parent, el);
    ctx.save();
    applyTransform(ctx, el.getAttribute("transform"));
    const clipRef = el.getAttribute("clip-path");
    if (clipRef) applyClip(clipRef);

    if (tag === "g" || tag === "svg") {
      const kids = Array.from(el.children);
      const filterRef = el.getAttribute("filter");
      if (filterRef && !style.halo && isHaloFilter(filterRef)) {
        const haloStyle: SvgStyle = { ...style, halo: true };
        for (const c of kids) renderNode(c, haloStyle); // pass 1: cream silhouette
        for (const c of kids) renderNode(c, style); // pass 2: icon on top
      } else {
        for (const c of kids) renderNode(c, style);
      }
    } else {
      const p = shapePath(el);
      if (p) drawShape(p, style);
    }
    ctx.restore();
  };

  ctx.save();
  for (const child of Array.from(rootEl.children)) renderNode(child, BASE_STYLE);
  ctx.restore();
}

// ── Draw factory ──────────────────────────────────────────────────────────────
// Wraps an SVG string into a canvas draw that maps the board's 0–100 viewBox into
// the centred ±32 design box paintIcon hands us.
function makeDraw(svg: string): (ctx: Ctx) => void {
  return (ctx: Ctx): void => {
    if (typeof DOMParser === "undefined") return;
    ctx.save();
    ctx.scale(0.64, 0.64);
    ctx.translate(-50, -50);
    renderSvg(ctx, svg);
    ctx.restore();
  };
}

// ── Ported generators (verbatim SVG-string emitters from the concept board) ───
let uid = 0;

function shade(hex: string, f: number): string {
  let n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.min(255, Math.round(r * f));
  g = Math.min(255, Math.round(g * f));
  b = Math.min(255, Math.round(b * f));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

interface FrameInner { clip: string; defs?: string; body: string; over?: string; }
const FRAME = (inner: FrameInner, bg: string, rim: string, rimW = 2.5): string =>
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
     <defs>${inner.defs || ""}</defs>
     <circle cx="50" cy="50" r="48" fill="${bg}" stroke="${rim}" stroke-width="${rimW}"/>
     <clipPath id="${inner.clip}"><circle cx="50" cy="50" r="47"/></clipPath>
     <g clip-path="url(#${inner.clip})">${inner.body}</g>
     ${inner.over || ""}
   </svg>`;

// `_ink` is part of the board's hat signature but unused by the hat cases (hats
// carry their own ink colours); kept for call-site parity with the source.
function wHat(t: string, A: string, As: string, _ink: string): string {
  switch (t) {
    case 'straw': return `<path d="M22 28 Q50 40 78 28 Q50 36 22 28Z" fill="#d8b25e" stroke="#a87a32" stroke-width="1.4"/><path d="M33 28 Q35 12 50 11 Q65 12 67 28Z" fill="#e6c578" stroke="#a87a32" stroke-width="1.4"/><path d="M37 25 q13 4 26 0 M40 20 q10 3 20 0" stroke="#b58f44" stroke-width=".6" fill="none" opacity=".6"/><path d="M33 25 q17 5 34 0" stroke="${A}" stroke-width="3"/><g fill="${shade(A,1.25)}"><circle cx="42" cy="24.4" r="1"/><circle cx="50" cy="25.4" r="1"/><circle cx="58" cy="24.4" r="1"/></g>`;
    case 'strawWide': return `<path d="M15 30 Q50 45 85 30 Q50 37 15 30Z" fill="#d8b25e" stroke="#a87a32" stroke-width="1.4"/><path d="M34 30 Q36 13 50 12 Q64 13 66 30Z" fill="#e6c578" stroke="#a87a32" stroke-width="1.4"/><path d="M34 27 q16 5 32 0" stroke="${A}" stroke-width="3"/>`;
    case 'wool': return `<path d="M30 27 Q50 7 70 27 Q50 21 30 27Z" fill="${A}" stroke="${As}" stroke-width="1.4"/><path d="M29 27 q21 6 42 0 l0 3.4 q-21 6 -42 0Z" fill="${As}"/><g stroke="${shade(A,1.2)}" stroke-width=".7" opacity=".6"><path d="M38 12 v12 M46 9 v15 M54 9 v15 M62 12 v12"/></g><circle cx="50" cy="8" r="3" fill="#f4ecd8"/>`;
    case 'flatcap': return `<path d="M29 27 Q50 11 64 21 Q73 23 74 27 Q50 22 29 28Z" fill="${A}" stroke="${As}" stroke-width="1.4"/><path d="M31 26 Q49 14 63 21" stroke="${shade(A,1.2)}" stroke-width="1" fill="none" opacity=".55"/>`;
    case 'helmet': return `<path d="M29 29 Q29 11 50 11 Q71 11 71 29 Q50 23 29 29Z" fill="${A}" stroke="${As}" stroke-width="1.6"/><path d="M27 29 q23 6 46 0 l0 2.6 q-23 6 -46 0Z" fill="${As}"/><circle cx="50" cy="16" r="4.2" fill="#fff0b0" stroke="${As}" stroke-width="1.2"/><circle cx="50" cy="16" r="1.6" fill="#fff"/>`;
    case 'toque': return `<path d="M33 27 C30 14 38 12 40 13 C40 6 60 6 60 13 C62 12 70 14 67 27 Q50 22 33 27Z" fill="#f7f2e6" stroke="#c9bfa6" stroke-width="1.2"/><path d="M33 25 q17 4 34 0" stroke="${A}" stroke-width="2.6"/>`;
    case 'veil': return `<path d="M22 27 Q50 39 78 27 Q50 33 22 27Z" fill="#ece5d2" stroke="#b8af96" stroke-width="1.4"/><path d="M34 27 Q36 12 50 11 Q64 12 66 27Z" fill="#f2ebd8" stroke="#b8af96" stroke-width="1.4"/><path d="M33 24 q17 4 34 0" stroke="${A}" stroke-width="2.4"/><path d="M31 30 L69 30 L65 55 L35 55 Z" fill="#f2ecd8" opacity=".15"/><g stroke="#cdbfa0" stroke-width=".4" opacity=".4"><path d="M38 30 l-2 25 M46 30 l-1 25 M54 30 l1 25 M62 30 l2 25 M33 38 h34 M34 47 h32"/></g>`;
    case 'souwester': return `<path d="M25 31 Q50 25 75 31 Q73 41 50 41 Q27 41 25 31Z" fill="#e8b94a" stroke="#b88a32" stroke-width="1.4"/><path d="M30 30 Q50 17 70 30 Q50 24 30 30Z" fill="#edc868" stroke="#b88a32" stroke-width="1.4"/><path d="M30 30 q20 5 40 0" stroke="#c99a3a" stroke-width="1" fill="none" opacity=".6"/>`;
    case 'scarf': return `<path d="M28 31 Q29 11 50 10 Q71 11 72 31 Q50 22 28 31Z" fill="${A}" stroke="${As}" stroke-width="1.4"/><path d="M68 25 q9 1 10 9 q-7 0 -11 -4Z" fill="${As}"/><g fill="#f4ecd8" opacity=".75"><circle cx="40" cy="20" r=".9"/><circle cx="50" cy="16.5" r=".9"/><circle cx="60" cy="20" r=".9"/><circle cx="45" cy="25" r=".8"/><circle cx="55" cy="25" r=".8"/></g>`;
    case 'fine': return `<path d="M23 28 Q50 38 77 28 Q50 33 23 28Z" fill="${A}" stroke="${As}" stroke-width="1.4"/><path d="M34 28 Q36 9 50 8 Q64 9 66 28Z" fill="${A}" stroke="${As}" stroke-width="1.4"/><path d="M34 24 q16 4 32 0" stroke="${As}" stroke-width="2.8"/><path d="M64 24 q11 -9 15 -19 q-1 11 -8 22Z" fill="${shade(A,1.35)}" stroke="${As}" stroke-width=".8"/>`;
    case 'floral': return `<g>` + [34, 42, 50, 58, 66].map((x, i) => { const fy = [20, 17, 15, 17, 20][i]; const fc = ['#e08aa0', '#f0c24a', '#c97ad0', '#f0c24a', '#e08aa0'][i]; return `<g fill="${fc}"><circle cx="${x - 2.4}" cy="${fy}" r="1.7"/><circle cx="${x + 2.4}" cy="${fy}" r="1.7"/><circle cx="${x}" cy="${fy - 2.4}" r="1.7"/><circle cx="${x}" cy="${fy + 2.4}" r="1.7"/></g><circle cx="${x}" cy="${fy}" r="1.5" fill="#fff3c0"/>`; }).join('') + `</g><path d="M30 22 Q50 16 70 22" stroke="#5a9e3a" stroke-width="1.4" fill="none" opacity=".6"/>`;
    case 'hood': return `<path d="M25 46 C19 15 40 7 50 7 C60 7 81 15 75 46 C71 30 64 30 50 30 C36 30 29 30 25 46Z" fill="${A}" stroke="${As}" stroke-width="1.6"/><path d="M30 42 C28 22 40 16 50 16 C60 16 72 22 70 42 C64 30 58 29 50 29 C42 29 36 30 30 42Z" fill="#000" opacity=".26"/>`;
    case 'beanie': return `<path d="M30 26 Q50 5 70 26 Q50 20 30 26Z" fill="${A}" stroke="${As}" stroke-width="1.4"/><path d="M29 26 q21 6 42 0 l0 3.6 q-21 6 -42 0Z" fill="${As}"/><circle cx="50" cy="7.5" r="2.8" fill="${shade(A,1.25)}" stroke="${As}" stroke-width=".8"/><g stroke="${shade(A,1.18)}" stroke-width=".7" opacity=".5"><path d="M38 11 v13 M46 8 v16 M54 8 v16 M62 11 v13"/></g>`;
    case 'minerHat': return `<path d="M24 28 Q50 22 76 28 Q74 33 50 33 Q26 33 24 28Z" fill="#6e4a2e" stroke="#46301c" stroke-width="1.4"/><path d="M32 28 Q34 12 50 11 Q66 12 68 28Z" fill="#7a5234" stroke="#46301c" stroke-width="1.4"/><path d="M34 18 q16 4 32 0" stroke="#5a3d24" stroke-width="1" opacity=".6" fill="none"/><rect x="44.5" y="14" width="11" height="9.5" rx="1.6" fill="#caa030" stroke="#7a5a18" stroke-width="1.2"/><circle cx="50" cy="18.8" r="2.8" fill="#fff3b0" stroke="#7a5a18" stroke-width=".8"/><circle cx="50" cy="18.8" r="1" fill="#fff"/>`;
    case 'wimple': return `<path d="M26 42 C22 14 40 7 50 7 C60 7 78 14 74 42 C72 28 64 27 50 27 C36 27 28 28 26 42Z" fill="${A}" stroke="${As}" stroke-width="1.5"/><path d="M26 42 Q23 58 30 71 L39 68 Q33 54 33 41Z" fill="${A}" stroke="${As}" stroke-width="1.2"/><path d="M74 42 Q77 58 70 71 L61 68 Q67 54 67 41Z" fill="${A}" stroke="${As}" stroke-width="1.2"/><path d="M30 40 C30 22 40 17 50 17 C60 17 70 22 70 40 C64 29 58 28 50 28 C42 28 36 29 30 40Z" fill="#000" opacity=".12"/><path d="M34 13 q16 4 32 0" stroke="${shade(A,1.15)}" stroke-width="1" opacity=".5" fill="none"/>`;
    default: return '';
  }
}

function jobIcon(t: string): string {
  switch (t) {
    case 'wheatBig': return `
      <g stroke="#caa23e" stroke-width="1.6" fill="none"><path d="M50 95 Q44 83 41 71"/><path d="M50 95 Q47 81 45 68"/><path d="M50 95 V66"/><path d="M50 95 Q53 81 55 68"/><path d="M50 95 Q56 83 59 71"/></g>
      <g fill="#e7c14e" stroke="#b8862a" stroke-width="1">
        <ellipse cx="41" cy="69" rx="2.4" ry="4.6" transform="rotate(-24 41 69)"/><ellipse cx="45" cy="66" rx="2.4" ry="4.8" transform="rotate(-12 45 66)"/>
        <ellipse cx="50" cy="64" rx="2.6" ry="5"/><ellipse cx="55" cy="66" rx="2.4" ry="4.8" transform="rotate(12 55 66)"/><ellipse cx="59" cy="69" rx="2.4" ry="4.6" transform="rotate(24 59 69)"/></g>
      <path d="M44 87 q6 3 12 0 l-1 5 q-5 2 -10 0Z" fill="#c47a2e" stroke="#9a5e22" stroke-width="1"/>`;
    case 'axeBig': return `<g transform="rotate(-16 50 80)">
      <rect x="48" y="64" width="4.2" height="34" rx="2" fill="#9a6a33" stroke="#6e4a22" stroke-width="1.2"/>
      <path d="M40 66 Q57 62 61 70 Q57 80 40 78 Q45 72 40 66Z" fill="#c2ccd4" stroke="#6e7882" stroke-width="1.4"/>
      <path d="M44 69 Q54 67 57 72" stroke="#eef3f6" stroke-width="1.2" fill="none"/></g>`;
    case 'pickBig': return `<g transform="rotate(-9 50 82)">
      <rect x="48" y="66" width="3.8" height="32" rx="1.8" fill="#9a6a33" stroke="#6e4a22" stroke-width="1.2"/>
      <path d="M33 74 Q50 63 67 74" stroke="#9aa4b0" stroke-width="5.5" fill="none" stroke-linecap="round"/>
      <path d="M33 74 Q50 63 67 74" stroke="#c2ccd4" stroke-width="1.8" fill="none"/></g>`;
    case 'breadPaddle': return `
      <rect x="48.5" y="86" width="3" height="12" rx="1.4" fill="#b58f54" stroke="#8a6a3a" stroke-width="1"/>
      <ellipse cx="50" cy="80" rx="15" ry="11" fill="#ecdcb4" stroke="#c2a878" stroke-width="1.4"/>
      <ellipse cx="50" cy="78" rx="10" ry="6.5" fill="#d8a85e" stroke="#a8702f" stroke-width="1.3"/>
      <path d="M44 76 l2 4 M50 75 l1 5 M56 76 l-2 4" stroke="#a8702f" stroke-width="1"/>`;
    case 'pitchforkHay': return `
      <rect x="48.5" y="70" width="3.2" height="28" rx="1.5" fill="#9a6a33" stroke="#6e4a22" stroke-width="1.1"/>
      <path d="M42 72 V62 M50 71 V60 M58 72 V62" stroke="#9aa4b0" stroke-width="2.4"/><path d="M42 72 h16" stroke="#9aa4b0" stroke-width="2.4"/>
      <path d="M40 64 q10 -9 20 0 q-3 -7 -10 -7 q-7 0 -10 7Z" fill="#e7c14e" stroke="#c9962e" stroke-width=".9"/>`;
    case 'henBig': return `
      <ellipse cx="47" cy="85" rx="13" ry="11" fill="#f3ece0" stroke="#c9bfa6" stroke-width="1.4"/>
      <path d="M36 83 q-7 -2 -9 5 q7 1 10 -1Z" fill="#f1e7d6" stroke="#c9bfa6" stroke-width="1"/>
      <ellipse cx="59" cy="76" rx="5.6" ry="6.2" fill="#f3ece0" stroke="#c9bfa6" stroke-width="1.2"/>
      <path d="M58 70 q1 -4 4 -3 q0 3 -1 4Z" fill="#d24438"/><path d="M64 77 l6 1 -5 2.6Z" fill="#e8a23a" stroke="#b87a1e" stroke-width=".6"/>
      <circle cx="61" cy="76" r="1" fill="#2a1c14"/><path d="M45 83 q7 -3 12 2" stroke="#c9bfa6" stroke-width="1" fill="none"/>
      <path d="M43 95 v3 M50 95 v3" stroke="#e8a23a" stroke-width="1.6"/>`;
    case 'vegBasket': return `
      <path d="M35 80 h30 l-3 17 q-12 4 -24 0Z" fill="#c79a5a" stroke="#8a6a3a" stroke-width="1.4"/>
      <path d="M35 80 q15 -6 30 0" fill="none" stroke="#8a6a3a" stroke-width="1.6"/>
      <g stroke="#9a7a4a" stroke-width=".7" opacity=".7"><path d="M42 82 v13 M50 83 v14 M58 82 v13 M36 88 h28"/></g>
      <g transform="rotate(-14 45 76)"><path d="M43 72 l3 9 -6 0Z" fill="#e07a2e" stroke="#b85e1e" stroke-width=".8"/><path d="M43 72 l-1.5 -4 M43 72 l1.5 -4" stroke="#5a9e3a" stroke-width="1.2" stroke-linecap="round"/></g>
      <g transform="rotate(12 56 76)"><path d="M54 72 l3 9 -6 0Z" fill="#e07a2e" stroke="#b85e1e" stroke-width=".8"/><path d="M54 72 l-1.5 -4 M54 72 l1.5 -4" stroke="#5a9e3a" stroke-width="1.2" stroke-linecap="round"/></g>
      <path d="M50 74 q3 -9 -1 -14 M50 74 q-3 -9 1 -14" stroke="#5a9e3a" stroke-width="1.8" fill="none"/>`;
    case 'fruitBasket': return `
      <path d="M35 80 h30 l-3 17 q-12 4 -24 0Z" fill="#c79a5a" stroke="#8a6a3a" stroke-width="1.4"/>
      <g stroke="#9a7a4a" stroke-width=".7" opacity=".7"><path d="M42 82 v13 M50 83 v14 M58 82 v13 M36 88 h28"/></g>
      <circle cx="44" cy="77" r="5.2" fill="#d24438" stroke="#9a2e26" stroke-width="1.1"/><circle cx="56" cy="77" r="5.2" fill="#cf4838" stroke="#9a2e26" stroke-width="1.1"/>
      <circle cx="50" cy="73" r="5.4" fill="#d8543a" stroke="#9a2e26" stroke-width="1.1"/>
      <ellipse cx="47.5" cy="69.5" rx="2.4" ry="1.3" fill="#5a9e3a" transform="rotate(-22 47.5 69.5)"/><path d="M50 69 q1 -3 3 -3" stroke="#6a4520" stroke-width="1.2" fill="none"/>
      <path d="M35 80 q15 -6 30 0" fill="none" stroke="#8a6a3a" stroke-width="1.6"/>`;
    case 'smoker': return `
      <rect x="44" y="78" width="12" height="17" rx="2" fill="#9aa4b0" stroke="#5a636c" stroke-width="1.3"/>
      <path d="M44 78 q6 -4 12 0 l-2 -5 q-4 -2 -8 0Z" fill="#8a95a0" stroke="#5a636c" stroke-width="1.2"/>
      <path d="M50 73 q3 -6 -1 -11 q5 2 6 -2 q2 6 -2 9" fill="none" stroke="#cfd8de" stroke-width="2" opacity=".75" stroke-linecap="round"/>
      <path d="M56 84 q9 -1 9 6" stroke="#6e4a22" stroke-width="2.2" fill="none"/><path d="M57 85 q8 1 6 9 q-5 0 -7 -3Z" fill="#b8543e" stroke="#7a3526" stroke-width="1"/>
      <g transform="translate(38 72)"><ellipse rx="2" ry="1.4" fill="#3a2c14"/><path d="M-2 -1.2 q2 -2 4 0 M-2 1.2 q2 2 4 0" fill="#cfe1e6" opacity=".7"/></g>`;
    case 'crookLamb': return `
      <path d="M38 97 V74 q0 -8 8 -8 q5 0 5 5" stroke="#a87a3a" stroke-width="3.2" fill="none" stroke-linecap="round"/>
      <path d="M38 97 V74 q0 -8 8 -8 q5 0 5 5" stroke="#c99a52" stroke-width="1" fill="none" stroke-linecap="round"/>
      <ellipse cx="61" cy="87" rx="9.5" ry="8" fill="#f4eee2" stroke="#cfc6b4" stroke-width="1.3"/>
      <g fill="#f4eee2" stroke="#cfc6b4" stroke-width="1"><circle cx="53" cy="83" r="3.2"/><circle cx="58" cy="80" r="3.2"/><circle cx="65" cy="80" r="3.2"/><circle cx="68" cy="85" r="3.2"/></g>
      <ellipse cx="68" cy="89" rx="4.2" ry="4.8" fill="#4a3f33"/><ellipse cx="63.5" cy="85" rx="2" ry="3" fill="#4a3f33"/><circle cx="69.5" cy="88" r="1" fill="#fff"/>
      <path d="M58 95 v3 M65 95 v3" stroke="#4a3f33" stroke-width="1.8"/>`;
    case 'milkPailBig': return `
      <path d="M37 70 h26 l-3 26 q-10 4 -20 0Z" fill="#cdd6de" stroke="#8a95a0" stroke-width="1.6"/>
      <ellipse cx="50" cy="71" rx="13" ry="3.6" fill="#fff" stroke="#aeb8c0" stroke-width="1"/>
      <path d="M35 73 q15 -10 30 0" fill="none" stroke="#8a95a0" stroke-width="2"/>
      <path d="M39 76 q-3 8 1 18 M61 76 q3 8 -1 18" stroke="#aeb8c0" stroke-width="1" fill="none" opacity=".5"/>`;
    case 'lasso': return `
      <g fill="none" stroke="#c79a5a" stroke-width="2.6" stroke-linecap="round"><ellipse cx="50" cy="73" rx="15" ry="9"/><path d="M52 82 q-10 7 -8 15"/></g>
      <ellipse cx="50" cy="73" rx="15" ry="9" fill="none" stroke="#e0b878" stroke-width=".9"/>
      <path d="M40 95 a10 10 0 1 1 20 0 l-2.6 2 a6.5 6.5 0 1 0 -14.8 0Z" fill="#9aa4b0" stroke="#5a636c" stroke-width="1.2"/>`;
    case 'ironOreBig': return `
      <path d="M34 90 l4 -16 12 -5 14 8 -4 16 -14 5Z" fill="#a3795a" stroke="#6e4f38" stroke-width="1.6"/>
      <path d="M44 78 l8 8 M60 76 l-7 9" stroke="#caa07a" stroke-width="1.4"/>
      <circle cx="46" cy="84" r="1.6" fill="#d8b896"/><circle cx="57" cy="82" r="1.3" fill="#e0c0a0"/>
      <path d="M40 81 q5 2 9 -1" stroke="#b86a3a" stroke-width="1" fill="none" opacity=".55"/>`;
    case 'coalBig': return `
      <path d="M34 90 l4 -15 12 -5 14 7 -4 16 -14 5Z" fill="#3a3f47" stroke="#1f242a" stroke-width="1.6"/>
      <path d="M44 78 l8 8 M59 76 l-7 9" stroke="#5a636c" stroke-width="1.4"/>
      <circle cx="46" cy="83" r="1.6" fill="#8a939c" opacity=".7"/><circle cx="57" cy="81" r="1.3" fill="#9aa3ac" opacity=".6"/>`;
    case 'gemBig': return `
      <path d="M50 64 l11 9 -11 22 -11 -22Z" fill="#9b59c4" stroke="#6e3a8e" stroke-width="1.6"/>
      <path d="M39 73 h22 M50 64 v31" stroke="#c79ae0" stroke-width="1" opacity=".75"/>
      <path d="M44 69 l6 4 6 -4" fill="none" stroke="#e0c0f0" stroke-width="1" opacity=".7"/>
      <ellipse cx="46" cy="70" rx="2" ry="1.2" fill="#fff" opacity=".5"/>`;
    case 'goldPan': return `
      <ellipse cx="50" cy="83" rx="18" ry="9.5" fill="#7a5236" stroke="#5a3a22" stroke-width="1.8"/>
      <ellipse cx="50" cy="81" rx="13.5" ry="6.5" fill="#4a6e7a"/>
      <g fill="#e8c33a" stroke="#b8922a" stroke-width=".8"><circle cx="45" cy="81" r="2.2"/><circle cx="54" cy="82" r="2.6"/><circle cx="50" cy="79" r="1.8"/></g>
      <ellipse cx="47" cy="79" rx="3" ry="1.4" fill="#fff" opacity=".25"/>`;
    case 'shovelBig': return `
      <path d="M28 93 q22 -11 44 0 q-22 6 -44 0Z" fill="#7a5236" stroke="#5a3a22" stroke-width="1.4"/>
      <g transform="rotate(8 52 76)"><rect x="50" y="60" width="3.4" height="22" fill="#9a6a33" stroke="#6e4a22" stroke-width="1.2"/>
        <path d="M48 60 h8 v-3 h-8Z" fill="#9a6a33" stroke="#6e4a22" stroke-width="1.2"/>
        <path d="M47 82 q5 12 10 0 q-5 6 -10 0Z" fill="#9aa4b0" stroke="#6e7882" stroke-width="1.4"/></g>`;
    case 'fishBig': return `<g transform="rotate(-8 50 80)">
      <path d="M34 80 q12 -11 26 -4 q-3 4 0 8 q-14 7 -26 -4Z" fill="#7fb8c4" stroke="#3f7a8a" stroke-width="1.6"/>
      <path d="M60 76 l8 -4 v16 l-8 -4Z" fill="#7fb8c4" stroke="#3f7a8a" stroke-width="1.4"/>
      <circle cx="40" cy="79" r="1.6" fill="#1f3a44"/>
      <path d="M44 76 q4 3 0 7 M50 75 q4 4 0 9" stroke="#3f7a8a" stroke-width="1" fill="none" opacity=".6"/>
      <path d="M46 71 q4 -3 8 -1" stroke="#5a9aa8" stroke-width="1.4" fill="none"/></g>`;
    case 'ledgerBig': return `
      <path d="M32 72 q9 -5 18 -2 q9 -3 18 2 v20 q-9 -5 -18 -2 q-9 -3 -18 2Z" fill="#e8dcc0" stroke="#b89a6a" stroke-width="1.4"/>
      <path d="M50 70 v20" stroke="#b89a6a" stroke-width="1.2"/>
      <g stroke="#9a8a6a" stroke-width=".7"><path d="M36 76 h10 M36 80 h10 M36 84 h9 M54 76 h10 M54 80 h10 M54 84 h9"/></g>
      <path d="M64 62 l-9 15" stroke="#c44e3a" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M64 62 q6 -3 8 -1 q-3 5 -8 4Z" fill="#eee6d4" stroke="#9a8a6a" stroke-width=".8"/>`;
    case 'vegCrate': return `
      <path d="M34 78 h32 v17 h-32Z" fill="#b58f54" stroke="#8a6a3a" stroke-width="1.4"/>
      <g stroke="#8a6a3a" stroke-width="1"><path d="M34 85 h32 M42 78 v17 M50 78 v17 M58 78 v17"/></g>
      <circle cx="40" cy="74" r="4" fill="#d24438" stroke="#9a2e26" stroke-width="1"/>
      <path d="M50 74 q2 -8 -1 -12 q4 1 6 -1 q1 5 -2 9" fill="#5a9e3a" stroke="#3f6e2a" stroke-width="1"/>
      <g transform="rotate(14 60 73)"><path d="M58 70 l3 8 -6 0Z" fill="#e07a2e" stroke="#b85e1e" stroke-width=".8"/><path d="M58 70 l0 -4" stroke="#5a9e3a" stroke-width="1.2"/></g>`;
    case 'perfumeBig': return `
      <rect x="46" y="68" width="8" height="6" fill="#c9a0d8" stroke="#9b59c4" stroke-width="1"/>
      <path d="M42 74 h16 v8 a8 9 0 0 1 -16 0Z" fill="#d8b4e4" stroke="#9b59c4" stroke-width="1.4"/>
      <path d="M44 80 q6 -3 12 0 v3 a6 6 0 0 1 -12 0Z" fill="#c490d8"/>
      <circle cx="50" cy="63" r="3.2" fill="#e08aa0"/><circle cx="50" cy="63" r="1.3" fill="#f0c24a"/>
      <g fill="#cfe1e6" opacity=".6"><circle cx="59" cy="70" r="1"/><circle cx="62" cy="67" r=".8"/></g>
      <ellipse cx="46" cy="78" rx="2.4" ry="1.4" fill="#fff" opacity=".4"/>`;
    case 'roosterBig': return `
      <ellipse cx="48" cy="85" rx="12" ry="10" fill="#d9a85c" stroke="#a87a32" stroke-width="1.4"/>
      <path d="M37 83 q-7 -3 -10 4 q4 3 7 2 M35 87 q-6 0 -9 6 q4 2 7 0" fill="none" stroke="#7a4f1f" stroke-width="2.2"/>
      <ellipse cx="59" cy="75" rx="5.4" ry="6" fill="#e0b870" stroke="#a87a32" stroke-width="1.2"/>
      <path d="M57 69 q1 -5 4 -4 q3 1 2 4 q3 -3 5 -1 q-1 4 -4 4Z" fill="#d24438"/>
      <path d="M58 80 q1 3 3 4" stroke="#c44e3a" stroke-width="1.4" fill="none"/>
      <path d="M64 76 l6 1 -5 2.6Z" fill="#e8a23a" stroke="#b87a1e" stroke-width=".6"/>
      <circle cx="61" cy="75" r="1" fill="#2a1c14"/><path d="M44 95 v3 M51 95 v3" stroke="#e8a23a" stroke-width="1.6"/>`;
    case 'cowHead': return `
      <path d="M35 76 q-5 -8 0 -13 q4 4 5 9 M65 76 q5 -8 0 -13 q-4 4 -5 9" fill="#caa07a" stroke="#8a6a4a" stroke-width="1.2"/>
      <path d="M40 64 q3 -5 7 -3 M60 64 q-3 -5 -7 -3" stroke="#cfc6b4" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <ellipse cx="50" cy="80" rx="15" ry="14" fill="#ece1cd" stroke="#b8a888" stroke-width="1.4"/>
      <path d="M38 70 q7 -4 11 0 q-2 7 -11 4Z" fill="#7a5236"/><path d="M62 73 q-5 6 -11 4 q0 -6 5 -8 q4 0 6 4Z" fill="#7a5236"/>
      <ellipse cx="50" cy="89" rx="9" ry="6" fill="#e8b8b0" stroke="#c98a82" stroke-width="1.2"/>
      <circle cx="46" cy="90" r="1.2" fill="#8a5a52"/><circle cx="54" cy="90" r="1.2" fill="#8a5a52"/>
      <circle cx="43" cy="78" r="1.7" fill="#3a2a1a"/><circle cx="57" cy="78" r="1.7" fill="#3a2a1a"/>`;
    case 'bridleRibbon': return `
      <path d="M40 82 a13 13 0 1 1 22 0 l-3.5 3 a8.5 8.5 0 1 0 -15 0Z" fill="#e8c860" stroke="#b8922a" stroke-width="1.6"/>
      <g fill="#b8922a"><circle cx="42" cy="87" r="1.2"/><circle cx="58" cy="87" r="1.2"/><circle cx="40" cy="80" r="1.2"/><circle cx="60" cy="80" r="1.2"/></g>
      <path d="M47 76 l-2 18 5 -4 5 4 -2 -18Z" fill="#3f6fae" stroke="#2a4f86" stroke-width="1"/>
      <circle cx="50" cy="72" r="5.4" fill="#3f6fae" stroke="#2a4f86" stroke-width="1.2"/>
      <g fill="#5a86c4"><path d="M50 72 l-7 -3 1 5Z"/><path d="M50 72 l7 -3 -1 5Z"/><path d="M50 72 l0 -7 -3 4Z"/></g>
      <circle cx="50" cy="72" r="2" fill="#e8c860"/>`;
    case 'tongsIngot': return `
      <path d="M43 96 L47 73 M57 96 L53 73" stroke="#5a636c" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M47 73 q3 -4 6 0" stroke="#5a636c" stroke-width="2.4" fill="none"/>
      <rect x="41" y="64" width="18" height="9" rx="1.6" fill="#f0a83a" stroke="#c47a1e" stroke-width="1.2"/>
      <rect x="41" y="64" width="18" height="4" rx="1.6" fill="#ffd87a"/>
      <g fill="#ffd87a" opacity=".75"><circle cx="46" cy="59" r="1"/><circle cx="54" cy="58" r="1"/><circle cx="50" cy="61" r=".8"/></g>`;
    case 'scaleGem': return `
      <rect x="49" y="64" width="2.4" height="30" fill="#9a7a4a"/><circle cx="50" cy="64" r="2" fill="#c9a86a"/>
      <path d="M33 70 H67" stroke="#9a7a4a" stroke-width="2"/>
      <g stroke="#9a7a4a" stroke-width=".9"><path d="M33 70 l-4 8 M33 70 l4 8 M67 70 l-4 8 M67 70 l4 8"/></g>
      <path d="M27 78 a6 3.4 0 0 0 12 0Z" fill="#caa86a" stroke="#8a6a3a" stroke-width="1.2"/>
      <path d="M61 80 a6 3.4 0 0 0 12 0Z" fill="#caa86a" stroke="#8a6a3a" stroke-width="1.2"/>
      <rect x="30" y="74" width="6" height="4" rx="1" fill="#8a95a0" stroke="#5a636c" stroke-width=".8"/>
      <path d="M67 76 l2.6 3 -2.6 5 -2.6 -5Z" fill="#9b59c4" stroke="#6e3a8e" stroke-width="1"/>`;
    case 'coinScale': return `
      <path d="M39 78 q-2 -9 11 -9 q13 0 11 9 q1 11 -11 11 q-12 0 -11 -11Z" fill="#9a6a3a" stroke="#6e4a22" stroke-width="1.4"/>
      <path d="M41 71 q9 -4 18 0" stroke="#6e4a22" stroke-width="1.4" fill="none"/>
      <g fill="#e8c33a" stroke="#b8922a" stroke-width="1"><ellipse cx="43" cy="68" rx="5" ry="2"/><ellipse cx="43" cy="65.6" rx="5" ry="2"/><ellipse cx="57" cy="69" rx="5" ry="2"/></g>
      <circle cx="50" cy="82" r="4.4" fill="#e8c33a" stroke="#b8922a" stroke-width="1"/><path d="M50 78.6 v6.8 M46.6 82 h6.8" stroke="#b8922a" stroke-width="1.1"/>`;
    case 'bouquetBig': return `
      <path d="M50 96 q-3 -12 0 -20 M50 90 q-8 -8 -11 -14 M50 90 q8 -8 11 -14" stroke="#5a9e3a" stroke-width="1.6" fill="none"/>
      <circle cx="38" cy="70" r="4.2" fill="#e08aa0"/><circle cx="62" cy="70" r="4.2" fill="#f0c24a"/><circle cx="44" cy="63" r="4.2" fill="#c97ad0"/><circle cx="56" cy="63" r="4.2" fill="#e0607a"/><circle cx="50" cy="59" r="4.6" fill="#f0a04a"/>
      <g fill="#fff"><circle cx="38" cy="70" r="1.3"/><circle cx="62" cy="70" r="1.3"/><circle cx="44" cy="63" r="1.3"/><circle cx="56" cy="63" r="1.3"/><circle cx="50" cy="59" r="1.4"/></g>
      <path d="M40 88 q10 4 20 0" stroke="#c44e8a" stroke-width="2.2" fill="none"/>`;
    case 'runeBig': return `
      <circle cx="50" cy="80" r="15" fill="#9b59c4" opacity=".2"/>
      <path d="M38 92 q-2 -16 9 -19 q13 -2 14 8 q1 13 -11 13 q-10 0 -12 -2Z" fill="#574a78" stroke="#37305a" stroke-width="1.6"/>
      <path d="M50 66 V92 M43 76 h14 M45 70 l10 10 M55 70 l-10 10" stroke="#b79ae8" stroke-width="1.8" opacity=".95" fill="none"/>
      <g fill="#d8c0f0" opacity=".8"><circle cx="42" cy="72" r="1"/><circle cx="60" cy="86" r="1"/></g>`;
    case 'hammerAnvil': return `
      <path d="M32 86 h36 l-5 9 h-26Z" fill="#4a4f57" stroke="#2a2e34" stroke-width="1.4"/>
      <path d="M30 78 h40 l-6 8 h-28Z" fill="#5a606a" stroke="#2a2e34" stroke-width="1.4"/>
      <path d="M30 78 q-7 0 -9 4 q7 1 9 -1Z" fill="#5a606a" stroke="#2a2e34" stroke-width="1.2"/>
      <g transform="rotate(-26 50 68)"><rect x="48.4" y="56" width="3.2" height="20" rx="1.4" fill="#9a6a33" stroke="#6e4a22" stroke-width="1"/><rect x="42" y="52" width="16" height="7" rx="2" fill="#828a94" stroke="#4a4f57" stroke-width="1.2"/></g>
      <g fill="#ffd87a" opacity=".85"><circle cx="47" cy="75" r="1"/><circle cx="53" cy="74" r=".8"/><circle cx="50" cy="77" r=".7"/></g>`;
    case 'healerKit': return `
      <path d="M38 80 q12 -5 24 0 l-3 12 q-9 4 -18 0Z" fill="#cdb89a" stroke="#9a8466" stroke-width="1.4"/>
      <ellipse cx="50" cy="80" rx="12" ry="3.4" fill="#e0d2bc" stroke="#9a8466" stroke-width="1"/>
      <path d="M46 80 q-2 -8 -6 -11 M50 79 q0 -9 -1 -13 M54 80 q2 -8 5 -11" stroke="#5a9e3a" stroke-width="1.4" fill="none"/>
      <g fill="#6eae44"><ellipse cx="40" cy="69" rx="2.2" ry="1.3" transform="rotate(-30 40 69)"/><ellipse cx="49" cy="66" rx="2.2" ry="1.3"/><ellipse cx="59" cy="69" rx="2.2" ry="1.3" transform="rotate(30 59 69)"/></g>
      <g transform="rotate(24 57 73)"><rect x="55.4" y="63" width="3.2" height="15" rx="1.5" fill="#b89a72" stroke="#8a6e4a" stroke-width="1"/><ellipse cx="57" cy="78" rx="3" ry="2.4" fill="#b89a72" stroke="#8a6e4a" stroke-width="1"/></g>
      <g transform="translate(50 90)"><rect x="-2.4" y="-1" width="4.8" height="2" fill="#c43a3a"/><rect x="-1" y="-2.4" width="2" height="4.8" fill="#c43a3a"/></g>`;
    case 'bow': return `
      <path d="M43 60 Q66 72 43 96" fill="none" stroke="#8a5a2b" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M43 60 Q66 72 43 96" fill="none" stroke="#a87a3a" stroke-width="1"/>
      <path d="M43 60 L43 96" stroke="#d8c89a" stroke-width="1" opacity=".8"/>
      <path d="M37 78 H63" stroke="#9a6a33" stroke-width="2"/>
      <path d="M63 78 l-5 -3 v6Z" fill="#7a818a" stroke="#4a4f57" stroke-width=".8"/>
      <path d="M37 78 l4 -2.4 m-4 2.4 l4 2.4" stroke="#c43a3a" stroke-width="1.2"/>`;
    default: return '';
  }
}

// Shared option shape for the two bust generators (worker + npc). Flags are kept
// as the board's `1` truthies; strings are colours / type keys.
interface BustOpts {
  skin: string; hair: string; tunic: string;
  hat?: string; hatColor?: string; job?: string;
  female?: number; beard?: number; freck?: number; flour?: number; flourDots?: number;
  soot?: number; earring?: number; plaid?: number; stern?: number;
  apron?: string; apronDots?: number; strap?: string; cross?: number; acc?: string; noHair?: number;
}

// workerJob: costume-driven bust holding a big, unmistakable job prop. The two
// sheen gradients (`ts` tunic, `fs` face) are the only edit from the board source —
// converted from objectBoundingBox to explicit userSpaceOnUse coordinates so the
// generic renderer (which treats every gradient as userSpaceOnUse) places them
// correctly.
function workerJob(o: BustOpts): string {
  const c = 'wj' + (uid++);
  const sk = o.skin, skS = shade(sk, .84), hr = o.hair, hrS = shade(hr, .7), tu = o.tunic, tuS = shade(tu, .72);
  const faceOutline = '#7a4a22';
  const hatA = o.hatColor || tu, hatAs = shade(hatA, .72);
  const hairBack = o.female
    ? `<path d="M28 41 C23 17 38 9 50 9 C62 9 77 17 72 41 C74 54 70 60 68 70 L62 72 C64 56 60 48 50 46 C40 48 36 56 38 72 L32 70 C30 60 26 54 28 41Z" fill="${hr}" stroke="${hrS}" stroke-width="1.2"/>`
    : `<path d="M30 42 C26 17 41 9 50 9 C59 9 75 17 70 42 C70 30 64 22 50 22 C36 22 30 30 30 42Z" fill="${hr}" stroke="${hrS}" stroke-width="1.2"/>`;
  const beard = o.beard ? `<path d="M33 43 Q35 59 50 62 Q65 59 67 43 Q61 54 50 54 Q39 54 33 43Z" fill="${hr}" stroke="${hrS}" stroke-width="1"/>` : '';
  const freck = o.freck ? `<g fill="${o.flour ? '#f4ecd8' : '#c98a5a'}" opacity=".55"><circle cx="40" cy="48" r=".6"/><circle cx="43" cy="49.5" r=".6"/><circle cx="60" cy="48" r=".6"/><circle cx="57" cy="49.5" r=".6"/></g>` : '';
  const soot = o.soot ? `<g fill="#3a3f47" opacity=".3"><ellipse cx="40" cy="50" rx="4" ry="1.6"/><ellipse cx="60" cy="49" rx="3.2" ry="1.4"/><ellipse cx="50" cy="53" rx="2.4" ry="1.1"/></g>` : '';
  const earring = o.earring ? `<circle cx="67.8" cy="47.6" r="1.4" fill="#e3c25a" stroke="#b58f44" stroke-width=".6"/>` : '';
  const TUNIC = 'M18 100 C20 70 36 60 50 60 C64 60 80 70 82 100Z';
  const plaid = o.plaid ? `<g clip-path="url(#${c}tc)"><g stroke="${shade(tu,.6)}" stroke-width="2.6" opacity=".55">${[24,34,44,54,64,76].map(x=>`<path d="M${x} 58 V100"/>`).join('')}${[66,76,86,96].map(y=>`<path d="M12 ${y} H88"/>`).join('')}</g><g stroke="${shade(tu,1.3)}" stroke-width="1" opacity=".5">${[29,39,49,59,69].map(x=>`<path d="M${x} 58 V100"/>`).join('')}${[71,81,91].map(y=>`<path d="M12 ${y} H88"/>`).join('')}</g></g>` : '';
  const flourDots = o.flourDots ? `<g clip-path="url(#${c}tc)" fill="#f4ecd8" opacity=".85"><circle cx="29" cy="78" r="1.7"/><circle cx="35" cy="89" r="1.4"/><circle cx="71" cy="80" r="1.7"/><circle cx="65" cy="90" r="1.4"/><circle cx="27" cy="93" r="1.3"/><circle cx="73" cy="93" r="1.3"/></g>` : '';
  return FRAME({ clip: c, defs: `<filter id="${c}halo" x="-25%" y="-25%" width="150%" height="150%"><feMorphology in="SourceAlpha" operator="dilate" radius="1.15" result="d"/><feFlood flood-color="#f7efdd"/><feComposite in2="d" operator="in" result="h"/><feMerge><feMergeNode in="h"/><feMergeNode in="SourceGraphic"/></feMerge></filter><linearGradient id="${c}ts" gradientUnits="userSpaceOnUse" x1="0" y1="60" x2="0" y2="100"><stop offset="0" stop-color="#fff" stop-opacity=".17"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient><radialGradient id="${c}fs" gradientUnits="userSpaceOnUse" cx="46" cy="33" r="24"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><clipPath id="${c}tc"><path d="${TUNIC}"/></clipPath>`, body: `
    <rect width="100" height="100" fill="#f4ecd8"/>
    <path d="M18 100 C20 70 36 60 50 60 C64 60 80 70 82 100Z" fill="${tu}" stroke="${tuS}" stroke-width="1.8"/>
    <path d="M50 60 C64 60 80 70 82 100 L70 100 C68 78 60 66 50 64Z" fill="${tuS}" opacity=".5"/>
    ${plaid}${flourDots}
    <path d="${TUNIC}" fill="url(#${c}ts)"/>
    ${hairBack}
    <path d="M44 53 h12 v9 q-6 5 -12 0Z" fill="${sk}"/>
    <ellipse cx="32.5" cy="42" rx="3.2" ry="4.6" fill="${sk}" stroke="${faceOutline}" stroke-width="1.2"/>
    <ellipse cx="67.5" cy="42" rx="3.2" ry="4.6" fill="${sk}" stroke="${faceOutline}" stroke-width="1.2"/>
    ${earring}
    <path d="M32 38 Q32 18 50 18 Q68 18 68 38 Q68 56 50 61 Q32 56 32 38Z" fill="${sk}" stroke="${faceOutline}" stroke-width="1.8"/>
    <path d="M60 24 Q70 40 58 58 Q66 40 58 24Z" fill="${skS}" opacity=".5"/>
    <ellipse cx="50" cy="40" rx="18" ry="21" fill="url(#${c}fs)"/>
    ${beard}${soot}${freck}
    <path d="M39 35 q4 -2.5 8 0 M53 35 q4 -2.5 8 0" stroke="${shade(hr,.85)}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <ellipse cx="43.5" cy="40.5" rx="2.6" ry="2.6" fill="#fff" stroke="#5a3a20" stroke-width=".9"/>
    <circle cx="43.5" cy="40.5" r="1.7" fill="#4a3320"/><circle cx="44.2" cy="39.8" r=".55" fill="#fff"/>
    <ellipse cx="56.5" cy="40.5" rx="2.6" ry="2.6" fill="#fff" stroke="#5a3a20" stroke-width=".9"/>
    <circle cx="56.5" cy="40.5" r="1.7" fill="#4a3320"/><circle cx="57.2" cy="39.8" r=".55" fill="#fff"/>
    <path d="M49 41 q-1 5 -2 7 q2 1.5 4 0" stroke="#b07a4e" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    <ellipse cx="40" cy="47" rx="2.8" ry="1.8" fill="#e88a6a" opacity=".4"/><ellipse cx="60" cy="47" rx="2.8" ry="1.8" fill="#e88a6a" opacity=".4"/>
    <path d="M44 52 q6 4 12 0" stroke="#9a4a2a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    ${wHat(o.hat || '', hatA, hatAs, '#5c3a18')}
    <path d="M34 28 Q50 33 66 28 Q50 31 34 28Z" fill="#000" opacity=".1"/>
    <g filter="url(#${c}halo)">${jobIcon(o.job || '')}</g>
  ` }, '#f4ecd8', '#c5a87a', 2.5);
}

// npcBust: costume-driven townsfolk bust — job reads from costume (apron / leather
// straps / veil / wimple / hood), never a held tool. Same `ts`/`fs` userSpaceOnUse
// gradient edit as workerJob.
function npcBust(o: BustOpts): string {
  const c = 'np' + (uid++);
  const sk = o.skin, skS = shade(sk, .84), hr = o.hair, hrS = shade(hr, .7), tu = o.tunic, tuS = shade(tu, .72);
  const faceOutline = '#7a4a22', ink = '#5c3a18';
  const hatA = o.hatColor || tu, hatAs = shade(hatA, .72);
  const hairBack = o.noHair ? '' : o.female
    ? `<path d="M27 42 C22 17 38 9 50 9 C62 9 78 17 73 42 C76 64 70 76 67 96 L61 96 C64 72 60 49 50 47 C40 49 36 72 39 96 L33 96 C30 76 24 64 27 42Z" fill="${hr}" stroke="${hrS}" stroke-width="1.2"/>`
    : `<path d="M30 42 C26 17 41 9 50 9 C59 9 75 17 70 42 C70 30 64 22 50 22 C36 22 30 30 30 42Z" fill="${hr}" stroke="${hrS}" stroke-width="1.2"/>`;
  const beard = o.beard ? `<path d="M33 43 Q35 60 50 63 Q65 60 67 43 Q61 55 50 55 Q39 55 33 43Z" fill="${hr}" stroke="${hrS}" stroke-width="1"/>` : '';
  const accessory = o.acc === 'hammer' ? `<g transform="rotate(15 78 66)"><rect x="75.5" y="38" width="5" height="58" rx="2.2" fill="#8a5a30" stroke="#5a3a1c" stroke-width="1.1"/><rect x="76" y="40" width="1.4" height="54" fill="#ad7e46" opacity=".55"/><rect x="69" y="34" width="19" height="12" rx="2.2" fill="#5b626c" stroke="#2f343c" stroke-width="1.6"/><rect x="69" y="34" width="6" height="12" rx="1.6" fill="#3f444c"/><rect x="71" y="36.5" width="14" height="2.4" rx="1" fill="#7e858f" opacity=".7"/></g>` : '';
  const soot = o.soot ? `<g fill="#3a3f47" opacity=".3"><ellipse cx="40" cy="50" rx="4" ry="1.6"/><ellipse cx="60" cy="49" rx="3.2" ry="1.4"/><ellipse cx="50" cy="53" rx="2.4" ry="1.1"/></g>` : '';
  const freck = o.freck ? `<g fill="${o.flour ? '#f4ecd8' : '#c98a5a'}" opacity=".6"><circle cx="40" cy="48" r=".6"/><circle cx="43" cy="49.5" r=".6"/><circle cx="60" cy="48" r=".6"/><circle cx="57" cy="49.5" r=".6"/></g>` : '';
  const earring = o.earring ? `<circle cx="67.8" cy="47.6" r="1.4" fill="#e3c25a" stroke="#b58f44" stroke-width=".6"/>` : '';
  const TUNIC = 'M18 100 C20 70 36 60 50 60 C64 60 80 70 82 100Z';
  const APRON = 'M37 64 q13 -6 26 0 l2 36 -30 0Z';
  const apron = o.apron ? `<path d="${APRON}" fill="${o.apron}" stroke="${shade(o.apron,.72)}" stroke-width="1.3"/><path d="M45 64 q5 -3 10 0" stroke="${shade(o.apron,.72)}" stroke-width="1" fill="none" opacity=".7"/>` : '';
  const apronDots = o.apronDots ? `<g clip-path="url(#${c}ac)" fill="#f4ecd8" opacity=".85"><circle cx="43" cy="78" r="1.6"/><circle cx="56" cy="82" r="1.4"/><circle cx="48" cy="90" r="1.5"/><circle cx="59" cy="92" r="1.3"/><circle cx="41" cy="93" r="1.2"/></g>` : '';
  const strap = o.strap ? `<g stroke="${o.strap}" stroke-width="3.4" stroke-linecap="round" fill="none"><path d="M41 64 L47 100"/><path d="M59 64 L53 100"/></g><path d="M40.5 66 L46.5 99" stroke="${shade(o.strap,1.3)}" stroke-width=".8" opacity=".5" fill="none"/>` : '';
  const cross = o.cross ? `<g><circle cx="50" cy="83" r="6.5" fill="#f2ecde" stroke="${shade(tu,.7)}" stroke-width="1.2"/><path d="M50 79 v8 M46 83 h8" stroke="#a23a4c" stroke-width="2.2" stroke-linecap="round"/></g>` : '';
  return FRAME({ clip: c, defs: `<linearGradient id="${c}ts" gradientUnits="userSpaceOnUse" x1="0" y1="60" x2="0" y2="100"><stop offset="0" stop-color="#fff" stop-opacity=".17"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient><radialGradient id="${c}fs" gradientUnits="userSpaceOnUse" cx="46" cy="33" r="24"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><clipPath id="${c}ac"><path d="${APRON}"/></clipPath>`, body: `
    <rect width="100" height="100" fill="#f4ecd8"/>
    <path d="${TUNIC}" fill="${tu}" stroke="${tuS}" stroke-width="1.8"/>
    <path d="M50 60 C64 60 80 70 82 100 L70 100 C68 78 60 66 50 64Z" fill="${tuS}" opacity=".5"/>
    ${apron}${apronDots}${strap}${cross}
    <path d="${TUNIC}" fill="url(#${c}ts)"/>
    ${accessory}
    ${hairBack}
    <path d="M44 53 h12 v9 q-6 5 -12 0Z" fill="${sk}"/>
    <ellipse cx="32.5" cy="42" rx="3.2" ry="4.6" fill="${sk}" stroke="${faceOutline}" stroke-width="1.2"/>
    <ellipse cx="67.5" cy="42" rx="3.2" ry="4.6" fill="${sk}" stroke="${faceOutline}" stroke-width="1.2"/>
    ${earring}
    <path d="M32 38 Q32 18 50 18 Q68 18 68 38 Q68 56 50 61 Q32 56 32 38Z" fill="${sk}" stroke="${faceOutline}" stroke-width="1.8"/>
    <path d="M60 24 Q70 40 58 58 Q66 40 58 24Z" fill="${skS}" opacity=".5"/>
    <ellipse cx="50" cy="40" rx="18" ry="21" fill="url(#${c}fs)"/>
    ${beard}${soot}${freck}
    <path d="M39 35 q4 -2.5 8 0 M53 35 q4 -2.5 8 0" stroke="${shade(hr,.85)}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <ellipse cx="43.5" cy="40.5" rx="2.6" ry="2.6" fill="#fff" stroke="#5a3a20" stroke-width=".9"/>
    <circle cx="43.5" cy="40.5" r="1.7" fill="#4a3320"/><circle cx="44.2" cy="39.8" r=".55" fill="#fff"/>
    <ellipse cx="56.5" cy="40.5" rx="2.6" ry="2.6" fill="#fff" stroke="#5a3a20" stroke-width=".9"/>
    <circle cx="56.5" cy="40.5" r="1.7" fill="#4a3320"/><circle cx="57.2" cy="39.8" r=".55" fill="#fff"/>
    <path d="M49 41 q-1 5 -2 7 q2 1.5 4 0" stroke="#b07a4e" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    <ellipse cx="40" cy="47" rx="2.8" ry="1.8" fill="#e88a6a" opacity=".4"/><ellipse cx="60" cy="47" rx="2.8" ry="1.8" fill="#e88a6a" opacity=".4"/>
    ${o.stern ? `<path d="M45 52 h10" stroke="#9a4a2a" stroke-width="1.6" fill="none" stroke-linecap="round"/>` : `<path d="M44 52 q6 4 12 0" stroke="#9a4a2a" stroke-width="1.5" fill="none" stroke-linecap="round"/>`}
    ${wHat(o.hat || '', hatA, hatAs, ink)}
    <path d="M34 28 Q50 33 66 28 Q50 31 34 28Z" fill="#000" opacity=".1"/>
  ` }, '#f4ecd8', '#c5a87a', 2.5);
}

// bossArt: faithful 1:1 ports of the in-game canvas bosses. Canvas works in a
// centred ±32 space; `W` maps origin→(50,50) and scale 1.5 so the art fills the
// r=48 badge. Gradients are inline userSpaceOnUse, matching the renderer.
function bossArt(id: string): string {
  const g = 'B' + (uid++);
  const W = (body: string): string => `<g transform="translate(50 50) scale(1.5)">${body}</g>`;
  switch (id) {
    case 'frostmaw': return W(`
      <radialGradient id="${g}h" gradientUnits="userSpaceOnUse" cx="0" cy="-8" r="24" fx="-4" fy="-10"><stop offset="0" stop-color="#d8eef8"/><stop offset=".5" stop-color="#7aaadd"/><stop offset="1" stop-color="#1a3a6a"/></radialGradient>
      <path d="M-26 28 C-22 12 -14 8 0 8 C14 8 22 12 26 28 L26 32 L-26 32Z" fill="#5a8acc" stroke="#1a3a6a" stroke-width="1.6"/>
      <ellipse cx="0" cy="-8" rx="16" ry="18" fill="url(#${g}h)" stroke="#0a1a3a" stroke-width="1.8"/>
      <g fill="#cfe8f8" stroke="#3a82c4" stroke-width="1"><path d="M-14 -20 L-10 -20 L-14 -28Z"/><path d="M-6 -23 L-2 -23 L-3 -30Z"/><path d="M2 -23 L6 -23 L3 -30Z"/><path d="M10 -20 L14 -20 L14 -28Z"/><path d="M-10 -22 L-6 -22 L-8 -29Z"/><path d="M6 -22 L10 -22 L8 -29Z"/></g>
      <circle cx="-5" cy="-8" r="5" fill="#fff" opacity=".6"/><circle cx="5" cy="-8" r="5" fill="#fff" opacity=".6"/>
      <circle cx="-5" cy="-8" r="2.4" fill="#65e5ff"/><circle cx="5" cy="-8" r="2.4" fill="#65e5ff"/>
      <circle cx="-5.5" cy="-8.5" r=".8" fill="#fff"/><circle cx="4.5" cy="-8.5" r=".8" fill="#fff"/>
      <path d="M-8 4 L-5 9 L-3 5 L0 9 L3 5 L5 9 L8 4Z" fill="#0a1a3a"/>
      <g fill="#fff"><path d="M-6 4 L-4 4 L-5 7Z"/><path d="M-1 4 L1 4 L0 8Z"/><path d="M4 4 L6 4 L5 7Z"/></g>
      <g fill="#fff" opacity=".45"><circle cx="-8" cy="14" r="2"/><circle cx="-4" cy="16" r="3"/><circle cx="0" cy="14" r="4"/><circle cx="4" cy="16" r="2"/><circle cx="8" cy="14" r="3"/><circle cx="12" cy="16" r="4"/></g>
      <g fill="#fff"><circle cx="-22" cy="-16" r="1.4"/><circle cx="22" cy="-14" r="1.4"/><circle cx="-18" cy="4" r="1.4"/><circle cx="20" cy="0" r="1.4"/></g>`);
    case 'quagmire': return W(`
      <radialGradient id="${g}h" gradientUnits="userSpaceOnUse" cx="0" cy="-4" r="24" fx="-4" fy="-10"><stop offset="0" stop-color="#7ab040"/><stop offset=".6" stop-color="#3a6018"/><stop offset="1" stop-color="#1a2a08"/></radialGradient>
      <path d="M-26 28 C-22 12 -10 8 0 8 C10 8 22 12 26 28 L26 32 L-26 32Z" fill="#3a5018" stroke="#1a2808" stroke-width="1.6"/>
      <g fill="none" stroke="#5a8028" stroke-width="2" stroke-linecap="round"><path d="M-14 -16 C-14 -19 -19 -19 -20 -22"/><path d="M-6 -20 C-4.5 -23.5 -8 -24 -9 -27"/><path d="M6 -20 C10.5 -23.5 10 -24 9 -27"/><path d="M14 -16 C20 -19 21 -19 20 -22"/><path d="M-10 -18 C-9 -21.5 -13 -22 -14 -25"/><path d="M10 -18 C15 -21.5 15 -22 14 -25"/></g>
      <ellipse cx="0" cy="-6" rx="18" ry="18" fill="url(#${g}h)" stroke="#0a1a04" stroke-width="1.8"/>
      <path d="M-18 -10 A4 2 0 0 1 -10 -10Z" fill="#c8281a"/><circle cx="-15" cy="-10.5" r=".6" fill="#fffae0"/><circle cx="-13" cy="-11" r=".6" fill="#fffae0"/>
      <path d="M8 -14 A4 2 0 0 1 16 -14Z" fill="#c8281a"/><circle cx="11" cy="-14.5" r=".6" fill="#fffae0"/><circle cx="13" cy="-15" r=".6" fill="#fffae0"/>
      <ellipse cx="-6" cy="-6" rx="5" ry="4" fill="#000" opacity=".6"/><ellipse cx="6" cy="-6" rx="5" ry="4" fill="#000" opacity=".6"/>
      <circle cx="-6" cy="-6" r="2.4" fill="#f8d040"/><circle cx="6" cy="-6" r="2.4" fill="#f8d040"/>
      <circle cx="-6" cy="-6" r="1" fill="#1a0a04"/><circle cx="6" cy="-6" r="1" fill="#1a0a04"/>
      <ellipse cx="0" cy="6" rx="8" ry="4" fill="#1a2a08"/>
      <g stroke="#5a8028" stroke-width="1"><path d="M-6 4 L-5 8 M-3 4 L-2 8 M0 4 L1 8 M3 4 L4 8 M6 4 L7 8"/></g>
      <path d="M-2 12 C-4 18 0 22 0 14Z" fill="#3a6018"/>`);
    case 'ember_drake': return W(`
      <radialGradient id="${g}h" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="22" fx="-4" fy="-10"><stop offset="0" stop-color="#f8a020"/><stop offset=".4" stop-color="#c83818"/><stop offset="1" stop-color="#3a0808"/></radialGradient>
      <path d="M-26 28 C-22 12 -10 8 0 8 C10 8 22 12 26 28 L26 32 L-26 32Z" fill="#7a1808" stroke="#3a0808" stroke-width="1.6"/>
      <path d="M-16 -8 C-20 -22 -8 -28 0 -26 C8 -28 20 -22 16 -8 C20 0 22 8 14 8 C8 12 -8 12 -14 8 C-20 4 -20 -2 -16 -8Z" fill="url(#${g}h)" stroke="#3a0808" stroke-width="1.8"/>
      <g fill="#3a1808" stroke="#1a0408" stroke-width="1"><path d="M-15 -21 L-9 -23 C-14 -23 -16 -29 -16 -29Z"/><path d="M9 -21 L15 -23 C18 -23 16 -29 16 -29Z"/></g>
      <ellipse cx="-5" cy="-10" rx="4" ry="3" fill="#1a0408"/><ellipse cx="5" cy="-10" rx="4" ry="3" fill="#1a0408"/>
      <circle cx="-5" cy="-10" r="2" fill="#ffd040"/><circle cx="5" cy="-10" r="2" fill="#ffd040"/>
      <rect x="-5.5" y="-11" width="1" height="4" fill="#1a0408"/><rect x="4.5" y="-11" width="1" height="4" fill="#1a0408"/>
      <circle cx="-3" cy="-2" r=".8" fill="#1a0408"/><circle cx="3" cy="-2" r=".8" fill="#1a0408"/>
      <path d="M0 -2 C-4 -8 4 -12 0 -18" fill="none" stroke="#785028" stroke-width="1.4" stroke-linecap="round" opacity=".6"/>
      <path d="M-10 4 L10 4" stroke="#1a0408" stroke-width="1.4"/>
      <g fill="#fffae0"><path d="M-7 4 L-5 4 L-6 7Z"/><path d="M-3 4 L-1 4 L-2 7Z"/><path d="M1 4 L3 4 L2 7Z"/><path d="M5 4 L7 4 L6 7Z"/></g>
      <g fill="#ffa028" opacity=".85"><circle cx="-22" cy="4" r="2"/><circle cx="22" cy="6" r="1.6"/><circle cx="-18" cy="-16" r="1.4"/><circle cx="20" cy="-14" r="1.4"/></g>`);
    case 'old_stoneface': return W(`
      <linearGradient id="${g}h" gradientUnits="userSpaceOnUse" x1="0" y1="-22" x2="0" y2="8"><stop offset="0" stop-color="#a89878"/><stop offset=".5" stop-color="#6a584a"/><stop offset="1" stop-color="#3a2818"/></linearGradient>
      <path d="M-26 28 C-22 12 -14 8 0 8 C14 8 22 12 26 28 L26 32 L-26 32Z" fill="#7a6850" stroke="#2a1a0a" stroke-width="1.6"/>
      <path d="M-18 -22 L18 -22 L20 4 L-20 4Z" fill="url(#${g}h)" stroke="#1a0a04" stroke-width="1.8"/>
      <g fill="none" stroke="#281408" stroke-width="1" opacity=".7"><path d="M-10 -22 L-8 -16 L-12 -10 L-10 -4"/><path d="M12 -16 L10 -10 L14 -4"/><path d="M0 -8 L2 -2 L-2 2"/></g>
      <rect x="-12" y="-14" width="8" height="4" fill="#0a0604"/><rect x="4" y="-14" width="8" height="4" fill="#0a0604"/>
      <rect x="-10" y="-13" width="4" height="2" fill="#f8c060"/><rect x="6" y="-13" width="4" height="2" fill="#f8c060"/>
      <g fill="#5a8028"><ellipse cx="-14" cy="-22" rx="4" ry="2.4"/><ellipse cx="12" cy="-20" rx="3" ry="1.8"/><ellipse cx="-6" cy="-2" rx="3" ry="1.8"/></g>
      <rect x="-10" y="0" width="20" height="4" fill="#a89878" stroke="#1a0a04" stroke-width=".8"/>
      <g stroke="#1a0a04" stroke-width=".8"><path d="M-8 0 L-8 4 M-4 0 L-4 4 M0 0 L0 4 M4 0 L4 4 M8 0 L8 4"/></g>
      <g fill="#5a4a3a"><circle cx="-22" cy="14" r="2"/><circle cx="22" cy="16" r="2"/><circle cx="-18" cy="26" r="2"/><circle cx="20" cy="24" r="2"/></g>`);
    case 'mossback': return W(`
      <radialGradient id="${g}h" gradientUnits="userSpaceOnUse" cx="0" cy="-10" r="28" fx="-4" fy="-16"><stop offset="0" stop-color="#a85818"/><stop offset=".6" stop-color="#5a3014"/><stop offset="1" stop-color="#1a0808"/></radialGradient>
      <path d="M-26 28 C-22 12 -10 8 0 8 C10 8 22 12 26 28 L26 32 L-26 32Z" fill="#5a7a18" stroke="#1a2a04" stroke-width="1.6"/>
      <path d="M-22 -8 C-22 -28 22 -28 22 -8 C8 -10 -8 -10 -22 -8Z" fill="url(#${g}h)" stroke="#1a0808" stroke-width="1.8"/>
      <g fill="none" stroke="#ffc88c" stroke-width="1" opacity=".6"><path d="M-8 -18 L-10 -14.5 L-14 -14.5 L-16 -18 L-14 -21.5 L-10 -21.5Z"/><path d="M2 -22 L0 -18.5 L-4 -18.5 L-6 -22 L-4 -25.5 L0 -25.5Z"/><path d="M12 -20 L10 -16.5 L6 -16.5 L4 -20 L6 -23.5 L10 -23.5Z"/><path d="M18 -14 L16 -10.5 L12 -10.5 L10 -14 L12 -17.5 L16 -17.5Z"/><path d="M-4 -14 L-6 -10.5 L-10 -10.5 L-12 -14 L-10 -17.5 L-6 -17.5Z"/></g>
      <g fill="#5a8028"><ellipse cx="-12" cy="-18" rx="5" ry="3.5"/><ellipse cx="4" cy="-22" rx="3" ry="2.1"/><ellipse cx="12" cy="-12" rx="3" ry="2.1"/></g>
      <g fill="#f8d040"><circle cx="-12" cy="-18" r="1.2"/><circle cx="4" cy="-22" r="1.2"/></g>
      <ellipse cx="0" cy="0" rx="14" ry="12" fill="#5a7028" stroke="#1a2a04" stroke-width="1.6"/>
      <circle cx="-4" cy="-2" r="2" fill="#0a1804"/><circle cx="4" cy="-2" r="2" fill="#0a1804"/>
      <circle cx="-3.5" cy="-2.5" r=".6" fill="#a8c068"/><circle cx="4.5" cy="-2.5" r=".6" fill="#a8c068"/>
      <path d="M-4 4 L4 4" stroke="#0a1804" stroke-width="1.4"/>
      <circle cx="-16" cy="-12" r="2.4" fill="#c43a68" stroke="#5a1a3a" stroke-width=".6"/>`);
    case 'storm': return W(`
      <linearGradient id="${g}s" gradientUnits="userSpaceOnUse" x1="0" y1="14" x2="0" y2="32"><stop offset="0" stop-color="#2a4870"/><stop offset=".6" stop-color="#16263e"/><stop offset="1" stop-color="#0a1424"/></linearGradient>
      <linearGradient id="${g}b" gradientUnits="userSpaceOnUse" x1="0" y1="-6" x2="0" y2="16"><stop offset="0" stop-color="#fffae0"/><stop offset=".5" stop-color="#fff080"/><stop offset="1" stop-color="#f8b020"/></linearGradient>
      <radialGradient id="${g}h" gradientUnits="userSpaceOnUse" cx="0" cy="-10" r="32" fx="-4" fy="-16"><stop offset="0" stop-color="#5a6680"/><stop offset=".6" stop-color="#2a3450"/><stop offset="1" stop-color="#10182a"/></radialGradient>
      <path d="M-30 16 C-22 12 -14 18 -6 14 C2 10 10 18 18 14 C24 12 28 16 30 14 L30 32 L-30 32Z" fill="url(#${g}s)" stroke="#0a1424" stroke-width="1.4"/>
      <g fill="#dce8f8" opacity=".85"><ellipse cx="-22" cy="14" rx="4" ry="1.4"/><ellipse cx="-8" cy="13" rx="5" ry="1.4"/><ellipse cx="10" cy="16" rx="4" ry="1.3"/><ellipse cx="22" cy="14" rx="3" ry="1.2"/></g>
      <g stroke="#788caa" stroke-width=".8" opacity=".5"><path d="M-22 -4 L-24 12 M-18 -4 L-20 12 M-14 -4 L-16 12 M-10 -4 L-12 12 M-6 -4 L-8 12 M-2 -4 L-4 12 M2 -4 L0 12 M6 -4 L4 12 M10 -4 L8 12 M14 -4 L12 12 M18 -4 L16 12 M22 -4 L20 12"/></g>
      <path d="M-2 -8 L4 2 L0 2 L6 14 L-2 6 L2 6Z" fill="url(#${g}b)" stroke="#c08020" stroke-width=".8"/>
      <ellipse cx="2" cy="4" rx="10" ry="14" fill="#fff0a0" opacity=".25"/>
      <path d="M-24 -8 C-26 -21 -12 -27 -4 -21 C4 -30 17 -27 19 -18 C28 -19 29 -8 23 -4 C21 2 14 4 10 -2 C6 4 -2 4 -6 -2 C-12 4 -19 2 -21 -4 C-28 -4 -28 -10 -24 -8Z" fill="url(#${g}h)" stroke="#0a0e1a" stroke-width="1.6"/>
      <path d="M-22 -16 C-18 -24 -8 -26 0 -22" fill="none" stroke="#b4c8e6" stroke-width="1.2" opacity=".45"/>
      <circle cx="-8" cy="-14" r="2.2" fill="#fff0c8" opacity=".85"/><circle cx="6" cy="-14" r="2.2" fill="#fff0c8" opacity=".85"/>
      <circle cx="-8" cy="-14" r="1.1" fill="#f8c040"/><circle cx="6" cy="-14" r="1.1" fill="#f8c040"/>
      <circle cx="-8" cy="-14" r="5" fill="#ffc850" opacity=".15"/><circle cx="6" cy="-14" r="5" fill="#ffc850" opacity=".15"/>
      <g fill="#7aa8d0"><ellipse cx="-14" cy="6" rx="1" ry="1.8"/><ellipse cx="-4" cy="8" rx="1" ry="1.8"/><ellipse cx="12" cy="8" rx="1" ry="1.8"/><ellipse cx="18" cy="5" rx="1" ry="1.8"/></g>`);
    default: return '';
  }
}

interface BossRow { id: string; name: string; sub: string; bg: string; rim: string; }
function bossBust(o: BossRow): string {
  const c = 'bo' + (uid++);
  return FRAME({ clip: c, body: `${bossArt(o.id)}` }, o.bg, o.rim, 2.8);
}

// ── Palettes ──────────────────────────────────────────────────────────────────
const SK = { light: '#f1c79c', tan: '#e0aa7e', deep: '#c98a5a' };
const HR = { brown: '#8a5a2b', dark: '#33241a', auburn: '#a8542c', blond: '#d8b46a', grey: '#b3a99c', black: '#241a1a' };

// ── Data rows (board WORKERS2 / NPCS / BOSSES), each annotated with its canonical
// registry key. Worker keys are the `WorkerTypeId` enum values; NPCs use char_*,
// bosses boss_*. The registry `color` is the board tunic (workers/npcs) or rim
// (bosses) — matching the colours the icon-audit test asserts. ─────────────────
interface WorkerRow extends BustOpts { n: number; name: string; role: string; tool: string; key: string; }
interface NpcRow extends BustOpts { name: string; role: string; tag: string; key: string; }

const WORKERS2: WorkerRow[] = [
  { n: 1, name: 'Farmer', role: 'Farmer', key: 'worker_farmer', tunic: '#4f8c3a', skin: SK.light, hair: HR.brown, hat: 'straw', job: 'wheatBig', freck: 1, tool: 'Wheat sheaf' },
  { n: 2, name: 'Lumberjack', role: 'Lumberjack', key: 'worker_lumberjack', tunic: '#a8412e', skin: SK.tan, hair: HR.dark, beard: 1, hat: 'beanie', hatColor: '#5a3f28', plaid: 1, job: 'axeBig', tool: 'Felling axe' },
  { n: 3, name: 'Miner', role: 'Miner', key: 'worker_miner', tunic: '#7a8490', skin: SK.tan, hair: HR.black, hat: 'minerHat', job: 'pickBig', tool: 'Pickaxe' },
  { n: 4, name: 'Baker', role: 'Baker', key: 'worker_baker', tunic: '#e3d3b4', skin: SK.light, hair: HR.brown, hat: 'toque', job: 'breadPaddle', freck: 1, flour: 1, flourDots: 1, tool: 'Bread peel' },
  { n: 5, name: 'Peasant', role: 'Hayward', key: 'worker_peasant', tunic: '#6fa838', skin: SK.deep, hair: HR.grey, beard: 1, hat: 'straw', job: 'pitchforkHay', tool: 'Pitchfork of hay' },
  { n: 6, name: 'Poultryman', role: 'Poultryman', key: 'worker_poultryman', tunic: '#d9a85c', skin: SK.light, hair: HR.auburn, hat: 'flatcap', job: 'henBig', tool: 'Hen' },
  { n: 7, name: 'Vegetable Picker', role: 'Picker', key: 'worker_vegetable_picker', tunic: '#d97b32', skin: SK.tan, hair: HR.dark, hat: 'strawWide', job: 'vegBasket', tool: 'Basket of carrots' },
  { n: 8, name: 'Fruit Picker', role: 'Picker', key: 'worker_fruit_harvester', tunic: '#d44b48', skin: SK.light, hair: HR.auburn, female: 1, earring: 1, hat: 'straw', job: 'fruitBasket', tool: 'Basket of apples' },
  { n: 9, name: 'Bee Keeper', role: 'Apiarist', key: 'worker_bee_keeper', tunic: '#d96bb0', skin: SK.light, hair: HR.brown, female: 1, hat: 'veil', job: 'smoker', tool: 'Bee-smoker' },
  { n: 10, name: 'Herder', role: 'Herder', key: 'worker_herdsman', tunic: '#c97e7a', skin: SK.tan, hair: HR.dark, female: 1, hat: 'wool', job: 'crookLamb', tool: 'Crook & lamb' },
  { n: 11, name: 'Dairywoman', role: 'Dairywoman', key: 'worker_dairywoman', tunic: '#9c6230', skin: SK.light, hair: HR.blond, female: 1, earring: 1, hat: 'scarf', job: 'milkPailBig', tool: 'Milk pail' },
  { n: 12, name: 'Wrangler', role: 'Wrangler', key: 'worker_wrangler', tunic: '#6f86b0', skin: SK.tan, hair: HR.dark, hat: 'flatcap', job: 'lasso', tool: 'Lasso' },
  { n: 13, name: 'Iron Miner', role: 'Miner', key: 'worker_iron_miner', tunic: '#a3795a', skin: SK.tan, hair: HR.black, hat: 'minerHat', job: 'ironOreBig', tool: 'Iron ore' },
  { n: 14, name: 'Coal Miner', role: 'Miner', key: 'worker_coal_miner', tunic: '#4a4f57', skin: SK.tan, hair: HR.black, hat: 'minerHat', soot: 1, job: 'coalBig', tool: 'Coal' },
  { n: 15, name: 'Gem-cutter', role: 'Lapidary', key: 'worker_gem_cutter', tunic: '#9b59c4', skin: SK.light, hair: HR.dark, hat: 'minerHat', job: 'gemBig', tool: 'Cut gem' },
  { n: 16, name: 'Gold Miner', role: 'Miner', key: 'worker_gold_miner', tunic: '#c9a52a', skin: SK.tan, hair: HR.grey, beard: 1, hat: 'minerHat', job: 'goldPan', tool: 'Gold pan' },
  { n: 17, name: 'Digger', role: 'Digger', key: 'worker_digger', tunic: '#7a5236', skin: SK.tan, hair: HR.dark, hat: 'scarf', hatColor: '#9a7a4a', job: 'shovelBig', tool: 'Shovel' },
  { n: 18, name: 'Fisherman', role: 'Fisher', key: 'worker_fisherman', tunic: '#3f9cb5', skin: SK.tan, hair: HR.dark, beard: 1, hat: 'souwester', job: 'fishBig', tool: 'Catch' },
  { n: 19, name: 'Steward', role: 'Promoter', key: 'worker_steward', tunic: '#e0bf3e', skin: SK.light, hair: HR.brown, hat: 'fine', job: 'ledgerBig', tool: 'Ledger & quill' },
  { n: 20, name: 'Greengrocer', role: 'Promoter', key: 'worker_greengrocer', tunic: '#d97b32', skin: SK.light, hair: HR.dark, hat: 'flatcap', job: 'vegCrate', tool: 'Crate of veg' },
  { n: 21, name: 'Perfumer', role: 'Promoter', key: 'worker_perfumer', tunic: '#d44b48', skin: SK.light, hair: HR.dark, female: 1, earring: 1, hat: 'floral', job: 'perfumeBig', tool: 'Perfume flask' },
  { n: 22, name: 'Rancher', role: 'Promoter', key: 'worker_rancher', tunic: '#d9a85c', skin: SK.tan, hair: HR.dark, hat: 'flatcap', job: 'roosterBig', tool: 'Rooster' },
  { n: 23, name: 'Drover', role: 'Promoter', key: 'worker_drover', tunic: '#c97e7a', skin: SK.tan, hair: HR.dark, beard: 1, hat: 'wool', job: 'cowHead', tool: 'Cow' },
  { n: 24, name: 'Equerry', role: 'Promoter', key: 'worker_equerry', tunic: '#9c6230', skin: SK.light, hair: HR.dark, hat: 'fine', job: 'bridleRibbon', tool: 'Prize horseshoe' },
  { n: 25, name: 'Smelter', role: 'Promoter', key: 'worker_smelter', tunic: '#a3795a', skin: SK.tan, hair: HR.black, hat: 'minerHat', soot: 1, job: 'tongsIngot', tool: 'Forged ingot' },
  { n: 26, name: 'Assayer', role: 'Promoter', key: 'worker_assayer', tunic: '#9b59c4', skin: SK.light, hair: HR.grey, hat: 'fine', job: 'scaleGem', tool: 'Assay scale' },
  { n: 27, name: 'Tax Collector', role: 'Collector', key: 'worker_tax_collector', tunic: '#f0a83a', skin: SK.light, hair: HR.dark, hat: 'fine', job: 'coinScale', tool: 'Coin purse' },
  { n: 28, name: 'Florist', role: 'Florist', key: 'worker_florist', tunic: '#d96bb0', skin: SK.light, hair: HR.brown, female: 1, earring: 1, hat: 'floral', job: 'bouquetBig', tool: 'Bouquet' },
  { n: 29, name: 'Rune Seeker', role: 'Seeker', key: 'worker_rune_seeker', tunic: '#7a5aa8', skin: SK.light, hair: HR.dark, hat: 'hood', job: 'runeBig', tool: 'Rune stone' },
];

const NPCS: NpcRow[] = [
  { name: 'Mira', role: 'Baker', tag: 'Apron & flour', key: 'char_mira', tunic: '#d6612a', skin: SK.light, hair: HR.brown, female: 1, apron: '#efe6cf', apronDots: 1, freck: 1, flour: 1 },
  { name: 'Old Tomas', role: 'Beekeeper', tag: 'Straw veil', key: 'char_tomas', tunic: '#c8923a', skin: SK.tan, hair: HR.grey, beard: 1, hat: 'veil' },
  { name: 'Bram', role: 'Smith', tag: 'Hammer & apron', key: 'char_bram', tunic: '#5a6973', skin: SK.tan, hair: HR.black, beard: 1, apron: '#6b4a2e', strap: '#4a3018', soot: 1, stern: 1, acc: 'hammer' },
  { name: 'Sister Liss', role: 'Physician', tag: 'Wimple & cross', key: 'char_liss', tunic: '#8d3a5c', skin: SK.light, hair: HR.brown, female: 1, noHair: 1, hat: 'wimple', hatColor: '#ece6ee', cross: 1 },
  { name: 'Wren', role: 'Scout', tag: 'Green hood', key: 'char_wren', tunic: '#4f6b3a', skin: SK.light, hair: HR.auburn, freck: 1, hat: 'hood', hatColor: '#3f5a2e' },
];

const BOSSES: BossRow[] = [
  { id: 'frostmaw', name: 'Frostmaw', sub: 'Ice titan · Winter', bg: '#cfe8f8', rim: '#3a82c4' },
  { id: 'quagmire', name: 'Quagmire', sub: 'Bog beast · Spring', bg: '#c8d8a0', rim: '#5a8028' },
  { id: 'ember_drake', name: 'Ember Drake', sub: 'Fire dragon · Summer', bg: '#fce0d0', rim: '#c84818' },
  { id: 'old_stoneface', name: 'Old Stoneface', sub: 'Stone golem · Autumn', bg: '#d8d0c0', rim: '#5a4a3a' },
  { id: 'mossback', name: 'Mossback', sub: 'Mossy titan · Glades', bg: '#d8e8b8', rim: '#3a6018' },
  { id: 'storm', name: 'The Storm', sub: 'Squall · Harbor', bg: '#9aa8c4', rim: '#1a2e4a' },
];

// ── Exported registry map ─────────────────────────────────────────────────────
// All 40 canonical keys: 29 worker_<enum>, 5 char_<npc>, 6 boss_<id>. The SVG
// strings are built once at module load (pure string work, safe in Node); each
// `draw` parses + paints lazily, only in a browser.
const CHARACTER_ICONS: Record<string, IconEntry> = {};
for (const w of WORKERS2) CHARACTER_ICONS[w.key] = { label: w.name, color: w.tunic, draw: makeDraw(workerJob(w)) };
for (const n of NPCS) CHARACTER_ICONS[n.key] = { label: n.name, color: n.tunic, draw: makeDraw(npcBust(n)) };
for (const b of BOSSES) CHARACTER_ICONS['boss_' + b.id] = { label: b.name, color: b.rim, draw: makeDraw(bossBust(b)) };

export { CHARACTER_ICONS };


