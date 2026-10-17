import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const KEY = "sl_theme";

function read(): Theme {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

// One store for the whole app so every consumer (shell, toaster) agrees.
let current: Theme = read();
const listeners = new Set<() => void>();

function apply(next: Theme) {
  current = next;
  document.documentElement.classList.toggle("dark", next === "dark");
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Private mode: the choice just won't persist.
  }
  listeners.forEach((l) => l());
}

apply(current);

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current);
  return { theme, toggle: () => apply(current === "dark" ? "light" : "dark") };
}
