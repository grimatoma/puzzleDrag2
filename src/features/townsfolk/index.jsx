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
    <div className="hl-panel">
      <div className="hl-panel-header">
        <span className="hl-panel-title">👥 Townsfolk</span>
        <button
          onClick={() => dispatch({ type: "SET_VIEW", view: "town" })}
          className="hl-panel-close"
        >✕</button>
      </div>
      <div className="hl-tabs">
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
            className={`hl-tab flex-1 min-w-[80px] ${tab === item.key ? "is-active" : ""}`}
          >
            <div className="flex items-center justify-center gap-1">
              <Icon iconKey={item.icon} size={12} className={tab === item.key ? "" : "opacity-70"} />
              {item.label}
            </div>
          </button>
        ))}
      </div>
      <div className="hl-panel-body">
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
