// Compact stats panel for the Story Tree Editor / Balance Manager Story tab.
// Renders the output of computeStoryStats() as a grid of metric cards plus
// a per-NPC ranking table. Display-only; click-through to beats is handled
// elsewhere (the validation panel covers warning-driven navigation).

import { useMemo } from "react";
import { C, NPCS, Portrait } from "./shared.jsx";
import { computeStoryStats, NARRATOR_SPEAKER } from "./storyStats.js";

function MetricCard({ label, value, hint, tone = "default" }) {
  const tones = {
    default: { bg: C.parchmentDeep, fg: C.ink, accent: C.inkLight, border: C.border },
    alarm:   { bg: "rgba(194,59,34,0.08)", fg: C.redDeep, accent: C.redDeep, border: C.redDeep },
    good:    { bg: "rgba(90,158,75,0.10)", fg: C.greenDeep, accent: C.greenDeep, border: C.greenDeep },
    info:    { bg: "rgba(43,34,24,0.05)", fg: C.ink, accent: C.emberDeep, border: C.border },
  };
  const t = tones[tone] || tones.default;
  return (
    <div style={{ background: t.bg, border: `1.5px solid ${t.border}55`, borderRadius: 10,
      padding: "8px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ font: "700 9px/1 system-ui", letterSpacing: "0.08em", textTransform: "uppercase", color: t.accent }}>
        {label}
      </span>
      <span style={{ font: "700 18px/1 system-ui", color: t.fg }}>{value}</span>
      {hint && <span style={{ font: "italic 400 10px/1.3 system-ui", color: C.inkSubtle }}>{hint}</span>}
    </div>
  );
}

function formatPercent(n) {
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function formatAvg(n) {
  if (!Number.isFinite(n) || n === 0) return "—";
  return n.toFixed(1);
}

function formatSigned(n) {
  if (!Number.isFinite(n) || n === 0) return "0";
  return n > 0 ? `+${n}` : String(n);
}

export default function StatsPanel({ draft }) {
  const stats = useMemo(() => computeStoryStats(draft), [draft]);
  const topNpcLines = Math.max(1, ...stats.npcs.map((n) => n.lines));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <section>
        <div style={{ font: "700 10px/1 system-ui", letterSpacing: "0.12em", textTransform: "uppercase",
          color: C.inkSubtle, marginBottom: 6 }}>Story totals</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
          <MetricCard label="Beats" value={stats.totalBeats} hint={stats.draftBeats ? `+${stats.draftBeats} drafts` : "all built-in"} />
          <MetricCard label="Dialogue lines" value={stats.totalLines} />
          <MetricCard label="Words" value={stats.totalWords.toLocaleString()} hint={`avg ${Math.round(stats.totalWords / Math.max(1, stats.totalLines))} per line`} />
          <MetricCard label="Choices" value={stats.totalChoices} hint={`across ${stats.beatsWithChoices} forks`} />
          <MetricCard label="Fork density" value={formatPercent(stats.forkDensity)}
            hint={`avg ${formatAvg(stats.avgChoicesPerFork)} choices/fork`}
            tone={stats.forkDensity > 0 ? "info" : "default"} />
          <MetricCard label="Unreachable" value={stats.unreachableCount}
            tone={stats.unreachableCount > 0 ? "alarm" : "good"}
            hint={stats.unreachableCount === 0 ? "every beat reachable" : `${stats.reachableCount} reachable`} />
        </div>
      </section>

      <section>
        <div style={{ font: "700 10px/1 system-ui", letterSpacing: "0.12em", textTransform: "uppercase",
          color: C.inkSubtle, marginBottom: 6 }}>Outcomes</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
          <MetricCard label="Flag sets" value={stats.flagOps.sets} hint={`${stats.flagOps.clears} clears`} />
          <MetricCard label="Coins (Σ)" value={formatSigned(stats.currency.coins)} hint="sum across all choices" />
          <MetricCard label="Embers (Σ)" value={formatSigned(stats.currency.embers)} />
          <MetricCard label="Core ingots (Σ)" value={formatSigned(stats.currency.coreIngots)} />
          <MetricCard label="Gems (Σ)" value={formatSigned(stats.currency.gems)} />
        </div>
      </section>

      <section>
        <div style={{ font: "700 10px/1 system-ui", letterSpacing: "0.12em", textTransform: "uppercase",
          color: C.inkSubtle, marginBottom: 6 }}>Speakers</div>
        <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 80px 80px 90px",
            padding: "5px 10px", background: C.parchmentDeep, font: "700 9px/1 system-ui",
            color: C.inkSubtle, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            <span>Speaker</span><span>Lines</span><span style={{ textAlign: "right" }}>Words</span>
            <span style={{ textAlign: "right" }}>Beats</span><span style={{ textAlign: "right" }}>Bond Δ</span>
          </div>
          {stats.npcs.map((n) => {
            const isNar = n.key === NARRATOR_SPEAKER;
            const npc = NPCS[n.key];
            const name = isNar ? "Narrator" : (npc?.name || n.key);
            const pct = n.lines / topNpcLines;
            return (
              <div key={n.key}
                style={{ display: "grid", gridTemplateColumns: "120px 1fr 80px 80px 90px",
                  alignItems: "center", padding: "5px 10px", borderTop: `1px solid ${C.border}66`,
                  font: "500 11px/1.3 system-ui", color: C.ink }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {isNar
                    ? <span style={{ width: 18, height: 18, borderRadius: "50%", background: "linear-gradient(160deg,#6a5a40,#2a1e10)", color: "#fff", display: "grid", placeItems: "center", font: "700 9px/1 system-ui", flexShrink: 0 }}>✎</span>
                    : <Portrait npcKey={n.key} size={18} />}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ flex: 1, height: 6, background: C.parchmentDeep, borderRadius: 999 }}>
                    <span style={{ display: "block", height: "100%", width: `${Math.max(2, Math.round(pct * 100))}%`,
                      borderRadius: 999, background: isNar ? "#7a6a50" : (npc?.color || C.ember) }} />
                  </span>
                  <span style={{ font: "600 10px/1 ui-monospace,monospace", color: C.inkSubtle, width: 26, textAlign: "right" }}>{n.lines}</span>
                </span>
                <span style={{ textAlign: "right", font: "500 11px/1 ui-monospace,monospace", color: C.inkSubtle }}>{n.words}</span>
                <span style={{ textAlign: "right", font: "500 11px/1 ui-monospace,monospace", color: C.inkSubtle }}>{n.beats}</span>
                <span style={{ textAlign: "right", font: "500 11px/1 ui-monospace,monospace",
                  color: n.bondDelta > 0 ? C.greenDeep : (n.bondDelta < 0 ? C.redDeep : C.inkSubtle) }}>
                  {formatSigned(n.bondDelta)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {stats.longestBeats.length > 0 && (
        <section>
          <div style={{ font: "700 10px/1 system-ui", letterSpacing: "0.12em", textTransform: "uppercase",
            color: C.inkSubtle, marginBottom: 6 }}>Longest beats</div>
          <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            {stats.longestBeats.map((b) => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "5px 10px", borderBottom: `1px solid ${C.border}66`,
                font: "500 11px/1.3 system-ui", color: C.ink }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{b.title}</span>
                <span style={{ font: "600 10px/1 ui-monospace,monospace", color: C.inkSubtle }}>
                  {b.words}w · {b.lines}l
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
