import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import db from './db.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'studentloop-dev-secret-key-2026';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

/* ── Helper: generate JWT ── */
function signToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

function sessionExpiry() {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

/* ── Middleware: auth guard ── */
function auth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    try {
        const decoded = jwt.verify(header.slice(7), JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch { return res.status(401).json({ error: 'Invalid token' }); }
}

/* ──────────────────────────────────────────
   AUTH ROUTES
   ────────────────────────────────────────── */

// Google Sign-In: verify Google token → upsert user → return JWT
// Supports both ID token (credential) and access_token flows
app.post('/api/auth/google', async (req, res) => {
    try {
        const { credential, access_token } = req.body;
        if (!credential && !access_token) return res.status(400).json({ error: 'Missing credential or access_token' });

        let googleId, email, name, given_name, family_name, picture;

        if (credential) {
            // Verify Google ID token (from GoogleLogin component / One Tap)
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            ({ sub: googleId, email, name, given_name, family_name, picture } = payload);
        } else {
            // Access token flow (from useGoogleLogin popup) — fetch user info from Google
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${access_token}` },
            });
            if (!userInfoRes.ok) {
                throw new Error('Failed to fetch Google user info');
            }
            const userInfo = await userInfoRes.json();
            googleId = userInfo.sub;
            email = userInfo.email;
            name = userInfo.name;
            given_name = userInfo.given_name;
            family_name = userInfo.family_name;
            picture = userInfo.picture;
        }

        if (!email) throw new Error('No email returned from Google');

        // Upsert user
        let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);
        if (!user) {
            user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
            if (user) {
                db.prepare('UPDATE users SET google_id = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                    .run(googleId, picture || '', user.id);
                user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
            } else {
                const result = db.prepare(
                    'INSERT INTO users (google_id, email, full_name, first_name, last_name, avatar_url) VALUES (?, ?, ?, ?, ?, ?)'
                ).run(googleId, email, name || '', given_name || '', family_name || '', picture || '');
                user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

                // Log activity
                db.prepare('INSERT INTO activity_log (user_id, action, details, points) VALUES (?, ?, ?, ?)')
                    .run(user.id, 'account_created', 'Signed up via Google', 100);
                db.prepare('UPDATE users SET points = points + 100, bonus_coins = bonus_coins + 50 WHERE id = ?').run(user.id);

                // Welcome bonus transaction
                db.prepare('INSERT INTO transactions (user_id, type, amount, description, reference) VALUES (?, ?, ?, ?, ?)')
                    .run(user.id, 'credit', 500, 'Welcome bonus', 'welcome');
            }
        } else {
            db.prepare('UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run(picture || '', user.id);
            user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
        }

        // Create session
        const token = signToken(user.id);
        db.prepare('INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)')
            .run(user.id, token, req.ip || '', req.headers['user-agent'] || '', sessionExpiry());

        // Log sign-in
        db.prepare('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)')
            .run(user.id, 'sign_in', 'Signed in via Google');

        res.json({ token, user: sanitizeUser(user) });
    } catch (err) {
        console.error('Google auth error:', err.message);
        res.status(401).json({ error: 'Google authentication failed' });
    }
});

// Email/Password Sign-Up
app.post('/api/auth/signup', (req, res) => {
    const { email, password, fullName } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Account already exists' });

    const nameParts = (fullName || '').trim().split(' ');
    const result = db.prepare(
        'INSERT INTO users (email, full_name, first_name, last_name) VALUES (?, ?, ?, ?)'
    ).run(email, fullName || '', nameParts[0] || '', nameParts.slice(1).join(' ') || '');

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

    // Store password hash (simplified — use bcrypt in production)
    db.prepare('UPDATE users SET mobile = ? WHERE id = ?').run(`pwd:${Buffer.from(password).toString('base64')}`, user.id);

    // Welcome bonus
    db.prepare('INSERT INTO transactions (user_id, type, amount, description, reference) VALUES (?, ?, ?, ?, ?)')
        .run(user.id, 'credit', 500, 'Welcome bonus', 'welcome');
    db.prepare('INSERT INTO activity_log (user_id, action, details, points) VALUES (?, ?, ?, ?)')
        .run(user.id, 'account_created', 'Signed up via email', 100);
    db.prepare('UPDATE users SET points = points + 100, bonus_coins = bonus_coins + 50 WHERE id = ?').run(user.id);

    const token = signToken(user.id);
    db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, sessionExpiry());

    res.json({ token, user: sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) });
});

// Email/Password Sign-In
app.post('/api/auth/signin', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Account not found' });

    const storedPwd = user.mobile?.startsWith('pwd:') ? Buffer.from(user.mobile.slice(4), 'base64').toString() : null;
    if (storedPwd && storedPwd !== password) return res.status(401).json({ error: 'Invalid password' });
    // If no password set (Google-only user), allow sign-in but warn
    if (!storedPwd && !user.google_id) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user.id);
    db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, sessionExpiry());
    db.prepare('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)').run(user.id, 'sign_in', 'Email sign-in');

    res.json({ token, user: sanitizeUser(user) });
});

// Get current user
app.get('/api/auth/me', auth, (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: sanitizeUser(user) });
});

/* ──────────────────────────────────────────
   USER PROFILE
   ────────────────────────────────────────── */

app.put('/api/profile', auth, (req, res) => {
    const { firstName, lastName, mobile, hostelBlock, roomNumber } = req.body;
    db.prepare(`
    UPDATE users SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name),
      hostel_block = COALESCE(?, hostel_block), room_number = COALESCE(?, room_number),
      updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(firstName, lastName, hostelBlock, roomNumber, req.userId);

    if (mobile && !mobile.startsWith('pwd:')) {
        db.prepare('UPDATE users SET mobile = ? WHERE id = ?').run(mobile, req.userId);
    }

    db.prepare('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)').run(req.userId, 'profile_updated', 'Profile details updated');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    res.json({ user: sanitizeUser(user) });
});

/* ──────────────────────────────────────────
   ORDERS
   ────────────────────────────────────────── */

// Create order
app.post('/api/orders', auth, (req, res) => {
    const { items, shopId, shopName, total, tip, hostel, room } = req.body;
    const otp = String(Math.floor(1000 + Math.random() * 9000));
    const orderCode = `ORD-${String(Date.now()).slice(-6)}`;

    const result = db.prepare(
        'INSERT INTO orders (order_code, user_id, shop_id, shop_name, total, tip, hostel, room, otp, delivery_reward) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(orderCode, req.userId, shopId, shopName, total, tip || 0, hostel || '', room || '', otp, 30 + (tip || 0));

    const orderId = result.lastInsertRowid;
    const insertItem = db.prepare('INSERT INTO order_items (order_id, menu_item_id, name, price, qty, special_instructions) VALUES (?, ?, ?, ?, ?, ?)');
    for (const item of items) {
        insertItem.run(orderId, item.id, item.name, item.price, item.qty, item.specialInstructions || '');
    }

    // Debit wallet
    db.prepare('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?').run(total, req.userId);
    db.prepare('INSERT INTO transactions (user_id, type, amount, description, reference) VALUES (?, ?, ?, ?, ?)')
        .run(req.userId, 'debit', total, `Order ${orderCode} — ${shopName}`, orderCode);

    // Bonus coins
    const bonusCoins = Math.floor(total * 0.05);
    db.prepare('UPDATE users SET bonus_coins = bonus_coins + ? WHERE id = ?').run(bonusCoins, req.userId);

    // Activity log
    db.prepare('INSERT INTO activity_log (user_id, action, details, points) VALUES (?, ?, ?, ?)')
        .run(req.userId, 'order_placed', `Ordered from ${shopName}`, bonusCoins);

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
    res.json({ order: { ...order, items: orderItems } });
});

// Get user's orders
app.get('/api/orders', auth, (req, res) => {
    const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
    const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    const result = orders.map(o => ({ ...o, items: getItems.all(o.id) }));
    res.json({ orders: result });
});

// Update order status
app.patch('/api/orders/:id/status', auth, (req, res) => {
    const { status } = req.body;
    db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
    db.prepare('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)')
        .run(req.userId, 'order_status_updated', `Order #${req.params.id} → ${status}`);
    res.json({ success: true });
});

/* ──────────────────────────────────────────
   WALLET & TRANSACTIONS
   ────────────────────────────────────────── */

app.get('/api/wallet', auth, (req, res) => {
    const user = db.prepare('SELECT wallet_balance, bonus_coins FROM users WHERE id = ?').get(req.userId);
    const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(req.userId);
    res.json({ balance: user.wallet_balance, bonusCoins: user.bonus_coins, transactions });
});

app.post('/api/wallet/add', auth, (req, res) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(amount, req.userId);
    db.prepare('INSERT INTO transactions (user_id, type, amount, description, reference) VALUES (?, ?, ?, ?, ?)')
        .run(req.userId, 'credit', amount, 'Added via UPI', 'upi_add');
    db.prepare('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)')
        .run(req.userId, 'wallet_topup', `Added ₹${amount} via UPI`);
    const user = db.prepare('SELECT wallet_balance, bonus_coins FROM users WHERE id = ?').get(req.userId);
    res.json({ balance: user.wallet_balance, bonusCoins: user.bonus_coins });
});

/* ──────────────────────────────────────────
   DELIVERY REQUESTS
   ────────────────────────────────────────── */

// Helper: avatars for delivery cards
const AVATARS = ['🧑‍🎓', '👨‍💻', '👩‍🎨', '🧑‍🍳', '👩‍💼', '🧑‍🔬', '👩‍🎓', '🎨', '🧑‍🏫', '👨‍🎓'];

function enrichDelivery(dr) {
    let items = [];
    try { items = JSON.parse(dr.items_json || '[]'); } catch { }
    return {
        id: dr.id,
        title: dr.title,
        category: dr.category || 'Food',
        requester: dr.requester_name || 'Student',
        avatar: AVATARS[dr.user_id % AVATARS.length],
        pickup: dr.pickup,
        drop: dr.drop_location,
        reward: dr.reward,
        tip: dr.tip,
        deadline: dr.deadline || '30 min',
        distance: '0.4 km',
        urgency: dr.urgency || 'medium',
        status: dr.status,
        items: Array.isArray(items) ? items : [],
        userId: dr.user_id,
        acceptedBy: dr.accepted_by,
        createdAt: dr.created_at,
    };
}

app.get('/api/deliveries', auth, (req, res) => {
    const requests = db.prepare("SELECT dr.*, u.first_name || ' ' || u.last_name as requester_name FROM delivery_requests dr JOIN users u ON dr.user_id = u.id WHERE dr.status = 'open' ORDER BY dr.created_at DESC").all();
    res.json({ requests: requests.map(enrichDelivery) });
});

app.post('/api/deliveries', auth, (req, res) => {
    const { title, category, pickup, dropLocation, reward, tip, deadline, urgency, items } = req.body;
    const rewardAmt = Number(reward) || 30;
    const tipAmt = Number(tip) || 0;
    const totalCost = rewardAmt + tipAmt;

    // Check wallet balance
    const user = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(req.userId);
    if (user.wallet_balance < totalCost) {
        return res.status(400).json({ error: `Insufficient wallet balance. Need ₹${totalCost}, have ₹${user.wallet_balance}` });
    }

    // Debit reward+tip from poster's wallet (escrow)
    db.prepare('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?').run(totalCost, req.userId);
    db.prepare('INSERT INTO transactions (user_id, type, amount, description, reference) VALUES (?, ?, ?, ?, ?)')
        .run(req.userId, 'debit', totalCost, `Delivery request: ${title}`, 'delivery_post');

    const result = db.prepare(
        'INSERT INTO delivery_requests (user_id, title, category, pickup, drop_location, reward, tip, deadline, urgency, items_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(req.userId, title, category || 'Food', pickup, dropLocation, rewardAmt, tipAmt, deadline || '30 min', urgency || 'medium', JSON.stringify(items || []));

    db.prepare('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)')
        .run(req.userId, 'delivery_posted', `Posted: ${title}`);

    // Return delivery + updated wallet
    const updatedUser = db.prepare('SELECT wallet_balance, bonus_coins FROM users WHERE id = ?').get(req.userId);
    const dr = db.prepare("SELECT dr.*, u.first_name || ' ' || u.last_name as requester_name FROM delivery_requests dr JOIN users u ON dr.user_id = u.id WHERE dr.id = ?").get(result.lastInsertRowid);
    res.json({ delivery: enrichDelivery(dr), balance: updatedUser.wallet_balance, bonusCoins: updatedUser.bonus_coins });
});

app.post('/api/deliveries/:id/accept', auth, (req, res) => {
    const delivery = db.prepare('SELECT * FROM delivery_requests WHERE id = ?').get(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Not found' });
    if (delivery.user_id === req.userId) return res.status(400).json({ error: 'Cannot accept your own request' });

    db.prepare("UPDATE delivery_requests SET status = 'accepted', accepted_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(req.userId, req.params.id);
    db.prepare('INSERT INTO activity_log (user_id, action, details, points) VALUES (?, ?, ?, ?)')
        .run(req.userId, 'delivery_accepted', `Accepted delivery #${req.params.id}`, 10);
    db.prepare('UPDATE users SET points = points + 10 WHERE id = ?').run(req.userId);
    res.json({ success: true });
});

app.post('/api/deliveries/:id/complete', auth, (req, res) => {
    const delivery = db.prepare('SELECT * FROM delivery_requests WHERE id = ?').get(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Not found' });

    db.prepare("UPDATE delivery_requests SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);

    // Credit the delivery partner
    const totalEarning = delivery.reward + delivery.tip;
    db.prepare('UPDATE users SET wallet_balance = wallet_balance + ?, deliveries = deliveries + 1, points = points + ? WHERE id = ?')
        .run(totalEarning, delivery.reward, req.userId);
    db.prepare('INSERT INTO transactions (user_id, type, amount, description, reference) VALUES (?, ?, ?, ?, ?)')
        .run(req.userId, 'credit', totalEarning, `Delivery reward + tip`, `delivery_${req.params.id}`);
    db.prepare('INSERT INTO activity_log (user_id, action, details, points) VALUES (?, ?, ?, ?)')
        .run(req.userId, 'delivery_completed', `Completed delivery #${req.params.id}`, delivery.reward);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    res.json({ success: true, earned: totalEarning, user: sanitizeUser(updatedUser) });
});

/* ──────────────────────────────────────────
   DISPUTES
   ────────────────────────────────────────── */

app.post('/api/disputes', auth, (req, res) => {
    const { orderId, issueType, description, photoUrl } = req.body;
    db.prepare('INSERT INTO disputes (user_id, order_id, issue_type, description, photo_url) VALUES (?, ?, ?, ?, ?)')
        .run(req.userId, orderId, issueType, description || '', photoUrl || '');
    db.prepare('UPDATE orders SET has_issue = 1 WHERE id = ?').run(orderId);
    db.prepare('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)')
        .run(req.userId, 'dispute_filed', `Issue: ${issueType} on order #${orderId}`);
    res.json({ success: true });
});

/* ──────────────────────────────────────────
   ACTIVITY LOG
   ────────────────────────────────────────── */

app.get('/api/activity', auth, (req, res) => {
    const logs = db.prepare('SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(req.userId);
    res.json({ activity: logs });
});

/* ──────────────────────────────────────────
   HELPERS
   ────────────────────────────────────────── */

function sanitizeUser(user) {
    const { mobile, ...safe } = user;
    return {
        id: safe.id,
        email: safe.email,
        fullName: safe.full_name,
        firstName: safe.first_name,
        lastName: safe.last_name,
        avatarUrl: safe.avatar_url,
        mobile: mobile?.startsWith('pwd:') ? '' : (mobile || ''),
        hostelBlock: safe.hostel_block,
        roomNumber: safe.room_number,
        trustScore: safe.trust_score,
        deliveries: safe.deliveries,
        points: safe.points,
        rating: safe.rating,
        walletBalance: safe.wallet_balance,
        bonusCoins: safe.bonus_coins,
        googleLinked: !!safe.google_id,
        createdAt: safe.created_at,
    };
}

/* ── Start ── */
app.listen(PORT, () => {
    console.log(`🚀 StudentLoop API running on http://localhost:${PORT}`);
    console.log(`📦 Database: ${db.name}`);
    console.log(`🔐 Google Client ID: ${GOOGLE_CLIENT_ID ? 'Configured' : '⚠️  Not set — add GOOGLE_CLIENT_ID to .env'}`);
});
