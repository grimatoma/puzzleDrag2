// Real Finnhub market-data provider (global fetch).
// Uses the /quote endpoint. Reads FINNHUB_API_KEY from env.

export function createFinnhubProvider({ apiKey = process.env.FINNHUB_API_KEY } = {}) {
  async function getQuote(ticker, now = Date.now()) {
    if (!apiKey) throw new Error("FINNHUB_API_KEY is not set");
    const sym = String(ticker).toUpperCase();
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Finnhub request failed: ${res.status} ${body}`);
    }
    const data = await res.json();
    const price = Number(data?.c); // "c" = current price
    if (!Number.isFinite(price) || price === 0) {
      throw new Error(`Finnhub returned no price for ${sym}: ${JSON.stringify(data).slice(0, 200)}`);
    }
    // Finnhub provides a timestamp "t" in seconds; prefer it when present.
    const ts = Number.isFinite(data?.t) && data.t > 0 ? data.t * 1000 : now;
    return { ticker: sym, price, ts };
  }

  return {
    name: "finnhub",
    getQuote,
    async getQuotes(tickers, now = Date.now()) {
      return Promise.all(tickers.map((t) => getQuote(t, now)));
    },
  };
}
