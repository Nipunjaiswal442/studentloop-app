import { describe, expect, it, vi } from "vitest";
import type { Id } from "../convex/_generated/dataModel";
import type { MutationCtx } from "../convex/_generated/server";
import { MAX_UPLOAD_BYTES } from "../convex/lib/constants";
import { assertImageUpload } from "../convex/lib/uploads";

function stubCtx(meta: { contentType?: string; size: number } | null) {
  const remove = vi.fn();
  const ctx = {
    db: { system: { get: async () => meta } },
    storage: { delete: remove },
  } as unknown as MutationCtx;
  return { ctx, remove };
}
const id = "storage-id" as Id<"_storage">;

describe("assertImageUpload", () => {
  it("accepts a normal image", async () => {
    const { ctx, remove } = stubCtx({ contentType: "image/jpeg", size: 200_000 });
    await expect(assertImageUpload(ctx, id)).resolves.toBeUndefined();
    expect(remove).not.toHaveBeenCalled();
  });

  it.each([
    ["a non-image", { contentType: "text/html", size: 100 }],
    ["an upload with no content type", { size: 100 }],
    ["an oversized image", { contentType: "image/png", size: MAX_UPLOAD_BYTES + 1 }],
  ])("rejects %s and deletes it", async (_name, meta) => {
    const { ctx, remove } = stubCtx(meta);
    await expect(assertImageUpload(ctx, id)).rejects.toThrow(/image smaller than 5 MB/);
    expect(remove).toHaveBeenCalledWith(id);
  });

  it("rejects a missing upload", async () => {
    const { ctx } = stubCtx(null);
    await expect(assertImageUpload(ctx, id)).rejects.toThrow(/not found/);
  });
});
