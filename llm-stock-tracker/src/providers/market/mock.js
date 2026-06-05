// Deterministic seeded random-walk price provider.
//
// price(ticker, ts) is a pure function of (ticker seed + time bucket) so:
//   - repeated calls within the same tick return the same number (stable series),
//   - the series across time looks like a plausible noisy walk.
//
// When config.mock.simulateSpikes is true, an upward bump is injected in the
// hours AFTER a registered "added" mind-change event for that ticker. Default OFF
// so the out-of-the-box behavior is honest.

function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Base price per ticker, deterministic from the symbol.
function basePrice(ticker) {
  const r = mulberry32(hashStr(`base:${ticker}`));
  return 20 + r() * 480; // $20..$500
}

// 15-minute bucket so the walk has dense, stable samples.
const BUCKET_MS = 15 * 60 * 1000;

/**
 * @param {object} opts
 * @param {boolean} [opts.simulateSpikes]
 * @param {() => Array<{ticker:string, ts:number}>} [opts.getAddedEvents]
 *   Callback returning registered "added" events (used for spike injection).
 */
export function createMockMarketProvider({ simulateSpikes = false, getAddedEvents = () => [] } = {}) {
  function priceAtTs(ticker, ts) {
    const sym = String(ticker).toUpperCase();
    const base = basePrice(sym);
    const bucket = Math.floor(ts / BUCKET_MS);

    // A smooth-ish random walk: accumulate small per-bucket deltas seeded by the
    // bucket index. We derive the walk deterministically from a small window of
    // buckets so we don't have to iterate from the beginning of time.
    let price = base;
    // Use 3 overlapping sine-ish pseudo-random components for plausible motion.
    const r1 = mulberry32(hashStr(`${sym}:${bucket}`))();
    const r2 = mulberry32(hashStr(`${sym}:${Math.floor(bucket / 4)}`))();
    const r3 = mulberry32(hashStr(`${sym}:${Math.floor(bucket / 96)}`))();
    const noise = (r1 - 0.5) * 0.02 + (r2 - 0.5) * 0.05 + (r3 - 0.5) * 0.12;
    price = base * (1 + noise);

    if (simulateSpikes) {
      let bump = 0;
      for (const ev of getAddedEvents()) {
        if (String(ev.ticker).toUpperCase() !== sym) continue;
        const dtHours = (ts - ev.ts) / (1000 * 60 * 60);
        // Bump is ~0 at the event and grows over the following hours, so prices
        // AFTER the event lift relative to the event-time baseline. Sized large
        // enough (up to +18%) to clearly dominate the random-walk noise band so
        // the injected spike is reliably detectable in the demo/test windows.
        if (dtHours > 0 && dtHours <= 24) {
          const ramp = dtHours <= 4 ? dtHours / 4 : Math.max(0, (24 - dtHours) / 20);
          bump = Math.max(bump, 0.18 * ramp); // up to +18%
        }
      }
      price = price * (1 + bump);
    }

    return Math.round(price * 100) / 100;
  }

  return {
    name: "mock",
    async getQuote(ticker, now = Date.now()) {
      return { ticker: String(ticker).toUpperCase(), price: priceAtTs(ticker, now), ts: now };
    },
    async getQuotes(tickers, now = Date.now()) {
      return tickers.map((t) => ({
        ticker: String(t).toUpperCase(),
        price: priceAtTs(t, now),
        ts: now,
      }));
    },
    // Exposed for tests / analysis: synthesize a series over a time range.
    _priceAtTs: priceAtTs,
  };
}
