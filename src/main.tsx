import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/refinement.css";
import "./styles/devices.css";
import "./styles/insights.css";
import "./styles/motion.css";
import "./styles/site.css";
import "./styles/refresh.css";
import "./styles/studio.css";
import "./styles/brand.css";
import App from "./App";
import { installCustomUnits, loadWorkspace } from "./lib/utilityWorkspace";

// User-defined units join the catalog before first render so every module,
// including the round-trip validator and exports, sees the same unit set.
installCustomUnits(loadWorkspace());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
