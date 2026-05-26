import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { onBurst, getCoinAnchorRect } from "./rewardEvents.js";

const LIFE_MS = 900;
let nextId = 1;

interface Chip {
  id: number;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  coins: number;
}

export default function RewardChipsLayer() {
  const [chips, setChips] = useState<Chip[]>([]);

  useEffect(() => {
    const off = onBurst((e) => {
      const { pageX, pageY, coins } = e.detail as { pageX: number; pageY: number; coins: number };
      const targetRect = getCoinAnchorRect();
      const targetX = targetRect
        ? targetRect.left + targetRect.width / 2
        : (typeof window !== "undefined" ? window.innerWidth - 120 : pageX);
      const targetY = targetRect
        ? targetRect.top + targetRect.height / 2
        : 24;
      const id = nextId++;
      const chip = {
        id,
        startX: pageX,
        startY: pageY,
        dx: targetX - pageX,
        dy: targetY - pageY,
        coins,
      };
      setChips((c) => [...c, chip]);
      setTimeout(() => setChips((c) => c.filter((x) => x.id !== id)), LIFE_MS);
    });
    return off;
  }, []);

  // Render nothing (no DOM node at all) when no chips are active.
  // A persistent fixed-inset-0 overlay, even with pointer-events:none, can
  // block touch events on iOS Safari — so we only mount the portal when
  // there is actually something to show.
  if (chips.length === 0 || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[150]" aria-hidden="true">
      {chips.map((c) => (
        <span
          key={c.id}
          className="reward-trajectory-chip"
          style={{
            left: c.startX,
            top: c.startY,
            // CSS custom properties aren't part of CSSProperties' index signature
            ["--tx" as string]: `${c.dx}px`,
            ["--ty" as string]: `${c.dy}px`,
          } as CSSProperties}
        >
          +{c.coins.toLocaleString()}
        </span>
      ))}
    </div>,
    document.body,
  );
}
