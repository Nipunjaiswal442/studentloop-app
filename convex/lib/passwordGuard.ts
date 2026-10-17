import { ConvexError } from "convex/values";
import { ACCOUNT_EXISTS } from "./authErrors";
import { normalizeEmail } from "./email";

/**
 * Sign-up on an address that already has a password account must be refused
 * *before* the password is looked at. The library's own handling of that case
 * checks the submitted password with no attempt limit, so left alone, "sign up"
 * would be an unthrottled password guesser that also sidesteps the sign-in
 * lockout. `lookup` finds an account without a secret, so nothing is verified.
 */
export async function rejectExistingSignUp(
  params: Partial<Record<string, unknown>>,
  lookup: (email: string) => Promise<unknown>,
) {
  if (params.flow !== "signUp") return;
  const email = normalizeEmail(params.email);
  if (!email) return;

  let exists = true;
  try {
    await lookup(email);
  } catch (error) {
    if (error instanceof Error && error.message.includes("InvalidAccountId")) exists = false;
    else throw error;
  }
  if (exists) throw new ConvexError(ACCOUNT_EXISTS);
}
