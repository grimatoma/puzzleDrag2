export const FESTIVAL_GOALS = [
  { id: 'harvestfest', name: 'Harvest Fest', flavor: 'A feast for the season.', need: { wheat: 30, jam: 10, egg: 20 }, reward: { coins: 500, xp: 50 } },
  { id: 'lanternfest', name: 'Lantern Festival', flavor: 'Lights against the dark.', need: { coal: 15, ingot: 8, log: 25 }, reward: { coins: 700, xp: 80 } },
  { id: 'springbloom', name: 'Spring Bloom', flavor: 'Berry crowns and song.', need: { berry: 40, hay: 30 }, reward: { coins: 400, xp: 60 } },
];

export const MARKET_STOCK = [
  { id: 'rare_seed', name: 'Hearthwood Seed', icon: '🌿', desc: 'Seedring heirloom.', cost: { coins: 300 }, give: { heirloom: 'lumberknot' } },
  { id: 'gem_lot', name: 'Cut Gem Lot', icon: '💎', desc: '5 cutgems for a pretty penny.', cost: { coins: 800 }, give: { cutgem: 5 } },
  { id: 'plank_bundle', name: 'Plank Bundle', icon: '🪵', desc: '20 planks ready to build.', cost: { coins: 200 }, give: { plank: 20 } },
  { id: 'shuffle_horns', name: 'Pair of Horns', icon: '↻', desc: '2 reshuffle horns.', cost: { coins: 150 }, give: { tool: 'shuffle', amt: 2 } },
  { id: 'gold_purse', name: 'Coin Purse', icon: '🪙', desc: 'Spend gold for coins.', cost: { gold: 1 }, give: { coins: 80 } },
  { id: 'mystery_box', name: "Peddler's Mystery", icon: '📦', desc: 'A random gift.', cost: { coins: 250 }, give: { random: true } },
];
