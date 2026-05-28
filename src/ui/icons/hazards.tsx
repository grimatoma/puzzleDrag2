import { useId } from "react";
import type { IconProps } from "./types.js";
import { TileFire, TileIce } from "./tiles.js";

export function HzRats({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><linearGradient id={`${u}g`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5a5149"/><stop offset="1" stopColor="#2c2620"/></linearGradient></defs>
      <ellipse cx="11" cy="19" rx="8" ry="1.4" fill="#000" opacity="0.16"/>
      <path d="M5 15 Q1.4 15.2 1.8 18 Q2.1 20.6 4.6 19.6" stroke="#6a5a4e" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
      <ellipse cx="10.5" cy="14" rx="7" ry="4.2" fill={`url(#${u}g)`} stroke="#1c1712" strokeWidth="0.7"/>
      <circle cx="16.8" cy="12.8" r="3.1" fill={`url(#${u}g)`} stroke="#1c1712" strokeWidth="0.7"/>
      <ellipse cx="15.4" cy="9.7" rx="1.7" ry="1.9" fill="#6a5a4e" stroke="#1c1712" strokeWidth="0.5"/>
      <ellipse cx="15.4" cy="9.9" rx="0.8" ry="1" fill="#a07a86"/>
      <path d="M19.4 12.6 Q21 12.4 21.6 13" stroke="#1c1712" strokeWidth="0.5" fill="none"/>
      <circle cx="19.7" cy="13.2" r="0.7" fill="#2c2620"/>
      <circle cx="18.2" cy="12.2" r="0.8" fill="#ffce5a"/>
      <circle cx="18.4" cy="12.1" r="0.3" fill="#3a2a10"/>
      <path d="M19.6 13.6 L22.4 13 M19.6 14 L22.4 14.4" stroke="#8a7a6e" strokeWidth="0.4" strokeLinecap="round"/>
      <ellipse cx="9" cy="12.4" rx="3.4" ry="1.4" fill="#7a6e62" opacity="0.4"/>
    </svg>
  );
}

export function HzFire({ size = 24 }: IconProps) {
  return <TileFire size={size}/>;
}

export function HzFrost({ size = 24 }: IconProps) {
  return <TileIce size={size}/>;
}

export function HzBlight({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <radialGradient id={`${u}h`} cx="50%" cy="50%" r="52%"><stop offset="0" stopColor="#a86ec0" stopOpacity="0.4"/><stop offset="100%" stopColor="#a86ec0" stopOpacity="0"/></radialGradient>
        <linearGradient id={`${u}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a5a86"/><stop offset="1" stopColor="#43264e"/></linearGradient>
      </defs>
      <circle cx="12" cy="12.5" r="11" fill={`url(#${u}h)`}/>
      <path d="M12 4.6 Q7.8 4.8 7 8.6 Q3.8 9.8 4.8 13.4 Q3.8 17.6 7.8 18.4 Q9.6 21.6 12 18.8 Q14.4 21.6 16.2 18.4 Q20.2 17.6 19.2 13.4 Q20.2 9.8 17 8.6 Q16.2 4.8 12 4.6 Z" fill={`url(#${u}g)`} stroke="#2a1830" strokeWidth="0.8" strokeLinejoin="round"/>
      <circle cx="9.4" cy="10.6" r="1.7" fill="#2a1830"/><circle cx="9.4" cy="10.6" r="0.7" fill="#d8b6e8"/>
      <circle cx="15" cy="11.4" r="1.5" fill="#2a1830"/><circle cx="15" cy="11.4" r="0.6" fill="#d8b6e8"/>
      <circle cx="11.8" cy="14.6" r="1.3" fill="#2a1830"/><circle cx="11.8" cy="14.6" r="0.5" fill="#d8b6e8"/>
      <path d="M9.4 18.2 Q9.3 20.6 9.9 21.4 Q10.5 20.6 10.3 18.4" fill={`url(#${u}g)`}/>
      <path d="M14.4 18.2 Q14.5 20.4 15 21.1 Q15.5 20.4 15.2 18.4" fill={`url(#${u}g)`}/>
    </svg>
  );
}

export function HzStorm({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><linearGradient id={`${u}g`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7c8896"/><stop offset="1" stopColor="#46505c"/></linearGradient></defs>
      <path d="M6 15.5 Q2.6 15.5 2.6 12.3 Q2.6 9.2 5.8 9.4 Q6.8 6.6 10 7.2 Q13.4 5.4 16 8.8 Q20.2 8.4 20.6 12.4 Q21 15.5 17 15.5 Z" fill={`url(#${u}g)`} stroke="#2e353d" strokeWidth="0.7" strokeLinejoin="round"/>
      <path d="M5.6 11 Q8 9.6 11 10.2" stroke="#aeb8c2" strokeWidth="0.7" fill="none" opacity="0.5" strokeLinecap="round"/>
      <path d="M12.6 14.5 L9.6 18.4 L11.9 18.4 L9.4 22.4 L15.2 16.6 L12.6 16.6 L14.4 14.5 Z" fill="#ffd23a" stroke="#caa01e" strokeWidth="0.5" strokeLinejoin="round"/>
      <path d="M6 17 L5 19.4 M8 18.5 L7 21 M17 17.5 L16 20" stroke="#8fb6d6" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

export function HzKeeper({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}c`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5c4c33"/><stop offset="1" stopColor="#281d11"/></linearGradient>
        <radialGradient id={`${u}e`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fff6c8"/><stop offset="0.4" stopColor="#ffd23a"/><stop offset="100%" stopColor="#ffd23a" stopOpacity="0"/></radialGradient>
      </defs>
      <ellipse cx="12" cy="22.3" rx="8" ry="1.6" fill="#000" opacity="0.22"/>
      <path d="M8.8 7.4 Q7 3.6 4.6 2.4 M7.7 5 L5.7 4.2 M8.1 3.5 L6.3 2.5" stroke="#d8c6a0" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
      <path d="M15.2 7.4 Q17 3.6 19.4 2.4 M16.3 5 L18.3 4.2 M15.9 3.5 L17.7 2.5" stroke="#d8c6a0" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
      <path d="M12 4 Q6.8 4.6 6 10 L4.6 22 L19.4 22 L18 10 Q17.2 4.6 12 4 Z" fill={`url(#${u}c)`} stroke="#1a1208" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M12 6.4 Q8.7 6.9 8.1 11 Q7.9 14.2 12 14.2 Q16.1 14.2 15.9 11 Q15.3 6.9 12 6.4 Z" fill="#100a04"/>
      <circle cx="9.9" cy="10.7" r="2.5" fill={`url(#${u}e)`}/>
      <circle cx="14.1" cy="10.7" r="2.5" fill={`url(#${u}e)`}/>
      <circle cx="9.9" cy="10.7" r="0.95" fill="#fff7d6"/>
      <circle cx="14.1" cy="10.7" r="0.95" fill="#fff7d6"/>
      <path d="M9 13 L7.9 21 M15 13 L16.1 21" stroke="#6f5c3c" strokeWidth="0.6" opacity="0.5" fill="none"/>
    </svg>
  );
}
