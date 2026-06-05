import { createMockMarketProvider } from "./mock.js";
import { createAlphaVantageProvider } from "./alphaVantage.js";
import { createFinnhubProvider } from "./finnhub.js";

/**
 * Factory: pick a real provider when its key is present AND config asks for it,
 * otherwise fall back to the deterministic mock provider.
 *
 * @param {object} config normalized config
 * @param {object} [opts]
 * @param {() => Array<{ticker:string, ts:number}>} [opts.getAddedEvents]
 *   passed to the mock provider so it can inject post-event spikes when
 *   config.mock.simulateSpikes is true.
 */
export function createMarketProvider(config, { getAddedEvents } = {}) {
  const provider = config?.market?.provider;
  if (provider === "alphavantage" && process.env.ALPHAVANTAGE_API_KEY) {
    return createAlphaVantageProvider();
  }
  if (provider === "finnhub" && process.env.FINNHUB_API_KEY) {
    return createFinnhubProvider();
  }
  return createMockMarketProvider({
    simulateSpikes: Boolean(config?.mock?.simulateSpikes),
    getAddedEvents,
  });
}
