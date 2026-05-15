import { svgState, Shadow } from "./helpers.jsx";

export default function PowderStoreIllustration({ isBuilt }) {
  const { f } = svgState(isBuilt);
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <Shadow cx={50} rx={42} />
      <polygon points="10,46 50,24 90,46" fill="#3a3028" />
      <polygon points="10,46 50,24 90,46" fill="none" stroke="#1a1408" strokeWidth="1.5" />
      <rect x="48" y="20" width="4" height="6" fill="#c83020" />
      <polygon points="48,20 56,22 48,24" fill="#c83020" />
      <rect x="13" y="46" width="74" height="52" rx="2" fill="#5c5048" />
      <rect x="13" y="46" width="74" height="52" rx="2" fill="none" stroke="#2a2018" strokeWidth="2" />
      {[0,1,2,3].map((row) => (
        [0,1,2,3,4,5].map((col) => (
          <rect key={`${row}-${col}`} x={15 + col * 12 + (row%2)*6} y={50 + row * 12} width="11" height="11" rx="0.5" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="0.6" />
        ))
      ))}
      <rect x="13" y="58" width="74" height="3" fill="#3a3028" />
      <rect x="13" y="80" width="74" height="3" fill="#3a3028" />
      <rect x="40" y="68" width="20" height="30" rx="1" fill="#3a3028" />
      <rect x="40" y="68" width="20" height="30" rx="1" fill="none" stroke="#1a1208" strokeWidth="1.5" />
      <rect x="38" y="68" width="24" height="3" fill="#5a5048" />
      <line x1="50" y1="68" x2="50" y2="98" stroke="#1a1208" strokeWidth="1" />
      <circle cx="46" cy="83" r="1.4" fill="#c8923a" />
      <circle cx="54" cy="83" r="1.4" fill="#c8923a" />
      <rect x="20" y="56" width="10" height="6" rx="1" fill="#1a1208" />
      <line x1="22" y1="58" x2="28" y2="58" stroke={isBuilt ? "#ffd86b" : "#3a2820"} strokeWidth="0.8" />
      <line x1="22" y1="60" x2="28" y2="60" stroke={isBuilt ? "#ffd86b" : "#3a2820"} strokeWidth="0.8" />
      <rect x="70" y="56" width="10" height="6" rx="1" fill="#1a1208" />
      <line x1="72" y1="58" x2="78" y2="58" stroke={isBuilt ? "#ffd86b" : "#3a2820"} strokeWidth="0.8" />
      <line x1="72" y1="60" x2="78" y2="60" stroke={isBuilt ? "#ffd86b" : "#3a2820"} strokeWidth="0.8" />
      <ellipse cx="20" cy="92" rx="6" ry="2.5" fill="#3a2818" opacity="0.6" />
      <rect x="14" y="76" width="12" height="16" rx="1" fill="#5a3818" />
      <ellipse cx="20" cy="76" rx="6" ry="2.2" fill="#7a4828" />
      <line x1="14" y1="82" x2="26" y2="82" stroke="#2a1808" strokeWidth="1" />
      <line x1="14" y1="88" x2="26" y2="88" stroke="#2a1808" strokeWidth="1" />
      <ellipse cx="82" cy="92" rx="6" ry="2.5" fill="#3a2818" opacity="0.6" />
      <rect x="76" y="76" width="12" height="16" rx="1" fill="#5a3818" />
      <ellipse cx="82" cy="76" rx="6" ry="2.2" fill="#7a4828" />
      <line x1="76" y1="82" x2="88" y2="82" stroke="#2a1808" strokeWidth="1" />
      <line x1="76" y1="88" x2="88" y2="88" stroke="#2a1808" strokeWidth="1" />
      <circle cx="50" cy="38" r="3.5" fill={isBuilt ? "#f8d030" : "#5a4830"} />
      <text x="50" y="40.5" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#1a1208">!</text>
    </svg>
  );
}
