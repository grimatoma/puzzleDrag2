import { useEffect, useRef, useState } from "react";

const isVisualTest = () =>
  typeof document !== "undefined" &&
  document.documentElement?.dataset?.visualTest === "true";

export function useCountUp(value, opts = {}) {
  const {
    minDuration = 200,
    maxDuration = 900,
    perUnitMs = 14,
    initial = null,
  } = opts;

  const [animated, setAnimated] = useState(initial ?? value);
  const [pulse, setPulse] = useState({ direction: null, gen: 0 });
  const fromRef = useRef(initial ?? value);
  const rafRef = useRef(0);
  const pulseTimerRef = useRef(0);
  const clearTimerRef = useRef(0);

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
    const going = to > from ? "gain" : "loss";

    cancelAnimationFrame(rafRef.current);
    const tick = (now) => {
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

    clearTimeout(pulseTimerRef.current);
    clearTimeout(clearTimerRef.current);
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
    clearTimeout(pulseTimerRef.current);
    clearTimeout(clearTimerRef.current);
  }, []);

  return { display, pulse: pulse.direction, pulseKey: pulse.gen };
}
