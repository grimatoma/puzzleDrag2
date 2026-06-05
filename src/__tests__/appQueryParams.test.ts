import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  readAppQueryParams,
  isConceptTilesFlagEnabled,
  appendGlobalHashFlags,
} from "../appQueryParams.js";

function stubSessionStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  });
  return store;
}

function stubLocation(parts: { search?: string; hash?: string }) {
  vi.stubGlobal("window", {
    location: {
      search: parts.search ?? "",
      hash: parts.hash ?? "",
    },
  });
}

describe("readAppQueryParams", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads conceptTiles from the hash query (hash-router URLs)", () => {
    stubLocation({ hash: "#/board?conceptTiles=1" });
    expect(readAppQueryParams().get("conceptTiles")).toBe("1");
  });

  it("reads conceptTiles from location.search", () => {
    stubLocation({ search: "?conceptTiles=1", hash: "#/board" });
    expect(readAppQueryParams().get("conceptTiles")).toBe("1");
  });
});

describe("isConceptTilesFlagEnabled", () => {
  beforeEach(() => {
    stubSessionStorage();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("enables from hash query and persists for later navigations", () => {
    stubLocation({ hash: "#/board?conceptTiles=1" });
    expect(isConceptTilesFlagEnabled()).toBe(true);

    stubLocation({ hash: "#/town" });
    expect(isConceptTilesFlagEnabled()).toBe(true);
  });

  it("disables and clears persistence with conceptTiles=0", () => {
    const store = stubSessionStorage();
    store.set("hearth.conceptTiles", "1");
    stubLocation({ hash: "#/board?conceptTiles=0" });
    expect(isConceptTilesFlagEnabled()).toBe(false);

    stubLocation({ hash: "#/town" });
    expect(isConceptTilesFlagEnabled()).toBe(false);
  });
});

describe("appendGlobalHashFlags", () => {
  beforeEach(() => {
    stubSessionStorage();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("appends conceptTiles=1 when the flag is active", () => {
    stubLocation({ hash: "#/board?conceptTiles=1" });
    isConceptTilesFlagEnabled();
    expect(appendGlobalHashFlags([])).toEqual(["conceptTiles=1"]);
  });
});
