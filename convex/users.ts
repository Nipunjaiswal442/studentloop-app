import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/users";
import { fail, text } from "./lib/validate";

/** The signed-in user's own profile, or null when signed out. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    try {
      const user = await requireUser(ctx);
      const { _id, email, firstName, lastName, mobile, hostelBlock, roomNumber } = user;
      return {
        id: _id,
        email: email ?? "",
        firstName,
        lastName,
        mobile,
        hostelBlock,
        roomNumber,
        walletBalance: user.walletBalance,
        bonusCoins: user.bonusCoins,
        points: user.points,
        deliveries: user.deliveries,
        trustScore: user.trustScore,
        rating: user.rating,
        ratingCount: user.ratingCount,
        termsAccepted: user.termsAcceptedAt !== undefined,
      };
    } catch {
      return null;
    }
  },
});

/** Which sign-in options this deployment has configured. Safe to call signed out. */
export const signInOptions = query({
  args: {},
  handler: async () => ({
    google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  }),
});

export const updateProfile = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    mobile: v.string(),
    hostelBlock: v.string(),
    roomNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const mobile = args.mobile.trim();
    if (mobile && !/^[+\d][\d\s-]{6,17}$/.test(mobile)) fail("Enter a valid mobile number.");
    const firstName = text(args.firstName, "First name", 40);
    await ctx.db.patch(user._id, {
      firstName,
      lastName: text(args.lastName, "Last name", 40, false),
      mobile,
      hostelBlock: text(args.hostelBlock, "Hostel block", 40, false),
      roomNumber: text(args.roomNumber, "Room number", 20, false),
    });
  },
});

export const acceptTerms = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (user.termsAcceptedAt === undefined) {
      await ctx.db.patch(user._id, { termsAcceptedAt: Date.now() });
    }
  },
});

export const recentActivity = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const rows = await ctx.db
      .query("activity")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(15);
    return rows.map((r) => ({
      id: r._id,
      details: r.details,
      points: r.points,
      at: r._creationTime,
    }));
  },
});
