import { Suspense } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import {
  Bike,
  LifeBuoy,
  LogOut,
  Moon,
  PackagePlus,
  ReceiptText,
  ShoppingCart,
  Store,
  Sun,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Logo } from "@/components/Logo";
import { Spinner } from "@/components/ui";
import { useSignOut } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { isActive } from "@/lib/domain";
import { initials, money } from "@/lib/format";
import { useMe } from "@/lib/me";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: LucideIcon; badge?: number };

export function AppShell() {
  const me = useMe();
  const cart = useCart();
  const { theme, toggle } = useTheme();
  const signOut = useSignOut();
  const location = useLocation();

  // Live counts: these update the moment an order or delivery changes state.
  const requested = useQuery(api.deliveries.listRequested);
  const carrying = useQuery(api.deliveries.listCarrying);
  const activeOrders = requested?.filter((r) => isActive(r.status)).length ?? 0;
  const activeDeliveries = carrying?.filter((r) => isActive(r.status)).length ?? 0;

  const primary: NavItem[] = [
    { to: "/shops", label: "Shop", icon: Store },
    { to: "/orders", label: "Orders", icon: ReceiptText, badge: activeOrders },
    { to: "/deliver", label: "Deliver", icon: Bike, badge: activeDeliveries },
    { to: "/wallet", label: "Wallet", icon: Wallet },
    { to: "/profile", label: "Profile", icon: User },
  ];
  const secondary: NavItem[] = [
    { to: "/post", label: "Post an errand", icon: PackagePlus },
    { to: "/help", label: "Help", icon: LifeBuoy },
  ];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-card p-4 lg:flex">
        <Logo to="/shops" className="px-2 py-2" />

        <nav aria-label="Main" className="mt-6 flex flex-1 flex-col gap-1">
          {primary.map((item) => (
            <SideLink key={item.to} item={item} />
          ))}
          <div className="my-3 border-t border-border" />
          {secondary.map((item) => (
            <SideLink key={item.to} item={item} />
          ))}
          <SideLink
            item={{ to: "/cart", label: "Cart", icon: ShoppingCart, badge: cart.count }}
          />
        </nav>

        <div className="rounded-xl bg-subtle p-3">
          <div className="flex items-center gap-3">
            <Avatar me={me} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{me.firstName || me.email}</p>
              <p className="tabular text-xs text-muted-foreground">{money(me.walletBalance)} in wallet</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={toggle}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <button
              onClick={() => void signOut()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
          <Logo to="/shops" />
          <div className="flex items-center gap-1">
            <NavLink
              to="/wallet"
              className="tabular rounded-full bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary-soft-foreground"
            >
              {money(me.walletBalance)}
            </NavLink>
            <NavLink
              to="/cart"
              aria-label={`Cart, ${cart.count} items`}
              className="relative grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-subtle"
            >
              <ShoppingCart className="size-5" />
              {cart.count > 0 && (
                <span className="absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
                  {cart.count}
                </span>
              )}
            </NavLink>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-28 sm:px-6 lg:px-10 lg:py-10 lg:pb-10">
          {/* Keyed by path: each page gets a fresh error boundary and a short enter
              animation. It fills "backwards" so no transform is left behind to
              trap the page's fixed bars once it has played. */}
          <div key={location.pathname} className="motion-safe:animate-enter">
            <ErrorBoundary>
              <Suspense fallback={<Spinner className="mx-auto mt-24 size-7" />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Mobile tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {primary.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive: on }) =>
              cn(
                "group relative flex flex-col items-center gap-0.5 pb-2 pt-1.5 text-[11px] font-medium",
                on ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            {({ isActive: on }) => (
              <>
                <span className="relative grid h-7 w-14 place-items-center transition-transform duration-150 ease-smooth group-active:scale-90">
                  {/* Pill behind the active icon; every tab has one so it can grow in and fade out. */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-0 rounded-full bg-primary-soft transition-[opacity,transform] duration-300 ease-spring",
                      on ? "scale-100 opacity-100" : "scale-x-50 opacity-0",
                    )}
                  />
                  <span className="relative">
                    <item.icon
                      className={cn("size-5", on && "text-primary-soft-foreground motion-safe:animate-pop")}
                      aria-hidden
                    />
                    {item.badge ? (
                      <span className="absolute -right-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
                        {item.badge}
                      </span>
                    ) : null}
                  </span>
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function SideLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive: on }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          on
            ? "bg-primary-soft text-primary-soft-foreground"
            : "text-muted-foreground hover:bg-subtle hover:text-foreground",
        )
      }
    >
      <item.icon className="size-[18px]" aria-hidden />
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-xs font-semibold leading-5 text-primary-foreground">
          {item.badge}
        </span>
      ) : null}
    </NavLink>
  );
}

export function Avatar({
  me,
  size = "md",
}: {
  me: { firstName: string; lastName: string; email: string };
  size?: "md" | "lg";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-foreground",
        size === "lg" ? "size-14 text-lg" : "size-9 text-sm",
      )}
    >
      {initials(me.firstName, me.lastName, me.email)}
    </span>
  );
}
