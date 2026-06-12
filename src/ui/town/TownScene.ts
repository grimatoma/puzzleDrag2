import Phaser from "phaser";

interface Pt { x: number; y: number }

export interface TownPlanLot { index: number; cx: number; cy: number; w: number; h: number; row: string }
export interface TownPlanRoad { points: Pt[]; width: number; kind: "main" | "branch" | "loop" }
export interface TownPlanWater { kind: "pond" | "river" | "shore"; polygon?: Pt[]; path?: Pt[]; width?: number }
export interface TownPlanTree { x: number; y: number; r: number; cluster: number; front?: boolean }
export interface TownPlanWaypoint { x: number; y: number }
export interface TownPlanBridge { x: number; y: number; angle: number; width: number }
export interface TownPlanField { cx: number; cy: number; w: number; h: number; rows: number; angle: number }
export interface TownPlanFence { points: Pt[] }
export interface TownPlanLotDecor { lot: number; x: number; y: number; kind: "bed" | "pots" | "shrub" }
export interface TownPlanStreetTree { x: number; y: number; r: number }

export interface TownPlan {
  width: number;
  height: number;
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
}

export class TownScene extends Phaser.Scene {
  plan!: TownPlan;
  builtLots: Set<number> = new Set();
  buildingsMap: Record<number, string> = {}; // lotIndex -> buildingId
  pendingBuilding: { id: string; name: string } | null = null;

  // Render objects
  map!: Phaser.Tilemaps.Tilemap;
  tileset!: Phaser.Tilemaps.Tileset;
  groundLayer!: Phaser.Tilemaps.TilemapLayer;
  roadLayer!: Phaser.Tilemaps.TilemapLayer;

  buildingSprites: Map<number, Phaser.GameObjects.Sprite> = new Map();
  plotMarkers: Map<number, Phaser.GameObjects.Container> = new Map();
  villagers: Phaser.GameObjects.Sprite[] = [];
  treesGroup!: Phaser.GameObjects.Group;

  // Input drag state
  isDragging = false;

  constructor() {
    super("TownScene");
  }

  initialCameraState?: { scrollX: number; scrollY: number; zoom: number };

  init(data: { plan: TownPlan; builtLots?: Set<number>; buildingsMap?: Record<number, string>; pendingBuilding?: { id: string; name: string } | null; initialCameraState?: { scrollX: number; scrollY: number; zoom: number } }) {
    this.plan = data.plan;
    this.builtLots = data.builtLots || new Set();
    this.buildingsMap = data.buildingsMap || {};
    this.pendingBuilding = data.pendingBuilding || null;
    this.initialCameraState = data.initialCameraState;
  }

  preload() {
    this.load.image("tileset", "town/tileset.png");
    this.load.spritesheet("character", "town/character.png", { frameWidth: 32, frameHeight: 48 });
  }

  create() {
    const registry = this.registry;

    // 1. Bake SVG building illustrations dynamically from React static markup
    const svgMap = registry.get("hwv.svgMap") as Record<string, string> || {};
    Object.entries(svgMap).forEach(([id, svg]) => {
      this.bakeSvgTexture(`building_${id}`, svg);
    });

    // 2. Create Animations for dude character
    if (!this.anims.exists("walk_left")) {
      this.anims.create({
        key: "walk_left",
        frames: this.anims.generateFrameNumbers("character", { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!this.anims.exists("walk_right")) {
      this.anims.create({
        key: "walk_right",
        frames: this.anims.generateFrameNumbers("character", { start: 5, end: 8 }),
        frameRate: 8,
        repeat: -1,
      });
    }

    // 3. Setup dynamic tilemap grid
    const cols = 40; // 1280 / 32
    const rows = 30; // 960 / 32
    this.map = this.make.tilemap({ tileWidth: 32, tileHeight: 32, width: cols, height: rows });
    
    // tuxmon tileset has 1px margin and 2px spacing
    const tilesetImg = this.map.addTilesetImage("tiles", "tileset", 32, 32, 1, 2);
    if (!tilesetImg) return;
    this.tileset = tilesetImg;

    // Create Layers
    this.groundLayer = this.map.createBlankLayer("ground", this.tileset)!;
    this.roadLayer = this.map.createBlankLayer("roads", this.tileset)!;

    // Fill ground with base grass (index 125 is standard green grass in Tuxemon)
    this.groundLayer.fill(125);

    // Render road network onto the road layer
    this.drawRoads();

    // Render water bodies (rivers, shores)
    this.drawWater();

    // Render plaza cobble ring
    this.drawPlaza();

    // Setup cameras
    if (this.initialCameraState) {
      this.cameras.main.setZoom(this.initialCameraState.zoom);
      this.cameras.main.scrollX = this.initialCameraState.scrollX;
      this.cameras.main.scrollY = this.initialCameraState.scrollY;
    } else {
      this.cameras.main.setZoom(1.0);
    }

    // Setup input listeners for dragging & zooming
    this.setupCameraControls();

    // Initial clamp / center
    this.clampCamera();

    // Re-clamp on window resize
    this.scale.on("resize", () => {
      this.clampCamera();
    });

    // Setup static props (like the well, lampposts)
    this.drawProps();

    // Draw bridges
    this.drawBridges();

    // Draw fields
    this.drawFields();

    // Draw fences
    this.drawFences();

    // Draw boards (clickable farm/mine/harbor zones)
    this.drawBoards();

    // Draw lot decorations
    this.drawLotDecor();

    // Render building/plots
    this.rebuildBuildingsAndPlots();

    // Scatter trees
    this.drawTrees();

    // Scatter street trees
    this.drawStreetTrees();

    // Spawn walking villagers
    this.spawnVillagers();

    // Bind event registry listeners to React changes
    this.events.on("town.update_built", (data: { builtLots: Set<number>; buildingsMap: Record<number, string>; pendingBuilding: { id: string; name: string } | null }) => {
      this.builtLots = data.builtLots;
      this.buildingsMap = data.buildingsMap;
      this.pendingBuilding = data.pendingBuilding;
      this.rebuildBuildingsAndPlots();
    });
  }

  // Draw roads using plan coordinates (dirt path is index 173)
  drawRoads() {
    this.plan.roads.forEach(rd => {
      rd.points.forEach((p, idx) => {
        if (idx === rd.points.length - 1) return;
        const next = rd.points[idx + 1];
        
        // Draw segments axis-aligned
        const tx1 = Math.floor(p.x / 32);
        const ty1 = Math.floor(p.y / 32);
        const tx2 = Math.floor(next.x / 32);
        const ty2 = Math.floor(next.y / 32);

        const xStart = Math.min(tx1, tx2);
        const xEnd = Math.max(tx1, tx2);
        const yStart = Math.min(ty1, ty2);
        const yEnd = Math.max(ty1, ty2);

        for (let x = xStart; x <= xEnd; x++) {
          for (let y = yStart; y <= yEnd; y++) {
            // Draw a road block of width (approx. 2-3 tiles for main roads, 1 tile for branches)
            const rw = Math.round(rd.width / 32);
            for (let dx = -Math.floor(rw / 2); dx <= Math.floor(rw / 2); dx++) {
              if (tx1 === tx2) {
                // Vertical road
                const rx = x + dx;
                if (rx >= 0 && rx < 40) this.roadLayer.putTileAt(173, rx, y);
              } else {
                // Horizontal road
                const ry = y + dx;
                if (ry >= 0 && ry < 30) this.roadLayer.putTileAt(173, x, ry);
              }
            }
          }
        }
      });
    });
  }

  // Draw water: rivers (water tiles are index 10)
  drawWater() {
    this.plan.water.forEach(w => {
      if (w.path) {
        w.path.forEach((p, idx) => {
          if (idx === w.path!.length - 1) return;
          const next = w.path![idx + 1];
          const tx1 = Math.floor(p.x / 32);
          const ty1 = Math.floor(p.y / 32);
          const tx2 = Math.floor(next.x / 32);
          const ty2 = Math.floor(next.y / 32);

          const xStart = Math.min(tx1, tx2);
          const xEnd = Math.max(tx1, tx2);
          const yStart = Math.min(ty1, ty2);
          const yEnd = Math.max(ty1, ty2);

          for (let x = xStart; x <= xEnd; x++) {
            for (let y = yStart; y <= yEnd; y++) {
              // Draw 2 tiles wide river
              this.groundLayer.putTileAt(9, x, y);
              this.groundLayer.putTileAt(9, x + 1, y);
            }
          }
        });
      }
    });
  }

  // Draw plaza center (cobble tile is index 161)
  drawPlaza() {
    const p = this.plan.plaza;
    const tx = Math.floor(p.cx / 32);
    const ty = Math.floor(p.cy / 32);
    const rx = Math.floor(p.rx / 32);
    const ry = Math.floor(p.ry / 32);

    for (let x = tx - rx; x <= tx + rx; x++) {
      for (let y = ty - ry; y <= ty + ry; y++) {
        if (x >= 0 && x < 40 && y >= 0 && y < 30) {
          // Check if inside ellipse
          const val = ((x - tx) ** 2) / (rx ** 2) + ((y - ty) ** 2) / (ry ** 2);
          if (val <= 1.05) {
            this.roadLayer.putTileAt(161, x, y);
          }
        }
      }
    }
  }

  drawProps() {
    // Plaza well
    const well = this.plan.well;
    // Draw a small 3D well or use a nice circle shape/sprite
    const wellG = this.add.graphics();
    wellG.fillStyle(0x7a6a4a, 1);
    wellG.fillCircle(well.cx, well.cy, well.r);
    wellG.lineStyle(2, 0x5a4a30, 1);
    wellG.strokeCircle(well.cx, well.cy, well.r);
    wellG.fillStyle(0x23323a, 1);
    wellG.fillCircle(well.cx, well.cy, well.r * 0.6);
  }

  drawTrees() {
    this.treesGroup = this.add.group();
    this.plan.trees.forEach(t => {
      // Create a pixel-art tree sprite using the tileset texture
      const sprite = this.add.image(t.x, t.y, "tileset");
      sprite.setOrigin(0.5, 1); // Anchor at bottom-center of the tree trunk
      
      // Crop a 2x4 tile block (66x134px) representing a tree
      sprite.setCrop(69, 1, 66, 134);
      
      // Set scale based on plan radius
      const scale = (t.r * 2) / 64;
      sprite.setScale(scale);

      // Add a nice semi-transparent shadow under the tree
      const shadow = this.add.ellipse(t.x, t.y - 4, t.r * 1.5, t.r * 0.6, 0x000000, 0.25);
      shadow.setDepth(t.y - 5);
      
      // Depth-sort according to baseline Y
      sprite.setDepth(t.y);
      
      this.treesGroup.add(sprite);
      this.treesGroup.add(shadow);
    });
  }

  drawStreetTrees() {
    this.plan.streetTrees.forEach(t => {
      const sprite = this.add.image(t.x, t.y, "tileset");
      sprite.setOrigin(0.5, 1);
      
      // Crop a smaller 2x2 green bush/small tree (66x66px) starting at Row 7, Col 2 (x=69, y=239)
      sprite.setCrop(69, 239, 66, 66);
      
      sprite.setScale(1.0);
      sprite.setDepth(t.y);
      
      const shadow = this.add.ellipse(t.x, t.y - 2, t.r * 1.5, t.r * 0.6, 0x000000, 0.25);
      shadow.setDepth(t.y - 2);
    });
  }

  drawBridges() {
    this.plan.bridges.forEach(b => {
      const tx = Math.floor(b.x / 32);
      const ty = Math.floor(b.y / 32);
      const tw = Math.round(b.width / 32);

      // Draw horizontal bridge spanning tw tiles
      // We use tile 466 (wood bridge center) for the bridge
      for (let dx = -Math.floor(tw / 2); dx <= Math.floor(tw / 2); dx++) {
        const bx = tx + dx;
        if (bx >= 0 && bx < 40) {
          // Put the bridge tiles on the road layer so they render on top of water
          this.roadLayer.putTileAt(466, bx, ty);
          this.roadLayer.putTileAt(466, bx, ty + 1);
        }
      }
    });
  }

  drawFields() {
    this.plan.fields.forEach(f => {
      const tx = Math.floor((f.cx - f.w / 2) / 32);
      const ty = Math.floor((f.cy - f.h / 2) / 32);
      const tw = Math.floor(f.w / 32);
      const th = Math.floor(f.h / 32);

      for (let x = tx; x < tx + tw; x++) {
        for (let y = ty; y < ty + th; y++) {
          if (x >= 0 && x < 40 && y >= 0 && y < 30) {
            // Fill with tilled dirt tile (index 173)
            this.roadLayer.putTileAt(173, x, y);
          }
        }
      }
    });
  }

  drawFences() {
    this.plan.fences.forEach(f => {
      f.points.forEach(p => {
        const tx = Math.floor(p.x / 32);
        const ty = Math.floor(p.y / 32);
        if (tx >= 0 && tx < 40 && ty >= 0 && ty < 30) {
          // Tile 358 is fence post
          this.roadLayer.putTileAt(358, tx, ty);
        }
      });
    });
  }

  drawLotDecor() {
    this.plan.lotDecor.forEach(d => {
      const tx = Math.floor(d.x / 32);
      const ty = Math.floor(d.y / 32);
      if (tx >= 0 && tx < 40 && ty >= 0 && ty < 30) {
        if (d.kind === "shrub") {
          this.roadLayer.putTileAt(299, tx, ty);
        } else if (d.kind === "pots") {
          this.roadLayer.putTileAt(349, tx, ty);
        } else {
          this.roadLayer.putTileAt(275, tx, ty);
        }
      }
    });
  }

  drawBoards() {
    this.plan.boards.forEach(b => {
      const tx = Math.floor((b.cx - b.w / 2) / 32);
      const ty = Math.floor((b.cy - b.h / 2) / 32);
      const tw = Math.floor(b.w / 32);
      const th = Math.floor(b.h / 32);

      // Fill board zone thematic tiles
      if (b.kind === "farm") {
        for (let x = tx; x < tx + tw; x++) {
          for (let y = ty; y < ty + th; y++) {
            this.roadLayer.putTileAt(173, x, y);
          }
        }
        for (let x = tx; x < tx + tw; x += 2) {
          for (let y = ty; y < ty + th; y += 2) {
            this.roadLayer.putTileAt(275, x, y);
          }
        }
      } else if (b.kind === "mine") {
        for (let x = tx; x < tx + tw; x++) {
          for (let y = ty; y < ty + th; y++) {
            this.roadLayer.putTileAt(161, x, y);
          }
        }
      } else if (b.kind === "fish") {
        for (let x = tx; x < tx + tw; x++) {
          for (let y = ty; y < ty + th; y++) {
            this.groundLayer.putTileAt(9, x, y);
          }
        }
      }

      const labelText = b.kind === "farm" ? "Farm Field" : b.kind === "mine" ? "Mine Entrance" : "Harbor";
      const marker = this.add.container(b.cx, b.cy);
      marker.setDepth(b.cy + b.h / 2);

      const border = this.add.graphics();
      border.lineStyle(2, b.kind === "farm" ? 0x9bdb6a : b.kind === "mine" ? 0x9c9c9c : 0x5fa1e0, 0.6);
      border.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
      border.fillStyle(0x000000, 0.25);
      border.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      marker.add(border);

      const txt = this.add.text(0, 0, labelText, {
        fontSize: "14px",
        color: b.kind === "farm" ? "#9bdb6a" : b.kind === "mine" ? "#cccccc" : "#7abaf7",
        fontStyle: "bold",
        fontFamily: "Arial",
      });
      txt.setOrigin(0.5);
      marker.add(txt);

      border.setInteractive(new Phaser.Geom.Rectangle(-b.w / 2, -b.h / 2, b.w, b.h), Phaser.Geom.Rectangle.Contains);
      border.on("pointerup", () => {
        if (this.isDragging) return;
        this.events.emit("town.clickboard", b.kind);
      });
    });
  }

  rebuildBuildingsAndPlots() {
    // Clear old ones
    this.buildingSprites.forEach(s => s.destroy());
    this.buildingSprites.clear();
    this.plotMarkers.forEach(c => c.destroy());
    this.plotMarkers.clear();

    const isPlacing = !!this.pendingBuilding;

    this.plan.lots.forEach(l => {
      const isBuilt = this.builtLots.has(l.index);
      const buildingId = this.buildingsMap[l.index];

      // Draw a snapped grid container
      if (isBuilt && buildingId) {
        // Render building sprite using the baked SVG texture
        const texKey = `building_${buildingId}`;
        const sprite = this.add.sprite(l.cx, l.cy + l.h / 2, this.textures.exists(texKey) ? texKey : "character", 4);
        sprite.setOrigin(0.5, 1); // Anchor at bottom-center
        
        // Scale it to fit the lot dimensions nicely (e.g. 128x128px lots)
        const scale = (l.w * 1.1) / sprite.width;
        sprite.setScale(scale);
        
        // Depth-sort by Y
        sprite.setDepth(l.cy + l.h / 2);
        
        // Click to enter crafting station
        sprite.setInteractive({ useHandCursor: true });
        sprite.on("pointerup", (pointer: Phaser.Input.Pointer) => {
          if (this.isDragging) return;
          this.events.emit("town.clickbuilding", buildingId);
        });

        this.buildingSprites.set(l.index, sprite);
      } else {
        // Draw empty plot marker
        const container = this.add.container(l.cx, l.cy);
        container.setDepth(l.cy + l.h / 2);

        // Grid outline
        const border = this.add.graphics();
        border.lineStyle(2.5, isPlacing ? 0x9bdb6a : 0xffffff, isPlacing ? 0.9 : 0.35);
        border.strokeRect(-l.w / 2, -l.h / 2, l.w, l.h);

        // Fill color
        border.fillStyle(isPlacing ? 0x9bdb6a : 0x000000, isPlacing ? 0.14 : 0.18);
        border.fillRect(-l.w / 2, -l.h / 2, l.w, l.h);

        container.add(border);

        // Text label
        const txt = this.add.text(0, 0, isPlacing ? "+ Build" : "Plot", {
          fontSize: "13px",
          color: isPlacing ? "#9bdb6a" : "#ffffff",
          fontStyle: "bold",
          fontFamily: "Arial",
        });
        txt.setOrigin(0.5);
        container.add(txt);

        // Interactive plot marker
        border.setInteractive(new Phaser.Geom.Rectangle(-l.w / 2, -l.h / 2, l.w, l.h), Phaser.Geom.Rectangle.Contains);
        border.on("pointerup", () => {
          if (this.isDragging) return;
          if (isPlacing && this.pendingBuilding) {
            this.events.emit("town.placebuilding", { lotIndex: l.index, buildingId: this.pendingBuilding.id });
          }
        });

        this.plotMarkers.set(l.index, container);
      }
    });
  }

  spawnVillagers() {
    this.villagers.forEach(v => v.destroy());
    this.villagers = [];

    // Simple A* waypoints pathing
    const waypoints = this.plan.waypoints;
    if (waypoints.length === 0) return;

    // Spawn 6 random walking villagers
    for (let i = 0; i < 6; i++) {
      const startWpIdx = Math.floor(Math.random() * waypoints.length);
      const wp = waypoints[startWpIdx];

      const sprite = this.add.sprite(wp.x, wp.y, "character", 4);
      sprite.setOrigin(0.5, 0.9);
      sprite.setDepth(wp.y);
      sprite.setScale(0.85);

      // Simple navigation AI state
      sprite.setData("currentWp", startWpIdx);
      sprite.setData("targetWp", this.getRandomNeighbor(startWpIdx));
      sprite.setData("progress", 0);

      this.villagers.push(sprite);
    }
  }

  getRandomNeighbor(wpIdx: number): number {
    const connectedEdges = this.plan.edges.filter(([a, b]) => a === wpIdx || b === wpIdx);
    if (connectedEdges.length === 0) return wpIdx;
    const edge = connectedEdges[Math.floor(Math.random() * connectedEdges.length)];
    return edge[0] === wpIdx ? edge[1] : edge[0];
  }

  override update(time: number, delta: number) {
    // Animate villagers walking along the grid lanes
    this.villagers.forEach(v => {
      const currentWp = v.getData("currentWp") as number;
      const targetWp = v.getData("targetWp") as number;
      let progress = v.getData("progress") as number;

      const p1 = this.plan.waypoints[currentWp];
      const p2 = this.plan.waypoints[targetWp];

      if (!p1 || !p2) return;

      // Update progress
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const speed = 0.05 / (dist || 1); // speed factor
      progress += speed * (delta / 16.6); // scale with frame delta

      if (progress >= 1) {
        // Arrived! Choose next node
        v.setData("currentWp", targetWp);
        v.setData("targetWp", this.getRandomNeighbor(targetWp));
        v.setData("progress", 0);
        v.x = p2.x;
        v.y = p2.y;
        v.setDepth(p2.y);
      } else {
        v.setData("progress", progress);
        v.x = Phaser.Math.Linear(p1.x, p2.x, progress);
        v.y = Phaser.Math.Linear(p1.y, p2.y, progress);
        v.setDepth(v.y);

        // Play correct walking anims based on delta direction
        const dx = p2.x - p1.x;
        if (Math.abs(dx) > 2) {
          if (dx < 0) {
            v.play("walk_left", true);
          } else {
            v.play("walk_right", true);
          }
        } else {
          v.play("walk_left", true); // fallback anim
        }
      }
    });
  }

  clampCamera() {
    const cam = this.cameras.main;
    const zoom = cam.zoom;

    // Visible world dimensions
    const wVisible = cam.width / zoom;
    const hVisible = cam.height / zoom;

    // Town design space dimensions
    const townW = 1280;
    const townH = 960;

    let minX, maxX;
    if (wVisible >= townW) {
      // Town is smaller than screen, center it
      minX = maxX = (townW - wVisible) / 2;
    } else {
      // Town is larger than screen, clamp to town bounds
      minX = 0;
      maxX = townW - wVisible;
    }

    let minY, maxY;
    if (hVisible >= townH) {
      // Town is smaller than screen, center it
      minY = maxY = (townH - hVisible) / 2;
    } else {
      // Town is larger than screen, clamp to town bounds
      minY = 0;
      maxY = townH - hVisible;
    }

    cam.scrollX = Phaser.Math.Clamp(cam.scrollX, minX, maxX);
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, minY, maxY);
  }

  setupCameraControls() {
    let startDist = 0;
    let startZoom = 1;

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const pointer1 = this.input.pointer1;
      const pointer2 = this.input.pointer2;

      if (pointer1 && pointer2 && pointer1.isDown && pointer2.isDown) {
        startDist = Math.hypot(pointer1.x - pointer2.x, pointer1.y - pointer2.y);
        startZoom = this.cameras.main.zoom;
      } else {
        this.isDragging = false;
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      const pointer1 = this.input.pointer1;
      const pointer2 = this.input.pointer2;

      // Check for two-finger pinch-to-zoom first
      if (pointer1 && pointer2 && pointer1.isDown && pointer2.isDown) {
        const dist = Math.hypot(pointer1.x - pointer2.x, pointer1.y - pointer2.y);
        if (startDist > 0) {
          const factor = dist / startDist;
          const newZoom = Phaser.Math.Clamp(startZoom * factor, 0.5, 3);
          this.cameras.main.setZoom(newZoom);
          this.clampCamera();
        }
        return;
      }

      // Fall back to mouse / single touch pan-to-drag
      if (!pointer.isDown) return;

      const dx = pointer.x - pointer.prevPosition.x;
      const dy = pointer.y - pointer.prevPosition.y;

      if (Math.hypot(dx, dy) > 3) {
        this.isDragging = true;
      }

      this.cameras.main.scrollX -= dx / this.cameras.main.zoom;
      this.cameras.main.scrollY -= dy / this.cameras.main.zoom;
      this.clampCamera();
    });

    this.input.on("wheel", (pointer: Phaser.Input.Pointer, gameObjects: unknown, deltaX: number, deltaY: number) => {
      if (pointer.event) {
        pointer.event.preventDefault();
      }
      const zoom = this.cameras.main.zoom - deltaY * 0.001;
      this.cameras.main.setZoom(Phaser.Math.Clamp(zoom, 0.5, 3));
      this.clampCamera();
    });
  }

  bakeSvgTexture(key: string, svg: string) {
    if (this.textures.exists(key)) return;
    const img = new Image();
    // Use base64 format for high cross-browser SVG loader compatibility
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    img.onload = () => {
      this.textures.addImage(key, img);
      // Rebuild to force refresh using the baked texture
      this.rebuildBuildingsAndPlots();
    };
  }
}
