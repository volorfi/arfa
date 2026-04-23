# arfa-markets

Next.js 14 rewrite of [arfa.global](https://arfa.global). Scaffold only — no
pages yet.

## Stack

- **Framework**: Next.js 14 (App Router) + TypeScript + strict mode
- **Styling**: Tailwind CSS v3 + shadcn/ui + `lucide-react` + `next-themes`
- **Auth & DB**: Supabase (Postgres + Auth) via `@supabase/ssr`
- **ORM**: Prisma 5
- **Payments**: Stripe 17 (Checkout + webhooks)

## Layout

```
app/                  App Router (pages go here later)
  layout.tsx          Root layout (ThemeProvider, fonts)
  globals.css         Design tokens (CSS vars) + Tailwind base layer
components/           Shared UI components
  ui/                 shadcn primitives (add via `npx shadcn@latest add <name>`)
hooks/                Custom React hooks
lib/
  supabase.ts         Browser + server + service-role client factories
  prisma.ts           Prisma singleton
  stripe.ts           Stripe singleton (server-only)
  utils.ts            cn() + env helpers
prisma/
  schema.prisma       User, Subscription, Watchlist, WatchlistItem,
                      SavedScreen, Alert
public/               Static assets
types/                Shared TypeScript types
middleware.ts         Auth guard for /dashboard/*
tailwind.config.ts    Full ARFA palette + fluid type scale
.env.local.example    Copy to .env.local and fill in
```

## Getting started

```bash
cp .env.local.example .env.local      # fill in Supabase / Stripe / DB URLs
pnpm install                           # or npm / yarn / bun
pnpm db:generate                       # generate Prisma client
pnpm db:push                           # apply schema to Supabase Postgres
pnpm dev                               # http://localhost:3000
```

## Design tokens

All colors are HSL CSS variables defined in `app/globals.css`, swapped by the
`.dark` class on `<html>`.

- **Primary**: deep teal `#01696f` (hover `#0c4e54`)
- **Backgrounds**: warm off-white `#f7f6f2` (light), `#171614` (dark)
- **Surface layers**: 5 levels — `surface-0` page bg → `surface-3` popover
  → `surface-offset` inverted attention bg
- **Text**: `text-primary`, `text-muted`, `text-faint` (per mode)
- **Type**: fluid scale via `clamp()` from `--text-xs` to `--text-6xl`
- **Radius**: base `--radius: 0.5rem`, xs → 2xl scaled around it
- **Shadows**: 6 tiers (`xs`, `sm`, `md`, `lg`, `xl`, `inset`), warm in light
  mode / deeper black in dark mode

## Relation to the current Vite + Express site

This directory is a rebuild, intended to replace the code at the repo root.
During migration both live side by side. When the Next.js version reaches
feature parity, the root is promoted over from `arfa-markets/*`.
