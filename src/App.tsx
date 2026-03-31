import { useState, useEffect, useCallback } from 'react';
import { api, setToken, clearToken, type ApiUser, type ApiDeliveryRequest } from './api';
import {
  Home, Plus, Truck, User, Wallet, MapPin, Clock, Star, ChevronRight, Search,
  Package, Coffee, Pencil, Check, ArrowLeft, Navigation, Pill, ShoppingCart,
  MessageCircle, Award, Shield, TrendingUp, Heart, Send, X, Camera, Upload,
  AlertTriangle, Minus, CreditCard, History, Image,
  Eye, EyeOff, Mail, Lock, UserPlus, Globe,
  HelpCircle, CheckSquare
} from 'lucide-react';
import {
  type Screen, type Tab, type CartItem, type Order, type Profile, type Shop, type MenuItem,
  CATEGORIES, CAT_EMOJIS, SHOPS, MENU_ITEMS, DELIVERY_REQUESTS,
  SAMPLE_ORDERS, DEFAULT_PROFILE, ISSUE_TYPES, ACTIVITY, urgencyColor,
  CHATBOT_FAQ, TERMS_AND_CONDITIONS,
} from './data';
import { auth, googleProvider } from './lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';

const CatIcon: Record<string, React.ReactNode> = {
  All: <Package size={14} />, Food: <Coffee size={14} />,
  Stationery: <Pencil size={14} />, Medicines: <Pill size={14} />,
  Groceries: <ShoppingCart size={14} />,
};
export default function App() {
  /* ── Navigation ── */
  const [screen, setScreen] = useState<Screen>('landing');
  const [prevScreen, setPrevScreen] = useState<Screen>('home');
  const [tab, setTab] = useState<Tab>('home');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [dbUser, setDbUser] = useState<ApiUser | null>(null);

  /* ── Data States ── */
  const [profile, setProfile] = useState<Profile>({ ...DEFAULT_PROFILE });
  const [filter, setFilter] = useState('All');
  const [selectedShopId, setSelectedShopId] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tip, setTip] = useState(10);
  const [walletBalance, setWalletBalance] = useState(500);
  const [bonusCoins, setBonusCoins] = useState(120);
  const [orders, setOrders] = useState<Order[]>([...SAMPLE_ORDERS]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [trackStep, setTrackStep] = useState(0);
  const [selectedDelivery, setSelectedDelivery] = useState<ApiDeliveryRequest | null>(null);
  const [billUploaded, setBillUploaded] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [reportOrderId, setReportOrderId] = useState('');
  const [reportIssue, setReportIssue] = useState('');
  const [reportPhoto, setReportPhoto] = useState(false);
  const [addMoneyAmt, setAddMoneyAmt] = useState('');
  const [postSuccess, setPostSuccess] = useState(false);
  const [postDeductedAmt, setPostDeductedAmt] = useState(0);

  /* ── Live delivery requests ── */
  const [liveDeliveries, setLiveDeliveries] = useState<ApiDeliveryRequest[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  /* ── Live Shops & Menu ── */
  const [liveShops, setLiveShops] = useState<Shop[]>([]);
  const [liveMenu, setLiveMenu] = useState<MenuItem[]>([]);

  /* ── Wallet Txns ── */
  const [walletTxns, setWalletTxns] = useState<any[]>([]);

  /* ── Add Shop form state (must be top-level for React hooks rule) ── */
  const [shopName, setShopName] = useState('');
  const [shopCategory, setShopCategory] = useState('Food');
  const [shopItems, setShopItems] = useState<{ name: string; price: string; description: string }[]>([{ name: '', price: '', description: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);


  /* ── Post form state ── */
  const [postTitle, setPostTitle] = useState('');
  const [postCategory, setPostCategory] = useState('Food');
  const [postPickup, setPostPickup] = useState('');
  const [postDrop, setPostDrop] = useState('');
  const [postReward, setPostReward] = useState('30');
  const [postTip, setPostTip] = useState('0');
  const [postDeadline, setPostDeadline] = useState('30 min');
  const [postUrgency, setPostUrgency] = useState('medium');
  const [postItems, setPostItems] = useState('');
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState('');

  /* ── Chatbot state ── */
  const [chatCategory, setChatCategory] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  /* ── Terms & Conditions ── */
  const [termsAccepted, setTermsAccepted] = useState(() => localStorage.getItem('sl_terms_accepted') === 'true');
  const [termsCheckbox, setTermsCheckbox] = useState(false);

  /* ── Fetch deliveries from API ── */
  const fetchDeliveries = useCallback(async () => {
    setDeliveriesLoading(true);
    try {
      const { requests } = await api.deliveries.list();
      setLiveDeliveries(requests);
    } catch { /* silently fail, show empty list */ }
    finally { setDeliveriesLoading(false); }
  }, []);

  const fetchShops = useCallback(async () => {
    try {
      const res = await api.shops.list();
      const newShops: Shop[] = res.shops.map(s => ({
        id: s.id + 1000, name: s.name, category: s.category, distance: s.distance, rating: s.rating, image: s.image, deliveryTime: s.delivery_time
      }));
      const newMenu: MenuItem[] = res.shops.flatMap(s => s.menu.map((m: any) => ({
        id: m.id + 10000, shopId: s.id + 1000, name: m.name, price: m.price, description: m.description
      })));
      setLiveShops(newShops);
      setLiveMenu(newMenu);
    } catch { }
  }, []);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await api.wallet.get();
      setWalletBalance(res.balance);
      setBonusCoins(res.bonusCoins);
      setWalletTxns(res.transactions);
    } catch { }
  }, []);

  const nav = (s: Screen) => { setPrevScreen(() => screen); setScreen(s); };
  const handleTab = (t: Tab) => {
    setTab(t);
    const map: Record<Tab, Screen> = { home: 'home', post: 'post', deliveries: 'deliveryDashboard', wallet: 'wallet', profile: 'profile' };
    nav(map[t]);
    // Auto-refresh deliveries when switching to that tab
    if (t === 'deliveries') fetchDeliveries();
    if (t === 'wallet') fetchWallet();
    if (t === 'home') fetchShops();
  };

  const allShops = [...SHOPS, ...liveShops];
  const allMenu = [...MENU_ITEMS, ...liveMenu];

  const shop = allShops.find(s => s.id === selectedShopId)!;
  const shopMenu = allMenu.filter(m => m.shopId === selectedShopId);
  const filtered = filter === 'All' ? allShops : allShops.filter(s => s.category === filter);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const addToCart = (item: typeof MENU_ITEMS[0]) => {
    setCart(c => { const ex = c.find(x => x.id === item.id); if (ex) return c.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x); return [...c, { ...item, qty: 1, specialInstructions: '' }]; });
  };
  const removeFromCart = (id: number) => {
    setCart(c => c.map(x => x.id === id ? { ...x, qty: x.qty - 1 } : x).filter(x => x.qty > 0));
  };

  /* ── Sync DB user to local profile state ── */
  const syncUserToProfile = useCallback((u: ApiUser) => {
    setDbUser(u);
    setProfile(p => ({
      ...p, email: u.email, firstName: u.firstName, lastName: u.lastName,
      mobile: u.mobile, hostelBlock: u.hostelBlock, roomNumber: u.roomNumber,
      trustScore: u.trustScore, deliveries: u.deliveries, points: u.points, rating: u.rating,
    }));
    setWalletBalance(u.walletBalance);
    setBonusCoins(u.bonusCoins);
  }, []);

  /* ── Restore session on mount ── */
  useEffect(() => {
    const token = localStorage.getItem('sl_token');
    if (token) {
      fetchShops();
      api.auth.me()
        .then(({ user }) => { syncUserToProfile(user); fetchWallet(); setTab('home'); })
        .catch(() => { clearToken(); });
    }
  }, [syncUserToProfile, fetchShops]);

  /* ── Email/Password auth handler ── */
  const handleLogin = async () => {
    setAuthError(''); setAuthLoading(true);
    try {
      const res = authMode === 'signin'
        ? await api.auth.signIn(profile.email, password)
        : await api.auth.signUp(profile.email, password, fullName);
      setToken(res.token);
      syncUserToProfile(res.user);
      await fetchShops();
      await fetchWallet();
      setTab('home'); nav('home');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally { setAuthLoading(false); }
  };

  /* ── Demo guest login (for testing without registration) ── */
  const handleGuestLogin = async () => {
    setAuthError(''); setAuthLoading(true);
    try {
      // Try to sign up as demo user, or sign in if already exists
      try {
        const res = await api.auth.signUp('demo@studentloop.com', 'demo1234', 'Demo Student');
        setToken(res.token);
        syncUserToProfile(res.user);
      } catch {
        const res = await api.auth.signIn('demo@studentloop.com', 'demo1234');
        setToken(res.token);
        syncUserToProfile(res.user);
      }
      setTab('home'); nav('home');
    } catch (err: any) {
      setAuthError(err.message || 'Guest login failed. Please use email/password.');
    } finally { setAuthLoading(false); }
  };

  /* ── Google Auth handler ── */
  const handleGoogleLogin = async () => {
    setAuthError(''); setAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      // Send Firebase-verified user info to our backend
      const res = await api.auth.googleAuth({
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName,
        uid: firebaseUser.uid,
        photoURL: firebaseUser.photoURL,
      });
      setToken(res.token);
      syncUserToProfile(res.user);
      await fetchShops();
      await fetchWallet();
      setTab('home'); nav('home');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('unauthorized-domain')) {
        setAuthError('This domain is not authorized in Firebase. Please add it under Firebase Console → Authentication → Settings → Authorized domains.');
      } else if (msg.includes('popup-closed-by-user')) {
        setAuthError('Sign-in popup was closed. Please try again.');
      } else {
        setAuthError(msg || 'Google Sign-in failed');
      }
    } finally { setAuthLoading(false); }
  };

  /* ── Sign out ── */
  const handleSignOut = async () => {
    try { await signOut(auth); } catch { /* ignore firebase signout errors */ }
    clearToken(); setDbUser(null);
    setProfile({ ...DEFAULT_PROFILE }); setPassword(''); setFullName('');
    setScreen('onboarding');
  };

  /* ── Bottom Nav ── */
  const BottomNav = () => (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50">
      <div className="glass-card border-t border-border/50 px-1 py-2 flex justify-around items-center">
        {([
          { id: 'home' as Tab, icon: Home, label: 'Home' },
          { id: 'post' as Tab, icon: Plus, label: 'Post' },
          { id: 'deliveries' as Tab, icon: Truck, label: 'Deliver' },
          { id: 'wallet' as Tab, icon: Wallet, label: 'Wallet' },
          { id: 'profile' as Tab, icon: User, label: 'Profile' },
        ]).map(t => (
          <button key={t.id} onClick={() => handleTab(t.id)}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${tab === t.id ? 'text-purple-400 bg-purple-500/10' : 'text-muted-foreground hover:text-foreground'}`}>
            <t.icon size={18} /><span className="text-[10px] font-medium">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const BackBtn = ({ to }: { to?: Screen }) => (
    <button onClick={() => nav(to || prevScreen)} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={22} /></button>
  );

  /* ═══════ LANDING PAGE ═══════ */
  // Listen for postMessage from landing.html iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data === 'sl-get-started') {
        if (termsAccepted) {
          nav(dbUser ? 'home' : 'onboarding');
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [termsAccepted, dbUser]);

  if (screen === 'landing') {
    return (
      <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
        {/* Full-screen landing page iframe */}
        <iframe
          src="/landing.html"
          className="w-full flex-1 border-0"
          style={{ minHeight: '100vh' }}
          title="StudentLoop Landing Page"
        />

        {/* T&C overlay at bottom */}
        {!termsAccepted && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#09090b]/95 backdrop-blur-xl border-t border-purple-500/20 p-4 animate-slide-up">
            <div className="max-w-lg mx-auto">
              <div className="glass-card rounded-2xl p-3 text-left max-h-32 overflow-y-auto mb-3 border border-purple-500/20 text-xs text-gray-400 leading-relaxed whitespace-pre-line">
                {TERMS_AND_CONDITIONS}
              </div>
              <label className="flex items-center gap-3 cursor-pointer mb-3" onClick={() => setTermsCheckbox(!termsCheckbox)}>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${termsCheckbox ? 'bg-purple-600 border-purple-600' : 'border-gray-500'}`}>
                  {termsCheckbox && <Check size={14} className="text-white" />}
                </div>
                <span className="text-sm text-gray-300">I agree to the <span className="text-purple-400 font-semibold">Terms & Conditions</span></span>
              </label>
              <button
                onClick={() => {
                  localStorage.setItem('sl_terms_accepted', 'true');
                  setTermsAccepted(true);
                  nav(dbUser ? 'home' : 'onboarding');
                }}
                disabled={!termsCheckbox}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${termsCheckbox ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/25 hover:opacity-90' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
              >
                Accept & Continue
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══════ AUTH — SPRAKE-INSPIRED SPLIT SCREEN ═══════ */
  if (screen === 'onboarding') {
    const canSubmit = authMode === 'signin'
      ? profile.email.includes('@') && password.length >= 4
      : profile.email.includes('@') && password.length >= 4 && fullName.trim().length > 0;
    return (
      <div className="h-screen flex max-w-5xl mx-auto animate-fade-in">
        {/* Left Branding Panel */}
        <div className="hidden md:flex w-1/2 flex-col justify-between p-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-background to-background" />
          <div className="absolute top-20 -left-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-56 h-56 bg-purple-600/8 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center glow-purple"><Truck size={20} className="text-white" /></div>
            <span className="text-lg font-bold tracking-tight"><span className="text-purple-400">[S]</span> StudentLoop</span>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] tracking-[0.3em] text-purple-400/60 uppercase mb-3 font-mono">// {authMode === 'signin' ? 'AUTH_MODULE' : 'NEW_USER_MODULE'}</p>
            <h1 className="text-4xl font-extrabold leading-tight mb-4 whitespace-pre-line">{authMode === 'signin' ? 'WELCOME\nBACK' : 'START YOUR\nJOURNEY'}</h1>
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">{authMode === 'signin' ? 'Sign in to access your campus deliveries, wallet, and reputation.' : 'Create an account to order, deliver, and earn rewards on campus.'}</p>
          </div>
          <div className="relative z-10 flex items-center gap-2 text-[10px] text-muted-foreground/50 tracking-widest uppercase font-mono">
            <Globe size={10} className="text-purple-400/40" />
            <span>www.STUDENTLOOP.com</span>
          </div>
        </div>
        {/* Right Auth Form */}
        <div className="w-full md:w-1/2 flex flex-col justify-center px-6 md:px-12 py-10">
          <div className="md:hidden flex flex-col gap-3 mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center glow-purple"><Truck size={20} className="text-white" /></div>
              <span className="text-lg font-bold"><span className="text-purple-400">[S]</span> StudentLoop</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-purple-400/60 font-mono"><Globe size={10} />www.STUDENTLOOP.com</div>
          </div>
          <h2 className="text-2xl font-extrabold mb-1.5">{authMode === 'signin' ? 'Sign in' : 'Create account'}</h2>
          <p className="text-muted-foreground text-sm mb-8">{authMode === 'signin' ? 'Enter your credentials to access your account' : 'Enter your details to get started'}</p>
          <div className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <label className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-1.5 block">Full Name</label>
                <div className="relative"><UserPlus size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition" /></div>
              </div>
            )}
            <div>
              <label className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-1.5 block">Email</label>
              <div className="relative"><Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="email" placeholder="you@college.edu" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition" /></div>
            </div>
            <div>
              <label className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-1.5 block">Password</label>
              <div className="relative"><Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-card border border-border rounded-xl pl-11 pr-12 py-3.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition" />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
            </div>
            {authError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center">{authError}</p>}
            <button onClick={handleLogin} disabled={!canSubmit || authLoading} className="w-full py-3.5 rounded-xl gradient-purple text-white font-bold text-sm tracking-wide disabled:opacity-40 glow-purple hover:opacity-90 transition-all uppercase flex items-center justify-center gap-2">{authLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}{authMode === 'signin' ? 'Sign In' : 'Create Account'}</button>
          </div>
          <div className="flex items-center gap-4 my-6"><div className="flex-1 h-px bg-border" /><span className="text-[10px] text-muted-foreground tracking-widest uppercase">or try it out</span><div className="flex-1 h-px bg-border" /></div>
          <div className="space-y-3">
            <button onClick={handleGoogleLogin} disabled={authLoading} className="w-full py-3.5 rounded-xl bg-card border border-border text-sm font-semibold flex items-center justify-center gap-3 hover:bg-secondary hover:border-purple-500/30 transition-all disabled:opacity-50">
              <svg viewBox="0 0 24 24" className="w-5 h-5"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23-1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              <span>Continue with Google</span>
            </button>
            <button onClick={handleGuestLogin} disabled={authLoading} className="w-full py-3.5 rounded-xl bg-card border border-border text-sm font-semibold flex items-center justify-center gap-3 hover:bg-secondary hover:border-purple-500/30 transition-all disabled:opacity-50"><User size={18} className="text-purple-400" /><span>Continue as Guest (Demo)</span></button>
          </div>
          <p className="text-sm text-muted-foreground text-center mt-6">{authMode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} className="text-purple-400 font-semibold hover:underline underline-offset-4">{authMode === 'signin' ? 'Sign up' : 'Sign in'}</button>
          </p>
        </div>
      </div>
    );
  }

  /* ═══════ HOME SCREEN ═══════ */
  if (screen === 'home') return (
    <div className="min-h-screen max-w-md mx-auto pb-24 animate-fade-in">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div><p className="text-muted-foreground text-xs">Good evening 👋</p><h1 className="text-xl font-bold">Hey, {profile.email.split('@')[0] || 'Student'}!</h1></div>
          <div className="flex items-center gap-2">
            <button onClick={() => nav('addShop')} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-lg hover:border-purple-500/50 transition"><Plus size={18} className="text-purple-400" /></button>
            <button onClick={() => handleTab('profile')} className="w-10 h-10 rounded-full gradient-purple flex items-center justify-center text-lg">🧑‍🎓</button>
          </div>
        </div>
        <div className="relative mb-4">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Search shops & items..." className="w-full bg-card border border-border rounded-2xl pl-11 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${filter === c ? 'gradient-purple text-white' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
              {CatIcon[c]}{c}
            </button>
          ))}
        </div>
      </div>
      <div className="px-5 flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Nearby Shops</h2>
        <span className="text-xs text-purple-400">{filtered.length} found</span>
      </div>
      <div className="px-5 space-y-3">
        {filtered.map((s, i) => (
          <button key={s.id} onClick={() => { setSelectedShopId(s.id); setCart([]); nav('shop') }}
            className="w-full glass-card rounded-2xl p-4 text-left hover:border-purple-500/40 transition-all animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{s.image}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{s.name}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin size={11} />{s.distance}</span>
                  <span className="flex items-center gap-1"><Star size={11} className="text-yellow-400" />{s.rating}</span>
                  <span className="flex items-center gap-1"><Clock size={11} />{s.deliveryTime}</span>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20">{s.category}</span>
            </div>
          </button>
        ))}
      </div>
      <BottomNav />
    </div>
  );

  /* ═══════ SHOP / MENU ═══════ */
  if (screen === 'shop') return (
    <div className="min-h-screen max-w-md mx-auto pb-28 animate-slide-up">
      <div className="px-5 pt-6 pb-3 flex items-center gap-3"><BackBtn to="home" /><h1 className="text-lg font-bold">{shop.name}</h1></div>
      <div className="px-5 mb-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><MapPin size={12} />{shop.distance}</span>
        <span className="flex items-center gap-1"><Star size={12} className="text-yellow-400" />{shop.rating}</span>
        <span className="flex items-center gap-1"><Clock size={12} />{shop.deliveryTime}</span>
      </div>
      <div className="px-5 space-y-3">
        {shopMenu.map(item => {
          const inCart = cart.find(c => c.id === item.id);
          return (
            <div key={item.id} className="glass-card rounded-2xl p-4 flex items-center justify-between">
              <div className="flex-1"><h3 className="font-semibold text-sm">{item.name}</h3><p className="text-xs text-muted-foreground mt-0.5">{item.description}</p><p className="text-sm font-bold text-purple-400 mt-1">₹{item.price}</p></div>
              {inCart ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center"><Minus size={14} /></button>
                  <span className="text-sm font-bold w-5 text-center">{inCart.qty}</span>
                  <button onClick={() => addToCart(item)} className="w-8 h-8 rounded-lg gradient-purple flex items-center justify-center"><Plus size={14} className="text-white" /></button>
                </div>
              ) : (
                <button onClick={() => addToCart(item)} className="px-4 py-2 rounded-xl gradient-purple text-white text-xs font-semibold">Add</button>
              )}
            </div>
          );
        })}
      </div>
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 p-4">
          <button onClick={() => nav('cart')} className="w-full py-4 rounded-2xl gradient-purple text-white font-bold glow-purple flex items-center justify-center gap-2">
            <ShoppingCart size={18} /> View Cart ({cart.reduce((s, i) => s + i.qty, 0)} items) — ₹{cartTotal}
          </button>
        </div>
      )}
    </div>
  );

  /* ═══════ CART ═══════ */
  if (screen === 'cart') return (
    <div className="min-h-screen max-w-md mx-auto pb-24 animate-slide-up">
      <div className="px-5 pt-6 pb-3 flex items-center gap-3"><BackBtn to="shop" /><h1 className="text-lg font-bold">Your Cart</h1></div>
      <div className="px-5 space-y-3 mb-4">
        {cart.map(item => (
          <div key={item.id} className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div><h3 className="font-semibold text-sm">{item.name}</h3><p className="text-xs text-muted-foreground">₹{item.price} × {item.qty}</p></div>
              <span className="font-bold text-purple-400">₹{item.price * item.qty}</span>
            </div>
            <input placeholder="Special instructions (e.g., Less spicy please)" value={item.specialInstructions}
              onChange={e => setCart(c => c.map(x => x.id === item.id ? { ...x, specialInstructions: e.target.value } : x))}
              className="w-full bg-card/50 border border-border rounded-xl px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
          </div>
        ))}
      </div>
      <div className="px-5 mb-4">
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Delivery Location</label>
        <div className="flex gap-3">
          <input placeholder="Hostel Block" value={profile.hostelBlock} onChange={e => setProfile(p => ({ ...p, hostelBlock: e.target.value }))}
            className="flex-1 bg-card border border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
          <input placeholder="Room No." value={profile.roomNumber} onChange={e => setProfile(p => ({ ...p, roomNumber: e.target.value }))}
            className="w-24 bg-card border border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
        </div>
      </div>
      <div className="px-5 mb-4">
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Delivery Tip</label>
        <div className="flex gap-2">
          {[10, 20, 30, 40].map(t => (
            <button key={t} onClick={() => setTip(t)} className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${tip === t ? 'gradient-purple text-white' : 'bg-card border border-border text-muted-foreground'}`}>
              {`₹${t}`}
            </button>
          ))}
        </div>
      </div>
      <button onClick={() => nav('orderSummary')} className="mx-5 w-[calc(100%-40px)] py-4 rounded-2xl gradient-purple text-white font-bold glow-purple flex items-center justify-center gap-2">
        Review Order <ChevronRight size={16} />
      </button>
    </div>
  );

  /* ═══════ ORDER SUMMARY ═══════ */
  if (screen === 'orderSummary') {
    const total = cartTotal + tip;
    const canPay = walletBalance >= total;
    return (
      <div className="min-h-screen max-w-md mx-auto pb-24 animate-slide-up">
        <div className="px-5 pt-6 pb-3 flex items-center gap-3"><BackBtn to="cart" /><h1 className="text-lg font-bold">Order Summary</h1></div>
        <div className="px-5 space-y-4">
          <div className="glass-card rounded-2xl p-4">
            <h3 className="text-xs font-medium text-muted-foreground mb-3">Items from {shop.name}</h3>
            {cart.map(i => (
              <div key={i.id} className="flex justify-between text-sm py-1.5 border-b border-border/30 last:border-0">
                <span>{i.name} × {i.qty}{i.specialInstructions && <span className="text-xs text-purple-400 ml-2">"{i.specialInstructions}"</span>}</span>
                <span className="font-semibold">₹{i.price * i.qty}</span>
              </div>
            ))}
          </div>
          <div className="glass-card rounded-2xl p-4">
            <div className="flex justify-between text-sm mb-2"><span className="text-muted-foreground">Subtotal</span><span>₹{cartTotal}</span></div>
            <div className="flex justify-between text-sm mb-2"><span className="text-muted-foreground">Delivery Tip</span><span>₹{tip}</span></div>
            <div className="flex justify-between text-sm font-bold pt-2 border-t border-border/50"><span>Total</span><span className="gradient-text">₹{total}</span></div>
          </div>
          <div className="glass-card rounded-2xl p-4">
            <h3 className="text-xs font-medium text-muted-foreground mb-1">Delivery To</h3>
            <p className="text-sm font-semibold">{profile.hostelBlock || 'Hostel'}, Room {profile.roomNumber || '—'}</p>
          </div>
          <div className={`glass-card rounded-2xl p-4 flex items-center justify-between ${canPay ? 'border-green-500/30' : 'border-red-500/30'}`}>
            <div><p className="text-xs text-muted-foreground">Wallet Balance</p><p className="text-lg font-bold">₹{walletBalance}</p></div>
            {!canPay && <span className="text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded-full">Insufficient balance</span>}
            {canPay && <span className="text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full">✓ Sufficient</span>}
          </div>
          <button disabled={!canPay} onClick={async () => {
            const otp = String(Math.floor(1000 + Math.random() * 9000));
            const ord: Order = { id: `ORD-${String(orders.length + 1).padStart(3, '0')}`, items: [...cart], shop, total, tip, status: 'pending', hostel: profile.hostelBlock || 'Hostel 7', room: profile.roomNumber || '312', otp, timestamp: 'Just now', deliveryReward: 30 + tip };
            setOrders(o => [ord, ...o]); setActiveOrder(ord); setTrackStep(0);
            try {
              // Create order in backend (debits wallet + logs transaction)
              await api.orders.create({
                items: cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty, specialInstructions: c.specialInstructions })),
                shopId: shop.id, shopName: shop.name, total, tip,
                hostel: profile.hostelBlock || 'Hostel 7', room: profile.roomNumber || '312'
              });
              // Create delivery request WITHOUT debiting wallet again (order already debited)
              const itemNames = cart.map(c => `${c.name} x${c.qty}`);
              await api.deliveries.createFromOrder({
                title: cart.map(c => c.name).join(' + '),
                category: shop.category || 'Food',
                pickup: shop.name,
                dropLocation: `${profile.hostelBlock || 'Hostel'}, Room ${profile.roomNumber || '—'}`,
                reward: 30,
                tip: tip,
                deadline: shop.deliveryTime || '15 min',
                urgency: 'medium',
                items: itemNames,
              });
              // Refresh wallet from server
              const walletRes = await api.wallet.get();
              setWalletBalance(walletRes.balance);
              setBonusCoins(walletRes.bonusCoins);
              setWalletTxns(walletRes.transactions);
            } catch (err: any) {
              // If API fails, the order wasn't placed — do NOT debit locally
              alert(err?.message || 'Order failed. Please try again.');
              setOrders(o => o.filter(x => x.id !== ord.id));
              setActiveOrder(null);
              return;
            }
            setCart([]); nav('orderTracking');
          }} className="w-full py-4 rounded-2xl gradient-purple text-white font-bold disabled:opacity-40 glow-purple flex items-center justify-center gap-2">
            <CreditCard size={18} /> Confirm Order — ₹{total}
          </button>
        </div>
      </div>
    );
  }

  /* ═══════ ORDER TRACKING ═══════ */
  if (screen === 'orderTracking') {
    const statuses = ['pending', 'accepted', 'purchased', 'out_for_delivery', 'delivered'] as const;
    const labels = ['Pending', 'Accepted', 'Purchased', 'Out for Delivery', 'Delivered'];
    const icons = [Clock, Check, ShoppingCart, Truck, Heart];
    return (
      <div className="min-h-screen max-w-md mx-auto pb-24 animate-fade-in">
        <div className="px-5 pt-6 pb-3 flex items-center gap-3">
          <BackBtn to="home" />
          <h1 className="text-lg font-bold">Order Tracking</h1>
          <span className="ml-auto text-xs text-green-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 animate-status-pulse" />Live</span>
        </div>
        {activeOrder && <div className="mx-5 glass-card rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center mb-2"><span className="text-xs text-muted-foreground">{activeOrder.id}</span><span className="text-xs text-purple-400 font-medium">OTP: {activeOrder.otp}</span></div>
          <p className="text-sm font-semibold">{activeOrder.items.map(i => i.name).join(', ')}</p>
          <p className="text-xs text-muted-foreground mt-1">From {activeOrder.shop.name} → {activeOrder.hostel}, Room {activeOrder.room}</p>
        </div>}
        <div className="mx-5 glass-card rounded-2xl p-5 mb-4">
          {statuses.map((s, i) => {
            const Icon = icons[i]; const active = i <= trackStep;
            return (
              <div key={s} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${active ? 'gradient-purple glow-purple' : 'border-2 border-border bg-card'}`}>
                    <Icon size={16} className={active ? 'text-white' : 'text-muted-foreground'} />
                  </div>
                  {i < 4 && <div className={`w-0.5 h-8 my-1 rounded ${i < trackStep ? 'bg-purple-500' : 'bg-border'}`} />}
                </div>
                <div className="pt-1.5"><p className={`text-sm font-semibold ${active ? '' : 'text-muted-foreground'}`}>{labels[i]}</p></div>
              </div>
            );
          })}
        </div>
        <div className="px-5 flex gap-3">
          <button onClick={() => { setChatCategory(null); setChatMessages([]); nav('chatbot'); }} className="flex-1 py-3.5 rounded-2xl bg-card border border-border text-sm font-semibold flex items-center justify-center gap-2 text-muted-foreground"><MessageCircle size={16} />Message</button>
          {trackStep < 4 ? (
            <button onClick={() => setTrackStep(s => s + 1)} className="flex-1 py-3.5 rounded-2xl gradient-purple text-white text-sm font-semibold flex items-center justify-center gap-2 glow-purple">Next Step <ChevronRight size={16} /></button>
          ) : (
            <button onClick={() => { handleTab('home') }} className="flex-1 py-3.5 rounded-2xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-semibold flex items-center justify-center gap-2"><Check size={16} /> Done!</button>
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  /* ═══════ POST REQUEST ═══════ */
  const handlePostRequest = async () => {
    if (!postTitle.trim() || !postPickup.trim() || !postDrop.trim()) {
      setPostError('Please fill in all required fields');
      return;
    }
    const postCost = (Number(postReward) || 30) + (Number(postTip) || 0);
    if (walletBalance < postCost) {
      setPostError(`Insufficient wallet balance. Need ₹${postCost}, have ₹${walletBalance}. Please add money first.`);
      return;
    }
    setPostError(''); setPostLoading(true);
    try {
      const itemsList = postItems.trim() ? postItems.split(',').map(s => s.trim()).filter(Boolean) : [postTitle];
      const res = await api.deliveries.create({
        title: postTitle, category: postCategory, pickup: postPickup,
        dropLocation: postDrop, reward: Number(postReward) || 30,
        tip: Number(postTip) || 0, deadline: postDeadline || '30 min',
        urgency: postUrgency, items: itemsList,
      });
      // Update wallet from response
      setWalletBalance(res.balance);
      setBonusCoins(res.bonusCoins);
      // Add to live deliveries
      setLiveDeliveries(prev => [res.delivery, ...prev]);
      // Capture the deducted amount before resetting form
      setPostDeductedAmt(postCost);
      // Reset form
      setPostTitle(''); setPostPickup(''); setPostDrop(''); setPostReward('30');
      setPostTip('0'); setPostDeadline('30 min'); setPostItems('');
      setPostSuccess(true);
    } catch (err: any) {
      setPostError(err.message || 'Failed to post request');
    } finally { setPostLoading(false); }
  };

  const canPost = postTitle.trim().length > 0 && postPickup.trim().length > 0 && postDrop.trim().length > 0;

  if (screen === 'post') return (
    <div className="min-h-screen max-w-md mx-auto pb-24 animate-fade-in">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold mb-1">Post a Request</h1>
        <p className="text-muted-foreground text-xs mb-6">Describe what you need delivered — reward will be deducted from your wallet</p>
        {postSuccess ? (
          <div className="flex flex-col items-center pt-16 animate-slide-up">
            <div className="w-20 h-20 rounded-full gradient-purple flex items-center justify-center mb-6 glow-purple"><Check size={40} className="text-white" /></div>
            <h2 className="text-2xl font-bold mb-2">Request Posted! 🎉</h2>
            <p className="text-muted-foreground text-sm text-center mb-4">Carriers nearby will be notified.</p>
            <p className="text-xs text-yellow-400 mb-8">₹{postDeductedAmt} deducted from wallet</p>
            <div className="flex gap-3">
              <button onClick={() => { setPostSuccess(false); handleTab('deliveries') }} className="px-6 py-3 rounded-2xl bg-card border border-border text-sm font-semibold">View Deliveries</button>
              <button onClick={() => { setPostSuccess(false); handleTab('home') }} className="px-6 py-3 rounded-2xl gradient-purple text-white font-semibold">Home</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Wallet info */}
            <div className="glass-card rounded-2xl p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Wallet Balance</span>
              <span className="text-sm font-bold gradient-text">₹{walletBalance}</span>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Item Description *</label>
              <input placeholder="e.g., Iced Coffee from Blue Tokai" value={postTitle} onChange={e => setPostTitle(e.target.value)}
                className="w-full bg-card border border-border rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" /></div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
              <div className="flex gap-2 flex-wrap">{['Food', 'Stationery', 'Medicines', 'Groceries'].map(c => (
                <button key={c} onClick={() => setPostCategory(c)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition ${postCategory === c ? 'bg-purple-500/15 border border-purple-500 text-purple-400' : 'bg-card border border-border text-muted-foreground hover:border-purple-500/50'}`}>{CatIcon[c]}{c}</button>
              ))}</div></div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Pickup Location *</label>
              <div className="relative"><MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
                <input placeholder="Shop or location" value={postPickup} onChange={e => setPostPickup(e.target.value)}
                  className="w-full bg-card border border-border rounded-2xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" /></div></div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Drop Location *</label>
              <div className="relative"><Navigation size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-green-400" />
                <input placeholder="Hostel & Room" value={postDrop} onChange={e => setPostDrop(e.target.value)}
                  className="w-full bg-card border border-border rounded-2xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" /></div></div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Items (comma separated)</label>
              <input placeholder="Iced Latte x1, Cappuccino x1" value={postItems} onChange={e => setPostItems(e.target.value)}
                className="w-full bg-card border border-border rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" /></div>
            <div className="flex gap-3">
              <div className="flex-1"><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Reward (₹)</label>
                <input type="number" placeholder="30" value={postReward} onChange={e => setPostReward(e.target.value)}
                  className="w-full bg-card border border-border rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" /></div>
              <div className="flex-1"><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tip (₹)</label>
                <input type="number" placeholder="0" value={postTip} onChange={e => setPostTip(e.target.value)}
                  className="w-full bg-card border border-border rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" /></div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1"><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Deadline</label>
                <input placeholder="30 min" value={postDeadline} onChange={e => setPostDeadline(e.target.value)}
                  className="w-full bg-card border border-border rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" /></div>
              <div className="flex-1"><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Urgency</label>
                <div className="flex gap-1">{(['low', 'medium', 'high'] as const).map(u => (
                  <button key={u} onClick={() => setPostUrgency(u)}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-medium transition ${postUrgency === u ? (u === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : u === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' : 'bg-green-500/20 text-green-400 border border-green-500/40') : 'bg-card border border-border text-muted-foreground'}`}>
                    {u === 'high' ? '🔥' : u === 'medium' ? '⏳' : '🟢'} {u}
                  </button>
                ))}</div></div>
            </div>
            {/* Cost summary */}
            <div className="glass-card rounded-2xl p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total Cost (Reward + Tip)</span>
              <span className="text-sm font-bold text-purple-400">₹{(Number(postReward) || 30) + (Number(postTip) || 0)}</span>
            </div>
            {postError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center">{postError}</p>}
            <button onClick={handlePostRequest} disabled={!canPost || postLoading}
              className="w-full py-4 rounded-2xl gradient-purple text-white font-bold mt-2 glow-purple flex items-center justify-center gap-2 disabled:opacity-40">
              {postLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <Send size={18} /> Post Request
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );

  /* ═══════ DELIVERY DASHBOARD ═══════ */
  // Combine static DELIVERY_REQUESTS with live ones from API, normalizing static ones to ApiDeliveryRequest shape
  const allDeliveries: ApiDeliveryRequest[] = [
    ...liveDeliveries,
    ...DELIVERY_REQUESTS
      .filter(dr => !liveDeliveries.some(ld => ld.id === dr.id))
      .map(dr => ({ ...dr, userId: 0, acceptedBy: null, createdAt: dr.createdAt || '' } as ApiDeliveryRequest)),
  ];

  if (screen === 'deliveryDashboard') return (
    <div className="min-h-screen max-w-md mx-auto pb-24 animate-fade-in">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold">Delivery Dashboard</h1>
          <button onClick={fetchDeliveries} disabled={deliveriesLoading}
            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition">
            {deliveriesLoading ? <span className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" /> : <TrendingUp size={12} />}
            Refresh
          </button>
        </div>
        <p className="text-muted-foreground text-xs mb-4">{allDeliveries.length} requests near you</p>
      </div>
      <div className="px-5 space-y-3">
        {allDeliveries.length === 0 && !deliveriesLoading && (
          <div className="text-center py-16">
            <Package size={48} className="text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">No delivery requests yet</p>
            <button onClick={() => handleTab('post')} className="text-purple-400 text-sm font-semibold mt-2">Post one →</button>
          </div>
        )}
        {allDeliveries.map((r, i) => (
          <button key={`${r.id}-${r.createdAt || i}`} onClick={() => { setSelectedDelivery(r); nav('deliveryAccepted') }}
            className="w-full glass-card rounded-2xl p-4 text-left hover:border-purple-500/40 transition-all animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3"><span className="text-2xl">{r.avatar}</span><div><h3 className="font-semibold text-sm">{r.title}</h3><p className="text-xs text-muted-foreground">{r.requester}</p></div></div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full border font-medium ${urgencyColor(r.urgency)}`}>{r.urgency === 'high' ? '🔥 Urgent' : r.urgency === 'medium' ? '⏳ Soon' : '🟢 Relaxed'}</span>
            </div>
            <div className="text-xs text-muted-foreground mb-2">{(r.items || []).join(' • ')}</div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1"><MapPin size={11} />{r.pickup}</span>
              <span className="flex items-center gap-1"><Clock size={11} />{r.deadline}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <span className="text-xs text-muted-foreground">Reward: <span className="text-purple-400 font-bold">₹{r.reward}</span></span>
              <span className="text-xs text-muted-foreground">Tip: <span className="text-green-400 font-bold">₹{r.tip}</span></span>
            </div>
          </button>
        ))}
      </div>
      <BottomNav />
    </div>
  );

  /* ═══════ DELIVERY ACCEPTED ═══════ */
  const handleAcceptDelivery = async () => {
    if (!selectedDelivery) return;
    // Static delivery IDs are small (1-8), API-created ones are large
    const isStaticDelivery = selectedDelivery.id <= 100;
    if (isStaticDelivery) {
      // Skip API call for static/demo deliveries
      setBillUploaded(false);
      nav('uploadBill');
      return;
    }
    try {
      await api.deliveries.accept(selectedDelivery.id);
      setBillUploaded(false);
      nav('uploadBill');
    } catch (err: any) {
      alert(err.message || 'Failed to accept');
    }
  };

  const handleCompleteDelivery = async () => {
    if (!selectedDelivery) return;
    const isStaticDelivery = selectedDelivery.id <= 100;
    if (isStaticDelivery) {
      // Fallback for static/demo deliveries — credit locally
      setWalletBalance(b => b + selectedDelivery.reward + selectedDelivery.tip);
      setBonusCoins(c => c + selectedDelivery.reward);
      handleTab('home');
      return;
    }
    try {
      const res = await api.deliveries.complete(selectedDelivery.id);
      // Sync full user state from API (wallet, deliveries count, points, etc.)
      if (res.user) {
        syncUserToProfile(res.user);
      }
      // Also refresh wallet transactions so the earning shows in history
      await fetchWallet();
      // Remove from live list
      setLiveDeliveries(prev => prev.filter(d => d.id !== selectedDelivery.id));
      handleTab('home');
    } catch (err) {
      // API error — still credit locally as fallback
      setWalletBalance(b => b + selectedDelivery.reward + selectedDelivery.tip);
      setBonusCoins(c => c + selectedDelivery.reward);
      handleTab('home');
    }
  };

  if (screen === 'deliveryAccepted' && selectedDelivery) return (
    <div className="min-h-screen max-w-md mx-auto pb-24 animate-slide-up">
      <div className="px-5 pt-6 pb-3 flex items-center gap-3"><BackBtn to="deliveryDashboard" /><h1 className="text-lg font-bold">Delivery Details</h1></div>
      <div className="mx-5 rounded-2xl overflow-hidden mb-4 relative h-40 bg-gradient-to-br from-purple-900/40 via-card to-purple-800/20 border border-border">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center"><div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center border-2 border-purple-400"><MapPin size={16} className="text-purple-400" /></div><span className="text-[10px] text-muted-foreground mt-1">Pickup</span></div>
            <div className="flex items-center gap-1">{[...Array(6)].map((_, i) => <div key={i} className="w-2 h-0.5 rounded bg-purple-500/50" />)}<ChevronRight size={14} className="text-purple-400" /></div>
            <div className="flex flex-col items-center"><div className="w-10 h-10 rounded-full bg-green-500/30 flex items-center justify-center border-2 border-green-400"><Navigation size={16} className="text-green-400" /></div><span className="text-[10px] text-muted-foreground mt-1">Drop</span></div>
          </div>
        </div>
        <div className="absolute bottom-2 right-3 px-3 py-1 rounded-full bg-card/80 border border-border text-xs text-muted-foreground">{selectedDelivery.distance}</div>
      </div>
      <div className="mx-5 glass-card rounded-2xl p-4 mb-3">
        <div className="flex items-start gap-3 mb-3"><span className="text-2xl">{selectedDelivery.avatar}</span><div className="flex-1"><h2 className="font-bold text-sm">{selectedDelivery.title}</h2><p className="text-xs text-muted-foreground">by {selectedDelivery.requester}</p></div></div>
        <div className="text-xs text-muted-foreground mb-2"><span className="font-medium text-foreground">Items: </span>{(selectedDelivery.items || []).join(', ')}</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2"><MapPin size={13} className="text-purple-400 shrink-0 mt-0.5" /><span><span className="text-muted-foreground">Pickup: </span>{selectedDelivery.pickup}</span></div>
          <div className="flex items-start gap-2"><Navigation size={13} className="text-green-400 shrink-0 mt-0.5" /><span><span className="text-muted-foreground">Drop: </span>{selectedDelivery.drop}</span></div>
        </div>
      </div>
      <div className="mx-5 glass-card rounded-2xl p-4 mb-2 flex items-center justify-between">
        <div><p className="text-xs text-muted-foreground">Reward</p><p className="text-xl font-bold gradient-text">₹{selectedDelivery.reward}</p></div>
        <div className="text-right"><p className="text-xs text-muted-foreground">+ Tip</p><p className="text-lg font-bold text-green-400">₹{selectedDelivery.tip}</p></div>
      </div>
      <div className="mx-5 glass-card rounded-2xl p-3 mb-4 flex items-center gap-2">
        <Award size={14} className="text-yellow-400" />
        <span className="text-xs text-muted-foreground">You'll earn <span className="text-green-400 font-bold">₹{selectedDelivery.reward + selectedDelivery.tip}</span> upon delivery completion</span>
      </div>
      <div className="px-5 flex gap-3">
        <button onClick={() => nav('deliveryDashboard')} className="flex-1 py-4 rounded-2xl bg-card border border-border font-bold text-muted-foreground flex items-center justify-center gap-2"><X size={18} />Decline</button>
        <button onClick={handleAcceptDelivery} className="flex-1 py-4 rounded-2xl gradient-purple text-white font-bold glow-purple flex items-center justify-center gap-2"><Check size={18} />Accept</button>
      </div>
    </div>
  );

  /* ═══════ UPLOAD BILL ═══════ */
  if (screen === 'uploadBill') return (
    <div className="min-h-screen max-w-md mx-auto pb-24 animate-slide-up">
      <div className="px-5 pt-6 pb-3 flex items-center gap-3"><BackBtn to="deliveryAccepted" /><h1 className="text-lg font-bold">Upload Purchase Bill</h1></div>
      <div className="px-5">
        <p className="text-sm text-muted-foreground mb-6">Take a photo of the purchase receipt/bill for the requester's records.</p>
        <div onClick={() => setBillUploaded(true)}
          className={`w-full h-56 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${billUploaded ? 'border-green-500/50 bg-green-500/5' : 'border-border hover:border-purple-500/50 bg-card'}`}>
          {billUploaded ? (
            <><div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center"><Check size={32} className="text-green-400" /></div><p className="text-sm font-semibold text-green-400">Bill Uploaded ✓</p></>
          ) : (
            <><Camera size={40} className="text-muted-foreground" /><p className="text-sm text-muted-foreground">Tap to capture bill photo</p><p className="text-xs text-muted-foreground">or upload from gallery</p></>
          )}
        </div>
        <button onClick={() => { setOtpInput(''); nav('otpConfirm') }} disabled={!billUploaded}
          className="w-full py-4 rounded-2xl gradient-purple text-white font-bold disabled:opacity-40 mt-6 flex items-center justify-center gap-2"><Upload size={18} />Proceed to Delivery</button>
      </div>
    </div>
  );

  /* ═══════ OTP CONFIRM ═══════ */
  if (screen === 'otpConfirm') return (
    <div className="h-screen flex flex-col max-w-md mx-auto px-6 pt-16 animate-slide-up">
      <BackBtn to="uploadBill" /><div className="mb-8" />
      <h2 className="text-2xl font-bold mb-2">Delivery Confirmation</h2>
      <p className="text-muted-foreground text-sm mb-8">Enter the 4-digit OTP provided by the ordering student to confirm delivery.</p>
      <div className="flex gap-3 justify-center mb-8">
        {[0, 1, 2, 3].map(i => (
          <input key={i} maxLength={1} value={otpInput[i] || ''} onChange={e => {
            const v = e.target.value.replace(/\D/, '');
            setOtpInput(p => { const a = p.split(''); a[i] = v; return a.join('').slice(0, 4); });
            if (v && i < 3) (e.target.nextElementSibling as HTMLInputElement)?.focus();
          }} className="w-14 h-16 text-center text-2xl font-bold bg-card border-2 border-border rounded-2xl focus:border-purple-500 focus:outline-none transition" />
        ))}
      </div>
      <button onClick={handleCompleteDelivery}
        disabled={otpInput.length < 4}
        className="w-full py-4 rounded-2xl gradient-purple text-white font-bold disabled:opacity-40 glow-purple flex items-center justify-center gap-2"><Check size={18} />Confirm Delivery</button>
      <div className="flex items-center gap-3 mt-8 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
        <Shield size={20} className="text-purple-400 shrink-0" /><p className="text-xs text-muted-foreground">OTP verification ensures safe & verified delivery to the right person.</p>
      </div>
    </div>
  );

  /* ═══════ WALLET ═══════ */
  if (screen === 'wallet') return (
    <div className="min-h-screen max-w-md mx-auto pb-24 animate-fade-in">
      <div className="px-5 pt-6 pb-4"><h1 className="text-xl font-bold mb-5">Wallet & Earnings</h1>
        <div className="glass-card rounded-2xl p-5 mb-4">
          <p className="text-xs text-muted-foreground mb-1">Balance Amount</p>
          <p className="text-3xl font-bold gradient-text mb-3">₹{walletBalance}</p>
          <div className="flex items-center gap-2 mb-4"><Award size={14} className="text-yellow-400" /><span className="text-sm text-muted-foreground">Bonus Coins: <span className="text-yellow-400 font-bold">{bonusCoins}</span></span></div>
          <div className="flex gap-3">
            <input type="number" placeholder="Enter amount" value={addMoneyAmt} onChange={e => setAddMoneyAmt(e.target.value)}
              className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
            <button onClick={async () => { if (addMoneyAmt) { try { const res = await api.wallet.addMoney(Number(addMoneyAmt)); setWalletBalance(res.balance); setBonusCoins(res.bonusCoins); fetchWallet(); setAddMoneyAmt(''); } catch (e: any) { alert('Failed: ' + (e.message || 'Unknown error. Check if your session is valid by refreshing.')); } } }}
              className="px-6 py-3 rounded-xl gradient-purple text-white text-sm font-semibold flex items-center gap-2"><CreditCard size={14} />Add via UPI</button>
          </div>
        </div>
        <h3 className="text-sm font-semibold mb-3">Recent Transactions</h3>
        <div className="space-y-2">
          {walletTxns.map((t, i) => (
            <div key={i} className="glass-card rounded-xl p-3.5 flex items-center justify-between">
              <div><p className="text-xs font-medium">{t.description}</p><p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p></div>
              <span className={`text-sm font-bold ${t.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>{t.type === 'credit' ? '+' : '-'}₹{t.amount}</span>
            </div>
          ))}
          {walletTxns.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No transactions yet.</p>}
        </div>
      </div>
      <BottomNav />
    </div>
  );

  /* ═══════ ORDER HISTORY ═══════ */
  if (screen === 'orderHistory') return (
    <div className="min-h-screen max-w-md mx-auto pb-24 animate-fade-in">
      <div className="px-5 pt-6 pb-3 flex items-center gap-3"><BackBtn to="profile" /><h1 className="text-lg font-bold">Order History</h1></div>
      <div className="px-5 space-y-3">
        {orders.map(o => (
          <div key={o.id} className="glass-card rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2"><span className="text-xs text-muted-foreground">{o.id}</span><span className="text-[10px] px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">✓ Delivered</span></div>
            <p className="text-sm font-semibold mb-1">{o.items.map(i => `${i.name} × ${i.qty}`).join(', ')}</p>
            <p className="text-xs text-muted-foreground mb-2">From {o.shop.name} • {o.timestamp}</p>
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <span className="text-sm font-bold">₹{o.total}</span>
              <button onClick={() => { setReportOrderId(o.id); setReportIssue(''); setReportPhoto(false); nav('reportIssue') }}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition"><AlertTriangle size={13} />Report Issue</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ═══════ REPORT ISSUE ═══════ */
  if (screen === 'reportIssue') return (
    <div className="min-h-screen max-w-md mx-auto pb-24 animate-slide-up">
      <div className="px-5 pt-6 pb-3 flex items-center gap-3"><BackBtn to="orderHistory" /><h1 className="text-lg font-bold">Report Issue</h1></div>
      <div className="px-5">
        <p className="text-xs text-muted-foreground mb-1">Order</p>
        <p className="text-sm font-semibold mb-5">{reportOrderId}</p>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Issue Type</label>
        <div className="space-y-2 mb-5">
          {ISSUE_TYPES.map(t => (
            <button key={t} onClick={() => setReportIssue(t)}
              className={`w-full p-3.5 rounded-xl text-left text-sm transition-all ${reportIssue === t ? 'bg-purple-500/15 border-purple-500/50 border text-foreground' : 'bg-card border border-border text-muted-foreground hover:border-purple-500/30'}`}>
              {t}
            </button>
          ))}
        </div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Upload Photo Evidence</label>
        <div onClick={() => setReportPhoto(true)}
          className={`w-full h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer mb-5 transition-all ${reportPhoto ? 'border-green-500/50 bg-green-500/5' : 'border-border bg-card hover:border-purple-500/50'}`}>
          {reportPhoto ? (<><Check size={24} className="text-green-400" /><p className="text-xs text-green-400">Photo uploaded</p></>) : (<><Image size={28} className="text-muted-foreground" /><p className="text-xs text-muted-foreground">Tap to upload photo</p></>)}
        </div>
        <button disabled={!reportIssue} onClick={() => nav('orderHistory')}
          className="w-full py-4 rounded-2xl gradient-purple text-white font-bold disabled:opacity-40 flex items-center justify-center gap-2"><Send size={18} />Submit Report</button>
      </div>
    </div>
  );

  /* ═══════ ADD SHOP / STALL ═══════ */
  const handleCreateShop = async () => {
    if (!shopName.trim() || shopItems.some(i => !i.name.trim() || !i.price)) return alert('Please fill all fields');
    setIsSubmitting(true);
    try {
      await api.shops.create({
        name: shopName,
        category: shopCategory,
        image: CAT_EMOJIS[shopCategory] || '🏪',
        menu: shopItems.map(i => ({ name: i.name, price: Number(i.price), description: i.description }))
      });
      await fetchShops();
      setShopName(''); setShopCategory('Food');
      setShopItems([{ name: '', price: '', description: '' }]);
      nav('home');
    } catch (e) { alert('Failed to save business'); }
    finally { setIsSubmitting(false); }
  };

  if (screen === 'addShop') return (
    <div className="min-h-screen max-w-md mx-auto pb-24 animate-slide-up">
      <div className="px-5 pt-6 pb-3 flex items-center gap-3"><BackBtn to="home" /><h1 className="text-lg font-bold">Add Business / Stall</h1></div>
      <div className="px-5 space-y-4">
        <div className="glass-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-3">Stall Details</h3>
          <input placeholder="Stall / Business Name" value={shopName} onChange={e => setShopName(e.target.value)} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 mb-3" />
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.filter(c => c !== 'All').map(c => (
              <button key={c} onClick={() => setShopCategory(c)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition ${shopCategory === c ? 'bg-purple-500/15 border border-purple-500 text-purple-400' : 'bg-card border border-border text-muted-foreground hover:border-purple-500/50'}`}>{CatIcon[c]}{c}</button>
            ))}
          </div>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-3">Menu Items</h3>
          {shopItems.map((item, idx) => (
            <div key={idx} className="flex flex-col gap-2 mb-4 pb-4 border-b border-border/50 last:border-0 last:mb-0 last:pb-0">
              <input placeholder="Item Name" value={item.name} onChange={e => setShopItems(p => { const arr = [...p]; arr[idx] = { ...arr[idx], name: e.target.value }; return arr; })} className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
              <div className="flex gap-2">
                <input type="number" placeholder="Price (₹)" value={item.price} onChange={e => setShopItems(p => { const arr = [...p]; arr[idx] = { ...arr[idx], price: e.target.value }; return arr; })} className="w-24 bg-card border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
                <input placeholder="Short Description" value={item.description} onChange={e => setShopItems(p => { const arr = [...p]; arr[idx] = { ...arr[idx], description: e.target.value }; return arr; })} className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
                {shopItems.length > 1 && <button onClick={() => setShopItems(p => p.filter((_, i) => i !== idx))} className="w-9 h-9 flex items-center justify-center text-red-400 bg-red-400/10 rounded-xl shrink-0"><Minus size={14} /></button>}
              </div>
            </div>
          ))}
          <button onClick={() => setShopItems(p => [...p, { name: '', price: '', description: '' }])} className="w-full py-2.5 mt-2 rounded-xl border border-dashed border-purple-500/50 text-purple-400 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-purple-500/10 transition"><Plus size={16} /> Add another item</button>
        </div>
        <button onClick={handleCreateShop} disabled={isSubmitting} className="w-full py-4 rounded-2xl gradient-purple text-white font-bold disabled:opacity-40 glow-purple flex items-center justify-center gap-2">{isSubmitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />} Save & Publish Shop</button>
      </div>
    </div>
  );

  /* ═══════ CHATBOT HELP DESK ═══════ */
  const handleAiSend = async () => {
    const q = aiInput.trim();
    if (!q || aiLoading) return;
    setChatMessages(prev => [...prev, { role: 'user', text: q }]);
    setAiInput(''); setAiLoading(true);
    try {
      const res = await api.chat.gemini(q);
      setChatMessages(prev => [...prev, { role: 'bot', text: res.reply }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'bot', text: err.message || 'AI is unavailable right now. Try the FAQ instead.' }]);
    } finally { setAiLoading(false); }
  };

  if (screen === 'chatbot') return (
    <div className="min-h-screen max-w-md mx-auto pb-24 animate-fade-in">
      <div className="px-5 pt-6 pb-3 flex items-center gap-3">
        <BackBtn />
        <h1 className="text-lg font-bold">Help Desk</h1>
        <span className="ml-auto text-xs text-purple-400 flex items-center gap-1"><HelpCircle size={14} />FAQ & AI</span>
      </div>
      <div className="px-5">
        {/* Chat messages */}
        <div className="space-y-3 mb-4 max-h-[50vh] overflow-y-auto">
          {chatMessages.length === 0 && (
            <div className="glass-card rounded-2xl p-4 text-center">
              <div className="w-14 h-14 rounded-full gradient-purple flex items-center justify-center mx-auto mb-3"><MessageCircle size={28} className="text-white" /></div>
              <h3 className="font-bold mb-1">Hi there! 👋</h3>
              <p className="text-xs text-muted-foreground">Choose a FAQ category for instant answers, or ask the AI Assistant anything!</p>
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'gradient-purple text-white rounded-br-sm'
                  : 'glass-card text-foreground rounded-bl-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {aiLoading && (
            <div className="flex justify-start">
              <div className="glass-card rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
        </div>

        {/* AI Assistant input — always visible */}
        {chatCategory === '__ai__' && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => setChatCategory(null)} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /></button>
              <p className="text-xs font-medium text-muted-foreground">Ask <span className="text-purple-400">AI Assistant</span> anything:</p>
            </div>
            <div className="flex gap-2">
              <input
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAiSend()}
                placeholder="Type your question..."
                className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                disabled={aiLoading}
              />
              <button onClick={handleAiSend} disabled={!aiInput.trim() || aiLoading}
                className="w-12 h-12 rounded-xl gradient-purple flex items-center justify-center text-white disabled:opacity-40 glow-purple shrink-0">
                <Send size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Category selection */}
        {!chatCategory && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Select a topic:</p>
            {/* AI Assistant option */}
            <button onClick={() => setChatCategory('__ai__')}
              className="w-full glass-card rounded-2xl p-3.5 flex items-center gap-3 hover:border-purple-500/40 transition text-left border border-purple-500/20 bg-purple-500/5">
              <span className="text-xl">✨</span>
              <div className="flex-1">
                <span className="text-sm font-semibold block">Ask AI Assistant</span>
                <span className="text-[10px] text-muted-foreground">Powered by Gemini — ask anything!</span>
              </div>
              <ChevronRight size={16} className="text-purple-400" />
            </button>
            {CHATBOT_FAQ.map(cat => (
              <button key={cat.category} onClick={() => setChatCategory(cat.category)}
                className="w-full glass-card rounded-2xl p-3.5 flex items-center gap-3 hover:border-purple-500/40 transition text-left">
                <span className="text-xl">{cat.icon}</span>
                <span className="text-sm font-semibold flex-1">{cat.category}</span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* Questions for selected FAQ category */}
        {chatCategory && chatCategory !== '__ai__' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => setChatCategory(null)} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /></button>
              <p className="text-xs font-medium text-muted-foreground">Questions about <span className="text-purple-400">{chatCategory}</span>:</p>
            </div>
            {CHATBOT_FAQ.find(c => c.category === chatCategory)?.questions.map((faq, i) => (
              <button key={i} onClick={() => {
                setChatMessages(prev => [
                  ...prev,
                  { role: 'user', text: faq.q },
                  { role: 'bot', text: faq.a },
                ]);
              }}
                className="w-full glass-card rounded-2xl p-3.5 text-left hover:border-purple-500/40 transition">
                <p className="text-sm font-medium flex items-center gap-2">
                  <CheckSquare size={14} className="text-purple-400 shrink-0" />
                  {faq.q}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );

  /* ═══════ PROFILE ═══════ */
  return (
    <div className="min-h-screen max-w-md mx-auto pb-24 animate-fade-in">
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-xl font-bold mb-5">Profile</h1>
        <div className="flex items-center gap-4 mb-6 overflow-hidden">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full gradient-purple flex items-center justify-center text-2xl glow-purple">🧑‍🎓</div>
            <svg className="absolute -inset-1.5 trust-ring" viewBox="0 0 92 92"><circle cx="46" cy="46" r="43" fill="none" stroke="hsl(270 80% 60% / 0.2)" strokeWidth="3" /><circle cx="46" cy="46" r="43" fill="none" stroke="hsl(270 80% 60%)" strokeWidth="3" strokeDasharray={`${0.87 * 2 * Math.PI * 43} ${2 * Math.PI * 43}`} strokeLinecap="round" transform="rotate(-90 46 46)" /></svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold truncate">{profile.firstName || profile.email.split('@')[0] || 'Student'} {profile.lastName}</h2>
            <p className="text-xs text-muted-foreground truncate">{profile.email || 'student@college.edu'}</p>
            <div className="flex items-center gap-1.5 mt-1"><Shield size={13} className="text-purple-400" /><span className="text-xs text-purple-400 font-medium">Trust Score: {profile.trustScore}%</span></div>
          </div>
        </div>
        {/* Profile Form */}
        <div className="glass-card rounded-2xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="First Name" value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
            <input placeholder="Last Name" value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
          </div>
          <input placeholder="Mobile No." value={profile.mobile} onChange={e => setProfile(p => ({ ...p, mobile: e.target.value }))} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
          <input placeholder="Email ID" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Hostel Block" value={profile.hostelBlock} onChange={e => setProfile(p => ({ ...p, hostelBlock: e.target.value }))} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
            <input placeholder="Room Number" value={profile.roomNumber} onChange={e => setProfile(p => ({ ...p, roomNumber: e.target.value }))} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[{ label: 'Deliveries', value: String(profile.deliveries), icon: Truck, color: 'text-purple-400' }, { label: 'Points', value: String(profile.points), icon: TrendingUp, color: 'text-green-400' }, { label: 'Rating', value: String(profile.rating), icon: Star, color: 'text-yellow-400' }].map(s => (
            <div key={s.label} className="glass-card rounded-2xl p-3 text-center"><s.icon size={18} className={`${s.color} mx-auto mb-1.5`} /><p className="text-lg font-bold">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
          ))}
        </div>
        {/* Actions */}
        <button onClick={() => nav('orderHistory')} className="w-full glass-card rounded-2xl p-4 mb-3 flex items-center gap-3 hover:border-purple-500/40 transition">
          <History size={18} className="text-purple-400" /><span className="text-sm font-medium flex-1 text-left">Order History</span><ChevronRight size={16} className="text-muted-foreground" />
        </button>
        <button onClick={() => { setChatCategory(null); setChatMessages([]); nav('chatbot'); }} className="w-full glass-card rounded-2xl p-4 mb-3 flex items-center gap-3 hover:border-purple-500/40 transition">
          <HelpCircle size={18} className="text-purple-400" /><span className="text-sm font-medium flex-1 text-left">Help Desk</span><ChevronRight size={16} className="text-muted-foreground" />
        </button>
        <button onClick={handleSignOut} className="w-full glass-card rounded-2xl p-4 mb-3 flex items-center gap-3 hover:border-red-500/40 border-red-500/20 transition">
          <ArrowLeft size={18} className="text-red-400" /><span className="text-sm font-medium flex-1 text-left text-red-400">Sign Out</span>
        </button>
        {/* Activity */}
        <h3 className="text-sm font-semibold mb-3 mt-4">Recent Activity</h3>
        <div className="space-y-2">
          {ACTIVITY.map((a, i) => (
            <div key={i} className="glass-card rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg gradient-purple flex items-center justify-center shrink-0"><Award size={14} className="text-white" /></div>
              <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{a.text}</p><p className="text-[10px] text-muted-foreground">{a.time}</p></div>
              <span className="text-xs font-bold text-green-400 shrink-0">{a.pts}</span>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
