import { useState } from "react";
import { BIOMES, BUILDINGS } from "../constants.js";
import { useTooltip, Tooltip } from "./Tooltip.jsx";

function BiomeEntryModal({ biomeKey, level, onEnter, onClose }) {
  const biome = BIOMES[biomeKey];
  const locked = biomeKey === "mine" && level < 2;
  const descriptions = {
    farm: "Tend the fields of Hearthwood Vale. Harvest crops, gather timber, and collect eggs to fulfil the villagers' orders.",
    mine: "Descend into Ironridge depths. Extract stone, smelt ore, and uncover precious gems hidden below.",
  };
  return (
    <div className="absolute inset-0 bg-black/60 grid place-items-center z-50 animate-fadein" onClick={onClose}>
      <div
        className="bg-[#f4ecd8] border-[4px] border-[#b28b62] rounded-[20px] px-8 py-6 max-w-[400px] w-[92vw] shadow-2xl text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[52px] leading-none mb-3">{biomeKey === "farm" ? "🌾" : "⛏"}</div>
        <h2 className="font-bold text-[22px] text-[#744d2e] mb-2">{biome.name}</h2>
        <p className="text-[#6a4b31] text-[13px] mb-5 leading-relaxed">{descriptions[biomeKey]}</p>
        {locked ? (
          <div className="bg-[#f7d572]/30 border border-[#f7d572] rounded-xl px-4 py-3 text-[#7a5020] font-bold text-[13px] mb-3">
            🔒 Unlocks at Level 2
          </div>
        ) : (
          <button
            onClick={onEnter}
            className="w-full mb-3 bg-[#91bf24] hover:bg-[#a3d028] text-white border-[3px] border-white rounded-2xl px-8 py-2.5 text-[16px] font-bold shadow-lg transition-colors"
          >
            Enter {biome.name}
          </button>
        )}
        <button
          onClick={onClose}
          className="w-full bg-[#9a724d] hover:bg-[#b8845a] text-white font-bold py-2 rounded-lg border border-[#e6c49a] text-[13px] transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

const TOWN_THEMES = {
  home: {
    bg: "linear-gradient(180deg, #a8c5d6 0%, #c5b48b 55%, #7e9b5a 100%)",
    hill1: "#8da568", hill2: "#5a7a3e", road: "#c5b48b", roadLine: "#a89065",
    sunColor: "#f7d572", sunGlow: "rgba(247,213,114,.7)",
    textColor: "#3a2715",
  },
  farm: {
    bg: "linear-gradient(180deg, #b5d98c 0%, #d4c97a 55%, #6b9c3e 100%)",
    hill1: "#6b9c3e", hill2: "#4a7a28", road: "#d4c97a", roadLine: "#b0a050",
    sunColor: "#ffe066", sunGlow: "rgba(255,224,102,.7)",
    textColor: "#1e3a0a",
  },
  mine: {
    bg: "linear-gradient(180deg, #7a8a96 0%, #9a8878 55%, #4a4e52 100%)",
    hill1: "#5a6068", hill2: "#3a3e42", road: "#9a8878", roadLine: "#706050",
    sunColor: "#c8c4b0", sunGlow: "rgba(200,196,176,.5)",
    textColor: "#e8e0d0",
  },
  festival: {
    bg: "linear-gradient(180deg, #e8b84a 0%, #d4784a 55%, #8a5a2a 100%)",
    hill1: "#c8782a", hill2: "#9a5820", road: "#e8b84a", roadLine: "#c8922a",
    sunColor: "#fff0a0", sunGlow: "rgba(255,240,160,.8)",
    textColor: "#3a1a00",
  },
  event: {
    bg: "linear-gradient(180deg, #8ab4ca 0%, #b09878 55%, #6a7a5a 100%)",
    hill1: "#7a9060", hill2: "#526840", road: "#b09878", roadLine: "#8a7860",
    sunColor: "#e8e0c0", sunGlow: "rgba(232,224,192,.6)",
    textColor: "#1a2a3a",
  },
  boss: {
    bg: "linear-gradient(180deg, #2a1a1a 0%, #4a2a2a 55%, #1a0a0a 100%)",
    hill1: "#3a1a1a", hill2: "#1a0a0a", road: "#4a2a2a", roadLine: "#6a3a3a",
    sunColor: "#c83030", sunGlow: "rgba(200,48,48,.6)",
    textColor: "#e8c0c0",
  },
};

// NPCs visible walking the town road. Color-keyed to NPCS where possible so
// the same character a player gets orders from is the one ambling past.
const TOWN_WALKERS = [
  { color: "#d6612a", duration: 28, delay: 0,  dir: 1,  hair: "bun",       accessory: "basket", size: 1.00 }, // Mira
  { color: "#5a6973", duration: 36, delay: 11, dir: -1, hair: "cap",       accessory: "book",   size: 1.05 }, // Bram
  { color: "#4f6b3a", duration: 32, delay: 18, dir: 1,  hair: "ponytail",  accessory: "flower", size: 0.95 }, // Wren
  { color: "#c8923a", duration: 40, delay: 6,  dir: -1, hair: "short",     accessory: "satchel",size: 1.1  }, // Tomas
  { color: "#8d5ab6", duration: 34, delay: 14, dir: 1,  hair: "puffs",     accessory: "balloon",size: 0.92 }, // Pippa
  { color: "#3f86a8", duration: 45, delay: 21, dir: -1, hair: "braids",    accessory: "lantern",size: 1.08 }, // Olin
  { color: "#b65a7a", duration: 31, delay: 25, dir: 1,  hair: "spiky",     accessory: "kite",   size: 0.98 }, // Nia
];

// Buildings that emit smoke when built (industrial/warm interiors).
const SMOKE_BUILDINGS = new Set(["hearth", "bakery", "forge"]);

// Per-biome visual config: unique building layouts and terrain paths.
// Building order within each layout determines z-stacking (later = on top).
const TOWN_BIOME_CONFIGS = {
  farm: {
    name: "Hearthwood Vale",
    // Gentle pastoral layout — spread wide, inn prominent at center
    buildingLayout: {
      hearth:  { x: 60,  y: 372, w: 88,  h: 90  },
      mill:    { x: 170, y: 352, w: 84,  h: 106 },
      bakery:  { x: 295, y: 366, w: 98,  h: 96  },
      inn:     { x: 442, y: 340, w: 118, h: 124 },
      granary: { x: 618, y: 356, w: 88,  h: 106 },
      larder:  { x: 740, y: 380, w: 72,  h: 82  },
      forge:   { x: 848, y: 366, w: 98,  h: 96  },
      caravan: { x: 966, y: 370, w: 104, h: 86  },
    },
    // Gently rolling hills — soft bezier curves
    hill1Path: "M0,305 C120,278 260,248 420,262 C580,276 700,252 860,258 C960,262 1040,252 1100,248 L1100,600 L0,600 Z",
    hill2Path: "M0,368 C140,352 310,342 520,358 C720,373 900,358 1100,352 L1100,600 L0,600 Z",
    roadPath:  "M-20,506 C160,490 380,498 580,510 C780,522 940,512 1120,502",
    cloudOpacity: "bg-white/70",
  },
  mine: {
    name: "Ironridge Camp",
    // Compact industrial layout — forge dominates center, buildings cluster tightly
    buildingLayout: {
      hearth:  { x: 52,  y: 388, w: 82,  h: 86  },
      granary: { x: 158, y: 378, w: 82,  h: 96  },
      mill:    { x: 262, y: 382, w: 78,  h: 84  },
      bakery:  { x: 360, y: 372, w: 92,  h: 96  },
      forge:   { x: 480, y: 322, w: 120, h: 144 },
      inn:     { x: 638, y: 354, w: 112, h: 122 },
      larder:  { x: 784, y: 382, w: 74,  h: 82  },
      caravan: { x: 888, y: 368, w: 104, h: 88  },
    },
    // Jagged rocky peaks — angular lineto commands
    hill1Path: "M0,288 L78,252 L142,274 L218,218 L308,258 L418,196 L518,240 L638,206 L738,234 L838,196 L938,224 L1018,210 L1100,216 L1100,600 L0,600 Z",
    hill2Path: "M0,366 C60,348 142,372 228,356 C320,342 420,368 530,358 C652,348 780,370 900,356 C980,346 1052,362 1100,356 L1100,600 L0,600 Z",
    roadPath:  "M-20,498 C80,484 220,490 400,498 C580,506 760,500 920,494 C1000,490 1062,492 1120,490",
    cloudOpacity: "bg-white/40",
  },
};
function BuildingIllustration({ id, isBuilt }) {
  const f = isBuilt ? {} : { filter: "saturate(0.15) brightness(0.65)" };
  const lit = isBuilt ? "#ffd86b" : "#5a5040";
  const glow = isBuilt ? "#ff8040" : "#3a2020";
  function shadow(cx = 50, rx = 40) {
    return <ellipse cx={cx} cy="97" rx={rx} ry="4" fill="rgba(0,0,0,.2)" />;
  }
  const illustrations = {
    hearth: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow()}
        <rect x="63" y="13" width="10" height="26" rx="1" fill="#8a7a6a" />
        <rect x="61" y="11" width="14" height="5" rx="1" fill="#6a5a4a" />
        <polygon points="7,44 50,12 93,44" fill="#8a3a1a" />
        <line x1="7" y1="44" x2="29" y2="28" stroke="#6a2a10" strokeWidth="1.5" opacity="0.6" />
        <line x1="50" y1="12" x2="29" y2="28" stroke="#6a2a10" strokeWidth="1.5" opacity="0.6" />
        <line x1="93" y1="44" x2="71" y2="28" stroke="#6a2a10" strokeWidth="1.5" opacity="0.6" />
        <rect x="9" y="44" width="82" height="54" rx="3" fill="#c8a87a" />
        <line x1="9" y1="58" x2="91" y2="58" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
        <line x1="9" y1="71" x2="91" y2="71" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
        <line x1="9" y1="84" x2="91" y2="84" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
        <rect x="13" y="49" width="20" height="16" rx="2" fill={lit} />
        <line x1="23" y1="49" x2="23" y2="65" stroke="#8a6a3a" strokeWidth="1" />
        <line x1="13" y1="57" x2="33" y2="57" stroke="#8a6a3a" strokeWidth="1" />
        <rect x="13" y="49" width="20" height="16" rx="2" fill="none" stroke="#8a6a3a" strokeWidth="1.5" />
        <rect x="67" y="49" width="20" height="16" rx="2" fill={lit} />
        <line x1="77" y1="49" x2="77" y2="65" stroke="#8a6a3a" strokeWidth="1" />
        <line x1="67" y1="57" x2="87" y2="57" stroke="#8a6a3a" strokeWidth="1" />
        <rect x="67" y="49" width="20" height="16" rx="2" fill="none" stroke="#8a6a3a" strokeWidth="1.5" />
        <path d="M38,98 L38,76 A12,12 0 0,1 62,76 L62,98 Z" fill="#7a4a2a" />
        <path d="M38,76 A12,12 0 0,1 62,76" fill="none" stroke="#5a3a1a" strokeWidth="1.5" />
        <circle cx="57" cy="87" r="2" fill="#c8923a" />
        <rect x="9" y="44" width="82" height="54" rx="3" fill="none" stroke="#8a6a3a" strokeWidth="2" />
      </svg>
    ),
    mill: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow(50, 32)}
        <path d="M32,98 L36,48 L64,48 L68,98 Z" fill="#d4b880" />
        <path d="M32,98 L36,48 L64,48 L68,98 Z" fill="none" stroke="#9a7a4a" strokeWidth="2" />
        <line x1="33" y1="70" x2="67" y2="70" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
        <line x1="34" y1="83" x2="66" y2="83" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
        <polygon points="27,48 50,14 73,48" fill="#8a4a1a" />
        <polygon points="27,48 50,14 73,48" fill="none" stroke="#6a3a10" strokeWidth="1.5" />
        <circle cx="50" cy="31" r="5" fill="#8a6040" />
        <circle cx="50" cy="31" r="3" fill="#c8923a" />
        <line x1="50" y1="31" x2="50" y2="10" stroke="#7a5a3a" strokeWidth="2.5" />
        <polygon points="44,10 56,10 58,22 42,22" fill="#e8d8a0" stroke="#9a7a3a" strokeWidth="1" />
        <line x1="50" y1="31" x2="71" y2="31" stroke="#7a5a3a" strokeWidth="2.5" />
        <polygon points="71,25 71,37 59,39 59,23" fill="#e8d8a0" stroke="#9a7a3a" strokeWidth="1" />
        <line x1="50" y1="31" x2="50" y2="52" stroke="#7a5a3a" strokeWidth="2.5" />
        <polygon points="44,40 56,40 58,52 42,52" fill="#e8d8a0" stroke="#9a7a3a" strokeWidth="1" />
        <line x1="50" y1="31" x2="29" y2="31" stroke="#7a5a3a" strokeWidth="2.5" />
        <polygon points="29,25 29,37 41,39 41,23" fill="#e8d8a0" stroke="#9a7a3a" strokeWidth="1" />
        <circle cx="50" cy="63" r="9" fill={lit} />
        <line x1="50" y1="54" x2="50" y2="72" stroke="#8a6a3a" strokeWidth="1" />
        <line x1="41" y1="63" x2="59" y2="63" stroke="#8a6a3a" strokeWidth="1" />
        <circle cx="50" cy="63" r="9" fill="none" stroke="#8a6a3a" strokeWidth="1.5" />
        <path d="M40,98 L40,82 A10,10 0 0,1 60,82 L60,98 Z" fill="#7a5a3a" />
        <path d="M40,82 A10,10 0 0,1 60,82" fill="none" stroke="#5a3a1a" strokeWidth="1.5" />
      </svg>
    ),
    bakery: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow()}
        <rect x="18" y="17" width="9" height="22" rx="1" fill="#8a6a5a" />
        <rect x="16" y="15" width="13" height="5" rx="1" fill="#6a5040" />
        <rect x="73" y="12" width="9" height="27" rx="1" fill="#8a6a5a" />
        <rect x="71" y="10" width="13" height="5" rx="1" fill="#6a5040" />
        <polygon points="6,40 50,8 94,40" fill="#7a3a1a" />
        <line x1="6" y1="40" x2="28" y2="24" stroke="#5a2a10" strokeWidth="1.5" opacity="0.6" />
        <line x1="50" y1="8" x2="28" y2="24" stroke="#5a2a10" strokeWidth="1.5" opacity="0.6" />
        <line x1="94" y1="40" x2="72" y2="24" stroke="#5a2a10" strokeWidth="1.5" opacity="0.6" />
        <rect x="8" y="40" width="84" height="58" rx="3" fill="#c88c60" />
        <line x1="8" y1="53" x2="92" y2="53" stroke="rgba(0,0,0,.08)" strokeWidth="1" />
        <line x1="8" y1="66" x2="92" y2="66" stroke="rgba(0,0,0,.08)" strokeWidth="1" />
        <line x1="8" y1="79" x2="92" y2="79" stroke="rgba(0,0,0,.08)" strokeWidth="1" />
        <line x1="8" y1="92" x2="92" y2="92" stroke="rgba(0,0,0,.08)" strokeWidth="1" />
        <path d="M14,98 L14,57 Q14,44 28,44 Q42,44 42,57 L42,98 Z" fill={isBuilt ? "#ffe0a0" : "#7a6a5a"} />
        <path d="M14,57 Q14,44 28,44 Q42,44 42,57" fill="none" stroke="#8a5a3a" strokeWidth="2" />
        {isBuilt && <>
          <ellipse cx="22" cy="78" rx="6" ry="4" fill="#c87840" />
          <ellipse cx="34" cy="81" rx="5" ry="3.5" fill="#c87840" />
        </>}
        <rect x="50" y="52" width="36" height="9" rx="3" fill="#c8923a" />
        <rect x="50" y="52" width="36" height="9" rx="3" fill="none" stroke="#8a5a1a" strokeWidth="1" />
        <rect x="56" y="71" width="24" height="27" rx="2" fill="#7a4a2a" />
        <rect x="56" y="71" width="24" height="27" rx="2" fill="none" stroke="#5a3a1a" strokeWidth="1.5" />
        <circle cx="76" cy="85" r="2" fill="#c8923a" />
        <rect x="8" y="40" width="84" height="58" rx="3" fill="none" stroke="#8a5a3a" strokeWidth="2" />
      </svg>
    ),
    inn: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow(50, 44)}
        <rect x="66" y="8" width="10" height="22" rx="1" fill="#8a7a6a" />
        <rect x="64" y="6" width="14" height="5" rx="1" fill="#6a5a4a" />
        <polygon points="5,36 50,6 95,36" fill="#4a6a3a" />
        <line x1="5" y1="36" x2="28" y2="21" stroke="#3a5a2a" strokeWidth="1.5" opacity="0.6" />
        <line x1="50" y1="6" x2="28" y2="21" stroke="#3a5a2a" strokeWidth="1.5" opacity="0.6" />
        <line x1="95" y1="36" x2="72" y2="21" stroke="#3a5a2a" strokeWidth="1.5" opacity="0.6" />
        <rect x="7" y="36" width="86" height="28" rx="2" fill="#8a7a60" />
        {[14, 32, 54, 72].map((x) => (
          <g key={x}>
            <rect x={x} y="41" width="14" height="12" rx="2" fill={lit} />
            <line x1={x + 7} y1="41" x2={x + 7} y2="53" stroke="#7a6a4a" strokeWidth="1" />
            <rect x={x} y="41" width="14" height="12" rx="2" fill="none" stroke="#7a6a4a" strokeWidth="1.5" />
          </g>
        ))}
        <rect x="7" y="63" width="86" height="5" rx="1" fill="#6a5a3a" />
        <rect x="7" y="64" width="86" height="34" rx="2" fill="#9a8a70" />
        <line x1="38" y1="63" x2="38" y2="73" stroke="#6a4a2a" strokeWidth="1.5" />
        <line x1="62" y1="63" x2="62" y2="73" stroke="#6a4a2a" strokeWidth="1.5" />
        <rect x="30" y="69" width="40" height="10" rx="2" fill="#c8923a" />
        <rect x="30" y="69" width="40" height="10" rx="2" fill="none" stroke="#8a5a1a" strokeWidth="1" />
        <rect x="10" y="71" width="16" height="14" rx="2" fill={lit} />
        <rect x="10" y="71" width="16" height="14" rx="2" fill="none" stroke="#7a6a4a" strokeWidth="1.5" />
        <rect x="74" y="71" width="16" height="14" rx="2" fill={lit} />
        <rect x="74" y="71" width="16" height="14" rx="2" fill="none" stroke="#7a6a4a" strokeWidth="1.5" />
        <path d="M37,98 L37,82 A13,13 0 0,1 63,82 L63,98 Z" fill="#7a4a2a" />
        <path d="M37,82 A13,13 0 0,1 63,82" fill="none" stroke="#5a3a1a" strokeWidth="2" />
        <line x1="50" y1="82" x2="50" y2="98" stroke="#5a3a1a" strokeWidth="1" />
        <circle cx="59" cy="91" r="2.5" fill="#c8923a" />
      </svg>
    ),
    granary: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow(50, 38)}
        <rect x="13" y="52" width="74" height="45" rx="3" fill="#c8b070" />
        {[24, 36, 50, 64, 76].map((x) => (
          <line key={x} x1={x} y1="52" x2={x} y2="97" stroke="rgba(0,0,0,.1)" strokeWidth="1.5" />
        ))}
        <ellipse cx="50" cy="52" rx="40" ry="22" fill="#c8923a" />
        <ellipse cx="50" cy="52" rx="40" ry="22" fill="none" stroke="#9a6a3a" strokeWidth="1.5" />
        <path d="M12,52 Q50,38 88,52" fill="none" stroke="#9a6a3a" strokeWidth="1" opacity="0.5" />
        <path d="M18,44 Q50,30 82,44" fill="none" stroke="#9a6a3a" strokeWidth="1" opacity="0.5" />
        <ellipse cx="50" cy="30" rx="8" ry="4" fill="#8a5a1a" />
        <rect x="18" y="59" width="12" height="5" rx="2" fill="rgba(0,0,0,.3)" />
        <rect x="70" y="59" width="12" height="5" rx="2" fill="rgba(0,0,0,.3)" />
        <rect x="28" y="72" width="20" height="25" rx="2" fill="#8a5a2a" />
        <rect x="52" y="72" width="20" height="25" rx="2" fill="#8a5a2a" />
        <line x1="50" y1="72" x2="50" y2="97" stroke="#6a4a1a" strokeWidth="2" />
        <rect x="28" y="72" width="44" height="25" rx="2" fill="none" stroke="#6a4a1a" strokeWidth="1.5" />
        <circle cx="46" cy="85" r="2" fill="#c8923a" />
        <circle cx="54" cy="85" r="2" fill="#c8923a" />
        <rect x="13" y="52" width="74" height="45" rx="3" fill="none" stroke="#9a7a4a" strokeWidth="2" />
      </svg>
    ),
    larder: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow(50, 38)}
        <polygon points="6,46 50,18 94,46" fill="#7a6858" />
        <polygon points="6,46 50,18 94,46" fill="none" stroke="#5a4a38" strokeWidth="1.5" />
        <rect x="11" y="46" width="78" height="51" rx="3" fill="#9a8878" />
        <line x1="11" y1="60" x2="89" y2="60" stroke="rgba(0,0,0,.12)" strokeWidth="1" />
        <line x1="11" y1="74" x2="89" y2="74" stroke="rgba(0,0,0,.12)" strokeWidth="1" />
        <line x1="11" y1="88" x2="89" y2="88" stroke="rgba(0,0,0,.12)" strokeWidth="1" />
        <line x1="37" y1="46" x2="37" y2="60" stroke="rgba(0,0,0,.08)" strokeWidth="1" />
        <line x1="63" y1="60" x2="63" y2="74" stroke="rgba(0,0,0,.08)" strokeWidth="1" />
        <rect x="15" y="52" width="16" height="12" rx="1" fill={isBuilt ? "#b0c0d0" : "#6a5a4a"} />
        <line x1="23" y1="52" x2="23" y2="64" stroke="#6a5a4a" strokeWidth="2" />
        <line x1="15" y1="58" x2="31" y2="58" stroke="#6a5a4a" strokeWidth="1" />
        <rect x="15" y="52" width="16" height="12" rx="1" fill="none" stroke="#6a5a4a" strokeWidth="1.5" />
        <rect x="69" y="52" width="16" height="12" rx="1" fill={isBuilt ? "#b0c0d0" : "#6a5a4a"} />
        <line x1="77" y1="52" x2="77" y2="64" stroke="#6a5a4a" strokeWidth="2" />
        <line x1="69" y1="58" x2="85" y2="58" stroke="#6a5a4a" strokeWidth="1" />
        <rect x="69" y="52" width="16" height="12" rx="1" fill="none" stroke="#6a5a4a" strokeWidth="1.5" />
        <rect x="34" y="65" width="32" height="32" rx="2" fill="#5a4a38" />
        <rect x="34" y="65" width="32" height="32" rx="2" fill="none" stroke="#3a2a18" strokeWidth="2" />
        <line x1="34" y1="79" x2="66" y2="79" stroke="#3a2a18" strokeWidth="2" />
        <line x1="34" y1="91" x2="66" y2="91" stroke="#3a2a18" strokeWidth="2" />
        <rect x="47" y="84" width="6" height="6" rx="1" fill="#c8923a" />
        <rect x="11" y="46" width="78" height="51" rx="3" fill="none" stroke="#6a5848" strokeWidth="2" />
      </svg>
    ),
    forge: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow()}
        <rect x="66" y="4" width="13" height="36" rx="2" fill="#4a4848" />
        <rect x="64" y="2" width="17" height="6" rx="1" fill="#383838" />
        <rect x="21" y="10" width="10" height="30" rx="1" fill="#4a4848" />
        <rect x="19" y="8" width="14" height="5" rx="1" fill="#383838" />
        <rect x="6" y="38" width="88" height="59" rx="3" fill="#6a7278" />
        <line x1="6" y1="52" x2="94" y2="52" stroke="rgba(255,255,255,.06)" strokeWidth="1" />
        <line x1="6" y1="66" x2="94" y2="66" stroke="rgba(255,255,255,.06)" strokeWidth="1" />
        <line x1="6" y1="80" x2="94" y2="80" stroke="rgba(255,255,255,.06)" strokeWidth="1" />
        <line x1="6" y1="93" x2="94" y2="93" stroke="rgba(255,255,255,.06)" strokeWidth="1" />
        <rect x="4" y="36" width="92" height="8" rx="2" fill="#5a6068" />
        <rect x="4" y="36" width="92" height="8" rx="2" fill="none" stroke="#3a4048" strokeWidth="1.5" />
        <path d="M26,97 L26,67 Q26,52 50,52 Q74,52 74,67 L74,97 Z" fill={glow} />
        {isBuilt && <path d="M28,97 L28,68 Q28,55 50,55 Q72,55 72,68 L72,97 Z" fill="rgba(255,140,40,.4)" />}
        <path d="M26,67 Q26,52 50,52 Q74,52 74,67" fill="none" stroke="#2a2020" strokeWidth="2.5" />
        {isBuilt && <>
          <rect x="40" y="83" width="20" height="4" rx="1" fill="#1a1a1a" />
          <path d="M38,83 Q50,77 62,83 Z" fill="#1a1a1a" />
          <rect x="44" y="87" width="12" height="7" rx="1" fill="#1a1a1a" />
        </>}
        <rect x="9" y="56" width="14" height="11" rx="1" fill={glow} />
        <rect x="9" y="56" width="14" height="11" rx="1" fill="none" stroke="#3a4048" strokeWidth="1.5" />
        <rect x="77" y="56" width="14" height="11" rx="1" fill={glow} />
        <rect x="77" y="56" width="14" height="11" rx="1" fill="none" stroke="#3a4048" strokeWidth="1.5" />
        <rect x="6" y="38" width="88" height="59" rx="3" fill="none" stroke="#3a4048" strokeWidth="2" />
      </svg>
    ),
    caravan: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow(50, 48)}
        <line x1="82" y1="12" x2="82" y2="40" stroke="#8a5a2a" strokeWidth="2.5" />
        <polygon points="82,12 95,18 82,24" fill="#c83030" />
        <rect x="5" y="45" width="72" height="52" rx="3" fill="#a8784a" />
        <line x1="5" y1="58" x2="77" y2="58" stroke="rgba(0,0,0,.1)" strokeWidth="1.5" />
        <line x1="5" y1="71" x2="77" y2="71" stroke="rgba(0,0,0,.1)" strokeWidth="1.5" />
        <line x1="5" y1="84" x2="77" y2="84" stroke="rgba(0,0,0,.1)" strokeWidth="1.5" />
        <path d="M2,38 L79,38 L77,52 L4,52 Z" fill="#c83a1a" />
        {[13, 26, 40, 53, 66].map((x) => (
          <line key={x} x1={x} y1="38" x2={x - 1} y2="52" stroke="rgba(255,255,255,.2)" strokeWidth="1" />
        ))}
        <line x1="24" y1="38" x2="24" y2="46" stroke="#6a4a2a" strokeWidth="1.5" />
        <line x1="56" y1="38" x2="56" y2="46" stroke="#6a4a2a" strokeWidth="1.5" />
        <rect x="16" y="42" width="48" height="9" rx="2" fill="#e8c060" />
        <rect x="16" y="42" width="48" height="9" rx="2" fill="none" stroke="#9a7a20" strokeWidth="1" />
        <rect x="9" y="57" width="18" height="14" rx="2" fill={lit} />
        <line x1="18" y1="57" x2="18" y2="71" stroke="#8a6a3a" strokeWidth="1" />
        <line x1="9" y1="64" x2="27" y2="64" stroke="#8a6a3a" strokeWidth="1" />
        <rect x="9" y="57" width="18" height="14" rx="2" fill="none" stroke="#8a6a3a" strokeWidth="1.5" />
        <rect x="37" y="67" width="22" height="30" rx="2" fill="#7a4a2a" />
        <rect x="37" y="67" width="22" height="30" rx="2" fill="none" stroke="#5a3a1a" strokeWidth="1.5" />
        <circle cx="56" cy="83" r="2" fill="#c8923a" />
        <circle cx="85" cy="75" r="13" fill="none" stroke="#8a5a2a" strokeWidth="2.5" />
        <circle cx="85" cy="75" r="4" fill="#8a5a2a" />
        <line x1="85" y1="62" x2="85" y2="88" stroke="#8a5a2a" strokeWidth="1.5" />
        <line x1="72" y1="75" x2="98" y2="75" stroke="#8a5a2a" strokeWidth="1.5" />
        <line x1="76" y1="66" x2="94" y2="84" stroke="#8a5a2a" strokeWidth="1.5" />
        <line x1="76" y1="84" x2="94" y2="66" stroke="#8a5a2a" strokeWidth="1.5" />
        <rect x="5" y="45" width="72" height="52" rx="3" fill="none" stroke="#7a5a3a" strokeWidth="2" />
      </svg>
    ),
  };
  return illustrations[id] || null;
}

function FarmFieldArt() {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 w-full h-full">
      {/* Sky */}
      <rect width="100" height="42" fill="#bce088" />
      <rect width="100" height="20" fill="#d8eea8" opacity="0.55" />
      {/* Sun */}
      <circle cx="83" cy="13" r="5" fill="#f7d254" opacity="0.9" />
      <circle cx="83" cy="13" r="8" fill="#f7d254" opacity="0.25" />
      {/* Distant rolling hills */}
      <path d="M0,40 Q22,30 44,36 T88,34 L100,32 L100,52 L0,52 Z" fill="#5a8a25" />
      <path d="M0,46 Q25,38 55,44 T100,42 L100,56 L0,56 Z" fill="#4a7a18" />
      {/* Foreground field */}
      <rect y="50" width="100" height="50" fill="#3a6e10" />
      <path d="M0,50 Q20,52 40,50 T100,52 L100,72 L0,72 Z" fill="#5a8e20" />
      {[0,1,2,3,4,5,6].map((i) => (
        <line key={i} x1="0" y1={56 + i * 7} x2="100" y2={58 + i * 7} stroke="#f4d460" strokeWidth="0.7" opacity="0.45" />
      ))}
      {/* Red barn — body */}
      <rect x="14" y="44" width="34" height="32" fill="#a82820" stroke="#5a1010" strokeWidth="0.7" />
      {/* Roof */}
      <polygon points="11,46 31,30 51,46" fill="#7a1810" stroke="#4a0a08" strokeWidth="0.7" />
      <line x1="11" y1="46" x2="31" y2="30" stroke="#5a0e08" strokeWidth="0.4" />
      <line x1="51" y1="46" x2="31" y2="30" stroke="#5a0e08" strokeWidth="0.4" />
      {/* Hayloft door */}
      <rect x="27" y="34" width="8" height="10" fill="#3a1008" stroke="#1a0808" strokeWidth="0.4" />
      <line x1="31" y1="34" x2="31" y2="44" stroke="#f4ecd0" strokeWidth="0.3" />
      {/* White trim band */}
      <rect x="14" y="56" width="34" height="1.3" fill="#f4ecd0" opacity="0.9" />
      {/* Main door with white cross */}
      <rect x="25" y="59" width="12" height="17" fill="#3a1008" stroke="#1a0808" strokeWidth="0.4" />
      <line x1="25" y1="59" x2="37" y2="76" stroke="#f4ecd0" strokeWidth="0.5" />
      <line x1="37" y1="59" x2="25" y2="76" stroke="#f4ecd0" strokeWidth="0.5" />
      <line x1="31" y1="59" x2="31" y2="76" stroke="#f4ecd0" strokeWidth="0.4" />
      {/* Side windows with shutters */}
      <rect x="16" y="49" width="5" height="5" fill="#f7d254" stroke="#3a1008" strokeWidth="0.4" />
      <line x1="18.5" y1="49" x2="18.5" y2="54" stroke="#3a1008" strokeWidth="0.3" />
      <line x1="16" y1="51.5" x2="21" y2="51.5" stroke="#3a1008" strokeWidth="0.3" />
      <rect x="41" y="49" width="5" height="5" fill="#f7d254" stroke="#3a1008" strokeWidth="0.4" />
      <line x1="43.5" y1="49" x2="43.5" y2="54" stroke="#3a1008" strokeWidth="0.3" />
      <line x1="41" y1="51.5" x2="46" y2="51.5" stroke="#3a1008" strokeWidth="0.3" />
      {/* Weather vane */}
      <line x1="31" y1="30" x2="31" y2="22" stroke="#3a3838" strokeWidth="0.6" />
      <polygon points="31,21 35,23 31,25 27,23" fill="#3a3838" />
      {/* Silo */}
      <rect x="51" y="50" width="10" height="26" fill="#c0b8a0" stroke="#7a7260" strokeWidth="0.5" />
      <line x1="51" y1="58" x2="61" y2="58" stroke="#9a9282" strokeWidth="0.4" />
      <line x1="51" y1="66" x2="61" y2="66" stroke="#9a9282" strokeWidth="0.4" />
      <ellipse cx="56" cy="76" rx="5" ry="1.6" fill="#7a7260" />
      <path d="M51,50 Q56,42 61,50 Z" fill="#7a8a8a" stroke="#5a6a6a" strokeWidth="0.4" />
      {/* Apple tree */}
      <rect x="93" y="58" width="2" height="12" fill="#5a3818" />
      <ellipse cx="94" cy="56" rx="6" ry="6" fill="#3a7a20" />
      <circle cx="91" cy="54" r="1" fill="#e03820" opacity="0.85" />
      <circle cx="96" cy="58" r="0.9" fill="#d02818" opacity="0.85" />
      {/* Wooden fence */}
      {[0,1,2,3,4,5,6,7,8].map((i) => (
        <rect key={i} x={5 + i * 11} y="78" width="1.6" height="9" fill="#9a6828" />
      ))}
      <line x1="2" y1="81" x2="100" y2="81" stroke="#9a6828" strokeWidth="0.9" />
      <line x1="2" y1="85" x2="100" y2="85" stroke="#9a6828" strokeWidth="0.9" />
      {/* Hay bale */}
      <ellipse cx="76" cy="83" rx="9" ry="4.5" fill="#d4a838" stroke="#9a7820" strokeWidth="0.5" />
      <line x1="67" y1="80.5" x2="85" y2="80.5" stroke="#9a7820" strokeWidth="0.4" />
      <line x1="67" y1="84" x2="85" y2="84" stroke="#9a7820" strokeWidth="0.4" />
      {/* Wildflowers */}
      <circle cx="8" cy="92" r="0.9" fill="#ff7070" />
      <circle cx="42" cy="94" r="0.9" fill="#ffffff" />
      <circle cx="62" cy="92" r="0.9" fill="#f0a0e0" />
    </svg>
  );
}

function MineEntranceArt({ locked }) {
  const lanternFill = locked ? "#5a4830" : "#c86820";
  const lanternGlow = locked ? "rgba(120,110,90,.0)" : "rgba(248,160,64,.22)";
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 w-full h-full">
      {/* Dusk sky */}
      <rect width="100" height="40" fill="#3a3e44" />
      <rect width="100" height="14" fill="#52565c" opacity="0.6" />
      {/* Mountain silhouette */}
      <polygon points="0,38 20,14 36,30 54,8 72,24 100,16 100,46 0,46" fill="#48464a" />
      <polygon points="12,30 20,14 28,28" fill="#5a585e" opacity="0.65" />
      <polygon points="46,18 54,8 62,22" fill="#6a686e" opacity="0.55" />
      {/* Snow caps */}
      <polygon points="18,16 20,14 22,16" fill="#d8d0c8" opacity="0.7" />
      <polygon points="52,10 54,8 56,10" fill="#d8d0c8" opacity="0.7" />
      {/* Cliff base */}
      <rect y="42" width="100" height="58" fill="#5c5860" />
      <path d="M0,58 Q30,52 60,56 T100,54 L100,64 L0,64 Z" fill="#48464c" opacity="0.55" />
      <path d="M0,72 Q35,68 70,72 T100,70 L100,80 L0,80 Z" fill="#3a3840" opacity="0.45" />
      {/* Ore vein */}
      <line x1="6" y1="54" x2="22" y2="62" stroke="#9ad8f0" strokeWidth="0.6" opacity="0.5" />
      <line x1="78" y1="50" x2="92" y2="58" stroke="#d8f0fc" strokeWidth="0.5" opacity="0.5" />
      {/* Mine tunnel */}
      <rect x="36" y="48" width="28" height="38" fill="#0a0a0c" />
      <ellipse cx="50" cy="48" rx="14" ry="6" fill="#0a0a0c" />
      <ellipse cx="50" cy="56" rx="9" ry="4" fill="#1a1a1c" opacity="0.85" />
      {/* Timber posts */}
      <rect x="32" y="44" width="5" height="44" fill="#6a4828" stroke="#3a2810" strokeWidth="0.4" />
      <rect x="63" y="44" width="5" height="44" fill="#6a4828" stroke="#3a2810" strokeWidth="0.4" />
      <line x1="34.5" y1="44" x2="34.5" y2="88" stroke="#5a3818" strokeWidth="0.3" opacity="0.8" />
      <line x1="65.5" y1="44" x2="65.5" y2="88" stroke="#5a3818" strokeWidth="0.3" opacity="0.8" />
      {/* Header beam */}
      <rect x="29" y="42" width="42" height="6" fill="#7a5830" stroke="#3a2810" strokeWidth="0.4" />
      <rect x="29" y="42" width="42" height="1.4" fill="#9a7848" opacity="0.6" />
      {/* Knee braces */}
      <line x1="36" y1="50" x2="44" y2="44" stroke="#5a3818" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="64" y1="50" x2="56" y2="44" stroke="#5a3818" strokeWidth="1.8" strokeLinecap="round" />
      {/* Sign board */}
      <rect x="42" y="34" width="16" height="7" fill="#7a5828" stroke="#4a3018" strokeWidth="0.5" />
      <line x1="44" y1="36.2" x2="56" y2="36.2" stroke="#4a3018" strokeWidth="0.4" />
      <line x1="44" y1="38.8" x2="56" y2="38.8" stroke="#4a3018" strokeWidth="0.4" />
      {/* Lanterns */}
      <circle cx="34" cy="52" r="6" fill={lanternGlow} />
      <line x1="34" y1="44" x2="34" y2="48" stroke="#3a2810" strokeWidth="0.6" />
      <rect x="31" y="48" width="6" height="6" fill={lanternFill} stroke="#5a3010" strokeWidth="0.4" />
      <ellipse cx="34" cy="48.5" rx="2.6" ry="0.7" fill={locked ? "#7a6850" : "#f8a040"} opacity="0.85" />
      <circle cx="66" cy="52" r="6" fill={lanternGlow} />
      <line x1="66" y1="44" x2="66" y2="48" stroke="#3a2810" strokeWidth="0.6" />
      <rect x="63" y="48" width="6" height="6" fill={lanternFill} stroke="#5a3010" strokeWidth="0.4" />
      <ellipse cx="66" cy="48.5" rx="2.6" ry="0.7" fill={locked ? "#7a6850" : "#f8a040"} opacity="0.85" />
      {/* Cart tracks */}
      <line x1="0" y1="86" x2="100" y2="86" stroke="#7a6848" strokeWidth="0.9" />
      <line x1="0" y1="90" x2="100" y2="90" stroke="#7a6848" strokeWidth="0.9" />
      {[0,1,2,3,4,5,6,7,8,9].map((i) => (
        <line key={i} x1={6 + i * 10} y1="85" x2={6 + i * 10} y2="91" stroke="#5a4828" strokeWidth="0.6" />
      ))}
      {/* Mine cart */}
      <rect x="14" y="76" width="18" height="10" rx="1" fill="#4a3a26" stroke="#2a1a08" strokeWidth="0.4" />
      <rect x="14" y="76" width="18" height="2.5" fill="#665040" />
      <ellipse cx="23" cy="76" rx="9" ry="2.5" fill="#78889a" />
      <ellipse cx="20" cy="74.5" rx="3.5" ry="1.2" fill="#a0c0d0" opacity="0.75" />
      <circle cx="22" cy="73.5" r="0.6" fill="#d8f0fc" />
      <circle cx="18" cy="88" r="2.6" fill="none" stroke="#3a2810" strokeWidth="0.9" />
      <circle cx="18" cy="88" r="0.9" fill="#3a2810" />
      <circle cx="28" cy="88" r="2.6" fill="none" stroke="#3a2810" strokeWidth="0.9" />
      <circle cx="28" cy="88" r="0.9" fill="#3a2810" />
      {/* Pickaxe leaning */}
      <line x1="74" y1="58" x2="78" y2="84" stroke="#7a5830" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M70,58 L78,55 L82,57 L74,60 Z" fill="#9aa0a8" stroke="#5a606a" strokeWidth="0.4" />
      {/* Tailings pile */}
      <ellipse cx="86" cy="86" rx="13" ry="3.5" fill="#3a3a3a" opacity="0.6" />
      <polygon points="78,84 86,76 94,84" fill="#5a585e" />
      <polygon points="82,82 86,78 90,82" fill="#6a686e" opacity="0.7" />
      <circle cx="86" cy="80" r="0.7" fill="#a0c0d0" />
      <circle cx="89" cy="83" r="0.6" fill="#c8e4f8" opacity="0.8" />
      {/* Smoke wisps from tunnel */}
      {!locked && <>
        <ellipse cx="48" cy="28" rx="2.5" ry="4" fill="rgba(180,170,160,.3)" />
        <ellipse cx="52" cy="22" rx="2" ry="3" fill="rgba(180,170,160,.22)" />
        <ellipse cx="55" cy="16" rx="1.6" ry="2.5" fill="rgba(180,170,160,.15)" />
      </>}
    </svg>
  );
}

export function TownView({ state, dispatch }) {
  const [entryBiome, setEntryBiome] = useState(null);
  const [purchaseBuilding, setPurchaseBuilding] = useState(null);
  const { tip: buildingTip, handlers: tipHandlers } = useTooltip();
  const biomeTheme = state.biomeKey === "mine" ? "mine" : "farm";
  const theme = TOWN_THEMES[biomeTheme] || TOWN_THEMES.home;
  const townConfig = TOWN_BIOME_CONFIGS[biomeTheme];
  // Merge canonical building defs with biome-specific layout overrides
  const townBuildings = BUILDINGS.map(b => ({ ...b, ...(townConfig.buildingLayout[b.id] || {}) }));
  // Sort by bottom edge so shorter buildings don't clip taller neighbours
  const sortedBuildings = [...townBuildings].sort((a, b) => (a.y + a.h) - (b.y + b.h));

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: theme.bg }}
    >
      {/* Sun/light source */}
      <div className="absolute top-12 right-20 w-16 h-16 rounded-full" style={{ background: theme.sunColor, boxShadow: `0 0 60px ${theme.sunGlow}` }} />
      {/* Clouds */}
      <div className={`absolute top-12 w-16 h-4 rounded-full ${biomeTheme === "mine" ? "bg-white/20" : "bg-white/40"}`} style={{ animation: "townCloudC 180s linear infinite", animationDelay: "-60s" }} />
      <div className={`absolute top-16 w-24 h-6 rounded-full ${townConfig.cloudOpacity}`} style={{ animation: "townCloudA 95s linear infinite" }} />
      <div className={`absolute top-24 w-28 h-7 rounded-full ${biomeTheme === "mine" ? "bg-white/30" : "bg-white/60"}`} style={{ animation: "townCloudB 130s linear infinite", animationDelay: "-22s" }} />
      <div className={`absolute top-10 w-20 h-5 rounded-full ${biomeTheme === "mine" ? "bg-white/25" : "bg-white/50"}`} style={{ animation: "townCloudA 160s linear infinite", animationDelay: "-40s" }} />
      <div className={`absolute top-28 w-32 h-8 rounded-full ${biomeTheme === "mine" ? "bg-white/20" : "bg-white/45"}`} style={{ animation: "townCloudB 210s linear infinite", animationDelay: "-95s" }} />

      {/* Biome-specific terrain */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1100 600" preserveAspectRatio="none">
        <path d={townConfig.hill1Path} fill={theme.hill1} opacity="0.75" />
        <path d={townConfig.hill2Path} fill={theme.hill2} opacity="0.6" />

        {biomeTheme === "farm" && <>
          {/* Sunlit highlight ridge on the far hill */}
          <path d="M0,248 C140,222 300,210 480,224 C640,238 780,218 960,210 C1020,208 1070,206 1100,204 L1100,305 C1040,252 760,252 420,262 C260,248 120,278 0,305 Z" fill="#9ad060" opacity="0.28" />
          {/* Orchard tree clusters on left hill */}
          {[0,1,2,3,4,5,6].map(i => {
            const tx = 52 + i * 110 + (i%2)*28;
            const ty = 238 + (i%3)*14;
            return <g key={i}>
              <rect x={tx-3} y={ty+12} width="6" height="20" fill="#6a4a20" opacity="0.55" />
              <ellipse cx={tx} cy={ty} rx={18+(i%2)*6} ry={15+(i%3)*4} fill={i%3===0?"#3a7a20":i%3===1?"#4a8a28":"#5a9a30"} opacity="0.65" />
            </g>;
          })}
          {/* Golden wheat field on left slope */}
          <path d="M20,278 L0,310 L380,290 L390,260 Z" fill="#c8a040" opacity="0.22" />
          {[0,1,2,3,4,5].map(i => (
            <line key={i} x1="22" y1={268+i*8} x2="385" y2={258+i*6} stroke="#d4b040" strokeWidth="1.5" opacity="0.28" />
          ))}
          {/* Distant barn silhouette — right hill */}
          <rect x="870" y="218" width="56" height="46" fill="#5a3818" opacity="0.45" />
          <polygon points="866,220 898,190 930,220" fill="#6a2818" opacity="0.5" />
          <rect x="890" y="218" width="14" height="22" fill="#3a1808" opacity="0.5" />
          {/* Windmill silhouette — right hill */}
          <rect x="816" y="160" width="10" height="94" fill="#4a6618" opacity="0.62" />
          <polygon points="821,207 788,182 796,226" fill="#4a6618" opacity="0.62" />
          <polygon points="821,207 847,175 845,220" fill="#4a6618" opacity="0.62" />
          <polygon points="821,205 852,230 813,240" fill="#4a6618" opacity="0.62" />
          <polygon points="821,205 790,234 798,198" fill="#4a6618" opacity="0.62" />
          <polygon points="803,250 839,250 836,220 806,220" fill="#7a5828" opacity="0.62" />
          {/* Wooden fence row */}
          {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
            <g key={i}>
              <rect x={22+i*30} y="343" width="5" height="38" rx="1" fill="#9a6828" opacity="0.65" />
              <rect x={20+i*30} y="341" width="9" height="5" rx="1" fill="#7a5018" opacity="0.55" />
            </g>
          ))}
          <line x1="8" y1="358" x2="362" y2="353" stroke="#9a6828" strokeWidth="3.5" opacity="0.65" />
          <line x1="8" y1="368" x2="362" y2="363" stroke="#9a6828" strokeWidth="3.5" opacity="0.65" />
          {/* Hay bales in foreground */}
          <ellipse cx="175" cy="464" rx="24" ry="16" fill="#c89838" opacity="0.7" />
          <line x1="151" y1="464" x2="199" y2="464" stroke="#a07828" strokeWidth="1.5" opacity="0.5" />
          <line x1="151" y1="458" x2="199" y2="458" stroke="#a07828" strokeWidth="1.5" opacity="0.5" />
          <ellipse cx="224" cy="466" rx="20" ry="13" fill="#b88830" opacity="0.65" />
          {/* Wildflowers on hillside */}
          {[0,1,2,3,4,5,6,7,8,9].map(i => (
            <circle key={i} cx={68+i*38+(i%3)*10} cy={294+(i%4)*9} r={3.5+(i%2)} fill={["#f7d254","#ff7070","#ffffff","#f0a0e0","#80e080"][i%5]} opacity="0.6" />
          ))}
          {/* Apple tree near fence right end */}
          <rect x="392" y="312" width="7" height="52" fill="#7a5228" opacity="0.62" />
          <ellipse cx="396" cy="304" rx="26" ry="22" fill="#3a7a20" opacity="0.68" />
          <circle cx="385" cy="298" r="5" fill="#e03820" opacity="0.75" />
          <circle cx="404" cy="306" r="4" fill="#d02818" opacity="0.72" />
        </>}

        {biomeTheme === "mine" && <>
          {/* Rock strata bands across the cliff face */}
          <path d="M0,248 C180,238 400,226 640,232 C820,238 1000,224 1100,220 L1100,272 C900,268 620,278 380,274 C220,270 100,274 0,268 Z" fill="#48443c" opacity="0.28" />
          <path d="M0,268 C160,260 380,250 640,256 C840,262 980,252 1100,248 L1100,286 C900,282 620,290 360,284 C220,280 100,282 0,282 Z" fill="#383430" opacity="0.22" />
          {/* Ore / crystal vein streaks in exposed rock */}
          <line x1="195" y1="240" x2="330" y2="274" stroke="#7a8894" strokeWidth="3" opacity="0.38" />
          <line x1="545" y1="228" x2="605" y2="256" stroke="#9ad8f0" strokeWidth="4" opacity="0.42" />
          <line x1="551" y1="232" x2="601" y2="252" stroke="#d8f0fc" strokeWidth="1.5" opacity="0.55" />
          <line x1="862" y1="218" x2="928" y2="258" stroke="#8a7a5a" strokeWidth="2.5" opacity="0.33" />
          {/* Mine entrance — dark tunnel void */}
          <rect x="728" y="254" width="76" height="94" fill="#080a0c" opacity="0.94" rx="3" />
          <ellipse cx="766" cy="254" rx="38" ry="17" fill="#080a0c" opacity="0.94" />
          {/* Timber frame: vertical posts */}
          <rect x="722" y="244" width="13" height="104" rx="2" fill="#5c3f1c" />
          <rect x="797" y="244" width="13" height="104" rx="2" fill="#5c3f1c" />
          {/* Header beam */}
          <rect x="717" y="243" width="98" height="13" rx="2" fill="#6e4a22" />
          <rect x="717" y="243" width="98" height="3" rx="1" fill="#9a6a34" opacity="0.55" />
          {/* Diagonal knee braces */}
          <line x1="735" y1="256" x2="762" y2="240" stroke="#5c3f1c" strokeWidth="8" strokeLinecap="round" />
          <line x1="797" y1="256" x2="770" y2="240" stroke="#5c3f1c" strokeWidth="8" strokeLinecap="round" />
          {/* Angled side supports to ground */}
          <line x1="728" y1="290" x2="698" y2="350" stroke="#4a3014" strokeWidth="7" strokeLinecap="round" opacity="0.78" />
          <line x1="810" y1="290" x2="840" y2="350" stroke="#4a3014" strokeWidth="7" strokeLinecap="round" opacity="0.78" />
          {/* Sign board above entrance */}
          <rect x="744" y="228" width="44" height="16" rx="2" fill="#7a5828" opacity="0.85" />
          <rect x="744" y="228" width="44" height="16" rx="2" fill="none" stroke="#5a3818" strokeWidth="1.5" />
          {/* Cart tracks */}
          <line x1="630" y1="346" x2="898" y2="338" stroke="#7a6848" strokeWidth="4" opacity="0.65" />
          <line x1="630" y1="358" x2="898" y2="350" stroke="#7a6848" strokeWidth="4" opacity="0.65" />
          {[0,1,2,3,4,5,6,7,8,9].map(i => (
            <line key={i} x1={638+i*26} y1="344" x2={640+i*26} y2="360" stroke="#6a5838" strokeWidth="2.5" opacity="0.5" />
          ))}
          {/* Mine cart with ore load */}
          <rect x="662" y="318" width="56" height="34" rx="3" fill="#4a3a26" />
          <rect x="662" y="318" width="56" height="9" rx="2" fill="#665040" />
          <ellipse cx="690" cy="318" rx="24" ry="9" fill="#78889a" />
          <ellipse cx="684" cy="312" rx="14" ry="7" fill="#8898a8" opacity="0.85" />
          <circle cx="682" cy="310" r="3" fill="#b0d8f0" opacity="0.7" />
          <circle cx="674" cy="352" r="9" fill="none" stroke="#5a4030" strokeWidth="3.5" />
          <circle cx="674" cy="352" r="3.5" fill="#5a4030" />
          <line x1="674" y1="343" x2="674" y2="361" stroke="#5a4030" strokeWidth="2" />
          <line x1="665" y1="352" x2="683" y2="352" stroke="#5a4030" strokeWidth="2" />
          <circle cx="706" cy="352" r="9" fill="none" stroke="#5a4030" strokeWidth="3.5" />
          <circle cx="706" cy="352" r="3.5" fill="#5a4030" />
          <line x1="706" y1="343" x2="706" y2="361" stroke="#5a4030" strokeWidth="2" />
          <line x1="697" y1="352" x2="715" y2="352" stroke="#5a4030" strokeWidth="2" />
          {/* Hanging lanterns flanking entrance */}
          <circle cx="716" cy="260" r="20" fill="#f8a030" opacity="0.13" />
          <circle cx="816" cy="260" r="20" fill="#f8a030" opacity="0.13" />
          <line x1="718" y1="242" x2="718" y2="254" stroke="#4a3820" strokeWidth="2" />
          <rect x="711" y="254" width="14" height="18" rx="3" fill="#c86820" />
          <rect x="711" y="254" width="14" height="18" rx="3" fill="none" stroke="#8a4810" strokeWidth="1.5" />
          <ellipse cx="718" cy="256" rx="7" ry="2.5" fill="#e88030" opacity="0.7" />
          <line x1="816" y1="242" x2="816" y2="254" stroke="#4a3820" strokeWidth="2" />
          <rect x="809" y="254" width="14" height="18" rx="3" fill="#c86820" />
          <rect x="809" y="254" width="14" height="18" rx="3" fill="none" stroke="#8a4810" strokeWidth="1.5" />
          <ellipse cx="816" cy="256" rx="7" ry="2.5" fill="#e88030" opacity="0.7" />
          {/* Tailings pile — rubble mound right of entrance */}
          <ellipse cx="916" cy="358" rx="72" ry="22" fill="#4a4438" opacity="0.58" />
          <polygon points="874,352 916,328 958,352" fill="#524c44" opacity="0.52" />
          <polygon points="888,352 920,336 952,352" fill="#5c5650" opacity="0.42" />
          <circle cx="906" cy="336" r="3" fill="#a0c0d0" opacity="0.52" />
          <circle cx="926" cy="342" r="2" fill="#c8e4f8" opacity="0.58" />
          <circle cx="942" cy="336" r="2.5" fill="#b8d0e0" opacity="0.48" />
          {/* Barrels stacked left of entrance */}
          <ellipse cx="634" cy="346" rx="18" ry="7.5" fill="#7a5030" opacity="0.72" />
          <rect x="616" y="318" width="36" height="32" rx="3" fill="#7a5030" opacity="0.78" />
          <ellipse cx="634" cy="318" rx="18" ry="7.5" fill="#8a6040" opacity="0.78" />
          <line x1="616" y1="326" x2="652" y2="326" stroke="#5a3820" strokeWidth="2" opacity="0.45" />
          <line x1="616" y1="334" x2="652" y2="334" stroke="#5a3820" strokeWidth="2" opacity="0.45" />
          <ellipse cx="658" cy="348" rx="16" ry="6.5" fill="#6a4828" opacity="0.68" />
          <rect x="642" y="322" width="32" height="30" rx="3" fill="#6a4828" opacity="0.72" />
          <ellipse cx="658" cy="322" rx="16" ry="6.5" fill="#7a5838" opacity="0.72" />
          <line x1="642" y1="330" x2="674" y2="330" stroke="#4a3018" strokeWidth="2" opacity="0.4" />
          {/* Rocky outcroppings foreground */}
          <polygon points="46,372 82,326 116,344 130,374" fill="#3c4044" opacity="0.58" />
          <polygon points="86,378 116,346 142,374" fill="#2e3236" opacity="0.5" />
          <line x1="54" y1="364" x2="86" y2="328" stroke="#5c6468" strokeWidth="1.5" opacity="0.38" />
          <polygon points="942,366 978,328 1012,346 1026,368" fill="#3c4044" opacity="0.52" />
          <polygon points="982,374 1008,348 1034,368" fill="#2e3236" opacity="0.44" />
          <line x1="952" y1="360" x2="982" y2="330" stroke="#5c6468" strokeWidth="1.5" opacity="0.35" />
          {/* Smoke wisps from mine entrance */}
          <ellipse cx="750" cy="228" rx="9" ry="14" fill="rgba(160,152,144,.2)" />
          <ellipse cx="758" cy="212" rx="7" ry="11" fill="rgba(160,152,144,.15)" />
          <ellipse cx="764" cy="198" rx="5.5" ry="9" fill="rgba(160,152,144,.1)" />
          <ellipse cx="774" cy="222" rx="8" ry="12" fill="rgba(160,152,144,.18)" />
          <ellipse cx="780" cy="208" rx="6" ry="10" fill="rgba(160,152,144,.13)" />
          {/* Ground pebbles */}
          <ellipse cx="415" cy="386" rx="9" ry="4" fill="#3c3e42" opacity="0.4" />
          <ellipse cx="455" cy="380" rx="7" ry="3" fill="#484c50" opacity="0.36" />
          <ellipse cx="538" cy="388" rx="8" ry="3.5" fill="#3c3e42" opacity="0.38" />
          <ellipse cx="576" cy="382" rx="6" ry="2.5" fill="#484c50" opacity="0.33" />
        </>}

        {/* Road */}
        <path d={townConfig.roadPath} stroke={theme.road} strokeWidth="20" fill="none" strokeLinecap="round" opacity="0.85" />
        <path d={townConfig.roadPath} stroke={theme.roadLine} strokeWidth="2" fill="none" strokeDasharray="6 8" />
      </svg>

      {/* Header */}
      <div className="absolute top-3 left-4 landscape:max-[1024px]:top-2 landscape:max-[1024px]:left-3 font-bold text-[20px] landscape:max-[1024px]:text-[15px]" style={{ color: theme.textColor }}>{townConfig.name}</div>
      <div className="absolute top-3 right-4 landscape:max-[1024px]:top-2 landscape:max-[1024px]:right-3 flex items-center gap-2 z-10">
        <div className="bg-white/85 px-3 py-1.5 landscape:max-[1024px]:px-2 landscape:max-[1024px]:py-1 rounded-full font-bold text-[#3a2715] landscape:max-[1024px]:text-[13px]">◉ {state.coins.toLocaleString()}</div>
      </div>

      {/* Walking NPCs — drift along the road from edge to edge */}
      <div className="absolute inset-x-0 pointer-events-none z-20" style={{ top: "78%", height: "8%" }}>
        {TOWN_WALKERS.map((w, i) => (
          <TownWalker key={i} {...w} />
        ))}
      </div>

      {/* Farm Field and Mine — background locations, rendered behind buildings */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Farm Field — upper-left, in the hills */}
        <div
          className="absolute cursor-pointer group pointer-events-auto flex flex-col items-center"
          style={{ left: "1.5%", bottom: "50%", width: "22%" }}
          onClick={() => setEntryBiome("farm")}
        >
          <div className="w-full text-center font-bold text-white mb-0.5" style={{ fontSize: "clamp(9px,1vw,13px)", textShadow: "0 1px 3px rgba(0,0,0,.9)" }}>🌾 Farm Field</div>
          <div
            className="relative w-full overflow-hidden transition-transform duration-150 group-hover:scale-105"
            style={{ aspectRatio: "1", borderRadius: "8px", border: "2px solid #2a5010", boxShadow: "0 2px 10px rgba(0,0,0,.45)" }}
          >
            <FarmFieldArt />
            <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,.45)" }}>
              <span className="font-bold text-white" style={{ fontSize: "clamp(9px,1vw,13px)" }}>▶ Enter</span>
            </div>
          </div>
        </div>

        {/* Mine Entrance — upper-right, in the hills */}
        <div
          className="absolute cursor-pointer group pointer-events-auto flex flex-col items-center"
          style={{ right: "1.5%", bottom: "50%", width: "22%", opacity: state.level < 2 ? 0.65 : 1 }}
          onClick={() => setEntryBiome("mine")}
        >
          <div className="w-full text-center font-bold text-white mb-0.5" style={{ fontSize: "clamp(9px,1vw,13px)", textShadow: "0 1px 3px rgba(0,0,0,.95)" }}>
            {state.level < 2 ? "🔒 Mine" : "⛏ Mine"}
          </div>
          <div
            className="relative w-full overflow-hidden transition-transform duration-150 group-hover:scale-105"
            style={{ aspectRatio: "1", borderRadius: "8px", border: "2px solid #1a1e22", boxShadow: "0 2px 10px rgba(0,0,0,.5)" }}
          >
            <MineEntranceArt locked={state.level < 2} />
            <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,.45)" }}>
              <span className="font-bold text-white" style={{ fontSize: "clamp(9px,1vw,13px)" }}>{state.level < 2 ? "🔒 L2" : "▶ Enter"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Buildings positioned in the 1100x600 design space, scaled to viewport */}
      <div className="absolute inset-0 pointer-events-none">
        <svg viewBox="0 0 1100 600" preserveAspectRatio="none" className="w-full h-full" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
        <div className="absolute pointer-events-none" style={{ left: 0, right: 0, top: 0, bottom: 0 }}>
          {sortedBuildings.map((b) => {
            const isBuilt = !!state.built[b.id];
            const isLocked = state.level < b.lv;
            const canAfford = state.coins >= (b.cost.coins || 0) &&
              Object.entries(b.cost).every(([k, v]) => k === "coins" || (state.inventory[k] || 0) >= v);
            const CRAFTING_STATIONS = new Set(["bakery", "forge", "larder"]);
            const onClick = () => {
              if (isLocked) return;
              if (isBuilt && CRAFTING_STATIONS.has(b.id)) {
                dispatch({ type: "SET_VIEW", view: "crafting", craftingTab: b.id });
                return;
              }
              if (isBuilt) return;
              if (!canAfford) return;
              setPurchaseBuilding(b);
            };
            const costStr = Object.entries(b.cost).map(([k, v]) => k === "coins" ? `${v}◉` : `${v} ${k}`).join(" · ");
            const buildingTipData = isBuilt ? null : {
              label: isLocked ? `🔒 ${b.name} (Level ${b.lv})` : `Build ${b.name}: ${costStr}`,
              desc: b.desc,
              color: isLocked ? "#f7d572" : canAfford ? "#9bdb6a" : "#f7d572",
            };
            return (
              <div
                key={b.id}
                className="absolute cursor-pointer pointer-events-auto"
                style={{
                  left: `${(b.x / 1100) * 100}%`,
                  bottom: `${((600 - b.y - b.h) / 600) * 100}%`,
                  width: `${(b.w / 1100) * 100}%`,
                  aspectRatio: "1",
                  opacity: isLocked && !isBuilt ? 0.5 : 1,
                }}
                onClick={onClick}
                {...(buildingTipData ? tipHandlers(buildingTipData) : {})}
              >
                <BuildingIllustration id={b.id} isBuilt={isBuilt} />
                {isBuilt ? (
                  <>
                    {SMOKE_BUILDINGS.has(b.id) && <BuildingSmoke />}
                    <div
                      className="absolute bottom-full left-0 right-0 text-center font-bold text-white truncate py-0.5 px-1"
                      style={{
                        background: "rgba(0,0,0,.55)",
                        fontSize: "clamp(7px,0.8vw,10px)",
                        textShadow: "0 1px 2px rgba(0,0,0,.8)",
                        marginBottom: 2,
                        borderRadius: "4px 4px 0 0",
                      }}
                    >
                      {b.name}
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="absolute inset-0 rounded-sm grid place-items-center font-bold text-[14px]"
                      style={{
                        background: "rgba(0,0,0,.28)",
                        border: `2px dashed ${isLocked ? "#888" : canAfford ? "#9bdb6a" : "rgba(255,255,255,.35)"}`,
                        color: isLocked ? "#888" : canAfford ? "#9bdb6a" : "rgba(255,255,255,.5)",
                      }}
                    >
                      {isLocked ? `🔒` : "+"}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {entryBiome && (
        <BiomeEntryModal
          biomeKey={entryBiome}
          level={state.level}
          onEnter={() => {
            dispatch({ type: "SWITCH_BIOME", key: entryBiome });
            dispatch({ type: "SET_VIEW", view: "board" });
            setEntryBiome(null);
          }}
          onClose={() => setEntryBiome(null)}
        />
      )}

      {buildingTip && (
        <Tooltip
          anchorX={buildingTip.x}
          anchorY={buildingTip.y}
          className="z-[9999] pointer-events-none px-3 py-2 rounded-lg border border-white/20"
          style={{
            background: "rgba(10,10,14,.92)",
            maxWidth: 240,
            minWidth: 150,
          }}
          arrowClassName="border-4 border-transparent border-t-[rgba(10,10,14,0.92)]"
        >
          <div className="font-bold" style={{ color: buildingTip.data.color, fontSize: "clamp(9px,1.1vw,13px)", whiteSpace: "nowrap" }}>{buildingTip.data.label}</div>
          {buildingTip.data.desc && <div className="mt-0.5 leading-snug text-white/75" style={{ fontSize: "clamp(8px,0.9vw,11px)", whiteSpace: "normal" }}>{buildingTip.data.desc}</div>}
        </Tooltip>
      )}

      {purchaseBuilding && (
        <div
          className="absolute inset-0 z-[10000] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,.6)" }}
          onClick={() => setPurchaseBuilding(null)}
        >
          <div
            className="rounded-xl border border-white/20 p-5 flex flex-col gap-3"
            style={{ background: "rgba(15,14,20,.96)", minWidth: 260, maxWidth: 340, boxShadow: "0 8px 40px rgba(0,0,0,.7)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-white font-bold" style={{ fontSize: "clamp(13px,1.5vw,18px)" }}>{purchaseBuilding.name}</div>
            {purchaseBuilding.desc && (
              <div className="text-white/70 leading-snug" style={{ fontSize: "clamp(10px,1.1vw,13px)" }}>{purchaseBuilding.desc}</div>
            )}
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.entries(purchaseBuilding.cost).map(([k, v]) => (
                <span
                  key={k}
                  className="rounded px-2 py-0.5 font-semibold"
                  style={{ background: "rgba(255,255,255,.08)", color: "#9bdb6a", fontSize: "clamp(10px,1.1vw,13px)" }}
                >
                  {k === "coins" ? `${v} ◉` : `${v} ${k}`}
                </span>
              ))}
            </div>
            <div className="flex gap-2 mt-1">
              <button
                className="flex-1 rounded-lg py-2 font-bold"
                style={{ background: "#9bdb6a", color: "#1a2a10", fontSize: "clamp(11px,1.2vw,14px)" }}
                onClick={() => {
                  dispatch({ type: "BUILD", building: purchaseBuilding });
                  setPurchaseBuilding(null);
                }}
              >
                Buy
              </button>
              <button
                className="flex-1 rounded-lg py-2 font-bold"
                style={{ background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.7)", fontSize: "clamp(11px,1.2vw,14px)" }}
                onClick={() => setPurchaseBuilding(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TownWalker({ color, duration, delay, dir, hair = "short", accessory = "none", size = 1 }) {
  const animation = dir > 0 ? "townWalkR" : "townWalkL";
  const facingLeft = dir < 0;

  const hairByType = {
    short: <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-1.5 rounded-t-full" style={{ background: "#5a3a2a" }} />,
    bun: <><div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-1.5 rounded-t-full" style={{ background: "#4a2f22" }} /><div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ background: "#4a2f22" }} /></>,
    ponytail: <><div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-1.5 rounded-t-full" style={{ background: "#3e2a1f" }} /><div className={`absolute top-1 ${facingLeft ? "-left-0.5" : "-right-0.5"} w-1 h-2 rounded-full`} style={{ background: "#3e2a1f" }} /></>,
    cap: <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-1.5 rounded-full" style={{ background: "#7a8a94", border: "1px solid rgba(0,0,0,.22)" }} />,
    puffs: <><div className="absolute -top-0.25 left-0 w-1.25 h-1.25 rounded-full" style={{ background: "#4a2a1a" }} /><div className="absolute -top-0.25 right-0 w-1.25 h-1.25 rounded-full" style={{ background: "#4a2a1a" }} /><div className="absolute -top-0.2 left-1/2 -translate-x-1/2 w-2 h-1.2 rounded-t-full" style={{ background: "#4a2a1a" }} /></>,
    braids: <><div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-1.5 rounded-t-full" style={{ background: "#5a4028" }} /><div className="absolute top-1 -left-0.25 w-0.75 h-2 rounded-full" style={{ background: "#5a4028" }} /><div className="absolute top-1 -right-0.25 w-0.75 h-2 rounded-full" style={{ background: "#5a4028" }} /></>,
    spiky: <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[8px] leading-none" style={{ color: "#3f2b1d" }}>▲▲</div>,
  };

  const accessoryByType = {
    basket: <div className={`absolute top-[11px] ${facingLeft ? "-right-2.5" : "-left-2.5"} w-2.5 h-1.5 rounded-sm`} style={{ background: "#b98746", border: "1px solid rgba(0,0,0,.25)" }} />,
    book: <div className={`absolute top-[10px] ${facingLeft ? "-left-2" : "-right-2"} w-1.75 h-2 rounded-sm`} style={{ background: "#8a4f4f", border: "1px solid rgba(0,0,0,.25)" }} />,
    flower: <div className={`absolute top-[6px] ${facingLeft ? "-left-1.5" : "-right-1.5"} w-1.5 h-1.5 rounded-full`} style={{ background: "#ff8fb0", boxShadow: "0 0 0 1px rgba(0,0,0,.2)" }} />,
    satchel: <div className={`absolute top-[9px] ${facingLeft ? "-left-2.25" : "-right-2.25"} w-2 h-2.5 rounded-sm`} style={{ background: "#7a5a3a", border: "1px solid rgba(0,0,0,.25)" }} />,
    balloon: <><div className={`absolute -top-6 ${facingLeft ? "left-3" : "right-3"} w-2.5 h-3 rounded-full`} style={{ background: "#f07ea8", border: "1px solid rgba(0,0,0,.2)" }} /><div className={`absolute -top-3 ${facingLeft ? "left-4" : "right-4"} w-px h-4 bg-[#c8c8c8]`} /></>,
    lantern: <div className={`absolute top-[9px] ${facingLeft ? "-right-2.5" : "-left-2.5"} w-2 h-2.5 rounded-sm`} style={{ background: "#f0bc58", boxShadow: "0 0 8px rgba(255,210,120,.55)", border: "1px solid rgba(0,0,0,.25)" }} />,
    kite: <><div className={`absolute -top-5 ${facingLeft ? "left-4" : "right-4"} w-2.5 h-2.5 rotate-45`} style={{ background: "#7ed4ff", border: "1px solid rgba(0,0,0,.2)" }} /><div className={`absolute -top-3 ${facingLeft ? "left-5" : "right-5"} w-px h-4 bg-[#d4d4d4]`} /></>,
    none: null,
  };

  return (
    <div
      className="absolute"
      style={{
        bottom: 0,
        left: dir > 0 ? "-6%" : undefined,
        right: dir < 0 ? "-6%" : undefined,
        animation: `${animation} ${duration}s linear infinite`,
        animationDelay: `-${delay}s`,
        transform: `scale(${size})`,
        transformOrigin: "bottom center",
      }}
    >
      <div className="relative" style={{ animation: "townBob 0.55s ease-in-out infinite alternate" }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full" style={{ background: "#f5d6b0", border: "1px solid rgba(0,0,0,.25)" }} />
        {hairByType[hair] || hairByType.short}
        <div className="w-3.5 h-4 rounded-sm mt-[11px]" style={{ background: color, border: "1px solid rgba(0,0,0,.3)" }} />
        {accessoryByType[accessory] || null}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full bg-black/25" />
      </div>
    </div>
  );
}

function BuildingSmoke() {
  return (
    <div className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none" style={{ width: 18, height: 36 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{
            bottom: 0,
            width: 8 + i * 2,
            height: 8 + i * 2,
            background: "rgba(240,235,220,.6)",
            animation: "townSmoke 3.4s ease-out infinite",
            animationDelay: `${i * 1.1}s`,
          }}
        />
      ))}
    </div>
  );
}
