import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { MAX_UPLOAD_BYTES } from "./constants";
import { fail } from "./validate";

/** Reject anything that is not a reasonably sized image, and delete it. */
export async function assertImageUpload(ctx: MutationCtx, storageId: Id<"_storage">) {
  const meta = await ctx.db.system.get(storageId);
  if (!meta) fail("Upload not found. Please try again.");
  if (!meta.contentType?.startsWith("image/") || meta.size > MAX_UPLOAD_BYTES) {
    await ctx.storage.delete(storageId);
    fail("Please upload an image smaller than 5 MB.");
  }
}
