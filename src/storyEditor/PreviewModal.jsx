// Story Tree Editor — branch preview ("play" the dialogue).
// A self-contained modal that renders a beat as it would appear in-game
// (parchment-and-iron stage, serif dialogue, choice buttons) and lets you walk
// the branch: picking a choice with `outcome.queueBeat` advances to that beat;
// a choice with no follow-up ends the branch. Reads the *effective* beat
// (so unsaved editor edits show up), interpolates `{settlement}` with a sample
// name, and shows each choice's whitelisted outcome as badges. "Open in editor"
// jumps the editor's selection to whatever beat you're looking at.

import { useState, useEffect, useMemo } from "react";
import { beatLines, interpolateBeatText } from "../story.js";
import { NPCS, effectiveBeat, effectiveChoices, triggerSummary, allBeatIds } from "./shared.jsx";
import { applyPreviewEffects, blankPreviewState, firstTriggeredByPreviewState, previewStateSummary } from "./previewModel.js";
import { StoryStagePanel, TapCue } from "../ui/Modals.jsx";

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

function outcomeBadges(outcome) {
  const o = outcome || {};
  const out = [];
  if (o.bondDelta && o.bondDelta.npc) out.push({ k: "bond", t: "ember", label: `♥ ${o.bondDelta.amount > 0 ? "+" : ""}${o.bondDelta.amount} ${NPCS[o.bondDelta.npc]?.name || o.bondDelta.npc}` });
  if (o.coins) out.push({ k: "coin", t: "gold", label: `¢ ${o.coins > 0 ? "+" : ""}${o.coins} Coins` });
  if (o.embers) out.push({ k: "emb", t: "gold", label: `✸ ${o.embers > 0 ? "+" : ""}${o.embers} Embers` });
  if (o.coreIngots) out.push({ k: "core", t: "gold", label: `◈ ${o.coreIngots > 0 ? "+" : ""}${o.coreIngots} Core Ingots` });
  if (o.gems) out.push({ k: "gem", t: "gold", label: `◆ ${o.gems > 0 ? "+" : ""}${o.gems} Gems` });
  for (const [key, amount] of Object.entries(o.resources || {})) if (Number.isFinite(amount) && amount) out.push({ k: `res-${key}`, t: "iron", label: `${amount > 0 ? "+" : ""}${amount} ${key}` });
  for (const [key, amount] of Object.entries(o.heirlooms || {})) if (Number.isFinite(amount) && amount) out.push({ k: `heir-${key}`, t: "slate", label: `${amount > 0 ? "+" : ""}${amount} ${key}` });
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

function PreviewFooter({ beat, choices, ended, knownIds, draft, isPrompt, onPick }) {
  if (isPrompt && !ended) {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input readOnly value={beat.prompt.placeholder || ""} placeholder={beat.prompt.placeholder || "..."}
          style={{ flex: 1, padding: "10px 14px", borderRadius: 12, background: "rgba(15,10,6,0.7)", border: `1.5px solid ${P.goldSoft}`,
            font: `500 16px/1 ${SERIF}`, color: P.parchDim, outline: "none" }} />
        <button onClick={() => onPick({ id: "prompt", label: beat.prompt.buttonLabel || "Continue" })}
          style={{ padding: "10px 13px", borderRadius: 12, background: P.choiceBg, border: `1px solid ${P.choiceEdge}`, color: P.parch,
            font: "700 10px/1 system-ui", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {beat.prompt.buttonLabel || "Continue"}
        </button>
      </div>
    );
  }
  if (ended) {
    return (
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
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {choices.map((c, i) => {
        const badges = outcomeBadges(c.outcome);
        const target = c?.outcome?.queueBeat;
        const targetKnown = target ? knownIds.has(target) : false;
        return (
          <button key={c.id} onClick={() => onPick(c)}
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
  );
}

// `index.jsx` mounts this with `key={startBeatId}` so the walk state resets
// when you pick a different beat to preview.
export default function PreviewModal({ startBeatId, draft, onClose, onOpenInEditor }) {
  const [path, setPath] = useState([startBeatId]);
  const [ended, setEnded] = useState(null); // { choice } once a terminal choice is taken
  const [simPath, setSimPath] = useState(() => [blankPreviewState()]);
  const [lineProgress, setLineProgress] = useState({ beatId: startBeatId, step: 0 });
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const knownIds = useMemo(() => new Set(allBeatIds(draft)), [draft]);
  const currentId = path[path.length - 1];
  const beat = effectiveBeat(currentId, draft);
  const sim = simPath[simPath.length - 1] || blankPreviewState();
  const lineStep = lineProgress.beatId === currentId ? lineProgress.step : 0;

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

  const lines = beatLines(beat).map((l) => ({ speaker: l?.speaker ?? null, text: interpolateBeatText(l?.text ?? "", { settlement: SAMPLE_SETTLEMENT }) }));
  const canStepDialogue = lines.length > 1;
  const atLastLine = lineStep >= lines.length - 1;
  const visibleLines = canStepDialogue ? [lines[Math.max(0, Math.min(lineStep, lines.length - 1))]] : lines;
  const revealFooter = !canStepDialogue || atLastLine || !!ended;
  const isPrompt = !!beat.prompt;
  const rawChoices = effectiveChoices(currentId, draft);
  const choices = isPrompt ? rawChoices : (rawChoices.length ? rawChoices : [{ id: "continue", label: "Continue" }]);
  const ts = triggerSummary(beat);
  const stateBits = previewStateSummary(sim);

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
      <div style={previewShellStyle} onClick={(e) => e.stopPropagation()}>
        {/* breadcrumb / controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap", flexShrink: 0,
          padding: "8px 10px", borderRadius: 12, background: "rgba(26,17,10,0.86)", border: `1px solid ${P.edge}` }}>
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

        {ts && <div style={{ marginBottom: 8, color: "#dac6a2", font: "600 9px/1 system-ui", letterSpacing: "0.06em", textTransform: "uppercase" }}>{ts.icon} {ts.label}</div>}
        <StoryStagePanel
          beat={beat}
          lines={visibleLines}
          footer={revealFooter
            ? <PreviewFooter beat={beat} choices={choices} ended={ended} knownIds={knownIds} draft={draft} isPrompt={isPrompt} onPick={pick} />
            : (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setLineProgress((p) => ({ beatId: currentId, step: Math.min(lines.length - 1, (p.beatId === currentId ? p.step : 0) + 1) }))} autoFocus aria-label="Continue dialogue" style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
                  <TapCue label="Next line" />
                </button>
              </div>
            )}
          footKind={revealFooter ? (ended ? "continue" : isPrompt ? "prompt" : "choices") : "continue"}
        />

        <div style={{ marginTop: 12, flexShrink: 0, font: "italic 400 10px/1.3 system-ui", color: P.parchFaint }}>
          Preview follows queued beats and state-triggered follow-ups using the editor draft state. <code style={{ fontFamily: "ui-monospace,monospace" }}>{currentId}</code> · {choices.length} {choices.length === 1 ? "choice" : "choices"} · settlement → “{SAMPLE_SETTLEMENT}”
          {stateBits.length > 0 && <> · {stateBits.join(" · ")}</>}
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
const previewShellStyle = {
  width: "min(92vw, 480px)", maxHeight: "92vh", display: "flex", flexDirection: "column",
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
