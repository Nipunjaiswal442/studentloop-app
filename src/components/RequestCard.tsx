import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui";
import {
  CATEGORY_ICON,
  STAGE_LABEL,
  URGENCY_LABEL,
  isActive,
  stageTone,
  type RequestView,
} from "@/lib/domain";
import { money, timeAgo } from "@/lib/format";

/** One request in a list. `mode` decides which numbers matter to the reader. */
export function RequestCard({
  request: r,
  to,
  mode,
}: {
  request: RequestView;
  to: string;
  mode: "requester" | "carrier" | "browse";
}) {
  const Icon = CATEGORY_ICON[r.category] ?? MapPin;
  const earn = r.reward + r.tip;
  return (
    <Link
      to={to}
      className="group flex gap-3 rounded-xl border border-border bg-card p-4 shadow-card transition-[border-color,box-shadow,transform] duration-200 ease-smooth hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-raised active:scale-[0.99]"
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-medium">{r.title}</h3>
            <p className="truncate text-sm text-muted-foreground">
              {mode === "requester"
                ? `${r.code ?? "Errand"} · ${timeAgo(r.createdAt)}`
                : `${r.requesterName} · ${timeAgo(r.createdAt)}`}
            </p>
          </div>
          {mode === "browse" && r.urgency !== "low" ? (
            <Badge tone={r.urgency === "high" ? "danger" : "warning"}>{URGENCY_LABEL[r.urgency]}</Badge>
          ) : (
            <Badge tone={stageTone(r.status)}>{STAGE_LABEL[r.status]}</Badge>
          )}
        </div>

        <p className="mt-2 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
          <span className="truncate">{r.pickup}</span>
          <ArrowRight className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{r.dropHostel}</span>
        </p>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
          {mode === "requester" ? (
            <>
              <span className="text-muted-foreground">{r.items.length} {r.items.length === 1 ? "item" : "items"}</span>
              <span className="tabular font-semibold">
                {money(r.order?.total ?? earn)}
              </span>
            </>
          ) : (
            <>
              <span className="text-muted-foreground">
                {isActive(r.status) ? `Needed within ${r.deadlineMinutes} min` : STAGE_LABEL[r.status]}
              </span>
              <span className="tabular font-semibold text-primary-soft-foreground">
                Earn {money(earn)}
                {r.reimbursement > 0 && (
                  <span className="font-normal text-muted-foreground"> + {money(r.reimbursement)} items</span>
                )}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
