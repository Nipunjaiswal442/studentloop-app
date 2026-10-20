import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import {
  CALLS_PER_DAY,
  CALLS_PER_MINUTE,
  LIST_TIMEOUT_MS,
  MAX_MESSAGE_CHARS,
  REPLIES,
  REQUEST_TIMEOUT_MS,
  baseUrl,
  buildMessages,
  classifyStatus,
  describeError,
  extractReply,
  formatAccountSummary,
  modelOrder,
  parseModelList,
  requestBody,
  type AccountSummary,
} from "./lib/assistant";
import { CARRIER_STAGE_LABEL, STAGE_LABEL } from "./lib/knowledge";
import { requireUser } from "./lib/users";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Per-isolate caches. Convex often reuses a module between calls, which saves
// a round trip per question; when it doesn't, nothing breaks.
const modelLists = new Map<string, { ids: string[] | null; until: number }>();
/** "<base> <model>" → when to try a model that answered 404 again. */
const missingUntil = new Map<string, number>();

/** Whether the assistant is switched on. Safe to call signed out. */
export const status = query({
  args: {},
  handler: async () => ({ available: Boolean(process.env.NVIDIA_API_KEY?.trim()) }),
});

/**
 * Throws when the caller has asked too much in the last minute or day.
 * Runs with the identity of the action that calls it.
 */
export const recordCall = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { _id: userId } = await requireUser(ctx);
    const now = Date.now();
    const today = await ctx.db
      .query("aiCalls")
      .withIndex("by_user", (q) => q.eq("userId", userId).gt("_creationTime", now - DAY))
      .take(CALLS_PER_DAY);
    if (today.filter((c) => c._creationTime > now - MINUTE).length >= CALLS_PER_MINUTE) {
      throw new ConvexError(REPLIES.tooFast);
    }
    if (today.length >= CALLS_PER_DAY) throw new ConvexError(REPLIES.dailyLimit);

    const stale = await ctx.db
      .query("aiCalls")
      .withIndex("by_user", (q) => q.eq("userId", userId).lt("_creationTime", now - DAY))
      .take(50);
    for (const row of stale) await ctx.db.delete(row._id);
    await ctx.db.insert("aiCalls", { userId });
  },
});

/**
 * What the assistant may know about the caller: their own balance and their
 * own active jobs. Nothing about the other people involved (names, rooms,
 * phones) and never a delivery code.
 */
export const accountSummary = internalQuery({
  args: {},
  handler: async (ctx): Promise<AccountSummary> => {
    const user = await requireUser(ctx);
    const now = Date.now();

    const mine = await ctx.db
      .query("deliveryRequests")
      .withIndex("by_requester", (q) => q.eq("requesterId", user._id))
      .order("desc")
      .take(50);
    const requests = mine
      .filter((job) => job.status !== "delivered" && job.status !== "cancelled")
      .map((job) => ({
        kind: job.orderId ? ("order" as const) : ("errand" as const),
        title: job.title,
        shop: job.orderId ? job.pickup : null,
        stage: STAGE_LABEL[job.status],
        minutesAgo: Math.max(0, Math.floor((now - job._creationTime) / MINUTE)),
        carrierAssigned: job.partnerId !== undefined,
        refundInMinutes:
          job.status === "open"
            ? Math.max(0, Math.ceil((job._creationTime + job.deadlineMinutes * MINUTE - now) / MINUTE))
            : null,
      }));

    const carrying = [];
    for (const stage of ["out_for_delivery", "purchased", "accepted"] as const) {
      const jobs = await ctx.db
        .query("deliveryRequests")
        .withIndex("by_partner_status", (q) => q.eq("partnerId", user._id).eq("status", stage))
        .take(10);
      for (const job of jobs) {
        carrying.push({
          kind: job.orderId ? ("order" as const) : ("errand" as const),
          title: job.title,
          stage: CARRIER_STAGE_LABEL[job.status],
        });
      }
    }

    return {
      firstName: user.firstName,
      walletBalance: user.walletBalance,
      bonusCoins: user.bonusCoins,
      requests,
      carrying,
    };
  },
});

/** Model ids the endpoint offers, or null when it won't say. Cached per isolate. */
async function listModels(base: string, apiKey: string): Promise<string[] | null> {
  const now = Date.now();
  const cached = modelLists.get(base);
  if (cached && cached.until > now) return cached.ids;

  let ids: string[] | null = null;
  try {
    const res = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(LIST_TIMEOUT_MS),
    });
    if (res.ok) ids = parseModelList(await res.json());
    else console.warn(`NVIDIA model list answered HTTP ${res.status}`);
  } catch (e) {
    console.warn(`NVIDIA model list failed: ${describeError(e)}`);
  }
  // A failed listing is retried sooner than a good one is refreshed.
  modelLists.set(base, { ids, until: now + (ids ? HOUR : 5 * MINUTE) });
  return ids;
}

export const ask = action({
  args: {
    message: v.string(),
    history: v.array(
      v.object({ role: v.union(v.literal("user"), v.literal("assistant")), text: v.string() }),
    ),
  },
  handler: async (ctx, args): Promise<{ reply: string }> => {
    if (!(await ctx.auth.getUserIdentity())) throw new ConvexError("Please sign in to continue.");

    const apiKey = process.env.NVIDIA_API_KEY?.trim();
    if (!apiKey) throw new ConvexError(REPLIES.notConfigured);
    const message = args.message.trim();
    if (!message || message.length > MAX_MESSAGE_CHARS) throw new ConvexError(REPLIES.badLength);

    await ctx.runMutation(internal.help.recordCall, {});
    const base = baseUrl(process.env.NVIDIA_BASE_URL);
    const [account, listed] = await Promise.all([
      ctx.runQuery(internal.help.accountSummary, {}),
      listModels(base, apiKey),
    ]);
    const messages = buildMessages({ summary: formatAccountSummary(account), history: args.history, message });
    const now = Date.now();
    const skip = new Set<string>();
    for (const [key, until] of missingUntil) {
      if (until < now) missingUntil.delete(key);
      else if (key.startsWith(`${base} `)) skip.add(key.slice(base.length + 1));
    }
    const models = modelOrder({ configured: process.env.NVIDIA_MODEL, listed, skip });

    for (const model of models) {
      let res: Response;
      try {
        res = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(requestBody(model, messages)),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (e) {
        console.warn(`NVIDIA model ${model} failed: ${describeError(e)}`);
        continue;
      }

      if (!res.ok) {
        console.warn(`NVIDIA model ${model} answered HTTP ${res.status}`);
        const outcome = classifyStatus(res.status);
        if (outcome === "auth") {
          console.warn("NVIDIA rejected the API key");
          throw new ConvexError(REPLIES.misconfigured);
        }
        if (outcome === "busy") throw new ConvexError(REPLIES.busy);
        if (res.status === 404) missingUntil.set(`${base} ${model}`, Date.now() + HOUR);
        continue;
      }

      let reply = "";
      try {
        reply = extractReply(await res.json());
      } catch (e) {
        console.warn(`NVIDIA model ${model} sent an unreadable answer: ${describeError(e)}`);
        continue;
      }
      if (reply) return { reply };
      console.warn(`NVIDIA model ${model} sent an empty answer`);
    }
    throw new ConvexError(REPLIES.unavailable);
  },
});
