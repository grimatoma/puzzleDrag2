// Settlement Biomes tab — Balance Manager.
//
// Edits the biomes a settlement can be founded as (master doc §IV): 4 per type,
// each with a name, an icon, two hazards (that appear in every round there),
// and a resource bonus. Patches go to `draft.biomes[type][biomeId]` and merge
// into the live SETTLEMENT_BIOMES table on next load via `applyBiomeOverrides`.

import { SETTLEMENT_BIOMES } from "../../constants.js";
import { COLORS, TextField, FieldRow, Card } from "../shared.jsx";

const TYPE_LABELS = { farm: "Farm", mine: "Mine", harbor: "Harbor" };

export default function BiomesTab({ draft, updateDraft }) {
  function patch(type, biomeId, fields) {
    updateDraft((d) => {
      d.biomes ??= {};
      d.biomes[type] ??= {};
      const next = { ...(d.biomes[type][biomeId] ?? {}), ...fields };
      for (const k of Object.keys(next)) {
        const v = next[k];
        if (v === "" || v === undefined || v === null) { delete next[k]; continue; }
        if (Array.isArray(v) && v.every((x) => !x)) delete next[k];
      }
      if (Object.keys(next).length === 0) delete d.biomes[type][biomeId];
      else d.biomes[type][biomeId] = next;
      if (Object.keys(d.biomes[type]).length === 0) delete d.biomes[type];
      if (Object.keys(d.biomes).length === 0) delete d.biomes;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {["farm", "mine", "harbor"].map((type) => (
        <div key={type} className="flex flex-col gap-2">
          <div className="text-[12px] font-bold uppercase tracking-wider" style={{ color: COLORS.inkSubtle }}>
            {TYPE_LABELS[type]} biomes
          </div>
          {(SETTLEMENT_BIOMES[type] ?? []).map((b) => {
            const p = (draft.biomes ?? {})[type]?.[b.id] ?? {};
            const eff = {
              name: p.name ?? b.name,
              icon: p.icon ?? b.icon,
              bonus: p.bonus ?? b.bonus,
              hazards: Array.isArray(p.hazards) ? p.hazards : b.hazards,
            };
            const setHazard = (i, v) => {
              const next = [...(eff.hazards.length ? eff.hazards : ["", ""])];
              next[i] = v;
              patch(type, b.id, { hazards: next });
            };
            return (
              <Card key={b.id} title={`${eff.icon} ${eff.name}`}>
                <FieldRow label="Name"><TextField value={eff.name} onChange={(v) => patch(type, b.id, { name: v })} width={200} /></FieldRow>
                <FieldRow label="Icon (emoji)"><TextField value={eff.icon} onChange={(v) => patch(type, b.id, { icon: v })} width={60} /></FieldRow>
                <FieldRow label="Hazard 1"><TextField value={eff.hazards[0] ?? ""} onChange={(v) => setHazard(0, v)} width={160} /></FieldRow>
                <FieldRow label="Hazard 2"><TextField value={eff.hazards[1] ?? ""} onChange={(v) => setHazard(1, v)} width={160} /></FieldRow>
                <FieldRow label="Resource bonus"><TextField value={eff.bonus} onChange={(v) => patch(type, b.id, { bonus: v })} width={220} /></FieldRow>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}
