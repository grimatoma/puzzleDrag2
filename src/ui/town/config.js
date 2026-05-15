export const TOWN_THEMES = {
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
  cave: {
    bg: "linear-gradient(180deg, #2e2a3a 0%, #4a3e2c 55%, #1a1a1e 100%)",
    hill1: "#1e1a22", hill2: "#120e16", road: "#5a4a32", roadLine: "#7a6850",
    sunColor: "#d4a830", sunGlow: "rgba(212,168,48,.5)",
    textColor: "#e0c878",
  },
  forge: {
    bg: "linear-gradient(180deg, #180808 0%, #380e08 55%, #0c0804 100%)",
    hill1: "#200808", hill2: "#100402", road: "#3a1208", roadLine: "#7a2808",
    sunColor: "#ff4010", sunGlow: "rgba(255,64,16,.7)",
    textColor: "#ff8050",
  },
};

export const SMOKE_BUILDINGS = new Set(["hearth", "bakery", "forge", "kitchen", "smokehouse"]);

// Per-biome visual config: ordered plot positions and terrain paths.
// `plots` are indexed slots a player can build into. Plot order within each
// array determines z-stacking (later = on top). Zones declare a `plotCount`
// in cartography/data.js to cap how many of these positions are exposed.
export const TOWN_BIOME_CONFIGS = {
  farm: {
    name: "Hearthwood Vale",
    plots: [
      { x: 60,  y: 372, w: 88,  h: 90  },
      { x: 170, y: 352, w: 84,  h: 106 },
      { x: 295, y: 366, w: 98,  h: 96  },
      { x: 442, y: 340, w: 118, h: 124 },
      { x: 618, y: 356, w: 88,  h: 106 },
      { x: 740, y: 380, w: 72,  h: 82  },
      { x: 848, y: 366, w: 98,  h: 96  },
      { x: 966, y: 370, w: 104, h: 86  },
      { x: 430, y: 262, w: 80,  h: 92  },
      { x: 520, y: 262, w: 80,  h: 92  },
      { x: 610, y: 262, w: 80,  h: 92  },
      { x: 700, y: 262, w: 80,  h: 92  },
    ],
    hill1Path: "M0,305 C120,278 260,248 420,262 C580,276 700,252 860,258 C960,262 1040,252 1100,248 L1100,600 L0,600 Z",
    hill2Path: "M0,368 C140,352 310,342 520,358 C720,373 900,358 1100,352 L1100,600 L0,600 Z",
    roadPath:  "M-20,506 C160,490 380,498 580,510 C780,522 940,512 1120,502",
    cloudOpacity: "bg-white/70",
  },
  mine: {
    name: "Ironridge Camp",
    plots: [
      { x: 52,  y: 388, w: 82,  h: 86  },
      { x: 158, y: 378, w: 82,  h: 96  },
      { x: 262, y: 382, w: 78,  h: 84  },
      { x: 360, y: 372, w: 92,  h: 96  },
      { x: 480, y: 322, w: 120, h: 144 },
      { x: 638, y: 354, w: 112, h: 122 },
      { x: 784, y: 382, w: 74,  h: 82  },
      { x: 888, y: 368, w: 104, h: 88  },
      { x: 430, y: 262, w: 80,  h: 92  },
      { x: 520, y: 262, w: 80,  h: 92  },
      { x: 610, y: 262, w: 80,  h: 92  },
      { x: 700, y: 262, w: 80,  h: 92  },
    ],
    hill1Path: "M0,288 L78,252 L142,274 L218,218 L308,258 L418,196 L518,240 L638,206 L738,234 L838,196 L938,224 L1018,210 L1100,216 L1100,600 L0,600 Z",
    hill2Path: "M0,366 C60,348 142,372 228,356 C320,342 420,368 530,358 C652,348 780,370 900,356 C980,346 1052,362 1100,356 L1100,600 L0,600 Z",
    roadPath:  "M-20,498 C80,484 220,490 400,498 C580,506 760,500 920,494 C1000,490 1062,492 1120,490",
    cloudOpacity: "bg-white/40",
  },
};

// Per-location visual overrides keyed by MAP_NODES id.
// `biomeVariant` controls which building layout + terrain decorations to use.
// `themeKey` picks the colour scheme from TOWN_THEMES.
export const LOCATION_TOWN_CONFIGS = {
  home: {
    themeKey: 'home', biomeVariant: 'farm',
    hill1Path: "M0,318 C100,292 230,275 400,282 C570,289 720,268 900,274 C980,270 1050,266 1100,262 L1100,600 L0,600 Z",
    hill2Path: "M0,380 C130,364 290,355 490,370 C690,385 870,368 1100,362 L1100,600 L0,600 Z",
    roadPath:  "M-20,510 C180,496 360,502 560,514 C760,526 940,516 1120,508",
    cloudOpacity: "bg-white/65",
  },
  meadow: {
    themeKey: 'farm', biomeVariant: 'farm',
    hill1Path: "M0,295 C130,278 290,265 460,271 C630,277 800,260 970,258 C1040,256 1080,254 1100,253 L1100,600 L0,600 Z",
    hill2Path: "M0,358 C155,348 325,342 535,355 C745,368 915,354 1100,348 L1100,600 L0,600 Z",
    roadPath:  "M-20,504 C185,490 380,496 570,508 C760,520 930,512 1120,506",
    cloudOpacity: "bg-white/70",
  },
  orchard: {
    themeKey: 'farm', biomeVariant: 'farm',
    hill1Path: "M0,326 C82,300 196,282 365,290 C534,298 704,272 882,276 C975,272 1050,268 1100,264 L1100,600 L0,600 Z",
    hill2Path: "M0,388 C106,370 264,358 455,372 C646,386 845,372 1100,364 L1100,600 L0,600 Z",
    roadPath:  "M-20,514 C148,500 342,506 554,518 C766,530 952,522 1120,514",
    cloudOpacity: "bg-white/55",
  },
  quarry: {
    themeKey: 'mine', biomeVariant: 'mine',
    hill1Path: "M0,292 L68,270 L134,285 L205,249 L294,274 L385,212 L485,254 L622,220 L724,250 L826,206 L924,230 L1002,218 L1100,222 L1100,600 L0,600 Z",
    hill2Path: "M0,372 C55,356 135,376 218,358 C308,342 410,370 522,360 C642,350 772,374 892,360 C974,350 1045,366 1100,360 L1100,600 L0,600 Z",
    roadPath:  "M-20,496 C78,482 212,488 394,498 C576,508 754,500 914,494 C998,490 1064,492 1120,490",
    cloudOpacity: "bg-white/30",
  },
  caves: {
    themeKey: 'cave', biomeVariant: 'mine',
    hill1Path: "M0,276 L58,238 L124,266 L208,196 L318,244 L428,172 L538,228 L660,186 L770,220 L872,178 L962,202 L1022,190 L1100,186 L1100,600 L0,600 Z",
    hill2Path: "M0,356 C46,340 122,366 206,348 C294,330 406,360 520,346 C642,334 770,362 890,348 C968,338 1052,356 1100,350 L1100,600 L0,600 Z",
    roadPath:  "M-20,492 C68,478 208,484 390,494 C572,504 750,496 910,490 C996,486 1064,488 1120,486",
    cloudOpacity: "bg-white/20",
  },
  forge: {
    themeKey: 'forge', biomeVariant: 'mine',
    hill1Path: "M0,272 L50,228 L106,256 L186,180 L278,234 L390,150 L498,216 L628,170 L748,208 L860,156 L964,192 L1040,174 L1100,168 L1100,600 L0,600 Z",
    hill2Path: "M0,350 C42,332 118,360 198,340 C286,320 400,354 514,338 C634,324 762,356 880,340 C962,328 1048,350 1100,342 L1100,600 L0,600 Z",
    roadPath:  "M-20,490 C70,474 208,480 392,492 C576,504 754,494 914,488 C1000,484 1066,486 1120,484",
    cloudOpacity: "bg-white/15",
  },
};
