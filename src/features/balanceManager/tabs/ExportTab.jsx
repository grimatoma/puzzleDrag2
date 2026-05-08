// Export · Import tab — JSON view of the current draft, download as a
// committable file, paste-and-replace import.

import { useState, useMemo } from "react";
import { COLORS, SmallButton, Card } from "../shared.jsx";

function pruneEmpty(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) continue;
    if (Array.isArray(v) && v.length === 0) {
      // Keep empty arrays — they can be a meaningful instruction (e.g.
      // tilePowers entry with hooks: [] means "no hooks for this tile").
      out[k] = v;
      continue;
    }
    out[k] = v;
  }
  return out;
}

export default function ExportTab({ draft, updateDraft }) {
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");

  const pretty = useMemo(() => {
    const cleaned = pruneEmpty(draft);
    return JSON.stringify(cleaned, null, 2);
  }, [draft]);

  function downloadJson() {
    const blob = new Blob([pretty], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "balance.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function copyToClipboard() {
    try {
      navigator.clipboard?.writeText(pretty);
    } catch { /* clipboard unavailable */ }
  }

  function applyImport() {
    setImportError("");
    try {
      const parsed = JSON.parse(importText);
      if (!parsed || typeof parsed !== "object") throw new Error("Top level must be a JSON object.");
      updateDraft((d) => {
        // Replace each known section if present in the import, else leave it.
        const sections = [
          "upgradeThresholds", "resources", "recipes", "buildings",
          "tilePowers", "tileUnlocks", "tileDescriptions",
        ];
        for (const s of sections) {
          if (parsed[s] && typeof parsed[s] === "object") {
            d[s] = JSON.parse(JSON.stringify(parsed[s]));
          }
        }
        if (Number.isFinite(parsed.version)) d.version = parsed.version;
      });
      setImportText("");
    } catch (e) {
      setImportError(String(e?.message || e));
    }
  }

  const sections = [
    { key: "upgradeThresholds", label: "Upgrade Thresholds" },
    { key: "resources",         label: "Resources" },
    { key: "recipes",           label: "Recipes" },
    { key: "buildings",         label: "Buildings" },
    { key: "tilePowers",        label: "Tile Powers" },
    { key: "tileUnlocks",       label: "Tile Unlocks" },
    { key: "tileDescriptions",  label: "Tile Descriptions" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <Card title="Workflow">
        <ol className="text-[12px] space-y-1.5 list-decimal pl-5" style={{ color: COLORS.inkLight }}>
          <li>Edit values in the other tabs. Changes accumulate in this draft.</li>
          <li>Click <strong>💾 Save Draft</strong> in the header (or <kbd>Cmd/Ctrl-S</kbd>) to persist locally.</li>
          <li>Reload the page — the saved draft is layered on top of <code>balance.json</code> at startup.</li>
          <li>When happy, click <strong>Download JSON</strong> below and replace <code>src/config/balance.json</code> with it. Commit and ship.</li>
          <li>Use <strong>✕ Clear All Overrides</strong> in the sidebar to wipe the local draft and revert to defaults.</li>
        </ol>
      </Card>

      <Card title="Override summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {sections.map((s) => {
            const count = Object.keys(draft[s.key] || {}).length;
            return (
              <div
                key={s.key}
                className="flex flex-col items-center justify-center px-2 py-2 rounded-lg border-2"
                style={{ background: count ? "#fff5e6" : COLORS.parchmentDeep, borderColor: count ? COLORS.ember : COLORS.border }}
              >
                <div className="text-[20px] font-bold" style={{ color: count ? COLORS.ember : COLORS.inkSubtle }}>
                  {count}
                </div>
                <div className="text-[10px] uppercase tracking-wide font-bold text-center" style={{ color: COLORS.inkSubtle }}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Export">
        <div className="flex items-center gap-2 mb-2">
          <SmallButton variant="primary" onClick={downloadJson}>⬇ Download balance.json</SmallButton>
          <SmallButton onClick={copyToClipboard}>📋 Copy to clipboard</SmallButton>
        </div>
        <pre
          className="text-[11px] font-mono p-3 rounded-lg border-2 overflow-auto"
          style={{
            background: "#fff",
            borderColor: COLORS.border,
            color: COLORS.ink,
            maxHeight: 320,
          }}
        >
{pretty}
        </pre>
      </Card>

      <Card title="Import (paste a balance.json)">
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='Paste JSON here. Top-level keys: upgradeThresholds, resources, recipes, buildings, tilePowers, tileUnlocks, tileDescriptions.'
          rows={8}
          className="w-full p-2 text-[11px] font-mono rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-[#d6612a]/40"
          style={{ background: "#fff", borderColor: COLORS.border, color: COLORS.ink, resize: "vertical" }}
        />
        {importError && (
          <div className="mt-1 text-[12px] font-bold" style={{ color: COLORS.red }}>
            ⚠ {importError}
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <SmallButton variant="primary" onClick={applyImport} disabled={!importText.trim()}>
            Apply to draft
          </SmallButton>
          <SmallButton onClick={() => { setImportText(""); setImportError(""); }}>Clear</SmallButton>
        </div>
      </Card>
    </div>
  );
}
