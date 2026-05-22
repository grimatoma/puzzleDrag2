import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { onBurst, getCoinAnchorRect } from "./rewardEvents.js";

const LIFE_MS = 900;
let nextId = 1;

export default function RewardChipsLayer() {
  const [chips, setChips] = useState([]);

  useEffect(() => {
    const off = onBurst((e) => {
      const { pageX, pageY, coins } = e.detail;
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

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[150]" aria-hidden="true">
      {chips.map((c) => (
        <span
          key={c.id}
          className="reward-trajectory-chip"
          style={{
            left: c.startX,
            top: c.startY,
            "--tx": `${c.dx}px`,
            "--ty": `${c.dy}px`,
          }}
        >
          +{c.coins.toLocaleString()}
        </span>
      ))}
    </div>,
    document.body,
  );
}
