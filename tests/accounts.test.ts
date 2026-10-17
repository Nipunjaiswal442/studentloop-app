import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import type { Id } from "../convex/_generated/dataModel";
import { createOrUpdateUserImpl } from "../convex/lib/accounts";
import { WELCOME_BONUS } from "../convex/lib/constants";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/!(*.*.*)*.*s");
const setup = () => convexTest(schema, modules);
type T = ReturnType<typeof setup>;

const google = (email: string, extra: Record<string, unknown> = {}) => ({
  existingUserId: null,
  provider: "firebase",
  profile: { email, emailVerified: true, name: "Dana Roy", ...extra },
});
const password = (email: string) => ({ existingUserId: null, provider: "password", profile: { email } });

/** A user as the password flow leaves them: an account, a session, a refresh token. */
async function seedPasswordUser(t: T, email = "dana@example.com") {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email,
      firstName: "",
      lastName: "",
      // Everything below was typed in by whoever registered the address first.
      mobile: "9999999999",
      hostelBlock: "Squatter Hall",
      roomNumber: "13",
      termsAcceptedAt: 1,
      name: "Pat Squatter",
      walletBalance: 740,
      bonusCoins: 12,
      points: 100,
      deliveries: 3,
      trustScore: 85,
      rating: 4.5,
      ratingCount: 2,
    });
    await ctx.db.insert("authAccounts", { userId, provider: "password", providerAccountId: email, secret: "hash" });
    const sessionId = await ctx.db.insert("authSessions", { userId, expirationTime: Date.now() + 1e9 });
    await ctx.db.insert("authRefreshTokens", { sessionId, expirationTime: Date.now() + 1e9 });
    return { userId, sessionId };
  });
}

describe("new accounts", () => {
  it("creates a user with the welcome bonus; Google marks the email verified", async () => {
    const t = setup();
    const id = await t.run((ctx) => createOrUpdateUserImpl(ctx, google("Dana@Example.com")));
    const { user, txs } = await t.run(async (ctx) => ({
      user: await ctx.db.get(id),
      txs: await ctx.db.query("transactions").collect(),
    }));
    expect(user).toMatchObject({
      email: "dana@example.com",
      firstName: "Dana",
      lastName: "Roy",
      walletBalance: WELCOME_BONUS,
    });
    expect(user?.emailVerificationTime).toBeTypeOf("number");
    expect(txs).toHaveLength(1);
  });

  it("does not mark a password sign-up as verified", async () => {
    const t = setup();
    const id = await t.run((ctx) => createOrUpdateUserImpl(ctx, password("a@b.com")));
    expect((await t.run((ctx) => ctx.db.get(id)))?.emailVerificationTime).toBeUndefined();
  });

  it("returns a returning user unchanged", async () => {
    const t = setup();
    const { userId } = await seedPasswordUser(t);
    const id = await t.run((ctx) => createOrUpdateUserImpl(ctx, { ...google("x@y.com"), existingUserId: userId }));
    expect(id).toBe(userId);
  });

  it("caps an over-long name", async () => {
    const t = setup();
    const id = await t.run((ctx) => createOrUpdateUserImpl(ctx, google("long@example.com", { name: "A".repeat(500) })));
    expect(((await t.run((ctx) => ctx.db.get(id)))?.name ?? "").length).toBe(80);
  });

  it("requires an email", async () => {
    const t = setup();
    await expect(t.run((ctx) => createOrUpdateUserImpl(ctx, google("")))).rejects.toThrow(/email address is required/);
  });
});

describe("password sign-up never joins an existing user", () => {
  it("refuses an address that already has an account", async () => {
    const t = setup();
    await seedPasswordUser(t);
    await expect(t.run((ctx) => createOrUpdateUserImpl(ctx, password("dana@example.com")))).rejects.toThrow(
      /already exists/,
    );
  });

  it("points Google users at Continue with Google", async () => {
    const t = setup();
    const { userId } = await seedPasswordUser(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("authAccounts", { userId, provider: "firebase", providerAccountId: "uid-1" });
    });
    await expect(t.run((ctx) => createOrUpdateUserImpl(ctx, password("dana@example.com")))).rejects.toThrow(
      /registered with Google/,
    );
  });
});

describe("Google adopts an unverified password account", () => {
  it("keeps the user and their data, removes the password and ends sessions", async () => {
    const t = setup();
    const { userId, sessionId } = await seedPasswordUser(t);
    const other = await seedPasswordUser(t, "someone@else.com");

    const id = await t.run((ctx) => createOrUpdateUserImpl(ctx, google("dana@example.com")));
    expect(id).toBe(userId);

    const after = await t.run(async (ctx) => ({
      user: await ctx.db.get(userId),
      accounts: await ctx.db.query("authAccounts").withIndex("userIdAndProvider", (q) => q.eq("userId", userId)).collect(),
      session: await ctx.db.get(sessionId),
      tokens: await ctx.db.query("authRefreshTokens").withIndex("sessionId", (q) => q.eq("sessionId", sessionId)).collect(),
      activity: await ctx.db.query("activity").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      otherSession: await ctx.db.get(other.sessionId),
      otherAccounts: await ctx.db.query("authAccounts").withIndex("userIdAndProvider", (q) => q.eq("userId", other.userId)).collect(),
    }));

    // The wallet and history stay with the account...
    expect(after.user).toMatchObject({ walletBalance: 740, deliveries: 3, bonusCoins: 12 });
    // ...but what the pre-registrant typed in does not: Google's verified name wins,
    // contact details are cleared, and the owner must accept the terms themselves.
    expect(after.user).toMatchObject({ name: "Dana Roy", firstName: "Dana", lastName: "Roy" });
    expect(after.user).toMatchObject({ mobile: "", hostelBlock: "", roomNumber: "" });
    expect(after.user?.termsAcceptedAt).toBeUndefined();
    expect(after.user?.emailVerificationTime).toBeTypeOf("number");
    expect(after.accounts).toHaveLength(0); // password gone; the Google account is added by the library afterwards
    expect(after.session).toBeNull();
    expect(after.tokens).toHaveLength(0);
    expect(after.activity.map((a) => a.action)).toContain("google_linked");
    // Other people are untouched.
    expect(after.otherSession).not.toBeNull();
    expect(after.otherAccounts).toHaveLength(1);
  });

  it("does not adopt when the email is not marked verified", async () => {
    const t = setup();
    await seedPasswordUser(t);
    await expect(
      t.run((ctx) => createOrUpdateUserImpl(ctx, google("dana@example.com", { emailVerified: undefined }))),
    ).rejects.toThrow(/already exists/);
    await expect(
      t.run((ctx) => createOrUpdateUserImpl(ctx, google("dana@example.com", { emailVerified: "true" }))),
    ).rejects.toThrow(/already exists/);
  });

  it("refuses a second, different Google account for the same address", async () => {
    const t = setup();
    const { userId } = await seedPasswordUser(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("authAccounts", { userId, provider: "firebase", providerAccountId: "uid-1" });
    });
    await expect(t.run((ctx) => createOrUpdateUserImpl(ctx, google("dana@example.com")))).rejects.toThrow(
      /different Google account/,
    );
  });

  it("refuses when two users share the address instead of guessing", async () => {
    const t = setup();
    await seedPasswordUser(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        email: "dana@example.com", firstName: "", lastName: "", mobile: "", hostelBlock: "", roomNumber: "",
        walletBalance: 0, bonusCoins: 0, points: 0, deliveries: 0, trustScore: 80, rating: 0, ratingCount: 0,
      });
    });
    await expect(t.run((ctx) => createOrUpdateUserImpl(ctx, google("dana@example.com")))).rejects.toThrow(
      /more than one account/,
    );
  });

  it("only touches the matching user's sessions", async () => {
    const t = setup();
    const { userId } = await seedPasswordUser(t);
    const bystander: { userId: Id<"users"> } = await seedPasswordUser(t, "bystander@x.com");
    await t.run((ctx) => createOrUpdateUserImpl(ctx, google("dana@example.com")));
    const sessions = await t.run((ctx) => ctx.db.query("authSessions").collect());
    expect(sessions.map((s) => s.userId)).toEqual([bystander.userId]);
    expect(userId).not.toBe(bystander.userId);
  });
});
