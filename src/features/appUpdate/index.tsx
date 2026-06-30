// A slim "a new version is ready" banner that appears only when the installed
// PWA is running a stale build (see src/appUpdate.ts). Tapping Refresh activates
// the waiting service worker and reloads onto the fresh build.
//
// This feature owns no reducer state — it reads the SW update flag directly via
// the shared watcher — so there is no slice.ts. It is `alwaysMounted` (and
// self-gates on `updateReady`) so it can overlay any view or modal.

import { useAppUpdateReady, applyUpdate } from "../../appUpdate.js";

// Stable React key for the always-mounted list in FeatureModals; never matched
// as an active modal because the banner gates on its own update flag.
export const modalKey = "appUpdate";
export const alwaysMounted = true;

export default function AppUpdateBanner() {
  const ready = useAppUpdateReady();
  if (!ready) return null;

  return (
    <div
      role="status"
      className="fixed left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 py-2 pl-4 pr-2 rounded-2xl border-2 shadow-lg animate-fadein"
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + 78px)",
        maxWidth: "min(420px, calc(100vw - 24px))",
        background: "var(--cream)",
        borderColor: "var(--iron)",
        color: "#5a3a20",
      }}
    >
      <span className="text-[18px] leading-none select-none" aria-hidden="true">
        ✨
      </span>
      <span className="text-[13px] font-bold leading-tight">
        A new version is ready.
      </span>
      <button
        onClick={applyUpdate}
        className="ml-auto py-1.5 px-3 text-[13px] font-bold rounded-xl border-2 whitespace-nowrap"
        style={{ background: "#d6612a", borderColor: "var(--flame-cta-bot)", color: "#fff" }}
      >
        Refresh
      </button>
    </div>
  );
}
