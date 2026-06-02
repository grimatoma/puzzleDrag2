// Tuning tab — Dev Panel.
//
// Loose top-level constants that don't belong to any other table. Patches go to
// `draft.tuning` (a flat object) and are validated by `sanitizeTuning` in
// src/config/applyOverrides.js, then reassigned onto the matching `export let`s
// in src/constants.js (and src/features/zones/data.js for the founding ones) on
// next load. Per-zone turn budgets live on the Zones tab. An unset field falls back to its current (possibly already
// overridden) value.

import { CRAFT_QUEUE_HOURS, CRAFT_GEM_SKIP_COST, MIN_EXPEDITION_TURNS, DEFAULT_HOME_BIOME, SETTLEMENT_BIOMES } from "../../constants.js";
import { SETTLEMENT_FOUNDING_BASE_COINS, SETTLEMENT_FOUNDING_GROWTH } from "../../features/zones/data.js";
import { COLORS, NumberField, Select, FieldRow, Card } from "../shared.jsx";
import type { BalanceDraft, TabProps } from "../index.jsx";

interface NumberFieldProps {
  min?: number;
  max?: number;
  step?: number;
  width?: number | string;
}

const HOME_BIOME_OPTIONS = (SETTLEMENT_BIOMES.farm ?? []).map((b) => ({ value: b.id, label: `${b.icon} ${b.name}` }));

export default function TuningTab({ draft, updateDraft }: TabProps) {
  const t = (draft.tuning ?? {}) as Record<string, unknown>;
  function patch(key: string, v: number | string | null | undefined) {
    updateDraft((d: BalanceDraft) => {
      const tuning = (d.tuning ?? {}) as Record<string, unknown>;
      tuning[key] = v as unknown;
      if (v === "" || v === undefined || v === null) delete tuning[key];
      d.tuning = tuning;
      if (Object.keys(tuning).length === 0) delete (d as { tuning?: unknown }).tuning;
    });
  }
  const num = (key: string, def: number, props: NumberFieldProps = {}) => (
    <NumberField value={(t[key] as number | undefined) ?? def} onChange={(v: number) => patch(key, v)} {...props} />
  );

  return (
    <div className="flex flex-col gap-3">
      <Card title="Crafting queue">
        <FieldRow label="Queue timer (hours)" hint="CRAFT_QUEUE_HOURS — wall-clock hours a queued craft takes">{num("craftQueueHours", CRAFT_QUEUE_HOURS, { min: 1, max: 240 })}</FieldRow>
        <FieldRow label="Gem skip cost" hint="CRAFT_GEM_SKIP_COST — gems to finish a queued craft instantly">{num("craftGemSkipCost", CRAFT_GEM_SKIP_COST, { min: 0, max: 999 })}</FieldRow>
      </Card>

      <Card title="Expeditions & founding">
        <FieldRow label="Min expedition turns" hint="MIN_EXPEDITION_TURNS — minimum food (in turns) to set out">{num("minExpeditionTurns", MIN_EXPEDITION_TURNS, { min: 1, max: 99 })}</FieldRow>
        <FieldRow label="Founding cost — base coins" hint="SETTLEMENT_FOUNDING_BASE_COINS — cost of the 2nd settlement">{num("foundingBaseCoins", SETTLEMENT_FOUNDING_BASE_COINS, { min: 0, max: 999999 })}</FieldRow>
        <FieldRow label="Founding cost — growth ×" hint="SETTLEMENT_FOUNDING_GROWTH — multiplier per additional settlement">{num("foundingGrowth", SETTLEMENT_FOUNDING_GROWTH, { min: 1, max: 10, step: 0.1, width: 80 })}</FieldRow>
        <FieldRow label="Home biome" hint="DEFAULT_HOME_BIOME — the pre-founded Vale's biome">
          <Select value={(t.homeBiome as string | undefined) ?? DEFAULT_HOME_BIOME} onChange={(v: string) => patch("homeBiome", v)} options={HOME_BIOME_OPTIONS} width={180} />
        </FieldRow>
      </Card>

      <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
        These are read once at module load — change them in balance.json (tuning) or the source constants.
      </div>
    </div>
  );
}
