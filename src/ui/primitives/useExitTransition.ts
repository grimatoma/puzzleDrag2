import { useEffect, useRef, useState } from "react";

type Phase = "open" | "exiting" | "closed";

export function useExitTransition(open: boolean, durationMs = 180) {
  const [phase, setPhase] = useState<Phase>(open ? "open" : "closed");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
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
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open, phase, durationMs]);

  const shouldRender = phase !== "closed";
  const exiting = phase === "exiting";
  return { shouldRender, exiting };
}
