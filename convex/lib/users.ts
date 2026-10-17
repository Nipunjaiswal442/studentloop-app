import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/** The signed-in user, or a user-facing error. */
export async function requireUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Please sign in to continue.");
  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError("Your account could not be found. Please sign in again.");
  return user;
}

/** "Ananya S." — all other users ever see of someone's name. */
export function publicName(user: Pick<Doc<"users">, "firstName" | "lastName" | "name" | "email">) {
  const first = user.firstName || user.name?.split(/\s+/)[0] || user.email?.split("@")[0] || "Student";
  const initial = user.lastName ? ` ${user.lastName[0].toUpperCase()}.` : "";
  return `${first}${initial}`;
}
