# StudentLoop

A peer-to-peer campus delivery and ordering platform built for college students. Post delivery requests, earn money fulfilling them, order from campus stalls, and manage everything through an in-app wallet.

**Live:** [studentloop-app.vercel.app](https://studentloop-app.vercel.app)

---

## Features

### Delivery Marketplace
- Post delivery requests with pickup location, drop location, reward, and tip
- Browse and accept open requests from other students
- OTP-verified delivery confirmation
- Real-time urgency levels (low / medium / high)
- Categories: Food, Stationery, Medicines, Groceries

### Wallet & Earnings
- ₹500 welcome bonus on sign-up
- Wallet top-up via UPI
- Earn rewards + tips on every completed delivery
- Bonus coins on orders (5% of order total)
- Full transaction history (credits and debits)

### Campus Food Ordering
- Browse shops and stalls listed by students
- Add items to cart, choose hostel/room for delivery
- Live order status tracking (pending → accepted → purchased → out for delivery → delivered)
- Tip the delivery partner at checkout
- OTP confirmation on arrival

### Profile & Trust System
- Trust score visible on profile
- Delivery count and star rating
- Points system for activity (sign-up, deliveries, accepts)
- Google or email/password sign-in

### AI Help Desk
- Powered by Qwen via NVIDIA NIM API
- FAQ categories for instant answers
- Free-text AI assistant fallback

### Dispute Resolution
- In-app issue reporting on orders
- Photo evidence upload support

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7 |
| Styling | Tailwind CSS v3, shadcn/ui (40+ Radix UI components) |
| Backend | Express.js 5, Node.js 20 |
| Database | SQLite via `better-sqlite3` (WAL mode) |
| Auth | Firebase (Google OAuth) + Email/Password JWT |
| AI | Qwen model via NVIDIA NIM API |
| Frontend hosting | Vercel |
| Backend hosting | Render |

---

## Project Structure

```
studentloop-app/
├── src/                        # React frontend
│   ├── App.tsx                 # Root component — all screens and logic
│   ├── api.ts                  # Typed API client (fetch wrapper)
│   ├── data.ts                 # Static data, types, constants, T&C
│   ├── lib/
│   │   ├── firebase.ts         # Firebase app + Google provider init
│   │   └── utils.ts            # clsx/tailwind-merge helper
│   └── components/ui/          # shadcn/ui component library (40+ components)
├── server/
│   ├── index.js                # Express API server (all routes)
│   └── db.js                   # SQLite schema + better-sqlite3 init
├── server-python/
│   └── app.py                  # Flask alternative backend (same schema)
├── public/
│   └── landing.html            # Landing page (loaded in iframe)
├── vercel.json                 # Vercel deployment + API proxy rewrites
├── vite.config.ts              # Vite dev server + /api proxy to localhost:3001
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### 1. Clone the repo

```bash
git clone https://github.com/Nipunjaiswal442/studentloop-app.git
cd studentloop-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the root:

```env
# Firebase (get these from Firebase Console → Project Settings → Your Apps)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

Create a `server/.env` file:

```env
JWT_SECRET=your_secure_jwt_secret
NVIDIA_API_KEY=nvapi-xxxx   # Required for the AI chatbot (Qwen via NVIDIA NIM)
PORT=3001
```

### 4. Run in development

**Frontend + backend together:**
```bash
npm run dev:full
```

**Separately:**
```bash
# Terminal 1 — Express backend on :3001
npm run server

# Terminal 2 — Vite dev server on :5173 (proxies /api → :3001)
npm run dev
```

The Vite dev server proxies all `/api/*` requests to `http://localhost:3001`, so no CORS issues in development.

---

## API Reference

All routes are prefixed `/api/`. Protected routes require `Authorization: Bearer <token>`.

### Auth
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/signup` | — | Email/password registration, returns JWT + user |
| POST | `/api/auth/signin` | — | Email/password sign-in, returns JWT + user |
| POST | `/api/auth/google` | — | Firebase Google sign-in (pass UID + email from Firebase SDK) |
| GET | `/api/auth/me` | ✓ | Get current authenticated user |

### Deliveries
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/deliveries` | ✓ | List all open delivery requests |
| POST | `/api/deliveries` | ✓ | Post a new delivery request (debits wallet) |
| POST | `/api/deliveries/:id/accept` | ✓ | Accept a delivery request |
| POST | `/api/deliveries/:id/complete` | ✓ | Mark delivery complete (credits wallet) |

### Wallet
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/wallet` | ✓ | Get balance, bonus coins, and last 20 transactions |
| POST | `/api/wallet/add` | ✓ | Add money to wallet |

### Orders
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/orders` | ✓ | Place a food order (debits wallet) |
| GET | `/api/orders` | ✓ | List user's orders |
| PATCH | `/api/orders/:id/status` | ✓ | Update order status |

### Profile & Misc
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| PUT | `/api/profile` | ✓ | Update profile (name, mobile, hostel, room) |
| POST | `/api/disputes` | ✓ | File a dispute on an order |
| GET | `/api/activity` | ✓ | Get activity log (last 20 events) |
| POST | `/api/chat/gemini` | ✓ | Send message to AI chatbot |
| GET | `/api/shops` | ✓ | List campus shops/stalls |
| POST | `/api/shops` | ✓ | Add a new shop/stall |
| GET | `/api/health` | — | Health check (used to wake Render free tier) |

---

## Database Schema

SQLite database at `server/studentloop.db` (auto-created on first run).

| Table | Key columns |
|-------|-------------|
| `users` | id, email, full_name, wallet_balance (default 500), bonus_coins, trust_score, deliveries, points, rating |
| `sessions` | user_id, token, expires_at |
| `orders` | user_id, shop_id, total, tip, status, otp, delivery_partner_id |
| `order_items` | order_id, name, price, qty |
| `transactions` | user_id, type (credit/debit), amount, description, reference |
| `delivery_requests` | user_id, title, pickup, drop_location, reward, tip, status, accepted_by |
| `disputes` | user_id, order_id, issue_type, status |
| `activity_log` | user_id, action, details, points |

---

## Deployment

### Vercel (Frontend)

1. Push to GitHub and import the repo in [vercel.com](https://vercel.com)
2. Set all `VITE_FIREBASE_*` environment variables in Vercel project settings
3. The `vercel.json` rewrites handle API proxying — no `VITE_API_URL` needed:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://studentloop-backend.onrender.com/api/$1" },
    { "source": "/(.*)",     "destination": "/index.html" }
  ]
}
```

### Render (Backend)

1. Create a new **Web Service** on [render.com](https://render.com), connect the repo
2. Set **Root Directory** to `server` (or use the root and set start command to `node server/index.js`)
3. Set environment variables: `JWT_SECRET`, `NVIDIA_API_KEY`
4. **Important:** The free tier spins down after 15 minutes of inactivity. The app automatically pings `/api/health` on startup to wake the backend before the user's first interaction.
5. For persistent data across restarts, attach a **Render Disk** at `/opt/render/project/src/server` — otherwise the SQLite file resets on each deploy/restart.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (frontend only, port 5173) |
| `npm run server` | Express API server (port 3001) |
| `npm run dev:full` | Both frontend and backend concurrently |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint check |

---

## Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** → Sign-in methods → **Google** and **Email/Password**
3. Add your Vercel domain to **Authorized domains** in Firebase Auth settings
4. Copy the Firebase config object into your `.env.local`

---

## Known Limitations

- **SQLite on Render free tier** — the database file lives on Render's ephemeral filesystem. It resets when the service is redeployed or restarted unless a persistent disk is attached. For production use, migrate to PostgreSQL (Render offers a free tier).
- **Render cold starts** — free tier instances sleep after 15 minutes. The health-check ping on app load mitigates this but the first request may still take 30–50 seconds after a long idle period.
- **Password storage** — passwords are currently base64-encoded (not bcrypt-hashed). Suitable for demos; use `bcrypt` before any real user data is involved.

---

## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss the approach.

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes
4. Push and open a PR against `main`

---

## License

MIT
