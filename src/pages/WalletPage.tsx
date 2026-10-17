import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ArrowDownLeft, ArrowUpRight, Coins, Wallet } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Button, Card, Choice, EmptyState, Field, Input, PageHeader, Skeleton } from "@/components/ui";
import { dateTime, money } from "@/lib/format";
import { useSubmit } from "@/lib/submit";
import { cn } from "@/lib/utils";

const QUICK = [100, 250, 500, 1000];

export default function WalletPage() {
  const wallet = useQuery(api.wallet.summary);
  const topUp = useMutation(api.wallet.topUp);
  const { pending, run } = useSubmit();
  const [amount, setAmount] = useState("");
  const n = Number(amount);

  return (
    <div>
      <PageHeader title="Wallet" subtitle="Your balance, top-ups and everything that moved through it." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <p className="text-sm text-muted-foreground">Balance</p>
            {wallet === undefined ? (
              <Skeleton className="mt-2 h-10 w-32" />
            ) : (
              <p className="tabular mt-1 text-4xl font-semibold tracking-tight">{money(wallet.balance)}</p>
            )}
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-sm text-primary-soft-foreground">
              <Coins className="size-4" aria-hidden />
              {wallet?.bonusCoins ?? 0} bonus coins
            </p>
          </Card>

          <Card>
            <h2 className="font-semibold">Add money</h2>
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await topUp({ amount: n });
                  toast.success(`${money(n)} added to your wallet.`);
                  setAmount("");
                });
              }}
            >
              <Choice
                label="Quick amounts"
                value={n}
                onChange={(v) => setAmount(String(v))}
                options={QUICK.map((v) => ({ value: v, label: money(v) }))}
              />
              <Field label="Amount (₹)" hint="₹10 to ₹5,000 per top-up, ₹10,000 per day.">
                {(id) => (
                  <Input id={id} type="number" inputMode="numeric" min={10} max={5000} step={1} required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" />
                )}
              </Field>
              <Button type="submit" className="w-full" loading={pending} disabled={!Number.isInteger(n) || n < 10}>
                {n >= 10 ? `Add ${money(n)}` : "Add money"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Test mode: no real payment is taken yet, so don't expect money to leave your bank account.
              </p>
            </form>
          </Card>
        </div>

        <section aria-labelledby="history">
          <h2 id="history" className="mb-3 font-semibold">
            History
          </h2>
          {wallet === undefined ? (
            <div className="space-y-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : wallet.transactions.length === 0 ? (
            <EmptyState icon={Wallet} title="No transactions yet">
              Top-ups, orders and earnings show up here.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-card">
              {wallet.transactions.map((t) => {
                const Row = (
                  <div className="flex items-center gap-3 p-4">
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-full",
                        t.type === "credit" ? "bg-success-soft text-success" : "bg-subtle text-muted-foreground",
                      )}
                    >
                      {t.type === "credit" ? <ArrowDownLeft className="size-4" aria-hidden /> : <ArrowUpRight className="size-4" aria-hidden />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{dateTime(t.at)}</p>
                    </div>
                    <p className={cn("tabular text-sm font-semibold", t.type === "credit" && "text-success")}>
                      {t.type === "credit" ? "+" : "−"}
                      {money(t.amount)}
                    </p>
                  </div>
                );
                return (
                  <li key={t.id}>
                    {t.deliveryRequestId ? (
                      <Link to={`/orders/${t.deliveryRequestId}`} className="block hover:bg-subtle">
                        {Row}
                      </Link>
                    ) : (
                      Row
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
