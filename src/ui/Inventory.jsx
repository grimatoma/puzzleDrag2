import { useState, useReducer, useCallback, useEffect, useLayoutEffect, useRef, forwardRef } from "react";
import { BIOMES, ITEMS, RECIPES } from "../constants.js";
import {
  INVENTORY_TAGS,
  itemHasTag,
  sourceTagsForItem,
  tagsForItemKey,
} from "../features/inventory/tags.js";
import { sellPriceFor } from "../features/market/pricing.js";
import { locBuilt } from "../locBuilt.js";
import { iconLabel } from "../textures/iconRegistry.js";
import Icon from "./Icon.jsx";
import Pill from "./primitives/Pill.jsx";
import Button from "./primitives/Button.jsx";
import {
  BrowserDetailLayout,
  BrowserGrid,
  BrowserItemButton,
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

export const accordionInitialState = { displayedKey: null, isOpen: false, pendingKey: null };

export function accordionReducer(state, action) {
  switch (action.type) {
    case "SELECT": {
      const { key } = action;
      if (key === state.displayedKey && state.isOpen) {
        return { ...state, isOpen: false, pendingKey: null };
      }
      if (state.displayedKey && state.isOpen) {
        return { ...state, isOpen: false, pendingKey: key };
      }
      if (!state.displayedKey) {
        return { displayedKey: key, isOpen: false, pendingKey: null };
      }
      return { ...state, pendingKey: key };
    }
    case "SELECT_IN_PLACE": {
      const { key } = action;
      if (key === state.displayedKey) {
        return { ...state, isOpen: false, pendingKey: null };
      }
      return { displayedKey: key, isOpen: true, pendingKey: null };
    }
    case "OPEN":
      return { ...state, isOpen: true };
    case "CLOSE":
      return { ...state, isOpen: false, pendingKey: null };
    case "TRANSITION_END":
      if (state.isOpen) return state;
      return state.pendingKey
        ? { displayedKey: state.pendingKey, isOpen: false, pendingKey: null }
        : { displayedKey: null, isOpen: false, pendingKey: null };
    default:
      return state;
  }
}

function useAccordion() {
  const [state, dispatch] = useReducer(accordionReducer, accordionInitialState);

  // Trigger the enter animation after displayedKey is set (next frame)
  useEffect(() => {
    if (!state.displayedKey) return;
    const id = requestAnimationFrame(() => dispatch({ type: "OPEN" }));
    return () => cancelAnimationFrame(id);
  }, [state.displayedKey]);

  const select = useCallback((key) => dispatch({ type: "SELECT", key }), []);
  const selectInPlace = useCallback((key) => dispatch({ type: "SELECT_IN_PLACE", key }), []);
  const close = useCallback(() => dispatch({ type: "CLOSE" }), []);
  const onClosed = useCallback(() => dispatch({ type: "TRANSITION_END" }), []);

  return { displayedKey: state.displayedKey, isOpen: state.isOpen, select, selectInPlace, close, onClosed };
}

const InventoryIconCell = forwardRef(function InventoryIconCell(
  { entry, selected, onSelect },
  ref
) {
  const { key, label, count } = entry;
  return (
    <button
      ref={ref}
      type="button"
      className={`inv-grid__cell${selected ? " is-selected" : ""}${count === 0 ? " is-muted" : ""}`}
      aria-pressed={selected}
      aria-label={`${label}${count > 0 ? `, ${count}` : ""}`}
      onClick={onSelect}
    >
      <Icon iconKey={key} size={52} title={label} />
      {count > 0 && (
        <span className="inv-grid__badge" aria-hidden="true">
          {count > 999 ? "999+" : count}
        </span>
      )}
    </button>
  );
});

function InventoryAccordion({ entry, isOpen, arrowLeft, marketBuilt, dispatch, onClosed, style }) {
  const handleTransitionEnd = (e) => {
    if (e.propertyName === "max-height" && !isOpen) {
      onClosed?.();
    }
  };

  return (
    <div className={`inv-accordion${isOpen ? " is-open" : ""}`} style={style}>
      <div
        className="inv-accordion__arrow"
        style={arrowLeft != null ? { left: arrowLeft } : { left: "50%" }}
      />
      <div
        className={`inv-accordion__body${isOpen ? " is-open" : ""}`}
        onTransitionEnd={handleTransitionEnd}
      >
        <InventoryDetail entry={entry} marketBuilt={marketBuilt} dispatch={dispatch} />
      </div>
    </div>
  );
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
  // List view: surface only meaningful order statuses (ready/needed). The
  // "Excess" badge and the redundant kind subtitle stay on the detail card.
  const listStatus = orderStatus === "ready" || orderStatus === "needed" ? orderStatus : undefined;
  return (
    <BrowserItemButton
      selected={selected}
      icon={<Icon iconKey={key} size={40} title={label} />}
      title={label}
      count={count}
      status={listStatus}
      onClick={onSelect}
      aria-label={`View ${label}`}
    />
  );
}

function InventoryDetail({ entry, marketBuilt, dispatch }) {
  if (!entry) return <DetailPane empty="Select a resource to inspect it." />;
  const { key, label, count, sellPrice, buyPrice, kind, orderStatus, orderTotal, tags = [] } = entry;
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
      eyebrow={kind === "tool" ? "Tool" : kind === "item" ? "Item" : "Resource"}
      title={label}
      status={`${count.toLocaleString()} in storage`}
      icon={<Icon iconKey={key} size={72} title={label} />}
      headerActions={
        <div className="flex flex-col gap-1.5">
          <Button
            tone="moss"
            size="sm"
            disabled={!canSell}
            onClick={sell}
          >
            Sell {sellPrice > 0 ? `+${sellPrice}◉` : ""}
          </Button>
          {kind === "resource" && (
            <Button
              tone="gold"
              size="sm"
              disabled={!canBuy}
              onClick={buy}
            >
              Buy {buyPrice > 0 ? `${buyPrice}◉` : ""}
            </Button>
          )}
        </div>
      }
    >
      {status && (
        <div className="hl-well">
          <div className="hl-section-label mb-1.5">Status</div>
          <div className="flex flex-wrap gap-2">{status}</div>
        </div>
      )}
      {tags.length > 0 && (
        <div className="hl-well">
          <div className="hl-section-label mb-1.5">Tags</div>
          <div className="hl-text-dim capitalize">{tags.join(", ")}</div>
        </div>
      )}
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
            className={`flex items-center gap-1.5 rounded-lg px-2 py-2 text-left border min-h-tap transition-colors ${done ? "bg-moss/40 border-moss text-white" : "bg-parchment-soft border-iron text-ink"}`}
          >
            <span className="flex-shrink-0 grid place-items-center w-5 h-5">
              <Icon iconKey={o.key} size={20} />
            </span>
            <span className="flex-1 min-w-0 text-[10px] font-bold truncate">{label}</span>
            <span className={`text-[10px] font-bold whitespace-nowrap tabular-nums ${done ? "text-white" : have > 0 ? "text-ink" : "text-ink-soft"}`}>
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
  viewMode = "list",
}) {
  const allBiomeEntries = BIOMES[biomeKey].resources;
  const resources = allBiomeEntries.filter((r) => r.kind !== "tile");
  const items = Object.entries(ITEMS).filter(([key, item]) =>
    (inventory[key] || 0) > 0 &&
    !resources.find(r => r.key === key) &&
    item.kind !== "tile" &&
    item.kind !== "tool"
  );
  const tools = Object.entries(state?.tools ?? {}).filter(([key, count]) =>
    (count || 0) > 0 && ITEMS[key]?.kind === "tool"
  );
  const { status, totals } = orderStatusByKey(orders, inventory);
  const marketBuilt = !!locBuilt(state).caravan_post;
  const prices = state?.market?.prices ?? {};
  const recipesByOutput = Object.values(RECIPES).reduce((acc, recipe) => {
    if (!recipe?.item) return acc;
    if (!acc[recipe.item]) acc[recipe.item] = [];
    acc[recipe.item].push(recipe);
    return acc;
  }, {});
  const [selectedKey, setSelectedKey] = useState(null);
  const accordion = useAccordion();
  const cellRefs = useRef({});
  const containerRef = useRef(null);
  const [arrowLeft, setArrowLeft] = useState(null);
  const [columnsPerRow, setColumnsPerRow] = useState(1);
  const assignCellRef = useCallback((key, el) => {
    if (el) cellRefs.current[key] = el;
    else delete cellRefs.current[key];
  }, []);

  useLayoutEffect(() => {
    let next = null;
    if (compact && accordion.displayedKey) {
      const cell = cellRefs.current[accordion.displayedKey];
      const container = containerRef.current;
      if (cell && container) {
        const cellRect = cell.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        next = cellRect.left + cellRect.width / 2 - containerRect.left;
      }
    }
    setArrowLeft(next);
  }, [accordion.displayedKey, compact, viewMode]);

  useLayoutEffect(() => {
    if (!compact || viewMode !== "grid") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when leaving grid mode
      setColumnsPerRow(1);
      return undefined;
    }
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return undefined;
    const measure = () => {
      const cs = window.getComputedStyle(container);
      const tracks = cs.gridTemplateColumns
        .split(" ")
        .filter((t) => t && t !== "none");
      setColumnsPerRow(Math.max(tracks.length, 1));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [compact, viewMode]);

  const activeTags = filter === "all"
    ? null
    : Array.isArray(filter)
      ? filter
      : filter === "chain"
        ? [INVENTORY_TAGS.RESOURCE]
        : filter === "items"
          ? [INVENTORY_TAGS.ITEM]
          : [filter];

  const matchesTags = (key) => {
    if (!activeTags || activeTags.length === 0) return true;
    return activeTags.every((tag) => itemHasTag(key, tag) || sourceTagsForItem(key, { recipesByOutput }).includes(tag));
  };

  const resourceCellsBy = new Map(resources.map((r) => [r.key, r]));
  const itemDefsByKey = new Map(items.map(([key, item]) => [key, item]));
  const toolDefsByKey = new Map(tools.map(([key]) => [key, ITEMS[key]]));

  const visibleResourceKeys = resources
    .map((r) => r.key)
    .filter((key) => {
      if (!matchesTags(key)) return false;
      if (!matchesQuery(key, labelFor(key, resourceCellsBy.get(key)?.label), query)) return false;
      if (filter === "sellable") {
        const p = prices[key];
        return (p?.sell ?? 0) > 0;
      }
      return true;
    });

  const visibleItemKeys = items
    .map(([key]) => key)
    .filter((key) => {
      if (!matchesTags(key)) return false;
      if (!matchesQuery(key, labelFor(key, itemDefsByKey.get(key)?.label), query)) return false;
      if (filter === "sellable") return sellPriceFor(key) > 0;
      return true;
    });
  const visibleToolKeys = tools
    .map(([key]) => key)
    .filter((key) => {
      if (!matchesTags(key)) return false;
      if (!matchesQuery(key, labelFor(key, toolDefsByKey.get(key)?.label), query)) return false;
      return true;
    });

  const sortedResourceKeys = sortKeys(visibleResourceKeys, sort, inventory, recentOrder);
  const sortedItemKeys = sortKeys(visibleItemKeys, sort, inventory, recentOrder);
  const toolCountByKey = Object.fromEntries(tools);
  const sortedToolKeys = sortKeys(visibleToolKeys, sort, toolCountByKey, recentOrder);
  const entries = [];
  for (const key of sortedResourceKeys) {
    const r = resourceCellsBy.get(key);
    const p = prices[key] ?? {};
    entries.push({
      key,
      kind: "resource",
      tags: [...tagsForItemKey(key), ...sourceTagsForItem(key, { recipesByOutput })],
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
      tags: [...tagsForItemKey(key), ...sourceTagsForItem(key, { recipesByOutput })],
      label: labelFor(key, item?.label),
      count: inventory[key] || 0,
      buyPrice: 0,
      sellPrice: sellPriceFor(key),
      orderStatus: status[key],
      orderTotal: totals[key],
    });
  }
  for (const key of sortedToolKeys) {
    const item = toolDefsByKey.get(key);
    entries.push({
      key,
      kind: "tool",
      tags: [...tagsForItemKey(key), ...sourceTagsForItem(key, { recipesByOutput })],
      label: labelFor(key, item?.label),
      count: toolCountByKey[key] || 0,
      buyPrice: 0,
      sellPrice: 0,
      orderStatus: undefined,
      orderTotal: undefined,
    });
  }

  const noResults =
    sortedResourceKeys.length === 0 &&
    sortedItemKeys.length === 0 &&
    sortedToolKeys.length === 0 &&
    (query.length > 0 || filter !== "all");

  const makeRef = useCallback((key) => (el) => assignCellRef(key, el), [assignCellRef]);

  // ── Narrow mode: inline accordion, no side panel ─────────────────────────
  if (compact) {
    const cells = [];
    if (entries.length === 0) {
      cells.push(
        <div key="empty" className="hl-empty px-1">
          {noResults ? `No matches${query ? ` for "${query}"` : ""}.` : "No resources yet."}
        </div>
      );
    } else {
      const selectedIndex = accordion.displayedKey
        ? entries.findIndex((e) => e.key === accordion.displayedKey)
        : -1;
      let accordionInsertAfter = -1;
      if (selectedIndex >= 0 && viewMode === "grid") {
        const cols = Math.max(columnsPerRow, 1);
        const rowEnd = Math.min(
          (Math.floor(selectedIndex / cols) + 1) * cols - 1,
          entries.length - 1
        );
        accordionInsertAfter = rowEnd;
      }
      const selectedEntry = selectedIndex >= 0 ? entries[selectedIndex] : null;
      const cols = Math.max(columnsPerRow, 1);
      const handleCellSelect = (key, idx) => {
        if (viewMode === "grid" && accordion.isOpen && selectedIndex >= 0) {
          if (Math.floor(selectedIndex / cols) === Math.floor(idx / cols)) {
            accordion.selectInPlace(key);
            return;
          }
        }
        accordion.select(key);
      };
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const isSelected = entry.key === accordion.displayedKey;
        if (viewMode === "grid") {
          cells.push(
            <InventoryIconCell
              key={entry.key}
              entry={entry}
              selected={isSelected}
              onSelect={() => handleCellSelect(entry.key, i)}
              ref={makeRef(entry.key)}
            />
          );
        } else if (isSelected) {
          cells.push(
            <div key={entry.key} className="flex flex-col">
              <InventoryBrowserItem
                entry={entry}
                selected
                onSelect={() => accordion.select(entry.key)}
              />
              <div
                className={`inv-accordion__body${accordion.isOpen ? " is-open" : ""}`}
                onTransitionEnd={(e) => {
                  if (e.propertyName === "max-height" && !accordion.isOpen) accordion.onClosed();
                }}
              >
                <InventoryDetail entry={entry} marketBuilt={marketBuilt} dispatch={dispatch} />
              </div>
            </div>
          );
        } else {
          cells.push(
            <InventoryBrowserItem
              key={entry.key}
              entry={entry}
              selected={false}
              onSelect={() => accordion.select(entry.key)}
            />
          );
        }
        if (i === accordionInsertAfter && selectedEntry) {
          cells.push(
            <InventoryAccordion
              key="__accordion__"
              entry={selectedEntry}
              isOpen={accordion.isOpen}
              arrowLeft={viewMode === "grid" ? arrowLeft : null}
              marketBuilt={marketBuilt}
              dispatch={dispatch}
              onClosed={accordion.onClosed}
              style={viewMode === "grid" ? { gridColumn: "1 / -1" } : undefined}
            />
          );
        }
      }
    }

    const containerClass = viewMode === "grid" ? "inv-grid" : "flex flex-col gap-2";
    return (
      <div className="w-full h-full min-h-0 overflow-y-auto pr-1" style={{ overscrollBehavior: "contain" }}>
        <div className={containerClass} ref={containerRef}>
          {cells}
        </div>
      </div>
    );
  }

  // ── Wide mode: right-side detail panel always visible ────────────────────
  const selected = entries.find((e) => e.key === selectedKey) ?? entries[0] ?? null;

  const browser = noResults ? (
    <div className="hl-empty px-1">No matches{query ? ` for "${query}"` : ""}.</div>
  ) : entries.length === 0 ? (
    <div className="hl-empty px-1">No resources yet.</div>
  ) : viewMode === "grid" ? (
    <div className="inv-grid">
      {entries.map((entry) => (
        <InventoryIconCell
          key={entry.key}
          entry={entry}
          selected={selected?.key === entry.key}
          onSelect={() => setSelectedKey(entry.key)}
        />
      ))}
    </div>
  ) : (
    <BrowserGrid min={180}>
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
      browser={browser}
      detail={<InventoryDetail entry={selected} marketBuilt={marketBuilt} dispatch={dispatch} />}
    />
  );
}
