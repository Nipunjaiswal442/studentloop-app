import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Link } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import {
  ArrowRight,
  Bike,
  Camera,
  Check,
  KeyRound,
  LifeBuoy,
  Lock,
  MapPin,
  PackagePlus,
  Radio,
  Receipt,
  ShieldCheck,
  Smartphone,
  Star,
  Store,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { buttonClass } from "@/components/button-styles";
import { Logo } from "@/components/Logo";
import { Badge, LinkButton } from "@/components/ui";
import { DELIVERY_FEE, STAGE_LABEL, STEPS, stageTone } from "@/lib/domain";
import { cn } from "@/lib/utils";

const HOW = [
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
    text: "Top up once. Orders, errands, tips and earnings all move through one balance, with a full history.",
  },
  {
    icon: ShieldCheck,
    title: "Paid only at the handoff",
    text: "Your money is held while a carrier works. If nobody accepts in time, it's refunded automatically.",
  },
  {
    icon: Bike,
    title: "Earn between classes",
    text: "Heading out anyway? Accept an open request and earn the delivery fee plus any tip.",
  },
  {
    icon: PackagePlus,
    title: "Errands for anything",
    text: "Not on the shop list? Describe what you need, set a reward and let someone nearby grab it.",
  },
  {
    icon: Radio,
    title: "Live order tracking",
    text: "Every status change shows up on your screen the moment it happens. No refreshing.",
  },
  {
    icon: Camera,
    title: "Bills and photo reports",
    text: "Carriers upload a photo of the bill. If something's wrong, report it with photos from the order page.",
  },
  {
    icon: LifeBuoy,
    title: "Help when you need it",
    text: "Browse answers to common questions, or ask the built-in AI assistant.",
  },
  {
    icon: Smartphone,
    title: "Made for your phone",
    text: "Works in your phone's browser, and you can add it to your home screen to open it like an app.",
  },
];

const SAFETY = [
  {
    icon: KeyRound,
    title: "A code only you can see",
    text: "Each order has a 4-digit code shown only to you. A delivery can't be completed without it.",
  },
  {
    icon: Lock,
    title: "Limited sharing",
    text: "Other students see your first name and hostel. Your room number and phone number go only to the person you're matched with.",
  },
  {
    icon: Star,
    title: "Reputation that builds",
    text: "Ratings feed a trust score, so reliable carriers are easy to spot.",
  },
];

/* ───────────── Small motion helpers (landing only) ───────────── */

const canObserve = typeof IntersectionObserver !== "undefined";
const media = (query: string) => (typeof window !== "undefined" ? window.matchMedia?.(query) : undefined);
const reducedMotionQuery = media("(prefers-reduced-motion: reduce)");
const finePointerQuery = media("(pointer: fine)");

function subscribeReducedMotion(onChange: () => void) {
  reducedMotionQuery?.addEventListener?.("change", onChange);
  return () => reducedMotionQuery?.removeEventListener?.("change", onChange);
}
const useReducedMotion = () => useSyncExternalStore(subscribeReducedMotion, () => reducedMotionQuery?.matches ?? false);

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}
const useScrolled = () => useSyncExternalStore(subscribeScroll, () => window.scrollY > 8);

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}
const usePageVisible = () => useSyncExternalStore(subscribeVisibility, () => !document.hidden);

function useInView(ref: RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(!canObserve);
  useEffect(() => {
    const el = ref.current;
    if (!el || !canObserve) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}

/** Marks every `.reveal` under root with data-in the first time it scrolls into view (see index.css). */
function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el || !canObserve) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-in", "");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    el.querySelectorAll(".reveal").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [root]);
}

const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

/* ───────────── Page ───────────── */

export default function Landing() {
  const { isAuthenticated } = useConvexAuth();
  const scrolled = useScrolled();
  const root = useRef<HTMLDivElement>(null);
  useReveal(root);

  const startTo = isAuthenticated ? "/shops" : "/signin?mode=signup";
  const startLabel = isAuthenticated ? "Open the app" : "Create a free account";

  return (
    <div ref={root} data-reveal={canObserve ? "" : undefined} className="relative isolate min-h-dvh">
      <HeroBackdrop />

      <header
        className={cn(
          "pt-safe sticky top-0 z-30 border-b transition-[background-color,border-color,box-shadow] duration-300",
          scrolled ? "border-border bg-background/85 shadow-card backdrop-blur-md" : "border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <Logo />
          <nav aria-label="Sections" className="hidden gap-8 text-sm text-muted-foreground md:flex">
            <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#safety" className="transition-colors hover:text-foreground">Safety</a>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            {isAuthenticated ? (
              <LinkButton to="/shops" size="sm" className="sm:h-10 sm:px-4">
                Open app
              </LinkButton>
            ) : (
              <>
                <LinkButton to="/signin" variant="ghost" size="sm" className="px-2.5 sm:h-10 sm:px-4">
                  Sign in
                </LinkButton>
                <LinkButton to="/signin?mode=signup" size="sm" className="sm:h-10 sm:px-4">
                  Get started
                </LinkButton>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 overflow-hidden px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-24 lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-medium text-primary-soft-foreground motion-safe:animate-rise">
              <span className="relative flex size-2" aria-hidden>
                <span className="absolute inset-0 rounded-full bg-primary opacity-60 motion-safe:animate-ping" />
                <span className="relative size-2 rounded-full bg-primary" />
              </span>
              Campus delivery, student to student
            </p>
            <h1
              className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight motion-safe:animate-rise sm:text-5xl lg:text-[3.5rem]"
              style={delay(80)}
            >
              Get things delivered by students <span className="text-primary">already heading your way.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground motion-safe:animate-rise" style={delay(160)}>
              Order from campus shops, post an errand, or earn by delivering between classes. Your payment is held
              until the handoff is confirmed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 motion-safe:animate-rise" style={delay(240)}>
              <LinkButton to={startTo} size="lg" className="group w-full sm:w-auto">
                {startLabel}
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </LinkButton>
              <a href="#how" className={buttonClass("secondary", "lg", "w-full sm:w-auto")}>
                See how it works
              </a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground motion-safe:animate-rise" style={delay(320)}>
              Free to join. New accounts start with ₹500.
            </p>
          </div>

          <div className="motion-safe:animate-rise" style={delay(200)}>
            <OrderDemo />
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-16 border-y border-border bg-subtle py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading eyebrow="How it works" title="From “I need this” to “got it” in four steps" />
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
              {HOW.map((s, i) => (
                <li
                  key={s.title}
                  className="reveal group rounded-xl border border-border bg-card p-5 shadow-card transition-[border-color,box-shadow,transform] duration-300 ease-smooth hover:-translate-y-1 hover:shadow-raised active:scale-[0.99]"
                  style={delay(i * 110)}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                      {i + 1}
                    </span>
                    <IconTile icon={s.icon} plain />
                  </div>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16 sm:px-6 sm:py-24">
          <SectionHeading
            eyebrow="Features"
            title="Everything in one place"
            text="Shopping, errands and earning share one account and one wallet."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="reveal group rounded-xl border border-border bg-card p-5 shadow-card transition-[border-color,box-shadow,transform] duration-300 ease-smooth hover:-translate-y-1 hover:border-primary/30 hover:shadow-raised active:scale-[0.99]"
                style={delay((i % 4) * 80)}
              >
                <IconTile icon={f.icon} />
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Safety */}
        <section id="safety" className="scroll-mt-16 border-t border-border bg-subtle py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="Safety"
              title="Built around trust"
              text="You're handing money to someone you may not know yet, so every order has guard rails."
            />
            <div className="mt-10 grid gap-4 sm:gap-6 md:grid-cols-3">
              {SAFETY.map((c, i) => (
                <div
                  key={c.title}
                  className="reveal group rounded-xl border border-border bg-card p-6 shadow-card transition-[border-color,box-shadow,transform] duration-300 ease-smooth hover:-translate-y-1 hover:shadow-raised active:scale-[0.99]"
                  style={delay(i * 110)}
                >
                  <IconTile icon={c.icon} />
                  <h3 className="mt-4 font-semibold">{c.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="reveal relative isolate overflow-hidden rounded-2xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
              <span className="absolute -right-20 -top-28 size-72 rounded-full border border-primary-foreground/15 motion-safe:animate-drift" />
              <span className="absolute -bottom-40 -left-24 size-96 rounded-full border border-primary-foreground/10 motion-safe:animate-drift-slow" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Start with your first order</h2>
            <p className="mx-auto mt-3 max-w-lg text-primary-foreground/85">
              Sign up, spend your ₹500 welcome balance, and see how it feels to have campus come to you.
            </p>
            <Link
              to={startTo}
              className={buttonClass(
                "primary",
                "lg",
                "group mt-8 bg-primary-foreground px-6 font-semibold text-primary hover:bg-primary-foreground/90 focus-visible:ring-primary-foreground focus-visible:ring-offset-primary",
              )}
            >
              {startLabel}
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo />
          <div className="flex gap-6">
            <Link to="/terms" className="transition-colors hover:text-foreground">Terms</Link>
            <a href="mailto:support@studentloop.com" className="transition-colors hover:text-foreground">Contact</a>
          </div>
          <p>© {new Date().getFullYear()} StudentLoop</p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="reveal max-w-2xl">
      <p className="text-sm font-semibold text-primary">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      {text && <p className="mt-3 text-muted-foreground">{text}</p>}
    </div>
  );
}

/** Icon that gives a little hop when its card is hovered or pressed. */
function IconTile({ icon: Icon, plain }: { icon: LucideIcon; plain?: boolean }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-lg transition-transform duration-300 ease-spring group-hover:-translate-y-0.5 group-hover:-rotate-6 group-hover:scale-110 group-active:scale-90",
        plain ? "size-6 text-primary" : "size-10 bg-primary-soft text-primary-soft-foreground",
      )}
    >
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

/** Soft emerald glow and a faint grid behind the top of the page. Transform-only drift. */
function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[56rem] overflow-hidden">
      <div className="absolute inset-0 [background-image:linear-gradient(hsl(var(--border)/0.55)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.55)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,hsl(var(--foreground))_20%,transparent_75%)] dark:opacity-60" />
      <div className="absolute -left-48 -top-48 size-[40rem] rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.2),transparent)] will-change-transform motion-safe:animate-drift dark:opacity-50" />
      <div className="absolute -right-56 top-24 size-[36rem] rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.16),transparent)] will-change-transform motion-safe:animate-drift-slow dark:opacity-50" />
    </div>
  );
}

/* ───────────── Live order demo ───────────── */

// How long each stage stays on screen; one loop is about 12 s.
const STAGE_MS = [2000, 2400, 2200, 2400, 3000];
const DEMO_CODE = "4821";
const DEMO_TIP = 10;
const DEMO_ITEMS = 240;
const DEMO_EARN = DELIVERY_FEE + DEMO_TIP;
const DEMO_TOTAL = DEMO_ITEMS + DEMO_EARN;
const DEMO_DETAILS = [
  `₹${DEMO_TOTAL} held from your wallet`,
  "Aditi R. · ★ 4.9 · Trust 96%",
  `Bill photo uploaded · ₹${DEMO_ITEMS}`,
  "Heading to Hostel 7",
  `Code matched · ₹${DEMO_EARN} to Aditi`,
];
const DEMO_ICONS = [Receipt, Bike, Camera, MapPin, Check];
const LAST = STEPS.length - 1;

function OrderDemo() {
  const reduced = useReducedMotion();
  const pageVisible = usePageVisible();
  const frame = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const inView = useInView(frame);
  const [tick, setTick] = useState(0);
  const running = inView && pageVisible && !reduced;

  // Pausing just drops the pending timer; the current stage restarts when it resumes.
  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => setTick((t) => t + 1), STAGE_MS[tick % STAGE_MS.length]);
    return () => window.clearTimeout(id);
  }, [running, tick]);

  // Reduced motion gets one still frame: the finished order.
  const step = reduced ? LAST : tick % STEPS.length;
  const loop = reduced ? 0 : Math.floor(tick / STEPS.length);
  const stage = STEPS[step].stage;
  const delivered = step === LAST;

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const card = tilt.current;
    if (!card || e.pointerType !== "mouse" || !finePointerQuery?.matches || reducedMotionQuery?.matches) return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width - 0.5;
    const y = (e.clientY - box.top) / box.height - 0.5;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      card.style.transform = `perspective(1000px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
    });
  }

  function onPointerLeave() {
    cancelAnimationFrame(raf.current);
    if (tilt.current) tilt.current.style.transform = "";
  }

  return (
    <div className="relative mx-auto w-full max-w-[22rem]">
      <p className="sr-only">
        Example order: it is placed, a carrier accepts, buys the items, heads over, and the delivery completes when
        the requester's 4-digit code is entered.
      </p>
      <div
        ref={frame}
        aria-hidden
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="relative"
      >
        <div className="absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,hsl(var(--primary)/0.22),transparent)] dark:opacity-60"
        />

        <div
          ref={tilt}
          className="rounded-[2rem] border border-border bg-subtle p-2 shadow-raised transition-transform duration-300 ease-smooth"
        >
          <div className="overflow-hidden rounded-[1.6rem] border border-border bg-background">
            <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-border" />
            <div key={loop} className={cn("p-4 pt-3", loop > 0 && "motion-safe:animate-enter")}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Order SL-4821 · Example</span>
                <Badge key={step} tone={stageTone(stage)} className="motion-safe:animate-enter">
                  {STAGE_LABEL[stage]}
                </Badge>
              </div>
              <p className="mt-3 font-semibold">Chicken Biryani × 2</p>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                Campus Canteen <ArrowRight className="size-3.5" aria-hidden /> Hostel 7
              </p>

              <div className="relative mt-4">
                {/* Track from the first dot to the last; the fill grows with scaleY. */}
                <span className="absolute bottom-[1.625rem] left-[13px] top-3.5 w-0.5 rounded-full bg-border" />
                <span
                  className="absolute bottom-[1.625rem] left-[13px] top-3.5 w-0.5 origin-top rounded-full bg-primary transition-transform duration-700 ease-smooth"
                  style={{ transform: `scaleY(${step / LAST})` }}
                />
                <ol className="relative">
                  {STEPS.map((s, i) => {
                    const reached = i <= step;
                    const done = i < step || delivered;
                    const Icon = DEMO_ICONS[i];
                    return (
                      <li key={s.stage} className="relative flex gap-3 pb-3 last:pb-0">
                        <span
                          className={cn(
                            "relative grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors duration-500",
                            done
                              ? "border-primary bg-primary text-primary-foreground"
                              : reached
                                ? "border-primary bg-background text-primary"
                                : "border-border bg-background text-muted-foreground",
                          )}
                        >
                          {done ? (
                            <Check className="size-3.5 motion-safe:animate-pop-in" strokeWidth={3} />
                          ) : (
                            <Icon className="size-3.5" />
                          )}
                          {reached && !done && (
                            <span className="absolute -inset-0.5 rounded-full border-2 border-primary opacity-50 motion-safe:animate-ping" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "text-sm leading-6 transition-colors duration-500",
                              reached ? "font-medium text-foreground" : "text-muted-foreground",
                            )}
                          >
                            {s.label}
                          </p>
                          <p
                            className={cn(
                              "truncate text-xs leading-4 text-muted-foreground transition-[opacity,transform] duration-500 ease-smooth",
                              reached ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
                            )}
                          >
                            {DEMO_DETAILS[i]}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div
                className={cn(
                  "mt-4 rounded-xl border p-3 transition-colors duration-500",
                  step === 3 ? "border-primary/50 bg-primary-soft" : "border-border bg-subtle",
                )}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    <KeyRound className="size-3.5 text-primary" />
                    Your delivery code
                  </span>
                  <span key={step} className="text-muted-foreground motion-safe:animate-enter">
                    {step === 0
                      ? "After a carrier accepts"
                      : step === 3
                        ? "Share it at the door"
                        : delivered
                          ? "Confirmed"
                          : "Only you see this"}
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  {DEMO_CODE.split("").map((digit, i) => (
                    <span
                      key={i}
                      className="tabular relative grid h-10 flex-1 place-items-center rounded-lg border border-border bg-card text-lg font-semibold"
                    >
                      <span
                        className={cn(
                          "transition-[opacity,transform] duration-500 ease-spring",
                          step > 0 ? "scale-100 opacity-100" : "scale-50 opacity-0",
                        )}
                        style={{ transitionDelay: step > 0 ? `${i * 90}ms` : "0ms" }}
                      >
                        {digit}
                      </span>
                      <span
                        className={cn(
                          "absolute size-1.5 rounded-full bg-control transition-opacity duration-300",
                          step > 0 && "opacity-0",
                        )}
                      />
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="tabular font-semibold">
                  ₹{DEMO_TOTAL}{" "}
                  <span key={String(delivered)} className="font-normal text-muted-foreground motion-safe:animate-enter">
                    {delivered ? "paid out" : "held"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* The carrier's side of the same order, beside the phone where there's room. */}
        <DemoChip show={step === 0} className="-left-12 -top-5">
          <span className="block text-xs text-muted-foreground">New request nearby</span>
          <span className="tabular block text-sm font-semibold">Earn ₹{DEMO_EARN}</span>
        </DemoChip>
        <DemoChip show={delivered} className="-right-12 -top-5" strong>
          <span className="block text-xs text-muted-foreground">Aditi's wallet</span>
          <span className="tabular block text-sm font-semibold text-primary">+₹{DEMO_EARN} earned</span>
        </DemoChip>
      </div>
    </div>
  );
}

function DemoChip({
  show,
  strong,
  className,
  children,
}: {
  show: boolean;
  strong?: boolean;
  className: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute hidden items-center gap-2.5 rounded-xl border border-border bg-card py-2 pl-2 pr-3.5 shadow-raised transition-[opacity,transform] duration-500 ease-spring sm:flex",
        show ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-90 opacity-0",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-8 place-items-center rounded-lg",
          strong ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary-soft-foreground",
        )}
      >
        {strong ? <Wallet className="size-4" /> : <Bike className="size-4" />}
      </span>
      <span>{children}</span>
    </div>
  );
}
