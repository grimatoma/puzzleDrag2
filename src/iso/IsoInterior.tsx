// Minimal "inside the forge" overlay shown after the character enters. Not a
// real interior — just enough to prove the enter/exit loop reads well: a dark
// smithy interior with a glowing furnace and an anvil, reusing the same SVG
// vocabulary + flicker/ember keyframes (src/index.css) as the exterior.

export default function IsoInterior({ onLeave }: { onLeave: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20,
        background: "radial-gradient(circle at 50% 42%, #2a1a10 0%, #140b06 70%)",
        display: "grid",
        placeItems: "center",
        animation: "fadeIn 0.35s ease-out",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <svg viewBox="-120 -110 240 210" style={{ width: "min(80vw, 560px)", height: "auto" }}>
        {/* back wall stone courses */}
        <rect x="-120" y="-110" width="240" height="150" fill="#241c16" />
        <g stroke="rgba(0,0,0,.4)" strokeWidth="1.5" opacity="0.5">
          {[-92, -68, -44, -20, 4, 28].map((y) => (
            <line key={y} x1="-120" y1={y} x2="120" y2={y} />
          ))}
        </g>
        {/* floor */}
        <polygon points="-120,40 120,40 120,100 -120,100" fill="#1a120c" />

        {/* furnace hood + glowing mouth */}
        <path d="M-52,-40 L-40,-86 L40,-86 L52,-40 Z" fill="#3a2a1c" />
        <rect x="-58" y="-40" width="116" height="14" fill="#2c1f14" />
        <path d="M-34,-2 L-34,-40 a34,34 0 0 1 68,0 L34,-2 Z" fill="#100804" />
        <ellipse
          cx="0"
          cy="-18"
          rx="30"
          ry="20"
          fill="#ff8a28"
          opacity="0.78"
          style={{ animation: "flicker 2.2s ease-in-out infinite", transformOrigin: "0px -18px" }}
        />
        <g style={{ animation: "flicker 1.5s ease-in-out infinite", transformOrigin: "0px -10px" }}>
          <path d="M-22,-2 Q-12,-40 0,-26 Q12,-40 22,-2 Z" fill="#d4651f" />
        </g>
        <g style={{ animation: "flicker 1.05s 0.2s ease-in-out infinite", transformOrigin: "0px -6px" }}>
          <path d="M-12,-2 Q-6,-32 0,-22 Q6,-32 12,-2 Z" fill="#ffc24a" />
        </g>
        {/* embers rising */}
        {[0, 0.7, 1.4, 2.1].map((d, i) => (
          <circle
            key={i}
            cx={i % 2 ? 8 : -8}
            cy={-2}
            r="1.4"
            fill="#ffb14a"
            style={{
              "--sx": `${i % 2 ? 10 : -10}px`,
              animation: `ember 2.6s ${d}s ease-out infinite`,
              transformOrigin: `${i % 2 ? 8 : -8}px -2px`,
            } as React.CSSProperties}
          />
        ))}

        {/* anvil on a stump, foreground */}
        <g transform="translate(-64 56)">
          <ellipse cx="0" cy="18" rx="22" ry="6" fill="rgba(0,0,0,.45)" />
          <rect x="-14" y="-2" width="28" height="20" fill="#5a3a1f" />
          <ellipse cx="0" cy="-2" rx="14" ry="4" fill="#3f2814" />
          <rect x="-16" y="-16" width="32" height="14" rx="2" fill="#5b5346" />
          <path d="M16,-12 L34,-10 Q37,-7 34,-4 L16,-4 Z" fill="#3a3530" />
          <rect x="-18" y="-6" width="36" height="5" rx="1" fill="#3a3530" />
        </g>

        {/* tool rack on the right wall */}
        <g transform="translate(74 8)" stroke="#5b5346" strokeWidth="3" strokeLinecap="round">
          <line x1="0" y1="-30" x2="14" y2="-6" />
          <line x1="14" y1="-30" x2="28" y2="-6" />
          <line x1="-2" y1="-26" x2="22" y2="6" />
        </g>
      </svg>

      <button
        onClick={onLeave}
        style={{
          position: "fixed",
          bottom: 28,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#d6612a",
          color: "white",
          border: "none",
          padding: "10px 20px",
          borderRadius: "8px",
          fontSize: "15px",
          cursor: "pointer",
          boxShadow: "0 4px 14px rgba(0,0,0,.4)",
        }}
      >
        ← Leave the forge (Esc)
      </button>
    </div>
  );
}
