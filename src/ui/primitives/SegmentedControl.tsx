import { forwardRef } from "react";
import type { CSSProperties, ReactNode } from "react";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type OptionLike = string | number | { id?: string | number; value?: string | number; key?: string | number; label?: ReactNode; name?: ReactNode } | Record<string, any>;

function defaultValue(option: OptionLike) {
  if (option && typeof option === "object") return option.id ?? option.value ?? option.key;
  return option;
}

function defaultLabel(option: OptionLike): ReactNode {
  if (option && typeof option === "object") return option.label ?? option.name ?? option.id ?? option.value;
  return option as ReactNode;
}

interface SegmentedControlProps {
  options?: OptionLike[];
  value?: unknown;
  onChange?: (value: unknown, option: OptionLike) => void;
  ariaLabel?: string;
  role?: string;
  className?: string;
  style?: CSSProperties;
  buttonClassName?: string;
  activeClassName?: string;
  inactiveClassName?: string;
  activeStyle?: CSSProperties;
  inactiveStyle?: CSSProperties;
  getValue?: (option: OptionLike) => unknown;
  getLabel?: (option: OptionLike) => ReactNode;
  getButtonClassName?: (option: OptionLike, selected: boolean) => string;
  getButtonStyle?: (option: OptionLike, selected: boolean) => CSSProperties | undefined;
  renderOption?: (option: OptionLike, meta: { selected: boolean; value: unknown; label: ReactNode }) => ReactNode;
}

const SegmentedControl = forwardRef<HTMLDivElement, SegmentedControlProps>(function SegmentedControl({
  options = [],
  value,
  onChange,
  ariaLabel,
  role = "tablist",
  className = "",
  style,
  buttonClassName = "",
  activeClassName = "",
  inactiveClassName = "",
  activeStyle,
  inactiveStyle,
  getValue = defaultValue,
  getLabel = defaultLabel,
  getButtonClassName,
  getButtonStyle,
  renderOption,
}, ref) {
  const itemRole = role === "tablist" ? "tab" : undefined;
  return (
    <div ref={ref} role={role} aria-label={ariaLabel} className={className} style={style}>
      {options.map((option) => {
        const optionValue = getValue(option);
        const selected = optionValue === value;
        const label = getLabel(option);
        const stateClassName = getButtonClassName
          ? getButtonClassName(option, selected)
          : selected ? activeClassName : inactiveClassName;
        const stateStyle = getButtonStyle
          ? getButtonStyle(option, selected)
          : selected ? activeStyle : inactiveStyle;
        return (
          <button
            key={String(optionValue)}
            type="button"
            role={itemRole}
            aria-selected={itemRole ? selected : undefined}
            aria-pressed={itemRole ? undefined : selected}
            onClick={() => onChange?.(optionValue, option)}
            className={cx(buttonClassName, stateClassName)}
            style={stateStyle}
          >
            {renderOption ? renderOption(option, { selected, value: optionValue, label }) : label}
          </button>
        );
      })}
    </div>
  );
});

export default SegmentedControl;
