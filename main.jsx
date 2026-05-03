import React from "react";
import { createRoot } from "react-dom/client";
import PuzzleCraftStylePhaserPrototype from "./prototype.jsx";
import DomGame from "./src/DomGame.jsx";

const useDom = new URLSearchParams(window.location.search).has("dom");
const App = useDom ? DomGame : PuzzleCraftStylePhaserPrototype;

createRoot(document.getElementById("root")).render(<App />);
