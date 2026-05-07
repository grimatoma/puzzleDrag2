import { UPGRADE_EVERY, ROWS, COLS, MAX_TURNS } from "./constants.js";

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function upgradeCountForChain(chainLength) {
  return Math.floor(chainLength / UPGRADE_EVERY);
}

export function hex(num) {
  return `#${num.toString(16).padStart(6, "0")}`;
}

export function makeBubble(npc, text, ms = 1800) {
  return { id: Date.now(), npc, text, ms };
}

/** Returns the season index (0=Spring, 1=Summer, 2=Autumn, 3=Winter) for a given turn count. */
export function seasonIndexForTurns(turns) {
  if (turns <= 2) return 0; // Spring
  if (turns <= 5) return 1; // Summer
  if (turns <= 8) return 2; // Autumn
  return 3;                 // Winter
}

export function runSelfTests() {
  console.assert(upgradeCountForChain(2) === 0, "2-chain should not upgrade");
  console.assert(upgradeCountForChain(3) === 1, "3-chain should upgrade once");
  console.assert(upgradeCountForChain(8) === 2, "8-chain should upgrade twice: cells 3 and 6");
  console.assert(clamp(12, 0, 10) === 10, "clamp upper bound failed");
  // 0.1 — Grid size
  console.assert(ROWS === 6, "ROWS must be 6");
  console.assert(COLS === 6, "COLS must be 6");
  // 0.2 — Turn count
  console.assert(MAX_TURNS === 10, "MAX_TURNS must be 10");
  console.assert(seasonIndexForTurns(0)  === 0, "turn 0 → Spring");
  console.assert(seasonIndexForTurns(3)  === 1, "turn 3 → Summer");
  console.assert(seasonIndexForTurns(6)  === 2, "turn 6 → Autumn");
  console.assert(seasonIndexForTurns(9)  === 3, "turn 9 → Winter");
  console.assert(seasonIndexForTurns(10) === 3, "turn 10 → still Winter");
}
