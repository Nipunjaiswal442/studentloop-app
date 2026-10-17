import { ConvexError } from "convex/values";

export const ACCOUNT_EXISTS = "An account with this email already exists. Try signing in instead.";

/**
 * Convex Auth throws plain errors, and production Convex redacts those down to
 * "Server Error". Translating the ones we recognise into ConvexErrors is the
 * only way the sign-in form can say what actually went wrong.
 */
export function friendlyPasswordError(error: unknown, flow: unknown): unknown {
  if (error instanceof ConvexError) return error;
  const message = error instanceof Error ? error.message : String(error);

  if (flow === "signIn") {
    // The library's limit refills about one attempt every six minutes.
    if (message.includes("TooManyFailedAttempts")) {
      return new ConvexError(
        "Too many failed attempts for this account. Please wait a few minutes and try again.",
      );
    }
    if (/InvalidAccountId|InvalidSecret|Invalid credentials/.test(message)) {
      return new ConvexError("Incorrect email or password.");
    }
  }
  if (flow === "signUp" && /already exists/i.test(message)) return new ConvexError(ACCOUNT_EXISTS);
  return error;
}
