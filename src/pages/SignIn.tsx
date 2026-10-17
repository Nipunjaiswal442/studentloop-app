import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Eye, EyeOff, PackageCheck, ShieldCheck, TriangleAlert, Wallet } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button, Field, Input } from "@/components/ui";
import { errorMessage, googleErrorMessage } from "@/lib/errors";
import { firebaseConfigured, getGoogleIdToken, preloadFirebase } from "@/lib/firebase";
import { cn } from "@/lib/utils";

const PERKS = [
  { icon: Wallet, text: "₹500 welcome bonus in your wallet" },
  { icon: PackageCheck, text: "Order from campus shops or earn by delivering" },
  { icon: ShieldCheck, text: "Payments are held until you confirm the handoff" },
];

const SESSION_REJECTED =
  "You were signed in, but the server did not accept the session. This is a server setup problem, not your password: the site owner should check the auth keys (see the README).";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.83z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.95 10.95 0 0 0 12 1 11 11 0 0 0 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export default function SignIn() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const options = useQuery(api.users.signInOptions);
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  const mode = params.get("mode") === "signup" ? "signUp" : "signIn";
  const from = (location.state as { from?: string } | null)?.from ?? "/shops";
  const googleAvailable = firebaseConfigured && options?.google === true;
  // Keep the button's place while we find out, so the form doesn't jump.
  const googleLoading = firebaseConfigured && options === undefined;

  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [awaitingSession, setAwaitingSession] = useState(false);

  // Start downloading the Firebase SDK now, so the popup can open straight from
  // the tap (browsers may block a popup that has to wait after the tap).
  useEffect(() => {
    if (googleAvailable) preloadFirebase();
  }, [googleAvailable]);

  // Signing in succeeded but the backend never accepted the session token:
  // say so, instead of leaving the form looking like nothing happened.
  useEffect(() => {
    if (!awaitingSession || isAuthenticated) return;
    const timer = setTimeout(() => {
      setAwaitingSession(false);
      setError(SESSION_REJECTED);
    }, 8000);
    return () => clearTimeout(timer);
  }, [awaitingSession, isAuthenticated]);

  if (isAuthenticated) return <Navigate to={from} replace />;

  const setMode = (next: "signIn" | "signUp") => {
    setError("");
    setParams(next === "signUp" ? { mode: "signup" } : {}, { replace: true, state: location.state });
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    data.set("email", String(data.get("email") ?? "").trim().toLowerCase());
    data.set("flow", mode);
    setError("");
    setAwaitingSession(false);
    setPending(true);
    try {
      const result = await signIn("password", data);
      if (result.signingIn) setAwaitingSession(true);
    } catch (err) {
      setError(errorMessage(err, "Something went wrong on our side. Please try again in a moment."));
    } finally {
      setPending(false);
    }
  }

  async function onGoogle() {
    setError("");
    setAwaitingSession(false);
    setPending(true);
    try {
      const idToken = await getGoogleIdToken();
      const result = await signIn("firebase", { idToken });
      if (result.signingIn) setAwaitingSession(true);
    } catch (err) {
      const message = googleErrorMessage(err);
      // Unknown failures (provider not enabled, bad web config) are for the site
      // owner: put the real reason in the browser console.
      if (message?.startsWith("Google sign-in didn't work")) console.error("Google sign-in failed:", err);
      setError(message ?? "");
    } finally {
      setPending(false);
    }
  }

  const setupMissing = options && options.missing.length > 0 ? options.missing : null;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-subtle p-12 lg:flex">
        <Logo />
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Campus errands, handled by the students next door.
          </h2>
          <ul className="mt-8 space-y-4">
            {PERKS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-muted-foreground">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-card text-primary shadow-card">
                  <p.icon className="size-[18px]" aria-hidden />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-muted-foreground">Built for campus life.</p>
      </aside>

      <main className="relative flex flex-col justify-center px-5 py-10 sm:px-10">
        <ThemeToggle className="absolute right-4 top-4" />
        <div className="mx-auto w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />

          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "signIn" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signIn" ? "Sign in to order, deliver and track." : "It takes under a minute."}
          </p>

          {setupMissing && (
            <p role="status" className="mt-5 flex gap-2 rounded-lg bg-warning-soft p-3 text-sm text-warning">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Sign-in isn't fully set up on this server yet (missing {setupMissing.join(", ")}). If you run this
                site, see the README.
              </span>
            </p>
          )}

          <div role="tablist" aria-label="Account" className="mt-6 grid grid-cols-2 rounded-lg bg-subtle p-1">
            {(["signIn", "signUp"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                type="button"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-md py-1.5 text-sm font-medium transition-colors",
                  mode === m ? "bg-card text-foreground shadow-card" : "text-muted-foreground",
                )}
              >
                {m === "signIn" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          {googleLoading && (
            <>
              <Button variant="secondary" size="lg" className="mt-6 w-full" disabled>
                <GoogleMark />
                Continue with Google
              </Button>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or use email
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}
          {googleAvailable && (
            <>
              <Button
                variant="secondary"
                size="lg"
                className="mt-6 w-full"
                disabled={pending}
                onClick={() => void onGoogle()}
              >
                <GoogleMark />
                Continue with Google
              </Button>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or use email
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form
            onSubmit={(e) => void onSubmit(e)}
            className={cn("space-y-4", !googleAvailable && !googleLoading && "mt-6")}
          >
            {mode === "signUp" && (
              <Field label="Full name">
                {(id) => (
                  <Input id={id} name="name" required maxLength={80} autoComplete="name" placeholder="Ananya Sharma" />
                )}
              </Field>
            )}
            <Field label="Email">
              {(id) => (
                <Input
                  id={id}
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@college.edu"
                />
              )}
            </Field>
            <Field label="Password" hint={mode === "signUp" ? "At least 8 characters." : undefined}>
              {(id) => (
                <div className="relative">
                  <Input
                    id={id}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={mode === "signUp" ? 8 : undefined}
                    autoComplete={mode === "signUp" ? "new-password" : "current-password"}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-1 top-1 grid size-8 place-items-center rounded-md text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              )}
            </Field>

            {error && (
              <div role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                <p>{error}</p>
                {mode === "signIn" && googleAvailable && /Incorrect email or password/.test(error) && (
                  <p className="mt-1 text-xs">Signed up with Google? Choose Continue with Google above.</p>
                )}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={pending}>
              {mode === "signIn" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing you agree to our{" "}
            <Link to="/terms" className="text-primary underline underline-offset-2 hover:no-underline">
              Terms
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
