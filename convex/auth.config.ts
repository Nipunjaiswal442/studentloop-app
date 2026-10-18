import type { AuthConfig } from "convex/server";

// Convex accepts Firebase ID tokens for one Firebase project. On Vercel,
// scripts/deploy.mjs copies VITE_FIREBASE_PROJECT_ID into this variable before
// every deploy. For local work, set it once on your dev deployment:
//   npx convex env set FIREBASE_PROJECT_ID your-firebase-project-id
const projectId = process.env.FIREBASE_PROJECT_ID;

export default {
  providers: [
    {
      type: "customJwt",
      // Firebase puts the project id in both `aud` and `iss`.
      applicationID: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
      jwks: "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
      algorithm: "RS256",
    },
  ],
} satisfies AuthConfig;
