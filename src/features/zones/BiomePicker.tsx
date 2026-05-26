// Shared biome-founding picker. Used from the cartography map view and from
// the Town view's "Found this settlement" CTA — same dispatch, same data.

import { biomesForType, type SettlementType, type SettlementBiomeDef } from "./data.js";
import { ParchmentDialog } from "../../ui/primitives/Dialog.jsx";
import Button from "../../ui/primitives/Button.jsx";
import { RewardChip } from "../../ui/primitives/Chip.jsx";
import type { Dispatch } from "../../types/state.js";

const formatHazard = (h: string): string =>
  String(h).split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

interface BiomePickerProps {
  node: { id: string; name: string };
  type: SettlementType;
  cost: number;
  dispatch: Dispatch;
  onClose: () => void;
}

export default function BiomePicker({ node, type, cost, dispatch, onClose }: BiomePickerProps) {
  const options: SettlementBiomeDef[] = biomesForType(type);
  return (
    <ParchmentDialog open onClose={onClose} size="md" ariaLabel={`Found ${node.name}`} backdropClassName="z-[60]">
      <ParchmentDialog.Body className="!px-5 !py-4">
        <div className="text-center mb-1">
          <div className="font-bold text-[18px] text-on-panel-dim">Found {node.name}</div>
          <div className="text-[12px] text-on-panel-faint">Pick a biome — it fixes this settlement's hazards and bonus for good. Costs <b>{cost}◉</b>.</div>
        </div>
        <div className="flex flex-col gap-2 mt-3">
          {options.map((b: SettlementBiomeDef) => (
            <button
              key={b.id}
              onClick={() => { dispatch({ type: "FOUND_SETTLEMENT", payload: { zoneId: node.id, biome: b.id } }); onClose(); }}
              className="hl-card hl-card--interactive text-left !p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-[22px] leading-none">{b.icon}</span>
                <span className="font-bold text-[14px] text-on-panel flex-1">{b.name}</span>
                <RewardChip className="text-[#1f3a10] bg-[#cbe0b8] border-[#6a9a3a]">+ {b.bonus}</RewardChip>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {b.hazards.map((h: string) => (
                  <span key={h} className="inline-flex items-center gap-1 text-[9px] font-bold text-[#7a1a1a] bg-[#e8c4c4] border border-[#a05050] rounded-full px-1.5 py-0.5">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 3 L22 20 H2 Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
                      <path d="M12 10 V14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                      <circle cx="12" cy="17" r="1.2" fill="currentColor" />
                    </svg>
                    {formatHazard(h)}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </ParchmentDialog.Body>
      <ParchmentDialog.Actions>
        <Button tone="ghost" variant="ghost" block onClick={onClose}>Cancel</Button>
      </ParchmentDialog.Actions>
    </ParchmentDialog>
  );
}
