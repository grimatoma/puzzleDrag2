// Audio module — synthesized sounds via Web Audio API (no binary assets needed)
let ctx = null;
let enabled = { sfx: true, music: false };

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export function setEnabled(next) {
  enabled = { ...enabled, ...next };
}

export function unlock() {
  const c = getCtx();
  if (c.state === 'suspended') c.resume();
}

// Each sound is an array of steps; each step is one oscillator note.
// gap: ms of silence before the NEXT step starts (cumulative offset).
const SOUNDS = {
  // Short rising bleep: 200Hz → 400Hz, sine, 80ms
  chainStart: {
    steps: [{ freq: 200, freqEnd: 400, dur: 80, type: 'sine', gain: 0.07 }],
  },
  // Bright triple bleep: 440-554-660 Hz, square, 50ms each, 30ms gap
  chainCollect: {
    steps: [
      { freq: 440, dur: 50, type: 'square', gain: 0.05, gap: 80 },
      { freq: 554, dur: 50, type: 'square', gain: 0.05, gap: 80, delay: 0.080 },
      { freq: 660, dur: 50, type: 'square', gain: 0.05, gap: 0,  delay: 0.160 },
    ],
  },
  // Sparkle: 880Hz → 1318Hz, sine, 120ms
  upgrade: {
    steps: [{ freq: 880, freqEnd: 1318, dur: 120, type: 'sine', gain: 0.06 }],
  },
  // Warm bell: 220Hz, triangle, 400ms with natural decay
  seasonTurn: {
    steps: [{ freq: 220, dur: 400, type: 'triangle', gain: 0.10 }],
  },
  // Soft pop: 300Hz, sine, 60ms
  npcBubble: {
    steps: [{ freq: 300, freqEnd: 200, dur: 60, type: 'sine', gain: 0.05 }],
  },
  // Major chord arpeggio: C4-E4-G4-C5 (262-330-392-524 Hz), square, 80ms each
  levelUp: {
    steps: [
      { freq: 262, dur: 80, type: 'square', gain: 0.05, gap: 100, delay: 0.000 },
      { freq: 330, dur: 80, type: 'square', gain: 0.05, gap: 100, delay: 0.100 },
      { freq: 392, dur: 80, type: 'square', gain: 0.05, gap: 100, delay: 0.200 },
      { freq: 524, dur: 80, type: 'square', gain: 0.06, gap: 0,   delay: 0.300 },
    ],
  },
  // Coin shimmer: 600 → 800Hz, square, 100ms
  coinSpend: {
    steps: [{ freq: 600, freqEnd: 800, dur: 100, type: 'square', gain: 0.05 }],
  },
  // Descending buzz: 400 → 200Hz, sawtooth, 150ms
  error: {
    steps: [{ freq: 400, freqEnd: 200, dur: 150, type: 'sawtooth', gain: 0.06 }],
  },
  // Watery whoosh: 180Hz → 90Hz, triangle, 350ms (low + slow for tide flip)
  tideSplash: {
    steps: [{ freq: 180, freqEnd: 90, dur: 350, type: 'triangle', gain: 0.07 }],
  },
  // Bright shimmer: 1320Hz → 1980Hz then a second high tone, sine
  pearlCapture: {
    steps: [
      { freq: 1320, freqEnd: 1980, dur: 100, type: 'sine', gain: 0.06, gap: 60 },
      { freq: 2400, dur: 80, type: 'sine', gain: 0.05, gap: 0, delay: 0.120 },
    ],
  },
};

/**
 * Play a single oscillator note.
 * @param {{ freq, freqEnd, dur, type, gain, delay }} step
 * @param {number} baseDelay — cumulative delay in seconds for this step
 */
function playStep({ freq, freqEnd, dur, type, gain = 0.06, delay = 0 }, baseDelay) {
  const c = getCtx();
  const t = c.currentTime + baseDelay + delay;
  const durSec = dur / 1000;

  const osc = c.createOscillator();
  const g = c.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + durSec);

  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + durSec);

  osc.connect(g);
  g.connect(c.destination);
  osc.start(t);
  osc.stop(t + durSec);
}

/**
 * Play a named sound. No-op if sfx is disabled or the name is unknown.
 * Lazy-inits and resumes the AudioContext on first call.
 *
 * `opts.pitch` (0.5–2.5) shifts the entire sound up/down a multiplicative
 * pitch factor, used by chain-length escalation.
 */
export function play(name, opts = {}) {
  if (!enabled.sfx) return;
  const def = SOUNDS[name];
  if (!def) return;
  unlock(); // ensure context is running
  const pitch = Math.max(0.5, Math.min(2.5, opts.pitch || 1));
  def.steps.forEach((step) => {
    if (pitch === 1) return playStep(step, 0);
    playStep({ ...step, freq: step.freq * pitch, freqEnd: step.freqEnd ? step.freqEnd * pitch : undefined }, 0);
  });
}

export { SOUNDS };
