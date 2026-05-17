function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function TextInput({ className = "", type = "text", ...rest }) {
  return <input type={type} className={cx("hl-input", className)} {...rest} />;
}

export function NumberInput({ className = "", ...rest }) {
  return <TextInput type="number" className={cx("font-mono text-right tabular-nums", className)} {...rest} />;
}

export function TextArea({ className = "", ...rest }) {
  return (
    <textarea
      className={cx(
        "hl-input h-auto min-h-[88px] py-2 resize-y",
        className,
      )}
      {...rest}
    />
  );
}

export function SelectField({ className = "", children, ...rest }) {
  return (
    <select className={cx("hl-input", className)} {...rest}>
      {children}
    </select>
  );
}

export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Search...",
  ariaLabel = "Search",
  className = "",
  inputClassName = "",
  ...rest
}) {
  const handleClear = () => {
    if (onClear) onClear();
    else onChange?.({ target: { value: "" } });
  };
  return (
    <div className={cx("relative flex items-center", className)}>
      <span className="absolute left-2.5 text-on-panel-faint pointer-events-none">
        <SearchIcon />
      </span>
      <TextInput
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cx("pl-8 pr-8", inputClassName)}
        {...rest}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2 grid place-items-center w-6 h-6 text-on-panel-dim hover:text-on-panel"
        >
          <ClearIcon />
        </button>
      )}
    </div>
  );
}
