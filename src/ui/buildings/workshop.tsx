import { svgState, Shadow } from "./helpers.jsx";

export default function WorkshopIllustration({ isBuilt }) {
  const { f, lit } = svgState(isBuilt);
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <Shadow cx={50} rx={42} />
      <polygon points="6,40 50,10 94,40" fill="#6a5840" />
      <polygon points="6,40 50,10 94,40" fill="none" stroke="#4a3828" strokeWidth="1.5" />
      <line x1="50" y1="10" x2="50" y2="40" stroke="#4a3828" strokeWidth="1" opacity="0.6" />
      <rect x="9" y="40" width="82" height="58" rx="3" fill="#a88868" />
      <line x1="9" y1="54" x2="91" y2="54" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
      <line x1="9" y1="68" x2="91" y2="68" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
      <line x1="9" y1="82" x2="91" y2="82" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
      <rect x="14" y="46" width="14" height="12" rx="1" fill={lit} />
      <line x1="21" y1="46" x2="21" y2="58" stroke="#7a5a3a" strokeWidth="1" />
      <line x1="14" y1="52" x2="28" y2="52" stroke="#7a5a3a" strokeWidth="1" />
      <rect x="14" y="46" width="14" height="12" rx="1" fill="none" stroke="#7a5a3a" strokeWidth="1.5" />
      <rect x="72" y="46" width="14" height="12" rx="1" fill={lit} />
      <line x1="79" y1="46" x2="79" y2="58" stroke="#7a5a3a" strokeWidth="1" />
      <line x1="72" y1="52" x2="86" y2="52" stroke="#7a5a3a" strokeWidth="1" />
      <rect x="72" y="46" width="14" height="12" rx="1" fill="none" stroke="#7a5a3a" strokeWidth="1.5" />
      <path d="M40,98 L40,76 L60,76 L60,98 Z" fill="#5a3818" />
      <path d="M40,98 L40,76 L60,76 L60,98 Z" fill="none" stroke="#3a2008" strokeWidth="1.5" />
      <line x1="50" y1="76" x2="50" y2="98" stroke="#3a2008" strokeWidth="1" />
      <circle cx="44" cy="87" r="1.4" fill="#c8923a" />
      <circle cx="56" cy="87" r="1.4" fill="#c8923a" />
      <rect x="14" y="80" width="22" height="6" rx="1" fill="#5a4830" />
      <rect x="14" y="80" width="22" height="6" rx="1" fill="none" stroke="#3a2818" strokeWidth="1" />
      <line x1="20" y1="80" x2="20" y2="86" stroke="#3a2818" strokeWidth="0.8" />
      <line x1="26" y1="80" x2="26" y2="86" stroke="#3a2818" strokeWidth="0.8" />
      <line x1="32" y1="80" x2="32" y2="86" stroke="#3a2818" strokeWidth="0.8" />
      <line x1="13" y1="86" x2="37" y2="86" stroke="#3a2818" strokeWidth="0.8" />
      <rect x="14" y="65" width="3" height="13" fill="#7a5028" />
      <polygon points="11,68 20,65 22,67 13,70" fill="#9aa0a8" stroke="#5a606a" strokeWidth="0.4" />
      <line x1="68" y1="63" x2="86" y2="78" stroke="#5a4830" strokeWidth="2" strokeLinecap="round" />
      <path d="M64,60 L72,58 L74,62 L66,64 Z" fill="#9aa0a8" stroke="#5a606a" strokeWidth="0.4" />
      <rect x="74" y="74" width="14" height="14" rx="1" fill="#3a2818" />
      <rect x="76" y="76" width="10" height="10" fill="#5a4838" />
      <line x1="74" y1="88" x2="88" y2="88" stroke="#1a1208" strokeWidth="1.2" />
      <rect x="9" y="40" width="82" height="58" rx="3" fill="none" stroke="#6a4828" strokeWidth="2" />
    </svg>
  );
}
