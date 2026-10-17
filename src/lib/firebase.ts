const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

/** True when the Firebase web config is present in this build. */
export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId);

/**
 * Opens Google's account chooser through Firebase and returns a Firebase ID
 * token. Firebase is used only to prove who the person is: the server verifies
 * the token, and the session itself is Convex's. The SDK loads on first use.
 */
export async function getGoogleIdToken(): Promise<string> {
  const [{ getApp, getApps, initializeApp }, { GoogleAuthProvider, getAuth, signInWithPopup, signOut }] =
    await Promise.all([import("firebase/app"), import("firebase/auth")]);

  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const { user } = await signInWithPopup(auth, provider);
  const idToken = await user.getIdToken();
  await signOut(auth).catch(() => undefined);
  return idToken;
}
