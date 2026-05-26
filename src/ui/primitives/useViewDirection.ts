import { useEffect, useRef } from "react";

// Heuristic: "town" is the home view. Going TO town reads as coming back
// (slide-down); going FROM town to anything else reads as going deeper
// (slide-up). Sibling-to-sibling jumps (inventory ↔ craft ↔ map) all
// slide up so there's a consistent forward-feel inside the feature shelf.
export function useViewDirection(view: string) {
  const prevRef = useRef(view);
  const direction = view === "town" ? "down" : "up";
  useEffect(() => {
    prevRef.current = view;
  }, [view]);
  return direction;
}
