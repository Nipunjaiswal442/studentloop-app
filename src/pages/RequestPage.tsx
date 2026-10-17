import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useConvex, useMutation, useQuery } from "convex/react";
import {
  CheckCircle2,
  Clock,
  ImageIcon,
  KeyRound,
  MapPin,
  Navigation,
  Phone,
  RotateCcw,
  Search,
  Star,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { PhotoPicker } from "@/components/PhotoPicker";
import { StarRating } from "@/components/StarRating";
import { StatusStepper } from "@/components/StatusStepper";
import {
  Badge,
  Button,
  Card,
  Choice,
  EmptyState,
  Input,
  LinkButton,
  Modal,
  PageHeader,
  Row,
  Skeleton,
  Textarea,
} from "@/components/ui";
import { useCart, type CartLine } from "@/lib/cart";
import {
  CATEGORY_ICON,
  ISSUE_TYPES,
  STAGE_LABEL,
  URGENCY_LABEL,
  isActive,
  stageTone,
  type RequestView,
} from "@/lib/domain";
import { dateTime, money, timeAgo } from "@/lib/format";
import { useSubmit } from "@/lib/submit";

export default function RequestPage() {
  const { id } = useParams();
  const r = useQuery(api.deliveries.get, { id: id as Id<"deliveryRequests"> });

  if (r === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-28" />
        <Skeleton className="h-48" />
      </div>
    );
  }
  if (r === null) {
    return (
      <EmptyState icon={Search} title="We can't find that request" action={<LinkButton to="/orders" size="sm">Your orders</LinkButton>}>
        It may have been taken by someone else or removed.
      </EmptyState>
    );
  }

  const asRequester = r.role === "requester";
  const Icon = CATEGORY_ICON[r.category] ?? MapPin;

  return (
    <div>
      <PageHeader
        title={r.title}
        back={asRequester ? { to: "/orders", label: "Your orders" } : { to: "/deliver", label: "Deliveries" }}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{r.code ?? (asRequester ? "Errand" : `Requested by ${r.requesterName}`)}</span>
            <span>{timeAgo(r.createdAt)}</span>
          </span>
        }
        action={<Badge tone={stageTone(r.status)}>{STAGE_LABEL[r.status]}</Badge>}
      />

      {r.status === "cancelled" && (
        <p role="status" className="mb-6 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          <strong>Cancelled.</strong> {r.cancelReason}.
          {asRequester && ` ${money(r.reward + r.tip + r.reimbursement)} was returned to your wallet.`}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {r.status !== "cancelled" && (
            <Card>
              <StatusStepper stage={r.status} carrierView={!asRequester} />
            </Card>
          )}

          {asRequester ? <RequesterPanel r={r} /> : <CarrierPanel r={r} />}

          <Card>
            <h2 className="flex items-center gap-2 font-semibold">
              <Icon className="size-4 text-primary" aria-hidden />
              {r.order ? `Items from ${r.order.shopName}` : "Items"}
            </h2>
            {r.order ? (
              <ul className="mt-3 divide-y divide-border text-sm">
                {r.order.lines.map((l) => (
                  <li key={l.menuItemId} className="flex justify-between gap-4 py-2">
                    <span>
                      {l.qty} × {l.name}
                      {l.note && <span className="block text-xs text-muted-foreground">“{l.note}”</span>}
                    </span>
                    <span className="tabular shrink-0">{money(l.price * l.qty)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                {r.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <h2 className="font-semibold">Route</h2>
            <ol className="mt-4 space-y-4 text-sm">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="text-xs text-muted-foreground">Pick up</p>
                  <p className="font-medium">{r.pickup}</p>
                </div>
              </li>
              <li className="flex gap-3">
                <Navigation className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="text-xs text-muted-foreground">Deliver to</p>
                  <p className="font-medium">
                    {r.dropHostel}
                    {r.dropRoom ? `, room ${r.dropRoom}` : ""}
                  </p>
                  {!r.dropRoom && (
                    <p className="text-xs text-muted-foreground">Room shared once you accept</p>
                  )}
                </div>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="text-xs text-muted-foreground">Needed within</p>
                  <p className="font-medium">
                    {r.deadlineMinutes} min
                    {r.urgency !== "low" && <span className="text-muted-foreground"> · {URGENCY_LABEL[r.urgency]}</span>}
                  </p>
                </div>
              </li>
            </ol>
          </Card>

          <Person r={r} />
          <Money r={r} />

          {r.billUrl && (
            <Card>
              <h2 className="flex items-center gap-2 font-semibold">
                <ImageIcon className="size-4 text-primary" aria-hidden />
                Purchase bill
              </h2>
              <a href={r.billUrl} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-lg border border-border">
                <img src={r.billUrl} alt="Purchase bill" className="max-h-56 w-full object-cover" />
              </a>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ───────────────────────── side cards ───────────────────────── */

function Person({ r }: { r: RequestView }) {
  const asRequester = r.role === "requester";
  if (asRequester && !r.partner) return null;
  const name = asRequester ? r.partner!.name : r.requesterName;
  return (
    <Card>
      <h2 className="font-semibold">{asRequester ? "Your carrier" : "Requested by"}</h2>
      <p className="mt-3 font-medium">{name}</p>
      {asRequester && r.partner && (
        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
          {r.partner.ratingCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Star className="size-3.5 fill-primary text-primary" aria-hidden />
              {r.partner.rating.toFixed(1)} ({r.partner.ratingCount})
            </span>
          ) : (
            <span>No ratings yet</span>
          )}
          <span>Trust {r.partner.trustScore}%</span>
        </p>
      )}
      {r.contactPhone && (
        <a
          href={`tel:${r.contactPhone}`}
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <Phone className="size-4" aria-hidden />
          {r.contactPhone}
        </a>
      )}
    </Card>
  );
}

function Money({ r }: { r: RequestView }) {
  const asRequester = r.role === "requester";
  return (
    <Card>
      <h2 className="flex items-center gap-2 font-semibold">
        <Wallet className="size-4 text-primary" aria-hidden />
        {asRequester ? "Payment" : "You'll earn"}
      </h2>
      <dl className="mt-4 space-y-2">
        {asRequester && r.order ? (
          <>
            <Row label="Items" value={money(r.order.subtotal)} />
            <Row label="Delivery fee" value={money(r.order.deliveryFee)} />
            <Row label="Tip" value={money(r.order.tip)} />
            <div className="border-t border-border pt-2">
              <Row strong label="Total paid" value={money(r.order.total)} />
            </div>
          </>
        ) : asRequester ? (
          <>
            <Row label="Reward" value={money(r.reward)} />
            <Row label="Tip" value={money(r.tip)} />
            <div className="border-t border-border pt-2">
              <Row strong label="Total paid" value={money(r.reward + r.tip)} />
            </div>
          </>
        ) : (
          <>
            <Row label="Reward" value={money(r.reward)} />
            <Row label="Tip" value={money(r.tip)} />
            <div className="border-t border-border pt-2">
              <Row strong label="Your earnings" value={money(r.reward + r.tip)} />
            </div>
            {r.reimbursement > 0 && (
              <Row label="Item cost, paid back to you" value={money(r.reimbursement)} />
            )}
          </>
        )}
      </dl>
      {asRequester && isActive(r.status) && (
        <p className="mt-3 text-xs text-muted-foreground">Held until your items arrive.</p>
      )}
    </Card>
  );
}

/* ───────────────────────── requester ───────────────────────── */

function RequesterPanel({ r }: { r: RequestView }) {
  const cancel = useMutation(api.deliveries.cancel);
  const rate = useMutation(api.deliveries.rate);
  const convex = useConvex();
  const cart = useCart();
  const navigate = useNavigate();
  const { pending, run } = useSubmit();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [stars, setStars] = useState(0);

  const canCancel = r.status === "open" || r.status === "accepted";
  const canReport = r.status !== "open" && r.status !== "cancelled" && !r.dispute;
  const refund = r.reward + r.tip + r.reimbursement;
  const autoRefundAt = r.createdAt + r.deadlineMinutes * 60_000;

  async function reorder() {
    if (!r.order) return;
    const shop = await convex.query(api.shops.get, { shopId: r.order.shopId });
    if (!shop) return void toast.error("That shop is no longer available.");
    const lines: CartLine[] = r.order.lines.flatMap((l) => {
      const m = shop.menu.find((x) => x.id === l.menuItemId);
      return m ? [{ menuItemId: m.id, name: m.name, price: m.price, qty: l.qty, note: l.note }] : [];
    });
    if (lines.length === 0) return void toast.error("Those items aren't available any more.");
    cart.startNew({ id: shop.id, name: shop.name }, lines);
    if (lines.length < r.order.lines.length) toast.info("Some items are no longer available and were left out.");
    navigate("/cart");
  }

  return (
    <>
      {r.status === "open" && (
        <Card className="border-warning/30 bg-warning-soft/50">
          <p className="font-medium">Waiting for a carrier</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Students nearby can see your request. If nobody accepts by {dateTime(autoRefundAt)}, it's cancelled and{" "}
            {money(refund)} goes back to your wallet.
          </p>
        </Card>
      )}

      {r.otp && r.status !== "open" && (
        <Card className="border-primary/30 bg-primary-soft/50">
          <h2 className="flex items-center gap-2 font-semibold">
            <KeyRound className="size-4 text-primary" aria-hidden />
            Your delivery code
          </h2>
          <p className="tabular my-3 text-4xl font-semibold tracking-[0.35em] text-primary-soft-foreground" aria-label={`Code ${r.otp.split("").join(" ")}`}>
            {r.otp}
          </p>
          <p className="text-sm text-muted-foreground">
            Give this to your carrier only when you have your items. They enter it to finish the delivery.
          </p>
        </Card>
      )}

      {r.status === "delivered" && (
        <Card>
          <h2 className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="size-4 text-success" aria-hidden />
            Delivered{r.deliveredAt ? ` · ${dateTime(r.deliveredAt)}` : ""}
          </h2>
          {r.rating === null ? (
            <div className="mt-4">
              <p className="mb-2 text-sm text-muted-foreground">How was {r.partner?.name ?? "your carrier"}?</p>
              <StarRating value={stars} onChange={setStars} disabled={pending} />
              <Button
                className="mt-4"
                disabled={stars === 0}
                loading={pending}
                onClick={() =>
                  void run(async () => {
                    await rate({ id: r.id, stars });
                    toast.success("Thanks for rating.");
                  })
                }
              >
                Submit rating
              </Button>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
              <StarRating value={r.rating} />
              Thanks for rating.
            </div>
          )}
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {r.order && !isActive(r.status) && (
          <Button onClick={() => void reorder()}>
            <RotateCcw className="size-4" aria-hidden />
            Order again
          </Button>
        )}
        {canCancel && (
          <Button variant="danger" onClick={() => setConfirmCancel(true)}>
            Cancel {r.order ? "order" : "request"}
          </Button>
        )}
        {canReport && (
          <Button variant="secondary" onClick={() => setReporting(true)}>
            <TriangleAlert className="size-4" aria-hidden />
            Report an issue
          </Button>
        )}
        {r.dispute && (
          <Badge tone="warning" className="self-center">
            Issue reported: {r.dispute.issueType} · {r.dispute.status}
          </Badge>
        )}
        {isActive(r.status) && !canCancel && (
          <p className="self-center text-sm text-muted-foreground">
            Your carrier has bought the items, so this can no longer be cancelled.
          </p>
        )}
      </div>

      <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} title={`Cancel this ${r.order ? "order" : "request"}?`}>
        <p className="text-sm text-muted-foreground">
          {money(refund)} will go straight back to your wallet.
          {r.status === "accepted" && " Your carrier will be told."}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
            Keep it
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              void run(async () => {
                await cancel({ id: r.id });
                setConfirmCancel(false);
                toast.success("Cancelled and refunded.");
              })
            }
          >
            Yes, cancel
          </Button>
        </div>
      </Modal>

      <ReportModal r={r} open={reporting} onClose={() => setReporting(false)} />
    </>
  );
}

function ReportModal({ r, open, onClose }: { r: RequestView; open: boolean; onClose: () => void }) {
  const report = useMutation(api.disputes.create);
  const { pending, run } = useSubmit();
  const [issue, setIssue] = useState<string>("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<Id<"_storage"> | null>(null);

  return (
    <Modal open={open} onClose={onClose} title="Report an issue">
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium">What went wrong?</p>
          <Choice label="Issue type" value={issue} onChange={setIssue} options={ISSUE_TYPES.map((t) => ({ value: t as string, label: t }))} />
        </div>
        <div>
          <label htmlFor="issue-details" className="mb-1.5 block text-sm font-medium">
            Details <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Textarea id="issue-details" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">
            Photo <span className="font-normal text-muted-foreground">(optional)</span>
          </p>
          <PhotoPicker label="Add a photo as evidence" onChange={setPhoto} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!issue}
            loading={pending}
            onClick={() =>
              void run(async () => {
                await report({
                  deliveryRequestId: r.id,
                  issueType: issue,
                  description,
                  photoStorageId: photo ?? undefined,
                });
                toast.success("Report sent. We'll look into it.");
                onClose();
              })
            }
          >
            Send report
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ───────────────────────── carrier ───────────────────────── */

function CarrierPanel({ r }: { r: RequestView }) {
  const accept = useMutation(api.deliveries.accept);
  const release = useMutation(api.deliveries.release);
  const markPurchased = useMutation(api.deliveries.markPurchased);
  const startDelivery = useMutation(api.deliveries.startDelivery);
  const complete = useMutation(api.deliveries.complete);
  const { pending, run } = useSubmit();
  const [bill, setBill] = useState<Id<"_storage"> | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const earn = r.reward + r.tip;

  if (r.role === "viewer") {
    return (
      <Card>
        <h2 className="font-semibold">Take this delivery</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You'll earn {money(earn)}
          {r.reimbursement > 0 && ` and get ${money(r.reimbursement)} back for the items you buy`}. Payment is already
          held by StudentLoop.
        </p>
        <Button
          size="lg"
          className="mt-4 w-full sm:w-auto"
          loading={pending}
          onClick={() =>
            void run(async () => {
              await accept({ id: r.id });
              toast.success("Accepted. The requester has been told.");
            })
          }
        >
          Accept delivery
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">You can hold up to 3 active deliveries at once.</p>
      </Card>
    );
  }

  if (r.status === "accepted") {
    return (
      <Card>
        <h2 className="font-semibold">Step 1: buy the items</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Go to {r.pickup}, buy everything on the list, then upload a photo of the bill.
          {r.reimbursement > 0 && ` You'll get ${money(r.reimbursement)} back when it's delivered.`}
        </p>
        <div className="mt-4">
          <PhotoPicker label="Take or choose a photo of the bill" onChange={setBill} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={!bill}
            loading={pending}
            onClick={() => bill && void run(() => markPurchased({ id: r.id, billStorageId: bill }))}
          >
            I've bought the items
          </Button>
          <Button variant="ghost" disabled={pending} onClick={() => void run(() => release({ id: r.id }))}>
            Drop this delivery
          </Button>
        </div>
      </Card>
    );
  }

  if (r.status === "purchased") {
    return (
      <Card>
        <h2 className="font-semibold">Step 2: head out</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Take the items to {r.dropHostel}, room {r.dropRoom}.
        </p>
        <Button className="mt-4" loading={pending} onClick={() => void run(() => startDelivery({ id: r.id }))}>
          I'm on my way
        </Button>
      </Card>
    );
  }

  if (r.status === "out_for_delivery") {
    return (
      <Card>
        <h2 className="flex items-center gap-2 font-semibold">
          <KeyRound className="size-4 text-primary" aria-hidden />
          Step 3: confirm the handoff
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask {r.requesterName} for their 4-digit delivery code and enter it here to finish and get paid.
        </p>
        <form
          className="mt-4 flex max-w-xs flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setCodeError("");
            void run(async () => {
              const res = await complete({ id: r.id, otp: code });
              if (res.ok) {
                toast.success(`Delivered. ${money(res.earned)} added to your wallet.`);
              } else {
                setCodeError(res.message);
                setCode("");
              }
            });
          }}
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{4}"
            maxLength={4}
            placeholder="0000"
            aria-label="Delivery code"
            aria-invalid={codeError ? true : undefined}
            className="h-14 text-center text-2xl font-semibold tracking-[0.5em]"
          />
          {codeError && (
            <p role="alert" className="text-sm text-danger">
              {codeError}
            </p>
          )}
          <Button type="submit" size="lg" disabled={code.length !== 4} loading={pending}>
            Confirm delivery
          </Button>
        </form>
      </Card>
    );
  }

  if (r.status === "delivered") {
    return (
      <Card className="border-success/30 bg-success-soft/60">
        <h2 className="flex items-center gap-2 font-semibold text-success">
          <CheckCircle2 className="size-5" aria-hidden />
          Delivered
        </h2>
        <p className="mt-1 text-sm">
          You earned {money(earn)}
          {r.reimbursement > 0 && ` and got ${money(r.reimbursement)} back for the items`}. It's in your wallet.
        </p>
        <LinkButton to="/deliver" variant="secondary" size="sm" className="mt-4">
          Find another delivery
        </LinkButton>
      </Card>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      This request was cancelled. <Link to="/deliver" className="text-primary hover:underline">See other requests</Link>
    </p>
  );
}
