/**
 * ReferenceSection.tsx — Collapsible developer-only section wrapper.
 *
 * Reads the current wiki view from WikiViewContext:
 * - "developer" view: renders a collapsible <details> wrapper (open by default)
 *   containing the children (field references, schema tables, etc.).
 * - "player" view: renders nothing (returns null).
 *
 * Usage:
 *   <ReferenceSection heading="Field reference & data">
 *     <ConceptFields conceptId={conceptId} />
 *   </ReferenceSection>
 */

import React from "react";
import { useWikiView } from "./wikiView.js";
import { COLORS } from "../shared.jsx";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ReferenceSectionProps {
  /** Section heading shown in the <summary> bar. */
  heading?: string;
  /** Whether to start open (default: true). */
  defaultOpen?: boolean;
  children: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReferenceSection({
  heading = "Field reference & data",
  defaultOpen = true,
  children,
}: ReferenceSectionProps) {
  const { view } = useWikiView();

  // Hidden in player view — the raw schema is developer-only information.
  if (view === "player") return null;

  return (
    <ReferenceSectionInner heading={heading} defaultOpen={defaultOpen}>
      {children}
    </ReferenceSectionInner>
  );
}

// ─── Inner (always-rendered portion, only mounted in dev view) ────────────────

function ReferenceSectionInner({
  heading,
  defaultOpen,
  children,
}: Required<ReferenceSectionProps>) {
  // The browser drives the <details> open/close natively. The chevron rotation
  // is handled by the CSS rule injected below, keyed on the [open] attribute.
  return (
    <details
      open={defaultOpen}
      className="wiki-reference-section"
      style={{ borderRadius: 8, overflow: "hidden" }}
    >
      <summary
        className="wiki-reference-section__summary"
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          background: COLORS.parchmentDeep,
          border: `1px solid ${COLORS.border}`,
          /* Border-radius is always 8px here; when open the body panel is flush
             below and the rounded bottom corners are hidden by the body border. */
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          color: COLORS.ink,
          userSelect: "none",
        }}
      >
        <span
          aria-hidden
          className="wiki-ref-chevron"
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            fontSize: 10,
            lineHeight: "12px",
            textAlign: "center",
            color: COLORS.inkSubtle,
            flexShrink: 0,
          }}
        >
          ▶
        </span>
        {heading}
      </summary>

      <div
        className="wiki-reference-section__body"
        style={{
          padding: 12,
          background: COLORS.parchment,
          border: `1px solid ${COLORS.border}`,
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
        }}
      >
        {children}
      </div>
    </details>
  );
}
