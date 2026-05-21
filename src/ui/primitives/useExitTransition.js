import { useEffect, useRef, useState } from "react";

export function useExitTransition(open, durationMs = 180) {
  const [phase, setPhase] = useState(open ? "open" : "closed");
  const timerRef = useRef(0);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (open) {
      if (phase !== "open") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- prop-driven transition: reopen cancels in-flight exit
        setPhase("open");
      }
      return;
    }
    if (phase === "open") {
      setPhase("exiting");
      timerRef.current = setTimeout(() => setPhase("closed"), durationMs);
    }
    return () => clearTimeout(timerRef.current);
  }, [open, phase, durationMs]);

  const shouldRender = phase !== "closed";
  const exiting = phase === "exiting";
  return { shouldRender, exiting };
}
