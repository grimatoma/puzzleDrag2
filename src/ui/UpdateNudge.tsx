import React from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * "A new version is available — Reload" nudge.
 *
 * The PWA service worker precaches the whole build for offline play, so a
 * returning player keeps the *cached* app until the worker updates — which is
 * why a fresh deploy can look like it "didn't ship". With `registerType:
 * "prompt"` the new worker installs in the background and waits; this surfaces a
 * one-tap reload the moment it's ready (and polls hourly so a long-lived tab
 * notices too) instead of silently waiting for the next cold load.
 *
 * Renders nothing until an update is waiting; inert in dev (the SW is disabled).
 */
export default function UpdateNudge(): React.ReactElement | null {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // A long-lived game tab won't navigate, so poll for a new deploy hourly.
      if (registration) {
        setInterval(() => { registration.update().catch(() => {}); }, 60 * 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div role="status" aria-live="polite" style={WRAP}>
      <span style={{ fontWeight: 600 }}>A new version is available.</span>
      <button type="button" onClick={() => void updateServiceWorker(true)} style={RELOAD_BTN}>
        Reload
      </button>
      <button type="button" onClick={() => setNeedRefresh(false)} style={LATER_BTN} aria-label="Dismiss update">
        Later
      </button>
    </div>
  );
}

const WRAP: React.CSSProperties = {
  position: "fixed",
  left: "50%",
  bottom: "16px",
  transform: "translateX(-50%)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  gap: "10px",
  maxWidth: "calc(100vw - 24px)",
  padding: "10px 12px 10px 18px",
  borderRadius: "999px",
  background: "#2b2218",
  color: "#f4ecdb",
  boxShadow: "0 8px 28px -10px rgba(0,0,0,.6)",
  font: "500 14px/1 system-ui, sans-serif",
};
const RELOAD_BTN: React.CSSProperties = {
  background: "#d6612a",
  color: "#fff",
  border: "none",
  padding: "8px 16px",
  borderRadius: "999px",
  font: "700 13px/1 system-ui, sans-serif",
  cursor: "pointer",
};
const LATER_BTN: React.CSSProperties = {
  background: "transparent",
  color: "#c9bfa8",
  border: "none",
  padding: "8px 6px",
  font: "600 13px/1 system-ui, sans-serif",
  cursor: "pointer",
};
