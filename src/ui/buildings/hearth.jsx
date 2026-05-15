import { svgState, Shadow } from "./helpers.jsx";

export default function HearthIllustration({ isBuilt }) {
  const { f, lit } = svgState(isBuilt);
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <Shadow />
      <rect x="63" y="13" width="10" height="26" rx="1" fill="#8a7a6a" />
      <rect x="61" y="11" width="14" height="5" rx="1" fill="#6a5a4a" />
      <polygon points="7,44 50,12 93,44" fill="#8a3a1a" />
      <line x1="7" y1="44" x2="29" y2="28" stroke="#6a2a10" strokeWidth="1.5" opacity="0.6" />
      <line x1="50" y1="12" x2="29" y2="28" stroke="#6a2a10" strokeWidth="1.5" opacity="0.6" />
      <line x1="93" y1="44" x2="71" y2="28" stroke="#6a2a10" strokeWidth="1.5" opacity="0.6" />
      <rect x="9" y="44" width="82" height="54" rx="3" fill="#c8a87a" />
      <line x1="9" y1="58" x2="91" y2="58" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
      <line x1="9" y1="71" x2="91" y2="71" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
      <line x1="9" y1="84" x2="91" y2="84" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
      <rect x="13" y="49" width="20" height="16" rx="2" fill={lit} />
      <line x1="23" y1="49" x2="23" y2="65" stroke="#8a6a3a" strokeWidth="1" />
      <line x1="13" y1="57" x2="33" y2="57" stroke="#8a6a3a" strokeWidth="1" />
      <rect x="13" y="49" width="20" height="16" rx="2" fill="none" stroke="#8a6a3a" strokeWidth="1.5" />
      <rect x="67" y="49" width="20" height="16" rx="2" fill={lit} />
      <line x1="77" y1="49" x2="77" y2="65" stroke="#8a6a3a" strokeWidth="1" />
      <line x1="67" y1="57" x2="87" y2="57" stroke="#8a6a3a" strokeWidth="1" />
      <rect x="67" y="49" width="20" height="16" rx="2" fill="none" stroke="#8a6a3a" strokeWidth="1.5" />
      <path d="M38,98 L38,76 A12,12 0 0,1 62,76 L62,98 Z" fill="#7a4a2a" />
      <path d="M38,76 A12,12 0 0,1 62,76" fill="none" stroke="#5a3a1a" strokeWidth="1.5" />
      <circle cx="57" cy="87" r="2" fill="#c8923a" />
      <rect x="9" y="44" width="82" height="54" rx="3" fill="none" stroke="#8a6a3a" strokeWidth="2" />
    </svg>
  );
}
