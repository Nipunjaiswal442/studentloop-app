import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { ISSUE_TYPES } from "./lib/constants";
import { logActivity } from "./lib/ledger";
import { assertImageUpload } from "./lib/uploads";
import { requireUser } from "./lib/users";
import { fail, text } from "./lib/validate";

export const create = mutation({
  args: {
    deliveryRequestId: v.id("deliveryRequests"),
    issueType: v.string(),
    description: v.string(),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const job = await ctx.db.get(args.deliveryRequestId);
    if (!job || job.requesterId !== user._id) fail("We couldn't find that order.");
    if (job.status === "open" || job.status === "cancelled") {
      fail("You can report an issue once a carrier has taken the order.");
    }
    if (!(ISSUE_TYPES as readonly string[]).includes(args.issueType)) fail("Choose an issue type.");

    const existing = await ctx.db
      .query("disputes")
      .withIndex("by_request", (q) => q.eq("deliveryRequestId", job._id))
      .first();
    if (existing) fail("You've already reported an issue for this order.");

    if (args.photoStorageId) await assertImageUpload(ctx, args.photoStorageId);
    await ctx.db.insert("disputes", {
      userId: user._id,
      deliveryRequestId: job._id,
      issueType: args.issueType,
      description: text(args.description, "Description", 500, false),
      photoStorageId: args.photoStorageId,
      status: "open",
    });
    await logActivity(ctx, user._id, "dispute_filed", `Reported: ${args.issueType}`);
  },
});
