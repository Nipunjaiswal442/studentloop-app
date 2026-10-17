import { mutation } from "./_generated/server";
import { requireUser } from "./lib/users";

/** Short-lived URL the browser uploads a bill or evidence photo to. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
