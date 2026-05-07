import { WORKER_MAP as DEFAULT_MAP } from "./data.js";

const ZERO = () => ({ thresholdReduce:{}, poolWeight:{}, bonusYield:{}, seasonBonus:{} });
const add  = (b, k, n) => { if (n) b[k] = (b[k] ?? 0) + n; };

export function computeWorkerEffects(state, workerMap = DEFAULT_MAP) {
  const out = ZERO();
  const hired = state?.workers?.hired ?? {};
  const debt  = state?.workers?.debt  ?? 0;
  if (debt > 0) return out; // LOCKED: debt > 0 pauses production

  for (const [id, raw] of Object.entries(hired)) {
    const w = workerMap[id];
    if (!w) continue;
    const count = Math.max(0, Math.min(raw | 0, w.maxCount));
    if (count === 0) continue;

    const e = w.effect;
    const perHireScalar = count / w.maxCount;
    switch (e.type) {
      case "threshold_reduce":
        add(out.thresholdReduce, e.key, (e.from - e.to) * perHireScalar);
        break;
      case "pool_weight":
        add(out.poolWeight, e.key, e.amount * perHireScalar);
        break;
      case "bonus_yield":
        add(out.bonusYield, e.key, e.amount * perHireScalar);
        break;
      case "season_bonus":
        add(out.seasonBonus, e.key, e.amount * perHireScalar);
        break;
      default: break;
    }
  }
  return out;
}
