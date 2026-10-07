import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import { App } from "./App";
import { BranchDataProvider } from "./hooks/useBranchData";
import { NavigationProvider } from "./hooks/useMapNavigation";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BranchDataProvider>
      <NavigationProvider>
        <App />
      </NavigationProvider>
    </BranchDataProvider>
  </StrictMode>,
);
