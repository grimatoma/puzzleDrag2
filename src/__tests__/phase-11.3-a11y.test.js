// Phase 11.3 — Screen-reader announcements tests
import { describe, it, expect, beforeEach } from "vitest";
import { announce, flushAnnouncements, getQueue, formatChainAnnouncement, formatModalAnnouncement, formatQuestAnnouncement } from "../a11y.js";

describe("11.3 basic enqueue", () => {
  beforeEach(() => flushAnnouncements());

  it("polite queue has 1 after announce", () => {
    announce("hello");
    expect(getQueue().polite.length).toBe(1);
  });
  it("text matches", () => {
    announce("hello");
    expect(getQueue().polite[0].text).toBe("hello");
  });
});

describe("11.3 debounce coalescing", () => {
  beforeEach(() => flushAnnouncements());

  it("two within 200ms coalesce to 1", () => {
    announce("first");
    announce("second");
    expect(getQueue().polite.length).toBe(1);
  });
  it("latest wins", () => {
    announce("first");
    announce("second");
    expect(getQueue().polite[0].text).toBe("second");
  });
});

describe("11.3 assertive bypasses debounce", () => {
  beforeEach(() => flushAnnouncements());

  it("assertive lives in its own queue", () => {
    announce("polite msg", "polite");
    announce("URGENT", "assertive");
    const q = getQueue();
    expect(q.polite.length).toBe(1);
    expect(q.urgent.length).toBe(1);
  });
  it("urgent preserved", () => {
    announce("URGENT", "assertive");
    expect(getQueue().urgent[0].text).toBe("URGENT");
  });
});

describe("11.3 formatChainAnnouncement", () => {
  it("no-upgrade chain string", () => {
    expect(formatChainAnnouncement({ key: "hay", collected: 6, upgrades: [] }))
      .toBe("Collected 6 hay.");
  });
  it("chain with upgrade string", () => {
    expect(formatChainAnnouncement({
      key: "hay",
      collected: 6,
      upgrades: [{ key: "wheat", count: 1 }],
    })).toBe("Collected 6 hay; 1 wheat upgrade spawned at the endpoint.");
  });
});

describe("11.3 formatModalAnnouncement", () => {
  it("starts with beat title", () => {
    const beat = { id: "act1_light_hearth", title: "First Light", body: "Wren: 'The Hearth is alive again.'" };
    expect(formatModalAnnouncement(beat)).toMatch(/^Story beat: First Light/);
  });
  it("includes speaker", () => {
    const beat = { id: "act1_light_hearth", title: "First Light", body: "Wren: 'The Hearth is alive again.'" };
    expect(formatModalAnnouncement(beat)).toContain("Wren says");
  });
  it("includes body text", () => {
    const beat = { id: "act1_light_hearth", title: "First Light", body: "Wren: 'The Hearth is alive again.'" };
    expect(formatModalAnnouncement(beat)).toContain("The Hearth is alive again");
  });
});

describe("11.3 formatQuestAnnouncement", () => {
  it("quest claim string", () => {
    const result = formatQuestAnnouncement({ label: "Collect 30 hay", reward: { coins: 50, almanacXp: 20 } });
    expect(result).toBe("Quest claimed: Collect 30 hay. +50 coins, +20 XP.");
  });
});
