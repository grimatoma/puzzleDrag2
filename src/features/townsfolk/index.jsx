import { WorkersPanel } from "../workers/index.jsx";
import { QuestsPanel } from "../quests/index.jsx";
import Icon from "../../ui/Icon.jsx";
import FeaturePanel from "../../ui/primitives/FeaturePanel.jsx";

export const viewKey = "townsfolk";

const TABS = ["workers", "quests"];

export default function TownsfolkScreen({ state, dispatch }) {
  // Tab lives in viewParams so the URL (src/router.js) is the single source
  // of truth — back/forward and deep links land on the same sub-tab.
  const requested = state?.viewParams?.tab;
  const tab = TABS.includes(requested) ? requested : "workers";
  const setTab = (next) => dispatch({ type: "SET_VIEW_PARAMS", params: { tab: next } });
  return (
    <FeaturePanel>
      <FeaturePanel.Tabs>
        {[
          { key: "workers", label: "Workers", icon: "ui_build" },
          { key: "quests", label: "Quests", icon: "ui_clipboard" },
        ].map((item) => (
          <FeaturePanel.Tab
            key={item.key}
            onClick={() => setTab(item.key)}
            active={tab === item.key}
            className="flex-1 min-w-[80px]"
          >
            <div className="flex items-center justify-center gap-1">
              <Icon iconKey={item.icon} size={18} className={tab === item.key ? "" : "opacity-70"} />
              {item.label}
            </div>
          </FeaturePanel.Tab>
        ))}
      </FeaturePanel.Tabs>
      <FeaturePanel.Body>
        <div className="w-full h-full min-h-0 mx-auto">
          {tab === "quests" ? (
            <QuestsPanel state={state} dispatch={dispatch} />
          ) : (
            <WorkersPanel state={state} dispatch={dispatch} />
          )}
        </div>
      </FeaturePanel.Body>
    </FeaturePanel>
  );
}
