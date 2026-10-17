import { Link } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import {
  ArrowRight,
  Camera,
  KeyRound,
  LifeBuoy,
  ShieldCheck,
  Star,
  Store,
  Wallet,
  PackagePlus,
  Bike,
  Receipt,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LinkButton } from "@/components/ui";

const STEPS = [
  {
    icon: Store,
    title: "Order or post",
    text: "Pick items from a campus shop, or post an errand with a pickup spot and your room.",
  },
  {
    icon: Bike,
    title: "A student accepts",
    text: "Someone already on campus takes the job, buys your items and uploads the bill.",
  },
  {
    icon: KeyRound,
    title: "Share your code",
    text: "When your items arrive, give the carrier your 4-digit code to confirm the handoff.",
  },
  {
    icon: Star,
    title: "Rate and done",
    text: "Payment is released to the carrier. Leave a rating to help the next person.",
  },
];

const FEATURES = [
  {
    icon: Wallet,
    title: "One wallet for everything",
    text: "Top up once. Orders, errands, tips and earnings all move through the same balance, with a full history.",
  },
  {
    icon: ShieldCheck,
    title: "Payment held until delivery",
    text: "Your money is held while a carrier works. If nobody accepts in time, it's refunded automatically.",
  },
  {
    icon: Camera,
    title: "Bills and photo evidence",
    text: "Carriers upload the purchase bill. If something's wrong, report it with a photo from the order page.",
  },
  {
    icon: Receipt,
    title: "Live order tracking",
    text: "Every status change shows up on your screen the moment it happens. No refreshing.",
  },
  {
    icon: PackagePlus,
    title: "Errands for anything",
    text: "Not on the shop list? Describe what you need, set a reward and tip, and let someone nearby grab it.",
  },
  {
    icon: LifeBuoy,
    title: "Help when you need it",
    text: "Browse answers to common questions, or ask the built-in assistant.",
  },
];

const SAMPLE = [
  { title: "Iced Latte + Cappuccino", route: "Blue Tokai Café → Hostel 7", earn: 45, tag: "Urgent" },
  { title: "Notebook Combo", route: "Pen & Paper Hub → Library", earn: 30, tag: "" },
  { title: "Crocin + ORS", route: "MedPlus Pharmacy → Hostel 3", earn: 35, tag: "Urgent" },
];

export default function Landing() {
  const { isAuthenticated } = useConvexAuth();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav aria-label="Sections" className="hidden gap-8 text-sm text-muted-foreground md:flex">
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#safety" className="hover:text-foreground">Safety</a>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {isAuthenticated ? (
              <LinkButton to="/shops">Open app</LinkButton>
            ) : (
              <>
                <LinkButton to="/signin" variant="ghost" className="hidden sm:inline-flex">
                  Sign in
                </LinkButton>
                <LinkButton to="/signin?mode=signup">Get started</LinkButton>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary-soft-foreground">
              Campus delivery, student to student
            </p>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Get things delivered by students already heading your way.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Order from campus shops, post an errand, or earn by delivering between classes. Your payment is held
              until the handoff is confirmed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton to={isAuthenticated ? "/shops" : "/signin?mode=signup"} size="lg" className="w-full sm:w-auto">
                {isAuthenticated ? "Open the app" : "Create a free account"}
                <ArrowRight className="size-4" aria-hidden />
              </LinkButton>
              <a
                href="#how"
                className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-border px-5 font-medium hover:bg-subtle sm:w-auto"
              >
                See how it works
              </a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Free to join. New accounts start with ₹500.</p>
          </div>

          <div aria-hidden className="rounded-2xl border border-border bg-subtle p-4 sm:p-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Example: open requests
            </p>
            <div className="space-y-3">
              {SAMPLE.map((s) => (
                <div key={s.title} className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{s.title}</p>
                    {s.tag && (
                      <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-medium text-danger">
                        {s.tag}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{s.route}</p>
                  <p className="tabular mt-3 border-t border-border pt-3 text-sm font-semibold text-primary-soft-foreground">
                    Earn ₹{s.earn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-y border-border bg-subtle py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
            <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.title} className="rounded-xl border border-border bg-card p-5 shadow-card">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                      {i + 1}
                    </span>
                    <s.icon className="size-5 text-primary" aria-hidden />
                  </div>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Everything in one place</h2>
          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                  <f.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Safety */}
        <section id="safety" className="border-t border-border bg-subtle py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Built around trust</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "A code only you can see",
                  text: "Each order has a 4-digit code shown only to you. A delivery can't be completed without it.",
                },
                {
                  title: "Limited sharing",
                  text: "Other students see your first name and hostel. Your room number and phone number go only to the person you're matched with.",
                },
                {
                  title: "Reputation that builds",
                  text: "Ratings feed a trust score, so reliable carriers are easy to spot.",
                },
              ].map((c) => (
                <div key={c.title} className="rounded-xl border border-border bg-card p-6 shadow-card">
                  <h3 className="font-semibold">{c.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="rounded-2xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Start with your first order</h2>
            <p className="mx-auto mt-3 max-w-lg text-primary-foreground">
              Sign up, use your welcome bonus, and see how it feels to have campus come to you.
            </p>
            <Link
              to={isAuthenticated ? "/shops" : "/signin?mode=signup"}
              className="mt-8 inline-flex h-12 items-center rounded-lg bg-primary-foreground px-6 font-semibold text-primary hover:bg-primary-foreground/90"
            >
              {isAuthenticated ? "Open the app" : "Create a free account"}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo />
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <a href="mailto:support@studentloop.com" className="hover:text-foreground">Contact</a>
          </div>
          <p>© {new Date().getFullYear()} StudentLoop</p>
        </div>
      </footer>
    </div>
  );
}
