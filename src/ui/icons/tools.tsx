import { useId } from "react";
import type { IconProps } from "./types.js";

export function ToolHoe({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}w`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#bb8344"/><stop offset="1" stopColor="#6e4518"/></linearGradient>
        <linearGradient id={`${u}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f0f4f7"/><stop offset="1" stopColor="#869098"/></linearGradient>
      </defs>
      <ellipse cx="10" cy="21.3" rx="6.5" ry="1.3" fill="#000" opacity="0.14"/>
      <line x1="5" y1="20.5" x2="16.5" y2="7" stroke="#3a2410" strokeWidth="3.1" strokeLinecap="round"/>
      <line x1="5" y1="20.5" x2="16.5" y2="7" stroke={`url(#${u}w)`} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M15.6 6.4 L21 4.6 Q21.8 4.4 21.7 5.3 L21.3 8.2 L17.4 9.6 Q16.2 8.2 15.6 6.4 Z" fill={`url(#${u}s)`} stroke="#3a4047" strokeWidth="0.7" strokeLinejoin="round"/>
      <path d="M16.6 6.6 L20.6 5.3" stroke="#ffffff" strokeWidth="0.7" opacity="0.6" strokeLinecap="round"/>
    </svg>
  );
}

export function ToolWater({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><linearGradient id={`${u}g`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#bcdcec"/><stop offset="1" stopColor="#5f9cba"/></linearGradient></defs>
      <ellipse cx="10.5" cy="21" rx="6.5" ry="1.3" fill="#000" opacity="0.14"/>
      <path d="M12.5 13 L19 7.5" stroke="#3a6378" strokeWidth="2.6" strokeLinecap="round"/>
      <path d="M12.5 13 L19 7.5" stroke={`url(#${u}g)`} strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M17.2 5.8 L21.6 9 L20.3 10.7 L15.9 7.5 Z" fill={`url(#${u}g)`} stroke="#3a6378" strokeWidth="0.7" strokeLinejoin="round"/>
      <circle cx="17.9" cy="6.9" r="0.34" fill="#2a4d5e"/><circle cx="18.9" cy="7.6" r="0.34" fill="#2a4d5e"/><circle cx="19.8" cy="8.4" r="0.34" fill="#2a4d5e"/>
      <path d="M5.5 12.2 Q7 8.4 11.2 9.6" stroke="#3a6378" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <path d="M5.5 12.2 Q7 8.4 11.2 9.6" stroke={`url(#${u}g)`} strokeWidth="0.9" fill="none" strokeLinecap="round"/>
      <path d="M4.5 12.5 L13.5 12.5 L12.8 19 Q12.4 20.6 9 20.6 Q5.6 20.6 5.2 19 Z" fill={`url(#${u}g)`} stroke="#3a6378" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M6 14.2 L11.5 14.2" stroke="#eaf5fb" strokeWidth="0.7" opacity="0.6" strokeLinecap="round"/>
      <path d="M20.4 12 Q19.9 13.1 20.9 13.1 Q21.9 13.1 21.4 12 Q20.9 11 20.4 12 Z" fill="#7ec0e0"/>
      <circle cx="22.2" cy="14.6" r="0.7" fill="#7ec0e0"/>
    </svg>
  );
}

export function ToolRake({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}w`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#bb8344"/><stop offset="1" stopColor="#6e4518"/></linearGradient>
        <linearGradient id={`${u}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f0f4f7"/><stop offset="1" stopColor="#869098"/></linearGradient>
      </defs>
      <ellipse cx="10" cy="21.3" rx="6.5" ry="1.3" fill="#000" opacity="0.14"/>
      <line x1="5" y1="20.5" x2="16" y2="7.5" stroke="#3a2410" strokeWidth="3.1" strokeLinecap="round"/>
      <line x1="5" y1="20.5" x2="16" y2="7.5" stroke={`url(#${u}w)`} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M12.8 5.4 L20.6 8.4" stroke="#3a4047" strokeWidth="2.4" strokeLinecap="round"/>
      <path d="M12.8 5.4 L20.6 8.4" stroke={`url(#${u}s)`} strokeWidth="1.4" strokeLinecap="round"/>
      <g stroke={`url(#${u}s)`} strokeWidth="1.3" strokeLinecap="round">
        <path d="M13.2 5.8 L12.5 8.4"/>
        <path d="M15.1 6.5 L14.6 9.1"/>
        <path d="M17 7.2 L16.7 9.8"/>
        <path d="M18.9 7.9 L18.8 10.5"/>
        <path d="M20.5 8.5 L20.6 11.1"/>
      </g>
      <path d="M13.4 5.9 L19.9 8.4" stroke="#ffffff" strokeWidth="0.5" opacity="0.6"/>
    </svg>
  );
}

export function ToolFirebreak({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}f`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#d23a16"/><stop offset="0.5" stopColor="#ff7a2e"/><stop offset="1" stopColor="#ffc23a"/></linearGradient>
        <linearGradient id={`${u}b`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#dde3e7"/><stop offset="1" stopColor="#8a949c"/></linearGradient>
      </defs>
      <path d="M12 22 Q4 17 6 11 Q8 8 9 11 Q9 6 12 2 Q14 5 14 8 Q18 6 18 13 Q19 18 12 22 Z" fill={`url(#${u}f)`} opacity="0.5" stroke="#b5301a" strokeWidth="0.4"/>
      <line x1="3.5" y1="6.5" x2="20.5" y2="21.5" stroke="#2b2218" strokeWidth="3.3" strokeLinecap="round"/>
      <line x1="3.5" y1="6.5" x2="20.5" y2="21.5" stroke={`url(#${u}b)`} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="4.3" y1="6.9" x2="11" y2="12.8" stroke="#ffffff" strokeWidth="0.7" opacity="0.5" strokeLinecap="round"/>
    </svg>
  );
}

export function ToolAxe({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}w`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#bb8344"/><stop offset="1" stopColor="#6e4518"/></linearGradient>
        <linearGradient id={`${u}s`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f0f4f7"/><stop offset="0.5" stopColor="#aab4bd"/><stop offset="1" stopColor="#79858f"/></linearGradient>
      </defs>
      <ellipse cx="11" cy="21.4" rx="6.5" ry="1.4" fill="#000" opacity="0.15"/>
      <line x1="5.5" y1="20.5" x2="15" y2="9" stroke="#3a2410" strokeWidth="3.4" strokeLinecap="round"/>
      <line x1="5.5" y1="20.5" x2="15" y2="9" stroke={`url(#${u}w)`} strokeWidth="2" strokeLinecap="round"/>
      <path d="M13.6 7.6 Q19.4 7 21 11.2 L20.4 13.8 Q18.8 15.8 15.2 14.9 Q13.2 12.4 13.4 9.4 Z" fill={`url(#${u}s)`} stroke="#3a4047" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M19.6 7.7 Q21.1 9.4 21 11.4" stroke="#ffffff" strokeWidth="0.9" opacity="0.65" fill="none" strokeLinecap="round"/>
      <rect x="12.7" y="8.4" width="2.2" height="3.4" rx="0.6" transform="rotate(40 13.8 10.1)" fill="#4a3114"/>
    </svg>
  );
}

export function ToolPick({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}w`} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#bb8344"/><stop offset="1" stopColor="#6e4518"/></linearGradient>
        <linearGradient id={`${u}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#eef2f5"/><stop offset="1" stopColor="#869098"/></linearGradient>
      </defs>
      <ellipse cx="12" cy="21.4" rx="6.5" ry="1.3" fill="#000" opacity="0.14"/>
      <line x1="9.5" y1="21" x2="12.5" y2="7.5" stroke="#3a2410" strokeWidth="3.1" strokeLinecap="round"/>
      <line x1="9.5" y1="21" x2="12.5" y2="7.5" stroke={`url(#${u}w)`} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M3.5 9.8 Q8 6.6 12 7.4 Q16 6.6 20.5 9.8 Q16 8 12 8.8 Q8 8 3.5 9.8 Z" fill={`url(#${u}s)`} stroke="#3a4047" strokeWidth="0.7" strokeLinejoin="round"/>
      <path d="M5.2 9.2 Q8.6 7.6 12 8.2" stroke="#ffffff" strokeWidth="0.6" opacity="0.6" fill="none"/>
      <rect x="11" y="7" width="2.1" height="2.7" rx="0.5" fill="#4a3114"/>
    </svg>
  );
}

export function ToolFleestone({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c6c0b6"/><stop offset="1" stopColor="#7e7870"/></linearGradient>
        <radialGradient id={`${u}h`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#9ce0d0" stopOpacity="0.85"/><stop offset="100%" stopColor="#9ce0d0" stopOpacity="0"/></radialGradient>
      </defs>
      <ellipse cx="12" cy="21" rx="7" ry="1.4" fill="#000" opacity="0.16"/>
      <path d="M11.5 3.5 Q19 5 20.5 11 Q21.5 17 15.5 19.5 Q8 21 4.5 15 Q2.5 9 7.5 5 Q9.5 3.5 11.5 3.5 Z" fill={`url(#${u}g)`} stroke="#46423b" strokeWidth="0.9" strokeLinejoin="round"/>
      <path d="M7 6.5 Q11 4.8 14.5 6" stroke="#ddd8cf" strokeWidth="0.8" fill="none" opacity="0.5" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="6.5" fill={`url(#${u}h)`}/>
      <path d="M12 8 L12 16 M9 11 L12 8 L15 11 M9.5 14.5 L14.5 14.5" stroke="#1f4a44" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 8 L12 16 M9 11 L12 8 L15 11 M9.5 14.5 L14.5 14.5" stroke="#7ff0d8" strokeWidth="0.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function ToolNet({ size = 24 }: IconProps) {
  const u = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${u}w`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#bb8344"/><stop offset="1" stopColor="#6e4518"/></linearGradient>
        <clipPath id={`${u}c`}><circle cx="15" cy="9" r="5.5"/></clipPath>
      </defs>
      <ellipse cx="9" cy="21.2" rx="6" ry="1.3" fill="#000" opacity="0.13"/>
      <line x1="4" y1="21" x2="12" y2="12.5" stroke="#3a2410" strokeWidth="3" strokeLinecap="round"/>
      <line x1="4" y1="21" x2="12" y2="12.5" stroke={`url(#${u}w)`} strokeWidth="1.7" strokeLinecap="round"/>
      <circle cx="15" cy="9" r="6" fill="#bfe0ee" fillOpacity="0.2"/>
      <g clipPath={`url(#${u}c)`} stroke="#4f8aa6" strokeWidth="0.6" opacity="0.8">
        <path d="M9 4 L21 14 M9 8 L20 18 M9 12 L17 19 M12 3 L22 12 M16 3 L22 9"/>
        <path d="M21 5 L9 14 M21 9 L10 18 M21 13 L13 19 M18 3 L8 12"/>
      </g>
      <circle cx="15" cy="9" r="6" fill="none" stroke="#6e4518" strokeWidth="1.6"/>
      <circle cx="15" cy="9" r="6" fill="none" stroke={`url(#${u}w)`} strokeWidth="0.9"/>
    </svg>
  );
}
