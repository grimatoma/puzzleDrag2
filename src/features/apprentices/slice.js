import { APPRENTICE_MAP } from "./data.js";

export const initial = {
  hiredApprentices: [],
  idleHistory: [],
};

let hireSeq = 1;

function checkRequirement(app, state) {
  const req = app.requirement;
  if (!req) return true;
  const built = state.built || {};
  const level = state.level || 1;
  if (req.orLevel) {
    return !!(built[req.building]) || level >= req.orLevel;
  }
  if (req.building) return !!built[req.building];
  if (req.level) return level >= req.level;
  return true;
}

export function reduce(state, action) {
  if (action.type === "APP/HIRE") {
    const { appKey } = action;
    const app = APPRENTICE_MAP[appKey];
    if (!app) return state;
    const alreadyHired = (state.hiredApprentices || []).some((h) => h.app === appKey);
    if (alreadyHired) return state;
    if ((state.coins || 0) < app.hireCost) {
      return {
        ...state,
        bubble: { id: Date.now(), npc: "mira", text: `Need ${app.hireCost}◉ to hire ${app.name}.`, ms: 1800 },
      };
    }
    if (!checkRequirement(app, state)) {
      return {
        ...state,
        bubble: { id: Date.now(), npc: "wren", text: `Can't hire ${app.name} yet — requirements not met.`, ms: 1800 },
      };
    }
    const season = Math.floor((state.turnsUsed || 0) / 10);
    return {
      ...state,
      coins: state.coins - app.hireCost,
      hiredApprentices: [
        ...(state.hiredApprentices || []),
        { id: hireSeq++, app: appKey, since: season },
      ],
      bubble: { id: Date.now(), npc: "mira", text: `${app.name} joins the crew!`, ms: 1800 },
    };
  }

  if (action.type === "APP/FIRE") {
    const { id } = action;
    const hired = (state.hiredApprentices || []).find((h) => h.id === id);
    if (!hired) return state;
    const app = APPRENTICE_MAP[hired.app];
    const refund = app ? Math.floor(app.hireCost * 0.25) : 0;
    return {
      ...state,
      coins: (state.coins || 0) + refund,
      hiredApprentices: (state.hiredApprentices || []).filter((h) => h.id !== id),
      bubble: { id: Date.now(), npc: "mira", text: `${app ? app.name : "Apprentice"} let go. +${refund}◉ refund.`, ms: 1800 },
    };
  }

  if (action.type === "CLOSE_SEASON") {
    let coins = state.coins || 0;
    let inventory = { ...(state.inventory || {}) };
    let hiredApprentices = [...(state.hiredApprentices || [])];
    let idleHistory = [...(state.idleHistory || [])];
    let bubble = state.bubble;
    const season = Math.floor((state.turnsUsed || 0) / 10);
    const gains = {};
    const firedNames = [];

    const remaining = [];
    for (const hired of hiredApprentices) {
      const app = APPRENTICE_MAP[hired.app];
      if (!app) continue;
      if (coins < app.wage) {
        firedNames.push(app.name);
        const refund = 0;
        void refund;
        continue;
      }
      coins -= app.wage;
      for (const [key, amount] of Object.entries(app.produces)) {
        if (key === "coins") {
          coins += amount;
          gains.coins = (gains.coins || 0) + amount;
        } else {
          inventory[key] = (inventory[key] || 0) + amount;
          gains[key] = (gains[key] || 0) + amount;
        }
      }
      remaining.push(hired);
    }

    if (firedNames.length > 0) {
      const names = firedNames.join(", ");
      bubble = { id: Date.now(), npc: "mira", text: `${names} left — wages unpaid.`, ms: 2800 };
    }

    if (Object.keys(gains).length > 0) {
      const entry = { season, gains };
      idleHistory = [entry, ...idleHistory].slice(0, 5);
    }

    return {
      ...state,
      coins,
      inventory,
      hiredApprentices: remaining,
      idleHistory,
      bubble,
    };
  }

  return state;
}
