import { BEASTS, BEAST_KEYS, FARM_BEASTS, MINE_BEASTS } from "./data.js";

export const initial = {
  tameable: null,
  tamedBeasts: [],
  beastTameOffers: 0,
};

let _nextId = 1;
function uid() {
  return `beast_${Date.now()}_${_nextId++}`;
}

function deductInventory(state, resource, amount) {
  const inv = { ...(state.inventory || {}) };
  const current = inv[resource] || 0;
  if (current < amount) return null;
  inv[resource] = current - amount;
  return inv;
}

export function reduce(state, action) {
  switch (action.type) {
    case "BEASTS/OFFER": {
      const { beastKey } = action;
      if (!BEASTS[beastKey]) return state;
      return {
        ...state,
        tameable: beastKey,
        modal: "beasts",
      };
    }

    case "BEASTS/TAME": {
      const { beastKey } = action;
      const beast = BEASTS[beastKey];
      if (!beast) return state;
      const cost = beast.tameCost;
      const newInv = deductInventory(state, cost.resource, cost.amount);
      if (!newInv) {
        return {
          ...state,
          bubble: {
            npc: "mira",
            text: `Not enough ${cost.resource} to tame the ${beast.name}!`,
            ms: 2500,
            id: Date.now(),
          },
        };
      }
      const newBeast = {
        id: uid(),
        beastKey,
        hunger: 50,
        loyalty: 50,
      };
      return {
        ...state,
        inventory: newInv,
        tameable: null,
        tamedBeasts: [...(state.tamedBeasts || []), newBeast],
        beastTameOffers: (state.beastTameOffers || 0) + 1,
        bubble: {
          npc: "mira",
          text: `${beast.icon} ${beast.name} joins your stables!`,
          ms: 2500,
          id: Date.now(),
        },
      };
    }

    case "BEASTS/REFUSE": {
      return {
        ...state,
        tameable: null,
        modal: state.modal === "beasts" ? null : state.modal,
      };
    }

    case "BEASTS/FEED": {
      const { id } = action;
      const beasts = state.tamedBeasts || [];
      const idx = beasts.findIndex((b) => b.id === id);
      if (idx === -1) return state;
      const b = beasts[idx];
      const meta = BEASTS[b.beastKey];
      if (!meta) return state;
      const newInv = deductInventory(state, meta.food, 1);
      if (!newInv) {
        return {
          ...state,
          bubble: {
            npc: "mira",
            text: `No ${meta.food} left to feed the ${meta.name}!`,
            ms: 2000,
            id: Date.now(),
          },
        };
      }
      const updated = {
        ...b,
        hunger: Math.min(100, b.hunger + 30),
        loyalty: Math.min(100, b.loyalty + 5),
      };
      const newBeasts = [...beasts];
      newBeasts[idx] = updated;
      return { ...state, inventory: newInv, tamedBeasts: newBeasts };
    }

    case "BEASTS/RELEASE": {
      const { id } = action;
      const beasts = (state.tamedBeasts || []).filter((b) => b.id !== id);
      return { ...state, tamedBeasts: beasts };
    }

    case "CLOSE_SEASON": {
      let next = { ...state };
      const beasts = next.tamedBeasts || [];
      const newInventory = { ...(next.inventory || {}) };
      const wandered = [];

      const updatedBeasts = beasts
        .map((b) => {
          const meta = BEASTS[b.beastKey];
          if (!meta) return b;
          const newHunger = b.hunger - 25;
          if (newHunger < 0) {
            wandered.push(b);
            return null;
          }
          const fed = b.hunger > 30;
          if (fed) {
            const yieldAmt = b.loyalty > 75 ? meta.baseYield * 2 : meta.baseYield;
            newInventory[meta.yields] = (newInventory[meta.yields] || 0) + yieldAmt;
          }
          return { ...b, hunger: newHunger };
        })
        .filter(Boolean);

      next = { ...next, tamedBeasts: updatedBeasts, inventory: newInventory };

      if (wandered.length > 0) {
        const names = wandered.map((b) => BEASTS[b.beastKey]?.name || b.beastKey).join(", ");
        next = {
          ...next,
          bubble: {
            npc: "mira",
            text: `${names} wandered off — they were too hungry.`,
            ms: 3000,
            id: Date.now(),
          },
        };
      }

      if (Math.random() < 0.3) {
        const biome = next.biome || "farm";
        const pool = biome === "mine" ? MINE_BEASTS : FARM_BEASTS;
        const picked = pool[Math.floor(Math.random() * pool.length)];
        next = {
          ...next,
          tameable: picked,
          modal: "beasts",
        };
      }

      return next;
    }

    default:
      return state;
  }
}
