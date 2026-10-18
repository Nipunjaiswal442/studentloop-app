// Vercel's build command (see vercel.json). Checks the settings, tells Convex
// which Firebase project to trust, then deploys the backend and builds the site
// against it. Everything it needs comes from Vercel's environment variables.
import { execFileSync } from "node:child_process";

const env = process.env;
const firebaseConfig = "Firebase console > Project settings > General > Your apps > Web app config";
const required = [
  ["CONVEX_DEPLOY_KEY", "Convex dashboard > your project > Settings > Deploy keys (production key)"],
  ["VITE_FIREBASE_API_KEY", `${firebaseConfig} (apiKey)`],
  ["VITE_FIREBASE_AUTH_DOMAIN", `${firebaseConfig} (authDomain)`],
  ["VITE_FIREBASE_PROJECT_ID", `${firebaseConfig} (projectId)`],
];

const missing = required.filter(([name]) => !env[name]?.trim());
if (missing.length) {
  console.error("\nStudentLoop can't be deployed yet. Add these in Vercel > Settings > Environment Variables:\n");
  for (const [name, where] of missing) console.error(`  ${name}\n      from: ${where}`);
  console.error(
    `\nThis is a ${env.VERCEL_ENV ?? "local"} build; each variable must be enabled for that environment.` +
      "\nThen redeploy. README > Deploying has the full checklist.\n",
  );
  process.exit(1);
}

const convex = (...args) => execFileSync("npx", ["convex", ...args], { stdio: "inherit" });

if (env.CONVEX_DEPLOY_KEY.startsWith("preview:")) {
  // A preview deployment is created by the deploy below, so it can't be
  // configured first. Set FIREBASE_PROJECT_ID as a default environment
  // variable for previews in the Convex project settings instead.
  console.log("Preview build: FIREBASE_PROJECT_ID comes from Convex's default preview environment variables.");
} else {
  convex("env", "set", "FIREBASE_PROJECT_ID", env.VITE_FIREBASE_PROJECT_ID.trim());
}
convex("deploy", "--cmd", "npm run build");
