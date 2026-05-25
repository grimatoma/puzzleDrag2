// Archived ("legacy") icon draws — the original versions of icons that have
// been replaced by improved drawings in their original category files. These
// are kept here so designers can compare the new draw to the old draw in the
// Dev Panel's Icons tab. They are NOT referenced anywhere in the live
// game — only the IconsTab pulls them in via the registry.
//
// Each entry has `archive: true` and `replacedBy: "<active_key>"` metadata
// so IconsTab can group it visually next to its replacement.

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Crafted items (originally from recipes.js)
// ---------------------------------------------------------------------------

function drawWaterPumpLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#4a4a52";
  ctx.fillRect(-10, 10, 20, 8);
  ctx.fillStyle = "#c84a3a";
  ctx.fillRect(-6, -10, 12, 20);
  ctx.strokeStyle = "#8a2a1a";
  ctx.lineWidth = 2;
  ctx.strokeRect(-6, -10, 12, 20);
  ctx.fillStyle = "#8a8a92";
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.lineTo(-16, -2);
  ctx.lineTo(-16, 4);
  ctx.lineTo(-10, 4);
  ctx.lineTo(-10, 2);
  ctx.lineTo(-6, 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#a0a0a8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(6, -8);
  ctx.lineTo(16, -16);
  ctx.stroke();
  ctx.fillStyle = "#c84a3a";
  ctx.beginPath();
  ctx.arc(16, -16, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawExplosivesLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#d44a3a";
  ctx.strokeStyle = "#8a2a1a";
  ctx.lineWidth = 2;
  ctx.save();
  ctx.translate(-8, 4);
  ctx.rotate(-0.2);
  rr(ctx, -6, -12, 12, 24, 3); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(8, 4);
  ctx.rotate(0.2);
  rr(ctx, -6, -12, 12, 24, 3); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(0, 6);
  rr(ctx, -6, -12, 12, 24, 3); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(-12, -2, 24, 6);
  ctx.strokeStyle = "#b09060";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.quadraticCurveTo(5, -14, -4, -18);
  ctx.stroke();
  ctx.fillStyle = "#f4d030";
  ctx.beginPath();
  ctx.arc(-4, -18, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawHoneyrollLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#f0c050";
  ctx.strokeStyle = "#8a6010";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 4, 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-10, 4);
  ctx.quadraticCurveTo(-5, 10, 0, 4);
  ctx.quadraticCurveTo(5, -2, 10, 4);
  ctx.stroke();
  ctx.fillStyle = "#d4658c";
  ctx.beginPath();
  ctx.ellipse(0, 4, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f4d030";
  ctx.beginPath();
  ctx.arc(6, -4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, -4);
  ctx.quadraticCurveTo(6, 4, 8, -4);
  ctx.fill();
}

function drawHarvestpieLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#8a8a92";
  ctx.beginPath();
  ctx.moveTo(-14, -2);
  ctx.lineTo(-10, 10);
  ctx.lineTo(10, 10);
  ctx.lineTo(14, -2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#d49060";
  ctx.strokeStyle = "#7a4a28";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -2, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#a3486a";
  ctx.beginPath();
  ctx.ellipse(0, -2, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d49060";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-8, -5); ctx.lineTo(8, 1);
  ctx.moveTo(-4, -6); ctx.lineTo(12, -2);
  ctx.moveTo(-10, -1); ctx.lineTo(6, -5);
  ctx.moveTo(-2, 2); ctx.lineTo(10, -4);
  ctx.stroke();
}

function drawPreserveLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#e0e0e8";
  ctx.globalAlpha = 0.8;
  rr(ctx, -10, -4, 20, 22, 4);
  ctx.fill();
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = "#9a6888";
  rr(ctx, -8, 2, 16, 14, 2);
  ctx.fill();
  ctx.fillStyle = "#f4e0c0";
  ctx.fillRect(-6, 6, 12, 6);
  ctx.fillStyle = "#b03040";
  ctx.fillRect(-12, -8, 24, 6);
  ctx.strokeStyle = "#d49060";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.lineTo(12, -2);
  ctx.stroke();
}

function drawTinctureLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#d0e8e0";
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.lineTo(-10, 10);
  ctx.arcTo(-10, 16, 0, 16, 6);
  ctx.arcTo(10, 16, 10, 10, 6);
  ctx.lineTo(6, -2);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = "#6b8a3a";
  ctx.beginPath();
  ctx.moveTo(-8, 6);
  ctx.lineTo(-9, 10);
  ctx.arcTo(-9, 15, 0, 15, 5);
  ctx.arcTo(9, 15, 9, 10, 5);
  ctx.lineTo(8, 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#b09060";
  ctx.fillRect(-4, -8, 8, 6);
  ctx.strokeStyle = "#8a8a92";
  ctx.lineWidth = 2;
  ctx.strokeRect(-5, -3, 10, 2);
}

function drawIronHingeLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#7a8a96";
  ctx.strokeStyle = "#2a3a46";
  ctx.lineWidth = 2;
  rr(ctx, -14, -8, 12, 16, 2);
  ctx.fill(); ctx.stroke();
  rr(ctx, 2, -8, 12, 16, 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#5a6a76";
  rr(ctx, -4, -10, 8, 20, 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#2a3a46";
  ctx.beginPath(); ctx.arc(-8, -4, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-8, 4, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(8, -4, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(8, 4, 1.5, 0, Math.PI * 2); ctx.fill();
}

function drawCobblepathLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#9a9a8a";
  ctx.strokeStyle = "#404038";
  ctx.lineWidth = 2;
  const stones = [
    { x: -8, y: -6, r: 6 },
    { x: 6, y: -8, r: 5 },
    { x: 0, y: 4, r: 8 },
    { x: -12, y: 6, r: 5 },
    { x: 10, y: 6, r: 6 },
  ];
  for (const s of stones) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawGoldringLegacy(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "#ffd34c";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#a08020";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-6, -3, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawGemcrownLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#ffd34c";
  ctx.strokeStyle = "#a08020";
  ctx.lineWidth = 2;
  rr(ctx, -14, 6, 28, 6, 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-14, 6);
  ctx.lineTo(-18, -6);
  ctx.lineTo(-6, 2);
  ctx.lineTo(0, -10);
  ctx.lineTo(6, 2);
  ctx.lineTo(18, -6);
  ctx.lineTo(14, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#65e5ff";
  ctx.beginPath(); ctx.arc(-18, -6, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -10, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(18, -6, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function drawIronframeLegacy(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "#6a7a86";
  ctx.lineWidth = 3;
  ctx.strokeRect(-12, -12, 24, 24);
  ctx.beginPath();
  ctx.moveTo(-12, -12); ctx.lineTo(12, 12);
  ctx.moveTo(12, -12); ctx.lineTo(-12, 12);
  ctx.stroke();
  ctx.fillStyle = "#2a3040";
  const points = [[-12,-12], [12,-12], [-12,12], [12,12], [0,0]];
  for (const [x,y] of points) {
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStoneworkLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#8a8a7a";
  ctx.strokeStyle = "#383828";
  ctx.lineWidth = 2;
  rr(ctx, -14, 4, 16, 8, 1); ctx.fill(); ctx.stroke();
  rr(ctx, 4, 4, 10, 8, 1); ctx.fill(); ctx.stroke();
  rr(ctx, -10, -4, 12, 8, 1); ctx.fill(); ctx.stroke();
  rr(ctx, 4, -4, 10, 8, 1); ctx.fill(); ctx.stroke();
  rr(ctx, -6, -12, 12, 8, 1); ctx.fill(); ctx.stroke();
}

function drawChowderLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#d49060";
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 6, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e0d0b0";
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e88439";
  ctx.beginPath(); ctx.arc(-6, -1, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(4, 2, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#b0c8d4";
  ctx.fillRect(0, -3, 4, 3);
  ctx.fillRect(-2, 1, 3, 2);
  ctx.fillStyle = "#d49060";
  ctx.strokeStyle = "#7a4a28";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI);
  ctx.quadraticCurveTo(0, 16, -16, 0);
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.quadraticCurveTo(-16, 14, 0, 14);
  ctx.quadraticCurveTo(16, 14, 16, 0);
  ctx.arc(0, 0, 16, 0, Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 6, 0, 0, Math.PI);
  ctx.stroke();
}

function drawFishOilBottledLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#e8e0d0";
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(-4, -8);
  ctx.lineTo(-8, 10);
  ctx.arcTo(-8, 14, 0, 14, 4);
  ctx.arcTo(8, 14, 8, 10, 4);
  ctx.lineTo(4, -8);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = "#e8d050";
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.lineTo(-7, 10);
  ctx.arcTo(-7, 13, 0, 13, 3);
  ctx.arcTo(7, 13, 7, 10, 3);
  ctx.lineTo(6, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#9b6b3e";
  ctx.fillRect(-3, -12, 6, 4);
  ctx.strokeStyle = "#5e3a1d";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(4, -6);
  ctx.lineTo(10, 0);
  ctx.stroke();
  ctx.fillStyle = "#d4c4a0";
  ctx.beginPath();
  ctx.arc(10, 2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// UI icons (originally from uiElements.js)
// ---------------------------------------------------------------------------

function drawLockLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#e0a020";
  ctx.strokeStyle = "#8a6010";
  ctx.lineWidth = 2;
  ctx.fillRect(-10, -2, 20, 16);
  ctx.strokeRect(-10, -2, 20, 16);
  ctx.strokeStyle = "#9090a0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -2, 6, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = "#6a4010";
  ctx.beginPath();
  ctx.arc(0, 4, 3, 0, Math.PI * 2);
  ctx.moveTo(-2, 10);
  ctx.lineTo(2, 10);
  ctx.lineTo(1, 4);
  ctx.lineTo(-1, 4);
  ctx.fill();
}

function drawEnterArrowLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(-6, -10);
  ctx.lineTo(10, 0);
  ctx.lineTo(-6, 10);
  ctx.closePath();
  ctx.fill();
}

function drawCancelLegacy(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "#ff4444";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-8, -8);
  ctx.lineTo(8, 8);
  ctx.moveTo(8, -8);
  ctx.lineTo(-8, 8);
  ctx.stroke();
}

function drawBuildHammerLegacy(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "#8b5a2b";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-6, 10);
  ctx.lineTo(6, -2);
  ctx.stroke();
  ctx.fillStyle = "#9090a0";
  ctx.beginPath();
  ctx.moveTo(8, -4);
  ctx.lineTo(0, -12);
  ctx.lineTo(-4, -8);
  ctx.lineTo(4, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#9090a0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.quadraticCurveTo(-4, -16, -8, -14);
  ctx.stroke();
}

function drawPinLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#ff4444";
  ctx.strokeStyle = "#aa1111";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -8, 8, Math.PI, 0);
  ctx.quadraticCurveTo(8, 0, 0, 12);
  ctx.quadraticCurveTo(-8, 0, -8, -8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#8a0a0a";
  ctx.beginPath();
  ctx.arc(0, -8, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawSettingsGearLegacy(ctx: CanvasRenderingContext2D) {
  // NOTE: this draw is buggy in the original (loops lineTo without moveTo).
  // Kept exactly as it was for archival/diff purposes.
  ctx.fillStyle = "#8a9a9a";
  ctx.strokeStyle = "#4a5a5a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.lineTo(Math.cos(a - 0.1) * 12, Math.sin(a - 0.1) * 12);
    ctx.lineTo(Math.cos(a - 0.1) * 16, Math.sin(a - 0.1) * 16);
    ctx.lineTo(Math.cos(a + 0.1) * 16, Math.sin(a + 0.1) * 16);
    ctx.lineTo(Math.cos(a + 0.1) * 12, Math.sin(a + 0.1) * 12);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#2a3a3a";
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawClipboardLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#d4a373";
  ctx.fillRect(-10, -8, 20, 24);
  ctx.fillStyle = "#fefae0";
  ctx.fillRect(-8, -4, 16, 18);
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
  ctx.moveTo(-6, 4); ctx.lineTo(6, 4);
  ctx.moveTo(-6, 8); ctx.lineTo(6, 8);
  ctx.stroke();
  ctx.fillStyle = "#b0b0b0";
  ctx.fillRect(-6, -12, 12, 6);
  ctx.beginPath(); ctx.arc(0, -10, 2, 0, Math.PI * 2); ctx.fill();
}

function drawHomeLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#f4a261";
  ctx.fillRect(-10, 0, 20, 14);
  ctx.fillStyle = "#e76f51";
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(0, -12);
  ctx.lineTo(14, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#264653";
  ctx.fillRect(-4, 6, 8, 8);
}

function drawTrophyLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#e9c46a";
  ctx.strokeStyle = "#d4a373";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -8);
  ctx.lineTo(10, -8);
  ctx.quadraticCurveTo(8, 6, 0, 8);
  ctx.quadraticCurveTo(-8, 6, -10, -8);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-10, -2, 4, Math.PI * 1.5, Math.PI * 0.5, true);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(10, -2, 4, Math.PI * 1.5, Math.PI * 0.5);
  ctx.stroke();
  ctx.fillRect(-6, 8, 12, 6);
  ctx.strokeRect(-6, 8, 12, 6);
}

function drawShopLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#e63946";
  ctx.beginPath();
  ctx.moveTo(-12, -6);
  ctx.lineTo(12, -6);
  ctx.lineTo(14, 2);
  ctx.lineTo(-14, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f1faee";
  ctx.beginPath();
  ctx.moveTo(-4, -6); ctx.lineTo(4, -6); ctx.lineTo(5, 2); ctx.lineTo(-5, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#a8dadc";
  ctx.fillRect(-10, 2, 20, 12);
  ctx.fillStyle = "#457b9d";
  ctx.fillRect(-12, 6, 24, 4);
}

function drawBackpackLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#606c38";
  ctx.strokeStyle = "#283618";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, 12);
  ctx.lineTo(10, 12);
  ctx.quadraticCurveTo(12, 0, 8, -8);
  ctx.lineTo(-8, -8);
  ctx.quadraticCurveTo(-12, 0, -10, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#dda15e";
  ctx.beginPath();
  ctx.arc(0, 6, 6, 0, Math.PI, true);
  ctx.fill();
  ctx.stroke();
  ctx.strokeRect(-6, -12, 4, 4);
  ctx.strokeRect(2, -12, 4, 4);
}

function drawMapLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#fefae0";
  ctx.strokeStyle = "#d4a373";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, -8);
  ctx.lineTo(-4, -12);
  ctx.lineTo(4, -8);
  ctx.lineTo(12, -12);
  ctx.lineTo(12, 8);
  ctx.lineTo(4, 12);
  ctx.lineTo(-4, 8);
  ctx.lineTo(-12, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-4, -12); ctx.lineTo(-4, 8);
  ctx.moveTo(4, -8); ctx.lineTo(4, 12);
  ctx.stroke();
  ctx.fillStyle = "#e63946";
  ctx.beginPath();
  ctx.arc(0, 2, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawPeopleLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#457b9d";
  ctx.beginPath(); ctx.arc(-4, -4, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-4, 10, 8, Math.PI, 0); ctx.fill();
  ctx.fillStyle = "#e63946";
  ctx.beginPath(); ctx.arc(6, -2, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6, 10, 7, Math.PI, 0); ctx.fill();
}

function drawPuzzleLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#a8dadc";
  ctx.strokeStyle = "#457b9d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, -8);
  ctx.lineTo(-2, -8); ctx.arc(0, -10, 2, Math.PI, 0); ctx.lineTo(2, -8);
  ctx.lineTo(8, -8);
  ctx.lineTo(8, -2); ctx.arc(10, 0, 2, -Math.PI/2, Math.PI/2); ctx.lineTo(8, 2);
  ctx.lineTo(8, 8);
  ctx.lineTo(2, 8); ctx.arc(0, 6, 2, 0, Math.PI, true); ctx.lineTo(-2, 8);
  ctx.lineTo(-8, 8);
  ctx.lineTo(-8, 2); ctx.arc(-6, 0, 2, Math.PI/2, -Math.PI/2, true); ctx.lineTo(-8, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawPortalLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#9d4edd";
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c77dff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, 3, 5, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawStarLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#ffb703";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 12 : 5;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

function drawWarningLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#f4a261";
  ctx.strokeStyle = "#e76f51";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(12, 10);
  ctx.lineTo(-12, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#264653";
  ctx.fillRect(-1, -4, 2, 6);
  ctx.fillRect(-1, 4, 2, 2);
}

function drawWaterLegacy(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "#00b4d8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.quadraticCurveTo(-6, -6, 0, 0);
  ctx.quadraticCurveTo(6, 6, 12, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-12, 8);
  ctx.quadraticCurveTo(-6, 2, 0, 8);
  ctx.quadraticCurveTo(6, 14, 12, 8);
  ctx.stroke();
}

function drawScaleLegacy(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "#8b5a2b";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-6, 12); ctx.lineTo(6, 12); ctx.moveTo(0, 12); ctx.lineTo(0, -8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(10, -8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-14, 2); ctx.lineTo(-6, 2); ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(10, -8); ctx.lineTo(6, 2); ctx.lineTo(14, 2); ctx.closePath(); ctx.stroke();
}

function drawDevToolsLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#8a9a9a";
  ctx.beginPath();
  ctx.arc(-8, -8, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8a9a9a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-8, -8); ctx.lineTo(6, 6);
  ctx.stroke();
}

function drawHeartLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#ff4444";
  ctx.beginPath();
  ctx.arc(-4, -4, 4, Math.PI, 0);
  ctx.arc(4, -4, 4, Math.PI, 0);
  ctx.lineTo(0, 6);
  ctx.closePath();
  ctx.fill();
}

function drawFarmerLegacy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#e9c46a";
  ctx.beginPath();
  ctx.ellipse(0, -6, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -8, 5, 5, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#f4a261";
  ctx.beginPath();
  ctx.arc(0, -2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a9d8f";
  ctx.beginPath();
  ctx.arc(0, 10, 8, Math.PI, 0);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Registry — each entry mirrors the live one but with `archive: true` and
// `replacedBy` pointing at the active key. IconsTab uses these to group the
// legacy entry next to its replacement and badge it accordingly.
// ---------------------------------------------------------------------------

export const ICONS = {
  legacy_water_pump:       { label: "Water Pump (legacy)",        color: "#c84a3a", draw: drawWaterPumpLegacy,       archive: true, replacedBy: "water_pump" },
  legacy_explosives:       { label: "Explosives (legacy)",        color: "#d44a3a", draw: drawExplosivesLegacy,      archive: true, replacedBy: "explosives" },
  legacy_honeyroll:        { label: "Honey Roll (legacy)",        color: "#f0c050", draw: drawHoneyrollLegacy,       archive: true, replacedBy: "honeyroll" },
  legacy_harvestpie:       { label: "Harvest Pie (legacy)",       color: "#d4784a", draw: drawHarvestpieLegacy,      archive: true, replacedBy: "harvestpie" },
  legacy_preserve:         { label: "Preserve Jar (legacy)",      color: "#9a6888", draw: drawPreserveLegacy,        archive: true, replacedBy: "preserve" },
  legacy_tincture:         { label: "Berry Tincture (legacy)",    color: "#6b8a3a", draw: drawTinctureLegacy,        archive: true, replacedBy: "tincture" },
  legacy_iron_hinge:       { label: "Iron Hinge (legacy)",        color: "#7a8a96", draw: drawIronHingeLegacy,       archive: true, replacedBy: "iron_hinge" },
  legacy_ironframe:        { label: "Iron Frame (legacy)",        color: "#6a7a86", draw: drawIronframeLegacy,       archive: true, replacedBy: "ironframe" },
  legacy_cobblepath:       { label: "Cobble Path (legacy)",       color: "#9a9a8a", draw: drawCobblepathLegacy,      archive: true, replacedBy: "cobblepath" },
  legacy_goldring:         { label: "Gold Ring (legacy)",         color: "#ffd34c", draw: drawGoldringLegacy,        archive: true, replacedBy: "goldring" },
  legacy_gemcrown:         { label: "Gem Crown (legacy)",         color: "#65e5ff", draw: drawGemcrownLegacy,        archive: true, replacedBy: "gemcrown" },
  legacy_stonework:        { label: "Stonework (legacy)",         color: "#8a8a7a", draw: drawStoneworkLegacy,       archive: true, replacedBy: "stonework" },
  legacy_chowder:          { label: "Chowder (legacy)",           color: "#d4b888", draw: drawChowderLegacy,         archive: true, replacedBy: "chowder" },
  legacy_fish_oil_bottled: { label: "Fish Oil (legacy)",          color: "#e8d050", draw: drawFishOilBottledLegacy,  archive: true, replacedBy: "fish_oil_bottled" },

  legacy_ui_lock:      { label: "Lock (legacy)",       color: "#e0a020", draw: drawLockLegacy,         archive: true, replacedBy: "ui_lock" },
  legacy_ui_enter:     { label: "Enter (legacy)",      color: "#ffffff", draw: drawEnterArrowLegacy,   archive: true, replacedBy: "ui_enter" },
  legacy_ui_cancel:    { label: "Cancel (legacy)",     color: "#ff4444", draw: drawCancelLegacy,       archive: true, replacedBy: "ui_cancel" },
  legacy_ui_build:     { label: "Build (legacy)",      color: "#8b5a2b", draw: drawBuildHammerLegacy,  archive: true, replacedBy: "ui_build" },
  legacy_ui_pin:       { label: "Pin (legacy)",        color: "#ff4444", draw: drawPinLegacy,          archive: true, replacedBy: "ui_pin" },
  legacy_ui_settings:  { label: "Settings (legacy)",   color: "#8a9a9a", draw: drawSettingsGearLegacy, archive: true, replacedBy: "ui_settings" },
  legacy_ui_clipboard: { label: "Clipboard (legacy)",  color: "#d4a373", draw: drawClipboardLegacy,    archive: true, replacedBy: "ui_clipboard" },
  legacy_ui_home:      { label: "Home (legacy)",       color: "#f4a261", draw: drawHomeLegacy,         archive: true, replacedBy: "ui_home" },
  legacy_ui_trophy:    { label: "Trophy (legacy)",     color: "#e9c46a", draw: drawTrophyLegacy,       archive: true, replacedBy: "ui_trophy" },
  legacy_ui_shop:      { label: "Shop (legacy)",       color: "#e63946", draw: drawShopLegacy,         archive: true, replacedBy: "ui_shop" },
  legacy_ui_inventory: { label: "Inventory (legacy)",  color: "#606c38", draw: drawBackpackLegacy,     archive: true, replacedBy: "ui_inventory" },
  legacy_ui_map:       { label: "Map (legacy)",        color: "#d4a373", draw: drawMapLegacy,          archive: true, replacedBy: "ui_map" },
  legacy_ui_people:    { label: "People (legacy)",     color: "#457b9d", draw: drawPeopleLegacy,       archive: true, replacedBy: "ui_people" },
  legacy_ui_puzzle:    { label: "Puzzle (legacy)",     color: "#a8dadc", draw: drawPuzzleLegacy,       archive: true, replacedBy: "ui_puzzle" },
  legacy_ui_portal:    { label: "Portal (legacy)",     color: "#9d4edd", draw: drawPortalLegacy,       archive: true, replacedBy: "ui_portal" },
  legacy_ui_star:      { label: "Star (legacy)",       color: "#ffb703", draw: drawStarLegacy,         archive: true, replacedBy: "ui_star" },
  legacy_ui_warning:   { label: "Warning (legacy)",    color: "#f4a261", draw: drawWarningLegacy,      archive: true, replacedBy: "ui_warning" },
  legacy_ui_water:     { label: "Water (legacy)",      color: "#00b4d8", draw: drawWaterLegacy,        archive: true, replacedBy: "ui_water" },
  legacy_ui_scale:     { label: "Scale (legacy)",      color: "#8b5a2b", draw: drawScaleLegacy,        archive: true, replacedBy: "ui_scale" },
  legacy_ui_devtools:  { label: "Dev Tools (legacy)",  color: "#8a9a9a", draw: drawDevToolsLegacy,     archive: true, replacedBy: "ui_devtools" },
  legacy_ui_heart:     { label: "Heart (legacy)",      color: "#ff4444", draw: drawHeartLegacy,        archive: true, replacedBy: "ui_heart" },
  legacy_ui_farmer:    { label: "Farmer (legacy)",     color: "#e9c46a", draw: drawFarmerLegacy,       archive: true, replacedBy: "ui_farmer" },
};
