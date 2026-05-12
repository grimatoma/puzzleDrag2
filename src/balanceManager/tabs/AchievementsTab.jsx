// Achievements tab — Balance Manager.
//
// Edits achievement name / description / count threshold / target / coin
// reward. The `counter` each one watches drives logic and isn't editable here.
// Patches go to `draft.achievements[id]` and merge into the live ACHIEVEMENTS
// list on next load via `applyAchievementOverrides`.

import { useState } from "react";
import { ACHIEVEMENTS } from "../../features/achievements/data.js";
import { COLORS, TextField, NumberField, FieldRow, Card, SearchBar } from "../shared.jsx";

export default function AchievementsTab({ draft, updateDraft }) {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const filtered = ACHIEVEMENTS.filter((a) => !q || a.id.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || (a.counter || "").toLowerCase().includes(q));

  function patch(id, fields) {
    updateDraft((d) => {
      d.achievements ??= {};
      const next = { ...(d.achievements[id] ?? {}), ...fields };
      for (const k of Object.keys(next)) if (next[k] === "" || next[k] == null) delete next[k];
      if (Object.keys(next).length === 0) delete d.achievements[id];
      else d.achievements[id] = next;
      if (Object.keys(d.achievements).length === 0) delete d.achievements;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <SearchBar value={search} onChange={setSearch} placeholder="Filter by id / name / counter…" />
      <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>{filtered.length} of {ACHIEVEMENTS.length} achievements.</div>
      {filtered.map((a) => {
        const p = (draft.achievements ?? {})[a.id] ?? {};
        const eff = {
          name: p.name ?? a.name,
          desc: p.desc ?? a.desc ?? "",
          threshold: p.threshold ?? a.threshold ?? 1,
          target: p.target ?? a.target ?? 1,
          rewardCoins: p.rewardCoins ?? a.reward?.coins ?? 0,
        };
        const hasToolReward = a.reward && a.reward.tools;
        return (
          <Card key={a.id} title={`${eff.name} (${a.id})`}>
            <FieldRow label="Name"><TextField value={eff.name} onChange={(v) => patch(a.id, { name: v })} width={220} /></FieldRow>
            <FieldRow label="Description" hint={`counter: ${a.counter}`}><TextField value={eff.desc} onChange={(v) => patch(a.id, { desc: v })} width={300} /></FieldRow>
            <FieldRow label="Unlock threshold"><NumberField value={eff.threshold} onChange={(v) => patch(a.id, { threshold: v })} min={1} max={99999} /></FieldRow>
            <FieldRow label="Target (progress bar max)"><NumberField value={eff.target} onChange={(v) => patch(a.id, { target: v })} min={1} max={99999} /></FieldRow>
            <FieldRow label="Coin reward" hint={hasToolReward ? "also grants a tool — coins are layered on" : undefined}><NumberField value={eff.rewardCoins} onChange={(v) => patch(a.id, { rewardCoins: v })} min={0} max={99999} /></FieldRow>
          </Card>
        );
      })}
    </div>
  );
}
