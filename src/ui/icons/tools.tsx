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

export function ToolWater({ size = 24, fill = "#7ec0e0" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 18 Q3 13 5 11 L13 11 L15 9 L18 9 L18 11 L20 11 L20 17 Q19 19 16 19 Z" fill={fill} stroke="#3a4850" strokeWidth="0.6"/>
      <path d="M14 9 L20 6" stroke="#3a4850" strokeWidth="0.6"/>
      <circle cx="20" cy="6" r="1.5" fill={fill}/>
      <path d="M21 4 L20.5 3 M22 5 L22.5 4" stroke="#3a4850" strokeWidth="0.5"/>
    </svg>
  );
}

export function ToolRake({ size = 24, fill = "#f8e7c6" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <line x1="4" y1="20" x2="18" y2="6" stroke="#7a5520" strokeWidth="1.5"/>
      <path d="M14 4 L20 4 M14 4 L14 7 M16 4 L16 7 M18 4 L18 7 M20 4 L20 7" stroke={fill} strokeWidth="1.4" strokeLinecap="round"/>
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

export function ToolPick({ size = 24, fill = "#f8e7c6" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <line x1="4" y1="20" x2="12" y2="12" stroke="#7a5520" strokeWidth="1.5"/>
      <path d="M5 4 Q15 5 20 10 L18 12 Q14 8 6 6 Z" fill={fill}/>
    </svg>
  );
}

export function ToolFleestone({ size = 24, fill = "#9a948a" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 L20 8 L21 16 L14 22 L6 19 L3 11 Z" fill={fill} stroke="#3a3530" strokeWidth="0.8" strokeLinejoin="round"/>
      <path d="M10 9 L14 11 L12 15 Z" fill="#ffd248" opacity="0.6"/>
      <circle cx="9" cy="12" r="1" fill="#ffd248"/>
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
