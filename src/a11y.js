/**
 * Phase 11.3 + 11.4 — Accessibility helpers.
 *
 * announce(text, urgency?) — queues a screen-reader message.
 *   polite messages debounce within 200 ms (latest wins).
 *   assertive messages are never coalesced.
 * flushAnnouncements() — resets the queue (used in tests).
 * getQueue() — returns the current queue state (used in tests + UI drain).
 *
 * formatChainAnnouncement, formatModalAnnouncement, formatQuestAnnouncement —
 * pure string formatters covering every player-visible state change.
 *
 * isReducedMotion, getTweenDuration, screenShake, particleQuantity —
 * Phase 11.4 helpers; pass game state; no Phaser dependencies.
 */

// ─── Phase 11.3 — Announcement queue ─────────────────────────────────────────

const DEBOUNCE_MS = 200;
let _state = { polite: [], urgent: [], _lastPoliteTs: 0 };

/**
 * Queue a screen-reader announcement.
 * @param {string} text      - message text
 * @param {'polite'|'assertive'} [urgency='polite']
 */
export function announce(text, urgency = "polite") {
  const now = Date.now();
  if (urgency === "assertive") {
    _state.urgent.push({ text, ts: now });
    return;
  }
  // Polite debounce: coalesce within DEBOUNCE_MS by replacing last entry
  if (now - _state._lastPoliteTs < DEBOUNCE_MS && _state.polite.length) {
    _state.polite[_state.polite.length - 1] = { text, ts: now };
  } else {
    _state.polite.push({ text, ts: now });
  }
  _state._lastPoliteTs = now;
}

/** Reset all queues (used in tests and on page navigation). */
export function flushAnnouncements() {
  _state = { polite: [], urgent: [], _lastPoliteTs: 0 };
}

/** Snapshot of the current queue (used in tests and the React drain loop). */
export function getQueue() {
  return _state;
}

// ─── Phase 11.3 — Announcement formatters ────────────────────────────────────

/**
 * Format a chain-commit announcement.
 * @param {{ key: string, collected: number, upgrades: Array<{key:string,count:number}> }} result
 */
export function formatChainAnnouncement({ key, collected, upgrades = [] }) {
  if (!upgrades.length) return `Collected ${collected} ${key}.`;
  const u = upgrades[0];
  return `Collected ${collected} ${key}; ${u.count} ${u.key} upgrade spawned at the endpoint.`;
}

/**
 * Format a story-beat modal announcement.
 * Parses "Speaker: 'Quote'" from beat.body and renders
 * "Story beat: <title>. <Speaker> says: <Quote>"
 * @param {{ id: string, title: string, body: string }} beat
 */
export function formatModalAnnouncement(beat) {
  const m = beat.body.match(/^([A-Z][a-zA-Z ]+?):\s*['"]?(.+?)['"]?$/);
  return m
    ? `Story beat: ${beat.title}. ${m[1]} says: ${m[2]}`
    : `Story beat: ${beat.title}. ${beat.body}`;
}

/**
 * Format a quest-claim announcement.
 * @param {{ label: string, reward: { coins?: number, almanacXp?: number } }} quest
 */
export function formatQuestAnnouncement(quest) {
  const r = quest.reward ?? {};
  const parts = [];
  if (r.coins)     parts.push(`+${r.coins} coins`);
  if (r.almanacXp) parts.push(`+${r.almanacXp} XP`);
  return `Quest claimed: ${quest.label}. ${parts.join(", ")}.`;
}

// ─── Phase 11.4 — Reduced-motion helpers ─────────────────────────────────────

/**
 * Returns true when reduced motion should be applied.
 * Explicit user override (true/false) wins; null falls back to the OS media query.
 * @param {object} state - game state with state.settings.reducedMotion
 */
export function isReducedMotion(state) {
  const s = state?.settings?.reducedMotion;
  if (s === true || s === false) return s;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  return false;
}

/**
 * Returns the effective tween duration given the current motion preference.
 * When reduced, long tweens are clamped to 100 ms; short tweens and 0 pass through.
 * @param {object} state   - game state
 * @param {number} baseMs  - original tween duration in milliseconds
 */
export function getTweenDuration(state, baseMs) {
  if (!isReducedMotion(state)) return baseMs;
  return baseMs <= 100 ? baseMs : Math.min(baseMs, 100);
}

/**
 * Shake a Phaser camera — no-op when reduced motion is on.
 * @param {object} state     - game state
 * @param {number} intensity - shake intensity value
 * @param {object} camera    - Phaser camera-like with shake() method
 */
export function screenShake(state, intensity, camera) {
  if (isReducedMotion(state)) return;
  camera.shake(intensity, 0.005);
}

/**
 * Returns the particle burst quantity; 0 when reduced motion is on so callers
 * can replace the emitter with a static glow.
 * @param {object} state - game state
 * @param {number} base  - nominal particle count
 */
export function particleQuantity(state, base) {
  return isReducedMotion(state) ? 0 : base;
}
