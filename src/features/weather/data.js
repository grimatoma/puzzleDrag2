// §9 locked: weather rolls each season UNLESS boss active.
export const WEATHER_TABLE = [
  { id: "none",         label: "Clear",        weight: 40, durationMin: 0, durationMax: 0,
    description: "Skies are clear — no weather effects this season." },
  { id: "rain",         label: "Rain",         weight: 20, durationMin: 1, durationMax: 3,
    description: "Steady rain doubles the resources collected from berry chains." },
  { id: "harvest_moon", label: "Harvest Moon", weight: 15, durationMin: 1, durationMax: 2,
    description: "The Harvest Moon rises — the first 3 chains each turn yield +1 upgrade tier." },
  { id: "drought",      label: "Drought",      weight: 15, durationMin: 2, durationMax: 3,
    description: "A dry spell halves wheat and grain spawn rates on the board." },
  { id: "frost",        label: "Frost",        weight: 10, durationMin: 1, durationMax: 3,
    description: "Frost creeps across the fields, slowing tile-fall and reducing chain speed." },
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
