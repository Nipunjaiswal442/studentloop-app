import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import { friendlyPasswordError } from "../convex/lib/authErrors";

const text = (e: unknown) => (e instanceof ConvexError ? (e.data as string) : null);

describe("friendlyPasswordError", () => {
  it("explains a lockout instead of calling it a wrong password", () => {
    const e = friendlyPasswordError(new Error("TooManyFailedAttempts"), "signIn");
    expect(text(e)).toMatch(/Too many failed attempts/);
  });

  it("recognises the lockout inside a decorated server error", () => {
    const e = friendlyPasswordError(new Error("[Request ID: x] Uncaught Error: TooManyFailedAttempts at ..."), "signIn");
    expect(text(e)).toMatch(/Too many failed attempts/);
  });

  it.each(["InvalidSecret", "InvalidAccountId", "Invalid credentials"])("maps %s on sign-in", (msg) => {
    expect(text(friendlyPasswordError(new Error(msg), "signIn"))).toBe("Incorrect email or password.");
  });

  it("maps an existing account on sign-up", () => {
    const e = friendlyPasswordError(new Error("Uncaught Error: Account a@b.com already exists"), "signUp");
    expect(text(e)).toMatch(/already exists/);
  });

  it("does not claim a duplicate email for unrelated failures", () => {
    const boom = new Error("Missing JWT_PRIVATE_KEY");
    expect(friendlyPasswordError(boom, "signUp")).toBe(boom);
    expect(friendlyPasswordError(boom, "signIn")).toBe(boom);
  });

  it("does not turn a sign-up conflict into a sign-in message or vice versa", () => {
    const exists = new Error("Account a@b.com already exists");
    expect(friendlyPasswordError(exists, "signIn")).toBe(exists);
    const invalid = new Error("InvalidSecret");
    expect(friendlyPasswordError(invalid, "signUp")).toBe(invalid);
  });

  it("passes our own errors through untouched", () => {
    const ours = new ConvexError("Password must be 8 to 128 characters long.");
    expect(friendlyPasswordError(ours, "signUp")).toBe(ours);
  });
});
