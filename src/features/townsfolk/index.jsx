import { WorkersPanel } from "../workers/index.jsx";
import { CompactOrders } from "../../ui/Inventory.jsx";
import BossGallery from "../bosses/Gallery.jsx";
import { QuestsPanel } from "../quests/index.jsx";
import CastlePanel from "../castle/index.jsx";
import Icon from "../../ui/Icon.jsx";

export const viewKey = "townsfolk";

const TABS = ["workers", "quests", "castle", "bosses", "orders"];

export default function TownsfolkScreen({ state, dispatch }) {
  // Tab lives in viewParams so the URL (src/router.js) is the single source
  // of truth — back/forward and deep links land on the same sub-tab.
  const requested = state?.viewParams?.tab;
  const tab = TABS.includes(requested) ? requested : "workers";
  const setTab = (next) => dispatch({ type: "SET_VIEW_PARAMS", params: { tab: next } });
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#ead7b3] to-[#d4b585] border-[3px] border-[#b28b62] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b border-[#b28b62]/40">
        <span className="font-bold text-[14px] text-[#3a2715]">👥 Townsfolk</span>
        <button
          onClick={() => dispatch({ type: "SET_VIEW", view: "town" })}
          className="w-7 h-7 rounded-lg bg-[#f6efe0] border-2 border-[#b28b62] grid place-items-center text-[#6a4b31] font-bold text-[14px]"
        >✕</button>
      </div>
      <div className="flex gap-1.5 px-3 pt-2 flex-shrink-0 flex-wrap">
        {[
          { key: "workers", label: "Workers", icon: "ui_build" },
          { key: "quests", label: "Quests", icon: "ui_clipboard" },
          { key: "castle", label: "Castle", icon: "ui_home" },
          { key: "bosses", label: "Foes", icon: "ui_warning" },
          { key: "orders", label: "Orders", icon: "ui_shop" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex-1 min-w-[80px] py-1.5 rounded-lg text-[11px] font-bold border-2 ${tab === item.key ? "bg-[#8a4a26] border-[#6b3114] text-white" : "bg-[#f6efe0]/80 border-[#b28b62] text-[#5b3b20]"}`}
          >
            <div className="flex items-center justify-center gap-1">
              <Icon iconKey={item.icon} size={12} className={tab === item.key ? "" : "opacity-70"} />
              {item.label}
            </div>
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
        <div className="max-w-[640px] mx-auto">
          {tab === "workers" ? (
            <WorkersPanel state={state} dispatch={dispatch} />
          ) : tab === "quests" ? (
            <QuestsPanel state={state} dispatch={dispatch} />
          ) : tab === "castle" ? (
            <CastlePanel state={state} dispatch={dispatch} />
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
