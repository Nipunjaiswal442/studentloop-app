import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { ArrowRight, Clock, MapPin, PackagePlus, Plus, Search, Star, Store } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Badge, Choice, EmptyState, Input, LinkButton, PageHeader, Skeleton } from "@/components/ui";
import { CATEGORIES, CATEGORY_ICON, STAGE_LABEL, isActive } from "@/lib/domain";
import { useMe } from "@/lib/me";

export default function Shops() {
  const me = useMe();
  const shops = useQuery(api.shops.list);
  const requested = useQuery(api.deliveries.listRequested);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"All" | (typeof CATEGORIES)[number]>("All");

  const activeOrder = requested?.find((r) => isActive(r.status));
  const term = search.trim().toLowerCase();

  const visible = useMemo(
    () =>
      shops?.filter(
        (s) =>
          (category === "All" || s.category === category) &&
          (!term ||
            s.name.toLowerCase().includes(term) ||
            s.itemNames.some((n) => n.toLowerCase().includes(term))),
      ),
    [shops, category, term],
  );

  return (
    <div>
      <PageHeader
        title={me.firstName ? `Hi, ${me.firstName}` : "Shops"}
        subtitle="What do you need from campus today?"
        action={
          <div className="flex gap-2">
            <LinkButton to="/post" variant="secondary" size="sm">
              <PackagePlus className="size-4" aria-hidden />
              Post an errand
            </LinkButton>
            <LinkButton to="/shops/new" variant="secondary" size="sm">
              <Plus className="size-4" aria-hidden />
              Add a shop
            </LinkButton>
          </div>
        }
      />

      {activeOrder && (
        <Link
          to={`/orders/${activeOrder.id}`}
          className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary-soft px-4 py-3 text-primary-soft-foreground transition-[border-color,transform] duration-200 ease-smooth hover:border-primary/60 active:scale-[0.99]"
        >
          <span className="min-w-0 text-sm">
            <span className="font-semibold">{STAGE_LABEL[activeOrder.status]}</span>
            <span className="text-primary-soft-foreground/80"> · {activeOrder.title}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium">
            Track <ArrowRight className="size-4" aria-hidden />
          </span>
        </Link>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search shops and items"
          aria-label="Search shops and items"
          className="h-11 pl-9"
        />
      </div>

      <div className="no-scrollbar -mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
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

      <div className="mt-6">
        {visible === undefined ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          shops?.length === 0 ? (
            <EmptyState
              icon={Store}
              title="No shops yet"
              action={
                <LinkButton to="/shops/new" size="sm">
                  Add the first shop
                </LinkButton>
              }
            >
              Shops listed by students show up here.
            </EmptyState>
          ) : (
            <EmptyState icon={Search} title="Nothing matches that">
              Try a different search or category.
            </EmptyState>
          )
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((s) => {
              const Icon = CATEGORY_ICON[s.category] ?? Store;
              const hits = term ? s.itemNames.filter((n) => n.toLowerCase().includes(term)).slice(0, 2) : [];
              return (
                <li key={s.id}>
                  <Link
                    to={`/shops/${s.id}`}
                    className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-card transition-[border-color,box-shadow,transform] duration-200 ease-smooth hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-raised active:scale-[0.99]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold">{s.name}</h2>
                        <p className="text-sm text-muted-foreground">
                          {s.category} · {s.itemCount} {s.itemCount === 1 ? "item" : "items"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {s.rating ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="size-3.5 fill-primary text-primary" aria-hidden />
                          {s.rating.toFixed(1)}
                        </span>
                      ) : (
                        <Badge tone="primary">New</Badge>
                      )}
                      {s.distance && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5" aria-hidden />
                          {s.distance}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" aria-hidden />
                        ~{s.deliveryMinutes} min
                      </span>
                    </div>
                    {hits.length > 0 && (
                      <p className="mt-3 text-sm text-primary-soft-foreground">Has {hits.join(", ")}</p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
