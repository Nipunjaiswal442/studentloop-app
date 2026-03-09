"""
StudentLoop — Python/Flask Backend Server
Replaces server/index.js entirely.

All SQL has been moved from raw Node.js to Python with sqlite3.
Authentication uses bcrypt password hashing + JWT (no Google OAuth dependency).
"""

import os
import json
import time
import math
import random
import functools
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt as pyjwt
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from dotenv import load_dotenv

from db import get_db, init_db, dict_row, dict_rows, close_db

# ── Load env ──
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env'))

app = Flask(__name__)
CORS(app, supports_credentials=True)

with app.app_context():
    init_db()

PORT = int(os.environ.get('PORT', 3001))
JWT_SECRET = os.environ.get('JWT_SECRET', 'studentloop-dev-secret-key-2026')


# ── DB lifecycle ──
@app.teardown_appcontext
def teardown_db(exception):
    close_db()


# ═══════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════

AVATARS = ['🧑‍🎓', '👨‍💻', '👩‍🎨', '🧑‍🍳', '👩‍💼', '🧑‍🔬', '👩‍🎓', '🎨', '🧑‍🏫', '👨‍🎓']


def sign_token(user_id: int) -> str:
    payload = {
        'userId': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(days=7),
        'iat': datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm='HS256')


def session_expiry() -> str:
    return (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


def sanitize_user(user: dict) -> dict:
    return {
        'id': user['id'],
        'email': user['email'],
        'fullName': user['full_name'],
        'firstName': user['first_name'],
        'lastName': user['last_name'],
        'avatarUrl': user['avatar_url'],
        'mobile': user.get('mobile', ''),
        'hostelBlock': user['hostel_block'],
        'roomNumber': user['room_number'],
        'trustScore': user['trust_score'],
        'deliveries': user['deliveries'],
        'points': user['points'],
        'rating': user['rating'],
        'walletBalance': user['wallet_balance'],
        'bonusCoins': user['bonus_coins'],
        'googleLinked': bool(user.get('google_id')),
        'createdAt': user['created_at'],
    }


def enrich_delivery(dr: dict) -> dict:
    items = []
    try:
        items = json.loads(dr.get('items_json') or '[]')
    except Exception:
        pass
    return {
        'id': dr['id'],
        'title': dr['title'],
        'category': dr.get('category', 'Food'),
        'requester': dr.get('requester_name', 'Student'),
        'avatar': AVATARS[dr['user_id'] % len(AVATARS)],
        'pickup': dr['pickup'],
        'drop': dr['drop_location'],
        'reward': dr['reward'],
        'tip': dr['tip'],
        'deadline': dr.get('deadline', '30 min'),
        'distance': '0.4 km',
        'urgency': dr.get('urgency', 'medium'),
        'status': dr['status'],
        'items': items if isinstance(items, list) else [],
        'userId': dr['user_id'],
        'acceptedBy': dr.get('accepted_by'),
        'createdAt': dr['created_at'],
    }


# ── Middleware: auth guard ──
def auth_required(f):
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        header = request.headers.get('Authorization', '')
        if not header.startswith('Bearer '):
            return jsonify({'error': 'No token'}), 401
        token = header[7:]
        try:
            decoded = pyjwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            g.user_id = decoded['userId']
        except pyjwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except pyjwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return wrapper


# ═══════════════════════════════════════════
#  AUTH ROUTES
# ═══════════════════════════════════════════

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.get_json(force=True)
    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')
    full_name = (data.get('fullName') or '').strip()

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    if len(password) < 4:
        return jsonify({'error': 'Password must be at least 4 characters'}), 400

    db = get_db()
    existing = db.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
    if existing:
        return jsonify({'error': 'Account already exists. Please sign in.'}), 409

    name_parts = full_name.split(' ', 1)
    first_name = name_parts[0] if name_parts else ''
    last_name = name_parts[1] if len(name_parts) > 1 else ''
    pw_hash = hash_password(password)

    cur = db.execute(
        'INSERT INTO users (email, full_name, first_name, last_name, password_hash) VALUES (?, ?, ?, ?, ?)',
        (email, full_name, first_name, last_name, pw_hash)
    )
    user_id = cur.lastrowid
    db.commit()

    # Welcome bonus
    db.execute(
        'INSERT INTO transactions (user_id, type, amount, description, reference) VALUES (?, ?, ?, ?, ?)',
        (user_id, 'credit', 500, 'Welcome bonus', 'welcome')
    )
    db.execute(
        'INSERT INTO activity_log (user_id, action, details, points) VALUES (?, ?, ?, ?)',
        (user_id, 'account_created', 'Signed up via email', 100)
    )
    db.execute('UPDATE users SET points = points + 100, bonus_coins = bonus_coins + 50 WHERE id = ?', (user_id,))
    db.commit()

    token = sign_token(user_id)
    db.execute(
        'INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
        (user_id, token, request.remote_addr or '', request.headers.get('User-Agent', ''), session_expiry())
    )
    db.commit()

    user = dict_row(db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone())
    return jsonify({'token': token, 'user': sanitize_user(user)})


@app.route('/api/auth/signin', methods=['POST'])
def signin():
    data = request.get_json(force=True)
    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    db = get_db()
    row = db.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    if not row:
        return jsonify({'error': 'Account not found. Please sign up first.'}), 401

    user = dict_row(row)
    pw_hash = user.get('password_hash', '')

    # Backward compat: check old-style pwd stored in mobile field
    old_pwd = user.get('mobile', '')
    if old_pwd and old_pwd.startswith('pwd:'):
        import base64
        old_plain = base64.b64decode(old_pwd[4:]).decode()
        if old_plain == password:
            # Migrate to bcrypt
            new_hash = hash_password(password)
            db.execute('UPDATE users SET password_hash = ?, mobile = ? WHERE id = ?', (new_hash, '', user['id']))
            db.commit()
            pw_hash = new_hash
        else:
            return jsonify({'error': 'Invalid password'}), 401
    elif pw_hash:
        if not verify_password(password, pw_hash):
            return jsonify({'error': 'Invalid password'}), 401
    else:
        return jsonify({'error': 'No password set. Please sign up or reset password.'}), 401

    token = sign_token(user['id'])
    db.execute(
        'INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
        (user['id'], token, request.remote_addr or '', request.headers.get('User-Agent', ''), session_expiry())
    )
    db.execute(
        'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)',
        (user['id'], 'sign_in', 'Email sign-in')
    )
    db.commit()

    return jsonify({'token': token, 'user': sanitize_user(user)})


@app.route('/api/auth/me', methods=['GET'])
@auth_required
def auth_me():
    db = get_db()
    row = db.execute('SELECT * FROM users WHERE id = ?', (g.user_id,)).fetchone()
    if not row:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': sanitize_user(dict_row(row))})


# ═══════════════════════════════════════════
#  USER PROFILE
# ═══════════════════════════════════════════

@app.route('/api/profile', methods=['PUT'])
@auth_required
def update_profile():
    data = request.get_json(force=True)
    db = get_db()

    db.execute("""
        UPDATE users SET
            first_name = COALESCE(?, first_name),
            last_name = COALESCE(?, last_name),
            hostel_block = COALESCE(?, hostel_block),
            room_number = COALESCE(?, room_number),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (
        data.get('firstName'),
        data.get('lastName'),
        data.get('hostelBlock'),
        data.get('roomNumber'),
        g.user_id
    ))

    mobile = data.get('mobile')
    if mobile:
        db.execute('UPDATE users SET mobile = ? WHERE id = ?', (mobile, g.user_id))

    db.execute(
        'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)',
        (g.user_id, 'profile_updated', 'Profile details updated')
    )
    db.commit()

    user = dict_row(db.execute('SELECT * FROM users WHERE id = ?', (g.user_id,)).fetchone())
    return jsonify({'user': sanitize_user(user)})


# ═══════════════════════════════════════════
#  ORDERS
# ═══════════════════════════════════════════

@app.route('/api/orders', methods=['POST'])
@auth_required
def create_order():
    data = request.get_json(force=True)
    items = data.get('items', [])
    shop_id = data.get('shopId', 0)
    shop_name = data.get('shopName', '')
    total = data.get('total', 0)
    tip = data.get('tip', 0)
    hostel = data.get('hostel', '')
    room = data.get('room', '')

    otp = str(random.randint(1000, 9999))
    order_code = f"ORD-{str(int(time.time() * 1000))[-6:]}"

    db = get_db()
    cur = db.execute(
        'INSERT INTO orders (order_code, user_id, shop_id, shop_name, total, tip, hostel, room, otp, delivery_reward) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        (order_code, g.user_id, shop_id, shop_name, total, tip, hostel, room, otp, 30 + tip)
    )
    order_id = cur.lastrowid

    for item in items:
        db.execute(
            'INSERT INTO order_items (order_id, menu_item_id, name, price, qty, special_instructions) VALUES (?, ?, ?, ?, ?, ?)',
            (order_id, item.get('id', 0), item.get('name', ''), item.get('price', 0), item.get('qty', 1), item.get('specialInstructions', ''))
        )

    # Debit wallet
    db.execute('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?', (total, g.user_id))
    db.execute(
        'INSERT INTO transactions (user_id, type, amount, description, reference) VALUES (?, ?, ?, ?, ?)',
        (g.user_id, 'debit', total, f'Order {order_code} — {shop_name}', order_code)
    )

    # Bonus coins
    bonus_coins = math.floor(total * 0.05)
    db.execute('UPDATE users SET bonus_coins = bonus_coins + ? WHERE id = ?', (bonus_coins, g.user_id))

    # Activity
    db.execute(
        'INSERT INTO activity_log (user_id, action, details, points) VALUES (?, ?, ?, ?)',
        (g.user_id, 'order_placed', f'Ordered from {shop_name}', bonus_coins)
    )
    db.commit()

    order = dict_row(db.execute('SELECT * FROM orders WHERE id = ?', (order_id,)).fetchone())
    order_items = dict_rows(db.execute('SELECT * FROM order_items WHERE order_id = ?', (order_id,)).fetchall())
    order['items'] = order_items
    return jsonify({'order': order})


@app.route('/api/orders', methods=['GET'])
@auth_required
def list_orders():
    db = get_db()
    orders = dict_rows(db.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', (g.user_id,)).fetchall())
    for o in orders:
        o['items'] = dict_rows(db.execute('SELECT * FROM order_items WHERE order_id = ?', (o['id'],)).fetchall())
    return jsonify({'orders': orders})


@app.route('/api/orders/<int:order_id>/status', methods=['PATCH'])
@auth_required
def update_order_status(order_id):
    data = request.get_json(force=True)
    status = data.get('status', '')
    db = get_db()
    db.execute('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', (status, order_id))
    db.execute(
        'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)',
        (g.user_id, 'order_status_updated', f'Order #{order_id} → {status}')
    )
    db.commit()
    return jsonify({'success': True})


# ═══════════════════════════════════════════
#  WALLET & TRANSACTIONS
# ═══════════════════════════════════════════

@app.route('/api/wallet', methods=['GET'])
@auth_required
def get_wallet():
    db = get_db()
    user = dict_row(db.execute('SELECT wallet_balance, bonus_coins FROM users WHERE id = ?', (g.user_id,)).fetchone())
    txns = dict_rows(db.execute('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', (g.user_id,)).fetchall())
    return jsonify({'balance': user['wallet_balance'], 'bonusCoins': user['bonus_coins'], 'transactions': txns})


@app.route('/api/wallet/add', methods=['POST'])
@auth_required
def add_money():
    data = request.get_json(force=True)
    amount = data.get('amount', 0)
    if not amount or amount <= 0:
        return jsonify({'error': 'Invalid amount'}), 400

    db = get_db()
    db.execute('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', (amount, g.user_id))
    db.execute(
        'INSERT INTO transactions (user_id, type, amount, description, reference) VALUES (?, ?, ?, ?, ?)',
        (g.user_id, 'credit', amount, 'Added via UPI', 'upi_add')
    )
    db.execute(
        'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)',
        (g.user_id, 'wallet_topup', f'Added ₹{amount} via UPI')
    )
    db.commit()

    user = dict_row(db.execute('SELECT wallet_balance, bonus_coins FROM users WHERE id = ?', (g.user_id,)).fetchone())
    return jsonify({'balance': user['wallet_balance'], 'bonusCoins': user['bonus_coins']})


# ═══════════════════════════════════════════
#  DELIVERY REQUESTS
# ═══════════════════════════════════════════

@app.route('/api/deliveries', methods=['GET'])
@auth_required
def list_deliveries():
    db = get_db()
    rows = db.execute("""
        SELECT dr.*, u.first_name || ' ' || u.last_name as requester_name
        FROM delivery_requests dr
        JOIN users u ON dr.user_id = u.id
        WHERE dr.status = 'open'
        ORDER BY dr.created_at DESC
    """).fetchall()
    return jsonify({'requests': [enrich_delivery(dict_row(r)) for r in rows]})


@app.route('/api/deliveries', methods=['POST'])
@auth_required
def create_delivery():
    data = request.get_json(force=True)
    title = data.get('title', '')
    category = data.get('category', 'Food')
    pickup = data.get('pickup', '')
    drop_location = data.get('dropLocation', '')
    reward_amt = int(data.get('reward', 30) or 30)
    tip_amt = int(data.get('tip', 0) or 0)
    deadline = data.get('deadline', '30 min')
    urgency = data.get('urgency', 'medium')
    items = data.get('items', [])
    total_cost = reward_amt + tip_amt

    db = get_db()

    # Check wallet balance
    user = dict_row(db.execute('SELECT wallet_balance FROM users WHERE id = ?', (g.user_id,)).fetchone())
    if user['wallet_balance'] < total_cost:
        return jsonify({'error': f"Insufficient wallet balance. Need ₹{total_cost}, have ₹{user['wallet_balance']}"}), 400

    # Debit
    db.execute('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?', (total_cost, g.user_id))
    db.execute(
        'INSERT INTO transactions (user_id, type, amount, description, reference) VALUES (?, ?, ?, ?, ?)',
        (g.user_id, 'debit', total_cost, f'Delivery request: {title}', 'delivery_post')
    )

    cur = db.execute(
        'INSERT INTO delivery_requests (user_id, title, category, pickup, drop_location, reward, tip, deadline, urgency, items_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        (g.user_id, title, category, pickup, drop_location, reward_amt, tip_amt, deadline, urgency, json.dumps(items))
    )
    dr_id = cur.lastrowid

    db.execute(
        'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)',
        (g.user_id, 'delivery_posted', f'Posted: {title}')
    )
    db.commit()

    updated_user = dict_row(db.execute('SELECT wallet_balance, bonus_coins FROM users WHERE id = ?', (g.user_id,)).fetchone())
    dr = dict_row(db.execute("""
        SELECT dr.*, u.first_name || ' ' || u.last_name as requester_name
        FROM delivery_requests dr JOIN users u ON dr.user_id = u.id
        WHERE dr.id = ?
    """, (dr_id,)).fetchone())

    return jsonify({
        'delivery': enrich_delivery(dr),
        'balance': updated_user['wallet_balance'],
        'bonusCoins': updated_user['bonus_coins'],
    })


@app.route('/api/deliveries/<int:dr_id>/accept', methods=['POST'])
@auth_required
def accept_delivery(dr_id):
    db = get_db()
    row = db.execute('SELECT * FROM delivery_requests WHERE id = ?', (dr_id,)).fetchone()
    if not row:
        return jsonify({'error': 'Not found'}), 404
    delivery = dict_row(row)
    if delivery['user_id'] == g.user_id:
        return jsonify({'error': 'Cannot accept your own request'}), 400

    db.execute(
        "UPDATE delivery_requests SET status = 'accepted', accepted_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (g.user_id, dr_id)
    )
    db.execute(
        'INSERT INTO activity_log (user_id, action, details, points) VALUES (?, ?, ?, ?)',
        (g.user_id, 'delivery_accepted', f'Accepted delivery #{dr_id}', 10)
    )
    db.execute('UPDATE users SET points = points + 10 WHERE id = ?', (g.user_id,))
    db.commit()
    return jsonify({'success': True})


@app.route('/api/deliveries/<int:dr_id>/complete', methods=['POST'])
@auth_required
def complete_delivery(dr_id):
    db = get_db()
    row = db.execute('SELECT * FROM delivery_requests WHERE id = ?', (dr_id,)).fetchone()
    if not row:
        return jsonify({'error': 'Not found'}), 404
    delivery = dict_row(row)

    db.execute("UPDATE delivery_requests SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (dr_id,))

    total_earning = delivery['reward'] + delivery['tip']
    db.execute(
        'UPDATE users SET wallet_balance = wallet_balance + ?, deliveries = deliveries + 1, points = points + ? WHERE id = ?',
        (total_earning, delivery['reward'], g.user_id)
    )
    db.execute(
        'INSERT INTO transactions (user_id, type, amount, description, reference) VALUES (?, ?, ?, ?, ?)',
        (g.user_id, 'credit', total_earning, 'Delivery reward + tip', f'delivery_{dr_id}')
    )
    db.execute(
        'INSERT INTO activity_log (user_id, action, details, points) VALUES (?, ?, ?, ?)',
        (g.user_id, 'delivery_completed', f'Completed delivery #{dr_id}', delivery['reward'])
    )
    db.commit()

    updated_user = dict_row(db.execute('SELECT * FROM users WHERE id = ?', (g.user_id,)).fetchone())
    return jsonify({'success': True, 'earned': total_earning, 'user': sanitize_user(updated_user)})


# ═══════════════════════════════════════════
#  DISPUTES
# ═══════════════════════════════════════════

@app.route('/api/disputes', methods=['POST'])
@auth_required
def create_dispute():
    data = request.get_json(force=True)
    db = get_db()
    db.execute(
        'INSERT INTO disputes (user_id, order_id, issue_type, description, photo_url) VALUES (?, ?, ?, ?, ?)',
        (g.user_id, data.get('orderId'), data.get('issueType', ''), data.get('description', ''), data.get('photoUrl', ''))
    )
    db.execute('UPDATE orders SET has_issue = 1 WHERE id = ?', (data.get('orderId'),))
    db.execute(
        'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)',
        (g.user_id, 'dispute_filed', f"Issue: {data.get('issueType')} on order #{data.get('orderId')}")
    )
    db.commit()
    return jsonify({'success': True})


# ═══════════════════════════════════════════
#  ACTIVITY LOG
# ═══════════════════════════════════════════

@app.route('/api/activity', methods=['GET'])
@auth_required
def list_activity():
    db = get_db()
    logs = dict_rows(db.execute('SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', (g.user_id,)).fetchall())
    return jsonify({'activity': logs})


# ═══════════════════════════════════════════
#  SHOPS
# ═══════════════════════════════════════════

@app.route('/api/shops', methods=['GET'])
def list_shops():
    db = get_db()
    shops = dict_rows(db.execute('SELECT * FROM shops ORDER BY created_at DESC').fetchall())
    for s in shops:
        s['menu'] = dict_rows(db.execute('SELECT * FROM menu_items WHERE shop_id = ?', (s['id'],)).fetchall())
    return jsonify({'shops': shops})


@app.route('/api/shops', methods=['POST'])
@auth_required
def create_shop():
    data = request.get_json(force=True)
    name = data.get('name', '')
    category = data.get('category', 'Food')
    menu_items = data.get('menu', [])
    image = data.get('image', '🏪')
    
    if not name:
        return jsonify({'error': 'Shop name is required'}), 400
        
    db = get_db()
    
    cur = db.execute(
        'INSERT INTO shops (name, category, image, distance, rating, delivery_time) VALUES (?, ?, ?, ?, ?, ?)',
        (name, category, image, '0.1 km', 5.0, '10 min')
    )
    shop_id = cur.lastrowid
    
    for item in menu_items:
        db.execute(
            'INSERT INTO menu_items (shop_id, name, price, description) VALUES (?, ?, ?, ?)',
            (shop_id, item.get('name', ''), item.get('price', 0), item.get('description', ''))
        )
        
    db.commit()
    
    shop = dict_row(db.execute('SELECT * FROM shops WHERE id = ?', (shop_id,)).fetchone())
    shop['menu'] = dict_rows(db.execute('SELECT * FROM menu_items WHERE shop_id = ?', (shop_id,)).fetchall())
    
    return jsonify({'shop': shop})


# ═══════════════════════════════════════════
#  HEALTH CHECK
# ═══════════════════════════════════════════

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'service': 'StudentLoop API (Python)',
        'version': '2.0.0',
        'timestamp': datetime.now(timezone.utc).isoformat(),
    })


# ── Start ──
if __name__ == '__main__':
    init_db()
    print(f"🚀 StudentLoop API (Python/Flask) running on http://localhost:{PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=True)
