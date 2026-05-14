import { useState } from "react";
import { isSettlementFounded, settlementTypeForZone, settlementFoundingCost, completedSettlementCount, displayZoneName, DEFAULT_ZONE } from "../../features/zones/data.js";
import { ZONES } from "../../features/zones/data.js";
import BiomePicker from "../../features/zones/BiomePicker.jsx";

export function FoundSettlementBanner({ state, dispatch }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const zoneId = state.mapCurrent;
  if (!zoneId || zoneId === DEFAULT_ZONE) return null;
  if (isSettlementFounded(state, zoneId)) return null;
  const type = settlementTypeForZone(zoneId);
  if (!type) return null;
  const cost = settlementFoundingCost(state).coins;
  const canAfford = (state?.coins ?? 0) >= cost;
  const needPriorComplete = completedSettlementCount(state) < 1;
  const node = ZONES[zoneId];
  const name = displayZoneName(state, zoneId);
  const blocked = needPriorComplete || !canAfford;
  const blockedReason = needPriorComplete
    ? "Complete your first settlement first"
    : !canAfford
      ? `Need ${cost}◉`
      : null;
  return (
    <>
      <div
        className="absolute top-12 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 pointer-events-none"
      >
        <div
          className="pointer-events-none rounded-full px-3 py-1 text-[11px] font-bold tracking-wide text-white"
          style={{ background: "rgba(15,14,20,.85)", border: "1px solid rgba(255,255,255,.18)" }}
        >
          {name} isn't yours yet
        </div>
        <button
          type="button"
          disabled={blocked}
          onClick={() => !blocked && setPickerOpen(true)}
          className="pointer-events-auto rounded-lg px-4 py-2 font-bold text-[13px] transition-colors disabled:cursor-not-allowed"
          style={{
            background: blocked ? "#7a6a4a" : "linear-gradient(to bottom, #c8923a, #a06a1a)",
            color: "white",
            border: blocked ? "2px solid #5a4a30" : "2px solid #7a4f10",
            opacity: blocked ? 0.85 : 1,
            boxShadow: blocked ? "none" : "0 3px 10px rgba(0,0,0,.45)",
          }}
          title={blocked ? blockedReason : `Found ${name}`}
        >
          🏗 Found this settlement · {cost}◉
        </button>
        {blocked && (
          <div
            className="pointer-events-none rounded px-2 py-0.5 text-[10px] font-semibold text-white"
            style={{ background: "rgba(120,30,30,.85)", border: "1px solid rgba(255,255,255,.2)" }}
          >
            {blockedReason}
          </div>
        )}
      </div>
      {pickerOpen && (
        <BiomePicker
          node={{ id: node?.id ?? zoneId, name }}
          type={type}
          cost={cost}
          dispatch={dispatch}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}
