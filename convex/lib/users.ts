import type { UserIdentity } from "convex/server";
import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

function byToken(ctx: QueryCtx | MutationCtx, identity: UserIdentity) {
  return ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

/** The account linked to the caller's Firebase identity, or null. */
export async function currentUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity ? await byToken(ctx, identity) : null;
}

/**
 * The Firebase claims we use. With a customJwt provider Convex passes claims
 * through under their JWT names (`email_verified`, `picture`), not the
 * camel-cased OIDC fields, so read them directly.
 */
export function firebaseClaims(identity: UserIdentity) {
  return {
    email: typeof identity.email === "string" ? identity.email.trim().toLowerCase() || undefined : undefined,
    emailVerified: identity.email_verified === true,
    name: typeof identity.name === "string" ? identity.name.trim() : "",
    picture: typeof identity.picture === "string" ? identity.picture : undefined,
  };
}

/** The signed-in user, or a user-facing error. */
export async function requireUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Please sign in to continue.");
  const user = await byToken(ctx, identity);
  if (!user) throw new ConvexError("Your account is still being set up. Please reload the page.");
  return user;
}

/** "Ananya S." — all other users ever see of someone's name. */
export function publicName(user: Pick<Doc<"users">, "firstName" | "lastName" | "name" | "email">) {
  const first = user.firstName || user.name?.split(/\s+/)[0] || user.email?.split("@")[0] || "Student";
  const initial = user.lastName ? ` ${user.lastName[0].toUpperCase()}.` : "";
  return `${first}${initial}`;
}

/** Splits "Ananya Sharma Rao" into first name and the rest. */
export function splitName(full: string) {
  const [firstName = "", ...rest] = full.trim().split(/\s+/).filter(Boolean);
  return { firstName: firstName.slice(0, 40), lastName: rest.join(" ").slice(0, 40) };
}
