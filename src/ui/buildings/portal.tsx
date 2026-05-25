import { svgState, Shadow } from "./helpers.jsx";

export default function PortalIllustration({ isBuilt }) {
  const { f } = svgState(isBuilt);
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <Shadow cx={50} rx={38} />
      <ellipse cx="50" cy="96" rx="34" ry="3" fill="#2a1a4a" opacity="0.5" />
      <path d="M22,98 L22,52 A28,28 0 0,1 78,52 L78,98 Z" fill="#3a2a4a" />
      <path d="M22,52 A28,28 0 0,1 78,52" fill="none" stroke="#1a0a2a" strokeWidth="2.5" />
      <path d="M28,98 L28,54 A22,22 0 0,1 72,54 L72,98 Z" fill={isBuilt ? "#5a3aaa" : "#2a1a3a"} opacity={isBuilt ? 0.85 : 1} />
      {isBuilt && <>
        <circle cx="50" cy="68" r="22" fill="#7a4adc" opacity="0.7" />
        <circle cx="50" cy="68" r="16" fill="#9a6afc" opacity="0.6" />
        <circle cx="50" cy="68" r="9" fill="#d8b8ff" opacity="0.85" />
        <circle cx="46" cy="62" r="2" fill="#ffffff" opacity="0.85" />
        <ellipse cx="50" cy="68" rx="20" ry="6" fill="none" stroke="#d8b8ff" strokeWidth="0.8" opacity="0.6" />
        <ellipse cx="50" cy="68" rx="6" ry="20" fill="none" stroke="#d8b8ff" strokeWidth="0.8" opacity="0.6" />
      </>}
      {!isBuilt && <ellipse cx="50" cy="68" rx="14" ry="22" fill="#1a0a1a" opacity="0.6" />}
      <rect x="14" y="50" width="14" height="48" rx="2" fill="#5a4a6a" />
      <rect x="14" y="50" width="14" height="48" rx="2" fill="none" stroke="#2a1a3a" strokeWidth="1.5" />
      <rect x="13" y="48" width="16" height="4" rx="1" fill="#7a6a8a" />
      <rect x="13" y="94" width="16" height="4" rx="1" fill="#7a6a8a" />
      <line x1="14" y1="62" x2="28" y2="62" stroke="#2a1a3a" strokeWidth="0.8" opacity="0.6" />
      <line x1="14" y1="76" x2="28" y2="76" stroke="#2a1a3a" strokeWidth="0.8" opacity="0.6" />
      <rect x="72" y="50" width="14" height="48" rx="2" fill="#5a4a6a" />
      <rect x="72" y="50" width="14" height="48" rx="2" fill="none" stroke="#2a1a3a" strokeWidth="1.5" />
      <rect x="71" y="48" width="16" height="4" rx="1" fill="#7a6a8a" />
      <rect x="71" y="94" width="16" height="4" rx="1" fill="#7a6a8a" />
      <line x1="72" y1="62" x2="86" y2="62" stroke="#2a1a3a" strokeWidth="0.8" opacity="0.6" />
      <line x1="72" y1="76" x2="86" y2="76" stroke="#2a1a3a" strokeWidth="0.8" opacity="0.6" />
      <path d="M14,50 Q50,22 86,50" fill="none" stroke="#5a4a6a" strokeWidth="3" />
      <path d="M14,50 Q50,22 86,50" fill="none" stroke="#2a1a3a" strokeWidth="1.5" />
      <circle cx="50" cy="32" r="3" fill={isBuilt ? "#d8b8ff" : "#3a2a4a"} />
      {isBuilt && <circle cx="50" cy="32" r="5" fill="#9a6afc" opacity="0.4" />}
      <path d="M22,52 A28,28 0 0,1 78,52" fill="none" stroke="#7a6a8a" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}
