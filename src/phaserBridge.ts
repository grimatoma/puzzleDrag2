// Lightweight handle to the currently-mounted Phaser scene. Used by the
// reducer / debug tools to dispatch back into the canvas (highlight tiles,
// run a tween, etc.) without pulling Phaser into the React bundle directly.
import type Phaser from "phaser";

let _scene: Phaser.Scene | null = null;
export function setPhaserScene(scene: Phaser.Scene | null): void { _scene = scene; }
export function getPhaserScene(): Phaser.Scene | null { return _scene; }
