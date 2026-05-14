import { useState } from "react";
import { BIOMES, EXPEDITION_FOOD_TURNS, MIN_EXPEDITION_TURNS } from "../../constants.js";
import { expeditionTurnsForFood, expeditionTurnsFromSupply } from "../../features/zones/data.js";
import IconCanvas from "../IconCanvas.jsx";
import Icon from "../Icon.jsx";
import Stepper from "../primitives/Stepper.jsx";
import Button from "../primitives/Button.jsx";
import { ParchmentDialog } from "../primitives/Dialog.jsx";
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
    <ParchmentDialog open onClose={onClose} size="md" labelledBy="biome-entry-title">
      <div className="px-6 pt-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="grid place-items-center flex-shrink-0" style={{ width: 56, height: 56 }}>
            <IconCanvas iconKey={portraitIcon} size={56} />
          </div>
          <div className="min-w-0">
            <h2 id="biome-entry-title" className="font-bold text-[19px] text-[var(--ember-deep)] leading-tight">{biome.name}</h2>
            <p className="text-[var(--ink-warm)] text-[12px] leading-snug">{descriptions[biomeKey]}</p>
          </div>
        </div>
      </div>

      <ParchmentDialog.Body>
        {locked ? (
          <div className="bg-[#f7d572]/30 border border-[#f7d572] rounded-xl px-4 py-3 text-[#7a5020] font-bold text-[13px] my-3 text-center">
            <div className="flex items-center gap-1.5 justify-center"><Icon iconKey="ui_lock" size={14} /> Unlocks at Level {unlockLevel}</div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[12px] uppercase tracking-wide text-[var(--ink-mute)]">Pack provisions</span>
              {available.length > 0 && (
                <button onClick={packAll} className="text-[11px] font-bold text-[#5a7a20] hover:text-[#3a5a10] underline">Pack all</button>
              )}
            </div>
            {available.length === 0 ? (
              <div className="bg-[#efe4cc] border border-[#c5a87a] rounded-lg px-3 py-3 text-[12px] text-[#7a5a3a] text-center">
                You have no provisions. Bake bread, gather apples, or buy supplies first.
              </div>
            ) : (
              <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-0.5" style={{ overscrollBehavior: "contain" }}>
                {available.map((f) => {
                  const n = supply[f.key] ?? 0;
                  return (
                    <div key={f.key} className="flex items-center justify-between bg-white/40 border border-[#d4c5a8] rounded-lg px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <Icon iconKey={f.key} size={18} />
                        <div className="flex flex-col">
                          <span className="font-bold text-[12px] text-[#5a3a2a] leading-none">{FOOD_LABELS[f.key] || f.key}</span>
                          <span className="text-[10px] text-[var(--ink-mute)] leading-none mt-0.5">{f.per} turns / ration</span>
                        </div>
                      </div>
                      <Stepper
                        value={n}
                        min={0}
                        max={f.have}
                        onChange={(v) => setCount(f.key, v, f.have)}
                        suffix={` / ${f.have}`}
                        ariaLabel={`Pack ${FOOD_LABELS[f.key] || f.key}`}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col items-center gap-1.5 mt-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/60 border border-[#c5a87a] rounded-xl px-4 py-2 flex flex-col items-center min-w-[80px]">
                  <span className="text-[10px] uppercase font-bold text-[var(--ink-mute)] tracking-tight">Total Turns</span>
                  <span className="text-[18px] font-black text-[#5a7a20] tabular-nums">{totalTurns}</span>
                </div>
                {bonuses.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    {bonuses.map((b) => <div key={b} className="text-[10px] font-bold text-[#5a7a20] flex items-center gap-1">✨ {b}</div>)}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </ParchmentDialog.Body>

      <ParchmentDialog.Actions>
        {!locked ? (
          <Button tone="moss" size="lg" block disabled={!canDepart} onClick={depart}>
            {!canDepart && totalTurns > 0 ? `Need ${MIN_EXPEDITION_TURNS} turns min` : "Set departure"}
          </Button>
        ) : (
          <Button tone="iron" size="md" onClick={onClose}>Close</Button>
        )}
      </ParchmentDialog.Actions>
    </ParchmentDialog>
  );
}
