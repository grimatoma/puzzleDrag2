// Ticker extraction from free-form LLM prose.
//
// The main risk is FALSE POSITIVES: uppercase English/finance words that look
// like tickers ("THE", "ETF", "CEO"). We defend with a stopword set AND by
// requiring bare tokens to be members of a known universe.

export const STOPWORDS = new Set([
  // English filler / pronouns
  "I", "A", "AN", "THE", "AND", "OR", "IF", "IS", "IT", "TO", "OF", "IN", "ON",
  "AT", "BE", "BY", "DO", "GO", "NO", "SO", "UP", "US", "WE", "ME", "MY", "AS",
  "OK", "AM", "PM", "ALL", "ANY", "BUT", "CAN", "FOR", "GET", "HAS", "HOW",
  "NOT", "NOW", "ONE", "OUR", "OUT", "TOP", "TWO", "WHO", "WHY", "YES", "YOU",
  "THIS", "THAT", "WITH", "WHAT", "WHEN", "SOME", "MOST", "PICK", "WEEK",
  // finance / market jargon that is not a tradable ticker here
  "CEO", "CFO", "USA", "USD", "EUR", "GBP", "ETF", "IPO", "AI", "ML", "GPU",
  "EPS", "PE", "ROI", "ROE", "SEC", "FED", "GDP", "CPI", "API", "LLM", "GPT",
  "NYSE", "NASDAQ", "DOW", "SP", "YTD", "EOD", "ATH", "FOMO",
  // stance words (handled separately, never tickers)
  "BUY", "SELL", "HOLD", "BULL", "BEAR", "LONG", "SHORT", "AVOID",
]);

const BUY_WORDS = ["buy", "bullish", "bull", "long", "positive", "overweight", "accumulate", "pick", "favorite"];
const AVOID_WORDS = ["sell", "avoid", "bearish", "bear", "short", "negative", "underweight", "dump"];

function detectStance(context) {
  const c = context.toLowerCase();
  for (const w of AVOID_WORDS) if (c.includes(w)) return "avoid";
  for (const w of BUY_WORDS) if (c.includes(w)) return "buy";
  return "neutral";
}

function excerptAround(text, index, len) {
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + len + 40);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

/**
 * extractTickers(rawText, { universe }) -> [{ ticker, stance, confidence, rank, excerpt }]
 * Deduped per ticker (first/best wins), ranked by order of appearance.
 */
export function extractTickers(rawText, { universe = [] } = {}) {
  const text = String(rawText || "");
  const uni = new Set(universe.map((t) => String(t).toUpperCase()));

  // Each candidate: { ticker, index, confidence }
  const candidates = [];

  // 1) Cashtags: $AAPL (high confidence, no universe requirement but stopword-checked)
  const cashRe = /\$([A-Za-z]{1,5})\b/g;
  let m;
  while ((m = cashRe.exec(text)) !== null) {
    const sym = m[1].toUpperCase();
    if (STOPWORDS.has(sym)) continue;
    candidates.push({ ticker: sym, index: m.index, confidence: 0.95 });
  }

  // 2) Name (TICKER): "Apple (AAPL)" — the parenthesised token (high confidence)
  const parenRe = /\(([A-Z]{1,5})\)/g;
  while ((m = parenRe.exec(text)) !== null) {
    const sym = m[1].toUpperCase();
    if (STOPWORDS.has(sym)) continue;
    candidates.push({ ticker: sym, index: m.index, confidence: 0.9 });
  }

  // 3) Bare uppercase 1-5 letter tokens, ONLY if in the known universe (lower confidence)
  if (uni.size) {
    const bareRe = /\b([A-Z]{1,5})\b/g;
    while ((m = bareRe.exec(text)) !== null) {
      const sym = m[1];
      if (STOPWORDS.has(sym)) continue;
      if (!uni.has(sym)) continue;
      candidates.push({ ticker: sym, index: m.index, confidence: 0.6 });
    }
  }

  // Dedupe: keep highest confidence; on tie keep earliest index.
  const best = new Map();
  for (const c of candidates) {
    const prev = best.get(c.ticker);
    if (!prev || c.confidence > prev.confidence || (c.confidence === prev.confidence && c.index < prev.index)) {
      best.set(c.ticker, c);
    }
  }

  // Rank by first appearance index.
  const ordered = Array.from(best.values()).sort((a, b) => a.index - b.index);

  return ordered.map((c, i) => ({
    ticker: c.ticker,
    stance: detectStance(excerptAround(text, c.index, c.ticker.length)),
    confidence: c.confidence,
    rank: i + 1,
    excerpt: excerptAround(text, c.index, c.ticker.length),
  }));
}
