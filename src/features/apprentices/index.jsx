
import { WORKERS, workerSlotLabel, totalHired, housingCapacity, checkRequirement } from "./data.js";
import IconCanvas, { hasIcon } from "../../ui/IconCanvas.jsx";

export const modalKey = "apprentices";

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

/**
 * Format a hireCost that may be a number (200◉) or an object ({worker:1, mine_coke:4}).
 * Returns a plain string like "1 worker · 4 coke · 6 bread".
 */
export function formatHireCost(hireCost) {
  if (typeof hireCost === "number") return `${hireCost}◉`;
  if (typeof hireCost === "object" && hireCost !== null) {
    return Object.entries(hireCost)
      .map(([k, v]) => `${v} ${k}`)
      .join(" · ");
  }
  return String(hireCost);
}

function effectLabel(worker, hiredCount) {
  const slots = String(workerSlotLabel(worker));
  if (!worker.abilities || worker.abilities.length === 0) return `slots: ${slots}`;

  const perHireScalar = worker.maxCount > 0 ? hiredCount / worker.maxCount : 0;
  const parts = worker.abilities.map(ab => {
    const p = ab.params || {};
    switch (ab.id) {
      case "threshold_reduce_category": {
        const current = (p.amount * perHireScalar).toFixed(1).replace(/\.0$/, "");
        return `−${current} ${p.category} chain steps`;
      }
      case "threshold_reduce": {
        const current = (p.amount * perHireScalar).toFixed(1).replace(/\.0$/, "");
        return `−${current} ${p.target} chain steps`;
      }
      case "recipe_input_reduce": {
        const current = (p.amount * perHireScalar).toFixed(1).replace(/\.0$/, "");
        return `−${current} ${p.input} for ${p.recipe}`;
      }
      case "pool_weight":
      case "pool_weight_legacy": {
        const current = (p.amount * perHireScalar).toFixed(1).replace(/\.0$/, "");
        return `+${current} ${p.target} weight`;
      }
      case "bonus_yield": {
        const current = (p.amount * perHireScalar).toFixed(1).replace(/\.0$/, "");
        return `+${current} ${p.target} yield`;
      }
      case "season_bonus": {
        const current = Math.floor(p.amount * perHireScalar);
        return `+${current} ${p.resource}/season`;
      }
      case "hazard_spawn_reduce": {
        const current = Math.round(p.amount * 100 * perHireScalar);
        return `−${current}% ${p.hazard} spawn`;
      }
      case "hazard_coin_multiplier": {
        const current = (1 + (p.multiplier - 1) * perHireScalar).toFixed(1).replace(/\.0$/, "");
        return `${current}x ${p.hazard} bounty`;
      }
      case "chain_redirect_category": {
        return `${p.fromCategory} → ${p.toCategory}`;
      }
      default:
        return ab.id;
    }
  });
  
  return `${parts.join(" · ")} · slots: ${slots}`;
}

function WorkerRow({ worker, state, dispatch }) {
  const hiredCount = state.townsfolk?.hired?.[worker.id] ?? 0;
  const cap = housingCapacity(state);
  const total = totalHired(state);
  const pool = state.townsfolk?.pool ?? 0;
  const reqMet = checkRequirement(worker, state);
  const canAfford = (() => {
    if (typeof worker.hireCost === "number") return (state.coins ?? 0) >= worker.hireCost;
    if (typeof worker.hireCost === "object" && worker.hireCost !== null) {
      for (const [res, amt] of Object.entries(worker.hireCost)) {
        if (res === "worker") continue;
        if ((state.inventory?.[res] ?? 0) < amt) return false;
      }
      return true;
    }
    return true;
  })();
  const atWorkerMax = hiredCount >= worker.maxCount;
  const atHousingCap = total >= cap;
  const noPool = pool < 1;

  let hireDisabled = atWorkerMax || atHousingCap || !canAfford || !reqMet || noPool;
  let hireTooltip = "";
  if (atWorkerMax) hireTooltip = `${worker.name}'s slots are full`;
  else if (atHousingCap) hireTooltip = "Build Housing for more capacity";
  else if (noPool) hireTooltip = "Need a Worker (build Housing or wait a season)";
  else if (!canAfford) {
    if (typeof worker.hireCost === "object" && worker.hireCost !== null) {
      const missing = Object.entries(worker.hireCost)
        .filter(([res, amt]) => res !== "worker" && (state.inventory?.[res] ?? 0) < amt)
        .map(([res, amt]) => `${amt} ${res}`)
        .join(", ");
      hireTooltip = `Need: ${missing}`;
    } else {
      hireTooltip = `Need ${formatHireCost(worker.hireCost)}`;
    }
  } else if (!reqMet) hireTooltip = "Requirements not met";

  const portraitKey = `char_${worker.id}`;
  const hasPortrait = hasIcon(portraitKey);
  return (
    <div style={{
      background: hiredCount > 0 ? "#fff8e8" : "#faf3e0",
      border: hiredCount > 0 ? `2px solid ${worker.color || "#c5a87a"}` : "2px solid #ddd",
      borderRadius: 12,
      padding: "8px 10px",
      display: "flex",
      gap: 10,
      fontFamily: "Arial, sans-serif",
      opacity: !reqMet ? 0.6 : 1,
      boxShadow: hiredCount > 0 ? `0 1px 4px ${worker.color}33` : "none",
    }}>
      {/* Portrait column */}
      {hasPortrait ? (
        <div style={{
          flexShrink: 0,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: `2px solid ${worker.color || "#c5a87a"}`,
          background: "#fff",
          overflow: "hidden",
          alignSelf: "flex-start",
          boxShadow: "0 2px 4px rgba(0,0,0,0.12)",
        }}>
          <IconCanvas iconKey={portraitKey} size={56} />
        </div>
      ) : (
        <div style={{
          flexShrink: 0,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: worker.color || "#c5a87a",
          display: "grid",
          placeItems: "center",
          color: "#fff",
          fontSize: 24,
          fontWeight: 700,
          border: "2px solid rgba(255,255,255,0.5)",
        }}>
          {worker.icon || worker.name[0]}
        </div>
      )}
      {/* Info column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#3a2715" }}>{worker.name}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#7a6050", background: "#ede4d0",
          borderRadius: 8, padding: "1px 6px" }}>{worker.role}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#6a9010", marginLeft: "auto" }}>
          {hiredCount} / {workerSlotLabel(worker)}
        </span>
      </div>
      {worker.description && (
        <div style={{ fontSize: 10, color: "#5a4a2a", lineHeight: 1.4, fontStyle: "italic" }}>
          {worker.description}
        </div>
      )}
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
          color: canAfford ? "#3a7a3a" : "#a85050" }}>{formatHireCost(worker.hireCost)}</span>
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
    </div>
  );
}

export function ApprenticesPanel({ state, dispatch, showHeader = true, onClose = null }) {
  const cap = housingCapacity(state);
  const pool = state.townsfolk?.pool ?? 0;
  const debtOwed = state.townsfolk?.debt ?? 0;

  const inner = (
    <>
      {showHeader && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#3a2715" }}>Townsfolk</span>
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
          Townsfolk: {pool}
        </span>
        {(() => {
          const totalWage = WORKERS.reduce(
            (sum, w) => sum + (state.townsfolk?.hired?.[w.id] ?? 0) * (w.wage || 0),
            0,
          );
          const totalH = totalHired(state);
          if (totalH === 0) return null;
          return (
            <>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#7a4a18",
                background: "#fce8d4", borderRadius: 8, padding: "2px 8px" }}>
                Hired: {totalH}/{cap}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#a85050",
                background: "#fce4cc", borderRadius: 8, padding: "2px 8px" }}>
                Wages: {totalWage}◉/season
              </span>
            </>
          );
        })()}
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
          onClick={() => dispatch({ type: "TOWNSFOLK/BUY_POOL", payload: { amount: 5 } })}
          style={{ fontSize: 10, padding: "2px 8px", borderRadius: 8, background: "#2a4a8a",
            color: "#fff", border: "none", cursor: "pointer", marginBottom: 8,
            fontFamily: "Arial, sans-serif" }}
        >
          Buy 5 Townsfolk (debug)
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
