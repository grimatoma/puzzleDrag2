// Character portraits — v2 "cozy chibi" restyle.
//
// A from-scratch alternative to the head-and-shoulders portraits in
// `characters.ts`. The brief: ditch the uncanny realistic faces and draw
// warm, rounded mascot busts with big expressive eyes (bright catchlights),
// soft cheek blush, and tidy little smiles — the things that read as charming
// rather than "off" at 56px. Every figure sits inside a glossy circular
// "coin" badge and is clipped to it, so nothing spills past the rim the way
// the old avatar frames did.
//
// Keys are suffixed `_v2` so they live alongside the originals for side-by-side
// review in the icon tracker ("Chars v2" tab). The game uses v1 on the canonical
// `char_*` / `worker_*` / `boss_*` keys; opt into v2 later by promoting or
// repointing those keys.

type Ctx = CanvasRenderingContext2D;
interface Skin { hi: string; mid: string; lo: string }

// Cohesive skin ramp set (light highlight → mid → shadow). Picking from a
// small shared set keeps all the faces feeling like one cast.
const SKIN = {
  light: { hi: "#ffe7cc", mid: "#f6cfa6", lo: "#dcab80" },
  warm:  { hi: "#f8d3a8", mid: "#eab98a", lo: "#cf9a6a" },
  tan:   { hi: "#ecc093", mid: "#d6a36e", lo: "#b9854f" },
  deep:  { hi: "#d2a075", mid: "#b27f54", lo: "#8f6239" },
} satisfies Record<string, Skin>;

// ── Shared building blocks ────────────────────────────────────────────────

function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Glossy coin backdrop: vertical theme gradient + a soft top sheen.
function badgeFill(ctx: Ctx, top: string, bottom: string) {
  const g = ctx.createLinearGradient(0, -30, 0, 30);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 29, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 29, 0, Math.PI * 2);
  ctx.clip();
  const sheen = ctx.createLinearGradient(0, -30, 0, 2);
  sheen.addColorStop(0, "rgba(255,255,255,0.22)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(-30, -30, 60, 34);
  ctx.restore();
}

// Crisp rim drawn on top of the (clipped) figure.
function rim(ctx: Ctx, color: string) {
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 29, 0, Math.PI * 2);
  ctx.stroke();
}

// Clip the figure to the inside of the coin so nothing pokes past the rim.
function clipIn(ctx: Ctx) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 28.4, 0, Math.PI * 2);
  ctx.clip();
}

// Small rounded chibi torso rising from the bottom of the coin.
function body(ctx: Ctx, color: string, outline: string, collar?: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-21, 33);
  ctx.lineTo(-19, 19);
  ctx.quadraticCurveTo(-15, 9.5, 0, 9.5);
  ctx.quadraticCurveTo(15, 9.5, 19, 19);
  ctx.lineTo(21, 33);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  if (collar) {
    ctx.fillStyle = collar;
    ctx.beginPath();
    ctx.moveTo(-8, 11);
    ctx.quadraticCurveTo(0, 17, 8, 11);
    ctx.quadraticCurveTo(0, 14, -8, 11);
    ctx.closePath();
    ctx.fill();
  }
}

interface HeadOpts { cy?: number; rx?: number; ry?: number }
// Big rounded head with a soft upper-left lit skin gradient.
function head(ctx: Ctx, skin: Skin, opts: HeadOpts = {}) {
  const { cy = -4, rx = 15.5, ry = 16 } = opts;
  const g = ctx.createRadialGradient(-6, cy - 7, 2, 0, cy, ry + 6);
  g.addColorStop(0, skin.hi);
  g.addColorStop(0.55, skin.mid);
  g.addColorStop(1, skin.lo);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = skin.lo;
  ctx.lineWidth = 1.3;
  ctx.stroke();
}

type Eyes = "open" | "happy" | "closed" | "wink";
type Mouth = "smile" | "grin" | "soft" | "o" | "flat";
interface FaceOpts {
  cy?: number; dx?: number; eyeR?: number;
  eyes?: Eyes; mouth?: Mouth;
  blush?: boolean; blushColor?: string;
  brow?: string; browLift?: number;
  mouthColor?: string;
}
const EYE_DARK = "#33271d";
// The heart of the restyle: big friendly eyes + catchlights, soft blush,
// a tidy mouth. Expression is fully parameterised so each cast member reads
// distinct while sharing one anatomy.
function face(ctx: Ctx, opts: FaceOpts = {}) {
  const {
    cy = -2, dx = 6.2, eyeR = 3.2, eyes = "open", mouth = "smile",
    blush = true, blushColor = "rgba(255,138,120,0.34)",
    brow, browLift = 0, mouthColor = "#7c3c22",
  } = opts;

  // Cheek blush first so eyes sit on top.
  if (blush) {
    ctx.fillStyle = blushColor;
    ctx.beginPath(); ctx.ellipse(-dx - 2.6, cy + 4.6, 3.3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(dx + 2.6, cy + 4.6, 3.3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  }

  const xs = [-dx, dx];
  if (eyes === "open" || eyes === "wink") {
    xs.forEach((x, i) => {
      const winked = eyes === "wink" && i === 1;
      if (winked) {
        ctx.strokeStyle = EYE_DARK; ctx.lineWidth = 1.9; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(x - 2.6, cy + 0.4); ctx.quadraticCurveTo(x, cy - 2.6, x + 2.6, cy + 0.4); ctx.stroke();
        return;
      }
      ctx.fillStyle = EYE_DARK;
      ctx.beginPath(); ctx.ellipse(x, cy, eyeR * 0.8, eyeR, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath(); ctx.arc(x - 1, cy - 1.4, eyeR * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath(); ctx.arc(x + 1.1, cy + 1.3, eyeR * 0.22, 0, Math.PI * 2); ctx.fill();
    });
  } else if (eyes === "happy") {
    ctx.strokeStyle = EYE_DARK; ctx.lineWidth = 2; ctx.lineCap = "round";
    xs.forEach((x) => {
      ctx.beginPath(); ctx.moveTo(x - 2.8, cy + 1.2); ctx.quadraticCurveTo(x, cy - 2.8, x + 2.8, cy + 1.2); ctx.stroke();
    });
  } else { // closed / serene
    ctx.strokeStyle = EYE_DARK; ctx.lineWidth = 1.8; ctx.lineCap = "round";
    xs.forEach((x) => {
      ctx.beginPath(); ctx.moveTo(x - 2.6, cy - 0.6); ctx.quadraticCurveTo(x, cy + 2, x + 2.6, cy - 0.6); ctx.stroke();
    });
  }

  if (brow) {
    ctx.strokeStyle = brow; ctx.lineWidth = 1.7; ctx.lineCap = "round";
    const by = cy - eyeR - 2.4 - browLift;
    ctx.beginPath(); ctx.moveTo(-dx - 2.6, by + 0.6); ctx.quadraticCurveTo(-dx, by - 1.1, -dx + 2.4, by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(dx - 2.4, by); ctx.quadraticCurveTo(dx, by - 1.1, dx + 2.6, by + 0.6); ctx.stroke();
  }

  ctx.strokeStyle = mouthColor; ctx.fillStyle = mouthColor;
  ctx.lineWidth = 1.7; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const my = cy + eyeR + 4;
  if (mouth === "smile") {
    ctx.beginPath(); ctx.moveTo(-3.2, my); ctx.quadraticCurveTo(0, my + 2.8, 3.2, my); ctx.stroke();
  } else if (mouth === "grin") {
    ctx.beginPath();
    ctx.moveTo(-4.2, my - 0.6);
    ctx.quadraticCurveTo(0, my + 3.6, 4.2, my - 0.6);
    ctx.quadraticCurveTo(0, my + 1.1, -4.2, my - 0.6);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)"; // tooth gleam
    ctx.beginPath(); ctx.moveTo(-3, my - 0.4); ctx.quadraticCurveTo(0, my + 0.8, 3, my - 0.4);
    ctx.quadraticCurveTo(0, my - 0.1, -3, my - 0.4); ctx.closePath(); ctx.fill();
  } else if (mouth === "soft") {
    ctx.beginPath(); ctx.moveTo(-2.3, my); ctx.quadraticCurveTo(0, my + 1.6, 2.3, my); ctx.stroke();
  } else if (mouth === "o") {
    ctx.beginPath(); ctx.ellipse(0, my, 1.8, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.beginPath(); ctx.moveTo(-2.6, my); ctx.lineTo(2.6, my); ctx.stroke();
  }
}

// Glowing creature eyes for the bosses (halo + socket + lit orb + core).
interface GlowOpts { dx?: number; cy?: number; r?: number; color?: string; glow?: string }
function glowEyes(ctx: Ctx, opts: GlowOpts = {}) {
  const { dx = 6, cy = -4, r = 3, color = "#ffd34a", glow = "rgba(255,205,70,0.30)" } = opts;
  const xs = [-dx, dx];
  ctx.fillStyle = glow;
  xs.forEach((x) => { ctx.beginPath(); ctx.arc(x, cy, r * 2, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  xs.forEach((x) => { ctx.beginPath(); ctx.ellipse(x, cy, r + 1, r + 1.4, 0, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = color;
  xs.forEach((x) => { ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  xs.forEach((x) => { ctx.beginPath(); ctx.arc(x - 0.7, cy - 0.9, r * 0.4, 0, Math.PI * 2); ctx.fill(); });
}

// ── NPCs ──────────────────────────────────────────────────────────────────

function drawMiraV2(ctx: Ctx) {
  // Mira — warm baker. Auburn bun, flour-dusted, beaming.
  badgeFill(ctx, "#ffe2bf", "#f0a85e");
  clipIn(ctx);
  // back hair
  ctx.fillStyle = "#864718";
  ctx.beginPath(); ctx.ellipse(0, -3, 17, 17.5, 0, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-13, 2, 4.5, 8, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(13, 2, 4.5, 8, -0.2, 0, Math.PI * 2); ctx.fill();
  body(ctx, "#e07f37", "#9c4f17", "#fff0d8");
  // apron straps
  ctx.fillStyle = "#fff4df";
  ctx.fillRect(-7.5, 11, 2.6, 22);
  ctx.fillRect(4.9, 11, 2.6, 22);
  head(ctx, SKIN.warm);
  // fringe
  ctx.fillStyle = "#9a531c";
  ctx.beginPath();
  ctx.moveTo(-15, -10);
  ctx.quadraticCurveTo(-12, -20, 0, -20.5);
  ctx.quadraticCurveTo(12, -20, 15, -10);
  ctx.quadraticCurveTo(9, -15, 4, -13);
  ctx.quadraticCurveTo(0, -16, -4, -13);
  ctx.quadraticCurveTo(-9, -15, -15, -10);
  ctx.closePath(); ctx.fill();
  // bun
  ctx.fillStyle = "#925018";
  ctx.beginPath(); ctx.arc(0, -21, 6.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#5e3210"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "#d98a3c";
  ctx.beginPath(); ctx.arc(0, -15, 2, 0, Math.PI * 2); ctx.fill(); // hair tie
  face(ctx, { eyes: "open", mouth: "grin", brow: "#7a4216" });
  // flour smudges
  ctx.fillStyle = "rgba(255,252,240,0.9)";
  ctx.beginPath(); ctx.arc(-8, 3, 1.7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-10, 0.6, 1.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(7, -12, 1.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  rim(ctx, "#8a3d12");
}

function drawTomasV2(ctx: Ctx) {
  // Old Tomas — kindly beekeeper. White beard, straw hat, smiling eyes.
  badgeFill(ctx, "#ffeec0", "#d9a441");
  clipIn(ctx);
  body(ctx, "#9c7a3e", "#5e4318", "#cbb072");
  head(ctx, SKIN.tan, { cy: -3 });
  // big fluffy white beard
  ctx.fillStyle = "#fbf6ea";
  ctx.beginPath();
  ctx.moveTo(-12, -3);
  ctx.quadraticCurveTo(-15, 12, 0, 15);
  ctx.quadraticCurveTo(15, 12, 12, -3);
  ctx.quadraticCurveTo(8, 3, 0, 3);
  ctx.quadraticCurveTo(-8, 3, -12, -3);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#cdbfa3"; ctx.lineWidth = 1.1; ctx.stroke();
  face(ctx, { cy: -4, eyes: "happy", mouth: "soft", brow: "#efe7d6", browLift: 1, blush: true, blushColor: "rgba(228,138,96,0.32)" });
  // bushy mustache over the soft mouth
  ctx.fillStyle = "#f3ecdc";
  ctx.beginPath(); ctx.ellipse(0, 1.5, 6.5, 2.4, 0, 0, Math.PI * 2); ctx.fill();
  // straw hat
  ctx.fillStyle = "#e9c46a";
  ctx.beginPath(); ctx.ellipse(0, -17, 21, 5.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#a9781f"; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.fillStyle = "#e0b85a";
  ctx.beginPath(); ctx.ellipse(0, -20, 11, 7.5, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = "#a9781f"; ctx.stroke();
  ctx.fillStyle = "#7c5314"; ctx.fillRect(-11, -18.5, 22, 2.2); // band
  // tiny bee
  ctx.fillStyle = "#3a2a08";
  ctx.beginPath(); ctx.ellipse(12, -22, 2, 1.5, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f6cf3e"; ctx.fillRect(11.2, -22.8, 1.6, 1.6);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath(); ctx.ellipse(11, -23.6, 1.2, 0.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  rim(ctx, "#7c5314");
}

function drawBramV2(ctx: Ctx) {
  // Bram — sturdy smith. Big dark beard, strong brows, soot, leather apron.
  badgeFill(ctx, "#c3ccd2", "#7c8a93");
  clipIn(ctx);
  body(ctx, "#5f6d77", "#333d44");
  // leather apron panel
  ctx.fillStyle = "#5a3a20";
  ctx.beginPath();
  ctx.moveTo(-11, 10); ctx.lineTo(-13, 33); ctx.lineTo(13, 33); ctx.lineTo(11, 10);
  ctx.quadraticCurveTo(0, 14, -11, 10); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#341f10"; ctx.lineWidth = 1.3; ctx.stroke();
  head(ctx, SKIN.deep, { cy: -5 });
  // short hair cap
  ctx.fillStyle = "#3a2616";
  ctx.beginPath();
  ctx.moveTo(-15, -8);
  ctx.quadraticCurveTo(-13, -21, 0, -21.5);
  ctx.quadraticCurveTo(13, -21, 15, -8);
  ctx.quadraticCurveTo(8, -16, 0, -15.5);
  ctx.quadraticCurveTo(-8, -16, -15, -8);
  ctx.closePath(); ctx.fill();
  // big dark beard
  ctx.fillStyle = "#3a2616";
  ctx.beginPath();
  ctx.moveTo(-13, -5);
  ctx.quadraticCurveTo(-15, 13, 0, 16);
  ctx.quadraticCurveTo(15, 13, 13, -5);
  ctx.quadraticCurveTo(8, 2, 0, 2);
  ctx.quadraticCurveTo(-8, 2, -13, -5);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#241408"; ctx.lineWidth = 1.1; ctx.stroke();
  face(ctx, { cy: -5, eyes: "open", mouth: "soft", brow: "#2c1c0e", browLift: 0.5, blush: false });
  // mustache strip
  ctx.fillStyle = "#3a2616";
  ctx.beginPath(); ctx.ellipse(0, -0.4, 6.5, 2.1, 0, 0, Math.PI * 2); ctx.fill();
  // soot smudge
  ctx.fillStyle = "rgba(60,52,46,0.5)";
  ctx.beginPath(); ctx.ellipse(6, -9, 3, 1.4, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  rim(ctx, "#28313a");
}

function drawLissV2(ctx: Ctx) {
  // Sister Liss — serene physician. Rose wimple, calm closed eyes, cross.
  badgeFill(ctx, "#f3d3e0", "#bd6b8e");
  clipIn(ctx);
  body(ctx, "#9c4368", "#5f2540");
  // hood/wimple behind & around head
  ctx.fillStyle = "#b25a7e";
  ctx.beginPath();
  ctx.moveTo(-19, 14);
  ctx.quadraticCurveTo(-22, -16, 0, -22);
  ctx.quadraticCurveTo(22, -16, 19, 14);
  ctx.quadraticCurveTo(9, 6, 0, 6);
  ctx.quadraticCurveTo(-9, 6, -19, 14);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5f2540"; ctx.lineWidth = 1.5; ctx.stroke();
  // white coif framing the face
  ctx.fillStyle = "#fdf6ec";
  ctx.beginPath();
  ctx.moveTo(-12.5, -4);
  ctx.quadraticCurveTo(-13, -19, 0, -19.5);
  ctx.quadraticCurveTo(13, -19, 12.5, -4);
  ctx.quadraticCurveTo(11, -8, 9, -8);
  ctx.quadraticCurveTo(8, -17, 0, -17);
  ctx.quadraticCurveTo(-8, -17, -9, -8);
  ctx.quadraticCurveTo(-11, -8, -12.5, -4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#d9cdb8"; ctx.lineWidth = 1; ctx.stroke();
  head(ctx, SKIN.light, { cy: -3 });
  face(ctx, { cy: -2, eyes: "closed", mouth: "soft", blush: true, blushColor: "rgba(214,108,140,0.3)" });
  // cross pendant
  ctx.fillStyle = "#fbf1da";
  ctx.fillRect(-1.3, 13, 2.6, 9);
  ctx.fillRect(-3.6, 16, 7.2, 2.6);
  ctx.strokeStyle = "#a9781f"; ctx.lineWidth = 0.7;
  ctx.strokeRect(-1.3, 13, 2.6, 9); ctx.strokeRect(-3.6, 16, 7.2, 2.6);
  ctx.restore();
  rim(ctx, "#5a2540");
}

function drawWrenV2(ctx: Ctx) {
  // Wren — eager scout. Green hood, auburn fringe, freckles, grin.
  badgeFill(ctx, "#d7e7bf", "#79a557");
  clipIn(ctx);
  body(ctx, "#557f3f", "#2d4a1c");
  // hood
  ctx.fillStyle = "#436831";
  ctx.beginPath();
  ctx.moveTo(-20, 12);
  ctx.quadraticCurveTo(-21, -18, 0, -23);
  ctx.quadraticCurveTo(21, -18, 20, 12);
  ctx.quadraticCurveTo(9, 4, 0, 4);
  ctx.quadraticCurveTo(-9, 4, -20, 12);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#243f16"; ctx.lineWidth = 1.5; ctx.stroke();
  head(ctx, SKIN.warm, { cy: -3 });
  // auburn fringe peeking from hood
  ctx.fillStyle = "#a8521f";
  ctx.beginPath();
  ctx.moveTo(-13, -9);
  ctx.quadraticCurveTo(-10, -17, 0, -17.5);
  ctx.quadraticCurveTo(10, -17, 13, -9);
  ctx.quadraticCurveTo(7, -13, 2, -11.5);
  ctx.quadraticCurveTo(0, -14, -3, -11.5);
  ctx.quadraticCurveTo(-8, -13, -13, -9);
  ctx.closePath(); ctx.fill();
  face(ctx, { cy: -2, eyes: "open", mouth: "grin", brow: "#7a3a16" });
  // freckles
  ctx.fillStyle = "rgba(150,86,38,0.7)";
  ([[-5, 1], [-3, 2], [3, 2], [5, 1]] as [number, number][]).forEach(([x, y]) => {
    ctx.beginPath(); ctx.arc(x, y, 0.7, 0, Math.PI * 2); ctx.fill();
  });
  // little leaf sprig on hood
  ctx.fillStyle = "#7fae4a";
  ctx.beginPath(); ctx.ellipse(11.5, -14, 3.2, 1.6, -0.7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3f6322"; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(10, -12.5); ctx.lineTo(13, -15.5); ctx.stroke();
  ctx.restore();
  rim(ctx, "#244a1c");
}

// ── Workers (generic professions, distinct from the named NPCs) ───────────

function drawWorkerFarmerV2(ctx: Ctx) {
  // Farm-hand — wide straw hat, sun-freckled, easy smile.
  badgeFill(ctx, "#d9ecbd", "#7fb14d");
  clipIn(ctx);
  body(ctx, "#7a9a44", "#3f5e20", "#b9cd7e");
  head(ctx, SKIN.tan, { cy: -2 });
  face(ctx, { cy: -1, eyes: "open", mouth: "smile", brow: "#8a5a2a" });
  // sun freckles
  ctx.fillStyle = "rgba(150,90,40,0.45)";
  ([[-4, 2], [4, 2], [0, 3]] as [number, number][]).forEach(([x, y]) => {
    ctx.beginPath(); ctx.arc(x, y, 0.5, 0, Math.PI * 2); ctx.fill();
  });
  // wide straw hat
  ctx.fillStyle = "#ecc568";
  ctx.beginPath(); ctx.ellipse(0, -14, 23, 5.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#a9781f"; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = "#dcb154";
  ctx.beginPath(); ctx.ellipse(0, -17, 10.5, 7, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = "#a9781f"; ctx.stroke();
  ctx.fillStyle = "#5e4a1c"; ctx.fillRect(-10.5, -15.6, 21, 2); // band
  // straw weave hints
  ctx.strokeStyle = "rgba(120,84,20,0.4)"; ctx.lineWidth = 0.6;
  for (let i = -18; i <= 18; i += 5) {
    ctx.beginPath(); ctx.moveTo(i, -13.5); ctx.lineTo(i + 1.4, -11.5); ctx.stroke();
  }
  // wheat sprig at collar
  ctx.strokeStyle = "#c9982f"; ctx.lineWidth = 1.2; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(13, 18); ctx.lineTo(16, 9); ctx.stroke();
  ctx.fillStyle = "#e6c252";
  ([[15.2, 11], [16.2, 13], [14.6, 14]] as [number, number][]).forEach(([x, y]) => {
    ctx.beginPath(); ctx.ellipse(x, y, 1.4, 0.9, -0.6, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
  rim(ctx, "#2c5a18");
}

function drawWorkerLumberjackV2(ctx: Ctx) {
  // Logger — knit beanie, big beard, red plaid, axe over shoulder.
  badgeFill(ctx, "#eccaa6", "#b06a38");
  clipIn(ctx);
  // axe behind shoulder
  ctx.strokeStyle = "#6a4420"; ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(20, 26); ctx.lineTo(15, 2); ctx.stroke();
  ctx.fillStyle = "#9aa3ad";
  ctx.beginPath();
  ctx.moveTo(15, 2); ctx.quadraticCurveTo(21, -3, 24, 3);
  ctx.quadraticCurveTo(20, 6, 15, 6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#33424a"; ctx.lineWidth = 1.2; ctx.stroke();
  // plaid body
  body(ctx, "#aa3a22", "#3f0e06");
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-21, 33); ctx.lineTo(-19, 19);
  ctx.quadraticCurveTo(-15, 9.5, 0, 9.5);
  ctx.quadraticCurveTo(15, 9.5, 19, 19);
  ctx.lineTo(21, 33); ctx.closePath(); ctx.clip();
  ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1.1;
  [-14, -6, 2, 10, 18].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, 9); ctx.lineTo(x, 33); ctx.stroke(); });
  [14, 20, 26, 32].forEach((y) => { ctx.beginPath(); ctx.moveTo(-22, y); ctx.lineTo(22, y); ctx.stroke(); });
  ctx.strokeStyle = "rgba(255,210,190,0.32)"; ctx.lineWidth = 0.7;
  [-10, -2, 6, 14].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, 9); ctx.lineTo(x, 33); ctx.stroke(); });
  ctx.restore();
  head(ctx, SKIN.tan, { cy: -3 });
  // big beard
  ctx.fillStyle = "#5a3a1e";
  ctx.beginPath();
  ctx.moveTo(-12.5, -3);
  ctx.quadraticCurveTo(-15, 13, 0, 16);
  ctx.quadraticCurveTo(15, 13, 12.5, -3);
  ctx.quadraticCurveTo(8, 3, 0, 3);
  ctx.quadraticCurveTo(-8, 3, -12.5, -3);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 1.1; ctx.stroke();
  face(ctx, { cy: -4, eyes: "open", mouth: "soft", brow: "#4a2e14", blush: false });
  ctx.fillStyle = "#5a3a1e"; // mustache
  ctx.beginPath(); ctx.ellipse(0, 0.4, 6, 2, 0, 0, Math.PI * 2); ctx.fill();
  // knit beanie
  ctx.fillStyle = "#c14a2c";
  ctx.beginPath(); ctx.ellipse(0, -15, 15.5, 10.5, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = "#6a2210"; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.fillStyle = "#d96a44"; ctx.fillRect(-15.5, -12, 31, 3.4); // cuff
  ctx.strokeStyle = "#6a2210"; ctx.lineWidth = 0.8; ctx.strokeRect(-15.5, -12, 31, 3.4);
  ctx.fillStyle = "#e7d2bd"; // pom
  ctx.beginPath(); ctx.arc(0, -25.5, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  rim(ctx, "#5a2c12");
}

function drawWorkerMinerV2(ctx: Ctx) {
  // Miner — helmet lamp, sooty cheeks, leather vest, pickaxe.
  badgeFill(ctx, "#cdd4dd", "#727d8a");
  clipIn(ctx);
  // pickaxe behind shoulder
  ctx.strokeStyle = "#5a3a18"; ctx.lineWidth = 2.8; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-16, 24); ctx.lineTo(15, -2); ctx.stroke();
  ctx.fillStyle = "#5f6a76";
  ctx.beginPath();
  ctx.moveTo(15, -2); ctx.quadraticCurveTo(24, -4, 24, 3);
  ctx.lineTo(20, 2); ctx.quadraticCurveTo(20, -1, 15, 1); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(15, -2); ctx.quadraticCurveTo(6, -4, 6, 3);
  ctx.lineTo(10, 2); ctx.quadraticCurveTo(10, -1, 15, 1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#272f38"; ctx.lineWidth = 1.1; ctx.stroke();
  // leather vest
  body(ctx, "#5e4a32", "#2a1c0c");
  ctx.fillStyle = "#7d6646";
  ctx.beginPath();
  ctx.moveTo(-5, 10); ctx.lineTo(5, 10); ctx.lineTo(6, 33); ctx.lineTo(-6, 33); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#2a1c0c"; ctx.lineWidth = 1.1; ctx.stroke();
  ctx.fillStyle = "#33240f";
  [16, 23, 29].forEach((y) => { ctx.beginPath(); ctx.arc(0, y, 1.2, 0, Math.PI * 2); ctx.fill(); });
  head(ctx, SKIN.tan, { cy: -2 });
  face(ctx, { cy: -1, eyes: "open", mouth: "smile", brow: "#3a240e", blush: false });
  // soot smudges
  ctx.fillStyle = "rgba(58,50,44,0.5)";
  ctx.beginPath(); ctx.ellipse(-6, 2, 2.4, 1.2, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6, 1, 1.9, 1, -0.2, 0, Math.PI * 2); ctx.fill();
  // helmet
  ctx.fillStyle = "#7a4a1c";
  ctx.beginPath(); ctx.ellipse(0, -13, 15, 10, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = "#3a1e0a"; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = "#5a3408";
  ctx.beginPath(); ctx.ellipse(0, -8, 16.5, 3.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#caa23a"; ctx.fillRect(-15, -10, 30, 1.6); // brass band
  // lamp + glow
  ctx.fillStyle = "rgba(255,210,110,0.4)";
  ctx.beginPath(); ctx.arc(0, -14, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3a3038";
  rrect(ctx, -3.2, -18.5, 6.4, 6.4, 1.4); ctx.fill();
  ctx.strokeStyle = "#1a1c20"; ctx.lineWidth = 1.1; ctx.stroke();
  ctx.fillStyle = "#fff2a0"; ctx.fillRect(-2, -17.2, 4, 4);
  ctx.fillStyle = "#fff"; ctx.fillRect(-0.6, -16.6, 1.2, 1.2);
  ctx.restore();
  rim(ctx, "#353d47");
}

function drawWorkerBakerV2(ctx: Ctx) {
  // Baker — tall toque, neckerchief, flour-dusted apron, cheerful.
  badgeFill(ctx, "#fbe7c2", "#cf9d63");
  clipIn(ctx);
  body(ctx, "#f3e6cf", "#a98a58");
  // neckerchief
  ctx.fillStyle = "#c0492f";
  ctx.beginPath(); ctx.moveTo(-9, 10); ctx.quadraticCurveTo(0, 18, 9, 10);
  ctx.quadraticCurveTo(0, 14, -9, 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#a8371f";
  ctx.beginPath(); ctx.moveTo(-2, 13); ctx.lineTo(2, 13); ctx.lineTo(1, 20); ctx.lineTo(-1, 20); ctx.closePath(); ctx.fill();
  // apron + flour
  ctx.fillStyle = "#fbf3e2";
  ctx.beginPath(); ctx.moveTo(-9, 16); ctx.lineTo(-12, 33); ctx.lineTo(12, 33); ctx.lineTo(9, 16);
  ctx.quadraticCurveTo(0, 19, -9, 16); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#cbb38a"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ([[-5, 23, 1.8], [4, 26, 1.5], [-2, 29, 1.3]] as [number, number, number][]).forEach(([x, y, r]) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  });
  head(ctx, SKIN.warm, { cy: -2 });
  face(ctx, { cy: -1, eyes: "open", mouth: "grin", brow: "#7a4a24" });
  // flour dab on cheek
  ctx.fillStyle = "rgba(255,252,244,0.85)";
  ctx.beginPath(); ctx.arc(7, 0, 1.4, 0, Math.PI * 2); ctx.fill();
  // tall toque
  ctx.fillStyle = "#fdf8ec";
  ctx.beginPath(); ctx.ellipse(0, -13, 11.5, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#cbb38a"; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.fillStyle = "#fdf8ec";
  ctx.beginPath(); ctx.arc(-7.5, -19, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(7.5, -19, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -23.5, 7.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#cbb38a"; ctx.lineWidth = 1.2;
  [[-7.5, -19, 6.5], [7.5, -19, 6.5], [0, -23.5, 7.5]].forEach(([x, y, r]) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  });
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath(); ctx.arc(-2, -25, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  rim(ctx, "#7c5a2e");
}

// ── Bosses (cute-menacing chibi monsters) ─────────────────────────────────

function drawFrostmawV2(ctx: Ctx) {
  // Frostmaw — icy titan. Crystal crown, glowing cyan eyes, little fangs.
  badgeFill(ctx, "#d6ecfb", "#4f8fcf");
  clipIn(ctx);
  body(ctx, "#5d92cc", "#244e80");
  // icy head
  const g = ctx.createRadialGradient(-6, -11, 3, 0, -4, 22);
  g.addColorStop(0, "#eef8ff"); g.addColorStop(0.55, "#9cc4e8"); g.addColorStop(1, "#3f6fa8");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, -4, 16, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#27548a"; ctx.lineWidth = 1.4; ctx.stroke();
  // crystal crown
  ctx.fillStyle = "#e2f2ff"; ctx.strokeStyle = "#6aa0d4"; ctx.lineWidth = 1;
  ([[-9, -16, -11, -25], [0, -18, 0, -28], [9, -16, 11, -25], [-4.5, -17, -5, -26], [4.5, -17, 5, -26]] as [number, number, number, number][])
    .forEach(([bx, by, tx, ty]) => {
      ctx.beginPath(); ctx.moveTo(bx - 2.4, by); ctx.lineTo(bx + 2.4, by); ctx.lineTo(tx, ty); ctx.closePath();
      ctx.fill(); ctx.stroke();
    });
  glowEyes(ctx, { cy: -5, dx: 6, r: 3, color: "#66e7ff", glow: "rgba(120,230,255,0.34)" });
  // frosty cheeks
  ctx.fillStyle = "rgba(180,230,255,0.5)";
  ctx.beginPath(); ctx.ellipse(-9, 1, 3, 1.9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(9, 1, 3, 1.9, 0, 0, Math.PI * 2); ctx.fill();
  // little smile with fangs
  ctx.strokeStyle = "#1f3f66"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-4, 5); ctx.quadraticCurveTo(0, 8, 4, 5); ctx.stroke();
  ctx.fillStyle = "#f2faff";
  ([[-2.4, 5.4], [2.4, 5.4]] as [number, number][]).forEach(([x, y]) => {
    ctx.beginPath(); ctx.moveTo(x - 1.1, y); ctx.lineTo(x + 1.1, y); ctx.lineTo(x, y + 2.6); ctx.closePath(); ctx.fill();
  });
  ctx.restore();
  rim(ctx, "#1c3f6a");
}

function drawQuagmireV2(ctx: Ctx) {
  // Quagmire — bog spirit. Mossy head, vine tufts, amber eyes, mushroom.
  badgeFill(ctx, "#cfe0a0", "#6f9a36");
  clipIn(ctx);
  body(ctx, "#3f5e1e", "#1f3208");
  const g = ctx.createRadialGradient(-6, -10, 3, 0, -3, 22);
  g.addColorStop(0, "#8fc24a"); g.addColorStop(0.6, "#4f7d22"); g.addColorStop(1, "#26430e");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, -3, 16.5, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#1c3208"; ctx.lineWidth = 1.4; ctx.stroke();
  // vine tendrils
  ctx.strokeStyle = "#5f8a28"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
  ([[-10, -13, -16, -20], [-3, -16, -5, -25], [4, -16, 6, -25], [10, -13, 16, -20]] as [number, number, number, number][])
    .forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(x1 + 4, (y1 + y2) / 2, x2, y2); ctx.stroke();
    });
  // mushroom tuft
  ctx.fillStyle = "#cf3a22";
  ctx.beginPath(); ctx.ellipse(-11, -11, 4.2, 2.6, -0.2, Math.PI, 0); ctx.fill();
  ctx.fillStyle = "#fbf3e2";
  ctx.beginPath(); ctx.arc(-12, -12, 0.7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-10, -12.5, 0.6, 0, Math.PI * 2); ctx.fill();
  glowEyes(ctx, { cy: -4, dx: 6, r: 3, color: "#f6c83a", glow: "rgba(246,200,58,0.32)" });
  // soft toothy smile
  ctx.strokeStyle = "#16280a"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-4.5, 5); ctx.quadraticCurveTo(0, 8.6, 4.5, 5); ctx.stroke();
  ctx.fillStyle = "#d7e7a0";
  ([[-2.2, 6], [2.2, 6]] as [number, number][]).forEach(([x, y]) => {
    ctx.beginPath(); ctx.moveTo(x - 1, y - 0.6); ctx.lineTo(x + 1, y - 0.6); ctx.lineTo(x, y + 1.8); ctx.closePath(); ctx.fill();
  });
  ctx.restore();
  rim(ctx, "#274310");
}

function drawEmberDrakeV2(ctx: Ctx) {
  // Ember Drake — wee dragon. Horns, snout, glowing eyes, a flicker of flame.
  badgeFill(ctx, "#fcd9c2", "#c8501f");
  clipIn(ctx);
  body(ctx, "#7c1f0c", "#3c0c06");
  const g = ctx.createRadialGradient(-6, -10, 3, 0, -2, 23);
  g.addColorStop(0, "#f8a93a"); g.addColorStop(0.5, "#d6491c"); g.addColorStop(1, "#5e120a");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, -3, 16.5, 15.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#4a0e06"; ctx.lineWidth = 1.4; ctx.stroke();
  // snout
  ctx.fillStyle = "#c8451a";
  ctx.beginPath(); ctx.ellipse(0, 6, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#4a0e06"; ctx.lineWidth = 1.1; ctx.stroke();
  ctx.fillStyle = "#3a0a04";
  ctx.beginPath(); ctx.arc(-3, 6, 0.9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, 6, 0.9, 0, Math.PI * 2); ctx.fill();
  // horns
  ctx.fillStyle = "#f0e2c4"; ctx.strokeStyle = "#b89a64"; ctx.lineWidth = 0.9;
  ([[-11, -12, -16, -20], [11, -12, 16, -20]] as [number, number, number, number][]).forEach(([bx, by, tx, ty]) => {
    ctx.beginPath(); ctx.moveTo(bx - 2.6, by); ctx.lineTo(bx + 2.6, by); ctx.quadraticCurveTo(tx, ty + 4, tx, ty); ctx.closePath();
    ctx.fill(); ctx.stroke();
  });
  glowEyes(ctx, { cy: -5, dx: 6, r: 2.8, color: "#ffe14a", glow: "rgba(255,210,70,0.3)" });
  // vertical slit pupils
  ctx.fillStyle = "#3a0a04";
  ctx.fillRect(-6.4, -6.4, 0.9, 2.8);
  ctx.fillRect(5.5, -6.4, 0.9, 2.8);
  // little flame above
  ctx.fillStyle = "#ffce3a";
  ctx.beginPath(); ctx.moveTo(9, 8); ctx.quadraticCurveTo(13, 4, 11, 0);
  ctx.quadraticCurveTo(15, 3, 14, 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#ff8a2a";
  ctx.beginPath(); ctx.moveTo(10.5, 8); ctx.quadraticCurveTo(12.5, 5, 11.5, 2.5);
  ctx.quadraticCurveTo(13.5, 5, 13, 8); ctx.closePath(); ctx.fill();
  ctx.restore();
  rim(ctx, "#6e1f0a");
}

function drawOldStonefaceV2(ctx: Ctx) {
  // Old Stoneface — gentle golem. Boxy stone head, cracks, moss, slit eyes.
  badgeFill(ctx, "#ddd6c8", "#7d7566");
  clipIn(ctx);
  body(ctx, "#7c7060", "#3f3528");
  const g = ctx.createLinearGradient(0, -19, 0, 11);
  g.addColorStop(0, "#b6ad99"); g.addColorStop(0.55, "#857a66"); g.addColorStop(1, "#4f4636");
  ctx.fillStyle = g;
  rrect(ctx, -15, -19, 30, 28, 7); ctx.fill();
  ctx.strokeStyle = "#322a1e"; ctx.lineWidth = 1.5; ctx.stroke();
  // cracks
  ctx.strokeStyle = "rgba(40,30,16,0.55)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-9, -19); ctx.lineTo(-7, -12); ctx.lineTo(-11, -6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(11, -14); ctx.lineTo(8, -8); ctx.lineTo(12, -2); ctx.stroke();
  // moss patches
  ctx.fillStyle = "#6f9a32";
  ([[-11, -18, 4.5, 2.6], [10, -17, 3.6, 2.2], [-3, 8, 4, 2]] as [number, number, number, number][]).forEach(([x, y, rx, ry]) => {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = "#f6cf3e";
  ctx.beginPath(); ctx.arc(-11, -18, 1.1, 0, Math.PI * 2); ctx.fill(); // tiny flower
  glowEyes(ctx, { cy: -5, dx: 6.5, r: 2.6, color: "#f6c552", glow: "rgba(246,197,82,0.3)" });
  // stone teeth smile
  ctx.fillStyle = "#cabfa8";
  rrect(ctx, -7, 2, 14, 4, 1.4); ctx.fill();
  ctx.strokeStyle = "#322a1e"; ctx.lineWidth = 0.8; ctx.stroke();
  for (let x = -3.5; x <= 3.5; x += 3.5) { ctx.beginPath(); ctx.moveTo(x, 2); ctx.lineTo(x, 6); ctx.stroke(); }
  ctx.restore();
  rim(ctx, "#3a3528");
}

function drawMossbackV2(ctx: Ctx) {
  // Mossback — gentlest boss. Mossy shell dome, soft watchful eyes, flowers.
  badgeFill(ctx, "#d8e8b4", "#5f8a2e");
  clipIn(ctx);
  body(ctx, "#5c7a26", "#2a3f0e");
  // head poking out
  const hg = ctx.createRadialGradient(-5, -2, 3, 0, 0, 18);
  hg.addColorStop(0, "#86a84a"); hg.addColorStop(0.6, "#577526"); hg.addColorStop(1, "#314410");
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.ellipse(0, 0, 14.5, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#27380c"; ctx.lineWidth = 1.4; ctx.stroke();
  // shell dome on top
  const sg = ctx.createRadialGradient(-5, -16, 3, 0, -10, 24);
  sg.addColorStop(0, "#b07334"); sg.addColorStop(0.6, "#6f4318"); sg.addColorStop(1, "#3a2208");
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.ellipse(0, -8, 18, 14, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = "#2c1c08"; ctx.lineWidth = 1.4; ctx.stroke();
  // shell hex hints
  ctx.strokeStyle = "rgba(245,210,150,0.5)"; ctx.lineWidth = 0.9;
  ([[-8, -13], [2, -16], [10, -12]] as [number, number][]).forEach(([cx, cy]) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2; const x = cx + Math.cos(a) * 3.4; const y = cy + Math.sin(a) * 3.4;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.stroke();
  });
  // moss + flowers on shell
  ctx.fillStyle = "#7fae4a";
  ([[-9, -14, 4, 2.4], [6, -16, 3.4, 2]] as [number, number, number, number][]).forEach(([x, y, rx, ry]) => {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = "#f6cf3e";
  ctx.beginPath(); ctx.arc(-9, -14, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#e98aa8";
  ctx.beginPath(); ctx.arc(6, -16, 1.2, 0, Math.PI * 2); ctx.fill();
  // gentle face
  face(ctx, { cy: -1, dx: 5.6, eyeR: 2.8, eyes: "open", mouth: "soft", blush: true, blushColor: "rgba(120,160,60,0.34)", mouthColor: "#27380c" });
  ctx.restore();
  rim(ctx, "#294510");
}

function drawStormV2(ctx: Ctx) {
  // The Storm — grumpy-cute squall. Charcoal cloud face, glow eyes, a bolt.
  badgeFill(ctx, "#aab8d2", "#36486c");
  clipIn(ctx);
  // sea hint at the bottom
  ctx.fillStyle = "#1d3a5e";
  ctx.beginPath();
  ctx.moveTo(-29, 18);
  ctx.quadraticCurveTo(-16, 13, -4, 18);
  ctx.quadraticCurveTo(10, 23, 29, 17);
  ctx.lineTo(29, 33); ctx.lineTo(-29, 33); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(210,228,248,0.7)";
  ([[-16, 16, 3.5], [4, 19, 3], [18, 16, 3]] as [number, number, number][]).forEach(([x, y, w]) => {
    ctx.beginPath(); ctx.ellipse(x, y, w, 1.3, 0, 0, Math.PI * 2); ctx.fill();
  });
  // lightning bolt (under the cloud)
  ctx.fillStyle = "#ffe46a";
  ctx.beginPath();
  ctx.moveTo(-1, 2); ctx.lineTo(5, 10); ctx.lineTo(1, 10); ctx.lineTo(6, 18);
  ctx.lineTo(-3, 9); ctx.lineTo(1, 9); ctx.closePath(); ctx.fill();
  // charcoal cloud head
  const g = ctx.createRadialGradient(-6, -12, 4, 0, -6, 26);
  g.addColorStop(0, "#6a7692"); g.addColorStop(0.6, "#384465"); g.addColorStop(1, "#1a2238");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-20, 2);
  ctx.quadraticCurveTo(-24, -12, -10, -15);
  ctx.quadraticCurveTo(-7, -24, 4, -19);
  ctx.quadraticCurveTo(16, -23, 19, -11);
  ctx.quadraticCurveTo(26, -9, 21, 0);
  ctx.quadraticCurveTo(24, 7, 14, 6);
  ctx.quadraticCurveTo(8, 11, 1, 6);
  ctx.quadraticCurveTo(-6, 11, -12, 5);
  ctx.quadraticCurveTo(-20, 8, -20, 2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#10182a"; ctx.lineWidth = 1.5; ctx.stroke();
  // highlight edge
  ctx.strokeStyle = "rgba(190,206,234,0.5)"; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(-16, -10); ctx.quadraticCurveTo(-6, -19, 4, -15); ctx.stroke();
  glowEyes(ctx, { cy: -7, dx: 6, r: 2.7, color: "#ffe27a", glow: "rgba(255,220,120,0.26)" });
  // grumpy brows
  ctx.strokeStyle = "#0e1626"; ctx.lineWidth = 1.8; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-9.5, -12); ctx.lineTo(-3.5, -10.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(9.5, -12); ctx.lineTo(3.5, -10.5); ctx.stroke();
  // small frown
  ctx.beginPath(); ctx.moveTo(-3.5, -1.5); ctx.quadraticCurveTo(0, -4, 3.5, -1.5); ctx.stroke();
  // rain
  ctx.fillStyle = "#8fb6da";
  ([[-13, 10], [-7, 13], [11, 12]] as [number, number][]).forEach(([x, y]) => {
    ctx.beginPath(); ctx.ellipse(x, y, 1, 1.9, 0, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
  rim(ctx, "#141d30");
}

// ── Registry ───────────────────────────────────────────────────────────────

export const ICONS = {
  // NPCs (v2)
  char_mira_v2:  { label: "Mira (v2)",        color: "#e0833a", draw: drawMiraV2 },
  char_tomas_v2: { label: "Old Tomas (v2)",   color: "#d9a441", draw: drawTomasV2 },
  char_bram_v2:  { label: "Bram (v2)",        color: "#6f7d88", draw: drawBramV2 },
  char_liss_v2:  { label: "Sister Liss (v2)", color: "#b5587f", draw: drawLissV2 },
  char_wren_v2:  { label: "Wren (v2)",        color: "#5a8a44", draw: drawWrenV2 },
  // Workers (v2)
  worker_farmer_v2:     { label: "Farmer (v2)",     color: "#7fb14d", draw: drawWorkerFarmerV2 },
  worker_lumberjack_v2: { label: "Lumberjack (v2)", color: "#b06a38", draw: drawWorkerLumberjackV2 },
  worker_miner_v2:      { label: "Miner (v2)",      color: "#7f8a96", draw: drawWorkerMinerV2 },
  worker_baker_v2:      { label: "Baker (v2)",      color: "#cf9d63", draw: drawWorkerBakerV2 },
  // Bosses (v2)
  boss_frostmaw_v2:      { label: "Frostmaw (v2)",      color: "#4f8fcf", draw: drawFrostmawV2 },
  boss_quagmire_v2:      { label: "Quagmire (v2)",      color: "#6f9a36", draw: drawQuagmireV2 },
  boss_ember_drake_v2:   { label: "Ember Drake (v2)",   color: "#c8501f", draw: drawEmberDrakeV2 },
  boss_old_stoneface_v2: { label: "Old Stoneface (v2)", color: "#7d7566", draw: drawOldStonefaceV2 },
  boss_mossback_v2:      { label: "Mossback (v2)",      color: "#5f8a2e", draw: drawMossbackV2 },
  boss_storm_v2:         { label: "The Storm (v2)",     color: "#36486c", draw: drawStormV2 },
};
