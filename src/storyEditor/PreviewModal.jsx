// Story Tree Editor — branch preview ("play" the dialogue).
// A self-contained modal that renders a beat as it would appear in-game
// (parchment-and-iron stage, serif dialogue, choice buttons) and lets you walk
// the branch: picking a choice with `outcome.queueBeat` advances to that beat;
// a choice with no follow-up ends the branch. Reads the *effective* beat
// (so unsaved editor edits show up), interpolates `{settlement}` with a sample
// name, and shows each choice's whitelisted outcome as badges. "Open in editor"
// jumps the editor's selection to whatever beat you're looking at.

import { useState, useEffect, useMemo } from "react";
import { interpolateBeatText } from "../story.js";
import { NPCS, effectiveBeat, effectiveChoices, triggerSummary, allBeatIds } from "./shared.jsx";

const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, "Times New Roman", serif';
const SAMPLE_SETTLEMENT = "Hearthhollow";

// parchment-and-iron palette (mirrors the in-game story modal)
const P = {
  panelTop: "#221710", panelBot: "#1a110a", edge: "#3a2a1d",
  gold: "#e2b24a", goldSoft: "#f0c965",
  parch: "#f0e6cf", parchDim: "rgba(240,230,207,0.55)", parchFaint: "rgba(240,230,207,0.32)",
  narration: "rgba(189,154,114,0.95)", iron: "#b28b62",
  choiceBg: "rgba(58,42,29,0.55)", choiceEdge: "rgba(178,139,98,0.32)",
  ember: "#e88a5e",
};

const speakerName = (k) => (k && NPCS[k] ? NPCS[k].name : null);
const speakerColor = (k) => (k && NPCS[k] ? NPCS[k].color : P.iron);

const flagArr = (v) => Array.isArray(v) ? v : (typeof v === "string" && v ? [v] : []);

function blankPreviewState() {
  const bonds = {};
  for (const k of Object.keys(NPCS)) bonds[k] = 5;
  return { flags: {}, bonds, embers: 0, coreIngots: 0, gems: 0 };
}

function applyFlagList(flags, value, on) {
  const next = { ...flags };
  for (const f of flagArr(value)) next[f] = on;
  return next;
}

function applyPreviewEffects(sim, beat, choice) {
  let next = { ...sim, flags: { ...sim.flags }, bonds: { ...sim.bonds } };
  if (beat?.onComplete?.setFlag) next.flags = applyFlagList(next.flags, beat.onComplete.setFlag, true);
  const o = choice?.outcome || {};
  if (o.setFlag) next.flags = applyFlagList(next.flags, o.setFlag, true);
  if (o.clearFlag) next.flags = applyFlagList(next.flags, o.clearFlag, false);
  if (o.bondDelta?.npc && Number.isFinite(o.bondDelta.amount)) {
    const cur = Number.isFinite(next.bonds[o.bondDelta.npc]) ? next.bonds[o.bondDelta.npc] : 5;
    next.bonds[o.bondDelta.npc] = Math.max(0, Math.min(10, cur + o.bondDelta.amount));
  }
  for (const key of ["embers", "coreIngots", "gems"]) {
    if (Number.isFinite(o[key])) next[key] = Math.max(0, (next[key] || 0) + o[key]);
  }
  return next;
}

function firstTriggeredByPreviewState(sim, draft, visited) {
  for (const id of allBeatIds(draft)) {
    if (visited.has(id)) continue;
    const b = effectiveBeat(id, draft);
    const t = b?.trigger;
    if (!t) continue;
    if (t.type === "flag_set" && sim.flags[t.flag]) return id;
    if (t.type === "flag_cleared" && t.flag && !sim.flags[t.flag]) return id;
    if (t.type === "bond_at_least" && (sim.bonds[t.npc] ?? 0) >= t.amount) return id;
  }
  return null;
}

function outcomeBadges(outcome) {
  const o = outcome || {};
  const out = [];
  if (o.bondDelta && o.bondDelta.npc) out.push({ k: "bond", t: "ember", label: `♥ ${o.bondDelta.amount > 0 ? "+" : ""}${o.bondDelta.amount} ${NPCS[o.bondDelta.npc]?.name || o.bondDelta.npc}` });
  if (o.embers) out.push({ k: "emb", t: "gold", label: `✸ ${o.embers > 0 ? "+" : ""}${o.embers} Embers` });
  if (o.coreIngots) out.push({ k: "core", t: "gold", label: `◈ ${o.coreIngots > 0 ? "+" : ""}${o.coreIngots} Core Ingots` });
  if (o.gems) out.push({ k: "gem", t: "gold", label: `◆ ${o.gems > 0 ? "+" : ""}${o.gems} Gems` });
  for (const f of (Array.isArray(o.setFlag) ? o.setFlag : (o.setFlag ? [o.setFlag] : []))) out.push({ k: `sf-${f}`, t: "iron", label: `⚐ ${f}` });
  for (const f of (Array.isArray(o.clearFlag) ? o.clearFlag : (o.clearFlag ? [o.clearFlag] : []))) out.push({ k: `cf-${f}`, t: "slate", label: `⚑ ${f} off` });
  return out;
}
const BADGE_TONE = {
  iron:  { bg: "rgba(178,139,98,0.16)", bd: "rgba(178,139,98,0.5)",  fg: "#dac6a2" },
  gold:  { bg: "rgba(226,178,74,0.18)", bd: "rgba(226,178,74,0.5)",  fg: "#f0c965" },
  ember: { bg: "rgba(214,97,42,0.16)",  bd: "rgba(214,97,42,0.45)",  fg: "#e88a5e" },
  slate: { bg: "rgba(150,165,190,0.14)",bd: "rgba(150,165,190,0.4)", fg: "#bcc6d8" },
};
function Badge({ tone, children }) {
  const t = BADGE_TONE[tone] || BADGE_TONE.iron;
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: 999, border: `1px solid ${t.bd}`, background: t.bg, color: t.fg, font: "600 9px/1 system-ui", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{children}</span>;
}

function Portrait({ npcKey, size = 52 }) {
  const npc = npcKey ? NPCS[npcKey] : null;
  const base = npc ? npc.color : "#5a4a30";
  return (
    <div aria-hidden style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center",
      font: `600 ${Math.round(size * 0.4)}px/1 ${SERIF}`, color: "#fff", border: "2px solid #f0e6cf",
      background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.4), transparent 55%), radial-gradient(circle at 70% 82%, rgba(0,0,0,0.42), transparent 60%), ${base}`,
      boxShadow: "inset 0 -8px 16px rgba(0,0,0,0.25), inset 0 8px 18px rgba(255,255,255,0.18)" }}>
      {npc ? npc.name[0] : "✦"}
    </div>
  );
}

function Lines({ lines }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {lines.map((l, i) => {
        const prev = i > 0 ? lines[i - 1].speaker : undefined;
        const showLabel = l.speaker && l.speaker !== prev;
        return (
          <div key={i}>
            {showLabel && <div style={{ font: "700 11px/1 system-ui", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3, color: speakerColor(l.speaker) }}>{speakerName(l.speaker)}</div>}
            <p style={{ margin: 0, font: `${l.speaker ? "400" : "italic 400"} 16px/1.5 ${SERIF}`, color: l.speaker ? P.parch : P.narration, textWrap: "pretty" }}>{l.text}</p>
          </div>
        );
      })}
      {lines.length === 0 && <p style={{ margin: 0, font: `italic 400 14px/1.5 ${SERIF}`, color: P.parchFaint }}>(no dialogue written yet)</p>}
    </div>
  );
}

// `index.jsx` mounts this with `key={startBeatId}` so the walk state resets
// when you pick a different beat to preview.
export default function PreviewModal({ startBeatId, draft, onClose, onOpenInEditor }) {
  const [path, setPath] = useState([startBeatId]);
  const [ended, setEnded] = useState(null); // { choice } once a terminal choice is taken
  const [simPath, setSimPath] = useState(() => [blankPreviewState()]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const knownIds = useMemo(() => new Set(allBeatIds(draft)), [draft]);
  const currentId = path[path.length - 1];
  const beat = effectiveBeat(currentId, draft);
  const sim = simPath[simPath.length - 1] || blankPreviewState();

  if (!beat) {
    return (
      <Backdrop onClose={onClose}>
        <div style={{ ...panelStyle, padding: 22, color: P.parch, font: `400 14px/1.5 ${SERIF}` }}>
          <p style={{ margin: 0 }}>Beat <code style={{ fontFamily: "ui-monospace,monospace" }}>{currentId}</code> doesn’t exist.</p>
          <button onClick={onClose} style={closeBtnStyle}>✕ Close</button>
        </div>
      </Backdrop>
    );
  }

  const lines = (Array.isArray(beat.lines) && beat.lines.length > 0)
    ? beat.lines.map((l) => ({ speaker: l?.speaker ?? null, text: interpolateBeatText(l?.text ?? "", { settlement: SAMPLE_SETTLEMENT }) }))
    : (typeof beat.body === "string" && beat.body ? [{ speaker: null, text: interpolateBeatText(beat.body, { settlement: SAMPLE_SETTLEMENT }) }] : []);
  const speaker = lines.find((l) => l.speaker)?.speaker || null;
  const choices = effectiveChoices(currentId, draft);
  const isPrompt = !!beat.prompt;
  const ts = triggerSummary(beat);

  const pick = (c) => {
    const nextSim = applyPreviewEffects(sim, beat, c);
    const target = c?.outcome?.queueBeat;
    if (target && knownIds.has(target)) { setPath((p) => [...p, target]); setSimPath((p) => [...p, nextSim]); setEnded(null); return; }
    const triggered = firstTriggeredByPreviewState(nextSim, draft, new Set(path));
    if (triggered) { setPath((p) => [...p, triggered]); setSimPath((p) => [...p, nextSim]); setEnded(null); return; }
    setSimPath((p) => [...p.slice(0, path.length), nextSim]);
    setEnded({ choice: c });
  };

  return (
    <Backdrop onClose={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        {/* gold hairline */}
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(226,178,74,0.5), transparent)", marginBottom: 12, flexShrink: 0 }} />

        {/* breadcrumb / controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap", flexShrink: 0 }}>
          <span style={{ font: "700 8px/1 system-ui", letterSpacing: "0.16em", textTransform: "uppercase", color: P.parchFaint }}>Preview</span>
          {path.map((id, i) => (
            <span key={`${id}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {i > 0 && <span style={{ color: P.parchFaint, fontSize: 10 }}>›</span>}
              <button onClick={() => { setPath(path.slice(0, i + 1)); setSimPath(simPath.slice(0, i + 1)); setEnded(null); }}
                style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0,
                  font: `${i === path.length - 1 ? "600" : "400"} 11px/1.2 ${SERIF}`,
                  color: i === path.length - 1 ? P.goldSoft : P.parchDim, textDecoration: i === path.length - 1 ? "none" : "underline" }}>
                {effectiveBeat(id, draft)?.title || id}
              </button>
            </span>
          ))}
          <span style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
            {path.length > 1 && <SmallBtn onClick={() => { setPath(path.slice(0, -1)); setSimPath(simPath.slice(0, -1)); setEnded(null); }}>← Back</SmallBtn>}
            {(path.length > 1 || ended) && <SmallBtn onClick={() => { setPath([startBeatId]); setSimPath([blankPreviewState()]); setEnded(null); }}>↺ Restart</SmallBtn>}
            <SmallBtn onClick={() => { onOpenInEditor && onOpenInEditor(currentId); onClose(); }}>Open in editor ▸</SmallBtn>
            <SmallBtn onClick={onClose} tone="close">✕</SmallBtn>
          </span>
        </div>

        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 12, flexShrink: 0 }}>
          <div style={{ font: `600 21px/1.15 ${SERIF}`, color: P.goldSoft }}>{beat.title || currentId}</div>
          {ts && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 999, border: "1px solid rgba(178,139,98,0.5)", background: "rgba(178,139,98,0.16)", color: "#dac6a2", font: "600 9px/1 system-ui", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{ts.icon} {ts.label}</span>}
        </div>

        {/* body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            {speaker && <Portrait npcKey={speaker} />}
            <div style={{ flex: 1, minWidth: 0 }}><Lines lines={lines} /></div>
          </div>

          {isPrompt && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input readOnly value={beat.prompt.placeholder || ""} placeholder={beat.prompt.placeholder || "…"}
                style={{ flex: 1, padding: "10px 14px", borderRadius: 12, background: "rgba(15,10,6,0.7)", border: `1.5px solid ${P.goldSoft}`,
                  font: `500 16px/1 ${SERIF}`, color: P.parchDim, outline: "none" }} />
              <span style={{ font: "italic 400 10px/1.3 system-ui", color: P.parchFaint, maxWidth: 130 }}>free-text input · preview shows the placeholder</span>
            </div>
          )}

          {/* choices / ending */}
          {ended ? (
            <div style={{ borderRadius: 16, padding: "14px 16px", background: "rgba(226,178,74,0.08)", border: "1px solid rgba(226,178,74,0.4)" }}>
              <div style={{ font: "700 9px/1 system-ui", letterSpacing: "0.14em", textTransform: "uppercase", color: P.goldSoft, marginBottom: 6 }}>✦ Branch ends here</div>
              <div style={{ font: `400 13px/1.45 ${SERIF}`, color: P.parch }}>You picked <b style={{ color: P.goldSoft }}>“{ended.choice.label}”</b>.</div>
              {outcomeBadges(ended.choice.outcome).length > 0
                ? <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>{outcomeBadges(ended.choice.outcome).map((b) => <Badge key={b.k} tone={b.t}>{b.label}</Badge>)}</div>
                : <div style={{ font: "italic 400 11px/1 system-ui", color: P.parchFaint, marginTop: 6 }}>no outcome effects</div>}
              {ended.choice?.outcome?.queueBeat && !knownIds.has(ended.choice.outcome.queueBeat) && (
                <div style={{ font: "italic 400 11px/1.3 system-ui", color: "#e0a05e", marginTop: 6 }}>⚠ this choice queues <code style={{ fontFamily: "ui-monospace,monospace" }}>{ended.choice.outcome.queueBeat}</code>, which doesn’t exist</div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {choices.map((c, i) => {
                const badges = outcomeBadges(c.outcome);
                const target = c?.outcome?.queueBeat;
                const targetKnown = target ? knownIds.has(target) : false;
                return (
                  <button key={c.id} onClick={() => pick(c)}
                    style={{ textAlign: "left", width: "100%", borderRadius: 16, padding: "12px 14px",
                      background: P.choiceBg, border: `1px solid ${P.choiceEdge}`, color: P.parch, cursor: "pointer",
                      display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ display: "grid", placeItems: "center", flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
                        background: "rgba(178,139,98,0.28)", color: "rgba(240,230,207,0.85)", font: "600 11px/1 ui-monospace,monospace" }}>{isPrompt ? "↵" : (["A", "B", "C", "D", "E", "F"][i] ?? "•")}</span>
                      <span style={{ flex: 1, minWidth: 0, font: `500 14.5px/1.4 ${SERIF}`, color: P.parch }}>{isPrompt ? (beat.prompt.buttonLabel || c.label) : c.label}</span>
                      {target && <span style={{ flexShrink: 0, font: "500 10px/1.2 system-ui", color: targetKnown ? P.ember : "#e0a05e" }}>{targetKnown ? `→ ${effectiveBeat(target, draft)?.title || target}` : `→ ${target} ⚠`}</span>}
                      {!target && !isPrompt && <span style={{ flexShrink: 0, font: "italic 500 10px/1.2 system-ui", color: P.parchFaint }}>ends here</span>}
                    </span>
                    {badges.length > 0 && <span style={{ display: "flex", flexWrap: "wrap", gap: 5, paddingLeft: 32 }}>{badges.map((b) => <Badge key={b.k} tone={b.t}>{b.label}</Badge>)}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, flexShrink: 0, font: "italic 400 10px/1.3 system-ui", color: P.parchFaint }}>
          Preview only — nothing is saved or dispatched. <code style={{ fontFamily: "ui-monospace,monospace" }}>{currentId}</code> · {choices.length} {choices.length === 1 ? "choice" : "choices"} · settlement → “{SAMPLE_SETTLEMENT}”
          {Object.keys(sim.flags).length > 0 && <> · flags {Object.entries(sim.flags).filter(([, v]) => v).map(([k]) => k).slice(0, 4).join(", ") || "none"}</>}
          {(sim.embers || sim.coreIngots || sim.gems) ? <> · ✸ {sim.embers} ◈ {sim.coreIngots} ◆ {sim.gems}</> : null}
        </div>
      </div>
    </Backdrop>
  );
}

// ─── chrome ──────────────────────────────────────────────────────────────────

const panelStyle = {
  width: "min(92vw, 480px)", maxHeight: "88vh", display: "flex", flexDirection: "column",
  background: `linear-gradient(180deg, ${P.panelTop}, ${P.panelBot})`, border: `1px solid ${P.edge}`,
  borderRadius: 22, padding: "16px 18px 14px", boxShadow: "0 24px 64px -16px rgba(0,0,0,0.6)",
};
const closeBtnStyle = {
  marginTop: 14, padding: "6px 12px", borderRadius: 8, border: `1px solid ${P.iron}`,
  background: "transparent", color: P.parchDim, font: "600 11px/1 system-ui", cursor: "pointer",
};

function Backdrop({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "grid", placeItems: "center",
      background: "rgba(10,7,4,0.62)", backdropFilter: "blur(2px)", padding: 20 }}>
      {children}
    </div>
  );
}

function SmallBtn({ children, onClick, tone }) {
  const close = tone === "close";
  return (
    <button onClick={onClick} style={{ padding: "4px 8px", borderRadius: 7,
      border: `1px solid ${close ? "rgba(200,100,80,0.5)" : "rgba(178,139,98,0.45)"}`,
      background: close ? "rgba(200,100,80,0.12)" : "rgba(178,139,98,0.14)",
      color: close ? "#e8a08c" : "#dac6a2", font: "600 9.5px/1 system-ui", cursor: "pointer", whiteSpace: "nowrap" }}>
      {children}
    </button>
  );
}
