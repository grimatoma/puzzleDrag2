
import { WORKERS, WORKER_MAP, workerSlotLabel, totalHired, housingCapacity, checkRequirement } from "./data.js";
import { BIOMES } from "../../constants.js";

export const modalKey = "apprentices";

const ALL_RESOURCES = [...BIOMES.farm.resources, ...BIOMES.mine.resources];

function colorForKey(key) {
  const r = ALL_RESOURCES.find((x) => x.key === key);
  if (!r) return "#888";
  return "#" + r.color.toString(16).padStart(6, "0");
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

function effectLabel(worker, hiredCount) {
  const e = worker.effect;
  const slots = String(workerSlotLabel(worker));
  switch (e.type) {
    case "threshold_reduce": {
      const perHire = (e.from - e.to) / worker.maxCount;
      const current = e.from - hiredCount * perHire;
      return `${e.key} chain: ${e.from}→${hiredCount === worker.maxCount ? e.to : current} tiles to upgrade · slots: ${slots}`;
    }
    case "pool_weight":
      return `+${(e.amount * hiredCount / worker.maxCount).toFixed(1)} ${e.key} spawn weight · slots: ${slots}`;
    case "bonus_yield":
      return `+${(e.amount * hiredCount / worker.maxCount).toFixed(1)} ${e.key} per chain · slots: ${slots}`;
    case "season_bonus":
      return `+${(e.amount * hiredCount / worker.maxCount).toFixed(0)}◉ each season · slots: ${slots}`;
    default:
      return `slots: ${slots}`;
  }
}

function WorkerRow({ worker, state, dispatch }) {
  const hiredCount = state.workers?.hired?.[worker.id] ?? 0;
  const cap = housingCapacity(state);
  const total = totalHired(state);
  const pool = state.workers?.pool ?? 0;
  const reqMet = checkRequirement(worker, state);
  const canAfford = (state.coins ?? 0) >= worker.hireCost;
  const atWorkerMax = hiredCount >= worker.maxCount;
  const atHousingCap = total >= cap;
  const noPool = pool < 1;

  let hireDisabled = atWorkerMax || atHousingCap || !canAfford || !reqMet || noPool;
  let hireTooltip = "";
  if (atWorkerMax) hireTooltip = `${worker.name}'s slots are full`;
  else if (atHousingCap) hireTooltip = "Build Housing for more capacity";
  else if (noPool) hireTooltip = "Need a Worker (build Housing or wait a season)";
  else if (!canAfford) hireTooltip = `Need ${worker.hireCost}◉`;
  else if (!reqMet) hireTooltip = "Requirements not met";

  return (
    <div style={{
      background: "#fff8e8",
      border: hiredCount > 0 ? "2px solid #c5a87a" : "2px solid #ddd",
      borderRadius: 12,
      padding: "8px 10px",
      display: "flex",
      flexDirection: "column",
      gap: 3,
      fontFamily: "Arial, sans-serif",
      opacity: !reqMet ? 0.6 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#3a2715" }}>{worker.name}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#7a6050", background: "#ede4d0",
          borderRadius: 8, padding: "1px 6px" }}>{worker.role}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#6a9010", marginLeft: "auto" }}>
          {hiredCount} / {workerSlotLabel(worker)}
        </span>
      </div>
      <div style={{ fontSize: 10, color: "#7a5a3a", lineHeight: 1.3 }}>
        {effectLabel(worker, hiredCount)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, color: "#9a8a72" }}>{worker.wage}◉/season</span>
        {reqLabel(worker) && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 8,
            background: reqMet ? "#d4edda" : "#f8d7da",
            color: reqMet ? "#2e6b3a" : "#8b2a2a",
            border: `1px solid ${reqMet ? "#a8d9b4" : "#f0b8bc"}`,
          }}>
            {reqMet ? "✓ " : ""}{reqLabel(worker)}
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700,
          color: canAfford ? "#3a7a3a" : "#a85050" }}>{worker.hireCost}◉</span>
        <button
          title={hireTooltip}
          disabled={hireDisabled}
          onClick={() => dispatch({ type: "APP/HIRE", payload: { id: worker.id } })}
          style={{
            fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 8,
            border: hireDisabled ? "2px solid #aaa" : "2px solid #6a9010",
            background: hireDisabled ? "#ccc" : "#91bf24",
            color: hireDisabled ? "#888" : "#fff",
            cursor: hireDisabled ? "not-allowed" : "pointer",
            fontFamily: "Arial, sans-serif",
          }}
        >
          Hire
        </button>
        {hiredCount > 0 && (
          <button
            onClick={() => dispatch({ type: "APP/FIRE", payload: { id: worker.id } })}
            style={{
              fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8,
              border: "1.5px solid #c5a87a", background: "#ede4d0", color: "#7a6050",
              cursor: "pointer", fontFamily: "Arial, sans-serif",
            }}
          >
            Fire
          </button>
        )}
      </div>
    </div>
  );
}

export function ApprenticesPanel({ state, dispatch, showHeader = true, onClose = null }) {
  const cap = housingCapacity(state);
  const pool = state.workers?.pool ?? 0;
  const debtOwed = state.workers?.debt ?? 0;

  const inner = (
    <>
      {showHeader && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#3a2715" }}>Workers</span>
          {onClose && (
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8,
              background: "#fff8e8", border: "2px solid #b28b62", color: "#6a4b31",
              fontWeight: 700, fontSize: 14, cursor: "pointer", display: "grid",
              placeItems: "center", fontFamily: "Arial, sans-serif" }}>×</button>
          )}
        </div>
      )}

      {/* Capacity + Pool header */}
      <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#7a5a3a",
          background: "#ede4d0", borderRadius: 8, padding: "2px 8px" }}>
          Capacity: {cap}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#3a7a3a",
          background: "#d4edda", borderRadius: 8, padding: "2px 8px" }}>
          Workers: {pool}
        </span>
        {debtOwed > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#8b0000",
            background: "#f8d7da", borderRadius: 8, padding: "2px 8px",
            title: "Wages unpaid — workers are idle" }}>
            Debt: {debtOwed}◉ — idle
          </span>
        )}
      </div>

      {/* DEV-only IAP stub */}
      {typeof import.meta !== "undefined" && import.meta.env?.DEV && (
        <button
          onClick={() => dispatch({ type: "WORKERS/BUY_POOL", payload: { amount: 5 } })}
          style={{ fontSize: 10, padding: "2px 8px", borderRadius: 8, background: "#2a4a8a",
            color: "#fff", border: "none", cursor: "pointer", marginBottom: 8,
            fontFamily: "Arial, sans-serif" }}
        >
          Buy 5 Workers (debug)
        </button>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {WORKERS.map((worker) => (
          <WorkerRow key={worker.id} worker={worker} state={state} dispatch={dispatch} />
        ))}
      </div>
    </>
  );

  if (!showHeader) return inner;

  return (
    <div style={{ background: "#f4ecd8", borderRadius: 20, padding: 20, width: "100%",
      maxHeight: "88vh", overflowY: "auto", fontFamily: "Arial, sans-serif",
      boxSizing: "border-box" }}>
      {inner}
    </div>
  );
}

export default function ApprenticesModal({ state, dispatch }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(30,18,8,0.72)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 500, padding: 8 }}
      onClick={(e) => { if (e.target === e.currentTarget) dispatch({ type: "CLOSE_MODAL" }); }}
    >
      <div style={{ background: "#f4ecd8", border: "4px solid #b28b62", borderRadius: 20,
        width: "min(640px, 94vw)" }}>
        <ApprenticesPanel state={state} dispatch={dispatch} showHeader
          onClose={() => dispatch({ type: "CLOSE_MODAL" })} />
      </div>
    </div>
  );
}
