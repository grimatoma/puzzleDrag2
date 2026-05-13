// ─── TownVillagers ──────────────────────────────────────────────────────────
// Townsfolk that actually live in the town: they walk the street graph from the
// procedural town plan (`plan.waypoints` / `plan.edges`), wandering the plaza
// and the lanes and pausing now and then. The five named NPCs get a colour and
// a "home" waypoint near their building, so they tend to hang around it.
// Rendered as small CSS sprites in the same 1100×600 design space as the rest
// of the Town view, driven by a single requestAnimationFrame loop.
//
// NOTE: render this with `key={zoneId}` from the parent so a zone change
// re-mounts it (the villagers re-seed from the new town plan).

import { useEffect, useMemo, useRef } from "react";

const W = 1100, H = 600;

// Named NPC → colour + the building they keep house near (best-effort: if it
// isn't built they just wander like everyone else).
const NPC_VILLAGERS = [
  { id: "mira",  color: "#d6612a", building: "bakery"  },
  { id: "bram",  color: "#5a6973", building: "forge"   },
  { id: "wren",  color: "#4f6b3a", building: "hearth"  },
  { id: "tomas", color: "#c8923a", building: "inn"     },
  { id: "liss",  color: "#8d3a5c", building: "larder"  },
];
const GENERIC_COLORS = ["#7a8aa0", "#9a7a5a", "#6a9a6a", "#a06a8a", "#8a8a5a", "#6a8aa0", "#9a8a6a"];

const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function makeGraph(plan) {
  const wps = plan?.waypoints || [];
  const adj = wps.map(() => []);
  for (const [i, j] of plan?.edges || []) { adj[i].push(j); adj[j].push(i); }
  return { wps, adj };
}

function seedVillagers(wps, adj) {
  if (!wps.length) return [];
  const rng = Math.random;
  const make = (seed, color, npcId) => {
    const a = seed % wps.length;
    const b = adj[a]?.[Math.floor(rng() * (adj[a]?.length || 1))] ?? a;
    return {
      npcId, color, from: a, to: b, t: rng(),
      speed: 26 + rng() * 22, x: wps[a].x, y: wps[a].y, facing: 1,
      pauseUntil: 0, bob: rng() * Math.PI * 2,
    };
  };
  const list = NPC_VILLAGERS.map((v, i) => make(i * 3 + 1, v.color, v.id));
  const generics = Math.min(7, Math.max(3, Math.round(wps.length / 1.5)));
  for (let g = 0; g < generics; g++) list.push(make(g * 5 + 2, GENERIC_COLORS[g % GENERIC_COLORS.length], null));
  return list;
}

export default function TownVillagers({ plan, buildings }) {
  const { wps, adj } = useMemo(() => makeGraph(plan), [plan]);
  const villagers = useMemo(() => seedVillagers(wps, adj), [wps, adj]);
  const stageRef = useRef(null);
  const stageSizeRef = useRef({ w: 0, h: 0 });
  const villagerRefs = useRef([]);
  const bodyRefs = useRef([]);
  const headRefs = useRef([]);

  // "Home" waypoint per named NPC, from their building's lot (if built). Read
  // live by the running sim via a ref so a new build doesn't restart it.
  const homeWp = useMemo(() => {
    const map = {};
    if (!plan || !buildings || !wps.length) return map;
    const nearest = (p) => { let b = 0, bd = Infinity; for (let i = 0; i < wps.length; i++) { const x = d2(wps[i], p); if (x < bd) { bd = x; b = i; } } return b; };
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
    const step = (now) => {
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
        const el = villagerRefs.current[i];
        if (!el) continue;
        const bob = Math.sin(v.bob) * 1.2;
        const sway = Math.sin(v.bob * 1.1) * 2.5;
        const stage = stageSizeRef.current;
        el.style.transform = `translate3d(${(v.x / W) * stage.w}px, ${((v.y + bob) / H) * stage.h}px, 0) translate(-50%, -100%) scaleX(${v.facing})`;
        const body = bodyRefs.current[i];
        const head = headRefs.current[i];
        if (body) body.style.transform = `translateX(-50%) rotate(${sway * 0.3}deg)`;
        if (head) head.style.transform = `translateX(-50%) translateX(${sway * 0.15}px)`;
      }
    };
    step(performance.now());
    return () => cancelAnimationFrame(raf);
  }, [wps, adj, villagers]);

  if (!plan || !villagers.length) return null;

  return (
    <div ref={stageRef} className="absolute inset-0 pointer-events-none z-[18]" aria-hidden="true">
      {villagers.map((v, i) => {
        const size = v.npcId ? 22 : 18;
        return (
          <div
            key={i}
            ref={(el) => { villagerRefs.current[i] = el; }}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: size, height: size * 1.6,
              transform: `translate3d(0, 0, 0) translate(-50%, -100%) scaleX(${v.facing})`,
              transformOrigin: "bottom center",
              willChange: "transform",
            }}
          >
            <div style={{ position: "absolute", left: "50%", bottom: -1, transform: "translateX(-50%)", width: size * 0.72, height: size * 0.22, borderRadius: "50%", background: "rgba(0,0,0,0.20)" }} />
            <div ref={(el) => { bodyRefs.current[i] = el; }} style={{ position: "absolute", left: "50%", bottom: 0, transform: "translateX(-50%)", width: size * 0.6, height: size * 0.8, borderRadius: `${size * 0.3}px ${size * 0.3}px ${size * 0.18}px ${size * 0.18}px`, background: v.color, boxShadow: "inset -2px -2px 3px rgba(0,0,0,0.18)" }} />
            <div ref={(el) => { headRefs.current[i] = el; }} style={{ position: "absolute", left: "50%", bottom: size * 0.76, transform: "translateX(-50%)", width: size * 0.5, height: size * 0.5, borderRadius: "50%", background: "#e8c79a", boxShadow: "inset -1.5px -1.5px 2px rgba(0,0,0,0.2)" }} />
            <div style={{ position: "absolute", left: "50%", bottom: size * 1.02, transform: "translateX(-50%)", width: size * 0.5, height: size * 0.26, borderRadius: `${size * 0.25}px ${size * 0.25}px 0 0`, background: "rgba(48,36,24,0.85)" }} />
          </div>
        );
      })}
    </div>
  );
}
