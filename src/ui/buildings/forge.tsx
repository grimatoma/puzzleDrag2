import { svgState, Shadow } from "./helpers.jsx";

export default function ForgeIllustration({ isBuilt }) {
  const { f, glow } = svgState(isBuilt);
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <Shadow />
      <rect x="66" y="4" width="13" height="36" rx="2" fill="#4a4848" />
      <rect x="64" y="2" width="17" height="6" rx="1" fill="#383838" />
      <rect x="21" y="10" width="10" height="30" rx="1" fill="#4a4848" />
      <rect x="19" y="8" width="14" height="5" rx="1" fill="#383838" />
      <rect x="6" y="38" width="88" height="59" rx="3" fill="#6a7278" />
      <line x1="6" y1="52" x2="94" y2="52" stroke="rgba(255,255,255,.06)" strokeWidth="1" />
      <line x1="6" y1="66" x2="94" y2="66" stroke="rgba(255,255,255,.06)" strokeWidth="1" />
      <line x1="6" y1="80" x2="94" y2="80" stroke="rgba(255,255,255,.06)" strokeWidth="1" />
      <line x1="6" y1="93" x2="94" y2="93" stroke="rgba(255,255,255,.06)" strokeWidth="1" />
      <rect x="4" y="36" width="92" height="8" rx="2" fill="#5a6068" />
      <rect x="4" y="36" width="92" height="8" rx="2" fill="none" stroke="#3a4048" strokeWidth="1.5" />
      <path d="M26,97 L26,67 Q26,52 50,52 Q74,52 74,67 L74,97 Z" fill={glow} />
      {isBuilt && <path d="M28,97 L28,68 Q28,55 50,55 Q72,55 72,68 L72,97 Z" fill="rgba(255,140,40,.4)" />}
      <path d="M26,67 Q26,52 50,52 Q74,52 74,67" fill="none" stroke="#2a2020" strokeWidth="2.5" />
      {isBuilt && <>
        <rect x="40" y="83" width="20" height="4" rx="1" fill="#1a1a1a" />
        <path d="M38,83 Q50,77 62,83 Z" fill="#1a1a1a" />
        <rect x="44" y="87" width="12" height="7" rx="1" fill="#1a1a1a" />
      </>}
      <rect x="9" y="56" width="14" height="11" rx="1" fill={glow} />
      <rect x="9" y="56" width="14" height="11" rx="1" fill="none" stroke="#3a4048" strokeWidth="1.5" />
      <rect x="77" y="56" width="14" height="11" rx="1" fill={glow} />
      <rect x="77" y="56" width="14" height="11" rx="1" fill="none" stroke="#3a4048" strokeWidth="1.5" />
      <rect x="6" y="38" width="88" height="59" rx="3" fill="none" stroke="#3a4048" strokeWidth="2" />
    </svg>
  );
}
