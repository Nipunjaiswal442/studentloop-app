import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { Eye, EyeOff, MailCheck, PackageCheck, ShieldCheck, Wallet } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button, Field, Input, Spinner } from "@/components/ui";
import {
  authErrorMessage,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
  useAuthUser,
} from "@/lib/auth";
import { cn } from "@/lib/utils";

const PERKS = [
  { icon: Wallet, text: "₹500 welcome bonus in your wallet" },
  { icon: PackageCheck, text: "Order from campus shops or earn by delivering" },
  { icon: ShieldCheck, text: "Payments are held until you confirm the handoff" },
];

type Mode = "signIn" | "signUp" | "reset";
const MODE_PARAM: Record<Mode, string | null> = { signIn: null, signUp: "signup", reset: "reset" };

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

/**
 * True when Firebase has signed someone in but the StudentLoop server keeps
 * refusing the session for a few seconds: almost always a settings mismatch.
 */
function useSessionRefused() {
  const user = useAuthUser();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const stuck = Boolean(user) && !isLoading && !isAuthenticated;
  const [refused, setRefused] = useState(false);
  useEffect(() => {
    if (!stuck) return;
    const timer = setTimeout(() => setRefused(true), 5000);
    return () => {
      clearTimeout(timer);
      setRefused(false);
    };
  }, [stuck]);
  return { refused: stuck && refused, connecting: Boolean(user) && !isAuthenticated && !refused };
}

export default function SignIn() {
  const { isAuthenticated } = useConvexAuth();
  const { refused, connecting } = useSessionRefused();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  const param = params.get("mode");
  const mode: Mode = param === "signup" ? "signUp" : param === "reset" ? "reset" : "signIn";
  const from = (location.state as { from?: string } | null)?.from ?? "/shops";

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated) return <Navigate to={from} replace />;

  const setMode = (next: Mode) => {
    setError("");
    setNotice("");
    const value = MODE_PARAM[next];
    setParams(value ? { mode: value } : {}, { replace: true, state: location.state });
  };

  async function attempt(action: () => Promise<void>) {
    setError("");
    setNotice("");
    setPending(true);
    try {
      await action();
    } catch (e) {
      setError(authErrorMessage(e) ?? "");
    } finally {
      setPending(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") ?? "");
    if (mode === "reset") {
      void attempt(async () => {
        await sendPasswordReset(email);
        setNotice(`If an account exists for ${email.trim()}, a reset link is on its way. Check your spam folder too.`);
      });
    } else if (mode === "signUp") {
      void attempt(() => signUpWithEmail(String(data.get("name") ?? ""), email, password));
    } else {
      void attempt(() => signInWithEmail(email, password));
    }
  }

  const heading = { signIn: "Welcome back", signUp: "Create your account", reset: "Reset your password" }[mode];
  const subheading = {
    signIn: "Sign in to order, deliver and track.",
    signUp: "It takes under a minute.",
    reset: "We'll email you a link to choose a new password.",
  }[mode];

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

      <main className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />

          {refused ? (
            <SessionRefused />
          ) : connecting ? (
            <div role="status" className="flex flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
              <Spinner className="size-7" />
              Signing you in…
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{subheading}</p>

              {mode !== "reset" && (
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
              )}

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  )}
                </Field>
                {mode !== "reset" && (
                  <Field label="Password" hint={mode === "signUp" ? "At least 8 characters." : undefined}>
                    {(id) => (
                      <div className="relative">
                        <Input
                          id={id}
                          name="password"
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={mode === "signUp" ? 8 : undefined}
                          maxLength={128}
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
                )}

                {mode === "signIn" && (
                  <p className="-mt-1 text-right text-sm">
                    <button type="button" onClick={() => setMode("reset")} className="text-primary hover:underline">
                      Forgot password?
                    </button>
                  </p>
                )}

                {error && (
                  <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                )}
                {notice && (
                  <p role="status" className="flex gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
                    <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {notice}
                  </p>
                )}

                <Button type="submit" size="lg" className="w-full" loading={pending}>
                  {{ signIn: "Sign in", signUp: "Create account", reset: "Send reset link" }[mode]}
                </Button>
              </form>

              {mode === "reset" ? (
                <p className="mt-5 text-center text-sm">
                  <button type="button" onClick={() => setMode("signIn")} className="text-primary hover:underline">
                    Back to sign in
                  </button>
                </p>
              ) : (
                <>
                  <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    or
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full"
                    disabled={pending}
                    onClick={() => void attempt(signInWithGoogle)}
                  >
                    <GoogleMark />
                    Continue with Google
                  </Button>
                </>
              )}

              <p className="mt-8 text-center text-xs text-muted-foreground">
                By continuing you agree to our{" "}
                <Link to="/terms" className="text-primary hover:underline">
                  Terms
                </Link>
                .
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function SessionRefused() {
  return (
    <div role="alert">
      <h1 className="text-2xl font-semibold tracking-tight">We couldn't finish signing you in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your sign-in worked, but the StudentLoop server didn't accept it. Please try again in a minute.
      </p>
      <p className="mt-3 rounded-lg bg-subtle px-3 py-2 text-xs text-muted-foreground">
        If you run this site: the Convex setting <code>FIREBASE_PROJECT_ID</code> must match the Vercel setting{" "}
        <code>VITE_FIREBASE_PROJECT_ID</code>. Redeploying on Vercel copies it across.
      </p>
      <Button className="mt-5" onClick={() => void signOut()}>
        Sign out and try again
      </Button>
    </div>
  );
}
