// Bosses tab — Balance Manager.
//
// Edits seasonal bosses: name, season, the target resource amount, and the
// flavour / modifier descriptions. Modifier type + params drive board logic and
// aren't editable here. Patches go to `draft.bosses[id]` and merge into the
// live BOSSES list on next load via `applyBossOverrides`.

import { BOSSES } from "../../features/bosses/data.js";
import { COLORS, TextField, TextArea, NumberField, FieldRow, Card, Pill } from "../shared.jsx";
import Icon from "../../ui/Icon.jsx";
import { ICON_REGISTRY } from "../../textures/iconRegistry.js";
import { assessBoss } from "../bossBalance.js";

const TIER_TONE = {
  gentle:  { bg: "rgba(90,158,75,0.16)",  fg: COLORS.greenDeep },
  steady:  { bg: "rgba(226,178,74,0.18)", fg: "#7a5810" },
  hard:    { bg: "rgba(214,97,42,0.18)",  fg: COLORS.emberDeep },
  brutal:  { bg: "rgba(194,59,34,0.18)",  fg: COLORS.red },
};

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
        const portraitKey = `boss_${b.id}`;
        const hasPortrait = !!ICON_REGISTRY[portraitKey];
        const assessment = assessBoss({ ...b, target: { ...(b.target || {}), amount: eff.targetAmount } });
        const tone = TIER_TONE[assessment.tier.id] || TIER_TONE.steady;
        return (
          <Card key={b.id}>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-full overflow-hidden"
                style={{ width: 48, height: 48, background: COLORS.parchmentDeep, border: `2px solid ${COLORS.border}` }}
              >
                {hasPortrait ? (
                  <Icon iconKey={portraitKey} size={44} />
                ) : (
                  <span className="text-[18px] opacity-50">?</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold uppercase tracking-wide" style={{ color: COLORS.inkSubtle }}>
                  {eff.name} ({b.id})
                </div>
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{ background: tone.bg, color: tone.fg }}
                    title={assessment.tier.hint}>
                    {assessment.tier.label} · {assessment.perTurnTarget}/turn
                  </span>
                  <Pill>{assessment.modifier.label}</Pill>
                  <span className="text-[10px] italic" style={{ color: COLORS.inkSubtle }}>
                    {assessment.marginBands.bonusMargin50}+ → +50% reward · {assessment.marginBands.bonusMargin100}+ → max
                  </span>
                </div>
              </div>
            </div>
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
