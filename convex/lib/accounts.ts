import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { SIGNUP_POINTS, WELCOME_BONUS } from "./constants";

type Profile = {
  email?: unknown;
  name?: unknown;
  image?: unknown;
  /** Set only by providers that have proven the address belongs to the person. */
  emailVerified?: unknown;
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/**
 * Decides which user a new sign-in belongs to. Called by Convex Auth whenever a
 * brand-new account (not a returning one) is created.
 *
 * - A password sign-up never joins an existing user. Otherwise anyone could
 *   attach a password to an address and keep access after its owner arrives.
 * - A Google sign-in (email verified by Google) may adopt an existing user with
 *   that email. Their unverified password is removed and their sessions are
 *   ended, so someone who pre-registered the address loses access. This is the
 *   same rule Firebase itself applies to unverified email/password accounts.
 */
export async function createOrUpdateUserImpl(
  ctx: MutationCtx,
  args: { existingUserId: Id<"users"> | null; provider: string; profile: Profile },
): Promise<Id<"users">> {
  if (args.existingUserId) return args.existingUserId;

  const email = str(args.profile.email)?.toLowerCase();
  if (!email) throw new ConvexError("An email address is required.");

  const matches = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .take(2);
  if (matches.length > 1) {
    throw new ConvexError("This email is attached to more than one account. Please contact support.");
  }
  const existing = matches[0];

  if (existing) {
    if (args.provider === "firebase" && args.profile.emailVerified === true) {
      return await adoptExistingUser(ctx, existing, args.profile);
    }
    const viaGoogle = await firstAccount(ctx, existing._id, "firebase");
    throw new ConvexError(
      viaGoogle
        ? "This email is already registered with Google. Choose Continue with Google to sign in."
        : "An account with this email already exists. Try signing in instead.",
    );
  }

  return await createUser(ctx, email, args.profile);
}

async function firstAccount(ctx: MutationCtx, userId: Id<"users">, provider: string) {
  return await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) => q.eq("userId", userId).eq("provider", provider))
    .first();
}

async function createUser(ctx: MutationCtx, email: string, profile: Profile) {
  const name = str(profile.name) ?? "";
  const [firstName = "", ...rest] = name.split(/\s+/).filter(Boolean);

  const userId = await ctx.db.insert("users", {
    email,
    name: name || undefined,
    image: str(profile.image),
    ...(profile.emailVerified === true ? { emailVerificationTime: Date.now() } : {}),
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
}

async function adoptExistingUser(ctx: MutationCtx, user: Doc<"users">, profile: Profile) {
  if (await firstAccount(ctx, user._id, "firebase")) {
    // Same address, but a different Google account than the one already linked.
    throw new ConvexError("This email is already linked to a different Google account.");
  }

  // Whoever set the old password never proved they own the address.
  const passwords = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id).eq("provider", "password"))
    .collect();
  for (const account of passwords) await ctx.db.delete(account._id);

  const sessions = await ctx.db
    .query("authSessions")
    .withIndex("userId", (q) => q.eq("userId", user._id))
    .collect();
  for (const session of sessions) {
    const tokens = await ctx.db
      .query("authRefreshTokens")
      .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
      .collect();
    for (const token of tokens) await ctx.db.delete(token._id);
    await ctx.db.delete(session._id);
  }

  const name = str(profile.name);
  const [firstName = "", ...rest] = (name ?? "").split(/\s+/).filter(Boolean);
  await ctx.db.patch(user._id, {
    emailVerificationTime: user.emailVerificationTime ?? Date.now(),
    ...(!user.name && name ? { name } : {}),
    ...(!user.image && str(profile.image) ? { image: str(profile.image) } : {}),
    ...(!user.firstName && firstName ? { firstName, lastName: user.lastName || rest.join(" ") } : {}),
  });
  await ctx.db.insert("activity", {
    userId: user._id,
    action: "google_linked",
    details:
      passwords.length > 0
        ? "Google sign-in linked. Your old password was removed."
        : "Google sign-in linked to your account.",
    points: 0,
  });
  return user._id;
}
