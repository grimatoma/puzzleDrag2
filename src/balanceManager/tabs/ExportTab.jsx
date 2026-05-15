// Export · Import tab — JSON view of the current draft, download as a
// committable file, paste-and-replace import.

import { useState, useMemo } from "react";
import { COLORS, SmallButton, Card } from "../shared.jsx";
import {
  listSnapshots, saveSnapshot, loadSnapshot, deleteSnapshot,
} from "../snapshots.js";
import { draftDiff, summariseTotals } from "../diff.js";
import balanceFile from "../../config/balance.json";

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

function relativeTime(iso) {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const diff = Math.max(0, Date.now() - t);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function ExportTab({ draft, updateDraft }) {
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [snapshotName, setSnapshotName] = useState("");
  const [snapshotMessage, setSnapshotMessage] = useState("");
  const [snapshotError, setSnapshotError] = useState("");
  const [snapshots, setSnapshots] = useState(() => listSnapshots());
  const [diffOpen, setDiffOpen] = useState(new Set());
  const diff = useMemo(() => draftDiff(balanceFile, draft), [draft]);
  const diffSections = useMemo(() => Object.entries(diff.sections).sort(([a], [b]) => a.localeCompare(b)), [diff]);

  const toggleSection = (name) => {
    setDiffOpen((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

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

  function bumpSnapshots() { setSnapshots(listSnapshots()); }

  function flashSnapshot(message) {
    setSnapshotMessage(message);
    setSnapshotError("");
    setTimeout(() => setSnapshotMessage(""), 2400);
  }

  function handleSaveSnapshot() {
    const result = saveSnapshot(snapshotName, draft);
    if (!result.ok) {
      setSnapshotError(result.message);
      return;
    }
    setSnapshotName("");
    setSnapshotError("");
    flashSnapshot(`Saved snapshot “${result.name}”`);
    bumpSnapshots();
  }

  function handleLoadSnapshot(name) {
    const loaded = loadSnapshot(name);
    if (!loaded) {
      setSnapshotError(`Could not load snapshot “${name}”.`);
      return;
    }
    if (!confirm(`Replace the current draft with snapshot “${name}”? Your unsaved tab edits will be lost.`)) return;
    updateDraft((d) => {
      for (const k of Object.keys(d)) delete d[k];
      Object.assign(d, loaded);
    });
    flashSnapshot(`Loaded snapshot “${name}”`);
  }

  function handleDeleteSnapshot(name) {
    if (!confirm(`Delete snapshot “${name}”? This cannot be undone.`)) return;
    deleteSnapshot(name);
    flashSnapshot(`Deleted snapshot “${name}”`);
    bumpSnapshots();
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

      <Card title="Diff vs committed balance.json">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: COLORS.inkSubtle }}>
            {summariseTotals(diff.totals)}
          </span>
          {diff.totals.added > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(90,158,75,0.16)", color: COLORS.greenDeep, border: `1px solid ${COLORS.greenDeep}55` }}>+{diff.totals.added}</span>}
          {diff.totals.modified > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(214,97,42,0.12)", color: COLORS.ember, border: `1px solid ${COLORS.ember}55` }}>~{diff.totals.modified}</span>}
          {diff.totals.removed > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(194,59,34,0.10)", color: COLORS.red, border: `1px solid ${COLORS.red}55` }}>−{diff.totals.removed}</span>}
        </div>
        {diffSections.length === 0 && (
          <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
            Draft matches the committed file — nothing new to ship.
          </div>
        )}
        {diffSections.map(([name, section]) => {
          const open = diffOpen.has(name);
          const counts = [
            section.added.length && `+${section.added.length}`,
            section.modified.length && `~${section.modified.length}`,
            section.removed.length && `−${section.removed.length}`,
          ].filter(Boolean).join(" ");
          return (
            <div key={name} className="border-2 rounded-lg mb-1.5 overflow-hidden"
              style={{ borderColor: COLORS.border, background: COLORS.parchmentDeep }}>
              <button onClick={() => toggleSection(name)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-left"
                style={{ background: open ? "#fff5e6" : "transparent", color: COLORS.ink, cursor: "pointer", border: "none" }}>
                <span className="font-bold text-[12px]">{open ? "▾" : "▸"} {name === "_root" ? "(top-level)" : name}</span>
                <span className="text-[10px] font-mono" style={{ color: COLORS.inkSubtle }}>{counts}</span>
              </button>
              {open && (
                <div className="px-3 py-2 text-[11px] font-mono" style={{ background: "#fff", borderTop: `1px solid ${COLORS.border}` }}>
                  {section.added.map((e) => (
                    <div key={`a-${e.key}`} style={{ color: COLORS.greenDeep }}>+ {e.key}</div>
                  ))}
                  {section.modified.map((e) => (
                    <div key={`m-${e.key}`} style={{ color: COLORS.ember }}>~ {e.key}</div>
                  ))}
                  {section.removed.map((e) => (
                    <div key={`r-${e.key}`} style={{ color: COLORS.red }}>− {e.key}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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

      <Card title="Snapshots — named presets">
        <p className="text-[12px] mb-2" style={{ color: COLORS.inkLight }}>
          Save the current draft under a name (e.g. <em>easy mode</em>, <em>tight economy</em>) and reload it
          later. Snapshots stay on this device — they aren't part of <code>balance.json</code> until you load
          one and download.
        </p>
        <div className="flex items-center gap-2 mb-2">
          <input
            value={snapshotName}
            placeholder="Snapshot name…"
            onChange={(e) => { setSnapshotName(e.target.value); setSnapshotError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && snapshotName.trim()) handleSaveSnapshot(); }}
            className="flex-1 px-2 py-1 text-[12px] rounded border-2"
            style={{ background: "#fff", borderColor: COLORS.border, color: COLORS.ink }}
          />
          <SmallButton variant="primary" onClick={handleSaveSnapshot} disabled={!snapshotName.trim()}>
            💾 Save snapshot
          </SmallButton>
        </div>
        {snapshotMessage && (
          <div className="text-[11px] font-bold mb-2" style={{ color: COLORS.greenDeep }}>{snapshotMessage}</div>
        )}
        {snapshotError && (
          <div className="text-[11px] font-bold mb-2" style={{ color: COLORS.red }}>⚠ {snapshotError}</div>
        )}
        {snapshots.length === 0 ? (
          <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>No snapshots yet — save one above to keep this draft around.</div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {snapshots.map((s) => (
              <li key={s.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border-2"
                style={{ background: "#fff", borderColor: COLORS.border }}>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-bold truncate" style={{ color: COLORS.ink }}>{s.name}</div>
                  <div className="text-[10px]" style={{ color: COLORS.inkSubtle }}>
                    Saved {relativeTime(s.savedAt)}
                  </div>
                </div>
                <SmallButton onClick={() => handleLoadSnapshot(s.name)}>Load</SmallButton>
                <SmallButton variant="danger" onClick={() => handleDeleteSnapshot(s.name)}>Delete</SmallButton>
              </li>
            ))}
          </ul>
        )}
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
