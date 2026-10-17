import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  MAX_ACTIVE_JOBS,
  MAX_REWARD,
  MAX_TIP,
  OTP_LOCK_MINUTES,
  OTP_MAX_ATTEMPTS,
} from "./lib/constants";
import { credit, debit, logActivity } from "./lib/ledger";
import { assertImageUpload } from "./lib/uploads";
import { publicName, requireUser } from "./lib/users";
import { fail, fourDigitCode, text, wholeRupees } from "./lib/validate";
import { category, urgency } from "./schema";

const MINUTE = 60 * 1000;
const ACTIVE = ["accepted", "purchased", "out_for_delivery"] as const;

type Job = Doc<"deliveryRequests">;
type Role = "requester" | "carrier" | "viewer";

/* ───────────────────────────── views ───────────────────────────── */

/**
 * What a given viewer is allowed to see of a job. Strangers browsing open
 * requests get the hostel but not the room; the delivery code only ever goes
 * to the requester.
 */
async function toView(ctx: QueryCtx, job: Job, viewerId: Id<"users">) {
  const role: Role =
    job.requesterId === viewerId ? "requester" : job.partnerId === viewerId ? "carrier" : "viewer";
  const participant = role !== "viewer";

  const requester = await ctx.db.get(job.requesterId);
  const partner = job.partnerId ? await ctx.db.get(job.partnerId) : null;
  const order = job.orderId ? await ctx.db.get(job.orderId) : null;
  const dispute =
    role === "requester"
      ? await ctx.db
          .query("disputes")
          .withIndex("by_request", (q) => q.eq("deliveryRequestId", job._id))
          .first()
      : null;

  const inFlight = job.status !== "delivered" && job.status !== "cancelled";
  const counterpart = role === "requester" ? partner : role === "carrier" ? requester : null;

  return {
    id: job._id,
    kind: order ? ("order" as const) : ("errand" as const),
    code: order?.code ?? null,
    title: job.title,
    category: job.category,
    status: job.status,
    role,
    pickup: job.pickup,
    dropHostel: job.dropHostel,
    dropRoom: participant ? job.dropRoom : null,
    items: job.items,
    reward: job.reward,
    tip: job.tip,
    reimbursement: job.reimbursement,
    deadlineMinutes: job.deadlineMinutes,
    urgency: job.urgency,
    createdAt: job._creationTime,
    deliveredAt: job.deliveredAt ?? null,
    cancelReason: job.cancelReason ?? null,
    requesterName: requester ? publicName(requester) : "Student",
    partner: partner
      ? {
          name: publicName(partner),
          rating: partner.rating,
          ratingCount: partner.ratingCount,
          trustScore: partner.trustScore,
        }
      : null,
    contactPhone:
      participant && inFlight && job.partnerId && counterpart?.mobile ? counterpart.mobile : null,
    otp: role === "requester" && inFlight ? job.otp : null,
    rating: job.rating ?? null,
    billUrl:
      participant && job.billStorageId ? await ctx.storage.getUrl(job.billStorageId) : null,
    order:
      participant && order
        ? {
            shopId: order.shopId,
            shopName: order.shopName,
            lines: order.lines.map((l) => ({
              menuItemId: l.menuItemId,
              name: l.name,
              price: l.price,
              qty: l.qty,
              note: l.note,
            })),
            subtotal: order.subtotal,
            deliveryFee: order.deliveryFee,
            tip: order.tip,
            total: order.total,
          }
        : null,
    dispute: dispute ? { issueType: dispute.issueType, status: dispute.status } : null,
  };
}

/** Requests waiting for a carrier, newest first, excluding the viewer's own. */
export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const jobs = await ctx.db
      .query("deliveryRequests")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .take(60);
    const others = jobs.filter((j) => j.requesterId !== user._id);
    return await Promise.all(others.map((j) => toView(ctx, j, user._id)));
  },
});

/** Jobs the viewer is carrying or has carried. */
export const listCarrying = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const jobs = await ctx.db
      .query("deliveryRequests")
      .withIndex("by_partner", (q) => q.eq("partnerId", user._id))
      .order("desc")
      .take(40);
    return await Promise.all(jobs.map((j) => toView(ctx, j, user._id)));
  },
});

/** The viewer's own orders and errands. */
export const listRequested = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const jobs = await ctx.db
      .query("deliveryRequests")
      .withIndex("by_requester", (q) => q.eq("requesterId", user._id))
      .order("desc")
      .take(60);
    return await Promise.all(jobs.map((j) => toView(ctx, j, user._id)));
  },
});

export const get = query({
  args: { id: v.id("deliveryRequests") },
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx);
    const job = await ctx.db.get(id);
    if (!job) return null;
    const view = await toView(ctx, job, user._id);
    // Strangers may only look at requests that are still up for grabs.
    if (view.role === "viewer" && job.status !== "open") return null;
    return view;
  },
});

/* ───────────────────────────── helpers ───────────────────────────── */

async function loadJob(ctx: MutationCtx, id: Id<"deliveryRequests">): Promise<Job> {
  const job = await ctx.db.get(id);
  if (!job) fail("That request no longer exists.");
  return job;
}

function expiresAt(job: Job) {
  return job._creationTime + job.deadlineMinutes * MINUTE;
}

/** Cancels a job that has not been purchased yet and returns the escrow. */
async function cancelAndRefund(ctx: MutationCtx, job: Job, reason: string) {
  const refund = job.reward + job.tip + job.reimbursement;
  await ctx.db.patch(job._id, { status: "cancelled", cancelReason: reason });
  await credit(ctx, job.requesterId, refund, "refund", `Refund: ${job.title}`, job._id);

  if (job.orderId) {
    const order = await ctx.db.get(job.orderId);
    const requester = await ctx.db.get(job.requesterId);
    if (order && requester && order.bonusCoinsEarned > 0) {
      await ctx.db.patch(requester._id, {
        bonusCoins: Math.max(0, requester.bonusCoins - order.bonusCoinsEarned),
      });
    }
  }
  await logActivity(ctx, job.requesterId, "request_cancelled", `Cancelled: ${job.title}`);
  if (job.partnerId) {
    await logActivity(ctx, job.partnerId, "delivery_cancelled", `Requester cancelled: ${job.title}`);
  }
}

/** Creates the job and holds the requester's payment for it. Used by orders and errands. */
export async function createJob(
  ctx: MutationCtx,
  fields: Omit<
    Job,
    "_id" | "_creationTime" | "status" | "otp" | "otpAttempts" | "partnerId" | "otpLockedUntil"
  >,
): Promise<Id<"deliveryRequests">> {
  const id = await ctx.db.insert("deliveryRequests", {
    ...fields,
    status: "open",
    otp: fourDigitCode(),
    otpAttempts: 0,
  });
  await ctx.scheduler.runAfter(fields.deadlineMinutes * MINUTE, internal.deliveries.expire, {
    id,
  });
  return id;
}

/* ───────────────────────────── requester actions ───────────────────────────── */

export const post = mutation({
  args: {
    title: v.string(),
    category,
    pickup: v.string(),
    dropHostel: v.string(),
    dropRoom: v.string(),
    items: v.array(v.string()),
    reward: v.number(),
    tip: v.number(),
    deadlineMinutes: v.number(),
    urgency,
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const title = text(args.title, "Description", 80);
    const reward = wholeRupees(args.reward, "Reward", 10, MAX_REWARD);
    const tip = wholeRupees(args.tip, "Tip", 0, MAX_TIP);
    const deadlineMinutes = wholeRupees(args.deadlineMinutes, "Deadline", 10, 240);
    if (args.items.length > 15) fail("Please list at most 15 items.");
    const items = args.items.map((i) => text(i, "Item", 60, false)).filter(Boolean);

    const id = await createJob(ctx, {
      requesterId: user._id,
      title,
      category: args.category,
      pickup: text(args.pickup, "Pickup location", 80),
      dropHostel: text(args.dropHostel, "Hostel or block", 40),
      dropRoom: text(args.dropRoom, "Room", 20),
      items: items.length ? items : [title],
      reward,
      tip,
      reimbursement: 0,
      deadlineMinutes,
      urgency: args.urgency,
    });
    await debit(ctx, user._id, reward + tip, "errand", `Errand: ${title}`, id);
    await logActivity(ctx, user._id, "errand_posted", `Posted: ${title}`);
    return id;
  },
});

export const cancel = mutation({
  args: { id: v.id("deliveryRequests") },
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx);
    const job = await loadJob(ctx, id);
    if (job.requesterId !== user._id) fail("Only the requester can cancel this.");
    if (job.status !== "open" && job.status !== "accepted") {
      fail(
        job.status === "cancelled"
          ? "This request is already cancelled."
          : "The carrier has already bought your items, so it can't be cancelled. Report an issue if something is wrong.",
      );
    }
    await cancelAndRefund(ctx, job, "Cancelled by requester");
  },
});

/** Scheduled when a job is created: refunds it if nobody took it in time. */
export const expire = internalMutation({
  args: { id: v.id("deliveryRequests") },
  handler: async (ctx, { id }) => {
    const job = await ctx.db.get(id);
    if (job && job.status === "open") {
      await cancelAndRefund(ctx, job, "No carrier accepted in time");
    }
  },
});

export const rate = mutation({
  args: { id: v.id("deliveryRequests"), stars: v.number() },
  handler: async (ctx, { id, stars }) => {
    const user = await requireUser(ctx);
    const job = await loadJob(ctx, id);
    if (job.requesterId !== user._id) fail("Only the requester can rate the delivery.");
    if (job.status !== "delivered" || !job.partnerId) fail("You can rate once it is delivered.");
    if (job.rating !== undefined) fail("You've already rated this delivery.");
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) fail("Choose between 1 and 5 stars.");

    const carrier = await ctx.db.get(job.partnerId);
    if (!carrier) return;
    const count = carrier.ratingCount + 1;
    const trustDelta = stars >= 4 ? 1 : stars <= 2 ? -5 : 0;
    await ctx.db.patch(job._id, { rating: stars });
    await ctx.db.patch(carrier._id, {
      rating: Math.round(((carrier.rating * carrier.ratingCount + stars) / count) * 10) / 10,
      ratingCount: count,
      trustScore: Math.max(0, Math.min(100, carrier.trustScore + trustDelta)),
    });
  },
});

/* ───────────────────────────── carrier actions ───────────────────────────── */

export const accept = mutation({
  args: { id: v.id("deliveryRequests") },
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx);
    const job = await loadJob(ctx, id);
    if (job.requesterId === user._id) fail("You can't accept your own request.");
    if (job.status !== "open") fail("Someone else has already taken this request.");
    if (Date.now() > expiresAt(job)) fail("This request has expired.");

    const mine = await ctx.db
      .query("deliveryRequests")
      .withIndex("by_partner", (q) => q.eq("partnerId", user._id))
      .order("desc")
      .take(50);
    if (mine.filter((j) => (ACTIVE as readonly string[]).includes(j.status)).length >= MAX_ACTIVE_JOBS) {
      fail(`Finish one of your ${MAX_ACTIVE_JOBS} active deliveries before taking another.`);
    }

    await ctx.db.patch(job._id, { status: "accepted", partnerId: user._id });
    await logActivity(ctx, user._id, "delivery_accepted", `Accepted: ${job.title}`, 10);
    await logActivity(ctx, job.requesterId, "request_accepted", `A carrier accepted: ${job.title}`);
  },
});

export const release = mutation({
  args: { id: v.id("deliveryRequests") },
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx);
    const job = await loadJob(ctx, id);
    if (job.partnerId !== user._id) fail("This isn't your delivery.");
    if (job.status !== "accepted") fail("You can only drop a delivery before buying the items.");
    await ctx.db.patch(job._id, { status: "open", partnerId: undefined });
  },
});

export const markPurchased = mutation({
  args: { id: v.id("deliveryRequests"), billStorageId: v.id("_storage") },
  handler: async (ctx, { id, billStorageId }) => {
    const user = await requireUser(ctx);
    const job = await loadJob(ctx, id);
    if (job.partnerId !== user._id) fail("This isn't your delivery.");
    if (job.status !== "accepted") fail("This delivery isn't waiting for a purchase.");
    await assertImageUpload(ctx, billStorageId);
    await ctx.db.patch(job._id, { status: "purchased", billStorageId });
  },
});

export const startDelivery = mutation({
  args: { id: v.id("deliveryRequests") },
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx);
    const job = await loadJob(ctx, id);
    if (job.partnerId !== user._id) fail("This isn't your delivery.");
    if (job.status !== "purchased") fail("Upload the bill before heading out.");
    await ctx.db.patch(job._id, { status: "out_for_delivery" });
  },
});

/**
 * Finishes a delivery when the requester's code is entered. A wrong code is
 * returned, not thrown, so the attempt counter survives the transaction.
 */
export const complete = mutation({
  args: { id: v.id("deliveryRequests"), otp: v.string() },
  handler: async (
    ctx,
    { id, otp },
  ): Promise<{ ok: true; earned: number } | { ok: false; message: string }> => {
    const user = await requireUser(ctx);
    const job = await loadJob(ctx, id);
    if (job.partnerId !== user._id) fail("This isn't your delivery.");
    if (job.status !== "out_for_delivery") fail("Mark the order as out for delivery first.");

    const now = Date.now();
    if (job.otpLockedUntil && job.otpLockedUntil > now) {
      const wait = Math.ceil((job.otpLockedUntil - now) / MINUTE);
      return { ok: false, message: `Too many wrong codes. Try again in ${wait} min.` };
    }
    if (otp.trim() !== job.otp) {
      const attempts = job.otpAttempts + 1;
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await ctx.db.patch(job._id, {
          otpAttempts: 0,
          otpLockedUntil: now + OTP_LOCK_MINUTES * MINUTE,
        });
        return {
          ok: false,
          message: `Too many wrong codes. Locked for ${OTP_LOCK_MINUTES} minutes.`,
        };
      }
      await ctx.db.patch(job._id, { otpAttempts: attempts });
      const left = OTP_MAX_ATTEMPTS - attempts;
      return { ok: false, message: `That code doesn't match. ${left} ${left === 1 ? "try" : "tries"} left.` };
    }

    await ctx.db.patch(job._id, { status: "delivered", deliveredAt: now, otpAttempts: 0 });

    const label = job.title.length > 40 ? `${job.title.slice(0, 37)}...` : job.title;
    await credit(ctx, user._id, job.reward, "delivery", `Delivery reward: ${label}`, job._id);
    if (job.tip > 0) await credit(ctx, user._id, job.tip, "tip", `Tip: ${label}`, job._id);
    if (job.reimbursement > 0) {
      await credit(ctx, user._id, job.reimbursement, "reimbursement", `Items bought: ${label}`, job._id);
    }

    const carrier = await ctx.db.get(user._id);
    if (carrier) {
      await ctx.db.patch(carrier._id, {
        deliveries: carrier.deliveries + 1,
        trustScore: Math.min(100, carrier.trustScore + 1),
      });
    }
    await logActivity(
      ctx,
      user._id,
      "delivery_completed",
      `Delivered: ${label} (earned ₹${job.reward + job.tip})`,
      job.reward,
    );
    await logActivity(ctx, job.requesterId, "request_delivered", `Delivered: ${label}`);
    return { ok: true, earned: job.reward + job.tip };
  },
});
