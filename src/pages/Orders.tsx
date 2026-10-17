import { useState } from "react";
import { useQuery } from "convex/react";
import { PackagePlus, ReceiptText, Store } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { RequestCard } from "@/components/RequestCard";
import { Choice, EmptyState, LinkButton, PageHeader, Skeleton } from "@/components/ui";
import { isActive } from "@/lib/domain";

export default function Orders() {
  const requests = useQuery(api.deliveries.listRequested);
  const [tab, setTab] = useState<"active" | "past">("active");

  const active = requests?.filter((r) => isActive(r.status)) ?? [];
  const past = requests?.filter((r) => !isActive(r.status)) ?? [];
  const shown = tab === "active" ? active : past;

  return (
    <div>
      <PageHeader
        title="Your orders"
        subtitle="Shop orders and errands you've requested."
        action={
          <LinkButton to="/post" variant="secondary" size="sm">
            <PackagePlus className="size-4" aria-hidden />
            Post an errand
          </LinkButton>
        }
      />

      <Choice
        label="Show"
        value={tab}
        onChange={setTab}
        options={[
          { value: "active", label: `Active${active.length ? ` (${active.length})` : ""}` },
          { value: "past", label: "Past" },
        ]}
      />

      <div className="mt-5">
        {requests === undefined ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title={tab === "active" ? "No active orders" : "No past orders yet"}
            action={
              tab === "active" ? (
                <LinkButton to="/shops" size="sm">
                  <Store className="size-4" aria-hidden />
                  Browse shops
                </LinkButton>
              ) : undefined
            }
          >
            {tab === "active" ? "When you order something, you can follow it here." : "Delivered and cancelled orders appear here."}
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {shown.map((r) => (
              <li key={r.id}>
                <RequestCard request={r} mode="requester" to={`/orders/${r.id}`} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
