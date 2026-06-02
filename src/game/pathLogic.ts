import Phaser from "phaser";
import { UPGRADE_THRESHOLDS, SCENE_EVENTS, CAPPED_TILES } from "../constants.js";
import { upgradeCountForChain } from "../utils.js";
import { TileObj } from "../TileObj.js";
import { producedResource } from "./producedResource.js";
import { findCrossCollectTargets } from "./crossCollect.js";

import { getItem } from "../constants.js";
import { isTapTargetPower } from "../config/toolPowers.js";
import { setRegistry } from "../types/phaserRegistry.js";
import { assertTile } from "../types/guards.js";
import { buildCrossCollectedCredits } from "./crossCollect.js";
import { buildChainUpdatePayload } from "./producedResource.js";
import { getRegistry } from "../types/phaserRegistry.js";
import type { GameScene } from "../GameScene.js";

const PATH_COLORS_VALID   = { line: 0xff6d00, halo: 0xffd248, nodeOuter: 0xffd248, nodeInner: 0xff6d00 };
const PATH_COLORS_INVALID = { line: 0x9a4630, halo: 0xc06b3e, nodeOuter: 0xc06b3e, nodeInner: 0x9a4630 };

function lerpHex(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

export function startPath(this: GameScene, tile: TileObj): void  {
  if (this.locked) return;
  const pendingKey = getRegistry(this.registry, "toolPending");
  const armedPower = getRegistry(this.registry, "toolPendingPower")
    ?? (pendingKey ? getItem(pendingKey)?.power : null);
  if (pendingKey && armedPower?.id && isTapTargetPower(armedPower.id)) {
    this.applyToolPower(armedPower, tile);
    this.time.delayedCall(50, () => this.events.emit(SCENE_EVENTS.TOOL_FIRED, {
      key: pendingKey,
      row: tile.row,
      col: tile.col,
    }));
    return;
  }
  this.dragging = true;
  this.clearPath(false);
  this.addToPath(tile);
  this.dimUnselectableTiles(tile.res.key);
  this.showGrassHover();
  this.updateGrassHover();
  this._emitChainUpdate();
  // Subtle haptic tick on drag-start, gated by user setting.
  if (getRegistry(this.registry, "hapticsOn") && navigator.vibrate) {
    try { navigator.vibrate(10); } catch { /* unsupported */ }
  }
}

export function tryAddToPath(this: GameScene, tile: TileObj): void  {
  if (!this.dragging || !this.path.length) return;
  if (tile.frozen || tile.rubble) return;
  const last = this.path[this.path.length - 1];
  const prev = this.path[this.path.length - 2];
  if (prev === tile) {
    last.setSelected(false);
    this.path.pop();
    this.redrawPath();
    this.updateGrassHover();
    this._emitChainUpdate();
    return;
  }
  if (tile.selected) return;
  const same = tile.res.key === this.path[0].res.key;
  const adj = Math.abs(tile.col - last.col) <= 1 && Math.abs(tile.row - last.row) <= 1 && !(tile.col === last.col && tile.row === last.row);
  if (same && adj) this.addToPath(tile);
}

export function addToPath(this: GameScene, tile: TileObj): void  {
  tile.setSelected(true);
  tile.pulse();
  this.path.push(tile);
  this.redrawPath();
  this.updateGrassHover();
  this._emitChainUpdate();
}

export function redrawPath(this: GameScene, )  {
  const prevLen = this._prevPathLen;
  const growing = this.path.length > prevLen;
  this._prevPathLen = this.path.length;

  this.pathStars.forEach((s: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics) => s.destroy());
  this.pathStars = [];

  // V.1 — Choose path colors based on whether chain meets the effective minimum length
  const effectiveMinChain = this._effectiveMinChain();
  const pathValid = this.path.length === 0 || this.path.length >= effectiveMinChain;

  // Tween the validity color when it flips, rather than snapping. Brown ↔ orange
  // over 160ms. Repaint hooked via onUpdate so segments + nodes both follow.
  if (pathValid !== this._lastPathValid) {
    this._lastPathValid = pathValid;
    if (this._validTween) this._validTween.stop();
    this._validTween = this.tweens.add({
      targets: this,
      _pathValidProgress: pathValid ? 1 : 0,
      duration: 160,
      ease: "Quad.Out",
      onUpdate: () => this._repaintPathColors(),
    });
  }

  const t = this._pathValidProgress;
  const lineColor      = lerpHex(PATH_COLORS_INVALID.line,      PATH_COLORS_VALID.line,      t);
  const haloColor      = lerpHex(PATH_COLORS_INVALID.halo,      PATH_COLORS_VALID.halo,      t);
  const nodeOuterColor = lerpHex(PATH_COLORS_INVALID.nodeOuter, PATH_COLORS_VALID.nodeOuter, t);
  const nodeInnerColor = lerpHex(PATH_COLORS_INVALID.nodeInner, PATH_COLORS_VALID.nodeInner, t);

  for (let i = 1; i < this.path.length; i++) {
    const a = this.path[i - 1];
    const b = this.path[i];
    let g = this.pathLines[i - 1];
    if (!g) {
      g = this.add.graphics().setDepth(8);
      this.pathLines[i - 1] = g;
    }
    if (growing && i === this.path.length - 1) {
      // Newest segment: grow it from a toward b, then pulse
      this.tweens.killTweensOf(g);
      g.clear();
      const ax = a.x, ay = a.y, bx = b.x, by = b.y;
      const obj = { t: 0 };
      this.tweens.add({
        targets: obj, t: 1, duration: 160, ease: "Quad.Out",
        onUpdate: () => {
          const mx = ax + (bx - ax) * obj.t;
          const my = ay + (by - ay) * obj.t;
          g.clear();
          this._drawSegment(g, ax, ay, mx, my, lineColor, haloColor);
        },
        onComplete: () => {
          g.clear(); this._drawSegment(g, ax, ay, bx, by, lineColor, haloColor);
          this.tweens.add({ targets: g, alpha: 0.78, yoyo: true, repeat: -1, duration: 680, ease: "Sine.InOut" });
        },
      });
    } else {
      g.clear();
      this._drawSegment(g, a.x, a.y, b.x, b.y, lineColor, haloColor);
      if (!this.tweens.isTweening(g)) {
        this.tweens.add({ targets: g, alpha: 0.78, yoyo: true, repeat: -1, duration: 680, ease: "Sine.InOut" });
      }
    }
  }
  this.pathLines.forEach((g, i) => g.setVisible(i < this.path.length - 1));

  // Expanding ring burst at the newly added tile
  if (growing && this.path.length > 0) {
    const nt = this.path[this.path.length - 1];
    const ring = this.add.graphics().setDepth(10);
    const ro = { r: 5 * this.tileScale, a: 0.9 };
    this.tweens.add({
      targets: ro, r: 28 * this.tileScale, a: 0, duration: 340, ease: "Quad.Out",
      onUpdate: () => {
        ring.clear();
        ring.lineStyle(2.5 * this.tileScale, haloColor, ro.a);
        ring.strokeCircle(nt.x, nt.y, ro.r);
      },
      onComplete: () => ring.destroy(),
    });
  }

  // Static node dots
  if (!this.pathNodeG) this.pathNodeG = this.add.graphics().setDepth(9);
  const pathNodeG = this.pathNodeG; // narrowed non-null ref
  pathNodeG.clear();
  const nr = 7 * this.tileScale;
  this.path.forEach((t) => {
    pathNodeG.fillStyle(nodeOuterColor, 0.55);
    pathNodeG.fillCircle(t.x, t.y, nr * 1.6);
    pathNodeG.fillStyle(nodeInnerColor, 1);
    pathNodeG.fillCircle(t.x, t.y, nr);
    pathNodeG.fillStyle(0xfff4c2, 0.9);
    pathNodeG.fillCircle(t.x, t.y, nr * 0.4);
  });

  const res0 = this.path.length ? this.path[0].res : null;
  // Display the TILE that will spawn on the board (nextUpgradeTile), so the
  // star preview matches what actually appears at the endpoint.
  const next = res0 ? this.nextUpgradeTile(res0) : null;
  const effThresh: Record<string, number> = getRegistry(this.registry, "effectiveThresholds") ?? UPGRADE_THRESHOLDS;
  const threshold = res0 ? (effThresh[res0.key] || 0) : 0;
  const prevGroups = this._prevStarGroups;
  let groupCount = 0;
  if (next && threshold > 0) {
    const off = 24 * this.tileScale;
    for (let i = threshold - 1; i < this.path.length; i += threshold) {
      const t = this.path[i];
      // Scale star by upgrade tier (1×, 2×, 3×)
      const tier = groupCount + 1; // 1-based
      const baseStarScale = (0.62 + tier * 0.12) * this.tileSpriteScale;
      const swayAmp = 10 + tier * 5;  // ±10° / ±15° / ±20°
      const swayDur = Math.max(400, 950 - (tier - 1) * 175); // 950 / 775 / 600ms
      const star = this.add.image(t.x + off, t.y - off, "spark").setScale(baseStarScale).setDepth(12);
      const preview = this.add.image(t.x + off, t.y + off * 0.85, `tile_${next.key}`).setScale(0.32 * this.tileSpriteScale).setDepth(12);
      // 3× tier: tint star orange-white
      if (tier >= 3) star.setTint(0xffb347);
      const swayStar = () => {
        if (!star.active) return;
        this.tweens.add({
          targets: star,
          angle: { from: swayAmp, to: -swayAmp },
          yoyo: true,
          repeat: -1,
          duration: swayDur,
          ease: "Sine.InOut",
        });
      };

      if (groupCount >= prevGroups) {
        // Pop-in + sway for new star
        star.setScale(0).setAngle(-20);
        this.tweens.add({ targets: star, scale: baseStarScale, angle: swayAmp, duration: 320, ease: "Back.Out" });
        this.time.delayedCall(320, swayStar);
        preview.setScale(0).setAlpha(0);
        this.tweens.add({ targets: preview, scale: 0.32 * this.tileSpriteScale, alpha: 1, duration: 260, ease: "Back.Out", delay: 110 });
        // 2× tier: glow halo
        if (tier >= 2) {
          const halo = this.add.graphics().setDepth(11);
          halo.lineStyle(3 * this.tileScale, 0xffd248, 0.55);
          halo.strokeCircle(t.x + off, t.y - off, 14 * this.tileScale);
          this.pathStars.push(halo);
        }
      } else {
        star.setAngle(swayAmp);
        swayStar();
      }
      this.pathStars.push(star, preview);
      groupCount++;
    }
  }
  this._prevStarGroups = groupCount;
  this.path.forEach((t) => t.sprite.setDepth(7));
}

export function _repaintPathColors(this: GameScene, )  {
  if (this.path.length === 0) return;
  const t = this._pathValidProgress;
  const lineColor      = lerpHex(PATH_COLORS_INVALID.line,      PATH_COLORS_VALID.line,      t);
  const haloColor      = lerpHex(PATH_COLORS_INVALID.halo,      PATH_COLORS_VALID.halo,      t);
  const nodeOuterColor = lerpHex(PATH_COLORS_INVALID.nodeOuter, PATH_COLORS_VALID.nodeOuter, t);
  const nodeInnerColor = lerpHex(PATH_COLORS_INVALID.nodeInner, PATH_COLORS_VALID.nodeInner, t);
  for (let i = 1; i < this.path.length; i++) {
    const a = this.path[i - 1];
    const b = this.path[i];
    const g = this.pathLines[i - 1];
    if (!g) continue;
    // Skip the very last segment if a "grow" tween is still running on it —
    // letting onUpdate take over its color while the tween's own onUpdate
    // keeps redrawing its grow progress in the old color would flicker.
    if (i === this.path.length - 1 && this.tweens.isTweening(g)) continue;
    g.clear();
    this._drawSegment(g, a.x, a.y, b.x, b.y, lineColor, haloColor);
  }
  if (this.pathNodeG) {
    const pathNodeG2 = this.pathNodeG; // narrowed non-null ref
    pathNodeG2.clear();
    const nr = 7 * this.tileScale;
    this.path.forEach((tp) => {
      pathNodeG2.fillStyle(nodeOuterColor, 0.55);
      pathNodeG2.fillCircle(tp.x, tp.y, nr * 1.6);
      pathNodeG2.fillStyle(nodeInnerColor, 1);
      pathNodeG2.fillCircle(tp.x, tp.y, nr);
      pathNodeG2.fillStyle(0xfff4c2, 0.9);
      pathNodeG2.fillCircle(tp.x, tp.y, nr * 0.4);
    });
  }
}

export function _drawSegment(this: GameScene, g: Phaser.GameObjects.Graphics, ax: number, ay: number, bx: number, by: number, lineColor = 0xff6d00, haloColor = 0xffd248): void  {
  g.lineStyle(22 * this.tileScale, haloColor, 0.22);
  g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.strokePath();
  g.lineStyle(9 * this.tileScale, lineColor, 1);
  g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.strokePath();
  g.lineStyle(3 * this.tileScale, 0xfff4c2, 0.85);
  g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.strokePath();
}

export function endPath(this: GameScene, )  {
  if (!this.dragging) return;
  this.dragging = false;
  this.hideGrassHover();
  this.events.emit(SCENE_EVENTS.CHAIN_UPDATE, null);
  this.clearDimming();
  const minChain = this._effectiveMinChain();
  if (this.path.length >= minChain) this.collectPath();
  else this.clearPath(true);
  if (this._deferredTool) {
    const tool = this._deferredTool;
    this._deferredTool = null;
    // The registry already holds `tool`; the changedata handler fired but
    // we shortcircuited because of the drag. Re-poke the registry so the
    // handler runs cleanly now that dragging is over.
    setRegistry(this.registry, "toolPending", null);
    this.time.delayedCall(60, () => setRegistry(this.registry, "toolPending", tool));
  }
}

export function clearPath(this: GameScene, deselect = true)  {
  if (deselect) this.path.forEach((t) => t.setSelected(false));
  this.path = [];
  this._prevPathLen = 0;
  this._prevStarGroups = 0;
  this.pathLines.forEach((l: Phaser.GameObjects.Graphics) => { this.tweens.killTweensOf(l); l.clear(); });
  this.pathStars.forEach((s: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics) => s.destroy());
  this.pathStars = [];
  if (this.pathNodeG) { this.pathNodeG.clear(); }
  this.hideGrassHover();
  this.events.emit(SCENE_EVENTS.CHAIN_UPDATE, null);
}

export function collectPath(this: GameScene, )  {
  if (!this.path.length) return;
  const res = this.path[0].res;
  // Board upgrade: resolve as a TILE (via zone upgradeMap). This is what
  // spawns on the board at the chain endpoint.
  const next = this.nextUpgradeTile(res);
  // Resource progress: the resource key this chain's length contributes
  // toward (fractional accumulation in state.resourceProgress).
  const resourceKey = producedResource(res);
  // Cross-collect: partner-category tiles orthogonally adjacent to the chain
  // are also collected. Compute BEFORE we null out the path tiles below — the
  // helper needs the grid intact to inspect chain-cell neighbours.
  const crossTargets = findCrossCollectTargets(
    this.grid,
    this.path.map((t: TileObj) => ({ row: t.row, col: t.col, key: t.res.key })),
  );
  const effThresholds: Record<string, number> = getRegistry(this.registry, "effectiveThresholds") ?? UPGRADE_THRESHOLDS;
  const upgrades = next ? upgradeCountForChain(this.path.length, res.key, effThresholds) : 0;
  const gained = this.path.length;
  // Bonus yields: add per-resource bonus if this chain contained that resource
  const bonusYields: Record<string, number> = getRegistry(this.registry, "bonusYields") ?? {};
  const bonusGains: Record<string, number> = {};
  if (bonusYields[res.key]) {
    bonusGains[res.key] = Math.round(bonusYields[res.key]);
  }
  // V.3 — Clamp the displayed gain to the inventory cap so float text matches what the player actually receives
  const cap = getRegistry(this.registry, "inventoryCap") ?? 200;
  const inv: Record<string, number> = getRegistry(this.registry, "inventory") ?? {};
  const isCapped = (CAPPED_TILES as readonly string[]).includes(res.key);
  const currentAmt = inv[res.key] ?? 0;
  const wouldGain = gained + (bonusGains[res.key] ?? 0);
  const actualGain = isCapped ? Math.max(0, Math.min(cap - currentAmt, wouldGain)) : wouldGain;
  const overCap = wouldGain - actualGain > 0;

  const floatSuffix = upgrades > 0 ? `  ★×${upgrades}` : "";
  let bonusText = "";
  const keys = Object.keys(bonusGains);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (k !== res.key) {
      bonusText += `  +${bonusGains[k]} ${k}★`;
    }
  }
  this.floatText(`+${actualGain} ${res.label}${overCap ? " ⓘ" : ""}${floatSuffix}${bonusText}`, this.path[this.path.length - 1].x, this.path[this.path.length - 1].y);

  // Chain-length juice — escalating screen shake and a radial wipe. Big chains
  // earn loud feedback; upgrades add an extra burst.
  this.shakeForChain(this.path.length);
  this.radialFlash(this.path[this.path.length - 1].x, this.path[this.path.length - 1].y, this.path.length);

  // Queue upgrade tiles to spawn at the endpoint after board collapse.
  // next is a tile def (from nextUpgradeTile), so assertTile guards regressions.
  if (next && upgrades > 0) {
    assertTile(next.key);
    const endpointTile = this.path[this.path.length - 1];
    for (let u = 0; u < upgrades; u++) {
      this.pendingUpgrades.push({ res: next, col: endpointTile.col, row: endpointTile.row });
    }
    this.upgradeBurst(endpointTile.x, endpointTile.y);
  }

  this.path.forEach((tile, i) => {
    this.grid[tile.row][tile.col] = null;
    this.tweens.add({
      targets: tile.sprite,
      scale: 0,
      angle: Phaser.Math.Between(-25, 25),
      alpha: 0,
      duration: this._dur(180 + i * 15),
      onComplete: () => {
        this.emitCollectParticles(tile.x, tile.y, res.color || "#ffffff", 2);
        tile.destroy();
      }
    });
  });

  // Cross-collect partner tiles: clear + animate using the SAME tween /
  // destroy / particle pattern as the path tiles, and accumulate +1 toward
  // each partner's produced resource. Cross-collected tiles do NOT spawn
  // upgrade tiles and do NOT trigger further cross-collects.
  // crossCollected is keyed by TILE KEY (not produced resource). The reducer
  // resolves the produced resource + the tile's UPGRADE_THRESHOLDS entry from
  // the tile key, so partners roll up at their real threshold (mirroring the
  // main chain). buildCrossCollectedCredits is the single source of truth for
  // this tile-keyed count map.
  const crossCollected = buildCrossCollectedCredits(crossTargets);
  crossTargets.forEach((target, i) => {
    const tileObj = this.grid[target.row]?.[target.col];
    this.grid[target.row][target.col] = null;
    if (tileObj) {
      this.tweens.add({
        targets: tileObj.sprite,
        scale: 0,
        angle: Phaser.Math.Between(-25, 25),
        alpha: 0,
        duration: this._dur(180 + i * 15),
        onComplete: () => {
          this.emitCollectParticles(tileObj.x, tileObj.y, tileObj.res?.color || "#ffffff", 2);
          tileObj.destroy();
        }
      });
    }
  });

  // Emit to React — gained is the full amount (state.js caps it).
  // resourceKey tells the reducer which resource to accumulate progress for.
  const totalGained = gained + ((bonusGains as Record<string, number>)[res.key] ?? 0);
  // Include tile positions so the reducer can extinguish fire/hazard cells
  const chainTiles = this.path.map(t => ({ key: t.res.key, row: t.row, col: t.col }));
  this.events.emit(SCENE_EVENTS.CHAIN_COLLECTED, { key: res.key, gained: totalGained, upgrades, chainLength: this.path.length, value: res.value, chain: chainTiles, resourceKey, crossCollected });

  // Reward burst — emit chain center in canvas-local coords so the React
  // layer can spawn a "+N" chip from the board → HUD coin pill.
  if (this.path.length > 0) {
    let sx = 0, sy = 0;
    for (const t of this.path) { sx += t.x; sy += t.y; }
    this.events.emit(SCENE_EVENTS.REWARD_BURST, {
      canvasX: sx / this.path.length,
      canvasY: sy / this.path.length,
      canvasW: this.scale?.gameSize?.width ?? 0,
      canvasH: this.scale?.gameSize?.height ?? 0,
      coins: totalGained * (res.value ?? 0),
    });
  }

  this.pathLines.forEach((l: Phaser.GameObjects.Graphics) => l.destroy());
  this.pathStars.forEach((s: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics) => s.destroy());
  if (this.pathNodeG) { this.pathNodeG.destroy(); this.pathNodeG = null; }
  this.pathLines = [];
  this.pathStars = [];
  this.path = [];
  this._prevPathLen = 0;
  this._prevStarGroups = 0;
  this.time.delayedCall(300, () => this.collapseBoard());
  this.time.delayedCall(310, () => this._syncGridToState());
}

export function _emitChainUpdate(this: GameScene, )  {
  const payload = buildChainUpdatePayload({
    path: this.path,
    nextUpgradeTile: (res: { key: string }) => this.nextUpgradeTile(res),
    effectiveThresholds: getRegistry(this.registry, "effectiveThresholds"),
    effectiveMinChain: this._effectiveMinChain(),
  });
  this.events.emit(SCENE_EVENTS.CHAIN_UPDATE, payload);
}
