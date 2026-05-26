import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

interface CloseButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type"> {
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  label?: string;
  className?: string;
  children?: ReactNode;
}

export function CloseButton({ onClick, label = "Close", className = "", children = "×", ...rest }: CloseButtonProps) {
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

interface HeaderProps {
  title?: ReactNode;
  titleAs?: keyof JSX.IntrinsicElements;
  titleClassName?: string;
  onClose?: () => void;
  closeLabel?: string;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
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
}: HeaderProps) {
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

interface PanelDivProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: ReactNode;
}

function Toolbar({ className = "", children, ...rest }: PanelDivProps) {
  return (
    <div className={cx("hl-panel-toolbar", className)} {...rest}>
      {children}
    </div>
  );
}

function Body({ className = "", children, ...rest }: PanelDivProps) {
  return (
    <div className={cx("hl-panel-body", className)} {...rest}>
      {children}
    </div>
  );
}

function Tabs({ className = "", children, ...rest }: PanelDivProps) {
  return (
    <div className={cx("hl-tabs", className)} {...rest}>
      {children}
    </div>
  );
}

interface TabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  className?: string;
  children?: ReactNode;
}

function Tab({ active = false, className = "", children, type = "button", ...rest }: TabProps) {
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

interface FeaturePanelProps extends HTMLAttributes<HTMLDivElement> {
  tone?: string;
  className?: string;
  children?: ReactNode;
}

interface FeaturePanelComponent {
  (props: FeaturePanelProps): JSX.Element;
  Header: typeof Header;
  Toolbar: typeof Toolbar;
  Body: typeof Body;
  Tabs: typeof Tabs;
  Tab: typeof Tab;
  CloseButton: typeof CloseButton;
}

const FeaturePanel: FeaturePanelComponent = (({ tone, className = "", children, ...rest }: FeaturePanelProps) => {
  return (
    <div
      className={cx("hl-panel", tone === "arcane" && "hl-panel--arcane", className)}
      {...rest}
    >
      {children}
    </div>
  );
}) as FeaturePanelComponent;

FeaturePanel.Header = Header;
FeaturePanel.Toolbar = Toolbar;
FeaturePanel.Body = Body;
FeaturePanel.Tabs = Tabs;
FeaturePanel.Tab = Tab;
FeaturePanel.CloseButton = CloseButton;

export default FeaturePanel;
