import { Component, type ReactNode } from "react";
import { buttonClass } from "@/components/button-styles";

/** Catches a page that fails to load (e.g. a stale or malformed link) without blanking the app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="mx-auto max-w-sm py-16 text-center">
        <h1 className="text-xl font-semibold">We couldn't load this page</h1>
        <p className="mt-2 text-sm text-muted-foreground">The link may be out of date, or something went wrong.</p>
        {/* A full page load, not an in-app link: if StudentLoop was updated
            meanwhile, this picks up the new version. */}
        <a href="/shops" className={buttonClass("primary", "md", "mt-6")}>
          Back to shops
        </a>
      </div>
    );
  }
}
