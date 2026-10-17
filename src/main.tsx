import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { MissingConfig } from "./components/MissingConfig";
import "./index.css";

const url = import.meta.env.VITE_CONVEX_URL as string | undefined;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {url ? (
      <ConvexAuthProvider client={new ConvexReactClient(url)}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConvexAuthProvider>
    ) : (
      <MissingConfig />
    )}
  </StrictMode>,
);
