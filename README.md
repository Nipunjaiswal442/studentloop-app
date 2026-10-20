# StudentLoop

A campus delivery network. Students order from campus shops, post errands, or earn by delivering for other students. Payment is held in an in-app wallet until the handoff is confirmed with a one-time code.

**Live:** [studentloop-app.vercel.app](https://studentloop-app.vercel.app)

## What it does

- **Shop** from campus stalls, with search, categories, a persistent cart, and one-tap reorder.
- **Post errands** for anything that isn't on a menu, with your own reward and tip.
- **Deliver**: browse open requests, accept up to three at a time, upload the purchase bill, and finish with the requester's 4-digit code.
- **Wallet**: top-ups, escrow for every order, refunds, earnings and a full ledger.
- **Live everywhere**: order status, carrier assignment, balances and badges update the moment something changes, with no refreshing.
- **Trust**: ratings feed a trust score; issues can be reported with a photo; carriers only see a requester's room after accepting.
- **Help desk**: an FAQ plus an AI assistant that knows the app and your current orders.
- **Works like an app**: add it to your phone's home screen; it opens full screen and starts offline.
- Responsive from phones (bottom tab bar) to desktop (sidebar), emerald light and dark themes, with motion that respects *Reduce motion*.

## Install on your phone

StudentLoop can live on your home screen like an app: its own icon, full screen, and it opens even without a connection (your data loads once you're back online).

- **iPhone or iPad:** open the site in Safari, tap **Share** (if you don't see it, tap **•••** first), then **Add to Home Screen**, then **Add**.
- **Android:** in Chrome, open the **⋮** menu and choose **Install app** or **Add to Home screen**. When Chrome offers it, the Profile page also has an **Install app** button.
- **Computer:** in Chrome or Edge, click the install icon in the address bar. In Safari on a Mac, choose **File > Add to Dock**.

The Profile page shows the right steps for the device you're on. Under the hood: `public/manifest.webmanifest`, the icons in `public/icons/`, and a small service worker (`public/sw.js`) that keeps the app shell and build files for offline starts. If you change what `sw.js` caches, bump its `VERSION`.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7, React Router 7, Tailwind CSS 3 |
| Backend | [Convex](https://convex.dev): database, server functions, file storage, scheduler, realtime |
| Auth | [Firebase Authentication](https://firebase.google.com/docs/auth): email and password, Google, password reset, email verification. Convex checks every Firebase ID token itself |
| AI help | NVIDIA NIM (Llama 3.3, with Qwen and other fallbacks), called from a Convex action |
| Hosting | Vercel (frontend) and Convex Cloud (backend) |
| Tests | Vitest and `convex-test` |

## How money and orders fit together

Shop orders and errands are the same thing underneath: a **delivery job** with one lifecycle, so every screen reads the same state.

```
open ──► accepted ──► purchased ──► out_for_delivery ──► delivered
  │          │
  └──────────┴──► cancelled (full refund)
```

| Step | Who | What happens |
|------|-----|--------------|
| Place order | Customer | Items are priced from the menu on the server. Items + ₹30 carrier fee + tip are debited and held on the job. |
| Accept | Carrier | Room number and phone are revealed to the carrier. The customer's page updates live. |
| Upload bill | Carrier | A photo of the bill is stored; the job moves to *purchased*. |
| Hand over | Carrier | Enters the customer's 4-digit code. Five wrong tries lock the job for 10 minutes. |
| Settle | System | The carrier is credited the fee, the tip, and the item cost they paid at the shop. Total credited equals total held. |
| Expire / cancel | System / customer | Nobody accepted in time, or the customer cancelled before the carrier bought anything: everything is refunded and bonus coins are taken back. |

Errands work the same way, with a reward and tip and no item reimbursement. Customers earn bonus coins worth 5% of the item subtotal (promotional, not cash).

## Project structure

```
convex/                  Backend (TypeScript)
  schema.ts              Tables and indexes
  auth.config.ts         Trust Firebase ID tokens for one Firebase project
  users.ts               Account setup on first sign-in, profile
  deliveries.ts          The job lifecycle: post, accept, purchase, deliver, cancel, rate
  orders.ts              Shop checkout (server-side pricing, escrow)
  wallet.ts, shops.ts, users.ts, disputes.ts, files.ts, help.ts, seed.ts
  lib/                   Ledger, validation, uploads, shared constants,
                         knowledge.ts (FAQ, terms, the assistant's guide), assistant.ts
src/
  pages/                 One file per screen
  components/            App shell, request card, stepper, UI primitives
  lib/                   Firebase sign-in, cart, theme, formatting, domain labels
public/                  Icons, web app manifest and service worker (home-screen app)
tests/                   Backend, assistant and colour-contrast tests
scripts/deploy.mjs       Vercel build: checks settings, deploys Convex, builds the site
```

## How sign-in works

Firebase owns identity: sign-up, sign-in, Google, password resets and verification emails all happen in the browser through the Firebase SDK. The app hands Convex the Firebase **ID token**, and Convex verifies it against Google's public keys (`convex/auth.config.ts`): right signature, issued for *this* Firebase project, not expired. No Convex Auth keys, no `SITE_URL`.

On the first sign-in, `users.ensure` creates the StudentLoop account (wallet with the ₹500 welcome bonus). Accounts left over from the previous sign-in system are handed to their owner the first time they sign in with Firebase **using the same, verified email** (Google addresses are verified; for email and password, open the verification link first). They keep the wallet and history; phone, room and terms acceptance are cleared, since whoever registered the address back then may not have owned it.

## Local development

You need Node 20+, a free [Convex](https://convex.dev) account and a Firebase project (see step 1 under Deploying).

```bash
npm install
npx convex dev            # first run: log in and create a project; writes VITE_CONVEX_URL to .env.local
```

In another terminal, once:

```bash
npx convex env set FIREBASE_PROJECT_ID your-firebase-project-id
npm run seed                                   # starter campus shops
```

Add the Firebase web config to `.env.local` (see `.env.example`), then:

```bash
npm run dev               # http://localhost:5173
```

Keep `npx convex dev` running while you work; it redeploys the backend on every save. Firebase allows `localhost` by default.

### Settings

| Name | Where | Required | Purpose |
|------|-------|----------|---------|
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` | Vercel (and `.env.local`) | Yes | Firebase web config. Public values, baked into the site at build time |
| `VITE_FIREBASE_APP_ID` | Vercel (and `.env.local`) | No | Also from the Firebase web config |
| `CONVEX_DEPLOY_KEY` | Vercel | Yes | Lets the build deploy the backend. Use a **production** key |
| `FIREBASE_PROJECT_ID` | Convex | Yes | Which Firebase project's tokens to accept. The Vercel build copies it from `VITE_FIREBASE_PROJECT_ID`; set it yourself only for local work |
| `NVIDIA_API_KEY` | Vercel (the build copies it to Convex) or Convex | No | Turns on the help assistant (see [Help assistant](#help-assistant)). Without it the FAQ still works. To switch it off, delete it in Convex. Never name it `VITE_NVIDIA_API_KEY` |

`VITE_CONVEX_URL` is filled in automatically: by `npx convex dev` locally and by `convex deploy` on Vercel. You don't need to set it.

## Deploying

1. **Firebase** ([console](https://console.firebase.google.com)):
   - Create a project (or reuse one), then *Project settings > General > Your apps > Add app > Web*. Copy `apiKey`, `authDomain`, `projectId` (and `appId`).
   - *Authentication > Sign-in method*: enable **Email/Password** and **Google**.
   - *Authentication > Settings > Authorized domains*: add `studentloop-app.vercel.app` and any custom domain.
2. **Convex**: in the dashboard, open the project, *Settings > Deploy keys*, create a **production** deploy key.
3. **Vercel** (*Settings > Environment Variables*, Production): add `CONVEX_DEPLOY_KEY` and the three or four `VITE_FIREBASE_*` values, then redeploy. The build (`scripts/deploy.mjs`) stops with a list of anything missing; otherwise it copies the Firebase project id to Convex, deploys the backend and builds the site against it.
4. **Shops**: if the shop list is empty, open the Convex dashboard, *Functions > seed:run > Run* (or `npx convex run --prod seed:run`). It does nothing when shops exist.
5. Optional, the help assistant: add `NVIDIA_API_KEY` in Vercel (Production) and redeploy, or set it on the Convex deployment. See [Help assistant](#help-assistant).

**Preview deployments** need their own Convex *preview* deploy key as `CONVEX_DEPLOY_KEY` in Vercel's Preview environment (never the production key there), plus `FIREBASE_PROJECT_ID` under the Convex project's default environment variables for previews. Without a key, preview builds stop with a message saying so; production is unaffected.

**Leftovers from the previous sign-in system**, safe to delete in the Convex dashboard once you're happy: the environment variables `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and the tables `authAccounts`, `authSessions`, `authRefreshTokens`, `authVerificationCodes`, `authVerifiers`, `authRateLimits` (they hold old password hashes and nothing reads them).

### Help assistant

The chat on the Help page runs on [NVIDIA NIM](https://build.nvidia.com). To switch it on, create an API key at build.nvidia.com and add it in Vercel as `NVIDIA_API_KEY` (Production), then redeploy: the build copies it to Convex. Setting it directly on the Convex deployment works too. That's all; until then the Help page shows only the FAQ.

- The assistant asks NVIDIA which models the key can use and picks the first available of Llama 3.3 70B, Qwen 3.5 122B (with its thinking step switched off), Qwen 2.5 72B, Llama 3.1 70B and 8B, falling back to the next if one fails. Set `NVIDIA_MODEL` to choose one yourself, or `NVIDIA_BASE_URL` for another OpenAI-compatible endpoint; the build copies both from Vercel, like the key.
- To switch it off, delete `NVIDIA_API_KEY` in the Convex dashboard (*Settings > Environment Variables*). Removing it from Vercel isn't enough: the build copies these settings to Convex but never deletes them there. The same goes for `NVIDIA_MODEL` and `NVIDIA_BASE_URL`.
- Never use the name `VITE_NVIDIA_API_KEY`: anything starting with `VITE_` is published inside the site, so the build stops if it sees one.
- Each person can ask 8 questions a minute and 60 a day. Along with the question, NVIDIA gets a short summary of the asker's own account: first name, balance, bonus coins, their active orders and errands, and the deliveries they're carrying. It never gets other people's names, rooms, phone numbers or delivery codes. The titles of jobs someone carries are included, but those are already public on the open-requests feed. The chat says this above the conversation, with a link to the terms.
- If it replies that it's misconfigured, NVIDIA rejected the key; check `NVIDIA_API_KEY`. Failures are logged (without the key or messages) under *Logs* in the Convex dashboard.
- What it knows about the app lives in `convex/lib/knowledge.ts`, next to the FAQ and terms. Update the guide there when screens or rules change.

### If sign-in doesn't work

| What you see | Fix |
|---|---|
| Vercel build fails with "StudentLoop can't be deployed yet" | Add the variables it lists, for the environment it names, and redeploy |
| The site says "StudentLoop isn't fully set up" | The build ran without the `VITE_FIREBASE_*` values. Add them and redeploy |
| "This sign-in method isn't switched on yet" | Enable it in Firebase, *Authentication > Sign-in method* |
| "This website isn't on Firebase's list of authorized domains" | Add the domain in Firebase, *Authentication > Settings > Authorized domains* |
| "We couldn't finish signing you in" | Convex's `FIREBASE_PROJECT_ID` doesn't match the site's Firebase project. Redeploy on Vercel (it copies the value across) |
| "Sign-in is misconfigured: the Firebase API key isn't valid" | Re-copy `VITE_FIREBASE_API_KEY` from the Firebase web config and redeploy |
| Reset or verification emails don't arrive | Check spam. Templates and sender are under Firebase *Authentication > Templates* |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run dev:backend` | `convex dev` (push and watch backend) |
| `npm run seed` | Load starter shops (safe to repeat) |
| `npm test` | Backend tests |
| `npm run typecheck` | App, backend and tests |
| `npm run lint` | ESLint |
| `npm run build` | Typecheck and production build |

## Known limitations

- **Top-ups are not real payments.** There is no payment gateway yet. Top-ups are validated and capped (₹10 to ₹5,000 each, ₹10,000 per day) and the UI says "test mode". Before real money is involved, replace `wallet.topUp` with a flow that verifies a completed payment.
- **Email verification is encouraged, not required.** New email accounts are sent a verification link and the profile shows the status, but unverified accounts can still use the app. College-domain enforcement is not implemented.
- **Reports are stored, not handled.** Disputes are saved with their photo; there is no admin screen to review them yet, and they do not move money.
- **Uploads:** only images up to 5 MB are accepted when attached to an order or report, but an upload that is never attached is not cleaned up automatically.
- The shop list is open to anyone signed in to add to, with no moderation.
- **The assistant's model ids** (Llama 3.3 70B first) couldn't be checked against NVIDIA's live catalogue when this was written. It asks NVIDIA which models exist and falls back automatically; set `NVIDIA_MODEL` if you want a specific one.

## License

MIT
