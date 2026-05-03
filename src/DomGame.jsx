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

export default function DomGame() {
  const [biomeKey, setBiomeKey] = useState("farm");
  const [grid, setGrid] = useState(() => freshBoard("farm"));
  const [path, setPath] = useState([]);
  const draggingRef = useRef(false);
  const [, force] = useState(0);
  const [coins, setCoins] = useState(150);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [turnsUsed, setTurnsUsed] = useState(0);
  const [inventory, setInventory] = useState({});
  const [floats, setFloats] = useState([]);

  const season = SEASONS[seasonIndexForTurns(turnsUsed)];
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
    if (turnsUsed >= MAX_TURNS) return;
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
      float(`+${gained} ${head.res.label}${upgradeTotal ? `  ★${upgradeTotal}` : ""}`, last.col * TILE + TILE / 2, last.row * TILE + TILE / 2);

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

      setTurnsUsed((t) => clamp(t + 1, 0, MAX_TURNS));
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
    while (xp >= level * 500) {
      setXp((x) => x - level * 500);
      setLevel((lv) => lv + 1);
    }
  }, [xp, level]);

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
      float("Mine unlocks at level 2", COLS * TILE / 2, ROWS * TILE / 2);
      return;
    }
    setBiomeKey(key);
    setGrid(freshBoard(key));
    setInventory({});
    setPath([]);
    draggingRef.current = false;
  };

  const flatTiles = grid.flat().filter(Boolean);
  const turnsLeft = MAX_TURNS - turnsUsed;
  const seasonPct = (turnsUsed / MAX_TURNS) * 100;

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center p-4 gap-4"
      style={{ background: hex(biomeKey === "mine" ? 0x31404a : season.bg) }}
    >
      {/* HUD */}
      <div className="w-full max-w-[960px] flex items-center gap-3 text-white">
        <div className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-900 font-bold shadow">
          🪙 {coins}
        </div>
        <div className="flex-1 px-4 py-2 rounded-2xl bg-amber-50/95 text-amber-900 shadow flex items-center gap-3">
          <span className="font-bold">Turns {turnsLeft}/{MAX_TURNS}</span>
          <div className="flex-1 h-3 rounded-full bg-stone-300 overflow-hidden">
            <div
              className="h-full transition-[width] duration-300"
              style={{ width: `${seasonPct}%`, background: hex(season.fill) }}
            />
          </div>
          <span className="font-bold">{season.name}</span>
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
        <div className="px-3 py-1.5 rounded-full bg-rose-700 text-white font-bold shadow">
          Lv {level}
        </div>
      </div>

      <div className="w-full max-w-[960px] flex gap-4 flex-wrap justify-center">
        {/* Board */}
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
          <div
            className="relative"
            style={{ width: COLS * TILE, height: ROWS * TILE }}
          >
            {/* Path overlay */}
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

            {/* Tiles (CSS transitioned by transform) */}
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

            {/* Floating texts */}
            {floats.map((f) => (
              <div
                key={f.id}
                className="absolute pointer-events-none font-bold text-white text-lg"
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

        {/* Side panel */}
        <div
          className="rounded-2xl p-4 text-amber-50 shadow-xl flex flex-col gap-3"
          style={{ background: hex(0x7c4f2c), width: 280 }}
        >
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
          <div className="text-sm opacity-80 leading-snug">
            DOM/React port — drag 3+ matching tiles. Every {UPGRADE_EVERY}rd
            chained tile upgrades. Compare with the Phaser version (no <code>?dom</code> flag).
          </div>
        </div>
      </div>
    </div>
  );
}
