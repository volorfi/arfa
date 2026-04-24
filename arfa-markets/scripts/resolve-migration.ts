#!/usr/bin/env tsx
/**
 * One-time: mark the baseline migration as applied on an existing DB.
 *
 * Context: the prod DB was seeded via `prisma db push` or `prisma
 * generate`, so the tables already exist but the `_prisma_migrations`
 * table has no record of `20260424000000_init`. Running
 * `prisma migrate deploy` against that DB would try to CREATE TABLE
 * on tables that already exist and fail.
 *
 * `prisma migrate resolve --applied <name>` is the officially supported
 * fix: it writes the migration into `_prisma_migrations` as "applied"
 * WITHOUT re-running the SQL. After that, `migrate deploy` treats this
 * migration as done and will only apply future ones.
 *
 * This is a one-shot operation. Running it twice is safe — Prisma errors
 * with "Migration ... is already recorded as applied", which this script
 * treats as a success.
 *
 * Execution (see docs/smoke-test.md §0.4):
 *
 *   railway run pnpm migrate:resolve
 *
 * `railway run` injects the Railway-service env vars into your local
 * shell (including DATABASE_URL pointing at the prod DB) and executes
 * the command locally. That keeps the Prisma CLI available without
 * needing tsx/prisma inside the minimal runtime container.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Keep in sync with the folder name under prisma/migrations/. Changing
// this string here must be paired with a rename on disk.
const BASELINE_MIGRATION = "20260424000000_init";

// Portable __dirname replacement. tsx's CJS transform leaves
// `import.meta.dirname` undefined, so use fileURLToPath(import.meta.url)
// which works under every supported Node runtime.
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function die(msg: string, code = 1): never {
  console.error(`\n✖ ${msg}\n`);
  process.exit(code);
}

function ok(msg: string): void {
  console.log(`✔ ${msg}`);
}

// ── Preflight ────────────────────────────────────────────────────────────────

// 1. Migration folder must actually be on disk — otherwise prisma will
//    complain with a less-obvious error message.
const migrationDir = resolve(
  repoRoot,
  "prisma/migrations",
  BASELINE_MIGRATION,
);
if (!existsSync(migrationDir)) {
  die(
    `Baseline migration folder not found:\n    ${migrationDir}\n` +
      `Update BASELINE_MIGRATION at the top of this script if the folder was renamed.`,
  );
}
ok(`Found migration folder: prisma/migrations/${BASELINE_MIGRATION}`);

// 2. DATABASE_URL must be set. Without it, `prisma migrate resolve`
//    picks up no connection string and either errors out or (worse,
//    depending on version) prompts interactively.
if (!process.env.DATABASE_URL) {
  die(
    "DATABASE_URL is not set.\n" +
      "Run this via `railway run pnpm migrate:resolve` so Railway injects the prod DB URL,\n" +
      "or export it manually in your shell.",
  );
}
ok("DATABASE_URL is set");

// 3. Extra guard: refuse to run against localhost URLs unless explicitly
//    allowed. The script is meant for prod; catching a local-pointed
//    DATABASE_URL prevents the user from accidentally marking a
//    migration applied on their dev DB they forgot to baseline.
const dbHost = (() => {
  try {
    return new URL(process.env.DATABASE_URL!).hostname;
  } catch {
    return "<unparseable>";
  }
})();

const looksLikeLocal =
  dbHost === "localhost" ||
  dbHost === "127.0.0.1" ||
  dbHost.endsWith(".local");

if (looksLikeLocal && process.env.ALLOW_LOCAL !== "1") {
  die(
    `DATABASE_URL points at ${dbHost} (looks like localhost).\n` +
      `This script is for prod. If you really meant to run against local, re-run with:\n\n` +
      `    ALLOW_LOCAL=1 pnpm migrate:resolve`,
  );
}
ok(`Target DB host: ${dbHost}`);

// ── Run Prisma ───────────────────────────────────────────────────────────────

console.log(
  `\nMarking ${BASELINE_MIGRATION} as applied (no SQL will be executed)…`,
);

// Stream stdout/stderr through so the user sees Prisma's own messaging.
const result = spawnSync(
  "pnpm",
  ["exec", "prisma", "migrate", "resolve", "--applied", BASELINE_MIGRATION],
  {
    cwd: repoRoot,
    stdio: "inherit",
    // Explicitly forward env so no surprises from npm script context.
    env: process.env,
  },
);

if (result.status === 0) {
  ok(`Done. ${BASELINE_MIGRATION} is recorded as applied.`);
  console.log(
    `\nNext: redeploy (or just wait for the next deploy). The container's\n` +
      `\`prisma migrate deploy\` will now say "No pending migrations" instead\n` +
      `of trying to recreate tables.`,
  );
  process.exit(0);
}

// Failure path — surface whatever Prisma said.
die(
  `prisma migrate resolve exited with code ${result.status ?? "unknown"}.\n` +
    `If the error mentions "already recorded as applied", you're already done — nothing to do.\n` +
    `Otherwise, paste the output above into the incident log and bail out.`,
  result.status ?? 1,
);
