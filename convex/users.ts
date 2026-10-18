import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { SIGNUP_POINTS, WELCOME_BONUS } from "./lib/constants";
import { currentUser, firebaseClaims, requireUser, splitName } from "./lib/users";
import { fail, text } from "./lib/validate";

/**
 * Links the signed-in Firebase identity to a StudentLoop account, creating
 * the account (with its welcome bonus) the first time. Safe to call on every
 * app load. `name` is what the person typed when signing up: Firebase's first
 * token for a new account is minted before the display name is saved.
 */
export const ensure = mutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) fail("Please sign in to continue.");
    const claims = firebaseClaims(identity);
    const email = claims.email;
    const name = (claims.name || args.name || "").trim().slice(0, 80);

    const existing = await currentUser(ctx);
    if (existing) {
      const patch: { email?: string; firstName?: string; lastName?: string } = {};
      if (email && existing.email !== email) patch.email = email;
      if (!existing.firstName && name) Object.assign(patch, splitName(name));
      if (Object.keys(patch).length) await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    // Accounts from the previous sign-in system have no Firebase identity yet.
    // Hand one over only when Firebase has verified the email, so nobody can
    // claim someone else's account just by typing their address.
    if (email && claims.emailVerified) {
      const legacy = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .filter((q) => q.eq(q.field("tokenIdentifier"), undefined))
        .first();
      if (legacy) {
        // Whoever registered the address back then may not have owned it, so
        // the owner keeps the wallet and history but not what they typed in.
        await ctx.db.patch(legacy._id, {
          tokenIdentifier: identity.tokenIdentifier,
          ...(name ? splitName(name) : {}),
          mobile: "",
          hostelBlock: "",
          roomNumber: "",
          termsAcceptedAt: undefined,
        });
        return legacy._id;
      }
    }

    const userId = await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      email,
      name: name || undefined,
      image: claims.picture,
      ...splitName(name),
      mobile: "",
      hostelBlock: "",
      roomNumber: "",
      walletBalance: WELCOME_BONUS,
      bonusCoins: 0,
      points: SIGNUP_POINTS,
      deliveries: 0,
      trustScore: 80,
      rating: 0,
      ratingCount: 0,
    });
    await ctx.db.insert("transactions", {
      userId,
      type: "credit",
      kind: "welcome",
      amount: WELCOME_BONUS,
      description: "Welcome bonus",
    });
    await ctx.db.insert("activity", {
      userId,
      action: "account_created",
      details: "Joined StudentLoop",
      points: SIGNUP_POINTS,
    });
    return userId;
  },
});

/** The signed-in user's own profile, or null when signed out or not set up yet. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return null;
    return {
      id: user._id,
      email: user.email ?? "",
      firstName: user.firstName,
      lastName: user.lastName,
      mobile: user.mobile,
      hostelBlock: user.hostelBlock,
      roomNumber: user.roomNumber,
      walletBalance: user.walletBalance,
      bonusCoins: user.bonusCoins,
      points: user.points,
      deliveries: user.deliveries,
      trustScore: user.trustScore,
      rating: user.rating,
      ratingCount: user.ratingCount,
      termsAccepted: user.termsAcceptedAt !== undefined,
    };
  },
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
    await ctx.db.patch(user._id, {
      firstName: text(args.firstName, "First name", 40),
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
