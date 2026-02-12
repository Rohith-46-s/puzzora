import React from "react";
import { createRoot } from "react-dom/client";
import App from "./game/App";
import "./game/styles/game.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element not found");
}

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
