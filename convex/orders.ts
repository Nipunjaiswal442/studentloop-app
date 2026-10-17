import { v } from "convex/values";
import { createJob } from "./deliveries";
import { mutation } from "./_generated/server";
import {
  BONUS_COIN_RATE,
  DELIVERY_FEE,
  MAX_LINE_QTY,
  MAX_TIP,
  ORDER_WINDOW_MINUTES,
} from "./lib/constants";
import { debit, logActivity } from "./lib/ledger";
import { requireUser } from "./lib/users";
import { fail, text, wholeRupees } from "./lib/validate";

/**
 * Places a shop order in one transaction: prices come from the menu (never the
 * client), the wallet is debited, and a delivery job is opened for carriers.
 */
export const place = mutation({
  args: {
    shopId: v.id("shops"),
    lines: v.array(
      v.object({ menuItemId: v.id("menuItems"), qty: v.number(), note: v.string() }),
    ),
    tip: v.number(),
    hostel: v.string(),
    room: v.string(),
    /** What the customer saw at checkout; the order is refused if prices moved. */
    expectedSubtotal: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const shop = await ctx.db.get(args.shopId);
    if (!shop) fail("That shop no longer exists.");
    if (args.lines.length === 0) fail("Your cart is empty.");
    if (args.lines.length > 30) fail("Please order at most 30 different items at once.");

    const tip = wholeRupees(args.tip, "Tip", 0, MAX_TIP);
    const hostel = text(args.hostel, "Hostel or block", 40);
    const room = text(args.room, "Room", 20);

    const lines = [];
    let subtotal = 0;
    for (const line of args.lines) {
      const item = await ctx.db.get(line.menuItemId);
      if (!item || item.shopId !== shop._id || !item.available) {
        fail("An item in your cart is no longer available. Please review your cart.");
      }
      const qty = wholeRupees(line.qty, `Quantity of ${item.name}`, 1, MAX_LINE_QTY);
      subtotal += item.price * qty;
      lines.push({
        menuItemId: item._id,
        name: item.name,
        price: item.price,
        qty,
        note: text(line.note, "Note", 100, false),
      });
    }
    if (subtotal !== args.expectedSubtotal) {
      fail("Prices have changed since you added these items. Please review your cart.");
    }

    const total = subtotal + DELIVERY_FEE + tip;
    const bonusCoinsEarned = Math.floor(subtotal * BONUS_COIN_RATE);
    const code = `SL-${String(100000 + Math.floor(Math.random() * 900000))}`;

    const orderId = await ctx.db.insert("orders", {
      userId: user._id,
      code,
      shopId: shop._id,
      shopName: shop.name,
      lines,
      subtotal,
      deliveryFee: DELIVERY_FEE,
      tip,
      total,
      bonusCoinsEarned,
    });

    const jobId = await createJob(ctx, {
      requesterId: user._id,
      orderId,
      title: lines.map((l) => l.name).join(" + ").slice(0, 80),
      category: shop.category,
      pickup: shop.name,
      dropHostel: hostel,
      dropRoom: room,
      items: lines.map((l) => `${l.name} x${l.qty}`),
      reward: DELIVERY_FEE,
      tip,
      reimbursement: subtotal,
      deadlineMinutes: ORDER_WINDOW_MINUTES,
      urgency: "medium",
    });
    await ctx.db.patch(orderId, { deliveryRequestId: jobId });

    await debit(ctx, user._id, total, "order", `Order ${code} from ${shop.name}`, jobId);
    if (bonusCoinsEarned > 0) {
      const fresh = await ctx.db.get(user._id);
      if (fresh) await ctx.db.patch(user._id, { bonusCoins: fresh.bonusCoins + bonusCoinsEarned });
    }
    await logActivity(ctx, user._id, "order_placed", `Ordered from ${shop.name}`);
    return jobId;
  },
});
