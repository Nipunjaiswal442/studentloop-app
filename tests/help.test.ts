import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import {
  CALLS_PER_DAY,
  MAX_ATTEMPTS,
  MAX_HISTORY_TURNS,
  MAX_TURN_CHARS,
  PREFERRED_MODELS,
  SYSTEM_PROMPT,
  baseUrl,
  buildMessages,
  classifyStatus,
  cleanReply,
  extractReply,
  formatAccountSummary,
  looksLikeChatModel,
  modelOrder,
  parseModelList,
  type AccountSummary,
} from "../convex/lib/assistant";
import {
  BONUS_COIN_RATE,
  DELIVERY_FEE,
  MAX_ACTIVE_JOBS,
  MAX_REWARD,
  MAX_TIP,
  ORDER_WINDOW_MINUTES,
  OTP_LOCK_MINUTES,
  OTP_MAX_ATTEMPTS,
  TOPUP_DAILY_MAX,
  TOPUP_MAX,
  TOPUP_MIN,
  WELCOME_BONUS,
} from "../convex/lib/constants";
import { FAQ, TERMS, rupees } from "../convex/lib/knowledge";

/* ───────────── Pure logic ───────────── */

describe("model order", () => {
  const [first, second, third, fourth] = PREFERRED_MODELS;

  it("uses the preference list when the model listing failed", () => {
    expect(modelOrder({ listed: null })).toEqual([first, second, third]);
  });

  it("puts NVIDIA_MODEL first, without duplicates", () => {
    expect(modelOrder({ configured: " acme/custom-chat ", listed: null })).toEqual(["acme/custom-chat", first, second]);
    expect(modelOrder({ configured: second, listed: null })).toEqual([second, first, third]);
  });

  it("tries listed preferred models first, then other listed chat models", () => {
    const listed = ["nvidia/nv-embedqa-e5-v5", "mistralai/mistral-large-2-instruct", fourth, second];
    expect(modelOrder({ listed })).toEqual([second, fourth, "mistralai/mistral-large-2-instruct"]);
  });

  it("keeps NVIDIA_MODEL first even when the listing doesn't mention it", () => {
    expect(modelOrder({ configured: "acme/custom-chat", listed: [third] })).toEqual(["acme/custom-chat", third]);
  });

  it("falls back to the preference list when nothing listed is a chat model", () => {
    expect(modelOrder({ listed: ["nvidia/nv-embed-v1", "nvidia/llama-3.1-nemoguard-8b-content-safety"] })).toEqual([
      first,
      second,
      third,
    ]);
  });

  it("skips models that recently went missing, unless nothing else is left", () => {
    expect(modelOrder({ listed: null, skip: new Set([first]) })).toEqual([second, third, fourth]);
    expect(modelOrder({ listed: [first], skip: new Set([first]) })).toEqual([first]);
  });

  it("never plans more than the attempt limit", () => {
    const listed = Array.from({ length: 10 }, (_, i) => `vendor/model-${i}-instruct`);
    expect(modelOrder({ configured: "a/b", listed })).toHaveLength(MAX_ATTEMPTS);
  });

  it("tells chat models from the rest", () => {
    expect(looksLikeChatModel("meta/llama-3.3-70b-instruct")).toBe(true);
    expect(looksLikeChatModel("google/gemma-2-27b-it")).toBe(true);
    expect(looksLikeChatModel("qwen/qwen3.5-122b-a10b")).toBe(true);
    expect(looksLikeChatModel("nvidia/llama-3.2-nv-embedqa-1b-v2")).toBe(false);
    expect(looksLikeChatModel("nvidia/llama-3.2-nv-rerankqa-1b-v2")).toBe(false);
    expect(looksLikeChatModel("meta/llama-guard-4-12b")).toBe(false);
  });

  it("reads an OpenAI-style model listing", () => {
    expect(parseModelList({ data: [{ id: "a/b" }, { id: 3 }, {}, { id: "c/d" }] })).toEqual(["a/b", "c/d"]);
    expect(parseModelList({ data: [] })).toBeNull();
    expect(parseModelList({ error: "nope" })).toBeNull();
    expect(parseModelList(null)).toBeNull();
  });

  it("normalises the endpoint", () => {
    expect(baseUrl(undefined)).toBe("https://integrate.api.nvidia.com/v1");
    expect(baseUrl("  ")).toBe("https://integrate.api.nvidia.com/v1");
    expect(baseUrl("not a url")).toBe("https://integrate.api.nvidia.com/v1");
    expect(baseUrl("http://127.0.0.1:8988/v1/ ")).toBe("http://127.0.0.1:8988/v1");
  });
});

describe("errors", () => {
  it.each([
    [401, "auth"],
    [403, "auth"],
    [429, "busy"],
    [400, "next"],
    [404, "next"],
    [422, "next"],
    [500, "next"],
    [503, "next"],
  ] as const)("HTTP %i means %s", (status, outcome) => {
    expect(classifyStatus(status)).toBe(outcome);
  });
});

describe("reply cleanup", () => {
  it("removes reasoning blocks", () => {
    expect(cleanReply("<think>\nThe user wants...\n</think>\n\nTap **Wallet**.")).toBe("Tap **Wallet**.");
    expect(cleanReply("<THINK>a</THINK>One<think>b</think> two")).toBe("One two");
  });

  it("treats a reply cut off while thinking as empty", () => {
    expect(cleanReply("<think>Let me work out the fee")).toBe("");
    expect(cleanReply("  <think>never closed\n\nstill thinking")).toBe("");
  });

  it("drops reasoning when only the closing tag was sent", () => {
    expect(cleanReply("they asked about refunds.</think>Refunds go to your wallet.")).toBe(
      "Refunds go to your wallet.",
    );
  });

  it("copes with odd content", () => {
    expect(cleanReply(undefined)).toBe("");
    expect(cleanReply(null)).toBe("");
    expect(cleanReply([{ type: "text", text: "Hello " }, { type: "text", text: "there" }])).toBe("Hello there");
  });

  it("ignores reasoning_content", () => {
    const body = { choices: [{ message: { content: null, reasoning_content: "secret plan" } }] };
    expect(extractReply(body)).toBe("");
    expect(extractReply({ choices: [{ message: { content: " Hi! ", reasoning_content: "x" } }] })).toBe("Hi!");
    expect(extractReply({})).toBe("");
  });
});

describe("system prompt and knowledge", () => {
  it("states the app's numbers from the shared constants", () => {
    for (const fact of [
      rupees(DELIVERY_FEE),
      rupees(WELCOME_BONUS),
      rupees(MAX_REWARD),
      rupees(MAX_TIP),
      rupees(TOPUP_MIN),
      rupees(TOPUP_MAX),
      rupees(TOPUP_DAILY_MAX),
      `${Math.round(BONUS_COIN_RATE * 100)}%`,
      `up to ${MAX_ACTIVE_JOBS} active deliveries`,
      `After ${OTP_MAX_ATTEMPTS} wrong codes`,
      `locked for ${OTP_LOCK_MINUTES} minutes`,
      `within ${ORDER_WINDOW_MINUTES / 60} hour`,
    ]) {
      expect(SYSTEM_PROMPT).toContain(fact);
    }
    expect(rupees(10000)).toBe("₹10,000");
  });

  it("sets the ground rules", () => {
    expect(SYSTEM_PROMPT).toMatch(/Only help with StudentLoop/);
    expect(SYSTEM_PROMPT).toMatch(/at most 5 sentences/);
    expect(SYSTEM_PROMPT).toMatch(/Never ask for, guess or reveal a password or a delivery code/);
    expect(SYSTEM_PROMPT).toMatch(/Never invent features, prices/);
    expect(SYSTEM_PROMPT).toMatch(/can't take actions/);
    expect(SYSTEM_PROMPT).toMatch(/support@studentloop\.com/);
    expect(SYSTEM_PROMPT).toMatch(/language the person writes in/);
  });

  it("covers every screen", () => {
    for (const screen of ["## Shop", "## Cart", "## Orders", "## Deliver", "## Post an errand", "## Wallet", "## Profile", "## Help", "## Signing in"]) {
      expect(SYSTEM_PROMPT).toContain(screen);
    }
    for (const detail of ["Forgot password?", "Continue with Google", "check spam", "Add to Home Screen", "dark mode", "Order again", "Report an issue", "Drop this delivery"]) {
      expect(SYSTEM_PROMPT).toContain(detail);
    }
  });

  it("keeps the FAQ and terms in step with the constants", () => {
    const faq = JSON.stringify(FAQ);
    expect(faq).toContain(`${rupees(WELCOME_BONUS)} welcome bonus`);
    expect(faq).toContain(`Up to ${MAX_ACTIVE_JOBS} at a time`);
    expect(TERMS).toMatch(/processed by NVIDIA/);
  });
});

describe("chat request", () => {
  const summary = "# About the person\n- First name: Alice";

  it("sends the prompt and summary, recent turns and the question", () => {
    const history = Array.from({ length: 12 }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      text: `turn ${i} ${"x".repeat(1500)}`,
    }));
    const messages = buildMessages({ summary, history, message: "What now?", model: "meta/llama-3.3-70b-instruct" });

    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain(SYSTEM_PROMPT);
    expect(messages[0].content).toContain(summary);
    expect(messages[0].content).not.toContain("/no_think");
    expect(messages.slice(1, -1)).toHaveLength(MAX_HISTORY_TURNS);
    expect(messages[1].content.startsWith("turn 4 ")).toBe(true);
    expect(messages.slice(1, -1).every((m) => m.content.length <= MAX_TURN_CHARS)).toBe(true);
    expect(messages.at(-1)).toEqual({ role: "user", content: "What now?" });
  });

  it("keeps turns alternating", () => {
    const messages = buildMessages({
      summary,
      history: [
        { role: "assistant", text: "Hello!" },
        { role: "user", text: "first try" },
        { role: "user", text: "second try" },
        { role: "assistant", text: "An answer" },
        { role: "user", text: "lost question" },
      ],
      message: "New question",
    });
    expect(messages.slice(1).map((m) => `${m.role}:${m.content}`)).toEqual([
      "user:second try",
      "assistant:An answer",
      "user:New question",
    ]);
  });

  it("asks Qwen 3 models not to think out loud", () => {
    const messages = buildMessages({ summary, history: [], message: "Hi", model: "qwen/qwen3.5-122b-a10b" });
    expect(messages[0].content.endsWith("/no_think")).toBe(true);
  });

  it("formats the account summary", () => {
    const s: AccountSummary = {
      firstName: "Alice",
      walletBalance: 1720,
      bonusCoins: 13,
      requests: [
        {
          kind: "order",
          title: "Biryani + Tea",
          shop: "Canteen",
          stage: "Waiting for a carrier",
          minutesAgo: 75,
          carrierAssigned: false,
          refundInMinutes: 45,
        },
      ],
      carrying: [{ kind: "errand", title: "Print notes", stage: "Accepted: buy the items and upload the bill next" }],
    };
    const text = formatAccountSummary(s);
    expect(text).toContain("First name: Alice");
    expect(text).toContain("₹1,720");
    expect(text).toContain('Shop order "Biryani + Tea" from Canteen: Waiting for a carrier. Placed 1 h 15 min ago. No carrier yet.');
    expect(text).toContain("next 45 min");
    expect(text).toContain('Errand "Print notes": Accepted');

    const fresh = { ...s.requests[0], minutesAgo: 0, refundInMinutes: 0 };
    const late = formatAccountSummary({ ...s, requests: [fresh], carrying: [] });
    expect(late).toContain("Placed just now.");
    expect(late).toContain("being cancelled and refunded now");
    expect(late).toContain("Deliveries they are carrying for others: none.");
  });
});

/* ───────────── Backend ───────────── */

const modules = import.meta.glob("../convex/**/!(*.*.*)*.*s");

function setup() {
  return convexTest(schema, modules);
}
type T = ReturnType<typeof setup>;

const ISSUER = "https://securetoken.google.com/studentloop-test";

function identity(uid: string) {
  return { issuer: ISSUER, subject: uid, tokenIdentifier: `${ISSUER}|${uid}` };
}

async function makeUser(
  t: T,
  name: string,
  extra: { balance?: number; mobile?: string; hostelBlock?: string; roomNumber?: string } = {},
) {
  const who = identity(`uid-${name.toLowerCase()}`);
  const id = await t.run((ctx) =>
    ctx.db.insert("users", {
      tokenIdentifier: who.tokenIdentifier,
      email: `${name.toLowerCase()}@college.edu`,
      firstName: name,
      lastName: "Test",
      mobile: extra.mobile ?? "",
      hostelBlock: extra.hostelBlock ?? "",
      roomNumber: extra.roomNumber ?? "",
      walletBalance: extra.balance ?? 1000,
      bonusCoins: 0,
      points: 0,
      deliveries: 0,
      trustScore: 80,
      rating: 0,
      ratingCount: 0,
    }),
  );
  return { id, as: t.withIdentity(who) };
}

async function makeShop(t: T) {
  return await t.run(async (ctx) => {
    const shopId = await ctx.db.insert("shops", { name: "Canteen", category: "Food", deliveryMinutes: 15 });
    const biryani = await ctx.db.insert("menuItems", {
      shopId,
      name: "Biryani",
      price: 120,
      description: "",
      available: true,
    });
    return { shopId, biryani };
  });
}

async function placeOrder(user: Awaited<ReturnType<typeof makeUser>>, shop: Awaited<ReturnType<typeof makeShop>>) {
  return await user.as.mutation(api.orders.place, {
    shopId: shop.shopId,
    lines: [{ menuItemId: shop.biryani, qty: 2, note: "" }],
    tip: 10,
    hostel: "Hostel 7",
    room: "312",
    expectedSubtotal: 240,
  });
}

const ENV = ["NVIDIA_API_KEY", "NVIDIA_BASE_URL", "NVIDIA_MODEL"] as const;
let savedEnv: Record<string, string | undefined> = {};
beforeEach(() => {
  savedEnv = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));
  for (const k of ENV) delete process.env[k];
});
afterEach(() => {
  for (const k of ENV) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("help.status", () => {
  it("says whether the assistant is switched on, even signed out", async () => {
    const t = setup();
    expect(await t.query(api.help.status, {})).toEqual({ available: false });
    process.env.NVIDIA_API_KEY = "  ";
    expect(await t.query(api.help.status, {})).toEqual({ available: false });
    process.env.NVIDIA_API_KEY = "nvapi-test";
    expect(await t.query(api.help.status, {})).toEqual({ available: true });
  });
});

describe("account summary", () => {
  it("has the caller's own balance and active jobs, and nothing about anyone else", async () => {
    const t = setup();
    const alice = await makeUser(t, "Alice", { mobile: "98765 43210", hostelBlock: "Hostel 7", roomNumber: "312" });
    const bob = await makeUser(t, "Bob", { balance: 0, mobile: "91234 56789", roomNumber: "B-404" });
    const carol = await makeUser(t, "Carol");
    const shop = await makeShop(t);

    const taken = await placeOrder(alice, shop);
    await alice.as.mutation(api.deliveries.post, {
      title: "Print my notes",
      category: "Stationery",
      pickup: "Library",
      dropHostel: "Hostel 7",
      dropRoom: "312",
      items: [],
      reward: 30,
      tip: 0,
      deadlineMinutes: 45,
      urgency: "medium",
    });
    await carol.as.mutation(api.deliveries.post, {
      title: "Carol's secret errand",
      category: "Food",
      pickup: "Gate",
      dropHostel: "Hostel 2",
      dropRoom: "101",
      items: [],
      reward: 20,
      tip: 0,
      deadlineMinutes: 30,
      urgency: "low",
    });
    await bob.as.mutation(api.deliveries.accept, { id: taken });
    // A code that can't collide with any other number in the summary.
    await t.run((ctx) => ctx.db.patch(taken, { otp: "4826" }));

    const mine = await alice.as.query(internal.help.accountSummary, {});
    expect(mine).toMatchObject({ firstName: "Alice", walletBalance: 1000 - 280 - 30, bonusCoins: 12, carrying: [] });
    expect(mine.requests).toEqual([
      expect.objectContaining({ kind: "errand", title: "Print my notes", stage: "Waiting for a carrier", carrierAssigned: false, refundInMinutes: 45 }),
      expect.objectContaining({ kind: "order", title: "Biryani", shop: "Canteen", stage: "Carrier assigned", carrierAssigned: true, refundInMinutes: null }),
    ]);

    const carried = await bob.as.query(internal.help.accountSummary, {});
    expect(carried.requests).toEqual([]);
    expect(carried.carrying).toEqual([
      { kind: "order", title: "Biryani", stage: "Accepted: buy the items and upload the bill next" },
    ]);

    for (const summary of [mine, carried]) {
      const text = JSON.stringify(summary) + formatAccountSummary(summary);
      for (const secret of ["4826", "312", "Hostel", "B-404", "98765", "91234", "college.edu", "Carol", "Test"]) {
        expect(text).not.toContain(secret);
      }
    }
    expect(JSON.stringify(mine)).not.toContain("Bob");
    expect(JSON.stringify(carried)).not.toContain("Alice");
  });

  it("needs a signed-in user", async () => {
    const t = setup();
    await expect(t.query(internal.help.accountSummary, {})).rejects.toThrow(/sign in/);
  });
});

describe("rate limits", () => {
  it("caps questions per day as well as per minute", async () => {
    vi.useFakeTimers();
    const t = setup();
    const alice = await makeUser(t, "Alice");
    for (let i = 0; i < CALLS_PER_DAY; i++) {
      await alice.as.mutation(internal.help.recordCall, {});
      vi.advanceTimersByTime(61 * 1000);
    }
    await expect(alice.as.mutation(internal.help.recordCall, {})).rejects.toThrow(/daily limit/);

    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    await alice.as.mutation(internal.help.recordCall, {});
    await alice.as.mutation(internal.help.recordCall, {});
    // Rows older than a day are cleared out, a batch at a time, as new ones come in.
    expect(await t.run((ctx) => ctx.db.query("aiCalls").collect())).toHaveLength(2);
  });
});

describe("help.ask", () => {
  type Call = { url: string; method: string; authorization: string | null; body: Record<string, unknown> | null };

  /**
   * Stands in for NVIDIA. `chat` answers each chat request in turn: a status
   * code, or the content of a successful reply.
   */
  function stubNvidia({ models, chat }: { models: string[] | number; chat: (number | string)[] }) {
    const calls: Call[] = [];
    const replies = [...chat];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        calls.push({
          url,
          method: init?.method ?? "GET",
          authorization: new Headers(init?.headers).get("authorization"),
          body: init?.body ? JSON.parse(String(init.body)) : null,
        });
        if (url.endsWith("/models")) {
          return typeof models === "number"
            ? new Response("no", { status: models })
            : Response.json({ object: "list", data: models.map((id) => ({ id, object: "model" })) });
        }
        const next = replies.shift() ?? 500;
        if (typeof next === "number") return new Response(JSON.stringify({ error: "nope" }), { status: next });
        return Response.json({
          choices: [{ message: { role: "assistant", content: next, reasoning_content: "hidden reasoning" } }],
        });
      }),
    );
    return { calls, chats: () => calls.filter((c) => c.url.endsWith("/chat/completions")) };
  }

  let endpoint = 0;
  function switchOn() {
    process.env.NVIDIA_API_KEY = "nvapi-secret-key";
    // A fresh endpoint per test, so the per-isolate model caches don't leak between tests.
    process.env.NVIDIA_BASE_URL = `https://nim.test/${++endpoint}/v1`;
    return vi.spyOn(console, "warn").mockImplementation(() => {});
  }

  it("answers with the account summary in the prompt and the reasoning stripped", async () => {
    const warn = switchOn();
    const t = setup();
    const alice = await makeUser(t, "Alice");
    await placeOrder(alice, await makeShop(t));
    const nim = stubNvidia({
      models: ["nvidia/nv-embed-v1", PREFERRED_MODELS[1], PREFERRED_MODELS[3]],
      chat: ["<think>They want the order status.</think>\n\nYour **Biryani** order is waiting for a carrier."],
    });

    const result = await alice.as.action(api.help.ask, {
      message: "  Where is my order?  ",
      history: [
        { role: "user", text: "Hi" },
        { role: "assistant", text: "Hello! How can I help?" },
      ],
    });
    expect(result).toEqual({ reply: "Your **Biryani** order is waiting for a carrier." });

    expect(nim.calls[0]).toMatchObject({ url: `${process.env.NVIDIA_BASE_URL}/models`, method: "GET" });
    const [chat] = nim.chats();
    expect(nim.chats()).toHaveLength(1);
    expect(chat.authorization).toBe("Bearer nvapi-secret-key");
    expect(chat.body).toMatchObject({ model: PREFERRED_MODELS[1], temperature: 0.3, max_tokens: 700, stream: false });
    const messages = chat.body?.messages as { role: string; content: string }[];
    expect(messages.map((m) => m.role)).toEqual(["system", "user", "assistant", "user"]);
    expect(messages[0].content).toContain("First name: Alice");
    expect(messages[0].content).toContain('Shop order "Biryani" from Canteen: Waiting for a carrier.');
    expect(messages[3].content).toBe("Where is my order?");
    expect(warn).not.toHaveBeenCalled();
  });

  it("stops after one call when NVIDIA rejects the key, and never logs secrets", async () => {
    const warn = switchOn();
    const t = setup();
    const alice = await makeUser(t, "Alice");
    const nim = stubNvidia({ models: 503, chat: [401, "should not be asked"] });

    await expect(
      alice.as.action(api.help.ask, { message: "my private question", history: [] }),
    ).rejects.toThrow(/misconfigured.*NVIDIA_API_KEY/);
    expect(nim.chats()).toHaveLength(1);
    expect(nim.chats()[0].body?.model).toBe(PREFERRED_MODELS[0]);
    expect(warn).toHaveBeenCalledWith("NVIDIA rejected the API key");
    const logged = warn.mock.calls.flat().join("\n");
    expect(logged).toContain(`${PREFERRED_MODELS[0]} answered HTTP 401`);
    expect(logged).not.toContain("nvapi-secret-key");
    expect(logged).not.toContain("my private question");
  });

  it("moves on to the next model after a 404", async () => {
    const warn = switchOn();
    const t = setup();
    const alice = await makeUser(t, "Alice");
    const nim = stubNvidia({ models: 500, chat: [404, "Tap **Wallet**, then **Add money**."] });

    expect(await alice.as.action(api.help.ask, { message: "How do I top up?", history: [] })).toEqual({
      reply: "Tap **Wallet**, then **Add money**.",
    });
    expect(nim.chats().map((c) => c.body?.model)).toEqual([PREFERRED_MODELS[0], PREFERRED_MODELS[1]]);
    expect(warn).toHaveBeenCalledWith(`NVIDIA model ${PREFERRED_MODELS[0]} answered HTTP 404`);

    // The missing model is skipped for a while.
    const again = stubNvidia({ models: 500, chat: ["Again"] });
    await alice.as.action(api.help.ask, { message: "And again?", history: [] });
    expect(again.chats().map((c) => c.body?.model)).toEqual([PREFERRED_MODELS[1]]);
  });

  it("says the assistant is busy on a 429", async () => {
    switchOn();
    const t = setup();
    const alice = await makeUser(t, "Alice");
    const nim = stubNvidia({ models: 500, chat: [429, "too late"] });
    await expect(alice.as.action(api.help.ask, { message: "Hi", history: [] })).rejects.toThrow(/busy/);
    expect(nim.chats()).toHaveLength(1);
  });

  it("gives up politely after three failed models, including empty answers", async () => {
    const warn = switchOn();
    process.env.NVIDIA_MODEL = "acme/custom-chat";
    const t = setup();
    const alice = await makeUser(t, "Alice");
    const nim = stubNvidia({ models: 500, chat: [503, "<think>only thinking", 400, "never reached"] });
    await expect(alice.as.action(api.help.ask, { message: "Hi", history: [] })).rejects.toThrow(/unavailable right now/);
    expect(nim.chats().map((c) => c.body?.model)).toEqual(["acme/custom-chat", PREFERRED_MODELS[0], PREFERRED_MODELS[1]]);
    expect(warn).toHaveBeenCalledWith(`NVIDIA model ${PREFERRED_MODELS[0]} sent an empty answer`);
  });

  it("checks the setup, the caller and the message before calling NVIDIA", async () => {
    const t = setup();
    const alice = await makeUser(t, "Alice");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    await expect(alice.as.action(api.help.ask, { message: "Hi", history: [] })).rejects.toThrow(/isn't switched on/);
    switchOn();
    await expect(t.action(api.help.ask, { message: "Hi", history: [] })).rejects.toThrow(/sign in/);
    await expect(alice.as.action(api.help.ask, { message: "   ", history: [] })).rejects.toThrow(/between 1 and 500/);
    await expect(alice.as.action(api.help.ask, { message: "x".repeat(501), history: [] })).rejects.toThrow(
      /between 1 and 500/,
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
