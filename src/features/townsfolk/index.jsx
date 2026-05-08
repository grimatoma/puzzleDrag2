import { useState } from "react";
import { MoodPanel } from "../mood/index.jsx";
import { ApprenticesPanel } from "../apprentices/index.jsx";
import { CompactOrders } from "../../ui/Inventory.jsx";
import BossGallery from "../bosses/Gallery.jsx";

export const viewKey = "townsfolk";

export default function TownsfolkScreen({ state, dispatch }) {
  const [tab, setTab] = useState("mood");
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#7c4f2c] to-[#6b4225] border-[3px] border-[#e2c19b] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b border-[#e2c19b]/40">
        <span className="font-bold text-[14px] text-[#f8e7c6]">👥 Townsfolk</span>
        <button
          onClick={() => dispatch({ type: "SET_VIEW", view: "town" })}
          className="w-7 h-7 rounded-lg bg-[#f6efe0] border-2 border-[#b28b62] grid place-items-center text-[#6a4b31] font-bold text-[14px]"
        >✕</button>
      </div>
      <div className="flex gap-1.5 px-3 pt-2 flex-shrink-0 flex-wrap">
        {[
          { key: "mood", label: "💞 Townsfolk" },
          { key: "apprentices", label: "🧑‍🌾 Workers" },
          { key: "bosses", label: "👹 Foes" },
          { key: "orders", label: "📋 Orders" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex-1 min-w-[80px] py-1.5 rounded-lg text-[11px] font-bold border-2 ${tab === item.key ? "bg-[#8a4a26] border-[#6b3114] text-white" : "bg-[#f7ead8]/20 border-[#e2c19b]/50 text-[#f8e7c6]"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
        <div className="max-w-[640px] mx-auto">
          {tab === "mood" ? (
            <MoodPanel state={state} dispatch={dispatch} showHeader={false} />
          ) : tab === "apprentices" ? (
            <ApprenticesPanel state={state} dispatch={dispatch} showHeader={false} />
          ) : tab === "bosses" ? (
            <BossGallery state={state} />
          ) : (
            <CompactOrders orders={state.orders || []} inventory={state.inventory || {}} dispatch={dispatch} />
          )}
        </div>
      </div>
    </div>
  );
}
