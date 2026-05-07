import "./src/index.css";
import React from "react";
import { createRoot } from "react-dom/client";
import PuzzleCraftStylePhaserPrototype from "./prototype.jsx";

// Top-level error boundary so a thrown render in any feature modal/screen
// doesn't crash the whole tree. Logs to console (caught by any external
// monitoring) and shows a minimal fallback with a reload affordance.
class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("[hearth] uncaught render error:", error, info?.componentStack);
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
            <h1 style={{ fontSize: "20px", marginBottom: "12px" }}>Something went wrong.</h1>
            <p style={{ fontSize: "14px", opacity: 0.85, marginBottom: "16px" }}>
              The game hit an unexpected error. Your save is intact — reloading should put you right back where you were.
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
    <PuzzleCraftStylePhaserPrototype />
  </RootErrorBoundary>,
);
