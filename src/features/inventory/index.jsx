import { useEffect, useState } from "react";
import { InventoryGrid } from "../../ui/Inventory.jsx";
import FeaturePanel from "../../ui/primitives/FeaturePanel.jsx";
import { SearchInput } from "../../ui/primitives/Field.jsx";

export const viewKey = "inventory";

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

function SearchIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function InventoryScreen({ state, dispatch }) {
  const biomeKey = state.biomeKey ?? "farm";
  const isPhone = usePhoneViewport();

  const [queryInput, setQueryInput] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const query = useDebounced(queryInput, 100);
  const recentOrder = useRecentOrder(state.inventory);

  const closeSearch = () => {
    setSearchOpen(false);
    setQueryInput("");
  };

  return (
    <FeaturePanel className="z-10">
      <FeaturePanel.Header
        title="Inventory"
        actions={
          <button
            type="button"
            onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
            aria-label={searchOpen ? "Close search" : "Search resources"}
            aria-pressed={searchOpen}
            className="hl-panel-close"
          >
            <SearchIcon size={16} />
          </button>
        }
      />
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
          <InventoryGrid
            inventory={state.inventory}
            biomeKey={biomeKey}
            orders={state.orders}
            state={state}
            dispatch={dispatch}
            filter="all"
            sort="count"
            query={query}
            recentOrder={recentOrder}
            compact={isPhone}
          />
        </div>
      </FeaturePanel.Body>
    </FeaturePanel>
  );
}
