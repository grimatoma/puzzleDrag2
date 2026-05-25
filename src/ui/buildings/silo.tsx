import { svgState, Shadow } from "./helpers.jsx";

export default function SiloIllustration({ isBuilt }) {
  const { f, lit } = svgState(isBuilt);
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <Shadow cx={54} rx={36} />
      <rect x="14" y="68" width="32" height="30" rx="2" fill="#8a6840" />
      <rect x="14" y="68" width="32" height="30" rx="2" fill="none" stroke="#5a3818" strokeWidth="1.5" />
      <rect x="14" y="74" width="32" height="2" fill="#5a3818" opacity="0.5" />
      <rect x="14" y="86" width="32" height="2" fill="#5a3818" opacity="0.5" />
      <rect x="22" y="80" width="16" height="18" rx="1" fill="#3a2818" />
      <line x1="30" y1="80" x2="30" y2="98" stroke="#1a1208" strokeWidth="0.8" />
      <circle cx="34" cy="89" r="1.2" fill="#c8923a" />
      <rect x="50" y="36" width="36" height="62" rx="2" fill="#c0b8a0" />
      <rect x="50" y="36" width="36" height="62" rx="2" fill="none" stroke="#7a7260" strokeWidth="1.5" />
      <line x1="50" y1="48" x2="86" y2="48" stroke="#9a9282" strokeWidth="1" />
      <line x1="50" y1="60" x2="86" y2="60" stroke="#9a9282" strokeWidth="1" />
      <line x1="50" y1="72" x2="86" y2="72" stroke="#9a9282" strokeWidth="1" />
      <line x1="50" y1="84" x2="86" y2="84" stroke="#9a9282" strokeWidth="1" />
      <path d="M48,36 Q68,16 88,36 Z" fill="#7a8a8a" />
      <path d="M48,36 Q68,16 88,36 Z" fill="none" stroke="#5a6a6a" strokeWidth="1.5" />
      <line x1="58" y1="28" x2="78" y2="28" stroke="#5a6a6a" strokeWidth="0.8" opacity="0.6" />
      <rect x="66" y="14" width="4" height="6" fill="#5a6a6a" />
      <rect x="64" y="12" width="8" height="3" fill="#3a4a4a" />
      <rect x="60" y="44" width="14" height="8" rx="1" fill={lit} />
      <line x1="60" y1="48" x2="74" y2="48" stroke="#8a6a3a" strokeWidth="0.8" />
      <rect x="60" y="44" width="14" height="8" rx="1" fill="none" stroke="#8a6a3a" strokeWidth="1" />
      <rect x="60" y="78" width="14" height="20" rx="1" fill="#5a3818" />
      <rect x="60" y="78" width="14" height="20" rx="1" fill="none" stroke="#3a2008" strokeWidth="1.2" />
      <line x1="67" y1="78" x2="67" y2="98" stroke="#3a2008" strokeWidth="1" />
      <circle cx="71" cy="88" r="1.2" fill="#c8923a" />
      <rect x="40" y="58" width="14" height="6" rx="1" fill="#7a6840" />
      <rect x="40" y="58" width="14" height="6" rx="1" fill="none" stroke="#4a3820" strokeWidth="0.8" />
      <line x1="40" y1="64" x2="48" y2="74" stroke="#7a6840" strokeWidth="2" />
      <line x1="48" y1="74" x2="48" y2="68" stroke="#4a3820" strokeWidth="0.8" opacity="0.6" />
      {isBuilt && <>
        <ellipse cx="44" cy="76" rx="3" ry="1.5" fill="#e8c060" opacity="0.7" />
        <circle cx="42" cy="78" r="0.8" fill="#c89838" />
        <circle cx="46" cy="79" r="0.7" fill="#c89838" />
      </>}
    </svg>
  );
}
