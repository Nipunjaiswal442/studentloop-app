import { ConvexError } from "convex/values";

export function fail(message: string): never {
  throw new ConvexError(message);
}

export function wholeRupees(value: number, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    fail(`${label} must be a whole number between ₹${min} and ₹${max}.`);
  }
  return value;
}

export function text(value: string, label: string, max: number, required = true): string {
  const trimmed = value.trim();
  if (required && !trimmed) fail(`${label} is required.`);
  if (trimmed.length > max) fail(`${label} must be at most ${max} characters.`);
  return trimmed;
}

export function fourDigitCode(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(1000 + (bytes[0] % 9000));
}
