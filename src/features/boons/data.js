// ─── Boon trees (Phase 6b, master doc Part 1 §X) ──────────────────────────────
// After facing a settlement's keeper the player earns either Embers (Coexist)
// or Core Ingots (Drive Out). Boons let them *spend* those currencies on
// per-settlement, per-path perks that shape the rest of the run.
//
// One boon catalog per (zone-type × path) combo. A boon is gated on its
// `keeper_<zoneId>_<path>` flag — set by KEEPER/CONFRONT — so a boon for the
// farm/coexist path is only visible at a farm settlement that chose Coexist.
//
// Effects are small and stack multiplicatively across owned boons (see
// `boonEffectMult` below). Heavier effects (Drive Out hazard dampening,
// extra rations on expeditions) can be added once the boon trees prove out.

export const BOON_EFFECTS = Object.freeze([
  "coin_gain_mult",     // chain-collected coin reward × params.mult
  "bond_gain_mult",     // bond gains from gifts/orders × params.mult
  "chain_yield_mult",   // resource amount per chain × params.mult
]);

/**
 * One catalog of boons. Keyed by `${type}_${path}` (e.g. `farm_coexist`).
 * Each entry is `{ id, name, desc, cost: { embers?, coreIngots? }, effect: { type, params } }`.
 * Designed so each path has three options of escalating cost and impact.
 */
export const BOONS = Object.freeze({
  farm_coexist: [
    { id: "deer_blessing",    name: "Deer-Blessing",        desc: "The herd remembers your name. Villager bonds rise 20% faster.", cost: { embers: 3 }, effect: { type: "bond_gain_mult", params: { mult: 1.2 } } },
    { id: "field_abundance",  name: "Field Abundance",      desc: "Wild gifts spill over each harvest. Chain yields +10%.",       cost: { embers: 5 }, effect: { type: "chain_yield_mult", params: { mult: 1.1 } } },
    { id: "hearth_thrift",    name: "Hearth-Thrift",        desc: "Bountiful seasons. Coin gains +15%.",                          cost: { embers: 8 }, effect: { type: "coin_gain_mult", params: { mult: 1.15 } } },
  ],
  farm_driveout: [
    { id: "tilled_order",     name: "Tilled Order",         desc: "Disciplined fields. Chain yields +15%.",                       cost: { coreIngots: 3 }, effect: { type: "chain_yield_mult", params: { mult: 1.15 } } },
    { id: "iron_market",      name: "Iron Market",          desc: "Predictable trade. Coin gains +20%.",                          cost: { coreIngots: 5 }, effect: { type: "coin_gain_mult", params: { mult: 1.2 } } },
    { id: "drilled_corps",    name: "Drilled Corps",        desc: "Loyal villagers. Bond gains +10%.",                            cost: { coreIngots: 8 }, effect: { type: "bond_gain_mult", params: { mult: 1.1 } } },
  ],
  mine_coexist: [
    { id: "stone_pact",       name: "Stone-Pact",           desc: "The Knocker shows you the seams. Chain yields +15%.",          cost: { embers: 3 }, effect: { type: "chain_yield_mult", params: { mult: 1.15 } } },
    { id: "deep_friendship",  name: "Deep Friendship",      desc: "Underground company. Bond gains +15%.",                        cost: { embers: 5 }, effect: { type: "bond_gain_mult", params: { mult: 1.15 } } },
    { id: "vein_richness",    name: "Vein-Richness",        desc: "Generous earth. Coin gains +20%.",                             cost: { embers: 8 }, effect: { type: "coin_gain_mult", params: { mult: 1.2 } } },
  ],
  mine_driveout: [
    { id: "industrial_reach", name: "Industrial Reach",     desc: "Strip mining unbothered. Chain yields +20%.",                  cost: { coreIngots: 3 }, effect: { type: "chain_yield_mult", params: { mult: 1.2 } } },
    { id: "ingot_thrift",     name: "Ingot Thrift",         desc: "Efficient smelters. Coin gains +20%.",                         cost: { coreIngots: 5 }, effect: { type: "coin_gain_mult", params: { mult: 1.2 } } },
    { id: "foreman_drills",   name: "Foreman's Drills",     desc: "Bond gains +10%.",                                             cost: { coreIngots: 8 }, effect: { type: "bond_gain_mult", params: { mult: 1.1 } } },
  ],
  harbor_coexist: [
    { id: "tide_blessing",    name: "Tide-Blessing",        desc: "The singer hums when you cast. Chain yields +10%.",            cost: { embers: 3 }, effect: { type: "chain_yield_mult", params: { mult: 1.1 } } },
    { id: "sailor_amity",     name: "Sailor's Amity",       desc: "Friends in every port. Bond gains +20%.",                      cost: { embers: 5 }, effect: { type: "bond_gain_mult", params: { mult: 1.2 } } },
    { id: "pearl_trove",      name: "Pearl Trove",          desc: "Lucky catches. Coin gains +15%.",                              cost: { embers: 8 }, effect: { type: "coin_gain_mult", params: { mult: 1.15 } } },
  ],
  harbor_driveout: [
    { id: "stilled_waves",    name: "Stilled Waves",        desc: "Predictable seas. Chain yields +20%.",                         cost: { coreIngots: 3 }, effect: { type: "chain_yield_mult", params: { mult: 1.2 } } },
    { id: "harbor_tariff",    name: "Harbor Tariff",        desc: "Tax on all comings. Coin gains +25%.",                         cost: { coreIngots: 5 }, effect: { type: "coin_gain_mult", params: { mult: 1.25 } } },
    { id: "press_gang",       name: "Press-Gang",           desc: "Conscripted crews. Bond gains +5%.",                           cost: { coreIngots: 8 }, effect: { type: "bond_gain_mult", params: { mult: 1.05 } } },
  ],
});

/** All boons as a flat list with their catalog key attached. */
export function allBoons() {
  const out = [];
  for (const [catalogKey, list] of Object.entries(BOONS)) {
    for (const b of list) out.push({ ...b, catalogKey });
  }
  return out;
}

/** Look up a boon by its id (across all catalogs). */
export function boonById(id) {
  return allBoons().find((b) => b.id === id) ?? null;
}

/** True if the boon is purchaseable: not yet owned AND the keeper flag is set. */
export function boonIsUnlocked(state, boon) {
  const [type, path] = boon.catalogKey?.split("_") ?? [];
  if (!type || !path) return false;
  const flagSet = !!state?.story?.flags?.[`keeper_anyzone_${path}`]
    || Object.keys(state?.story?.flags ?? {}).some(
      (k) => k.startsWith("keeper_") && k.endsWith(`_${path}`) && state.story.flags[k],
    );
  // Path is satisfied by ANY settlement of any type that chose this path —
  // boons are kingdom-wide, not per-settlement. (Catalogs are split by type
  // for narrative clarity; ownership is shared across the run.)
  return flagSet;
}

/** True if the boon's cost can be paid from the current state. */
export function canAffordBoon(state, boon) {
  const c = boon.cost ?? {};
  if ((c.embers ?? 0) > (state?.embers ?? 0)) return false;
  if ((c.coreIngots ?? 0) > (state?.coreIngots ?? 0)) return false;
  return true;
}

/** True if the boon has been purchased. */
export function boonOwned(state, boonId) {
  return !!state?.boons?.[boonId];
}

/**
 * Multiplier from owned boons whose `effect.type` matches. Defaults to 1.0
 * (no effect). When several owned boons share a type, multipliers compose.
 */
export function boonEffectMult(state, effectType) {
  const owned = state?.boons ?? {};
  let mult = 1;
  for (const [boonId, isOwned] of Object.entries(owned)) {
    if (!isOwned) continue;
    const b = boonById(boonId);
    if (!b || b.effect?.type !== effectType) continue;
    const m = Number(b.effect?.params?.mult);
    if (Number.isFinite(m) && m > 0) mult *= m;
  }
  return mult;
}
