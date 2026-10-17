import { internalMutation } from "./_generated/server";

const SHOPS = [
  { name: "Blue Tokai Café", category: "Food", distance: "0.3 km", rating: 4.7, deliveryMinutes: 15,
    menu: [["Iced Latte", 180, "Cold brewed with oat milk"], ["Cappuccino", 150, "Classic Italian style"], ["Avocado Toast", 220, "Sourdough with fresh avocado"]] },
  { name: "Campus Canteen", category: "Food", distance: "0.2 km", rating: 4.3, deliveryMinutes: 20,
    menu: [["Chicken Biryani", 120, "Hyderabadi style with raita"], ["Paneer Butter Masala", 100, "Rich and creamy curry"], ["Dal Makhani Thali", 90, "Full thali with roti and rice"]] },
  { name: "Healthy Bites", category: "Food", distance: "0.5 km", rating: 4.5, deliveryMinutes: 18,
    menu: [["Caesar Salad", 160, "Fresh romaine and croutons"]] },
  { name: "Campus Store", category: "Stationery", distance: "0.4 km", rating: 4.2, deliveryMinutes: 10,
    menu: [["A4 Sheets (500)", 250, "JK Copier 75gsm"], ["Gel Pen Set (5)", 80, "Pilot V5 assorted"]] },
  { name: "Pen & Paper Hub", category: "Stationery", distance: "0.6 km", rating: 4.0, deliveryMinutes: 12,
    menu: [["Notebook Combo", 150, "3 ruled and 1 plain"]] },
  { name: "MedPlus Pharmacy", category: "Medicines", distance: "0.8 km", rating: 4.6, deliveryMinutes: 15,
    menu: [["Crocin Advance", 30, "Paracetamol 500mg x10"], ["Band-Aid Pack", 45, "Flexible fabric, 20 strips"]] },
  { name: "Campus Chemist", category: "Medicines", distance: "0.5 km", rating: 4.4, deliveryMinutes: 12,
    menu: [["ORS Sachets", 25, "Electrolyte replenisher x5"]] },
  { name: "QuickMart", category: "Groceries", distance: "0.7 km", rating: 4.1, deliveryMinutes: 20,
    menu: [["Maggi Noodles x6", 84, "Masala family pack"], ["Amul Milk 1L", 66, "Full cream toned milk"]] },
  { name: "Daily Needs Store", category: "Groceries", distance: "0.3 km", rating: 4.3, deliveryMinutes: 15,
    menu: [["Bread Loaf", 45, "Whole wheat sandwich bread"]] },
] as const;

/** Loads the starter campus shops. Safe to run twice. Usage: npm run seed */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    if ((await ctx.db.query("shops").first()) !== null) return "Shops already exist, nothing seeded.";
    for (const { menu, ...shop } of SHOPS) {
      const shopId = await ctx.db.insert("shops", shop);
      for (const [name, price, description] of menu) {
        await ctx.db.insert("menuItems", { shopId, name, price, description, available: true });
      }
    }
    return `Seeded ${SHOPS.length} shops.`;
  },
});
