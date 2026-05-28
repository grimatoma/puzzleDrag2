
import { NPCS, getItem } from "../../constants.js";
import { bondBand, bondModifier, payOrder } from "../npcs/bond.js";
import IconCanvas, { hasIcon } from "../../ui/IconCanvas.jsx";
import Icon from "../../ui/Icon.jsx";
import FeaturePanel from "../../ui/primitives/FeaturePanel.jsx";
import ActionCard, { ProgressBar } from "../../ui/primitives/ActionCard.jsx";
import { inventoryQty } from "../../types/inventory.js";
import type { Dispatch, GameState, Order } from "../../types/state.js";

export const viewKey = "orders";

function cssFromHex(intHex: number): string {
  return `#${intHex.toString(16).padStart(6, "0")}`;
}

interface OrdersScreenProps {
  state: GameState;
  dispatch: Dispatch;
}

export default function OrdersScreen({ state, dispatch }: OrdersScreenProps) {
  const { orders, inventory } = state;

  return (
    <FeaturePanel>
      <FeaturePanel.Body className="flex flex-col gap-2">
        {orders.map((o: Order) => {
          const have = inventoryQty(inventory, o.key);
          const needed = o.need ?? o.amount;
          const done = have >= needed;
          const npc = (NPCS as Record<string, { name: string; color: string } | undefined>)[o.npc];
          if (!npc) return null;
          const itemDef = getItem(o.key);
          const isCrafted = itemDef?.kind === "resource" && !itemDef?.biome;
          // Phase 6.1: bond chip
          const bond = (state.npcs?.bonds as Record<string, number> | undefined)?.[o.npc] ?? 5;
          const baseReward = o.baseReward ?? o.reward;
          const modifiedReward = payOrder({ baseReward }, bond);
          const modifier = bondModifier(bond);
          const bandName = bondBand(bond)?.name;
          return (
            <ActionCard
              as="button"
              key={o.id}
              onClick={() => dispatch({ type: "TURN_IN_ORDER", id: o.id })}
              interactive
              className="!p-3 transition-transform hover:-translate-y-0.5"
              style={{
                background: done ? "#cfe4a3" : isCrafted ? "#e8d8f7" : "#f7ead8",
                borderColor: done ? "#91bf24" : isCrafted ? "#9a7ab8" : "#c5a87a",
              }}
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
                  <div className="text-[#6a4b31] text-[11px] leading-snug">{String(o.line ?? "")}</div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <div className="text-[#c8923a] text-[12px] font-bold whitespace-nowrap">+{modifiedReward}◉</div>
                  <div className="text-[10px] font-bold whitespace-nowrap flex items-center gap-1" style={{ color: bandName === "Sour" ? "#bb3b2f" : bandName === "Beloved" ? "#d4a017" : bandName === "Liked" ? "#4f6b3a" : "#7a6248" }}>
                    <Icon iconKey={`bond_rank_${Math.min(8, Math.max(1, Math.floor(bond)))}`} size={14} />
                    {bond >= 8 && <Icon iconKey="bond_8_arc" size={14} />}
                    ×{modifier.toFixed(2)} · {bandName}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isCrafted ? (
                  <div
                    className="w-8 h-8 rounded-md flex-shrink-0 grid place-items-center text-[18px]"
                    style={{ backgroundColor: cssFromHex(itemDef?.color || 0xd49060), border: "2px solid rgba(255,255,255,.4)", overflow: "hidden" }}
                  >
                    <Icon iconKey={o.key} size={32} title="" />
                  </div>
                ) : (
                  <div
                    className="w-8 h-8 rounded-md flex-shrink-0 grid place-items-center text-[18px]"
                    style={{ backgroundColor: cssFromHex(itemDef?.color || 0x888888), border: "2px solid rgba(255,255,255,.4)", overflow: "hidden" }}
                  >
                    {hasIcon(o.key) && <IconCanvas iconKey={o.key} size={32} title="" />}
                  </div>
                )}
                <ProgressBar
                  value={have}
                  max={needed}
                  color={done ? "#4f6b3a" : "var(--ember)"}
                  className="flex-1"
                  trackClassName="bg-[#e0d2b0]"
                />
                <div className="text-[#6a4b31] text-[12px] font-bold whitespace-nowrap min-w-[44px] text-right">
                  {have}/{needed}
                </div>
              </div>
              {done && (
                <div className="text-[11px] text-[#4f6b3a] font-bold text-center inline-flex items-center justify-center gap-1 w-full">
                  TAP TO DELIVER
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </ActionCard>
          );
        })}
      </FeaturePanel.Body>
    </FeaturePanel>
  );
}
