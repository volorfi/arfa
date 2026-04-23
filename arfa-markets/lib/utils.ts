import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn's canonical classname helper: merges clsx + tailwind-merge so
 *  later class names win (e.g. `cn("p-2", "p-4")` → `"p-4"`). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Strict env-var read. Throws at call site with a useful message instead
 *  of silently passing `undefined` to Supabase/Stripe/Prisma. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required env var: ${name}. Copy .env.local.example → .env.local and fill it in.`,
    );
  }
  return value;
}

/** Absolute URL helper, safe on server and client. */
export function absoluteUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
