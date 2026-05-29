// Deterministic, time-varying mock LLM provider.
//
// The recommended set is a function of (promptKey + hour bucket), so across
// runs (and especially across hours) the picks occasionally change — which is
// exactly what produces "mind-change" events for demos and tests.

const UNIVERSE = [
  "AAPL", "NVDA", "MSFT", "TSLA", "AMZN", "GOOGL", "META", "AMD", "PLTR", "NFLX",
];

const COMPANY = {
  AAPL: "Apple", NVDA: "Nvidia", MSFT: "Microsoft", TSLA: "Tesla", AMZN: "Amazon",
  GOOGL: "Alphabet", META: "Meta", AMD: "AMD", PLTR: "Palantir", NFLX: "Netflix",
};

// Simple deterministic string hash -> 32-bit unsigned int.
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

function pickTickers(promptKey, hourBucket) {
  const rng = mulberry32(hashStr(`${promptKey}:${hourBucket}`));
  const count = 2 + Math.floor(rng() * 3); // 2..4
  const pool = [...UNIVERSE];
  const chosen = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(rng() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]);
  }
  return chosen.map((t) => ({ ticker: t, bullish: rng() > 0.25 }));
}

function renderProse(picks, rng) {
  const intros = [
    "Here are a few names worth a look right now.",
    "Based on current momentum, consider the following.",
    "If I had to pick today, these stand out.",
    "A reasonable starting basket might include these.",
  ];
  const intro = intros[Math.floor(rng() * intros.length)];
  const sentences = picks.map((p, i) => {
    const name = COMPANY[p.ticker] || p.ticker;
    const stance = p.bullish ? "I'm bullish on" : "I'd avoid";
    // Vary the mention style: cashtag, Name (TICKER), or bare.
    const styleRoll = rng();
    let mention;
    if (styleRoll < 0.34) mention = `$${p.ticker}`;
    else if (styleRoll < 0.67) mention = `${name} (${p.ticker})`;
    else mention = `${name} ${p.ticker}`;
    const verbs = p.bullish
      ? ["a strong buy", "looking attractive", "set to climb", "a top pick"]
      : ["overextended", "risky here", "one to sell", "a name to avoid"];
    const verb = verbs[Math.floor(rng() * verbs.length)];
    return `${i + 1}. ${stance} ${mention} — ${verb}.`;
  });
  return [intro, ...sentences, "Not financial advice."].join("\n");
}

export function createMockLlmProvider() {
  return {
    name: "mock",
    async recommend({ promptText, model, now = Date.now(), seedSalt = "" } = {}) {
      const hourBucket = Math.floor(now / (1000 * 60 * 60));
      const promptKey = String(promptText || "");
      // `seedSalt` lets callers (e.g. demo/test) vary the recommended set within
      // the same hour so mind-change events appear without waiting an hour.
      // MOCK_SEED_SALT env provides the same for the CLI demo. Default empty =>
      // honest hour-bucketed behavior.
      const salt = String(seedSalt || process.env.MOCK_SEED_SALT || "");
      const bucketKey = `${hourBucket}:${salt}`;
      const picks = pickTickers(promptKey, bucketKey);
      const rng = mulberry32(hashStr(`${promptKey}:${bucketKey}:prose`));
      const rawText = renderProse(picks, rng);
      return { rawText, model: model || "mock-llm" };
    },
  };
}
