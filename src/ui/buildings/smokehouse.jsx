import { svgState, Shadow } from "./helpers.jsx";

export default function SmokehouseIllustration({ isBuilt }) {
  const { f, glow } = svgState(isBuilt);
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <Shadow cx={50} rx={36} />
      <rect x="34" y="6" width="14" height="34" rx="1" fill="#3a2820" />
      <rect x="32" y="4" width="18" height="5" rx="1" fill="#1a1008" />
      <rect x="36" y="10" width="10" height="3" fill="#1a1008" />
      <polygon points="10,44 50,22 90,44" fill="#4a3020" />
      <polygon points="10,44 50,22 90,44" fill="none" stroke="#2a1808" strokeWidth="1.5" />
      <line x1="50" y1="22" x2="30" y2="33" stroke="#2a1808" strokeWidth="1" opacity="0.55" />
      <line x1="50" y1="22" x2="70" y2="33" stroke="#2a1808" strokeWidth="1" opacity="0.55" />
      <rect x="12" y="44" width="76" height="54" rx="2" fill="#6a4838" />
      <rect x="12" y="44" width="76" height="54" rx="2" fill="none" stroke="#3a2008" strokeWidth="2" />
      <line x1="12" y1="58" x2="88" y2="58" stroke="#3a2008" strokeWidth="0.6" opacity="0.35" />
      <line x1="12" y1="72" x2="88" y2="72" stroke="#3a2008" strokeWidth="0.6" opacity="0.35" />
      <line x1="12" y1="86" x2="88" y2="86" stroke="#3a2008" strokeWidth="0.6" opacity="0.35" />
      <line x1="28" y1="44" x2="28" y2="98" stroke="#3a2008" strokeWidth="0.6" opacity="0.35" />
      <line x1="50" y1="44" x2="50" y2="98" stroke="#3a2008" strokeWidth="0.6" opacity="0.35" />
      <line x1="72" y1="44" x2="72" y2="98" stroke="#3a2008" strokeWidth="0.6" opacity="0.35" />
      <rect x="18" y="50" width="18" height="14" rx="1" fill={glow} />
      <rect x="18" y="50" width="18" height="14" rx="1" fill="none" stroke="#2a1808" strokeWidth="1.2" />
      <line x1="18" y1="55" x2="36" y2="55" stroke="#2a1808" strokeWidth="0.6" opacity="0.6" />
      {isBuilt && <>
        <path d="M22,56 Q23,52 25,56 Q26,54 28,56" fill="none" stroke="#1a1008" strokeWidth="1" />
        <ellipse cx="22" cy="60" rx="1.4" ry="2" fill="#c8a070" />
        <ellipse cx="28" cy="61" rx="1.2" ry="1.8" fill="#a88060" />
        <ellipse cx="33" cy="59" rx="1.4" ry="2" fill="#c8a070" />
      </>}
      <rect x="64" y="50" width="18" height="14" rx="1" fill={glow} />
      <rect x="64" y="50" width="18" height="14" rx="1" fill="none" stroke="#2a1808" strokeWidth="1.2" />
      <line x1="64" y1="55" x2="82" y2="55" stroke="#2a1808" strokeWidth="0.6" opacity="0.6" />
      {isBuilt && <>
        <ellipse cx="68" cy="60" rx="1.4" ry="2" fill="#c8a070" />
        <ellipse cx="73" cy="61" rx="1.2" ry="1.8" fill="#a88060" />
        <ellipse cx="78" cy="59" rx="1.4" ry="2" fill="#c8a070" />
      </>}
      <path d="M38,98 L38,74 L62,74 L62,98 Z" fill="#3a2008" />
      <path d="M38,98 L38,74 L62,74 L62,98 Z" fill="none" stroke="#1a1008" strokeWidth="1.5" />
      <line x1="50" y1="74" x2="50" y2="98" stroke="#1a1008" strokeWidth="1" />
      <rect x="40" y="78" width="8" height="6" rx="0.5" fill={glow} />
      <rect x="52" y="78" width="8" height="6" rx="0.5" fill={glow} />
      <circle cx="46" cy="89" r="1.5" fill="#c8923a" />
      <circle cx="54" cy="89" r="1.5" fill="#c8923a" />
    </svg>
  );
}
