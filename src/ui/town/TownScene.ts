import Phaser from "phaser";
import { SMOKE_BUILDINGS } from "./config.js";
import { renderGround, type GroundSpec } from "./proceduralGround.js";
import {
  ensureSmokeTextures,
  makeSmokeColumn,
  advanceSmokeColumn,
  makeEmberGlow,
  EMBER_GLOW_KEY,
  type SmokeColumn,
} from "../../textures/smoke.js";
import { TOWN_TILES, ttKey, ttOriginY, TREE_SPECIES } from "./tiles/manifest.js";
import { makeWaterOverlay, advanceWaterOverlay, destroyWaterOverlay, type WaterOverlay } from "./water.js";
import { mulberry32 } from "../../rng.js";

interface Pt { x: number; y: number }

export interface TownPlanLot { index: number; cx: number; cy: number; w: number; h: number; row: string }
export interface TownPlanRoad { points: Pt[]; width: number; kind: "main" | "branch" | "loop" }
export interface TownPlanWater { kind: "pond" | "river" | "shore"; polygon?: Pt[]; path?: Pt[]; width?: number }
export interface TownPlanTree { x: number; y: number; r: number; cluster: number; front?: boolean; species?: string }
export interface TownPlanWaypoint { x: number; y: number }
export interface TownPlanBridge { x: number; y: number; angle: number; width: number }
export interface TownPlanField { cx: number; cy: number; w: number; h: number; rows: number; angle: number }
export interface TownPlanFence { points: Pt[] }
export interface TownPlanLotDecor { lot: number; x: number; y: number; kind: "bed" | "pots" | "shrub" }
export interface TownPlanStreetTree { x: number; y: number; r: number }
export interface TownPlanProp { kind: string; x: number; y: number }

export interface TownPlan {
  width: number;
  height: number;
  /**
   * Optional hand-authored ground layer (Zone Tier Ladder). 30 rows × 40 cols
   * of tileset indices; -1 leaves a cell blank. When present, the scene paints
   * the ground straight from it and skips the procedural grass/water/road
   * passes — the object layer (lots/boards/props) is unchanged.
   */
  groundTiles?: number[][];
  /**
   * Optional hand-rolled procedural ground (SDF terrain). When present it's baked
   * into a resolution-scalable texture and drawn instead of `groundTiles`. See
   * `proceduralGround.ts`.
   */
  groundSpec?: GroundSpec;
  plaza: { cx: number; cy: number; rx: number; ry: number };
  well: { cx: number; cy: number; r: number };
  lots: TownPlanLot[];
  boards: Array<{ kind: string; cx: number; cy: number; w: number; h: number }>;
  roads: TownPlanRoad[];
  water: TownPlanWater[];
  trees: TownPlanTree[];
  waypoints: TownPlanWaypoint[];
  edges: Array<[number, number]>;
  bridges: TownPlanBridge[];
  fields: TownPlanField[];
  fences: TownPlanFence[];
  lotDecor: TownPlanLotDecor[];
  streetTrees: TownPlanStreetTree[];
  props?: TownPlanProp[];
}

// ── Tuxemon tileset indices (0-based, 24 cols, 32px, extruded margin=1 spacing=2)
// Verified by slicing public/town/tileset.png into a labelled montage.
const T = {
  GRASS: 125,                                  // clean flat grass (blob centre — no baked fleck)
  GRASS_ALT: [126, 189] as const,              // genuinely clean grass variants (subtle, no sand)
  GRASS_FLOWER: [120, 121] as const,           // poppy + clover on grass (opaque)
  DIRT: 173,                                   // clean tan path (sand-blob centre; roads / plaza / fields)
  WATER: 250,                                  // deep solid water
};
// NB: 26/35 and the 50/51/76/77/98/99 "variants" are NOT flat — each carries a
// baked dark fleck / sand patch (they're grass↔sand transition tiles). Used as a
// flat fill they line up into a regular grid of "smudges". The clean interiors are
// 125 (grass) and 173 (sand, the centre of the autotiler's blob).

// Multi-tile sprite recipes baked into standalone textures (avoids extrusion
// seams, gains transparency). [gridCols, gridRows, tileIndices...]
const PINE = { key: "town_pine", cols: 1, rows: 2, idx: [168, 192], oh: 64 };   // tall conifer
const TREE2 = { key: "town_tree2", cols: 1, rows: 1, idx: [299], oh: 32 };      // round broadleaf canopy
const FOUNTAIN = { key: "town_fountain", cols: 3, rows: 3, idx: [272, 273, 274, 296, 297, 298, 320, 321, 322], oh: 96 };
const BUSH = { key: "town_bush", cols: 1, rows: 1, idx: [275], oh: 32 };
const SIGN = { key: "town_sign", cols: 1, rows: 1, idx: [358], oh: 32 };
const ROCK = { key: "town_rock", cols: 1, rows: 1, idx: [323], oh: 32 };
const ORE = { key: "town_ore", cols: 1, rows: 1, idx: [324], oh: 32 };

const GRID_COLS = 40; // 1280 / 32
const GRID_ROWS = 30; // 960 / 32
const TILE = 32;

export class TownScene extends Phaser.Scene {
  plan!: TownPlan;
  builtLots: Set<number> = new Set();
  buildingsMap: Record<number, string> = {}; // lotIndex -> buildingId
  pendingBuilding: { id: string; name: string } | null = null;

  map!: Phaser.Tilemaps.Tilemap;
  tileset!: Phaser.Tilemaps.Tileset;
  groundLayer!: Phaser.Tilemaps.TilemapLayer;

  buildingSprites: Map<number, Phaser.GameObjects.Sprite> = new Map();
  plotMarkers: Map<number, Phaser.GameObjects.Container> = new Map();
  boardZones: Phaser.GameObjects.Zone[] = []; // board hit areas, disabled while placing
  villagers: Phaser.GameObjects.Sprite[] = [];
  decorLayer!: Phaser.GameObjects.Layer; // depth-sorted props/trees/buildings

  // Ambient chimney smoke + hearth/forge ember glow. Rebuilt alongside the
  // buildings they belong to (see rebuildBuildingsAndPlots) so they never leak.
  smokeColumns: SmokeColumn[] = [];
  emberGlows: Phaser.GameObjects.Image[] = [];
  // Animated flowing-water overlay (river/pond) + the per-prop ambient glows
  // (lamps/lanterns) created alongside the static props in create().
  waterOverlay: WaterOverlay | null = null;
  propGlows: Phaser.GameObjects.Image[] = [];
  private _fxTime = 0; // seconds accumulator driving the smoke wobble

  isDragging = false;
  // Arrow-key cursors for keyboard panning (set up in setupCameraControls).
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  // Once the player pans/zooms, stop auto-recentring on resize so we don't yank
  // the camera away from where they left it. Until then the resting framing
  // tracks the viewport (matching the historical centre-lock behaviour).
  userAdjustedCamera = false;
  initialCameraState?: { scrollX: number; scrollY: number; zoom: number };
  // Which settlement this scene is currently rendering. Lets the React bridge
  // persist/restore the right camera when restarting the scene for a new zone.
  zoneId?: string;

  constructor() {
    super("TownScene");
  }

  init(data: { plan: TownPlan; builtLots?: Set<number>; buildingsMap?: Record<number, string>; pendingBuilding?: { id: string; name: string } | null; initialCameraState?: { scrollX: number; scrollY: number; zoom: number }; zoneId?: string }) {
    this.plan = data.plan;
    this.builtLots = data.builtLots || new Set();
    this.buildingsMap = data.buildingsMap || {};
    this.pendingBuilding = data.pendingBuilding || null;
    this.initialCameraState = data.initialCameraState;
    this.zoneId = data.zoneId;
  }

  preload() {
    // Guard against re-load on scene.restart() (the React bridge restarts the
    // scene with plan data after boot), which otherwise warns "key already in use".
    if (!this.textures.exists("tileset")) this.load.image("tileset", "town/tileset.png");
    if (!this.textures.exists("character")) this.load.atlas("character", "town/character-atlas.png", "town/character-atlas.json");

    // Rasterize the building SVGs through the loader so they're in the texture
    // cache BEFORE create() runs its first rebuildBuildingsAndPlots. Baking them
    // in create() (the old path) decoded each via an async Image.onload, so the
    // ground/plots painted immediately and the buildings only "blinked in" a
    // frame or two later when each decode resolved. Going through preload makes
    // the loader hold create() until they're ready, so the town renders atomically.
    // The registry is set in TownPhaserCanvas's postBoot before the plan-carrying
    // restart, so svgMap is present on every pass where create() actually runs
    // (the dataless auto-start pass bails in create()).
    const svgMap = (this.registry.get("hwv.svgMap") as Record<string, string>) || {};
    for (const [id, svg] of Object.entries(svgMap)) {
      const key = `building_${id}`;
      if (!this.textures.exists(key)) this.load.image(key, this.buildingSvgDataUri(svg));
    }
  }

  create() {
    // Phaser auto-starts this scene once with no data before TownPhaserCanvas
    // restarts it with the real plan. Bail cleanly on that dataless pass — every
    // ground/object pass below dereferences `this.plan`, so without this guard an
    // undefined plan throws and wedges the scene at CREATING (it then ignores the
    // follow-up restart, leaving a blank town).
    if (!this.plan) return;
    this.bakeSpriteTextures();
    this.bakeTownTiles();
    // Building SVG textures are rasterized in preload() (see there) so they're
    // ready before the first rebuildBuildingsAndPlots below — no async pop-in.
    this.createCharacterAnims();
    ensureSmokeTextures(this);

    // ── Tilemap ground (grass base, dirt roads/plaza, water) ────────────────
    this.map = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: GRID_COLS, height: GRID_ROWS });
    const tilesetImg = this.map.addTilesetImage("tiles", "tileset", TILE, TILE, 1, 2);
    if (!tilesetImg) return;
    this.tileset = tilesetImg;

    this.groundLayer = this.map.createBlankLayer("ground", this.tileset)!;
    this.groundLayer.setDepth(-1000);
    if (this.plan.groundSpec && this.paintProceduralGround(this.plan.groundSpec)) {
      // Hand-rolled SDF terrain (resolution-scalable) — preferred when authored.
    } else if (this.plan.groundTiles) {
      // Hand-authored ground (Zone Tier Ladder) — paint straight from the grid.
      this.paintGroundTiles();
    } else {
      this.paintGrass();
      this.paintWater();   // under roads so bridges read on top
      this.paintRoads();
      this.paintPlaza();
      this.paintFields();
      this.paintBridges();
      this.scatterGroundDetail();
    }

    // ── Animated flowing-water overlay (river/pond), under every prop ───────────
    this.propGlows = [];
    this.waterOverlay = this.plan.groundSpec ? makeWaterOverlay(this, this.plan.groundSpec) : null;

    // ── Depth-sorted object layer ───────────────────────────────────────────
    this.drawBoards();
    this.drawTrees();
    this.drawStreetTrees();
    this.drawProps();
    this.drawFences();
    this.drawLotDecor();
    this.rebuildBuildingsAndPlots();
    this.spawnVillagers();

    // The water overlay's geometry-mask graphics isn't on the display list, so the
    // scene's shutdown won't auto-destroy it — tear it down explicitly on restart.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      destroyWaterOverlay(this.waterOverlay);
      this.waterOverlay = null;
      this.propGlows = [];
    });

    // ── Camera ──────────────────────────────────────────────────────────────
    if (this.initialCameraState) {
      this.cameras.main.setZoom(this.initialCameraState.zoom);
      this.cameras.main.scrollX = this.initialCameraState.scrollX;
      this.cameras.main.scrollY = this.initialCameraState.scrollY;
    } else {
      // restCamera sets the cover zoom + centres (no fixed 1.0 — that left a
      // blank grass margin above/below the 4:3 map on a portrait phone).
      this.restCamera();
    }
    this.cameras.main.setBackgroundColor("#4e7a39");
    this.setupCameraControls();
    this.clampCamera();
    this.scale.on("resize", () => {
      // Keep a fresh (un-panned) town centred as the viewport changes; once the
      // player has moved the camera, just keep their position in bounds.
      if (!this.userAdjustedCamera && !this.initialCameraState) this.restCamera();
      this.clampCamera();
    });

    this.events.on("town.update_built", (data: { builtLots: Set<number>; buildingsMap: Record<number, string>; pendingBuilding: { id: string; name: string } | null }) => {
      this.builtLots = data.builtLots;
      this.buildingsMap = data.buildingsMap;
      this.pendingBuilding = data.pendingBuilding;
      this.rebuildBuildingsAndPlots();
      this.freezeAmbientForVisualTest();
    });

    // Freeze ambient motion to a deterministic frame under the visual harness.
    this.freezeAmbientForVisualTest();

    // Signal that a real (plan-carrying) create() has finished all its
    // synchronous baking/building. The early `if (!this.plan) return` above
    // means reaching here guarantees the heavy bake ran, so the React host can
    // safely dismiss its loading overlay now (not at Phaser-constructor time,
    // which is a frame too early and leaves the bare green canvas visible).
    this.events.emit("town.ready");
  }

  // ── Texture baking ──────────────────────────────────────────────────────────
  /** Bake a multi-tile recipe into a single transparent texture. */
  bakeRecipe(recipe: { key: string; cols: number; rows: number; idx: number[] }) {
    if (this.textures.exists(recipe.key)) return;
    const src = this.textures.get("tileset").getSourceImage() as HTMLImageElement;
    const ct = this.textures.createCanvas(recipe.key, recipe.cols * TILE, recipe.rows * TILE);
    if (!ct) return;
    recipe.idx.forEach((idx, i) => {
      if (idx < 0) return;
      const sc = idx % 24, sr = Math.floor(idx / 24);
      const sx = 1 + sc * 34, sy = 1 + sr * 34;
      const dc = i % recipe.cols, dr = Math.floor(i / recipe.cols);
      ct.context.drawImage(src, sx, sy, TILE, TILE, dc * TILE, dr * TILE, TILE, TILE);
    });
    ct.refresh();
  }

  bakeSpriteTextures() {
    [PINE, TREE2, FOUNTAIN, BUSH, SIGN, ROCK, ORE].forEach((r) => this.bakeRecipe(r));
  }

  /**
   * Inject an explicit `xmlns` + pixel width/height into a building's SVG markup
   * and return it as a rasterizable data URI. The building SVGs size themselves
   * via `viewBox` + Tailwind `w-full h-full`, which carry no intrinsic dimensions
   * when rasterized standalone (no CSS context) — without this they'd decode at
   * 0×0. We bake at 3× the viewBox for crispness, then the sprite scales to the
   * lot. `renderToStaticMarkup` emits no `xmlns`, so the data URI would otherwise
   * be parsed as generic XML and rejected by <img>. Consumed by the preload loader.
   */
  buildingSvgDataUri(svg: string): string {
    const SCALE = 3;
    const vb = svg.match(/viewBox="([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)"/);
    const vbw = vb ? parseFloat(vb[3]) : 100;
    const vbh = vb ? parseFloat(vb[4]) : 100;
    const w = Math.max(1, Math.round(vbw * SCALE));
    const h = Math.max(1, Math.round(vbh * SCALE));
    const attrs = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"`;
    const sized = svg.replace(/<svg\b/, attrs);
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(sized);
  }

  /**
   * Bake the reusable VECTOR tileset (manifest) into transparent textures keyed
   * `tt_<name>`. Each Canvas-2D draw lives in a centred icon space (ground contact
   * at ~y+22); we translate to the box centre and bake at 3× for crispness. Cached
   * by key, so the one-time bake survives scene restarts.
   */
  bakeTownTiles() {
    const dpr = 3;
    for (const [name, spec] of Object.entries(TOWN_TILES)) {
      const key = ttKey(name);
      if (this.textures.exists(key)) continue;
      const tex = this.textures.createCanvas(key, Math.ceil(spec.box * dpr), Math.ceil(spec.box * dpr));
      if (!tex) continue;
      const ctx = tex.getContext();
      ctx.scale(dpr, dpr);
      ctx.translate(spec.box / 2, spec.box / 2);
      spec.draw(ctx);
      tex.refresh();
    }
  }

  /**
   * Place a baked vector tile as a ground-anchored, depth-sorted sprite. `boxH` is
   * the desired on-screen height of the tile's square box (world px). Returns null
   * when the texture isn't baked (caller falls back to a Tuxemon recipe). The
   * vector draws carry their own ground shadow, so callers must NOT add another.
   */
  placeTownTile(name: string, x: number, y: number, boxH: number, opts: { flip?: boolean; depth?: number } = {}): Phaser.GameObjects.Image | null {
    const spec = TOWN_TILES[name];
    const key = ttKey(name);
    if (!spec || !this.textures.exists(key)) return null;
    const sp = this.add.image(x, y, key);
    sp.setOrigin(0.5, ttOriginY(spec));
    sp.setScale(boxH / sp.height);
    if (opts.flip) sp.setFlipX(true);
    sp.setDepth(opts.depth ?? y);
    return sp;
  }

  /**
   * A gentle, stagger-phased canopy sway: a small rotation about the sprite's base
   * origin so it BENDS rather than slides. Registered on the tween manager, so it
   * freezes when the scene pauses and dies with the sprite on restart.
   */
  addSway(sp: Phaser.GameObjects.Image, amount = 0.03, dur = 2600) {
    this.tweens.add({
      targets: sp,
      rotation: { from: -amount, to: amount },
      duration: dur + Math.random() * 900,
      delay: Math.random() * 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  /** A warm additive glow that pulses (lamps/lanterns), tracked for teardown. */
  addPropGlow(x: number, y: number, scale: number) {
    const glow = this.add.image(x, y, EMBER_GLOW_KEY).setBlendMode(Phaser.BlendModes.ADD).setScale(scale).setAlpha(0.5);
    glow.setDepth(y + 0.5);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.35, to: 0.7 },
      scale: { from: scale * 0.85, to: scale * 1.08 },
      duration: 1500 + Math.random() * 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.propGlows.push(glow);
  }

  createCharacterAnims() {
    const dirs = ["front", "back", "left", "right"] as const;
    dirs.forEach((d) => {
      const key = `misa-${d}-walk`;
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNames("character", { prefix: `misa-${d}-walk.`, start: 0, end: 3, zeroPad: 3 }),
        frameRate: 10,
        repeat: -1,
      });
    });
  }

  // ── Ground painting ─────────────────────────────────────────────────────────
  inBounds(tx: number, ty: number) { return tx >= 0 && tx < GRID_COLS && ty >= 0 && ty < GRID_ROWS; }
  putGround(idx: number, tx: number, ty: number) { if (this.inBounds(tx, ty)) this.groundLayer.putTileAt(idx, tx, ty); }

  paintGrass() {
    this.groundLayer.fill(T.GRASS);
  }

  /**
   * Bake the hand-rolled SDF terrain into a texture and draw it as the ground.
   * The texture is keyed (and so cached by Phaser) across scene restarts, so the
   * one-time bake happens at most once per (zone, tier). Returns false on failure
   * so the caller can fall back to the tile ground.
   */
  paintProceduralGround(spec: GroundSpec): boolean {
    const key = `procground_${spec.key ?? `${spec.width}x${spec.height}_${spec.seed}`}`;
    try {
      if (!this.textures.exists(key)) {
        // 1.5× the design resolution keeps the ground crisp at typical zoom while
        // keeping the one-time bake snappy; the SDF art is smooth, so any further
        // upscale degrades gracefully (no staircase). Cached by key across restarts.
        const SCALE = 1.5;
        const img = renderGround(spec, SCALE);
        const canvasTex = this.textures.createCanvas(key, img.width, img.height);
        if (!canvasTex) return false;
        const idata = canvasTex.context.createImageData(img.width, img.height);
        idata.data.set(img.data);
        canvasTex.context.putImageData(idata, 0, 0);
        canvasTex.refresh();
      }
      const ground = this.add.image(0, 0, key).setOrigin(0, 0);
      ground.setDisplaySize(this.plan.width, this.plan.height);
      ground.setDepth(-1000);
      return true;
    } catch (e) {
      console.warn("[town] procedural ground bake failed; falling back to tiles", e);
      return false;
    }
  }

  /** Paint the ground layer directly from an authored tile grid (rows × cols). */
  paintGroundTiles() {
    const grid = this.plan.groundTiles;
    if (!grid) return;
    for (let ty = 0; ty < GRID_ROWS; ty++) {
      const row = grid[ty];
      if (!row) continue;
      for (let tx = 0; tx < GRID_COLS; tx++) {
        const idx = row[tx];
        if (idx >= 0) this.putGround(idx, tx, ty);
      }
    }
  }

  /** Paint a band of `idx` tiles `widthTiles` thick along an axis-aligned segment. */
  paintBand(a: Pt, b: Pt, widthTiles: number, idx: number) {
    const tx1 = Math.round(a.x / TILE), ty1 = Math.round(a.y / TILE);
    const tx2 = Math.round(b.x / TILE), ty2 = Math.round(b.y / TILE);
    const half = Math.floor(widthTiles / 2);
    const extra = widthTiles - 1 - half; // bias for even widths
    if (ty1 === ty2) {
      // horizontal
      const x0 = Math.min(tx1, tx2), x1 = Math.max(tx1, tx2);
      for (let x = x0; x <= x1; x++)
        for (let o = -half; o <= extra; o++) this.putGround(idx, x, ty1 + o);
    } else if (tx1 === tx2) {
      // vertical
      const y0 = Math.min(ty1, ty2), y1 = Math.max(ty1, ty2);
      for (let y = y0; y <= y1; y++)
        for (let o = -half; o <= extra; o++) this.putGround(idx, tx1 + o, y);
    } else {
      // diagonal — rasterise as a thick line of stamped blocks
      this.stampThickLine(a, b, widthTiles, idx);
    }
  }

  stampThickLine(a: Pt, b: Pt, widthTiles: number, idx: number) {
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(dist / (TILE / 2)));
    const half = Math.floor(widthTiles / 2);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = Math.round((a.x + (b.x - a.x) * t) / TILE);
      const cy = Math.round((a.y + (b.y - a.y) * t) / TILE);
      for (let ox = -half; ox <= half; ox++)
        for (let oy = -half; oy <= half; oy++) this.putGround(idx, cx + ox, cy + oy);
    }
  }

  paintRoads() {
    this.plan.roads.forEach((rd) => {
      const wt = Math.max(1, Math.round(rd.width / TILE));
      for (let i = 0; i < rd.points.length - 1; i++) {
        this.paintBand(rd.points[i], rd.points[i + 1], wt, T.DIRT);
      }
    });
  }

  paintPlaza() {
    const p = this.plan.plaza;
    const tx = Math.round(p.cx / TILE), ty = Math.round(p.cy / TILE);
    const rx = Math.max(1, Math.round(p.rx / TILE)), ry = Math.max(1, Math.round(p.ry / TILE));
    for (let x = tx - rx; x <= tx + rx; x++) {
      for (let y = ty - ry; y <= ty + ry; y++) {
        const val = ((x - tx) ** 2) / (rx * rx) + ((y - ty) ** 2) / (ry * ry);
        if (val <= 1.02) this.putGround(T.DIRT, x, y);
      }
    }
  }

  paintFields() {
    this.plan.fields.forEach((f) => {
      const tx = Math.round((f.cx - f.w / 2) / TILE), ty = Math.round((f.cy - f.h / 2) / TILE);
      const tw = Math.round(f.w / TILE), th = Math.round(f.h / TILE);
      for (let x = tx; x < tx + tw; x++)
        for (let y = ty; y < ty + th; y++) this.putGround(T.DIRT, x, y);
    });
  }

  paintWater() {
    this.plan.water.forEach((w) => {
      if (w.path) {
        const wt = Math.max(2, Math.round((w.width ?? 48) / TILE));
        for (let i = 0; i < w.path.length - 1; i++) this.stampThickLine(w.path[i], w.path[i + 1], wt, T.WATER);
      }
      if (w.polygon) {
        const xs = w.polygon.map((p) => p.x), ys = w.polygon.map((p) => p.y);
        const x0 = Math.round(Math.min(...xs) / TILE), x1 = Math.round(Math.max(...xs) / TILE);
        const y0 = Math.round(Math.min(...ys) / TILE), y1 = Math.round(Math.max(...ys) / TILE);
        for (let x = x0; x <= x1; x++) {
          for (let y = y0; y <= y1; y++) {
            if (this.pointInPoly({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 }, w.polygon)) this.putGround(T.WATER, x, y);
          }
        }
      }
    });
  }

  pointInPoly(p: Pt, poly: Pt[]): boolean {
    let inside = false;
    for (let i = 0, k = poly.length - 1; i < poly.length; k = i++) {
      const a = poly[i], b = poly[k];
      if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }

  paintBridges() {
    this.plan.bridges.forEach((b) => {
      const tx = Math.round(b.x / TILE), ty = Math.round(b.y / TILE);
      const tw = Math.max(2, Math.round(b.width / TILE));
      const half = Math.floor(tw / 2);
      // span dirt across the river in the road direction
      const horizontal = Math.abs(Math.cos(b.angle)) >= Math.abs(Math.sin(b.angle));
      for (let m = -half - 1; m <= half + 1; m++) {
        for (let o = -half; o <= half; o++) {
          if (horizontal) this.putGround(T.DIRT, tx + m, ty + o);
          else this.putGround(T.DIRT, tx + o, ty + m);
        }
      }
    });
  }

  /** Sprinkle deterministic grass variants + flower clusters for life. */
  scatterGroundDetail() {
    // Seeded by plan dimensions so it's stable per zone render.
    const rnd = mulberry32((this.plan.lots.length * 2654435761) >>> 0);
    for (let x = 0; x < GRID_COLS; x++) {
      for (let y = 0; y < GRID_ROWS; y++) {
        const tile = this.groundLayer.getTileAt(x, y);
        if (!tile || tile.index !== T.GRASS) continue;
        const r = rnd();
        if (r < 0.04) this.putGround(T.GRASS_FLOWER[Math.floor(rnd() * T.GRASS_FLOWER.length)], x, y);
        else if (r < 0.20) this.putGround(T.GRASS_ALT[Math.floor(rnd() * T.GRASS_ALT.length)], x, y);
      }
    }
  }

  // ── Object props (depth-sorted by baseline Y) ───────────────────────────────
  addShadow(x: number, y: number, rx: number, ry: number, depth: number, alpha = 0.22) {
    const sh = this.add.ellipse(x, y, rx, ry, 0x000000, alpha);
    sh.setDepth(depth - 1);
    return sh;
  }

  drawTrees() {
    this.plan.trees.forEach((t) => {
      // Vector species (reused from the shared tree catalog). cluster + position
      // pick a stable species when the author didn't name one, for natural variety.
      const species = t.species ?? TREE_SPECIES[(t.cluster + Math.round(Math.abs(t.x) + Math.abs(t.y))) % TREE_SPECIES.length];
      const sp = this.placeTownTile(species, t.x, t.y, t.r * 6);
      if (sp) { this.addSway(sp, 0.02); return; }
      // Fallback: the old Tuxemon recipes (kept for any zone without vector art).
      const round = (t.cluster % 2 === 1);
      const sprite = this.add.image(t.x, t.y, round ? TREE2.key : PINE.key);
      if (round) {
        sprite.setOrigin(0.5, 0.82);
        sprite.setScale(Math.max(1.5, (t.r * 3.2) / TILE));
      } else {
        sprite.setOrigin(0.5, 1);
        sprite.setScale(Math.max(0.9, (t.r * 2.4) / TILE));
      }
      sprite.setDepth(t.y);
      this.addShadow(t.x, t.y - 2, t.r * 1.6, t.r * 0.55, t.y);
    });
  }

  drawStreetTrees() {
    this.plan.streetTrees.forEach((t) => {
      const sp = this.placeTownTile("bush", t.x, t.y, t.r * 3.4);
      if (sp) { this.addSway(sp, 0.03); return; }
      const sprite = this.add.image(t.x, t.y, BUSH.key);
      sprite.setOrigin(0.5, 0.85);
      sprite.setScale(Math.max(0.8, (t.r * 2) / TILE));
      sprite.setDepth(t.y);
      this.addShadow(t.x, t.y, t.r * 1.4, t.r * 0.5, t.y, 0.18);
    });
  }

  // How tall (world px) each prop kind's baked box renders. Tuned so the vector
  // props sit naturally against the 104px-tall building lots.
  private static readonly PROP_BOX_H: Record<string, number> = {
    fountain: 104, signpost: 74, lamp: 92, lantern: 60, barrel: 54, well_bucket: 60,
    flower_pot: 56, picket_fence: 70, bench: 64, birdhouse: 62, market_stall: 104,
    rowboat: 86, dock_post: 70, boulder: 58, rock_cluster: 56, bush: 56, berry_bush: 56,
    hedge: 64, log_pile: 66, plank_stack: 60, stone_pile: 60, crate: 50, sacks: 52,
    hay_bale: 64, sawhorse: 56, cattail: 66, water_lily: 48,
  };

  // Map an authored prop `kind` to a manifest tile name (most are 1:1).
  private static readonly PROP_TILE: Record<string, string> = {
    lamppost: "lamp", planter: "flower_pot", cart: "crate", reeds: "cattail", lilypad: "water_lily",
  };

  drawProps() {
    const props = this.plan.props ?? [];
    // Fountain stands in for the plaza well — the vector centrepiece.
    const well = this.plan.well;
    if (!this.placeTownTile("fountain", well.cx, well.cy + 8, TownScene.PROP_BOX_H.fountain)) {
      const fountain = this.add.image(well.cx, well.cy + 8, FOUNTAIN.key);
      fountain.setOrigin(0.5, 0.7).setScale(0.7).setDepth(well.cy + 8);
      this.addShadow(well.cx, well.cy + 12, 64, 22, well.cy + 8, 0.2);
    }

    props.forEach((p) => {
      if (p.kind === "well") return; // replaced by the fountain
      const name = TownScene.PROP_TILE[p.kind] ?? p.kind;
      const boxH = TownScene.PROP_BOX_H[name] ?? 60;
      const sp = this.placeTownTile(name, p.x, p.y, boxH, { flip: !!((Math.round(p.x) >> 1) & 1) });
      if (sp) {
        if (name === "lamp" || name === "lantern") this.addPropGlow(p.x, p.y - boxH * 0.34, boxH / 100);
        else if (name === "cattail" || name === "bush" || name === "berry_bush") this.addSway(sp, 0.035);
        else if (name === "rowboat") this.tweens.add({ targets: sp, y: p.y - 2, rotation: 0.02, duration: 2200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        return;
      }
      // Fallback for the old recipe-only kinds.
      if (p.kind === "signpost") this.add.image(p.x, p.y, SIGN.key).setOrigin(0.5, 0.9).setDepth(p.y);
      else if (p.kind === "planter" || p.kind === "cart") this.add.image(p.x, p.y, BUSH.key).setOrigin(0.5, 0.85).setDepth(p.y);
      else if (p.kind === "lamppost") {
        const g = this.add.graphics();
        g.fillStyle(0x4a3b2a, 1).fillRect(p.x - 2, p.y - 26, 4, 26);
        g.fillStyle(0xffe9a8, 1).fillCircle(p.x, p.y - 28, 5);
        g.setDepth(p.y);
        this.addShadow(p.x, p.y, 14, 6, p.y, 0.16);
      }
    });
  }

  drawFences() {
    this.plan.fences.forEach((f) => {
      const g = this.add.graphics();
      g.lineStyle(3, 0x8a6a44, 1);
      f.points.forEach((p, i) => { if (i === 0) g.beginPath(), g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); });
      g.strokePath();
      g.fillStyle(0x6f5435, 1);
      f.points.forEach((p) => g.fillRect(p.x - 2, p.y - 8, 4, 10));
      g.setDepth(f.points[0]?.y ?? 0);
    });
  }

  drawLotDecor() {
    this.plan.lotDecor.forEach((d) => {
      if (d.kind === "shrub") {
        if (this.placeTownTile("bush", d.x, d.y, 48)) return;
        this.add.image(d.x, d.y, BUSH.key).setOrigin(0.5, 0.85).setScale(0.7).setDepth(d.y);
      } else {
        // bed / pots → a vector flower pot, or a flower tile in the ground layer.
        if (this.placeTownTile("flower_pot", d.x, d.y, 52)) return;
        this.putGround(T.GRASS_FLOWER[(d.x + d.y) % T.GRASS_FLOWER.length], Math.round(d.x / TILE), Math.round(d.y / TILE));
      }
    });
  }

  drawBoards() {
    this.plan.boards.forEach((b) => {
      const tx = Math.round((b.cx - b.w / 2) / TILE), ty = Math.round((b.cy - b.h / 2) / TILE);
      const tw = Math.round(b.w / TILE), th = Math.round(b.h / TILE);
      // Thematic ground bed for each board.
      for (let x = tx; x < tx + tw; x++) {
        for (let y = ty; y < ty + th; y++) {
          if (b.kind === "fish") this.putGround(T.WATER, x, y);
          else this.putGround(T.DIRT, x, y);
        }
      }
      if (b.kind === "mine") {
        // scatter ore boulders on the dirt
        for (let i = 0; i < 4; i++) {
          const rx = b.cx + (i % 2 ? 1 : -1) * b.w * 0.22;
          const ry = b.cy + (i < 2 ? -1 : 1) * b.h * 0.22;
          const o = this.add.image(rx, ry, i % 2 ? ORE.key : ROCK.key);
          o.setOrigin(0.5, 0.85).setDepth(ry);
        }
      }

      const label = b.kind === "farm" ? "Farm" : b.kind === "mine" ? "Mine" : "Harbor";
      const color = b.kind === "farm" ? "#a8e063" : b.kind === "mine" ? "#d8d2c4" : "#7abaf7";
      const marker = this.add.container(b.cx, b.cy);
      marker.setDepth(b.cy + b.h / 2 + 1);

      const border = this.add.graphics();
      border.lineStyle(2, Phaser.Display.Color.HexStringToColor(color).color, 0.8);
      border.strokeRoundedRect(-b.w / 2, -b.h / 2, b.w, b.h, 8);
      marker.add(border);

      const plate = this.add.graphics();
      plate.fillStyle(0x1d2418, 0.78);
      plate.fillRoundedRect(-34, -b.h / 2 - 14, 68, 22, 6);
      marker.add(plate);
      const txt = this.add.text(0, -b.h / 2 - 3, label, { fontSize: "13px", color, fontStyle: "bold", fontFamily: "Arial" });
      txt.setOrigin(0.5);
      marker.add(txt);

      const hit = this.add.zone(0, 0, b.w, b.h).setInteractive({ useHandCursor: true });
      hit.on("pointerup", () => { if (!this.isDragging) this.events.emit("town.clickboard", b.kind); });
      marker.add(hit);
      this.boardZones.push(hit);
    });
  }

  rebuildBuildingsAndPlots() {
    this.buildingSprites.forEach((s) => s.destroy());
    this.buildingSprites.clear();
    this.plotMarkers.forEach((c) => c.destroy());
    this.plotMarkers.clear();

    // Tear down the previous ambient smoke/ember (and kill the flicker tweens)
    // so a state update or texture-bake rebuild can't leak emitters or tweens.
    this.smokeColumns.forEach((sm) => sm.root.destroy());
    this.smokeColumns = [];
    this.emberGlows.forEach((g) => { this.tweens.killTweensOf(g); g.destroy(); });
    this.emberGlows = [];

    const isPlacing = !!this.pendingBuilding;

    // While placing a building only the empty plots accept input — boards (Farm,
    // Mine, Harbor) are silenced so a tap meant for the build flow can't fall
    // through and open, say, the Farm menu underneath the placement UI.
    this.boardZones.forEach((z) => { if (z.input) z.input.enabled = !isPlacing; });

    this.plan.lots.forEach((l) => {
      const isBuilt = this.builtLots.has(l.index);
      const buildingId = this.buildingsMap[l.index];

      if (isBuilt && buildingId) {
        const texKey = `building_${buildingId}`;
        if (!this.textures.exists(texKey)) return; // wait for SVG bake
        const baseY = l.cy + l.h / 2;
        const sprite = this.add.sprite(l.cx, baseY, texKey);
        sprite.setOrigin(0.5, 1);
        const scale = (l.w * 1.18) / sprite.width;
        sprite.setScale(scale);
        sprite.setDepth(baseY);
        // Existing buildings are only clickable outside placement mode, so a tap
        // during the build flow can't open a station instead of placing.
        if (!isPlacing) {
          sprite.setInteractive({ useHandCursor: true });
          sprite.on("pointerup", () => { if (!this.isDragging) this.events.emit("town.clickbuilding", buildingId); });
        }
        this.buildingSprites.set(l.index, sprite);
        this.spawnBuildingAmbience(buildingId, l, baseY, sprite.displayHeight);
      } else {
        const container = this.add.container(l.cx, l.cy);
        container.setDepth(l.cy);
        const border = this.add.graphics();
        border.lineStyle(2.5, isPlacing ? 0xa8e063 : 0xffffff, isPlacing ? 0.95 : 0.4);
        border.strokeRoundedRect(-l.w / 2, -l.h / 2, l.w, l.h, 8);
        border.fillStyle(isPlacing ? 0xa8e063 : 0x000000, isPlacing ? 0.16 : 0.14);
        border.fillRoundedRect(-l.w / 2, -l.h / 2, l.w, l.h, 8);
        container.add(border);

        const txt = this.add.text(0, 0, isPlacing ? "+ Build" : "Plot", {
          fontSize: "13px", color: isPlacing ? "#cdf5a0" : "#ffffff", fontStyle: "bold", fontFamily: "Arial",
        });
        txt.setOrigin(0.5);
        container.add(txt);

        // Empty plots only accept input while placing — outside the build flow
        // they're inert decorations, never tappable.
        if (isPlacing) {
          const hit = this.add.zone(0, 0, l.w, l.h).setInteractive({ useHandCursor: true });
          hit.on("pointerup", () => {
            if (this.isDragging) return;
            if (this.pendingBuilding) this.events.emit("town.placebuilding", { lotIndex: l.index, buildingId: this.pendingBuilding.id });
          });
          container.add(hit);
        }
        this.plotMarkers.set(l.index, container);
      }
    });
  }

  /**
   * For a built smoke-building, anchor a rising smoke column at a chimney offset
   * and — for the hearth/forge — a flickering ember glow at its mouth. No-op for
   * any building not in SMOKE_BUILDINGS. The created objects are tracked so the
   * next rebuildBuildingsAndPlots tears them down (no leak).
   */
  spawnBuildingAmbience(buildingId: string, lot: TownPlanLot, baseY: number, displayHeight: number) {
    if (!SMOKE_BUILDINGS.has(buildingId)) return;
    const topY = baseY - displayHeight;
    // Chimney near the roof peak, nudged to one side like a real flue.
    const chimneyX = lot.cx + lot.w * 0.18;
    const chimneyY = topY + displayHeight * 0.12;
    const intensity = buildingId === "forge" || buildingId === "smokehouse" ? 0.95 : 0.75;
    const column = makeSmokeColumn(this, chimneyX, chimneyY, intensity);
    // Above its own building (depth baseY); a nearer building still occludes it.
    column.root.setDepth(baseY + 1);
    this.smokeColumns.push(column);

    // Warm ember glow at the fire's mouth for the two flame buildings.
    if (buildingId === "hearth" || buildingId === "forge") {
      const glow = makeEmberGlow(this, lot.cx, baseY - displayHeight * 0.28, lot.w / 100);
      glow.setDepth(baseY + 0.5);
      this.emberGlows.push(glow);
    }
  }

  spawnVillagers() {
    this.villagers.forEach((v) => v.destroy());
    this.villagers = [];
    const waypoints = this.plan.waypoints;
    if (waypoints.length === 0) return;

    const rnd = mulberry32((waypoints.length * 40503 + 12345) >>> 0);

    const count = Math.min(7, Math.max(4, Math.floor(waypoints.length / 4)));
    for (let i = 0; i < count; i++) {
      const startWp = Math.floor(rnd() * waypoints.length);
      const wp = waypoints[startWp];
      const sprite = this.add.sprite(wp.x, wp.y, "character", "misa-front");
      sprite.setOrigin(0.5, 0.85);
      sprite.setDepth(wp.y);
      sprite.setScale(0.85);
      sprite.setData("currentWp", startWp);
      sprite.setData("targetWp", this.getRandomNeighbor(startWp, rnd));
      sprite.setData("progress", 0);
      sprite.setData("speed", 0.6 + rnd() * 0.5);
      this.villagers.push(sprite);
    }
  }

  getRandomNeighbor(wpIdx: number, rnd: () => number = Math.random): number {
    const connected = this.plan.edges.filter(([a, b]) => a === wpIdx || b === wpIdx);
    if (connected.length === 0) return wpIdx;
    const edge = connected[Math.floor(rnd() * connected.length)];
    return edge[0] === wpIdx ? edge[1] : edge[0];
  }

  /**
   * Under the visual-test harness (window.__HEARTH_VISUAL_TESTING__) the town
   * must render a single deterministic frame. Perpetual ambient motion —
   * chimney smoke, water flow, ember/lamp glow pulses, the rowboat bob and the
   * wandering villagers — otherwise lands on a different frame every capture,
   * making town goldens flaky. We freeze it: pause every looping tween at its
   * t=0 value, and update() becomes a no-op so smoke/water/villagers never
   * advance from their deterministic spawn state. Called after each ambient
   * (re)build so freshly-spawned building tweens are caught too.
   */
  private get visualTesting(): boolean {
    return typeof window !== "undefined"
      && !!(window as unknown as { __HEARTH_VISUAL_TESTING__?: boolean }).__HEARTH_VISUAL_TESTING__;
  }

  private freezeAmbientForVisualTest() {
    if (this.visualTesting) this.tweens.pauseAll();
  }

  override update(_time: number, delta: number) {
    // Visual-test harness: hold a single deterministic frame (see
    // freezeAmbientForVisualTest) — no smoke/water/villager advancement.
    if (this.visualTesting) return;

    // Arrow keys pan the camera, matching drag-pan: same clamp, and they mark
    // the camera as user-adjusted so we stop auto-recentring on resize.
    if (this.cursors) {
      const cam = this.cameras.main;
      // ~600 world px/sec, framerate-independent and scaled by zoom so the
      // on-screen pan speed feels constant.
      const step = (600 * (delta / 1000)) / cam.zoom;
      let dx = 0, dy = 0;
      if (this.cursors.left.isDown) dx -= step;
      if (this.cursors.right.isDown) dx += step;
      if (this.cursors.up.isDown) dy -= step;
      if (this.cursors.down.isDown) dy += step;
      if (dx !== 0 || dy !== 0) {
        cam.scrollX += dx;
        cam.scrollY += dy;
        this.userAdjustedCamera = true;
        this.clampCamera();
      }
    }
    // Ambient chimney smoke. Driven here (and via the ember flicker tweens), so
    // a paused/slept scene stops it dead — no off-screen CPU.
    if (this.smokeColumns.length || this.waterOverlay) {
      const dtSec = delta / 1000;
      this._fxTime += dtSec;
      for (const sm of this.smokeColumns) advanceSmokeColumn(sm, dtSec, this._fxTime);
      if (this.waterOverlay) advanceWaterOverlay(this.waterOverlay, dtSec);
    }

    const dt = delta / 16.6;
    this.villagers.forEach((v) => {
      const currentWp = v.getData("currentWp") as number;
      const targetWp = v.getData("targetWp") as number;
      const speed = (v.getData("speed") as number) || 1;
      let progress = v.getData("progress") as number;
      const p1 = this.plan.waypoints[currentWp];
      const p2 = this.plan.waypoints[targetWp];
      if (!p1 || !p2) return;

      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
      progress += (speed * 0.9 / dist) * dt;

      if (progress >= 1) {
        v.setData("currentWp", targetWp);
        v.setData("targetWp", this.getRandomNeighbor(targetWp));
        v.setData("progress", 0);
        v.setPosition(p2.x, p2.y);
        v.setDepth(p2.y);
      } else {
        v.setData("progress", progress);
        v.x = Phaser.Math.Linear(p1.x, p2.x, progress);
        v.y = Phaser.Math.Linear(p1.y, p2.y, progress);
        v.setDepth(v.y);
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const dir = Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? "front" : "back") : (dx > 0 ? "right" : "left");
        v.play(`misa-${dir}-walk`, true);
      }
    });
  }

  // ── Camera ────────────────────────────────────────────────────────────────
  static readonly MIN_ZOOM = 0.5;
  static readonly MAX_ZOOM = 3;
  // How far the camera may overscroll past the town's edges, as a fraction of
  // the visible area. Zero: panning is clamped strictly to the finite 4:3 map so
  // the flat camera-background green is NEVER visible — you only ever pan within
  // the actual terrain. This is safe because the minimum zoom is pinned to
  // coverZoom (see clampCamera/zoomTo): the map always at least COVERS the
  // viewport, so even the letterboxed axis has the map filling it edge-to-edge
  // (and is simply locked) rather than needing overscroll give to stay panable.
  static readonly OVERSCROLL = 0;

  /**
   * Minimum zoom at which the town fully COVERS the viewport — i.e. the visible
   * world region fits entirely inside the 4:3 town, leaving no letterbox gutter
   * of camera background. On a wide (≈4:3) viewport this is ~1.0; on a tall
   * portrait phone it's >1 (the town is zoomed in until its shorter side fills),
   * which is what kills the big blank grass band above/below the map.
   */
  coverZoom() {
    const cam = this.cameras.main;
    const townW = this.plan.width || 1280;
    const townH = this.plan.height || 960;
    const cover = Math.max(cam.width / townW, cam.height / townH);
    return Phaser.Math.Clamp(cover, TownScene.MIN_ZOOM, TownScene.MAX_ZOOM);
  }

  /**
   * Resting framing on (re)load: zoom so the town COVERS the viewport (no blank
   * background border around the finite 4:3 map), then centre it. Previously this
   * sat at a fixed zoom of 1.0, which on a portrait phone left the visible area
   * taller than the 960px map and so showed a large blank grass margin above and
   * below it. The overscroll clamp still governs live panning/zooming afterwards.
   */
  restCamera() {
    const cam = this.cameras.main;
    cam.setZoom(this.coverZoom());
    const townW = this.plan.width || 1280;
    const townH = this.plan.height || 960;
    // Phaser scrolls about the camera CENTRE (origin 0.5), so scrollX/Y is not the
    // view's top-left. centerOn() does the origin-correct maths (scroll = centre −
    // half the viewport) to put the town's centre at the screen centre. Setting
    // scroll as if it were the top-left (the old code) only centred correctly at
    // zoom 1; once zoomed in to cover, it showed the town's bottom/right edge.
    cam.centerOn(townW / 2, townH / 2);
  }

  clampCamera() {
    const cam = this.cameras.main;
    // Pin the floor zoom to coverZoom so the map always at least fills the
    // viewport. Any path that could leave it zoomed out below cover — a restored
    // initialCameraState from an older save, or a viewport resize/rotation that
    // raised the cover threshold — is corrected here, closing the blank-green
    // border before the scroll clamp (which assumes the map covers) runs.
    const minZoom = this.coverZoom();
    if (cam.zoom < minZoom) cam.setZoom(minZoom);
    const wVisible = cam.width / cam.zoom;
    const hVisible = cam.height / cam.zoom;
    const townW = this.plan.width || 1280;
    const townH = this.plan.height || 960;

    // Sliding clamp with symmetric overscroll. A hard centre-lock (the old
    // behaviour) freezes whichever axis is letterboxed — on a portrait phone
    // that's the vertical axis across almost the whole zoom range — which both
    // blocks panning and makes focal-point zoom appear to pivot on the centre
    // (the lock overwrites zoomTo's scroll correction). Allowing overscroll keeps
    // both axes free. The centred resting position (see centerCamera) sits well
    // inside this range, so the static framing is unchanged.
    const padX = wVisible * TownScene.OVERSCROLL;
    const padY = hVisible * TownScene.OVERSCROLL;
    // Bounds are expressed on the visible world rect's top-left, but scrollX/Y is
    // measured from the camera CENTRE (origin 0.5): worldView.x = scrollX + camW/2
    // − wVis/2. Convert the clamp into scroll space through that offset so it's
    // correct at any zoom. At zoom 1 the offset is 0, so this is identical to the
    // old clamp (desktop framing unchanged); zoomed in it no longer yanks the
    // cover-centred town back and reopens a blank margin.
    const offX = cam.width / 2 - wVisible / 2;
    const offY = cam.height / 2 - hVisible / 2;
    cam.scrollX = Phaser.Math.Clamp(cam.scrollX, -padX - offX, townW - wVisible + padX - offX);
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, -padY - offY, townH - hVisible + padY - offY);
  }

  // Zoom toward a screen-space focal point so the world point under the
  // cursor / pinch centre stays put (instead of zooming about the camera mid).
  zoomTo(targetZoom: number, screenX: number, screenY: number) {
    const cam = this.cameras.main;
    // Floor the zoom at coverZoom (not the static MIN_ZOOM) so the player can
    // never pinch/scroll out far enough to letterbox the finite map and expose
    // the green camera background.
    const minZoom = Math.max(TownScene.MIN_ZOOM, this.coverZoom());
    const z = Phaser.Math.Clamp(targetZoom, minZoom, TownScene.MAX_ZOOM);
    if (z === cam.zoom) return;
    const before = cam.getWorldPoint(screenX, screenY);
    const bx = before.x, by = before.y;
    cam.setZoom(z);
    const after = cam.getWorldPoint(screenX, screenY);
    cam.scrollX += bx - after.x;
    cam.scrollY += by - after.y;
    this.clampCamera();
  }

  setupCameraControls() {
    let startDist = 0;
    let startZoom = 1;

    // Arrow keys pan the camera (handled in update()). Guard against headless
    // contexts where the keyboard plugin may be absent.
    this.cursors = this.input.keyboard?.createCursorKeys();

    this.input.on("pointerdown", () => {
      const p1 = this.input.pointer1, p2 = this.input.pointer2;
      if (p1 && p2 && p1.isDown && p2.isDown) {
        startDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        startZoom = this.cameras.main.zoom;
      } else {
        // A fresh single-pointer gesture — assume a tap until it moves far
        // enough to count as a drag.
        this.isDragging = false;
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      const p1 = this.input.pointer1, p2 = this.input.pointer2;
      // Two fingers down → pinch-zoom about the gesture midpoint.
      if (p1 && p2 && p1.isDown && p2.isDown) {
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (startDist > 0) {
          const factor = dist / startDist;
          this.zoomTo(startZoom * factor, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
          this.userAdjustedCamera = true;
        }
        // A pinch is never a tap.
        this.isDragging = true;
        return;
      }
      // One finger / button down → drag-pan.
      if (!pointer.isDown) return;
      const dx = pointer.x - pointer.prevPosition.x;
      const dy = pointer.y - pointer.prevPosition.y;
      if (Math.hypot(dx, dy) > 3) this.isDragging = true;
      const cam = this.cameras.main;
      cam.scrollX -= dx / cam.zoom;
      cam.scrollY -= dy / cam.zoom;
      this.userAdjustedCamera = true;
      this.clampCamera();
    });

    this.input.on("wheel", (pointer: Phaser.Input.Pointer, _objs: unknown, _dx: number, deltaY: number) => {
      if (pointer.event) pointer.event.preventDefault();
      const cam = this.cameras.main;
      // Scale the step by current zoom so zooming feels consistent at every level.
      this.zoomTo(cam.zoom - deltaY * 0.0015 * cam.zoom, pointer.x, pointer.y);
      this.userAdjustedCamera = true;
    });
  }

}
