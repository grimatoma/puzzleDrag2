import React from "react";
import { NPCS, RECIPES } from "../../constants.js";
import { resourceByKey } from "../../state.js";

export const viewKey = "orders";

function cssFromHex(intHex) {
  return `#${intHex.toString(16).padStart(6, "0")}`;
}

export default function OrdersScreen({ state, dispatch }) {
  const { orders, inventory } = state;

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#7c4f2c] to-[#6b4225] border-[3px] border-[#e2c19b] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b border-[#e2c19b]/40">
        <span className="font-bold text-[14px] text-[#f8e7c6]">📋 Orders</span>
        <button
          onClick={() => dispatch({ type: "SET_VIEW", view: "board" })}
          className="w-7 h-7 rounded-lg bg-[#f6efe0] border-2 border-[#b28b62] grid place-items-center text-[#6a4b31] font-bold text-[14px]"
        >✕</button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {orders.map((o) => {
          const have = inventory[o.key] || 0;
          const done = have >= o.need;
          const npc = NPCS[o.npc];
          const res = resourceByKey(o.key);
          const recipe = !res ? RECIPES[o.key] : null;
          const pct = Math.min(100, (have / o.need) * 100);
          const isCrafted = !!recipe;
          return (
            <button
              key={o.id}
              onClick={() => dispatch({ type: "TURN_IN_ORDER", id: o.id })}
              className={`text-left rounded-xl border-2 px-3 py-3 flex flex-col gap-2 transition-transform hover:-translate-y-0.5 ${done ? "bg-[#cfe4a3] border-[#91bf24]" : isCrafted ? "bg-[#e8d8f7] border-[#9a7ab8]" : "bg-[#f7ead8] border-[#c5a87a]"}`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full grid place-items-center text-white font-bold text-[14px] flex-shrink-0"
                  style={{ backgroundColor: npc.color, border: "2px solid #fff" }}
                >
                  {npc.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[#a8431a] text-[13px] leading-tight truncate">{npc.name}{isCrafted && <span className="ml-1 text-[10px] text-[#7a5ab0] font-bold">🔨 craft</span>}</div>
                  <div className="text-[#6a4b31] text-[11px] leading-snug">{o.line}</div>
                </div>
                <div className="text-[#c8923a] text-[12px] font-bold whitespace-nowrap">+{o.reward}◉</div>
              </div>
              <div className="flex items-center gap-2">
                {isCrafted ? (
                  <div
                    className="w-8 h-8 rounded-md flex-shrink-0 grid place-items-center text-[18px]"
                    style={{ backgroundColor: cssFromHex(recipe.color), border: "2px solid rgba(255,255,255,.4)" }}
                  >{recipe.glyph}</div>
                ) : (
                  <div
                    className="w-8 h-8 rounded-md flex-shrink-0"
                    style={{ backgroundColor: cssFromHex(res.color), border: "2px solid rgba(255,255,255,.4)" }}
                  />
                )}
                <div className="flex-1 h-2.5 bg-[#e0d2b0] rounded overflow-hidden">
                  <div
                    className="h-full transition-[width] duration-300"
                    style={{ width: `${pct}%`, backgroundColor: done ? "#4f6b3a" : "#d6612a" }}
                  />
                </div>
                <div className="text-[#6a4b31] text-[12px] font-bold whitespace-nowrap min-w-[44px] text-right">
                  {have}/{o.need}
                </div>
              </div>
              {done && (
                <div className="text-[11px] text-[#4f6b3a] font-bold text-center">TAP TO DELIVER ✓</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
