"use client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  applyTheme,
  parseTheme,
  THEME_EVENT,
  THEME_STORAGE_KEY,
  type AppTheme,
} from "@/lib/theme-preference";
const ThemeContext = createContext<{ theme: AppTheme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});
function subscribe(notify: () => void) {
  const storage = (event: StorageEvent) => {
    const theme = parseTheme(event.newValue);
    if (event.key === THEME_STORAGE_KEY && theme) applyTheme(theme);
  };
  window.addEventListener(THEME_EVENT, notify);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(THEME_EVENT, notify);
    window.removeEventListener("storage", storage);
  };
}
const snapshot = () =>
  parseTheme(document.documentElement.dataset.theme) ?? "light";
export function ThemeProvider({
  initialTheme = "light",
  children,
}: {
  initialTheme?: AppTheme;
  children: React.ReactNode;
}) {
  const theme = useSyncExternalStore(subscribe, snapshot, () => initialTheme);
  const toggle = useCallback(
    () => applyTheme(snapshot() === "light" ? "dark" : "light"),
    [],
  );
  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}
export const useTheme = () => useContext(ThemeContext);
