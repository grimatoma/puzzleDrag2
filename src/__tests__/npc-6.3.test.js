import { describe, it, expect, beforeEach } from "vitest";
import { DIALOG_POOLS, pickDialog } from "../features/npcs/dialog.js";
import { NPC_IDS, BOND_BANDS } from "../features/npcs/data.js";

beforeEach(() => global.localStorage.clear());

const SEASONS = ["spring", "summer", "autumn", "winter"];

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("6.3 — DIALOG_POOLS coverage (80 cells)", () => {
  it("every (npc, season, band) has ≥1 phrase", () => {
    let cells = 0;
    for (const id of NPC_IDS) {
      for (const s of SEASONS) {
        for (const band of BOND_BANDS) {
          const arr = DIALOG_POOLS?.[id]?.[s]?.[band.name];
          expect(
            Array.isArray(arr) && arr.length >= 1,
            `${id}.${s}.${band.name} has ≥1 phrase`
          ).toBe(true);
          expect(
            arr.every((p) => typeof p === "string" && p.length > 0),
            `${id}.${s}.${band.name} phrases are non-empty strings`
          ).toBe(true);
          cells++;
        }
      }
    }
    expect(cells).toBe(80);
  });
});

describe("6.3 — phrase speaker format", () => {
  it("Mira phrases start with 'Mira:'", () => {
    const sample = DIALOG_POOLS.mira.summer.Warm[0];
    expect(sample.startsWith("Mira:")).toBe(true);
  });

  it("Liss phrases use display name 'Sister Liss:'", () => {
    expect(DIALOG_POOLS.liss.winter.Sour[0].startsWith("Sister Liss:")).toBe(true);
  });
});

describe("6.3 — pickDialog determinism", () => {
  it("same rng seed → same phrase", () => {
    const rngA = mulberry32(1234);
    const rngB = mulberry32(1234);
    const a = pickDialog("mira", "summer", 5, rngA);
    const b = pickDialog("mira", "summer", 5, rngB);
    expect(a).toBe(b);
  });
});

describe("6.3 — bond band routing", () => {
  it("bond 5 hits Warm pool", () => {
    const rng = mulberry32(99);
    const phrase = pickDialog("mira", "summer", 5, rng);
    expect(DIALOG_POOLS.mira.summer.Warm.includes(phrase)).toBe(true);
  });

  it("bond 8 hits Liked pool, not Warm pool", () => {
    const rng = mulberry32(99);
    const phrase = pickDialog("mira", "summer", 8, rng);
    expect(DIALOG_POOLS.mira.summer.Liked.includes(phrase)).toBe(true);
  });
});

describe("6.3 — fallback on missing cell", () => {
  it("pickDialog returns a non-empty string and does not throw for missing cell", () => {
    // Force a missing cell by calling with an invalid npc key
    let result;
    expect(() => {
      result = pickDialog("nonexistent_npc", "summer", 5, mulberry32(1));
    }).not.toThrow();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
