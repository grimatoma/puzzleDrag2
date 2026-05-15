// Phase 5b — Type-tier workers panel.
//
// Renders inside the Townsfolk hub screen as the "Workers" tab. Each row
// shows the worker, hire / fire buttons, the per-hire effect summary, and
// the current count out of maxCount.
import { TYPE_WORKERS, nextHireCost } from "./data.js";
import Icon from "../../ui/Icon.jsx";

function effectSummary(abilities, count, maxCount) {
  if (!abilities || abilities.length === 0) return "";
  const safeCount = Math.max(0, Math.min(count | 0, maxCount));
  const parts = abilities.map(ab => {
    const p = ab.params || {};
    const amount = Number(p.amount) || 0;
    switch (ab.id) {
      case "threshold_reduce_category": {
        const current = amount * safeCount;
        const max = amount * maxCount;
        return `−${current} ${p.category} chain steps (max −${max})`;
      }
      case "threshold_reduce": {
        const current = amount * safeCount;
        const max = amount * maxCount;
        return `−${current} ${p.target || p.key} chain steps (max −${max})`;
      }
      case "recipe_input_reduce": {
        const current = amount * safeCount;
        const max = amount * maxCount;
        return `−${current} ${p.input} for ${p.recipe} (max −${max})`;
      }
      default:
        return ab.id;
    }
  });
  return parts.join(" · ");
}

function WorkerRow({ worker, count, coins, dispatch }) {
  // Phase 6 — show the cost of the *next* hire so the player can see the
  // ramp build up. When the worker is already at maxCount the ramp call
  // is moot but we still pass `count` for a stable display.
  const cost = nextHireCost(worker, count);
  const canHire = coins >= cost && count < worker.maxCount;
  const canFire = count > 0;
  return (
    <div className="hl-card !flex-row items-center gap-2.5 !p-2">
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
        <Icon iconKey={worker.iconKey} size={28} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="hl-card-title">
          {worker.name}
          <span className="hl-card-meta tabular-nums" style={{ marginLeft: 8, fontWeight: 600 }}>
            {count} / {worker.maxCount}
          </span>
        </div>
        <div className="hl-card-meta" style={{ lineHeight: 1.3, marginTop: 2 }}>
          {worker.description}
        </div>
        <div
          className="text-micro"
          style={{
            color: "#3a7a3a",
            fontWeight: 600,
            marginTop: 2,
          }}
        >
          {effectSummary(worker.abilities, count, worker.maxCount)}
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
      <div className="hl-text-dim" style={{ lineHeight: 1.4, padding: "0 4px" }}>
        Anonymous, stackable workers. Each hire reduces the listed chain
        (or recipe input) by a whole tile, stacking up to the max count.
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
