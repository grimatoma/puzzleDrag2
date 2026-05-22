# Inventory Grid/List Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a grid/list toggle to the Inventory screen — grid shows WoW-style icon cells with count badges; list keeps the current row layout; narrow viewports use an inline accordion for detail; wide viewports keep the side panel.

**Architecture:** `InventoryGrid` receives a `viewMode` prop and renders either icon cells or list rows. On narrow viewports (`compact=true`), it replaces the `BrowserDetailLayout` side panel with an inline `InventoryAccordion` that slides open beneath the selected item, managed by an `accordionReducer` + `useAccordion` hook. On wide viewports, both modes use the existing `BrowserDetailLayout` with the right-side detail pane. A grid/list toggle button in the filter bar reads/writes `localStorage`.

**Tech Stack:** React (hooks, useReducer, forwardRef, useLayoutEffect), CSS (max-height transition, CSS grid, CSS triangle), Vitest (pure reducer tests + localStorage tests)

---

## File Map

| File | What changes |
|---|---|
| `src/components.css` | Add `.inv-grid`, `.inv-grid__cell`, `.inv-grid__badge`, `.inv-accordion`, `.inv-accordion__arrow`, `.inv-accordion__body`, `.inv-accordion__close` |
| `src/ui/Inventory.jsx` | Export `accordionReducer` + `accordionInitialState`; add `useAccordion` hook; add `InventoryIconCell` (forwardRef); add `InventoryAccordion`; update `InventoryGrid` to accept `viewMode` and render the 4-way matrix |
| `src/features/inventory/index.jsx` | Export `readViewMode` + `saveViewMode`; add `useViewMode` hook; add toggle button in filter bar; pass `viewMode` to `InventoryGrid` |
| `src/__tests__/inventory-view-mode.test.js` | New: tests for `accordionReducer` and `readViewMode`/`saveViewMode` |

---

### Task 1: CSS — Icon Grid Cells

**Files:**
- Modify: `src/components.css` (after the `.hl-browser-item__meta` block, ~line 288)

- [ ] **Step 1: Add icon grid styles**

Open `src/components.css`. After the `.hl-browser-item__meta` closing brace (around line 288), add:

```css
  /* ── Inventory icon grid (WoW-style) ── */
  .inv-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
    gap: 8px;
  }

  .inv-grid__cell {
    position: relative;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border-radius: 0.5rem;
    border: 2px solid var(--card-border);
    background: var(--card-bg);
    cursor: pointer;
    transition: border-color 150ms, background 150ms, box-shadow 150ms;
  }

  .inv-grid__cell:hover {
    background: var(--card-bg-hover);
    border-color: var(--card-border-strong);
  }

  .inv-grid__cell.is-selected {
    border-color: var(--moss);
    background: rgba(145, 191, 36, 0.14);
    box-shadow: 0 0 0 3px rgba(145, 191, 36, 0.32);
  }

  .inv-grid__cell.is-muted {
    opacity: 0.62;
  }

  .inv-grid__cell.is-muted.is-selected {
    opacity: 0.85;
  }

  .inv-grid__badge {
    position: absolute;
    top: 3px;
    right: 3px;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 9px;
    background: rgba(0, 0, 0, 0.65);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    line-height: 18px;
    text-align: center;
    pointer-events: none;
    font-variant-numeric: tabular-nums;
  }
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components.css
git commit -m "style: icon grid cell styles (inv-grid, inv-grid__cell, inv-grid__badge)"
```

---

### Task 2: CSS — Accordion

**Files:**
- Modify: `src/components.css` (directly after the icon grid block from Task 1)

- [ ] **Step 1: Add accordion styles**

Directly after the `.inv-grid__badge` closing brace, add:

```css
  /* ── Inventory inline accordion (portrait/narrow detail) ── */
  .inv-accordion {
    position: relative;
    width: 100%;
  }

  .inv-accordion__arrow {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-bottom: 8px solid var(--card-border-strong);
    z-index: 1;
  }

  .inv-accordion__arrow::after {
    content: '';
    position: absolute;
    top: 2px;
    left: -7px;
    width: 0;
    height: 0;
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-bottom: 7px solid var(--card-bg);
  }

  .inv-accordion__body {
    overflow: hidden;
    max-height: 0;
    border-radius: 0.5rem;
    transition: max-height 150ms ease-in;
  }

  .inv-accordion__body.is-open {
    max-height: 700px;
    transition: max-height 200ms ease-out;
  }

  .inv-accordion__close {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--well-bg);
    border: 1px solid var(--well-border);
    color: var(--on-panel-dim);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    z-index: 2;
    transition: background 150ms, color 150ms;
  }

  .inv-accordion__close:hover {
    background: var(--card-bg-hover);
    color: var(--on-panel);
  }
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components.css
git commit -m "style: inventory accordion styles (inv-accordion, arrow, body, close)"
```

---

### Task 3: Failing Tests for Accordion State Machine and View Mode Storage

**Files:**
- Create: `src/__tests__/inventory-view-mode.test.js`

- [ ] **Step 1: Create the test file**

```javascript
// src/__tests__/inventory-view-mode.test.js
import { describe, it, expect, beforeEach } from "vitest";
import { accordionReducer, accordionInitialState } from "../ui/Inventory.jsx";
import { readViewMode, saveViewMode } from "../features/inventory/index.jsx";

// ── Accordion state machine ──────────────────────────────────────────────

describe("accordionReducer", () => {
  it("opens a new item from empty state on SELECT", () => {
    const s = accordionReducer(accordionInitialState, { type: "SELECT", key: "grain" });
    expect(s).toEqual({ displayedKey: "grain", isOpen: false, pendingKey: null });
  });

  it("closes the open item when same key is SELECTed again", () => {
    const open = { displayedKey: "grain", isOpen: true, pendingKey: null };
    const s = accordionReducer(open, { type: "SELECT", key: "grain" });
    expect(s).toEqual({ displayedKey: "grain", isOpen: false, pendingKey: null });
  });

  it("starts closing and queues pending when switching while open", () => {
    const open = { displayedKey: "grain", isOpen: true, pendingKey: null };
    const s = accordionReducer(open, { type: "SELECT", key: "hay" });
    expect(s).toEqual({ displayedKey: "grain", isOpen: false, pendingKey: "hay" });
  });

  it("queues new key when SELECT arrives while already closing", () => {
    const closing = { displayedKey: "grain", isOpen: false, pendingKey: null };
    const s = accordionReducer(closing, { type: "SELECT", key: "hay" });
    expect(s).toEqual({ displayedKey: "grain", isOpen: false, pendingKey: "hay" });
  });

  it("transitions to pending key on TRANSITION_END when closed", () => {
    const s = accordionReducer(
      { displayedKey: "grain", isOpen: false, pendingKey: "hay" },
      { type: "TRANSITION_END" }
    );
    expect(s).toEqual({ displayedKey: "hay", isOpen: false, pendingKey: null });
  });

  it("clears displayedKey on TRANSITION_END with no pending", () => {
    const s = accordionReducer(
      { displayedKey: "grain", isOpen: false, pendingKey: null },
      { type: "TRANSITION_END" }
    );
    expect(s).toEqual({ displayedKey: null, isOpen: false, pendingKey: null });
  });

  it("ignores TRANSITION_END when accordion is open", () => {
    const open = { displayedKey: "grain", isOpen: true, pendingKey: null };
    expect(accordionReducer(open, { type: "TRANSITION_END" })).toBe(open);
  });

  it("sets isOpen on OPEN action", () => {
    const s = accordionReducer(
      { displayedKey: "grain", isOpen: false, pendingKey: null },
      { type: "OPEN" }
    );
    expect(s.isOpen).toBe(true);
  });

  it("closes and clears pendingKey on CLOSE", () => {
    const s = accordionReducer(
      { displayedKey: "grain", isOpen: true, pendingKey: "hay" },
      { type: "CLOSE" }
    );
    expect(s).toEqual({ displayedKey: "grain", isOpen: false, pendingKey: null });
  });
});

// ── View mode storage ─────────────────────────────────────────────────────

const mockLocalStorage = () => {
  const data = {};
  return {
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
};

describe("readViewMode", () => {
  beforeEach(() => { globalThis.localStorage = mockLocalStorage(); });

  it("returns 'list' by default", () => {
    expect(readViewMode()).toBe("list");
  });

  it("returns 'grid' when localStorage contains 'grid'", () => {
    localStorage.setItem("hearth.settings.inventoryView", "grid");
    expect(readViewMode()).toBe("grid");
  });

  it("returns 'list' for unrecognised values", () => {
    localStorage.setItem("hearth.settings.inventoryView", "tiles");
    expect(readViewMode()).toBe("list");
  });
});

describe("saveViewMode", () => {
  beforeEach(() => { globalThis.localStorage = mockLocalStorage(); });

  it("persists 'grid' to localStorage", () => {
    saveViewMode("grid");
    expect(localStorage.getItem("hearth.settings.inventoryView")).toBe("grid");
  });

  it("persists 'list' to localStorage", () => {
    saveViewMode("list");
    expect(localStorage.getItem("hearth.settings.inventoryView")).toBe("list");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- src/__tests__/inventory-view-mode.test.js
```
Expected: multiple FAIL — `accordionReducer` not exported from `Inventory.jsx`; `readViewMode`/`saveViewMode` not exported from `index.jsx`

- [ ] **Step 3: Commit failing tests**

```bash
git add src/__tests__/inventory-view-mode.test.js
git commit -m "test: failing tests for accordionReducer and view mode storage"
```

---

### Task 4: Accordion State Machine + `useAccordion` Hook

**Files:**
- Modify: `src/ui/Inventory.jsx`

- [ ] **Step 1: Extend React import**

Replace the existing `import { useState } from "react";` with:

```javascript
import { useState, useReducer, useCallback, useEffect, useLayoutEffect, useRef, forwardRef } from "react";
```

- [ ] **Step 2: Export `accordionInitialState` and `accordionReducer`, add `useAccordion`**

After the `matchesQuery` function (around line 56), insert:

```javascript
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
  const close = useCallback(() => dispatch({ type: "CLOSE" }), []);
  const onClosed = useCallback(() => dispatch({ type: "TRANSITION_END" }), []);

  return { displayedKey: state.displayedKey, isOpen: state.isOpen, select, close, onClosed };
}
```

- [ ] **Step 3: Run accordion tests**

```bash
npm test -- src/__tests__/inventory-view-mode.test.js
```
Expected: all `accordionReducer` tests PASS; `readViewMode`/`saveViewMode` tests still FAIL

- [ ] **Step 4: Commit**

```bash
git add src/ui/Inventory.jsx
git commit -m "feat: accordionReducer state machine and useAccordion hook"
```

---

### Task 5: View Mode Storage + `useViewMode` Hook + Toggle Button

**Files:**
- Modify: `src/features/inventory/index.jsx`

- [ ] **Step 1: Extend React import**

Replace the existing `import { useEffect, useState } from "react";` with:

```javascript
import { useEffect, useState, useCallback } from "react";
```

- [ ] **Step 2: Add `readViewMode`, `saveViewMode`, `useViewMode`, and SVG icons**

After the `useRecentOrder` function (around line 83), insert:

```javascript
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
```

- [ ] **Step 3: Wire `useViewMode` into `InventoryScreen`**

Inside `InventoryScreen`, after the existing `useState` calls, add:

```javascript
  const [viewMode, toggleViewMode] = useViewMode();
```

In the filter bar JSX, after the closing `</button>` of the last `PRIMARY_FILTERS.map(...)` and before the closing `</div>` of the flex row, add the toggle button:

```jsx
              <div className="ml-auto">
                <button
                  type="button"
                  onClick={toggleViewMode}
                  aria-label={viewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
                  className="rounded-lg px-2 py-1 border border-iron bg-iron-deep/55 text-parchment hover:border-iron-light transition-colors flex items-center gap-1"
                >
                  {viewMode === "grid" ? <ListIcon /> : <GridIcon />}
                </button>
              </div>
```

Pass `viewMode` to `InventoryGrid` (add after the existing `compact={isPhone}` line):

```jsx
            viewMode={viewMode}
```

- [ ] **Step 4: Run all tests**

```bash
npm test -- src/__tests__/inventory-view-mode.test.js
```
Expected: ALL tests PASS

```bash
npm test
```
Expected: no regressions

- [ ] **Step 5: Commit**

```bash
git add src/features/inventory/index.jsx
git commit -m "feat: useViewMode hook, readViewMode/saveViewMode, grid/list toggle button"
```

---

### Task 6: `InventoryIconCell` Component

**Files:**
- Modify: `src/ui/Inventory.jsx`

- [ ] **Step 1: Add `InventoryIconCell` after the `useAccordion` function**

```javascript
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
```

- [ ] **Step 2: Lint check**

```bash
npm run lint
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/ui/Inventory.jsx
git commit -m "feat: InventoryIconCell component (square icon + top-right count badge)"
```

---

### Task 7: `InventoryAccordion` Component

**Files:**
- Modify: `src/ui/Inventory.jsx`

- [ ] **Step 1: Add `InventoryAccordion` after `InventoryIconCell`**

```javascript
function InventoryAccordion({ entry, isOpen, arrowLeft, marketBuilt, dispatch, onClose, onClosed, style }) {
  const handleTransitionEnd = (e) => {
    if (e.propertyName === "max-height" && !isOpen) {
      onClosed?.();
    }
  };

  return (
    <div className="inv-accordion" style={style}>
      <div
        className="inv-accordion__arrow"
        style={arrowLeft != null ? { left: arrowLeft } : { left: "50%" }}
      />
      <div
        className={`inv-accordion__body${isOpen ? " is-open" : ""}`}
        onTransitionEnd={handleTransitionEnd}
      >
        <div className="relative">
          <button
            type="button"
            className="inv-accordion__close"
            onClick={onClose}
            aria-label="Close detail"
          >
            ×
          </button>
          <InventoryDetail entry={entry} marketBuilt={marketBuilt} dispatch={dispatch} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint check**

```bash
npm run lint
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/ui/Inventory.jsx
git commit -m "feat: InventoryAccordion component with slide animation and close button"
```

---

### Task 8: Wire `viewMode` into `InventoryGrid`

**Files:**
- Modify: `src/ui/Inventory.jsx` — the `InventoryGrid` function

- [ ] **Step 1: Update `InventoryGrid` signature to accept `viewMode`**

Replace:
```javascript
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
```
With:
```javascript
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
```

- [ ] **Step 2: Add accordion and ref state**

After the existing `const [selectedKey, setSelectedKey] = useState(null);` line, add:

```javascript
  const accordion = useAccordion();
  const cellRefs = useRef({});
  const containerRef = useRef(null);
  const [arrowLeft, setArrowLeft] = useState(null);

  useLayoutEffect(() => {
    if (!compact || !accordion.displayedKey) { setArrowLeft(null); return; }
    const cell = cellRefs.current[accordion.displayedKey];
    const container = containerRef.current;
    if (!cell || !container) { setArrowLeft(null); return; }
    const cellRect = cell.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setArrowLeft(cellRect.left + cellRect.width / 2 - containerRect.left);
  }, [accordion.displayedKey, compact]);
```

- [ ] **Step 3: Replace the browser/return block with the 4-way render matrix**

Replace everything from `const browser = noResults ? (` to the closing `);` of the component's return statement with:

```javascript
  const makeRef = (key) => (el) => {
    if (el) cellRefs.current[key] = el;
    else delete cellRefs.current[key];
  };

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
      for (const entry of entries) {
        const isSelected = entry.key === accordion.displayedKey;
        if (viewMode === "grid") {
          cells.push(
            <InventoryIconCell
              key={entry.key}
              entry={entry}
              selected={isSelected}
              onSelect={() => accordion.select(entry.key)}
              ref={makeRef(entry.key)}
            />
          );
        } else {
          cells.push(
            <InventoryBrowserItem
              key={entry.key}
              entry={entry}
              selected={isSelected}
              onSelect={() => accordion.select(entry.key)}
            />
          );
        }
        if (isSelected) {
          cells.push(
            <InventoryAccordion
              key="__accordion__"
              entry={entry}
              isOpen={accordion.isOpen}
              arrowLeft={viewMode === "grid" ? arrowLeft : null}
              marketBuilt={marketBuilt}
              dispatch={dispatch}
              onClose={accordion.close}
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
```

- [ ] **Step 4: Run lint**

```bash
npm run lint
```
Expected: no errors

- [ ] **Step 5: Run full test suite**

```bash
npm test
```
Expected: all passing

- [ ] **Step 6: Commit**

```bash
git add src/ui/Inventory.jsx
git commit -m "feat: wire viewMode in InventoryGrid — narrow accordion + wide grid/list"
```

---

### Task 9: Manual QA

**Goal:** Verify all four rendering combinations work correctly in the browser.

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Narrow list mode — accordion**

Open `http://localhost:5173/puzzleDrag2/#/inventory`, resize browser to < 720px width. Confirm:
- List rows render exactly as before
- Clicking a row opens accordion below it with slide-in animation
- Arrow points near the selected row (left-centered)
- Close (×) button collapses accordion with slide-out animation
- Clicking a different row collapses old, then opens new with slide-in
- Clicking the same row again collapses it

- [ ] **Step 3: Narrow grid mode — accordion**

Click the toggle button to switch to grid mode. Confirm:
- Icon cells render at ~84px square, count badge top-right
- Cells with count 0 are muted (lower opacity)
- Tapping a cell opens accordion below its row, arrow aligns to cell center horizontally
- Close button and item-switch animation work correctly

- [ ] **Step 4: Wide list mode — side panel**

Resize to > 720px. In list mode, confirm:
- Detail side pane is on the right and updates on click
- No accordion anywhere

- [ ] **Step 5: Wide grid mode — side panel**

Toggle to grid mode on wide viewport. Confirm:
- Icon cells fill the left pane with the auto-fill grid
- Detail pane on the right updates when clicking a cell
- No accordion

- [ ] **Step 6: Preference persistence**

Switch to grid, reload page → still in grid mode. Switch to list, reload → back to list mode.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: inventory grid/list toggle — QA verified"
```

---

## Self-Review

**Spec coverage:**
- Toggle button in filter bar — Task 5
- Default list mode, localStorage persistence — Task 5
- Grid cells ~84px, auto-fill, icon + count badge — Tasks 1, 6
- No label text in grid cells — `InventoryIconCell` renders icon only
- Selected cell green ring — `.inv-grid__cell.is-selected` in Task 1
- Muted (count=0) styling — `.inv-grid__cell.is-muted` in Task 1
- List mode unchanged — wide path reuses existing `InventoryBrowserItem` + `BrowserGrid`
- Landscape/wide: side panel always present — wide path uses `BrowserDetailLayout`
- Portrait/narrow: no side panel, inline accordion — Tasks 7, 8
- Accordion upward arrow aligned to cell center — `arrowLeft` from `useLayoutEffect` + `getBoundingClientRect`
- Accordion full detail pane contents — `InventoryDetail` reused as-is
- Accordion close (×) button top-right — Task 2 CSS + Task 7 JSX
- Accordion 200ms open / 150ms close animation — CSS `max-height` transitions in Task 2
- Switch items: close then open animation — `accordionReducer` `SELECT`→`TRANSITION_END`→`OPEN` sequence

**Placeholder scan:** None — all steps contain actual code.

**Type consistency:** `accordionReducer`/`accordionInitialState` exported from `Inventory.jsx` and imported in test file matches. `readViewMode`/`saveViewMode` exported from `index.jsx` and imported in test file matches. `viewMode` prop added to `InventoryGrid` signature and passed from `InventoryScreen` matches.
