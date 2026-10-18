import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Button, Card, Choice, Field, Input, PageHeader, Row, Textarea } from "@/components/ui";
import {
  CATEGORIES,
  CATEGORY_ICON,
  DEADLINE_OPTIONS,
  MAX_REWARD,
  TIP_OPTIONS,
  URGENCY_LABEL,
  URGENCIES,
  type Category,
  type Urgency,
} from "@/lib/domain";
import { money } from "@/lib/format";
import { useMe } from "@/lib/me";
import { useSubmit } from "@/lib/submit";

export default function Post() {
  const me = useMe();
  const post = useMutation(api.deliveries.post);
  const navigate = useNavigate();
  const { pending, run } = useSubmit();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("Food");
  const [pickup, setPickup] = useState("");
  const [hostel, setHostel] = useState(me.hostelBlock);
  const [room, setRoom] = useState(me.roomNumber);
  const [items, setItems] = useState("");
  const [reward, setReward] = useState("30");
  const [tip, setTip] = useState(0);
  const [deadline, setDeadline] = useState(30);
  const [urgency, setUrgency] = useState<Urgency>("medium");

  const rewardN = Number(reward);
  const rewardOk = Number.isInteger(rewardN) && rewardN >= 10 && rewardN <= MAX_REWARD;
  const total = (rewardOk ? rewardN : 0) + tip;
  const short = Math.max(0, total - me.walletBalance);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = await run(() =>
      post({
        title,
        category,
        pickup,
        dropHostel: hostel,
        dropRoom: room,
        items: items.split("\n").map((s) => s.trim()).filter(Boolean),
        reward: rewardN,
        tip,
        deadlineMinutes: deadline,
        urgency,
      }),
    );
    if (id) {
      toast.success("Posted. Nearby students can see it now.");
      navigate(`/orders/${id}`, { replace: true });
    }
  }

  return (
    <div>
      <PageHeader
        title="Post an errand"
        subtitle="Need something that isn't on a shop menu? Describe it and set a reward."
      />
      <form onSubmit={(e) => void submit(e)} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card className="space-y-5">
            <Field label="What do you need?">
              {(id) => (
                <Input id={id} required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Print and staple my assignment" />
              )}
            </Field>
            <div>
              <p className="mb-2 text-sm font-medium">Category</p>
              <Choice
                label="Category"
                value={category}
                onChange={setCategory}
                options={CATEGORIES.map((c) => {
                  const Icon = CATEGORY_ICON[c];
                  return {
                    value: c,
                    label: (
                      <>
                        <Icon className="size-4" aria-hidden />
                        {c}
                      </>
                    ),
                  };
                })}
              />
            </div>
            <Field label="Items" hint="One per line. Optional.">
              {(id) => (
                <Textarea id={id} value={items} onChange={(e) => setItems(e.target.value)} placeholder={"2 black gel pens\nA4 notebook"} />
              )}
            </Field>
          </Card>

          <Card className="space-y-5">
            <h2 className="font-semibold">Where</h2>
            <Field label="Pick up from">
              {(id) => <Input id={id} required value={pickup} onChange={(e) => setPickup(e.target.value)} maxLength={80} placeholder="Library photocopy counter" />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your hostel or block">
                {(id) => <Input id={id} required value={hostel} onChange={(e) => setHostel(e.target.value)} maxLength={40} />}
              </Field>
              <Field label="Room">
                {(id) => <Input id={id} required value={room} onChange={(e) => setRoom(e.target.value)} maxLength={20} />}
              </Field>
            </div>
          </Card>

          <Card className="space-y-5">
            <h2 className="font-semibold">Reward and timing</h2>
            <Field label="Reward (₹)" hint={`Between ₹10 and ${money(MAX_REWARD)}. Item cost is settled directly with your carrier.`}>
              {(id) => (
                <div className="space-y-2">
                  <Input id={id} type="number" inputMode="numeric" min={10} max={MAX_REWARD} step={1} required value={reward} onChange={(e) => setReward(e.target.value)} className="sm:max-w-40" />
                  <Choice
                    label="Quick reward"
                    value={rewardN}
                    onChange={(n) => setReward(String(n))}
                    options={[20, 30, 40, 50].map((n) => ({ value: n, label: money(n) }))}
                  />
                </div>
              )}
            </Field>
            <div>
              <p className="mb-2 text-sm font-medium">Tip</p>
              <Choice label="Tip" value={tip} onChange={setTip} options={TIP_OPTIONS.map((t) => ({ value: t, label: t === 0 ? "No tip" : money(t) }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Needed within</p>
              <Choice label="Deadline" value={deadline} onChange={setDeadline} options={DEADLINE_OPTIONS.map((m) => ({ value: m, label: m >= 60 ? `${m / 60} h` : `${m} min` }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">How urgent?</p>
              <Choice label="Urgency" value={urgency} onChange={setUrgency} options={URGENCIES.map((u) => ({ value: u, label: URGENCY_LABEL[u] }))} />
            </div>
          </Card>
        </div>

        <aside>
          <Card className="lg:sticky lg:top-8">
            <h2 className="font-semibold">Cost</h2>
            <dl className="mt-4 space-y-2">
              <Row label="Reward" value={money(rewardOk ? rewardN : 0)} />
              <Row label="Tip" value={money(tip)} />
              <div className="border-t border-border pt-2">
                <Row strong label="Total" value={money(total)} />
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Held until the delivery is confirmed. Refunded if nobody accepts within {deadline} min, or if you cancel
              before the carrier buys your items.
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
            <Button type="submit" size="lg" className="mt-4 w-full" loading={pending} disabled={short > 0 || !rewardOk}>
              Post errand · {money(total)}
            </Button>
          </Card>
        </aside>
      </form>
    </div>
  );
}
