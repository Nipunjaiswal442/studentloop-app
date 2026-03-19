/* ── TYPES ── */
export type Screen =
    | 'landing' | 'onboarding' | 'home' | 'post' | 'accept' | 'tracking' | 'profile'
    | 'wallet' | 'shop' | 'cart' | 'orderSummary' | 'orderTracking'
    | 'deliveryDashboard' | 'deliveryAccepted' | 'uploadBill' | 'otpConfirm'
    | 'orderHistory' | 'reportIssue' | 'addShop';

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
