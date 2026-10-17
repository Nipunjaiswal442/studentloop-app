import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { Clock, MapPin, Plus, ShoppingCart, Star, Store } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Badge, Button, Card, EmptyState, LinkButton, Modal, PageHeader, Quantity, Row, Skeleton } from "@/components/ui";
import { useCart } from "@/lib/cart";
import { DELIVERY_FEE } from "@/lib/domain";
import { money } from "@/lib/format";

export default function Shop() {
  const { shopId } = useParams();
  const shop = useQuery(api.shops.get, { shopId: shopId as Id<"shops"> });
  const cart = useCart();
  const [conflict, setConflict] = useState<{ id: Id<"menuItems">; name: string; price: number } | null>(null);

  if (shop === undefined) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }
  if (shop === null) {
    return (
      <EmptyState icon={Store} title="Shop not found" action={<LinkButton to="/shops" size="sm">Browse shops</LinkButton>}>
        It may have been removed.
      </EmptyState>
    );
  }

  const here = { id: shop.id, name: shop.name };
  const lines = cart.shopId === shop.id ? cart.lines : [];
  const qtyOf = (id: Id<"menuItems">) => lines.find((l) => l.menuItemId === id)?.qty ?? 0;
  const mine = cart.shopId === shop.id;

  function addItem(item: { id: Id<"menuItems">; name: string; price: number }) {
    if (!cart.add(here, item)) setConflict(item);
  }

  return (
    <div className="pb-16 lg:pb-0">
      <PageHeader
        title={shop.name}
        back={{ to: "/shops", label: "All shops" }}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Badge tone="primary">{shop.category}</Badge>
            {shop.rating ? (
              <span className="inline-flex items-center gap-1">
                <Star className="size-3.5 fill-primary text-primary" aria-hidden />
                {shop.rating.toFixed(1)}
              </span>
            ) : null}
            {shop.distance && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden />
                {shop.distance}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />~{shop.deliveryMinutes} min
            </span>
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-card">
          {shop.menu.length === 0 && (
            <li className="p-6 text-center text-sm text-muted-foreground">Nothing on the menu right now.</li>
          )}
          {shop.menu.map((item) => {
            const qty = qtyOf(item.id);
            return (
              <li key={item.id} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-medium">{item.name}</h2>
                  {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                  <p className="tabular mt-1 text-sm font-semibold">{money(item.price)}</p>
                </div>
                {qty > 0 ? (
                  <Quantity value={qty} label={item.name} onChange={(n) => cart.setQty(item.id, n)} />
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => addItem(item)} aria-label={`Add ${item.name}`}>
                    <Plus className="size-4" aria-hidden />
                    Add
                  </Button>
                )}
              </li>
            );
          })}
        </ul>

        {/* Desktop: sticky cart */}
        <aside className="hidden lg:block">
          <Card className="sticky top-8">
            <h2 className="font-semibold">Your cart</h2>
            {!mine || lines.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Add items from this menu to get started.</p>
            ) : (
              <>
                <ul className="mt-3 space-y-2 text-sm">
                  {lines.map((l) => (
                    <li key={l.menuItemId} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">
                        {l.qty} × {l.name}
                      </span>
                      <span className="tabular shrink-0">{money(l.price * l.qty)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="mt-4 space-y-1.5 border-t border-border pt-4">
                  <Row label="Items" value={money(cart.subtotal)} />
                  <Row label="Delivery fee" value={money(DELIVERY_FEE)} />
                </dl>
                <LinkButton to="/cart" className="mt-4 w-full">
                  Checkout
                </LinkButton>
              </>
            )}
          </Card>
        </aside>
      </div>

      {/* Mobile: cart bar above the tab bar */}
      {mine && cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 px-4 lg:hidden">
          <Link
            to="/cart"
            className="flex h-12 items-center justify-between rounded-xl bg-primary px-4 font-medium text-primary-foreground shadow-raised"
          >
            <span className="inline-flex items-center gap-2">
              <ShoppingCart className="size-4" aria-hidden />
              View cart · {cart.count} {cart.count === 1 ? "item" : "items"}
            </span>
            <span className="tabular">{money(cart.subtotal)}</span>
          </Link>
        </div>
      )}

      <Modal open={conflict !== null} onClose={() => setConflict(null)} title="Start a new cart?">
        <p className="text-sm text-muted-foreground">
          Your cart has items from {cart.shopName}. You can order from one shop at a time, so adding this will clear it.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConflict(null)}>
            Keep my cart
          </Button>
          <Button
            onClick={() => {
              if (conflict) {
                cart.startNew(here, [
                  { menuItemId: conflict.id, name: conflict.name, price: conflict.price, qty: 1, note: "" },
                ]);
              }
              setConflict(null);
            }}
          >
            Start new cart
          </Button>
        </div>
      </Modal>

      <span className="sr-only" aria-live="polite">
        {mine ? `${cart.count} items in cart` : ""}
      </span>
    </div>
  );
}
