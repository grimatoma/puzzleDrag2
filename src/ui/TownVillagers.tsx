// ─── TownVillagers ──────────────────────────────────────────────────────────
// Townsfolk that actually live in the town: they walk the street graph from the
// procedural town plan (`plan.waypoints` / `plan.edges`), wandering the plaza
// and the lanes and pausing now and then.
//
// Each villager renders as a small full-body CSS sprite (head + torso + arms +
// legs + optional hair / hat / beard / prop) — variants are picked
// deterministically from a per-villager seed so the same village re-mounts
// stable.
//
// Three populations share the renderer:
//   1. Named NPCs (Mira, Bram, Wren, Tomas, Liss) — locked to a recognizable
//      silhouette that mirrors their canvas portrait. Gated on their
//      associated building being built; Hearth is built from session start
//      so Wren is always present, the rest phase in as the player builds.
//   2. Hired workers (farmer/lumberjack/miner/baker) — up to 3 per type walk
//      the streets when the player has hired that type. Use a profession
//      preset (straw hat / knit cap / helmet / toque + matching body palette)
//      with per-individual variation on skin / hair / facial-hair.
//   3. Generic townsfolk — fully randomised variant pool. Count shrinks if
//      workers + NPCs already fill the town's figure budget.
//
// Driven by a single requestAnimationFrame loop with CSS-transform updates,
// so the cost is one composite per villager per frame (cheap; runs at 60fps
// on the desktop & mobile QA matrix).

import { memo, useEffect, useMemo, useRef } from "react";

interface TownPlan {
  waypoints?: Array<{ x: number; y: number }>;
  edges?: Array<[number, number]>;
  lots?: Array<{ index: number; cx: number; cy: number; w: number; h: number }>;
}

interface VariantRaw {
  skinIdx: number;
  hairColorIdx: number;
  hairStyle: string;
  hat: string | null;
  beard: string | null;
  bodyColor: string;
  legColor: string;
  prop: string | null;
}

interface NpcEntry {
  id: string;
  building: string;
  variant: VariantRaw;
}

interface ResolvedVariant {
  skin: string;
  hairColor: string;
  hairStyle: string;
  hat: string | null;
  beard: string | null;
  bodyColor: string;
  legColor: string;
  prop: string | null;
  bodyShape: string;
  isAdult: boolean;
  workerType?: string;
}

interface VillagerData {
  id: string;
  npcId: string | null;
  seed: number;
  from: number;
  to: number;
  t: number;
  x: number;
  y: number;
  speed: number;
  facing: number;
  pauseUntil: number;
  bob: number;
  variant: ResolvedVariant;
  isNamed: boolean;
}

interface VillagerRefs {
  wrap: HTMLDivElement | null;
  torso: HTMLDivElement | null;
  head: HTMLDivElement | null;
  legL: HTMLDivElement | null;
  legR: HTMLDivElement | null;
  armL: HTMLDivElement | null;
  armR: HTMLDivElement | null;
}

const W = 1100, H = 600;
const TOTAL_FIGURE_BUDGET = 14; // soft cap on simultaneous walking figures
const WORKER_CAP_PER_TYPE = 3;

// ── Variant palettes ─────────────────────────────────────────────────────────

const SKIN_TONES = ["#f6d5b8", "#e8b078", "#d49060", "#a06848"];
const HAIR_COLORS = ["#2a1808", "#5a3814", "#a86838", "#d4a838", "#dcdcdc"];
const PANT_COLORS = ["#3a2818", "#5a4830", "#3a3a48", "#3a4828", "#6a3030", "#4a3a2a"];
const GENERIC_BODY_COLORS = ["#7a8aa0", "#9a7a5a", "#6a9a6a", "#a06a8a", "#8a8a5a", "#6a8aa0", "#9a8a6a"];

// Hair styles affect the silhouette of the back-of-head div behind the face.
// Each value is a {topRadius, bottomRadius, heightFactor, widthFactor} tuple
// keyed by name so the render block can switch by lookup.
interface HairShape {
  topRadius: number;
  bottomRadius: number;
  hFactor: number;
  wFactor: number;
}

const HAIR_STYLE_SHAPES: Record<string, HairShape> = {
  short:     { topRadius: 0.32, bottomRadius: 0.06, hFactor: 0.30, wFactor: 0.62 },
  long:      { topRadius: 0.30, bottomRadius: 0.18, hFactor: 0.48, wFactor: 0.66 },
  ponytail:  { topRadius: 0.32, bottomRadius: 0.10, hFactor: 0.34, wFactor: 0.60 },
  bun:       { topRadius: 0.40, bottomRadius: 0.08, hFactor: 0.36, wFactor: 0.66 }, // taller crown
  bald:      { topRadius: 0, bottomRadius: 0, hFactor: 0, wFactor: 0 }, // no hair div
};

// Hats are absolute-positioned layers above the head. `palette` is rendered
// as `bg` / `bgAccent`; `style` selects a render branch in the JSX.
interface HatStyle {
  palette: [string, string];
  brim: number;
  height: number;
  puffy?: boolean;
  cuff?: boolean;
  hood?: boolean;
  tied?: boolean;
  lantern?: boolean;
}

const HAT_STYLES: Record<string, HatStyle> = {
  straw:        { palette: ["#e8c068", "#7a5408"], brim: 1.2,  height: 0.30 },
  toque:        { palette: ["#fff8e8", "#bfa68a"], brim: 0,    height: 0.55, puffy: true },
  knit:         { palette: ["#5a4030", "#1a0e04"], brim: 0,    height: 0.36, cuff: true },
  "hood-green": { palette: ["#4f6b3a", "#22341a"], brim: 0,    height: 0.50, hood: true },
  "hood-pink":  { palette: ["#a86090", "#5a2e4a"], brim: 0,    height: 0.50, hood: true },
  kerchief:     { palette: ["#c83838", "#7a1a1a"], brim: 0,    height: 0.22, tied: true },
  helmet:       { palette: ["#7a4a18", "#3a1808"], brim: 1.05, height: 0.34, lantern: true },
};

interface BeardStyle {
  color: string | null;
  h: number;
  w: number;
  density: number;
}

const BEARD_STYLES: Record<string, BeardStyle> = {
  scruff:     { color: null /* derived from hair */, h: 0.18, w: 0.50, density: 0.45 },
  full:       { color: null, h: 0.34, w: 0.66, density: 1.0 },
  "full-white": { color: "#e8e8e8", h: 0.34, w: 0.66, density: 1.0 },
  chinstrap:  { color: null, h: 0.20, w: 0.62, density: 0.7 },
};

interface PropStyle {
  kind: string | null;
  color?: string;
  blade?: string;
}

const PROP_STYLES: Record<string, PropStyle> = {
  scythe:  { kind: "diagonal-haft-blade", color: "#7a4818", blade: "#c8cdd4" },
  axe:     { kind: "diagonal-haft-wedge", color: "#5a3818", blade: "#8a929a" },
  pickaxe: { kind: "diagonal-haft-pick",  color: "#5a3818", blade: "#5a6470" },
  hammer:  { kind: "shoulder-hammer",     color: "#5a3818", blade: "#5a6470" },
  bow:     { kind: "back-bow",            color: "#7a5028", blade: "#3a2818" },
  basket:  { kind: "side-basket",         color: "#a87838", blade: "#6a4818" },
  apron:   { kind: null }, // already baked into body color
  stick:   { kind: "side-cane",           color: "#7a5028", blade: "#3a2818" },
};

// ── Named NPCs ───────────────────────────────────────────────────────────────

// Each NPC has a locked variant (matches their canvas portrait silhouette) and
// a `building` they keep house near. The walking figure only spawns once that
// building is built; if the building is missing the NPC simply isn't in town.
const NPC_VILLAGERS: NpcEntry[] = [
  {
    id: "wren",
    building: "hearth",
    variant: { skinIdx: 0, hairColorIdx: 2, hairStyle: "long", hat: "hood-green", beard: null,
               bodyColor: "#4f6b3a", legColor: "#5a4830", prop: "bow" },
  },
  {
    id: "mira",
    building: "bakery",
    variant: { skinIdx: 0, hairColorIdx: 1, hairStyle: "bun", hat: null, beard: null,
               bodyColor: "#d6612a", legColor: "#5a3a18", prop: "apron" },
  },
  {
    id: "tomas",
    building: "inn",
    variant: { skinIdx: 2, hairColorIdx: 4, hairStyle: "short", hat: "straw", beard: "full-white",
               bodyColor: "#c8923a", legColor: "#5a4830", prop: "stick" },
  },
  {
    id: "bram",
    building: "forge",
    variant: { skinIdx: 1, hairColorIdx: 0, hairStyle: "short", hat: null, beard: "full",
               bodyColor: "#5a6973", legColor: "#3a2818", prop: "hammer" },
  },
  {
    id: "liss",
    building: "larder",
    variant: { skinIdx: 0, hairColorIdx: 0, hairStyle: "short", hat: "hood-pink", beard: null,
               bodyColor: "#8d3a5c", legColor: "#5a3a48", prop: null },
  },
];

// ── Worker presets (profession lockdowns for hired workers in town) ─────────

interface WorkerVariant {
  hat: string | null;
  skinIdx: number;
  hairColorIdx: number;
  bodyColor: string;
  legColor: string;
  prop: string | null;
  forceBeard: string | null;
}

const WORKER_VARIANTS: Record<string, WorkerVariant> = {
  farmer:     { hat: "straw",  skinIdx: 2, hairColorIdx: 1, bodyColor: "#4f8c3a", legColor: "#5a4830", prop: "scythe", forceBeard: null },
  lumberjack: { hat: "knit",   skinIdx: 1, hairColorIdx: 0, bodyColor: "#a8341a", legColor: "#3a2818", prop: "axe",    forceBeard: "full" },
  miner:      { hat: "helmet", skinIdx: 1, hairColorIdx: 0, bodyColor: "#5a6470", legColor: "#3a2818", prop: "pickaxe", forceBeard: null },
  baker:      { hat: "toque",  skinIdx: 0, hairColorIdx: 3, bodyColor: "#f4e0c0", legColor: "#5a4830", prop: null,     forceBeard: null },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const d2 = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

// Deterministic 4-channel "random" from a single integer seed (mulberry32-ish
// but cheaper — we only need ~4 picks per villager).
function hashSeed(seed: number) {
  let x = (seed * 2654435761) >>> 0;
  const next = () => {
    x = (x ^ (x << 13)) >>> 0;
    x = (x ^ (x >>> 17)) >>> 0;
    x = (x ^ (x << 5)) >>> 0;
    return (x >>> 0) / 4294967295;
  };
  return { a: next(), b: next(), c: next(), d: next(), e: next() };
}

interface PickVariantOpts {
  namedNpc?: NpcEntry;
  workerType?: string;
  genericColorIdx?: number;
}

function pickVariant(seed: number, opts?: PickVariantOpts): ResolvedVariant {
  const { namedNpc, workerType, genericColorIdx } = opts || {};

  // Named NPC — locked silhouette
  if (namedNpc) {
    const v = namedNpc.variant;
    return {
      skin: SKIN_TONES[v.skinIdx],
      hairColor: HAIR_COLORS[v.hairColorIdx],
      hairStyle: v.hairStyle,
      hat: v.hat,
      beard: v.beard,
      bodyColor: v.bodyColor,
      legColor: v.legColor,
      prop: v.prop,
      bodyShape: "average",
      isAdult: true,
    };
  }

  const h = hashSeed(seed);

  // Hired worker — profession preset with mild individual variation
  if (workerType && WORKER_VARIANTS[workerType]) {
    const w = WORKER_VARIANTS[workerType];
    // Vary skin slightly (±1 index from preset) and hair colour fully.
    const skinShift = Math.floor(h.a * 3) - 1; // -1, 0, +1
    const skinIdx = Math.min(SKIN_TONES.length - 1, Math.max(0, w.skinIdx + skinShift));
    const hairColor = HAIR_COLORS[Math.floor(h.b * HAIR_COLORS.length)];
    // Hair style can vary BUT not under a toque (clean baker silhouette)
    const hairStyle = (w.hat === "toque" || w.hat === "helmet") ? "short"
                    : ["short", "long", "ponytail"][Math.floor(h.c * 3)];
    return {
      skin: SKIN_TONES[skinIdx],
      hairColor,
      hairStyle,
      hat: w.hat,
      beard: w.forceBeard ?? (h.d < 0.25 ? "scruff" : null),
      bodyColor: w.bodyColor,
      legColor: w.legColor,
      prop: w.prop,
      bodyShape: h.e < 0.33 ? "slim" : h.e < 0.66 ? "average" : "stocky",
      isAdult: true,
      workerType,
    };
  }

  // Generic villager — fully randomised
  const skin = SKIN_TONES[Math.floor(h.a * SKIN_TONES.length)];
  const hairColor = HAIR_COLORS[Math.floor(h.b * HAIR_COLORS.length)];
  const hairStyles = ["short", "long", "ponytail", "bun", "bald"];
  const hairStyle = hairStyles[Math.floor(h.c * hairStyles.length)];
  // Hat: ~40% chance, weighted toward common civilian options
  const hatRoll = h.d;
  let hat = null;
  if (hatRoll < 0.40) {
    const options = ["straw", "knit", "kerchief", "kerchief", "straw"]; // doubled for weight
    hat = options[Math.floor((hatRoll / 0.40) * options.length)];
  }
  // Beard: ~22% chance, only for "adult" figures (we treat all generics as adults)
  const beard = h.e < 0.22 ? (h.e < 0.10 ? "full" : "scruff") : null;
  const bodyColor = GENERIC_BODY_COLORS[(genericColorIdx ?? 0) % GENERIC_BODY_COLORS.length];
  const legColor = PANT_COLORS[Math.floor(h.b * PANT_COLORS.length)];
  return {
    skin, hairColor, hairStyle, hat, beard,
    bodyColor, legColor,
    prop: null,
    bodyShape: h.a < 0.33 ? "slim" : h.a < 0.66 ? "average" : "stocky",
    isAdult: true,
  };
}

function makeGraph(plan: TownPlan | null | undefined) {
  const wps: Array<{ x: number; y: number }> = plan?.waypoints || [];
  const adj: number[][] = wps.map(() => []);
  for (const [i, j] of plan?.edges || []) { adj[i].push(j); adj[j].push(i); }
  return { wps, adj };
}

// Walk the active population set, applying caps and budgets:
//   1. Named NPCs whose building is built (Wren always; Mira+Tomas+Bram+Liss
//      phase in as the player builds).
//   2. Up to WORKER_CAP_PER_TYPE workers per hired type.
//   3. Generic background villagers, filling the remaining figure budget so
//      total stays around TOTAL_FIGURE_BUDGET.
interface BuildPopulationArgs {
  wps: Array<{ x: number; y: number }>;
  adj: number[][];
  buildings: Record<string, number | null | undefined> | null | undefined;
  hiredWorkers: Record<string, number>;
}

function buildPopulation({ wps, adj, buildings, hiredWorkers }: BuildPopulationArgs): VillagerData[] {
  if (!wps.length) return [];
  const out: VillagerData[] = [];
  const rng = Math.random;

  // Walk position seeder — picks two adjacent waypoints + a random t.
  const seat = (seed: number) => {
    const a = seed % wps.length;
    const adjList = adj[a] || [];
    const b = adjList.length ? adjList[Math.floor(rng() * adjList.length)] : a;
    return { from: a, to: b, t: rng(), x: wps[a].x, y: wps[a].y };
  };

  // Named NPCs — only those whose building is built.
  for (const npc of NPC_VILLAGERS) {
    if (!buildings || buildings[npc.building] == null) continue;
    const seed = npc.id.charCodeAt(0) * 31 + npc.id.length;
    const variant = pickVariant(seed, { namedNpc: npc });
    out.push({
      id: `npc-${npc.id}`,
      npcId: npc.id,
      seed,
      ...seat(seed),
      speed: 22 + rng() * 18,
      facing: 1, pauseUntil: 0, bob: rng() * Math.PI * 2,
      variant,
      isNamed: true,
    });
  }

  // Hired workers — cap per type, distributed across the budget.
  const hired = hiredWorkers || {};
  let workerSlot = 0;
  for (const type of ["farmer", "lumberjack", "miner", "baker"]) {
    const count = Math.min(WORKER_CAP_PER_TYPE, Math.max(0, Math.floor(hired[type] || 0)));
    for (let i = 0; i < count; i++) {
      if (out.length >= TOTAL_FIGURE_BUDGET) break;
      const seed = 1000 + workerSlot * 17 + i * 5;
      const variant = pickVariant(seed, { workerType: type });
      out.push({
        id: `worker-${type}-${i}`,
        npcId: null,
        seed,
        ...seat(seed),
        speed: 26 + rng() * 22,
        facing: 1, pauseUntil: 0, bob: rng() * Math.PI * 2,
        variant,
        isNamed: false,
      });
      workerSlot++;
    }
  }

  // Generics fill the remaining budget. Minimum 3 (so the town never looks
  // empty) but cap by figure budget.
  const remaining = Math.max(3, Math.min(7, TOTAL_FIGURE_BUDGET - out.length));
  for (let g = 0; g < remaining; g++) {
    if (out.length >= TOTAL_FIGURE_BUDGET) break;
    const seed = 5000 + g * 13;
    const variant = pickVariant(seed, { genericColorIdx: g });
    out.push({
      id: `generic-${g}`,
      npcId: null,
      seed,
      ...seat(seed),
      speed: 26 + rng() * 22,
      facing: 1, pauseUntil: 0, bob: rng() * Math.PI * 2,
      variant,
      isNamed: false,
    });
  }

  return out;
}

// ── Renderable villager sprite ───────────────────────────────────────────────

// Layout constants for a height-1 figure. Multiplied by the per-villager
// pixel `size` in the render block. The figure occupies vertical space
// [0..1] from the bottom up.
const LAYOUT = {
  headY:    0.78,  // centre of head
  headR:    0.18,  // head radius
  torsoY:   0.48,  // centre of torso
  torsoW:   0.40,  // torso width (modified by bodyShape)
  torsoH:   0.30,  // torso height
  legY:     0.16,  // centre of legs (each leg)
  legW:     0.13,  // leg width
  legH:     0.30,  // leg height
  armOffX:  0.24,  // arm horizontal offset from centre
  armW:     0.10,  // arm width
  armH:     0.28,  // arm height (rendered as forearm only)
};

// The sprite is a pure render — every sub-element exposes itself to the
// parent via a `registerEl(id, key, element)` callback so the animation loop
// can update transforms by villager id without any cross-component refs.
interface VillagerSpriteProps {
  villager: VillagerData;
  size: number;
  registerEl: (id: string, key: keyof VillagerRefs, el: HTMLDivElement | null) => void;
}

const VillagerSprite = memo(function VillagerSprite({ villager, size, registerEl }: VillagerSpriteProps) {
  const v = villager.variant;
  const widthMod = v.bodyShape === "slim" ? 0.85 : v.bodyShape === "stocky" ? 1.15 : 1.0;
  const torsoW = LAYOUT.torsoW * widthMod;
  const figureH = size * 1.6;

  // Each sub-element ref callback just forwards the DOM node to the parent
  // map. Mounted -> registered. Unmounted (el === null) -> cleared.
  const wrapCb  = (el: HTMLDivElement | null) => registerEl(villager.id, "wrap",  el);
  const torsoCb = (el: HTMLDivElement | null) => registerEl(villager.id, "torso", el);
  const headCb  = (el: HTMLDivElement | null) => registerEl(villager.id, "head",  el);
  const legLCb  = (el: HTMLDivElement | null) => registerEl(villager.id, "legL",  el);
  const legRCb  = (el: HTMLDivElement | null) => registerEl(villager.id, "legR",  el);
  const armLCb  = (el: HTMLDivElement | null) => registerEl(villager.id, "armL",  el);
  const armRCb  = (el: HTMLDivElement | null) => registerEl(villager.id, "armR",  el);

  // Style helpers — every absolute position is bottom-anchored so the
  // figure's feet sit on the y coordinate the wrapper transform supplies.
  const abs = (bottom: number, width: number, height: number, color: string, extra: Record<string, any> = {}) => ({
    position: "absolute" as const,
    left: "50%",
    bottom: figureH * bottom,
    transform: "translateX(-50%)",
    width: size * width,
    height: size * height,
    background: color,
    ...extra,
  });

  // Head + hair: hair is drawn behind the head with the chosen shape.
  const hairShape = HAIR_STYLE_SHAPES[v.hairStyle] || HAIR_STYLE_SHAPES.short;
  const hairW = size * hairShape.wFactor;
  const hairH = size * hairShape.hFactor;

  // Ponytail addendum — a small tail behind the head.
  const showPonytail = v.hairStyle === "ponytail";
  // Bun addendum — small ball on top.
  const showBun = v.hairStyle === "bun";

  return (
    <div
      ref={wrapCb}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: size,
        height: figureH,
        transform: `translate3d(0, 0, 0) translate(-50%, -100%) scaleX(${villager.facing})`,
        transformOrigin: "bottom center",
        willChange: "transform",
      }}
    >
      {/* Drop shadow ellipse at the feet */}
      <div style={{
        position: "absolute", left: "50%", bottom: -1,
        transform: "translateX(-50%)",
        width: size * 0.72, height: size * 0.18,
        borderRadius: "50%",
        background: "rgba(0,0,0,0.22)",
      }} />

      {/* Legs — back leg first (lower z), then front. Each leg is its own
          animated div so the parent loop can offset them alternately. */}
      <div ref={legLCb} style={abs(LAYOUT.legY - LAYOUT.legH / 2 + 0.02, LAYOUT.legW, LAYOUT.legH, v.legColor, {
        borderRadius: `${size * 0.06}px ${size * 0.06}px ${size * 0.04}px ${size * 0.04}px`,
        left: `calc(50% - ${size * 0.08}px)`,
        bottom: figureH * 0.02,
        boxShadow: "inset -1px -1px 1.5px rgba(0,0,0,0.18)",
      })} />
      <div ref={legRCb} style={abs(LAYOUT.legY - LAYOUT.legH / 2 + 0.02, LAYOUT.legW, LAYOUT.legH, v.legColor, {
        borderRadius: `${size * 0.06}px ${size * 0.06}px ${size * 0.04}px ${size * 0.04}px`,
        left: `calc(50% + ${size * 0.08}px)`,
        transform: "translateX(-50%)",
        bottom: figureH * 0.02,
        boxShadow: "inset -1px -1px 1.5px rgba(0,0,0,0.18)",
      })} />

      {/* Arms — short forearms hanging from torso shoulder line.
          Visible skin tone at the wrist would be added later; for now the
          arm is one block in the body's sleeve colour with a small skin
          dot at the bottom for the hand. */}
      <div ref={armLCb} style={{
        position: "absolute",
        left: `calc(50% - ${size * LAYOUT.armOffX}px)`,
        bottom: figureH * (LAYOUT.torsoY - LAYOUT.torsoH / 2 - 0.02),
        transform: "translateX(-50%) rotate(0deg)",
        transformOrigin: "top center",
        width: size * LAYOUT.armW,
        height: size * LAYOUT.armH,
        background: v.bodyColor,
        borderRadius: `${size * 0.04}px ${size * 0.04}px ${size * 0.06}px ${size * 0.06}px`,
        boxShadow: "inset -1px -1px 1px rgba(0,0,0,0.18)",
      }}>
        <div style={{
          position: "absolute", left: "50%", bottom: 0,
          transform: "translateX(-50%)",
          width: size * 0.10, height: size * 0.08,
          background: v.skin, borderRadius: "50%",
        }} />
      </div>
      <div ref={armRCb} style={{
        position: "absolute",
        left: `calc(50% + ${size * LAYOUT.armOffX}px)`,
        bottom: figureH * (LAYOUT.torsoY - LAYOUT.torsoH / 2 - 0.02),
        transform: "translateX(-50%) rotate(0deg)",
        transformOrigin: "top center",
        width: size * LAYOUT.armW,
        height: size * LAYOUT.armH,
        background: v.bodyColor,
        borderRadius: `${size * 0.04}px ${size * 0.04}px ${size * 0.06}px ${size * 0.06}px`,
        boxShadow: "inset -1px -1px 1px rgba(0,0,0,0.18)",
      }}>
        <div style={{
          position: "absolute", left: "50%", bottom: 0,
          transform: "translateX(-50%)",
          width: size * 0.10, height: size * 0.08,
          background: v.skin, borderRadius: "50%",
        }} />
      </div>

      {/* Torso */}
      <div ref={torsoCb} style={{
        position: "absolute", left: "50%",
        bottom: figureH * (LAYOUT.torsoY - LAYOUT.torsoH / 2),
        transform: "translateX(-50%) rotate(0deg)",
        transformOrigin: "bottom center",
        width: size * torsoW,
        height: size * LAYOUT.torsoH,
        background: v.bodyColor,
        borderRadius: `${size * 0.10}px ${size * 0.10}px ${size * 0.06}px ${size * 0.06}px`,
        boxShadow: "inset -1.5px -1.5px 2px rgba(0,0,0,0.20)",
      }} />

      {/* Head */}
      <div ref={headCb} style={{
        position: "absolute", left: "50%",
        bottom: figureH * (LAYOUT.headY - LAYOUT.headR),
        transform: "translateX(-50%)",
        width: size * (LAYOUT.headR * 2),
        height: size * (LAYOUT.headR * 2),
        background: v.skin,
        borderRadius: "50%",
        boxShadow: "inset -1.5px -1.5px 2px rgba(0,0,0,0.20)",
      }}>
        {/* Eyes — tiny dark dots; Liss has closed eyes (horizontal dashes). */}
        {villager.npcId === "liss" ? (
          <>
            <div style={{ position: "absolute", left: "28%", top: "52%", width: "20%", height: "6%", background: "#3a2818", borderRadius: 1 }} />
            <div style={{ position: "absolute", right: "28%", top: "52%", width: "20%", height: "6%", background: "#3a2818", borderRadius: 1 }} />
          </>
        ) : (
          <>
            <div style={{ position: "absolute", left: "30%", top: "50%", width: "12%", height: "14%", background: "#1a1008", borderRadius: "50%" }} />
            <div style={{ position: "absolute", right: "30%", top: "50%", width: "12%", height: "14%", background: "#1a1008", borderRadius: "50%" }} />
          </>
        )}
      </div>

      {/* Hair (behind head) — only if non-bald */}
      {v.hairStyle !== "bald" && (
        <div style={{
          position: "absolute", left: "50%",
          bottom: figureH * (LAYOUT.headY - LAYOUT.headR + LAYOUT.headR * 0.7 - hairShape.hFactor * 0.4),
          transform: "translateX(-50%)",
          width: hairW,
          height: hairH,
          background: v.hairColor,
          borderRadius: `${size * hairShape.topRadius}px ${size * hairShape.topRadius}px ${size * hairShape.bottomRadius}px ${size * hairShape.bottomRadius}px`,
          zIndex: -1,
        }} />
      )}

      {/* Ponytail trailing tuft */}
      {showPonytail && (
        <div style={{
          position: "absolute", left: "50%",
          bottom: figureH * (LAYOUT.headY - LAYOUT.headR + 0.04),
          transform: "translateX(calc(-50% - 6px)) rotate(-12deg)",
          width: size * 0.18,
          height: size * 0.35,
          background: v.hairColor,
          borderRadius: `${size * 0.12}px ${size * 0.06}px ${size * 0.06}px ${size * 0.10}px`,
          zIndex: -1,
        }} />
      )}

      {/* Bun on top of head */}
      {showBun && (
        <div style={{
          position: "absolute", left: "50%",
          bottom: figureH * (LAYOUT.headY + LAYOUT.headR * 0.8),
          transform: "translateX(-50%)",
          width: size * 0.22, height: size * 0.18,
          background: v.hairColor, borderRadius: "50%",
          boxShadow: "inset -1px -1px 1.5px rgba(0,0,0,0.25)",
        }} />
      )}

      {/* Beard */}
      {v.beard && (() => {
        const b = BEARD_STYLES[v.beard];
        const color = b.color ?? v.hairColor;
        return (
          <div style={{
            position: "absolute", left: "50%",
            bottom: figureH * (LAYOUT.headY - LAYOUT.headR - 0.05),
            transform: "translateX(-50%)",
            width: size * (b.w * LAYOUT.headR * 2),
            height: size * (b.h * LAYOUT.headR * 2),
            background: color,
            opacity: b.density,
            borderRadius: `${size * 0.04}px ${size * 0.04}px ${size * 0.12}px ${size * 0.12}px`,
          }} />
        );
      })()}

      {/* Hat / hood */}
      {v.hat && (() => {
        const h = HAT_STYLES[v.hat];
        const [main, accent] = h.palette;
        const baseBottom = figureH * (LAYOUT.headY + LAYOUT.headR * 0.4);
        return (
          <>
            {/* Hood — drapes the whole head from above and behind */}
            {h.hood && (
              <div style={{
                position: "absolute", left: "50%",
                bottom: figureH * (LAYOUT.headY - LAYOUT.headR - 0.04),
                transform: "translateX(-50%)",
                width: size * 0.62, height: size * 0.56,
                background: main,
                borderRadius: `${size * 0.30}px ${size * 0.30}px ${size * 0.10}px ${size * 0.10}px`,
                boxShadow: "inset -1.5px -1.5px 2px rgba(0,0,0,0.30)",
                zIndex: -1,
              }} />
            )}
            {!h.hood && (
              <>
                {/* Brim */}
                {h.brim > 0 && (
                  <div style={{
                    position: "absolute", left: "50%",
                    bottom: baseBottom,
                    transform: "translateX(-50%)",
                    width: size * (0.50 * h.brim),
                    height: size * 0.06,
                    background: main, borderRadius: "50%",
                    boxShadow: `0 1px 0 ${accent}`,
                    zIndex: 1,
                  }} />
                )}
                {/* Crown */}
                <div style={{
                  position: "absolute", left: "50%",
                  bottom: baseBottom + (h.brim > 0 ? size * 0.03 : 0),
                  transform: "translateX(-50%)",
                  width: size * (h.puffy ? 0.36 : 0.34),
                  height: size * h.height,
                  background: main,
                  borderRadius: h.puffy ? "50% 50% 25% 25% / 60% 60% 30% 30%" : `${size * 0.08}px ${size * 0.08}px ${size * 0.04}px ${size * 0.04}px`,
                  boxShadow: "inset -1px -1px 1.5px rgba(0,0,0,0.25)",
                }} />
                {/* Knit cap cuff */}
                {h.cuff && (
                  <div style={{
                    position: "absolute", left: "50%",
                    bottom: baseBottom + size * 0.04,
                    transform: "translateX(-50%)",
                    width: size * 0.34,
                    height: size * 0.08,
                    background: accent,
                  }} />
                )}
                {/* Helmet lantern */}
                {h.lantern && (
                  <div style={{
                    position: "absolute", left: "50%",
                    bottom: baseBottom + size * 0.20,
                    transform: "translateX(-50%)",
                    width: size * 0.10,
                    height: size * 0.10,
                    background: "#ffd248",
                    borderRadius: 1,
                    boxShadow: "0 0 4px 1px rgba(255,200,80,0.6)",
                  }} />
                )}
                {/* Kerchief knot in back */}
                {h.tied && (
                  <div style={{
                    position: "absolute", left: "calc(50% + 6px)",
                    bottom: baseBottom + size * 0.05,
                    transform: "translateX(-50%) rotate(20deg)",
                    width: size * 0.10, height: size * 0.14,
                    background: main,
                    borderRadius: `${size * 0.04}px ${size * 0.06}px ${size * 0.02}px ${size * 0.04}px`,
                  }} />
                )}
              </>
            )}
          </>
        );
      })()}

      {/* Hand-held / shoulder prop */}
      {v.prop && (() => {
        const p = PROP_STYLES[v.prop];
        if (!p || !p.kind) return null;
        if (p.kind === "back-bow") {
          // Bow on back — vertical arc behind torso
          return (
            <div style={{
              position: "absolute",
              left: `calc(50% - ${size * 0.18}px)`,
              bottom: figureH * (LAYOUT.torsoY - LAYOUT.torsoH / 2 - 0.05),
              transform: "translateX(-50%)",
              width: size * 0.10, height: size * 0.62,
              border: `1.5px solid ${p.color}`,
              borderRadius: "50%",
              clipPath: "inset(0 50% 0 0)",
              zIndex: -1,
            }} />
          );
        }
        if (p.kind === "shoulder-hammer") {
          // Hammer over shoulder — handle diagonally up-right, head at top
          return (
            <>
              <div style={{
                position: "absolute",
                left: `calc(50% + ${size * 0.12}px)`,
                bottom: figureH * (LAYOUT.torsoY + 0.04),
                transform: "translateX(-50%) rotate(-30deg)",
                transformOrigin: "bottom center",
                width: size * 0.06, height: size * 0.60,
                background: p.color, borderRadius: size * 0.02,
                zIndex: -1,
              }} />
              <div style={{
                position: "absolute",
                left: `calc(50% + ${size * 0.30}px)`,
                bottom: figureH * (LAYOUT.headY + 0.08),
                transform: "translateX(-50%)",
                width: size * 0.20, height: size * 0.14,
                background: p.blade,
                borderRadius: size * 0.03,
                zIndex: -1,
              }} />
            </>
          );
        }
        if (p.kind === "diagonal-haft-blade" || p.kind === "diagonal-haft-wedge" || p.kind === "diagonal-haft-pick") {
          // Tool slung over shoulder — handle from waist up to far above head
          const angle = p.kind === "diagonal-haft-pick" ? -28 : -22;
          return (
            <>
              <div style={{
                position: "absolute",
                left: `calc(50% + ${size * 0.10}px)`,
                bottom: figureH * (LAYOUT.torsoY - 0.05),
                transform: `translateX(-50%) rotate(${angle}deg)`,
                transformOrigin: "bottom center",
                width: size * 0.05, height: size * 0.72,
                background: p.color, borderRadius: size * 0.02,
                zIndex: -1,
              }} />
              {/* Blade head */}
              <div style={{
                position: "absolute",
                left: `calc(50% + ${size * 0.30}px)`,
                bottom: figureH * (LAYOUT.headY + 0.18),
                transform: "translateX(-50%) rotate(35deg)",
                width: p.kind === "diagonal-haft-blade" ? size * 0.28 : size * 0.18,
                height: p.kind === "diagonal-haft-blade" ? size * 0.08 : size * 0.12,
                background: p.blade,
                borderRadius: p.kind === "diagonal-haft-blade" ? `50% 50% 4px 4px` : size * 0.02,
                zIndex: -1,
              }} />
            </>
          );
        }
        if (p.kind === "side-cane") {
          return (
            <div style={{
              position: "absolute",
              left: `calc(50% + ${size * 0.22}px)`,
              bottom: 0,
              transform: "translateX(-50%) rotate(-5deg)",
              transformOrigin: "bottom center",
              width: size * 0.05, height: size * 1.0,
              background: p.color, borderRadius: size * 0.02,
              zIndex: -1,
            }} />
          );
        }
        return null;
      })()}
    </div>
  );
});

// ── Main component ──────────────────────────────────────────────────────────

interface TownVillagersProps {
  plan: TownPlan | null | undefined;
  buildings: Record<string, number | null | undefined> | null | undefined;
  workers?: { hired?: Record<string, number> } | null;
}

function TownVillagers({ plan, buildings, workers }: TownVillagersProps) {
  const { wps, adj } = useMemo(() => makeGraph(plan), [plan]);
  const hiredWorkers: Record<string, number> = workers?.hired || {};
  // Re-seed the population whenever the build set changes (so a new building
  // can introduce its associated NPC mid-session) or worker counts change.
  const buildingsKey = useMemo(
    () => Object.keys(buildings || {}).sort().join(","),
    [buildings],
  );
  const workersKey = useMemo(
    () => `${hiredWorkers.farmer || 0}-${hiredWorkers.lumberjack || 0}-${hiredWorkers.miner || 0}-${hiredWorkers.baker || 0}`,
    [hiredWorkers.farmer, hiredWorkers.lumberjack, hiredWorkers.miner, hiredWorkers.baker],
  );
  const villagers = useMemo(
    () => buildPopulation({ wps, adj, buildings, hiredWorkers }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- buildingsKey + workersKey memoise the dependency tuple
    [wps, adj, buildingsKey, workersKey],
  );

  const stageRef = useRef<HTMLDivElement | null>(null);
  const stageSizeRef = useRef({ w: 0, h: 0 });
  // Map<villagerId, { wrap, torso, head, legL, legR, armL, armR }> —
  // populated by each sprite's ref callbacks as it mounts. The animation
  // loop reads from this map by villager id so the population list itself
  // stays immutable.
  const refsMapRef = useRef<Map<string, VillagerRefs>>(new Map());
  const registerEl = (id: string, key: keyof VillagerRefs, el: HTMLDivElement | null) => {
    const map = refsMapRef.current;
    let entry = map.get(id);
    if (!entry) {
      entry = { wrap: null, torso: null, head: null, legL: null, legR: null, armL: null, armR: null };
      map.set(id, entry);
    }
    entry[key] = el;
    if (!el) {
      // If every key is now null, drop the entry entirely.
      const allNull = Object.values(entry).every((v) => v == null);
      if (allNull) map.delete(id);
    }
  };

  // "Home" waypoint per named NPC, from their building's lot (if built). Read
  // live by the running sim via a ref so a new build doesn't restart it.
  const homeWp = useMemo(() => {
    const map: Record<string, number> = {};
    if (!plan || !buildings || !wps.length) return map;
    const nearest = (p: { x: number; y: number }) => { let b = 0, bd = Infinity; for (let i = 0; i < wps.length; i++) { const x = d2(wps[i], p); if (x < bd) { bd = x; b = i; } } return b; };
    for (const v of NPC_VILLAGERS) {
      const lotIdx = buildings[v.building];
      const lot = lotIdx != null ? plan.lots?.find((l) => l.index === lotIdx) : null;
      if (lot) map[v.id] = nearest({ x: lot.cx, y: lot.cy + lot.h / 2 });
    }
    return map;
  }, [plan, buildings, wps]);
  const homeWpRef = useRef(homeWp);
  useEffect(() => { homeWpRef.current = homeWp; }, [homeWp]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const measure = () => {
      stageSizeRef.current = { w: stage.clientWidth || 0, h: stage.clientHeight || 0 };
    };
    measure();
    if (typeof ResizeObserver !== "function") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!wps.length || !villagers.length) return undefined;
    let raf = 0, last = performance.now();
    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const hw = homeWpRef.current;
      for (let i = 0; i < villagers.length; i++) {
        const v = villagers[i];
        v.bob += dt * 9;
        if (now >= v.pauseUntil) {
          const len = Math.max(1, d2(wps[v.from], wps[v.to]));
          v.t += (v.speed * dt) / len;
          if (v.t >= 1) {
            v.t = 0; v.from = v.to;
            const nbrs = adj[v.from] || [];
            const home = v.npcId ? hw[v.npcId] : undefined;
            if (home != null && home !== v.from && Math.random() < 0.4 && nbrs.length) {
              v.to = nbrs.reduce((best, n) => (d2(wps[n], wps[home]) < d2(wps[best], wps[home]) ? n : best), nbrs[0]);
            } else {
              v.to = nbrs.length ? nbrs[Math.floor(Math.random() * nbrs.length)] : v.from;
            }
            if (Math.random() < 0.3) v.pauseUntil = now + 700 + Math.random() * 2200;
          }
          const A = wps[v.from], B = wps[v.to];
          const nx = A.x + (B.x - A.x) * v.t;
          const ny = A.y + (B.y - A.y) * v.t;
          if (Math.abs(nx - v.x) > 0.05) v.facing = nx > v.x ? 1 : -1;
          v.x = nx; v.y = ny;
        }
        const refs = refsMapRef.current.get(v.id);
        if (!refs?.wrap) continue;

        const bob = Math.sin(v.bob) * 1.0;
        const sway = Math.sin(v.bob * 1.1) * 2.4;
        const stride = Math.sin(v.bob * 1.3) * 1.6; // walking-leg lift
        const armSwing = Math.sin(v.bob * 1.3 + Math.PI) * 14; // arms swing opposite legs (degrees)

        const stage = stageSizeRef.current;
        refs.wrap.style.transform =
          `translate3d(${(v.x / W) * stage.w}px, ${((v.y + bob) / H) * stage.h}px, 0) ` +
          `translate(-50%, -100%) scaleX(${v.facing})`;
        refs.wrap.style.zIndex = String(Math.floor(v.y));

        if (refs.torso) {
          refs.torso.style.transform = `translateX(-50%) rotate(${sway * 0.30}deg)`;
        }
        if (refs.head) {
          refs.head.style.transform = `translateX(-50%) translateX(${sway * 0.10}px) rotate(${sway * 0.10}deg)`;
        }
        // Legs alternate vertical lift — left leg rises while right leg
        // settles, and vice versa. We use bottom offset rather than rotate
        // so the leg keeps its visual silhouette.
        if (refs.legL) {
          refs.legL.style.transform = `translateX(-50%) translateY(${-Math.max(0, stride)}px)`;
        }
        if (refs.legR) {
          refs.legR.style.transform = `translateX(-50%) translateY(${-Math.max(0, -stride)}px)`;
        }
        // Arms swing in opposition (in degrees).
        if (refs.armL) {
          refs.armL.style.transform = `translateX(-50%) rotate(${armSwing}deg)`;
        }
        if (refs.armR) {
          refs.armR.style.transform = `translateX(-50%) rotate(${-armSwing}deg)`;
        }
      }
    };
    step(performance.now());
    return () => cancelAnimationFrame(raf);
  }, [wps, adj, villagers]);

  if (!plan || !villagers.length) return null;

  return (
    <div ref={stageRef} className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {villagers.map((v) => {
        const size = v.isNamed ? 24 : 20;
        return <VillagerSprite key={v.id} villager={v} size={size} registerEl={registerEl} />;
      })}
    </div>
  );
}

export default memo(TownVillagers);
