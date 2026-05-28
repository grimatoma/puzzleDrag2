// Shared painted-SVG kit for the town building illustrations: a common
// palette plus the animated smoke / steam emitters and the terracotta roof
// tile pattern. Keyframes (`smoke`, `steam`, …) live in src/index.css.

export const PAL = {
  wallLight: "#e8d3a8",
  wallShadow: "#b89f6f",
  wallTop: "#7a5c34",
  timber: "#5a3a1f",
  timberSoft: "#7a5c34",
  stone: "#9a8e72",
  stoneShade: "#5b5346",
  brass: "#e0a83a",
  terracotta: "#b6422c",
  terracottaDark: "#7a1d12",
  ridge: "#f5ecd6",
  eave: "#3a160a",
  sea: "#3a7088",
  seaDark: "#21516a",
  seaFoam: "#cfe4ee",
  seaLight: "#5aa0bd",
  copper: "#5a8a72",
  brick: "#8a4a30",
  brickDark: "#5a2a18",
} as const;

export function Smoke({
  x,
  y,
  scale = 1,
  color = "#e8dcc2",
  count = 3,
  dur = 3.6,
}: {
  x: number;
  y: number;
  scale?: number;
  color?: string;
  count?: number;
  dur?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {Array.from({ length: count }, (_, i) => (
        <circle
          key={i}
          cx="0"
          cy="0"
          r={3 + i * 1.2}
          fill={color}
          style={{
            "--sx": `${i % 2 ? 12 : -8}px`,
            animation: `smoke ${dur}s ${i * 1.1}s ease-out infinite`,
            transformOrigin: "0 0",
            opacity: 0.85,
          }}
        />
      ))}
    </g>
  );
}

export function Steam({
  x,
  y,
  scale = 1,
  count = 4,
}: {
  x: number;
  y: number;
  scale?: number;
  count?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {Array.from({ length: count }, (_, i) => (
        <circle
          key={i}
          cx="0"
          cy="0"
          r={2.4 + (i % 2) * 1.2}
          fill="#fbf7eb"
          style={{
            "--sx": `${i % 2 ? 6 : -6}px`,
            animation: `steam 2.4s ${i * 0.4}s ease-out infinite`,
            transformOrigin: "0 0",
            opacity: 0.85,
          }}
        />
      ))}
    </g>
  );
}

export function RoofTiles({ id, color = PAL.terracotta }: { id: string; color?: string }) {
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width="14" height="6">
      <rect width="14" height="6" fill={color} />
      <path d="M0,5.5 Q3.5,3.5 7,5.5 T14,5.5" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="1.2" />
      <ellipse cx="3.5" cy="2.5" rx="4" ry="1.4" fill="rgba(255,255,255,.08)" />
    </pattern>
  );
}
