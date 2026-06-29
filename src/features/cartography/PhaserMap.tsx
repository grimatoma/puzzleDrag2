import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";

interface MapPayload {
  current?: string;
  visited?: string[];
  discovered?: string[];
  locked?: string[];
  founded?: Record<string, boolean>;
  keeperPaths?: Record<string, string>;
  tokenCount?: number;
  oldCapitalUnlocked?: boolean;
}

interface PhaserMapProps {
  payload: MapPayload;
  tapped: string | null;
  onNodeTap: (nodeId: string) => void;
}

// The map's Phaser game is booted once and reused for the lifetime of the
// page. The cartography view unmounts whenever the player switches tabs, so
// rather than destroying the game on every navigation (which forced a full
// Phaser reboot + "unfurling the map…" overlay each visit), we keep the game
// alive and reparent its canvas between mounts. `sharedGame` survives unmount;
// `sharedStash` is an offscreen holder the canvas is parked in while hidden.
let sharedGame: Phaser.Game | null = null;
let sharedStash: HTMLDivElement | null = null;
// Holds the current node-tap handler. The scene's "carto.nodetap" listener is
// attached once (in postBoot) against the singleton game, but the React tree
// remounts on every visit — route taps through this holder so they always hit
// the currently-mounted component's dispatch closure.
const tapHandler: { current: (id: string) => void } = { current: () => {} };

// Latest React-side map state, mirrored at module scope so the (singleton) boot
// can seed the scene without capturing any one component's closure. A background
// warm-up boots before any cartography component has mounted, so these stay at
// their empty defaults until the real view pushes state — which MapScene handles
// gracefully (it falls back to `{}`).
let latestPayload: MapPayload = {};
let latestTapped: string | null = null;

function ensureStash(): HTMLDivElement | null {
  if (typeof document === "undefined") return null;
  if (sharedStash && sharedStash.isConnected) return sharedStash;
  const div = document.createElement("div");
  div.setAttribute("aria-hidden", "true");
  div.style.cssText = "position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden;";
  document.body.appendChild(div);
  sharedStash = div;
  return div;
}

/**
 * Boot the singleton map game, parented into `host`. Shared by the component's
 * cold-boot path and the background `warmMapScene()` pre-warm. Idempotent: if
 * the game already exists (or another caller wins the boot race during the
 * dynamic import) the existing instance is returned and no second engine is
 * created.
 */
async function bootMapGame(host: HTMLElement, dpr: number): Promise<Phaser.Game | null> {
  if (sharedGame) return sharedGame;
  const [{ default: Phaser }, { MapScene }] = await Promise.all([
    import("phaser"),
    import("./MapScene.js"),
  ]);
  // A concurrent caller may have booted it while we awaited the import.
  if (sharedGame) return sharedGame;

  const cssW = Math.max(320, host.clientWidth || 320);
  const cssH = Math.max(240, host.clientHeight || 240);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host,
    width: cssW * dpr,
    height: cssH * dpr,
    backgroundColor: "#e9dfc6",
    scene: MapScene,
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.NO_CENTER,
      zoom: 1 / dpr,
    },
    render: {
      antialias: true,
      antialiasGL: true,
      roundPixels: false,
      pixelArt: false,
      powerPreference: "low-power",
    },
    input: { activePointers: 2 },
    callbacks: {
      postBoot: (g: Phaser.Game) => {
        const scene = g.scene.scenes[0];
        if (scene) {
          // Seed the scene from the latest React state once it has created its
          // textures. For a warm boot this is the empty default; the real view
          // pushes the true payload when it mounts (changedata → applyState).
          scene.events.on("create", () => {
            g.registry.set("carto.payload", latestPayload);
            g.registry.set("carto.tapped", latestTapped);
          });
          scene.events.on("carto.nodetap", (id: string) => tapHandler.current(id));
        }
      },
    },
  });
  sharedGame = game;
  return game;
}

/**
 * Background pre-warm: boot the map engine and bake all of its node/board
 * textures into the offscreen stash *before* the player first opens the Map,
 * so the first visit takes the instant fast path instead of showing the
 * "unfurling map…" overlay for 1–2 s. No-op once the game is already booted.
 * Safe to call any time after startup.
 */
export async function warmMapScene(): Promise<void> {
  if (sharedGame) return;
  const host = ensureStash();
  if (!host) return;
  const dpr = Math.min(typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1, 3);
  let game: Phaser.Game | null;
  try {
    game = await bootMapGame(host, dpr);
  } catch (err) {
    console.error("Map scene warm-up failed:", err);
    return;
  }
  if (!game) return;
  // The bake runs on the scene's first frame (its `create`). Once that's done,
  // park the render loop to sleep so a warmed-but-unvisited map isn't rendering
  // offscreen for the rest of the session. Guarded on the canvas still living
  // in the stash: if the player opened the Map first, its fast path reparented
  // and woke the loop, and we must not put it back to sleep.
  const g = game;
  const parkLoop = () => {
    if (g.canvas.parentElement === sharedStash) g.loop.sleep();
  };
  const scene = g.scene.scenes[0];
  if (scene) scene.events.once("create", parkLoop);
  else parkLoop();
}

/* Mounts the Phaser instance that runs the redesigned Hearthwood map.
 *
 * The wrapper:
 *   1. Lazy-loads Phaser + MapScene on first ever mount (keeps the initial
 *      bundle out of the picture) and caches the booted game in `sharedGame`.
 *   2. On later mounts, reparents the cached canvas into the new host instead
 *      of rebooting — so switching back to the Map tab is instant.
 *   3. Resizes the game's backing buffer to match its host on viewport changes.
 *   4. Pushes the React-side map state into the scene via the Phaser registry
 *      ("carto.payload" / "carto.tapped"), and listens for node taps coming
 *      back via the scene's "carto.nodetap" event.
 */
export default function PhaserMap({
  payload,
  tapped,
  onNodeTap,
}: PhaserMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneReadyRef = useRef<boolean>(false);
  const [loading, setLoading] = useState<boolean>(() => !sharedGame);

  // Mount / reattach the Phaser game. On unmount the canvas is parked offscreen
  // (and its render loop paused) rather than destroyed, so the game persists.
  useEffect(() => {
    if (!hostRef.current) return;
    const host = hostRef.current;
    const dpr = Math.min(typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1, 3);
    const cssW = Math.max(320, host.clientWidth);
    const cssH = Math.max(240, host.clientHeight);

    let cancelled = false;
    let ro: ResizeObserver | null = null;

    const attachResize = (g: Phaser.Game) => {
      ro = new ResizeObserver(() => {
        const w = host.clientWidth;
        const h = host.clientHeight;
        if (!w || !h) return;
        g.scale.resize(w * dpr, h * dpr);
      });
      ro.observe(host);
    };

    // Fast path: a game is already booted — reparent its canvas into this host
    // and wake the render loop. No reboot, no loading overlay.
    if (sharedGame) {
      const g = sharedGame;
      host.appendChild(g.canvas);
      g.loop.wake();
      g.scale.resize(cssW * dpr, cssH * dpr);
      gameRef.current = g;
      sceneReadyRef.current = true;
      attachResize(g);
      pushPayload(g, payload);
      pushTapped(g, tapped);
      // `loading` already initialised to false when a game is cached, so no
      // setState needed here — the overlay never shows on the fast path.
      return () => {
        cancelled = true;
        ro?.disconnect();
        // Park the canvas offscreen and sleep the loop so the next visit is
        // instant. The game (and its WebGL context) stays alive.
        ensureStash()?.appendChild(g.canvas);
        g.loop.sleep();
        gameRef.current = null;
      };
    }

    // Slow path: first ever mount — boot Phaser. Safety net: if Phaser fails to
    // boot (e.g. WebGL context creation hangs or the dynamic import stalls on a
    // flaky mobile connection), drop the overlay after a wait so the player at
    // least sees the side panel.
    const safetyTimer = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 6000);

    (async () => {
      try {
        const game = await bootMapGame(host, dpr);
        if (cancelled || !hostRef.current || !game) return;
        // A background warm-up may have already booted the game into the
        // offscreen stash; bring its canvas into this host. If we booted it
        // ourselves the canvas is already here and this is a no-op.
        if (game.canvas.parentElement !== host) host.appendChild(game.canvas);
        game.scale.resize(cssW * dpr, cssH * dpr);
        game.loop.wake();
        sceneReadyRef.current = true;
        sharedGame = game;
        gameRef.current = game;
        attachResize(game);
        // The canvas is in the DOM the moment Phaser.Game is constructed, so
        // drop the loading overlay now rather than waiting for postBoot — on
        // some mobile browsers the postBoot/create callbacks fire late or
        // never (WebGL context exhaustion) and the overlay would otherwise be
        // permanent.
        if (!cancelled) setLoading(false);
        // The "create" event might have already fired by the time we get here
        // (especially on a warm handoff) — push the current payload defensively.
        pushPayload(game, payload);
        pushTapped(game, tapped);
      } catch (err) {
        console.error("Failed to load map scene:", err);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      ro?.disconnect();
      // If the game booted before we unmounted, park it offscreen instead of
      // destroying it so a later visit reuses it.
      if (sharedGame) {
        ensureStash()?.appendChild(sharedGame.canvas);
        sharedGame.loop.sleep();
      }
      gameRef.current = null;
      sceneReadyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once
  }, []);

  // Keep the node-tap handler current so the singleton scene listener always
  // dispatches into the latest closure (which knows the current `tapped` zone).
  useEffect(() => { tapHandler.current = onNodeTap; }, [onNodeTap]);

  // Push payload / tapped updates into the scene.
  useEffect(() => { pushPayload(gameRef.current, payload); }, [payload]);
  useEffect(() => { pushTapped(gameRef.current, tapped); }, [tapped]);

  return (
    <div
      ref={hostRef}
      className="absolute inset-0"
      style={{ touchAction: "none" }}
    >
      {loading && (
        <div className="absolute inset-0 grid place-items-center text-[#f8e7c6] text-[12px] italic opacity-70">
          unfurling the map…
        </div>
      )}
    </div>
  );
}

function pushPayload(game: Phaser.Game | null, payload: MapPayload): void {
  // Mirror at module scope so a not-yet-booted (or warm-booted) game can seed
  // itself from the latest state on `create`.
  latestPayload = payload;
  const reg = game?.registry;
  if (!reg) return;
  reg.set("carto.payload", payload);
}

function pushTapped(game: Phaser.Game | null, tapped: string | null): void {
  latestTapped = tapped;
  const reg = game?.registry;
  if (!reg) return;
  reg.set("carto.tapped", tapped);
}
