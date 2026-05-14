// Shared UI primitives for the Balance Manager. Matches the parchment
// ember-orange accents.
import { useState } from "react";
import Icon from "../ui/Icon.jsx";

export const COLORS = {
  parchment: "#f4ecd8",
  parchmentDeep: "#e8dcc4",
  border: "#b28b62",
  borderDeep: "#8b6845",
  ink: "#2b2218",
  inkLight: "#5a3a20",
  inkSubtle: "#7a5a38",
  ember: "#d6612a",
  emberDeep: "#a84010",
  green: "#5a9e4b",
  greenDeep: "#3e7236",
  red: "#c23b22",
  redDeep: "#8f2a18",
  slate: "#5a5e66",
};

export function NumberField({ value, onChange, min = 0, max = 9999, step = 1, width = 70 }) {
  return (
    <input
      type="number"
      value={value ?? 0}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="px-1.5 py-1 text-[12px] font-mono rounded border-2 text-right focus:outline-none focus:ring-2 focus:ring-[#d6612a]/40"
      style={{
        background: "#fff",
        borderColor: COLORS.border,
        color: COLORS.ink,
        width,
      }}
    />
  );
}

export function TextField({ value, onChange, placeholder = "", width = "100%", ...rest }) {
  return (
    <input
      {...rest}
      type="text"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1 text-[12px] rounded border-2 focus:outline-none focus:ring-2 focus:ring-[#d6612a]/40"
      style={{
        background: "#fff",
        borderColor: COLORS.border,
        color: COLORS.ink,
        width,
      }}
    />
  );
}

export function TextArea({ value, onChange, rows = 3, placeholder = "", ...rest }) {
  return (
    <textarea
      {...rest}
      value={value ?? ""}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1 text-[12px] rounded border-2 focus:outline-none focus:ring-2 focus:ring-[#d6612a]/40"
      style={{
        background: "#fff",
        borderColor: COLORS.border,
        color: COLORS.ink,
        resize: "vertical",
      }}
    />
  );
}

export function Select({ value, onChange, options, width = "100%" }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1 text-[12px] rounded border-2 focus:outline-none focus:ring-2 focus:ring-[#d6612a]/40"
      style={{
        background: "#fff",
        borderColor: COLORS.border,
        color: COLORS.ink,
        width,
      }}
    >
      {options.map((opt) => (
        <option key={opt.value ?? "_none"} value={opt.value ?? ""}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function ColorField({ value, onChange }) {
  // value is a number (0xRRGGBB). Convert to/from hex string for <input type=color>.
  const toHex = (n) =>
    "#" + (Number.isFinite(n) ? n : 0).toString(16).padStart(6, "0").slice(-6);
  const parse = (str) => parseInt(String(str).replace(/^#/, ""), 16);
  return (
    <div className="flex items-center gap-1">
      <input
        type="color"
        value={toHex(value)}
        onChange={(e) => onChange(parse(e.target.value))}
        className="w-7 h-7 rounded border-2 cursor-pointer"
        style={{ borderColor: COLORS.border, background: "transparent" }}
      />
      <span className="font-mono text-[10px]" style={{ color: COLORS.inkSubtle }}>
        {toHex(value).toUpperCase()}
      </span>
    </div>
  );
}

export function SmallButton({ children, onClick, variant = "default", disabled = false, title, className = "", ...rest }) {
  const styles = {
    default: { background: COLORS.parchmentDeep, borderColor: COLORS.border, color: COLORS.inkLight },
    primary: { background: COLORS.ember, borderColor: COLORS.emberDeep, color: "#fff" },
    success: { background: COLORS.green, borderColor: COLORS.greenDeep, color: "#fff" },
    danger:  { background: COLORS.red, borderColor: COLORS.redDeep, color: "#fff" },
    ghost:   { background: "transparent", borderColor: COLORS.border, color: COLORS.inkLight },
  };
  return (
    <button
      {...rest}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-2 py-1 text-[11px] font-bold rounded border-2 transition-opacity ${disabled ? "opacity-40 cursor-not-allowed" : "hover:opacity-90"} ${className}`}
      style={styles[variant] || styles.default}
    >
      {children}
    </button>
  );
}

export function Pill({ children, color = COLORS.inkSubtle, bg = COLORS.parchmentDeep }) {
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ color, background: bg, border: `1px solid ${COLORS.border}` }}
    >
      {children}
    </span>
  );
}

export function FieldRow({ label, hint, children }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-bold" style={{ color: COLORS.ink }}>{label}</div>
        {hint && (
          <div className="text-[10px] italic truncate" style={{ color: COLORS.inkSubtle }}>{hint}</div>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export function Card({ children, className = "", title, accent }) {
  return (
    <div
      className={`rounded-xl border-2 p-3 ${className}`}
      style={{
        background: COLORS.parchment,
        borderColor: accent || COLORS.border,
        boxShadow: "0 1px 0 rgba(0,0,0,0.08)",
      }}
    >
      {title && (
        <div className="text-[12px] font-bold uppercase tracking-wide mb-2" style={{ color: COLORS.inkSubtle }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder = "Search…" }) {
  return (
    <div className="relative w-full">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-7 pr-3 py-1.5 text-[12px] rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-[#d6612a]/40"
        style={{ background: "#fff", borderColor: COLORS.border, color: COLORS.ink }}
      />
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[12px]" style={{ color: COLORS.inkSubtle }}>🔍</span>
    </div>
  );
}

/** Hex (number) → CSS hex string. */
export function hexToCss(n) {
  if (!Number.isFinite(n)) return "#000000";
  return "#" + n.toString(16).padStart(6, "0").slice(-6);
}

/** Inline tile preview swatch — circle with the resource's color + glyph. */
export function TileSwatch({ color, iconKey, size = 28 }) {
  return (
    <div
      className="rounded-md grid place-items-center flex-shrink-0"
      style={{
        background: hexToCss(color),
        width: size,
        height: size,
        border: `2px solid ${COLORS.border}`,
        fontSize: Math.floor(size * 0.55),
      }}
      aria-hidden
    >
      <Icon iconKey={iconKey} size={Math.floor(size * 0.8)} />
    </div>
  );
}

export function SearchAndAddPicker({
  label = "Add Item",
  placeholder = "Search...",
  options = [],
  onSelect,
  gridClass = "grid-cols-2 md:grid-cols-3"
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = options.filter((o) => o.searchText.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between gap-2 mt-1">
        <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: COLORS.inkSubtle }}>
          {label}
        </div>
        <SmallButton onClick={() => setPickerOpen((v) => !v)}>
          {pickerOpen ? "Hide" : "+ Add"}
        </SmallButton>
      </div>

      {pickerOpen && (
        <div className="flex flex-col gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="px-2 py-1.5 rounded border text-[12px]"
            style={{ background: "#fffaf1", borderColor: COLORS.border, color: COLORS.ink }}
          />
          <div className={`grid gap-2 max-h-64 overflow-y-auto pr-1 ${gridClass}`}>
            {filtered.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  onSelect(o.id);
                  setQuery("");
                }}
                className="text-left p-1.5 rounded-lg border-2 transition-colors hover:opacity-90 min-w-0"
                style={{ background: COLORS.parchment, borderColor: COLORS.border }}
              >
                {o.renderNode}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-[11px] italic px-1 col-span-full" style={{ color: COLORS.inkSubtle }}>
                No matching items.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
