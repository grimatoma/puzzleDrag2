import { useEffect, useRef, useState } from "react";

/* Mounts a Phaser instance that runs the redesigned Hearthwood map.
 *
 * The wrapper:
 *   1. Lazy-loads Phaser + MapScene (keeps initial bundle out of the picture).
 *   2. Resizes the game's backing buffer to match its host on viewport changes.
 *   3. Pushes the React-side map state into the scene via the Phaser registry
 *      ("carto.payload" / "carto.tapped"), and listens for node taps coming
 *      back via the scene's "carto.nodetap" event.
 */
export default function PhaserMap({
  payload,        // { current, visited, discovered, level, founded, keeperPaths, tokenCount, oldCapitalUnlocked }
  tapped,         // currently-tapped node id (string | null)
  onNodeTap,      // (nodeId) => void
}) {
  const hostRef = useRef(null);
  const gameRef = useRef(null);
  const sceneReadyRef = useRef(false);
  const [loading, setLoading] = useState(true);

  // Mount Phaser once. The cartography view is itself unmounted when the
  // player navigates away, which destroys this component and cleans up.
  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;
    const host = hostRef.current;
    const dpr = Math.min(typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1, 3);
    const cssW = Math.max(320, host.clientWidth);
    const cssH = Math.max(240, host.clientHeight);

    let cancelled = false;
    // Safety net: if Phaser fails to boot (e.g. WebGL context creation hangs
    // or the dynamic import stalls on a flaky mobile connection), the
    // "unfurling the map…" overlay would otherwise sit there forever. Drop it
    // after a reasonable wait so the user at least sees the side panel.
    const safetyTimer = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 6000);

    (async () => {
      try {
        const [{ default: Phaser }, { MapScene }] = await Promise.all([
          import("phaser"),
          import("./MapScene.js"),
        ]);
        if (cancelled || !hostRef.current) return;
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
            postBoot: (g) => {
              const ro = new ResizeObserver(() => {
                const w = host.clientWidth;
                const h = host.clientHeight;
                if (!w || !h) return;
                g.scale.resize(w * dpr, h * dpr);
              });
              ro.observe(host);
              g.__resizeObserver = ro;
              const scene = g.scene.scenes[0];
              if (scene) {
                scene.events.on("create", () => {
                  sceneReadyRef.current = true;
                  pushPayload(g, payload);
                  pushTapped(g, tapped);
                });
                scene.events.on("carto.nodetap", (id) => {
                  onNodeTapRef.current?.(id);
                });
                sceneReadyRef.current = true;
              }
            },
          },
        });
        gameRef.current = game;
        // The canvas is in the DOM the moment Phaser.Game is constructed, so
        // drop the loading overlay now rather than waiting for postBoot — on
        // some mobile browsers the postBoot/create callbacks fire late or
        // never (WebGL context exhaustion) and the overlay would otherwise be
        // permanent.
        if (!cancelled) setLoading(false);
        // The "create" event might have already fired by the time we attach a
        // listener — push the initial payload defensively.
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
      gameRef.current?.__resizeObserver?.disconnect();
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneReadyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once
  }, []);

  // Keep the onNodeTap handler current so the scene event listener always
  // dispatches to the latest closure.
  const onNodeTapRef = useRef(onNodeTap);
  // eslint-disable-next-line react-hooks/immutability -- imperative Phaser bridge reads the latest React callback.
  useEffect(() => { onNodeTapRef.current = onNodeTap; }, [onNodeTap]);

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

function pushPayload(game, payload) {
  const reg = game?.registry;
  if (!reg) return;
  reg.set("carto.payload", payload);
}

function pushTapped(game, tapped) {
  const reg = game?.registry;
  if (!reg) return;
  reg.set("carto.tapped", tapped);
}
