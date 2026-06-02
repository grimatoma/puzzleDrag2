// Achievements tab — Dev Panel.
//
// Edits achievement name / description / count threshold / target / coin
// reward. The `counter` each one watches drives logic and isn't editable here.
// Patches go to `draft.achievements[id]` and merge into the live ACHIEVEMENTS
// list on next load via `applyAchievementOverrides`.

import { useState } from "react";
import { ACHIEVEMENTS } from "../../features/achievements/data.js";
import { COLORS, TextField, NumberField, FieldRow, Card, SearchBar } from "../shared.jsx";
import type { BalanceDraft, TabProps } from "../index.jsx";

interface AchievementOverride {
  name?: string;
  desc?: string;
  threshold?: number;
  target?: number;
  rewardCoins?: number;
  [extra: string]: unknown;
}

const SEARCH_BLOBS = ACHIEVEMENTS.map(a => `${a.id} ${a.name} ${a.counter || ""}`.toLowerCase());

export default function AchievementsTab({ draft, updateDraft }: TabProps) {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const filtered = !q ? ACHIEVEMENTS : ACHIEVEMENTS.filter((_, index) => SEARCH_BLOBS[index].includes(q));

  function patch(id: string, fields: AchievementOverride) {
    updateDraft((d: BalanceDraft) => {
      d.achievements ??= {};
      const achievements = d.achievements as Record<string, AchievementOverride>;
      const next: AchievementOverride & Record<string, unknown> = { ...(achievements[id] ?? {}), ...fields };
      for (const k of Object.keys(next)) {
        const v = (next as Record<string, unknown>)[k];
        if (v === "" || v == null) delete (next as Record<string, unknown>)[k];
      }
      if (Object.keys(next).length === 0) delete achievements[id];
      else achievements[id] = next;
      if (Object.keys(achievements).length === 0) delete (d as { achievements?: unknown }).achievements;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <SearchBar value={search} onChange={setSearch} placeholder="Filter by id / name / counter…" />
      <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>{filtered.length} of {ACHIEVEMENTS.length} achievements.</div>
      {filtered.map((a) => {
        const achievementsDraft = (draft.achievements ?? {}) as Record<string, AchievementOverride>;
        const p: AchievementOverride = achievementsDraft[a.id] ?? {};
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
            <FieldRow label="Name"><TextField value={eff.name} onChange={(v: string) => patch(a.id, { name: v })} width={220} /></FieldRow>
            <FieldRow label="Description" hint={`counter: ${a.counter}`}><TextField value={eff.desc} onChange={(v: string) => patch(a.id, { desc: v })} width={300} /></FieldRow>
            <FieldRow label="Unlock threshold"><NumberField value={eff.threshold} onChange={(v: number) => patch(a.id, { threshold: v })} min={1} max={99999} /></FieldRow>
            <FieldRow label="Target (progress bar max)"><NumberField value={eff.target} onChange={(v: number) => patch(a.id, { target: v })} min={1} max={99999} /></FieldRow>
            <FieldRow label="Coin reward" hint={hasToolReward ? "also grants a tool — coins are layered on" : undefined}><NumberField value={eff.rewardCoins} onChange={(v: number) => patch(a.id, { rewardCoins: v })} min={0} max={99999} /></FieldRow>
          </Card>
        );
      })}
    </div>
  );
}
