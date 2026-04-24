FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist       ./dist
COPY --from=builder /app/server     ./server
COPY --from=builder /app/shared     ./shared
COPY --from=builder /app/drizzle    ./drizzle

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
