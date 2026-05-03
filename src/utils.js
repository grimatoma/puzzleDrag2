import Phaser from "phaser";
import { UPGRADE_EVERY } from "./constants.js";

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function seasonIndexForTurns(turnsUsed) {
  if (turnsUsed <= 2) return 0;
  if (turnsUsed <= 5) return 1;
  if (turnsUsed <= 8) return 2;
  return 3;
}

export function upgradeCountForChain(chainLength) {
  return Math.floor(chainLength / UPGRADE_EVERY);
}

export function cssColor(num) {
  return Phaser.Display.Color.IntegerToColor(num).rgba;
}

export function hex(num) {
  return `#${num.toString(16).padStart(6, "0")}`;
}

export function runSelfTests() {
  console.assert(seasonIndexForTurns(0) === 0, "turn 0 should be Spring");
  console.assert(seasonIndexForTurns(2) === 0, "turn 2 should be Spring");
  console.assert(seasonIndexForTurns(3) === 1, "turn 3 should be Summer");
  console.assert(seasonIndexForTurns(6) === 2, "turn 6 should be Autumn");
  console.assert(seasonIndexForTurns(9) === 3, "turn 9 should be Winter");
  console.assert(upgradeCountForChain(2) === 0, "2-chain should not upgrade");
  console.assert(upgradeCountForChain(3) === 1, "3-chain should upgrade once");
  console.assert(upgradeCountForChain(8) === 2, "8-chain should upgrade twice: cells 3 and 6");
  console.assert(clamp(12, 0, 10) === 10, "clamp upper bound failed");
}
