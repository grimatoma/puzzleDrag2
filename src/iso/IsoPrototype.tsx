// Iso prototype shell: a mode toggle (Comparison / Street) that feeds one of
// two configs into the shared IsoWorld engine.
//   • Comparison — the four forge renderings side by side, labeled.
//   • Street     — an iso road lined with forge buildings (the premium block and
//                  the deluxe compound alternating) to see the town feel.

import { useState } from "react";
import IsoWorld, { type WorldBuilding, type WorldConfig } from "./IsoWorld.jsx";
import BuildingGallery from "./BuildingGallery.jsx";
import IsoForgeDetailed from "./variants/IsoForgeDetailed.jsx";
import IsoForgeBillboard from "./variants/IsoForgeBillboard.jsx";
import IsoForgePremium from "./variants/IsoForgePremium.jsx";
import IsoForgeDeluxe from "./variants/IsoForgeDeluxe.jsx";

const grass = (gx: number, gy: number) => ((gx + gy) % 2 === 0 ? "#6fa04a" : "#629247");

// ---- Comparison scene ----
const COMPARE_BUILDINGS: WorldBuilding[] = [
  { id: "detailed", label: "1 · Iso redraw (v2)", Comp: IsoForgeDetailed, center: { gx: 1, gy: 13 } },
  { id: "billboard", label: "2 · Direct transfer", Comp: IsoForgeBillboard, center: { gx: 5, gy: 9 } },
  { id: "premium", label: "3 · Premium true-iso", Comp: IsoForgePremium, center: { gx: 9, gy: 5 } },
  { id: "deluxe", label: "4 · Deluxe smithy", Comp: IsoForgeDeluxe, center: { gx: 13, gy: 1 }, footHalf: 1.4 },
];
const compareCobble = new Set<string>();
COMPARE_BUILDINGS.forEach((b) => {
  [{ gx: b.center.gx, gy: b.center.gy + 2 }, { gx: b.center.gx, gy: b.center.gy + 3 }].forEach((t) => compareCobble.add(`${Math.round(t.gx)}-${Math.round(t.gy)}`));
});
const COMPARE: WorldConfig = {
  gridW: 15, gridH: 15, buildings: COMPARE_BUILDINGS, start: { gx: 7, gy: 12 }, showLabels: true,
  caption: "Comparison — arrow keys / WASD or click to walk · approach a door to enter",
  tileFill: (gx, gy) => (compareCobble.has(`${gx}-${gy}`) ? "#b9ac86" : grass(gx, gy)),
};

// ---- Street scene ----
const STREET_ROW_GY = 3.5;
const STREET_BUILDINGS: WorldBuilding[] = [
  { id: "s0", Comp: IsoForgeDeluxe, center: { gx: 3, gy: STREET_ROW_GY }, footHalf: 1.4 },
  { id: "s1", Comp: IsoForgePremium, center: { gx: 8, gy: STREET_ROW_GY } },
  { id: "s2", Comp: IsoForgeDeluxe, center: { gx: 13, gy: STREET_ROW_GY }, footHalf: 1.4 },
  { id: "s3", Comp: IsoForgePremium, center: { gx: 18, gy: STREET_ROW_GY } },
  { id: "s4", Comp: IsoForgeDeluxe, center: { gx: 23, gy: STREET_ROW_GY }, footHalf: 1.4 },
];
const streetCobble = new Set<string>();
STREET_BUILDINGS.forEach((b) => {
  [5, 6].forEach((dy) => streetCobble.add(`${b.center.gx}-${b.center.gy + dy}`));
});
const STREET: WorldConfig = {
  gridW: 27, gridH: 11, buildings: STREET_BUILDINGS, start: { gx: 6, gy: 8 }, showLabels: false,
  caption: "Street — arrow keys / WASD or click to walk · approach a door to enter",
  tileFill: (gx, gy) => {
    if (gy === 6 || gy === 7) return (gx % 2 === 0 ? "#857a63" : "#7c715a"); // dirt road
    if (streetCobble.has(`${gx}-${gy}`)) return "#b9ac86"; // cobble forecourt
    return grass(gx, gy);
  },
};

type Mode = "gallery" | "compare" | "street";

export default function IsoPrototype() {
  const [mode, setMode] = useState<Mode>("gallery");
  const btn = (m: Mode, label: string) => (
    <button
      onClick={() => setMode(m)}
      style={{
        background: mode === m ? "#d6612a" : "rgba(0,0,0,.45)",
        color: "#fff", border: "1px solid rgba(255,255,255,.18)", borderRadius: "7px",
        padding: "6px 12px", fontSize: "13px", fontWeight: 600, cursor: "pointer",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#1c2530", overflow: mode === "gallery" ? "auto" : "hidden" }}>
      <div style={{ position: "fixed", top: 12, right: 12, zIndex: 11, display: "flex", gap: "8px" }}>
        {btn("gallery", "Gallery")}
        {btn("compare", "Comparison")}
        {btn("street", "Street")}
      </div>
      {mode === "gallery" ? <BuildingGallery /> : <IsoWorld key={mode} {...(mode === "compare" ? COMPARE : STREET)} />}
    </div>
  );
}
