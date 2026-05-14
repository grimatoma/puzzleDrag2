/**
 * <ResourceCell> — the codebase's atomic unit of "icon + count + label, maybe
 * a trade action, maybe a status." UX Audit Vol II §04 #06.
 *
 * Replaces four hand-rolled variants:
 *   - Inventory.jsx · InventoryCell        (density="comfortable" + trade)
 *   - Inventory.jsx · CompactOrders row    (density="row")
 *   - Hud.jsx       · LarderWidget bar     (density="micro")
 *   - BiomeEntryModal provisions list      (density="row" + stepper)
 *
 * Densities:
 *   micro       — chip + tiny progress bar + count, for HUD/Larder use
 *   compact     — square cell, smaller icon, no trade (phone Inventory)
 *   comfortable — square cell, large icon, optional inline trade (desktop Inventory)
 *   row         — horizontal row for lists (Orders, Provisions packer)
 *
 * Status maps to a glyph + ring so the readout survives deuteranopia
 * (Vol I #05 / Vol II §07 Accessibility #4).
 */

import { hex } from "../../utils.js";
import IconCanvas, { hasIcon } from "../IconCanvas.jsx";
import Icon from "../Icon.jsx";

const STATUS_RING = {
  ready:  { box: "0 0 0 2px var(--moss), 0 0 12px rgba(145,191,36,.55)", tag: "✓", tagBg: "var(--moss)", tagFg: "#fff" },
  needed: { box: "0 0 0 2px #f7c254",                                    tag: "↑", tagBg: "#f7c254",     tagFg: "#3a2715" },
  excess: { box: "0 0 0 1px rgba(255,255,255,.18)",                      tag: "−", tagBg: "rgba(255,255,255,.20)", tagFg: "#fff" },
};

function ResourceIcon({ iconKey, color, size }) {
  // The "tint puck" — colored background with the resource glyph centered.
  // Falls back to the SVG sprite (Icon) when the canvas icon isn't registered.
  return (
    <div
      className="rounded-md flex-shrink-0 grid place-items-center text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: color ? hex(color) : undefined,
        border: color ? "2px solid rgba(255,255,255,.4)" : undefined,
        textShadow: "0 1px 1px rgba(0,0,0,.4)",
        overflow: "hidden",
      }}
    >
      {hasIcon(iconKey)
        ? <IconCanvas iconKey={iconKey} size={size - (color ? 8 : 0)} />
        : <Icon iconKey={iconKey} size={size - (color ? 8 : 0)} />}
    </div>
  );
}

/**
 * The "comfortable" / "compact" cell — square card with icon left, label +
 * count stacked, optional trade controls on the right, status tag overlay.
 *
 * `onClick` (optional) makes the cell itself tappable for resource detail.
 */
function CellCard({
  resource,
  count,
  density,
  status,
  statusTag,
  trade,
  onClick,
}) {
  const ring = status ? STATUS_RING[status] : null;
  const compact = density === "compact";
  const isInteractive = !!onClick;
  const Tag = isInteractive ? "button" : "div";
  return (
    <Tag
      type={isInteractive ? "button" : undefined}
      onClick={onClick}
      className={`relative bg-[var(--bark-warm)] border-2 border-[var(--iron-soft)] rounded-lg flex items-center gap-2.5 transition-shadow text-left ${compact ? "p-1.5" : "p-2"} ${isInteractive ? "hover:bg-[#b8845a] active:scale-[0.99]" : ""}`}
      style={{ boxShadow: ring?.box || undefined, width: "100%" }}
      title={resource.label}
    >
      <ResourceIcon
        iconKey={resource.iconKey || resource.key}
        color={resource.color}
        size={compact ? 32 : 40}
      />
      <div className="flex flex-col leading-none min-w-0 flex-1">
        <div className={`text-white/80 truncate font-medium ${compact ? "text-[10px]" : "text-[12px]"}`}>{resource.label}</div>
        <div
          className={`text-white font-bold mt-0.5 tabular-nums ${compact ? "text-[14px]" : "text-[18px]"}`}
          style={{ textShadow: "0 1px 2px rgba(0,0,0,.4)" }}
        >
          {count}
        </div>
      </div>
      {trade && <div className="flex flex-col gap-1 flex-shrink-0">{trade}</div>}
      {statusTag && (
        <div
          className="absolute -top-1.5 -right-1.5 px-1.5 py-[1px] rounded-full text-[9px] font-bold whitespace-nowrap"
          style={{ background: ring?.tagBg, color: ring?.tagFg, textShadow: "0 1px 1px rgba(0,0,0,.4)" }}
        >
          {statusTag}
        </div>
      )}
    </Tag>
  );
}

/**
 * The "row" density — full-width horizontal row, used for Orders, Provisions.
 * Renders a tappable button when `onClick` is supplied; otherwise a plain row
 * so the parent can mount its own controls (`trailing`) without nesting buttons.
 */
function CellRow({
  resource,
  count,
  status,
  trailing,
  onClick,
  done,
  variant,
}) {
  const Tag = onClick ? "button" : "div";
  const orderTone = variant === "order"
    ? (done ? "bg-[#91bf24]/40 border-[#91bf24] text-white" : "bg-[var(--bark-shade)] border-[#7a5038] text-[var(--parchment-soft)]")
    : "bg-white/40 border-[#d4c5a8] text-[var(--ink-strong)]";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-left border transition-colors ${orderTone}`}
      style={{ width: "100%" }}
    >
      <Icon iconKey={resource.iconKey || resource.key} size={20} />
      <div className="flex-1 min-w-0">
        <div className={`font-bold ${variant === "order" ? "text-[11px] truncate" : "text-[12px] leading-none"}`}>{resource.label}</div>
        {resource.sub && (
          <div className="text-[10px] text-[var(--ink-mute)] leading-none mt-0.5">{resource.sub}</div>
        )}
      </div>
      {typeof count === "string"
        ? <span className="text-[11px] font-bold tabular-nums whitespace-nowrap">{count}</span>
        : (count != null && (
            <span className={`text-[11px] font-bold whitespace-nowrap tabular-nums ${status === "ready" ? "text-white" : status === "needed" ? "text-[#f7c254]" : "text-[#c5a87a]"}`}>{count}</span>
          ))}
      {done && variant === "order" && <span className="text-[10px] text-white font-bold">✓</span>}
      {trailing}
    </Tag>
  );
}

/**
 * The "micro" density — a chip + thin progress bar + count, used by the
 * Larder strip in the HUD. Wrapped in a 44h container that's tappable so the
 * full breakdown popover surfaces from one row, not five (Vol II §02 #4).
 */
function CellMicro({ resource, count, max, onClick, tone = "ember" }) {
  const amt = Math.min(max ?? count, count);
  const pct = max ? (amt / max) * 100 : 0;
  const done = max ? amt >= max : false;
  const fill = done ? "var(--gold-amber)" : tone === "ember" ? "var(--ember-deep)" : "var(--moss)";
  return (
    <div className="flex items-center gap-1 min-w-0" title={`${resource.label}: ${amt}${max ? `/${max}` : ""}`}>
      <Icon iconKey={resource.iconKey || resource.key} size={14} />
      {max != null && (
        <div className="w-10 h-2 rounded-full bg-[var(--bark-shade)] border border-[var(--iron)] overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${pct}%`, background: fill }}
          />
        </div>
      )}
      <span className="text-[11px] font-bold text-[var(--parchment-soft)] leading-none tabular-nums">{amt}</span>
    </div>
  );
}

export default function ResourceCell({
  resource,           // { key, label, color?, iconKey?, sub? }
  count,
  density = "comfortable", // "micro" | "compact" | "comfortable" | "row"
  status,             // "ready" | "needed" | "excess" | undefined
  statusTag,          // e.g. "✓ Order 3" — overlay tag (cell variants)
  trade,              // ReactNode — buy/sell controls
  trailing,           // ReactNode — for row variant
  onClick,
  done,               // for order row variant
  variant,            // "order" — row variant flavor
  max,                // for micro variant
  tone,               // for micro
}) {
  if (density === "micro") {
    return <CellMicro resource={resource} count={count} max={max} onClick={onClick} tone={tone} />;
  }
  if (density === "row") {
    return (
      <CellRow
        resource={resource}
        count={count}
        status={status}
        trailing={trailing}
        onClick={onClick}
        done={done}
        variant={variant}
      />
    );
  }
  return (
    <CellCard
      resource={resource}
      count={count}
      density={density}
      status={status}
      statusTag={statusTag}
      trade={trade}
      onClick={onClick}
    />
  );
}
