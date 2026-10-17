import { ConvexError } from "convex/values";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

const GOOGLE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

export type FirebaseIdentity = {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
};

const REJECTED = "Google sign-in could not be verified. Please try again.";

/**
 * Verifies a Firebase ID token the way Firebase documents it: RS256 signature
 * against Google's published keys, issuer and audience pinned to our project,
 * not expired, and a Google-verified email. Anything else is rejected.
 */
export async function verifyFirebaseIdToken(
  idToken: string,
  options: { projectId: string; keys: JWTVerifyGetKey; currentDate?: Date },
): Promise<FirebaseIdentity> {
  if (!idToken || idToken.length > 8192) throw new ConvexError(REJECTED);

  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, options.keys, {
      algorithms: ["RS256"],
      issuer: `https://securetoken.google.com/${options.projectId}`,
      audience: options.projectId,
      currentDate: options.currentDate,
      clockTolerance: 5,
    }));
  } catch (error) {
    console.error("Firebase ID token rejected:", error instanceof Error ? error.message : error);
    throw new ConvexError(REJECTED);
  }

  const now = Math.floor((options.currentDate?.getTime() ?? Date.now()) / 1000);
  const firebase = payload.firebase as { sign_in_provider?: unknown } | undefined;
  const uid = payload.sub;
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";

  const valid =
    typeof uid === "string" &&
    uid.length > 0 &&
    uid.length <= 128 &&
    email.length > 0 &&
    payload.email_verified === true &&
    firebase?.sign_in_provider === "google.com" &&
    typeof payload.auth_time === "number" &&
    payload.auth_time <= now + 5;
  if (!valid) {
    console.error("Firebase ID token has unexpected claims", {
      hasUid: Boolean(uid),
      hasEmail: Boolean(email),
      emailVerified: payload.email_verified,
      provider: firebase?.sign_in_provider,
    });
    throw new ConvexError(REJECTED);
  }

  return {
    uid,
    email,
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}

let remoteKeys: JWTVerifyGetKey | undefined;

/** Google's signing keys, cached by jose between calls. */
export function googleSigningKeys(): JWTVerifyGetKey {
  // FIREBASE_JWKS_URL exists so tests can point at a local key server. It is
  // only honoured for loopback addresses, so it can't redirect production trust.
  const override = process.env.FIREBASE_JWKS_URL;
  if (override) {
    const url = new URL(override);
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") {
      return createRemoteJWKSet(url, { cooldownDuration: 0 });
    }
  }
  remoteKeys ??= createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
  return remoteKeys;
}

/** Verifies a token for this deployment's Firebase project. */
export async function verifyForThisProject(idToken: string): Promise<FirebaseIdentity> {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new ConvexError("Google sign-in isn't set up on this server yet.");
  return await verifyFirebaseIdToken(idToken, { projectId, keys: googleSigningKeys() });
}
