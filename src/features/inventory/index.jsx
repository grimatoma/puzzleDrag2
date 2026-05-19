import { useEffect, useState } from "react";
import { InventoryGrid } from "../../ui/Inventory.jsx";
import Pill from "../../ui/primitives/Pill.jsx";
import Button from "../../ui/primitives/Button.jsx";
import FeaturePanel from "../../ui/primitives/FeaturePanel.jsx";
import { SearchInput } from "../../ui/primitives/Field.jsx";

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
    <FeaturePanel className="z-10">
      <FeaturePanel.Toolbar className="flex-col !items-stretch gap-2 pt-3 pb-2">
        <SearchInput
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          onClear={() => setQueryInput("")}
          placeholder="Search resources..."
          ariaLabel="Search resources"
        />

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
      </FeaturePanel.Toolbar>

      <FeaturePanel.Body>
        <div className="w-full h-full min-h-0 flex flex-col gap-3">
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
      </FeaturePanel.Body>
    </FeaturePanel>
  );
}
