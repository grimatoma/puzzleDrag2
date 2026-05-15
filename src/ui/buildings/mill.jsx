import { svgState, Shadow } from "./helpers.jsx";

export default function MillIllustration({ isBuilt }) {
  const { f, lit } = svgState(isBuilt);
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
      <Shadow cx={50} rx={32} />
      <path d="M32,98 L36,48 L64,48 L68,98 Z" fill="#d4b880" />
      <path d="M32,98 L36,48 L64,48 L68,98 Z" fill="none" stroke="#9a7a4a" strokeWidth="2" />
      <line x1="33" y1="70" x2="67" y2="70" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
      <line x1="34" y1="83" x2="66" y2="83" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
      <polygon points="27,48 50,14 73,48" fill="#8a4a1a" />
      <polygon points="27,48 50,14 73,48" fill="none" stroke="#6a3a10" strokeWidth="1.5" />
      <circle cx="50" cy="31" r="5" fill="#8a6040" />
      <circle cx="50" cy="31" r="3" fill="#c8923a" />
      <line x1="50" y1="31" x2="50" y2="10" stroke="#7a5a3a" strokeWidth="2.5" />
      <polygon points="44,10 56,10 58,22 42,22" fill="#e8d8a0" stroke="#9a7a3a" strokeWidth="1" />
      <line x1="50" y1="31" x2="71" y2="31" stroke="#7a5a3a" strokeWidth="2.5" />
      <polygon points="71,25 71,37 59,39 59,23" fill="#e8d8a0" stroke="#9a7a3a" strokeWidth="1" />
      <line x1="50" y1="31" x2="50" y2="52" stroke="#7a5a3a" strokeWidth="2.5" />
      <polygon points="44,40 56,40 58,52 42,52" fill="#e8d8a0" stroke="#9a7a3a" strokeWidth="1" />
      <line x1="50" y1="31" x2="29" y2="31" stroke="#7a5a3a" strokeWidth="2.5" />
      <polygon points="29,25 29,37 41,39 41,23" fill="#e8d8a0" stroke="#9a7a3a" strokeWidth="1" />
      <circle cx="50" cy="63" r="9" fill={lit} />
      <line x1="50" y1="54" x2="50" y2="72" stroke="#8a6a3a" strokeWidth="1" />
      <line x1="41" y1="63" x2="59" y2="63" stroke="#8a6a3a" strokeWidth="1" />
      <circle cx="50" cy="63" r="9" fill="none" stroke="#8a6a3a" strokeWidth="1.5" />
      <path d="M40,98 L40,82 A10,10 0 0,1 60,82 L60,98 Z" fill="#7a5a3a" />
      <path d="M40,82 A10,10 0 0,1 60,82" fill="none" stroke="#5a3a1a" strokeWidth="1.5" />
    </svg>
  );
}
