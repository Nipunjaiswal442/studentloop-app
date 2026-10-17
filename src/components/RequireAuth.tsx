import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";
import { Prose } from "@/components/Prose";
import { Button, Spinner } from "@/components/ui";
import { TERMS } from "@/lib/legal";
import { MeContext } from "@/lib/me";
import { useSubmit } from "@/lib/submit";

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status">
      <Spinner className="size-7" />
    </div>
  );
}

/** Gate for everything inside the app: signed in, account loaded, terms accepted. */
export function RequireAuth() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me);
  const location = useLocation();

  if (isLoading) return <Splash />;
  if (!isAuthenticated) {
    return <Navigate to="/signin" replace state={{ from: location.pathname + location.search }} />;
  }
  if (me === undefined) return <Splash />;
  if (me === null) return <AccountMissing />;
  if (!me.termsAccepted) return <TermsGate />;

  return (
    <MeContext.Provider value={me}>
      <AppShell />
    </MeContext.Provider>
  );
}

function AccountMissing() {
  const { signOut } = useAuthActions();
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-sm">
        <h1 className="text-xl font-semibold">We couldn't load your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please sign out and sign in again. If this keeps happening, contact support@studentloop.com.
        </p>
        <Button className="mt-5" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

function TermsGate() {
  const accept = useMutation(api.users.acceptTerms);
  const { signOut } = useAuthActions();
  const { pending, run } = useSubmit();
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-8 sm:py-14">
      <Logo to="/" />
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">One last step</h1>
      <p className="mt-1 text-sm text-muted-foreground">Please read and accept the terms to start using StudentLoop.</p>

      <div
        tabIndex={0}
        role="region"
        aria-label="Terms and conditions"
        className="mt-5 min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-card sm:max-h-[28rem] sm:flex-none"
      >
        <Prose text={TERMS} />
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 size-4 accent-[hsl(var(--primary))]"
        />
        I have read and agree to the Terms and Conditions.
      </label>

      <div className="mt-5 flex gap-3">
        <Button size="lg" className="flex-1" disabled={!agreed} loading={pending} onClick={() => void run(() => accept())}>
          Accept and continue
        </Button>
        <Button size="lg" variant="ghost" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
