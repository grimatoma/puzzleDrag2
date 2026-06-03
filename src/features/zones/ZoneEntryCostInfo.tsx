import { useState } from "react";
import DesignIcon from "../../ui/primitives/Icon.jsx";
import ZoneInfoModal from "./ZoneInfoModal.jsx";
import { ZONES, zoneHasBoard } from "./data.js";
import type { GameState } from "../../types/state.js";
import type { SessionSeasonName } from "./zoneInfoFormat.js";

interface ZoneEntryCostInfoProps {
  zoneId: string;
  state: GameState;
  /** Optional season column highlight inside the info modal. */
  highlightSeason?: SessionSeasonName | null;
  /** When true, only the info button is shown (cost is displayed elsewhere). */
  infoOnly?: boolean;
  className?: string;
}

/**
 * Compact entry-cost pill plus an info affordance that opens {@link ZoneInfoModal}.
 * Shown on zone headers (town view, cartography panel, start-farming flow).
 */
export default function ZoneEntryCostInfo({ zoneId, state, highlightSeason, infoOnly = false, className = "" }: ZoneEntryCostInfoProps) {
  const [open, setOpen] = useState(false);
  const zone = ZONES[zoneId];
  if (!zone) return null;

  const cost = zone.entryCost?.coins ?? 0;
  const showCoinCost = !infoOnly && zoneHasBoard(zone, "farm");

  return (
    <>
      <div className={`inline-flex items-center gap-1 ${className}`}>
        {showCoinCost && (
          <span
            className="inline-flex items-center gap-1 bg-white/85 px-2.5 py-1 rounded-full font-bold text-[#2b2218] text-[13px] tabular-nums border border-white/60"
            title="Coin cost to start a farm session here"
          >
            <DesignIcon iconKey="design.currency.coin" size={14} title="" />
            {cost}◉
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-8 h-8 rounded-full bg-white/85 border-2 border-white/60 grid place-items-center text-[#2b2218] font-bold text-[15px] leading-none hover:bg-white transition-colors shadow-sm"
          aria-label="Zone spawn rates and modifiers"
          title="Zone info — spawn rates & modifiers"
        >
          i
        </button>
      </div>
      {open && (
        <ZoneInfoModal
          zoneId={zoneId}
          state={state}
          highlightSeason={highlightSeason}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
