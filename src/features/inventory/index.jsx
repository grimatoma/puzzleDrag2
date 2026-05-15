import { useEffect, useMemo, useRef, useState } from "react";
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
  const orderRef = useRef([]);
  const prevRef = useRef(null);

  return useMemo(() => {
    const prev = prevRef.current;
    const next = [];
    const seen = new Set();
    if (prev) {
      for (const key of Object.keys(inventory || {})) {
        const before = prev[key] || 0;
        const after = inventory[key] || 0;
        if (after > before) {
          next.push(key);
          seen.add(key);
        }
      }
    }
    for (const key of orderRef.current) {
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
    orderRef.current = next;
    prevRef.current = { ...inventory };
    return next;
  }, [inventory]);
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
    <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#7c4f2c] to-[#6b4225] border-[3px] border-[#e2c19b] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b border-[#e2c19b]/40">
        <span className="font-bold text-[14px] text-[#f8e7c6]">Inventory</span>
        <button
          type="button"
          onClick={() => dispatch({ type: "SET_VIEW", view: "town" })}
          className="w-7 h-7 rounded-lg bg-[#f6efe0] border-2 border-[#b28b62] grid place-items-center text-[#6a4b31] font-bold text-[14px]"
        >✕</button>
      </div>

      <div className="flex flex-col gap-2 px-3 pt-3 pb-2 flex-shrink-0 border-b border-[#e2c19b]/30 bg-[#5a3820]/40">
        <div className="relative flex items-center">
          <span className="absolute left-2.5 text-[#8a6a4a] pointer-events-none">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Search resources..."
            aria-label="Search resources"
            className="w-full h-9 pl-8 pr-8 rounded-md bg-[#f6efe0] border border-[#b28b62] text-[13px] text-[#3a2715] placeholder:text-[#8a6a4a] focus:outline-none focus:ring-2 focus:ring-[#d6612a]/50"
          />
          {queryInput && (
            <button
              type="button"
              onClick={() => setQueryInput("")}
              aria-label="Clear search"
              className="absolute right-2 grid place-items-center w-6 h-6 text-[#6a4b31] hover:text-[#3a2715]"
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
            <span className="text-caption text-[#e2c19b] mr-1 hidden sm:inline">Sort</span>
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
                  className={active ? "" : "text-[#f8e7c6] hover:bg-[#f8e7c6]/10"}
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
                className="text-[#f8e7c6] hover:bg-[#f8e7c6]/10 ml-1"
              >
                {compact ? "Grid" : "List"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
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
