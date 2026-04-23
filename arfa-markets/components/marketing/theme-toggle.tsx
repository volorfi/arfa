"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Theme toggle — swaps light/dark via next-themes.
 *
 * Shows a sun in dark mode (click to go light), moon in light mode (click to
 * go dark). Renders a placeholder icon until hydrated so we don't flash the
 * wrong theme on mount.
 */
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const active = mounted ? resolvedTheme ?? theme : undefined;
  const isDark = active === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="text-text-muted hover:text-text-primary"
    >
      {/* Render both; CSS swaps visibility via data-theme on <html> if you
          prefer, but with next-themes we can just branch on `isDark`. Use
          opacity-0 before mount to prevent hydration mismatch. */}
      {mounted ? (
        isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4 opacity-0" />
      )}
    </Button>
  );
}
