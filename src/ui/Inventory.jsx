import { BIOMES, RECIPES } from "../constants.js";
import { resourceByKey } from "../state.js";
import { hex } from "../utils.js";

export function Section({ title, titleColor = "#f8e7c6", children }) {
  return (
    <div className="flex flex-col gap-2 min-h-0">
      <div className="font-bold text-[14px] landscape:max-[1024px]:text-[11px] tracking-wide" style={{ color: titleColor }}>{title}</div>
      <div className="min-h-0">{children}</div>
    </div>
  );
}

// Per-key order status:
//   "ready"  — at least one open order has all needed resources
//   "needed" — at least one open order needs more of this resource
//   "excess" — non-zero stash but no open order asks for it
//   "idle"   — neither in stash nor in any order
function orderStatusByKey(orders, inventory) {
  const status = {};
  const totals = {};
  for (const o of orders) {
    totals[o.key] = (totals[o.key] || 0) + o.need;
    const have = inventory[o.key] || 0;
    if (have >= o.need) status[o.key] = "ready";
    else if (status[o.key] !== "ready") status[o.key] = "needed";
  }
  return { status, totals };
}

function InventoryCell({ r, count, compact, orderStatus, orderTotal }) {
  // Visual states layered on top of the base cell.
  const ready  = orderStatus === "ready";
  const needed = orderStatus === "needed";
  const excess = !orderStatus && count > 0;
  const ringStyle = ready
    ? { boxShadow: "0 0 0 2px #91bf24, 0 0 12px rgba(145,191,36,.55)" }
    : needed
    ? { boxShadow: "0 0 0 2px #f7c254" }
    : excess
    ? { boxShadow: "0 0 0 1px rgba(255,255,255,.18)" }
    : {};
  const tagText = ready
    ? `✓ Order ${orderTotal}`
    : needed
    ? `Need ${orderTotal}`
    : excess
    ? "Excess"
    : null;
  const tagColor = ready ? "bg-[#91bf24]" : needed ? "bg-[#f7c254] text-[#3a2715]" : "bg-white/20";
  return (
    <div
      className={`relative bg-[#b68d64] border-2 border-[#e6c49a] rounded-lg flex items-center gap-2.5 ${compact ? "p-1.5" : "p-2"} transition-shadow`}
      style={ringStyle}
      title={r.label}
    >
      <div className={`rounded-md flex-shrink-0 grid place-items-center text-white ${compact ? "w-8 h-8 text-[16px]" : "w-10 h-10 text-[20px]"}`} style={{ backgroundColor: hex(r.color), border: "2px solid rgba(255,255,255,.4)", textShadow: "0 1px 1px rgba(0,0,0,.4)" }}>{r.glyph}</div>
      <div className="flex flex-col leading-none min-w-0 flex-1">
        <div className={`text-white/80 truncate font-medium ${compact ? "text-[10px]" : "text-[12px]"}`}>{r.label}</div>
        <div className={`text-white font-bold mt-0.5 ${compact ? "text-[14px]" : "text-[18px]"}`} style={{ textShadow: "0 1px 2px rgba(0,0,0,.4)" }}>{count}</div>
      </div>
      {tagText && (
        <div className={`absolute -top-1.5 -right-1.5 px-1.5 py-[1px] rounded-full text-[9px] font-bold text-white ${tagColor}`} style={{ textShadow: "0 1px 1px rgba(0,0,0,.4)" }}>
          {tagText}
        </div>
      )}
    </div>
  );
}

export function CompactOrders({ orders, inventory, dispatch }) {
  return (
    <div className="flex flex-col gap-1.5">
      {orders.map((o) => {
        const have = inventory[o.key] || 0;
        const done = have >= o.need;
        const res = resourceByKey(o.key);
        const recipe = !res ? RECIPES[o.key] : null;
        const glyph = res ? res.glyph : recipe?.glyph ?? "?";
        const label = res ? res.label : recipe?.name ?? o.key;
        return (
          <button
            key={o.id}
            onClick={() => dispatch({ type: "TURN_IN_ORDER", id: o.id, npc: o.npc, key: o.key, need: o.need, reward: o.reward })}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-left border transition-colors ${done ? "bg-[#91bf24]/40 border-[#91bf24] text-white" : "bg-[#4a2e18] border-[#7a5038] text-[#f8e7c6]"}`}
          >
            <span className="text-[14px] flex-shrink-0">{glyph}</span>
            <span className="flex-1 min-w-0 text-[10px] font-bold truncate">{label}</span>
            <span className={`text-[10px] font-bold whitespace-nowrap ${done ? "text-white" : have > 0 ? "text-[#f7c254]" : "text-[#c5a87a]"}`}>
              {Math.min(have, o.need)}/{o.need}
            </span>
            {done && <span className="text-[9px] text-white font-bold">✓</span>}
          </button>
        );
      })}
    </div>
  );
}

export function InventoryGrid({ inventory, biomeKey, compact, orders = [] }) {
  const resources = BIOMES[biomeKey].resources;
  const items = Object.entries(RECIPES).filter(([key]) => (inventory[key] || 0) > 0);
  const gridCols = compact ? "grid-cols-2" : "grid-cols-[repeat(auto-fill,minmax(180px,1fr))]";
  const { status, totals } = orderStatusByKey(orders, inventory);

  return (
    <div className="flex flex-col gap-3">
      {orders.length > 0 && (
        <div className="flex items-center gap-3 text-[10px] text-white/70 px-1 -mb-1">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#91bf24]" /> ready</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f7c254]" /> needed</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/40" /> excess</span>
        </div>
      )}
      <div>
        <div className="text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1.5">Resources</div>
        <div className={`grid ${gridCols} gap-2`}>
          {resources.map((r) => (
            <InventoryCell
              key={r.key}
              r={r}
              count={inventory[r.key] || 0}
              compact={compact}
              orderStatus={status[r.key]}
              orderTotal={totals[r.key]}
            />
          ))}
        </div>
      </div>
      <div>
        <div className="text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1.5">Items</div>
        {items.length === 0 ? (
          <div className="text-[11px] text-white/40 italic px-1">No items yet — craft something!</div>
        ) : (
          <div className={`grid ${gridCols} gap-2`}>
            {items.map(([key, recipe]) => (
              <InventoryCell
                key={key}
                r={{ key, label: recipe.name, color: recipe.color, glyph: recipe.glyph }}
                count={inventory[key] || 0}
                compact={compact}
                orderStatus={status[key]}
                orderTotal={totals[key]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
