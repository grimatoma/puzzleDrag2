import { useId } from "react";
import type { IconProps } from "./types.js";

export function BldgBakery({ size = 32 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}wall`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f1d29a"/><stop offset="1" stopColor="#d4a35a"/></linearGradient>
        <linearGradient id={`${u}roof`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dc8049"/><stop offset="1" stopColor="#a8451f"/></linearGradient>
        <radialGradient id={`${u}glow`} cx="50%" cy="78%" r="70%"><stop offset="0" stopColor="#fff0b0"/><stop offset="0.55" stopColor="#ff9e3c"/><stop offset="1" stopColor="#c75418"/></radialGradient>
      </defs>
      <ellipse cx="12" cy="22.2" rx="9" ry="1.6" fill="#000" opacity="0.15"/>
      <rect x="16.1" y="5.5" width="2.3" height="5" rx="0.5" fill="#8a5326" stroke="#5a2f16" strokeWidth="0.6"/>
      <circle cx="17.2" cy="4.6" r="1.3" fill="#fff" opacity="0.55"/><circle cx="18.8" cy="3.2" r="0.9" fill="#fff" opacity="0.4"/>
      <path d="M4 22 L4 11 L20 11 L20 22 Z" fill={`url(#${u}wall)`} stroke="#6e4a22" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M2.4 11.6 L12 4 L21.6 11.6 Z" fill={`url(#${u}roof)`} stroke="#5a2f16" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M5.2 10.8 L12 5.5" stroke="#fff" strokeWidth="0.9" opacity="0.35" fill="none" strokeLinecap="round"/>
      <path d="M8.4 22 L8.4 16.6 Q8.4 13.7 12 13.7 Q15.6 13.7 15.6 16.6 L15.6 22 Z" fill="#2a1408"/>
      <path d="M9.4 22 L9.4 16.8 Q9.4 14.7 12 14.7 Q14.6 14.7 14.6 16.8 L14.6 22 Z" fill={`url(#${u}glow)`}/>
      <ellipse cx="12" cy="19.4" rx="1.5" ry="1.1" fill="#fff5cf" opacity="0.7"/>
    </svg>
  );
}

export function BldgSmithy({ size = 32 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}wallc`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a8378"/><stop offset="1" stopColor="#564f46"/></linearGradient>
        <linearGradient id={`${u}roof`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a443e"/><stop offset="1" stopColor="#2a251f"/></linearGradient>
        <radialGradient id={`${u}forge`} cx="50%" cy="80%" r="72%"><stop offset="0" stopColor="#ffe09a"/><stop offset="0.5" stopColor="#ff8a32"/><stop offset="1" stopColor="#b5371a"/></radialGradient>
      </defs>
      <ellipse cx="12" cy="22.2" rx="9" ry="1.6" fill="#000" opacity="0.17"/>
      <rect x="15.4" y="4" width="2.6" height="6.4" rx="0.4" fill="#4a443e" stroke="#241f1a" strokeWidth="0.6"/>
      <circle cx="16.7" cy="3.2" r="0.9" fill="#7a746c" opacity="0.7"/>
      <path d="M15 3 l0.4 1.1 M17.4 2.6 l-0.3 1.1 M18.6 3.6 l-0.6 0.9" stroke="#ff9a3a" strokeWidth="0.7" strokeLinecap="round"/>
      <path d="M4 22 L4 11.5 L20 11.5 L20 22 Z" fill={`url(#${u}wallc)`} stroke="#2a251f" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M2.6 12 L12 5 L21.4 12 Z" fill={`url(#${u}roof)`} stroke="#1f1b16" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M5 11.5 L19 11.5 M4.5 15 L19.5 15" stroke="#3f3933" strokeWidth="0.5" opacity="0.6"/>
      <path d="M8.4 22 L8.4 16.4 Q8.4 13.6 12 13.6 Q15.6 13.6 15.6 16.4 L15.6 22 Z" fill="#1c1410"/>
      <path d="M9.3 22 L9.3 16.7 Q9.3 14.6 12 14.6 Q14.7 14.6 14.7 16.7 L14.7 22 Z" fill={`url(#${u}forge)`}/>
      <path d="M9.8 20.6 L14.2 20.6 L14.2 21.3 L12.9 21.5 L13.3 22 L10.7 22 L11.1 21.5 L9.8 21.3 Z" fill="#1a130d"/>
    </svg>
  );
}

export function BldgScriptorium({ size = 32 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}wall`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cdd9e6"/><stop offset="1" stopColor="#9fb2c6"/></linearGradient>
        <linearGradient id={`${u}roof`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6a5a48"/><stop offset="1" stopColor="#463a2c"/></linearGradient>
      </defs>
      <ellipse cx="12" cy="22.2" rx="9" ry="1.6" fill="#000" opacity="0.15"/>
      <path d="M4 22 L4 11 L20 11 L20 22 Z" fill={`url(#${u}wall)`} stroke="#54606e" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M2.6 11.6 L12 4.5 L21.4 11.6 Z" fill={`url(#${u}roof)`} stroke="#2e261c" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M5.2 11 L12 6" stroke="#fff" strokeWidth="0.8" opacity="0.3" fill="none" strokeLinecap="round"/>
      <path d="M6 13.6 Q6 12.4 7.2 12.4 Q8.4 12.4 8.4 13.6 L8.4 16.2 L6 16.2 Z" fill="#ffe7a8"/>
      <path d="M15.6 13.6 Q15.6 12.4 16.8 12.4 Q18 12.4 18 13.6 L18 16.2 L15.6 16.2 Z" fill="#ffe7a8"/>
      <path d="M12 19.4 Q9.4 17.8 6.6 18.4 L6.6 14.2 Q9.4 13.6 12 15.4 Z" fill="#f4efe2" stroke="#7a7060" strokeWidth="0.5" strokeLinejoin="round"/>
      <path d="M12 19.4 Q14.6 17.8 17.4 18.4 L17.4 14.2 Q14.6 13.6 12 15.4 Z" fill="#fbf7ec" stroke="#7a7060" strokeWidth="0.5" strokeLinejoin="round"/>
      <path d="M12 15.4 L12 19.4" stroke="#6a6052" strokeWidth="0.6"/>
      <path d="M7.6 15.4 L10.6 15 M7.6 16.7 L10.6 16.3 M13.4 15 L16.4 15.4 M13.4 16.3 L16.4 16.7" stroke="#9aa0a8" strokeWidth="0.4"/>
    </svg>
  );
}

export function BldgTea({ size = 32, fill = "#90c890" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 22 L3 14 L21 14 L21 22 Z" fill="#4a3220"/>
      <path d="M2 14 L12 6 L22 14 Z" fill={fill}/>
      <path d="M2 14 L12 8 L22 14" stroke="#3a5030" strokeWidth="0.4"/>
      <ellipse cx="12" cy="11" rx="0.7" ry="2" fill="#fff" opacity="0.5"/>
      <rect x="10" y="17" width="4" height="5" fill="#1a0e08"/>
    </svg>
  );
}

export function BldgKitchen({ size = 32 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}wall`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e6c79a"/><stop offset="1" stopColor="#c79a64"/></linearGradient>
        <linearGradient id={`${u}roof`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b86a3e"/><stop offset="1" stopColor="#8a4824"/></linearGradient>
      </defs>
      <ellipse cx="12" cy="22.2" rx="9" ry="1.6" fill="#000" opacity="0.15"/>
      <rect x="6" y="5" width="2.4" height="5.5" rx="0.4" fill="#9a6e3e" stroke="#5a3c1c" strokeWidth="0.6"/>
      <path d="M6.4 4.4 Q5.6 3.4 6.6 2.6 M7.8 4.4 Q8.6 3.4 7.6 2.6" stroke="#fff" strokeWidth="1" opacity="0.5" fill="none" strokeLinecap="round"/>
      <path d="M4 22 L4 11 L20 11 L20 22 Z" fill={`url(#${u}wall)`} stroke="#6e4a22" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M2.6 11.6 L12 4.6 L21.4 11.6 Z" fill={`url(#${u}roof)`} stroke="#5a2f16" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M5.4 11 L12 6.1" stroke="#fff" strokeWidth="0.8" opacity="0.3" fill="none" strokeLinecap="round"/>
      <rect x="8" y="13.2" width="8" height="6.6" rx="0.6" fill="#241810"/>
      <rect x="8.8" y="14" width="6.4" height="5" rx="0.4" fill="#ffcaa0" opacity="0.5"/>
      <path d="M9.6 19.4 Q9.6 16 12 16 Q14.4 16 14.4 19.4 Z" fill="#3a352f"/>
      <rect x="9" y="15.2" width="6" height="1.1" rx="0.5" fill="#4a443c"/>
      <circle cx="12" cy="15" r="0.6" fill="#5a544a"/>
      <path d="M11 14.4 Q10.2 13.4 11 12.6 M13 14.4 Q13.8 13.4 13 12.6" stroke="#fff" strokeWidth="0.7" opacity="0.6" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

export function BldgMarket({ size = 32 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><clipPath id={`${u}aw`}><path d="M2.4 6 L21.6 6 L21.6 9 L20 10.6 L18.4 9 L16.8 10.6 L15.2 9 L13.6 10.6 L12 9 L10.4 10.6 L8.8 9 L7.2 10.6 L5.6 9 L4 10.6 L2.4 9 Z"/></clipPath></defs>
      <ellipse cx="12" cy="22.2" rx="9" ry="1.6" fill="#000" opacity="0.15"/>
      <rect x="3.6" y="6" width="1.5" height="15.6" fill="#7a5226" stroke="#5a3c18" strokeWidth="0.4"/>
      <rect x="18.9" y="6" width="1.5" height="15.6" fill="#7a5226" stroke="#5a3c18" strokeWidth="0.4"/>
      <rect x="4.8" y="11" width="14.4" height="10.6" fill="#caa05e" stroke="#6e4a22" strokeWidth="0.7"/>
      <rect x="3.4" y="15.6" width="17.2" height="2.6" rx="0.4" fill="#8a5e2e" stroke="#5a3c18" strokeWidth="0.6"/>
      <circle cx="7.6" cy="14.6" r="1.5" fill="#d8453a"/><circle cx="10.7" cy="14.6" r="1.5" fill="#e8a83a"/>
      <circle cx="13.8" cy="14.6" r="1.5" fill="#6aa83a"/><circle cx="16.6" cy="14.8" r="1.3" fill="#c8453a"/>
      <g clipPath={`url(#${u}aw)`}>
        <rect x="2.4" y="5.6" width="19.2" height="5.4" fill="#f4e6c8"/>
        <rect x="2.4" y="5.6" width="2.4" height="5.4" fill="#cf4a3a"/>
        <rect x="7.2" y="5.6" width="2.4" height="5.4" fill="#cf4a3a"/>
        <rect x="12" y="5.6" width="2.4" height="5.4" fill="#cf4a3a"/>
        <rect x="16.8" y="5.6" width="2.4" height="5.4" fill="#cf4a3a"/>
      </g>
      <path d="M2.4 6 L21.6 6 L21.6 9 L20 10.6 L18.4 9 L16.8 10.6 L15.2 9 L13.6 10.6 L12 9 L10.4 10.6 L8.8 9 L7.2 10.6 L5.6 9 L4 10.6 L2.4 9 Z" fill="none" stroke="#8a3026" strokeWidth="0.7" strokeLinejoin="round"/>
    </svg>
  );
}

export function BldgDock({ size = 32 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><linearGradient id={`${u}water`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fbcd4"/><stop offset="1" stopColor="#3a7ea0"/></linearGradient></defs>
      <path d="M2 17.5 Q5 16.3 8 17.5 Q11 18.7 14 17.5 Q17 16.3 20 17.5 Q22 18.1 22 19.4 L22 22 L2 22 Z" fill={`url(#${u}water)`}/>
      <path d="M3 19 Q6 18 9 19 M13 19.4 Q16 18.4 19 19.4" stroke="#cdeefa" strokeWidth="0.7" fill="none" opacity="0.6" strokeLinecap="round"/>
      <line x1="17.5" y1="3.5" x2="17.5" y2="15" stroke="#5a3c18" strokeWidth="1"/>
      <path d="M17.5 4 L17.5 13.5 L11.5 13.5 Z" fill="#f4ead2" stroke="#b8a880" strokeWidth="0.6" strokeLinejoin="round"/>
      <path d="M17 5.5 L13.5 12.6" stroke="#d8cab0" strokeWidth="0.5"/>
      <path d="M11 14 L20.5 14 L18.6 17 L12.9 17 Z" fill="#8a5e2e" stroke="#5a3c18" strokeWidth="0.7" strokeLinejoin="round"/>
      <path d="M11.6 15 L19.9 15" stroke="#b58a52" strokeWidth="0.6" opacity="0.6"/>
      <rect x="3" y="14.5" width="7.5" height="1.8" fill="#9a6e3e" stroke="#5a3c18" strokeWidth="0.5"/>
      <rect x="3.6" y="16" width="1.3" height="4" fill="#6e4a22"/>
      <rect x="8.2" y="16" width="1.3" height="4" fill="#6e4a22"/>
    </svg>
  );
}

export function BldgSilo({ size = 32 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}body`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#e6d6aa"/><stop offset="1" stopColor="#a88e54"/></linearGradient>
        <linearGradient id={`${u}dome`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d8c69a"/><stop offset="1" stopColor="#9a824c"/></linearGradient>
      </defs>
      <ellipse cx="12" cy="22.2" rx="7.5" ry="1.5" fill="#000" opacity="0.16"/>
      <path d="M7.5 22 L7.5 9 L16.5 9 L16.5 22 Z" fill={`url(#${u}body)`} stroke="#7a6224" strokeWidth="0.8"/>
      <path d="M6.6 9 Q12 3.4 17.4 9 Z" fill={`url(#${u}dome)`} stroke="#5a4a24" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M9 8 Q11.4 5 13.6 6" stroke="#fff" strokeWidth="0.8" opacity="0.4" fill="none" strokeLinecap="round"/>
      <line x1="7.5" y1="12.4" x2="16.5" y2="12.4" stroke="#8a7030" strokeWidth="0.6" opacity="0.6"/>
      <line x1="7.5" y1="16" x2="16.5" y2="16" stroke="#8a7030" strokeWidth="0.6" opacity="0.6"/>
      <rect x="10.3" y="17.4" width="3.4" height="4.6" rx="0.4" fill="#7a6230" stroke="#5a4a24" strokeWidth="0.5"/>
      <rect x="8.4" y="10" width="1.3" height="11" fill="#fff" opacity="0.18"/>
    </svg>
  );
}

export function BldgInn({ size = 32 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}wall`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c98f5e"/><stop offset="1" stopColor="#9a6038"/></linearGradient>
        <linearGradient id={`${u}roof`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7a4a2c"/><stop offset="1" stopColor="#4e2e18"/></linearGradient>
      </defs>
      <ellipse cx="12" cy="22.2" rx="9" ry="1.6" fill="#000" opacity="0.16"/>
      <rect x="15.6" y="6.5" width="2.3" height="5" rx="0.5" fill="#7a4a2c" stroke="#3a220f" strokeWidth="0.6"/>
      <circle cx="16.7" cy="5.6" r="1.1" fill="#fff" opacity="0.5"/>
      <path d="M4 22 L4 12 L20 12 L20 22 Z" fill={`url(#${u}wall)`} stroke="#5a3620" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M2.6 12.4 L6.5 8 L17.5 8 L21.4 12.4 Z" fill={`url(#${u}roof)`} stroke="#2e1c10" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M7 11.8 L8.6 9.4" stroke="#fff" strokeWidth="0.8" opacity="0.3" fill="none" strokeLinecap="round"/>
      <rect x="10.4" y="16" width="3.4" height="6" rx="0.3" fill="#4a2c18" stroke="#2e1c10" strokeWidth="0.5"/>
      <circle cx="13" cy="19.2" r="0.5" fill="#e8c060"/>
      <rect x="5.8" y="14.4" width="3" height="3" rx="0.3" fill="#ffd86a" stroke="#5a3620" strokeWidth="0.5"/>
      <rect x="15.2" y="14.4" width="3" height="3" rx="0.3" fill="#ffd86a" stroke="#5a3620" strokeWidth="0.5"/>
      <path d="M7.3 14.4 L7.3 17.4 M5.8 15.9 L8.8 15.9 M16.7 14.4 L16.7 17.4 M15.2 15.9 L18.2 15.9" stroke="#5a3620" strokeWidth="0.5"/>
      <line x1="4" y1="13.4" x2="1.8" y2="13.4" stroke="#3a2410" strokeWidth="0.8"/>
      <rect x="0.6" y="13.4" width="3" height="2.8" rx="0.3" fill="#6e4a26" stroke="#3a2410" strokeWidth="0.5"/>
      <path d="M1.4 14.2 L2.8 14.2 L2.8 15 Q2.8 15.6 2.1 15.6 Q1.4 15.6 1.4 15 Z M2.8 14.4 Q3.2 14.4 3.2 14.8 Q3.2 15.2 2.8 15.2" fill="#f4e6c8"/>
    </svg>
  );
}

export function BldgStable({ size = 32 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}wall`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bb6240"/><stop offset="1" stopColor="#8a3f28"/></linearGradient>
        <linearGradient id={`${u}roof`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9a4a30"/><stop offset="1" stopColor="#6e3020"/></linearGradient>
      </defs>
      <ellipse cx="12" cy="22.2" rx="9" ry="1.6" fill="#000" opacity="0.16"/>
      <rect x="4.5" y="11" width="15" height="11" fill={`url(#${u}wall)`} stroke="#3a1e12" strokeWidth="0.8"/>
      <path d="M3.4 11 L7 7 L9.8 4.6 L14.2 4.6 L17 7 L20.6 11 Z" fill={`url(#${u}roof)`} stroke="#3a1e12" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M5 10.4 L8 7.2" stroke="#fff" strokeWidth="0.8" opacity="0.25" fill="none" strokeLinecap="round"/>
      <rect x="10.7" y="6.6" width="2.6" height="2.6" rx="0.3" fill="#2a1812"/>
      <path d="M12 6.6 L12 9.2 M10.7 7.9 L13.3 7.9" stroke="#caa176" strokeWidth="0.4"/>
      <rect x="7.8" y="13" width="8.4" height="9" rx="0.4" fill="#7a3a22" stroke="#3a1e12" strokeWidth="0.7"/>
      <line x1="12" y1="13" x2="12" y2="22" stroke="#3a1e12" strokeWidth="0.7"/>
      <g stroke="#f0e6d2" strokeWidth="0.9">
        <path d="M8.2 13.4 L11.6 16.8 M8.2 21.6 L11.6 18.2"/>
        <path d="M15.8 13.4 L12.4 16.8 M15.8 21.6 L12.4 18.2"/>
      </g>
      <rect x="7.8" y="13" width="8.4" height="9" rx="0.4" fill="none" stroke="#f0e6d2" strokeWidth="0.6" opacity="0.5"/>
    </svg>
  );
}
