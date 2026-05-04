import React from "react";
import { BOSS_META, WEATHER_META } from "./slice.js";

export const modalKey = "boss";

function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "#1a0d05" }}>
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${pct}%`, background: color || "#ff7a00" }}
      />
    </div>
  );
}

function WeatherBadge({ weather }) {
  if (!weather) return null;
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold text-white mt-3"
      style={{ background: weather.color || "#3a6b8a", opacity: 0.9 }}
    >
      <span>{weather.emoji}</span>
      <span>{weather.label} active</span>
    </div>
  );
}

function MiniCard({ boss, weather, dispatch }) {
  const pct = boss.targetCount > 0
    ? Math.min(100, Math.round((boss.progress / boss.targetCount) * 100))
    : 0;

  return (
    <div
      className="absolute top-2 right-2 z-50 cursor-pointer select-none"
      style={{ maxWidth: 200 }}
      onClick={() => dispatch({ type: "BOSS/EXPAND" })}
    >
      <div
        className="rounded-xl p-2 text-white shadow-xl"
        style={{
          background: "rgba(58,39,21,0.95)",
          border: "2px solid #a8431a",
        }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[14px]">{boss.emoji}</span>
          <span className="text-[10px] font-bold text-[#ff7a00] leading-tight">{boss.name}</span>
        </div>
        <div className="text-[9px] text-white/70 mb-1">
          {boss.progress}/{boss.targetCount} &middot; {boss.turnsLeft}t left
        </div>
        <ProgressBar value={boss.progress} max={boss.targetCount} color="#ff7a00" />
        {weather && (
          <div className="mt-1 text-[8px] font-bold" style={{ color: weather.color || "#3a6b8a" }}>
            {weather.emoji} {weather.label}
          </div>
        )}
      </div>
    </div>
  );
}

function BossModal({ boss, weather, dispatch }) {
  const meta = BOSS_META[boss.key] || {};
  const pct = boss.targetCount > 0
    ? Math.min(100, Math.round((boss.progress / boss.targetCount) * 100))
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.72)" }}
    >
      <div
        className="rounded-[20px] p-5 shadow-2xl text-white overflow-y-auto"
        style={{
          background: "linear-gradient(to bottom, #3a2715, #1a0d05)",
          border: "4px solid #a8431a",
          width: "min(540px, 92vw)",
          maxHeight: "85vh",
        }}
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-1 mb-4">
          <div className="text-[48px] leading-none mb-1">{boss.emoji}</div>
          <div
            className="text-[20px] font-bold text-center leading-tight"
            style={{ color: "#ff7a00", fontFamily: "Arial, sans-serif" }}
          >
            {boss.name}
          </div>
          <div
            className="text-[12px] text-white/70 text-center italic mt-1 px-2"
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            {meta.flavor || boss.flavor}
          </div>
        </div>

        {/* Goal panel */}
        <div
          className="rounded-xl p-4 mb-4"
          style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(168,67,26,0.5)" }}
        >
          <div
            className="text-[13px] font-bold text-center mb-3 leading-snug"
            style={{ color: "#f8e7c6", fontFamily: "Arial, sans-serif" }}
          >
            {boss.goal}
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-white/60" style={{ fontFamily: "Arial, sans-serif" }}>
              Progress
            </span>
            <span className="text-[13px] font-bold" style={{ color: "#ff7a00", fontFamily: "Arial, sans-serif" }}>
              {boss.progress} / {boss.targetCount}
            </span>
          </div>
          <ProgressBar value={boss.progress} max={boss.targetCount} color="#ff7a00" />

          <div className="flex justify-between mt-3">
            <span className="text-[11px] text-white/50" style={{ fontFamily: "Arial, sans-serif" }}>
              {pct}% complete
            </span>
            <span
              className="text-[12px] font-bold"
              style={{ color: boss.turnsLeft <= 1 ? "#ff4040" : "#f8e7c6", fontFamily: "Arial, sans-serif" }}
            >
              {boss.turnsLeft} turn{boss.turnsLeft !== 1 ? "s" : ""} left
            </span>
          </div>
        </div>

        {/* Reward hint */}
        <div
          className="text-[11px] text-center text-white/50 mb-4"
          style={{ fontFamily: "Arial, sans-serif" }}
        >
          Victory reward: +200 coins
        </div>

        {/* Weather badge if active */}
        {weather && (
          <div className="flex justify-center mb-4">
            <WeatherBadge weather={weather} />
          </div>
        )}

        {/* Accept button */}
        <button
          onClick={() => dispatch({ type: "BOSS/CLOSE" })}
          className="w-full py-3 rounded-xl font-bold text-[15px] transition-colors"
          style={{
            background: "linear-gradient(to bottom, #e8622a, #a84010)",
            border: "2px solid #ff9a50",
            color: "white",
            fontFamily: "Arial, sans-serif",
            letterSpacing: "0.05em",
          }}
        >
          ACCEPT THE CHALLENGE
        </button>
      </div>
    </div>
  );
}

export default function BossFeature({ state, dispatch }) {
  const { boss, bossMinimized, weather } = state;

  // Component only mounts when modal === 'boss'.
  // When minimized, render a floating mini-card instead of the full modal.
  if (bossMinimized && boss) {
    return <MiniCard boss={boss} weather={weather} dispatch={dispatch} />;
  }

  if (!boss) return null;

  return <BossModal boss={boss} weather={weather} dispatch={dispatch} />;
}
