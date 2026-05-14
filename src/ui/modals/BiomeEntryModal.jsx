import { useState } from "react";
import { BIOMES, EXPEDITION_FOOD_TURNS, MIN_EXPEDITION_TURNS } from "../../constants.js";
import { expeditionTurnsForFood, expeditionTurnsFromSupply } from "../../features/zones/data.js";
import IconCanvas from "../IconCanvas.jsx";
import Icon from "../Icon.jsx";
import { FOOD_LABELS } from "../townData.js";

export function BiomeEntryModal({ biomeKey, state, dispatch, onClose }) {
  const biome = BIOMES[biomeKey];
  const level = state.level ?? 1;
  const unlockLevel = biomeKey === "mine" ? 2 : biomeKey === "fish" ? 3 : 0;
  const locked = level < unlockLevel;
  const zoneId = state.activeZone ?? state.mapCurrent ?? "home";
  const descriptions = {
    mine: "Descend into the depths. Stone, ore, and gems wait below — but you only stay as long as your provisions last.",
    fish: "Cast off from the harbor. Fish come in with the tide; longer trips land the rare catches. Pack enough food for the voyage.",
  };
  const portraitIcon = biomeKey === "mine" ? "biome_mine" : "biome_fish";

  const available = Object.keys(EXPEDITION_FOOD_TURNS)
    .map((key) => ({ key, have: state.inventory?.[key] ?? 0, per: expeditionTurnsForFood(state, key, zoneId) }))
    .filter((f) => f.have > 0);

  const [supply, setSupply] = useState({});
  const totalTurns = expeditionTurnsFromSupply(state, supply, zoneId);
  const canDepart = !locked && totalTurns >= MIN_EXPEDITION_TURNS;

  const built = state.built?.[zoneId] ?? {};
  const bonuses = [];
  if (built.larder) bonuses.push("Larder +1");
  if (biomeKey === "mine" && built.mining_camp) bonuses.push("Mining Camp +1");
  if (biomeKey === "fish" && (built.pier || built.harbor_dock)) bonuses.push("Pier +1");

  const setCount = (key, n, max) => setSupply((s) => {
    const v = Math.max(0, Math.min(n, max));
    const next = { ...s };
    if (v <= 0) delete next[key]; else next[key] = v;
    return next;
  });
  const packAll = () => setSupply(Object.fromEntries(available.map((f) => [f.key, f.have])));
  const depart = () => { dispatch({ type: "EXPEDITION/DEPART", payload: { biomeKey, supply } }); onClose(); };

  return (
    <div className="absolute inset-0 bg-black/60 grid place-items-center z-50 animate-fadein" onClick={onClose}>
      <div
        className="bg-[#f4ecd8] border-[4px] border-[#b28b62] rounded-[20px] px-6 py-5 max-w-[420px] w-[94vw] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="grid place-items-center flex-shrink-0" style={{ width: 56, height: 56 }}>
            <IconCanvas iconKey={portraitIcon} size={56} />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-[19px] text-[#744d2e] leading-tight">{biome.name}</h2>
            <p className="text-[#6a4b31] text-[12px] leading-snug">{descriptions[biomeKey]}</p>
          </div>
        </div>

        {locked ? (
          <div className="bg-[#f7d572]/30 border border-[#f7d572] rounded-xl px-4 py-3 text-[#7a5020] font-bold text-[13px] my-3 text-center">
            <div className="flex items-center gap-1.5 justify-center"><Icon iconKey="ui_lock" size={14} /> Unlocks at Level {unlockLevel}</div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mt-3 mb-1.5">
              <span className="font-bold text-[12px] uppercase tracking-wide text-[#8a6a45]">Pack provisions</span>
              {available.length > 0 && (
                <button onClick={packAll} className="text-[11px] font-bold text-[#5a7a20] hover:text-[#3a5a10] underline">Pack all</button>
              )}
            </div>
            {available.length === 0 ? (
              <div className="bg-[#efe4cc] border border-[#c5a87a] rounded-lg px-3 py-3 text-[12px] text-[#7a5a3a] text-center">
                You have no provisions. Bake bread, gather apples, or buy supplies first.
              </div>
            ) : (
              <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto pr-0.5">
                {available.map((f) => {
                  const n = supply[f.key] ?? 0;
                  return (
                    <div key={f.key} className="flex items-center justify-between bg-white/40 border border-[#d4c5a8] rounded-lg px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <Icon iconKey={f.key} size={18} />
                        <div className="flex flex-col">
                          <span className="font-bold text-[12px] text-[#5a3a2a] leading-none">{FOOD_LABELS[f.key] || f.key}</span>
                          <span className="text-[10px] text-[#8a6a45] leading-none mt-0.5">{f.per} turns / ration</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setCount(f.key, n - 1, f.have)} className="w-6 h-6 flex items-center justify-center bg-[#b28b62] text-white rounded font-bold text-[14px]">-</button>
                        <span className="min-w-[2.5rem] text-center font-bold text-[#5a3a2a] text-[13px]">{n} / {f.have}</span>
                        <button onClick={() => setCount(f.key, n + 1, f.have)} className="w-6 h-6 flex items-center justify-center bg-[#b28b62] text-white rounded font-bold text-[14px]">+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col items-center gap-1.5 mt-5">
              <div className="flex items-center gap-3">
                <div className="bg-white/60 border border-[#c5a87a] rounded-xl px-4 py-2 flex flex-col items-center min-w-[80px]">
                  <span className="text-[10px] uppercase font-bold text-[#8a6a45] tracking-tight">Total Turns</span>
                  <span className="text-[18px] font-black text-[#5a7a20]">{totalTurns}</span>
                </div>
                {bonuses.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    {bonuses.map((b) => <div key={b} className="text-[10px] font-bold text-[#5a7a20] flex items-center gap-1">✨ {b}</div>)}
                  </div>
                )}
              </div>
              
              <button
                disabled={!canDepart}
                onClick={depart}
                className="w-full h-11 rounded-xl font-black text-[15px] shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100 disabled:shadow-none mt-1"
                style={{
                  background: "linear-gradient(to bottom, #8da568, #5a7a20)",
                  color: "white",
                  border: "3px solid #3a5a10",
                }}
              >
                {!canDepart && totalTurns > 0 ? `Need ${MIN_EXPEDITION_TURNS} turns min` : "SET DEPARTURE"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
