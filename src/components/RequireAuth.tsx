import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";
import { Prose } from "@/components/Prose";
import { Button, Spinner } from "@/components/ui";
import { signOut, takeSignUpName } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { TERMS } from "../../convex/lib/knowledge";
import { MeContext } from "@/lib/me";
import { useSubmit } from "@/lib/submit";

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function Splash() {
  // Opened offline (e.g. from the home screen), the session can't be confirmed
  // until the connection is back, so say so instead of spinning silently.
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine);
  return (
    <div className="grid min-h-dvh place-items-center px-6 pt-safe text-center" role="status">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="size-7" />
        {!online && (
          <p className="max-w-xs text-sm text-muted-foreground">
            You're offline. StudentLoop will carry on as soon as you're connected again.
          </p>
        )}
      </div>
    </div>
  );
}

/** Gate for everything inside the app: signed in, account ready, terms accepted. */
export function RequireAuth() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { pathname, search } = useLocation();
  // Stable on purpose: <Navigate> re-runs whenever `state` changes, and a
  // fresh object on every render would undo a navigation made meanwhile
  // (e.g. sign-out sending the user to the landing page).
  const redirectState = useMemo(() => ({ from: pathname + search }), [pathname, search]);

  if (isLoading) return <Splash />;
  if (!isAuthenticated) return <Navigate to="/signin" replace state={redirectState} />;
  return <AccountGate />;
}

function AccountGate() {
  const ensure = useMutation(api.users.ensure);
  const me = useQuery(api.users.me);
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);

  // Creates the account on first sign-in and keeps the email in sync after that.
  useEffect(() => {
    let live = true;
    ensure({ name: takeSignUpName() }).catch((e: unknown) => {
      if (live) setFailure(errorMessage(e, "We couldn't set up your account."));
    });
    return () => {
      live = false;
    };
  }, [ensure, attempt]);

  if (me) {
    if (!me.termsAccepted) return <TermsGate />;
    return (
      <MeContext.Provider value={me}>
        <AppShell />
      </MeContext.Provider>
    );
  }
  if (!failure) return <Splash />;
  return (
    <div className="grid min-h-dvh place-items-center px-6 pt-safe text-center">
      <div className="max-w-sm">
        <h1 className="text-xl font-semibold">We couldn't load your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">{failure}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button
            onClick={() => {
              setFailure(null);
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
          <Button variant="ghost" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

function TermsGate() {
  const accept = useMutation(api.users.acceptTerms);
  const { pending, run } = useSubmit();
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col pt-safe">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:py-14">
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
    </div>
  );
}
