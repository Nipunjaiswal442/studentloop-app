import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { MissingConfig } from "./components/MissingConfig";
import { missingAuthSettings, useConvexAuthFromFirebase } from "./lib/auth";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const missing = [...(convexUrl ? [] : ["VITE_CONVEX_URL"]), ...missingAuthSettings];

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {convexUrl && missing.length === 0 ? (
      <ConvexProviderWithAuth client={new ConvexReactClient(convexUrl)} useAuth={useConvexAuthFromFirebase}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConvexProviderWithAuth>
    ) : (
      <MissingConfig names={missing} />
    )}
  </StrictMode>,
);

// Offline start-up for the home-screen app (public/sw.js). Production only, so
// the dev server never serves cached files.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Not fatal: the site works the same without it, just not offline.
    });
  });
}
