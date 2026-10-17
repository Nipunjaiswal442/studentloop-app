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
  lib/                   Cart, theme, Firebase, formatting, domain labels, FAQ and terms text
tests/                   Backend, auth and theme-contrast tests
scripts/auth-keys.mjs    One-command auth key setup
```

## Local development

You need Node 20.19+ (or 22.12+) and a free [Convex](https://convex.dev) account. Run every command from inside the project folder, and use a second terminal tab for step 2.

**1. Install and start the backend** (leave it running):

```bash
npm install
npx convex dev
```

The first run asks you to log in and create a project, pushes the backend, and writes `.env.local`. After that it redeploys the backend every time you save.

**2. In a second terminal, one-time setup:**

```bash
node scripts/auth-keys.mjs
npm run seed
```

The first command creates the sign-in keys on your dev deployment. The second adds the starter campus shops.

**3. Start the site:**

```bash
npm run dev
```

Then open http://localhost:5173.

> Paste commands exactly as shown, without adding `# comments` after them. zsh (the default macOS terminal) hands those words to the command as arguments.

### Settings

Backend settings live on the Convex deployment (`npx convex env set NAME value`, or the dashboard). They are **not** read from `.env.local`.

| Name | Required | Purpose |
|------|----------|---------|
| `JWT_PRIVATE_KEY`, `JWKS` | Yes | Set by `scripts/auth-keys.mjs` |
| `FIREBASE_PROJECT_ID` | No | Your Firebase project id. Turns on "Continue with Google" (the button only appears when this and the `VITE_FIREBASE_*` values below are both set) |
| `NVIDIA_API_KEY` | No | Turns on the AI assistant. Without it the FAQ still works |

Frontend variables (Vercel, or `.env.local` locally):

| Name | Purpose |
|------|---------|
| `VITE_CONVEX_URL` | Written by `npx convex dev` locally; `convex deploy` supplies it to the Vercel build |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | Firebase web config, used only for Google sign-in. Leave them out and the button is hidden |

Vite reads these when it starts and when the site is built, so restart `npm run dev` after editing `.env.local`, and redeploy after changing them in Vercel.

### Google sign-in (Firebase)

1. Firebase console: **Authentication → Sign-in method → Google → Enable** (it asks for a support email).
2. **Authentication → Settings → Authorized domains**: add your Vercel domain (`localhost` is there by default).
3. **Project settings → Your apps**: add a **Web** app if there isn't one, and copy its config into the four `VITE_FIREBASE_*` variables. Keep `VITE_FIREBASE_AUTH_DOMAIN` as Firebase's own `your-project.firebaseapp.com`: pointing it at your Vercel domain breaks the popup.
4. Tell the backend which project to trust: `npx convex env set FIREBASE_PROJECT_ID your_project_id` (add `--prod` for production).

The browser gets a Firebase ID token from Google's popup and sends it to Convex, which checks its signature against Google's published keys, that it was issued for *your* project, that the login is recent, and that Google verified the email. Nothing the browser says about who it is is trusted.

**One account per email.** If someone signs in with Google using an address that already has a password account, Google (which has proven they own the address) takes over that account. The wallet and history are kept. The old password is removed, its sign-ins stop working immediately, and the saved phone number, address and terms acceptance are cleared, because whoever registered the address first may not be its owner. This is the same rule Firebase applies to unverified email and password accounts, and it stops someone from pre-registering another person's address. The other direction is refused: a password sign-up never joins an existing account, and never reveals whether a password was right.

## Deploying

1. **Convex production key:** in the Convex dashboard, open your project and create a **production** deploy key.
2. **Vercel environment variables.** Import the repo, then add:
   - `CONVEX_DEPLOY_KEY` = the production key, for the **Production** environment only. `vercel.json` runs `npx convex deploy --cmd 'npm run build'`, which pushes the backend and builds the site against it.
   - The four `VITE_FIREBASE_*` values for Production, if you want Google sign-in. They are baked into the site when it is built, so set them *before* the deploy (or redeploy afterwards).
3. **Production backend settings.** These don't depend on Vercel:
   ```bash
   node scripts/auth-keys.mjs --prod
   npx convex env set --prod FIREBASE_PROJECT_ID your_project_id
   npx convex run --prod seed:run
   ```
   The `FIREBASE_PROJECT_ID` line is only for Google sign-in.

**Preview deployments (pull requests).** Previews are optional. Without a key in the Preview environment, their build stops with "no Convex deployment configuration found", which is expected and does not affect production. To make previews work, create a separate **preview** deploy key in Convex and add it as `CONVEX_DEPLOY_KEY` for the **Preview** environment. Never put the production key there: a pull request's unmerged code would be deployed to your live backend. A preview backend also starts empty, so give it default environment variables in the Convex project settings (`JWT_PRIVATE_KEY`, `JWKS`, `FIREBASE_PROJECT_ID`).

## Sign-in problems

The sign-in page says what actually went wrong:

| Message | What it means |
|---------|---------------|
| "Incorrect email or password." | No account with that email, or the password doesn't match |
| "An account with this email already exists." | Use the **Sign in** tab. Sign-up never replaces an account or checks its password |
| "This email is already registered with Google." | Use **Continue with Google** |
| "Too many failed attempts…" | About ten wrong passwords in a short time pause that account's sign-in, **even for the right password**. One more try is allowed roughly every six minutes, and a wrong guess uses it up. The owner can clear it at once (below) |
| "Your session has ended. Please sign in again." | The password was reset or Google took over the account, so earlier sign-ins no longer work. Sign in again |
| "…the server did not accept the session…" | Sign-in worked but the auth keys on the server are out of sync. Re-run `node scripts/auth-keys.mjs` (add `--prod`). This replaces the keys and signs **everyone** out |
| Yellow "missing JWT_PRIVATE_KEY / JWKS" banner | Those settings aren't on the deployment yet. See Settings above |
| "Google sign-in could not be verified" | `VITE_FIREBASE_PROJECT_ID` (Vercel) and `FIREBASE_PROJECT_ID` (Convex) are different Firebase projects. The Convex logs print the project the server expects |
| "Google sign-in didn't work" | The Google provider isn't enabled in Firebase, or the web config is wrong. The browser console shows the real reason |
| No Google button | Both the `VITE_FIREBASE_*` values (and a redeploy) and `FIREBASE_PROJECT_ID` must be set |

### Recovering an account (owner only)

These commands are internal: only someone with access to the Convex deployment can run them. Use the first when someone is locked out but knows their password, and the second when they have forgotten it (it also ends their existing sign-ins). The password you set ends up in your shell history, so ask them to change it.

```bash
npx convex run --prod admin:clearSignInLockout '{"email":"student@college.edu"}'
npx convex run --prod admin:resetPassword '{"email":"student@college.edu","password":"a-temporary-password"}'
```

Anyone whose email is a Google account can also just choose **Continue with Google**.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run dev:backend` | `convex dev` (push and watch backend) |
| `npm run seed` | Load starter shops (safe to repeat) |
| `npm test` | Backend, auth and theme tests |
| `npm run typecheck` | App, backend and tests |
| `npm run lint` | ESLint |
| `npm run build` | Typecheck and production build |

## Known limitations

- **Top-ups are not real payments.** There is no payment gateway yet. Top-ups are validated and capped (₹10 to ₹5,000 each, ₹10,000 per day) and the UI says "test mode". Before real money is involved, replace `wallet.topUp` with a flow that verifies a completed payment.
- **No self-service password reset, and no email verification for password sign-ups.** Nothing checks that someone owns an address they register with a password (Google sign-in does, which is why it can take over an unverified password account). Use Google or the owner commands above to recover. College-domain enforcement is not implemented either. Real resets need an email-sending service.
- **Google sign-in uses a popup.** Some in-app browsers block popups; the page says so when that happens.
- **Anyone can pause someone else's password sign-in** by guessing wrong passwords for their email (the built-in brute-force protection). Google sign-in and the owner commands above are the way around it.
- **Reports are stored, not handled.** Disputes are saved with their photo; there is no admin screen to review them yet, and they do not move money.
- **Uploads:** only images up to 5 MB are accepted when attached to an order or report, but an upload that is never attached is not cleaned up automatically.
- The shop list is open to anyone signed in to add to, with no moderation.

## License

MIT
