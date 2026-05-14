// System UI icons to replace emojis
function drawLock(ctx) {
  ctx.fillStyle = "#e0a020";
  ctx.strokeStyle = "#8a6010";
  ctx.lineWidth = 2;
  
  // Body
  ctx.fillRect(-10, -2, 20, 16);
  ctx.strokeRect(-10, -2, 20, 16);
  
  // Shackle
  ctx.strokeStyle = "#9090a0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -2, 6, Math.PI, 0);
  ctx.stroke();
  
  // Keyhole
  ctx.fillStyle = "#6a4010";
  ctx.beginPath();
  ctx.arc(0, 4, 3, 0, Math.PI * 2);
  ctx.moveTo(-2, 10);
  ctx.lineTo(2, 10);
  ctx.lineTo(1, 4);
  ctx.lineTo(-1, 4);
  ctx.fill();
}

function drawEnterArrow(ctx) {
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(-6, -10);
  ctx.lineTo(10, 0);
  ctx.lineTo(-6, 10);
  ctx.closePath();
  ctx.fill();
}

function drawCancel(ctx) {
  ctx.strokeStyle = "#ff4444";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-8, -8);
  ctx.lineTo(8, 8);
  ctx.moveTo(8, -8);
  ctx.lineTo(-8, 8);
  ctx.stroke();
}

function drawBuildHammer(ctx) {
  // Handle
  ctx.strokeStyle = "#8b5a2b";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-6, 10);
  ctx.lineTo(6, -2);
  ctx.stroke();
  
  // Head
  ctx.fillStyle = "#9090a0";
  ctx.beginPath();
  ctx.moveTo(8, -4);
  ctx.lineTo(0, -12);
  ctx.lineTo(-4, -8);
  ctx.lineTo(4, 0);
  ctx.closePath();
  ctx.fill();
  
  // Claw
  ctx.strokeStyle = "#9090a0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.quadraticCurveTo(-4, -16, -8, -14);
  ctx.stroke();
}

function drawPin(ctx) {
  ctx.fillStyle = "#ff4444";
  ctx.strokeStyle = "#aa1111";
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  ctx.arc(0, -8, 8, Math.PI, 0);
  ctx.quadraticCurveTo(8, 0, 0, 12);
  ctx.quadraticCurveTo(-8, 0, -8, -8);
  ctx.fill();
  ctx.stroke();
  
  // Hole
  ctx.fillStyle = "#8a0a0a";
  ctx.beginPath();
  ctx.arc(0, -8, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawSettingsGear(ctx) {
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

function drawClipboard(ctx) {
  // Board
  ctx.fillStyle = "#d4a373";
  ctx.fillRect(-10, -8, 20, 24);
  
  // Paper
  ctx.fillStyle = "#fefae0";
  ctx.fillRect(-8, -4, 16, 18);
  
  // Lines
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
  ctx.moveTo(-6, 4); ctx.lineTo(6, 4);
  ctx.moveTo(-6, 8); ctx.lineTo(6, 8);
  ctx.stroke();
  
  // Clip
  ctx.fillStyle = "#b0b0b0";
  ctx.fillRect(-6, -12, 12, 6);
  ctx.beginPath(); ctx.arc(0, -10, 2, 0, Math.PI * 2); ctx.fill();
}

function drawHome(ctx) {
  // Base
  ctx.fillStyle = "#f4a261";
  ctx.fillRect(-10, 0, 20, 14);
  
  // Roof
  ctx.fillStyle = "#e76f51";
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(0, -12);
  ctx.lineTo(14, 0);
  ctx.closePath();
  ctx.fill();
  
  // Door
  ctx.fillStyle = "#264653";
  ctx.fillRect(-4, 6, 8, 8);
}

function drawTrophy(ctx) {
  ctx.fillStyle = "#e9c46a";
  ctx.strokeStyle = "#d4a373";
  ctx.lineWidth = 2;
  
  // Cup
  ctx.beginPath();
  ctx.moveTo(-10, -8);
  ctx.lineTo(10, -8);
  ctx.quadraticCurveTo(8, 6, 0, 8);
  ctx.quadraticCurveTo(-8, 6, -10, -8);
  ctx.fill();
  ctx.stroke();
  
  // Handles
  ctx.beginPath();
  ctx.arc(-10, -2, 4, Math.PI * 1.5, Math.PI * 0.5, true);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(10, -2, 4, Math.PI * 1.5, Math.PI * 0.5);
  ctx.stroke();
  
  // Base
  ctx.fillRect(-6, 8, 12, 6);
  ctx.strokeRect(-6, 8, 12, 6);
}

function drawShop(ctx) {
  // Awning
  ctx.fillStyle = "#e63946";
  ctx.beginPath();
  ctx.moveTo(-12, -6);
  ctx.lineTo(12, -6);
  ctx.lineTo(14, 2);
  ctx.lineTo(-14, 2);
  ctx.closePath();
  ctx.fill();
  
  // Stripes
  ctx.fillStyle = "#f1faee";
  ctx.beginPath();
  ctx.moveTo(-4, -6); ctx.lineTo(4, -6); ctx.lineTo(5, 2); ctx.lineTo(-5, 2);
  ctx.closePath();
  ctx.fill();
  
  // Stand
  ctx.fillStyle = "#a8dadc";
  ctx.fillRect(-10, 2, 20, 12);
  
  // Counter
  ctx.fillStyle = "#457b9d";
  ctx.fillRect(-12, 6, 24, 4);
}

function drawBackpack(ctx) {
  ctx.fillStyle = "#606c38";
  ctx.strokeStyle = "#283618";
  ctx.lineWidth = 2;
  
  // Main bag
  ctx.beginPath();
  ctx.moveTo(-10, 12);
  ctx.lineTo(10, 12);
  ctx.quadraticCurveTo(12, 0, 8, -8);
  ctx.lineTo(-8, -8);
  ctx.quadraticCurveTo(-12, 0, -10, 12);
  ctx.fill();
  ctx.stroke();
  
  // Pocket
  ctx.fillStyle = "#dda15e";
  ctx.beginPath();
  ctx.arc(0, 6, 6, 0, Math.PI, true);
  ctx.fill();
  ctx.stroke();
  
  // Straps
  ctx.strokeRect(-6, -12, 4, 4);
  ctx.strokeRect(2, -12, 4, 4);
}

function drawMap(ctx) {
  ctx.fillStyle = "#fefae0";
  ctx.strokeStyle = "#d4a373";
  ctx.lineWidth = 2;
  
  // Folds
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
  
  // Mark
  ctx.fillStyle = "#e63946";
  ctx.beginPath();
  ctx.arc(0, 2, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawPeople(ctx) {
  ctx.fillStyle = "#457b9d";
  // Person 1
  ctx.beginPath(); ctx.arc(-4, -4, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-4, 10, 8, Math.PI, 0); ctx.fill();
  
  // Person 2
  ctx.fillStyle = "#e63946";
  ctx.beginPath(); ctx.arc(6, -2, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6, 10, 7, Math.PI, 0); ctx.fill();
}

function drawPuzzle(ctx) {
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

function drawPortal(ctx) {
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

function drawStar(ctx) {
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

function drawWarning(ctx) {
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

function drawWater(ctx) {
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

function drawScale(ctx) {
  ctx.strokeStyle = "#8b5a2b";
  ctx.lineWidth = 2;
  // Base & pillar
  ctx.beginPath(); ctx.moveTo(-6, 12); ctx.lineTo(6, 12); ctx.moveTo(0, 12); ctx.lineTo(0, -8); ctx.stroke();
  // Beam
  ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(10, -8); ctx.stroke();
  // Pans
  ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-14, 2); ctx.lineTo(-6, 2); ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(10, -8); ctx.lineTo(6, 2); ctx.lineTo(14, 2); ctx.closePath(); ctx.stroke();
}

function drawDevTools(ctx) {
  // Wrench
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

function drawHeart(ctx) {
  ctx.fillStyle = "#ff4444";
  ctx.beginPath();
  ctx.arc(-4, -4, 4, Math.PI, 0);
  ctx.arc(4, -4, 4, Math.PI, 0);
  ctx.lineTo(0, 6);
  ctx.closePath();
  ctx.fill();
}

function drawFarmer(ctx) {
  // Straw hat
  ctx.fillStyle = "#e9c46a";
  ctx.beginPath();
  ctx.ellipse(0, -6, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -8, 5, 5, 0, Math.PI, 0);
  ctx.fill();
  // Face
  ctx.fillStyle = "#f4a261";
  ctx.beginPath();
  ctx.arc(0, -2, 4, 0, Math.PI * 2);
  ctx.fill();
  // Body (overalls)
  ctx.fillStyle = "#2a9d8f";
  ctx.beginPath();
  ctx.arc(0, 10, 8, Math.PI, 0);
  ctx.fill();
}

// ─── Kingdom-currency glyphs (Vol I #04 — kill emoji from production HUD) ──

function drawEmber(ctx) {
  // Layered flame: outer orange, inner gold, hot white core.
  ctx.fillStyle = "#c83a0a";
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.bezierCurveTo(10, -10, 12, 0, 8, 8);
  ctx.bezierCurveTo(6, 13, -6, 13, -8, 8);
  ctx.bezierCurveTo(-12, 0, -10, -10, 0, -16);
  ctx.fill();
  ctx.fillStyle = "#ff8a25";
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.bezierCurveTo(6, -6, 7, 2, 4, 7);
  ctx.bezierCurveTo(2, 10, -2, 10, -4, 7);
  ctx.bezierCurveTo(-7, 2, -6, -6, 0, -10);
  ctx.fill();
  ctx.fillStyle = "#ffd86b";
  ctx.beginPath();
  ctx.arc(0, 2, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawGem(ctx) {
  // Faceted diamond — light top, dark side, bright facet line.
  ctx.fillStyle = "#7ad3ff";
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(11, -3);
  ctx.lineTo(0, 13);
  ctx.lineTo(-11, -3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#3a98d8";
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(11, -3);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#bff0ff";
  ctx.beginPath();
  ctx.moveTo(-4, -7);
  ctx.lineTo(-1, -10);
  ctx.lineTo(0, -2);
  ctx.lineTo(-3, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1e6aa0";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(11, -3);
  ctx.lineTo(0, 13);
  ctx.lineTo(-11, -3);
  ctx.closePath();
  ctx.stroke();
}

function drawIngot(ctx) {
  // Trapezoidal silver ingot with a top highlight.
  ctx.fillStyle = "#7a808a";
  ctx.beginPath();
  ctx.moveTo(-12, 4);
  ctx.lineTo(-9, -5);
  ctx.lineTo(9, -5);
  ctx.lineTo(12, 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#b8bcc3";
  ctx.beginPath();
  ctx.moveTo(-9, -5);
  ctx.lineTo(9, -5);
  ctx.lineTo(11, -3);
  ctx.lineTo(-11, -3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3a4048";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-12, 4);
  ctx.lineTo(-9, -5);
  ctx.lineTo(9, -5);
  ctx.lineTo(12, 4);
  ctx.closePath();
  ctx.stroke();
}

function drawHearthToken(ctx) {
  // A small pediment-and-columns "civic" mark, evoking the Old Capital.
  ctx.fillStyle = "#e2b24a";
  ctx.fillRect(-12, 6, 24, 4);
  ctx.fillRect(-9, -2, 3, 8);
  ctx.fillRect(-2, -2, 3, 8);
  ctx.fillRect(5, -2, 3, 8);
  ctx.beginPath();
  ctx.moveTo(-13, -4);
  ctx.lineTo(13, -4);
  ctx.lineTo(0, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7a5a18";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-13, -4);
  ctx.lineTo(13, -4);
  ctx.lineTo(0, -14);
  ctx.closePath();
  ctx.stroke();
}

function drawCoinChip(ctx) {
  // Disc with a centered $ mark — used by the Hud coin pill.
  ctx.fillStyle = "#ffc239";
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a8780a";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#7a5638";
  ctx.font = "bold 16px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("$", 0, 1);
}

function drawBuildingChip(ctx) {
  // Little house silhouette — Hud "buildings" chip without emoji.
  ctx.fillStyle = "#c8845a";
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.lineTo(0, -12);
  ctx.lineTo(12, -2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#a86838";
  ctx.fillRect(-10, -2, 20, 12);
  ctx.fillStyle = "#3a2715";
  ctx.fillRect(-3, 3, 6, 7);
  ctx.strokeStyle = "#3a2715";
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-10, -2, 20, 12);
}

export const ICONS = {
  ui_lock: { label: "Lock", color: "#e0a020", draw: drawLock },
  ui_enter: { label: "Enter", color: "#ffffff", draw: drawEnterArrow },
  ui_cancel: { label: "Cancel", color: "#ff4444", draw: drawCancel },
  ui_build: { label: "Build", color: "#8b5a2b", draw: drawBuildHammer },
  ui_pin: { label: "Pin", color: "#ff4444", draw: drawPin },
  ui_settings: { label: "Settings", color: "#8a9a9a", draw: drawSettingsGear },
  ui_clipboard: { label: "Clipboard", color: "#d4a373", draw: drawClipboard },
  ui_home: { label: "Home", color: "#f4a261", draw: drawHome },
  ui_trophy: { label: "Trophy", color: "#e9c46a", draw: drawTrophy },
  ui_shop: { label: "Shop", color: "#e63946", draw: drawShop },
  ui_inventory: { label: "Inventory", color: "#606c38", draw: drawBackpack },
  ui_map: { label: "Map", color: "#d4a373", draw: drawMap },
  ui_people: { label: "People", color: "#457b9d", draw: drawPeople },
  ui_puzzle: { label: "Puzzle", color: "#a8dadc", draw: drawPuzzle },
  ui_portal: { label: "Portal", color: "#9d4edd", draw: drawPortal },
  ui_star: { label: "Star", color: "#ffb703", draw: drawStar },
  ui_warning: { label: "Warning", color: "#f4a261", draw: drawWarning },
  ui_water: { label: "Water", color: "#00b4d8", draw: drawWater },
  ui_scale: { label: "Scale", color: "#8b5a2b", draw: drawScale },
  ui_devtools: { label: "Dev Tools", color: "#8a9a9a", draw: drawDevTools },
  ui_heart: { label: "Heart", color: "#ff4444", draw: drawHeart },
  ui_farmer: { label: "Farmer", color: "#4f8c3a", draw: drawFarmer },
  // Vol I #04 — currency / civic icons that replace 🔥 💎 🏛️ ⌂ $ in the HUD.
  ui_ember: { label: "Ember", color: "#d6612a", draw: drawEmber },
  ui_gem: { label: "Gem", color: "#7ad3ff", draw: drawGem },
  ui_ingot: { label: "Core Ingot", color: "#b8bcc3", draw: drawIngot },
  ui_hearth_token: { label: "Hearth Token", color: "#e2b24a", draw: drawHearthToken },
  ui_coin: { label: "Coin", color: "#ffc239", draw: drawCoinChip },
  ui_building: { label: "Building", color: "#c8845a", draw: drawBuildingChip },
};
