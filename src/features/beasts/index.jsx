import React from "react";
import { BEASTS } from "./data.js";

export const modalKey = "beasts";

function MeterBar({ value, max = 100, fillColor, trackColor }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className="w-full h-2 rounded-full overflow-hidden"
      style={{ background: trackColor || "#3a2715" }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${pct}%`, background: fillColor }}
      />
    </div>
  );
}

function hungerColor(hunger) {
  const t = hunger / 100;
  const r = Math.round(168 + (145 - 168) * t);
  const g = Math.round(74 + (191 - 74) * t);
  const b = Math.round(26 + (36 - 26) * t);
  return `rgb(${r},${g},${b})`;
}

function BeastCard({ beast, state, dispatch }) {
  const meta = BEASTS[beast.beastKey];
  if (!meta) return null;
  const inv = state.inventory || {};
  const hasFood = (inv[meta.food] || 0) >= 1;
  const loyaltyBonus = beast.loyalty > 75;
  const yieldAmt = loyaltyBonus ? meta.baseYield * 2 : meta.baseYield;
  const hColor = hungerColor(beast.hunger);

  return (
    <div
      className="flex items-center gap-3 rounded-[14px] px-3 py-2 mb-2"
      style={{ background: "#ede0c4", border: "2px solid #c9a87a" }}
    >
      <div className="text-[32px] leading-none flex-shrink-0">{meta.icon}</div>

      <div className="flex-1 min-w-0">
        <div
          className="font-bold text-[13px] leading-tight"
          style={{ color: "#3a2715", fontFamily: "Arial, sans-serif" }}
        >
          {meta.name}
        </div>
        <div
          className="text-[10px] mb-1"
          style={{ color: "#7a5c3a", fontFamily: "Arial, sans-serif" }}
        >
          {meta.species}
        </div>

        <div className="mb-0.5">
          <div
            className="text-[10px] mb-0.5"
            style={{ color: "#3a2715", fontFamily: "Arial, sans-serif" }}
          >
            Hunger {beast.hunger}%
          </div>
          <MeterBar value={beast.hunger} fillColor={hColor} trackColor="#c9a87a" />
        </div>

        <div>
          <div
            className="text-[10px] mb-0.5"
            style={{ color: "#3a2715", fontFamily: "Arial, sans-serif" }}
          >
            Loyalty {beast.loyalty}%{loyaltyBonus ? " ✦" : ""}
          </div>
          <MeterBar value={beast.loyalty} fillColor="#c8923a" trackColor="#3a2715" />
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <div
          className="text-[11px] font-bold whitespace-nowrap"
          style={{ color: "#5a8a1a", fontFamily: "Arial, sans-serif" }}
        >
          +{yieldAmt} {meta.yields}/season
        </div>

        <button
          onClick={() => dispatch({ type: "BEASTS/FEED", id: beast.id })}
          disabled={!hasFood}
          className="px-2 py-1 rounded-[8px] text-[11px] font-bold transition-opacity"
          style={{
            background: hasFood ? "#5a8a1a" : "#9a9a9a",
            color: "#fff",
            fontFamily: "Arial, sans-serif",
            opacity: hasFood ? 1 : 0.5,
            cursor: hasFood ? "pointer" : "not-allowed",
            border: "none",
          }}
        >
          Feed {meta.food}
        </button>

        <button
          onClick={() => dispatch({ type: "BEASTS/RELEASE", id: beast.id })}
          className="text-[10px] px-2 py-0.5 rounded-[6px]"
          style={{
            background: "transparent",
            color: "#9a7a5a",
            fontFamily: "Arial, sans-serif",
            border: "1px solid #c9a87a",
            cursor: "pointer",
          }}
        >
          Release
        </button>
      </div>
    </div>
  );
}

function TameOffer({ beastKey, state, dispatch }) {
  const meta = BEASTS[beastKey];
  if (!meta) return null;
  const cost = meta.tameCost;
  const inv = state.inventory || {};
  const canAfford = (inv[cost.resource] || 0) >= cost.amount;

  return (
    <div
      className="rounded-[16px] p-4 mb-4"
      style={{
        background: "linear-gradient(135deg, #e8d9b8, #f4ecd8)",
        border: "2px solid #c8923a",
      }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="text-[44px] leading-none">{meta.icon}</div>
        <div>
          <div
            className="font-bold text-[15px]"
            style={{ color: "#3a2715", fontFamily: "Arial, sans-serif" }}
          >
            {meta.name}
          </div>
          <div
            className="text-[11px] italic mt-0.5"
            style={{ color: "#7a5c3a", fontFamily: "Arial, sans-serif" }}
          >
            {meta.flavor}
          </div>
        </div>
      </div>

      <div
        className="text-[12px] mb-3"
        style={{ color: "#5a3a1a", fontFamily: "Arial, sans-serif" }}
      >
        Pay {cost.amount} {cost.resource} to tame.
        {!canAfford && (
          <span style={{ color: "#a84a1a", fontWeight: "bold" }}>
            {" "}(need {cost.amount - (inv[cost.resource] || 0)} more)
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => dispatch({ type: "BEASTS/TAME", beastKey })}
          disabled={!canAfford}
          className="flex-1 py-2 rounded-[10px] font-bold text-[13px] transition-opacity"
          style={{
            background: canAfford ? "#5a8a1a" : "#9a9a9a",
            color: "#fff",
            fontFamily: "Arial, sans-serif",
            opacity: canAfford ? 1 : 0.55,
            cursor: canAfford ? "pointer" : "not-allowed",
            border: "none",
          }}
        >
          Tame
        </button>
        <button
          onClick={() => dispatch({ type: "BEASTS/REFUSE" })}
          className="flex-1 py-2 rounded-[10px] font-bold text-[13px]"
          style={{
            background: "#c9a87a",
            color: "#3a2715",
            fontFamily: "Arial, sans-serif",
            border: "none",
            cursor: "pointer",
          }}
        >
          Refuse
        </button>
      </div>
    </div>
  );
}

export default function BeastsModal({ state, dispatch }) {
  const { tameable, tamedBeasts = [] } = state;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.68)" }}
    >
      <div
        className="bg-[#f4ecd8] rounded-[20px] p-5 overflow-y-auto"
        style={{
          border: "4px solid #b28b62",
          width: "min(560px, 94vw)",
          maxHeight: "88vh",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div
            className="font-bold text-[18px]"
            style={{ color: "#3a2715", fontFamily: "Arial, sans-serif" }}
          >
            🦊 Stables
          </div>
          <button
            onClick={() => dispatch({ type: "CLOSE_MODAL" })}
            className="w-7 h-7 flex items-center justify-center rounded-full text-[16px] font-bold leading-none"
            style={{
              background: "#c9a87a",
              color: "#3a2715",
              border: "none",
              cursor: "pointer",
              fontFamily: "Arial, sans-serif",
            }}
          >
            ×
          </button>
        </div>

        {tameable && (
          <TameOffer beastKey={tameable} state={state} dispatch={dispatch} />
        )}

        {tamedBeasts.length === 0 ? (
          <div
            className="text-center py-6 text-[13px]"
            style={{ color: "#9a7a5a", fontFamily: "Arial, sans-serif" }}
          >
            No beasts. Wait for one to wander into the vale.
          </div>
        ) : (
          <div>
            <div
              className="text-[11px] font-bold mb-2 uppercase tracking-wide"
              style={{ color: "#7a5c3a", fontFamily: "Arial, sans-serif" }}
            >
              Your Beasts ({tamedBeasts.length})
            </div>
            {tamedBeasts.map((beast) => (
              <BeastCard
                key={beast.id}
                beast={beast}
                state={state}
                dispatch={dispatch}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
