const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

/** True when the Firebase web config is present in this build. */
export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId);

const loadSdk = () => Promise.all([import("@firebase/app"), import("@firebase/auth")]);

/**
 * Starts downloading the Firebase SDK. Called when the sign-in page opens so the
 * popup can open straight from the tap: browsers (iOS Safari especially) may
 * block a popup that has to wait for a download after the tap.
 */
export function preloadFirebase() {
  if (firebaseConfigured) void loadSdk().catch(() => undefined);
}

/**
 * Opens Google's account chooser through Firebase and returns a Firebase ID
 * token. Firebase is used only to prove who the person is: the server verifies
 * the token, and the session itself is Convex's.
 */
export async function getGoogleIdToken(): Promise<string> {
  const [{ getApp, getApps, initializeApp }, { GoogleAuthProvider, getAuth, signInWithPopup, signOut }] =
    await loadSdk();

  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const { user } = await signInWithPopup(auth, provider);
  const idToken = await user.getIdToken();
  await signOut(auth).catch(() => undefined);
  return idToken;
}
