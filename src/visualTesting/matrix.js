const canvasDiff = { maxDiffPixelRatio: 0.05, threshold: 0.28 };
const domDiff = { maxDiffPixelRatio: 0.025, threshold: 0.22 };

const click = (name) => ({ type: "clickRole", role: "button", name });
const clickLast = (name) => ({ type: "clickRoleLast", role: "button", name });
const clickText = (text) => ({ type: "clickText", text });
const clickPattern = (pattern) => ({ type: "clickRole", role: "button", namePattern: pattern });
const hoverText = (text) => ({ type: "hoverText", text });
const api = (method, args) => ({ type: "api", method, args });

const tileRoutes = [
  ["tiles-farm-grass", "#/tiles/farm/grass"],
  ["tiles-mining-stone", "#/tiles/mining/mine_stone"],
  ["tiles-water-fish", "#/tiles/water/fish"],
].map(([id, hash]) => ({ id, state: "rich", hash, diff: domDiff }));

const BASE_VISUAL_SCENARIOS = [
  { id: "shell-town-fresh", state: "fresh", hash: "#/town", diff: domDiff },
  { id: "shell-menu-main", state: "fresh", hash: "#/town", actions: [click("Menu")], diff: domDiff },
  { id: "shell-menu-settings", state: "fresh", hash: "#/town", actions: [click("Menu"), clickText("Settings")], diff: domDiff },
  { id: "shell-debug-modal", state: "rich", hash: "#/town", actions: [click("Debug tools")], diff: domDiff },
  { id: "shell-leave-board-confirm", state: "boardFarm", hash: "#/board", actions: [click("Leave board")], diff: domDiff },
  { id: "shell-toast-bubble", state: "bubble", hash: "#/town", diff: domDiff },

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

  { id: "start-farming-default", state: "fresh", hash: "#/town", actions: [click("Enter Farm Field")], diff: domDiff },
  { id: "start-farming-tile-chooser", state: "rich", hash: "#/town", actions: [click("Enter Farm Field"), clickPattern("Grass selected")], diff: domDiff },
  { id: "entry-mine-locked", state: "mineLocked", hash: "#/town", diff: domDiff },
  { id: "entry-mine-provision-empty", state: "mineTownNoFood", hash: "#/town", actions: [click("Enter Mine")], diff: domDiff },

  { id: "board-farm-idle", state: "boardFarm", hash: "#/board", diff: canvasDiff },
  { id: "board-anim-demo", state: "boardFarm", hash: "#/board", diff: canvasDiff, skipProjects: ["iphone-landscape", "iphone-portrait"] },
  { id: "board-farm-chain-7", state: "boardFarm", hash: "#/board", actions: [api("holdChain", { key: "tile_grass_hay", length: 7 })], diff: canvasDiff },
  { id: "board-farm-fire-rats", state: "boardFarmHazards", hash: "#/board", diff: canvasDiff },
  { id: "board-farm-tool-bomb", state: "boardFarmBomb", hash: "#/board", diff: canvasDiff },
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
  { id: "board-season-spring-wheel",   state: "boardSeasonSpringWheel",   hash: "#/board", diff: canvasDiff, skipProjects: ["iphone-landscape", "iphone-portrait"] },
  { id: "board-season-spring-bespoke", state: "boardSeasonSpringBespoke", hash: "#/board", diff: canvasDiff, skipProjects: ["iphone-landscape", "iphone-portrait"] },
  { id: "board-season-summer-wheel",   state: "boardSeasonSummerWheel",   hash: "#/board", diff: canvasDiff, skipProjects: ["iphone-landscape", "iphone-portrait"] },
  { id: "board-season-summer-bespoke", state: "boardSeasonSummerBespoke", hash: "#/board", diff: canvasDiff, skipProjects: ["iphone-landscape", "iphone-portrait"] },
  { id: "board-season-autumn-wheel",   state: "boardSeasonAutumnWheel",   hash: "#/board", diff: canvasDiff, skipProjects: ["iphone-landscape", "iphone-portrait"] },
  { id: "board-season-autumn-bespoke", state: "boardSeasonAutumnBespoke", hash: "#/board", diff: canvasDiff, skipProjects: ["iphone-landscape", "iphone-portrait"] },
  { id: "board-season-winter-wheel",   state: "boardSeasonWinterWheel",   hash: "#/board", diff: canvasDiff, skipProjects: ["iphone-landscape", "iphone-portrait"] },
  { id: "board-season-winter-bespoke", state: "boardSeasonWinterBespoke", hash: "#/board", diff: canvasDiff, skipProjects: ["iphone-landscape", "iphone-portrait"] },

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
  { id: "crafting-queue", state: "craftQueue", hash: "#/crafting/bakery", diff: domDiff },
  { id: "crafting-queue-ready", state: "craftQueue", hash: "#/crafting/larder", diff: domDiff },

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
  { id: "townsfolk-castle", state: "rich", hash: "#/townsfolk/castle", diff: domDiff },
  { id: "townsfolk-bosses", state: "bossGallery", hash: "#/townsfolk/bosses", diff: domDiff },
  { id: "boss-modal", state: "bossModal", hash: "#/town", diff: domDiff },
  { id: "run-summary", state: "runSummary", hash: "#/town", diff: domDiff },
  { id: "boons-farm", state: "boons", view: "boons", diff: domDiff },
  { id: "story-bar", state: "storyBar", hash: "#/town", diff: domDiff },
  { id: "story-choices", state: "storyChoices", hash: "#/town", diff: domDiff },
  { id: "story-prompt", state: "storyPrompt", hash: "#/town", diff: domDiff },
  { id: "story-win", state: "storyWin", hash: "#/town", diff: domDiff },
  { id: "tutorial-center", state: "tutorialCenter", hash: "#/town", diff: domDiff },
  { id: "tutorial-corner", state: "tutorialCorner", hash: "#/board", diff: domDiff },
  { id: "town-market-news", state: "marketNews", hash: "#/town", diff: domDiff },
];

const expectationOverrideById = {
  "board-farm-chain-7": "A 7-tile hay chain is visibly held on the farm board before capture.",
  "shell-menu-settings": "Settings panel is open from the menu modal.",
  "town-build-picker-locked": "Build picker is open and a locked building option is shown.",
};

function buildExpectationForScenario(scenario) {
  return expectationOverrideById[scenario.id] ?? `Scenario ${scenario.id} renders expected ${scenario.hash ?? scenario.view} UI state.`;
}

function buildChecklistForScenario(scenario) {
  const checklist = [];
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

export const VISUAL_SCENARIOS = BASE_VISUAL_SCENARIOS.map((scenario) => ({
  ...scenario,
  expectation: buildExpectationForScenario(scenario),
  reviewChecklist: buildChecklistForScenario(scenario),
}));

export function visualScenarioById(id) {
  return VISUAL_SCENARIOS.find((scenario) => scenario.id === id) ?? null;
}

export const VISUAL_DESKTOP_SMOKE_SCENARIO_IDS = [
  "shell-town-fresh",
  "shell-menu-main",
  "town-home-built-out",
  "start-farming-default",
  "board-farm-idle",
  "board-farm-chain-7",
  "board-mine-idle",
  "inventory-grid-all",
  "crafting-bakery",
  "tiles-farm-grass",
  "map-current-home",
  "story-choices",
  "tutorial-corner",
];
