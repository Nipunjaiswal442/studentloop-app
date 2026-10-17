import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Id } from "../../convex/_generated/dataModel";

export type CartLine = {
  menuItemId: Id<"menuItems">;
  name: string;
  price: number;
  qty: number;
  note: string;
};

type CartState = { shopId: Id<"shops"> | null; shopName: string; lines: CartLine[] };
type Item = { id: Id<"menuItems">; name: string; price: number };

const KEY = "sl_cart";
const EMPTY: CartState = { shopId: null, shopName: "", lines: [] };

function load(): CartState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as CartState) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

type CartApi = CartState & {
  count: number;
  subtotal: number;
  /** Adds one of an item. Returns false when the cart holds another shop's items. */
  add: (shop: { id: Id<"shops">; name: string }, item: Item) => boolean;
  /** Empties the cart and starts a new one from this shop. */
  startNew: (shop: { id: Id<"shops">; name: string }, lines: CartLine[]) => void;
  /** Reconciles lines with the shop's current menu: drops unavailable items, refreshes prices. */
  sync: (menu: Item[]) => void;
  setQty: (id: Id<"menuItems">, qty: number) => void;
  setNote: (id: Id<"menuItems">, note: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Cart just won't survive a reload.
    }
  }, [state]);

  const add = useCallback<CartApi["add"]>((shop, item) => {
    let ok = true;
    setState((s) => {
      if (s.shopId && s.shopId !== shop.id && s.lines.length > 0) {
        ok = false;
        return s;
      }
      const existing = s.lines.find((l) => l.menuItemId === item.id);
      const lines = existing
        ? s.lines.map((l) => (l.menuItemId === item.id ? { ...l, qty: l.qty + 1 } : l))
        : [...s.lines, { menuItemId: item.id, name: item.name, price: item.price, qty: 1, note: "" }];
      return { shopId: shop.id, shopName: shop.name, lines };
    });
    return ok;
  }, []);

  const startNew = useCallback<CartApi["startNew"]>((shop, lines) => {
    setState({ shopId: shop.id, shopName: shop.name, lines });
  }, []);

  const sync = useCallback<CartApi["sync"]>((menu) => {
    setState((s) => {
      let changed = false;
      const lines = s.lines.flatMap((l) => {
        const m = menu.find((x) => x.id === l.menuItemId);
        if (!m) {
          changed = true;
          return [];
        }
        if (m.price !== l.price || m.name !== l.name) {
          changed = true;
          return [{ ...l, price: m.price, name: m.name }];
        }
        return [l];
      });
      if (!changed) return s;
      return lines.length ? { ...s, lines } : EMPTY;
    });
  }, []);

  const setQty = useCallback<CartApi["setQty"]>((id, qty) => {
    setState((s) => {
      const lines = s.lines
        .map((l) => (l.menuItemId === id ? { ...l, qty: Math.min(qty, 20) } : l))
        .filter((l) => l.qty > 0);
      return lines.length ? { ...s, lines } : EMPTY;
    });
  }, []);

  const setNote = useCallback<CartApi["setNote"]>((id, note) => {
    setState((s) => ({
      ...s,
      lines: s.lines.map((l) => (l.menuItemId === id ? { ...l, note } : l)),
    }));
  }, []);

  const clear = useCallback(() => setState(EMPTY), []);

  const value = useMemo<CartApi>(
    () => ({
      ...state,
      count: state.lines.reduce((n, l) => n + l.qty, 0),
      subtotal: state.lines.reduce((n, l) => n + l.price * l.qty, 0),
      add,
      startNew,
      sync,
      setQty,
      setNote,
      clear,
    }),
    [state, add, startNew, sync, setQty, setNote, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
