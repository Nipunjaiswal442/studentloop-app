import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const category = v.union(
  v.literal("Food"),
  v.literal("Stationery"),
  v.literal("Medicines"),
  v.literal("Groceries"),
);

export const urgency = v.union(v.literal("low"), v.literal("medium"), v.literal("high"));

/** Lifecycle of a delivery job. Shop orders and errands share it. */
export const stage = v.union(
  v.literal("open"),
  v.literal("accepted"),
  v.literal("purchased"),
  v.literal("out_for_delivery"),
  v.literal("delivered"),
  v.literal("cancelled"),
);

export const txKind = v.union(
  v.literal("welcome"),
  v.literal("topup"),
  v.literal("order"),
  v.literal("errand"),
  v.literal("refund"),
  v.literal("delivery"),
  v.literal("tip"),
  v.literal("reimbursement"),
);

export default defineSchema({
  ...authTables,

  users: defineTable({
    // Fields managed by Convex Auth.
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Profile.
    firstName: v.string(),
    lastName: v.string(),
    mobile: v.string(),
    hostelBlock: v.string(),
    roomNumber: v.string(),
    termsAcceptedAt: v.optional(v.number()),
    // Wallet and reputation. Money is whole rupees.
    walletBalance: v.number(),
    bonusCoins: v.number(),
    points: v.number(),
    deliveries: v.number(),
    trustScore: v.number(),
    rating: v.number(),
    ratingCount: v.number(),
  }).index("email", ["email"]),

  shops: defineTable({
    ownerId: v.optional(v.id("users")),
    name: v.string(),
    category,
    distance: v.optional(v.string()),
    rating: v.optional(v.number()),
    deliveryMinutes: v.number(),
  }).index("by_category", ["category"]),

  menuItems: defineTable({
    shopId: v.id("shops"),
    name: v.string(),
    price: v.number(),
    description: v.string(),
    available: v.boolean(),
  }).index("by_shop", ["shopId"]),

  /** Commerce record for a shop order. The matching delivery job owns the status. */
  orders: defineTable({
    userId: v.id("users"),
    code: v.string(),
    shopId: v.id("shops"),
    shopName: v.string(),
    lines: v.array(
      v.object({
        menuItemId: v.id("menuItems"),
        name: v.string(),
        price: v.number(),
        qty: v.number(),
        note: v.string(),
      }),
    ),
    subtotal: v.number(),
    deliveryFee: v.number(),
    tip: v.number(),
    total: v.number(),
    bonusCoinsEarned: v.number(),
    deliveryRequestId: v.optional(v.id("deliveryRequests")),
  }).index("by_user", ["userId"]),

  /**
   * One unit of carrier work: either the fulfilment of a shop order or a
   * free-form errand. The requester's payment is held here until delivery.
   */
  deliveryRequests: defineTable({
    requesterId: v.id("users"),
    partnerId: v.optional(v.id("users")),
    orderId: v.optional(v.id("orders")),
    title: v.string(),
    category,
    pickup: v.string(),
    dropHostel: v.string(),
    dropRoom: v.string(),
    items: v.array(v.string()),
    reward: v.number(),
    tip: v.number(),
    /** Item cost the carrier fronts at the shop and gets back on delivery. */
    reimbursement: v.number(),
    deadlineMinutes: v.number(),
    urgency,
    status: stage,
    otp: v.string(),
    otpAttempts: v.number(),
    otpLockedUntil: v.optional(v.number()),
    billStorageId: v.optional(v.id("_storage")),
    deliveredAt: v.optional(v.number()),
    cancelReason: v.optional(v.string()),
    rating: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_requester", ["requesterId"])
    .index("by_partner", ["partnerId"]),

  transactions: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("credit"), v.literal("debit")),
    kind: txKind,
    amount: v.number(),
    description: v.string(),
    deliveryRequestId: v.optional(v.id("deliveryRequests")),
  }).index("by_user", ["userId"]),

  disputes: defineTable({
    userId: v.id("users"),
    deliveryRequestId: v.id("deliveryRequests"),
    issueType: v.string(),
    description: v.string(),
    photoStorageId: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("open"),
      v.literal("reviewing"),
      v.literal("resolved"),
      v.literal("rejected"),
    ),
  })
    .index("by_user", ["userId"])
    .index("by_request", ["deliveryRequestId"]),

  activity: defineTable({
    userId: v.id("users"),
    action: v.string(),
    details: v.string(),
    points: v.number(),
  }).index("by_user", ["userId"]),

  /** One row per help-desk AI call, used for rate limiting. */
  aiCalls: defineTable({ userId: v.id("users") }).index("by_user", ["userId"]),
});
