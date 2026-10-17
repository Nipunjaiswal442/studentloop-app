import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { TOPUP_DAILY_MAX, TOPUP_MAX, TOPUP_MIN } from "./lib/constants";
import { credit, logActivity } from "./lib/ledger";
import { requireUser } from "./lib/users";
import { fail, wholeRupees } from "./lib/validate";

const DAY_MS = 24 * 60 * 60 * 1000;

export const summary = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const rows = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
    return {
      balance: user.walletBalance,
      bonusCoins: user.bonusCoins,
      transactions: rows.map((t) => ({
        id: t._id,
        type: t.type,
        kind: t.kind,
        amount: t.amount,
        description: t.description,
        at: t._creationTime,
        deliveryRequestId: t.deliveryRequestId,
      })),
    };
  },
});

/**
 * Adds money to the wallet. There is no payment gateway behind this yet, so it
 * is a capped demo top-up: before real money is involved, replace the body
 * with a call that verifies a completed payment.
 */
export const topUp = mutation({
  args: { amount: v.number() },
  handler: async (ctx, { amount }) => {
    const user = await requireUser(ctx);
    wholeRupees(amount, "Amount", TOPUP_MIN, TOPUP_MAX);

    const since = Date.now() - DAY_MS;
    const recent = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id).gt("_creationTime", since))
      .collect();
    const addedToday = recent
      .filter((t) => t.kind === "topup")
      .reduce((sum, t) => sum + t.amount, 0);
    if (addedToday + amount > TOPUP_DAILY_MAX) {
      fail(`Daily top-up limit is ₹${TOPUP_DAILY_MAX}. You can add ₹${TOPUP_DAILY_MAX - addedToday} more today.`);
    }

    await credit(ctx, user._id, amount, "topup", "Added to wallet");
    await logActivity(ctx, user._id, "wallet_topup", `Added ₹${amount} to wallet`);
  },
});
