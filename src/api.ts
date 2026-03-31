/* ── StudentLoop API Client ── */
/* Updated: Removed Google OAuth, uses email/password auth only */

const API_BASE = import.meta.env.VITE_API_URL || '';

function getToken(): string | null {
    return localStorage.getItem('sl_token');
}

export function setToken(token: string) {
    localStorage.setItem('sl_token', token);
}

export function clearToken() {
    localStorage.removeItem('sl_token');
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...opts.headers as Record<string, string> };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Request failed');
    }
    return res.json();
}

/* ── Auth ── */
export interface ApiUser {
    id: number; email: string; fullName: string; firstName: string; lastName: string;
    avatarUrl: string; mobile: string; hostelBlock: string; roomNumber: string;
    trustScore: number; deliveries: number; points: number; rating: number;
    walletBalance: number; bonusCoins: number; googleLinked: boolean; createdAt: string;
}

interface AuthResponse { token: string; user: ApiUser; }

export interface ApiDeliveryRequest {
    id: number; title: string; category: string; requester: string; avatar: string;
    pickup: string; drop: string; reward: number; tip: number; deadline: string;
    distance: string; urgency: string; status: string; items: string[];
    userId: number; acceptedBy: number | null; createdAt: string;
}

export const api = {
    auth: {
        signIn: (email: string, password: string) =>
            request<AuthResponse>('/api/auth/signin', { method: 'POST', body: JSON.stringify({ email, password }) }),

        signUp: (email: string, password: string, fullName: string) =>
            request<AuthResponse>('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, fullName }) }),

        googleAuth: (data: { email: string; displayName: string | null; uid: string; photoURL: string | null }) =>
            request<AuthResponse>('/api/auth/google', { method: 'POST', body: JSON.stringify(data) }),

        me: () => request<{ user: ApiUser }>('/api/auth/me'),
    },

    profile: {
        update: (data: { firstName?: string; lastName?: string; mobile?: string; hostelBlock?: string; roomNumber?: string }) =>
            request<{ user: ApiUser }>('/api/profile', { method: 'PUT', body: JSON.stringify(data) }),
    },

    orders: {
        create: (data: { items: any[]; shopId: number; shopName: string; total: number; tip: number; hostel: string; room: string }) =>
            request<{ order: any }>('/api/orders', { method: 'POST', body: JSON.stringify(data) }),

        list: () => request<{ orders: any[] }>('/api/orders'),

        updateStatus: (id: number, status: string) =>
            request<{ success: boolean }>(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    },

    wallet: {
        get: () => request<{ balance: number; bonusCoins: number; transactions: any[] }>('/api/wallet'),
        addMoney: (amount: number) => request<{ balance: number; bonusCoins: number }>('/api/wallet/add', { method: 'POST', body: JSON.stringify({ amount }) }),
    },

    deliveries: {
        list: () => request<{ requests: ApiDeliveryRequest[] }>('/api/deliveries'),
        create: (data: { title: string; category: string; pickup: string; dropLocation: string; reward: number; tip: number; deadline: string; urgency: string; items: string[] }) =>
            request<{ delivery: ApiDeliveryRequest; balance: number; bonusCoins: number }>('/api/deliveries', { method: 'POST', body: JSON.stringify(data) }),
        accept: (id: number) => request<{ success: boolean }>(`/api/deliveries/${id}/accept`, { method: 'POST' }),
        complete: (id: number) => request<{ success: boolean; earned: number; user: ApiUser }>(`/api/deliveries/${id}/complete`, { method: 'POST' }),
        createFromOrder: (data: { title: string; category: string; pickup: string; dropLocation: string; reward: number; tip: number; deadline: string; urgency: string; items: string[] }) =>
            request<{ delivery: ApiDeliveryRequest }>('/api/deliveries/from-order', { method: 'POST', body: JSON.stringify(data) }),
    },

    disputes: {
        create: (data: { orderId: number; issueType: string; description?: string; photoUrl?: string }) =>
            request<{ success: boolean }>('/api/disputes', { method: 'POST', body: JSON.stringify(data) }),
    },

    activity: {
        list: () => request<{ activity: any[] }>('/api/activity'),
    },

    chat: {
        gemini: (message: string) =>
            request<{ reply: string }>('/api/chat/gemini', { method: 'POST', body: JSON.stringify({ message }) }),
    },

    shops: {
        list: () => request<{ shops: any[] }>('/api/shops'),
        create: (data: { name: string; category: string; image: string; menu: { name: string; price: number; description: string }[] }) =>
            request<{ shop: any }>('/api/shops', { method: 'POST', body: JSON.stringify(data) }),
    },
};
