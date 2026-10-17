import { useState } from "react";
import { useQuery } from "convex/react";
import { Bike, PackagePlus } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { RequestCard } from "@/components/RequestCard";
import { Choice, EmptyState, LinkButton, PageHeader, Skeleton } from "@/components/ui";
import { CATEGORIES, CATEGORY_ICON, isActive } from "@/lib/domain";
import { money } from "@/lib/format";

export default function Deliver() {
  const open = useQuery(api.deliveries.listOpen);
  const mine = useQuery(api.deliveries.listCarrying);
  const [tab, setTab] = useState<"open" | "mine">("open");
  const [category, setCategory] = useState<"All" | (typeof CATEGORIES)[number]>("All");

  const active = mine?.filter((r) => isActive(r.status)) ?? [];
  const finished = mine?.filter((r) => r.status === "delivered") ?? [];
  const earned = finished.reduce((sum, r) => sum + r.reward + r.tip, 0);
  const visibleOpen = open?.filter((r) => category === "All" || r.category === category);

  return (
    <div>
      <PageHeader
        title="Deliver"
        subtitle="Pick up requests from other students and earn."
        action={
          <LinkButton to="/post" variant="secondary" size="sm">
            <PackagePlus className="size-4" aria-hidden />
            Post an errand
          </LinkButton>
        }
      />

      <Choice
        label="View"
        value={tab}
        onChange={setTab}
        options={[
          { value: "open", label: `Open requests${open?.length ? ` (${open.length})` : ""}` },
          { value: "mine", label: `My deliveries${active.length ? ` (${active.length} active)` : ""}` },
        ]}
      />

      {tab === "open" ? (
        <div className="mt-5">
          <div className="no-scrollbar -mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Choice
              label="Category"
              value={category}
              onChange={setCategory}
              className="flex-nowrap sm:flex-wrap"
              options={[
                { value: "All", label: "All" },
                ...CATEGORIES.map((c) => {
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
                }),
              ]}
            />
          </div>

          {visibleOpen === undefined ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
            </div>
          ) : visibleOpen.length === 0 ? (
            <EmptyState icon={Bike} title="No open requests right now">
              New requests appear here the moment someone posts them.
            </EmptyState>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {visibleOpen.map((r) => (
                <li key={r.id}>
                  <RequestCard request={r} mode="browse" to={`/deliver/${r.id}`} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-8">
          {mine === undefined ? (
            <Skeleton className="h-36" />
          ) : mine.length === 0 ? (
            <EmptyState icon={Bike} title="You haven't taken a delivery yet">
              Accept a request from the Open requests tab to get started.
            </EmptyState>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="tabular text-2xl font-semibold">{finished.length}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <p className="text-sm text-muted-foreground">Earned</p>
                  <p className="tabular text-2xl font-semibold">{money(earned)}</p>
                </div>
              </div>

              {active.length > 0 && (
                <section>
                  <h2 className="mb-3 font-semibold">In progress</h2>
                  <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {active.map((r) => (
                      <li key={r.id}>
                        <RequestCard request={r} mode="carrier" to={`/deliver/${r.id}`} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {mine.some((r) => !isActive(r.status)) && (
                <section>
                  <h2 className="mb-3 font-semibold">History</h2>
                  <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {mine
                      .filter((r) => !isActive(r.status))
                      .map((r) => (
                        <li key={r.id}>
                          <RequestCard request={r} mode="carrier" to={`/deliver/${r.id}`} />
                        </li>
                      ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
