/// <reference types="vite-plugin-pwa/react" />
import type { ReactElement } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Bottom toast shown when a newly deployed build is waiting in the service
 * worker. "Reload" activates the waiting worker (skipWaiting) and reloads into
 * the new version; "Later" dismisses until the next update is detected.
 *
 * Renders nothing in dev (the service worker is disabled via
 * `devOptions.enabled: false`) and whenever no update is pending, so it is safe
 * to mount unconditionally at the React root.
 */
export default function UpdatePrompt(): ReactElement | null {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // An installed, long-lived session may never reload on its own, so it
      // would never notice a new deploy. Poll hourly so the prompt can surface.
      if (registration) {
        setInterval(() => {
          void registration.update();
        }, 60 * 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: "calc(16px + env(safe-area-inset-bottom))",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        maxWidth: "min(420px, calc(100vw - 24px))",
        padding: "12px 14px",
        borderRadius: "12px",
        background: "#fbf5e6",
        color: "#2b2218",
        border: "1px solid #d9c9a6",
        boxShadow: "0 8px 28px rgba(60,40,20,.28)",
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
      }}
    >
      <span style={{ flex: 1 }}>A new version of Hearthlands is ready.</span>
      <button
        type="button"
        onClick={() => {
          void updateServiceWorker(true);
        }}
        style={{
          background: "#d6612a",
          color: "#fff",
          border: "none",
          padding: "8px 14px",
          borderRadius: "8px",
          fontWeight: 700,
          fontSize: "13px",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Reload
      </button>
      <button
        type="button"
        aria-label="Dismiss update notice"
        onClick={() => setNeedRefresh(false)}
        style={{
          background: "transparent",
          color: "#7a5e3f",
          border: "none",
          padding: "8px",
          fontSize: "13px",
          cursor: "pointer",
        }}
      >
        Later
      </button>
    </div>
  );
}
