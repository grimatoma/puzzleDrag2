/**
 * Phaser scene for the high-fidelity season-progress strip.
 *
 * Renders a 4-zone horizontal strip with parallax hill silhouettes,
 * procedurally-generated hero elements per season (cherry tree, sun,
 * maple tree, snowman), dense particle systems (petals, dust motes,
 * falling leaves, snowfall), and a detailed wagon with a horse puller
 * that walks from Spring to Winter as turns elapse.
 *
 * Mounted by SeasonStripPhaser.jsx in the HUD; receives layout (width,
 * height, dpr) via scene init data, and gameplay state (turnsUsed,
 * turnBudget, seasonIdx, seasonName) via the Phaser registry.
 */

import Phaser from "phaser";

const COLORS = {
  // Spring
  springSky:        0xfde7f0,
  springGround:     0xbfe3b3,
  springHill:       0x86c47a,
  springHillBack:   0xb6d6a4,
  // Summer
  summerSky:        0xffe9a8,
  summerGround:     0xf3b850,
  summerHill:       0xc79a48,
  summerHillBack:   0xe6c478,
  // Autumn
  autumnSky:        0xffd9a8,
  autumnGround:     0xcd864a,
  autumnHill:       0xa85822,
  autumnHillBack:   0xc77a3e,
  // Winter
  winterSky:        0xe5f0fa,
  winterGround:     0x90b0c6,
  winterHill:       0x7a98b0,
  winterHillBack:   0xa6c2d6,
  // Numeral panel (uses active season)
  panelBg:          0xfff7e0,
};

const SEASON_PALETTES = [
  { sky: COLORS.springSky, ground: COLORS.springGround, hill: COLORS.springHill, hillBack: COLORS.springHillBack, panel: 0xfff6f9, num: 0x9a3358 },
  { sky: COLORS.summerSky, ground: COLORS.summerGround, hill: COLORS.summerHill, hillBack: COLORS.summerHillBack, panel: 0xfff7e0, num: 0x7a5320 },
  { sky: COLORS.autumnSky, ground: COLORS.autumnGround, hill: COLORS.autumnHill, hillBack: COLORS.autumnHillBack, panel: 0xfff1dc, num: 0x8a3a14 },
  { sky: COLORS.winterSky, ground: COLORS.winterGround, hill: COLORS.winterHill, hillBack: COLORS.winterHillBack, panel: 0xeaf5ff, num: 0x1f3a5a },
];

const NUMERAL_PANEL_PX = 56;

function seasonRanges(turnBudget) {
  const S = Math.max(1, turnBudget | 0);
  const ends = [Math.floor(S / 4), Math.floor((2 * S) / 4), Math.floor((3 * S) / 4), S];
  return ends.map((end, i) => ({
    start: i === 0 ? 0 : ends[i - 1],
    end,
    count: end - (i === 0 ? 0 : ends[i - 1]),
  }));
}

export class SeasonStripScene extends Phaser.Scene {
  constructor() {
    super({ key: "SeasonStripScene" });
  }

  init(data) {
    this.cssWidth = data.width ?? 720;
    this.cssHeight = data.height ?? 52;
    this.dpr = data.dpr ?? 1;
  }

  create() {
    this.generateTextures();

    // World coords use the buffer size (cssWidth * dpr × cssHeight * dpr) so
    // generated graphics look crisp at any device pixel ratio. Layout below
    // is computed in css px and then scaled by `dpr`.
    this.layers = {
      backgrounds: this.add.container(0, 0),
      hillsBack:   this.add.container(0, 0),
      hillsFront:  this.add.container(0, 0),
      heroes:      this.add.container(0, 0),
      particles:   this.add.container(0, 0),
      wagon:       this.add.container(0, 0),
      labels:      this.add.container(0, 0),
      numeral:     this.add.container(0, 0),
    };

    this.layout = this.computeLayout();
    this.buildZones();
    this.buildParallaxHills();
    this.buildHeroes();
    this.buildParticles();
    this.buildLabels();
    this.buildNumeralPanel();
    this.buildWagon();

    this.syncFromRegistry();
    this.registry.events.on("changedata", this.onRegistryChange, this);
    this.scale.on("resize", this.onResize, this);
    this.events.on("shutdown", this.cleanup, this);
    this.events.on("destroy", this.cleanup, this);
  }

  cleanup() {
    this.registry.events.off("changedata", this.onRegistryChange, this);
    this.scale.off("resize", this.onResize, this);
    if (this.emitters) {
      Object.values(this.emitters).forEach((e) => e?.destroy?.());
    }
  }

  onResize() {
    // The React wrapper resizes the buffer; we re-lay-out the scene contents.
    const size = this.scale.gameSize;
    this.cssWidth = Math.round(size.width / this.dpr);
    this.cssHeight = Math.round(size.height / this.dpr);
    this.rebuildLayout();
  }

  rebuildLayout() {
    Object.values(this.layers).forEach((c) => c.removeAll(true));
    if (this.emitters) Object.values(this.emitters).forEach((e) => e?.destroy?.());
    this.layout = this.computeLayout();
    this.buildZones();
    this.buildParallaxHills();
    this.buildHeroes();
    this.buildParticles();
    this.buildLabels();
    this.buildNumeralPanel();
    this.buildWagon();
    this.syncFromRegistry();
  }

  // ─── Layout ────────────────────────────────────────────────────────────

  computeLayout() {
    const dpr = this.dpr;
    const w = this.cssWidth * dpr;
    const h = this.cssHeight * dpr;
    const numW = NUMERAL_PANEL_PX * dpr;
    const segW = w - numW;
    return { dpr, w, h, numW, segW, segLeft: 0, numLeft: segW };
  }

  // ─── Procedural textures ───────────────────────────────────────────────

  generateTextures() {
    const dpr = this.dpr;
    const px = (n) => Math.max(1, Math.round(n * dpr));

    // Tiny particle textures — circles with soft alpha so Phaser's particle
    // alpha tween makes them feel like ambient effects.
    const makeDot = (key, fillHex, r) => {
      if (this.textures.exists(key)) return;
      const g = this.add.graphics({ x: 0, y: 0 });
      g.fillStyle(fillHex, 1);
      g.fillCircle(px(r), px(r), px(r));
      g.generateTexture(key, px(r * 2), px(r * 2));
      g.destroy();
    };

    const makePetal = (key, fillHex, strokeHex) => {
      if (this.textures.exists(key)) return;
      const w = px(7);
      const h = px(6);
      const g = this.add.graphics({ x: 0, y: 0 });
      // Petal as a tilted ellipse with a darker outline + lighter highlight
      g.fillStyle(fillHex, 1);
      g.lineStyle(px(0.5), strokeHex, 1);
      g.fillEllipse(w / 2, h / 2, w - px(1), h - px(1));
      g.strokeEllipse(w / 2, h / 2, w - px(1), h - px(1));
      // highlight
      g.fillStyle(0xffffff, 0.35);
      g.fillEllipse(w / 2 - px(1), h / 2 - px(1), w / 2.5, h / 3);
      g.generateTexture(key, w, h);
      g.destroy();
    };

    const makeLeaf = (key, fillHex, strokeHex) => {
      if (this.textures.exists(key)) return;
      const wpx = px(6);
      const hpx = px(9);
      const g = this.add.graphics({ x: 0, y: 0 });
      // Leaf as a tall ellipse with a centerline vein.
      g.fillStyle(fillHex, 1);
      g.lineStyle(px(0.5), strokeHex, 1);
      g.fillEllipse(wpx / 2, hpx / 2, wpx - px(0.5), hpx - px(0.5));
      g.strokeEllipse(wpx / 2, hpx / 2, wpx - px(0.5), hpx - px(0.5));
      g.lineStyle(px(0.4), strokeHex, 0.7);
      g.beginPath();
      g.moveTo(wpx / 2, px(1));
      g.lineTo(wpx / 2, hpx - px(1));
      g.strokePath();
      // side veins
      g.lineStyle(px(0.3), strokeHex, 0.55);
      g.beginPath();
      g.moveTo(wpx / 2, hpx / 2);
      g.lineTo(wpx - px(0.8), hpx / 2 - px(1));
      g.moveTo(wpx / 2, hpx / 2);
      g.lineTo(px(0.8), hpx / 2 - px(1));
      g.strokePath();
      g.generateTexture(key, wpx, hpx);
      g.destroy();
    };

    const makeSnowflake = (key, size) => {
      if (this.textures.exists(key)) return;
      const r = px(size);
      const dim = r * 2;
      const g = this.add.graphics({ x: 0, y: 0 });
      g.lineStyle(px(0.7), 0xffffff, 1);
      for (const deg of [0, 60, 120]) {
        const a = (deg * Math.PI) / 180;
        g.beginPath();
        g.moveTo(r - Math.cos(a) * r, r - Math.sin(a) * r);
        g.lineTo(r + Math.cos(a) * r, r + Math.sin(a) * r);
        g.strokePath();
      }
      g.fillStyle(0xffffff, 1);
      g.fillCircle(r, r, px(0.6));
      g.generateTexture(key, dim, dim);
      g.destroy();
    };

    makePetal("hwv-petal-pink", 0xf06292, 0x9a3358);
    makePetal("hwv-petal-yellow", 0xffb74d, 0x9a3358);
    makePetal("hwv-petal-purple", 0xba68c8, 0x9a3358);
    makeDot("hwv-mote-gold", 0xfff2c6, 1.2);
    makeLeaf("hwv-leaf-red", 0xd04a28, 0x7a3a14);
    makeLeaf("hwv-leaf-orange", 0xe07a3a, 0x7a3a14);
    makeLeaf("hwv-leaf-yellow", 0xf0a838, 0x7a3a14);
    makeSnowflake("hwv-flake-small", 1.6);
    makeSnowflake("hwv-flake-large", 2.4);
    makeDot("hwv-spark", 0xfff2c6, 0.6);
  }

  // ─── Zone backgrounds ──────────────────────────────────────────────────

  buildZones() {
    const { dpr, h, segW } = this.layout;
    const turnBudget = this.registry.get("hwv.turnBudget") || 10;
    const ranges = seasonRanges(turnBudget);
    const total = turnBudget;
    let x = 0;
    this.zoneRects = [];
    for (let i = 0; i < 4; i += 1) {
      const w = (ranges[i].count / total) * segW;
      const palette = SEASON_PALETTES[i];
      // sky-to-ground gradient (two stacked rects approximating a gradient)
      for (let row = 0; row < 8; row += 1) {
        const t = row / 7;
        const sky = palette.sky;
        const ground = palette.ground;
        const r1 = (sky >> 16) & 0xff, g1 = (sky >> 8) & 0xff, b1 = sky & 0xff;
        const r2 = (ground >> 16) & 0xff, g2 = (ground >> 8) & 0xff, b2 = ground & 0xff;
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        const color = (r << 16) | (g << 8) | b;
        const stripe = this.add.rectangle(x, (row * h) / 8, w, h / 8 + 1, color).setOrigin(0, 0);
        this.layers.backgrounds.add(stripe);
      }
      // Subtle vertical separator
      if (i < 3) {
        const sep = this.add.rectangle(x + w, 0, Math.max(1, 1 * dpr), h, 0x3a2412, 0.45).setOrigin(0, 0);
        this.layers.backgrounds.add(sep);
      }
      this.zoneRects.push({ x, width: w, idx: i, palette });
      x += w;
    }
  }

  // ─── Parallax hills (back + front silhouettes per zone) ────────────────

  buildParallaxHills() {
    const { dpr, h } = this.layout;
    this.zoneRects.forEach(({ x, width, palette }) => {
      // back hills — wider, lower-contrast
      const backHills = this.add.graphics();
      backHills.fillStyle(palette.hillBack, 0.85);
      backHills.beginPath();
      backHills.moveTo(x, h * 0.78);
      const samples = Math.max(6, Math.floor(width / (12 * dpr)));
      for (let s = 0; s <= samples; s += 1) {
        const t = s / samples;
        const cx = x + t * width;
        const cy = h * 0.78 - Math.sin(t * Math.PI * 2.4) * h * 0.06 - h * 0.04;
        backHills.lineTo(cx, cy);
      }
      backHills.lineTo(x + width, h);
      backHills.lineTo(x, h);
      backHills.closePath();
      backHills.fillPath();
      this.layers.hillsBack.add(backHills);

      // front hills — taller, more saturated
      const frontHills = this.add.graphics();
      frontHills.fillStyle(palette.hill, 1);
      frontHills.beginPath();
      frontHills.moveTo(x, h * 0.88);
      for (let s = 0; s <= samples; s += 1) {
        const t = s / samples;
        const cx = x + t * width;
        const cy = h * 0.88 - Math.cos(t * Math.PI * 3.2 + x * 0.01) * h * 0.07;
        frontHills.lineTo(cx, cy);
      }
      frontHills.lineTo(x + width, h);
      frontHills.lineTo(x, h);
      frontHills.closePath();
      frontHills.fillPath();
      this.layers.hillsFront.add(frontHills);
    });
  }

  // ─── Hero elements per zone ────────────────────────────────────────────

  buildHeroes() {
    const { dpr, h } = this.layout;
    this.zoneRects.forEach(({ x, width }, i) => {
      if (i === 0) this.buildSpringHero(x, width, h, dpr);
      else if (i === 1) this.buildSummerHero(x, width, h, dpr);
      else if (i === 2) this.buildAutumnHero(x, width, h, dpr);
      else if (i === 3) this.buildWinterHero(x, width, h, dpr);
    });
  }

  buildSpringHero(x, width, h, dpr) {
    // Cherry blossom tree on the left with a hanging branch
    const g = this.add.graphics();
    const cx = x + 16 * dpr;
    const trunkY = h * 0.7;
    g.fillStyle(0x6b3a1a, 1);
    g.fillRoundedRect(cx - 2 * dpr, trunkY, 4 * dpr, h * 0.3, 0.6 * dpr);
    g.lineStyle(0.5 * dpr, 0x3a2412, 1);
    g.strokeRoundedRect(cx - 2 * dpr, trunkY, 4 * dpr, h * 0.3, 0.6 * dpr);
    // canopy — overlapping pink/cream circles
    const canopy = [
      { dx: 0,  dy: -6, r: 9,  c: 0xfdc3d8 },
      { dx: -7, dy: -2, r: 7,  c: 0xfdaec4 },
      { dx: 6,  dy: -3, r: 7,  c: 0xfdc3d8 },
      { dx: 2,  dy: -10, r: 7, c: 0xffffff },
      { dx: -3, dy: 2,  r: 5,  c: 0xf06292 },
    ];
    for (const c of canopy) {
      g.fillStyle(c.c, 1);
      g.fillCircle(cx + c.dx * dpr, trunkY + c.dy * dpr, c.r * dpr);
    }
    this.layers.heroes.add(g);

    // Garden of pansies along the bottom — at most 6 across the zone
    const flowerCount = Math.max(3, Math.min(8, Math.round(width / (24 * dpr))));
    const colors = [0xf06292, 0xffb74d, 0xba68c8];
    for (let f = 0; f < flowerCount; f += 1) {
      const fx = x + ((f + 0.5) / flowerCount) * width;
      const fy = h * 0.84;
      const color = colors[f % colors.length];
      const fg = this.add.graphics();
      // stem
      fg.lineStyle(1.1 * dpr, 0x3a7a2a, 1);
      fg.beginPath();
      fg.moveTo(fx, fy);
      fg.lineTo(fx, fy - 8 * dpr);
      fg.strokePath();
      // petals
      fg.fillStyle(color, 1);
      fg.lineStyle(0.3 * dpr, 0x9a3358, 1);
      fg.fillCircle(fx, fy - 11 * dpr, 1.8 * dpr);
      fg.fillCircle(fx - 1.8 * dpr, fy - 9 * dpr, 1.8 * dpr);
      fg.fillCircle(fx + 1.8 * dpr, fy - 9 * dpr, 1.8 * dpr);
      fg.fillCircle(fx, fy - 7 * dpr, 1.8 * dpr);
      fg.fillStyle(0xfff4a8, 1);
      fg.fillCircle(fx, fy - 9 * dpr, 0.9 * dpr);
      this.layers.heroes.add(fg);
    }
  }

  buildSummerHero(x, width, h, dpr) {
    // Big sun with animated rays
    const sunX = x + 20 * dpr;
    const sunY = h * 0.35;
    const sunR = 7 * dpr;
    const rays = this.add.graphics();
    rays.lineStyle(1.5 * dpr, 0xf0c14b, 1);
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      rays.beginPath();
      rays.moveTo(sunX + Math.cos(a) * (sunR + 1.5 * dpr), sunY + Math.sin(a) * (sunR + 1.5 * dpr));
      rays.lineTo(sunX + Math.cos(a) * (sunR + 5 * dpr), sunY + Math.sin(a) * (sunR + 5 * dpr));
      rays.strokePath();
    }
    this.layers.heroes.add(rays);
    this.tweens.add({
      targets: rays,
      alpha: 0.7,
      yoyo: true,
      repeat: -1,
      duration: 1400,
      ease: "Sine.easeInOut",
    });

    // Sun body with face
    const sun = this.add.graphics();
    sun.fillStyle(0xf6c342, 1);
    sun.lineStyle(0.7 * dpr, 0xa87832, 1);
    sun.fillCircle(sunX, sunY, sunR);
    sun.strokeCircle(sunX, sunY, sunR);
    // highlight
    sun.fillStyle(0xfff2c6, 0.85);
    sun.fillCircle(sunX - sunR * 0.35, sunY - sunR * 0.4, sunR * 0.22);
    // eyes
    sun.fillStyle(0x3a2412, 1);
    sun.fillCircle(sunX - sunR * 0.25, sunY - sunR * 0.05, 0.7 * dpr);
    sun.fillCircle(sunX + sunR * 0.25, sunY - sunR * 0.05, 0.7 * dpr);
    // smile
    sun.lineStyle(0.7 * dpr, 0x3a2412, 1);
    sun.beginPath();
    sun.arc(sunX, sunY + sunR * 0.15, sunR * 0.32, 0.2, Math.PI - 0.2);
    sun.strokePath();
    this.layers.heroes.add(sun);

    // Beach: shells + grass tufts
    const ground = this.add.graphics();
    ground.fillStyle(0xe9c87a, 1);
    ground.fillRect(x, h * 0.85, width, h * 0.15);
    ground.fillStyle(0xc79a48, 1);
    ground.fillRect(x, h * 0.85, width, 1.2 * dpr);
    // wheat tufts
    const tuftCount = Math.max(2, Math.round(width / (40 * dpr)));
    for (let t = 0; t < tuftCount; t += 1) {
      const tx = x + ((t + 0.5) / tuftCount) * width;
      const ty = h * 0.85;
      ground.lineStyle(0.6 * dpr, 0xa87832, 1);
      ground.beginPath();
      ground.moveTo(tx, ty);
      ground.lineTo(tx, ty - 6 * dpr);
      ground.strokePath();
      ground.fillStyle(0xf0c14b, 1);
      ground.fillEllipse(tx - 1 * dpr, ty - 5 * dpr, 1.5 * dpr, 2.4 * dpr);
      ground.fillEllipse(tx + 1 * dpr, ty - 5 * dpr, 1.5 * dpr, 2.4 * dpr);
      ground.fillEllipse(tx, ty - 6.8 * dpr, 1.5 * dpr, 2.4 * dpr);
    }
    this.layers.heroes.add(ground);
  }

  buildAutumnHero(x, width, h, dpr) {
    // Tall maple tree
    const cx = x + 18 * dpr;
    const trunkY = h * 0.45;
    const g = this.add.graphics();
    g.fillStyle(0x6b3a1a, 1);
    g.fillRoundedRect(cx - 2 * dpr, trunkY, 4 * dpr, h * 0.4, 0.7 * dpr);
    g.lineStyle(0.5 * dpr, 0x3a2412, 1);
    g.strokeRoundedRect(cx - 2 * dpr, trunkY, 4 * dpr, h * 0.4, 0.7 * dpr);
    // canopy
    g.fillStyle(0x8a4a1e, 0.7);
    g.fillEllipse(cx, trunkY - 3 * dpr, 14 * dpr, 11 * dpr);
    const leaves = [
      { dx: -5, dy: -7, r: 4, c: 0xe07a3a },
      { dx:  6, dy: -6, r: 4, c: 0xd04a28 },
      { dx:  0, dy: -10, r: 4, c: 0xf0a838 },
      { dx: -5, dy: 0,  r: 3.5, c: 0xf0a838 },
      { dx:  6, dy: 0,  r: 3.5, c: 0xd04a28 },
      { dx:  0, dy: 3,  r: 3.5, c: 0xe07a3a },
    ];
    for (const l of leaves) {
      g.fillStyle(l.c, 1);
      g.fillCircle(cx + l.dx * dpr, trunkY + l.dy * dpr, l.r * dpr);
    }
    this.layers.heroes.add(g);

    // Pumpkin on the right
    if (width > 90 * dpr) {
      const pg = this.add.graphics();
      const px = x + width - 22 * dpr;
      const py = h * 0.85;
      pg.fillStyle(0xe07a3a, 1);
      pg.lineStyle(0.5 * dpr, 0x7a3a14, 1);
      pg.fillEllipse(px, py, 10 * dpr, 7 * dpr);
      pg.strokeEllipse(px, py, 10 * dpr, 7 * dpr);
      pg.fillStyle(0xd04a28, 1);
      pg.fillEllipse(px - 3 * dpr, py, 3 * dpr, 6.5 * dpr);
      pg.fillEllipse(px + 3 * dpr, py, 3 * dpr, 6.5 * dpr);
      pg.fillStyle(0x3a7a2a, 1);
      pg.fillRect(px - 0.5 * dpr, py - 5 * dpr, 1 * dpr, 1.6 * dpr);
      this.layers.heroes.add(pg);
    }

    // Leaf pile at the trunk base
    const pile = this.add.graphics();
    pile.fillStyle(0xa85822, 0.7);
    pile.fillEllipse(cx + 5 * dpr, h * 0.92, 18 * dpr, 3 * dpr);
    for (const dot of [
      { dx: -3, c: 0xd04a28 },
      { dx: 0,  c: 0xf0a838 },
      { dx: 4,  c: 0xe07a3a },
      { dx: 8,  c: 0xd04a28 },
      { dx: 12, c: 0xf0a838 },
    ]) {
      pile.fillStyle(dot.c, 0.9);
      pile.fillCircle(cx + dot.dx * dpr, h * 0.91, 1.4 * dpr);
    }
    this.layers.heroes.add(pile);
  }

  buildWinterHero(x, width, h, dpr) {
    // Evergreens (left + maybe right)
    const drawTree = (tx, ty, scale) => {
      const g = this.add.graphics();
      g.fillStyle(0x6b3a1a, 1);
      g.fillRoundedRect(tx - 1.5 * dpr * scale, ty + 26 * dpr * scale, 3 * dpr * scale, 6 * dpr * scale, 0.4 * dpr);
      g.fillStyle(0x2a6a4a, 1);
      g.lineStyle(0.4 * dpr, 0x143a2a, 1);
      const tri = (cy, w) => {
        g.beginPath();
        g.moveTo(tx, ty + cy * dpr * scale);
        g.lineTo(tx + w * dpr * scale, ty + (cy + 12) * dpr * scale);
        g.lineTo(tx - w * dpr * scale, ty + (cy + 12) * dpr * scale);
        g.closePath();
        g.fillPath();
        g.strokePath();
      };
      tri(0, 8);
      tri(8, 9);
      tri(16, 10);
      // snow on branches
      g.fillStyle(0xffffff, 1);
      g.fillEllipse(tx, ty + 12 * dpr * scale, 6.5 * dpr * scale, 0.8 * dpr * scale);
      g.fillEllipse(tx, ty + 20 * dpr * scale, 7.5 * dpr * scale, 0.8 * dpr * scale);
      g.fillEllipse(tx, ty + 28 * dpr * scale, 8.5 * dpr * scale, 0.8 * dpr * scale);
      this.layers.heroes.add(g);
    };
    drawTree(x + 12 * dpr, h * 0.2, 1);
    if (width > 130 * dpr) drawTree(x + width - 16 * dpr, h * 0.28, 0.85);

    // Snowman in the center
    const sx = Math.max(x + 50 * dpr, Math.min(x + width / 2 + 6 * dpr, x + width - 18 * dpr));
    const sg = this.add.graphics();
    // bottom snowball
    sg.fillStyle(0xffffff, 1);
    sg.lineStyle(0.7 * dpr, 0x4a6a86, 1);
    sg.fillCircle(sx, h * 0.85, 8 * dpr);
    sg.strokeCircle(sx, h * 0.85, 8 * dpr);
    // middle snowball
    sg.fillCircle(sx, h * 0.6, 6 * dpr);
    sg.strokeCircle(sx, h * 0.6, 6 * dpr);
    // head
    sg.fillCircle(sx, h * 0.4, 4.5 * dpr);
    sg.strokeCircle(sx, h * 0.4, 4.5 * dpr);
    // arms
    sg.lineStyle(1 * dpr, 0x5a3a1c, 1);
    sg.beginPath(); sg.moveTo(sx - 5 * dpr, h * 0.6); sg.lineTo(sx - 11 * dpr, h * 0.55); sg.strokePath();
    sg.beginPath(); sg.moveTo(sx + 5 * dpr, h * 0.6); sg.lineTo(sx + 11 * dpr, h * 0.55); sg.strokePath();
    sg.beginPath(); sg.moveTo(sx - 10 * dpr, h * 0.56); sg.lineTo(sx - 10 * dpr, h * 0.48); sg.strokePath();
    sg.beginPath(); sg.moveTo(sx + 10 * dpr, h * 0.56); sg.lineTo(sx + 11 * dpr, h * 0.48); sg.strokePath();
    // scarf
    sg.fillStyle(0xd04a28, 1);
    sg.fillRect(sx - 5 * dpr, h * 0.46, 10 * dpr, 1.8 * dpr);
    sg.fillRect(sx - 2.5 * dpr, h * 0.46, 1 * dpr, 4 * dpr);
    sg.fillRect(sx + 1.5 * dpr, h * 0.46, 1 * dpr, 4 * dpr);
    // coal buttons
    sg.fillStyle(0x2a3950, 1);
    sg.fillCircle(sx, h * 0.55, 0.7 * dpr);
    sg.fillCircle(sx, h * 0.6, 0.7 * dpr);
    sg.fillCircle(sx, h * 0.65, 0.7 * dpr);
    // face — eyes, carrot, smile
    sg.fillCircle(sx - 1.5 * dpr, h * 0.39, 0.6 * dpr);
    sg.fillCircle(sx + 1.5 * dpr, h * 0.39, 0.6 * dpr);
    sg.fillStyle(0xe07a3a, 1);
    sg.lineStyle(0.4 * dpr, 0xa8521c, 1);
    sg.beginPath();
    sg.moveTo(sx - 0.5 * dpr, h * 0.41);
    sg.lineTo(sx + 3 * dpr, h * 0.42);
    sg.lineTo(sx - 0.5 * dpr, h * 0.43);
    sg.closePath();
    sg.fillPath();
    sg.strokePath();
    // hat
    sg.fillStyle(0x2a3950, 1);
    sg.fillRect(sx - 4.5 * dpr, h * 0.36, 9 * dpr, 1.4 * dpr);
    sg.fillRect(sx - 3 * dpr, h * 0.30, 6 * dpr, 5 * dpr);
    sg.fillStyle(0xd04a28, 1);
    sg.fillRect(sx - 3 * dpr, h * 0.32, 6 * dpr, 0.8 * dpr);
    this.layers.heroes.add(sg);

    // Breath puff — pulses
    const breath = this.add.image(sx + 5 * dpr, h * 0.4, "hwv-mote-gold").setTint(0xffffff).setAlpha(0).setScale(dpr * 0.8);
    this.tweens.add({
      targets: breath,
      alpha: { from: 0, to: 0.7 },
      x: { from: sx + 5 * dpr, to: sx + 10 * dpr },
      y: { from: h * 0.4, to: h * 0.37 },
      duration: 1200,
      hold: 0,
      ease: "Sine.easeOut",
      repeat: -1,
      repeatDelay: 800,
      yoyo: false,
      onRepeat: () => breath.setAlpha(0),
    });
    this.layers.heroes.add(breath);
  }

  // ─── Particle systems ──────────────────────────────────────────────────

  buildParticles() {
    const { dpr, h } = this.layout;
    this.emitters = {};

    // Spring: drifting petals
    const spring = this.zoneRects[0];
    if (spring) {
      this.emitters.spring = this.add.particles(0, 0, "hwv-petal-pink", {
        x: { min: spring.x, max: spring.x + spring.width },
        y: { min: -5 * dpr, max: 0 },
        lifespan: 4500,
        speedY: { min: 8 * dpr, max: 18 * dpr },
        speedX: { min: -8 * dpr, max: 8 * dpr },
        scale: { start: 0.5, end: 0.7 },
        rotate: { start: 0, end: 360 },
        alpha: { start: 0, end: 0.95, ease: "Sine.easeOut" },
        frequency: 280,
        quantity: 1,
      });
      // Mix in yellow petals
      this.emitters.springYellow = this.add.particles(0, 0, "hwv-petal-yellow", {
        x: { min: spring.x, max: spring.x + spring.width },
        y: { min: -5 * dpr, max: 0 },
        lifespan: 5000,
        speedY: { min: 8 * dpr, max: 16 * dpr },
        speedX: { min: -6 * dpr, max: 6 * dpr },
        scale: 0.55,
        rotate: { start: 0, end: 360 },
        alpha: { start: 0, end: 0.85 },
        frequency: 420,
        quantity: 1,
      });
      this.layers.particles.add(this.emitters.spring);
      this.layers.particles.add(this.emitters.springYellow);
    }

    // Summer: golden dust motes rising
    const summer = this.zoneRects[1];
    if (summer) {
      this.emitters.summer = this.add.particles(0, 0, "hwv-mote-gold", {
        x: { min: summer.x, max: summer.x + summer.width },
        y: h + 4 * dpr,
        lifespan: 3500,
        speedY: { min: -10 * dpr, max: -22 * dpr },
        speedX: { min: -4 * dpr, max: 4 * dpr },
        scale: { start: 0.4, end: 0.9 },
        alpha: { start: 0, end: 0.9 },
        frequency: 220,
        quantity: 1,
      });
      this.layers.particles.add(this.emitters.summer);
    }

    // Autumn: falling leaves (heavy)
    const autumn = this.zoneRects[2];
    if (autumn) {
      const leafTextures = ["hwv-leaf-red", "hwv-leaf-orange", "hwv-leaf-yellow"];
      leafTextures.forEach((t, ti) => {
        const emitter = this.add.particles(0, 0, t, {
          x: { min: autumn.x, max: autumn.x + autumn.width },
          y: { min: -8 * dpr, max: -2 * dpr },
          lifespan: 4500,
          speedY: { min: 12 * dpr, max: 22 * dpr },
          speedX: { min: -10 * dpr, max: 10 * dpr },
          scale: { start: 0.55, end: 0.65 },
          rotate: { start: 0, end: 540 },
          alpha: { start: 0, end: 0.95 },
          frequency: 260 + ti * 80,
          quantity: 1,
        });
        this.emitters[`autumn${ti}`] = emitter;
        this.layers.particles.add(emitter);
      });
    }

    // Winter: dense snowfall
    const winter = this.zoneRects[3];
    if (winter) {
      this.emitters.winterSmall = this.add.particles(0, 0, "hwv-flake-small", {
        x: { min: winter.x, max: winter.x + winter.width },
        y: { min: -8 * dpr, max: -2 * dpr },
        lifespan: 4000,
        speedY: { min: 10 * dpr, max: 18 * dpr },
        speedX: { min: -3 * dpr, max: 3 * dpr },
        scale: { start: 0.6, end: 0.8 },
        alpha: { start: 0, end: 0.95 },
        frequency: 100,
        quantity: 1,
      });
      this.emitters.winterLarge = this.add.particles(0, 0, "hwv-flake-large", {
        x: { min: winter.x, max: winter.x + winter.width },
        y: { min: -8 * dpr, max: -2 * dpr },
        lifespan: 4500,
        speedY: { min: 8 * dpr, max: 14 * dpr },
        speedX: { min: -2 * dpr, max: 2 * dpr },
        scale: { start: 0.7, end: 0.9 },
        alpha: { start: 0, end: 0.9 },
        frequency: 280,
        quantity: 1,
      });
      this.layers.particles.add(this.emitters.winterSmall);
      this.layers.particles.add(this.emitters.winterLarge);
    }
  }

  // ─── Labels ────────────────────────────────────────────────────────────

  buildLabels() {
    const { dpr, h } = this.layout;
    const names = ["SPRING", "SUMMER", "AUTUMN", "WINTER"];
    const labelColors = [0x9a3358, 0x7a5320, 0x8a3a14, 0x1f3a5a];
    this.zoneRects.forEach(({ x, width }, i) => {
      const txt = this.add.text(x + width / 2, h - 6 * dpr, names[i], {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${Math.max(8, 9 * dpr)}px`,
        fontStyle: "900",
        color: `#${labelColors[i].toString(16).padStart(6, "0")}`,
      }).setOrigin(0.5, 1).setShadow(0, 1 * dpr, "rgba(255,255,255,0.6)", 0);
      txt.setAlpha(0.75);
      this.layers.labels.add(txt);
    });
  }

  // ─── Numeral panel ─────────────────────────────────────────────────────

  buildNumeralPanel() {
    const { dpr, h, segW, numW } = this.layout;
    const seasonIdx = this.registry.get("hwv.seasonIdx") ?? 0;
    const palette = SEASON_PALETTES[seasonIdx] ?? SEASON_PALETTES[0];

    const bg = this.add.rectangle(segW, 0, numW, h, palette.panel).setOrigin(0, 0);
    this.layers.numeral.add(bg);
    const border = this.add.rectangle(segW, 0, Math.max(1, 1.5 * dpr), h, 0x3a2412, 0.7).setOrigin(0, 0);
    this.layers.numeral.add(border);

    const remaining = this.registry.get("hwv.turnsRemaining") ?? 0;
    this.numeralText = this.add.text(segW + numW / 2, h * 0.42, String(remaining), {
      fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
      fontSize: `${Math.max(16, 22 * dpr)}px`,
      fontStyle: "900",
      color: `#${palette.num.toString(16).padStart(6, "0")}`,
    }).setOrigin(0.5, 0.5);
    this.layers.numeral.add(this.numeralText);

    this.numeralLabel = this.add.text(segW + numW / 2, h - 8 * dpr, "TURNS LEFT", {
      fontFamily: "Georgia, serif",
      fontSize: `${Math.max(7, 8 * dpr)}px`,
      fontStyle: "800",
      color: `#${palette.num.toString(16).padStart(6, "0")}`,
    }).setOrigin(0.5, 1).setAlpha(0.85);
    this.layers.numeral.add(this.numeralLabel);
  }

  // ─── Wagon + horse + driver ────────────────────────────────────────────

  buildWagon() {
    const { dpr, h } = this.layout;
    const wagonContainer = this.add.container(0, h - 12 * dpr);
    wagonContainer.setSize(60 * dpr, 24 * dpr);
    this.wagonContainer = wagonContainer;

    // Horse — silhouette walking sprite (simple)
    const horseG = this.add.graphics();
    horseG.fillStyle(0x4a2810, 1);
    horseG.lineStyle(0.4 * dpr, 0x2a1810, 1);
    // body
    horseG.fillEllipse(-18 * dpr, -6 * dpr, 14 * dpr, 7 * dpr);
    horseG.strokeEllipse(-18 * dpr, -6 * dpr, 14 * dpr, 7 * dpr);
    // neck + head
    horseG.fillTriangle(-12 * dpr, -9 * dpr, -6 * dpr, -14 * dpr, -10 * dpr, -4 * dpr);
    horseG.fillRoundedRect(-7 * dpr, -16 * dpr, 5 * dpr, 4 * dpr, 0.8 * dpr);
    // ear
    horseG.fillTriangle(-5 * dpr, -16 * dpr, -3.5 * dpr, -18 * dpr, -3 * dpr, -15 * dpr);
    // tail
    horseG.fillTriangle(-25 * dpr, -6 * dpr, -28 * dpr, -2 * dpr, -25 * dpr, -2 * dpr);
    // mane
    horseG.fillStyle(0x2a1810, 1);
    horseG.fillRect(-12 * dpr, -12 * dpr, 4 * dpr, 4 * dpr);
    wagonContainer.add(horseG);

    // Legs — separate graphics so we can animate
    this.horseLegBack = this.add.graphics();
    this.horseLegFront = this.add.graphics();
    [this.horseLegBack, this.horseLegFront].forEach((leg) => {
      leg.fillStyle(0x4a2810, 1);
      leg.lineStyle(0.3 * dpr, 0x2a1810, 1);
      leg.fillRect(-1 * dpr, 0, 2 * dpr, 7 * dpr);
      wagonContainer.add(leg);
    });
    this.horseLegBack.setPosition(-22 * dpr, -3 * dpr);
    this.horseLegFront.setPosition(-14 * dpr, -3 * dpr);
    this.tweens.add({
      targets: this.horseLegBack,
      scaleY: { from: 1, to: 0.55 },
      yoyo: true,
      repeat: -1,
      duration: 230,
      ease: "Sine.easeInOut",
    });
    this.tweens.add({
      targets: this.horseLegFront,
      scaleY: { from: 0.55, to: 1 },
      yoyo: true,
      repeat: -1,
      duration: 230,
      ease: "Sine.easeInOut",
    });

    // Tongue/yoke between horse and wagon
    const tongue = this.add.graphics();
    tongue.lineStyle(0.8 * dpr, 0x3a2412, 1);
    tongue.beginPath();
    tongue.moveTo(-11 * dpr, -3 * dpr);
    tongue.lineTo(-3 * dpr, -2 * dpr);
    tongue.strokePath();
    wagonContainer.add(tongue);

    // Wagon bed
    const bed = this.add.graphics();
    bed.fillStyle(0xa8742e, 1);
    bed.lineStyle(0.7 * dpr, 0x3a2412, 1);
    bed.beginPath();
    bed.moveTo(-2 * dpr, -8 * dpr);
    bed.lineTo(14 * dpr, -8 * dpr);
    bed.lineTo(16 * dpr, -2 * dpr);
    bed.lineTo(-4 * dpr, -2 * dpr);
    bed.closePath();
    bed.fillPath();
    bed.strokePath();
    // bed planks
    bed.lineStyle(0.4 * dpr, 0x5a3010, 1);
    for (let p = 0; p < 5; p += 1) {
      const px = -2 * dpr + (p + 1) * 3 * dpr;
      bed.beginPath();
      bed.moveTo(px, -7.4 * dpr);
      bed.lineTo(px, -2.5 * dpr);
      bed.strokePath();
    }
    // back wall
    bed.fillStyle(0x5a3010, 1);
    bed.fillRect(13 * dpr, -13 * dpr, 1.6 * dpr, 6 * dpr);
    wagonContainer.add(bed);

    // Cargo plate (textured fill depending on season)
    this.wagonCargo = this.add.graphics();
    wagonContainer.add(this.wagonCargo);
    this.drawCargo(0);

    // Driver
    const driverG = this.add.graphics();
    driverG.fillStyle(0x7a4a1c, 1);
    driverG.lineStyle(0.4 * dpr, 0x3a2412, 1);
    // body
    driverG.fillTriangle(-2 * dpr, -12 * dpr, 2 * dpr, -12 * dpr, 0, -7 * dpr);
    driverG.fillCircle(0, -14 * dpr, 1.6 * dpr);
    // hat
    driverG.fillStyle(0x3a2412, 1);
    driverG.fillEllipse(0, -15.6 * dpr, 5 * dpr, 0.9 * dpr);
    driverG.fillRect(-1.6 * dpr, -17.5 * dpr, 3.2 * dpr, 2.2 * dpr);
    wagonContainer.add(driverG);

    // Wheels — rotating circles with cross spokes
    this.wagonWheels = [];
    for (const wx of [-2 * dpr, 12 * dpr]) {
      const wheel = this.add.graphics();
      wheel.x = wx;
      wheel.y = 1 * dpr;
      wheel.fillStyle(0x1a0e08, 1);
      wheel.fillCircle(0, 0, 4.5 * dpr);
      wheel.fillStyle(0x7a4a1c, 1);
      wheel.fillCircle(0, 0, 3.4 * dpr);
      wheel.lineStyle(0.55 * dpr, 0x1a0e08, 1);
      wheel.beginPath();
      wheel.moveTo(-3 * dpr, 0);
      wheel.lineTo(3 * dpr, 0);
      wheel.moveTo(0, -3 * dpr);
      wheel.lineTo(0, 3 * dpr);
      wheel.moveTo(-2.2 * dpr, -2.2 * dpr);
      wheel.lineTo(2.2 * dpr, 2.2 * dpr);
      wheel.moveTo(-2.2 * dpr, 2.2 * dpr);
      wheel.lineTo(2.2 * dpr, -2.2 * dpr);
      wheel.strokePath();
      wheel.fillStyle(0x1a0e08, 1);
      wheel.fillCircle(0, 0, 0.9 * dpr);
      wheel.fillStyle(0xa8742e, 1);
      wheel.fillCircle(0, 0, 0.4 * dpr);
      wagonContainer.add(wheel);
      this.wagonWheels.push(wheel);
      this.tweens.add({
        targets: wheel,
        rotation: Math.PI * 2,
        repeat: -1,
        duration: 1100,
        ease: "Linear",
      });
    }

    // Bob the whole container vertically
    this.tweens.add({
      targets: wagonContainer,
      y: { from: h - 12 * dpr, to: h - 13.5 * dpr },
      yoyo: true,
      repeat: -1,
      duration: 1200,
      ease: "Sine.easeInOut",
    });

    this.layers.wagon.add(wagonContainer);

    // Initial position
    const progress = this.computeProgress();
    this.wagonContainer.x = this.wagonTargetX(progress);
  }

  drawCargo(seasonIdx) {
    const { dpr } = this.layout;
    if (!this.wagonCargo) return;
    const g = this.wagonCargo;
    g.clear();
    if (seasonIdx === 0) {
      // bouquet of flowers
      const cx = 6 * dpr;
      const cy = -10 * dpr;
      g.lineStyle(0.6 * dpr, 0x3a7a2a, 1);
      g.beginPath(); g.moveTo(cx - 3 * dpr, cy + 2 * dpr); g.lineTo(cx - 3 * dpr, cy - 3 * dpr); g.strokePath();
      g.beginPath(); g.moveTo(cx, cy + 2 * dpr); g.lineTo(cx, cy - 4 * dpr); g.strokePath();
      g.beginPath(); g.moveTo(cx + 3 * dpr, cy + 2 * dpr); g.lineTo(cx + 3 * dpr, cy - 3 * dpr); g.strokePath();
      g.fillStyle(0xf06292, 1); g.fillCircle(cx - 3 * dpr, cy - 4 * dpr, 1.6 * dpr);
      g.fillStyle(0xffb74d, 1); g.fillCircle(cx, cy - 5 * dpr, 1.8 * dpr);
      g.fillStyle(0xba68c8, 1); g.fillCircle(cx + 3 * dpr, cy - 4 * dpr, 1.6 * dpr);
    } else if (seasonIdx === 1) {
      // wheat sheaf
      const cx = 6 * dpr;
      const cy = -10 * dpr;
      g.fillStyle(0xf0c14b, 1);
      g.lineStyle(0.4 * dpr, 0x7a5320, 1);
      g.fillEllipse(cx, cy - 1 * dpr, 8 * dpr, 4 * dpr);
      g.strokeEllipse(cx, cy - 1 * dpr, 8 * dpr, 4 * dpr);
      g.lineStyle(0.5 * dpr, 0x7a5320, 1);
      for (const dx of [-2.5, -1, 0.5, 2]) {
        g.beginPath();
        g.moveTo(cx + dx * dpr, cy - 3.5 * dpr);
        g.lineTo(cx + dx * dpr, cy + 1 * dpr);
        g.strokePath();
      }
      g.fillStyle(0x7a4a1c, 1);
      g.fillRect(cx - 3 * dpr, cy + 0.5 * dpr, 6 * dpr, 1.2 * dpr);
    } else if (seasonIdx === 2) {
      // pumpkins
      const cx = 6 * dpr;
      const cy = -9 * dpr;
      g.fillStyle(0xe07a3a, 1);
      g.lineStyle(0.4 * dpr, 0x7a3a14, 1);
      g.fillEllipse(cx - 3 * dpr, cy, 4 * dpr, 3 * dpr);
      g.fillEllipse(cx, cy - 1 * dpr, 5 * dpr, 4 * dpr);
      g.fillEllipse(cx + 3 * dpr, cy, 4 * dpr, 3 * dpr);
      g.strokeEllipse(cx, cy - 1 * dpr, 5 * dpr, 4 * dpr);
      g.fillStyle(0x3a7a2a, 1);
      g.fillRect(cx - 0.4 * dpr, cy - 4 * dpr, 0.8 * dpr, 1.4 * dpr);
    } else {
      // firewood logs
      const cx = 6 * dpr;
      const cy = -9 * dpr;
      g.fillStyle(0xa85822, 1);
      g.lineStyle(0.3 * dpr, 0x3a2412, 1);
      for (const [dx, dy] of [[-3, 0], [0, 0], [3, 0], [-1.5, -2.4], [1.5, -2.4], [0, -4.8]]) {
        g.fillEllipse(cx + dx * dpr, cy + dy * dpr, 2.6 * dpr, 2 * dpr);
        g.strokeEllipse(cx + dx * dpr, cy + dy * dpr, 2.6 * dpr, 2 * dpr);
      }
    }
  }

  // ─── State sync ────────────────────────────────────────────────────────

  computeProgress() {
    const turnsUsed = this.registry.get("hwv.turnsUsed") ?? 0;
    const turnBudget = this.registry.get("hwv.turnBudget") ?? 1;
    return Math.max(0, Math.min(1, turnsUsed / Math.max(1, turnBudget)));
  }

  wagonTargetX(progress) {
    const { segW } = this.layout;
    return Math.round(progress * segW);
  }

  syncFromRegistry() {
    const remaining = this.registry.get("hwv.turnsRemaining") ?? 0;
    const seasonIdx = this.registry.get("hwv.seasonIdx") ?? 0;
    if (this.numeralText) this.numeralText.setText(String(remaining));
    if (this.numeralText && this.numeralLabel) {
      const palette = SEASON_PALETTES[seasonIdx] ?? SEASON_PALETTES[0];
      const hex = `#${palette.num.toString(16).padStart(6, "0")}`;
      this.numeralText.setColor(hex);
      this.numeralLabel.setColor(hex);
    }
    if (this.wagonContainer) {
      const x = this.wagonTargetX(this.computeProgress());
      this.tweens.add({
        targets: this.wagonContainer,
        x,
        duration: 500,
        ease: "Cubic.easeOut",
      });
    }
    if (this.wagonCargo) this.drawCargo(seasonIdx);
  }

  onRegistryChange(_parent, key) {
    if (!key.startsWith("hwv.")) return;
    if (key === "hwv.turnBudget") {
      this.rebuildLayout();
      return;
    }
    this.syncFromRegistry();
  }
}
