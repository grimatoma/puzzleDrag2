import { svgState, Shadow } from "./helpers.jsx";

export default function BakeryIllustration({ isBuilt }) {
  const { f } = svgState(isBuilt);
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <Shadow />
      <rect x="18" y="17" width="9" height="22" rx="1" fill="#8a6a5a" />
      <rect x="16" y="15" width="13" height="5" rx="1" fill="#6a5040" />
      <rect x="73" y="12" width="9" height="27" rx="1" fill="#8a6a5a" />
      <rect x="71" y="10" width="13" height="5" rx="1" fill="#6a5040" />
      <polygon points="6,40 50,8 94,40" fill="#7a3a1a" />
      <line x1="6" y1="40" x2="28" y2="24" stroke="#5a2a10" strokeWidth="1.5" opacity="0.6" />
      <line x1="50" y1="8" x2="28" y2="24" stroke="#5a2a10" strokeWidth="1.5" opacity="0.6" />
      <line x1="94" y1="40" x2="72" y2="24" stroke="#5a2a10" strokeWidth="1.5" opacity="0.6" />
      <rect x="8" y="40" width="84" height="58" rx="3" fill="#c88c60" />
      <line x1="8" y1="53" x2="92" y2="53" stroke="rgba(0,0,0,.08)" strokeWidth="1" />
      <line x1="8" y1="66" x2="92" y2="66" stroke="rgba(0,0,0,.08)" strokeWidth="1" />
      <line x1="8" y1="79" x2="92" y2="79" stroke="rgba(0,0,0,.08)" strokeWidth="1" />
      <line x1="8" y1="92" x2="92" y2="92" stroke="rgba(0,0,0,.08)" strokeWidth="1" />
      <path d="M14,98 L14,57 Q14,44 28,44 Q42,44 42,57 L42,98 Z" fill={isBuilt ? "#ffe0a0" : "#7a6a5a"} />
      <path d="M14,57 Q14,44 28,44 Q42,44 42,57" fill="none" stroke="#8a5a3a" strokeWidth="2" />
      {isBuilt && <>
        <ellipse cx="22" cy="78" rx="6" ry="4" fill="#c87840" />
        <ellipse cx="34" cy="81" rx="5" ry="3.5" fill="#c87840" />
      </>}
      <rect x="50" y="52" width="36" height="9" rx="3" fill="#c8923a" />
      <rect x="50" y="52" width="36" height="9" rx="3" fill="none" stroke="#8a5a1a" strokeWidth="1" />
      <rect x="56" y="71" width="24" height="27" rx="2" fill="#7a4a2a" />
      <rect x="56" y="71" width="24" height="27" rx="2" fill="none" stroke="#5a3a1a" strokeWidth="1.5" />
      <circle cx="76" cy="85" r="2" fill="#c8923a" />
      <rect x="8" y="40" width="84" height="58" rx="3" fill="none" stroke="#8a5a3a" strokeWidth="2" />
    </svg>
  );
}
