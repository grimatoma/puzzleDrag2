import { svgState, Shadow } from "./helpers.jsx";

export default function HarborDockIllustration({ isBuilt }) {
  const { f, lit } = svgState(isBuilt);
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <Shadow cx={50} rx={44} />
      <rect x="0" y="68" width="100" height="32" fill="#3a5a82" />
      <path d="M0,74 Q12,71 24,74 T48,74 T72,74 T96,74 L100,74 L100,78 L0,78 Z" fill="#5a7aa6" opacity="0.7" />
      <path d="M0,82 Q15,79 30,82 T60,82 T90,82 L100,82 L100,86 L0,86 Z" fill="#7a9ac6" opacity="0.55" />
      <path d="M0,90 Q14,87 28,90 T56,90 T84,90 L100,90 L100,94 L0,94 Z" fill="#9ab8d8" opacity="0.4" />
      <rect x="14" y="62" width="6" height="38" fill="#6a6a72" />
      <ellipse cx="17" cy="62" rx="3.5" ry="1.4" fill="#7a7a82" />
      <rect x="32" y="60" width="6" height="40" fill="#6a6a72" />
      <ellipse cx="35" cy="60" rx="3.5" ry="1.4" fill="#7a7a82" />
      <rect x="50" y="62" width="6" height="38" fill="#6a6a72" />
      <ellipse cx="53" cy="62" rx="3.5" ry="1.4" fill="#7a7a82" />
      <rect x="68" y="60" width="6" height="40" fill="#6a6a72" />
      <ellipse cx="71" cy="60" rx="3.5" ry="1.4" fill="#7a7a82" />
      <rect x="86" y="62" width="6" height="38" fill="#6a6a72" />
      <ellipse cx="89" cy="62" rx="3.5" ry="1.4" fill="#7a7a82" />
      <rect x="4" y="56" width="92" height="10" rx="1" fill="#8a6038" />
      <rect x="4" y="56" width="92" height="10" rx="1" fill="none" stroke="#5a3818" strokeWidth="1" />
      {[16, 28, 40, 52, 64, 76, 88].map((x) => (
        <line key={x} x1={x} y1="56" x2={x} y2="66" stroke="#5a3818" strokeWidth="0.6" opacity="0.6" />
      ))}
      <rect x="8" y="42" width="6" height="14" fill="#4a4a52" />
      <ellipse cx="11" cy="42" rx="4" ry="1.4" fill="#5a5a62" />
      <ellipse cx="11" cy="42" rx="4" ry="1.4" fill="none" stroke="#2a2a32" strokeWidth="0.6" />
      <path d="M14,46 Q22,42 30,48" fill="none" stroke="#a89070" strokeWidth="1.4" />
      <path d="M24,52 L62,52 Q68,60 60,60 L24,60 Q18,60 24,52 Z" fill={isBuilt ? "#8a4828" : "#4a3828"} />
      <path d="M24,52 L62,52 Q68,60 60,60 L24,60 Q18,60 24,52 Z" fill="none" stroke="#5a2818" strokeWidth="1" />
      <line x1="26" y1="56" x2="60" y2="56" stroke="#5a2818" strokeWidth="0.5" opacity="0.6" />
      <line x1="42" y1="52" x2="42" y2="38" stroke="#5a4828" strokeWidth="1.2" />
      {isBuilt && <polygon points="42,38 54,42 42,48" fill="#e8d8a0" stroke="#9a7a3a" strokeWidth="0.6" />}
      <line x1="92" y1="56" x2="92" y2="34" stroke="#4a3828" strokeWidth="1.5" />
      <rect x="88" y="28" width="8" height="8" rx="1" fill={lit} />
      <line x1="88" y1="32" x2="96" y2="32" stroke="#3a2818" strokeWidth="0.5" />
      <line x1="92" y1="28" x2="92" y2="36" stroke="#3a2818" strokeWidth="0.5" />
      <rect x="88" y="28" width="8" height="8" rx="1" fill="none" stroke="#3a2818" strokeWidth="0.8" />
      <rect x="87" y="26" width="10" height="3" rx="0.5" fill="#3a2818" />
      {isBuilt && <>
        <path d="M56,22 Q60,19 64,22 Q60,20 56,22" fill="#3a3a48" />
        <path d="M68,16 Q72,13 76,16 Q72,14 68,16" fill="#3a3a48" />
      </>}
    </svg>
  );
}
