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
- **Help desk**: an FAQ plus an AI assistant.
- Responsive from phones (bottom tab bar) to desktop (sidebar). Emerald and white, with a dark mode that follows your system until you pick one.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7, React Router 7, Tailwind CSS 3 |
| Backend | [Convex](https://convex.dev): database, server functions, file storage, scheduler, realtime |
| Auth | [Convex Auth](https://labs.convex.dev/auth) sessions. Email and password, plus Google through Firebase (the server verifies the Firebase ID token) |
| AI help | NVIDIA NIM (Qwen, with a Llama fallback), called from a Convex action |
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
  auth.ts, http.ts       Convex Auth setup (password + Firebase Google providers)
  admin.ts               Owner-only recovery commands (clear lockout, reset password)
  deliveries.ts          The job lifecycle: post, accept, purchase, deliver, cancel, rate
  orders.ts              Shop checkout (server-side pricing, escrow)
  wallet.ts, shops.ts, users.ts, disputes.ts, files.ts, help.ts, seed.ts
  lib/                   Ledger, accounts and linking, Firebase token check, uploads, shared constants
src/
  pages/                 One file per screen
  components/            App shell, request card, stepper, UI primitives
  lib/                   Cart, theme, formatting, domain labels, FAQ and terms text
tests/                   Backend tests
scripts/auth-keys.mjs    One-command auth key setup
```

## Local development

You need Node 20+ and a free [Convex](https://convex.dev) account.

```bash
npm install
npx convex dev            # first run: log in, create a project, pushes the backend and writes .env.local
```

In another terminal, once:

```bash
node scripts/auth-keys.mjs                     # signing keys for Convex Auth
npx convex env set SITE_URL http://localhost:5173
npm run seed                                   # starter campus shops
```

Then:

```bash
npm run dev               # http://localhost:5173
```

Keep `npx convex dev` running while you work; it redeploys the backend on every save.

### Settings

Backend settings live on the Convex deployment (`npx convex env set NAME value`, or the dashboard). They are **not** read from `.env.local`.

| Name | Required | Purpose |
|------|----------|---------|
| `JWT_PRIVATE_KEY`, `JWKS` | Yes | Set by `scripts/auth-keys.mjs` |
| `SITE_URL` | Yes | Where the app is served, e.g. `http://localhost:5173` or your Vercel URL |
| `FIREBASE_PROJECT_ID` | No | Your Firebase project id. Turns on "Continue with Google" (the button only appears when this and the `VITE_FIREBASE_*` values below are set) |
| `NVIDIA_API_KEY` | No | Turns on the AI assistant. Without it the FAQ still works |

Frontend variables (Vercel, or `.env.local` locally):

| Name | Purpose |
|------|---------|
| `VITE_CONVEX_URL` | Written by `npx convex dev` locally; `convex deploy` supplies it to the Vercel build |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | Firebase web config, used only for Google sign-in. Leave them out and the button is hidden |

### Google sign-in (Firebase)

1. Firebase console: **Authentication → Sign-in method → Google → Enable**.
2. **Authentication → Settings → Authorized domains**: add your Vercel domain (`localhost` is there by default).
3. **Project settings → Your apps**: copy the web config into the four `VITE_FIREBASE_*` variables.
4. Tell the backend which project to trust: `npx convex env set FIREBASE_PROJECT_ID your_project_id` (add `--prod` for production).

The browser gets a Firebase ID token from Google's popup and sends it to Convex, which checks its signature against Google's published keys, that it was issued for *your* project, that it hasn't expired, and that Google verified the email. Nothing the browser says about who it is is trusted.

**One account per email.** If someone signs in with Google using an address that already has a password account, Google (which has proven they own the address) takes over that account: the data is kept, the old password is removed and its sessions are ended. This is the same rule Firebase applies to unverified email and password accounts, and it stops someone from pre-registering another person's address. The other direction is refused: a password sign-up never joins an existing account.

## Deploying

1. **Convex production:** in the Convex dashboard, open your project and create a production deploy key.
2. **Vercel:** import the repo and add the environment variable `CONVEX_DEPLOY_KEY` (the production key). `vercel.json` already runs `npx convex deploy --cmd 'npm run build'`, which pushes the backend and builds the frontend against it.
3. **Production settings:** set the backend settings above on the *production* deployment, with `SITE_URL` as your Vercel URL:
   ```bash
   node scripts/auth-keys.mjs --prod
   npx convex env set --prod SITE_URL https://your-app.vercel.app
   npx convex env set --prod FIREBASE_PROJECT_ID your_project_id   # for Google sign-in
   npx convex run --prod seed:run
   ```
4. Add the `VITE_FIREBASE_*` variables in Vercel (see above) if you want Google sign-in.

## Sign-in problems

The sign-in page says what actually went wrong:

| Message | What it means |
|---------|---------------|
| "Incorrect email or password." | No account with that email, or the password doesn't match |
| "An account with this email already exists." | Use the **Sign in** tab. Sign-up never replaces an account |
| "This email is already registered with Google." | Use **Continue with Google** |
| "Too many failed attempts…" | About ten wrong passwords in an hour pause that account's sign-in for up to an hour, **even for the right password** |
| "…the server did not accept the session…" | Sign-in worked but the auth keys on the server are out of sync. Re-run `node scripts/auth-keys.mjs` (add `--prod`) |
| Yellow "missing JWT_PRIVATE_KEY / JWKS / SITE_URL" banner | Those settings aren't on the deployment yet. See Settings above |

### Recovering an account (owner only)

These commands are internal: only someone with access to the Convex deployment can run them.

```bash
# Someone is locked out but knows their password
npx convex run --prod admin:clearSignInLockout '{"email":"student@college.edu"}'

# Someone forgot their password (it also ends their existing sessions)
npx convex run --prod admin:resetPassword '{"email":"student@college.edu","password":"a-temporary-password"}'
```

Anyone whose email is a Google account can also just choose **Continue with Google**.

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
- **No self-service password reset, and no email verification for password sign-ups.** Nothing checks that someone owns an address they register with a password (Google sign-in does, which is why it can take over an unverified password account). Use Google or the owner commands above to recover. College-domain enforcement is not implemented either. Real resets need an email-sending service.
- **Google sign-in uses a popup.** Some in-app browsers block popups; the page says so when that happens.
- **Reports are stored, not handled.** Disputes are saved with their photo; there is no admin screen to review them yet, and they do not move money.
- **Uploads:** only images up to 5 MB are accepted when attached to an order or report, but an upload that is never attached is not cleaned up automatically.
- The shop list is open to anyone signed in to add to, with no moderation.

## License

MIT
