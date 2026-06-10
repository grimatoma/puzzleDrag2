import { describe, it, expect } from "vitest";
import { createToolSoundTracker } from "../audio/toolSounds.js";

const snap = (toolPending: string | null, tools: Record<string, number>, runeStash?: number) => ({ toolPending, tools, runeStash });

describe("createToolSoundTracker", () => {
  it("reports 'armed' when a tap-target tool arms (no charge spent yet)", () => {
    const step = createToolSoundTracker();
    expect(step(snap(null, { bomb: 2 }), snap("bomb", { bomb: 2 }))).toBe("armed");
  });

  it("reports 'fired' when a tap-target tool fires (charge spent on clear)", () => {
    const step = createToolSoundTracker();
    step(snap(null, { bomb: 2 }), snap("bomb", { bomb: 2 }));
    expect(step(snap("bomb", { bomb: 2 }), snap(null, { bomb: 1 }))).toBe("fired");
  });

  it("stays silent when a tap-target arm is cancelled (no count change)", () => {
    const step = createToolSoundTracker();
    step(snap(null, { bomb: 2 }), snap("bomb", { bomb: 2 }));
    expect(step(snap("bomb", { bomb: 2 }), snap(null, { bomb: 2 }))).toBeNull();
  });

  it("reports 'fired' for a brief-arm instant tool (charge spent at arm, none on clear)", () => {
    const step = createToolSoundTracker();
    expect(step(snap(null, { shuffle: 3 }), snap("shuffle", { shuffle: 2 }))).toBe("armed");
    expect(step(snap("shuffle", { shuffle: 2 }), snap(null, { shuffle: 2 }))).toBe("fired");
  });

  it("stays silent when a brief-arm instant tool is cancelled (charge refunded)", () => {
    const step = createToolSoundTracker();
    step(snap(null, { shuffle: 3 }), snap("shuffle", { shuffle: 2 }));
    expect(step(snap("shuffle", { shuffle: 2 }), snap(null, { shuffle: 3 }))).toBeNull();
  });

  it("reports 'armed' again when arming transfers to a different tool", () => {
    const step = createToolSoundTracker();
    step(snap(null, { bomb: 2, rake: 1 }), snap("bomb", { bomb: 2, rake: 1 }));
    expect(step(snap("bomb", { bomb: 2, rake: 1 }), snap("rake", { bomb: 2, rake: 1 }))).toBe("armed");
  });

  it("returns null for no-op transitions", () => {
    const step = createToolSoundTracker();
    expect(step(snap(null, {}), snap(null, {}))).toBeNull();
    step(snap(null, { bomb: 1 }), snap("bomb", { bomb: 1 }));
    expect(step(snap("bomb", { bomb: 1 }), snap("bomb", { bomb: 1 }))).toBeNull();
  });

  it("reports 'fired' for the rune wildcard (charge lives in runeStash)", () => {
    const step = createToolSoundTracker();
    expect(step({ toolPending: null, tools: {}, runeStash: 2 }, { toolPending: "rune_wildcard", tools: {}, runeStash: 1 })).toBe("armed");
    expect(step({ toolPending: "rune_wildcard", tools: {}, runeStash: 1 }, { toolPending: null, tools: {}, runeStash: 1 })).toBe("fired");
  });

  it("stays silent when the rune wildcard is cancelled (runeStash refunded)", () => {
    const step = createToolSoundTracker();
    step({ toolPending: null, tools: {}, runeStash: 2 }, { toolPending: "rune_wildcard", tools: {}, runeStash: 1 });
    expect(step({ toolPending: "rune_wildcard", tools: {}, runeStash: 1 }, { toolPending: null, tools: {}, runeStash: 2 })).toBeNull();
  });

  it("reports 'fired' when a no-arm instant tool's count drops (e.g. axe / clear_category)", () => {
    const step = createToolSoundTracker();
    expect(step(snap(null, { axe: 3 }), snap(null, { axe: 2 }))).toBe("fired");
  });

  it("stays silent when a tool count increases without any arm transition (acquisition)", () => {
    const step = createToolSoundTracker();
    expect(step(snap(null, { axe: 2 }), snap(null, { axe: 3 }))).toBeNull();
  });
});
