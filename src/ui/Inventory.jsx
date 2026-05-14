import { BIOMES, ITEMS } from "../constants.js";
import { sellPriceFor } from "../features/market/pricing.js";
import { locBuilt } from "../locBuilt.js";
import Icon from "./Icon.jsx";
import Banner from "./primitives/Banner.jsx";
import ResourceCell from "./primitives/ResourceCell.jsx";
import TradeStepper from "./primitives/TradeStepper.jsx";

export function Section({ title, titleColor = "#f8e7c6", children }) {
  return (
    <div className="flex flex-col gap-2 min-h-0">
      <div className="font-bold text-[14px] landscape:max-[1024px]:text-[11px] tracking-wide" style={{ color: titleColor }}>{title}</div>
      <div className="min-h-0">{children}</div>
    </div>
  );
}

// Per-key order status:
//   "ready"  — at least one open order has all needed resources
//   "needed" — at least one open order needs more of this resource
//   "excess" — non-zero stash but no open order asks for it
//   "idle"   — neither in stash nor in any order
function orderStatusByKey(orders, inventory) {
  const status = {};
  const totals = {};
  for (const o of orders) {
    totals[o.key] = (totals[o.key] || 0) + o.need;
    const have = inventory[o.key] || 0;
    if (have >= o.need) status[o.key] = "ready";
    else if (status[o.key] !== "ready") status[o.key] = "needed";
  }
  return { status, totals };
}

function statusTag(status, total) {
  if (status === "ready") return `✓ Order ${total}`;
  if (status === "needed") return `↑ Need ${total}`;
  if (status === "excess") return "− Excess";
  return null;
}

function InventoryCell({ r, count, compact, orderStatus, orderTotal, marketBuilt, buyPrice, sellPrice, dispatch, tradeKind }) {
  // Vol II §07 Accessibility #4 — pair color status with a glyph so the
  // ready / needed / excess readout survives deuteranopia. ResourceCell's
  // statusTag handles the glyph; "excess" only shows when there's stash but
  // no open order wants it.
  const status = orderStatus
    ? orderStatus
    : count > 0
      ? "excess"
      : undefined;
  const tag = statusTag(status, orderTotal);

  // Vol II §02 — TradeButton vertical 18h stack was a double failure (under
  // 24px WCAG and under 44pt HIG). One inline TradeStepper at 32×32 buttons
  // collapses Buy + Sell into a single tap-friendly row.
  const showTrade = !compact && dispatch && (buyPrice > 0 || sellPrice > 0);
  const reasonBuy = !marketBuilt ? "Build the Caravan Post to trade" : "";
  const reasonSell = !marketBuilt
    ? "Build the Caravan Post to trade"
    : count <= 0
      ? "Nothing to sell"
      : "";

  const trade = showTrade ? (
    <TradeStepper
      count={count}
      buyPrice={buyPrice}
      sellPrice={sellPrice}
      canBuy={!!marketBuilt && tradeKind === "resource" && buyPrice > 0}
      canSell={!!marketBuilt && count > 0 && sellPrice > 0}
      reasonBuy={reasonBuy}
      reasonSell={reasonSell}
      onBuy={(qty) => dispatch({ type: "BUY_RESOURCE", payload: { key: r.key, qty } })}
      onSell={(qty) => dispatch(
        tradeKind === "resource"
          ? { type: "SELL_RESOURCE", payload: { key: r.key, qty } }
          : { type: "SELL_ITEM", id: r.key, qty }
      )}
    />
  ) : null;

  return (
    <ResourceCell
      resource={r}
      count={count}
      density={compact ? "compact" : "comfortable"}
      status={status}
      statusTag={tag}
      trade={trade}
    />
  );
}

export function CompactOrders({ orders, inventory, dispatch }) {
  return (
    <div className="flex flex-col gap-1.5">
      {orders.map((o) => {
        const have = inventory[o.key] || 0;
        const done = have >= o.need;
        const res = ITEMS[o.key];
        const label = res ? res.label : o.key;
        return (
          <ResourceCell
            key={o.id}
            resource={{ key: o.key, label }}
            count={`${Math.min(have, o.need)}/${o.need}`}
            density="row"
            variant="order"
            done={done}
            status={done ? "ready" : have > 0 ? "needed" : undefined}
            onClick={() => dispatch({ type: "TURN_IN_ORDER", id: o.id, npc: o.npc, key: o.key, need: o.need, reward: o.reward })}
          />
        );
      })}
    </div>
  );
}

export function InventoryGrid({ inventory, biomeKey, compact, orders = [], state, dispatch }) {
  const allBiomeEntries = BIOMES[biomeKey].resources;
  // Inventory shows two buckets — Resources (chain products / inventory
  // currency: milk, log, jam, pie, ingot…) and Items (crafted via recipes).
  // Tile species belong in the Tiles Wiki, not here. Entries without a
  // `kind` annotation fall back to "resource" so nothing is lost from the UI
  // by accident.
  const resources = allBiomeEntries.filter((r) => r.kind !== "tile");
  const items = Object.entries(ITEMS).filter(([key, item]) =>
    (inventory[key] || 0) > 0 &&
    !resources.find(r => r.key === key) &&
    item.kind !== "tile" &&
    item.kind !== "tool"
  );
  // Vol II §06 Tablet #2 — auto-fit with min(200px, 100%) so 768-tablet
  // portrait gets 3 columns naturally, and a narrow ≤200px viewport still
  // shows the cell at full width instead of clipping.
  const gridCols = compact ? "grid-cols-2" : "grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))]";
  const { status, totals } = orderStatusByKey(orders, inventory);
  const marketBuilt = !!locBuilt(state).caravan_post;
  const prices = state?.market?.prices ?? {};

  return (
    <div className="flex flex-col gap-3">
      {!compact && dispatch && (
        <Banner
          tone={marketBuilt ? "success" : "info"}
          icon={<Icon iconKey="ui_shop" size={14} />}
        >
          {marketBuilt
            ? "Caravan Post open — buy and sell directly from your inventory."
            : "Build the Caravan Post in town to enable trading from your inventory."}
        </Banner>
      )}
      {orders.length > 0 && (
        <div className="flex items-center gap-3 text-[10px] text-white/70 px-1 -mb-1">
          <span className="flex items-center gap-1"><span aria-hidden="true" className="w-2 h-2 rounded-full bg-[#91bf24]" /> <span aria-hidden="true">✓</span> ready</span>
          <span className="flex items-center gap-1"><span aria-hidden="true" className="w-2 h-2 rounded-full bg-[#f7c254]" /> <span aria-hidden="true">↑</span> needed</span>
          <span className="flex items-center gap-1"><span aria-hidden="true" className="w-2 h-2 rounded-full bg-white/40" /> <span aria-hidden="true">−</span> excess</span>
        </div>
      )}
      <div>
        <div className="text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1.5">Resources</div>
        <div className={`grid ${gridCols} gap-2`}>
          {resources.map((r) => {
            const p = prices[r.key];
            return (
              <InventoryCell
                key={r.key}
                r={r}
                count={inventory[r.key] || 0}
                compact={compact}
                orderStatus={status[r.key]}
                orderTotal={totals[r.key]}
                marketBuilt={marketBuilt}
                buyPrice={p?.buy ?? 0}
                sellPrice={p?.sell ?? 0}
                dispatch={dispatch}
                tradeKind="resource"
              />
            );
          })}
        </div>
      </div>
      <div>
        <div className="text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1.5">Items</div>
        {items.length === 0 ? (
          <div className="text-[11px] text-white/40 italic px-1">No items yet — craft something!</div>
        ) : (
          <div className={`grid ${gridCols} gap-2`}>
            {items.map(([key, item]) => (
              <InventoryCell
                key={key}
                r={{ key, label: item.label, color: item.color }}
                count={inventory[key] || 0}
                compact={compact}
                orderStatus={status[key]}
                orderTotal={totals[key]}
                marketBuilt={marketBuilt}
                buyPrice={0}
                sellPrice={sellPriceFor(key)}
                dispatch={dispatch}
                tradeKind="item"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
