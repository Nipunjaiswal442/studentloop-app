import { ConvexError } from "convex/values";

/** A message that is safe and useful to show to the user. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  if (error instanceof Error && /Failed to fetch|NetworkError|Load failed|Connection lost/i.test(error.message)) {
    return "Can't reach the server. Check your connection and try again.";
  }
  return fallback;
}

/**
 * A message for a failed Google sign-in, or null when the person simply closed
 * the window (nothing to report).
 */
export function googleErrorMessage(error: unknown): string | null {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  const code = (error as { code?: unknown } | null)?.code;
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null;
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.";
    case "auth/unauthorized-domain":
      return "This site's address isn't authorised in Firebase yet. Add it under Authentication → Settings → Authorized domains.";
    case "auth/network-request-failed":
      return "Can't reach Google. Check your connection and try again.";
    default:
      return "Google sign-in didn't work. Please try again.";
  }
}
