// Entry point for the Dev Panel standalone app served at `/b/`.
// Lives behind its own Vite input (see vite.config.js) so it builds to a
// separate HTML + JS bundle that can be served independently of the game.
// Both apps share an origin and therefore share localStorage — drafts saved
// here are picked up by the game on its next load.

// Self-hosted fonts (same-origin, bundled by Vite) — replaces the
// render-blocking Google Fonts <link> the Dev Panel used to load. The family
// names registered here match wikiTheme.css's --wiki-font-display/-body/-mono
// stacks ("Fraunces" / "IBM Plex Sans" / "JetBrains Mono"), so the wiki looks
// identical with no external network dependency.
import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/700.css";
import "@fontsource/fraunces/800.css";
import "@fontsource/fraunces/400-italic.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/700.css";
import "./index.css";
import React from "react";
import { createRoot } from "react-dom/client";
import BalanceManagerApp from "./balanceManager/index";

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
    console.error("[balance] uncaught render error:", error, info?.componentStack);
  }
  override render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", display: "grid", placeItems: "center",
          background: "#e9dfc6", color: "#2b2218", padding: "24px",
          fontFamily: "system-ui, sans-serif", textAlign: "center",
        }}>
          <div style={{ maxWidth: "480px" }}>
            <h1 style={{ fontSize: "20px", marginBottom: "12px" }}>Dev Panel crashed.</h1>
            <p style={{ fontSize: "14px", opacity: 0.85, marginBottom: "16px" }}>
              An unexpected error was thrown during render. Your saved draft is intact.
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
    <BalanceManagerApp />
  </RootErrorBoundary>,
);
