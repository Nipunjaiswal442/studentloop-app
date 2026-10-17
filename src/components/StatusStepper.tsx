import { Check } from "lucide-react";
import { STEPS, stepIndex, type Stage } from "@/lib/domain";
import { cn } from "@/lib/utils";

/** A compact progress bar on phones; the full step-by-step list from `sm` up. */
export function StatusStepper({ stage, carrierView }: { stage: Stage; carrierView?: boolean }) {
  const current = stepIndex(stage);
  const finished = stage === "delivered";
  const label = (i: number) => (carrierView ? STEPS[i].carrierLabel : STEPS[i].label);

  return (
    <div role="group" aria-label="Progress">
      <div className="sm:hidden">
        <div className="mb-2 flex gap-1" aria-hidden>
          {STEPS.map((step, i) => (
            <span
              key={step.stage}
              className={cn("h-1.5 flex-1 rounded-full", i <= current || finished ? "bg-primary" : "bg-border")}
            />
          ))}
        </div>
        <p className="text-sm">
          <span className="text-muted-foreground">
            Step {current + 1} of {STEPS.length}:{" "}
          </span>
          <span className="font-semibold">{label(current)}</span>
        </p>
      </div>

      <ol className="hidden sm:flex">
        {STEPS.map((step, i) => {
          const done = i < current || finished;
          const active = i === current && !finished;
          return (
            <li
              key={step.stage}
              aria-current={active ? "step" : undefined}
              className="relative flex flex-1 flex-col items-center gap-2 text-center"
            >
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className={cn("absolute left-1/2 top-4 h-0.5 w-full", i < current ? "bg-primary" : "bg-border")}
                />
              )}
              <span
                className={cn(
                  "relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary bg-card text-primary",
                  !done && !active && "border-border bg-card text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" aria-hidden /> : i + 1}
              </span>
              <span className={cn("text-sm", active ? "font-semibold" : done ? "font-medium" : "text-muted-foreground")}>
                {label(i)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
