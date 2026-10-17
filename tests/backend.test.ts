import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import { DELIVERY_FEE, TOPUP_DAILY_MAX } from "../convex/lib/constants";

// convex-test's storage mock does not record a content type, so the image check
// is stubbed here and covered on its own in uploads.test.ts.
vi.mock("../convex/lib/uploads", () => ({
  assertImageUpload: async (
    ctx: { db: { system: { get: (id: string) => Promise<unknown> } } },
    id: string,
  ) => {
    if (!(await ctx.db.system.get(id))) throw new Error("Upload not found");
  },
}));

const modules = import.meta.glob("../convex/**/!(*.*.*)*.*s");

function setup() {
  return convexTest(schema, modules);
}
type T = ReturnType<typeof setup>;

async function makeUser(t: T, name: string, balance = 500) {
  const id = await t.run((ctx) =>
    ctx.db.insert("users", {
      email: `${name.toLowerCase()}@college.edu`,
      firstName: name,
      lastName: "Test",
      mobile: "",
      hostelBlock: "",
      roomNumber: "",
      walletBalance: balance,
      bonusCoins: 0,
      points: 0,
      deliveries: 0,
      trustScore: 80,
      rating: 0,
      ratingCount: 0,
    }),
  );
  return { id, as: t.withIdentity({ subject: `${id}|session` }) };
}

async function makeShop(t: T) {
  return await t.run(async (ctx) => {
    const shopId = await ctx.db.insert("shops", {
      name: "Canteen",
      category: "Food",
      deliveryMinutes: 15,
    });
    const biryani = await ctx.db.insert("menuItems", {
      shopId,
      name: "Biryani",
      price: 120,
      description: "",
      available: true,
    });
    const tea = await ctx.db.insert("menuItems", {
      shopId,
      name: "Tea",
      price: 20,
      description: "",
      available: true,
    });
    return { shopId, biryani, tea };
  });
}

async function placeOrder(
  user: Awaited<ReturnType<typeof makeUser>>,
  shop: Awaited<ReturnType<typeof makeShop>>,
  overrides: { tip?: number; expectedSubtotal?: number } = {},
) {
  return await user.as.mutation(api.orders.place, {
    shopId: shop.shopId,
    lines: [
      { menuItemId: shop.biryani, qty: 2, note: "less spicy" },
      { menuItemId: shop.tea, qty: 1, note: "" },
    ],
    tip: overrides.tip ?? 10,
    hostel: "Hostel 7",
    room: "312",
    expectedSubtotal: overrides.expectedSubtotal ?? 260,
  });
}

async function uploadBill(t: T) {
  return await t.run((ctx) => ctx.storage.store(new Blob(["bill"], { type: "image/png" })));
}

async function totalMoney(t: T) {
  return await t.run(async (ctx) =>
    (await ctx.db.query("users").collect()).reduce((s, u) => s + u.walletBalance, 0),
  );
}

describe("placing an order", () => {
  it("charges items + fee + tip, opens a job and awards coins", async () => {
    const t = setup();
    const alice = await makeUser(t, "Alice", 1000);
    const shop = await makeShop(t);

    const jobId = await placeOrder(alice, shop);

    const me = await alice.as.query(api.users.me, {});
    expect(me?.walletBalance).toBe(1000 - (260 + DELIVERY_FEE + 10));
    expect(me?.bonusCoins).toBe(13); // 5% of 260

    const job = await alice.as.query(api.deliveries.get, { id: jobId });
    expect(job).toMatchObject({ status: "open", kind: "order", role: "requester" });
    expect(job?.otp).toMatch(/^\d{4}$/);
    expect(job?.order?.total).toBe(300);
  });

  it("takes prices from the menu, never from the client", async () => {
    const t = setup();
    const alice = await makeUser(t, "Alice", 1000);
    const shop = await makeShop(t);
    await expect(placeOrder(alice, shop, { expectedSubtotal: 1 })).rejects.toThrow(
      /Prices have changed/,
    );
    expect((await alice.as.query(api.users.me, {}))?.walletBalance).toBe(1000);
  });

  it("refuses an order the wallet cannot cover and leaves no trace", async () => {
    const t = setup();
    const alice = await makeUser(t, "Alice", 100);
    const shop = await makeShop(t);
    await expect(placeOrder(alice, shop)).rejects.toThrow(/Insufficient wallet balance/);
    expect(await t.run((ctx) => ctx.db.query("deliveryRequests").collect())).toHaveLength(0);
    expect(await t.run((ctx) => ctx.db.query("orders").collect())).toHaveLength(0);
  });
});

describe("delivery lifecycle", () => {
  it("pays the carrier fee + tip + item cost and conserves money", async () => {
    const t = setup();
    const alice = await makeUser(t, "Alice", 1000);
    const bob = await makeUser(t, "Bob", 0);
    const shop = await makeShop(t);
    const before = await totalMoney(t);

    const jobId = await placeOrder(alice, shop);
    await bob.as.mutation(api.deliveries.accept, { id: jobId });
    await bob.as.mutation(api.deliveries.markPurchased, {
      id: jobId,
      billStorageId: await uploadBill(t),
    });
    await bob.as.mutation(api.deliveries.startDelivery, { id: jobId });

    const otp = (await alice.as.query(api.deliveries.get, { id: jobId }))!.otp!;
    const result = await bob.as.mutation(api.deliveries.complete, { id: jobId, otp });
    expect(result).toEqual({ ok: true, earned: DELIVERY_FEE + 10 });

    const bobNow = await bob.as.query(api.users.me, {});
    expect(bobNow?.walletBalance).toBe(DELIVERY_FEE + 10 + 260);
    expect(bobNow?.deliveries).toBe(1);
    expect(await totalMoney(t)).toBe(before);

    const done = await alice.as.query(api.deliveries.get, { id: jobId });
    expect(done?.status).toBe("delivered");
    expect(done?.otp).toBeNull();
  });

  it("only completes with the right code and locks after repeated misses", async () => {
    const t = setup();
    const alice = await makeUser(t, "Alice", 1000);
    const bob = await makeUser(t, "Bob", 0);
    const shop = await makeShop(t);
    const jobId = await placeOrder(alice, shop);
    await bob.as.mutation(api.deliveries.accept, { id: jobId });
    await bob.as.mutation(api.deliveries.markPurchased, {
      id: jobId,
      billStorageId: await uploadBill(t),
    });
    await bob.as.mutation(api.deliveries.startDelivery, { id: jobId });

    const real = (await alice.as.query(api.deliveries.get, { id: jobId }))!.otp!;
    const wrong = real === "0000" ? "1111" : "0000";

    for (let i = 0; i < 4; i++) {
      const r = await bob.as.mutation(api.deliveries.complete, { id: jobId, otp: wrong });
      expect(r.ok).toBe(false);
    }
    const locked = await bob.as.mutation(api.deliveries.complete, { id: jobId, otp: wrong });
    expect(locked).toMatchObject({ ok: false });
    // Even the right code is refused while locked.
    const stillLocked = await bob.as.mutation(api.deliveries.complete, { id: jobId, otp: real });
    expect(stillLocked).toMatchObject({ ok: false });
    expect((await bob.as.query(api.users.me, {}))?.deliveries).toBe(0);
  });

  it("enforces the order of stages and who may act", async () => {
    const t = setup();
    const alice = await makeUser(t, "Alice", 1000);
    const bob = await makeUser(t, "Bob", 0);
    const carol = await makeUser(t, "Carol", 0);
    const shop = await makeShop(t);
    const jobId = await placeOrder(alice, shop);

    await expect(alice.as.mutation(api.deliveries.accept, { id: jobId })).rejects.toThrow(
      /your own/,
    );
    await expect(
      bob.as.mutation(api.deliveries.startDelivery, { id: jobId }),
    ).rejects.toThrow();
    await bob.as.mutation(api.deliveries.accept, { id: jobId });
    await expect(carol.as.mutation(api.deliveries.accept, { id: jobId })).rejects.toThrow(
      /already taken/,
    );
    await expect(
      carol.as.mutation(api.deliveries.markPurchased, {
        id: jobId,
        billStorageId: await uploadBill(t),
      }),
    ).rejects.toThrow(/isn't your delivery/);
    await expect(
      bob.as.mutation(api.deliveries.complete, { id: jobId, otp: "1234" }),
    ).rejects.toThrow(/out for delivery/);
  });

  it("limits how many active deliveries one carrier can hold", async () => {
    const t = setup();
    const alice = await makeUser(t, "Alice", 5000);
    const bob = await makeUser(t, "Bob", 0);
    const shop = await makeShop(t);
    const ids: Id<"deliveryRequests">[] = [];
    for (let i = 0; i < 4; i++) ids.push(await placeOrder(alice, shop));
    for (const id of ids.slice(0, 3)) await bob.as.mutation(api.deliveries.accept, { id });
    await expect(bob.as.mutation(api.deliveries.accept, { id: ids[3] })).rejects.toThrow(
      /active deliveries/,
    );
  });
});

describe("privacy", () => {
  it("hides the room and delivery code from strangers", async () => {
    const t = setup();
    const alice = await makeUser(t, "Alice", 1000);
    const bob = await makeUser(t, "Bob", 0);
    const shop = await makeShop(t);
    const jobId = await placeOrder(alice, shop);

    const open = await bob.as.query(api.deliveries.listOpen, {});
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ dropHostel: "Hostel 7", dropRoom: null, otp: null, order: null });
    expect(await alice.as.query(api.deliveries.listOpen, {})).toHaveLength(0);

    await bob.as.mutation(api.deliveries.accept, { id: jobId });
    const asCarrier = await bob.as.query(api.deliveries.get, { id: jobId });
    expect(asCarrier).toMatchObject({ role: "carrier", dropRoom: "312", otp: null });
  });

  it("does not show finished jobs to strangers", async () => {
    const t = setup();
    const alice = await makeUser(t, "Alice", 1000);
    const bob = await makeUser(t, "Bob", 0);
    const shop = await makeShop(t);
    const jobId = await placeOrder(alice, shop);
    await alice.as.mutation(api.deliveries.cancel, { id: jobId });
    expect(await bob.as.query(api.deliveries.get, { id: jobId })).toBeNull();
  });
});

describe("cancelling and expiry", () => {
  it("refunds everything and takes the bonus coins back", async () => {
    const t = setup();
    const alice = await makeUser(t, "Alice", 1000);
    const shop = await makeShop(t);
    const jobId = await placeOrder(alice, shop);

    await alice.as.mutation(api.deliveries.cancel, { id: jobId });

    const me = await alice.as.query(api.users.me, {});
    expect(me?.walletBalance).toBe(1000);
    expect(me?.bonusCoins).toBe(0);
    expect((await alice.as.query(api.deliveries.get, { id: jobId }))?.status).toBe("cancelled");
  });

  it("cannot be cancelled once the carrier has bought the items", async () => {
    const t = setup();
    const alice = await makeUser(t, "Alice", 1000);
    const bob = await makeUser(t, "Bob", 0);
    const shop = await makeShop(t);
    const jobId = await placeOrder(alice, shop);
    await bob.as.mutation(api.deliveries.accept, { id: jobId });
    await bob.as.mutation(api.deliveries.markPurchased, {
      id: jobId,
      billStorageId: await uploadBill(t),
    });
    await expect(alice.as.mutation(api.deliveries.cancel, { id: jobId })).rejects.toThrow(
      /already bought/,
    );
  });

  it("refunds an open request that nobody took in time, but not a taken one", async () => {
    const t = setup();
    const alice = await makeUser(t, "Alice", 1000);
    const bob = await makeUser(t, "Bob", 0);
    const shop = await makeShop(t);
    const untouched = await placeOrder(alice, shop);
    const taken = await placeOrder(alice, shop);
    await bob.as.mutation(api.deliveries.accept, { id: taken });

    await t.mutation(internal.deliveries.expire, { id: untouched });
    await t.mutation(internal.deliveries.expire, { id: taken });

    expect((await alice.as.query(api.deliveries.get, { id: untouched }))?.status).toBe("cancelled");
    expect((await alice.as.query(api.deliveries.get, { id: taken }))?.status).toBe("accepted");
    expect((await alice.as.query(api.users.me, {}))?.walletBalance).toBe(1000 - 300);
  });
});

describe("errands", () => {
  it("escrows reward + tip, with no item reimbursement", async () => {
    const t = setup();
    const alice = await makeUser(t, "Alice", 200);
    const bob = await makeUser(t, "Bob", 0);

    const id = await alice.as.mutation(api.deliveries.post, {
      title: "Print my assignment",
      category: "Stationery",
      pickup: "Library",
      dropHostel: "Hostel 3",
      dropRoom: "115",
      items: [],
      reward: 40,
      tip: 10,
      deadlineMinutes: 30,
      urgency: "high",
    });
    expect((await alice.as.query(api.users.me, {}))?.walletBalance).toBe(150);

    await bob.as.mutation(api.deliveries.accept, { id });
    await bob.as.mutation(api.deliveries.markPurchased, { id, billStorageId: await uploadBill(t) });
    await bob.as.mutation(api.deliveries.startDelivery, { id });
    const otp = (await alice.as.query(api.deliveries.get, { id }))!.otp!;
    await bob.as.mutation(api.deliveries.complete, { id, otp });
    expect((await bob.as.query(api.users.me, {}))?.walletBalance).toBe(50);
  });

  it("will not post an errand the wallet cannot pay for", async () => {
    const t = setup();
    const alice = await makeUser(t, "Alice", 20);
    await expect(
      alice.as.mutation(api.deliveries.post, {
        title: "Coffee",
        category: "Food",
        pickup: "Cafe",
        dropHostel: "H1",
        dropRoom: "1",
        items: ["Coffee"],
        reward: 30,
        tip: 0,
        deadlineMinutes: 30,
        urgency: "low",
      }),
    ).rejects.toThrow(/Insufficient/);
  });
});

describe("ratings", () => {
  it("lets the requester rate once and updates the carrier", async () => {
    const t = setup();
    const alice = await makeUser(t, "Alice", 1000);
    const bob = await makeUser(t, "Bob", 0);
    const shop = await makeShop(t);
    const id = await placeOrder(alice, shop);
    await bob.as.mutation(api.deliveries.accept, { id });
    await bob.as.mutation(api.deliveries.markPurchased, { id, billStorageId: await uploadBill(t) });
    await bob.as.mutation(api.deliveries.startDelivery, { id });
    const otp = (await alice.as.query(api.deliveries.get, { id }))!.otp!;
    await bob.as.mutation(api.deliveries.complete, { id, otp });

    await alice.as.mutation(api.deliveries.rate, { id, stars: 4 });
    await expect(alice.as.mutation(api.deliveries.rate, { id, stars: 5 })).rejects.toThrow(
      /already rated/,
    );
    const bobNow = await bob.as.query(api.users.me, {});
    expect(bobNow?.rating).toBe(4);
    expect(bobNow?.ratingCount).toBe(1);
  });
});

describe("wallet", () => {
  it("validates and caps top-ups", async () => {
    const t = setup();
    const alice = await makeUser(t, "Alice", 0);
    await expect(alice.as.mutation(api.wallet.topUp, { amount: 0 })).rejects.toThrow();
    await expect(alice.as.mutation(api.wallet.topUp, { amount: 12.5 })).rejects.toThrow();
    await expect(alice.as.mutation(api.wallet.topUp, { amount: 999999 })).rejects.toThrow();

    await alice.as.mutation(api.wallet.topUp, { amount: 5000 });
    await alice.as.mutation(api.wallet.topUp, { amount: 5000 });
    await expect(alice.as.mutation(api.wallet.topUp, { amount: 10 })).rejects.toThrow(
      /Daily top-up limit/,
    );
    expect((await alice.as.query(api.users.me, {}))?.walletBalance).toBe(TOPUP_DAILY_MAX);
  });

  it("keeps the ledger consistent with the balance", async () => {
    const t = setup();
    const alice = await makeUser(t, "Alice", 0);
    await alice.as.mutation(api.wallet.topUp, { amount: 400 });
    const shop = await makeShop(t);
    await placeOrder(alice, shop, { tip: 0 });
    const summary = await alice.as.query(api.wallet.summary, {});
    const net = summary.transactions.reduce(
      (s, tx) => s + (tx.type === "credit" ? tx.amount : -tx.amount),
      0,
    );
    expect(net).toBe(summary.balance);
  });
});

describe("access", () => {
  it("requires sign-in", async () => {
    const t = setup();
    await expect(t.query(api.shops.list, {})).rejects.toThrow(/sign in/);
    await expect(t.mutation(api.wallet.topUp, { amount: 100 })).rejects.toThrow(/sign in/);
    expect(await t.query(api.users.me, {})).toBeNull();
  });
});

describe("disputes", () => {
  it("allows one report per order, only for the requester", async () => {
    const t = setup();
    const alice = await makeUser(t, "Alice", 1000);
    const bob = await makeUser(t, "Bob", 0);
    const shop = await makeShop(t);
    const id = await placeOrder(alice, shop);

    await expect(
      alice.as.mutation(api.disputes.create, {
        deliveryRequestId: id,
        issueType: "Items missing",
        description: "",
      }),
    ).rejects.toThrow(/once a carrier/);

    await bob.as.mutation(api.deliveries.accept, { id });
    await expect(
      bob.as.mutation(api.disputes.create, {
        deliveryRequestId: id,
        issueType: "Items missing",
        description: "",
      }),
    ).rejects.toThrow();
    await alice.as.mutation(api.disputes.create, {
      deliveryRequestId: id,
      issueType: "Delayed delivery",
      description: "Very late",
    });
    await expect(
      alice.as.mutation(api.disputes.create, {
        deliveryRequestId: id,
        issueType: "Other",
        description: "",
      }),
    ).rejects.toThrow(/already reported/);
    expect((await alice.as.query(api.deliveries.get, { id }))?.dispute?.issueType).toBe(
      "Delayed delivery",
    );
  });
});
