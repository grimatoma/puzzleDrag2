// Expedition Rations tab — Balance Manager.
//
// Tunes the supply-structured mine/harbor round (master doc §VI): how many
// turns each ration is worth, and which foods count as "meat" for the
// Smokehouse +1 modifier. Patches go to `draft.expedition` and merge into the
// live EXPEDITION_FOOD_TURNS / EXPEDITION_MEAT_FOODS tables on next load via
// `applyExpeditionOverrides`. Overrides are additive — you can tune an existing
// food or add a new key, but not remove a default.

import { useState } from "react";
import { EXPEDITION_FOOD_TURNS, EXPEDITION_MEAT_FOODS } from "../../constants.js";
import { COLORS, NumberField, TextField, SmallButton, Card, FieldRow } from "../shared.jsx";

export default function RationsTab({ draft, updateDraft }) {
  const [newKey, setNewKey] = useState("");
  const exp = draft.expedition ?? {};
  const foodTurns = { ...EXPEDITION_FOOD_TURNS, ...(exp.foodTurns ?? {}) };
  const meatFoods = Array.isArray(exp.meatFoods) ? exp.meatFoods : EXPEDITION_MEAT_FOODS;

  function patch(fields) {
    updateDraft((d) => {
      d.expedition = { ...(d.expedition ?? {}), ...fields };
      if (d.expedition.foodTurns && Object.keys(d.expedition.foodTurns).length === 0) delete d.expedition.foodTurns;
      if (d.expedition.meatFoods && d.expedition.meatFoods.length === 0) delete d.expedition.meatFoods;
      if (Object.keys(d.expedition).length === 0) delete d.expedition;
    });
  }
  const setTurns = (key, v) => patch({ foodTurns: { ...(exp.foodTurns ?? {}), [key]: v } });
  const toggleMeat = (key) => {
    const next = meatFoods.includes(key) ? meatFoods.filter((k) => k !== key) : [...meatFoods, key];
    patch({ meatFoods: next });
  };
  const addFood = () => {
    const k = newKey.trim();
    if (!k || foodTurns[k] != null) return;
    setTurns(k, 1);
    setNewKey("");
  };

  return (
    <div className="flex flex-col gap-3">
      <Card title="Ration turn values">
        <div className="text-[11px] italic mb-1" style={{ color: COLORS.inkSubtle }}>
          One unit of each food is worth this many expedition turns (before building bonuses).
        </div>
        {Object.keys(foodTurns).map((key) => (
          <FieldRow key={key} label={key} hint={meatFoods.includes(key) ? "🥩 meat — Smokehouse +1" : undefined}>
            <NumberField value={foodTurns[key]} onChange={(v) => setTurns(key, v)} min={0} max={99} />
          </FieldRow>
        ))}
        <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: `1px dashed ${COLORS.border}` }}>
          <TextField value={newKey} onChange={setNewKey} placeholder="new food key…" width={180} />
          <SmallButton onClick={addFood} variant="primary">+ Add ration</SmallButton>
        </div>
      </Card>

      <Card title="Meat foods (Smokehouse +1)">
        <div className="text-[11px] italic mb-1" style={{ color: COLORS.inkSubtle }}>
          The Smokehouse building adds +1 turn to every food checked here.
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(foodTurns).map((key) => {
            const on = meatFoods.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleMeat(key)}
                className="px-2 py-1 rounded-lg border-2 text-[11px] font-bold transition-colors"
                style={{
                  background: on ? "#a05050" : COLORS.parchmentDeep,
                  borderColor: on ? "#7a3030" : COLORS.border,
                  color: on ? "#fff" : COLORS.inkSubtle,
                }}
              >
                {on ? "🥩 " : "○ "}{key}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
