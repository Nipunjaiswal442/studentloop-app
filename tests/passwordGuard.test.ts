import { ConvexError } from "convex/values";
import { describe, expect, it, vi } from "vitest";
import { ACCOUNT_EXISTS } from "../convex/lib/authErrors";
import { rejectExistingSignUp } from "../convex/lib/passwordGuard";

const signUp = (email: string, password = "guess-1234") => ({ flow: "signUp", email, password, name: "x" });
const noAccount: (email: string) => Promise<never> = () => Promise.reject(new Error("InvalidAccountId"));
const hasAccount: (email: string) => Promise<unknown> = () => Promise.resolve({ account: {}, user: {} });

describe("rejectExistingSignUp", () => {
  it("refuses sign-up on an existing account without ever seeing the password", async () => {
    const lookup = vi.fn(hasAccount);
    // 20 password guesses disguised as sign-ups: each is refused, none is checked.
    for (let i = 0; i < 20; i++) {
      const err = await rejectExistingSignUp(signUp("victim@college.edu", `guess-${i}-xxxx`), lookup).then(
        () => null,
        (e: unknown) => e,
      );
      expect(err).toBeInstanceOf(ConvexError);
      expect((err as ConvexError<string>).data).toBe(ACCOUNT_EXISTS);
    }
    expect(lookup).toHaveBeenCalledTimes(20);
    // The lookup only ever receives the email: there is nothing to verify a password against.
    expect(lookup.mock.calls.every((c) => c.length === 1 && c[0] === "victim@college.edu")).toBe(true);
  });

  it("lets a genuine new sign-up through", async () => {
    await expect(rejectExistingSignUp(signUp("new@college.edu"), noAccount)).resolves.toBeUndefined();
  });

  it("normalises the email the same way sign-up does", async () => {
    const lookup = vi.fn(noAccount);
    await rejectExistingSignUp(signUp("  Mixed@College.EDU "), lookup);
    expect(lookup).toHaveBeenCalledWith("mixed@college.edu");
  });

  it("only applies to sign-up", async () => {
    const lookup = vi.fn(hasAccount);
    for (const flow of ["signIn", "reset", "email-verification", undefined]) {
      await expect(rejectExistingSignUp({ flow, email: "a@b.com" }, lookup)).resolves.toBeUndefined();
    }
    expect(lookup).not.toHaveBeenCalled();
  });

  it("does not swallow unexpected failures", async () => {
    const boom = new Error("database unavailable");
    await expect(rejectExistingSignUp(signUp("a@b.com"), () => Promise.reject(boom))).rejects.toBe(boom);
  });

  it("leaves a missing email to the stock provider's own validation", async () => {
    const lookup = vi.fn(hasAccount);
    await expect(rejectExistingSignUp({ flow: "signUp" }, lookup)).resolves.toBeUndefined();
    expect(lookup).not.toHaveBeenCalled();
  });
});
