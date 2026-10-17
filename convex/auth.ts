import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { SIGNUP_POINTS, WELCOME_BONUS } from "./lib/constants";

const PasswordProvider = Password({
  profile(params) {
    const profile: { email: string; name?: string } = {
      email: String(params.email ?? "").trim().toLowerCase(),
    };
    if (typeof params.name === "string" && params.name.trim()) profile.name = params.name.trim();
    return profile;
  },
  validatePasswordRequirements(password: string) {
    if (password.length < 8 || password.length > 128) {
      throw new ConvexError("Password must be 8 to 128 characters long.");
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google, PasswordProvider],
  callbacks: {
    async createOrUpdateUser(authCtx, args) {
      if (args.existingUserId) return args.existingUserId;
      // The auth library hands over an untyped context; ours knows the schema.
      const ctx = authCtx as unknown as MutationCtx;

      const email =
        typeof args.profile.email === "string" ? args.profile.email.trim().toLowerCase() : "";
      if (!email) throw new ConvexError("An email address is required.");

      // Accounts are never merged by email: that would let someone who
      // pre-registers an address with a password take over the same address
      // when its owner later signs in with Google.
      const clash = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .first();
      if (clash) {
        throw new ConvexError(
          "An account with this email already exists. Sign in the way you first did.",
        );
      }

      const name = typeof args.profile.name === "string" ? args.profile.name.trim() : "";
      const [firstName = "", ...rest] = name.split(/\s+/).filter(Boolean);

      const userId = await ctx.db.insert("users", {
        email,
        name: name || undefined,
        image: typeof args.profile.image === "string" ? args.profile.image : undefined,
        firstName,
        lastName: rest.join(" "),
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
  },
});
