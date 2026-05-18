import { useState } from "react";
import { BIOMES, ITEMS } from "../constants.js";
import { sellPriceFor } from "../features/market/pricing.js";
import { locBuilt } from "../locBuilt.js";
import { iconLabel } from "../textures/iconRegistry.js";
import Icon from "./Icon.jsx";
import Pill from "./primitives/Pill.jsx";
import Banner from "./primitives/Banner.jsx";
import {
  BrowserDetailLayout,
  BrowserGrid,
  BrowserItemButton,
  DetailActionButton,
  DetailPane,
} from "./primitives/BrowserDetail.jsx";

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

function InventoryBrowserItem({ entry, selected, onSelect }) {
  const { key, label, count, orderStatus } = entry;
  let derivedStatus = orderStatus;
  if (!derivedStatus && count > 0) derivedStatus = "excess";
  return (
    <BrowserItemButton
      selected={selected}
      icon={<Icon iconKey={key} size={34} title={label} />}
      title={label}
      subtitle={entry.kind === "item" ? "Item" : "Resource"}
      count={count}
      status={derivedStatus}
      onClick={onSelect}
      aria-label={`View ${label}`}
    />
  );
}

function InventoryDetail({ entry, marketBuilt, dispatch }) {
  if (!entry) return <DetailPane empty="Select a resource to inspect it." />;
  const { key, label, count, sellPrice, buyPrice, kind, orderStatus, orderTotal } = entry;
  const canBuy = kind === "resource" && marketBuilt && buyPrice > 0;
  const canSell = marketBuilt && sellPrice > 0 && count > 0;
  const sell = () => {
    if (kind === "resource") {
      dispatch({ type: "SELL_RESOURCE", payload: { key, qty: 1 } });
    } else {
      dispatch({ type: "SELL_ITEM", id: key, qty: 1 });
    }
  };
  const buy = () => dispatch({ type: "BUY_RESOURCE", payload: { key, qty: 1 } });
  const status = orderStatus ? <StatusPill status={orderStatus} total={orderTotal} /> : null;

  return (
    <DetailPane
      eyebrow={kind === "item" ? "Item" : "Resource"}
      title={label}
      status={`${count.toLocaleString()} in storage`}
      icon={<Icon iconKey={key} size={64} title={label} />}
      actions={
        <>
          <DetailActionButton
            tone="moss"
            disabled={!canSell}
            onClick={sell}
          >
            Sell {sellPrice > 0 ? `+${sellPrice}◉` : ""}
          </DetailActionButton>
          {kind === "resource" && (
            <DetailActionButton
              tone="gold"
              disabled={!canBuy}
              onClick={buy}
            >
              Buy {buyPrice > 0 ? `${buyPrice}◉` : ""}
            </DetailActionButton>
          )}
        </>
      }
    >
      <div className="hl-well">
        <div className="hl-section-label mb-1.5">Market</div>
        <div className="flex flex-wrap gap-2">
          {status}
          <Pill tone={marketBuilt ? "moss" : "iron"} variant="soft" size="sm">
            {marketBuilt ? "Caravan Post open" : "Build Caravan Post"}
          </Pill>
        </div>
      </div>
      {orderStatus && (
        <div className="hl-well">
          <div className="hl-section-label mb-1.5">Orders</div>
          <div className="hl-text-dim">
            Current orders ask for {orderTotal} {label}.
          </div>
        </div>
      )}
    </DetailPane>
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
  const { status, totals } = orderStatusByKey(orders, inventory);
  const marketBuilt = !!locBuilt(state).caravan_post;
  const prices = state?.market?.prices ?? {};
  const [selectedKey, setSelectedKey] = useState(null);

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
  const entries = [];
  for (const key of sortedResourceKeys) {
    const r = resourceCellsBy.get(key);
    const p = prices[key] ?? {};
    entries.push({
      key,
      kind: "resource",
      label: labelFor(key, r?.label),
      count: inventory[key] || 0,
      buyPrice: p.buy ?? 0,
      sellPrice: p.sell ?? 0,
      orderStatus: status[key],
      orderTotal: totals[key],
    });
  }
  for (const key of sortedItemKeys) {
    const item = itemDefsByKey.get(key);
    entries.push({
      key,
      kind: "item",
      label: labelFor(key, item?.label),
      count: inventory[key] || 0,
      buyPrice: 0,
      sellPrice: sellPriceFor(key),
      orderStatus: status[key],
      orderTotal: totals[key],
    });
  }

  const selected = entries.find((e) => e.key === selectedKey) ?? entries[0] ?? null;

  const noResults =
    sortedResourceKeys.length === 0 &&
    sortedItemKeys.length === 0 &&
    (query.length > 0 || filter !== "all");

  const toolbar = (
    <div className="flex flex-col gap-2">
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
        <div className="flex items-center gap-3 text-caption text-on-panel-dim px-1 -mb-1">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-moss" /> ready</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gold" /> needed</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-iron-soft" /> excess</span>
        </div>
      )}
    </div>
  );

  const browser = noResults ? (
    <div className="hl-empty px-1">No matches{query ? ` for "${query}"` : ""}.</div>
  ) : entries.length === 0 ? (
    <div className="hl-empty px-1">No resources yet.</div>
  ) : (
    <BrowserGrid min={compact ? 220 : 180}>
      {entries.map((entry) => (
        <InventoryBrowserItem
          key={entry.key}
          entry={entry}
          selected={selected?.key === entry.key}
          onSelect={() => setSelectedKey(entry.key)}
        />
      ))}
    </BrowserGrid>
  );

  return (
    <BrowserDetailLayout
      toolbar={toolbar}
      browser={browser}
      detail={<InventoryDetail entry={selected} marketBuilt={marketBuilt} dispatch={dispatch} />}
    />
  );
}
