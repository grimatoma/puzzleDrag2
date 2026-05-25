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
