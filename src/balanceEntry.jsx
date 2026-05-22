// Entry point for the Balance Manager standalone app served at `/b/`.
// Lives behind its own Vite input (see vite.config.js) so it builds to a
// separate HTML + JS bundle that can be served independently of the game.
// Both apps share an origin and therefore share localStorage — drafts saved
// here are picked up by the game on its next load.

import "./index.css";
import React from "react";
import { createRoot } from "react-dom/client";
import BalanceManagerApp from "./balanceManager/index.jsx";

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("[balance] uncaught render error:", error, info?.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", display: "grid", placeItems: "center",
          background: "#2a1d0f", color: "#f8e7c6", padding: "24px",
          fontFamily: "system-ui, sans-serif", textAlign: "center",
        }}>
          <div style={{ maxWidth: "480px" }}>
            <h1 style={{ fontSize: "20px", marginBottom: "12px" }}>Balance Manager crashed.</h1>
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

createRoot(document.getElementById("root")).render(
  <RootErrorBoundary>
    <BalanceManagerApp />
  </RootErrorBoundary>,
);
