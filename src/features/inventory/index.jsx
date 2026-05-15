import { useEffect, useState } from "react";
import { InventoryGrid } from "../../ui/Inventory.jsx";
import Pill from "../../ui/primitives/Pill.jsx";
import Button from "../../ui/primitives/Button.jsx";

export const viewKey = "inventory";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "chain", label: "Chain only" },
  { key: "items", label: "Items only" },
  { key: "sellable", label: "Sellable only" },
];

const SORTS = [
  { key: "count", label: "Count" },
  { key: "alpha", label: "A→Z" },
  { key: "recent", label: "Recent" },
];

const PHONE_BREAKPOINT = 768;

function usePhoneViewport() {
  const [isPhone, setIsPhone] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < PHONE_BREAKPOINT;
  });
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setIsPhone(window.innerWidth < PHONE_BREAKPOINT);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isPhone;
}

function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function useRecentOrder(inventory) {
  const [state, setState] = useState(() => ({
    order: Object.keys(inventory || {}).filter((k) => (inventory[k] || 0) > 0),
    snapshot: { ...(inventory || {}) },
  }));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- track inventory deltas for "recent" sort ordering
    setState((prev) => {
      const seen = new Set();
      const next = [];
      for (const key of Object.keys(inventory || {})) {
        const before = prev.snapshot[key] || 0;
        const after = inventory[key] || 0;
        if (after > before) {
          next.push(key);
          seen.add(key);
        }
      }
      for (const key of prev.order) {
        if (!seen.has(key) && (inventory[key] || 0) > 0) {
          next.push(key);
          seen.add(key);
        }
      }
      for (const key of Object.keys(inventory || {})) {
        if (!seen.has(key) && (inventory[key] || 0) > 0) {
          next.push(key);
          seen.add(key);
        }
      }
      const sameOrder =
        prev.order.length === next.length && prev.order.every((k, i) => k === next[i]);
      const sameSnapshot =
        Object.keys(prev.snapshot).length === Object.keys(inventory || {}).length &&
        Object.keys(inventory || {}).every((k) => (prev.snapshot[k] || 0) === (inventory[k] || 0));
      if (sameOrder && sameSnapshot) return prev;
      return { order: next, snapshot: { ...(inventory || {}) } };
    });
  }, [inventory]);

  return state.order;
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export default function InventoryScreen({ state, dispatch }) {
  const biomeKey = state.biomeKey ?? "farm";
  const isPhone = usePhoneViewport();

  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("count");
  const [queryInput, setQueryInput] = useState("");
  const [compactOverride, setCompactOverride] = useState(null);

  const query = useDebounced(queryInput, 100);
  const recentOrder = useRecentOrder(state.inventory);

  const compact = compactOverride != null ? compactOverride : isPhone;

  return (
    <div className="hl-panel z-10">
      <div className="hl-panel-header">
        <span className="hl-panel-title">Inventory</span>
        <button
          type="button"
          onClick={() => dispatch({ type: "SET_VIEW", view: "town" })}
          className="hl-panel-close"
        >✕</button>
      </div>

      <div className="hl-panel-toolbar flex-col !items-stretch gap-2 pt-3 pb-2">
        <div className="relative flex items-center">
          <span className="absolute left-2.5 text-on-panel-faint pointer-events-none">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Search resources..."
            aria-label="Search resources"
            className="hl-input pl-8 pr-8"
          />
          {queryInput && (
            <button
              type="button"
              onClick={() => setQueryInput("")}
              aria-label="Clear search"
              className="absolute right-2 grid place-items-center w-6 h-6 text-on-panel-dim hover:text-on-panel"
            >
              <ClearIcon />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <Pill
                  key={f.key}
                  tone={active ? "ember" : "iron"}
                  variant={active ? "solid" : "soft"}
                  size="sm"
                  interactive
                  onClick={() => setFilter(f.key)}
                  aria-pressed={active}
                >
                  {f.label}
                </Pill>
              );
            })}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <span className="text-caption text-on-panel-dim mr-1 hidden sm:inline">Sort</span>
            {SORTS.map((s) => {
              const active = sort === s.key;
              return (
                <Button
                  key={s.key}
                  tone={active ? "ember" : "ghost"}
                  variant={active ? "solid" : "ghost"}
                  size="sm"
                  onClick={() => setSort(s.key)}
                  aria-pressed={active}
                  className={active ? "" : "text-on-panel hover:bg-[#3a2715]/10"}
                >
                  {s.label}
                </Button>
              );
            })}
            {!isPhone && (
              <Button
                tone="ghost"
                variant="ghost"
                size="sm"
                onClick={() => setCompactOverride(!compact)}
                aria-label={compact ? "Switch to grid view" : "Switch to list view"}
                aria-pressed={compact}
                className="text-on-panel hover:bg-[#3a2715]/10 ml-1"
              >
                {compact ? "Grid" : "List"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="hl-panel-body">
        <div className="max-w-[640px] mx-auto flex flex-col gap-3">
          <InventoryGrid
            inventory={state.inventory}
            biomeKey={biomeKey}
            orders={state.orders}
            state={state}
            dispatch={dispatch}
            filter={filter}
            sort={sort}
            query={query}
            recentOrder={recentOrder}
            compact={compact}
          />
        </div>
      </div>
    </div>
  );
}
