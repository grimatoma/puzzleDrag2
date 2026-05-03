import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BIOMES, COLS, MAX_TURNS, ROWS, SEASONS, TILE, UPGRADE_EVERY,
} from "./constants.js";
import { clamp, seasonIndexForTurns, upgradeCountForChain } from "./utils.js";

const ICON = {
  hay: "🌾", wheat: "🌽", wood: "🪵", bird: "🐔", egg: "🥚",
  stone: "🪨", iron: "⛓️", coal: "⬛", gem: "💎", gold: "🪙",
};

const hex = (n) => `#${n.toString(16).padStart(6, "0")}`;
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function randomResource(biomeKey) {
  const p = BIOMES[biomeKey].resources;
  const r = Math.random();
  return r < 0.36 ? p[0] : r < 0.62 ? p[1] : r < 0.8 ? p[2] : r < 0.93 ? p[3] : p[4];
}

function nextResource(biomeKey, res) {
  const pool = BIOMES[biomeKey].resources;
  const i = pool.findIndex((r) => r.key === res.key);
  return i >= 0 && i < pool.length - 1 ? pool[i + 1] : null;
}

let nextId = 1;
const newTile = (biomeKey, col, row) => ({
  id: nextId++,
  col,
  row,
  res: randomResource(biomeKey),
});

function freshBoard(biomeKey) {
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) grid[r][c] = newTile(biomeKey, c, r);
  }
  return grid;
}

function findTile(grid, id) {
  for (const row of grid) for (const t of row) if (t && t.id === id) return t;
  return null;
}

function makeOrders(biomeKey, level) {
  const pool = [...BIOMES[biomeKey].resources.slice(0, 4)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return [
    { id: nextId++, key: pool[0].key, need: randInt(8, 14) + level * 2, reward: 70 + level * 20 },
    { id: nextId++, key: pool[1].key, need: randInt(6, 11) + level * 2, reward: 60 + level * 20 },
  ];
}

const TOOL_DEFS = [
  { key: "clear", icon: "C", name: "Clear" },
  { key: "basic", icon: "+", name: "+Basic" },
  { key: "rare", icon: "R", name: "+Rare" },
  { key: "shuffle", icon: "★", name: "Shuffle" },
];

export default function DomGame() {
  const [biomeKey, setBiomeKey] = useState("farm");
  const [grid, setGrid] = useState(() => freshBoard("farm"));
  const [path, setPath] = useState([]);
  const draggingRef = useRef(false);
  const [coins, setCoins] = useState(150);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [turnsUsed, setTurnsUsed] = useState(0);
  const [inventory, setInventory] = useState({});
  const [orders, setOrders] = useState(() => makeOrders("farm", 1));
  const [tools, setTools] = useState({ clear: 2, basic: 1, rare: 1, shuffle: 0 });
  const [seasonOver, setSeasonOver] = useState(false);
  const [floats, setFloats] = useState([]);

  const seasonIdx = seasonIndexForTurns(turnsUsed);
  const season = SEASONS[seasonIdx];
  const biome = BIOMES[biomeKey];
  const pathTiles = path.map((id) => findTile(grid, id)).filter(Boolean);
  const headRes = pathTiles[0]?.res;
  const upgradeTo = headRes ? nextResource(biomeKey, headRes) : null;

  const float = (msg, x, y) => {
    const id = nextId++;
    setFloats((f) => [...f, { id, msg, x, y }]);
    setTimeout(() => setFloats((f) => f.filter((m) => m.id !== id)), 900);
  };

  const startPath = (tile) => {
    if (turnsUsed >= MAX_TURNS || seasonOver) return;
    draggingRef.current = true;
    setPath([tile.id]);
  };

  const tryAdd = useCallback(
    (tile) => {
      if (!draggingRef.current) return;
      setPath((prev) => {
        if (!prev.length) return prev;
        const last = findTile(grid, prev[prev.length - 1]);
        const prev2 = prev.length >= 2 ? findTile(grid, prev[prev.length - 2]) : null;
        if (prev2 && prev2.id === tile.id) return prev.slice(0, -1);
        if (prev.includes(tile.id)) return prev;
        const head = findTile(grid, prev[0]);
        const same = tile.res.key === head.res.key;
        const adj =
          Math.abs(tile.col - last.col) <= 1 &&
          Math.abs(tile.row - last.row) <= 1 &&
          !(tile.col === last.col && tile.row === last.row);
        return same && adj ? [...prev, tile.id] : prev;
      });
    },
    [grid]
  );

  const endPath = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setPath((cur) => {
      if (cur.length < 3) return [];
      const tiles = cur.map((id) => findTile(grid, id)).filter(Boolean);
      const head = tiles[0];
      const next = nextResource(biomeKey, head.res);
      const upgradeTotal = next ? upgradeCountForChain(tiles.length) : 0;
      const gained = tiles.length * (tiles.length >= 6 ? 2 : 1);

      setInventory((inv) => ({ ...inv, [head.res.key]: (inv[head.res.key] || 0) + gained }));
      setCoins((c) => c + Math.max(1, Math.floor((gained * head.res.value) / 2)));
      setXp((x) => x + gained * head.res.value * 3 + upgradeTotal * 12);
      const last = tiles[tiles.length - 1];
      float(
        `+${gained} ${head.res.label}${upgradeTotal ? `  ★${upgradeTotal}` : ""}`,
        last.col * TILE + TILE / 2,
        last.row * TILE + TILE / 2
      );

      setGrid((g) => {
        const out = g.map((row) => row.slice());
        tiles.forEach((tile, i) => {
          const upgrade = next && (i + 1) % UPGRADE_EVERY === 0;
          out[tile.row][tile.col] = upgrade ? { ...tile, res: next } : null;
        });
        for (let c = 0; c < COLS; c++) {
          let write = ROWS - 1;
          for (let r = ROWS - 1; r >= 0; r--) {
            const t = out[r][c];
            if (!t) continue;
            if (write !== r) {
              out[write][c] = { ...t, row: write };
              out[r][c] = null;
            }
            write--;
          }
          for (let r = write; r >= 0; r--) out[r][c] = newTile(biomeKey, c, r);
        }
        return out;
      });

      setTurnsUsed((t) => {
        const nt = clamp(t + 1, 0, MAX_TURNS);
        if (nt >= MAX_TURNS) setTimeout(() => setSeasonOver(true), 380);
        return nt;
      });
      return [];
    });
  }, [grid, biomeKey]);

  useEffect(() => {
    const up = () => endPath();
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [endPath]);

  useEffect(() => {
    if (xp >= level * 500) {
      setXp((x) => x - level * 500);
      setLevel((lv) => lv + 1);
      setTools((t) => ({ ...t, shuffle: t.shuffle + 1 }));
      float(`Level ${level + 1}!`, (COLS * TILE) / 2, (ROWS * TILE) / 2);
    }
  }, [xp, level]);

  const shuffleBoard = useCallback(() => {
    setGrid((g) =>
      g.map((row) =>
        row.map((t) => (t ? { ...t, res: randomResource(biomeKey) } : t))
      )
    );
  }, [biomeKey]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        shuffleBoard();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shuffleBoard]);

  const onBoardPointerMove = (e) => {
    if (!draggingRef.current) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target) return;
    const el = target.closest("[data-tile-id]");
    if (!el) return;
    const id = Number(el.dataset.tileId);
    const tile = findTile(grid, id);
    if (tile) tryAdd(tile);
  };

  const switchBiome = (key) => {
    if (key === biomeKey) return;
    if (key === "mine" && level < 2) {
      float("Mine unlocks at level 2", (COLS * TILE) / 2, (ROWS * TILE) / 2);
      return;
    }
    setBiomeKey(key);
    setGrid(freshBoard(key));
    setInventory({});
    setOrders(makeOrders(key, level));
    setPath([]);
    draggingRef.current = false;
  };

  const turnInOrder = (o) => {
    if ((inventory[o.key] || 0) < o.need) {
      float("Need more!", (COLS * TILE) / 2, 40);
      return;
    }
    setInventory((inv) => ({ ...inv, [o.key]: (inv[o.key] || 0) - o.need }));
    setCoins((c) => c + o.reward);
    setXp((x) => x + o.reward);
    setOrders((cur) => {
      const remaining = cur.filter((x) => x.id !== o.id);
      return remaining.length ? remaining : makeOrders(biomeKey, level);
    });
    float(`Sold +${o.reward}`, (COLS * TILE) / 2, 40);
  };

  const useTool = (key) => {
    if ((tools[key] || 0) <= 0) {
      float("No tool", (COLS * TILE) / 2, ROWS * TILE - 40);
      return;
    }
    setTools((t) => ({ ...t, [key]: t[key] - 1 }));
    if (key === "shuffle") {
      shuffleBoard();
    } else {
      const r = key === "rare" ? biome.resources[4] : biome.resources[0];
      const amt = key === "rare" ? 2 : 5;
      setInventory((inv) => ({ ...inv, [r.key]: (inv[r.key] || 0) + amt }));
    }
  };

  const nextSeason = () => {
    setTurnsUsed(0);
    setOrders(makeOrders(biomeKey, level));
    setGrid(freshBoard(biomeKey));
    setSeasonOver(false);
  };

  const flatTiles = grid.flat().filter(Boolean);
  const turnsLeft = MAX_TURNS - turnsUsed;
  const seasonPct = (turnsUsed / MAX_TURNS) * 100;
  const xpPct = clamp((xp / (level * 500)) * 100, 4, 100);

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center p-4 gap-4"
      style={{ background: hex(biomeKey === "mine" ? 0x31404a : season.bg) }}
    >
      {/* HUD */}
      <div className="w-full max-w-[1100px] flex items-center gap-3 text-white flex-wrap">
        <div className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-900 font-bold shadow flex items-center gap-2">
          <span>🪙</span> {coins}
        </div>
        <div className="flex-1 min-w-[300px] px-4 py-2 rounded-2xl bg-amber-50/95 text-amber-900 shadow flex items-center gap-3">
          <span className="font-bold whitespace-nowrap">Turns {turnsLeft}/{MAX_TURNS}</span>
          <div className="flex-1 h-3 rounded-full bg-stone-300 overflow-hidden min-w-[40px]">
            <div
              className="h-full transition-[width] duration-300"
              style={{ width: `${seasonPct}%`, background: hex(season.fill) }}
            />
          </div>
          <span className="font-bold whitespace-nowrap">{season.name}</span>
          <div className="flex gap-0.5">
            {Array.from({ length: MAX_TURNS }).map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full border"
                style={{
                  background: i < turnsUsed ? hex(season.fill) : "#ffffffaa",
                  borderColor: hex(season.accent),
                }}
              />
            ))}
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-2xl bg-amber-50/95 text-amber-900 shadow flex items-center gap-2 min-w-[180px]">
          <span className="font-bold text-sm">XP</span>
          <div className="flex-1 h-3 rounded-full bg-stone-300 overflow-hidden">
            <div
              className="h-full transition-[width] duration-300"
              style={{ width: `${xpPct}%`, background: "#ff8b25" }}
            />
          </div>
          <span className="text-xs font-bold">{xp}/{level * 500}</span>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-rose-700 text-white font-bold shadow">
          Lv {level}
        </div>
      </div>

      <div className="w-full max-w-[1100px] flex gap-4 flex-wrap justify-center items-start">
        {/* Board */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="relative rounded-2xl shadow-xl"
            style={{
              width: COLS * TILE + 28,
              height: ROWS * TILE + 28,
              padding: 14,
              background: hex(biome.dirt),
              border: `4px solid ${hex(biome.dark)}`,
              touchAction: "none",
            }}
            onPointerMove={onBoardPointerMove}
          >
            <div className="relative" style={{ width: COLS * TILE, height: ROWS * TILE }}>
              <svg
                className="absolute inset-0 pointer-events-none"
                width={COLS * TILE}
                height={ROWS * TILE}
              >
                {pathTiles.map((t, i) => {
                  if (i === 0) return null;
                  const a = pathTiles[i - 1];
                  const b = t;
                  return (
                    <g key={`${a.id}-${b.id}`}>
                      <line
                        x1={a.col * TILE + TILE / 2}
                        y1={a.row * TILE + TILE / 2}
                        x2={b.col * TILE + TILE / 2}
                        y2={b.row * TILE + TILE / 2}
                        stroke="#ffd248"
                        strokeWidth={15}
                        strokeOpacity={0.35}
                        strokeLinecap="round"
                      />
                      <line
                        x1={a.col * TILE + TILE / 2}
                        y1={a.row * TILE + TILE / 2}
                        x2={b.col * TILE + TILE / 2}
                        y2={b.row * TILE + TILE / 2}
                        stroke="#ff6d00"
                        strokeWidth={8}
                        strokeLinecap="round"
                      />
                    </g>
                  );
                })}
                {upgradeTo &&
                  pathTiles.map((t, i) =>
                    (i + 1) % UPGRADE_EVERY === 0 ? (
                      <text
                        key={`star-${t.id}`}
                        x={t.col * TILE + TILE - 14}
                        y={t.row * TILE + 18}
                        fontSize={18}
                        textAnchor="middle"
                      >
                        ⭐
                      </text>
                    ) : null
                  )}
              </svg>

              {flatTiles.map((t) => {
                const selected = path.includes(t.id);
                return (
                  <div
                    key={t.id}
                    data-tile-id={t.id}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      startPath(t);
                    }}
                    className="absolute select-none flex items-center justify-center font-bold text-2xl rounded-xl shadow-md cursor-pointer"
                    style={{
                      width: TILE - 6,
                      height: TILE - 6,
                      transform: `translate3d(${t.col * TILE + 3}px, ${t.row * TILE + 3}px, 0) scale(${selected ? 1.08 : 1})`,
                      transition: "transform 180ms cubic-bezier(.34,1.56,.64,1)",
                      background: hex(t.res.color),
                      boxShadow: selected
                        ? "0 0 0 3px #fff, 0 0 18px 4px #ffd248"
                        : "inset 0 -6px 0 rgba(0,0,0,0.18)",
                      color: "#1f1408",
                      touchAction: "none",
                    }}
                  >
                    <span style={{ filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.3))" }}>
                      {ICON[t.res.key] || "?"}
                    </span>
                  </div>
                );
              })}

              {floats.map((f) => (
                <div
                  key={f.id}
                  className="absolute pointer-events-none font-bold text-white text-lg whitespace-nowrap"
                  style={{
                    left: f.x,
                    top: f.y,
                    transform: "translate(-50%, -50%)",
                    textShadow: "0 0 4px #000, 0 0 4px #000",
                    animation: "domgame-float 900ms ease-out forwards",
                  }}
                >
                  {f.msg}
                </div>
              ))}
            </div>
            <style>{`
              @keyframes domgame-float {
                0% { opacity: 0; transform: translate(-50%, -30%) scale(0.7); }
                15% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -120%) scale(1); }
              }
            `}</style>
          </div>
          <div className="text-white/90 text-sm text-center max-w-[600px]" style={{ textShadow: "0 0 4px #000" }}>
            Drag 3+ matching tiles. Every {UPGRADE_EVERY}rd chained tile becomes the next tier. Press Space to shuffle.
          </div>
        </div>

        {/* Side panel */}
        <div
          className="rounded-2xl p-4 text-amber-50 shadow-xl flex flex-col gap-3"
          style={{ background: hex(0x7c4f2c), width: 300 }}
        >
          <div>
            <div className="rounded-xl px-3 py-2 mb-2" style={{ background: "#f7ead8" }}>
              <div className="font-bold text-lg" style={{ color: "#744d2e" }}>Orders</div>
            </div>
            <div className="flex flex-col gap-2">
              {orders.map((o) => {
                const have = inventory[o.key] || 0;
                const done = have >= o.need;
                const r = BIOMES[biomeKey].resources.find((x) => x.key === o.key)
                  || Object.values(BIOMES).flatMap((b) => b.resources).find((x) => x.key === o.key);
                return (
                  <button
                    key={o.id}
                    onClick={() => turnInOrder(o)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-white/60 font-bold transition-colors"
                    style={{ background: done ? "#91bf24" : "#bdb3a8", color: "#fff" }}
                  >
                    <span className="text-2xl">{ICON[o.key]}</span>
                    <span style={{ textShadow: "0 1px 2px #4b2d1a" }}>
                      {have}/{o.need}
                    </span>
                    <span className="ml-auto text-sm opacity-90">+{o.reward}🪙</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="font-bold text-lg mb-2">Storage</div>
            <div className="grid grid-cols-2 gap-2">
              {biome.resources.map((r) => (
                <div
                  key={r.key}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg"
                  style={{ background: "#b68d64" }}
                >
                  <span className="text-xl">{ICON[r.key]}</span>
                  <span className="font-bold">{inventory[r.key] || 0}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="font-bold text-lg mb-2">Tools</div>
            <div className="grid grid-cols-2 gap-2">
              {TOOL_DEFS.map((t) => {
                const count = tools[t.key] || 0;
                return (
                  <button
                    key={t.key}
                    onClick={() => useTool(t.key)}
                    className="flex items-center gap-2 px-2 py-2 rounded-lg font-bold text-left transition-opacity"
                    style={{ background: "#9a724d", opacity: count > 0 ? 1 : 0.55 }}
                  >
                    <span className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 text-lg">
                      {t.icon}
                    </span>
                    <span className="text-xs flex-1">{t.name}</span>
                    <span className="text-base" style={{ textShadow: "0 1px 2px #4b2d1a" }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="font-bold text-lg mb-2">Biome</div>
            <div className="flex gap-2">
              {["farm", "mine"].map((k) => (
                <button
                  key={k}
                  onClick={() => switchBiome(k)}
                  className="flex-1 py-2 rounded-lg font-bold"
                  style={{
                    background: k === biomeKey ? "#ffc239" : "#6b4d34",
                    color: k === biomeKey ? "#5a3a20" : "#fff",
                  }}
                >
                  {BIOMES[k].name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {seasonOver && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.48)" }}
        >
          <div
            className="rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl"
            style={{ background: "#f7ead8", border: "5px solid #b28b62", minWidth: 360 }}
          >
            <div className="text-3xl font-bold" style={{ color: "#744d2e" }}>
              {season.name} Complete!
            </div>
            <div className="text-lg text-center leading-relaxed" style={{ color: "#6a4b31" }}>
              Coins: <b>{coins}</b>
              <br />
              Level: <b>{level}</b>
              <br />
              Orders left: <b>{orders.length}</b>
            </div>
            <button
              onClick={nextSeason}
              className="px-8 py-3 rounded-2xl text-white font-bold text-xl shadow border-2 border-white"
              style={{ background: "#91bf24" }}
            >
              Next Season
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
