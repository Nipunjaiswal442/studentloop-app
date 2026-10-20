// Vercel's build command (see vercel.json). Checks the settings, tells Convex
// which Firebase project to trust (and the help assistant's NVIDIA settings,
// if there are any), then deploys the backend and builds the site against it.
// Everything it needs comes from Vercel's environment variables.
import { execFileSync } from "node:child_process";

const env = process.env;

// Vite bakes every VITE_ variable into the public JavaScript, so this one
// would hand the NVIDIA key to anyone who opens the site.
if (env.VITE_NVIDIA_API_KEY?.trim()) {
  console.error(
    "\nStopped: VITE_NVIDIA_API_KEY is set in Vercel. Anything starting with VITE_ is published inside the site," +
      "\nso this would make your NVIDIA key public." +
      "\n\nIn Vercel > Settings > Environment Variables, rename it to NVIDIA_API_KEY (same value), then redeploy." +
      "\nIf a build with it already went out, create a new key at build.nvidia.com and delete the old one.\n",
  );
  process.exit(1);
}

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

/**
 * Copies an optional assistant setting to Convex. The value goes in on stdin,
 * so it never appears in the build log or the process list. The assistant is
 * optional, so a failure here warns instead of stopping the deploy. A setting
 * missing from Vercel is left alone on Convex, since it may have been set
 * there directly: switching the assistant off means deleting it in Convex.
 */
function copyOptional(name) {
  const value = env[name]?.trim();
  if (!value) return;
  try {
    execFileSync("npx", ["convex", "env", "set", name], { input: value, stdio: ["pipe", "pipe", "pipe"] });
    console.log(`Copied ${name} to Convex.`);
  } catch (e) {
    const detail = String(e.stderr ?? e.message ?? "").replaceAll(value, "***").trim().split("\n").pop();
    console.warn(
      `\nWarning: couldn't copy ${name} to Convex (${detail || "unknown error"}).` +
        `\nThe site will still deploy, without that setting for the help assistant. Redeploy to try again,` +
        ` or add ${name} in the Convex dashboard (Settings > Environment Variables).\n`,
    );
  }
}

if (env.CONVEX_DEPLOY_KEY.startsWith("preview:")) {
  // A preview deployment is created by the deploy below, so it can't be
  // configured first. Set FIREBASE_PROJECT_ID (and NVIDIA_API_KEY, for the
  // assistant) as default environment variables for previews in the Convex
  // project settings instead.
  console.log("Preview build: FIREBASE_PROJECT_ID comes from Convex's default preview environment variables.");
  if (env.NVIDIA_API_KEY?.trim()) {
    console.log("NVIDIA_API_KEY isn't copied to previews; add it to those defaults to try the assistant there.");
  }
} else {
  convex("env", "set", "FIREBASE_PROJECT_ID", env.VITE_FIREBASE_PROJECT_ID.trim());
  copyOptional("NVIDIA_API_KEY");
  copyOptional("NVIDIA_MODEL");
  copyOptional("NVIDIA_BASE_URL");
}
convex("deploy", "--cmd", "npm run build");
