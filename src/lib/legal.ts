export const TERMS = `## Terms and Conditions

**Last updated:** March 2026

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
        a: "Create an account with your email and a password, or tap Continue with Google. New accounts get a ₹500 welcome bonus in their wallet.",
      },
      {
        q: "How do I reset my password?",
        a: "Self-service reset isn't available yet. If your email is a Google account, Continue with Google signs you in to the same account (and replaces the old password). Otherwise email support@studentloop.com and we'll help.",
      },
      {
        q: "Why does it say my email is already registered?",
        a: "An account already exists for that email. Use the Sign in tab instead of Sign up. After about ten wrong passwords, sign-in for that account pauses for a few minutes, even for the right password. If you're locked out, wait a little, try Continue with Google, or email support@studentloop.com.",
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
        a: "Open Wallet, enter an amount and tap Add money. Top-ups are limited per transaction and per day.",
      },
      {
        q: "When is my money taken?",
        a: "When you place an order or post an errand. It is held until the delivery is confirmed.",
      },
      {
        q: "How do bonus coins work?",
        a: "You earn coins worth 5% of the item total on every order. They are promotional and can't be cashed out.",
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
        a: "Up to three at a time. You can drop a delivery before you've bought the items.",
      },
    ],
  },
];
