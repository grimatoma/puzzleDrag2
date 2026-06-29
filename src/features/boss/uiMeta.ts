export interface BossUiEntry {
  displayName: string;
  emoji: string;
  flavor: string;
  goal: string;
}

/** UI-only boss presentation (emoji, flavor, goal). Gameplay from BOSSES in bosses/data.js. */
export const BOSS_UI: Readonly<Record<string, BossUiEntry>> = Object.freeze({
  frostmaw: {
    displayName: "The Frostmaw",
    emoji: "❄️",
    flavor: "A frozen titan stirs in the deep winter wood. Your hearth must not go dark.",
    goal: "Bring 30 logs in 10 turns to keep the hearth lit.",
  },
  ember_drake: {
    displayName: "Ember Drake",
    emoji: "🔥",
    flavor: "Scales of cinder, breath of smelting flame — the Drake demands tribute in iron.",
    goal: "Forge 3 ingots before the hour passes.",
  },
  quagmire: {
    displayName: "The Quagmire",
    emoji: "🌿",
    flavor: "The bog has swallowed the lower fields. Only a bountiful harvest can drain its hold.",
    goal: "Drain the bog: harvest 50 hay across 10 turns.",
  },
  old_stoneface: {
    displayName: "Old Stoneface",
    emoji: "🪨",
    flavor: "An ancient golem has sealed the mountain pass. Prove your worth at the rock face.",
    goal: "Quarry 20 stone from the rock biome.",
  },
  mossback: {
    displayName: "Mossback",
    emoji: "🌱",
    flavor: "A mossy titan lurks in the spring glades. Four mystery tiles hide its weakness — reveal them all.",
    goal: "Harvest 30 blackberries to expose its weakness and drive it from the vale.",
  },
  storm: {
    displayName: "The Storm",
    emoji: "🌩",
    flavor: "A black squall rolls over Saltspray Harbor. Every short cast tears free — only steady, deliberate pulls bring fillets through the chop.",
    goal: "Land 6 fish fillets in 10 turns. Short chains slip the line.",
  },
});
