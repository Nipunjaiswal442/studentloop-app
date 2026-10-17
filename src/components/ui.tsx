import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { Link, type LinkProps } from "react-router-dom";
import { ArrowLeft, Loader2, Minus, Plus, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonClass, type Size, type Variant } from "@/components/button-styles";

/* ───────────── Buttons ───────────── */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={buttonClass(variant, size, className)}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export function LinkButton({
  variant,
  size,
  className,
  ...rest
}: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

/* ───────────── Form controls ───────────── */

const control =
  "w-full rounded-lg border border-border bg-card px-3 text-foreground placeholder:text-muted-foreground/70 transition-colors hover:border-primary/40 focus:border-primary disabled:cursor-not-allowed disabled:bg-subtle disabled:opacity-70";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(control, "h-10", className)} {...rest} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn(control, "min-h-20 py-2", className)} {...rest} />;
  },
);

/** Label + control + optional hint, wired together for screen readers. */
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: (id: string) => ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Single-choice pills, e.g. category or tip. */
export function Choice<T extends string | number>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
              selected
                ? "border-primary bg-primary-soft text-primary-soft-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** − 2 + control used for quantities. */
export function Quantity({
  value,
  onChange,
  max = 20,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
  label: string;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-card">
      <button
        type="button"
        aria-label={`Remove one ${label}`}
        onClick={() => onChange(value - 1)}
        className="grid size-9 place-items-center rounded-l-lg text-muted-foreground hover:bg-subtle hover:text-foreground"
      >
        <Minus className="size-4" />
      </button>
      <span className="tabular w-8 text-center text-sm font-semibold" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Add one ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="grid size-9 place-items-center rounded-r-lg text-primary hover:bg-primary-soft disabled:opacity-40"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

/* ───────────── Surfaces ───────────── */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-4 shadow-card sm:p-5", className)}>
      {children}
    </section>
  );
}

const tones = {
  neutral: "bg-subtle text-muted-foreground",
  primary: "bg-primary-soft text-primary-soft-foreground",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
} as const;

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-primary", className)} aria-label="Loading" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-subtle", className)} aria-hidden />;
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <div className="mb-3 grid size-11 place-items-center rounded-full bg-primary-soft text-primary-soft-foreground">
        <Icon className="size-5" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ───────────── Page structure ───────────── */

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  back?: { to: string; label: string };
  action?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link
          to={back.to}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

export function Row({
  label,
  value,
  strong,
}: {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 text-sm", strong && "font-semibold")}>
      <dt className={strong ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className="tabular text-right">{value}</dd>
    </div>
  );
}

/* ───────────── Modal (native <dialog>: focus trap + Esc for free) ───────────── */

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-0 mt-auto max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border border-border bg-card p-0 text-foreground shadow-raised backdrop:bg-foreground/40 sm:m-auto sm:max-w-md sm:rounded-2xl"
    >
      {open && (
        <div className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-m-1 rounded-md p-1 text-muted-foreground hover:bg-subtle hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
