// §9 locked: weather rolls each season UNLESS boss active.
export const WEATHER_TABLE = [
  { id: "none",         label: "Clear",        weight: 40, durationMin: 0, durationMax: 0 },
  { id: "rain",         label: "Rain",         weight: 20, durationMin: 1, durationMax: 3 },
  { id: "harvest_moon", label: "Harvest Moon", weight: 15, durationMin: 1, durationMax: 2 },
  { id: "drought",      label: "Drought",      weight: 15, durationMin: 2, durationMax: 3 },
  { id: "frost",        label: "Frost",        weight: 10, durationMin: 1, durationMax: 3 },
];

/**
 * Roll a weather event from the table.
 * rng: () => number in [0,1)
 * Returns { active: string|null, turnsRemaining: number }
 */
export function rollWeather(rng) {
  const r = rng() * 100;
  let acc = 0;
  for (const w of WEATHER_TABLE) {
    acc += w.weight;
    if (r < acc) {
      if (w.id === "none") return { active: null, turnsRemaining: 0 };
      const span = w.durationMax - w.durationMin + 1;
      const dur = w.durationMin + Math.floor(rng() * span);
      return { active: w.id, turnsRemaining: dur };
    }
  }
  return { active: null, turnsRemaining: 0 };
}
