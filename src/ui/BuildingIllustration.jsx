import { SMOKE_BUILDINGS } from "./townData.js";

export function BuildingSmoke() {
  return (
    <div className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none" style={{ width: 18, height: 36 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{
            bottom: 0,
            width: 8 + i * 2,
            height: 8 + i * 2,
            background: "rgba(240,235,220,.6)",
            animation: "townSmoke 3.4s ease-out infinite",
            animationDelay: `${i * 1.1}s`,
          }}
        />
      ))}
    </div>
  );
}

export function HearthGlow() {
  return (
    <div className="absolute inset-0 pointer-events-none grid place-items-center">
      <div
        className="rounded-full blur-xl"
        style={{
          width: "120%",
          height: "120%",
          background: "radial-gradient(circle, rgba(255,160,0,0.22) 0%, rgba(255,100,0,0.08) 50%, transparent 100%)",
          animation: "hearthPulse 4s ease-in-out infinite",
        }}
      />
    </div>
  );
}

export function BuildingIllustration({ id, isBuilt }) {
  const f = isBuilt ? {} : { filter: "saturate(0.15) brightness(0.65)" };
  const lit = isBuilt ? "#ffd86b" : "#5a5040";
  const glow = isBuilt ? "#ff8040" : "#3a2020";

  function shadow(cx = 50, rx = 40) {
    return <ellipse cx={cx} cy="97" rx={rx} ry="4" fill="rgba(0,0,0,.2)" />;
  }

  const illustrations = {
    hearth: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow()}
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
    ),
    mill: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow(50, 32)}
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
    ),
    bakery: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow()}
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
    ),
    inn: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow(50, 44)}
        <rect x="66" y="8" width="10" height="22" rx="1" fill="#8a7a6a" />
        <rect x="64" y="6" width="14" height="5" rx="1" fill="#6a5a4a" />
        <polygon points="5,36 50,6 95,36" fill="#4a6a3a" />
        <line x1="5" y1="36" x2="28" y2="21" stroke="#3a5a2a" strokeWidth="1.5" opacity="0.6" />
        <line x1="50" y1="6" x2="28" y2="21" stroke="#3a5a2a" strokeWidth="1.5" opacity="0.6" />
        <line x1="95" y1="36" x2="72" y2="21" stroke="#3a5a2a" strokeWidth="1.5" opacity="0.6" />
        <rect x="7" y="36" width="86" height="28" rx="2" fill="#8a7a60" />
        {[14, 32, 54, 72].map((x) => (
          <g key={x}>
            <rect x={x} y="41" width="14" height="12" rx="2" fill={lit} />
            <line x1={x + 7} y1="41" x2={x + 7} y2="53" stroke="#7a6a4a" strokeWidth="1" />
            <rect x={x} y="41" width="14" height="12" rx="2" fill="none" stroke="#7a6a4a" strokeWidth="1.5" />
          </g>
        ))}
        <rect x="7" y="63" width="86" height="5" rx="1" fill="#6a5a3a" />
        <rect x="7" y="64" width="86" height="34" rx="2" fill="#9a8a70" />
        <line x1="38" y1="63" x2="38" y2="73" stroke="#6a4a2a" strokeWidth="1.5" />
        <line x1="62" y1="63" x2="62" y2="73" stroke="#6a4a2a" strokeWidth="1.5" />
        <rect x="30" y="69" width="40" height="10" rx="2" fill="#c8923a" />
        <rect x="30" y="69" width="40" height="10" rx="2" fill="none" stroke="#8a5a1a" strokeWidth="1" />
        <rect x="10" y="71" width="16" height="14" rx="2" fill={lit} />
        <rect x="10" y="71" width="16" height="14" rx="2" fill="none" stroke="#7a6a4a" strokeWidth="1.5" />
        <rect x="74" y="71" width="16" height="14" rx="2" fill={lit} />
        <rect x="74" y="71" width="16" height="14" rx="2" fill="none" stroke="#7a6a4a" strokeWidth="1.5" />
        <path d="M37,98 L37,82 A13,13 0 0,1 63,82 L63,98 Z" fill="#7a4a2a" />
        <path d="M37,82 A13,13 0 0,1 63,82" fill="none" stroke="#5a3a1a" strokeWidth="2" />
        <line x1="50" y1="82" x2="50" y2="98" stroke="#5a3a1a" strokeWidth="1" />
        <circle cx="59" cy="91" r="2.5" fill="#c8923a" />
      </svg>
    ),
    granary: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow(50, 38)}
        <rect x="13" y="52" width="74" height="45" rx="3" fill="#c8b070" />
        {[24, 36, 50, 64, 76].map((x) => (
          <line key={x} x1={x} y1="52" x2={x} y2="97" stroke="rgba(0,0,0,.1)" strokeWidth="1.5" />
        ))}
        <ellipse cx="50" cy="52" rx="40" ry="22" fill="#c8923a" />
        <ellipse cx="50" cy="52" rx="40" ry="22" fill="none" stroke="#9a6a3a" strokeWidth="1.5" />
        <path d="M12,52 Q50,38 88,52" fill="none" stroke="#9a6a3a" strokeWidth="1" opacity="0.5" />
        <path d="M18,44 Q50,30 82,44" fill="none" stroke="#9a6a3a" strokeWidth="1" opacity="0.5" />
        <ellipse cx="50" cy="30" rx="8" ry="4" fill="#8a5a1a" />
        <rect x="18" y="59" width="12" height="5" rx="2" fill="rgba(0,0,0,.3)" />
        <rect x="70" y="59" width="12" height="5" rx="2" fill="rgba(0,0,0,.3)" />
        <rect x="28" y="72" width="20" height="25" rx="2" fill="#8a5a2a" />
        <rect x="52" y="72" width="20" height="25" rx="2" fill="#8a5a2a" />
        <line x1="50" y1="72" x2="50" y2="97" stroke="#6a4a1a" strokeWidth="2" />
        <rect x="28" y="72" width="44" height="25" rx="2" fill="none" stroke="#6a4a1a" strokeWidth="1.5" />
        <circle cx="46" cy="85" r="2" fill="#c8923a" />
        <circle cx="54" cy="85" r="2" fill="#c8923a" />
        <rect x="13" y="52" width="74" height="45" rx="3" fill="none" stroke="#9a7a4a" strokeWidth="2" />
      </svg>
    ),
    larder: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow(50, 38)}
        <polygon points="6,46 50,18 94,46" fill="#7a6858" />
        <polygon points="6,46 50,18 94,46" fill="none" stroke="#5a4a38" strokeWidth="1.5" />
        <rect x="11" y="46" width="78" height="51" rx="3" fill="#9a8878" />
        <line x1="11" y1="60" x2="89" y2="60" stroke="rgba(0,0,0,.12)" strokeWidth="1" />
        <line x1="11" y1="74" x2="89" y2="74" stroke="rgba(0,0,0,.12)" strokeWidth="1" />
        <line x1="11" y1="88" x2="89" y2="88" stroke="rgba(0,0,0,.12)" strokeWidth="1" />
        <line x1="37" y1="46" x2="37" y2="60" stroke="rgba(0,0,0,.08)" strokeWidth="1" />
        <line x1="63" y1="60" x2="63" y2="74" stroke="rgba(0,0,0,.08)" strokeWidth="1" />
        <rect x="15" y="52" width="16" height="12" rx="1" fill={isBuilt ? "#b0c0d0" : "#6a5a4a"} />
        <line x1="23" y1="52" x2="23" y2="64" stroke="#6a5a4a" strokeWidth="2" />
        <line x1="15" y1="58" x2="31" y2="58" stroke="#6a5a4a" strokeWidth="1" />
        <rect x="15" y="52" width="16" height="12" rx="1" fill="none" stroke="#6a5a4a" strokeWidth="1.5" />
        <rect x="69" y="52" width="16" height="12" rx="1" fill={isBuilt ? "#b0c0d0" : "#6a5a4a"} />
        <line x1="77" y1="52" x2="77" y2="64" stroke="#6a5a4a" strokeWidth="2" />
        <line x1="69" y1="58" x2="85" y2="58" stroke="#6a5a4a" strokeWidth="1" />
        <rect x="69" y="52" width="16" height="12" rx="1" fill="none" stroke="#6a5a4a" strokeWidth="1.5" />
        <rect x="34" y="65" width="32" height="32" rx="2" fill="#5a4a38" />
        <rect x="34" y="65" width="32" height="32" rx="2" fill="none" stroke="#3a2a18" strokeWidth="2" />
        <line x1="34" y1="79" x2="66" y2="79" stroke="#3a2a18" strokeWidth="2" />
        <line x1="34" y1="91" x2="66" y2="91" stroke="#3a2a18" strokeWidth="2" />
        <rect x="47" y="84" width="6" height="6" rx="1" fill="#c8923a" />
        <rect x="11" y="46" width="78" height="51" rx="3" fill="none" stroke="#6a5848" strokeWidth="2" />
      </svg>
    ),
    forge: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow()}
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
    ),
    caravan_post: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow(50, 48)}
        <line x1="82" y1="12" x2="82" y2="40" stroke="#8a5a2a" strokeWidth="2.5" />
        <polygon points="82,12 95,18 82,24" fill="#c83030" />
        <rect x="5" y="45" width="72" height="52" rx="3" fill="#a8784a" />
        <line x1="5" y1="58" x2="77" y2="58" stroke="rgba(0,0,0,.1)" strokeWidth="1.5" />
        <line x1="5" y1="71" x2="77" y2="71" stroke="rgba(0,0,0,.1)" strokeWidth="1.5" />
        <line x1="5" y1="84" x2="77" y2="84" stroke="rgba(0,0,0,.1)" strokeWidth="1.5" />
        <path d="M2,38 L79,38 L77,52 L4,52 Z" fill="#c83a1a" />
        {[13, 26, 40, 53, 66].map((x) => (
          <line key={x} x1={x} y1="38" x2={x - 1} y2="52" stroke="rgba(255,255,255,.2)" strokeWidth="1" />
        ))}
        <line x1="24" y1="38" x2="24" y2="46" stroke="#6a4a2a" strokeWidth="1.5" />
        <line x1="56" y1="38" x2="56" y2="46" stroke="#6a4a2a" strokeWidth="1.5" />
        <rect x="16" y="42" width="48" height="9" rx="2" fill="#e8c060" />
        <rect x="16" y="42" width="48" height="9" rx="2" fill="none" stroke="#9a7a20" strokeWidth="1" />
        <rect x="9" y="57" width="18" height="14" rx="2" fill={lit} />
        <line x1="18" y1="57" x2="18" y2="71" stroke="#8a6a3a" strokeWidth="1" />
        <line x1="9" y1="64" x2="27" y2="64" stroke="#8a6a3a" strokeWidth="1" />
        <rect x="9" y="57" width="18" height="14" rx="2" fill="none" stroke="#8a6a3a" strokeWidth="1.5" />
        <rect x="37" y="67" width="22" height="30" rx="2" fill="#7a4a2a" />
        <rect x="37" y="67" width="22" height="30" rx="2" fill="none" stroke="#5a3a1a" strokeWidth="1.5" />
        <circle cx="56" cy="83" r="2" fill="#c8923a" />
        <circle cx="85" cy="75" r="13" fill="none" stroke="#8a5a2a" strokeWidth="2.5" />
        <circle cx="85" cy="75" r="4" fill="#8a5a2a" />
        <line x1="85" y1="62" x2="85" y2="88" stroke="#8a5a2a" strokeWidth="1.5" />
        <line x1="72" y1="75" x2="98" y2="75" stroke="#8a5a2a" strokeWidth="1.5" />
        <line x1="76" y1="66" x2="94" y2="84" stroke="#8a5a2a" strokeWidth="1.5" />
        <line x1="76" y1="84" x2="94" y2="66" stroke="#8a5a2a" strokeWidth="1.5" />
        <rect x="5" y="45" width="72" height="52" rx="3" fill="none" stroke="#7a5a3a" strokeWidth="2" />
      </svg>
    ),
    kitchen: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow()}
        <rect x="58" y="10" width="12" height="30" rx="1" fill="#8a6858" />
        <rect x="56" y="8" width="16" height="5" rx="1" fill="#6a4a3a" />
        <rect x="60" y="14" width="8" height="3" rx="0.5" fill="#3a2a20" />
        <polygon points="6,42 50,12 94,42" fill="#7a4838" />
        <polygon points="6,42 50,12 94,42" fill="none" stroke="#5a2c1a" strokeWidth="1.5" />
        <line x1="50" y1="12" x2="28" y2="27" stroke="#5a2c1a" strokeWidth="1.2" opacity="0.55" />
        <line x1="50" y1="12" x2="72" y2="27" stroke="#5a2c1a" strokeWidth="1.2" opacity="0.55" />
        <rect x="8" y="42" width="84" height="56" rx="3" fill="#caa680" />
        <line x1="8" y1="56" x2="92" y2="56" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
        <line x1="8" y1="70" x2="92" y2="70" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
        <line x1="8" y1="84" x2="92" y2="84" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
        <rect x="14" y="48" width="16" height="14" rx="2" fill={lit} />
        <line x1="22" y1="48" x2="22" y2="62" stroke="#8a6a3a" strokeWidth="1" />
        <line x1="14" y1="55" x2="30" y2="55" stroke="#8a6a3a" strokeWidth="1" />
        <rect x="14" y="48" width="16" height="14" rx="2" fill="none" stroke="#8a6a3a" strokeWidth="1.5" />
        <rect x="44" y="58" width="32" height="24" rx="2" fill="#5a4838" />
        <rect x="44" y="58" width="32" height="24" rx="2" fill="none" stroke="#3a2818" strokeWidth="1.5" />
        <ellipse cx="60" cy="70" rx="11" ry="7" fill={isBuilt ? "#ffb060" : "#3a2818"} />
        <ellipse cx="60" cy="70" rx="11" ry="7" fill="none" stroke="#3a2818" strokeWidth="1.2" />
        {isBuilt && <ellipse cx="60" cy="70" rx="6" ry="3" fill="#ffe080" opacity="0.85" />}
        <rect x="46" y="80" width="28" height="3" rx="1" fill="#3a2818" />
        <path d="M14,98 L14,86 Q14,80 22,80 Q30,80 30,86 L30,98 Z" fill="#7a4a2a" />
        <path d="M14,86 Q14,80 22,80 Q30,80 30,86" fill="none" stroke="#5a3a1a" strokeWidth="1.2" />
        <circle cx="27" cy="91" r="1.6" fill="#c8923a" />
        <rect x="80" y="78" width="10" height="14" rx="1" fill="#9a7048" />
        <rect x="80" y="78" width="10" height="14" rx="1" fill="none" stroke="#6a4828" strokeWidth="1" />
        <line x1="80" y1="85" x2="90" y2="85" stroke="#6a4828" strokeWidth="0.8" />
        <rect x="8" y="42" width="84" height="56" rx="3" fill="none" stroke="#8a5a3a" strokeWidth="2" />
      </svg>
    ),
    workshop: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow(50, 42)}
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
    ),
    powder_store: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow(50, 42)}
        <polygon points="10,46 50,24 90,46" fill="#3a3028" />
        <polygon points="10,46 50,24 90,46" fill="none" stroke="#1a1408" strokeWidth="1.5" />
        <rect x="48" y="20" width="4" height="6" fill="#c83020" />
        <polygon points="48,20 56,22 48,24" fill="#c83020" />
        <rect x="13" y="46" width="74" height="52" rx="2" fill="#5c5048" />
        <rect x="13" y="46" width="74" height="52" rx="2" fill="none" stroke="#2a2018" strokeWidth="2" />
        {[0,1,2,3].map((row) => (
          [0,1,2,3,4,5].map((col) => (
            <rect key={`${row}-${col}`} x={15 + col * 12 + (row%2)*6} y={50 + row * 12} width="11" height="11" rx="0.5" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="0.6" />
          ))
        ))}
        <rect x="13" y="58" width="74" height="3" fill="#3a3028" />
        <rect x="13" y="80" width="74" height="3" fill="#3a3028" />
        <rect x="40" y="68" width="20" height="30" rx="1" fill="#3a3028" />
        <rect x="40" y="68" width="20" height="30" rx="1" fill="none" stroke="#1a1208" strokeWidth="1.5" />
        <rect x="38" y="68" width="24" height="3" fill="#5a5048" />
        <line x1="50" y1="68" x2="50" y2="98" stroke="#1a1208" strokeWidth="1" />
        <circle cx="46" cy="83" r="1.4" fill="#c8923a" />
        <circle cx="54" cy="83" r="1.4" fill="#c8923a" />
        <rect x="20" y="56" width="10" height="6" rx="1" fill="#1a1208" />
        <line x1="22" y1="58" x2="28" y2="58" stroke={isBuilt ? "#ffd86b" : "#3a2820"} strokeWidth="0.8" />
        <line x1="22" y1="60" x2="28" y2="60" stroke={isBuilt ? "#ffd86b" : "#3a2820"} strokeWidth="0.8" />
        <rect x="70" y="56" width="10" height="6" rx="1" fill="#1a1208" />
        <line x1="72" y1="58" x2="78" y2="58" stroke={isBuilt ? "#ffd86b" : "#3a2820"} strokeWidth="0.8" />
        <line x1="72" y1="60" x2="78" y2="60" stroke={isBuilt ? "#ffd86b" : "#3a2820"} strokeWidth="0.8" />
        <ellipse cx="20" cy="92" rx="6" ry="2.5" fill="#3a2818" opacity="0.6" />
        <rect x="14" y="76" width="12" height="16" rx="1" fill="#5a3818" />
        <ellipse cx="20" cy="76" rx="6" ry="2.2" fill="#7a4828" />
        <line x1="14" y1="82" x2="26" y2="82" stroke="#2a1808" strokeWidth="1" />
        <line x1="14" y1="88" x2="26" y2="88" stroke="#2a1808" strokeWidth="1" />
        <ellipse cx="82" cy="92" rx="6" ry="2.5" fill="#3a2818" opacity="0.6" />
        <rect x="76" y="76" width="12" height="16" rx="1" fill="#5a3818" />
        <ellipse cx="82" cy="76" rx="6" ry="2.2" fill="#7a4828" />
        <line x1="76" y1="82" x2="88" y2="82" stroke="#2a1808" strokeWidth="1" />
        <line x1="76" y1="88" x2="88" y2="88" stroke="#2a1808" strokeWidth="1" />
        <circle cx="50" cy="38" r="3.5" fill={isBuilt ? "#f8d030" : "#5a4830"} />
        <text x="50" y="40.5" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#1a1208">!</text>
      </svg>
    ),
    portal: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow(50, 38)}
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
    ),
    housing: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow(50, 38)}
        <rect x="74" y="14" width="9" height="22" rx="1" fill="#8a6a5a" />
        <rect x="72" y="12" width="13" height="5" rx="1" fill="#6a4a3a" />
        <polygon points="8,42 50,16 92,42" fill="#6a3818" />
        <polygon points="8,42 50,16 92,42" fill="none" stroke="#4a2008" strokeWidth="1.5" />
        <line x1="50" y1="16" x2="28" y2="29" stroke="#4a2008" strokeWidth="1" opacity="0.55" />
        <line x1="50" y1="16" x2="72" y2="29" stroke="#4a2008" strokeWidth="1" opacity="0.55" />
        <line x1="8" y1="42" x2="92" y2="42" stroke="#4a2008" strokeWidth="0.8" opacity="0.4" />
        <rect x="11" y="42" width="78" height="56" rx="3" fill="#d8b888" />
        <line x1="11" y1="58" x2="89" y2="58" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
        <line x1="11" y1="74" x2="89" y2="74" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
        <line x1="11" y1="90" x2="89" y2="90" stroke="rgba(0,0,0,.1)" strokeWidth="1" />
        <rect x="17" y="48" width="14" height="14" rx="1" fill={lit} />
        <line x1="24" y1="48" x2="24" y2="62" stroke="#7a5a3a" strokeWidth="1" />
        <line x1="17" y1="55" x2="31" y2="55" stroke="#7a5a3a" strokeWidth="1" />
        <rect x="17" y="48" width="14" height="14" rx="1" fill="none" stroke="#7a5a3a" strokeWidth="1.5" />
        <rect x="69" y="48" width="14" height="14" rx="1" fill={lit} />
        <line x1="76" y1="48" x2="76" y2="62" stroke="#7a5a3a" strokeWidth="1" />
        <line x1="69" y1="55" x2="83" y2="55" stroke="#7a5a3a" strokeWidth="1" />
        <rect x="69" y="48" width="14" height="14" rx="1" fill="none" stroke="#7a5a3a" strokeWidth="1.5" />
        <rect x="42" y="48" width="16" height="12" rx="1" fill={lit} />
        <line x1="50" y1="48" x2="50" y2="60" stroke="#7a5a3a" strokeWidth="1" />
        <line x1="42" y1="54" x2="58" y2="54" stroke="#7a5a3a" strokeWidth="1" />
        <rect x="42" y="48" width="16" height="12" rx="1" fill="none" stroke="#7a5a3a" strokeWidth="1.5" />
        <path d="M40,98 L40,72 A10,10 0 0,1 60,72 L60,98 Z" fill="#5a3818" />
        <path d="M40,72 A10,10 0 0,1 60,72" fill="none" stroke="#3a2008" strokeWidth="1.5" />
        <line x1="50" y1="72" x2="50" y2="98" stroke="#3a2008" strokeWidth="1" />
        <circle cx="56" cy="86" r="1.6" fill="#c8923a" />
        <rect x="17" y="68" width="14" height="10" rx="1" fill={lit} />
        <line x1="17" y1="73" x2="31" y2="73" stroke="#7a5a3a" strokeWidth="1" />
        <rect x="17" y="68" width="14" height="10" rx="1" fill="none" stroke="#7a5a3a" strokeWidth="1.2" />
        <rect x="69" y="68" width="14" height="10" rx="1" fill={lit} />
        <line x1="69" y1="73" x2="83" y2="73" stroke="#7a5a3a" strokeWidth="1" />
        <rect x="69" y="68" width="14" height="10" rx="1" fill="none" stroke="#7a5a3a" strokeWidth="1.2" />
        <rect x="11" y="42" width="78" height="56" rx="3" fill="none" stroke="#7a5a3a" strokeWidth="2" />
      </svg>
    ),
    silo: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow(54, 36)}
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
    ),
    barn: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow()}
        <rect x="62" y="14" width="10" height="24" rx="1" fill="#4a4030" />
        <rect x="60" y="12" width="14" height="5" rx="1" fill="#2a2018" />
        <polygon points="6,38 28,16 72,16 94,38" fill="#5a2818" />
        <polygon points="6,38 28,16 72,16 94,38" fill="none" stroke="#3a1808" strokeWidth="1.5" />
        <line x1="6" y1="38" x2="28" y2="16" stroke="#3a1808" strokeWidth="1" opacity="0.55" />
        <line x1="94" y1="38" x2="72" y2="16" stroke="#3a1808" strokeWidth="1" opacity="0.55" />
        <rect x="6" y="38" width="88" height="60" rx="2" fill="#7a4838" />
        <rect x="6" y="38" width="88" height="60" rx="2" fill="none" stroke="#3a1808" strokeWidth="2" />
        <line x1="6" y1="52" x2="94" y2="52" stroke="#3a1808" strokeWidth="0.8" opacity="0.4" />
        <line x1="6" y1="68" x2="94" y2="68" stroke="#3a1808" strokeWidth="0.8" opacity="0.4" />
        <line x1="6" y1="84" x2="94" y2="84" stroke="#3a1808" strokeWidth="0.8" opacity="0.4" />
        <line x1="26" y1="38" x2="26" y2="98" stroke="#3a1808" strokeWidth="0.6" opacity="0.35" />
        <line x1="50" y1="38" x2="50" y2="98" stroke="#3a1808" strokeWidth="0.6" opacity="0.35" />
        <line x1="74" y1="38" x2="74" y2="98" stroke="#3a1808" strokeWidth="0.6" opacity="0.35" />
        <rect x="11" y="42" width="78" height="3" fill="#4a4030" />
        <rect x="11" y="95" width="78" height="3" fill="#4a4030" />
        <line x1="14" y1="42" x2="14" y2="98" stroke="#4a4030" strokeWidth="2" />
        <line x1="86" y1="42" x2="86" y2="98" stroke="#4a4030" strokeWidth="2" />
        <rect x="36" y="52" width="14" height="14" rx="1" fill="#3a2818" />
        <rect x="36" y="52" width="14" height="14" rx="1" fill="none" stroke="#1a1208" strokeWidth="1" />
        <line x1="36" y1="59" x2="50" y2="59" stroke="#1a1208" strokeWidth="0.8" />
        <line x1="43" y1="52" x2="43" y2="66" stroke="#1a1208" strokeWidth="0.8" />
        <rect x="50" y="52" width="14" height="14" rx="1" fill="#3a2818" />
        <rect x="50" y="52" width="14" height="14" rx="1" fill="none" stroke="#1a1208" strokeWidth="1" />
        <line x1="50" y1="59" x2="64" y2="59" stroke="#1a1208" strokeWidth="0.8" />
        <line x1="57" y1="52" x2="57" y2="66" stroke="#1a1208" strokeWidth="0.8" />
        <path d="M30,98 L30,74 L70,74 L70,98 Z" fill="#3a2818" />
        <path d="M30,98 L30,74 L70,74 L70,98 Z" fill="none" stroke="#1a1208" strokeWidth="2" />
        <line x1="50" y1="74" x2="50" y2="98" stroke="#1a1208" strokeWidth="1.5" />
        <line x1="30" y1="74" x2="50" y2="98" stroke="#5a4838" strokeWidth="0.8" opacity="0.55" />
        <line x1="50" y1="74" x2="30" y2="98" stroke="#5a4838" strokeWidth="0.8" opacity="0.55" />
        <line x1="50" y1="74" x2="70" y2="98" stroke="#5a4838" strokeWidth="0.8" opacity="0.55" />
        <line x1="70" y1="74" x2="50" y2="98" stroke="#5a4838" strokeWidth="0.8" opacity="0.55" />
        <circle cx="46" cy="86" r="1.6" fill="#c8923a" />
        <circle cx="54" cy="86" r="1.6" fill="#c8923a" />
        <rect x="14" y="78" width="12" height="14" rx="1" fill="#5a3818" />
        <rect x="14" y="78" width="12" height="14" rx="1" fill="none" stroke="#3a2008" strokeWidth="1" />
        <ellipse cx="20" cy="78" rx="6" ry="2" fill="#7a4828" />
        <line x1="14" y1="84" x2="26" y2="84" stroke="#2a1808" strokeWidth="0.8" />
        <rect x="76" y="48" width="6" height="14" rx="1" fill={isBuilt ? "#c86820" : "#5a4830"} />
        <rect x="76" y="48" width="6" height="14" rx="1" fill="none" stroke="#3a2008" strokeWidth="0.8" />
        {isBuilt && <ellipse cx="79" cy="50" rx="3" ry="1" fill="#f8a040" opacity="0.85" />}
        <line x1="79" y1="42" x2="79" y2="48" stroke="#3a2008" strokeWidth="1" />
      </svg>
    ),
    harbor_dock: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow(50, 44)}
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
    ),
    fishmonger: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow()}
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
    ),
    smokehouse: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" style={f}>
        {shadow(50, 36)}
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
    ),
  };
  illustrations.housing2 = illustrations.housing;
  illustrations.housing3 = illustrations.housing;
  return illustrations[id] || null;
}

export function FarmFieldArt() {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 w-full h-full">
      {/* Sky */}
      <rect width="100" height="42" fill="#bce088" />
      <rect width="100" height="20" fill="#d8eea8" opacity="0.55" />
      {/* Sun */}
      <circle cx="83" cy="13" r="5" fill="#f7d254" opacity="0.9" />
      <circle cx="83" cy="13" r="8" fill="#f7d254" opacity="0.25" />
      {/* Distant rolling hills */}
      <path d="M0,40 Q22,30 44,36 T88,34 L100,32 L100,52 L0,52 Z" fill="#5a8a25" />
      <path d="M0,46 Q25,38 55,44 T100,42 L100,56 L0,56 Z" fill="#4a7a18" />
      {/* Foreground field */}
      <rect y="50" width="100" height="50" fill="#3a6e10" />
      <path d="M0,50 Q20,52 40,50 T100,52 L100,72 L0,72 Z" fill="#5a8e20" />
      {[0,1,2,3,4,5,6].map((i) => (
        <line key={i} x1="0" y1={56 + i * 7} x2="100" y2={58 + i * 7} stroke="#f4d460" strokeWidth="0.7" opacity="0.45" />
      ))}
      {/* Red barn — body */}
      <rect x="14" y="44" width="34" height="32" fill="#a82820" stroke="#5a1010" strokeWidth="0.7" />
      {/* Roof */}
      <polygon points="11,46 31,30 51,46" fill="#7a1810" stroke="#4a0a08" strokeWidth="0.7" />
      <line x1="11" y1="46" x2="31" y2="30" stroke="#5a0e08" strokeWidth="0.4" />
      <line x1="51" y1="46" x2="31" y2="30" stroke="#5a0e08" strokeWidth="0.4" />
      {/* Hayloft door */}
      <rect x="27" y="34" width="8" height="10" fill="#3a1008" stroke="#1a0808" strokeWidth="0.4" />
      <line x1="31" y1="34" x2="31" y2="44" stroke="#f4ecd0" strokeWidth="0.3" />
      {/* White trim band */}
      <rect x="14" y="56" width="34" height="1.3" fill="#f4ecd0" opacity="0.9" />
      {/* Main door with white cross */}
      <rect x="25" y="59" width="12" height="17" fill="#3a1008" stroke="#1a0808" strokeWidth="0.4" />
      <line x1="25" y1="59" x2="37" y2="76" stroke="#f4ecd0" strokeWidth="0.5" />
      <line x1="37" y1="59" x2="25" y2="76" stroke="#f4ecd0" strokeWidth="0.5" />
      <line x1="31" y1="59" x2="31" y2="76" stroke="#f4ecd0" strokeWidth="0.4" />
      {/* Side windows with shutters */}
      <rect x="16" y="49" width="5" height="5" fill="#f7d254" stroke="#3a1008" strokeWidth="0.4" />
      <line x1="18.5" y1="49" x2="18.5" y2="54" stroke="#3a1008" strokeWidth="0.3" />
      <line x1="16" y1="51.5" x2="21" y2="51.5" stroke="#3a1008" strokeWidth="0.3" />
      <rect x="41" y="49" width="5" height="5" fill="#f7d254" stroke="#3a1008" strokeWidth="0.4" />
      <line x1="43.5" y1="49" x2="43.5" y2="54" stroke="#3a1008" strokeWidth="0.3" />
      <line x1="41" y1="51.5" x2="46" y2="51.5" stroke="#3a1008" strokeWidth="0.3" />
      {/* Weather vane */}
      <line x1="31" y1="30" x2="31" y2="22" stroke="#3a3838" strokeWidth="0.6" />
      <polygon points="31,21 35,23 31,25 27,23" fill="#3a3838" />
      {/* Silo */}
      <rect x="51" y="50" width="10" height="26" fill="#c0b8a0" stroke="#7a7260" strokeWidth="0.5" />
      <line x1="51" y1="58" x2="61" y2="58" stroke="#9a9282" strokeWidth="0.4" />
      <line x1="51" y1="66" x2="61" y2="66" stroke="#9a9282" strokeWidth="0.4" />
      <ellipse cx="56" cy="76" rx="5" ry="1.6" fill="#7a7260" />
      <path d="M51,50 Q56,42 61,50 Z" fill="#7a8a8a" stroke="#5a6a6a" strokeWidth="0.4" />
      {/* Apple tree */}
      <rect x="93" y="58" width="2" height="12" fill="#5a3818" />
      <ellipse cx="94" cy="56" rx="6" ry="6" fill="#3a7a20" />
      <circle cx="91" cy="54" r="1" fill="#e03820" opacity="0.85" />
      <circle cx="96" cy="58" r="0.9" fill="#d02818" opacity="0.85" />
      {/* Wooden fence */}
      {[0,1,2,3,4,5,6,7,8].map((i) => (
        <rect key={i} x={5 + i * 11} y="78" width="1.6" height="9" fill="#9a6828" />
      ))}
      <line x1="2" y1="81" x2="100" y2="81" stroke="#9a6828" strokeWidth="0.9" />
      <line x1="2" y1="85" x2="100" y2="85" stroke="#9a6828" strokeWidth="0.9" />
      {/* Hay bale */}
      <ellipse cx="76" cy="83" rx="9" ry="4.5" fill="#d4a838" stroke="#9a7820" strokeWidth="0.5" />
      <line x1="67" y1="80.5" x2="85" y2="80.5" stroke="#9a7820" strokeWidth="0.4" />
      <line x1="67" y1="84" x2="85" y2="84" stroke="#9a7820" strokeWidth="0.4" />
      {/* Wildflowers */}
      <circle cx="8" cy="92" r="0.9" fill="#ff7070" />
      <circle cx="42" cy="94" r="0.9" fill="#ffffff" />
      <circle cx="62" cy="92" r="0.9" fill="#f0a0e0" />
    </svg>
  );
}

export function MineEntranceArt({ locked }) {
  const lanternFill = locked ? "#5a4830" : "#c86820";
  const lanternGlow = locked ? "rgba(120,110,90,.0)" : "rgba(248,160,64,.22)";
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 w-full h-full">
      {/* Dusk sky */}
      <rect width="100" height="40" fill="#3a3e44" />
      <rect width="100" height="14" fill="#52565c" opacity="0.6" />
      {/* Mountain silhouette */}
      <polygon points="0,38 20,14 36,30 54,8 72,24 100,16 100,46 0,46" fill="#48464a" />
      <polygon points="12,30 20,14 28,28" fill="#5a585e" opacity="0.65" />
      <polygon points="46,18 54,8 62,22" fill="#6a686e" opacity="0.55" />
      {/* Snow caps */}
      <polygon points="18,16 20,14 22,16" fill="#d8d0c8" opacity="0.7" />
      <polygon points="52,10 54,8 56,10" fill="#d8d0c8" opacity="0.7" />
      {/* Cliff base */}
      <rect y="42" width="100" height="58" fill="#5c5860" />
      <path d="M0,58 Q30,52 60,56 T100,54 L100,64 L0,64 Z" fill="#48464c" opacity="0.55" />
      <path d="M0,72 Q35,68 70,72 T100,70 L100,80 L0,80 Z" fill="#3a3840" opacity="0.45" />
      {/* Ore vein */}
      <line x1="6" y1="54" x2="22" y2="62" stroke="#9ad8f0" strokeWidth="0.6" opacity="0.5" />
      <line x1="78" y1="50" x2="92" y2="58" stroke="#d8f0fc" strokeWidth="0.5" opacity="0.5" />
      {/* Mine tunnel */}
      <rect x="36" y="48" width="28" height="38" fill="#0a0a0c" />
      <ellipse cx="50" cy="48" rx="14" ry="6" fill="#0a0a0c" />
      <ellipse cx="50" cy="56" rx="9" ry="4" fill="#1a1a1c" opacity="0.85" />
      {/* Timber posts */}
      <rect x="32" y="44" width="5" height="44" fill="#6a4828" stroke="#3a2810" strokeWidth="0.4" />
      <rect x="63" y="44" width="5" height="44" fill="#6a4828" stroke="#3a2810" strokeWidth="0.4" />
      <line x1="34.5" y1="44" x2="34.5" y2="88" stroke="#5a3818" strokeWidth="0.3" opacity="0.8" />
      <line x1="65.5" y1="44" x2="65.5" y2="88" stroke="#5a3818" strokeWidth="0.3" opacity="0.8" />
      {/* Header beam */}
      <rect x="29" y="42" width="42" height="6" fill="#7a5830" stroke="#3a2810" strokeWidth="0.4" />
      <rect x="29" y="42" width="42" height="1.4" fill="#9a7848" opacity="0.6" />
      {/* Knee braces */}
      <line x1="36" y1="50" x2="44" y2="44" stroke="#5a3818" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="64" y1="50" x2="56" y2="44" stroke="#5a3818" strokeWidth="1.8" strokeLinecap="round" />
      {/* Sign board */}
      <rect x="42" y="34" width="16" height="7" fill="#7a5828" stroke="#4a3018" strokeWidth="0.5" />
      <line x1="44" y1="36.2" x2="56" y2="36.2" stroke="#4a3018" strokeWidth="0.4" />
      <line x1="44" y1="38.8" x2="56" y2="38.8" stroke="#4a3018" strokeWidth="0.4" />
      {/* Lanterns */}
      <circle cx="34" cy="52" r="6" fill={lanternGlow} />
      <line x1="34" y1="44" x2="34" y2="48" stroke="#3a2810" strokeWidth="0.6" />
      <rect x="31" y="48" width="6" height="6" fill={lanternFill} stroke="#5a3010" strokeWidth="0.4" />
      <ellipse cx="34" cy="48.5" rx="2.6" ry="0.7" fill={locked ? "#7a6850" : "#f8a040"} opacity="0.85" />
      <circle cx="66" cy="52" r="6" fill={lanternGlow} />
      <line x1="66" y1="44" x2="66" y2="48" stroke="#3a2810" strokeWidth="0.6" />
      <rect x="63" y="48" width="6" height="6" fill={lanternFill} stroke="#5a3010" strokeWidth="0.4" />
      <ellipse cx="66" cy="48.5" rx="2.6" ry="0.7" fill={locked ? "#7a6850" : "#f8a040"} opacity="0.85" />
      {/* Cart tracks */}
      <line x1="0" y1="86" x2="100" y2="86" stroke="#7a6848" strokeWidth="0.9" />
      <line x1="0" y1="90" x2="100" y2="90" stroke="#7a6848" strokeWidth="0.9" />
      {[0,1,2,3,4,5,6,7,8,9].map((i) => (
        <line key={i} x1={6 + i * 10} y1="85" x2={6 + i * 10} y2="91" stroke="#5a4828" strokeWidth="0.6" />
      ))}
      {/* Mine cart */}
      <rect x="14" y="76" width="18" height="10" rx="1" fill="#4a3a26" stroke="#2a1a08" strokeWidth="0.4" />
      <rect x="14" y="76" width="18" height="2.5" fill="#665040" />
      <ellipse cx="23" cy="76" rx="9" ry="2.5" fill="#78889a" />
      <ellipse cx="20" cy="74.5" rx="3.5" ry="1.2" fill="#a0c0d0" opacity="0.75" />
      <circle cx="22" cy="73.5" r="0.6" fill="#d8f0fc" />
      <circle cx="18" cy="88" r="2.6" fill="none" stroke="#3a2810" strokeWidth="0.9" />
      <circle cx="18" cy="88" r="0.9" fill="#3a2810" />
      <circle cx="28" cy="88" r="2.6" fill="none" stroke="#3a2810" strokeWidth="0.9" />
      <circle cx="28" cy="88" r="0.9" fill="#3a2810" />
      {/* Pickaxe leaning */}
      <line x1="74" y1="58" x2="78" y2="84" stroke="#7a5830" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M70,58 L78,55 L82,57 L74,60 Z" fill="#9aa0a8" stroke="#5a606a" strokeWidth="0.4" />
      {/* Tailings pile */}
      <ellipse cx="86" cy="86" rx="13" ry="3.5" fill="#3a3a3a" opacity="0.6" />
      <polygon points="78,84 86,76 94,84" fill="#5a585e" />
      <polygon points="82,82 86,78 90,82" fill="#6a686e" opacity="0.7" />
      <circle cx="86" cy="80" r="0.7" fill="#a0c0d0" />
      <circle cx="89" cy="83" r="0.6" fill="#c8e4f8" opacity="0.8" />
      {/* Smoke wisps from tunnel */}
      {!locked && <>
        <ellipse cx="48" cy="28" rx="2.5" ry="4" fill="rgba(180,170,160,.3)" />
        <ellipse cx="52" cy="22" rx="2" ry="3" fill="rgba(180,170,160,.22)" />
        <ellipse cx="55" cy="16" rx="1.6" ry="2.5" fill="rgba(180,170,160,.15)" />
      </>}
    </svg>
  );
}

export function Cloud({ top, w, h, color, anim, breatheDur }) {
  const s = { borderRadius: '50%', background: color, position: 'absolute' };
  const animation = breatheDur ? `${anim}, cloudBreathe ${breatheDur}s ease-in-out infinite` : anim;
  const bott = h * 0.2;
  return (
    <div style={{ position: 'absolute', top, width: w, height: h, animation }}>
      <div style={{ ...s, width: '100%', height: '100%' }} />
      <div style={{ ...s, width: w * 0.42, height: h * 1.6, bottom: bott, left: w * 0.05 }} />
      <div style={{ ...s, width: w * 0.50, height: h * 1.9, bottom: bott, left: w * 0.28 }} />
      <div style={{ ...s, width: w * 0.38, height: h * 1.5, bottom: bott, right: w * 0.05 }} />
    </div>
  );
}
