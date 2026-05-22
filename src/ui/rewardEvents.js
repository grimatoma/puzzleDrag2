// Module-level event bus for board → HUD reward chips. Phaser side
// dispatches a "burst" CustomEvent with page-space coords + amount;
// the RewardChipsLayer listens and renders a floating chip that
// animates from the board source to the HUD coin pill.

const target = typeof EventTarget !== "undefined" ? new EventTarget() : null;

let coinAnchorEl = null;

export function setCoinAnchorEl(el) {
  coinAnchorEl = el;
}

export function getCoinAnchorRect() {
  return coinAnchorEl?.getBoundingClientRect?.() ?? null;
}

export function onBurst(handler) {
  if (!target) return () => {};
  target.addEventListener("burst", handler);
  return () => target.removeEventListener("burst", handler);
}

export function emitBurst(detail) {
  if (!target) return;
  target.dispatchEvent(new CustomEvent("burst", { detail }));
}
