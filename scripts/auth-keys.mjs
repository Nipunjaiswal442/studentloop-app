// Creates the signing key pair Convex Auth needs and stores it on a Convex deployment.
//
//   node scripts/auth-keys.mjs           # your dev deployment
//   node scripts/auth-keys.mjs --prod    # your production deployment
//
// Run it once per deployment. Re-running replaces the keys and signs everyone out.
import { execFileSync } from "node:child_process";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const prod = process.argv.includes("--prod");
const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });

const pem = (await exportPKCS8(privateKey)).trimEnd().replace(/\n/g, " ");
const jwks = JSON.stringify({ keys: [{ use: "sig", ...(await exportJWK(publicKey)) }] });

const set = (name, value) =>
  execFileSync("npx", ["convex", "env", "set", ...(prod ? ["--prod"] : []), name, "--", value], {
    stdio: "inherit",
  });

set("JWT_PRIVATE_KEY", pem);
set("JWKS", jwks);
console.log(`\nAuth keys stored on your ${prod ? "production" : "dev"} deployment.`);
