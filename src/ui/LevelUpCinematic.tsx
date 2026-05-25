import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const HOLD_MS = 1600;

export default function LevelUpCinematic({ state }: { state: any }) {
  const level = state.level ?? 1;
  const [shown, setShown] = useState<any>(null);
  const prevLevelRef = useRef(level);
  const mountedRef = useRef(false);

  useEffect(() => {
    const prev = prevLevelRef.current;
    prevLevelRef.current = level;
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (level <= prev) return;
    const key = Math.random();
    setShown({ level, key });
    const timer = setTimeout(() => setShown(null), HOLD_MS);
    return () => clearTimeout(timer);
  }, [level]);

  if (!shown) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      key={shown.key}
      aria-live="polite"
      className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center"
    >
      <div className="absolute inset-0 levelup-bg" />
      <div className="absolute levelup-rays" aria-hidden="true" />
      <div className="relative levelup-card text-center">
        <div className="text-cream-soft text-h3 font-bold uppercase tracking-[0.4em] mb-2">
          Level Up
        </div>
        <div
          className="text-[80px] font-bold leading-none m-0 text-gold-bright tabular-nums"
          style={{ textShadow: "0 4px 0 rgba(0,0,0,0.5), 0 0 30px rgba(255,210,72,0.6)" }}
        >
          {shown.level}
        </div>
      </div>
    </div>,
    document.body,
  );
}
