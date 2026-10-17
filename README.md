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
- Responsive from phones (bottom tab bar) to desktop (sidebar), light and dark.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7, React Router 7, Tailwind CSS 3 |
| Backend | [Convex](https://convex.dev): database, server functions, file storage, scheduler, realtime |
| Auth | [Convex Auth](https://labs.convex.dev/auth): email and password, optional Google |
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
  auth.ts, http.ts       Convex Auth setup
  deliveries.ts          The job lifecycle: post, accept, purchase, deliver, cancel, rate
  orders.ts              Shop checkout (server-side pricing, escrow)
  wallet.ts, shops.ts, users.ts, disputes.ts, files.ts, help.ts, seed.ts
  lib/                   Ledger, validation, uploads, shared constants
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
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | No | Turns on "Continue with Google" (the button only appears when both are set) |
| `NVIDIA_API_KEY` | No | Turns on the AI assistant. Without it the FAQ still works |

`VITE_CONVEX_URL` is the only frontend variable. `npx convex dev` writes it for local work, and `convex deploy` supplies it to the Vercel build.

**Google sign-in:** in Google Cloud Console, create an OAuth client and add `https://<your-deployment>.convex.site/api/auth/callback/google` as an authorised redirect URI.

## Deploying

1. **Convex production:** in the Convex dashboard, open your project and create a production deploy key.
2. **Vercel:** import the repo and add the environment variable `CONVEX_DEPLOY_KEY` (the production key). `vercel.json` already runs `npx convex deploy --cmd 'npm run build'`, which pushes the backend and builds the frontend against it.
3. **Production settings:** set the backend settings above on the *production* deployment, with `SITE_URL` as your Vercel URL:
   ```bash
   node scripts/auth-keys.mjs --prod
   npx convex env set --prod SITE_URL https://your-app.vercel.app
   npx convex run --prod seed:run
   ```

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
- **No email verification or password reset.** Accounts are never merged across sign-in methods (so an address can't be pre-claimed with a password and then taken over via Google), but there is no check that someone owns the email. College-domain enforcement is not implemented either.
- **Reports are stored, not handled.** Disputes are saved with their photo; there is no admin screen to review them yet, and they do not move money.
- **Uploads:** only images up to 5 MB are accepted when attached to an order or report, but an upload that is never attached is not cleaned up automatically.
- The shop list is open to anyone signed in to add to, with no moderation.

## License

MIT
