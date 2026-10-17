import { ConvexError } from "convex/values";

/** A message that is safe and useful to show to the user. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  if (error instanceof Error && /Failed to fetch|NetworkError|Load failed/i.test(error.message)) {
    return "Can't reach the server. Check your connection and try again.";
  }
  return fallback;
}
