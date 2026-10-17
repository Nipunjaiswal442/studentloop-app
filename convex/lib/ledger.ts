import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

type TxKind = Doc<"transactions">["kind"];

/**
 * Every wallet change goes through credit/debit so the balance and the
 * transaction history can never drift apart.
 */
export async function credit(
  ctx: MutationCtx,
  userId: Id<"users">,
  amount: number,
  kind: TxKind,
  description: string,
  deliveryRequestId?: Id<"deliveryRequests">,
) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Invalid credit amount");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");
  await ctx.db.patch(userId, { walletBalance: user.walletBalance + amount });
  await ctx.db.insert("transactions", {
    userId,
    type: "credit",
    kind,
    amount,
    description,
    deliveryRequestId,
  });
}

export async function debit(
  ctx: MutationCtx,
  userId: Id<"users">,
  amount: number,
  kind: TxKind,
  description: string,
  deliveryRequestId?: Id<"deliveryRequests">,
) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Invalid debit amount");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");
  if (user.walletBalance < amount) {
    throw new ConvexError(
      `Insufficient wallet balance: you need ₹${amount} but have ₹${user.walletBalance}.`,
    );
  }
  await ctx.db.patch(userId, { walletBalance: user.walletBalance - amount });
  await ctx.db.insert("transactions", {
    userId,
    type: "debit",
    kind,
    amount,
    description,
    deliveryRequestId,
  });
}

export async function logActivity(
  ctx: MutationCtx,
  userId: Id<"users">,
  action: string,
  details: string,
  points = 0,
) {
  await ctx.db.insert("activity", { userId, action, details, points });
  if (points > 0) {
    const user = await ctx.db.get(userId);
    if (user) await ctx.db.patch(userId, { points: user.points + points });
  }
}
