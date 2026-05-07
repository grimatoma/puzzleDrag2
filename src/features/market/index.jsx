import { RECIPES } from "../../constants.js";
import { sellPriceFor } from "./pricing.js";

export const viewKey = "market";

// All sellable recipe keys (those with a coin value > 0)
const SELLABLE = Object.entries(RECIPES)
  .filter(([, r]) => r && r.coins > 0)
  .map(([key, r]) => ({ key, name: r.name, price: sellPriceFor(key) }))
  .filter((item) => item.price > 0);

export default function MarketScreen({ state, dispatch }) {
  const caravanBuilt = !!state.built?.caravan_post;
  const inventory = state.inventory ?? {};

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#7c4f2c] to-[#6b4225] border-[3px] border-[#e2c19b] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b border-[#e2c19b]/40">
        <span className="font-bold text-[14px] text-[#f8e7c6]">🏪 Market</span>
        <button
          onClick={() => dispatch({ type: "SET_VIEW", view: "town" })}
          className="w-7 h-7 rounded-lg bg-[#f6efe0] border-2 border-[#b28b62] grid place-items-center text-[#6a4b31] font-bold text-[14px]"
        >
          ✕
        </button>
      </div>

      {!caravanBuilt ? (
        <div className="flex-1 grid place-items-center px-4">
          <p className="italic text-[#f8e7c6]/70 text-[12px] text-center">
            Build the Caravan Post in town to unlock distant trade routes.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2">
          <div className="grid grid-cols-2 portrait:grid-cols-1 gap-2">
            {SELLABLE.map(({ key, name, price }) => {
              const have = inventory[key] ?? 0;
              const canSell = have >= 1;
              return (
                <div
                  key={key}
                  className="bg-[#f6efe0] border-2 border-[#c5a87a] rounded-xl p-2 flex items-center gap-2"
                  style={{ minHeight: 60 }}
                >
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="font-bold text-[11px] text-[#3a2715] leading-tight">{name}</span>
                    <span className="text-[10px] text-[#8a785e]">Have: {have}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] font-bold text-[#c8923a]">{price}◉ each</span>
                    <button
                      disabled={!canSell}
                      onClick={() => dispatch({ type: "MARKET/SELL", payload: { resource: key, qty: 1 } })}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border-2 transition-colors ${
                        canSell
                          ? "bg-[#91bf24] border-[#6a9010] text-white hover:bg-[#a3d028]"
                          : "bg-[#ccc] border-[#aaa] text-[#666] cursor-not-allowed"
                      }`}
                    >
                      Sell 1
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
