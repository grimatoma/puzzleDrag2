import { useEffect, useState, useCallback } from "react";
import { InventoryGrid } from "../../ui/Inventory.jsx";
import { INVENTORY_TAGS } from "./tags.js";
import FeaturePanel from "../../ui/primitives/FeaturePanel.jsx";
import { SearchInput } from "../../ui/primitives/Field.jsx";

export const viewKey = "inventory";

const PRIMARY_FILTERS = [
  { id: "all", label: "All" },
  { id: INVENTORY_TAGS.RESOURCE, label: "Resources" },
  { id: INVENTORY_TAGS.TOOL, label: "Tools" },
  { id: INVENTORY_TAGS.ITEM, label: "Items" },
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

const INV_VIEW_KEY = "hearth.settings.inventoryView";

export function readViewMode() {
  try {
    const val = localStorage.getItem(INV_VIEW_KEY);
    return val === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

export function saveViewMode(mode) {
  try {
    localStorage.setItem(INV_VIEW_KEY, mode);
  } catch { /* storage unavailable */ }
}

function useViewMode() {
  const [viewMode, setViewMode] = useState(readViewMode);
  const toggle = useCallback(() => {
    setViewMode((prev) => {
      const next = prev === "grid" ? "list" : "grid";
      saveViewMode(next);
      return next;
    });
  }, []);
  return [viewMode, toggle];
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="0" y="0" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="8" y="0" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="0" y="8" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="8" y="8" width="6" height="6" rx="1" fill="currentColor" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="0" y="1" width="14" height="3" rx="1" fill="currentColor" />
      <rect x="0" y="6" width="14" height="3" rx="1" fill="currentColor" />
      <rect x="0" y="11" width="14" height="3" rx="1" fill="currentColor" />
    </svg>
  );
}

export default function InventoryScreen({ state, dispatch, searchOpen: searchOpenProp }) {
  const biomeKey = state.biomeKey ?? "farm";
  const isPhone = usePhoneViewport();

  const [queryInput, setQueryInput] = useState("");
  const [primaryFilter, setPrimaryFilter] = useState("all");

  const searchOpen = searchOpenProp ?? false;
  const [viewMode, toggleViewMode] = useViewMode();
  const query = useDebounced(queryInput, 100);
  const recentOrder = useRecentOrder(state.inventory);

  useEffect(() => {
    if (!searchOpen) {
      setTimeout(() => setQueryInput(""), 0);
    }
  }, [searchOpen]);

  const combinedFilter = primaryFilter === "all" ? [] : [primaryFilter];

  return (
    <FeaturePanel className="z-10">
      {searchOpen && (
        <FeaturePanel.Toolbar className="pt-2 pb-2">
          <SearchInput
            autoFocus
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onClear={() => setQueryInput("")}
            placeholder="Search resources..."
            ariaLabel="Search resources"
            className="flex-1"
          />
        </FeaturePanel.Toolbar>
      )}

      <FeaturePanel.Body>
        <div className="w-full h-full min-h-0 flex flex-col gap-3">
          <div className="hl-well">
            <div className="flex flex-row flex-wrap items-center gap-2">
              {PRIMARY_FILTERS.map((option) => {
                const active = primaryFilter === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`rounded-lg px-2 py-1 text-[11px] font-semibold border transition-colors ${active ? "bg-ember/20 border-ember/70 text-ink" : "bg-parchment-dim border-iron text-ink-soft"}`}
                    onClick={() => setPrimaryFilter(option.id)}
                  >
                    {option.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={toggleViewMode}
                aria-label={viewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
                className="ml-auto rounded-lg px-2 py-1 border border-iron bg-parchment-dim text-ink hover:bg-parchment-soft hover:border-iron-soft transition-colors flex items-center gap-1"
              >
                {viewMode === "grid" ? <ListIcon /> : <GridIcon />}
              </button>
            </div>
          </div>
          <InventoryGrid
            inventory={state.inventory}
            biomeKey={biomeKey}
            orders={state.orders}
            state={state}
            dispatch={dispatch}
            filter={combinedFilter}
            sort="alpha"
            query={query}
            recentOrder={recentOrder}
            compact={isPhone}
            viewMode={viewMode}
            resourceProgress={state.resourceProgress ?? {}}
          />
        </div>
      </FeaturePanel.Body>
    </FeaturePanel>
  );
}
