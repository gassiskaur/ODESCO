"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      onClick={toggleTheme}
      className="flex min-h-[44px] w-full items-center justify-between gap-2 border border-ink bg-offwhite px-3 font-sans text-xs uppercase tracking-widest hover:bg-neutral-100 transition-colors"
    >
      <span className="flex items-center gap-2">
        {isDark ? (
          <Moon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        ) : (
          <Sun className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        )}
        {isDark ? "Dark" : "Light"}
      </span>

      {/* physical switch track/knob */}
      <span className="relative inline-flex h-5 w-9 shrink-0 items-center border border-ink">
        <span
          className={`h-full w-1/2 bg-ink transition-transform duration-150 ${
            isDark ? "translate-x-full" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
