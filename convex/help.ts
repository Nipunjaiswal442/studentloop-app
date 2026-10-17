import { getAuthSessionId, getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation } from "./_generated/server";

const MODELS = ["qwen/qwen2.5-72b-instruct", "meta/llama-3.1-8b-instruct"];
const CALLS_PER_MINUTE = 8;

const SYSTEM_PROMPT = `You are the StudentLoop help assistant. StudentLoop is a peer-to-peer campus delivery app: students order from campus shops or post errands, and other students on campus carry them out for a fee.

Facts about the app:
- New accounts get a ₹500 welcome bonus in their wallet.
- Wallet top-ups are capped; every order and errand is paid from the wallet.
- A shop order costs the items, a flat ₹30 carrier fee and an optional tip. That money is held until delivery. The carrier gets the fee, the tip and the item cost back.
- Customers earn bonus coins worth 5% of the item subtotal. Coins are promotional and cannot be cashed out.
- A request that nobody accepts in time is cancelled and refunded automatically. The requester can also cancel before the carrier has bought the items.
- Each order has a 4-digit delivery code shown only to the requester. Share it with the carrier only when the items arrive; the carrier enters it to finish the delivery.
- Carriers upload the purchase bill, then head out. They can hold at most 3 active deliveries.
- Issues are reported from the order page. Photos can be attached.
- Password resets are not self-service yet; users should contact support@studentloop.com.

Help with questions about the app and basic safety on campus, including spotting scams such as fake requests or people asking for the delivery code early. Keep answers under 3 sentences unless asked for more. If you don't know something, say so.`;

/** Throws when the user has made too many assistant calls in the last minute. */
export const recordCall = internalMutation({
  args: { userId: v.id("users"), sessionId: v.id("authSessions") },
  handler: async (ctx, { userId, sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new ConvexError("Your session has ended. Please sign in again.");
    }
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const minuteAgo = Date.now() - 60 * 1000;
    const recent = await ctx.db
      .query("aiCalls")
      .withIndex("by_user", (q) => q.eq("userId", userId).gt("_creationTime", hourAgo))
      .collect();
    if (recent.filter((c) => c._creationTime > minuteAgo).length >= CALLS_PER_MINUTE) {
      throw new ConvexError("You're sending messages too quickly. Wait a moment and try again.");
    }
    const stale = await ctx.db
      .query("aiCalls")
      .withIndex("by_user", (q) => q.eq("userId", userId).lt("_creationTime", hourAgo))
      .take(50);
    for (const row of stale) await ctx.db.delete(row._id);
    await ctx.db.insert("aiCalls", { userId });
  },
});

export const ask = action({
  args: {
    message: v.string(),
    history: v.array(
      v.object({ role: v.union(v.literal("user"), v.literal("assistant")), text: v.string() }),
    ),
  },
  handler: async (ctx, args): Promise<{ reply: string }> => {
    const userId = await getAuthUserId(ctx);
    const sessionId = await getAuthSessionId(ctx);
    if (!userId || !sessionId) throw new ConvexError("Please sign in to continue.");

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      throw new ConvexError("The assistant isn't set up yet. The FAQ topics above still work.");
    }
    const message = args.message.trim();
    if (!message || message.length > 500) {
      throw new ConvexError("Messages must be between 1 and 500 characters.");
    }
    await ctx.runMutation(internal.help.recordCall, { userId, sessionId });

    const history = args.history.slice(-6).map((m) => ({
      role: m.role,
      content: m.text.slice(0, 1000),
    }));

    for (const model of MODELS) {
      try {
        const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...history,
              { role: "user", content: message },
            ],
            max_tokens: 512,
            temperature: 0.6,
            top_p: 0.95,
            stream: false,
          }),
          signal: AbortSignal.timeout(25_000),
        });
        if (!res.ok) continue;
        const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const reply = body.choices?.[0]?.message?.content?.trim();
        if (reply) return { reply };
      } catch {
        // Try the next model.
      }
    }
    throw new ConvexError("The assistant is unavailable right now. Please try the FAQ topics.");
  },
});
