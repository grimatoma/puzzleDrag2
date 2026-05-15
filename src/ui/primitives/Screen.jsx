import { createContext, useContext } from "react";

const ScreenCtx = createContext({ tone: "dark" });

function BackArrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Screen({ title, onBack, tone = "dark", className = "", children }) {
  const isLight = tone === "light";
  const surface = isLight ? "bg-parchment-soft text-ink" : "bg-bg-darkest text-cream";
  const headerSurface = isLight
    ? "bg-parchment-soft/95 border-iron-edge text-ink-soft"
    : "bg-bg-darker/95 border-panel-edge text-cream";
  const backHover = isLight ? "hover:bg-iron-soft/15" : "hover:bg-cream/[0.06]";

  return (
    <ScreenCtx.Provider value={{ tone }}>
      <div className={`fixed inset-0 z-40 flex flex-col ${surface} ${className}`}>
        <header
          className={`sticky top-0 z-10 flex items-center gap-2 px-4 pt-safe-top h-14 border-b backdrop-blur-sm ${headerSurface}`}
        >
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className={`inline-flex items-center justify-center min-w-tap min-h-tap -ml-2 rounded-md ${backHover} transition-colors`}
            >
              <BackArrow />
            </button>
          )}
          {title && (
            <h1 className="text-h3 font-bold m-0 truncate">{title}</h1>
          )}
        </header>
        {children}
      </div>
    </ScreenCtx.Provider>
  );
}

function Filters({ className = "", children }) {
  const { tone } = useContext(ScreenCtx);
  const surface = tone === "light"
    ? "bg-parchment/80 border-iron-edge"
    : "bg-bg-darker/70 border-panel-edge";
  return (
    <div className={`sticky top-14 z-[5] flex flex-wrap items-center gap-2 px-4 py-2 border-b backdrop-blur-sm ${surface} ${className}`}>
      {children}
    </div>
  );
}

function Body({ className = "", children }) {
  return (
    <div
      className={`flex-1 min-h-0 overflow-y-auto px-4 py-3 ${className}`}
      style={{ overscrollBehavior: "contain" }}
    >
      {children}
    </div>
  );
}

function FooterBar({ className = "", children }) {
  const { tone } = useContext(ScreenCtx);
  const surface = tone === "light"
    ? "bg-parchment-soft/95 border-iron-edge"
    : "bg-bg-darker/95 border-panel-edge";
  return (
    <div
      className={`sticky bottom-0 z-10 flex items-center justify-end gap-2 px-4 py-3 border-t pb-safe-bottom backdrop-blur-sm ${surface} ${className}`}
    >
      {children}
    </div>
  );
}

Screen.Filters = Filters;
Screen.Body = Body;
Screen.FooterBar = FooterBar;
