import { invalidateSessions, modifyAccountCredentials, retrieveAccount } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";

/**
 * Owner tools for account recovery. These are internal: browsers cannot call
 * them, only someone running the Convex CLI with deployment access can.
 *
 *   npx convex run --prod admin:clearSignInLockout '{"email":"a@b.com"}'
 *   npx convex run --prod admin:resetPassword '{"email":"a@b.com","password":"a-new-password"}'
 */

export const clearSignInLockout = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email.trim().toLowerCase()),
      )
      .unique();
    if (!account) return "No password account for that email.";
    const limit = await ctx.db
      .query("authRateLimits")
      .withIndex("identifier", (q) => q.eq("identifier", account._id))
      .unique();
    if (limit) await ctx.db.delete(limit._id);
    return limit ? "Lockout cleared." : "That account was not locked out.";
  },
});

export const resetPassword = internalAction({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    if (password.length < 8 || password.length > 128) {
      throw new ConvexError("Password must be 8 to 128 characters long.");
    }
    const id = email.trim().toLowerCase();
    const found = await retrieveAccount(ctx, { provider: "password", account: { id } });
    await modifyAccountCredentials(ctx, { provider: "password", account: { id, secret: password } });
    await invalidateSessions(ctx, { userId: found.user._id });
    await ctx.runMutation(internal.admin.clearSignInLockout, { email: id });
    return "Password reset. All existing sessions for that account were ended.";
  },
});
