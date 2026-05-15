import { svgState, Shadow } from "./helpers.jsx";

export default function FishmongerIllustration({ isBuilt }) {
  const { f, lit } = svgState(isBuilt);
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <Shadow />
      <rect x="70" y="14" width="8" height="22" rx="1" fill="#6a6a78" />
      <rect x="68" y="12" width="12" height="4" rx="1" fill="#4a4a58" />
      <polygon points="6,38 50,12 94,38" fill="#3a4a68" />
      <polygon points="6,38 50,12 94,38" fill="none" stroke="#1a2a48" strokeWidth="1.5" />
      <line x1="50" y1="12" x2="28" y2="25" stroke="#1a2a48" strokeWidth="1" opacity="0.55" />
      <line x1="50" y1="12" x2="72" y2="25" stroke="#1a2a48" strokeWidth="1" opacity="0.55" />
      <rect x="8" y="38" width="84" height="60" rx="2" fill="#9aa8c0" />
      <line x1="8" y1="52" x2="92" y2="52" stroke="rgba(0,0,0,.08)" strokeWidth="1" />
      <line x1="8" y1="68" x2="92" y2="68" stroke="rgba(0,0,0,.08)" strokeWidth="1" />
      <line x1="8" y1="84" x2="92" y2="84" stroke="rgba(0,0,0,.08)" strokeWidth="1" />
      <rect x="8" y="56" width="84" height="10" fill="#c83838" />
      {[14, 26, 38, 50, 62, 74, 86].map((x) => (
        <rect key={x} x={x} y="56" width="6" height="10" fill="#f4f0e6" />
      ))}
      <rect x="6" y="54" width="88" height="4" rx="1" fill="#6a4a2a" />
      <rect x="6" y="64" width="88" height="3" rx="1" fill="#6a4a2a" />
      <rect x="14" y="42" width="14" height="10" rx="1" fill={lit} />
      <line x1="21" y1="42" x2="21" y2="52" stroke="#7a6a4a" strokeWidth="1" />
      <line x1="14" y1="47" x2="28" y2="47" stroke="#7a6a4a" strokeWidth="1" />
      <rect x="14" y="42" width="14" height="10" rx="1" fill="none" stroke="#7a6a4a" strokeWidth="1.2" />
      <rect x="72" y="42" width="14" height="10" rx="1" fill={lit} />
      <line x1="79" y1="42" x2="79" y2="52" stroke="#7a6a4a" strokeWidth="1" />
      <line x1="72" y1="47" x2="86" y2="47" stroke="#7a6a4a" strokeWidth="1" />
      <rect x="72" y="42" width="14" height="10" rx="1" fill="none" stroke="#7a6a4a" strokeWidth="1.2" />
      <rect x="14" y="70" width="32" height="18" rx="1" fill="#cfd8e0" />
      <rect x="14" y="70" width="32" height="18" rx="1" fill="none" stroke="#6a7280" strokeWidth="1.2" />
      <rect x="14" y="70" width="32" height="3" fill="#e0e8ee" />
      {isBuilt && <>
        <path d="M18,80 Q22,76 28,80 Q26,82 22,82 Q24,80 22,79 Q20,80 18,80 Z" fill="#7aa8c8" />
        <circle cx="20" cy="79" r="0.6" fill="#1a2a48" />
        <path d="M30,82 Q34,78 40,82 Q38,84 34,84 Q36,82 34,81 Q32,82 30,82 Z" fill="#a8c8d8" />
        <circle cx="32" cy="81" r="0.6" fill="#1a2a48" />
        <path d="M22,86 Q26,82 32,86 Q30,88 26,88 Q28,86 26,85 Q24,86 22,86 Z" fill="#8ab8c8" />
      </>}
      <rect x="14" y="88" width="32" height="10" fill="#8a6a4a" />
      <rect x="14" y="88" width="32" height="10" fill="none" stroke="#5a3a1a" strokeWidth="1" />
      <line x1="22" y1="88" x2="22" y2="98" stroke="#5a3a1a" strokeWidth="0.6" opacity="0.5" />
      <line x1="30" y1="88" x2="30" y2="98" stroke="#5a3a1a" strokeWidth="0.6" opacity="0.5" />
      <line x1="38" y1="88" x2="38" y2="98" stroke="#5a3a1a" strokeWidth="0.6" opacity="0.5" />
      <rect x="56" y="74" width="26" height="24" rx="1" fill="#5a4030" />
      <rect x="56" y="74" width="26" height="24" rx="1" fill="none" stroke="#3a2018" strokeWidth="1.5" />
      <line x1="69" y1="74" x2="69" y2="98" stroke="#3a2018" strokeWidth="1" />
      <circle cx="64" cy="86" r="1.5" fill="#c8923a" />
      <circle cx="74" cy="86" r="1.5" fill="#c8923a" />
      <rect x="8" y="38" width="84" height="60" rx="2" fill="none" stroke="#5a6878" strokeWidth="2" />
      {isBuilt && <ellipse cx="78" cy="32" rx="6" ry="2" fill="#f4f0e6" opacity="0.5" />}
    </svg>
  );
}
