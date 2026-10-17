// Shared by the Convex functions and the React app (pure values only).

export const CATEGORIES = ["Food", "Stationery", "Medicines", "Groceries"] as const;
export type Category = (typeof CATEGORIES)[number];

export const URGENCIES = ["low", "medium", "high"] as const;
export type Urgency = (typeof URGENCIES)[number];

export const ISSUE_TYPES = [
  "Wrong items received",
  "Items damaged",
  "Items missing",
  "Delayed delivery",
  "Rude behaviour",
  "Other",
] as const;

/** Flat carrier fee (₹) added to every shop order. */
export const DELIVERY_FEE = 30;
/** Minutes a shop order waits for a carrier before it is cancelled and refunded. */
export const ORDER_WINDOW_MINUTES = 60;
/** Fraction of an order subtotal returned to the customer as bonus coins. */
export const BONUS_COIN_RATE = 0.05;

export const WELCOME_BONUS = 500;
export const SIGNUP_POINTS = 100;

export const TOPUP_MIN = 10;
export const TOPUP_MAX = 5000;
export const TOPUP_DAILY_MAX = 10000;

export const MAX_TIP = 200;
export const MAX_REWARD = 500;
export const MAX_LINE_QTY = 20;
export const MAX_ACTIVE_JOBS = 3;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const OTP_MAX_ATTEMPTS = 5;
export const OTP_LOCK_MINUTES = 10;
