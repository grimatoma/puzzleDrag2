export function FarmTerrainDecor() {
  return (
    <>
      {/* Sunlit highlight ridge on the far hill */}
      <path d="M0,248 C140,222 300,210 480,224 C640,238 780,218 960,210 C1020,208 1070,206 1100,204 L1100,305 C1040,252 760,252 420,262 C260,248 120,278 0,305 Z" fill="#9ad060" opacity="0.28" />
      {/* Orchard tree clusters on left hill */}
      {[0,1,2,3,4,5,6].map(i => {
        const tx = 52 + i * 110 + (i%2)*28;
        const ty = 238 + (i%3)*14;
        return <g key={i}>
          <rect x={tx-3} y={ty+12} width="6" height="20" fill="#6a4a20" opacity="0.55" />
          <ellipse cx={tx} cy={ty} rx={18+(i%2)*6} ry={15+(i%3)*4} fill={i%3===0?"#3a7a20":i%3===1?"#4a8a28":"#5a9a30"} opacity="0.65" />
        </g>;
      })}
      {/* Golden wheat field on left slope */}
      <path d="M20,278 L0,310 L380,290 L390,260 Z" fill="#c8a040" opacity="0.22" />
      {[0,1,2,3,4,5].map(i => (
        <line key={i} x1="22" y1={268+i*8} x2="385" y2={258+i*6} stroke="#d4b040" strokeWidth="1.5" opacity="0.28" />
      ))}
      {/* Distant barn silhouette — right hill */}
      <rect x="870" y="218" width="56" height="46" fill="#5a3818" opacity="0.45" />
      <polygon points="866,220 898,190 930,220" fill="#6a2818" opacity="0.5" />
      <rect x="890" y="218" width="14" height="22" fill="#3a1808" opacity="0.5" />
      {/* Windmill silhouette — right hill */}
      <rect x="816" y="160" width="10" height="94" fill="#4a6618" opacity="0.62" />
      <polygon points="821,207 788,182 796,226" fill="#4a6618" opacity="0.62" />
      <polygon points="821,207 847,175 845,220" fill="#4a6618" opacity="0.62" />
      <polygon points="821,205 852,230 813,240" fill="#4a6618" opacity="0.62" />
      <polygon points="821,205 790,234 798,198" fill="#4a6618" opacity="0.62" />
      <polygon points="803,250 839,250 836,220 806,220" fill="#7a5828" opacity="0.62" />
      {/* Wooden fence row */}
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
        <g key={i}>
          <rect x={22+i*30} y="343" width="5" height="38" rx="1" fill="#9a6828" opacity="0.65" />
          <rect x={20+i*30} y="341" width="9" height="5" rx="1" fill="#7a5018" opacity="0.55" />
        </g>
      ))}
      <line x1="8" y1="358" x2="362" y2="353" stroke="#9a6828" strokeWidth="3.5" opacity="0.65" />
      <line x1="8" y1="368" x2="362" y2="363" stroke="#9a6828" strokeWidth="3.5" opacity="0.65" />
      {/* Hay bales in foreground */}
      <ellipse cx="175" cy="464" rx="24" ry="16" fill="#c89838" opacity="0.7" />
      <line x1="151" y1="464" x2="199" y2="464" stroke="#a07828" strokeWidth="1.5" opacity="0.5" />
      <line x1="151" y1="458" x2="199" y2="458" stroke="#a07828" strokeWidth="1.5" opacity="0.5" />
      <ellipse cx="224" cy="466" rx="20" ry="13" fill="#b88830" opacity="0.65" />
      {/* Wildflowers on hillside */}
      {[0,1,2,3,4,5,6,7,8,9].map(i => (
        <circle key={i} cx={68+i*38+(i%3)*10} cy={294+(i%4)*9} r={3.5+(i%2)} fill={["#f7d254","#ff7070","#ffffff","#f0a0e0","#80e080"][i%5]} opacity="0.6" />
      ))}
      {/* Apple tree near fence right end */}
      <rect x="392" y="312" width="7" height="52" fill="#7a5228" opacity="0.62" />
      <ellipse cx="396" cy="304" rx="26" ry="22" fill="#3a7a20" opacity="0.68" />
      <circle cx="385" cy="298" r="5" fill="#e03820" opacity="0.75" />
      <circle cx="404" cy="306" r="4" fill="#d02818" opacity="0.72" />
    </>
  );
}

export function MineTerrainDecor() {
  return (
    <>
      {/* Rock strata bands across the cliff face */}
      <path d="M0,248 C180,238 400,226 640,232 C820,238 1000,224 1100,220 L1100,272 C900,268 620,278 380,274 C220,270 100,274 0,268 Z" fill="#48443c" opacity="0.28" />
      <path d="M0,268 C160,260 380,250 640,256 C840,262 980,252 1100,248 L1100,286 C900,282 620,290 360,284 C220,280 100,282 0,282 Z" fill="#383430" opacity="0.22" />
      {/* Ore / crystal vein streaks in exposed rock */}
      <line x1="195" y1="240" x2="330" y2="274" stroke="#7a8894" strokeWidth="3" opacity="0.38" />
      <line x1="545" y1="228" x2="605" y2="256" stroke="#9ad8f0" strokeWidth="4" opacity="0.42" />
      <line x1="551" y1="232" x2="601" y2="252" stroke="#d8f0fc" strokeWidth="1.5" opacity="0.55" />
      <line x1="862" y1="218" x2="928" y2="258" stroke="#8a7a5a" strokeWidth="2.5" opacity="0.33" />
      {/* Mine entrance — dark tunnel void */}
      <rect x="728" y="254" width="76" height="94" fill="#080a0c" opacity="0.94" rx="3" />
      <ellipse cx="766" cy="254" rx="38" ry="17" fill="#080a0c" opacity="0.94" />
      {/* Timber frame: vertical posts */}
      <rect x="722" y="244" width="13" height="104" rx="2" fill="#5c3f1c" />
      <rect x="797" y="244" width="13" height="104" rx="2" fill="#5c3f1c" />
      {/* Header beam */}
      <rect x="717" y="243" width="98" height="13" rx="2" fill="#6e4a22" />
      <rect x="717" y="243" width="98" height="3" rx="1" fill="#9a6a34" opacity="0.55" />
      {/* Diagonal knee braces */}
      <line x1="735" y1="256" x2="762" y2="240" stroke="#5c3f1c" strokeWidth="8" strokeLinecap="round" />
      <line x1="797" y1="256" x2="770" y2="240" stroke="#5c3f1c" strokeWidth="8" strokeLinecap="round" />
      {/* Angled side supports to ground */}
      <line x1="728" y1="290" x2="698" y2="350" stroke="#4a3014" strokeWidth="7" strokeLinecap="round" opacity="0.78" />
      <line x1="810" y1="290" x2="840" y2="350" stroke="#4a3014" strokeWidth="7" strokeLinecap="round" opacity="0.78" />
      {/* Sign board above entrance */}
      <rect x="744" y="228" width="44" height="16" rx="2" fill="#7a5828" opacity="0.85" />
      <rect x="744" y="228" width="44" height="16" rx="2" fill="none" stroke="#5a3818" strokeWidth="1.5" />
      {/* Cart tracks */}
      <line x1="630" y1="346" x2="898" y2="338" stroke="#7a6848" strokeWidth="4" opacity="0.65" />
      <line x1="630" y1="358" x2="898" y2="350" stroke="#7a6848" strokeWidth="4" opacity="0.65" />
      {[0,1,2,3,4,5,6,7,8,9].map(i => (
        <line key={i} x1={638+i*26} y1="344" x2={640+i*26} y2="360" stroke="#6a5838" strokeWidth="2.5" opacity="0.5" />
      ))}
      {/* Mine cart with ore load */}
      <rect x="662" y="318" width="56" height="34" rx="3" fill="#4a3a26" />
      <rect x="662" y="318" width="56" height="9" rx="2" fill="#665040" />
      <ellipse cx="690" cy="318" rx="24" ry="9" fill="#78889a" />
      <ellipse cx="684" cy="312" rx="14" ry="7" fill="#8898a8" opacity="0.85" />
      <circle cx="682" cy="310" r="3" fill="#b0d8f0" opacity="0.7" />
      <circle cx="674" cy="352" r="9" fill="none" stroke="#5a4030" strokeWidth="3.5" />
      <circle cx="674" cy="352" r="3.5" fill="#5a4030" />
      <line x1="674" y1="343" x2="674" y2="361" stroke="#5a4030" strokeWidth="2" />
      <line x1="665" y1="352" x2="683" y2="352" stroke="#5a4030" strokeWidth="2" />
      <circle cx="706" cy="352" r="9" fill="none" stroke="#5a4030" strokeWidth="3.5" />
      <circle cx="706" cy="352" r="3.5" fill="#5a4030" />
      <line x1="706" y1="343" x2="706" y2="361" stroke="#5a4030" strokeWidth="2" />
      <line x1="697" y1="352" x2="715" y2="352" stroke="#5a4030" strokeWidth="2" />
      {/* Hanging lanterns flanking entrance */}
      <circle cx="716" cy="260" r="20" fill="#f8a030" opacity="0.13" />
      <circle cx="816" cy="260" r="20" fill="#f8a030" opacity="0.13" />
      <line x1="718" y1="242" x2="718" y2="254" stroke="#4a3820" strokeWidth="2" />
      <rect x="711" y="254" width="14" height="18" rx="3" fill="#c86820" />
      <rect x="711" y="254" width="14" height="18" rx="3" fill="none" stroke="#8a4810" strokeWidth="1.5" />
      <ellipse cx="718" cy="256" rx="7" ry="2.5" fill="#e88030" opacity="0.7" />
      <line x1="816" y1="242" x2="816" y2="254" stroke="#4a3820" strokeWidth="2" />
      <rect x="809" y="254" width="14" height="18" rx="3" fill="#c86820" />
      <rect x="809" y="254" width="14" height="18" rx="3" fill="none" stroke="#8a4810" strokeWidth="1.5" />
      <ellipse cx="816" cy="256" rx="7" ry="2.5" fill="#e88030" opacity="0.7" />
      {/* Tailings pile — rubble mound right of entrance */}
      <ellipse cx="916" cy="358" rx="72" ry="22" fill="#4a4438" opacity="0.58" />
      <polygon points="874,352 916,328 958,352" fill="#524c44" opacity="0.52" />
      <polygon points="888,352 920,336 952,352" fill="#5c5650" opacity="0.42" />
      <circle cx="906" cy="336" r="3" fill="#a0c0d0" opacity="0.52" />
      <circle cx="926" cy="342" r="2" fill="#c8e4f8" opacity="0.58" />
      <circle cx="942" cy="336" r="2.5" fill="#b8d0e0" opacity="0.48" />
      {/* Barrels stacked left of entrance */}
      <ellipse cx="634" cy="346" rx="18" ry="7.5" fill="#7a5030" opacity="0.72" />
      <rect x="616" y="318" width="36" height="32" rx="3" fill="#7a5030" opacity="0.78" />
      <ellipse cx="634" cy="318" rx="18" ry="7.5" fill="#8a6040" opacity="0.78" />
      <line x1="616" y1="326" x2="652" y2="326" stroke="#5a3820" strokeWidth="2" opacity="0.45" />
      <line x1="616" y1="334" x2="652" y2="334" stroke="#5a3820" strokeWidth="2" opacity="0.45" />
      <ellipse cx="658" cy="348" rx="16" ry="6.5" fill="#6a4828" opacity="0.68" />
      <rect x="642" y="322" width="32" height="30" rx="3" fill="#6a4828" opacity="0.72" />
      <ellipse cx="658" cy="322" rx="16" ry="6.5" fill="#7a5838" opacity="0.72" />
      <line x1="642" y1="330" x2="674" y2="330" stroke="#4a3018" strokeWidth="2" opacity="0.4" />
      {/* Rocky outcroppings foreground */}
      <polygon points="46,372 82,326 116,344 130,374" fill="#3c4044" opacity="0.58" />
      <polygon points="86,378 116,346 142,374" fill="#2e3236" opacity="0.5" />
      <line x1="54" y1="364" x2="86" y2="328" stroke="#5c6468" strokeWidth="1.5" opacity="0.38" />
      <polygon points="942,366 978,328 1012,346 1026,368" fill="#3c4044" opacity="0.52" />
      <polygon points="982,374 1008,348 1034,368" fill="#2e3236" opacity="0.44" />
      <line x1="952" y1="360" x2="982" y2="330" stroke="#5c6468" strokeWidth="1.5" opacity="0.35" />
      {/* Smoke wisps from mine entrance */}
      <ellipse cx="750" cy="228" rx="9" ry="14" fill="rgba(160,152,144,.2)" />
      <ellipse cx="758" cy="212" rx="7" ry="11" fill="rgba(160,152,144,.15)" />
      <ellipse cx="764" cy="198" rx="5.5" ry="9" fill="rgba(160,152,144,.1)" />
      <ellipse cx="774" cy="222" rx="8" ry="12" fill="rgba(160,152,144,.18)" />
      <ellipse cx="780" cy="208" rx="6" ry="10" fill="rgba(160,152,144,.13)" />
      {/* Ground pebbles */}
      <ellipse cx="415" cy="386" rx="9" ry="4" fill="#3c3e42" opacity="0.4" />
      <ellipse cx="455" cy="380" rx="7" ry="3" fill="#484c50" opacity="0.36" />
      <ellipse cx="538" cy="388" rx="8" ry="3.5" fill="#3c3e42" opacity="0.38" />
      <ellipse cx="576" cy="382" rx="6" ry="2.5" fill="#484c50" opacity="0.33" />
    </>
  );
}
