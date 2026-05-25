import { describe, it, expect, beforeEach } from "vitest";
import {
  SNAPSHOTS_KEY,
  normaliseSnapshotName,
  readSnapshots,
  listSnapshots,
  saveSnapshot,
  loadSnapshot,
  deleteSnapshot,
  renameSnapshot,
} from "../balanceManager/snapshots.js";

function makeFakeStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => { data.delete(k); },
    _data: data,
  };
}

let storage;
let clock;

beforeEach(() => {
  storage = makeFakeStorage();
  clock = 1_000_000;
});
const now = () => {
  clock += 1000;
  return new Date(clock).toISOString();
};

describe("normaliseSnapshotName", () => {
  it("rejects empty / whitespace-only names", () => {
    expect(normaliseSnapshotName("").ok).toBe(false);
    expect(normaliseSnapshotName("   ").ok).toBe(false);
  });
  it("trims surrounding whitespace", () => {
    expect(normaliseSnapshotName("  hard mode  ")).toEqual({ ok: true, name: "hard mode", message: "" });
  });
  it("rejects names longer than 60 characters", () => {
    const out = normaliseSnapshotName("x".repeat(80));
    expect(out.ok).toBe(false);
    expect(out.name).toHaveLength(60);
  });
});

describe("saveSnapshot / loadSnapshot / readSnapshots", () => {
  it("persists a snapshot under the trimmed name", () => {
    const result = saveSnapshot("  easy  ", { version: 1, tuning: { ringTurns: 14 } }, storage, now);
    expect(result).toEqual({ ok: true, name: "easy", message: "" });
    const map = readSnapshots(storage);
    expect(map.easy.draft.tuning.ringTurns).toBe(14);
    expect(typeof map.easy.savedAt).toBe("string");
    expect(map.easy.version).toBe(1);
  });

  it("loadSnapshot returns a deep copy (mutating it doesn't change stored data)", () => {
    saveSnapshot("preset", { tuning: { ringTurns: 10 } }, storage, now);
    const loaded = loadSnapshot("preset", storage);
    loaded.tuning.ringTurns = 999;
    const reread = loadSnapshot("preset", storage);
    expect(reread.tuning.ringTurns).toBe(10);
  });

  it("loadSnapshot returns null for unknown names", () => {
    expect(loadSnapshot("nope", storage)).toBeNull();
  });

  it("saveSnapshot rejects null drafts", () => {
    const out = saveSnapshot("x", null, storage, now);
    expect(out.ok).toBe(false);
    expect(out.message).toMatch(/empty/i);
  });

  it("saveSnapshot rejects non-serialisable drafts", () => {
    const cycle = {}; cycle.self = cycle;
    const out = saveSnapshot("ouroboros", cycle, storage, now);
    expect(out.ok).toBe(false);
    expect(out.message).toMatch(/serialised|JSON/i);
  });

  it("readSnapshots tolerates malformed JSON in storage", () => {
    storage.setItem(SNAPSHOTS_KEY, "not json {{{");
    expect(readSnapshots(storage)).toEqual({});
  });

  it("readSnapshots drops entries with no draft object", () => {
    storage.setItem(SNAPSHOTS_KEY, JSON.stringify({
      good: { savedAt: "x", draft: { v: 1 } },
      bad: { savedAt: "y" },          // missing draft
      bogus: "string-not-object",
    }));
    const map = readSnapshots(storage);
    expect(Object.keys(map)).toEqual(["good"]);
  });
});

describe("listSnapshots", () => {
  it("returns snapshots sorted newest first by savedAt", () => {
    saveSnapshot("first", { v: 1 }, storage, now);
    saveSnapshot("second", { v: 2 }, storage, now);
    saveSnapshot("third", { v: 3 }, storage, now);
    const list = listSnapshots(storage);
    expect(list.map((s) => s.name)).toEqual(["third", "second", "first"]);
  });

  it("returns an empty array when no snapshots exist", () => {
    expect(listSnapshots(storage)).toEqual([]);
  });
});

describe("deleteSnapshot", () => {
  it("removes the named snapshot and reports success", () => {
    saveSnapshot("doomed", { v: 1 }, storage, now);
    expect(deleteSnapshot("doomed", storage)).toBe(true);
    expect(loadSnapshot("doomed", storage)).toBeNull();
  });

  it("returns false when no snapshot with that name exists", () => {
    expect(deleteSnapshot("nope", storage)).toBe(false);
  });

  it("clears the localStorage key entirely when the last snapshot is removed", () => {
    saveSnapshot("only", { v: 1 }, storage, now);
    deleteSnapshot("only", storage);
    expect(storage.getItem(SNAPSHOTS_KEY)).toBeNull();
  });
});

describe("renameSnapshot", () => {
  beforeEach(() => {
    saveSnapshot("a", { v: 1 }, storage, now);
    saveSnapshot("b", { v: 2 }, storage, now);
  });
  it("moves the snapshot to a new name and preserves the payload", () => {
    const out = renameSnapshot("a", "alpha", storage);
    expect(out).toEqual({ ok: true, name: "alpha", message: "" });
    expect(loadSnapshot("a", storage)).toBeNull();
    expect(loadSnapshot("alpha", storage).v).toBe(1);
  });
  it("is a no-op when renaming to the same name", () => {
    expect(renameSnapshot("a", "a", storage).ok).toBe(true);
    expect(loadSnapshot("a", storage).v).toBe(1);
  });
  it("rejects renames that would collide with an existing snapshot", () => {
    const out = renameSnapshot("a", "b", storage);
    expect(out.ok).toBe(false);
    expect(out.message).toMatch(/already exists/i);
  });
  it("rejects renames when the source snapshot is missing", () => {
    const out = renameSnapshot("missing", "any", storage);
    expect(out.ok).toBe(false);
    expect(out.message).toMatch(/does not exist/i);
  });
});
