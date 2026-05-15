import { BIOMES, ITEMS } from "../constants.js";
import { sellPriceFor } from "../features/market/pricing.js";
import { locBuilt } from "../locBuilt.js";
import { iconLabel } from "../textures/iconRegistry.js";
import Icon from "./Icon.jsx";
import ResourceCell from "./primitives/ResourceCell.jsx";
import Stepper from "./primitives/Stepper.jsx";
import Pill from "./primitives/Pill.jsx";
import Banner from "./primitives/Banner.jsx";

export function labelFor(key, fallback) {
  return iconLabel(key) || ITEMS[key]?.label || fallback || key;
}

function sortKeys(keys, sort, inventory, recentOrder) {
  const arr = [...keys];
  if (sort === "alpha") {
    arr.sort((a, b) => labelFor(a).localeCompare(labelFor(b)));
  } else if (sort === "recent") {
    const rank = (k) => {
      const idx = recentOrder ? recentOrder.indexOf(k) : -1;
      return idx === -1 ? Number.POSITIVE_INFINITY : idx;
    };
    arr.sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return labelFor(a).localeCompare(labelFor(b));
    });
  } else {
    arr.sort((a, b) => {
      const ca = inventory[a] || 0;
      const cb = inventory[b] || 0;
      if (cb !== ca) return cb - ca;
      return labelFor(a).localeCompare(labelFor(b));
    });
  }
  return arr;
}

function matchesQuery(key, label, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return key.toLowerCase().includes(q) || label.toLowerCase().includes(q);
}

export function Section({ title, titleColor = "#f8e7c6", children }) {
  return (
    <div className="flex flex-col gap-2 min-h-0">
      <div className="font-bold text-[14px] landscape:max-[1024px]:text-[11px] tracking-wide" style={{ color: titleColor }}>{title}</div>
      <div className="min-h-0">{children}</div>
    </div>
  );
}

function CheckGlyph({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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

function TradeStepper({ count, marketBuilt, buyEnabled, sellEnabled, onBuy, onSell, buyPrice, sellPrice }) {
  const handleChange = (next) => {
    const delta = next - count;
    if (delta > 0 && buyEnabled) onBuy();
    else if (delta < 0 && sellEnabled) onSell();
  };
  const max = buyEnabled ? undefined : count;
  const disabled = !marketBuilt || (!buyEnabled && !sellEnabled);
  const suffixParts = [];
  if (sellEnabled) suffixParts.push(`sell ${sellPrice}`);
  if (buyEnabled) suffixParts.push(`buy ${buyPrice}`);
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Stepper
        size="sm"
        value={count}
        min={0}
        max={max}
        accelerator
        disabled={disabled}
        onChange={handleChange}
        suffix={suffixParts.join(" · ")}
      />
    </div>
  );
}

function StatusPill({ status, total }) {
  if (status === "ready") {
    return (
      <Pill tone="moss" variant="soft" size="sm" leading={<CheckGlyph size={10} />}>
        Order {total}
      </Pill>
    );
  }
  if (status === "needed") {
    return (
      <Pill tone="gold" variant="soft" size="sm">
        Need {total}
      </Pill>
    );
  }
  if (status === "excess") {
    return (
      <Pill tone="iron" variant="soft" size="sm">
        Excess
      </Pill>
    );
  }
  return null;
}

function InventoryCell({ r, count, compact, orderStatus, orderTotal, marketBuilt, buyPrice, sellPrice, dispatch, tradeKind }) {
  const showBuy = !compact && tradeKind === "resource" && buyPrice > 0;
  const showSell = !compact && sellPrice > 0;
  const showTrade = (showBuy || showSell) && !!dispatch;

  let derivedStatus = orderStatus;
  if (!derivedStatus && count > 0) derivedStatus = "excess";

  const onTap = () => {
    // TODO(A40): wire INSPECT_RESOURCE dispatch once detail sheet exists.
    if (dispatch) dispatch({ type: "INSPECT_RESOURCE", key: r.key });
  };

  const sellHandler = () => {
    if (!dispatch) return;
    if (tradeKind === "resource") {
      dispatch({ type: "SELL_RESOURCE", payload: { key: r.key, qty: 1 } });
    } else {
      dispatch({ type: "SELL_ITEM", id: r.key, qty: 1 });
    }
  };
  const buyHandler = () => {
    if (!dispatch) return;
    dispatch({ type: "BUY_RESOURCE", payload: { key: r.key, qty: 1 } });
  };

  const pill = derivedStatus ? <StatusPill status={derivedStatus} total={orderTotal} /> : null;

  const actions = showTrade ? (
    <div className="flex items-center gap-2">
      {pill}
      <TradeStepper
        count={count}
        marketBuilt={marketBuilt}
        buyEnabled={showBuy && marketBuilt}
        sellEnabled={showSell && marketBuilt && count > 0}
        onBuy={buyHandler}
        onSell={sellHandler}
        buyPrice={buyPrice}
        sellPrice={sellPrice}
      />
    </div>
  ) : pill;

  return (
    <ResourceCell
      resourceKey={r.key}
      count={count}
      density={compact ? "compact" : "comfortable"}
      status={derivedStatus}
      actions={actions}
      onTap={onTap}
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
          <button
            key={o.id}
            type="button"
            onClick={() => dispatch({ type: "TURN_IN_ORDER", id: o.id, npc: o.npc, key: o.key, need: o.need, reward: o.reward })}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-2 text-left border min-h-tap transition-colors ${done ? "bg-moss/40 border-moss text-white" : "bg-iron-deep border-iron text-cream"}`}
          >
            <span className="flex-shrink-0 grid place-items-center w-5 h-5">
              <Icon iconKey={o.key} size={20} />
            </span>
            <span className="flex-1 min-w-0 text-[10px] font-bold truncate">{label}</span>
            <span className={`text-[10px] font-bold whitespace-nowrap tabular-nums ${done ? "text-white" : have > 0 ? "text-cream" : "text-parchment"}`}>
              {Math.min(have, o.need)}/{o.need}
            </span>
            {done && (
              <span className="text-white" aria-label="ready">
                <CheckGlyph size={12} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function InventoryGrid({
  inventory,
  biomeKey,
  compact,
  orders = [],
  state,
  dispatch,
  filter = "all",
  sort = "count",
  query = "",
  recentOrder,
}) {
  const allBiomeEntries = BIOMES[biomeKey].resources;
  const resources = allBiomeEntries.filter((r) => r.kind !== "tile");
  const items = Object.entries(ITEMS).filter(([key, item]) =>
    (inventory[key] || 0) > 0 &&
    !resources.find(r => r.key === key) &&
    item.kind !== "tile" &&
    item.kind !== "tool"
  );
  const gridCols = compact ? "grid-cols-1" : "grid-cols-[repeat(auto-fill,minmax(240px,1fr))]";
  const { status, totals } = orderStatusByKey(orders, inventory);
  const marketBuilt = !!locBuilt(state).caravan_post;
  const prices = state?.market?.prices ?? {};

  const showResources = filter === "all" || filter === "chain" || filter === "sellable";
  const showItems = filter === "all" || filter === "items" || filter === "sellable";

  const resourceCellsBy = new Map(resources.map((r) => [r.key, r]));
  const itemDefsByKey = new Map(items.map(([key, item]) => [key, item]));

  const visibleResourceKeys = showResources
    ? resources
        .map((r) => r.key)
        .filter((key) => {
          if (!matchesQuery(key, labelFor(key, resourceCellsBy.get(key)?.label), query)) return false;
          if (filter === "sellable") {
            const p = prices[key];
            return (p?.sell ?? 0) > 0;
          }
          return true;
        })
    : [];

  const visibleItemKeys = showItems
    ? items
        .map(([key]) => key)
        .filter((key) => {
          if (!matchesQuery(key, labelFor(key, itemDefsByKey.get(key)?.label), query)) return false;
          if (filter === "sellable") return sellPriceFor(key) > 0;
          return true;
        })
    : [];

  const sortedResourceKeys = sortKeys(visibleResourceKeys, sort, inventory, recentOrder);
  const sortedItemKeys = sortKeys(visibleItemKeys, sort, inventory, recentOrder);

  const noResults =
    sortedResourceKeys.length === 0 &&
    sortedItemKeys.length === 0 &&
    (query.length > 0 || filter !== "all");

  return (
    <div className="flex flex-col gap-3">
      {!compact && dispatch && (
        <Banner
          tone={marketBuilt ? "success" : "info"}
          icon={<Icon iconKey="ui_shop" size={16} />}
        >
          {marketBuilt
            ? "Caravan Post open — buy and sell directly from your inventory."
            : "Build the Caravan Post in town to enable trading from your inventory."}
        </Banner>
      )}
      {orders.length > 0 && (
        <div className="flex items-center gap-3 text-caption text-ink-soft px-1 -mb-1">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-moss" /> ready</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gold" /> needed</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-iron-soft" /> excess</span>
        </div>
      )}
      {noResults && (
        <div className="text-body text-ink-light italic px-1 py-2">
          No matches{query ? ` for "${query}"` : ""}.
        </div>
      )}
      {showResources && sortedResourceKeys.length > 0 && (
        <div>
          <div className="text-caption font-bold text-ink-soft uppercase tracking-wider mb-1.5">Resources</div>
          <div className={`grid ${gridCols} gap-2`}>
            {sortedResourceKeys.map((key) => {
              const r = resourceCellsBy.get(key);
              const p = prices[key];
              return (
                <InventoryCell
                  key={key}
                  r={r}
                  count={inventory[key] || 0}
                  compact={compact}
                  orderStatus={status[key]}
                  orderTotal={totals[key]}
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
      )}
      {showItems && (
        <div>
          <div className="text-caption font-bold text-ink-soft uppercase tracking-wider mb-1.5">Items</div>
          {items.length === 0 ? (
            <div className="text-caption text-ink-light italic px-1">No items yet — craft something!</div>
          ) : sortedItemKeys.length === 0 ? (
            <div className="text-caption text-ink-light italic px-1">No items match the current filter.</div>
          ) : (
            <div className={`grid ${gridCols} gap-2`}>
              {sortedItemKeys.map((key) => {
                const item = itemDefsByKey.get(key);
                return (
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
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
