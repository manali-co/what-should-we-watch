import { ReactNode, useMemo } from "react";
import { ThemeContext, makeTheme, ThemeName } from "./tokens";

// Provides the design theme. Defaults to dark (the app's primary look); pass `name` to override.
export function ThemeProvider({ name = "dark", children }: { name?: ThemeName; children: ReactNode }) {
  const value = useMemo(() => makeTheme(name), [name]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
