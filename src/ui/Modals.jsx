import { useEffect, useState } from "react";
import { NPCS } from "../constants.js";
import { beatLines, beatChoices, beatIsContinueOnly, beatScene, interpolateBeatText } from "../story.js";
import { displayZoneName } from "../features/zones/data.js";
import Icon from "./Icon.jsx";
import IconCanvas, { hasIcon } from "./IconCanvas.jsx";
import RichText from "./RichText.jsx";
import Button from "./primitives/Button.jsx";

function Stat({ v, l }) {
  return (
    <div>
      <div className="font-bold text-[22px] landscape:max-[1024px]:text-[16px] max-[640px]:text-[18px] text-[#a8431a]">{v}</div>
      <div className="uppercase tracking-widest text-[10px] landscape:max-[1024px]:text-[8px] max-[640px]:text-[9px] text-[#8a785e]">{l}</div>
    </div>
  );
}

export function SeasonModal({ state, dispatch }) {
  if (state.modal !== "season") return null;
  const stats = state.seasonStats;
  // Phase 7 — calendar season removed. The end-of-session screen now only
  // shows the run summary and a "Return to Town" button.
  return (
    <div className="absolute inset-0 bg-black/55 grid place-items-center z-50 animate-fadein" role="dialog" aria-modal="true" aria-labelledby="season-modal-title">
      <div className="bg-[#f4ecd8] border-[4px] border-[#b28b62] rounded-[20px] px-8 py-6 landscape:max-[1024px]:px-4 landscape:max-[1024px]:py-3 max-[640px]:px-4 max-[640px]:py-4 min-w-[360px] max-w-[560px] landscape:max-[1024px]:min-w-0 landscape:max-[1024px]:w-[92vw] max-[640px]:min-w-0 max-[640px]:w-[92vw] landscape:max-[1024px]:max-h-[88vh] max-[640px]:max-h-[85dvh] landscape:max-[1024px]:overflow-y-auto max-[640px]:overflow-y-auto text-center shadow-2xl">
        <Icon iconKey="ui_home" size={48} className="landscape:max-[1024px]:w-[28px] max-[640px]:w-[32px] leading-none" />
        <h2 id="season-modal-title" className="font-bold text-[26px] landscape:max-[1024px]:text-[18px] max-[640px]:text-[20px] text-[#744d2e] mt-2 landscape:max-[1024px]:mt-1 max-[640px]:mt-1 mb-1 landscape:max-[1024px]:mb-0.5 max-[640px]:mb-0.5">Harvest Complete</h2>
        <p className="italic text-[#6a4b31] text-[14px] landscape:max-[1024px]:text-[11px] max-[640px]:text-[12px]">Time to head back to town.</p>
        <div className="flex justify-around gap-2 my-4 landscape:max-[1024px]:my-2 max-[640px]:my-2 p-3 landscape:max-[1024px]:p-2 max-[640px]:p-2 bg-black/[.04] rounded-xl">
          <Stat v={stats.harvests} l="Harvested" />
          <Stat v={stats.upgrades} l="Upgrades ★" />
          <Stat v={stats.ordersFilled} l="Orders" />
          <Stat v={`+${stats.coins}`} l="Coins" />
        </div>
        <p className="text-[12px] landscape:max-[1024px]:text-[10px] max-[640px]:text-[11px] text-[#8a785e] mb-3 landscape:max-[1024px]:mb-2 max-[640px]:mb-2">Return bonus: +25◉</p>
        <Button tone="moss" size="lg" onClick={() => dispatch({ type: "CLOSE_SEASON" })}>
          Return to Town
        </Button>
      </div>
    </div>
  );
}

// ─── Story / Dialogue ─────────────────────────────────────────────────────────
// The narrative layer has three presentation forms, picked by beat shape:
//   • center-stage modal — important story beats: multi-line dialogue, branching
//     choices, and free-text prompts (the choice list / prompt are footer
//     variants of the same parchment-and-iron panel)
//   • bottom-anchored bar — lightweight one-line milestones ("A mill stands…")
//   • the finale (act3_win) keeps its gilded full-bleed treatment
// All three set state.story.queuedBeat which blocks tile drag / turn advance
// (App.jsx gates `uiLocked` on it). Continue-only beats dismiss via ESC too.

// Narrative voice. No web font is loaded; this serif stack reads as "book"
// across platforms and falls back to the platform serif.
const STORY_SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, "Times New Roman", serif';

// Parchment + iron palette, calibrated to the dialogue design.
const SC = {
  parchment:     "#f0e6cf",
  parchmentDim:  "rgba(240,230,207,0.55)",
  parchmentFaint:"rgba(240,230,207,0.35)",
  narration:     "rgba(189,154,114,0.95)",
  iron:          "#b28b62",
  gold:          "#e2b24a",
  goldSoft:      "#f0c965",
  ink:           "#3a2715",
  panelEdge:     "#3a2a1d",
  choiceBg:      "rgba(58,42,29,0.55)",
  choiceEdge:    "rgba(178,139,98,0.32)",
};

function speakerName(key) { return key && NPCS[key] ? NPCS[key].name : null; }
function speakerRole(key) { return key && NPCS[key] ? NPCS[key].role : null; }
function speakerColor(key) { return key && NPCS[key] ? NPCS[key].color : SC.iron; }
function speakerIconKey(key) { return key ? `char_${key}` : null; }

/** A small uppercase pill — outcome badges and beat meta tags. */
function StoryPill({ children, tone = "iron" }) {
  const tones = {
    iron:  { bg: "rgba(178,139,98,0.16)",  bd: "rgba(178,139,98,0.5)",  fg: "#dac6a2" },
    gold:  { bg: "rgba(226,178,74,0.18)",  bd: "rgba(226,178,74,0.5)",  fg: "#f0c965" },
    ember: { bg: "rgba(214,97,42,0.16)",   bd: "rgba(214,97,42,0.45)",  fg: "#e88a5e" },
    green: { bg: "rgba(120,170,90,0.18)",  bd: "rgba(120,170,90,0.45)", fg: "#aacf83" },
    slate: { bg: "rgba(150,165,190,0.14)", bd: "rgba(150,165,190,0.4)", fg: "#bcc6d8" },
  };
  const t = tones[tone] || tones.iron;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full whitespace-nowrap align-middle"
      style={{ padding: "3px 8px", border: `1px solid ${t.bd}`, background: t.bg, color: t.fg,
               fontWeight: 600, fontSize: 10, lineHeight: 1, letterSpacing: "0.06em", textTransform: "uppercase" }}
    >
      {children}
    </span>
  );
}

/** Painterly placeholder portrait — a light highlight + dark shade over the NPC's base colour. */
export function StoryPortrait({ npcKey, size = 56 }) {
  const npc = npcKey ? NPCS[npcKey] : null;
  const iconKey = speakerIconKey(npcKey);
  if (iconKey && hasIcon(iconKey)) {
    return (
      <div className="rounded-full overflow-hidden flex-shrink-0" aria-hidden="true" style={{ width: size, height: size, border: "2px solid #f0e6cf" }}>
        <IconCanvas iconKey={iconKey} size={size} rounded background="#2a1e10" />
      </div>
    );
  }
  const base = npc ? npc.color : "#5a4a30";
  return (
    <div
      className="rounded-full grid place-items-center text-white flex-shrink-0"
      aria-hidden="true"
      style={{
        width: size, height: size,
        fontFamily: STORY_SERIF, fontWeight: 600, fontSize: Math.round(size * 0.4), lineHeight: 1,
        border: "2px solid #f0e6cf",
        background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.40), transparent 55%), radial-gradient(circle at 70% 82%, rgba(0,0,0,0.42), transparent 60%), ${base}`,
        boxShadow: "inset 0 -8px 16px rgba(0,0,0,0.25), inset 0 8px 18px rgba(255,255,255,0.18)",
      }}
    >
      {npc ? npc.name[0] : "✦"}
    </div>
  );
}

/** Stacked dialogue lines — each authored turn owns its speaker portrait. */
export function DialogueLines({ lines, compact = false }) {
  return (
    <div className="flex flex-col" style={{ gap: compact ? 8 : 12 }}>
      {lines.map((line, i) => {
        const prev = i > 0 ? lines[i - 1].speaker : undefined;
        const showLabel = line.speaker && line.speaker !== prev;
        return (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: compact ? 22 : 28, paddingTop: 1, flexShrink: 0 }}>
              {line.speaker ? <StoryPortrait npcKey={line.speaker} size={compact ? 22 : 28} /> : null}
            </div>
            <div style={{ minWidth: 0 }}>
              {showLabel && (
                <>
                  <div className="font-bold uppercase" style={{ fontSize: 11, letterSpacing: "0.08em", marginBottom: speakerRole(line.speaker) ? 1 : 3, color: speakerColor(line.speaker) }}>
                    {speakerName(line.speaker)}
                  </div>
                  {speakerRole(line.speaker) && (
                    <div style={{ fontSize: 11, color: SC.parchmentDim, marginBottom: 4 }}>
                      {speakerRole(line.speaker)}
                    </div>
                  )}
                </>
              )}
              <p
                style={{
                  margin: 0, fontFamily: STORY_SERIF, textWrap: "pretty",
                  fontSize: compact ? 14 : 16, lineHeight: 1.5,
                  fontStyle: line.speaker ? "normal" : "italic",
                  color: line.speaker ? SC.parchment : SC.narration,
                }}
              >
                <RichText text={line.text} />
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** "Tap to continue" cue with a slow pulsing dot. */
export function TapCue({ label = "Tap to continue" }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full"
      style={{ padding: "7px 14px", background: "rgba(226,178,74,0.12)", border: "1px solid rgba(226,178,74,0.4)",
               color: SC.goldSoft, fontWeight: 600, fontSize: 11, lineHeight: 1, letterSpacing: "0.07em", textTransform: "uppercase" }}
    >
      {label}
      <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: SC.gold, animation: "storyPulseRing 1.6s ease-out infinite" }} />
    </span>
  );
}

/** Short uppercase meta for a beat — "Act II", "Bond 8", or null. */
function beatMetaLabel(beat) {
  if (beat.trigger?.type === "bond_at_least" && Number.isFinite(beat.trigger.amount)) return `Bond ${beat.trigger.amount}`;
  if (beat.act) {
    const roman = ["", "I", "II", "III", "IV", "V"][beat.act] || beat.act;
    return `Act ${roman}`;
  }
  return beat.side ? "Side story" : null;
}

/** Decodes a choice's `outcome` into player-facing reward badges. Internal keys
 *  (setFlag / clearFlag / queueBeat) are intentionally not surfaced. */
function outcomeBadges(outcome) {
  const o = outcome && typeof outcome === "object" ? outcome : {};
  const out = [];
  if (o.bondDelta && typeof o.bondDelta === "object" && Number.isFinite(o.bondDelta.amount) && o.bondDelta.amount !== 0) {
    const who = speakerName(o.bondDelta.npc) || o.bondDelta.npc;
    out.push({ key: "bond", tone: "green", label: `♥ ${o.bondDelta.amount > 0 ? "+" : ""}${o.bondDelta.amount} ${who}` });
  }
  if (Number.isFinite(o.embers) && o.embers) out.push({ key: "embers", tone: "ember", label: `${o.embers > 0 ? "+" : ""}${o.embers} Embers` });
  if (Number.isFinite(o.coreIngots) && o.coreIngots) out.push({ key: "core", tone: "slate", label: `${o.coreIngots > 0 ? "+" : ""}${o.coreIngots} Core Ingots` });
  if (Number.isFinite(o.gems) && o.gems) out.push({ key: "gems", tone: "gold", label: `${o.gems > 0 ? "+" : ""}${o.gems} Gems` });
  if (Number.isFinite(o.coins) && o.coins) out.push({ key: "coins", tone: "gold", label: `${o.coins > 0 ? "+" : ""}${o.coins} Coins` });
  if (o.resources && typeof o.resources === "object") {
    for (const [k, v] of Object.entries(o.resources)) {
      if (!Number.isFinite(v) || !v) continue;
      out.push({ key: `r-${k}`, tone: "iron", label: `${v > 0 ? "+" : ""}${v} ${k.split("_").pop()}` });
    }
  }
  if (o.heirlooms && typeof o.heirlooms === "object") {
    for (const [k, v] of Object.entries(o.heirlooms)) {
      if (!Number.isFinite(v) || !v) continue;
      out.push({ key: `h-${k}`, tone: "gold", label: `${v > 0 ? "+" : ""}${v} ${k.split("_").pop()}` });
    }
  }
  return out;
}

/** A single branching-choice button: A/B/C chip + serif label + outcome badges. */
function ChoiceButton({ choice, index, onPick }) {
  const letter = ["A", "B", "C", "D", "E", "F"][index] ?? "•";
  const badges = outcomeBadges(choice.outcome);
  return (
    <button
      type="button"
      onClick={onPick}
      autoFocus={index === 0}
      className="story-choice text-left w-full rounded-2xl transition-colors flex flex-col gap-1.5"
      style={{ padding: "12px 14px", background: SC.choiceBg, border: `1px solid ${SC.choiceEdge}`, color: SC.parchment }}
    >
      <span className="flex gap-2.5 items-start">
        <span
          className="grid place-items-center flex-shrink-0 rounded-full"
          style={{ width: 22, height: 22, background: "rgba(178,139,98,0.28)", color: "rgba(240,230,207,0.85)",
                   fontWeight: 600, fontSize: 11, lineHeight: 1, fontFamily: "ui-monospace, monospace" }}
        >
          {letter}
        </span>
        <span style={{ flex: 1, fontFamily: STORY_SERIF, fontSize: 14.5, lineHeight: 1.4, fontWeight: 500, color: SC.parchment }}>
          {choice.label}
        </span>
      </span>
      {badges.length > 0 && (
        <span className="flex flex-wrap gap-1.5" style={{ paddingLeft: 32 }}>
          {badges.map((b) => <StoryPill key={b.key} tone={b.tone}>{b.label}</StoryPill>)}
        </span>
      )}
    </button>
  );
}

/** Free-text prompt footer (e.g. naming a settlement). Remounted per beat via key. */
export function PromptInput({ prompt, onSubmit }) {
  const [draft, setDraft] = useState("");
  const max = Number.isFinite(prompt.maxLength) ? prompt.maxLength : 24;
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(draft.trim()); }} className="flex flex-col gap-2.5">
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={prompt.placeholder || ""}
            maxLength={max}
            autoFocus
            className="w-full rounded-xl outline-none"
            style={{
              padding: "11px 52px 11px 14px", background: "rgba(15,10,6,0.7)", color: SC.parchment,
              border: `1.5px solid ${SC.goldSoft}`, boxShadow: "0 0 0 4px rgba(226,178,74,0.08)",
              fontFamily: STORY_SERIF, fontSize: 16, fontWeight: 500,
            }}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2" style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: SC.parchmentFaint }}>
            {draft.length}/{max}
          </span>
        </div>
        <button
          type="submit"
          className="rounded-xl font-bold uppercase whitespace-nowrap transition-[filter] hover:brightness-110"
          style={{ padding: "0 18px", background: `linear-gradient(180deg, ${SC.goldSoft}, ${SC.gold})`, border: `1px solid ${SC.gold}`,
                   color: SC.ink, fontSize: 13, letterSpacing: "0.04em", boxShadow: "0 6px 12px -4px rgba(226,178,74,0.4)" }}
        >
          {prompt.buttonLabel || "OK"}
        </button>
      </div>
      {prompt.helperText && (
        <div style={{ fontSize: 12, lineHeight: 1.4, color: SC.parchmentDim }}>{prompt.helperText}</div>
      )}
    </form>
  );
}

/** The dark parchment-and-iron stage used by the center-stage modal forms. */
export function StoryStagePanel({ beat, lines, footer, footKind, sceneLabel }) {
  return (
    <div
      className="w-[92vw] max-w-[460px] shadow-2xl flex flex-col"
      style={{ background: "linear-gradient(180deg, #221710 0%, #1a110a 100%)", border: `1px solid ${SC.panelEdge}`,
               borderRadius: 22, padding: "18px 18px 16px", maxHeight: "88dvh", animation: "storyDialogIn 360ms cubic-bezier(.2,.7,.2,1) both" }}
    >
      {/* Gold hairline */}
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(226,178,74,0.5), transparent)", marginBottom: 14, flexShrink: 0 }} />

      {/* Header: title + beat meta */}
      <div className="flex justify-between items-baseline gap-3 mb-3.5" style={{ flexShrink: 0 }}>
        <div id="story-modal-title" style={{ fontFamily: STORY_SERIF, fontWeight: 600, fontSize: 21, lineHeight: 1.15, color: SC.goldSoft }}>
          {beat.title}
        </div>
        {beatMetaLabel(beat) && (
          <div style={{ fontWeight: 600, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: SC.parchmentFaint, whiteSpace: "nowrap" }}>
            {beatMetaLabel(beat)}
          </div>
        )}
      </div>

      {/* Dialogue — scrolls if the beat is long */}
      <div id="story-modal-body" className="flex-1 min-h-0 overflow-y-auto" style={{ marginBottom: 16 }}>
        {lines.length > 0
          ? <DialogueLines lines={lines} />
          : <p style={{ margin: 0, fontFamily: STORY_SERIF, fontSize: 14, lineHeight: 1.5, fontStyle: "italic", color: SC.narration }}>(this beat has no authored lines)</p>}
      </div>

      {/* Footer */}
      <div style={{ flexShrink: 0 }}>{footer}</div>

      {/* Scene caption — only when the panel ends in a "tap to continue" beat */}
      {sceneLabel && footKind === "continue" && (
        <div className="text-center" style={{ marginTop: 12, flexShrink: 0 }}>
          <span style={{ fontFamily: STORY_SERIF, fontStyle: "italic", fontSize: 12, color: SC.parchmentDim, letterSpacing: "0.04em" }}>
            — {sceneLabel} —
          </span>
        </div>
      )}
    </div>
  );
}

/** Bottom-anchored dialogue bar — lightweight one-line milestones. Tap (anywhere
 *  on the bar), Enter/Space, or ESC advances. */
function StoryBar({ line, npc, onContinue }) {
  const advance = (e) => { if (e?.type === "keydown" && e.key !== "Enter" && e.key !== " ") return; e?.preventDefault?.(); onContinue(); };
  return (
    <div
      role="dialog" aria-modal="true"
      aria-label={npc ? `${npc.name} speaking` : "Narration"}
      aria-describedby="story-bar-text"
      className="absolute inset-0 z-[60]"
    >
      {/* light scrim — the board stays visible */}
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.28)" }} />
      {/* Sits above the game's bottom nav bar (~44px) so the caption clears it. */}
      <div
        className="absolute"
        style={{ left: "50%", bottom: 56, width: "calc(100% - 24px)", maxWidth: 640, animation: "storyBarIn 360ms cubic-bezier(.2,.7,.2,1) both" }}
      >
        <div
          role="button"
          tabIndex={0}
          autoFocus
          aria-label="Continue"
          aria-describedby="story-bar-text"
          onClick={advance}
          onKeyDown={advance}
          className="relative cursor-pointer outline-none"
          style={{ background: "linear-gradient(180deg, rgba(34,23,16,0.97) 0%, rgba(20,13,8,0.97) 100%)", border: `1px solid ${SC.panelEdge}`,
                   borderRadius: 20, padding: "16px 16px 13px", boxShadow: "0 20px 40px -10px rgba(0,0,0,0.7)" }}
        >
          {/* Floating speaker tag — overlaps the top edge */}
          {npc && (
            <div className="absolute inline-flex items-center gap-2 rounded-full" style={{ top: -12, left: 14, padding: "4px 12px 4px 4px", background: "#221710", border: `1px solid ${SC.panelEdge}` }}>
              <StoryPortrait npcKey={npc.key} size={22} />
              <span style={{ fontWeight: 600, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: npc.color }}>{npc.name}</span>
              {npc.role && <span style={{ fontSize: 10, color: SC.parchmentFaint, letterSpacing: "0.03em" }}>· {npc.role}</span>}
            </div>
          )}
          <p id="story-bar-text" style={{ margin: `${npc ? 8 : 0}px 0 0`, fontFamily: STORY_SERIF, fontSize: 16.5, lineHeight: 1.45, color: SC.parchment, textWrap: "pretty", minHeight: 48 }}>
            <RichText text={line.text} />
          </p>
          <div className="flex justify-end" style={{ marginTop: 10 }}>
            <TapCue label="Tap to continue" />
          </div>
        </div>
        <div className="text-center" style={{ marginTop: 9 }}>
          <span style={{ fontFamily: STORY_SERIF, fontStyle: "italic", fontSize: 11, color: SC.parchmentFaint }}>Board paused while we talk.</span>
        </div>
      </div>
    </div>
  );
}

/** The gilded finale card (act3_win). */
function WinBeat({ beat, lines, sceneBg, onContinue }) {
  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="story-win-title"
      className="absolute inset-0 grid place-items-center z-[60]"
      style={{ animation: "fadein 0.8s ease both", background: sceneBg ?? "rgba(0,0,0,0.65)" }}
    >
      <div
        className="relative rounded-[24px] px-10 py-8 max-w-[600px] w-[94vw] text-center shadow-2xl"
        style={{ background: "linear-gradient(160deg, #3a2a0e 0%, #1f1610 100%)", border: "4px solid #e2b24a",
                 boxShadow: "0 0 40px rgba(226,178,74,0.35), 0 8px 32px rgba(0,0,0,0.6)" }}
      >
        <Icon iconKey="ui_trophy" size={56} className="mb-2" />
        <h2 id="story-win-title" style={{ fontFamily: STORY_SERIF, fontWeight: 700, fontSize: 28, color: SC.goldSoft, marginBottom: 8 }}>{beat.title}</h2>
        <div className="mx-auto" style={{ maxWidth: 420, marginBottom: 24 }}>
          {lines.map((l, i) => (
            <p key={i} style={{ fontFamily: STORY_SERIF, fontSize: 16, lineHeight: 1.5, color: SC.parchment, marginTop: i ? 10 : 0 }}>
              <RichText text={l.text} />
            </p>
          ))}
        </div>
        <Button tone="gold" size="lg" autoFocus onClick={onContinue}>Continue</Button>
      </div>
    </div>
  );
}

/**
 * Renders when state.story.queuedBeat is set. Routes the beat to the right
 * presentation form. Continue-only beats (no prompt) also dismiss via ESC.
 */
export function StoryModal({ state, dispatch }) {
  const beat = state.story?.queuedBeat;
  const [lineStep, setLineStep] = useState(0);
  const [lastBeatId, setLastBeatId] = useState(beat?.id || "");
  if ((beat?.id || "") !== lastBeatId) {
    setLastBeatId(beat?.id || "");
    setLineStep(0);
  }

  const continueOnly = beat ? beatIsContinueOnly(beat) : false;
  const hasPrompt = !!(beat?.prompt && typeof beat.prompt === "object");

  // ESC — only on continue-only beats with no input prompt (a real choice or a
  // prompt needs an explicit click/submit).
  useEffect(() => {
    if (!beat || hasPrompt || !continueOnly) return;
    const handler = (e) => { if (e.key === "Escape") dispatch({ type: "STORY/DISMISS_MODAL" }); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [beat, hasPrompt, continueOnly, dispatch]);

  if (!beat) return null;

  const settlement = displayZoneName(state, "home");
  const lines = beatLines(beat).map((l) => ({ ...l, text: interpolateBeatText(l.text, { settlement }) }));
  const canStepDialogue = lines.length > 1;
  const atLastLine = lineStep >= lines.length - 1;
  const visibleLines = canStepDialogue ? [lines[Math.max(0, Math.min(lineStep, lines.length - 1))]] : lines;
  const revealFooter = !canStepDialogue || atLastLine;
  const choices = beatChoices(beat);
  const scene = beatScene(beat);
  const headSpeakerKey = visibleLines.find((l) => l.speaker)?.speaker ?? lines.find((l) => l.speaker)?.speaker ?? null;
  const baseNpc = headSpeakerKey ? NPCS[headSpeakerKey] : null;
  const npc = baseNpc ? { key: headSpeakerKey, ...baseNpc } : null;

  const pick = (choiceId) => dispatch({ type: "STORY/PICK_CHOICE", payload: { choiceId } });
  const submitPrompt = (value) => {
    if (beat.prompt?.kind === "name_settlement") {
      dispatch({ type: "SET_SETTLEMENT_NAME", payload: { zoneId: beat.prompt.zoneId, name: value } });
    }
    dispatch({ type: "STORY/PICK_CHOICE", payload: { choiceId: "continue", value } });
  };

  // 1) The finale — keep its gilded full-bleed treatment.
  if (beat.id === "act3_win") {
    return <WinBeat beat={beat} lines={lines} sceneBg={scene?.bg} onContinue={() => pick("continue")} />;
  }

  // 2) Lightweight one-line milestone → bottom-anchored bar.
  if (continueOnly && !hasPrompt && lines.length <= 1) {
    return <StoryBar line={lines[0] ?? { speaker: null, text: beat.title }} npc={npc} onContinue={() => pick("continue")} />;
  }

  // 3) Center-stage modal — multi-line beats, prompts, and branching choices.
  let footer, footKind;
  if (!revealFooter) {
    footer = (
      <div className="flex justify-end items-center gap-3">
        <button onClick={() => setLineStep((n) => Math.min(lines.length - 1, n + 1))} autoFocus aria-label="Continue dialogue" className="rounded-full outline-none transition-transform active:scale-95">
          <TapCue label="Next line" />
        </button>
      </div>
    );
    footKind = "continue";
  } else if (hasPrompt) {
    footer = <PromptInput key={beat.id} prompt={beat.prompt} onSubmit={submitPrompt} />;
    footKind = "prompt";
  } else if (continueOnly) {
    const continueLabel = choices[0].label;
    footer = (
      <div className="flex justify-between items-center gap-3">
        <span style={{ fontWeight: 600, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: SC.parchmentFaint }}>
          {beat.side ? "Side story" : "Story"}
        </span>
        <button onClick={() => pick("continue")} autoFocus aria-label={continueLabel} className="rounded-full outline-none transition-transform active:scale-95">
          <TapCue label={continueLabel === "Continue" ? "Tap to continue" : continueLabel} />
        </button>
      </div>
    );
    footKind = "continue";
  } else {
    footer = (
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2" style={{ marginBottom: 2 }}>
          <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(226,178,74,0.4), transparent)" }} />
          <span style={{ fontWeight: 600, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(226,178,74,0.7)" }}>Your reply</span>
          <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(226,178,74,0.4))" }} />
        </div>
        {choices.map((c, i) => <ChoiceButton key={c.id} choice={c} index={i} onPick={() => pick(c.id)} />)}
      </div>
    );
    footKind = "choices";
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-modal-title"
      aria-describedby="story-modal-body"
      className="absolute inset-0 grid place-items-center z-[60] animate-fadein"
      style={{ background: scene?.bg ?? "rgba(0,0,0,0.6)" }}
    >
      <StoryStagePanel beat={beat} lines={visibleLines} footer={footer} footKind={footKind} sceneLabel={scene?.label} />
    </div>
  );
}

// ─── NpcBubble ────────────────────────────────────────────────────────────────

export function NpcBubble({ bubble, dispatch }) {
  const [shown, setShown] = useState(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local display state with incoming bubble prop
    if (!bubble) { setShown(null); return; }
    setShown(bubble);
    const t = setTimeout(() => dispatch({ type: "DISMISS_BUBBLE", id: bubble.id }), bubble.ms || 1800);
    return () => clearTimeout(t);
  }, [bubble, dispatch]);
  if (!shown) return null;
  const npc = NPCS[shown.npc];
  if (!npc) return null;
  // Vol II §02 #7 — the 1.8s timer was the only exit. Player can now tap or
  // press Enter/Space/Escape to dismiss early. The wrapper drops its old
  // `pointer-events-none` so the tap is captured.
  const dismiss = () => dispatch({ type: "DISMISS_BUBBLE", id: shown.id });
  const onKey = (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
      e.preventDefault();
      dismiss();
    }
  };
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Dismiss ${npc.name}'s message`}
      onClick={dismiss}
      onKeyDown={onKey}
      className="absolute bottom-28 landscape:max-[1024px]:bottom-20 left-1/2 -translate-x-1/2 bg-[#f4ecd8] border-[3px] border-[#5a3a20] rounded-2xl px-4 py-3 landscape:max-[1024px]:px-3 landscape:max-[1024px]:py-2 max-w-[460px] landscape:max-[1024px]:max-w-[320px] shadow-2xl z-40 animate-bubblein cursor-pointer"
    >
      {/* Screen-reader live region is on the inner block so the dismiss button
       *  doesn't double-announce. */}
      <div role="status" aria-live="polite" className="flex gap-2.5 items-start">
        <div className="w-10 h-10 rounded-full grid place-items-center text-white font-bold text-[16px] flex-shrink-0" style={{ backgroundColor: npc.color, border: "2px solid #fff" }}>{npc.name[0]}</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[#a8431a] text-[12px]">{npc.name} · {npc.role}</div>
          <div className="text-[#2b2218] text-[13px] leading-snug mt-0.5"><RichText text={shown.text} /></div>
        </div>
      </div>
    </div>
  );
}
