export interface DiffOptions {
  maxDiffPixelRatio: number;
  threshold: number;
}

/** One scripted interaction the visual harness performs on the loaded scene. */
export type VisualAction =
  | { type: "clickRole"; role: string; name?: string; namePattern?: RegExp | string }
  | { type: "clickRoleLast"; role: string; name?: string }
  | { type: "clickText"; text: string }
  | { type: "hoverText"; text: string }
  | { type: "fillPlaceholder"; placeholder: string; value: string }
  | { type: "api"; method: string; args?: Record<string, unknown> };

/** A row in the visual-regression matrix. */
export interface VisualScenario {
  id: string;
  state?: string;
  hash?: string;
  view?: string;
  viewParams?: Record<string, unknown>;
  modal?: string | null;
  actions?: VisualAction[];
  diff?: DiffOptions;
  skipProjects?: string[];
  /**
   * Per-scenario override of the harness-wide `__HEARTH_DISABLE_DIALOGS__ = true`. Set to `true`
   * for scenarios whose *payload is a dialog* (story beats, toast bubbles) — otherwise the gated
   * modal (`Modals.tsx` story/season/toast) renders nothing and the golden captures an empty town.
   */
  enableDialogs?: boolean;
}

/** Result of decorating a scenario with derived expectation strings. */
export interface AnnotatedVisualScenario extends VisualScenario {
  expectation: string;
  reviewChecklist: string[];
}

const canvasDiff: DiffOptions = { maxDiffPixelRatio: 0.05, threshold: 0.28 };
const domDiff: DiffOptions = { maxDiffPixelRatio: 0.025, threshold: 0.22 };

const click = (name: string): VisualAction => ({ type: "clickRole", role: "button", name });
const clickLast = (name: string): VisualAction => ({ type: "clickRoleLast", role: "button", name });
const clickText = (text: string): VisualAction => ({ type: "clickText", text });
const clickPattern = (pattern: RegExp | string): VisualAction => ({ type: "clickRole", role: "button", namePattern: pattern });
const hoverText = (text: string): VisualAction => ({ type: "hoverText", text });
const api = (method: string, args?: Record<string, unknown>): VisualAction => ({ type: "api", method, args });
// Enter a town board (farm/mine/fish). The board-entry tiles are Phaser canvas
// objects with no DOM affordance, so we drive the real handler via the bridge.
const enterBoard = (kind: string): VisualAction => api("enterBoard", { kind });

const tileRoutes = [
  ["tiles-farm-grass", "#/tiles/farm/grass"],
  ["tiles-mining-stone", "#/tiles/mining/mine_stone"],
  ["tiles-water-fish", "#/tiles/water/fish"],
].map(([id, hash]) => ({ id, state: "rich", hash, diff: domDiff }));

const BASE_VISUAL_SCENARIOS: VisualScenario[] = [
  { id: "shell-town-fresh", state: "fresh", hash: "#/town", diff: domDiff },
  { id: "shell-menu-main", state: "fresh", hash: "#/town", actions: [click("Menu")], diff: domDiff },
  { id: "shell-menu-settings", state: "fresh", hash: "#/town", actions: [click("Menu"), clickText("Settings")], diff: domDiff },
  { id: "shell-debug-modal", state: "rich", hash: "#/town", actions: [click("Debug tools")], diff: domDiff },
  { id: "shell-leave-board-confirm", state: "boardFarm", hash: "#/board", actions: [click("Leave board")], diff: domDiff },
  { id: "shell-toast-bubble", state: "bubble", hash: "#/town", diff: domDiff, enableDialogs: true },

  { id: "town-home-fresh", state: "fresh", hash: "#/town", diff: domDiff },
  { id: "town-home-built-out", state: "rich", hash: "#/town", diff: domDiff },
  { id: "town-building-tooltip", state: "rich", hash: "#/town", actions: [hoverText("Workshop")], diff: domDiff },
  { id: "town-build-picker-ready", state: "buildReady", hash: "#/town", actions: [click("Build")], diff: domDiff },
  { id: "town-build-picker-locked", state: "lowResource", hash: "#/town", actions: [click("Build"), clickText("Magic Portal")], diff: domDiff },
  { id: "town-placement-mode", state: "buildReady", hash: "#/town", actions: [click("Build"), clickText("Mill"), clickLast("Build")], diff: domDiff },
  { id: "town-unfounded-blocked", state: "unfoundedBlocked", hash: "#/town", diff: domDiff },
  { id: "town-found-biome-picker", state: "unfoundedReady", hash: "#/town", actions: [clickPattern("Found this settlement")], diff: domDiff },
  { id: "town-mine-settlement", state: "mineTown", hash: "#/town", diff: domDiff },
  { id: "town-harbor-settlement", state: "harborTown", hash: "#/town", diff: domDiff },

  { id: "start-farming-default", state: "fresh", hash: "#/town", actions: [enterBoard("farm")], diff: domDiff },
  { id: "start-farming-tile-chooser", state: "rich", hash: "#/town", actions: [enterBoard("farm"), clickPattern("Grass selected")], diff: domDiff },
  { id: "entry-mine-locked", state: "mineLocked", hash: "#/town", diff: domDiff },
  { id: "entry-mine-provision-empty", state: "mineTownNoFood", hash: "#/town", actions: [enterBoard("mine")], diff: domDiff },

  { id: "board-farm-idle", state: "boardFarm", hash: "#/board", diff: canvasDiff },
  { id: "board-anim-demo", state: "boardFarm", hash: "#/board", diff: canvasDiff, skipProjects: ["iphone-landscape", "iphone-portrait"] },
  { id: "board-farm-chain-7", state: "boardFarm", hash: "#/board", actions: [api("holdChain", { key: "tile_grass_grass", length: 7 })], diff: canvasDiff },
  { id: "board-farm-chain-2-short", state: "boardFarm", hash: "#/board", actions: [api("holdChain", { key: "tile_grass_grass", length: 2 })], diff: canvasDiff },
  { id: "board-farm-fire-rats", state: "boardFarmHazards", hash: "#/board", diff: canvasDiff },
  { id: "board-farm-tool-bomb", state: "boardFarmBomb", hash: "#/board", diff: canvasDiff },
  { id: "board-farm-tool-sickle", state: "boardFarmSickle", hash: "#/board", diff: canvasDiff },
  { id: "board-farm-tool-rake", state: "boardFarmRake", hash: "#/board", diff: canvasDiff },
  { id: "board-farm-fertilizer-active", state: "boardFarmFertilizer", hash: "#/board", diff: canvasDiff },
  { id: "board-mine-idle", state: "boardMine", hash: "#/board", diff: canvasDiff },
  { id: "board-mine-hazards", state: "boardMineHazards", hash: "#/board", diff: canvasDiff },
  { id: "board-fish-idle-high-tide", state: "boardFish", hash: "#/board", diff: canvasDiff },
  { id: "board-fish-pearl-low-tide", state: "boardFishPearl", hash: "#/board", diff: canvasDiff },
  { id: "board-boss-minimized", state: "boardBossMinimized", hash: "#/board", diff: canvasDiff },
  { id: "board-boss-active", state: "boardFarmBoss", hash: "#/board", diff: canvasDiff },
  { id: "board-boss-weather", state: "boardBossWeather", hash: "#/board", diff: canvasDiff },

  // Season-indicator scenarios — desktop-only for the initial PR (HUD widget,
  // not laid out for mobile yet). Mobile goldens can be captured later via
  // `npm run test:visual:mobile:update` after removing `skipProjects`.
  { id: "board-season-spring", state: "boardSeasonSpring", hash: "#/board", diff: canvasDiff, skipProjects: ["iphone-landscape", "iphone-portrait"] },
  { id: "board-season-summer", state: "boardSeasonSummer", hash: "#/board", diff: canvasDiff, skipProjects: ["iphone-landscape", "iphone-portrait"] },
  { id: "board-season-autumn", state: "boardSeasonAutumn", hash: "#/board", diff: canvasDiff, skipProjects: ["iphone-landscape", "iphone-portrait"] },
  { id: "board-season-winter", state: "boardSeasonWinter", hash: "#/board", diff: canvasDiff, skipProjects: ["iphone-landscape", "iphone-portrait"] },

  { id: "inventory-grid-all", state: "rich", hash: "#/inventory", diff: domDiff },
  { id: "inventory-list-mode", state: "rich", hash: "#/inventory", diff: domDiff },
  { id: "inventory-search-empty", state: "rich", hash: "#/inventory", actions: [{ type: "fillPlaceholder", placeholder: "Search resources...", value: "zzzz" }], diff: domDiff },
  { id: "inventory-mid-progress", state: "inventoryMidProgress", hash: "#/inventory", diff: domDiff },
  { id: "inventory-full-with-progress", state: "inventoryFullWithProgress", hash: "#/inventory", diff: domDiff },
  { id: "orders-mixed", state: "rich", hash: "#/orders", diff: domDiff },
  { id: "quests-daily-mixed", state: "rich", hash: "#/quests/daily", diff: domDiff },
  { id: "quests-almanac-mixed", state: "rich", hash: "#/quests/almanac", diff: domDiff },
  { id: "achievements-trophies-mixed", state: "rich", hash: "#/achievements/trophies", diff: domDiff },
  { id: "achievements-collection-mixed", state: "rich", hash: "#/achievements/collection", diff: domDiff },

  { id: "crafting-locked-station", state: "fresh", hash: "#/crafting/bakery", diff: domDiff },
  { id: "crafting-bakery", state: "rich", hash: "#/crafting/bakery", diff: domDiff },

  ...tileRoutes,
  { id: "tiles-hazards", state: "rich", hash: "#/tiles/hazards", diff: domDiff },
  { id: "tiles-activate-grass-spiky", state: "tileActivate", hash: "#/tiles/farm/grass", actions: [clickText("Spiky Grass"), clickText("Activate")], diff: domDiff },
  { id: "tiles-buy-clover", state: "tileBuy", hash: "#/tiles/farm/flowers", actions: [clickText("Clover")], diff: domDiff },
  { id: "tiles-research-progress", state: "tileResearch", hash: "#/tiles/farm/grass", actions: [clickText("Spiky Grass")], diff: domDiff },
  { id: "tiles-free-moves-chip", state: "tileFreeMoves", hash: "#/tiles/farm/grass", diff: domDiff },

  { id: "map-empty-panel", state: "rich", hash: "#/cartography", diff: canvasDiff },
  { id: "map-current-home", state: "rich", hash: "#/cartography/home", diff: canvasDiff },
  { id: "map-ready-road", state: "mapReady", hash: "#/cartography/meadow", diff: canvasDiff },
  { id: "map-founded-complete", state: "mapComplete", hash: "#/cartography/meadow", diff: canvasDiff },
  { id: "map-founder-picker", state: "mapFounder", hash: "#/cartography/meadow", actions: [clickPattern("Found this hearth")], diff: canvasDiff },
  { id: "map-keeper-choice", state: "mapKeeper", hash: "#/cartography/meadow", actions: [clickPattern("Face")], diff: canvasDiff },
  { id: "map-capital-locked", state: "mapCapitalLocked", hash: "#/cartography/oldcapital", diff: canvasDiff },
  { id: "chronicle-empty", state: "fresh", hash: "#/chronicle", diff: domDiff },
  { id: "chronicle-progressed", state: "storyProgressed", hash: "#/chronicle", diff: domDiff },
  { id: "charter-terms", state: "charter", view: "charter", diff: domDiff },
  { id: "charter-term-dialog", state: "charter", view: "charter", actions: [clickText("Drive out only what bites")], diff: domDiff },

  { id: "townsfolk-workers", state: "rich", hash: "#/townsfolk/workers", diff: domDiff },
  { id: "townsfolk-quests", state: "rich", hash: "#/townsfolk/quests", diff: domDiff },
  // castle + bosses are their own feature views now (NOT townsfolk tabs — TABS is ["workers","quests"]).
  // The old "#/townsfolk/castle|bosses" hashes silently fell through to the Workers tab, producing
  // duplicate goldens. Target the real views directly (mirrors how charter/boons use `view`).
  { id: "townsfolk-castle", state: "castleContrib", view: "castle", diff: domDiff },
  { id: "townsfolk-bosses", state: "bossGallery", view: "bosses", diff: domDiff },
  // Use view+modal (not a #/town hash): buildVisualState derives `modal` from the hash route,
  // so a "#/town" hash clobbers the bossModal builder's modal:"boss" back to null and nothing renders.
  { id: "boss-modal", state: "bossModal", view: "town", modal: "boss", diff: domDiff },
  { id: "run-summary", state: "runSummary", hash: "#/town", diff: domDiff },
  { id: "boons-farm", state: "boons", view: "boons", diff: domDiff },
  { id: "story-bar", state: "storyBar", hash: "#/town", diff: domDiff, enableDialogs: true },
  { id: "story-choices", state: "storyChoices", hash: "#/town", diff: domDiff, enableDialogs: true },
  { id: "story-prompt", state: "storyPrompt", hash: "#/town", diff: domDiff, enableDialogs: true },
  { id: "story-win", state: "storyWin", hash: "#/town", diff: domDiff, enableDialogs: true },
  { id: "tutorial-center", state: "tutorialCenter", hash: "#/town", diff: domDiff },
  // This scenario includes the Phaser board canvas; use the more tolerant canvas diff.
  { id: "tutorial-corner", state: "tutorialCorner", hash: "#/board", diff: canvasDiff },
  { id: "town-market-news", state: "marketNews", hash: "#/town", diff: domDiff, enableDialogs: true },
];

// Hand-written expectations override the auto-generated "Scenario X renders expected #/y" boilerplate.
// Each line states the concrete content a reviewer (or a regenerated golden) should show.
const expectationOverrideById: Record<string, string> = {
  "board-farm-chain-7": "A 7-tile grass chain is visibly held on the farm board before capture.",
  "board-farm-chain-2-short": "A 2-tile chain is held; the chain panel header shows how many more tiles are needed to collect.",
  "shell-menu-settings": "Settings panel is open from the menu modal.",
  "town-build-picker-locked": "Build picker is open and a locked building option is shown.",
  // Board state variants
  "board-farm-idle": "Idle farm board: season strip, tool rack, a populated stockpile, and a full 6×6 tile grid.",
  "board-farm-fire-rats": "Farm board under the fire/rats hazard atmosphere wash (rats render as the warm tint, by design). NOTE: per-tile FIRE rendering does not yet capture in the visual harness (the fire overlay is painted in GameScene.fillBoard, not the state-rebuild path) — a known follow-up.",
  "board-farm-fertilizer-active": "Farm board with the fertilizer effect active on boosted tiles.",
  "board-farm-tool-bomb": "Farm board with the BOMB tool armed (armed-tool banner + targeting state).",
  "board-farm-tool-sickle": "Farm board with the SICKLE tool armed.",
  "board-farm-tool-rake": "Farm board with the RAKE tool armed.",
  "board-mine-idle": "Mine board: stone/coal/gem tiles and the mine HUD.",
  "board-mine-hazards": "Mine board with cave-in/rubble hazards present on tiles.",
  "board-fish-idle-high-tide": "Fish/harbor board at HIGH tide with the tide indicator raised.",
  "board-fish-pearl-low-tide": "Fish/harbor board at LOW tide with an oyster/pearl capture state.",
  "board-boss-minimized": "Farm board with the active-boss banner collapsed into its minimized strip.",
  "board-boss-active": "Farm board with the boss banner expanded showing the min-chain requirement / HP.",
  "board-boss-weather": "Farm board with the boss weather modifier visibly active.",
  // Dialog-payload scenarios (need enableDialogs:true or they capture an empty town)
  "shell-toast-bubble": "An NPC toast bubble is visible over the town (pinned opaque for capture).",
  "boss-modal": "The boss intro modal (The Frostmaw — goal/turns/min-chain) is open over the town.",
  "story-bar": "The story-beat modal for act1_light_hearth is presented over the town.",
  "story-choices": "The Hearth-Keeper story beat is open with its two branching choice buttons.",
  "story-prompt": "The act1_arrival story modal is open with narrative text.",
  "story-win": "The act3 win/victory story beat is presented.",
  "town-market-news": "A market-news ticker bubble (e.g. Wood Shortage) is visible over the town.",
  // Retargeted to their real feature views
  "townsfolk-castle": "The Castle contribution view: the three needs with contribute progress and buttons.",
  "townsfolk-bosses": "The Bosses gallery view listing the boss roster.",
};

function buildExpectationForScenario(scenario: VisualScenario): string {
  return expectationOverrideById[scenario.id] ?? `Scenario ${scenario.id} renders expected ${scenario.hash ?? scenario.view} UI state.`;
}

function buildChecklistForScenario(scenario: VisualScenario): string[] {
  const checklist: string[] = [];
  if (scenario.hash) checklist.push(`Hash route resolves to ${scenario.hash}.`);
  if (scenario.view) checklist.push(`Internal visual view is ${scenario.view}.`);
  if (scenario.actions?.some((action) => action.type === "api" && action.method === "holdChain")) {
    checklist.push("Selected holdChain pattern is visible on the board.");
  }
  if (scenario.actions?.some((action) => action.type === "clickRole" || action.type === "clickRoleLast")) {
    checklist.push("Triggered button-driven modal/panel state is visible.");
  }
  if (scenario.actions?.some((action) => action.type === "clickText")) {
    checklist.push("Clicked text target appears in the resulting focused panel.");
  }
  if (scenario.hash?.startsWith?.("#/board")) checklist.push("Board canvas is rendered with populated tiles.");
  if (!checklist.length) checklist.push("Primary panel content is visible and not blank.");
  return checklist;
}

export const VISUAL_SCENARIOS: AnnotatedVisualScenario[] = BASE_VISUAL_SCENARIOS.map((scenario) => ({
  ...scenario,
  expectation: buildExpectationForScenario(scenario),
  reviewChecklist: buildChecklistForScenario(scenario),
}));

export function visualScenarioById(id: string): AnnotatedVisualScenario | null {
  return VISUAL_SCENARIOS.find((scenario) => scenario.id === id) ?? null;
}

export const VISUAL_DESKTOP_SMOKE_SCENARIO_IDS = [
  "shell-town-fresh",
  "shell-menu-main",
  "town-home-built-out",
  "start-farming-default",
  "board-farm-idle",
  "board-farm-chain-7",
  "board-farm-chain-2-short",
  "board-mine-idle",
  "inventory-grid-all",
  "crafting-bakery",
  "tiles-farm-grass",
  "map-current-home",
  "story-choices",
  "tutorial-corner",
];
