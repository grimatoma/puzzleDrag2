/**
 * Lightweight handle to the currently-mounted Fiber Crush scene — the Fiber
 * analogue of `src/phaserBridge.ts`. Kept on a DISTINCT handle so the main
 * board scene (`window.__phaserScene` / `getPhaserScene`) is never clobbered.
 */
import type Phaser from "phaser";

let _scene: Phaser.Scene | null = null;
export function setFiberScene(scene: Phaser.Scene | null): void { _scene = scene; }
export function getFiberScene(): Phaser.Scene | null { return _scene; }
