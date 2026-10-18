import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
// Only written when the user picks a theme; until then the device setting wins.
// (index.html reads the same key before first paint.)
const KEY = "sl_theme_choice";
const system = typeof window !== "undefined" ? window.matchMedia?.("(prefers-color-scheme: dark)") : undefined;

function storedChoice(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

// One store for the whole app so every consumer (shell, toaster) agrees.
let choice = storedChoice();
let current: Theme = "light";
const listeners = new Set<() => void>();

function render() {
  current = choice ?? (system?.matches ? "dark" : "light");
  document.documentElement.classList.toggle("dark", current === "dark");
  listeners.forEach((l) => l());
}

system?.addEventListener?.("change", render);
render();

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function toggle() {
  choice = current === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // Private mode: the choice just won't persist.
  }
  render();
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current);
  return { theme, toggle };
}
