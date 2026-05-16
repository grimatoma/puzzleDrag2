// Achievements tab — Balance Manager.
//
// Edits achievement name / description / count threshold / target / coin
// reward. The `counter` each one watches drives logic and isn't editable here.
// Patches go to `draft.achievements[id]` and merge into the live ACHIEVEMENTS
// list on next load via `applyAchievementOverrides`.

import { useState, useMemo } from "react";
import { ACHIEVEMENTS } from "../../features/achievements/data.js";
import { COLORS, TextField, NumberField, FieldRow, Card, SearchBar, SmallButton, Pill } from "../shared.jsx";
import { computeAchievementTracks, totalAchievementCoins, toolAwardCount } from "../achievementTracks.js";

export default function AchievementsTab({ draft, updateDraft }) {
  const [search, setSearch] = useState("");
  const [tracksOpen, setTracksOpen] = useState(false);
  const q = search.trim().toLowerCase();
  const filtered = ACHIEVEMENTS.filter((a) => !q || a.id.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || (a.counter || "").toLowerCase().includes(q));
  const tracks = useMemo(() => computeAchievementTracks(), []);
  const totalCoins = useMemo(() => totalAchievementCoins(), []);
  const toolCount = useMemo(() => toolAwardCount(), []);

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
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <SearchBar value={search} onChange={setSearch} placeholder="Filter by id / name / counter…" />
        </div>
        <SmallButton onClick={() => setTracksOpen((v) => !v)}>
          {tracksOpen ? "Hide" : "Show"} progression tracks
        </SmallButton>
        <Pill>{totalCoins.toLocaleString()}◉ total</Pill>
        <Pill>{toolCount} tool rewards</Pill>
      </div>

      {tracksOpen && (
        <Card title="Progression tracks">
          <div className="flex flex-col gap-2">
            {tracks.map((t) => {
              const maxT = Math.max(1, t.maxThreshold);
              return (
                <div key={t.counter} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: COLORS.parchmentDeep, color: COLORS.ember }}>
                      {t.counter}
                    </code>
                    <span className="text-[10px]" style={{ color: COLORS.inkSubtle }}>
                      {t.achievements.length} milestone{t.achievements.length === 1 ? "" : "s"} · {t.minThreshold}→{t.maxThreshold}
                    </span>
                    {t.isGeometric && (
                      <span className="text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(194,59,34,0.10)", color: COLORS.red }}>
                        geometric
                      </span>
                    )}
                  </div>
                  <div className="relative rounded" style={{ height: 22, background: COLORS.parchmentDeep, border: `1px solid ${COLORS.border}` }}>
                    {t.achievements.map((a) => {
                      const pos = (a.threshold / maxT) * 100;
                      return (
                        <div key={a.id} title={`${a.name} @ ${a.threshold}${a.summary ? ` — ${a.summary}` : ""}`}
                          style={{ position: "absolute", left: `${pos}%`, transform: "translateX(-50%)",
                            top: 2, bottom: 2, width: 10, borderRadius: 3, background: COLORS.ember,
                            border: `1.5px solid ${COLORS.emberDeep}`, cursor: "help" }} />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

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
