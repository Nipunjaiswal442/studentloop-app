import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const KEY = "sl_theme";

const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)");

function saved(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

// One store for the whole app so every consumer (shell, toaster, toggles) agrees.
let current: Theme = saved() ?? (prefersDark().matches ? "dark" : "light");
const listeners = new Set<() => void>();

function apply(next: Theme) {
  current = next;
  document.documentElement.classList.toggle("dark", next === "dark");
  listeners.forEach((l) => l());
}

apply(current);

// Until the person picks a theme themselves, follow the system setting.
prefersDark().addEventListener("change", (e) => {
  if (saved() === null) apply(e.matches ? "dark" : "light");
});

function choose(next: Theme) {
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Private mode: the choice just won't persist.
  }
  apply(next);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current);
  return { theme, toggle: () => choose(current === "dark" ? "light" : "dark") };
}
