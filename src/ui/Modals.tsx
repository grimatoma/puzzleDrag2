import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NPCS } from "../constants.js";
import { beatLines, beatChoices, beatIsContinueOnly, beatScene, interpolateBeatText } from "../story.js";
import type { Beat as StoryBeatType, BeatLine as StoryBeatLine, BeatChoice as StoryBeatChoice, ChoiceOutcome } from "../story.js";
import { displayZoneName } from "../features/zones/data.js";
import Icon from "./Icon.jsx";
import IconCanvas, { hasIcon } from "./IconCanvas.jsx";
import RichText from "./RichText.jsx";
import { ParchmentDialog } from "./primitives/Dialog.jsx";
import Button from "./primitives/Button.jsx";
import { useNotifier } from "./primitives/Toast.jsx";
import { isDialogsDisabled } from "../featureFlags.js";
import type { Bubble, Dispatch, GameState } from "../types/state.js";

interface NpcRecord {
  name: string;
  role?: string;
  look?: { color?: string };
  [extra: string]: unknown;
}

type BeatLine = StoryBeatLine;
type BeatChoice = StoryBeatChoice;
type BeatOutcome = ChoiceOutcome;
type StoryBeat = StoryBeatType;

function Stat({ v, l }: { v: React.ReactNode; l: React.ReactNode }) {
  return (
    <div>
      <div className="font-bold text-h2 max-[640px]:text-large text-ember tabular-nums">{v}</div>
      <div className="uppercase tracking-widest text-micro text-ink-light">{l}</div>
    </div>
  );
}

export function SeasonModal({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  if (isDialogsDisabled()) return null;
  if (state.modal !== "season") return null;
  const stats = state.seasonStats;
  const close = () => dispatch({ type: "CLOSE_SEASON" });
  return (
    <ParchmentDialog open onClose={close} size="md" ariaLabel="Harvest Complete">
      <ParchmentDialog.Title>
        <span className="flex flex-col items-center text-center gap-1">
          <Icon iconKey="ui_home" size={48} className="leading-none" />
          <span className="block">Harvest Complete</span>
          <span className="block italic text-body text-ink-mid font-normal">Time to head back to town.</span>
        </span>
      </ParchmentDialog.Title>
      <ParchmentDialog.Body className="text-center">
        <div className="flex justify-around gap-2 my-2 p-3 bg-black/[.04] rounded-xl">
          <Stat v={stats.harvests} l="Harvested" />
          <Stat v={stats.upgrades} l="Upgrades ★" />
          <Stat v={stats.ordersFilled} l="Orders" />
          <Stat v={`+${stats.coins}`} l="Coins" />
        </div>
        <p className="text-ink-soft text-body-lg font-semibold tabular-nums mt-3 inline-block px-3 py-1 rounded-md bg-gold-soft/40 border border-iron-edge">+25◉ return bonus</p>
      </ParchmentDialog.Body>
      <ParchmentDialog.Actions sticky>
        <Button tone="ember" size="md" onClick={close} leading={undefined}>Return to Town</Button>
      </ParchmentDialog.Actions>
    </ParchmentDialog>
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
  parchment:     "#f6efe0",
  parchmentDim:  "rgba(246,239,224,0.55)",
  parchmentFaint:"rgba(246,239,224,0.35)",
  narration:     "rgba(122,94,63,0.95)",
  iron:          "#c9b993",
  gold:          "#e2b24a",
  goldSoft:      "#f0c965",
  ink:           "#2b2218",
  panelEdge:     "#c9b993",
  choiceBg:      "rgba(251,247,235,0.85)",
  choiceEdge:    "rgba(201,185,147,0.45)",
};

const NPCS_BY_KEY = NPCS as Record<string, NpcRecord>;
function speakerName(key: string | null | undefined) { return key && NPCS_BY_KEY[key] ? NPCS_BY_KEY[key].name : null; }
function speakerRole(key: string | null | undefined) { return key && NPCS_BY_KEY[key] ? NPCS_BY_KEY[key].role : null; }
function speakerColor(key: string | null | undefined) { return key && NPCS_BY_KEY[key] ? NPCS_BY_KEY[key].look?.color : SC.iron; }
function speakerIconKey(key: string | null | undefined) { return key ? `char_${key}` : null; }

/** A small uppercase pill — outcome badges and beat meta tags. */
interface PillTone { bg: string; bd: string; fg: string }
function StoryPill({ children, tone = "iron" }: { children?: React.ReactNode; tone?: string }) {
  const tones: Record<string, PillTone> = {
    iron:  { bg: "rgba(178,139,98,0.16)",  bd: "rgba(178,139,98,0.5)",  fg: "#dac6a2" },
    gold:  { bg: "rgba(226,178,74,0.18)",  bd: "rgba(226,178,74,0.5)",  fg: "#f0c965" },
    ember: { bg: "rgba(214,97,42,0.16)",   bd: "rgba(214,97,42,0.45)",  fg: "#e88a5e" },
    green: { bg: "rgba(120,170,90,0.18)",  bd: "rgba(120,170,90,0.45)", fg: "#aacf83" },
    slate: { bg: "rgba(150,165,190,0.14)", bd: "rgba(150,165,190,0.4)", fg: "#bcc6d8" },
  };
  const t: PillTone = tones[tone] || tones.iron;
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
export function StoryPortrait({ npcKey, size = 56 }: { npcKey: string | null | undefined; size?: number }) {
  const npc = npcKey ? NPCS_BY_KEY[npcKey] : null;
  const iconKey = speakerIconKey(npcKey);
  if (iconKey && hasIcon(iconKey)) {
    return (
      <div className="rounded-full overflow-hidden flex-shrink-0" aria-hidden="true" style={{ width: size, height: size, border: "2px solid #f0e6cf" }}>
        <IconCanvas iconKey={iconKey} size={size} rounded background="#2a1e10" />
      </div>
    );
  }
  const base = npc ? npc.look?.color : "#5a4a30";
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
export function DialogueLines({ lines, compact = false }: { lines: BeatLine[]; compact?: boolean }) {
  return (
    <div className="flex flex-col" style={{ gap: compact ? 8 : 12 }}>
      {lines.map((line: BeatLine, i: number) => {
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
export function TapCue({ label = "Tap to continue" }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full"
      style={{ padding: "7px 14px", background: "rgba(226,178,74,0.12)", border: "1px solid rgba(226,178,74,0.4)",
               color: SC.goldSoft, fontWeight: 600, fontSize: 11, lineHeight: 1, letterSpacing: "0.07em", textTransform: "uppercase" }}
    >
      {label}
      <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: SC.gold, animation: "storyPulseRing 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite" }} />
    </span>
  );
}

/** Short uppercase meta for a beat — "Act II", "Bond 8", or null. */
function beatMetaLabel(beat: StoryBeat) {
  if (beat.trigger?.type === "bond_at_least" && Number.isFinite(beat.trigger.amount)) return `Bond ${beat.trigger.amount}`;
  if (beat.act) {
    const roman = ["", "I", "II", "III", "IV", "V"][beat.act] || beat.act;
    return `Act ${roman}`;
  }
  return beat.side ? "Side story" : null;
}

/** Decodes a choice's `outcome` into player-facing reward badges. Internal keys
 *  (setFlag / clearFlag / queueBeat) are intentionally not surfaced. */
interface OutcomeBadge { key: string; tone: string; label: string }
function outcomeBadges(outcome: unknown): OutcomeBadge[] {
  const o = (outcome && typeof outcome === "object" ? outcome : {}) as BeatOutcome;
  const out: OutcomeBadge[] = [];
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
function ChoiceButton({ choice, index, onPick }: { choice: BeatChoice; index: number; onPick: () => void }) {
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
interface PromptDef {
  kind?: string;
  zoneId?: string;
  placeholder?: string;
  helperText?: string;
  buttonLabel?: string;
  maxLength?: number;
}

export function PromptInput({ prompt, onSubmit }: { prompt: PromptDef | undefined; onSubmit: (value: string) => void }) {
  const [draft, setDraft] = useState("");
  if (!prompt) return null;
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
export function StoryStagePanel({ beat, lines, footer, footKind, sceneLabel, onClose }: { beat: StoryBeat; lines: BeatLine[]; footer: React.ReactNode; footKind: string | undefined; sceneLabel: string | undefined; onClose?: (() => void) | undefined }) {
  return (
    <div
      className="w-[92vw] max-w-[460px] shadow-2xl flex flex-col relative"
      style={{ background: "linear-gradient(180deg, #221710 0%, #1a110a 100%)", border: `1px solid ${SC.panelEdge}`,
               borderRadius: 22, padding: "18px 18px 16px", maxHeight: "88dvh", animation: "storyDialogIn 360ms cubic-bezier(.2,.7,.2,1) both" }}
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-2 right-2 grid place-items-center rounded-full outline-none hover:bg-white/10 transition-colors"
          style={{ width: 32, height: 32, color: SC.parchmentFaint }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      )}

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(226,178,74,0.5), transparent)", marginBottom: 14, flexShrink: 0 }} />

      <div className="flex justify-between items-baseline gap-3 mb-3.5" style={{ flexShrink: 0, paddingRight: onClose ? 36 : 0 }}>
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
interface NpcWithKey { key: string | null; name: string; role?: string; look?: { color?: string } }
function StoryBar({ line, npc, onContinue }: { line: BeatLine; npc: NpcWithKey | null; onContinue: () => void }) {
  const advance = (e: React.MouseEvent | React.KeyboardEvent) => {
    if ("type" in e && e.type === "keydown" && "key" in e && e.key !== "Enter" && e.key !== " ") return;
    e?.preventDefault?.();
    onContinue();
  };
  return (
    <div
      role="dialog" aria-modal="true"
      aria-label={npc ? `${npc.name} speaking` : "Narration"}
      aria-describedby="story-bar-text"
      className="fixed inset-0 z-[60]"
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
              <span style={{ fontWeight: 600, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: npc.look?.color }}>{npc.name}</span>
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
function WinBeat({ beat, lines, sceneBg, onContinue }: { beat: StoryBeat; lines: BeatLine[]; sceneBg: string | undefined; onContinue: () => void }) {
  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="story-win-title"
      className="fixed inset-0 grid place-items-center z-[60]"
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
          {lines.map((l: BeatLine, i: number) => (
            <p key={i} style={{ fontFamily: STORY_SERIF, fontSize: 16, lineHeight: 1.5, color: SC.parchment, marginTop: i ? 10 : 0 }}>
              <RichText text={l.text} />
            </p>
          ))}
        </div>
        <button
          onClick={onContinue}
          autoFocus
          className="rounded-2xl font-bold uppercase transition-[filter] hover:brightness-110"
          style={{ padding: "12px 40px", background: `linear-gradient(180deg, ${SC.goldSoft}, ${SC.gold})`, border: `1px solid ${SC.gold}`,
                   color: SC.ink, fontSize: 16, letterSpacing: "0.04em", boxShadow: "0 6px 16px -4px rgba(226,178,74,0.45)" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

/**
 * Renders when state.story.queuedBeat is set. Routes the beat to the right
 * presentation form. Continue-only beats (no prompt) also dismiss via ESC.
 */
export function StoryModal({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const beat = (state.story as { queuedBeat?: StoryBeat } | undefined)?.queuedBeat;
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
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") dispatch({ type: "STORY/DISMISS_MODAL" }); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [beat, hasPrompt, continueOnly, dispatch]);

  if (!beat) return null;
  if (isDialogsDisabled()) return null;

  const settlement = displayZoneName(state, "home");
  const lines = (beatLines(beat) as BeatLine[]).map((l) => ({ ...l, text: interpolateBeatText(l.text, { settlement }) }));
  const canStepDialogue = lines.length > 1;
  const atLastLine = lineStep >= lines.length - 1;
  const visibleLines = canStepDialogue ? [lines[Math.max(0, Math.min(lineStep, lines.length - 1))]] : lines;
  const revealFooter = !canStepDialogue || atLastLine;
  const choices = beatChoices(beat);
  const scene = beatScene(beat);
  const headSpeakerKey = visibleLines.find((l: BeatLine) => l.speaker)?.speaker ?? lines.find((l: BeatLine) => l.speaker)?.speaker ?? null;
  const baseNpc = headSpeakerKey ? NPCS_BY_KEY[headSpeakerKey] : null;
  const npc = baseNpc ? { key: headSpeakerKey, ...baseNpc } : null;

  const pick = (choiceId: string) => dispatch({ type: "STORY/PICK_CHOICE", payload: { choiceId } });
  const submitPrompt = (value: string) => {
    if (beat.prompt?.kind === "name_settlement") {
      dispatch({ type: "SET_SETTLEMENT_NAME", payload: { zoneId: beat.prompt.zoneId, name: value } });
    }
    dispatch({ type: "STORY/PICK_CHOICE", payload: { choiceId: "continue", value } });
  };

  // 1) The finale — keep its gilded full-bleed treatment.
  if (beat.id === "act3_win") {
    return createPortal(<WinBeat beat={beat} lines={lines} sceneBg={scene?.bg} onContinue={() => pick("continue")} />, document.body);
  }

  // 2) Lightweight one-line milestone → bottom-anchored bar.
  if (continueOnly && !hasPrompt && lines.length <= 1) {
    return createPortal(<StoryBar line={lines[0] ?? { speaker: null, text: beat.title }} npc={npc} onContinue={() => pick("continue")} />, document.body);
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
        {(choices as BeatChoice[]).map((c, i: number) => <ChoiceButton key={c.id} choice={c} index={i} onPick={() => pick(c.id)} />)}
      </div>
    );
    footKind = "choices";
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-modal-title"
      aria-describedby="story-modal-body"
      className="fixed inset-0 grid place-items-center z-[60] animate-fadein"
      style={{ background: scene?.bg ?? "rgba(0,0,0,0.6)" }}
    >
      <StoryStagePanel
        beat={beat}
        lines={visibleLines}
        footer={footer}
        footKind={footKind}
        sceneLabel={scene?.label}
        onClose={continueOnly && !hasPrompt ? () => dispatch({ type: "STORY/DISMISS_MODAL" }) : undefined}
      />
    </div>,
    document.body
  );
}

// ─── NpcBubble ────────────────────────────────────────────────────────────────

export function NpcBubble({ bubble, dispatch }: { bubble: Bubble | null | undefined; dispatch: Dispatch }) {
  const notifier = useNotifier();
  const lastIdRef = useRef<string | number | null>(null);
  useEffect(() => {
    if (isDialogsDisabled()) return;
    if (!bubble || bubble.id === lastIdRef.current) return;
    lastIdRef.current = bubble.id;
    const npc = NPCS_BY_KEY[bubble.npc];
    const npcLabel = npc ? `${npc.name} · ${npc.role}` : bubble.npc;
    notifier.bubble({
      npcKey: npcLabel,
      text: bubble.text,
      duration: bubble.ms || 1800,
    });
    const t = setTimeout(() => dispatch({ type: "DISMISS_BUBBLE", id: bubble.id }), bubble.ms || 1800);
    return () => clearTimeout(t);
  }, [bubble, dispatch, notifier]);
  return null;
}
