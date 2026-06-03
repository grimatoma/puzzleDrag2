/**
 * noQuestionMark.test.ts — Phase 2 invariant: no entry card in ANY concept
 * should render a "?" placeholder because it has no visual.
 *
 * An entry is considered "visually resolved" when it has at least one of:
 *  1. An `iconKey` that is a non-empty string (canvas icon or design icon).
 *  2. An `emoji` property (a non-empty string of emoji to display directly).
 *  3. A `name` or `key` whose first character provides a fallback initial
 *     (the EntryGrid renders this as a muted circle, not a "?").
 *
 * For Daily Rewards specifically:
 *  - Every day entry must have an `iconKey`.
 *  - Every day entry must generate at least one reward fact via infoboxFacts.
 *
 * This test does NOT render React — it only checks the data layer.
 */

import { describe, it, expect } from "vitest";
import { CONCEPTS } from "./concepts.js";
import { infoboxFacts } from "./infoboxFacts.js";
import { getEntity } from "./conceptEntities.js";

// ─── "No question-mark" invariant for every concept ──────────────────────────

describe("no-question-mark invariant — all concepts", () => {
  it("every entry in every concept has a visual resolution (iconKey, emoji, or name initial)", () => {
    const violations: string[] = [];

    for (const concept of CONCEPTS) {
      const entries = concept.getEntries() as Array<{
        key: string;
        name?: string;
        iconKey?: string;
        emoji?: string;
      }>;

      for (const entry of entries) {
        const hasIconKey = typeof entry.iconKey === "string" && entry.iconKey.length > 0;
        const hasEmoji = typeof entry.emoji === "string" && entry.emoji.length > 0;
        // name or key always provides a fallback initial in EntryGrid
        const hasNameFallback =
          (typeof entry.name === "string" && entry.name.trim().length > 0) ||
          (typeof entry.key === "string" && entry.key.trim().length > 0);

        if (!hasIconKey && !hasEmoji && !hasNameFallback) {
          violations.push(`${concept.id}:${entry.key} — no visual resolution`);
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `${violations.length} entry/entries have no visual resolution:\n${violations.join("\n")}`,
      );
    }
  });
});

// ─── Daily Rewards — icon + reward fact requirements ─────────────────────────

describe("no-question-mark invariant — dailyRewards", () => {
  const concept = CONCEPTS.find((c) => c.id === "dailyRewards")!;

  it("daily rewards concept exists in CONCEPTS", () => {
    expect(concept).toBeDefined();
  });

  it("every day entry has a non-empty iconKey", () => {
    const entries = concept.getEntries() as Array<{
      key: string;
      name?: string;
      iconKey?: string;
    }>;
    const missing = entries.filter(
      (e) => typeof e.iconKey !== "string" || e.iconKey.length === 0,
    );
    expect(missing).toHaveLength(0);
  });

  it("every day entry resolves to a live entity with at least one reward fact", () => {
    const entries = concept.getEntries() as Array<{ key: string; name?: string }>;
    const noFacts: string[] = [];
    for (const entry of entries) {
      const entity = getEntity("dailyRewards", entry.key);
      if (!entity) {
        noFacts.push(`Day ${entry.key}: entity not found`);
        continue;
      }
      const facts = infoboxFacts("dailyRewards", entry.key, entity);
      if (facts.length === 0) {
        noFacts.push(`Day ${entry.key}: no reward facts`);
      }
    }
    if (noFacts.length > 0) {
      throw new Error(`Days with missing facts:\n${noFacts.join("\n")}`);
    }
  });
});

// ─── Keepers — iconKey presence ───────────────────────────────────────────────

describe("no-question-mark invariant — keepers", () => {
  const concept = CONCEPTS.find((c) => c.id === "keepers")!;

  it("keepers concept exists in CONCEPTS", () => {
    expect(concept).toBeDefined();
  });

  it("every keeper entry has an iconKey or emoji", () => {
    const entries = concept.getEntries() as Array<{
      key: string;
      iconKey?: string;
      emoji?: string;
    }>;
    const violations = entries.filter(
      (e) =>
        (typeof e.iconKey !== "string" || e.iconKey.length === 0) &&
        (typeof e.emoji !== "string" || e.emoji.length === 0),
    );
    expect(violations).toHaveLength(0);
  });
});

// ─── Boons — iconKey presence ─────────────────────────────────────────────────

describe("no-question-mark invariant — boons", () => {
  const concept = CONCEPTS.find((c) => c.id === "boons")!;

  it("boons concept exists in CONCEPTS", () => {
    expect(concept).toBeDefined();
  });

  it("every boon entry has an iconKey", () => {
    const entries = concept.getEntries() as Array<{
      key: string;
      iconKey?: string;
    }>;
    const missing = entries.filter(
      (e) => typeof e.iconKey !== "string" || e.iconKey.length === 0,
    );
    expect(missing).toHaveLength(0);
  });
});
