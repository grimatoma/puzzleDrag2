import { UPGRADE_EVERY, ROWS, COLS } from "./constants.js";

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

export function runSelfTests() {
  console.assert(upgradeCountForChain(2) === 0, "2-chain should not upgrade");
  console.assert(upgradeCountForChain(3) === 1, "3-chain should upgrade once");
  console.assert(upgradeCountForChain(8) === 2, "8-chain should upgrade twice: cells 3 and 6");
  console.assert(clamp(12, 0, 10) === 10, "clamp upper bound failed");
  // 0.1 — Grid size
  console.assert(ROWS === 6, "ROWS must be 6");
  console.assert(COLS === 6, "COLS must be 6");
}
