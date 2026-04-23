"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";

/**
 * Client wrapper around next-themes' provider.
 *
 * next-themes uses React context, which requires a client component. This
 * thin wrapper lets our server-rendered root layout mount it safely.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
