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

  it("SELECT_IN_PLACE switches to a new key instantly, stays open", () => {
    const open = { displayedKey: "grain", isOpen: true, pendingKey: null };
    const s = accordionReducer(open, { type: "SELECT_IN_PLACE", key: "hay" });
    expect(s).toEqual({ displayedKey: "hay", isOpen: true, pendingKey: null });
  });

  it("SELECT_IN_PLACE on same key closes the accordion", () => {
    const open = { displayedKey: "grain", isOpen: true, pendingKey: null };
    const s = accordionReducer(open, { type: "SELECT_IN_PLACE", key: "grain" });
    expect(s).toEqual({ displayedKey: "grain", isOpen: false, pendingKey: null });
  });

  it("SELECT_IN_PLACE from closed state opens instantly", () => {
    const closed = { displayedKey: null, isOpen: false, pendingKey: null };
    const s = accordionReducer(closed, { type: "SELECT_IN_PLACE", key: "hay" });
    expect(s).toEqual({ displayedKey: "hay", isOpen: true, pendingKey: null });
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
