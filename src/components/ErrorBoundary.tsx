import { Component, type ReactNode } from "react";
import { LinkButton } from "@/components/ui";

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
        <LinkButton to="/shops" className="mt-6" onClick={() => this.setState({ failed: false })}>
          Back to shops
        </LinkButton>
      </div>
    );
  }
}
