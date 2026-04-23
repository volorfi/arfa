# syntax=docker/dockerfile:1.7
# cache-bust-2026-04-23-17: force a fresh Railway build so commit 8aeba81+
# (bondService path fix, /version endpoint, .jpg brand, drizzle-kit in deps)
# actually reaches production instead of using the stuck snapshot cache.
FROM node:20-alpine AS base
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# ---- deps (install everything, incl. dev, for the build stage) ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---- prod deps only ----
FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile --prod

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
# bondService and sovereignService load these at runtime from process.cwd().
COPY --from=build /app/server/bonds_data.json ./server/bonds_data.json
COPY --from=build /app/server/sovereign_data.json ./server/sovereign_data.json
COPY package.json ./

EXPOSE 3000
CMD ["node", "dist/index.js"]
