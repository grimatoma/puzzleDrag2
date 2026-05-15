import { useState } from "react";
import { BIOMES, EXPEDITION_FOOD_TURNS, MIN_EXPEDITION_TURNS } from "../../constants.js";
import { expeditionTurnsForFood, expeditionTurnsFromSupply, settlementHazards } from "./data.js";
import { ParchmentDialog } from "../../ui/primitives/Dialog.jsx";
import Button from "../../ui/primitives/Button.jsx";
import Stepper from "../../ui/primitives/Stepper.jsx";
import IconCanvas from "../../ui/IconCanvas.jsx";
import Icon from "../../ui/Icon.jsx";

const FOOD_LABELS = {
  supplies: "Supplies", fruit_apple: "Apple", bread: "Bread", cured_meat: "Cured Meat",
  festival_loaf: "Festival Loaf", wedding_pie: "Wedding Pie", iron_ration: "Iron Ration",
};

export default function BiomeEntryModal({ biomeKey, state, dispatch, onClose }) {
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
    <ParchmentDialog open onClose={onClose} size="md">
      <ParchmentDialog.Title>
        <span className="flex items-center gap-3">
          <span className="grid place-items-center flex-shrink-0" style={{ width: 48, height: 48 }}>
            <IconCanvas iconKey={portraitIcon} size={48} />
          </span>
          <span className="min-w-0">
            <span className="block leading-tight">{biome.name}</span>
            <span className="block text-caption font-normal text-ink-mid leading-snug mt-1">{descriptions[biomeKey]}</span>
          </span>
        </span>
      </ParchmentDialog.Title>
      <ParchmentDialog.Body>
        {locked ? (
          <div className="bg-[#f7d572]/30 border border-[#f7d572] rounded-xl px-4 py-3 text-[#7a5020] font-bold text-body text-center">
            <div className="flex items-center gap-1.5 justify-center"><Icon iconKey="ui_lock" size={14} /> Unlocks at Level {unlockLevel}</div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-caption uppercase tracking-wide text-ink-light">Pack provisions</span>
              {available.length > 0 && (
                <button onClick={packAll} className="text-caption font-bold text-[#5a7a20] hover:text-[#3a5a10] underline">Pack all</button>
              )}
            </div>
            {available.length === 0 ? (
              <div className="bg-[#efe4cc] border border-[#c5a87a] rounded-lg px-3 py-3 text-caption text-ink-light text-center">
                You have no provisions. Bake bread, gather apples, or buy supplies first.
              </div>
            ) : (
              <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto pr-0.5">
                {available.map((f) => {
                  const n = supply[f.key] ?? 0;
                  return (
                    <div key={f.key} className="flex items-center gap-2 bg-[#efe4cc] border border-[#c5a87a] rounded-lg px-2 py-1.5">
                      <span className="grid place-items-center flex-shrink-0" style={{ width: 26, height: 26 }}>
                        <Icon iconKey={f.key} size={24} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-caption text-ink leading-tight truncate">{FOOD_LABELS[f.key] ?? f.key}</div>
                        <div className="text-micro text-ink-light">have {f.have} · {f.per} turn{f.per === 1 ? "" : "s"} each</div>
                      </div>
                      <div className="flex-shrink-0">
                        <Stepper
                          size="md"
                          min={0}
                          max={f.have}
                          accelerator
                          value={n}
                          onChange={(v) => setCount(f.key, v, f.have)}
                          presets={[1, 5, 10, "max"]}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-3 rounded-xl border-2 border-iron bg-[#fff7e6] px-3 py-2 text-center">
              <div className="text-micro uppercase tracking-wide text-ink-light font-bold">Expedition length</div>
              <div className={`text-h2 font-extrabold leading-tight ${canDepart ? "text-[#5a7a1a]" : "text-[#9a3a2a]"}`}>{totalTurns} turn{totalTurns === 1 ? "" : "s"}</div>
              {bonuses.length > 0 && (
                <div className="flex flex-wrap gap-1 justify-center mt-1">
                  {bonuses.map((b) => (
                    <span key={b} className="text-[9px] font-bold text-[#3a2c0e] bg-[#e6d2a0] border border-[#b09a50] rounded-full px-1.5 py-0.5">{b}/food</span>
                  ))}
                </div>
              )}
              {!canDepart && <div className="text-micro text-[#9a3a2a] mt-1">Pack at least {MIN_EXPEDITION_TURNS} turns of food.</div>}
            </div>

            {(() => {
              const hazards = settlementHazards(state, zoneId);
              if (hazards.length === 0) return null;
              return (
                <div className="mt-2.5 flex flex-col gap-1">
                  <div className="text-micro uppercase tracking-wider text-[#9a3a2a] font-bold flex items-center gap-1">
                    <Icon iconKey="hazard_smoke" size={10} /> Active Dangers
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {hazards.map((h) => (
                      <span key={h} className="text-micro font-bold bg-[#9a3a2a]/10 text-[#9a3a2a] border border-[#9a3a2a]/30 rounded-lg px-2 py-0.5 capitalize">
                        {h.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </ParchmentDialog.Body>
      <ParchmentDialog.Actions sticky>
        <Button tone="ghost" size="md" onClick={onClose}>Close</Button>
        {!locked && (
          <Button tone="ember" size="md" onClick={depart} disabled={!canDepart}>
            Set out →
          </Button>
        )}
      </ParchmentDialog.Actions>
    </ParchmentDialog>
  );
}
