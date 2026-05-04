import React from "react";
import { APPRENTICES } from "./data.js";
import { BIOMES } from "../../constants.js";

export const modalKey = "apprentices";

const ALL_RESOURCES = [...BIOMES.farm.resources, ...BIOMES.mine.resources];

function colorForKey(key) {
  const r = ALL_RESOURCES.find((x) => x.key === key);
  if (!r) return "#888";
  return "#" + r.color.toString(16).padStart(6, "0");
}

function checkRequirement(app, state) {
  const req = app.requirement;
  if (!req) return true;
  const built = state.built || {};
  const level = state.level || 1;
  if (req.orLevel) return !!(built[req.building]) || level >= req.orLevel;
  if (req.building) return !!built[req.building];
  if (req.level) return level >= req.level;
  return true;
}

function reqLabel(app) {
  const req = app.requirement;
  if (!req) return null;
  if (req.orLevel) {
    const bName = req.building.charAt(0).toUpperCase() + req.building.slice(1);
    return `Needs ${bName} or Lv${req.orLevel}`;
  }
  if (req.building) {
    const bName = req.building.charAt(0).toUpperCase() + req.building.slice(1);
    return `Needs ${bName}`;
  }
  if (req.level) return `Needs Lv${req.level}`;
  return null;
}

function ProducesChips({ produces }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 3 }}>
      {Object.entries(produces).map(([key, amt]) => {
        const bg = key === "coins" ? "#c8923a" : colorForKey(key);
        return (
          <span
            key={key}
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: 10,
              background: bg,
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.25)",
            }}
          >
            +{amt} {key === "coins" ? "◉" : key}
          </span>
        );
      })}
    </div>
  );
}

function HiredCard({ hired, app, dispatch }) {
  return (
    <div
      style={{
        background: "#fff8e8",
        border: "2px solid #c5a87a",
        borderRadius: 14,
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: app.color,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          fontSize: 18,
          color: "#fff",
          fontWeight: 700,
          border: "2px solid rgba(255,255,255,0.4)",
        }}
      >
        {app.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#3a2715" }}>{app.name}</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: 10,
              background: app.color,
              color: "#fff",
            }}
          >
            {app.role}
          </span>
          <span style={{ fontSize: 10, color: "#9a8a72", marginLeft: "auto" }}>
            {app.wage}◉/season
          </span>
        </div>
        <ProducesChips produces={app.produces} />
      </div>
      <button
        onClick={() => dispatch({ type: "APP/FIRE", id: hired.id })}
        style={{
          fontSize: 10,
          fontWeight: 700,
          padding: "4px 8px",
          borderRadius: 8,
          border: "1.5px solid #c5a87a",
          background: "#ede4d0",
          color: "#7a6050",
          cursor: "pointer",
          flexShrink: 0,
          fontFamily: "Arial, sans-serif",
        }}
      >
        Fire
      </button>
    </div>
  );
}

function AvailableCard({ app, state, dispatch }) {
  const alreadyHired = (state.hiredApprentices || []).some((h) => h.app === app.id);
  if (alreadyHired) return null;

  const canAfford = (state.coins || 0) >= app.hireCost;
  const reqMet = checkRequirement(app, state);
  const canHire = canAfford && reqMet;
  const label = reqLabel(app);

  return (
    <div
      style={{
        background: "#fff8e8",
        border: "2px solid #c5a87a",
        borderRadius: 14,
        padding: "10px 10px 8px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: app.color,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            fontSize: 16,
            fontWeight: 700,
            color: "#fff",
            border: "2px solid rgba(255,255,255,0.35)",
          }}
        >
          {app.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#3a2715", lineHeight: 1.2 }}>{app.name}</div>
          <div style={{ fontSize: 10, color: app.color, fontWeight: 700 }}>{app.role}</div>
        </div>
      </div>

      <ProducesChips produces={app.produces} />

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 10,
            color: "#9a8a72",
            background: "#ede4d0",
            borderRadius: 8,
            padding: "1px 6px",
            fontWeight: 700,
          }}
        >
          {app.wage}◉/season
        </span>
        {label && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: 8,
              background: reqMet ? "#d4edda" : "#f8d7da",
              color: reqMet ? "#2e6b3a" : "#8b2a2a",
              border: `1px solid ${reqMet ? "#a8d9b4" : "#f0b8bc"}`,
            }}
          >
            {reqMet ? "✓ " : ""}{label}
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: canAfford ? "#3a7a3a" : "#a85050" }}>
          {app.hireCost}◉ hire
        </span>
        <button
          disabled={!canHire}
          onClick={() => dispatch({ type: "APP/HIRE", appKey: app.id })}
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "4px 12px",
            borderRadius: 8,
            border: canHire ? "2px solid #6a9010" : "2px solid #aaa",
            background: canHire ? "#91bf24" : "#ccc",
            color: canHire ? "#fff" : "#888",
            cursor: canHire ? "pointer" : "not-allowed",
            fontFamily: "Arial, sans-serif",
          }}
        >
          Hire
        </button>
      </div>
    </div>
  );
}

export function ApprenticesPanel({ state, dispatch, showHeader = true, onClose = null }) {
  const hiredApprentices = state.hiredApprentices || [];
  const idleHistory = state.idleHistory || [];
  const lastHarvest = idleHistory[0] || null;

  const availableApps = APPRENTICES.filter(
    (a) => !hiredApprentices.some((h) => h.app === a.id)
  );

  return (
    <div style={{ background: "#f4ecd8", borderRadius: 20, padding: 20, width: "100%", maxHeight: "88vh", overflowY: "auto", fontFamily: "Arial, sans-serif", boxSizing: "border-box" }}>
      {showHeader && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#3a2715" }}>🧑‍🌾 Apprentices</span>
          {onClose && <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: "#fff8e8", border: "2px solid #b28b62", color: "#6a4b31", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "grid", placeItems: "center", fontFamily: "Arial, sans-serif" }}>×</button>}
        </div>
      )}

        <p style={{ fontSize: 11, color: "#7a5a3a", marginBottom: 14, marginTop: 2 }}>
          Hire townsfolk to keep things going while you're away.
        </p>

        <div style={{ fontSize: 11, fontWeight: 700, color: "#7a5a3a", marginBottom: 8 }}>
          On the Payroll ({hiredApprentices.length})
        </div>

        {hiredApprentices.length === 0 ? (
          <p style={{ fontSize: 11, color: "#9a8a72", fontStyle: "italic", marginBottom: 14 }}>
            Nobody on the payroll yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {hiredApprentices.map((hired) => {
              const app = APPRENTICES.find((a) => a.id === hired.app);
              if (!app) return null;
              return <HiredCard key={hired.id} hired={hired} app={app} dispatch={dispatch} />;
            })}
          </div>
        )}

        {availableApps.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7a5a3a", marginBottom: 8 }}>
              Available to Hire
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 8,
                marginBottom: 14,
              }}
            >
              {availableApps.map((app) => (
                <AvailableCard key={app.id} app={app} state={state} dispatch={dispatch} />
              ))}
            </div>
          </>
        )}

        {lastHarvest && (
          <div
            style={{
              borderTop: "1.5px solid #d4c4a4",
              paddingTop: 10,
              fontSize: 11,
              color: "#7a5a3a",
            }}
          >
            <span style={{ fontWeight: 700 }}>Last harvest: </span>
            {Object.entries(lastHarvest.gains)
              .map(([k, v]) => `+${v} ${k === "coins" ? "◉" : k}`)
              .join(", ")}
          </div>
        )}
    </div>
  );
}

export default function ApprenticesModal({ state, dispatch }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(30,18,8,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: 8 }} onClick={(e) => { if (e.target === e.currentTarget) dispatch({ type: "CLOSE_MODAL" }); }}>
      <div style={{ background: "#f4ecd8", border: "4px solid #b28b62", borderRadius: 20, width: "min(640px, 94vw)" }}>
        <ApprenticesPanel state={state} dispatch={dispatch} showHeader onClose={() => dispatch({ type: "CLOSE_MODAL" })} />
      </div>
    </div>
  );
}
