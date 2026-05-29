// Before/after gallery for the isometric building set. The default tab of the
// `/iso/` entry. For every canonical building it shows the ORIGINAL flat
// illustration (animations live) beside its ISO replacement (auto-discovered
// from `src/iso/buildings/*.tsx`, animations live) — or a TODO placeholder.
//
// This is the surface a critique agent (or human) uses to score each building
// against the quality bar. `?building=<key>` isolates one building large for
// close inspection; cells carry stable data-building / data-side attributes so
// screenshots can be cropped precisely. Every iso "after" renders in the SAME
// viewBox so relative plot sizes are honest (a Large building reads bigger).

import { useEffect, useState } from "react";
import BuildingIllustration, { CANONICAL_BUILDING_KEYS } from "../ui/buildings/index.jsx";
import type { IsoBuildingComponent, IsoBuildingMeta, IsoBuildingStatus } from "./buildingMeta.js";
import { PLOT } from "./isoKit.jsx";

// ---- auto-discover iso building components (filename = building key) ----
type IsoModule = { default: IsoBuildingComponent; meta?: IsoBuildingMeta };
const isoModules = import.meta.glob<IsoModule>("./buildings/*.tsx", { eager: true });
const ISO: Record<string, IsoModule> = {};
for (const path in isoModules) {
  const key = path.replace(/^\.\/buildings\//, "").replace(/\.tsx$/, "");
  ISO[key] = isoModules[path];
}

// Common framing for every iso "after" so sizes are comparable across cells.
const AFTER_VIEWBOX = "-160 -250 320 330";

const prettyLabel = (key: string) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const STATUS_STYLE: Record<IsoBuildingStatus, { bg: string; label: string }> = {
  todo: { bg: "#555f6b", label: "TODO" },
  in_progress: { bg: "#b07d2a", label: "WIP" },
  review: { bg: "#3a6ea5", label: "REVIEW" },
  approved: { bg: "#2f8f4e", label: "APPROVED" },
};

function Badge({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <span style={{ background: bg, color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: 0.4, padding: "2px 7px", borderRadius: 5, textTransform: "uppercase" }}>
      {children}
    </span>
  );
}

function BeforeBox({ keyId, size }: { keyId: string; size: number }) {
  return (
    <div data-building={keyId} data-side="before" style={{ width: size, height: size, display: "grid", placeItems: "center", background: "#e9eef3", borderRadius: 8, overflow: "hidden" }}>
      <div className="iso-before-art" style={{ width: "92%", height: "92%" }}>
        <BuildingIllustration id={keyId} isBuilt />
      </div>
    </div>
  );
}

function AfterBox({ keyId, size }: { keyId: string; size: number }) {
  const mod = ISO[keyId];
  const Comp = mod?.default;
  return (
    <div data-building={keyId} data-side="after" style={{ width: size, height: size, display: "grid", placeItems: "center", background: "#26313d", borderRadius: 8, overflow: "hidden", position: "relative" }}>
      {Comp ? (
        <svg viewBox={AFTER_VIEWBOX} style={{ width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
          <Comp originX={0} originY={0} />
        </svg>
      ) : (
        <div style={{ color: "#7f8b98", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
          iso TODO
        </div>
      )}
    </div>
  );
}

function Cell({ keyId }: { keyId: string }) {
  const mod = ISO[keyId];
  const meta = mod?.meta;
  const status: IsoBuildingStatus = meta?.status ?? "todo";
  const ss = STATUS_STYLE[status];
  const size = 168;
  return (
    <div style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <a href={`?building=${keyId}`} style={{ color: "#e6edf3", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
          {prettyLabel(keyId)}
        </a>
        <div style={{ display: "flex", gap: 5 }}>
          {meta && <Badge bg="#3d4956">{PLOT[meta.plot].tiles}</Badge>}
          <Badge bg={ss.bg}>{ss.label}</Badge>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <BeforeBox keyId={keyId} size={size} />
        <AfterBox keyId={keyId} size={size} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#8895a3", fontSize: 11, padding: "0 2px" }}>
        <span>before</span>
        <span>after (iso)</span>
      </div>
    </div>
  );
}

function Isolated({ keyId, onBack }: { keyId: string; onBack: () => void }) {
  const mod = ISO[keyId];
  const meta = mod?.meta;
  const status: IsoBuildingStatus = meta?.status ?? "todo";
  const ss = STATUS_STYLE[status];
  return (
    <div style={{ minHeight: "100vh", padding: 24, color: "#e6edf3", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <button onClick={onBack} style={{ background: "rgba(0,0,0,.45)", color: "#fff", border: "1px solid rgba(255,255,255,.18)", borderRadius: 7, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          ← Gallery
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{prettyLabel(keyId)}</h1>
        {meta && <Badge bg="#3d4956">{PLOT[meta.plot].tiles} plot</Badge>}
        <Badge bg={ss.bg}>{ss.label}</Badge>
      </div>
      {meta?.notes && <p style={{ color: "#aeb9c4", fontSize: 13, maxWidth: 760, marginTop: 0 }}>{meta.notes}</p>}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div data-building={keyId} data-side="before" style={{ width: 460, height: 460, background: "#e9eef3", borderRadius: 12, display: "grid", placeItems: "center" }}>
          <div className="iso-before-art" style={{ width: "90%", height: "90%" }}><BuildingIllustration id={keyId} isBuilt /></div>
        </div>
        <div data-building={keyId} data-side="after" style={{ width: 460, height: 460, background: "#26313d", borderRadius: 12, display: "grid", placeItems: "center" }}>
          {mod?.default ? (
            <svg viewBox={AFTER_VIEWBOX} style={{ width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
              <mod.default originX={0} originY={0} />
            </svg>
          ) : (
            <div style={{ color: "#7f8b98", fontSize: 16, fontWeight: 600 }}>iso TODO</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BuildingGallery() {
  const [building, setBuilding] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      const p = new URLSearchParams(window.location.search).get("building");
      setBuilding(p && CANONICAL_BUILDING_KEYS.includes(p) ? p : null);
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  if (building) {
    return (
      <Isolated
        keyId={building}
        onBack={() => {
          const url = new URL(window.location.href);
          url.searchParams.delete("building");
          window.history.pushState({}, "", url);
          setBuilding(null);
        }}
      />
    );
  }

  const done = CANONICAL_BUILDING_KEYS.filter((k) => ISO[k]?.meta?.status === "approved").length;
  const started = CANONICAL_BUILDING_KEYS.filter((k) => ISO[k] && ISO[k].meta?.status !== "approved").length;
  return (
    <div style={{ minHeight: "100vh", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ color: "#e6edf3", fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>Isometric Building Set — Before / After</h1>
        <p style={{ color: "#8895a3", fontSize: 13, margin: 0 }}>
          {done} approved · {started} in progress · {CANONICAL_BUILDING_KEYS.length} total. Click a name to inspect it large.
        </p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {CANONICAL_BUILDING_KEYS.map((k) => (
          <Cell key={k} keyId={k} />
        ))}
      </div>
    </div>
  );
}
