// Real Alpha Vantage market-data provider (global fetch).
// Uses the GLOBAL_QUOTE endpoint. Reads ALPHAVANTAGE_API_KEY from env.

export function createAlphaVantageProvider({ apiKey = process.env.ALPHAVANTAGE_API_KEY } = {}) {
  async function getQuote(ticker, now = Date.now()) {
    if (!apiKey) throw new Error("ALPHAVANTAGE_API_KEY is not set");
    const sym = String(ticker).toUpperCase();
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`AlphaVantage request failed: ${res.status} ${body}`);
    }
    const data = await res.json();
    const q = data?.["Global Quote"] || {};
    const priceStr = q["05. price"];
    const price = Number(priceStr);
    if (!Number.isFinite(price)) {
      throw new Error(`AlphaVantage returned no price for ${sym} (rate limited?): ${JSON.stringify(data).slice(0, 200)}`);
    }
    return { ticker: sym, price, ts: now };
  }

  return {
    name: "alphavantage",
    getQuote,
    async getQuotes(tickers, now = Date.now()) {
      const out = [];
      // Alpha Vantage free tier is heavily rate-limited; fetch sequentially.
      for (const t of tickers) {
        out.push(await getQuote(t, now));
      }
      return out;
    },
  };
}
