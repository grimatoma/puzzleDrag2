import React from "react";
import { createRoot } from "react-dom/client";
import PuzzleCraftStylePhaserPrototype from "./prototype.jsx";
import DomGame from "./src/DomGame.jsx";

const useDom = new URLSearchParams(window.location.search).has("dom");
const App = useDom ? DomGame : PuzzleCraftStylePhaserPrototype;

const pillBase = {
  padding: "6px 14px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 13,
  textDecoration: "none",
  letterSpacing: 0.2,
};

function ABToggle() {
  const path = window.location.pathname;
  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 1000,
        display: "flex",
        gap: 4,
        padding: 4,
        borderRadius: 999,
        background: "rgba(15,10,5,0.85)",
        boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
        backdropFilter: "blur(6px)",
      }}
    >
      <a
        href={path}
        style={{
          ...pillBase,
          background: !useDom ? "#ffc239" : "transparent",
          color: !useDom ? "#1f1408" : "#f6efe0",
        }}
      >
        Phaser
      </a>
      <a
        href={`${path}?dom`}
        style={{
          ...pillBase,
          background: useDom ? "#ffc239" : "transparent",
          color: useDom ? "#1f1408" : "#f6efe0",
        }}
      >
        DOM/React
      </a>
    </div>
  );
}

function Root() {
  return (
    <>
      <ABToggle />
      <App />
    </>
  );
}

createRoot(document.getElementById("root")).render(<Root />);
