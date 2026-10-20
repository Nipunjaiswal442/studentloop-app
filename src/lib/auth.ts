import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { initializeApp } from "@firebase/app";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type Auth,
  type User,
} from "@firebase/auth";

// Firebase handles every sign-in; Convex trusts the ID tokens it issues
// (see convex/auth.config.ts). These values are public and baked in at build time.
const settings = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
};

/** Required Firebase settings missing from this build. */
export const missingAuthSettings = Object.entries(settings)
  .filter(([, value]) => !value?.trim())
  .map(([name]) => name);

export type AuthUser = {
  uid: string;
  email: string;
  name: string;
  emailVerified: boolean;
  /** Signed up with email and password (as opposed to Google only). */
  hasPassword: boolean;
};

let auth: Auth | null = null;
/** undefined until Firebase has restored any saved session. */
let current: AuthUser | null | undefined = undefined;
const listeners = new Set<() => void>();

function publish(user: User | null) {
  current = user && {
    uid: user.uid,
    email: user.email ?? "",
    name: user.displayName ?? "",
    emailVerified: user.emailVerified,
    hasPassword: user.providerData.some((p) => p.providerId === "password"),
  };
  listeners.forEach((l) => l());
}

if (missingAuthSettings.length === 0) {
  auth = getAuth(
    initializeApp({
      apiKey: settings.VITE_FIREBASE_API_KEY,
      authDomain: settings.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: settings.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
    }),
  );
  onAuthStateChanged(auth, publish);
} else {
  current = null;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The Firebase user: undefined while loading, null when signed out. */
export function useAuthUser(): AuthUser | null | undefined {
  return useSyncExternalStore(subscribe, () => current);
}

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
}

/** Resolves when the device comes back online, the signed-in user changes, or after `ms`. */
function nextTokenAttempt(ms: number) {
  return new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      window.removeEventListener("online", done);
      listeners.delete(done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    window.addEventListener("online", done);
    listeners.add(done);
  });
}

/** Adapter for <ConvexProviderWithAuth>: hands Convex a Firebase ID token whenever it asks. */
export function useConvexAuthFromFirebase() {
  const user = useAuthUser();
  const uid = user?.uid;
  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      // An expired token can't be renewed without a connection. Answering null
      // would tell Convex the user is signed out, so keep it waiting instead: the
      // app shows its offline screen and carries on once Firebase is reachable.
      // The timer matters too: iOS can claim to be online on a dead network.
      for (let wait = 1000; ; wait = Math.min(wait * 2, 15_000)) {
        const signedIn = auth?.currentUser;
        if (!signedIn || signedIn.uid !== uid) return null;
        try {
          return await signedIn.getIdToken(forceRefreshToken);
        } catch (e) {
          if (errorCode(e) !== "auth/network-request-failed" && navigator.onLine) return null;
        }
        await nextTokenAttempt(wait);
      }
    },
    [uid],
  );
  return useMemo(
    () => ({ isLoading: user === undefined, isAuthenticated: Boolean(user), fetchAccessToken }),
    [user, fetchAccessToken],
  );
}

function firebase(): Auth {
  if (!auth) throw Object.assign(new Error("Sign-in is not configured."), { code: "app/not-configured" });
  return auth;
}

let signUpName: string | undefined;

/**
 * The name typed at sign-up, handed to the server once when the account is
 * created (Firebase's first token is minted before the name is saved).
 */
export function takeSignUpName() {
  const name = signUpName;
  signUpName = undefined;
  return name;
}

export async function signUpWithEmail(name: string, email: string, password: string) {
  signUpName = name.trim();
  try {
    const { user } = await createUserWithEmailAndPassword(firebase(), email.trim(), password);
    await updateProfile(user, { displayName: name.trim() }).catch(() => undefined);
    await sendEmailVerification(user).catch(() => undefined);
    publish(user);
  } catch (e) {
    signUpName = undefined;
    throw e;
  }
}

export async function signInWithEmail(email: string, password: string) {
  await signInWithEmailAndPassword(firebase(), email.trim(), password);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await signInWithPopup(firebase(), provider);
}

export async function sendPasswordReset(email: string) {
  await sendPasswordResetEmail(firebase(), email.trim());
}

export async function resendVerificationEmail() {
  const user = firebase().currentUser;
  if (user) await sendEmailVerification(user);
}

/** Re-reads the account from Firebase after the user opens the verification link. Returns whether it's verified. */
export async function refreshAuthUser() {
  const user = firebase().currentUser;
  if (!user) return false;
  await user.reload();
  publish(user);
  return user.emailVerified;
}

export async function signOut() {
  try {
    if (auth) await firebaseSignOut(auth);
  } finally {
    // Help chats can mention the user's balance and orders; don't leave them for
    // whoever uses this tab next.
    try {
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith("sl_help_chat_")) sessionStorage.removeItem(key);
      }
    } catch {
      // Storage is blocked, so nothing was kept there either.
    }
  }
}

/** Signs out and returns to the landing page. */
export function useSignOut() {
  const navigate = useNavigate();
  return useCallback(async () => {
    await signOut();
    navigate("/", { replace: true });
  }, [navigate]);
}

const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-password": "Enter your password.",
  "auth/weak-password": "Choose a stronger password (at least 8 characters).",
  "auth/email-already-in-use":
    "An account with this email already exists. Sign in instead, or reset your password.",
  "auth/account-exists-with-different-credential":
    "This email already has an account. Sign in with your email and password.",
  "auth/user-disabled": "This account has been disabled. Contact support@studentloop.com.",
  "auth/too-many-requests":
    "Too many attempts. Wait a few minutes, or reset your password to get back in now.",
  "auth/network-request-failed": "Can't reach the sign-in service. Check your connection and try again.",
  "auth/popup-blocked": "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
  "auth/operation-not-allowed":
    "This sign-in method isn't switched on yet. The site owner needs to enable it in Firebase (Authentication > Sign-in method).",
  "auth/unauthorized-domain":
    "This website isn't on Firebase's list of authorized domains yet. The site owner needs to add it (Authentication > Settings > Authorized domains).",
  "auth/invalid-api-key": "Sign-in is misconfigured: the Firebase API key isn't valid.",
  "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
    "Sign-in is misconfigured: the Firebase API key isn't valid.",
  "app/not-configured": "Sign-in isn't configured on this site yet.",
};

/** Codes that mean the user changed their mind: say nothing. */
const SILENT = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request", "auth/user-cancelled"]);

/** A message for a failed sign-in action, or null when there is nothing to report. */
export function authErrorMessage(error: unknown): string | null {
  const code = errorCode(error);
  if (SILENT.has(code)) return null;
  return MESSAGES[code] ?? `Sign-in failed${code ? ` (${code})` : ""}. Please try again.`;
}
