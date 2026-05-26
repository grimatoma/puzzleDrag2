/**
 * Locally-typed re-exports of shared UI primitives. The primitives are still
 * declared in JS (well, plain .tsx) and TypeScript infers some optional props
 * as required. Re-export them here with corrected types so feature files can
 * keep clean imports.
 *
 * This module lives under `src/features/` but is intentionally *not* a feature
 * (no index.tsx) so it isn't picked up by `src/ui.tsx`'s
 * `import.meta.glob("./features/*\/index.{jsx,tsx}")` discovery.
 */

import type { ReactNode, ButtonHTMLAttributes, HTMLAttributes } from "react";
import FeaturePanelRaw from "../../ui/primitives/FeaturePanel.jsx";

interface CommonProps {
  className?: string;
  children?: ReactNode;
}

interface FeaturePanelProps extends HTMLAttributes<HTMLDivElement>, CommonProps {
  tone?: "arcane" | "parchment" | string;
}

interface TabProps extends ButtonHTMLAttributes<HTMLButtonElement>, CommonProps {
  active?: boolean;
}

interface HeaderProps extends CommonProps {
  title?: ReactNode;
  titleAs?: keyof JSX.IntrinsicElements;
  titleClassName?: string;
  onClose?: () => void;
  closeLabel?: string;
  actions?: ReactNode;
}

interface CloseButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">, CommonProps {
  onClick?: () => void;
  label?: string;
}

interface FeaturePanelComponent {
  (props: FeaturePanelProps): JSX.Element;
  Header: (props: HeaderProps) => JSX.Element;
  Toolbar: (props: HTMLAttributes<HTMLDivElement> & CommonProps) => JSX.Element;
  Body: (props: HTMLAttributes<HTMLDivElement> & CommonProps) => JSX.Element;
  Tabs: (props: HTMLAttributes<HTMLDivElement> & CommonProps) => JSX.Element;
  Tab: (props: TabProps) => JSX.Element;
  CloseButton: (props: CloseButtonProps) => JSX.Element;
}

/** Typed FeaturePanel — same component, corrected prop types. */
export const FeaturePanel = FeaturePanelRaw as unknown as FeaturePanelComponent;

export default FeaturePanel;
