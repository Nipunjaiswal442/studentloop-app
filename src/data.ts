/* ── TYPES ── */
export type Screen =
    | 'landing' | 'onboarding' | 'home' | 'post' | 'accept' | 'tracking' | 'profile'
    | 'wallet' | 'shop' | 'cart' | 'orderSummary' | 'orderTracking'
    | 'deliveryDashboard' | 'deliveryAccepted' | 'uploadBill' | 'otpConfirm'
    | 'orderHistory' | 'reportIssue' | 'addShop' | 'chatbot' | 'terms';

export type Tab = 'home' | 'post' | 'deliveries' | 'wallet' | 'profile';

export interface Shop {
    id: number; name: string; category: string; distance: string;
    rating: number; image: string; deliveryTime: string;
}

export interface MenuItem {
    id: number; name: string; price: number; description: string; shopId: number;
}

export interface CartItem extends MenuItem {
    qty: number; specialInstructions: string;
}

export interface Order {
    id: string; items: CartItem[]; shop: Shop; total: number; tip: number;
    status: 'pending' | 'accepted' | 'purchased' | 'out_for_delivery' | 'delivered';
    hostel: string; room: string; otp: string; timestamp: string;
    deliveryReward: number; hasIssue?: boolean;
}

export interface DeliveryRequest {
    id: number; title: string; category: string; requester: string; avatar: string;
    pickup: string; drop: string; reward: number; deadline: string;
    distance: string; urgency: string; status: string; tip: number;
    items: string[]; createdAt?: string;
}

export interface Profile {
    firstName: string; lastName: string; mobile: string; email: string;
    hostelBlock: string; roomNumber: string; trustScore: number;
    deliveries: number; points: number; rating: number;
}

/* ── CONSTANTS ── */
export const CATEGORIES = ['All', 'Food', 'Stationery', 'Medicines', 'Groceries'];
export const CAT_EMOJIS: Record<string, string> = {
    All: '📦', Food: '🍔', Stationery: '✏️', Medicines: '💊', Groceries: '🛒',
};

/* ── MOCK DATA ── */
export const SHOPS: Shop[] = [
    { id: 1, name: 'Blue Tokai Café', category: 'Food', distance: '0.3 km', rating: 4.7, image: '☕', deliveryTime: '15 min' },
    { id: 2, name: 'Campus Canteen', category: 'Food', distance: '0.2 km', rating: 4.3, image: '🍛', deliveryTime: '20 min' },
    { id: 3, name: 'Healthy Bites', category: 'Food', distance: '0.5 km', rating: 4.5, image: '🥗', deliveryTime: '18 min' },
    { id: 4, name: 'Campus Store', category: 'Stationery', distance: '0.4 km', rating: 4.2, image: '📝', deliveryTime: '10 min' },
    { id: 5, name: 'Pen & Paper Hub', category: 'Stationery', distance: '0.6 km', rating: 4.0, image: '🖊️', deliveryTime: '12 min' },
    { id: 6, name: 'MedPlus Pharmacy', category: 'Medicines', distance: '0.8 km', rating: 4.6, image: '💊', deliveryTime: '15 min' },
    { id: 7, name: 'Campus Chemist', category: 'Medicines', distance: '0.5 km', rating: 4.4, image: '🏥', deliveryTime: '12 min' },
    { id: 8, name: 'QuickMart', category: 'Groceries', distance: '0.7 km', rating: 4.1, image: '🛒', deliveryTime: '20 min' },
    { id: 9, name: 'Daily Needs Store', category: 'Groceries', distance: '0.3 km', rating: 4.3, image: '🏪', deliveryTime: '15 min' },
];

export const MENU_ITEMS: MenuItem[] = [
    { id: 1, name: 'Iced Latte', price: 180, description: 'Cold brewed with oat milk', shopId: 1 },
    { id: 2, name: 'Cappuccino', price: 150, description: 'Classic Italian style', shopId: 1 },
    { id: 3, name: 'Avocado Toast', price: 220, description: 'Sourdough with fresh avocado', shopId: 1 },
    { id: 4, name: 'Chicken Biryani', price: 120, description: 'Hyderabadi style with raita', shopId: 2 },
    { id: 5, name: 'Paneer Butter Masala', price: 100, description: 'Rich & creamy curry', shopId: 2 },
    { id: 6, name: 'Dal Makhani Thali', price: 90, description: 'Full thali with roti & rice', shopId: 2 },
    { id: 7, name: 'Caesar Salad', price: 160, description: 'Fresh romaine & croutons', shopId: 3 },
    { id: 8, name: 'A4 Sheets (500)', price: 250, description: 'JK Copier 75gsm', shopId: 4 },
    { id: 9, name: 'Gel Pen Set (5)', price: 80, description: 'Pilot V5 assorted', shopId: 4 },
    { id: 10, name: 'Notebook Combo', price: 150, description: '3 ruled + 1 plain', shopId: 5 },
    { id: 11, name: 'Crocin Advance', price: 30, description: 'Paracetamol 500mg x10', shopId: 6 },
    { id: 12, name: 'Band-Aid Pack', price: 45, description: 'Flexible fabric 20 strips', shopId: 6 },
    { id: 13, name: 'ORS Sachets', price: 25, description: 'Electrolyte replenisher x5', shopId: 7 },
    { id: 14, name: 'Maggi Noodles x6', price: 84, description: 'Masala flavor family pack', shopId: 8 },
    { id: 15, name: 'Amul Milk 1L', price: 66, description: 'Full cream toned milk', shopId: 8 },
    { id: 16, name: 'Bread Loaf', price: 45, description: 'Whole wheat sandwich bread', shopId: 9 },
];

export const DELIVERY_REQUESTS: DeliveryRequest[] = [
    { id: 1, title: 'Iced Latte + Cappuccino', category: 'Food', requester: 'Ananya S.', avatar: '🧑‍🎓', pickup: 'Blue Tokai Café, Gate 3', drop: 'Hostel 7, Room 312', reward: 45, deadline: '12 min', distance: '0.3 km', urgency: 'high', status: 'open', tip: 15, items: ['Iced Latte x1', 'Cappuccino x1'] },
    { id: 2, title: 'Notebooks + Pens', category: 'Stationery', requester: 'Rohan M.', avatar: '👨‍💻', pickup: 'Campus Store', drop: 'Library, 2nd Floor', reward: 30, deadline: '25 min', distance: '0.5 km', urgency: 'medium', status: 'open', tip: 10, items: ['Notebook Combo x1', 'Gel Pen Set x2'] },
    { id: 3, title: 'Crocin + ORS', category: 'Medicines', requester: 'Priya K.', avatar: '👩‍🎨', pickup: 'MedPlus Pharmacy', drop: 'Hostel 3, Room 115', reward: 35, deadline: '15 min', distance: '0.8 km', urgency: 'high', status: 'open', tip: 20, items: ['Crocin Advance x1', 'ORS Sachets x2'] },
    { id: 4, title: 'Chicken Biryani Combo', category: 'Food', requester: 'Vikram D.', avatar: '🧑‍🍳', pickup: 'Campus Canteen', drop: 'Hostel 4, Room 108', reward: 50, deadline: '15 min', distance: '0.2 km', urgency: 'high', status: 'open', tip: 25, items: ['Chicken Biryani x2', 'Dal Makhani Thali x1'] },
    { id: 5, title: 'Maggi + Milk + Bread', category: 'Groceries', requester: 'Meera J.', avatar: '👩‍💼', pickup: 'QuickMart', drop: 'Hostel 5, Room 201', reward: 30, deadline: '30 min', distance: '0.7 km', urgency: 'medium', status: 'open', tip: 10, items: ['Maggi Noodles x6', 'Amul Milk 1L', 'Bread Loaf x1'] },
    { id: 6, title: 'A4 Sheets + Pens', category: 'Stationery', requester: 'Arjun P.', avatar: '🧑‍🔬', pickup: 'Pen & Paper Hub', drop: 'Academic Block, Room 204', reward: 25, deadline: '40 min', distance: '0.6 km', urgency: 'low', status: 'open', tip: 5, items: ['A4 Sheets (500) x1', 'Gel Pen Set x1'] },
    { id: 7, title: 'Band-Aid + Crocin', category: 'Medicines', requester: 'Sneha R.', avatar: '👩‍🎓', pickup: 'Campus Chemist', drop: 'Girls Hostel 2, Room 310', reward: 30, deadline: '10 min', distance: '0.5 km', urgency: 'high', status: 'open', tip: 15, items: ['Band-Aid Pack x1', 'Crocin Advance x2'] },
    { id: 8, title: 'Groceries Essentials', category: 'Groceries', requester: 'Dev T.', avatar: '🎨', pickup: 'Daily Needs Store', drop: 'Hostel 8, Room 402', reward: 35, deadline: '35 min', distance: '0.3 km', urgency: 'low', status: 'open', tip: 10, items: ['Bread Loaf x2', 'Amul Milk 1L x2'] },
];

export const SAMPLE_ORDERS: Order[] = [
    { id: 'ORD-001', items: [{ id: 1, name: 'Iced Latte', price: 180, description: '', shopId: 1, qty: 1, specialInstructions: '' }], shop: SHOPS[0], total: 195, tip: 15, status: 'delivered', hostel: 'Hostel 7', room: '312', otp: '4829', timestamp: '2h ago', deliveryReward: 45 },
    { id: 'ORD-002', items: [{ id: 4, name: 'Chicken Biryani', price: 120, description: '', shopId: 2, qty: 2, specialInstructions: 'Less spicy please' }], shop: SHOPS[1], total: 265, tip: 25, status: 'delivered', hostel: 'Hostel 4', room: '108', otp: '7351', timestamp: '5h ago', deliveryReward: 50 },
    { id: 'ORD-003', items: [{ id: 11, name: 'Crocin Advance', price: 30, description: '', shopId: 6, qty: 1, specialInstructions: '' }], shop: SHOPS[5], total: 50, tip: 20, status: 'delivered', hostel: 'Hostel 3', room: '115', otp: '2194', timestamp: '1d ago', deliveryReward: 35, hasIssue: false },
];

export const DEFAULT_PROFILE: Profile = {
    firstName: '', lastName: '', mobile: '', email: '',
    hostelBlock: '', roomNumber: '', trustScore: 87,
    deliveries: 47, points: 1280, rating: 4.9,
};

export const ISSUE_TYPES = [
    'Wrong items received', 'Items damaged', 'Items missing',
    'Delayed delivery', 'Rude behaviour', 'Other',
];

export const ACTIVITY = [
    { text: 'Delivered Biryani to Hostel 4', pts: '+50 pts', time: '2h ago' },
    { text: 'Picked up Meds from MedPlus', pts: '+35 pts', time: '5h ago' },
    { text: 'Completed 5-star delivery streak!', pts: '+100 pts', time: '1d ago' },
    { text: 'Delivered Stationery to Library', pts: '+25 pts', time: '2d ago' },
];

export const urgencyColor = (u: string) =>
    u === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
        u === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
            'bg-green-500/20 text-green-400 border-green-500/30';

/* ── CHATBOT FAQ ── */
export interface ChatFAQ {
    category: string;
    icon: string;
    questions: { q: string; a: string }[];
}

export const CHATBOT_FAQ: ChatFAQ[] = [
    {
        category: 'Account', icon: '👤',
        questions: [
            { q: 'How do I create an account?', a: 'Sign up using your college email and a password. You can also use Google Sign-In for quick access. A welcome bonus of ₹500 is credited to your wallet on sign-up.' },
            { q: 'How do I reset my password?', a: 'Currently, please contact support at support@studentloop.com to reset your password. We are working on adding an in-app password reset feature.' },
            { q: 'Can I change my email?', a: 'Your email is linked to your college identity and cannot be changed. If you need help, contact support.' },
            { q: 'What is Trust Score?', a: 'Trust Score reflects your reliability on the platform. It increases with successful deliveries, positive ratings, and timely completions. Higher scores get priority matching.' },
        ]
    },
    {
        category: 'Wallet & Payments', icon: '💰',
        questions: [
            { q: 'How do I add money to my wallet?', a: 'Go to the Wallet tab, enter the amount, and click "Add via UPI". The money will be credited instantly to your StudentLoop wallet.' },
            { q: 'Why was my payment declined?', a: 'Payments are declined when your wallet balance is insufficient. Please add money to your wallet first, then retry your order or delivery request.' },
            { q: 'Where can I see my transactions?', a: 'All transactions (credits and debits) are visible in the Wallet tab under "Recent Transactions". They persist across sessions.' },
            { q: 'How do I earn bonus coins?', a: 'Bonus coins are earned automatically — 5% of every order amount. You also earn coins for completing deliveries and signing up.' },
        ]
    },
    {
        category: 'Orders & Delivery', icon: '📦',
        questions: [
            { q: 'How do I place an order?', a: 'Browse shops on the Home tab, add items to cart, set delivery location and tip, then confirm. The total is deducted from your wallet and a delivery request is created.' },
            { q: 'How does delivery matching work?', a: 'When you place an order, it appears on the Delivery Dashboard. Nearby carriers can accept and deliver it. You can track progress in real-time.' },
            { q: 'What is the OTP for?', a: 'The 4-digit OTP ensures your delivery reaches the right person. Share it with your carrier only upon receiving your items.' },
            { q: 'How do I report an issue?', a: 'Go to Profile → Order History → select the order → Report Issue. Choose the issue type, optionally upload a photo, and submit.' },
        ]
    },
    {
        category: 'Delivering & Earning', icon: '🚚',
        questions: [
            { q: 'How do I start delivering?', a: 'Go to the Deliver tab to see open requests near you. Accept one, purchase the items, upload the bill, deliver to the requester, and get the OTP to confirm completion.' },
            { q: 'How much can I earn?', a: 'Each delivery has a base reward (set by the requester) plus a tip. Typical earnings range from ₹25 to ₹75 per delivery. Your earnings are credited instantly.' },
            { q: 'What if I can\'t complete a delivery?', a: 'If you cannot complete an accepted delivery, please contact the requester via in-app chat. Repeated cancellations may affect your Trust Score.' },
        ]
    },
    {
        category: 'Safety & Privacy', icon: '🔒',
        questions: [
            { q: 'Is my data secure?', a: 'Yes. All data is encrypted using AES-256 encryption. Your personal information is never shared with other users without your consent.' },
            { q: 'Who can see my information?', a: 'Other users can only see your first name and Trust Score. Your email, phone number, and room details are only shared with matched carriers.' },
            { q: 'How do I report a user?', a: 'You can report issues through the Order History → Report Issue flow. Our team reviews all reports within 24 hours.' },
        ]
    },
];

/* ── TERMS & CONDITIONS ── */
export const TERMS_AND_CONDITIONS = `
## Terms and Conditions — StudentLoop

**Last Updated:** March 2026

### 1. Acceptance of Terms
By accessing or using the StudentLoop platform, you agree to be bound by these Terms and Conditions. If you do not agree, you may not use the service.

### 2. Eligibility
StudentLoop is available exclusively to verified students of participating educational institutions. You must have a valid college email address to register.

### 3. Account Responsibility
You are responsible for maintaining the confidentiality of your account credentials. Any activity under your account is your responsibility.

### 4. Wallet & Payments
- Wallet balances are non-refundable except in cases of verified disputes.
- All payments for orders and delivery requests are deducted from your wallet.
- You must maintain sufficient balance before placing orders.
- Bonus coins are promotional and cannot be converted to cash.

### 5. Delivery Terms
- Carriers are independent student peers, not employees of StudentLoop.
- StudentLoop is not liable for the quality, condition, or accuracy of delivered items.
- Tips are voluntary and go directly to the carrier.
- OTP verification is mandatory for delivery confirmation.

### 6. User Conduct
- You agree not to misuse the platform for any unlawful activity.
- Any form of harassment, fraud, or abuse may result in immediate account suspension.
- You must provide accurate information in all orders and requests.

### 7. Privacy
- We collect and process your data as described in our Privacy Policy.
- Your personal information is encrypted and never sold to third parties.
- Location and activity data is used solely for service improvement.

### 8. Disputes
- Users may file disputes through the in-app reporting system.
- StudentLoop will mediate disputes but is not liable for losses.
- Decisions made by the dispute resolution team are final.

### 9. Limitation of Liability
StudentLoop is provided \"as is\" without warranties. We are not responsible for any direct, indirect, or consequential damages arising from use of the platform.

### 10. Changes to Terms
We reserve the right to modify these terms at any time. Continued use of the platform constitutes acceptance of updated terms.

**By checking the box below, you acknowledge that you have read, understood, and agree to these Terms and Conditions.**
`;
