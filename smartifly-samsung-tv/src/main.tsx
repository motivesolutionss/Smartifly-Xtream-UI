import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { AppErrorBoundary } from "./components/common/AppErrorBoundary";
import { AppProviders } from "./providers/AppProviders";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </AppProviders>
  </StrictMode>
);
