// Module-level event bus for board → HUD reward chips. Phaser side
// dispatches a "burst" CustomEvent with page-space coords + amount;
// the RewardChipsLayer listens and renders a floating chip that
// animates from the board source to the HUD coin pill.

const target = typeof EventTarget !== "undefined" ? new EventTarget() : null;

let coinAnchorEl: HTMLElement | null = null;

export function setCoinAnchorEl(el: HTMLElement | null) {
  coinAnchorEl = el;
}

export function getCoinAnchorRect(): DOMRect | null {
  return coinAnchorEl?.getBoundingClientRect?.() ?? null;
}

export interface BurstDetail {
  pageX: number;
  pageY: number;
  coins: number;
}

export type BurstHandler = (event: CustomEvent<BurstDetail>) => void;

export function onBurst(handler: BurstHandler): () => void {
  if (!target) return () => {};
  const listener = handler as EventListener;
  target.addEventListener("burst", listener);
  return () => target.removeEventListener("burst", listener);
}

export function emitBurst(detail: BurstDetail) {
  if (!target) return;
  target.dispatchEvent(new CustomEvent("burst", { detail }));
}
