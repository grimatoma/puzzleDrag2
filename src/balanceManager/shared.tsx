// Shared UI primitives for the Balance Manager. Matches the parchment
// ember-orange accents.
import React, { useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import Icon from "../ui/Icon.jsx";
import { RESOURCE_KEYS, TILE_KEYS } from "../types/catalogKeys.js";
import {
  NumberInput as BaseNumberInput,
  SearchInput as BaseSearchInput,
  SelectField as BaseSelectField,
  TextArea as BaseTextArea,
  TextInput as BaseTextInput,
} from "../ui/primitives/Field.jsx";
import { UI_COLORS } from "../ui/primitives/palette.js";
import SegmentedControl from "../ui/primitives/SegmentedControl.jsx";
import StatusChip from "../ui/primitives/StatusChip.jsx";

export const COLORS = UI_COLORS;

export interface SelectOption {
  value: string | number;
  label: ReactNode;
}

export function NumberField({ value, onChange, min = 0, max = 9999, step = 1, width = 70 }: { value: number | null | undefined; onChange: (v: number) => void; min?: number; max?: number; step?: number; width?: number | string }) {
  return (
    <BaseNumberInput
      value={value ?? 0}
      min={min}
      max={max}
      step={step}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))}
      className="!h-auto px-1.5 py-1 text-[12px]"
      style={{ width }}
    />
  );
}

export function TextField({ value, onChange, placeholder = "", width = "100%" }: { value: string | null | undefined; onChange: (v: string) => void; placeholder?: string; width?: number | string }) {
  return (
    <BaseTextInput
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      className="!h-auto px-2 py-1 text-[12px]"
      style={{ width }}
    />
  );
}

export function TextArea({ value, onChange, rows = 3, placeholder = "" }: { value: string | null | undefined; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <BaseTextArea
      value={value ?? ""}
      placeholder={placeholder}
      rows={rows}
      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
      className="w-full px-2 py-1 text-[12px]"
    />
  );
}

export function Select({ value, onChange, options, width = "100%" }: { value: unknown; onChange: (v: string) => void; options: SelectOption[]; width?: number | string }) {
  const selectValue = value == null ? "" : (typeof value === "string" || typeof value === "number" ? value : String(value));
  return (
    <BaseSelectField
      value={selectValue}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      className="!h-auto px-2 py-1 text-[12px]"
      style={{ width }}
    >
      {options.map((opt) => (
        <option key={String(opt.value ?? "_none")} value={opt.value ?? ""}>
          {opt.label}
        </option>
      ))}
    </BaseSelectField>
  );
}

export function ColorField({ value, onChange }: { value: number | null | undefined; onChange: (v: number) => void }) {
  // value is a number (0xRRGGBB). Convert to/from hex string for <input type=color>.
  const toHex = (n: number | null | undefined) =>
    "#" + (Number.isFinite(n as number) ? (n as number) : 0).toString(16).padStart(6, "0").slice(-6);
  const parse = (str: string) => parseInt(String(str).replace(/^#/, ""), 16);
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

export type SmallButtonVariant = "default" | "primary" | "success" | "danger" | "ghost";

export function SmallButton({ children, onClick, variant = "default", disabled = false, title, className = "" }: { children: React.ReactNode; onClick?: () => void; variant?: SmallButtonVariant; disabled?: boolean; title?: string; className?: string }) {
  const styles: Record<SmallButtonVariant, React.CSSProperties> = {
    default: { background: COLORS.parchmentDeep, borderColor: COLORS.border, color: COLORS.inkLight },
    primary: { background: COLORS.ember, borderColor: COLORS.emberDeep, color: "#fff" },
    success: { background: COLORS.green, borderColor: COLORS.greenDeep, color: "#fff" },
    danger:  { background: COLORS.red, borderColor: COLORS.redDeep, color: "#fff" },
    ghost:   { background: "transparent", borderColor: COLORS.border, color: COLORS.inkLight },
  };
  return (
    <button
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

export function Pill({ children, color = COLORS.inkSubtle, bg = COLORS.parchmentDeep }: { children: ReactNode; color?: string; bg?: string }) {
  return (
    <StatusChip
      size="xs"
      uppercase
      style={{ color, background: bg, borderColor: COLORS.border, fontSize: 10 }}
    >
      {children}
    </StatusChip>
  );
}

export function FieldRow({ label, hint, children }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }) {
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

export function Card({ children, className = "", title, accent, id, cardRef, style: styleProp }: { children: React.ReactNode; className?: string; title?: string; accent?: string; id?: string; cardRef?: React.Ref<HTMLDivElement>; style?: React.CSSProperties }) {
  return (
    <div
      ref={cardRef}
      id={id}
      className={`rounded-xl border-2 p-3 ${className}`}
      style={{
        background: COLORS.parchment,
        borderColor: accent || COLORS.border,
        boxShadow: "0 1px 0 rgba(0,0,0,0.08)",
        ...styleProp,
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

type SearchInputChangeEvent = ChangeEvent<HTMLInputElement> | { target: { value: string } };

export function SearchBar({ value, onChange, placeholder = "Search…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <BaseSearchInput
      value={value}
      placeholder={placeholder}
      onChange={(e: SearchInputChangeEvent) => onChange(e.target.value)}
      onClear={() => onChange("")}
      inputClassName="!h-auto py-1.5 text-[12px]"
    />
  );
}

export function FilterBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {children}
    </div>
  );
}

export interface SegmentedFilterOption {
  id?: string | number;
  value?: string | number;
  key?: string | number;
  label?: ReactNode;
  name?: ReactNode;
  iconKey?: string;
  icon?: ReactNode;
  [extra: string]: unknown;
}

export function SegmentedFilter<TValue = string>({ options, value, onChange, ariaLabel, className = "" }: { options: SegmentedFilterOption[]; value: TValue; onChange: (v: TValue) => void; ariaLabel?: string; className?: string }) {
  return (
    <SegmentedControl
      options={options}
      value={value}
      onChange={(v) => onChange(v as TValue)}
      ariaLabel={ariaLabel}
      role="group"
      className={`flex gap-1 flex-shrink-0 flex-wrap ${className}`}
      buttonClassName="px-3 py-1.5 text-[12px] font-bold rounded-lg border-2 transition-colors inline-flex items-center gap-1"
      activeStyle={{ background: COLORS.ember, borderColor: COLORS.emberDeep, color: "#fff" }}
      inactiveStyle={{ background: COLORS.parchmentDeep, borderColor: COLORS.border, color: COLORS.inkLight }}
      renderOption={(option, { label }) => {
        const opt = option as SegmentedFilterOption;
        return (
          <>
            {opt.iconKey && <Icon iconKey={opt.iconKey} size={16} title="" />}
            {opt.icon && <span aria-hidden>{opt.icon as ReactNode}</span>}
            <span>{label}</span>
          </>
        );
      }}
    />
  );
}

/** Hex (number) → CSS hex string. */
export function hexToCss(n: number | null | undefined): string {
  if (!Number.isFinite(n as number)) return "#000000";
  return "#" + (n as number).toString(16).padStart(6, "0").slice(-6);
}

/** Inline tile preview swatch — circle with the resource's color + glyph. */
export function TileSwatch({ color, iconKey, size = 28 }: { color: number; iconKey: string; size?: number }) {
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
      <Icon iconKey={iconKey} size={Math.floor(size * 0.8)} title="" />
    </div>
  );
}

export interface SearchAndAddOption {
  id: string;
  searchText: string;
  renderNode: React.ReactNode;
}

export function SearchAndAddPicker({ label = "Add Item", placeholder = "Search...", options = [], onSelect, gridClass = "grid-cols-2 md:grid-cols-3" }: { label?: React.ReactNode; placeholder?: string; options?: SearchAndAddOption[]; onSelect: (id: string) => void; gridClass?: string }) {
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
          <BaseSearchInput
            value={query}
            onChange={(e: SearchInputChangeEvent) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
            placeholder={placeholder}
            inputClassName="!h-auto py-1.5 text-[12px]"
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

/** Options for resource-key selects. Drawn from all biome resource lists (pre-filtered to kind:"resource"). */
export function resourceKeyOptions() {
  return [
    { value: "", label: "— pick resource —" },
    ...RESOURCE_KEYS.map((k: string) => ({ value: k, label: k })),
  ];
}

/** Options for tile-key selects from the compile-time TileKey catalog. */
export function tileKeyOptions() {
  const keys = [...TILE_KEYS].sort();
  return [
    { value: "", label: "— pick tile —" },
    { value: "*", label: "All tile types" },
    ...keys.map((k) => ({ value: k, label: k })),
  ];
}

/** Options for hazard selects. Common ids; designers may enter others freely. */
export function hazardOptions() {
  return [
    { value: "", label: "— pick hazard —" },
    { value: "rats", label: "rats" },
    { value: "wolves", label: "wolves" },
    { value: "fire", label: "fire" },
    { value: "deadly_pests", label: "deadly_pests" },
    { value: "gas_vent", label: "gas_vent" },
    { value: "cave_in", label: "cave_in" },
  ];
}
