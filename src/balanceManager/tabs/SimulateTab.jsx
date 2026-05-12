// Balance Manager · Simulate tab — walk story beats with arbitrary start state.
//
// Drives the SAME pure helpers the game uses (applyChoiceOutcome / applyBeatResult
// / beatLines / beatChoices) over a minimal sim-state slice, so a "run" here is
// faithful to the real dialogue flow. Picking a choice applies its outcome
// (flags / bonds / currencies / resources) and follows `queueBeat` chains; the
// run ends when the beat queue empties. Records a path trace + choice log and
// exports either as a Markdown transcript or a JSON choice log.

import { useState, useMemo, useCallback, useRef } from "react";
import {
  STORY_BEATS, SIDE_BEATS, SCENE_THEMES,
  findBeat, beatLines, beatChoices, beatIsContinueOnly, interpolateBeatText,
  applyChoiceOutcome, applyBeatResult, firedFlagKey,
} from "../../story.js";
import { NPCS } from "../../constants.js";
import { displayZoneName } from "../../features/zones/data.js";
import { COLORS, SmallButton } from "../shared.jsx";

const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif';
const ALL_BEATS = [
  ...STORY_BEATS.map((b) => ({ b, group: `Act ${b.act ?? "?"}`, color: actColor(b.act) })),
  ...SIDE_BEATS.map((b) => ({ b, group: "Side events", color: "#7e7aa6" })),
];
const NPC_KEYS = Object.keys(NPCS);

function actColor(act) {
  return act === 1 ? "#7a8b5e" : act === 2 ? "#c9863a" : act === 3 ? "#a8431a" : "#8b6845";
}

// ─── Sim-state ───────────────────────────────────────────────────────────────

function blankSim(cfg = {}) {
  const flags = { ...(cfg.flags || {}) };
  const bonds = {};
  for (const k of NPC_KEYS) bonds[k] = Number.isFinite(cfg.bonds?.[k]) ? cfg.bonds[k] : 5;
  return {
    story: { act: cfg.act ?? 1, flags, queuedBeat: null, beatQueue: [], choiceLog: [] },
    npcs: { bonds, roster: [...NPC_KEYS] },
    coins: cfg.coins ?? 0, embers: cfg.embers ?? 0, coreIngots: cfg.coreIngots ?? 0, gems: cfg.gems ?? 0,
    heirlooms: {}, inventory: {}, unlockedBiomes: {},
    zoneNames: { home: cfg.settlement || "" },
  };
}

/** Begin a run at the given beat with the supplied start config. */
function startRun(beatId, cfg) {
  const beat = findBeat(beatId);
  const s = blankSim(cfg);
  return { ...s, story: { ...s.story, queuedBeat: beat || null, beatQueue: [] } };
}

/** Apply a choice (or "continue") on the current beat and pop the queue. Pure. */
function advance(sim, choiceId, value) {
  const beat = sim.story.queuedBeat;
  if (!beat) return sim;
  const choice = beatChoices(beat).find((c) => c.id === choiceId) || beatChoices(beat)[0];
  // record
  const entry = { beatId: beat.id, choiceId: choice.id, ts: Date.now() };
  if (value !== undefined) entry.value = value;
  let next = { ...sim, story: { ...sim.story, choiceLog: [...sim.story.choiceLog, entry] } };
  // optional free-text prompt → settlement name etc.
  if (value !== undefined && beat.prompt?.kind === "name_settlement") {
    next = { ...next, zoneNames: { ...next.zoneNames, [beat.prompt.zoneId || "home"]: value } };
  }
  // beat-level onComplete (setFlag / spawnNPC / advanceAct / …) + fired marker
  next = applyBeatResult(next, beat.onComplete || {});
  if (!beat.onComplete?.setFlag) {
    next = { ...next, story: { ...next.story, flags: { ...next.story.flags, [firedFlagKey(beat.id)]: true } } };
  }
  // choice outcome (flags / bonds / currencies / resources / queueBeat)
  next = applyChoiceOutcome(next, choice.outcome);
  // pop the queue
  const q = next.story.beatQueue || [];
  next = { ...next, story: { ...next.story, queuedBeat: q[0] || null, beatQueue: q.slice(1) } };
  return next;
}

/** Push a beat onto the run (jump-to) without ending the current one. */
function enqueue(sim, beatId) {
  const beat = findBeat(beatId);
  if (!beat) return sim;
  if (sim.story.queuedBeat) return { ...sim, story: { ...sim.story, beatQueue: [...sim.story.beatQueue, beat] } };
  return { ...sim, story: { ...sim.story, queuedBeat: beat, beatQueue: [] } };
}

// ─── Outcome decoding (player-facing reward badges) ──────────────────────────

function decodeOutcome(outcome) {
  const o = outcome && typeof outcome === "object" ? outcome : {};
  const out = [];
  if (o.bondDelta && Number.isFinite(o.bondDelta.amount) && o.bondDelta.amount !== 0) {
    out.push({ label: `♥ ${o.bondDelta.amount > 0 ? "+" : ""}${o.bondDelta.amount} ${NPCS[o.bondDelta.npc]?.name || o.bondDelta.npc}`, tone: "green" });
  }
  for (const [key, name, tone] of [["embers", "Embers", "ember"], ["coreIngots", "Core Ingots", "slate"], ["gems", "Gems", "gold"], ["coins", "Coins", "gold"]]) {
    if (Number.isFinite(o[key]) && o[key]) out.push({ label: `${o[key] > 0 ? "+" : ""}${o[key]} ${name}`, tone });
  }
  for (const [k, v] of Object.entries(o.resources || {})) if (Number.isFinite(v) && v) out.push({ label: `${v > 0 ? "+" : ""}${v} ${k.split("_").pop()}`, tone: "iron" });
  for (const [k, v] of Object.entries(o.heirlooms || {})) if (Number.isFinite(v) && v) out.push({ label: `${v > 0 ? "+" : ""}${v} ${k.split("_").pop()}`, tone: "gold" });
  const flags = Array.isArray(o.setFlag) ? o.setFlag : o.setFlag ? [o.setFlag] : [];
  for (const f of flags) out.push({ label: `⚑ ${f}`, tone: "flag" });
  if (typeof o.queueBeat === "string") out.push({ label: `→ ${o.queueBeat}`, tone: "queue" });
  return out;
}

const TONE = {
  iron:  { bg: "rgba(178,139,98,0.16)",  fg: "#7a5a38" },
  gold:  { bg: "rgba(226,178,74,0.20)",  fg: "#7a5810" },
  ember: { bg: "rgba(214,97,42,0.14)",   fg: "#a84010" },
  green: { bg: "rgba(90,158,75,0.18)",   fg: "#3e7236" },
  slate: { bg: "rgba(90,94,102,0.14)",   fg: "#5a5e66" },
  flag:  { bg: "rgba(60,70,90,0.10)",    fg: "#475068" },
  queue: { bg: "rgba(226,178,74,0.14)",  fg: "#7a5810" },
};

function Badge({ tone = "iron", children }) {
  const t = TONE[tone] || TONE.iron;
  return (
    <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide whitespace-nowrap"
      style={{ background: t.bg, color: t.fg, border: `1px solid ${t.fg}33` }}>{children}</span>
  );
}

function NpcDot({ npcKey, size = 14 }) {
  const npc = NPCS[npcKey];
  return (
    <span aria-hidden="true" className="rounded-full inline-grid place-items-center text-white flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.55, fontFamily: SERIF, fontWeight: 600,
               background: `radial-gradient(circle at 32% 26%, rgba(255,255,255,0.4), transparent 55%), ${npc?.color || "#5a4a30"}` }}>
      {npc ? npc.name[0] : "✦"}
    </span>
  );
}

// ─── Live preview (compact in-game dialog) ───────────────────────────────────

function PreviewPanel({ beat, sim, onChoice, onPrompt }) {
  const [draft, setDraft] = useState("");
  const settlement = displayZoneName(sim, "home");
  if (!beat) {
    return (
      <div className="flex-1 grid place-items-center" style={{ color: COLORS.inkSubtle }}>
        <div className="text-center">
          <div className="text-[28px] opacity-30">✦</div>
          <div className="text-[12px] italic mt-1">Run ended — the beat queue is empty. Pick “Start from…” or jump to a beat.</div>
        </div>
      </div>
    );
  }
  const lines = beatLines(beat).map((l) => ({ ...l, text: interpolateBeatText(l.text, { settlement }) }));
  const choices = beatChoices(beat);
  const continueOnly = beatIsContinueOnly(beat);
  const headNpcKey = lines.find((l) => l.speaker)?.speaker ?? null;
  const npc = headNpcKey ? NPCS[headNpcKey] : null;
  const scene = SCENE_THEMES[beat.scene] || null;
  return (
    <div className="flex-1 min-h-0 grid place-items-center p-4" style={{ background: scene?.bg || "radial-gradient(120% 100% at 50% 0%, #2c3640, #0c0f12)" }}>
      <div className="w-full max-w-[420px] shadow-2xl flex flex-col" style={{
        background: "linear-gradient(180deg, #221710 0%, #1a110a 100%)", border: "1px solid #3a2a1d",
        borderRadius: 20, padding: "16px 16px 14px", maxHeight: "100%" }}>
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(226,178,74,0.5), transparent)", marginBottom: 12 }} />
        <div className="flex justify-between items-baseline gap-2 mb-3">
          <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 19, lineHeight: 1.15, color: "#f0c965" }}>{beat.title}</div>
          <div style={{ fontWeight: 600, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(240,230,207,0.4)", whiteSpace: "nowrap" }}>
            {beat.act ? `Act ${["", "I", "II", "III"][beat.act] || beat.act}` : beat.trigger?.type === "bond_at_least" ? `Bond ${beat.trigger.amount}` : "Side"}
          </div>
        </div>
        {npc && (
          <div className="flex items-center gap-3 mb-3">
            <NpcDot npcKey={headNpcKey} size={44} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, letterSpacing: "0.05em", textTransform: "uppercase", color: npc.color }}>{npc.name}</div>
              {npc.role && <div style={{ fontSize: 11, color: "rgba(240,230,207,0.5)", marginTop: 2 }}>{npc.role}</div>}
            </div>
          </div>
        )}
        <div className="min-h-0 overflow-y-auto flex flex-col gap-2" style={{ marginBottom: 14, maxHeight: 240 }}>
          {lines.map((l, i) => {
            const showLabel = l.speaker && l.speaker !== (i > 0 ? lines[i - 1].speaker : undefined);
            return (
              <div key={i}>
                {showLabel && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: NPCS[l.speaker]?.color || "#b28b62", marginBottom: 2 }}>{NPCS[l.speaker]?.name || l.speaker}</div>}
                <p style={{ margin: 0, fontFamily: SERIF, fontSize: 13.5, lineHeight: 1.5, fontStyle: l.speaker ? "normal" : "italic", color: l.speaker ? "#f0e6cf" : "rgba(189,154,114,0.95)" }}>{l.text}</p>
              </div>
            );
          })}
          {lines.length === 0 && <p style={{ margin: 0, fontFamily: SERIF, fontSize: 13, fontStyle: "italic", color: "rgba(189,154,114,0.8)" }}>(this beat has no authored lines)</p>}
        </div>
        {beat.prompt ? (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); onPrompt(draft.trim()); setDraft(""); }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={beat.prompt.placeholder || ""} maxLength={24}
              className="flex-1 min-w-0 rounded-lg outline-none" style={{ padding: "8px 10px", background: "rgba(15,10,6,0.7)", color: "#f0e6cf", border: "1.5px solid #f0c965", fontFamily: SERIF, fontSize: 14 }} />
            <button type="submit" className="rounded-lg font-bold uppercase whitespace-nowrap" style={{ padding: "0 14px", background: "linear-gradient(180deg,#f0c965,#e2b24a)", border: "1px solid #e2b24a", color: "#3a2715", fontSize: 12, letterSpacing: "0.04em" }}>{beat.prompt.buttonLabel || "OK"}</button>
          </form>
        ) : continueOnly ? (
          <div className="flex justify-end">
            <button onClick={() => onChoice("continue")} className="rounded-full font-bold uppercase" style={{ padding: "7px 16px", background: "linear-gradient(180deg,#f0c965,#e2b24a)", border: "1px solid #e2b24a", color: "#3a2715", fontSize: 11, letterSpacing: "0.05em" }}>{choices[0].label}</button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(226,178,74,0.4), transparent)" }} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(226,178,74,0.7)" }}>Your reply</span>
              <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(226,178,74,0.4))" }} />
            </div>
            {choices.map((c, i) => {
              const badges = decodeOutcome(c.outcome);
              return (
                <button key={c.id} onClick={() => onChoice(c.id)} className="text-left rounded-xl flex flex-col gap-1.5 transition-colors"
                  style={{ padding: "10px 12px", background: "rgba(58,42,29,0.55)", border: "1px solid rgba(178,139,98,0.32)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(226,178,74,0.6)"; e.currentTarget.style.background = "rgba(72,53,33,0.7)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(178,139,98,0.32)"; e.currentTarget.style.background = "rgba(58,42,29,0.55)"; }}>
                  <span className="flex gap-2 items-start">
                    <span className="grid place-items-center flex-shrink-0 rounded-full" style={{ width: 20, height: 20, background: "rgba(178,139,98,0.28)", color: "rgba(240,230,207,0.85)", fontWeight: 700, fontSize: 10, fontFamily: "ui-monospace,monospace" }}>{["A", "B", "C", "D", "E"][i] || "•"}</span>
                    <span style={{ flex: 1, fontFamily: SERIF, fontSize: 13.5, lineHeight: 1.4, color: "#f0e6cf" }}>{c.label}</span>
                  </span>
                  {badges.length > 0 && <span className="flex flex-wrap gap-1" style={{ paddingLeft: 28 }}>{badges.map((b, j) => <Badge key={j} tone={b.tone}>{b.label}</Badge>)}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Transcript / log export ─────────────────────────────────────────────────

function buildTranscript(trace, settlement) {
  const out = [`# Dialogue run — ${trace.length} step${trace.length === 1 ? "" : "s"}${settlement ? ` · ${settlement}` : ""}`, ""];
  for (let i = 0; i < trace.length; i++) {
    const t = trace[i];
    out.push(`## ${i + 1}. ${t.title}  (${t.beatId})`);
    for (const l of t.lines) out.push(l.speaker ? `**${NPCS[l.speaker]?.name || l.speaker}:** ${l.text}` : `_${l.text}_`);
    if (t.choiceLabel) out.push("", `> **Chose (${t.choiceId}):** “${t.choiceLabel}”`);
    if (t.outcome.length) out.push("", `Outcome: ${t.outcome.map((b) => b.label).join(" · ")}`);
    out.push("");
  }
  return out.join("\n");
}

function copyText(str, onDone) {
  try {
    if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(str).then(() => onDone?.(), () => onDone?.("clipboard blocked")); return; }
  } catch { /* fall through */ }
  onDone?.("clipboard unavailable");
}

// ─── Tab ─────────────────────────────────────────────────────────────────────

export default function SimulateTab() {
  const [cfg, setCfg] = useState({ act: 2, settlement: "Emberhollow", flags: {}, bonds: {}, coins: 0, embers: 0, coreIngots: 0, gems: 0 });
  const [startId, setStartId] = useState("act1_arrival");
  const [sim, setSim] = useState(() => startRun("act1_arrival", { act: 2, settlement: "Emberhollow" }));
  const [history, setHistory] = useState([]);          // stack of prior sims (Back)
  const [trace, setTrace] = useState([]);              // [{ beatId, title, lines, speaker, choiceId, choiceLabel, outcome }]
  const [jumpId, setJumpId] = useState("");
  const [exportText, setExportText] = useState(null);  // { kind, text }
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef(null);
  const flash = (msg) => { setNotice(msg); clearTimeout(noticeTimer.current); noticeTimer.current = setTimeout(() => setNotice(""), 2200); };

  const knownFlags = useMemo(() => {
    const set = new Set();
    for (const { b } of ALL_BEATS) {
      if (b.onComplete?.setFlag) set.add(b.onComplete.setFlag);
      for (const c of b.choices || []) {
        const f = c.outcome?.setFlag; (Array.isArray(f) ? f : f ? [f] : []).forEach((x) => set.add(x));
        const cl = c.outcome?.clearFlag; (Array.isArray(cl) ? cl : cl ? [cl] : []).forEach((x) => set.add(x));
      }
      if (b.trigger?.type === "session_start") { /* none */ }
    }
    return [...set].filter((f) => !f.startsWith("_fired_")).sort();
  }, []);

  const settlement = displayZoneName(sim, "home");
  const currentBeat = sim.story.queuedBeat;
  const continueOnly = currentBeat ? beatIsContinueOnly(currentBeat) : false;

  const resetTo = useCallback((beatId, c) => {
    const fresh = startRun(beatId, c);
    setSim(fresh); setHistory([]); setTrace([]); setExportText(null);
  }, []);

  const recordStep = useCallback((beat, choice, value, lines) => {
    setTrace((tr) => [...tr, {
      beatId: beat.id, title: beat.title || beat.id, lines,
      speaker: lines.find((l) => l.speaker)?.speaker ?? null,
      choiceId: choice?.id ?? null,
      choiceLabel: choice && choice.id !== "continue" ? choice.label : (value !== undefined ? `(entered “${value}”)` : null),
      outcome: choice ? decodeOutcome(choice.outcome) : [],
    }]);
  }, []);

  const doAdvance = useCallback((choiceId, value) => {
    const beat = sim.story.queuedBeat;
    if (!beat) return;
    const ss = settlement;
    const lines = beatLines(beat).map((l) => ({ ...l, text: interpolateBeatText(l.text, { settlement: value !== undefined && beat.prompt?.kind === "name_settlement" ? value : ss }) }));
    const choice = beatChoices(beat).find((c) => c.id === choiceId) || beatChoices(beat)[0];
    const nextSim = advance(sim, choiceId, value);
    setHistory((h) => [...h, sim]);
    recordStep(beat, choice, value, lines);
    setSim(nextSim);
  }, [sim, settlement, recordStep]);

  const playAuto = useCallback(() => {
    // walk forward through continue-only beats until a choice / prompt / end (cap 60)
    let s = sim; let n = 0; const newTrace = [];
    while (s.story.queuedBeat && beatIsContinueOnly(s.story.queuedBeat) && !s.story.queuedBeat.prompt && n < 60) {
      const beat = s.story.queuedBeat;
      const lines = beatLines(beat).map((l) => ({ ...l, text: interpolateBeatText(l.text, { settlement: displayZoneName(s, "home") }) }));
      newTrace.push({ beatId: beat.id, title: beat.title || beat.id, lines, speaker: lines.find((l) => l.speaker)?.speaker ?? null, choiceId: "continue", choiceLabel: null, outcome: [] });
      s = advance(s, "continue"); n++;
    }
    if (n === 0) { flash("Nothing to auto-play — pick a choice."); return; }
    setHistory((h) => [...h, sim]);
    setTrace((tr) => [...tr, ...newTrace]);
    setSim(s);
  }, [sim]);

  const goBack = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) { flash("Nothing to undo."); return h; }
      setSim(h[h.length - 1]);
      setTrace((tr) => tr.slice(0, -1));
      setExportText(null);
      return h.slice(0, -1);
    });
  }, []);

  const doJump = useCallback(() => {
    if (!jumpId) return;
    setHistory((h) => [...h, sim]);
    setSim((s) => enqueue(s, jumpId));
    flash(`Queued ${jumpId}`);
  }, [jumpId, sim]);

  // ── Render ──
  const startGroups = useMemo(() => {
    const m = new Map();
    for (const e of ALL_BEATS) { if (!m.has(e.group)) m.set(e.group, []); m.get(e.group).push(e); }
    return [...m.entries()];
  }, []);

  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      {/* Transport row */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border-2 flex-shrink-0" style={{ background: COLORS.parchmentDeep, borderColor: COLORS.border }}>
        <div>
          <div className="text-[12px] font-bold" style={{ color: COLORS.ink }}>Dialogue Simulator</div>
          <div className="text-[10px] italic" style={{ color: COLORS.inkSubtle }}>Walk story beats with arbitrary start state. Path + outcomes recorded.</div>
        </div>
        <div className="flex items-center gap-1.5 ml-1">
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: COLORS.inkSubtle }}>Start from</span>
          <select value={startId} onChange={(e) => setStartId(e.target.value)} className="text-[11px] rounded-md border-2 px-1.5 py-1" style={{ background: "#fff", borderColor: COLORS.border, color: COLORS.ink }}>
            {startGroups.map(([g, items]) => (
              <optgroup key={g} label={g}>
                {items.map(({ b }) => <option key={b.id} value={b.id}>{b.id}{b.title ? ` — ${b.title}` : ""}</option>)}
              </optgroup>
            ))}
          </select>
          <SmallButton onClick={() => resetTo(startId, cfg)} variant="primary">▶ Start run</SmallButton>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <SmallButton onClick={() => resetTo(startId, cfg)} title="Restart from the start beat with the current config">↺ Restart</SmallButton>
          <SmallButton onClick={goBack} disabled={history.length === 0} title="Undo the last step">◀ Back</SmallButton>
          <SmallButton onClick={() => doAdvance("continue")} disabled={!continueOnly || !!currentBeat?.prompt} title="Advance a continue-only beat">▷ Step</SmallButton>
          <SmallButton onClick={playAuto} disabled={!currentBeat} title="Auto-advance until a choice / prompt / end">▶ Play</SmallButton>
        </div>
      </div>

      {notice && <div className="text-[11px] px-3 py-1 rounded-md flex-shrink-0" style={{ background: COLORS.parchmentDeep, color: COLORS.inkLight, border: `1px solid ${COLORS.border}` }}>{notice}</div>}

      {/* 3 columns */}
      <div className="flex-1 min-h-0 grid gap-2" style={{ gridTemplateColumns: "260px minmax(0,1fr) 320px" }}>
        {/* ── Start state ── */}
        <div className="rounded-lg border-2 overflow-y-auto p-3 flex flex-col gap-3" style={{ background: COLORS.parchment, borderColor: COLORS.border }}>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: COLORS.inkSubtle }}>Start state</div>
            <div className="text-[10px] italic" style={{ color: COLORS.inkSubtle }}>Applied on Restart / Start run.</div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center justify-between gap-2 text-[11px] font-bold" style={{ color: COLORS.ink }}>
              Act
              <select value={cfg.act} onChange={(e) => setCfg({ ...cfg, act: Number(e.target.value) })} className="text-[11px] rounded border px-1.5 py-0.5" style={{ borderColor: COLORS.border }}>
                {[1, 2, 3].map((a) => <option key={a} value={a}>Act {["", "I", "II", "III"][a]}</option>)}
              </select>
            </label>
            <label className="flex items-center justify-between gap-2 text-[11px] font-bold" style={{ color: COLORS.ink }}>
              Settlement
              <input value={cfg.settlement} onChange={(e) => setCfg({ ...cfg, settlement: e.target.value })} maxLength={24} className="text-[11px] rounded border px-1.5 py-0.5 w-[120px]" style={{ borderColor: COLORS.border }} />
            </label>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.inkSubtle }}>Story flags</div>
            <div className="flex flex-col gap-0.5">
              {knownFlags.map((f) => (
                <label key={f} className="flex items-center justify-between gap-2 text-[10px] cursor-pointer" style={{ fontFamily: "ui-monospace,monospace", color: cfg.flags[f] ? COLORS.ink : COLORS.inkSubtle }}>
                  <span className="truncate">{f}</span>
                  <input type="checkbox" checked={!!cfg.flags[f]} onChange={(e) => setCfg({ ...cfg, flags: { ...cfg.flags, [f]: e.target.checked } })} />
                </label>
              ))}
              {knownFlags.length === 0 && <span className="text-[10px] italic" style={{ color: COLORS.inkSubtle }}>none referenced</span>}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.inkSubtle }}>NPC bonds (0–10)</div>
            <div className="flex flex-col gap-1.5">
              {NPC_KEYS.map((k) => {
                const v = Number.isFinite(cfg.bonds[k]) ? cfg.bonds[k] : 5;
                return (
                  <div key={k}>
                    <div className="flex items-center gap-1.5 text-[10px]" style={{ color: COLORS.ink }}>
                      <NpcDot npcKey={k} size={14} /> {NPCS[k].name}
                      <span className="ml-auto font-bold" style={{ fontFamily: "ui-monospace,monospace", color: NPCS[k].color }}>{v}</span>
                    </div>
                    <input type="range" min={0} max={10} step={1} value={v} onChange={(e) => setCfg({ ...cfg, bonds: { ...cfg.bonds, [k]: Number(e.target.value) } })} className="w-full" style={{ accentColor: NPCS[k].color }} />
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.inkSubtle }}>Meta-currencies</div>
            <div className="flex flex-col gap-1">
              {[["coins", "Coins"], ["embers", "Embers"], ["coreIngots", "Core Ingots"], ["gems", "Gems"]].map(([k, label]) => (
                <label key={k} className="flex items-center justify-between gap-2 text-[10px] font-bold" style={{ color: COLORS.ink }}>
                  {label}
                  <input type="number" min={0} value={cfg[k]} onChange={(e) => setCfg({ ...cfg, [k]: Math.max(0, Number(e.target.value) || 0) })} className="text-[10px] rounded border px-1.5 py-0.5 w-[64px] text-right" style={{ borderColor: COLORS.border, fontFamily: "ui-monospace,monospace" }} />
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── Live preview ── */}
        <div className="rounded-lg border-2 overflow-hidden flex flex-col min-h-0" style={{ borderColor: COLORS.border }}>
          <div className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0" style={{ background: COLORS.parchmentDeep, borderBottom: `1px solid ${COLORS.border}` }}>
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: COLORS.inkSubtle }}>Live preview</span>
            {currentBeat && <><span style={{ width: 1, height: 12, background: COLORS.border }} /><Badge tone="gold">{currentBeat.scene || "no scene"}</Badge><Badge tone="ember">{currentBeat.id}</Badge></>}
            <span className="ml-auto text-[10px]" style={{ color: COLORS.inkSubtle }}>Step <b style={{ fontFamily: "ui-monospace,monospace" }}>{trace.length}{currentBeat ? "" : " · done"}</b></span>
          </div>
          <PreviewPanel beat={currentBeat} sim={sim} onChoice={(id) => doAdvance(id)} onPrompt={(v) => doAdvance("continue", v)} />
        </div>

        {/* ── Path trace + export ── */}
        <div className="rounded-lg border-2 overflow-y-auto p-3 flex flex-col gap-2" style={{ background: COLORS.parchment, borderColor: COLORS.border }}>
          <div className="flex items-baseline justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: COLORS.inkSubtle }}>Path trace · {trace.length} step{trace.length === 1 ? "" : "s"}</div>
          </div>
          {trace.length === 0 && <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>No steps yet — interact with the preview.</div>}
          <ol className="flex flex-col gap-1.5">
            {trace.map((t, i) => (
              <li key={i} className="rounded-lg border p-2" style={{ background: "#fff", borderColor: COLORS.border }}>
                <div className="flex items-center gap-1.5">
                  <span className="grid place-items-center rounded-full text-white text-[9px] font-bold flex-shrink-0" style={{ width: 18, height: 18, fontFamily: "ui-monospace,monospace", background: COLORS.inkLight }}>{i + 1}</span>
                  <span className="text-[12px] font-bold truncate" style={{ fontFamily: SERIF, color: COLORS.ink }}>{t.title}</span>
                  {t.speaker && <NpcDot npcKey={t.speaker} size={14} />}
                </div>
                <div className="text-[9px] mt-0.5 truncate" style={{ fontFamily: "ui-monospace,monospace", color: COLORS.inkSubtle }}>{t.beatId}</div>
                {t.choiceLabel && (
                  <div className="mt-1 px-2 py-1 rounded" style={{ background: "rgba(214,97,42,0.07)", border: "1px solid rgba(214,97,42,0.22)" }}>
                    <div className="text-[8px] font-bold uppercase tracking-wide" style={{ color: COLORS.emberDeep }}>Chose · {t.choiceId}</div>
                    <div className="text-[11px]" style={{ fontFamily: SERIF, color: COLORS.ink }}>{t.choiceLabel}</div>
                  </div>
                )}
                {t.outcome.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{t.outcome.map((b, j) => <Badge key={j} tone={b.tone}>{b.label}</Badge>)}</div>}
              </li>
            ))}
          </ol>

          {/* Jump-to */}
          <div className="mt-1 flex items-center gap-1.5">
            <select value={jumpId} onChange={(e) => setJumpId(e.target.value)} className="flex-1 text-[10px] rounded border px-1 py-0.5" style={{ borderColor: COLORS.border }}>
              <option value="">Jump to a beat…</option>
              {startGroups.map(([g, items]) => <optgroup key={g} label={g}>{items.map(({ b }) => <option key={b.id} value={b.id}>{b.id}</option>)}</optgroup>)}
            </select>
            <SmallButton onClick={doJump} disabled={!jumpId}>Queue</SmallButton>
          </div>

          {/* Export */}
          <div className="mt-1 rounded-lg p-2" style={{ background: COLORS.parchmentDeep, border: `1px solid ${COLORS.border}` }}>
            <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: COLORS.inkSubtle }}>Export run</div>
            <div className="flex flex-col gap-1">
              <SmallButton onClick={() => { const txt = buildTranscript(trace, settlement); setExportText({ kind: "Markdown transcript", text: txt }); copyText(txt, (err) => flash(err || "Transcript copied to clipboard")); }} disabled={trace.length === 0}>↓ Markdown transcript (copy)</SmallButton>
              <SmallButton onClick={() => { const txt = JSON.stringify(sim.story.choiceLog, null, 2); setExportText({ kind: "JSON choice log", text: txt }); copyText(txt, (err) => flash(err || "Choice log copied to clipboard")); }} disabled={sim.story.choiceLog.length === 0}>↓ JSON choice log (copy)</SmallButton>
            </div>
            {exportText && (
              <textarea readOnly value={exportText.text} className="mt-1.5 w-full text-[9px] rounded border p-1" rows={6} style={{ borderColor: COLORS.border, fontFamily: "ui-monospace,monospace", background: "#fff", color: COLORS.ink }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
