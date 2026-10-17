import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth, createAccount } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { createOrUpdateUserImpl } from "./lib/accounts";
import { friendlyPasswordError } from "./lib/authErrors";
import { verifyForThisProject } from "./lib/firebase";

const basePassword = Password({
  profile(params) {
    const profile: { email: string; name?: string } = {
      email: String(params.email ?? "").trim().toLowerCase(),
    };
    if (typeof params.name === "string" && params.name.trim()) profile.name = params.name.trim();
    return profile;
  },
  validatePasswordRequirements(password: string) {
    if (password.length < 8 || password.length > 128) {
      throw new ConvexError("Password must be 8 to 128 characters long.");
    }
  },
});

/**
 * The stock Password provider, with its errors made readable. Its authorize
 * function lives on `options`; the library version is pinned, and this fails at
 * deploy time (not silently) if that ever changes.
 */
const passwordOptions = (
  basePassword as unknown as {
    options?: Parameters<typeof ConvexCredentials>[0];
  }
).options;
if (typeof passwordOptions?.authorize !== "function") {
  throw new Error("Unsupported @convex-dev/auth version: cannot wrap the Password provider.");
}
const passwordProvider = ConvexCredentials({
  ...passwordOptions,
  authorize: async (params, ctx) => {
    try {
      return await passwordOptions.authorize(params, ctx);
    } catch (error) {
      throw friendlyPasswordError(error, params.flow);
    }
  },
});

/**
 * Google sign-in through Firebase. The browser sends the Firebase ID token and
 * we verify it ourselves; nothing the client says about who it is is trusted.
 */
const firebaseProvider = ConvexCredentials({
  id: "firebase",
  authorize: async (credentials, ctx) => {
    const identity = await verifyForThisProject(String(credentials.idToken ?? ""));
    const { user } = await createAccount(ctx, {
      provider: "firebase",
      account: { id: identity.uid },
      profile: {
        email: identity.email,
        emailVerified: true,
        ...(identity.name ? { name: identity.name } : {}),
        ...(identity.picture ? { image: identity.picture } : {}),
      },
      shouldLinkViaEmail: false,
      shouldLinkViaPhone: false,
    });
    return { userId: user._id };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [passwordProvider, firebaseProvider],
  callbacks: {
    async createOrUpdateUser(authCtx, args) {
      // The auth library hands over an untyped context; ours knows the schema.
      return await createOrUpdateUserImpl(authCtx as unknown as MutationCtx, {
        existingUserId: args.existingUserId,
        provider: args.provider.id,
        profile: args.profile,
      });
    },
  },
});
