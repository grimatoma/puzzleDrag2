import Phaser from "phaser";
import { MAP_NODES, MAP_EDGES, REGIONS } from "./data.js";
import { drawIcon } from "../../textures/iconRegistry.js";
import { isAdjacent } from "./slice.js";

/* Phaser scene that renders the redesigned world map.
 *
 * Visual design (aligned with The Long Return / Hearthwood Vale):
 *   • Parchment + watercolor terrain (mountains NE, sea W, marsh S, forest C)
 *   • Each settled hearth burns a tiny ember; smoke columns rise from it
 *     (the story's central image — "as your smoke rises, sister settlements
 *     across the region see it from miles away").
 *   • Banked-but-discovered hearths show a slow dim pulse, waiting to be
 *     rekindled.
 *   • Hidden nodes show only a Hollow-Folk lantern-mark — a stack of three
 *     tally lines that fade in and out.
 *   • The Old Capital, when locked, shows three sealed token slots; when
 *     all three Hearth-Tokens are held, the seals break and a gold gleam
 *     pulses from inside.
 *   • Paths between visited nodes glow softly. Paths from a visited node
 *     to a discovered one show a small "march of light" — a lantern bead
 *     rolling along the line, suggesting the road is ready to be walked.
 *
 * The scene communicates with React via:
 *   registry: "carto.payload"  – React-provided snapshot to render from
 *   registry: "carto.tapped"   – the tapped node id (for highlight)
 *   events:   "carto.nodetap"  – emitted when a node is clicked
 */

// Internal aspect of the painted world. The scene letterboxes inside the
// host canvas to keep proportions stable.
const WORLD_W = 1000;
const WORLD_H = 620;

// Each node id maps to a hand-picked "feel" — drives the painted terrain
// tile under the medallion and the atmospherics tied to that node.
const NODE_TERRAIN = {
  home:       { kind: "valley",   palette: ["#e8c98a", "#caa66a"] },
  meadow:     { kind: "field",    palette: ["#bcc97a", "#94a85a"] },
  orchard:    { kind: "orchard",  palette: ["#a8c068", "#7a9c4a"] },
  crossroads: { kind: "wayside",  palette: ["#cfb27a", "#a78346"] },
  quarry:     { kind: "stone",    palette: ["#b8b8b6", "#8a8a8e"] },
  caves:      { kind: "stone",    palette: ["#7c7872", "#5a544e"] },
  fairground: { kind: "wayside",  palette: ["#d8b566", "#a87838"] },
  forge:      { kind: "mountain", palette: ["#6c5c4c", "#3a3030"] },
  pit:        { kind: "abyss",    palette: ["#4a2828", "#1c0e10"] },
  harbor:     { kind: "sea",      palette: ["#85b4c4", "#3a6a8c"] },
  oldcapital: { kind: "gilt",     palette: ["#e6cf66", "#8a6a18"] },
};

export class MapScene extends Phaser.Scene {
  constructor() {
    super("CartoMapScene");
    this.nodeViews = new Map();   // id → { container, label, ember, ... }
    this.edgeViews = [];          // [{ a,b,line,marcher,marchT,bounds:{} }]
    this._lastTapped = null;
    this._cloudPool = [];
    this._birdPool = [];
    this._t = 0;                  // global tick (seconds)
  }

  init() {
    // Reset bookkeeping in case the scene is restarted.
    this.nodeViews = new Map();
    this.edgeViews = [];
    this._lastTapped = null;
    this._cloudPool = [];
    this._birdPool = [];
    this._t = 0;
  }

  create() {
    this.cameras.main.setBackgroundColor("#3a2715");
    this.bakeNodeTextures();

    this.layers = {
      paper:        this.add.container(0, 0),
      regions:      this.add.container(0, 0),
      terrain:      this.add.container(0, 0),
      decor:        this.add.container(0, 0),
      paths:        this.add.container(0, 0),
      pathMarchers: this.add.container(0, 0),
      ambient:      this.add.container(0, 0),  // clouds, birds — *behind* nodes
      nodes:        this.add.container(0, 0),
      smoke:        this.add.container(0, 0),
      embers:       this.add.container(0, 0),  // foreground ember sparks
    };

    this.drawParchment();
    this.drawRegions();
    this.drawTerrain();
    this.drawDecor();
    this.drawCompassRose();

    this.buildEdgeViews();
    this.buildNodeViews();

    this.spawnInitialAmbient();
    this.input.on("gameobjectdown", (_pointer, obj) => {
      const id = obj.getData?.("nodeId");
      if (id) {
        this.events.emit("carto.nodetap", id);
      }
    });

    // React snapshot → repaint hook.
    this.registry.events.on("changedata-carto.payload", () => this.applyState());
    this.registry.events.on("changedata-carto.tapped",  () => this.applyTappedHighlight());
    this.applyState();

    this.scale.on("resize", () => this.relayout());
    this.relayout();
  }

  // ─── Setup helpers ──────────────────────────────────────────────────────

  bakeNodeTextures() {
    // Bake each map_<id> iconRegistry drawing into a Phaser texture so we
    // can place it as a sprite inside a node medallion.
    const size = 96;
    for (const node of MAP_NODES) {
      const key = `cartoIcon_${node.id}`;
      if (this.textures.exists(key)) continue;
      const tex = this.textures.createCanvas(key, size, size);
      const ctx = tex.getContext();
      ctx.imageSmoothingEnabled = true;
      ctx.save();
      ctx.translate(size / 2, size / 2);
      // iconRegistry draws assume a ~64px box around origin (0,0).
      const scale = size / 64;
      ctx.scale(scale, scale);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const ok = drawIcon(ctx, `map_${node.id}`);
      // If a node has no registered icon (e.g. fish harbor, old capital),
      // fall back to a hand-drawn medallion glyph.
      if (!ok) drawFallbackIcon(ctx, node);
      ctx.restore();
      tex.refresh();
    }

    // A soft radial gradient texture used for ember glows.
    if (!this.textures.exists("cartoEmberGlow")) {
      const g = 96;
      const tex = this.textures.createCanvas("cartoEmberGlow", g, g);
      const ctx = tex.getContext();
      const grd = ctx.createRadialGradient(g / 2, g / 2, 1, g / 2, g / 2, g / 2);
      grd.addColorStop(0,    "rgba(255,212,128,0.85)");
      grd.addColorStop(0.45, "rgba(232,150,60,0.45)");
      grd.addColorStop(1,    "rgba(232,150,60,0.0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, g, g);
      tex.refresh();
    }

    // Hollow Folk lantern-mark texture (3 stacked tally bars).
    if (!this.textures.exists("cartoLanternMark")) {
      const w = 24, h = 28;
      const tex = this.textures.createCanvas("cartoLanternMark", w, h);
      const ctx = tex.getContext();
      ctx.strokeStyle = "#3a2410";
      ctx.lineCap = "round";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.85;
      [6, 13, 20].forEach((y, i) => {
        ctx.beginPath();
        ctx.moveTo(4 - (i === 1 ? 1 : 0), y);
        ctx.lineTo(w - 4 + (i === 2 ? 1 : 0), y);
        ctx.stroke();
      });
      tex.refresh();
    }

    // Smoke puff — single radial blob, reused with low alpha to form columns.
    if (!this.textures.exists("cartoSmokePuff")) {
      const s = 48;
      const tex = this.textures.createCanvas("cartoSmokePuff", s, s);
      const ctx = tex.getContext();
      const grd = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grd.addColorStop(0,   "rgba(252,246,232,0.7)");
      grd.addColorStop(0.6, "rgba(220,212,196,0.35)");
      grd.addColorStop(1,   "rgba(180,168,148,0)");
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); ctx.fill();
      tex.refresh();
    }
  }

  drawParchment() {
    const g = this.add.graphics();
    g.fillStyle(0xe8c98a, 1);
    g.fillRect(0, 0, WORLD_W, WORLD_H);
    // Outer vignette
    const vignette = this.add.graphics();
    vignette.fillStyle(0xa78346, 0.30);
    vignette.fillRect(0, 0, WORLD_W, WORLD_H);
    vignette.fillStyle(0xe8c98a, 1);
    vignette.fillEllipse(WORLD_W / 2, WORLD_H / 2, WORLD_W * 1.05, WORLD_H * 1.1);
    vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);

    // Parchment "stains" — irregular soft blobs to break up the flat fill.
    const stains = this.add.graphics();
    stains.fillStyle(0xa78346, 0.10);
    const rng = mulberry32(0x6e6e);
    for (let i = 0; i < 24; i++) {
      const x = rng() * WORLD_W;
      const y = rng() * WORLD_H;
      const r = 18 + rng() * 60;
      stains.fillEllipse(x, y, r * 2, r * 1.3);
    }

    // Hand-drawn dashed border.
    const border = this.add.graphics();
    border.lineStyle(2, 0x7a5528, 0.85);
    drawDashedRect(border, 12, 12, WORLD_W - 24, WORLD_H - 24, 10, 6);
    border.lineStyle(1, 0x7a5528, 0.5);
    drawDashedRect(border, 22, 22, WORLD_W - 44, WORLD_H - 44, 4, 4);

    this.layers.paper.add([g, vignette, stains, border]);

    // Cartographer's title.
    const title = this.add
      .text(WORLD_W / 2, 36, "The Hearthwood", {
        fontFamily: "'Newsreader', 'Times New Roman', serif",
        fontSize: "28px",
        color: "#3a2715",
        fontStyle: "italic",
      })
      .setOrigin(0.5)
      .setAlpha(0.78);

    const subtitle = this.add
      .text(
        WORLD_W / 2,
        64,
        "A map of returning smoke · drawn anew by the line of the line",
        {
          fontFamily: "'Newsreader', 'Times New Roman', serif",
          fontSize: "13px",
          color: "#5a3a20",
          fontStyle: "italic",
        }
      )
      .setOrigin(0.5)
      .setAlpha(0.66)
      .setLetterSpacing(2);

    this.layers.paper.add([title, subtitle]);
  }

  drawRegions() {
    for (const r of REGIONS) {
      const cx = (r.cx / 100) * WORLD_W;
      const cy = (r.cy / 100) * WORLD_H;
      const rx = (r.rx / 100) * WORLD_W;
      const ry = (r.ry / 100) * WORLD_H;
      const g = this.add.graphics();
      g.fillStyle(toInt(r.fill), 0.32);
      g.fillEllipse(cx, cy, rx * 2, ry * 2);
      // A subtle darker ring around the lobe — gives a watercolor edge.
      g.lineStyle(3, toInt(r.fill), 0.55);
      g.strokeEllipse(cx, cy, rx * 2 - 4, ry * 2 - 4);
      this.layers.regions.add(g);

      const label = this.add
        .text(cx, cy - ry + 14, r.label.toUpperCase(), {
          fontFamily: "'Newsreader', 'Times New Roman', serif",
          fontSize: "13px",
          color: "#5a3a20",
          fontStyle: "italic",
        })
        .setOrigin(0.5)
        .setAlpha(0.55)
        .setLetterSpacing(3);
      this.layers.regions.add(label);
    }
  }

  drawTerrain() {
    // Hand-drawn watercolor terrain that matches the story's geography:
    // mountains NE/E (Stoneholds), open sea W (Saltspray), forested wilds in
    // the centre, and a marsh-fringed coast S.
    const g = this.add.graphics();

    // Sea (west / south-west)
    g.fillStyle(0x88b3c4, 0.55);
    g.fillEllipse(WORLD_W * 0.12, WORLD_H * 0.86, WORLD_W * 0.22, WORLD_H * 0.20);
    g.lineStyle(1.6, 0x3a6a8c, 0.55);
    for (let i = 0; i < 5; i++) {
      const y = WORLD_H * 0.83 + i * 7;
      g.beginPath();
      g.moveTo(WORLD_W * 0.03, y);
      for (let x = WORLD_W * 0.03; x <= WORLD_W * 0.21; x += 14) {
        g.lineTo(x + 7, y - 2);
        g.lineTo(x + 14, y);
      }
      g.strokePath();
    }

    // Mountains (north-east / east)
    drawWatercolorMountains(g, WORLD_W * 0.78, WORLD_H * 0.18, WORLD_W * 0.22, WORLD_H * 0.13);
    drawWatercolorMountains(g, WORLD_W * 0.62, WORLD_H * 0.26, WORLD_W * 0.18, WORLD_H * 0.10);

    // Forest patches (centre / "Wilds")
    g.fillStyle(0x6a8a3a, 0.32);
    g.fillEllipse(WORLD_W * 0.50, WORLD_H * 0.55, 110, 38);
    g.fillEllipse(WORLD_W * 0.46, WORLD_H * 0.60, 90, 32);
    drawTreeRow(g, WORLD_W * 0.42, WORLD_H * 0.58, 7);
    drawTreeRow(g, WORLD_W * 0.55, WORLD_H * 0.52, 5);

    // Marsh wash (south, between orchard and harbor)
    g.fillStyle(0x9a8a58, 0.30);
    g.fillEllipse(WORLD_W * 0.28, WORLD_H * 0.86, 160, 30);
    g.fillStyle(0x6a8a3a, 0.25);
    for (let i = 0; i < 7; i++) {
      const x = WORLD_W * 0.22 + i * 18;
      const y = WORLD_H * 0.84 + ((i % 2) * 4);
      g.fillEllipse(x, y, 14, 4);
    }

    // The Deep — a brooding wash around The Pit.
    g.fillStyle(0x4a2030, 0.42);
    g.fillEllipse(WORLD_W * 0.90, WORLD_H * 0.72, 130, 80);
    g.fillStyle(0x18080c, 0.55);
    g.fillEllipse(WORLD_W * 0.90, WORLD_H * 0.72, 60, 28);

    this.layers.terrain.add(g);
  }

  drawDecor() {
    // Painted cartographic flourishes: a tiny ship in the sea, a deer in
    // the wilds, three "Hollow Folk" tally markers near the marsh.
    const g = this.add.graphics();

    // Tiny ship near the harbor
    const sx = WORLD_W * 0.10, sy = WORLD_H * 0.79;
    g.fillStyle(0x5a3a18, 1);
    g.beginPath();
    g.moveTo(sx - 7, sy);
    g.lineTo(sx + 7, sy);
    g.lineTo(sx + 5, sy + 4);
    g.lineTo(sx - 5, sy + 4);
    g.closePath();
    g.fillPath();
    g.lineStyle(1.4, 0x3a1a08, 1);
    g.strokePath();
    g.fillStyle(0xf2e3b5, 1);
    g.beginPath();
    g.moveTo(sx, sy);
    g.lineTo(sx, sy - 10);
    g.lineTo(sx + 5, sy - 1);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, 0x5a3a18, 0.9);
    g.beginPath(); g.moveTo(sx, sy - 12); g.lineTo(sx, sy); g.strokePath();

    // A deer silhouette in the wilds
    const dx = WORLD_W * 0.49, dy = WORLD_H * 0.49;
    g.fillStyle(0x3a2510, 0.85);
    drawDeer(g, dx, dy, 18);

    // Hollow Folk lantern marks near the marsh edge
    g.lineStyle(1.6, 0x3a2410, 0.45);
    for (let i = 0; i < 3; i++) {
      const lx = WORLD_W * 0.30 + i * 24;
      const ly = WORLD_H * 0.90;
      g.beginPath(); g.moveTo(lx, ly - 4);  g.lineTo(lx + 8, ly - 4); g.strokePath();
      g.beginPath(); g.moveTo(lx, ly);      g.lineTo(lx + 8, ly);     g.strokePath();
      g.beginPath(); g.moveTo(lx, ly + 4);  g.lineTo(lx + 8, ly + 4); g.strokePath();
    }

    this.layers.decor.add(g);
  }

  drawCompassRose() {
    const cx = WORLD_W - 64, cy = WORLD_H - 70;
    const g = this.add.graphics();
    g.fillStyle(0xf2e3b5, 0.7);
    g.fillCircle(cx, cy, 28);
    g.lineStyle(1.6, 0x7a5528, 0.9);
    g.strokeCircle(cx, cy, 28);
    g.strokeCircle(cx, cy, 22);
    // 4 main pointers
    g.fillStyle(0x7a5528, 1);
    [[0, -26, 6, -8, 0, -18], [0, 26, 6, 8, 0, 18], [-26, 0, -8, 6, -18, 0], [26, 0, 8, 6, 18, 0]].forEach(([x1, y1, x2, y2, x3, y3]) => {
      g.beginPath();
      g.moveTo(cx + x1, cy + y1);
      g.lineTo(cx + x2, cy + y2);
      g.lineTo(cx + x3, cy + y3);
      g.closePath();
      g.fillPath();
    });
    g.fillStyle(0xc8923a, 1);
    g.fillCircle(cx, cy, 3);

    const label = this.add
      .text(cx, cy - 42, "N", {
        fontFamily: "'Newsreader', serif",
        fontSize: "12px",
        color: "#5a3a20",
        fontStyle: "italic",
      })
      .setOrigin(0.5).setAlpha(0.85);

    this.layers.decor.add(g);
    this.layers.decor.add(label);
  }

  // ─── Edges ──────────────────────────────────────────────────────────────

  buildEdgeViews() {
    for (const [a, b] of MAP_EDGES) {
      const na = MAP_NODES.find(n => n.id === a);
      const nb = MAP_NODES.find(n => n.id === b);
      if (!na || !nb) continue;
      const line = this.add.graphics();
      this.layers.paths.add(line);

      const marcher = this.add.image(0, 0, "cartoEmberGlow")
        .setScale(0.32).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
      this.layers.pathMarchers.add(marcher);

      this.edgeViews.push({ a, b, na, nb, line, marcher, marchT: Math.random() });
    }
  }

  drawEdge(view, status) {
    const { line, na, nb } = view;
    line.clear();
    const { ax, ay, bx, by } = endpoints(na, nb);
    const { mx, my } = midpoint(ax, ay, bx, by, view);

    const styleByStatus = {
      traveled: { color: 0x6a3a18, alpha: 0.95, width: 4, dash: null },
      unlockable: { color: 0xc87a28, alpha: 0.92, width: 3, dash: [10, 6] },
      discovered: { color: 0x8a6a50, alpha: 0.55, width: 2, dash: [6, 6] },
      hidden: { color: 0x8a6a50, alpha: 0.16, width: 2, dash: [2, 8] },
    };
    const { color, alpha, width, dash } = styleByStatus[status] || styleByStatus.hidden;

    line.lineStyle(width, color, alpha);
    if (dash) {
      drawDashedQuadCurve(line, ax, ay, mx, my, bx, by, dash[0], dash[1]);
    } else {
      // Solid traveled road — drop a softer warm under-glow first.
      line.lineStyle(width + 4, color, alpha * 0.30);
      drawQuadCurve(line, ax, ay, mx, my, bx, by);
      line.lineStyle(width, color, alpha);
      drawQuadCurve(line, ax, ay, mx, my, bx, by);
    }
  }

  // ─── Nodes ──────────────────────────────────────────────────────────────

  buildNodeViews() {
    for (const node of MAP_NODES) {
      const { x, y } = nodeXY(node);
      const c = this.add.container(x, y);
      const ringShadow = this.add.graphics();
      const ringBack   = this.add.graphics();
      const ringTrim   = this.add.graphics();
      const ringFront  = this.add.graphics();

      // Painted terrain disk behind the icon, tinted to match the node.
      const terr = NODE_TERRAIN[node.id] ?? NODE_TERRAIN.home;
      ringShadow.fillStyle(0x3a2715, 0.30);
      ringShadow.fillEllipse(2, 6, 86, 86);
      ringBack.fillStyle(toInt(terr.palette[0]), 1);
      ringBack.fillCircle(0, 0, 38);
      ringBack.fillStyle(toInt(terr.palette[1]), 0.55);
      ringBack.fillCircle(-3, 3, 32);
      ringTrim.lineStyle(3, 0x5a3a20, 0.95);
      ringTrim.strokeCircle(0, 0, 38);
      ringTrim.lineStyle(1, 0x3a2410, 0.85);
      ringTrim.strokeCircle(0, 0, 32);

      // The illustrated icon, sized to fit inside the medallion.
      const iconKey = `cartoIcon_${node.id}`;
      const icon = this.add.image(0, -2, iconKey).setDisplaySize(70, 70);

      // Status indicators (set later by applyState).
      const emberGlow = this.add.image(0, 4, "cartoEmberGlow")
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0)
        .setScale(0.8);
      const lanternMark = this.add.image(0, 0, "cartoLanternMark")
        .setAlpha(0);
      const hereRing = this.add.graphics();
      const readyHalo = this.add.graphics();

      // The "lock seal" ring shown on Old Capital while locked.
      const capitalSeals = this.add.graphics();

      // Hit area: a generous transparent circle so taps are easy.
      // Phaser hit-area geometry is in local space where (0,0) is the
      // top-left of the GameObject's display bounds (not its origin), so
      // the circle centre must be the zone's half-size, otherwise taps
      // register up-and-left of the medallion's visual centre.
      const hit = this.add.zone(0, 0, 96, 96);
      hit.setInteractive(new Phaser.Geom.Circle(48, 48, 48), Phaser.Geom.Circle.Contains);
      hit.setData("nodeId", node.id);
      hit.input.cursor = "pointer";

      // Node label below the medallion.
      const label = this.add
        .text(0, 56, node.name, {
          fontFamily: "'Newsreader', 'Times New Roman', serif",
          fontSize: "15px",
          color: "#2a1505",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      // Cartographic underline — short ink-stroke under the name.
      const underline = this.add.graphics();
      underline.lineStyle(1.5, 0x5a3a20, 0.7);
      underline.beginPath();
      underline.moveTo(-18, 70);
      underline.lineTo(18, 70);
      underline.strokePath();

      c.add([
        ringShadow,
        emberGlow,        // sits behind the medallion so the glow halos out
        ringBack,
        ringTrim,
        icon,
        ringFront,        // foreground ring overlay (status color)
        readyHalo,
        capitalSeals,
        lanternMark,
        hereRing,
        hit,
        underline,
        label,
      ]);
      this.layers.nodes.add(c);

      // Small smoke column from each node — alpha is driven by status.
      const smoke = this.makeSmokeColumn(x, y - 24);
      this.layers.smoke.add(smoke.root);

      // Ambient flicker tween for the ember glow.
      this.tweens.add({
        targets: emberGlow,
        scale: { from: 0.75, to: 0.95 },
        alpha: { from: 0.55, to: 0.95 },
        duration: 1100 + Math.random() * 600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      // Ambient pulse for "ready to explore" halo, used when revealed.
      this.tweens.add({
        targets: readyHalo,
        alpha: { from: 0.35, to: 0.95 },
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      this.nodeViews.set(node.id, {
        node,
        container: c,
        ringFront,
        icon,
        emberGlow,
        lanternMark,
        hereRing,
        readyHalo,
        capitalSeals,
        underline,
        label,
        smoke,
        hit,
      });

      hit.on("pointerover", () => this.tweens.add({
        targets: c, scale: 1.05, duration: 140, ease: "Sine.easeOut",
      }));
      hit.on("pointerout", () => this.tweens.add({
        targets: c, scale: 1.0, duration: 160, ease: "Sine.easeOut",
      }));
    }
  }

  makeSmokeColumn(x, y) {
    const root = this.add.container(x, y);
    const puffs = [];
    for (let i = 0; i < 5; i++) {
      const puff = this.add.image(0, 0, "cartoSmokePuff");
      puff.setAlpha(0);
      puff.setScale(0.5);
      puff.setBlendMode(Phaser.BlendModes.SCREEN);
      root.add(puff);
      puffs.push(puff);
    }
    return { root, puffs, intensity: 0 };
  }

  // ─── Per-frame and state-driven updates ─────────────────────────────────

  update(_time, delta) {
    const dt = delta / 1000;
    this._t += dt;

    // Edge marchers — only visible for "unlockable" status.
    for (const e of this.edgeViews) {
      if (!e.unlockable) {
        e.marcher.setAlpha(0);
        continue;
      }
      e.marchT += dt * 0.30;
      if (e.marchT > 1) e.marchT -= 1;
      const t = e.marchT;
      const { ax, ay, bx, by } = endpoints(e.na, e.nb);
      const { mx, my } = midpoint(ax, ay, bx, by, e);
      const px = quad(ax, mx, bx, t);
      const py = quad(ay, my, by, t);
      e.marcher.setPosition(px, py);
      // Fade in toward the middle so it looks like a lantern bobbing along.
      const taper = 1 - Math.abs(0.5 - t) * 1.7;
      e.marcher.setAlpha(Math.max(0, taper) * 0.95);
      e.marcher.setScale(0.30 + Math.max(0, taper) * 0.20);
    }

    // Smoke columns — advance each puff upward, recycle when faded.
    for (const v of this.nodeViews.values()) {
      const sm = v.smoke;
      if (!sm || sm.intensity <= 0) continue;
      for (let i = 0; i < sm.puffs.length; i++) {
        const p = sm.puffs[i];
        if (!p._active && Math.random() < dt * sm.intensity * 0.9) {
          p._active = true;
          p.x = (Math.random() - 0.5) * 6;
          p.y = 0;
          p.setAlpha(0.85 * sm.intensity);
          p.setScale(0.3);
        }
        if (p._active) {
          p.y -= dt * 28;
          p.x += Math.sin(this._t * 1.3 + i) * dt * 6;
          p.setScale(p.scale + dt * 0.22);
          p.setAlpha(Math.max(0, p.alpha - dt * 0.32));
          if (p.alpha <= 0 || p.y < -90) p._active = false;
        }
      }
    }

    // Drift clouds slowly.
    for (const cloud of this._cloudPool) {
      cloud.gfx.x += cloud.speed * dt;
      if (cloud.gfx.x > WORLD_W + 80) {
        cloud.gfx.x = -80;
        cloud.gfx.y = 80 + Math.random() * 60;
      }
    }

    // Birds: flap toward their target, then re-target.
    for (const bird of this._birdPool) {
      bird.flap += dt * 9;
      bird.x += Math.cos(bird.angle) * bird.speed * dt;
      bird.y += Math.sin(bird.angle) * bird.speed * dt;
      bird.gfx.x = bird.x;
      bird.gfx.y = bird.y + Math.sin(bird.flap) * 2;
      bird.gfx.setScale(0.9 + Math.sin(bird.flap) * 0.1);
      if (bird.x < -40 || bird.x > WORLD_W + 40 || bird.y < -40 || bird.y > WORLD_H + 40) {
        this.respawnBird(bird);
      }
    }
  }

  spawnInitialAmbient() {
    // A few drifting clouds.
    for (let i = 0; i < 4; i++) {
      const g = this.add.graphics();
      g.fillStyle(0xfff8e0, 0.55);
      for (let j = 0; j < 4; j++) {
        g.fillEllipse(j * 14 - 18, Math.sin(j) * 4, 28 + j * 4, 16);
      }
      g.setAlpha(0.55);
      g.x = (i / 4) * WORLD_W;
      g.y = 80 + Math.random() * 70;
      this.layers.ambient.add(g);
      this._cloudPool.push({ gfx: g, speed: 6 + Math.random() * 6 });
    }

    // A pair of small birds wandering the map.
    for (let i = 0; i < 3; i++) this._birdPool.push(this.spawnBird());
  }

  spawnBird() {
    const g = this.add.graphics();
    g.lineStyle(1.6, 0x3a2410, 0.9);
    g.beginPath();
    g.moveTo(-6, 0);
    g.lineTo(-3, -3);
    g.lineTo(0, 0);
    g.lineTo(3, -3);
    g.lineTo(6, 0);
    g.strokePath();
    this.layers.ambient.add(g);
    const bird = {
      gfx: g, x: 0, y: 0, angle: 0, speed: 30, flap: Math.random() * Math.PI,
    };
    this.respawnBird(bird);
    return bird;
  }

  respawnBird(bird) {
    const side = Math.floor(Math.random() * 4);
    if (side === 0) { bird.x = -30; bird.y = Math.random() * WORLD_H * 0.7 + 40; }
    if (side === 1) { bird.x = WORLD_W + 30; bird.y = Math.random() * WORLD_H * 0.7 + 40; }
    if (side === 2) { bird.x = Math.random() * WORLD_W; bird.y = -30; }
    if (side === 3) { bird.x = Math.random() * WORLD_W; bird.y = WORLD_H * 0.7 + 30; }
    const tx = WORLD_W / 2 + (Math.random() - 0.5) * WORLD_W * 0.6;
    const ty = WORLD_H / 2 + (Math.random() - 0.5) * WORLD_H * 0.4;
    bird.angle = Math.atan2(ty - bird.y, tx - bird.x);
    bird.speed = 24 + Math.random() * 22;
  }

  // ─── React → Phaser state application ───────────────────────────────────

  applyState() {
    const p = this.registry.get("carto.payload") || {};
    const visited = new Set(p.visited ?? ["home"]);
    const discovered = new Set(p.discovered ?? []);
    const current = p.current ?? "home";
    const playerLevel = p.level ?? 1;
    const oldCapitalUnlocked = !!p.oldCapitalUnlocked;
    const founded = p.founded ?? {};
    const keeperPaths = p.keeperPaths ?? {};

    // Edges first so the "unlockable" pulse aligns with node halos.
    for (const view of this.edgeViews) {
      const aV = visited.has(view.a), bV = visited.has(view.b);
      const aD = discovered.has(view.a), bD = discovered.has(view.b);
      let status = "hidden";
      if (aV && bV) status = "traveled";
      else if ((aV && bD && !bV) || (bV && aD && !aV)) status = "unlockable";
      else if (aD && bD) status = "discovered";
      view.unlockable = status === "unlockable";
      this.drawEdge(view, status);
    }

    for (const [, view] of this.nodeViews) {
      const node = view.node;
      const status = computeStatus(node, visited, discovered, current, playerLevel, oldCapitalUnlocked);
      this.paintNodeStatus(view, status, current, founded, keeperPaths);
    }

    this.applyTappedHighlight();
  }

  paintNodeStatus(view, status, current, founded, keeperPaths) {
    const node = view.node;
    const isHere = node.id === current;
    const isVisited = status === "visited" || isHere || status === "capital-ready";
    const isReady   = status === "discovered-ready" || status === "capital-ready";

    // ── Ember glow & smoke (driven by status)
    if (isVisited) {
      view.emberGlow.setVisible(true);
      view.smoke.intensity = isHere ? 1.0 : 0.55;
    } else if (status === "discovered-ready") {
      view.emberGlow.setVisible(true);
      view.emberGlow.setAlpha(0.45);
      view.smoke.intensity = 0;
    } else if (status === "discovered-locked" || status === "discovered-unreachable") {
      view.emberGlow.setVisible(false);
      view.smoke.intensity = 0;
    } else if (status === "capital-locked") {
      view.emberGlow.setVisible(true);
      view.emberGlow.setAlpha(0.20);
      view.smoke.intensity = 0;
    } else {
      view.emberGlow.setVisible(false);
      view.smoke.intensity = 0;
    }

    // ── Foreground ring color (status accent)
    view.ringFront.clear();
    let ringColor = 0x5a3a20;
    let ringWidth = 3;
    let ringAlpha = 0.85;
    if (isHere) { ringColor = 0xf5a623; ringWidth = 5; ringAlpha = 1; }
    else if (status === "visited") { ringColor = 0x6a3a18; ringWidth = 3.5; }
    else if (status === "discovered-ready") { ringColor = 0xf5e09a; ringWidth = 4; }
    else if (status === "discovered-locked") { ringColor = 0x9a3a2a; ringAlpha = 0.85; }
    else if (status === "capital-ready") { ringColor = 0xd4af37; ringWidth = 4; }
    else if (status === "capital-locked") { ringColor = 0x7c5a3a; ringAlpha = 0.7; }
    else if (status === "hidden") { ringColor = 0x8a6a50; ringWidth = 2; ringAlpha = 0.4; }
    view.ringFront.lineStyle(ringWidth, ringColor, ringAlpha);
    view.ringFront.strokeCircle(0, 0, 38);

    // ── Hidden / undiscovered look: faint, with a Hollow lantern-mark
    if (status === "hidden") {
      view.icon.setAlpha(0.10);
      view.lanternMark.setAlpha(0.75);
      view.label.setAlpha(0.35);
      view.label.setText("? ? ?");
      view.underline.setAlpha(0.3);
    } else {
      view.icon.setAlpha(isVisited ? 1 : 0.78);
      view.lanternMark.setAlpha(0);
      view.label.setAlpha(isVisited ? 1 : 0.85);
      view.label.setText(node.name);
      view.underline.setAlpha(isVisited ? 0.9 : 0.55);
    }

    // ── "Ready to explore" halo (a soft outer ring)
    view.readyHalo.clear();
    if (isReady) {
      view.readyHalo.lineStyle(2, 0xf5e09a, 0.9);
      view.readyHalo.strokeCircle(0, 0, 50);
      view.readyHalo.lineStyle(1.4, 0xf5e09a, 0.6);
      view.readyHalo.strokeCircle(0, 0, 56);
    }

    // ── "You are here" — pulsing flame ring
    view.hereRing.clear();
    if (isHere) {
      view.hereRing.lineStyle(3, 0xffd870, 0.9);
      drawFlameRing(view.hereRing, 46, this._t * 1.4);
      view.hereRing.lineStyle(2, 0xffae40, 0.75);
      drawFlameRing(view.hereRing, 52, this._t * 1.4 + 0.8);
    }

    // ── Old Capital "lock seals" — three small wax-seal dots that go gilded
    // when all three Hearth-Tokens are held.
    view.capitalSeals.clear();
    if (node.requiresHearthTokens) {
      const tokenCount = Math.max(0, Math.min(3, this.registry.get("carto.payload")?.tokenCount ?? 0));
      const slots = [
        { ang: -Math.PI / 2, accent: 0x9bbf68 },
        { ang: -Math.PI / 2 + (2 * Math.PI / 3), accent: 0xb5bdc4 },
        { ang: -Math.PI / 2 + (4 * Math.PI / 3), accent: 0xcfe1ea },
      ];
      slots.forEach((s, i) => {
        const px = Math.cos(s.ang) * 44;
        const py = Math.sin(s.ang) * 44;
        const earned = i < tokenCount;
        view.capitalSeals.fillStyle(earned ? 0xd4af37 : 0x3a2410, 1);
        view.capitalSeals.fillCircle(px, py, 6);
        view.capitalSeals.lineStyle(1.4, earned ? 0xfff2c0 : 0x1a0e08, 0.9);
        view.capitalSeals.strokeCircle(px, py, 6);
        view.capitalSeals.fillStyle(s.accent, earned ? 0.85 : 0.55);
        view.capitalSeals.fillCircle(px, py, 2.6);
      });
    }

    // ── Keeper-resolved tint: founded settlements get a subtle moss-green
    // (coexist) or iron-grey (driveout) overlay on the medallion trim. This
    // makes the player's choice visible at a glance from the map.
    const keep = keeperPaths?.[node.id];
    if (keep === "coexist") {
      view.ringFront.lineStyle(2, 0x6a9a3a, 0.85);
      view.ringFront.strokeCircle(0, 0, 30);
    } else if (keep === "driveout") {
      view.ringFront.lineStyle(2, 0x6a6a6e, 0.85);
      view.ringFront.strokeCircle(0, 0, 30);
    }

    // ── Founded but no keeper chosen yet — small "settled" marker (wreath)
    if (founded?.[node.id] && !keep && !isHere) {
      view.ringFront.lineStyle(1.6, 0xd2b46a, 0.95);
      view.ringFront.strokeCircle(0, 0, 30);
    }
  }

  applyTappedHighlight() {
    const tapped = this.registry.get("carto.tapped") ?? null;
    if (this._lastTapped === tapped) return;
    if (this._lastTapped) {
      const prev = this.nodeViews.get(this._lastTapped);
      if (prev) prev.container.scale = 1.0;
    }
    if (tapped) {
      const cur = this.nodeViews.get(tapped);
      if (cur) {
        this.tweens.add({
          targets: cur.container, scale: 1.08, duration: 160, yoyo: true,
          repeat: 1, ease: "Sine.easeInOut",
        });
      }
    }
    this._lastTapped = tapped;
  }

  // ─── Layout ─────────────────────────────────────────────────────────────

  relayout() {
    const w = this.scale.width;
    const h = this.scale.height;
    const sx = w / WORLD_W;
    const sy = h / WORLD_H;
    const s = Math.min(sx, sy);
    const ox = (w - WORLD_W * s) / 2;
    const oy = (h - WORLD_H * s) / 2;
    const root = this.layers;
    Object.values(root).forEach((layer) => {
      layer.setScale(s);
      layer.setPosition(ox, oy);
    });
  }
}

// ─── Pure helpers ────────────────────────────────────────────────────────

function endpoints(na, nb) {
  return { ax: (na.x / 100) * WORLD_W, ay: (na.y / 100) * WORLD_H, bx: (nb.x / 100) * WORLD_W, by: (nb.y / 100) * WORLD_H };
}

function midpoint(ax, ay, bx, by, view) {
  // Mild perpendicular bend so overlapping edges separate.
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const bend = (((view?.a?.charCodeAt?.(0) ?? 0) + (view?.b?.charCodeAt?.(0) ?? 0)) % 2 === 0 ? 24 : -24);
  return { mx: (ax + bx) / 2 + nx * bend, my: (ay + by) / 2 + ny * bend };
}

function nodeXY(node) {
  return { x: (node.x / 100) * WORLD_W, y: (node.y / 100) * WORLD_H };
}

function quad(p0, p1, p2, t) {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

function drawQuadCurve(g, ax, ay, mx, my, bx, by) {
  g.beginPath();
  g.moveTo(ax, ay);
  const SEG = 24;
  for (let i = 1; i <= SEG; i++) {
    const t = i / SEG;
    g.lineTo(quad(ax, mx, bx, t), quad(ay, my, by, t));
  }
  g.strokePath();
}

function drawDashedQuadCurve(g, ax, ay, mx, my, bx, by, on, off) {
  // Approximate the curve with short segments, lay dashes along them.
  const SEG = 80;
  let pen = on; // remaining length in current state
  let onPen = true;
  let prevX = ax, prevY = ay;
  for (let i = 1; i <= SEG; i++) {
    const t = i / SEG;
    const x = quad(ax, mx, bx, t);
    const y = quad(ay, my, by, t);
    let dx = x - prevX, dy = y - prevY;
    let segLen = Math.hypot(dx, dy);
    while (segLen > 0) {
      const step = Math.min(pen, segLen);
      const fx = prevX + (dx / segLen) * step;
      const fy = prevY + (dy / segLen) * step;
      if (onPen) {
        g.beginPath();
        g.moveTo(prevX, prevY);
        g.lineTo(fx, fy);
        g.strokePath();
      }
      prevX = fx; prevY = fy;
      dx = x - prevX; dy = y - prevY;
      segLen = Math.hypot(dx, dy);
      pen -= step;
      if (pen <= 0) {
        onPen = !onPen;
        pen = onPen ? on : off;
      }
    }
    prevX = x; prevY = y;
  }
}

function drawDashedRect(g, x, y, w, h, on, off) {
  drawDashedLine(g, x, y, x + w, y, on, off);
  drawDashedLine(g, x + w, y, x + w, y + h, on, off);
  drawDashedLine(g, x + w, y + h, x, y + h, on, off);
  drawDashedLine(g, x, y + h, x, y, on, off);
}

function drawDashedLine(g, x1, y1, x2, y2, on, off) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len === 0) return;
  const ux = dx / len, uy = dy / len;
  let d = 0;
  while (d < len) {
    const a = Math.min(on, len - d);
    g.beginPath();
    g.moveTo(x1 + ux * d, y1 + uy * d);
    g.lineTo(x1 + ux * (d + a), y1 + uy * (d + a));
    g.strokePath();
    d += on + off;
  }
}

function drawWatercolorMountains(g, cx, cy, w, h) {
  g.fillStyle(0x88766a, 0.55);
  for (let i = 0; i < 4; i++) {
    const dx = (i - 1.5) * w * 0.25;
    g.beginPath();
    g.moveTo(cx + dx - w * 0.18, cy + h);
    g.lineTo(cx + dx, cy - h * 0.5);
    g.lineTo(cx + dx + w * 0.18, cy + h);
    g.closePath();
    g.fillPath();
  }
  g.fillStyle(0xe8c98a, 0.7);
  for (let i = 0; i < 4; i++) {
    const dx = (i - 1.5) * w * 0.25;
    g.beginPath();
    g.moveTo(cx + dx - 4, cy - h * 0.05);
    g.lineTo(cx + dx, cy - h * 0.5);
    g.lineTo(cx + dx + 4, cy - h * 0.05);
    g.closePath();
    g.fillPath();
  }
  g.lineStyle(1.2, 0x5a3a20, 0.7);
  for (let i = 0; i < 4; i++) {
    const dx = (i - 1.5) * w * 0.25;
    g.beginPath();
    g.moveTo(cx + dx - w * 0.18, cy + h);
    g.lineTo(cx + dx, cy - h * 0.5);
    g.lineTo(cx + dx + w * 0.18, cy + h);
    g.strokePath();
  }
}

function drawTreeRow(g, x, y, n) {
  for (let i = 0; i < n; i++) {
    const tx = x + i * 14;
    g.fillStyle(0x3a5a18, 1);
    g.fillTriangle(tx - 6, y, tx + 6, y, tx, y - 14);
    g.fillStyle(0x2a3a08, 1);
    g.fillRect(tx - 1, y, 2, 4);
  }
}

function drawDeer(g, cx, cy, s) {
  g.fillRect(cx - s * 0.30, cy, s * 0.60, s * 0.20); // body
  g.fillRect(cx - s * 0.25, cy + s * 0.20, s * 0.06, s * 0.20);
  g.fillRect(cx + s * 0.19, cy + s * 0.20, s * 0.06, s * 0.20);
  g.fillRect(cx + s * 0.18, cy - s * 0.10, s * 0.06, s * 0.20); // neck
  g.fillRect(cx + s * 0.16, cy - s * 0.22, s * 0.12, s * 0.10); // head
  g.lineStyle(1.4, 0x3a2510, 1);
  g.beginPath(); g.moveTo(cx + s * 0.22, cy - s * 0.22); g.lineTo(cx + s * 0.30, cy - s * 0.38); g.strokePath();
  g.beginPath(); g.moveTo(cx + s * 0.22, cy - s * 0.22); g.lineTo(cx + s * 0.14, cy - s * 0.38); g.strokePath();
}

function drawFlameRing(g, r, t) {
  g.beginPath();
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const wob = Math.sin(a * 5 + t * 2) * 1.6 + Math.cos(a * 3 - t) * 1.0;
    const rr = r + wob;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.strokePath();
}

function drawFallbackIcon(ctx, node) {
  ctx.fillStyle = node.kind === "fish" ? "#3a6a8c"
                : node.kind === "capital" ? "#a88a2a"
                : "#5a3a20";
  ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f6efe0";
  ctx.font = 'bold 28px "Newsreader", serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(node.icon || "?", 0, 2);
}

function computeStatus(node, visited, discovered, current, playerLevel, oldCapitalUnlocked) {
  if (node.requiresHearthTokens) return oldCapitalUnlocked ? "capital-ready" : "capital-locked";
  if (node.id === current) return "current";
  if (visited.has(node.id)) return "visited";
  if (discovered.has(node.id)) {
    if (!isAdjacent(current, node.id)) return "discovered-unreachable";
    if (node.level > playerLevel) return "discovered-locked";
    return "discovered-ready";
  }
  return "hidden";
}

function toInt(hex) {
  if (typeof hex === "number") return hex;
  return parseInt(String(hex).replace("#", ""), 16);
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
