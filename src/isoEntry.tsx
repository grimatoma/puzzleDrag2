// Entry point for the Isometric Forge Prototype served at `/iso/`.
// Separate Vite input (see vite.config.js) — builds to its own HTML + JS bundle.
// Pure React + SVG, Phaser-free, isolated like the `/b/` and `/story/` entries.
// Imports index.css only to reuse existing keyframes (flicker, smoke, ember, …).

import "./index.css";
import React from "react";
import { createRoot } from "react-dom/client";
import IsoPrototype from "./iso/IsoPrototype";

interface ErrState { error: unknown }

class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  override componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[iso-prototype] uncaught render error:", error, info?.componentStack);
  }
  override render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", display: "grid", placeItems: "center",
          background: "#1c2530", color: "#e6edf3", padding: "24px",
          fontFamily: "system-ui, sans-serif", textAlign: "center",
        }}>
          <div style={{ maxWidth: "480px" }}>
            <h1 style={{ fontSize: "20px", marginBottom: "12px" }}>Iso prototype crashed.</h1>
            <p style={{ fontSize: "14px", opacity: 0.85, marginBottom: "16px" }}>
              An unexpected error was thrown during render.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#d6612a", color: "white", border: "none",
                padding: "10px 20px", borderRadius: "8px", fontSize: "14px",
                fontWeight: "bold", cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <IsoPrototype />
  </RootErrorBoundary>,
);
