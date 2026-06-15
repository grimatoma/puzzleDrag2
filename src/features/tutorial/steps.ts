// Single source of truth for the onboarding wizard.
//
// Both the reducer slice (slice.ts) and the overlay component (index.tsx)
// import this list. Keeping the data here — free of React / DOM imports — lets
// the pure reducer reason about each step (which step blocks the screen, which
// action auto-advances it) without pulling UI into the state bundle.
//
// The wizard walks a brand-new player through the whole core loop:
//   open the game → learn the puzzle → build a building → craft a tool →
//   complete a quest. Each step highlights a real part of the UI and explains
//   what it does. Action-gated steps auto-advance the moment the player
//   performs the real action (collect a chain, build, craft, deliver an order),
//   but every step also offers a manual "Next" so a player who has not yet
//   earned the resources to build/craft is never stuck.

export type TourView = "town" | "board" | "crafting" | "inventory";

export interface WizardStep {
  /** Stable id (used in tests / analytics). */
  id: string;
  /** NPC who narrates this step (keys into NPCS). */
  npc: string;
  title: string;
  body: string;
  /** Label on the primary advance button. */
  cta: string;
  /** View the wizard navigates to when this step becomes active. */
  view?: TourView;
  /** CSS selector of the UI element to spotlight. Omit for a centered card. */
  target?: string;
  /** Preferred side of the target to float the coach card. */
  placement?: "top" | "bottom" | "center";
  /** Blocking steps dim the whole screen and show a centered modal card. */
  blocking?: boolean;
  /** Action type that auto-advances this step when it fires. */
  advanceOn?: string;
  /** Small pulsing call-to-action shown on spotlight steps. */
  hint?: string;
}

export const STEPS: WizardStep[] = [
  {
    id: "welcome",
    npc: "wren",
    view: "town",
    blocking: true,
    placement: "center",
    title: "Welcome to Hearthwood Vale",
    body: "You're the new caretaker. I'll show you the ropes — the puzzle board, your town, the workshop, and the folk who need your help.",
    cta: "Let's begin",
  },
  {
    id: "puzzle",
    npc: "wren",
    view: "board",
    target: '[data-tour="board"]',
    placement: "top",
    title: "Harvest with chains",
    body: "Press and drag across 3 or more matching tiles, then lift your finger to harvest them.",
    cta: "Drag a chain",
    hint: "👆 Drag across 3+ matching tiles",
    advanceOn: "CHAIN_COLLECTED",
  },
  {
    id: "upgrades",
    npc: "mira",
    view: "board",
    target: '[data-tour="board"]',
    placement: "top",
    title: "Chains upgrade ★",
    body: "Every 3rd tile in a chain upgrades to the next tier. Long chains snowball — aim for chains of 6 or more.",
    cta: "Got it",
  },
  {
    id: "turns",
    npc: "mira",
    view: "board",
    target: '[data-testid="turns-left"]',
    placement: "bottom",
    title: "Seasons & turns",
    body: "Each run flows through the seasons. You have a limited number of turns — make every chain count before winter closes.",
    cta: "Next",
  },
  {
    id: "coins",
    npc: "bram",
    view: "town",
    target: '[data-testid="coins"]',
    placement: "bottom",
    title: "Your treasury",
    body: "Harvests sell for coins. Spend them to raise buildings and craft tools for your settlement.",
    cta: "Next",
  },
  {
    id: "build",
    npc: "bram",
    view: "town",
    target: '[data-tour="nav-town"]',
    placement: "top",
    title: "Build your first building",
    body: "This is your Town. Tap an empty plot, choose a building like the Mill, and build it. Buildings unlock recipes and lasting perks.",
    cta: "Got it",
    hint: "🏠 Tap a plot to build",
    advanceOn: "BUILD",
  },
  {
    id: "craft",
    npc: "bram",
    view: "crafting",
    target: '[data-tour="nav-crafting"]',
    placement: "top",
    title: "Craft a tool",
    body: "Once you've raised a Workshop, craft tools here — like the Rake, which clears a cluster of tiles on the board. Pick a recipe and craft it.",
    cta: "Got it",
    hint: "🔨 Craft a tool",
    advanceOn: "CRAFTING/CRAFT_RECIPE",
  },
  {
    id: "quest",
    npc: "mira",
    view: "inventory",
    target: '[data-tour="nav-inventory"]',
    placement: "top",
    title: "Complete a quest",
    body: "Townsfolk post orders for goods you can gather. When you have what they need, tap their order to deliver it for coins and goodwill.",
    cta: "Got it",
    hint: "📜 Deliver an order",
    advanceOn: "TURN_IN_ORDER",
  },
  {
    id: "finish",
    npc: "wren",
    view: "town",
    blocking: true,
    placement: "center",
    title: "You're ready, caretaker",
    body: "Restore Hearthwood Vale season by season. Harvest, build, craft, and care for the townsfolk. Every chain counts.",
    cta: "Start playing",
  },
];

export const TOTAL_STEPS = STEPS.length;

/** Which `state.modal` value a given step needs (blocking steps own the modal). */
export function modalForStep(i: number): "tutorial" | null {
  return STEPS[i]?.blocking ? "tutorial" : null;
}
