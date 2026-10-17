import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { category } from "./schema";
import { requireUser } from "./lib/users";
import { fail, text, wholeRupees } from "./lib/validate";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const shops = await ctx.db.query("shops").take(100);
    return await Promise.all(
      shops.map(async (shop) => {
        const items = await ctx.db
          .query("menuItems")
          .withIndex("by_shop", (q) => q.eq("shopId", shop._id))
          .take(60);
        const available = items.filter((i) => i.available);
        return {
          id: shop._id,
          name: shop.name,
          category: shop.category,
          distance: shop.distance,
          rating: shop.rating,
          deliveryMinutes: shop.deliveryMinutes,
          itemCount: available.length,
          itemNames: available.map((i) => i.name),
        };
      }),
    );
  },
});

export const get = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, { shopId }) => {
    await requireUser(ctx);
    const shop = await ctx.db.get(shopId);
    if (!shop) return null;
    const items = await ctx.db
      .query("menuItems")
      .withIndex("by_shop", (q) => q.eq("shopId", shopId))
      .take(60);
    return {
      id: shop._id,
      name: shop.name,
      category: shop.category,
      distance: shop.distance,
      rating: shop.rating,
      deliveryMinutes: shop.deliveryMinutes,
      menu: items
        .filter((i) => i.available)
        .map((i) => ({ id: i._id, name: i.name, price: i.price, description: i.description })),
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category,
    menu: v.array(v.object({ name: v.string(), price: v.number(), description: v.string() })),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const name = text(args.name, "Shop name", 60);
    if (args.menu.length === 0) fail("Add at least one menu item.");
    if (args.menu.length > 40) fail("A shop can have at most 40 menu items.");

    const shopId = await ctx.db.insert("shops", {
      ownerId: user._id,
      name,
      category: args.category,
      deliveryMinutes: 15,
    });
    for (const item of args.menu) {
      await ctx.db.insert("menuItems", {
        shopId,
        name: text(item.name, "Item name", 60),
        price: wholeRupees(item.price, "Item price", 1, 5000),
        description: text(item.description, "Item description", 120, false),
        available: true,
      });
    }
    return shopId;
  },
});
