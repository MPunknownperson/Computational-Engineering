import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/refinement.css";
import "./styles/devices.css";
import "./styles/insights.css";
import "./styles/motion.css";
import "./styles/site.css";
import "./styles/refresh.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
