// Aggregate diagnostics — runs every audit the editor knows about and
// emits a single dashboard-style summary. Pure module.
//
// Bundled audits:
//   - palette clashes        (palettePicker)
//   - catalog audit          (catalogAudit)
//   - icon coverage          (iconCoverage)
//   - story validation       (collectStoryWarnings → groupedStoryWarnings)
//   - localization length    (localizationReport)
//
// Each section returns `{ id, label, status, summary }` where `status` is
//   'ok'    — green, nothing flagged
//   'warn'  — amber, design-time gaps that won't break the game
//   'error' — red, broken references that will misbehave at runtime
//
// The aggregator also reports an overall worst-status badge so the UI
// can colour-code a single pill at the top of the editor.

import { paletteSummary } from "./palettePicker.js";
import { runCatalogAudit } from "./catalogAudit.js";
import { auditIconCoverage, coverageRatio } from "./iconCoverage.js";
import { groupedStoryWarnings } from "../storyEditor/shared.jsx";
import { computeLocalizationReport, summariseLocalization } from "../storyEditor/localizationReport.js";

const PRIORITY = { ok: 0, warn: 1, error: 2 };

const SECTION_BUILDERS = [
  {
    id: "palette",
    label: "Palette clashes",
    build: () => {
      const s = paletteSummary();
      const status = s.totalClashes > 0 ? "warn" : "ok";
      return { status, summary: `${s.clashingItems}/${s.totalItems} items, ${s.totalClashes} pair${s.totalClashes === 1 ? "" : "s"} at threshold ${s.threshold}` };
    },
  },
  {
    id: "catalog",
    label: "Catalog references",
    build: () => {
      const findings = runCatalogAudit();
      const errorTypes = ["brokenRecipeOutput", "brokenRecipeInput", "brokenBuildingCost", "bossTargetMissing", "achievementMissing", "zoneBuildingMissing"];
      const errs = findings.filter((f) => errorTypes.includes(f.category)).length;
      const warns = findings.length - errs;
      const status = errs > 0 ? "error" : (warns > 0 ? "warn" : "ok");
      return { status, summary: `${errs} broken reference${errs === 1 ? "" : "s"}, ${warns} description gap${warns === 1 ? "" : "s"}` };
    },
  },
  {
    id: "icons",
    label: "Icon coverage",
    build: () => {
      const audit = auditIconCoverage();
      const pct = Math.round(coverageRatio(audit) * 100);
      const status = audit.missing.length > 0 ? "warn" : "ok";
      return { status, summary: `${pct}% (${audit.ok.length}/${audit.total} items have a registered icon)` };
    },
  },
  {
    id: "story",
    label: "Story warnings",
    build: (draft) => {
      const grouped = groupedStoryWarnings(draft);
      const status = grouped.total > 0 ? "warn" : "ok";
      return { status, summary: `${grouped.total} warning${grouped.total === 1 ? "" : "s"} across ${grouped.groups.length} categor${grouped.groups.length === 1 ? "y" : "ies"}` };
    },
  },
  {
    id: "localization",
    label: "Localization length",
    build: (draft) => {
      const report = computeLocalizationReport(draft);
      const summary = summariseLocalization(report);
      const status = summary.veryLong > 0 ? "warn" : (summary.long > 0 ? "warn" : "ok");
      return { status, summary: `${summary.veryLong} very-long, ${summary.long} long line${summary.long === 1 ? "" : "s"}` };
    },
  },
];

/**
 * Run every section against the given draft. Returns
 *   { worstStatus, sections: [{ id, label, status, summary }] }
 */
export function runDiagnostics(draft) {
  const sections = [];
  let worstStatus = "ok";
  for (const builder of SECTION_BUILDERS) {
    try {
      const result = builder.build(draft);
      const section = { id: builder.id, label: builder.label, status: result.status, summary: result.summary };
      sections.push(section);
      if (PRIORITY[section.status] > PRIORITY[worstStatus]) worstStatus = section.status;
    } catch (e) {
      sections.push({ id: builder.id, label: builder.label, status: "error", summary: `Audit threw: ${String(e?.message || e)}` });
      worstStatus = "error";
    }
  }
  return { worstStatus, sections };
}

export const DIAGNOSTIC_SECTIONS = SECTION_BUILDERS.map((b) => b.id);
