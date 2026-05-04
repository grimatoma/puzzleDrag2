import { FESTIVAL_GOALS, MARKET_STOCK } from './data.js';

export const initial = {
  festival: null,
  festivalContribution: {},
  market: { open: false, stock: [], rolledOnDay: -1 },
  festivalsCompleted: 0,
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollMarketStock() {
  const shuffled = [...MARKET_STOCK].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}

function canAfford(cost, state) {
  const inv = state.inventory || {};
  const coins = state.coins || 0;
  for (const [key, amt] of Object.entries(cost)) {
    if (key === 'coins') {
      if (coins < amt) return false;
    } else {
      if ((inv[key] || 0) < amt) return false;
    }
  }
  return true;
}

function applyGive(give, state) {
  let inv = { ...(state.inventory || {}) };
  let coins = state.coins || 0;
  let tools = { ...(state.tools || {}) };
  let heirlooms = [...(state.heirlooms || [])];

  if (give.random) {
    const roll = Math.random();
    if (roll < 0.5) {
      coins += 50;
    } else {
      const resourceKeys = ['hay', 'wheat', 'log', 'berry', 'stone', 'ore', 'coal'];
      const res = pickRandom(resourceKeys);
      inv[res] = (inv[res] || 0) + 5;
    }
  } else {
    if (give.coins) coins += give.coins;
    if (give.tool) {
      tools[give.tool] = (tools[give.tool] || 0) + (give.amt || 1);
    }
    if (give.heirloom) {
      heirlooms = [...heirlooms, give.heirloom];
    }
    for (const [key, val] of Object.entries(give)) {
      if (['coins', 'tool', 'amt', 'heirloom', 'random'].includes(key)) continue;
      inv[key] = (inv[key] || 0) + val;
    }
  }

  return { inventory: inv, coins, tools, heirlooms };
}

function deductCost(cost, state) {
  let inv = { ...(state.inventory || {}) };
  let coins = state.coins || 0;
  for (const [key, amt] of Object.entries(cost)) {
    if (key === 'coins') {
      coins -= amt;
    } else {
      inv[key] = (inv[key] || 0) - amt;
    }
  }
  return { inventory: inv, coins };
}

function checkFestivalComplete(festival, contribution) {
  if (!festival) return false;
  const goal = FESTIVAL_GOALS.find(g => g.id === festival.id);
  if (!goal) return false;
  for (const [res, need] of Object.entries(goal.need)) {
    if ((contribution[res] || 0) < need) return false;
  }
  return true;
}

export function reduce(state, action) {
  switch (action.type) {
    case 'FEST/START': {
      const goal = FESTIVAL_GOALS.find(g => g.id === action.id) || FESTIVAL_GOALS[0];
      return {
        ...state,
        festival: { id: goal.id, name: goal.name, flavor: goal.flavor, need: goal.need, reward: goal.reward, complete: false },
        festivalContribution: {},
        modal: 'festivals',
      };
    }

    case 'FEST/CONTRIBUTE': {
      if (!state.festival) return state;
      const { resource, amount } = action;
      const inv = state.inventory || {};
      const have = inv[resource] || 0;
      const donate = Math.min(amount, have);
      if (donate <= 0) return state;
      const newContrib = {
        ...state.festivalContribution,
        [resource]: (state.festivalContribution[resource] || 0) + donate,
      };
      const newInv = { ...inv, [resource]: have - donate };
      const complete = checkFestivalComplete(state.festival, newContrib);
      return {
        ...state,
        inventory: newInv,
        festivalContribution: newContrib,
        festival: { ...state.festival, complete },
      };
    }

    case 'FEST/CLAIM': {
      if (!state.festival || !state.festival.complete) return state;
      const reward = state.festival.reward || {};
      return {
        ...state,
        festival: null,
        festivalContribution: {},
        festivalsCompleted: (state.festivalsCompleted || 0) + 1,
        coins: (state.coins || 0) + (reward.coins || 0),
        xp: (state.xp || 0) + (reward.xp || 0),
        bubble: { npc: 'mira', text: 'Festival complete! Well done!', ms: 2000, id: Date.now() },
      };
    }

    case 'MARKET/ROLL': {
      return {
        ...state,
        market: { open: true, stock: rollMarketStock(), rolledOnDay: state.turn || 0 },
      };
    }

    case 'MARKET/BUY': {
      const { id } = action;
      const item = (state.market.stock || []).find(s => s.id === id);
      if (!item) return state;
      if (!canAfford(item.cost, state)) return state;
      const { inventory: inv1, coins: c1 } = deductCost(item.cost, state);
      const giveResult = applyGive(item.give, { ...state, inventory: inv1, coins: c1 });
      return {
        ...state,
        inventory: giveResult.inventory,
        coins: giveResult.coins,
        tools: giveResult.tools,
        heirlooms: giveResult.heirlooms,
        bubble: { npc: 'mira', text: `Bought ${item.name}!`, ms: 1500, id: Date.now() },
      };
    }

    case 'CLOSE_SEASON': {
      let next = state;
      const seasonsCycled = (state.seasonsCycled || 0) + 1;
      next = { ...next, seasonsCycled };

      if (!next.festival && Math.random() < 0.4) {
        const goal = pickRandom(FESTIVAL_GOALS);
        next = {
          ...next,
          festival: { id: goal.id, name: goal.name, flavor: goal.flavor, need: goal.need, reward: goal.reward, complete: false },
          festivalContribution: {},
        };
      }

      if (seasonsCycled % 4 === 0) {
        next = {
          ...next,
          market: { open: true, stock: rollMarketStock(), rolledOnDay: next.turn || 0 },
        };
      }

      return next;
    }

    default:
      return state;
  }
}
