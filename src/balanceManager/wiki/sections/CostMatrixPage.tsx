/**
 * CostMatrixPage.tsx — the unified "Cost matrix" developer page.
 *
 * Stacks all three cost grids (buildings, tools, resources) on one screen so
 * the whole economy is visible at once, with a sticky action bar that reports
 * the staged-change count and opens the Export view.
 *
 * Editing is staging-only: the game always runs off the real constants. The
 * Export view renders the staged edits as an LLM-ready change list (Markdown +
 * JSON patch) the designer pastes into a new session to apply to constants.ts.
 *
 * Reachable from the wiki's Dev utilities (hidden in Player view). When opened
 * in Player view the grids fall back to read-only.
 *
 * React Compiler is on — no manual useMemo/useCallback.
 */

import React, { useState } from "react";
import { COLORS, SmallButton } from "../../shared.jsx";
import { useWikiView } from "../wikiView.js";
import { useCostEdits } from "../costEditsStore.js";
import { buildCostReport } from "../costExport.js";
import type { CostReport } from "../costExport.js";
import { CostMatrixCard } from "./CostMatrixCard.jsx";

// ─── Clipboard helper ─────────────────────────────────────────────────────────

async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    if (typeof document === "undefined") return false;
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// ─── Export modal ───────────────────────────────────────────────────────────────

function CostExportModal({ report, onClose }: { report: CostReport; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    void copyText(report.markdown).then((ok) => {
      if (ok) {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }
    });
  };

  return (
    <div
      className="wiki-cost-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Export staged balance changes"
      onClick={onClose}
    >
      <div className="wiki-cost-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wiki-cost-modal__head">
          <div className="wiki-section-heading" style={{ border: "none", margin: 0, padding: 0 }}>
            Export {report.count} change{report.count === 1 ? "" : "s"}
          </div>
          <button className="wiki-cost-modal__close" onClick={onClose} aria-label="Close export">
            ✕
          </button>
        </div>
        <p className="text-[12px] m-0" style={{ color: COLORS.inkLight }}>
          Paste this into a fresh chat session — it tells the model exactly which fields in{" "}
          <span className="wiki-mono">src/constants.ts</span> to change. Nothing here touches the
          running game; the game always reads the real config.
        </p>
        <div className="flex items-center gap-2">
          <SmallButton variant="primary" onClick={onCopy}>
            {copied ? "Copied!" : "Copy to clipboard"}
          </SmallButton>
          <span className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
            {report.count} field{report.count === 1 ? "" : "s"} across {countMatrices(report)} categor
            {countMatrices(report) === 1 ? "y" : "ies"}
          </span>
        </div>
        <textarea
          className="wiki-cost-export-text"
          readOnly
          value={report.markdown}
          spellCheck={false}
          onFocus={(e) => e.currentTarget.select()}
        />
      </div>
    </div>
  );
}

function countMatrices(report: CostReport): number {
  return new Set(report.changes.map((c) => c.matrixId)).size;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CostMatrixPage() {
  const { view } = useWikiView();
  const editable = view === "developer";
  const { edits, clearAll } = useCostEdits();
  const report = buildCostReport(edits);
  const [showExport, setShowExport] = useState(false);

  return (
    <div className="wiki-cost-page flex flex-col gap-4">
      {/* Intro */}
      <header className="flex flex-col gap-1">
        <h1 className="wiki-title wiki-title--article">Cost matrix</h1>
        <p className="text-[13px] m-0" style={{ color: COLORS.inkLight }}>
          Every building, tool, and resource cost in one place — the full economy at a glance.
          {editable ? (
            <> Edit any cell to <strong>stage</strong> a change, then <strong>Export</strong> the list to apply it via a new chat session.</>
          ) : (
            <> Switch to <strong>Developer</strong> view to edit and export.</>
          )}
        </p>
      </header>

      {/* Sticky action bar */}
      <div className="wiki-cost-actionbar">
        <div className="wiki-cost-actionbar__status">
          {report.count === 0 ? (
            <span style={{ color: COLORS.inkSubtle }}>No staged changes</span>
          ) : (
            <span>
              <strong>{report.count}</strong> staged change{report.count === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SmallButton variant="primary" disabled={report.count === 0} onClick={() => setShowExport(true)}>
            Export changes…
          </SmallButton>
          <SmallButton variant="ghost" disabled={report.count === 0} onClick={clearAll}>
            Reset all
          </SmallButton>
        </div>
      </div>

      {/* The three grids */}
      {report.matrices.map((matrix) => (
        <CostMatrixCard key={matrix.id} matrix={matrix} editable={editable} id={`cost-${matrix.id}`} />
      ))}

      {showExport && <CostExportModal report={report} onClose={() => setShowExport(false)} />}
    </div>
  );
}

export default CostMatrixPage;
