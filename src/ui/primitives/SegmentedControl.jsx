import { forwardRef } from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function defaultValue(option) {
  if (option && typeof option === "object") return option.id ?? option.value ?? option.key;
  return option;
}

function defaultLabel(option) {
  if (option && typeof option === "object") return option.label ?? option.name ?? option.id ?? option.value;
  return option;
}

const SegmentedControl = forwardRef(function SegmentedControl({
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
