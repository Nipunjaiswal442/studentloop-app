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

// After a deploy, an app left open (the home-screen app can stay open for days)
// still asks for the old build's page files, which are gone. Reloading loads the
// new build. At most once every 10 seconds, so a file missing for some other
// reason ends on the error screen rather than in a reload loop.
const RELOADED_AT = "sl_reloaded_for_update";
window.addEventListener("vite:preloadError", () => {
  try {
    if (Date.now() - Number(sessionStorage.getItem(RELOADED_AT)) < 10_000) return;
    sessionStorage.setItem(RELOADED_AT, String(Date.now()));
  } catch {
    return;
  }
  window.location.reload();
});

// Offline start-up for the home-screen app (public/sw.js). Production only, so
// the dev server never serves cached files.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Not fatal: the site works the same without it, just not offline.
    });
  });
}
