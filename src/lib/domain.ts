import { Coffee, Pencil, Pill, ShoppingBasket, type LucideIcon } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";

export {
  BONUS_COIN_RATE,
  CATEGORIES,
  DELIVERY_FEE,
  ISSUE_TYPES,
  MAX_ACTIVE_JOBS,
  MAX_REWARD,
  MIN_REWARD,
  TOPUP_DAILY_MAX,
  TOPUP_MAX,
  TOPUP_MIN,
  URGENCIES,
} from "../../convex/lib/constants";
export type { Category, Urgency } from "../../convex/lib/constants";
export { STAGE_LABEL } from "../../convex/lib/knowledge";

export type RequestView = NonNullable<FunctionReturnType<typeof api.deliveries.get>>;
export type Stage = RequestView["status"];

export const CATEGORY_ICON: Record<string, LucideIcon> = {
  Food: Coffee,
  Stationery: Pencil,
  Medicines: Pill,
  Groceries: ShoppingBasket,
};

/** Happy-path order of a delivery. */
export const STEPS: { stage: Stage; label: string; carrierLabel: string }[] = [
  { stage: "open", label: "Placed", carrierLabel: "Open" },
  { stage: "accepted", label: "Carrier assigned", carrierLabel: "Accepted" },
  { stage: "purchased", label: "Items bought", carrierLabel: "Items bought" },
  { stage: "out_for_delivery", label: "On the way", carrierLabel: "On the way" },
  { stage: "delivered", label: "Delivered", carrierLabel: "Delivered" },
];


export const stepIndex = (stage: Stage) => STEPS.findIndex((s) => s.stage === stage);

export const isActive = (stage: Stage) => stage !== "delivered" && stage !== "cancelled";

export const TIP_OPTIONS = [0, 10, 20, 30];
export const DEADLINE_OPTIONS = [15, 30, 45, 60, 120];

export const URGENCY_LABEL = { high: "Urgent", medium: "Soon", low: "Relaxed" } as const;

export const stageTone = (stage: Stage) =>
  stage === "delivered" ? "solid" : stage === "cancelled" ? "danger" : stage === "open" ? "warning" : "primary";
