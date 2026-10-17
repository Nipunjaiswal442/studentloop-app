import { ConvexError } from "convex/values";

/**
 * Convex Auth throws plain errors, and production Convex redacts those down to
 * "Server Error". Translating the ones we recognise into ConvexErrors is the
 * only way the sign-in form can say what actually went wrong.
 */
export function friendlyPasswordError(error: unknown, flow: unknown): unknown {
  if (error instanceof ConvexError) return error;
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("TooManyFailedAttempts")) {
    return new ConvexError(
      "Too many failed attempts. For security, sign-in for this account is paused for up to an hour.",
    );
  }
  if (flow === "signUp" && /already exists/i.test(message)) {
    return new ConvexError("An account with this email already exists. Try signing in instead.");
  }
  if (flow === "signIn" && /InvalidAccountId|InvalidSecret|Invalid credentials/.test(message)) {
    return new ConvexError("Incorrect email or password.");
  }
  return error;
}
