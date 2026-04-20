// hooks/useUiTheme.ts

import { useCallback, useEffect, useState } from "react";
import type { UiTheme } from "../utils/uiTheme";

export const useUiTheme = () => {
  const [theme, setTheme] = useState<UiTheme>("light");

  // toggle between light/dark
  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  // optional: persist theme
  useEffect(() => {
    const saved = localStorage.getItem("ui-theme") as UiTheme | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("ui-theme", theme);
  }, [theme]);

  return {
    theme,
    isDark: theme === "dark",
    isLight: theme === "light",
    toggleTheme,
    setTheme,
  };
};