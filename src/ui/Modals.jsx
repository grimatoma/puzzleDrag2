import { useEffect, useState } from "react";
import { SEASONS, NPCS } from "../constants.js";
import { SEASON_EFFECTS } from "./Hud.jsx";

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
  const calendarSeason = (state.seasonsCycled || 0) % 4;
  const prevSeason = SEASONS[calendarSeason];
  const nextCalendarSeason = (calendarSeason + 1) % 4;
  const nextSeason = SEASONS[nextCalendarSeason];
  const stats = state.seasonStats;
  const nextEffect = SEASON_EFFECTS[nextCalendarSeason];
  return (
    <div className="absolute inset-0 bg-black/55 grid place-items-center z-50 animate-fadein">
      <div className="bg-[#f4ecd8] border-[4px] border-[#b28b62] rounded-[20px] px-8 py-6 landscape:max-[1024px]:px-4 landscape:max-[1024px]:py-3 max-[640px]:px-4 max-[640px]:py-4 min-w-[360px] max-w-[560px] landscape:max-[1024px]:min-w-0 landscape:max-[1024px]:w-[92vw] max-[640px]:min-w-0 max-[640px]:w-[92vw] landscape:max-[1024px]:max-h-[88vh] max-[640px]:max-h-[85dvh] landscape:max-[1024px]:overflow-y-auto max-[640px]:overflow-y-auto text-center shadow-2xl">
        <div className="text-[48px] landscape:max-[1024px]:text-[28px] max-[640px]:text-[32px] leading-none">🏡</div>
        <h2 className="font-bold text-[26px] landscape:max-[1024px]:text-[18px] max-[640px]:text-[20px] text-[#744d2e] mt-2 landscape:max-[1024px]:mt-1 max-[640px]:mt-1 mb-1 landscape:max-[1024px]:mb-0.5 max-[640px]:mb-0.5">Harvest Complete</h2>
        <p className="italic text-[#6a4b31] text-[14px] landscape:max-[1024px]:text-[11px] max-[640px]:text-[12px]">{prevSeason.name} is over. Time to head back to town.</p>
        <div className="my-2 inline-block bg-[#d6612a]/15 border border-[#d6612a]/40 rounded-full px-3 py-1 text-[12px] landscape:max-[1024px]:text-[10px] max-[640px]:text-[11px] font-bold text-[#a8431a]">
          Next: {nextSeason.name} — {nextEffect}
        </div>
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
    <div className="absolute bottom-28 landscape:max-[1024px]:bottom-20 left-1/2 -translate-x-1/2 bg-[#f4ecd8] border-[3px] border-[#5a3a20] rounded-2xl px-4 py-3 landscape:max-[1024px]:px-3 landscape:max-[1024px]:py-2 max-w-[460px] landscape:max-[1024px]:max-w-[320px] shadow-2xl z-40 animate-bubblein">
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
