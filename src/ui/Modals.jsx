import { useEffect, useRef, useState } from "react";
import { NPCS } from "../constants.js";
import { parseSpeaker } from "../story.js";

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
        <div className="text-[48px] landscape:max-[1024px]:text-[28px] max-[640px]:text-[32px] leading-none">🏡</div>
        <h2 id="season-modal-title" className="font-bold text-[26px] landscape:max-[1024px]:text-[18px] max-[640px]:text-[20px] text-[#744d2e] mt-2 landscape:max-[1024px]:mt-1 max-[640px]:mt-1 mb-1 landscape:max-[1024px]:mb-0.5 max-[640px]:mb-0.5">Harvest Complete</h2>
        <p className="italic text-[#6a4b31] text-[14px] landscape:max-[1024px]:text-[11px] max-[640px]:text-[12px]">Time to head back to town.</p>
        <div className="flex justify-around gap-2 my-4 landscape:max-[1024px]:my-2 max-[640px]:my-2 p-3 landscape:max-[1024px]:p-2 max-[640px]:p-2 bg-black/[.04] rounded-xl">
          <Stat v={stats.harvests} l="Harvested" />
          <Stat v={stats.upgrades} l="Upgrades ★" />
          <Stat v={stats.ordersFilled} l="Orders" />
          <Stat v={`+${stats.coins}`} l="Coins" />
        </div>
        <p className="text-[12px] landscape:max-[1024px]:text-[10px] max-[640px]:text-[11px] text-[#8a785e] mb-3 landscape:max-[1024px]:mb-2 max-[640px]:mb-2">Bonus: +1 Reshuffle Horn · +25◉</p>
        <button
          onClick={() => dispatch({ type: "CLOSE_SEASON" })}
          className="bg-[#91bf24] hover:bg-[#a3d028] text-white border-[3px] border-white rounded-2xl px-8 landscape:max-[1024px]:px-5 max-[640px]:px-5 py-2.5 landscape:max-[1024px]:py-1.5 max-[640px]:py-2 text-[16px] landscape:max-[1024px]:text-[13px] max-[640px]:text-[14px] font-bold shadow-lg"
        >
          Return to Town
        </button>
      </div>
    </div>
  );
}

// ─── Story Modal (task 2.3) ───────────────────────────────────────────────────

/**
 * Renders when state.story.queuedBeat is set.
 * Blocks tile drag / turn advance (handled by App.jsx checking state.story.queuedBeat).
 * Dismissable via "Continue" button or ESC key.
 */
export function StoryModal({ state, dispatch }) {
  const beat = state.story?.queuedBeat;
  const isWin = beat?.id === "act3_win";
  const backdropRef = useRef(null);

  // ESC key to dismiss
  useEffect(() => {
    if (!beat) return;
    const handler = (e) => {
      if (e.key === "Escape") dispatch({ type: "STORY/DISMISS_MODAL" });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [beat, dispatch]);

  if (!beat) return null;

  const speakerKey = parseSpeaker(beat.body);
  const npc = speakerKey ? NPCS[speakerKey] : null;

  if (isWin) {
    // Win modal: gold border, larger panel, slow fade-in
    return (
      <div
        ref={backdropRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-win-title"
        className="absolute inset-0 bg-black/65 grid place-items-center z-[60]"
        style={{ animation: "fadein 0.8s ease both" }}
      >
        {/* Particle suggestion: golden sparkles via CSS */}
        <div
          className="relative rounded-[24px] px-10 py-8 max-w-[600px] w-[94vw] text-center shadow-2xl"
          style={{
            background: "linear-gradient(160deg, #3a2a0e 0%, #1f1610 100%)",
            border: "4px solid #ffd34c",
            boxShadow: "0 0 40px rgba(255,211,76,0.35), 0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          <div className="text-[56px] leading-none mb-2">🏆</div>
          <h2 id="story-win-title" className="font-bold text-[28px] text-[#ffd34c] mb-2">{beat.title}</h2>
          <p className="text-[#f4ecd8] text-[16px] leading-relaxed mb-6 max-w-[420px] mx-auto">{beat.body}</p>
          <button
            onClick={() => dispatch({ type: "STORY/DISMISS_MODAL" })}
            autoFocus
            className="bg-[#ffd34c] hover:bg-[#ffe880] text-[#3a2a0e] border-[3px] border-[#ffd34c] rounded-2xl px-10 py-3 text-[18px] font-bold shadow-lg transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-modal-title"
      className="absolute inset-0 bg-black/60 grid place-items-center z-[60] animate-fadein"
    >
      <div
        className="rounded-[20px] px-7 py-6 max-w-[480px] w-[94vw] shadow-2xl"
        style={{ background: "#1f1610", border: "3px solid #b28b62" }}
      >
        {/* Header: portrait + title */}
        <div className="flex items-center gap-4 mb-4">
          {npc ? (
            <div
              className="w-16 h-16 rounded-full grid place-items-center text-white font-bold text-[24px] flex-shrink-0"
              style={{ backgroundColor: npc.color, border: "3px solid #f6efe0" }}
            >
              {npc.name[0]}
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full grid place-items-center text-[#f6efe0] text-[28px] flex-shrink-0 bg-[#3a2715] border-2 border-[#b28b62]">
              ✦
            </div>
          )}
          <div>
            {npc && <div className="text-[#d6a060] text-[12px] font-bold uppercase tracking-widest">{npc.name}</div>}
            <div id="story-modal-title" className="text-[#ffd34c] font-bold text-[20px] leading-tight">{beat.title}</div>
          </div>
        </div>

        {/* Body */}
        <p className="text-[#f4ecd8] text-[15px] leading-relaxed mb-5">{beat.body}</p>

        {/* Continue button */}
        <div className="flex justify-end">
          <button
            onClick={() => dispatch({ type: "STORY/DISMISS_MODAL" })}
            autoFocus
            className="bg-[#ffd34c] hover:bg-[#ffe880] text-[#3a2a0e] border-[3px] border-[#b28b62] rounded-xl px-7 py-2 text-[15px] font-bold shadow-lg transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
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
  return (
    <div role="status" aria-live="polite" className="absolute bottom-28 landscape:max-[1024px]:bottom-20 left-1/2 -translate-x-1/2 bg-[#f4ecd8] border-[3px] border-[#5a3a20] rounded-2xl px-4 py-3 landscape:max-[1024px]:px-3 landscape:max-[1024px]:py-2 max-w-[460px] landscape:max-[1024px]:max-w-[320px] shadow-2xl z-40 animate-bubblein">
      <div className="flex gap-2.5 items-start">
        <div className="w-10 h-10 rounded-full grid place-items-center text-white font-bold text-[16px] flex-shrink-0" style={{ backgroundColor: npc.color, border: "2px solid #fff" }}>{npc.name[0]}</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[#a8431a] text-[12px]">{npc.name} · {npc.role}</div>
          <div className="text-[#2b2218] text-[13px] leading-snug mt-0.5">{shown.text}</div>
        </div>
      </div>
    </div>
  );
}
