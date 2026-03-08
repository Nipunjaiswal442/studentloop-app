import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'studentloop.db');

const db = new Database(DB_PATH);

// Enable WAL for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ═══════════════════════════════════════════════════
   SCHEMA — Run on startup (IF NOT EXISTS = idempotent)
   ═══════════════════════════════════════════════════ */

db.exec(`
  -- Users table  
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id     TEXT UNIQUE,
    email         TEXT UNIQUE NOT NULL,
    full_name     TEXT NOT NULL DEFAULT '',
    first_name    TEXT DEFAULT '',
    last_name     TEXT DEFAULT '',
    avatar_url    TEXT DEFAULT '',
    mobile        TEXT DEFAULT '',
    hostel_block  TEXT DEFAULT '',
    room_number   TEXT DEFAULT '',
    trust_score   INTEGER DEFAULT 87,
    deliveries    INTEGER DEFAULT 0,
    points        INTEGER DEFAULT 0,
    rating        REAL DEFAULT 5.0,
    wallet_balance INTEGER DEFAULT 500,
    bonus_coins   INTEGER DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Sessions for JWT tracking
  CREATE TABLE IF NOT EXISTS sessions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id),
    token         TEXT NOT NULL,
    ip_address    TEXT DEFAULT '',
    user_agent    TEXT DEFAULT '',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at    DATETIME NOT NULL
  );

  -- Orders
  CREATE TABLE IF NOT EXISTS orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    order_code    TEXT UNIQUE NOT NULL,
    user_id       INTEGER NOT NULL REFERENCES users(id),
    shop_id       INTEGER NOT NULL,
    shop_name     TEXT NOT NULL,
    total         INTEGER NOT NULL,
    tip           INTEGER DEFAULT 0,
    status        TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','purchased','out_for_delivery','delivered','cancelled')),
    hostel        TEXT DEFAULT '',
    room          TEXT DEFAULT '',
    otp           TEXT DEFAULT '',
    delivery_partner_id INTEGER REFERENCES users(id),
    delivery_reward INTEGER DEFAULT 0,
    has_issue     INTEGER DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Order items
  CREATE TABLE IF NOT EXISTS order_items (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id              INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id          INTEGER NOT NULL,
    name                  TEXT NOT NULL,
    price                 INTEGER NOT NULL,
    qty                   INTEGER NOT NULL DEFAULT 1,
    special_instructions  TEXT DEFAULT ''
  );

  -- Wallet transactions
  CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    type        TEXT NOT NULL CHECK(type IN ('credit','debit')),
    amount      INTEGER NOT NULL,
    description TEXT DEFAULT '',
    reference   TEXT DEFAULT '',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Delivery requests (posted by requesters)
  CREATE TABLE IF NOT EXISTS delivery_requests (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id),
    title         TEXT NOT NULL,
    category      TEXT NOT NULL,
    pickup        TEXT NOT NULL,
    drop_location TEXT NOT NULL,
    reward        INTEGER DEFAULT 30,
    tip           INTEGER DEFAULT 0,
    deadline      TEXT DEFAULT '30 min',
    urgency       TEXT DEFAULT 'medium',
    status        TEXT DEFAULT 'open' CHECK(status IN ('open','accepted','in_progress','completed','cancelled')),
    accepted_by   INTEGER REFERENCES users(id),
    items_json    TEXT DEFAULT '[]',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Disputes / issue reports
  CREATE TABLE IF NOT EXISTS disputes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id),
    order_id      INTEGER NOT NULL REFERENCES orders(id),
    issue_type    TEXT NOT NULL,
    description   TEXT DEFAULT '',
    photo_url     TEXT DEFAULT '',
    status        TEXT DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved','rejected')),
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Activity log (all user actions)
  CREATE TABLE IF NOT EXISTS activity_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    action      TEXT NOT NULL,
    details     TEXT DEFAULT '',
    points      INTEGER DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
  CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_delivery_requests_status ON delivery_requests(status);
`);

export default db;
