import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
// An explicit choice lives under its own key. The previous build wrote "sl_theme"
// = "light" for *every* visitor on first load, so a stored "light" there was never
// a choice; only a stored "dark" was, and that one is still honoured.
const CHOICE_KEY = "sl_theme_choice";
const LEGACY_KEY = "sl_theme";

const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)");

function saved(): Theme | null {
  try {
    const choice = localStorage.getItem(CHOICE_KEY);
    if (choice === "dark" || choice === "light") return choice;
    return localStorage.getItem(LEGACY_KEY) === "dark" ? "dark" : null;
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
const media = prefersDark();
const onSystemChange = (e: MediaQueryListEvent) => {
  if (saved() === null) apply(e.matches ? "dark" : "light");
};
// Safari before 14 only has the older addListener.
if (media.addEventListener) media.addEventListener("change", onSystemChange);
else media.addListener?.(onSystemChange);

function choose(next: Theme) {
  try {
    localStorage.setItem(CHOICE_KEY, next);
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
