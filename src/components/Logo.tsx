import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M9 14a7 7 0 0 1 12-4.5L23 12m0-4v4h-4M23 18a7 7 0 0 1-12 4.5L9 20m0 4v-4h4"
        fill="none"
        className="stroke-primary-foreground"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * `compact` shows only the mark below 360px, for crowded headers. The name stays
 * in the link for screen readers.
 */
export function Logo({ to = "/", className, compact }: { to?: string; className?: string; compact?: boolean }) {
  return (
    <Link to={to} className={cn("inline-flex items-center gap-2.5 transition-opacity active:opacity-80", className)}>
      <LogoMark />
      <span className={cn("text-lg font-semibold tracking-tight", compact && "max-[359px]:sr-only")}>StudentLoop</span>
    </Link>
  );
}
