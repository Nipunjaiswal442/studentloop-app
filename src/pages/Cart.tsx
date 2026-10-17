import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Button, Card, Choice, EmptyState, Field, Input, LinkButton, PageHeader, Quantity, Row } from "@/components/ui";
import { useCart } from "@/lib/cart";
import { DELIVERY_FEE, TIP_OPTIONS } from "@/lib/domain";
import { money } from "@/lib/format";
import { useMe } from "@/lib/me";
import { useSubmit } from "@/lib/submit";

export default function Cart() {
  const me = useMe();
  const cart = useCart();
  const navigate = useNavigate();
  const place = useMutation(api.orders.place);
  const { pending, run } = useSubmit();

  const shop = useQuery(api.shops.get, cart.shopId ? { shopId: cart.shopId } : "skip");
  const [tip, setTip] = useState(10);
  const [hostel, setHostel] = useState(me.hostelBlock);
  const [room, setRoom] = useState(me.roomNumber);

  // Keep the cart honest: if the shop changed a price or pulled an item, update the cart.
  const { lines, sync } = cart;
  useEffect(() => {
    if (!shop) return;
    const stale = lines.some((l) => {
      const m = shop.menu.find((x) => x.id === l.menuItemId);
      return !m || m.price !== l.price || m.name !== l.name;
    });
    if (stale) {
      toast.info("Some items or prices changed, so we updated your cart.");
      sync(shop.menu);
    }
  }, [shop, lines, sync]);

  if (cart.lines.length === 0 || !cart.shopId) {
    return (
      <div>
        <PageHeader title="Your cart" />
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          action={<LinkButton to="/shops" size="sm">Browse shops</LinkButton>}
        >
          Add something from a campus shop and it will show up here.
        </EmptyState>
      </div>
    );
  }

  const total = cart.subtotal + DELIVERY_FEE + tip;
  const short = Math.max(0, total - me.walletBalance);
  const hasAddress = hostel.trim() !== "" && room.trim() !== "";
  const coins = Math.floor(cart.subtotal * 0.05);

  async function placeOrder() {
    if (!cart.shopId) return;
    const id = await run(() =>
      place({
        shopId: cart.shopId!,
        lines: cart.lines.map((l) => ({ menuItemId: l.menuItemId, qty: l.qty, note: l.note })),
        tip,
        hostel,
        room,
        expectedSubtotal: cart.subtotal,
      }),
    );
    if (id) {
      cart.clear();
      toast.success("Order placed. We'll tell you when a carrier accepts.");
      navigate(`/orders/${id}`, { replace: true });
    }
  }

  return (
    <div>
      <PageHeader
        title="Your cart"
        subtitle={`From ${cart.shopName}`}
        back={{ to: `/shops/${cart.shopId}`, label: "Back to menu" }}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-card">
            {cart.lines.map((l) => (
              <li key={l.menuItemId} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="font-medium sm:truncate">{l.name}</p>
                    <p className="tabular text-sm text-muted-foreground">{money(l.price)} each</p>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-4">
                    <Quantity value={l.qty} label={l.name} onChange={(n) => cart.setQty(l.menuItemId, n)} />
                    <span className="tabular w-16 text-right font-semibold">{money(l.price * l.qty)}</span>
                  </div>
                </div>
                <Input
                  value={l.note}
                  onChange={(e) => cart.setNote(l.menuItemId, e.target.value)}
                  placeholder="Note for this item (optional)"
                  aria-label={`Note for ${l.name}`}
                  maxLength={100}
                  className="mt-3 h-9"
                />
              </li>
            ))}
          </ul>

          <Card>
            <h2 className="font-semibold">Deliver to</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Hostel or block">
                {(id) => (
                  <Input id={id} value={hostel} onChange={(e) => setHostel(e.target.value)} placeholder="Hostel 7" maxLength={40} />
                )}
              </Field>
              <Field label="Room">
                {(id) => <Input id={id} value={room} onChange={(e) => setRoom(e.target.value)} placeholder="312" maxLength={20} />}
              </Field>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Carriers see your hostel. Your room is shared once someone accepts.
              {(!me.hostelBlock || !me.roomNumber) && (
                <>
                  {" "}
                  <Link to="/profile" className="text-primary underline underline-offset-2 hover:no-underline">
                    Save it to your profile
                  </Link>{" "}
                  to skip this next time.
                </>
              )}
            </p>
          </Card>
        </div>

        <aside>
          <Card className="lg:sticky lg:top-8">
            <h2 className="font-semibold">Summary</h2>

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium">Tip for your carrier</p>
              <Choice
                label="Tip"
                value={tip}
                onChange={setTip}
                options={TIP_OPTIONS.map((t) => ({ value: t, label: t === 0 ? "No tip" : money(t) }))}
              />
            </div>

            <dl className="mt-5 space-y-2 border-t border-border pt-4">
              <Row label="Items" value={money(cart.subtotal)} />
              <Row label="Delivery fee" value={money(DELIVERY_FEE)} />
              <Row label="Tip" value={money(tip)} />
              <div className="border-t border-border pt-3">
                <Row strong label="Total" value={money(total)} />
              </div>
            </dl>

            <p className="mt-3 text-xs text-muted-foreground">
              You'll earn {coins} bonus {coins === 1 ? "coin" : "coins"}. Payment is held until your items arrive.
            </p>

            <div className="mt-4 flex items-center justify-between rounded-lg bg-subtle px-3 py-2 text-sm">
              <span className="text-muted-foreground">Wallet</span>
              <span className="tabular font-semibold">{money(me.walletBalance)}</span>
            </div>

            {short > 0 && (
              <p role="alert" className="mt-3 flex gap-2 rounded-lg bg-warning-soft p-3 text-sm text-warning">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  You need {money(short)} more.{" "}
                  <Link to="/wallet" className="font-medium underline">
                    Add money
                  </Link>
                </span>
              </p>
            )}

            <Button
              size="lg"
              className="mt-4 w-full"
              disabled={short > 0 || !hasAddress}
              loading={pending}
              onClick={() => void placeOrder()}
            >
              Place order · {money(total)}
            </Button>
            {!hasAddress && <p className="mt-2 text-center text-xs text-muted-foreground">Enter your hostel and room to continue.</p>}
          </Card>
        </aside>
      </div>
    </div>
  );
}
