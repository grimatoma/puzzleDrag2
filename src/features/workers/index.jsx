// Phase 5b — Type-tier workers panel.
//
// Renders inside the Townsfolk hub screen as the "Workers" tab. Each row
// shows the worker, hire / fire buttons, the per-hire effect summary, and
// the current count out of maxCount.
import { TYPE_WORKERS, nextHireCost } from "./data.js";

function effectSummary(effect) {
  if (!effect || !effect.type) return "";
  switch (effect.type) {
    case "threshold_reduce_category":
      return `${effect.category} chain ${effect.from} → ${effect.to} at full hire`;
    case "threshold_reduce":
      return `${effect.key} chain ${effect.from} → ${effect.to} at full hire`;
    case "recipe_input_reduce":
      return `${effect.recipe} needs ${effect.from} → ${effect.to} ${effect.input} at full hire`;
    default:
      return effect.type;
  }
}

function WorkerRow({ worker, count, coins, dispatch }) {
  // Phase 6 — show the cost of the *next* hire so the player can see the
  // ramp build up. When the worker is already at maxCount the ramp call
  // is moot but we still pass `count` for a stable display.
  const cost = nextHireCost(worker, count);
  const canHire = coins >= cost && count < worker.maxCount;
  const canFire = count > 0;
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        background: "#fffaf1",
        border: "2px solid #d8c8a8",
        borderRadius: 12,
        padding: "8px 10px",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          display: "grid",
          placeItems: "center",
          fontSize: 22,
          background: worker.color,
          color: "#fff",
          flexShrink: 0,
        }}
      >
        {worker.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: "#3a2715", fontSize: 14 }}>
          {worker.name}
          <span
            style={{
              marginLeft: 8,
              fontSize: 11,
              color: "#7a5a3a",
              fontWeight: 600,
            }}
          >
            {count} / {worker.maxCount}
          </span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#6a4b31",
            lineHeight: 1.3,
            marginTop: 2,
          }}
        >
          {worker.description}
        </div>
        <div
          style={{
            fontSize: 10,
            color: "#3a7a3a",
            fontWeight: 600,
            marginTop: 2,
          }}
        >
          {effectSummary(worker.effect)}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => dispatch({ type: "WORKERS/HIRE", payload: { id: worker.id } })}
          disabled={!canHire}
          style={{
            padding: "4px 10px",
            borderRadius: 8,
            background: canHire ? "#91bf24" : "#9a9a8a",
            color: "#fff",
            border: "none",
            fontWeight: 700,
            fontSize: 12,
            cursor: canHire ? "pointer" : "not-allowed",
            fontFamily: "Arial, sans-serif",
          }}
          aria-label={`Hire ${worker.name} for ${cost} coins`}
        >
          Hire ({cost}◉)
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "WORKERS/FIRE", payload: { id: worker.id } })}
          disabled={!canFire}
          style={{
            padding: "4px 10px",
            borderRadius: 8,
            background: canFire ? "#9a724d" : "#bcb6a6",
            color: "#fff",
            border: "none",
            fontWeight: 700,
            fontSize: 12,
            cursor: canFire ? "pointer" : "not-allowed",
            fontFamily: "Arial, sans-serif",
          }}
          aria-label={`Fire one ${worker.name}`}
        >
          Fire
        </button>
      </div>
    </div>
  );
}

export function WorkersPanel({ state, dispatch }) {
  const hired = state?.workers?.hired ?? {};
  const coins = state?.coins ?? 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          fontSize: 12,
          color: "#6a4b31",
          lineHeight: 1.4,
          padding: "0 4px",
        }}
      >
        Anonymous, stackable workers. Each hire reduces the listed chain
        (or recipe input) by an even per-hire share until you reach the
        max count.
      </div>
      {TYPE_WORKERS.map((w) => (
        <WorkerRow
          key={w.id}
          worker={w}
          count={hired[w.id] ?? 0}
          coins={coins}
          dispatch={dispatch}
        />
      ))}
    </div>
  );
}
