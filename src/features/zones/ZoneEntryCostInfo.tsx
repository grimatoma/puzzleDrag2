import { useState } from "react";
import ZoneInfoModal from "./ZoneInfoModal.jsx";
import { ZONES } from "./data.js";
import type { GameState } from "../../types/state.js";
import type { SessionSeasonName } from "./zoneInfoFormat.js";

interface ZoneEntryCostInfoProps {
  zoneId: string;
  state: GameState;
  /** Optional season column highlight inside the info modal. */
  highlightSeason?: SessionSeasonName | null;
  /**
   * Retained for backwards compatibility with existing callers. The entry-cost
   * coin pill is no longer rendered here (it duplicated the HUD wallet balance);
   * the cost is shown inside {@link ZoneInfoModal} instead.
   */
  infoOnly?: boolean;
  className?: string;
}

/**
 * Info affordance that opens {@link ZoneInfoModal} (spawn rates, modifiers, and
 * farm entry cost). Shown on zone headers (town view, cartography panel,
 * start-farming flow).
 */
export default function ZoneEntryCostInfo({ zoneId, state, highlightSeason, className = "" }: ZoneEntryCostInfoProps) {
  const [open, setOpen] = useState(false);
  const zone = ZONES[zoneId];
  if (!zone) return null;

  return (
    <>
      <div className={`inline-flex items-center gap-1 ${className}`}>
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
