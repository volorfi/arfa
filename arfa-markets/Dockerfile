# syntax=docker/dockerfile:1.7
# ARFA Markets — Railway Dockerfile
#
# Produces a tiny runtime image around Next.js's `output: "standalone"`
# server. The standalone bundle includes only the node_modules the app
# actually imports at runtime, so the final stage ships ~150 MB instead
# of the full pnpm workspace.
#
# Build stages:
#   base       shared node:20-alpine + pnpm
#   deps       install production+dev deps (needed to build)
#   builder    `pnpm build` → emits .next/standalone + .next/static
#   runner     cheapest runtime; non-root user; only the emitted bundle

FROM node:20-alpine AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# ── deps ─────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── builder ──────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma client needs generation against the schema before `next build`
# reaches any code that imports from @prisma/client.
RUN pnpm exec prisma generate
RUN pnpm build

# ── runner ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Next listens on 3000 by default; Railway injects the real PORT at boot
# and the standalone server reads it automatically.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as non-root for a smaller blast radius in case of container escape.
RUN addgroup --system --gid 1001 nodejs \
  && adduser  --system --uid 1001 nextjs

# Copy the standalone bundle + the static assets + public/.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static      ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public            ./public
# Ship Prisma migrations so `prisma migrate deploy` works as a Railway
# pre-deploy step when we wire migrations to the release pipeline later.
COPY --from=builder --chown=nextjs:nodejs /app/prisma            ./prisma

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
