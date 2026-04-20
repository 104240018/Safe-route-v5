// utils/uiTheme.ts

export type UiTheme = "light" | "dark";

export const text = {
  primary: (theme: UiTheme) =>
    theme === "dark" ? "text-slate-100" : "text-slate-900",

  secondary: (theme: UiTheme) =>
    theme === "dark" ? "text-slate-300" : "text-slate-600",

  muted: (theme: UiTheme) =>
    theme === "dark" ? "text-slate-500" : "text-slate-400",
};