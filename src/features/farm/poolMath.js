import { SEASON_POOL_MODS } from "../../constants.js";
import { CATEGORY_OF } from "../tileCollection/data.js";

/** Add worker/building pool_weight copies (respects active tile per category). */
export function applyPoolWeightAdds(pool, weights, tileCollectionActive = null) {
  const workerPool = [...pool];
  for (const [k, n] of Object.entries(weights ?? {})) {
    const cat = CATEGORY_OF[k];
    if (cat && tileCollectionActive && tileCollectionActive[cat] !== k) continue;
    for (let i = 0; i < Math.round(n); i++) workerPool.push(k);
  }
  return workerPool;
}

/** Farm-only seasonal deltas from SEASON_POOL_MODS. */
export function applySeasonPoolMods(pool, seasonName) {
  const workerPool = [...pool];
  const mod = SEASON_POOL_MODS[seasonName] ?? {};
  for (const [k, d] of Object.entries(mod)) {
    if (d > 0) {
      for (let i = 0; i < d; i++) workerPool.push(k);
    } else if (d < 0) {
      let toRemove = -d;
      while (toRemove > 0 && workerPool.filter((x) => x === k).length > 1) {
        workerPool.splice(workerPool.lastIndexOf(k), 1);
        toRemove -= 1;
      }
    }
  }
  return workerPool;
}
