import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getPhaserScene } from "../phaserBridge.js";
import type { GameState } from "../types/state.js";

const HOLD_MS = 700;

interface BossShown { key: number }

export default function BossCinematic({ state }: { state: GameState }) {
  const isBoss = state.modal === "boss";
  const [shown, setShown] = useState<BossShown | null>(null);
  const prevBossRef = useRef(isBoss);
  const mountedRef = useRef(false);

  useEffect(() => {
    const wasBoss = prevBossRef.current;
    prevBossRef.current = isBoss;
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (!isBoss || wasBoss) return;
    const key = Math.random();
    setShown({ key });
    const scene = getPhaserScene() as { _shake?: (duration: number, intensity: number) => void } | null;
    scene?._shake?.(360, 0.012);
    const timer = setTimeout(() => setShown(null), HOLD_MS);
    return () => clearTimeout(timer);
  }, [isBoss]);

  if (!shown) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      key={shown.key}
      aria-hidden="true"
      className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center"
    >
      <div className="absolute inset-0 boss-cinematic-vignette" />
      <div className="boss-cinematic-flash" />
    </div>,
    document.body,
  );
}
