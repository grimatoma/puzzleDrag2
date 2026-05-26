import { useEffect, useRef, useState } from "react";

let nextChipId = 1;

interface ReceiptChip {
  id: number;
  delta: number;
}

interface UseReceiptChipsOpts {
  lifetimeMs?: number;
  sign?: "gain" | "loss" | "either";
}

export function useReceiptChips(value: number, opts: UseReceiptChipsOpts = {}): ReceiptChip[] {
  const { lifetimeMs = 1100, sign = "gain" } = opts;
  const [chips, setChips] = useState<ReceiptChip[]>([]);
  const lastRef = useRef(value);

  useEffect(() => {
    const prev = lastRef.current;
    if (value === prev) return;
    const delta = value - prev;
    lastRef.current = value;
    const matches = sign === "gain" ? delta > 0 : sign === "loss" ? delta < 0 : delta !== 0;
    if (!matches) return;
    const id = nextChipId++;
    setChips((c) => [...c, { id, delta }]);
    const timer = setTimeout(
      () => setChips((c) => c.filter((x) => x.id !== id)),
      lifetimeMs,
    );
    return () => clearTimeout(timer);
  }, [value, sign, lifetimeMs]);

  return chips;
}
