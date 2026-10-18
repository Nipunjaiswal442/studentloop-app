import { LinkButton } from "@/components/ui";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 pt-safe text-center">
      <div>
        <Logo className="mb-8" />
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-1 text-2xl font-semibold">This page doesn't exist</h1>
        <p className="mt-2 text-muted-foreground">The link may be old, or the address mistyped.</p>
        <LinkButton to="/shops" className="mt-6">
          Back to shops
        </LinkButton>
      </div>
    </div>
  );
}
