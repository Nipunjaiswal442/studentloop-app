import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange?: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
          disabled={disabled || !onChange}
          onClick={() => onChange?.(n)}
          className="rounded p-0.5 disabled:cursor-default"
        >
          <Star
            className={cn(
              "size-7",
              n <= value ? "fill-primary text-primary" : "text-control",
            )}
          />
        </button>
      ))}
    </div>
  );
}
