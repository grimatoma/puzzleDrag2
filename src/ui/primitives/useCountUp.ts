import { useEffect, useRef, useState } from "react";

const isVisualTest = () =>
  typeof document !== "undefined" &&
  document.documentElement?.dataset?.visualTest === "true";

interface CountUpOpts {
  minDuration?: number;
  maxDuration?: number;
  perUnitMs?: number;
  initial?: number | null;
}

interface PulseState {
  direction: "gain" | "loss" | null;
  gen: number;
}

export function useCountUp(value: number, opts: CountUpOpts = {}) {
  const {
    minDuration = 200,
    maxDuration = 900,
    perUnitMs = 14,
    initial = null,
  } = opts;

  const [animated, setAnimated] = useState<number>(initial ?? value);
  const [pulse, setPulse] = useState<PulseState>({ direction: null, gen: 0 });
  const fromRef = useRef<number>(initial ?? value);
  const rafRef = useRef<number>(0);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const visualTest = isVisualTest();
  const display = visualTest ? value : animated;

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    if (visualTest) {
      fromRef.current = to;
      return;
    }

    const delta = Math.abs(to - from);
    const dur = Math.min(maxDuration, Math.max(minDuration, delta * perUnitMs));
    const start = performance.now();
    const going: "gain" | "loss" = to > from ? "gain" : "loss";

    cancelAnimationFrame(rafRef.current);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (to - from) * eased;
      setAnimated(going === "gain" ? Math.ceil(v) : Math.floor(v));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setAnimated(to);
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    pulseTimerRef.current = setTimeout(
      () => setPulse((p) => ({ direction: going, gen: p.gen + 1 })),
      0,
    );
    clearTimerRef.current = setTimeout(
      () => setPulse((p) => ({ direction: null, gen: p.gen + 1 })),
      520,
    );

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [value, minDuration, maxDuration, perUnitMs, visualTest]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
  }, []);

  return { display, pulse: pulse.direction, pulseKey: pulse.gen };
}
