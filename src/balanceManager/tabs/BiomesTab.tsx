// Settlement Biomes tab — Dev Panel.
//
// Edits the biomes a settlement can be founded as (master doc §IV): 4 per type,
// each with a name, an icon, two hazards (that appear in every round there),
// and a resource bonus. Patches go to `draft.biomes[type][biomeId]` and merge
// into the live SETTLEMENT_BIOMES table on next load via `applyBiomeOverrides`.

import { SETTLEMENT_BIOMES } from "../../constants.js";
import { COLORS, TextField, FieldRow, Card } from "../shared.jsx";
import type { BalanceDraft } from "../index.jsx";

type BiomeType = "farm" | "mine" | "harbor";
const TYPE_LABELS: Record<BiomeType, string> = { farm: "Farm", mine: "Mine", harbor: "Harbor" };
const TYPES: BiomeType[] = ["farm", "mine", "harbor"];

interface BiomeOverride {
  name?: string;
  icon?: string;
  bonus?: string;
  hazards?: string[];
}
interface SettlementBiomeRow {
  id: string;
  name: string;
  icon: string;
  hazards: string[];
  bonus: string;
}

export default function BiomesTab({ draft, updateDraft }: { draft: BalanceDraft; updateDraft: (updater: (draft: BalanceDraft) => void) => void }) {
  const settlementBiomes = SETTLEMENT_BIOMES as unknown as Record<BiomeType, SettlementBiomeRow[]>;

  function patch(type: BiomeType, biomeId: string, fields: BiomeOverride) {
    updateDraft((d) => {
      const biomes = (d.biomes ?? {}) as Record<string, Record<string, BiomeOverride>>;
      d.biomes = biomes;
      biomes[type] ??= {};
      const next: BiomeOverride = { ...(biomes[type][biomeId] ?? {}), ...fields };
      for (const k of Object.keys(next)) {
        const v = (next as Record<string, unknown>)[k];
        if (v === "" || v === undefined || v === null) {
          delete (next as Record<string, unknown>)[k];
          continue;
        }
        if (Array.isArray(v) && v.every((x) => !x)) delete (next as Record<string, unknown>)[k];
      }
      if (Object.keys(next).length === 0) delete biomes[type][biomeId];
      else biomes[type][biomeId] = next;
      if (Object.keys(biomes[type]).length === 0) delete biomes[type];
      if (Object.keys(biomes).length === 0) d.biomes = {};
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {TYPES.map((type) => (
        <div key={type} className="flex flex-col gap-2">
          <div className="text-[12px] font-bold uppercase tracking-wider" style={{ color: COLORS.inkSubtle }}>
            {TYPE_LABELS[type]} biomes
          </div>
          {(settlementBiomes[type] ?? []).map((b) => {
            const biomesDraft = (draft.biomes ?? {}) as Record<string, Record<string, BiomeOverride>>;
            const p: BiomeOverride = biomesDraft[type]?.[b.id] ?? {};
            const eff = {
              name: p.name ?? b.name,
              icon: p.icon ?? b.icon,
              bonus: p.bonus ?? b.bonus,
              hazards: Array.isArray(p.hazards) ? p.hazards : b.hazards,
            };
            const setHazard = (i: number, v: string) => {
              const next = [...(eff.hazards.length ? eff.hazards : ["", ""])];
              next[i] = v;
              patch(type, b.id, { hazards: next });
            };
            return (
              <Card key={b.id} title={`${eff.icon} ${eff.name}`}>
                <FieldRow label="Name"><TextField value={eff.name} onChange={(v: string) => patch(type, b.id, { name: v })} width={200} /></FieldRow>
                <FieldRow label="Icon (emoji)"><TextField value={eff.icon} onChange={(v: string) => patch(type, b.id, { icon: v })} width={60} /></FieldRow>
                <FieldRow label="Hazard 1"><TextField value={eff.hazards[0] ?? ""} onChange={(v: string) => setHazard(0, v)} width={160} /></FieldRow>
                <FieldRow label="Hazard 2"><TextField value={eff.hazards[1] ?? ""} onChange={(v: string) => setHazard(1, v)} width={160} /></FieldRow>
                <FieldRow label="Resource bonus"><TextField value={eff.bonus} onChange={(v: string) => patch(type, b.id, { bonus: v })} width={220} /></FieldRow>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}
