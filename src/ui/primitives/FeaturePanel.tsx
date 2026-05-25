function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function CloseButton({ onClick, label = "Close", className = "", children = "×", ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cx("hl-panel-close", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

function Header({
  title,
  titleAs: TitleTag = "span",
  titleClassName = "",
  onClose,
  closeLabel = "Close",
  actions,
  className = "",
  children,
}) {
  return (
    <div className={cx("hl-panel-header", className)}>
      {children ?? (
        <TitleTag className={cx("hl-panel-title", titleClassName)}>
          {title}
        </TitleTag>
      )}
      {(actions || onClose) && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
          {onClose && <CloseButton onClick={onClose} label={closeLabel} />}
        </div>
      )}
    </div>
  );
}

function Toolbar({ className = "", children, ...rest }) {
  return (
    <div className={cx("hl-panel-toolbar", className)} {...rest}>
      {children}
    </div>
  );
}

function Body({ className = "", children, ...rest }) {
  return (
    <div className={cx("hl-panel-body", className)} {...rest}>
      {children}
    </div>
  );
}

function Tabs({ className = "", children, ...rest }) {
  return (
    <div className={cx("hl-tabs", className)} {...rest}>
      {children}
    </div>
  );
}

function Tab({ active = false, className = "", children, type = "button", ...rest }) {
  return (
    <button
      type={type}
      className={cx("hl-tab", active && "is-active", className)}
      aria-pressed={active}
      {...rest}
    >
      {children}
    </button>
  );
}

export default function FeaturePanel({ tone, className = "", children, ...rest }) {
  return (
    <div
      className={cx("hl-panel", tone === "arcane" && "hl-panel--arcane", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

FeaturePanel.Header = Header;
FeaturePanel.Toolbar = Toolbar;
FeaturePanel.Body = Body;
FeaturePanel.Tabs = Tabs;
FeaturePanel.Tab = Tab;
FeaturePanel.CloseButton = CloseButton;
