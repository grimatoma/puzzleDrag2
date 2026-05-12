// Bosses tab — Balance Manager.
//
// Edits seasonal bosses: name, season, the target resource amount, and the
// flavour / modifier descriptions. Modifier type + params drive board logic and
// aren't editable here. Patches go to `draft.bosses[id]` and merge into the
// live BOSSES list on next load via `applyBossOverrides`.

import { BOSSES } from "../../features/bosses/data.js";
import { COLORS, TextField, TextArea, NumberField, FieldRow, Card } from "../shared.jsx";

export default function BossesTab({ draft, updateDraft }) {
  function patch(id, fields) {
    updateDraft((d) => {
      d.bosses ??= {};
      const next = { ...(d.bosses[id] ?? {}), ...fields };
      for (const k of Object.keys(next)) if (next[k] === "" || next[k] == null) delete next[k];
      if (Object.keys(next).length === 0) delete d.bosses[id];
      else d.bosses[id] = next;
      if (Object.keys(d.bosses).length === 0) delete d.bosses;
    });
  }
  return (
    <div className="flex flex-col gap-3">
      {BOSSES.map((b) => {
        const p = (draft.bosses ?? {})[b.id] ?? {};
        const eff = {
          name: p.name ?? b.name,
          season: p.season ?? b.season ?? "",
          targetAmount: p.targetAmount ?? b.target?.amount ?? 0,
          description: p.description ?? b.description ?? "",
          modifierDescription: p.modifierDescription ?? b.modifierDescription ?? "",
        };
        return (
          <Card key={b.id} title={`${eff.name} (${b.id})`}>
            <FieldRow label="Name"><TextField value={eff.name} onChange={(v) => patch(b.id, { name: v })} width={200} /></FieldRow>
            <FieldRow label="Season"><TextField value={eff.season} onChange={(v) => patch(b.id, { season: v })} width={120} /></FieldRow>
            <FieldRow label="Target amount" hint={`resource: ${b.target?.resource ?? "?"}`}><NumberField value={eff.targetAmount} onChange={(v) => patch(b.id, { targetAmount: v })} min={1} max={99999} /></FieldRow>
            <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5 mt-1" style={{ color: COLORS.inkSubtle }}>Description</div>
            <TextArea rows={2} value={eff.description} onChange={(v) => patch(b.id, { description: v })} />
            <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5 mt-1" style={{ color: COLORS.inkSubtle }}>Modifier description <span className="opacity-60">(modifier: {b.modifier?.type ?? "?"})</span></div>
            <TextArea rows={2} value={eff.modifierDescription} onChange={(v) => patch(b.id, { modifierDescription: v })} />
          </Card>
        );
      })}
    </div>
  );
}
