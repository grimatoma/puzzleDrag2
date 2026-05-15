// Beat templates — curated presets a writer can drop into the draft as
// a starting point. Each template emits a beat shape ready to splice
// into `story.newBeats`, including a sensible default trigger or
// choice fan-out so the result fires (or branches) immediately in-game.
//
// The templates intentionally use placeholder text the writer can grep
// for; nothing here is meant to ship without editing. Pure module.

export const BEAT_TEMPLATES = Object.freeze({
  triggered_oneline: {
    label: "Triggered narration",
    blurb: "A single narration line that fires when an NPC's bond crosses a threshold.",
    build: ({ npc = "wren", amount = 8 } = {}) => ({
      title: "New triggered beat",
      lines: [
        { speaker: null, text: "TODO: narration text" },
      ],
      trigger: { type: "bond_at_least", npc, amount },
    }),
  },
  speaker_then_choice: {
    label: "Speaker + 2 choices",
    blurb: "A character speaks, then the player picks one of two responses with opposite bond effects.",
    build: ({ npc = "wren" } = {}) => ({
      title: "New choice beat",
      lines: [
        { speaker: npc, text: "TODO: the line that opens the moment" },
        { speaker: null, text: "TODO: optional narrator beat" },
      ],
      choices: [
        { id: "kind",  label: "TODO: the kind option",  outcome: { bondDelta: { npc, amount: 2 } } },
        { id: "cool",  label: "TODO: the cool option",  outcome: { bondDelta: { npc, amount: -1 } } },
      ],
    }),
  },
  flag_gate: {
    title: "Flag gate",
    label: "Flag gate",
    blurb: "Triggered when a story flag flips on; sets a follow-up flag when complete.",
    build: ({ flag = "TODO_flag_name", complete = "TODO_completed_flag" } = {}) => ({
      title: "New flag-gated beat",
      lines: [{ speaker: null, text: "TODO: scene text" }],
      trigger: { type: "flag_set", flag },
      onComplete: { setFlag: complete },
    }),
  },
  three_way_split: {
    label: "Three-way split",
    blurb: "A fork into three terminal branches (kindest / pragmatic / cruellest).",
    build: ({ npc = "wren" } = {}) => ({
      title: "New three-way fork",
      lines: [{ speaker: npc, text: "TODO: the dilemma line" }],
      choices: [
        { id: "kind",  label: "TODO: kind response",  outcome: { bondDelta: { npc, amount: 3 } } },
        { id: "fair",  label: "TODO: pragmatic", outcome: { embers: 1 } },
        { id: "cruel", label: "TODO: cruel response", outcome: { bondDelta: { npc, amount: -2 }, gems: 1 } },
      ],
    }),
  },
  resource_threshold: {
    label: "Resource threshold",
    blurb: "Fires when the player has accumulated a given amount of a resource; rewards a flag.",
    build: ({ resource = "grass_hay", amount = 50 } = {}) => ({
      title: "New resource-triggered beat",
      lines: [{ speaker: null, text: "TODO: scene text" }],
      trigger: { type: "resource_total", key: resource, amount },
      onComplete: { setFlag: `TODO_${resource}_milestone` },
    }),
  },
  building_built: {
    label: "Building completion",
    blurb: "Fires when a specific building is built; congratulations beat.",
    build: ({ buildingId = "granary" } = {}) => ({
      title: "New building-built beat",
      lines: [
        { speaker: null, text: "TODO: opening narration" },
        { speaker: "wren", text: "TODO: an NPC commentary line" },
      ],
      trigger: { type: "building_built", id: buildingId },
    }),
  },
});

/** Build a beat from a template id, optionally with caller-supplied options. */
export function buildBeatFromTemplate(templateId, options = {}) {
  const t = BEAT_TEMPLATES[templateId];
  if (!t) return null;
  return t.build(options || {});
}

/** Friendly list of `[id, label, blurb]` for the picker UI. */
export function templateMenu() {
  return Object.entries(BEAT_TEMPLATES).map(([id, t]) => ({
    id, label: t.label, blurb: t.blurb,
  }));
}

export const BEAT_TEMPLATE_IDS = Object.keys(BEAT_TEMPLATES);
