// What StudentLoop says about itself: the FAQ and terms shown in the app, and
// the guide the help assistant answers from. Pure values only, shared by the
// Convex functions and the React app. Every number comes from constants.ts so
// the pages, the assistant and the backend can't disagree.
import {
  BONUS_COIN_RATE,
  CATEGORIES,
  DELIVERY_FEE,
  ISSUE_TYPES,
  MAX_ACTIVE_JOBS,
  MAX_REWARD,
  MAX_TIP,
  MAX_UPLOAD_BYTES,
  MIN_REWARD,
  ORDER_WINDOW_MINUTES,
  OTP_LOCK_MINUTES,
  OTP_MAX_ATTEMPTS,
  SIGNUP_POINTS,
  TOPUP_DAILY_MAX,
  TOPUP_MAX,
  TOPUP_MIN,
  WELCOME_BONUS,
} from "./constants";

export const SUPPORT_EMAIL = "support@studentloop.com";

/** "₹10,000". Hand-rolled so it doesn't depend on Intl in the Convex runtime. */
export const rupees = (n: number) => `₹${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

const coinPercent = `${Math.round(BONUS_COIN_RATE * 100)}%`;
const uploadMb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
const windowText =
  ORDER_WINDOW_MINUTES % 60 === 0
    ? `${ORDER_WINDOW_MINUTES / 60} hour${ORDER_WINDOW_MINUTES === 60 ? "" : "s"}`
    : `${ORDER_WINDOW_MINUTES} minutes`;

type Stage = "open" | "accepted" | "purchased" | "out_for_delivery" | "delivered" | "cancelled";

/** How each stage reads to the person who asked for the delivery. */
export const STAGE_LABEL: Record<Stage, string> = {
  open: "Waiting for a carrier",
  accepted: "Carrier assigned",
  purchased: "Items bought",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** How each stage reads to the carrier, with what they do next. */
export const CARRIER_STAGE_LABEL: Record<Stage, string> = {
  open: "Open",
  accepted: "Accepted: buy the items and upload the bill next",
  purchased: "Items bought: tap I'm on my way next",
  out_for_delivery: "On the way: enter the requester's delivery code to finish",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const TERMS = `## Terms and Conditions

**Last updated:** October 2026

### 1. Acceptance of terms
By using StudentLoop you agree to these terms. If you do not agree, do not use the service.

### 2. Eligibility
StudentLoop is for students of participating institutions. Use your college email address where you can.

### 3. Your account
You are responsible for keeping your login details private and for activity under your account.

### 4. Wallet and payments
- Everything you order or post is paid from your wallet.
- Money for an order is held until the delivery is confirmed, then released to the carrier. If nobody accepts in time, or you cancel before the carrier buys your items, it is refunded in full.
- Wallet balances are not redeemable for cash.
- Bonus coins are promotional and cannot be converted to cash.

### 5. Deliveries
- Carriers are independent students, not employees of StudentLoop.
- Share your delivery code with the carrier only when you have your items.
- Tips are voluntary and go to the carrier.
- StudentLoop is not liable for the quality or condition of delivered items.

### 6. Conduct
- Do not use the platform for anything unlawful.
- Harassment, fraud or abuse can lead to suspension.
- Give accurate information in orders and requests.

### 7. Privacy
- Other users see your first name and last initial. Your room number and phone number are shared only with the person you are matched with.
- Photos you upload (bills and issue reports) are visible to the people involved in that order.
- Messages you send to the help assistant, together with a short summary of your account (your first name, wallet balance, bonus coins and your active orders and deliveries), are processed by NVIDIA to generate replies. Don't put passwords or delivery codes in them.

### 8. Issues
- Report problems from the order page. We review reports but cannot guarantee a particular outcome.

### 9. Liability
StudentLoop is provided "as is". We are not responsible for indirect or consequential damages.

### 10. Changes
We may update these terms. Continuing to use StudentLoop means you accept the updated terms.`;

export const FAQ: { topic: string; items: { q: string; a: string }[] }[] = [
  {
    topic: "Account",
    items: [
      {
        q: "How do I sign up?",
        a: `Create an account with your email and a password, or continue with Google. We'll email you a link to verify your address. New accounts get a ${rupees(WELCOME_BONUS)} welcome bonus in their wallet.`,
      },
      {
        q: "How do I reset my password?",
        a: "On the sign-in page, choose Forgot password? and enter your email. We'll send you a link to choose a new one (check your spam folder). If you signed up with Google, use Continue with Google instead.",
      },
      {
        q: "What is the trust score?",
        a: "It reflects how reliable you are as a carrier. It goes up with completed deliveries and good ratings and drops after poor ratings.",
      },
    ],
  },
  {
    topic: "Wallet and payments",
    items: [
      {
        q: "How do I add money?",
        a: `Open Wallet, enter an amount and tap Add money. Each top-up can be ${rupees(TOPUP_MIN)} to ${rupees(TOPUP_MAX)}, up to ${rupees(TOPUP_DAILY_MAX)} a day.`,
      },
      {
        q: "When is my money taken?",
        a: "When you place an order or post an errand. It is held until the delivery is confirmed.",
      },
      {
        q: "How do bonus coins work?",
        a: `You earn coins worth ${coinPercent} of the item total on every order. They are promotional and can't be cashed out.`,
      },
    ],
  },
  {
    topic: "Orders and delivery",
    items: [
      {
        q: "How does an order work?",
        a: "Pick a shop, add items, set your hostel and room, and place the order. A nearby student accepts it, buys the items, uploads the bill and brings them to you.",
      },
      {
        q: "What is the delivery code?",
        a: "A 4-digit code shown only to you. Give it to the carrier when you receive your items; they enter it to finish the delivery and get paid.",
      },
      {
        q: "Can I cancel?",
        a: "Yes, until the carrier has bought your items. You get a full refund. Requests nobody accepts in time are cancelled and refunded automatically.",
      },
      {
        q: "Something went wrong with my order.",
        a: "Open the order and choose Report an issue. Add a photo if it helps.",
      },
    ],
  },
  {
    topic: "Delivering and earning",
    items: [
      {
        q: "How do I start delivering?",
        a: "Open Deliver, pick a request and accept it. Buy the items, upload the bill, head out, and enter the requester's code on arrival.",
      },
      {
        q: "What do I earn?",
        a: "The reward and tip shown on the request. For shop orders you also get the item cost back, since you pay at the shop.",
      },
      {
        q: "Can I take several deliveries?",
        a: `Up to ${MAX_ACTIVE_JOBS} at a time. You can drop a delivery before you've bought the items.`,
      },
    ],
  },
];

/**
 * Everything the help assistant knows about the app, screen by screen. Keep it
 * in step with the UI: the assistant is told to answer only from this.
 */
export const APP_GUIDE = `StudentLoop is a campus delivery app. Students order from campus shops or post errands, and other students on campus carry them out for a fee. Everything is paid from an in-app wallet, and the money is held until the person who ordered confirms the handoff with a 4-digit delivery code.

Navigation: on phones there is a tab bar at the bottom (Shop, Orders, Deliver, Wallet, Profile), with your wallet balance and the cart at the top. Post an errand is a button at the top of the Shop, Orders and Deliver tabs, and Help is under Profile. On a computer everything, including Post an errand, Help and Cart, is in the left sidebar.

## Shop
- The Shop tab lists campus shops and stalls. Search finds shops and items by name; the category pills (All, ${CATEGORIES.join(", ")}) filter the list.
- Open a shop to see its menu and tap Add on an item; use − and + to change the quantity.
- A cart holds items from one shop at a time. Adding something from a different shop asks "Start a new cart?": Keep my cart, or Start new cart (which clears the old one).
- If you have an order in progress, a banner at the top of the Shop tab shows its status; tap Track to open it.
- Anyone signed in can list a shop or stall with Add a shop.

## Cart and checkout
- Open the cart from the cart icon. You can change quantities and add a note to each item.
- Under Deliver to, enter your hostel or block and room (they are filled in from your profile if you saved them). Carriers see your hostel; your room is shared only once someone accepts.
- Choose a tip for your carrier (No tip or one of the amounts shown; a tip can never be more than ${rupees(MAX_TIP)}). Tips go entirely to the carrier.
- Total = items + a flat ${rupees(DELIVERY_FEE)} delivery fee + tip. It is paid from your wallet when you tap Place order, and held until your items arrive. If your wallet is short, the cart says how much more you need and links to Add money.
- If a shop changes a price or removes an item, the cart updates itself and tells you.
- You earn bonus coins worth ${coinPercent} of the item total (rounded down) on every order.

## Orders and the order page
- The Orders tab has Active and Past lists of your shop orders and errands. Tap one to open its page.
- The order page updates live: Placed → Carrier assigned → Items bought → On the way → Delivered. It shows your carrier's name, rating and trust score, the items, the route and what you paid. While a delivery is in progress you and your carrier can see each other's mobile number if you've added one to your profile.
- Waiting for a carrier: if nobody accepts within ${windowText} for a shop order (or by the deadline you picked for an errand), it is cancelled automatically and everything goes back to your wallet. The page shows the exact time.
- Delivery code: once a carrier accepts, the page shows your 4-digit delivery code. Give it to the carrier only when you have your items in hand; they enter it to finish the delivery and get paid. Never share it earlier, even if someone says they are from StudentLoop.
- Cancel order (or Cancel request) works while it is waiting for a carrier or after a carrier accepted but before they bought the items. You get a full refund straight to your wallet, and the bonus coins from that order are taken back. Once the carrier has bought the items it can't be cancelled; use Report an issue instead.
- Report an issue appears once a carrier has taken the order: pick what went wrong (${ISSUE_TYPES.join(", ")}), describe it and optionally add a photo (an image up to ${uploadMb} MB). You can report once per order. Reports are reviewed by the StudentLoop team; a report doesn't move money by itself.
- After delivery you can rate your carrier from 1 to 5 stars, once. Good ratings and completed deliveries raise a carrier's trust score; poor ratings lower it.
- Order again (on delivered or cancelled shop orders) refills your cart with the same items; anything no longer available is left out.

## Deliver (earning as a carrier)
- The Deliver tab has Open requests (with category pills) and My deliveries (in progress, history, how many you've completed and what you've earned). Open requests show the hostel but not the room until you accept. You can't accept your own request.
- Tap a request, then Accept delivery. You can hold up to ${MAX_ACTIVE_JOBS} active deliveries at once; finish one before taking another.
- Step 1, buy the items: go to the pickup place and buy everything on the list. For shop orders you pay at the shop yourself and get the item cost back when the delivery is done. Take or choose a photo of the bill (an image up to ${uploadMb} MB), then tap I've bought the items. Before buying you can still tap Drop this delivery, which puts it back for others (or refunds the requester if its deadline has passed).
- Step 2, head out: tap I'm on my way.
- Step 3, confirm the handoff: ask the requester for their 4-digit delivery code and enter it, then tap Confirm delivery. After ${OTP_MAX_ATTEMPTS} wrong codes the delivery is locked for ${OTP_LOCK_MINUTES} minutes.
- When it's confirmed you are paid straight into your wallet: the delivery fee (or the errand reward) plus the tip, plus the item cost back for shop orders.

## Post an errand
- For anything that isn't on a shop menu (printing, a parcel, something from town). Open Post an errand.
- Fill in what you need, a category, the items (one per line, optional), where to pick up from, and your hostel and room.
- Set a reward between ${rupees(MIN_REWARD)} and ${rupees(MAX_REWARD)}, an optional tip, how soon you need it (Needed within) and how urgent it is (Urgent, Soon or Relaxed).
- Reward + tip are paid from your wallet and held until the delivery is confirmed. The cost of the items themselves is settled directly with your carrier, not through the app.
- Refunds: if nobody accepts by your Needed within time, or you cancel before the carrier buys the items, you get the reward and tip back in full.
- After posting, the errand has its own page (in Orders) that works just like a shop order's page.

## Wallet
- Shows your balance, your bonus coins and the full history of everything that moved through your wallet (top-ups, orders, errands, refunds and earnings). Tap a history row linked to an order to open it.
- Add money: pick a quick amount or type one. Each top-up is ${rupees(TOPUP_MIN)} to ${rupees(TOPUP_MAX)}, and at most ${rupees(TOPUP_DAILY_MAX)} a day. Top-ups are in test mode for now: no real payment is taken.
- New accounts start with a ${rupees(WELCOME_BONUS)} welcome bonus.
- Wallet money can't be withdrawn as cash. Bonus coins are promotional and can't be cashed out.

## Profile
- Shows your deliveries, rating, trust score and points (you get ${SIGNUP_POINTS} points for joining and earn more by delivering), and your recent activity.
- Personal details: first and last name, mobile (shared only with the person you're matched with) and hostel and room (used to fill in checkout). Tap Save changes.
- Account: shows whether your email is verified. If it isn't, open the link we emailed you (check spam), then tap I've verified; Resend email sends a new link. Change password emails you a reset link (only for email and password accounts).
- Appearance: switch between light and dark mode (also in the sidebar on a computer). Until you choose, it follows your device.
- Links to Your orders, Help and Terms and conditions, and Sign out.
- Install on your home screen: StudentLoop runs in the browser, and the Get the app card on Profile shows the steps for your device. On iPhone, in Safari tap Share (if you don't see it, tap ••• first), scroll down, tap Add to Home Screen, then Add. On Android, tap Install app on that card when it appears, or open Chrome's menu and tap Install app or Add to Home screen.

## Help
- The Help page has this assistant and a list of common questions. The assistant can explain things but can't change anything in your account. For anything it can't solve, email ${SUPPORT_EMAIL}.

## Signing in
- Sign up with your full name, email and a password of at least 8 characters, or tap Continue with Google.
- New email accounts get a verification email. If it doesn't arrive, check spam, or use Resend email on the Profile page.
- Forgot password? is on the sign-in page: enter your email and we'll send a reset link (check spam too). If you signed up with Google, use Continue with Google instead; there is no separate password.
- "An account with this email already exists" means you should sign in instead (or reset your password).
- "Too many attempts" means waiting a few minutes, or resetting the password to get back in straight away.
- If the Google window doesn't open, allow pop-ups for the site and try again.
- The first time you sign in you are asked to accept the terms.

## Staying safe
- StudentLoop will never ask for your password. Don't share it with anyone, including carriers.
- Only give your delivery code when the items are in your hands. Anyone asking for it early is a red flag.
- Check that the person delivering matches the carrier shown on your order page.
- If something goes wrong, use Report an issue on the order page, and for anything urgent or unsafe contact campus security.`;
