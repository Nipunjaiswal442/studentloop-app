import { ConvexError } from "convex/values";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWK } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { verifyFirebaseIdToken } from "../convex/lib/firebase";

const PROJECT = "studentloop-test";
const NOW = new Date("2026-10-17T12:00:00Z");
const nowSec = Math.floor(NOW.getTime() / 1000);

let signingKey: CryptoKey;
let otherKey: CryptoKey;
let keys: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  const other = await generateKeyPair("RS256");
  signingKey = pair.privateKey;
  otherKey = other.privateKey;
  const jwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
  keys = createLocalJWKSet({ keys: [jwk] });
});

type Overrides = {
  claims?: Record<string, unknown>;
  issuer?: string;
  audience?: string;
  subject?: string | null;
  expiresIn?: number;
  key?: CryptoKey;
  kid?: string;
};

async function mint(o: Overrides = {}) {
  const claims = {
    email: "Dana@Example.com",
    email_verified: true,
    name: "Dana Roy",
    picture: "https://example.com/p.png",
    auth_time: nowSec - 30,
    firebase: { sign_in_provider: "google.com", identities: {} },
    ...o.claims,
  };
  let jwt = new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: o.kid ?? "k1" })
    .setIssuer(o.issuer ?? `https://securetoken.google.com/${PROJECT}`)
    .setAudience(o.audience ?? PROJECT)
    .setIssuedAt(nowSec - 30)
    .setExpirationTime(nowSec + (o.expiresIn ?? 3600));
  if (o.subject !== null) jwt = jwt.setSubject(o.subject ?? "uid-123");
  return await jwt.sign(o.key ?? signingKey);
}

const verify = (token: string, currentDate = NOW) =>
  verifyFirebaseIdToken(token, { projectId: PROJECT, keys, currentDate });

async function rejected(token: string, currentDate = NOW) {
  const err = await verify(token, currentDate).then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ConvexError);
  expect((err as ConvexError<string>).data).toMatch(/could not be verified/);
}

describe("verifyFirebaseIdToken", () => {
  it("accepts a genuine Google token and normalises the email", async () => {
    await expect(verify(await mint())).resolves.toEqual({
      uid: "uid-123",
      email: "dana@example.com",
      name: "Dana Roy",
      picture: "https://example.com/p.png",
    });
  });

  it("rejects a token for another Firebase project (audience)", async () => {
    await rejected(await mint({ audience: "someone-elses-app" }));
  });

  it("rejects a token from another issuer", async () => {
    await rejected(await mint({ issuer: "https://securetoken.google.com/someone-elses-app" }));
    await rejected(await mint({ issuer: "https://evil.example.com" }));
  });

  it("rejects an expired token", async () => {
    await rejected(await mint({ expiresIn: 60 }), new Date(NOW.getTime() + 10 * 60 * 1000));
  });

  it("rejects a token signed with a key Google does not publish", async () => {
    await rejected(await mint({ key: otherKey }));
  });

  it("rejects a token naming an unknown key id", async () => {
    await rejected(await mint({ kid: "not-a-real-key" }));
  });

  it("rejects an unsigned (alg: none) token", async () => {
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const token = `${b64({ alg: "none", typ: "JWT" })}.${b64({
      iss: `https://securetoken.google.com/${PROJECT}`,
      aud: PROJECT,
      sub: "uid-123",
      email: "victim@example.com",
      email_verified: true,
      auth_time: nowSec - 30,
      exp: nowSec + 3600,
      firebase: { sign_in_provider: "google.com" },
    })}.`;
    await rejected(token);
  });

  it("rejects an HS256 token (algorithm confusion)", async () => {
    const token = await new SignJWT({ email: "victim@example.com", email_verified: true })
      .setProtectedHeader({ alg: "HS256", kid: "k1" })
      .setIssuer(`https://securetoken.google.com/${PROJECT}`)
      .setAudience(PROJECT)
      .setSubject("uid-123")
      .setExpirationTime(nowSec + 3600)
      .sign(new TextEncoder().encode("anything"));
    await rejected(token);
  });

  it("rejects an email Google has not verified", async () => {
    await rejected(await mint({ claims: { email_verified: false } }));
    await rejected(await mint({ claims: { email_verified: "true" } }));
  });

  it("rejects sign-in methods other than Google", async () => {
    await rejected(await mint({ claims: { firebase: { sign_in_provider: "password" } } }));
    await rejected(await mint({ claims: { firebase: { sign_in_provider: "anonymous" } } }));
    await rejected(await mint({ claims: { firebase: undefined } }));
  });

  it("rejects tokens missing an email, a subject, or with an oversized subject", async () => {
    await rejected(await mint({ claims: { email: undefined } }));
    await rejected(await mint({ subject: null }));
    await rejected(await mint({ subject: "x".repeat(129) }));
  });

  it("rejects a token whose auth_time is in the future", async () => {
    await rejected(await mint({ claims: { auth_time: nowSec + 3600 } }));
  });

  it.each(["", "not-a-jwt", "a.b.c", "x".repeat(9000)])("rejects garbage input %#", async (t) => {
    await rejected(t);
  });
});
